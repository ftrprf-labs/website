// WhatsApp Business Cloud API — webhook signature verification + payload normalization.
//
// Inbound WhatsApp is UNTRUSTED external input, exactly like inbound e-mail. Meta signs every
// webhook POST with an app-secret HMAC in the `x-hub-signature-256` header (`sha256=<hex>`), computed
// over the RAW request body. We verify that signature with a constant-time compare BEFORE anything
// is trusted, then normalize the (deeply nested) Meta payload into the same canonical inbound shape
// the rest of the Communication Layer already consumes (channel-inbound.mjs / receiveChannelInbound).
//
// This is the official WhatsApp Business Platform (Cloud API) route only — NEVER browser automation
// or WhatsApp Web scraping (§8, §14). Pure and dependency-free so the whole thing is testable offline
// without a provider account or a database.
//
// Replay protection: Meta's signature carries no timestamp, so we do not get a native replay window
// (unlike Svix e-mail). Replay is instead defended downstream by idempotency on providerMessageId
// (receiveChannelInbound dedups; delivery-status application is also idempotent). Do not treat a
// valid signature alone as proof of freshness.

import { createHmac, timingSafeEqual } from 'node:crypto';

// ---- signature (POST) -----------------------------------------------------------------------

function safeEqualHex(a, b) {
  // Both must be valid, equal-length hex before timingSafeEqual (which throws on length mismatch).
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let ab; let bb;
  try { ab = Buffer.from(a, 'hex'); bb = Buffer.from(b, 'hex'); } catch { return false; }
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

// Verify a WhatsApp/Meta webhook POST. `signatureHeader` is the exact `x-hub-signature-256` value,
// `rawBody` is the exact bytes/string received (NEVER a re-serialised JSON). Returns { ok, reason }.
export function verifyMetaSignature({ appSecret, rawBody, signatureHeader }) {
  if (!appSecret) return { ok: false, reason: 'no_app_secret' };
  if (!signatureHeader || typeof signatureHeader !== 'string') return { ok: false, reason: 'missing_signature' };
  const eq = signatureHeader.indexOf('=');
  const scheme = eq >= 0 ? signatureHeader.slice(0, eq) : '';
  const provided = eq >= 0 ? signatureHeader.slice(eq + 1) : '';
  if (scheme !== 'sha256' || !provided) return { ok: false, reason: 'bad_signature_format' };
  const expected = createHmac('sha256', appSecret).update(rawBody ?? '', 'utf8').digest('hex');
  return safeEqualHex(provided, expected) ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

// Test/local-sim helper: produce a valid `x-hub-signature-256` value for a raw body.
export function signMetaBody({ appSecret, rawBody }) {
  const sig = createHmac('sha256', appSecret).update(rawBody ?? '', 'utf8').digest('hex');
  return `sha256=${sig}`;
}

// ---- verification challenge (GET) -----------------------------------------------------------

// Meta verifies webhook ownership with a GET carrying hub.mode=subscribe, hub.verify_token and
// hub.challenge. When the token matches our configured verify token we must echo the challenge
// verbatim with 200; otherwise 403. Returns { ok, challenge } / { ok:false, reason }.
export function verifyChallenge({ mode, token, challenge, expectedToken }) {
  if (!expectedToken) return { ok: false, reason: 'not_configured' };
  if (mode !== 'subscribe') return { ok: false, reason: 'bad_mode' };
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing_token' };
  // Constant-time compare so the verify token is not learnable by timing.
  const a = Buffer.from(token); const b = Buffer.from(expectedToken);
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) return { ok: false, reason: 'token_mismatch' };
  return { ok: true, challenge: challenge == null ? '' : String(challenge) };
}

// ---- payload normalization ------------------------------------------------------------------

function textOfMessage(msg) {
  if (!msg || typeof msg !== 'object') return '';
  switch (msg.type) {
    case 'text': return (msg.text && msg.text.body) || '';
    // Interactive replies (buttons / list) carry the human-readable title.
    case 'interactive': {
      const i = msg.interactive || {};
      return (i.button_reply && i.button_reply.title) || (i.list_reply && i.list_reply.title) || '';
    }
    case 'button': return (msg.button && msg.button.text) || '';
    // Media types may carry a caption; the binary itself is referenced by id, never fetched here.
    case 'image': return (msg.image && msg.image.caption) || '';
    case 'video': return (msg.video && msg.video.caption) || '';
    case 'document': return (msg.document && msg.document.caption) || '';
    default: return '';
  }
}

function mediaOfMessage(msg) {
  if (!msg || typeof msg !== 'object') return [];
  const kind = msg.type;
  const node = ['image', 'video', 'document', 'audio', 'sticker'].includes(kind) ? msg[kind] : null;
  if (!node) return [];
  // Reference only: media id + mime + filename. The binary is retrieved later via the Media API
  // with the access token; we never embed provider media bytes in the webhook path.
  return [{ kind, mediaId: node.id || null, mimeType: node.mime_type || null, filename: node.filename || null }];
}

const STATUS_TO_DELIVERY = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };

// Normalize a raw Meta webhook payload into canonical inbound messages + delivery statuses.
// Returns { messages: [...], statuses: [...] } and never throws on malformed input (returns empties).
// Each message: { channel:'WHATSAPP', provider, providerMessageId, from, to, text, media, at, replyTo, profileName }
// Each status:  { providerMessageId, state, recipient, at, errorReason }
export function normalizeWhatsAppPayload(payload = {}) {
  const messages = [];
  const statuses = [];
  const entries = Array.isArray(payload && payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry && entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = (change && change.value) || {};
      const phoneNumberId = (value.metadata && value.metadata.phone_number_id) || null;
      // Profile names are keyed by wa_id so an unknown sender still shows a human label in the Inbox.
      const profileByWaId = {};
      for (const c of (Array.isArray(value.contacts) ? value.contacts : [])) {
        if (c && c.wa_id) profileByWaId[c.wa_id] = (c.profile && c.profile.name) || null;
      }
      for (const msg of (Array.isArray(value.messages) ? value.messages : [])) {
        if (!msg || typeof msg !== 'object') continue;
        messages.push({
          channel: 'WHATSAPP',
          provider: 'whatsapp-cloud',
          providerMessageId: msg.id || null,
          from: msg.from || null,
          to: phoneNumberId,
          type: msg.type || null,
          text: textOfMessage(msg),
          media: mediaOfMessage(msg),
          at: msg.timestamp || null,
          replyTo: (msg.context && msg.context.id) || null,
          profileName: (msg.from && profileByWaId[msg.from]) || null,
        });
      }
      for (const st of (Array.isArray(value.statuses) ? value.statuses : [])) {
        if (!st || typeof st !== 'object') continue;
        const err = Array.isArray(st.errors) && st.errors[0] ? st.errors[0] : null;
        statuses.push({
          providerMessageId: st.id || null,
          state: STATUS_TO_DELIVERY[st.status] || null,
          recipient: st.recipient_id || null,
          at: st.timestamp || null,
          errorReason: err ? (err.title || err.code || 'error') : null,
        });
      }
    }
  }
  return { messages, statuses };
}
