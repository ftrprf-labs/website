# Architecture decisions & migration path

## Why this shape

The goal is not another product — it is to stop being the postman between ChatGPT
and three Claude Code chats. V1 is deliberately **small, understandable, reliable,
secure, working** (brief §76). No Kubernetes, Kafka, microservices, vector DB, or
dashboard SaaS.

### Runner — Claude Code CLI (headless), not the SDK or GitHub Actions (as primary)

Chosen: the installed **`claude` CLI in `-p/--print` mode with
`--output-format json`**. It is a first-class, supported programmable interface
and gives everything V1 needs with zero extra dependency or API-key plumbing:

- session persistence via `--session-id` / `--resume` (brief §14);
- permission profiles via `--settings` + `--permission-mode` (brief §17);
- cost control via `--max-turns` + our own timeout/heartbeat (brief §51, §53).

The Agent SDK would add a dependency and a second auth path for no V1 benefit.
GitHub Actions is documented as the *always-on* evolution (below), not the V1
primary — building both an SDK runner and an Action runner now would be
duplicate execution architecture for no reason (brief §60). One primary
architecture, chosen.

The runner has a **mock** mode (default) and a **real** mode. Mock is
deterministic and touches no product repo — it powers the tests, the router demo,
and any repo without a local checkout. Real spawns `claude` for a repo's
checkout with the exact argv `buildClaudeArgs()` produces. The wiring is real in
both; only the model call is simulated in mock. This keeps V1 provably correct
without recursively driving live agents against production product repos while
the orchestrator itself is being built (brief §72, §84).

### Persistence — one JSON file, atomic writes

The product already uses a single JSON file as its store (`server/store.mjs`);
we match that house style (brief §77). It is robust for these volumes, has one
clear location, needs zero native deps, and swaps for SQLite/Postgres later
behind the same small `store.mjs` interface. Writes are temp-file + rename so a
crash can't corrupt state.

### Queue & concurrency — persisted FIFO + per-repo write lock

One active **write** task per repository (brief §23). Read-only analysis never
takes a write lock, so it can run in parallel. Cross-repo tasks reserve all their
repos at once in **alphabetical order** so two cross-repo tasks can never
deadlock (brief §24). Locks live in the store (single source of truth) so
`status`/`queue` always show who holds what.

### Sessions — one per domain, with explicit freshness rules

Each domain keeps one persistent Claude Code session for continuity, but the
**repository is the source of truth, not session memory** (brief §15).
`decideSession()` starts a fresh session when the current one is too old, has
handled too many tasks (drift), and always re-checks remote HEAD — a moved HEAD
still resumes (same domain context) but flags the agent to `git fetch` and
re-read before trusting anything.

### Permissions — profiles (Claude Code) + broker (orchestrator)

Two layers. Profiles remove the endless "Allow?" prompts for normal engineering
by pre-allowing safe tools in a `--settings` file. The broker is the hard
backstop that classifies any action as allow / human / deny **before** dispatch,
so even a mis-set profile cannot force-push main or read a secret value. Nothing
disables Claude Code's own safety — this is not YOLO mode (brief §17–§19).

### GitHub as source of truth for code; orchestrator as source of truth for tasks

The orchestrator's task record is canonical task state; GitHub (branch, commit,
PR, checks) is the delivery + audit surface referenced from the task — one source
of truth for code history, one for task state, no competing duplicates
(brief §59). Branch-per-task (`orchestrator/mac-xxx-slug`), never direct-to-main
mutation, no force-push/history-rewrite (brief §21–§22).

### Acceptance — "done" is never automatically COMPLETED

Status transitions are enforced (`tasks.mjs`), and a task only reaches COMPLETED
by passing `verifyAcceptance()`: required checks actually ran and passed, a bug
carries a regression test, e2e where required (not just unit), deploy-required
tasks are live-verified (brief §30, §35). Otherwise → FAILED or WAITING_FOR_HUMAN.

### Governance & decomposition — the Autonomous Night Run framework as data

The working method (repo boundaries, parallel-work rules, quality gates, human
actions, rollback, delivery discipline) is not left implicit in code or, worse, in
a chat transcript. It is a versioned, machine-readable charter:
`config/governance.json`, loaded by `src/governance.mjs`, injected into every task
prompt, and served at `GET /governance` (and the `get_maculis_governance` tool).
That is what makes the framework durable — it survives when a chat ends.

Large assignments handed in from ChatGPT go through `submitEpic()`
(`POST /epics` / `submit_maculis_epic`). `src/decompose.mjs` splits the assignment
on **explicit structure only** (numbered/bulleted steps, lines, ordering words) —
the same "deterministic and explainable, never a guess" philosophy as the router —
routes each sub-task to its owning repo, and computes dependencies: same-repo
sub-tasks are chained, independent repos run in parallel, an ordering word creates
a cross-repo dependency. The scheduler gates on those dependencies (`depsSatisfied`)
and blocks a dependent whose prerequisite failed, so nothing runs on a broken base.
A single, indivisible instruction stays a single task — no manufactured epic.

## Where it runs

V1: on a developer machine or a small always-on worker that has the repo
checkouts, `claude` auth, and the env secrets. That is the simplest secure route
that actually works today (brief §61). The JSON store + CLI + HTTP API + MCP need
nothing else.

**Migration to always-on:** point `MACULIS_DATA_DIR` at a durable disk, run
`serve` under a process manager (or the existing Render pattern this repo already
uses), set `MACULIS_API_TOKEN`, and expose only the authenticated API. Later, the
`real` runner can be swapped for the official Claude Code **GitHub Action** as the
execution backend for CI-triggered tasks without changing routing, storage, or
the API — the runner is the only seam that changes.

## From three chats to the orchestrator (brief §75)

1. **Phase 1 — alongside.** Orchestrator runs next to the existing three chats.
   New tasks can be submitted through it; the chats keep working. Handover is via
   repository state, not chat migration (brief §64).
2. **Phase 2 — default for new work.** New tasks go through `maculis-dev submit`
   / the API / MCP. Sessions persist per domain.
3. **Phase 3 — chats become the exception.** Only unusual, exploratory work uses
   a raw chat.
4. **Phase 4 — orchestrator standard.** ChatGPT calls the authenticated API
   (`submit_task` → `task_id` → `get_task_status`), and you get back a
   summary/tests/commit/deploy/live-verification, or one real decision.

## ChatGPT bridge — ready vs to-do

**Ready now:** an authenticated HTTP API (`POST /tasks`, `GET /tasks/:id`, …) with
bearer auth, idempotency keys, rate limiting, and signed webhooks; and an MCP
server exposing the same operations. Either is a clean, official integration
point.

**To connect ChatGPT for real (human/ops, not code):** expose the API on a stable
authenticated URL (e.g. the Render pattern), mint a token, and register it as a
ChatGPT **custom action / connector** (OpenAPI over the existing routes) or run
the MCP server behind a connector. No unofficial browser/DOM automation — that is
explicitly out of scope (brief §80).
