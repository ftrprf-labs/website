// Regression: the FAILED/repeating-draft incident on the staging preview.
//
// Root cause: Render runs the node service with NODE_ENV=production, and the EMAIL mock refused to
// stand in during production (a guard meant for a MISSING transport). With an EXPLICIT
// MAIL_TRANSPORT=mock, every cockpit send returned email_transport_not_configured -> a FAILED
// outbound was persisted (§41) and the draft rolled back, so retries stacked up.
//
// Fix: an EXPLICIT mock never contacts a provider, so it is honoured everywhere (incl. production);
// a MISSING/blank transport still fails loud in production. These tests lock both behaviours in.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');

test('EMAIL transport: explicit mock is honoured; missing transport fails loud in production', async () => {
  const { config } = await import('../server/config.mjs');
  const { emailProvider } = await import('../server/comm/providers/email.mjs');
  const saved = { production: config.production, mailTransport: config.mailTransport, mailApiKey: config.mailApiKey };
  try {
    // A) production + EXPLICIT mock -> deterministic offline SENT, nothing leaves the building.
    config.production = true; config.mailTransport = 'mock'; config.mailApiKey = '';
    let p = emailProvider();
    assert.equal(p.mode, 'mock', 'explicit mock reports mock mode');
    let r = await p.send({ from: 'hello@maculis.nl', to: 'jij@example.com', subject: 's', text: 'x' });
    assert.equal(r.ok, true); assert.equal(r.delivery, 'SENT'); assert.equal(r.mock, true);

    // B) production + MISSING transport -> STILL fails loud (the safety guard is preserved).
    config.mailTransport = '';
    r = await emailProvider().send({ from: 'hello@maculis.nl', to: 'jij@example.com', subject: 's', text: 'x' });
    assert.equal(r.ok, false); assert.equal(r.reason, 'email_transport_not_configured');

    // C) production + resend + key -> the LIVE provider, never a fake mock.
    config.mailTransport = 'resend'; config.mailApiKey = 'key_x';
    p = emailProvider();
    assert.equal(p.mode, 'live'); assert.equal(p.name, 'resend');
  } finally {
    Object.assign(config, saved);
  }
});

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

test('cockpit send in production+mock: one action, exactly one SENT, no FAILED accumulation',
  { skip: HAS_DB ? false : 'no DATABASE_URL — cockpit send regression skipped' }, async (t) => {
    const { query } = await import('../server/comm/db.mjs');
    const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
    const { config } = await import('../server/config.mjs');
    const saved = { production: config.production, mailTransport: config.mailTransport, mailApiKey: config.mailApiKey };
    config.production = true; config.mailTransport = 'mock'; config.mailApiKey = ''; // reproduce the preview
    try {
      await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event cascade');
      const tenantId = await getDefaultTenantId();
      const org = (await query("insert into organization(tenant_id,name) values ($1,'Testrelatie') returning id", [tenantId])).rows[0].id;
      const contact = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'t@x.nl','Test','Persoon','t@x.nl') returning id", [tenantId, org])).rows[0].id;
      await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL','t@x.nl',true)", [tenantId, contact]);
      const conv = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag', now(), now()) returning id", [tenantId, contact, org])).rows[0].id;
      await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','t@x.nl','Hoi','RECEIVED', now())", [tenantId, conv]);

      const dr = await call('POST', '/api/cockpit/conversation/' + conv + '/draft', { body: {} });
      const draftId = dr.data.draft.id;
      await call('PATCH', '/api/cockpit/draft/' + draftId, { body: { body: 'Een antwoord.' } });

      await t.test('the send succeeds (mock) and closes the loop once', async () => {
        const s = await call('POST', '/api/cockpit/draft/' + draftId + '/send', { body: {} });
        assert.equal(s.status, 200);
        assert.equal(s.data.ok, true, 'production + explicit mock now SUCCEEDS instead of FAILED');
        assert.equal(s.data.providerMode, 'mock');
        const out = (await query("select count(*)::int n, min(delivery) d from message where conversation_id=$1 and direction='OUTBOUND'", [conv])).rows[0];
        assert.equal(out.n, 1, 'exactly one outbound message');
        assert.equal(out.d, 'SENT', 'and it is SENT, not FAILED');
        assert.equal((await query('select status from conversation where id=$1', [conv])).rows[0].status, 'ANSWERED');
        assert.equal((await query('select status from comm_draft where id=$1', [draftId])).rows[0].status, 'sent');
      });

      await t.test('a second send of the same draft is refused (no accumulation)', async () => {
        const s2 = await call('POST', '/api/cockpit/draft/' + draftId + '/send', { body: {} });
        assert.equal(s2.status, 400);
        assert.equal(s2.data.error, 'already_sent');
        const n = (await query("select count(*)::int n from message where conversation_id=$1 and direction='OUTBOUND'", [conv])).rows[0].n;
        assert.equal(n, 1, 'still exactly one outbound — the second action created no new message');
      });
    } finally {
      Object.assign(config, saved);
    }
  });
