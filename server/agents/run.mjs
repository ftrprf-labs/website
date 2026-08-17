// Digital Colleagues — agent runs (one execution, for observability / cost / idempotency).
//
// A run is NOT a work object (work lands in attention_item via recordWorkItem). It is the trace of a
// colleague working: which actor, why (trigger), at which autonomy, what it called, which items it
// landed (output_ref.landed), and any error. dedupeKey gives double-submit / retry protection: at
// most one non-failed run per key (partial unique index in migration 007). A failed run may be
// retried; a running/succeeded one is returned as-is.

import { query } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

// Open a run. Returns { ok, run, reused } — reused=true means an equivalent run already exists and
// this call is a safe no-op (idempotent).
export async function startRun(tenantId, { actor, trigger, autonomyUsed = null, inputRef = {}, dedupeKey = null }) {
  if (dedupeKey) {
    const existing = (await query(
      `select id, status from agent_run where tenant_id=$1 and dedupe_key=$2 and status in ('running','succeeded') order by started_at desc limit 1`,
      [tenantId, dedupeKey])).rows[0];
    if (existing) return { ok: true, reused: true, run: existing };
  }
  try {
    const ins = await query(
      `insert into agent_run(tenant_id, actor_id, trigger, status, autonomy_used, input_ref, dedupe_key)
       values ($1,$2,$3,'running',$4,$5::jsonb,$6) returning id, status`,
      [tenantId, actor.id, trigger, autonomyUsed || actor.autonomy, JSON.stringify(inputRef || {}), dedupeKey]);
    const run = ins.rows[0];
    await recordAudit({ tenantId, action: 'agent_run_started', entityType: 'agent_run', entityId: run.id, meta: { agent: true, actor_slug: actor.slug, trigger } });
    return { ok: true, reused: false, run };
  } catch (err) {
    // Lost a race on the partial unique index: another run for this key won. Return it.
    if (dedupeKey && String(err.message || '').includes('agent_run_dedupe_idx')) {
      const existing = (await query(
        `select id, status from agent_run where tenant_id=$1 and dedupe_key=$2 and status in ('running','succeeded') order by started_at desc limit 1`,
        [tenantId, dedupeKey])).rows[0];
      if (existing) return { ok: true, reused: true, run: existing };
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

export async function listRuns(tenantId, { actorId = null, limit = 50 } = {}) {
  const r = await query(
    `select id, actor_id, trigger, status, autonomy_used, capability_calls, output_ref, tokens, cost, error, started_at, ended_at
       from agent_run where tenant_id=$1 and ($2::uuid is null or actor_id=$2)
      order by started_at desc limit $3`, [tenantId, actorId, limit]);
  return r.rows;
}
