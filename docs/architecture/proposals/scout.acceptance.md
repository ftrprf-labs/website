# Scout Slice 1: Test & Preview Acceptance Plan

DESIGN ONLY. This is the acceptance plan for the future "GO BUILD FIRST AGENT" work. The
illustrative test skeleton below is written for `node:test` in the repo's existing style, but it
lives under `docs/architecture/proposals/` on purpose, so `npm test` (which runs `tests/*.test.mjs`)
never picks it up. When the agent is actually built, a reviewed version moves into `tests/`.

Writing rule respected: no stylistic hyphens or dashes in prose.

---

## Testing idioms to match (from the existing comm suite)

- `node --test --test-concurrency=1 tests/*.test.mjs` (serial, see `package.json` `test:comm`).
- Two layers: pure unit (no DB, always runs) and DB-E2E (real Postgres, fictitious data), with
  clean skips when `DATABASE_URL` is absent (production parity, layer stays dormant).
- Tenant isolation and privacy exclusion are always asserted.
- No PII, tokens or secrets in logs.

## Pure unit (no DB)

1. `assertMandate(scout, 'send')` throws; `assertMandate(scout, 'read', {resource:'organization'})`
   passes; `assertMandate(scout, 'read', {resource:'privacy_conversation'})` throws.
2. `qualifyCandidate` is deterministic: same signal in, same claims out; every claim carries an
   `epistemic` status and at least one `evidenceRef`.
3. A Scout claim maps to memory as `source='scout'`, `confidence='proposed'` (never confirmed).
4. Epistemic status is preserved across a handoff envelope (OBSERVATION stays OBSERVATION).
5. Idempotency: two runs with the same `dedupeKey` produce one logical run (second is a no-op).

## DB-E2E (real Postgres, fictitious data)

6. Signal (unknown_inbound) -> `work_item(type=qualify_candidate, status=proposed)` with
   `source_signal_refs` set.
7. `runScout` -> `agent_run(succeeded)` + `relationship_memory(source=scout, proposed)` +
   `activity(scout_candidate_found)` + `work_item.status=awaiting_human`.
8. Existing organization is recognised (Voorbeeldflow 1): Scout writes an OBSERVATION linking to
   the existing `organization_id`, and does NOT create a duplicate org/contact.
9. Identity ambiguity (Voorbeeldflow 3): two candidate contacts -> `work_item(type=escalation)` +
   `notification` to `business_development`; no guess, no candidate promoted, run ends cleanly.
10. `promote` route -> `contact.relationship_stage='LEAD'` + `audit_event('candidate_promoted')`;
    only a human (admin) can call it; Scout cannot.
11. `dismiss` route -> proposed memory `superseded_at` set + reason recorded +
    `audit_event('candidate_dismissed')`.
12. Tenant isolation: a Scout run in tenant A never reads or writes tenant B rows.
13. Privacy exclusion: Scout never reads a privacy conversation (mandate `forbid: read_privacy`).
14. Provenance reconstruction: one query over `agent_run` + `audit_event` + `activity` for an
    organization returns the full "what did Scout do" trail.

## Preview acceptance

- Feature-flagged and additive: with the agent foundation off (no `DATABASE_URL`), everything is
  unchanged, exactly as the Communication Layer stays dormant today.
- Full existing comm suite stays green (regression).
- New agent suite green against a real Postgres; skips cleanly without a DB.
- No real external calls, no sending, no production data touched.
- Cockpit, Slice 5, First Lens and Comm Layer behavior untouched.

---

## Illustrative test skeleton (NOT run by `npm test`)

```js
// docs/architecture/proposals/scout.acceptance.md (illustration only).
// A reviewed copy would live at tests/agents-scout.test.mjs when the agent is built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
// import { assertMandate, MANDATE } from '../server/agents/registry.mjs';
// import { qualifyCandidate } from '../server/agents/scout/capabilities.mjs';

test('mandate: scout may not send', () => {
  // assert.throws(() => assertMandate({ slug: 'scout' }, 'send'));
});

test('scout claims are proposed, never confirmed, always evidenced', async () => {
  // const { claims } = await qualifyCandidate(fixtureSignal);
  // for (const c of claims) {
  //   assert.ok(c.evidenceRefs.length >= 1);
  //   assert.notEqual(c.epistemic, 'FACT');
  // }
});

// DB-E2E cases 6..14 follow the comm suite pattern: guard on DATABASE_URL, seed a
// fictitious tenant, run, assert rows, clean up. Serial (--test-concurrency=1).
```
