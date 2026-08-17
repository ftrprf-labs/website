// Digital Colleagues — discovery SOURCE layer (pure unit, no DB, no live network).
// Proves the multi-source architecture, the credential-free website provider (robots-respecting,
// off by default, injected fetch), normalisation, and that external signals fold into Scout's
// reasoning as EXTERNAL observations (never as our own fact).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { websiteProvider, extractSignals, robotsAllows, fetchWebsiteSignals } from '../server/agents/providers/website.mjs';
import { gatherExternalSignals, gatherVerification, sourceProviderStatus } from '../server/agents/providers/registry.mjs';
import { internalQualify, FIT } from '../server/agents/providers/discovery.mjs';
import { buildEvidence } from '../server/agents/scout/runner.mjs';
import { tedProvider, buildTedQuery, extractTedSignals, textOf, fetchTedSignals } from '../server/agents/providers/ted.mjs';
import { kvkProvider, extractKvkMatches } from '../server/agents/providers/kvk.mjs';

const HTML = `<html><head><title>Veldwerk — bureau voor ecologisch onderzoek</title>
<meta name="description" content="Wij doen veldwerk en advies."></head>
<body><a href="/vacatures">Vacatures</a><a href="/nieuws">Nieuws</a></body></html>`;

// A deterministic fake fetch (WHATWG shape). Never touches the network.
function fakeFetch(map) {
  return async (url) => {
    if (url in map) { const v = map[url]; return { ok: v.ok !== false, status: v.status || 200, text: async () => v.body || '' }; }
    return { ok: false, status: 404, text: async () => '' };
  };
}

test('website provider is OFF by default (no SCOUT_WEBSITE_SIGNALS) and makes no call', async () => {
  const p = websiteProvider();
  assert.equal(p.configured, false);
  assert.deepEqual(p.roles, ['SIGNALS', 'ENRICHMENT']);
  const r = await p.signals({ domain: 'veldwerk.be' }); // no fetchImpl, config off -> no fetcher
  assert.deepEqual(r.signals, []);
});

test('extractSignals reads positioning, hiring and news as external observations', () => {
  const s = extractSignals(HTML, 'https://veldwerk.be/');
  const claims = s.map((x) => x.claim);
  assert.ok(claims.some((c) => /positionering/i.test(c)));
  assert.ok(claims.some((c) => /vacature/i.test(c)));
  assert.ok(claims.some((c) => /nieuws/i.test(c)));
  assert.ok(s.every((x) => x.url === 'https://veldwerk.be/' && x.source === 'company-website'));
  assert.ok(s.every((x) => Array.isArray(x.uncertainties) && x.uncertainties.length >= 1), 'every signal is honest about uncertainty');
});

test('robots.txt is respected: a Disallow: / blocks us and we never fetch the homepage', async () => {
  assert.equal(robotsAllows('User-agent: *\nDisallow: /'), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /private'), true);
  assert.equal(robotsAllows(''), true);
  let homepageFetched = false;
  const fetcher = async (url) => {
    if (url.endsWith('/robots.txt')) return { ok: true, status: 200, text: async () => 'User-agent: *\nDisallow: /' };
    homepageFetched = true; return { ok: true, status: 200, text: async () => HTML };
  };
  const r = await fetchWebsiteSignals('veldwerk.be', fetcher);
  assert.equal(r.blocked, 'robots');
  assert.deepEqual(r.signals, []);
  assert.equal(homepageFetched, false, 'homepage is not fetched when robots disallows');
});

test('fetchWebsiteSignals extracts signals when robots allows (injected fetch, no live call)', async () => {
  const fetcher = fakeFetch({
    'https://veldwerk.be/robots.txt': { ok: true, body: 'User-agent: *\nDisallow: /admin' },
    'https://veldwerk.be/': { ok: true, body: HTML },
  });
  const r = await fetchWebsiteSignals('veldwerk.be', fetcher);
  assert.ok(r.signals.length >= 2);
});

test('gatherExternalSignals normalises + tags by source, and skips a failing source', async () => {
  const good = { name: 'website', signals: async () => ({ signals: [{ claim: 'X', confidence: 0.5 }] }) };
  const bad = { name: 'boom', signals: async () => { throw new Error('down'); } };
  const out = await gatherExternalSignals({ domain: 'x.nl' }, { sources: [good, bad] });
  assert.equal(out.length, 1);
  assert.equal(out[0].source, 'website');
  assert.equal(out[0].provider, 'website');
  assert.equal(typeof out[0].confidence, 'number');
});

test('source status board lists roles + whether credentials are needed (KVK/KBO/TED as seams)', () => {
  const s = sourceProviderStatus();
  const byName = Object.fromEntries(s.map((x) => [x.name, x]));
  assert.equal(byName.website.configured, false);
  assert.equal(byName.kvk.credentials, true);
  assert.equal(byName.kbo_bce.credentials, false);
  assert.equal(byName.ted.roles.includes('SIGNALS'), true);
});

// ---- TED (EU tenders) provider: credential-free, off by default, defensive parsing ------------

test('TED provider is OFF by default (no SCOUT_TED) and makes no call', async () => {
  const p = tedProvider();
  assert.equal(p.configured, false);
  assert.deepEqual(p.roles, ['SIGNALS']);
  assert.deepEqual((await p.signals({ name: 'Veldwerk' })).signals, []);
});

test('textOf handles TED multilingual fields (string, array, language-keyed object)', () => {
  assert.equal(textOf('X'), 'X');
  assert.equal(textOf(['A', 'B']), 'A');
  assert.equal(textOf({ eng: ['Hello'], nld: ['Hallo'] }), 'Hello');
  assert.equal(textOf({ nld: 'Alleen NL' }), 'Alleen NL');
});

test('buildTedQuery searches buyer/winner name with a recency bound', () => {
  const q = buildTedQuery('Veldwerk', 18, new Date('2026-08-17T00:00:00Z'));
  assert.match(q, /buyer-name~"Veldwerk"/);
  assert.match(q, /winner-name~"Veldwerk"/);
  assert.match(q, /PD>=2025/);
});

test('extractTedSignals maps notices to external observations with url + honest uncertainty', () => {
  const body = { notices: [{ 'publication-number': '123-2026', 'notice-title': { eng: ['Onderhoud groenvoorziening'] }, 'buyer-name': 'Gemeente X', 'publication-date': '2026-06-01', links: { html: 'https://ted.europa.eu/en/notice/-/detail/123-2026' } }] };
  const s = extractTedSignals(body, 'Gemeente X');
  assert.equal(s.length, 1);
  assert.match(s[0].claim, /aanbesteding/i);
  assert.equal(s[0].sourceType, 'ted');
  assert.equal(s[0].url, 'https://ted.europa.eu/en/notice/-/detail/123-2026');
  assert.ok(s[0].uncertainties.some((u) => /naamgenoot|verifi/i.test(u)), 'flags that a name match may be a namesake');
});

test('fetchTedSignals parses an injected TED response (no live call)', async () => {
  const fetcher = async () => ({ ok: true, status: 200, json: async () => ({ notices: [{ 'publication-number': '9-2026', 'notice-title': 'T', 'buyer-name': 'B', 'publication-date': '2026-07-01' }] }) });
  const r = await fetchTedSignals('B', fetcher, { now: new Date('2026-08-17T00:00:00Z') });
  assert.equal(r.signals.length, 1);
});

// ---- KVK (NL register) verification seam: ready, off without a key, no fabrication ------------

test('KVK provider is a ready seam: OFF without a key, returns no fabricated match', async () => {
  const p = kvkProvider();
  assert.equal(p.configured, false);
  assert.ok(p.roles.includes('VERIFICATION'));
  const r = await p.verify({ name: 'Veldwerk' });
  assert.deepEqual(r.matches, []);
  assert.equal(r.reason, 'kvk_not_configured');
});

test('extractKvkMatches maps official register rows (kvkNummer, naam, plaats)', () => {
  const m = extractKvkMatches({ resultaten: [{ kvkNummer: '12345678', naam: 'Veldwerk BV', plaats: 'Gent' }] });
  assert.equal(m.length, 1);
  assert.equal(m[0].source, 'KVK');
  assert.equal(m[0].kvkNumber, '12345678');
});

test('gatherVerification folds an injected verification provider into official matches', async () => {
  const kvkLike = { name: 'kvk', verify: async () => ({ matches: [{ source: 'KVK', kvkNumber: '999', name: 'X BV' }] }) };
  const out = await gatherVerification({ name: 'X' }, { sources: [kvkLike] });
  assert.equal(out.length, 1);
  assert.equal(out[0].provider, 'kvk');
  assert.equal(out[0].kvkNumber, '999');
});

test('official verification lands as FACT (verified identity), not as a soft signal', () => {
  const q = internalQualify({ candidate: { name: 'X', domain: 'x.be' }, known: { organization: null, contacts: [], activityCount: 0 }, verification: [{ source: 'KVK', kvkNumber: '999', name: 'X BV', place: 'Gent' }] });
  const ver = q.evidence.find((e) => e.sourceType === 'official_register');
  assert.ok(ver, 'verification recorded');
  assert.match(ver.detail, /Officieel geverifieerd/);
});

test('external signals fold into Scout reasoning as EXTERNAL observations, never as our own fact', () => {
  const base = internalQualify({ candidate: { name: 'Veldwerk', domain: 'veldwerk.be' }, known: { organization: null, contacts: [], activityCount: 0 } });
  const withSignal = internalQualify({
    candidate: { name: 'Veldwerk', domain: 'veldwerk.be' },
    known: { organization: null, contacts: [], activityCount: 0 },
    externalSignals: [{ claim: 'Vacaturepagina aanwezig', confidence: 0.5, source: 'company-website', provider: 'website', url: 'https://veldwerk.be/', relevantNow: true, reason: 'werving zichtbaar' }],
  });
  assert.ok(withSignal.confidence > base.confidence, 'a relevant external signal raises confidence');
  const ext = withSignal.evidence.find((e) => e.sourceType === 'external');
  assert.ok(ext, 'the external observation is recorded');
  assert.equal(ext.url, 'https://veldwerk.be/');
  assert.notEqual(ext.sourceType, 'internal_db', 'external is never labelled as our own DB fact');
});

// ---- Epistemic recalibration (learned from the first live run: cold lead scored 0.95) ----------

const NONE = () => ({ organization: null, contacts: [], activityCount: 0 });
const website = (n) => Array.from({ length: n }, (_, i) => ({ claim: `Website-signaal ${i}`, confidence: 0.5, source: 'company-website', provider: 'website', url: 'https://x.nl/', relevantNow: true }));
const ted = (n) => Array.from({ length: n }, (_, i) => ({ claim: `TED-signaal ${i}`, confidence: 0.55, source: 'TED', provider: 'ted', sourceType: 'ted', url: `https://ted.europa.eu/n/${i}`, uncertainties: ['Naam-match kan een naamgenoot betreffen.'] }));
const kvk = [{ source: 'KVK', kvkNumber: '12345678', name: 'X BV', place: 'Gent' }];

test('an operator-supplied domain is context, not fit: it does not raise fit confidence', () => {
  const withDomain = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE() });
  const nameOnly = internalQualify({ candidate: { name: 'X' }, known: NONE() });
  assert.equal(withDomain.fitConfidence, nameOnly.fitConfidence, 'a provided domain adds no fit');
  assert.equal(withDomain.fitConfidence, 0, 'operator input alone yields no fit evidence');
  assert.equal(withDomain.identityStatus, 'unverified');
  // The domain is still recorded as CONTEXT (provided), never as fit evidence.
  assert.ok(withDomain.evidence.some((e) => e.provided && /domein/i.test(e.detail)));
});

test('many light signals from ONE source cannot stack past that source cap (diminishing returns)', () => {
  const one = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: website(1) });
  const three = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: website(3) });
  assert.ok(three.fitBreakdown.perSource.website <= FIT.SOURCE_CAP.website + 1e-9, 'per-source contribution is capped');
  assert.ok(three.fitBreakdown.perSource.website < 3 * one.fitBreakdown.perSource.website, 'diminishing, not linear');
});

test('unverified TED name-matches alone stay weak and never reach approval', () => {
  const q = internalQualify({ candidate: { name: 'TopzorgGroep' }, known: NONE(), externalSignals: ted(3) });
  assert.equal(q.identityStatus, 'unverified', 'a TED name-match does not establish identity');
  assert.ok(q.fitConfidence < 0.35, 'weak evidence stays weak');
  assert.notEqual(q.decision, 'approval');
});

test('corroboration across independent sources weighs more than repetition within one', () => {
  const twoWebsite = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: website(2) });
  const websitePlusTed = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: [...website(1), ...ted(1)] });
  assert.equal(websitePlusTed.fitBreakdown.corroboration, FIT.CORROBORATION);
  assert.equal(twoWebsite.fitBreakdown.corroboration, 0);
  assert.ok(websitePlusTed.fitConfidence > twoWebsite.fitConfidence, 'two independent sources beat two of the same');
});

test('a cold lead with website + TED is probable-identity awareness, never a 0.95 approval', () => {
  const q = internalQualify({ candidate: { name: 'TopzorgGroep', domain: 'topzorggroep.nl' }, known: NONE(), externalSignals: [...website(3), ...ted(3)] });
  assert.equal(q.identityStatus, 'probable', 'own website seen -> probable, not verified');
  assert.equal(q.decision, 'awareness');
  assert.ok(q.fitConfidence < 0.6, `fit stays modest for a cold lead (was ${q.fitConfidence})`);
});

test('official verification lifts IDENTITY to verified but never raises FIT (two separate axes)', () => {
  const ext = [...website(3), ...ted(3)];
  const withoutV = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: ext });
  const withV = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: ext, verification: kvk });
  assert.equal(withoutV.identityStatus, 'probable');
  assert.equal(withV.identityStatus, 'verified');
  assert.equal(withV.fitConfidence, withoutV.fitConfidence, 'verification changes identity, not fit');
  assert.equal(withV.fitBreakdown.verification, 0, 'no direct verification contribution to fit');
  // official verification still lands as a FACT about identity
  assert.ok(withV.evidence.some((e) => e.sourceType === 'official_register'));
});

test('an UNCERTAIN verification never verifies identity and never lands as a fact', () => {
  const q = internalQualify({ candidate: { name: 'X', domain: 'x.nl' }, known: NONE(), externalSignals: website(1), verification: [{ source: 'KVK', name: 'X B.V.', status: 'UNCERTAIN' }] });
  assert.equal(q.identityStatus, 'probable', 'UNCERTAIN does not verify');
  assert.ok(!q.evidence.some((e) => e.sourceType === 'official_register'), 'no verified FACT from an UNCERTAIN match');
});

test('buildEvidence keeps FACT / OBSERVATION / INFERENCE / HYPOTHESIS separate and carries identity', () => {
  const candidate = { name: 'X', domain: 'x.nl', note: 'aangedragen door partner' };
  const known = NONE();
  const q = internalQualify({ candidate, known, externalSignals: website(1) });
  const ev = buildEvidence(candidate, known, q);
  const kinds = new Set(ev.observations.map((o) => o.kind));
  assert.ok(kinds.has('FACT') && kinds.has('OBSERVATION') && kinds.has('INFERENCE') && kinds.has('HYPOTHESIS'));
  assert.ok(ev.external.every((o) => o.kind === 'OBSERVATION'), 'an external signal never becomes a FACT');
  assert.equal(ev.identityStatus, 'probable');
  assert.equal(typeof ev.fitConfidence, 'number');
  // The provided context is flagged so it can never read as observed fit evidence.
  assert.ok(ev.facts.some((f) => f.provided));
});
