// Communication Layer — unified omnichannel outbound (§18, §25, §41).
//
// ONE send path for every channel. The Relationship Workspace / composer calls sendOnChannel();
// the vendor specifics live behind the provider adapter. Order:
//   resolve context -> resolve recipient -> CONSENT gate -> provider.send -> persist OUTBOUND
//   message -> delivery_event -> update conversation -> Activity + Audit -> mark draft sent.
// AI never reaches here: this is only ever an explicit human-approved action (§32, HUMAN APPROVAL).

import { randomUUID } from 'node:crypto';
import { config } from '../config.mjs';
import { withTransaction, query } from './db.mjs';
import { getChannelProvider } from './providers/index.mjs';
import { channelAllowed } from './consent.mjs';
import { sanitizeHtml } from './sanitize.mjs';
import { buildReferences } from './threading.mjs';
import { wrapEmail } from './signature.mjs';
import { recordAudit } from './audit.mjs';
import { recordActivity } from './activity.mjs';
import { getDefaultTenantId } from './tenant.mjs';

function mailboxDomain() {
  const first = config.commMailboxes[0] || 'hello@maculis.nl';
  return first.slice(first.indexOf('@') + 1) || 'maculis.nl';
}

// PII-safe outbound diagnostics: shows the REAL provider mode + result in production logs, so a
// silent mock or a provider rejection is never mistaken for a delivered message. Never logs the
// recipient, subject or body. Silenced in tests.
function logSend(extra = {}) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const safe = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ');
    // eslint-disable-next-line no-console
    console.log(`[comm/send] ${safe}`);
  } catch { /* logging must never break a send */ }
}

// Find an open conversation for a contact on a channel, or create one (contact-initiated compose,
// e.g. a first WhatsApp from the workspace with no prior thread).
async function ensureConversation(client, tenantId, { conversationId, contactId, organizationId, channel, subject }) {
  if (conversationId) return conversationId;
  if (contactId) {
    const ex = await client.query(
      `select id from conversation where tenant_id=$1 and contact_id=$2 and channel=$3 and deleted_at is null
        order by last_message_at desc nulls last limit 1`, [tenantId, contactId, channel]);
    if (ex.rows[0]) return ex.rows[0].id;
  }
  const ins = await client.query(
    `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, subject, status, match_confidence, last_message_at)
     values ($1,$2,$3,$4,false,$5,'OPEN',$6, now()) returning id`,
    [tenantId, organizationId || null, contactId || null, channel, subject || null, contactId ? 'linked' : 'unlinked']);
  return ins.rows[0].id;
}

// Resolve the recipient address/handle for a channel.
async function resolveRecipient(tenantId, { channel, contactId, conversationId, organizationId, toOverride }) {
  if (toOverride) return toOverride;
  // Mijn Maculis has no address. The message lands in one organization's own environment, so THAT
  // is the recipient. Named, non-PII, and impossible to mistake for an outside destination. No
  // organization means no environment to deliver into, so the send fails closed.
  if (channel === 'MIJN_MACULIS') return organizationId ? `mijn-maculis:${organizationId}` : null;
  if (channel === 'EMAIL' && conversationId) {
    const lastInbound = (await query(
      `select from_address from message where conversation_id=$1 and direction='INBOUND' order by created_at desc limit 1`, [conversationId])).rows[0];
    if (lastInbound && lastInbound.from_address) return lastInbound.from_address;
  }
  if (contactId) {
    const ci = (await query(
      `select value from channel_identity where tenant_id=$1 and contact_id=$2 and channel=$3
        order by is_primary desc, verified desc limit 1`, [tenantId, contactId, channel])).rows[0];
    if (ci) return ci.value;
    if (channel === 'EMAIL') {
      const c = (await query('select email from contact where id=$1', [contactId])).rows[0];
      if (c && c.email) return c.email;
    }
  }
  return null;
}

// Main entry. Returns { ok, messageId, delivery, reason, consent }.
export async function sendOnChannel({
  tenantId, conversationId = null, contactId = null, organizationId = null,
  channel = 'EMAIL', subject = null, text, html = null, toOverride = null,
  purpose = 'service', userId = null, draftId = null, ipRef = null, provider = null,
  // Is dit de communicatie zelf, of een melding OVER communicatie die elders al is bezorgd?
  // Alleen het eerste mag ooit tot de uitspraak leiden dat ons bericht de klant niet bereikte.
  // Zie migratie 010. Standaard primair: wie niets zegt, verstuurt echte communicatie.
  isNotification = false,
}) {
  const tid = tenantId || await getDefaultTenantId();
  if (!text || !String(text).trim()) return { ok: false, reason: 'empty_body' };

  // Context from an existing conversation (contact/org/threading/mailbox).
  let ctx = {};
  if (conversationId) {
    ctx = (await query(
      `select c.id, c.subject, c.is_privacy, c.contact_id, c.organization_id, c.channel,
              m.address as mailbox_address
         from conversation c left join mailbox m on m.id=c.mailbox_id where c.id=$1 and c.tenant_id=$2`,
      [conversationId, tid])).rows[0] || {};
    if (ctx.is_privacy && channel !== 'EMAIL') return { ok: false, reason: 'privacy_email_only' };
  }
  const effContact = contactId || ctx.contact_id || null;
  const effOrg = organizationId || ctx.organization_id || null;

  // CONSENT gate (server-side, §27/§28/§74).
  const consent = await channelAllowed(tid, effContact, channel, purpose);
  if (!consent.allowed) return { ok: false, reason: 'consent_blocked', consent };

  const to = await resolveRecipient(tid, { channel, contactId: effContact, conversationId, organizationId: effOrg, toOverride });
  if (!to) return { ok: false, reason: 'no_recipient', consent };

  const prov = provider || getChannelProvider(channel);
  if (!prov) return { ok: false, reason: 'unsupported_channel' };

  // EMAIL threading — set our own Message-ID so the reply threads back; reuse prior References.
  let threading = {};
  let subj = subject;
  if (channel === 'EMAIL') {
    const lastInbound = conversationId ? (await query(
      `select rfc_message_id, transport_meta, subject from message
        where conversation_id=$1 and direction='INBOUND' order by created_at desc limit 1`, [conversationId])).rows[0] : null;
    const inReplyTo = lastInbound ? lastInbound.rfc_message_id : null;
    const priorRefs = (lastInbound && lastInbound.transport_meta && lastInbound.transport_meta.references) || [];
    const ourMessageId = `<${randomUUID()}@${mailboxDomain()}>`;
    threading = { inReplyTo, references: buildReferences(priorRefs, inReplyTo), messageId: ourMessageId };
    if (!subj) subj = /^re:/i.test(ctx.subject || '') ? ctx.subject : `Re: ${ctx.subject || (lastInbound && lastInbound.subject) || ''}`.trim();
  }
  const fromAddress = ctx.mailbox_address || config.commMailboxes[0] || 'hello@maculis.nl';
  const safeHtml = html ? sanitizeHtml(html) : '';

  // Living Maculis signature is added CENTRALLY at send time, EXACTLY ONCE, only for e-mail. The
  // STORED body (below) stays clean (no signature) so the AI context and the conversation view show
  // the actual message, never the presentation boilerplate (§11/§12).
  let outText = text; let outHtml = safeHtml || null;
  if (channel === 'EMAIL') {
    const wrapped = wrapEmail({ bodyText: text, bodyHtml: safeHtml || null, fromAddress });
    outText = wrapped.text; outHtml = wrapped.html;
  }

  const sent = await prov.send({ tenantId: tid, from: fromAddress, to, subject: subj, text: outText, html: outHtml, threading });
  logSend({ channel, mode: prov.mode, provider: prov.name, ok: !!sent.ok, delivery: sent.ok ? (sent.delivery || 'SENT') : 'FAILED', provider_msg: sent.providerMessageId || 'none', reason: sent.ok ? '-' : (sent.reason || 'send_failed') });

  // Persist the outbound message either way. A real failure is stored FAILED so it is ACTIONABLE (§41).
  const delivery = sent.ok ? (sent.delivery || 'SENT') : 'FAILED';
  const result = await withTransaction(async (client) => {
    const convId = await ensureConversation(client, tid, { conversationId, contactId: effContact, organizationId: effOrg, channel, subject: subj });
    const transportMeta = channel === 'EMAIL'
      ? { rfc_message_id: threading.messageId, in_reply_to: threading.inReplyTo, references: threading.references }
      : { channel_provider: prov.name };
    const msg = await client.query(
      `insert into message(tenant_id, conversation_id, direction, channel, from_address, to_addresses, subject,
          body_text, body_html_sanitized, transport_meta, provider, provider_message_id, rfc_message_id, delivery, sent_by, is_notification, sent_at)
       values ($1,$2,'OUTBOUND',$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15, now()) returning id`,
      [tid, convId, channel, fromAddress, JSON.stringify([to]), subj, text, safeHtml || null,
       JSON.stringify(transportMeta), prov.name, sent.providerMessageId || null,
       channel === 'EMAIL' ? threading.messageId : null, delivery, userId || null, isNotification]);
    const messageId = msg.rows[0].id;
    await client.query(
      `insert into delivery_event(tenant_id, message_id, channel, provider, provider_message_id, state, detail)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [tid, messageId, channel, prov.name, sent.providerMessageId || null, delivery, sent.ok ? null : (sent.reason || 'send_failed')]);
    if (sent.ok) {
      // Een melding beantwoordt niets. Ze zet het gesprek dus ook niet op ANSWERED: dat is een
      // uitspraak over de primaire communicatie. Haar tijdstempel telt wel, want er is
      // aantoonbaar iets gebeurd op deze draad.
      await client.query(
        isNotification
          ? `update conversation set last_message_at=now(), updated_at=now() where id=$1`
          : `update conversation set status='ANSWERED', last_message_at=now(), updated_at=now() where id=$1`,
        [convId]);
    }
    if (draftId && sent.ok) {
      await client.query(`update comm_draft set status='sent', sent_message_id=$2, sent_at=now(), updated_at=now() where id=$1`, [draftId, messageId]);
    }
    return { convId, messageId };
  });

  await recordAudit({ tenantId: tid, actorUserId: userId, action: sent.ok ? 'message_sent' : 'message_send_failed',
    entityType: 'conversation', entityId: result.convId, ipRef,
    meta: { channel, messageId: result.messageId, provider: prov.name, mode: prov.mode, ai_draft: Boolean(draftId), reason: sent.ok ? undefined : sent.reason } });
  await recordActivity({ tenantId: tid, type: sent.ok ? 'message_sent' : 'message_failed', channel,
    contactId: effContact, organizationId: effOrg, conversationId: result.convId, actorUserId: userId,
    meta: { messageId: result.messageId, to, provider: prov.name, mode: prov.mode } });

  if (!sent.ok) return { ok: false, reason: sent.reason || 'send_failed', messageId: result.messageId, delivery, consent };

  // An answer placed in Mijn Maculis is invisible until the customer happens to come back. A sober
  // e-mail says only THAT there is an answer, never what it says. Dynamically imported so the
  // Communication Layer keeps no static dependency on the customer environment, and awaited but
  // never allowed to fail the send: the answer itself has already been delivered.
  let notified = null;
  if (channel === 'MIJN_MACULIS') {
    notified = await import('../mijn/notify.mjs')
      .then((m) => m.announceReply({ tenantId: tid, organizationId: effOrg, conversationId: result.convId, messageId: result.messageId }))
      .catch((err) => ({ ok: false, reason: `announce_failed:${err.message}` }));
  }

  return { ok: true, messageId: result.messageId, conversationId: result.convId, delivery, providerMode: prov.mode, consent, rfcMessageId: threading.messageId, notified };
}
