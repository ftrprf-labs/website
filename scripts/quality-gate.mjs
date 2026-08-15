#!/usr/bin/env node
// Maculis Quality Gate — one overarching regression gate for the critical product chains in this
// repo (Testerbeheer + Communication Layer). It runs the mandatory suites grouped by chain, reports
// a per-chain verdict, and EXITS NON-ZERO when any critical chain is red. Deployment policy (§3 of
// the night-mode brief): no production deploy is "geslaagd" while a relevant critical gate is red.
//
// Two coverage levels:
//   - offline (no DATABASE_URL): pure/unit chains run fully; DB-backed chains SKIP (reported as such).
//   - full (DATABASE_URL + COMM_LAYER_ENABLED): DB-backed E2E chains run for real.
// Pass --require-db to make a skipped DB chain a FAILURE (use this in a real deploy gate so partial
// coverage never reads as green). Pass --json for a machine-readable summary (Orchestrator, §13).
//
// First Five journey + Technical Signals live in the maculis-first-five repo; their gates run there.
// This manifest names them as EXTERNAL so the gate is honest about what it does and does not cover.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const REQUIRE_DB = process.argv.includes('--require-db');
const AS_JSON = process.argv.includes('--json');

// Each chain: the product-chain it guards, its test files, whether it is deploy-critical, and
// whether it needs a database. `needsDb:false` chains always run; `needsDb:true` chains run only
// with a DB and otherwise report SKIPPED (a FAILURE under --require-db).
const MANIFEST = [
  { chain: 'Testerbeheer core (import/tokens/lifecycle/consent/fail-closed/intake)', critical: true, needsDb: false, files: ['tests/core.test.mjs'] },
  { chain: 'Pass the Lens (referral intake + provenance, fail-closed)', critical: true, needsDb: false, files: ['tests/pass-the-lens.test.mjs'] },
  { chain: 'Outbound reliability (retry/timeout/idempotency policy)', critical: true, needsDb: false, files: ['tests/comm-http-retry.test.mjs'] },
  { chain: 'WhatsApp webhook (signature/normalize, fail-closed)', critical: true, needsDb: false, files: ['tests/comm-whatsapp-webhook.test.mjs'] },
  { chain: 'SMS webhook (signature/normalize, fail-closed)', critical: true, needsDb: false, files: ['tests/comm-sms-webhook.test.mjs'] },
  { chain: 'Comm foundation (db/identity/inbound/AI copilot)', critical: true, needsDb: true, files: ['tests/comm-db.test.mjs', 'tests/comm-identity.test.mjs', 'tests/comm-inbound.test.mjs', 'tests/comm-ai.test.mjs'] },
  { chain: 'Inbound e-mail E2E (visibility + AI approval)', critical: true, needsDb: true, files: ['tests/comm-inbound-visibility.test.mjs', 'tests/comm-inbound-ai-acceptance.test.mjs'] },
  { chain: 'Relationship Workspace + omnichannel + memory', critical: true, needsDb: true, files: ['tests/comm-workspace.test.mjs'] },
  { chain: 'WhatsApp round-trip E2E (inbound→AI→approval→delivery)', critical: true, needsDb: true, files: ['tests/comm-whatsapp-e2e.test.mjs'] },
  { chain: 'SMS round-trip E2E (inbound→AI→approval→delivery)', critical: true, needsDb: true, files: ['tests/comm-sms-e2e.test.mjs'] },
  { chain: 'Telephony click-to-call (consent/call-record/outcome)', critical: true, needsDb: false, files: ['tests/comm-calls.test.mjs'] },
  { chain: 'Observability PII-safety (no personal data in logs)', critical: true, needsDb: false, files: ['tests/comm-obs.test.mjs'] },
  { chain: 'Data-quality diagnostic (duplicates/splits, read-only)', critical: true, needsDb: true, files: ['tests/comm-data-quality.test.mjs'] },
];

const EXTERNAL = [
  'First Five journey (repo: maculis-first-five) — selftest + technical suite',
  'Technical Signals evidence gate (repo: maculis-first-five)',
];

function runFiles(files) {
  // Serial (--test-concurrency=1): the DB-backed suites share one database.
  const res = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: ROOT, encoding: 'utf8', env: process.env });
  const out = `${res.stdout || ''}${res.stderr || ''}`;
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : 0; };
  return { code: res.status, pass: num(/# pass (\d+)/), fail: num(/# fail (\d+)/), skipped: num(/# skipped (\d+)/), tests: num(/# tests (\d+)/), out };
}

const results = [];
for (const entry of MANIFEST) {
  if (entry.needsDb && !HAS_DB) {
    results.push({ ...entry, status: REQUIRE_DB ? 'FAIL' : 'SKIPPED_DB', pass: 0, fail: 0, skipped: 0, reason: 'no DATABASE_URL' });
    continue;
  }
  const r = runFiles(entry.files);
  // A green run has zero failures AND actually executed something (all-skipped in a needed chain is
  // not real coverage). node --test exits non-zero on failure; treat that as authoritative too.
  const ranSomething = (r.tests - r.skipped) > 0;
  const green = r.fail === 0 && r.code === 0 && ranSomething;
  results.push({ ...entry, status: green ? 'PASS' : 'FAIL', pass: r.pass, fail: r.fail, skipped: r.skipped, tests: r.tests });
}

const criticalFailures = results.filter((r) => r.critical && r.status === 'FAIL');
const skippedDb = results.filter((r) => r.status === 'SKIPPED_DB');
const verdict = criticalFailures.length === 0 ? 'GREEN' : 'RED';

if (AS_JSON) {
  console.log(JSON.stringify({
    verdict, coverage: HAS_DB ? 'full' : 'offline', requireDb: REQUIRE_DB,
    deployable: verdict === 'GREEN' && (!REQUIRE_DB || skippedDb.length === 0),
    chains: results.map((r) => ({ chain: r.chain, critical: r.critical, status: r.status, pass: r.pass, fail: r.fail, skipped: r.skipped })),
    external: EXTERNAL,
  }, null, 2));
} else {
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  console.log('\nMaculis Quality Gate');
  console.log(`Coverage: ${HAS_DB ? 'FULL (real database)' : 'OFFLINE (no database — DB chains skipped)'}${REQUIRE_DB ? '  [--require-db]' : ''}\n`);
  const icon = (s) => ({ PASS: 'PASS ', FAIL: 'FAIL ', SKIPPED_DB: 'skip ' }[s] || s);
  for (const r of results) {
    const counts = r.status === 'SKIPPED_DB' ? `(${r.reason})` : `pass=${r.pass} fail=${r.fail} skip=${r.skipped}`;
    console.log(`  ${icon(r.status)} ${pad(r.chain, 58)} ${counts}`);
  }
  console.log('\n  External gates (run in their own repo):');
  for (const e of EXTERNAL) console.log(`    - ${e}`);
  console.log(`\nVERDICT: ${verdict}${verdict === 'RED' ? `  (${criticalFailures.length} critical chain(s) red)` : ''}`);
  if (skippedDb.length && !REQUIRE_DB) console.log(`NOTE: ${skippedDb.length} DB chain(s) skipped — run with a DATABASE_URL (and --require-db) before treating a deploy as verified.`);
}

// Exit non-zero when a critical chain is red, or when a DB chain was skipped under --require-db.
const blocked = verdict === 'RED' || (REQUIRE_DB && skippedDb.length > 0);
process.exit(blocked ? 1 : 0);
