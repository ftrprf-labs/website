# Cockpit ↔ Digital Colleagues: integration contract

For the Cockpit development stream. This describes the READ/WRITE surface the Cockpit consumes so a
colleague's work lands in the SAME Maculis reality (Vandaag, Relaties, dossier), never a second
dashboard. The agent domain is built and tested (server/agents/*, migration 006). The Cockpit does
not build a second Cockpit here: it connects to these endpoints.

Additive and feature-flagged: everything is admin-gated and mounted only when the agent domain is
enabled (`AGENTS_ENABLED` + `DATABASE_URL`), independently of the Communication Layer. The agent
schema shares the same Postgres and is applied on boot when either feature is enabled.

Writing rule respected: no stylistic hyphens or dashes in prose.

## The one thing to understand

A colleague never mutates shared relational truth on its own. It produces **findings** (proposals)
with evidence and a confidence, and leaves them as **prepared work**. A human **promotes** a
finding (which creates/links an organization or contact at `relationship_stage='LEAD'` plus a
PROPOSED memory) or **dismisses** it. So the Cockpit shows proposals and asks for a decision; it
does not show agent output as confirmed fact.

## Endpoints the Cockpit reads

### Vandaag: what colleagues discovered / prepared / need a decision on

```
GET /api/agents/cockpit
-> {
  summary: { awaitingDecision, prepared, promoted, touchesKnownRelationship },
  prepared: Finding[]        // status='new', highest confidence first
}
```

### The finding (prepared work) shape

```
Finding = {
  id, workItemId, kind,                 // 'lead_candidate' | 'observation' | ...
  title,                                // e.g. 'Acme BV'
  relevance,                            // WHY it may fit Maculis (human-readable)
  colleague: { slug, name },            // who found it, e.g. { slug:'scout', name:'Scout' }
  organizationId, contactId,            // set when the subject already exists / once promoted
  alreadyKnown: boolean,                // did we already have this relationship?
  epistemicStatus,                      // 'OBSERVATION' | 'INFERENCE' | 'HYPOTHESIS' | 'PROPOSAL'
  confidence,                           // 0..1 or null
  proposedAction: { kind, summary, domain?, person?, approval_required },
  decisionRequired: boolean,            // human decision needed now
  status,                               // 'new' | 'accepted' | 'promoted' | 'dismissed'
  evidence: [ { sourceType, sourceRef, detail, provider } ],   // provenance, clickable to source
  createdAt
}
```

`epistemicStatus`, `confidence` and `evidence` are the honesty contract: show found information,
inference and confidence distinctly, and never render a proposal as a confirmed relationship.

### Relaties / organization dossier: what colleagues contributed here

```
GET /api/agents/organizations/{organizationId}/contributions -> { contributions: Finding[] }
GET /api/agents/contacts/{contactId}/contributions           -> { contributions: Finding[] }
```

### Colleague registry (who exists, what they may do)

```
GET /api/agents/status
-> {
  colleagues: [ { slug, name, kind, role, autonomy, status,
                  mayAutonomously: string[], needsHumanApproval: string[], forbidden: string[] } ],
  discovery: { provider, configured }   // 'internal' deterministic today; external is not configured
}
```

### Work items (a colleague's assignments and their runs)

```
GET  /api/agents/work?type&status&role                 -> { work: WorkItem[] }
GET  /api/agents/work/{id}                              -> { work, runs, findings }
```

## Endpoints the Cockpit writes (human decisions)

```
POST /api/agents/work
     body { objective?, candidates:[{name,domain?,email?,note?}], scope?, run?:true, dedupeKey? }
     -> { workItemId, created, run? }        // create a growth task; run:true runs Scout immediately

POST /api/agents/scout/run    body { workItemId }        -> run summary
POST /api/agents/findings/{id}/promote  body { note? }   -> { ok, organizationId, contactId }  // -> LEAD
POST /api/agents/findings/{id}/dismiss   body { note? }  -> { ok }                              // trains the colleague
```

Promotion and dismissal are the ONLY writes into shared truth from a finding, and both are human
actions on an admin route. The colleague itself can never call them (mandate + autonomy guard).

## What the Cockpit stream should connect next

1. Add a calm "Ontdekken / voorbereid door collega's" strip on Vandaag from `GET /api/agents/cockpit`,
   showing `prepared` findings with their `colleague`, `relevance`, `confidence` and evidence, plus
   Promoveren / Afwijzen actions.
2. On the Relaties / organization dossier, render `contributions` so a colleague's work appears
   inside the relationship, not beside it.
3. Later, once per-user routing exists, filter `GET /api/agents/findings?role=growth` (and by owner)
   so each person sees only the prepared work that needs them (personal attention).

## Collaboration seam (already possible, not yet wired)

The `work_item` + `agent_run` + handoff design lets a later Conversation colleague pick up a promoted
lead and prepare an approach, a human approve, an execution capability send, and a Follow-up colleague
watch the deadline. Nothing in this contract blocks that: a handoff is a reassignment of a work_item
with an evidence-preserving envelope (see `contracts/scout-agent.contract.md`).
