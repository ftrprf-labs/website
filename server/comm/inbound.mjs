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
import { tenantForMailbox } from './tenant.mjs';
import { recordActivity } from './activity.mjs';
import { runCopilot } from './ai/copilot.mjs';

export function parseAddress(v) {
  if (!v) return '';
  const m = String(v).match(/<([^>]+)>/);
  return (m ? m[1] : String(v)).trim().toLowerCase();
}

// PII-safe inbound diagnostics: makes "where did the chain stop?" visible in production logs
// WITHOUT ever logging sender/body/subject. Only the stage, a reason, and the (Maculis-owned,
// non-PII) mailbox/kind are emitted. Silenced in tests.
function logInbound(stage, extra = {}) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const safe = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ');
    // eslint-disable-next-line no-console
    console.log(`[comm/inbound] ${stage}${safe ? ' ' + safe : ''}`);
  } catch { /* logging must never break inbound */ }
}

// Resend OUTBOUND delivery events → our msg_delivery vocabulary. This turns "we handed it to Resend"
// (SENT/accepted) into provider-confirmed truth (DELIVERED / BOUNCED / FAILED), so the app never
// claims delivery Resend did not confirm (the incident this addresses).
const DELIVERY_STATES = {
  'email.sent': 'SENT',
  'email.delivered': 'DELIVERED',
  'email.delivery_delayed': 'DELIVERING',
  'email.bounced': 'BOUNCED',
  'email.failed': 'FAILED',
  'email.complained': 'FAILED',
};
const POS_RANK = { QUEUED: 0, DELIVERING: 1, SENT: 2, DELIVERED: 3, READ: 4 };

// Update the OUTBOUND message this event refers to (by provider_message_id). Never regresses a
// stronger positive state on an out-of-order event; a bounce/failure always surfaces. Returns
// whether a matching outbound message was found.
async function applyDeliveryStatus(providerMsgId, type, state) {
  if (!providerMsgId) return false;
  const msg = (await query("select id, tenant_id, delivery from message where provider_message_id=$1 and direction='OUTBOUND' limit 1", [providerMsgId])).rows[0];
  if (!msg) return false;
  const negative = state === 'BOUNCED' || state === 'FAILED';
  if (negative || (POS_RANK[state] ?? 0) >= (POS_RANK[msg.delivery] ?? 0)) {
    await query('update message set delivery=$2::msg_delivery where id=$1', [msg.id, state]);
  }
  await query(
    "insert into delivery_event(tenant_id, message_id, channel, provider, provider_message_id, state, detail) values ($1,$2,'EMAIL','resend',$3,$4::msg_delivery,$5)",
    [msg.tenant_id, msg.id, providerMsgId, state, type]);
  return true;
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

async function ensureMailboxId(tenantId, address, kind) {
  const found = await query('select id from mailbox where address=$1', [address]);
  if (found.rows[0]) return found.rows[0].id;
  const ins = await query(
    'insert into mailbox(tenant_id, address, kind) values ($1,$2,$3) on conflict (address) do update set kind=excluded.kind returning id',
    [tenantId, address, kind]);
  return ins.rows[0].id;
}

// Main entry. `fetchEmail` is injectable (tests pass a mock; production uses Resend). Returns a
// structured result; never throws for an expected condition (bad signature, duplicate, ignored).
export async function processInbound({ headers, rawBody, fetchEmail = fetchInboundEmail, now = Date.now() }) {
  // 1) signature (untrusted input)
  const v = verifyWebhook({ headers, rawBody, secret: config.resendWebhookSecret, now });
  if (!v.ok) { logInbound('rejected', { reason: v.reason }); return { ok: false, status: 401, reason: v.reason }; }

  let event;
  try { event = JSON.parse(rawBody); } catch { return { ok: false, status: 400, reason: 'bad_json' }; }
  const type = event.type || 'email.received';
  const data = event.data || event;
  const emailId = data.email_id || data.id;
  const eventId = headers['svix-id'] || emailId;
  if (!eventId) return { ok: false, status: 400, reason: 'no_event_id' };

  // 2/3) idempotency — record the event. Only a SUCCESSFULLY processed event is a true duplicate;
  // a prior attempt that failed (or never finished) MUST be retried, otherwise a transient error
  // (e.g. a missing key) would permanently lose the mail once Resend redelivers the same event
  // (§19/§42 retry-safe, no lost messages).
  const ins = await query(
    `insert into webhook_event(provider, provider_event_id, svix_id) values ('resend',$1,$2)
     on conflict (provider, provider_event_id) do nothing returning id`,
    [eventId, headers['svix-id'] || null]);
  if (ins.rows.length === 0) {
    const prior = (await query("select status from webhook_event where provider='resend' and provider_event_id=$1", [eventId])).rows[0];
    if (prior && prior.status === 'processed') return { ok: true, status: 200, duplicate: true };
    // A previously failed/unfinished event: reset and reprocess on this redelivery.
    await query("update webhook_event set status='received', error=null where provider='resend' and provider_event_id=$1", [eventId]);
  }

  // 3b) OUTBOUND delivery events (Resend confirms what happened to a message we sent).
  if (DELIVERY_STATES[type]) {
    try {
      const matched = await applyDeliveryStatus(emailId, type, DELIVERY_STATES[type]);
      await query("update webhook_event set status='processed', processed_at=now() where provider_event_id=$1", [eventId]);
      logInbound('delivery', { type, state: DELIVERY_STATES[type], matched });
      return { ok: true, status: 200, deliveryUpdated: matched, state: DELIVERY_STATES[type] };
    } catch (err) {
      logInbound('error', { reason: 'delivery_update_failed', detail: String(err.message || err).slice(0, 80) });
      await query("update webhook_event set status='failed', error=$2 where provider_event_id=$1", [eventId, String(err.message || err)]).catch(() => {});
      return { ok: false, status: 500, reason: 'delivery_update_failed' };
    }
  }
  // Any other non-received event type: acknowledged, nothing to store.
  if (type !== 'email.received') {
    await query("update webhook_event set status='processed', processed_at=now() where provider_event_id=$1", [eventId]);
    return { ok: true, status: 200, ignored: true, reason: 'event_type' };
  }

  try {
    // 4) recipient allowlist — unknown @maculis.nl addresses are NOT processed as communication.
    const recipients = Array.isArray(data.to) ? data.to : [data.to].filter(Boolean);
    const route = routeRecipient(recipients);
    if (!route) {
      // The receiving address is not on COMM_MAILBOXES. This is the single most common reason a
      // real inbound "does not appear": the Resend receiving address must match one of these.
      logInbound('ignored', { reason: 'recipient_not_allowlisted', allowlist: config.commMailboxes.length });
      await query(`update webhook_event set status='processed', processed_at=now() where provider_event_id=$1`, [eventId]);
      return { ok: true, status: 200, ignored: true, reason: 'recipient_not_allowlisted' };
    }

    // 5) fetch the full message (headers/body/attachments)
    const full = await fetchEmail(emailId);
    const fromAddr = parseAddress(full.from || data.from);
    const tenantId = await tenantForMailbox(route.address);
    const mailboxId = await ensureMailboxId(tenantId, route.address, route.kind);
    const isPrivacy = route.kind === 'PRIVACY';

    // 6) persist Message + Conversation + match — all in one transaction (persistence first).
    const result = await withTransaction(async (client) => {
      // Idempotency guard: if this exact inbound message was already stored on an earlier attempt
      // (post-commit failure, then a Resend retry), do not insert it twice.
      const already = await client.query("select id, conversation_id from message where provider_message_id=$1 and direction='INBOUND' limit 1", [emailId]);
      if (already.rows[0]) return { conversationId: already.rows[0].conversation_id, messageId: already.rows[0].id, contactMatched: false, contactId: null, organizationId: null, reprocessed: true };
      // Match sender to a permanent Contact (never for privacy auto-org; here we only identify
      // the person from the From address — org linkage stays conservative).
      const contact = await resolveContactTx(client, tenantId, { email: fromAddr });
      const conv = await resolveConversationTx(client, tenantId, {
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
        `insert into message(tenant_id, conversation_id, direction, from_address, to_addresses, cc_addresses,
            subject, body_text, body_html_sanitized, transport_meta, provider, provider_message_id,
            rfc_message_id, delivery, received_at)
         values ($11,$1,'INBOUND',$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8::jsonb,'resend',$9,$10,'RECEIVED', now())
         returning id`,
        [conv.id, fromAddr, JSON.stringify(recipients.map(parseAddress)), JSON.stringify(full.cc || []),
         full.subject || null, bodyText || null, bodyHtml || null,
         JSON.stringify({ rfc_message_id: full.headers.message_id, in_reply_to: full.headers.in_reply_to, references: full.headers.references }),
         emailId, full.headers.message_id || null, tenantId]);
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
      return { conversationId: conv.id, messageId, contactMatched: !!contact, contactId: contact ? contact.id : null, organizationId: contact ? contact.organization_id : null };
    });

    // Unified timeline: a received message is an Activity (persistence already done; best-effort).
    await recordActivity({
      tenantId, type: 'message_received', channel: 'EMAIL',
      contactId: result.contactId, organizationId: result.organizationId, conversationId: result.conversationId,
      meta: { mailbox: route.address, messageId: result.messageId },
    });
    await query(`update webhook_event set status='processed', processed_at=now() where provider_event_id=$1`, [eventId]);
    logInbound('stored', { kind: route.kind, conversation: result.conversationId, contact_matched: result.contactMatched });

    // AI runs AFTER persistence and only for the COMMUNICATION mailbox — privacy@ is never
    // auto-analysed (§33). Fire-and-forget: the webhook returns immediately; a copilot failure
    // can never lose or delay the received message.
    if (!isPrivacy) {
      Promise.resolve().then(() => runCopilot({ conversationId: result.conversationId, messageId: result.messageId })).catch(() => {});
    }
    return { ok: true, status: 200, stored: true, mailboxKind: route.kind, isPrivacy, ...result };
  } catch (err) {
    // The webhook_event row stays 'received' with the error; Resend will retry, and idempotency
    // means a successful retry proceeds while a duplicate of an ALREADY-processed one no-ops.
    logInbound('error', { reason: 'processing_error', detail: String(err.message || err).slice(0, 80) });
    await query(`update webhook_event set status='failed', error=$2 where provider_event_id=$1`, [eventId, String(err.message || err)]).catch(() => {});
    return { ok: false, status: 500, reason: 'processing_error', error: String(err.message || err) };
  }
}
