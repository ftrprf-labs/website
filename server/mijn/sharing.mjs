// Mijn Maculis — the SHARING BOUNDARY primitive (§4, §5, §22).
//
// This module is the single, central place where the hard boundary between PRIVATE, SHARED and
// AGGREGATED customer information is enforced. Both sides go through here:
//
//   Customer side  → visibleInsights()/insightForCustomer(): the customer sees their own org's
//                    PRIVATE + SHARED insights (never another org's — every query is tenant + org
//                    scoped and the org is derived from the access grant, never from client input).
//
//   Internal side  → sharedContextForOrg(): the Cockpit / AI context engine can ONLY ever read
//                    insights where sharing='SHARED' (plus AGGREGATED patterns). PRIVATE is filtered
//                    out in SQL, so a private insight is structurally unable to reach an internal
//                    view, a model prompt, a log or another agent. The boundary is architecture, not
//                    a prompt instruction, and it is enforced BEFORE any model call because the
//                    context engine calls this function to obtain the data at all.
//
// Crossing the boundary (PRIVATE → SHARED) is only ever an explicit, human, customer-initiated act
// (shareInsight) and is always audited (insight_share_event + audit_event). Nothing is auto-shared.

import { query, withTransaction } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

// Columns that are safe to send to a customer. NB: `provenance` is deliberately excluded — the raw
// internal evidence/confidence trail never leaves the server toward the customer. Two derived
// booleans (never the version ids themselves) support the A2 UX:
//   evidence_count        = how many observations under this insight have a customer-safe label.
//                           Het Veld sizes the light by this number, so it must come from the same
//                           fail-closed source the evidence list uses: no label, no count (canon 7).
//   developed             = this insight has more than one reading (it has developed over time).
//   unshared_development  = it is SHARED but the current reading is newer than the shared one, so
//                           there is a new development the customer has not shared with Maculis yet.
//   recognition           = het eigen antwoord van DEZE persoon op "Herken je dit?". Het komt uit
//                           insight_recognition en hangt aan (inzicht, contact). Het reist nooit met
//                           `sharing` mee: zie de opmerking bij sharedContextForOrg.
//   intent                = de eigen keuze van DEZE persoon bij "Wil je hier iets mee?", uit
//                           insight_intent. Ook persoonlijk, en ook per (inzicht, contact): de
//                           keuze van Piet is voor Sanne niet zichtbaar en overschrijft de hare
//                           niet. Het is een DERDE signaal naast herkenning en vrijgave, en geen
//                           van de drie is uit een ander af te leiden.
const CUSTOMER_SELECT =
  `ci.id, ci.title, ci.stance, ci.observation, ci.meaning, ci.basis, ci.not_yet_known, ci.sharing,
   ci.audience, ci.source, ci.status, ci.attention, ci.created_at, ci.updated_at, ci.shared_at,
   coalesce(irm.answer, irl.answer) as recognition,
   coalesce(irm.note, irl.note) as recognition_note,
   coalesce(irm.at, irl.at) as recognition_at,
   irl.answer as lens_answer, irl.at as lens_answer_at,
   irm.answer as mijn_answer, irm.note as mijn_note, irm.at as mijn_at,
   ii.intent as intent, ii.at as intent_at,
   (select count(*) from insight_version v where v.insight_id = ci.id) > 1 as developed,
   (ci.sharing='SHARED' and ci.shared_version_id is distinct from ci.current_version_id) as unshared_development,
   (select count(*)::int from insight_observation o
     where o.insight_id = ci.id and o.customer_label is not null) as evidence_count`;

// ---- customer-facing reads ----------------------------------------------------------------------
//
// TWEE VRAGEN, TWEE VELDEN. Wat hier wordt beantwoord is dimensie A: wie binnen de klantorganisatie
// dit inzicht mag zien. Dat leest `ci.audience`. Of Maculis de inhoud mag zien is dimensie B, dat is
// `ci.sharing`, en dat speelt hier geen enkele rol. De twee mogen nooit dezelfde beslissing worden.
//
// In V1 kent audience één waarde. Dat is bewust een expliciete controle en geen weggelaten filter:
// er staat iets om tegen te programmeren en iets om te testen, en een latere beleidskeuze is dan een
// waarde erbij in plaats van een verbouwing.
export const ZICHTBAAR_BINNEN_ORGANISATIE = ['ORGANISATIE'];

// De persoonlijke laag hangt aan (inzicht, contact). Zonder contact blijft hij LEEG, nooit
// organisatiebreed: dat is de fail-closed kant van deze join.
// Een functie en geen sjabloon met een tekstvervanging: er hangen nu drie joins aan dezelfde
// parameter, en een replace zonder /g zou alleen de eerste raken. Dat is precies het soort stille
// fout waar een tweede persoonlijke laag om vraagt.
//
// TWEE STEMMEN, TWEE JOINS. Wat hij tijdens de Lens zei en wat hij later in de kamer toevoegt, zijn
// twee bijdragen op twee momenten. Ze deelden eerder één rij, waardoor de tweede de eerste
// overschreef en niet meer te zien was wanneer hij wat zei. `recognition` blijft het geldende
// antwoord, dus de knoppen in de kamer gedragen zich zoals ze deden; daarnaast staan beide stemmen
// nu apart, met een eigen datum.
const PERSOONLIJK_JOIN = (p) =>
  `left join insight_recognition irl on irl.insight_id = ci.id and irl.contact_id = ${p}::uuid`
  + ` and irl.origin = 'lens'`
  + ` left join insight_recognition irm on irm.insight_id = ci.id and irm.contact_id = ${p}::uuid`
  + ` and irm.origin = 'mijn'`
  + ` left join insight_intent ii on ii.insight_id = ci.id and ii.contact_id = ${p}::uuid`;

// Elk inzicht dat deze persoon binnen zijn organisatie mag zien.
export async function visibleInsights(tenantId, organizationId, contactId = null) {
  const r = await query(
    `select ${CUSTOMER_SELECT} from customer_insight ci
       ${PERSOONLIJK_JOIN('$4')}
      where ci.tenant_id=$1 and ci.organization_id=$2 and ci.status <> 'archived'
        and ci.audience = any($3)
      order by ci.attention desc, ci.updated_at desc`,
    [tenantId, organizationId, ZICHTBAAR_BINNEN_ORGANISATIE, contactId]);
  return r.rows;
}

// A single insight, strictly scoped to the customer's own org. Returns null when the id belongs to
// another organization or tenant — this is what makes direct URL/id manipulation leak nothing.
export async function insightForCustomer(tenantId, organizationId, insightId, contactId = null) {
  const r = await query(
    `select ${CUSTOMER_SELECT} from customer_insight ci
       ${PERSOONLIJK_JOIN('$5')}
      where ci.id=$1 and ci.tenant_id=$2 and ci.organization_id=$3 and ci.status <> 'archived'
        and ci.audience = any($4)`,
    [insightId, tenantId, organizationId, ZICHTBAAR_BINNEN_ORGANISATIE, contactId]);
  return r.rows[0] || null;
}

// ---- internal / Cockpit reads (SHARED only — the hard boundary) --------------------------------

// The ONLY customer-insight data the internal side is ever allowed to see: what the customer
// deliberately shared. PRIVATE is excluded in SQL. VERSION-AWARE (Slice A1): the content comes from
// the SHARED version (shared_version_id), never the head's current cache. So when an insight develops
// past the shared version, the newer (private) reading can never reach Maculis through this path.
// Imported by the AI context engine, so authorized model context can, by construction, never contain
// PRIVATE data nor an unshared newer version.
//
// DE PERSOONLIJKE LAAG REIST HIER NOOIT MEE. Eerder stond het herkenningsantwoord in deze query, met
// de redenering dat het op een gedeeld inzicht precies is wat Maculis vroeg. Dat was fout, en niet
// een beetje: het koppelt een persoonlijke keuze aan een handeling van iemand anders. Antwoordt
// Sanne "Nee" op een inzicht dat nog niet gedeeld is, en deelt Piet dat inzicht later, dan zou haar
// antwoord alsnog naar de Cockpit stromen. Een handeling van Piet verandert dan een privacykeuze van
// Sanne. Wie wil dat Maculis zijn antwoord kent, zegt dat in een gesprek.
export async function sharedContextForOrg(tenantId, organizationId) {
  if (!organizationId) return [];
  const r = await query(
    `select ci.id, iv.title, iv.stance, iv.observation, iv.meaning, ci.status, ci.sharing, ci.shared_at
       from customer_insight ci
       join insight_version iv on iv.id = ci.shared_version_id
      where ci.tenant_id=$1 and ci.organization_id=$2
        and ci.sharing='SHARED' and ci.status <> 'archived'
      order by ci.shared_at desc nulls last, ci.updated_at desc`,
    [tenantId, organizationId]);
  return r.rows;
}

// De context die de klant BEWUST bij één gesprek heeft gedeeld, zodat een mens bij Maculis de vraag
// kan begrijpen. Dit is met opzet een APART leespad:
//
//   * het is per gesprek opvraagbaar en nergens anders;
//   * het maakt het inzicht niet gedeeld: `customer_insight.sharing` blijft wat het was;
//   * het komt NOOIT in sharedContextForOrg terecht, dus het wordt geen onderdeel van de algemene
//     gedeelde organisatiewerkelijkheid en het beïnvloedt geen enkel ander gesprek;
//   * het draagt een momentopname van de uitspraak en de houding, en niets van de lezing eronder,
//     het bewijs of de persoonlijke laag.
//
// Delen van gesprekscontext en delen van een inzicht zijn daarmee twee verschillende handelingen,
// met twee verschillende tabellen en twee verschillende sporen.
export async function conversationContext(tenantId, conversationId) {
  if (!conversationId) return [];
  const r = await query(
    `select insight_id, title, stance, at
       from insight_context_share
      where tenant_id=$1 and conversation_id=$2
      order by at asc`,
    [tenantId, conversationId]);
  // Eén regel per inzicht: een tweede vraag in dezelfde draad deelt niet nog eens iets nieuws.
  const gezien = new Set();
  return r.rows.filter((row) => (gezien.has(row.insight_id) ? false : gezien.add(row.insight_id)));
}

// PREVIEW / ARCHITECTURE PROOF (§25). Demonstrates the boundary from the INTERNAL side: what Maculis
// is authorized to use (the SHARED insights, full) and HOW MANY private insights are withheld
// (a count only, never their titles or content). This is a diagnostic surface for verification, not
// a normal internal read path — the count is the one place we deliberately look at PRIVATE rows, and
// even here nothing about their content crosses the boundary.
export async function boundaryProof(tenantId, organizationId) {
  const authorized = await sharedContextForOrg(tenantId, organizationId);
  const totals = (await query(
    `select
        count(*) filter (where sharing='PRIVATE')::int as private,
        count(*) filter (where sharing='SHARED')::int as shared,
        count(*)::int as total
       from customer_insight
      where tenant_id=$1 and organization_id=$2 and status <> 'archived'`,
    [tenantId, organizationId])).rows[0];
  return {
    authorized,                               // full: titles + observation of SHARED insights only
    withheldPrivateCount: totals.private,     // count only — no PRIVATE content ever leaves the boundary
    sharedCount: totals.shared,
    totalCount: totals.total,
  };
}

// Count only — used by the Cockpit to show "N gedeelde inzichten" without loading bodies.
export async function sharedInsightCount(tenantId, organizationId) {
  if (!organizationId) return 0;
  const r = await query(
    `select count(*)::int n from customer_insight
      where tenant_id=$1 and organization_id=$2 and sharing='SHARED' and status <> 'archived'`,
    [tenantId, organizationId]);
  return r.rows[0].n;
}

// ---- crossing the boundary (explicit, human, audited) ------------------------------------------

// PRIVATE → SHARED. Server-side, idempotent, and audited. The org is passed in from the resolved
// access grant (never from the client), so a customer can only ever share their OWN insight. After
// this call — and only after — sharedContextForOrg() will surface the insight to the internal side.
export async function shareInsight(tenantId, organizationId, insightId, { actorLabel = null, actorAccessId = null } = {}) {
  return withTransaction(async (client) => {
    const cur = (await client.query(
      `select id, sharing, title, current_version_id, shared_version_id from customer_insight
        where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived' for update`,
      [insightId, tenantId, organizationId])).rows[0];
    if (!cur) return { ok: false, error: 'not_found' };
    // Already fully shared at the current reading — nothing to do (idempotent).
    if (cur.sharing === 'SHARED' && cur.shared_version_id === cur.current_version_id) {
      return { ok: true, already: true, sharing: 'SHARED' };
    }
    const wasShared = cur.sharing === 'SHARED';

    // VERSION-BOUND consent. Sharing binds shared_version_id to the CURRENT reading, and ONLY through
    // this explicit action. Two cases converge here: a first PRIVATE→SHARED, and "share the update"
    // where an already-SHARED insight has developed past its shared reading (shared_version_id moves
    // forward to the current version). A later version never moves this pointer on its own.
    await client.query(
      `update customer_insight
          set sharing='SHARED', shared_at=now(), shared_by=$4, shared_version_id=$5, revoked_at=null, updated_at=now()
        where id=$1 and tenant_id=$2 and organization_id=$3`,
      [insightId, tenantId, organizationId, actorLabel, cur.current_version_id]);
    await client.query(
      `insert into insight_share_event(tenant_id, organization_id, insight_id, action, from_sharing, to_sharing, actor_label, actor_access_id, version_id)
       values ($1,$2,$3,'shared',$4,'SHARED',$5,$6,$7)`,
      [tenantId, organizationId, insightId, cur.sharing, actorLabel, actorAccessId, cur.current_version_id]);
    return { ok: true, sharing: 'SHARED', versionId: cur.current_version_id, updated: wasShared };
  }).then(async (res) => {
    // Audit outside the txn so an audit hiccup never rolls back a real share (audit is best-effort).
    if (res.ok && !res.already) {
      await recordAudit({
        tenantId, action: res.updated ? 'customer_insight_share_updated' : 'customer_insight_shared',
        entityType: 'customer_insight', entityId: insightId,
        meta: { organizationId, by: actorLabel || 'customer' },
      });
    }
    return res;
  });
}

// SHARED → PRIVATE (withdraw). The customer stays in control (§12): what was shared can be taken
// back, which immediately removes it from the internal authorized context (sharedContextForOrg no
// longer returns it). Audited so the withdrawal is traceable (§18).
export async function revokeInsight(tenantId, organizationId, insightId, { actorLabel = null, actorAccessId = null } = {}) {
  return withTransaction(async (client) => {
    const cur = (await client.query(
      `select id, sharing, shared_version_id from customer_insight
        where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived' for update`,
      [insightId, tenantId, organizationId])).rows[0];
    if (!cur) return { ok: false, error: 'not_found' };
    if (cur.sharing !== 'SHARED') return { ok: true, already: true, sharing: cur.sharing };

    // Withdraw: clear the version binding too, so nothing of this insight remains internally visible.
    await client.query(
      `update customer_insight
          set sharing='PRIVATE', shared_version_id=null, revoked_at=now(), updated_at=now()
        where id=$1 and tenant_id=$2 and organization_id=$3`,
      [insightId, tenantId, organizationId]);
    await client.query(
      `insert into insight_share_event(tenant_id, organization_id, insight_id, action, from_sharing, to_sharing, actor_label, actor_access_id, version_id)
       values ($1,$2,$3,'revoked','SHARED','PRIVATE',$4,$5,$6)`,
      [tenantId, organizationId, insightId, actorLabel, actorAccessId, cur.shared_version_id]);
    return { ok: true, sharing: 'PRIVATE' };
  }).then(async (res) => {
    if (res.ok && !res.already) {
      await recordAudit({
        tenantId, action: 'customer_insight_revoked', entityType: 'customer_insight', entityId: insightId,
        meta: { organizationId, by: actorLabel || 'customer' },
      });
    }
    return res;
  });
}
