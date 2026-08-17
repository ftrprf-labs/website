// Communication Layer — ATTENTION ITEMS / colleague work (Slice 5: collaborative cockpit).
//
// The one service through which AUTHORED work enters the cockpit: something a colleague (a human, or
// a digital colleague/agent) observed, prepared or proposes. Derived attention (inbound, follow-ups,
// silence) stays in signals.mjs; this module is for work that is NOT derivable from state and must be
// persisted with its evidence and proposal.
//
// This module IS the integration contract for the separate agent domain (§ ARCHITECTUURREGEL: one
// reality). Agents call recordWorkItem() with references to EXISTING domain objects (contact,
// organization, conversation, follow_up) — never a copied relation. A not-yet-created lead rides as a
// `proposedRelation` payload and only becomes a real contact when a human approves it. Human in the
// loop throughout: nothing here sends anything external; approving is an internal state change.

import { query } from './db.mjs';
import { recordAudit } from './audit.mjs';
import { recordActivity } from './activity.mjs';

export const WORK_ORIGIN_KINDS = ['HUMAN', 'AGENT', 'SYSTEM'];
export const WORK_TYPES = ['AGENT_FINDING', 'AGENT_PROPOSAL', 'APPROVAL_REQUIRED', 'AGENT_RESULT'];
export const WORK_ACTIONS = ['view', 'approve', 'edit', 'take_over', 'reject', 'complete'];

// What the human can do with a piece of work follows from what it NEEDS, not from its object type.
//   approval  → a colleague waits for your go-ahead to act (NU).
//   review    → a colleague prepared something for you to check or take over (KLAAR).
//   awareness → a colleague surfaced something you should simply know (RADAR).
const NEEDS_DEFAULTS = {
  approval:  { bucket: 'NU',    priority: 85, actions: ['view', 'approve', 'edit', 'reject'] },
  review:    { bucket: 'KLAAR', priority: 55, actions: ['view', 'take_over', 'complete', 'reject'] },
  awareness: { bucket: 'RADAR', priority: 25, actions: ['view', 'complete'] },
};
const needsOf = (proposal) => (proposal && NEEDS_DEFAULTS[proposal.needs]) ? proposal.needs : 'awareness';

// Record a piece of colleague work. Idempotent per (tenant, origin_key, dedupKey): the same colleague
// re-reporting the same finding updates in place instead of stacking (no agent-spam at the source).
export async function recordWorkItem(tenantId, input = {}) {
  const origin = input.origin || {};
  if (!origin.key) return { ok: false, reason: 'no_origin' };
  if (!input.type || !WORK_TYPES.includes(input.type)) return { ok: false, reason: 'bad_type' };
  if (!input.title || !String(input.title).trim()) return { ok: false, reason: 'no_title' };

  const needs = needsOf(input.proposal);
  const d = NEEDS_DEFAULTS[needs];
  const bucket = input.bucket || d.bucket;
  const priority = Number.isFinite(input.priority) ? input.priority : d.priority;
  const owner = input.owner || { kind: 'HUMAN', key: null };
  const rel = input.relation || {};
  const evidence = input.evidence || {};
  const proposal = { ...(input.proposal || {}), needs };

  // Idempotent upsert on the open dedup key.
  if (input.dedupKey) {
    const existing = (await query(
      "select id from attention_item where tenant_id=$1 and origin_key=$2 and dedup_key=$3 and status='open' limit 1",
      [tenantId, origin.key, input.dedupKey])).rows[0];
    if (existing) {
      await query(
        `update attention_item set title=$3, reason=$4, bucket=$5, priority=$6, evidence=$7::jsonb,
            proposal=$8::jsonb, type=$9, updated_at=now() where id=$1 and tenant_id=$2`,
        [existing.id, tenantId, String(input.title).trim(), input.reason || null, bucket, priority,
         JSON.stringify(evidence), JSON.stringify(proposal), input.type]);
      return { ok: true, id: existing.id, deduped: true };
    }
  }

  const ins = await query(
    `insert into attention_item(tenant_id, origin_kind, origin_key, origin_label, owner_kind, owner_key,
        type, bucket, priority, contact_id, organization_id, conversation_id, follow_up_id, proposed_relation,
        title, reason, evidence, proposal, dedup_key)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17::jsonb,$18::jsonb,$19)
     returning id`,
    [tenantId, origin.kind || 'AGENT', origin.key, origin.label || origin.key, owner.kind || 'HUMAN', owner.key || null,
     input.type, bucket, priority, rel.contactId || null, rel.organizationId || null, rel.conversationId || null,
     rel.followUpId || null, input.proposedRelation ? JSON.stringify(input.proposedRelation) : null,
     String(input.title).trim(), input.reason || null, JSON.stringify(evidence), JSON.stringify(proposal), input.dedupKey || null]);
  const id = ins.rows[0].id;
  await recordActivity({ tenantId, type: 'work_item_recorded', contactId: rel.contactId || null, organizationId: rel.organizationId || null, conversationId: rel.conversationId || null, meta: { workItemId: id, origin: origin.key, type: input.type } });
  await recordAudit({ tenantId, action: 'cockpit_work_recorded', entityType: 'attention_item', entityId: id, meta: { origin: origin.key, type: input.type, needs } });
  return { ok: true, id };
}

// Open work items, optionally scoped to one relation. Ranked (priority desc, oldest first).
export async function listWorkItems(tenantId, { contactId = null, status = 'open' } = {}) {
  return (await query(
    `select ai.*, ct.first_name, ct.last_name, o.name as org
       from attention_item ai
       left join contact ct on ct.id=ai.contact_id
       left join organization o on o.id=ai.organization_id
      where ai.tenant_id=$1 and ($2::uuid is null or ai.contact_id=$2) and ($3::text is null or ai.status=$3)
      order by ai.priority desc, ai.created_at asc limit 200`,
    [tenantId, contactId, status])).rows;
}

// Shape a work item meaning-first for the cockpit, with the actions the human may take (from `needs`).
export function shapeWorkItem(row) {
  const proposal = row.proposal || {};
  const needs = needsOf(proposal);
  const who = [row.first_name, row.last_name].filter(Boolean).join(' ') || (row.proposed_relation && row.proposed_relation.name) || null;
  return {
    id: row.id,
    kind: 'work',
    origin: { kind: row.origin_kind, key: row.origin_key, label: row.origin_label },
    owner: { kind: row.owner_kind, key: row.owner_key },
    type: row.type,
    bucket: row.bucket,
    priority: row.priority,
    contactId: row.contact_id || null,
    conversationId: row.conversation_id || null,
    followUpId: row.follow_up_id || null,
    proposedRelation: row.proposed_relation || null,
    who, org: row.org || (row.proposed_relation && row.proposed_relation.org) || null,
    title: row.title,
    reason: row.reason || null,
    evidence: row.evidence || {},
    proposal,
    needs,
    actions: NEEDS_DEFAULTS[needs].actions,
    createdAt: row.created_at,
  };
}

// Materialise a proposed lead into a real contact in the SAME reality (used on approval). Reuses plain
// inserts against the existing tables; deduped by e-mail so approving twice never doubles a relation.
async function materializeProposedRelation(tenantId, pr) {
  if (!pr) return null;
  const email = pr.email ? String(pr.email).toLowerCase() : null;
  if (email) {
    const ex = (await query('select id from contact where tenant_id=$1 and lower(email)=lower($2) limit 1', [tenantId, email])).rows[0];
    if (ex) return { contactId: ex.id, existed: true };
  }
  let orgId = null;
  if (pr.org) {
    orgId = (await query('insert into organization(tenant_id,name,primary_domain) values ($1,$2,$3) returning id', [tenantId, String(pr.org).slice(0, 200), pr.domain || null])).rows[0].id;
  }
  const parts = String(pr.name || 'Onbekend').trim().split(/\s+/);
  const first = parts[0] || 'Onbekend';
  const last = parts.slice(1).join(' ') || null;
  const cid = (await query(
    'insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,relationship_stage) values ($1,$2,$3,$4,$5,$6,$7) returning id',
    [tenantId, orgId, email || `lead:${first}:${Date.now()}`, first, last, email, 'prospect'])).rows[0].id;
  if (email) await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL',$3,true) on conflict do nothing", [tenantId, cid, email]);
  return { contactId: cid, organizationId: orgId, existed: false };
}

// Resolve a work item with a human decision. Nothing external is ever sent. Approving a proposed lead
// creates the real relation and links it. Returns { ok, item, result }.
export async function resolveWorkItem(tenantId, id, action, { actorKey = null, edit = null } = {}) {
  if (!WORK_ACTIONS.includes(action)) return { ok: false, reason: 'bad_action' };
  const row = (await query('select * from attention_item where id=$1 and tenant_id=$2', [id, tenantId])).rows[0];
  if (!row) return { ok: false, reason: 'not_found' };
  if (action === 'view') return { ok: true, item: shapeWorkItem(row) };
  if (row.status !== 'open') return { ok: false, reason: 'already_' + row.status };

  let result = {};
  let status = row.status;
  if (action === 'approve') {
    status = 'approved';
    if (row.proposed_relation && !row.contact_id) {
      const made = await materializeProposedRelation(tenantId, row.proposed_relation);
      if (made) { result.createdContactId = made.contactId; result.relationExisted = !!made.existed;
        await query('update attention_item set contact_id=$2, organization_id=coalesce(organization_id,$3) where id=$1', [id, made.contactId, made.organizationId || null]); }
    }
  } else if (action === 'reject') {
    status = 'rejected';
  } else if (action === 'complete') {
    status = 'done';
  } else if (action === 'take_over') {
    // Ownership moves to the human; the work stays open, now owned by a person.
    await query("update attention_item set owner_kind='HUMAN', owner_key=$2, updated_at=now() where id=$1", [id, actorKey || 'human']);
    result.owner = { kind: 'HUMAN', key: actorKey || 'human' };
  } else if (action === 'edit') {
    // The human adjusts the proposal/title; the item stays open for a later approve.
    const proposal = { ...(row.proposal || {}), ...(edit && edit.proposal ? edit.proposal : {}) };
    await query('update attention_item set title=coalesce($2,title), reason=coalesce($3,reason), proposal=$4::jsonb, status=$5, updated_at=now() where id=$1',
      [id, edit && edit.title ? edit.title : null, edit && edit.reason ? edit.reason : null, JSON.stringify(proposal), 'edited']);
    // 'edited' is a transient marker; keep it actionable by immediately reopening for approval.
    await query("update attention_item set status='open' where id=$1", [id]);
    const back = (await query('select * from attention_item where id=$1', [id])).rows[0];
    await recordAudit({ tenantId, action: 'cockpit_work_edit', entityType: 'attention_item', entityId: id, meta: { actor: actorKey } });
    return { ok: true, item: shapeWorkItem(back), result: { edited: true } };
  }

  if (action !== 'take_over') {
    await query('update attention_item set status=$2, resolution=$3::jsonb, resolved_at=now(), resolved_by=$4, updated_at=now() where id=$1',
      [id, status, JSON.stringify(result), actorKey || 'human']);
  }
  await recordActivity({ tenantId, type: 'work_item_' + action, contactId: row.contact_id || result.createdContactId || null, organizationId: row.organization_id || null, conversationId: row.conversation_id || null, meta: { workItemId: id } });
  await recordAudit({ tenantId, action: 'cockpit_work_' + action, entityType: 'attention_item', entityId: id, meta: { actor: actorKey, result } });
  const back = (await query('select * from attention_item where id=$1', [id])).rows[0];
  return { ok: true, item: shapeWorkItem(back), result };
}
