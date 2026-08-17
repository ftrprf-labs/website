# Agent ↔ Cockpit integration contract

How a digital colleague (agent) lands work in the Maculis cockpit. This is the seam between two
domains that share **one reality**: the Cockpit owns the user experience; the agent domain owns
reasoning, evidence and proposals. There is no second database and no sync. An agent references
existing domain objects by id and writes an **attention item**; the cockpit reads, ranks, aggregates
and lets a human decide.

Owner of this contract: the Cockpit chat. Owner of the agent runtime: the agent chat. Keep this file
in step when the shape changes.

## 1. One reality

- The agent domain does **not** copy relations. It references `contact_id`, `organization_id`,
  `conversation_id`, `follow_up_id` that already exist in the shared Postgres.
- A not-yet-created lead is carried as a `proposedRelation` payload and only becomes a real `contact`
  when a human approves it (the cockpit materialises it).
- No external communication is ever triggered by landing work. Outbound stays human-approved and mock.

## 2. What an agent lands: an attention item

Persisted in table `attention_item` (migration `006_attention_items.sql`). The write goes through
`recordWorkItem(tenantId, input)` (`server/comm/work.mjs`) or the HTTP endpoint below. Input shape:

```jsonc
{
  "origin":  { "kind": "AGENT", "key": "growth", "label": "Growth" },   // who produced it (required: key)
  "owner":   { "kind": "HUMAN", "key": "lud" },                          // who owns moving it forward (default HUMAN)
  "type":    "AGENT_PROPOSAL",         // AGENT_FINDING | AGENT_PROPOSAL | APPROVAL_REQUIRED | AGENT_RESULT
  "relation":{ "contactId": "…", "organizationId": "…", "conversationId": "…", "followUpId": "…" }, // any subset
  "proposedRelation": { "name": "Tibo Claes", "org": "Veldwerk", "email": "tibo@veldwerk.be" }, // for a new lead
  "title":   "Mogelijke nieuwe relatie: Tibo Claes",   // human, required
  "reason":  "Profiel sluit aan bij jullie werk.",     // human, optional
  "evidence":{ "source": "…", "observations": ["…", "…"] },   // provenance; why the agent thinks this
  "proposal":{ "summary": "Toevoegen als prospect?", "needs": "approval", "actions": ["create_relation"] },
  "bucket":  "NU",         // optional override; otherwise derived from `needs`
  "priority": 85,          // optional override; otherwise derived from `needs`
  "dedupKey": "lead:tibo@veldwerk.be"   // idempotency key (see §5)
}
```

`proposal.needs` decides how the human meets the work, and sets defaults:

| needs       | meaning                                   | bucket | priority | actions                              |
|-------------|-------------------------------------------|--------|----------|--------------------------------------|
| `approval`  | a colleague waits for your go-ahead       | NU     | 85       | view, approve, edit, reject          |
| `review`    | a colleague prepared something to check   | KLAAR  | 55       | view, take_over, complete, reject    |
| `awareness` | something you should simply know          | RADAR  | 25       | view, complete                       |

The cockpit ranks work in the same stream as derived signals (delivery 100, inbound 90/88, overdue 80,
approval 85, due 70, review 55, upcoming 50, awareness/quiet 25/20) and **aggregates per relation**, so
work on a relation that already has attention folds onto that one card instead of adding a new one.

## 3. HTTP endpoint

```
POST /api/cockpit/agent/work
Headers: x-agent-key: <AGENT_INGEST_KEY>      (or an authenticated admin session)
Body:    the input object from §2
→ 200 { ok: true, id }            (or { ok: true, id, deduped: true })
→ 400 { ok: false, reason }       (bad_type | no_title | no_origin | bad_body)
→ 401 { error }                   (no key and no session)
```

`AGENT_INGEST_KEY` is an environment variable. When unset, ingestion requires an admin session (so an
in-process agent that already has one works without a key). The endpoint only writes; it never sends.

## 4. Resolution lifecycle (human in the loop)

A human resolves work from the cockpit; the agent does not self-resolve.

```
POST /api/cockpit/work/:id/:action     action ∈ view | approve | edit | take_over | reject | complete
```

- `approve` → `status=approved`; if a `proposedRelation` is present and no `contactId`, the cockpit
  creates the relation (deduped by e-mail) and links it. `result.createdContactId` is returned.
- `edit` → the human adjusts `title` / `proposal`; the item stays open for a later approve.
- `take_over` → ownership moves to the human (`owner_kind=HUMAN`); the work stays open.
- `reject` → `status=rejected`. `complete` → `status=done`.
- A resolved item cannot be resolved again (decisions are idempotent).

Every record and resolution is written to `activity` and `audit_event`.

## 5. Idempotency (no agent-spam at the source)

Send a stable `dedupKey` per logical finding. Re-posting the same `(tenant, origin.key, dedupKey)`
while the item is still open **updates in place** instead of stacking. An agent that runs every hour
and re-confirms the same thing therefore never multiplies cards.

## 6. Compression — protect attention

Only record work that deserves a human's attention: an anomaly, a decision, an opportunity, a risk,
work needing approval, or a meaningful result. If an agent runs ten routine checks and everything is
normal, it records **nothing**, or a single compressed `AGENT_RESULT` (e.g. "3 opvolgingen
gecontroleerd, één vraagt jou"). The cockpit will not thin an over-eager stream for you; keep it lean
at the source.

## 7. Do not

- Do not send anything external, confirm appointments, or make promises on the user's behalf.
- Do not create duplicate relations; reference existing ids, or propose via `proposedRelation`.
- Do not present a demonstration/fixture as a real external find. Mark fixtures in `evidence`
  (`evidence.demo = true`, `evidence.source = "demo-fixture"`); preview seed data does this.
- Do not assume a single human user; carry `owner` explicitly.

## 8. Versioning

This contract is additive-first. New `type`s and `needs` values may be introduced; unknown `needs`
falls back to `awareness`. Breaking changes require a bump here and coordination with the agent chat.
