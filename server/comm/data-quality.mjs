// Communication Layer — data-quality diagnostic (§7). READ-ONLY.
//
// Checks the relationship graph for the problems that erode "one person = one relationship across
// channels": duplicate contacts, the same person split across channels, orphan organizations,
// conversations still unlinked to a contact, and (defense in depth) provider_message_id collisions
// across tenants. It NEVER merges or mutates anything — a merge is a human decision with provenance.
// Every finding reports counts and ID samples only; no names, e-mail, phone numbers or content.
//
// Severity:
//   hard  — an invariant that should be impossible (e.g. a duplicate identity_key). Fails the gate.
//   warn  — a likely duplicate/split worth a human merge decision.
//   info  — expected-but-watchable state (unlinked unknown senders, unreachable contacts).

import { query } from './db.mjs';

// Each check returns { check, severity, count, sample } where sample is an array of id-only rows.
export async function runDataQualityChecks({ tenantId = null, sampleLimit = 10 } = {}) {
  const t = tenantId; // null => all tenants
  const where = t ? 'where tenant_id = $1' : '';
  const p = t ? [t] : [];
  const findings = [];

  // 1) HARD: identity_key must be unique per tenant. Any duplicate is a real integrity break.
  const dupKey = await query(
    `select identity_key, count(*)::int n, array_agg(id::text) ids
       from contact ${where} ${where ? 'and' : 'where'} identity_key is not null
      group by identity_key having count(*) > 1
      order by n desc limit $${p.length + 1}`, [...p, sampleLimit]);
  findings.push({ check: 'duplicate_identity_key', severity: 'hard', count: dupKey.rows.length, sample: dupKey.rows.map((r) => ({ identity_key_hash: hash(r.identity_key), contactIds: r.ids })) });

  // 2) WARN: the same e-mail on more than one contact (a likely duplicate person).
  const dupEmail = await query(
    `select count(*)::int n, array_agg(id::text) ids from contact
      ${where} ${where ? 'and' : 'where'} nullif(email,'') is not null
      group by lower(email) having count(*) > 1
      order by n desc limit $${p.length + 1}`, [...p, sampleLimit]);
  findings.push({ check: 'duplicate_email', severity: 'warn', count: dupEmail.rows.length, sample: dupEmail.rows.map((r) => ({ contactIds: r.ids })) });

  // 3) WARN: the same mobile on more than one contact.
  const dupMobile = await query(
    `select count(*)::int n, array_agg(id::text) ids from contact
      ${where} ${where ? 'and' : 'where'} nullif(mobile,'') is not null
      group by mobile having count(*) > 1
      order by n desc limit $${p.length + 1}`, [...p, sampleLimit]);
  findings.push({ check: 'duplicate_mobile', severity: 'warn', count: dupMobile.rows.length, sample: dupMobile.rows.map((r) => ({ contactIds: r.ids })) });

  // 4) WARN: the same phone NUMBER reachable through more than one contact — the cross-channel split
  //    we most want to avoid ("mailt vandaag, WhatsAppt morgen" becoming two relationships). A
  //    channel_identity value is unique per (tenant,channel,value) by constraint, so the split shows
  //    up ACROSS contact.mobile and channel_identity together, which this union catches.
  const numberFilterCi = t ? 'where ci.tenant_id = $1' : '';
  const numberFilterC = t ? 'where c.tenant_id = $1' : '';
  const splitNumber = await query(
    `with numbers as (
        select contact_id, value as number from channel_identity ci ${numberFilterCi} ${numberFilterCi ? 'and' : 'where'} ci.channel in ('PHONE','SMS','WHATSAPP') and nullif(ci.value,'') is not null
        union
        select c.id as contact_id, c.mobile as number from contact c ${numberFilterC} ${numberFilterC ? 'and' : 'where'} nullif(c.mobile,'') is not null
      )
      select number, count(distinct contact_id)::int n, array_agg(distinct contact_id::text) ids
        from numbers group by number having count(distinct contact_id) > 1
        order by n desc limit $${p.length + 1}`, [...p, sampleLimit]);
  findings.push({ check: 'cross_channel_number_split', severity: 'warn', count: splitNumber.rows.length, sample: splitNumber.rows.map((r) => ({ contactIds: r.ids })) });

  // 5) INFO: conversations still unlinked to a contact (unknown senders awaiting a human link).
  const unlinked = await query(
    `select count(*)::int n from conversation ${where} ${where ? 'and' : 'where'} contact_id is null and deleted_at is null`, p);
  findings.push({ check: 'unlinked_conversations', severity: 'info', count: unlinked.rows[0].n, sample: [] });

  // 6) INFO: contacts with no way to reach them (no email, no mobile, no channel identity).
  const unreachable = await query(
    `select count(*)::int n from contact c ${where}
      ${where ? 'and' : 'where'} nullif(c.email,'') is null and nullif(c.mobile,'') is null
        and not exists (select 1 from channel_identity ci where ci.contact_id = c.id)`, p);
  findings.push({ check: 'contacts_without_identity', severity: 'info', count: unreachable.rows[0].n, sample: [] });

  // 7) INFO: organizations with no contacts (orphan orgs).
  const orphanOrg = await query(
    `select count(*)::int n from organization o ${where}
      ${where ? 'and' : 'where'} not exists (select 1 from contact c where c.organization_id = o.id)`, p);
  findings.push({ check: 'orphan_organizations', severity: 'info', count: orphanOrg.rows[0].n, sample: [] });

  // 8) HARD (cross-tenant): a provider_message_id shared across tenants. Provider ids are globally
  //    unique per provider, so this should never happen; if it does, delivery-receipt routing could
  //    be ambiguous. (Tenant-scoped lookups already mitigate; this surfaces the anomaly.)
  const pmidCollision = await query(
    `select count(*)::int n from (
        select provider_message_id from message
         where provider_message_id is not null
         group by provider_message_id having count(distinct tenant_id) > 1
      ) x`, []);
  findings.push({ check: 'provider_message_id_cross_tenant', severity: 'hard', count: pmidCollision.rows[0].n, sample: [] });

  const hard = findings.filter((f) => f.severity === 'hard' && f.count > 0);
  return { ok: hard.length === 0, findings, hardViolations: hard.length };
}

// Stable non-reversible short hash so a duplicate identity_key can be correlated in a report
// without ever printing the key itself (which embeds an e-mail or mobile).
function hash(s) {
  let h = 0;
  const str = String(s);
  for (let i = 0; i < str.length; i += 1) { h = (h * 31 + str.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(16);
}
