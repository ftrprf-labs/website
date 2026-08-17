// Communication Layer — migration runner.
//
// Applies server/comm/migrations/*.sql in filename order, each exactly once, inside a
// transaction, tracked in schema_migrations. Idempotent and safe to run on every boot: already
// applied files are skipped. Runs when ANY DB-backed feature is enabled (the Communication Layer
// OR the Digital Colleagues domain), so a normal deployment without a database never touches one.
// The agent schema (006) shares this Postgres and depends on the relationship base tables, so the
// whole set is applied together.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, dbFeaturesEnabled } from './db.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(HERE, 'migrations');

export async function runMigrations({ silent = false } = {}) {
  const pool = getPool();
  await pool.query(`create table if not exists schema_migrations (
    version text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await pool.query('select version from schema_migrations')).rows.map((r) => r.version));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('insert into schema_migrations(version) values ($1)', [file]);
      await client.query('COMMIT');
      ran.push(file);
      if (!silent) console.log(`  [comm] migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  return { ran, total: files.length };
}

// Best-effort boot hook: never blocks or crashes the server if the DB is briefly unreachable —
// the Communication Layer routes fail closed until migrations have succeeded.
export async function migrateOnBoot() {
  if (!dbFeaturesEnabled()) return { skipped: true };
  try {
    const res = await runMigrations();
    return { ok: true, ...res };
  } catch (err) {
    console.error(`[comm] migrations not applied yet: ${err.message}`);
    return { ok: false, error: err.message };
  }
}
