# First Five 1.1 — Minimale verdieping: prototype, bewijs op cases, en go/no-go

> Vervolg op `docs/FIRST_FIVE_1_1_DEEP_DIVE.md`. GO ontvangen voor de **minimale** evidence-verdieping
> (prototype), niet voor brede 1.1 of productie-uitrol. Dit stuk bouwt de kleinste evidence-uitbreiding
> als **echt draaiende prototype-extractoren**, draait ze door de **echte live First Five pijplijn**
> (`analyseWebsite`) met de **frozen Reveal Engine en Gate onaangeroerd**, beoordeelt elke nieuwe reveal
> op de vijf kwaliteitsvragen, en eindigt met een go/no-go per uitbreiding.
>
> **Datumcontext:** 2026-08-15. **Status:** RESEARCH / PROTOTYPE. Geen productiecode gewijzigd, geen
> Gate versoepeld, geen Lens 2, geen productie-uitrol. Geen PR.
> Productregel gehandhaafd: **Never weaken a gate to avoid SILENCE. Expand evidence before lowering
> truth standards.** Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## 0. Belangrijke architectuurcorrectie (FACT, deze ronde ontdekt)

De live First Five reveal is niet alleen de frozen 0.2 engine. In `src/live/pipeline.ts` geldt:

1. de **frozen engine draait eerst** (`runEngine`, families CONTRADICTION / TELLING_ABSENCE / MISCAST /
   DRIFT); een extra guard `absenceDefensible` degradeert een zwakke TELLING_ABSENCE naar SILENCE;
2. **alleen bij SILENCE** draait **PatternReader v1** (`runPatternReader`), een SurfaceMap-synthese die
   vandaag precies één patroon kent: `IDENTITY_OFFER_CLEAR__VALUE_OPEN` (identiteit en aanbod helder,
   maar waarde en onderscheid blijven open);
3. bij SILENCE tonen de **silence-observaties** (First Impression, Story) rustige duiding;
4. de **technische signalen** zijn een aparte laag (teaser, fail-closed).

Dit betekent dat het `waarde`-perspectief al deels bediend wordt door PatternReader v1. Dat weegt zwaar
mee in de go/no-go hieronder. Reveal, duiding en technische signalen blijven conceptueel gescheiden,
precies zoals gevraagd.

## 1. Wat is gebouwd (prototype, niet in productie)

Vijf minimale evidence-uitbreidingen als **echte deterministische extractoren** over reeds opgehaalde
HTML (`docs/research/first-five-1.1-eval/prototype-extractors.ts`). Ze implementeren de bestaande
`ClaimExtractor`-interface, zodat de **echte** live pijplijn ze ongewijzigd draait, en ze voeden de
**frozen** engine en Gate zonder die te raken:

1. **waarde/belofte-evidence**: specifieke, niet-wallpaper positioneringsclaims (`lens: waarde`).
2. **generalized promise-vs-fact**: belofte-feit CONTRADICTION breder dan alleen wachttijd (bijv.
   prijs-transparantie versus "op aanvraag", bereikbaarheid versus openingstijden).
3. **DRIFT waar werkelijk observeerbaar**: "bieden wij niet meer aan" bij een geadverteerde dienst.
4. **één betrouwbare outside-in review-echo**: één publieke reviewquote als `external_signal`
   (modelleert wat één Places-lookup teruggeeft).
5. **perspective/lens provenance**: elke claim draagt zijn perspectief-tag mee.

Elke voorgestelde claim passeert de **bestaande** live quality gate (grounding, atomair,
niet-wallpaper, geen inflatie) voordat de engine hem ziet. Niets omzeilt de bestaande lat.

## 2. Methode

Twee delen.

- **Part A (content reveal):** de echte `analyseWebsite` draait tweemaal per case, CURRENT (alleen
  `DeterministicClaimExtractor`) versus NEW (`Deterministic` + prototype), met een stub-retriever over
  representatieve pagina-fixtures. Dit doorloopt de **hele** live keten: frozen engine, absenceDefensible,
  PatternReader-fallback, silence-observaties. Elke case toont: CURRENT-uitkomst, welke nieuwe evidence
  geaccepteerd werd, de kandidaat-relaties, de Gate-uitkomst, en de uiteindelijke Reveal of SILENCE.
- **Part B (gelaagde ervaring, ECHTE data):** de werkelijk waargenomen technische signalen van
  `ama-ned.nl`, `hema.nl` en `oca.nl` (uit de repo-regressietest, TECHPROBE 2026-08-15) tonen dat Reveal
  en technische duiding gescheiden lagen zijn.

**Eerlijke beperking (belangrijk).** Echte First Five pilotdata (echte geanalyseerde klantsites met
inhoud) staat niet in de repo en was niet bereikbaar: egress naar de productiehost is in deze omgeving
geblokkeerd. Part A gebruikt daarom twee echte content-fixtures uit de First Five testsuite
(`brandingbysam.nl`, `praktijk.nl`, `coherent.nl`) plus representatieve, gelabelde fixtures die elk een
nieuwe evidence-familie uitoefenen. De prototype-extractoren zijn echt en deterministisch, dus zodra
echte pilotdata beschikbaar is draait dezelfde harness er ongewijzigd op (zie sectie 7, human action).

## 3. Resultaten per case (CURRENT → nieuwe evidence → kandidaat → Gate → uitkomst)

Volledige log: `docs/research/first-five-1.1-eval/results-live-pipeline.txt`.

| Case | Echt? | CURRENT | Nieuwe evidence (geaccepteerd) | Gate-kandidaat | NEW uitkomst |
|------|-------|---------|-------------------------------|----------------|--------------|
| brandingbysam | ja | REVEAL pattern:VALUE_OPEN | (geen) | - | REVEAL pattern:VALUE_OPEN (behouden) |
| praktijk | ja | REVEAL frozen:CONTRADICTION | (geen) | CONTRADICTION | REVEAL frozen:CONTRADICTION (behouden) |
| coherent | ja | REVEAL pattern:VALUE_OPEN | (geen) | - | REVEAL pattern:VALUE_OPEN (bestaand, niet door 1.1) |
| amaned-like | repr. | SILENCE | (geen geaccepteerd) | - | **SILENCE** (regressie correct) |
| premium-studio | repr. | REVEAL pattern:VALUE_OPEN | value-positioning | - (onderdrukt) | REVEAL pattern:VALUE_OPEN (ongewijzigd) |
| bouwadvies-prijs | repr. | SILENCE | promise-fact:prijzen | CONTRADICTION | **REVEAL frozen:CONTRADICTION** (nieuw) |
| snel-vs-review | repr. | REVEAL pattern:VALUE_OPEN | review-echo:begeleiding | MISCAST | **REVEAL frozen:MISCAST** (kind gewisseld) |
| drift-training | repr. | SILENCE | drift:trainingen | DRIFT | **REVEAL frozen:DRIFT** (nieuw) |
| daktuin-proof | repr. | SILENCE | review-echo:daktuinen | - | **SILENCE** (review forceert niet; bewijs onderdrukt) |
| wallpaper-co | repr. | SILENCE | (geen geaccepteerd) | - | **SILENCE** (regressie correct) |
| maatwerk-proof | repr. | SILENCE | value-positioning | - (onderdrukt) | **SILENCE** (bewijs onderdrukt) |

**Aggregaat:** CURRENT reveals 5/11, NEW reveals 7/11. Twee schone SILENCE→REVEAL flips uit nieuwe
evidence (CONTRADICTION-prijs, DRIFT), beide frozen-engine, beide gegrond in verbatim citaten. Eén
reveal-kind wissel (review-echo MISCAST verving een PatternReader value-open). Alle bewezen, wallpaper-
en goed-gebouwde regressies bleven SILENCE. De review-echo forceerde géén reveal op de bewezen site
(daktuin-proof).

**Voorbeeldwoordingen (gemeten, gegrond):**
- CONTRADICTION: "Je belofte is 'transparante prijzen'. Je eigen site zegt óók 'Neem contact op voor
  een offerte'."
- DRIFT: "Je site biedt 'trainingen' nog aan. Maar dat lever je niet meer."
- MISCAST: "In je etalage staat 'begeleiding' niet voorop. Maar je klanten noemen juist dát."

## 4. Beoordeling op de vijf kwaliteitsvragen

Per nieuwe reveal-familie, streng beoordeeld.

### 4.1 generalized promise-vs-fact (CONTRADICTION) — bouwadvies-prijs

1. **Onthulling of auditbevinding?** Onthulling. Het legt de eigen belofte naast het eigen feit; dat
   is een spanning, geen checklist-item.
2. **"Verrek, zo had ik het nog niet bekeken"?** Plausibel. De ondernemer ziet zelden dat zijn
   prijsbelofte en zijn contactpagina elkaar tegenspreken.
3. **Volledig door evidence gedekt?** Ja. Beide kanten zijn verbatim citaten met bron-URL.
4. **Sterke sites terecht stil?** Ja. Regressies bleven SILENCE.
5. **Voegt toe zonder langer/technischer/rapportachtiger?** Ja. Eén zin, past in de bestaande beat.

**Verdict: GO (IN).**

### 4.2 DRIFT (verouderde belofte) — drift-training

1. **Onthulling?** Ja. "Je adverteert iets dat je niet meer levert" is een echte spanning.
2. **"Verrek"?** Ja, hoog. Dit is vaak een blinde vlek (oude pagina bleef staan).
3. **Evidence-gedekt?** Ja, verbatim "bieden wij niet meer aan" plus de geadverteerde term.
4. **Sterke sites stil?** Ja. Vuurt alleen bij een expliciet "niet meer".
5. **Niet-intrusief?** Ja. Zeldzaam maar veilig en scherp.

**Verdict: GO (IN), narrow.** Vuurt zelden, maar wanneer wel, is het sterk en zeker.

### 4.3 outside-in review-echo (MISCAST) — snel-vs-review

1. **Onthulling?** Ja, en de sterkste in surprise: de buitenwereld benoemt een kracht die de etalage
   verzwijgt.
2. **"Verrek"?** Ja, hoog.
3. **Evidence-gedekt?** Ja: interne proof (herhaalde term) plus één externe reviewquote.
4. **Sterke sites stil?** Ja. Op de bewezen site (daktuin-proof) forceerde de review niets.
5. **Niet-intrusief?** Ja, één zin. **Let op:** het verving hier een PatternReader value-open reveal
   (kind-wissel, geen netto extra reveal). De MISCAST is specifieker en verrassender, dus de wissel is
   een verbetering, maar het is een swap, geen stapeling.

**Verdict: GO (IN), met zorg.** Neem de **enkele** review-echo. Het vergt een publieke Places-lookup
(kleine kost, sectie 7). De volledige review-corpus en rating horen bij Lens 2, niet hier.

### 4.4 waarde/positionering-absentie (TELLING_ABSENCE) — premium-studio, maatwerk-proof

1. **Onthulling?** Zwak. "Je claimt premium, toont geen bewijs" leunt naar auditbevinding.
2. **"Verrek"?** Beperkt.
3. **Evidence-gedekt?** Deels, maar hoog false-positive risico: bewijs kan offline bestaan.
4. **Sterke sites stil?** Ja, maar om de verkeerde reden: **in de praktijk vuurde deze familie in geen
   enkele case een gate-passerende reveal.** Bij premium-studio onderdrukte de eigen herhaling van de
   term (proof_emphasis L2) de absentie; bij maatwerk-proof idem.
5. **Niet-intrusief?** Zou, als het vuurde, de nette PatternReader value-open synthese kunnen
   verdringen door een auditachtiger absentie.

**Verdict: NO-GO / RESERVE.** Empirisch zwak (vuurt niet), redundant met PatternReader v1 dat
"waarde open" al eleganter als synthese brengt, en het meest auditachtig van de set. Neem dit **niet**
mee in de minimale verdieping. Bewaar het thema "waarde niet zichtbaar" bij PatternReader v1 en Lens 2.

### 4.5 perspective/lens provenance

Infrastructuur, geen reveal. De extractoren taggen elk perspectief. Om de tag door de pijplijn te
dragen is één kleine productiewijziging nodig (`CandidateClaim.lens` plus `toClaimEvidence` de tag laten
doorgeven). De tag verandert geen enkele Gate-uitkomst (bewezen: CONTRADICTION is toch al undeniable),
maar maakt latere labeling en cross-perspectief-framing mogelijk.

**Verdict: GO (IN), infrastructuur.** Klein, veilig, geen gedragsverandering.

## 5. De gelaagde ervaring (Part B, ECHTE data)

Met de werkelijk waargenomen technische signalen:

| Site (echt) | Reveal | Technische teaser |
|-------------|--------|-------------------|
| ama-ned.nl | geen (terecht) | **null** (fail-closed, niets geforceerd) |
| hema.nl | (n.v.t. hier) | **PRESENT** (SEO: geen H1) |
| oca.nl | (n.v.t. hier) | **PRESENT** (toegankelijkheid: 104 van 143 afbeeldingen zonder alt) |

Dit bevestigt het productpunt expliciet: een site kan **terecht geen reveal** krijgen en tóch nuttige,
evidence-based duiding krijgen over technische kwaliteit (hema, oca), terwijl een werkelijk goed
gebouwde site (ama-ned) noch een geforceerde reveal noch een geforceerde teaser krijgt. **Reveal,
contextuele duiding en technische signalen blijven gescheiden lagen.** SILENCE van de Reveal Engine
maakt de ervaring niet inhoudsloos.

## 6. Go/No-Go besluit

### Mogen First Five in (minimale verdieping, achter evaluatie, nog geen productie-uitrol):

- **generalized promise-vs-fact (CONTRADICTION)** — sterk, gegrond, laag false-positive. **IN.**
- **DRIFT waar werkelijk observeerbaar** — zeldzaam maar zeker en scherp. **IN.**
- **één outside-in review-echo (MISCAST)** — sterk en verrassend; neem alleen de enkele echo. **IN.**
- **perspective/lens provenance** — veilige infrastructuur, geen gedragsverandering. **IN.**

### Vallen af (te auditachtig, zwak of foutgevoelig):

- **brede waarde/positionering-absentie (TELLING_ABSENCE)** — vuurde in geen enkele case, redundant
  met PatternReader v1, hoogste false-positive en meest auditachtig. **NO-GO in First Five.**

### Bewaren voor Lens 2:

- **de volledige publieke review-corpus, rating en dedicated reputatie-framing** (GBP-eigenaar). First
  Five 1.1 neemt alleen de enkele review-echo; de diepe belofte-versus-buitenwereld analyse is Lens 2.
- **het "waarde niet zichtbaar" thema als expliciet product**: deels al door PatternReader v1, verder
  uit te bouwen in Lens 2, niet als First Five audit-absentie.

### Is volgorde C na deze cases nog steeds de beste?

**Ja, bevestigd.** De minimale verdieping levert op de echte pijplijn twee schone nieuwe reveal-families
(CONTRADICTION-generiek, DRIFT) plus een sterke review-echo MISCAST, met de frozen engine en Gate
onaangeroerd en alle regressies stil. Dat is directe productwinst in de lopende pilot, tegen dagen
werk. De review-echo bewijst de kern-waarde van Lens 2 (belofte versus buitenwereld) binnen First Five,
en de-risket zo Lens 2. C (minimale First Five verdieping eerst, daarna Lens 2) blijft de beste
volgorde, nu met de bijstelling dat de waarde-absentie-familie eruit valt.

## 7. Minimale implementatiescope en wat nog nodig is

**Wat mag gebouwd worden (na jouw go, nog geen brede uitrol):** de vier IN-items als additieve
deterministische extractoren plus de kleine lens-provenance doorvoer, elk achter de bestaande quality
gate, UX ongewijzigd (interne perspectieven, geen vierluik), frozen engine en Gate onaangeroerd.

**Bewust niet nu:** de waarde-absentie-familie, de volledige review-corpus (Lens 2), en elke
productie-uitrol of selector-verbreding zonder echte pilot-aanleiding.

**Human actions om dit op ECHTE pilotdata te bewijzen:**

- **HUMAN ACTION.** Lever een representatieve set echte First Five pilot-cases (geanalyseerde
  klantsites) of tijdelijke leestoegang tot productie-analyses. De prototype-harness draait er
  ongewijzigd op. Nodig omdat egress naar de productiehost hier geblokkeerd is.
- **HUMAN ACTION.** Places API-key en billing voor de review-echo (betaalde calls). Financiële
  verplichting.

## 8. Reproduceerbaarheid

Prototype en harness staan in `docs/research/first-five-1.1-eval/`:
`prototype-extractors.ts` (de vijf uitbreidingen), `eval-live-pipeline.ts` (draait de echte
`analyseWebsite`, CURRENT versus NEW, plus de echte technische signalen), `results-live-pipeline.txt`
(de opgeslagen run). Eén commando: `node_modules/.bin/tsx eval-live-pipeline.ts` vanuit de First Five
repo. Geen productiecode gewijzigd; de harness importeert de repo verbatim.

---

*Einde go/no-go. PROTOTYPE ONLY. Geen Gate versoepeld, geen Lens 2 gebouwd, geen productie-uitrol, geen
PR. Aanbeveling: bouw de vier IN-items als evaluatie-prototype verder uit en bewijs ze op echte
pilotdata; laat de waarde-absentie vallen; bewaar de volledige reputatie-analyse voor Lens 2. Wacht op
jouw go/no-go besluit.*
