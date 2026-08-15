# Repository Registry (Maculis)

Machine-adjacent routing table so an agent (or an orchestrator) picks the right
repository, the right branch, and the right commands, instead of guessing.

Source of truth for this file: verified facts from `ftrprf-labs/website` itself
(`render.yaml`, `package.json`, `Dockerfile`, git remote) plus statements
recorded in `docs/BUILD_LOG.md`. Fields that cannot be verified from inside the
current GitHub scope are marked `unverified`. Do not treat `unverified` values as
confirmed. Update this file when a fact is confirmed against the real repo.

Scope note: the current session has GitHub access scoped to `ftrprf-labs/website`
only. The other repositories are listed for routing context and their fields are
recorded from the build log, not independently confirmed here.

---

## ftrprf-labs/website  (this repo)

- canonical_name: `ftrprf-labs/website`
- purpose: Maculis Testerbeheer / Invitation Manager plus the AI first
  omnichannel Communication Layer. Imports testers, mints one opaque personal
  invitation link per tester, sends invitations, ingests inbound e-mail, and
  runs the relationship workspace.
- runtime: Node.js (>= 22 in production via Docker `node:22-slim`), ES modules,
  no web framework.
- default_branch: `claude/invitation-manager-mvp-d5r5h8` (also the branch Render
  auto deploys; see deploy_target).
- deploy_branch: `claude/invitation-manager-mvp-d5r5h8` (`autoDeploy: true` in
  `render.yaml`, so any push to the connected branch triggers a production
  deploy).
- protected_branches: unverified (no branch protection observed from inside the
  repo; treat the deploy branch as protected by convention: never force push).
- test_command: `npm test` (`node --test tests/*.test.mjs`). Communication Layer
  DB tests skip cleanly without `DATABASE_URL`, which matches production parity.
- build_command: none (no bundler; the Docker image copies `server/` and
  `public/` and runs `node server/index.mjs`).
- lint_command: none declared.
- deploy_target: Render web service `ftrlabs-testerbeheer`, Docker runtime,
  region Frankfurt (EU, GDPR residency), plan `starter` (always on), health check
  `GET /healthz`, persistent disk mounted at `/var/data`.
- docs_location: `README.md`, `docs/BUILD_LOG.md` (canonical decision log),
  `docs/AUTONOMOUS_FACTORY.md`, this registry.
- ownership: Lud (owner). PII holder: testers' names, e-mail, mobile.
- allowed_task_classes: AUTO_READ, AUTO_TEST, AUTO_EDIT, AUTO_COMMIT,
  AUTO_PUSH_FEATURE (feature branches only). Production writes, secret rotation,
  DNS, and financial or legal steps stay HUMAN.
- secrets_required (names only, never values): `ADMIN_PASSWORD` (hand entered in
  Render), `AUTH_SECRET` (Render generated), `MACULIS_EXPORT_KEY`,
  `MACULIS_SYNC_KEY`, `MAIL_API_KEY`, `INTAKE_KEY`, and for the Communication
  Layer `DATABASE_URL`, `RESEND_WEBHOOK_SECRET`. All `sync:false` or generated;
  none live in git.
- visibility: unverified (assume private; the app holds PII and refuses to start
  in production without `ADMIN_PASSWORD` and `AUTH_SECRET`).
- rollback_strategy: Render keeps prior deploys; roll back by redeploying the
  previous green commit. Data lives on the persistent disk and in Postgres, so a
  code rollback does not drop data. Migrations under `server/comm/migrations/`
  are additive and non destructive by policy.

---

## ftrprf-labs/maculis-first-five  (the Maculis Journey)

Recorded from `docs/BUILD_LOG.md` and `render.yaml`. Not in current GitHub scope,
so most fields are `unverified`.

- canonical_name: `ftrprf-labs/maculis-first-five` (build log writes it with a
  trailing period in prose; the Render service is `maculis-first-five`).
- purpose: the Maculis First Five journey (the experience the tester opens). Owns
  the inner circle consent step and Pass the Lens (the referral terminal beat).
- runtime: TypeScript (build log references `tsc` clean and a selftest).
- default_branch: unverified. Recent work happened on `claude/journey-consent-v1`.
- deploy_target: Render web service `maculis-first-five`
  (`https://maculis-first-five.onrender.com`).
- test_command: unverified (build log references `technical` and `selftest`
  suites).
- integration_with_website: server to server. First Five forwards Pass the Lens
  intake to `ftrlabs-testerbeheer` `POST /api/intake` using the shared `INTAKE_KEY`
  and reads or publishes evaluations via `MACULIS_EXPORT_KEY` / `MACULIS_SYNC_KEY`.
- allowed_task_classes: unverified. Same HUMAN gates as above for production,
  secrets, DNS, financial, and legal.
- rollback_strategy: unverified (assume Render redeploy of the previous commit).

---

## ftrprf-labs/ftrlabs-docs  (governance and compliance)

Recorded from `docs/BUILD_LOG.md`. Not in current GitHub scope.

- canonical_name: `ftrprf-labs/ftrlabs-docs`
- purpose: governance and compliance documentation. Holds the GDPR consent
  registry (`00-governance/compliance/gdpr/consent-registry.md`).
- runtime: documentation only (no service).
- allowed_task_classes: AUTO_READ, and additive documentation with review.
  Consent and privacy meaning changes are a HUMAN gate.
- deploy_target: none (documentation).

---

## Routing rules

1. Testerbeheer, Invitation Manager, Communication Layer, inbound e-mail, and the
   relationship workspace live in `ftrprf-labs/website`.
2. The tester facing journey, the consent step, and Pass the Lens origination live
   in `ftrprf-labs/maculis-first-five`.
3. Consent policy, GDPR registry, and governance decisions live in
   `ftrprf-labs/ftrlabs-docs`.
4. Cross service contracts (`/api/intake`, evaluation pull and publish) touch two
   repos. Change the contract on both sides in separate commits, and never break
   backward compatibility of a shared endpoint in a single push.
5. Never push to a repo that is not in the current session scope. Request scope
   first.
