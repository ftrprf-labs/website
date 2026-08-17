# Mijn Maculis Slice A — inzichtontwikkeling door de tijd (functioneel + technisch ontwerp)

Status: ONTWERP ter besluitvorming. Nog niets bouwen. Geen productie, geen migraties, geen wijziging
aan V1. Dit document toetst de fundamentele modelkeuze, werkt het domein- en UX-model uit, en eindigt
met acceptatiecriteria en de kleinste veilige bouwvolgorde. Bouwen pas na akkoord.

Doel (eigenaar): een inzicht is geen statisch kaartje. Mijn Maculis moet kunnen laten zien:
"dit zagen we toen → dit zagen we later opnieuw of anders → dit weten we inmiddels beter → dit heeft
zich ontwikkeld → dit betekent het nu", zonder historische waarheid te overschrijven.

Geen algemene AI-memory. Herkomst, epistemische status, autorisatie en menselijke controle blijven
zichtbaar en controleerbaar. Het aan elkaar knopen van waarnemingen is conservatief en, bij twijfel,
door een mens bevestigd.

---

## 0. De fundamentele modelkeuze (getoetst)

Vraag: is een inzicht een individueel Lens-resultaat, of een duurzame entiteit waaronder meerdere
waarnemingen door de tijd worden verzameld?

Aanbeveling: de duurzame entiteit. Dit sluit aan op de bestaande architectuur en op de eigenaarsvoorkeur,
maar niet blind. De onderbouwing en de consequenties:

- Het huidige V1-`customer_insight` is feitelijk al een op zichzelf staand record, niet een
  Lens-run-record. Het draagt een `status` met tijdswoorden (new, confirmed, evolving, deepened,
  nuanced) maar heeft geen historie en overschrijft zijn inhoud bij een update. Het is dus een
  "duurzaam-bedoeld maar geheugenloos" record. Slice A geeft dat record echt geheugen.
- Het individuele-Lens-resultaatmodel (elke Lens-run maakt nieuwe inzichtkaarten) kan per definitie
  geen ontwikkeling tonen: de klant krijgt een stapel losse, verwante kaarten, zonder continuïteit.
  Dat botst met "Mijn Maculis moet leven" en met de gevraagde ontwikkelingslijn. Afgewezen.
- De duurzame entiteit lost dit op: een inzicht heeft een stabiele identiteit, waarnemingen hechten
  zich er over tijd aan, en de mensgerichte lezing wordt geversioneerd. Ontwikkeling wordt zichtbaar
  en toestemming kan aan een specifieke versie worden gebonden (cruciaal voor privacy, zie §5).

Consequenties van deze keuze (eerlijk benoemd):

1. Er ontstaat een identiteits-/koppelingsprobleem: hoort een nieuwe waarneming bij een bestaand
   inzicht of vormt hij een nieuw inzicht? Dit vraagt een conservatieve, bij twijfel door een mens
   bevestigde resolutie (§3). Dit is precies waar "geen algemene AI-memory" wordt afgedwongen.
2. Historie wordt append-only: meer tabellen, meer opslag, nooit overschrijven (§4).
3. Delen wordt versie-gebonden in plaats van inzicht-gebonden: een rijkere, maar noodzakelijke
   nuance in UI en in de Cockpit-leesfunctie (§5, §6).
4. Samenvoegen en splitsen van inzichten worden echte, menselijk bevestigde operaties (§10).

Al deze consequenties zijn additief en beheersbaar; geen ervan vraagt om herontwerp van V1.

---

## 1. Huidig V1-inzichtmodel en wat er minimaal moet veranderen

Huidig (`customer_insight`, migratie 006): één muteerbaar record met titel, `stance`, de vier
mensvelden (observation, meaning, basis, not_yet_known), `sharing` (PRIVATE/SHARED/AGGREGATED),
`source`, interne `provenance` jsonb, `status`, `attention`, `is_preview`, en share-velden
(shared_at, shared_by, revoked_at). Plus `insight_share_event` (append-only deel-audit).

Minimaal nodig voor Slice A (alles additief, backwards-compatible, geen herontwerp):

- Twee append-only tabellen toevoegen: `insight_observation` (waarnemingen/evidence) en
  `insight_version` (mensgerichte lezingen/ontwikkeling).
- `customer_insight` wordt de duurzame "kop": voeg toe `current_version_id`, `shared_version_id`
  (nullable) en `first_observed_at`. De vier mensvelden op de kop blijven bestaan, maar worden een
  cache van de huidige versie (bron van waarheid = `insight_version`). Zo blijft de bestaande lees-API
  snel en ongewijzigd van vorm.
- `insight_share_event` krijgt een `version_id`: de audit legt vast welke exacte versie is gedeeld.

Backfill (bij de latere migratie, niet nu): per bestaand inzicht één beginversie (uit de huidige vier
velden) en één beginwaarneming (uit `provenance`); `current_version_id` daarnaar; `shared_version_id`
= die versie als `sharing='SHARED'`, anders leeg. Bestaande inzichten blijven exact werken.

---

## 2. Onderscheid: inzicht, waarneming, versie, thema, status

- Inzicht (durable head, `customer_insight`): stabiele identiteit, "het ding dat we volgen". Draagt de
  huidige stance/status en verwijst naar de huidige en de gedeelde versie. Leeft door de tijd.
- Waarneming / evidence (`insight_observation`, append-only): een waarneming uit een bron (een
  Lens-run, later ook mens) op een moment, met interne provenance en de signalen waarop is gematcht.
  Nooit bewerkt. Dit is "dit zagen we toen".
- Versie / ontwikkeling (`insight_version`, append-only): de mensgerichte lezing op een moment: de
  vier velden + stance + een korte "wat is er veranderd". Ontstaat uit één of meer waarnemingen.
  Nooit bewerkt. Dit is "dit dachten we toen / dit begrijpen we nu beter".
- Thema (later, D1 = dwarsdoorsnede): een optionele koppeling die meerdere inzichten rond een
  onderwerp bundelt. Niet nu bouwen; het model sluit het niet uit (een nullable koppeling later).
- Conclusie / status: de huidige epistemische stand van het inzicht (bijvoorbeeld nieuw, bevestigd,
  verdiept, genuanceerd, niet langer geldig, samengevoegd, gesplitst). Afgeleid uit de laatste versie
  plus menselijk oordeel; op de kop bijgehouden.

Vuistregel: waarneming = feit-op-een-moment (evidence), versie = betekenis-op-een-moment (lezing),
inzicht = de duurzame identiteit die beide door de tijd draagt.

---

## 3. Bepalen of een nieuwe waarneming bij een bestaand inzicht hoort of een nieuw inzicht vormt

Dit is een interne, epistemisch bewaakte stap, geen automatische kennisgraaf. Contract (de automatiek
zelf hoort bij Lens-ingest, later; Slice A legt alleen het model en het handmatige/seed-pad vast):

- Een binnenkomende waarneming draagt signalen (onderwerp, signal-keys, bijvoorbeeld
  `['website_positioning','internal_language_variance']`) en herkomst.
- Kandidaten worden binnen dezelfde organisatie gezocht op deterministische overlap (signal-keys,
  onderwerp/titel-gelijkenis). Uitkomst:
  - Sterke overlap boven een drempel: koppelen (`link_confidence='linked'`). Als de waarneming de
    lezing wezenlijk verandert, ontstaat een nieuwe versie.
  - Gedeeltelijk / dubbelzinnig: `link_confidence='suggested'`. De waarneming wordt opgeslagen en er
    wordt een voorgestelde koppeling vastgelegd, maar die wordt geen versie en bereikt de klant niet
    tot een Maculis-mens hem bevestigt. Dit spiegelt de bestaande patronen (identity 'suggested',
    relationship_memory 'proposed').
  - Geen match: een nieuw duurzaam inzicht (met zijn eerste waarneming en eerste versie).
- Koppelingen zijn omkeerbaar (ontkoppelen), met behoud van provenance. Niets wordt vernietigd.

Zo blijft de guardrail hard: automatisch koppelen alleen bij hoge, deterministische zekerheid; bij
twijfel beslist een mens; herkomst en epistemische status blijven zichtbaar; geen zelf-knopende AI.

---

## 4. Ontwikkeling tonen zonder historische waarheid te overschrijven

Append-only als principe:

- `insight_observation` en `insight_version` worden nooit bewerkt of verwijderd; ze worden alleen
  toegevoegd of (zacht) als superseded gemarkeerd met behoud van de oude rij.
- De klant kan de ontwikkelingslijn teruglezen: versie 1 (moment A) blijft exact bewaard naast versie
  2 (moment B). "Wat we op A dachten" en "wat we op B beter zijn gaan begrijpen" staan beide vast.
- De kop (`customer_insight`) toont de huidige lezing (cache van de laatste versie); de historie is de
  bron van waarheid. Een tegenstrijdige of nuancerende waarneming leidt tot een nieuwe versie, nooit
  tot het overschrijven van een bestaande.

Zo is epistemische integriteit structureel: de geschiedenis is onveranderlijk, de huidige stand is
afgeleid.

---

## 5. Gedrag van PRIVATE/SHARED wanneer een inzicht door de tijd verandert

Kernregel (eigenaar): een eerdere toestemming mag niet stilzwijgend betekenen dat toekomstige nieuwe
informatie automatisch wordt gedeeld.

Ontwerp: toestemming is versie-gebonden, niet inzicht-gebonden.

- Delen bindt aan de op dat moment huidige versie: `shared_version_id = current_version_id`.
- Als daarna een nieuwe versie ontstaat (nieuwe waarneming die de lezing verandert), staat die nieuwe
  versie standaard PRIVATE. `shared_version_id` schuift nooit vanzelf op.
- De interne Cockpit-leesfunctie geeft uitsluitend de inhoud van de gedeelde versie terug, nooit een
  nieuwere, ongedeelde versie.
- De klant ziet een rustige melding "er is een nieuwe ontwikkeling die je nog niet hebt gedeeld" en
  kan ervoor kiezen de bijwerking alsnog te delen (dan schuift `shared_version_id` naar de gekozen
  versie, opnieuw geaudit).
- Intrekken maakt het hele inzicht weer PRIVATE (`shared_version_id` leeg) en verwijdert het direct
  uit de interne context, zoals in V1.

Afgeleide toestand: "ongedeelde ontwikkeling" = `sharing='SHARED' AND current_version_id <>
shared_version_id`. Puur afgeleid, nergens dubbel opgeslagen.

---

## 6. Toepassing van de Context Layer

De keten blijft: available context → authorization/privacy → task relevance → model → human control.

- Authorization/privacy draait eerst en is nu versiebewust: een inzicht levert alleen context als
  `sharing='SHARED'`, en dan uitsluitend de inhoud van `shared_version_id`. Een nieuwere, ongedeelde
  versie is voor de autorisatielaag onbereikbaar.
- Task relevance draait daarna en mag uitsluitend weghouden (bijvoorbeeld een gedeeld inzicht dat niet
  relevant is voor het huidige concept niet meenemen). Relevantie kan nooit autoriteit toevoegen en
  kan nooit een ongedeelde of nieuwere versie terughalen. Geautoriseerd is nog niet relevant.
- Transparantie-referenties blijven behouden: waarop een suggestie is gebaseerd blijft herleidbaar
  (welk inzicht, welke gedeelde versie).

Concreet raakt dit één bestaande functie: de interne leesfunctie `sharedContextForOrg` wordt
versiebewust (geeft de gedeelde-versie-inhoud terug in plaats van de kop-inhoud). De vorm van wat de
Context Engine teruggeeft verandert niet.

---

## 7. Aansluiting op Lens-ingest, thema's, terugblik, Samenwerking en Cockpit (nu niet bouwen)

- Lens-ingest (later, aparte workstream): mapt een Lens-run naar waarnemingen, draait de matching
  (§3), en creëert versies. Slice A definieert exact de doelvorm (observation + version), zodat ingest
  later inplugt zonder herontwerp.
- Thema's (later, dwarsdoorsnede): een optionele koppeling op de inzichtkop; de ontwikkelingslijn per
  inzicht is de bouwsteen waarop een thema later "ontwikkeling over meerdere inzichten" kan tonen.
- Terugblik (later): leest de versiegeschiedenis over meerdere inzichten heen ("dit zagen we toen, dit
  is veranderd"). Slice A levert precies de data die een terugblik nodig heeft.
- Samenwerking (later): een ontwikkeling kan, via expliciete promotie, een samenwerkingsonderwerp
  voeden. Niet nu; de koppeling blijft menselijk en expliciet.
- Cockpit (bestaand): consumeert de gedeelde-versie-inhoud via de nu versiebewuste leesfunctie. Geen
  Cockpit-herbouw.

---

## 8. Hoe de klant dit in de rustige V1-interface ziet

Minimale toevoegingen, progressive disclosure, behoud van rust:

- Inzichtdetail: onder de vier huidige velden een rustige, standaard ingeklapte sectie "Hoe dit
  inzicht zich ontwikkelde". Elk item: datum, een korte "wat we toen zagen / wat er veranderde", en de
  stance van toen. De huidige lezing blijft prominent; de historie is één tik weg. Geen tijdlijn-widget
  met grafieken.
- Overzicht: een subtiel label "verdiept" of "bijgewerkt" op een inzicht dat recent is ontwikkeld, als
  onderdeel van het bestaande idee "wat is veranderd". Geen nieuwe blokken.
- Delen: bij een gedeeld inzicht met een nieuwe, ongedeelde ontwikkeling één rustige regel "Er is een
  nieuwe ontwikkeling die je nog niet hebt gedeeld", met de optie om de bijwerking te delen. Geen nag,
  geen dark pattern.
- De rest van de interface blijft ongewijzigd. De bewuste witruimte draagt de ontwikkeling, in plaats
  van gevuld te worden met widgets.

Voorbeeld-copy (schrijfregel gerespecteerd, geen streepjes als stijlmiddel): "Dit zagen we in de eerste
Lens." "Dit zien we nu op meerdere plekken terug." "Hier begrijpen we inmiddels beter waarom."
"Er is een nieuwe ontwikkeling die je nog niet hebt gedeeld."

---

## 9. Uiteindelijk benodigde datamodel- en API-wijzigingen (ontwerp, nog geen migratie)

Illustratieve vormen (geen migratie, geen implementatie):

```
insight_observation  (append-only)
  id, tenant_id, organization_id, insight_id (nullable tot bevestigd gekoppeld),
  source            -- 'lens' | 'human' | ...
  source_ref        jsonb   -- welke Lens-run/gesprek, herleidbaar (intern)
  observed_at       timestamptz
  stance_observed   text
  signal            jsonb   -- signal-keys gebruikt voor matching (intern)
  provenance        jsonb   -- ruwe evidence (intern, nooit naar de klant)
  link_confidence   text    -- 'linked' | 'suggested'
  linked_by         uuid    -- mens die een 'suggested' koppeling bevestigde
  created_at

insight_version      (append-only)
  id, tenant_id, organization_id, insight_id,
  version_no        integer
  stance            text
  observation, meaning, basis, not_yet_known   -- de vier velden bij deze lezing
  change_summary    text    -- "wat is er veranderd t.o.v. de vorige lezing"
  based_on          jsonb   -- observation-ids die deze lezing voedden
  authored_by       text    -- 'ingest' | 'human' | 'ai' (provenance)
  superseded_at     timestamptz  -- zacht opzij, nooit verwijderd
  created_at

customer_insight     (bestaand; additief uitgebreid)
  + current_version_id  uuid
  + shared_version_id   uuid   -- de door de klant geautoriseerde versie (nullable)
  + first_observed_at   timestamptz
  (vier velden blijven als cache van current_version)

insight_share_event  (bestaand; additief uitgebreid)
  + version_id        uuid    -- welke exacte versie werd gedeeld/ingetrokken
```

API-wijzigingen:

- `GET /api/mijn/insights/:id` geeft de huidige lezing plus de ontwikkelingslijn (versies, oud naar
  nieuw) plus de deelstatus inclusief de afgeleide "ongedeelde ontwikkeling".
- Delen bindt aan `current_version_id` en zet `shared_version_id`; de audit krijgt de version_id.
- Intrekken maakt `shared_version_id` leeg.
- Intern: `sharedContextForOrg` wordt versiebewust (gedeelde-versie-inhoud).

Wat exact ongewijzigd blijft: de drie ruimtes en de IA; de opaque-token-toegang en tenant/org-scoping;
de deel-audit als append-only; `collaboration_item`; de vormcontract van de Context Engine; de
frontend-shell; en de harde regel "intern ziet uitsluitend SHARED" (nu versiebewust). Geen bestaande
kolom wordt verwijderd of van betekenis veranderd.

---

## 10. Edge cases

- Tegenstrijdige waarnemingen: geen overschrijving; een nieuwe versie houdt de spanning vast ("eerder
  zagen we X, nu ook Y"); stance kan naar `tension` of `unknown`. Historie blijft intact.
- Inzicht niet langer geldig: status naar 'no_longer_valid' via een nieuwe versie die dat zegt; nooit
  verwijderen. Als het gedeeld was, blijft de laatst gedeelde versie intern staan tot de klant kiest
  de intrekking/herziening te delen of het inzicht in te trekken; de klant ziet een rustige melding.
- Twee inzichten blijken hetzelfde (samenvoegen): expliciete, menselijk bevestigde merge; beide
  histories blijven behouden onder één kop; provenance bewaard. Delen wordt conservatief herbepaald:
  een merge maakt niet automatisch alles gedeeld; nieuwe gecombineerde inhoud vraagt opnieuw toestemming.
- Splitsing: één inzicht blijkt twee; splitsen maakt een nieuwe kop en herverdeelt waarnemingen/versies,
  met behoud van historie; menselijk bevestigd; delen per resulterend inzicht opnieuw beoordeeld.
- Intrekken van delen: SHARED naar PRIVATE, directe verwijdering uit de Cockpit-context (bestaand),
  nu inclusief het leegmaken van `shared_version_id`.
- Nieuwe waarneming op een gedeeld inzicht: deelt niet automatisch (§5); zet de afgeleide "ongedeelde
  ontwikkeling"-toestand.
- Onterechte koppeling: omdat onzekere koppelingen 'suggested' zijn en menselijk bevestigd worden, en
  koppelingen omkeerbaar zijn, kan een foute koppeling ongedaan worden (ontkoppelen; de waarneming
  vormt/hervormt een eigen inzicht). Niet destructief.
- Zwevende waarneming zonder duidelijke ouder: wordt een nieuw inzicht of blijft ongekoppeld in
  afwachting van menselijke triage; nooit geforceerd aangehecht.
- Preview/fixtures: seed levert een paar meer-waarnemingen-inzichten (inclusief een gedeeld-en-daarna-
  ontwikkeld inzicht) om ontwikkeling te tonen; preview-only, zoals nu.

---

## Toetsing aan de Maculis-principes

- Epistemische integriteit: append-only historie, behouden provenance, stance blijft betekenisvol
  (reveal/non-reveal), huidige stand afgeleid.
- Menselijke controle: matching bij twijfel menselijk bevestigd; delen expliciet en versie-gebonden;
  geen automatisch delen van nieuwe informatie.
- Geen algemene AI-memory: conservatieve, deterministische matching; 'suggested' wacht op een mens;
  koppelingen omkeerbaar; herkomst zichtbaar.
- Privacy als architectuur: versie-gebonden toestemming, server-afgedwongen, vóór elke modelcall; de
  interne leesfunctie kan een ongedeelde versie structureel niet zien.
- Harde grens PRIVATE → expliciete toestemming → SHARED: behouden en verscherpt (per versie).

---

## Acceptatiecriteria voor Slice A

1. Een duurzaam inzicht kan meerdere waarnemingen en meerdere versies dragen; het inzichtdetail toont
   de huidige lezing plus een geordende ontwikkelingslijn; oudere versies zijn letterlijk terug te lezen.
2. Een nieuwe versie muteert of verwijdert nooit een eerdere versie of waarneming (append-only,
   afgedwongen en getest).
3. Een gedeeld inzicht dat zich daarna ontwikkelt, lekt de nieuwe versie niet intern:
   `sharedContextForOrg` geeft de gedeelde-versie-inhoud, niet de nieuwere. Test: deel v1, voeg v2 toe,
   intern ziet v1, niet v2.
4. Opnieuw delen schuift `shared_version_id` naar de gekozen versie; de audit legt de version_id vast.
5. Intrekken maakt `shared_version_id` leeg; intern ziet niets.
6. Context Layer: authorization draait vóór relevance; relevance kan uitsluitend weghouden; een
   nieuwere, ongedeelde versie is nooit bereikbaar.
7. Overzicht toont een subtiel "verdiept/bijgewerkt"-signaal voor een recent ontwikkeld inzicht; geen
   nieuwe dashboard-drukte; de rest van de interface ongewijzigd.
8. De afgeleide "ongedeelde ontwikkeling" is zichtbaar voor de klant met een rustige deeloptie; geen
   automatisch delen, geen dark pattern.
9. Tegenstrijdige waarneming levert een tension/unknown-versie die beide vasthoudt, zonder overschrijven.
10. Tenant/org-isolatie en de bestaande grens-/comm-tests blijven groen; de volledige suite blijft groen.

---

## Kleinste veilige bouwvolgorde (na akkoord)

1. Model: `insight_observation` + `insight_version` (append-only) + kop-pointers (current_version_id,
   shared_version_id, first_observed_at) + share_event.version_id. Additief, backwards-compatible.
   Backfill: elk bestaand inzicht krijgt één beginversie + één beginwaarneming.
2. Leespad: inzichtdetail geeft huidige lezing + ontwikkelingslijn; `sharedContextForOrg` wordt
   versiebewust (gedeelde-versie-inhoud).
3. Deel-semantiek: delen bindt aan current_version_id; "ongedeelde ontwikkeling" afgeleid; intrekken
   maakt de pointer leeg; audit met version_id.
4. UX: ingeklapte ontwikkelingslijn op detail; subtiel overzicht-signaal; rustige regel voor
   ongedeelde ontwikkeling.
5. Seed + tests: preview-fixtures met een meer-waarnemingen-inzicht (incl. gedeeld-daarna-ontwikkeld);
   tests voor append-only, versie-gebonden delen, isolatie en regressie.

Elke stap is additief; niets wordt verwijderd; V1 blijft gedurende het hele traject werken. De
matching-automatiek en Lens-ingest horen bij een latere workstream en worden hier alleen als contract
vastgelegd, niet gebouwd.

---

Niets in dit document is gebouwd of gewijzigd. Na jouw akkoord (en eventuele correcties op het
domeinmodel, de versie-gebonden toestemming of de bouwvolgorde) formuleren we de concrete bouwopdracht
voor stap 1.
