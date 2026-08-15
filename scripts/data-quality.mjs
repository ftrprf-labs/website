#!/usr/bin/env node
// Maculis data-quality diagnostic (§7). READ-ONLY: reports duplicate contacts, cross-channel
// identity splits, orphan organizations and unlinked conversations. It never merges or mutates
// anything — a merge is a human decision with provenance. IDs and counts only; no personal data.
//
//   node scripts/data-quality.mjs           # human-readable report
//   node scripts/data-quality.mjs --json    # machine-readable (Orchestrator)
//
// Requires DATABASE_URL (+ COMM_LAYER_ENABLED). Exits non-zero only on a HARD integrity violation.

import { runDataQualityChecks } from '../server/comm/data-quality.mjs';

const AS_JSON = process.argv.includes('--json');
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');

if (!HAS_DB) {
  const msg = 'data-quality: no DATABASE_URL/COMM_LAYER_ENABLED — nothing to check.';
  if (AS_JSON) console.log(JSON.stringify({ ok: true, skipped: true, reason: 'no_database' }));
  else console.log(msg);
  process.exit(0);
}

const { closePool } = await import('../server/comm/db.mjs');
try {
  const result = await runDataQualityChecks({});
  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\nMaculis data-quality diagnostic (read-only)\n');
    const icon = (s) => ({ hard: 'HARD', warn: 'warn', info: 'info' }[s] || s);
    for (const f of result.findings) {
      const flag = f.count > 0 && f.severity === 'hard' ? '  <-- INTEGRITY VIOLATION' : '';
      console.log(`  ${icon(f.severity).padEnd(4)}  ${f.check.padEnd(34)} count=${f.count}${flag}`);
    }
    console.log(`\n${result.ok ? 'OK — no hard integrity violations.' : `RED — ${result.hardViolations} hard violation(s).`}`);
    console.log('Note: duplicates/splits are reported for a HUMAN merge decision; nothing is merged automatically.');
  }
  process.exit(result.ok ? 0 : 1);
} finally {
  await closePool();
}
