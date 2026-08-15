// EMAIL channel provider — LIVE via Resend when configured, else a deterministic mock.
//
// Threading (RFC In-Reply-To/References + our own Message-ID) is an EMAIL concern and lives here so
// the generic send path stays channel-neutral. Delegates the actual HTTP to resend.mjs.

import { config } from '../../config.mjs';
import { sendThreadedEmail } from '../resend.mjs';
import { mailDelivers } from '../../mailer.mjs';

export function emailProvider() {
  const live = mailDelivers();
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
        { key: 'MAIL_API_KEY', where: 'Render → Environment', note: 'Resend API-sleutel' },
        { key: 'MAIL_FROM', where: 'Render → Environment', note: 'geverifieerde afzender (bv. hello@maculis.nl)' },
        { key: 'RESEND_WEBHOOK_SECRET', where: 'Resend → Webhooks (inbound)', note: 'inkomende e-mail verwerken' },
      ];
    },
    // threading: { from, inReplyTo, references, messageId }
    async send({ from, to, subject, text, html, threading = {} }) {
      if (!live) {
        // Mock: pretend a well-formed send happened so the whole pipeline is testable offline.
        return { ok: true, providerMessageId: `mock-email-${Date.now()}`, delivery: 'SENT' };
      }
      const res = await sendThreadedEmail(
        { from, to, subject, text, ...(html ? { html } : {}), inReplyTo: threading.inReplyTo, references: threading.references, replyTo: from },
        { headersExtra: threading.messageId ? { 'Message-ID': threading.messageId } : {} }
      );
      if (!res.ok) return { ok: false, reason: res.reason || 'send_failed' };
      return { ok: true, providerMessageId: res.id || null, delivery: 'SENT' };
    },
  };
}
