# Live deployment — Maculis Development Orchestrator

## Service (live)
- **URL:** https://maculis-orchestrator.onrender.com
- **Health:** https://maculis-orchestrator.onrender.com/healthz
- **OpenAPI (for the ChatGPT Action):** https://maculis-orchestrator.onrender.com/openapi.json
- **Render service id:** `srv-da05as3l550s73clul80` (workspace: Maculis, `tea-d9tholugekts738lr3gg`)
- **Dashboard:** https://dashboard.render.com/web/srv-da05as3l550s73clul80
- **Runtime:** native Node 22 (zero deps) · region frankfurt · plan **free** · auto-deploy from branch `claude/maculis-dev-orchestrator-paox3h`
- **Start:** `node orchestrator/bin/maculis-dev.mjs serve` (API + async worker, one process)
- Separate from product services — deploying it never touches `ftrlabs-testerbeheer` or `maculis-first-five` (brief §72/§73).

Render app logs confirm live startup: `Maculis Orchestrator API on http://0.0.0.0:10000 (token-auth)` → `Your service is live 🎉`.

> Note: this build session's sandbox egress policy blocks `*.onrender.com` (403 at
> the proxy — "report, do not route around"), so the live HTTP surface is exercised
> from the owner's browser/ChatGPT, not from the build sandbox. All behaviour is
> proven on identical code by the 44-test suite + local real E2E against the real repos.

## Environment (set on Render; secrets by name only — never committed/logged)
| Var | Value | Notes |
|-----|-------|-------|
| `MACULIS_API_HOST` | `0.0.0.0` | bind for managed host |
| `MACULIS_API_TOKEN` | *(secret, set)* | bearer token for API + ChatGPT Action |
| `MACULIS_PUBLIC_URL` | `https://maculis-orchestrator.onrender.com` | OpenAPI `servers` block |
| `MACULIS_RUNNER` | `mock` | flip to `real` after the Anthropic key is added |
| `MACULIS_DATA_DIR` | `/tmp/maculis-orchestrator` | JSON task store (see persistence note) |
| `MACULIS_WORKSPACE_ROOT` | `/tmp/maculis-workspaces` | per-task worktrees (real runner) |
| `NODE_VERSION` | `22` | |
| `ANTHROPIC_API_KEY` | *(pending — owner)* | required for the real runner (headless CLI) |
| `MACULIS_GIT_TOKEN` | *(pending — owner)* | only for the PRIVATE repos (First Five, groeiplatform); the public `website` repo clones without it |

## Persistence
Free plan has no persistent disk, so `/tmp` state resets on redeploy (survives
within a running instance). For durable task state across redeploys: upgrade to a
paid plan and attach a Render disk mounted at e.g. `/var/data`, then set
`MACULIS_DATA_DIR=/var/data` (same pattern the products use). Not required for V1.

## Rollback
- **Code:** Render → service → **Deploys** → pick the previous live deploy → **Rollback/Redeploy**. Or `git revert <sha>` on the branch (auto-redeploys).
- **Whole service:** it is isolated; deleting it has zero product impact.
- **Previous live deploy id:** `dep-da05b1eibajc73aooc30` (commit `b9913c0`).

## Enable the REAL runner (owner action — see FINAL_STATUS / chat for the click-by-click)
1. Render → maculis-orchestrator → **Environment** → add `ANTHROPIC_API_KEY`.
2. **Settings → Build Command** → `npm install -g @anthropic-ai/claude-code` (the headless CLI is not in the default build).
3. Recommended: upgrade **Free → Starter** (memory for the CLI + always-on, no cold starts).
4. **Environment** → set `MACULIS_RUNNER=real` → Save (redeploys).
5. For the private repos, add `MACULIS_GIT_TOKEN` (GitHub PAT, contents:read).

## ChatGPT Action
Import `https://maculis-orchestrator.onrender.com/openapi.json`, Auth = Bearer =
`MACULIS_API_TOKEN`. Exact steps in `docs/CHATGPT_BRIDGE.md`.
