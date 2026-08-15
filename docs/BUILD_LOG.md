# Build log — Maculis Testerbeheer

Compacte, chronologische bouwlog van de Testerbeheer-portal (`ftrprf-labs/website`).
Geen persoonlijke of gevoelige data. Uitsluitend architectuur- en testbeslissingen.

---

## 2026-08-15 — Attention Cockpit + Living Signature + outbound delivery fix (productie)

**1) Outbound delivery-incident opgelost (200 ≠ afgeleverd).** Root cause: de live-gate
van de e-mailprovider hing aan `MAIL_FROM`; die was leeg → de provider viel terug op de
**mock** → een interne 200 zonder echte Resend-call. Fix: live-gate losgekoppeld van
`MAIL_FROM` (`mailTransport==='resend' && MAIL_API_KEY`), in productie **nooit** stil
mocken (mock → expliciete fout), plus PII-veilige send-diagnostiek die de échte
providermodus logt. Delivery-status webhooks (sent/delivered/bounced/failed/complained)
werken de `message.delivery` bij zonder positieve statussen te laten terugvallen.

**2) Living Maculis e-mailhandtekening.** Deterministisch, centraal bij verzenden
toegevoegd (nooit door de AI, nooit in de opgeslagen body), exact één keer, idempotent,
e-mailclient-veilig (knipoog als animated GIF met statische PNG-fallback, geen tracking
pixel), dark-mode/mobiel/toegankelijk. AI-context sluit de eigen handtekening + geciteerde
historie uit (`stripForContext`). **Definitieve copy:** `Ludwig van der Kuijl` /
`Maculis · Kijk nog eens.` / `hello@maculis.nl · maculis.nl` (naam + payoff config-baar,
nooit verzonnen; plain-text valt logisch terug op dezelfde regels).

**3) Attention Cockpit — dagelijkse cockpit boven Testerbeheer.** Eén kanaal-agnostische
"wat vraagt vandaag mijn aandacht?".
- **Read = menselijk signaal:** conversation-level `last_read_at`-watermerk, alleen gezet
  wanneer een bevoegde gebruiker het gesprek daadwerkelijk **opent** — nooit door webhook,
  AI of achtergrondjob. Idempotent (watermerk loopt alleen vooruit).
- **Attention is afgeleid, nooit dubbel opgeslagen:** uit `last_inbound_at` vs
  `last_read_at`, een klaarstaand voorstel en leverstatus → `NEW/UNREAD/NEEDS_ACTION/
  REPLY_READY/WAITING_FOR_CUSTOMER/RESOLVED (+ DELIVERY_PROBLEM)`.
- **Eén bron van waarheid:** Inbox-badge, cockpit-kop, rij-indicator komen alle uit
  `attentionOverview` (tenant-scoped, privacy uitgesloten). Behandelde communicatie
  verdwijnt overal coherent.
- **UX:** menselijke copy ("Antwoord staat klaar", correcte enkelvoud/meervoud), één
  deterministische prioriteit ("Als eerste bekijken", op urgentie → oudste wachtend, geen
  verzonnen AI-ranking), compacte conversation-previews met snippet, ontworpen zero-state
  ("Je bent bij."), subtiele micro-interacties (respecteert `prefers-reduced-motion`),
  responsive (mobiel = één boodschap + één actie), toegankelijk (kleur nooit het enige
  signaal). Eén klik → juiste gesprek (`/comm.html#conv=<id>`, markeert gelezen).
- **Migratie 005** forward-only/non-destructief: `last_read_at/last_read_by/last_inbound_at`
  + backfill van `last_inbound_at` + tenant-scoped index. Geen read-state gebackfilld
  (eerlijk "ongelezen tot geopend").

**Tests:** volledige comm-suite **65/65** (serieel). Nieuw: 22 attention-cases (pure
derivation + DB-E2E: watermerk, idempotentie, tenant-isolatie, privacy-uitsluiting,
zero-state, headline enkelvoud/meervoud) + uitgebreide signature-cases. Visuele QA
(desktop + mobiel + zero-state) via headless Chromium.

**Menselijke acties — afgerond (niet langer openstaand):**
- Communicatielaag geactiveerd (`DATABASE_URL` gekoppeld; Comm ENABLED, migraties 001–005).
- Resend inbound webhook + `RESEND_WEBHOOK_SECRET` + `COMM_MAILBOXES` gezet; MX `maculis.nl`
  geverifieerd; echte inbound→AI→bewerk→goedkeuren→outbound E2E aangetoond in productie.
- `MAIL_API_KEY` en `MAIL_FROM` gezet (echte outbound live).

**Resterende menselijke acties:** (a) visuele acceptatie van de knipoog in een échte
ontvangen mail in echte clients (Apple Mail/Gmail); (b) na deze deploy Testerbeheer één
keer openen zodat de productie-cockpit met echte relaties zichtbaar wordt (de read/write
van het watermerk is lokaal tegen echte Postgres bewezen en de productie-boot is schoon,
maar directe productie-DB-queries zijn vanuit de sandbox geblokkeerd (SSL/TLS)).

**Commits:** branch `claude/maculis-communication-layer-gk5x2i` → merge naar deploybranch
`claude/invitation-manager-mvp-d5r5h8` (auto-deploy Render, migratie 005 toegepast, schone boot).

---

## 2026-08-15 — Pass the Lens: productie-acceptatie (functioneel geaccepteerd, gesloten)

**Status: in productie werkend en functioneel geaccepteerd.** Bevestigd via een echte
productietest: een bestaande tester is opnieuw door First Five gegaan, Pass the Lens verscheen
op het juiste moment, een nieuwe ondernemer is ingevuld en die persoon kwam correct in
Testerbeheer binnen. Geen verdere wijzigingen; alleen heropenen bij een concrete bevinding uit
echte testdata.

**Wat het is.** De eerste ingebouwde organische groeilus: een ondernemer die First Five heeft
ervaren draagt aan het einde (na de Meaningful End én de evaluatie) een andere ondernemer aan
("Aan wie zou jij deze lens doorgeven?"). De aangedragen ondernemer landt als KANDIDAAT in
Testerbeheer; een beheerder beoordeelt en nodigt uit via de bestaande Invitation Manager.

**Architectuur (bestaande entiteiten hergebruikt, geen parallel CRM).**
- First Five is een dunne forwarder: `POST /api/pass-the-lens` → forwardt de 4 minimale velden
  (voornaam, achternaam, bedrijf, e-mail) naar Testerbeheer `POST /api/intake` (server-to-server,
  `INTAKE_KEY`). First Five bewaart niets over de derde persoon (privacy §10).
- `store.intake()` (bestaand seam): dedup op person_key, `source:'pass_the_lens'`, lifecycle nooit
  gereset. Provenance in append-only `record.introductions[]` = `{ at, by_id, by_name, by_company,
  source_journey }`; de verwijzer wordt uit zijn eigen token opgelost (`getByToken`), voert zijn
  gegevens niet opnieuw in, en geen token/secret wordt opgeslagen. Repeat-introductie wordt
  toegevoegd (zichtbaar), nooit een stille duplicaat/merge. History-event
  `pass_the_lens_introduction` (observatie; stuurt nooit status/consent).
- HARDE REGEL §4: geen automatische uitnodiging. Kandidaat = DRAFT + consent UNKNOWN → de
  fail-closed `mayContact()`-gate blokkeert elke automatische outbound. Uitnodigen loopt via de
  ONGEWIJZIGDE bestaande consent-gated e-mail/WhatsApp-flow; status schuift door naar SENT →
  COMPLETED.
- Relatiehistorie (§9/§15): best-effort `server/comm/pass-the-lens.mjs` (`bridgePassTheLens`) legt,
  wanneer de Comm Layer aan staat, een Contact + `pass_the_lens_introduction`-activity + een
  bevestigde memory ("Geïntroduceerd via Pass the Lens door X") vast, zichtbaar voor de AI-context.
  Volledig guarded/no-op wanneer uit. In productie staat de Comm Layer AAN, dus dit speelt mee.
- UI: rustig "Pass the Lens · via \<verwijzer\>"-label op de kandidaatrij + "Aangedragen door" in de
  Historie. Schrijfregel gerespecteerd (geen streepjes als stijlmiddel).

**Config (productie).** `INTAKE_KEY` gedeeld op `ftrlabs-testerbeheer` én `maculis-first-five`;
`TESTERBEHEER_INTAKE_URL=https://ftrlabs-testerbeheer.onrender.com/api/intake` op First Five. Het
gedeelde geheim staat NIET in code/log/docs. Zonder deze config degradeert de feature zacht (geen
kandidaat, geen kapotte UX).

**Tests.** Unit `tests/pass-the-lens.test.mjs` 5/5 (DRAFT + UNKNOWN → geen auto-invite; token-
provenance; dedup/repeat-append; onbekende verwijzer; dossier). core 19/19 ongewijzigd. Cross-service
E2E (beide échte servers lokaal) 15/15. First Five: tsc schoon, technical 13/13, selftest 8/8.
Analytics PII-vrij: `pass_the_lens_shown/_submitted/_skipped` (geen namen/e-mail).

**Commits.** Testerbeheer `ed6a9b5` (feat: controlled referral intake + provenance). First Five
`091c4de` (feat: the organic growth loop terminal beat). Beide live gedeployed en schoon geboot.

---

## 2026-08-15 — Inbound e-mail end to end: zichtbaar bij de klant + AI-verwerking

**Gerichte afrondingsbug.** Inkomende e-mail verscheen niet bij Klant → Communicatie.

**Root cause (config, geen codebug).** De keten stopt bij de voordeur: de Communication
Layer staat in productie UIT (`Comm : off`; `/api/comm/status → 404`), want
`COMM_LAYER_ENABLED` + `DATABASE_URL` zijn niet gezet op de service. De inbound-route
`/api/comm/inbound/resend` is daardoor inert; er wordt niets opgeslagen of getoond.
De inbound-code zelf is geverifieerd tegen de actuele officiële Resend-documentatie en
klopt: `email.received` is metadata-only, de body wordt via de Receiving API
(`GET /emails/receiving/{id}`, identiek aan `resend.emails.receiving.get`) opgehaald,
Svix-handtekening (whsec_, base64 HMAC-SHA256). Tweede meest voorkomende oorzaak in de
praktijk: het ontvangstadres moet exact op `COMM_MAILBOXES` staan, anders wordt de mail
genegeerd.

**Wijzigingen (in scope, geen nieuwe onderdelen):**
- PII-veilige inbound-diagnostiek (`[comm/inbound] rejected|ignored|stored|error …`) zonder
  afzender/inhoud/onderwerp, zodat in productie zichtbaar is wáár de keten stopt (o.a.
  `recipient_not_allowlisted`).
- De automatische AI-copilot bouwt zijn voorstel nu op de bounded Relationship Context
  Engine: recente + eerdere communicatie, First Five-status, open follow-ups én BEVESTIGDE
  Relationship Memory. Kanaal is metadata; dezelfde pipeline verwerkt later WhatsApp/SMS.
- `.env.example`: `COMM_MAILBOXES` toelichting bevestigd als het ontvangstadres.

**Getest (echte keten op een echte Postgres, fictieve data):** suite **32/32**; zonder DB
skippen de comm-tests netjes. Nieuwe E2E `comm-inbound-visibility` (echte Svix-webhook →
juiste klant → zichtbaar in Communicatie → juiste afzender/onderwerp/inhoud/tijd → refresh
blijft → reply-threading → onbekende afzender veilig → duplicate/ongeldige-signature/HTML/
plain/geen-onderwerp/lange-mail → verkeerd ontvangstadres genegeerd). Nieuwe E2E
`comm-inbound-ai-acceptance` (inbound → AUTOMATISCH AI-voorstel zonder knop, context met
bevestigde memory → mens past aan, edit blijft behouden → goedkeuren + verzenden → uitgaand
in dezelfde conversation, audit toont AI-draft + human approval → klant antwoordt → threadt
terug → AI stelt volgende stap voor; AI verzendt nooit zelf).

**Resterende human action (extern, alleen Lud):** de laag activeren (link
`maculis-relationship-db` → `DATABASE_URL` + `COMM_LAYER_ENABLED=1`) en Resend inbound
opzetten (MX-record op ontvangstdomein, inbound-webhook naar
`/api/comm/inbound/resend`, `RESEND_WEBHOOK_SECRET`, ontvangstadres = `COMM_MAILBOXES`).

---

## 2026-08-15 — Relationship Workspace + AI-first omnichannel Communication Layer

**Product.** De relatie is het productobject. Testerbeheer → klik op naam/bedrijf →
**Relationship Workspace** (Overzicht / Journey / Inzichten / Communicatie / Activiteit).
Communicatie zit IN de klant, niet in een los tabblad. De **centrale Inbox** (`/comm.html`)
is de tweede ingang: een rustig aandachtsmodel (Nieuw / Wacht op mij / AI-voorstel /
Onbekend / Levering / Follow-ups) op exact dezelfde data. AI is de primaire werklaag:
elk inbound bericht krijgt een conceptantwoord dat je conversationeel met Maculis verfijnt.

**Backend (additief op 001/002; migratie `003_drafts_followups_channels.sql`):**
- **Provider-abstractie** `server/comm/providers/*` — één neutrale interface
  (`send/capabilities/normalizeInbound/requiredConfig`). EMAIL is LIVE via Resend zodra
  geconfigureerd; WHATSAPP/SMS/PHONE/SOCIAL draaien als volledige MOCK-adapters (officiële
  routes: WhatsApp Business Cloud API, EU SMS/voice; nooit scraping) en melden exact welke
  credentials nog nodig zijn.
- **Unified outbound** `send.mjs` — één verzendpad voor alle kanalen met **consent-gate**
  (`consent.mjs`, per kanaal/doel, opt-out first-class), persist OUTBOUND message,
  `delivery_event`, activity + audit. AI verzendt nooit; alleen expliciete human-approval.
- **AI-first drafts** `drafts.mjs` + AI-serviceboundary `ai/service.mjs`
  (`summarize/classifyIntent/draftReply/reviseDraft/suggestNextAction/extractFollowUps/explain`)
  + bounded **Context Engine** `ai/context.mjs`. Composer en AI-chat delen dezelfde draft;
  `reviseDraft` rebaset op de HUIDIGE tekst → **menselijke wijzigingen worden nooit
  overschreven** (versiehistorie `comm_draft_version`). Deterministische offline-modus +
  fallback: communiceren werkt óók zonder AI.
- **Relationship aggregation** `relationship.mjs` (parallelle queries), **Inbox** `inbox.mjs`
  (attention model), **omnichannel inbound + identity resolution** `channel-inbound.mjs`
  (unknown-contact veilig, handmatig koppelen), **follow-ups** `followups.mjs`.
- Boot bridget bestaande Testerbeheer-invitations idempotent naar permanente Contact/Organization.
- Relationship-georiënteerde API onder `/api/comm/*` (relationship / inbox / drafts / followups /
  consent / status). Alles tenant-scoped; privacy-inbox blijft gescheiden en zonder auto-AI.

**Getest (fictieve data):** volledige suite **30/30** tegen een echte Postgres; zonder DB
skippen de comm-tests netjes (24 pass / 5 skip → productie-pariteit, laag blijft dormant).
Nieuwe E2E `comm-workspace.test.mjs`: inbound → Contact/Org → AI-voorstel → draft warmer/korter
→ **menselijke edit** → AI "voeg dinsdag toe" behoudt de edit → goedkeuren/verzenden →
delivery_event + audit → WhatsApp inbound (unknown) → koppelen → consent-blokkade →
opt-in → verzenden via mock; SMS onafhankelijk geblokkeerd. **Browser (Playwright,
desktop 1280 + mobiel 390):** login → naam klikken → Workspace (OCA) → Communicatie →
AI-chat past body aan → human edit behouden → verzenden → Inbox-aandachtsmodel; 0 console-errors.
CSP intact (externe JS, geen inline handlers; nooit `unsafe-inline` toegevoegd).

**Kanaalstatus (eerlijk, §81):** EMAIL architecture-ready + provider-connectable (Resend);
WHATSAPP/SMS/PHONE/SOCIAL architecture-ready + **MOCK E2E verified**, provider-connected =
nee (credentials ontbreken — zie ALLEEN DOOR LUD).

---

## 2026-08-14 — Online-acceptatie: deploybaar, beveiligd, fail-closed

**Doel.** Van lokale acceptatie naar een gecontroleerde ONLINE acceptatieomgeving
op Render (altijd-aan containers, geen localhost/Mac). Geen productlogica-wijziging;
uitsluitend deploybaarheid + online hardening.

**Wijzigingen (Testerbeheer, `ftrprf-labs/website`):**
- **Deploy:** `Dockerfile` (node:22-slim, `HOST=0.0.0.0`, `NODE_ENV=production`,
  `CMD node server/index.mjs`), `.dockerignore`, `render.yaml` (Docker web service,
  Frankfurt/EU, `plan: starter` always-on, persistente Disk op `/var/data`,
  `healthCheckPath /healthz`, secrets als `sync:false`). Nieuw `GET /healthz`.
- **Datastore configureerbaar:** `DATA_DIR` stuurt de JSON-store naar de
  persistente Disk (default `./data` lokaal). Geen datamodel-wijziging, geen migratie.
- **Auth-hardening:** sessie-HMAC uit vaste `AUTH_SECRET` (env) i.p.v. per-restart
  random → admin blijft ingelogd over redeploys. In productie **fail-closed**:
  server weigert te starten zonder `ADMIN_PASSWORD`, zonder `AUTH_SECRET`, of met
  een niet-https / localhost `MACULIS_PUBLIC_URL`.
- **Publieke vs interne URL (§3):** nieuwe `MACULIS_PUBLIC_URL` voor de persoonlijke
  tester-link (wat de tester op de telefoon opent); `MACULIS_HOST` blijft de interne
  server-to-server basis. Uitnodigingen bevatten nooit meer localhost.
- **Security headers op ALLE responses** (ook JSON-API) incl. **HSTS**.
- **Resend-e-mailadapter:** `MAIL_TRANSPORT=resend` (POST api.resend.com/emails,
  Bearer key, `{from,to,subject,text}`). Vereist key + geverifieerde afzender;
  het "alleen echt afgeleverd → INVITED"-contract blijft intact.
- **Lichte rate limiting** (in-memory, single-instance) op `/api/login` (10/5min)
  en `/api/intake` (60/min) → 429.
- `.env.example` gecorrigeerd/aangevuld (`MACULIS_EXPORT_KEY`, `MACULIS_PUBLIC_URL`,
  `AUTH_SECRET`, `DATA_DIR`, `NODE_ENV`, Resend).

**Journey (`ftrprf-labs/maculis-first-five.`, branch `claude/journey-consent-v1`):**
additieve baseline security-headers (HSTS, nosniff, X-Frame-Options SAMEORIGIN,
Referrer-Policy) — géén CSP (frozen inline scripts/video ongemoeid). Deploy-config
(Dockerfile/render.yaml) bestond al.

**Getest (fictief):** 19/19 unit; **online-acceptatie A–T 42/42** (beide echte
servers, productie-config, publieke/interne URL-split, s2s-auth beide richtingen,
consent fail-closed, lifecycle DRAFT→INVITED→STARTED→COMPLETED, e-mail
delivered-contract, WhatsApp 0629538336→31629538336, security-headers, rate-limit,
geen PII/secret in logs); prod-fail-closed startup 5/5; Journey selftest 8/8;
volledige bestaande regressie groen (wa 30/30 + 16/16 + 13/13, lifecycle 12/12,
fail-closed 22/22, intake 41/41, journey-pull 8/8, eval-UX 38/38, consent 34/34,
browser 18/18 + 16/16). Geen deployment uitgevoerd; geen productielogica gewijzigd.

---

## 2026-08-14 — E-mail lifecycle fix (INVITED = aantoonbaar verzonden)

**Blocker uit handmatige acceptatietest.** Een tester kon op INVITED komen
zonder aantoonbare verzending: het `mock`-transport fake'te succes. (De
WhatsApp-variant — openen zette direct INVITED — was al opgelost met de
tweestaps-bevestiging in `aad394c`; die zit in deze branch.)

**Fix.** Alleen een **echt verzendend transport met bevestigd succes** zet
INVITED.

- `mailer.mjs`: elk resultaat draagt nu een expliciete `delivered`-vlag.
  `mock` → `delivered:false` (reason `mock`), niet-geconfigureerd →
  `delivered:false`. Alleen `http` met een 2xx-respons → `delivered:true`.
  `mailConfigured()`/nieuwe `mailDelivers()` betekenen "een echt verzendend
  transport" (mock/leeg → false).
- `index.mjs` e-mailroute: zet INVITED + `invited_at` + `invitation_sent`
  **uitsluitend** bij `delivered === true`. `mock`/niet-geconfigureerd →
  blijft DRAFT, géén event, geteld als `notSent`. Een échte mislukte
  verzending → `invitation_failed`, DRAFT.
- `app.js`: eerlijke melding wanneer er geen verzendend transport is
  ("E-mail niet echt verzonden — niemand op INVITED").

**Regel bevestigd:** create / consent / publish / persoonlijke link / preview
/ modal openen zetten **nooit** zelfstandig INVITED. Alleen een expliciete
WhatsApp-verzendbevestiging of een echt geslaagde e-mailverzending doet dat.

**Tests toegevoegd/aangepast:** nieuwe lifecycle-E2E (A–K + geen-losse-INVITED,
12/12) met een echt HTTP-mailtransport (fake endpoint 2xx/5xx) voor de
succes/faal-paden; mailer-unittest herschreven op het `delivered`-contract.
Volledige regressie groen (17/17 unit, 12/12 lifecycle, 22/22 fail-closed,
30/30 WhatsApp, Step 3, 41/41 intake, 8/8 journey-pull, 38/38 eval-UX,
18/18 + 16/16 browser). Geen PII/keys in logs.

---

## 2026-08-14 — Journey-consent afronding (consent_version uit sessie)

**Feature (IM-kant van een cross-repo wijziging).** De Maculis-journey stempelt
sinds `maculis-contact-v1` de getoonde consent-versie in de sessie
(`contact_consent_version`) en het `inner_circle_opt_in`-event. De IM-pull leest
die versie nu uit en legt hem vast bij de OPTED_IN, zodat aantoonbaar is met
welke tekst iemand heeft ingestemd (voorheen `null`).

- `maculis-sessions.mjs`: `deriveByToken` leest `contact_consent_version` (sessie
  en event) → `d.consent_version`.
- `index.mjs`: de evaluations-pull geeft `version: d.consent_version` mee aan
  `setConsent` i.p.v. hardcoded `null`.
- Ongewijzigd: alleen een expliciete opt-in → OPTED_IN; "Nog niet"
  (`contact_consent_deferred` én de oude `inner_circle_declined`) → geen
  transitie; COMPLETED ≠ consent. Historische `null`-versies blijven `null`.

**Journey-repo (apart):** `ftrprf-labs/maculis-first-five.` branch
`claude/journey-consent-v1` — memory/contact ontkoppeld, V1-copy, nieuw event,
version-stamping, privacy-placeholder. **Consent-registry:** `ftrprf-labs/ftrlabs-docs`
(`00-governance/compliance/gdpr/consent-registry.md`).

**Getest:** 17/17 unit, 8/8 journey-pull-E2E, 34/34 journey-browser (desktop+375),
volledige IM-regressie groen. Geen tokens/PII in logs.

---

## 2026-08-14 — Fail-closed contactmodel + consent-provenance

**Feature.** Contact is voortaan **fail-closed**: alleen een expliciete
`OPTED_IN` staat benaderen toe.

**Beslissingen (na product/governance-review):**
- **`mayContact = consent_status === 'OPTED_IN'`.** UNKNOWN én OPTED_OUT
  blokkeren e-mail, WhatsApp, publish en de overgang naar INVITED (server-side,
  403/400). "Geen aantoonbare opt-in = geen contact."
- **"Nog niet" (`inner_circle_declined`) → geen consent-transitie** (blijft
  UNKNOWN), i.p.v. de eerdere OPTED_OUT. "Nog niet" is een uitstel, geen
  weigering. De oude event-naam wordt nog gelezen (backward compatible) maar
  stuurt geen transitie. OPTED_OUT is gereserveerd voor expliciete
  weigering/intrekking.
- **Handmatige OPTED_IN is geen vrijblijvend vinkje**: de admin-route eist een
  provenance-notitie (`consent_note`, hoe is toestemming verkregen) en stempelt
  `consent_source=manual`. Zonder notitie → 400.
- **Intrekking (First Five)** via de bestaande admin-route: `OPTED_IN →
  OPTED_OUT` met `consent_changed` (append-only) en directe blokkade. Een
  publieke self-service afmeldlink (W1) is bewust uitgesteld tot bredere
  opschaling.
- Geen historische migratie nodig (feitelijk 0 productierecords; identificeerbaar
  als `OPTED_OUT + consent_source=pass_the_lens` mocht het ooit voorkomen).

**Gewijzigd:** `store.mjs` (`mayContact`, `consent_note`, migratie),
`index.mjs` (fail-closed gates + verplichte notitie), `maculis-sessions.mjs`
(declined niet meer → OPTED_OUT), `public/*` (knoppen disabled voor alle
niet-OPTED_IN, notitieveld), `tests/core.test.mjs`.

**Getest (fictief):** 17/17 unit, 22/22 fail-closed-E2E, 41/41 intake-E2E,
16/16 fail-closed-browser; regressie Step 3-integratie, Evaluaties-UX 38/38,
WhatsApp-bevestiging 30/30, intake-browser 18/18. Logs zonder notitie/PII/keys.

**Nog open (aparte GO's):** Maculis-journey (nieuwe copy, memory/contact
ontkoppelen, privacy-link, `consent_version=maculis-contact-v1`), consent-
registry, en later self-service withdrawal (W1).

---

## 2026-08-14 — Pass the Lens → consent → Testerbeheer (intake-keten)

**Feature.** De ontbrekende ruggengraat tussen de Maculis-journey ("Pass the Lens")
en Testerbeheer: consent uit de journey wordt vastgelegd met provenance en er is een
beveiligd automatisch intake-endpoint.

**Architectuurbeslissingen (na read-only inventarisatie van `website`,
`maculis-first-five` en `ftrlabs-docs`):**

- **Consent-bron = bestaande Maculis inner-circle opt-in.** De journey heeft al een
  expliciete, niet-vooraangevinkte consent-stap (`inner_circle_opt_in` /
  `inner_circle_declined`, knoppen "Houd me op de hoogte" / "Nog niet"). Deze wordt
  hergebruikt; er is geen nieuwe consent-tekst of -UX gebouwd.
- **Twee kanalen (gebruikerskeuze).**
  1. *Pull* — de bestaande Option-B session-export-pull leidt consent af
     (`inner_circle_opt_in` → OPTED_IN, `inner_circle_declined` → OPTED_OUT, geen
     keuze → UNKNOWN) en past die idempotent toe met `consent_source=pass_the_lens`.
  2. *Push* — `POST /api/intake` als beveiligd ontvangstcontract voor een
     toekomstige Pass the Lens (nu nog geen live caller).
- **Drie dimensies strikt gescheiden.** Lifecycle, evaluatiestatus en consent
  overschrijven elkaar nooit. `COMPLETED ≠ OPTED_IN`: een afgeronde journey zonder
  expliciete keuze blijft UNKNOWN.
- **`consent_version = null`** tot een officiële consent-versie is vastgesteld (geen
  verzonnen versie).
- **Dedup via `person_key`** (genormaliseerde e-mail primair, mobiel als fallback,
  binnen campagne) — bewust níét het participant/session-token.
- **Intake-auth** apart van de admin-gate: header `x-intake-key` = `INTAKE_KEY`;
  ontbreekt de key → 503 (uitgeschakeld), verkeerd → 403. Nooit een publieke intake.
- **Geen lifecycle-reset** bij her-intake van een bestaande tester; consent wordt
  alleen bij een expliciete nieuwe keuze bijgewerkt. Migratie additief/non-destructief.

**Datamodel toegevoegd:** `consent_source`, `consent_version`, `person_key`
(migratie-veilig, legacy → null / afgeleid). History-event `consent_recorded`
(eerste consent) naast `consent_changed`.

**Testresultaten (fictieve data):**
- Unit: 16/16.
- E2E intake (scenario A–I + pull-consent + auth + disabled): 38/38.
- Browser (desktop + 375px): 18/18, 0 console-errors, geen horizontale scroll.
- Regressie: Step 3-integratie, Evaluaties-UX 38/38, WhatsApp-bevestiging 30/30.
- Privacy/log-audit: logs alleen `METHOD PATH -> status`; geen keys/tokens/PII;
  history bevat geen bodies/tokens/antwoorden.

**Resterend (infrastructuur, buiten deze code):** een echte Pass the Lens-caller die
`POST /api/intake` aanroept bestaat nog niet; `www.maculis.nl` moet via DNS/host naar
de Maculis-server wijzen; officiële `consent_version` moet worden vastgesteld.

**Commit:** zie git-historie op branch `claude/invitation-manager-mvp-d5r5h8`.

---

## Eerder (samengevat)

- **V1 basis:** import (CSV/XLSX), opaque tokens, persoonlijke `MACULIS_HOST/?p=<token>`-link,
  WhatsApp/e-mail-uitnodiging, publish naar Maculis, systeemgestuurde lifecycle.
- **Evaluaties/Inzichten (Optie B):** Maculis is source of truth; read-only pull,
  join op participant-token; geen tweede vragenlijst.
- **Consent (opt-in/opt-out):** onafhankelijke dimensie met server-side OPTED_OUT-blokkade.
- **Uitnodigingshistorie + provenance:** append-only `history[]`, `source`.
- **Evaluaties-UX:** KPI-kaarten, testerreis-funnel, verdelingen, open inzichten.
- **Canonieke host:** één `MACULIS_HOST` (default `https://www.maculis.nl`).
- **WhatsApp:** handmatige "Uitnodiging verzonden"-bevestiging (openen ≠ verzenden).
