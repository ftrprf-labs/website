// Communication Layer — Relationship Memory store (§RELATIONSHIP MEMORY).
//
// A safe, bounded memory of the relationship: structured facts / agreements / preferences /
// reminders, distinct from raw conversation history and from follow-ups. Provenance is explicit:
// AI-derived items are 'ai' + 'proposed' and are shown as suggestions until a human confirms —
// they are NEVER silently treated as hard fact. Feeds the bounded Context Engine (purpose-limited).

import { query } from './db.mjs';
import { recordActivity } from './activity.mjs';

export async function addMemory(tenantId, { organizationId = null, contactId = null, conversationId = null, kind = 'fact', content, source = 'human', confidence = null, validUntil = null, sourceRef = {}, createdBy = null }) {
  if (!content || !String(content).trim()) return { ok: false, reason: 'empty' };
  const conf = confidence || (source === 'ai' ? 'proposed' : 'confirmed');
  const ins = await query(
    `insert into relationship_memory(tenant_id, organization_id, contact_id, conversation_id, kind, content, source, confidence, valid_until, source_ref, created_by, confirmed_at, confirmed_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::uuid, case when $7='human' then now() else null end, case when $7='human' then $11::uuid else null end)
     returning id`,
    [tenantId, organizationId, contactId, conversationId, kind, String(content).trim(), source, conf, validUntil, JSON.stringify(sourceRef || {}), createdBy]);
  await recordActivity({ tenantId, type: 'memory_added', contactId, organizationId, conversationId, actorUserId: createdBy, meta: { kind, source, confidence: conf } });
  return { ok: true, id: ins.rows[0].id, confidence: conf };
}

export async function confirmMemory(tenantId, id, userId = null) {
  const r = await query("update relationship_memory set confidence='confirmed', confirmed_by=$3, confirmed_at=now(), updated_at=now() where id=$1 and tenant_id=$2 and superseded_at is null returning contact_id, organization_id", [id, tenantId, userId]);
  if (!r.rows[0]) return { ok: false, reason: 'not_found' };
  await recordActivity({ tenantId, type: 'memory_confirmed', contactId: r.rows[0].contact_id, organizationId: r.rows[0].organization_id, actorUserId: userId, meta: { id } });
  return { ok: true };
}

export async function dismissMemory(tenantId, id) {
  await query('update relationship_memory set superseded_at=now(), updated_at=now() where id=$1 and tenant_id=$2', [id, tenantId]);
  return { ok: true };
}

// Active memory for a contact/org. Confirmed items are facts; proposed items are AI suggestions —
// callers (and the UI) must keep that distinction visible.
export async function listMemory(tenantId, { contactId = null, organizationId = null, includeProposed = true } = {}) {
  return (await query(
    `select id, kind, content, source, confidence, valid_until, source_ref, created_at
       from relationship_memory
      where tenant_id=$1 and superseded_at is null
        and ($2::uuid is null or contact_id=$2) and ($3::uuid is null or organization_id=$3)
        and (valid_until is null or valid_until > now())
        and ($4 or confidence='confirmed')
      order by (confidence='proposed'), created_at desc limit 50`,
    [tenantId, contactId, organizationId, includeProposed])).rows;
}
