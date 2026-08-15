// Bake-off evaluators. We deliberately do NOT count signals; we score REVEALS.
//
// Per-reveal quality dimensions (1 to 5) are heuristic PROXIES computed from features actually present
// in the reveal (family, cross-lens, confidence, wording, provenance). They are transparent and
// deterministic, calibrated to the masterplan reliability notes. They are proxies, not truth: the one
// axis that truly settles the bake-off is human confirmed-new recognition (see the Epic report). These
// proxies exist to make the three lenses comparable on the SAME rubric, and to expose triviality.
//
// Run-level metrics (Time to First Value, User Data Required, Integration Dependency, Cost per Lens Run,
// Repeatability) are lens properties, scored per lens from the disclosure level the reveal needed.

const LEVEL_NUM = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };

// Family contribution to relation strength and surprise.
const FAMILY_STRENGTH = {
  CONTRADICTION: 5, DRIFT: 4, TELLING_ABSENCE: 3, MISCAST: 2,
  TREND_DIVERGENCE: 4, CONCENTRATION: 4, ASYMMETRY: 3,
};
// Base surprise by (lens, family) pairing, from the workstream analyses.
const SURPRISE = {
  'finance.byd:CONTRADICTION': 5, 'finance.byd:CONCENTRATION': 4, 'finance.byd:TREND_DIVERGENCE': 4,
  'dependency.resilience:CONTRADICTION': 5, 'dependency.resilience:CONCENTRATION': 4,
  'reputation.reception:CONTRADICTION': 4, 'reputation.reception:TELLING_ABSENCE': 3, 'reputation.reception:ASYMMETRY': 4,
};
// Action relevance (natural GrowBrain handoff) by lens, from workstream 04.
const ACTION = { 'finance.byd': 5, 'dependency.resilience': 4, 'reputation.reception': 3 };
// False-positive risk baseline by (lens, family): higher = riskier. Reputation theme reveals lean on a
// small review sample; identity and finance rest on hard facts.
const FP_RISK = {
  'reputation.reception:TELLING_ABSENCE': 3, 'reputation.reception:CONTRADICTION': 3,
  'reputation.reception:ASYMMETRY': 2,
  'finance.byd:CONTRADICTION': 1, 'finance.byd:CONCENTRATION': 2, 'finance.byd:TREND_DIVERGENCE': 2,
  'dependency.resilience:CONTRADICTION': 2, 'dependency.resilience:CONCENTRATION': 2,
};

function evidenceStrength(reveal) {
  // From the highest evidence method present and the significance level.
  const lv = LEVEL_NUM[reveal.significance] || 0;
  const hasHardMethod = (reveal.basis || []).some((b) => /file|registry|deterministic|places|aggregate/.test(b.method || ''));
  return Math.min(5, Math.max(1, Math.round(lv * (hasHardMethod ? 1.1 : 0.9))));
}
function relationStrength(reveal) {
  let s = FAMILY_STRENGTH[reveal.family] || 2;
  if (reveal.cross_lens) s = Math.min(5, s + 0.5);
  return Math.round(s);
}
function nonTriviality(reveal) {
  // Cross-surface / cross-lens reveals and quantitative divergences are less trivial than single
  // qualitative observations. A reveal whose wording contains two concrete anchors scores higher.
  let s = reveal.cross_lens ? 4 : 3;
  if (/CONTRADICTION|TREND_DIVERGENCE|CONCENTRATION/.test(reveal.family)) s += 0.5;
  const anchors = (reveal.wording.match(/\d+%|\d{2,}|"[^"]+"/g) || []).length;
  if (anchors >= 2) s += 0.5;
  return Math.max(1, Math.min(5, Math.round(s)));
}
function surprise(lensId, reveal) {
  return SURPRISE[`${lensId}:${reveal.family}`] || 3;
}
function comprehensibility(reveal) {
  // Plain, short, one relationship. Penalise very long wording; reward a single clause.
  const len = reveal.wording.length;
  let s = 5;
  if (len > 140) s -= 1;
  if (len > 200) s -= 1;
  if (/omdat|daardoor|dus/i.test(reveal.wording)) s -= 1; // should never happen (gate), belt and braces
  return Math.max(1, s);
}
function curiosity(reveal) {
  // A reveal that opens a question the owner can pursue. Proxy: presence of a why and a specific anchor.
  const anchors = (reveal.wording.match(/\d+%|"[^"]+"/g) || []).length;
  return Math.max(1, Math.min(5, 3 + (reveal.cross_lens ? 1 : 0) + (anchors >= 1 ? 1 : 0)));
}
function personalRelevance(reveal) {
  // All reveals are owner-specific by construction; reward those naming a concrete owned thing.
  return (reveal.wording.match(/\d+%|"[^"]+"/g) || []).length >= 1 ? 5 : 4;
}

export function scoreReveal(lensId, reveal) {
  const es = evidenceStrength(reveal);
  const rs = relationStrength(reveal);
  const conf = LEVEL_NUM[reveal.significance] || 0;
  const nt = nonTriviality(reveal);
  const su = surprise(lensId, reveal);
  const pr = personalRelevance(reveal);
  const comp = comprehensibility(reveal);
  const act = ACTION[lensId] || 3;
  const cur = curiosity(reveal);
  const fp = FP_RISK[`${lensId}:${reveal.family}`] || 2;
  // WOW is a composite that requires BOTH surprise and grounded non-trivial evidence. A surprising but
  // thin reveal, or a solid but obvious one, cannot score high. Scaled to 1 to 5.
  const wow = Math.max(1, Math.min(5, Math.round(((su * 0.4) + (nt * 0.3) + (es * 0.3)))));
  return {
    evidenceStrength: es, relationStrength: rs, confidence: conf, nonTriviality: nt, surprise: su,
    personalRelevance: pr, comprehensibility: comp, actionRelevance: act, curiosity: cur, wow,
    falsePositiveRisk: fp,
  };
}

// Run-level lens properties (1 to 5; for "required"/"risk" style, higher = more favourable).
export const LENS_RUN_METRICS = {
  'reputation.reception': { timeToFirstValue: 5, userDataRequired: 5, integrationDependency: 4, costPerRun: 4, repeatability: 3 },
  'finance.byd': { timeToFirstValue: 3, userDataRequired: 2, integrationDependency: 3, costPerRun: 4, repeatability: 5 },
  'dependency.resilience': { timeToFirstValue: 2, userDataRequired: 1, integrationDependency: 2, costPerRun: 3, repeatability: 4 },
};

export function summarise(lensId, perCase) {
  const reveals = perCase.filter((r) => r.outcome === 'REVEAL');
  const silences = perCase.filter((r) => r.outcome === 'SILENCE');
  const insufficient = perCase.filter((r) => r.outcome === 'INSUFFICIENT');
  const failures = perCase.filter((r) => r.outcome === 'FAILURE');
  const scores = reveals.map((r) => r.scores).filter(Boolean);
  const mean = (k) => (scores.length ? Math.round((scores.reduce((a, s) => a + s[k], 0) / scores.length) * 10) / 10 : null);
  const trivialReveals = reveals.filter((r) => r.scores && r.scores.nonTriviality <= 2).length;
  return {
    lensId,
    cases: perCase.length,
    revealRate: Math.round((reveals.length / perCase.length) * 100) / 100,
    silenceRate: Math.round((silences.length / perCase.length) * 100) / 100,
    insufficient: insufficient.length,
    failures: failures.length,
    reveals: reveals.length,
    trivialReveals,
    meanWow: mean('wow'),
    meanSurprise: mean('surprise'),
    meanNonTriviality: mean('nonTriviality'),
    meanEvidenceStrength: mean('evidenceStrength'),
    meanFalsePositiveRisk: mean('falsePositiveRisk'),
    meanActionRelevance: mean('actionRelevance'),
    run: LENS_RUN_METRICS[lensId] || null,
  };
}
