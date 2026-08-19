// Communication Layer — HTTP routes.
//
// Mounted ONLY when the layer is enabled (commEnabled). The webhook is authenticated by its Svix
// signature (no admin session); everything else requires the admin session. Privacy-inbox access is
// capability-gated and audited. All reads are tenant-scoped. API is RELATIONSHIP-oriented (§51):
// relationships / conversations / drafts / follow-ups / consent — not one endpoint per vendor.
// Returns true if it handled the request, so the main server falls through to existing routes.

import { config } from '../config.mjs';
import { commEnabled, query } from './db.mjs';
import { processInbound } from './inbound.mjs';
import { sendOnChannel } from './send.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { recordAudit } from './audit.mjs';
import { contactTimeline } from './activity.mjs';
import { getRelationship, relationshipTimeline, listRelationships, contactByInvitation } from './relationship.mjs';
import { inboxConversations, inboxSummary } from './inbox.mjs';
import { attentionOverview, markConversationRead } from './attention.mjs';
import * as drafts from './drafts.mjs';
import * as ai from './ai/service.mjs';
import { createFollowUp, updateFollowUp, listFollowUps } from './followups.mjs';
import { addMemory, confirmMemory, dismissMemory, listMemory } from './memory.mjs';
import { channelConsentState, setPreference, listPreferences } from './consent.mjs';
import { channelStatusBoard, SENDABLE_CHANNELS } from './providers/index.mjs';
import { receiveChannelInbound, linkConversationToContact } from './channel-inbound.mjs';

const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readRaw(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = ''; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); return; } raw += c; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}
async function readJson(req) { try { return JSON.parse(await readRaw(req) || '{}'); } catch { return null; } }
function lowerHeaders(req) { const h = {}; for (const [k, v] of Object.entries(req.headers)) h[k.toLowerCase()] = Array.isArray(v) ? v[0] : v; return h; }
const ipRefOf = (req) => (req.socket && req.socket.remoteAddress ? String(req.socket.remoteAddress).slice(0, 40) : null);

// Capabilities for the current session. Single-admin today holds all; the seam for per-user
// app_user capabilities (§44) plugs in here.
function capabilities() { return { communication: true, privacy: true, admin: true }; }

export async function handleComm(req, res, { pathname, method, isAuthed }) {
  if (!commEnabled() || !pathname.startsWith('/api/comm/')) return false;
  const u = new URL(req.url, 'http://x');

  // --- inbound webhooks: signature-authenticated, NOT admin-gated ------------------------------
  if (pathname === '/api/comm/inbound/resend' && method === 'POST') {
    let rawBody;
    try { rawBody = await readRaw(req); } catch { json(res, 413, { ok: false }); return true; }
    const result = await processInbound({ headers: lowerHeaders(req), rawBody });
    json(res, result.status || 200, { ok: result.ok, ...(result.reason ? { reason: result.reason } : {}), ...(result.stored ? { stored: true } : {}) });
    return true;
  }

  // --- everything below requires the admin session --------------------------------------------
  if (!isAuthed(req)) { json(res, 401, { error: 'Niet ingelogd' }); return true; }
  const caps = capabilities(req);
  const tenantId = await getDefaultTenantId();

  // ---- channel + AI status board (what is LIVE vs MOCK, §48/§81) -----------------------------
  if (pathname === '/api/comm/status' && method === 'GET') {
    json(res, 200, { channels: channelStatusBoard(), ai: { available: ai.available() }, sendable: SENDABLE_CHANNELS });
    return true;
  }

  // ---- Mijn Maculis boundary proof (admin-gated; §25 architecture/privacy proof) --------------
  // Shows the sharing boundary from the INTERNAL side for one organization: exactly what Maculis is
  // authorized to use (SHARED) and only a COUNT of the private insights that are withheld. No PRIVATE
  // content is ever returned. Lets an admin verify that only the deliberately-shared insight is
  // available internally and the others are not. Accepts ?org=<uuid> or ?name=<organisatienaam>.
  if (pathname === '/api/comm/mijn-boundary' && method === 'GET') {
    const { boundaryProof } = await import('../mijn/sharing.mjs');
    const orgParam = u.searchParams.get('org');
    const nameParam = u.searchParams.get('name');
    let org = null;
    if (orgParam) {
      org = (await query('select id, name from organization where id=$1 and tenant_id=$2', [orgParam, tenantId])).rows[0] || null;
    } else if (nameParam) {
      org = (await query('select id, name from organization where lower(name)=lower($1) and tenant_id=$2 order by created_at limit 1', [nameParam, tenantId])).rows[0] || null;
    }
    if (!org) { json(res, 404, { error: 'Organisatie niet gevonden' }); return true; }
    const proof = await boundaryProof(tenantId, org.id);
    json(res, 200, { organization: org.name, organizationId: org.id, ...proof });
    return true;
  }

  // ---- Mijn Maculis preview seeding (admin-gated; PREVIEW ONLY) -------------------------------
  // Triple-guarded so it can never seed real data: (1) admin session, (2) explicit env flag
  // MIJN_PREVIEW_SEED=1 (unset on production), (3) refuses if the tenant has any real (non-preview)
  // customer. Creates only clearly-marked is_preview fixtures. Returns the preview link (token).
  if (pathname === '/api/comm/mijn-seed-preview' && method === 'POST') {
    if (!/^(1|true|yes|on)$/i.test(process.env.MIJN_PREVIEW_SEED || '')) {
      json(res, 403, { ok: false, error: 'Preview-seeding is niet ingeschakeld (MIJN_PREVIEW_SEED ontbreekt).' });
      return true;
    }
    const { seedPreviewCore, assertNoRealCustomers } = await import('../mijn/seed.mjs');
    try {
      await assertNoRealCustomers(tenantId);
      const r = await seedPreviewCore({ tenantId });
      await recordAudit({ tenantId, action: 'mijn_preview_seeded', entityType: 'organization', entityId: r.organizationId, meta: { org: r.organizationName } });
      json(res, 200, { ok: true, organization: r.organizationName, link: r.link });
    } catch (e) {
      json(res, 400, { ok: false, error: e.message });
    }
    return true;
  }

  // ---- Inbox (attention model, §22) ----------------------------------------------------------
  if (pathname === '/api/comm/inbox' && method === 'GET') {
    const box = u.searchParams.get('box') === 'privacy' ? 'privacy' : 'communication';
    if (box === 'privacy' && !caps.privacy) { json(res, 403, { error: 'Geen privacy-toegang' }); return true; }
    if (box === 'privacy') await recordAudit({ tenantId, action: 'privacy_inbox_listed', entityType: 'mailbox', mailboxKind: 'PRIVACY', ipRef: ipRefOf(req) });
    const conversations = await inboxConversations(tenantId, { box, filter: u.searchParams.get('filter') || 'all' });
    const summary = await inboxSummary(tenantId);
    json(res, 200, { conversations, summary });
    return true;
  }

  // ---- Attention Cockpit (§ ATTENTION COCKPIT) -----------------------------------------------
  // One channel-agnostic answer for "wat vraagt vandaag mijn aandacht?": aggregate summary + the
  // act-now queue + row-indicator maps (by email/contact) so opening Testerbeheer shows within ~1s
  // where new communication needs attention. Derived, tenant-scoped, privacy excluded.
  if (pathname === '/api/comm/attention' && method === 'GET') {
    json(res, 200, await attentionOverview(tenantId));
    return true;
  }

  // ---- Relationship directory / search (§37) -------------------------------------------------
  if (pathname === '/api/comm/relationships' && method === 'GET') {
    json(res, 200, { relationships: await listRelationships(tenantId, { q: u.searchParams.get('q') || '' }) });
    return true;
  }

  // ---- Aggregated relationship (§5, §6) — the Workspace entry point ---------------------------
  if (pathname === '/api/comm/relationship' && method === 'GET') {
    const contact = u.searchParams.get('contact');
    const org = u.searchParams.get('org');
    const invitation = u.searchParams.get('invitation');
    const token = u.searchParams.get('token');
    let contactId = contact || null;
    if (!contactId && (invitation || token)) contactId = await contactByInvitation(tenantId, { legacyId: invitation, token });
    const rel = await getRelationship(tenantId, { contactId, orgId: org });
    if (!rel) { json(res, 404, { error: 'Relatie niet gevonden' }); return true; }
    json(res, 200, rel);
    return true;
  }

  // Bridge: migrate a Testerbeheer invitation into a permanent Contact and return its id (§9). The
  // browser passes the minimal JSON record so an as-yet-unmigrated tester still opens instantly.
  if (pathname === '/api/comm/relationship/from-invitation' && method === 'POST') {
    const body = await readJson(req); if (!body) { json(res, 400, { error: 'bad_body' }); return true; }
    const contactId = await contactByInvitation(tenantId, { legacyId: body.id, token: body.token, jsonRecord: body });
    if (!contactId) { json(res, 404, { error: 'Kon relatie niet afleiden' }); return true; }
    json(res, 200, { contactId });
    return true;
  }

  const tlMatch = pathname.match(new RegExp(`^/api/comm/relationship/${UUID}/timeline$`));
  if (tlMatch && method === 'GET') {
    json(res, 200, { timeline: await relationshipTimeline(tenantId, tlMatch[1]) });
    return true;
  }

  // ---- Conversations list (legacy shape, still used by the Inbox context pane) ---------------
  if (pathname === '/api/comm/conversations' && method === 'GET') {
    const box = u.searchParams.get('box') === 'privacy' ? 'privacy' : 'communication';
    if (box === 'privacy' && !caps.privacy) { json(res, 403, { error: 'Geen privacy-toegang' }); return true; }
    json(res, 200, { conversations: await inboxConversations(tenantId, { box, filter: u.searchParams.get('filter') || 'all' }) });
    return true;
  }

  const convMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}$`));
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
      `select id, direction, channel, from_address, to_addresses, subject, body_text, body_html_sanitized, delivery, created_at
         from message where conversation_id=$1 order by created_at asc`, [id])).rows;
    const notes = (await query('select id, body, created_at from internal_note where conversation_id=$1 order by created_at asc', [id])).rows;
    const draft = conv.is_privacy ? null : (await query(
      `select id, summary, intent, suggested_reply, suggested_actions, status from ai_draft
        where conversation_id=$1 and status='proposed' order by created_at desc limit 1`, [id])).rows[0] || null;
    const consent = conv.contact_id ? await channelConsentState(tenantId, conv.contact_id) : null;
    if (conv.status === 'NEW') await query("update conversation set status='OPEN' where id=$1 and status='NEW'", [id]);
    // A human opened the conversation — this is the ONLY signal that marks it read. Moving the
    // watermark to now() is idempotent (it only advances) and clears the unread/attention state.
    await markConversationRead(tenantId, id, { userId: null });
    json(res, 200, { conversation: conv, messages, notes, ai_draft: draft, consent });
    return true;
  }

  // Explicit mark-read (watermark) — used when a conversation is opened without a full fetch
  // (e.g. an in-place preview). Idempotent and tenant-scoped.
  const readMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/read$`));
  if (readMatch && method === 'POST') {
    json(res, 200, await markConversationRead(tenantId, readMatch[1], { userId: null }));
    return true;
  }

  // Manual reply — de AI-vrije terugvalweg (§FALLBACK). Human-in-the-loop.
  //
  // TD-002 gesloten. Deze route liep vroeger langs sendReply(), en dus langs de consent-gate en
  // langs wrapEmail() heen: uitgaande post kon hier zonder toestemmingscontrole en zonder de
  // centrale handtekening naar buiten. Er is nu nog één uitgaande weg, sendOnChannel, en die draagt
  // consent, handtekening, threading, audit en deliveryregistratie. Het kanaal komt van het gesprek
  // zelf, dus deze weg kan een gesprek ook niet stilzwijgend naar een ander kanaal verplaatsen.
  const replyMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/reply$`));
  if (replyMatch && method === 'POST') {
    const body = await readJson(req); if (!body) { json(res, 400, { error: 'bad_body' }); return true; }
    const conv = (await query('select channel, contact_id, organization_id from conversation where id=$1 and tenant_id=$2',
      [replyMatch[1], tenantId])).rows[0];
    if (!conv) { json(res, 404, { error: 'conversation_not_found' }); return true; }
    const result = await sendOnChannel({
      tenantId, conversationId: replyMatch[1], contactId: conv.contact_id, organizationId: conv.organization_id,
      channel: conv.channel || 'EMAIL', text: body.text, html: body.html, ipRef: ipRefOf(req),
    });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // Send on an explicit channel (manual composer, non-email or channel-switched). Consent-gated.
  const sendMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/send$`));
  if (sendMatch && method === 'POST') {
    const body = await readJson(req); if (!body) { json(res, 400, { error: 'bad_body' }); return true; }
    const result = await sendOnChannel({ tenantId, conversationId: sendMatch[1], channel: body.channel || 'EMAIL', subject: body.subject, text: body.text, html: body.html, purpose: body.purpose || 'service', ipRef: ipRefOf(req) });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  const noteMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/notes$`));
  if (noteMatch && method === 'POST') {
    const body = await readJson(req); if (!body) { json(res, 400, { error: 'bad_body' }); return true; }
    const text = (body.body || '').trim();
    if (!text) { json(res, 400, { error: 'empty' }); return true; }
    const ins = await query('insert into internal_note(tenant_id, conversation_id, body) values ($1,$2,$3) returning id', [tenantId, noteMatch[1], text]);
    await recordAudit({ tenantId, action: 'internal_note_created', entityType: 'conversation', entityId: noteMatch[1], ipRef: ipRefOf(req) });
    json(res, 201, { id: ins.rows[0].id });
    return true;
  }

  // Link an UNKNOWN conversation to a Contact (§20, §75).
  const linkMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/link$`));
  if (linkMatch && method === 'POST') {
    const body = await readJson(req); if (!body) { json(res, 400, { error: 'bad_body' }); return true; }
    const result = await linkConversationToContact({ tenantId, conversationId: linkMatch[1], contactId: body.contactId, newContact: body.newContact });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // ---- AI-first drafts (§AI addendum) --------------------------------------------------------
  // Open (or reuse) the working draft for a conversation. Body shared by composer + AI chat.
  const draftOpenMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/draft$`));
  if (draftOpenMatch && method === 'POST') {
    const body = await readJson(req) || {};
    const result = await drafts.openDraft({ tenantId, conversationId: draftOpenMatch[1], channel: body.channel });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  const draftIdMatch = pathname.match(new RegExp(`^/api/comm/drafts/${UUID}$`));
  if (draftIdMatch && method === 'GET') { const s = await drafts.getDraftState(draftIdMatch[1]); json(res, s ? 200 : 404, s || { error: 'not_found' }); return true; }
  if (draftIdMatch && method === 'PATCH') {
    const body = await readJson(req) || {};
    json(res, 200, await drafts.humanEdit({ draftId: draftIdMatch[1], body: body.body ?? '', subject: body.subject, channel: body.channel }));
    return true;
  }
  if (draftIdMatch && method === 'DELETE') { json(res, 200, await drafts.discardDraft({ draftId: draftIdMatch[1] })); return true; }

  const draftChatMatch = pathname.match(new RegExp(`^/api/comm/drafts/${UUID}/chat$`));
  if (draftChatMatch && method === 'POST') {
    const body = await readJson(req) || {};
    if (!body.message) { json(res, 400, { error: 'no_message' }); return true; }
    json(res, 200, await drafts.chat({ draftId: draftChatMatch[1], message: body.message, tenantId }));
    return true;
  }

  const draftChannelMatch = pathname.match(new RegExp(`^/api/comm/drafts/${UUID}/channel$`));
  if (draftChannelMatch && method === 'POST') {
    const body = await readJson(req) || {};
    json(res, 200, await drafts.setChannel({ draftId: draftChannelMatch[1], channel: body.channel, adapt: body.adapt !== false }));
    return true;
  }

  // Approve + send the draft (the last human step). Consent-gated inside sendOnChannel.
  const draftSendMatch = pathname.match(new RegExp(`^/api/comm/drafts/${UUID}/send$`));
  if (draftSendMatch && method === 'POST') {
    const state = await drafts.getDraftState(draftSendMatch[1]);
    if (!state) { json(res, 404, { error: 'not_found' }); return true; }
    const d = state.draft;
    if (d.status !== 'draft') { json(res, 400, { error: 'already_' + d.status }); return true; }
    await query("update comm_draft set status='approved', approved_at=now() where id=$1", [d.id]);
    const result = await sendOnChannel({ tenantId, conversationId: d.conversation_id, contactId: d.contact_id, organizationId: d.organization_id, channel: d.channel, subject: d.subject, text: d.body, draftId: d.id, ipRef: ipRefOf(req) });
    if (!result.ok) await query("update comm_draft set status='draft', approved_at=null where id=$1", [d.id]); // let the user retry
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // On-demand AI helpers on a conversation (summary / next-action / follow-up extraction).
  const aiMatch = pathname.match(new RegExp(`^/api/comm/conversations/${UUID}/ai/([a-z_]+)$`));
  if (aiMatch && method === 'POST') {
    const [, id, op] = aiMatch;
    if (op === 'summary') { json(res, 200, await ai.summarizeConversation({ tenantId, conversationId: id })); return true; }
    if (op === 'suggest') { json(res, 200, await ai.suggestNextAction({ tenantId, conversationId: id })); return true; }
    if (op === 'followups') { json(res, 200, await ai.extractFollowUps({ tenantId, conversationId: id })); return true; }
    if (op === 'memory') { json(res, 200, await ai.extractMemory({ tenantId, conversationId: id })); return true; }
    if (op === 'explain') { const b = await readJson(req) || {}; json(res, 200, await ai.explain({ tenantId, conversationId: id, question: b.question })); return true; }
    json(res, 404, { error: 'unknown_ai_op' }); return true;
  }

  // ---- Relationship Memory (§RELATIONSHIP MEMORY) --------------------------------------------
  if (pathname === '/api/comm/memory' && method === 'GET') {
    json(res, 200, { memory: await listMemory(tenantId, { contactId: u.searchParams.get('contact'), organizationId: u.searchParams.get('org') }) });
    return true;
  }
  if (pathname === '/api/comm/memory' && method === 'POST') {
    const body = await readJson(req) || {};
    const result = await addMemory(tenantId, { contactId: body.contactId, organizationId: body.organizationId, conversationId: body.conversationId, kind: body.kind, content: body.content, source: body.source || 'human', validUntil: body.validUntil, sourceRef: body.sourceRef });
    json(res, result.ok ? 201 : 400, result);
    return true;
  }
  const memConfirm = pathname.match(new RegExp(`^/api/comm/memory/${UUID}/confirm$`));
  if (memConfirm && method === 'POST') { json(res, 200, await confirmMemory(tenantId, memConfirm[1])); return true; }
  const memId = pathname.match(new RegExp(`^/api/comm/memory/${UUID}$`));
  if (memId && method === 'DELETE') { json(res, 200, await dismissMemory(tenantId, memId[1])); return true; }

  // ---- Follow-ups (§34) ----------------------------------------------------------------------
  if (pathname === '/api/comm/followups' && method === 'GET') {
    json(res, 200, { followUps: await listFollowUps(tenantId, { contactId: u.searchParams.get('contact'), organizationId: u.searchParams.get('org'), status: u.searchParams.get('status') || 'open' }) });
    return true;
  }
  if (pathname === '/api/comm/followups' && method === 'POST') {
    const body = await readJson(req) || {};
    const result = await createFollowUp(tenantId, { contactId: body.contactId, organizationId: body.organizationId, conversationId: body.conversationId, title: body.title, note: body.note, channelHint: body.channelHint, dueAt: body.dueAt });
    json(res, result.ok ? 201 : 400, result);
    return true;
  }
  const fuMatch = pathname.match(new RegExp(`^/api/comm/followups/${UUID}$`));
  if (fuMatch && method === 'PATCH') {
    const body = await readJson(req) || {};
    json(res, 200, await updateFollowUp(tenantId, fuMatch[1], { status: body.status, dueAt: body.dueAt, title: body.title, note: body.note }));
    return true;
  }

  // ---- Consent per channel (§27/§28/§74) -----------------------------------------------------
  const consentGet = pathname.match(new RegExp(`^/api/comm/contacts/${UUID}/consent$`));
  if (consentGet && method === 'GET') {
    json(res, 200, { state: await channelConsentState(tenantId, consentGet[1]), preferences: await listPreferences(tenantId, consentGet[1]) });
    return true;
  }
  if (consentGet && method === 'POST') {
    const body = await readJson(req) || {};
    if (!body.channel || typeof body.allowed !== 'boolean') { json(res, 400, { error: 'channel + allowed required' }); return true; }
    await setPreference(tenantId, consentGet[1], { channel: body.channel, purpose: body.purpose || 'service', allowed: body.allowed, source: body.source || 'manual', legalBasis: body.legalBasis, evidence: body.evidence });
    await recordAudit({ tenantId, action: 'consent_changed', entityType: 'contact', entityId: consentGet[1], ipRef: ipRefOf(req), meta: { channel: body.channel, allowed: body.allowed } });
    json(res, 200, { ok: true, state: await channelConsentState(tenantId, consentGet[1]) });
    return true;
  }

  // Legacy contact timeline (activity rows only) — kept for backward compatibility.
  const legacyTl = pathname.match(new RegExp(`^/api/comm/contacts/${UUID}/timeline$`));
  if (legacyTl && method === 'GET') { json(res, 200, { timeline: await contactTimeline(tenantId, legacyTl[1]) }); return true; }

  // ---- Channel inbound SIMULATOR (admin-gated) — drives mock WhatsApp/SMS/social inbound for
  //      the multi-channel Inbox demo + E2E. Real providers use signature-authed webhooks (§19).
  if (pathname === '/api/comm/inbound/simulate' && method === 'POST') {
    const body = await readJson(req) || {};
    const result = await receiveChannelInbound({ tenantId, channel: body.channel, from: body.from, to: body.to, text: body.text, providerMessageId: body.providerMessageId });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  return false;
}

export { commEnabled };
