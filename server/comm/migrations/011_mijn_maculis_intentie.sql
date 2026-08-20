-- Mijn Maculis — van herkennen naar een vervolgstap. ADDITIVE on 001-010; niets bestaands wordt
-- aangeraakt, dus dit is veilig bij elke boot en veilig op de live database.
--
-- WAAROM DIT BESTAAT
--
-- Herkenning zegt of een inzicht wáár is. Het zegt niets over of iemand er iets mee wil. Dat is de
-- enige informatie in deze hele reis die niet uit context af te leiden is, en dus de enige die het
-- waard is om te vragen. Eén vraag, drie antwoorden, en bij het derde antwoord neemt Maculis het
-- voorbereidende werk over.
--
-- DRIE SIGNALEN DIE NOOIT DOOR ELKAAR MOGEN LOPEN
--
--   herkenning  insight_recognition.answer   Is dit waar?              persoonlijk
--   intentie    insight_intent.intent        Wil je hier iets mee?     persoonlijk
--   vrijgave    customer_insight.sharing     Mag Maculis dit gebruiken? organisatie
--
-- Geen van de drie is uit een ander af te leiden en geen van de drie verandert een ander. Het
-- scherpst: "Samen met Maculis" op een niet gedeeld inzicht deelt dat inzicht NIET. De
-- momentopname in insight_context_share reist mee zodat Maculis weet waarover het gaat; `sharing`
-- blijft staan en sharedContextForOrg leest hier niets van.
--
-- HET DOSSIER IS ORGANISATIEBREED, DE SIGNALEN ZIJN PERSOONLIJK
--
-- Vragen twee mensen hetzelfde, dan is dat één vraag en geen twee. Er komt dus één dossier per
-- inzicht, met de aanvragers eraan gekoppeld. Twee dossiers zouden twee medewerkers hetzelfde laten
-- uitzoeken, en dat is precies het werk dat dit model weghaalt.
--
-- Maar daarmee raakt een organisatiebreed object gevoed door persoonlijke signalen. Daarom draagt
-- het dossier NOOIT het herkenningsantwoord en NOOIT de persoonlijke toelichting: alleen wát iemand
-- deed (hij vroeg dit, op deze datum). De belofte "Je antwoord blijft bij jou" blijft daarmee
-- letterlijk waar. En het dossier heeft geen klantzijdig leespad, dus het kan niet naar een collega
-- lekken. Zie ADR-0002.

-- ---- 1. de intentie, per persoon ---------------------------------------------------------------
-- weten = goed om te weten, zelf = wij pakken dit zelf op, samen = help ons de vervolgstap
-- organiseren. Dat laatste betekent uitdrukkelijk niet dat Maculis de uitvoerder wordt
-- (architectuurprincipe 22).
create table if not exists insight_intent (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  contact_id      uuid not null references contact(id) on delete cascade,
  intent          text not null,
  access_id       uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now(),
  unique (insight_id, contact_id)
);
do $$ begin
  alter table insight_intent add constraint insight_intent_chk check (intent in ('weten','zelf','samen'));
exception when duplicate_object then null; end $$;
create index if not exists insight_intent_contact_idx on insight_intent (tenant_id, organization_id, contact_id);

-- Append-only: van gedachten veranderen overschrijft niets stil. `intent` null betekent ingetrokken.
create table if not exists insight_intent_event (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  contact_id      uuid references contact(id) on delete set null,
  intent          text,
  actor_access_id uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now()
);
create index if not exists insight_intent_event_idx on insight_intent_event (insight_id, at);

-- ---- 2. het hulpdossier, per inzicht ------------------------------------------------------------
-- Een inzicht hoort bij precies één organisatie, dus uniek op insight_id ís uniek per (inzicht,
-- organisatie). organization_id staat er voor scoping en voor de index.
--
-- Twee assen, bewust gescheiden. `status` gaat over de vraag van de klant. `voorbereiding` gaat over
-- de kwaliteit van wat Maculis ervan kon maken. Een mislukte voorbereiding mag een echte klantvraag
-- nooit onzichtbaar maken.
create table if not exists help_dossier (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenant(id),
  organization_id   uuid not null references organization(id) on delete cascade,
  insight_id        uuid not null references customer_insight(id) on delete cascade unique,
  status            text not null default 'voorbereiden',
  voorbereiding     text not null default 'geen',
  -- Momentopname van de aanleiding, zodat een latere lezing de vraag niet stil van betekenis
  -- verandert. Uitsluitend organisatiebrede feiten over het inzicht; niets persoonlijks.
  titel             text not null,
  houding           text,
  bewijs_aantal     int  not null default 0,
  gedeeld           boolean not null default false,   -- stond sharing op SHARED toen dit werd gevraagd
  samenvatting      text,
  voorgestelde_stap text,
  zekerheid         text,
  model             text,
  follow_up_id      uuid references follow_up(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  opgepakt_at       timestamptz
);
do $$ begin
  alter table help_dossier add constraint help_dossier_status_chk
    check (status in ('voorbereiden','klaar','opgepakt','afgerond','vervallen'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table help_dossier add constraint help_dossier_voorbereiding_chk
    check (voorbereiding in ('geen','volledig','deels','mislukt'));
exception when duplicate_object then null; end $$;
create index if not exists help_dossier_org_idx on help_dossier (tenant_id, organization_id, status);

-- ---- 3. wie het vroeg ----------------------------------------------------------------------------
-- Wát iemand deed, en wanneer. NIET wat hij antwoordde op "Herken je dit?" en niet zijn toelichting.
-- Dat is de hele reden dat deze tabel bestaat naast insight_recognition en er niet naar verwijst.
create table if not exists help_dossier_actor (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  dossier_id      uuid not null references help_dossier(id) on delete cascade,
  contact_id      uuid not null references contact(id) on delete cascade,
  conversation_id uuid references conversation(id) on delete set null,
  access_id       uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now(),
  unique (dossier_id, contact_id)
);
create index if not exists help_dossier_actor_idx on help_dossier_actor (dossier_id, at);
