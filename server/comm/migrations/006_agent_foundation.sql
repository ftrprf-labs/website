-- Communication Layer — Digital Colleagues foundation (§TEAM & AGENTS ARCHITECTURE).
--
-- Additive on 001-005. Non-destructive, idempotent, safe to run on every boot. Tenant-scoped
-- throughout. Feature-flagged behind the same COMM_LAYER_ENABLED + DATABASE_URL gate as the whole
-- Communication Layer, so a deployment without a database never touches anything.
--
-- The minimal shared foundation that lets a NON-HUMAN colleague do work inside the SAME relational
-- truth (no parallel universe): who did the work, from which role, why, for which relationship,
-- with which evidence, how sure, what next step, whether human approval is required, what mandate
-- it had, and what state transition it produced. Everything a colleague FINDS lands as a PROPOSAL
-- with provenance, never as silently-confirmed relational state.
--
-- Reuses existing primitives (never duplicated): audit_event (audit), activity (timeline),
-- notification (escalation signal), relationship_memory (confirmed vs proposed facts),
-- contact/organization.relationship_stage (lead lifecycle), channel_identity/identity_key (dedup).

-- ---- actor: unified identity for HUMAN and AGENT colleagues ---------------------------------
-- v1 holds agents plus one SYSTEM actor. HUMAN actors are added when real per-user auth lands,
-- without migrating the agent rows. kind/role/status are text so new kinds never need a migration.
create table if not exists actor (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenant(id),
  kind                 text not null,                 -- 'HUMAN' | 'AGENT' | 'SYSTEM'
  slug                 text not null,                 -- stable machine name: 'scout', 'system'
  display_name         text not null,
  role                 text,                          -- 'growth' | 'relationship' | 'conversation' | ...
  autonomy             text not null default 'OBSERVE',  -- granted MAX level (see §MANDATE): safe default
  status               text not null default 'active',   -- active | paused | retired
  human_owner_actor_id uuid references actor(id) on delete set null,  -- responsible human (accountability)
  app_user_id          uuid references app_user(id) on delete set null, -- link when a HUMAN actor maps to a login
  meta                 jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists actor_tenant_kind_idx on actor (tenant_id, kind) where status='active';

-- Seed the SYSTEM actor + the Growth/Lead colleague (Scout) for the default tenant. Idempotent.
-- Scout is granted PREPARE: it may observe, propose and prepare autonomously, but any external or
-- shared-truth-mutating action (send, promote) is above its autonomy and always needs a human.
do $$
declare def uuid;
begin
  select id into def from tenant where slug='maculis';
  if def is not null then
    insert into actor (tenant_id, kind, slug, display_name, role, autonomy)
      values (def, 'SYSTEM', 'system', 'Maculis', null, 'OBSERVE')
      on conflict (tenant_id, slug) do nothing;
    insert into actor (tenant_id, kind, slug, display_name, role, autonomy)
      values (def, 'AGENT', 'scout', 'Scout', 'growth', 'PREPARE')
      on conflict (tenant_id, slug) do nothing;
  end if;
end $$;

-- ---- work_item: the single shared work object for humans and agents ------------------------
-- Relates to, never duplicates: follow_up (light human reminder), attention (derived),
-- ai_draft/comm_draft (concrete output), notification (per-user signal).
create table if not exists work_item (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenant(id),
  type               text not null,                  -- growth_discovery | research | prepare | escalation
  objective          text not null,                  -- why this work exists (human-readable)
  created_by         uuid references actor(id) on delete set null,
  assigned_to        uuid references actor(id) on delete set null,   -- null = unassigned
  assigned_role      text,                           -- routing hint when no person yet
  organization_id    uuid references organization(id) on delete set null,
  contact_id         uuid references contact(id) on delete set null,
  conversation_id    uuid references conversation(id) on delete set null,
  source_signal_refs jsonb not null default '[]'::jsonb,  -- [{type,id}] provenance of the trigger
  input              jsonb not null default '{}'::jsonb,  -- e.g. { candidates:[{name,domain,note}], scope }
  status             text not null default 'proposed',    -- proposed|assigned|in_progress|awaiting_human|done|superseded|cancelled|failed
  priority           text,                           -- deterministic hint, never an invented AI score
  approval_required  boolean not null default false,
  output             jsonb not null default '{}'::jsonb,  -- run summary (counts, refs)
  dedupe_key         text,                           -- idempotency: one work item per external trigger
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  due_at             timestamptz,
  completed_at       timestamptz
);
create unique index if not exists work_item_dedupe_idx on work_item (tenant_id, dedupe_key) where dedupe_key is not null;
create index if not exists work_item_assigned_idx on work_item (tenant_id, assigned_to, status);
create index if not exists work_item_role_idx on work_item (tenant_id, assigned_role, status) where assigned_to is null;
create index if not exists work_item_org_idx on work_item (organization_id) where status <> 'done';

-- ---- agent_run: one execution of a colleague on a work_item (audit / cost / idempotency) ----
create table if not exists agent_run (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  work_item_id      uuid references work_item(id) on delete cascade,
  actor_id          uuid not null references actor(id) on delete cascade,
  trigger           text not null,                   -- human | scheduled | handoff | inbound | simulate
  status            text not null default 'running', -- running | succeeded | failed | superseded
  autonomy_used     text,                            -- the level the run actually operated at
  input_ref         jsonb not null default '{}'::jsonb,
  output_ref        jsonb not null default '{}'::jsonb,
  capability_calls  jsonb not null default '[]'::jsonb,  -- [{capability, at, note}]
  tokens            integer,
  cost              numeric(10,4),
  error             text,
  dedupe_key        text,                            -- one live/succeeded run per key (double-submit guard)
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);
-- Partial unique index gives at-most-one non-failed run per dedupe key: retries after a failure are
-- allowed, but a double-submit while a run is running/succeeded is rejected.
create unique index if not exists agent_run_dedupe_idx on agent_run (tenant_id, dedupe_key)
  where dedupe_key is not null and status in ('running','succeeded');
create index if not exists agent_run_work_idx on agent_run (work_item_id, started_at);
create index if not exists agent_run_actor_idx on agent_run (actor_id, started_at);

-- ---- agent_finding: an evidence-grounded thing a colleague found -----------------------------
-- A finding is a PROPOSAL, never confirmed relational truth. It carries an epistemic status
-- (OBSERVATION | INFERENCE | PROPOSAL | ...), a confidence, WHY it is relevant, a proposed next
-- action, and whether a human must approve. Promotion (human) is what turns it into a lead.
create table if not exists agent_finding (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  work_item_id      uuid references work_item(id) on delete cascade,
  agent_run_id      uuid references agent_run(id) on delete set null,
  actor_id          uuid references actor(id) on delete set null,
  kind              text not null default 'lead_candidate',  -- lead_candidate | observation | risk | opportunity
  subject_type      text,                            -- organization | contact
  subject_key       text,                            -- normalised dedup key (domain or slug of name)
  title             text not null,                   -- e.g. 'Acme BV'
  summary           text,                            -- WHY this may fit Maculis (human-readable)
  epistemic_status  text not null default 'OBSERVATION', -- OBSERVATION|INFERENCE|HYPOTHESIS|PROPOSAL
  confidence        numeric(3,2),                    -- 0.00..1.00 when meaningful (else null)
  -- link into the shared truth when the subject already exists / once promoted:
  organization_id   uuid references organization(id) on delete set null,
  contact_id        uuid references contact(id) on delete set null,
  already_known     boolean not null default false,  -- did we already have this org/person?
  proposed_action   jsonb not null default '{}'::jsonb,  -- {kind, summary, mandate_required, approval_required}
  approval_required boolean not null default true,   -- default safe: a human decides
  status            text not null default 'new',     -- new | accepted | promoted | dismissed | superseded
  decided_by        uuid references app_user(id) on delete set null,
  decided_at        timestamptz,
  decision_note     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- One finding per subject per work item (idempotent re-runs never duplicate a candidate).
create unique index if not exists agent_finding_subject_idx on agent_finding (tenant_id, work_item_id, subject_key) where subject_key is not null;
create index if not exists agent_finding_status_idx on agent_finding (tenant_id, status, created_at);
create index if not exists agent_finding_org_idx on agent_finding (organization_id) where organization_id is not null;

-- ---- agent_evidence: provenance for a finding (never invented; source is explicit) ----------
create table if not exists agent_evidence (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  finding_id    uuid not null references agent_finding(id) on delete cascade,
  source_type   text not null,                       -- internal_db | inbound | pass_the_lens | provided | external_web
  source_ref    jsonb not null default '{}'::jsonb,  -- {type,id} or {url,...}
  detail        text,                                -- what this evidence shows
  provider      text,                                -- which capability/provider produced it (e.g. 'internal', 'mock')
  retrieved_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists agent_evidence_finding_idx on agent_evidence (finding_id, created_at);

-- ---- notes ----------------------------------------------------------------------------------
-- Mandate is NOT a table: it is config policy (server/agents/registry.mjs) enforced by
-- assertMandate()/assertAutonomy() guards in the service layer, audited via audit_event.
-- Escalation is NOT a new table: an escalation is a work_item(type='escalation') with
-- assigned_role set, plus a notification row (migration 002) to the right human.
--
-- New audit_event.action strings introduced by the agent layer:
--   agent_run_started, agent_run_finished, agent_run_failed, finding_created,
--   finding_promoted, finding_dismissed, work_handoff, mandate_denied, autonomy_denied,
--   escalation_created.
