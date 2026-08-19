-- Mijn Maculis — het gesprek. ADDITIVE on 001-008; nothing existing is altered or dropped, so this
-- is safe to run on every boot and safe to apply to the live Communication Layer database.
--
-- WHY THIS EXISTS
--   The customer must be able to talk with Maculis from inside their own environment, about what
--   they are looking at. That is NOT a second messaging system: it is one more channel on the
--   Communication Layer that already exists. Conversation, message, the attention model and
--   relationship_memory stay exactly as they are; this migration only adds the few facts those
--   tables cannot express yet.
--
--   Four things are genuinely new and each is one nullable column, never a parallel store:
--     1. WHICH pattern a conversation is about            conversation.insight_id
--     2. WHO at the customer wrote a message              message.customer_access_id
--     3. WHAT THE CUSTOMER has read                       conversation.customer_read_at
--     4. WHETHER a reply has been announced by e-mail     message.notified_at
--
--   The hard privacy boundary is unchanged and stays where it was: sharing='SHARED' in SQL. A
--   conversation may POINT at a PRIVATE insight without opening it. The pointer carries the
--   subject of the question, never the private reading underneath, because the internal read
--   path (sharing.mjs) filters on sharing and does not follow this pointer.

-- ---- the channel -------------------------------------------------------------------------------
-- Deliberately its own value and not 'WEB': a message from the customer's own authenticated
-- environment has a different origin, a different tone and different consent consequences than an
-- anonymous website form.
alter type channel_kind add value if not exists 'MIJN_MACULIS';

-- ---- who at the customer, and about what --------------------------------------------------------
-- A customer writes as a customer_access grant, not as an app_user. That is provenance, so it is a
-- column and not something buried in transport_meta.
alter table message add column if not exists customer_access_id uuid references customer_access(id) on delete set null;

alter table conversation add column if not exists insight_id uuid references customer_insight(id) on delete set null;
alter table conversation add column if not exists customer_access_id uuid references customer_access(id) on delete set null;

-- The customer's own read watermark. conversation.last_read_at is, by the attention model, STRICTLY
-- a signal that a human AT MACULIS opened the thread. Writing the customer's reading into it would
-- silently make work look done that nobody at Maculis has seen, so the customer gets their own.
alter table conversation add column if not exists customer_read_at timestamptz;

create index if not exists conversation_insight_idx on conversation (insight_id) where deleted_at is null;
-- Channel is a COLUMN here and not a partial predicate: a brand-new enum value may not be used in
-- the same transaction that adds it, and this whole migration is one transaction.
create index if not exists conversation_mijn_idx
  on conversation (tenant_id, organization_id, channel, last_message_at desc)
  where deleted_at is null;

-- ---- announcing a reply by e-mail ---------------------------------------------------------------
-- Stamped on the MIJN_MACULIS message that was announced, so a reply is announced at most once and
-- so it is afterwards verifiable that the announcement carried no content.
alter table message add column if not exists notified_at timestamptz;

-- ---- the portal identity, tied into the one relational model ------------------------------------
-- Until now a customer_access grant stood on its own: a token, an organization, a label. That is
-- enough to look, but not enough to be written to: an e-mail announcement has no recipient and the
-- consent gate has no subject. Linking the grant to the contact it belongs to gives both, and it
-- keeps Mijn Maculis on the SAME relational reality as the Cockpit instead of beside it.
-- Nullable and fail-closed: no contact means no announcement, never a guess.
alter table customer_access add column if not exists contact_id uuid references contact(id) on delete set null;

-- ---- the recognition answer, durable -------------------------------------------------------------
-- "Herken je dit?" was until now bound to one visit. A correction on a pattern would then be
-- recorded more durably than the answer it belongs to, which is the wrong way round. The answer is
-- the customer's, so it lives with the insight and follows the SAME sharing boundary: Maculis only
-- gets to see it once the insight is SHARED (sharing.mjs decides that, not this table).
alter table customer_insight add column if not exists recognition text;               -- ja | deels | nee
alter table customer_insight add column if not exists recognition_note text;          -- optional explanation, in the customer's own words
alter table customer_insight add column if not exists recognition_at timestamptz;
alter table customer_insight add column if not exists recognition_by uuid references customer_access(id) on delete set null;

-- Append-only trail of the answers, so a changed mind is visible and never overwrites history (§18).
create table if not exists insight_recognition_event (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  answer          text,                            -- ja | deels | nee | null (withdrawn)
  note            text,
  actor_access_id uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now()
);
create index if not exists insight_recognition_event_insight_idx on insight_recognition_event (insight_id, at);
