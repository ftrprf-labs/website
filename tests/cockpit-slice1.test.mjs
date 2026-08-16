// Future Cockpit — Slice 1 (De levende relatie-loop, e-mail) end-to-end.
//
// Drives the REAL /api/cockpit/* orchestration handler against a REAL database and
// the REAL Communication Layer services. Phase A: proves the whole vertical loop
// with the MOCK email provider (no external delivery). Skipped without DATABASE_URL.
//
//   echte Contact -> attention -> Vandaag -> dossier -> gesprek -> voorbereid concept
//   -> menselijke bewerking -> goedkeuring -> consent-check -> (mock) verzending
//   -> delivery/audit -> attention bijgewerkt -> observatie bevestigd -> geheugen.
//
// Plus negative/fail-closed paths (DoD): 401, 404, consent-blocked, non-email
// channel refused, empty body, memory reject, side-effect-free read.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Slice 1 E2E skipped' };

// Invoke the real handler with a mock req/res and injectable auth.
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

test('Slice 1 — full vertical loop + negative paths', opts, async (t) => {
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');

  await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event cascade');
  const tenantId = await getDefaultTenantId();
  const org = (await query("insert into organization(tenant_id,name,primary_domain) values ($1,'Coöperatie Noorderlicht','noorderlicht.coop') returning id", [tenantId])).rows[0].id;
  const contact = (await query(
    "insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,mobile,role) values ($1,$2,'jb@noorderlicht.coop','Jean-Baptiste','Vandenberghe','jb@noorderlicht.coop','+32470112233','Coördinator') returning id",
    [tenantId, org])).rows[0].id;
  await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL','jb@noorderlicht.coop',true)", [tenantId, contact]);
  const conv = (await query(
    "insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Re: de tweede sessie', now(), now()) returning id",
    [tenantId, contact, org])).rows[0].id;
  await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','jb@noorderlicht.coop','Re: de tweede sessie','Zou de tweede sessie deze maand nog kunnen?','RECEIVED', now())", [tenantId, conv]);
  await query("insert into ai_draft(tenant_id,conversation_id,summary,intent,suggested_reply,status) values ($1,$2,'Vraagt of de tweede sessie deze maand past','schedule','Dag Jean-Baptiste, deze maand kan zeker. Ik stel twee momenten voor.','proposed')", [tenantId, conv]);
  const mem = (await query("insert into relationship_memory(tenant_id,contact_id,kind,content,source,confidence) values ($1,$2,'fact','Noemt tijdsdruk, maar vraagt niet om uitstel.','ai','proposed') returning id", [tenantId, contact])).rows[0].id;

  await t.test('01 Vandaag shows the real attention item (REPLY_READY, answer ready)', async () => {
    const { status, data } = await call('GET', '/api/cockpit/today');
    assert.equal(status, 200);
    assert.equal(data.counts.actionable, 1);
    assert.ok(data.headline.secondary && /klaar/i.test(data.headline.secondary), 'headline states an answer is ready');
    const item = (data.groups.ready[0] || data.groups.now[0]);
    assert.equal(item.name, 'Jean-Baptiste Vandenberghe');
    assert.equal(item.hasPrepared, true);
    assert.equal(item.contactId, contact);
  });

  await t.test('02 Dossier: real identity, reachability, observed vs remembered', async () => {
    const { status, data } = await call('GET', '/api/cockpit/relation/' + contact);
    assert.equal(status, 200);
    assert.equal(data.identity.name, 'Jean-Baptiste Vandenberghe');
    assert.equal(data.identity.org, 'Coöperatie Noorderlicht');
    assert.equal(data.reachability.email.value, 'jb@noorderlicht.coop');
    assert.equal(data.reachability.whatsapp, null, 'WhatsApp is not presented as a working capability');
    assert.equal(data.observed.length, 1, 'the proposed memory is an observation');
    assert.equal(data.remembered.length, 0);
    assert.equal(data.primaryConversationId, conv);
  });

  await t.test('03 Gesprek read is SIDE-EFFECT-FREE (does not clear attention)', async () => {
    const before = (await query('select status, last_read_at from conversation where id=$1', [conv])).rows[0];
    const { status, data } = await call('GET', '/api/cockpit/conversation/' + conv);
    assert.equal(status, 200);
    assert.ok(data.proposal && /twee momenten/.test(data.proposal.suggested_reply));
    const after = (await query('select status, last_read_at from conversation where id=$1', [conv])).rows[0];
    assert.equal(after.status, before.status, 'status unchanged (still NEW)');
    assert.equal(String(after.last_read_at), String(before.last_read_at), 'read watermark unchanged');
  });

  let draftId;
  await t.test('04 Open working draft — seeded from the AI proposal', async () => {
    const { status, data } = await call('POST', '/api/cockpit/conversation/' + conv + '/draft', { body: {} });
    assert.equal(status, 200);
    assert.ok(data.draft && /twee momenten/.test(data.draft.body), 'draft seeded from proposal');
    assert.equal(data.draft.channel, 'EMAIL');
    draftId = data.draft.id;
  });

  await t.test('05 Human edits the draft (last word is human)', async () => {
    const { status, data } = await call('PATCH', '/api/cockpit/draft/' + draftId, { body: { body: 'Dag Jean-Baptiste, deze maand lukt. Donderdag 26 of dinsdag 1?' } });
    assert.equal(status, 200);
    assert.ok(/Donderdag 26/.test(data.draft.body));
    assert.equal(data.draft.human_edited, true);
  });

  await t.test('06 Approve + send (EMAIL, mock provider) — the loop closes', async () => {
    const { status, data } = await call('POST', '/api/cockpit/draft/' + draftId + '/send', { body: {} });
    assert.equal(status, 200);
    assert.equal(data.ok, true);
    // outbound persisted, delivery event, conversation ANSWERED, draft sent, audit written
    const out = (await query("select delivery, body_text from message where conversation_id=$1 and direction='OUTBOUND'", [conv])).rows[0];
    assert.equal(out.delivery, 'SENT');
    assert.ok(/Donderdag 26/.test(out.body_text), 'the human-approved body was sent');
    const de = (await query('select state from delivery_event order by at desc limit 1')).rows[0];
    assert.equal(de.state, 'SENT');
    const c = (await query('select status from conversation where id=$1', [conv])).rows[0];
    assert.equal(c.status, 'ANSWERED');
    const d = (await query('select status from comm_draft where id=$1', [draftId])).rows[0];
    assert.equal(d.status, 'sent');
    const aud = (await query("select count(*)::int n from audit_event where action='message_sent'")).rows[0];
    assert.equal(aud.n, 1, 'send is audited');
  });

  await t.test('07 Attention updated — the item is no longer actionable', async () => {
    // The cockpit settles the thread after a successful send (matches cockpit-live.js):
    // outbound answer + advanced read watermark -> WAITING_FOR_CUSTOMER (calm, not actionable).
    const settled = await call('POST', '/api/cockpit/conversation/' + conv + '/settle', { body: {} });
    assert.equal(settled.status, 200);
    const { data } = await call('GET', '/api/cockpit/today');
    assert.equal(data.counts.actionable, 0, 'answered conversation left Vandaag');
    assert.equal(data.headline.zero, true);
  });

  await t.test('08 Observation -> durable memory: confirm moves it to remembered', async () => {
    const c = await call('POST', '/api/cockpit/memory/' + mem + '/confirm', { body: {} });
    assert.equal(c.status, 200);
    const { data } = await call('GET', '/api/cockpit/relation/' + contact);
    assert.equal(data.observed.length, 0);
    assert.equal(data.remembered.length, 1, 'confirmed memory now durable in the dossier');
  });

  // ---- negative / fail-closed paths -----------------------------------------------------------
  await t.test('N1 unauthenticated -> 401', async () => {
    const { status } = await call('GET', '/api/cockpit/today', { authed: false });
    assert.equal(status, 401);
  });

  await t.test('N2 unknown relation -> 404', async () => {
    const { status } = await call('GET', '/api/cockpit/relation/00000000-0000-0000-0000-000000000000');
    assert.equal(status, 404);
  });

  await t.test('N3 consent OPTED_OUT blocks send; draft rolls back to draft', async () => {
    // fresh conversation + draft
    const c2 = (await query("insert into conversation(tenant_id,contact_id,channel,is_privacy,status,last_message_at,last_inbound_at) values ($1,$2,'EMAIL',false,'NEW', now(), now()) returning id", [tenantId, contact])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','jb@noorderlicht.coop','vraag','RECEIVED', now())", [tenantId, c2]);
    const dr = await call('POST', '/api/cockpit/conversation/' + c2 + '/draft', { body: {} });
    const did = dr.data.draft.id;
    await call('PATCH', '/api/cockpit/draft/' + did, { body: { body: 'Een concept met inhoud.' } });
    await setPreference(tenantId, contact, { channel: 'EMAIL', purpose: 'service', allowed: false });
    const s = await call('POST', '/api/cockpit/draft/' + did + '/send', { body: {} });
    assert.equal(s.status, 400);
    assert.equal(s.data.reason, 'consent_blocked');
    const d = (await query('select status from comm_draft where id=$1', [did])).rows[0];
    assert.equal(d.status, 'draft', 'rolled back so the user can retry');
    await setPreference(tenantId, contact, { channel: 'EMAIL', purpose: 'service', allowed: true }); // restore
  });

  await t.test('N4 non-email channel is refused, not faked', async () => {
    const wa = (await query("insert into comm_draft(tenant_id,conversation_id,contact_id,channel,body,status) values ($1,$2,$3,'WHATSAPP','hoi','draft') returning id", [tenantId, conv, contact])).rows[0].id;
    const s = await call('POST', '/api/cockpit/draft/' + wa + '/send', { body: {} });
    assert.equal(s.status, 400);
    assert.equal(s.data.error, 'kanaal_niet_beschikbaar');
  });

  await t.test('N5 empty draft body is refused', async () => {
    const empt = (await query("insert into comm_draft(tenant_id,conversation_id,contact_id,channel,body,status) values ($1,$2,$3,'EMAIL','','draft') returning id", [tenantId, conv, contact])).rows[0].id;
    const s = await call('POST', '/api/cockpit/draft/' + empt + '/send', { body: {} });
    assert.equal(s.status, 400);
    assert.equal(s.data.error, 'empty_body');
  });

  await t.test('N6 observation reject (dismiss) removes it without becoming memory', async () => {
    const m2 = (await query("insert into relationship_memory(tenant_id,contact_id,kind,content,source,confidence) values ($1,$2,'fact','Een zwakke gok.','ai','proposed') returning id", [tenantId, contact])).rows[0].id;
    const r = await call('DELETE', '/api/cockpit/memory/' + m2);
    assert.equal(r.status, 200);
    const { data } = await call('GET', '/api/cockpit/relation/' + contact);
    assert.ok(!data.observed.find((x) => x.id === m2), 'dismissed observation is gone');
    assert.ok(!data.remembered.find((x) => x.id === m2), 'and never became memory');
  });
});
