// Communication Layer — PII-safe observability (§4 of the night-mode brief).
//
// Goal: when a critical chain fails we must see WHERE it stopped without ever logging personal data,
// message content, or secrets. This module gives two things:
//   1) a stable STAGE + FAILURE_CLASS vocabulary so a log line points at the failing hop
//      (retrieval / extraction / analysis / evidence gate / mapping / serialization / state /
//       database / identity / provider / webhook / ai / delivery / threading / consent / config /
//       timeout / rate limit / dependency), and
//   2) a redacting formatter that is SAFE BY CONSTRUCTION: even if a caller passes an e-mail, phone
//      number, name, subject or body, it is redacted before it can reach a log sink.
//
// The redaction is the control; callers are still expected not to pass PII. Nothing here ever throws
// and nothing is emitted under NODE_ENV=test.

// Where in a chain something happened.
export const STAGE = Object.freeze({
  RETRIEVAL: 'retrieval', EXTRACTION: 'extraction', ANALYSIS: 'analysis', EVIDENCE_GATE: 'evidence_gate',
  MAPPING: 'mapping', SERIALIZATION: 'serialization', STATE: 'state', DATABASE: 'database',
  IDENTITY: 'identity', PROVIDER: 'provider', WEBHOOK: 'webhook', AI: 'ai', DELIVERY: 'delivery',
  THREADING: 'threading', CONSENT: 'consent', CONFIG: 'config', TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit', DEPENDENCY: 'dependency',
});

// A coarse failure class for an error, so alerting can group causes without reading messages.
export const FAILURE_CLASS = Object.freeze({
  TIMEOUT: 'timeout', DATABASE: 'database', PROVIDER: 'provider', DEPENDENCY: 'dependency',
  VALIDATION: 'validation', AUTH: 'auth', RATE_LIMIT: 'rate_limit', CONFIG: 'config', UNKNOWN: 'unknown',
});

// Keys whose VALUE is always redacted, regardless of content (defense in depth against a caller
// accidentally passing an identifier of a person).
const DENY_KEYS = new Set([
  'from', 'to', 'name', 'first_name', 'last_name', 'sender', 'recipient', 'subject', 'body', 'text',
  'email', 'mobile', 'phone', 'number', 'content', 'profile', 'profile_name', 'address',
]);

function looksLikePhone(s) {
  const digits = s.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15 && /^[+\d\s()-]+$/.test(s);
}

// Reduce a value to something safe to log: numbers/booleans pass; strings are capped and redacted
// when they look like an e-mail, a phone number, or free-form content.
export function redactValue(v) {
  if (v == null) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = String(v);
  if (s.length > 120) return '[redacted:len]';
  if (s.includes('@')) return '[redacted:pii]';
  if (looksLikePhone(s)) return '[redacted:pii]';
  return s;
}

// Format one observability line: `[area] stage k=v k=v`. Pure and PII-safe; used by the channel
// loggers and directly unit-tested.
export function format(area, stage, fields = {}) {
  const parts = [];
  for (const [k, v] of Object.entries(fields || {})) {
    if (v === undefined) continue;
    const safe = DENY_KEYS.has(k.toLowerCase()) ? '[redacted:key]' : redactValue(v);
    parts.push(`${k}=${safe}`);
  }
  return `[${area}] ${stage}${parts.length ? ' ' + parts.join(' ') : ''}`;
}

// Emit an observability line (no-op under test). Never throws.
export function obs(area, stage, fields = {}) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    // eslint-disable-next-line no-console
    console.log(format(area, stage, fields));
  } catch { /* logging must never break the primary action */ }
}

// Best-effort classification of an error into a FAILURE_CLASS, from its name/code only (never its
// message, which could carry PII).
export function classifyError(err) {
  if (!err) return FAILURE_CLASS.UNKNOWN;
  const name = String(err.name || '');
  const code = String(err.code || '');
  if (name === 'AbortError' || code === 'ETIMEDOUT') return FAILURE_CLASS.TIMEOUT;
  if (code.startsWith('ECONN') || code === 'ENOTFOUND' || code === 'EAI_AGAIN') return FAILURE_CLASS.DEPENDENCY;
  if (code.startsWith('23') || code.startsWith('42') || code === 'ECONNREFUSED') return FAILURE_CLASS.DATABASE; // pg SQLSTATE classes
  return FAILURE_CLASS.UNKNOWN;
}
