-- Van de Lens naar Mijn Maculis. ADDITIVE op 001-011; niets bestaands wordt aangeraakt of
-- verwijderd, dus dit is veilig bij elke boot en veilig op de live database.
--
-- WAAROM DIT BESTAAT
--
-- Mijn Maculis bestond, maar er was geen weg naar binnen. Een ondernemer rondde de Lens af, zei dat
-- het bewaard mocht worden, en er gebeurde niets. Dit legt de vier dingen vast die die weg nodig
-- heeft, en geen vijfde. Zie ADR-0003 en ADR-0004.
--
-- DE DRIE ASSEN (PROD-RELATIONSHIP-MODEL §3)
--
-- Elke uitspraak beantwoordt drie losse vragen, en ze mogen nooit door elkaar lopen:
--
--   gebied       waar gaat dit over          precies één, uit een gedeelde woordenschat
--   perspectief  door welke bril kijken we   precies één, uit een gedeelde woordenschat
--   bron         waar komt dit vandaan       precies één (kolom `source`, bestond al)
--
-- Gebied en perspectief zijn woordenschat en géén klantobject: de namen zijn voor elke organisatie
-- dezelfde. Daarom zijn het kolommen op het inzicht en geen tabellen. Een tabel zou suggereren dat
-- een organisatie eigen gebieden heeft, en dat is precies het verzinnen dat het model verbiedt.
--
-- EEN GEBIED ORDENT, EEN UITSPRAAK BEWEERT
--
-- Daarom hangt hier niets aan een gebied. Geen bron, geen oordeel, geen reflectie, geen actie. Een
-- gebied kan niet onwaar zijn, en herkenning heeft iets nodig dat onwaar kan zijn.

-- ---- 1. de twee assen die nog ontbraken -------------------------------------------------------
-- Nullable en zonder default: bestaande inzichten (previewfixtures) houden hun huidige betekenis en
-- worden hier niet stil van een gebied voorzien. Indelen is interpretatie en dat doet een mens.
do $$ begin
  alter table customer_insight add column area text;
exception when duplicate_column then null; end $$;
do $$ begin
  alter table customer_insight add column perspective text;
exception when duplicate_column then null; end $$;

-- ---- 2. herkomst van een reflectie ------------------------------------------------------------
-- Vanaf nu bevat insight_recognition twee soorten met verschillende regels, en het verschil is de
-- privacygrens zelf:
--
--   lens  gegeven tijdens de Lens. Maculis had dit antwoord aantoonbaar al; het is onderzoeksdata.
--   mijn  gegeven binnen Mijn Maculis. Van de persoon, en het verlaat de persoonlijke laag nooit.
--
-- Zonder deze markering leest een latere functie de tabel, ziet reflecties, en trekt de verkeerde
-- conclusie over wat gedeeld mag worden. De default is `mijn`, want fail-closed: onbekend telt als
-- persoonlijk en nooit als iets wat Maculis al had.
do $$ begin
  alter table insight_recognition add column origin text not null default 'mijn';
exception when duplicate_column then null; end $$;
do $$ begin
  alter table insight_recognition add constraint insight_recognition_origin_chk
    check (origin in ('lens','mijn'));
exception when duplicate_object then null; end $$;

-- ---- 3. de kamer, per organisatie -------------------------------------------------------------
-- De levensloop van de Lens (CONCEPT → VERSTUURD → GEOPEND → AFGEROND) gaat over een uitnodiging
-- voor een ervaring en eindigt. Deze begint waar die eindigt en gaat over iets anders. Ze mogen
-- daarom nooit één kolom worden.
--
--   klaargezet         de kamer is ingericht, er is niets verstuurd
--   wacht_op_contact   bewaren mag, benaderen niet. Er gaat niets uit
--   uitgenodigd        een mens heeft de uitnodiging verstuurd
--   actief             de ondernemer is binnen geweest
--   ingetrokken        de toegang is beëindigd
--
-- Monotoon vooruit, met `ingetrokken` als enige uitzondering. Een verlopen uitnodiging zet een kamer
-- NIET terug: dat zou de geschiedenis wissen en de toegang lijkt weg te halen die er nog is.
create table if not exists mijn_room (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade unique,
  status          text not null default 'klaargezet',
  -- De mens voor wie de kamer is klaargezet. Zonder contact geen ontvanger en geen consentsubject.
  contact_id      uuid references contact(id) on delete set null,
  -- Waar deze kamer vandaan komt. In V1 altijd de Lens; het veld bestaat zodat een tweede ingang
  -- later een waarde erbij is en geen verbouwing (ADR-0004).
  entrance        text not null default 'lens',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  invited_at      timestamptz,
  invited_by      uuid references app_user(id) on delete set null,
  activated_at    timestamptz,
  declined_at     timestamptz,
  decline_reason  text,
  revoked_at      timestamptz
);
do $$ begin
  alter table mijn_room add constraint mijn_room_status_chk
    check (status in ('klaargezet','wacht_op_contact','uitgenodigd','actief','ingetrokken'));
exception when duplicate_object then null; end $$;
create index if not exists mijn_room_status_idx on mijn_room (tenant_id, status);
