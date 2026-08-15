# Maculis Next Lenses & Intelligence Strategy — Consolidated Masterplan

Sub-task MAC-106 (synthesis) of EPIC-1. Consolidates the five research workstreams
into one decision-ready plan: product strategy, intelligence/data strategy,
architecture, provider strategy, and public presentation, with a phased roadmap and
a HUMAN ACTIONS register. Read-only synthesis; no product code changed.

Sources (this repo): [`01`](./research/01-first-five-next-lenses.md) ·
[`02`](./research/02-relationship-intelligence-layer.md) ·
[`03`](./research/03-provider-api-research.md) ·
[`04`](./research/04-website-presentation.md) ·
[`05`](./research/05-data-strategy-architecture.md) · manifest [`EPIC.md`](./EPIC.md).

---

## 1. Thesis

A **lens** is the unifying primitive across Maculis: *one deliberately chosen,
evidence-bound perspective — a focus, never a verdict or a score.* Today it exists in
two places that have grown independently:

- **First Five**: "Technical Signals" is a lens; "Nog een lens" is the extension point.
- **Relationship Workspace**: the AI copilot already emits `intent` +
  `suggested_actions`, and `propose_next_lens` is already a modelled action
  (`server/comm/ai/provider.mjs:63`).

Next Lenses makes the lens a **first-class, catalogued, contract-bound primitive**
shared by both — with a single evidence/fail-closed/privacy discipline. This is an
extension of what exists, not a new subsystem.

## 2. Product strategy

- **One lens contract** (from WS-A + WS-B), every lens declares: what it *observes*,
  its *evidence* sources, a *fail-closed default*, a *precision-first* silence policy
  (abstain rather than guess), its *journey/workspace placement*, and its *privacy
  posture*. Output is either `Closed(reason)` or `Observations[]` where every claim
  carries verifiable evidence and a two-bucket strength — **never a numeric score**.
- **First Five slate** (WS-A): six evidence-bound lenses beyond Technical Signals,
  each reading only the public subject surface with no external accounts — *Clarity of
  Promise, Reachability, Freshness Signals, Findability Basics, Accessibility First
  Pass, Name & Identity Consistency*. Ship the most human-legible first (Clarity of
  Promise, Reachability); defer Findability Basics (overlaps Technical Signals).
- **Relationship intelligence** (WS-B/02): a lens here is a *suggestion* over the
  existing copilot → `ai_draft` → human-in-the-loop pipeline. **AI never sends**
  (`outbound.mjs:7`); lenses inform, humans act.
- **Public story** (WS-C): present a lens as a chosen perspective, not a verdict;
  "the collection keeps growing" is the honest intelligence arc, and mechanism is
  never exposed.

## 3. Intelligence & data strategy

- **Signal taxonomy** (WS-B/02): conversational intent (live today), engagement/journey
  signals (from real events), relationship temperature (explainable aggregate, no
  opaque score), next-lens fit, and consent/lawful-basis state (a hard gate).
- **One durable evidence surface** (WS-B/05): add a single `lens_signal` table
  (tenant-scoped, PII-free, `evidence[] + source + model`) behind the existing
  `ai_draft` suggestion. No competing "signals database".
- **Provenance is mandatory**: every signal records a `source` (mirroring
  `store.mjs` `SOURCES`), and `evidence[]` makes every lens output reproducible —
  *no silent signals*.
- **Cost**: derived/rule lenses first (free); model-backed lenses reuse the existing
  key-gated `ai/provider.mjs` abstraction (mock by default), capped tokens, cached
  per subject — **no per-message model call by default**.

## 4. Provider / channel strategy (WS-B/03)

Recommended EU, consent-fail-closed default stack, behind Maculis's existing
abstracted provider interface:

- **Primary follow-up: email** via SendGrid Email API with **EU Data Residency**
  (extends today's Resend-based `outbound.mjs`; provider stays swappable).
- **SMS + verification: Twilio Programmable SMS + Verify** in the Ireland (IE1)
  region; keep **Vonage / Bird** swap-in for SMS cost/coverage.
- **WhatsApp Business Platform (Cloud API): phase 2**, gated behind explicit
  WhatsApp-specific opt-in — per-message billing (since 1 Jul 2025), quality tiers,
  and template approval make it a deliberate, consent-gated step, not a default.
- **Messenger / Instagram: inbound-only** (24-hour window) — a poor fit for outbound
  follow-up.
- **Person-level enrichment: deferred.** It is a hard conflict with consent-fail-closed
  and lawful basis; only revisit after a DPIA + lawful-basis sign-off + signed DPA,
  and it must itself be fail-closed.

Provenance: 29 official-domain sources (Meta/WhatsApp, Twilio/SendGrid, Vonage, Bird,
Clearbit), access-dated 2026-08-15. **Caveat (honest):** the execution session's
egress proxy blocked full-page reads of some official docs, so exact rate-card figures
were taken from official-domain search indexing — **a human must confirm live rate
cards before any commercial commitment** (see HUMAN ACTIONS).

## 5. Public presentation (WS-C)

A `/lenses` page (later per-lens pages); a restrained **blur-to-sharp micro-reveal**
that lands one product-authored qualitative sentence — never a number, never live
tester data. Safe JSON-LD only (avoid Product/rating markup); hard Core Web Vitals
guardrails on the reveal. Privacy-first copy enumerates safe claims vs. what must
**never** appear (tester PII, raw signals, internal scoring). Visible copy respects
the no-dash rule.

## 6. Cross-cutting governance (quality gates honoured)

- **Cost**: derived-first, model calls key-gated + token-capped + cached.
- **Security**: all secrets (AI key, provider tokens) from **env only**; AI/lens
  output is UNTRUSTED — sanitised, never auto-executed.
- **Privacy**: PII minimisation (no PII in `lens_signal`), consent fail-closed
  (OPTED_IN only), retention parity + erasure cascade (`store.mjs:463-491`).
- **Provenance**: every claim/signal sourced; official docs cited with access dates.
- **Tenant isolation**: every signal tenant-scoped (`002_omnichannel_tenant.sql`).
- **Honesty**: assumptions marked where private repos were unreadable; no mock result
  presented as real.

## 7. Phased roadmap

| Phase | Scope | Autonomy | Gates |
| --- | --- | --- | --- |
| **0 — Foundation** | Unified lens contract; `lens_signal` table; 2 derived lenses (intent, next-lens-fit); First Five: Clarity of Promise + Reachability; CI negative-controls | Autonomous (code + tests + safe push) once repo access exists | No new provider, no new PII, no external calls |
| **1 — Depth** | Relationship temperature (explainable); remaining First Five lenses; `/lenses` public page; key-gated model lenses | Autonomous within a repo; model key-gated | Cost caps; privacy copy sign-off (HUMAN) |
| **2 — Channels & enrichment** | WhatsApp opt-in channel; SMS/Verify via Twilio IE1; (enrichment only if it clears DPIA) | **Blocked on HUMAN ACTIONS** | Provider accounts, DPAs, DPIA, EU-residency sign-off |

## 8. HUMAN ACTIONS register (real, parked — did not block research)

1. **Private-repo access** for code delivery in `maculis-first-five.` and
   `groeiplatform-website` (implementation of Phase 0/1).
2. **Confirm live provider rate cards** (WhatsApp/Twilio/SendGrid) against the official
   pages — the research flagged proxy-blocked full-page reads.
3. **Provider/business accounts & reviews**: WhatsApp Business Account + Meta app
   review; Twilio/SendGrid/Vonage/Bird paid accounts + EU-residency config.
4. **Legal**: DPAs with chosen processors; DPIA + lawful-basis sign-off for any model
   or provider processing PII outside current bounds; enrichment decision.
5. **Canonical relationship id** spanning the JSON tester store and the Postgres comm
   store (owner decision).
6. **Brand/legal sign-off** on public lens copy + real content (WS-C).

## 9. Definition of Done

- The Next Lenses & Intelligence Strategy was submitted as **one Epic**, decomposed by
  the Orchestrator into 6 routed, dependency-ordered sub-tasks across 3 repos, and
  executed to a consolidated masterplan under the Autonomous Night Run governance.
- Research, analysis and synthesis proceeded autonomously (no ALLOW prompts); only
  genuine external/legal/credential items are parked as HUMAN ACTIONS, and they did
  **not** block the rest of the graph.
- All findings and decisions are stored durably in this directory on the branch.
- **Re-run:** with the canonical prior "Next Lenses" text (or Phase-0 implementation
  approval + repo access), resubmit via the Orchestrator (`submit_maculis_epic` /
  `POST /epics`); it will re-decompose and route. Phase-0 code work is autonomous once
  repo access is granted; Phase-2 remains behind the HUMAN ACTIONS above.
