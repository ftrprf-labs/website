// Caller identity / scoping (Origin & Return architecture).
//
// The V1 API used a single shared bearer token, so every caller was
// indistinguishable — origin could be claimed by anyone. This adds a minimal,
// secure caller identity WITHOUT building an IAM: an optional named-client
// registry (MACULIS_API_CLIENTS = JSON [{id, token, scopes?}]). A bearer token
// resolves to a client id, which becomes the authenticated `submitted_by` on
// every submission. That id is server-set from the token, never from the request
// body, so a caller cannot forge who they are.
//
// Backward compatible: the single MACULIS_API_TOKEN still works and resolves to
// client id 'default'. No token value is ever stored, logged, or returned.

import { timingSafeEqual } from 'node:crypto';
import { config } from './config.mjs';

let cache = null;

// Parse the registry once. Never throws on a bad drop-in — a malformed registry
// falls back to the single token so the API cannot be locked out by a typo.
function clients() {
  if (cache) return cache;
  const out = [];
  const raw = (config.api.clientsRaw || '').trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const c of arr) {
          if (c && typeof c.id === 'string' && typeof c.token === 'string' && c.token) {
            out.push({ id: c.id, token: c.token, scopes: Array.isArray(c.scopes) ? c.scopes : ['*'] });
          }
        }
      }
    } catch { /* fall through to the single-token fallback */ }
  }
  // Legacy single token always works (as client 'default') so nothing breaks.
  if (config.api.token) out.push({ id: 'default', token: config.api.token, scopes: ['*'] });
  cache = out;
  return out;
}

function tokenEquals(a, b) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Resolve a bearer token to a caller { id, scopes } or null. Constant-time per
// candidate. Loopback-only mode (no clients configured) resolves to 'loopback'.
export function resolveCaller(bearerToken) {
  const list = clients();
  if (!list.length) return { id: 'loopback', scopes: ['*'] };   // no auth configured (guarded to loopback at startup)
  if (!bearerToken) return null;
  for (const c of list) {
    if (tokenEquals(bearerToken, c.token)) return { id: c.id, scopes: c.scopes };
  }
  return null;
}

// Auth is required whenever any client/token is configured.
export function authRequired() {
  return clients().length > 0;
}

export function hasScope(caller, scope) {
  const s = caller?.scopes || [];
  return s.includes('*') || s.includes(scope);
}

export function _resetForTests() { cache = null; }
