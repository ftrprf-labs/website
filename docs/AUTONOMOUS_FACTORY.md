# Autonomous Maculis Factory: honest grounding and foundation

Date: 2026-08-15. Repo: `ftrprf-labs/website`.

This document answers the "Autonomous Maculis Factory" brief honestly. The brief
asks to investigate the current Orchestrator, produce a capability matrix, and
build the most important safe and reversible foundation. The first duty is to not
fake completion, so this starts with what is actually true.

## Reality statement

There is no Orchestrator platform in this repository. `ftrprf-labs/website` is the
Testerbeheer / Invitation Manager plus the Communication Layer, a Node app that a
future orchestrator would manage, not the orchestrator itself. It has no task API,
no task state machine, no queue, no runner, no repository registry service, and no
durable task store.

The system that actually orchestrates Maculis engineering today is:

- the owner (Lud) giving direction,
- ChatGPT and Claude Code sessions doing the work,
- the MCP tool surface available to those sessions (GitHub, Render, Gmail, Google
  Drive, and others),
- Render auto deploy on push,
- `docs/BUILD_LOG.md` as the durable decision log.

So the honest "current Orchestrator" is a human plus assistant sessions plus a
tool surface, with `BUILD_LOG.md` as the only durable system of record. Everything
in the brief beyond that is DESIGNED or MISSING, not LIVE. The goal of tonight's
work is to add real, small, reversible foundation that reduces manual handover,
inside this repo, without pretending the larger platform exists.

## Capability matrix (honest)

Status labels: LIVE, PRODUCTION VERIFIED, TESTED SANDBOX, BUILT, DESIGNED,
MISSING, BLOCKED.

| Capability (from the brief)        | Reality today                                                    | Status            |
|------------------------------------|------------------------------------------------------------------|-------------------|
| Managed app (Testerbeheer/Comm)    | Deployed on Render, health checked, PII fail closed              | LIVE              |
| App test suite                     | `npm test`, 29 pass / 7 skip (skip needs `DATABASE_URL`)         | LIVE              |
| Automated quality gate (CI)        | Added `.github/workflows/ci.yml` this session                    | BUILT             |
| Session prep (fresh clone ready)   | Added `.claude` SessionStart hook this session                   | BUILT             |
| Repository registry / routing      | Added `docs/repository-registry.md` this session                 | BUILT             |
| Durable decision log               | `docs/BUILD_LOG.md`, chronological, PII free                     | LIVE              |
| Task API / submit-status-result    | Not present in this repo                                         | MISSING           |
| Task state machine                 | Not present                                                      | MISSING           |
| Task graph / DAG planner           | Not present                                                      | MISSING           |
| Runner (submit to result)          | Human driven Claude Code sessions, not a service                 | MISSING (as svc)  |
| Queue / concurrency / leases       | Not present                                                      | MISSING           |
| Human action protocol (structured) | Recorded as prose in BUILD_LOG, not a structured model           | DESIGNED          |
| Permission model                   | Autonomy contract in the brief; not machine enforced here        | DESIGNED          |
| Secret model                       | `sync:false` / generated in Render, never in git                 | LIVE (per app)    |
| Deployment policy                  | `autoDeploy: true` on the connected branch                       | LIVE              |
| Rollback                           | Render redeploy of previous green commit; additive migrations    | LIVE (manual)     |
| Cost / model routing               | Not tracked in this repo                                         | MISSING           |
| Observability                      | App logs (PII safe); no factory dashboard                        | PARTIAL           |
| ChatGPT bridge / Orchestrator API  | Not present                                                      | MISSING           |

## Gap analysis (top gaps by leverage)

1. No automated test gate before deploy. Render auto deploys every push, but until
   this session nothing ran the tests automatically. Closed by CI (BUILT).
2. Fresh sessions were not runnable. A cloned container fails `npm test` with
   `ERR_MODULE_NOT_FOUND` until `npm install` runs by hand. Closed by the
   SessionStart hook (BUILT).
3. No machine readable repo routing. Agents had to infer which repo owns what.
   Closed by the repository registry (BUILT).
4. The orchestration platform itself does not exist here. Task API, state machine,
   queue, planner, and durable task store are all MISSING. These are not safe to
   fabricate in this app repo. They belong in a dedicated orchestrator repo and
   need an explicit product decision before code. Recorded as a next milestone,
   not silently started.

## What was built this session (real, safe, reversible)

1. Restored a green baseline: installed the declared dependencies (`pg`, `xlsx`)
   that a fresh clone was missing, so `npm test` runs. 29 pass, 7 skip.
2. `.github/workflows/ci.yml`: installs deps with `npm ci` and runs `npm test` on
   push and pull request. This is the quality gate the brief asks for, closing the
   deploy without test gap. Purely additive; inert if Actions is disabled.
3. `.claude/hooks/session-start.sh` plus `.claude/settings.json`: a web only,
   idempotent SessionStart hook that runs `npm install` so future web sessions are
   test ready immediately. Validated: hook exits 0, `pg` present, the previously
   failing test passes.
4. `docs/repository-registry.md`: routing table with verified fields for this repo
   and build log recorded fields for the other two, unverifiable fields marked.

Every change is additive and reversible. No production logic changed. No deploy
was triggered by this work beyond the normal auto deploy on the eventual push.

## Security note recorded, not silently changed

`npm audit` reports a high severity advisory in `xlsx` 0.18.5 (prototype pollution
and ReDoS) with no fix available on npm. SheetJS ships fixes on its own CDN, not
npm. Changing the dependency source is a supply chain decision with real risk, so
it is recorded here for a human decision rather than changed autonomously. The
risk is bounded: `xlsx` parses admin uploaded tester import files, not arbitrary
public input, and parsing happens behind the admin gate.

## Human friction map (from BUILD_LOG residual actions)

Points where the owner is still the message bus, and whether each can be reduced:

- Communication Layer activation: link Postgres to `DATABASE_URL` and set
  `COMM_LAYER_ENABLED=1` in Render. HUMAN (touches production config and a paid
  resource). Reducible only after a product decision to turn it on.
- Resend inbound setup: MX record, inbound webhook, `RESEND_WEBHOOK_SECRET`,
  recipient on `COMM_MAILBOXES`. HUMAN (DNS plus secret). DNS is a hard gate.
- Secret entry in Render (`ADMIN_PASSWORD`, mail keys, intake key). HUMAN by
  design (secrets never leave the dashboard).
- Provider accounts for WhatsApp, SMS, phone. HUMAN (external accounts, money).
  These block only their own channels, not other engineering.

Nothing in this list is safe to automate away without crossing a hard human gate.
The reducible friction was in engineering setup (fresh session readiness, test
gate, repo routing), which this session addressed.

## Next autonomy milestones (proposed, need owner decision before code)

1. Decide whether the Orchestrator is a separate repo. If yes, scope a minimal
   task API (submit, get, list, cancel) with fail closed auth and a durable store,
   in its own repo. Do not grow it inside this app.
2. Promote the human action protocol from prose to a small structured record in
   BUILD_LOG or a sidecar file, so parked blockers are trackable.
3. Add a lightweight cost and model note to future BUILD_LOG entries so spend is
   visible without a platform.

These are proposals. They are not started here because they need a product
decision, per the brief's rule that a missing product decision produces a proposal
rather than a silent direction.
