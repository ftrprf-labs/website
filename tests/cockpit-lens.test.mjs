// Cockpit ↔ Lens — the Niveau-C seam. The Lens is the CLIENT's experience; the cockpit may hold ONLY
// a content-free relational hoofdlijn (SUMMARY: went through the Lens + date). PRIVATE reveal content,
// answers and reflections never enter the cockpit database — enforced by BOTH a DB CHECK constraint and
// role-based access (agents/Scout get nothing). SHARED is modelled but never written (no sharing consent
// exists yet). Pure access rules always run; the DB layer skips without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lensVisibleTo, LENS_PRIVACY } from '../server/comm/lens.mjs';

// ---- pure access rules -------------------------------------------------------------------------
test('access: a human advisor may see SUMMARY only; an agent sees NOTHING from the Lens', () => {
  const human = lensVisibleTo({ kind: 'HUMAN' });
  assert.equal(human.has('SUMMARY'), true);
  assert.equal(human.has('PRIVATE'), false, 'never PRIVATE');
  assert.equal(human.has('SHARED'), false, 'no SHARED until a sharing consent exists');
  const scout = lensVisibleTo({ kind: 'AGENT' });
  assert.equal(scout.size, 0, 'Scout / any agent gets no Lens access');
  assert.equal(lensVisibleTo({}).size >= 0, true);
  assert.equal(lensVisibleTo({ kind: 'WEIRD' }).size, 0, 'unknown viewer fails closed');
});

test('the three privacy levels are defined so code can reason and deny', () => {
  assert.deepEqual(LENS_PRIVACY, ['PRIVATE', 'SHARED', 'SUMMARY']);
});

// ---- DB: writes, constraint, access, content-free ----------------------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — Lens DB E2E skipped' };

test('DB — SUMMARY-only writes, PRIVATE structurally blocked, agents denied, content-free, isolation', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { recordLensSummary, listLensSignals, lensSummaryForContact } = await import('../server/comm/lens.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate lens_signal, contact, organization cascade');
    const tenantId = await getDefaultTenantId();
    const other = (await query("insert into tenant(slug,name) values ('lens-other','Other') on conflict (slug) do update set name=excluded.name returning id")).rows[0].id;
    const org = (await query("insert into organization(tenant_id,name) values ($1,'De Brug') returning id", [tenantId])).rows[0].id;
    const kim = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'kim@debrug.be','Kim','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;
    const at = '2026-08-14T10:00:00.000Z';

    // recordLensSummary writes a SUMMARY milestone; idempotent per (contact, milestone).
    const r1 = await recordLensSummary(tenantId, { contactId: kim, milestone: 'COMPLETED', occurredAt: at });
    assert.ok(r1.ok && r1.id);
    const r2 = await recordLensSummary(tenantId, { contactId: kim, milestone: 'COMPLETED', occurredAt: at });
    assert.equal(r2.deduped, true);
    assert.equal((await query('select count(*)::int n from lens_signal where contact_id=$1', [kim])).rows[0].n, 1);
    assert.equal((await query('select privacy_status from lens_signal where id=$1', [r1.id])).rows[0].privacy_status, 'SUMMARY');

    // The DB refuses PRIVATE Lens content structurally — the boundary is in the schema, not just code.
    await assert.rejects(
      query("insert into lens_signal(tenant_id, contact_id, source, privacy_status, milestone) values ($1,$2,'LENS','PRIVATE','COMPLETED')", [tenantId, kim]),
      /lens_signal_no_private_ck|check constraint/i,
      'PRIVATE can never be written into the cockpit DB');

    // A human advisor sees the SUMMARY; an agent (Scout) sees NOTHING.
    assert.equal((await listLensSignals(tenantId, kim, { viewer: { kind: 'HUMAN' } })).length, 1);
    assert.equal((await listLensSignals(tenantId, kim, { viewer: { kind: 'AGENT' } })).length, 0, 'Scout gets no Lens data');

    // The dossier hoofdlijn is content-free: only participated + date + sharedCount. No answers/reveal.
    const summary = await lensSummaryForContact(tenantId, kim, { viewer: { kind: 'HUMAN' } });
    assert.equal(summary.participated, true);
    assert.equal(summary.completedAt.toISOString ? summary.completedAt.toISOString() : String(summary.completedAt), new Date(at).toISOString());
    assert.equal(summary.sharedCount, 0);
    const keys = Object.keys(summary);
    for (const forbidden of ['answers', 'contexts', 'recognition', 'accuracy', 'novelty', 'reveal', 'content', 'text']) {
      assert.ok(!keys.includes(forbidden), `hoofdlijn must not carry ${forbidden}`);
    }
    // The agent view yields no summary at all.
    assert.equal(await lensSummaryForContact(tenantId, kim, { viewer: { kind: 'AGENT' } }), null);

    // provenance names the Lens as the source.
    const prov = (await query('select provenance from lens_signal where id=$1', [r1.id])).rows[0].provenance;
    assert.equal(prov.source, 'LENS');

    // Tenant isolation: a foreign tenant's contact never leaks a Lens summary here.
    const fOrg = (await query("insert into organization(tenant_id,name) values ($1,'F') returning id", [other])).rows[0].id;
    const fContact = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'x@f.nl','F','x@f.nl') returning id", [other, fOrg])).rows[0].id;
    await recordLensSummary(other, { contactId: fContact, milestone: 'COMPLETED', occurredAt: at });
    assert.equal((await listLensSignals(tenantId, fContact, { viewer: { kind: 'HUMAN' } })).length, 0, 'no cross-tenant Lens data');
  } finally {
    await closePool();
  }
});

// ---- route: the dossier surfaces the date only, never content ----------------------------------
test('DB route — dossier exposes the Lens hoofdlijn (date) and no reveal content', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { recordLensSummary } = await import('../server/comm/lens.mjs');
  const { Readable } = await import('node:stream');
  const call = async (path) => {
    const { handleCockpit } = await import('../server/cockpit/routes.mjs');
    const req = new Readable({ read() {} }); Object.assign(req, { method: 'GET', url: path, socket: { remoteAddress: '127.0.0.1' }, headers: {} }); req.push(null);
    return await new Promise((resolve) => {
      const res = { writeHead(s) { this._s = s; }, end(b) { resolve({ status: this._s, data: b ? JSON.parse(b) : null }); } };
      const u = new URL(path, 'http://x');
      handleCockpit(req, res, { pathname: u.pathname, method: 'GET', isAuthed: () => true });
    });
  };
  try {
    await runMigrations({ silent: true });
    await query('truncate lens_signal, contact, organization, conversation, message cascade');
    const tenantId = await getDefaultTenantId();
    const org = (await query("insert into organization(tenant_id,name) values ($1,'De Brug') returning id", [tenantId])).rows[0].id;
    const kim = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'kim@debrug.be','Kim','De Vos','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;
    await recordLensSummary(tenantId, { contactId: kim, milestone: 'COMPLETED', occurredAt: '2026-08-14T10:00:00.000Z' });

    const { status, data } = await call('/api/cockpit/relation/' + kim);
    assert.equal(status, 200);
    assert.ok(data.lens && data.lens.participated, 'dossier shows the Lens hoofdlijn');
    assert.ok(data.lens.completedAt, 'with a date');
    assert.equal(data.lens.sharedCount, 0);
    // The whole dossier payload must not carry any reveal answer content.
    const blob = JSON.stringify(data).toLowerCase();
    for (const forbidden of ['recognition_answered', 'accuracy_answered', 'novelty_answered', 'reveal_presented']) {
      assert.ok(!blob.includes(forbidden), `dossier must not carry ${forbidden}`);
    }
  } finally {
    await closePool();
  }
});
