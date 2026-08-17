// Digital Colleagues — ENTITY BINDING (the hard epistemic gate before evidence).
//
// Retrieval finds CANDIDATE information; binding decides whether that information can actually be
// attributed to the ORGANISATION under investigation. Only bound evidence may influence
// qualification / fit / corroboration / the visible observations. A similarity in organisation name
// is NEVER, on its own, proof that an external signal is about this organisation (the OCA vs
// "OCA GLOBAL PREVENTION, S.A." namesake problem). Pure, deterministic, no I/O.

// Legal-form suffixes are stripped before comparing names, so "Veldwerk B.V." matches "Veldwerk".
const LEGAL_SUFFIX = /\b(b\.?\s?v|n\.?\s?v|s\.?\s?a|s\.?\s?l|s\.?\s?r\.?\s?l|s\.?\s?a\.?\s?r\.?\s?l|v\.?\s?o\.?\s?f|c\.?\s?v|gmbh|ug|ag|kg|ltd|limited|inc|plc|llc|llp|oy|ab|as|sp\.?\s?a|sarl)\b/gi;

export function normName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(LEGAL_SUFFIX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokenSet(s) { return new Set(normName(s).split(' ').filter(Boolean)); }

// Strong match: identical normalized token sets, or high Jaccard overlap. A single shared generic
// token (e.g. "oca") is DELIBERATELY not enough — that is exactly the namesake trap.
export function strongNameMatch(a, b) {
  const A = tokenSet(a); const B = tokenSet(b);
  if (!A.size || !B.size) return false;
  let inter = 0; for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  const equal = A.size === B.size && inter === A.size;
  return equal || (inter / union) >= 0.6;
}

function hostOf(url) { try { return new URL(url).host.replace(/^www\./, '').toLowerCase(); } catch { return null; } }

// Resolve which entity we actually investigate. Verification (KVK/KBO, injected in phase 1) is the
// ONLY thing that yields a legal identity; a website makes identity 'probable', never 'verified'.
export function resolveTargetEntity({ candidate = {}, known = {}, verification = [] }) {
  const v = (verification || []).find((m) => m && m.name) || null;
  const domain = (candidate.domain || '').toLowerCase() || null;
  return {
    name: candidate.name || null,
    domain,
    country: candidate.country || (domain && /\.nl$/.test(domain) ? 'NL' : null),
    known: { organizationId: (known.organization && known.organization.id) || null, contactId: (known.contact && known.contact.id) || null },
    verified: v ? {
      source: v.source || 'register', legalName: v.name, kvkNumber: v.kvkNumber || null,
      tradeNames: Array.isArray(v.tradeNames) ? v.tradeNames : [], place: v.place || null, country: v.country || 'NL',
    } : null,
  };
}

// Decide binding for ONE candidate signal against the resolved target. Returns the signal annotated
// with { targetEntity, observedEntityName, identityBound, bindingBasis, bindingConfidence, evidenceType }.
export function bindSignal(target, signal) {
  const src = String(signal.provider || signal.source || '').toLowerCase();
  const isWebsite = src.includes('website');
  const observedEntityName = signal.observedEntityName || (isWebsite ? target.name : null);
  const base = { ...signal, targetEntity: target.name, observedEntityName };

  // First-party website: the observation comes from the target's OWN domain, so it is legitimately
  // about this organisation. Bound as 'probable' (the site is theirs) — NOT a legal-identity check.
  if (isWebsite) {
    const host = hostOf(signal.url);
    const domainOk = !target.domain || !host || host === target.domain.replace(/^www\./, '');
    return domainOk
      ? { ...base, identityBound: true, bindingBasis: 'first-party-website', bindingConfidence: 0.6, evidenceType: signal.evidenceType || 'website' }
      : { ...base, identityBound: false, bindingBasis: 'website-domain-mismatch', bindingConfidence: 0, evidenceType: signal.evidenceType || 'website' };
  }

  // Everything else (e.g. a TED tender hit) was found by a NAME query. It binds ONLY when it matches
  // the VERIFIED legal identity (legal name or trade names) AND, when known, the country agrees. A
  // group/brand/foreign-namesake match is not the target entity's own activity.
  if (target.verified && observedEntityName) {
    const names = [target.verified.legalName, ...(target.verified.tradeNames || [])].filter(Boolean);
    const nameOk = names.some((n) => strongNameMatch(observedEntityName, n));
    const countryOk = !signal.country || !target.verified.country
      || String(signal.country).toUpperCase() === String(target.verified.country).toUpperCase();
    if (nameOk && countryOk) return { ...base, identityBound: true, bindingBasis: 'verified-legal-name', bindingConfidence: 0.85, evidenceType: signal.evidenceType || 'external' };
    return { ...base, identityBound: false, bindingBasis: nameOk ? 'country-mismatch' : 'name-only', bindingConfidence: 0, evidenceType: signal.evidenceType || 'external' };
  }

  // No verified identity yet: a name-match can NEVER bind (principle 1).
  return { ...base, identityBound: false, bindingBasis: 'name-only', bindingConfidence: 0, evidenceType: signal.evidenceType || 'external' };
}

// Split candidate signals into bound (evidence about THIS org) and unbound (kept internally only).
export function bindSignals(target, signals = []) {
  const bound = []; const unbound = [];
  for (const s of signals || []) {
    if (!s || !s.claim) continue;
    const b = bindSignal(target, s);
    (b.identityBound ? bound : unbound).push(b);
  }
  return { bound, unbound };
}

// Curate bound evidence: dedup and keep the strongest few. Quality over quantity — Scout reads many
// things so a human sees a couple. Provenance stays on every kept item (source + url).
export function curateBound(bound = [], { max = 5, minConfidence = 0 } = {}) {
  const seen = new Set(); const out = [];
  const ranked = [...bound].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0));
  for (const s of ranked) {
    if (Number(s.confidence || 0) < minConfidence) continue;
    const key = `${s.url || ''}|${normName(s.claim)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
