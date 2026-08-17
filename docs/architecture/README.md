# Maculis Architecture: Team & Agents (parallel prep, design only)

This folder is a parallel architecture-preparation stream. It is DESIGN ONLY. Nothing here is
wired into live code, and nothing here deploys.

Guardrails honored (per the assignment): the active Cockpit, Slice 5, First Lens, Comm Layer
behavior, production infrastructure and production data are all left untouched. No real emails,
no external actions, no live migrations, no competing Slice 5 implementation.

## What is here

- `TEAM_AND_AGENTS_ARCHITECTURE.md`: the full report (28 chapters). Start here.
- `contracts/scout-agent.contract.md`: interfaces for the first agent (Scout): actor, work_item,
  agent_run, mandate policy, handoff envelope, epistemic claim, runner, capabilities, routes.
- `proposals/006_agent_foundation.candidate.sql`: the candidate migration. It is DELIBERATELY not
  in `server/comm/migrations/`, so the boot runner (`server/comm/migrate.mjs`) can never apply it.
- `proposals/scout.acceptance.md`: the test and preview acceptance plan, with an illustrative test
  skeleton that is NOT under `tests/`, so `npm test` never runs it.

## The one-line thesis

Maculis already has a strong shared relational truth (the Communication Layer). Do not build an
agent platform. Add a minimal agent foundation (`actor`, `work_item`, `agent_run`), make attention
personal (per-actor routing), and build one digital colleague first: SCOUT, safely bounded to
reading and proposing. Radar stays the deterministic engine (Slice 5), not an agent.

## How this line merges with Slice 5

Scout Slice 1 and Slice 2 are orthogonal to Slice 5 and can be built without touching the attention
surface. Slice 3 (personal attention routing) is where the two lines join: the router is the
actor-aware extension of the Slice 5 orchestration engine, not a reimplementation.
