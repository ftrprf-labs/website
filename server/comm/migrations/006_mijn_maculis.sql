-- Mijn Maculis — customer environment: insights, the sharing boundary, customer access, and
-- collaboration. ADDITIVE on 001-005; nothing existing is altered or dropped, so this is safe to
-- run on every boot and safe to apply to the live Communication Layer database.
--
-- WHY THESE TABLES EXIST
--   Mijn Maculis is the customer-facing perspective on the same reality the internal Cockpit sees,
--   with a HARD, server-enforced boundary between what is PRIVATE (customer only), SHARED (the
--   customer deliberately gave Maculis) and AGGREGATED (a pattern without sensitive source detail).
--   The boundary is architecture, never a prompt instruction: a PRIVATE insight can never be read
--   through the internal side because the internal read is filtered to sharing='SHARED' in SQL.
--
--   There is no competing privacy model to reuse for this: is_privacy (privacy mailbox) and
--   communication_preference (channel consent) answer different questions. relationship_memory is
--   internal-only. So the customer insight + its sharing state is a new, central primitive.
--
--   Epistemic integrity is preserved from the Lens: an insight carries a `stance` (reveal /
--   non_reveal / tension / consistency / unknown) and an internal-only `provenance` jsonb, so a mere
--   indication is never presented to the customer as a hard conclusion and the internal trail is
--   never lost.

-- ---- customer access: an opaque, org-scoped grant into Mijn Maculis ---------------------------
-- Reuses the existing opaque-token idea (like the tester ?p= link): no PII in the token, the raw
-- token is NEVER stored (only its SHA-256), and every grant is bound to exactly one tenant + one
-- organization. This is how tenant/organization isolation is enforced from the door inward.
create table if not exists customer_access (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  token_hash      text not null unique,            -- sha256(token); the raw token is never at rest
  label           text,                            -- display name of the customer user (e.g. "Sanne de Vries")
  role            text default 'Klantadmin',
  is_preview      boolean not null default false,  -- preview/fixture grant, never a production customer
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz,
  revoked_at      timestamptz
);
create index if not exists customer_access_org_idx on customer_access (tenant_id, organization_id) where revoked_at is null;

-- ---- customer insight: the shareable unit of "wat zien we over onze organisatie?" -------------
create table if not exists customer_insight (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  title           text not null,
  -- Epistemic kind, preserved from the Lens. A non_reveal ("we see NO difference here") is a
  -- first-class, valuable outcome, not "nothing found".
  stance          text not null default 'reveal',  -- reveal | non_reveal | tension | consistency | unknown
  -- Human-facing narrative (the four questions the customer detail view answers).
  observation     text,                            -- "Wat zien we?"
  meaning         text,                            -- "Wat betekent dit mogelijk?"
  basis           text,                            -- "Waar baseren we dit op?" (human wording, not raw evidence)
  not_yet_known   text,                            -- "Wat weten we nog niet?"
  -- The sharing boundary. PRIVATE is the default: an insight is the customer's until they choose.
  sharing         text not null default 'PRIVATE', -- PRIVATE | SHARED | AGGREGATED
  source          text not null default 'lens',    -- provenance source (lens today)
  -- Internal-only structured provenance (evidence kind, confidence, source refs). NEVER returned to
  -- the customer and NEVER placed in model context; kept so an insight stays traceable internally.
  provenance      jsonb not null default '{}'::jsonb,
  -- Temporal life of an insight (§8): it can be confirmed, deepen, be nuanced, or fade.
  status          text not null default 'new',     -- new | confirmed | evolving | deepened | nuanced | archived
  is_preview      boolean not null default false,  -- preview/fixture insight, never real production data
  attention       boolean not null default false,  -- surfaced on Overzicht as "dit vraagt nu aandacht"
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  shared_at       timestamptz,
  shared_by       text,                            -- customer access label at the moment of sharing
  revoked_at      timestamptz                      -- when SHARED was withdrawn back to PRIVATE
);
create index if not exists customer_insight_org_idx
  on customer_insight (tenant_id, organization_id)
  where status <> 'archived';
-- The internal read path is a filtered scan on sharing='SHARED'; index it so the Cockpit stays fast.
create index if not exists customer_insight_shared_idx
  on customer_insight (tenant_id, organization_id)
  where sharing = 'SHARED' and status <> 'archived';

-- ---- share audit: append-only record of every boundary crossing (§18) --------------------------
create table if not exists insight_share_event (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  action          text not null,                   -- shared | revoked
  from_sharing    text,
  to_sharing      text,
  actor_label     text,                            -- who at the customer performed it
  actor_access_id uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now()
);
create index if not exists insight_share_event_insight_idx on insight_share_event (insight_id, at);
create index if not exists insight_share_event_org_idx on insight_share_event (tenant_id, organization_id, at);

-- ---- collaboration: what we are doing together (Samenwerking) ----------------------------------
-- The customer-facing view of the relationship: confirmed agreements, next steps, ongoing research.
-- NOT the internal task list — only items explicitly marked customer_visible appear. A confirmed
-- agreement from communication becomes visible here through a deliberate promotion, never an
-- automatic copy of an internal note or memory.
create table if not exists collaboration_item (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  kind            text not null default 'agreement', -- agreement | next_step | research | decision | shared_note
  title           text not null,
  detail          text,
  status          text not null default 'active',    -- active | scheduled | in_progress | done | cancelled
  due_at          timestamptz,                        -- for "eerstvolgende afspraak"
  customer_visible boolean not null default true,     -- only customer-relevant items are exposed (§13)
  source_ref      jsonb not null default '{}'::jsonb, -- provenance back to memory/conversation
  is_preview      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists collaboration_item_org_idx
  on collaboration_item (tenant_id, organization_id)
  where customer_visible = true and status <> 'cancelled';
