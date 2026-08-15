# CLAUDE.md — Maculis Development Orchestrator

Engineering context for anyone (human or agent) working on the orchestrator
itself. Task-specific instructions belong in the task prompt, not here.

## What this is
A small, dependency-free Node ESM service that routes one free-text development
instruction to the right Maculis domain (Website / First Five / Relationship),
runs a real Claude Code agent (headless CLI), verifies the result, and keeps
GitHub as the code-history source of truth. It is NOT one of the three products.

## House rules
- **Runtime:** Node ≥18, ESM `.mjs`, **zero runtime dependencies**, no build step.
- **Tests:** `node --test` under `test/`. Add a test with any behaviour change.
- **Store:** one JSON file via `src/store.mjs` (atomic temp+rename). All writes go
  through `tx()`. Never read/write the file directly elsewhere.
- **Registry is data:** add a domain in `src/registry.mjs` / `config/agents.d/`,
  never by branching in the router.
- **Security:** no secrets in code, logs, prompts, PRs, or task summaries; the
  audit log redacts token/secret/PII keys. No arbitrary-shell endpoint. The
  permission broker (`src/permissions.mjs`) is the hard backstop — do not weaken
  the deny list.
- **Git:** branch per task (`orchestrator/mac-xxx-slug`); never force-push, rewrite
  history, or push to main.
- **Honesty:** a task reaches COMPLETED only through `verifyAcceptance()`. Do not
  add a shortcut that lets "the agent said done" become COMPLETED.

## Layout
- `src/router.mjs` — NL → routing decision (explainable, deterministic).
- `src/registry.mjs` — the agent/domain registry (source of truth, extensible).
- `src/engine.mjs` — submit → route → preflight → lock → session → run → verify.
- `src/runner.mjs` — headless `claude` invocation (`buildClaudeArgs`) + mock.
- `src/permissions.mjs` — profiles + broker. `src/locks.mjs` — concurrency.
- `src/sessions.mjs` — per-domain session continuity + freshness rules.
- `src/tasks.mjs` — canonical task object + enforced status machine.
- `src/api.mjs` — authenticated HTTP boundary. `mcp/server.mjs` — MCP tools.
- `src/governance.mjs` + `config/governance.json` — the durable Autonomous Night
  Run framework (loaded, injected into every prompt, served at `GET /governance`).
- `src/decompose.mjs` — split a large assignment into ordered, routed sub-tasks;
  `engine.submitEpic()` runs them as a dependency-gated epic. See
  `docs/LEAD_ENGINEERING.md`.
- `bin/maculis-dev.mjs` — the CLI.
