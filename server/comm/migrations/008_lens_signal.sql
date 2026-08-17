-- Communication Layer — LENS SIGNAL (the Niveau-C seam to the client's First Five / Lens).
-- Forward-only, non-destructive, additive on 001-007. Safe to run on every boot.
--
-- The Lens is the CLIENT's experience. Reveal/non-reveal, answers, free reflections and personal
-- interpretation are PRIVATE and live in the Lens (first-five.jsonl), never here. The cockpit only
-- ever holds a RELATIONAL HOOFDLIJN (Niveau C / SUMMARY): the content-free fact that a relation went
-- through the Lens, and later — only with an explicit, versioned sharing consent that does not yet
-- exist — a client-shared insight (SHARED). Raw private content is never stored in this database.
--
-- The boundary is enforced by the SCHEMA, not just by code: a CHECK constraint makes it structurally
-- impossible to store a PRIVATE row here. PRIVATE stays a defined level (so code can reason about it
-- and deny access), but it can never cross into the cockpit's relational reality.
--
-- One reality, no second dossier: this references the same contact rows the cockpit already reads.

create table if not exists lens_signal (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenant(id) on delete cascade,
  contact_id       uuid references contact(id) on delete cascade,

  source           text not null default 'LENS',        -- provenance: always the Lens here
  privacy_status   text not null,                        -- PRIVATE | SHARED | SUMMARY (PRIVATE is never stored)
  milestone        text,                                 -- STARTED | COMPLETED (content-free milestone)
  occurred_at      timestamptz,                          -- when the client went through the Lens
  consent_version  text,                                 -- for SHARED only: which sharing-consent authorised it
  source_ref       jsonb not null default '{}'::jsonb,   -- provenance ref (token_ref, session_ref) — NEVER content
  provenance       jsonb not null default '{}'::jsonb,   -- { source:'LENS', rule, derived_at }
  created_at       timestamptz not null default now(),

  constraint lens_signal_privacy_ck check (privacy_status in ('PRIVATE', 'SHARED', 'SUMMARY')),
  -- Structural guarantee: PRIVATE Lens content can NEVER be written into the cockpit database.
  constraint lens_signal_no_private_ck check (privacy_status <> 'PRIVATE')
);

-- One signal per relation per milestone, so a re-sync updates in place instead of duplicating.
create unique index if not exists lens_signal_uq
  on lens_signal (tenant_id, contact_id, milestone)
  where contact_id is not null and milestone is not null;

create index if not exists lens_signal_contact_idx on lens_signal (contact_id);
