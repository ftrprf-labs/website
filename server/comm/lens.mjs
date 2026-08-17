// Communication Layer — LENS signal (Niveau-C seam to the client's First Five / Lens).
//
// The Lens is the client's own experience. This module lets the cockpit hold ONLY a relational
// hoofdlijn about it, never the private content. Three levels are DEFINED so code can reason and deny:
//   PRIVATE — reveal/non-reveal, answers, free reflections, personal interpretation. Stays in the
//             Lens. NEVER stored here (the DB CHECK constraint enforces this too).
//   SHARED  — an insight the client EXPLICITLY shared with the advisor, under a versioned sharing
//             consent. That consent purpose does NOT exist in the Lens yet, so SHARED is a seam only:
//             modelled, never written, until the sharing contract exists.
//   SUMMARY — the content-free fact that the relation went through the Lens (started/completed + date).
//
// Access is asymmetric BY ROLE: a human advisor may see SUMMARY (and later SHARED). A digital
// colleague (agent) inherits NEVER more than the human role it works for, and for the Lens it inherits
// NOTHING — Scout and any other agent get an empty view. A technical link is never, by itself, consent
// to see content (§ veiligheidsregel).

import { query } from './db.mjs';

export const LENS_PRIVACY = ['PRIVATE', 'SHARED', 'SUMMARY'];
export const LENS_MILESTONES = ['STARTED', 'COMPLETED'];

// Which privacy levels a viewer may ever see. Agents (any) see nothing from the Lens. The human
// advisor sees SUMMARY today; SHARED is added here ONLY once an explicit sharing consent exists.
export function lensVisibleTo(viewer = {}) {
  const kind = (viewer.kind || 'HUMAN').toUpperCase();
  if (kind === 'AGENT') return new Set();                 // digital colleagues: no Lens access at all
  if (kind === 'HUMAN') return new Set(['SUMMARY']);       // advisor: hoofdlijn only (SHARED later)
  return new Set();                                        // unknown viewer: fail-closed
}

// Record a content-free SUMMARY milestone for a relation. Idempotent per (contact, milestone). This is
// the ONLY write path, and it refuses anything that is not SUMMARY, so private content can never enter
// through here (the DB constraint is the second line of defence).
export async function recordLensSummary(tenantId, { contactId, milestone = 'COMPLETED', occurredAt = null, sourceRef = {}, now = null } = {}) {
  if (!contactId) return { ok: false, reason: 'no_contact' };
  if (!LENS_MILESTONES.includes(milestone)) return { ok: false, reason: 'bad_milestone' };
  const derivedAt = now || null;
  // Guardrail: this function only ever writes SUMMARY. There is deliberately no parameter to write
  // PRIVATE or SHARED content from the cockpit side.
  const provenance = { source: 'LENS', rule: 'content-free milestone from First Five session', derived_at: derivedAt };
  const existing = (await query(
    "select id from lens_signal where tenant_id=$1 and contact_id=$2 and milestone=$3 limit 1",
    [tenantId, contactId, milestone])).rows[0];
  if (existing) {
    await query('update lens_signal set occurred_at=coalesce($2, occurred_at), source_ref=$3::jsonb where id=$1',
      [existing.id, occurredAt, JSON.stringify(sourceRef || {})]);
    return { ok: true, id: existing.id, deduped: true };
  }
  const ins = await query(
    `insert into lens_signal(tenant_id, contact_id, source, privacy_status, milestone, occurred_at, source_ref, provenance)
     values ($1,$2,'LENS','SUMMARY',$3,$4,$5::jsonb,$6::jsonb) returning id`,
    [tenantId, contactId, milestone, occurredAt, JSON.stringify(sourceRef || {}), JSON.stringify(provenance)]);
  return { ok: true, id: ins.rows[0].id };
}

// The raw signals a viewer is allowed to see for one relation. Agents get []. Never returns content —
// there is no content column; only milestone + date + provenance.
export async function listLensSignals(tenantId, contactId, { viewer = { kind: 'HUMAN' } } = {}) {
  const allowed = lensVisibleTo(viewer);
  if (!allowed.size || !contactId) return [];
  const rows = (await query(
    `select id, privacy_status, milestone, occurred_at, consent_version, provenance
       from lens_signal where tenant_id=$1 and contact_id=$2 order by occurred_at asc nulls last`,
    [tenantId, contactId])).rows;
  return rows.filter((r) => allowed.has(r.privacy_status));
}

// The dossier hoofdlijn for one relation, for a human advisor. Content-free by construction:
// { participated, completedAt, startedAt, sharedCount }. sharedCount is 0 until a real sharing
// contract lands SHARED insights (seam). Returns null when there is nothing to show.
export async function lensSummaryForContact(tenantId, contactId, { viewer = { kind: 'HUMAN' } } = {}) {
  const signals = await listLensSignals(tenantId, contactId, { viewer });
  if (!signals.length) return null;
  const summaries = signals.filter((s) => s.privacy_status === 'SUMMARY');
  const shared = signals.filter((s) => s.privacy_status === 'SHARED');
  const completed = summaries.find((s) => s.milestone === 'COMPLETED');
  const started = summaries.find((s) => s.milestone === 'STARTED');
  if (!completed && !started && !shared.length) return null;
  return {
    source: 'LENS',
    participated: Boolean(completed || started),
    completedAt: completed ? completed.occurred_at : null,
    startedAt: started ? started.occurred_at : null,
    sharedCount: shared.length,     // 0 today; the presentation is ready for when this grows
  };
}
