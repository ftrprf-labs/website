# Epic: Lens 2 Prototype Bake-off

> The Orchestrator Epic record for the bake-off. It decomposes the work into workstreams, records their
> status, and states the governance under which it ran. It follows the standard lens-work decomposition
> from `../04-orchestrator-playbook.md`, compressed to a pre-pilot bake-off (research, design, prototype,
> evaluate, synthesise), deliberately stopping short of production implementation.

## Goal

Empirically determine which lens after First Five delivers the greatest Maculis value, before choosing a
full production implementation. Compare Reputation and Reception, Finance (Bring Your Data), and
Dependency and Resilience against the same quality bar. Actively try to prove the current ranking wrong.

## Governance (autonomous night run)

- ALLOW without prompting: research, executable specifications, prototypes that change no production
  behaviour, fixtures, evaluators, test harnesses, local runs, documentation, commits, and safe pushes to
  the designated branch.
- A HUMAN ACTION blocks only its own dependency, never the rest of the Epic. All HUMAN ACTIONS here are
  about REAL external data (Places key and caching ToS, KVK key, provider activation), and the bake-off
  routed around them by using synthetic fixtures. No paid provider was activated. The First Five
  production flow was not touched.
- House writing rule enforced across all visible copy and example reveals (no stylistic dashes).

## Workstreams and status

| Workstream | Output | Status |
|-----------|--------|--------|
| Reveal Engine compatibility | Faithful engine port + 8 self-tests + compatibility finding | Done (`../bakeoff/01-...md`, `lens-bakeoff/engine/`) |
| Reputation evidence + prototype | Executable spec + `observe`/`relate` module | Done (`lens-bakeoff/lenses/reputation.*`) |
| Finance BYD prototype | Executable spec + module (with the engine-gap finding) | Done (`lens-bakeoff/lenses/finance.*`) |
| Dependency and Resilience model | Executable spec + module | Done (`lens-bakeoff/lenses/dependency.*`) |
| Case-set | 14 diverse synthetic companies with traps | Done (`lens-bakeoff/cases/cases.mjs`) |
| Evaluation | Reveal-scoring model + runner + Reveal Gallery | Done (`lens-bakeoff/eval/`, `out/`, `../bakeoff/02-...md`) |
| WOW and UX | Reveal-moment design per candidate | Done (`../bakeoff/03-...md`) |
| GrowBrain and Relationship Intelligence | Bridge and memory design per candidate | Done (`../bakeoff/04-...md`) |
| Privacy and Security | Per-candidate evaluation and blockers | Done (`../bakeoff/05-...md`) |
| Red team / falsification | Strongest case against the ranking | Done (`../bakeoff/06-...md`) |
| Synthesis | New weighted comparison, decision, kill/defer, next scope | Done (`../bakeoff/00-bakeoff-report.md`) |

Parallelisation: the four analysis workstreams (WOW, GrowBrain and RI, privacy, red team) ran
concurrently as subagents while the coordination-critical core (engine port, three lens modules,
case-set, evaluators, runner) was built inline, then everything was integrated in the synthesis. This is
the "parallelise where safe" pattern: independent authoring in parallel, shared runnable code inline.

## How this maps to the standard lens pipeline

Research and provider research and data-source assessment were largely inherited from the masterplan and
its research artifacts. Lens design, evidence model, and prototype were executed here as runnable specs.
Security review and privacy review ran as dedicated workstreams. Test generation is the engine self-tests
plus the case-set. Implementation, deployment, and pilot evaluation are deliberately NOT done: they are
the next Epic, scoped in the report.

## Outcome

Lens 2 is Reputation and Reception, confirmed and conditional, with a built-in falsification gate
(head-to-head confirmed-new recognition versus Finance). Finance is deferred to Lens 3 with its engine
extension now scoped. Dependency is deferred to Lens 4. No candidate killed. Full reasoning in
`00-bakeoff-report.md`.
