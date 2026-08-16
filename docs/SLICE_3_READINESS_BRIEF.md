# Slice 3 Readiness Brief — Relaties en Gesprekken als werkende overzichten

Datum: 2026-08-16 (nachtvoorbereiding). Status: onderzoek en voorbereiding afgerond, geen
productwijziging, geen deploy. Doel: morgen na Lud zijn live gebruiksronde vrijwel direct kunnen
bouwen zonder opnieuw breed architectuuronderzoek.

Scope die vannacht is gerespecteerd: geen nieuwe productfunctionaliteit, geen redesign van
geaccepteerde UX, geen deploy, geen wijziging aan Testerbeheer, First Five, outbound mail, Phase B of
previewdata, geen infrastructuur, geen brede refactor. Alleen leesonderzoek plus test-only
voorbereidingscode.

Terminologie: "de cockpit" is de bestaande Attention Cockpit boven Testerbeheer (`public/index.html`
sectie `#attention-cockpit`, gerenderd door `renderCockpit()` in `public/app.js`). Er bestaat nog geen
aparte `/api/cockpit/*` naamruimte. De Comm Layer draait onder `/api/comm/*`.

---

## 1. Wat er al bestaat

**Backend (Comm Layer, Postgres, tenant-scoped, privacy gescheiden).**

- Relaties databron: `listRelationships(tenantId, { q, limit })` in `server/comm/relationship.mjs`,
  live op `GET /api/comm/relationships?q=`. Levert per contact: `id`, `first_name`, `last_name`,
  `email`, `mobile`, `relationship_stage`, `org_id`, `org`, `primary_domain`, `last_activity`,
  `open_convs`.
- Gesprekken databron: `inboxConversations(tenantId, { box, filter, limit })` plus
  `inboxSummary(tenantId)` in `server/comm/inbox.mjs`, live op `GET /api/comm/inbox?box=&filter=` (en
  het legacy `GET /api/comm/conversations`). Levert per gesprek: `id`, `subject`, `status`, `channel`,
  `is_privacy`, `contact_id`, `last_message_at`, naam, `org`, `last_dir`, `last_body`,
  `delivery_problem`, `ai_ready` plus afgeleide `attention[]` en `primary`. De summary levert de
  tellers `new`, `waiting_on_us`, `unknown_contact`, `ai_ready`, `delivery_problem`, `follow_up_due`,
  `privacy_open`.
- Relatiedossier (detail): `getRelationship(tenantId, { contactId })` op
  `GET /api/comm/relationship?contact=|invitation=|token=`.
- Gesprekdetail: `GET /api/comm/conversations/<id>` rendert berichten, AI-draft en consent en zet het
  read-watermark (§ Attention Cockpit).
- Attention Cockpit (Slice 1/2): `attentionOverview(tenantId)` op `GET /api/comm/attention`, deep-link
  `/comm.html#conv=<id>`.

Alle reads zijn tenant-scoped (`where tenant_id=$1`) en sluiten privacy uit waar dat hoort. Het schema
(migraties 001 tot 005) draagt alles wat beide overzichten nodig hebben: `contact`, `organization`,
`conversation`, `message`, `ai_draft`, `activity`, plus de afgeleide read/attention-velden.

**Frontend (drie oppervlakken, vanilla JS, CSP-veilig, `data-act` delegatie).**

- Gesprekkenoverzicht bestaat feitelijk al als de centrale Inbox (`public/comm.html` plus
  `public/comm.js`): een werkende gesprekkenlijst met boxen (communicatie of privacy), filters,
  attention-badges, een snippet per rij en deep-link naar het gesprek. Voeding: `GET /api/comm/inbox`.
- Relatiedossier bestaat als de Relationship Workspace (`public/workspace.html` plus
  `public/workspace.js`), tabs Overzicht, Journey, Inzichten, Communicatie, Activiteit. Voeding:
  `GET /api/comm/relationship?contact=`.
- Navigatieconventies: `/workspace.html?contact=|invitation=|token=`, `/comm.html#conv=<uuid>`,
  publieke journey `/?p=<token>`. Terugnavigatie via bestaande headerlinks.
- Herbruikbare bouwstenen: `esc()` (escaping), `.list-item`, `.conv`, `.card`, `chip`, attention-badge
  klassen (`.att.new`, `.att.waiting_on_us`, `.att.ai_ready`, `.att.unknown_contact`,
  `.att.delivery_problem`), en de cockpit-familie in `public/styles.css`.

**Tests (Slice 1/2 baseline).** Volledige suite groen: 66 tests, 55 pass, 11 skip, 0 fail. De
comm-DB-tests skippen netjes zonder `DATABASE_URL` en draaien in CI en productie. Previewarchitectuur,
Testerbeheer en First Five ongemoeid.

---

## 2. Wat exact ontbreekt

- Backend voor een eerste werkende versie: vrijwel niets blokkeert. Beide overzichten hebben al een
  tenant-scoped, privacy-veilige databron en een endpoint. Er is geen nieuwe query of endpoint strikt
  nodig om te starten.
- Relatiesoverzicht is het enige echte gat. Er is nergens in de frontend een globale relatielijst:
  geen nav-item, geen lijstweergave, geen landing. `listRelationships` wordt door geen enkel
  frontend-oppervlak geconsumeerd. Alle bestaande ingangen zijn per-relatie (Workspace vraagt altijd
  één contact). De Testerbeheer-tabel is een andere lijst (uitnodigingen, geen Comm-relaties).
- Gesprekkenoverzicht ontbreekt niet als data of lijst: het bestaat als de Inbox. Wat ontbreekt is
  puur een UX-keuze: blijft het de losse Inbox-pagina, of wordt het een view binnen de cockpit, en hoe
  prominent maken we de ingang.
- Kleine, niet-blokkerende hiaten (optioneel, later, allemaal additief): totaaltelling of paginatie op
  `listRelationships` (nu `limit 50`), sortering op stage of laatste contact, organisatie-niveau
  groepering. Alle drie zijn productkeuzes, geen blocker.
- Bekend detail om te bevestigen: `open_convs` in `listRelationships` sluit privacy-gesprekken niet
  uit (telt open status ongeacht `is_privacy`). Nu vermoedelijk verwaarloosbaar, genoteerd als bewuste
  keuze.

---

## 3. Aanbevolen minimale verticale slice

Kies de kleinste slice die het ene echte gat dicht en de rest hergebruikt.

**A. Relatiesoverzicht (prioriteit, enige ontbrekende oppervlak).**

- Een rustige lijstweergave "Relaties", gevoed door het bestaande `GET /api/comm/relationships`.
  Kolommen die de databron al levert: naam, organisatie, stage, laatste contact (`last_activity`),
  open gesprekken (`open_convs`). Zoekveld op de bestaande `q`.
- Rij klikken opent het bestaande dossier via `/workspace.html?contact=<id>`. Terug via bestaande
  headerlinks.
- Hergebruik `.list-item` of `.conv`, `.card`, `chip`, `esc()` en de `data-act` of `data-id`
  delegatie (CSP-veilig). Geen backendwerk nodig.

**B. Gesprekkenoverzicht (grotendeels klaar).**

- Sluit aan op de bestaande Inbox (`/comm.html`, `GET /api/comm/inbox`). Minimale stap: maak het
  overzicht bereikbaar en herkenbaar vanuit de cockpit en hergebruik de bestaande lijst, filters en
  attention-badges. Geen datawerk.

**Navigatielus op dezelfde state.**

- Overzicht naar dossier: relatierij naar `/workspace.html?contact=<id>`.
- Overzicht naar gesprek: gesprekrij naar `/comm.html#conv=<id>` (bestaand, zet read-watermark).
- Terug: bestaande headerlinks (Testerbeheer, Inbox).
- Alles leest dezelfde tenant-scoped Comm Layer-state. Geen tweede bron, geen kopie.

**Bewust niet in de slice (voor na Lud zijn gebruik).** Of Relaties en Gesprekken losse pagina's of
cockpit-views worden, organisatie-groepering, sortering en paginatie, extra kolommen. Dit zijn UX- en
productkeuzes die beter zijn na zijn live gebruik.

---

## 4. Welke bestanden en endpoints geraakt worden

**Waarschijnlijk te wijzigen bij het bouwen morgen.**

- `public/index.html`: nav-item(s) voor Relaties (en eventueel een ingang naar Gesprekken).
- `public/app.js`: view-render voor het relatiesoverzicht (fetch `/api/comm/relationships`, render
  lijst, `data-act` navigatie). Alternatief bij een losse pagina: nieuwe `public/relations.html` plus
  `public/relations.js`.
- `public/styles.css`: hergebruik bestaande klassen, hooguit kleine toevoegingen.

**Bestaand en herbruikt zonder wijziging (verwacht).**

- `server/comm/relationship.mjs` `listRelationships`, route `GET /api/comm/relationships`.
- `server/comm/inbox.mjs` `inboxConversations` en `inboxSummary`, route `GET /api/comm/inbox`.
- `server/comm/relationship.mjs` `getRelationship`, route `GET /api/comm/relationship`.
- Gesprekdetail `GET /api/comm/conversations/<id>`, deep-link `#conv=`.

**Alleen indien later gekozen (niet in de MVP).** Een kleine additieve query-optie (sort of count) in
`relationship.mjs` plus een parameter op de bestaande route. Additief, geen breaking change.

**Tests.** `tests/helpers/comm-fixtures.mjs` plus de twee overzicht-tests (vannacht toegevoegd)
breiden mee. Een UI-rooktest kan via het bestaande Playwright-patroon.

---

## 5. Acceptatiecriteria

- Relaties: het overzicht toont alle relaties van de tenant, privacy-veilig, met naam, organisatie,
  stage, laatste contact en open gesprekken. Zoeken werkt. Klik opent het juiste dossier. Leeg-staat
  is rustig, in de stijl van de bestaande zero-states.
- Gesprekken: het overzicht toont de gesprekken uit dezelfde Inbox-databron met attention-badges en
  filters. Klik opent het juiste gesprek en zet het read-watermark (bestaand gedrag).
- Provenance: elke rij is afgeleid van echte Comm Layer-state, geen verzonnen velden. Attention-tags
  volgen bericht, draft en leverstatus.
- Isolatie: geen rij uit een andere tenant en geen privacy-gesprek lekt naar het
  communicatie-overzicht.
- Regressievrij: bestaande Slice 1/2 tests en previewarchitectuur blijven groen. Testerbeheer, First
  Five, outbound mail en Phase B ongemoeid.
- CSP intact: geen inline handlers, `data-act` delegatie, `esc()` op alle geïnterpoleerde data.
- De datacontracten die vannacht zijn vastgelegd (twee nieuwe tests) blijven groen.

---

## 6. Risico's of beslissingen waarvoor Lud nodig is

Dit zijn UX- en productkeuzes die bewust zijn uitgesteld tot na zijn live gebruiksronde. Geen ervan is
onomkeerbaar of raakt infrastructuur.

- UX-plek: worden Relaties en Gesprekken losse pagina's (zoals de Inbox nu) of views binnen de cockpit
  op `index`? Dit raakt de geaccepteerde UX.
- Gesprekkenoverzicht: blijft dit de bestaande Inbox of wordt het een aparte cockpit-view?
- Relatiesoverzicht scope: alleen contacten (huidige `listRelationships`) of ook groepering op
  organisatie-niveau?
- Prominente kolommen, sortering, filtering en paginatie: afhankelijk van wat Lud in de praktijk
  zoekt.
- `open_convs` telt privacy-gesprekken mee: bevestigen of dit moet worden uitgesloten (kleine
  query-aanpassing).

Er is geen veiligheids-, infrastructuur- of onomkeerbare beslissing gevonden die vannacht een stop
rechtvaardigde.

---

## 7. Wat vannacht veilig is voorbereid

- Read-only architectuuronderzoek van de volledige Comm Layer: schema (migraties 001 tot 005), routes
  en de drie frontend-oppervlakken. Conclusie: beide overzichten kunnen op bestaande, tenant-scoped,
  privacy-veilige databronnen worden gebouwd. Enkel het Relatiesoverzicht is een echt nieuw
  UI-oppervlak.
- Test-only readiness code (aparte commit, geen productgedrag, geïmporteerd door niets onder `server/`
  of `public/`):
  - `tests/helpers/comm-fixtures.mjs`: één gedeelde DB-harnas (de canonieke skip-guard, migrate plus
    reset, en deterministische seeders voor tenant, organisatie, contact, gesprek, bericht, ai_draft
    en activity). Geen top-level `pg`-import, dus een schone skip zonder database.
  - `tests/comm-relations-overview.test.mjs` en `tests/comm-conversations-overview.test.mjs`: leggen
    de exacte datacontracten vast die de UI morgen bindt (tenant-isolatie, privacy-split, zoeken,
    ordening, attention-tags, summary-tellers en provenance).
- Verificatie: volledige suite groen (66 tests, 55 pass, 11 skip, 0 fail). Slice 1/2 tests en
  previewarchitectuur intact. Niets gedeployed, geen mail, geen echte data, geen infrastructuur.
  Testerbeheer, First Five en Phase B ongemoeid.
- De DB-testpaden draaien in CI en productie waar een database aanwezig is (dezelfde conventie als de
  bestaande comm-DB-tests). In deze sandbox zonder Postgres skippen ze bewust; de niet-DB delen en de
  syntaxis zijn geverifieerd.

---

## Kernboodschap voor morgen

De ruggengraat staat al. Het Gesprekkenoverzicht bestaat als de Inbox op een bestaande databron. Het
Relatiesoverzicht is de enige echt ontbrekende oppervlak en kan zonder nieuw backendwerk op
`GET /api/comm/relationships` worden gebouwd. De grootste openstaande keuzes zijn UX-plek en scope, en
die horen bij Lud na zijn eigen gebruik van de cockpit. Bouwtijd morgen gaat vooral naar frontend plus
navigatie, met de datacontracten al vastgelegd in tests.
