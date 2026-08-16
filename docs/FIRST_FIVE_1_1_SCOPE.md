# First Five 1.1 — definitieve scope, en de laatste bewijsronde op echte cases

> Sluit `docs/FIRST_FIVE_1_1_GONOGO.md` af. Richting akkoord, nog geen productie-build. Dit stuk doet
> drie dingen: (1) het lost de toegang tot echte pilotcases zo ver mogelijk op en benoemt exact de
> minimale menselijke handeling die nog nodig is, zonder nieuwe synthetische fixtures te bouwen; (2)
> het legt het drie-uitkomsten-kader vast (Duiding, Reveal, Technische thermometer) en toont het op de
> echte data die wél beschikbaar is; (3) het geeft één definitief voorstel voor de First Five 1.1
> scope, inclusief wat expliciet niet meegaat.
>
> **Datumcontext:** 2026-08-16. **Status:** RESEARCH / PROTOTYPE. Geen Gate-wijziging, geen productie,
> geen nieuwe UX, geen Lens 2-build, geen PR.
> Productregel gehandhaafd: **Never weaken a gate to avoid SILENCE. Expand evidence before lowering
> truth standards.** Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## 1. Toegang tot echte pilotcases: wat wel en niet kan (eerlijk)

Ik heb geen nieuwe synthetische fixtures gebouwd. In plaats daarvan heb ik geprobeerd echte cases te
bereiken en dat expliciet getoetst.

**Wat is getoetst (FACT):**

- **Directe fetch van echte sites**: de netwerk-egressproxy weigert CONNECT naar publieke sites met een
  **403 policy denial**. Gemeten voor exact de gedocumenteerde echte First Five cases: `www.ama-ned.nl`,
  `brandingbysam.nl`, `oca.nl`, `www.hema.nl` (proxy-status `recentRelayFailures`, 2026-08-16).
- **WebFetch** naar `www.ama-ned.nl`: `EGRESS_BLOCKED`.
- **Productie First Five** (`ftrlabs-testerbeheer.onrender.com`): `EGRESS_BLOCKED` (eerder al vastgesteld).
- **Repo-inhoud**: de gecommitte content-fixtures (`brandingbysam.nl`, `praktijk.nl`, `coherent.nl`,
  selftest) zijn representatieve testfixtures, geen echte crawls. De enige **echt** waargenomen data in
  de repo zijn de technische signalen van `ama-ned.nl`, `hema.nl`, `oca.nl` (TECHPROBE 2026-08-15).

**Conclusie:** echte pilotcases (echte klantsites met inhoud, of productie-analyses) zijn vanuit deze
omgeving niet bereikbaar. Publieke-webtoegang is per netwerkbeleid uitgeschakeld.

**Wat ik in plaats daarvan heb geleverd (zodat de laatste ronde één handeling is):** een kant-en-klaar
**real-case runner** die de echte First Five pijplijn met de echte `ServerRetriever` op echte URLs
draait en per case de drie uitkomsten print (`docs/research/first-five-1.1-eval/run-real-cases.ts`).
End-to-end geverifieerd: hij draait, en elke fetch geeft `ACCESS_FAILED` puur door het egressbeleid.
Zodra hij ergens met internettoegang draait, produceert hij het volledige echte-case rapport.

### 1.1 Exacte minimale menselijke handeling (kies er één)

- **Optie A (kleinste, aanbevolen).** Draai de runner op een machine met internettoegang (jouw laptop,
  of een shell op de First Five deploy) met 10 tot 20 echte pilot-URL's:
  ```
  cd <first-five-repo> && npm install
  node_modules/.bin/tsx <pad>/run-real-cases.ts https://echte-pilotsite-1.nl https://echte-pilotsite-2.nl ...
  ```
  Eén commando, geen code van jouw kant. Levert precies het drie-uitkomsten rapport per echte case.
- **Optie B.** Exporteer N echte First Five analyse-traces (de pijplijn produceert al een `LiveTrace`
  JSON per analyse) uit productie en zet ze in de repo. Ik voeg een korte offline-lezer toe die
  hetzelfde rapport uit die echte traces genereert. Vergt een export-stap van jouw kant.
- **Optie C.** Zet voor deze omgeving publieke-web-egress aan (of een allowlist met de pilotdomeinen)
  in het netwerkbeleid. Dan draai ik de runner hier en rapporteer ik de echte cases zelf.

Aanbeveling: **Optie A.** Het is de kleinste echte handeling en gebruikt echte productie-egress plus
echte sites. Ik lever het instrument; jij levert de ene stap die alleen een mens kan doen.

## 2. Het drie-uitkomsten-kader (vastgelegd)

Voor elke First Five analyse zijn er drie afzonderlijke uitkomsten. Ze zijn conceptueel gescheiden en
worden in de pijplijn ook los opgeleverd (FACT: `AnalyseResult` heeft aparte velden `reveal`,
`first_impression` plus `story`, en `technical_signals`).

1. **Duiding** (`first_impression` + `story`): wat Maculis zakelijk en betrouwbaar teruggeeft, ook
   zonder Reveal. Gegrond, verbatim onderbouwd, nooit een aanbeveling of audit.
2. **Reveal** (`reveal`): haalt één evidence-relatie werkelijk de bestaande strenge Gate? Frozen engine
   eerst; PatternReader v1 synthese alleen op de SILENCE van de engine.
3. **Technische thermometer** (`technical_signals`): nuttige technische signalen, nadrukkelijk **geen**
   Reveal. Fail-closed teaser.

**Kernpunt (vastgelegd):** SILENCE betekent alleen dat er geen Reveal is. Het mag nooit betekenen dat de
gebruiker geen waardevolle First Five-uitkomst krijgt. Duiding en de technische thermometer staan los
van de Reveal en blijven beschikbaar bij SILENCE.

### 2.1 Het kader op de ECHTE data die wél beschikbaar is (technische thermometer)

Met de werkelijk waargenomen technische signalen (TECHPROBE, echte sites):

| Site (echt) | Reveal | Duiding | Technische thermometer (uitkomst 3) |
|-------------|--------|---------|--------------------------------------|
| ama-ned.nl | geen (terecht) | blijft beschikbaar bij SILENCE | **null** (fail-closed, niets geforceerd) |
| hema.nl | n.v.t. hier | blijft beschikbaar bij SILENCE | **PRESENT** (SEO: geen H1 op de homepage) |
| oca.nl | n.v.t. hier | blijft beschikbaar bij SILENCE | **PRESENT** (toegankelijkheid: 104 van 143 afbeeldingen zonder alt-tekst) |

Dit is het bewijs, op echte data, dat de drie lagen onafhankelijk zijn: een goed gebouwde site
(ama-ned) krijgt geen geforceerde reveal en geen geforceerde teaser; een site met een echt technisch
signaal (hema, oca) krijgt geen reveal maar wél een nuttige thermometer. De inhoudelijke Reveal- en
Duiding-lagen op echte cases wachten op de handeling uit sectie 1.1.

## 3. Wat de twee eerdere echte-pijplijn-rondes al vaststellen over de vier IN-kandidaten

De go/no-go (`FIRST_FIVE_1_1_GONOGO.md`) draaide de **echte** live pijplijn (`analyseWebsite`, frozen
engine en Gate onaangeroerd) met **echte** prototype-extractoren. Dat is geen synthetisch bewijs over de
engine: het is de echte engine, gevoed met evidence die de extractoren deterministisch uit HTML halen.
Wat daar is vastgesteld, blijft staan en stuurt de scope:

- **promise-vs-fact (CONTRADICTION)** en **DRIFT**: schone SILENCE→REVEAL, gegrond in verbatim citaten,
  regressies bleven stil. Sterk.
- **één review-echo (MISCAST)**: sterk en verrassend; forceerde niets op een bewezen site.
- **waarde/positionering-absentie**: vuurde in geen enkele case, redundant met PatternReader v1. Valt af.

Wat nog ontbreekt en alleen echte pilotcases kunnen geven, is de **ondernemersbeoordeling** per reveal:
voelt dit als een echte onthulling of achteraf toch auditachtig, en zou de ondernemer denken "zo had ik
het nog niet bekeken". Daarvoor is de runner uit sectie 1.1 bedoeld. Meet dan, per case:

- welke nieuwe Reveal daadwerkelijk waardevol is versus achteraf auditachtig of gezocht;
- of bestaande sterke Reveals veranderen of verslechteren (let op de review-echo die een PatternReader
  synthese kan verdringen);
- hoeveel correcte SILENCE-cases correct SILENCE blijven;
- en wat de gebruiker in elke SILENCE-case wél krijgt via Duiding en technische thermometer.

De runner print exact deze velden per case.

## 4. Definitief voorstel: First Five 1.1 scope

### 4.1 Gaat mee (IN), achter evaluatie op echte cases, nog geen brede uitrol

1. **Generalized promise-vs-fact (CONTRADICTION).** Belofte-feit spanning breder dan alleen wachttijd
   (prijs-transparantie, bereikbaarheid). Twee verbatim citaten, laag false-positive.
2. **DRIFT waar werkelijk observeerbaar.** "Bieden wij niet meer aan" bij een geadverteerde dienst.
   Zeldzaam, maar zeker en scherp.
3. **Eén outside-in review-echo (MISCAST).** Precies **één** sterk publiek signaal. Bewust géén
   Reputation Lens in vermomming: geen review-aggregatie, geen rating-analyse, geen tweede corpus.
4. **Perspective/lens provenance.** Elke claim draagt zijn perspectief-tag. Kleine infrastructuur, geen
   Gate- of gedragsverandering. Vergt één kleine productiedoorvoer (`CandidateClaim.lens` plus
   `toClaimEvidence`).

Alle vier passeren de **bestaande** quality gate en voeden de **frozen** engine. UX ongewijzigd: interne
perspectieven, geen zichtbaar vierluik.

### 4.2 Gaat expliciet NIET mee (OUT)

- **Brede waarde/positionering-absentie (TELLING_ABSENCE).** Te auditachtig, hoogste false-positive,
  vuurde in geen enkele echte-pijplijn-case, en redundant met de bestaande PatternReader v1 value-open
  synthese. Niet in First Five 1.1.
- **Elke Gate-versoepeling.** Nooit. De winst komt uit evidence, niet uit een lagere drempel.
- **Nieuwe UX / zichtbare lenzen.** De perspectieven blijven intern.
- **Brede productie-uitrol of verbreding van de productie-selector** zonder echte pilot-aanleiding.

### 4.3 Gereserveerd voor Lens 2 (niet in First Five)

- **Volledige review- en reputatie-intelligentie**: de complete publieke review-corpus, rating,
  sentiment-thema's, en dedicated belofte-versus-buitenwereld framing (GBP-eigenaar, Level 3). First
  Five 1.1 houdt bewust bij één review-echo; de diepte is Lens 2.
- **Het "waarde niet zichtbaar" thema als expliciet product**: deels al door PatternReader v1, verder
  uit te bouwen in Lens 2.

## 5. Beslispunt

De richting en de vier IN-items zijn onderbouwd op de echte engine en de echte pijplijn. Wat rest voor
een productie-go is de ondernemersbeoordeling op echte pilotcases, en die is nu één menselijke handeling
ver (sectie 1.1, Optie A). Ik heb geen productiecode gewijzigd, geen Gate versoepeld, geen Lens 2
gebouwd, geen nieuwe UX toegevoegd en geen PR geopend.

**Voorstel:** kies Optie A en draai de runner op 10 tot 20 echte pilot-URL's (met optioneel één publieke
review-quote per host). Lever de output terug; dan rapporteer ik de ondernemersbeoordeling per case en
bevestigen of herzien we de scope uit sectie 4. Pas daarna beslissen we over implementatie.

## 6. Reproduceerbaarheid en bestanden

- `docs/research/first-five-1.1-eval/run-real-cases.ts` — de real-case runner (drie uitkomsten per case,
  CURRENT vs 1.1, value-absence uit).
- `docs/research/first-five-1.1-eval/prototype-extractors.ts` — de extractoren, met
  `includeValueAbsence: false` als definitieve scope.
- `docs/research/first-five-1.1-eval/eval-live-pipeline.ts` en `results-live-pipeline.txt` — de eerdere
  echte-pijplijn ronde.
- `docs/FIRST_FIVE_1_1_GONOGO.md` en `docs/FIRST_FIVE_1_1_DEEP_DIVE.md` — de onderbouwing.

---

*Einde scope-voorstel. Geen Gate-wijziging, geen productie, geen nieuwe UX, geen Lens 2, geen PR. De
laatste bewijsronde op echte cases staat klaar en is één menselijke handeling ver.*
