# Maculis Quality Gate

One overarching regression gate for the critical product chains in this repository (Testerbeheer +
Communication Layer). It exists so a production deploy is only ever called "geslaagd" when the
chains that matter are green. **No deployment while a relevant critical gate is red.**

## Run it

```
npm run quality-gate            # offline coverage (pure/unit chains; DB chains skip)
npm run quality-gate:deploy     # deploy gate: requires a DATABASE_URL, skipped DB chain => FAIL
node scripts/quality-gate.mjs --json   # machine-readable summary (for the Orchestrator)
```

Full coverage needs a real database:

```
export DATABASE_URL=postgres://…            # a disposable Postgres
export COMM_LAYER_ENABLED=1
export RESEND_WEBHOOK_SECRET=whsec_…        # any base64 secret; the e-mail E2E signs with it
npm run quality-gate:deploy
```

The runner exits non-zero when any critical chain is red, or (under `--require-db`) when a
DB-backed chain was skipped. Wire that exit code into the deploy step.

## CI (hard delivery gate)

`.github/workflows/quality-gate.yml` runs the gate at FULL coverage (`--require-db`) on every push
and pull request, against a real `postgres:16` service container. A red critical chain fails the job,
so new communication code cannot be treated as done while the gate is red. The workflow uses a fixed
test `RESEND_WEBHOOK_SECRET` (not a production secret) so runs are reproducible.

## Coverage levels

- **offline** (no `DATABASE_URL`): the pure/unit chains run fully; the DB-backed E2E chains report
  `skip`. Good for a fast pre-commit check. It is NOT proof a deploy is safe: partial coverage never
  reads as green under `--require-db`.
- **full** (`DATABASE_URL` + `COMM_LAYER_ENABLED`): every chain, including the real-database round
  trips, runs for real.

## The chains (this repo)

| Chain | Critical | Needs DB |
| --- | --- | --- |
| Testerbeheer core (import, tokens, lifecycle, consent, fail-closed, intake) | yes | no |
| Pass the Lens (referral intake + provenance, fail-closed) | yes | no |
| Outbound reliability (retry/timeout/idempotency policy) | yes | no |
| WhatsApp webhook (signature/normalize, fail-closed) | yes | no |
| SMS webhook (signature/normalize, fail-closed) | yes | no |
| Comm foundation (db/identity/inbound/AI copilot) | yes | yes |
| Inbound e-mail E2E (visibility + AI approval) | yes | yes |
| Relationship Workspace + omnichannel + memory | yes | yes |
| WhatsApp round-trip E2E (inbound to AI to approval to delivery) | yes | yes |
| SMS round-trip E2E (inbound to AI to approval to delivery) | yes | yes |
| Telephony click-to-call (consent, call-record, outcome) | yes | partial |

The authoritative list lives in `scripts/quality-gate.mjs` (`MANIFEST`). Add a chain there when a new
critical product path gets tests.

## External gates (not run here)

First Five journey and Technical Signals live in the `maculis-first-five` repository; their gates run
there (journey selftest + technical suite, and the Technical Signals evidence gate). The gate names
them explicitly so it is honest about what this repo does and does not cover. A future federated gate
can aggregate both repos' `--json` verdicts.

## Principles carried by the gate

- Fail closed: a DB chain that could not run is not a pass.
- Evidence over green-for-green: a chain that ran only skipped tests is not counted as covered.
- The gate guards the real chains (identity, consent, provenance, delivery, fail-closed behaviour),
  not a line-coverage number.
