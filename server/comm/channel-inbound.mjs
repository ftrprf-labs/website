// Communication Layer — non-email inbound (WhatsApp / SMS / social) + identity resolution (§20).
//
// A provider webhook normalises to a canonical inbound (see providers/*normalizeInbound), then this
// resolves it to the RIGHT relationship:
//   exactly one channel_identity match -> auto-link;  no match -> controlled UNKNOWN contact (never
//   a silent wrong link);  (multiple is impossible: channel_identity is unique per tenant+channel+value).
// The unknown case lands in the Inbox as an unknown sender the user can link or turn into a Contact.

import { withTransaction, query } from './db.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { normaliseMobile } from '../store.mjs';
import { recordActivity } from './activity.mjs';
import { runCopilot } from './ai/copilot.mjs';

function normaliseValue(channel, raw) {
  if (channel === 'WHATSAPP' || channel === 'SMS' || channel === 'PHONE') return normaliseMobile(raw || '') || String(raw || '').trim();
  return String(raw || '').trim().toLowerCase();
}

// Persist an inbound message on a channel and resolve identity. Idempotent on providerMessageId.
export async function receiveChannelInbound({ tenantId, channel, from, to = null, text = '', providerMessageId = null, provider = null, now = Date.now() }) {
  const tid = tenantId || await getDefaultTenantId();
  const value = normaliseValue(channel, from);
  if (!value) return { ok: false, reason: 'no_sender' };

  // Idempotency: a provider may deliver the same event twice.
  if (providerMessageId) {
    const dup = await query('select id from message where provider_message_id=$1 limit 1', [providerMessageId]);
    if (dup.rows[0]) return { ok: true, duplicate: true, messageId: dup.rows[0].id };
  }

  const match = (await query(
    'select contact_id from channel_identity where tenant_id=$1 and channel=$2 and value=$3 limit 1', [tid, channel, value])).rows[0];
  const contactId = match ? match.contact_id : null;
  const organizationId = contactId ? (await query('select organization_id from contact where id=$1', [contactId])).rows[0]?.organization_id || null : null;

  const result = await withTransaction(async (client) => {
    // One open conversation per (contact|unknown-value) per channel.
    let conv = null;
    if (contactId) {
      conv = (await client.query("select id from conversation where tenant_id=$1 and contact_id=$2 and channel=$3 and deleted_at is null order by last_message_at desc nulls last limit 1", [tid, contactId, channel])).rows[0];
    } else {
      conv = (await client.query("select id from conversation where tenant_id=$1 and channel=$2 and contact_id is null and thread_key=$3 and deleted_at is null limit 1", [tid, channel, `id:${value}`])).rows[0];
    }
    let convId;
    if (conv) {
      convId = conv.id;
      await client.query("update conversation set status=case when status in ('CLOSED','RESOLVED') then 'OPEN'::conv_status else 'NEW'::conv_status end, last_message_at=now(), last_inbound_at=now(), updated_at=now() where id=$1", [convId]);
    } else {
      const ins = await client.query(
        `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, status, thread_key, match_confidence, last_message_at, last_inbound_at)
         values ($1,$2,$3,$4,false,'NEW',$5,$6, now(), now()) returning id`,
        [tid, organizationId, contactId, channel, `id:${value}`, contactId ? 'linked' : 'unlinked']);
      convId = ins.rows[0].id;
    }
    const msg = await client.query(
      `insert into message(tenant_id, conversation_id, direction, channel, from_address, to_addresses, body_text, provider, provider_message_id, delivery, received_at)
       values ($1,$2,'INBOUND',$3,$4,$5::jsonb,$6,$7,$8,'RECEIVED', now()) returning id`,
      [tid, convId, channel, value, JSON.stringify(to ? [to] : []), text || null, provider, providerMessageId]);
    return { convId, messageId: msg.rows[0].id };
  });

  await recordActivity({ tenantId: tid, type: 'message_received', channel, contactId, organizationId, conversationId: result.convId, meta: { from: value, provider, unknown: !contactId } });
  // AI copilot proposes a draft (never for privacy; unknown-contact still gets a summary/draft).
  Promise.resolve().then(() => runCopilot({ conversationId: result.convId, messageId: result.messageId })).catch(() => {});
  return { ok: true, conversationId: result.convId, messageId: result.messageId, contactMatched: !!contactId, contactId, unknown: !contactId, value };
}

// Link an UNKNOWN conversation to a Contact (existing or newly created), recording the channel
// identity so future inbound auto-links. History is preserved (§20, §75).
export async function linkConversationToContact({ tenantId, conversationId, contactId = null, newContact = null, userId = null }) {
  const tid = tenantId || await getDefaultTenantId();
  const conv = (await query('select id, channel, contact_id from conversation where id=$1 and tenant_id=$2', [conversationId, tid])).rows[0];
  if (!conv) return { ok: false, reason: 'conversation_not_found' };
  const senderMsg = (await query("select from_address from message where conversation_id=$1 and direction='INBOUND' order by created_at asc limit 1", [conversationId])).rows[0];
  const value = senderMsg ? senderMsg.from_address : null;

  const result = await withTransaction(async (client) => {
    let cId = contactId;
    if (!cId && newContact) {
      const { resolveContactTx } = await import('./repo.mjs');
      const c = await resolveContactTx(client, tid, newContact);
      cId = c ? c.id : null;
    }
    if (!cId) return { ok: false, reason: 'no_target' };
    const orgId = (await client.query('select organization_id from contact where id=$1', [cId])).rows[0]?.organization_id || null;
    await client.query('update conversation set contact_id=$2, organization_id=coalesce(organization_id,$3), match_confidence=$4, updated_at=now() where id=$1', [conversationId, cId, orgId, 'linked']);
    // Record the channel identity so the next inbound from this value auto-links.
    if (value && ['WHATSAPP', 'SMS', 'PHONE'].includes(conv.channel)) {
      await client.query(
        `insert into channel_identity(tenant_id, contact_id, channel, value, source)
         values ($1,$2,$3,$4,'inbound_link') on conflict (tenant_id, channel, value) do update set contact_id=excluded.contact_id, updated_at=now()`,
        [tid, cId, conv.channel, value]);
    }
    return { ok: true, contactId: cId };
  });
  if (result.ok) await recordActivity({ tenantId: tid, type: 'contact_matched', channel: conv.channel, contactId: result.contactId, conversationId, actorUserId: userId, meta: { linked_value: value, manual: true } });
  return result;
}
