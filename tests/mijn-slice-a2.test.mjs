// Mijn Maculis Slice A2 — the customer-facing development + "share the update" flow, end-to-end
// through the HTTP routes, with the boundary still enforced solely via shared_version_id.
//
// Requires a Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SKIPS otherwise.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — Slice A2 DB tests skipped' };

async function mijnCall(handleMijn, method, path, { token = null } = {}) {
  const req = { method, url: path, headers: token ? { 'x-mijn-token': token } : {}, on(ev, cb) { if (ev === 'end') cb(); } };
  return new Promise(async (resolve) => {
    let status;
    const res = { writeHead(s) { status = s; return res; }, end(b) { resolve({ status, json: JSON.parse(b || '{}') }); } };
    const handled = await handleMijn(req, res, { pathname: path.split('?')[0], method });
    if (!handled) resolve({ status: 0, json: {} });
  });
}

test('A2: development timeline + version-bound "share the update" end-to-end via the routes', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion, appendVersion } = await import('../server/mijn/versions.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate customer_insight, insight_version, insight_observation, insight_share_event, customer_access, collaboration_item, contact, organization cascade');
    const tid = await getDefaultTenantId();
    const orgA = (await query(`insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,'A2 Org','a2.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const access = await createAccess(tid, orgA, { label: 'Klant A2', token: 'a2-token-' + 'z'.repeat(30) });

    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: orgA, title: 'Positionering', stance: 'tension',
      observation: 'v1 observation', meaning: 'v1 meaning', basis: 'v1 basis', notYetKnown: 'v1 nyk', sharing: 'PRIVATE',
    });

    // Share v1 through the route.
    let r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/share`, { token: access.token });
    assert.equal(r.status, 200);
    assert.equal(r.json.sharing, 'SHARED');
    assert.equal(r.json.updated, false, 'first share is not an update');
    assert.equal((await sharedContextForOrg(tid, orgA))[0].observation, 'v1 observation');

    // A new reading (v2) arises — simulates a later Lens development.
    await appendVersion({
      tenantId: tid, organizationId: orgA, insightId, title: 'Positionering', stance: 'tension',
      observation: 'v2 observation', meaning: 'v2 meaning', changeSummary: 'verdiept op teamsamenwerking', status: 'evolving',
    });

    // Customer detail: current reading is v2, the timeline has 2 human entries, and the customer is
    // told there is an unshared development. The internal side still sees only v1.
    const detail = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${insightId}`, { token: access.token });
    assert.equal(detail.json.insight.observation, 'v2 observation', 'customer sees the current (v2) reading');
    assert.equal(detail.json.insight.sharing, 'SHARED');
    assert.equal(detail.json.insight.unshared_development, true, 'customer is told a new development is unshared');
    assert.equal(detail.json.insight.developed, true);
    assert.equal(detail.json.development.length, 2, 'timeline has both readings');
    assert.equal(detail.json.development[0].note && typeof detail.json.development[0].note, 'string');
    assert.equal(detail.json.development[1].current, true, 'newest entry is the current one');
    // No technical version internals in the customer payload.
    const devKeys = Object.keys(detail.json.development[0]);
    for (const forbidden of ['id', 'version_no', 'insight_id', 'provenance', 'signal', 'confidence']) {
      assert.ok(!devKeys.includes(forbidden), `development entry must not expose ${forbidden}`);
    }
    // Internal boundary: STILL v1 only, v2 invisible.
    let internal = await sharedContextForOrg(tid, orgA);
    assert.equal(internal.length, 1);
    assert.equal(internal[0].observation, 'v1 observation', 'Cockpit still sees only the shared v1');

    // The customer explicitly shares the update. Only now does shared advance to v2.
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/share`, { token: access.token });
    assert.equal(r.json.updated, true, 'this share is an update of the previously shared reading');
    assert.equal(r.json.insight.unshared_development, false, 'no unshared development remains');
    internal = await sharedContextForOrg(tid, orgA);
    assert.equal(internal[0].observation, 'v2 observation', 'Cockpit now sees the newly shared v2');

    // Revoke: internally nothing remains.
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/revoke`, { token: access.token });
    assert.equal(r.json.sharing, 'PRIVATE');
    assert.equal((await sharedContextForOrg(tid, orgA)).length, 0, 'after revoke internal sees nothing');

    // Audit trail records exactly what crossed the boundary and when.
    const events = (await query('select action, version_id from insight_share_event where insight_id=$1 order by at', [insightId])).rows;
    const v = (n) => (query(`select id from insight_version where insight_id=$1 and version_no=$2`, [insightId, n])).then((x) => x.rows[0].id);
    const v1 = await v(1); const v2 = await v(2);
    assert.deepEqual(events.map((e) => e.action), ['shared', 'shared', 'revoked']);
    assert.equal(events[0].version_id, v1, 'first share recorded v1');
    assert.equal(events[1].version_id, v2, 'update share recorded v2');
    assert.equal(events[2].version_id, v2, 'revoke recorded the last shared version (v2)');
  } finally { await closePool(); }
});
