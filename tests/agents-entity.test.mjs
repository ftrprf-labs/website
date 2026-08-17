// Digital Colleagues — ENTITY BINDING (pure unit, no DB, no network).
// Retrieval finds candidate information; binding decides whether it is really about the organisation
// under investigation. Only bound evidence may influence qualification / fit / corroboration.
// The OCA vs "OCA GLOBAL PREVENTION, S.A." namesake is the permanent regression case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetEntity, bindSignal, bindSignals, curateBound, strongNameMatch, normName } from '../server/agents/entity.mjs';
import { internalQualify } from '../server/agents/providers/discovery.mjs';

const NONE = () => ({ organization: null, contacts: [], activityCount: 0 });
const websiteSig = (domain) => ({ claim: 'Publieke positionering op de website.', confidence: 0.4, source: 'company-website', provider: 'website', url: `https://${domain}/`, relevantNow: true });
const tedSig = (org, country) => ({ claim: `Recente EU-aanbesteding (TED) (${org}).`, confidence: 0.55, source: 'TED', provider: 'ted', sourceType: 'ted', url: 'https://ted.europa.eu/n/1', observedEntityName: org, country: country || null, uncertainties: ['Naam-match kan een naamgenoot betreffen.'] });

test('normName strips legal suffixes and diacritics; strongNameMatch resists the namesake trap', () => {
  assert.equal(normName('Veldwerk B.V.'), 'veldwerk');
  assert.equal(normName('OCA GLOBAL PREVENTION, S.A.'), 'oca global prevention');
  assert.equal(strongNameMatch('Veldwerk B.V.', 'Veldwerk'), true);
  assert.equal(strongNameMatch('Jansen Bouw', 'Jansen Bouw B.V.'), true);
  // a single shared generic token is NOT a match
  assert.equal(strongNameMatch('OCA', 'OCA GLOBAL PREVENTION, S.A.'), false);
  assert.equal(strongNameMatch('OCA Nederland B.V.', 'OCA GLOBAL PREVENTION, S.A.'), false);
});

test('resolveTargetEntity carries name/domain and a verified legal identity when present', () => {
  const t0 = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: NONE(), verification: [] });
  assert.equal(t0.domain, 'oca.nl');
  assert.equal(t0.country, 'NL');
  assert.equal(t0.verified, null);
  const t1 = resolveTargetEntity({ candidate: { name: 'Veldwerk', domain: 'veldwerk.be' }, known: NONE(), verification: [{ source: 'KVK', name: 'Veldwerk B.V.', kvkNumber: '123', place: 'Gent' }] });
  assert.equal(t1.verified.legalName, 'Veldwerk B.V.');
  assert.equal(t1.verified.kvkNumber, '123');
});

test('a first-party website observation binds; a foreign-domain one does not', () => {
  const target = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: NONE(), verification: [] });
  const ok = bindSignal(target, websiteSig('oca.nl'));
  assert.equal(ok.identityBound, true);
  assert.equal(ok.bindingBasis, 'first-party-website');
  const bad = bindSignal(target, { ...websiteSig('oca.nl'), url: 'https://someone-else.com/' });
  assert.equal(bad.identityBound, false);
});

test('a TED name-match NEVER binds without a verified identity (the OCA namesake)', () => {
  const target = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: NONE(), verification: [] });
  const b = bindSignal(target, tedSig('OCA GLOBAL PREVENTION, S.A.', 'ES'));
  assert.equal(b.identityBound, false);
  assert.equal(b.bindingBasis, 'name-only');
});

test('with a verified identity, a matching TED hit binds; a namesake or wrong country stays unbound', () => {
  const target = resolveTargetEntity({ candidate: { name: 'Veldwerk', domain: 'veldwerk.nl' }, known: NONE(), verification: [{ source: 'KVK', name: 'Veldwerk B.V.', place: 'Utrecht', country: 'NL' }] });
  assert.equal(bindSignal(target, tedSig('Veldwerk B.V.', 'NL')).identityBound, true);
  assert.equal(bindSignal(target, tedSig('Veldwerk B.V.', 'ES')).bindingBasis, 'country-mismatch');
  // even with a verified NL identity, the Spanish namesake does not match the legal name
  const ocaTarget = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: NONE(), verification: [{ source: 'KVK', name: 'OCA Nederland B.V.', country: 'NL' }] });
  assert.equal(bindSignal(ocaTarget, tedSig('OCA GLOBAL PREVENTION, S.A.', 'ES')).identityBound, false);
});

test('curateBound dedups and keeps the strongest few', () => {
  const dup = websiteSig('x.nl');
  const list = [dup, { ...dup }, { ...tedSig('X B.V.', 'NL'), confidence: 0.9 }, { ...websiteSig('x.nl'), claim: 'Andere waarneming', confidence: 0.3 }];
  const out = curateBound(list, { max: 2 });
  assert.equal(out.length, 2);
  assert.equal(out[0].confidence, 0.9, 'strongest first');
  const all = curateBound(list, { max: 10 });
  assert.equal(all.length, 3, 'the exact duplicate is removed');
});

// ---- OCA end-to-end at the binding->qualify level (deterministic, the core regression) ----------

test('OCA: the Spanish TED namesake is unbound, invisible, and does NOT raise fit or corroboration', () => {
  const candidate = { name: 'OCA', domain: 'oca.nl' };
  const raw = [websiteSig('oca.nl'), tedSig('OCA GLOBAL PREVENTION, S.A.', 'ES'), tedSig('OCA Prevención S.L.', 'ES')];
  const target = resolveTargetEntity({ candidate, known: NONE(), verification: [] });
  const { bound, unbound } = bindSignals(target, raw);
  assert.deepEqual(bound.map((s) => s.provider), ['website'], 'only the first-party website binds');
  assert.equal(unbound.length, 2, 'both Spanish TED hits stay unbound');

  const q = internalQualify({ candidate, known: NONE(), externalSignals: curateBound(bound), verification: [] });
  // fit reflects ONLY the bound website signal; no TED contribution, no multi-source corroboration.
  assert.equal(q.fitBreakdown.corroboration, 0, 'a single bound source cannot corroborate');
  assert.ok(!q.fitBreakdown.perSource.ted, 'TED contributes nothing to fit');
  assert.ok(q.fitConfidence <= 0.2, `fit stays low without bound external activity (${q.fitConfidence})`);
  // the visible evidence contains no TED observation
  const exts = q.evidence.filter((e) => e.sourceType === 'external');
  assert.ok(exts.every((e) => !/ted\.europa\.eu/.test(e.url || '')), 'no TED observation is surfaced as evidence about OCA');
  assert.equal(q.identityStatus, 'probable', 'the own website makes identity probable, not verified');
});

test('positive: after injected identity verification, a matching TED hit DOES bind and corroborate', () => {
  const candidate = { name: 'Veldwerk', domain: 'veldwerk.nl' };
  const verification = [{ source: 'KVK', name: 'Veldwerk B.V.', kvkNumber: '99', country: 'NL' }];
  const raw = [websiteSig('veldwerk.nl'), tedSig('Veldwerk B.V.', 'NL')];
  const target = resolveTargetEntity({ candidate, known: NONE(), verification });
  const { bound, unbound } = bindSignals(target, raw);
  assert.equal(unbound.length, 0);
  assert.deepEqual(bound.map((s) => s.provider).sort(), ['ted', 'website']);
  const q = internalQualify({ candidate, known: NONE(), externalSignals: curateBound(bound), verification });
  assert.equal(q.identityStatus, 'verified');
  assert.equal(q.fitBreakdown.corroboration > 0, true, 'two bound independent sources corroborate');
});
