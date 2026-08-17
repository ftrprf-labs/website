// Digital Colleagues — Cockpit integration contract (§FASE 6).
//
// Agents must not become a parallel universe. This module is the READ surface the Cockpit (Vandaag,
// Relaties, and later a lead/organization dossier) consumes to show, in ONE place: what a colleague
// found, for whom, why, with what evidence, its status, the proposed action, and whether a human
// decision is needed. It is deliberately thin and derived: no new source of truth, just a shaped
// view over work_item / agent_finding / agent_evidence / agent_run. Tenant-scoped.

import { query } from '../comm/db.mjs';

// Shape one finding row into the stable Cockpit contract.
function shapeFinding(f) {
  return {
    id: f.id,
    workItemId: f.work_item_id,
    kind: f.kind,
    title: f.title,
    relevance: f.summary,
    colleague: { slug: f.actor_slug || null, name: f.actor_name || null },
    organizationId: f.organization_id || null,
    contactId: f.contact_id || null,
    alreadyKnown: f.already_known,
    epistemicStatus: f.epistemic_status,     // OBSERVATION | INFERENCE | HYPOTHESIS | PROPOSAL
    confidence: f.confidence != null ? Number(f.confidence) : null,
    proposedAction: f.proposed_action || {},
    decisionRequired: f.status === 'new' && f.approval_required,
    status: f.status,
    evidence: (f.evidence || []).map((e) => ({ sourceType: e.source_type, sourceRef: e.source_ref, detail: e.detail, provider: e.provider })),
    createdAt: f.created_at,
  };
}

// Prepared work that wants a human on Vandaag: findings still awaiting a decision. Optional role
// filter routes to the responsible role (e.g. business development) once per-user routing exists.
export async function preparedWorkForCockpit(tenantId, { status = 'new', role = null, limit = 50 } = {}) {
  const rows = (await query(
    `select f.id, f.work_item_id, f.kind, f.subject_type, f.title, f.summary, f.epistemic_status,
            f.confidence, f.organization_id, f.contact_id, f.already_known, f.proposed_action,
            f.approval_required, f.status, f.created_at, a.slug as actor_slug, a.display_name as actor_name
       from agent_finding f
       left join actor a on a.id=f.actor_id
       left join work_item w on w.id=f.work_item_id
      where f.tenant_id=$1 and ($2::text is null or f.status=$2)
        and ($3::text is null or w.assigned_role=$3 or a.role=$3)
      order by f.confidence desc nulls last, f.created_at desc
      limit $4`, [tenantId, status, role, limit])).rows;
  for (const r of rows) {
    r.evidence = (await query('select source_type, source_ref, detail, provider from agent_evidence where finding_id=$1 order by created_at', [r.id])).rows;
  }
  return rows.map(shapeFinding);
}

// What colleagues have contributed for one organization (for the Relaties / dossier view).
export async function agentContributionsForOrganization(tenantId, organizationId) {
  const rows = (await query(
    `select f.id, f.work_item_id, f.kind, f.subject_type, f.title, f.summary, f.epistemic_status,
            f.confidence, f.organization_id, f.contact_id, f.already_known, f.proposed_action,
            f.approval_required, f.status, f.created_at, a.slug as actor_slug, a.display_name as actor_name
       from agent_finding f left join actor a on a.id=f.actor_id
      where f.tenant_id=$1 and f.organization_id=$2 order by f.created_at desc limit 50`,
    [tenantId, organizationId])).rows;
  for (const r of rows) {
    r.evidence = (await query('select source_type, source_ref, detail, provider from agent_evidence where finding_id=$1 order by created_at', [r.id])).rows;
  }
  return rows.map(shapeFinding);
}

// What colleagues have contributed for one contact.
export async function agentContributionsForContact(tenantId, contactId) {
  const rows = (await query(
    `select f.id, f.work_item_id, f.kind, f.subject_type, f.title, f.summary, f.epistemic_status,
            f.confidence, f.organization_id, f.contact_id, f.already_known, f.proposed_action,
            f.approval_required, f.status, f.created_at, a.slug as actor_slug, a.display_name as actor_name
       from agent_finding f left join actor a on a.id=f.actor_id
      where f.tenant_id=$1 and f.contact_id=$2 order by f.created_at desc limit 50`,
    [tenantId, contactId])).rows;
  return rows.map(shapeFinding);
}

// Compact counters for a Vandaag header: what colleagues discovered, prepared, and where a human
// decision is needed. Calm by design: this never invents urgency.
export async function cockpitSummary(tenantId) {
  const r = (await query(
    `select
        count(*) filter (where status='new') as awaiting_decision,
        count(*) filter (where status='new' and (proposed_action->>'kind')='prepare_intro') as prepared,
        count(*) filter (where status='promoted') as promoted,
        count(*) filter (where already_known=true and status='new') as touches_known_relationship
       from agent_finding where tenant_id=$1`, [tenantId])).rows[0];
  return {
    awaitingDecision: Number(r.awaiting_decision || 0),
    prepared: Number(r.prepared || 0),
    promoted: Number(r.promoted || 0),
    touchesKnownRelationship: Number(r.touches_known_relationship || 0),
  };
}
