// Central decision ledger + supersession semantics (control-plane correction §5, §16–§18).
//
// Maculis has multiple long-running workstreams, so an old conclusion can be
// technically stored yet substantively out of date. This module is the ONE
// canonical place where product/engineering decisions live, with explicit
// supersession — a newer decision wins over an older conflicting one in the same
// scope, but ONLY when it explicitly supersedes it. A PAUSE can never be lifted
// implicitly by a stray "resume" record (§17): only an explicit supersede does.
//
// A DECISION is a canonical structured object (extends the existing store, not a
// parallel datamodel). Fields (§16): decision_id, scope, decision, timestamp,
// origin, rationale, status, supersedes, superseded_by (+ type/effect/guard for
// the PAUSED guard and provenance).

import { tx, ready } from './store.mjs';
import { audit } from './audit.mjs';
import { makeOrigin } from './origin.mjs';

export const DECISION_EFFECTS = ['pause', 'resume', 'policy', 'note'];
export const DECISION_STATES = ['active', 'superseded', 'revoked'];

// Hyphen/space-insensitive, lowercase — same spirit as the router's normaliser.
function flat(s) { return String(s || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }

function str(v, max = 4000) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

// Build a canonical DECISION record. submittedBy is server-authenticated (never
// from a request body); origin captures where the decision came from.
function makeDecisionRecord({ id, scope, decision, rationale, effect, guard, origin, submittedBy, supersedes, seedKey }) {
  const originEnvelope = makeOrigin(origin || { type: 'system' }, { submittedBy: submittedBy || 'system' });
  return {
    decision_id: id,
    type: 'DECISION',
    scope: str(scope, 120) || 'general',
    decision: str(decision) || '',
    rationale: str(rationale) || null,
    effect: DECISION_EFFECTS.includes(effect) ? effect : 'note',
    guard: guard && Array.isArray(guard.match) ? { match: guard.match.map((m) => flat(m)).filter(Boolean) } : null,
    status: 'active',
    supersedes: Array.isArray(supersedes) ? supersedes.filter(Boolean) : [],
    superseded_by: null,
    origin: originEnvelope,
    submitted_by: originEnvelope.submitted_by,
    correlation_id: originEnvelope.correlation_id,
    workstream_id: str(origin?.workstream_id, 120) || null,
    timestamp: originEnvelope.submitted_at,
    seed_key: seedKey || null,
  };
}

// Record a decision. Any ids listed in `supersedes` are marked superseded and
// point forward to the new decision (newer wins, explicitly). Returns the record.
export function recordDecision(input) {
  return tx((db) => {
    db.decisionCounter += 1;
    const id = `DEC-${db.decisionCounter}`;
    const rec = makeDecisionRecord({ ...input, id });
    // Explicit supersession only (§17: no implicit lifting of a pause).
    for (const oldId of rec.supersedes) {
      const old = db.decisions[oldId];
      if (old && old.status === 'active') {
        old.status = 'superseded';
        old.superseded_by = id;
      }
    }
    db.decisions[id] = rec;
    audit('decision_recorded', { decision_id: id, scope: rec.scope, effect: rec.effect, status: rec.status,
      supersedes: rec.supersedes, submitted_by: rec.submitted_by, correlation_id: rec.correlation_id });
    return rec;
  });
}

// Record a decision that explicitly supersedes an existing one (newer wins).
export function supersedeDecision(oldId, input) {
  const old = ready().decisions[oldId];
  if (!old) return { ok: false, reason: 'not_found' };
  const rec = recordDecision({ ...input, scope: input.scope || old.scope, supersedes: [oldId, ...(input.supersedes || [])] });
  return { ok: true, decision: rec, superseded: oldId };
}

export function getDecision(id) { const d = ready().decisions[id]; return d ? { ...d } : null; }

export function listDecisions({ scope = null, status = null, effect = null } = {}) {
  return Object.values(ready().decisions)
    .filter((d) => (!scope || d.scope === scope) && (!status || d.status === status) && (!effect || d.effect === effect))
    .sort((a, b) => (a.decision_id < b.decision_id ? -1 : 1))
    .map((d) => ({ ...d }));
}

// Active pause decisions whose guard keywords appear in the text. Returns the
// matching decision or null. This is the authoritative PAUSED guard used to stop
// a derived task/assignment from IMPLICITLY resuming a paused scope (§17, §18).
export function pausedDecisionFor(text) {
  const t = flat(text);
  if (!t) return null;
  for (const d of Object.values(ready().decisions)) {
    if (d.status !== 'active' || d.effect !== 'pause' || !d.guard) continue;
    const hit = d.guard.match.find((m) => m && t.includes(m));
    if (hit) return { decision: { ...d }, matched: hit };
  }
  return null;
}

// Decisions relevant to a piece of text (for evidence classification / context
// envelopes): active decisions whose scope keywords or guard terms appear.
export function relevantDecisions(text) {
  const t = flat(text);
  return Object.values(ready().decisions)
    .filter((d) => d.status === 'active')
    .filter((d) => t.includes(flat(d.scope)) || (d.guard && d.guard.match.some((m) => t.includes(m))))
    .map((d) => ({ decision_id: d.decision_id, scope: d.scope, effect: d.effect, decision: d.decision }));
}

// Idempotently seed the canonical, durable decisions. Safe to call on every boot
// (survives an ephemeral store on the free plan). Keyed by seed_key so it never
// duplicates. These encode the HARD current product decisions (§15, §17).
const SEED = [
  {
    seedKey: 'epic-3-paused',
    scope: 'epic-3',
    effect: 'pause',
    decision: 'EPIC-3 / next Lens (Lens 2) = PAUSED. No next-Lens implementation until (1) Lens 1 has produced real pilot evidence, (2) that evidence is reviewed, and (3) Ludwig explicitly gives GO to resume.',
    rationale: 'A derived task, old roadmap, old recommendation or specialist workstream must not implicitly resume EPIC-3. Newer explicit decision wins over older "start Lens 2" style instructions.',
    // Guard terms: only NEXT-lens / resume-implementation phrasing — NOT "lens 1",
    // NOT "technical signals", NOT recording pilot evidence (evidence intake is allowed).
    guard: { match: [
      'lens 2', 'lens2', 'next lens', 'volgende lens', 'reputation lens', 'nieuwe lens', 'new lens',
      'start lens', 'implement lens', 'build lens', 'bouw lens', 'resume epic 3', 'hervat epic 3',
      'epic 3', 'epic3', 'resume lens', 'hervat lens', 'lens 3', 'finance lens', 'marketing lens',
    ] },
  },
  {
    seedKey: 'never-weaken-gate',
    scope: 'reveal-gate',
    effect: 'policy',
    decision: 'Never weaken a gate to avoid SILENCE. Expand evidence before lowering truth standards.',
    rationale: 'The Reveal Gate must stay grounded/evidence-bound. Fixing a SILENCE by lowering the gate is forbidden.',
  },
  {
    seedKey: 'silence-not-whole-journey',
    scope: 'first-five-journey',
    effect: 'policy',
    decision: 'SILENCE at Reveal ≠ SILENCE of the whole journey. The three layers — (1) business thermometer / business duiding, (2) Reveal-or-SILENCE, (3) technical thermometer — function independently. SILENCE in layer 2 must not remove layers 1 and 3.',
    rationale: 'Lens 1 pilot finding: a correct SILENCE in the Reveal layer currently appears to also suppress the business duiding and technical thermometer, which should remain.',
  },
];

export function seedCanonicalDecisions() {
  const existing = new Set(Object.values(ready().decisions).map((d) => d.seed_key).filter(Boolean));
  const created = [];
  for (const s of SEED) {
    if (existing.has(s.seedKey)) continue;
    const rec = recordDecision({ ...s, origin: { type: 'system', project: 'orchestrator' }, submittedBy: 'system' });
    created.push(rec.decision_id);
  }
  if (created.length) audit('decisions_seeded', { created });
  return created;
}
