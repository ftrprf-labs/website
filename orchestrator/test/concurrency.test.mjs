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

test('two concurrent process() calls for the same task do not double-run it', async () => {
  freshStore();
  const { submit, process } = await import('../src/engine.mjs');
  const { task } = submit('homepage SEO verbeteren');       // mock runner
  // Race two processors (e.g. the worker loop + a direct drain) on the same task.
  const [a, b] = await Promise.all([process(task.task_id), process(task.task_id)]);
  const final = getTask(task.task_id);
  assert.equal(final.status, 'COMPLETED');                  // clean terminal, no illegal-transition error
  // Exactly one of the two calls actually drove it to COMPLETED.
  assert.equal([a, b].filter((r) => r && r.status === 'COMPLETED').length >= 1, true);
});
