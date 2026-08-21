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
import { listWorkItems, shapeWorkItem } from './work.mjs';
import { channelAllowed } from './consent.mjs';
import { getChannelProvider } from './providers/index.mjs';

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
  MIJN_ROOM_READY: 60,     // iemand vroeg zelf om te bewaren en wacht op een mens (KLAAR)
  MIJN_ROOM_EXPIRED: 55,   // uitgenodigd, nooit binnengekomen, de link is verlopen (KLAAR)
  FOLLOWUP_UPCOMING: 50,   // prepared work, not due yet (KLAAR)
  MIJN_ROOM_WAITING: 25,   // bewaren zonder benaderen: er gaat niets uit (RADAR)
  QUIET_RELATIONSHIP: 20,  // radar
};

// An unanswered inbound still needs a human decision (review/approve/send), so it stays in NU even
// when Maculis has already prepared a concept — the prepared concept is an attribute of the signal
// (§ 19), not a separate calmer bucket. KLAAR is prepared work with no pending inbound decision.
const BUCKET_OF = {
  DELIVERY_PROBLEM: 'NU', INBOUND_QUESTION: 'NU', INBOUND_MESSAGE: 'NU',
  FOLLOWUP_OVERDUE: 'NU', FOLLOWUP_DUE: 'NU',
  FOLLOWUP_UPCOMING: 'KLAAR',
  MIJN_ROOM_READY: 'KLAAR', MIJN_ROOM_EXPIRED: 'KLAAR',
  MIJN_ROOM_WAITING: 'RADAR',
  QUIET_RELATIONSHIP: 'RADAR',
};

const DAY_MS = 86400000;
const firstName = (who) => String(who || '').trim().split(/\s+/)[0] || 'deze relatie';

// The default silence threshold, isolated behind ONE seam so it is not a product assumption baked
// deep into the architecture (§ 2 stilteperiode). Today it is a flat 45 days; later this is the hook
// for contextual relationship cadence (expected contact rhythm per relation), without touching the
// radar. Silence is never "take contact now" — it is only "this change in the relationship pattern
// may deserve attention".
export function expectedSilenceThreshold(rel = {}) {
  if (Number.isFinite(rel.cadenceDays) && rel.cadenceDays > 0) return rel.cadenceDays; // future: per-relation rhythm
  return 45;
}

// Adapt an authored work item (colleague/agent) to a signal-like element so ONE aggregation and ONE
// ranking cover derived signals AND authored work. The full shaped work item rides along under `work`
// so the card keeps its origin, evidence, proposal and actions.
export function workElement(w) {
  return {
    key: `WORK:${w.id}`,
    source: 'WORK', kind: 'work',
    type: w.type, bucket: w.bucket, priority: w.priority,
    contactId: w.contactId || null, organizationId: null, conversationId: w.conversationId || null, followUpId: w.followUpId || null,
    who: w.who, org: w.org, channel: null,
    reason: w.title, prepared: false,
    occurredAt: w.createdAt, relevantAt: w.createdAt,
    provenance: { source: w.origin.key, sourceId: w.id, rule: 'authored work item', type: w.type, derivedAt: w.createdAt },
    work: w,
  };
}

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

// ---- FIRST_LENS: een klaargezette Mijn Maculis kamer -------------------------------------------
//
// ADR-0003 D4. De ondernemer vroeg zelf om te bewaren, de kamer is automatisch klaargezet, en wat
// overblijft is de enige handeling die het gebouw verlaat. Die blijft menselijk.
//
// DIT IS EEN AFLEIDING, GEEN OBJECT. Er is met opzet geen tabel met interessesignalen en geen rij in
// attention_item. De toestand van de kamer IS het signaal: verandert die, dan verdwijnt de kaart
// vanzelf. Zou het signaal apart zijn opgeslagen, dan kon het blijven staan nadat iemand allang
// besloten had, en dat is precies de dubbele waarheid die deze radar niet mag hebben.
//
// Wat er met opzet NIET in dit signaal zit: geen reflectie, geen antwoord uit de kamer, geen token.
// `uitspraak` is de zin die de ondernemer zelf in de Lens gelezen heeft; die teruggeven aan de mens
// die erover beslist is overdracht, geen inzage in wat hij daarna privé heeft opgeschreven.
export function deriveKamerSignaal(row, { derivedAt } = {}) {
  if (!row || !row.contactId) return null;
  const who = [row.firstName, row.lastName].filter(Boolean).join(' ') || null;
  const base = {
    source: 'FIRST_LENS', sourceId: row.id,
    contactId: row.contactId, organizationId: row.organizationId || null,
    who, org: row.org || null,
    occurredAt: row.createdAt || null, relevantAt: row.invitedAt || row.createdAt || null, derivedAt,
  };
  const kamer = {
    id: row.id, status: row.status,
    uitspraak: row.uitspraak || null,
    kanalen: Array.isArray(row.kanalen) ? row.kanalen : [],
    herhaling: row.status === 'uitgenodigd',
  };
  const naam = firstName(who);

  if (row.status === 'klaargezet') {
    return { ...signal({ ...base, type: 'MIJN_ROOM_READY', rule: "mijn_room.status='klaargezet'",
      reason: `${naam} vroeg om dit te bewaren. De persoonlijke omgeving staat klaar.` }), kind: 'kamer', kamer };
  }
  if (row.status === 'wacht_op_contact') {
    // Geen actiepunt en toch zichtbaar: iemand vroeg om te bewaren en krijgt bewust niets. Stil
    // laten gebeuren zou de keuze onzichtbaar maken in plaats van gerespecteerd.
    return { ...signal({ ...base, type: 'MIJN_ROOM_WAITING', rule: "mijn_room.status='wacht_op_contact'",
      reason: `${naam} vroeg om dit te bewaren, maar gaf geen toestemming om benaderd te worden. Er gaat niets uit.` }), kind: 'kamer', kamer };
  }
  if (row.status === 'uitgenodigd' && !row.levendeUitnodiging) {
    // De uitnodiging is verlopen zonder dat iemand binnenkwam. De kamer blijft van hem, dus dit is
    // geen nieuwe kamer en geen nieuwe toestemming: alleen dezelfde deurbel nog een keer.
    return { ...signal({ ...base, type: 'MIJN_ROOM_EXPIRED', rule: "mijn_room.status='uitgenodigd' zonder levende uitnodiging",
      reason: `De uitnodiging aan ${naam} is verlopen zonder dat hij binnen is geweest.` }), kind: 'kamer', kamer };
  }
  return null; // uitgenodigd met een levende link, actief, ingetrokken: er valt niets te beslissen
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
    // Ontdubbelen gebeurt per TYPE EN PER GESPREK, niet per type alleen. Eén relatie kan namelijk
    // in twee draden tegelijk op antwoord wachten, bijvoorbeeld een vraag bij een patroon in Mijn
    // Maculis en daarnaast een los bericht. Die twee leveren allebei hetzelfde signaaltype op.
    // Ontdubbelen op alleen het type gooide de tweede draad dan volledig weg: het nieuwste
    // klantbericht was in de Cockpit nergens meer te zien, en de kaart wees naar de andere draad.
    // De kaart blijft één kaart per relatie (zie de kop hierboven); wat verandert is dat een tweede
    // wachtende draad zichtbaar blijft als nevenreden, mét zijn eigen gespreks-id zodat hij ook te
    // openen is.
    const dedupeKey = (s) => `${s.type}|${s.conversationId || s.followUpId || ''}`;
    const seenTypes = new Set([dedupeKey(primary)]);
    const secondary = [];
    for (const s of sorted.slice(1)) {
      if (seenTypes.has(dedupeKey(s))) continue;
      seenTypes.add(dedupeKey(s));
      secondary.push({ type: s.type, reason: s.reason, bucket: s.bucket, conversationId: s.conversationId || null });
    }
    const followUps = sorted.filter((s) => s.followUpId && !s.work)
      .map((s) => ({ id: s.followUpId, reason: s.reason, type: s.type, overdue: s.type === 'FOLLOWUP_OVERDUE', upcoming: s.type === 'FOLLOWUP_UPCOMING' }));
    // Authored colleague work touching this relation, in full (origin, evidence, proposal, actions).
    const work = sorted.filter((s) => s.work).map((s) => s.work);
    // De klaargezette kamer rijdt in zijn geheel mee, net als geauteurd werk, zodat de kaart de
    // status en de werkelijk mogelijke kanalen kent zonder een tweede aanroep.
    const kamer = (sorted.find((s) => s.kamer) || {}).kamer || null;
    // Het gesprek van de kaart is het gesprek van de PRIMAIRE reden. Anders kan de knop naar een
    // andere draad wijzen dan de reden die eronder staat, en dan opent een mens iets anders dan
    // waar hij op klikte. Alleen wanneer de primaire reden zelf geen gesprek heeft (werk van een
    // collega, een follow-up zonder draad) valt de kaart terug op het eerste signaal dat er wel een
    // heeft, want een knop naar niets helpt niemand.
    const conv = primary.conversationId ? primary : sorted.find((s) => s.conversationId);
    cards.push({
      key: gkey,
      kind: primary.kind === 'work' ? 'work' : (primary.kind === 'kamer' ? 'kamer' : 'relation'),
      bucket: primary.bucket,
      contactId: primary.contactId || (conv && conv.contactId) || null,
      conversationId: conv ? conv.conversationId : null,
      who: primary.who || (group.find((s) => s.who) || {}).who || 'Onbekend',
      org: primary.org || (group.find((s) => s.org) || {}).org || null,
      channel: primary.channel || (conv && conv.channel) || null,
      primary: { type: primary.type, reason: primary.reason, source: primary.source, priority: primary.priority,
        origin: primary.work ? primary.work.origin : null, needs: primary.work ? primary.work.needs : null },
      secondary: secondary.slice(0, 3),
      followUps,
      work, kamer,
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

// Welke kanalen een uitnodiging naar Mijn Maculis werkelijk kunnen dragen, per kamer.
//
// Bewust drie losse redenen in plaats van één boolean: een medewerker die een kanaal niet ziet, moet
// kunnen weten waarom. `geen_transport` los je op met een instelling, `geen_toestemming` nooit.
//
// De kanaalkeuze wordt NIET afgeleid uit de algemene toestemming uit de Lens. Die vraag ging over
// benaderen, niet over WhatsApp, en een kanaal afleiden uit een kanaalloze vraag is precies de
// afleiding die ADR-0003 D2 verbiedt. Staat er geen expliciete kanaalvoorkeur, dan blijft WhatsApp
// dicht en dat is de bedoeling.
const KAMER_KANALEN = ['WHATSAPP', 'EMAIL'];
async function kanaalKeuzes(tenantId, row) {
  const adres = { WHATSAPP: row.mobile || null, EMAIL: row.email || null };
  const out = [];
  for (const kanaal of KAMER_KANALEN) {
    const prov = getChannelProvider(kanaal);
    if (!adres[kanaal]) { out.push({ kanaal, mogelijk: false, reden: 'geen_adres' }); continue; }
    if (!prov || prov.mode !== 'live') { out.push({ kanaal, mogelijk: false, reden: 'geen_transport' }); continue; }
    // eslint-disable-next-line no-await-in-loop
    const c = await channelAllowed(tenantId, row.contact_id, kanaal, 'service');
    out.push(c.allowed ? { kanaal, mogelijk: true, reden: 'ok' } : { kanaal, mogelijk: false, reden: 'geen_toestemming' });
  }
  return out;
}

// ---- DB orchestration: authoritative tenant state → ranked, bucketed radar ---------------------
// contactId (optional) scopes the radar to one relation so the dossier tells the SAME story as
// Vandaag (§ 20, one reality). now/quiet params are injectable for deterministic tests.
export async function buildRadar(tenantId, { now = new Date(), contactId = null, quietThresholdDays = expectedSilenceThreshold(), quietLimit = 6 } = {}) {
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
      // Per-relation cadence seam: today a flat threshold, later the expected contact rhythm.
    }, now, { thresholdDays: expectedSilenceThreshold({ contactId: r.id }) });
    if (s) { signals.push(s); quietAdded += 1; }
  }

  // 4) AUTHORED WORK — colleague/agent work items (persisted), merged into the SAME model. Each
  // becomes a signal-like element so one aggregation and one ranking cover derived + authored
  // attention; the full work item rides along for the card (origin, evidence, proposal, actions).
  const workRows = await listWorkItems(tenantId, { status: 'open', contactId });
  const workEls = workRows.map(shapeWorkItem).map(workElement);

  // 5) FIRST_LENS — kamers die op één menselijke beslissing wachten (ADR-0003 D4).
  //
  // Geen aparte tabel en geen rij in attention_item: de kamer bestaat al en zijn status is het
  // signaal. Afgewezen kamers vallen hier weg. De kamer blijft bestaan, want de ondernemer vroeg om
  // te bewaren, maar een kaart die blijft staan nadat een mens besloten heeft is geen signaal meer.
  const kamerRows = (await query(
    `select r.id, r.status, r.organization_id, r.contact_id, r.created_at, r.invited_at,
            o.name as org, c.first_name, c.last_name, c.email, c.mobile,
            (select ci.title from customer_insight ci
              where ci.organization_id = r.organization_id and ci.status <> 'archived'
              order by ci.created_at asc limit 1) as uitspraak,
            exists(select 1 from customer_invite iv
                    where iv.tenant_id = r.tenant_id and iv.contact_id = r.contact_id
                      and iv.accepted_at is null and iv.revoked_at is null and iv.expires_at > now()
                  ) as levende_uitnodiging
       from mijn_room r
       join organization o on o.id = r.organization_id
       left join contact c on c.id = r.contact_id
      where r.tenant_id=$1 and r.declined_at is null
        and ($2::uuid is null or r.contact_id = $2)
        and r.status in ('klaargezet','wacht_op_contact','uitgenodigd')
      order by r.created_at asc limit 50`, [tenantId, contactId])).rows;

  const kamerEls = [];
  for (const r of kamerRows) {
    // Welke kanalen werkelijk kunnen. Drie voorwaarden tegelijk, en alle drie een feit in plaats van
    // een aanname: er is een adres, de provider draait echt live, en de toestemming staat het toe.
    //
    // `mode === 'live'` is hier de belangrijkste regel. De mock-adapter geeft `ok:true` terug, dus
    // toetsen op "bestaat er een provider" zou "verzonden" melden terwijl er niets verstuurd is.
    // eslint-disable-next-line no-await-in-loop
    const kanalen = await kanaalKeuzes(tenantId, r);
    const s = deriveKamerSignaal({
      id: r.id, status: r.status, contactId: r.contact_id, organizationId: r.organization_id,
      firstName: r.first_name, lastName: r.last_name, org: r.org,
      createdAt: r.created_at, invitedAt: r.invited_at, uitspraak: r.uitspraak,
      levendeUitnodiging: r.levende_uitnodiging, kanalen,
    }, { derivedAt });
    if (s) kamerEls.push(s);
  }

  const elements = [...signals, ...workEls, ...kamerEls];

  // Aggregate → cards → bucket → rank.
  const cards = aggregateSignals(elements);
  const buckets = { NU: [], KLAAR: [], RADAR: [] };
  for (const card of cards) buckets[card.bucket].push(card);
  for (const b of BUCKETS) buckets[b] = rankCards(buckets[b]);

  const counts = { nu: buckets.NU.length, klaar: buckets.KLAAR.length, radar: buckets.RADAR.length, work: workEls.length, kamers: kamerEls.length };
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
