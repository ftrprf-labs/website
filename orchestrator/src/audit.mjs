// Audit log (brief §50). Append-only, capped, no secrets, no PII.
//
// Every meaningful lifecycle event is recorded so GitHub + this log together form
// the audit trail — we are not dependent on three chat windows for project
// administration (brief §20). store.mjs does not import this file, so importing
// the store here is safe (no cycle).

import { tx, snapshot } from './store.mjs';

// Keys whose values must never be written verbatim to the audit log.
const REDACT = /(token|secret|password|api[_-]?key|authorization|mobile|email|phone)/i;

function redact(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT.test(k)) out[k] = '[redacted]';
    else if (typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export function audit(event, data = {}) {
  const entry = { at: new Date().toISOString(), event, ...redact(data) };
  tx((db) => { db.audit.push(entry); });
  // Operational logging (brief §28/§63): when enabled, mirror the REDACTED audit
  // entry to stdout so it shows up in the host's log stream. Never contains
  // secrets/PII (redact() + we only ever pass structured event metadata, never
  // request text, agent output, or contact data).
  if (process.env.MACULIS_LOG_STDOUT) console.log('[audit] ' + JSON.stringify(entry));
  return entry;
}

export function tail(n = 50, taskId = null) {
  const all = snapshot().audit;
  const filtered = taskId ? all.filter((e) => e.task_id === taskId) : all;
  return filtered.slice(-n);
}
