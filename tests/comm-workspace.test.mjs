// Communication Layer — Relationship Workspace + AI-first composer + omnichannel E2E.
// Runs only with a real DATABASE_URL (COMM_LAYER_ENABLED). Skipped otherwise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../server/comm/webhook.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — workspace E2E skipped' };

test('Relationship Workspace + AI-first composer + omnichannel', opts, async (t) => {
  process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('ws-test-secret').toString('base64'));
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { processInbound } = await import('../server/comm/inbound.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { config } = await import('../server/config.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const rel = await import('../server/comm/relationship.mjs');
  const drafts = await import('../server/comm/drafts.mjs');
  const { sendOnChannel } = await import('../server/comm/send.mjs');
  const { channelAllowed, setPreference } = await import('../server/comm/consent.mjs');
  const { receiveChannelInbound, linkConversationToContact } = await import('../server/comm/channel-inbound.mjs');
  const inbox = await import('../server/comm/inbox.mjs');
  const followups = await import('../server/comm/followups.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, call_record, internal_note cascade');
    const tenantId = await getDefaultTenantId();
    const secret = config.resendWebhookSecret;

    // --- 1) inbound e-mail creates the relationship + an AI copilot proposal --------------------
    const mk = (data, id) => { const rawBody = JSON.stringify({ type: 'email.received', data }); return { headers: signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret }), rawBody }; };
    const emailFetch = (mid, text) => async () => ({ id: 'e', from: 'Kim de Vries <kim@oca.nl>', to: ['hello@maculis.nl'], cc: [], subject: 'Kunnen jullie ook naar onze planning kijken?', text, html: `<p>${text}</p>`, headers: { message_id: mid, in_reply_to: null, references: [] }, attachments: [] });
    const inb = await processInbound({ ...mk({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Kunnen jullie ook naar onze planning kijken?' }, 'w1'), fetchEmail: emailFetch('<c1@oca.nl>', 'Hoi, kunnen jullie ook naar onze planning kijken? Graag samen de mogelijkheden doornemen.') });
    assert.equal(inb.stored, true, 'inbound stored');
    const contactId = inb.contactId;
    assert.ok(contactId, 'contact resolved from inbound');
    // copilot runs fire-and-forget; wait for the ai_draft.
    await t.test('wait for AI copilot proposal', async () => {
      for (let i = 0; i < 40; i++) { const r = await query("select id from ai_draft where conversation_id=$1", [inb.conversationId]); if (r.rows[0]) return; await new Promise((s) => setTimeout(s, 25)); }
      assert.fail('no ai_draft produced');
    });

    // --- 2) aggregated relationship view --------------------------------------------------------
    const relationship = await rel.getRelationship(tenantId, { contactId });
    assert.equal(relationship.contact.email, 'kim@oca.nl');
    assert.ok(relationship.conversations.length >= 1, 'has a conversation');
    assert.ok(relationship.consent.EMAIL.allowed, 'email allowed by default');

    // --- 3) AI-first draft: open -> chat revise -> HUMAN edit -> chat revise preserves edit ------
    const opened = await drafts.openDraft({ tenantId, conversationId: inb.conversationId });
    assert.ok(opened.ok && opened.draft.body.length > 0, 'draft seeded from AI');
    const draftId = opened.draft.id;

    const warmed = await drafts.chat({ draftId, message: 'Maak dit warmer en korter.', tenantId });
    assert.ok(warmed.draft.body.includes('Wat goed om van je te horen'), 'AI applied "warmer"');

    // Human edits one sentence directly on the SAME draft.
    const HUMAN = ' Dit is mijn eigen zin die bewaard moet blijven.';
    const edited = await drafts.humanEdit({ draftId, body: warmed.draft.body + HUMAN });
    assert.equal(edited.draft.human_edited, true, 'marked human_edited');

    // A subsequent AI instruction must NOT wipe the human sentence (HARD RULE).
    const added = await drafts.chat({ draftId, message: 'Voeg toe dat ik dinsdag kan bellen.', tenantId });
    assert.ok(added.draft.body.includes('eigen zin die bewaard moet blijven'), 'human edit preserved after AI revise');
    assert.ok(/dinsdag/i.test(added.draft.body), 'AI instruction applied');
    assert.ok(added.versions.length >= 3, 'version history retained');

    // A QUESTION does not change the draft.
    const before = (await drafts.getDraftState(draftId)).draft.body;
    const explained = await drafts.chat({ draftId, message: 'Waarom stel je dit voor?', tenantId });
    assert.equal(explained.kind, 'explain');
    assert.equal((await drafts.getDraftState(draftId)).draft.body, before, 'question left the draft unchanged');

    // --- 4) approve + send (the only outbound step) ---------------------------------------------
    const finalBody = (await drafts.getDraftState(draftId)).draft.body;
    const sent = await sendOnChannel({ tenantId, conversationId: inb.conversationId, channel: 'EMAIL', text: finalBody, draftId, purpose: 'service' });
    assert.ok(sent.ok, 'email sent (mock transport)');
    const sentMsg = (await query("select delivery, direction, channel from message where id=$1", [sent.messageId])).rows[0];
    assert.equal(sentMsg.direction, 'OUTBOUND');
    const de = (await query('select state from delivery_event where message_id=$1', [sent.messageId])).rows[0];
    assert.equal(de.state, 'SENT', 'delivery event recorded');
    const audit = (await query("select count(*)::int n from audit_event where action='message_sent' and entity_id=$1", [sent.conversationId])).rows[0];
    assert.ok(audit.n >= 1, 'send audited with human approval');
    assert.equal((await drafts.getDraftState(draftId)).draft.status, 'sent', 'draft marked sent');

    // --- 5) omnichannel: WhatsApp inbound (unknown) -> link -> consent gate -> send --------------
    const wa = await receiveChannelInbound({ tenantId, channel: 'WHATSAPP', from: '+31612345678', to: 'maculis', text: 'Hoi, dit is Kim via WhatsApp' });
    assert.ok(wa.ok && wa.unknown, 'WhatsApp inbound landed as UNKNOWN contact');
    const link = await linkConversationToContact({ tenantId, conversationId: wa.conversationId, contactId });
    assert.ok(link.ok, 'linked unknown WhatsApp to contact');

    const waBlocked = await sendOnChannel({ tenantId, contactId, channel: 'WHATSAPP', text: 'Hoi Kim!', purpose: 'service' });
    assert.equal(waBlocked.ok, false, 'WhatsApp blocked without opt-in');
    assert.equal(waBlocked.reason, 'consent_blocked');
    await setPreference(tenantId, contactId, { channel: 'WHATSAPP', purpose: 'service', allowed: true, source: 'manual' });
    const waOk = await sendOnChannel({ tenantId, contactId, channel: 'WHATSAPP', text: 'Hoi Kim!', purpose: 'service' });
    assert.ok(waOk.ok, 'WhatsApp allowed after opt-in');
    assert.equal(waOk.providerMode, 'mock', 'WhatsApp via mock adapter (no credentials)');

    // SMS still requires opt-in -> blocked (independent per channel).
    const smsBlocked = await channelAllowed(tenantId, contactId, 'SMS', 'service');
    assert.equal(smsBlocked.allowed, false, 'SMS independently blocked');

    // --- 6) Inbox attention + follow-ups --------------------------------------------------------
    await followups.createFollowUp(tenantId, { contactId, conversationId: inb.conversationId, title: 'Dinsdag terugbellen', channelHint: 'PHONE' });
    const fu = await followups.listFollowUps(tenantId, { contactId });
    assert.ok(fu.some((f) => f.title === 'Dinsdag terugbellen'), 'follow-up created');
    const summary = await inbox.inboxSummary(tenantId);
    assert.ok(typeof summary.follow_up_due === 'number', 'inbox summary computed');
    const list = await inbox.inboxConversations(tenantId, { box: 'communication' });
    assert.ok(list.length >= 1, 'inbox lists conversations with attention tags');
    assert.ok(list.every((c) => Array.isArray(c.attention)), 'each conversation carries attention tags');
  } finally {
    await closePool();
  }
});
