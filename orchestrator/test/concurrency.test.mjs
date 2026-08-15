// Concurrency tests (brief §68). Two write tasks for the same repo: first runs,
// second stays QUEUED (repo write-lock), then becomes runnable once released.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { submit, pickRunnable } from '../src/engine.mjs';
import { tryAcquire, release, heldBy, orderRepos } from '../src/locks.mjs';
import { setStatus, getTask } from '../src/tasks.mjs';

test('same-repo write tasks serialise via the repo lock', () => {
  freshStore();
  const a = submit('Testerbeheer communicatie feature A in de Relationship Workspace').task;
  const b = submit('Contact organisatie feature B in de Relationship Workspace').task;
  assert.equal(a.repository, b.repository);
  assert.equal(a.status, 'QUEUED');
  assert.equal(b.status, 'QUEUED');

  // Task A acquires the lock and starts running.
  assert.equal(tryAcquire(a.task_id, [a.repository]).acquired, true);
  setStatus(a.task_id, 'RUNNING');
  assert.equal(heldBy(a.repository), a.task_id);

  // A second acquire for the same repo is blocked.
  const probe = tryAcquire(b.task_id, [b.repository]);
  assert.equal(probe.acquired, false);
  assert.equal(probe.blockers[0].held_by, a.task_id);

  // pickRunnable must not offer B while the repo is locked.
  assert.equal(pickRunnable(), null);

  // Release A → B becomes runnable.
  release(a.task_id);
  assert.equal(pickRunnable(), b.task_id);
});

test('cross-repo locks use deterministic ordering (no deadlock)', () => {
  freshStore();
  assert.deepEqual(orderRepos(['b/z', 'a/a', 'b/z']), ['a/a', 'b/z']);
});
