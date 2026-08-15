// Communication Layer — follow-ups / lightweight tasks (§34).
// Just enough so communication never disappears; not a project-management system.

import { query } from './db.mjs';
import { recordActivity } from './activity.mjs';

export async function createFollowUp(tenantId, { organizationId = null, contactId = null, conversationId = null, ownerUserId = null, title, note = null, channelHint = null, dueAt = null, createdBy = null }) {
  if (!title || !String(title).trim()) return { ok: false, reason: 'no_title' };
  const ins = await query(
    `insert into follow_up(tenant_id, organization_id, contact_id, conversation_id, owner_user_id, title, note, channel_hint, due_at, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [tenantId, organizationId, contactId, conversationId, ownerUserId, String(title).trim(), note, channelHint, dueAt, createdBy]);
  await recordActivity({ tenantId, type: 'follow_up_created', contactId, organizationId, conversationId, actorUserId: createdBy, meta: { followUpId: ins.rows[0].id, title, dueAt } });
  return { ok: true, id: ins.rows[0].id };
}

export async function updateFollowUp(tenantId, id, { status, dueAt, title, note }) {
  const cur = (await query('select * from follow_up where id=$1 and tenant_id=$2', [id, tenantId])).rows[0];
  if (!cur) return { ok: false, reason: 'not_found' };
  const completedAt = status === 'done' ? 'now()' : (status ? 'null' : null);
  await query(
    `update follow_up set
        status = coalesce($3, status),
        due_at = coalesce($4, due_at),
        title  = coalesce($5, title),
        note   = coalesce($6, note),
        completed_at = ${completedAt === null ? 'completed_at' : completedAt}
      where id=$1 and tenant_id=$2`,
    [id, tenantId, status || null, dueAt || null, title || null, note || null]);
  if (status === 'done') await recordActivity({ tenantId, type: 'follow_up_done', contactId: cur.contact_id, organizationId: cur.organization_id, conversationId: cur.conversation_id, meta: { followUpId: id } });
  return { ok: true };
}

// Open follow-ups, optionally scoped to a contact/org, else the whole attention queue (due first).
export async function listFollowUps(tenantId, { contactId = null, organizationId = null, status = 'open' } = {}) {
  return (await query(
    `select f.id, f.title, f.note, f.channel_hint, f.due_at, f.status, f.contact_id, f.organization_id, f.conversation_id,
            ct.first_name, ct.last_name, o.name as org,
            (f.status='open' and f.due_at is not null and f.due_at < now()) as overdue
       from follow_up f
       left join contact ct on ct.id=f.contact_id
       left join organization o on o.id=f.organization_id
      where f.tenant_id=$1 and ($2::uuid is null or f.contact_id=$2) and ($3::uuid is null or f.organization_id=$3)
        and ($4::text is null or f.status=$4)
      order by (f.due_at is null), f.due_at asc limit 200`,
    [tenantId, contactId, organizationId, status])).rows;
}
