// Future Cockpit — Slice 3: real Relaties + Gesprekken overviews from the Comm Layer.
//
// The nav no longer shows empty placeholders: Relaties and Gesprekken are real, searchable lists
// over the SAME database as Vandaag and the dossier, wrapping the existing listRelationships and
// inbox services. Privacy conversations are never surfaced here. Skipped without DATABASE_URL.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Slice 3 E2E skipped' };

async function call(method, path, { authed = true } = {}) {
  const { handleCockpit } = await import('../server/cockpit/routes.mjs');
  const req = new Readable({ read() {} });
  Object.assign(req, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: {} });
  req.push(null);
  return await new Promise((resolve) => {
    const res = { writeHead(s) { this._s = s; }, end(b) { resolve({ status: this._s, data: b ? JSON.parse(b) : null }); } };
    const u = new URL(path, 'http://x');
    handleCockpit(req, res, { pathname: u.pathname, method, isAuthed: () => authed });
  });
}

test('Slice 3 — Relaties + Gesprekken overviews (real data)', opts, async (t) => {
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');

  await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event, follow_up cascade');
  const tenantId = await getDefaultTenantId();
  const org = (await query("insert into organization(tenant_id,name,primary_domain) values ($1,'Coöperatie Noorderlicht','noorderlicht.coop') returning id", [tenantId])).rows[0].id;
  const c1 = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'jb@noorderlicht.coop','Jean-Baptiste','Vandenberghe','jb@noorderlicht.coop') returning id", [tenantId, org])).rows[0].id;
  const c2 = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'kim@debrug.be','Kim','De Vos','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;
  // conv1: inbound + an AI proposal (ai_ready). conv2: inbound only.
  const conv1 = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Re: de tweede sessie', now(), now()) returning id", [tenantId, c1, org])).rows[0].id;
  await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','jb@noorderlicht.coop','Zou de tweede sessie deze maand kunnen?','RECEIVED', now())", [tenantId, conv1]);
  await query("insert into ai_draft(tenant_id,conversation_id,summary,intent,suggested_reply,status) values ($1,$2,'Vraagt om de tweede sessie','meeting','Dag Jean-Baptiste, deze maand kan.','proposed')", [tenantId, conv1]);
  const conv2 = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag', now(), now()) returning id", [tenantId, c2, org])).rows[0].id;
  await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@debrug.be','Een korte vraag.','RECEIVED', now())", [tenantId, conv2]);
  // a PRIVACY conversation that must NEVER appear in the cockpit overview
  const cp = (await query("insert into conversation(tenant_id,contact_id,channel,is_privacy,status,subject,last_message_at) values ($1,$2,'EMAIL',true,'NEW','AVG-verzoek', now()) returning id", [tenantId, c2])).rows[0].id;
  await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@debrug.be','Privacyverzoek.','RECEIVED', now())", [tenantId, cp]);

  await t.test('01 Relaties: real, searchable list from the Comm Layer', async () => {
    const { status, data } = await call('GET', '/api/cockpit/relations');
    assert.equal(status, 200);
    assert.equal(data.count, 2);
    const names = data.relations.map((r) => r.name).sort();
    assert.deepEqual(names, ['Jean-Baptiste Vandenberghe', 'Kim De Vos']);
    const jb = data.relations.find((r) => r.name.startsWith('Jean'));
    assert.equal(jb.org, 'Coöperatie Noorderlicht');
    assert.ok(jb.openConversations >= 1, 'open conversation count is real');
  });

  await t.test('02 Relaties: search narrows by name/org', async () => {
    const { data } = await call('GET', '/api/cockpit/relations?q=' + encodeURIComponent('debrug'));
    assert.equal(data.count, 1);
    assert.equal(data.relations[0].name, 'Kim De Vos');
  });

  await t.test('03 Gesprekken: real list, ai_ready + waiting flags, privacy excluded', async () => {
    const { status, data } = await call('GET', '/api/cockpit/conversations');
    assert.equal(status, 200);
    assert.equal(data.count, 2, 'the privacy conversation is not surfaced');
    assert.ok(!data.conversations.find((c) => c.subject === 'AVG-verzoek'), 'privacy stays out');
    const withProposal = data.conversations.find((c) => c.conversationId === conv1);
    assert.equal(withProposal.hasPrepared, true, 'ai proposal -> concept klaar');
    assert.equal(withProposal.waitingOnUs, true, 'inbound + open -> wacht op jou');
    assert.ok(withProposal.who === 'Jean-Baptiste Vandenberghe' && withProposal.channel === 'EMAIL');
    const without = data.conversations.find((c) => c.conversationId === conv2);
    assert.equal(without.hasPrepared, false);
  });

  await t.test('N1 both overviews require auth', async () => {
    assert.equal((await call('GET', '/api/cockpit/relations', { authed: false })).status, 401);
    assert.equal((await call('GET', '/api/cockpit/conversations', { authed: false })).status, 401);
  });
});
