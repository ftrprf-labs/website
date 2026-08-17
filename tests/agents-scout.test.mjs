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
  // New epistemic model: fit and identity are separate, and a cold operator-provided lead with no
  // external signal is low-fit, unverified identity, and an 'awareness' (investigate) ask — not approval.
  assert.equal(typeof veld.evidence.fitConfidence, 'number');
  assert.ok(veld.evidence.fitConfidence >= 0 && veld.evidence.fitConfidence < 1);
  assert.equal(veld.evidence.identityStatus, 'unverified');
  assert.equal(veld.needs, 'awareness', 'a cold, unverified lead only asks to be looked at');

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

test('Dedupe/memory: after acceptance, a second run recognises the org and never duplicates it', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate attention_item, agent_run, activity, contact, organization, channel_identity, audit_event cascade');
  const t = await getDefaultTenantId();

  // Deterministic injected sources (real provider shapes; no live network) for TopzorgGroep.
  const websiteLike = { name: 'website', signals: async ({ domain }) => domain ? { signals: [{ claim: 'Publieke positionering op de website.', confidence: 0.4, source: 'company-website', url: `https://${domain}/`, relevantNow: true }] } : { signals: [] } };
  const tedLike = { name: 'ted', signals: async ({ name }) => name ? { signals: [{ claim: 'Recente EU-aanbesteding (TED).', confidence: 0.55, source: 'TED', sourceType: 'ted', url: 'https://ted.europa.eu/n/1', uncertainties: ['Naam-match kan een naamgenoot betreffen.'] }] } : { signals: [] } };
  const src = { sources: [websiteLike, tedLike] };
  const cand = { name: 'TopzorgGroep', domain: 'topzorggroep.nl' };

  // 1) first run: a cold lead -> awareness (investigate), proposed as a NEW relation, identity probable.
  const r1 = await runScout({ tenantId: t, trigger: 'human', ...src, candidates: [cand] });
  assert.equal(r1.ok, true);
  const first = (await items(t)).find((i) => i.title.includes('TopzorgGroep'));
  assert.ok(first && first.proposedRelation, 'a not-yet-known org rides as a proposedRelation');
  assert.equal(first.needs, 'awareness', 'cold + unverified -> awareness, not approval');
  assert.equal(first.evidence.identityStatus, 'probable', 'the own website makes identity probable');

  // 2) the human accepts it -> it materialises as exactly one organization + one contact.
  const approved = await resolveWorkItem(t, first.id, 'approve', { actorKey: 'lud' });
  assert.equal(approved.ok, true);
  const orgCount = async () => Number((await query("select count(*)::int n from organization where lower(name)='topzorggroep'")).rows[0].n);
  assert.equal(await orgCount(), 1, 'exactly one organization after acceptance');

  // 3) SECOND run on the SAME org+domain: it must be recognised, never re-proposed, never duplicated.
  const r2 = await runScout({ tenantId: t, trigger: 'human', ...src, candidates: [cand] });
  assert.equal(r2.ok, true);
  assert.equal(await orgCount(), 1, 'the second run creates NO second organization');
  assert.equal(Number((await query("select count(*)::int n from contact c join organization o on o.id=c.organization_id where lower(o.name)='topzorggroep'")).rows[0].n), 1, 'no duplicate contact');

  // The second run surfaces new signals against the EXISTING relation (no proposedRelation).
  const open = (await items(t)).filter((i) => i.title.includes('TopzorgGroep'));
  const fyi = open.find((i) => !i.proposedRelation);
  assert.ok(fyi, 'the second run attaches to the existing relation');
  assert.equal(fyi.proposedRelation, null, 'never a new relation for a known org');
  assert.ok(fyi.contactId || fyi.org, 'it references the existing reality');
  assert.equal(fyi.needs, 'awareness');
  await closePool();
});

test('Scout folds an external source signal into the landed evidence (injected source, no live call)', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate attention_item, agent_run, activity, contact, organization, channel_identity, audit_event cascade');
  const t = await getDefaultTenantId();

  // An injected SOURCE provider (a stand-in for the website provider) — deterministic, no network.
  const injectedSource = {
    name: 'website',
    signals: async ({ domain }) => domain === 'veldwerk.be'
      ? { signals: [{ claim: 'Vacaturepagina aanwezig op de website.', confidence: 0.5, source: 'company-website', url: 'https://veldwerk.be/', relevantNow: true, reason: 'zichtbare werving kan op groei wijzen' }] }
      : { signals: [] },
  };

  const run = await runScout({ tenantId: t, trigger: 'human', sources: [injectedSource], candidates: [{ name: 'Veldwerk', domain: 'veldwerk.be', email: 'tibo@veldwerk.be' }] });
  assert.equal(run.ok, true);
  const item = (await listWorkItems(t, {})).map(shapeWorkItem)[0];
  const ext = (item.evidence.external || []).find((e) => e.url === 'https://veldwerk.be/');
  assert.ok(ext, 'the external observation appears on the attention item, source-attributed');
  assert.equal(ext.kind, 'OBSERVATION', 'an external signal is an OBSERVATION, not a FACT');
  // The run trace shows the source-gathering capability was called.
  const succeeded = (await listRuns(t, {})).find((r) => r.status === 'succeeded');
  assert.ok(succeeded.capability_calls.some((c) => c.capability === 'gather_external_signals'));
  await closePool();
});

test('Scout combines website + TED signals and KVK verification, keeping FACT vs external distinct', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate attention_item, agent_run, activity, contact, organization, channel_identity, audit_event cascade');
  const t = await getDefaultTenantId();

  // Injected external SOURCE providers (real provider shapes, deterministic; no live network).
  const websiteLike = { name: 'website', signals: async ({ domain }) => domain ? { signals: [{ claim: 'Vacaturepagina aanwezig op de website.', confidence: 0.5, source: 'company-website', url: `https://${domain}/`, relevantNow: true }] } : { signals: [] } };
  // The TED notice names the SAME entity the verifier confirms, so entity binding attributes it to us.
  const tedLike = { name: 'ted', signals: async ({ name }) => name ? { signals: [{ claim: 'Recente EU-aanbesteding (TED).', confidence: 0.55, source: 'TED', url: 'https://ted.europa.eu/en/notice/-/detail/1-2026', sourceType: 'ted', relevantNow: true, observedEntityName: 'Veldwerk BV', country: 'NL', uncertainties: ['Naam-match kan een naamgenoot betreffen.'] }] } : { signals: [] } };
  const kvkLike = { name: 'kvk', verify: async ({ name }) => name ? { matches: [{ source: 'KVK', kvkNumber: '12345678', name: 'Veldwerk BV', place: 'Utrecht', country: 'NL' }] } : { matches: [] } };

  const run = await runScout({
    tenantId: t, trigger: 'human', sources: [websiteLike, tedLike], verificationSources: [kvkLike],
    candidates: [{ name: 'Veldwerk', domain: 'veldwerk.be', email: 'tibo@veldwerk.be' }],
  });
  assert.equal(run.ok, true);
  const item = (await listWorkItems(t, {})).map(shapeWorkItem)[0];

  // Official verification is a FACT (verified identity) with the register as source.
  const verifiedFact = (item.evidence.facts || []).find((f) => f.source === 'KVK');
  assert.ok(verifiedFact, 'KVK verification lands as a FACT');
  assert.match(verifiedFact.text, /Officieel geverifieerd/);

  // Website + TED land as EXTERNAL observations, each with a source URL — never relabelled as fact.
  const exts = item.evidence.external || [];
  assert.ok(exts.some((e) => /company-website|veldwerk\.be/.test((e.source || '') + (e.url || ''))), 'website observation present');
  assert.ok(exts.some((e) => (e.source === 'TED') || /ted\.europa\.eu/.test(e.url || '')), 'TED observation present');
  assert.ok(exts.every((e) => e.kind === 'OBSERVATION'), 'external signals are OBSERVATION, never FACT');

  // The chain is traceable: the run recorded gathering signals AND verifying identity.
  const succeeded = (await listRuns(t, {})).find((r) => r.status === 'succeeded');
  assert.ok(succeeded.capability_calls.some((c) => c.capability === 'gather_external_signals'));
  assert.ok(succeeded.capability_calls.some((c) => c.capability === 'verify_identity'));
  await closePool();
});

test('OCA regression: a Spanish TED namesake is found but never becomes evidence about the NL OCA', opts, async () => {
  await runMigrations({ silent: true });
  await query('truncate attention_item, agent_run, activity, contact, organization, channel_identity, audit_event cascade');
  const t = await getDefaultTenantId();

  // First-party website (bound) + two Spanish TED name-matches (must stay unbound). No verification.
  const websiteLike = { name: 'website', signals: async ({ domain }) => domain ? { signals: [{ claim: 'Publieke positionering op de website.', confidence: 0.4, source: 'company-website', url: `https://${domain}/`, relevantNow: true }] } : { signals: [] } };
  const tedLike = { name: 'ted', signals: async ({ name }) => name ? { signals: [
    { claim: 'Spain – Hazard protection and control consultancy services.', confidence: 0.55, source: 'TED', sourceType: 'ted', url: 'https://ted.europa.eu/n/es-1', observedEntityName: 'OCA GLOBAL PREVENTION, S.A.', country: 'ES', uncertainties: ['Naam-match kan een naamgenoot betreffen.'] },
    { claim: 'Spain – Inspection services.', confidence: 0.55, source: 'TED', sourceType: 'ted', url: 'https://ted.europa.eu/n/es-2', observedEntityName: 'OCA Prevención S.L.', country: 'ES' },
  ] } : { signals: [] } };

  const run = await runScout({ tenantId: t, trigger: 'human', sources: [websiteLike, tedLike], candidates: [{ name: 'OCA', domain: 'oca.nl' }] });
  assert.equal(run.ok, true);
  const item = (await listWorkItems(t, {})).map(shapeWorkItem).find((i) => i.title.includes('OCA'));
  assert.ok(item, 'OCA still lands (first-party website is legitimate evidence)');

  // 1) no Spanish TED hit appears as a visible observation about OCA
  const exts = item.evidence.external || [];
  assert.ok(exts.some((e) => /oca\.nl|company-website/.test((e.source || '') + (e.url || ''))), 'the first-party website observation is present');
  assert.ok(exts.every((e) => !/ted\.europa\.eu/.test(e.url || '')), 'no TED namesake is surfaced as evidence about OCA');
  // 2) the unbound hits are kept internally only, never counted
  assert.equal(item.evidence.unresolvedCount, 2, 'both namesakes are retained as unbound candidate evidence');
  assert.ok((item.evidence.candidateEvidence || []).every((c) => /ted/i.test(c.source) && c.reason !== 'first-party-website'));
  // 3) fit is NOT inflated by TED and there is no multi-source corroboration
  assert.equal(item.evidence.fitBreakdown.corroboration, 0, 'a single bound source cannot corroborate');
  assert.ok(!item.evidence.fitBreakdown.perSource.ted, 'TED adds nothing to fit');
  assert.equal(item.evidence.identityStatus, 'probable');
  assert.equal(item.needs, 'awareness');
  // 4) the run trace records the binding decision
  const succeeded = (await listRuns(t, {})).find((r) => r.status === 'succeeded');
  assert.ok(succeeded.capability_calls.some((c) => c.capability === 'bind_evidence' && /unbound=2/.test(c.note || '')));
  await closePool();
});
