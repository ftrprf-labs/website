-- Communication Layer — AI-first drafts, follow-ups, omnichannel outbound + delivery (Build Phase 2).
-- Additive on 001/002. Nothing destructive. This layer turns the foundation into the AI-first
-- Relationship Workspace: the RELATIONSHIP is the product object, AI is the primary working layer,
-- CHANNELS are transport, HUMAN APPROVAL is the last step (§AI addendum).

-- ---- delivery vocabulary: some channels report READ reliably (WhatsApp), most do not ----------
alter type msg_delivery add value if not exists 'READ';
alter type msg_delivery add value if not exists 'DELIVERING';

-- ---- editable communication draft (shared by the composer AND the AI chat) --------------------
-- One live, editable draft per composing session. The AI and the human edit the SAME body. A new
-- AI revision NEVER silently discards human edits: it takes the CURRENT body as its base and every
-- change is versioned (comm_draft_version), so what the human ultimately sends stays traceable.
create table if not exists comm_draft (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  conversation_id  uuid references conversation(id) on delete cascade,
  contact_id       uuid references contact(id) on delete set null,
  organization_id  uuid references organization(id) on delete set null,
  channel          channel_kind not null default 'EMAIL',
  recipient        text,                              -- resolved channel identity value (email / E.164 / handle)
  subject          text,                              -- email only
  body             text not null default '',
  ai_generated     boolean not null default false,    -- was the CURRENT body last written by AI?
  human_edited     boolean not null default false,    -- has a human ever edited this draft?
  ai_model         text,
  context_refs     jsonb not null default '[]'::jsonb, -- what relationship context the AI used (transparency §)
  version          integer not null default 1,
  status           text not null default 'draft',      -- draft | approved | sent | discarded
  created_by       uuid references app_user(id) on delete set null,
  approved_by      uuid references app_user(id) on delete set null,
  approved_at      timestamptz,
  sent_message_id  uuid references message(id) on delete set null,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists comm_draft_conv_idx on comm_draft (conversation_id, created_at);
create index if not exists comm_draft_open_idx on comm_draft (tenant_id, status) where status='draft';

-- Immutable version history: every body change (AI or human) appends a row. Lets a later AI action
-- rebase on the current text and lets the UI show "what changed" without losing a human edit.
create table if not exists comm_draft_version (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references comm_draft(id) on delete cascade,
  version     integer not null,
  channel     channel_kind,
  subject     text,
  body        text not null,
  author      text not null,                          -- 'ai' | 'human' | 'seed'
  instruction text,                                   -- the natural-language command that produced an AI revision
  created_at  timestamptz not null default now(),
  unique (draft_id, version)
);

-- The conversational thread ABOUT the draft ("maak dit warmer", "waarom stel je dit voor?"). The
-- user chats with Maculis and the SAME draft updates — no separate copy-paste step (§conversational
-- composer). Assistant turns may carry a rationale that references relationship context.
create table if not exists draft_chat_message (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null references comm_draft(id) on delete cascade,
  role        text not null,                          -- 'user' | 'assistant'
  content     text not null,
  produced_version integer,                           -- if this assistant turn revised the draft
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists draft_chat_idx on draft_chat_message (draft_id, created_at);

-- ---- follow-ups / lightweight tasks (§34) -----------------------------------------------------
-- Enough to make sure communication does not disappear; NOT a project-management system.
create table if not exists follow_up (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  organization_id  uuid references organization(id) on delete set null,
  contact_id       uuid references contact(id) on delete set null,
  conversation_id  uuid references conversation(id) on delete set null,
  owner_user_id    uuid references app_user(id) on delete set null,
  title            text not null,
  note             text,
  channel_hint     channel_kind,                       -- the AI/human suggested channel for the next step
  due_at           timestamptz,
  status           text not null default 'open',       -- open | done | cancelled
  created_by       uuid references app_user(id) on delete set null,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);
create index if not exists follow_up_due_idx on follow_up (tenant_id, status, due_at);
create index if not exists follow_up_contact_idx on follow_up (contact_id) where status='open';
create index if not exists follow_up_org_idx on follow_up (organization_id) where status='open';

-- ---- outbound delivery receipts (provider-neutral) --------------------------------------------
-- Per-message delivery events from any channel adapter (email/whatsapp/sms/phone). We keep the
-- latest state on message.delivery; this table is the audit-grade event log for cost/observability.
create table if not exists delivery_event (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  message_id        uuid references message(id) on delete cascade,
  channel           channel_kind not null,
  provider          text,
  provider_message_id text,
  state             msg_delivery not null,
  detail            text,
  at                timestamptz not null default now()
);
create index if not exists delivery_event_msg_idx on delivery_event (message_id, at);

-- ---- relationship stage on the organization/contact (§10 — NOT a journey/conversation status) --
alter table organization add column if not exists relationship_stage text; -- LEAD|PROSPECT|ACTIVE|CUSTOMER|PAST_CUSTOMER|PARTNER
alter table contact      add column if not exists relationship_stage text;

-- ---- call/telephony metadata (architecture-ready; adapter mock until a provider is connected) --
create table if not exists call_record (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id),
  conversation_id  uuid references conversation(id) on delete set null,
  contact_id       uuid references contact(id) on delete set null,
  organization_id  uuid references organization(id) on delete set null,
  direction        msg_direction not null,
  provider         text,
  provider_call_id text,
  from_number      text,
  to_number        text,
  status           text not null default 'RINGING',    -- RINGING|ANSWERED|MISSED|COMPLETED|FAILED
  started_at       timestamptz,
  answered_at      timestamptz,
  ended_at         timestamptz,
  duration_seconds integer,
  recording_ref    text,                                -- metadata only; recording is an explicit capability
  transcript_ref   text,
  summary          text,
  created_at       timestamptz not null default now()
);
create index if not exists call_contact_idx on call_record (contact_id, created_at);
