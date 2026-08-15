// Communication Layer — repository (writes go through here; parameterised SQL only).
// Identity resolution guarantees ONE permanent Contact per person and prevents duplicate
// Organizations. All functions are idempotent so migrations/imports can be re-run safely.

import { withTransaction, query } from './db.mjs';
import { contactIdentityKey, orgSignal } from './identity.mjs';

// Upsert an Organization from a signal. Returns the org id, or null when there is no reliable
// signal (confidence 'none'). Matches an existing org by domain (non-free) first, then by name
// (case-insensitive) to avoid duplicates. 'suggested' signals still materialise an org row but
// the CALLER decides whether to link a contact/conversation definitively or leave it suggested.
export async function upsertOrganizationTx(client, signal) {
  if (!signal || signal.confidence === 'none' || !signal.name) return null;
  const q = (t, p) => client.query(t, p);
  if (signal.domain) {
    const byDom = await q('select id from organization where primary_domain = $1 and deleted_at is null limit 1', [signal.domain]);
    if (byDom.rows[0]) return byDom.rows[0].id;
  }
  const byName = await q('select id from organization where lower(name) = lower($1) and deleted_at is null limit 1', [signal.name]);
  if (byName.rows[0]) {
    if (signal.domain) await q('update organization set primary_domain = coalesce(primary_domain,$2), updated_at = now() where id = $1', [byName.rows[0].id, signal.domain]);
    return byName.rows[0].id;
  }
  const ins = await q('insert into organization(name, primary_domain) values ($1,$2) returning id', [signal.name, signal.domain || null]);
  return ins.rows[0].id;
}

// Resolve (find-or-create) the PERMANENT Contact for a person. Never creates a second Contact for
// the same identity_key. Updates known-empty fields additively; never overwrites with blanks.
export async function resolveContactTx(client, person) {
  const key = contactIdentityKey(person);
  if (!key) return null;                                // no e-mail and no mobile → cannot identify
  const q = (t, p) => client.query(t, p);
  const signal = orgSignal(person);
  const orgId = signal.confidence === 'linked' ? await upsertOrganizationTx(client, signal) : null;

  const existing = await q('select * from contact where identity_key = $1 limit 1', [key]);
  if (existing.rows[0]) {
    const c = existing.rows[0];
    // Additive fill-in only (never clobber an existing value with an empty one).
    await q(`update contact set
        first_name = coalesce(nullif($2,''), first_name),
        last_name  = coalesce(nullif($3,''), last_name),
        email      = coalesce(email, nullif($4,'')),
        mobile     = coalesce(mobile, nullif($5,'')),
        organization_id = coalesce(organization_id, $6),
        updated_at = now()
      where id = $1`,
      [c.id, person.first_name || '', person.last_name || '', (person.email || '').toLowerCase(), person.mobile || '', orgId]);
    return { id: c.id, created: false, identity_key: key, organization_id: c.organization_id || orgId, org_confidence: signal.confidence };
  }
  const ins = await q(`insert into contact(organization_id, first_name, last_name, email, mobile, identity_key)
      values ($1, nullif($2,''), nullif($3,''), nullif($4,''), nullif($5,''), $6) returning id`,
    [orgId, person.first_name || '', person.last_name || '', (person.email || '').toLowerCase(), person.mobile || '', key]);
  return { id: ins.rows[0].id, created: true, identity_key: key, organization_id: orgId, org_confidence: signal.confidence };
}

// Link an Invitation under a Contact (Contact -> Invitations[]). Idempotent by legacy_id: a
// second invitation for the same person attaches to the SAME Contact, never a new one.
export async function linkInvitationTx(client, { contact_id, legacy_id, token, campaign, status }) {
  const q = (t, p) => client.query(t, p);
  if (legacy_id) {
    const ex = await q('select id from invitation where legacy_id = $1 limit 1', [legacy_id]);
    if (ex.rows[0]) {
      await q('update invitation set contact_id=$2, token=$3, campaign=$4, status=$5 where id=$1',
        [ex.rows[0].id, contact_id, token || null, campaign, status || null]);
      return { id: ex.rows[0].id, created: false };
    }
  }
  const ins = await q('insert into invitation(contact_id, legacy_id, token, campaign, status) values ($1,$2,$3,$4,$5) returning id',
    [contact_id, legacy_id || null, token || null, campaign, status || null]);
  return { id: ins.rows[0].id, created: true };
}

// One-shot, idempotent migration of the existing JSON invitation records into permanent
// Contact/Organization/Invitation rows. No history is lost (the JSON store remains the
// operational source for the First Five lifecycle); this builds the relationship graph on top.
// Returns counts. Safe to run repeatedly (e.g. on each boot) — re-running upserts, never dups.
export async function migrateInvitations(records) {
  let contactsCreated = 0, contactsLinked = 0, invitationsLinked = 0, skipped = 0;
  for (const r of records || []) {
    const person = {
      first_name: r.first_name, last_name: r.last_name, email: r.email, mobile: r.mobile,
      company_name: r.company_name, domain: r.domain,
    };
    // eslint-disable-next-line no-await-in-loop
    await withTransaction(async (client) => {
      const contact = await resolveContactTx(client, person);
      if (!contact) { skipped++; return; }
      contact.created ? contactsCreated++ : contactsLinked++;
      await linkInvitationTx(client, {
        contact_id: contact.id, legacy_id: r.id, token: r.token,
        campaign: r.campaign || 'MACULIS_FIRST_FIVE', status: r.status,
      });
      invitationsLinked++;
    });
  }
  return { contactsCreated, contactsLinked, invitationsLinked, skipped };
}

// Count distinct contacts (for dup-detection assertions/reporting).
export async function contactCount() {
  return Number((await query('select count(*)::int as n from contact')).rows[0].n);
}
