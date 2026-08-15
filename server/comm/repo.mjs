// Communication Layer — repository (writes go through here; parameterised SQL only).
// Identity resolution guarantees ONE permanent Contact per person PER TENANT and prevents
// duplicate Organizations. Every row is tenant-stamped and every lookup is tenant-scoped, so the
// foundation is tenant-safe. All functions are idempotent so migrations/imports re-run safely.

import { withTransaction, query } from './db.mjs';
import { contactIdentityKey, orgSignal, emailDomain } from './identity.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { normaliseMobile } from '../store.mjs';

// Upsert an Organization from a signal, tenant-scoped. Returns the org id or null (no reliable
// signal). Matches by domain (non-free) first, then by name, to avoid duplicates.
export async function upsertOrganizationTx(client, tenantId, signal) {
  if (!signal || signal.confidence === 'none' || !signal.name) return null;
  const q = (t, p) => client.query(t, p);
  if (signal.domain) {
    const byDom = await q('select id from organization where tenant_id=$1 and primary_domain=$2 and deleted_at is null limit 1', [tenantId, signal.domain]);
    if (byDom.rows[0]) return byDom.rows[0].id;
  }
  const byName = await q('select id from organization where tenant_id=$1 and lower(name)=lower($2) and deleted_at is null limit 1', [tenantId, signal.name]);
  if (byName.rows[0]) {
    if (signal.domain) await q('update organization set primary_domain=coalesce(primary_domain,$2), updated_at=now() where id=$1', [byName.rows[0].id, signal.domain]);
    return byName.rows[0].id;
  }
  const ins = await q('insert into organization(tenant_id, name, primary_domain) values ($1,$2,$3) returning id', [tenantId, signal.name, signal.domain || null]);
  return ins.rows[0].id;
}

// Record the channel identities (e-mail / mobile) for a Contact so one person can be recognised
// across channels. Idempotent (unique on tenant+channel+value).
async function upsertChannelIdentityTx(client, tenantId, contactId, channel, value, { source = 'invitation', primary = false } = {}) {
  if (!value) return;
  await client.query(
    `insert into channel_identity(tenant_id, contact_id, channel, value, is_primary, source)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (tenant_id, channel, value) do update set contact_id=excluded.contact_id, updated_at=now()`,
    [tenantId, contactId, channel, value, primary, source]);
}

// Resolve (find-or-create) the PERMANENT Contact for a person, tenant-scoped. Never creates a
// second Contact for the same identity_key within a tenant. Additive fill-in only.
export async function resolveContactTx(client, tenantId, person) {
  const key = contactIdentityKey(person);
  if (!key) return null;
  const q = (t, p) => client.query(t, p);
  const signal = orgSignal(person);
  const orgId = signal.confidence === 'linked' ? await upsertOrganizationTx(client, tenantId, signal) : null;
  const email = (person.email || '').trim().toLowerCase();
  const mobile = normaliseMobile(person.mobile || '');

  const existing = await q('select * from contact where tenant_id=$1 and identity_key=$2 limit 1', [tenantId, key]);
  let contactId;
  let created = false;
  if (existing.rows[0]) {
    const c = existing.rows[0];
    await q(`update contact set
        first_name = coalesce(nullif($2,''), first_name),
        last_name  = coalesce(nullif($3,''), last_name),
        email      = coalesce(email, nullif($4,'')),
        mobile     = coalesce(mobile, nullif($5,'')),
        organization_id = coalesce(organization_id, $6),
        updated_at = now()
      where id = $1`,
      [c.id, person.first_name || '', person.last_name || '', email, mobile, orgId]);
    contactId = c.id;
  } else {
    const ins = await q(`insert into contact(tenant_id, organization_id, first_name, last_name, email, mobile, identity_key)
        values ($1,$2, nullif($3,''), nullif($4,''), nullif($5,''), nullif($6,''), $7) returning id`,
      [tenantId, orgId, person.first_name || '', person.last_name || '', email, mobile, key]);
    contactId = ins.rows[0].id;
    created = true;
  }
  if (email) await upsertChannelIdentityTx(client, tenantId, contactId, 'EMAIL', email, { primary: true });
  if (mobile) await upsertChannelIdentityTx(client, tenantId, contactId, 'PHONE', mobile);
  const fresh = await q('select organization_id from contact where id=$1', [contactId]);
  return { id: contactId, created, identity_key: key, organization_id: fresh.rows[0].organization_id, org_confidence: signal.confidence };
}

// Link an Invitation under a Contact (Contact -> Invitations[]). Idempotent by legacy_id.
export async function linkInvitationTx(client, tenantId, { contact_id, legacy_id, token, campaign, status }) {
  const q = (t, p) => client.query(t, p);
  if (legacy_id) {
    const ex = await q('select id from invitation where legacy_id=$1 limit 1', [legacy_id]);
    if (ex.rows[0]) {
      await q('update invitation set tenant_id=$2, contact_id=$3, token=$4, campaign=$5, status=$6 where id=$1',
        [ex.rows[0].id, tenantId, contact_id, token || null, campaign, status || null]);
      return { id: ex.rows[0].id, created: false };
    }
  }
  const ins = await q('insert into invitation(tenant_id, contact_id, legacy_id, token, campaign, status) values ($1,$2,$3,$4,$5,$6) returning id',
    [tenantId, contact_id, legacy_id || null, token || null, campaign, status || null]);
  return { id: ins.rows[0].id, created: true };
}

// Idempotent migration of existing JSON invitation records into permanent Contact/Organization/
// Invitation rows (default tenant). No history is lost. Safe to re-run.
export async function migrateInvitations(records, tenantId) {
  const tid = tenantId || await getDefaultTenantId();
  let contactsCreated = 0, contactsLinked = 0, invitationsLinked = 0, skipped = 0;
  for (const r of records || []) {
    const person = { first_name: r.first_name, last_name: r.last_name, email: r.email, mobile: r.mobile, company_name: r.company_name, domain: r.domain };
    // eslint-disable-next-line no-await-in-loop
    await withTransaction(async (client) => {
      const contact = await resolveContactTx(client, tid, person);
      if (!contact) { skipped++; return; }
      contact.created ? contactsCreated++ : contactsLinked++;
      await linkInvitationTx(client, tid, { contact_id: contact.id, legacy_id: r.id, token: r.token, campaign: r.campaign || 'MACULIS_FIRST_FIVE', status: r.status });
      invitationsLinked++;
    });
  }
  return { contactsCreated, contactsLinked, invitationsLinked, skipped };
}

export async function contactCount(tenantId) {
  const tid = tenantId || await getDefaultTenantId();
  return Number((await query('select count(*)::int n from contact where tenant_id=$1', [tid])).rows[0].n);
}
