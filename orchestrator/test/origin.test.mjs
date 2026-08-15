// Origin & Return architecture tests. Covers: origin envelope, inheritance,
// correlation propagation, caller identity, central execution + structured
// completion, no-false-COMPLETED guard, delivery pending/ack/failed, webhook
// signing, context isolation, no secret leakage, restart/recovery, idempotency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { config } from '../src/config.mjs';
import {
  submitEpic, getEpic, getEpicCompletion, acknowledgeEpic, cockpitView, drain,
} from '../src/engine.mjs';
import { getTask } from '../src/tasks.mjs';
import { buildPrompt } from '../src/promptBuilder.mjs';
import { getAgent } from '../src/registry.mjs';
import { resolveCaller, authRequired, _resetForTests as resetIdentity } from '../src/identity.mjs';
import { dispatchCompletionWebhook } from '../src/webhook.mjs';
import { _resetForTests as reloadStore } from '../src/store.mjs';

const TWO_STEP = '1. Verbeter de homepage SEO en meta tags\n2. Voeg microcopy toe aan de homepage hero';

test('origin envelope is stored on the epic and inherited by sub-tasks', () => {
  freshStore();
  const out = submitEpic(TWO_STEP, {
    origin: { type: 'specialist-chat', id: 'thread-42', project: 'first-five', return_destination: { kind: 'poll' } },
    submittedBy: 'first-five-client',
  });
  assert.equal(out.origin.type, 'specialist-chat');
  assert.equal(out.origin.project, 'first-five');
  assert.equal(out.origin.submitted_by, 'first-five-client');
  const e = getEpic(out.epic.epic_id);
  assert.equal(e.origin.id, 'thread-42');
  for (const t of e.tasks) {
    assert.equal(t.origin.project, 'first-five');
    assert.equal(t.origin.inherited_from_epic, true);
  }
});

test('correlation_id propagates to every sub-task', () => {
  freshStore();
  const out = submitEpic(TWO_STEP, { origin: { correlation_id: 'corr-xyz' }, submittedBy: 'c' });
  assert.equal(out.origin.correlation_id, 'corr-xyz');
  for (const t of out.tasks) assert.equal(t.correlation_id, 'corr-xyz');
});

test('submitted_by is server-set and cannot be forged by the body', () => {
  freshStore();
  // A caller tries to claim a different identity in the declared origin.
  const out = submitEpic(TWO_STEP, { origin: { submitted_by: 'admin', project: 'x' }, submittedBy: 'real-client' });
  assert.equal(out.origin.submitted_by, 'real-client'); // server value wins
});

test('legacy submit without origin is marked legacy, never invented', () => {
  freshStore();
  const out = submitEpic(TWO_STEP); // no origin, no submittedBy
  const e = getEpic(out.epic.epic_id);
  assert.equal(e.origin.submitted_by, 'unknown');
  assert.equal(e.origin.type, 'unspecified');
  assert.equal(e.origin.id, null); // not fabricated
});

test('caller identity resolves named clients and rejects unknown tokens', () => {
  freshStore();
  config.api.clientsRaw = JSON.stringify([{ id: 'first-five', token: 'tok-A' }, { id: 'comm', token: 'tok-B' }]);
  config.api.token = '';
  resetIdentity();
  assert.equal(authRequired(), true);
  assert.equal(resolveCaller('tok-A').id, 'first-five');
  assert.equal(resolveCaller('tok-B').id, 'comm');
  assert.equal(resolveCaller('wrong'), null);
  // Legacy single token still works as 'default'.
  config.api.clientsRaw = ''; config.api.token = 'legacy'; resetIdentity();
  assert.equal(resolveCaller('legacy').id, 'default');
  config.api.token = ''; resetIdentity();
});

test('idempotent epic resubmission returns the same epic', () => {
  freshStore();
  const a = submitEpic(TWO_STEP, { idempotencyKey: 'k1', submittedBy: 'c' });
  const b = submitEpic(TWO_STEP, { idempotencyKey: 'k1', submittedBy: 'c' });
  assert.equal(a.epic.epic_id, b.epic.epic_id);
  assert.equal(b.deduped, 'idempotency');
});

test('epic runs through the central lifecycle and records structured completion (mock)', async () => {
  freshStore();
  const out = submitEpic(TWO_STEP, { origin: { project: 'first-five', return_destination: { kind: 'poll' } }, submittedBy: 'ff' });
  await drain();
  const c = getEpicCompletion(out.epic.epic_id);
  assert.equal(c.status, 'COMPLETED');
  assert.equal(c.completion_delivery_state, 'pending'); // settled → pending
  assert.ok(c.started_at && c.completed_at);
  assert.deepEqual(c.runner_modes, ['mock']);
  assert.equal(c.tasks.length, 2);
  assert.equal(c.tasks.every((t) => t.status === 'COMPLETED'), true);
});

test('a still-running epic cannot be acknowledged — no false COMPLETED', () => {
  freshStore();
  const out = submitEpic(TWO_STEP, { submittedBy: 'ff' }); // NOT drained
  const c = getEpicCompletion(out.epic.epic_id);
  assert.notEqual(c.status, 'COMPLETED');
  assert.equal(c.completion_delivery_state, 'not_ready');
  const ack = acknowledgeEpic(out.epic.epic_id, {});
  assert.equal(ack.ok, false);
  assert.equal(ack.reason, 'not_ready');
});

test('delivery goes not_ready -> pending -> delivered, and enforces correlation', async () => {
  freshStore();
  const out = submitEpic(TWO_STEP, { origin: { correlation_id: 'c-1' }, submittedBy: 'ff' });
  await drain();
  assert.equal(getEpic(out.epic.epic_id).completion_delivery_state, 'pending');
  // wrong correlation is rejected
  assert.equal(acknowledgeEpic(out.epic.epic_id, { correlationId: 'nope' }).ok, false);
  // right correlation delivers
  const ok = acknowledgeEpic(out.epic.epic_id, { correlationId: 'c-1', by: 'ff' });
  assert.equal(ok.ok, true);
  assert.equal(ok.completion_delivery_state, 'delivered');
  const e = getEpic(out.epic.epic_id);
  assert.ok(e.delivery.acknowledged_at);
  // idempotent
  assert.equal(acknowledgeEpic(out.epic.epic_id, { correlationId: 'c-1' }).completion_delivery_state, 'delivered');
});

test('HUMAN ACTION epic surfaces in completion and is not deliverable', async () => {
  freshStore();
  const out = submitEpic('1. Verbeter de homepage SEO\n2. qqzzx wworp bnnmp unroutable stap', { submittedBy: 'ff' });
  await drain();
  const c = getEpicCompletion(out.epic.epic_id);
  assert.equal(c.status, 'WAITING_FOR_HUMAN');
  assert.ok(c.human_actions.length >= 1);
  assert.equal(acknowledgeEpic(out.epic.epic_id, {}).ok, false); // not deliverable while a human is needed
});

test('completion webhook is signed and only proven-delivered on 2xx', async () => {
  freshStore();
  config.api.webhookSecret = 'shh';
  let seen = null;
  const okFetch = async (url, opts) => { seen = opts.headers; return { ok: true }; };
  const badFetch = async () => { throw new Error('down'); };
  const origin = { correlation_id: 'c', type: 'api' };
  assert.equal(await dispatchCompletionWebhook('https://x/y', origin, { epic_id: 'EPIC-1' }, { fetchImpl: okFetch }), true);
  assert.match(seen['x-maculis-signature'], /^sha256=/);
  assert.equal(await dispatchCompletionWebhook('https://x/y', origin, { epic_id: 'EPIC-1' }, { fetchImpl: badFetch }), false);
  config.api.webhookSecret = '';
});

test('context isolation: the task prompt carries governance + role, not origin/conversation context', () => {
  freshStore();
  const out = submitEpic(TWO_STEP, { origin: { id: 'secret-thread-id', project: 'finance-chat', correlation_id: 'corr-secret' }, submittedBy: 'c' });
  const t = getTask(out.tasks[0].task_id);
  const prompt = buildPrompt(t, getAgent(t.selected_agent), { remote_head: 'abc', recent_commits: [] }, null);
  assert.doesNotMatch(prompt, /secret-thread-id/);
  assert.doesNotMatch(prompt, /finance-chat/);
  assert.doesNotMatch(prompt, /corr-secret/);
  assert.match(prompt, /Autonomous Night Run/); // global governance IS present
});

test('no secret leakage: completion and cockpit never contain the API token', async () => {
  freshStore();
  config.api.token = 'SUPERSECRET-TOKEN-VALUE';
  const out = submitEpic(TWO_STEP, { submittedBy: 'c' });
  await drain();
  const blob = JSON.stringify(getEpicCompletion(out.epic.epic_id)) + JSON.stringify(cockpitView());
  assert.doesNotMatch(blob, /SUPERSECRET-TOKEN-VALUE/);
  config.api.token = '';
});

test('restart/recovery: origin + completion survive a store reload', async () => {
  const dir = freshStore();
  const out = submitEpic(TWO_STEP, { origin: { project: 'first-five', correlation_id: 'c-persist' }, submittedBy: 'ff' });
  await drain();
  reloadStore(dir); // simulate process restart: drop in-memory state, reload from disk
  const e = getEpic(out.epic.epic_id);
  assert.equal(e.origin.project, 'first-five');
  assert.equal(e.origin.correlation_id, 'c-persist');
  assert.equal(e.completion_delivery_state, 'pending');
});

test('cockpit shows one compact line per epic with origin + phase', async () => {
  freshStore();
  submitEpic(TWO_STEP, { origin: { project: 'first-five' }, submittedBy: 'ff' });
  await drain();
  const cp = cockpitView();
  assert.equal(cp.length, 1);
  assert.equal(cp[0].origin_project, 'first-five');
  assert.equal(cp[0].phase, 'COMPLETED');
  assert.ok('tasks' in cp[0] && 'delivery' in cp[0]);
  // compact: no bulky content fields
  assert.equal('request' in cp[0], false);
});
