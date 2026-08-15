// Communication Layer — outbound replies (human-sent, threaded).
//
// A reply is composed in Maculis and sent via Resend from the conversation's mailbox
// (hello@ / privacy@) with correct threading headers. We set our OWN RFC Message-ID on the
// outbound so the recipient's next reply (In-Reply-To that id) threads straight back into the
// same conversation. Every send is stored as an OUTBOUND Message and audited with the sending
// user. AI never sends: this is only ever called from an explicit human "Verzenden" action.

import { randomUUID } from 'node:crypto';
import { config } from '../config.mjs';
import { withTransaction, query } from './db.mjs';
import { sanitizeHtml } from './sanitize.mjs';
import { sendThreadedEmail } from './resend.mjs';
import { buildReferences } from './threading.mjs';
import { recordAudit } from './audit.mjs';

function mailboxDomain() {
  const first = config.commMailboxes[0] || 'hello@maculis.nl';
  return first.slice(first.indexOf('@') + 1) || 'maculis.nl';
}

// Send a reply on a conversation. `send` is injectable for tests.
//   { conversationId, userId, toAddress?, text, html?, send? } -> { ok, messageId, reason }
export async function sendReply({ conversationId, userId, toAddress, text, html, ipRef, send = sendThreadedEmail }) {
  if (!text || !String(text).trim()) return { ok: false, reason: 'empty_body' };

  // Gather thread context: mailbox address/kind, last inbound message, recipient.
  const ctx = (await query(
    `select c.id, c.subject, c.is_privacy, m.address as mailbox_address, m.kind as mailbox_kind,
            ct.email as contact_email
       from conversation c
       left join mailbox m on m.id = c.mailbox_id
       left join contact ct on ct.id = c.contact_id
      where c.id = $1`, [conversationId])).rows[0];
  if (!ctx) return { ok: false, reason: 'conversation_not_found' };

  const lastInbound = (await query(
    `select rfc_message_id, transport_meta, from_address, subject from message
      where conversation_id=$1 and direction='INBOUND' order by created_at desc limit 1`, [conversationId])).rows[0];

  const to = toAddress || (lastInbound && lastInbound.from_address) || ctx.contact_email;
  if (!to) return { ok: false, reason: 'no_recipient' };
  const fromAddress = ctx.mailbox_address || config.commMailboxes[0] || 'hello@maculis.nl';
  const subject = /^re:/i.test(ctx.subject || '') ? ctx.subject : `Re: ${ctx.subject || (lastInbound && lastInbound.subject) || ''}`.trim();

  const inReplyTo = lastInbound ? lastInbound.rfc_message_id : null;
  const priorRefs = (lastInbound && lastInbound.transport_meta && lastInbound.transport_meta.references) || [];
  const references = buildReferences(priorRefs, inReplyTo);
  const ourMessageId = `<${randomUUID()}@${mailboxDomain()}>`;
  const safeHtml = html ? sanitizeHtml(html) : '';

  const sent = await send({
    from: fromAddress, to, subject, text,
    ...(safeHtml ? { html: safeHtml } : {}),
    inReplyTo, references,
    // Set our own Message-ID so the recipient's reply threads back to us.
    // (sendThreadedEmail forwards `headers`; we inject Message-ID here.)
    replyTo: fromAddress,
  }, { headersExtra: { 'Message-ID': ourMessageId } });

  if (!sent.ok) return { ok: false, reason: sent.reason || 'send_failed' };

  const messageId = await withTransaction(async (client) => {
    const msg = await client.query(
      `insert into message(conversation_id, direction, from_address, to_addresses, subject,
          body_text, body_html_sanitized, transport_meta, provider, provider_message_id,
          rfc_message_id, delivery, sent_by, sent_at)
       values ($1,'OUTBOUND',$2,$3::jsonb,$4,$5,$6,$7::jsonb,'resend',$8,$9,'SENT',$10, now())
       returning id`,
      [conversationId, fromAddress, JSON.stringify([to]), subject, text, safeHtml || null,
       JSON.stringify({ rfc_message_id: ourMessageId, in_reply_to: inReplyTo, references }),
       sent.id || null, ourMessageId, userId || null]);
    await client.query(
      `update conversation set status='ANSWERED', last_message_at=now(), updated_at=now() where id=$1`,
      [conversationId]);
    return msg.rows[0].id;
  });

  await recordAudit({ actorUserId: userId, action: 'message_sent', entityType: 'conversation',
    entityId: conversationId, mailboxKind: ctx.mailbox_kind, ipRef, meta: { messageId } });
  return { ok: true, messageId, rfcMessageId: ourMessageId };
}
