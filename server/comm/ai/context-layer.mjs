// Maculis AI — the shared CONTEXT LAYER. Four layers compose every AI request:
//   1) Constitution (shared DNA)         — systemForRole()
//   2) Role context (mission + limits)    — roleBrief() / allowedSources
//   3) Authorised WORK context            — authorizeContext(): relevant, task-focused, and only the
//                                           sources this role may ever see (privacy is architecture,
//                                           not a prompt line). Provenance is kept available.
//   4) Task context                        — decideResponse(): FIRST decide what is relationally
//                                           needed, THEN (maybe) write.
//
// Provider-agnostic: no vendor here. The provider is called elsewhere (provider.mjs) with the system
// and prompt this layer assembles.

import { systemForRole, roleBrief } from './constitution.mjs';
import { renderContextForModel } from './context.mjs';

const DAY = 86400000;

// ---- TASK CONTEXT: what is relationally needed? -------------------------------------------------
// Semantic, not mere message order. Uses last inbound/outbound, questions, commitments, follow-ups
// and history to model who reasonably waits on whom. On genuine ambiguity it returns UNCERTAIN
// instead of pretending certainty.
export const RESPONSE_DECISIONS = ['REPLY_NEEDED', 'NO_REPLY_NEEDED', 'WAITING_FOR_THEM', 'ACTION_NEEDED', 'UNCERTAIN'];

const QUESTION_RE = /\?|\b(kan|kun|kunnen|hoe|wat|wanneer|waarom|zou|zouden|mogelijk|graag horen|laat je weten|laat me weten)\b/i;
const CLOSING_RE = /\b(bedankt|dank je|dank jullie|dankjewel|top|fijn|prettige|tot (snel|later|binnenkort)|geen haast|hoeft niet|is goed|helder|duidelijk)\b/i;

export function decideResponse(ctx, { now = Date.now() } = {}) {
  const recent = ctx.recent || [];
  const followUps = ctx.followUps || [];
  const provenance = [];
  const decision = (d, reason, refs = []) => ({ decision: d, reason, provenance: refs });

  // An open follow-up whose moment has come is a relational obligation regardless of who wrote last.
  const dueFu = followUps.find((f) => f.due_at && new Date(f.due_at).getTime() <= now);
  if (dueFu) return decision('ACTION_NEEDED', `Er staat een follow-up klaar die nu aan de orde is: "${dueFu.title}".`, [{ type: 'follow_up', id: dueFu.id, label: dueFu.title }]);

  if (!recent.length) return decision('UNCERTAIN', 'Geen recente berichten om op te baseren.');

  const lastMsg = recent[recent.length - 1];
  const lastInbound = [...recent].reverse().find((m) => m.direction === 'INBOUND');
  const inboundText = (lastInbound && lastInbound.body_text) || '';
  const asks = QUESTION_RE.test(inboundText);
  const closing = CLOSING_RE.test(inboundText) && !asks;

  if (lastMsg.direction === 'INBOUND') {
    if (asks) return decision('REPLY_NEEDED', 'Hun laatste bericht bevat een vraag of verzoek waarop zij een reactie verwachten.', [{ type: 'message', label: 'laatste inbound' }]);
    if (closing) return decision('NO_REPLY_NEEDED', 'Hun laatste bericht is een afronding of bedankje zonder open vraag.');
    return decision('UNCERTAIN', 'Zij schreven als laatste, maar of een antwoord verwacht wordt is niet duidelijk.');
  }
  // We wrote last.
  if (followUps.length) return decision('WAITING_FOR_THEM', 'Wij reageerden als laatste; er ligt nog een eigen follow-up klaar, de bal ligt bij hen.', followUps.slice(0, 1).map((f) => ({ type: 'follow_up', id: f.id, label: f.title })));
  return decision('WAITING_FOR_THEM', 'Wij reageerden als laatste; de bal ligt bij hen.');
}

// A short, human label for the decision (never a raw enum in the UI).
export function decisionLabel(decision) {
  return {
    REPLY_NEEDED: 'Een reactie is nodig',
    NO_REPLY_NEEDED: 'Geen reactie nodig',
    WAITING_FOR_THEM: 'De bal ligt bij hen',
    ACTION_NEEDED: 'Er staat werk klaar dat nu aan de orde is',
    UNCERTAIN: 'Onduidelijk of een reactie nodig is',
  }[decision] || 'Onbekend';
}

// ---- AUTHORISED WORK CONTEXT -------------------------------------------------------------------
// Strip every source the role may NOT see BEFORE it can reach a prompt. Returns the filtered context
// plus `excluded` (what was removed, for transparency + tests). This is where PRIVATE Lens content
// and anything outside the role's allowedSources is removed — architecture, not a prompt instruction.
export function authorizeContext(ctx, { role = 'comm_assistant' } = {}) {
  const allowed = roleBrief(role).allowedSources;
  const out = { ...ctx };
  const excluded = [];
  const drop = (key, mutate) => { excluded.push(key); mutate(); };

  if (!allowed.has('comm_thread') && (out.recent && out.recent.length)) drop('comm_thread', () => { out.recent = []; });
  if (!allowed.has('relationship')) { if (out.contact || out.org) drop('relationship', () => { out.contact = null; out.org = null; }); }
  if (!allowed.has('confirmed_memory') && (out.memory && out.memory.length)) drop('confirmed_memory', () => { out.memory = []; });
  if (!allowed.has('follow_ups') && (out.followUps && out.followUps.length)) drop('follow_ups', () => { out.followUps = []; });
  if (!allowed.has('journey') && out.journey) drop('journey', () => { out.journey = null; });

  // Lens: PRIVATE is never allowed for anyone here; SUMMARY/SHARED only if the role is granted them.
  // The comm context never carries Lens today, but if a caller attaches it, it is filtered by role.
  if (out.lensPrivate && !allowed.has('lens_private')) drop('lens_private', () => { delete out.lensPrivate; });
  if (out.lensShared && !allowed.has('lens_shared')) drop('lens_shared', () => { delete out.lensShared; });
  if (out.lensSummary && !allowed.has('lens_summary')) drop('lens_summary', () => { delete out.lensSummary; });

  // Safety net: unconfirmed AI memory must never enter generation context (context.mjs only returns
  // confirmed memory, but assert here so a future change fails loudly rather than silently leaking).
  if (Array.isArray(out.memory)) out.memory = out.memory.filter((m) => !m.confidence || m.confidence === 'confirmed');

  out.excluded = excluded;
  return out;
}

// ---- TASK RELEVANCE: the SECOND gate ----------------------------------------------------------
// available context → authorization/privacy → TASK RELEVANCE → model. Authorisation decides what a
// role MAY ever see; this decides what THIS task actually NEEDS. It runs AFTER authorizeContext, so
// privacy/role gating stays fully intact, and it ONLY ever WITHHOLDS available-but-irrelevant items —
// it never adds, unlocks or reaches past the authorisation gate. "Geautoriseerd is nog niet relevant."
//
// Category model (memory items):
//   1. relationeel_commitment  — an agreement/reminder. A promise. NEVER dropped, so a toezegging is
//      never lost by filtering. This is relationship continuity, independent of today's topic.
//   2. relationeel_communicatievorm — a preference that shapes HOW we communicate (channel/tone).
//      Kept because it demonstrably influences the answer's form.
//   3. direct_relevant — a plain fact that demonstrably overlaps the current task (a shared content
//      term with the last inbound + subject). Kept, with the matched term(s) recorded.
//   4. beschikbaar_irrelevant — true, confirmed, authorised, but with NO demonstrable link to this
//      task. Withheld. A fact is never included just because it is true, confirmed or recent.

// Compact Dutch stopword set (only tokens of length >= 4 matter; shorter ones are filtered anyway).
const NL_STOP = new Set([
  'deze', 'dese', 'dezelfde', 'zijn', 'wordt', 'worden', 'jullie', 'hebben', 'heeft', 'hebt', 'moet',
  'moeten', 'kunnen', 'willen', 'zou', 'zouden', 'graag', 'even', 'eens', 'over', 'naar', 'door',
  'waarop', 'wanneer', 'waarom', 'elkaar', 'iets', 'iemand', 'alles', 'allemaal', 'gaan', 'gaat',
  'komt', 'komen', 'laat', 'laten', 'weten', 'gerust', 'gewoon', 'misschien', 'mogelijk', 'niet',
  'geen', 'maar', 'ook', 'onze', 'jouw', 'hierbij', 'verder', 'dank', 'bedankt', 'groet', 'beste',
  'hallo', 'wij', 'want', 'omdat', 'zodat', 'terug', 'nogmaals', 'alvast',
]);

function contentTokens(text) {
  // Lowercase, then split on anything that is not an unaccented letter/digit. Accented characters
  // (ö, é, ...) simply act as token boundaries; that is fine here because relevance is judged on
  // plain content words, never on names/organisations.
  return new Set(String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !NL_STOP.has(w)));
}

// A preference that shapes the communication itself (channel, medium, tone, availability).
const COMM_PREF_RE = /\b(bel|bellen|telefo|mail|e-?mail|whatsapp|\bsms\b|app(en|je)?|schrijf|schrijv|spreek|sprek|mondeling|contact|bereikbaar|videobel|langskom|afspre|voicemail|nieuwsbrief)/i;

// Decide, per memory item, whether the CURRENT task needs it. Returns the kept memory, the withheld
// memory, and a per-item decision log (for transparency + tests). Deterministic, no model, no I/O.
export function selectTaskRelevance(ctx) {
  const memory = Array.isArray(ctx.memory) ? ctx.memory : [];
  const lastInbound = [...(ctx.recent || [])].reverse().find((m) => m.direction === 'INBOUND');
  const taskText = [lastInbound && lastInbound.body_text, ctx.conversation && ctx.conversation.subject].filter(Boolean).join(' ');
  const taskSet = contentTokens(taskText);
  const kept = []; const withheld = []; const decisions = [];
  for (const m of memory) {
    const kind = m.kind || 'fact';
    if (kind === 'agreement' || kind === 'reminder') {
      kept.push(m); decisions.push({ kind, category: 'relationeel_commitment', content: m.content, kept: true });
      continue;
    }
    if (kind === 'preference' && COMM_PREF_RE.test(m.content || '')) {
      kept.push(m); decisions.push({ kind, category: 'relationeel_communicatievorm', content: m.content, kept: true });
      continue;
    }
    // A plain fact (or a preference that does NOT shape communication): needs a demonstrable link.
    const shared = [...contentTokens(m.content)].filter((w) => taskSet.has(w));
    if (taskSet.size && shared.length) {
      kept.push(m); decisions.push({ kind, category: 'direct_relevant', content: m.content, kept: true, matched: shared });
    } else {
      withheld.push(m); decisions.push({ kind, category: 'beschikbaar_irrelevant', content: m.content, kept: false });
    }
  }
  return { memory: kept, withheldMemory: withheld, relevance: decisions };
}

// Assemble the system + work-context prompt for a role. Provider-agnostic. Runs BOTH gates:
// authorizeContext (privacy/role) THEN selectTaskRelevance (task need). Returns the task-selected
// context, what authorisation excluded, what relevance withheld, and provenance refs so the caller
// can keep explaining WHY. draftReply and reviseDraft both call this, so the first concept and
// Warmer/Korter share exactly the same task-selected context (no source can slip back in on a revise).
export function assembleContext({ role = 'comm_assistant', ctx }) {
  const authCtx = authorizeContext(ctx, { role });
  const rel = selectTaskRelevance(authCtx);
  const taskCtx = { ...authCtx, memory: rel.memory };
  return {
    system: systemForRole(role),
    workContext: renderContextForModel(taskCtx),
    authCtx: taskCtx,
    excluded: authCtx.excluded,          // removed by the AUTHORISATION gate (privacy/role)
    withheld: rel.withheldMemory,        // withheld by the TASK-RELEVANCE gate (available but irrelevant)
    relevance: rel.relevance,            // per-item decisions, for transparency + tests
    provenance: authCtx.refs || [],
  };
}
