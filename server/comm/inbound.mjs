// Communication Layer — inbound e-mail pipeline.
//
// Order is deliberate and safety-first (persistence BEFORE intelligence): an inbound mail must
// never be lost because matching, AI or a downstream service fails.
//   verify signature -> idempotency -> record webhook event -> recipient allowlist ->
//   fetch full message -> persist Message + attachments -> resolve/thread Conversation ->
//   match Contact/Organization. AI runs later, separately (see ai/copilot.mjs), and only for the
//   COMMUNICATION mailbox — privacy@ is never auto-processed by AI in V1.

import { config } from '../config.mjs';
import { withTransaction, query } from './db.mjs';
import { verifyWebhook } from './webhook.mjs';
import { resolveContactTx } from './repo.mjs';
import { resolveConversationTx } from './threading.mjs';
import { sanitizeHtml, htmlToText } from './sanitize.mjs';
import { fetchInboundEmail } from './resend.mjs';

export function parseAddress(v) {
  if (!v) return '';
  const m = String(v).match(/<([^>]+)>/);
  return (m ? m[1] : String(v)).trim().toLowerCase();
}

// Which allowlisted mailbox (if any) is this addressed to, and is it the privacy mailbox?
function routeRecipient(recipients) {
  const privacy = config.commMailboxes.find((a) => a.startsWith('privacy@'));
  for (const r of recipients.map(parseAddress)) {
    if (config.commMailboxes.includes(r)) {
      return { address: r, kind: r === privacy ? 'PRIVACY' : 'COMMUNICATION' };
    }
  }
  return null;
}

async function ensureMailboxId(address, kind) {
  const found = await query('select id from mailbox where address=$1', [address]);
  if (found.rows[0]) return found.rows[0].id;
  const ins = await query(
    'insert into mailbox(address, kind) values ($1,$2) on conflict (address) do update set kind=excluded.kind returning id',
    [address, kind]);
  return ins.rows[0].id;
}

// Main entry. `fetchEmail` is injectable (tests pass a mock; production uses Resend). Returns a
// structured result; never throws for an expected condition (bad signature, duplicate, ignored).
export async function processInbound({ headers, rawBody, fetchEmail = fetchInboundEmail, now = Date.now() }) {
  // 1) signature (untrusted input)
  const v = verifyWebhook({ headers, rawBody, secret: config.resendWebhookSecret, now });
  if (!v.ok) return { ok: false, status: 401, reason: v.reason };

  let event;
  try { event = JSON.parse(rawBody); } catch { return { ok: false, status: 400, reason: 'bad_json' }; }
  if (event.type && event.type !== 'email.received') return { ok: true, status: 200, ignored: true, reason: 'event_type' };
  const data = event.data || event;
  const emailId = data.email_id || data.id;
  const eventId = headers['svix-id'] || emailId;
  if (!eventId) return { ok: false, status: 400, reason: 'no_event_id' };

  // 2/3) idempotency — record the event; a duplicate is a no-op success.
  const dup = await query(
    `insert into webhook_event(provider, provider_event_id, svix_id) values ('resend',$1,$2)
     on conflict (provider, provider_event_id) do nothing returning id`,
    [eventId, headers['svix-id'] || null]);
  if (dup.rows.length === 0) return { ok: true, status: 200, duplicate: true };

  try {
    // 4) recipient allowlist — unknown @maculis.nl addresses are NOT processed as communication.
    const recipients = Array.isArray(data.to) ? data.to : [data.to].filter(Boolean);
    const route = routeRecipient(recipients);
    if (!route) {
      await query(`update webhook_event set status='processed', processed_at=now() where provider_event_id=$1`, [eventId]);
      return { ok: true, status: 200, ignored: true, reason: 'recipient_not_allowlisted' };
    }

    // 5) fetch the full message (headers/body/attachments)
    const full = await fetchEmail(emailId);
    const fromAddr = parseAddress(full.from || data.from);
    const mailboxId = await ensureMailboxId(route.address, route.kind);
    const isPrivacy = route.kind === 'PRIVACY';

    // 6) persist Message + Conversation + match — all in one transaction (persistence first).
    const result = await withTransaction(async (client) => {
      // Match sender to a permanent Contact (never for privacy auto-org; here we only identify
      // the person from the From address — org linkage stays conservative).
      const contact = await resolveContactTx(client, { email: fromAddr });
      const conv = await resolveConversationTx(client, {
        rfcMessageId: full.headers.message_id,
        inReplyTo: full.headers.in_reply_to,
        references: full.headers.references,
        mailboxId, isPrivacy,
        contactId: contact ? contact.id : null,
        organizationId: contact ? contact.organization_id : null,
        subject: full.subject,
      });
      // If the conversation existed and had no contact yet, attach the matched one.
      if (contact) {
        await client.query(
          `update conversation set contact_id = coalesce(contact_id,$2),
             organization_id = coalesce(organization_id,$3), updated_at = now() where id = $1`,
          [conv.id, contact.id, contact.organization_id || null]);
      }
      const bodyHtml = full.html ? sanitizeHtml(full.html) : '';
      const bodyText = full.text || (full.html ? htmlToText(full.html) : '');
      const msg = await client.query(
        `insert into message(conversation_id, direction, from_address, to_addresses, cc_addresses,
            subject, body_text, body_html_sanitized, transport_meta, provider, provider_message_id,
            rfc_message_id, delivery, received_at)
         values ($1,'INBOUND',$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8::jsonb,'resend',$9,$10,'RECEIVED', now())
         returning id`,
        [conv.id, fromAddr, JSON.stringify(recipients.map(parseAddress)), JSON.stringify(full.cc || []),
         full.subject || null, bodyText || null, bodyHtml || null,
         JSON.stringify({ rfc_message_id: full.headers.message_id, in_reply_to: full.headers.in_reply_to, references: full.headers.references }),
         emailId, full.headers.message_id || null]);
      const messageId = msg.rows[0].id;
      for (const a of full.attachments || []) {
        await client.query(
          `insert into attachment(message_id, filename, content_type, size_bytes, provider_ref)
           values ($1,$2,$3,$4,$5)`,
          [messageId, a.filename, a.content_type, a.size || null, a.id || null]);
      }
      await client.query(
        `update conversation set status = case when status='CLOSED' then 'OPEN'::conv_status else 'NEW'::conv_status end,
           subject = coalesce(subject,$2), last_message_at = now(), updated_at = now() where id = $1`,
        [conv.id, full.subject || null]);
      return { conversationId: conv.id, messageId, contactMatched: !!contact };
    });

    await query(`update webhook_event set status='processed', processed_at=now() where provider_event_id=$1`, [eventId]);
    return { ok: true, status: 200, stored: true, mailboxKind: route.kind, isPrivacy, ...result };
  } catch (err) {
    // The webhook_event row stays 'received' with the error; Resend will retry, and idempotency
    // means a successful retry proceeds while a duplicate of an ALREADY-processed one no-ops.
    await query(`update webhook_event set status='failed', error=$2 where provider_event_id=$1`, [eventId, String(err.message || err)]).catch(() => {});
    return { ok: false, status: 500, reason: 'processing_error', error: String(err.message || err) };
  }
}
