// Session persistence & continuity (brief §14).
//
// Each development domain keeps ONE persistent Claude Code session so a follow-up
// task resumes the same context instead of re-explaining everything. But we never
// blindly resume a stale or polluted session (brief §15: repository is the source
// of truth, not session memory). decideSession() applies explicit freshness
// rules; when a fresh session is wiser it starts one.

import { randomUUID } from 'node:crypto';
import { tx, ready } from './store.mjs';
import { config } from './config.mjs';

export function getSession(agentId) {
  return ready().sessions[agentId] || null;
}

// Decide whether to resume the domain's session or start a new one.
//   repoHead — the CURRENT remote HEAD sha for the agent's repo (from preflight).
//   now      — injectable clock for tests.
export function decideSession(agentId, repoHead, now = Date.now()) {
  const s = getSession(agentId);
  if (!s) {
    return { action: 'new', session_id: randomUUID(), reason: 'no existing session for this domain' };
  }
  const ageMs = now - Date.parse(s.created_at);
  if (ageMs > config.session.maxAgeMs) {
    return { action: 'new', session_id: randomUUID(), reason: `session too old (${Math.round(ageMs / 3600000)}h > max)` };
  }
  if (s.tasks_completed >= config.session.maxTasks) {
    return { action: 'new', session_id: randomUUID(), reason: `session handled ${s.tasks_completed} tasks (drift risk)` };
  }
  if (repoHead && s.repo_head && repoHead !== s.repo_head) {
    // The repo moved under the session. Continuity is still useful (same domain),
    // but the agent MUST re-read git — resume, and flag the head change so the
    // prompt builder tells the agent to re-sync.
    return {
      action: 'resume', session_id: s.session_id, head_changed: true,
      reason: `resume (repo HEAD changed ${s.repo_head?.slice(0, 7)}→${repoHead.slice(0, 7)}; agent must re-fetch)`,
    };
  }
  return { action: 'resume', session_id: s.session_id, head_changed: false, reason: 'fresh session, same repo HEAD' };
}

// Record that a session was used for a task (creates it on first use).
export function recordUse(agentId, sessionId, repoHead) {
  return tx((db) => {
    const now = new Date().toISOString();
    const cur = db.sessions[agentId];
    if (!cur || cur.session_id !== sessionId) {
      db.sessions[agentId] = {
        agent_id: agentId, session_id: sessionId, created_at: now,
        last_used_at: now, repo_head: repoHead || null, tasks_completed: 0,
      };
    } else {
      cur.last_used_at = now;
      cur.repo_head = repoHead || cur.repo_head;
    }
    return db.sessions[agentId];
  });
}

export function markTaskDone(agentId) {
  return tx((db) => {
    const s = db.sessions[agentId];
    if (s) s.tasks_completed += 1;
    return s;
  });
}
