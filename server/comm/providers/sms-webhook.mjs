// SMS channel — inbound webhook signature verification + payload normalization.
//
// Selected route: Twilio (Programmable Messaging). Rationale (§9, §15): one provider can carry
// SMS + Voice (and can front WhatsApp), which reduces provider fragmentation, it has strong EU
// (Ireland/GDPR) support, and its request-signing scheme is stable and well-documented so we can
// verify it correctly. MessageBird/Bird (NL-native, MessageBird-Signature-JWT over URL+body with
// timestamp claims) stays a documented alternative; the outbound path is provider-neutral.
//
// Twilio signs each webhook with X-Twilio-Signature =
//   base64( HMAC-SHA1( authToken, fullURL + <each POST param key+value, keys sorted asc, no sep> ) )
// The URL must be the EXACT URL Twilio was configured to call (scheme+host+path, plus any query).
// Inbound SMS and delivery-status callbacks are BOTH application/x-www-form-urlencoded.
//
// Pure and dependency-free so the whole thing is testable offline without a Twilio account.

import { createHmac, timingSafeEqual } from 'node:crypto';

// Parse an application/x-www-form-urlencoded body into a flat object (last value wins, matching
// how Twilio's own validators read repeated keys is not required for signed inbound SMS).
export function parseForm(rawBody = '') {
  const params = new URLSearchParams(rawBody);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

// Build the exact string Twilio signs: the URL followed by each sorted param key immediately
// concatenated with its value.
export function twilioSignatureBase(url, params = {}) {
  let data = String(url);
  for (const key of Object.keys(params).sort()) data += key + params[key];
  return data;
}

function safeEqualB64(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

// Verify a Twilio webhook. Returns { ok, reason }. Fail-closed: no auth token => rejected.
export function verifyTwilioSignature({ authToken, url, params, signatureHeader }) {
  if (!authToken) return { ok: false, reason: 'no_auth_token' };
  if (!signatureHeader) return { ok: false, reason: 'missing_signature' };
  const expected = createHmac('sha1', authToken).update(twilioSignatureBase(url, params), 'utf8').digest('base64');
  return safeEqualB64(signatureHeader, expected) ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

// Test/local-sim helper: produce a valid X-Twilio-Signature.
export function signTwilioRequest({ authToken, url, params }) {
  return createHmac('sha1', authToken).update(twilioSignatureBase(url, params), 'utf8').digest('base64');
}

// Twilio message status -> our msg_delivery vocabulary.
const STATUS_MAP = {
  queued: 'QUEUED', accepted: 'QUEUED', scheduled: 'QUEUED',
  sending: 'DELIVERING', sent: 'SENT', delivered: 'DELIVERED', read: 'READ',
  undelivered: 'FAILED', failed: 'FAILED',
};

// Is this form payload an inbound message or a delivery-status callback? Inbound SMS carries a Body
// and no MessageStatus; a status callback carries MessageStatus/SmsStatus and no Body.
export function classifyTwilioForm(params = {}) {
  const status = params.MessageStatus || params.SmsStatus;
  if (status && params.Body == null) return 'status';
  if (params.Body != null || params.MessageSid || params.SmsSid) return 'inbound';
  return 'unknown';
}

// Canonical inbound from a Twilio inbound SMS form payload.
export function normalizeTwilioInbound(params = {}) {
  const media = [];
  const n = Number(params.NumMedia || 0);
  for (let i = 0; i < n; i += 1) {
    if (params[`MediaUrl${i}`]) media.push({ kind: 'media', url: params[`MediaUrl${i}`], mimeType: params[`MediaContentType${i}`] || null });
  }
  return {
    channel: 'SMS', provider: 'sms-twilio',
    providerMessageId: params.MessageSid || params.SmsSid || null,
    from: params.From || null,
    to: params.To || null,
    text: params.Body || '',
    media,
    at: null,
  };
}

// Canonical delivery status from a Twilio status callback form payload.
export function normalizeTwilioStatus(params = {}) {
  const raw = params.MessageStatus || params.SmsStatus || '';
  return {
    providerMessageId: params.MessageSid || params.SmsSid || null,
    state: STATUS_MAP[raw] || null,
    errorReason: params.ErrorCode ? `twilio_${params.ErrorCode}` : null,
  };
}
