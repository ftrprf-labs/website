// Digital Colleagues — KVK (NL Handelsregister) VERIFICATION provider (ready seam, NOT wired live).
//
// KVK is the authoritative Dutch company register: the identity/verification backbone. Unlike the
// credential-free sources, KVK needs an API KEY and a Dutch registered entity, so this provider is a
// fully prepared SEAM: the interface and configuration exist, but it stays `configured: false` until
// KVK_API_KEY is set in the environment (never in code). When unconfigured it returns nothing — no
// fabricated matches. Enabling it is a deliberate, human, paid step (see the report / stop point).
//
// API (verify against https://developers.kvk.nl before enabling): GET {base}/api/v2/zoeken?naam=...
// with header `apikey`. Response `resultaten[]` carry kvkNummer, naam, plaats. Parsing is defensive.

import { config } from '../../config.mjs';

const DEFAULT_BASE = 'https://api.kvk.nl';

export function kvkProvider() {
  return {
    name: 'kvk',
    roles: ['DISCOVERY', 'ENRICHMENT', 'VERIFICATION'],
    configured: Boolean(config.kvkApiKey),
    // Verify/enrich an organisation's official identity. Returns { matches:[{kvkNumber,name,place,...}] }.
    async verify(subject, { fetchImpl = null } = {}) {
      const name = ((subject && subject.name) || '').trim();
      const key = config.kvkApiKey;
      const fetcher = fetchImpl || (key ? globalThis.fetch : null);
      if (!name || !key || !fetcher) return { matches: [], reason: key ? 'no_name' : 'kvk_not_configured' };
      try { return await kvkSearch(name, fetcher, key, config.kvkApiBase || DEFAULT_BASE); } catch { return { matches: [] }; }
    },
  };
}

export function extractKvkMatches(body) {
  const rows = (body && (body.resultaten || body.data)) || [];
  const out = [];
  for (const r of Array.isArray(rows) ? rows.slice(0, 5) : []) {
    const kvkNumber = r.kvkNummer || r.kvk_number || null;
    if (!kvkNumber && !r.naam) continue;
    out.push({
      source: 'KVK',
      kvkNumber,
      name: r.naam || null,
      place: r.plaats || null,
      type: r.type || null,
      url: kvkNumber ? `https://www.kvk.nl/zoeken/?source=all&q=${encodeURIComponent(kvkNumber)}` : null,
    });
  }
  return out;
}

async function kvkSearch(name, fetcher, key, base) {
  const url = `${String(base).replace(/\/+$/, '')}/api/v2/zoeken?naam=${encodeURIComponent(name)}`;
  const r = await fetcher(url, {
    headers: { apikey: key, Accept: 'application/json' },
    ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(6000) } : {}),
  });
  if (!r || !r.ok) return { matches: [] };
  let body = {};
  try { body = await r.json(); } catch { return { matches: [] }; }
  return { matches: extractKvkMatches(body) };
}
