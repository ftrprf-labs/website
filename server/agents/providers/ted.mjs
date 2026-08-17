// Digital Colleagues — TED (Tenders Electronic Daily) SIGNAL provider (credential-free, live-ready).
//
// TED is the EU's official public-procurement bulletin. Its Search API v3 is anonymous (no key, no
// sign-up), so it is a legitimate credential-free SIGNALS source: given a candidate organisation, we
// ask "does this org have recent public tender activity (as a buyer or a winner)?" and return each
// match as an EXTERNAL observation with the notice URL as provenance.
//
// OFF by default (SCOUT_TED). Live fetching only happens when enabled AND a fetch implementation
// exists; tests inject a fetch so nothing external is contacted. A name match on TED is fuzzy (it can
// hit a namesake), so every signal carries that uncertainty honestly — Scout treats it as an
// observation/hypothesis, never a confirmed fact.
//
// API: POST https://api.ted.europa.eu/v3/notices/search  (anonymous)
//   body { query: <expert search>, fields: [...], limit, scope, paginationMode }
// Verify the exact field list against https://docs.ted.europa.eu when egress is available; parsing
// here is deliberately DEFENSIVE (fields may be strings or multilingual objects/arrays).

import { config } from '../../config.mjs';

const ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';
const FIELDS = ['publication-number', 'notice-title', 'buyer-name', 'winner-name', 'buyer-country', 'publication-date', 'links'];

export function tedProvider() {
  return {
    name: 'ted',
    roles: ['SIGNALS'],
    configured: Boolean(config.scoutTed),
    async signals(subject, { fetchImpl = null } = {}) {
      const name = ((subject && subject.name) || '').trim();
      const fetcher = fetchImpl || (config.scoutTed ? globalThis.fetch : null);
      if (!name || name.length < 3 || !fetcher) return { signals: [] };
      try { return await fetchTedSignals(name, fetcher); } catch { return { signals: [] }; }
    },
  };
}

// Publication dates on TED are YYYYMMDD in expert search. Look back ~18 months for "recent" activity.
function sinceYyyymmdd(monthsBack = 18, now = new Date()) {
  const d = new Date(now.getTime());
  d.setMonth(d.getMonth() - monthsBack);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// TED eForms fields can be a plain string, an array, or a language-keyed object. Pull one readable value.
export function textOf(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.length ? textOf(v[0]) : null;
  if (typeof v === 'object') {
    for (const k of ['eng', 'en', 'nld', 'nl', 'fra', 'fr', 'deu', 'de']) if (v[k] != null) return textOf(v[k]);
    const first = Object.values(v)[0];
    return first != null ? textOf(first) : null;
  }
  return String(v);
}

function noticeUrl(n) {
  const links = n.links || {};
  const direct = textOf(links.html) || textOf(links.self) || textOf(links.pdf);
  if (direct) return direct;
  const pub = textOf(n['publication-number']);
  return pub ? `https://ted.europa.eu/en/notice/-/detail/${encodeURIComponent(pub)}` : null;
}

// Build the expert-search query for one organisation name (as buyer or winner), recent first.
export function buildTedQuery(name, monthsBack = 18, now = new Date()) {
  const q = String(name).replace(/["\\]/g, ' ').trim();
  const since = sinceYyyymmdd(monthsBack, now);
  return `(buyer-name~"${q}" OR winner-name~"${q}") AND PD>=${since} SORT BY publication-date DESC`;
}

// Map a TED search response (defensively) into normalized SIGNAL objects.
export function extractTedSignals(body, name) {
  const notices = (body && (body.notices || body.results || body.data)) || [];
  const out = [];
  for (const n of Array.isArray(notices) ? notices.slice(0, 5) : []) {
    const title = textOf(n['notice-title']) || 'Aanbestedingsnotice';
    const buyer = textOf(n['buyer-name']);
    const winner = textOf(n['winner-name']);
    const date = textOf(n['publication-date']);
    const who = [buyer, winner].filter(Boolean).join(' / ') || name;
    out.push({
      claim: `Recente EU-aanbesteding (TED): "${String(title).slice(0, 160)}" (${who}${date ? `, ${String(date).slice(0, 10)}` : ''}).`,
      confidence: 0.55,
      source: 'TED',
      sourceType: 'ted',
      url: noticeUrl(n),
      observedAt: date || null,
      relevantNow: true,
      reason: 'recente publieke aanbestedingsactiviteit',
      interpretation: 'Publieke opdracht of gunning; kan een aanleiding of moment zijn.',
      uncertainties: ['Naam-match op TED kan een naamgenoot betreffen; identiteit nog te verifiëren.'],
      // For ENTITY BINDING: the org named by this notice (winner preferred, else buyer) and its
      // country. A name query returns candidates; binding decides if this is really the target.
      observedEntityName: winner || buyer || null,
      country: textOf(n['buyer-country']) || null,
      evidenceType: 'tender-notice',
    });
  }
  return out;
}

export async function fetchTedSignals(name, fetcher, { now = new Date() } = {}) {
  const opt = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'MaculisScout/1.0 (+https://maculis.nl/scout)' },
    body: JSON.stringify({ query: buildTedQuery(name, 18, now), fields: FIELDS, limit: 5, scope: 'ALL', paginationMode: 'PAGE_NUMBER' }),
    ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(6000) } : {}),
  };
  const r = await fetcher(ENDPOINT, opt);
  if (!r || !r.ok) return { signals: [] };
  let body = {};
  try { body = await r.json(); } catch { return { signals: [] }; }
  return { signals: extractTedSignals(body, name) };
}
