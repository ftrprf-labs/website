// Communication Layer — append-only audit trail.
//
// Records relevant human and system actions (message sent, privacy access, draft used, …). Never
// stores message bodies or secrets — only the minimal facts needed for accountability. Privacy
// mailbox access is ALWAYS audited (§14).

import { query } from './db.mjs';

export async function recordAudit({ actorUserId = null, action, entityType = null, entityId = null, mailboxKind = null, ipRef = null, meta = {} }) {
  try {
    await query(
      `insert into audit_event(actor_user_id, action, entity_type, entity_id, mailbox_kind, ip_ref, meta)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [actorUserId, action, entityType, entityId ? String(entityId) : null, mailboxKind, ipRef, JSON.stringify(meta || {})]);
  } catch { /* auditing must never break the primary action */ }
}

export async function listAudit({ entityType, entityId, limit = 100 } = {}) {
  const res = await query(
    `select id, actor_user_id, action, entity_type, entity_id, mailbox_kind, meta, at
       from audit_event
      where ($1::text is null or entity_type=$1) and ($2::text is null or entity_id=$2)
      order by at desc limit $3`, [entityType || null, entityId ? String(entityId) : null, limit]);
  return res.rows;
}
