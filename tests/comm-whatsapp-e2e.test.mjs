// Communication Layer — WhatsApp full round-trip E2E (real DATABASE_URL, COMM_LAYER_ENABLED).
// Skipped without a DB. Exercises the REAL signature-authenticated webhook end to end:
//   signed inbound webhook -> shared pipeline (identity/threading/persist) -> AI copilot draft ->
//   human edit preserved -> consent gate -> approve+send (mock) -> delivery-status webhook advances
//   the outbound message SENT -> DELIVERED -> READ, forward-only (a late DELIVERED never downgrades
//   a READ). Consent + audit asserted. Proves WhatsApp is a true adapter on the one pipeline.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signMetaBody } from '../server/comm/providers/whatsapp-webhook.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — WhatsApp E2E skipped' };

const APP_SECRET = 'wa_e2e_app_secret';
const WA_FROM = '31612345678';         // Meta sends wa_id without a '+'
const PHONE_ID = '109999';

function inboundEnvelope(id, body) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: PHONE_ID, display_phone_number: '3120' },
      contacts: [{ wa_id: WA_FROM, profile: { name: 'Kim' } }],
      messages: [{ from: WA_FROM, id, timestamp: '1700000000', type: 'text', text: { body } }],
    } }] }],
  };
}
function statusEnvelope(providerMessageId, status) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: PHONE_ID },
      statuses: [{ id: providerMessageId, status, recipient_id: WA_FROM, timestamp: '1700000100' }],
    } }] }],
  };
}

test('WhatsApp round-trip: signed webhook -> AI draft -> approve+send -> delivery status', opts, async (t) => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { processWhatsAppWebhook } = await import('../server/comm/whatsapp-inbound.mjs');
  const { linkConversationToContact } = await import('../server/comm/channel-inbound.mjs');
  const drafts = await import('../server/comm/drafts.mjs');
  const { sendOnChannel } = await import('../server/comm/send.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');

  const post = (payload) => {
    const rawBody = JSON.stringify(payload);
    return processWhatsAppWebhook({
      headers: { 'x-hub-signature-256': signMetaBody({ appSecret: APP_SECRET, rawBody }) },
      rawBody, appSecret: APP_SECRET,
    });
  };

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, call_record, internal_note, relationship_memory cascade');
    const tenantId = await getDefaultTenantId();

    // --- 1) inbound via the REAL signed webhook -------------------------------------------------
    const r1 = await post(inboundEnvelope('wamid.IN1', 'Hoi, kunnen jullie ook naar onze planning kijken?'));
    assert.equal(r1.ok, true);
    assert.equal(r1.messages, 1, 'one inbound message stored');

    // A bad signature is rejected and stores nothing.
    const bad = await processWhatsAppWebhook({ headers: { 'x-hub-signature-256': 'sha256=bad' }, rawBody: JSON.stringify(inboundEnvelope('wamid.X', 'x')), appSecret: APP_SECRET });
    assert.equal(bad.ok, false);
    assert.equal(bad.status, 401);

    // Duplicate delivery of the same message id is idempotent (no second row).
    const dup = await post(inboundEnvelope('wamid.IN1', 'Hoi, kunnen jullie ook naar onze planning kijken?'));
    assert.equal(dup.duplicates, 1, 'duplicate inbound deduped on provider_message_id');
    const inCount = (await query("select count(*)::int n from message where direction='INBOUND' and channel='WHATSAPP'")).rows[0].n;
    assert.equal(inCount, 1, 'exactly one inbound persisted despite the retry');

    const conv = (await query("select id, contact_id from conversation where channel='WHATSAPP' order by created_at asc limit 1")).rows[0];
    assert.ok(conv, 'WhatsApp conversation created');
    assert.equal(conv.contact_id, null, 'unknown sender lands as UNKNOWN (never a silent wrong link)');

    // --- 2) AI copilot proposes a draft (unknown contact still gets a proposal) ------------------
    await t.test('wait for AI copilot proposal', async () => {
      for (let i = 0; i < 60; i++) { const r = await query('select id from ai_draft where conversation_id=$1', [conv.id]); if (r.rows[0]) return; await new Promise((s) => setTimeout(s, 25)); }
      assert.fail('no ai_draft produced for WhatsApp inbound');
    });

    // --- 3) link the unknown WhatsApp thread to a Contact, then draft + human edit ---------------
    const link = await linkConversationToContact({ tenantId, conversationId: conv.id, newContact: { first_name: 'Kim', last_name: 'de Vries', email: 'kim@oca.nl', mobile: WA_FROM } });
    assert.ok(link.ok, 'linked WhatsApp thread to a new contact');
    const contactId = link.contactId;
    // The link recorded the channel identity so future inbound auto-links.
    const ident = (await query("select contact_id from channel_identity where channel='WHATSAPP' and value=$1", [WA_FROM])).rows[0];
    assert.equal(ident.contact_id, contactId, 'channel identity recorded for auto-link');

    const opened = await drafts.openDraft({ tenantId, conversationId: conv.id, channel: 'WHATSAPP' });
    assert.ok(opened.ok && opened.draft.body.length > 0, 'draft seeded from AI');
    const draftId = opened.draft.id;
    const HUMAN = ' Mijn eigen zin die bewaard moet blijven.';
    await drafts.humanEdit({ draftId, body: opened.draft.body + HUMAN });
    const afterAi = await drafts.chat({ draftId, message: 'Voeg toe dat ik dinsdag kan bellen.', tenantId });
    assert.ok(afterAi.draft.body.includes('eigen zin die bewaard moet blijven'), 'human edit preserved across AI revise');

    // --- 4) consent gate: WhatsApp blocked without opt-in, allowed after ------------------------
    const blocked = await sendOnChannel({ tenantId, conversationId: conv.id, contactId, channel: 'WHATSAPP', text: 'Hoi Kim!', purpose: 'service', draftId });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, 'consent_blocked', 'no opt-in => fail-closed');
    await setPreference(tenantId, contactId, { channel: 'WHATSAPP', purpose: 'service', allowed: true, source: 'manual' });

    // --- 5) approve + send via the mock adapter (the only outbound step) -------------------------
    const finalBody = (await drafts.getDraftState(draftId)).draft.body;
    const sent = await sendOnChannel({ tenantId, conversationId: conv.id, contactId, channel: 'WHATSAPP', text: finalBody, purpose: 'service', draftId });
    assert.ok(sent.ok, 'WhatsApp sent via mock after opt-in');
    assert.equal(sent.providerMode, 'mock', 'mock adapter (no Meta credentials)');
    const outMsg = (await query("select id, provider_message_id, delivery from message where id=$1", [sent.messageId])).rows[0];
    assert.equal(outMsg.delivery, 'SENT', 'outbound starts at SENT');
    const pmid = outMsg.provider_message_id;
    assert.ok(pmid, 'outbound carries a provider_message_id for receipt matching');
    const auditN = (await query("select count(*)::int n from audit_event where action='message_sent' and entity_id=$1", [conv.id])).rows[0].n;
    assert.ok(auditN >= 1, 'send audited (human approval)');

    // --- 6) delivery-status webhooks advance the message, forward-only ---------------------------
    await post(statusEnvelope(pmid, 'delivered'));
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'DELIVERED', 'advanced to DELIVERED');
    await post(statusEnvelope(pmid, 'read'));
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'READ', 'advanced to READ');
    // A late/duplicate 'delivered' arriving AFTER 'read' must NOT downgrade the state.
    await post(statusEnvelope(pmid, 'delivered'));
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'READ', 'late DELIVERED did not downgrade READ');

    // Every receipt is appended to the audit-grade delivery_event log.
    const events = (await query("select state from delivery_event where message_id=$1 order by at asc", [sent.messageId])).rows.map((r) => r.state);
    assert.deepEqual(events, ['SENT', 'DELIVERED', 'READ', 'DELIVERED'], 'append-only receipt log preserved');

    // --- 7) a status for an unknown provider_message_id is a safe no-op -------------------------
    const noop = await post(statusEnvelope('wamid.UNKNOWN', 'delivered'));
    assert.equal(noop.ok, true, 'unknown receipt does not error the webhook');
  } finally {
    await closePool();
  }
});
