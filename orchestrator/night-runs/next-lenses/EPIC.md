# EPIC-1 — Maculis Next Lenses & Intelligence Strategy (Autonomous Night Run)

Durable record of the first large Epic run through the Maculis Development
Orchestrator (baseline commit `49adeb4`). This file is the epic manifest: what was
submitted, how the Orchestrator decomposed and routed it, how each workstream was
executed, and which items are parked as genuine HUMAN ACTIONS.

- Governance applied: **Lead Engineering — Autonomous Night Run**
  (`orchestrator/config/governance.json`, `docs/LEAD_ENGINEERING.md`).
- Run type: **deep research / product-strategy / data-strategy / architecture**
  (the assignment's own framing) → all sub-tasks are `analysis` (read-only). No
  product code changed; the deliverables are durable strategy documents.
- Machine record of the decomposition: [`epic-state.json`](./epic-state.json).

## How it was run (honest provenance)

- The Epic was submitted through the Orchestrator's own `submitEpic()` on the
  baseline code; the decomposition, routing and dependency graph below are the
  Orchestrator's real output (not hand-authored).
- The live Render API was not reachable from the execution session (outbound egress
  to `*.onrender.com` is blocked there), so the identical baseline code was run
  locally — same engine, same governance. The ChatGPT Action is a separate
  connection and was intentionally not on the critical path.
- Execution context: research/strategy sub-tasks were carried out with live web
  research against **official sources** (provenance recorded per document) and, for
  the Relationship domain, grounded in the **real repository code** with `file:line`
  citations. Nothing was mock-completed and reported as real.

## The assignment (submitted as ONE epic)

> MACULIS NEXT LENSES & INTELLIGENCE STRATEGY — Autonomous Deep Research, Product
> Strategy, Data Strategy and Architecture Night Run. (Six numbered workstreams:
> First Five Next Lenses framework; Relationship intelligence/signal layer; provider
> & API deep research; public website presentation; data strategy & architecture;
> consolidated masterplan.)

Note on scope fidelity: the verbatim prior "Next Lenses" document was not present in
the execution session's context. The epic body was reconstructed faithfully from the
established title and the known Maculis domains, and is explicitly open to being
re-run with a more specific canonical text (the Orchestrator can re-decompose it).

## Decomposition & routing (Orchestrator output)

| Sub-task | Domain / repo | Type | Depends on | Workstream | Status | Deliverable |
| --- | --- | --- | --- | --- | --- | --- |
| MAC-101 | First Five — `maculis-first-five.` | analysis | — | WS-A (parallel) | DONE | `research/01-first-five-next-lenses.md` |
| MAC-102 | Relationship — `website` | analysis | — | WS-B (parallel) | DONE | `research/02-relationship-intelligence-layer.md` |
| MAC-103 | Relationship — `website` | analysis | MAC-102 | WS-B (seq) | RUNNING | `research/03-provider-api-research.md` |
| MAC-104 | Website — `groeiplatform-website` | analysis | — | WS-C (parallel) | DONE | `research/04-website-presentation.md` |
| MAC-105 | Relationship — `website` | analysis | MAC-103 | WS-B (seq) | DONE | `research/05-data-strategy-architecture.md` |
| MAC-106 | (routing review) | analysis | — | WS-D (synthesis) | PENDING (awaits MAC-103) | `masterplan.md` |

> Checkpoint: this commit stores the finished workstreams durably. MAC-103 (provider
> deep research) is still running and MAC-106 (masterplan synthesis) follows it; both
> land in the finalising commit. This is a durable checkpoint, not the final state.

- **3 repositories:** `maculis-first-five.`, `website`, `groeiplatform-website`.
- **Parallel workstreams:** WS-A (First Five), WS-B (Relationship chain
  102→103→105), WS-C (Website) ran independently; WS-D consolidated them.
- **Dependency gating** (Autonomous Night Run rule): the Relationship chain is
  sequenced per-repo; independent repos ran in parallel; nothing ran on a broken base.

## HUMAN ACTIONS (parked — none blocked the research)

1. **Routing owner for the synthesis** (MAC-106 → `routing-review`): the consolidated
   masterplan has no single domain owner. Taken by the epic lead; resolved.
2. **Private-repo access for code delivery**: `maculis-first-five.` and
   `groeiplatform-website` are private and were not in the execution session's GitHub
   scope. This parks the eventual *implementation* in those domains, not the strategy.
3. **Provider / business credentials & DPAs** (WhatsApp Business Account + Meta app
   review, Twilio/other paid accounts, EU-residency & data-processing sign-off): real
   human/legal actions required before any channel or enrichment goes live. See
   `research/03-provider-api-research.md` and `research/05-data-strategy-architecture.md`.
4. **Canonical relationship id** spanning the JSON tester store and the Postgres comm
   store — an owner decision (see MAC-102/MAC-105).

## Quality gates honoured

Cost (derived-first, model calls capped/key-gated), security (secrets from env only),
privacy (PII minimisation, consent fail-closed, retention parity), provenance (every
signal/claim sourced; official docs cited with access dates), and honesty (no
mock result presented as real; assumptions marked where the private repos were not
readable).
