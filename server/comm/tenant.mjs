// Communication Layer — tenant resolution.
//
// Multi-tenant from the foundation: every relationship row is stamped with a tenant_id and every
// read is tenant-scoped, so cross-tenant leakage is prevented technically even though Maculis is
// the only tenant today. White-label/multi-tenant can be added later without migrating data.

import { query } from './db.mjs';

let cachedDefault = null;

// The default tenant (Maculis). Cached after first lookup. In a real multi-tenant request path the
// tenant is derived from the authenticated user/mailbox, not this default — this is the single
// current tenant and the safe fallback.
export async function getDefaultTenantId() {
  if (cachedDefault) return cachedDefault;
  const r = await query("select id from tenant where slug = 'maculis' limit 1");
  if (!r.rows[0]) throw new Error('default tenant missing — run migrations');
  cachedDefault = r.rows[0].id;
  return cachedDefault;
}

// Resolve the tenant for a mailbox address (which tenant owns hello@/privacy@ …). Single-tenant
// today → the default; the join point for per-tenant mailbox ownership later.
export async function tenantForMailbox(/* address */) {
  return getDefaultTenantId();
}

export function _resetTenantCache() { cachedDefault = null; }
