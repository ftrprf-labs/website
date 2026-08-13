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
import { buildWhatsApp, buildMailto } from './messages.mjs';
import { publishToMaculis } from './maculis-sync.mjs';
import { validateRow } from './validation.mjs';
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
      authRequired: authRequired(),
      authed: isAuthed(req),
      // Is server-to-server publish to Maculis configured? (no secret exposed)
      maculisConfigured: Boolean(config.maculisSyncKey),
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
    let rec = store.getByToken(decodeURIComponent(resolveMatch[1]));
    if (!rec) return json(res, 404, { error: 'Onbekende of ongeldige link' });
    // Optional: mark STARTED the first time the link is resolved.
    if (rec.status === 'INVITED') rec = store.setStatus(rec.id, 'STARTED') || rec;
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
    return json(res, 201, { invitation: store.createInvitation(body) });
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

  const statusMatch = pathname.match(/^\/api\/invitations\/([^/]+)\/status$/);
  if (statusMatch && method === 'POST') {
    const body = await readJson(req);
    try {
      const updated = store.setStatus(statusMatch[1], body.status);
      if (!updated) return json(res, 404, { error: 'Niet gevonden' });
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
    const created = [];
    for (const row of rows) {
      const { errors } = validateRow(row);
      if (errors.length) continue; // never import invalid rows
      created.push(store.createInvitation(row));
    }
    return json(res, 201, { created: created.length, invitations: created });
  }

  // Publish selected testers to Maculis (server-to-server). The browser sends
  // only { ids }, never PII; the IM already holds the records. We log counts
  // only — never names/e-mail/tokens.
  if (pathname === '/api/publish' && method === 'POST') {
    const body = await readJson(req);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const records = ids.map((id) => store.getInvitation(id)).filter(Boolean);
    if (records.length === 0) {
      return json(res, 400, { ok: false, reason: 'empty', message: 'Geen (geldige) testers geselecteerd.' });
    }
    const result = await publishToMaculis(records);
    return json(res, result.ok ? 200 : 502, result);
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
