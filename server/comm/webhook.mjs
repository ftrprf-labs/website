// Communication Layer — Resend/Svix webhook signature verification.
//
// Inbound e-mail is UNTRUSTED external input. Every webhook is verified against the signing
// secret (Svix format) over the RAW request body before anything is trusted, with a replay
// window. Verification uses a constant-time compare and accepts any of the (possibly multiple)
// signatures Svix may send.
//
// Secret format: `whsec_<base64>`. The prefix is stripped and the remainder base64-decoded to
// get the HMAC key. Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`.

import { createHmac, timingSafeEqual } from 'node:crypto';

const FIVE_MIN_MS = 5 * 60 * 1000;

function decodeSecret(secret) {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  return Buffer.from(raw, 'base64');
}

function safeEqualB64(a, b) {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Verify a webhook. `headers` is the raw header map (lowercased keys), `rawBody` is the exact
// bytes/string received (NEVER a re-serialised JSON). Returns { ok, reason }.
export function verifyWebhook({ headers, rawBody, secret, now = Date.now() }) {
  if (!secret) return { ok: false, reason: 'no_secret' };
  const id = headers['svix-id'] || headers['webhook-id'];
  const ts = headers['svix-timestamp'] || headers['webhook-timestamp'];
  const sigHeader = headers['svix-signature'] || headers['webhook-signature'];
  if (!id || !ts || !sigHeader) return { ok: false, reason: 'missing_headers' };

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs)) return { ok: false, reason: 'bad_timestamp' };
  if (Math.abs(now - tsMs) > FIVE_MIN_MS) return { ok: false, reason: 'timestamp_out_of_window' };

  const key = decodeSecret(secret);
  const signedContent = `${id}.${ts}.${rawBody}`;
  const expected = createHmac('sha256', key).update(signedContent).digest('base64');

  // Header carries space-separated "v1,<sig>" entries; any match is valid.
  const provided = String(sigHeader).split(' ').map((p) => {
    const comma = p.indexOf(',');
    return comma >= 0 ? p.slice(comma + 1) : p;
  });
  const match = provided.some((sig) => safeEqualB64(sig, expected));
  return match ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

// Test/helper: produce a valid Svix signature for a body (used by inbound tests + local sim).
export function signWebhook({ id, timestamp, rawBody, secret }) {
  const key = decodeSecret(secret);
  const sig = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${sig}` };
}
