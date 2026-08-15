# Orchestrator Origin & Return Architecture

Makes a specialist Maculis workstream a **first-class client** of the central
Orchestrator, with provable origin, central execution, structured completion, and
an honest return/handoff — so work is never secretly executed inside whatever chat
happened to submit it.

```
SPECIALIST CONTEXT → SUBMIT → CENTRAL ORCHESTRATOR → DECOMPOSE → ROUTE →
EXECUTE → VERIFY → RESULT → RETURN / HANDOFF TO ORIGIN
```

Machine-readable governance: `config/governance.json` → `origin_and_return` +
`context_isolation`. This document is the human companion and the usage guide.

## 1. The origin envelope (provenance)

Every epic carries a machine-readable origin (`src/origin.mjs`). Sub-tasks inherit
it; the original request is immutable provenance.

| Field | Meaning |
| --- | --- |
| `type` | `specialist-chat` \| `api` \| `mcp` \| `cli` \| `system` \| `unspecified` |
| `id` | opaque origin id (e.g. a thread id) — caller-declared |
| `project` | workstream, e.g. `first-five`, `communication-layer`, `finance` |
| `submitted_by` | **server-authenticated** caller id — anti-forgery, never taken from the body |
| `submitted_at` | server timestamp |
| `correlation_id` | caller-supplied or generated; propagated to every sub-task |
| `return_destination` | `{ kind: poll \| webhook \| mcp \| none, ref? }` |

**Legacy:** records submitted before this envelope (EPIC-1/EPIC-2) read as
`unspecified` / `submitted_by: unknown`. No origin is ever fabricated for them.

## 2. Caller identity (anti-forgery)

The single shared bearer token made callers indistinguishable. Set a named-client
registry so each token resolves to an identity used as `submitted_by`:

```
MACULIS_API_CLIENTS = [{"id":"first-five","token":"…"},{"id":"communication-layer","token":"…"}]
```

The legacy `MACULIS_API_TOKEN` still works (resolves to client `default`). Tokens
are never stored, logged, prompted, or returned. Because `submitted_by` comes from
the authenticated token, a caller cannot claim to be someone else in the body.

## 3. Central execution (no fake orchestration)

An accepted epic **must** go through the central lifecycle:

```
submitEpic → persisted store → dependency scheduler → process → runner →
verification → delivery → terminal state
```

**Authoritative-store guard:** an epic can never be reported or delivered as
complete while the store still holds a sub-task `QUEUED`/`RUNNING`/`TESTING`.
`acknowledgeEpic()` refuses anything that `refreshEpicDelivery()` has not marked
`pending`, so a false COMPLETED can never be acknowledged as delivered.

## 4. Structured completion (retrieval)

`getEpicCompletion(epicId)` derives a compact record from the store — status,
`result_refs`/commits, tests, human actions, timestamps, runner mode, cost/turns,
`correlation_id`, `return_destination`, `completion_delivery_state`. Bulky content
(a masterplan, research) stays a **git artefact referenced** by the record, never
duplicated into the store.

## 5. Return routing — Orchestrator owns completion, origin owns retrieval

Delivery states: `not_ready → pending → delivered` (or `failed`).

- **poll:** origin calls `GET /epics/{id}/completion`, then `POST /epics/{id}/ack`.
- **webhook:** on terminal, a signed `epic.completed` is POSTed to
  `return_destination.ref`; `delivered` only on a **2xx** (proven delivery).
- **mcp:** `get_maculis_epic_completion` + `acknowledge_maculis_epic`.

`completion_delivery_state` becomes `delivered` **only on proven
acknowledgement/2xx**, never merely because a task reached COMPLETED. A generic
webhook cannot inject text into an arbitrary ChatGPT/Claude conversation, so there
is no fake return-to-chat — the origin retrieves and acknowledges.

## 6. Context isolation

Tiers (see `governance.json` → `context_isolation`): **global governance** and
**canonical project knowledge** (the registry) are shared; **epic / task /
conversation-origin** context is scoped. A task prompt carries only global
governance + the canonical registry role + the task's own request/acceptance —
origin id/project/correlation and other workstreams' reasoning are **never**
injected (verified by test).

## 7. Cockpit

`GET /cockpit` (or `get_maculis_cockpit`) returns one compact line per epic:
origin/project, phase (`RECEIVED/ROUTED/RUNNING/HUMAN ACTION/COMPLETED`), task
count, commits, delivery state. Full product analysis belongs in the origin
workstream, not in Orchestra.

## 8. How a specialist workstream submits and retrieves (usage)

**Submit** (HTTP):
```
POST /epics   Authorization: Bearer <your client token>
{ "request": "…the assignment…",
  "origin": { "type":"specialist-chat", "project":"first-five",
              "id":"<thread-id>", "correlation_id":"<your-id>",
              "return_destination": { "kind":"poll" } } }
→ 202 { epic: { epic_id }, origin: {…, submitted_by:"first-five", correlation_id } }
```
Or MCP `submit_maculis_epic` with the same `origin` object.

**Track:** `GET /cockpit` or `GET /epics/{id}`.

**Retrieve + hand off:** poll `GET /epics/{id}/completion` until
`status` is terminal and `completion_delivery_state` is `pending`, read the
`result_refs` (commits / git artefacts), then `POST /epics/{id}/ack`
`{ "correlation_id":"<your-id>" }` → `delivered`. The full content result lives at
the referenced git artefact; continue the substantive work in your specialist
context.

## 9. API / MCP surface added

`POST /epics` (now takes `origin`) · `GET /epics/{id}/completion` ·
`POST /epics/{id}/ack` · `GET /cockpit`. MCP: `get_maculis_epic_completion`,
`acknowledge_maculis_epic`, `get_maculis_cockpit`, and `origin` on
`submit_maculis_epic`. All in `openapi.json`.

## 10. Backward compatibility

Legacy submits (no origin) still work and are marked legacy/unknown. The single
`MACULIS_API_TOKEN` still authenticates (client `default`). Existing epics/tasks
load unchanged; new fields default safely. 72 tests green, including a legacy-submit
and a restart/recovery test.
