# LIVE E2E evidence — ChatGPT-facing control plane (deployed route + real runner)

Captured from the **deployed** Render instance `srv-da05as3l550s73clul80`
(`https://maculis-orchestrator.onrender.com`), commit `f2ee83d`, instance `w5zr6`,
2026-08-16 ~07:53–07:54 UTC. The prover (`src/liveProbe.mjs`) ran INSIDE the instance
as a real control-plane client against the live HTTP API (loopback to the same deployed
process — real HTTP + auth + real runner), because this authoring session's egress to the
public host is blocked by org policy. This is not a mock and not a scratchpad harness.

## Result: 13 / 13 PASS

```
[live-e2e] {"step":"start","base":"http://127.0.0.1:10000","named_clients":["chatgpt","central","first-five","communication-layer","growbrain"],"using_named":true,"runner":"real"}
[live-e2e] {"step":"public_healthz","status":200}
[live-e2e] {"step":"public_auth_check","status":200,"external_auth":"OK"}          <- public edge authenticates (external callers, e.g. ChatGPT)
[live-e2e] {"test":"A.submit","status":202,"epic_id":"EPIC-1","is_epic":true,"submitted_by":"chatgpt","correlation_id":"live-chatgpt-10000"}
[live-e2e] {"test":"D0_ack_fail_closed_before_terminal","pass":true,"detail":{"status":409,"reason":"not_ready"}}
[live-e2e] {"test":"A.poll","i":5,"status":"IN_PROGRESS","delivery":"not_ready","runner_modes":["real"],"cost_usd":null}
[live-e2e] {"test":"A.poll","i":25,"status":"IN_PROGRESS","runner_modes":["real"],"cost_usd":0.2553}
[live-e2e] {"test":"A_real_runner_executed","pass":true,"detail":{"status":"COMPLETED","runner_modes":["real"],"cost_usd":0.2553,"num_turns":7,"commits":0}}
[live-e2e] {"test":"A_completion_addressed_to_origin","pass":true,"detail":{"correlation_id":"live-chatgpt-10000","submitted_by":"chatgpt","return_kind":"poll"}}
[live-e2e] {"test":"A_ack_delivered","pass":true,"detail":{"status":200,"delivery":"delivered"}}
[live-e2e] {"test":"F_identities_separate","pass":true,"detail":{"ff_submitted_by":"first-five","cl_submitted_by":"communication-layer","ff_epic":"EPIC-2","cl_epic":"EPIC-3"}}
[live-e2e] {"test":"F_correlation_no_cross","pass":true,"detail":{"ff":"live-ff-10000","cl":"live-cl-10000"}}
[live-e2e] {"test":"G_context_firewall_no_leak","pass":true,"detail":{"ff_mentions_cl":false,"cl_mentions_ff":false}}
[live-e2e] {"test":"C_supersession_newer_wins","pass":true,"detail":{"old":"DEC-4","old_status":"superseded","superseded_by":"DEC-5","new":"DEC-5"}}
[live-e2e] {"test":"D_paused_guard_blocks","pass":true,"detail":{"statuses":["BLOCKED"],"tasks":1}}
[live-e2e] {"test":"H_pilot_evidence_routed","pass":true,"detail":{"evidence_id":"EV-1","kind":"PILOT_EVIDENCE","primary":"first_five","excluded":["website","relationship"],"reveal_gate_lowered":false,"provenance_submitted_by":"chatgpt"}}
[live-e2e] {"test":"H_epic3_stays_paused","pass":true,"detail":{"active_pause_scopes":["epic-3","epic-3-live-test"]}}
[live-e2e] {"test":"H_return_with_provenance","pass":true,"detail":{"correlation_id":"live-pilot-10000","envelope_parts":1}}
[live-e2e] {"test":"B_selective_no_broadcast","pass":true,"detail":{"targets":["first_five","relationship"],"excluded":["website"]}}
[live-e2e] {"step":"summary","passed":13,"total":13}
[live-e2e] DONE passed=13/13
```

## Test matrix (brief §26) → live outcome

| Test | What it proves | Live outcome |
|---|---|---|
| **A** | Control plane E2E: chatgpt origin → live Orchestrator → **real runner** → completion → return/ack | PASS — real runner, COMPLETED, cost $0.2553, 7 turns, 0 commits (read-only), delivered on ack. No human copy-paste. |
| **B** | Selective multi-workstream routing, no broadcast | PASS — one input → `first_five`+`relationship` only, `website` excluded |
| **C** | Supersession — newer decision wins | PASS — DEC-4 → `superseded` by DEC-5 |
| **D** | PAUSED guard — derived task can't resume EPIC-3 | PASS — task recorded `BLOCKED` |
| **F** | Origin isolation — completion only to correct origin | PASS — 3 distinct `submitted_by`; correlations never cross; pre-terminal ack refused `409` |
| **G** | Context firewall — no cross-workstream leakage | PASS — FF records don't contain CL text and vice versa |
| **H** | Lens 1 pilot evidence classified + routed + returned | PASS — `PILOT_EVIDENCE` → `first_five`; Communication Layer excluded; Reveal Gate not lowered; EPIC-3 stays paused; returned with provenance |
| **E** | HUMAN ACTION isolation | Covered by design (a human action blocks only its own dependency; §22) + unit tests; not a separate live line |

## Honest notes

- **Loopback vs public edge:** decisive test calls run over loopback (the same deployed
  process). A container calling its OWN public hostname hairpins through the edge, which
  dropped the `Authorization` header on the POST self-call (a self-call artifact). A true
  external caller (ChatGPT) does not hairpin; `public_auth_check` (a real authenticated GET
  to the public URL) returned **200 / external_auth OK**, confirming the public edge
  authenticates. The user's first ChatGPT call is the final external confirmation of POST.
- **Ephemeral store:** the deployed instance is on Render's free plan (no persistent disk),
  so EPIC-1/2/3, DEC-4/5, EV-1 above are test artifacts that reset on the next boot; the
  canonical decisions (EPIC-3 PAUSED + the two Reveal-Gate rules) re-seed on every boot.
- **Cost:** the real-runner E2E cost ≈ $0.26 for this run. The boot-probe flag
  (`MACULIS_BOOT_LIVE_E2E`) is UNSET after capture so it does not re-run/re-charge.
- **Unit regression:** 86 `node --test` tests green (`test/control-plane.test.mjs` covers
  supersession, PAUSED guard, evidence classification/selective routing/firewall,
  workstreams, epic pause/resume, monitoring).
