# EPIC-2 WS-9 (MAC-116) — Product architecture & business model — analysis/read-only

Grounded in the real repo and EPIC-1's data architecture. No code changed. This
workstream answers two questions the portfolio raises: **should "lens" be a real
platform primitive**, and **how does the lens portfolio work commercially** without
prematurely monetising the pilot.

## Part A — Is "lens" a platform primitive?

**Yes, but as a thin contract, not a big generic framework.** The repo already shows
the pattern that works: the orchestrator's own agent registry is *data, not
branching* (`orchestrator/src/registry.mjs`), and the comm copilot already emits a
lens-shaped output (`server/comm/ai/provider.mjs:63` `propose_next_lens`). We
formalise the *contract* every lens honours; we do **not** build a speculative
engine ahead of having 2–3 real lenses.

> Anti-over-engineering rule (from the assignment): build the primitive when the
> second and third lenses actually need it — not because it is architecturally
> elegant. Phase 0 ships the contract + one table; the generic runtime earns its
> place only once Lens #2 and #3 are real.

### The Lens contract (what every lens declares)

A small, declarative manifest — the same discipline as EPIC-1's First Five lens
contract and the orchestrator registry:

| Field | Meaning | Grounding |
| --- | --- | --- |
| `id` / `name` / `category` | registry key + human name + portfolio category | `registry.mjs` pattern |
| `observes` | enumerated inputs only (public surface, uploads, optional integrations) | EPIC-1 lens contract |
| `data_requirements` | what each mode needs: zero / import / connected / longitudinal | WS-6 ladder |
| `evidence` | concrete evidence per claim (ref + timestamp); no evidence → silent | `store.mjs` history `:41` |
| `confidence` | precision-over-recall; abstain rather than guess | EPIC-1 |
| `freshness` | how current the evidence is; a lens states its own staleness | new (longitudinal) |
| `consent` | required consent state before any output that drives outreach | `store.mjs:28` CONSENT |
| `privacy_posture` | PII touched; internal-only vs shareable vs public-safe | EPIC-1 |
| `reveal` | how it lands: one grounded qualitative sentence, never a score | WS-7 |
| `meaningful_end` | how the lens closes with meaning, not a dashboard | First Five |
| `next_lens_triggers` | which follow-up lens this can propose, and when | `propose_next_lens` |
| `growbrain_handoff` | trigger + context + consent carried into GrowBrain | WS-8 |
| `evaluation` | negative controls + a check the lens stays silent without evidence | EPIC-1 CI controls |
| `longitudinal` | how two runs compare over time (change is itself an insight) | new |

### The Signal contract (durable evidence)

One table, extending EPIC-1's proposal — no competing store:

```
lens_signal (tenant-scoped, PII-free)
  id, tenant_id, subject_type, subject_id,
  lens, label, confidence, evidence jsonb, source, model,
  freshness_at, created_at
```

- Reuses `ai_draft` for the human-facing suggestion; `lens_signal` is the auditable
  evidence trail (EPIC-1 MAC-105).
- **Longitudinal comparison** is just two `lens_signal` rows for the same subject at
  different `created_at` — "what changed since last time" needs no new subsystem.
- Tenant isolation, provenance (`source`), and retention/erasure parity are inherited
  from the existing schema (`002_omnichannel_tenant.sql`, `store.mjs:463-491`).

### What NOT to build yet

- No generic "lens plugin marketplace", no dynamic sandboxed lens runtime, no
  rules-DSL. These are Phase-2+ *if* the portfolio proves demand.
- No cross-tenant "benchmark" data product until there is a lawful basis and enough
  volume — and even then, only aggregated and consented.

## Part B — Business model for the lens portfolio

Design principle from the assignment: **do not prematurely monetise the current
pilot.** Insight first; money later; every paid step must follow a felt "I need to
understand this" moment (the GrowBrain trigger, WS-8).

### The value ladder (mirrors the data ladder, WS-6)

| Tier | What the entrepreneur gets | Monetisation | Timing |
| --- | --- | --- | --- |
| **First Five (free)** | The signature magical lens; zero setup | Free forever — the front door | Now (pilot) |
| **Earned next lenses** | 1–2 additional lenses, zero-integration | Free / earned (e.g. by Pass the Lens or a light profile) | Phase 0–1 |
| **Premium lens** | A deeper lens (e.g. Finance/Marketing connected mode) | One-off or low subscription, only after connected value is shown | Phase 1–2 |
| **Connected intelligence** | Multiple lenses + longitudinal tracking | Subscription | Phase 2 |
| **GrowBrain** | "understand why + what to do" — guided depth | The core paid product; the lenses are its funnel | Phase 2+ |

### Distribution beyond direct

- **Pass the Lens** is the organic growth engine — a lens is shareable, so each
  insight is a soft invitation. Free by design; it feeds the funnel.
- **B2B / partner / advisor channel:** accountants, agencies and advisors could run
  lenses *for* their clients (a Finance Lens is a natural accountant tool; a Marketing
  Lens a natural agency tool). This is a credible B2B2C wedge — but it is a **Phase-2
  commercial decision** with its own consent/data-processing model, flagged as a
  HUMAN ACTION (partner terms, DPAs).

### What to avoid commercially (critical stance)

- Do not gate First Five or make the pilot feel like a paywalled demo — it is the
  trust anchor.
- Do not sell data or build a benchmark product on tester data without explicit,
  aggregated, consented lawful basis (privacy-first is the brand).
- Do not price connected lenses before the connected mode demonstrably out-performs
  the zero-integration mode — otherwise we sell setup effort, not insight.

## HUMAN ACTIONS (parked)

- Decision to make "lens" a platform primitive is an **owner/architecture sign-off**
  once Lens #2/#3 are chosen (this workstream recommends: yes, thin contract now).
- Partner/advisor distribution model + its DPAs and consent design (Phase 2).
- Any longitudinal/benchmark data use → lawful-basis + DPIA sign-off.
