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
      d = { started: true, completed: false, answers: {}, contexts: {}, started_at: null, completed_at: null, consent: null, consent_at: null };
      byToken.set(token, d);
    }
    if (s.started_at && (!d.started_at || s.started_at < d.started_at)) d.started_at = s.started_at;
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
      // Consent events carried in the session event trail. Only an affirmative
      // opt-in maps to consent; `inner_circle_declined` ("Nog niet") is a
      // deferral and is intentionally NOT mapped (stays UNKNOWN). We still read
      // the event name for backward compatibility, but it drives no transition.
      else if (e.name === 'inner_circle_opt_in') { d.consent = 'OPTED_IN'; d.consent_at = d.consent_at || e.at || s.updated_at || null; }
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
