// Shared builders for bake-off lenses. Keep observations grounded (every one carries
// a verbatim quote or an exact figure and a source) and confidence explicit.

let _seq = 0;
export function oid(prefix = 'obs') { _seq += 1; return `${prefix}_${_seq}`; }

// Evidence reference: what was seen, where, exact quote or figure, when, how obtained.
export function ref(surface, value, method = 'deterministic') {
  return { surface, value: String(value), method };
}

// Grounded observation.
export function obs({ lens, kind, subject, statement, confidence, basis, notes }) {
  return {
    observation_id: oid(),
    lens,
    kind,
    subject,
    statement,
    confidence,
    raw_evidence: basis || [],
    notes: notes || '',
  };
}

// Relation between observations. family is one of the frozen four or an extended family.
export function rel({ family, obsList, crossLens, tension, why, confidence, acknowledged }) {
  return {
    relation_id: `rel_${obsList.map((o) => o.observation_id).join('_')}_${family}`,
    family,
    observation_ids: obsList.map((o) => o.observation_id),
    cross_lens: !!crossLens,
    tension,
    why_might_matter: why,
    confidence,
    acknowledged: !!acknowledged,
    basis: obsList.flatMap((o) => o.raw_evidence),
  };
}

// Percentage-point delta helper.
export const pp = (a, b) => Math.round((a - b) * 10) / 10;
export const pct = (n) => `${Math.round(n)}%`;
