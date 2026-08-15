// Engine port self-tests: prove the ported gate keeps the frozen discipline, especially that
// SILENCE is produced for thin/generic/single-lens input, and that the two gate profiles differ
// only on quantitative families. Run: node --test lens-bakeoff/engine/engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGate, selectReveal, toCandidate, DEFAULT_GATE_CONFIG, FROZEN_UNDENIABLE, EXTENDED_UNDENIABLE, isWallpaper } from './engine.mjs';

const obs = (id, subject, notes = '') => ({ observation_id: id, subject, notes, raw_evidence: [{ surface: 's', value: 'v', method: 'deterministic' }] });
const rel = (family, obsIds, extra = {}) => ({
  relation_id: 'r', family, observation_ids: obsIds, cross_lens: false,
  tension: 't', why_might_matter: 'w', confidence: 'L3', basis: [{ surface: 's', value: 'v', method: 'file' }], ...extra,
});

test('wallpaper subject is suppressed (specificity)', () => {
  const observations = [obs('o1', 'kwaliteit')];
  const r = rel('CONTRADICTION', ['o1']);
  const cand = toCandidate(r, 'neutral', 'L3');
  const g = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(g.passed, false);
  assert.match(g.suppressed_reason, /specificity/);
});

test('self-stated (acknowledged) is not a reveal', () => {
  const observations = [obs('o1', 'persoonlijke aandacht', 'acknowledged')];
  const r = rel('CONTRADICTION', ['o1']);
  const cand = toCandidate(r, 'neutral', 'L3');
  const g = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(g.passed, false);
  assert.match(g.suppressed_reason, /already_stated/);
});

test('L2 relation is below the evidence floor', () => {
  const observations = [obs('o1', 'debiteurentermijn')];
  const r = rel('CONTRADICTION', ['o1'], { confidence: 'L2' });
  const cand = toCandidate(r, 'neutral', 'L2');
  const g = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(g.passed, false);
  assert.match(g.suppressed_reason, /evidence_floor/);
});

test('causal/recommendation framing is forbidden, but quoted evidence is exempt', () => {
  const observations = [obs('o1', 'strategie')];
  const r = rel('CONTRADICTION', ['o1']);
  const bad = runGate(toCandidate(r, 'je moet dit verbeteren', 'L3'), r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(bad.passed, false);
  assert.match(bad.suppressed_reason, /defensible/);
  const okQuoted = runGate(toCandidate(r, 'De belofte "strategisch advies" komt niet terug in klanttaal.', 'L3'), r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(okQuoted.passed, true);
});

test('single-lens CONCENTRATION fails the frozen gate but passes the extended gate', () => {
  const observations = [obs('o1', 'klantconcentratie')];
  const r = rel('CONCENTRATION', ['o1'], { cross_lens: false });
  const cand = toCandidate(r, 'Eén klant is 40% van je omzet.', 'L4');
  const frozen = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  const extended = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: EXTENDED_UNDENIABLE });
  assert.equal(frozen.passed, false);
  assert.match(frozen.suppressed_reason, /attention_worthy/);
  assert.equal(extended.passed, true);
});

test('a clean cross-lens CONTRADICTION passes the frozen gate', () => {
  const observations = [obs('o1', 'oppervlaktegezondheid'), obs('o2', 'oprichterafhankelijkheid')];
  const r = rel('CONTRADICTION', ['o1', 'o2'], { cross_lens: true });
  const cand = toCandidate(r, 'Je cijfers zijn gezond en toch loopt bijna alles via jou.', 'L4');
  const g = runGate(cand, r, observations, { ...DEFAULT_GATE_CONFIG, undeniable: FROZEN_UNDENIABLE });
  assert.equal(g.passed, true);
});

test('selector prefers CONTRADICTION over lower families', () => {
  const a = { candidate_id: 'a', family: 'MISCAST', significance: 'L4', cross_lens: false };
  const b = { candidate_id: 'b', family: 'CONTRADICTION', significance: 'L3', cross_lens: false };
  assert.equal(selectReveal([a, b]).candidate_id, 'b');
});

test('isWallpaper flags generic, spares specific', () => {
  assert.equal(isWallpaper('kwaliteit'), true);
  assert.equal(isWallpaper('persoonlijke aandacht'), false);
});
