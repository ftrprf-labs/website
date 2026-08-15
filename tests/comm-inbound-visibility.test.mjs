// Communication Layer — inbound e-mail END TO END: a real (Svix-signed) webhook must land under
// the RIGHT customer in Klant -> Communicatie, be usable by the AI composer, and thread correctly.
// The only injected seam is the Resend Receiving API fetch (the network hop Resend itself abstracts
// behind resend.emails.receiving.get) — everything else is the real production pipeline on real PG.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../server/comm/webhook.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — inbound visibility E2E skipped' };

test('inbound e-mail is visible under the right customer in Communicatie + usable by AI', opts, async () => {
  process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('inbound-vis-secret').toString('base64'));
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { processInbound } = await import('../server/comm/inbound.mjs');
  const { sendReply } = await import('../server/comm/outbound.mjs');
  const { migrateInvitations } = await import('../server/comm/repo.mjs');
  const { getRelationship, relationshipTimeline } = await import('../server/comm/relationship.mjs');
  const drafts = await import('../server/comm/drafts.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { config } = await import('../server/config.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const secret = config.resendWebhookSecret;
  const tenantId = await (async () => { await runMigrations({ silent: true }); return getDefaultTenantId(); })();

  try {
    await query('truncate message, conversation, contact, organization, invitation, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, relationship_memory cascade');

    // A KNOWN customer exists already (came from Testerbeheer): OCA / Kim.
    await migrateInvitations([{ id: 'inv-oca', email: 'kim@oca.nl', first_name: 'Kim', last_name: 'de Vries', company_name: 'OCA', domain: 'oca.nl', campaign: 'MACULIS_FIRST_FIVE', status: 'SENT' }], tenantId);
    const known = (await query("select id, organization_id from contact where email='kim@oca.nl'")).rows[0];
    assert.ok(known && known.organization_id, 'known customer + organization exist');

    // Helpers to build a real signed webhook + an injected Receiving-API body.
    const hook = (data, svixId) => { const rawBody = JSON.stringify({ type: 'email.received', data }); return { headers: signWebhook({ id: svixId, timestamp: Math.floor(Date.now() / 1000), rawBody, secret }), rawBody }; };
    const body = (over) => async () => ({ id: over.id || 'e', from: over.from || 'Kim de Vries <kim@oca.nl>', to: over.to || ['hello@maculis.nl'], cc: [], subject: over.subject === undefined ? 'Vraag over de planning' : over.subject, text: over.text ?? 'Hoi, kunnen jullie meekijken?', html: over.html || '', headers: { message_id: over.mid || '<m1@oca.nl>', in_reply_to: over.inReplyTo || null, references: over.references || [] }, attachments: over.attachments || [] });

    // --- 1) inbound from the known customer -> stored, matched, threaded, VISIBLE --------------
    const in1 = await processInbound({ ...hook({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Vraag over de planning' }, 'svx-1'), fetchEmail: body({ id: 'e1', mid: '<m1@oca.nl>', text: 'Hoi, kunnen jullie meekijken naar onze planning?' }) });
    assert.equal(in1.stored, true, '1: stored');
    assert.equal(in1.contactMatched, true, '1: matched to a contact');
    assert.equal(in1.contactId, known.id, '1: matched to the SAME known customer (no duplicate)');
    assert.equal((await query("select count(*)::int n from contact where email='kim@oca.nl'")).rows[0].n, 1, '1: no duplicate contact created');

    // VISIBLE in Klant -> Communicatie (exact API the workspace uses).
    const rel = await getRelationship(tenantId, { contactId: known.id });
    assert.equal(rel.organization.name, 'OCA', '1: shows under OCA');
    const conv = rel.conversations.find((c) => c.id === in1.conversationId);
    assert.ok(conv, '1: inbound conversation appears in the customer\'s Communicatie');
    // Message shows as INBOUND with from/subject/body/time.
    const msgs = (await query('select direction, channel, from_address, subject, body_text, created_at from message where conversation_id=$1 order by created_at', [in1.conversationId])).rows;
    assert.equal(msgs[0].direction, 'INBOUND', '1: clearly inbound');
    assert.equal(msgs[0].from_address, 'kim@oca.nl', '1: sender correct');
    assert.match(msgs[0].subject, /planning/, '1: subject correct');
    assert.match(msgs[0].body_text, /meekijken/, '1: content correct');
    assert.ok(msgs[0].created_at, '1: timestamp present');
    // Same chronological customer timeline as outbound.
    const tl = await relationshipTimeline(tenantId, known.id);
    assert.ok(tl.some((it) => it.kind === 'message' && it.direction === 'INBOUND'), '1: on the unified timeline');

    // --- 2) AI can propose a reply from this inbound; nothing auto-sent -------------------------
    for (let i = 0; i < 60 && !(await query('select 1 from ai_draft where conversation_id=$1', [in1.conversationId])).rows[0]; i++) await new Promise((s) => setTimeout(s, 25));
    const opened = await drafts.openDraft({ tenantId, conversationId: in1.conversationId });
    assert.ok(opened.ok && opened.draft.body.length > 0, '2: AI concept ready for the composer');
    assert.equal((await query("select count(*)::int n from message where conversation_id=$1 and direction='OUTBOUND'", [in1.conversationId])).rows[0].n, 0, '2: AI did NOT auto-send');

    // --- refresh persistence: still there on a fresh read --------------------------------------
    assert.ok((await getRelationship(tenantId, { contactId: known.id })).conversations.some((c) => c.id === in1.conversationId), 'refresh keeps the message');

    // --- 3) reply threading: our outbound -> their reply lands in the SAME conversation ---------
    const rep = await sendReply({ conversationId: in1.conversationId, text: 'Ja, dat kan.', send: async () => ({ ok: true, id: 'out1' }) });
    assert.ok(rep.ok, '3: outbound reply sent (human)');
    const in2 = await processInbound({ ...hook({ email_id: 'e2', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Re: Vraag over de planning' }, 'svx-2'), fetchEmail: body({ id: 'e2', mid: '<m2@oca.nl>', inReplyTo: rep.rfcMessageId, references: [rep.rfcMessageId], text: 'Top, bedankt!' }) });
    assert.equal(in2.conversationId, in1.conversationId, '3: reply threads into the same conversation');

    // --- 4) unknown sender: safe, not wrongly attached to OCA ----------------------------------
    const in3 = await processInbound({ ...hook({ email_id: 'e3', from: 'stranger@elders.nl', to: ['hello@maculis.nl'], subject: 'Hallo' }, 'svx-3'), fetchEmail: body({ id: 'e3', from: 'stranger@elders.nl', mid: '<m3@elders.nl>', text: 'Wie zijn jullie?' }) });
    assert.equal(in3.stored, true, '4: unknown stored');
    assert.notEqual(in3.contactId, known.id, '4: NOT attached to OCA');
    const strangerConv = (await query('select organization_id from conversation where id=$1', [in3.conversationId])).rows[0];
    assert.equal(strangerConv.organization_id, null, '4: no org guessed for an unknown free/other sender');

    // --- 5) duplicate webhook -> no second message --------------------------------------------
    const before = (await query('select count(*)::int n from message').then((r) => r)).rows[0].n;
    const dup = await processInbound({ ...hook({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'] }, 'svx-1'), fetchEmail: body({ id: 'e1', mid: '<m1@oca.nl>' }) });
    assert.equal(dup.duplicate, true, '5: duplicate detected');
    assert.equal((await query('select count(*)::int n from message')).rows[0].n, before, '5: no duplicate message stored');

    // --- 6) invalid signature -> rejected, nothing stored -------------------------------------
    const bad = await processInbound({ headers: { 'svix-id': 'x', 'svix-timestamp': String(Math.floor(Date.now() / 1000)), 'svix-signature': 'v1,deadbeef' }, rawBody: JSON.stringify({ type: 'email.received', data: { email_id: 'e9' } }), fetchEmail: body({ id: 'e9' }) });
    assert.equal(bad.status, 401, '6: bad signature rejected');

    // --- 7) HTML mail sanitised; 8) plain text; 9) missing subject; 10) long mail --------------
    const inHtml = await processInbound({ ...hook({ email_id: 'e4', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'HTML' }, 'svx-4'), fetchEmail: body({ id: 'e4', mid: '<m4@oca.nl>', text: '', html: '<p onclick="x()">hoi <b>Kim</b></p><script>evil()</script>' }) });
    const htmlMsg = (await query('select body_html_sanitized, body_text from message where conversation_id=$1 order by created_at desc limit 1', [inHtml.conversationId])).rows[0];
    assert.ok(!/script|onclick/i.test(htmlMsg.body_html_sanitized || ''), '7: HTML sanitised');
    assert.match(htmlMsg.body_text || '', /hoi/, '7: text derived from HTML');

    const inNoSubj = await processInbound({ ...hook({ email_id: 'e5', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: null }, 'svx-5'), fetchEmail: body({ id: 'e5', mid: '<m5@oca.nl>', subject: null, text: 'geen onderwerp' }) });
    assert.equal(inNoSubj.stored, true, '9: missing subject does not crash');

    const long = 'x'.repeat(120000);
    const inLong = await processInbound({ ...hook({ email_id: 'e6', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'lang' }, 'svx-6'), fetchEmail: body({ id: 'e6', mid: '<m6@oca.nl>', text: long }) });
    assert.equal(inLong.stored, true, '10: long mail stored');

    // --- 11) wrong receiving address -> ignored (the #1 real-world "does not appear" cause) ----
    const wrong = await processInbound({ ...hook({ email_id: 'e7', from: 'kim@oca.nl', to: ['info@somewhere-else.nl'], subject: 'x' }, 'svx-7'), fetchEmail: body({ id: 'e7' }) });
    assert.equal(wrong.reason, 'recipient_not_allowlisted', '11: non-allowlisted receiving address is ignored (diagnosable)');
  } finally {
    await closePool();
  }
});
