# Build log — Maculis Testerbeheer

Compacte, chronologische bouwlog van de Testerbeheer-portal (`ftrprf-labs/website`).
Geen persoonlijke of gevoelige data. Uitsluitend architectuur- en testbeslissingen.

---

## 2026-08-19 — Cockpit-harmonisatie Visual DNA v1.0: klaar voor visuele beoordeling

**Status: nog geen akkoord.** Dit is de staat die ter beoordeling voorligt, niet een freeze.

**Branch:** `claude/maculis-cockpit-visual-dna-5zqhjd`, afgetakt van
`claude/maculis-future-cockpit-z9naou` (de branch waar de Cockpit zelf op staat).
**Preview:** `maculis-cockpit-visual-dna-preview` (`srv-da2jsmn40ujc73aggn1g`), Frankfurt,
Node-runtime, geen schijf, geen productiegegevens. Productie is niet aangeraakt:
`ftrlabs-testerbeheer` staat op autoDeploy uit en volgt een andere branch.

### Waarom niet gemerged met de geharmoniseerde basis

De Cockpit staat op een eigen branch die vóór de Testerbeheer-harmonisatie is afgetakt.
Een merge daarvan gaf drie conflicten, waarvan twee in `server/comm/ai/copilot.mjs` en
`server/comm/ai/service.mjs`. Dat zijn inhoudelijke conflicten tussen het
handtekeningbeleid en de Context Layer, en dus een productbeslissing en geen visuele.
Die is hier bewust niet genomen. Het gevolg is dat de runtime van de Cockpit
byte-identiek blijft aan de branch die de preview al draaide, en dat het verschil van
deze branch precies de visuele laag plus de meetgereedschappen is.

### Nulmeting, vóór er iets veranderde

| Meting | Uitkomst |
|---|---|
| Afwijkende hexkleuren | 60 uniek, 111 voorkomens, tegenover 3 canonieke |
| `var()` naar niet-bestaande tokens | 46 in het operationele scherm, alle terugvallend op een hardgecodeerde kleur |
| Transities op de browserstandaard | 48 |
| Audit (regime, grond, overflow, focus, contrast, console, reduced motion) | 113 controles, 66 afwijkingen |
| Echte WCAG AA-fouten | contrast 2,67 tot 4,35 op chips, eyebrows, afzenderregels en geheugenlabels |

### Wat er is gewijzigd

1. **Een lichtregime.** De Cockpit had drie eigen paletten (A, B en C) plus een tweede,
   licht regime voor `[data-space="work"]`: dossier en gesprek stonden in dagkleuren
   terwijl de rail donker bleef. Canon 5 laat per kamer precies een regime toe en canon
   14 wijst de Cockpit werklicht toe. Alles staat nu op grond `ink.950` `#080503`.
   Het onderscheid tussen tonen en werken wordt gedragen door `light.field` op het
   toonmoment, niet meer door een tweede palet.
2. **Aliaslaag in plaats van eigen kleuren.** Tokens 1.0.3, checksum `a8a21414415b8e06`,
   statisch ingelinkt conform canon 17 en byte-identiek aan `ftrlabs-docs/main`.
   `cockpit.css` bezit geen enkele eigen kleurwaarde meer.
3. **Statuspil als transparant vlak** met een `border.semantic` hairline en semantische
   tekst, conform canon 10 en amendement C-2.
4. **Navigatie actief als koperen markering aan een zijde**, nooit een gevuld blok (canon 12).
5. **Knoppen als pil**, primair een warm verzadigd vlak met donkere tekst, secundair
   transparant met een hairline waarvan bij hover alleen de randkleur verandert.
6. **Drie tonale niveaus in plaats van vijf**, en nooit een hairline en een schaduw op
   hetzelfde element (canon 6).
7. **Ruimte, radius en typeschaal op de canonieke stappen.** `hero`, `statement` en de drie
   oude kopmaten vallen samen op `insight`, de enige kopstap die de Cockpit kent (canon 4.3).
8. **Newsreader zelf gehost**, gewicht 300 voor de Uitspraak en cursief 400 voor de Stem
   van Maculis (amendement C-9). Namen staan niet langer in de serif: sans wijst, serif spreekt.
9. **Een curve voor alle beweging**, en de oneindige ademhaling in de lege staat vervalt
   (canon 8.4: geen constante achtergrondbeweging in een werkomgeving).
10. **Geen percentages en geen meters** meer (canon 11). Zekerheid en onderbouwing lezen
    als woord.
11. **Statuslabels Nederlands en menselijk** via labelkaarten voor gespreksstatus,
    aflevering, relatiefase en kanaal, zodat ruwe enumwaarden niet in beeld komen (canon 10).
12. **Onzekerheid is kleurloos.** Demonstratie, afleiding en hypothese dragen geen koper meer.
    Rood is voorbehouden aan wat gebroken is; wat nu aandacht vraagt is koper.
13. **De richtingschakelaar in de prototypelade vervalt**, want met een regime valt er
    niets meer te kiezen.

### Verificatie

| Controle | Uitkomst |
|---|---|
| Tokenpoort (`tools/check-tokens.mjs`) | 4 van 4 |
| Testsuite (`npm test`) | 175 tests, 0 fail, 27 overgeslagen (vereisen live Postgres) |
| Canonscan | 0 afwijkende kleuren, 0 neutrale hairlines, 0 oneindige beweging, 0 streepjes in copy |
| Audit | 85 controles, 0 afwijkingen, 5 schermen x 2 viewports |
| Focusring per Tab-stop | Vandaag 15, Relaties 12, Gesprekken 9, Dossier 19, Gesprek 8, alle voorzien |
| Horizontale overflow | 0px op 1280 en op 390 |
| Reduced motion | 0 lopende animaties, 0 oneindige lussen, niets onzichtbaar |
| Determinisme | twee volledige runs, 56 van 56 byte-identiek |
| Delta tegenover de nulmeting | 56 van 56 gewijzigd. Verwacht: grond en letter veranderen op elk oppervlak |

### Bewust openstaand

1. **De preview toont het operationele scherm pas met een database.** `cockpit-live.html`
   is fail-closed: zonder `DATABASE_URL` en `COMM_LAYER_ENABLED` toont hij "nog niet
   geconfigureerd" in plaats van verzonnen data. De database
   `maculis-cockpit-visual-dna-db` staat klaar, maar de koppeling vraagt een handeling in
   het Render-dashboard. Zolang die er niet is, is `/cockpit.html` het beoordeelbare scherm.
2. **De preview is vanuit de sessie niet op te vragen.** De egressproxy blokkeert
   `onrender.com`. Het bewijs in deze entry komt uit lokale renders en de deploystatus.
3. **De monospace letter in de prototypelade blijft staan.** Die lade is uitdrukkelijk
   geen product; de letter markeert dat.
4. **De organisatienaam staat in een statuspil.** Dat is informatieontwerp, geen
   tokenkwestie, en valt buiten deze workstream.
5. **De MIME-tabel van de server kent nog geen `.png` en `.gif`.** Alleen `.woff2` is
   toegevoegd, omdat de canonieke serif dat nodig heeft. De brand-assets van de
   e-mailhandtekening worden nog als `application/octet-stream` geserveerd. Bestaand
   gedrag, buiten scope, hier vastgelegd zodat het niet ongezien blijft.

---

## 2026-08-17 — Scout externe bronnen: Website Signals + TED live-ready, KVK/KBO verificatie-seams

**Van DEMO naar echte externe waarneming (bronnen live-ready, standaard uit).** Twee credential-free
signaalbronnen zijn nu echte, live-klare providers, en officiële identiteitsverificatie is als seam
voorbereid. Scout blijft het brein: externe waarneming, normalisatie, bestaande-relatiecontrole,
evidence, FEIT/AFLEIDING/HYPOTHESE, confidence, deduplicatie, relevantie, proposal, attention.

**Website Signals** (`providers/website.mjs`, `SCOUT_WEBSITE_SIGNALS`): leest de eigen publieke homepage
van een organisatie, respecteert robots.txt, één request, korte snippets. **TED** (`providers/ted.mjs`,
`SCOUT_TED`): de anonieme EU-aanbestedingen Search API v3 (`POST /v3/notices/search`), per kandidaat
recente aanbestedings- of gunningsactiviteit, met notice-URL en een expliciete "naam-match kan
naamgenoot zijn"-onzekerheid. Beide standaard UIT; aanzetten betekent echte externe HTTP-calls.

**Verificatie-seams.** `providers/kvk.mjs` (NL Handelsregister): interface + config volledig gereed,
UIT tot `KVK_API_KEY` gezet is (nooit in code); een officiële match landt als FEIT met KVK-nummer als
dedup-anker. `providers/kbo.mjs` (BE Kruispuntbank): gedocumenteerde seam, niet live (gratis open data,
maar per-query vereist bulk-ingest, een productbeslissing). Registry: `gatherVerification` naast
`gatherExternalSignals`; Scout vouwt verificatie als FEIT en signalen als OBSERVATION, gescheiden.

**Persoonsidentificatie:** als gedocumenteerde seam vastgelegd (rol `resolvePersons`), nog niet gebouwd;
geen PII-harvesting, geen LinkedIn/vendor.

**Aandacht beschermd:** externe waarnemingen gaan altijd door Scouts kwalificatie, dedup en
relevantiedrempel; alleen betekenisvolle kandidaten worden een attention_item.

**Sandbox-beperking (eerlijk):** de egress-policy van deze buildomgeving blokkeert algemene externe
hosts (TED en bedrijfssites gaven `connect_rejected`/403 via de proxy). Een échte live externe call kon
hier dus niet worden uitgevoerd; de providers zijn live-klaar en draaien echt in een omgeving met open
egress (de preview). De volledige keten is deterministisch bewezen met geïnjecteerde fetch (echte
provider-code, testfixtures ondubbelzinnig als test gemarkeerd), geen live netwerkcall in de suite.

**Tests.** `agents-discovery` uitgebreid (TED off-by-default, query/parse/multilingual, KVK seam +
extract, verificatie als FEIT) en een DB-E2E die website + TED signalen én KVK-verificatie door Scout op
één attention_item combineert met FEIT vs externe OBSERVATION gescheiden. Config: `SCOUT_TED`,
`KVK_API_KEY`, `KVK_API_BASE` in `.env.example`. Geen deploy, geen credentials in code.

---

## 2026-08-17 — Scout discovery-laag: generieke multi-bron architectuur (geen credentials, geen live calls)

**Onderzoek + generieke bouw, met een expliciet stopmoment vóór een providerkeuze.** Scout mag geen
wrapper om één leverancier worden: normalisatie, relatiecheck, evidence, reasoning, confidence, dedup,
attention-beslissing en proposal blijven in Scout. Alleen de bronlaag eronder is pluggable.

**Gebouwd (credential-free, standaard uit):** `server/agents/providers/registry.mjs` (rolmodel
DISCOVERY/SIGNALS/ENRICHMENT/VERIFICATION, provider-registry, normaliserende aggregator
`gatherExternalSignals` die elke waarneming van een bron-tag voorziet en een falende bron overslaat) en
`server/agents/providers/website.mjs` (credential-free website-signaalbron: leest de eigen publieke
homepage van een organisatie, respecteert robots.txt, één request, korte snippets, resultaten als
EXTERNE waarnemingen). Standaard UIT (`SCOUT_WEBSITE_SIGNALS`); live fetchen is een bewuste keuze. Scout
vouwt externe waarnemingen als eigen soort (OBSERVATION met bron + url) in de evidence, gescheiden van
onze eigen FEIT/AFLEIDING/HYPOTHESE, en laat ze de confidence licht verhogen.

**Onderzoek vastgelegd** in `docs/architecture/SCOUT_DISCOVERY_SOURCES.md`: vergelijking van KVK (NL),
KBO/BCE (BE), TED (EU aanbestedingen), bedrijfswebsite, nieuws/RSS, OpenCorporates en vendor-enrichment,
plus de aanbevolen minimale V1-combinatie (KVK + KBO als identiteit/verificatie, TED + website als
signalen) en de stoppunten die een menselijke/betaalde keuze vereisen.

**Bewust NIET gedaan:** geen KVK/KBO/TED live aangesloten (providerkeuze + credentials), geen scraper die
blokkades omzeilt, geen fake externe resultaten, geen PII zonder doel, geen outreach. KVK/KBO/TED staan
als gedocumenteerde seams in het statusbord (`/api/agents/status`), niet geïmplementeerd.

**Tests.** `tests/agents-discovery.test.mjs` (pure unit: website standaard uit, robots-respect, extractie,
normalisatie/aggregatie, externe signalen als OBSERVATION in reasoning) + een DB-E2E die met een
geïnjecteerde bron aantoont dat een extern signaal bron-herleidbaar op het attention_item landt. Geen
live netwerkcall in tests. Geen deploy, geen infra/secret-wijziging.

---

## 2026-08-17 — Scout aangesloten op de Cockpit (Slice 5 integratie, één werkelijkheid)

**Twee werelden samengevoegd.** De Cockpit-chat realiseerde Slice 5 (collaboratieve cockpit met een
persistente `attention_item`-laag, `server/comm/work.mjs` en de routes `/api/cockpit/agent/work` en
`/api/cockpit/work/:id/:action`, contract in `docs/AGENT_COCKPIT_CONTRACT.md`). Deze branch bracht de
agent-runtime. Beide zijn nu samengevoegd (merge van `claude/maculis-future-cockpit-z9naou`).

**Parallelle abstractie opgeruimd.** Het eerdere eigen work-model (`work_item`, `agent_finding`,
`agent_evidence`, `/api/agents`-findings/promote/dismiss, `server/agents/cockpit.mjs`,
`docs/architecture/COCKPIT_AGENT_INTEGRATION.md`) is verwijderd. Er is nu geen tweede werkvoorraad en
geen tweede lead-database: Scout landt werk uitsluitend via `recordWorkItem` in `attention_item`. De
oude migratie `006_agent_foundation.sql` is vervangen door `007_agent_runtime.sql` met alleen wat het
agentdomein echt bezit en de Cockpit niet: `actor` (identiteit, mandaat, autonomie) en `agent_run` (de
run-trace voor observability). De collision met hun `006_attention_items.sql` is daarmee weg.

**Scout, echte verticale keten (werkt end-to-end tegen Postgres).** waarnemen (aangedragen of interne
kandidaten) → begrijpen (kwalificatie via deterministische providergrens) → controleren (dedup en
relatiecheck tegen bestaande organisaties/personen) → evidence met expliciete scheiding FEIT /
AFLEIDING / HYPOTHESE en confidence → voorstel → `recordWorkItem` (`attention_item`) → Cockpit →
menselijke beslissing (`resolveWorkItem`: approve materialiseert een `proposedRelation` tot een echte,
op e-mail gededupliceerde relatie) → status/ownership terug → audit/activity. Bestaande relaties worden
per id gerefereerd (geen duplicaat); alleen echt nieuwe leads rijden als `proposedRelation`.

**Grenzen afgedwongen.** Scout (autonomie `PREPARE`) mag observeren en werk vastleggen, maar nooit zelf
resolven, een relatie materialiseren, extern communiceren, consent zetten, privacy lezen, identiteiten
mergen of extern web raadplegen. De mandaat/autonomie-guard weigert en auditeert dat. Externe discovery
is een expliciete providergrens die `configured:false` meldt en niets teruggeeft. Demo/fixtures worden
ondubbelzinnig gemarkeerd (`evidence.demo=true`, `source='demo-fixture'`), nooit als echte vondst.
Compressie: kandidaten onder de relevantiedrempel worden niet vastgelegd; herhaalde runs dedupliceren
via `dedupKey` (geen spam).

**Aparte `AGENTS_ENABLED`-flag** blijft: het agentdomein is onafhankelijk activeerbaar; het gedeelde
schema (006 + 007) wordt op boot toegepast zodra Comm of Agents aanstaat.

**Tests.** `tests/agents-registry.test.mjs` (pure unit) en `tests/agents-scout.test.mjs` (DB-E2E:
landing via het cockpitcontract, FEIT/AFLEIDING/HYPOTHESE, dedup, bestaande relatie herkend, proposed
relation niet stil echt, approve/reject/take_over, geen externe outbound, tenant-isolatie, demo-marker,
Scout-fout breekt de Cockpit niet, auditability). Volledige suite tegen echte Postgres inclusief de
overgenomen cockpit-slices. Geen deploy, geen infra/secret-wijziging.

---

## 2026-08-17 — Digitale collega's: gedeelde agentfundering + eerste collega (Scout, Growth/Lead)

**Van onderzoek naar realisatie.** De eerste echte digitale collega is gebouwd op een minimale,
gedeelde agentfundering die binnen dezelfde relationele werkelijkheid werkt. Geen parallel universum,
geen tweede Cockpit, geen autonome externe acties. Additief en feature-flagged achter de bestaande
`COMM_LAYER_ENABLED` + `DATABASE_URL`-gate. Niets gedeployed.

**Datamodel (migratie `006_agent_foundation.sql`, additief, idempotent):** `actor` (HUMAN|AGENT|
SYSTEM, met granted autonomie), `work_item` (het gedeelde werkobject), `agent_run` (één uitvoering,
audit/kosten/idempotentie), `agent_finding` (evidence-gegronde bevinding = voorstel, met epistemische
status en confidence), `agent_evidence` (herkomst per claim, expliciete `source_type`). Hergebruikt
zonder duplicatie: `audit_event`, `activity`, `notification`, `relationship_memory` (proposed vs
confirmed), `organization/contact.relationship_stage` (lead-lifecycle), `channel_identity`.

**Mandaat en autonomie (veilig als default).** Ladder `OBSERVE -> PROPOSE -> PREPARE ->
ACT_WITH_APPROVAL -> AUTONOMOUS`. Twee onafhankelijke gates in `server/agents/registry.mjs`:
autonomie (hoe ver zelfstandig) en mandaat (welke resources/acties). Scout heeft `PREPARE`: mag
observeren, voorstellen en voorbereiden, maar mag nooit zelf verzenden, promoveren, consent zetten,
privacy lezen, identiteiten samenvoegen of extern web raadplegen. Elke weigering wordt geauditeerd
(`mandate_denied`/`autonomy_denied`). Mandaat blokkeert ook een hoog-autonome agent.

**Growth/Lead-collega (Scout), end-to-end.** `server/agents/scout/runner.mjs`: krijgt een
`growth_discovery` work item met echte, aangedragen kandidaten, controleert per kandidaat of we de
organisatie of personen al kennen (dedup), kwalificeert fit uit ECHTE signalen via een
deterministische providergrens, bewaart evidence + confidence + epistemische status, stelt een
volgende stap voor, en laat het als prepared work achter. Verzendt nooit. Promoveert nooit zelf.
Promotie is een menselijke actie die een `LEAD` in de gedeelde waarheid zet plus een PROPOSED memory,
zodat gevonden informatie, afleiding en bevestigde relationele state gescheiden blijven.

**Providergrens (eerlijk).** `server/agents/providers/discovery.mjs`: de standaardprovider is
deterministisch en intern (kwalificeert op basis van aangedragen of interne data, verzint niets). De
externe web-provider is een stub die `configured:false` meldt en NIETS teruggeeft, zodat echte
discovery later veilig kan worden aangesloten. Geen nepdata als echte leads.

**Cockpit-integratiecontract.** `server/agents/cockpit.mjs` + `handleAgents` (`/api/agents/*`,
admin-gated, gemount naast `handleComm`). De Cockpit consumeert findings als prepared work op Vandaag,
per relatie op het dossier, met promote/dismiss als menselijke beslissing. Contract vastgelegd in
`docs/architecture/COCKPIT_AGENT_INTEGRATION.md`.

**Tests.** Nieuw: `tests/agents-registry.test.mjs` (pure unit, altijd groen: mandaat/autonomie,
provider-eerlijkheid) en `tests/agents-scout.test.mjs` (DB-E2E: volledige lifecycle, tenant-isolatie,
idempotentie/double-submit, provenance, geen externe actie zonder goedkeuring, state transitions,
failure handling, promotie/afwijzing, en dat agent-output nooit stil als bevestigd feit belandt).
Lokaal tegen een echte Postgres: 12/12 agent-tests groen; zonder DB skippen de E2E-tests netjes
(66 pass / 10 skip). Eén bestaande comm-copilot-test (`comm-ai` test 2) faalt in deze lokale sandbox
door een pre-existing race in de mock-copilot (reproduceert op de schone baseline zonder deze
wijziging, en is groen in de echte CI volgens deze log); niet veroorzaakt door dit werk.

**Aparte `AGENTS_ENABLED`-flag.** Het agentdomein is nu onafhankelijk van de Communication Layer te
activeren (`AGENTS_ENABLED` + `DATABASE_URL`). Het gedeelde schema (inclusief migratie 006) wordt op
boot toegepast zodra één van beide features aanstaat; `handleAgents` gate't op `agentsEnabled()`. De
invitation-bridge blijft comm-specifiek. Bewezen: agent-suite draait en slaagt met alleen
`AGENTS_ENABLED` gezet (12/12), boot toont "Comm: off / Agents: ENABLED", en zonder flags skippen de
E2E-tests netjes. Gedocumenteerd in `.env.example`.

**Commit:** branch `claude/maculis-team-agents-arch-cuybdp`. Geen deploy, geen infra/secret-wijziging.

---

## 2026-08-15 — Scope & ownership: Communication Layer grens (productbeslissing)

**Geen code-wijziging. Uitsluitend een vastgelegde scope/ownership-grens** (op verzoek), zodat
toekomstige sessies/agents niet vanuit de Communication-workstream buiten hun mandaat bouwen.

**De Communication Layer is en blijft eigenaar van de communicatie-primitieven en -state:**
inbound/outbound, conversations, drafts, AI-suggesties (human-in-the-loop), delivery + delivery
events, read-watermarks, attention-state, channel-adapters en betrouwbare relationship-linked
communicatie.

**Niet vanuit deze workstream bouwen of wijzigen** (behoren tot de Lens/First Five- of toekomstige
Future Cockpit-workstream): Reveal Engine, Reveal Gate, zakelijke thermometer, technische
website-thermometer, Lens 1, Lens 2, Future Cockpit-architectuur, GrowBrain, en nieuwe Relationship
Intelligence zonder bewezen databron.

**Twee vastgelegde architectuurpunten:**
1. De huidige Communication Layer is bewust zo gebouwd dat een toekomstige **Future Cockpit** hem
   later als **betrouwbare onderlaag** kan consumeren: `attentionOverview` (afgeleide, tenant-scoped
   attention-state), het conversation-level read-watermerk en de channel-agnostische adapters zijn
   stabiele primitieven, los van hun huidige UI-presentatie.
2. De huidige **Attention Cockpit is een operationele baseline, NIET de definitieve toekomstige
   Maculis Home.** De cockpit mag later opgaan in of vervangen worden door de Future Cockpit; de
   onderliggende communicatie-primitieven blijven dan de bron van waarheid.

**Lens 1-pilotbevinding (ter referentie, hoort NIET bij Communication):** bij een website zonder
Reveal komt in de huidige journey te weinig van de andere lagen terug. `SILENCE` bij de Reveal Gate
mag de héle journey niet stilleggen (SILENCE bij Reveal ≠ SILENCE van de journey); de Reveal Gate
wordt niet verlaagd. Dit wordt elders in de Lens/First Five-workstream opgepakt.

**Productie-baseline blijft ongewijzigd — geen rollback.**

---

## 2026-08-15 — Maculis Future Cockpit: onderzoek, architectuur en prototype (geen productie-rewrite)

**Type.** Strategische product-, UX- en informatiearchitectuuropdracht met prototype. Uitkomst is
besluitrijp, geen productie-vervanging. Productie (Testerbeheer, in/outbound mail, signature, Inbox,
drafts, AI-suggesties, human approval, threading, Pass the Lens, consent, First Five, attention layer)
bleef ongewijzigd. Alles additief onder `/cockpit.html`.

**Recovery-uitkomst (eerlijk).** Er bestaat geen eerder groter wit dashboardproduct in de history.
Wel: één licht/blauwe admin-skin (`2d49854`, FTRLABS-branding) die drie uur later donker herstyled werd
(`cfc0711`, "no functional/layout/API changes"). Zelfde testertabel. Het "grotere" gevoel was puur
esthetisch. Geen deleted files, geen mockups, geen designnotes van een groter dashboard.

**Voorstel.** Vandaag als primaire home die selecteert boven een aandachtshiërarchie
(Nu/Beweging/Klaar/Rust); Relaties als volledige universe; Gesprekken als omnichannel-laag binnen
relaties; Reveal als productbrede interactietaal met gate en provenance (feit/observatie/gevolgtrekking/
suggestie) in plaats van een First Five-feature. Aanbevolen visuele richting: C, Reveal / Work
(dual-space: donker om te zien, licht om te werken), gestart als richting A. Tegengas expliciet gegeven
(oud dashboard was niet groter; dual-space nooit meer dan twee ruimtes; Testerbeheer blijft als
journey-view).

**Prototype.** `public/cockpit.html` + `cockpit.css` + `cockpit.js`. CSP-safe (externe module, geen
inline handlers). Zes scenario's (quiet/comm/reveal/lens/scale/work), drie richtingen (A/B/C), de
"Kijk nog eens."-reveal met progressive disclosure, 520 fixture-relaties. Alle data gemarkeerd als
PROTOTYPE DATA. Deep-links `?dir=`/`?scn=`/`?expand=1`. Toegankelijk (aria, toetsenbord, reduced-motion,
mobile intent). Screenshots via headless Chromium (desktop + mobiel, alle richtingen en scenario's).

**Durable output.** `docs/MACULIS_FUTURE_COCKPIT.md` (current state, recovery, IA, attention model,
reveal model, relationship model, drie visuele richtingen, decision matrix, aanbeveling, tegengas,
acceptance questions A-N, migratiestrategie, prototype, ultieme test).

**Tests.** Bestaande suite ongewijzigd en groen (comm-tests skippen zonder DB, zoals ontworpen). Geen
productielogica geraakt. Branch `claude/maculis-future-cockpit-z9naou`.

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
