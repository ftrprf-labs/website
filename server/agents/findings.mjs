// Digital Colleagues — findings + evidence (the provenance / epistemic model).
//
// A finding is something a colleague FOUND. It is a PROPOSAL, never confirmed relational truth. It
// carries an epistemic status (OBSERVATION | INFERENCE | HYPOTHESIS | PROPOSAL), a confidence, WHY
// it may fit, a proposed next action, and whether a human must approve. Evidence rows record where
// each claim came from, with an explicit source_type — nothing is invented (§FASE 2, §FASE 4).
//
// Promotion is the ONLY path from a finding to a lead, and it is a HUMAN action: it lands in the
// shared truth as organization/contact with relationship_stage='LEAD' plus a PROPOSED
// relationship_memory. The individual claims stay proposed until separately confirmed, so found
// information, inference and confirmed relational state stay distinct.

import { query, withTransaction } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';
import { recordActivity } from '../comm/activity.mjs';
import { addMemory } from '../comm/memory.mjs';
import { upsertOrganizationTx, resolveContactTx } from '../comm/repo.mjs';
import { orgSignal } from '../comm/identity.mjs';

// Create a finding with its evidence. Idempotent per (work_item, subject_key): a re-run updates the
// existing finding instead of duplicating a candidate. Evidence is (re)attached fresh.
export async function addFinding(tenantId, {
  workItemId, agentRunId = null, actorId = null, kind = 'lead_candidate',
  subjectType = 'organization', subjectKey, title, summary = null,
  epistemicStatus = 'OBSERVATION', confidence = null,
  organizationId = null, contactId = null, alreadyKnown = false,
  proposedAction = {}, approvalRequired = true, evidence = [],
}) {
  if (!title || !subjectKey) return { ok: false, reason: 'title_and_subject_required' };
  return withTransaction(async (client) => {
    const up = await client.query(
      `insert into agent_finding(tenant_id, work_item_id, agent_run_id, actor_id, kind, subject_type,
          subject_key, title, summary, epistemic_status, confidence, organization_id, contact_id,
          already_known, proposed_action, approval_required)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16)
       on conflict (tenant_id, work_item_id, subject_key) where subject_key is not null
       do update set summary=excluded.summary, epistemic_status=excluded.epistemic_status,
          confidence=excluded.confidence, organization_id=coalesce(agent_finding.organization_id, excluded.organization_id),
          already_known=excluded.already_known, proposed_action=excluded.proposed_action,
          approval_required=excluded.approval_required, agent_run_id=excluded.agent_run_id, updated_at=now()
       returning id, (xmax = 0) as inserted`,
      [tenantId, workItemId, agentRunId, actorId, kind, subjectType, subjectKey, title, summary,
       epistemicStatus, confidence, organizationId, contactId, alreadyKnown,
       JSON.stringify(proposedAction || {}), approvalRequired]);
    const findingId = up.rows[0].id;
    // Refresh evidence for this finding (idempotent re-run): remove and re-insert.
    await client.query('delete from agent_evidence where finding_id=$1', [findingId]);
    for (const ev of evidence || []) {
      await client.query(
        `insert into agent_evidence(tenant_id, finding_id, source_type, source_ref, detail, provider)
         values ($1,$2,$3,$4::jsonb,$5,$6)`,
        [tenantId, findingId, ev.sourceType || 'internal_db', JSON.stringify(ev.sourceRef || {}), ev.detail || null, ev.provider || null]);
    }
    if (up.rows[0].inserted) {
      await recordAudit({ tenantId, action: 'finding_created', entityType: 'agent_finding', entityId: findingId, meta: { agent: true, kind, subject_key: subjectKey, already_known: alreadyKnown } });
      await recordActivity({ tenantId, type: 'agent_finding', organizationId, contactId, meta: { finding_id: findingId, title, kind } });
    }
    return { ok: true, id: findingId, created: Boolean(up.rows[0].inserted) };
  });
}

export async function getFinding(tenantId, id) {
  const f = await query(
    `select f.*, a.slug as actor_slug, a.display_name as actor_name
       from agent_finding f left join actor a on a.id=f.actor_id
      where f.tenant_id=$1 and f.id=$2`, [tenantId, id]);
  if (!f.rows[0]) return null;
  const ev = await query('select source_type, source_ref, detail, provider, retrieved_at from agent_evidence where finding_id=$1 order by created_at', [id]);
  return { ...f.rows[0], evidence: ev.rows };
}

export async function listFindings(tenantId, { status = null, kind = null, workItemId = null, organizationId = null, limit = 100, withEvidence = false } = {}) {
  const rows = (await query(
    `select f.id, f.work_item_id, f.kind, f.subject_type, f.subject_key, f.title, f.summary,
            f.epistemic_status, f.confidence, f.organization_id, f.contact_id, f.already_known,
            f.proposed_action, f.approval_required, f.status, f.created_at,
            a.slug as actor_slug, a.display_name as actor_name
       from agent_finding f left join actor a on a.id=f.actor_id
      where f.tenant_id=$1
        and ($2::text is null or f.status=$2)
        and ($3::text is null or f.kind=$3)
        and ($4::uuid is null or f.work_item_id=$4)
        and ($5::uuid is null or f.organization_id=$5)
      order by f.created_at desc limit $6`,
    [tenantId, status, kind, workItemId, organizationId, limit])).rows;
  if (!withEvidence) return rows;
  for (const r of rows) {
    r.evidence = (await query('select source_type, source_ref, detail, provider from agent_evidence where finding_id=$1 order by created_at', [r.id])).rows;
  }
  return rows;
}

// HUMAN action: promote a finding to a lead in the shared truth. Creates/links the organization
// (and optionally a contact), sets relationship_stage='LEAD', and writes a PROPOSED memory. The
// colleague never calls this; only an authorised human route does.
export async function promoteFinding(tenantId, id, { userId = null, note = null } = {}) {
  const finding = await getFinding(tenantId, id);
  if (!finding) return { ok: false, reason: 'not_found' };
  if (finding.status === 'promoted') return { ok: true, already: true, organizationId: finding.organization_id, contactId: finding.contact_id };

  const pa = finding.proposed_action || {};
  const domain = pa.domain || null;
  const person = pa.person || null;

  const result = await withTransaction(async (client) => {
    let organizationId = finding.organization_id;
    if (!organizationId && finding.subject_type === 'organization') {
      organizationId = await upsertOrganizationTx(client, tenantId, orgSignal({ company_name: finding.title, domain }));
    }
    if (organizationId) {
      await client.query(
        `update organization set relationship_stage=coalesce(relationship_stage,'LEAD'), updated_at=now()
          where id=$1 and tenant_id=$2 and (relationship_stage is null or relationship_stage in ('LEAD','PROSPECT'))`,
        [organizationId, tenantId]);
    }
    let contactId = finding.contact_id;
    if (!contactId && person && (person.email || person.mobile)) {
      const c = await resolveContactTx(client, tenantId, {
        first_name: person.first_name || null, last_name: person.last_name || null,
        email: person.email || null, mobile: person.mobile || null,
        company_name: finding.title, role: person.role || null,
      });
      if (c) {
        contactId = c.id;
        await client.query(
          `update contact set relationship_stage=coalesce(relationship_stage,'LEAD'), organization_id=coalesce(organization_id,$3), updated_at=now()
            where id=$1 and tenant_id=$2`, [contactId, tenantId, organizationId]);
      }
    }
    await client.query(
      `update agent_finding set status='promoted', organization_id=coalesce(organization_id,$3),
          contact_id=coalesce(contact_id,$4), decided_by=$5, decided_at=now(), decision_note=$6, updated_at=now()
        where tenant_id=$1 and id=$2`, [tenantId, id, organizationId, contactId, userId, note]);
    return { organizationId, contactId };
  });

  // A PROPOSED memory: the human confirmed "this is a lead worth pursuing", but the underlying
  // claims Scout found stay proposed until separately confirmed.
  await addMemory(tenantId, {
    organizationId: result.organizationId, contactId: result.contactId,
    kind: 'fact', content: `Als lead opgenomen via ${finding.actor_name || 'Scout'}. ${finding.summary || finding.title}`,
    source: 'ai', confidence: 'proposed', sourceRef: { type: 'agent_finding', id }, createdBy: userId,
  });
  await recordAudit({ tenantId, actorUserId: userId, action: 'finding_promoted', entityType: 'agent_finding', entityId: id, meta: { organization_id: result.organizationId, contact_id: result.contactId } });
  await recordActivity({ tenantId, type: 'lead_promoted', organizationId: result.organizationId, contactId: result.contactId, actorUserId: userId, meta: { finding_id: id } });
  return { ok: true, ...result };
}

// HUMAN action: dismiss a finding with a reason (this trains the colleague; success metrics use it).
export async function dismissFinding(tenantId, id, { userId = null, note = null } = {}) {
  const r = await query(
    `update agent_finding set status='dismissed', decided_by=$3, decided_at=now(), decision_note=$4, updated_at=now()
      where tenant_id=$1 and id=$2 and status in ('new','accepted') returning id`, [tenantId, id, userId, note]);
  if (!r.rows[0]) return { ok: false, reason: 'not_found_or_decided' };
  await recordAudit({ tenantId, actorUserId: userId, action: 'finding_dismissed', entityType: 'agent_finding', entityId: id, meta: { note: note ? true : false } });
  return { ok: true };
}
