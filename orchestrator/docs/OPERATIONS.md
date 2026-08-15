# Operator handbook (brief §59)

Short and practical. The orchestrator is one process (API + async worker) over a
single JSON store.

## Start / stop
```bash
# Local (mock runner, zero setup):
node bin/maculis-dev.mjs serve            # API + worker on 127.0.0.1:4610
node bin/maculis-dev.mjs worker           # worker only (foreground)

# Stop: Ctrl-C. State is durable (JSON store); in-flight locks clear on the next
# `serve`/`worker` via stuck-task recovery.
```

## Always-on (Render)
`render.yaml` + `Dockerfile` deploy the orchestrator as its own service with a
persistent disk. It never touches product deploys. Set the secrets by hand in the
Render dashboard (see below). Health: `GET /healthz`.

## Submit / status
```bash
maculis-dev submit "<free text>"          # or POST /tasks, or the MCP tool
maculis-dev status [MAC-101]
maculis-dev queue | actions | approvals | logs MAC-101
```

## Health
`GET /healthz` → `{ ok, worker, state_backend, runner, registry_loaded }`. It
never returns internal paths, tokens, or repo secrets (brief §57).

## Restart / crash recovery
On restart, `recoverStuck()` fails any task left RUNNING past its heartbeat lease
(`MACULIS_LEASE_MS`, default 45m) so nothing is stuck RUNNING forever (brief §62).
Re-submit a recovered task normally.

## Rotate the API token
Set a new `MACULIS_API_TOKEN` in the environment and restart. Old token stops
working immediately (constant-time compare, no cached sessions).

## Add / disable an agent (domain)
- Add: append an entry to `src/registry.mjs` (or drop a JSON file in
  `config/agents.d/`) with repo, ownership patterns, test_commands, deploy config.
- Disable (e.g. during an incident, brief §71):
  `maculis-dev disable relationship "incident"` → no new write tasks for it;
  `maculis-dev enable relationship` to resume. Also `POST /agents/:id/disable`.

## Change the permission policy
Edit `src/permissions.mjs` (profiles + broker deny/human lists) and the mirrored
`config/profiles/*.settings.json`. The broker deny list is the hard backstop —
never weaken it to silence a prompt.

## Logs
`maculis-dev logs MAC-101` (per-task audit) or `GET /tasks/:id/log`. Secrets/PII
keys are redacted in the audit log.

## Secrets
Environment only, never in repo/prompt/log/summary:
`MACULIS_API_TOKEN`, `MACULIS_PUBLIC_URL`, `MACULIS_WEBHOOK_SECRET`,
`MACULIS_GIT_TOKEN` (real runner clones), `ANTHROPIC_API_KEY` (real runner CLI).

## Roll back the orchestrator
It is additive and isolated in `orchestrator/`. Roll back = redeploy the previous
image (Render keeps them) or `git revert` the commit. Task state (JSON file on the
disk) is untouched by a code rollback.

## Enable the real runner
1. `MACULIS_RUNNER=real`.
2. Ensure each domain repo is reachable: either an operator-maintained checkout in
   `src/config.mjs → runner.checkouts`, or set `MACULIS_GIT_TOKEN` so the workspace
   manager can clone the private repos.
3. Ensure the Claude Code CLI is authenticated (`ANTHROPIC_API_KEY`).
