# Lens 2 Prototype Bake-off (analysis and decision)

> STATUS: BAKE-OFF DONE / IMPLEMENTATION PARKED PENDING REAL PILOT EVIDENCE. No production build starts
> from this. Reputation and Reception is the provisional Lens 2 candidate; Finance and Dependency are
> retained; none is production-ready now. The workstream is stopped until an explicit owner instruction.
> See [`STATUS.md`](STATUS.md).

This folder holds the analysis and the decision for the Lens 2 Prototype Bake-off Epic. The runnable
harness that produced the evidence lives in `../../../lens-bakeoff/` (code, case-set, generated
artifacts). Start with the report.

| Document | What it is |
|----------|------------|
| [`00-bakeoff-report.md`](00-bakeoff-report.md) | The Epic deliverable: measured comparison, new weighted ranking (two weightings), the Lens 2 decision with its falsification gate, kill/defer for the others, and the scope for the next production Epic. |
| [`01-reveal-engine-compatibility.md`](01-reveal-engine-compatibility.md) | The central engineering finding: "a new lens is configuration on the engine" holds for Reputation, breaks for Finance, and holds for Dependency only via cross-lens framing. Backed by measured gate suppressions. |
| [`02-evaluation-model.md`](02-evaluation-model.md) | How the bake-off scores reveals, not signals. |
| [`03-wow-and-ux.md`](03-wow-and-ux.md) | The moment of revelation designed per candidate (beats not pages, anti-dashboard). |
| [`04-growbrain-and-relationship-intelligence.md`](04-growbrain-and-relationship-intelligence.md) | The action bridge and the memory model per candidate. |
| [`05-privacy-security.md`](05-privacy-security.md) | Per-candidate privacy and security evaluation and blockers. |
| [`06-falsification-redteam.md`](06-falsification-redteam.md) | The strongest honest case against the ranking. |
| [`epic.md`](epic.md) | The Orchestrator Epic decomposition, workstream status, and governance. |

## The decision, in one paragraph

Lens 2 is Reputation and Reception, confirmed and conditional. The prototype confirms it as the right
lens to ship next: it is the only candidate that is config-only on the current engine, it has instant
time to first value and needs no user data, it is the safest to prototype, and it produces the broadest
genuine cross-surface reveals while staying silent 43 percent of the time. The prototype also exposed its
real weaknesses (highest false-positive risk, lowest evidence strength) and confirmed Finance and
Dependency as the higher-value destinations. The decision carries one falsification gate: a head-to-head
confirmed-new recognition measurement against Finance on real owners, which can flip Lens 2 to Finance.
Finance is deferred to Lens 3 with its engine extension now scoped. Dependency is deferred to Lens 4. No
candidate is killed.
