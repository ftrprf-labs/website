// Canonical task object + status model (brief §11–§12).
//
// The orchestrator's task record is the ONE source of truth for task state
// (brief §59). GitHub (branch/commit/PR/checks) is the delivery + audit surface,
// referenced from the task — never a second, competing source of truth.

import { tx, ready } from './store.mjs';

// Status is load-bearing, not cosmetic (brief §12). Legal transitions are
// enforced so a task can never silently jump from RUNNING to COMPLETED without
// passing acceptance.
export const STATUS = [
  'RECEIVED', 'ROUTED', 'QUEUED', 'RUNNING', 'WAITING_FOR_PERMISSION',
  'WAITING_FOR_HUMAN', 'TESTING', 'READY_TO_MERGE', 'MERGING', 'DEPLOYING',
  'VERIFYING', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED',
];

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
export function isTerminal(s) { return TERMINAL.has(s); }

export const PRIORITY = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function nextTaskId(db) {
  db.counter += 1;
  return `MAC-${db.counter}`;
}

// Create a fully-formed task from a routing decision.
export function createTask({ request, routing, priority = 'NORMAL', acceptance = [],
  deployRequired = false, idempotencyKey = null, epicId = null, dependsOn = [] }) {
  return tx((db) => {
    const id = nextTaskId(db);
    const now = new Date().toISOString();
    const task = {
      task_id: id,
      title: deriveTitle(request),
      original_request: request,
      normalized_request: normalize(request),
      created_at: now,
      updated_at: now,
      status: 'RECEIVED',
      priority: PRIORITY.includes(priority) ? priority : 'NORMAL',
      // Routing outcome.
      selected_agent: routing.selected_agent,
      repository: routing.repository,
      task_type: routing.task_type,
      risk_level: routing.risk_level,
      routing_confidence: routing.confidence,
      routing_reason: routing.reason,
      cross_domain: Boolean(routing.cross_domain),
      primary_owner: routing.primary_owner || null,
      dependency: routing.dependency || null,
      // Execution.
      branch: null,
      session_id: null,
      required_checks: routing.required_checks || [],
      acceptance_criteria: acceptance,
      tests_required: (routing.required_checks || []).length > 0,
      deploy_required: Boolean(deployRequired),
      // Epic decomposition + dependencies between tasks. `dependencies` are task
      // ids that must reach COMPLETED before this task is runnable (brief:
      // Autonomous Night Run decomposition).
      epic_id: epicId || null,
      dependencies: Array.isArray(dependsOn) ? [...dependsOn] : [],
      blocked_by: Array.isArray(dependsOn) ? [...dependsOn] : [],
      // Results.
      human_action_required: false,
      result_summary: null,
      commit_sha: null,
      pr: null,
      deploy_url: null,
      pre_change_sha: null,
      deployed_sha: null,
      rollback_sha: null,
      live_verification: null,
      warnings: [],
      history: [{ at: now, status: 'RECEIVED' }],
    };
    db.tasks[id] = task;
    if (idempotencyKey) db.idempotency[idempotencyKey] = id;
    return task;
  });
}

export function getTask(id) {
  const t = ready().tasks[id];
  return t ? { ...t } : null;
}

export function listTasks(filter = {}) {
  let list = Object.values(ready().tasks);
  if (filter.status) list = list.filter((t) => t.status === filter.status);
  if (filter.agent) list = list.filter((t) => t.selected_agent === filter.agent);
  if (filter.active) list = list.filter((t) => !isTerminal(t.status));
  return list.map((t) => ({ ...t })).sort((a, b) => a.task_id.localeCompare(b.task_id, undefined, { numeric: true }));
}

// Legal status transitions (brief §12). A transition to a status not reachable
// from the current one throws — this is what stops "the agent said done" from
// becoming COMPLETED without passing through TESTING/VERIFYING (brief §30).
const TRANSITIONS = {
  RECEIVED: ['ROUTED', 'FAILED', 'CANCELLED', 'WAITING_FOR_HUMAN'],
  ROUTED: ['QUEUED', 'BLOCKED', 'FAILED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'BLOCKED', 'CANCELLED', 'FAILED'],
  RUNNING: ['WAITING_FOR_PERMISSION', 'WAITING_FOR_HUMAN', 'TESTING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  WAITING_FOR_PERMISSION: ['RUNNING', 'FAILED', 'CANCELLED'],
  WAITING_FOR_HUMAN: ['RUNNING', 'QUEUED', 'FAILED', 'CANCELLED'],
  TESTING: ['READY_TO_MERGE', 'FAILED', 'RUNNING', 'CANCELLED', 'WAITING_FOR_HUMAN'],
  READY_TO_MERGE: ['MERGING', 'DEPLOYING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  MERGING: ['DEPLOYING', 'VERIFYING', 'COMPLETED', 'FAILED'],
  DEPLOYING: ['VERIFYING', 'FAILED'],
  VERIFYING: ['COMPLETED', 'FAILED'],
  COMPLETED: [], FAILED: [], CANCELLED: [], BLOCKED: ['QUEUED', 'CANCELLED', 'FAILED'],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function setStatus(id, status, patch = {}) {
  if (!STATUS.includes(status)) throw new Error(`Unknown status: ${status}`);
  return tx((db) => {
    const t = db.tasks[id];
    if (!t) return null;
    if (t.status !== status && !canTransition(t.status, status)) {
      throw new Error(`Illegal transition ${t.status} → ${status} for ${id}`);
    }
    Object.assign(t, patch, { status, updated_at: new Date().toISOString() });
    t.history.push({ at: t.updated_at, status });
    return { ...t };
  });
}

export function update(id, patch) {
  return tx((db) => {
    const t = db.tasks[id];
    if (!t) return null;
    Object.assign(t, patch, { updated_at: new Date().toISOString() });
    return { ...t };
  });
}

function deriveTitle(request) {
  const one = String(request).replace(/\s+/g, ' ').trim();
  return one.length > 80 ? one.slice(0, 77) + '…' : one;
}
export function normalize(request) {
  return String(request).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
