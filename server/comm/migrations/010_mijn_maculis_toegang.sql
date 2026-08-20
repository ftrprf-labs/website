-- Mijn Maculis — toegang per persoon, en de twee privacyvragen uit elkaar. ADDITIVE on 001-009;
-- nothing existing is altered or dropped, so this is safe to run on every boot and safe to apply to
-- the live Communication Layer database.
--
-- WHY THIS EXISTS
--
--   1. TOEGANG. Tot nu toe bestond klanttoegang alleen als previewfixture: `createAccess` werd
--      uitsluitend door de seeder aangeroepen, het token verliep nooit en het was in feite een
--      eeuwig bearer-token in een URL. Hier komen de twee ontbrekende dingen bij: een uitnodiging
--      die eenmalig is en verloopt, en een inloglink voor terugkeer. Beide bewaren alleen de hash.
--
--   2. TWEE PRIVACYVRAGEN DIE GEEN ÉÉN VELD MOGEN ZIJN. Mijn Maculis kent twee vragen die er tot nu
--      toe onbedoeld als één uitzagen:
--
--        A. ZICHTBAARHEID BINNEN DE KLANT. Wie binnen dezelfde organisatie mag dit inzicht zien?
--           Dat leeft vanaf nu in `customer_insight.audience`.
--
--        B. DELEN MET MACULIS. Mag Maculis de inhoud zien en ermee werken in de Cockpit?
--           Dat leeft in `customer_insight.sharing`, precies waar het al leefde, en verandert niet.
--
--      Zolang er één gebruiker per organisatie was, viel dat verschil niet op. Met twee gebruikers
--      valt het meteen om: "Alleen voor jou" ging over Maculis, niet over de collega. A en B mogen
--      daarom nooit hetzelfde veld en nooit dezelfde autorisatiebeslissing worden.
--
--      In V1 heeft A precies één waarde, ORGANISATIE. Dat is bewust een waarde en geen afwezigheid
--      van een controle: er staat iets om tegen te programmeren en iets om te testen, en een latere
--      beleidskeuze is dan een waarde erbij in plaats van een verbouwing.
--
--   3. DE PERSOONLIJKE LAAG IS VAN DE PERSOON. Herkenning stond als één rij op het inzicht, dus de
--      tweede gebruiker overschreef de eerste. Vanaf nu per (inzicht, persoon).
--
--   4. GESPREKSCONTEXT IS EEN EIGEN HANDELING. Praten over een inzicht dat nog niet gedeeld is, mag,
--      maar dan moet zichtbaar en aantoonbaar zijn wat Maculis daarvoor meekrijgt. Dat is een eigen,
--      append-only vastlegging en uitdrukkelijk NIET hetzelfde als het inzicht delen.

-- ---- 1. toegang: de uitnodiging ----------------------------------------------------------------
-- Eenmalig, tijdgebonden, en gebonden aan exact één tenant + organisatie + contact. De rauwe waarde
-- wordt nooit bewaard, alleen de SHA-256, precies zoals bij customer_access.
create table if not exists customer_invite (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenant(id),
  organization_id    uuid not null references organization(id) on delete cascade,
  contact_id         uuid not null references contact(id) on delete cascade,
  token_hash         text not null unique,          -- sha256(token); de rauwe waarde staat nergens
  expires_at         timestamptz not null,
  created_by_user    uuid references app_user(id) on delete set null,  -- de mens bij Maculis
  created_at         timestamptz not null default now(),
  accepted_at        timestamptz,                    -- eenmalig: gezet betekent verbruikt
  accepted_access_id uuid references customer_access(id) on delete set null,
  revoked_at         timestamptz
);
create index if not exists customer_invite_contact_idx on customer_invite (tenant_id, contact_id)
  where accepted_at is null and revoked_at is null;

-- ---- 2. toegang: de inloglink -------------------------------------------------------------------
-- Terugkeren zonder wachtwoord. Kort geldig en eenmalig; `used_at` is de enige poort. `ip_ref` is
-- een grove verwijzing voor misbruikonderzoek, nooit een volledig adres.
create table if not exists customer_login_token (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenant(id),
  contact_id   uuid not null references contact(id) on delete cascade,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  ip_ref       text,
  created_at   timestamptz not null default now()
);
create index if not exists customer_login_token_contact_idx on customer_login_token (contact_id, created_at);

-- ---- 3. toegang: waar een grant vandaan komt ----------------------------------------------------
alter table customer_access add column if not exists activated_at timestamptz;
alter table customer_access add column if not exists invite_id uuid references customer_invite(id) on delete set null;

-- ---- 4. dimensie A: zichtbaarheid binnen de klantorganisatie ------------------------------------
-- Wie binnen de klant dit inzicht mag zien. NIET of Maculis het mag zien; daar gaat `sharing` over.
-- V1 kent één waarde. De check staat er zodat een tweede waarde een bewuste migratie vraagt en niet
-- per ongeluk ontstaat.
alter table customer_insight add column if not exists audience text not null default 'ORGANISATIE';
do $$ begin
  alter table customer_insight add constraint customer_insight_audience_chk check (audience in ('ORGANISATIE'));
exception when duplicate_object then null; end $$;

-- ---- 5. de persoonlijke laag: herkenning per persoon --------------------------------------------
-- "Herken je dit?" is een vraag aan een mens, dus het antwoord hoort bij die mens. Eén rij per
-- (inzicht, contact). Het antwoord van Piet overschrijft dat van Sanne niet en is voor haar niet
-- zichtbaar. Deze tabel hoort UITSLUITEND tot het klantzijdige leespad: geen enkele query onder
-- server/comm/ mag hem noemen, en dat wordt in de tests afgedwongen.
create table if not exists insight_recognition (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  contact_id      uuid not null references contact(id) on delete cascade,
  answer          text,                            -- ja | deels | nee
  note            text,
  access_id       uuid references customer_access(id) on delete set null,
  at              timestamptz not null default now(),
  unique (insight_id, contact_id)
);
create index if not exists insight_recognition_contact_idx on insight_recognition (tenant_id, organization_id, contact_id);

-- Backfill: neem over wat er staat, maar alleen waar het aan een persoon te hangen is. Een antwoord
-- zonder herleidbare persoon verdwijnt niet uit customer_insight; het komt alleen niet mee naar de
-- persoonlijke laag, want daar zou het aan de verkeerde mens hangen.
insert into insight_recognition (tenant_id, organization_id, insight_id, contact_id, answer, note, access_id, at)
select ci.tenant_id, ci.organization_id, ci.id, ca.contact_id, ci.recognition, ci.recognition_note,
       ci.recognition_by, coalesce(ci.recognition_at, now())
  from customer_insight ci
  join customer_access ca on ca.id = ci.recognition_by
 where ci.recognition is not null and ca.contact_id is not null
on conflict (insight_id, contact_id) do nothing;

-- ---- 6. gesprekscontext als eigen handeling -----------------------------------------------------
-- Praten over een inzicht dat nog niet gedeeld is, mag. Maar dan moet aantoonbaar zijn WAT Maculis
-- daarvoor meekrijgt, en dat het iets anders is dan het inzicht delen.
--
-- Wat hier landt is een MOMENTOPNAME van precies zoveel als nodig is om de vraag te begrijpen: de
-- uitspraak zoals Maculis die zelf opschreef, en de houding. Een momentopname en geen verwijzing,
-- zodat een latere versie van het inzicht met terugwerkende kracht niets verbreedt.
--
-- Drie dingen die deze tabel NIET is:
--   * geen deelhandeling: `customer_insight.sharing` blijft onaangeraakt;
--   * geen onderdeel van de gedeelde organisatiewerkelijkheid: `sharedContextForOrg` leest hem niet
--     en mag hem niet lezen. Hij is per gesprek opvraagbaar en verder niets;
--   * geen doorgeefluik voor de persoonlijke laag: herkenning en toelichting komen er nooit in.
create table if not exists insight_context_share (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id),
  organization_id uuid not null references organization(id) on delete cascade,
  insight_id      uuid not null references customer_insight(id) on delete cascade,
  conversation_id uuid not null references conversation(id) on delete cascade,
  contact_id      uuid references contact(id) on delete set null,
  access_id       uuid references customer_access(id) on delete set null,
  title           text not null,                   -- de uitspraak zoals Maculis die schreef
  stance          text,                            -- de houding, zodat de toon klopt
  at              timestamptz not null default now()
);
create index if not exists insight_context_share_conv_idx on insight_context_share (conversation_id, at);
create index if not exists insight_context_share_insight_idx on insight_context_share (insight_id, at);

-- ---- 7. het gesprek is van de persoon ------------------------------------------------------------
-- De kolom bestaat al sinds 001; alleen het pad ernaartoe ontbrak.
create index if not exists conversation_customer_contact_idx
  on conversation (tenant_id, organization_id, contact_id)
  where deleted_at is null;
