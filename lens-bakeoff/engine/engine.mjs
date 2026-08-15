// Maculis Lens Bake-off: shared engine (research harness, not production).
//
// A faithful .mjs port of the frozen Reveal Engine contract from
// `maculis-first-five.` (src/engine: model.ts, gate.ts, interpret.ts, recognition.ts).
// It reuses the engine's discipline verbatim in spirit: evidence -> observations ->
// relations -> candidates -> GATE -> reveal/silence -> recognition. SILENCE is a
// first-class success. The AI is bounded (selection only). No causality is invented.
//
// This port exists so the three bake-off lenses run against the REAL selectivity
// discipline, and so we can empirically test the masterplan hypothesis
// "a new lens is configuration on the engine, not a new product".
//
// Two things are deliberately parameterised so the bake-off can measure the
// hypothesis rather than assume it:
//   1. UNDENIABLE_FAMILIES can be the frozen website set, or an extended set that
//      admits finance/dependency families. Running both quantifies the gap.
//   2. Lenses may emit relations in the four frozen families OR in extended families
//      (CONCENTRATION, TREND_DIVERGENCE, ASYMMETRY). We record which is which.

export const ENGINE_VERSION = 'maculis-reveal-0.2.0-bakeoff-port';

// ---- Evidence levels (verbatim ladder) -------------------------------------
export const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'];
const LEVEL_RANK = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
export const levelAtLeast = (a, b) => LEVEL_RANK[a] >= LEVEL_RANK[b];
export const maxLevel = (a, b) => (LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b);

// ---- Relation families ------------------------------------------------------
// The four FROZEN website families:
export const FROZEN_FAMILIES = ['CONTRADICTION', 'TELLING_ABSENCE', 'MISCAST', 'DRIFT'];
// Extended families the bake-off introduces for quantitative/temporal domains.
// Their existence is itself a finding (see compatibility report).
export const EXTENDED_FAMILIES = ['CONCENTRATION', 'TREND_DIVERGENCE', 'ASYMMETRY'];

// Family priority for the deterministic selector. Frozen priorities preserved;
// extended families are ranked below the frozen four by default so a genuine
// website-style contradiction always wins a tie.
const FAMILY_PRIORITY = {
  CONTRADICTION: 4, DRIFT: 3, TELLING_ABSENCE: 2, MISCAST: 1,
  TREND_DIVERGENCE: 3, CONCENTRATION: 2, ASYMMETRY: 1,
};

// The frozen gate treats only these as "undeniable single-surface gaps".
export const FROZEN_UNDENIABLE = new Set(['CONTRADICTION', 'DRIFT', 'TELLING_ABSENCE']);
// The extended gate additionally admits quantitative divergences and concentrations
// as undeniable, because a hard ledger fact is not "contestable single-lens reading".
export const EXTENDED_UNDENIABLE = new Set([
  ...FROZEN_UNDENIABLE, 'TREND_DIVERGENCE', 'CONCENTRATION',
]);

// ---- Wallpaper / non-generic (faithful intent) ------------------------------
// Sector wallpaper: claims true of almost everyone; never revealworthy on their own.
const WALLPAPER = new Set([
  'kwaliteit', 'service', 'klantgericht', 'klant', 'maatwerk', 'passie', 'professioneel',
  'betrouwbaar', 'ervaring', 'deskundig', 'persoonlijk', 'flexibel', 'oplossing',
  'partner', 'innovatief', 'duurzaam', 'resultaat', 'samen', 'vakmanschap', 'no-nonsense',
  'ontzorgen', 'best', 'beste', 'groei', 'succes', 'toekomst', 'mensen', 'aandacht',
]);
export function isWallpaper(subject) {
  if (!subject) return true;
  const t = String(subject).toLowerCase().trim();
  if (t.length < 3) return true;
  // A subject that is nothing but wallpaper tokens is wallpaper.
  const toks = t.split(/[^a-z0-9]+/).filter(Boolean);
  if (!toks.length) return true;
  return toks.every((w) => WALLPAPER.has(w));
}

// Forbidden reveal phrasing: causal / recommendation / imperative language.
// The gate rejects any candidate wording that tells the owner what to do or asserts cause.
export const FORBIDDEN_REVEAL_PHRASING =
  /(\bomdat\b|\bdaardoor\b|\bhierdoor\b|\bdus\b|\bje moet\b|\bmoet je\b|\bzou moeten\b|\bwij raden\b|\bwe raden\b|\badvies\b|\badviseren\b|\bverbeter\b|\bzorg dat\b|\bje kunt beter\b|\bveroorzaakt\b|\bleidt tot\b)/i;

// ---- Gate (faithful port of gate.ts) ---------------------------------------
export const DEFAULT_GATE_CONFIG = {
  min_evidence_level: 'L3',
  require_undeniable_or_crosslens: true,
  min_basis_refs_multilens: 2,
  undeniable: FROZEN_UNDENIABLE, // swap to EXTENDED_UNDENIABLE for the extended run
};

export function runGate(cand, rel, observations, cfg = DEFAULT_GATE_CONFIG) {
  const parts = cand.observation_ids
    .map((iid) => observations.find((o) => o.observation_id === iid))
    .filter(Boolean);
  const externalRefs = cand.basis.length;
  const findings = [];
  const add = (check, passed, reason) => findings.push({ check, passed, reason });

  add('evidence_floor', levelAtLeast(rel.confidence, cfg.min_evidence_level),
    `relation level ${rel.confidence}; requires ${cfg.min_evidence_level}.`);

  const acknowledged =
    parts.some((o) => (o.notes || '').includes('acknowledged')) || cand.novelty === 'already_stated';
  add('already_stated', !acknowledged,
    acknowledged ? 'the organisation states/acknowledges this itself, so it is not a reveal.'
      : 'not self-stated as far as observable.');

  const primarySubject = (parts[0] && parts[0].subject) || '';
  const generic = isWallpaper(primarySubject);
  add('specificity', !generic,
    generic ? `"${primarySubject}" is sector wallpaper (true for almost everyone).` : 'specific enough.');
  add('non_generic', !generic, generic ? 'generic/functional.' : 'carries a distinctive signal.');

  // Forbidden phrasing applies to Maculis's OWN framing, not to quoted evidence. Strip quoted
  // substrings first, so a business whose claim literally contains a word like "advies" is not
  // mistaken for Maculis giving advice.
  const framing = (cand.wording || '').replace(/"[^"]*"/g, ' ');
  const badPhrasing = FORBIDDEN_REVEAL_PHRASING.test(framing);
  const onlyOneExternalSource =
    rel.family !== 'CONTRADICTION' && rel.family !== 'DRIFT' &&
    cand.cross_lens && externalRefs < cfg.min_basis_refs_multilens;
  const defensible = !badPhrasing && !onlyOneExternalSource;
  add('defensible', defensible,
    badPhrasing ? 'contains causal/recommendation language (forbidden).'
      : onlyOneExternalSource ? 'leans on a single external source (single-data-point risk).'
        : 'traceable and non-causal.');

  const meaningful = !!rel.why_might_matter && !generic;
  add('meaningful', meaningful, meaningful ? 'decision-relevant.' : 'no meaningful decision.');

  const undeniableSet = cfg.undeniable || FROZEN_UNDENIABLE;
  const undeniable = undeniableSet.has(rel.family);
  const worthy = !cfg.require_undeniable_or_crosslens || undeniable || cand.cross_lens;
  add('attention_worthy', worthy,
    worthy ? (undeniable ? 'undeniable single-surface gap.' : 'cross-lens corroborated.')
      : 'contestable single-lens reading; a skeptic waves this away.');

  const firstFail = findings.find((f) => !f.passed) || null;
  return {
    passed: findings.every((f) => f.passed),
    findings,
    suppressed_reason: firstFail ? `${firstFail.check}: ${firstFail.reason}` : null,
  };
}

// ---- Candidate construction -------------------------------------------------
// A relation becomes a candidate. Wording is supplied by the lens (neutral, no causality);
// significance defaults to the relation confidence; novelty starts unknown.
export function toCandidate(rel, wording, significance) {
  return {
    candidate_id: `cand_${rel.relation_id}`,
    relation_id: rel.relation_id,
    family: rel.family,
    cross_lens: !!rel.cross_lens,
    wording,
    significance: significance || rel.confidence,
    novelty: rel.acknowledged ? 'already_stated' : 'unknown',
    observation_ids: rel.observation_ids,
    basis: rel.basis || [],
  };
}

// ---- Deterministic selector (faithful port of interpret.ts) -----------------
export function selectReveal(passed) {
  if (!passed.length) return null;
  return [...passed].sort((a, b) => {
    const fp = (FAMILY_PRIORITY[b.family] || 0) - (FAMILY_PRIORITY[a.family] || 0);
    if (fp) return fp;
    const lv = LEVEL_RANK[b.significance] - LEVEL_RANK[a.significance];
    if (lv) return lv;
    return (b.cross_lens ? 1 : 0) - (a.cross_lens ? 1 : 0);
  })[0];
}

// ---- Engine run -------------------------------------------------------------
// Runs one lens over one case: observe -> relate -> candidates -> gate -> reveal/silence.
// outcome: REVEAL | SILENCE | INSUFFICIENT | FAILURE
export function runEngine(lens, caseInput, cfg = DEFAULT_GATE_CONFIG) {
  let observations = [];
  let relations = [];
  try {
    observations = lens.observe(caseInput) || [];
  } catch (e) {
    return { outcome: 'FAILURE', reason: `observe error: ${e.message}`, observations: [], relations: [], candidates: [], reveal: null };
  }
  if (!observations.length) {
    return { outcome: 'INSUFFICIENT', reason: 'no grounded observations', observations, relations: [], candidates: [], reveal: null };
  }
  try {
    relations = lens.relate(observations, caseInput) || [];
  } catch (e) {
    return { outcome: 'FAILURE', reason: `relate error: ${e.message}`, observations, relations: [], candidates: [], reveal: null };
  }

  const candidates = [];
  const gated = [];
  for (const rel of relations) {
    const wording = lens.word ? lens.word(rel, observations, caseInput) : rel.tension;
    const cand = toCandidate(rel, wording, rel.confidence);
    candidates.push(cand);
    const gate = runGate(cand, rel, observations, cfg);
    gated.push({ cand, rel, gate });
  }
  const passed = gated.filter((g) => g.gate.passed).map((g) => g.cand);
  // Full gated list (every candidate and its verdict), exposed on BOTH outcomes so the harness can
  // count suppressed candidates even when the case still reveals via another relation.
  const gatedAll = gated.map((g) => ({ family: g.rel.family, cross_lens: g.rel.cross_lens, passed: g.gate.passed, reason: g.gate.suppressed_reason }));
  const chosen = selectReveal(passed);
  if (!chosen) {
    return {
      outcome: 'SILENCE',
      reason: gated.length ? 'candidates suppressed by gate' : 'no relations detected',
      observations, relations, candidates, gatedAll,
      suppressions: gated.map((g) => ({ family: g.rel.family, reason: g.gate.suppressed_reason })).filter((s) => s.reason),
      reveal: null,
    };
  }
  const chosenGated = gated.find((g) => g.cand.candidate_id === chosen.candidate_id);
  return {
    outcome: 'REVEAL',
    reason: 'gate passed',
    observations, relations, candidates, gatedAll,
    reveal: {
      family: chosen.family,
      cross_lens: chosen.cross_lens,
      wording: chosen.wording,
      significance: chosen.significance,
      why_might_matter: chosenGated.rel.why_might_matter,
      tension: chosenGated.rel.tension,
      basis: chosen.basis,
      observation_ids: chosen.observation_ids,
    },
    gate: chosenGated.gate,
  };
}

// ---- Recognition (faithful port of recognition.ts) --------------------------
export function captureRecognition(reveal, response) {
  const novelty = response === 'no' ? 'confirmed_new' : response === 'yes' ? 'confirmed_known' : 'partly';
  return { ...reveal, recognition: { response }, novelty };
}
