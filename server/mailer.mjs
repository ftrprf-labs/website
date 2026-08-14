// E-mail sending contract for the Invitation Manager.
//
// This is a thin transport layer — NOT a mail server. It never fake-sends, and
// it never lets a NON-delivering transport move a tester to INVITED.
//
// Lifecycle rule (brief §Fase1): INVITED means an invitation was PROVABLY sent.
// Therefore only a REAL delivering transport that returns a confirmed success
// counts as `delivered:true`. Every result carries an explicit `delivered` flag;
// the caller marks INVITED *only* when `delivered === true`.
//
// Transports (selected by MAIL_TRANSPORT):
//   ''    → not configured (default). Nothing is sent; delivered:false.
//   http  → POST each message to MAIL_API_URL, optionally with a Bearer key.
//           This is the seam for the environment's real mail infrastructure
//           (a transactional-mail HTTP API). A confirmed 2xx is delivered:true.
//   mock  → deterministic TEST transport for local verification ONLY. It does
//           NOT touch the network and does NOT deliver: it always returns
//           delivered:false (reason 'mock'), so it can never cause INVITED.
//           Sentinel addresses (bounce@… / …@fail.…) still model a failure.
//
// Privacy: this module never logs recipients, subjects, bodies or links.

import { config } from './config.mjs';

// Resend's transactional-email API endpoint (fixed; only the key/from vary).
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// True only when a REAL delivering transport is configured. mock and unset are
// NOT "configured" for lifecycle/UI purposes — nothing is actually delivered.
//   resend → needs an API key AND a verified from-address.
//   http   → needs a POST endpoint.
export function mailDelivers() {
  if (config.mailTransport === 'resend') {
    return Boolean(config.mailApiKey) && Boolean(config.mailFrom);
  }
  return config.mailTransport === 'http' && Boolean(config.mailApiUrl);
}

// Back-compat alias (same meaning): does a real send actually happen?
export function mailConfigured() {
  return mailDelivers();
}

// Returns { ok, delivered, reason }. `delivered:true` ONLY for a real transport
// with a confirmed successful response — the sole trigger for INVITED.
export async function sendEmail({ to, subject, body }) {
  if (!to) return { ok: false, delivered: false, reason: 'no_email' };

  const transport = config.mailTransport;

  if (transport === 'mock') {
    // Test transport: offline, NEVER delivers. Sentinel addresses model a bounce.
    if (/^bounce@/i.test(to) || /@fail\./i.test(to)) return { ok: false, delivered: false, reason: 'bounce' };
    return { ok: true, delivered: false, reason: 'mock' };
  }

  if (transport === 'resend') {
    // Real transactional send via Resend. Requires a verified from-address and
    // an API key (both env vars, never in code). A confirmed 2xx → delivered.
    if (!config.mailApiKey || !config.mailFrom) return { ok: false, delivered: false, reason: 'not_configured' };
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.mailApiKey}`,
        },
        // Resend contract: { from, to, subject, text }. Plain text only (the body
        // already carries the personal link); no HTML, no tracking pixels.
        body: JSON.stringify({ from: config.mailFrom, to, subject, text: body }),
      });
      if (res.ok) return { ok: true, delivered: true };
      return { ok: false, delivered: false, reason: `resend_${res.status}` };
    } catch {
      return { ok: false, delivered: false, reason: 'network' };
    }
  }

  if (transport === 'http') {
    if (!config.mailApiUrl) return { ok: false, delivered: false, reason: 'not_configured' };
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (config.mailApiKey) headers.Authorization = `Bearer ${config.mailApiKey}`;
      const res = await fetch(config.mailApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, from: config.mailFrom || undefined, subject, body }),
      });
      if (res.ok) return { ok: true, delivered: true };
      return { ok: false, delivered: false, reason: `http_${res.status}` };
    } catch {
      // No PII in the reason.
      return { ok: false, delivered: false, reason: 'network' };
    }
  }

  return { ok: false, delivered: false, reason: 'not_configured' };
}
