# Scout Agent: Interfaces & Contracts

DESIGN ONLY. These are the contracts a future "GO BUILD FIRST AGENT" session implements.
Nothing here is wired into live code. Types are described in JSDoc/TypeScript-ish shorthand.
All shapes are tenant-scoped and follow the existing Communication Layer idioms
(`server/comm/db.mjs` `query`/`withTransaction`, best-effort `audit`/`activity`).

Writing rule respected: no stylistic hyphens or dashes in prose.

---

## 1. Actor

```ts
type ActorKind = 'HUMAN' | 'AGENT' | 'SYSTEM';

interface Actor {
  id: string;
  tenantId: string;
  kind: ActorKind;
  slug: string;              // 'scout', 'system'
  displayName: string;       // 'Scout'
  role?: string;             // 'business_development'
  status: 'active' | 'paused' | 'retired';
  humanOwnerActorId?: string;// responsible human (accountability, §4)
  appUserId?: string;        // set when a HUMAN actor maps to a login
}
```

## 2. Work item

```ts
type WorkStatus =
  | 'proposed' | 'assigned' | 'in_progress'
  | 'awaiting_human' | 'done' | 'superseded' | 'cancelled';

interface WorkItem {
  id: string;
  tenantId: string;
  type: 'qualify_candidate' | 'research' | 'prepare' | 'escalation';
  objective: string;                 // human-readable why
  createdBy?: string;                // actor id
  assignedTo?: string;               // actor id, null = unassigned
  assignedRole?: string;             // routing hint when no person yet
  organizationId?: string;
  contactId?: string;
  conversationId?: string;
  sourceSignalRefs: SignalRef[];     // provenance of the trigger
  status: WorkStatus;
  priority?: string;                 // deterministic hint, never an invented AI score
  mandateRequired?: string;
  approvalRequired: boolean;         // human approval before completion
  input: Record<string, unknown>;    // provenance of what was used
  output: Record<string, unknown>;   // candidate card, briefing, ...
  dedupeKey?: string;                // idempotency
  createdAt: string; dueAt?: string; completedAt?: string;
}

interface SignalRef { type: 'message'|'conversation'|'activity'|'candidate'|'follow_up'; id: string; }
```

## 3. Agent run

```ts
interface AgentRun {
  id: string;
  tenantId: string;
  workItemId?: string;
  actorId: string;
  trigger: 'inbound'|'pass_the_lens'|'scheduled'|'handoff'|'human'|'simulate';
  status: 'running'|'succeeded'|'failed'|'superseded';
  inputRef: Record<string, unknown>;
  outputRef: Record<string, unknown>;
  capabilityCalls: CapabilityCall[];
  tokens?: number; cost?: number; error?: string;
  dedupeKey?: string;
  startedAt: string; endedAt?: string;
}

interface CapabilityCall { capability: string; argsRef?: unknown; resultRef?: unknown; at: string; }
```

## 4. Epistemic claim (provenance, §12)

Every agent claim carries an explicit epistemic status. Passing a claim between colleagues
NEVER upgrades it silently. Only a human confirmation lifts something to FACT/HUMAN_CONFIRMATION.

```ts
type EpistemicStatus =
  | 'FACT' | 'OBSERVATION' | 'INFERENCE' | 'HYPOTHESIS'
  | 'PROPOSAL' | 'PREPARED_ACTION' | 'HUMAN_CONFIRMATION' | 'EXECUTED_ACTION';

interface Claim {
  statement: string;
  epistemic: EpistemicStatus;
  evidenceRefs: SignalRef[];         // where it came from (clickable to source)
  confidence?: 'low' | 'medium' | 'high';
}
```

When a claim becomes memory it maps onto the existing `relationship_memory`:
`source='scout'`, `confidence='proposed'` (until `confirmMemory`), `source_ref` = first evidenceRef.

## 5. Mandate policy (config, §11)

Mandate is config, not a table. Enforced by one guard, audited on denial.

```ts
interface Mandate {
  read: string[];          // resources readable (tenant-scoped)
  write: string[];         // resources writable
  forbid: string[];        // hard-forbidden actions
  approvalRequired: string[];  // actions that always need a human
  escalateWhen: string[];  // conditions that force escalation
}

const MANDATE: Record<string, Mandate> = {
  scout: {
    read:  ['organization', 'contact', 'channel_identity', 'activity'],
    write: ['work_item', 'proposed_memory'],
    forbid:['send', 'promote', 'set_consent', 'read_privacy', 'merge_identity', 'external_web'],
    approvalRequired: ['promote'],
    escalateWhen: ['identity_ambiguous', 'low_confidence', 'privacy_sensitive', 'reputation_risk'],
  },
};

// throws MandateError and writes audit_event('mandate_denied') on violation.
function assertMandate(actor: Actor, action: string, ctx?: unknown): void;
```

## 6. Handoff envelope (§13)

```ts
interface Handoff {
  workItemId: string;
  fromActor: string;
  toActor?: string;
  toRole?: string;
  reason: string;
  epistemicPayload: Claim[];         // status preserved across the hop
  requestedCapability: string;
  depth: number;                     // hop counter; above threshold -> escalate to human
}
```

Bounded: depth-limited, audited (`work_handoff`), idempotent (`dedupeKey`), capability-checked.

## 7. Scout runner + capabilities

```ts
// runner: sync in S1 (deterministic). Idempotent on dedupeKey.
interface ScoutSignal {
  kind: 'unknown_inbound' | 'pass_the_lens' | 'new_org_from_inbound' | 'simulate';
  ref: SignalRef;                    // the controlled internal source
  hint?: { name?: string; email?: string; company?: string; };
}

function runScout(args: { tenantId: string; signal: ScoutSignal; trigger: AgentRun['trigger'] })
  : Promise<{ ok: boolean; workItemId?: string; escalated?: boolean; reason?: string }>;

// capabilities (deterministic mock mode first; provider-backed reasoning optional)
function qualifyCandidate(ctx): Promise<{ claims: Claim[]; relevance: string }>;
function checkExistence(ctx): Promise<{ exists: boolean; contactId?: string; organizationId?: string; ambiguous?: {contactId:string}[] }>;
function findNetworkPath(ctx): Promise<{ path?: { viaContactId: string; ownerActorId?: string; note: string } }>; // S2
```

Rules enforced in the runner: read/write only per `MANDATE.scout`; never send; never promote;
never read privacy conversations; identity ambiguity always escalates (never guesses).

## 8. HTTP route surface (mirror of `handleComm`)

`handleAgents(req, res, { pathname, method, isAuthed })`, mounted in `handleApi` next to
`handleComm`, behind the same admin gate and `commEnabled()` gate.

```
GET  /api/agents/status              registry + mandate + mock/live status        (admin)
GET  /api/agents/work                ?assigned&role&status&type                    (admin)
GET  /api/agents/work/{uuid}         work item + agent_runs + provenance           (admin)
POST /api/agents/work/{uuid}/promote candidate -> lead (human confirmation)        (admin, audited)
POST /api/agents/work/{uuid}/dismiss candidate rejected with reason (trains Scout) (admin, audited)
POST /api/agents/scout/run           run Scout on a controlled signal (S1)         (admin)
GET  /api/agents/escalations         open escalations for the current role         (admin)
```

No public routes. No send. No external calls in S1.

## 9. Personal attention routing (§15, lands in S3)

```ts
interface AttentionSignal {
  source: 'conversation' | 'work_item' | 'escalation' | 'follow_up';
  id: string;
  organizationId?: string; contactId?: string;
}
interface Routed { relevant: boolean; reasons: string[]; priority: number; }

function routeAttention(actor: Actor, signal: AttentionSignal): Promise<Routed>;
```

Deterministic and explainable: `reasons[]` names each matching factor (ownership, assignment,
relationship_owner, team_membership, role, expertise, visibility). Priority stays deterministic
(urgency then oldest waiting), never an invented AI ranking. This is the actor-aware extension of
the Slice 5 orchestration engine, not a reimplementation.
