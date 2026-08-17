// Digital Colleagues — work items (the shared work object).
//
// Work is a first-class object so we always know: what work exists, why, who created it, who owns
// it, its status, what it used, and what state transition it produced (§FASE 2). This does NOT
// duplicate follow_up (a light human reminder) or ai_draft (a concrete output): a work_item is the
// unit a colleague or human is accountable for. Tenant-scoped; best-effort audit/activity never
// breaks the primary write.

import { query, withTransaction } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

const OPEN_STATUSES = ['proposed', 'assigned', 'in_progress', 'awaiting_human'];

// Create a work item. dedupeKey makes external triggers idempotent: the same trigger never spawns
// two work items (returns the existing one).
export async function createWorkItem(tenantId, {
  type, objective, createdBy = null, assignedTo = null, assignedRole = null,
  organizationId = null, contactId = null, conversationId = null,
  sourceSignalRefs = [], input = {}, priority = null, approvalRequired = false, dedupeKey = null, dueAt = null,
}) {
  if (!type || !objective) return { ok: false, reason: 'type_and_objective_required' };
  if (dedupeKey) {
    const existing = await query('select id, status from work_item where tenant_id=$1 and dedupe_key=$2', [tenantId, dedupeKey]);
    if (existing.rows[0]) return { ok: true, id: existing.rows[0].id, created: false, status: existing.rows[0].status };
  }
  const ins = await query(
    `insert into work_item(tenant_id, type, objective, created_by, assigned_to, assigned_role,
        organization_id, contact_id, conversation_id, source_signal_refs, input, priority,
        approval_required, dedupe_key, due_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15) returning id, status`,
    [tenantId, type, objective, createdBy, assignedTo, assignedRole, organizationId, contactId,
     conversationId, JSON.stringify(sourceSignalRefs || []), JSON.stringify(input || {}), priority,
     approvalRequired, dedupeKey, dueAt]);
  const id = ins.rows[0].id;
  await recordAudit({ tenantId, action: 'work_item_created', entityType: 'work_item', entityId: id, meta: { type, agent: Boolean(createdBy) } });
  return { ok: true, id, created: true, status: ins.rows[0].status };
}

export async function getWorkItem(tenantId, id) {
  const r = await query(
    `select w.*, a.slug as assigned_slug, a.display_name as assigned_name
       from work_item w left join actor a on a.id=w.assigned_to
      where w.tenant_id=$1 and w.id=$2`, [tenantId, id]);
  return r.rows[0] || null;
}

export async function listWorkItems(tenantId, { type = null, status = null, assignedTo = null, assignedRole = null, organizationId = null, limit = 100 } = {}) {
  const r = await query(
    `select w.id, w.type, w.objective, w.status, w.priority, w.assigned_role, w.approval_required,
            w.organization_id, w.contact_id, w.output, w.created_at, w.completed_at,
            a.slug as assigned_slug, a.display_name as assigned_name
       from work_item w left join actor a on a.id=w.assigned_to
      where w.tenant_id=$1
        and ($2::text is null or w.type=$2)
        and ($3::text is null or w.status=$3)
        and ($4::uuid is null or w.assigned_to=$4)
        and ($5::text is null or w.assigned_role=$5)
        and ($6::uuid is null or w.organization_id=$6)
      order by w.created_at desc limit $7`,
    [tenantId, type, status, assignedTo, assignedRole, organizationId, limit]);
  return r.rows;
}

export async function assignWorkItem(tenantId, id, { assignedTo = null, assignedRole = null }) {
  const r = await query(
    `update work_item set assigned_to=coalesce($3, assigned_to), assigned_role=coalesce($4, assigned_role),
        status=case when status='proposed' then 'assigned' else status end, updated_at=now()
      where tenant_id=$1 and id=$2 returning id, status`, [tenantId, id, assignedTo, assignedRole]);
  return r.rows[0] ? { ok: true, status: r.rows[0].status } : { ok: false, reason: 'not_found' };
}

// Move a work item to a new status, recording the transition. completed_at set on terminal states.
export async function setWorkStatus(tenantId, id, status, { output = null } = {}) {
  const terminal = ['done', 'superseded', 'cancelled', 'failed'];
  const r = await query(
    `update work_item set status=$3, updated_at=now(),
        output=coalesce($4::jsonb, output),
        completed_at=case when $3 = any($5) then now() else completed_at end
      where tenant_id=$1 and id=$2 returning id, status`,
    [tenantId, id, status, output ? JSON.stringify(output) : null, terminal]);
  if (!r.rows[0]) return { ok: false, reason: 'not_found' };
  await recordAudit({ tenantId, action: 'work_item_status', entityType: 'work_item', entityId: id, meta: { status } });
  return { ok: true, status };
}

export { OPEN_STATUSES };
