# MAC-102 — Relationship Workspace: intelligence & signal layer

Sub-task: MAC-102 (Relationship) — analysis / read-only. Grounded in the live
`ftrprf-labs/website` code (this repo), with `file:line` provenance. No code changed.

## 1. What already exists (the real foundation)

The Relationship Workspace already has a working intelligence spine. Next Lenses
should extend it, not replace it.

| Capability | Where (provenance) | What it gives us |
| --- | --- | --- |
| **Relationship-centric model** | `server/comm/migrations/002_omnichannel_tenant.sql:3` — "MACULIS KENT MENSEN, NIET MAILBOXEN" | People/organisations are central; channels are transports. A lens attaches to a **relationship**, not a channel. |
| **Omnichannel vocabulary** | `002_omnichannel_tenant.sql:54-61` (`channel_kind`: EMAIL, WHATSAPP, SMS, PHONE, INSTAGRAM, FACEBOOK_MESSENGER, LINKEDIN, WEB, JOURNEY) | Signals can arrive from any transport into one history. Adapters "plug in later". |
| **AI copilot = signal extractor** | `server/comm/ai/copilot.mjs:15` (`INTENTS`), `:55-60` | Every inbound message already yields a structured signal: `summary`, `intent`, `suggested_reply`, `suggested_actions[]`, stored in `ai_draft` (`copilot.mjs:87`). |
| **"Next lens" is already a first-class action** | `server/comm/ai/provider.mjs:63` (`{ type: 'propose_next_lens' }`), also `mark_commercial_opportunity`, `follow_up_task` | The product already models "offer another lens" as a suggested action. Next Lenses formalises the catalogue behind it. |
| **AI never acts on its own** | `server/comm/ai/provider.mjs:8`, `server/comm/outbound.mjs:7` ("AI never sends") | Signals inform; humans decide and send. This is the safety spine Next Lenses must preserve. |
| **Consent is fail-closed with provenance** | `server/store.mjs:28` (`CONSENT`), `:33` (`CONSENT_METHODS`), `:83-93` (consent_source/version/method/note) | Any lens that would drive outreach must gate on OPTED_IN and record lawful basis. |
| **Provenance on every record** | `server/store.mjs:35-38` (`SOURCES`), `:41-64` append-only history that "never drives status/consent" | Signals get a source; history is evidence, not control. Next Lenses inherits this discipline. |
| **Privacy by design / retention** | `server/store.mjs:463-491` (12-month retention, PII-free returns) | A lens may not create a longer-lived shadow copy of PII than the record it observes. |

**Key insight:** the intelligence layer is not a new subsystem to build — it is a
**catalogue + contract** placed over the existing copilot → `ai_draft` →
human-in-the-loop pipeline. A "lens" is a named, evidence-bound signal producer
whose output is a *suggestion*, never an action.

## 2. The signal/lens contract

Every Next Lens declares (mirroring the First Five lens discipline and the copilot's
existing shape):

- **observes** — which inputs it reads (inbound messages, journey events, public
  website signals). Inputs are enumerated; a lens may not read arbitrary data.
- **evidence** — the concrete evidence for each emitted signal (message id, event,
  or fetched public artefact + timestamp). No evidence → no signal (fail-closed).
- **confidence** — precision over recall; a lens abstains rather than guesses.
- **output** — a *suggestion* only: an `intent`/label + optional `suggested_action`
  (e.g. `propose_next_lens`, `follow_up_task`). Never an auto-send, never a status
  or consent change.
- **privacy posture** — PII touched, retention, and whether output is safe to show
  a human vs. safe to ever surface publicly (default: internal only).
- **provenance** — a `source` recorded on every signal, exactly like `store.mjs` `SOURCES`.

This contract is deliberately the same shape as the copilot's existing
`{summary, intent, suggested_actions}` output, so lenses store into the **same
`ai_draft` surface** with an added `lens` label — no new competing store.

## 3. Signal taxonomy for the Relationship Workspace

Signals that are legitimate, evidence-bound, and consent-safe:

1. **Conversational intent** (exists today): question / interest / meeting /
   commercial_opportunity / objection / information / action_requested / no_action
   (`copilot.mjs:15`). This is the anchor signal.
2. **Engagement/journey signals**: derived from real events (message opened/answered,
   journey step reached — `channel_kind='JOURNEY'`). Evidence = the event row.
3. **Relationship temperature**: an aggregate over the above, evidence-bound and
   explainable (which messages/events drove it). No opaque "score".
4. **Next-lens fit**: given the conversation, which additional lens is *appropriate*
   to offer — the formalised backing for `propose_next_lens`.
5. **Consent/lawful-basis state**: not AI-derived — read straight from
   `consent_status`/`consent_method`. A hard gate, surfaced as a signal so the UI
   can fail closed before any outreach suggestion is shown.

## 4. Guardrails (non-negotiable)

- **Suggestion, not action.** A lens output can never send, change status, or change
  consent. It lands in `ai_draft` for a human. (`outbound.mjs:7`, `provider.mjs:8`.)
- **Fail-closed.** No evidence → no signal. Unknown model label → `information`
  (`copilot.mjs:55`). Unknown consent → treated as not-contactable.
- **PII discipline.** Signals never copy names/email/mobile/tokens into logs, prompts
  or public surfaces (`store.mjs` PII-free returns; AI output is UNTRUSTED,
  sanitised — `provider.mjs:8`, `server/comm/sanitize.mjs`).
- **Provenance everywhere.** Every signal carries a `source`; history stays evidence,
  never control (`store.mjs:41`).
- **Tenant isolation.** Every read/write is tenant-scoped (`002_*.sql:22-46`); a lens
  may not cross the tenant boundary.

## 5. Recommendation

Ship Next Lenses as a **lens registry** over the existing copilot pipeline:
a small data-driven catalogue (same philosophy as the orchestrator's own agent
registry) where each lens declares the contract in §2, emits into `ai_draft` with a
`lens` label, and is always human-gated. Start with the two lenses that need **no
new provider and no new PII**: *conversational intent* (already live) and
*next-lens fit* (formalising `propose_next_lens`). Everything else layers on top.

## 6. Open questions / HUMAN ACTIONS

- **Dual store reality:** testers/invitations live in the JSON store
  (`server/store.mjs`); conversations/messages/ai_draft live in Postgres (comm
  layer). A lens that spans both needs an explicit, owner-approved join key — **human
  decision** on the canonical relationship id. (Not blocking research.)
- **Any enrichment lens** (external data about a person/company) is gated on a lawful
  basis and a DPA — a **HUMAN ACTION**, and possibly out of scope for a
  consent-fail-closed product. See MAC-103 provider research + MAC-105 architecture.
