# Lens 2 Prototype Bake-off: Epic Report

> STATUS: BAKE-OFF DONE / IMPLEMENTATION PARKED PENDING REAL PILOT EVIDENCE (see `STATUS.md`). The Lens 2
> choice is provisional, not final. The section 7 "next Epic scope" below is a preserved plan, NOT an
> authorisation to build; no production implementation starts until an explicit owner instruction.
>
> The deliverable of the Lens 2 Prototype Bake-off Epic. It compares three lens candidates against the
> same quality bar, on a runnable harness built on a faithful port of the frozen Reveal Engine, and
> reaches an evidence-based decision. It integrates six workstreams (this report plus
> `01`-`06` in this folder) and the harness in `lens-bakeoff/`.
>
> Provenance and honesty note. All 14 cases are SYNTHETIC fixtures, clearly labelled. No real personal
> or sensitive financial data was used. The per-reveal quality scores are heuristic proxies
> (`lens-bakeoff/eval/evaluators.mjs`); the one axis that truly settles the bake-off, human
> confirmed-new recognition, cannot be produced by a synthetic harness and is therefore the pilot gate
> in the recommendation. House writing rule respected: no stylistic hyphens or dashes.

---

## 1. What was built (not a production feature)

- A faithful `.mjs` port of the frozen Reveal Engine contract (`lens-bakeoff/engine/engine.mjs`):
  evidence to observations to relations to candidates to GATE to reveal or silence, with the frozen
  seven-check gate, the deterministic selector, silence as a first-class outcome, and recognition.
  Proven by 8 self-tests (`engine.test.mjs`).
- Three executable lens specifications, each a real `observe` and `relate` module plus a spec document:
  Reputation and Reception (`lenses/reputation.mjs`, `.spec.md`), Finance Bring Your Data
  (`lenses/finance.mjs`, `.spec.md`), Dependency and Resilience (`lenses/dependency.mjs`, `.spec.md`).
- A diverse case-set of 14 synthetic companies (`cases/cases.mjs`) spanning size, B2B and B2C, local and
  digital, service and product, strong and weak online presence, young and established, and including
  deliberate silence traps (wallpaper claims, healthy diversified firms) and false-positive traps.
- An evaluation model (`eval/evaluators.mjs`) that scores reveals, not signals, across the brief's
  dimensions plus run-level metrics, and a runner (`eval/run.mjs`) that executes every lens over every
  case under both the frozen and an extended gate, producing `out/results.json` and
  `out/reveal-gallery.md`.

Nothing here is wired into production, no provider was activated, and the First Five flow is untouched.

---

## 2. Headline result

The prototype does not overturn the ranking, and it does not rubber-stamp it either. It CONFIRMS
Reputation and Reception as the right Lens 2 to ship next, for feasibility and reach reasons that are
now measured rather than assumed, while empirically exposing Reputation's real weaknesses and
confirming Finance and Dependency as the higher-value destinations. The decision is deliberately
conditional: it carries a single falsification gate (head-to-head confirmed-new recognition on real
owners) that can flip Lens 2 to Finance.

---

## 3. The measured comparison (frozen gate, 14 synthetic cases)

| Metric | Reputation | Finance (BYD) | Dependency |
|--------|-----------:|--------------:|-----------:|
| Reveal rate | 57% (8/14) | 21% (3/14) | 36% (5/14) |
| Silence rate | 43% | 71% | 64% |
| Insufficient | 0 | 1 | 0 |
| Trivial reveals (non-triviality <= 2) | 0 | 0 | 0 |
| Mean WOW (proxy) | 3.9 | 4.0 | 5.0 |
| Mean surprise | 3.9 | 5.0 | 5.0 |
| Mean non-triviality | 4.8 | 4.0 | 5.0 |
| Mean evidence strength | 3.0 | 4.0 | 4.0 |
| Mean false-positive risk (lower better) | 2.9 | 1.0 | 2.0 |
| Action relevance (GrowBrain) | 3 | 5 | 4 |
| Time to first value | 5 | 3 | 2 |
| User data required (5 = none) | 5 | 2 | 1 |
| Engine compatibility (config-only) | full | broken (needs extension) | via cross-lens framing |
| Repeatability | 3 | 5 | 4 |

How to read this. Reputation reveals the most (breadth) at the lowest evidence strength and the highest
false-positive risk. Finance reveals the least (highest selectivity, 71 percent silence) but with the
highest surprise, the lowest false-positive risk, and the strongest action relevance. Dependency has
the highest per-reveal WOW and non-triviality and the richest relationship signal, at the highest data
dependency.

This exactly matches the four independent workstreams:
- WOW and UX (`03`): Reputation has the strongest first-contact wow (two-sided, zero friction, no
  numeracy), Finance the strongest raw payload but the heaviest dashboard gravity, Dependency the
  deepest meaning but the highest offense risk.
- GrowBrain and Relationship Intelligence (`04`): on these two axes Reputation is the weakest, not the
  strongest. Finance dominates the action bridge, Dependency dominates relationship-memory richness.
- Privacy and Security (`05`): Reputation is the safest to prototype now; Dependency carries the most
  drag toward production; no gate blocks the whole prototype.
- Red team (`06`): the ranking is knife-edge and a defensible value-led reweighting flips Finance ahead;
  "just config" breaks for Finance and Dependency but holds for Reputation.

---

## 4. The new weighted comparison (grounded in prototype evidence)

The decision genuinely depends on what "Lens 2" means. Two defensible weightings, both computed from the
measured dimensions above, give opposite winners. This is the honest core of the finding.

Dimensions scored 1 to 5 from the measurements (favourable high): reveal breadth, WOW per reveal,
trust (low false-positive), evidence strength, low friction, action, relationship-intelligence richness,
engine readiness now, recurring value, reach, prototype safety.

Feasibility and reach led weighting (the right lens to SHIP NEXT: weight friction, engine readiness,
reach, breadth, safety):

- Reputation 82.2
- Finance 64.4
- Dependency 62.6

Value and reveal-quality led weighting (the most VALUABLE lens: weight WOW, evidence strength, low
false-positive, action, relationship richness, recurring value):

- Finance 76.4
- Dependency 75.6
- Reputation 69.0

The two weightings are both legitimate and they disagree. Reputation wins decisively when the question
is "what ships next with the least risk and the widest reach." Finance wins, with Dependency a whisker
behind, when the question is "which lens produces the most valuable reveals." The prototype cannot pick
the weighting for you; it can only make the trade-off explicit and measurable, which it now has.

---

## 5. The decision

Lens 2 is Reputation and Reception. Confirmed, and conditional.

Confirmed, because on the only weighting that answers "what do we build and ship next," Reputation wins
decisively, and the prototype backs every reason: it is the sole candidate that is config-only on the
current engine (ships without engine work), it has instant time to first value and needs no user data,
it is the safest to prototype and to run, it produces the broadest genuine cross-surface reveals
(promise versus reception, identity mismatch, trust versus promise, established but invisible), and it
keeps the zero-integration magic that is the heart of Maculis. It is a quick win that is genuinely
valuable, not cheap noise: its silence rate of 43 percent shows it stays quiet on wallpaper and matched
promises, and it produced zero trivial reveals in the case-set.

Conditional, because the prototype also exposed Reputation's real weaknesses, and they must be
controlled before and during the pilot:

1. False-positive risk is the highest of the three (2.9 of 5). The case-set caught two concrete
   failure modes that a naive build would ship: legal-entity-name versus trade-name flagged as an
   identity mismatch (fixed in the prototype by normalising legal suffixes and containment), and a thin
   theme-match false positive (de-vries, where "deskundig" in a small review base was read as
   contradicting "strategisch advies"). Reputation over-fires easily. It needs tighter theme matching,
   a minimum review-base threshold before a promise-reception reveal, and benchmark-aware specificity.
2. Evidence strength is the lowest of the three (3.0). Its flagship promise-reception reveal leans on a
   small public review sample. It is most interesting exactly where it is thinnest.

And carrying a single falsification gate. The one measurement that can overturn this decision, and the
only one the scoring model never scores, is head-to-head confirmed-new recognition on real owners:
show the same owners the Reputation flagship and a Finance Bring Your Data flagship in the same sitting
and measure which produces more "no, I had not seen that." If Finance confirmed-new clearly exceeds
Reputation's and upload completion is not a wall, Lens 2 flips to Finance. This gate is built into the
Lens 2 pilot scope below.

---

## 6. Kill and defer decisions for the other candidates

- Finance (Bring Your Data): DEFER to Lens 3, do not kill. It is the highest-value lens on the value-led
  weighting and has the lowest false-positive risk and the strongest GrowBrain bridge. It is deferred
  for three measured reasons: it needs an engine extension (new relation families plus a numeric gate
  policy, see `01`), it carries the highest friction (upload) and the highest privacy and security drag,
  and its best reveal (concentration rising) is currently suppressed by the frozen gate. All three are
  now scoped rather than assumed. Finance is the destination, not the next step.
- Dependency and Resilience: DEFER to Lens 4, do not kill. It has the highest per-reveal WOW and the
  richest relationship intelligence, and it is surprisingly engine-compatible when framed as a
  cross-lens contradiction. It is deferred because it depends on both the Finance connector and
  Relationship Intelligence for its evidence, and because it carries the highest offense risk (a wrong
  reveal about fragility frightens rather than bores), which argues for building it only once the
  platform and the owner relationship are mature.

No candidate is killed. The bake-off found all three produce genuine, non-trivial reveals; the question
was sequencing, and the sequencing holds with better reasons.

---

## 7. Scope for the next Epic: Lens 2 production implementation

Build Reputation and Reception as Lens 2 at Level 1 outside-in, with the prototype's lessons as hard
requirements. Concrete scope:

1. Promote the prototype `observe` and `relate` into the First Five engine as a registered lens
   (`reputation.reception`), reusing the frozen engine unchanged (the bake-off proves this is config-only
   for Reputation). Requires the lens-registry refactor from the masterplan 30-day roadmap.
2. False-positive controls as acceptance criteria: legal-suffix-normalised identity matching (never flag
   legal versus trade name), a minimum review-base threshold before any promise-reception reveal,
   theme matching that does not treat adjacent themes as contradictions, and benchmark-aware specificity
   where a sector baseline is available.
3. Level 1 connector-plane work: the public-evidence connectors (website reuse from `src/live`, public
   review aggregate, DNS and RDAP, security headers, KVK identity). Each real-data source is gated by its
   own HUMAN ACTION and until then the lens runs on owner-consented own-site data plus the Places and KVK
   sources once their keys and ToS clear (`05`, HUMAN ACTIONS H1, H2).
4. Progressive-disclosure UX from `03`: one discovery at a time, beats not pages, the recognition capture
   (ja, voor een deel, nee), and the anti-dashboard test (if the eye can graze the first screen, it is a
   dashboard).
5. Recognition wired to Relationship Intelligence per `04`: a recognised reveal becomes a proposed memory
   for human confirmation; a rejected interpretation is recorded as such; the AI never writes speculation
   as fact.
6. The falsification gate as a pilot instrument: a head-to-head confirmed-new recognition measurement,
   Reputation flagship versus a Finance Bring Your Data flagship, on the same friendly owners.
7. In parallel and independently, begin the engine extension that Finance and Dependency need (new
   relation families plus numeric gate policy, `01`), so Lens 3 is unblocked when its turn comes. This is
   engine work, not a Reputation dependency, and can run on its own workstream.

Explicitly out of scope for the next Epic: any connected marketing level, any Finance production build,
any provider activation, any change to the First Five production flow.

---

## 8. Definition of Done: deliverables map

| DoD item | Where |
|----------|-------|
| 1. Three executable lens specifications | `lens-bakeoff/lenses/{reputation,finance,dependency}.mjs` + `.spec.md` |
| 2. Evidence matrices | `02-evaluation-model.md` and `lens-bakeoff/out/results.json` |
| 3. Prototype / test harness | `lens-bakeoff/` (engine, lenses, cases, eval, 8 passing engine tests) |
| 4. Case-set | `lens-bakeoff/cases/cases.mjs` (14 synthetic, labelled) |
| 5. Reveal Gallery | `lens-bakeoff/out/reveal-gallery.md` |
| 6. Failures and silences | Gallery silence and insufficient sections; measured silence rates in section 3 |
| 7. WOW evaluation | `03-wow-and-ux.md` + WOW proxy scores in section 3 |
| 8. GrowBrain evaluation | `04-growbrain-and-relationship-intelligence.md` Part A |
| 9. Relationship Intelligence evaluation | `04-...md` Part B |
| 10. Technical feasibility | `01-reveal-engine-compatibility.md` |
| 11. Privacy and security evaluation | `05-privacy-security.md` |
| 12. New weighted comparison | section 4 above |
| 13. Explicit Lens 2 recommendation | section 5 above |
| 14. Kill / defer for the others | section 6 above |
| 15. Scope for the production Epic | section 7 above |

---

## 9. Honest limitations

- The case-set is synthetic. It was crafted to be diverse and to include traps, but it cannot prove
  real-world reveal rates or real recognition. It proves the harness, the gate behaviour, the
  compatibility finding, and the relative shape of the three lenses, which is what a pre-pilot bake-off
  can prove.
- The per-reveal quality scores are heuristic proxies with stated formulas. They make the three lenses
  comparable on one rubric and expose triviality; they are not a substitute for owner recognition.
- The two weightings in section 4 are deliberately chosen to bracket the decision, not to hide it. The
  bake-off's job was to make the trade-off explicit and to name the one measurement that resolves it,
  and it has.
