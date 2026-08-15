# Bake-off Evaluation Model

> How the bake-off scores lenses. The rule the brief insists on: do not measure how many signals you
> find, measure how many good reveals you produce. Implemented in `lens-bakeoff/eval/evaluators.mjs`.

## Principle

Every score is attached to a REVEAL that already cleared the frozen gate, or to a lens as a whole. A
signal that never becomes a gate-passed reveal contributes nothing. Silence contributes positively to a
lens's discipline profile, never negatively. The scores are transparent, deterministic proxies computed
from features actually present in the reveal (family, cross-lens, confidence, wording, provenance), so
two lenses are compared on the same rubric. They are proxies, not truth: the settling axis is human
confirmed-new recognition, which a synthetic harness cannot produce.

## Per-reveal dimensions (1 to 5)

| Dimension | How it is computed (proxy) |
|-----------|----------------------------|
| Evidence Strength | From the reveal's significance level and whether its provenance uses a hard method (file, registry, deterministic, aggregate). |
| Relation Strength | From the family (CONTRADICTION and DRIFT highest, quantitative families high, MISCAST lowest) plus a cross-lens bonus. |
| Confidence | The reveal's significance level (L0 to L4). |
| Non-triviality | Higher for cross-lens and quantitative-divergence reveals and for wording carrying two concrete anchors (a percentage or a quote). Low for single qualitative observations. |
| Surprise | A base per (lens, family) pairing, calibrated to the workstream analyses (cash versus profit and hidden fragility highest). |
| Personal Relevance | Higher when the wording names a concrete owned thing (a figure or a quoted claim). |
| Comprehensibility | Higher for short, single-clause, jargon-free wording; penalises length and any causal connective. |
| Action Relevance | Per lens, the natural GrowBrain handoff strength (Finance highest, Dependency, then Reputation). |
| Curiosity | Higher when the reveal opens a pursuable question (a why plus a specific anchor). |
| WOW | A composite that requires BOTH surprise and grounded non-trivial evidence. A surprising but thin reveal, or a solid but obvious one, cannot score high. |
| False-positive Risk | Per (lens, family): higher for reveals that lean on small samples (Reputation theme reveals), lower for hard-fact reveals (Finance, identity). |

## Run-level metrics (per lens)

| Metric | Meaning |
|--------|---------|
| Time to First Value | How fast the first reveal can appear (Reputation instant, Finance after upload, Dependency after upload plus relationship data). |
| User Data Required | Favourable when little or none is required (5 = none). |
| Integration Dependency | Favourable when few connectors are needed. |
| Cost per Lens Run | Favourable when public and cheap. |
| Repeatability | How naturally the lens repeats (Finance monthly, then Dependency, then Reputation periodic). |

## Aggregates the runner computes

Per lens: reveal rate, silence rate, insufficient and failure counts, count of trivial reveals
(non-triviality <= 2), and the mean of each per-reveal dimension over the reveals. Plus the gate-gap
metrics (see `01-reveal-engine-compatibility.md`): candidate suppressions by family and by check, and
case-level outcome flips between the frozen and extended gate.

## Why proxies and not a single score

A single composite would hide the trade-off the bake-off exists to expose. Reputation wins breadth and
friction; Finance wins surprise and low false-positive risk; Dependency wins WOW and relationship
richness. The report (`00-bakeoff-report.md`) applies two explicit weightings to these measured
dimensions and shows they disagree, then names the one human measurement that resolves the disagreement.
The evaluation model's job is to produce honest, comparable inputs to that decision, not to pretend the
decision is a number.
