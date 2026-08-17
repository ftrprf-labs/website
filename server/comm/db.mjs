// Communication Layer — Postgres access (lazy, feature-flagged).
//
// The Communication/Relationship Layer lives entirely in Postgres, SEPARATE from the existing
// JSON invitation store. It is OFF unless COMM_LAYER_ENABLED=1 AND DATABASE_URL is set, so the
// live Invitation Manager / First Five flow is completely unaffected until we switch it on.
//
// No secrets in code: DATABASE_URL comes from the environment (Render injects it for a linked
// Postgres). SSL is required for managed Postgres; disabled for a local socket/plain test DB.

import pg from 'pg';
import { config } from '../config.mjs';

let pool = null;

// Is the Communication Layer switched on for this process?
export function commEnabled() {
  return config.commLayerEnabled && Boolean(config.databaseUrl);
}

// Is the Digital Colleagues (agents) domain switched on? Independent of the Communication Layer: it
// needs only AGENTS_ENABLED + a database. Both features share this Postgres, so the shared migration
// set is applied whenever either is enabled (dbFeaturesEnabled).
export function agentsEnabled() {
  return config.agentsEnabled && Boolean(config.databaseUrl);
}

// True when any DB-backed feature (Comm Layer or agents) is on, so the migration runner should run.
export function dbFeaturesEnabled() {
  return commEnabled() || agentsEnabled();
}

// Lazily create the connection pool. Managed Postgres needs TLS; a local test DB (postgres:// on
// localhost or a socket) does not — detect by host so the same code runs in both places.
export function getPool() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set — Communication Layer storage is unavailable.');
  if (pool) return pool;
  const url = config.databaseUrl;
  const isLocal = /@(localhost|127\.0\.0\.1|\/)/.test(url) || url.includes('host=/') || url.includes('sslmode=disable');
  pool = new pg.Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });
  pool.on('error', () => { /* never crash the process on an idle-client error */ });
  return pool;
}

// Thin query helper. Callers use parameterised queries ($1,$2,…) — never string interpolation.
export async function query(text, params) {
  return getPool().query(text, params);
}

// Run fn inside a transaction with a dedicated client.
export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) { const p = pool; pool = null; await p.end().catch(() => {}); }
}
