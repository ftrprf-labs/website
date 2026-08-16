# Maculis Orchestrator — ChatGPT Control Plane

The Orchestrator is the central routing, status, decision, context and return layer
for Maculis engineering, with **ChatGPT as the primary control plane**. This document
is the durable companion to `config/governance.json` (`control_plane`, `decision_ledger`)
and `docs/ORIGIN_AND_RETURN.md`.

## The architecture

```
Ludwig → ChatGPT → Maculis Orchestrator → specialist workstream / runner / repository
                        ↑                                  │
                        └──────── structured return ───────┘
```

- **ChatGPT** is the cockpit. Ludwig tells it once; he does not choose which chat to paste into.
- **Orchestrator** is traffic control: classify → test against decisions → route selectively → execute → verify → return with provenance.
- **Workstreams** are durable specialist destinations (chat-independent).
- **Runners / agents** execute.
- **Repositories, evidence, decisions, structured records** are the durable memory. Chats are interfaces, never the system of record.

**Tell it once.** For any input, ChatGPT calls one operation; the Orchestrator decides
which durable workstream it touches and delivers only the minimal relevant context there.

## What ChatGPT can do (operation set)

Every operation is exposed over **OpenAPI** (`GET /openapi.json`, for a Custom GPT Action)
and over **MCP** (`mcp/server.mjs`). All mutating calls require the bearer token; the caller
identity resolves to `submitted_by` (anti-forgery — the body cannot set it).

| # | Capability | HTTP | MCP tool |
|---|---|---|---|
| 1 | Query workstreams | `GET /workstreams` | `list_maculis_workstreams` |
| 2 | Current status / monitoring | `GET /status`, `GET /cockpit` | `get_maculis_status`, `get_maculis_cockpit` |
| 3 | Submit an assignment (auto-routed) | `POST /tasks` | `submit_maculis_task` |
| 4 | Submit an Epic (decomposed) | `POST /epics` | `submit_maculis_epic` |
| 5 | Consult an Epic/task | `GET /epics/{id}`, `GET /tasks/{id}` | `get_maculis_epic`, `get_maculis_task` |
| 6 | Record a decision | `POST /decisions` | `record_maculis_decision` |
| 7 | Supersede a decision | `POST /decisions/{id}/supersede` | `supersede_maculis_decision` |
| 8 | Pause / resume an Epic | `POST /epics/{id}/pause` · `/resume` | `pause_maculis_epic` · `resume_maculis_epic` |
| 9 | Fetch completions | `GET /epics/{id}/completion` | `get_maculis_epic_completion` |
| 10 | Fetch HUMAN ACTIONS | `GET /human-actions` | `list_maculis_human_actions` |
| 11 | Send acknowledgements | `POST /epics/{id}/ack` | `acknowledge_maculis_epic` |
| 12 | Submit cross-workstream evidence | `POST /evidence` | `submit_maculis_evidence` |
| 13 | See routing result | `POST /decompose`, `POST /route` | `plan_maculis_assignment` |
| 14 | See provenance | in every completion/evidence record (`origin`, `correlation_id`) | — |
| 15 | See *why* it routed there | `routing_reason` / evidence `classification.why` | — |

## How results come back (no fake push)

There is **no asynchronous push** into an existing ChatGPT conversation in the available
technology, so the Orchestrator does not fake one. The return route is:

1. ChatGPT submits (`POST /epics`) with an `origin` (project, correlation_id, return_destination).
2. The Orchestrator stores origin + correlation, executes autonomously (real runner), and stores a **structured completion** derived from the store.
3. ChatGPT **retrieves** the completion (`GET /epics/{id}/completion`) — status, commits, result refs, tests, human actions, cost/turns, delivery state.
4. ChatGPT **acknowledges** (`POST /epics/{id}/ack` with the correlation_id) → delivery becomes `delivered`. Acknowledgement is fail-closed: an epic that is not yet terminal cannot be acknowledged (no false COMPLETED, no delivered-while-running).

A signed completion **webhook** is available when a caller sets `return_destination.kind=webhook`,
but the default and always-available path is poll + ack.

## Provenance is never destroyed

When several workstreams produce results, they are returned as separate records, each labelled
with `workstream / type / timestamp / origin / correlation_id`. A summary must not flatten them into
one sourceless text. Evidence records keep a `context_envelope` with per-part provenance.

## Selective routing + context firewall

Default is **ISOLATED**; cross-workstream context is **explicitly routed**. New information is
classified, tested against the decision ledger, coupled to one *or more* workstreams (never a
broadcast), and given a **minimal context envelope** carrying only the minimal relevant information
with origin preserved. Task prompts carry only global governance + the canonical registry role + the
task's own request — never origin/correlation or another workstream's reasoning (verified in
`buildPrompt`; `test/control-plane.test.mjs` + `test/origin.test.mjs`).

## Decision ledger + supersession + the EPIC-3 PAUSED guard

One canonical ledger (`src/decisions.mjs`). A `DECISION` carries `decision_id, scope, decision,
timestamp, origin, rationale, status, supersedes, superseded_by` (+ `effect`, `guard`). **Newer
explicit decisions win**; supersession is **explicit only** — a PAUSE is never lifted implicitly.

Seeded on every boot (idempotent, survives an ephemeral store):

- **EPIC-3 / next Lens = PAUSED** pending Lens 1 pilot evidence + explicit Ludwig GO (`effect: pause`).
- Never weaken a gate to avoid SILENCE (`effect: policy`).
- SILENCE at Reveal ≠ SILENCE of the whole journey (`effect: policy`).

The **PAUSED guard**: a derived task/epic that tries to *resume* EPIC-3 / start the next Lens is
recorded **BLOCKED with a human action**, never silently executed. Recording pilot *evidence* about
Lens 1 is allowed and never lifts the pause. Resuming a paused epic is refused while an active PAUSED
decision covers its scope, unless an explicit `override` (GO).

## Monitoring

`GET /status` is the traffic tower: task states, epic phases (RUNNING / WAITING / PAUSED / BLOCKED /
HUMAN ACTION / COMPLETED / FAILED), active + superseded decisions, cross-workstream conflicts (two
epics on one repo), and undelivered completions. `GET /cockpit` is one compact line per epic. No bulky
content; a traffic tower, not a project-management platform.

## Durable workstream identities (chat-independent)

`src/workstreams.mjs` derives workstream identities from the **existing registry** (no second
registry): `workstream_id, name, domain, scope, owning_repo, status, active_epics, paused_scopes,
client_bindings, return_capability`. Named API clients bind to workstreams:

| Client id | Binds to | Meaning |
|---|---|---|
| `chatgpt` | all (`*`) | ChatGPT control plane (primary cockpit) |
| `central` | all (`*`) | Central / general workstream |
| `first-five` | `first_five` | First Five / Lens |
| `communication-layer` | `relationship` | Testerbeheer / Communication Layer |
| `growbrain` | `website` | Maculis Website / GrowBrain |

## Existing specialist chats — reachability (honest)

The named specialist interfaces (Communication Layer, Future Cockpit Architecture, Next Lenses,
Lead Engineering / Night Run, technical signals in First Five, post-reveal flow, Invitation Manager
MVP, …) are **human UI conversations, not directly API-addressable execution endpoints**. They are
inventoried and classified to a workstream, but their transcripts are **not** imported into global
Orchestrator context. Execution is made **chat-independent** via: workstream identity + durable repo
state + task envelope + real runner + structured completion. That is architecturally stronger than
driving a chat: it survives the chat ending. Where durable repo documentation exists it takes
precedence over conversational reconstruction.

## Known limitations (stated plainly)

- **No async push to ChatGPT** — return is retrieval (poll/ack) through the same control plane.
- **Connecting ChatGPT is a HUMAN ACTION** — a Custom GPT Action must be created and authenticated in
  the ChatGPT account (see the hand-off in the session report). Claude cannot configure a ChatGPT account.
- **Deployed instance is on Render's free plan** — it cold-starts and its JSON store is ephemeral
  (no persistent disk). Durable truth lives in git + captured logs; the seed decisions re-install on
  every boot. A paid plan + disk is a cost decision for Ludwig.
