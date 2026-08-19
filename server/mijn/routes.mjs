// Mijn Maculis — customer-facing HTTP routes (§17, §19, §20).
//
// Mounted ONLY when the Communication Layer is enabled (it shares that Postgres). These routes are
// NOT admin-gated: the customer authenticates with their opaque access token, presented in the
// `x-mijn-token` header (never in the URL, so it stays out of the request log). Every read and write
// is scoped to the { tenant, organization } the token resolves to — the client never supplies the
// org, so it cannot reach another organization's data. Returns true when it handled the request.

import { commEnabled } from '../comm/db.mjs';
import { resolveAccess } from './access.mjs';
import { customerOverview, customerInsights, customerInsightDetail, collaboration } from './insights.mjs';
import { shareInsight, revokeInsight } from './sharing.mjs';
import { stuurBericht, draden, draadVoorKlant, ongelezen, zetHerkenning } from './gesprek.mjs';

const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readRaw(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = ''; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); return; } raw += c; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}
async function readJson(req) { try { return JSON.parse((await readRaw(req)) || '{}'); } catch { return null; } }

// The token arrives in a header (kept out of the URL and therefore out of the access log). A `?t=`
// query fallback exists only so a first page-load can bootstrap; the client immediately switches to
// the header for all API calls.
function presentedToken(req, url) {
  const h = req.headers['x-mijn-token'];
  if (typeof h === 'string' && h) return h;
  const q = url.searchParams.get('t');
  return q || null;
}

export async function handleMijn(req, res, { pathname, method }) {
  if (!pathname.startsWith('/api/mijn/')) return false;
  if (!commEnabled()) { json(res, 503, { error: 'Mijn Maculis is nog niet geactiveerd.' }); return true; }

  const url = new URL(req.url, 'http://x');
  const token = presentedToken(req, url);
  const access = token ? await resolveAccess(token) : null;
  if (!access) { json(res, 401, { error: 'Geen geldige toegang tot Mijn Maculis.' }); return true; }

  const { tenantId, organizationId } = access;

  // Session / identity for the landing (who am I, which organization is this).
  if (pathname === '/api/mijn/session' && method === 'GET') {
    json(res, 200, {
      organization: access.organizationName,
      user: { label: access.label, role: access.role },
      preview: access.isPreview,
    });
    return true;
  }

  // Overzicht.
  if (pathname === '/api/mijn/overview' && method === 'GET') {
    json(res, 200, await customerOverview(tenantId, organizationId));
    return true;
  }

  // De Spiegel — insight list.
  if (pathname === '/api/mijn/insights' && method === 'GET') {
    json(res, 200, { insights: await customerInsights(tenantId, organizationId) });
    return true;
  }

  // Insight detail — own org only (any other org's id resolves to 404, proving no leak by id).
  // Returns the current reading (insight.*) plus its human development timeline.
  const detailMatch = pathname.match(new RegExp(`^/api/mijn/insights/${UUID}$`));
  if (detailMatch && method === 'GET') {
    const detail = await customerInsightDetail(tenantId, organizationId, detailMatch[1]);
    if (!detail) { json(res, 404, { error: 'Inzicht niet gevonden.' }); return true; }
    json(res, 200, detail);
    return true;
  }

  // Explicit share — the deliberate, human boundary crossing. Covers both a first PRIVATE→SHARED and
  // "share the update" (advance shared_version_id to the current reading). Only this action moves the
  // pointer; nothing is ever auto-shared.
  const shareMatch = pathname.match(new RegExp(`^/api/mijn/insights/${UUID}/share$`));
  if (shareMatch && method === 'POST') {
    const result = await shareInsight(tenantId, organizationId, shareMatch[1], { actorLabel: access.label, actorAccessId: access.accessId });
    if (!result.ok) { json(res, result.error === 'not_found' ? 404 : 400, result); return true; }
    const detail = await customerInsightDetail(tenantId, organizationId, shareMatch[1]);
    json(res, 200, { ok: true, sharing: 'SHARED', updated: Boolean(result.updated), ...detail });
    return true;
  }

  // Withdraw a share (SHARED → PRIVATE) — the customer stays in control (§12). Afterwards nothing of
  // this insight is available internally (shared_version_id is cleared).
  const revokeMatch = pathname.match(new RegExp(`^/api/mijn/insights/${UUID}/revoke$`));
  if (revokeMatch && method === 'POST') {
    const result = await revokeInsight(tenantId, organizationId, revokeMatch[1], { actorLabel: access.label, actorAccessId: access.accessId });
    if (!result.ok) { json(res, result.error === 'not_found' ? 404 : 400, result); return true; }
    const detail = await customerInsightDetail(tenantId, organizationId, revokeMatch[1]);
    json(res, 200, { ok: true, sharing: 'PRIVATE', ...detail });
    return true;
  }

  // ---- het gesprek -----------------------------------------------------------------------------
  // Eén kanaal op de bestaande Communication Layer. Elke route is gebonden aan de { tenant,
  // organization } uit het toegangstoken, dus een klant kan nooit in andermans draad kijken of
  // schrijven, ook niet met een geldig id uit een andere organisatie.

  // De rustige lijst met gesprekken. Geen postvak: alleen draden en hun onderwerp.
  if (pathname === '/api/mijn/conversations' && method === 'GET') {
    json(res, 200, { items: await draden(tenantId, organizationId), unread: await ongelezen(tenantId, organizationId) });
    return true;
  }

  // Iets zeggen. Met of zonder patroon, en alleen met `weegMee` komt er daarnaast een voorstel
  // voor het organisatiebeeld binnen. Zonder dat vinkje is dit uitsluitend een gesprek.
  if (pathname === '/api/mijn/conversations' && method === 'POST') {
    const body = await readJson(req);
    if (!body) { json(res, 400, { error: 'Ongeldig verzoek.' }); return true; }
    const result = await stuurBericht(tenantId, organizationId, {
      accessId: access.accessId,
      contactId: access.contactId || null,
      insightId: body.insightId || null,
      conversationId: body.conversationId || null,
      text: body.text,
      weegMee: body.weegMee === true,
    });
    if (!result.ok) { json(res, result.error === 'not_found' ? 404 : 400, result); return true; }
    json(res, 200, result);
    return true;
  }

  // Eén draad openen. Dit verzet alleen het klantwatermerk, nooit dat van Maculis.
  const draadMatch = pathname.match(new RegExp(`^/api/mijn/conversations/${UUID}$`));
  if (draadMatch && method === 'GET') {
    const draad = await draadVoorKlant(tenantId, organizationId, draadMatch[1]);
    if (!draad) { json(res, 404, { error: 'Gesprek niet gevonden.' }); return true; }
    json(res, 200, { conversation: draad });
    return true;
  }

  // "Herken je dit?" duurzaam maken. Het antwoord blijft bij de klant zolang het inzicht privé is.
  const herkenMatch = pathname.match(new RegExp(`^/api/mijn/insights/${UUID}/recognition$`));
  if (herkenMatch && method === 'POST') {
    const body = await readJson(req);
    if (!body) { json(res, 400, { error: 'Ongeldig verzoek.' }); return true; }
    const result = await zetHerkenning(tenantId, organizationId, herkenMatch[1], {
      answer: body.answer || null, note: body.note || null, accessId: access.accessId,
    });
    if (!result.ok) { json(res, 404, result); return true; }
    json(res, 200, result);
    return true;
  }

  // Samenwerking.
  if (pathname === '/api/mijn/collaboration' && method === 'GET') {
    json(res, 200, { items: await collaboration(tenantId, organizationId) });
    return true;
  }

  // Reject an unknown body-bearing call cleanly (drain the body).
  if (method === 'POST') { await readJson(req); }
  json(res, 404, { error: 'Onbekende route.' });
  return true;
}
