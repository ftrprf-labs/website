// Mijn Maculis Slice A1 — durable-insight write primitives (append-only observations + versions).
//
// SCOPE (A1): the minimal foundation only. No routes, no customer timeline UX, no Lens ingest, no
// automatic matching, no AI logic. These primitives keep the model consistent:
//   - createInsightWithInitialVersion: every new insight gets exactly one v1 reading + one observation.
//   - appendVersion: append a newer reading (advances the head's CURRENT pointer + cache, never the
//     SHARED pointer — consent never moves on its own).
//   - backfillInitialVersions: idempotent backfill so every existing V1 insight gets exactly one
//     initial version + observation, with its content copied verbatim (nothing lost or reinterpreted).

import { query, withTransaction } from '../comm/db.mjs';

// Create a durable insight together with its initial (v1) reading and initial observation, atomically.
// The head caches the current reading's fields; the version rows are the append-only source of truth.
export async function createInsightWithInitialVersion({
  tenantId, organizationId, title, stance = 'reveal',
  observation = null, meaning = null, basis = null, notYetKnown = null,
  sharing = 'PRIVATE', source = 'lens', provenance = {}, status = 'new',
  isPreview = false, attention = false, sharedAt = null, sharedBy = null,
  signal = {}, observedAt = null,
}) {
  return withTransaction(async (c) => {
    const head = (await c.query(
      `insert into customer_insight
         (tenant_id, organization_id, title, stance, observation, meaning, basis, not_yet_known,
          sharing, source, provenance, status, is_preview, attention, shared_at, shared_by, first_observed_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16, coalesce($17::timestamptz, now()))
       returning id, created_at`,
      [tenantId, organizationId, title, stance, observation, meaning, basis, notYetKnown,
        sharing, source, JSON.stringify(provenance || {}), status, isPreview, attention, sharedAt, sharedBy, observedAt])).rows[0];
    const insightId = head.id;

    const version = (await c.query(
      `insert into insight_version
         (tenant_id, organization_id, insight_id, version_no, title, stance, observation, meaning, basis, not_yet_known, change_summary, based_on, authored_by, created_at)
       values ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,null,'[]'::jsonb,'v1_initial', coalesce($10::timestamptz, now()))
       returning id`,
      [tenantId, organizationId, insightId, title, stance, observation, meaning, basis, notYetKnown, observedAt])).rows[0];
    const versionId = version.id;

    const obs = (await c.query(
      `insert into insight_observation
         (tenant_id, organization_id, insight_id, source, source_ref, observed_at, stance_observed, signal, provenance, link_confidence, created_at)
       values ($1,$2,$3,$4,'{}'::jsonb, coalesce($5::timestamptz, now()), $6, $7::jsonb, $8::jsonb, 'linked', coalesce($5::timestamptz, now()))
       returning id`,
      [tenantId, organizationId, insightId, source, observedAt, stance, JSON.stringify(signal || {}), JSON.stringify(provenance || {})])).rows[0];

    // Point the head at the initial version. shared_version_id is bound ONLY if this insight is
    // created already SHARED (a pre-shared fixture) — consent is version-bound from the start.
    await c.query(
      `update customer_insight
          set current_version_id=$1::uuid, shared_version_id = case when sharing='SHARED' then $1::uuid else null end
        where id=$2`,
      [versionId, insightId]);

    return { insightId, versionId, observationId: obs.id };
  });
}

// Append a newer reading. Advances the head's CURRENT pointer + cached fields (so the customer sees
// the latest), and records the observations it was based on. Deliberately does NOT touch
// shared_version_id: a prior consent never moves to a new version by itself (the version-bound rule).
export async function appendVersion({
  tenantId, organizationId, insightId, title, stance,
  observation = null, meaning = null, basis = null, notYetKnown = null,
  changeSummary = null, basedOn = [], authoredBy = 'ingest', status = null,
}) {
  return withTransaction(async (c) => {
    const next = (await c.query(
      `select coalesce(max(version_no),0)+1 as n from insight_version where insight_id=$1`, [insightId])).rows[0].n;
    const version = (await c.query(
      `insert into insight_version
         (tenant_id, organization_id, insight_id, version_no, title, stance, observation, meaning, basis, not_yet_known, change_summary, based_on, authored_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
       returning id`,
      [tenantId, organizationId, insightId, next, title, stance, observation, meaning, basis, notYetKnown, changeSummary, JSON.stringify(basedOn || []), authoredBy])).rows[0];

    // Head is mutable: advance current pointer + cache to the new reading. shared_version_id untouched.
    await c.query(
      `update customer_insight
          set current_version_id=$1, title=$2, stance=$3, observation=$4, meaning=$5, basis=$6, not_yet_known=$7,
              status=coalesce($8, status), updated_at=now()
        where id=$9 and tenant_id=$10 and organization_id=$11`,
      [version.id, title, stance, observation, meaning, basis, notYetKnown, status, insightId, tenantId, organizationId]);
    return { versionId: version.id, versionNo: next };
  });
}

// Idempotent backfill: every existing V1 insight lacking a version gets exactly one initial version
// and one initial observation, with its current content copied VERBATIM (nothing lost, nothing
// reinterpreted). Sets the head pointers, binding shared_version_id only where the insight is already
// SHARED, so existing PRIVATE/SHARED semantics stay intact. Safe to run on every boot.
export async function backfillInitialVersions() {
  await query(
    `insert into insight_version
       (tenant_id, organization_id, insight_id, version_no, title, stance, observation, meaning, basis, not_yet_known, change_summary, based_on, authored_by, created_at)
     select ci.tenant_id, ci.organization_id, ci.id, 1, ci.title, ci.stance, ci.observation, ci.meaning, ci.basis, ci.not_yet_known, null, '[]'::jsonb, 'v1_backfill', ci.created_at
       from customer_insight ci
      where not exists (select 1 from insight_version v where v.insight_id = ci.id)`);
  await query(
    `insert into insight_observation
       (tenant_id, organization_id, insight_id, source, source_ref, observed_at, stance_observed, signal, provenance, link_confidence, created_at)
     select ci.tenant_id, ci.organization_id, ci.id, coalesce(ci.source,'lens'), '{}'::jsonb, ci.created_at, ci.stance, '{}'::jsonb, ci.provenance, 'linked', ci.created_at
       from customer_insight ci
      where not exists (select 1 from insight_observation o where o.insight_id = ci.id)`);
  const r = await query(
    `update customer_insight ci
        set current_version_id = iv.id,
            shared_version_id  = case when ci.sharing='SHARED' then iv.id else ci.shared_version_id end,
            first_observed_at  = coalesce(ci.first_observed_at, ci.created_at)
       from insight_version iv
      where iv.insight_id = ci.id and iv.version_no = 1 and ci.current_version_id is null`);
  return { backfilled: r.rowCount };
}
