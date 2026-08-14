// Minimal local-admin gate (brief §13).
//
// IMPORTANT / HONEST SCOPE: this is NOT production authentication. There is no
// existing FTRlabs auth/admin system in this (green-field) repo to reuse, so
// this is a single shared-password gate intended for LOCAL, INTERNAL use only.
//
// Safety posture:
//   - server binds to 127.0.0.1 by default (loopback only)
//   - if ADMIN_PASSWORD is empty, the server refuses to bind to a non-loopback
//     address and prints a warning (see index.mjs)
//   - password is verified with a constant-time compare
//   - the session cookie is an HMAC token, httpOnly + SameSite=Strict
//
// See README "Security / blocker" for what real deployment would require.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.mjs';

// Session-signing secret. In a real deployment AUTH_SECRET is set (as an env
// var, never in code) so admin login cookies stay valid across restarts and
// redeploys. Without it we fall back to a per-process random secret — fine for
// a single local run, but it rotates on restart (all sessions invalidated).
const SECRET = config.authSecret
  ? Buffer.from(config.authSecret, 'utf8')
  : randomBytes(32);
const COOKIE = 'im_session';
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export function authRequired() {
  return Boolean(config.adminPassword);
}

function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function makeToken() {
  const exp = Date.now() + TTL_MS;
  const payload = `admin.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  const payload = `${role}.${exp}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  if (Number(exp) < Date.now()) return false;
  return true;
}

export function checkPassword(password) {
  if (!config.adminPassword) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(config.adminPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cookieHeaderFor(login) {
  const attrs = `Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL_MS / 1000}`;
  if (login) return `${COOKIE}=${makeToken()}; ${attrs}`;
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAuthed(req) {
  if (!authRequired()) return true; // no password configured -> loopback-only mode
  const cookies = parseCookies(req.headers.cookie || '');
  return verifyToken(cookies[COOKIE]);
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
