# ChatGPT bridge (brief §19, §20, §24, §44, §48)

Goal: you type one instruction in ChatGPT, it calls the Maculis Orchestrator, and
you get the task id + later the outcome — no Claude Code chat, no copy-paste.

This uses an **officially supported** integration path only: a ChatGPT custom GPT
**Action** (OpenAPI) over the orchestrator's authenticated HTTP API. No browser
automation, no DOM scripting, no cookie reuse (brief §80).

## What is already built (ready now)
- Authenticated HTTP API with bearer auth, rate limiting, input validation, size
  limits, audit + redaction (brief §23, §47, §57).
- A machine-readable **OpenAPI 3.1 spec** at `GET /openapi.json` describing the
  small tool surface (brief §24):
  `submit_maculis_task`, `get_maculis_task`, `list_maculis_tasks`,
  `cancel_maculis_task`, `approve_maculis_action`, `list_maculis_human_actions`.
- Async model: submit returns a `task_id` fast; the worker runs the task; status
  is polled via `get_maculis_task` (brief §26). Optional signed webhooks for
  push-style completion (brief §27, §45) — no fake callback if a channel isn't
  wired.
- The same operations over **MCP** (`mcp/server.mjs`) for MCP-capable clients.

## Live now
- Orchestrator: **https://maculis-orchestrator.onrender.com** (deployed, running).
- OpenAPI: **https://maculis-orchestrator.onrender.com/openapi.json**
- Auth: bearer `MACULIS_API_TOKEN` (set on Render; the value is delivered to the
  owner in chat, never committed).

## The remaining step (only you can do it — ChatGPT account, brief §48/§49)
Creating/authorising a GPT Action lives inside your ChatGPT account and cannot be
done from code (no fake "bridge live"). Click-by-click:
1. ChatGPT → left sidebar **Explore GPTs → Create** (or edit an existing GPT) → **Configure** tab.
2. Scroll to **Actions → Create new action**.
3. **Schema → Import from URL**: `https://maculis-orchestrator.onrender.com/openapi.json`.
4. **Authentication → API Key**, Auth Type **Bearer**, paste the `MACULIS_API_TOKEN` value.
5. **Save**. The GPT now shows the Maculis tools (submit / get / list / cancel /
   approve / list human actions).
6. Test prompt: *"Controleer in First Five waar de herkenning van Herken je dit
   wordt opgeslagen en rapporteer alleen de relevante bestanden en functies. Wijzig niets."*
   → the GPT calls `submit_maculis_task`, returns a `MAC-…` id; then `get_maculis_task`
   returns the routed domain + status.

## The intended experience (brief §68)
> You: "Los HEMA Nog een lens op."
> ChatGPT → `submit_maculis_task` → "Gestart als MAC-142 bij First Five."
> (later) ChatGPT → `get_maculis_task` → "MAC-142 is klaar. De gate gebruikte de
> verkeerde completion state. Generiek opgelost, checks groen, live geverifieerd."

## Verify the bridge locally before wiring ChatGPT
```bash
export MACULIS_API_TOKEN=$(openssl rand -hex 24)
node bin/maculis-dev.mjs serve
curl -s localhost:4610/openapi.json | head            # public schema
curl -s -XPOST localhost:4610/tasks -H "authorization: Bearer $MACULIS_API_TOKEN" \
  -H 'content-type: application/json' -d '{"request":"HEMA toont Nog een lens niet"}'
```
