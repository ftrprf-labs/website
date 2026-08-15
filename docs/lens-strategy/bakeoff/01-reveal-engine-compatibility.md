# Reveal Engine Compatibility: does "a new lens is configuration, not a new product" hold?

> Bake-off finding, backed by the runnable harness in `lens-bakeoff/`. This is the central
> engineering question of the Epic. The answer is nuanced and is backed by measured suppression
> counts, not opinion.

## The claim under test

The masterplan asserts: "a new lens is configuration on the Reveal Engine, not a new product." The
bake-off ports the frozen engine contract (`lens-bakeoff/engine/engine.mjs`, a faithful port of
`maculis-first-five.` `src/engine`) and builds all three candidate lenses as pure `observe` and
`relate` configuration on top of it. It then runs 14 synthetic cases under two gate profiles:

- frozen: only the four website families (CONTRADICTION, TELLING_ABSENCE, MISCAST, DRIFT) count as
  undeniable single-surface gaps.
- extended: quantitative families (CONCENTRATION, TREND_DIVERGENCE) also count as undeniable.

## The measured result

Candidate-level gate suppressions across all 14 cases (from `out/results.json`):

| Lens | Extended-family candidates suppressed by the frozen gate | Suppressed on which check | Case-level outcome flips |
|------|--------------------------------------------------------:|---------------------------|-------------------------:|
| Reputation and Reception | 0 | (only 2 CONTRADICTION suppressed on `specificity`, correctly, for wallpaper claims) | 0 |
| Finance (Bring Your Data) | 4 (CONCENTRATION x2, TREND_DIVERGENCE x2) | `attention_worthy` | 1 (bouwmaat goes fully silent) |
| Dependency and Resilience | 0 | none | 0 |

## What this means (the honest, split answer)

The claim holds at the level of the ENGINE, and breaks at the level of the RELATION VOCABULARY.

1. The core engine is genuinely reusable configuration. All three lenses run on the ported engine
   with no change to its pipeline, its gate checks, its selector, its silence and failure semantics,
   its provenance, or its recognition. Reputation and Reception is fully config-only: it expresses
   every reveal in the four frozen families, and the frozen gate handles it perfectly, including
   correctly staying silent on wallpaper claims (2 CONTRADICTION candidates suppressed on
   `specificity`, exactly as designed). For Reputation, the masterplan claim is true as stated.

2. The four website families are not a sufficient vocabulary for quantitative domains. Finance's two
   most valuable relations, a customer concentration rising over time and personnel cost diverging
   from revenue, are not qualitative text contradictions. They are magnitude-and-trend relations. We
   modelled them honestly as new families (CONCENTRATION, TREND_DIVERGENCE). The frozen gate
   suppresses all four such candidates on `attention_worthy`, because that check treats only the four
   website families as undeniable and otherwise demands cross-lens corroboration. One of these
   suppressions (bouwmaat) silences the whole case; the others are masked only because the case still
   reveals via a co-occurring CONTRADICTION, which means the concentration insight is silently lost.

3. Dependency looks compatible, but only because of a modelling choice, not for free. Its flagship
   reveal is "looks resilient, is fragile," which we express as a cross-lens CONTRADICTION (surface
   health versus one hidden concentration). That fits the frozen undeniable set and the cross-lens
   path, so it passes with zero suppressions. But a naive single-domain concentration reveal (a pure
   "one customer is 40 percent of revenue" with no second corroborating domain) is suppressed exactly
   like Finance's, which the engine self-test proves directly
   (`engine.test.mjs`: "single-lens CONCENTRATION fails the frozen gate but passes the extended
   gate"). So Dependency is config-compatible only when its quantitative facts are framed as cross-lens
   contradictions.

## The precise correction to the masterplan claim

A new lens is configuration on the engine PLUS, for any quantitative or temporal domain, two additions
that are not mere config:

- A relation-family extension. The engine needs first-class families for magnitude and distribution
  (CONCENTRATION, TREND_DIVERGENCE, and likely ASYMMETRY), because CONTRADICTION and MISCAST cannot
  express "this share is dangerously large" or "these two series diverged."
- A gate policy for those families. The `attention_worthy` and `defensible` checks were tuned for
  qualitative website text. Quantitative reveals need numeric analogs: a materiality or benchmark
  threshold for specificity (is 34 percent concentration actually notable for this sector), and a
  distributional defensibility rule instead of the single-external-source rule. Until then, a
  single-domain quantitative reveal is either suppressed or must be smuggled in as a cross-lens
  contradiction.

This is a real, scoped piece of engine work, not a demo tweak. It is small relative to the whole
platform, but it is the reason Finance is not a pure-config lens and therefore not the fastest to
ship. It is also the reason Reputation, which is pure config, is the fastest.

## Consequences for the Lens 2 decision

- Reputation and Reception is the only candidate that is production-ready on the current engine with no
  engine change. That is a real, measured feasibility advantage, and it is the strongest argument for
  it as Lens 2.
- Finance requires the relation-family extension and the numeric gate policy before it can surface its
  best reveals natively. This work is now scoped (see the Epic report next-scope section) and belongs
  before Finance ships, whether as Lens 2 or Lens 3.
- The engine extension is a shared asset. Once built, it serves Dependency's single-domain reveals and
  any future quantitative lens, so it is worth doing well once rather than smuggling quantitative
  reveals into CONTRADICTION forever.

## Reproduce

```
node --test lens-bakeoff/engine/engine.test.mjs   # 8/8, proves the gate discipline and the gap
node lens-bakeoff/eval/run.mjs                     # regenerates out/results.json and the gallery
```
