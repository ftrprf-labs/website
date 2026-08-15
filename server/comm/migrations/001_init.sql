-- Communication / Relationship Layer — foundation schema (Build Phase 1).
-- ADDITIVE: the existing JSON invitation store (data/invitations.json) is NOT touched.
-- The relationship is the primary unit: Organization -> Contact -> Conversation -> Message.
-- Channel-agnostic core (today EMAIL); email-specifics live in transport_meta (jsonb), so the
-- model is not an "EmailMessage" system and can host WhatsApp/web-form later without redesign.

create extension if not exists citext;

-- ---- stable enums (extensible ones are text + app-level validation) ---------------------
do $$ begin create type channel_kind as enum ('EMAIL'); exception when duplicate_object then null; end $$;
do $$ begin create type mailbox_kind as enum ('COMMUNICATION','PRIVACY'); exception when duplicate_object then null; end $$;
do $$ begin create type conv_status  as enum ('NEW','OPEN','ANSWERED','CLOSED'); exception when duplicate_object then null; end $$;
do $$ begin create type msg_direction as enum ('INBOUND','OUTBOUND'); exception when duplicate_object then null; end $$;
do $$ begin create type msg_delivery as enum ('RECEIVED','DRAFT','QUEUED','SENT','DELIVERED','BOUNCED','FAILED'); exception when duplicate_object then null; end $$;

-- ---- identity: permanent, campaign-independent -----------------------------------------
create table if not exists organization (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  primary_domain citext,                       -- best-known domain; a SIGNAL, never sole proof
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  retention_days integer
);
create index if not exists organization_domain_idx on organization (primary_domain) where deleted_at is null;

-- Contact = permanent person identity. NOT campaign-scoped: the natural key is the normalised
-- e-mail (primary) or mobile (fallback), WITHOUT any campaign prefix, so the same human across
-- campaigns/journeys is ONE Contact. (person_key in the JSON store is campaign-scoped and is
-- therefore only used to locate legacy rows during migration, never as the Contact identity.)
create table if not exists contact (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organization(id) on delete set null,
  first_name      text,
  last_name       text,
  email           citext,
  mobile          text,
  identity_key    text not null unique,        -- 'email:<addr>' | 'mobile:<e164>' (campaign-INDEPENDENT)
  role            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists contact_email_idx on contact (email) where deleted_at is null;
create index if not exists contact_org_idx on contact (organization_id) where deleted_at is null;

-- Invitation hangs UNDER Contact (Contact -> Invitations[]). We keep the JSON store as the
-- operational source for the First Five lifecycle; this row links a Contact to that record so
-- a second invitation/campaign never mints a second Contact.
create table if not exists invitation (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid not null references contact(id) on delete cascade,
  legacy_id        text,                        -- invitations.json record id (bridge, nullable)
  token            text,                        -- personal ?p= token (bridge)
  campaign         text not null,
  status           text,                        -- mirror of DRAFT/SENT/OPENED/COMPLETED (observational)
  created_at       timestamptz not null default now()
);
create unique index if not exists invitation_legacy_idx on invitation (legacy_id) where legacy_id is not null;
create index if not exists invitation_contact_idx on invitation (contact_id);

-- ---- channels / mailboxes --------------------------------------------------------------
create table if not exists mailbox (
  id         uuid primary key default gen_random_uuid(),
  address    citext not null unique,            -- hello@maculis.nl | privacy@maculis.nl
  kind       mailbox_kind not null,
  channel    channel_kind not null default 'EMAIL',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- conversations & messages ----------------------------------------------------------
create table if not exists conversation (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid references organization(id) on delete set null,
  contact_id         uuid references contact(id) on delete set null,   -- null = not linked (Inbox)
  channel            channel_kind not null default 'EMAIL',
  mailbox_id         uuid references mailbox(id) on delete set null,
  is_privacy         boolean not null default false,                   -- mirrors mailbox.kind = PRIVACY
  subject            text,
  status             conv_status not null default 'NEW',
  thread_key         text,                                             -- channel-agnostic thread anchor
  match_confidence   text,                                             -- 'linked' | 'suggested' | 'unlinked'
  suggested_org_id   uuid references organization(id) on delete set null,
  assigned_to        uuid,                                             -- app_user.id
  last_message_at    timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists conversation_thread_idx on conversation (thread_key) where deleted_at is null;
create index if not exists conversation_contact_idx on conversation (contact_id) where deleted_at is null;
create index if not exists conversation_privacy_idx on conversation (is_privacy, status) where deleted_at is null;

create table if not exists message (
  id                 uuid primary key default gen_random_uuid(),
  conversation_id    uuid not null references conversation(id) on delete cascade,
  direction          msg_direction not null,
  channel            channel_kind not null default 'EMAIL',
  from_address       text,
  to_addresses       jsonb not null default '[]'::jsonb,
  cc_addresses       jsonb not null default '[]'::jsonb,
  subject            text,
  body_text          text,
  body_html_sanitized text,                     -- sanitised HTML only; raw HTML is NEVER stored/rendered
  transport_meta     jsonb not null default '{}'::jsonb,  -- email: {rfc_message_id,in_reply_to,references[],spf,dkim,dmarc}
  provider           text,                       -- 'resend'
  provider_message_id text,
  rfc_message_id     text,                        -- promoted for threading lookups
  delivery           msg_delivery not null default 'RECEIVED',
  sent_by            uuid,                        -- app_user.id for OUTBOUND (human sender)
  received_at        timestamptz,
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  deleted_at         timestamptz
);
create index if not exists message_conv_idx on message (conversation_id, created_at);
create index if not exists message_rfc_idx on message (rfc_message_id) where rfc_message_id is not null;

create table if not exists attachment (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references message(id) on delete cascade,
  filename      text,
  content_type  text,
  size_bytes    bigint,
  provider_ref  text,                            -- fetch binary on demand; not stored inline
  sha256        text,
  scan_status   text not null default 'unscanned',
  created_at    timestamptz not null default now()
);
create index if not exists attachment_msg_idx on attachment (message_id);

-- ---- AI copilot output (draft only; never auto-sent in V1) -------------------------------
create table if not exists ai_draft (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversation(id) on delete cascade,
  message_id       uuid references message(id) on delete set null,   -- the inbound message it answers
  summary          text,
  intent           text,                          -- extensible classification label
  intent_scores    jsonb,                         -- optional multi-label detail
  suggested_reply  text,
  suggested_actions jsonb not null default '[]'::jsonb,  -- prepared, not auto-executed
  model            text,
  status           text not null default 'proposed',    -- proposed | superseded | used
  error            text,                          -- set when AI failed (receipt still succeeds)
  created_at       timestamptz not null default now()
);
create index if not exists ai_draft_conv_idx on ai_draft (conversation_id, created_at);

-- ---- users / RBAC ----------------------------------------------------------------------
create table if not exists app_user (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null unique,
  name          text,
  password_hash text,                             -- scrypt; null = login disabled
  capabilities  jsonb not null default '{}'::jsonb,  -- {communication:bool, privacy:bool, admin:bool}
  disabled      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---- audit (append-only) + webhook idempotency -----------------------------------------
create table if not exists audit_event (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_user(id) on delete set null,
  action        text not null,
  entity_type   text,
  entity_id     text,
  mailbox_kind  mailbox_kind,
  ip_ref        text,
  meta          jsonb not null default '{}'::jsonb,
  at            timestamptz not null default now()
);
create index if not exists audit_at_idx on audit_event (at);
create index if not exists audit_entity_idx on audit_event (entity_type, entity_id);

create table if not exists webhook_event (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,
  provider_event_id text not null,               -- Resend/Svix message id — idempotency key
  svix_id           text,
  status            text not null default 'received',  -- received | processed | failed
  received_at       timestamptz not null default now(),
  processed_at      timestamptz,
  error             text,
  unique (provider, provider_event_id)
);
