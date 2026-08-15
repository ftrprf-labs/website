// Concurrency locks (brief §23–§24).
//
// V1 uses the simplest reliable scheme: ONE active write task per repository.
// Read-only analysis tasks never take a write lock, so they can run in parallel.
// A cross-repository task reserves locks on ALL its repositories at once, using a
// deterministic (alphabetical) ordering so two cross-repo tasks can never
// deadlock — both always grab repos in the same order, or the second one waits.
//
// Locks live in the JSON store (single source of truth) rather than only on disk,
// so `status`/`queue` can always show who holds what.

import { tx, ready } from './store.mjs';

// Sort repositories deterministically to prevent lock-ordering deadlocks.
export function orderRepos(repos) {
  return [...new Set(repos)].filter(Boolean).sort();
}

export function heldBy(repo) {
  const l = ready().locks[repo];
  return l ? l.task_id : null;
}

// Try to acquire write locks on all `repos` for `taskId`. All-or-nothing: if any
// repo is held by another task, acquire NONE and report the blockers.
export function tryAcquire(taskId, repos) {
  const ordered = orderRepos(repos);
  return tx((db) => {
    const blockers = [];
    for (const repo of ordered) {
      const l = db.locks[repo];
      if (l && l.task_id !== taskId) blockers.push({ repo, held_by: l.task_id });
    }
    if (blockers.length) return { acquired: false, blockers };
    const at = new Date().toISOString();
    for (const repo of ordered) db.locks[repo] = { task_id: taskId, acquired_at: at };
    return { acquired: true, repos: ordered };
  });
}

// Release every lock held by this task (idempotent).
export function release(taskId) {
  return tx((db) => {
    const freed = [];
    for (const [repo, l] of Object.entries(db.locks)) {
      if (l && l.task_id === taskId) { delete db.locks[repo]; freed.push(repo); }
    }
    return freed;
  });
}

export function locksSnapshot() {
  return { ...ready().locks };
}
