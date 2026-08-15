# Maculis Lens Orchestrator Playbook

> Companion to the Lens Strategy Masterplan (`00-masterplan.md`). Purpose: make this strategy a
> durable part of the Maculis Orchestrator way of working, not knowledge that lives in one long chat.
> It defines how a new lens is decomposed into governed tasks, which repository and engineering
> context each task needs, and how findings are promoted into the FTRLABS documentation Single Source
> of Truth (`ftrlabs-docs`).

---

## 1. The problem this solves

Right now, the Maculis lens vocabulary and architecture live in code and in build logs across three
repositories, and they are not yet captured in the governance SSoT. A search of `ftrlabs-docs` (the
declared Single Source of Truth) finds no mention of Maculis, lens, reveal, GrowBrain, Relationship
Intelligence, or First Five. The strategy, the Reveal Engine design, the prioritisation, and the
connector architecture would otherwise depend on this conversation and these files alone.

The Orchestrator's job is to remove that dependency: every lens is planned, executed, and recorded as
governed artifacts, so any future session or agent can pick up the work from durable state.

This is a HUMAN ACTION and a governance recommendation, not something to push unilaterally. This
strategy work is committed to `ftrprf-labs/website` on the assigned branch. Promoting the durable
artifacts into `ftrlabs-docs` (which has its own CODEOWNERS, Docs CI, and PR review) is a separate,
reviewed step. See section 5.

---

## 2. The three-repository map (context routing)

The Orchestrator must know which repository and engineering context a task needs. Current map:

| Repository | Role | Lens-relevant contents |
|------------|------|------------------------|
| `ftrprf-labs/maculis-first-five.` | The lens runtime (Journey + Reveal Engine) | Frozen `src/engine` (model, relations, gate, interpret, recognition), live pipeline `src/live`, server `src/server`. Where a new lens's `observe`/`relate`/present logic is built. |
| `ftrprf-labs/website` | Testerbeheer + Communication/Relationship Layer | Contact/Organization identity, Relationship Workspace, Relationship Memory, consent, AI Context Engine, connectors precedent (`server/comm/providers`). Where Relationship Intelligence and the connector plane live. |
| `ftrprf-labs/ftrlabs-docs` | Governance SSoT (docs-as-code) | North Star, Architecture Principles, Glossary, ADRs, decision log, roadmap. Where lens governance, ADRs, and the Product Bible entries belong. |

A lens task is tagged with the repository it touches so the Orchestrator can attach the right context
and the right reviewers.

---

## 3. Lens work decomposition (the standard pipeline)

Every new lens decomposes into the same ordered task types. Each task is independently assignable,
has a clear input and output artifact, and names the repository context it needs. Tasks with no
dependency between them run in parallel.

1. Research task. Define the entrepreneur question and the hidden truth. Output: a lens brief using
   the masterplan lens-definition template. Repo: `ftrlabs-docs` (as a draft PRD/RFC).
2. Provider research. For any connected data, produce or update the provider matrix (auth, objects,
   limits, gates, cost). Output: a research artifact like those in `docs/lens-strategy/research/`.
   Repo: `ftrlabs-docs` or `website` docs.
3. Data source assessment. Decide, per disclosure level, what evidence is available and at what
   confidence, and what the Level 1 outside-in path is. Output: an evidence source table. Repo: docs.
4. Lens design. The four questions wording, the beats, the disclosure levels, the wow moment and the
   deepening path. Output: a lens design doc plus example (clearly hypothetical) reveals. Repo: docs.
5. Evidence model. The `observe` mapping: raw evidence to grounded observations with confidence and
   provenance. Output: a spec plus fixtures. Repo: `maculis-first-five.`.
6. Prototype. `relate` detectors emitting the four families, run against the frozen engine unchanged,
   with golden traces and adversarial silence fixtures. No production behaviour change. Repo:
   `maculis-first-five.`.
7. Security review. Threat model the new evidence path and connectors. Repo: docs + code. Uses the
   ISMS/SoA in `ftrlabs-docs`.
8. Privacy review. DPIA for any personal or financial data; data classes, retention, consent scopes,
   lawful basis. Repo: `ftrlabs-docs` compliance.
9. Test generation. Golden traces, silence tests, connector fixtures, cross-lens reveal tests. Repo:
   `maculis-first-five.` and `website`.
10. Implementation. Wire the lens into the runtime and, where relevant, the connector plane. Repo:
    `maculis-first-five.` and `website`.
11. Deployment. Behind a flag, off by default, following the existing fail-closed deploy discipline.
12. Pilot evaluation. Run the pilot-strategy protocol; decide continue, iterate, or kill. Output: a
    decision-log entry. Repo: `ftrlabs-docs`.

The Orchestrator can fan out tasks 1 to 4 (research and design) and 2 (provider research) in
parallel, gate tasks 5 to 6 on the design, and gate 10 to 12 on the reviews. Silence tests (task 9)
are the definition-of-done gate: a lens is not ready until it demonstrably stays quiet on thin or
generic input.

---

## 4. Guardrails carried into every task

The Orchestrator injects these non-negotiables into every lens task, so no individual session
re-litigates them:

- Do not lower the gate. The frozen Reveal Engine gate and silence semantics are inherited unchanged.
- Provenance always. No surfaced claim without grounded evidence and a source reference.
- Bounded AI. The model selects among gate-passed candidates or returns null; it never introduces
  facts or constructs causality.
- Zero integration first. Every lens ships a Level 1 outside-in path before any connected level.
- Consent fail-closed. No connected or personal data without explicit, purpose-scoped, revocable
  consent.
- No production side effects during research or prototyping. Prototypes never change production
  behaviour. Activation of any connector, journey change, or new lens in production is an explicit,
  separate human decision.
- House writing rule. All visible copy avoids stylistic hyphens and dashes (repo CLAUDE.md).

---

## 5. Governance handoff: promoting into the SSoT

To end the dependency on chats and scattered build logs, these artifacts should be promoted into
`ftrlabs-docs` through its normal reviewed-PR process (HUMAN ACTION, separate from this branch):

1. Glossary additions. Add the canonical terms to `GLOSSARY.md`: Lens, Reveal, Reveal Engine,
   Observation, Relation (the four families), Gate, Silence, Recognition, Evidence Level, Disclosure
   Level (Outside In / Bring Your Data / Connected / Continuous), Relationship Intelligence,
   Relationship Memory, GrowBrain, Cross-lens reveal. Map GrowBrain to the existing "AI Growth Coach"
   module and Relationship Intelligence to the existing "CRM" module so the vocabulary reconciles.
2. Product Bible entry. A canonical description of Maculis as the lens layer: what a lens is, the
   shared engine, the disclosure levels, and how lenses feed GrowBrain and Relationship Intelligence.
3. ADRs. Record the load-bearing decisions as ADRs: the frozen Reveal Engine and gate as the shared
   selectivity mechanism; zero-integration-first; the connector plane; the cross-lens relation
   strength ladder (correlation to causal); the lens registry refactor.
4. Roadmap themes. Add the lens roadmap (30/90 day and 12 month) to `06-roadmap/`, with dependencies.
5. Decision log. Record the Lens 2/3/4 sequencing decision and its rationale (this masterplan), so the
   choice is remembered, not re-argued.
6. Compliance. Register the finance and marketing data processing in the ROPA and open DPIAs for the
   Finance and connected-Marketing lenses before those levels ship.

Until promoted, this `docs/lens-strategy/` set in the `website` repo is the interim canonical
reference and is written to be liftable into the SSoT with minimal editing (English, docs-as-code
style, stable structure).

---

## 6. Orchestrator inputs for the next lens (ready to run)

When the pilot allows, the first Orchestrator run for Lens 2 (Reputation and Reception) is:

- Research task: reuse the masterplan Lens 2 definition as the brief.
- Provider research: mostly done (`research/marketing-and-outside-in-evidence.md`); confirm the [V]
  items (Places caching ToS, SSL Labs ToU, KVK key) as HUMAN ACTIONS.
- Data source assessment: Level 1 outside-in only for the prototype (website reuse + public reviews +
  DNS + security headers + KVK + PageSpeed). No OAuth for the prototype.
- Lens design: the promise-experience gap as the primary reveal; findability and trust as secondary.
- Prototype: new `relate` detectors for cross-surface contradiction (brand promise vs public reception)
  on top of the frozen engine, with adversarial silence fixtures.

This is enough for the Orchestrator to begin Lens 2 from durable state, with no dependency on this
conversation.
