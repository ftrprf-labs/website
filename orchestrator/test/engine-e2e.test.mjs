// End-to-end slice (brief §70–§71, §85). Submit → route → run (mock) → verify →
// final status. Proves: happy path COMPLETED; deliberate failure → FAILED (not
// COMPLETED); missing external credential → WAITING_FOR_HUMAN + central action;
// duplicate submit is linked, not cloned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { submit, drain, listHumanActions } from '../src/engine.mjs';
import { getTask } from '../src/tasks.mjs';

test('happy path: HEMA bug runs to COMPLETED with a commit + regression test', async () => {
  freshStore();
  const { task } = submit('Bij HEMA verschijnt na Herken je dit → Ja nog steeds geen Nog een lens. Los dit volledig E2E op.');
  assert.equal(task.selected_agent, 'first_five');
  await drain();
  const t = getTask(task.task_id);
  assert.equal(t.status, 'COMPLETED', t.result_summary);
  assert.ok(t.commit_sha);
});

test('failure path: a task that cannot pass its test ends FAILED, not COMPLETED', async () => {
  freshStore();
  const { task } = submit('SIMULATE_FAIL micro reveal op de homepage werkt niet');
  await drain();
  const t = getTask(task.task_id);
  assert.equal(t.status, 'FAILED');
  assert.match(t.result_summary, /Not COMPLETED/);
});

test('human-action path: WhatsApp without a provider credential waits for a human', async () => {
  freshStore();
  const { task } = submit('Bouw WhatsApp communicatie binnen de klant OCA in de Relationship Workspace.');
  await drain();
  const t = getTask(task.task_id);
  assert.equal(t.status, 'WAITING_FOR_HUMAN');
  assert.equal(t.human_action_required, true);
  const actions = listHumanActions();
  assert.ok(actions.some((a) => a.kind === 'external-credential'));
});

test('duplicate submit while active is linked, not cloned', async () => {
  freshStore();
  const first = submit('Testerbeheer communicatie uitbreiden');
  const second = submit('Testerbeheer communicatie uitbreiden');
  assert.equal(second.deduped, 'duplicate');
  assert.equal(second.task.task_id, first.task.task_id);
});

test('idempotency key returns the same task', () => {
  freshStore();
  const a = submit('homepage SEO verbeteren', { idempotencyKey: 'k-1' });
  const b = submit('homepage SEO verbeteren', { idempotencyKey: 'k-1' });
  assert.equal(a.task.task_id, b.task.task_id);
});
