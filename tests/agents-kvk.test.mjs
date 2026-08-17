// Digital Colleagues — KVK identity VERIFICATION model (pure unit, no key, no paid call, no network).
// KVK answers "which legal entity are we investigating?", not "how interesting is it?". The matcher is
// deliberately conservative: it optimises for the FEWEST wrong verifications. Ambiguous -> UNCERTAIN,
// weak -> NONE; only a strong AND clearly-winning match is VERIFIED. Trade names count; a conflicting
// city is a hard penalty. All eight required scenarios are covered here with injected responses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreKvkCandidate, decideKvk, kvkVerify, extractKvkMatches, KVK_DECISION } from '../server/agents/providers/kvk.mjs';
import { resolveTargetEntity, bindSignal } from '../server/agents/entity.mjs';

const cand = (name, extra = {}) => ({ source: 'KVK', name, kvkNumber: extra.kvkNumber || '000', place: extra.place || null, type: extra.type || 'Rechtspersoon', tradeNames: extra.tradeNames || [], active: extra.active !== false });

test('scoreKvkCandidate: exact legal/trade name is strong; a fuzzy overlap is weak', () => {
  assert.equal(scoreKvkCandidate({ name: 'Veldwerk Ecologie B.V.' }, cand('Veldwerk Ecologie B.V.')).nameScore, 1.0);
  assert.equal(scoreKvkCandidate({ name: 'OCA' }, cand('OCA Nederland B.V.', { tradeNames: ['OCA'] })).nameScore, 1.0);
  assert.ok(scoreKvkCandidate({ name: 'OCA' }, cand('OCA GLOBAL PREVENTION, S.A.')).nameScore < 0.5);
});

test('1) exact rechtspersoon match -> VERIFIED', () => {
  const d = decideKvk({ name: 'Veldwerk Ecologie B.V.' }, [cand('Veldwerk Ecologie B.V.', { kvkNumber: '111', place: 'Utrecht' })]);
  assert.equal(d.status, 'VERIFIED');
  assert.equal(d.match.kvkNumber, '111');
});

test('2) trade-name match -> VERIFIED', () => {
  const d = decideKvk({ name: 'OCA' }, [cand('OCA Nederland B.V.', { kvkNumber: '222', place: 'Amsterdam', tradeNames: ['OCA', 'OCA Keuringen'] })]);
  assert.equal(d.status, 'VERIFIED');
  assert.equal(d.match.basis, 'exact-trade-name');
});

test('3) multiple similar KVK results -> UNCERTAIN (no clear winner)', () => {
  const d = decideKvk({ name: 'Jansen' }, [cand('Jansen B.V.', { kvkNumber: 'a', place: 'Rotterdam' }), cand('Jansen B.V.', { kvkNumber: 'b', place: 'Breda' })]);
  assert.equal(d.status, 'UNCERTAIN');
  assert.ok(d.alternatives.length >= 1);
});

test('4) right name but wrong place -> UNCERTAIN (place conflict is a hard penalty)', () => {
  const d = decideKvk({ name: 'Veldwerk Ecologie B.V.', place: 'Utrecht' }, [cand('Veldwerk Ecologie B.V.', { kvkNumber: '333', place: 'Groningen' })]);
  assert.equal(d.status, 'UNCERTAIN');
  assert.ok(d.match.reasons.includes('plaats:conflict'));
});

test('5) a namesake (only a generic shared token) -> NONE', () => {
  const d = decideKvk({ name: 'OCA' }, [cand('OCA GLOBAL PREVENTION, S.A.', { kvkNumber: 'x', place: 'Madrid' })]);
  assert.equal(d.status, 'NONE');
  assert.equal(d.match, null);
});

test('6) insufficient evidence (no rows) -> NONE', () => {
  assert.equal(decideKvk({ name: 'Onbekend' }, []).status, 'NONE');
  assert.equal(decideKvk({ name: 'Onbekend' }, [cand('Iets heel anders', {})]).status, 'NONE');
});

test('kvkVerify runs the whole search->parse->decide path with an injected response (no key)', async () => {
  const fetcher = async () => ({ ok: true, status: 200, json: async () => ({ resultaten: [{ kvkNummer: '99887766', naam: 'Veldwerk Ecologie B.V.', plaats: 'Utrecht', type: 'Rechtspersoon', handelsnamen: ['Veldwerk'] }] }) });
  const r = await kvkVerify({ name: 'Veldwerk Ecologie B.V.' }, fetcher, 'test-key');
  assert.equal(r.status, 'VERIFIED');
  assert.equal(r.matches[0].kvkNumber, '99887766');
  // a search that returns only a namesake yields no verification
  const fetcher2 = async () => ({ ok: true, status: 200, json: async () => ({ resultaten: [{ kvkNummer: '1', naam: 'OCA GLOBAL PREVENTION, S.A.', plaats: 'Madrid' }] }) });
  const r2 = await kvkVerify({ name: 'OCA' }, fetcher2, 'test-key');
  assert.equal(r2.status, 'NONE');
  assert.deepEqual(r2.matches, []);
});

test('extractKvkMatches parses kvkNummer, naam, handelsnamen, plaats defensively', () => {
  const m = extractKvkMatches({ resultaten: [{ kvkNummer: '12345678', naam: 'Veldwerk B.V.', handelsnamen: ['Veldwerk', { naam: 'VW' }], adres: { binnenlandsAdres: { plaats: 'Gent' } } }] });
  assert.equal(m.length, 1);
  assert.deepEqual(m[0].tradeNames, ['Veldwerk', 'VW']);
  assert.equal(m[0].place, 'Gent');
});

// ---- 7) & 8): a VERIFIED identity binds a matching TED hit; the Spanish namesake stays unbound ----

test('7) verified OCA + a matching TED hit -> the tender BINDS as evidence about OCA', () => {
  const verification = decideKvk({ name: 'OCA' }, [cand('OCA Nederland B.V.', { kvkNumber: '222', place: 'Amsterdam', tradeNames: ['OCA'] })]).match;
  const target = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: {}, verification: [verification] });
  assert.equal(target.verified.legalName, 'OCA Nederland B.V.');
  const b = bindSignal(target, { claim: 'Tender', source: 'TED', provider: 'ted', observedEntityName: 'OCA Nederland B.V.', country: 'NL', url: 'https://ted/1' });
  assert.equal(b.identityBound, true);
  assert.equal(b.bindingBasis, 'verified-legal-name');
});

test('8) verified NL OCA + Spanish "OCA GLOBAL PREVENTION, S.A." -> stays UNBOUND', () => {
  const verification = decideKvk({ name: 'OCA' }, [cand('OCA Nederland B.V.', { kvkNumber: '222', place: 'Amsterdam', tradeNames: ['OCA'] })]).match;
  const target = resolveTargetEntity({ candidate: { name: 'OCA', domain: 'oca.nl' }, known: {}, verification: [verification] });
  const b = bindSignal(target, { claim: 'Spanish tender', source: 'TED', provider: 'ted', observedEntityName: 'OCA GLOBAL PREVENTION, S.A.', country: 'ES', url: 'https://ted/es' });
  assert.equal(b.identityBound, false);
});

test('the conservative thresholds are exported and sane (fewest wrong verifications)', () => {
  assert.ok(KVK_DECISION.verifiedMin >= 0.8 && KVK_DECISION.margin >= 0.15 && KVK_DECISION.uncertainMin >= 0.5);
});
