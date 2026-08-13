// Opaque invitation-token generation (brief §3, §13).
//
// Requirements:
//   - high entropy, non-guessable, opaque
//   - NO name / e-mail / company encoded in the token
//   - URL-safe so it can live in `{MACULIS_HOST}/?p=<token>`
//
// We use 32 cryptographically-random bytes (256 bits) encoded as base64url.
// That yields a ~43-char string with no padding and no PII.

import { randomBytes, randomUUID } from 'node:crypto';

export function generateToken() {
  return randomBytes(32).toString('base64url');
}

export function generateId() {
  return randomUUID();
}

// Build the personal Maculis link. The ONLY dynamic part is the opaque token;
// no personal data ever enters the URL.
export function personalUrl(maculisHost, token) {
  return `${maculisHost}/?p=${encodeURIComponent(token)}`;
}
