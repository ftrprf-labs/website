// Digital Colleagues — registry, mandate and autonomy model.
//
// A digital colleague is a first-class ACTOR (server/comm/migrations/006). This module is the ONE
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
export const ACTIONS = {
  read_shared_truth:      { minAutonomy: 'OBSERVE', forbidToken: null },
  create_finding:         { minAutonomy: 'PROPOSE', forbidToken: null },
  write_proposed_memory:  { minAutonomy: 'PREPARE', forbidToken: null },
  prepare_work:           { minAutonomy: 'PREPARE', forbidToken: null },
  request_handoff:        { minAutonomy: 'PREPARE', forbidToken: null },
  external_discovery:     { minAutonomy: 'PREPARE', forbidToken: 'external_web' },
  read_privacy:           { minAutonomy: 'OBSERVE', forbidToken: 'read_privacy' },
  merge_identity:         { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'merge_identity' },
  promote_lead:           { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'promote' },
  set_consent:            { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'set_consent' },
  send_external:          { minAutonomy: 'ACT_WITH_APPROVAL', forbidToken: 'send' },
};

// Per-colleague mandate (by role/slug). Forbid is the hard boundary; it is checked in addition to
// autonomy, so even a highly-autonomous colleague can be organisationally barred from an action.
export const MANDATE = {
  // Growth / Lead colleague (Scout). May observe, propose and prepare on its own; may never send,
  // promote, set consent, read privacy, merge identities, or reach external web in v1.
  growth: {
    read:   ['organization', 'contact', 'channel_identity', 'activity', 'work_item', 'agent_finding'],
    write:  ['work_item', 'agent_finding', 'agent_evidence', 'proposed_memory'],
    forbid: ['send', 'promote', 'set_consent', 'read_privacy', 'merge_identity', 'external_web'],
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
