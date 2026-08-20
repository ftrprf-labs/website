// Read-only bridge to Maculis evaluation results (Option B).
//
// Maculis is the source of truth for the experience + evaluation. The tester
// answers the in-journey questions inside Maculis; the answers are stored as
// session events. This module PULLS those sessions (GET /api/session/export)
// and joins them to Testerbeheer testers by the opaque participant TOKEN — the
// only stable identity used (never name/e-mail). Testerbeheer keeps no copy of
// the raw events; it derives a compact per-tester view live.
//
// Privacy: never logs tokens, answers, contexts or the export key.

import { config } from './config.mjs';

// The EXACT existing Maculis in-journey evaluation set (do not edit wording).
// `event` is the Maculis session-event name that carries the answer.
export const EVAL_QUESTIONS = [
  {
    id: 'recognition', event: 'recognition_answered',
    text: 'Herken je dit?', type: 'choice',
    options: { ja: 'Ja', deels: 'Deels', nee: 'Nee' },
    context: { id: 'recognition_context', event: 'recognition_context', text: 'Waar merk je dat aan?', when: ['deels'] },
  },
  {
    id: 'accuracy', event: 'accuracy_answered',
    text: 'Klopt dit volgens jou?', type: 'choice',
    options: { ja: 'Ja', deels: 'Deels', nee: 'Nee' },
    context: { id: 'accuracy_context', event: 'accuracy_context', text: 'Wat klopt er niet helemaal?', when: ['deels', 'nee'] },
  },
  {
    id: 'novelty', event: 'novelty_answered',
    text: 'Had je dit zelf al zo gezien?', type: 'choice',
    options: { nieuw: 'Nee, dit is nieuw', bekend: 'Ja, dit wist ik al' },
  },
];

const CORE = ['recognition', 'accuracy', 'novelty'];

// Pull the raw sessions from Maculis. Returns { ok, sessions } or { ok:false, reason }.
export async function pullSessions() {
  if (!config.maculisExportKey) return { ok: false, reason: 'not_configured' };
  const url = `${config.maculisHost}/api/session/export?key=${encodeURIComponent(config.maculisExportKey)}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, reason: 'network' }; // no host in message → no PII/secret
  }
  if (res.status === 403) return { ok: false, reason: 'forbidden' };
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  return { ok: true, sessions: Array.isArray(body && body.lines) ? body.lines : [] };
}

// De bewijsregels uit de Lens, opgeschoond en begrensd. Alleen wat de deelnemer werkelijk op zijn
// scherm zag: het citaat, het bronlabel en de vindplaats. Er wordt hier niets afgeleid, niets
// samengevat en niets bij verzonnen; een regel zonder citaat bestaat niet.
function bewijsregels(lijst) {
  if (!Array.isArray(lijst)) return [];
  return lijst
    .map((e) => ({
      quote: typeof e?.quote === 'string' ? e.quote.trim().slice(0, 400) : '',
      label: typeof e?.label === 'string' ? e.label.trim().slice(0, 120) : '',
      url: typeof e?.url === 'string' ? e.url.trim().slice(0, 500) : '',
    }))
    .filter((e) => e.quote)
    .slice(0, 12);
}

// Group sessions by participant token and derive a compact per-token result.
// A tester may have several sessions (reopened) — we merge: latest answer wins,
// started = any session exists, completed = any session_completed event.
export function deriveByToken(sessions) {
  const byToken = new Map();
  for (const s of sessions || []) {
    const token = s && s.participant;
    if (!token || typeof token !== 'string') continue;
    let d = byToken.get(token);
    if (!d) {
      d = { started: true, completed: false, answers: {}, contexts: {}, started_at: null, completed_at: null, consent: null, consent_at: null, consent_version: null,
        // ADR-0003 D1/D2: "bewaren" is a SEPARATE permission from "benaderen". It is the only
        // trigger for preparing a Mijn Maculis environment, and it never implies contact.
        keep: false, keep_at: null,
        // The reveal EXACTLY as the participant saw it. Carried across verbatim, never rewritten
        // (amplify, do not author). `evidence_count` is what the Lens counted under it; the
        // individual quotes are not exported today, see BUILD_LOG.
        reveal: null };
      byToken.set(token, d);
    }
    // The journey also mirrors the presented outcome on the session itself (§J). Prefer the event,
    // fall back to this, so a session that lost its event trail still yields the right line.
    if (s.shown && typeof s.shown.reveal_line === 'string' && s.shown.reveal_line.trim() && !d.reveal) {
      const regels = bewijsregels(s.shown.evidence);
      d.reveal = { line: s.shown.reveal_line.trim(), family: s.shown.family || null,
        outcome: s.shown.outcome || null, evidence_count: regels.length,
        evidence: regels, at: s.received_at || s.updated_at || null };
    }
    if (s.started_at && (!d.started_at || s.started_at < d.started_at)) d.started_at = s.started_at;
    // The journey stamps the consent version it actually showed (maculis-contact-v1).
    if (typeof s.contact_consent_version === 'string' && s.contact_consent_version) d.consent_version = s.contact_consent_version;
    // Explicit consent from the Maculis journey (the "inner circle" opt-in step).
    // ONLY an affirmative opt-in is an explicit choice → OPTED_IN. "Nog niet"
    // (inner_circle_declined) is a deferral, NOT a refusal: it records no consent
    // and leaves the tester UNKNOWN (fail-closed, brief §1/§6). Journey completion
    // is never an implicit opt-in. OPTED_OUT only comes from an explicit
    // withdrawal/refusal, handled admin-side for First Five (not derived here).
    if (s.inner_circle_opt_in === true) { d.consent = 'OPTED_IN'; d.consent_at = d.consent_at || s.updated_at || s.received_at || null; }
    for (const e of Array.isArray(s.events) ? s.events : []) {
      if (!e || !e.name) continue;
      if (e.name === 'recognition_answered' && e.value != null) d.answers.recognition = String(e.value);
      else if (e.name === 'accuracy_answered' && e.value != null) d.answers.accuracy = String(e.value);
      else if (e.name === 'novelty_answered' && e.value != null) d.answers.novelty = String(e.value);
      else if (e.name === 'recognition_context' && e.text) d.contexts.recognition_context = String(e.text);
      else if (e.name === 'accuracy_context' && e.text) d.contexts.accuracy_context = String(e.text);
      else if (e.name === 'session_completed') { d.completed = true; d.completed_at = s.received_at || s.updated_at || d.completed_at; }
      // "Ja, bewaar dit". The permission to prepare an environment, and nothing else. Declining
      // (`account_handoff_declined`) records nothing: absence of permission is not a permission.
      else if (e.name === 'account_handoff_accepted') { d.keep = true; d.keep_at = d.keep_at || e.at || s.updated_at || s.received_at || null; }
      // The reveal line the participant actually read, with the number of evidence items the Lens
      // showed under it. An event wins over the mirrored `shown` block.
      else if (e.name === 'reveal_presented' && typeof e.line === 'string' && e.line.trim()) {
        d.reveal = { line: e.line.trim(), family: e.family || null, outcome: 'REVEAL',
          evidence_count: Number(e.evidence_count || 0) || 0,
          // De grond die de deelnemer zelf achter "Waar zie je dat?" heeft gezien. Woordelijk, want
          // dit is overdracht en geen nieuwe waarneming. Oudere sessies dragen dit niet; dan blijft
          // de lijst leeg en valt de keten terug op het aantal.
          evidence: bewijsregels(e.evidence),
          at: s.received_at || s.updated_at || null };
      }
      // Consent events carried in the session event trail. Only an affirmative
      // opt-in maps to consent; `inner_circle_declined` ("Nog niet") is a
      // deferral and is intentionally NOT mapped (stays UNKNOWN). We still read
      // the event name for backward compatibility, but it drives no transition.
      else if (e.name === 'inner_circle_opt_in') { d.consent = 'OPTED_IN'; d.consent_at = d.consent_at || e.at || s.updated_at || null; if (typeof e.version === 'string' && e.version) d.consent_version = e.version; }
    }
  }
  for (const d of byToken.values()) d.eval_status = evalStatus(d);
  return byToken;
}

// Evaluation status is system-derived from the Maculis answers.
export function evalStatus(d) {
  if (!d) return 'NOT_STARTED';
  const answered = CORE.filter((k) => d.answers && d.answers[k]).length;
  if (answered === 0) return 'NOT_STARTED';
  if (answered === CORE.length || d.completed) return 'COMPLETED';
  return 'IN_PROGRESS';
}
