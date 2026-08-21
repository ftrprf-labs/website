// EMAIL channel provider — LIVE via Resend when a real transport is available, else a mock.
//
// Threading (RFC In-Reply-To/References + our own Message-ID) is an EMAIL concern and lives here so
// the generic send path stays channel-neutral. Delegates the actual HTTP to resend.mjs.
//
// LIVE requires ONLY MAIL_TRANSPORT=resend + MAIL_API_KEY — NOT MAIL_FROM. The comm outbound uses
// the conversation's mailbox address (hello@maculis.nl) as From, so MAIL_FROM (an invitation-flow
// setting) is irrelevant here. Critically: in PRODUCTION we NEVER fake-send. If a real transport is
// not configured the send FAILS LOUDLY (ok:false) instead of returning a false "SENT" — a mock that
// reports success would make the app claim delivery that never happened.

import { config } from '../../config.mjs';
import { sendThreadedEmail } from '../resend.mjs';

// Can we actually deliver via Resend right now? (Independent of MAIL_FROM.)
//
// MAIL_FROM hoort hier NIET bij, en dat is een productie-incident dat één keer is opgelost en niet
// nog eens hoeft. Deze adapter verstuurt namens het postvak van het gesprek zelf
// (`ctx.mailbox_address`, anders COMM_MAILBOXES) en gebruikt MAIL_FROM nergens. Nam deze controle
// MAIL_FROM tóch mee, dan viel de adapter terug op mock en meldde hij een verzending die nooit
// heeft plaatsgevonden. Zie tests/comm-outbound-delivery.test.mjs.
//
// mailDelivers() in server/mailer.mjs eist MAIL_FROM wél, en terecht: dat is de oudere
// Testerbeheer-mailer, en die verstuurt wel degelijk vanaf dat adres. Twee afzenders, twee
// voorwaarden. Dat is geen inconsistentie maar twee verschillende brieven.
function canSendLive() {
  return config.mailTransport === 'resend' && Boolean(config.mailApiKey);
}

export function emailProvider() {
  const live = canSendLive();
  return {
    name: live ? 'resend' : 'email-mock',
    channel: 'EMAIL',
    mode: live ? 'live' : 'mock',
    capabilities() {
      return { inbound: true, outbound: true, delivery_receipts: true, read_receipts: false, media: true, templates: false, threading: true };
    },
    requiredConfig() {
      return [
        { key: 'MAIL_TRANSPORT=resend', where: 'Render → Environment', note: 'e-mailtransport' },
        { key: 'MAIL_API_KEY', where: 'Render → Environment', note: 'Resend API-sleutel (full access)' },
        { key: 'RESEND_WEBHOOK_SECRET', where: 'Resend → Webhooks', note: 'inkomende e-mail + delivery events' },
      ];
    },
    // threading: { from, inReplyTo, references, messageId }
    async send({ from, to, subject, text, html, threading = {} }) {
      if (!live) {
        // An EXPLICIT MAIL_TRANSPORT=mock is a deliberate, offline stand-in that NEVER contacts a
        // provider, so it can never leak an e-mail — honour it everywhere, including production
        // (staging/preview: the loop closes without anything leaving the building). A MISSING or
        // blank transport is different: in production it must still FAIL LOUD rather than silently
        // fake a delivery (the exact incident that guard prevents).
        const explicitMock = config.mailTransport === 'mock';
        if (config.production && !explicitMock) return { ok: false, reason: 'email_transport_not_configured' };
        return { ok: true, providerMessageId: `mock-email-${Buffer.from(String(to)).toString('base64').slice(0, 10)}`, delivery: 'SENT', mock: true };
      }
      const res = await sendThreadedEmail(
        { from, to, subject, text, ...(html ? { html } : {}), inReplyTo: threading.inReplyTo, references: threading.references, replyTo: from },
        { headersExtra: threading.messageId ? { 'Message-ID': threading.messageId } : {} }
      );
      if (!res.ok) return { ok: false, reason: res.reason || 'send_failed' };
      // Resend accepted the message (2xx) and returned an id. This is 'SENT' (accepted), NOT proof of
      // delivery — true delivery is confirmed later by Resend's email.delivered/bounced webhook.
      return { ok: true, providerMessageId: res.id || null, delivery: 'SENT' };
    },
  };
}
