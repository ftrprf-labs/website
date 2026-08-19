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
import { stripForContext } from './signature.mjs';

// The canonical attention states, most-urgent first. The order IS the priority: the first matching
// state becomes a conversation's primary state.
export const ATTENTION_STATES = ['DELIVERY_PROBLEM', 'REPLY_READY', 'NEW', 'UNREAD', 'NEEDS_ACTION', 'WAITING_FOR_CUSTOMER', 'RESOLVED'];

// States that genuinely demand a human's attention (drive the cockpit total + Inbox badge). WAITING
// and RESOLVED are calm states — visible, but never a red badge.
export const ACTIONABLE_STATES = new Set(['DELIVERY_PROBLEM', 'REPLY_READY', 'NEW', 'UNREAD', 'NEEDS_ACTION']);

// Pure derivation from durable facts. No DB, no clock: fully testable.
//   row = { status, last_inbound_at, last_read_at, last_outbound_at, last_outbound_delivery,
//           last_dir, has_ai_proposed, contact_id }
//
// The pivot of Slice 4's correction: a successful OUTBOUND reply that lands after their last inbound
// SETTLES that inbound. Sending an answer is a stronger "handled" signal than the human read
// watermark (the cockpit read is deliberately side-effect-free), so an answered question can never
// keep asking. A FAILED answer is NOT settling: it surfaces as a delivery problem instead. And a
// delivery problem is derived from the LATEST outbound attempt only — a historical FAILED that a
// later successful send superseded is not a current problem, so old FAILED records (kept as system
// history) never re-raise attention on a conversation that has since been answered.
export function deriveAttention(row) {
  const inboundAt = row.last_inbound_at ? new Date(row.last_inbound_at).getTime() : null;
  const readAt = row.last_read_at ? new Date(row.last_read_at).getTime() : null;
  const outboundAt = row.last_outbound_at ? new Date(row.last_outbound_at).getTime() : null;
  const closed = row.status === 'CLOSED' || row.status === 'RESOLVED';

  // Did our most recent outbound attempt fail (and was it NOT superseded by a later success)?
  // `has_delivery_problem` stays supported as an explicit override for pure unit callers.
  const latestOutboundFailed = row.has_delivery_problem === true
    ? true
    : (row.last_outbound_delivery
        ? ['FAILED', 'BOUNCED'].includes(String(row.last_outbound_delivery).toUpperCase())
        : false);

  // A successful reply AFTER their last inbound settles it. (Requires a real outbound timestamp; the
  // legacy pure callers that omit it keep their prior semantics.)
  const answered = inboundAt != null && outboundAt != null && outboundAt >= inboundAt && !latestOutboundFailed;

  // A delivery problem: the latest outbound failed and it was (at least) our reply to the last
  // inbound. A newer inbound arriving after the failure takes precedence over the failure.
  const deliveryProblem = latestOutboundFailed && (outboundAt == null || inboundAt == null || outboundAt >= inboundAt);

  // "Unread" is an inbound the human has neither read NOR already answered.
  const unread = inboundAt != null && (readAt == null || inboundAt > readAt) && !answered;
  const neverRead = inboundAt != null && readAt == null && !answered;

  let state;
  if (deliveryProblem) {
    // A "sent" that never arrived is the worst silent gap — it always surfaces.
    state = 'DELIVERY_PROBLEM';
  } else if (closed && !unread) {
    state = 'RESOLVED';
  } else if (unread && row.has_ai_proposed) {
    state = 'REPLY_READY';            // new inbound AND a human-reviewable AI reply is prepared
  } else if (unread && neverRead) {
    state = 'NEW';                     // first contact, no human has opened it yet
  } else if (unread) {
    state = 'UNREAD';                  // new inbound in a thread previously read
  } else if (answered) {
    state = 'WAITING_FOR_CUSTOMER';   // we successfully replied to their last inbound; ball in their court
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
    answered,
    actionable: ACTIONABLE_STATES.has(state),
    unknownContact: !row.contact_id,
    hasAiProposed: !!row.has_ai_proposed,
  };
}

// Alle drie de OUTBOUND-feiten hieronder tellen uitsluitend PRIMAIRE berichten. Een secundaire
// notificatie meldt dat er ergens anders iets klaarstaat; ze beantwoordt niets en ze bezorgt niets.
// Haar mislukking is daarom geen bezorgprobleem van dit gesprek en haar succes is geen antwoord.
// Dat geldt ongeacht het kanaal waarop de melding ging: de grens loopt langs de rol van het
// bericht, nooit langs EMAIL, WHATSAPP of welk kanaal dan ook. Zie migratie 010.
//
// One tenant-wide scan → the derived attention for every non-privacy conversation, plus everything
// the cockpit, the row indicators and the Inbox badge need. Privacy conversations are excluded from
// the cockpit entirely (§ PRIVACY — no automatic attention surfacing of privacy communication).
export async function attentionOverview(tenantId, { limit = 500 } = {}) {
  const rows = (await query(
    `select c.id, c.status, c.channel, c.contact_id, c.organization_id,
            c.last_read_at, c.last_inbound_at, c.last_message_at, c.subject,
            ct.first_name, ct.last_name, lower(ct.email) as email, o.name as org,
            (select direction from message m where m.conversation_id=c.id and m.deleted_at is null
               and not m.is_notification
              order by created_at desc limit 1) as last_dir,
            (select body_text from message m where m.conversation_id=c.id and m.direction='INBOUND' and m.deleted_at is null
              order by created_at desc limit 1) as last_inbound_body,
            exists(select 1 from ai_draft a where a.conversation_id=c.id and a.status='proposed') as has_ai_proposed,
            (select created_at from message m where m.conversation_id=c.id and m.direction='OUTBOUND' and m.deleted_at is null
               and not m.is_notification
              order by created_at desc limit 1) as last_outbound_at,
            (select delivery from message m where m.conversation_id=c.id and m.direction='OUTBOUND' and m.deleted_at is null
               and not m.is_notification
              order by created_at desc limit 1) as last_outbound_delivery
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
      last_outbound_at: c.last_outbound_at, last_outbound_delivery: c.last_outbound_delivery,
      last_dir: c.last_dir, has_ai_proposed: c.has_ai_proposed,
      contact_id: c.contact_id,
    });
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
    // A short, clean preview of what they last said (signature/quoted history stripped), so the
    // cockpit shows meaning ("Dank je voor je bericht…") rather than a raw feed row.
    const preview = stripForContext(c.last_inbound_body || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    const item = {
      id: c.id, contactId: c.contact_id, organizationId: c.organization_id, email: c.email || null,
      name, org: c.org || null, channel: c.channel, preview: preview || null,
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

  const readyCount = stateCounts.REPLY_READY;
  return {
    summary: {
      actionable: actionableTotal,
      readyCount,
      states: stateCounts,
      channels: channelActionable,
      unknownContact,
      oldestActionableAt: oldestActionableAt != null ? new Date(oldestActionableAt).toISOString() : null,
      // Canonical, human headline — the ONE phrasing shared by the cockpit (server-computed so it can
      // never drift from the count that drives the Inbox badge and the row indicators).
      headline: attentionHeadline(actionableTotal, readyCount),
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

// The canonical attention headline. Meaning over counts, grammatically correct singular/plural, and
// an honest second line about what Maculis has ALREADY prepared (only ever states what is true — the
// proposal count, never an invented signal). Pure + tenant-agnostic, so it is unit-testable.
export function attentionHeadline(actionable, readyCount) {
  if (!actionable) {
    // Zero-state: calm, not "0 berichten", not a celebration. Maculis simply gives attention back.
    return { primary: 'Je bent bij.', secondary: 'Voor nu hoeft er niets van je.', zero: true };
  }
  const primary = actionable === 1
    ? '1 gesprek vraagt je aandacht'
    : `${actionable} gesprekken vragen je aandacht`;
  let secondary = null;
  if (readyCount > 0 && readyCount === actionable) {
    secondary = actionable === 1
      ? 'Er staat al een antwoord voor je klaar.'
      : `Voor alle ${actionable} staat al een antwoord klaar.`;
  } else if (readyCount === 1) {
    secondary = 'Voor één staat al een antwoord klaar.';
  } else if (readyCount > 1) {
    secondary = `Voor ${readyCount} staat al een antwoord klaar.`;
  }
  return { primary, secondary, zero: false };
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
