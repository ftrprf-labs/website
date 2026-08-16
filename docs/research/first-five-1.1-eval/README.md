# First Five 1.1 evaluation harness

Reproducible evaluation that drives the **real frozen Reveal Engine 0.2** and the **real live
quality gate** from the `ftrprf-labs/maculis-first-five.` repo, comparing the CURRENT First Five
pipeline against the proposed **First Five 1.1** (richer, multi-perspective evidence) over 12
fixtures. It measures whether richer evidence unlocks more gate-passing reveals **without touching
the Gate**, and whether correct SILENCE (including the AMA-NED regression case) is preserved.

No production code is modified. The harness lives here and imports the First Five repo verbatim.

## What it proves

- CURRENT reveals 2/12; First Five 1.1 reveals 6/12 (four new candidates, one per RelationFamily).
- 6/6 correct-SILENCE regressions stay silent, including **AMA-NED SILENCE in both**.
- 0 SILENCE wrongly broken. The frozen Gate is unchanged.

See `results.txt` for the recorded run and `docs/FIRST_FIVE_1_1_DEEP_DIVE.md` for the analysis.

## Second round: real live pipeline + prototype extractors

After GO for the minimal deepening, a second harness drives the **entire real live pipeline**
(`analyseWebsite`, i.e. frozen engine + `absenceDefensible` guard + PatternReader v1 fallback +
silence observations) with **real prototype extractors**, not hand-authored evidence:

- `prototype-extractors.ts` — the five minimal evidence extensions as a real `ClaimExtractor`.
- `eval-live-pipeline.ts` — runs `analyseWebsite` CURRENT vs NEW over 11 cases (3 real content
  fixtures from the First Five test suite + representative cases), and Part B uses the real observed
  technical signals of ama-ned.nl / hema.nl / oca.nl to show Reveal vs technical duiding are
  separate layers.
- `results-live-pipeline.txt` — the recorded run.

Run: `node_modules/.bin/tsx <this-folder>/eval-live-pipeline.ts` from the First Five repo.

Outcome and the per-extension go/no-go are in `docs/FIRST_FIVE_1_1_GONOGO.md`. Note: the frozen
engine and Gate are untouched in both rounds; the second round additionally discovered that the live
reveal runs the frozen engine first and PatternReader v1 only on its SILENCE.

## Run it

Requires the First Five repo checked out and its deps installed:

```bash
# clone the engine repo (shallow is fine)
git clone --depth 1 https://github.com/ftrprf-labs/maculis-first-five. /workspace/maculis-first-five.
cd /workspace/maculis-first-five. && npm install

# run the harness with the repo's tsx
node_modules/.bin/tsx <path-to-this-folder>/eval.ts
```

`lib.ts` imports the engine via absolute paths under `/workspace/maculis-first-five./src`. Adjust
those two import lines if you clone elsewhere.

## Honesty notes

- The AMA-NED fixture is a faithful reconstruction of the documented real case (well-built,
  modest, proven; only low-severity security-header gaps). The production site could not be fetched
  from this environment (egress blocked), so this is a representative fixture, not a live crawl.
- The "1.1" evidence per fixture models the OUTPUT the proposed additive extractors would produce
  from the same public HTML. Every proposed claim is passed through the real live quality gate
  before reaching the engine, so nothing bypasses the existing bar. The extractors themselves are
  the proposed additive build.
- Recognition/WOW/surprise scores in `eval.ts` are estimates (HYPOTHESIS); real recognition needs
  real users. Outcomes, gate-pass counts, families and cross-lens flags are measured facts from the
  real engine.
