// Digital Colleagues — discovery SOURCE layer (pure unit, no DB, no live network).
// Proves the multi-source architecture, the credential-free website provider (robots-respecting,
// off by default, injected fetch), normalisation, and that external signals fold into Scout's
// reasoning as EXTERNAL observations (never as our own fact).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { websiteProvider, extractSignals, robotsAllows, fetchWebsiteSignals } from '../server/agents/providers/website.mjs';
import { gatherExternalSignals, sourceProviderStatus } from '../server/agents/providers/registry.mjs';
import { internalQualify } from '../server/agents/providers/discovery.mjs';

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

test('external signals fold into Scout reasoning as EXTERNAL observations, never as our own fact', () => {
  const base = internalQualify({ candidate: { name: 'Veldwerk', domain: 'veldwerk.be' }, known: { organization: null, contacts: [], activityCount: 0 } });
  const withSignal = internalQualify({
    candidate: { name: 'Veldwerk', domain: 'veldwerk.be' },
    known: { organization: null, contacts: [], activityCount: 0 },
    externalSignals: [{ claim: 'Vacaturepagina aanwezig', confidence: 0.5, source: 'company-website', url: 'https://veldwerk.be/', relevantNow: true, reason: 'werving zichtbaar' }],
  });
  assert.ok(withSignal.confidence > base.confidence, 'a relevant external signal raises confidence');
  const ext = withSignal.evidence.find((e) => e.sourceType === 'external');
  assert.ok(ext, 'the external observation is recorded');
  assert.equal(ext.url, 'https://veldwerk.be/');
  assert.notEqual(ext.sourceType, 'internal_db', 'external is never labelled as our own DB fact');
});
