-- Mijn Maculis Slice A1 — durable insight with append-only observations and versions.
-- ADDITIVE on 001-006. Nothing existing is dropped, reinterpreted or mutated. Backfill of existing
-- V1 insights runs idempotently in JS on boot (server/mijn/versions.mjs backfillInitialVersions),
-- mirroring the existing migrateInvitations boot pattern, so the backfill logic has a single source.
--
-- MODEL (durable entity, owner-approved):
--   customer_insight  = durable identity (the "head"), mutable pointers + current cache.
--   insight_observation = append-only evidence/signal at a moment ("dit zagen we toen"). Immutable.
--   insight_version     = append-only human reading at a moment ("dit dachten we / nu beter"). Immutable.
--
-- PRIVACY (owner-approved hard rule): consent is VERSION-BOUND. customer_insight.shared_version_id and
-- current_version_id are INDEPENDENT. Sharing v1, then a v2 arising, yields current=v2 / shared=v1;
-- the internal read joins on shared_version_id, so v2 (private) can never reach Maculis via that path.

-- ---- append-only evidence -------------------------------------------------------------------
create table if not exists insight_observation (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  organization_id  uuid not null references organization(id) on delete cascade,
  insight_id       uuid references customer_insight(id) on delete cascade,   -- always set in A1
  source           text not null default 'lens',        -- lens | human | ...
  source_ref       jsonb not null default '{}'::jsonb,   -- which Lens run / interaction (internal, traceable)
  observed_at      timestamptz not null default now(),
  stance_observed  text,
  signal           jsonb not null default '{}'::jsonb,   -- signal keys for future matching (internal)
  provenance       jsonb not null default '{}'::jsonb,   -- raw evidence (internal; NEVER to the customer)
  link_confidence  text not null default 'linked',       -- linked | suggested (A1: always linked)
  linked_by        uuid,                                 -- human who confirmed a 'suggested' link (future)
  created_at       timestamptz not null default now()
);
create index if not exists insight_observation_insight_idx on insight_observation (insight_id, observed_at);
create index if not exists insight_observation_org_idx on insight_observation (tenant_id, organization_id);

-- ---- append-only human readings (development over time) -------------------------------------
create table if not exists insight_version (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  organization_id  uuid not null references organization(id) on delete cascade,
  insight_id       uuid not null references customer_insight(id) on delete cascade,
  version_no       integer not null,
  -- The reading as it stood at this version. The head caches the CURRENT version's fields for the
  -- customer read; the internal read takes the SHARED version's fields from here.
  title            text,
  stance           text not null default 'reveal',
  observation      text,
  meaning          text,
  basis            text,
  not_yet_known    text,
  change_summary   text,                                 -- "wat is er veranderd t.o.v. de vorige lezing"
  based_on         jsonb not null default '[]'::jsonb,   -- observation ids that produced this reading
  authored_by      text not null default 'ingest',       -- ingest | human | ai | v1_backfill
  created_at       timestamptz not null default now(),
  unique (insight_id, version_no)
);
create index if not exists insight_version_insight_idx on insight_version (insight_id, version_no);
create index if not exists insight_version_org_idx on insight_version (tenant_id, organization_id);

-- ---- durable head: independent pointers (plain uuid, app-maintained; no circular FK cascade) --
alter table customer_insight add column if not exists current_version_id uuid;  -- the latest reading (customer sees this)
alter table customer_insight add column if not exists shared_version_id  uuid;  -- the reading the customer authorized (Maculis sees this); INDEPENDENT of current
alter table customer_insight add column if not exists first_observed_at   timestamptz;

-- ---- share audit records the exact version that crossed the boundary -------------------------
alter table insight_share_event add column if not exists version_id uuid;

-- ---- append-only as a SYSTEM rule, not a convention -----------------------------------------
-- Existing observations and versions are immutable: ordinary application paths can never overwrite a
-- row. Supersession is expressed by appending a newer version (version_no) and moving the head
-- pointer, never by editing history. (Row DELETE is not blocked so that removing a whole insight or
-- organization still cascades cleanly; no application path issues row-level deletes on these tables.)
create or replace function mijn_append_only_guard() returns trigger language plpgsql as $$
begin
  raise exception 'append-only violation: % rows are immutable (no UPDATE)', TG_TABLE_NAME
    using errcode = 'check_violation';
end $$;

drop trigger if exists insight_observation_no_update on insight_observation;
create trigger insight_observation_no_update before update on insight_observation
  for each row execute function mijn_append_only_guard();

drop trigger if exists insight_version_no_update on insight_version;
create trigger insight_version_no_update before update on insight_version
  for each row execute function mijn_append_only_guard();
