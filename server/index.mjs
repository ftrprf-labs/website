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

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
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

  // Public endpoints (no admin gate).
  if (pathname === '/api/config' && method === 'GET') {
    return json(res, 200, {
      maculisHost: config.maculisHost,
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
    });
  }

  if (pathname === '/api/login' && method === 'POST') {
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

  // ---- everything below requires the admin gate ----
  if (!isAuthed(req)) return json(res, 401, { error: 'Niet ingelogd' });

  if (pathname === '/api/invitations' && method === 'GET') {
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
  const consentMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/consent$/);
  if (consentMatch && method === 'POST') {
    const body = await readJson(req);
    try {
      const updated = store.setConsent(consentMatch[1], body.consent_status);
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
    // OPTED_OUT is a hard block on becoming INVITED (also guards the WhatsApp
    // client flow and any direct/malicious call).
    if (body.status === 'INVITED' && store.isOptedOut(statusMatch[1])) {
      if (body.channel === 'whatsapp' || body.channel === 'email') {
        store.addEvent(statusMatch[1], 'invitation_blocked', { channel: body.channel, result: 'blocked' });
      }
      return json(res, 403, { error: 'Tester heeft geen toestemming (OPTED_OUT) — uitnodigen geblokkeerd.' });
    }
    try {
      const updated = store.setStatus(statusMatch[1], body.status);
      if (!updated) return json(res, 404, { error: 'Niet gevonden' });
      // A WhatsApp invitation was actually sent (client opened wa.me + confirmed).
      // A channel-less status POST is an administrative correction — not logged
      // as an invitation. History observes real actions only (brief §8, §20).
      if (body.status === 'INVITED' && body.channel === 'whatsapp') {
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
    if (store.isOptedOut(rec)) {
      store.addEvent(waMatch[1], 'invitation_blocked', { channel: 'whatsapp', result: 'blocked' });
      return json(res, 403, { error: 'Tester heeft geen toestemming (OPTED_OUT) — WhatsApp geblokkeerd.' });
    }
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
    // OPTED_OUT testers are never published to Maculis.
    const blocked = all.filter((r) => store.isOptedOut(r)).length;
    const records = all.filter((r) => !store.isOptedOut(r));
    if (records.length === 0) {
      return json(res, 400, {
        ok: false, reason: blocked ? 'opted_out' : 'empty',
        message: blocked ? 'Alle geselecteerde testers zijn OPTED_OUT — publicatie geblokkeerd.' : 'Geen (geldige) testers geselecteerd.',
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
    let sent = 0, failed = 0, skipped = 0;
    for (const id of ids) {
      const rec = store.getInvitation(id);
      if (!rec) { results.push({ id, ok: false, reason: 'not_found' }); skipped++; continue; }
      if (store.isOptedOut(rec)) {
        store.addEvent(id, 'invitation_blocked', { channel: 'email', result: 'blocked' });
        results.push({ id, ok: false, reason: 'opted_out' }); skipped++; continue;
      }
      if (!isValidEmail(rec.email)) {
        store.addEvent(id, 'invitation_skipped', { channel: 'email', result: 'skipped' });
        results.push({ id, ok: false, reason: 'no_email' }); skipped++; continue;
      }
      const mail = buildEmail(template, rec);
      const outcome = await sendEmail({ to: mail.to, subject: mail.subject, body: mail.body });
      if (outcome.ok) {
        store.setStatus(id, 'INVITED');   // status only after a successful send
        store.addEvent(id, 'invitation_sent', { channel: 'email', result: 'success' });
        results.push({ id, ok: true });
        sent++;
      } else {
        store.addEvent(id, 'invitation_failed', { channel: 'email', result: 'failed' });
        results.push({ id, ok: false, reason: outcome.reason });
        failed++;
      }
    }
    return json(res, 200, { ok: sent > 0, sent, failed, skipped, configured: mailConfigured(), results });
  }

  // Evaluatieresultaten (Optie B): live read-only pull uit Maculis, gejoined op
  // participant-token. Maculis blijft source of truth; geen tweede evaluatie-DB.
  // Geen token/PII in de output; server-side joinen en filteren.
  if (pathname === '/api/evaluations' && method === 'GET') {
    const pull = await pullSessions();
    const byToken = pull.ok ? deriveByToken(pull.sessions) : new Map();
    const rows = store.listInvitations().map((inv) => {
      const d = byToken.get(inv.token) || null;
      // STARTED/COMPLETED alleen uit echte Maculis-sessiedata (monotone upgrade).
      if (d) {
        store.applySessionStatus(inv.id, d.started, d.completed);
        // History milestones, derived ONLY from real Maculis facts (brief §11).
        // Idempotent: recorded once, at the real Maculis timestamp when known.
        if (d.started) store.recordEventOnce(inv.id, 'journey_started', { at: d.started_at || null });
        if (d.eval_status !== 'NOT_STARTED') store.recordEventOnce(inv.id, 'evaluation_started', { at: d.started_at || null });
        if (d.eval_status === 'COMPLETED') store.recordEventOnce(inv.id, 'evaluation_completed', { at: d.completed_at || d.started_at || null });
      }
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
    return json(res, 200, { ok: pull.ok, reason: pull.ok ? undefined : pull.reason, questions: EVAL_QUESTIONS, evaluations: rows });
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
    if (pathname.startsWith('/api/')) {
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
if (nonLoopback && !authRequired()) {
  console.error(
    '\n[SECURITY] HOST is not loopback but ADMIN_PASSWORD is empty.\n' +
      'Refusing to expose an unauthenticated admin tool to the network.\n' +
      'Set ADMIN_PASSWORD in .env, or bind to 127.0.0.1.\n'
  );
  process.exit(1);
}

server.listen(config.port, bindHost, () => {
  const url = `http://${bindHost}:${config.port}`;
  console.log(`\n  FTRLABS Invitation Manager`);
  console.log(`  Campaign : ${config.campaign}`);
  console.log(`  Admin UI : ${url}`);
  console.log(`  Data file: ${config.dbFile}`);
  console.log(`  Maculis  : ${config.maculisHost}/?p=<token>`);
  if (!authRequired()) {
    console.log(
      `  Auth     : OPEN (loopback-only). Set ADMIN_PASSWORD in .env for a login gate.`
    );
  } else {
    console.log(`  Auth     : password gate ON`);
  }
  console.log('');
});

export { server };
