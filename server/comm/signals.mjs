// Communication Layer — the RELATIONAL RADAR (Slice 5).
//
// Maculis is not a CRM you browse. It keeps every relation quietly in the background and brings one
// forward ONLY when there is a concrete, explainable reason that it matters now. That reason is an
// ATTENTION SIGNAL: a small, source-agnostic, DERIVED fact of the shape
//
//   BRON → SIGNAAL → RELATIONELE BETEKENIS → AANDACHT → VOORBEREID WERK → MENSELIJKE BESLISSING
//
// Everything here is DETERMINISTIC and derived from authoritative state (no LLM invents a fact, no
// stored score). A signal is recomputed from reality every time, so when its reason disappears the
// signal disappears with it (§ 23, § 33 REGEL 5). Provenance is explicit on every signal so the
// same machinery can later ingest signals from other senses (FIRST_LENS, MEMORY, ...) without a
// rewrite — the radar is written against a `source`, never against "conversations only" (§ 22).
//
// The pure derivations (deriveCommSignal / deriveFollowUpSignal / deriveQuietSignal / aggregate /
// rankCards) take plain rows and a clock, so they are fully unit-testable. buildRadar() is the thin
// DB orchestration that feeds them tenant-scoped, authoritative state.

import { query } from './db.mjs';
import { attentionOverview } from './attention.mjs';
import { listFollowUps } from './followups.mjs';

// The senses that can raise a signal. Only COMM and FOLLOW_UP are wired in Slice 5; the rest are
// declared so the contract (and the aggregation/ranking) is source-agnostic from day one.
export const SIGNAL_SOURCES = ['COMM', 'FOLLOW_UP', 'MEMORY', 'FIRST_LENS', 'MANUAL', 'OTHER_LENS'];

// The three meaningful buckets the human sees. Never a mysterious 0..100 score.
//   NU    — human attention is needed now.
//   KLAAR — Maculis already prepared something to review or carry out.
//   RADAR — no action required, but an explainable reason this relation is relevant now.
export const BUCKETS = ['NU', 'KLAAR', 'RADAR'];

// Deterministic priority. The ORDER is the product ranking (§ 16): direct unanswered inbound, then
// overdue follow-up, then due follow-up, then prepared work, then radar/quiet. Higher = more urgent.
export const SIGNAL_PRIORITY = {
  DELIVERY_PROBLEM: 100,   // our answer never arrived — worst silent gap
  INBOUND_QUESTION: 90,    // an unanswered inbound question (a concept may be prepared alongside)
  INBOUND_MESSAGE: 88,     // an unanswered inbound message
  FOLLOWUP_OVERDUE: 80,
  FOLLOWUP_DUE: 70,
  FOLLOWUP_UPCOMING: 50,   // prepared work, not due yet (KLAAR)
  QUIET_RELATIONSHIP: 20,  // radar
};

// An unanswered inbound still needs a human decision (review/approve/send), so it stays in NU even
// when Maculis has already prepared a concept — the prepared concept is an attribute of the signal
// (§ 19), not a separate calmer bucket. KLAAR is prepared work with no pending inbound decision.
const BUCKET_OF = {
  DELIVERY_PROBLEM: 'NU', INBOUND_QUESTION: 'NU', INBOUND_MESSAGE: 'NU',
  FOLLOWUP_OVERDUE: 'NU', FOLLOWUP_DUE: 'NU',
  FOLLOWUP_UPCOMING: 'KLAAR',
  QUIET_RELATIONSHIP: 'RADAR',
};

const DAY_MS = 86400000;
const firstName = (who) => String(who || '').trim().split(/\s+/)[0] || 'deze relatie';

function signal({ source, sourceId, type, rule, contactId = null, organizationId = null, conversationId = null, followUpId = null, who = null, org = null, channel = null, reason, prepared = false, occurredAt = null, relevantAt = null, derivedAt }) {
  return {
    key: `${source}:${sourceId}`,
    source, type, bucket: BUCKET_OF[type], priority: SIGNAL_PRIORITY[type],
    contactId, organizationId, conversationId, followUpId, who, org, channel, reason, prepared,
    occurredAt, relevantAt,
    provenance: { source, sourceId, rule, type, derivedAt },
  };
}

// ---- COMM: an open conversation state → at most one signal ------------------------------------
// state comes straight from the corrected attention derivation; `summary`/`intent` are the copilot's
// real reading when present (the grounded human "why"), never invented here.
export function deriveCommSignal(row, { derivedAt } = {}) {
  const { state, conversationId, contactId, organizationId, who, org, channel, summary, intent, preview, occurredAt } = row;
  const grounded = summary && String(summary).trim() ? String(summary).trim() : null;
  const base = { source: 'COMM', sourceId: conversationId, contactId, organizationId, conversationId, who, org, channel, occurredAt, relevantAt: occurredAt, derivedAt };
  if (state === 'DELIVERY_PROBLEM') {
    return signal({ ...base, type: 'DELIVERY_PROBLEM', rule: 'latest OUTBOUND delivery in (FAILED,BOUNCED)',
      reason: `Je vorige bericht aan ${firstName(who)} kwam niet aan.` });
  }
  if (state === 'NEW' || state === 'UNREAD' || state === 'NEEDS_ACTION' || state === 'REPLY_READY') {
    // REPLY_READY is still an unanswered inbound: NU, but with a concept already prepared.
    const prepared = state === 'REPLY_READY';
    const isQuestion = intent === 'vraag' || intent === 'question' || (grounded && /\?|vraag|kan het|kunnen|zou/i.test(grounded));
    return signal({ ...base, type: isQuestion ? 'INBOUND_QUESTION' : 'INBOUND_MESSAGE', prepared,
      rule: prepared ? `attention state ${state} (concept prepared)` : `attention state ${state}`,
      reason: grounded
        || (preview ? `${firstName(who)}: "${preview}"` : `${firstName(who)} wacht op een reactie.`) });
  }
  return null; // WAITING_FOR_CUSTOMER / RESOLVED are calm — no signal
}

// ---- FOLLOW_UP: an open follow-up → due / overdue / upcoming ----------------------------------
export function deriveFollowUpSignal(fu, now) {
  if (!fu || fu.status !== 'open') return null;
  const who = [fu.first_name, fu.last_name].filter(Boolean).join(' ') || null;
  const org = fu.org || null;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const base = {
    source: 'FOLLOW_UP', sourceId: fu.id, contactId: fu.contact_id || null, organizationId: fu.organization_id || null,
    conversationId: fu.conversation_id || null, followUpId: fu.id, who, org,
    occurredAt: fu.due_at || null, relevantAt: fu.due_at || null, derivedAt: new Date(nowMs).toISOString(),
  };
  const due = fu.due_at ? new Date(fu.due_at).getTime() : null;
  if (due == null) {
    // Prepared work with no date is calm KLAAR, never urgent.
    return signal({ ...base, type: 'FOLLOWUP_UPCOMING', rule: 'status=open and due_at is null',
      reason: `Follow-up met ${firstName(who)} staat voor je klaar.` });
  }
  const endOfToday = new Date(nowMs); endOfToday.setUTCHours(23, 59, 59, 999);
  if (due < nowMs) {
    const daysLate = Math.floor((nowMs - due) / DAY_MS);
    const reason = daysLate >= 1
      ? `Follow-up met ${firstName(who)} is ${daysLate} dag${daysLate === 1 ? '' : 'en'} te laat.`
      : `Follow-up met ${firstName(who)} is verlopen.`;
    return signal({ ...base, type: 'FOLLOWUP_OVERDUE', rule: 'status=open and due_at < now', reason });
  }
  if (due <= endOfToday.getTime()) {
    return signal({ ...base, type: 'FOLLOWUP_DUE', rule: 'status=open and due_at <= end of today',
      reason: `Follow-up met ${firstName(who)} is vandaag gepland.` });
  }
  return signal({ ...base, type: 'FOLLOWUP_UPCOMING', rule: 'status=open and due_at in the future',
    reason: `Follow-up met ${firstName(who)} staat gepland voor later.` });
}

// ---- QUIET: a once-active relation that has gone silent past a threshold ------------------------
// Conservative by design: only fires when we KNOW there was contact (lastContactAt present) and there
// is no open attention already surfacing the relation. Never claims intent ("dreigt af te haken") —
// only the fact ("Al N dagen geen contact").
export function deriveQuietSignal(rel, now, { thresholdDays = 45 } = {}) {
  if (!rel || rel.hasOpenAttention) return null;
  if (!rel.lastContactAt) return null; // never engaged is not "quiet"
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const days = Math.floor((nowMs - new Date(rel.lastContactAt).getTime()) / DAY_MS);
  if (days < thresholdDays) return null;
  return signal({
    source: 'RADAR', sourceId: rel.contactId, type: 'QUIET_RELATIONSHIP',
    rule: `last meaningful contact older than ${thresholdDays} days and no open attention`,
    contactId: rel.contactId, organizationId: rel.organizationId || null, who: rel.who, org: rel.org || null,
    reason: `Al ${days} dagen geen contact met ${firstName(rel.who)}.`,
    occurredAt: rel.lastContactAt, relevantAt: new Date(nowMs).toISOString(), derivedAt: new Date(nowMs).toISOString(),
  });
}

// ---- Aggregation: many signals → one card per relation (§ 15, no card explosion) ---------------
// Group by contact (fallback: conversation). primary = highest priority; the rest become secondary
// reasons, deduped by type. The card's bucket is the primary's bucket, so a relation surfaces once,
// under its most urgent reason, never as five separate cards.
export function aggregateSignals(signals) {
  const groups = new Map();
  for (const s of signals) {
    const gkey = s.contactId ? `c:${s.contactId}` : (s.conversationId ? `v:${s.conversationId}` : s.key);
    if (!groups.has(gkey)) groups.set(gkey, []);
    groups.get(gkey).push(s);
  }
  const cards = [];
  for (const [gkey, group] of groups) {
    const sorted = group.slice().sort(cmpSignals);
    const primary = sorted[0];
    const seenTypes = new Set([primary.type]);
    const secondary = [];
    for (const s of sorted.slice(1)) {
      if (seenTypes.has(s.type)) continue;
      seenTypes.add(s.type);
      secondary.push({ type: s.type, reason: s.reason, bucket: s.bucket });
    }
    const followUps = sorted.filter((s) => s.followUpId)
      .map((s) => ({ id: s.followUpId, reason: s.reason, type: s.type, overdue: s.type === 'FOLLOWUP_OVERDUE', upcoming: s.type === 'FOLLOWUP_UPCOMING' }));
    const conv = sorted.find((s) => s.conversationId);
    cards.push({
      key: gkey,
      bucket: primary.bucket,
      contactId: primary.contactId || (conv && conv.contactId) || null,
      conversationId: conv ? conv.conversationId : null,
      who: primary.who || (group.find((s) => s.who) || {}).who || 'Onbekend',
      org: primary.org || (group.find((s) => s.org) || {}).org || null,
      channel: primary.channel || (conv && conv.channel) || null,
      primary: { type: primary.type, reason: primary.reason, source: primary.source, priority: primary.priority },
      secondary: secondary.slice(0, 3),
      followUps,
      hasPrepared: group.some((s) => s.prepared),
      priority: primary.priority,
      relevantAt: primary.relevantAt || primary.occurredAt || null,
      provenance: sorted.map((s) => s.provenance),
    });
  }
  return cards;
}

// Deterministic signal comparison: priority desc, then older-relevant first, then key.
function cmpSignals(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  const ta = a.relevantAt ? new Date(a.relevantAt).getTime() : 0;
  const tb = b.relevantAt ? new Date(b.relevantAt).getTime() : 0;
  if (ta !== tb) return ta - tb;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

// Deterministic card ranking within a bucket: priority desc, oldest-relevant first, then key.
export function rankCards(cards) {
  return cards.slice().sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const ta = a.relevantAt ? new Date(a.relevantAt).getTime() : 0;
    const tb = b.relevantAt ? new Date(b.relevantAt).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

// ---- DB orchestration: authoritative tenant state → ranked, bucketed radar ---------------------
// contactId (optional) scopes the radar to one relation so the dossier tells the SAME story as
// Vandaag (§ 20, one reality). now/quiet params are injectable for deterministic tests.
export async function buildRadar(tenantId, { now = new Date(), contactId = null, quietThresholdDays = 45, quietLimit = 6 } = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const derivedAt = new Date(nowMs).toISOString();
  const signals = [];

  // 1) COMM — the corrected attention queue (actionable conversations only).
  const ov = await attentionOverview(tenantId);
  let queue = ov.queue;
  if (contactId) queue = queue.filter((c) => c.contactId === contactId);
  // The copilot's real reading per conversation (grounded "why"); falls back to preview/neutral.
  const convIds = queue.map((c) => c.id);
  const understanding = new Map();
  if (convIds.length) {
    const rows = (await query(
      `select distinct on (conversation_id) conversation_id, summary, intent
         from ai_draft where tenant_id=$1 and conversation_id = any($2::uuid[])
           and status='proposed' and summary is not null
        order by conversation_id, created_at desc`, [tenantId, convIds])).rows;
    for (const r of rows) understanding.set(r.conversation_id, r);
  }
  for (const c of queue) {
    const u = understanding.get(c.id);
    const s = deriveCommSignal({
      state: c.state, conversationId: c.id, contactId: c.contactId, organizationId: c.organizationId,
      who: c.name, org: c.org, channel: c.channel,
      summary: u ? u.summary : null, intent: u ? u.intent : null, preview: c.preview,
      occurredAt: c.lastInboundAt || c.lastMessageAt || null,
    }, { derivedAt });
    if (s) signals.push(s);
  }

  // 2) FOLLOW_UP — open follow-ups → due / overdue / upcoming.
  const fus = await listFollowUps(tenantId, { status: 'open', contactId });
  for (const fu of fus) {
    const s = deriveFollowUpSignal(fu, now);
    if (s) signals.push(s);
  }

  // The set of relations that already have open attention (COMM or a follow-up) — quiet never
  // double-surfaces one of these.
  const openAttentionContacts = new Set(signals.filter((s) => s.contactId).map((s) => s.contactId));

  // 3) RADAR/QUIET — once-active relations gone silent, if reliably determinable from state.
  const quietCutoff = new Date(nowMs - quietThresholdDays * DAY_MS).toISOString();
  const quietRows = (await query(
    `select ct.id, ct.first_name, ct.last_name, ct.organization_id, o.name as org, lc.last_contact
       from contact ct
       left join organization o on o.id=ct.organization_id
       join lateral (select max(c.last_message_at) as last_contact from conversation c
                      where c.contact_id=ct.id and c.is_privacy=false and c.deleted_at is null) lc on true
      where ct.tenant_id=$1 and ct.deleted_at is null
        and ($2::uuid is null or ct.id=$2)
        and lc.last_contact is not null and lc.last_contact < $3
      order by lc.last_contact desc
      limit $4`, [tenantId, contactId, quietCutoff, quietLimit * 4])).rows;
  let quietAdded = 0;
  for (const r of quietRows) {
    if (quietAdded >= quietLimit) break;
    if (openAttentionContacts.has(r.id)) continue;
    const s = deriveQuietSignal({
      contactId: r.id, organizationId: r.organization_id, who: [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Onbekend',
      org: r.org, lastContactAt: r.last_contact, hasOpenAttention: false,
    }, now, { thresholdDays: quietThresholdDays });
    if (s) { signals.push(s); quietAdded += 1; }
  }

  // Aggregate → cards → bucket → rank.
  const cards = aggregateSignals(signals);
  const buckets = { NU: [], KLAAR: [], RADAR: [] };
  for (const card of cards) buckets[card.bucket].push(card);
  for (const b of BUCKETS) buckets[b] = rankCards(buckets[b]);

  const counts = { nu: buckets.NU.length, klaar: buckets.KLAAR.length, radar: buckets.RADAR.length };
  const replyReady = cards.filter((c) => c.hasPrepared).length;

  // Honest provenance of what the radar does NOT yet derive (§ 13, § 32 — do not fake).
  const dataGaps = [
    { type: 'OPEN_COMMITMENT', reason: 'Geen gestructureerde toezegging-met-deadline in de huidige state; de follow-up dekt dit betrouwbaar, dus een aparte MEMORY-afleiding is bewust uitgesteld.' },
  ];

  return {
    buckets, counts, replyReady,
    signals,                 // flat list (provenance/tests)
    quietThresholdDays,
    dataGaps,
    source: 'communication-layer/radar',
  };
}
