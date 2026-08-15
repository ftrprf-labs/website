-- Communication Layer — Attention & read-state (§ ATTENTION COCKPIT).
-- Forward-only, non-destructive, additive on 001-004. Safe to run on every boot.
--
-- READ IS A HUMAN SIGNAL. "Gelezen" is not a webhook, not the AI, not a DB write — it is the
-- moment an AUTHORISED person actually OPENS the conversation. We model that as a conversation-level
-- WATERMARK (last_read_at). Everything above the watermark is unread; opening moves the watermark to
-- now(), which is idempotent (it only ever advances) and therefore safe under Resend retries and
-- double-clicks.
--
-- ATTENTION IS DERIVED, NEVER STORED TWICE. The attention state of a conversation is computed at read
-- time from three durable facts — (last_inbound_at vs last_read_at), whether an AI reply is proposed,
-- and delivery health — so it can never drift out of sync with reality. We denormalise ONE value,
-- last_inbound_at, purely so the cockpit above Testerbeheer can scan tenant-wide in ~1s without a
-- correlated subquery per row.

alter table conversation add column if not exists last_read_at    timestamptz;  -- human read watermark
alter table conversation add column if not exists last_read_by     uuid;        -- app_user.id who read it (audit)
alter table conversation add column if not exists last_inbound_at  timestamptz; -- newest INBOUND message time

-- Backfill last_inbound_at from existing inbound messages (idempotent — only advances).
update conversation c
   set last_inbound_at = sub.mx
  from (select conversation_id, max(created_at) mx
          from message where direction='INBOUND' group by conversation_id) sub
 where sub.conversation_id = c.id
   and (c.last_inbound_at is null or c.last_inbound_at < sub.mx);

-- We deliberately DO NOT backfill last_read_at. There is no record of any human ever having opened
-- these conversations under the new read model, so the honest default is "unread until opened". The
-- derived WAITING_FOR_CUSTOMER / RESOLVED states keep already-handled threads out of the attention
-- buckets even while last_read_at is null, so this does not create a false backlog.

-- Fast tenant-wide unread scan for the cockpit + row indicators (only rows that ever had inbound).
create index if not exists conversation_attention_idx
  on conversation (tenant_id, last_inbound_at)
  where deleted_at is null and last_inbound_at is not null;
