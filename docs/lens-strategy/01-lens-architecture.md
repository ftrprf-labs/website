# Maculis Lens Architecture

> Companion to the Lens Strategy Masterplan (`00-masterplan.md`).
> Purpose: define the generic, shared engine on which every future lens is configuration and
> domain logic, not a new product. This document describes the target architecture and shows how
> much of it already exists, verbatim, in the frozen Reveal Engine (`maculis-first-five.`).
>
> Scope note. This is an internal architecture work document. It is written in the same house
> style as public copy (no stylistic dashes) so that example reveal wording can be lifted
> directly. Nothing here changes the current First Five production flow.

---

## 0. The one idea

A Maculis lens is not a dashboard and not a report. A lens is a pipeline that turns evidence into
at most one thing worth saying, and is willing to say nothing.

The pipeline is domain agnostic. The domain (website, finance, marketing, people) supplies only
three things: where evidence comes from, how raw evidence becomes observations, and which
relations between observations are worth detecting. Everything after that (the selectivity gate,
the choice of what to surface, silence as a valid outcome, recognition capture, provenance) is
shared and already built.

If we hold this line, Lens 2 is mostly evidence adapters and relation detectors on top of an
engine that already knows how to be selective and honest. If we break this line, every lens
becomes a bespoke product and the roadmap collapses under its own weight.

---

## 1. What already exists (do not rebuild)

The First Five journey (`maculis-first-five.`, `src/engine`, `src/live`, `src/server`) contains a
frozen, tested Reveal Engine (`ENGINE_VERSION = maculis-reveal-0.2.0`) and a live bridge
(`LIVE_PIPELINE_VERSION = maculis-live-0.14.x`). The engine is deliberately frozen and ported
verbatim. It is the single most valuable asset for the entire lens roadmap, because it encodes the
hard part: the discipline that separates evidence from insight.

### 1.1 The engine data model (already generic)

From `src/engine/model.ts`:

- `EvidenceLevel = L0 | L1 | L2 | L3 | L4`: a confidence ladder attached to every observation and
  relation. This is domain neutral.
- `Observation`: a grounded statement about the subject, with `kind`, `subject`, `statement`,
  `raw_evidence[]` (each carrying `surface`, `url`, `quote`, `observed_at`), and a `confidence`.
- `Relation`: a detected tension between observations, with a `family`, the `observation_ids` it
  rests on, a `cross_lens` flag, a plain language `tension`, a `why_might_matter`, a `confidence`,
  and a hard `sufficient_for_candidate` boolean.
- `CandidateReveal`: a relation promoted to a candidate, with proposed `wording`, `significance`,
  and `novelty`.
- `GateResult`: the selectivity verdict with per check findings.
- `Reveal`: the surfaced (or suppressed) output, with full provenance (`basis[]`,
  `observation_ids`, `relation_id`) and a `recognition` slot.
- `EngineTrace`: the full run: observations, relations, candidates, reveals, the one surfaced
  reveal, and notes. This is the audit and provenance backbone.

None of these types mention websites. They are already the vocabulary of a generic lens engine.
The only website specific enum is `Lens = "zichtbaarheid" | "toestroom" | "verbondenheid" |
"waarde"`, which is the set of sub perspectives inside the current lens. Generalising this to a
lens registry is the single most important refactor for Lens 2 (see section 4).

### 1.2 The four relation families (the reusable heart)

From `src/engine/relations.ts`, the engine detects exactly four kinds of tension. These are not
website specific. They are the four shapes of "something is off here" that apply to any business
domain:

| Family | Website meaning today | Generalised meaning | Finance example |
|--------|----------------------|---------------------|-----------------|
| `CONTRADICTION` | A promise contradicts the site's own operational text | Two signals the owner controls point in opposite directions | Revenue is up while cash is down |
| `TELLING_ABSENCE` | A specific claim has no supporting proof anywhere | Something the owner asserts or implies is not evidenced | "We are growing" with no new customers in the ledger, only price rises |
| `MISCAST` | A real strength is buried, or a façade is over fronted | The importance a signal is given does not match the weight of the evidence | The most profitable service line gets the least attention and spend |
| `DRIFT` | The site advertises something no longer delivered | The story lags behind what the business actually does now | Fixed costs grew for a capability the business stopped selling |

The detectors themselves are website specific (they read `self_claim`, `proof_cluster`, and so
on). The families are not. A new lens implements new detectors that emit `Relation` objects in the
same four families, and inherits the gate, the selector, silence, and provenance for free.

### 1.3 The Gate (why Maculis is not a dashboard)

From `src/engine/gate.ts`, every candidate must pass seven checks before it can surface:

1. `evidence_floor`: relation confidence is at least L3.
2. `already_stated`: if the organisation says this about itself, it is not a reveal.
3. `specificity`: the subject is not sector wallpaper (something true of almost everyone).
4. `non_generic`: the signal is distinctive, not functional boilerplate.
5. `defensible`: no causal or recommendation language, and no leaning on a single external data
   point for a cross lens reading.
6. `meaningful`: it connects to a real decision the owner might make.
7. `attention_worthy`: it is either an undeniable single surface gap (contradiction, drift,
   telling absence) or it is corroborated across lenses. A contestable single lens reading that a
   skeptic would wave away does not pass.

This gate is the product. It is the codification of "evidence is not automatically insight." It is
domain agnostic and must be reused unchanged. The frozen file even carries the instruction: do not
lower the gate for a demo, silence stays a first class success.

### 1.4 Silence, selection, and the bounded LLM

- `EngineOutcome = REVEAL | SILENCE | INSUFFICIENT | FAILURE`. Silence is a designed, valued
  outcome, not a failure. The live layer refines failure into `INSUFFICIENT_EVIDENCE`,
  `ACCESS_FAILED`, `ENGINE_ERROR` so that "I could not look" is never dressed up as "nothing to
  see."
- `DeterministicSelector` (`src/engine/interpret.ts`) picks at most one reveal by family priority
  then significance then cross lens. The choice of what to say is deterministic and explainable.
- `BOUNDED_LLM_CONTRACT`: the model may only pick among gate passed candidates or return null. It
  may not introduce facts, change the gate outcome, revive suppressed candidates, or construct
  causality. This is the exact contract every future lens must hold the AI to. It is how we get the
  fluency of language models without letting them invent insight.

### 1.5 Recognition (the seed of Relationship Intelligence)

`captureRecognition` (`src/engine/recognition.ts`) records the owner's response as `yes | partly |
no` and updates novelty to `confirmed_known` or `confirmed_new`. This single event is the most
valuable data Maculis produces. A reveal the owner marks "no, I had not seen that" is a confirmed
new insight and the strongest possible signal for Relationship Intelligence and for lens quality
measurement. See the masterplan sections on Relationship Intelligence and pilot strategy.

### 1.6 The live bridge (evidence acquisition, already staged)

`src/live` shows the acquisition and grounding pattern a new lens repeats in its own domain:
retrieve, select, clean, extract atomic claims, ground them against a quality gate, assemble an
`EvidenceBundle`, then call the frozen engine unchanged. It already carries additive evidence
families beyond the four core lenses: Technical Signals ("Scherpstellen"), Beveiliging (security
headers from the same fetch), First Impression (a warmth thermometer), and Story of the Site.
These are the natural expansion surface for the current lens (masterplan section 3).

---

## 2. The generic lens contract

A lens is a module that provides the following, and nothing more. Everything else is inherited.

```
Lens = {
  id, name, version,
  evidence:      EvidenceSource[]        // where signals come from (see Connector Architecture)
  observe:       (evidence) => Observation[]   // domain: raw evidence -> grounded observations
  relate:        (observations) => Relation[]  // domain: detectors emitting the 4 families
  present:       PresentationSpec        // wow beat, deepen beats, question wording
  disclosure:    Level[]                 // Level 1 Outside In .. Level 4 Continuous
  policy:        { consentScopes, dataClasses, retention, privacyClass }
}
```

The shared engine provides: the gate, the selector, silence and failure semantics, provenance and
trace, recognition capture, cross lens reasoning, the bounded LLM seam, versioning, and
observability. A lens author writes `observe` and `relate` and a presentation and policy config.
They do not write selectivity, and they may never lower the gate.

### 2.1 The four questions contract (presentation invariant)

Every surfaced reveal, in every lens, answers the four questions the current lens already answers
through waarneming, bewijs, betekenis, vraag:

1. Wat zie ik. The grounded observation, with at least one verbatim quote or exact figure and its
   source. Never a claim without its `basis`.
2. Waarom is dat opmerkelijk. The tension, in one sentence. This is the `Relation.tension`.
3. Waarom doet dat ertoe. The decision it touches. This is `Relation.why_might_matter`, and it must
   be a question the owner recognises, never advice.
4. Wat zou ik nu willen begrijpen. The invitation to deepen or to add one piece of context. This is
   the seam to progressive disclosure and to GrowBrain.

A lens that cannot fill all four from grounded evidence must stay silent on that candidate. This is
enforceable and testable.

---

## 3. Evidence, confidence, and provenance (shared)

### 3.1 The confidence ladder, generalised

`EvidenceLevel` is reused across domains with a shared meaning, so cross lens reasoning can compare
apples to apples:

- L0 inferred only, no direct basis. Never surfaces.
- L1 single soft signal, self stated or structural. Context, not a reveal on its own.
- L2 corroborated soft signal, or one hard signal.
- L3 hard signal, or two independent soft signals that agree. The floor for a reveal.
- L4 multiple independent hard signals, or a hard signal the owner confirms.

Finance data is often born at L3 or L4 (a ledger figure is a hard signal), which is exactly why the
Finance lens can reach a defensible reveal faster than a marketing lens whose signals are softer.
This is a structural reason to sequence lenses, developed in the masterplan prioritisation.

### 3.2 Provenance is not optional

Every observation carries `raw_evidence[]` with the exact quote or figure and its source and
timestamp. Every reveal carries the `basis[]` and the `observation_ids` and the `relation_id` that
produced it. The UI can always answer "waar zie je dat." For connected financial data the source
reference is the connector, the object type, the object id, and the as of date, so that a reveal is
reproducible and auditable. Provenance is the reason an owner trusts a surprising statement instead
of dismissing it.

---

## 4. The one refactor that unlocks the roadmap: a Lens Registry

Today `Lens` is a fixed union of four website perspectives. To add lenses without forking the
engine, promote it to a registry:

- A `LensId` becomes an open identifier (`website.first_five`, `finance.core`, `marketing.core`,
  `people.core`, and so on), registered with metadata: display name, evidence sources, disclosure
  levels, consent scopes, data classes, and gate configuration overrides that may only make the
  gate stricter, never weaker.
- `Observation.lens` and `Relation.cross_lens` keep working unchanged. `cross_lens` becomes "the
  observations span more than one registered lens," which is precisely the mechanism the masterplan
  calls cross lens reveals.
- The gate stays global. A lens may raise `min_evidence_level` or add checks. It may not remove
  them. This is enforced by making `GateConfig` composition monotonic.

This refactor is small, mechanical, and fully covered by the existing engine tests. It is the
recommended first engineering task of the 30 day roadmap, because it is the precondition for every
lens after First Five and for cross lens reasoning.

---

## 5. Cross lens reasoning (shared, evidence bounded)

Cross lens reveals are the strongest differentiator Maculis can build, and the engine already has
the mechanism: a `Relation` whose `observation_ids` come from observations tagged with different
`LensId` values is a cross lens relation. The gate already treats cross lens corroboration as a way
to clear `attention_worthy`.

The rule that keeps this honest is the relation strength ladder. Maculis may signal a relationship
without inventing causality:

1. Correlation. Two signals move together in the data. Statable with care.
2. Temporal coincidence. One shifted, then the other shifted. Statable as sequence, never as cause.
3. Plausible hypothesis. A mechanism the owner can confirm or reject. Always phrased as a question.
4. Confirmed relationship. The owner recognised it (`recognition = yes`) or two independent lenses
   agree at L3 or higher.
5. Causal claim. Requires an intervention and a measured result. This only exists after a GrowBrain
   experiment, never from observation alone.

The `defensible` gate check already forbids causal and recommendation language. Cross lens
reasoning lives at levels 1 to 4 and hands level 5 to GrowBrain. A cross lens reveal is surfaced
only when the two contributing observations are each at least L3, or when one is L4. The canonical
example, revenue grows but cash does not, is a `CONTRADICTION` across the finance sub lenses whose
two observations are both hard ledger signals, which is why it is both safe and striking.

---

## 6. Presentation and progressive disclosure (shared)

The pilot produced a decisive learning (`docs/ux-observations-next-round.md`): when First
Impression, Story of the Site, and Observations are all stacked on one screen, the feeling shifts
from "Maculis shows me something" to "Maculis makes me read a report." This is the single most
important UX finding for the whole roadmap, and it is a property of the shared presentation layer,
not of one lens.

The shared presentation contract therefore enforces beats, not pages:

- Beat 1, the wow. One discovery. The grounded observation and the tension, nothing else competing
  for attention. For the current lens this is the reveal, or the strongest single grounded
  observation on silence.
- Beat 2, the evidence. One consistent "waar zie je dat" affordance, not several parallel ones.
  Proof stays proof and never becomes the main product.
- Beat 3, the meaning and the question. Why it touches a decision, and the invitation to go deeper
  or to add one piece of context.
- Beat 4 and beyond, deepening on demand. Additional evidence families and adjacent lenses, pulled
  by the owner, never pushed all at once.

The engine already supports this: it surfaces one reveal, keeps the rest of the trace available,
and the server `deepen` seam exists. The shared rule is that a lens declares its beats and the
platform renders one at a time. No lens is allowed to dump its full trace on first contact.

---

## 7. Consent, privacy, and audit (shared, already patterned)

The Communication Layer and Testerbeheer already establish the patterns a lens inherits:

- Fail closed consent. `mayContact = consent_status === OPTED_IN`. Lenses that reach out, or that
  ingest connected data, gate on explicit, purpose scoped, revocable consent. Outside In evidence
  (Level 1) uses only public data and needs no account consent, which is why it is the safe first
  level for every lens.
- Data minimisation and purpose limitation. The bounded Context Engine (`server/comm/ai/context.mjs`)
  assembles only what the current goal needs, never a database dump, and returns a transparency
  reference for every item. A lens reuses this stance: the engine sees the evidence bundle for the
  current lens run, tagged with provenance, and nothing else.
- Privacy classes. Privacy conversations are excluded from AI context. Financial and personal data
  carry a data class (Public, Internal, Confidential, Restricted per the FTRLABS data
  classification policy) that drives retention and access.
- Audit. Every reveal, every recognition, every connector sync, every AI draft carries an audit
  trail. This already exists for communication and is generalised to lens runs.

---

## 8. Observability, versioning, testing (shared)

- Versioning. `ENGINE_VERSION` and `LIVE_PIPELINE_VERSION` are stamped on every trace. A lens adds
  its own version. A reveal is always reproducible against the exact code that made it.
- Testing. The engine is proven by frozen tests. A new lens ships with fixture evidence bundles and
  golden traces, plus adversarial silence tests that prove it stays quiet on thin or generic input.
  The most important test for any lens is not "does it reveal," it is "does it correctly stay
  silent."
- Observability. Outcome distribution (reveal, silence, insufficient, failure), gate suppression
  reasons, and recognition rates are the health metrics of a lens. A lens whose silence rate
  collapses is probably leaking triviality and must be investigated, not celebrated.

---

## 9. How a new lens is built (the repeatable recipe)

1. Define the entrepreneur question and the hidden truth the lens tries to surface (masterplan lens
   definition template).
2. Register the `LensId` and its disclosure levels, consent scopes, and data classes.
3. Implement Level 1 Outside In first: the smallest evidence source that can produce a defensible
   observation with public data and no login.
4. Write `observe`: map raw evidence to grounded observations with confidence and provenance.
5. Write `relate`: detectors that emit the four families from those observations, including cross
   lens relations where relevant.
6. Configure `present`: the four questions wording and the beats.
7. Add golden traces and adversarial silence fixtures.
8. Run the gate unchanged. Tune detectors and observation confidence, never the gate.
9. Pilot against the pilot strategy criteria before widening (masterplan pilot section).
10. Only then add Level 2 Bring Your Data and Level 3 Connected.

---

## 10. What this architecture explicitly refuses

- No lens may lower the gate to produce output for a demo or a pilot.
- No lens may surface a claim without grounded provenance.
- No lens may let the AI introduce facts or construct causality.
- No lens may present its full trace on first contact.
- No lens may ingest connected or personal data without explicit, purpose scoped consent.
- No lens may ship without adversarial silence tests.

These refusals are what make Maculis a set of lenses rather than a pile of dashboards. They are the
architecture.
