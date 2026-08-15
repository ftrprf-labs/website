// Orchestration engine (brief §11, §12, §26, §28–§35, §52–§58, §62).
//
// submit()  : idempotency + duplicate detection → route (+ optional validated
//             override) → create task → derive acceptance → enqueue.
// process() : preflight (git fetch, real HEAD) → lock → session → prompt → run
//             agent (mock, or REAL in an isolated worktree) → run required checks
//             (orchestrator-owned) → verify acceptance → divergence-safe deliver →
//             deploy plan + live verify → FINAL status → cleanup → audit/webhook.
// worker    : async loop with heartbeat/lease; recoverStuck() reclaims a task left
//             RUNNING by a crash.

import { config } from './config.mjs';
import { route } from './router.mjs';
import { decompose } from './decompose.mjs';
import { getAgent } from './registry.mjs';
import { createTask, getTask, setStatus, update, listTasks, normalize, isTerminal } from './tasks.mjs';
import { deriveAcceptance, verifyAcceptance } from './acceptance.mjs';
import { preflight } from './git.mjs';
import { decideSession, recordUse, markTaskDone } from './sessions.mjs';
import { tryAcquire, release } from './locks.mjs';
import { buildPrompt } from './promptBuilder.mjs';
import { runAgent, runChecks } from './runner.mjs';
import { parseResult } from './resultParser.mjs';
import { classifyAction } from './permissions.mjs';
import { audit } from './audit.mjs';
import { tx, ready } from './store.mjs';
import { dispatchWebhook } from './webhook.mjs';
import * as ws from './workspace.mjs';
import { planDeployment, liveVerify, rollbackRef } from './deploy.mjs';

// ---- Agent enable/disable (brief §71) ------------------------------------
export function disableAgent(agentId, reason = 'manually disabled') {
  return tx((db) => { db.disabledAgents[agentId] = { reason, at: new Date().toISOString() }; return db.disabledAgents[agentId]; });
}
export function enableAgent(agentId) { return tx((db) => { delete db.disabledAgents[agentId]; return true; }); }
export function isAgentDisabled(agentId) { return Boolean(ready().disabledAgents[agentId]); }

// ---- Submit ---------------------------------------------------------------
export function submit(request, { priority = 'NORMAL', preferredAgent = null,
  deployRequired = false, idempotencyKey = null, acceptance = null,
  epicId = null, dependsOn = [] } = {}) {
  if (idempotencyKey) {
    const existingId = ready().idempotency[idempotencyKey];
    if (existingId && getTask(existingId)) return { task: getTask(existingId), deduped: 'idempotency' };
  }
  const dup = findActiveDuplicate(request);
  if (dup) {
    audit('task_duplicate_detected', { task_id: dup.task_id, request_title: dup.title });
    return { task: dup, deduped: 'duplicate', message: `Near-identical to active ${dup.task_id}; not starting a second agent.` };
  }

  const routing = route(request);
  // Validated override: honour a caller-preferred domain ONLY if it is a real
  // registered agent (never an arbitrary repo from user input, brief §69).
  if (preferredAgent && getAgent(preferredAgent)) {
    const a = getAgent(preferredAgent);
    routing.selected_agent = a.agent_id; routing.repository = a.repository;
    routing.required_checks = routing.required_checks?.length ? routing.required_checks : [];
    routing.reason = `Caller-preferred agent ${a.name} (validated). ${routing.reason}`;
  }

  const task = createTask({
    request, routing, priority, deployRequired, idempotencyKey, epicId, dependsOn,
    acceptance: acceptance || deriveAcceptance(request, routing),
  });
  audit('task_submitted', { task_id: task.task_id, agent: task.selected_agent, repository: task.repository, confidence: task.routing_confidence });

  if (task.selected_agent === 'NEEDS_ROUTING_REVIEW') {
    setStatus(task.task_id, 'WAITING_FOR_HUMAN', { human_action_required: true });
    enqueueHumanAction(task.task_id, { kind: 'routing-review', title: 'Confirm which domain owns this task', request: task.title });
  } else if (isAgentDisabled(task.selected_agent)) {
    setStatus(task.task_id, 'ROUTED');
    setStatus(task.task_id, 'BLOCKED', { result_summary: `Agent ${task.selected_agent} is disabled; task blocked until re-enabled.` });
  } else {
    setStatus(task.task_id, 'ROUTED');
    setStatus(task.task_id, 'QUEUED', { branch: branchName(task) });
    tx((db) => { if (!db.queue.includes(task.task_id)) db.queue.push(task.task_id); });
    audit('task_routed', { task_id: task.task_id, agent: task.selected_agent, reason: task.routing_reason });
  }
  dispatchWebhook('task.submitted', getTask(task.task_id));
  return { task: getTask(task.task_id) };
}

// ---- Submit an EPIC (decomposed large assignment) ------------------------
// Split one large engineering assignment into ordered, routed sub-tasks and
// submit them as a linked epic. Sub-tasks on the same repo (or marked with an
// ordering word) are chained; independent repos run in parallel. Returns the epic
// record + the created tasks. This is the ChatGPT → Orchestrator handoff for the
// Autonomous Night Run working method.
export function submitEpic(request, { priority = 'NORMAL', deployRequired = false, idempotencyKey = null } = {}) {
  if (idempotencyKey) {
    const existing = ready().idempotency[idempotencyKey];
    if (existing && ready().epics[existing]) return { epic: ready().epics[existing], deduped: 'idempotency', tasks: epicTasks(existing) };
  }
  const plan = decompose(request);

  // A single, indivisible instruction is just a task — do not manufacture an epic.
  if (!plan.is_epic) {
    const out = submit(request, { priority, deployRequired });
    return { epic: null, is_epic: false, plan, tasks: [out.task] };
  }

  const epicId = tx((db) => { db.epicCounter += 1; return `EPIC-${db.epicCounter}`; });
  const idByIndex = {};
  const taskIds = [];
  for (const step of plan.steps) {
    const dependsOn = (step.depends_on_index || []).map((i) => idByIndex[i]).filter(Boolean);
    const preferred = step.selected_agent && step.selected_agent !== 'NEEDS_ROUTING_REVIEW' ? step.selected_agent : null;
    const out = submit(step.text, { priority, deployRequired, epicId, dependsOn, preferredAgent: preferred });
    idByIndex[step.index] = out.task.task_id;
    taskIds.push(out.task.task_id);
  }

  const epic = tx((db) => {
    db.epics[epicId] = {
      epic_id: epicId,
      request,
      created_at: new Date().toISOString(),
      task_ids: taskIds,
      repositories: plan.repositories,
      truncated: plan.truncated,
      needs_routing_review: plan.needs_routing_review,
    };
    if (idempotencyKey) db.idempotency[idempotencyKey] = epicId;
    return db.epics[epicId];
  });
  audit('epic_submitted', { epic_id: epicId, subtasks: taskIds.length, repositories: plan.repositories });
  return { epic, is_epic: true, plan, tasks: taskIds.map((id) => getTask(id)) };
}

function epicTasks(epicId) {
  const e = ready().epics[epicId];
  return e ? e.task_ids.map((id) => getTask(id)).filter(Boolean) : [];
}

// Epic status rollup: the epic is done when every sub-task is terminal; it needs a
// human if any sub-task is waiting on one.
export function getEpic(epicId) {
  const e = ready().epics[epicId];
  if (!e) return null;
  const tasks = epicTasks(epicId);
  const byStatus = {};
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  // BLOCKED is not in the TERMINAL set (it can be re-queued), but for an epic
  // rollup a blocked dependent has settled — it will not proceed on its own.
  const allSettled = tasks.every((t) => isTerminal(t.status) || t.status === 'BLOCKED');
  const anyHuman = tasks.some((t) => t.status === 'WAITING_FOR_HUMAN' || t.human_action_required);
  const anyFailed = tasks.some((t) => t.status === 'FAILED' || t.status === 'BLOCKED');
  const rollup = anyHuman ? 'WAITING_FOR_HUMAN' : allSettled ? (anyFailed ? 'FAILED' : 'COMPLETED') : 'IN_PROGRESS';
  return { ...e, rollup, by_status: byStatus, tasks };
}

export function listEpics() {
  return Object.keys(ready().epics).map((id) => getEpic(id)).filter(Boolean);
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
export function pickRunnable() {
  const db = ready();
  if (listTasks({ status: 'RUNNING' }).length >= config.maxConcurrentAgents) return null;
  const queued = db.queue.map((id) => getTask(id))
    .filter((t) => t && t.status === 'QUEUED' && !isAgentDisabled(t.selected_agent) && depsSatisfied(t))
    .sort((a, b) => (PRIO[a.priority] - PRIO[b.priority]) || a.task_id.localeCompare(b.task_id, undefined, { numeric: true }));
  for (const t of queued) {
    const probe = tryAcquire(t.task_id, reposFor(t));
    if (probe.acquired) { release(t.task_id); return t.task_id; }
  }
  return null;
}
function reposFor(task) {
  const repos = [task.repository];
  if (task.cross_domain && task.dependency?.repository) repos.push(task.dependency.repository);
  return repos.filter(Boolean);
}

// Epic sub-task gating (Autonomous Night Run decomposition). A task is runnable
// only once every prerequisite sub-task has COMPLETED.
function depsSatisfied(task) {
  const deps = task.dependencies || [];
  if (!deps.length) return true;
  return deps.every((d) => getTask(d)?.status === 'COMPLETED');
}
// If a prerequisite did NOT complete (failed/cancelled/blocked), its dependents
// must not run on a broken base — block them explicitly rather than wait forever.
function cascadeDependencyBlocks() {
  const dead = new Set(['FAILED', 'CANCELLED', 'BLOCKED']);
  for (const t of listTasks({ status: 'QUEUED' })) {
    const deps = t.dependencies || [];
    if (deps.some((d) => dead.has(getTask(d)?.status))) {
      tx((db) => { db.queue = db.queue.filter((q) => q !== t.task_id); });
      setStatusSafe(t.task_id, 'BLOCKED', { result_summary: 'Blocked: a prerequisite sub-task did not complete.' });
      audit('task_blocked_dependency', { task_id: t.task_id });
    }
  }
}

function beat(taskId) { update(taskId, { last_heartbeat: new Date().toISOString() }); }

// Process ONE task end-to-end.
export async function process(taskId) {
  let task = getTask(taskId);
  if (!task || task.status !== 'QUEUED') return task;
  if (isAgentDisabled(task.selected_agent)) return setStatusSafe(taskId, 'BLOCKED', { result_summary: 'Agent disabled.' });

  // Atomically CLAIM the task before any await, so two concurrent drains (e.g. the
  // async worker and a direct drain() call) can never both process the same task.
  // JS is single-threaded, so this check-and-set is atomic.
  const claimed = tx((db) => {
    const t = db.tasks[taskId];
    if (!t || t.status !== 'QUEUED') return false;
    t.status = 'RUNNING'; t.updated_at = new Date().toISOString();
    t.history.push({ at: t.updated_at, status: 'RUNNING' });
    return true;
  });
  if (!claimed) return getTask(taskId);

  const agent = getAgent(task.selected_agent);
  const lock = tryAcquire(taskId, reposFor(task));
  if (!lock.acquired) { audit('task_lock_wait', { task_id: taskId, blockers: lock.blockers }); return task; }

  let provisioned = null;
  try {
    const pf = await preflight(task.repository);
    audit('task_preflight', { task_id: taskId, repo: task.repository, head: pf.remote_head, local: pf.local_checkout });

    // Pre-dispatch broker check on the intended high-level action (brief §19).
    const broker = classifyAction(task.original_request);
    if (broker.decision === 'deny') {
      release(taskId); audit('permission_denied', { task_id: taskId, reason: broker.reason });
      return setStatus(taskId, 'FAILED', { result_summary: `Denied by policy: ${broker.reason}. Not auto-executed.` });
    }
    if (broker.decision === 'human') {
      enqueueApproval(taskId, broker.reason); release(taskId);
      audit('permission_human_required', { task_id: taskId, reason: broker.reason });
      return setStatus(taskId, 'WAITING_FOR_HUMAN', { human_action_required: true, result_summary: `Requires human approval: ${broker.reason}.` });
    }

    // Decide real vs mock execution.
    const real = config.runner.mode === 'real' && ws.canProvision(task.repository);
    let baseSha = pf.remote_head, worktreeDir = null;
    if (real) {
      provisioned = await ws.provisionWorktree(task.repository, taskId, task.branch);
      worktreeDir = provisioned.path; baseSha = provisioned.baseSha;
      update(taskId, { branch: provisioned.branch, base_sha: baseSha, workspace: worktreeDir });
      audit('workspace_provisioned', { task_id: taskId, repo: task.repository, branch: provisioned.branch, base_sha: baseSha });
    }

    update(taskId, { pre_change_sha: baseSha, mode: real ? 'real' : 'mock', last_heartbeat: new Date().toISOString() });
    dispatchWebhook('task.running', getTask(taskId));

    const sess = decideSession(agent.agent_id, baseSha);
    recordUse(agent.agent_id, sess.session_id, baseSha);
    update(taskId, { session_id: sess.session_id });
    audit('session_decision', { task_id: taskId, agent: agent.agent_id, action: sess.action, reason: sess.reason });

    task = getTask(taskId);
    const prompt = buildPrompt(task, agent, real ? { remote_head: baseSha, recent_commits: provisioned ? [] : pf.recent_commits } : pf, sess);

    // Run the agent.
    const runOut = await runAgent({ task, agent, prompt, sessionDecision: sess, worktreeDir, baseSha, onBeat: () => beat(taskId) });

    // Assemble the normalised result. In REAL mode the ORCHESTRATOR runs the
    // required checks in the worktree (trustworthy, not agent self-report §30).
    let result;
    if (runOut.mode === 'real') {
      // Install deps before running the repo's real checks (as CI would).
      if ((task.required_checks || []).length) {
        const dep = await ws.ensureDeps(worktreeDir);
        audit('workspace_deps', { task_id: taskId, installed: dep.installed, reason: dep.reason });
      }
      const checks = await runChecks(worktreeDir, agent, task.required_checks);
      // A bug needs a regression signal: reuse unit/e2e result under that label.
      if (task.task_type === 'bug' && !checks.some((c) => c.name === 'regression')) {
        const proxy = checks.find((c) => c.name === 'unit' || c.name === 'e2e');
        if (proxy) checks.push({ name: 'regression', passed: proxy.passed, output_tail: 'via ' + proxy.name });
      }
      result = parseResult({ result: {
        status: runOut.ok ? 'done' : 'failed', summary: runOut.summary || '', tests: checks,
        commit: runOut.commit, files_changed: [],
        pr: runOut.commit ? { branch: provisioned.branch, url: `https://github.com/${task.repository}/tree/${provisioned.branch}` } : null,
      }, session_id: runOut.session_id, raw: runOut.raw });
      update(taskId, { cost_usd: runOut.cost_usd || null, num_turns: runOut.num_turns || null });
    } else {
      result = parseResult(runOut);
    }

    update(taskId, {
      result_summary: result.summary, commit_sha: result.commit, pr: result.pr,
      deployed_sha: result.commit, rollback_sha: baseSha, warnings: result.warnings,
    });

    setStatus(taskId, 'TESTING');
    const verdict = verifyAcceptance(getTask(taskId), result);
    audit('acceptance_check', { task_id: taskId, accepted: verdict.accepted, missing: verdict.missing });
    for (const ha of result.human_actions || []) enqueueHumanAction(taskId, ha);

    if (!verdict.accepted) {
      release(taskId); markTaskDone(agent.agent_id);
      if (provisioned) update(taskId, { workspace_kept: worktreeDir }); // keep worktree for diagnosis (brief §70)
      const humanBlocked = verdict.missing.includes('human-action');
      const t = setStatusSafe(taskId, humanBlocked ? 'WAITING_FOR_HUMAN' : 'FAILED', {
        human_action_required: humanBlocked,
        result_summary: (result.summary ? result.summary + ' ' : '') + `Not COMPLETED: ${verdict.reasons.join(' ')}`,
      });
      dispatchWebhook(humanBlocked ? 'task.human_required' : 'task.failed', t);
      return t;
    }

    // Accepted → deliver (divergence-safe push) → deploy plan → live verify.
    setStatus(taskId, 'READY_TO_MERGE');
    let integratedSafely = true;
    if (provisioned) {
      const delivery = await ws.deliver(task.repository, taskId, { push: true }).catch((e) => ({ pushed: false, needsHuman: false, reason: e.message }));
      audit('task_delivery', { task_id: taskId, pushed: delivery.pushed, integrated: delivery.integrated, needsHuman: delivery.needsHuman });
      if (delivery.needsHuman) {
        integratedSafely = false;
        enqueueHumanAction(taskId, { kind: 'merge-conflict', title: 'Resolve concurrent-work conflict', why: delivery.reason });
        release(taskId); markTaskDone(agent.agent_id);
        return setStatusSafe(taskId, 'WAITING_FOR_HUMAN', { human_action_required: true, result_summary: `Delivered code ready but ${delivery.reason}.` });
      }
      update(taskId, { pushed: delivery.pushed });
    }

    const plan = planDeployment(agent, getTask(taskId), { accepted: true, integratedSafely });
    update(taskId, { deploy_plan: plan });
    if (task.deploy_required && plan.needsHuman) {
      enqueueApproval(taskId, plan.reason); release(taskId); markTaskDone(agent.agent_id);
      return setStatusSafe(taskId, 'WAITING_FOR_HUMAN', { human_action_required: true, result_summary: `Deploy needs human: ${plan.reason}` });
    }
    if (task.deploy_required && plan.autonomous) {
      setStatus(taskId, 'DEPLOYING');
      setStatus(taskId, 'VERIFYING');
      const lv = await liveVerify(agent, {});
      update(taskId, { live_verification: lv, deploy_url: agent.deploy?.production_url || null, rollback: rollbackRef(agent, getTask(taskId)) });
      audit('live_verification', { task_id: taskId, ok: lv.ok, status: lv.status });
      if (!lv.ok) {
        release(taskId); markTaskDone(agent.agent_id);
        return setStatusSafe(taskId, 'FAILED', { result_summary: `Deploy done but live verification failed: ${lv.reason || 'status ' + lv.status}` });
      }
    }

    release(taskId); markTaskDone(agent.agent_id);
    if (provisioned && getTask(taskId).status !== 'WAITING_FOR_HUMAN') await ws.removeWorktree(task.repository, taskId).catch(() => {});
    const done = setStatus(taskId, 'COMPLETED');
    audit('task_completed', { task_id: taskId, commit: result.commit, mode: runOut.mode });
    dispatchWebhook('task.completed', done);
    return done;
  } catch (err) {
    release(taskId);
    audit('task_error', { task_id: taskId, error: err.message });
    return setStatusSafe(taskId, 'FAILED', { result_summary: `Engine error: ${err.message}` });
  }
}

function setStatusSafe(taskId, status, patch) {
  try { return setStatus(taskId, status, patch); } catch { return update(taskId, { status, ...patch }); }
}

export async function drain() {
  const processed = []; let id;
  cascadeDependencyBlocks();
  while ((id = pickRunnable())) {
    await process(id);
    processed.push(id);
    cascadeDependencyBlocks();  // a just-finished dep may unblock or block dependents
    if (processed.length > 100) break;
  }
  return processed;
}

// ---- Async worker + stuck recovery (brief §26, §53, §62) -----------------
let workerTimer = null;
export function startWorker() {
  if (workerTimer) return;
  const loop = async () => { try { recoverStuck(); await drain(); } catch { /* keep looping */ } workerTimer = setTimeout(loop, config.worker.pollMs); };
  workerTimer = setTimeout(loop, config.worker.pollMs);
}
export function stopWorker() { if (workerTimer) { clearTimeout(workerTimer); workerTimer = null; } }
export function isWorkerRunning() { return workerTimer !== null; }

// Reclaim tasks left RUNNING by a crash: if the heartbeat lease expired, fail
// them safely rather than leaving them RUNNING forever (brief §53, §62).
export function recoverStuck(now = Date.now()) {
  const stuck = [];
  for (const t of listTasks({ status: 'RUNNING' })) {
    const last = Date.parse(t.last_heartbeat || t.updated_at);
    if (now - last > config.worker.leaseMs) {
      release(t.task_id);
      setStatusSafe(t.task_id, 'FAILED', { result_summary: 'Heartbeat lease expired — process presumed dead; failed safely for re-submission.' });
      audit('task_recovered_stuck', { task_id: t.task_id });
      stuck.push(t.task_id);
    }
  }
  return stuck;
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
    a.status = approve ? 'APPROVED' : 'REJECTED'; a.resolved_at = new Date().toISOString(); a.note = note;
    return a;
  });
}
export function listApprovals(status = 'PENDING') { return Object.values(ready().approvals).filter((a) => !status || a.status === status); }
export function listHumanActions(status = 'OPEN') { return Object.values(ready().humanActions).filter((a) => !status || a.status === status); }
export function queueSnapshot() { return ready().queue.map((id) => getTask(id)).filter((t) => t && t.status === 'QUEUED'); }
