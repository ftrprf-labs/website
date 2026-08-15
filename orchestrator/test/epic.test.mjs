// Epic (decomposed assignment) tests. A large assignment becomes linked sub-tasks
// that run under dependency gating: a dependent waits for its prerequisite, runs
// once it COMPLETES, and is BLOCKED (never run on a broken base) if it FAILS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { submitEpic, getEpic, drain } from '../src/engine.mjs';
import { getTask, setStatus } from '../src/tasks.mjs';

test('submitEpic creates linked sub-tasks with dependencies', () => {
  freshStore();
  const out = submitEpic([
    '1. Verbeter de SEO meta tags op de homepage',
    '2. Voeg microcopy toe aan de homepage hero',
  ].join('\n'));
  assert.equal(out.is_epic, true);
  assert.equal(out.tasks.length, 2);
  const [a, b] = out.tasks;
  assert.equal(a.repository, b.repository);          // same repo
  assert.deepEqual(b.dependencies, [a.task_id]);      // second depends on first
  assert.equal(a.epic_id, out.epic.epic_id);
});

test('a single instruction through submitEpic is just one task, no epic', () => {
  freshStore();
  const out = submitEpic('Verbeter de SEO meta tags op de homepage');
  assert.equal(out.is_epic, false);
  assert.equal(out.epic, null);
  assert.equal(out.tasks.length, 1);
});

test('a dependent sub-task runs only after its prerequisite completes (mock)', async () => {
  freshStore();
  const out = submitEpic([
    '1. Verbeter de SEO meta tags op de homepage',
    '2. Voeg microcopy toe aan de homepage hero',
  ].join('\n'));
  const [a, b] = out.tasks;
  await drain(); // mock runner completes both, in dependency order
  assert.equal(getTask(a.task_id).status, 'COMPLETED');
  assert.equal(getTask(b.task_id).status, 'COMPLETED');
  const epic = getEpic(out.epic.epic_id);
  assert.equal(epic.rollup, 'COMPLETED');
});

test('a dependent is BLOCKED when its prerequisite fails (no run on a broken base)', async () => {
  freshStore();
  const out = submitEpic([
    '1. Verbeter de SEO meta tags op de homepage',
    '2. Voeg microcopy toe aan de homepage hero',
  ].join('\n'));
  const [a, b] = out.tasks;
  setStatus(a.task_id, 'FAILED', { result_summary: 'forced failure for test' });
  await drain();
  assert.equal(getTask(b.task_id).status, 'BLOCKED');
  const epic = getEpic(out.epic.epic_id);
  assert.equal(epic.rollup, 'FAILED');
});
