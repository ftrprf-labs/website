// Evidence intake + selective routing + context firewall (control-plane §5, §12–§15, §20–§21).
//
// ChatGPT (the control plane) submits a discovery/observation ONCE. The Orchestrator
// classifies it (EVIDENCE / PILOT_EVIDENCE), tests it against the decision ledger,
// couples it to ONE OR MORE owning workstreams WITHOUT broadcasting to all, builds a
// MINIMAL context envelope that preserves per-part provenance, and stores a durable
// structured record that ChatGPT can retrieve with the source intact.
//
// This is intake/classification/routing — NOT task execution. It never starts an
// implementation epic and never lifts a PAUSED decision. Full chat transcripts are
// never ingested here: only the submitted evidence summary + provenance.

import { tx, ready } from './store.mjs';
import { audit } from './audit.mjs';
import { getAgents } from './registry.mjs';
import { makeOrigin } from './origin.mjs';
import { relevantDecisions, pausedDecisionFor } from './decisions.mjs';

export const EVIDENCE_KINDS = ['EVIDENCE', 'PILOT_EVIDENCE'];

function flat(s) { return String(s || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function str(v, max = 6000) { if (v == null) return null; const s = String(v).trim(); return s ? s.slice(0, max) : null; }

// Explainable workstream signal table. Workstream ids are the durable registry
// domain ids (we extend the registry, we do not fork it); `area` is a sub-domain
// tag so a workstream can own more than one focus area.
const SIGNALS = [
  { workstream: 'first_five', area: 'technical-signals', terms: [
    'technical signal', 'technische signaal', 'technische signalen', 'technische thermometer',
    'technical thermometer', 'thermometer', 'reveal', 'silence', 'recognition', 'herken',
    'first impression', 'lens 1', 'lens1', 'first five', 'reveal gate', 'evidence gate' ] },
  { workstream: 'first_five', area: 'post-reveal-flow', terms: [
    'post reveal', 'post-reveal', 'na de reveal', 'journey', 'journey flow', 'vervolg', 'deepen',
    'aandacht', 'business duiding', 'zakelijke duiding', 'zakelijke thermometer' ] },
  { workstream: 'relationship', area: 'communication-layer', terms: [
    'communication layer', 'outbound', 'resend', 'email delivery', 'e-mail delivery', 'whatsapp',
    'sms', 'telephony', 'consent', 'inbox', 'tester', 'testerbeheer', 'crm', 'invitation manager' ] },
  { workstream: 'website', area: 'public-web', terms: [
    'homepage', 'website', 'seo', 'public page', 'landing', 'wow laag', 'core web vitals' ] },
];

// Named interfaces that are deliberately NOT execution targets for evidence intake
// (they are decision/strategy interfaces, not owners of pilot execution). Recorded
// as explicit exclusions so "no broadcast" is visible and auditable (§14, §15).
const NON_EXECUTION_INTERFACES = ['future-cockpit', 'next-lenses', 'lead-engineering-night-run'];

function scoreWorkstreams(text) {
  const t = flat(text);
  const byWs = new Map();
  for (const sig of SIGNALS) {
    const hits = sig.terms.filter((term) => t.includes(flat(term)));
    if (!hits.length) continue;
    const cur = byWs.get(sig.workstream) || { workstream: sig.workstream, score: 0, areas: new Set(), matched: [] };
    cur.score += hits.length;
    cur.areas.add(sig.area);
    cur.matched.push(...hits);
    byWs.set(sig.workstream, cur);
  }
  return [...byWs.values()]
    .map((w) => ({ workstream: w.workstream, score: w.score, areas: [...w.areas], matched: [...new Set(w.matched)] }))
    .sort((a, b) => b.score - a.score);
}

// Classify an evidence submission. Returns the routing decision WITHOUT side effects.
export function classifyEvidence(text, { hint = null } = {}) {
  const t = flat(text);
  const scored = scoreWorkstreams(text);
  const known = new Set(getAgents().map((a) => a.agent_id));
  const targets = scored.filter((s) => s.score > 0 && known.has(s.workstream));

  // PILOT_EVIDENCE when it reads as a real-world pilot finding on the journey/lens,
  // else generic EVIDENCE. Explainable, not magic.
  const pilotMarkers = ['pilot', 'bevinding', 'finding', 'strategie.nl', 'reveal', 'silence', 'thermometer', 'lens 1'];
  const isPilot = hint === 'PILOT_EVIDENCE' || (pilotMarkers.some((m) => t.includes(m)) && targets.some((x) => x.workstream === 'first_five'));
  const kind = isPilot ? 'PILOT_EVIDENCE' : 'EVIDENCE';

  const lens = (t.includes('lens 1') || t.includes('reveal') || t.includes('silence') || t.includes('thermometer')) ? 1 : null;

  // Excluded = every known workstream that scored zero (explicit no-broadcast) plus
  // the non-execution strategy interfaces.
  const targetIds = new Set(targets.map((x) => x.workstream));
  const excludedWorkstreams = getAgents().map((a) => a.agent_id).filter((id) => !targetIds.has(id));

  // Decision awareness: does this touch a paused scope? Evidence is ALLOWED even when
  // a scope is paused (recording a finding never resumes work), but we flag it so the
  // record explicitly states EPIC-3 stays paused.
  const paused = pausedDecisionFor(text);
  const touches = relevantDecisions(text);

  const why = [];
  for (const tg of targets) why.push(`routed to ${tg.workstream} (areas: ${tg.areas.join('+')}) on signals: ${tg.matched.slice(0, 5).join(', ')}`);
  if (!targets.length) why.push('no workstream signal matched — held for human classification (needs_routing_review)');
  if (paused) why.push(`scope touches PAUSED decision ${paused.decision.decision_id} (${paused.decision.scope}); recording evidence does NOT resume it`);

  return {
    kind, lens,
    primary_workstream: targets[0]?.workstream || null,
    target_workstreams: targets.map((x) => ({ workstream: x.workstream, areas: x.areas, matched: x.matched })),
    secondary_workstreams: targets.slice(1).map((x) => x.workstream),
    excluded_workstreams: excludedWorkstreams,
    excluded_interfaces: NON_EXECUTION_INTERFACES,
    needs_routing_review: targets.length === 0,
    touches_decisions: touches,
    keeps_paused: Boolean(paused),
    paused_decision: paused ? paused.decision.decision_id : null,
    reveal_gate_lowered: false,             // intake never lowers a gate (§15)
    why,
  };
}

// Build a MINIMAL context envelope: only the evidence itself + refs to relevant
// decisions, with provenance preserved per part. Never merges in other workstreams'
// unrelated observations (§12: three separate observations stay three records).
function contextEnvelope(record) {
  return {
    scope: record.classification.primary_workstream,
    parts: [{
      workstream: record.classification.primary_workstream,
      type: record.kind,
      summary: record.summary,
      provenance: { origin: record.origin, correlation_id: record.correlation_id, submitted_by: record.submitted_by, evidence_id: record.evidence_id },
    }],
    decisions: record.classification.touches_decisions,      // refs only, not full text merge
    constraints: {
      keep_paused: record.classification.keeps_paused,
      paused_decision: record.classification.paused_decision,
      reveal_gate_lowered: false,
    },
  };
}

// Record an evidence submission (durable, structured, provenance-preserving).
// Does NOT execute anything and never lifts a PAUSED decision.
export function recordEvidence(text, { origin = null, submittedBy = 'unknown', hint = null, summary = null } = {}) {
  const body = str(text);
  if (!body) return { ok: false, reason: 'empty' };
  const classification = classifyEvidence(body, { hint });
  const originEnvelope = makeOrigin(origin || {}, { submittedBy });
  const rec = tx((db) => {
    db.evidenceCounter += 1;
    const id = `EV-${db.evidenceCounter}`;
    const record = {
      evidence_id: id,
      type: classification.kind,
      kind: classification.kind,
      lens: classification.lens,
      summary: str(summary) || body.slice(0, 400),
      body,
      origin: originEnvelope,
      submitted_by: originEnvelope.submitted_by,
      correlation_id: originEnvelope.correlation_id,
      workstream_id: classification.primary_workstream,
      classification,
      status: classification.needs_routing_review ? 'NEEDS_ROUTING_REVIEW' : 'ROUTED',
      created_at: originEnvelope.submitted_at,
    };
    record.context_envelope = contextEnvelope(record);
    db.evidence[id] = record;
    return record;
  });
  audit('evidence_recorded', { evidence_id: rec.evidence_id, kind: rec.kind, primary_workstream: rec.workstream_id,
    submitted_by: rec.submitted_by, correlation_id: rec.correlation_id });
  audit('evidence_routed', { evidence_id: rec.evidence_id, targets: classification.target_workstreams.map((x) => x.workstream),
    excluded: classification.excluded_workstreams, keeps_paused: classification.keeps_paused });
  return { ok: true, evidence: rec };
}

export function getEvidence(id) { const e = ready().evidence[id]; return e ? { ...e } : null; }
export function listEvidence({ workstream = null, kind = null } = {}) {
  return Object.values(ready().evidence)
    .filter((e) => (!workstream || e.workstream_id === workstream) && (!kind || e.kind === kind))
    .sort((a, b) => (a.evidence_id < b.evidence_id ? -1 : 1))
    .map((e) => ({ ...e }));
}
