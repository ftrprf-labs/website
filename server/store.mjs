// Persistence layer for invitations (brief §14).
//
// V1 uses a single JSON file as the "database". This is deliberate: for 5–500
// testers it is robust, has a clear storage location (data/invitations.json),
// supports safe delete, needs zero native dependencies, and runs on any Node.
//
// Everything goes through this small repository interface so the backing store
// can later be swapped for SQLite / Postgres without touching the rest of the
// app. See README "V2" for the upgrade path.

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { config, DEFAULT_TEMPLATE } from './config.mjs';
import { generateId, generateToken } from './tokens.mjs';

const STATUSES = ['DRAFT', 'INVITED', 'STARTED', 'COMPLETED', 'DECLINED', 'ERROR'];

// Canonical shape of a stored invitation record.
function emptyRecord() {
  return {
    id: '',
    token: '',
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    mobile: '',
    domain: '',
    campaign: config.campaign,
    status: 'DRAFT',
    notes: '',
    created_at: null,
    invited_at: null,
    started_at: null,
    completed_at: null,
  };
}

let db = null;

function ensureDir() {
  if (!existsSync(config.dataDir)) mkdirSync(config.dataDir, { recursive: true });
}

function load() {
  ensureDir();
  if (!existsSync(config.dbFile)) {
    db = { invitations: [], template: { ...DEFAULT_TEMPLATE }, version: 1 };
    persist();
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(config.dbFile, 'utf8'));
    db = {
      invitations: Array.isArray(parsed.invitations) ? parsed.invitations : [],
      template: { ...DEFAULT_TEMPLATE, ...(parsed.template || {}) },
      version: parsed.version || 1,
    };
  } catch (err) {
    throw new Error(`Could not read data file ${config.dbFile}: ${err.message}`);
  }
}

// Atomic write: write to a temp file then rename, so a crash mid-write cannot
// corrupt the live data file.
function persist() {
  ensureDir();
  const tmp = config.dbFile + '.tmp';
  writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  renameSync(tmp, config.dbFile);
}

function ready() {
  if (!db) load();
  return db;
}

// --- Public repository API ------------------------------------------------

export function listInvitations() {
  return ready().invitations.map((r) => ({ ...r }));
}

export function getInvitation(id) {
  const r = ready().invitations.find((x) => x.id === id);
  return r ? { ...r } : null;
}

export function getByToken(token) {
  const r = ready().invitations.find((x) => x.token === token);
  return r ? { ...r } : null;
}

// Detect a duplicate of `candidate` among existing records (or a provided set).
// Duplicate key = e-mail (case-insensitive) OR normalised mobile number.
export function findDuplicate(candidate, pool = null) {
  const list = pool || ready().invitations;
  const email = (candidate.email || '').trim().toLowerCase();
  const mobile = normaliseMobile(candidate.mobile || '');
  return (
    list.find((r) => {
      if (email && (r.email || '').trim().toLowerCase() === email) return true;
      if (mobile && normaliseMobile(r.mobile || '') === mobile) return true;
      return false;
    }) || null
  );
}

export function normaliseMobile(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  return s;
}

export function createInvitation(data) {
  const now = new Date().toISOString();
  const record = {
    ...emptyRecord(),
    ...pickFields(data),
    id: generateId(),
    token: generateToken(),
    campaign: config.campaign,
    status: 'DRAFT',
    created_at: now,
  };
  ready().invitations.push(record);
  persist();
  return { ...record };
}

export function updateInvitation(id, patch) {
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, pickFields(patch));
  persist();
  return { ...r };
}

// Status transition with automatic timestamping (brief §9).
export function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  r.status = status;
  const now = new Date().toISOString();
  if (status === 'INVITED' && !r.invited_at) r.invited_at = now;
  if (status === 'STARTED' && !r.started_at) r.started_at = now;
  if (status === 'COMPLETED' && !r.completed_at) r.completed_at = now;
  persist();
  return { ...r };
}

export function deleteInvitation(id) {
  const list = ready().invitations;
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  persist();
  return true;
}

export function getTemplate() {
  return { ...ready().template };
}

export function saveTemplate(patch) {
  const t = ready().template;
  for (const key of ['whatsapp', 'emailSubject', 'emailBody']) {
    if (typeof patch[key] === 'string') t[key] = patch[key];
  }
  persist();
  return { ...t };
}

export { STATUSES };

// Only allow known fields to be written — defends against junk/overwrite.
function pickFields(data) {
  const out = {};
  for (const k of [
    'first_name',
    'last_name',
    'company_name',
    'email',
    'mobile',
    'domain',
    'notes',
  ]) {
    if (data[k] !== undefined && data[k] !== null) out[k] = String(data[k]).trim();
  }
  return out;
}

// Test/util hook: reset in-memory state (used by tests with a temp file).
export function _resetForTests() {
  db = null;
}
