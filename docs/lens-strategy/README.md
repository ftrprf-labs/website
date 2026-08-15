# Maculis Lens Strategy (post First Five)

This folder is the durable work document for the next generation of Maculis lenses. It exists so the
strategy, architecture, prioritisation, and research do not live in one chat or scattered build logs.
It is written to be liftable into the FTRLABS governance Single Source of Truth (`ftrlabs-docs`) with
minimal editing.

Nothing here changes the current First Five production flow. This is strategy, research,
architecture, and prototyped decision models only. Any activation of a connector, a journey change, or
a new lens in production is an explicit human decision (see HUMAN ACTIONS in the masterplan).

## How to read this

Start with the masterplan. Open a companion when you need the exhaustive spec behind a section.

| Document | What it is |
|----------|------------|
| [`00-masterplan.md`](00-masterplan.md) | The comprehensive Lens Strategy Masterplan. Executive synthesis, current-lens analysis and expansion, full lens taxonomy, candidate lens definitions, Finance and Marketing deep dives, unexpected new lenses, zero-integration strategy, cross-lens intelligence, Relationship Intelligence and GrowBrain, wow and seduction models, privacy, security, economics, competition, prioritisation, anti-roadmap, pilot strategy, three roadmaps, dependencies, HUMAN ACTIONS, open decisions, and concrete recommendations for Lens 2, 3, and 4. |
| [`01-lens-architecture.md`](01-lens-architecture.md) | The generic, shared lens engine. Shows how much already exists, frozen and tested, in the Reveal Engine, and the one refactor that unlocks the roadmap. |
| [`02-connector-architecture.md`](02-connector-architecture.md) | The shared connector plane so no lens rebuilds OAuth, sync, webhooks, rate limits, or consent. File ingestion as a first-class connector. |
| [`03-prioritization-model.md`](03-prioritization-model.md) | The explicit weighted scoring model and the computed ranking that answers which lens is second, third, and fourth. |
| [`04-orchestrator-playbook.md`](04-orchestrator-playbook.md) | How future lens work decomposes into governed tasks, which repository each task needs, and how findings are promoted into the governance SSoT. |
| [`research/finance-integration-landscape.md`](research/finance-integration-landscape.md) | Sourced API matrix for accounting, banking, and payment platforms for Dutch/EU SMB, with a build-order ranking. |
| [`research/marketing-and-outside-in-evidence.md`](research/marketing-and-outside-in-evidence.md) | Sourced marketing API matrix, the outside-in public-evidence catalogue, and twelve revealworthy cross-signal relationships. |
| [`research/competitor-and-differentiation.md`](research/competitor-and-differentiation.md) | Sourced competitor landscape and an honest read of where Maculis differentiation is real versus illusory. |

## The headline recommendation

- Deepen Lens 1 (the website lens) continuously, without letting it become a report.
- Lens 2: Reputation and Reception, an outside-in cross-lens that keeps the zero-integration magic and
  proves cross-lens reveals cheaply.
- Lens 3: Finance, entered through Bring Your Data (upload) before any ERP integration. The moat and
  the money, reached after trust is built.
- Lens 4: Dependency and Resilience, once the Finance connector and Relationship Intelligence exist.

The pushback in one line: Finance is the most valuable lens, and it is deliberately not Lens 2.

## Provenance

Compiled 2026-08-15. Grounded in the frozen Reveal Engine (`maculis-first-five.`), the Communication
and Relationship Layer (`website`), and the governance SSoT (`ftrlabs-docs`), plus three sourced
research streams. Facts, assumptions, and hypotheses are separated throughout. House writing rule
respected: no stylistic hyphens or dashes in visible copy.
