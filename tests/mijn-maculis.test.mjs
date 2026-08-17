// Mijn Maculis — customer environment: tenant/organization isolation, the PRIVATE/SHARED boundary,
// explicit sharing, the Cockpit bridge, and no-leak guarantees (§17, §18, §23).
//
// Requires a Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SKIPS automatically otherwise, so a build
// box without a database stays green.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — Mijn Maculis DB tests skipped' };

// In-process call into the customer routes with a given token (no network).
async function mijnCall(handleMijn, method, path, { token = null, body = null } = {}) {
  const req = {
    method, url: path,
    headers: token ? { 'x-mijn-token': token } : {},
    on(ev, cb) { if (ev === 'data' && body != null) cb(Buffer.from(JSON.stringify(body))); if (ev === 'end') cb(); },
  };
  return new Promise(async (resolve) => {
    let status;
    const res = { writeHead(s) { status = s; return res; }, end(b) { resolve({ status, json: JSON.parse(b || '{}') }); } };
    const handled = await handleMijn(req, res, { pathname: path.split('?')[0], method });
    if (!handled) resolve({ status: 0, json: {} });
  });
}

test('Mijn Maculis: isolation, PRIVATE/SHARED boundary, explicit sharing, Cockpit bridge', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');
  const { getRelationship } = await import('../server/comm/relationship.mjs');
  const { buildRelationshipContext, renderContextForModel } = await import('../server/comm/ai/context.mjs');

  try {
    const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
    await runMigrations({ silent: true });
    await query('truncate customer_insight, insight_version, insight_observation, insight_share_event, customer_access, collaboration_item, contact, organization, conversation, message, activity cascade');
    const tid = await getDefaultTenantId();

    // Two independent customer organizations (A and B), each with its own access token.
    const orgA = (await query(`insert into organization(tenant_id, name, primary_domain, relationship_stage) values ($1,'Org A Test','a-test.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const orgB = (await query(`insert into organization(tenant_id, name, primary_domain, relationship_stage) values ($1,'Org B Test','b-test.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const accessA = await createAccess(tid, orgA, { label: 'Klant A', token: 'tokenA-' + 'x'.repeat(30) });
    const accessB = await createAccess(tid, orgB, { label: 'Klant B', token: 'tokenB-' + 'y'.repeat(30) });

    // A contact in Org A so the internal context engine has a person to build context for.
    const contactA = (await query(
      `insert into contact(tenant_id, organization_id, first_name, last_name, email, identity_key)
       values ($1,$2,'Ann','A','ann@a-test.nl','email:ann@a-test.nl') returning id`, [tid, orgA])).rows[0].id;

    // Org A insights: two PRIVATE (one is the one we will share), one already SHARED-nothing.
    // Created through the durable-insight primitive so each has an initial version + observation.
    const mkInsight = (org, title, sharing, extra = {}) => createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title, stance: extra.stance || 'reveal',
      observation: 'obs ' + title, meaning: 'mean', basis: 'basis', notYetKnown: 'nyk',
      sharing, provenance: extra.provenance || { lens: 'Lens 1', confidence: 'indication' },
      attention: extra.attention || false,
    }).then((r) => r.insightId);

    const aShareable = await mkInsight(orgA, 'A-private-shareable', 'PRIVATE', { attention: true, provenance: { secret: 'internal-only-evidence' } });
    const aStaysPrivate = await mkInsight(orgA, 'A-private-stays', 'PRIVATE', { stance: 'non_reveal' });
    const bPrivate = await mkInsight(orgB, 'B-private', 'PRIVATE');

    // Collaboration: one customer-visible, one internal-only (must NOT leak to the customer).
    await query(`insert into collaboration_item(tenant_id, organization_id, kind, title, customer_visible) values ($1,$2,'agreement','A-visible-agreement',true)`, [tid, orgA]);
    await query(`insert into collaboration_item(tenant_id, organization_id, kind, title, customer_visible) values ($1,$2,'next_step','A-internal-task',false)`, [tid, orgA]);

    // 1) Mijn Maculis loads for an authorized customer.
    const sess = await mijnCall(handleMijn, 'GET', '/api/mijn/session', { token: accessA.token });
    assert.equal(sess.status, 200);
    assert.equal(sess.json.organization, 'Org A Test');

    // 2) Unauthorized: no token / wrong token → 401.
    assert.equal((await mijnCall(handleMijn, 'GET', '/api/mijn/overview', { token: null })).status, 401);
    assert.equal((await mijnCall(handleMijn, 'GET', '/api/mijn/overview', { token: 'bogus-token-aaaaaaaaaaaaaaaaaaaa' })).status, 401);

    // 3) PRIVATE insight is visible to its own customer.
    const listA = await mijnCall(handleMijn, 'GET', '/api/mijn/insights', { token: accessA.token });
    const titlesA = listA.json.insights.map((i) => i.title).sort();
    assert.deepEqual(titlesA, ['A-private-shareable', 'A-private-stays']);

    // 3b) NO leak: the customer payload never carries internal provenance.
    assert.ok(!('provenance' in listA.json.insights[0]), 'customer insight must not expose provenance');

    // 4) Tenant/organization isolation: Org B sees ONLY its own; cannot read Org A's by id.
    const listB = await mijnCall(handleMijn, 'GET', '/api/mijn/insights', { token: accessB.token });
    assert.deepEqual(listB.json.insights.map((i) => i.title), ['B-private']);
    const crossRead = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${aShareable}`, { token: accessB.token });
    assert.equal(crossRead.status, 404, 'Org B must not read Org A insight by direct id');
    // And Org A cannot read Org B's insight by id either.
    assert.equal((await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${bPrivate}`, { token: accessA.token })).status, 404);

    // 5) BEFORE sharing: the internal side sees NOTHING from Org A (PRIVATE excluded).
    assert.equal((await sharedContextForOrg(tid, orgA)).length, 0, 'no PRIVATE insight may reach internal context');
    // The internal Cockpit relationship aggregation likewise carries no shared insight yet.
    const relBefore = await getRelationship(tid, { orgId: orgA });
    assert.equal((relBefore.sharedInsights || []).length, 0);
    // The AI model context for a contact in Org A must not mention the private insight.
    const ctxBefore = await buildRelationshipContext(tid, { contactId: contactA });
    const renderedBefore = renderContextForModel(ctxBefore);
    assert.ok(!renderedBefore.includes('A-private-shareable'), 'PRIVATE insight must never enter model context');

    // 6) The customer explicitly shares ONE insight (PRIVATE → SHARED).
    const shareRes = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${aShareable}/share`, { token: accessA.token, body: {} });
    assert.equal(shareRes.status, 200);
    assert.equal(shareRes.json.sharing, 'SHARED');

    // 7) AFTER sharing: exactly that insight is SHARED and now available to the internal side.
    const shared = await sharedContextForOrg(tid, orgA);
    assert.equal(shared.length, 1);
    assert.equal(shared[0].title, 'A-private-shareable');
    const relAfter = await getRelationship(tid, { orgId: orgA });
    assert.equal((relAfter.sharedInsights || []).length, 1);
    const ctxAfter = await buildRelationshipContext(tid, { contactId: contactA });
    assert.ok(renderContextForModel(ctxAfter).includes('A-private-shareable'), 'shared insight becomes authorized model context');

    // 8) Other PRIVATE insights STAY private and internally invisible.
    assert.ok(!shared.some((s) => s.title === 'A-private-stays'));
    const stillPrivate = (await query('select sharing from customer_insight where id=$1', [aStaysPrivate])).rows[0].sharing;
    assert.equal(stillPrivate, 'PRIVATE');

    // 9) Provenance is preserved internally, and the share is audited with full provenance.
    const prov = (await query('select provenance from customer_insight where id=$1', [aShareable])).rows[0].provenance;
    assert.equal(prov.secret, 'internal-only-evidence', 'internal provenance is never lost');
    const shareEvents = (await query(`select action, from_sharing, to_sharing, actor_label from insight_share_event where insight_id=$1 order by at`, [aShareable])).rows;
    assert.equal(shareEvents.length, 1);
    assert.deepEqual([shareEvents[0].action, shareEvents[0].from_sharing, shareEvents[0].to_sharing], ['shared', 'PRIVATE', 'SHARED']);
    assert.equal(shareEvents[0].actor_label, 'Klant A');
    const auditRows = (await query(`select count(*)::int n from audit_event where action='customer_insight_shared' and entity_id=$1`, [aShareable])).rows[0].n;
    assert.equal(auditRows, 1, 'sharing is recorded in the append-only audit trail');

    // 10) Samenwerking shows ONLY customer-visible items (internal task list never leaks).
    const collab = await mijnCall(handleMijn, 'GET', '/api/mijn/collaboration', { token: accessA.token });
    const collabTitles = collab.json.items.map((i) => i.title);
    assert.ok(collabTitles.includes('A-visible-agreement'));
    assert.ok(!collabTitles.includes('A-internal-task'), 'internal task must not be visible to the customer');

    // 10b) Boundary proof (admin/Cockpit side): shows the SHARED insight, withholds PRIVATE content,
    //      and reports only a count of what is withheld.
    const { boundaryProof } = await import('../server/mijn/sharing.mjs');
    const proof = await boundaryProof(tid, orgA);
    assert.equal(proof.authorized.length, 1, 'internal proof shows exactly the shared insight');
    assert.equal(proof.authorized[0].title, 'A-private-shareable');
    assert.equal(proof.sharedCount, 1);
    assert.equal(proof.withheldPrivateCount, 1, 'one PRIVATE insight is withheld from Maculis');
    // The proof must not carry any withheld PRIVATE title/content.
    const proofBlob = JSON.stringify(proof);
    assert.ok(!proofBlob.includes('A-private-stays'), 'withheld PRIVATE content never appears in the proof');

    // 11) The customer stays in control: withdrawing a share removes it from internal context again.
    const revoke = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${aShareable}/revoke`, { token: accessA.token, body: {} });
    assert.equal(revoke.json.sharing, 'PRIVATE');
    assert.equal((await sharedContextForOrg(tid, orgA)).length, 0, 'withdrawn insight leaves internal context');
    const events2 = (await query(`select action from insight_share_event where insight_id=$1 order by at`, [aShareable])).rows.map((r) => r.action);
    assert.deepEqual(events2, ['shared', 'revoked']);
  } finally {
    await closePool();
  }
});
