// Digital Colleagues — mandate / autonomy model + deterministic discovery provider (pure unit).
// No DB required — always runs. Proves the safety gates and the honest provider boundary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, requiresApproval, colleagueCard, autonomyRank, AUTONOMY_LEVELS } from '../server/agents/registry.mjs';
import { internalQualify, externalProvider } from '../server/agents/providers/discovery.mjs';

const scout = { slug: 'scout', role: 'growth', autonomy: 'PREPARE', status: 'active', display_name: 'Scout', kind: 'AGENT' };

test('autonomy ladder is ordered and safe-by-default', () => {
  assert.deepEqual(AUTONOMY_LEVELS, ['OBSERVE', 'PROPOSE', 'PREPARE', 'ACT_WITH_APPROVAL', 'AUTONOMOUS']);
  assert.ok(autonomyRank('OBSERVE') < autonomyRank('PREPARE'));
  assert.ok(autonomyRank('PREPARE') < autonomyRank('ACT_WITH_APPROVAL'));
  assert.equal(autonomyRank('NONSENSE'), AUTONOMY_LEVELS.length); // unknown => most restrictive
});

test('Scout may observe, propose and prepare on its own', () => {
  assert.equal(can(scout, 'read_shared_truth').ok, true);
  assert.equal(can(scout, 'create_finding').ok, true);
  assert.equal(can(scout, 'write_proposed_memory').ok, true);
  assert.equal(can(scout, 'prepare_work').ok, true);
});

test('Scout may NOT send, promote, set consent, read privacy, merge identity or reach external web', () => {
  assert.equal(can(scout, 'send_external').ok, false);
  assert.equal(can(scout, 'promote_lead').ok, false);
  assert.equal(can(scout, 'set_consent').ok, false);
  assert.equal(can(scout, 'read_privacy').ok, false);
  assert.equal(can(scout, 'merge_identity').ok, false);
  assert.equal(can(scout, 'external_discovery').ok, false);
  // send/promote are above its autonomy AND organisationally forbidden -> always need a human.
  assert.equal(requiresApproval(scout, 'send_external'), true);
  assert.equal(requiresApproval(scout, 'promote_lead'), true);
});

test('mandate is independent of autonomy: even AUTONOMOUS growth cannot send/promote/read privacy', () => {
  const powerful = { ...scout, autonomy: 'AUTONOMOUS' };
  assert.equal(can(powerful, 'send_external').ok, false, 'forbid list still blocks send');
  assert.equal(can(powerful, 'promote_lead').ok, false, 'forbid list still blocks promote');
  assert.equal(can(powerful, 'read_privacy').ok, false, 'forbid list still blocks privacy');
  assert.equal(can(powerful, 'external_discovery').ok, false, 'forbid list still blocks external web');
});

test('unknown action and unknown role default to deny', () => {
  assert.equal(can(scout, 'nuke_everything').ok, false);
  assert.equal(can(scout, 'nuke_everything').reason, 'unknown_action');
  const ghost = { slug: 'ghost', role: 'unmapped', autonomy: 'AUTONOMOUS', status: 'active' };
  assert.equal(can(ghost, 'create_finding').ok, false, 'unmapped role has no mandate');
  assert.equal(can(ghost, 'create_finding').reason, 'no_mandate');
});

test('inactive actor cannot act', () => {
  assert.equal(can({ ...scout, status: 'paused' }, 'read_shared_truth').ok, false);
});

test('colleague card separates what is autonomous vs needs human approval', () => {
  const card = colleagueCard(scout);
  assert.equal(card.slug, 'scout');
  assert.ok(card.mayAutonomously.includes('create_finding'));
  assert.ok(card.mayAutonomously.includes('prepare_work'));
  assert.ok(card.needsHumanApproval.includes('send_external'));
  assert.ok(card.needsHumanApproval.includes('promote_lead'));
  assert.ok(card.forbidden.includes('send'));
});

// ---- deterministic discovery provider (honest, evidence-grounded) ------------------------------

test('provider qualifies a warm, already-known org as INFERENCE with high confidence + a prepared intro', () => {
  const q = internalQualify({
    candidate: { name: 'OCA', domain: 'oca.nl' },
    known: { organization: { id: 'o1', name: 'OCA', stage: null }, contacts: [{ id: 'c1', first_name: 'Kim', last_name: 'de Vries', email: 'kim@oca.nl' }], activityCount: 2 },
  });
  assert.equal(q.epistemicStatus, 'INFERENCE');
  assert.ok(q.confidence >= 0.8);
  assert.equal(q.proposedAction.kind, 'prepare_intro');
  assert.equal(q.proposedAction.approval_required, true, 'preparing an intro still needs human approval to actually contact');
  // Evidence is grounded and labelled by source; nothing invented.
  const sources = q.evidence.map((e) => e.sourceType);
  assert.ok(sources.includes('internal_db'));
  assert.ok(q.evidence.every((e) => e.provider === 'internal'));
});

test('provider qualifies a domain-only unknown org as OBSERVATION needing human review', () => {
  const q = internalQualify({ candidate: { name: 'Acme BV', domain: 'acme.nl' }, known: { organization: null, contacts: [], activityCount: 0 } });
  assert.equal(q.epistemicStatus, 'OBSERVATION');
  assert.equal(q.proposedAction.kind, 'human_review');
  assert.ok(q.confidence < 0.8 && q.confidence > 0.3);
});

test('provider qualifies a bare name as a weak HYPOTHESIS, never a confident fact', () => {
  const q = internalQualify({ candidate: { name: 'Vaag Idee' }, known: { organization: null, contacts: [], activityCount: 0 } });
  assert.equal(q.epistemicStatus, 'HYPOTHESIS');
  assert.ok(q.confidence <= 0.3);
});

test('external discovery provider is not configured and returns NO fabricated candidates', async () => {
  const ext = externalProvider();
  assert.equal(ext.configured, false);
  const d = await ext.discover();
  assert.equal(d.ok, false);
  assert.deepEqual(d.candidates, []);
  await assert.rejects(() => ext.qualify(), /external_discovery_not_configured/);
});
