# First Five 1.1 — Evidence Capture Spec (voor latere, betrouwbare replay via de Orchestrator)

> Route A is afgesloten: de bestaande productiehistorie bevat onvoldoende bronmateriaal voor een
> betrouwbare CURRENT naar 1.1 replay (zie `docs/FIRST_FIVE_1_1_DATA_SEARCH.md`). Dit stuk legt
> duurzaam vast welke minimale evidence nodig is om First Five-cases later reproduceerbaar te kunnen
> replayen, hoe dat privacybewust en proportioneel kan, en dat dit een evaluation/observability-behoefte
> is, geen versoepeling van de Reveal Gate.
>
> **Datumcontext:** 2026-08-16. **Status:** SPECIFICATIE, duurzaam vastgelegd. **Niets gebouwd of
> gedeployed.** Geen Gate-wijziging. Vervolgwerk loopt via de centrale Maculis Orchestrator.
> Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## 0. Kernprincipe

Deze capture verandert niets aan wat First Five ziet of beslist. De frozen engine en de Gate draaien
identiek, met of zonder capture. Het doel is uitsluitend: de invoer bewaren die nodig is om een
analyse later deterministisch opnieuw af te spelen met een nieuwe evidence-extractor. Observability,
geen productgedrag.

Productregel blijft: **Never weaken a gate to avoid SILENCE. Expand evidence before lowering truth
standards.** Deze capture is een vorm van "expand evidence" op evaluatieniveau, niet op Gate-niveau.

## 1. Welke minimale analyse-evidence nu ontbreekt om te replayen

Om CURRENT naar 1.1 betrouwbaar te replayen moet je de nieuwe evidence opnieuw kunnen afleiden. De
vier IN-kandidaten (promise-vs-fact, DRIFT, review-echo, lens-provenance) lezen allemaal de
**opgehaalde, geparste paginacontent**. Precies dat wordt nu nergens bewaard (FACT, zie route A):

Ontbrekend, per geanalyseerde case:

- de **geparste paginaset** die de extractoren lezen, per pagina:
  - `role` (home/about/services/cases/contact/other), `finalUrl`;
  - `title`, `metaDescription`, `lang`;
  - `h1[]`, `h2[]`, `h3[]`, `navLabels[]`;
  - `bodyClean` (de reeds geschoonde, zichtbare tekst die de pijplijn toch al gebruikt);
  - de reeds afgeleide `technical` paginasignalen (deterministisch uit de HTML).
- lichte context: `observed_at`, `retrieval_layer`, `engine_version`, `pipeline_version`.

Wat NIET nodig is om te replayen (en dus niet bewaard hoeft te worden):

- ruwe HTML, scripts, afbeeldingen of assets;
- de volledige website (alleen de bounded paginaset die de retriever toch al selecteert);
- de afgeleide engine-output (observations, relations, candidates, gate-findings, reveal). Die zijn
  **deterministisch herleidbaar** uit de geparste paginaset door de pijplijn opnieuw te draaien.

Kortom: de ontbrekende minimale evidence is de **geparste RawPage-set plus versie- en tijdcontext**.
Alles wat CURRENT en 1.1 nodig hebben, valt daaruit opnieuw af te leiden.

## 2. Welke minimale toekomstige capture CURRENT naar Reveal/SILENCE reproduceerbaar maakt

Eén additief, append-only "replay bundle" per analyse (JSONL-regel), gekoppeld aan een case-id
(niet aan een persoon):

```
{
  case_id,                     // stabiel id per analyse (host + observed_at hash), geen PII
  host,                        // publiek domein
  observed_at,
  engine_version,             // maculis-reveal-0.2.0
  pipeline_version,           // maculis-live-0.14.0
  rawpages: [                 // de bounded, geparste paginaset (sectie 1)
    { role, finalUrl, title, metaDescription, lang, h1[], h2[], h3[], navLabels[],
      bodyClean,              // begrensd en PII-geredigeerd (sectie 3)
      technical }             // reeds afgeleide paginasignalen
  ],
  current_trace_summary: {    // ter verificatie dat replay CURRENT reproduceert (goedkoop, optioneel)
    outcome, reveal_family, reveal_wording,
    observation_count, relation_families[], gate_first_fail,
    first_impression_present, story_present, technical_teaser
  }
}
```

Met alleen `rawpages` bewaard kan elke toekomstige extractor (1.1 of later) offline draaien en de hele
keten `CURRENT naar evidence naar candidate naar Gate naar Reveal/SILENCE` deterministisch
reproduceren. De `current_trace_summary` is puur een verificatieanker: replay moet CURRENT exact
teruggeven, anders klopt de bundel niet.

Dit is genoeg voor de beslissende evaluatie. Meer bewaren is niet nodig.

## 3. Hoe dit privacybewust en proportioneel kan

De onderneming en haar site zijn publiek, maar minimalisatie blijft leidend (consistent met het
bestaande beleid: geen PII in logs, dataminimalisatie in de keten).

- **Alleen wat de extractoren lezen.** Geen ruwe HTML, geen assets, geen volledige site. Alleen de
  geparste velden uit sectie 1.
- **Bounded.** Dezelfde paginalimiet die de retriever al hanteert; `bodyClean` begrensd op een
  redelijke lengte per pagina.
- **PII-redactie van `bodyClean`.** E-mailadressen, telefoonnummers en soortgelijke patronen
  wegredigeren vóór opslag. Ze zijn niet nodig voor de reveal-logica en horen niet in een
  evaluatiestore.
- **Gekoppeld aan een case-id, nooit aan een persoon.** De replay-store staat los van de
  participant- en consent-data. Geen tester-PII, geen tokens.
- **Zelfde fail-closed capture-grondslag als de bestaande sessie-capture.** Alleen vastleggen voor
  een door Testerbeheer uitgenodigde pilotdeelnemer (aanwezig in `participants.json`) of met expliciete
  capture-toestemming. Organische bezoekers: niets vastleggen.
- **Doelbinding en korte retentie.** Uitsluitend voor de pilot-evaluatie, met een TTL die het
  pilotvenster niet overschrijdt, daarna automatisch verwijderen. Verwijderbaar per case-id.
- **Aparte store, additief, feature-flagged, uit by default.** Geen effect op de ervaring, net als de
  bestaande PII-veilige ANALYSE-log en sessie-capture.

## 4. Dit is evaluation/observability, geen Gate-versoepeling

Expliciet vastgelegd: de replay-capture raakt de reveal-beslissing niet. De frozen engine en de Gate
blijven ongewijzigd en autoritair. Of we de bundel nu wel of niet opslaan, de uitkomst (Reveal of
SILENCE) is identiek. De capture is een side-channel schrijfactie voor observability. Ze verlaagt geen
enkele drempel, introduceert geen nieuwe reveal, en mag nooit als hefboom gebruikt worden om vaker
iets te tonen. Evidence uitbreiden op evaluatieniveau staat los van de waarheidsstandaard.

## 5. De vier First Five 1.1-uitbreidingen blijven hypotheses

Status van de vier IN-kandidaten (generalized promise-vs-fact, DRIFT, één outside-in review-echo,
lens-provenance): **kandidaten met goede technische onderbouwing uit de echte-pijplijn ronde, nog geen
productbesluit.** Ze blijven expliciet hypotheses totdat echte pilot-evidence (via de replay-bundels
uit sectie 2) ze ondersteunt, beoordeeld op de ondernemersvragen (waar, verrassend, betekenisvol, zou
ik anders handelen, voelt het als Maculis die iets ziet versus een audittool die iets vindt). Zonder
die evidence wordt geen enkele extension een vast onderdeel van First Five.

## 6. De bestaande echte SILENCE-cases blijven regressiecontroles

Deze echte cases (uit route A) blijven expliciete regressiecontroles voor elke toekomstige 1.1-variant.
Ze moeten stil blijven, en de bestaande reveal mag niet verslechteren:

- **Moeten SILENCE blijven:** `ama-ned.nl`, `cepezed.nl`, `buurtzorg.com`, `restaurantdekas.nl`,
  `topzorggroep.nl`, `oca.nl`, `strategie.nl`.
- **Moet REVEAL blijven, ongewijzigd of beter:** `psycholoognederland.org` (CONTRADICTION).
- **Gelaagde ervaring blijft gescheiden:** `oca.nl` en `hema.nl` geven wel een technische thermometer
  maar géén reveal; `ama-ned.nl` geeft geen van beide.

Een 1.1-variant die één van deze regressies breekt, valt af, ongeacht hoeveel nieuwe reveals hij elders
oplevert.

## 7. Onderscheid: normale productie versus tijdelijke pilot-evaluatie

| | Normale productie | Tijdelijke pilot-evaluatie |
|---|---|---|
| Replay-bundel (sectie 2) | **niet nodig** | **nodig**, tijdelijk |
| ANALYSE-log (host + outcome + technisch aggregaat) | blijft (PII-veilig) | blijft |
| Sessie-capture (bestaand, consent-gated) | blijft | blijft |
| RawPage-opslag | **nee** | ja, bounded + PII-geredigeerd + TTL |
| Feature-flag | uit | aan, alleen tijdens pilot |
| Grondslag | n.v.t. | uitgenodigde deelnemer / expliciete capture-consent |

First Five functioneert in normale productie volledig zonder deze capture. De replay-bundel is
uitsluitend een tijdelijke evaluatievoorziening, uit by default, en verdwijnt na de pilot.

## 8. Aanbeveling: de kleinste manier om toekomstige pilots voldoende evidence te laten opleveren

**Voeg, uitsluitend achter een pilot-only feature-flag en op de bestaande fail-closed
capture-grondslag, één additieve side-channel toe die per analyse één replay-bundel (sectie 2)
append't: de bounded, PII-geredigeerde geparste paginaset plus versie- en tijdcontext, gekoppeld aan een
case-id, met korte TTL, in een aparte store, uit by default, zonder enig effect op de ervaring of de
Gate.**

Dat is het minimum. Het hergebruikt precies de data die de pijplijn toch al parseert, voegt niets toe
aan wat getoond of besloten wordt, en levert genoeg om later CURRENT naar 1.1 (en toekomstige
extensies) deterministisch te replayen. Daarmee kan de beslissing over de vier hypotheses later langs
de normale Maculis Orchestrator-route worden genomen: de replay-bundels voeden de EVALUATION-task, de
regressiecontroles uit sectie 6 bewaken de waarheidsstandaard, en POST_PILOT_REVIEW bepaalt welke
extensies First Five in mogen (zie `docs/orchestrator/lens-development-tasks.md`).

## 9. Overdracht en stop

- **Niets gebouwd of gedeployed.** Dit is een specificatie.
- **Geen Gate-wijziging, geen nieuwe UX, geen Lens 2, geen productie-uitrol, geen PR.**
- **Vervolgwerk loopt via de centrale Orchestrator.** Er bestaat al een `maculis-orchestrator` service
  in de Maculis-workspace; zodra die klaar is om dit te coördineren, pakt hij deze workstream op:
  pilot-capture activeren (flag), replay-bundels verzamelen, EVALUATION draaien op echte cases,
  regressies bewaken, en via POST_PILOT_REVIEW de First Five 1.1 scope definitief maken.

Deze workstream stopt hier tot de Orchestrator dit vervolg coördineert.
