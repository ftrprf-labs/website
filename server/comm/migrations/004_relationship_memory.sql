-- Communication Layer — Relationship Memory (§RELATIONSHIP MEMORY).
-- Additive on 001-003. A safe, bounded memory of the RELATIONSHIP: structured facts and
-- agreements distinct from raw conversation history and from follow-ups. AI-derived items are
-- NEVER silently treated as hard fact: they land as source='ai', confidence='proposed' until a
-- human confirms. Purpose-limited and tenant-scoped; feeds the bounded Context Engine.

create table if not exists relationship_memory (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  organization_id  uuid references organization(id) on delete set null,
  contact_id       uuid references contact(id) on delete cascade,
  conversation_id  uuid references conversation(id) on delete set null,
  -- what kind of memory: a durable fact, an agreement/afspraak, a stated preference, or a
  -- do-not-contact-until style reminder. Kept as text so new kinds don't need a migration.
  kind             text not null default 'fact',   -- fact | agreement | preference | reminder
  content          text not null,
  source           text not null default 'human',  -- human | ai  (provenance is explicit)
  confidence       text not null default 'confirmed', -- confirmed | proposed (AI starts proposed)
  valid_until      timestamptz,                     -- e.g. "niet benaderen vóór oktober"
  source_ref       jsonb not null default '{}'::jsonb, -- {type,id} back to the origin interaction (transparency)
  created_by       uuid references app_user(id) on delete set null,
  confirmed_by     uuid references app_user(id) on delete set null,
  confirmed_at     timestamptz,
  superseded_at    timestamptz,                     -- soft-retire without losing history
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists rel_memory_contact_idx on relationship_memory (contact_id) where superseded_at is null;
create index if not exists rel_memory_org_idx on relationship_memory (organization_id) where superseded_at is null;
create index if not exists rel_memory_proposed_idx on relationship_memory (tenant_id, confidence) where superseded_at is null and confidence='proposed';
