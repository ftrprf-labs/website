// Communication Layer — AI service boundary (§AI PROVIDER ABSTRACTION).
//
// The ONE internal capability surface the Relationship Workspace talks to. UI components never call
// a model API directly. Each capability has a deterministic OFFLINE path (so the whole AI-first
// flow is testable with no key and keeps working if the model is briefly unavailable — §FALLBACK)
// and a LIVE path via the vendor-neutral provider (§provider.mjs). AI output is UNTRUSTED: it is
// sanitised before display and NEVER auto-sent (§HUMAN APPROVAL BLIJFT HARD).

import { getProvider, aiAvailable } from './provider.mjs';
import { INTENTS } from './copilot.mjs';
import { buildRelationshipContext, renderContextForModel } from './context.mjs';
import { assembleContext, decideResponse } from './context-layer.mjs';
import { systemForRole } from './constitution.mjs';

export function available() { return aiAvailable(); }

// One shared system layer for every communication capability: the Maculis Constitution + the
// comm-assistant role. No capability keeps its own tone copy any more (§ gedeeld DNA).
const COMM_SYSTEM = systemForRole('comm_assistant');

// ---- channel-aware shaping (§AI MOET KANAAL BEGRIJPEN) --------------------------------------
const CHANNEL_HINT = {
  EMAIL: 'E-mail: ruimte voor structuur en een nette afsluiting.',
  WHATSAPP: 'WhatsApp: kort, direct, conversationeel; geen formele aanhef of afsluiting.',
  SMS: 'SMS: zeer compact (bij voorkeur < 320 tekens), één kernboodschap.',
  PHONE: 'Telefonisch: geen geschreven bericht maar korte gesprekspunten.',
};

function firstSentences(text, n) {
  const parts = String(text).split(/(?<=[.!?])\s+/);
  return parts.slice(0, n).join(' ').trim();
}
function toWhatsAppShape(text) {
  // Strip a formal salutation/sign-off, compress whitespace.
  return String(text)
    .replace(/^(geachte|beste)\b.*$/im, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n*(met vriendelijke groet|groet(en)?|hartelijke groet)[,]?\s*\n[\s\S]*$/i, '')
    .trim();
}
function derivedSentence(instruction) {
  const cleaned = String(instruction)
    .replace(/^(voeg toe dat|voeg toe|schrijf dat|zeg dat|noem dat|vermeld dat|laat weten dat)\s*/i, '')
    .trim();
  if (!cleaned) return '';
  const s = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(s) ? s : s + '.';
}

// ---- deterministic offline transforms -------------------------------------------------------
// The offline draft is RELATIONSHIP-aware, not just a reply to the last line: when a prior commitment
// exists (a confirmed agreement in memory or an open follow-up), it is carried into the concept, so
// the output verifiably changes with the relationship history even without a live model.
function mockDraftFromContext(ctx, channel) {
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  const asksMore = /(kijken|arbeidsmarkt|ook naar|kun(nen)? jullie|mogelijk|planning|afspraak)/i.test(lastInbound?.body_text || '');
  const first = ctx.contact?.first_name || '';
  const commitment = (ctx.memory || []).find((m) => m.kind === 'agreement') || (ctx.followUps && ctx.followUps[0]) || null;
  const commitmentText = commitment ? (commitment.content || commitment.title) : null;
  let body = `Dank je voor je bericht${first ? `, ${first}` : ''}.` +
    (asksMore ? ' Ja, daar kunnen we met dezelfde blik naar kijken. Ik denk graag even mee over een goede volgende stap.' : ' Ik pak dit op en kom er bij je op terug.');
  // Relatie vóór transactie: acknowledge what we already agreed, so the thread stays one relationship.
  if (commitmentText) body += ` Ik kom ook terug op wat we eerder afspraken: ${String(commitmentText).replace(/\.$/, '')}.`;
  if (channel === 'EMAIL') body += '\n\nMet vriendelijke groet,\nMaculis';
  if (channel === 'WHATSAPP' || channel === 'SMS') body = toWhatsAppShape(body);
  return body;
}

function mockRevise(base, instruction, channel) {
  const i = String(instruction).toLowerCase();
  let body = String(base);
  let variants = null;
  // A commitment already in the concept must survive a refinement like "korter" — meaning/toezeggingen
  // are preserved, not blindly truncated.
  const commitMatch = String(base).match(/[^.!?]*\b(afsprak|afspraken|eerder afspraken|kom ook terug)\b[^.!?]*[.!?]/i);
  const commitment = commitMatch ? commitMatch[0].trim() : null;
  if (/warmer|persoonlijker|vriendelijker/.test(i)) body = `Wat goed om van je te horen. ${body}`;
  if (/korter|beknopt|\bkort\b|to the point/.test(i)) {
    body = firstSentences(body.replace(/\n\n(met vriendelijke groet|groet)[\s\S]*$/i, ''), 2);
    if (commitment && !body.includes(commitment)) body = `${body} ${commitment}`.trim();
  }
  if (/minder commercieel|te commercieel|zakelijker niet|prijs.*buiten|laat de prijs/.test(i)) body = body.replace(/[^.!?]*\b(prijs|kosten|tarief|offerte)\b[^.!?]*[.!?]/gi, '').trim();
  if (/voeg toe|erbij|vermeld|noem dat|laat weten dat|vraag of|zeg dat|schrijf dat/.test(i)) {
    const extra = derivedSentence(instruction);
    if (extra) body = `${body.trimEnd()}\n\n${extra}`;
  }
  if (/whatsapp|maak.*whatsapp/.test(i) || channel === 'WHATSAPP') body = toWhatsAppShape(body);
  if (/twee varianten|twee versies|variant/.test(i)) {
    variants = [body, `${firstSentences(body, 1)} Laat gerust weten wat voor jou het beste past.`];
  }
  return { body: body.trim(), variants };
}

function mockIntent(text) {
  const lc = String(text || '').toLowerCase();
  if (/(offerte|prijs|kosten|samenwerk|opdracht)/.test(lc)) return 'commercial_opportunity';
  if (/(afspraak|bellen|plannen|agenda|meeting)/.test(lc)) return 'meeting';
  if (/\?|(\bkan|kun|hoe|wat|wanneer|waarom)\b/.test(lc)) return 'question';
  return 'information';
}

// ---- capabilities ---------------------------------------------------------------------------

export async function classifyIntent({ text }) {
  if (!aiAvailable()) return { intent: mockIntent(text) };
  const raw = await getProvider().generate({ system: COMM_SYSTEM, prompt: `Classificeer de intentie (kies uit: ${INTENTS.join(', ')}). Antwoord met alleen het label.\n\nBERICHT:\n${(text || '').slice(0, 2000)}` });
  const intent = INTENTS.find((x) => raw.toLowerCase().includes(x)) || 'information';
  return { intent };
}

export async function summarizeConversation({ tenantId, conversationId }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  if (ctx.isPrivacy) return { summary: null, reason: 'privacy_excluded' };
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  if (!aiAvailable()) {
    const who = ctx.contact ? ([ctx.contact.first_name, ctx.contact.last_name].filter(Boolean).join(' ') || ctx.contact.email) : 'de afzender';
    return { summary: `${who} ${lastInbound ? 'reageerde in dit gesprek' : 'is in gesprek'}. ${mockIntent(lastInbound?.body_text) === 'question' ? 'Er staat een vraag open.' : 'Geen expliciete vraag herkend.'}`, intent: mockIntent(lastInbound?.body_text), refs: ctx.refs };
  }
  const raw = await getProvider().generate({ system: COMM_SYSTEM, prompt: `${renderContextForModel(ctx)}\n\nVat kort samen wat er speelt en wat de afzender lijkt te vragen.` });
  return { summary: raw.slice(0, 1000), intent: mockIntent(lastInbound?.body_text), refs: ctx.refs };
}

export async function draftReply({ tenantId, conversationId, contactId, channel = 'EMAIL', instruction = null, role = 'comm_assistant' }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId, contactId });
  if (ctx.isPrivacy) return { ok: false, reason: 'privacy_excluded' };
  // Task context FIRST: assess what is relationally needed before writing (§ aandacht beschermen).
  const assessment = decideResponse(ctx);
  if (!aiAvailable()) return { ok: true, body: mockDraftFromContext(ctx, channel), refs: ctx.refs, assessment };
  // Authorised work context only — the role's allowedSources gate what may reach the model.
  const { system, workContext, provenance } = assembleContext({ role, ctx });
  const prompt = [workContext, CHANNEL_HINT[channel] || '', instruction ? `INSTRUCTIE: ${instruction}` : 'Schrijf een passend conceptantwoord op het laatste bericht.'].filter(Boolean).join('\n\n');
  const raw = await getProvider().generate({ system, prompt });
  return { ok: true, body: raw.trim().slice(0, 4000), refs: provenance, assessment };
}

// Task-context capability: what is relationally needed in this conversation, before any drafting.
export async function assessConversation({ tenantId, conversationId }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  if (ctx.isPrivacy) return { decision: 'UNCERTAIN', reason: 'privacy_excluded', provenance: [] };
  return decideResponse(ctx);
}

// CRITICAL (§AI MAG MENSELIJKE WIJZIGINGEN NIET OVERSCHRIJVEN): revise takes the CURRENT body as
// its base. It never regenerates from scratch, so a human edit in the current draft is preserved.
export async function reviseDraft({ currentBody, subject = null, instruction, channel = 'EMAIL', tenantId = null, conversationId = null }) {
  if (!instruction || !String(instruction).trim()) return { ok: false, reason: 'no_instruction' };
  if (!aiAvailable()) {
    const { body, variants } = mockRevise(currentBody || '', instruction, channel);
    return { ok: true, body, variants, subject };
  }
  // Warmer/Korter revise from the SAME authorised context, so meaning and commitments are preserved
  // rather than a blind string rewrite. Provider-agnostic; role-gated.
  const ctx = (tenantId && conversationId) ? await buildRelationshipContext(tenantId, { conversationId }) : null;
  const assembled = ctx ? assembleContext({ role: 'comm_assistant', ctx }) : null;
  const prompt = [
    assembled ? assembled.workContext : null,
    CHANNEL_HINT[channel] || '',
    'Hieronder staat het HUIDIGE concept. Dit kan door een mens zijn aangepast — behoud die menselijke wijzigingen en de eerder gemaakte afspraken, en pas alleen aan wat de instructie vraagt. Geef het volledige nieuwe concept terug, zonder toelichting.',
    `HUIDIG CONCEPT:\n${currentBody || '(leeg)'}`,
    `INSTRUCTIE: ${instruction}`,
  ].filter(Boolean).join('\n\n');
  const raw = await getProvider().generate({ system: assembled ? assembled.system : COMM_SYSTEM, prompt });
  return { ok: true, body: raw.trim().slice(0, 4000), subject };
}

export async function suggestNextAction({ tenantId, conversationId }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  const suggestions = [];
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  const intent = mockIntent(lastInbound?.body_text);
  if (intent === 'meeting') suggestions.push({ type: 'call', label: 'Bellen lijkt hier logischer', why: 'De afzender vraagt om samen de mogelijkheden door te nemen.' });
  if (intent === 'commercial_opportunity') suggestions.push({ type: 'follow_up', label: 'Zet een follow-up over 3 dagen', why: 'Er lijkt een commerciële kans; laat het niet verdampen.' });
  if (ctx.followUps.length) suggestions.push({ type: 'open_follow_up', label: `Er staat nog een open follow-up: ${ctx.followUps[0].title}`, why: 'Deze was eerder afgesproken.' });
  // Consent-aware suggestion, never an action.
  const waBlocked = ctx.prefs.find((p) => p.channel === 'WHATSAPP' && p.allowed === false);
  if (waBlocked) suggestions.push({ type: 'consent', label: 'Deze persoon heeft WhatsApp niet toegestaan', why: 'Kies een ander kanaal.' });
  if (!suggestions.length) suggestions.push({ type: 'reply', label: 'Beantwoord het bericht', why: 'Er staat een reactie open.' });
  return { suggestions, refs: ctx.refs };
}

export async function extractFollowUps({ tenantId, conversationId }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  const txt = (lastInbound?.body_text || '').toLowerCase();
  const out = [];
  if (/terugbellen|bel je|bellen/.test(txt)) out.push({ title: 'Terugbellen', in_days: 1, channel_hint: 'PHONE' });
  if (/offerte|voorstel|prijs/.test(txt)) out.push({ title: 'Offerte/voorstel opvolgen', in_days: 3, channel_hint: 'EMAIL' });
  if (/volgende week|later|na de vakantie/.test(txt)) out.push({ title: 'Later opnieuw contact opnemen', in_days: 7, channel_hint: 'EMAIL' });
  return { followUps: out, refs: ctx.refs };
}

// Propose Relationship Memory items from the latest inbound (§RELATIONSHIP MEMORY). Deterministic
// offline recognition of agreements / preferences / reminders. Everything is returned as a PROPOSAL
// (confidence 'proposed') — a human confirms before it becomes a hard fact. Never auto-committed.
export async function extractMemory({ tenantId, conversationId }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  if (ctx.isPrivacy) return { memory: [], reason: 'privacy_excluded' };
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  const t = (lastInbound?.body_text || '');
  const lc = t.toLowerCase();
  const out = [];
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  if (/na de vakantie|volgende week|later contact|opnieuw spreken|na de zomer/.test(lc)) out.push({ kind: 'agreement', content: 'Later opnieuw contact opnemen (afspraak uit het gesprek).' });
  if (/offerte|voorstel|prijsopgave/.test(lc)) out.push({ kind: 'agreement', content: 'Offerte/voorstel is besproken.' });
  if (/telefonisch|liever bellen|voorkeur.*bellen|bel me/.test(lc)) out.push({ kind: 'preference', content: 'Voorkeur voor telefonisch contact.' });
  if (/wacht(en)? op.*(goedkeuring|akkoord|intern)/.test(lc)) out.push({ kind: 'fact', content: 'Wacht op interne goedkeuring aan hun kant.' });
  const notBefore = lc.match(/niet.*(?:vóór|voor|before)\s+(\w+)/);
  if (notBefore && months.includes(notBefore[1])) out.push({ kind: 'reminder', content: `Niet opnieuw benaderen vóór ${notBefore[1]}.` });
  return { memory: out.map((m) => ({ ...m, source: 'ai', confidence: 'proposed' })), refs: ctx.refs };
}

// Transparency (§AI TRANSPARANTIE): explain a suggestion in useful terms, not chain-of-thought.
export async function explain({ tenantId, conversationId, question }) {
  const ctx = await buildRelationshipContext(tenantId, { conversationId });
  const lastInbound = [...ctx.recent].reverse().find((m) => m.direction === 'INBOUND');
  if (!aiAvailable()) {
    return { answer: `Op basis van het laatste bericht${lastInbound ? '' : ' (geen)'} en ${ctx.followUps.length} open follow-up(s). ${ctx.journey ? 'First Five status: ' + ctx.journey.status + '.' : ''}`, refs: ctx.refs };
  }
  const raw = await getProvider().generate({ system: COMM_SYSTEM, prompt: `${renderContextForModel(ctx)}\n\nVRAAG VAN DE MEDEWERKER: ${question || 'Waarom stel je dit voor?'}\nGeef een kort, bruikbaar antwoord met verwijzing naar de relevante context (geen technische redenering).` });
  return { answer: raw.slice(0, 1200), refs: ctx.refs };
}
