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
import { config, DEFAULT_TEMPLATE, PREVIOUS_DEFAULT_TEMPLATE } from './config.mjs';
import { generateId, generateToken } from './tokens.mjs';
import { normalizePersonName, normalizeCompany } from './normalize.mjs';

// Lifecycle model (definitief): DRAFT → SENT → OPENED → COMPLETED.
//   DRAFT     = tester bestaat, uitnodiging nog niet verzonden.
//   SENT      = uitnodiging daadwerkelijk verzonden (WhatsApp of e-mail).
//   OPENED    = de persoonlijke ?p=<token>-link is minimaal één keer echt geopend (echt event).
//   COMPLETED = de volledige First Five Journey is afgerond (echt session_completed-event).
// DECLINED/ERROR blijven administratieve terminale toestanden buiten de ladder.
const STATUSES = ['DRAFT', 'SENT', 'OPENED', 'COMPLETED', 'DECLINED', 'ERROR'];
// Legacy → nieuw. Records geschreven vóór dit model dragen INVITED/STARTED; die
// mappen we bij load() forward-safe (additief, nooit terugval): INVITED→SENT, STARTED→OPENED.
const LEGACY_STATUS = { INVITED: 'SENT', STARTED: 'OPENED' };
// Consent is a THIRD, independent dimension — never mixed with lifecycle status.
const CONSENT = ['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'];
// How a manual OPTED_IN was obtained — STABLE machine values for consistent
// registration/audit/reporting (the UI shows Dutch labels). OTHER carries a short
// free-text toelichting in consent_note. Legacy records keep their free-text
// consent_note with consent_method = null (backwards compatible).
const CONSENT_METHODS = ['VERBAL', 'PHONE', 'EMAIL', 'WHATSAPP', 'WRITTEN', 'OTHER'];

// Provenance (brief §6). Only real sources; `pass_the_lens` is RESERVED for the
// future intake — no intake is built in Step 3. `unknown` is used for legacy
// records whose origin we cannot reliably determine (brief §16).
const SOURCES = ['manual', 'csv', 'xlsx', 'import', 'pass_the_lens', 'unknown'];

// Append-only history event vocabulary (brief §3). History is an OBSERVATION
// layer (brief §20): it records what happened; it never drives status/consent.
const EVENTS = [
  'tester_created',
  'invitation_sent',
  'invitation_failed',
  'invitation_skipped',
  'invitation_blocked',
  'journey_started',
  'evaluation_started',
  'evaluation_completed',
  'consent_recorded',
  'consent_changed',
  'published_to_maculis',
  // Pass the Lens: an existing tester/relation introduced this person. Observation
  // only; never drives status/consent. The introducer link lives in `introductions`.
  'pass_the_lens_introduction',
];

// A single history entry: { at, event, channel?, result? }. No PII, no bodies,
// no links, no tokens (brief §2, §18) — only the minimal facts of an event.
function historyEntry(event, { channel = null, result = null, at = null, source = null } = {}) {
  const entry = { at: at || new Date().toISOString(), event };
  if (channel) entry.channel = channel;
  if (result) entry.result = result;
  // Relevant provenance/context for the event (brief §17) — e.g. the intake
  // source for a consent event. Never a token, secret or PII.
  if (source) entry.source = source;
  return entry;
}

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
    consent_status: 'UNKNOWN',
    consent_at: null,
    // Consent provenance (brief §3/§5): where an explicit consent choice came
    // from and which consent version, when known. null until a real signal.
    consent_source: null,
    consent_version: null,
    // How a manual/admin consent was obtained (the lawful basis note, brief §1).
    // Required when an admin records OPTED_IN by hand. No sensitive data.
    consent_note: null,
    // Standardised machine value for the manual-consent method (VERBAL/PHONE/EMAIL/
    // WHATSAPP/WRITTEN/OTHER). null for legacy free-text-only records. OTHER keeps its
    // short toelichting in consent_note.
    consent_method: null,
    source: 'manual',
    // Pass the Lens provenance (append-only). Each entry records that an existing
    // tester/relation introduced this person: { at, by_id, by_name, by_company,
    // source_journey }. A list so a repeat introduction is visible, never a silent
    // overwrite (brief §8). No secrets/tokens; by_id links to the introducer record.
    introductions: [],
    // Stable identity of the PERSON (not the session token, brief §7). Derived
    // from normalised e-mail (primary) or mobile, scoped by campaign.
    person_key: null,
    notes: '',
    created_at: null,
    invited_at: null,
    started_at: null,
    completed_at: null,
    history: [],
  };
}

// Person identity for dedup (brief §7). Deliberately NOT the participant/session
// token: it identifies the human, scoped to a campaign, from the same fields the
// existing importer dedups on (e-mail primary, mobile fallback).
export function personKey(record, campaign = config.campaign) {
  const email = (record.email || '').trim().toLowerCase();
  const mobile = normaliseMobile(record.mobile || '');
  const id = email || mobile;
  return id ? `${campaign || ''}|${id}` : null;
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
    const invitations = Array.isArray(parsed.invitations) ? parsed.invitations : [];
    // Forward-safe defaults for records written by an older version. Additive
    // only — no existing field is ever removed or reset (brief §16).
    for (const r of invitations) {
      // Forward-safe status-migratie (additief, nooit terugval): INVITED→SENT, STARTED→OPENED.
      if (r.status && LEGACY_STATUS[r.status]) r.status = LEGACY_STATUS[r.status];
      if (r.consent_status === undefined) r.consent_status = 'UNKNOWN';
      if (r.consent_at === undefined) r.consent_at = null;
      // History defaults to empty. We do NOT back-fill synthetic events for
      // records that predate history — their past is genuinely unknown.
      if (!Array.isArray(r.history)) r.history = [];
      // Pass the Lens introductions default to empty (additive, never invented).
      if (!Array.isArray(r.introductions)) r.introductions = [];
      // Provenance: we cannot reliably tell how a legacy record was created,
      // so we record `unknown` rather than inventing a source (brief §16).
      if (r.source === undefined) r.source = 'unknown';
      // Consent provenance defaults — no invented source/version (brief §18).
      if (r.consent_source === undefined) r.consent_source = null;
      if (r.consent_version === undefined) r.consent_version = null;
      if (r.consent_note === undefined) r.consent_note = null;
      // Legacy records predate the standardised method: keep their free-text note, method null.
      if (r.consent_method === undefined) r.consent_method = null;
      // Backfill the person key from the record's own contact data (safe,
      // deterministic — derived, not invented).
      if (r.person_key === undefined) r.person_key = personKey(r, r.campaign);
    }
    // Upgrade an UNMODIFIED stored template to the new invitation copy (dynamic sender). If the
    // admin customised a field, their version is kept; only fields still equal to the previous
    // seed are replaced. Additive and non-destructive (brief §16).
    const storedTpl = { ...(parsed.template || {}) };
    for (const key of ['whatsapp', 'emailSubject', 'emailBody']) {
      if (storedTpl[key] === undefined || storedTpl[key] === PREVIOUS_DEFAULT_TEMPLATE[key]) {
        storedTpl[key] = DEFAULT_TEMPLATE[key];
      }
    }
    db = {
      invitations,
      template: { ...DEFAULT_TEMPLATE, ...storedTpl },
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

// Robust phone normalisation to a digits-only INTERNATIONAL recipient id (no '+').
// This is the single choke point for both the WhatsApp recipient and dedup, so
// every Dutch input variant maps to the same identifier:
//   0629538336 / 06 2953 8336 / 06-29538336 / +31 6 2953 8336 /
//   0031 6 2953 8336 / 31629538336   ->  31629538336
// Dutch national numbers (leading 0) get the NL country code. Numbers that are
// not a plausible international length return '' (fail-closed: no broken link).
const DEFAULT_COUNTRY = '31'; // NL — MACULIS_FIRST_FIVE is a Dutch campaign
export function normaliseMobile(raw) {
  if (!raw) return '';
  const hasPlus = String(raw).trim().startsWith('+');
  let s = String(raw).replace(/\D/g, ''); // keep digits only
  if (!s) return '';
  if (hasPlus) {
    // +<country><number> — already international
  } else if (s.startsWith('00')) {
    s = s.slice(2);                        // 00<country> -> <country>
  } else if (s.startsWith('0')) {
    s = DEFAULT_COUNTRY + s.slice(1);      // national 0X… -> 31X…
  }
  // else: no 0/00/+ prefix -> assume already international (e.g. 31629538336)
  return /^\d{8,15}$/.test(s) ? s : '';    // fail-closed on implausible numbers
}

export function createInvitation(data) {
  const now = new Date().toISOString();
  const source = SOURCES.includes(data && data.source) ? data.source : 'manual';
  const campaign = (data && data.campaign) ? String(data.campaign).trim() : config.campaign;
  const record = {
    ...emptyRecord(),
    ...pickFields(data),
    id: generateId(),
    token: generateToken(),
    campaign,
    status: 'DRAFT',
    source,
    created_at: now,
    // First history event: the tester exists. No channel/result — creation is
    // not an outbound action. Provenance is carried in `source`.
    history: [historyEntry('tester_created', { at: now, source })],
  };
  // Person identity for dedup, derived from the final record (brief §7).
  record.person_key = personKey(record, campaign);
  ready().invitations.push(record);
  persist();
  return { ...record };
}

// Find an existing tester for the SAME PERSON (brief §7). Uses the person key
// (e-mail/mobile within campaign); never the participant/session token.
export function findByPersonKey(candidate, campaign = config.campaign) {
  const key = personKey(candidate, campaign);
  if (!key) return null;
  return ready().invitations.find((r) => (r.person_key || personKey(r, r.campaign)) === key) || null;
}

export function updateInvitation(id, patch) {
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  Object.assign(r, pickFields(patch));
  // Keep the person key in sync when contact details change.
  r.person_key = personKey(r, r.campaign);
  persist();
  return { ...r };
}

// Automatic intake from an external journey (Pass the Lens, brief §6-§9).
// Dedups by person key, NEVER resets an existing tester's lifecycle, and records
// consent only for an EXPLICIT choice (a journey completion is not an opt-in).
export function intake(payload) {
  const contact = {
    first_name: payload.first_name,
    last_name: payload.last_name,
    company_name: payload.company_name ?? payload.company,
    email: payload.email,
    mobile: payload.mobile,
    domain: payload.domain,
  };
  const campaign = (payload.campaign && String(payload.campaign).trim()) || config.campaign;
  const existing = findByPersonKey(contact, campaign);
  let rec, created;
  if (existing) {
    created = false;
    // Existing person: refresh contact details only — lifecycle stays put (§9).
    updateInvitation(existing.id, contact);
    rec = getInvitation(existing.id);
  } else {
    created = true;
    rec = createInvitation({ ...contact, campaign, source: 'pass_the_lens' });
  }
  // Provenance (brief §3/§5/§9): record WHO introduced this person, resolved from
  // the introducer's own token against our store (the referrer never re-enters their
  // details). Append-only so a repeat introduction is visible (§8), never a silent
  // overwrite. by_id links to the introducer record; by_name/by_company are a
  // denormalised convenience for the admin view. Only meaningful for a real referral.
  if (payload.introducer_token || payload.introducer_name) {
    const introducer = payload.introducer_token ? getByToken(payload.introducer_token) : null;
    recordIntroduction(rec.id, {
      by_id: introducer ? introducer.id : null,
      by_name: introducer
        ? [introducer.first_name, introducer.last_name].filter(Boolean).join(' ').trim() || null
        : (payload.introducer_name || null),
      by_company: introducer ? (introducer.company_name || null) : (payload.introducer_company || null),
      source_journey: payload.source_journey || 'first_five',
    });
    rec = getInvitation(rec.id);
  }
  // Consent: only OPTED_IN / OPTED_OUT is an explicit choice. UNKNOWN never
  // overwrites an existing choice and is never treated as an opt-in (§3, §10).
  let consentApplied = false;
  const c = payload.consent_status;
  if (c === 'OPTED_IN' || c === 'OPTED_OUT') {
    const cur = getInvitation(rec.id);
    const src = payload.consent_source || 'pass_the_lens';
    if (cur.consent_status !== c || cur.consent_source !== src) {
      setConsent(rec.id, c, { source: src, version: payload.consent_version ?? null, at: payload.consent_at || undefined });
      consentApplied = true;
    }
  }
  return { created, invitation: getInvitation(rec.id), consentApplied };
}

// Status transition with automatic timestamping (brief §9).
export function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  r.status = status;
  const now = new Date().toISOString();
  // invited_at/started_at behouden hun veldnaam (backward-compatible), maar dragen nu de
  // SENT- resp. OPENED-timestamp. completed_at ongewijzigd.
  if (status === 'SENT' && !r.invited_at) r.invited_at = now;
  if (status === 'OPENED' && !r.started_at) r.started_at = now;
  if (status === 'COMPLETED' && !r.completed_at) r.completed_at = now;
  persist();
  return { ...r };
}

// Monotonic lifecycle upgrade from Maculis session facts (system-driven).
// Only moves FORWARD along DRAFT→INVITED→STARTED→COMPLETED, and never touches
// administrative/terminal states outside that ladder (e.g. DECLINED, ERROR).
const LADDER = ['DRAFT', 'SENT', 'OPENED', 'COMPLETED'];
export function applySessionStatus(id, started, completed) {
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  if (!LADDER.includes(r.status)) return { ...r }; // leave DECLINED/ERROR/etc. as-is
  const rank = (s) => LADDER.indexOf(s);
  let target = r.status;
  // `started` = the personal link was really opened (session captured) → OPENED.
  // `completed` = the Journey was really finished → COMPLETED. Monotone: forward only.
  if (started && rank('OPENED') > rank(target)) target = 'OPENED';
  if (completed && rank('COMPLETED') > rank(target)) target = 'COMPLETED';
  if (target !== r.status) return setStatus(id, target);
  return { ...r };
}

// Consent is an independent dimension — this never touches the lifecycle status.
// opts: { source, version, at } record where an explicit choice came from and
// which consent version (brief §3/§5). The first consent from a source logs
// `consent_recorded`; a later change logs `consent_changed`.
export function setConsent(id, consent, opts = {}) {
  if (!CONSENT.includes(consent)) throw new Error(`Onbekende consentwaarde: ${consent}`);
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  if (!Array.isArray(r.history)) r.history = [];
  const at = opts.at || new Date().toISOString();
  const firstConsent = !r.history.some((h) => h.event === 'consent_recorded' || h.event === 'consent_changed');
  r.consent_status = consent;
  r.consent_at = at;
  if (opts.source !== undefined) r.consent_source = opts.source || null;
  if (opts.version !== undefined) r.consent_version = opts.version || null;
  if (opts.note !== undefined) r.consent_note = opts.note || null;
  if (opts.method !== undefined) r.consent_method = opts.method || null;
  // History records the change; it does NOT drive consent (brief §10, §20).
  r.history.push(historyEntry(firstConsent ? 'consent_recorded' : 'consent_changed',
    { at, result: consent.toLowerCase(), source: opts.source || null }));
  persist();
  return { ...r };
}

// ---- History (append-only observation layer, brief §2/§3/§20) ------------

// Append a real event that has actually happened. Never changes status/consent.
export function addEvent(id, event, opts = {}) {
  if (!EVENTS.includes(event)) throw new Error(`Onbekend history-event: ${event}`);
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  if (!Array.isArray(r.history)) r.history = [];
  r.history.push(historyEntry(event, opts));
  persist();
  return { ...r };
}

// Idempotent variant for Maculis-derived milestones (journey/evaluation) that
// are observed repeatedly on each poll — record the FIRST observation only, at
// the real Maculis timestamp when known. Prevents duplicate timeline entries.
export function recordEventOnce(id, event, opts = {}) {
  if (!EVENTS.includes(event)) throw new Error(`Onbekend history-event: ${event}`);
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  if (!Array.isArray(r.history)) r.history = [];
  if (r.history.some((h) => h.event === event)) return { ...r };
  r.history.push(historyEntry(event, opts));
  persist();
  return { ...r };
}

// Record a Pass the Lens introduction (brief §3/§8/§9): append the introducer link
// to `introductions` (never overwrite → a repeat referral stays visible) and add one
// observational history event. Never touches lifecycle or consent. `intro` carries
// { by_id, by_name, by_company, source_journey } — no tokens/secrets.
export function recordIntroduction(id, intro = {}) {
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  if (!Array.isArray(r.introductions)) r.introductions = [];
  const entry = {
    at: new Date().toISOString(),
    by_id: intro.by_id || null,
    by_name: intro.by_name || null,
    by_company: intro.by_company || null,
    source_journey: intro.source_journey || 'first_five',
  };
  r.introductions.push(entry);
  r.history.push(historyEntry('pass_the_lens_introduction', { source: 'pass_the_lens' }));
  persist();
  return { ...r };
}

// Read-only dossier for one tester: provenance + the current dimension values
// + the full chronological history. No PII beyond what the admin list holds.
export function getHistory(id) {
  const r = ready().invitations.find((x) => x.id === id);
  if (!r) return null;
  return {
    id: r.id,
    source: r.source || 'unknown',
    lifecycle: r.status,
    consent_status: r.consent_status,
    consent_at: r.consent_at,
    consent_source: r.consent_source || null,
    consent_version: r.consent_version || null,
    consent_method: r.consent_method || null,
    created_at: r.created_at,
    invited_at: r.invited_at,
    started_at: r.started_at,
    completed_at: r.completed_at,
    introductions: (r.introductions || []).map((i) => ({ ...i })),
    history: (r.history || []).map((h) => ({ ...h })),
  };
}

// Fail-closed contact gate (brief §1): the ONLY state that permits outbound
// contact is an explicit OPTED_IN. UNKNOWN (incl. "Nog niet") and OPTED_OUT both
// block e-mail, WhatsApp, publish and the transition to INVITED. No proven
// opt-in = no contact.
export function mayContact(idOrRecord) {
  const r = typeof idOrRecord === 'string'
    ? ready().invitations.find((x) => x.id === idOrRecord)
    : idOrRecord;
  return Boolean(r && r.consent_status === 'OPTED_IN');
}

// Kept for reason-code messaging: distinguishes an explicit refusal/withdrawal
// (OPTED_OUT) from merely-absent consent (UNKNOWN). Not the contact gate.
export function isOptedOut(idOrRecord) {
  const r = typeof idOrRecord === 'string'
    ? ready().invitations.find((x) => x.id === idOrRecord)
    : idOrRecord;
  return Boolean(r && r.consent_status === 'OPTED_OUT');
}

export { CONSENT, CONSENT_METHODS };

export function deleteInvitation(id) {
  const list = ready().invitations;
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  persist();
  return true;
}

// --- Retentie (privacy by design) --------------------------------------------
// Conform de privacyverklaring bewaren we uitnodigings-/testergegevens niet langer
// dan 12 maanden na afronding (COMPLETED) of intrekking (OPTED_OUT). Lopende records
// (DRAFT/INVITED/STARTED) vallen niet onder deze termijn en blijven staan. We
// verwijderen pas als de LAATSTE relevante gebeurtenis meer dan 12 maanden geleden is
// (conservatief — nooit voortijdig). Verwijderen ontkoppelt tegelijk de bijbehorende
// First Five-antwoorden: die zijn alleen via het token aan de persoon te herleiden.
const RETENTION_MS = 365 * 24 * 60 * 60 * 1000; // ~12 maanden

function retentionExpiry(r) {
  const stamps = [];
  if (r.status === 'COMPLETED' && r.completed_at) stamps.push(Date.parse(r.completed_at));
  if (r.consent_status === 'OPTED_OUT' && r.consent_at) stamps.push(Date.parse(r.consent_at));
  const valid = stamps.filter((n) => Number.isFinite(n));
  return valid.length ? Math.max(...valid) : null;
}

// Verwijder verlopen records. Geen PII in de return — alleen het aantal verwijderd.
export function pruneExpired({ now = Date.now() } = {}) {
  const d = ready();
  const before = d.invitations.length;
  d.invitations = d.invitations.filter((r) => {
    const expiry = retentionExpiry(r);
    return expiry === null || now - expiry <= RETENTION_MS;
  });
  const removed = before - d.invitations.length;
  if (removed > 0) persist();
  return removed;
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

export { STATUSES, SOURCES, EVENTS };

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
  // Real name normalisation (brief §36) — one choke point for every write route.
  if (out.first_name !== undefined) out.first_name = normalizePersonName(out.first_name);
  if (out.last_name !== undefined) out.last_name = normalizePersonName(out.last_name);
  if (out.company_name !== undefined) out.company_name = normalizeCompany(out.company_name);
  return out;
}

// Test/util hook: reset in-memory state (used by tests with a temp file).
export function _resetForTests() {
  db = null;
}
