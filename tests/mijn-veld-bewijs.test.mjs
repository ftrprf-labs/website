// Mijn Maculis · Het Veld — het bewijs onder een inzicht, en de grens die eromheen staat.
//
// Het Veld laat de straal van het licht het aantal dragende waarnemingen volgen (canon 7). Dat
// getal en die lijst moeten uit dezelfde bron komen, en die bron is fail-closed: een waarneming
// zonder klantveilig label telt niet mee en wordt niet getoond.
//
// Vereist een Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SLAAT OVER als die er niet is.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — veld-bewijstests overgeslagen' };

async function mijnCall(handleMijn, method, path, { token = null } = {}) {
  const req = { method, url: path, headers: token ? { 'x-mijn-token': token } : {}, on(ev, cb) { if (ev === 'end') cb(); } };
  return new Promise(async (resolve) => {
    let status;
    const res = { writeHead(s) { status = s; return res; }, end(b) { resolve({ status, json: JSON.parse(b || '{}') }); } };
    const handled = await handleMijn(req, res, { pathname: path.split('?')[0], method });
    if (!handled) resolve({ status: 0, json: {} });
  });
}

test('Het Veld: bewijs is herleidbaar, telt eerlijk en lekt niets', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion, addObservation } = await import('../server/mijn/versions.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate customer_insight, insight_version, insight_observation, insight_share_event, customer_access, collaboration_item, contact, organization cascade');
    const tid = await getDefaultTenantId();
    const orgA = (await query(`insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,'Veld A','veld-a.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const orgB = (await query(`insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,'Veld B','veld-b.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const access = await createAccess(tid, orgA, { label: 'Klant Veld', token: 'veld-token-' + 'q'.repeat(30) });

    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: orgA, title: 'Positionering', stance: 'tension',
      observation: 'obs', meaning: 'mng', basis: 'bas', notYetKnown: 'nyk', sharing: 'PRIVATE',
      provenance: { geheim: 'dit mag de klant nooit zien' },
      customerLabel: 'De pagina Over ons op jullie website',
    });
    // twee waarnemingen erbij die de klant mag lezen
    await addObservation({ tenantId: tid, organizationId: orgA, insightId, customerLabel: 'Vacaturetekst voor accountmanager' });
    await addObservation({ tenantId: tid, organizationId: orgA, insightId, customerLabel: 'Bericht van een teamlid' });
    // en één zonder label: bewust niet voor de klant geschreven
    await addObservation({ tenantId: tid, organizationId: orgA, insightId, customerLabel: null,
      provenance: { geheim: 'ook dit niet' } });

    // ---- het detail draagt het bewijs ----
    const detail = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${insightId}`, { token: access.token });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.evidence.length, 3, 'alleen waarnemingen met een klantveilig label');
    assert.ok(detail.json.evidence.every((e) => typeof e.label === 'string' && e.label.length > 0));
    assert.ok(detail.json.evidence.every((e) => !('provenance' in e) && !('signal' in e)),
      'provenance en signal blijven intern');
    assert.ok(!JSON.stringify(detail.json).includes('geheim'), 'geen enkele interne sleutel in het antwoord');

    // ---- het getal komt uit dezelfde bron als de lijst ----
    const lijst = await mijnCall(handleMijn, 'GET', '/api/mijn/insights', { token: access.token });
    const rij = lijst.json.insights.find((i) => i.id === insightId);
    assert.equal(rij.evidence_count, 3, 'de telling telt de labelloze waarneming niet mee');
    assert.equal(rij.evidence_count, detail.json.evidence.length,
      'het licht mag nooit meer beweren dan de lijst kan tonen');

    // ---- de grens: een ander org bereikt dit inzicht niet ----
    const anderInzicht = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: orgB, title: 'Van een ander', stance: 'reveal',
      sharing: 'PRIVATE', customerLabel: 'Iets van organisatie B',
    });
    const vreemd = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${anderInzicht.insightId}`, { token: access.token });
    assert.equal(vreemd.status, 404, 'een inzicht van een andere organisatie bestaat hier niet');

    // ---- de interne kant wint hier niets mee ----
    const intern = await sharedContextForOrg(tid, orgA);
    assert.equal(intern.length, 0, 'PRIVATE blijft intern onzichtbaar, ook met bewijs eronder');
    assert.ok(!JSON.stringify(intern).includes('Over ons'), 'bewijslabels lekken niet naar de interne kant');
  } finally {
    await (await import('../server/comm/db.mjs')).closePool();
  }
});
