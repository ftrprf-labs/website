// Async worker: stuck-task recovery + agent disable (brief §53, §62, §71, §52).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { config } from '../src/config.mjs';
import { submit, recoverStuck, disableAgent, enableAgent, pickRunnable, isAgentDisabled } from '../src/engine.mjs';
import { setStatus, getTask } from '../src/tasks.mjs';
import { tryAcquire } from '../src/locks.mjs';

test('a task left RUNNING past its lease is recovered as FAILED', () => {
  freshStore();
  const { task } = submit('Testerbeheer communicatie stuk repareren');
  tryAcquire(task.task_id, [task.repository]);
  setStatus(task.task_id, 'RUNNING', { last_heartbeat: new Date(Date.now() - 10 * config.worker.leaseMs).toISOString() });
  const recovered = recoverStuck();
  assert.ok(recovered.includes(task.task_id));
  assert.equal(getTask(task.task_id).status, 'FAILED');
});

test('a fresh RUNNING task with a recent heartbeat is NOT recovered', () => {
  freshStore();
  const { task } = submit('Contact organisatie feature');
  tryAcquire(task.task_id, [task.repository]);
  setStatus(task.task_id, 'RUNNING', { last_heartbeat: new Date().toISOString() });
  assert.equal(recoverStuck().length, 0);
});

test('disabling an agent blocks new tasks and pickRunnable skips them', () => {
  freshStore();
  disableAgent('relationship', 'incident');
  assert.equal(isAgentDisabled('relationship'), true);
  const { task } = submit('Testerbeheer nieuwe knop toevoegen');
  assert.equal(task.status, 'BLOCKED');
  enableAgent('relationship');
  const { task: t2 } = submit('Contact veld toevoegen aan organisatie');
  assert.equal(t2.status, 'QUEUED');
  assert.equal(pickRunnable(), t2.task_id);
});
