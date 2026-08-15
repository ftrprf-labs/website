// Communication Layer — HTTP routes.
//
// Mounted ONLY when the layer is enabled (commEnabled). The webhook is authenticated by its Svix
// signature (no admin session); everything else requires the admin session. Privacy-inbox access
// is capability-gated and audited. All reads are tenant-scoped. Returns true if it handled the
// request, so the main server can fall through to the existing routes otherwise.

import { config } from '../config.mjs';
import { commEnabled, query } from './db.mjs';
import { processInbound } from './inbound.mjs';
import { sendReply } from './outbound.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { recordAudit } from './audit.mjs';
import { contactTimeline } from './activity.mjs';

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readRaw(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = ''; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); return; } raw += c; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}
function lowerHeaders(req) {
  const h = {};
  for (const [k, v] of Object.entries(req.headers)) h[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
  return h;
}
const ipRefOf = (req) => (req.socket && req.socket.remoteAddress ? String(req.socket.remoteAddress).slice(0, 40) : null);

// Capabilities for the current session. Single-tenant/single-admin today: the admin session holds
// all capabilities. This is the seam where per-user app_user capabilities plug in later.
function capabilities(/* req */) {
  return { communication: true, privacy: true, admin: true };
}

// Returns true if handled. `isAuthed` is passed in from the main server (admin gate).
export async function handleComm(req, res, { pathname, method, isAuthed }) {
  if (!commEnabled() || !pathname.startsWith('/api/comm/')) return false;

  // --- inbound webhook: signature-authenticated, NOT admin-gated -----------------------------
  if (pathname === '/api/comm/inbound/resend' && method === 'POST') {
    let rawBody;
    try { rawBody = await readRaw(req); } catch { json(res, 413, { ok: false }); return true; }
    const result = await processInbound({ headers: lowerHeaders(req), rawBody });
    json(res, result.status || 200, { ok: result.ok, ...(result.reason ? { reason: result.reason } : {}), ...(result.stored ? { stored: true } : {}) });
    return true;
  }

  // --- everything below requires the admin session -------------------------------------------
  if (!isAuthed(req)) { json(res, 401, { error: 'Niet ingelogd' }); return true; }
  const caps = capabilities(req);
  const tenantId = await getDefaultTenantId();

  // List conversations. box=communication|privacy ; filter=all|unread|open|waiting_us|waiting_contact|resolved
  const listMatch = pathname === '/api/comm/conversations' && method === 'GET';
  if (listMatch) {
    const u = new URL(req.url, 'http://x');
    const box = u.searchParams.get('box') === 'privacy' ? 'privacy' : 'communication';
    if (box === 'privacy' && !caps.privacy) { json(res, 403, { error: 'Geen privacy-toegang' }); return true; }
    if (box === 'privacy') await recordAudit({ tenantId, action: 'privacy_inbox_listed', entityType: 'mailbox', mailboxKind: 'PRIVACY', ipRef: ipRefOf(req) });
    const isPrivacy = box === 'privacy';
    const rows = (await query(
      `select c.id, c.subject, c.status, c.is_privacy, c.last_message_at,
              ct.first_name, ct.last_name, ct.email, o.name as org,
              (select count(*) from message m where m.conversation_id=c.id and m.direction='INBOUND') as inbound_count,
              (select body_text from message m where m.conversation_id=c.id order by created_at desc limit 1) as last_body
         from conversation c
         left join contact ct on ct.id=c.contact_id
         left join organization o on o.id=c.organization_id
        where c.tenant_id=$1 and c.deleted_at is null and c.is_privacy=$2
        order by c.last_message_at desc nulls last limit 200`, [tenantId, isPrivacy])).rows;
    json(res, 200, { conversations: rows });
    return true;
  }

  const convMatch = pathname.match(/^\/api\/comm\/conversations\/([0-9a-f-]{36})$/);
  if (convMatch && method === 'GET') {
    const id = convMatch[1];
    const conv = (await query(
      `select c.*, ct.first_name, ct.last_name, ct.email, ct.mobile, o.name as org, o.primary_domain
         from conversation c left join contact ct on ct.id=c.contact_id left join organization o on o.id=c.organization_id
        where c.id=$1 and c.tenant_id=$2`, [id, tenantId])).rows[0];
    if (!conv) { json(res, 404, { error: 'Niet gevonden' }); return true; }
    if (conv.is_privacy && !caps.privacy) { json(res, 403, { error: 'Geen privacy-toegang' }); return true; }
    if (conv.is_privacy) await recordAudit({ tenantId, action: 'privacy_conversation_read', entityType: 'conversation', entityId: id, mailboxKind: 'PRIVACY', ipRef: ipRefOf(req) });
    const messages = (await query(
      `select id, direction, from_address, to_addresses, subject, body_text, body_html_sanitized, delivery, created_at
         from message where conversation_id=$1 order by created_at asc`, [id])).rows;
    const notes = (await query('select id, body, created_at from internal_note where conversation_id=$1 order by created_at asc', [id])).rows;
    const draft = conv.is_privacy ? null : (await query(
      `select id, summary, intent, suggested_reply, suggested_actions, status from ai_draft
        where conversation_id=$1 and status='proposed' order by created_at desc limit 1`, [id])).rows[0] || null;
    // mark read
    if (conv.status === 'NEW') await query("update conversation set status='OPEN' where id=$1 and status='NEW'", [id]);
    json(res, 200, { conversation: conv, messages, notes, ai_draft: draft });
    return true;
  }

  const replyMatch = pathname.match(/^\/api\/comm\/conversations\/([0-9a-f-]{36})\/reply$/);
  if (replyMatch && method === 'POST') {
    let body;
    try { body = JSON.parse(await readRaw(req) || '{}'); } catch { json(res, 400, { error: 'bad_body' }); return true; }
    // Human-in-the-loop send. AI never reaches here — only an explicit user action.
    const result = await sendReply({ conversationId: replyMatch[1], userId: null, text: body.text, html: body.html, ipRef: ipRefOf(req) });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  const noteMatch = pathname.match(/^\/api\/comm\/conversations\/([0-9a-f-]{36})\/notes$/);
  if (noteMatch && method === 'POST') {
    let body;
    try { body = JSON.parse(await readRaw(req) || '{}'); } catch { json(res, 400, { error: 'bad_body' }); return true; }
    const text = (body.body || '').trim();
    if (!text) { json(res, 400, { error: 'empty' }); return true; }
    // internal_note is a SEPARATE table — structurally it can never be sent externally.
    const ins = await query('insert into internal_note(tenant_id, conversation_id, body) values ($1,$2,$3) returning id', [tenantId, noteMatch[1], text]);
    await recordAudit({ tenantId, action: 'internal_note_created', entityType: 'conversation', entityId: noteMatch[1], ipRef: ipRefOf(req) });
    json(res, 201, { id: ins.rows[0].id });
    return true;
  }

  const tlMatch = pathname.match(/^\/api\/comm\/contacts\/([0-9a-f-]{36})\/timeline$/);
  if (tlMatch && method === 'GET') {
    json(res, 200, { timeline: await contactTimeline(tenantId, tlMatch[1]) });
    return true;
  }

  return false;
}

export { commEnabled };
