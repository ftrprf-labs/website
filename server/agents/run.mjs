// Digital Colleagues — agent runs (one execution, for audit / cost / idempotency).
//
// Every time a colleague works, we open an agent_run: which actor, why (trigger), at which autonomy
// level, what it called, what it produced, and any error. dedupeKey gives double-submit / retry
// protection: at most one non-failed run per key (partial unique index in migration 006). A failed
// run may be retried; a running/succeeded one is returned as-is.

import { query } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

// Open a run. Returns { ok, run, reused } — reused=true means an equivalent run already exists and
// this call is a safe no-op (idempotent).
export async function startRun(tenantId, { workItemId, actor, trigger, autonomyUsed = null, inputRef = {}, dedupeKey = null }) {
  if (dedupeKey) {
    const existing = await query(
      `select id, status from agent_run where tenant_id=$1 and dedupe_key=$2 and status in ('running','succeeded') order by started_at desc limit 1`,
      [tenantId, dedupeKey]);
    if (existing.rows[0]) return { ok: true, reused: true, run: existing.rows[0] };
  }
  try {
    const ins = await query(
      `insert into agent_run(tenant_id, work_item_id, actor_id, trigger, status, autonomy_used, input_ref, dedupe_key)
       values ($1,$2,$3,$4,'running',$5,$6::jsonb,$7) returning id, status`,
      [tenantId, workItemId || null, actor.id, trigger, autonomyUsed || actor.autonomy, JSON.stringify(inputRef || {}), dedupeKey]);
    const run = ins.rows[0];
    await recordAudit({ tenantId, action: 'agent_run_started', entityType: 'agent_run', entityId: run.id, meta: { agent: true, actor_slug: actor.slug, trigger, work_item_id: workItemId } });
    return { ok: true, reused: false, run };
  } catch (err) {
    // Lost a race on the partial unique index: another run for this key won. Return it.
    if (dedupeKey && String(err.message || '').includes('agent_run_dedupe_idx')) {
      const existing = await query(
        `select id, status from agent_run where tenant_id=$1 and dedupe_key=$2 and status in ('running','succeeded') order by started_at desc limit 1`,
        [tenantId, dedupeKey]);
      if (existing.rows[0]) return { ok: true, reused: true, run: existing.rows[0] };
    }
    throw err;
  }
}

// Append a capability call to the run's trail (transparency: what the colleague actually did).
export async function recordCapabilityCall(tenantId, runId, { capability, note = null }) {
  await query(
    `update agent_run set capability_calls = capability_calls || $3::jsonb where tenant_id=$1 and id=$2`,
    [tenantId, runId, JSON.stringify([{ capability, note, at: new Date().toISOString() }])]);
}

export async function finishRun(tenantId, runId, { actor = null, outputRef = {}, tokens = null, cost = null } = {}) {
  const r = await query(
    `update agent_run set status='succeeded', output_ref=$3::jsonb, tokens=$4, cost=$5, ended_at=now()
      where tenant_id=$1 and id=$2 and status='running' returning id`,
    [tenantId, runId, JSON.stringify(outputRef || {}), tokens, cost]);
  await recordAudit({ tenantId, action: 'agent_run_finished', entityType: 'agent_run', entityId: runId, meta: { agent: true, actor_slug: actor && actor.slug, ...outputRef } });
  return { ok: Boolean(r.rows[0]) };
}

export async function failRun(tenantId, runId, error, { actor = null } = {}) {
  await query(
    `update agent_run set status='failed', error=$3, ended_at=now() where tenant_id=$1 and id=$2 and status='running'`,
    [tenantId, runId, String(error || 'error').slice(0, 500)]);
  await recordAudit({ tenantId, action: 'agent_run_failed', entityType: 'agent_run', entityId: runId, meta: { agent: true, actor_slug: actor && actor.slug, error: String(error || '').slice(0, 200) } });
  return { ok: true };
}

export async function listRuns(tenantId, { workItemId = null, actorId = null, limit = 50 } = {}) {
  const r = await query(
    `select id, work_item_id, actor_id, trigger, status, autonomy_used, capability_calls, tokens, cost, error, started_at, ended_at
       from agent_run where tenant_id=$1 and ($2::uuid is null or work_item_id=$2) and ($3::uuid is null or actor_id=$3)
      order by started_at desc limit $4`, [tenantId, workItemId, actorId, limit]);
  return r.rows;
}
