// Cockpit — antwoorden op het kanaal van het gesprek (Production GO correctie A).
//
// De verzendroute van de Cockpit had EMAIL hardgecodeerd: een gesprek dat in Mijn Maculis begon,
// kon vanuit de Cockpit niet beantwoord worden. Dat brak de keten precies bij de menselijke stap.
// Deze test drijft de ECHTE /api/cockpit/* handler tegen een ECHTE database en bewijst:
//
//   1. een concept op een Mijn Maculis-gesprek opent op MIJN_MACULIS, niet op EMAIL;
//   2. dat concept kan verzonden worden, en het bericht landt op het juiste kanaal;
//   3. een kanaal dat alleen als mock bestaat wordt nog steeds geweigerd, niet gefingeerd.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Cockpit-antwoordtest overgeslagen' };

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

test('de Cockpit beantwoordt een Mijn Maculis-gesprek op zijn eigen kanaal', opts, async (t) => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, comm_draft, mailbox cascade');
    const tenantId = await getDefaultTenantId();
    const org = (await query("insert into organization(tenant_id,name) values ($1,'Coöperatie Voorbeeld') returning id", [tenantId])).rows[0].id;
    const contact = (await query(
      "insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'anke@voorbeeld.nl','Anke','Voorbeeld','anke@voorbeeld.nl') returning id",
      [tenantId, org])).rows[0].id;
    const conv = (await query(
      `insert into conversation(tenant_id, organization_id, contact_id, subject, status, channel, is_privacy, last_message_at)
       values ($1,$2,$3,'Waar baseren jullie dit op?','NEW','MIJN_MACULIS',false, now()) returning id`,
      [tenantId, org, contact])).rows[0].id;
    await query(
      `insert into message(tenant_id, conversation_id, direction, channel, body_text)
       values ($1,$2,'INBOUND','MIJN_MACULIS','Waar baseren jullie dit precies op?')`, [tenantId, conv]);

    await t.test('het concept opent op MIJN_MACULIS en niet op EMAIL', async () => {
      const r = await call('POST', `/api/cockpit/conversation/${conv}/draft`, { body: {} });
      assert.equal(r.status, 200);
      assert.equal(r.data.draft.channel, 'MIJN_MACULIS', 'het kanaal komt van het gesprek');
    });

    await t.test('het antwoord gaat weg op datzelfde kanaal', async () => {
      const d = (await query("select id from comm_draft where conversation_id=$1 and status='draft'", [conv])).rows[0];
      await call('PATCH', `/api/cockpit/draft/${d.id}`, { body: { body: 'Daar baseren we dit op.' } });
      const s = await call('POST', `/api/cockpit/draft/${d.id}/send`, { body: {} });
      assert.equal(s.status, 200, 'de verzending wordt niet meer geweigerd');
      assert.equal(s.data.ok, true);
      const out = (await query(
        "select channel, delivery from message where conversation_id=$1 and direction='OUTBOUND'", [conv])).rows;
      assert.equal(out.length, 1, 'precies één uitgaand bericht');
      assert.equal(out[0].channel, 'MIJN_MACULIS', 'op het kanaal van het gesprek');
      assert.equal(out[0].delivery, 'DELIVERED', 'opslag ís aflevering in de eigen omgeving van de klant');
    });

    await t.test('een kanaal dat alleen als mock bestaat blijft geweigerd', async () => {
      const wa = (await query(
        "insert into comm_draft(tenant_id,conversation_id,contact_id,channel,body,status) values ($1,$2,$3,'WHATSAPP','hoi','draft') returning id",
        [tenantId, conv, contact])).rows[0].id;
      const s = await call('POST', `/api/cockpit/draft/${wa}/send`, { body: {} });
      assert.equal(s.status, 400);
      assert.equal(s.data.error, 'kanaal_niet_beschikbaar', 'geweigerd, niet gefingeerd');
    });
  } finally {
    await closePool();
  }
});
