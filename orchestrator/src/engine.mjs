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
import { makeOrigin, inheritOrigin, readOrigin } from './origin.mjs';
import { pausedDecisionFor } from './decisions.mjs';
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
import { dispatchWebhook, dispatchCompletionWebhook } from './webhook.mjs';
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
  epicId = null, dependsOn = [], origin = null } = {}) {
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
    request, routing, priority, deployRequired, idempotencyKey, epicId, dependsOn, origin,
    acceptance: acceptance || deriveAcceptance(request, routing),
  });
  audit('task_submitted', { task_id: task.task_id, agent: task.selected_agent, repository: task.repository, confidence: task.routing_confidence });

  // PAUSED-scope guard (§17/§18): a derived task/assignment may NOT implicitly resume
  // a paused scope (e.g. EPIC-3 / next Lens). It is recorded BLOCKED + a human action,
  // never silently executed. Evidence intake and decisions are not execution and never
  // reach this path. Blocks only THIS item — sibling steps still run (§22).
  const paused = pausedDecisionFor(request);

  if (task.selected_agent === 'NEEDS_ROUTING_REVIEW') {
    setStatus(task.task_id, 'WAITING_FOR_HUMAN', { human_action_required: true });
    enqueueHumanAction(task.task_id, { kind: 'routing-review', title: 'Confirm which domain owns this task', request: task.title });
  } else if (paused) {
    setStatus(task.task_id, 'ROUTED');
    setStatus(task.task_id, 'BLOCKED', { human_action_required: true,
      result_summary: `Blocked by active PAUSED decision ${paused.decision.decision_id} (${paused.decision.scope}). An explicit superseding decision (Ludwig GO) is required to resume.` });
    enqueueHumanAction(task.task_id, { kind: 'paused-decision', title: `Resume of ${paused.decision.scope} needs explicit GO`,
      why: `Matched paused decision ${paused.decision.decision_id} on "${paused.matched}". ${paused.decision.decision}` });
    audit('task_paused_blocked', { task_id: task.task_id, decision_id: paused.decision.decision_id, scope: paused.decision.scope, matched: paused.matched });
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
export function submitEpic(request, { priority = 'NORMAL', deployRequired = false, idempotencyKey = null,
  origin = null, submittedBy = 'unknown' } = {}) {
  if (idempotencyKey) {
    const existing = ready().idempotency[idempotencyKey];
    if (existing && ready().epics[existing]) return { epic: ready().epics[existing], deduped: 'idempotency', tasks: epicTasks(existing) };
  }
  // Canonical, anti-forgery origin envelope (submitted_by is server-authenticated).
  const originEnvelope = makeOrigin(origin || {}, { submittedBy });
  const plan = decompose(request);

  // A single, indivisible instruction is just a task — but it still carries origin.
  if (!plan.is_epic) {
    const out = submit(request, { priority, deployRequired, origin: originEnvelope });
    return { epic: null, is_epic: false, plan, tasks: [out.task], origin: originEnvelope };
  }

  const epicId = tx((db) => { db.epicCounter += 1; return `EPIC-${db.epicCounter}`; });
  const idByIndex = {};
  const taskIds = [];
  for (const step of plan.steps) {
    const dependsOn = (step.depends_on_index || []).map((i) => idByIndex[i]).filter(Boolean);
    const preferred = step.selected_agent && step.selected_agent !== 'NEEDS_ROUTING_REVIEW' ? step.selected_agent : null;
    // Sub-tasks inherit the epic origin (same correlation_id, marked inherited).
    const out = submit(step.text, { priority, deployRequired, epicId, dependsOn, preferredAgent: preferred, origin: inheritOrigin(originEnvelope) });
    idByIndex[step.index] = out.task.task_id;
    taskIds.push(out.task.task_id);
  }

  const epic = tx((db) => {
    db.epics[epicId] = {
      epic_id: epicId,
      request,                                   // immutable provenance
      origin: originEnvelope,                    // first-class origin envelope
      created_at: new Date().toISOString(),
      task_ids: taskIds,
      repositories: plan.repositories,
      truncated: plan.truncated,
      needs_routing_review: plan.needs_routing_review,
      completion_delivery_state: 'not_ready',    // becomes pending at terminal, delivered on ack
      delivery: { attempts: [], acknowledged_at: null },
    };
    if (idempotencyKey) db.idempotency[idempotencyKey] = epicId;
    return db.epics[epicId];
  });
  audit('epic_submitted', { epic_id: epicId, subtasks: taskIds.length, repositories: plan.repositories,
    origin_type: originEnvelope.type, origin_project: originEnvelope.project, submitted_by: originEnvelope.submitted_by, correlation_id: originEnvelope.correlation_id });
  return { epic, is_epic: true, plan, tasks: taskIds.map((id) => getTask(id)), origin: originEnvelope };
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
  return { ...e, origin: readOrigin(e), rollup, by_status: byStatus, tasks };
}

export function listEpics() {
  return Object.keys(ready().epics).map((id) => getEpic(id)).filter(Boolean);
}

// ---- Structured completion record (authoritative, derived from the store) -----
// The completion record is COMPUTED from persisted task state — it can never claim
// more than the store actually holds (guards against false COMPLETED). It stores
// references (commits / result artefacts), not duplicated content.
export function getEpicCompletion(epicId) {
  const e = getEpic(epicId);
  if (!e) return null;
  const tasks = e.tasks;
  const terminalStates = tasks.map((t) => t.status);
  const started = tasks.map((t) => t.created_at).filter(Boolean).sort()[0] || e.created_at;
  const completedStamps = tasks.map((t) => t.updated_at).filter(Boolean).sort();
  const commits = tasks.map((t) => t.commit_sha).filter(Boolean);
  const humanActions = listHumanActions().filter((h) => e.task_ids.includes(h.task_id));
  const cost = tasks.reduce((s, t) => s + (Number(t.cost_usd) || 0), 0);
  const turns = tasks.reduce((s, t) => s + (Number(t.num_turns) || 0), 0);
  const settled = e.rollup === 'COMPLETED' || e.rollup === 'FAILED';
  return {
    epic_id: e.epic_id,
    origin: e.origin,
    correlation_id: e.origin?.correlation_id || null,
    return_destination: e.origin?.return_destination || { kind: 'none' },
    status: e.rollup,
    by_status: e.by_status,
    repositories: e.repositories,
    request_ref: `epic:${e.epic_id}`,          // immutable request lives on the epic record
    result_refs: commits.map((c) => ({ kind: 'commit', ref: c })),
    commits,
    tests: tasks.map((t) => ({ task_id: t.task_id, required_checks: t.required_checks || [], status: t.status })),
    runner_modes: [...new Set(tasks.map((t) => t.mode).filter(Boolean))],
    cost_usd: cost || null,
    num_turns: turns || null,
    human_actions: humanActions.map((h) => ({ id: h.id, kind: h.kind, task_id: h.task_id, title: h.title })),
    tasks: tasks.map((t) => ({ task_id: t.task_id, status: t.status, repository: t.repository, agent: t.selected_agent, commit_sha: t.commit_sha || null, result_summary: t.result_summary || null })),
    started_at: started,
    completed_at: settled ? (completedStamps[completedStamps.length - 1] || null) : null,
    completion_delivery_state: e.completion_delivery_state || 'not_ready',
    delivery: e.delivery || { attempts: [], acknowledged_at: null },
  };
}

// Move an epic to delivery 'pending' once it is genuinely terminal, and attempt a
// signed completion webhook when the origin asked for one. Idempotent; safe to call
// after every drain tick. Never sets 'delivered' — only an acknowledgement does.
export function refreshEpicDelivery(epicId) {
  const e = getEpic(epicId);
  if (!e) return null;
  const settled = e.rollup === 'COMPLETED' || e.rollup === 'FAILED';
  if (!settled) return e.completion_delivery_state || 'not_ready';
  if ((e.completion_delivery_state || 'not_ready') !== 'not_ready') return e.completion_delivery_state;
  tx((db) => { const r = db.epics[epicId]; if (r && (r.completion_delivery_state || 'not_ready') === 'not_ready') r.completion_delivery_state = 'pending'; });
  audit('epic_completion_ready', { epic_id: epicId, status: e.rollup, correlation_id: e.origin?.correlation_id });
  const rd = e.origin?.return_destination;
  if (rd?.kind === 'webhook' && rd.ref) {
    const completion = getEpicCompletion(epicId);
    const ok = dispatchCompletionWebhook(rd.ref, e.origin, completion);   // returns a promise of success
    Promise.resolve(ok).then((delivered) => {
      tx((db) => {
        const r = db.epics[epicId]; if (!r) return;
        r.delivery = r.delivery || { attempts: [], acknowledged_at: null };
        r.delivery.attempts.push({ at: new Date().toISOString(), kind: 'webhook', ok: Boolean(delivered) });
        if (delivered) { r.completion_delivery_state = 'delivered'; r.delivery.acknowledged_at = new Date().toISOString(); }
      });
      audit('epic_delivery_attempt', { epic_id: epicId, kind: 'webhook', ok: Boolean(delivered) });
    }).catch(() => {});
  }
  return 'pending';
}
function refreshAllEpicDeliveries() {
  for (const id of Object.keys(ready().epics)) refreshEpicDelivery(id);
}

// Explicit acknowledgement from the origin (poll/mcp retrieval). This is the ONLY
// path to 'delivered' for non-webhook returns, and it enforces the authoritative
// guard: an epic cannot be acknowledged while any sub-task is still QUEUED/RUNNING.
export function acknowledgeEpic(epicId, { correlationId = null, by = 'unknown' } = {}) {
  const e = getEpic(epicId);
  if (!e) return { ok: false, reason: 'not_found' };
  const state = e.completion_delivery_state || 'not_ready';
  if (state === 'delivered') return { ok: true, completion_delivery_state: 'delivered', completion: getEpicCompletion(epicId) }; // idempotent
  // AUTHORITATIVE GUARD: only a settled epic that refreshEpicDelivery marked 'pending'
  // can be acknowledged. A still-running epic (tasks QUEUED/RUNNING) is never 'pending',
  // so a false COMPLETED can never be acknowledged as delivered.
  if (state !== 'pending') return { ok: false, reason: 'not_ready', status: e.rollup, completion_delivery_state: state };
  const expected = e.origin?.correlation_id || null;
  if (expected && correlationId && correlationId !== expected) return { ok: false, reason: 'correlation_mismatch' };
  const rec = tx((db) => {
    const r = db.epics[epicId];
    r.completion_delivery_state = 'delivered';
    r.delivery = r.delivery || { attempts: [], acknowledged_at: null };
    r.delivery.acknowledged_at = new Date().toISOString();
    r.delivery.attempts.push({ at: r.delivery.acknowledged_at, kind: 'ack', by, ok: true });
    return r;
  });
  audit('epic_delivered', { epic_id: epicId, correlation_id: expected, by });
  return { ok: true, completion_delivery_state: rec.completion_delivery_state, completion: getEpicCompletion(epicId) };
}

// ---- Epic PAUSE / RESUME (control-plane §6.8) ----------------------------
// A paused epic keeps its state but its QUEUED sub-tasks are not picked up by the
// worker (pickRunnable gates on isEpicPaused). RESUME is refused when an active
// PAUSED decision covers the epic's request scope, unless an explicit override is
// given (an authenticated caller acting on a superseding decision / Ludwig GO).
export function isEpicPaused(epicId) { return Boolean(epicId && ready().epics[epicId]?.paused); }

export function pauseEpic(epicId, { reason = 'paused via control plane', by = 'unknown' } = {}) {
  const e = ready().epics[epicId];
  if (!e) return { ok: false, reason: 'not_found' };
  tx((db) => { const r = db.epics[epicId]; r.paused = true; r.paused_reason = reason; r.paused_at = new Date().toISOString(); r.paused_by = by; });
  audit('epic_paused', { epic_id: epicId, by, reason });
  return { ok: true, epic_id: epicId, paused: true };
}

export function resumeEpic(epicId, { by = 'unknown', override = false } = {}) {
  const e = ready().epics[epicId];
  if (!e) return { ok: false, reason: 'not_found' };
  const blocked = pausedDecisionFor(e.request);
  if (blocked && !override) {
    audit('epic_resume_blocked', { epic_id: epicId, decision_id: blocked.decision.decision_id, by });
    return { ok: false, reason: 'paused_by_decision', decision_id: blocked.decision.decision_id, scope: blocked.decision.scope,
      message: `Resume refused: active PAUSED decision ${blocked.decision.decision_id} (${blocked.decision.scope}) covers this epic. Supersede it (explicit GO) or pass override.` };
  }
  tx((db) => { const r = db.epics[epicId]; r.paused = false; r.resumed_at = new Date().toISOString(); r.resumed_by = by; });
  audit('epic_resumed', { epic_id: epicId, by, override: Boolean(override) });
  setImmediate(() => drain().catch(() => {}));
  return { ok: true, epic_id: epicId, paused: false };
}

// ---- Monitoring / status overview (control-plane §19) --------------------
// One compact aggregate: task states, epic phases, open human actions, active +
// superseded decisions, and cross-workstream conflicts (two epics touching the same
// repo). A traffic tower, not a project-management platform. No bulky content.
export function statusOverview() {
  const tasks = listTasks();
  const byTaskStatus = {};
  for (const t of tasks) byTaskStatus[t.status] = (byTaskStatus[t.status] || 0) + 1;
  const epics = listEpics();
  const epicPhase = { RUNNING: 0, WAITING_FOR_HUMAN: 0, PAUSED: 0, COMPLETED: 0, FAILED: 0, IN_PROGRESS: 0 };
  const conflictMap = {};
  for (const e of epics) {
    if (isEpicPaused(e.epic_id)) epicPhase.PAUSED += 1; else epicPhase[e.rollup] = (epicPhase[e.rollup] || 0) + 1;
    for (const r of e.repositories || []) (conflictMap[r] = conflictMap[r] || []).push(e.epic_id);
  }
  const decisions = Object.values(ready().decisions);
  const conflicts = Object.entries(conflictMap)
    .filter(([, ids]) => ids.filter((id) => { const e = getEpic(id); return e && e.rollup === 'IN_PROGRESS'; }).length > 1)
    .map(([repo, ids]) => ({ repository: repo, epics: ids }));
  return {
    tasks: byTaskStatus,
    epics: epicPhase,
    open_human_actions: listHumanActions().length,
    open_approvals: listApprovals().length,
    decisions: { active: decisions.filter((d) => d.status === 'active').length, superseded: decisions.filter((d) => d.status === 'superseded').length,
      paused_scopes: decisions.filter((d) => d.status === 'active' && d.effect === 'pause').map((d) => d.scope) },
    evidence: Object.keys(ready().evidence).length,
    cross_workstream_conflicts: conflicts,
    undelivered_completions: epics.filter((e) => (e.rollup === 'COMPLETED' || e.rollup === 'FAILED') && (e.completion_delivery_state || 'not_ready') !== 'delivered')
      .map((e) => ({ epic_id: e.epic_id, submitted_by: e.origin?.submitted_by, state: e.completion_delivery_state || 'not_ready' })),
  };
}

// Compact cockpit view — one line per epic, no bulky content (brief: calm cockpit).
export function cockpitView() {
  return listEpics().map((e) => {
    const o = e.origin || {};
    const phase = isEpicPaused(e.epic_id) ? 'PAUSED'
      : e.rollup === 'IN_PROGRESS'
        ? (e.by_status?.RUNNING ? 'RUNNING' : (e.by_status?.BLOCKED ? 'BLOCKED' : 'ROUTED'))
        : (e.rollup === 'WAITING_FOR_HUMAN' ? 'HUMAN ACTION' : e.rollup === 'FAILED' ? 'FAILED' : 'COMPLETED');
    return {
      epic_id: e.epic_id,
      phase,
      origin_project: o.project || null,
      origin_type: o.type || 'unspecified',
      submitted_by: o.submitted_by || 'unknown',
      correlation_id: o.correlation_id || null,
      workstream: e.repositories?.[0] || null,
      tasks: e.task_ids.length,
      by_status: e.by_status,
      repositories: e.repositories,
      commits: e.tasks.map((t) => t.commit_sha).filter(Boolean).length,
      status: e.rollup,
      paused: isEpicPaused(e.epic_id),
      human_action: e.rollup === 'WAITING_FOR_HUMAN',
      delivery: e.completion_delivery_state || 'not_ready',
      return_kind: o.return_destination?.kind || 'none',
    };
  });
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
    .filter((t) => t && t.status === 'QUEUED' && !isAgentDisabled(t.selected_agent) && !isEpicPaused(t.epic_id) && depsSatisfied(t))
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
  refreshAllEpicDeliveries();   // move settled epics to delivery 'pending' (+ webhook)
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
