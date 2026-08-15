# Origin & Return — E2E evidence

Durable evidence for the Origin & Return architecture, captured from the central
store, the audit trail, and real-runner execution (not chat text). Reproduce with
the guarded harnesses; both were run on baseline + this change set (72 tests green).

## E2E #1 — single specialist origin, REAL runner (all 11 required steps)

Submitted a 2-step read-only analysis epic from a simulated `first-five` origin
against the public `ftrprf-labs/website` repo, `runner.mode=real`.

| # | Requirement | Evidence (from store / audit / runner) |
| --- | --- | --- |
| 1 | received centrally | `submitEpic` → `EPIC-1` persisted |
| 2 | origin registered | `origin = {type:specialist-chat, id:ff-thread-1, project:first-five, submitted_by:first-five-client, correlation_id:e1ea681a-…, return_destination:{kind:poll}}` |
| 3 | decomposed | 2 sub-tasks (MAC-101, MAC-102), both routed to `relationship` |
| 4 | centrally persisted | task records in the store, `epic_id=EPIC-1`, correlation inherited |
| 5 | **real runner executed** | audit `workspace_provisioned` (real clone) ×2, `session_decision` (new, then resume), `task_completed mode:real` ×2; `runner_modes:["real"]`; `cost_usd≈0.55–1.1`, `turns=3` |
| 6 | verification | audit `acceptance_check accepted:true` for MAC-101 and MAC-102 |
| 7 | terminal state | both `COMPLETED`; epic rollup `COMPLETED` |
| 8 | structured result | `getEpicCompletion` → status/commits/tests/timestamps/runner_modes/cost |
| 9 | return destination retained | `return_destination:{kind:poll}`, `correlation_id` preserved |
| 10 | completion available | audit `epic_completion_ready` → `completion_delivery_state:pending` |
| 11 | delivered only after ack | `acknowledgeEpic(correlationId)` → `ok:true`, state `delivered`, `delivery.acknowledged_at` set; audit `epic_delivered` |

Guard proven en-passant: an earlier run where step 2 landed in routing-review made
the epic `WAITING_FOR_HUMAN`; `acknowledgeEpic` correctly refused (`not_ready`) — a
false COMPLETED can never be delivered.

## E2E #2 — two specialist origins, isolation

`first-five` (corr-FF) and `communication-layer` (corr-CL) each submitted a small
2-step epic (mock runner; isolation is runner-independent, and #1 already proved the
real runner).

| Check | Result |
| --- | --- |
| separate epics | `EPIC-1` (first-five) and `EPIC-2` (communication-layer) |
| correlation IDs never cross | `true` (FF tasks all `corr-FF`, CL tasks all `corr-CL`) |
| no epic-id bleed | `true` (each task keeps its own `epic_id`) |
| context isolation | FF prompt leaks CL context: `false`; CL prompt leaks FF context: `false` |
| cockpit = two workstreams | `EPIC-1 first-five COMPLETED` · `EPIC-2 communication-layer COMPLETED`, distinct correlation + delivery |

## Reproduce

The harness scripts live in the session scratchpad (throwaway, not product code).
The permanent regression coverage is `test/origin.test.mjs` (15 tests: origin
envelope, inheritance, correlation propagation, caller identity, central completion,
no-false-COMPLETED, delivery pending/ack, webhook signing+failed delivery, context
isolation, no secret leakage, restart/recovery, idempotency).
