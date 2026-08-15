// Orchestration engine (brief §28, §30, §52–§58).
//
// submit()  : idempotency + duplicate detection → route → create task → derive
//             acceptance → enqueue. Returns the task immediately (async execution).
// process() : preflight → acquire repo lock(s) → decide session → build prompt →
//             run agent → parse result → verify acceptance → set FINAL status →
//             release lock → record human actions/approvals → webhook. A task can
//             only reach COMPLETED by passing acceptance (brief §30).
// tick()    : pull the highest-priority runnable task from the queue, respecting
//             per-repo locks and the global concurrency cap, and process it.

import { randomUUID } from 'node:crypto';
import { config } from './config.mjs';
import { route } from './router.mjs';
import { getAgent } from './registry.mjs';
import { createTask, getTask, setStatus, update, listTasks, normalize } from './tasks.mjs';
import { deriveAcceptance, verifyAcceptance } from './acceptance.mjs';
import { preflight } from './git.mjs';
import { decideSession, recordUse, markTaskDone } from './sessions.mjs';
import { tryAcquire, release } from './locks.mjs';
import { buildPrompt } from './promptBuilder.mjs';
import { runAgent } from './runner.mjs';
import { parseResult } from './resultParser.mjs';
import { classifyAction } from './permissions.mjs';
import { audit } from './audit.mjs';
import { tx, ready } from './store.mjs';
import { dispatchWebhook } from './webhook.mjs';

// ---- Submit ---------------------------------------------------------------
export function submit(request, { priority = 'NORMAL', preferredAgent = null,
  deployRequired = false, idempotencyKey = null, acceptance = null } = {}) {
  // Idempotency: the same key returns the same task (brief §55).
  if (idempotencyKey) {
    const existingId = ready().idempotency[idempotencyKey];
    if (existingId && getTask(existingId)) return { task: getTask(existingId), deduped: 'idempotency' };
  }

  // Duplicate detection: a near-identical active task is linked, not cloned
  // (brief §56).
  const dup = findActiveDuplicate(request);
  if (dup) {
    audit('task_duplicate_detected', { task_id: dup.task_id, request_title: dup.title });
    return { task: dup, deduped: 'duplicate', message: `Near-identical to active ${dup.task_id}; not starting a second agent.` };
  }

  const routing = route(request);
  // Honour an explicit preferred agent only when it exists; still record why.
  if (preferredAgent && getAgent(preferredAgent)) {
    const a = getAgent(preferredAgent);
    routing.selected_agent = a.agent_id;
    routing.repository = a.repository;
    routing.reason = `Caller-preferred agent ${a.name}. ${routing.reason}`;
  }

  const task = createTask({
    request, routing, priority, deployRequired,
    idempotencyKey,
    acceptance: acceptance || deriveAcceptance(request, routing),
  });
  audit('task_submitted', { task_id: task.task_id, agent: task.selected_agent, repository: task.repository, confidence: task.routing_confidence });

  // Routed vs review.
  if (task.selected_agent === 'NEEDS_ROUTING_REVIEW') {
    setStatus(task.task_id, 'WAITING_FOR_HUMAN', { human_action_required: true });
    enqueueHumanAction(task.task_id, { kind: 'routing-review', title: 'Confirm which domain owns this task', request: task.title });
  } else {
    setStatus(task.task_id, 'ROUTED');
    setStatus(task.task_id, 'QUEUED', { branch: branchName(task) });
    tx((db) => { if (!db.queue.includes(task.task_id)) db.queue.push(task.task_id); });
    audit('task_routed', { task_id: task.task_id, agent: task.selected_agent, reason: task.routing_reason });
  }
  dispatchWebhook('task.submitted', getTask(task.task_id));
  return { task: getTask(task.task_id) };
}

function findActiveDuplicate(request) {
  const n = normalize(request);
  return listTasks({ active: true }).find((t) => t.normalized_request === n) || null;
}

function branchName(task) {
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `orchestrator/${task.task_id.toLowerCase()}-${slug}`;
}

// ---- Queue tick -----------------------------------------------------------
const PRIO = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

// Return the id of the next task that can run (queue order by priority, skipping
// tasks whose repo is locked), or null. Respects the global concurrency cap.
export function pickRunnable() {
  const db = ready();
  const running = listTasks({ status: 'RUNNING' }).length;
  if (running >= config.maxConcurrentAgents) return null;
  const queued = db.queue
    .map((id) => getTask(id))
    .filter((t) => t && t.status === 'QUEUED')
    .sort((a, b) => (PRIO[a.priority] - PRIO[b.priority]) || a.task_id.localeCompare(b.task_id, undefined, { numeric: true }));
  for (const t of queued) {
    const repos = reposFor(t);
    const probe = tryAcquire(t.task_id, repos);
    if (probe.acquired) { release(t.task_id); return t.task_id; } // free the probe; process() re-acquires
  }
  return null;
}

function reposFor(task) {
  const repos = [task.repository];
  if (task.cross_domain && task.dependency?.repository) repos.push(task.dependency.repository);
  return repos.filter(Boolean);
}

// Process ONE task end-to-end. Returns the final task.
export async function process(taskId) {
  let task = getTask(taskId);
  if (!task || task.status !== 'QUEUED') return task;

  const agent = getAgent(task.selected_agent);
  const repos = reposFor(task);

  // Concurrency: acquire write lock(s) (brief §23–§24, deterministic ordering).
  const lock = tryAcquire(taskId, repos);
  if (!lock.acquired) {
    audit('task_lock_wait', { task_id: taskId, blockers: lock.blockers });
    return task; // stays QUEUED; a later tick will retry
  }

  try {
    // Preflight (brief §25). Do not do half work on failure.
    const pf = await preflight(task.repository);
    audit('task_preflight', { task_id: taskId, repo: task.repository, head: pf.remote_head, local: pf.local_checkout });
    if (!pf.ok) {
      release(taskId);
      return setStatus(taskId, 'FAILED', { result_summary: 'Preflight failed: repository not routable/reachable.' });
    }

    // Pre-dispatch broker check on the intended high-level action (brief §19).
    const broker = classifyAction(task.original_request);
    if (broker.decision === 'deny') {
      release(taskId);
      audit('permission_denied', { task_id: taskId, reason: broker.reason });
      return setStatus(taskId, 'FAILED', { result_summary: `Denied by policy: ${broker.reason}. Not auto-executed.` });
    }
    if (broker.decision === 'human') {
      // Build what is possible but require explicit human approval to proceed on
      // the risky part. Register centrally and pause.
      enqueueApproval(taskId, broker.reason);
      release(taskId);
      audit('permission_human_required', { task_id: taskId, reason: broker.reason });
      return setStatus(taskId, 'WAITING_FOR_HUMAN', { human_action_required: true, result_summary: `Requires human approval: ${broker.reason}.` });
    }

    setStatus(taskId, 'RUNNING', { pre_change_sha: pf.remote_head });
    dispatchWebhook('task.running', getTask(taskId));

    // Session continuity (brief §14–§15).
    const sess = decideSession(agent.agent_id, pf.remote_head);
    recordUse(agent.agent_id, sess.session_id, pf.remote_head);
    update(taskId, { session_id: sess.session_id });
    audit('session_decision', { task_id: taskId, agent: agent.agent_id, action: sess.action, reason: sess.reason });

    // Bounded prompt (brief §26).
    task = getTask(taskId);
    const prompt = buildPrompt(task, agent, pf, sess);

    // Run the agent (real Claude Code headless, or mock).
    const runOut = await runAgent({ task, agent, prompt, sessionDecision: sess });
    const result = parseResult(runOut);
    update(taskId, {
      result_summary: result.summary, commit_sha: result.commit,
      pr: result.pr, deployed_sha: result.commit, deploy_url: result.deployment?.url || null,
      rollback_sha: pf.remote_head, live_verification: result.live_verification,
      warnings: result.warnings,
    });

    // TESTING → acceptance verification (brief §30).
    setStatus(taskId, 'TESTING');
    const verdict = verifyAcceptance(getTask(taskId), result);
    audit('acceptance_check', { task_id: taskId, accepted: verdict.accepted, missing: verdict.missing });

    // Human actions surfaced by the agent go to the central queue (brief §37).
    for (const ha of result.human_actions || []) enqueueHumanAction(taskId, ha);

    release(taskId);
    markTaskDone(agent.agent_id);

    if (!verdict.accepted) {
      const humanBlocked = verdict.missing.includes('human-action');
      const finalStatus = humanBlocked ? 'WAITING_FOR_HUMAN' : 'FAILED';
      const t = setStatusSafe(taskId, finalStatus, {
        human_action_required: humanBlocked,
        result_summary: (result.summary ? result.summary + ' ' : '') + `Not COMPLETED: ${verdict.reasons.join(' ')}`,
      });
      dispatchWebhook(humanBlocked ? 'task.human_required' : 'task.failed', t);
      return t;
    }

    // Accepted → READY_TO_MERGE → (deploy/verify) → COMPLETED.
    setStatus(taskId, 'READY_TO_MERGE');
    if (task.deploy_required) {
      setStatus(taskId, 'DEPLOYING');
      setStatus(taskId, 'VERIFYING');
    }
    const done = setStatus(taskId, 'COMPLETED');
    audit('task_completed', { task_id: taskId, commit: result.commit });
    dispatchWebhook('task.completed', done);
    return done;
  } catch (err) {
    release(taskId);
    audit('task_error', { task_id: taskId, error: err.message });
    return setStatusSafe(taskId, 'FAILED', { result_summary: `Engine error: ${err.message}` });
  }
}

// Set status, falling back to FAILED semantics if the transition is illegal (so
// the engine never throws while trying to record a terminal state).
function setStatusSafe(taskId, status, patch) {
  try { return setStatus(taskId, status, patch); }
  catch { return update(taskId, { status, ...patch }); }
}

// Drain the queue until nothing is runnable (used by the CLI/worker loop).
export async function drain() {
  const processed = [];
  let id;
  // eslint-disable-next-line no-cond-assign
  while ((id = pickRunnable())) {
    await process(id);
    processed.push(id);
    if (processed.length > 100) break; // safety
  }
  return processed;
}

export function cancel(taskId, reason = 'cancelled by user') {
  const t = getTask(taskId);
  if (!t) return null;
  release(taskId);
  tx((db) => { db.queue = db.queue.filter((q) => q !== taskId); });
  const out = setStatusSafe(taskId, 'CANCELLED', { result_summary: reason });
  audit('task_cancelled', { task_id: taskId, reason });
  dispatchWebhook('task.cancelled', out);
  return out;
}

// ---- Human actions & approvals (brief §37–§38) ---------------------------
export function enqueueHumanAction(taskId, action) {
  return tx((db) => {
    const id = `HA-${Object.keys(db.humanActions).length + 1}`;
    db.humanActions[id] = { id, task_id: taskId, created_at: new Date().toISOString(), status: 'OPEN', ...action };
    return db.humanActions[id];
  });
}
export function enqueueApproval(taskId, reason) {
  const appr = tx((db) => {
    const id = `AP-${Object.keys(db.approvals).length + 1}`;
    db.approvals[id] = { id, task_id: taskId, created_at: new Date().toISOString(), status: 'PENDING', reason };
    return db.approvals[id];
  });
  dispatchWebhook('approval.required', appr);
  return appr;
}
export function resolveApproval(approvalId, approve, note = '') {
  return tx((db) => {
    const a = db.approvals[approvalId];
    if (!a) return null;
    a.status = approve ? 'APPROVED' : 'REJECTED';
    a.resolved_at = new Date().toISOString();
    a.note = note;
    return a;
  });
}
export function listApprovals(status = 'PENDING') {
  return Object.values(ready().approvals).filter((a) => !status || a.status === status);
}
export function listHumanActions(status = 'OPEN') {
  return Object.values(ready().humanActions).filter((a) => !status || a.status === status);
}
export function queueSnapshot() {
  return ready().queue.map((id) => getTask(id)).filter((t) => t && t.status === 'QUEUED');
}
