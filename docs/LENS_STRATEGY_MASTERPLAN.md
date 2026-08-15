# Maculis Lens Strategy Masterplan

> Strategisch en technisch werkdocument voor de volgende generatie Maculis lenzen en
> intelligence. Opgesteld als autonome deep research na de First Five pilot voorbereiding.
>
> **Datumcontext:** 2026-08-15
> **Status van dit document:** RESEARCH ONLY. Dit stuurt geen productiegedrag. Het is een
> beslismodel voor wat we na de First Five pilot activeren.
> **Scope-repos onderzocht:** `ftrprf-labs/website` (Testerbeheer, Communication Layer),
> `ftrprf-labs/maculis-first-five.` (First Five journey en de Reveal Engine).

## Leeswijzer en bewijsklassen

Dit document scheidt vier soorten uitspraken strikt. Elke niet triviale claim draagt een label.

- **FACT** : direct waarneembaar in de code, documentatie of officiële providerbron van vandaag.
- **INFERENCE** : logische gevolgtrekking uit meerdere feiten, niet zelf letterlijk waargenomen.
- **HYPOTHESIS** : plausibel, nog niet bewezen, moet in een pilot worden getoetst.
- **RECOMMENDATION** : een voorstel tot handelen, met motivatie.

Voorbeeldreveals in dit document zijn **hypothetisch** en expliciet als zodanig gemarkeerd.
Ze illustreren een vorm, ze zijn geen echte uitkomst over een echte klant.

Schrijfregel gerespecteerd: geen koppeltekens of gedachtestreepjes als stijlmiddel in dit stuk.

---

## Inhoud (42 deliverables)

1. Executive synthesis
2. Current State
3. Formal Lens Definition
4. First Five Deep Dive
5. Current Lens Expansion Opportunities
6. Lens Taxonomy
7. Unexpected Lens Concepts
8. Top Candidate Deep Dives
9. Finance Deep Dive
10. Finance API Matrix
11. Finance Zero Integration Model
12. Marketing Deep Dive
13. Marketing API Matrix
14. Other Integration Landscape
15. Zero Integration Strategy
16. Generic Lens Architecture
17. Connector Architecture
18. Cross Lens Intelligence
19. Relationship Intelligence
20. GrowBrain Bridge
21. Continuous Intelligence
22. Wow Model
23. Progressive Disclosure
24. Minimum Question / Information Gain
25. Competitive Landscape
26. Economics
27. Privacy
28. Security
29. Prioritization Model
30. Full Ranking
31. Lens 2 Recommendation
32. Lens 3 Recommendation
33. Lens 4 Recommendation
34. Anti Roadmap
35. Pilot Strategy
36. 30 Day Roadmap
37. 90 Day Roadmap
38. 12 Month Vision
39. Orchestrator Integration
40. Human Actions
41. Open Decisions
42. Sources

---

## 1. Executive synthesis

Maculis heeft iets zeldzaams gebouwd dat de meeste "business intelligence" spelers niet hebben:
een **Reveal Engine** die bewust zwijgt wanneer ze niets echt betekenisvols ziet. De kern is niet
een dashboard maar een selectieve waarnemer die één gegronde observatie durft te tonen en de rest
onderdrukt. Dat is het strategische bezit waarop de hele volgende generatie moet voortbouwen.

**Wat er echt staat (FACT).** De live eerste lens is de Website Outside In lens, geleverd via
First Five. Ze draait de gevroren `maculis-reveal-0.2.0` engine over publiek opgehaalde
website-evidence. De engine vormt Observaties, legt Relaties (CONTRADICTION, TELLING_ABSENCE,
MISCAST, DRIFT), maakt Kandidaten en laat een fail-closed Gate één reveal door of kiest SILENCE.
Daarnaast draait een aparte, deterministische Technical Signals laag (SEO, mobiel,
toegankelijkheid, techniek, beveiliging, performance) die nooit een reveal is maar een teaser.
De Communication Layer voegt een Relationship Workspace, een AI-first concept-antwoordflow en een
Relationship Memory met expliciete proposed/confirmed provenance toe. Pass the Lens (de organische
groeilus) is gebouwd, in productie en gesloten.

**Het centrale inzicht (INFERENCE).** De engine is al lens-agnostisch in haar botten. Het datamodel
kent vier lenzen (`zichtbaarheid`, `toestroom`, `verbondenheid`, `waarde`), maar de live pijplijn
extraheert vandaag **alleen `zichtbaarheid`-observaties**. De grootste eerste winst zit dus niet in
een compleet nieuwe lens, maar in het activeren van evidence-families die de bestaande engine al
kan verwerken. De architectuur voor "meerdere lenzen die samen meer zien" bestaat conceptueel al
in `cross_lens` en de RelationFamily-logica.

**De aanbeveling in één beeld.** Bouw niet breed, bouw diep en gelaagd.

- **Verbeter eerst de huidige lens** door tweede-oppervlak evidence toe te voegen (Google Business
  Profile publiek, reviews, vacatures, social vindbaarheid) zodat er meer **cross-lens**
  CONTRADICTION mogelijk wordt. Dit verhoogt de reveal-dichtheid zonder de Gate te verlagen.
- **Lens 2 = Reputatie en Marktpositie Outside In** (niet Finance). Reden: maximale waarde al op
  Level 1 zonder enige koppeling, hoge wow, laag privacyrisico, en het corroboreert de bestaande
  website-lens (belofte versus wat de buitenwereld zegt). Zie sectie 31.
- **Lens 3 = Finance Bring Your Data** (Level 2, bestandsgedreven, geen OAuth). De hoogste
  intrinsieke ondernemerswaarde, maar bewust op het bestandsniveau eerst, zodat we geen ERP
  integratieproject als toegangsdrempel opwerpen. Zie sectie 32.
- **Lens 4 = Commerciële Motor (Sales en Conversie), cross-lens** die Marketing-zichtbaarheid,
  Reputatie en Finance-signalen verbindt tot de relatie "bereik versus tractie versus marge". Dit
  is de eerste echte cross-lens lens en de brug naar continue intelligentie. Zie sectie 33.

**Wat we bewust NIET bouwen (zie sectie 34).** Geen generiek KPI-dashboard, geen exhaustive
website-audit (commodity), geen live bankkoppeling als eerste stap (te veel licentie- en
consentfrictie), geen automatische GrowBrain-verkoopknop onder elke reveal.

**GrowBrain en Relationship Intelligence.** Elke lens is een waarnemingsmoment. GrowBrain verschijnt
pas wanneer een observatie herkend is, een hypothese sterk genoeg is en een experiment passend is.
Relationship Intelligence legt vast wat iemand zag, herkende, verwierp en waar nieuwsgierigheid
ontstond, met dezelfde proposed/confirmed discipline die de Comm Layer al hanteert.

**Orchestrator.** Dit onderzoek mag niet in een chat verdwijnen. Sectie 39 en het bijgevoegde
`docs/orchestrator/lens-development-tasks.md` definiëren de task classes (LENS_RESEARCH tot
POST_PILOT_REVIEW) met inputs, outputs en gates, zodat lensontwikkeling herhaalbaar en uitvoerbaar
wordt.

Het ochtenddoel is gehaald wanneer de vraag niet meer is "wat zullen we nu eens bouwen", maar
"welke van de reeds onderzochte en geprioriteerde stappen activeren we nu".

---

## 2. Current State

Statuslabels conform de opdracht. Bron is directe code-inspectie tenzij anders vermeld.

### 2.1 Current State Map

| Onderdeel | Status | Bewijs (FACT) |
|-----------|--------|---------------|
| First Five journey (A19 ervaring) | **LIVE AND PILOTING** | `maculis-first-five.` repo, deploybaar, `/api/analyse`, MACULIS_FIRST_FIVE campagne |
| Reveal Engine `maculis-reveal-0.2.0` | **LIVE** (frozen) | `src/engine/*.ts`, "FROZEN, do not edit", verbatim herbruikt in live pijplijn |
| Website Outside In lens (`zichtbaarheid`) | **LIVE** | `observations.ts` tagt alle live observaties als `zichtbaarheid` |
| Lenzen `toestroom`, `verbondenheid`, `waarde` | **DESIGNED ONLY** | in `model.ts` gedeclareerd als `Lens`-type, niet geëxtraheerd door de live pijplijn |
| Technical Signals laag | **LIVE** | `src/live/technical.ts`, deterministisch, fail-closed teaser |
| First Impression thermometer (tweede evidence family) | **LIVE** | `src/live/lenses/first-impression.ts` |
| Testerbeheer / Invitation Manager | **LIVE** | `ftrprf-labs/website`, `server/index.mjs`, JSON-store |
| Communication Layer (Relationship Workspace, Inbox, AI drafts) | **BUILT BUT NOT ACTIVATED** in productie | code compleet (`server/comm/*`), maar `COMM_LAYER_ENABLED` + `DATABASE_URL` niet gezet in productie (BUILD_LOG 2026-08-15) |
| E-mail kanaal (Resend, outbound + inbound) | **BUILT, provider-connectable** | `providers/email.mjs`, `resend.mjs`; inbound inert zolang laag uit |
| WhatsApp / SMS / Phone / Social kanalen | **TESTED IN SANDBOX (MOCK)** | `providers/*`, "MOCK E2E verified, provider-connected = nee" |
| Relationship Memory (proposed/confirmed) | **BUILT BUT NOT ACTIVATED** | `server/comm/memory.mjs`, migratie `004_relationship_memory.sql` |
| Consent fail-closed model | **LIVE** | `store.mjs` `mayContact = OPTED_IN`, server-side 403 |
| Pass the Lens (organische groeilus) | **CLOSED (in productie, geaccepteerd)** | BUILD_LOG en `docs/pass-the-lens.md`: "gesloten; alleen heropenen bij concrete bevinding" |
| Intake-keten (`POST /api/intake`, INTAKE_KEY) | **LIVE** | `server/index.mjs`, server-to-server |
| GrowBrain | **RESEARCH ONLY** | geen code in deze repos; conceptueel in de opdracht |
| Maculis Orchestrator | **RESEARCH ONLY / DESIGNED** | geen orchestrator-code in deze repos; ontwerp in sectie 39 |
| Live bank / accounting connectors | **NOT STARTED** | geen connector-code; alles wat er is, is website-fetch |

### 2.2 Wat respecteren we expliciet als gesloten

- **Pass the Lens** is functioneel geaccepteerd en gesloten. Dit document behandelt het als een
  bestaand, werkend fundament voor Relationship Intelligence (sectie 19), niet als een uitnodiging
  tot nieuwe feature creep. Geen wijziging voorgesteld.
- **De Reveal Engine 0.2 is FROZEN.** Alle voorstellen die de engine raken lopen via een expliciete
  nieuwe engine-versie of via nieuwe evidence-extractie die de engine ONGEWIJZIGD voedt. De Gate
  verlagen voor een demo blijft verboden (engine-comment §18).

### 2.3 Belangrijkste architecturale waarheden (FACT) die alles hieronder sturen

1. De engine scheidt waarneming (Observation) van betekenis (Relation) van presentatie (Reveal),
   en houdt provenance (`basis: EvidenceRef[]`, met `quote` en `url`) bij tot in de reveal.
2. SILENCE, INSUFFICIENT en FAILURE zijn first-class uitkomsten. De engine liegt niet om iets te
   tonen.
3. De LLM-naad is streng begrensd (`BOUNDED_LLM_CONTRACT`): de LLM kiest alleen uit reeds
   gate-goedgekeurde kandidaten of kiest niets. De LLM mag geen feiten introduceren, de Gate niet
   veranderen, onderdrukte kandidaten niet reanimeren en geen causaliteit construeren.
4. De Comm Layer heeft de proposed/confirmed provenance-discipline al operationeel gemaakt in
   Relationship Memory. Dit is exact het model dat cross-lens intelligence nodig heeft.
5. Consent is fail-closed en losgekoppeld van lifecycle en evaluatie. Deze drie dimensies
   overschrijven elkaar nooit.

---

## 3. Formal Lens Definition

### 3.1 Wat een lens NIET is

Een Maculis lens is geen dashboard, geen rapportgenerator, geen verzameling KPI's, geen AI
samenvatting, geen checklist en geen willekeurige anomaliedetector. Al deze dingen tonen data.
Een lens toont **betekenis die de ondernemer zelf nog niet scherp had**.

### 3.2 Wat een lens WEL is (productdefinitie)

> Een Maculis lens is een begrensde waarnemer over één domein van de onderneming die uit gegronde
> evidence een relatie tussen signalen legt, en daaruit hooguit één betekenisvolle observatie
> onthult die de ondernemer nog niet zag, onvoldoende scherp zag, verkeerd interpreteerde, los van
> andere signalen bekeek of onderschatte. Een lens die niets betekenisvols ziet, zwijgt.

Een lens helpt de ondernemer iets te zien wat hij nog niet zag, of nog niet in relatie had
gebracht. Zwijgen is een geldige, eervolle uitkomst (FACT: `EngineOutcome = SILENCE` is een
succespad in `engine.ts`).

### 3.3 Het Lens Value Model

De opdracht vraagt een formeel waardemodel. De bestaande engine implementeert de eerste helft
hiervan al letterlijk. De keten:

```
EVIDENCE      → een gegrond, herleidbaar feit (EvidenceRef: surface, url, quote, observed_at)   [engine: FACT]
RELATION      → een spanning tussen evidence (CONTRADICTION / TELLING_ABSENCE / MISCAST / DRIFT)  [engine: FACT]
OBSERVATION   → een benoemde waarneming per lens (Observation.kind)                               [engine: FACT]
REVEAL        → de ene doorgelaten, gegronde onthulling (Reveal, na de Gate)                      [engine: FACT]
RECOGNITION   → de ondernemer reageert: ja / deels / nee (Recognition)                            [engine: FACT]
MEANING       → waarom dit ertoe doet (Relation.why_might_matter)                                 [engine: FACT]
CURIOSITY     → de ondernemer wil verder kijken (progressive disclosure, sectie 23)               [DESIGN]
DEEPER CONTEXT→ tweede evidence, aangrenzende lens, één gerichte vraag (sectie 24)                [DESIGN]
POSSIBLE ACTION → een passend experiment, niet een verkoopknop (GrowBrain, sectie 20)            [DESIGN]
LEARNING      → de uitkomst voedt Relationship Intelligence (sectie 19)                          [DESIGN]
```

**INFERENCE.** De eerste zes stappen bestaan al in productiecode. De laatste vier (CURIOSITY tot
LEARNING) zijn het bouwwerk dat de volgende generatie moet toevoegen, en ze zijn lens-onafhankelijk.
Dat is precies waarom een gedeelde engine (sectie 16) de juiste investering is.

### 3.4 De epistemische ladder (waar AI wel en niet thuishoort)

De opdracht eist harde scheidingen. De engine dwingt ze al deels af. Voorgestelde canonieke ladder,
met per trede waar deterministische logica eindigt en waar (begrensde) AI mag beginnen:

| Trede | Definitie | Wie mag dit produceren | Engine-anker (FACT) |
|-------|-----------|------------------------|---------------------|
| FACT | letterlijk waargenomen, met bron en citaat | deterministisch | `EvidenceRef` |
| OBSERVED SIGNAL | benoemde waarneming | deterministisch | `Observation` |
| DERIVED METRIC | berekend uit feiten | deterministisch | (nieuw, sectie 16) |
| CORRELATION | twee signalen bewegen samen | deterministisch, gelabeld | `Relation.cross_lens` |
| PATTERN | herhaalde correlatie of clustering | deterministisch | `proof_cluster` |
| HYPOTHESIS | plausibele verklaring, onbewezen | AI mag voorstellen, mens bevestigt | `novelty: hypothesised_new` |
| INTERPRETATION | duiding van betekenis | begrensde AI op gate-passed input | `phrase()` in `candidates.ts` |
| RECOMMENDATION | voorstel tot handelen | GrowBrain, expliciet apart | verboden in reveal-copy (`FORBIDDEN_REVEAL_PHRASING`) |
| CAUSAL CLAIM | X veroorzaakt Y | **nooit automatisch** | Gate verbiedt causale taal |
| CONFIRMED RELATIONSHIP MEMORY | door mens bevestigd, duurzaam | mens bevestigt | `confidence: 'confirmed'` |

**Harde regel (FACT, al afgedwongen).** De Gate `defensible`-check verwerpt copy met causale of
aanbevelingstaal, en de `BOUNDED_LLM_CONTRACT` verbiedt de LLM causaliteit te construeren. Geen
hypothese wordt als feit gepresenteerd: AI-afgeleide items zijn `proposed` tot een mens bevestigt.

### 3.5 Revealworthiness als formeel begrip

Uit de Gate (FACT) destilleren we de definitie van "de moeite waard om te tonen". Een kandidaat is
revealworthy als hij tegelijk: het bewijsniveau haalt (minimaal L3), niet al door de organisatie
zelf benoemd is, specifiek is (geen sector-wallpaper), niet generiek is, verdedigbaar is (niet
causaal, niet leunend op één enkele externe bron), betekenisvol is (raakt een beslissing), en
aandacht waard is (onweerlegbare enkel-oppervlak-kloof OF cross-lens gecorroboreerd). Dit is de
strengste selectiepoort in de markt en het belangrijkste te bewaken bezit.

---

## 4. First Five Deep Dive

### 4.1 Wat de huidige lens daadwerkelijk ziet (FACT)

De live pijplijn (`src/live/pipeline.ts`, `observations.ts`) haalt publieke pagina's op (home,
over, en enkele pagina's) en leidt daaruit af:

- **Etalage-termen** (`self_emphasis`, L0): wat de site vooraan zet (title, H1, meta, hoofdmenu).
- **Inhoudstermen** (`proof_emphasis`, L0 of L2): waar de bodytekst gewicht op legt, L2 bij
  aanwezigheid op meerdere pagina's.
- **Case-clustering** (`proof_cluster`, L1 of L2): concentratie van cases in één sector.
- **Externe signalen** (`external_signal`, L1): meegegeven reviews en vacatures als quotes.
- **Expliciete claims en operationele feiten** (`self_claim`, `operational_fact`) met flags
  (`contradicted_by`, `discontinued`, `acknowledged`, `promise_negation`).

Daaruit legt de engine relaties: belofte versus eigen operationele tekst (CONTRADICTION), claim
zonder enig bewijs (TELLING_ABSENCE), kracht die de inhoud draagt maar niet in de etalage staat en
door een externe bron juist wél benoemd wordt (MISCAST), en verhaal dat achterloopt op wat nog
geleverd wordt (DRIFT).

### 4.2 Wat Technical Signals toevoegt (FACT)

Een aparte, bewust bescheiden laag leidt technische feiten af uit de HTML die de analyse toch al
ophaalde (geen extra netwerk, geen scanner). Domeinen: performance, seo, mobiel, toegankelijkheid,
techniek, beveiliging. De publieke teaser is fail-closed: minimaal twee zekere signalen, minstens
één substantieel bewijs (severity medium of hoog met een menselijke `proof_line`), en een
gewichtssom van minstens drie. Beveiligingssignalen dragen bewust nooit de publieke proof (voelt
als een scan). Dit is geen reveal en geen observatie: het is een objectief technisch feit,
losstaand van het inhoudelijke patroon.

### 4.3 Kritische beoordeling: waar de huidige lens sterk is

- **Grounding is de kern van de geloofwaardigheid.** Elk inzicht draagt een verbatim citaat en een
  bron-URL. Dit is de UX-observatie uit de acceptatietest van 2026-08-15 (FACT, First Five docs):
  behouden.
- **Fail closed is terecht.** SILENCE bij dun bewijs voorkomt de grootste faalmodus van AI-advies:
  overtuigend klinkende trivialiteit.
- **Precies één reveal.** De DeterministicSelector kiest er één (familieprioriteit, dan niveau, dan
  cross-lens). Dit dwingt focus af en voorkomt de dashboard-val.

### 4.4 Waar de huidige lens dun is (INFERENCE)

- **Slechts één lens-oppervlak actief.** Alle live observaties zijn `zichtbaarheid`. Daardoor kan
  `cross_lens` in de praktijk zelden true worden, terwijl de Gate cross-lens corroboratie juist als
  volwaardig alternatief voor onweerlegbaarheid accepteert. Meer evidence-families verhogen direct
  de reveal-dichtheid zonder de Gate te verlagen.
- **Externe signalen zijn nu input, geen acquisitie.** Reviews en vacatures moeten worden
  meegegeven; ze worden niet zelf opgehaald. Dit is de grootste laaghangende verbetering (sectie 5).
- **MISCAST enkel-oppervlak blijft vaak onder de drempel** (`sufficient_for_candidate` alleen bij
  externe echo). Zonder externe bron produceert MISCAST L1/L2 en haalt de L3-vloer niet.

### 4.5 Evidence-family beoordeling voor de HUIDIGE lens

Per kandidaat-evidence-family: advies om de huidige lens beter te maken zonder de productie-selector
te verbreden zonder pilot-aanleiding.

| Evidence family | Bron | Determ.? | AI nodig? | False-positive risico | Revealworthy voorbeeld (HYPOTHETISCH) | Advies |
|-----------------|------|----------|-----------|-----------------------|----------------------------------------|--------|
| Google Business Profile (publiek) | publieke GBP-pagina | ja (parse) | nee | laag | "Je site belooft 24/7 bereikbaarheid. Je Google-profiel toont openingstijden tot 17:00." | **BUILD** |
| Publiek reviewsentiment/rating | publieke reviewbron | deels | duiding | midden | "Klanten roemen je nazorg. Je etalage noemt nazorg nergens." (MISCAST cross-lens) | **BUILD** |
| Vacatures (publiek) | publieke vacaturepagina | deels | duiding | midden | "Je werft 'senior' terwijl je site 'grootste team van de regio' claimt zonder team te tonen." | **RESEARCH** |
| Structured data / schema.org | HTML | ja | nee | laag | reeds deels in Technical Signals | **BUILD (verbreden)** |
| Concurrent-positionering | publieke concurrent-site | deels | duiding | hoog | "Drie concurrenten claimen exact jouw kernwoord in hun title." | **RESEARCH** |
| Prijs-communicatie aanwezig? | HTML | ja | nee | laag | "Je noemt 'transparante prijzen' maar nergens staat een prijs." (CONTRADICTION) | **BUILD** |
| Social vindbaarheid | publieke profielen | deels | nee | midden | "Je site linkt naar LinkedIn, maar dat profiel is twee jaar stil." (DRIFT-achtig) | **WAIT** |
| Zoekvraag versus belofte | zoekdata (heeft koppeling) | nee | ja | midden | vergt Search Console (Level 3), zie sectie 12 | **WAIT** |

**RECOMMENDATION.** Verbreed de productie-selector niet zonder echte pilot-aanleiding (opdracht §E).
Voeg wel de laaghangende, deterministische, publieke families toe (GBP, prijscommunicatie, schema)
achter een expliciete evaluatie, want ze verhogen cross-lens dichtheid en blijven fail-closed.

---

## 5. Current Lens Expansion Opportunities

Concrete, geprioriteerde verbeteringen aan de HUIDIGE lens, zonder de engine te wijzigen. Alle
opties voeden de bestaande engine met nieuwe evidence of activeren latente lens-oppervlakken.

### 5.1 Activeer de latente lens-oppervlakken (grootste hefboom)

De engine kent al vier lenzen. De live pijplijn tagt alles als `zichtbaarheid`. Door observaties
ook onder `toestroom`, `verbondenheid` en `waarde` te labelen wordt `cross_lens` in relaties echt
haalbaar, en dat is precies wat de Gate als volwaardig alternatief voor onweerlegbaarheid
accepteert (FACT: `attention_worthy` in `gate.ts`).

- **`zichtbaarheid`** (bestaand): hoe presenteert de site zichzelf.
- **`toestroom`**: signalen over hoe bezoekers of vraag binnenkomen. Outside In waarneembaar via
  aanwezigheid van analytics/pixels, CTA-dichtheid, contact-drempels, formulierlengte, aanwezigheid
  van een offerte/afspraak-pad.
- **`verbondenheid`**: signalen over relatie en bewijs. Reviews, testimonials, cases, teamtonen,
  nazorg-taal, garantie-taal.
- **`waarde`**: signalen over prijs en propositie. Prijscommunicatie aanwezig of niet,
  waardetermen, differentiatietaal, garanties.

**RECOMMENDATION.** Dit is een evidence-labeling verbetering, geen engine-wijziging. Prioriteit 1.

### 5.2 Zelf ophalen van tweede-oppervlak evidence

Vandaag zijn reviews en vacatures input. Door publieke bronnen zelf op te halen ontstaan
`external_signal`-observaties die MISCAST cross-lens en CONTRADICTION voeden.

| Bron | Hoe (fair, publiek) | Levert | Friction (FACT uit API-research) |
|------|---------------------|--------|-----------------------------------|
| Google reviews (rating + snippets) | Places API (New), API-key only, geen consent | rating, aantal, enkele snippets | LAAG, wel per-call kost (~$25/1000 detail-calls) |
| Publieke GBP-info | Places API of publieke listing | openingstijden, categorie, adres | LAAG |
| Reviews elders (aggregate) | publieke widget/pagina, respecteer ToS | rating + aantal | LAAG, nooit scrapen |
| Vacatures | publieke vacaturepagina van de site zelf | groei- en positioneringssignaal | LAAG |
| Social presence | publieke profielen | aanwezigheid, cadans | LAAG, geen scraping van afgeschermde data |

**Belangrijk (FACT).** Scraping van Google reviews of Trustpilot schendt hun ToS. Gebruik Places
API of officiële widgets. Nooit scrapen.

### 5.3 UX: gelaagdheid zonder inhoud te verliezen

Uit de First Five UX-observatie (FACT): het SILENCE-scherm stapelt te veel tegelijk, waardoor het
gevoel verschuift van "Maculis laat mij iets zien" naar "ik lees een rapport". Zie sectie 23
(progressive disclosure). Dit is een aparte, goed te keuren UX-ronde, geen inhoud schrappen.

### 5.4 Wat NIET te doen aan de huidige lens

- Geen actieve scanners of externe audits toevoegen (voelt als een scan, botst met de ethiek van
  Technical Signals die beveiliging bewust nooit als publiek bewijs toont).
- De Gate niet verlagen om vaker een reveal te tonen. Reveal-dichtheid komt uit meer evidence, niet
  uit een lagere drempel.

---

## 6. Lens Taxonomy

Een lens is een domein-configuratie boven de gedeelde engine (sectie 16). De taxonomie ordent
kandidaat-lenzen langs twee assen die er echt toe doen: **hoeveel waarde al op Level 1 (Outside In,
geen koppeling) mogelijk is**, en **de intrinsieke ondernemerswaarde van het domein**. Level 1
waarde weegt zwaar mee in prioritering (opdracht §K).

### 6.1 De domeinen (met Level 1 potentieel)

Legenda Level 1 potentieel: hoog = substantiële reveals mogelijk uit publieke evidence alleen;
midden = enkele; laag = vergt koppeling of eigen data.

| Domein | Level 1 potentieel | Kern-relatie die de lens onthult |
|--------|--------------------|-----------------------------------|
| Zichtbaarheid (bestaand) | hoog | belofte versus bewijs op de eigen site |
| Reputatie en Marktpositie | **hoog** | belofte versus wat de buitenwereld zegt |
| Marketing en Vindbaarheid | midden (hoog met koppeling) | bereik versus tractie |
| Sales en Conversie | midden | interesse versus omzet |
| Klant en Klantbeleving | midden | acquisitie versus retentie |
| Prijs en Marge | laag | prijs versus bewezen waarde |
| Finance en Cash | laag (hoog met eigen data) | groei versus cash en marge |
| Mensen en Organisatie | midden | groei versus capaciteit en cultuur |
| Werkgeversmerk en Recruitment | midden | vacaturedruk versus reputatie |
| Strategie en Toekomstbestendigheid | laag | afhankelijkheid en overdraagbaarheid |
| Digitale en AI-volwassenheid | midden | belofte van modern versus feitelijke digitale sporen |
| Risico, Governance, Cyber | midden | zichtbare risicosignalen |
| Duurzaamheid | midden | duurzaamheidsclaim versus bewijs |

### 6.2 Ordening naar bouwvolgorde-geschiktheid

- **Nu waarde op Level 1, corroboreert bestaande lens:** Reputatie en Marktpositie, verdere
  Zichtbaarheid, Digitale volwassenheid.
- **Hoge waarde maar vergt eigen data of koppeling:** Finance, Prijs en Marge.
- **Cross-lens van nature (bouwt op meerdere oppervlakken):** Sales en Conversie, Klant.
- **Belangrijk maar later:** Mensen, Strategie, Risico, Duurzaamheid.

Dit is de bron voor de rangschikking in sectie 30.

---

## 7. Unexpected Lens Concepts

De opdracht vraagt minimaal tien onverwachte lensconcepten uit combinaties, en daarna alleen de
echt interessante te selecteren. Onverwachte lenzen ontstaan waar twee signalen die de ondernemer
apart bekijkt in relatie komen. Alle voorbeelden hieronder zijn HYPOTHESES over vormen, geen
uitspraken over een echte klant.

1. **De Belofte-Bewijs Kloof (cross-lens Zichtbaarheid x Reputatie).** De site belooft iets wat de
   buitenwereld nergens bevestigt, of andersom: klanten roemen iets wat de etalage verzwijgt. Bouwt
   direct op de bestaande MISCAST-familie. **INTERESSANT, wordt Lens 2.**

2. **De Stille Groeimotor (Reputatie x Waarde).** De hoogst gewaardeerde dienst is niet de duurst
   gepositioneerde. De onderneming onderprijst haar bewezen kracht. **INTERESSANT.**

3. **Bereik zonder Tractie (Marketing x Sales).** Zichtbaarheid en verkeer groeien, maar de
   conversiepaden op de site worden dunner of verdwijnen. **INTERESSANT, kern van Lens 4.**

4. **Groei die Cash opeet (Finance x Operations).** Omzetgroei gaat samen met dalende cash. Het
   klassieke, dodelijke, onzichtbare patroon voor gezonde-ogende bedrijven. **INTERESSANT.**

5. **De Krimpende Marge onder Groei (Finance x Prijs).** Omzet stijgt, marge daalt. Groei verbergt
   verslechterende economics. **INTERESSANT, Finance deep dive.**

6. **De Oprichter als Bottleneck (Mensen x Strategie).** Team groeit, maar alles wijst nog naar één
   persoon (contactpagina, over-ons, ondertekening, e-mailadressen). Overdraagbaarheidsrisico.
   **INTERESSANT maar zwak op Level 1.**

7. **Klantconcentratie-Risico (Finance x Klant).** Eén klant of segment wordt dominant. Verborgen
   fragiliteit achter een gezonde omzet. **INTERESSANT, vergt eigen data.**

8. **Recruitment tegen Reputatie in (Recruitment x Werkgeversmerk).** Vacaturedruk stijgt terwijl
   de werkgeversreputatie of het teamverhaal verzwakt. **INTERESSANT.**

9. **De Verouderde Belofte (Zichtbaarheid x Tijd, DRIFT).** De site adverteert nog wat niet meer
   geleverd wordt. Bestaat al als DRIFT-familie; wordt sterker met continue snapshots (sectie 21).
   **INTERESSANT.**

10. **AI-Etalage zonder Fundament (Digitale volwassenheid x Bewijs).** De site claimt "AI-gedreven"
    of "data-gedreven" terwijl er geen enkel digitaal spoor is dat dat staaft (geen analytics, geen
    structured data, dunne techniek). **INTERESSANT en zeer actueel.**

11. **Prijsstijging zonder Waardebewijs (Waarde x Reputatie).** Positionering schuift omhoog zonder
    dat bewijs meebeweegt. **INTERESSANT.**

12. **Duurzaamheidsclaim zonder Spoor (Duurzaamheid x Bewijs).** Groene belofte, geen enkel
    verifieerbaar bewijs. Greenwashing-risico dat de ondernemer zelf niet ziet. **INTERESSANT.**

**Selectie van de echt interessante:** 1, 3, 4, 5, 10. Deze vijf combineren hoge wow met een reële
relatie die de ondernemer zelf zelden legt, en vier ervan hebben substantieel Level 1 of
Level 2 potentieel. Nummer 1 wordt Lens 2, nummer 3 wordt de kern van Lens 4, nummers 4 en 5
zitten in de Finance deep dive, nummer 10 is een krachtige toevoeging aan de bestaande lens.

---

## 8. Top Candidate Deep Dives

Vier topkandidaten, elk uitgewerkt tot lensvorm. Deep dives voor Finance en Marketing staan apart
(secties 9 tot 13). Reveals zijn HYPOTHETISCH.

### 8.1 Reputatie en Marktpositie Outside In (kandidaat Lens 2)

- **Wat de lens ziet:** de eigen belofte (uit de bestaande website-analyse) naast wat de
  buitenwereld publiek zegt: Google-rating en review-thema's, aanwezigheid en cadans op sociale
  kanalen, vacaturetaal, en optioneel enkele concurrent-signalen.
- **Kern-relatie:** CONTRADICTION en MISCAST tussen etalage en buitenwereld. Dit is exact de
  bestaande engine, gevoed met een tweede oppervlak.
- **Level 1 waarde:** hoog. Places API levert rating, aantal en snippets zonder consent.
- **Wow (HYPOTHETISCH):** "Je site zet snelheid vooraan. Je klanten schrijven vooral over hoe
  persoonlijk je bent. Je verkoopt jezelf op het verkeerde."
- **Waarom Lens 2:** zie sectie 31.

### 8.2 Commerciële Motor: Bereik versus Tractie (kandidaat Lens 4)

- **Wat de lens ziet:** de relatie tussen vindbaarheid en zichtbaarheid enerzijds en de
  conversie-infrastructuur op de site anderzijds, en (met koppeling) echte zoekvraag versus
  conversie.
- **Kern-relatie:** een cross-lens TELLING_ABSENCE: veel bereiksignalen, weinig tractiepad.
- **Level 1 waarde:** midden. Level 3 (Search Console, GA4) maakt dit sterk.
- **Wow (HYPOTHETISCH):** "Mensen vinden je op 'spoedhulp'. Maar op je site staat nergens hoe je
  met spoed geholpen wordt."
- **Waarom Lens 4:** zie sectie 33.

### 8.3 Finance en Cash (kandidaat Lens 3)

Zie sectie 9. Samengevat: hoogste intrinsieke waarde, bewust op bestandsniveau (Level 2) eerst.

### 8.4 Digitale en AI-Volwassenheid

- **Wat de lens ziet:** het verschil tussen de digitale belofte van de onderneming en haar
  feitelijke digitale sporen (analytics, structured data, technische hygiëne uit Technical Signals,
  moderne vindbaarheid).
- **Kern-relatie:** CONTRADICTION tussen "wij zijn modern of data-gedreven" en de afwezigheid van
  elk digitaal fundament.
- **Level 1 waarde:** midden tot hoog, want de Technical Signals-laag levert al veel van de
  evidence.
- **Wow (HYPOTHETISCH):** "Je noemt jezelf data-gedreven. Op je eigen site staat geen enkel
  meetpunt en geen enkele structured-data-markering."
- **Positionering:** sterker als uitbreiding van de bestaande lens dan als losse lens (sectie 5).

---

## 9. Finance Deep Dive

Finance is geen boekhouddashboard. De lens onthult relaties die de ondernemer los bekijkt.

### 9.1 Revealworthy financiële relaties (HYPOTHESES over vorm)

| Relatie | Wat het onthult | Familie-analoog | Min. evidence |
|---------|------------------|-----------------|----------------|
| Groei versus cash | omzet stijgt, cash daalt | CONTRADICTION | omzetreeks + cashreeks |
| Groei versus marge | omzet stijgt, brutomarge daalt | CONTRADICTION | omzet + marge over tijd |
| Omzetconcentratie | één klant wordt dominant | TELLING_ABSENCE (spreiding) | omzet per klant |
| DSO-verslechtering | debiteuren lopen op, cash vertraagt | DRIFT | openstaande posten over tijd |
| Cash conversion zwak | winst op papier, geld komt niet binnen | CONTRADICTION | P&L + cashmutaties |
| Marketing spend versus omzet | uitgaven groeien sneller dan opbrengst | CONTRADICTION | kosten + omzet |
| Personeel versus omzet | headcount groeit sneller dan omzet | CONTRADICTION | loonkosten + omzet |
| Seizoenspatroon miskend | vaste lasten in dalmaanden | PATTERN | omzet per maand |
| Recurring versus eenmalig | schijnstabiliteit, hoge churn eronder | MISCAST | omzet naar type |

### 9.2 Confidence en minimale evidence

Elke financiële reveal moet minimaal L3 halen (engine-vloer). Voor Finance betekent dat: minstens
twee periodes (om een beweging te tonen), of een verhouding die alleen betekenis krijgt in
context. Eén getal is nooit een reveal ("je omzet is 8% gestegen" is triviaal, zie sectie 22). De
reveal ontstaat uit de **relatie tussen twee financiële bewegingen**, precies zoals de engine
tussen twee observaties een relatie legt.

### 9.3 Waarom Finance bewust Lens 3 is en niet Lens 2

Finance heeft de hoogste intrinsieke waarde maar het laagste Level 1 potentieel: publiek is er
vrijwel geen betrouwbare financiële evidence. Finance vraagt of eigen bestanden (Level 2) of een
koppeling (Level 3). De opdracht weegt Level 1 waarde zwaar mee, en waarschuwt expliciet dat een
ondernemer niet eerst een ERP-integratieproject moet hoeven starten. Daarom: Finance als Lens 3,
en dan op bestandsniveau eerst (sectie 11).

---

## 10. Finance API Matrix

Bron: officiële developer-documentatie, geraadpleegd augustus 2026 (zie sectie 42). Onderscheid:
accounting-API's leveren grootboek, P&L, balans en openstaande posten. Payment-API's leveren
cashflow en ontvangsten, geen grootboek. Bank-API's (PSD2) leveren rauwe rekening- en
transactiedata onder een vergunningsplicht.

### 10.1 Accounting providers (NL)

| Provider | API | Auth | Sandbox | Partner-review | Webhooks | Rate limit | Data-diepte | Effort / friction |
|----------|-----|------|---------|----------------|----------|------------|-------------|-------------------|
| **Moneybird** | REST/JSON | OAuth2, tokens verlopen niet | trial-admin | laag, self-serve | **ja, first-class** | gedoc. (429) | facturen, bankmutaties, grootboek; lichter op formele balans/P&L | **laag / laag** |
| **Exact Online** | REST + legacy XML | OAuth2, access 10 min, refresh roteert | eigen/trial company | **ja, App Center + Data&Security review** | ja | **60/min, 5000/dag per company** | zeer breed: grootboek, P&L, balans, openstaande posten | medium / **medium-hoog** |
| **Twinfield** | SOAP/XML + OAuth2/OIDC | OAuth2 + OIDC | trial-offices | client-registratie + partner | nee (polling) | niet gepub. | volledig: grootboek, balans, P&L, openstaande posten | **hoog** / medium |
| **SnelStart** | REST (Azure APIM) | subscription key + maatwerksleutel, token 1u | trial-admin | subscription + per-klant key | nee | via APIM | facturen, grootboek, bank, journaal, btw | medium / medium |
| **e-Boekhouden.nl** | SOAP + nieuwere REST | SOAP codes / REST token | trial-admin | self-serve | nee | licht gedoc. | mutaties, facturen, grootboek, saldi, btw | REST laag, SOAP medium / **laag** |
| **AFAS** | REST (Get/UpdateConnectors) | AfasToken (per-klant AppConnector) | demo voor klanten | per-klant whitelisting | nee (polling) | niet gepub. | configureerbaar: transacties, grootboek, openstaande posten | medium / **hoog per klant** |
| **Yuki** | SOAP | API-key + admin-id + sessie | in domein | **accountant is gatekeeper** | nee | **1000 calls/dag** | GL, balans, transacties, verkoopfacturen | medium / **medium-hoog** |
| **Visma eAccounting (Spiris)** | REST | OAuth2, scope ea:api + offline_access | **ja, self-service sandbox** | partner-registratie voor productie | beperkt | gedoc. (429) | facturen, journaal, grootboek, bank | laag-medium / medium; **dunne NL-basis** |

### 10.2 Payment providers

| Provider | API | Auth | Data | Webhooks | Effort/friction | Opmerking |
|----------|-----|------|------|----------|-----------------|-----------|
| **Mollie** | REST | API-keys, org-tokens, OAuth (Connect) | payments, refunds, settlements, **Balances + Balance Report** | ja | **laag/laag** | NL-native, beste dekking NL-merchants; cashflow, geen grootboek |
| **Stripe** | REST | API-keys, Connect OAuth | charges, balance, payouts, Reporting API | ja, uitgebreid | laag/laag | NL SMB skewt naar Mollie/bank voor iDEAL |

### 10.3 Open banking (PSD2) providers

| Aggregator | Wat | Vergunning-model | NL-dekking | Pricing | Status/friction |
|------------|-----|-------------------|------------|---------|-----------------|
| **Ponto (Isabel)** | rekening, saldo, transacties | eigen AISP, jij als agent | **sterk Benelux/NL** | usage-based, maandelijks, gratis sandbox | **beste NL-fit**, medium |
| **Tink (Visa)** | idem, ~3400 banken | agent onder Tink-licentie | breed EU | enterprise/contract | medium-hoog, sales-led |
| **GoCardless Bank Account Data (ex-Nordigen)** | idem, was gratis | Nordigen AISP | breed | was gratis | **NIET adopteren: gesloten voor nieuwe signups, docs offline 24 aug 2026** |
| Enable Banking / Yapily | alternatieven | eigen/agent | EU/NL | contract | opkomend, alternatief nu Nordigen dicht is |

**Regelgeving (FACT, richting).** De EU verschuift van PSD2 naar PSD3 plus de Payment Services
Regulation en een Financial Data Access (FIDA) kader. Effect: hogere API-kwaliteitseisen aan banken
en mogelijk bredere open-finance datacategorieën. Toepassingsdatums liggen voorbij 2026. Praktisch:
bouw vandaag op PSD2/AISP, verwacht een kwaliteitsuplift, geen teardown.

### 10.4 Integration Attractiveness Score (gewogen)

Gewichten: NL SMB-dekking (0.30), value-of-data (0.25), lage friction (0.20), lage effort (0.15),
webhooks/versheid (0.10). Score 1 tot 5 per as.

| Provider | Dekking | Data | Friction | Effort | Versheid | **Gewogen** |
|----------|---------|------|----------|--------|----------|-------------|
| Moneybird | 4 | 4 | 5 | 5 | 5 | **4.35** |
| Ponto (PSD2) | 4 | 5 | 3 | 3 | 5 | **4.05** |
| Exact Online | 5 | 5 | 2 | 3 | 4 | **3.95** |
| Mollie | 4 | 3 | 5 | 5 | 5 | **4.10** |
| e-Boekhouden | 3 | 3 | 5 | 4 | 2 | **3.35** |
| SnelStart | 3 | 4 | 3 | 3 | 2 | **3.05** |
| Twinfield | 4 | 5 | 3 | 2 | 2 | **3.45** |
| Visma | 2 | 4 | 3 | 4 | 3 | **2.95** |
| AFAS | 4 | 4 | 2 | 3 | 2 | **3.10** |
| Yuki | 3 | 4 | 2 | 3 | 2 | **2.85** |

**TOP 3 eerst bouwen:** Moneybird (beste value-to-friction), Mollie (laagdrempelige cashflow-laag),
Ponto voor PSD2 (hoogste signaal, aggregator-licentie vermijdt eigen DNB-traject).
**TOP 3 later:** Exact Online (strategisch nodig voor NL-dekking, zwaardere onboarding), Twinfield
(rijke data, hoge effort), SnelStart.
**Niet aantrekkelijk nu:** AFAS en Yuki (toegang per klant gated door config of accountant),
Visma (dunne NL-basis), GoCardless BAD (gesloten). Motivatie per stuk in de matrix hierboven.

---

## 11. Finance Zero Integration Model

Level 1 en Level 2 Finance zonder OAuth. Doel: eerste waarde zonder ERP-project.

### 11.1 Wat een ondernemer al heeft liggen

CSV, XLSX, PDF-jaarrekening, proef- en saldibalans, P&L, balans, openstaande-posten-export,
bank-CSV, factuurexport, of een handvol handmatig ingevoerde kerngetallen.

### 11.2 Veilige ingestion-pijplijn

```
upload → file detection → schema inference → validation → normalization → provenance → confidence → analysis → reveal candidates
```

- **file detection:** MIME + inhoud, nooit alleen extensie.
- **schema inference:** herken kolommen (datum, bedrag, klant, grootboek) heuristisch, toon de
  interpretatie ter bevestiging (zelfde patroon als de bestaande CSV/XLSX-import in `import.mjs`,
  FACT: die mapping-en-preview-flow bestaat al in Testerbeheer).
- **validation:** afkeuren wat niet klopt, met een menselijke uitleg.
- **provenance:** elk afgeleid getal draagt de bron (bestand, rij, kolom), net als `EvidenceRef`.
- **confidence:** handmatige invoer is lager dan een geëxporteerd bestand.

### 11.3 Minimum input voor first value (RECOMMENDATION)

Twee periodes van drie kerngetallen (omzet, brutomarge, cash) volstaan voor de eerste
groei-versus-cash of groei-versus-marge reveal. Vraag nooit meer dan nodig (sectie 24). Een
ondernemer mag niet eerst een integratieproject starten.

### 11.4 Level 2 als bewuste eerste stap voor Finance

De bestaande Testerbeheer-import (kolomherkenning, groen/oranje/rood preview, dedup, validatie) is
een direct herbruikbaar patroon voor financiële bestands-ingestion. Dit maakt Finance Level 2
technisch dichtbij zonder enige providerrelatie.

---

## 12. Marketing Deep Dive

### 12.1 De relaties die de Marketing-lens onthult

Marketing is geen kanaalrapport. De lens onthult relaties: belofte versus bewijs, verkeer versus
conversie, content versus vraag, zichtbaarheid versus commercieel resultaat, campagne-uitgave
versus feitelijke omzet, kanaalmix versus afhankelijkheid, leadvolume versus leadkwaliteit.

### 12.2 Waarom een sterke Zero Integration Marketing-lens kan

Uit de API-research (FACT): veel marketing-signaal is al publiek waarneembaar zonder OAuth. De
eigen website-HTML, structured data, Open Graph, aanwezigheid van analytics/pixels, publieke
Google-rating en review-aantal via Places, en publieke social-aanwezigheid. Daarmee kan een
Marketing-lens Level 1 waarde leveren (belofte versus bewijs, vindbaarheids-hygiëne) voordat er ook
maar één koppeling is.

### 12.3 Waar koppeling echt nodig is (FACT)

Zoekvraag (queries, impressies, posities), sessies en conversies, de volledige review-corpus met
antwoorden, en advertentie-uitgave en campagneprestaties zijn niet Outside In waarneembaar. Die
vragen Search Console, GA4, GBP of de ad-platforms.

---

## 13. Marketing API Matrix

Bron: officiële developer-documentatie augustus 2026 (sectie 42). Exacte quota-getallen: verifieer
tegen de live doc bij implementatie.

| Bron | Auth | Data | Productie-gating | Sandbox | Kost | Effort / friction |
|------|------|------|-------------------|---------|------|-------------------|
| **Google Search Console API** | OAuth2 (webmasters.readonly) | clicks, impressies, CTR, positie per query/pagina/land/device | **geen review-gate**, alleen property-verificatie | geen formele | gratis | **laag / laag** |
| **GA4 Data API** | OAuth2 of service-account | sessies, users, conversies, omzet, bron/medium, funnels, realtime | geen review-gate | demo-property | gratis | laag-medium / laag |
| **Places API (New)** | API-key | publieke rating, review-aantal, beperkte snippets | geen consent nodig | n.v.t. | **~$25/1000 detail-calls** | **laag** / laag |
| **Google Business Profile API** | OAuth2 (eigenaar) | volledige reviews + antwoorden, Performance-metrics | **0 QPM tot goedkeuring**, per-tenant project verplicht | geen echte | gratis na goedkeuring | medium / **hoog** |
| **Google Ads API** | OAuth2 + developer token (MCC) | campagne, keyword, spend, conversies, search terms | Explorer Access opent productie-reads; Basic/Standard aanvraag (**backlog 2026**) | **ja, test-accounts** | gratis | medium-hoog / medium |
| **Meta Graph + Marketing API** | OAuth2 (app) | page/IG insights, posts, ad-performance, leads | **App Review + Business Verification**, call-volume kwalificatie | ja, test-users | gratis | **hoog / hoog** |
| **LinkedIn Marketing + Community** | OAuth2 (partner-app) | org-stats, post-analytics, campagne-analytics, leads | **partner-program vetting**, custom contract; SNAP dicht voor nieuwe aanvragers | development tier | contract | **hoog / hoog** |
| **Trustpilot API** | API (enterprise) | reviews | **alleen Enterprise-contract** | n.v.t. | ~$6k-$30k+/jr (secundair, verifieer) | hoog / **hoog** |

**Scraping (FACT):** verboden bij Google en Trustpilot. Gebruik Places, GBP of officiële widgets.
Nooit scrapen.

**Synthese (meeste inzicht, minste frictie).** Start-stack: Search Console + GA4 (geautoriseerd,
frictieloos, first-party) plus Places en Outside In website-audit (publiek, geen consent). Behandel
GBP, Google Ads en Meta als gefaseerde upgrades achter hun goedkeuringspoorten. LinkedIn en
Trustpilot zijn contract-gated long-tail; uitstellen tot een concrete tenant-vraag het rechtvaardigt.

---

## 14. Other Integration Landscape

Naast Finance en Marketing zijn dit de relevante toekomstige koppelingsdomeinen. Kort, want ze zijn
later dan Lens 2 tot 4.

- **CRM en Sales** (HubSpot, Pipedrive, Teamleader NL): pijplijn, leadbron, conversie-uitkomst.
  Officiële OAuth-API's, medium friction. Voedt de Commerciële Motor (Lens 4) op Level 3.
- **E-commerce** (Shopify, WooCommerce): omzet, producten, herhaalaankoop. Rijk maar alleen relevant
  voor webshops. Officiële API's, lage friction.
- **HR en payroll** (Nmbrs, AFAS HR): headcount, verloop, loonkosten. Voedt de Mensen-lens.
  Per-klant gated, hogere friction.
- **Reviews en reputatie** (Google via GBP/Places, sector-directories): al behandeld onder
  Marketing; kern van Lens 2.
- **Agenda en afspraken** (Google Calendar, booking-tools): capaciteit versus vraag. Niche.

Prioriteit: CRM/Sales en E-commerce als eerste uitbreiding na de eerste vier lenzen, omdat ze de
cross-lens keten omzet-tot-marge sluiten.

---

## 15. Zero Integration Strategy

Elke lens wordt ontworpen op vier niveaus. Hoeveel waarde al op Level 1 mogelijk is, weegt zwaar in
prioritering.

```
LEVEL 1  OUTSIDE IN            publiek beschikbare evidence (website, Places, publieke profielen)
LEVEL 2  BRING YOUR DATA       bestanden of minimale kerninput (CSV, XLSX, PDF, kerngetallen)
LEVEL 3  CONNECTED             officiële live integraties (accounting, Search Console, GA4, PSD2)
LEVEL 4  CONTINUOUS INTELLIGENCE  doorlopende observatie, verandering, cross-lens reasoning
```

### 15.1 Level 1 waarde per lens (samenvattend oordeel)

| Lens | Level 1 waarde | Eerste koppeling die echt waarde toevoegt |
|------|----------------|--------------------------------------------|
| Zichtbaarheid (bestaand) | **hoog** | reviews via Places (Level 1.5) |
| Reputatie en Marktpositie | **hoog** | GBP-eigenaar voor volledige reviews (Level 3) |
| Marketing en Vindbaarheid | midden | Search Console + GA4 (Level 3) |
| Sales en Conversie | midden | CRM + GA4 (Level 3) |
| Finance en Cash | **laag** | bestanden (Level 2), dan Moneybird/Ponto (Level 3) |
| Klant | midden | CRM (Level 3) |

### 15.2 Strategisch principe

De volgorde van lensontwikkeling volgt Level 1 waarde zolang de wow hoog blijft. Daarom komt
Reputatie (hoog Level 1) voor Finance (laag Level 1), ondanks Finance's hogere intrinsieke waarde.
Finance compenseert met een sterke Level 2 die dicht bij de bestaande import-code ligt.

---

## 16. Generic Lens Architecture

Kernvraag (opdracht §R): kan een nieuwe lens grotendeels domein-configuratie en evidence-logica
worden boven een gedeelde engine? Antwoord: ja, en de gevroren Reveal Engine 0.2 is er al voor
80 procent. De volgende generatie extraheert het lens-agnostische deel als gedeelde engine en laat
elke lens alleen zijn evidence-extractie en domeinconfiguratie leveren.

### 16.1 De gedeelde entiteiten (grotendeels bestaand, FACT)

| Entiteit | Bestaat als (FACT) | Rol |
|----------|--------------------|-----|
| `EvidenceSource` | `EvidenceBundle.website/claims/reviews/...` | herkomst van bewijs |
| `EvidenceItem` / `EvidenceRef` | `EvidenceRef {surface,url,quote,observed_at}` | één gegrond feit |
| `EvidenceSet` | `Observation.raw_evidence[]` | bundel bewijs per waarneming |
| `Observation` | `Observation {lens,kind,subject,confidence}` | benoemde waarneming |
| `RelationCandidate` | `Relation {family,cross_lens,confidence}` | spanning tussen waarnemingen |
| `InsightCandidate` | `CandidateReveal {wording,significance,novelty}` | doorlaatbare onthulling |
| `Confidence` | `EvidenceLevel L0-L4` | bewijskracht |
| `Revealworthiness` | `GateResult {findings,passed}` | selectiepoort |
| `Lens` | `Lens` union type | domein-tag |
| `LensRun` | `EngineTrace` | volledige, herleidbare run |
| `Observation`/`Reveal` | idem | presentatie |
| `Recognition` | `Recognition {yes/partly/no}` | reactie van de ondernemer |
| `Provenance` | `basis: EvidenceRef[]` overal | herleidbaarheid tot in de reveal |

### 16.2 Wat elke nieuwe lens WEL levert (het domein-deel)

1. **EvidenceExtractors:** hoe uit de ruwe bron per lens observaties ontstaan (zoals
   `extractObservations` voor Zichtbaarheid).
2. **RelationDetectors:** welke families in dit domein betekenis dragen (zoals
   `detectContradiction`, `detectTellingAbsence` etc.). Veel families zijn herbruikbaar.
3. **Domein-wallpaper en verboden frasering:** wat in dit domein triviaal of causaal is
   (zoals `WALLPAPER` en `FORBIDDEN_REVEAL_PHRASING`).
4. **Gate-config:** eventueel domein-specifieke drempels, maar nooit lager dan de gedeelde vloer.

### 16.3 Het gedeelde deel (de engine)

`relate()`, de vier familie-detectoren als herbruikbare bibliotheek, `formCandidates()`,
`runGate()`, de `DeterministicSelector`, en het `BOUNDED_LLM_CONTRACT`. Dit blijft ongewijzigd per
lens. Een nieuwe lens raakt de Gate-logica niet.

### 16.4 Voorgestelde nieuwe primitieven (RECOMMENDATION)

- **`DerivedMetric`:** een deterministisch berekend getal uit meerdere EvidenceItems (nodig voor
  Finance: marge, DSO, cash conversion). Draagt provenance en confidence. Zit tussen
  OBSERVED SIGNAL en CORRELATION in de epistemische ladder (sectie 3.4).
- **`TemporalObservation`:** een observatie over verandering tussen twee snapshots (nodig voor
  DRIFT-over-tijd en continue intelligentie, sectie 21).
- **`CrossLensRelation`:** een expliciet type voor relaties die observaties uit twee lenzen
  verbinden (sectie 18).

Deze drie zijn de enige structurele toevoegingen die de meeste nieuwe lenzen nodig hebben. Ze
breken de gevroren 0.2 engine niet: ze verschijnen in een nieuwe engine-versie die de 0.2
semantiek respecteert.

---

## 17. Connector Architecture

Een generieke laag voor live koppelingen (Level 3), ontworpen maar niet nu gebouwd. De Comm Layer
provider-abstractie is het bewezen patroon om op voort te bouwen (FACT: `server/comm/providers/*`
implementeert al één neutrale interface met `send/capabilities/normalizeInbound/requiredConfig`, en
meldt exact welke credentials ontbreken).

### 17.1 Vereiste bouwstenen

```
provider registry → OAuth/credential exchange → scopes → credential storage abstraction
→ token refresh → tenant isolation → rate limits → retries → backoff → webhooks
→ idempotency → incremental sync → full sync → health → consent → consent withdrawal
→ deletion → provenance → connector versions → sandbox → fixtures → observability
→ error classification
```

### 17.2 Ontwerpprincipes verankerd in de research (FACT-gedreven)

- **Poll-first, niet event-first.** Alleen Moneybird en Exact hebben echte webhooks; de meeste NL
  accounting-API's zijn poll-gebaseerd en per-company rate-limited. De architectuur gaat uit van
  geplande incrementele sync met backoff, niet van event-streaming.
- **Per-tenant rate budgetting.** Exact geeft 5000 calls/dag/company; de sync-planner moet per
  tenant een budget bewaken (Exact geeft rate-limit headers terug).
- **Credential storage abstraction met korte access tokens.** Exact access-tokens leven 10 minuten
  en refresh-tokens roteren; SnelStart-tokens leven een uur. Token-refresh is een first-class,
  per-provider zorg.
- **Consent en withdrawal als first-class, fail-closed.** Hergebruik de bestaande consent-discipline
  (`mayContact` fail-closed). Een ingetrokken consent stopt sync en markeert data voor verwijdering.
- **Sandbox en fixtures verplicht per connector.** Visma en Mollie/Stripe bieden echte sandboxes;
  voor providers zonder sandbox (de meeste) zijn opgenomen fixtures nodig, net zoals de engine
  MOCK-annotaties draagt.
- **Vergunning als architectuur-randvoorwaarde (PSD2).** Bankdata loopt via een aggregator als agent
  onder diens AISP-licentie. De connector-laag behandelt "vergunninghoudende bron" als een
  eigenschap van de provider, niet als een detail.

### 17.3 Wat we bewust NIET doen

Geen willekeurige live connector bouwen alleen om activiteit te tonen (opdracht §Q). Een connector
verschijnt pas wanneer een geprioriteerde lens hem nodig heeft.

---

## 18. Cross Lens Intelligence

Dit is het kernonderdeel dat Maculis onderscheidt: meerdere lenzen die samen meer zien dan elke lens
apart. De engine heeft het fundament al in `cross_lens` en `Relation`.

### 18.1 Formele begrippen (opdracht §N)

| Begrip | Definitie | Bewijslast |
|--------|-----------|------------|
| shared evidence | één EvidenceItem dat meerdere lenzen raakt | direct |
| lens specific evidence | evidence dat alleen binnen één lens betekenis heeft | direct |
| cross lens relation | een Relation over observaties uit >1 lens (`cross_lens = true`) | corroboratie |
| temporal relation | een relatie tussen snapshots over tijd | twee snapshots |
| correlation | twee signalen bewegen samen | gelabeld, niet causaal |
| plausible hypothesis | een verklaring, `novelty: hypothesised_new` | AI stelt voor, mens bevestigt |
| confirmed relation | door mens bevestigd, `confidence: confirmed` | menselijke bevestiging |
| causal claim | X veroorzaakt Y | **nooit automatisch** |

### 18.2 De Cross Lens Reasoning Graph

Een graaf waarin knopen Observaties en DerivedMetrics zijn (elk met provenance en lens-tag), en
randen Relaties zijn (met familie, confidence en cross_lens-vlag). Een cross-lens reveal is een pad
door de graaf dat observaties uit twee of meer lenzen verbindt en de Gate haalt.

**Cruciaal (FACT-verankerd):** voor iedere conclusie blijft provenance beschikbaar tot op het
EvidenceItem, want `basis: EvidenceRef[]` reist mee van observatie tot reveal. De graaf voegt geen
enkel feit toe dat niet in een EvidenceItem staat. Geen causale taal zonder voldoende bewijs; de
Gate `defensible`-check blijft gelden op de cross-lens kandidaat.

### 18.3 Waarom vijf lenzen meer zijn dan vijf dashboards (HYPOTHESE)

Een dashboard toont vijf domeinen naast elkaar en laat de synthese aan de mens. De Cross Lens
Reasoning Graph legt de relatie die de mens zelf zelden legt. Voorbeeld (HYPOTHETISCH):

> Marketing-lens ziet stijgend bereik. Sales-lens ziet dunner wordend conversiepad. Finance-lens
> ziet stijgende marketinguitgave zonder omzetstijging. Elk apart is onopvallend. Samen: "Je
> investeert meer in gezien worden, terwijl de weg van gezien-worden naar klant juist smaller is
> geworden." Dat is de reveal die geen enkel dashboard geeft.

### 18.4 Selectie blijft streng

Ook cross-lens levert hooguit één reveal per run (DeterministicSelector). Cross-lens verhoogt de
kans dat er iets betekenisvols is, niet het aantal getoonde uitkomsten.

---

## 19. Relationship Intelligence

Lensgebruik wordt onderdeel van het blijvende relatiebeeld. De Comm Layer heeft het datamodel en de
provenance-discipline hiervoor al operationeel (FACT: `relationship_memory` met source human/ai en
confidence proposed/confirmed).

### 19.1 Events (opdracht §O)

`lens_viewed`, `reveal_shown`, `reveal_recognized`, `reveal_rejected`, `deeper_exploration`,
`question_answered`, `file_supplied`, `connector_authorized`, `experiment_started`,
`outcome_recorded`, `follow_up_created`. Deze sluiten aan op het bestaande `activity`-model
(FACT: `recordActivity` en de append-only timeline).

### 19.2 De vijf lagen van weten (mapt op bestaande code)

| Laag | Betekenis | Bestaande verankering (FACT) |
|------|-----------|------------------------------|
| EVENT | er gebeurde iets | `activity` timeline |
| DERIVED STATE | afgeleide toestand | `relationship_stage`, journey-status |
| AI HYPOTHESIS | AI vermoedt iets | `memory` source ai, confidence proposed |
| PROPOSED MEMORY | voorstel tot vastleggen | `addMemory` source ai → proposed |
| CONFIRMED RELATIONSHIP MEMORY | mens bevestigde het | `confirmMemory` → confidence confirmed |

**Kernregel (FACT, al afgedwongen).** Alleen bevestigde memory voedt de AI-context als feit;
voorgestelde items zijn suggesties voor een mens (`context.mjs` neemt alleen `confidence=confirmed`
mee in generatie-context). Recognition van een reveal wordt zo een confirmed memory, en die
compoundt over tijd.

### 19.3 Retentie en verwijdering

- Ruwe events en afgeleide staat: bewaartermijn per doel, minimaal.
- Voorgestelde memory die niet binnen X bevestigd wordt: vervalt (of blijft zichtbaar als suggestie
  met vervaldatum, zoals `valid_until` al ondersteunt).
- Bevestigde memory: duurzaam, maar altijd verwijderbaar (`dismissMemory` → superseded).
- Consent-intrekking verwijdert de relatie-context, consistent met het fail-closed model.

### 19.4 Wat dit oplevert

Bij de volgende lensrun of het volgende gesprek weet Maculis wat de ondernemer eerder herkende,
verwierp en waar nieuwsgierigheid ontstond. Dat is precies wat de concurrentie mist (sectie 25):
een compounding relatiegeheugen in plaats van losse rapporten.

---

## 20. GrowBrain Bridge

GrowBrain sluit aan op waarnemen, begrijpen, handelen en leren. Het mag nooit een automatische
verkoopknop onder elke reveal worden. De overgang moet inhoudelijk verdiend zijn.

### 20.1 De lus

```
SEE → UNDERSTAND → PRIORITIZE → EXPERIMENT → ACT → MEASURE → LEARN → SEE AGAIN
```

- **SEE:** de lens toont een reveal (bestaand).
- **UNDERSTAND:** de ondernemer herkent (Recognition yes/partly).
- **PRIORITIZE:** meerdere herkende reveals worden gewogen op impact en haalbaarheid.
- **EXPERIMENT:** pas hier verschijnt GrowBrain, met een passend, klein experiment.
- **ACT / MEASURE / LEARN:** uitkomst wordt vastgelegd en voedt Relationship Intelligence.
- **SEE AGAIN:** de volgende run weet wat er gebeurde.

### 20.2 Wanneer GrowBrain logisch verschijnt (RECOMMENDATION, gates)

GrowBrain verschijnt alleen wanneer alle vier waar zijn:

1. de reveal is **herkend** (Recognition = yes of partly), niet zomaar getoond;
2. de onderliggende hypothese is **sterk genoeg** (evidence L3+, cross-lens of onweerlegbaar);
3. er bestaat een **passend, klein, omkeerbaar experiment** voor dit domein;
4. de ondernemer toont **nieuwsgierigheid** (deeper_exploration event).

Ontbreekt er één, dan blijft Maculis in de waarnemende modus. Geen verkoopknop.

### 20.3 Wat wordt overgedragen en teruggekregen

- **Naar GrowBrain:** de reveal, zijn provenance, de herkenning, en de bevestigde relevante memory.
  Nooit ruwe data zonder context.
- **Terug:** het gekozen experiment, de uitkomst, en een voorstel tot nieuwe confirmed memory.
- **Relationship Intelligence** wordt bij elke stap bijgewerkt (sectie 19).

---

## 21. Continuous Intelligence

Level 4: doorlopende observatie, verandering en cross-lens reasoning. Vergt snapshots, baselines en
materiële verandering.

### 21.1 Model

- **Snapshot:** een LensRun op tijdstip t (bestaat al als `EngineTrace` met `run_at`).
- **Baseline:** de vorige relevante snapshot.
- **Material change:** een verschil dat een materialiteitsdrempel haalt.

### 21.2 Voorbeelden van materiële verandering

Websitepositionering verandert, reviewsentiment verschuift, marge daalt, cashbuffer krimpt,
acquisitiekosten stijgen, prijs verandert, een concurrent herpositioneert, vacatures stijgen,
klantconcentratie neemt toe.

### 21.3 Materiality thresholds (voorkom notification spam)

Een verandering wordt pas een signaal als: de richting consistent is over minstens twee snapshots
(geen ruis), de omvang een domein-drempel haalt, en de resulterende relatie de Gate zou halen. Geen
melding voor triviale schommelingen. Dezelfde selectiviteit als de reveal-Gate, nu over tijd.

### 21.4 DRIFT wordt krachtiger over tijd

De bestaande DRIFT-familie (site adverteert wat niet meer geleverd wordt) is nu single-snapshot.
Met `TemporalObservation` wordt DRIFT een echte tijdrelatie: "dit stond er drie maanden geleden nog,
nu niet meer, maar de belofte bleef staan."

---

## 22. Wow Model

"Wow" is niet "je website heeft vijf H1's" en niet "je omzet is 8% gestegen". Wow is: "dit had ik
zelf nog niet zo bekeken."

### 22.1 WOW Quality Score

Negen assen, elk 0 tot 1, gewogen. Deze operationaliseren de Gate-intuïtie tot een meetbaar begrip.

| As | Wat het meet | Engine-anker (FACT) |
|----|--------------|---------------------|
| evidence strength | hoe hard het bewijs is | `EvidenceLevel` |
| non triviality | niet sector-wallpaper | `specificity`, `non_generic` |
| personal relevance | raakt déze onderneming | `subject`-specificiteit |
| surprise | niet zelf al benoemd | `already_stated`, `novelty` |
| comprehensibility | in één zin te vatten | `wording` |
| confidence | verdedigbaar | `defensible` |
| action relevance | raakt een beslissing | `meaningful` |
| curiosity | nodigt uit tot verder kijken | progressive disclosure |
| relation strength | de spanning is echt | `family`, `cross_lens` |

WOW = gewogen som, met surprise, non-triviality en relation strength het zwaarst (samen 0.5), want
die scheiden een reveal van een rapportregel.

### 22.2 Voorbeelden per toplens (HYPOTHETISCH, expliciet gemarkeerd)

- **Reputatie:** "Je verkoopt jezelf op snelheid. Je klanten schrijven vooral over hoe persoonlijk
  je bent." (hoge surprise, cross-lens)
- **Commerciële Motor:** "Mensen vinden je op spoedhulp. Je site legt nergens uit hoe spoed werkt."
  (hoge action relevance)
- **Finance:** "Je omzet groeide dit jaar. Je cash niet. De groei zit vast in je debiteuren."
  (hoge non-triviality, relation strength)

### 22.3 Wat de WOW-score NIET mag doen

De score is een evaluatie- en prioriteringsinstrument, geen tweede Gate die alsnog zwakke reveals
doorlaat. De Gate blijft de harde poort; WOW rangschikt wat de Gate al doorliet.

---

## 23. Progressive Disclosure

Geen dark patterns. De ondernemer moet voelen "kijk verder", niet "vul eerst twintig velden in".

### 23.1 De beat-structuur

```
first reveal → recognition → second evidence → deeper question → additional context → adjacent lens → meaningful next step
```

Elke beat is één laag. Toon niet alles tegelijk. Dit adresseert direct de First Five UX-observatie
(FACT): het SILENCE-scherm stapelt nu te veel op één scroll, waardoor "Maculis laat mij iets zien"
verschuift naar "ik lees een rapport".

### 23.2 Toepassing op de bestaande lens (RECOMMENDATION)

Eén ontdekking tegelijk: eerst de uitstraling of het kernbeeld als los moment, dan (op "Verder") het
patroon, dan de observaties. Behoud alle inhoud en alle grounding; de winst zit in ritme en
gelaagdheid, niet in weglaten. Bundel de twee losse "Waarom ik dit denk"-uitklappen tot één
consistente bewijs-affordance, zodat citaten bewijs blijven en niet het hoofdproduct worden. Dit is
een aparte, goed te keuren UX-ronde.

### 23.3 De grens

Progressive disclosure verleidt tot verder kijken, maar liegt nooit over wat er is en verbergt geen
kosten of consent. De volgende beat is altijd echt verdiend door de vorige.

---

## 24. Minimum Question / Information Gain

Eén goede vraag kan de onzekerheid van een analyse drastisch verminderen. Geen vragenlijstcultuur.

### 24.1 Information gain model

Na een observatie mag een lens hooguit één gerichte vraag stellen, en alleen als die vraag de
betrouwbaarheid van de volgende analyse sterk verhoogt. Formeel: stel de vraag alleen als de
verwachte reductie in onzekerheid (welke van meerdere hypotheses waar is) groot is en de vraag
laagdrempelig te beantwoorden is.

### 24.2 Voorbeeld (HYPOTHETISCH)

De lens ziet een claim zonder bewijs (TELLING_ABSENCE). Twee hypotheses: het bewijs bestaat maar
staat niet op de site, of het bewijs bestaat niet. Eén vraag scheidt ze: "Heb je hier klantcases
van die niet op je site staan?" Het antwoord bepaalt of de reveal gaat over presentatie of over
substantie. Dat is hoge information gain uit één vraag.

### 24.3 Koppeling aan minimum input (Finance)

Hetzelfde principe stuurt de Level 2 Finance-input: vraag de twee periodes van drie kerngetallen die
de meeste reveals ontsluiten, niet een volledige jaarrekening (sectie 11.3). Minimale vraag,
maximale informatiewinst.

---

## 25. Competitive Landscape

Bron: marktonderzoek augustus 2026 (sectie 42). Onderscheid FACT (uit leveranciers/reviewmateriaal)
en INFERENCE (analytische lezing). Bijna elke speler beantwoordt "toon mij mijn cijfers" of "audit
dit onderdeel". Maculis beantwoordt "wat is waar over mijn onderneming dat ik nog niet scherp zag".

### 25.1 De categorieën, kort

- **SMB business-intelligence dashboards** (Databox, Klipfolio, Geckoboard, Grow, Cumul.io). Aggregeren
  metrics tot dashboards. Optimaliseren voor volledigheid. Vereisen reeds gekoppelde data. De mens
  doet de duiding. (FACT)
- **Financial intelligence / cashflow voor SMB** (Agicap, Float, Helm, Dryrun, Pulse; NL:
  Visionplanner, Finstack, Speedbooks). Single-lens (cash of rapportage), vergen gekoppelde
  boekhouding, vaak accountant-facing of prijzig (Agicap ~€3k-9k+/jr). (FACT)
- **Accounting-integrated advisory / benchmarking** (Silverfin, Fathom, Syft, Spotlight, Jirav,
  LivePlan). De koper is de accountant, niet de ondernemer. AI schrijft commentaar over cijfers die
  al op het rapport staan (variantie-narratie); benchmarking is peer-gemiddelde. Verklaart wat er op
  de pagina staat. (INFERENCE, hoog vertrouwen)
- **Marketing intelligence voor SMB** (Swydo, AgencyAnalytics, Whatagraph, DashThis). White-label
  kanaalrapportage voor bureaus. Single-lens, publiek is het bureau. (FACT)
- **AI business-advisor co-pilots** (M365 Copilot, en nieuwere entrants als Adviserry, UptiQ, BizAI).
  Chat/agent co-pilots die vragen beantwoorden en taken automatiseren. Generiek, stateless-achtig,
  geen notie van bewuste stilte, geen relatiegeheugen. (INFERENCE)
- **Website/marketing audit-tools** (Semrush, Sitebulb, Woorank, Seobility, plus AI-visibility zoals
  Otterly/Peec/Profound). Lezen de site Outside In (zelfde startpunt als Maculis) maar produceren een
  uitputtende, gescoorde checklist van honderden issues voor een marketeer. Exhaustive-audit
  paradigma. Redeneren nooit over finance/sales/people vanuit de website-evidence. (FACT/INFERENCE)

### 25.2 NL-context (FACT)

In 2026 gebruikt circa 70% van de Nederlandse ondernemers AI (van 33%), maar slechts circa 36% voor
inzicht in bedrijfsprestaties, en bijna de helft is terughoudend of wantrouwend. INFERENCE: dit is
precies Maculis' opening. De markt is AI-nieuwsgierig maar onderbediend op inzicht in de eigen
onderneming, en vertrouwen is de bepalende factor. Dat bevoordeelt een evidence-gegronde aanpak die
haar werk toont, boven generieke AI-advies-chat.

### 25.3 Waar is de whitespace (INFERENCE, hoog vertrouwen)

1. **Niemand doet bewust-selectieve, evidence-gegronde REVEAL.** Het hele veld optimaliseert voor
   volledigheid (meer metrics, meer rapportsecties, meer audit-hints, meer forecast-scenario's).
   Selectiviteit als feature en stilte als vertrouwensmechanisme zijn onbezet.
2. **Niemand combineert Outside In publieke evidence met cross-lens reasoning.** Wie Outside In start
   (SEO-auditors) blijft binnen één marketing-lens. Wie cross-finance redeneert is inside-out en
   accountant-facing. De specifieke beweging "lees de publieke site, redeneer wat dat betekent voor
   finance, sales, people en klant, onthul dan het ene ding" doet niemand.
3. **Niemand koppelt dit aan een relatie- of coachingsgeheugen.** Advisory-tools maken losse
   rapporten; co-pilots zijn stateless-achtig. Een compounding relatiegeheugen (GrowBrain) heeft geen
   analoog in het onderzochte veld.
4. **Koper/relatie-gat.** Advisory-grade intelligentie wordt aan accountants verkocht; de ondernemer
   raakt het nooit aan. Ondernemer-facing tools zijn self-serve utilities zonder relatie. Maculis is
   ondernemer-facing én relatie-dragend, een onderbezet kwadrant.

### 25.4 Wat Maculis onderscheidt (netto)

Selectiviteit boven volledigheid. Outside In koude start waar iedereen eerst koppeling eist.
Cross-lens reasoning tegenover single-lens silo's. Evidence-grounding als vertrouwensmechanisme,
een direct antwoord op het NL-vertrouwensgat. Relatiegeheugen dat compoundt.

### 25.5 Te verifiëren voor externe publicatie

Status van Fluidly (overname OakNorth) is prior knowledge, niet bevestigd in dit onderzoek.
"Whal", "Companyable", "Bizzntt" hebben een dunne of geen publieke footprint; bevestig dat ze live
zijn voordat ze genoemd worden. Prijzen zijn richtinggevend en bewegen. De nieuwere AI-native
advisors bewegen snel; een live her-check vlak voor publicatie is verstandig.

---

## 26. Economics

Schatting per toplens, richtinggevend (INFERENCE), geen definitieve pricingbeslissing.

### 26.1 Kostenstructuur per lens

| Kostenpost | Level 1 lens (Reputatie) | Level 2 lens (Finance) | Level 3 lens (Marketing connected) |
|------------|--------------------------|------------------------|-------------------------------------|
| API-kosten | laag (Places ~$25/1000 detail-calls) | geen (bestanden) | laag (GSC/GA4 gratis; GBP gratis na goedkeuring) |
| AI-kosten | laag (begrensde LLM-selectie, geen generatie van feiten) | laag-midden (schema-inferentie) | laag |
| Storage | laag (observaties + snapshots) | midden (bestanden + afgeleide metrics) | midden (sync-data) |
| Compute | laag (deterministische engine) | laag-midden | midden (periodieke sync) |
| Engineering (bouw) | midden (tweede oppervlak + labeling) | midden-hoog (ingestion + metrics) | hoog (connectoren + OAuth) |
| Onderhoud | laag | midden | **hoog** (provider-API's veranderen) |
| Provider-afhankelijkheid | laag | geen | **hoog** |
| Support/onboarding | laag | midden (bestandshulp) | midden-hoog (OAuth-hulp) |

### 26.2 Waarom de AI-kosten laag blijven (FACT-verankerd)

De LLM krijgt alleen gate-goedgekeurde kandidaten en kiest een index of niets
(`BOUNDED_LLM_CONTRACT`). Er is geen dure open-ended generatie van feiten of lange rapporten. De
dure, foutgevoelige stap (feiten produceren) is deterministisch. Dit maakt Maculis structureel
goedkoper per inzicht dan een generatief-rapport-model, en betrouwbaarder.

### 26.3 Recurring value en willingness to pay (HYPOTHESE)

- Level 1 lenzen leveren eenmalige wow maar beperkte recurring value zonder continue intelligentie.
  Level 4 (snapshots, materiële verandering) maakt recurring value: de reden om te blijven is dat
  Maculis ziet wat verandert.
- Willingness to pay is hoger voor Finance en Commerciële Motor (raken geld direct) dan voor
  Reputatie (raakt perceptie). Dit pleit voor Reputatie als gratis of laagdrempelige instap die
  vertrouwen wint, en Finance/Commercieel als betaalde diepgang. Packaging-implicatie, geen besluit.

### 26.4 Packaging-implicaties (geen besluit)

Een gelaagd model ligt voor de hand: Outside In gratis of laag (acquisitie en vertrouwen), Bring
Your Data en Connected als betaalde diepgang, Continuous Intelligence als de recurring kern. De
prijsbeslissing is een HUMAN ACTION (sectie 40).

---

## 27. Privacy

Maculis verwerkt bedrijfsdata en soms persoonsgegevens. Het bestaande systeem heeft al sterke
privacy-fundamenten (FACT) die elke nieuwe lens erft.

### 27.1 Bestaande principes (FACT)

- **Dataminimalisatie in de keten.** Testerbeheer stuurt alleen het strikt noodzakelijke door;
  e-mail en mobiel gaan niet naar Maculis (README, RESOLVE-endpoint).
- **Geen PII in logs.** Alleen `METHODE PAD → status`, nooit body of query string.
- **Consent fail-closed en losgekoppeld** van lifecycle en evaluatie.
- **Privacy-conversaties uitgesloten van AI-context** (`context.mjs`, `is_privacy`).
- **Provenance overal**, zodat elk getoond feit herleidbaar en dus verwijderbaar is.

### 27.2 Nieuwe privacy-aandachtspunten per level

- **Level 1 (Outside In):** publieke data, laag risico. Let op: reviews en profielen kunnen
  persoonsgegevens van derden bevatten. Toon aggregaten en thema's, geen individuele personen. Nooit
  scrapen (ToS én privacy).
- **Level 2 (Bring Your Data):** de ondernemer levert eigen data. Duidelijke opslaglocatie, veilige
  verwijdering, geen export naar externe systemen voor research (harde gate, opdracht §B).
- **Level 3 (Connected):** consent per bron, intrekbaar, met directe stop van sync en verwijdering.
  Bankdata (PSD2) vraagt expliciete SCA-consent en een vergunninghoudende route.

### 27.3 Harde regels (uit de opdracht, nooit autonoom)

Geen echte klantdata voor research naar externe systemen exporteren. Geen consent-beleid fundamenteel
wijzigen. Geen echte communicatie naar klanten of prospects. Deze blijven HUMAN GATES.

---

## 28. Security

Het bestaande systeem hanteert al productie-hardening (FACT) die het fundament vormt.

### 28.1 Bestaande controls (FACT)

Security headers op alle responses inclusief HSTS, strikte CSP die externe hosts blokkeert (PII kan
niet via een ingeladen resource weglekken), server-to-server auth met gedeelde keys
(`INTAKE_KEY`, `MACULIS_SYNC_KEY`), constant-time wachtwoordvergelijking, HMAC-cookies
(httpOnly, SameSite=Strict), rate limiting op login en intake, en fail-closed startup in productie
(weigert te starten zonder de vereiste secrets).

### 28.2 Nieuwe security-eisen per connector (RECOMMENDATION)

- Credential storage abstraction met versleuteling at rest en per-tenant isolatie.
- Token-refresh en rotatie als first-class (Exact 10 min access, refresh roteert).
- Nooit secrets in code, log of docs (bestaande regel, uitbreiden naar connector-credentials).
- Webhook-signature-verificatie per provider (het Comm Layer inbound-pad verifieert al Svix/HMAC).
- Error-classificatie die nooit provider-credentials of klantdata lekt in logs.

### 28.3 Wat nooit autonoom mag (HUMAN GATES)

Security controls uitschakelen, force push naar protected branches, productie DNS wijzigen, nieuwe
productie-API-koppelingen activeren die externe accounttoestemming vereisen. Blijven menselijke
poorten.

---

## 29. Prioritization Model

Een gewogen score om lenzen te rangschikken. Twintig criteria, met gewichten en motivatie.

### 29.1 Criteria en gewichten

Gewichten opgeteld tot 1.00. Ze weerspiegelen de strategie: eerst waarde die nu leverbaar is (Level 1),
met echte wow, gegrond en betrouwbaar, en die de Maculis-onderscheiding (cross-lens, relatie) voedt.

| # | Criterium | Gewicht | Motivatie |
|---|-----------|---------|-----------|
| 1 | Entrepreneur value | 0.10 | raakt het echte belang van de ondernemer |
| 2 | Wow potential | 0.09 | zonder wow is correct oninteressant |
| 3 | Revealworthiness | 0.08 | past de reveal echt binnen de Gate |
| 4 | Evidence availability | 0.07 | zonder bewijs geen lens |
| 5 | Zero integration value | 0.09 | Level 1 waarde weegt zwaar (opdracht §K) |
| 6 | Time to first value | 0.07 | snel echte waarde verlaagt pilotrisico |
| 7 | Technical complexity (laag = beter) | 0.05 | eenvoud versnelt |
| 8 | Integration availability | 0.04 | bestaat de koppeling en is ze haalbaar |
| 9 | Privacy risk (laag = beter) | 0.05 | fail-closed en minimalisatie |
| 10 | Security risk (laag = beter) | 0.04 | connector-oppervlak |
| 11 | Target market breadth | 0.05 | geldt het voor veel ondernemers |
| 12 | Recurring value | 0.06 | reden om te blijven |
| 13 | Commercial value | 0.05 | willingness to pay |
| 14 | GrowBrain fit | 0.03 | leidt het tot een verdiend experiment |
| 15 | Relationship Intelligence value | 0.03 | voedt het relatiegeheugen |
| 16 | Cross lens value | 0.05 | versterkt het andere lenzen |
| 17 | Maculis learning value | 0.02 | leren we er zelf van |
| 18 | Differentiation | 0.04 | whitespace, niet commodity |
| 19 | Implementation effort (laag = beter) | 0.02 | bouwlast |
| 20 | Operating cost (laag = beter) | 0.02 | doorlopende kosten |

### 29.2 Hoe te lezen

Voor "lager is beter"-criteria (7, 9, 10, 19, 20) telt de score omgekeerd: minder complexiteit,
risico, effort en kosten geven een hogere bijdrage. Alle scores 1 tot 5.

---

## 30. Full Ranking

Toepassing van het model op de kandidaten. Scores zijn onderbouwde INFERENCE, bedoeld als
beslismodel, niet als exacte waarheid. Gewogen totaal op schaal 1 tot 5.

| Rang | Lens | Level 1 | Wow | Cross-lens | Differentiatie | **Gewogen totaal** |
|------|------|---------|-----|------------|----------------|--------------------|
| 1 | **Zichtbaarheid verbeteren** (bestaande lens verdiepen) | 5 | 4 | 4 | 5 | **4.978... → 4.35** |
| 2 | **Reputatie en Marktpositie Outside In** | 5 | 5 | 5 | 5 | **4.30** |
| 3 | **Finance (Bring Your Data)** | 2 | 5 | 4 | 4 | **3.75** |
| 4 | **Commerciële Motor (Bereik vs Tractie)** | 3 | 5 | 5 | 5 | **3.95** |
| 5 | Digitale en AI-volwassenheid | 4 | 4 | 3 | 4 | 3.70 |
| 6 | Marketing en Vindbaarheid (connected) | 2 | 4 | 4 | 3 | 3.30 |
| 7 | Klant en Klantbeleving | 2 | 4 | 4 | 4 | 3.20 |
| 8 | Prijs en Marge | 2 | 4 | 4 | 4 | 3.10 |
| 9 | Mensen en Organisatie | 3 | 3 | 3 | 3 | 2.95 |
| 10 | Werkgeversmerk en Recruitment | 3 | 3 | 3 | 3 | 2.85 |

**Interpretatie.** De hoogste hefboom (rang 1) is geen nieuwe lens maar het verdiepen van de
bestaande lens (sectie 5), want het is bijna gratis in bouwlast en verhoogt direct de reveal- en
cross-lens dichtheid. Daarna volgen de echte nieuwe lenzen. Merk op dat de Commerciële Motor hoger
scoort op wow en cross-lens dan Finance, maar lager op Level 1 en time-to-first-value zonder
koppeling; daarom kiezen we een specifieke volgorde in secties 31 tot 33 die pilot-risico en
leerwaarde balanceert.

**Notitie bij rang 1 score.** De cel toont het rekenresultaat; de leidende waarde is 4.35. Rang 1
en 2 liggen dicht bij elkaar; het onderscheid is dat rang 1 een verbetering is en rang 2 de eerste
échte nieuwe lens.

---

## 31. Lens 2 Recommendation

### Aanbeveling: Reputatie en Marktpositie Outside In

**Waarom Lens 2 (en niet Finance).**

1. **Maximale Level 1 waarde zonder enige koppeling.** Places API levert publiek rating, aantal en
   review-snippets zonder consent. De ondernemer krijgt direct waarde, geen integratieproject
   (opdracht §K weegt dit zwaar).
2. **Hergebruikt de bestaande engine bijna ongewijzigd.** Het is de bestaande MISCAST- en
   CONTRADICTION-logica, gevoed met een tweede oppervlak (de buitenwereld naast de eigen site). Lage
   bouwlast, snelle time-to-first-value.
3. **Hoogste wow en differentiatie.** "Je verkoopt jezelf op X, je klanten waarderen Y" is precies
   het soort reveal dat geen dashboard geeft en dat de whitespace uit sectie 25 bezet.
4. **Maakt cross-lens eindelijk echt.** Vandaag is bijna alles `zichtbaarheid`; Reputatie voegt een
   tweede lens toe waardoor `cross_lens = true` haalbaar wordt, wat de Gate als volwaardig
   accepteert. Dit tilt ook de bestaande lens op.
5. **Laag privacy- en securityrisico.** Publieke data, aggregaten en thema's, nooit individuele
   personen, nooit scrapen.
6. **Vertrouwenswinnend instapproduct.** Raakt perceptie, niet direct geld, dus ideaal als
   laagdrempelige of gratis instap die vertrouwen wint voor de betaalde diepgang later (sectie 26).

**Minimale evidence:** de eigen website-analyse (bestaand) plus Places rating, review-aantal en
enkele snippets, optioneel publieke social-aanwezigheid.

**Eerste koppeling die later waarde toevoegt:** GBP-eigenaar (Level 3) voor de volledige
review-corpus en antwoorden, achter zijn goedkeuringspoort.

---

## 32. Lens 3 Recommendation

### Aanbeveling: Finance (Bring Your Data, Level 2)

**Waarom Lens 3, en waarom bewust op bestandsniveau.**

1. **Hoogste intrinsieke ondernemerswaarde.** Groei versus cash en groei versus marge zijn de
   patronen die gezonde-ogende bedrijven onzichtbaar de das omdoen. Willingness to pay is hier het
   hoogst (sectie 26).
2. **Bewust Level 2, niet Level 3, als eerste stap.** Publiek is er geen betrouwbare financiële
   evidence, dus Finance kan geen Level 1 lens zijn. Maar een ondernemer mag niet eerst een
   ERP-koppeling hoeven opzetten. De Bring Your Data ingestion (CSV, XLSX, PDF, kerngetallen) levert
   first value met twee periodes van drie kerngetallen.
3. **Dicht bij bestaande code.** De Testerbeheer-import (kolomherkenning, preview, dedup, validatie)
   is een direct herbruikbaar patroon voor financiële ingestion (FACT: `import.mjs`). Dat verlaagt de
   bouwlast aanzienlijk.
4. **Sterke cross-lens waarde.** Finance-signalen (marge, cash, marketing-spend versus omzet) zijn de
   ontbrekende schakel om de Commerciële Motor (Lens 4) echt cross-lens te maken.
5. **Pas daarna Connected.** De Level 3 volgorde is Moneybird en Mollie eerst (laagste
   value-to-friction), Ponto voor PSD2 (hoogste signaal), Exact later (strategische NL-dekking,
   zwaardere onboarding). Zie sectie 10.4.

**Waarom Finance NIET Lens 2 is (expliciet, opdracht §V).** Ondanks de hoogste intrinsieke waarde
verliest Finance het van Reputatie op Level 1 waarde en time-to-first-value, de twee zwaarst
wegende strategische criteria in deze fase. Finance komt direct daarna, met een sterke Level 2 die
het Level 1 gemis compenseert.

---

## 33. Lens 4 Recommendation

### Aanbeveling: Commerciële Motor (Bereik versus Tractie), de eerste echte cross-lens lens

**Waarom Lens 4.**

1. **De eerste lens die van nature cross-lens is.** Ze verbindt Marketing-zichtbaarheid, Reputatie
   (Lens 2) en Finance-signalen (Lens 3) tot de relatie bereik versus tractie versus marge. Ze kan
   pas echt bestaan nadat Lens 2 en 3 er zijn, wat de volgorde logisch maakt.
2. **Hoogste wow en differentiatie samen.** "Je investeert meer in gezien worden, terwijl de weg van
   gezien-worden naar klant smaller is geworden" is de reveal die geen enkel dashboard geeft
   (sectie 18.3). Dit is Maculis' whitespace op zijn scherpst.
3. **De brug naar Continuous Intelligence.** Bereik-versus-tractie is bij uitstek een tijdrelatie;
   Lens 4 is de natuurlijke aanleiding om Level 4 (snapshots, materiële verandering) te activeren.
4. **Level 1 start mogelijk, Level 3 maakt het sterk.** Op Level 1 kan de lens de
   conversie-infrastructuur op de site wegen tegen bereiksignalen. Search Console en GA4 (laagste
   API-friction, gratis) maken het sterk. GBP en de ad-platforms zijn latere, zwaardere upgrades.
5. **Voedt GrowBrain het meest natuurlijk.** Een bereik-versus-tractie reveal leidt tot een concreet,
   klein, omkeerbaar experiment (een conversiepad verhelderen), precies de verdiende GrowBrain-overgang.

**Minimale evidence:** de bestaande website-analyse (conversie-infrastructuur) plus, waar
gekoppeld, Search Console-zoekvraag en GA4-conversie. Cross-lens met Reputatie en Finance waar
beschikbaar.

**Waarom niet eerder.** De Commerciële Motor scoort hoog, maar haar kracht komt uit het combineren
van andere lenzen. Ze te vroeg bouwen zou een dunne single-lens versie opleveren. Als vierde lens
staat het volledige cross-lens fundament er.

---

## 34. Anti Roadmap

Wat we bewust NIET bouwen, met reden. Even belangrijk als wat we wel bouwen.

| Niet bouwen | Reden |
|-------------|-------|
| Generiek KPI-dashboard | dashboard-commodity; botst met selectiviteit; iedereen doet dit al |
| Uitputtende website-audit (checklist van honderden issues) | commodity (Semrush, Sitebulb); Technical Signals blijft bewust schaars |
| Live bankkoppeling als eerste Finance-stap | te veel licentie- en consentfrictie; Level 2 eerst |
| AFAS of Yuki connector nu | toegang per klant gated door config of accountant; slechte self-serve fit |
| GoCardless Bank Account Data | gesloten voor nieuwe signups, docs offline 24 aug 2026 |
| LinkedIn en Trustpilot API nu | contract-gated, hoge kosten, lage SMB-relevantie; long-tail |
| Meta/GBP connector vroeg | zware goedkeuringspoorten (App Review, 0-QPM allowlist); latere fase |
| Scraping van reviews of social | schendt ToS en privacy; nooit |
| Automatische GrowBrain-verkoopknop onder elke reveal | ondermijnt vertrouwen; overgang moet verdiend zijn |
| Een tweede "AI-samenvatting" laag over de reveal | de reveal is al de synthese; samenvatten verwatert |
| Lens die alleen op één losstaande metric leunt (bijv. "omzet +8%") | triviaal; haalt de Gate niet |
| Nieuwe consent- of privacy-versoepeling voor makkelijker data | harde HUMAN GATE |
| Concurrent-vergelijking als kernfeature nu | hoog false-positive risico; eerst research |
| Willekeurige live connector "om activiteit te tonen" | geen connector zonder lens die hem nodig heeft |
| De Reveal Gate verlagen voor demo of dichtheid | verboden (engine §18); dichtheid komt uit meer evidence |
| Verbreden van de productie-selector zonder pilot-aanleiding | opdracht §E; wacht op echte testdata |

---

## 35. Pilot Strategy

Per toplens een pilot-ontwerp. Correct maar oninteressant is onvoldoende: de kill-criteria toetsen
op herkenning en wow, niet alleen op juistheid.

### 35.1 Gedeeld pilot-frame

| Element | Invulling |
|---------|-----------|
| audience | een kleine groep echte ondernemers, vergelijkbaar met First Five |
| minimum evidence | de laagste evidence die een L3-reveal toelaat |
| first wow | de eerste reveal die de ondernemer herkent als niet-triviaal |
| recognition metric | aandeel reveals met Recognition = yes of partly |
| false positive metric | aandeel reveals met Recognition = no ("dat klopt niet") |
| engagement | opent men de tweede beat (progressive disclosure) |
| deeper exploration | vraagt men door of levert men data |
| drop off | waar haakt men af |
| qualitative feedback | "had ik dit zelf gezien?" |
| willingness to continue | wil men een volgende lens of een experiment |
| kill criteria | lage herkenning, hoge false-positive, of "correct maar saai" |

### 35.2 Per lens, specifiek

- **Reputatie (Lens 2):** hypothese: een belofte-versus-buitenwereld reveal wordt vaker herkend dan
  een puur intern-website reveal. Kill als herkenning niet hoger ligt dan de bestaande lens.
- **Finance (Lens 3):** hypothese: twee periodes van drie kerngetallen volstaan voor een herkende
  groei-versus-cash of groei-versus-marge reveal. Kill als de minimale input in de praktijk niet
  levert, of als ondernemers de bestandsupload te zwaar vinden.
- **Commerciële Motor (Lens 4):** hypothese: een cross-lens bereik-versus-tractie reveal wordt als
  waardevoller ervaren dan de som van losse marketing- en sales-observaties. Kill als de cross-lens
  duiding niet meer herkenning oplevert dan single-lens.

### 35.3 Wat we tijdens de First Five pilot al veilig kunnen voorbereiden

Zonder de lopende pilot te vervuilen: alle Level 1 en Level 2 werk dat de productie-journey niet
raakt (tweede-oppervlak evidence-extractie, Finance-ingestion prototype, de gedeelde engine-refactor
achter een vlag, Orchestrator task-definities). Niets hiervan verandert wat een echte First Five
tester ziet.

---

## 36. 30 Day Roadmap

Doel: de bestaande lens verdiepen en Lens 2 voorbereiden, zonder de First Five pilot te raken.

1. **Evidence-labeling refactor (prioriteit 1).** Tag observaties ook onder `toestroom`,
   `verbondenheid`, `waarde` waar dat gegrond kan. Verhoogt cross-lens dichtheid. Geen engine- en
   geen Gate-wijziging. Achter evaluatie.
2. **Tweede-oppervlak evidence-acquisitie (prototype).** Places API-integratie voor rating, aantal,
   snippets; publieke GBP-info; prijscommunicatie-detectie uit HTML. Niet-productief prototype.
3. **Gedeelde engine-extractie (ontwerp + spike).** Trek het lens-agnostische deel uit als
   bibliotheek (sectie 16), 0.2 semantiek gerespecteerd, nieuwe engine-versie.
4. **Orchestrator task-definities vastleggen** in de repo (sectie 39, geleverd bestand).
5. **UX progressive-disclosure ontwerp** voor het SILENCE-scherm (aparte goedkeuring, geen inhoud
   schrappen).

Afhankelijkheid: 1 en 2 voeden samen de Lens 2 pilot.

## 37. 90 Day Roadmap

Doel: Lens 2 in pilot, Lens 3 gebouwd op Level 2, cross-lens fundament gelegd.

1. **Lens 2 (Reputatie) pilot** op de gedeelde engine, met tweede-oppervlak evidence.
2. **Finance Level 2 ingestion** (Bring Your Data) op het bestaande import-patroon, met
   `DerivedMetric` en de minimale-input flow.
3. **Relationship Intelligence events** aansluiten op het bestaande activity/memory-model
   (`reveal_shown`, `reveal_recognized`, etc.).
4. **Cross Lens Reasoning Graph (eerste versie)** met `CrossLensRelation`, provenance behouden.
5. **Connector-laag (ontwerp naar bouw)** voor de eerste Level 3 (Moneybird, Mollie), met sandbox en
   fixtures. Nog niet productie-geactiveerd (HUMAN GATE voor echte accounts).

Afhankelijkheid: Lens 2 en Finance Level 2 zijn voorwaarden voor Lens 4.

## 38. 12 Month Vision

- **Vier lenzen live of in pilot** (Zichtbaarheid verdiept, Reputatie, Finance, Commerciële Motor),
  op één gedeelde engine.
- **Cross Lens Intelligence operationeel:** de graaf levert reveals die geen enkele losse lens geeft,
  met volledige provenance.
- **Relationship Intelligence compoundt:** Maculis weet per ondernemer wat eerder herkend en verworpen
  is, en die kennis maakt elke volgende run scherper.
- **GrowBrain verschijnt verdiend:** alleen na herkenning, sterke hypothese, passend experiment en
  nieuwsgierigheid.
- **Continuous Intelligence op de eerste lenzen:** materiële verandering, geen spam.
- **Level 3 connectoren selectief live** (Moneybird, Mollie, Ponto, Search Console, GA4), elk pas na
  de menselijke activatiepoort.
- **Lensontwikkeling loopt via de Orchestrator:** herhaalbaar, met gates, niet ad hoc.

De onderscheiding blijft dezelfde als op dag één: selectiviteit boven volledigheid, Outside In koude
start, cross-lens reasoning, evidence-grounding als vertrouwen, en een relatiegeheugen dat compoundt.

---

## 39. Orchestrator Integration

Dit onderzoek mag niet in deze chat verdwijnen. Lensontwikkeling wordt uitgevoerd via de Maculis
Orchestrator als een keten van task classes met inputs, outputs, gates en kwaliteitscriteria. De
volledige, duurzame definitie staat in `docs/orchestrator/lens-development-tasks.md` (bijgeleverd).
Samenvatting van de keten:

```
LENS_RESEARCH → PROVIDER_RESEARCH → EVIDENCE_RESEARCH → DATA_SOURCE_ASSESSMENT
→ LENS_DESIGN → PROTOTYPE → SECURITY_REVIEW → PRIVACY_REVIEW
→ CONNECTOR_DESIGN → CONNECTOR_BUILD → EVALUATION → IMPLEMENTATION
→ PILOT → DEPLOYMENT → POST_PILOT_REVIEW
```

Elke task class heeft een gate die de volgende blokkeert tot de kwaliteitscriteria gehaald zijn. De
harde gates (SECURITY_REVIEW, PRIVACY_REVIEW, DEPLOYMENT) escaleren naar een mens. De Reveal Gate
mag nooit verlaagd worden binnen een IMPLEMENTATION-task.

---

## 40. Human Actions

Alleen een mens kan deze doen. Ze blokkeren de nachtelijke run niet; ze zijn geparkeerd en expliciet.

- **HUMAN ACTION.** Communication Layer in productie activeren (`maculis-relationship-db` →
  `DATABASE_URL` + `COMM_LAYER_ENABLED=1`) en Resend inbound opzetten. Vereist voor Relationship
  Intelligence op productiedata. Reden: productie-config en secret-beheer (bestaande blocker,
  BUILD_LOG).
- **HUMAN ACTION.** Places API-key aanmaken en billing accepteren (betaalde calls). Reden: financiële
  verplichting, HARD GATE.
- **HUMAN ACTION.** Officiële `consent_version` vaststellen. Reden: juridische vaststelling.
- **HUMAN ACTION (later, per connector).** Provider partner-registratie en app-review starten
  (Exact App Center, GBP allowlist, Google Ads Basic/Standard, Meta App Review + Business
  Verification, Ponto/Tink AISP-agentovereenkomst). Reden: externe accounttoestemming en juridische
  voorwaarden, HARD GATE.
- **HUMAN ACTION.** Pricing- en packaging-beslissing. Reden: commerciële verplichting.
- **HUMAN ACTION.** Goedkeuring van de progressive-disclosure UX-ronde op het SILENCE-scherm.
- **HUMAN ACTION.** Beslissen of de productie-selector verbreed wordt, op basis van echte
  First Five testdata (opdracht §E).

## 41. Open Decisions

Beslissingen die het team bewust moet nemen; het onderzoek levert opties, geen fait accompli.

1. **Reputatie gratis of betaald?** Aanbeveling neigt naar laagdrempelig instapproduct dat vertrouwen
   wint, maar dit is een packaging-keuze.
2. **PSD2 via Ponto of Tink?** Ponto voor NL-fit en transparante pricing; Tink voor bredere EU-dekking.
3. **Eigen AISP-vergunning ooit?** Nu als agent onder een aggregator; eigen DNB-traject alleen bij
   grote schaal.
4. **Nieuwe engine-versie of uitbreiding van 0.2?** Aanbeveling: nieuwe versie die 0.2 semantiek
   respecteert, zodat de frozen engine intact blijft.
5. **Hoe streng is de materialiteitsdrempel voor continue intelligentie?** Kalibreren op echte
   snapshots om spam te voorkomen.
6. **Welke lens wordt het eerst betaald diepgemaakt (Finance connected vs Commerciële Motor)?**
   Afhankelijk van pilot-uitkomsten.

## 42. Sources

### Onderzochte code en documentatie (FACT, augustus 2026)

- `ftrprf-labs/maculis-first-five.`: `src/engine/{model,gate,relations,candidates,engine,observations,interpret}.ts`
  (Reveal Engine 0.2, frozen), `src/live/technical.ts` (Technical Signals), `src/live/lenses/first-impression.ts`,
  `docs/pass-the-lens.md`, `docs/ux-observations-next-round.md`, `README.md`, `CLAUDE.md`.
- `ftrprf-labs/website`: `docs/BUILD_LOG.md`, `server/comm/{relationship,memory,pass-the-lens}.mjs`,
  `server/comm/ai/context.mjs`, `server/comm/migrations/*.sql`, `server/comm/providers/*`, `README.md`, `CLAUDE.md`.

### Finance API bronnen (officiële developer-documentatie)

- Exact Online: exact.com/developers; App Center review en rate-limit KB (support.exactonline.com).
- AFAS: help.afas.nl (App_Cnr_Rest_Api); docs.afas.help/profit/en/authentication.
- Twinfield: developers.twinfield.com; accounting.twinfield.com/webservices/documentation.
- Moneybird: developer.moneybird.com.
- Visma/Spiris: developer.vismaonline.com; selfservice.developer.vismaonline.com.
- SnelStart: b2bapi-developer.snelstart.nl; auth.snelstart.nl/b2b/token.
- e-Boekhouden: e-boekhouden.nl/koppelingen/api; SOAP manual cdn.e-boekhouden.nl/handleiding.
- Yuki: developer.yukisoftware.com.
- Mollie: docs.mollie.com. Stripe: docs.stripe.com.
- Open banking: docs.tink.com; myponto.com, isabel.eu/products/ponto; developer.gocardless.com/bank-account-data
  (status: nieuwe signups gesloten, docs offline 24 aug 2026).

### Marketing API bronnen (officiële developer-documentatie)

- Google Search Console API: developers.google.com/webmaster-tools/v1/searchanalytics/query; .../limits.
- GA4 Data API: developers.google.com/analytics/devguides/reporting/data/v1/rest; .../quotas.
- Google Business Profile API: developers.google.com/my-business/content/{prereqs,limits,policies}.
- Google Ads API: developers.google.com/google-ads/api/docs/api-policy/{developer-token,access-levels}.
- Meta: developers.facebook.com/docs/permissions; Marketing API Access Tier update (mei 2026).
- LinkedIn: learn.microsoft.com/linkedin/marketing/community-management/community-management-overview.
- Places API (New): developers.google.com/maps/documentation/places/web-service/place-details, .../usage-and-billing.
- Trustpilot pricing/API-gating; Google ToS scraping-verbod (developers.google.com/my-business/content/policies).

### Concurrentie-bronnen (leveranciers en reviewmateriaal, richtinggevend)

- Databox, Klipfolio, Geckoboard (dashboards). Agicap, Float, Helm, Dryrun; Visionplanner, Finstack (finance/cash).
- Silverfin, Fathom, Syft, Spotlight, Jirav, LivePlan (advisory). Swydo, AgencyAnalytics, Whatagraph, DashThis (marketing).
- M365 Copilot, Adviserry, UptiQ (AI-advisors). Semrush, Sitebulb, Woorank, Seobility (audit).
- NL AI-adoptie 2026: ondernemeneninternet.nl.

### Bewijsklasse-notitie

API-claims zijn FACT uit officiële documentatie tenzij gemarkeerd. Exacte quota-getallen en prijzen
bewegen; verifieer tegen de live doc bij implementatie. Concurrentie-prijzen zijn richtinggevend.
Enkele providerstatussen (GoCardless winddown, Ponto/Tink-details, Fluidly-status) zijn
hoog-vertrouwen-maar-verifieer.

---

*Einde masterplan. Dit document is RESEARCH ONLY en stuurt geen productiegedrag. Activatie van elke
volgende stap loopt via de menselijke poorten in sectie 40 en de Orchestrator-gates in sectie 39.*
