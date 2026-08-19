// Mijn Maculis Slice A1 — durable insight foundation: append-only observations/versions, safe
// backfill, DB-enforced immutability, tenant/org isolation, and the version-bound privacy invariant.
//
// Requires a Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SKIPS otherwise.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — Slice A1 DB tests skipped' };

async function fresh() {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  await runMigrations({ silent: true });
  await query('truncate customer_insight, insight_version, insight_observation, insight_share_event, customer_access, collaboration_item, contact, organization cascade');
  const tid = await getDefaultTenantId();
  const org = async (name, domain) => (await query(
    `insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,$2,$3,'CUSTOMER') returning id`, [tid, name, domain])).rows[0].id;
  return { query, tid, org };
}

test('A1: safe backfill gives each legacy V1 insight exactly one initial version + observation, content verbatim', opts, async () => {
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { backfillInitialVersions } = await import('../server/mijn/versions.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');
  try {
    const { tid, org } = await fresh();
    const orgA = await org('Backfill Org', 'bf.nl');

    // Insert legacy V1-style insights DIRECTLY (as they existed before Slice A1: no version rows).
    const legacy = async (title, sharing, prov) => (await query(
      `insert into customer_insight(tenant_id, organization_id, title, stance, observation, meaning, basis, not_yet_known, sharing, provenance, status, attention)
       values ($1,$2,$3,'reveal',$4,'mean','basis','nyk',$5,$6::jsonb,'new',false) returning id`,
      [tid, orgA, title, 'obs ' + title, sharing, JSON.stringify(prov)])).rows[0].id;
    const p1 = await legacy('Legacy private', 'PRIVATE', { lens: 'Lens 1', secret: 'x' });
    const p2 = await legacy('Legacy shared', 'SHARED', { lens: 'Lens 1' });

    // Counts BEFORE.
    const before = {
      insights: (await query('select count(*)::int c from customer_insight')).rows[0].c,
      versions: (await query('select count(*)::int c from insight_version')).rows[0].c,
      observations: (await query('select count(*)::int c from insight_observation')).rows[0].c,
    };
    assert.deepEqual(before, { insights: 2, versions: 0, observations: 0 });

    const res = await backfillInitialVersions();
    assert.equal(res.backfilled, 2);

    // Counts AFTER: exactly one version + one observation per insight.
    assert.equal((await query('select count(*)::int c from insight_version')).rows[0].c, 2);
    assert.equal((await query('select count(*)::int c from insight_observation')).rows[0].c, 2);
    for (const id of [p1, p2]) {
      assert.equal((await query('select count(*)::int c from insight_version where insight_id=$1', [id])).rows[0].c, 1);
      assert.equal((await query('select count(*)::int c from insight_observation where insight_id=$1', [id])).rows[0].c, 1);
    }

    // Content is copied VERBATIM: the version equals the head; provenance preserved on the observation.
    const head = (await query('select title, stance, observation, meaning, basis, not_yet_known, current_version_id, shared_version_id, provenance from customer_insight where id=$1', [p1])).rows[0];
    const ver = (await query('select title, stance, observation, meaning, basis, not_yet_known from insight_version where insight_id=$1 and version_no=1', [p1])).rows[0];
    assert.deepEqual(
      [head.title, head.stance, head.observation, head.meaning, head.basis, head.not_yet_known],
      [ver.title, ver.stance, ver.observation, ver.meaning, ver.basis, ver.not_yet_known]);
    const obsProv = (await query('select provenance from insight_observation where insight_id=$1', [p1])).rows[0].provenance;
    assert.equal(obsProv.secret, 'x', 'existing provenance is preserved verbatim on the observation');
    assert.equal(head.provenance.secret, 'x', 'head provenance is unchanged (nothing lost)');

    // PRIVATE/SHARED semantics intact through the backfill: pointers bound correctly.
    assert.ok(head.current_version_id && !head.shared_version_id, 'PRIVATE insight: current set, shared null');
    const sharedHead = (await query('select current_version_id, shared_version_id from customer_insight where id=$1', [p2])).rows[0];
    assert.ok(sharedHead.current_version_id && sharedHead.shared_version_id, 'SHARED insight: both pointers set');
    assert.equal(sharedHead.current_version_id, sharedHead.shared_version_id, 'after backfill current==shared');

    // Idempotent: a second backfill changes nothing.
    assert.equal((await backfillInitialVersions()).backfilled, 0);
    assert.equal((await query('select count(*)::int c from insight_version')).rows[0].c, 2);

    // The internal (Cockpit) read now sees the shared insight via its shared version.
    const internal = await sharedContextForOrg(tid, orgA);
    assert.equal(internal.length, 1);
    assert.equal(internal[0].title, 'Legacy shared');
  } finally { await closePool(); }
});

test('A1: append-only is a DB rule — observations and versions cannot be UPDATEd by any path', opts, async () => {
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  try {
    const { tid, org } = await fresh();
    const orgA = await org('AppendOnly Org', 'ao.nl');
    const { insightId } = await createInsightWithInitialVersion({ tenantId: tid, organizationId: orgA, title: 'X', observation: 'original', provenance: { p: 1 } });

    await assert.rejects(
      () => query(`update insight_version set observation='hacked' where insight_id=$1`, [insightId]),
      /append-only/, 'UPDATE on insight_version must be blocked');
    await assert.rejects(
      () => query(`update insight_observation set provenance='{}'::jsonb where insight_id=$1`, [insightId]),
      /append-only/, 'UPDATE on insight_observation must be blocked');

    // Rows are unchanged.
    assert.equal((await query('select observation from insight_version where insight_id=$1', [insightId])).rows[0].observation, 'original');
    assert.equal((await query('select provenance from insight_observation where insight_id=$1', [insightId])).rows[0].provenance.p, 1);
  } finally { await closePool(); }
});

test('A1: tenant/org isolation holds on the new history tables and the internal read', opts, async () => {
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  const { sharedContextForOrg, shareInsight } = await import('../server/mijn/sharing.mjs');
  try {
    const { tid, org } = await fresh();
    const orgA = await org('Iso A', 'isoa.nl');
    const orgB = await org('Iso B', 'isob.nl');
    const a = await createInsightWithInitialVersion({ tenantId: tid, organizationId: orgA, title: 'A insight', observation: 'a', sharing: 'PRIVATE' });
    await createInsightWithInitialVersion({ tenantId: tid, organizationId: orgB, title: 'B insight', observation: 'b', sharing: 'PRIVATE' });
    await shareInsight(tid, orgA, a.insightId, { actorLabel: 'A' });

    // Versions/observations are org-scoped.
    assert.equal((await query('select count(*)::int c from insight_version where organization_id=$1', [orgA])).rows[0].c, 1);
    assert.equal((await query('select count(*)::int c from insight_version where organization_id=$1', [orgB])).rows[0].c, 1);
    // Internal read for org B never returns org A's shared insight.
    const bInternal = await sharedContextForOrg(tid, orgB);
    assert.equal(bInternal.length, 0);
    const aInternal = await sharedContextForOrg(tid, orgA);
    assert.equal(aInternal.length, 1);
    assert.equal(aInternal[0].title, 'A insight');
  } finally { await closePool(); }
});

test('A1: PRIVACY INVARIANT — PRIVATE v1 → SHARED v1 → v2 arises → v1 stays shared → v2 hidden → revoke → nothing', opts, async () => {
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { createInsightWithInitialVersion, appendVersion } = await import('../server/mijn/versions.mjs');
  const { sharedContextForOrg, shareInsight, revokeInsight, insightForCustomer } = await import('../server/mijn/sharing.mjs');
  try {
    const { tid, org } = await fresh();
    const orgA = await org('Invariant Org', 'inv.nl');

    // v1, PRIVATE.
    const { insightId, versionId: v1 } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: orgA, title: 'Positionering', stance: 'tension',
      observation: 'v1 observation', meaning: 'v1 meaning', sharing: 'PRIVATE',
    });
    assert.equal((await sharedContextForOrg(tid, orgA)).length, 0, 'PRIVATE: internal sees nothing');

    // SHARE v1.
    const shareRes = await shareInsight(tid, orgA, insightId, { actorLabel: 'Klant' });
    assert.equal(shareRes.sharing, 'SHARED');
    let internal = await sharedContextForOrg(tid, orgA);
    assert.equal(internal.length, 1);
    assert.equal(internal[0].observation, 'v1 observation');

    // A NEW version v2 arises (a later Lens reading). current advances; shared must NOT move.
    const { versionId: v2 } = await appendVersion({
      tenantId: tid, organizationId: orgA, insightId, title: 'Positionering',
      stance: 'tension', observation: 'v2 observation (private development)', meaning: 'v2 meaning',
      changeSummary: 'verdiept', status: 'evolving',
    });
    const head = (await query('select current_version_id, shared_version_id, observation from customer_insight where id=$1', [insightId])).rows[0];
    assert.equal(head.current_version_id, v2, 'current advanced to v2');
    assert.equal(head.shared_version_id, v1, 'shared stayed at v1 (consent did not move)');
    assert.notEqual(head.current_version_id, head.shared_version_id, 'current and shared are independent');

    // Internal (Maculis) STILL sees only v1; the private v2 development is invisible internally.
    internal = await sharedContextForOrg(tid, orgA);
    assert.equal(internal.length, 1);
    assert.equal(internal[0].observation, 'v1 observation', 'internal must not see the newer private v2');
    assert.ok(!internal.some((x) => /v2 observation/.test(x.observation || '')), 'v2 content never leaks internally');

    // The customer, by contrast, sees the current (v2) reading — proving the two pointers are independent.
    const customerView = await insightForCustomer(tid, orgA, insightId);
    assert.equal(customerView.observation, 'v2 observation (private development)');

    // REVOKE → nothing is shared anymore.
    await revokeInsight(tid, orgA, insightId, { actorLabel: 'Klant' });
    assert.equal((await sharedContextForOrg(tid, orgA)).length, 0, 'after revoke internal sees nothing');
    const afterRevoke = (await query('select sharing, shared_version_id from customer_insight where id=$1', [insightId])).rows[0];
    assert.equal(afterRevoke.sharing, 'PRIVATE');
    assert.equal(afterRevoke.shared_version_id, null);

    // Audit records the exact versions that crossed the boundary.
    const events = (await query('select action, version_id from insight_share_event where insight_id=$1 order by at', [insightId])).rows;
    assert.deepEqual(events.map((e) => e.action), ['shared', 'revoked']);
    assert.equal(events[0].version_id, v1, 'share audit records v1');
    assert.equal(events[1].version_id, v1, 'revoke audit records the version that had been shared (v1)');
  } finally { await closePool(); }
});
