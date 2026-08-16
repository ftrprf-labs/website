// Future Cockpit — Slice 2 (Maculis begrijpt): the real intelligence made legible.
//
// The copilot already runs automatically on every inbound and stores a relationship-aware summary,
// intent and prepared suggested_actions. Slice 2 surfaces that, grounded and human-in-the-loop:
//   - Vandaag shows the AI's real reading as the "why" (falls back honestly without one);
//   - the gesprek shows "Wat Maculis hierin ziet" + prepared next moves;
//   - a chosen next move runs ONLY a safe internal capability (a follow-up), audited, never auto.
//
// Grounded in a REAL runCopilot run (deterministic mock provider), not a hand-seeded draft.
// Skipped without DATABASE_URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Slice 2 E2E skipped' };

async function call(method, path, { body = null, authed = true } = {}) {
  const { handleCockpit } = await import('../server/cockpit/routes.mjs');
  const req = new Readable({ read() {} });
  Object.assign(req, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: {} });
  if (body != null) req.push(Buffer.from(JSON.stringify(body)));
  req.push(null);
  return await new Promise((resolve) => {
    const res = { writeHead(s) { this._s = s; }, end(b) { resolve({ status: this._s, data: b ? JSON.parse(b) : null }); } };
    const u = new URL(path, 'http://x');
    handleCockpit(req, res, { pathname: u.pathname, method, isAuthed: () => authed });
  });
}

test('Slice 2 — understanding + prepared next moves (real copilot output)', opts, async (t) => {
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { runCopilot } = await import('../server/comm/ai/copilot.mjs');

  await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event, follow_up cascade');
  const tenantId = await getDefaultTenantId();
  const org = (await query("insert into organization(tenant_id,name,primary_domain) values ($1,'Coöperatie Noorderlicht','noorderlicht.coop') returning id", [tenantId])).rows[0].id;
  const contact = (await query(
    "insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,role) values ($1,$2,'kim@noorderlicht.coop','Kim','De Vos','kim@noorderlicht.coop','Coördinator') returning id",
    [tenantId, org])).rows[0].id;
  await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL','kim@noorderlicht.coop',true)", [tenantId, contact]);
  const conv = (await query(
    "insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag over arbeidsmarkt', now(), now()) returning id",
    [tenantId, contact, org])).rows[0].id;
  // An inbound that the deterministic mock reads as a commercial_opportunity with a follow-up action.
  const msg = (await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@noorderlicht.coop','Vraag over arbeidsmarkt','Kunnen jullie ook naar arbeidsmarktcommunicatie kijken?','RECEIVED', now()) returning id", [tenantId, conv])).rows[0].id;

  // REAL intelligence: run the copilot exactly as inbound does. This produces the ai_draft.
  const cop = await runCopilot({ conversationId: conv, messageId: msg });
  assert.equal(cop.ok, true, 'copilot produced a proposal');
  const draft = (await query("select summary, intent, suggested_actions from ai_draft where conversation_id=$1 and status='proposed'", [conv])).rows[0];
  assert.ok(draft && draft.summary, 'ai_draft has a real summary');

  await t.test('01 Vandaag shows the copilot understanding as the grounded why', async () => {
    const { status, data } = await call('GET', '/api/cockpit/today');
    assert.equal(status, 200);
    const item = (data.groups.ready[0] || data.groups.now[0]);
    assert.ok(item, 'the item is on Vandaag');
    assert.equal(item.reasonSource, 'ai', 'the reason is grounded in the AI reading');
    assert.equal(item.reason, draft.summary, 'the reason IS the real ai_draft summary (provenance)');
    assert.equal(item.intent, 'kans', 'the intent is rendered in human words');
  });

  await t.test('02 Gesprek surfaces the reading + prepared next moves', async () => {
    const { status, data } = await call('GET', '/api/cockpit/conversation/' + conv);
    assert.equal(status, 200);
    assert.ok(data.understanding && data.understanding.summary === draft.summary);
    assert.equal(data.understanding.intent, 'kans');
    assert.ok(Array.isArray(data.nextMoves) && data.nextMoves.length >= 1);
    const followUp = data.nextMoves.find((m) => m.type === 'follow_up_task');
    assert.ok(followUp && followUp.executable === true, 'the follow-up is an executable move');
    assert.ok(/Follow-up over \d+ dag/.test(followUp.label));
    const marker = data.nextMoves.find((m) => m.type === 'mark_commercial_opportunity');
    assert.ok(marker && marker.executable === false, 'a non-internal move is honestly shown as not executable');
  });

  await t.test('03 No auto-execute: a follow-up exists only after the human takes the move', async () => {
    const before = (await query('select count(*)::int n from follow_up where conversation_id=$1', [conv])).rows[0].n;
    assert.equal(before, 0, 'the prepared move did not run by itself');
    const { status, data } = await call('POST', '/api/cockpit/conversation/' + conv + '/next-move', { body: { type: 'follow_up_task', in_days: 3 } });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    const after = (await query('select id, title, due_at, channel_hint from follow_up where conversation_id=$1', [conv])).rows;
    assert.equal(after.length, 1, 'exactly one real follow-up was created');
    assert.ok(/Opvolgen:/.test(after[0].title));
    assert.ok(after[0].due_at, 'it has a due date');
    // audited
    const aud = (await query("select count(*)::int n from audit_event where action='cockpit_next_move'")).rows[0].n;
    assert.equal(aud, 1, 'the move is audited');
  });

  await t.test('04 The follow-up is visible in the dossier', async () => {
    const { data } = await call('GET', '/api/cockpit/relation/' + contact);
    assert.ok(Array.isArray(data.followups) && data.followups.length >= 1, 'follow-up shows in the relation');
  });

  await t.test('N1 non-executable move is refused, not faked', async () => {
    const { status, data } = await call('POST', '/api/cockpit/conversation/' + conv + '/next-move', { body: { type: 'mark_commercial_opportunity' } });
    assert.equal(status, 400);
    assert.equal(data.reason, 'not_executable_yet');
    const n = (await query("select count(*)::int n from follow_up where conversation_id=$1", [conv])).rows[0].n;
    assert.equal(n, 1, 'no extra follow-up was created by a refused move');
  });

  await t.test('N2 unknown move type is refused', async () => {
    const { status } = await call('POST', '/api/cockpit/conversation/' + conv + '/next-move', { body: { type: 'delete_everything' } });
    assert.equal(status, 400);
  });

  await t.test('N3 Fail-closed: without a reading, Vandaag falls back to the neutral reason (no invented why)', async () => {
    // A second conversation with an inbound but NO copilot run -> no ai_draft.
    const c2 = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Zonder analyse', now(), now()) returning id", [tenantId, contact, org])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@noorderlicht.coop','Een kort bericht.','RECEIVED', now())", [tenantId, c2]);
    const { data } = await call('GET', '/api/cockpit/today');
    const item = [...data.groups.now, ...data.groups.ready].find((x) => x.conversationId === c2);
    assert.ok(item, 'the un-analysed item still appears');
    assert.equal(item.reasonSource, 'state', 'no AI reading -> neutral state reason');
    assert.equal(item.intent, null, 'no invented intent');
    // and its gesprek has no understanding / no moves
    const g = await call('GET', '/api/cockpit/conversation/' + c2);
    assert.equal(g.data.understanding, null);
    assert.deepEqual(g.data.nextMoves, []);
  });
});
