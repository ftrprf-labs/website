-- Communication Layer — ATTENTION ITEMS (Slice 5: the collaborative cockpit).
-- Forward-only, non-destructive, additive on 001-005. Safe to run on every boot.
--
-- The cockpit's attention has two natures. DERIVED attention (an unanswered inbound, a due follow-up,
-- a quiet relation) is computed from durable facts every time and never stored — it cannot drift.
-- AUTHORED attention is different: when a colleague (a human, or a digital colleague/agent) OBSERVES,
-- RESEARCHES, PREPARES or PROPOSES something, that is a real artefact with evidence and a proposal.
-- It is not derivable from conversation state, so it must be persisted. This table is that one place.
--
-- ONE REALITY. An attention item references EXISTING domain objects by id (contact / organization /
-- conversation / follow_up). It never copies a relation. A not-yet-created lead is carried as a
-- `proposed_relation` payload until a human approves it into a real contact. There is no second
-- database and no sync: the agent domain writes here, against the same rows the cockpit reads.
--
-- ORIGIN vs OWNERSHIP. `origin_*` is who produced the work (Growth, Relatiecollega, a human). `owner_*`
-- is who currently owns moving it forward. Nothing here assumes a single human user.

create table if not exists attention_item (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id) on delete cascade,

  -- ORIGIN — who produced this work.
  origin_kind      text not null default 'AGENT',        -- HUMAN | AGENT | SYSTEM
  origin_key       text,                                  -- stable id of the colleague (e.g. 'growth')
  origin_label     text,                                  -- human name shown ('Growth', 'Relatiecollega')

  -- OWNERSHIP — who currently owns moving it forward (never assume one human).
  owner_kind       text not null default 'HUMAN',         -- HUMAN | AGENT
  owner_key        text,                                  -- e.g. 'lud' or an agent key

  -- WHAT kind of attention this is, and where it sits.
  type             text not null,                         -- AGENT_FINDING | AGENT_PROPOSAL | APPROVAL_REQUIRED | AGENT_RESULT | ...
  bucket           text not null default 'KLAAR',         -- NU | KLAAR | RADAR
  priority         integer not null default 50,

  -- RELATION anchor — any subset; keeps work inside the one relational reality.
  contact_id       uuid references contact(id) on delete set null,
  organization_id  uuid references organization(id) on delete set null,
  conversation_id  uuid references conversation(id) on delete set null,
  follow_up_id     uuid references follow_up(id) on delete set null,
  proposed_relation jsonb,                                -- a not-yet-created lead {name, org, email, ...}

  -- MEANING for the human.
  title            text not null,
  reason           text,

  -- WHY Maculis thinks this (provenance/evidence) and WHAT is proposed + what is needed from a human.
  evidence         jsonb not null default '{}'::jsonb,    -- {source, sourceRef, observations:[...], ...}
  proposal         jsonb not null default '{}'::jsonb,    -- {summary, actions:[...], needs:'approval'|'review'|'awareness'}

  -- LIFECYCLE — human in the loop; nothing auto-executes externally.
  dedup_key        text,                                  -- idempotency per (tenant, origin_key, dedup_key)
  status           text not null default 'open',          -- open | approved | edited | taken_over | rejected | done | superseded
  resolution       jsonb,
  resolved_at      timestamptz,
  resolved_by      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Idempotency: the same colleague re-reporting the same finding updates in place instead of stacking.
create unique index if not exists attention_item_dedup
  on attention_item (tenant_id, origin_key, dedup_key)
  where dedup_key is not null and status = 'open';

create index if not exists attention_item_open_idx     on attention_item (tenant_id, status) where status = 'open';
create index if not exists attention_item_contact_idx  on attention_item (contact_id)        where status = 'open';
create index if not exists attention_item_owner_idx    on attention_item (tenant_id, owner_kind, owner_key) where status = 'open';
