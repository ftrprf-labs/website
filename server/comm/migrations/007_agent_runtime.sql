-- Communication Layer — Digital Colleague RUNTIME (agent identity + run trace).
--
-- Additive on 001-006, idempotent, tenant-scoped, safe on every boot. Applied when either the
-- Communication Layer or the agent domain is enabled (see migrate.mjs / dbFeaturesEnabled).
--
-- ONE REALITY (§ AGENT_COCKPIT_CONTRACT). A digital colleague does NOT own a second work model. The
-- WORK a colleague produces lands in `attention_item` via recordWorkItem() (migration 006); the
-- relation stays the shared truth. This migration adds ONLY what the contract says the agent domain
-- owns and the cockpit does not: the colleague's IDENTITY (+ its mandate/autonomy) and a RUN TRACE
-- for observability ("why did this appear in my cockpit?": run -> observation -> evidence -> proposal
-- -> attention_item -> human action). Evidence and proposal themselves live on the attention_item.

-- ---- actor: identity for HUMAN and AGENT colleagues -----------------------------------------
-- Origin/owner on an attention_item are lightweight {kind,key,label}; this table is the registry
-- backing an AGENT key (its granted autonomy, mandate role, responsible human). HUMAN actors are
-- added when real per-user auth lands, without migrating the agent rows.
create table if not exists actor (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references tenant(id) on delete cascade,
  kind                 text not null,                 -- 'HUMAN' | 'AGENT' | 'SYSTEM'
  slug                 text not null,                 -- stable key used as origin.key on work ('scout')
  display_name         text not null,                 -- origin.label shown in the cockpit ('Scout')
  role                 text,                          -- 'growth' | 'relationship' | 'conversation' | ...
  autonomy             text not null default 'OBSERVE',  -- granted MAX level (safe default)
  status               text not null default 'active',   -- active | paused | retired
  human_owner_actor_id uuid references actor(id) on delete set null,
  app_user_id          uuid references app_user(id) on delete set null,
  meta                 jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists actor_tenant_kind_idx on actor (tenant_id, kind) where status='active';

-- Seed the SYSTEM actor + the Growth/Lead colleague (Scout) for the default tenant. Idempotent.
-- Scout is granted PREPARE: it may observe, propose and prepare (record work into the cockpit), but
-- never resolve its own work, send anything external, promote/materialise a relation, or read privacy.
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

-- ---- agent_run: one execution of a colleague (observability / cost / idempotency) ------------
-- NOT a work object. It records that a colleague ran, why, at what autonomy, what it called, and
-- which attention_item(s) it landed (in output_ref), so the whole chain stays reconstructable.
create table if not exists agent_run (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id) on delete cascade,
  actor_id          uuid not null references actor(id) on delete cascade,
  trigger           text not null,                   -- human | scheduled | handoff | inbound | simulate
  status            text not null default 'running', -- running | succeeded | failed | superseded
  autonomy_used     text,
  input_ref         jsonb not null default '{}'::jsonb,   -- what the run was asked to do
  output_ref        jsonb not null default '{}'::jsonb,   -- { landed: [attention_item ids], counts, ... }
  capability_calls  jsonb not null default '[]'::jsonb,   -- [{capability, at, note}]
  tokens            integer,
  cost              numeric(10,4),
  error             text,
  dedupe_key        text,                            -- one live/succeeded run per key (double-submit guard)
  started_at        timestamptz not null default now(),
  ended_at          timestamptz
);
create unique index if not exists agent_run_dedupe_idx on agent_run (tenant_id, dedupe_key)
  where dedupe_key is not null and status in ('running','succeeded');
create index if not exists agent_run_actor_idx on agent_run (actor_id, started_at);

-- ---- notes ----------------------------------------------------------------------------------
-- Work lands in attention_item (migration 006) via recordWorkItem(); resolution is human-only via
-- resolveWorkItem(). Evidence and proposal live on the attention_item. Mandate/autonomy are config
-- (server/agents/registry.mjs) enforced by guards and audited via audit_event.
-- New audit_event.action strings from the agent runtime:
--   agent_run_started, agent_run_finished, agent_run_failed, mandate_denied, autonomy_denied.
