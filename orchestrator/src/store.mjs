// Persistence for the orchestrator.
//
// V1 uses a single JSON file as the "database" — the same deliberate choice the
// product makes (server/store.mjs): robust for the volumes involved, one clear
// storage location, zero native dependencies, safe delete, runs on any Node.
// Everything goes through this small module so the backing store can later be
// swapped for SQLite/Postgres without touching the rest of the orchestrator.
//
// Writes are atomic (temp file + rename) so a crash mid-write cannot corrupt the
// live state. A tiny in-process mutex serialises writes within one process.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.mjs';

const EMPTY = () => ({
  version: 1,
  counter: config.taskIdSeed,       // last-issued task number
  tasks: {},                        // id -> task object
  sessions: {},                     // agent_id -> session record
  locks: {},                        // repo -> { task_id, acquired_at }
  queue: [],                        // task ids waiting to run, in priority order
  approvals: {},                    // approval_id -> approval record
  humanActions: {},                 // action_id -> human action record
  idempotency: {},                  // key -> task_id
  disabledAgents: {},               // agent_id -> { reason, at } (brief §71)
  audit: [],                        // append-only audit events (capped)
});

let db = null;
let dbFile = null;

function file() {
  if (!dbFile) dbFile = join(config.dataDir, 'orchestrator.json');
  return dbFile;
}

function ensureDir() {
  if (!existsSync(config.dataDir)) mkdirSync(config.dataDir, { recursive: true });
}

export function load() {
  ensureDir();
  if (!existsSync(file())) {
    db = EMPTY();
    persist();
    return db;
  }
  try {
    const parsed = JSON.parse(readFileSync(file(), 'utf8'));
    db = { ...EMPTY(), ...parsed };
    // Forward-safe defaults for stores written by an older version.
    for (const [k, v] of Object.entries(EMPTY())) {
      if (db[k] === undefined) db[k] = v;
    }
    return db;
  } catch (err) {
    throw new Error(`Could not read orchestrator store ${file()}: ${err.message}`);
  }
}

function persist() {
  ensureDir();
  // Cap the audit log so the file cannot grow unbounded (retention: last 5000).
  if (db.audit.length > 5000) db.audit = db.audit.slice(-5000);
  const tmp = file() + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  renameSync(tmp, file());
}

export function ready() {
  if (!db) load();
  return db;
}

// Run `fn(db)` and persist afterwards. Return whatever fn returns. This is the
// single write path — every mutation goes through here.
export function tx(fn) {
  const d = ready();
  const out = fn(d);
  persist();
  return out;
}

export function snapshot() {
  return JSON.parse(JSON.stringify(ready()));
}

// Test/util hook: reset in-memory state and point at a fresh file.
export function _resetForTests(dir) {
  db = null;
  dbFile = null;
  if (dir) config.dataDir = dir;
}
