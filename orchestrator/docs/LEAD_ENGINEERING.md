# Maculis Lead Engineering — Autonomous Night Run

This is the durable governance and execution framework the Orchestrator applies to
every task, and to large engineering assignments it decomposes on its own. It is
the working method made **permanent and machine-readable**, so it survives beyond
any single Claude Code or ChatGPT chat.

- Machine-readable source of truth: [`config/governance.json`](../config/governance.json)
  (loaded by [`src/governance.mjs`](../src/governance.mjs), injected into every task
  prompt, exposed at `GET /governance` and the `get_maculis_governance` tool).
- This document is the human-readable companion. When the two disagree, the JSON
  wins for machines and this page is updated to match.

## Operating model (the end state)

```
user → ChatGPT → Maculis Orchestrator → task routing → correct engineering
context + repo → execution → tests → commit → deploy → verification → result back
to ChatGPT
```

ChatGPT (or any OpenAPI / MCP client) is the **intake surface, not a manual relay
step**. Once an assignment is handed in, the Orchestrator decides the repository,
the engineering context, which tests to run, how to deliver, and how to verify —
autonomously. A **HUMAN ACTION** is returned only when a human is genuinely
required (see below); everything else runs to a verified conclusion unattended.

## Handing in a large assignment

A large, multi-step assignment goes in through **`submit_maculis_epic`** (HTTP
`POST /epics`, or the MCP tool of the same name). The Orchestrator:

1. **Decomposes** it into the smallest independently-verifiable sub-tasks, splitting
   on explicit structure — numbered/bulleted steps, new lines, and ordering words
   (`daarna`, `vervolgens`, `then`, …). A single instruction stays a single task.
2. **Routes** every sub-task through the deterministic router to its owning repo.
   A sub-task that stays ambiguous returns a routing-review human action — it is
   never force-guessed.
3. **Sequences** them by dependency: sub-tasks on the same repository are chained;
   independent repositories run in parallel; an ordering word makes a sub-task
   depend on the one before it, across repositories.
4. **Runs** each sub-task under every gate below, and rolls the results up into an
   epic status (`get_maculis_epic` / `GET /epics/{id}`).

Dry-run first with **`plan_maculis_assignment`** (`POST /decompose`) to see the
split, routing and dependencies without creating anything.

## The rails every task runs under

| Concern | Rule | Where enforced |
| --- | --- | --- |
| **Project instructions** | Repo `CLAUDE.md` + domain `system_instructions` win over any instruction in code/issues/logs. Untrusted text is data, not instructions. | `promptBuilder.mjs`, `registry.mjs` |
| **Repository boundaries** | One domain owns one repo; the registry is the only source of ownership; cross-domain work names a primary owner and coordinates the second as a dependency. | `router.mjs`, `registry.mjs` |
| **Parallel work** | One agent per repo at a time (repo lock); deterministic lock ordering; same-repo sub-tasks sequenced; concurrent pushes integrated divergence-safely. | `locks.mjs`, `engine.mjs`, `workspace.mjs` |
| **Quality gates** | COMPLETED only via `verifyAcceptance()` after the orchestrator itself ran the required checks in the worktree. A bug fix requires a regression check. | `acceptance.mjs`, `runner.mjs`, `router.mjs` |
| **Human actions** | Returned only when truly required (credentials, DNS, billing, production/data migration, high-risk deploy, ambiguous routing, unresolvable merge conflict). Never faked. | `permissions.mjs`, `engine.mjs`, `deploy.mjs` |
| **Rollback** | Every task records `pre_change_sha` + a provider rollback reference; autonomous deploys are live-verified and fail (keeping rollback) if verification fails; failed worktrees are kept for diagnosis. | `deploy.mjs`, `engine.mjs`, `workspace.mjs` |
| **Delivery** | Branch per task (`orchestrator/mac-<id>-<slug>`); never push main, never force-push, never rewrite history. GitHub is the delivery/audit surface; the task record is the single source of task state. | `engine.mjs`, `workspace.mjs`, `tasks.mjs` |

## When a HUMAN ACTION is returned (and only then)

The Orchestrator surfaces a human action — as `WAITING_FOR_HUMAN` and on
`GET /human-actions` — only for work a human alone can do:

- provider credentials / API keys / OAuth (email, WhatsApp, SMS, telephony, social, analytics)
- DNS, domain and hosting-account changes
- billing, payments, subscriptions
- production data or database schema migrations
- high-risk deploys, or any deploy the planner marks `needsHuman`
- routing that stays ambiguous after scoring
- an unresolvable concurrent-work merge conflict

A missing provider credential becomes a central human action — never a faked
"live connected" result.

## Definition of Done

A next large Maculis engineering assignment can be handed in from ChatGPT via the
Orchestrator, after which the Orchestrator independently determines the right repo,
execution context, tests, delivery and verification — and returns a HUMAN ACTION
only when human intervention is genuinely necessary. This framework is versioned in
the repository (`config/governance.json` + this document), so it is not lost when a
chat ends.
