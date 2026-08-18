// Mijn Maculis — customer access resolution (§17 tenant/organization isolation).
//
// A customer enters Mijn Maculis with an opaque access token, exactly like a tester opens their
// personal ?p= link: 256 bits of entropy, no PII encoded, and the RAW token is never stored — only
// its SHA-256. Resolving a presented token yields the single { tenantId, organizationId } it is
// bound to. Everything the customer can read or share is scoped to that pair, server-side, so a
// customer can never see another organization's data even by manipulating ids or URLs.

import { randomBytes, createHash } from 'node:crypto';
import { query } from '../comm/db.mjs';

export function generateAccessToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

// Create (or reuse) an access grant for an organization and return the RAW token once. The raw token
// is returned to the caller (to hand to the customer) but only its hash is persisted.
export async function createAccess(tenantId, organizationId, { label = null, role = 'Klantadmin', isPreview = false, token = null } = {}) {
  const raw = token || generateAccessToken();
  const hash = hashToken(raw);
  const r = await query(
    `insert into customer_access(tenant_id, organization_id, token_hash, label, role, is_preview)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (token_hash) do update set label=excluded.label, role=excluded.role
     returning id`,
    [tenantId, organizationId, hash, label, role, isPreview]);
  return { id: r.rows[0].id, token: raw };
}

// Resolve a presented token to its access grant. Returns null for an unknown or revoked token.
// Also stamps last_seen_at (best-effort) so a grant's use is observable without logging the token.
export async function resolveAccess(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const hash = hashToken(token);
  const r = await query(
    `select ca.id, ca.tenant_id, ca.organization_id, ca.label, ca.role, ca.is_preview,
            o.name as organization_name
       from customer_access ca
       join organization o on o.id = ca.organization_id
      where ca.token_hash=$1 and ca.revoked_at is null`,
    [hash]);
  const row = r.rows[0];
  if (!row) return null;
  query('update customer_access set last_seen_at=now() where id=$1', [row.id]).catch(() => {});
  return {
    accessId: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    label: row.label,
    role: row.role,
    isPreview: row.is_preview,
  };
}
