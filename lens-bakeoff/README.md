# lens-bakeoff (research harness, not production)

A runnable harness that compares three candidate lenses (Reputation and Reception, Finance Bring Your
Data, Dependency and Resilience) on a faithful port of the frozen Maculis Reveal Engine. It exists to
make the Lens 2 decision on prototype evidence, not strategy alone. It is NOT wired into production, does
NOT activate any provider, and does NOT touch the First Five flow.

The written analysis and the decision live in `../docs/lens-strategy/bakeoff/` (start with
`00-bakeoff-report.md`). This folder holds the code, the case-set, and the generated artifacts.

## Run it

```
node --test lens-bakeoff/engine/engine.test.mjs   # 8 engine self-tests (gate discipline + the gap)
node lens-bakeoff/eval/run.mjs                     # runs all lenses x cases, writes out/
```

Requires Node 18+ (developed on Node 22). No dependencies, no network, no build step.

## Structure

```
engine/engine.mjs        faithful .mjs port of the frozen engine (model, gate, selector, run, recognition)
engine/engine.test.mjs   8 self-tests proving the gate discipline and the frozen-vs-extended gap
lenses/reputation.mjs    observe + relate for Reputation and Reception  (+ .spec.md)
lenses/finance.mjs       observe + relate for Finance (Bring Your Data)  (+ .spec.md)
lenses/dependency.mjs    observe + relate for Dependency and Resilience  (+ .spec.md)
lenses/_util.mjs         shared observation/relation builders
cases/cases.mjs          14 diverse SYNTHETIC company fixtures (labelled)
eval/evaluators.mjs      reveal-scoring model + run-level metrics
eval/run.mjs             the runner (frozen and extended gate) -> out/
out/results.json         full generated results
out/reveal-gallery.md    curated Reveal Gallery (best reveals, silences, gate gap)
```

## Data provenance and safety

All 14 cases are SYNTHETIC fixtures, crafted and clearly labelled. No real personal data and no real
sensitive financial data are used. Real Google Places and KVK data require HUMAN ACTIONS (keys and ToS
confirmation) and are deliberately out of scope for the bake-off. Every reveal in the gallery is labelled
PROTOTYPE OUTPUT on SYNTHETIC evidence.

## What it proves and does not prove

Proves: the harness runs on the ported engine; the gate discipline holds (silence on wallpaper, thin, and
matched-promise cases); the relative shape of the three lenses (breadth versus depth, false-positive risk,
friction, engine compatibility). See `../docs/lens-strategy/bakeoff/01-reveal-engine-compatibility.md` for
the central finding that Finance needs an engine extension.

Does not prove: real-world reveal rates or real owner recognition. The per-reveal scores are heuristic
proxies; the settling metric is human confirmed-new recognition, which is the pilot gate in the report.
