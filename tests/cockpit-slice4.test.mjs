// Future Cockpit — Slice 4: the prepared-work loop (follow-ups you can act on).
//
// Maculis already CREATES follow-ups (Slice 2 next-move) but they were display-only. Slice 4 makes
// prepared work visible on Vandaag and completable by the human (dossier + Vandaag), audited, and
// makes the next-move idempotent per conversation. Skipped without DATABASE_URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Slice 4 E2E skipped' };

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

test('Slice 4 — prepared work: create via next-move, see, complete (idempotent, audited)', opts, async (t) => {
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { runCopilot } = await import('../server/comm/ai/copilot.mjs');

  await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event, follow_up cascade');
  const tenantId = await getDefaultTenantId();
  const org = (await query("insert into organization(tenant_id,name) values ($1,'Buurtwerk De Brug') returning id", [tenantId])).rows[0].id;
  const contact = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'kim@debrug.be','Kim','De Vos','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;
  await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL','kim@debrug.be',true)", [tenantId, contact]);
  const conv = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag', now(), now()) returning id", [tenantId, contact, org])).rows[0].id;
  const msg = (await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@debrug.be','Kunnen jullie ook naar arbeidsmarktcommunicatie kijken?','RECEIVED', now()) returning id", [tenantId, conv])).rows[0].id;
  await runCopilot({ conversationId: conv, messageId: msg }); // yields suggested_actions incl. follow_up_task

  let fuId;
  await t.test('01 next-move creates a follow-up (prepared work)', async () => {
    const r = await call('POST', '/api/cockpit/conversation/' + conv + '/next-move', { body: { type: 'follow_up_task', in_days: 3 } });
    assert.equal(r.status, 200); assert.equal(r.data.ok, true);
    fuId = r.data.followUp.id;
    assert.ok(fuId);
  });

  await t.test('02 next-move is idempotent per conversation (no duplicate)', async () => {
    const r = await call('POST', '/api/cockpit/conversation/' + conv + '/next-move', { body: { type: 'follow_up_task', in_days: 3 } });
    assert.equal(r.status, 200); assert.equal(r.data.ok, true);
    assert.equal(r.data.deduped, true, 'the same open follow-up is returned, not a new one');
    assert.equal(r.data.followUp.id, fuId);
    const n = (await query("select count(*)::int n from follow_up where conversation_id=$1", [conv])).rows[0].n;
    assert.equal(n, 1, 'exactly one follow-up exists');
  });

  await t.test('03 Vandaag surfaces the prepared work', async () => {
    const { data } = await call('GET', '/api/cockpit/today');
    assert.ok(Array.isArray(data.preparedWork));
    assert.equal(data.counts.prepared, 1);
    const item = data.preparedWork.find((f) => f.id === fuId);
    assert.ok(item, 'the follow-up is on Vandaag');
    assert.equal(item.who, 'Kim De Vos');
    assert.equal(item.contactId, contact);
  });

  await t.test('04 the actions list shows it', async () => {
    const { status, data } = await call('GET', '/api/cockpit/actions');
    assert.equal(status, 200);
    assert.equal(data.count, 1);
    assert.equal(data.actions[0].id, fuId);
  });

  await t.test('05 completing it is a human action, audited, and it leaves the list', async () => {
    const before = (await query("select count(*)::int n from audit_event where action='cockpit_followup_done'")).rows[0].n;
    const r = await call('POST', '/api/cockpit/followup/' + fuId + '/done', { body: {} });
    assert.equal(r.status, 200); assert.equal(r.data.ok, true);
    const done = (await query('select status, completed_at from follow_up where id=$1', [fuId])).rows[0];
    assert.equal(done.status, 'done');
    assert.ok(done.completed_at, 'completed_at is set');
    const after = (await query("select count(*)::int n from audit_event where action='cockpit_followup_done'")).rows[0].n;
    assert.equal(after, before + 1, 'the completion is audited');
    const { data } = await call('GET', '/api/cockpit/actions');
    assert.equal(data.count, 0, 'completed work leaves the actions list');
    const today = await call('GET', '/api/cockpit/today');
    assert.equal(today.data.counts.prepared, 0);
  });

  await t.test('N1 completing an unknown follow-up -> 404', async () => {
    const r = await call('POST', '/api/cockpit/followup/00000000-0000-0000-0000-000000000000/done', { body: {} });
    assert.equal(r.status, 404);
  });

  await t.test('N2 actions + followup done require auth', async () => {
    assert.equal((await call('GET', '/api/cockpit/actions', { authed: false })).status, 401);
    assert.equal((await call('POST', '/api/cockpit/followup/' + fuId + '/done', { authed: false })).status, 401);
  });
});
