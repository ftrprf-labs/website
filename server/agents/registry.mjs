// Digital Colleagues — registry, mandate and autonomy model.
//
// A digital colleague is a first-class ACTOR (server/comm/migrations/007). This module is the ONE
// place that decides "may this colleague do this, right now?". Two independent gates:
//
//   AUTONOMY  — HOW FAR may it go on its own? An ordered ladder, safe by default. External or
//               shared-truth-mutating actions sit above what an agent is granted, so they always
//               need a human. (§FASE 3)
//   MANDATE   — WHICH resources/actions is it organisationally allowed to touch? A forbid list per
//               colleague. "Can it technically" is never "may it organisationally". (§21)
//
// Both are config here, enforced by guards, and every denial is audited. Agents never get more
// rights because they are intelligent.

import { query } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

// The autonomy ladder, ascending. Index is the rank.
export const AUTONOMY_LEVELS = ['OBSERVE', 'PROPOSE', 'PREPARE', 'ACT_WITH_APPROVAL', 'AUTONOMOUS'];
export function autonomyRank(level) {
  const i = AUTONOMY_LEVELS.indexOf(level);
  return i < 0 ? AUTONOMY_LEVELS.length : i; // unknown level => most-restrictive
}

// Actions a colleague can attempt, each mapped to the minimum autonomy it needs and, when relevant,
// the mandate token it touches. Unknown actions default to the highest requirement (deny).
//
// The work model is the cockpit's attention_item (§ AGENT_COCKPIT_CONTRACT). A colleague may OBSERVE
// the shared truth and RECORD work (land an attention_item / propose a relation). It may NEVER resolve
// its own work, materialise a relation, send anything external, set consent, read privacy, merge
// identities, or reach external web: those are the human's decision (cockpit approve) or out of scope.
export const ACTIONS = {
  read_shared_truth:    { minAutonomy: 'OBSERVE', forbidToken: null },
  record_work:          { minAutonomy: 'PREPARE', forbidToken: null },   // land an attention_item
  propose_relation:     { minAutonomy: 'PREPARE', forbidToken: null },   // carry a proposedRelation payload
  request_handoff:      { minAutonomy: 'PREPARE', forbidToken: null },
  external_discovery:   { minAutonomy: 'PREPARE', forbidToken: 'external_web' },
  read_privacy:         { minAutonomy: 'OBSERVE', forbidToken: 'read_privacy' },
  resolve_work:         { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'resolve' },       // human-only
  materialize_relation: { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'materialize' },   // human approve only
  merge_identity:       { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'merge_identity' },
  set_consent:          { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'set_consent' },
  send_external:        { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'send' },
};

// Per-colleague mandate (by role/slug). Forbid is the hard boundary; it is checked in addition to
// autonomy, so even a highly-autonomous colleague can be organisationally barred from an action.
export const MANDATE = {
  // Growth / Lead colleague (Scout). May observe and record work (findings, proposals, proposed
  // relations) on its own; may never resolve its own work, materialise a relation, send, set consent,
  // read privacy, merge identities, or reach external web in this build.
  growth: {
    read:   ['organization', 'contact', 'channel_identity', 'activity', 'attention_item'],
    write:  ['attention_item', 'proposed_relation'],
    forbid: ['send', 'resolve', 'materialize', 'set_consent', 'read_privacy', 'merge_identity', 'external_web'],
  },
};

function mandateFor(actor) {
  return MANDATE[actor && actor.role] || { read: [], write: [], forbid: ['*'] }; // unknown role => deny all
}

// Pure decision: may this actor perform this action? No DB, no audit — safe for UI and logic.
export function can(actor, action) {
  const spec = ACTIONS[action];
  if (!spec) return { ok: false, reason: 'unknown_action' };
  if (!actor || actor.status !== 'active') return { ok: false, reason: 'actor_inactive' };
  if (autonomyRank(actor.autonomy) < autonomyRank(spec.minAutonomy)) {
    return { ok: false, reason: 'needs_higher_autonomy', requires: spec.minAutonomy, granted: actor.autonomy };
  }
  const mandate = mandateFor(actor);
  if (mandate.forbid.includes('*')) return { ok: false, reason: 'no_mandate' };
  if (spec.forbidToken && mandate.forbid.includes(spec.forbidToken)) {
    return { ok: false, reason: 'mandate_forbids', token: spec.forbidToken };
  }
  return { ok: true };
}

// Does this action require a human because it is above the actor's granted autonomy or is
// explicitly forbidden? Used to route work to a person instead of failing silently.
export function requiresApproval(actor, action) {
  const d = can(actor, action);
  return !d.ok;
}

export class MandateError extends Error {
  constructor(action, decision) { super(`mandate_denied:${action}:${decision.reason}`); this.action = action; this.decision = decision; }
}

// Enforcing guard: throws + audits on denial. `resource` is the entity being acted on (for audit).
export async function assertCan(actor, action, { tenantId, resource = null, meta = {} } = {}) {
  const decision = can(actor, action);
  if (!decision.ok) {
    const auditAction = decision.reason === 'needs_higher_autonomy' ? 'autonomy_denied' : 'mandate_denied';
    await recordAudit({
      tenantId, actorUserId: null, action: auditAction,
      entityType: resource ? resource.type : 'agent_action', entityId: resource ? resource.id : action,
      meta: { agent: true, actor_slug: actor && actor.slug, actor_id: actor && actor.id, attempted: action, ...decision, ...meta },
    });
    throw new MandateError(action, decision);
  }
  return true;
}

// Load a colleague (actor) by slug for a tenant.
export async function getActor(tenantId, slug) {
  const r = await query(
    `select id, tenant_id, kind, slug, display_name, role, autonomy, status, human_owner_actor_id, app_user_id, meta
       from actor where tenant_id=$1 and slug=$2`, [tenantId, slug]);
  return r.rows[0] || null;
}

export async function getActorById(tenantId, id) {
  const r = await query(
    `select id, tenant_id, kind, slug, display_name, role, autonomy, status, human_owner_actor_id, app_user_id, meta
       from actor where tenant_id=$1 and id=$2`, [tenantId, id]);
  return r.rows[0] || null;
}

export async function listActors(tenantId) {
  const r = await query(
    `select id, kind, slug, display_name, role, autonomy, status from actor where tenant_id=$1 order by kind, slug`, [tenantId]);
  return r.rows;
}

// A colleague's public "card" for status/registry surfaces: who it is, what it may do.
export function colleagueCard(actor) {
  if (!actor) return null;
  const mandate = mandateFor(actor);
  const allowed = Object.keys(ACTIONS).filter((a) => can(actor, a).ok);
  const humanApprovalFor = Object.keys(ACTIONS).filter((a) => !can(actor, a).ok && ACTIONS[a].forbidToken !== 'read_privacy');
  return {
    slug: actor.slug, name: actor.display_name, kind: actor.kind, role: actor.role,
    autonomy: actor.autonomy, status: actor.status,
    mayAutonomously: allowed,
    needsHumanApproval: humanApprovalFor,
    forbidden: mandate.forbid,
  };
}
