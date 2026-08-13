// E-mail sending contract for the Invitation Manager.
//
// This is a thin transport layer — NOT a mail server. It never fake-sends:
// when no transport is configured, send() reports { ok:false, reason:'not_configured' }
// and the caller must NOT mark the tester INVITED.
//
// Transports (selected by MAIL_TRANSPORT):
//   ''    → not configured (default). Nothing is sent; nothing is faked.
//   http  → POST each message to MAIL_API_URL, optionally with a Bearer key.
//           This is the seam for the environment's real mail infrastructure
//           (a transactional-mail HTTP API). No credentials live in code —
//           MAIL_API_URL / MAIL_API_KEY come from the environment.
//   mock  → deterministic TEST transport for local verification ONLY. It does
//           not touch the network; it succeeds, except for sentinel addresses
//           (bounce@… or …@fail.…) so the failure path can be tested.
//
// Privacy: this module never logs recipients, subjects, bodies or links.

import { config } from './config.mjs';

export function mailConfigured() {
  if (config.mailTransport === 'mock') return true;
  if (config.mailTransport === 'http') return Boolean(config.mailApiUrl);
  return false;
}

// Returns { ok:true } or { ok:false, reason }.
export async function sendEmail({ to, subject, body }) {
  if (!to) return { ok: false, reason: 'no_email' };

  const transport = config.mailTransport;

  if (transport === 'mock') {
    // Test transport: deterministic, offline. Sentinel addresses "bounce".
    if (/^bounce@/i.test(to) || /@fail\./i.test(to)) return { ok: false, reason: 'bounce' };
    return { ok: true };
  }

  if (transport === 'http') {
    if (!config.mailApiUrl) return { ok: false, reason: 'not_configured' };
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (config.mailApiKey) headers.Authorization = `Bearer ${config.mailApiKey}`;
      const res = await fetch(config.mailApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, from: config.mailFrom || undefined, subject, body }),
      });
      if (res.ok) return { ok: true };
      return { ok: false, reason: `http_${res.status}` };
    } catch {
      // No PII in the reason.
      return { ok: false, reason: 'network' };
    }
  }

  return { ok: false, reason: 'not_configured' };
}
