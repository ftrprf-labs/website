// Slice 1 — Phase B live acceptance: ONE controlled real e-mail via Resend.
//
// This proves the same vertical loop that Phase A proved with the mock transport, but through the
// REAL Resend transport, to EXACTLY ONE recipient that you designate. It drives the same
// human-in-the-loop cockpit path (/api/cockpit/*), the same consent gate, and the same audit trail.
//
// It is a STANDALONE script, deliberately NOT named *.test.mjs, so `node --test` never discovers it
// and it can never fire during a normal test run. It refuses to send unless every gate below is
// explicitly set, and it seeds exactly one relation so no other address can possibly be contacted.
//
// Run (all via the environment's secure config, never pasted in chat):
//   DATABASE_URL=...            Postgres for the Communication Layer
//   COMM_LAYER_ENABLED=1
//   MAIL_TRANSPORT=resend       real transport (anything else is refused here)
//   MAIL_API_KEY=...            Resend API key, from the environment secret store
//   COMM_MAILBOXES=hello@yourverifieddomain   sender; its domain MUST be verified in Resend
//   PHASE_B_TEST_EMAIL=you@example.com         the ONE recipient you designate (your own mailbox)
//   PHASE_B_APPROVE=I_APPROVE_REAL_SEND        explicit human approval to actually send
//   node scripts/phase-b-live-acceptance.mjs
//
// Preconditions that live OUTSIDE this script (report them, do not work around them):
//   1. Outbound egress to api.resend.com must be allowed by the environment's network policy.
//   2. The sender domain (COMM_MAILBOXES[0]) must be a verified domain in the Resend account.

import { Readable } from 'node:stream';

const need = (k) => { const v = process.env[k]; return v == null ? '' : String(v); };
const truthy = (v) => /^(1|true|yes|on)$/i.test(v || '');

function preflight() {
  const problems = [];
  if (!need('DATABASE_URL')) problems.push('DATABASE_URL is not set (no Communication Layer database).');
  if (!truthy(need('COMM_LAYER_ENABLED'))) problems.push('COMM_LAYER_ENABLED is not truthy.');
  if (need('MAIL_TRANSPORT').toLowerCase() !== 'resend') problems.push("MAIL_TRANSPORT must be 'resend' (this script never uses the mock).");
  if (!need('MAIL_API_KEY')) problems.push('MAIL_API_KEY is not set (Resend key must come from the secret store).');
  const to = need('PHASE_B_TEST_EMAIL');
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) problems.push('PHASE_B_TEST_EMAIL must be one valid address you designate.');
  if (need('PHASE_B_APPROVE') !== 'I_APPROVE_REAL_SEND') problems.push("PHASE_B_APPROVE must equal 'I_APPROVE_REAL_SEND' (explicit human approval before any real send).");
  return { problems, to };
}

async function call(handleCockpit, method, path, body = null) {
  const req = new Readable({ read() {} });
  Object.assign(req, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers: {} });
  if (body != null) req.push(Buffer.from(JSON.stringify(body)));
  req.push(null);
  return await new Promise((resolve) => {
    const res = { writeHead(s) { this._s = s; }, end(b) { resolve({ status: this._s, data: b ? JSON.parse(b) : null }); } };
    const u = new URL(path, 'http://x');
    handleCockpit(req, res, { pathname: u.pathname, method, isAuthed: () => true });
  });
}

const ok = (b) => (b ? 'PASS' : 'FAIL');
async function main() {
  const { problems, to } = preflight();
  if (problems.length) {
    console.log('\n=== PHASE B — NOT READY (nothing was sent) ===');
    for (const p of problems) console.log('  · ' + p);
    console.log('\nSet the missing items via the environment config and re-run. No e-mail was sent.\n');
    process.exit(2);
  }

  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');
  const { handleCockpit } = await import('../server/cockpit/routes.mjs');

  const tenantId = await getDefaultTenantId();

  // Exactly ONE controlled relation. Truncate first so no other recipient can exist in scope.
  await query('truncate message, conversation, contact, organization, ai_draft, relationship_memory, comm_draft, comm_draft_version, delivery_event, activity, audit_event cascade');
  const org = (await query("insert into organization(tenant_id,name) values ($1,'Maculis Testrelatie (Fase B)') returning id", [tenantId])).rows[0].id;
  const contact = (await query(
    "insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,role) values ($1,$2,$3,'Maculis','Testrelatie',$4,'Testcontact') returning id",
    [tenantId, org, to, to])).rows[0].id;
  await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL',$3,true)", [tenantId, contact, to]);
  await setPreference(tenantId, contact, { channel: 'EMAIL', purpose: 'service', allowed: true });
  const conv = (await query(
    "insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Fase B verificatie', now(), now()) returning id",
    [tenantId, contact, org])).rows[0].id;
  await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL',$3,'Fase B verificatie','Dit is de gecontroleerde testrelatie voor de eenmalige echte levering.','RECEIVED', now())", [tenantId, conv, to]);
  await query("insert into ai_draft(tenant_id,conversation_id,summary,intent,suggested_reply,status) values ($1,$2,'Testrelatie voor de eenmalige echte levering','schedule','Dit is een gecontroleerde Fase B testverzending vanuit Maculis. Als je dit ontvangt, sluit de volledige keten ook via de echte transportlaag.','proposed')", [tenantId, conv]);

  // Guard: only one contact, and no address other than the designated one exists in scope.
  const otherContacts = (await query('select count(*)::int n from contact where email is distinct from $1', [to])).rows[0].n;
  const otherIdents = (await query("select count(*)::int n from channel_identity where value is distinct from $1", [to])).rows[0].n;
  if (otherContacts !== 0 || otherIdents !== 0) {
    console.log('ABORT: scope is not a single controlled relation. Nothing sent.'); await closePool(); process.exit(3);
  }

  // ---- same human-in-the-loop flow as the cockpit UI ----
  const dr = await call(handleCockpit, 'POST', '/api/cockpit/conversation/' + conv + '/draft', {});
  const draftId = dr.data && dr.data.draft && dr.data.draft.id;
  await call(handleCockpit, 'PATCH', '/api/cockpit/draft/' + draftId, { body: 'Dit is een gecontroleerde Fase B testverzending vanuit Maculis. Menselijk goedgekeurd voor verzending.' });
  const sent = await call(handleCockpit, 'POST', '/api/cockpit/draft/' + draftId + '/send', {});
  await call(handleCockpit, 'POST', '/api/cockpit/conversation/' + conv + '/settle', {});

  // ---- evidence ----
  const out = (await query("select to_addresses, delivery, body_text, provider, provider_message_id from message where conversation_id=$1 and direction='OUTBOUND'", [conv])).rows;
  const de = (await query('select state, provider, provider_message_id from delivery_event order by at desc limit 1')).rows[0] || {};
  const convRow = (await query('select status from conversation where id=$1', [conv])).rows[0] || {};
  const draftRow = (await query('select status from comm_draft where id=$1', [draftId])).rows[0] || {};
  const audit = (await query("select count(*)::int n from audit_event where action='message_sent'")).rows[0].n;
  const allOutbound = (await query("select to_addresses from message where direction='OUTBOUND'")).rows;
  const onlyDesignated = allOutbound.length >= 1 && allOutbound.every(r => {
    const arr = Array.isArray(r.to_addresses) ? r.to_addresses : (r.to_addresses ? JSON.parse(r.to_addresses) : []);
    return arr.length === 1 && arr[0] === to;
  });
  const today = await call(handleCockpit, 'GET', '/api/cockpit/today');

  const sendOk = Boolean(sent.data && sent.data.ok);
  const live = sent.data && sent.data.providerMode === 'live';
  const outbound = out[0] || {};

  console.log('\n=============== PHASE B — LIVE DELIVERY EVIDENCE ===============');
  console.log(' 1. test relation + goal   : ' + org + ' / ' + contact + '  (doel: eenmalige echte levering)');
  console.log(' 2. concept before send    : draft ' + draftId + ' geopend uit AI-voorstel, menselijk bewerkt');
  console.log(' 3. human approval         : ' + ok(sendOk) + ' (send endpoint = expliciete goedkeuring)');
  console.log(' 4. consent check          : ' + ok(sendOk && !(sent.data.reason === 'consent_blocked')) + ' (EMAIL/service toegestaan)');
  console.log(' 5. Resend as transport    : ' + ok(live) + '  providerMode=' + (sent.data && sent.data.providerMode) + '  provider=' + (outbound.provider || de.provider));
  console.log(' 6. provider/delivery      : ' + ok(sendOk && outbound.delivery === 'SENT') + '  delivery=' + outbound.delivery + '  provider_message_id=' + (outbound.provider_message_id || de.provider_message_id || 'none'));
  console.log(' 7. received in mailbox     : MANUAL — controleer ' + to + ' (harness bewijst acceptatie door Resend, niet de inbox)');
  console.log(' 8. delivery-event/audit    : ' + ok(de.state === 'SENT' && audit === 1) + '  delivery_event.state=' + de.state + '  audit message_sent=' + audit);
  console.log('    timeline                : conversation.status=' + convRow.status + '  draft.status=' + draftRow.status);
  console.log(' 9. attention after send    : ' + ok(today.data && today.data.counts && today.data.counts.actionable === 0) + '  actionable=' + (today.data && today.data.counts && today.data.counts.actionable));
  console.log('10. no other recipient      : ' + ok(onlyDesignated) + '  outbound_count=' + allOutbound.length + '  only=' + to);
  console.log('===============================================================');

  const pass = sendOk && live && outbound.delivery === 'SENT' && de.state === 'SENT' && audit === 1
    && convRow.status === 'ANSWERED' && draftRow.status === 'sent'
    && today.data && today.data.counts && today.data.counts.actionable === 0 && onlyDesignated;
  console.log('\nPHASE B RESULT: ' + (pass ? 'PASS — the loop closes through the real transport.' : 'NOT PASS — see the FAIL lines above.'));
  if (!sendOk) console.log('send reason: ' + (sent.data && (sent.data.reason || sent.data.error)) + ' (a Resend domain/egress error surfaces here).');

  await closePool();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error('PHASE B ERROR:', e && e.message ? e.message : e); process.exit(1); });
