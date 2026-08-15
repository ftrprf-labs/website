# EPIC-2 — Next Lenses: Strategic Deepening & Product Portfolio

Durable record of the second large Epic run through the Maculis Development
Orchestrator (baseline `49adeb4`, run on the branch continuing EPIC-1). A
**decision-quality** epic: deep research, product/data/architecture strategy, and an
explicit build decision — not a code-volume run. EPIC-1 is used as input; nothing from
it was discarded or re-researched.

- Governance: **Lead Engineering — Autonomous Night Run** (`config/governance.json`).
- Machine record of the decomposition: [`epic-state.json`](./epic-state.json).
- Consolidated deliverable: [`masterplan.md`](./masterplan.md).

## How it ran (honest provenance)

- Submitted through the Orchestrator's `submitEpic()` on the baseline code, continuing
  EPIC-1's numbering → **EPIC-2, 10 sub-tasks (MAC-107…MAC-116), 3 repositories**, with
  the real dependency graph in `epic-state.json`.
- Executed as **8 parallel specialist workstreams** (research/design) plus a synthesis
  pass; independent workstreams ran concurrently. Web-research workstreams used live
  **official sources** with provenance tables; the egress proxy blocked some full-page
  fetches, so exact figures rest on official-domain search snippets and are flagged for
  human confirmation. Relationship/architecture workstreams are grounded in the real
  repo code with `file:line` citations. Nothing was mock-completed and reported as real.
- No ALLOW prompts for normal research/analysis/documentation/commits/pushes. No new
  product features were built (per the assignment: decide the implementation order first).

## Decomposition, workstreams & deliverables

| Sub-task | Domain | Workstream | Deliverable | Status |
| --- | --- | --- | --- | --- |
| MAC-107/108 | relationship/website | WS-1 Lens universe + weighted ranking + Lens #2 | `research/01-lens-universe-and-ranking.md` | DONE |
| MAC-109 | first_five | WS-2 First Five enhancement | `research/02-first-five-enhancement.md` | DONE |
| MAC-110 | first_five (high) | WS-3 Finance Lens deep dive | `research/03-finance-lens-deep-dive.md` | DONE |
| MAC-111 | website | WS-4 Marketing Lens deep dive | `research/04-marketing-lens-deep-dive.md` | DONE |
| MAC-112 | routing-review | WS-5 Integration opportunity matrix | `research/05-integration-opportunity-matrix.md` | DONE |
| MAC-113 | first_five | WS-6 Zero-integration strategy | `research/06-zero-integration-strategy.md` | DONE |
| MAC-114 | first_five | WS-7 WOW/Magic design | `research/07-wow-magic-design.md` | DONE |
| MAC-115 | relationship | WS-8 GrowBrain bridge + Relationship flywheel | `research/08-growbrain-and-flywheel.md` | DONE |
| MAC-116 | first_five | WS-9 Product architecture + business model | `research/09-product-architecture-and-business-model.md` | DONE |
| — | synthesis | WS-D Consolidated masterplan | `masterplan.md` | DONE |

- **3 repositories:** `website`, `groeiplatform-website`, `maculis-first-five.`.
- **Parallel workstreams:** all 8 specialist streams ran concurrently; the synthesis
  consolidated them and made the explicit calls.
- **Official sources cited across the web workstreams:** WS-3 47 · WS-4 38 · WS-5 26 ·
  (plus EPIC-1's 29 reused for comms) — each with 2026-08-15 access dates.

## The headline decisions

- **Lens #2 = "What You Repeat"** (Tier-A, zero-integration, most reliable + magical),
  with **Price Visibility & Confidence** as the immediate commercial follow-on.
- **Killed** as ungroundable public lenses: Finance, Cashflow, Margin, Market,
  Innovation, Commercial Performance, external Competitor-ID, Branded Search.
- **Only 3 Build-Now integrations:** KVK, VIES, Google Search Console.
- **Zero-integration is the strategy**; PSD2 open banking is discouraged (decaying feed).

## HUMAN ACTIONS (parked — each blocks only its own dependency, not the epic)

1. Repo access to `maculis-first-five.` / `groeiplatform-website` for Phase-0 code.
2. Human confirmation of exact provider pricing/quotas (proxy snippet caveat).
3. Provider accounts + DPAs / PSD2 licensing / enrichment DPIA (only for later,
   connected rungs).
4. Product sign-offs: Technical Signals boundary; make-lens-a-primitive decision;
   cliché-corpus ownership; canonical relationship id across the two stores.

## Quality gates honoured

Cost (Tier-A derived-first; model calls key-gated/capped), security (secrets from env
only), privacy (PII minimisation, consent fail-closed, retention/erasure parity,
explicit creepiness guardrails), provenance (every external claim sourced + dated;
repo claims cited by `file:line`), and honesty (weak lens concepts killed with reasons;
cross-workstream conflicts resolved in the open; the proxy fetch limitation disclosed).
