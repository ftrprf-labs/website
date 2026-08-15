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
        // NEVER fake a delivery in production. A mock "SENT" would make the app claim an e-mail was
        // sent that never left the building (the exact incident this prevents).
        if (config.production) return { ok: false, reason: 'email_transport_not_configured' };
        // Local/dev/tests only: deterministic offline stand-in so the pipeline is testable.
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
