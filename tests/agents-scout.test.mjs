// Digital Colleagues — Growth/Lead colleague (Scout) end-to-end, landing in the cockpit (DB-E2E).
// Runs when a database is present and EITHER feature flag is on. Skipped otherwise, like the comm suite.
//
// Proves the real vertical chain and its safety: observe -> understand -> relation-check -> evidence
// -> proposal -> recordWorkItem (attention_item) -> cockpit -> human decision -> shared state -> audit.
// Scout NEVER resolves its own work, NEVER materialises a relation, NEVER sends anything.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../server/comm/migrate.mjs';
import { query, withTransaction, closePool } from '../server/comm/db.mjs';
import { getDefaultTenantId } from '../server/comm/tenant.mjs';
import { resolveContactTx } from '../server/comm/repo.mjs';
import { runScout } from '../server/agents/scout/runner.mjs';
import { getActor } from '../server/agents/registry.mjs';
import { listRuns } from '../server/agents/run.mjs';
import { listWorkItems, resolveWorkItem, shapeWorkItem } from '../server/comm/work.mjs';

const ON = (v) => /^(1|true|yes|on)$/i.test(v || '');
const HAS_DB = Boolean(process.env.DATABASE_URL) && (ON(process.env.AGENTS_ENABLED) || ON(process.env.COMM_LAYER_ENABLED));
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Scout E2E skipped' };

const auditCount = async (action, tenantId = null) =>
  Number((await query('select count(*)::int n from audit_event where action=$1 and ($2::uuid is null or tenant_id=$2)', [action, tenantId])).rows[0].n);
const items = async (t) => (await listWorkItems(t, {})).map(shapeWorkItem);

test('Scout lands well-reasoned work in the cockpit and only a human resolves it', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate attention_item, agent_run, activity, contact, organization, channel_identity, audit_event, message, conversation cascade');
  const t = await getDefaultTenantId();
  await withTransaction((c) => resolveContactTx(c, t, { first_name: 'Kim', last_name: 'de Vries', email: 'kim@oca.nl', company_name: 'OCA', domain: 'oca.nl' }));
  const scout = await getActor(t, 'scout');
  assert.equal(scout.autonomy, 'PREPARE');

  // --- 1) run over real, human-provided candidates ---------------------------------------------
  const run = await runScout({ tenantId: t, trigger: 'human', candidates: [
    { name: 'Veldwerk', domain: 'veldwerk.be', email: 'tibo@veldwerk.be', first_name: 'Tibo', last_name: 'Claes', note: 'sluit aan bij jullie werk' },
    { name: 'OCA', domain: 'oca.nl' },                        // already known
    { name: 'Ruis BV' },                                      // bare name, below the bar -> compressed away
    { name: 'Demo Co', domain: 'demo.example', demo: true },  // fixture
  ] });
  assert.equal(run.ok, true);
  assert.equal(run.recorded, 3, 'the low-signal bare name is compressed away (no spam)');
  assert.equal(run.skipped, 1);

  const list = await items(t);
  const byName = (needle) => list.find((i) => i.title.includes(needle));
  const veld = byName('Veldwerk'); const oca = byName('OCA'); const demo = byName('Demo Co');
  assert.ok(veld && oca && demo);
  assert.ok(!byName('Ruis'), 'Ruis BV was not recorded');

  // --- 2) origin / owner / type (contract §2, §8) ---------------------------------------------
  assert.equal(veld.origin.key, 'scout');
  assert.equal(veld.origin.kind, 'AGENT');
  assert.equal(veld.owner.kind, 'HUMAN');
  assert.equal(veld.type, 'AGENT_PROPOSAL');

  // --- 3) evidence preserved, with an explicit FACT/INFERENCE/HYPOTHESIS split -----------------
  assert.ok(Array.isArray(veld.evidence.observations) && veld.evidence.observations.length >= 2);
  const kinds = veld.evidence.observations.map((o) => o.kind);
  assert.ok(kinds.includes('FACT') && kinds.includes('INFERENCE') && kinds.includes('HYPOTHESIS'),
    'found information, inference and hypothesis stay distinguishable');
  assert.ok(veld.evidence.confidence > 0 && veld.evidence.confidence < 1);

  // --- 4) existing relation recognised; NOT proposed as a new one ------------------------------
  assert.equal(oca.proposedRelation, null, 'a known org is referenced, never re-proposed');
  assert.ok(oca.contactId, 'the known relation is anchored by id');
  assert.equal(veld.proposedRelation && veld.proposedRelation.email, 'tibo@veldwerk.be', 'a new lead rides as proposedRelation');
  assert.equal(veld.contactId, null, 'a proposed lead is NOT yet a real contact');

  // --- 5) demo can never be mistaken for a real find (contract §7) -----------------------------
  assert.equal(demo.evidence.demo, true);
  assert.equal(demo.evidence.source, 'demo-fixture');

  // --- 6) no external outbound was produced by discovery --------------------------------------
  const outbound = Number((await query("select count(*)::int n from message where direction='OUTBOUND'")).rows[0].n);
  assert.equal(outbound, 0);

  // --- 7) idempotency: re-run updates in place, never stacks -----------------------------------
  const openBefore = Number((await query("select count(*)::int n from attention_item where status='open'")).rows[0].n);
  await runScout({ tenantId: t, trigger: 'human', candidates: [{ name: 'Veldwerk', domain: 'veldwerk.be', email: 'tibo@veldwerk.be' }] });
  const openAfter = Number((await query("select count(*)::int n from attention_item where status='open'")).rows[0].n);
  assert.equal(openAfter, openBefore, 'a repeated discovery does not multiply cards');

  // --- 8) auditability: run trace + landing recorded ------------------------------------------
  assert.ok((await auditCount('agent_run_started', t)) >= 1 && (await auditCount('agent_run_finished', t)) >= 1);
  assert.ok((await auditCount('cockpit_work_recorded', t)) >= 3);
  const runs = await listRuns(t, {});
  assert.ok(runs[0].capability_calls.length >= 3, 'the run records the capabilities it called');
  assert.ok(Array.isArray(runs.find((r) => r.status === 'succeeded').output_ref.landed), 'the run trace lists landed items');

  // --- 9) human APPROVES via the cockpit contract -> materialises a real, deduped contact ------
  assert.equal(Number((await query("select count(*)::int n from contact where lower(email)='tibo@veldwerk.be'")).rows[0].n), 0);
  const approved = await resolveWorkItem(t, veld.id, 'approve', { actorKey: 'lud' });
  assert.equal(approved.ok, true);
  assert.ok(approved.result.createdContactId);
  const madeContact = (await query("select relationship_stage from contact where lower(email)='tibo@veldwerk.be'")).rows;
  assert.equal(madeContact.length, 1, 'exactly one contact created');
  assert.ok((await auditCount('cockpit_work_approve', t)) >= 1);

  // approve is idempotent (a decision cannot be taken twice)
  const twice = await resolveWorkItem(t, veld.id, 'approve', { actorKey: 'lud' });
  assert.equal(twice.ok, false);

  // --- 10) reject flow: no relation materialised ----------------------------------------------
  const beforeContacts = Number((await query('select count(*)::int n from contact').then((r) => r.rows[0].n)));
  const rej = await resolveWorkItem(t, demo.id, 'reject', { actorKey: 'lud' });
  assert.equal(rej.ok, true);
  assert.equal(rej.item.id, demo.id);
  assert.equal(Number((await query('select count(*)::int n from contact').then((r) => r.rows[0].n))), beforeContacts, 'reject creates no contact');
  assert.equal((await query('select status from attention_item where id=$1', [demo.id])).rows[0].status, 'rejected');

  // --- 11) take_over moves ownership to the human, work stays open -----------------------------
  const to = await resolveWorkItem(t, oca.id, 'take_over', { actorKey: 'lud' });
  assert.equal(to.ok, true);
  const ocaRow = (await query('select owner_kind, owner_key, status from attention_item where id=$1', [oca.id])).rows[0];
  assert.equal(ocaRow.owner_kind, 'HUMAN');
  assert.equal(ocaRow.status, 'open', 'taken-over work stays open, now human-owned');

  // --- 12) Scout error does not break the cockpit ---------------------------------------------
  const ext = await runScout({ tenantId: t, trigger: 'human', scope: 'external_web', candidates: [] });
  assert.equal(ext.ok, false);
  assert.match(ext.error, /mandate_denied/);
  assert.ok((await auditCount('mandate_denied', t)) >= 1);
  // cockpit still fully works after a failed run:
  const after = await runScout({ tenantId: t, trigger: 'human', candidates: [{ name: 'Nazorg NV', domain: 'nazorg.nl' }] });
  assert.equal(after.ok, true);

  // --- 13) tenant isolation --------------------------------------------------------------------
  await query("insert into tenant(slug,name) values('maculis-b','Maculis B') on conflict (slug) do nothing");
  const tB = (await query("select id from tenant where slug='maculis-b'")).rows[0].id;
  await query("insert into actor(tenant_id,kind,slug,display_name,role,autonomy) values($1,'AGENT','scout','Scout','growth','PREPARE') on conflict (tenant_id,slug) do nothing", [tB]);
  const runB = await runScout({ tenantId: tB, trigger: 'human', candidates: [{ name: 'Bravo NV', domain: 'bravo.nl' }] });
  assert.equal(runB.ok, true);
  assert.equal((await items(tB)).every((i) => i.title.includes('Bravo')), true, 'tenant B only sees its own work');
  assert.equal((await items(t)).some((i) => i.title.includes('Bravo')), false, 'tenant A never sees tenant B work');

  await closePool();
});
