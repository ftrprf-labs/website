// Maculis Future Cockpit — orchestration / application layer (Slice 1).
//
// The ONE meaning-first API between the frozen Cockpit UX and the existing
// Communication Layer. The frontend asks cockpit-shaped questions ("wat vraagt nu
// aandacht?", "wat weet Maculis over deze relatie?", "open het gesprek", "verstuur")
// and NEVER orchestrates the underlying services itself. Everything here is a thin
// wrapper over verified Communication Layer functions — no new engine, no fixtures.
//
// Slice 1 scope: Vandaag (attention) -> dossier -> gesprek -> AI-prepared draft ->
// human review/edit -> explicit approval -> consent-gated EMAIL send -> result back
// in Maculis -> observation confirmed/rejected into durable memory.
//
// Hard invariants enforced here:
//   - fail-closed: 503 unless the Communication Layer is enabled (db + flag);
//   - admin session required for everything except /config;
//   - reads are SIDE-EFFECT-FREE (unlike the comm conversation GET, which mutates);
//   - sending goes ONLY through the consent-gated + audited draft-approve-send path;
//   - EMAIL is the only digitally sendable channel in Slice 1 (others are rejected).

import { commEnabled, agentsEnabled, query } from '../comm/db.mjs';
import { getDefaultTenantId } from '../comm/tenant.mjs';
import { attentionHeadline, markConversationRead } from '../comm/attention.mjs';
import { buildRadar } from '../comm/signals.mjs';
import { recordWorkItem, resolveWorkItem, listWorkItems, shapeWorkItem, WORK_ACTIONS } from '../comm/work.mjs';
import { lensSummaryForContact } from '../comm/lens.mjs';
import { assessConversation } from '../comm/ai/service.mjs';
import { decisionLabel } from '../comm/ai/context-layer.mjs';
import { getRelationship } from '../comm/relationship.mjs';
import * as drafts from '../comm/drafts.mjs';
import { sendOnChannel } from '../comm/send.mjs';
import { confirmMemory, dismissMemory } from '../comm/memory.mjs';
import { channelConsentState } from '../comm/consent.mjs';
import { getChannelProvider } from '../comm/providers/index.mjs';
import { createFollowUp, updateFollowUp, listFollowUps } from '../comm/followups.mjs';
import { recordAudit } from '../comm/audit.mjs';
import { listRelationships } from '../comm/relationship.mjs';
import { inboxConversations, privacyAttention } from '../comm/inbox.mjs';
import { stripForContext } from '../comm/signature.mjs';
import { config } from '../config.mjs';

const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readJson(req, limit = 1024 * 1024) {
  return new Promise((resolve) => {
    let raw = ''; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { req.destroy(); resolve(null); return; } raw += c; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}
const ipRefOf = (req) => (req.socket && req.socket.remoteAddress ? String(req.socket.remoteAddress).slice(0, 40) : null);

// Mag er op dit kanaal geantwoord worden? Dit is geen productaanname maar een providerfeit: de
// adapter zegt zelf of hij uitgaand kan. Daardoor werkt een antwoord op een Mijn Maculis-gesprek
// zonder dat de Cockpit dat kanaal hoeft te kennen, en blijft een kanaal zonder uitgaande weg
// eerlijk geweigerd in plaats van gefingeerd.
//
// Let op het verschil met SENDABLE_CHANNELS: dat is de lijst kanalen waar je een gesprek NAARTOE
// mag verplaatsen. Antwoorden op het kanaal waar iemand jou aansprak is iets anders, en ruimer.
// De verzameling blijft bewust smal. WHATSAPP, SMS en de sociale kanalen draaien als mock-adapter;
// daar een antwoord op "versturen" zou aflevering fingeren, en dat weigert de Cockpit uitdrukkelijk.
// MIJN_MACULIS hoort er wel bij, want daar IS opslag de aflevering: het bericht staat meteen in de
// database die de klant zelf leest. Dit is dus geen verbreding van het product, alleen het opheffen
// van de aanname dat elk antwoord een e-mail is.
const COCKPIT_REPLY_CHANNELS = ['EMAIL', 'MIJN_MACULIS'];

export function canReplyOnChannel(channel) {
  if (!COCKPIT_REPLY_CHANNELS.includes(channel)) return false;
  // Tweede net: de adapter moet werkelijk een bericht kunnen afleveren. PHONE meldt outbound omdat
  // het een gesprek kan OPZETTEN, maar heeft geen send(). Zo kan een kanaal nooit binnenglippen
  // doordat het alleen in de lijst hierboven wordt gezet.
  const p = getChannelProvider(channel);
  return Boolean(p && typeof p.send === 'function' && p.capabilities && p.capabilities().outbound);
}

// ---- meaning-first shaping ---------------------------------------------------

// The canonical Vandaag headline over the radar buckets. Meaning over counts, grammatically correct,
// honest about prepared work, calm when nothing is urgent. Never a dash as a stylistic pause.
function radarHeadline({ nu, klaar, radar }, replyReady) {
  if (nu > 0) return attentionHeadline(nu, replyReady);
  if (klaar > 0) {
    return { primary: 'Geen nieuwe vragen.', secondary: 'Wel werk dat Maculis voor je klaarzette.', zero: false };
  }
  if (radar > 0) {
    return { primary: 'Rustig vandaag.', secondary: 'Een paar relaties staan op de radar.', zero: false };
  }
  return attentionHeadline(0, 0);
}

// Slice 2 — the intelligence the copilot already produces, made legible. Human words for the
// machine intent vocabulary; unknown labels are shown as a neutral signal, never invented.
const INTENT_LABEL = {
  question: 'vraag', interest: 'interesse', meeting: 'afspraak',
  commercial_opportunity: 'kans', objection: 'bezwaar', information: 'informatie',
  action_requested: 'actie gevraagd', no_action: 'geen actie nodig',
};
const intentLabel = (i) => (i ? (INTENT_LABEL[i] || 'signaal') : null);

// A prepared suggested_action, rendered meaning-first. `executable` marks the ones Slice 2 can
// actually carry out as a SAFE, INTERNAL, human-initiated move (never external, never auto). The
// rest are shown honestly as prepared but not yet actionable.
function renderNextMove(a) {
  if (!a || typeof a !== 'object' || !a.type) return null;
  switch (a.type) {
    case 'follow_up_task': {
      const d = Number(a.in_days) > 0 ? Number(a.in_days) : 3;
      return { type: a.type, in_days: d, label: `Follow-up over ${d} dag${d === 1 ? '' : 'en'} plannen`, executable: true };
    }
    case 'mark_commercial_opportunity':
      return { type: a.type, label: 'Markeren als kans', executable: false };
    case 'propose_next_lens':
      return { type: a.type, label: 'Een volgende blik voorstellen', executable: false };
    default:
      return { type: a.type, label: String(a.type).replace(/_/g, ' '), executable: false };
  }
}

// Slice 4 — prepared work (follow-ups) shaped meaning-first for the cockpit.
function shapeFollowUp(f) {
  return {
    id: f.id,
    title: f.title,
    note: f.note || null,
    dueAt: f.due_at || null,
    overdue: !!f.overdue,
    contactId: f.contact_id || null,
    conversationId: f.conversation_id || null,
    who: [f.first_name, f.last_name].filter(Boolean).join(' ') || null,
    org: f.org || null,
  };
}

// EMAIL is the only channel that can actually deliver in Slice 1. The reachability
// zone stays honest about the three separate layers: the datum exists, consent
// allows it, and a real send/call adapter exists.
function reachability(rel) {
  const ids = rel.identities || [];
  const val = (ch) => { const i = ids.find((x) => x.channel === ch); return i ? i.value : null; };
  const consent = rel.consent || {};
  const email = val('EMAIL') || (rel.contact && rel.contact.email) || null;
  const phone = val('PHONE') || (rel.contact && rel.contact.mobile) || null;
  return {
    email: email ? { value: email, sendable: consent.EMAIL ? consent.EMAIL.allowed : true, adapter: 'A' } : null,
    phone: phone ? { value: phone, sendable: false, note: 'bellen als menselijke actie', adapter: 'A_human' } : null,
    // WhatsApp/SMS are NOT presented as a working capability in Slice 1.
    whatsapp: null, sms: null,
    consent,
  };
}

// ---- handler ----------------------------------------------------------------

export async function handleCockpit(req, res, { pathname, method, isAuthed }) {
  if (!pathname.startsWith('/api/cockpit/')) return false;
  const u = new URL(req.url, 'http://x');

  // /config is safe pre-auth: it lets the page decide real-data mode vs a
  // fail-closed "niet geconfigureerd" state. No secrets.
  if (pathname === '/api/cockpit/config' && method === 'GET') {
    json(res, 200, {
      commEnabled: commEnabled(),
      authed: isAuthed(req),
      emailOnly: true,
      // Only EMAIL can actually deliver; a real transport must be configured for Phase B.
      mailConfigured: Boolean(config.mailTransport && config.mailApiKey),
      // Whether the digital-colleague domain is on. Lets Vandaag show Scout as a colleague you can
      // ask to look, without turning the cockpit into an agent console when it is off.
      agentsEnabled: agentsEnabled(),
      slice: 'slice-5',
    });
    return true;
  }

  // Fail-closed: the whole real-data surface is dark unless the Communication Layer
  // is enabled (COMM_LAYER_ENABLED=1 + DATABASE_URL). Never pretend.
  if (!commEnabled()) { json(res, 503, { error: 'comm_layer_disabled' }); return true; }

  // ---- Agent ingestion: a digital colleague lands work into the cockpit --------
  // THE integration contract for the separate agent domain. Reachable either with an admin session
  // or the shared AGENT_INGEST_KEY header (x-agent-key), so an out-of-process colleague can post.
  // It only WRITES an attention item into the one reality; it never sends anything external.
  if (pathname === '/api/cockpit/agent/work' && method === 'POST') {
    const keyOk = config.agentIngestKey && req.headers['x-agent-key'] === config.agentIngestKey;
    if (!keyOk && !isAuthed(req)) { json(res, 401, { error: 'Niet gemachtigd' }); return true; }
    const tid = await getDefaultTenantId();
    const body = await readJson(req);
    if (!body || typeof body !== 'object') { json(res, 400, { ok: false, reason: 'bad_body' }); return true; }
    const r = await recordWorkItem(tid, body);
    json(res, r.ok ? 200 : 400, r);
    return true;
  }

  if (!isAuthed(req)) { json(res, 401, { error: 'Niet ingelogd' }); return true; }
  const tenantId = await getDefaultTenantId();

  // ---- Preview-only live-model validation (Gesprekken) -------------------------
  // Guarded: admin session (above) + PREVIEW_SEED; inert in production. Runs the EXISTING
  // assessConversation/draftReply/reviseDraft UNCHANGED over disposable scenario fixtures and deletes
  // them again. Refuses unless the live provider is active, so results can never be a silent mock.
  // It changes no Constitution/prompt/model/provider/generation logic; it only observes and reports.
  if (pathname === '/api/cockpit/validate/gesprekken' && method === 'POST') {
    if (!/^(1|true|yes|on)$/i.test(process.env.PREVIEW_SEED || '')) { json(res, 404, { error: 'not_available' }); return true; }
    const { runGesprekkenValidation } = await import('./validation.mjs');
    const out = await runGesprekkenValidation(tenantId);
    json(res, out.ok ? 200 : 400, out);
    return true;
  }

  // ---- Vandaag: the attention surface (the relational radar) -------------------
  // Slice 5 — one meaning-first selection, not the inbox and not the relation list. Signals from
  // several senses (COMM, FOLLOW_UP, ...) are derived from authoritative state, aggregated per
  // relation and ranked into three buckets: NU (needs you), KLAAR (Maculis prepared something),
  // OP DE RADAR (relevant, no action needed). Recomputed every call, so it can never go stale.
  if (pathname === '/api/cockpit/today' && method === 'GET') {
    const radar = await buildRadar(tenantId);
    // Privacy rijdt mee op dezelfde aanroep, maar blijft buiten de radar en buiten de bakken. Het is
    // een telling en een ouderdom, geen aandachtskaart: de Cockpit toont nooit een privacygesprek.
    const privacy = await privacyAttention(tenantId);
    json(res, 200, {
      headline: radarHeadline(radar.counts, radar.replyReady),
      privacy,
      counts: radar.counts,
      buckets: radar.buckets,          // { NU:[cards], KLAAR:[cards], RADAR:[cards] }
      dataGaps: radar.dataGaps,
      quietThresholdDays: radar.quietThresholdDays,
      source: radar.source,
    });
    return true;
  }

  // ---- Acties: the prepared-work list (open follow-ups across relations) -------
  if (pathname === '/api/cockpit/actions' && method === 'GET') {
    const actions = (await listFollowUps(tenantId, { status: 'open' })).map(shapeFollowUp);
    json(res, 200, { actions, count: actions.length });
    return true;
  }

  // ---- Complete a follow-up (human action, audited) ----------------------------
  const fuDone = pathname.match(new RegExp(`^/api/cockpit/followup/${UUID}/done$`));
  if (fuDone && method === 'POST') {
    const r = await updateFollowUp(tenantId, fuDone[1], { status: 'done' });
    if (!r.ok) { json(res, r.reason === 'not_found' ? 404 : 400, { ok: false, reason: r.reason || 'update_failed' }); return true; }
    await recordAudit({ tenantId, action: 'cockpit_followup_done', entityType: 'follow_up', entityId: fuDone[1], ipRef: ipRefOf(req) });
    json(res, 200, { ok: true });
    return true;
  }

  // ---- Colleague work: the human decision on a piece of prepared/proposed work -
  // Human in the loop: view/approve/edit/take_over/reject/complete. Nothing external is sent;
  // approving a proposed lead materialises the real relation in the same reality.
  const workAct = pathname.match(new RegExp(`^/api/cockpit/work/${UUID}/([a-z_]+)$`));
  if (workAct && method === 'POST') {
    const action = workAct[2];
    if (!WORK_ACTIONS.includes(action)) { json(res, 400, { ok: false, reason: 'bad_action' }); return true; }
    const body = await readJson(req) || {};
    const r = await resolveWorkItem(tenantId, workAct[1], action, { actorKey: 'lud', edit: body.edit || null });
    json(res, r.ok ? 200 : (r.reason === 'not_found' ? 404 : 400), r);
    return true;
  }

  // ---- Colleague work: the open work list (all relations) ----------------------
  if (pathname === '/api/cockpit/work' && method === 'GET') {
    const items = (await listWorkItems(tenantId, { status: 'open' })).map(shapeWorkItem);
    json(res, 200, { work: items, count: items.length });
    return true;
  }

  // ---- Relaties: a real, searchable overview from the Comm Layer ---------------
  // Same reality as Vandaag and the dossier; wraps the existing listRelationships service.
  if (pathname === '/api/cockpit/relations' && method === 'GET') {
    const q = (u.searchParams.get('q') || '').slice(0, 120);
    const rows = await listRelationships(tenantId, { q, limit: 200 });
    const relations = rows.map((r) => ({
      contactId: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Onbekend',
      org: r.org || null,
      email: r.email || null,
      stage: r.relationship_stage || null,
      openConversations: Number(r.open_convs || 0),
      lastActivity: r.last_activity || null,
    }));
    json(res, 200, { relations, count: relations.length, query: q });
    return true;
  }

  // ---- Gesprekken: a real conversations overview (communication box only) ------
  // Privacy conversations are never surfaced here. Wraps the existing inbox service.
  if (pathname === '/api/cockpit/conversations' && method === 'GET') {
    const filter = u.searchParams.get('filter') || 'all';
    const rows = await inboxConversations(tenantId, { box: 'communication', filter, limit: 200 });
    const conversations = rows.map((c) => ({
      conversationId: c.id,
      contactId: c.contact_id || null,
      who: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend',
      org: c.org || null,
      channel: c.channel,
      subject: c.subject || null,
      status: c.status,
      preview: (stripForContext(c.last_body || '') || '').replace(/\s+/g, ' ').trim().slice(0, 140) || null,
      lastMessageAt: c.last_message_at,
      hasPrepared: c.attention.includes('ai_ready'),
      waitingOnUs: c.attention.includes('waiting_on_us'),
    }));
    json(res, 200, { conversations, count: conversations.length });
    return true;
  }

  // ---- Dossier: what does Maculis really know about this relation --------------
  const relMatch = pathname.match(new RegExp(`^/api/cockpit/relation/${UUID}$`));
  if (relMatch && method === 'GET') {
    const rel = await getRelationship(tenantId, { contactId: relMatch[1] });
    if (!rel || !rel.contact) { json(res, 404, { error: 'Relatie niet gevonden' }); return true; }
    const c = rel.contact;
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
    // Observation vs durable memory stays explicit (proposed vs confirmed).
    const observed = (rel.memory || []).filter((m) => m.confidence === 'proposed');
    const remembered = (rel.memory || []).filter((m) => m.confidence !== 'proposed');
    // The conversation to open: prefer one with an actionable/ai-ready state.
    const convs = rel.conversations || [];
    const fallbackConv = convs.find((cv) => cv.ai_ready) || convs.find((cv) => cv.unread > 0) || convs[0] || null;
    // Slice 5 — the SAME radar, scoped to this relation, so the dossier tells exactly the story
    // Vandaag tells (§ 20, één werkelijkheid). The primary attention reason drives "wat speelt er nu".
    const relRadar = await buildRadar(tenantId, { contactId: c.id });
    const relCards = [...relRadar.buckets.NU, ...relRadar.buckets.KLAAR, ...relRadar.buckets.RADAR];
    const attentionNow = relCards.length
      ? { bucket: relCards[0].bucket, reason: relCards[0].primary.reason, type: relCards[0].primary.type,
          secondary: relCards[0].secondary, conversationId: relCards[0].conversationId }
      : null;
    // Colleague work touching this relation (origin, evidence, proposal, actions), same reality as Vandaag.
    const relWork = relCards.flatMap((card) => card.work || []);
    // Lens hoofdlijn (Niveau C): content-free fact that this relation went through the Lens. The cockpit
    // user is a human advisor; agents never reach this. No reveal content, answers or reflections.
    const lens = await lensSummaryForContact(tenantId, c.id, { viewer: { kind: 'HUMAN' } });
    json(res, 200, {
      identity: {
        contactId: c.id, name, role: c.role || null,
        org: rel.organization ? rel.organization.name : null,
        stage: rel.stage || null,
      },
      reachability: reachability(rel),
      attention: attentionNow,                            // radar reason, consistent with Vandaag
      attentionSignals: relRadar.signals,                 // herleidbaar (provenance)
      work: relWork,                                      // colleague/agent work on this relation
      owner: relWork.length ? relWork[0].owner : null,    // who owns the open work here
      lens,                                               // Niveau-C Lens hoofdlijn (content-free) or null
      now: attentionNow ? { label: attentionNow.reason } : (rel.summary ? rel.summary.nextAction : null),
      journey: rel.journey ? { campaign: rel.journey.campaign, status: rel.journey.status } : null,
      conversations: convs.map((cv) => ({
        id: cv.id, subject: cv.subject, channel: cv.channel, status: cv.status,
        lastMessageAt: cv.last_message_at, unread: cv.unread, aiReady: cv.ai_ready,
      })),
      // Eén vraag, één antwoord. Dit veld en `attention.conversationId` beantwoorden allebei "welk
      // gesprek open ik hier", maar leidden dat elk op een eigen manier af: de radar koos de
      // langst wachtende draad, deze regel de nieuwste ongelezen. Bij een relatie met twee open
      // draden gaf één en dezelfde respons daardoor twee verschillende gesprekken terug. De radar
      // is leidend, want die levert ook de reden die de mens leest.
      primaryConversationId: (attentionNow && attentionNow.conversationId) || (fallbackConv ? fallbackConv.id : null),
      observed,        // AI observations awaiting human confirm/reject
      remembered,      // durable, human-confirmed memory
      followups: rel.followUps || [],
      orgContacts: rel.orgContacts || [],
      summary: rel.summary || null,
    });
    return true;
  }

  // ---- Gesprek: SIDE-EFFECT-FREE read (thread + prepared draft) ----------------
  // The comm GET /conversations/:id mutates (NEW->OPEN + marks read). The cockpit
  // read must not: opening the dossier/preview must never silently clear attention.
  const convMatch = pathname.match(new RegExp(`^/api/cockpit/conversation/${UUID}$`));
  if (convMatch && method === 'GET') {
    const id = convMatch[1];
    const conv = (await query(
      `select c.id, c.subject, c.status, c.channel, c.is_privacy, c.contact_id, c.organization_id,
              ct.first_name, ct.last_name, ct.email, o.name as org
         from conversation c left join contact ct on ct.id=c.contact_id left join organization o on o.id=c.organization_id
        where c.id=$1 and c.tenant_id=$2`, [id, tenantId])).rows[0];
    if (!conv) { json(res, 404, { error: 'Gesprek niet gevonden' }); return true; }
    if (conv.is_privacy) { json(res, 403, { error: 'privacy_conversation' }); return true; }
    const messages = (await query(
      `select id, direction, channel, from_address, subject, body_text, delivery, created_at
         from message where conversation_id=$1 order by created_at asc`, [id])).rows;
    const proposal = (await query(
      `select summary, intent, suggested_reply, suggested_actions from ai_draft
        where conversation_id=$1 and status='proposed' order by created_at desc limit 1`, [id])).rows[0] || null;
    // Slice 2 — make the copilot's reading legible: human intent + prepared, human-approvable moves.
    const understanding = proposal && proposal.summary
      ? { summary: proposal.summary, intent: intentLabel(proposal.intent) } : null;
    const nextMoves = proposal && Array.isArray(proposal.suggested_actions)
      ? proposal.suggested_actions.map(renderNextMove).filter(Boolean) : [];
    const working = (await query(
      `select id, status, channel, subject, body, ai_generated, human_edited, version
         from comm_draft where conversation_id=$1 and status='draft' order by created_at desc limit 1`, [id])).rows[0] || null;
    const consent = conv.contact_id ? await channelConsentState(tenantId, conv.contact_id) : null;
    // Task context: what is relationally needed here, decided BEFORE any drafting (§ context layer).
    const assess = await assessConversation({ tenantId, conversationId: id });
    const assessment = { decision: assess.decision, label: decisionLabel(assess.decision), reason: assess.reason };
    json(res, 200, {
      conversation: {
        id: conv.id, subject: conv.subject, status: conv.status, channel: conv.channel,
        who: [conv.first_name, conv.last_name].filter(Boolean).join(' ') || conv.email || 'Onbekend',
        org: conv.org, contactId: conv.contact_id,
      },
      messages, proposal, workingDraft: working, consent,
      understanding,   // what Maculis reads in this thread (grounded in a real ai_draft)
      assessment,      // what is relationally needed now (decided before writing)
      nextMoves,       // prepared, not auto-executed; the human chooses
    });
    return true;
  }

  // ---- Open (or reuse) the working draft for a conversation ---------------------
  // Het kanaal wordt NIET opgelegd. openDraft() neemt het kanaal van het gesprek zelf, dus een
  // gesprek dat in Mijn Maculis begon krijgt daar zijn concept, en een mailthread blijft e-mail.
  // Je antwoordt waar iemand jou aansprak; je verplaatst een gesprek niet stilzwijgend.
  const draftOpen = pathname.match(new RegExp(`^/api/cockpit/conversation/${UUID}/draft$`));
  if (draftOpen && method === 'POST') {
    const result = await drafts.openDraft({ tenantId, conversationId: draftOpen[1] });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // ---- Human edits the draft (direct edit) ------------------------------------
  const draftEdit = pathname.match(new RegExp(`^/api/cockpit/draft/${UUID}$`));
  if (draftEdit && method === 'PATCH') {
    const body = await readJson(req) || {};
    // Geen kanaal meesturen: humanEdit doet coalesce, dus het kanaal van het concept blijft staan.
    json(res, 200, await drafts.humanEdit({ draftId: draftEdit[1], body: body.body ?? '', subject: body.subject }));
    return true;
  }

  // ---- AI revises the SAME draft (warmer/shorter) — still human-approved later -
  const draftRevise = pathname.match(new RegExp(`^/api/cockpit/draft/${UUID}/revise$`));
  if (draftRevise && method === 'POST') {
    const body = await readJson(req) || {};
    if (!body.instruction) { json(res, 400, { error: 'no_instruction' }); return true; }
    json(res, 200, await drafts.aiRevise({ draftId: draftRevise[1], instruction: body.instruction, tenantId }));
    return true;
  }

  // ---- Approve + send: the last human step. Consent-gated, audited ------------
  // Antwoordt op het kanaal van het GESPREK, niet op een vast kanaal. De provider is de bron van
  // waarheid: kan hij niet uitgaand, dan wordt er geweigerd en niets gefingeerd. Loopt altijd via
  // sendOnChannel, dus door de consent-gate, de handtekening, threading, audit en delivery.
  const draftSend = pathname.match(new RegExp(`^/api/cockpit/draft/${UUID}/send$`));
  if (draftSend && method === 'POST') {
    const state = await drafts.getDraftState(draftSend[1]);
    if (!state) { json(res, 404, { error: 'not_found' }); return true; }
    const d = state.draft;
    if (!canReplyOnChannel(d.channel)) { json(res, 400, { error: 'kanaal_niet_beschikbaar', channel: d.channel }); return true; }
    if (d.status !== 'draft') { json(res, 400, { error: 'already_' + d.status }); return true; }
    if (!d.body || !String(d.body).trim()) { json(res, 400, { error: 'empty_body' }); return true; }
    await query("update comm_draft set status='approved', approved_at=now() where id=$1", [d.id]);
    const result = await sendOnChannel({
      tenantId, conversationId: d.conversation_id, contactId: d.contact_id, organizationId: d.organization_id,
      channel: d.channel, subject: d.subject, text: d.body, draftId: d.id, ipRef: ipRefOf(req),
    });
    if (!result.ok) await query("update comm_draft set status='draft', approved_at=null where id=$1", [d.id]);
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // ---- Settle: a handled item falls back to rest (read watermark) --------------
  const settle = pathname.match(new RegExp(`^/api/cockpit/conversation/${UUID}/settle$`));
  if (settle && method === 'POST') {
    json(res, 200, await markConversationRead(tenantId, settle[1], { userId: null }));
    return true;
  }

  // ---- Prepared next move: a SAFE, INTERNAL, human-initiated action -----------
  // The copilot prepares suggested_actions; nothing runs until the human chooses one here. Slice 2
  // executes only internal moves (a follow-up). External actions stay behind the consent-gated send
  // path. Refuses non-executable action types honestly rather than pretending.
  const nextMove = pathname.match(new RegExp(`^/api/cockpit/conversation/${UUID}/next-move$`));
  if (nextMove && method === 'POST') {
    const body = await readJson(req) || {};
    const move = renderNextMove(body);
    if (!move) { json(res, 400, { ok: false, error: 'unknown_move' }); return true; }
    if (!move.executable) { json(res, 400, { ok: false, reason: 'not_executable_yet', type: move.type }); return true; }
    const conv = (await query(
      `select c.id, c.subject, c.contact_id, c.organization_id,
              (select summary from ai_draft where conversation_id=c.id and status='proposed' order by created_at desc limit 1) as ai_summary
         from conversation c where c.id=$1 and c.tenant_id=$2`, [nextMove[1], tenantId])).rows[0];
    if (!conv) { json(res, 404, { ok: false, error: 'not_found' }); return true; }
    if (move.type === 'follow_up_task') {
      // Idempotent per conversation: if an open follow-up already exists for this thread, return it
      // instead of stacking duplicates (one action, one prepared task).
      const dup = (await query("select id, title, due_at from follow_up where tenant_id=$1 and conversation_id=$2 and status='open' order by created_at desc limit 1", [tenantId, conv.id])).rows[0];
      if (dup) { json(res, 200, { ok: true, move: move.type, deduped: true, followUp: { id: dup.id, title: dup.title, dueAt: dup.due_at } }); return true; }
      const dueAt = new Date(Date.now() + move.in_days * 86400000).toISOString();
      const base = (conv.ai_summary || conv.subject || 'dit gesprek').replace(/\s+/g, ' ').trim().slice(0, 120);
      const title = `Opvolgen: ${base}`;
      const fu = await createFollowUp(tenantId, {
        contactId: conv.contact_id, organizationId: conv.organization_id, conversationId: conv.id,
        title, channelHint: 'EMAIL', dueAt,
      });
      if (!fu.ok) { json(res, 400, { ok: false, reason: fu.reason || 'follow_up_failed' }); return true; }
      await recordAudit({ tenantId, action: 'cockpit_next_move', entityType: 'conversation', entityId: conv.id,
        ipRef: ipRefOf(req), meta: { move: move.type, followUpId: fu.id, dueAt } });
      json(res, 200, { ok: true, move: move.type, followUp: { id: fu.id, title, dueAt } });
      return true;
    }
    json(res, 400, { ok: false, reason: 'not_executable_yet', type: move.type });
    return true;
  }

  // ---- Observation -> durable memory: confirm or reject an AI observation ------
  const memConfirm = pathname.match(new RegExp(`^/api/cockpit/memory/${UUID}/confirm$`));
  if (memConfirm && method === 'POST') { json(res, 200, await confirmMemory(tenantId, memConfirm[1])); return true; }
  const memReject = pathname.match(new RegExp(`^/api/cockpit/memory/${UUID}$`));
  if (memReject && method === 'DELETE') { json(res, 200, await dismissMemory(tenantId, memReject[1])); return true; }

  json(res, 404, { error: 'unknown_cockpit_route' });
  return true;
}
