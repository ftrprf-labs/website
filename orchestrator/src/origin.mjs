// Origin envelope (Origin & Return architecture).
//
// A first-class, machine-readable record of WHERE an epic/task came from and
// WHERE its result must return. Backward compatible: submissions without an origin
// are marked legacy/unknown — we never invent an origin for historical records.
//
// Anti-forgery: `submitted_by` is set by the server from the authenticated caller
// identity (identity.mjs), never from the request body. The caller MAY declare
// context (type/id/project/return_destination), but not who they are.

import { randomUUID } from 'node:crypto';

export const ORIGIN_TYPES = ['specialist-chat', 'api', 'mcp', 'cli', 'system', 'unspecified'];
export const RETURN_KINDS = ['poll', 'webhook', 'mcp', 'none'];
export const DELIVERY_STATES = ['not_ready', 'pending', 'delivered', 'failed'];

// Marks records that predate the origin envelope. Never fabricates a source.
export const LEGACY_ORIGIN = Object.freeze({
  type: 'unspecified', id: null, project: null,
  submitted_by: 'unknown', submitted_at: null, correlation_id: null,
  return_destination: { kind: 'none' }, legacy: true,
});

function str(v, max = 200) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function normReturn(rd) {
  if (!rd || typeof rd !== 'object') return { kind: 'poll' };   // default: origin retrieves by polling
  const kind = RETURN_KINDS.includes(rd.kind) ? rd.kind : 'poll';
  const out = { kind };
  const ref = str(rd.ref, 500);
  if (ref) out.ref = ref;         // e.g. a webhook URL; validated at dispatch time
  return out;
}

// Build a canonical origin envelope. `declared` is caller-supplied context;
// `submittedBy` is the server-authenticated identity (cannot be overridden).
export function makeOrigin(declared = {}, { submittedBy = 'unknown', now = new Date().toISOString() } = {}) {
  const d = declared && typeof declared === 'object' ? declared : {};
  return {
    type: ORIGIN_TYPES.includes(d.type) ? d.type : 'unspecified',
    id: str(d.id),
    project: str(d.project, 120),
    submitted_by: str(submittedBy) || 'unknown',   // server-set, anti-forgery
    submitted_at: now,
    correlation_id: str(d.correlation_id, 120) || randomUUID(),
    return_destination: normReturn(d.return_destination),
  };
}

// A child (sub-task) inherits the epic origin but keeps its own provenance clear.
// Only an explicit, non-empty override may diverge (rare; documented at call site).
export function inheritOrigin(parentOrigin, override = null) {
  if (!parentOrigin) return null;
  const base = { ...parentOrigin, inherited_from_epic: true };
  if (override && typeof override === 'object') return { ...base, ...override, inherited_from_epic: false };
  return base;
}

// Read an origin off a record, never inventing one for legacy data.
export function readOrigin(record) {
  return record && record.origin ? record.origin : LEGACY_ORIGIN;
}
