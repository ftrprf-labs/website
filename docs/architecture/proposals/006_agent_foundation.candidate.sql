-- ============================================================================
-- CANDIDATE MIGRATION 006 — Minimal Agent Foundation (Scout).
--
-- DESIGN ONLY. NOT LIVE. This file lives under docs/architecture/proposals/ and
-- is DELIBERATELY NOT in server/comm/migrations/, so the boot migration runner
-- (server/comm/migrate.mjs, which reads server/comm/migrations/*.sql) can NEVER
-- pick it up or apply it. To actually build the first agent, a future session
-- copies a reviewed version of this into server/comm/migrations/006_*.sql.
--
-- Additive on 001-005. Tenant-scoped. Feature-flagged behind the same
-- COMM_LAYER_ENABLED + DATABASE_URL gate as the whole Communication Layer, so a
-- deployment without a database never touches anything.
--
-- Justified by the first real agent (Scout), not by a generic agent platform:
--   - actor      : a non-human colleague that work/ownership/audit can name
--   - work_item  : work as an explicit object (objective, mandate, provenance)
--   - agent_run  : one execution, for audit, cost and idempotency
-- Everything else is REUSED: notification (escalation), audit_event (audit),
-- activity (timeline), relationship_memory (evidence, proposed/confirmed),
-- contact.relationship_stage (candidate phase), channel_identity (dedup).
-- ============================================================================

-- ---- actor: unified identity for HUMAN and AGENT colleagues -----------------
-- In v1 this holds agents plus one system actor. Human actors are added later,
-- when real per-user auth lands, WITHOUT migrating the agent rows. Kept as text
-- for kind/role/status so new kinds/roles never need a migration.
create table if not exists actor (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenant(id),
  kind                text not null,                 -- 'HUMAN' | 'AGENT' | 'SYSTEM'
  slug                text not null,                 -- stable machine name: 'scout', 'system'
  display_name        text not null,
  role                text,                          -- 'business_development' | 'research' | ...
  status              text not null default 'active',-- active | paused | retired
  human_owner_actor_id uuid references actor(id) on delete set null,  -- responsible human (§4)
  app_user_id         uuid references app_user(id) on delete set null, -- link when a HUMAN actor maps to a login
  meta                jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists actor_tenant_kind_idx on actor (tenant_id, kind) where status='active';

-- Seed the Scout agent + a system actor for the default tenant. Idempotent.
do $$
declare def uuid;
begin
  select id into def from tenant where slug='maculis';
  if def is not null then
    insert into actor (tenant_id, kind, slug, display_name, role)
      values (def, 'SYSTEM', 'system', 'Maculis', null)
      on conflict (tenant_id, slug) do nothing;
    insert into actor (tenant_id, kind, slug, display_name, role)
      values (def, 'AGENT', 'scout', 'Scout', 'business_development')
      on conflict (tenant_id, slug) do nothing;
  end if;
end $$;

-- ---- work_item: the single shared work object for humans and agents (§10) ---
-- Relates to, never duplicates: follow_up (light human reminder), attention
-- (derived), ai_draft/comm_draft (concrete output), notification (per-user signal).
create table if not exists work_item (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenant(id),
  type               text not null,                  -- qualify_candidate | research | prepare | escalation
  objective          text not null,                  -- why this work exists (human-readable)
  created_by         uuid references actor(id) on delete set null,
  assigned_to        uuid references actor(id) on delete set null,   -- null = unassigned
  assigned_role      text,                           -- routing hint when no person yet
  organization_id    uuid references organization(id) on delete set null,
  contact_id         uuid references contact(id) on delete set null,
  conversation_id    uuid references conversation(id) on delete set null,
  source_signal_refs jsonb not null default '[]'::jsonb,  -- [{type,id}] provenance of the trigger
  status             text not null default 'proposed',    -- proposed|assigned|in_progress|awaiting_human|done|superseded|cancelled
  priority           text,                           -- deterministic relevance hint, never an invented AI score
  mandate_required   text,                           -- which mandate a colleague needs to finish it
  approval_required  boolean not null default false, -- human approval before completion (e.g. promote)
  input              jsonb not null default '{}'::jsonb,  -- what was used (provenance)
  output             jsonb not null default '{}'::jsonb,  -- result: candidate card, briefing, ...
  dedupe_key         text,                           -- idempotency (§30): one work item per signal
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  due_at             timestamptz,
  completed_at       timestamptz
);
create unique index if not exists work_item_dedupe_idx on work_item (tenant_id, dedupe_key) where dedupe_key is not null;
create index if not exists work_item_assigned_idx on work_item (tenant_id, assigned_to, status);
create index if not exists work_item_role_idx on work_item (tenant_id, assigned_role, status) where assigned_to is null;
create index if not exists work_item_org_idx on work_item (organization_id) where status <> 'done';
create index if not exists work_item_contact_idx on work_item (contact_id) where status <> 'done';

-- ---- agent_run: one execution of an agent on a work_item (audit/cost/idempotency) --
create table if not exists agent_run (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  work_item_id      uuid references work_item(id) on delete cascade,
  actor_id          uuid not null references actor(id) on delete cascade,
  trigger           text not null,                   -- inbound | pass_the_lens | scheduled | handoff | human | simulate
  status            text not null default 'running', -- running | succeeded | failed | superseded
  input_ref         jsonb not null default '{}'::jsonb,
  output_ref        jsonb not null default '{}'::jsonb,
  capability_calls  jsonb not null default '[]'::jsonb,  -- [{capability, args_ref, result_ref, at}]
  tokens            integer,                         -- cost governance (§20)
  cost              numeric(10,4),
  error             text,
  dedupe_key        text,                            -- idempotent runs: one live run per key
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);
create unique index if not exists agent_run_dedupe_idx on agent_run (tenant_id, dedupe_key) where dedupe_key is not null and status in ('running','succeeded');
create index if not exists agent_run_work_idx on agent_run (work_item_id, started_at);
create index if not exists agent_run_actor_idx on agent_run (actor_id, started_at);

-- ---- notes ------------------------------------------------------------------
-- Escalation is NOT a new table: an escalation is a work_item(type='escalation')
-- with assigned_role set, plus a notification row (migration 002) to the right
-- human. Mandate is NOT a table: it is config policy (MANDATE.scout) enforced by
-- an assertMandate() guard in the service layer, audited via audit_event
-- ('mandate_denied'). Candidate evidence is NOT a new table: it uses
-- relationship_memory (source='scout', confidence='proposed', source_ref) and
-- activity (type='scout_candidate_found'). Candidate phase uses the existing
-- contact.relationship_stage (LEAD on human-confirmed promotion).
--
-- New audit_event.action strings introduced by the agent layer:
--   agent_run_started, agent_run_finished, candidate_found, candidate_promoted,
--   candidate_dismissed, work_handoff, mandate_denied, escalation_created.
