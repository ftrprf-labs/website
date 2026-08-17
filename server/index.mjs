// FTRLABS Invitation Manager — local admin server.
//
// Zero web-framework: Node's built-in http server serves the static admin SPA
// and a small JSON API. See README for the full picture.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { config, ROOT } from './config.mjs';
import * as store from './store.mjs';
import { buildPreview } from './import.mjs';
import { buildWhatsApp, buildMailto, buildEmail } from './messages.mjs';
import { publishToMaculis } from './maculis-sync.mjs';
import { mailConfigured, sendEmail } from './mailer.mjs';
import { pullSessions, deriveByToken, EVAL_QUESTIONS } from './maculis-sessions.mjs';
import { validateRow, isValidEmail } from './validation.mjs';
import {
  authRequired,
  isAuthed,
  checkPassword,
  cookieHeaderFor,
} from './auth.mjs';
import { handleComm } from './comm/routes.mjs';
import { handleMijn } from './mijn/routes.mjs';
import { migrateOnBoot } from './comm/migrate.mjs';
import { commEnabled } from './comm/db.mjs';
import { bridgePassTheLens } from './comm/pass-the-lens.mjs';

const PUBLIC = join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// ---- helpers -------------------------------------------------------------

function json(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // Security headers apply to API responses too, not just static assets.
    ...securityHeaders,
    ...extraHeaders,
  });
  res.end(body);
}

function readBody(req, limitBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('Bestand te groot (limiet 25MB)'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  return JSON.parse(buf.toString('utf8'));
}

// Client IP for rate limiting. Behind a managed platform (Render) the real
// client is the first hop in X-Forwarded-For; fall back to the socket address.
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Minimal in-memory sliding-window rate limiter (single-instance deployment).
// Not a DDoS shield — a baseline against brute-force / intake abuse (§15). Keyed
// by bucket+IP; keeps only timestamps inside the window. No PII is stored.
const rateBuckets = new Map();
function rateLimit(bucket, ip, max, windowMs) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  rateBuckets.set(key, hits);
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.some((t) => now - t < windowMs)) rateBuckets.delete(k);
    }
  }
  return { limited: hits.length > max, retryMs: windowMs };
}

// Human reason for a fail-closed contact block — distinguishes an explicit
// refusal/withdrawal (OPTED_OUT) from merely-absent consent (UNKNOWN).
function contactBlockReason(rec, channel) {
  const why = rec && rec.consent_status === 'OPTED_OUT'
    ? 'toestemming ingetrokken of geweigerd (OPTED_OUT)'
    : 'geen aantoonbare toestemming (nog geen OPTED_IN)';
  return `${channel} geblokkeerd: ${why}.`;
}

// Privacy-by-default: strip PII fields before sending to a non-admin context.
function publicContext(record) {
  return {
    first_name: record.first_name || '',
    company_name: record.company_name || '',
    domain: record.domain || '',
    campaign: record.campaign,
    status: record.status,
  };
}

// Best-effort participant sync to Maculis so the tester is greeted by name and
// their company is already known BEFORE they open the personal link. Fires
// automatically whenever a personal link goes out (WhatsApp payload build /
// e-mail send), so the admin never has to click "Publiceer naar Maculis" per
// tester. NEVER blocks or fails the invite: if MACULIS_SYNC_KEY is unset or
// Maculis is unreachable, the invite proceeds and the opening falls back to
// generic. Only counts/outcomes are recorded — never PII or the payload.
async function autoPublishParticipant(rec) {
  if (!rec || !config.maculisSyncKey) return; // sync not configured → silent no-op
  try {
    const result = await publishToMaculis([rec]);
    if (result && result.ok) store.recordEventOnce(rec.id, 'published_to_maculis', { result: 'success' });
  } catch { /* best-effort: an invite must never fail because sync failed */ }
}

// Pull real Maculis session facts and apply them to the store: monotone lifecycle
// (DRAFT→SENT→OPENED→COMPLETED, never regresses), history milestones and journey-derived
// consent. Shared by BOTH the invitations list and the evaluations view, so the visible
// status is refreshed from real events on every read and never sticks on a stale DRAFT/SENT.
// OPENED comes from a real session_started (link actually opened); COMPLETED from a real
// session_completed. On a pull failure the store keeps its last known status (fail-safe).
async function syncLifecycleFromMaculis() {
  const pull = await pullSessions();
  if (!pull.ok) return { ok: false, reason: pull.reason, byToken: new Map() };
  const byToken = deriveByToken(pull.sessions);
  for (const inv of store.listInvitations()) {
    const d = byToken.get(inv.token);
    if (!d) continue;
    store.applySessionStatus(inv.id, d.started, d.completed);
    if (d.started) store.recordEventOnce(inv.id, 'journey_started', { at: d.started_at || null });
    if (d.eval_status !== 'NOT_STARTED') store.recordEventOnce(inv.id, 'evaluation_started', { at: d.started_at || null });
    if (d.eval_status === 'COMPLETED') store.recordEventOnce(inv.id, 'evaluation_completed', { at: d.completed_at || d.started_at || null });
    if (d.consent === 'OPTED_IN') {
      const before = store.getInvitation(inv.id);
      if (before && before.consent_status !== 'OPTED_IN') {
        store.setConsent(inv.id, 'OPTED_IN', { source: 'pass_the_lens', version: d.consent_version || null, at: d.consent_at || undefined });
      }
    }
  }
  return { ok: true, byToken };
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  // Force HTTPS for two years incl. subdomains. Browsers ignore this header when
  // received over plain HTTP (local dev), so it is safe to always send.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  // Self-contained app: no third-party origins may be contacted from the page,
  // so PII cannot be exfiltrated by an injected resource.
  'Content-Security-Policy':
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; " +
    "style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; form-action 'self'",
};

// ---- static files --------------------------------------------------------

async function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = normalize(join(PUBLIC, rel));
  if (!full.startsWith(PUBLIC)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const info = await stat(full);
    if (info.isDirectory()) throw new Error('dir');
    const data = await readFile(full);
    res.writeHead(200, {
      'Content-Type': MIME[extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ...securityHeaders,
    });
    res.end(data);
  } catch {
    // SPA fallback: serve index.html for unknown non-API paths.
    try {
      const data = await readFile(join(PUBLIC, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'], ...securityHeaders });
      res.end(data);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }
}

// ---- API -----------------------------------------------------------------

async function handleApi(req, res, pathname) {
  const method = req.method;

  // Health check for the managed platform (Render pings this). No auth, no PII.
  if (pathname === '/healthz' && method === 'GET') {
    return json(res, 200, { ok: true, service: 'ftrlabs-invitation-manager' });
  }

  // Communication Layer routes (mounted only when enabled). The webhook is signature-authed;
  // other comm routes gate on the admin session inside handleComm. Additive — never touches the
  // existing Invitation Manager / First Five routes.
  if (pathname.startsWith('/api/comm/')) {
    const handled = await handleComm(req, res, { pathname, method, isAuthed });
    if (handled) return;
  }

  // Mijn Maculis — customer-facing routes (token-authenticated, NOT admin-gated). Additive; shares
  // the Communication Layer's Postgres. Never touches the Invitation Manager / First Five routes.
  if (pathname.startsWith('/api/mijn/')) {
    const handled = await handleMijn(req, res, { pathname, method });
    if (handled) return;
  }

  // Public endpoints (no admin gate).
  if (pathname === '/api/config' && method === 'GET') {
    return json(res, 200, {
      maculisHost: config.maculisHost,
      // Public base the client shows for personal links (matches server-built links).
      maculisPublicUrl: config.maculisPublicUrl,
      campaign: config.campaign,
      statuses: store.STATUSES,
      consentStatuses: store.CONSENT,
      sources: store.SOURCES,
      authRequired: authRequired(),
      authed: isAuthed(req),
      // Is server-to-server publish to Maculis configured? (no secret exposed)
      maculisConfigured: Boolean(config.maculisSyncKey),
      // Is an e-mail transport configured? (no secret exposed)
      mailConfigured: mailConfigured(),
      // Can we pull Maculis evaluation results? (export key present, no secret exposed)
      evaluationsConfigured: Boolean(config.maculisExportKey),
      // Is the automatic Pass the Lens intake enabled? (key present, no secret exposed)
      intakeConfigured: Boolean(config.intakeKey),
    });
  }

  if (pathname === '/api/login' && method === 'POST') {
    // Baseline brute-force protection: max 10 attempts / 5 min per IP.
    const rl = rateLimit('login', clientIp(req), 10, 5 * 60 * 1000);
    if (rl.limited) return json(res, 429, { error: 'Te veel inlogpogingen. Probeer het over enkele minuten opnieuw.' });
    const body = await readJson(req);
    if (checkPassword(body.password)) {
      return json(res, 200, { ok: true }, { 'Set-Cookie': cookieHeaderFor(true) });
    }
    return json(res, 401, { error: 'Onjuist wachtwoord' });
  }

  if (pathname === '/api/logout' && method === 'POST') {
    return json(res, 200, { ok: true }, { 'Set-Cookie': cookieHeaderFor(false) });
  }

  // Maculis integration seam (brief §3, §4): resolve an opaque token to the
  // MINIMAL participant context. Deliberately NOT admin-gated (Maculis calls
  // it), and deliberately returns no e-mail / mobile / last name.
  const resolveMatch = pathname.match(/^\/api\/resolve\/([^/]+)$/);
  if (resolveMatch && method === 'GET') {
    const rec = store.getByToken(decodeURIComponent(resolveMatch[1]));
    if (!rec) return json(res, 404, { error: 'Onbekende of ongeldige link' });
    // NB: STARTED is NOT set here — resolving a token in the IM is not proof the
    // Maculis experience actually started. STARTED/COMPLETED are derived only
    // from real Maculis session data (see /api/evaluations, brief §4).
    return json(res, 200, publicContext(rec));
  }

  // Automatic intake from Pass the Lens (brief §6). Server-to-server: NOT the
  // admin gate — guarded by its own INTAKE_KEY. No key configured → disabled
  // (503). Never a public unauthenticated intake. Body is never logged.
  if (pathname === '/api/intake' && method === 'POST') {
    // Baseline abuse/enumeration protection: max 60 intakes / min per IP.
    const rl = rateLimit('intake', clientIp(req), 60, 60 * 1000);
    if (rl.limited) return json(res, 429, { ok: false, error: 'Te veel intake-verzoeken. Probeer het later opnieuw.' });
    if (!config.intakeKey) return json(res, 503, { ok: false, error: 'Intake niet geconfigureerd (INTAKE_KEY ontbreekt).' });
    if (req.headers['x-intake-key'] !== config.intakeKey) return json(res, 403, { ok: false, error: 'Intake-sleutel geweigerd.' });
    const body = await readJson(req);
    // Need at least one contact identifier to form a person key (dedup, §7).
    if (!body.email && !body.mobile) return json(res, 400, { ok: false, error: 'email of mobile is vereist voor intake.' });
    if (body.consent_status && !store.CONSENT.includes(body.consent_status)) {
      return json(res, 400, { ok: false, error: 'Onbekende consent_status.' });
    }
    const result = store.intake(body);
    const inv = result.invitation;
    // Best-effort: mirror the introduction into the relationship graph when the
    // Communication Layer is on (brief §9/§15). Fully guarded + no-op when off;
    // never blocks or fails the intake. Awaited so a managed DB write completes.
    if (body.introducer_token || body.introducer_name) {
      const latest = (inv.introductions && inv.introductions.length)
        ? inv.introductions[inv.introductions.length - 1] : {};
      try { await bridgePassTheLens(inv, latest); } catch { /* observational only */ }
    }
    // Minimal, PII-free response: no token, no e-mail. Just what the caller needs.
    return json(res, result.created ? 201 : 200, {
      ok: true,
      created: result.created,
      consentApplied: result.consentApplied,
      id: inv.id,
      status: inv.status,
      consent_status: inv.consent_status,
      source: inv.source,
    });
  }

  // ---- everything below requires the admin gate ----
  if (!isAuthed(req)) return json(res, 401, { error: 'Niet ingelogd' });

  if (pathname === '/api/invitations' && method === 'GET') {
    // Refresh lifecycle from real Maculis events BEFORE returning the list, so the main
    // table shows live OPENED/COMPLETED instead of a stale DRAFT/SENT (best-effort).
    await syncLifecycleFromMaculis();
    return json(res, 200, { invitations: store.listInvitations() });
  }

  if (pathname === '/api/invitations' && method === 'POST') {
    const body = await readJson(req);
    const { errors } = validateRow(body);
    if (errors.length) return json(res, 400, { error: errors.join('; ') });
    // Provenance: a tester created through this route is entered by hand.
    return json(res, 201, { invitation: store.createInvitation({ ...body, source: 'manual' }) });
  }

  const idMatch = pathname.match(/^\/api\/invitations\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (method === 'PATCH') {
      const body = await readJson(req);
      const updated = store.updateInvitation(id, body);
      if (!updated) return json(res, 404, { error: 'Niet gevonden' });
      return json(res, 200, { invitation: updated });
    }
    if (method === 'DELETE') {
      const ok = store.deleteInvitation(id);
      return json(res, ok ? 200 : 404, { ok });
    }
  }

  // Consent (independent dimension). Setting it never changes lifecycle status.
  // Admin-recorded OPTED_IN is NOT a free checkbox (brief §1): it requires a
  // provenance note (how the explicit consent was obtained) and is stamped
  // consent_source=manual. This is the admin route; the intake/pull carry their
  // own source. OPTED_OUT here is the admin withdrawal path (First Five, §3).
  const consentMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/consent$/);
  if (consentMatch && method === 'POST') {
    const body = await readJson(req);
    const status = body.consent_status;
    const source = body.consent_source || 'manual';
    const note = typeof body.consent_note === 'string' ? body.consent_note.trim() : '';
    const method = typeof body.consent_method === 'string' ? body.consent_method.trim().toUpperCase() : '';
    // A hand-recorded opt-in must be backed by a documented, standardised basis. The new
    // UI sends a machine method (VERBAL/PHONE/…); OTHER additionally needs a short toelichting.
    // Legacy callers that send only a free-text note stay accepted (backwards compatible).
    if (status === 'OPTED_IN' && source === 'manual') {
      if (method) {
        if (!store.CONSENT_METHODS.includes(method)) {
          return json(res, 400, { error: 'Onbekende toestemmingswijze.' });
        }
        if (method === 'OTHER' && !note) {
          return json(res, 400, { error: 'Kies "Anders": geef een korte toelichting op de toestemmingswijze.' });
        }
      } else if (!note) {
        return json(res, 400, { error: 'Handmatige toestemming vereist een toestemmingswijze (mondeling/telefonisch/e-mail/WhatsApp/schriftelijk/anders).' });
      }
    }
    try {
      const updated = store.setConsent(consentMatch[1], status, { source, method: method || null, note: note || null });
      if (!updated) return json(res, 404, { error: 'Niet gevonden' });
      return json(res, 200, { invitation: updated });
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  // Read-only tester dossier: provenance + chronological history (brief §17).
  const historyMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/history$/);
  if (historyMatch && method === 'GET') {
    const h = store.getHistory(historyMatch[1]);
    if (!h) return json(res, 404, { error: 'Niet gevonden' });
    return json(res, 200, h);
  }

  const statusMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/status$/);
  if (statusMatch && method === 'POST') {
    const body = await readJson(req);
    // Fail-closed (brief §1): becoming SENT requires an explicit OPTED_IN.
    // UNKNOWN and OPTED_OUT are both blocked — for the WhatsApp/e-mail flow and
    // any direct/administrative call. Other lifecycle corrections are unaffected.
    if (body.status === 'SENT' && !store.mayContact(statusMatch[1])) {
      if (body.channel === 'whatsapp' || body.channel === 'email') {
        store.addEvent(statusMatch[1], 'invitation_blocked', { channel: body.channel, result: 'blocked' });
      }
      return json(res, 403, { error: 'Uitnodigen geblokkeerd: alleen bij expliciete toestemming (OPTED_IN).' });
    }
    try {
      const updated = store.setStatus(statusMatch[1], body.status);
      if (!updated) return json(res, 404, { error: 'Niet gevonden' });
      // A WhatsApp invitation was actually sent (client opened wa.me + confirmed).
      // A channel-less status POST is an administrative correction — not logged
      // as an invitation. History observes real actions only (brief §8, §20).
      if (body.status === 'SENT' && body.channel === 'whatsapp') {
        store.addEvent(statusMatch[1], 'invitation_sent', { channel: 'whatsapp', result: 'success' });
      }
      return json(res, 200, { invitation: updated });
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  // Build (but do not send) the WhatsApp / mailto payload for one tester.
  const waMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/whatsapp$/);
  if (waMatch && method === 'GET') {
    const rec = store.getInvitation(waMatch[1]);
    if (!rec) return json(res, 404, { error: 'Niet gevonden' });
    // Fail-closed: WhatsApp only with an explicit OPTED_IN (brief §1).
    if (!store.mayContact(rec)) {
      store.addEvent(waMatch[1], 'invitation_blocked', { channel: 'whatsapp', result: 'blocked' });
      return json(res, 403, { error: contactBlockReason(rec, 'WhatsApp') });
    }
    // Auto-sync this participant to Maculis so the personal link greets them by
    // name the moment they open it (no manual "Publiceer" step). Best-effort.
    await autoPublishParticipant(rec);
    return json(res, 200, buildWhatsApp(store.getTemplate(), rec));
  }
  const mailMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/mailto$/);
  if (mailMatch && method === 'GET') {
    const rec = store.getInvitation(mailMatch[1]);
    if (!rec) return json(res, 404, { error: 'Niet gevonden' });
    return json(res, 200, buildMailto(store.getTemplate(), rec));
  }

  if (pathname === '/api/import/preview' && method === 'POST') {
    const body = await readJson(req);
    try {
      const buffer = body.dataBase64 ? Buffer.from(body.dataBase64, 'base64') : Buffer.alloc(0);
      const preview = await buildPreview({
        filename: body.filename || '',
        contentType: body.contentType || '',
        buffer,
        text: buffer.toString('utf8'),
      });
      return json(res, 200, preview);
    } catch (e) {
      return json(res, 400, { error: e.message, code: e.code });
    }
  }

  if (pathname === '/api/import/commit' && method === 'POST') {
    const body = await readJson(req);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    // Provenance from the uploaded file kind (csv/xlsx); fall back to 'import'.
    const source = ['csv', 'xlsx'].includes(body.source) ? body.source : 'import';
    const created = [];
    for (const row of rows) {
      const { errors } = validateRow(row);
      if (errors.length) continue; // never import invalid rows
      created.push(store.createInvitation({ ...row, source }));
    }
    return json(res, 201, { created: created.length, invitations: created });
  }

  // Publish selected testers to Maculis (server-to-server). The browser sends
  // only { ids }, never PII; the IM already holds the records. We log counts
  // only — never names/e-mail/tokens.
  if (pathname === '/api/publish' && method === 'POST') {
    const body = await readJson(req);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const all = ids.map((id) => store.getInvitation(id)).filter(Boolean);
    // Fail-closed: only testers with an explicit OPTED_IN are published (brief §1).
    const blocked = all.filter((r) => !store.mayContact(r)).length;
    const records = all.filter((r) => store.mayContact(r));
    if (records.length === 0) {
      return json(res, 400, {
        ok: false, reason: blocked ? 'no_consent' : 'empty',
        message: blocked ? 'Geen van de geselecteerde testers heeft toestemming (OPTED_IN) — publicatie geblokkeerd.' : 'Geen (geldige) testers geselecteerd.',
        blocked,
      });
    }
    const result = await publishToMaculis(records);
    // Record the outcome per published tester (never the payload, brief §8/§18).
    for (const r of records) {
      store.addEvent(r.id, 'published_to_maculis', { result: result.ok ? 'success' : 'failed' });
    }
    return json(res, result.ok ? 200 : 502, { ...result, blocked });
  }

  // Send e-mail invitations to the selected testers. Server-side send contract:
  //   - a tester without a valid e-mail is skipped (reason 'no_email'),
  //   - each valid one is sent via the configured transport,
  //   - ONLY a successful send flips the tester to INVITED,
  //   - a failed/unconfigured send never changes status.
  // The browser sends only { ids }. We never log e-mail, subject, body or link.
  if (pathname === '/api/invite/email' && method === 'POST') {
    const body = await readJson(req);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return json(res, 400, { ok: false, reason: 'empty' });
    const template = store.getTemplate();
    const results = [];
    let sent = 0, failed = 0, skipped = 0, notSent = 0;
    for (const id of ids) {
      const rec = store.getInvitation(id);
      if (!rec) { results.push({ id, ok: false, reason: 'not_found' }); skipped++; continue; }
      // Fail-closed: only an explicit OPTED_IN may be e-mailed (brief §1).
      if (!store.mayContact(rec)) {
        store.addEvent(id, 'invitation_blocked', { channel: 'email', result: 'blocked' });
        results.push({ id, ok: false, reason: rec.consent_status === 'OPTED_OUT' ? 'opted_out' : 'no_consent' }); skipped++; continue;
      }
      if (!isValidEmail(rec.email)) {
        store.addEvent(id, 'invitation_skipped', { channel: 'email', result: 'skipped' });
        results.push({ id, ok: false, reason: 'no_email' }); skipped++; continue;
      }
      // Auto-sync to Maculis so the emailed personal link greets by name. Best-effort.
      await autoPublishParticipant(rec);
      const mail = buildEmail(template, rec);
      const outcome = await sendEmail({ to: mail.to, subject: mail.subject, body: mail.body });
      if (outcome.delivered) {
        // ONLY a real, confirmed delivery is proof of an invitation (SENT).
        store.setStatus(id, 'SENT');
        store.addEvent(id, 'invitation_sent', { channel: 'email', result: 'success' });
        results.push({ id, ok: true });
        sent++;
      } else if (outcome.reason === 'mock' || outcome.reason === 'not_configured') {
        // No real send happened (test/unconfigured transport): stay DRAFT, log
        // NOTHING as sent, and report it honestly. Never a fake INVITED.
        results.push({ id, ok: false, reason: outcome.reason });
        notSent++;
      } else {
        // A real send was attempted and failed (bounce / http error / network).
        store.addEvent(id, 'invitation_failed', { channel: 'email', result: 'failed' });
        results.push({ id, ok: false, reason: outcome.reason });
        failed++;
      }
    }
    // `delivers` = a real delivering transport is configured (mock/unset → false).
    return json(res, 200, { ok: sent > 0, sent, failed, skipped, notSent, delivers: mailConfigured(), results });
  }

  // Evaluatieresultaten (Optie B): live read-only pull uit Maculis, gejoined op
  // participant-token. Maculis blijft source of truth; geen tweede evaluatie-DB.
  // Geen token/PII in de output; server-side joinen en filteren.
  if (pathname === '/api/evaluations' && method === 'GET') {
    // Same real-event sync as the list (monotone lifecycle + milestones + journey consent).
    const sync = await syncLifecycleFromMaculis();
    const byToken = sync.byToken;
    const rows = store.listInvitations().map((inv) => {
      const d = byToken.get(inv.token) || null;
      const cur = store.getInvitation(inv.id) || inv;
      return {
        id: inv.id,
        name: [inv.first_name, inv.last_name].filter(Boolean).join(' ') || inv.company_name || '—',
        company_name: inv.company_name || '',
        campaign: inv.campaign,
        lifecycle: cur.status,
        started: Boolean(d && d.started),
        completed: Boolean(d && d.completed),
        eval_status: d ? d.eval_status : 'NOT_STARTED',
        answers: d ? d.answers : {},
        contexts: d ? d.contexts : {},
        started_at: d ? d.started_at : null,
        completed_at: d ? d.completed_at : null,
      };
    });
    return json(res, 200, { ok: sync.ok, reason: sync.ok ? undefined : sync.reason, questions: EVAL_QUESTIONS, evaluations: rows });
  }

  if (pathname === '/api/template' && method === 'GET') {
    return json(res, 200, { template: store.getTemplate() });
  }
  if (pathname === '/api/template' && method === 'PUT') {
    const body = await readJson(req);
    return json(res, 200, { template: store.saveTemplate(body) });
  }

  return json(res, 404, { error: 'Onbekende route' });
}

// ---- request entry -------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Privacy: log method + path ONLY. Never the query string (may hold a token)
  // and never the body (holds PII). See brief §13.
  const started = Date.now();
  res.on('finish', () => {
    const safePath = pathname.replace(/\/api\/resolve\/[^/]+/, '/api/resolve/•');
    // eslint-disable-next-line no-console
    console.log(`${req.method} ${safePath} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });

  try {
    if (pathname.startsWith('/api/') || pathname === '/healthz') {
      await handleApi(req, res, pathname);
    } else {
      await serveStatic(req, res, pathname);
    }
  } catch (err) {
    // Never leak PII in errors.
    json(res, 500, { error: 'Interne fout: ' + (err.message || 'onbekend') });
  }
});

// ---- startup safety check ------------------------------------------------

const bindHost = config.host;
const nonLoopback = bindHost !== '127.0.0.1' && bindHost !== 'localhost';

function isLocalUrl(u) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(String(u || ''));
}

// Fail-closed guard: never expose an unauthenticated admin tool on the network.
if (nonLoopback && !authRequired()) {
  console.error(
    '\n[SECURITY] HOST is not loopback but ADMIN_PASSWORD is empty.\n' +
      'Refusing to expose an unauthenticated admin tool to the network.\n' +
      'Set ADMIN_PASSWORD, or bind to 127.0.0.1.\n'
  );
  process.exit(1);
}

// Production (managed deployment) fail-closed checks (§3, §5, §10).
if (config.production) {
  const problems = [];
  // 1. The admin gate is mandatory online (this app holds PII).
  if (!authRequired()) problems.push('ADMIN_PASSWORD is not set — the admin UI would be publicly open.');
  // 2. Admin sessions must survive restarts/redeploys.
  if (!config.authSecret) problems.push('AUTH_SECRET is not set — admin logins would break on every restart/redeploy.');
  // 3. The public Journey link must be a real HTTPS URL, never localhost.
  if (!/^https:\/\//i.test(config.maculisPublicUrl) || isLocalUrl(config.maculisPublicUrl)) {
    problems.push(`MACULIS_PUBLIC_URL must be a public https:// URL (got "${config.maculisPublicUrl}") — invitations may not contain localhost.`);
  }
  if (problems.length) {
    console.error('\n[SECURITY] Refusing to start in production:\n' + problems.map((p) => '  - ' + p).join('\n') + '\n');
    process.exit(1);
  }
}

server.listen(config.port, bindHost, () => {
  const url = `http://${bindHost}:${config.port}`;
  console.log(`\n  FTRLABS Invitation Manager`);
  console.log(`  Campaign : ${config.campaign}`);
  console.log(`  Admin UI : ${url}`);
  console.log(`  Data file: ${config.dbFile}`);
  console.log(`  Maculis (intern) : ${config.maculisHost}`);
  console.log(`  Persoonlijke link: ${config.maculisPublicUrl}/?p=<token>`);
  if (!authRequired()) {
    console.log(
      `  Auth     : OPEN (loopback-only). Set ADMIN_PASSWORD in .env for a login gate.`
    );
  } else {
    console.log(`  Auth     : password gate ON`);
  }
  console.log(`  Comm     : ${commEnabled() ? 'ENABLED (Postgres relationship layer)' : 'off (set COMM_LAYER_ENABLED + DATABASE_URL)'}`);
  console.log('');

  // Communication Layer: apply DB migrations on boot when enabled. Best-effort — never blocks the
  // Invitation Manager / First Five service if the database is briefly unreachable.
  if (commEnabled()) {
    migrateOnBoot().then(async (r) => {
      if (r.ok) {
        console.log(`  Comm     : migrations ${r.ran && r.ran.length ? 'applied ' + r.ran.join(', ') : 'up to date'}`);
        // Bridge existing Testerbeheer invitations into permanent Contact/Organization rows so the
        // Relationship Workspace has data from day one (§9). Idempotent, additive, best-effort.
        try {
          const { migrateInvitations } = await import('./comm/repo.mjs');
          const res = await migrateInvitations(store.listInvitations());
          console.log(`  Comm     : relaties ${res.contactsCreated} nieuw, ${res.contactsLinked} bijgewerkt`);
        } catch (e) { console.log(`  Comm     : relatie-migratie uitgesteld (${e.message})`); }

        // Slice A1: backfill an initial version + observation for any existing V1 insight that lacks
        // one (idempotent; content copied verbatim). Additive, best-effort, never blocks the boot.
        try {
          const { backfillInitialVersions } = await import('./mijn/versions.mjs');
          const bf = await backfillInitialVersions();
          if (bf.backfilled > 0) console.log(`  Mijn Maculis: ${bf.backfilled} inzicht(en) voorzien van een beginversie`);
        } catch (e) { console.log(`  Mijn Maculis: version-backfill uitgesteld (${e.message})`); }

        // PREVIEW ONLY (§24): seed the Mijn Maculis fixtures + run a live boundary self-check when
        // MIJN_PREVIEW_SEED is on. Triple-guarded (flag + no real customers) so it can never run or
        // seed on production. Best-effort — never blocks or crashes the boot.
        if (/^(1|true|yes|on)$/i.test(process.env.MIJN_PREVIEW_SEED || '')) {
          try {
            const { seedPreviewCore, assertNoRealCustomers, previewSelfCheck } = await import('./mijn/seed.mjs');
            const { getDefaultTenantId } = await import('./comm/tenant.mjs');
            const tid = await getDefaultTenantId();
            await assertNoRealCustomers(tid);
            const seeded = await seedPreviewCore({ tenantId: tid });
            console.log(`  Mijn Maculis: preview geseed (${seeded.organizationName}) → ${seeded.link}`);
            await previewSelfCheck({ tenantId: tid, organizationId: seeded.organizationId });
          } catch (e) { console.log(`  Mijn Maculis: preview seed overgeslagen (${e.message})`); }
        }
      } else if (!r.skipped) console.log(`  Comm     : migrations pending (${r.error})`);
    });
  }

  // Retentie (privacy by design): ruim bij start en daarna dagelijks records op die
  // ouder zijn dan de bewaartermijn. Faalt nooit de server — alleen een telling gelogd.
  const runRetention = () => {
    try {
      const removed = store.pruneExpired();
      if (removed > 0) console.log(`  Retentie : ${removed} verlopen record(s) verwijderd`);
    } catch (err) {
      console.error('  Retentie : opschoning mislukt:', err.message);
    }
  };
  runRetention();
  const retentionTimer = setInterval(runRetention, 24 * 60 * 60 * 1000);
  if (typeof retentionTimer.unref === 'function') retentionTimer.unref();
});

export { server };
