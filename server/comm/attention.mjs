// Communication Layer — the ATTENTION model (§ ATTENTION COCKPIT).
//
// One channel-agnostic answer to "wat vraagt vandaag mijn aandacht?", derived from durable facts and
// never stored twice, so it cannot drift. Attention is MORE than unread: a conversation can be unread
// (new inbound a human hasn't opened), need action (opened, still owed a reply), have an AI reply
// ready, be waiting on the customer, or be resolved. "Read" is strictly a HUMAN signal — the
// conversation-level last_read_at watermark set only when someone opens the thread — never a webhook,
// the AI, or a background job.
//
// The same derivation powers three surfaces on the SAME data: the compact cockpit above Testerbeheer,
// the per-relationship row indicators, and the Inbox badge. Tenant-scoped throughout.

import { query } from './db.mjs';

// The canonical attention states, most-urgent first. The order IS the priority: the first matching
// state becomes a conversation's primary state.
export const ATTENTION_STATES = ['DELIVERY_PROBLEM', 'REPLY_READY', 'NEW', 'UNREAD', 'NEEDS_ACTION', 'WAITING_FOR_CUSTOMER', 'RESOLVED'];

// States that genuinely demand a human's attention (drive the cockpit total + Inbox badge). WAITING
// and RESOLVED are calm states — visible, but never a red badge.
export const ACTIONABLE_STATES = new Set(['DELIVERY_PROBLEM', 'REPLY_READY', 'NEW', 'UNREAD', 'NEEDS_ACTION']);

// Pure derivation from three durable facts. No DB, no clock: fully testable.
//   row = { status, last_inbound_at, last_read_at, last_dir, has_ai_proposed, has_delivery_problem, contact_id }
export function deriveAttention(row) {
  const inboundAt = row.last_inbound_at ? new Date(row.last_inbound_at).getTime() : null;
  const readAt = row.last_read_at ? new Date(row.last_read_at).getTime() : null;
  const unread = inboundAt != null && (readAt == null || inboundAt > readAt);
  const neverRead = inboundAt != null && readAt == null;
  const closed = row.status === 'CLOSED' || row.status === 'RESOLVED';

  let state;
  if (row.has_delivery_problem) {
    // A failed/bounced outbound always surfaces — a "sent" that never arrived is the worst silent gap.
    state = 'DELIVERY_PROBLEM';
  } else if (closed && !unread) {
    state = 'RESOLVED';
  } else if (unread && row.has_ai_proposed) {
    state = 'REPLY_READY';            // new inbound AND a human-reviewable AI reply is prepared
  } else if (unread && neverRead) {
    state = 'NEW';                     // first contact, no human has opened it yet
  } else if (unread) {
    state = 'UNREAD';                  // new inbound in a thread previously read
  } else if (row.last_dir === 'INBOUND') {
    state = 'NEEDS_ACTION';           // opened/read, but the last word is theirs — still owed a reply
  } else if (row.last_dir === 'OUTBOUND' && !closed) {
    state = 'WAITING_FOR_CUSTOMER';   // we replied; the ball is in their court
  } else {
    state = 'RESOLVED';
  }

  return {
    state,
    unread,
    actionable: ACTIONABLE_STATES.has(state),
    unknownContact: !row.contact_id,
    hasAiProposed: !!row.has_ai_proposed,
  };
}

// One tenant-wide scan → the derived attention for every non-privacy conversation, plus everything
// the cockpit, the row indicators and the Inbox badge need. Privacy conversations are excluded from
// the cockpit entirely (§ PRIVACY — no automatic attention surfacing of privacy communication).
export async function attentionOverview(tenantId, { limit = 500 } = {}) {
  const rows = (await query(
    `select c.id, c.status, c.channel, c.contact_id, c.organization_id,
            c.last_read_at, c.last_inbound_at, c.last_message_at, c.subject,
            ct.first_name, ct.last_name, lower(ct.email) as email, o.name as org,
            (select direction from message m where m.conversation_id=c.id and m.deleted_at is null
              order by created_at desc limit 1) as last_dir,
            exists(select 1 from ai_draft a where a.conversation_id=c.id and a.status='proposed') as has_ai_proposed,
            exists(select 1 from message m where m.conversation_id=c.id and m.direction='OUTBOUND'
                     and m.delivery in ('FAILED','BOUNCED')) as has_delivery_problem
       from conversation c
       left join contact ct on ct.id=c.contact_id
       left join organization o on o.id=c.organization_id
      where c.tenant_id=$1 and c.deleted_at is null and c.is_privacy=false
      order by c.last_message_at desc nulls last
      limit $2`, [tenantId, limit])).rows;

  const conversations = [];
  const byEmail = {};           // normalized email -> best (most-urgent) attention for a Testerbeheer row
  const byContact = {};         // contact_id -> best attention
  const stateCounts = Object.fromEntries(ATTENTION_STATES.map((s) => [s, 0]));
  const channelActionable = {}; // channel -> count of ACTIONABLE conversations
  let actionableTotal = 0;
  let unknownContact = 0;
  let oldestActionableAt = null;

  for (const c of rows) {
    const att = deriveAttention({
      status: c.status, last_inbound_at: c.last_inbound_at, last_read_at: c.last_read_at,
      last_dir: c.last_dir, has_ai_proposed: c.has_ai_proposed, has_delivery_problem: c.has_delivery_problem,
      contact_id: c.contact_id,
    });
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
    const item = {
      id: c.id, contactId: c.contact_id, organizationId: c.organization_id, email: c.email || null,
      name, org: c.org || null, channel: c.channel,
      subject: c.subject || null, lastMessageAt: c.last_message_at, lastInboundAt: c.last_inbound_at,
      state: att.state, unread: att.unread, actionable: att.actionable,
      unknownContact: att.unknownContact, hasAiProposed: att.hasAiProposed,
    };
    conversations.push(item);
    stateCounts[att.state] += 1;
    if (att.actionable) {
      actionableTotal += 1;
      channelActionable[c.channel] = (channelActionable[c.channel] || 0) + 1;
      const at = c.last_inbound_at ? new Date(c.last_inbound_at).getTime() : null;
      if (at != null && (oldestActionableAt == null || at < oldestActionableAt)) oldestActionableAt = at;
    }
    if (att.unknownContact && att.actionable) unknownContact += 1;

    // Row-indicator maps keep the single MOST-URGENT attention per email/contact (a relationship can
    // have several conversations across channels).
    const better = (a, b) => ATTENTION_STATES.indexOf(a) <= ATTENTION_STATES.indexOf(b);
    if (att.actionable) {
      if (c.email && (!byEmail[c.email] || better(att.state, byEmail[c.email].state))) {
        byEmail[c.email] = { state: att.state, channel: c.channel, conversationId: c.id };
      }
      if (c.contact_id && (!byContact[c.contact_id] || better(att.state, byContact[c.contact_id].state))) {
        byContact[c.contact_id] = { state: att.state, channel: c.channel, conversationId: c.id };
      }
    }
  }

  return {
    summary: {
      actionable: actionableTotal,
      states: stateCounts,
      channels: channelActionable,
      unknownContact,
      oldestActionableAt: oldestActionableAt != null ? new Date(oldestActionableAt).toISOString() : null,
    },
    // The "act now" queue for the cockpit: only actionable, most-urgent first, then oldest inbound.
    queue: conversations
      .filter((c) => c.actionable)
      .sort((a, b) => {
        const d = ATTENTION_STATES.indexOf(a.state) - ATTENTION_STATES.indexOf(b.state);
        if (d !== 0) return d;
        return new Date(a.lastInboundAt || 0) - new Date(b.lastInboundAt || 0);
      }),
    byEmail,
    byContact,
  };
}

// Move the human read watermark forward. Idempotent: now() only ever advances the watermark, so
// repeated opens (or a Resend-driven re-render) never regress "read" state. Tenant-scoped.
export async function markConversationRead(tenantId, conversationId, { userId = null } = {}) {
  const r = await query(
    `update conversation set last_read_at = now(), last_read_by = coalesce($3, last_read_by)
      where id=$1 and tenant_id=$2 and deleted_at is null
      returning id, last_read_at, last_inbound_at`, [conversationId, tenantId, userId]);
  if (!r.rows[0]) return { ok: false, reason: 'not_found' };
  return { ok: true, conversationId, lastReadAt: r.rows[0].last_read_at };
}
