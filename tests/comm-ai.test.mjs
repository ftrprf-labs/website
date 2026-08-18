// Communication Layer — AI Relationship Copilot. Mock-provider parse always runs; the DB-backed
// draft/privacy checks SKIP without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProvider } from '../server/comm/ai/provider.mjs';
import { INTENTS } from '../server/comm/ai/copilot.mjs';

test('mock provider returns parseable draft JSON with a known intent', async () => {
  const raw = await getProvider().generate({ system: 's', prompt: 'LAATSTE BERICHT:\nKunnen jullie ook naar arbeidsmarktcommunicatie kijken?\n\n' });
  const json = JSON.parse(raw);
  assert.ok(json.summary && json.suggested_reply);
  assert.ok(INTENTS.includes(json.intent));
  assert.ok(Array.isArray(json.suggested_actions));
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
test('copilot: draft for COMMUNICATION, excluded for privacy@, never auto-sends',
  { skip: HAS_DB ? false : 'no DATABASE_URL — copilot DB test skipped' }, async () => {
    process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('ai-test-secret').toString('base64'));
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { processInbound } = await import('../server/comm/inbound.mjs');
    const { runCopilot } = await import('../server/comm/ai/copilot.mjs');
    const { signWebhook } = await import('../server/comm/webhook.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { config } = await import('../server/config.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, mailbox, webhook_event, ai_draft, activity cascade');
      const mk = (data, id) => { const rawBody = JSON.stringify({ type: 'email.received', data }); return { headers: signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret: config.resendWebhookSecret }), rawBody }; };
      const email = (to, mid) => async () => ({ id: 'e', from: 'Kim <kim@oca.nl>', to, cc: [], subject: 'Vraag', text: 'Kunnen jullie ook kijken?', html: '<p>x</p>', headers: { message_id: mid, in_reply_to: null, references: [] }, attachments: [] });
      const r1 = await processInbound({ ...mk({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'] }, 'w1'), fetchEmail: email(['hello@maculis.nl'], '<c1@oca.nl>') });
      const d = await runCopilot({ conversationId: r1.conversationId, messageId: r1.messageId });
      assert.equal(d.ok, true);
      const rp = await processInbound({ ...mk({ email_id: 'e2', from: 'jan@x.nl', to: ['privacy@maculis.nl'] }, 'w2'), fetchEmail: email(['privacy@maculis.nl'], '<p1@x.nl>') });
      const dp = await runCopilot({ conversationId: rp.conversationId, messageId: rp.messageId });
      assert.equal(dp.reason, 'privacy_excluded');
      const outbound = Number((await query("select count(*)::int n from message where direction='OUTBOUND'")).rows[0].n);
      assert.equal(outbound, 0, 'AI never auto-sends');
    } finally {
      await closePool();
    }
  });

// ---- e-mailconcepten eindigen zonder tweede afzenderidentiteit ---------------------------------
//
// E-mail is het enige kanaal waar de Communication Layer bij verzenden de centrale Maculis-
// handtekening toevoegt. Een concept dat zelf al met "Met vriendelijke groet, Maculis" afsluit,
// zet de afzender dus twee keer in dezelfde mail. Deze tests bewaken de instructie in de prompts
// EN de uitkomst na wrapEmail(). Ze raken de handtekening zelf niet aan.

import { CHANNEL_HINT, mockDraftFromContext } from '../server/comm/ai/service.mjs';
import { SYSTEM as COPILOT_SYSTEM } from '../server/comm/ai/copilot.mjs';
import { wrapEmail, SIG_TEXT_DELIM, SIG_MARKER } from '../server/comm/signature.mjs';

// Een groetformule met daaronder een naam, functie of organisatie: dat is een afzenderidentiteit.
const SIGN_OFF = /(met vriendelijke groet|hartelijke groet|vriendelijke groet|groeten?)\s*[,!]?\s*\n+\s*\S/i;

test('de e-mailinstructie verbiedt een tweede afzender-sign-off en houdt een inhoudelijke afsluiting heel', () => {
  const hint = CHANNEL_HINT.EMAIL;
  assert.match(hint, /geen groetformule/i, 'instructie sluit een groetformule uit');
  assert.match(hint, /naam, functie of organisatie/i, 'benoemt wat er niet onder mag');
  assert.match(hint, /handtekening wordt bij verzending automatisch toegevoegd/i, 'legt de reden uit');
  assert.match(hint, /afsluitende zin/i, 'een inhoudelijke afsluiting blijft expliciet toegestaan');
  // De andere kanalen krijgen geen centrale handtekening en houden hun eigen regels.
  assert.doesNotMatch(CHANNEL_HINT.WHATSAPP, /handtekening/i);
  assert.doesNotMatch(CHANNEL_HINT.SMS, /handtekening/i);
});

test('de copilot-systeemprompt draagt dezelfde regel voor het automatische concept', () => {
  assert.match(COPILOT_SYSTEM, /GEEN groetformule/i, 'copilot mag geen sign-off toevoegen');
  assert.match(COPILOT_SYSTEM, /handtekening wordt bij verzending automatisch toegevoegd/i, 'reden staat erbij');
  assert.match(COPILOT_SYSTEM, /eindigen op een gewone zin uit het bericht zelf/i, 'natuurlijk einde blijft gevraagd');
});

test('het offline e-mailconcept eindigt natuurlijk, zonder ondertekening namens Maculis', () => {
  const ctx = { recent: [{ direction: 'INBOUND', body_text: 'Kunnen jullie ook naar de arbeidsmarktkant kijken?' }], contact: { first_name: 'Kim' } };
  const body = mockDraftFromContext(ctx, 'EMAIL');
  assert.doesNotMatch(body, SIGN_OFF, 'geen groetformule met naam eronder');
  assert.doesNotMatch(body, /\bMaculis\s*$/i, 'eindigt niet op de organisatienaam');
  assert.match(body.trim(), /[.!?]$/, 'eindigt op een volledige zin');
  assert.ok(body.includes('Kim'), 'blijft persoonlijk');
});

test('bij verzending draagt de mail precies één afzenderidentiteit: de centrale handtekening', () => {
  const ctx = { recent: [{ direction: 'INBOUND', body_text: 'Kunnen jullie ook kijken?' }], contact: { first_name: 'Kim' } };
  const draft = mockDraftFromContext(ctx, 'EMAIL');
  const { text, html } = wrapEmail({ bodyText: draft, fromAddress: 'hello@maculis.nl' });

  assert.equal((text.match(/\n-- \n/g) || []).length, 1, 'één tekstscheidingsteken');
  assert.equal((html.match(new RegExp(SIG_MARKER, 'g')) || []).length, 1, 'één handtekeningblok');

  // Alles vóór het scheidingsteken is het bericht: daar hoort geen afzenderidentiteit in.
  const bodyPart = text.slice(0, text.indexOf(SIG_TEXT_DELIM));
  assert.doesNotMatch(bodyPart, SIGN_OFF, 'het bericht ondertekent niet zelf');
  assert.doesNotMatch(bodyPart, /^\s*Maculis\s*$/mi, 'geen losse organisatieregel in het bericht');

  // En de identiteit staat exact één keer in de mail, in de handtekening.
  const sigPart = text.slice(text.indexOf(SIG_TEXT_DELIM));
  assert.equal((sigPart.match(/^Maculis$/gmi) || []).length, 1, 'de organisatie staat één keer, in de handtekening');
  assert.ok(sigPart.includes('Ludwig van der Kuijl'), 'de canonieke naam staat in de handtekening');
});

test('een menselijke afsluiting in het concept blijft staan: wrapEmail schrijft niets in het bericht', () => {
  const human = 'Dank je voor je bericht.\n\nIk bel je morgen even.\n\nGroet,\nLudwig';
  const { text } = wrapEmail({ bodyText: human, fromAddress: 'hello@maculis.nl' });
  const bodyPart = text.slice(0, text.indexOf(SIG_TEXT_DELIM));
  assert.ok(bodyPart.includes('Groet,\nLudwig'), 'de eigen afsluiting van de mens blijft ongemoeid');
  assert.equal((text.match(/\n-- \n/g) || []).length, 1, 'nog steeds één handtekening');
});
