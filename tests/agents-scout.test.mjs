// Digital Colleagues — Growth/Lead colleague (Scout) end-to-end (DB-E2E).
// Runs only with a real DATABASE_URL (COMM_LAYER_ENABLED). Skipped otherwise, like the comm suite.
//
// Proves the safety-critical behaviour: tenant isolation, idempotency / double-submit protection,
// mandate enforcement, provenance, no external action without approval, correct state transitions,
// failure handling, and that agent output is never silently stored as confirmed relational fact.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMigrations } from '../server/comm/migrate.mjs';
import { query, withTransaction, closePool } from '../server/comm/db.mjs';
import { getDefaultTenantId } from '../server/comm/tenant.mjs';
import { resolveContactTx } from '../server/comm/repo.mjs';
import { createWorkItem, getWorkItem } from '../server/agents/work.mjs';
import { runScout } from '../server/agents/scout/runner.mjs';
import { listFindings, getFinding, promoteFinding, dismissFinding } from '../server/agents/findings.mjs';
import { listRuns } from '../server/agents/run.mjs';
import { getActor } from '../server/agents/registry.mjs';
import { preparedWorkForCockpit, cockpitSummary, agentContributionsForOrganization } from '../server/agents/cockpit.mjs';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — Scout E2E skipped' };

async function audited(action, tenantId = null) {
  const r = await query(`select count(*)::int n from audit_event where action=$1 and ($2::uuid is null or tenant_id=$2)`, [action, tenantId]);
  return r.rows[0].n;
}

test('Growth colleague (Scout) works end-to-end inside the shared truth', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate agent_evidence, agent_finding, agent_run, work_item, relationship_memory, activity, contact, organization, channel_identity, audit_event cascade');
  const t = await getDefaultTenantId();

  // Seed an existing relationship (Kim at OCA) so the warm-path branch operates on REAL data.
  await withTransaction((c) => resolveContactTx(c, t, { first_name: 'Kim', last_name: 'de Vries', email: 'kim@oca.nl', company_name: 'OCA', domain: 'oca.nl' }));
  const scout = await getActor(t, 'scout');
  assert.equal(scout.autonomy, 'PREPARE', 'Scout is granted PREPARE autonomy (safe default)');

  // --- 1) a growth work item with real, human-provided candidates, then run Scout ---------------
  const wi = await createWorkItem(t, {
    type: 'growth_discovery', objective: 'Kwalificeer kandidaten', createdBy: scout.id, assignedTo: scout.id, assignedRole: 'growth',
    input: { candidates: [
      { name: 'Acme BV', domain: 'acme.nl', note: 'actief in onderwijs' },
      { name: 'OCA', domain: 'oca.nl' },
      { name: 'Vaag Idee' },
    ] },
  });
  const run = await runScout({ tenantId: t, workItemId: wi.id, trigger: 'human' });
  assert.equal(run.ok, true);
  assert.equal(run.findings, 3, 'three candidates qualified');
  assert.equal(run.alreadyKnown, 1, 'OCA recognised as already known (dedup)');

  const work = await getWorkItem(t, wi.id);
  assert.equal(work.status, 'awaiting_human', 'findings await a human decision');

  // --- 2) epistemic status + confidence are distinct and honest -------------------------------
  const findings = await listFindings(t, { workItemId: wi.id, withEvidence: true });
  const byTitle = Object.fromEntries(findings.map((f) => [f.title, f]));
  assert.equal(byTitle.OCA.epistemic_status, 'INFERENCE');
  assert.equal(byTitle.OCA.already_known, true);
  assert.equal(byTitle.OCA.proposed_action.kind, 'prepare_intro');
  assert.equal(byTitle['Acme BV'].epistemic_status, 'OBSERVATION');
  assert.equal(byTitle['Acme BV'].proposed_action.kind, 'human_review');
  assert.equal(byTitle['Vaag Idee'].epistemic_status, 'HYPOTHESIS');
  assert.ok(Number(byTitle.OCA.confidence) > Number(byTitle['Acme BV'].confidence));
  assert.ok(Number(byTitle['Acme BV'].confidence) > Number(byTitle['Vaag Idee'].confidence));

  // Every finding requires human approval by default and starts 'new' (never auto-accepted).
  for (const f of findings) { assert.equal(f.approval_required, true); assert.equal(f.status, 'new'); }

  // --- 3) provenance: evidence rows + run trail + audit ---------------------------------------
  assert.ok(byTitle.OCA.evidence.length >= 2, 'warm candidate has multiple evidence items');
  assert.ok(byTitle.OCA.evidence.some((e) => e.source_type === 'internal_db'), 'evidence is grounded in real DB facts');
  const runs = await listRuns(t, { workItemId: wi.id });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, 'succeeded');
  assert.ok(runs[0].capability_calls.length >= 3, 'the run records what capabilities it called');
  assert.ok((await audited('finding_created', t)) >= 3);
  assert.ok((await audited('agent_run_started', t)) >= 1 && (await audited('agent_run_finished', t)) >= 1);

  // --- 4) idempotency / double-submit protection ----------------------------------------------
  const run2 = await runScout({ tenantId: t, workItemId: wi.id, trigger: 'human' });
  assert.equal(run2.reused, true, 'a second run is a safe no-op');
  assert.equal((await listFindings(t, { workItemId: wi.id })).length, 3, 'no duplicate findings');
  assert.equal((await listRuns(t, { workItemId: wi.id })).length, 1, 'no duplicate succeeded run');

  // --- 5) promotion is a HUMAN action; state transition is confirmed, claims stay proposed ------
  const promo = await promoteFinding(t, byTitle.OCA.id, { userId: null, note: 'warme ingang' });
  assert.equal(promo.ok, true);
  const org = (await query('select relationship_stage from organization where id=$1', [promo.organizationId])).rows[0];
  assert.equal(org.relationship_stage, 'LEAD', 'promotion sets a CONFIRMED lead stage in the shared truth');
  const mem = (await query('select source, confidence from relationship_memory where organization_id=$1', [promo.organizationId])).rows;
  assert.ok(mem.length >= 1);
  assert.equal(mem[0].confidence, 'proposed', 'the underlying claims stay PROPOSED, never silently confirmed');
  assert.equal((await getFinding(t, byTitle.OCA.id)).status, 'promoted');
  assert.ok((await audited('finding_promoted', t)) >= 1);

  // --- 6) dismissal records a reason (trains the colleague) ------------------------------------
  const dis = await dismissFinding(t, byTitle['Vaag Idee'].id, { userId: null, note: 'niet relevant' });
  assert.equal(dis.ok, true);
  assert.equal((await getFinding(t, byTitle['Vaag Idee'].id)).status, 'dismissed');
  assert.ok((await audited('finding_dismissed', t)) >= 1);

  // --- 7) Cockpit integration contract shows prepared work + the promoted contribution ---------
  const prepared = await preparedWorkForCockpit(t, { status: 'new' });
  assert.ok(prepared.every((p) => p.status === 'new'));
  assert.ok(prepared.find((p) => p.title === 'Acme BV'), 'Acme still awaits a decision');
  const summary = await cockpitSummary(t);
  assert.equal(summary.promoted, 1);
  const contrib = await agentContributionsForOrganization(t, promo.organizationId);
  assert.ok(contrib.find((c) => c.status === 'promoted'), 'the promoted lead is visible on the org dossier');

  // --- 8) mandate + autonomy enforcement: external discovery is denied, run fails cleanly -------
  const wiExt = await createWorkItem(t, { type: 'growth_discovery', objective: 'extern', createdBy: scout.id, assignedTo: scout.id, input: { scope: 'external_web', candidates: [] } });
  const runExt = await runScout({ tenantId: t, workItemId: wiExt.id, trigger: 'human' });
  assert.equal(runExt.ok, false);
  assert.match(runExt.error, /mandate_denied/);
  assert.equal((await getWorkItem(t, wiExt.id)).status, 'failed', 'a denied run leaves the work item failed, not half-done');
  assert.ok((await audited('mandate_denied', t)) >= 1);
  assert.equal((await listFindings(t, { workItemId: wiExt.id })).length, 0, 'no findings created for a denied run');

  // --- 9) tenant isolation: a second tenant never sees tenant A's work -------------------------
  await query("insert into tenant(slug,name) values('maculis-b','Maculis B') on conflict (slug) do nothing");
  const tB = (await query("select id from tenant where slug='maculis-b'")).rows[0].id;
  await query("insert into actor(tenant_id,kind,slug,display_name,role,autonomy) values($1,'AGENT','scout','Scout','growth','PREPARE') on conflict (tenant_id,slug) do nothing", [tB]);
  const scoutB = await getActor(tB, 'scout');
  const wiB = await createWorkItem(tB, { type: 'growth_discovery', objective: 'B', createdBy: scoutB.id, assignedTo: scoutB.id, input: { candidates: [{ name: 'Bravo NV', domain: 'bravo.nl' }] } });
  const runB = await runScout({ tenantId: tB, workItemId: wiB.id, trigger: 'human' });
  assert.equal(runB.ok, true);
  assert.equal((await listFindings(tB, {})).every((f) => f.title === 'Bravo NV'), true, 'tenant B only sees its own finding');
  assert.equal((await listFindings(t, {})).some((f) => f.title === 'Bravo NV'), false, 'tenant A never sees tenant B findings');
  assert.equal((await listFindings(tB, {})).some((f) => f.title === 'Acme BV'), false, 'tenant B never sees tenant A findings');

  await closePool();
});
