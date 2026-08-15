# MAC-105 — Data strategy & architecture for the intelligence data

Sub-task: MAC-105 (Relationship) — analysis / read-only. Depends on MAC-102/MAC-103.
Grounded in the live repo with `file:line` provenance. No code changed.

## 1. The real storage topology today

Maculis currently runs **two stores**, deliberately:

| Store | Backing | Holds | Provenance |
| --- | --- | --- | --- |
| Tester/invitation store | Single JSON file, atomic temp+rename | invitations, testers, consent, First Five answers (via token) | `server/store.mjs` (532 lines); retention `:463-491` |
| Communication store | Postgres, multi-tenant | tenant, organization, contact, conversation, message, ai_draft, audit_event, mailbox | `server/comm/db.mjs`, `migrations/001_init.sql`, `002_omnichannel_tenant.sql` |

Intelligence data (lens signals) is an **extension of the Postgres `ai_draft`
surface**, not a third store. This keeps one source of truth per concern and avoids
a competing "signals database".

## 2. Data-strategy principles (derived from the code, not invented)

1. **Relationship is the key, channels are transports.**
   (`002_omnichannel_tenant.sql:3`.) Signals attach to `contact`/`organization`,
   keyed by `tenant_id` + `identity_key` (`002_*.sql:51`), never to a mailbox.
2. **Evidence, not opinion, is stored.** History/events are append-only and
   "never drive status/consent" (`store.mjs:41`). A signal row stores its evidence
   ref (message id / event / fetched-artefact hash + timestamp), so every lens
   output is explainable and reproducible.
3. **Provenance is mandatory.** Mirror `store.mjs` `SOURCES` (`:35-38`): every signal
   records where it came from. No source → `unknown`, never a fabricated one
   (`store.mjs:144`).
4. **Consent gates data use, fail-closed.** `consent_status` OPTED_IN is required
   before any signal informs outreach; lawful basis is recorded
   (`store.mjs:83-93`, `CONSENT_METHODS:33`).
5. **Privacy by design + retention.** A signal may not outlive the record it observes;
   inherit the 12-month retention and PII-free-return discipline
   (`store.mjs:463-491`). Deleting a relationship must cascade its signals.
6. **Tenant isolation is a hard boundary.** Every table is `tenant_id NOT NULL`
   (`002_*.sql:43-46`); every query is tenant-scoped (`outbound.mjs:64`). Signals
   inherit this — no cross-tenant lens.

## 3. Proposed logical model (minimal delta)

Add one table, reuse everything else:

```
lens_signal
  id            uuid pk
  tenant_id     uuid not null            -- hard tenant boundary (002_*)
  subject_type  text  -- 'contact' | 'organization' | 'conversation'
  subject_id    uuid not null
  lens          text  not null           -- registry key (e.g. 'intent', 'next_lens_fit')
  label         text                     -- the signal value (intent, fit, temperature bucket)
  confidence    real                     -- precision-over-recall; null = abstain
  evidence      jsonb not null           -- [{kind, ref, at}] — message id / event / artefact hash
  source        text  not null           -- provenance, like store.mjs SOURCES
  model         text                     -- which producer (mock/anthropic/rule), never mistaken for real
  created_at    timestamptz default now()
```

- Reuses `ai_draft` for the human-facing suggestion; `lens_signal` is the durable,
  auditable evidence trail behind it.
- No PII columns. Names/email/mobile stay in `contact`; the signal references by id.
- Cascade delete on `contact`/`organization` removal (retention parity with
  `store.mjs:481`).

## 4. Cost strategy

- **Rule/derived lenses are free** (intent-from-events, next-lens-fit heuristics) —
  run them first.
- **Model-backed lenses** reuse the existing AI abstraction (`ai/provider.mjs`),
  mock by default, `anthropic` only when a key is set (`provider.mjs:14-21`). Cost is
  bounded by: (a) only running on human-relevant events, (b) `max_tokens` caps
  (`copilot.mjs` uses ~700), (c) caching the last signal per subject to avoid
  recompute. **No per-message model call by default.**
- **Provider/messaging cost** (WhatsApp/Twilio) is a separate, per-message cost —
  see MAC-103. It is a *channel* cost, not a *lens* cost, and is consent-gated.

## 5. Security & privacy

- Secrets (AI key, provider tokens) from **env only**, never in code/logs/prompts
  (`provider.mjs:6,15`; matches orchestrator governance `never_fake`).
- AI/lens output is **UNTRUSTED**: sanitised before display, never auto-executed
  (`provider.mjs:8`, `sanitize.mjs`).
- **GDPR posture:** lawful basis recorded per consent (`store.mjs:87-93`); retention
  enforced (`:470`); right-to-erasure = cascade delete; data minimisation = no PII in
  `lens_signal`. Any **external enrichment** needs a DPA + lawful basis and is a
  HUMAN ACTION (likely out of scope for a consent-fail-closed product — flagged in
  MAC-103).
- **EU data residency:** if model or provider calls leave the EU, that is a
  documented processing decision requiring sign-off (HUMAN ACTION). Prefer EU
  regions/providers where offered (see MAC-103).

## 6. Provenance & auditability

Every lens signal is reproducible: `evidence[]` + `source` + `model` mean an analyst
can answer "why did this fire?" without guessing. This extends the existing
`audit_event` + append-only history discipline (`store.mjs:41`, comm `audit.mjs`) to
the intelligence layer. **No silent signals.**

## 7. Phased architecture rollout

1. **Phase 0 (no new deps):** lens registry + `lens_signal` table; two derived
   lenses (intent, next-lens-fit); human-gated, mock model. Full audit/provenance.
2. **Phase 1:** relationship-temperature aggregate (explainable); reuse `anthropic`
   provider behind the existing abstraction, key-gated, cost-capped.
3. **Phase 2 (needs HUMAN ACTIONS):** any external signal source or new channel
   adapter (WhatsApp/SMS) — gated on provider credentials, DPAs and consent review.

## 8. HUMAN ACTIONS (parked, non-blocking to research)

- Canonical relationship id spanning the JSON tester store and Postgres comm store.
- DPA + lawful-basis + EU-residency sign-off for any model or provider that processes
  PII outside current bounds.
- Provider credentials/business accounts (WhatsApp/Twilio/Meta) — see MAC-103.
