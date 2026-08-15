// Communication Layer — SMS full round-trip E2E (real DATABASE_URL, COMM_LAYER_ENABLED).
// Skipped without a DB. Proves SMS is a true adapter on the ONE pipeline: a signed Twilio inbound
// creates the same conversation/message/AI-draft flow as e-mail and WhatsApp, and Twilio status
// callbacks advance the outbound message forward-only. Same identity/threading/consent/audit code.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signTwilioRequest } from '../server/comm/providers/sms-webhook.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — SMS E2E skipped' };

const TOKEN = 'sms_e2e_auth_token';
const URL = 'https://www.maculis.nl/api/comm/inbound/sms';
const FROM = '+31612345678';

test('SMS round-trip: signed Twilio webhook -> AI draft -> approve+send -> delivery status', opts, async (t) => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { processSmsWebhook } = await import('../server/comm/sms-inbound.mjs');
  const { linkConversationToContact } = await import('../server/comm/channel-inbound.mjs');
  const drafts = await import('../server/comm/drafts.mjs');
  const { sendOnChannel } = await import('../server/comm/send.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');

  const post = (params) => {
    const rawBody = new URLSearchParams(params).toString();
    const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
    return processSmsWebhook({ url: URL, headers: { 'x-twilio-signature': sig }, rawBody, authToken: TOKEN });
  };

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, call_record, internal_note, relationship_memory cascade');
    const tenantId = await getDefaultTenantId();

    // --- 1) inbound via the REAL signed Twilio webhook ------------------------------------------
    const r1 = await post({ From: FROM, To: '+3120', Body: 'Hoi, kunnen we telefonisch overleggen?', MessageSid: 'SMIN1' });
    assert.equal(r1.ok, true);
    assert.equal(r1.messages, 1, 'one inbound SMS stored');

    // bad signature stores nothing
    const bad = await processSmsWebhook({ url: URL, headers: { 'x-twilio-signature': 'nope' }, rawBody: 'From=%2B316&Body=x&MessageSid=SMX', authToken: TOKEN });
    assert.equal(bad.ok, false);
    assert.equal(bad.status, 403);

    // duplicate inbound deduped on MessageSid
    const dup = await post({ From: FROM, To: '+3120', Body: 'Hoi, kunnen we telefonisch overleggen?', MessageSid: 'SMIN1' });
    assert.equal(dup.duplicates, 1, 'duplicate SMS deduped');
    const inCount = (await query("select count(*)::int n from message where direction='INBOUND' and channel='SMS'")).rows[0].n;
    assert.equal(inCount, 1);

    const conv = (await query("select id, contact_id from conversation where channel='SMS' order by created_at asc limit 1")).rows[0];
    assert.ok(conv, 'SMS conversation created');
    assert.equal(conv.contact_id, null, 'unknown sender lands as UNKNOWN');

    // --- 2) AI copilot proposes a draft ---------------------------------------------------------
    await t.test('wait for AI copilot proposal', async () => {
      for (let i = 0; i < 60; i++) { const r = await query('select id from ai_draft where conversation_id=$1', [conv.id]); if (r.rows[0]) return; await new Promise((s) => setTimeout(s, 25)); }
      assert.fail('no ai_draft produced for SMS inbound');
    });

    // --- 3) link -> consent gate -> approve+send via mock --------------------------------------
    const link = await linkConversationToContact({ tenantId, conversationId: conv.id, newContact: { first_name: 'Kim', last_name: 'de Vries', mobile: FROM } });
    assert.ok(link.ok);
    const contactId = link.contactId;
    // future inbound from this number auto-links (identity stored under the normalized value)
    const ident = (await query("select value from channel_identity where channel='SMS' and contact_id=$1", [contactId])).rows[0];
    assert.ok(ident, 'SMS channel identity recorded for auto-link');

    const opened = await drafts.openDraft({ tenantId, conversationId: conv.id, channel: 'SMS' });
    const draftId = opened.draft.id;

    const blocked = await sendOnChannel({ tenantId, conversationId: conv.id, contactId, channel: 'SMS', text: 'Hoi Kim!', purpose: 'service', draftId });
    assert.equal(blocked.reason, 'consent_blocked', 'SMS fail-closed without opt-in');
    await setPreference(tenantId, contactId, { channel: 'SMS', purpose: 'service', allowed: true, source: 'manual' });

    const sent = await sendOnChannel({ tenantId, conversationId: conv.id, contactId, channel: 'SMS', text: 'Hoi Kim, prima!', purpose: 'service', draftId });
    assert.ok(sent.ok, 'SMS sent via mock after opt-in');
    assert.equal(sent.providerMode, 'mock');
    const outMsg = (await query('select id, provider_message_id, delivery from message where id=$1', [sent.messageId])).rows[0];
    const pmid = outMsg.provider_message_id;
    assert.ok(pmid);

    // --- 4) Twilio status callbacks advance the message forward-only ---------------------------
    await post({ MessageSid: pmid, MessageStatus: 'sent' });
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'SENT');
    await post({ MessageSid: pmid, MessageStatus: 'delivered' });
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'DELIVERED');
    // an undelivered arriving later is a negative terminal state and DOES apply
    // (use a fresh message to avoid ambiguity): here assert a late 'sent' does not downgrade DELIVERED
    await post({ MessageSid: pmid, MessageStatus: 'sent' });
    assert.equal((await query('select delivery from message where id=$1', [sent.messageId])).rows[0].delivery, 'DELIVERED', 'late SENT did not downgrade DELIVERED');

    // unknown receipt is a safe no-op
    const noop = await post({ MessageSid: 'SM_UNKNOWN', MessageStatus: 'delivered' });
    assert.equal(noop.ok, true);
  } finally {
    await closePool();
  }
});
