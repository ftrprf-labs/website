// Communication Layer — DB foundation tests.
// These require a Postgres (DATABASE_URL + COMM_LAYER_ENABLED). They SKIP automatically when no
// database is configured, so the normal `npm test` on a build box without Postgres stays green.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — Communication Layer DB tests skipped' };

test('migrations apply idempotently and create the core schema', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  try {
    const r1 = await runMigrations({ silent: true });
    assert.ok(r1.total >= 1);
    const r2 = await runMigrations({ silent: true });
    assert.equal(r2.ran.length, 0, 'second run must be a no-op');
    const tables = (await query(
      `select table_name from information_schema.tables where table_schema='public'`
    )).rows.map((r) => r.table_name);
    for (const t of ['organization', 'contact', 'invitation', 'conversation', 'message',
      'mailbox', 'attachment', 'ai_draft', 'app_user', 'audit_event', 'webhook_event']) {
      assert.ok(tables.includes(t), `missing table ${t}`);
    }
  } finally {
    const { closePool } = await import('../server/comm/db.mjs');
    await closePool();
  }
});
