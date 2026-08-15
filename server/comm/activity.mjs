// Communication Layer — unified activity timeline (§12).
//
// Not everything is a message. Invitations, journey milestones, sends, assignments, merges,
// consent changes, delivery failures … all land here so a Contact/Organization can show ONE
// chronological relationship history across channels. Best-effort: never breaks the primary action.

import { query } from './db.mjs';
import { getDefaultTenantId } from './tenant.mjs';

export async function recordActivity({ tenantId, type, channel = null, actorUserId = null, organizationId = null, contactId = null, conversationId = null, meta = {} }) {
  try {
    const tid = tenantId || await getDefaultTenantId();
    await query(
      `insert into activity(tenant_id, organization_id, contact_id, conversation_id, type, channel, actor_user_id, meta)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [tid, organizationId, contactId, conversationId, type, channel, actorUserId, JSON.stringify(meta || {})]);
  } catch { /* timeline is observational — never break the primary write */ }
}

// One chronological timeline for a contact (messages + activities are merged in the read model;
// this returns the activity rows). RBAC/tenant scoping is applied by the caller's tenant.
export async function contactTimeline(tenantId, contactId, limit = 200) {
  const res = await query(
    `select type, channel, meta, at from activity where tenant_id=$1 and contact_id=$2 order by at desc limit $3`,
    [tenantId, contactId, limit]);
  return res.rows;
}
