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
// internal evidence/confidence trail never leaves the server toward the customer.
const CUSTOMER_FIELDS =
  'id, title, stance, observation, meaning, basis, not_yet_known, sharing, source, status, ' +
  'attention, created_at, updated_at, shared_at';

// ---- customer-facing reads (own org: PRIVATE + SHARED) -----------------------------------------

// Every insight the customer of this org may see (their own PRIVATE plus what they already SHARED).
export async function visibleInsights(tenantId, organizationId) {
  const r = await query(
    `select ${CUSTOMER_FIELDS} from customer_insight
      where tenant_id=$1 and organization_id=$2 and status <> 'archived'
      order by attention desc, updated_at desc`,
    [tenantId, organizationId]);
  return r.rows;
}

// A single insight, strictly scoped to the customer's own org. Returns null when the id belongs to
// another organization or tenant — this is what makes direct URL/id manipulation leak nothing.
export async function insightForCustomer(tenantId, organizationId, insightId) {
  const r = await query(
    `select ${CUSTOMER_FIELDS} from customer_insight
      where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived'`,
    [insightId, tenantId, organizationId]);
  return r.rows[0] || null;
}

// ---- internal / Cockpit reads (SHARED only — the hard boundary) --------------------------------

// The ONLY customer-insight data the internal side is ever allowed to see: what the customer
// deliberately shared, plus aggregated patterns. PRIVATE is excluded in SQL. This is imported by the
// AI context engine so that authorized context can, by construction, never contain PRIVATE data.
export async function sharedContextForOrg(tenantId, organizationId) {
  if (!organizationId) return [];
  const r = await query(
    `select id, title, stance, observation, meaning, status, sharing, shared_at
       from customer_insight
      where tenant_id=$1 and organization_id=$2
        and sharing in ('SHARED','AGGREGATED') and status <> 'archived'
      order by shared_at desc nulls last, updated_at desc`,
    [tenantId, organizationId]);
  return r.rows;
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
      `select id, sharing, title from customer_insight
        where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived' for update`,
      [insightId, tenantId, organizationId])).rows[0];
    if (!cur) return { ok: false, error: 'not_found' };
    if (cur.sharing === 'SHARED') return { ok: true, already: true, sharing: 'SHARED' };

    await client.query(
      `update customer_insight
          set sharing='SHARED', shared_at=now(), shared_by=$4, revoked_at=null, updated_at=now()
        where id=$1 and tenant_id=$2 and organization_id=$3`,
      [insightId, tenantId, organizationId, actorLabel]);
    await client.query(
      `insert into insight_share_event(tenant_id, organization_id, insight_id, action, from_sharing, to_sharing, actor_label, actor_access_id)
       values ($1,$2,$3,'shared',$4,'SHARED',$5,$6)`,
      [tenantId, organizationId, insightId, cur.sharing, actorLabel, actorAccessId]);
    return { ok: true, sharing: 'SHARED' };
  }).then(async (res) => {
    // Audit outside the txn so an audit hiccup never rolls back a real share (audit is best-effort).
    if (res.ok && !res.already) {
      await recordAudit({
        tenantId, action: 'customer_insight_shared', entityType: 'customer_insight', entityId: insightId,
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
      `select id, sharing from customer_insight
        where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived' for update`,
      [insightId, tenantId, organizationId])).rows[0];
    if (!cur) return { ok: false, error: 'not_found' };
    if (cur.sharing !== 'SHARED') return { ok: true, already: true, sharing: cur.sharing };

    await client.query(
      `update customer_insight
          set sharing='PRIVATE', revoked_at=now(), updated_at=now()
        where id=$1 and tenant_id=$2 and organization_id=$3`,
      [insightId, tenantId, organizationId]);
    await client.query(
      `insert into insight_share_event(tenant_id, organization_id, insight_id, action, from_sharing, to_sharing, actor_label, actor_access_id)
       values ($1,$2,$3,'revoked','SHARED','PRIVATE',$4,$5)`,
      [tenantId, organizationId, insightId, actorLabel, actorAccessId]);
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
