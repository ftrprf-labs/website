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
import { normName, strongNameMatch, nameSimilarity } from '../entity.mjs';

const DEFAULT_BASE = 'https://api.kvk.nl';

// Conservative decision thresholds. We optimise for the FEWEST WRONG verifications, not the most
// verified results. A match only becomes VERIFIED when it is both strong AND a clear winner; anything
// plausible-but-ambiguous is UNCERTAIN (identity stays probable/unverified); weak is NONE.
export const KVK_DECISION = { verifiedMin: 0.85, uncertainMin: 0.55, margin: 0.2 };

export function kvkProvider() {
  return {
    name: 'kvk',
    roles: ['DISCOVERY', 'ENRICHMENT', 'VERIFICATION'],
    configured: Boolean(config.kvkApiKey),
    // Verify an organisation's official identity. Returns { matches, status } where a match is only
    // present for VERIFIED/UNCERTAIN, and only a VERIFIED match may become a `verified` identity.
    async verify(subject, { fetchImpl = null } = {}) {
      const name = ((subject && subject.name) || '').trim();
      const key = config.kvkApiKey;
      const fetcher = fetchImpl || (key ? globalThis.fetch : null);
      if (!name || !key || !fetcher) return { matches: [], status: 'NONE', reason: key ? 'no_name' : 'kvk_not_configured' };
      try { return await kvkVerify(subject, fetcher, key, config.kvkApiBase || DEFAULT_BASE); } catch { return { matches: [], status: 'NONE' }; }
    },
  };
}

// Defensive parsing of a KVK "Zoeken" response. Trade names (handelsnamen) come from the Basisprofiel
// endpoint in the real API; we parse them here when present so the matcher can use them.
export function extractKvkMatches(body) {
  const rows = (body && (body.resultaten || body.data)) || [];
  const out = [];
  for (const r of Array.isArray(rows) ? rows.slice(0, 8) : []) {
    const kvkNumber = r.kvkNummer || r.kvk_number || null;
    if (!kvkNumber && !r.naam) continue;
    const tradeNames = Array.isArray(r.handelsnamen)
      ? r.handelsnamen.map((h) => (typeof h === 'string' ? h : (h && (h.naam || h.name)))).filter(Boolean) : [];
    out.push({
      source: 'KVK',
      kvkNumber,
      name: r.naam || null,
      tradeNames,
      place: r.plaats || (r.adres && (r.adres.plaats || (r.adres.binnenlandsAdres && r.adres.binnenlandsAdres.plaats))) || null,
      type: r.type || null,
      active: r.actief != null ? Boolean(r.actief) : (r.uitgeschrevenHR ? false : true),
      url: kvkNumber ? `https://www.kvk.nl/zoeken/?source=all&q=${encodeURIComponent(kvkNumber)}` : null,
    });
  }
  return out;
}

// Score one KVK candidate against the subject (0..1). Name is the backbone: exact legal/trade name =
// strong, a fuzzy overlap is weak. A place hint that CONFLICTS is a hard penalty (a same-named company
// in another city is probably a different one). Being an active hoofdvestiging/rechtspersoon helps a little.
export function scoreKvkCandidate(subject, cand) {
  const target = (subject && subject.name) || '';
  const names = [cand.name, ...(cand.tradeNames || [])].filter(Boolean);
  let nameScore = 0; let basis = 'none';
  for (const n of names) {
    if (normName(n) && normName(n) === normName(target)) { nameScore = 1.0; basis = names.indexOf(n) === 0 ? 'exact-legal-name' : 'exact-trade-name'; break; }
    if (strongNameMatch(target, n)) { if (nameScore < 0.75) { nameScore = 0.75; basis = 'strong-name'; } }
    else if (nameSimilarity(target, n) >= 0.3) { if (nameScore < 0.35) { nameScore = 0.35; basis = 'partial-name'; } }
  }
  let score = nameScore; const reasons = [`naam:${basis}`];
  const subjPlace = subject && (subject.place || subject.region);
  if (subjPlace && cand.place) {
    if (normName(subjPlace) === normName(cand.place)) { score += 0.10; reasons.push('plaats:match'); }
    else { score -= 0.35; reasons.push('plaats:conflict'); }
  }
  if (cand.active === false) { score -= 0.30; reasons.push('status:uitgeschreven'); }
  if (cand.type && /rechtspersoon|hoofdvestiging/i.test(cand.type)) { score += 0.05; reasons.push('type:hoofd'); }
  score = Math.max(0, Math.min(1, score));
  return { score: Math.round(score * 100) / 100, nameScore, basis, reasons };
}

// Decide identity from the scored candidates. VERIFIED requires a strong AND clearly-winning match;
// otherwise UNCERTAIN (plausible but ambiguous) or NONE (too weak). Never assumes the top hit is truth.
export function decideKvk(subject, candidates = [], opts = {}) {
  const { verifiedMin, uncertainMin, margin } = { ...KVK_DECISION, ...opts };
  const scored = (candidates || []).map((c) => ({ ...c, ...scoreKvkCandidate(subject, c) })).sort((a, b) => b.score - a.score);
  if (!scored.length || scored[0].score < uncertainMin) return { status: 'NONE', match: null, alternatives: scored.slice(0, 3) };
  const top = scored[0]; const runner = scored[1];
  const clearWinner = !runner || (top.score - runner.score) >= margin;
  const status = (top.score >= verifiedMin && clearWinner) ? 'VERIFIED' : 'UNCERTAIN';
  return { status, match: { ...top, status }, alternatives: scored.slice(1, 3) };
}

// Search KVK and decide. Injectable fetcher so the whole path is testable with canned responses and
// NO key. Returns { matches:[decidedMatch?], status, alternatives }.
export async function kvkVerify(subject, fetcher, key, base = DEFAULT_BASE) {
  const name = ((subject && subject.name) || '').trim();
  if (!name || !fetcher) return { matches: [], status: 'NONE', reason: 'no_name_or_fetcher' };
  let body = {};
  try {
    const url = `${String(base).replace(/\/+$/, '')}/api/v2/zoeken?naam=${encodeURIComponent(name)}`;
    const r = await fetcher(url, {
      headers: { apikey: key || '', Accept: 'application/json' },
      ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(6000) } : {}),
    });
    if (!r || !r.ok) return { matches: [], status: 'NONE' };
    body = await r.json();
  } catch { return { matches: [], status: 'NONE' }; }
  const decision = decideKvk(subject, extractKvkMatches(body));
  return { matches: decision.match ? [decision.match] : [], status: decision.status, alternatives: decision.alternatives };
}
