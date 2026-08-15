// Communication Layer — AI acceptance: an inbound e-mail must AUTOMATICALLY get a usable proposal
// (no manual button), context-aware (confirmed Relationship Memory), then the human edits, approves
// and sends; the outbound lands in the SAME conversation; the customer's reply threads back and AI
// can propose the next step with the updated context. AI never auto-sends. Channel is metadata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../server/comm/webhook.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — AI acceptance E2E skipped' };

test('inbound e-mail: automatic AI proposal, human approves+sends, reply threads, AI re-proposes', opts, async () => {
  process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('ai-accept-secret').toString('base64'));
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { processInbound } = await import('../server/comm/inbound.mjs');
  const { migrateInvitations } = await import('../server/comm/repo.mjs');
  const { getRelationship } = await import('../server/comm/relationship.mjs');
  const { addMemory } = await import('../server/comm/memory.mjs');
  const { buildRelationshipContext, renderContextForModel } = await import('../server/comm/ai/context.mjs');
  const drafts = await import('../server/comm/drafts.mjs');
  const ai = await import('../server/comm/ai/service.mjs');
  const { sendOnChannel } = await import('../server/comm/send.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { config } = await import('../server/config.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const secret = config.resendWebhookSecret;
  await runMigrations({ silent: true });
  const tenantId = await getDefaultTenantId();

  const waitDraft = async (convId) => { for (let i = 0; i < 80; i++) { const r = await query("select id, suggested_reply, summary, intent from ai_draft where conversation_id=$1 and status='proposed' order by created_at desc limit 1", [convId]); if (r.rows[0]) return r.rows[0]; await new Promise((s) => setTimeout(s, 25)); } return null; };

  try {
    await query('truncate message, conversation, contact, organization, invitation, mailbox, webhook_event, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, relationship_memory cascade');
    await migrateInvitations([{ id: 'inv-oca', email: 'kim@oca.nl', first_name: 'Kim', last_name: 'de Vries', company_name: 'OCA', domain: 'oca.nl', campaign: 'MACULIS_FIRST_FIVE', status: 'SENT' }], tenantId);
    const known = (await query("select id from contact where email='kim@oca.nl'")).rows[0];
    // A CONFIRMED memory that AI should carry into context.
    await addMemory(tenantId, { contactId: known.id, kind: 'preference', content: 'Voorkeur voor telefonisch contact.', source: 'human' });

    const hook = (data, id) => { const rawBody = JSON.stringify({ type: 'email.received', data }); return { headers: signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret }), rawBody }; };
    const body = (over) => async () => ({ id: over.id, from: over.from || 'Kim <kim@oca.nl>', to: ['hello@maculis.nl'], cc: [], subject: over.subject ?? 'Kunnen we de planning doornemen?', text: over.text, html: '', headers: { message_id: over.mid, in_reply_to: over.inReplyTo || null, references: over.references || [] }, attachments: [] });

    // --- inbound -> AUTOMATIC proposal (no manual runCopilot call) ------------------------------
    const in1 = await processInbound({ ...hook({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Kunnen we de planning doornemen?' }, 'a1'), fetchEmail: body({ id: 'e1', mid: '<a1@oca.nl>', text: 'Hoi, kunnen we de planning samen doornemen en de mogelijkheden bespreken?' }) });
    assert.equal(in1.stored, true);
    const auto = await waitDraft(in1.conversationId);
    assert.ok(auto && auto.suggested_reply, 'AI produced an automatic proposal on inbound (no button)');
    assert.ok(auto.summary, 'proposal carries a factual summary (AI interpretation, labelled)');

    // Context the AI used includes the CONFIRMED memory (relationship-aware, not a dump).
    const ctx = await buildRelationshipContext(tenantId, { conversationId: in1.conversationId });
    assert.ok(ctx.memory.some((m) => /telefonisch/i.test(m.content)), 'confirmed memory is in the AI context');
    assert.match(renderContextForModel(ctx), /telefonisch/i, 'memory rendered into the model prompt');

    // --- employee opens the conversation: composer seeds from the proposal ---------------------
    const opened = await drafts.openDraft({ tenantId, conversationId: in1.conversationId });
    assert.ok(opened.ok && opened.draft.body.length > 0, 'composer seeded from the AI proposal');
    const draftId = opened.draft.id;

    // --- human optimises via the SAME composer (edit + AI chat), edit preserved ----------------
    const edited = await drafts.humanEdit({ draftId, body: opened.draft.body + ' Ik bel je maandag even.' });
    assert.equal(edited.draft.human_edited, true);
    const warmed = await drafts.chat({ draftId, message: 'Maak dit warmer.', tenantId });
    assert.ok(/maandag/i.test(warmed.draft.body), 'human edit preserved through AI revise');

    // --- approve + send: outbound lands in the SAME conversation --------------------------------
    const finalBody = (await drafts.getDraftState(draftId)).draft.body;
    const sent = await sendOnChannel({ tenantId, conversationId: in1.conversationId, channel: 'EMAIL', text: finalBody, draftId, purpose: 'service' });
    assert.ok(sent.ok, 'human-approved send succeeded');
    assert.equal(sent.conversationId, in1.conversationId, 'outbound in the same conversation');
    const outCount = (await query("select count(*)::int n from message where conversation_id=$1 and direction='OUTBOUND'", [in1.conversationId])).rows[0].n;
    assert.equal(outCount, 1, 'exactly one outbound (human-approved), AI never auto-sent');
    // audit records human approval + that an AI draft was used.
    const aud = (await query("select meta from audit_event where action='message_sent' and entity_id=$1 order by at desc limit 1", [in1.conversationId])).rows[0];
    assert.equal(aud.meta.ai_draft, true, 'audit shows the AI draft was used, human approved');
    // outbound visible in the customer relationship.
    assert.ok((await getRelationship(tenantId, { contactId: known.id })).conversations.some((c) => c.id === in1.conversationId), 'conversation visible under the customer');

    // --- customer replies -> threads back -> AI re-proposes with updated context ---------------
    const in2 = await processInbound({ ...hook({ email_id: 'e2', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Re: planning' }, 'a2'), fetchEmail: body({ id: 'e2', mid: '<a2@oca.nl>', inReplyTo: sent.rfcMessageId, references: [sent.rfcMessageId], text: 'Maandag lukt niet, kunnen we het telefonisch doen?' }) });
    assert.equal(in2.conversationId, in1.conversationId, 'customer reply threads into the same conversation');
    const auto2 = await waitDraft(in1.conversationId);
    assert.ok(auto2, 'AI re-proposes on the reply');
    const next = await ai.suggestNextAction({ tenantId, conversationId: in1.conversationId });
    assert.ok(next.suggestions.length > 0, 'AI proposes a next best action from the updated context');
    // still only one outbound — nothing auto-sent.
    assert.equal((await query("select count(*)::int n from message where conversation_id=$1 and direction='OUTBOUND'", [in1.conversationId])).rows[0].n, 1, 'AI still has not auto-sent anything');
  } finally {
    await closePool();
  }
});
