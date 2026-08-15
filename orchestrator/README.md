# Maculis Development Orchestrator (V1)

One central development layer for the three Maculis domains, so you stop
copy-pasting prompts between ChatGPT and multiple Claude Code chats. You give one
free-text instruction; the orchestrator picks the right domain, repository,
agent, session, tests and permissions, runs a real Claude coding agent, verifies
the result, and keeps GitHub as the code-history source of truth.

```
maculis-dev submit "HEMA toont Nog een lens nog steeds niet. Los het E2E op."
→ Task MAC-101 · Routed to First Five · ftrprf-labs/maculis-first-five. · bug/normal · QUEUED
```

## Domains (agent registry)

| Agent | Repository | Scope |
|-------|-----------|-------|
| **Website** | `ftrprf-labs/groeiplatform-website` | Public site, homepage, WOW, micro reveal, SEO, performance, public conversion |
| **First Five** | `ftrprf-labs/maculis-first-five.` | Journey state machine: First Impression → Reveal → Recognition → Technical Signals → "Nog een lens" → Aandacht → Deepen, token flow |
| **Relationship** | `ftrprf-labs/website` (this repo) | Testerbeheer, contact/organization, Communication Layer, inbox, AI communication (email/WhatsApp/SMS/telephony/social), consent, follow-ups |

New domains are added by appending to `src/registry.mjs` or dropping a JSON file
in `config/agents.d/` — the router is data-driven, not hardcoded.

## Start

Zero setup. Requires Node ≥18 and the `claude` CLI on PATH (for real runs).

```bash
cd orchestrator
node bin/maculis-dev.mjs agents          # list domains
node bin/maculis-dev.mjs submit "..."     # route + queue + run a task
```

By default the runner is in **mock** mode (deterministic, no Claude call, touches
no product repo). To run a **real** Claude Code agent, add a local checkout for
the target repo and switch modes:

```bash
export MACULIS_RUNNER=real
# edit src/config.mjs → runner.checkouts to point each repo at its local clone
```

## Submit / status / stop

```bash
maculis-dev submit "<free text>"     # route, queue and run
maculis-dev route  "<free text>"     # dry-run: show routing only, no task
maculis-dev status                   # list tasks
maculis-dev status MAC-101           # one task in detail
maculis-dev queue                    # queued tasks
maculis-dev actions                  # the ONE central human-action queue
maculis-dev approvals                # pending approvals
maculis-dev approve AP-1 [--reject]  # resolve an approval
maculis-dev logs MAC-101             # audit trail for a task
maculis-dev cancel MAC-101           # cancel safely (keeps branch + logs)
maculis-dev serve                    # start the authenticated HTTP API
```

## HTTP API (machine boundary / ChatGPT-bridge ready)

```bash
export MACULIS_API_TOKEN=$(openssl rand -hex 24)
node bin/maculis-dev.mjs serve        # http://127.0.0.1:4610
```

| Method | Route | Auth |
|--------|-------|------|
| `GET`  | `/healthz` | public |
| `GET`  | `/agents` | bearer |
| `POST` | `/route` `{request}` | bearer |
| `POST` | `/tasks` `{request, priority?, preferred_agent?, deploy_required?}` (+ `Idempotency-Key`) | bearer |
| `GET`  | `/tasks` · `/tasks/:id` | bearer |
| `POST` | `/tasks/:id/cancel` | bearer |
| `GET`  | `/queue` · `/approvals` · `/human-actions` | bearer |
| `POST` | `/approvals/:id` `{approve}` | bearer |

Every mutating route needs `Authorization: Bearer $MACULIS_API_TOKEN`. Without a
token the server binds loopback-only and refuses a non-loopback host
(fail-closed). Lifecycle events are POSTed to `MACULIS_WEBHOOK_URL` (HMAC-signed
with `MACULIS_WEBHOOK_SECRET`) so clients need not poll.

## MCP server

`node mcp/server.mjs` exposes the orchestrator as MCP tools
(`submit_maculis_task`, `get_maculis_task`, `list_maculis_tasks`,
`cancel_maculis_task`, `approve_maculis_action`) over stdio — add it to any
MCP-capable client (Claude Code/Desktop, a future ChatGPT connector).

## Permissions (fewer "Allow?" prompts, no YOLO)

Three profiles compile to Claude Code `--settings` (see `config/profiles/`):

- **normal-engineering** — read/edit/test/lint/typecheck/build + safe git reads run autonomously.
- **delivery** — adds commit + push to a *task* branch.
- **production** — strict; commit/push/merge ask a human.

A second **broker** layer (`src/permissions.mjs`) hard-denies the dangerous
things regardless of profile: force-push/main, history rewrite, reading secret
values, `DROP DATABASE`, deleting production data, `rm -rf`. Risky-but-legitimate
actions (production deploy, DB migration, DNS, billing, provider credentials,
Meta/WhatsApp verification) are routed to the **central human-action queue**, not
auto-run.

## Configure

All via env (see `src/config.mjs`): `MACULIS_DATA_DIR`, `MACULIS_API_TOKEN`,
`MACULIS_API_HOST/PORT`, `MACULIS_RUNNER` (`mock`|`real`), `MACULIS_MAX_TURNS`,
`MACULIS_TIMEOUT_MS`, `MACULIS_MAX_AGENTS`, `MACULIS_WEBHOOK_URL/SECRET`.
Secrets are read from the environment only — never stored, logged, or put in
prompts/PRs/summaries.

## Test

```bash
npm test        # 27 tests: routing, permissions, concurrency, sessions,
                # acceptance, end-to-end slice, API auth
```

## Recover after a crash

State is a single JSON file (`$MACULIS_DATA_DIR/orchestrator.json`, atomic
writes). Restart the process; queued tasks resume on the next `run`/`serve`.
In-flight write locks are visible in `maculis-dev queue`; a stuck lock can be
cleared by cancelling its task (`maculis-dev cancel MAC-xx`).

See `docs/ARCHITECTURE.md` for the design decisions and the migration path from
three manual chats to the orchestrator.
