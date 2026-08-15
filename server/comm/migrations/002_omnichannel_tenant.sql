-- Communication Layer — omnichannel + multi-tenant foundation (Architecture Delta).
-- Additive on 001. Nothing is live yet, so this safely upgrades the foundation to the target:
-- MACULIS KENT MENSEN, NIET MAILBOXEN. The relationship is central; channels are transports.

-- ---- multi-tenancy: every relationship table gets an unambiguous tenant boundary -----------
create table if not exists tenant (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);
insert into tenant(slug, name) values ('maculis', 'Maculis')
  on conflict (slug) do nothing;

-- Add tenant_id to existing core tables and backfill to the default tenant, then enforce NOT NULL.
do $$
declare def uuid;
begin
  select id into def from tenant where slug='maculis';
  perform 1;
  -- add columns if missing
  alter table organization add column if not exists tenant_id uuid;
  alter table contact      add column if not exists tenant_id uuid;
  alter table invitation   add column if not exists tenant_id uuid;
  alter table conversation add column if not exists tenant_id uuid;
  alter table message      add column if not exists tenant_id uuid;
  alter table ai_draft     add column if not exists tenant_id uuid;
  alter table audit_event  add column if not exists tenant_id uuid;
  alter table app_user     add column if not exists tenant_id uuid;
  alter table mailbox      add column if not exists tenant_id uuid;
  -- backfill
  update organization set tenant_id=def where tenant_id is null;
  update contact      set tenant_id=def where tenant_id is null;
  update invitation   set tenant_id=def where tenant_id is null;
  update conversation set tenant_id=def where tenant_id is null;
  update message      set tenant_id=def where tenant_id is null;
  update ai_draft     set tenant_id=def where tenant_id is null;
  update audit_event  set tenant_id=def where tenant_id is null;
  update app_user     set tenant_id=def where tenant_id is null;
  update mailbox      set tenant_id=def where tenant_id is null;
end $$;

alter table organization alter column tenant_id set not null;
alter table contact      alter column tenant_id set not null;
alter table conversation alter column tenant_id set not null;
alter table message      alter column tenant_id set not null;

-- Contact identity_key is unique PER TENANT (not globally) — the same e-mail can exist for two
-- tenants without collision. Replace the global unique with a composite one.
alter table contact drop constraint if exists contact_identity_key_key;
create unique index if not exists contact_identity_tenant_idx on contact (tenant_id, identity_key);

-- ---- expand the channel + conversation vocabularies (adapters plug in later) ---------------
alter type channel_kind add value if not exists 'WHATSAPP';
alter type channel_kind add value if not exists 'SMS';
alter type channel_kind add value if not exists 'PHONE';
alter type channel_kind add value if not exists 'INSTAGRAM';
alter type channel_kind add value if not exists 'FACEBOOK_MESSENGER';
alter type channel_kind add value if not exists 'LINKEDIN';
alter type channel_kind add value if not exists 'WEB';
alter type channel_kind add value if not exists 'JOURNEY';
alter type channel_kind add value if not exists 'INTERNAL_NOTE';
alter type channel_kind add value if not exists 'OTHER';

alter type conv_status add value if not exists 'WAITING_ON_US';
alter type conv_status add value if not exists 'WAITING_ON_CONTACT';
alter type conv_status add value if not exists 'RESOLVED';

-- ---- channel identity: one Contact, many channel handles (§5) ------------------------------
create table if not exists channel_identity (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  contact_id    uuid not null references contact(id) on delete cascade,
  channel       channel_kind not null,
  value         text not null,                 -- normalised (lowercased e-mail / E.164 phone / handle)
  raw_value     text,
  provider      text,
  provider_identity text,
  verified      boolean not null default false,
  is_primary    boolean not null default false,
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, channel, value)
);
create index if not exists channel_identity_contact_idx on channel_identity (contact_id);

-- ---- collaboration: teams + conversation ownership (§23) -----------------------------------
create table if not exists team (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenant(id),
  name text not null, created_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create table if not exists team_member (
  team_id uuid not null references team(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  primary key (team_id, user_id)
);
alter table conversation add column if not exists owner_user_id uuid references app_user(id) on delete set null;
alter table conversation add column if not exists team_id uuid references team(id) on delete set null;
alter table conversation add column if not exists priority text;
alter table conversation add column if not exists tags jsonb not null default '[]'::jsonb;
alter table conversation add column if not exists follow_up_at timestamptz;

-- ---- internal notes: a SEPARATE table = a hard boundary that can never be sent externally (§23)
create table if not exists internal_note (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  conversation_id uuid not null references conversation(id) on delete cascade,
  author_user_id uuid references app_user(id) on delete set null,
  body           text not null,
  mentions       jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists internal_note_conv_idx on internal_note (conversation_id, created_at);

-- ---- unified activity timeline (not everything is a message) (§12) -------------------------
create table if not exists activity (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid references organization(id) on delete set null,
  contact_id      uuid references contact(id) on delete set null,
  conversation_id uuid references conversation(id) on delete set null,
  type            text not null,                -- invitation_sent | journey_completed | message_received | …
  channel         channel_kind,
  actor_user_id   uuid references app_user(id) on delete set null,
  meta            jsonb not null default '{}'::jsonb,
  at              timestamptz not null default now()
);
create index if not exists activity_contact_idx on activity (contact_id, at);
create index if not exists activity_org_idx on activity (organization_id, at);

-- ---- per-channel/purpose communication preferences (§26) — separate from First Five consent
create table if not exists communication_preference (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenant(id),
  contact_id    uuid not null references contact(id) on delete cascade,
  channel       channel_kind not null,
  purpose       text not null,                  -- transactional | research | commercial | privacy
  allowed       boolean not null,
  legal_basis   text,
  source        text,
  evidence      text,
  actor_user_id uuid references app_user(id) on delete set null,
  at            timestamptz not null default now(),
  withdrawn_at  timestamptz,
  unique (tenant_id, contact_id, channel, purpose)
);

-- ---- templates (§27) -----------------------------------------------------------------------
create table if not exists template (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenant(id),
  key        text not null,                     -- e.g. 'first_five_invite'
  channel    channel_kind not null,
  purpose    text,
  language   text not null default 'nl',
  subject    text,
  body       text not null,
  variables  jsonb not null default '[]'::jsonb,
  version    integer not null default 1,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, key, channel, language, version)
);

-- ---- notifications (§36) -------------------------------------------------------------------
create table if not exists notification (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenant(id),
  user_id     uuid references app_user(id) on delete cascade,
  type        text not null,                    -- new_inbound | mention | assigned | reply_overdue | …
  entity_type text,
  entity_id   text,
  meta        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notification_user_idx on notification (user_id, read_at, created_at);

-- ---- retention / data governance policies (§40) --------------------------------------------
create table if not exists retention_policy (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenant(id),
  data_type      text not null,                 -- message | attachment | activity | conversation
  channel        channel_kind,
  purpose        text,
  retention_days integer,
  action         text not null default 'delete',-- delete | anonymize
  created_at     timestamptz not null default now()
);
