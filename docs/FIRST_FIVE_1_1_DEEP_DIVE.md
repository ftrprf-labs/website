# First Five — Latent Lens Deep Dive & 1.1 Proposition

> Gerichte vervolgopdracht op `docs/LENS_STRATEGY_MASTERPLAN.md` (baseline commit `b264143`,
> geaccepteerd). Onderzoekt de vier bestaande perspectieven in de frozen Reveal Engine, bewijst met
> echte fixtures of een First Five 1.1 waarde toevoegt zonder de Gate te versoepelen, vergelijkt die
> investering met Lens 2, en geeft één aanbeveling.
>
> **Datumcontext:** 2026-08-15. **Status:** RESEARCH ONLY. Geen productiecode gewijzigd. Geen PR.
> Bewijsklassen: FACT (uit code/officiele bron), INFERENCE, HYPOTHESIS, RECOMMENDATION.
> Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## Productregel (vastgelegd, permanent)

> **Never weaken a gate to avoid SILENCE. Expand evidence before lowering truth standards.**

SILENCE is een first-class succesuitkomst. Als de Gate zwijgt, is het antwoord meer en betere
evidence, nooit een lagere waarheidsstandaard. Deze regel geldt voor First Five en voor elke
toekomstige lens. De hele analyse hieronder respecteert hem: alle gemeten winst komt uit rijkere
evidence door de **ongewijzigde** frozen Gate.

---

## 1. Wat de vier perspectieven werkelijk betekenen

De frozen engine (`src/engine/model.ts`, `maculis-reveal-0.2.0`) declareert vier perspectieven
(FACT):

```ts
export type Lens = "zichtbaarheid" | "toestroom" | "verbondenheid" | "waarde";
```

Uit model, code en productgedachte gereconstrueerd:

| Perspectief | Betekenis (productgedachte) | Kernvraag die het stelt |
|-------------|------------------------------|--------------------------|
| **zichtbaarheid** | hoe de onderneming zichzelf presenteert (etalage) | klopt wat ik toon met wie ik ben? |
| **toestroom** | hoe vraag en bezoekers binnenkomen, de weg naar handelen | kan iemand de stap naar mij toe zetten? |
| **verbondenheid** | relatie en bewijs: reviews, cases, team, nazorg | verdien ik het vertrouwen dat ik vraag? |
| **waarde** | prijs, propositie, positionering | is mijn waarde net zo zichtbaar als mijn prijs? |

**Belangrijke nuance over "lens" in de engine (FACT).** Het `Lens`-tag op een observatie is niet
hetzelfde als de engine-vlag `cross_lens`. De engine berekent `cross_lens` op twee plekken
verschillend:

- `detectContradiction` en `detectTellingAbsence`: `cross_lens = aantal verschillende Lens-tags in
  de relatie > 1`. Alleen hier tellen de vier perspectief-tags mee.
- `detectMiscast`: `cross_lens = er is een externe echo (review/vacature)`, ongeacht perspectief-tags.
- `detectDrift` en `detectTellingAbsence`: één observatie, dus `cross_lens` altijd false.

Dit leidt tot een cruciale, contra-intuïtieve bevinding (sectie 4).

---

## 2. Antwoorden op de zeven vragen

### 2.1 Welke van de vier zijn geïmplementeerd versus alleen gemodelleerd?

**FACT.** Alleen `zichtbaarheid` wordt gevoed. In `src/engine/observations.ts` is `ZL` (zichtbaarheid)
de enige lens die aan afgeleide observaties wordt gehangen; alle etalage-, inhoud-, cluster- en
externe observaties krijgen `ZL`. Claims kunnen in principe een eigen lens dragen
(`ClaimEvidence.lens`), maar de live pijplijn zet die nooit: `toClaimEvidence` in
`src/live/pipeline.ts` geeft `lens` niet door, en `CandidateClaim` in `src/live/types.ts` heeft geen
lens-veld. Conclusie: **`zichtbaarheid` geïmplementeerd; `toestroom`, `verbondenheid`, `waarde`
alleen gemodelleerd.**

### 2.2 Welke evidence ontbreekt waardoor toestroom, verbondenheid en waarde nauwelijks spreken?

**FACT, uit `src/live/extract.ts`.** De deterministische extractor detecteert precies drie dingen:
een wachttijd-CONTRADICTION (zorgspecifiek: "geen wachtlijst" versus een concrete wachttijd), een
specialisme-claim ("specialist in X"), en een case-cluster (minstens vier cases op een
cases-pagina). Reviews en vacatures zijn in het deterministische pad **altijd leeg**
(`reviews: [], vacancies: []`); ze worden alleen gevuld als een LLM ze injecteert. Er is geen
detector voor prijs- of propositie-claims (waarde), geen voor CTA- of contactdrempels (toestroom),
en geen voor bewijs- of nazorgsignalen (verbondenheid). Daarom kunnen die drie perspectieven nu
vrijwel geen observatie vormen, laat staan een relatie.

### 2.3 Welke ontbrekende evidence kunnen we zero-integration betrouwbaar verkrijgen?

**INFERENCE, uit de reeds opgehaalde HTML (meestal nul extra netwerk):**

- **waarde**: prijs- en positioneringstermen uit title/H1/body ("premium", "hoogwaardig",
  "vaste prijzen", "vanaf", "op aanvraag"). Deterministisch parseerbaar.
- **toestroom**: aanwezigheid en aard van CTA's en contactpaden ("offerte aanvragen",
  "afspraak plannen", "prijzen op aanvraag"), afgeleid uit nav/links/body.
- **verbondenheid**: aanwezigheid of afwezigheid van bewijs (testimonials, cases, team, nazorg- en
  garantietaal) uit body en paginastructuur.
- **externe echo (Places, Level 1.5)**: publieke reviewquotes en rating. Eén lichte lookup, geen
  OAuth, geen consent (zie masterplan sectie 13). Dit is de enige die een klein beetje extra
  retrieval vraagt.

### 2.4 Welke nieuwe observations en relations worden daarmee mogelijk?

**FACT over de engine-mechaniek.** De frozen engine vormt relaties uit observaties zonder zelf
gewijzigd te worden. Met de nieuwe evidence worden mogelijk:

- **TELLING_ABSENCE** op een waarde- of proposities-claim zonder bewijs (undeniable familie, L3).
- **CONTRADICTION** tussen een waarde-belofte en een operationeel feit (bijv. "vaste transparante
  prijzen" versus "prijs op aanvraag"), cross-perspectief (waarde versus toestroom).
- **MISCAST** wanneer de inhoud een kracht draagt die niet in de etalage staat en een publieke
  review dat juist benoemt (cross-lens via externe echo).
- **DRIFT** wanneer een geadverteerde dienst blijkens de eigen tekst niet meer geleverd wordt.

### 2.5 Welke daarvan passeren de bestaande frozen Gate zonder de standaard te verlagen?

**FACT, empirisch getoetst (sectie 3).** Alle vier bovenstaande families kunnen de ongewijzigde Gate
passeren, mits de evidence het niveau haalt:

- TELLING_ABSENCE haalt L3 zolang de claim specifiek en niet-wallpaper is en geen bewijs bestaat.
- CONTRADICTION haalt L3 (undeniable) met een echte belofte-feit spanning.
- MISCAST haalt L3 alleen met een externe echo (review), anders blijft het L2 en wordt het
  onderdrukt (zoals bedoeld).
- DRIFT haalt L3 met een advertentie plus een expliciet "niet meer" in de eigen tekst.

**Contra-intuïtieve bevinding (INFERENCE, sectie 4).** Het louter activeren van de perspectief-tags
ontsluit vrijwel géén nieuwe reveal. De perspectief-tags beïnvloeden een Gate-uitkomst alleen via de
`cross_lens` van CONTRADICTION, en CONTRADICTION is toch al undeniable. De winst zit in **nieuwe
evidence en nieuwe detectoren**, niet in de labels. Precies de productregel: expand evidence.

### 2.6 Lost dit het AMA-NED probleem op?

**FACT, gemeten.** AMA-NED (`ama-ned.nl`) is een aantoonbaar goed gebouwde site; in
`technical-failclosed.test.ts` levert ze terecht een null-teaser (alleen drie low-severity
security-header gaten, geen substantieel bewijs). In onze evaluatie krijgt de AMA-NED regression-case
**SILENCE in zowel de huidige als de 1.1 pijplijn**. Dat is het juiste antwoord: rijkere evidence
mag geen reveal fabriceren voor een schone, bewezen onderneming. Het "probleem" wordt dus niet
opgelost door AMA-NED koste wat kost iets te laten zeggen, maar door bij ándere ondernemingen, die nu
onterecht in de stilte vallen omdat de evidence te smal is, wél een sterke reveal te vinden. Voor
AMA-NED zelf blijft SILENCE correct.

### 2.7 Wat is de kleinste uitbreiding van retrieval/evidence?

**RECOMMENDATION.** De kleinste zinvolle uitbreiding voegt **geen nieuwe crawl-diepte** toe. Ze bestaat
uit twee delen, beide op reeds opgehaalde HTML plus één lichte publieke lookup:

1. **Nieuwe deterministische extractoren over de bestaande HTML**: waarde-claims (prijs/positie),
   een gegeneraliseerde belofte-feit CONTRADICTION (breder dan alleen wachttijd), en een DRIFT-signaal
   ("niet meer"). Nul extra netwerk.
2. **Publieke review-echo (Places)**: één lichte lookup die MISCAST cross-lens ontsluit.

Geen dashboard, geen audit, geen scanner. First Five blijft één moment dat hooguit één sterke reveal
toont of zwijgt.

---

## 3. Evidence/relation matrix

Per perspectief: welke evidence, welke observatie, welke relatie, met welk niveau, herkomst,
reveal-potentieel, acquisitiekosten en privacyrisico. Reveals zijn HYPOTHETISCH van vorm.

| Perspectief | Evidence (zero-integration) | Observation (engine kind) | Mogelijke relatie | Confidence | Provenance | Reveal-potentieel | Acquisitiekost | Privacyrisico |
|-------------|------------------------------|----------------------------|--------------------|------------|------------|--------------------|-----------------|----------------|
| zichtbaarheid | title/H1/meta/nav (bestaand) | self_emphasis, proof_emphasis | MISCAST (intern) | L0 tot L2 | HTML citaat + URL | midden (bestaand) | nul | laag |
| zichtbaarheid | wachttijd belofte + feit (bestaand) | self_claim + operational_fact | CONTRADICTION | L3 | verbatim citaat | hoog (bestaand) | nul | laag |
| waarde | prijs/positie-termen ("premium", "vaste prijzen") | self_claim (waarde) | TELLING_ABSENCE | L3 | HTML citaat + URL | midden tot hoog | nul | laag |
| waarde x toestroom | "vaste prijzen" versus "prijs op aanvraag" | self_claim + operational_fact | CONTRADICTION (cross) | L3 | twee citaten + URLs | hoog | nul | laag |
| verbondenheid | afwezigheid van bewijs bij een claim | (absentie) | versterkt TELLING_ABSENCE | L3 | claim-citaat | midden | nul | laag |
| verbondenheid x extern | inhoud draagt kracht + publieke review benoemt het | proof_emphasis + external_signal | MISCAST (cross-lens) | L3 | citaat + review + URLs | hoog | één lichte lookup | laag (aggregaat, geen persoon) |
| zichtbaarheid (tijd) | "bieden wij niet meer aan" bij geadverteerde dienst | operational_fact (discontinued) | DRIFT | L3 | verbatim citaat | hoog | nul | laag |
| toestroom | CTA- of contactdrempel | operational_fact | voedt cross-relaties | L0 tot L1 | HTML | midden | nul | laag |

Acquisitiekost is voor bijna alles nul (extractie uit reeds opgehaalde HTML). Alleen de review-echo
kost één lichte publieke lookup. Privacyrisico blijft laag: aggregaten en thema's, nooit individuele
personen, nooit scrapen (masterplan sectie 27).

---

## 4. Empirische evaluatie: huidige First Five versus First Five 1.1

### 4.1 Methode (echte engine, ongewijzigde Gate)

Een reproduceerbare harness (`docs/research/first-five-1.1-eval/`) draait de **echte frozen engine**
en de **echte live quality gate** uit de First Five repo. Voor elke fixture:

- **CURRENT** = echte `DeterministicClaimExtractor` plus echte `qualityGateClaims/Cases` plus
  `runEngine`.
- **1.1** = dezelfde, plus additieve perspectief-getagde claims en publieke reviews, **elk door
  dezelfde echte quality gate** voordat ze de engine bereiken, plus `runEngine`.

De Gate is in beide identiek. Alleen de evidence-set verschilt. Twaalf fixtures, bewust meer
correct-SILENCE gevallen dan nieuwe-reveal gevallen, met AMA-NED als expliciete regression-case.

We meten niet het aantal findings, maar: extra reveal-worthy candidates, behoud van terechte SILENCE,
false-positive risico, non-trivialiteit, surprise, recognition-potentieel, WOW en time-to-first-value.

### 4.2 Resultaten (gemeten)

```
fixture           CUR       1.1       1.1 family       cross
----------------------------------------------------------------
ama-ned           SILENCE   SILENCE   -                -      (regression: correct)
fysio-direct      REVEAL    REVEAL    CONTRADICTION    -      (bestaand blijft werken)
premium-studio    SILENCE   REVEAL    TELLING_ABSENCE  -      (nieuw: waarde-claim onbewezen)
vastgoed-expert   REVEAL    REVEAL    TELLING_ABSENCE  -      (bestaand: specialisme)
daktuin-proof     SILENCE   SILENCE   -                -      (regression: bewijs onderdrukt)
bouwadvies-prijs  SILENCE   REVEAL    CONTRADICTION    yes    (nieuw: prijs cross-perspectief)
snel-vs-review    SILENCE   REVEAL    MISCAST          yes    (nieuw: review-echo, flagship)
wallpaper-co      SILENCE   SILENCE   -                -      (regression: wallpaper)
modest-clean      SILENCE   SILENCE   -                -      (regression: bescheiden, bewezen)
maatwerk-proof    SILENCE   SILENCE   -                -      (regression: waarde met bewijs)
puffery-co        SILENCE   SILENCE   -                -      (regression: inflatie afgewezen)
drift-training    SILENCE   REVEAL    DRIFT            -      (nieuw: verouderde belofte)
```

**Aggregaat (gemeten):**

- CURRENT reveals: **2/12**. First Five 1.1 reveals: **6/12**.
- **Vier nieuwe reveal-worthy candidates**, één per RelationFamily: TELLING_ABSENCE, CONTRADICTION
  (cross), MISCAST (cross), DRIFT.
- **6/6 terechte-SILENCE regressions blijven stil.** Nul SILENCE onterecht gebroken.
- **AMA-NED: SILENCE in beide.** De regression-garantie houdt: rijkere evidence fabriceert geen reveal.

**Geschatte kwaliteit van de nieuwe reveals (0 tot 3, HYPOTHESIS, echte herkenning vergt echte
gebruikers):** non-trivialiteit 2.75, surprise 2.50, recognition 2.75, WOW 2.50, false-positive
risico 1.25. **Time-to-first-value: ongewijzigd** (beide Level 1, zelfde publieke retrieval; nul
extra netwerk voor HTML-afgeleide evidence, één lichte lookup alleen bij reviews).

### 4.3 Interpretatie (evidence, geen elegantie)

1. **De huidige SILENCE is vaak "smalle evidence kan niets zien", niet "er is niets".** Vier van de
   twaalf sites floppen van SILENCE naar een sterke reveal, puur door rijkere evidence, door de
   ongewijzigde Gate. Dat is de kern van het antwoord op de opdracht.
2. **De Gate is niet versoepeld en blijft beschermen.** Zes van zes regressions, inclusief AMA-NED en
   het inflatie-geval (`puffery-co`, door de bestaande quality gate afgewezen), blijven correct stil.
3. **Niet alle nieuwe reveals zijn gelijk.** De twee cross-perspectief reveals (prijs-CONTRADICTION en
   review-MISCAST) zijn het sterkst en het laagst in false-positive risico. De enkel-oppervlak
   waarde-absentie (`premium-studio`) heeft een hoger false-positive risico, want het bewijs kan
   offline bestaan. Dit stuurt de minimale scope (sectie 7).
4. **De flagship reveal is een Reputatie-reveal binnen First Five.** `snel-vs-review` (etalage verkoopt
   snelheid, publieke review roemt begeleiding) is inhoudelijk exact een Reputatie/Marktpositie
   inzicht, geleverd binnen First Five met minimale machinerie: alleen de review als `external_signal`
   voeden. Dit heeft directe gevolgen voor de vergelijking met Lens 2 (sectie 6).

---

## 5. First Five 1.1 propositie

```
huidige First Five
  → rijkere evidence (waarde, toestroom, verbondenheid + publieke review-echo)
  → meerdere interne perspectieven op dezelfde onderneming
  → cross-perspectief relaties (belofte versus prijsgedrag, etalage versus buitenwereld)
  → dezelfde strenge, ongewijzigde Gate
  → maximaal één of enkele uitzonderlijk sterke reveals
  → SILENCE wanneer niets die lat haalt (AMA-NED blijft SILENCE)
```

First Five 1.1 is geen nieuwe functionaliteit bovenop First Five. Het is dezelfde ervaring die
scherper kijkt: meer evidence-families, dezelfde selectiviteit, dezelfde grounding, dezelfde stilte.

---

## 6. UX: interne perspectieven, geen vier zichtbare lenzen

**RECOMMENDATION, verankerd in de bestaande UX-observatie (FACT, First Five docs).** De gebruiker
hoeft geen vier lenzen te zien. De vier perspectieven zijn **interne manieren van kijken** waarmee
Maculis één veel sterkere reveal vindt. Redenen:

- De acceptatietest wees al uit dat het SILENCE-scherm te veel tegelijk stapelt en verschuift van
  "Maculis laat mij iets zien" naar "ik lees een rapport". Vier zichtbare lenzen zou dat verergeren.
- De engine toont sowieso hooguit één reveal (DeterministicSelector). De perspectieven zijn de
  manier waaróp die ene reveal gevonden wordt, niet vier dingen om te tonen.
- Progressive disclosure (masterplan sectie 23): eerst de ene reveal, dan op verzoek het bewijs, dan
  eventueel een tweede perspectief. Nooit vier tabbladen.

Concreet: de perspectieven leven in de evidence-extractie en de relatie-vorming, onzichtbaar voor de
gebruiker. De gebruiker ziet één gegronde onthulling, of een rustige stilte met de bestaande
"eerste impressie" en "verhaal van de site" beats. Geen vierluik-UI.

---

## 7. Vergelijking: First Five verdiepen versus Lens 2 bouwen

Vraag: wat levert meer productwaarde per ontwikkelweek?

### 7.1 Wat elk kost en oplevert (INFERENCE, onderbouwd)

| As | Minimale First Five verdieping | Lens 2 (Reputatie, standalone) |
|----|--------------------------------|--------------------------------|
| Nieuwe engine nodig | nee, frozen engine hergebruikt | nee, frozen engine hergebruikt |
| Nieuwe evidence-extractoren | ja, klein (waarde-claim, gegeneraliseerde contradiction, review-echo) | ja, groter (tweede-oppervlak acquisitie + framing) |
| Nieuwe UX | nee, past in bestaande beats | ja, dedicated lens-presentatie |
| Nieuwe retrieval | nul plus één lichte review-lookup | reviews plus optioneel GBP-eigenaar (Level 3, goedkeuringspoort) |
| Raakt de lopende pilot | ja, verbetert First Five nu | nee, aparte pilot |
| Gemeten nieuwe reveals (deze studie) | 4/12, incl. de review-MISCAST | overlapt met de review-MISCAST die 1.1 al levert |
| Time-to-first-value | ongewijzigd | nieuw pad opzetten |
| Geschat bouwwerk | dagen | weken |

### 7.2 De doorslaggevende observatie

**De grootste, laagst-risico winst van Lens 2 (de belofte-versus-buitenwereld reveal via publieke
reviews) wordt door First Five 1.1 al geleverd** met minimale machinerie (één review-echo die de
frozen engine al tot MISCAST cross-lens verwerkt, gemeten in `snel-vs-review`). Lens 2 als
zelfstandig product voegt daarbovenop vooral de volledige review-corpus (GBP-eigenaar, achter een
goedkeuringspoort) en een dedicated framing toe. Dat is reële extra waarde, maar het is duurder en
het dupliceert de kern die First Five 1.1 bijna gratis oppikt.

Per ontwikkelweek levert de minimale First Five verdieping dus meer: ze verbetert het product dat nu
al in pilot is, hergebruikt de frozen engine volledig, kost dagen in plaats van weken, en oogst de
review-echo waarde die anders in Lens 2 zou zitten.

---

## 8. Aanbeveling

### C. Minimale First Five verdieping eerst, daarna Lens 2.

**Onderbouwd met evidence, niet met architecturale elegantie:**

1. **Gemeten waarde nu.** Vier nieuwe sterke reveals op twaalf fixtures, door de ongewijzigde Gate,
   met behoud van alle terechte SILENCE en de AMA-NED regressie. Dat is directe productwinst in de
   lopende pilot.
2. **Laagste kost per waarde.** De hoogst-kwalitatieve, laagst-risico nieuwe reveals (prijs-CONTRADICTION,
   review-MISCAST) komen uit een kleine, additieve evidence-uitbreiding die de frozen engine volledig
   hergebruikt. Dagen werk.
3. **De-risket Lens 2.** De review-echo bewijst binnen First Five de tweede-oppervlak waarde die Lens 2
   groot zou maken. Als dat in de pilot herkend wordt, is Lens 2 daarna een gefundeerde volgende stap;
   zo niet, dan hebben we geen weken in een standalone lens gestoken.
4. **Respecteert de productregel.** Alle winst komt uit evidence-uitbreiding, nul Gate-versoepeling.

**Waarom niet A (volledige First Five 1.1 eerst).** A is een sterke tweede keuze, maar de brede
waarde-absentie familie (`premium-studio`) draagt een hoger false-positive risico (bewijs kan offline
bestaan). Die breed uitrollen vóór pilot-signaal zou onnodig risico nemen. Neem dat deel pas na
pilot-herkenning mee.

**Waarom niet B (Lens 2 eerst).** B bouwt weken aan een standalone surface terwijl First Five 1.1 de
kern-waarde ervan bijna gratis oppikt en tegelijk het lopende product verbetert. Dat is de duurdere
volgorde.

### 8.1 Minimale implementatiescope (wat we voorstellen te bouwen, nog niet gebouwd)

Klein, additief, achter een expliciete evaluatie, zonder de frozen engine of Gate te raken:

1. **Waarde-claim extractor**: detecteer specifieke, niet-wallpaper prijs- en positioneringsclaims,
   tag ze `waarde`, voer ze als `self_claim` (engine maakt er TELLING_ABSENCE van als bewijs
   ontbreekt).
2. **Gegeneraliseerde belofte-feit CONTRADICTION extractor**: breder dan alleen wachttijd (bijv.
   prijs-transparantie versus "op aanvraag"), met de bestaande `contradicted_by` flag.
3. **Publieke review-echo (Places)**: voer publieke reviewquotes als `external_signal`, waardoor de
   engine MISCAST cross-lens kan vormen.
4. **DRIFT-signaal**: detecteer "bieden wij niet meer aan" bij een geadverteerde dienst.
5. **Lens-veld doorvoeren**: `CandidateClaim.lens` en `toClaimEvidence` de perspectief-tag laten
   dragen (nodig voor cross-perspectief CONTRADICTION).

Elk item passeert de bestaande live quality gate. UX ongewijzigd: interne perspectieven, geen
vierluik. Eerst evalueren op echte First Five testdata (respecteert masterplan §E: verbreed de
productie-selector niet zonder pilot-aanleiding).

**Bewust NIET nu:** brede waarde-absentie uitrol (false-positive risico), GBP-eigenaar koppeling
(goedkeuringspoort), en Lens 2 als standalone surface (na pilot-signaal).

---

## 9. Gecorrigeerde HUMAN ACTIONS

Correctie op masterplan sectie 40, na controle van de actuele projectstatus. Ik neem geen
opgeloste blockers opnieuw op.

**Niet langer een open actie (aantoonbaar productie-actief):**

- **Communication Layer en e-mailketen.** Volgens de eigenaar inmiddels productie-actief. Deze mag
  niet meer als open actie gepresenteerd worden. Gevolg: Relationship Intelligence (masterplan sectie
  19) kan op live productiedata bouwen. (Directe runtime-herverificatie was niet mogelijk: egress naar
  de productiehost is in deze omgeving geblokkeerd; de statuscorrectie steunt op de bevestiging van de
  eigenaar plus het feit dat de comm-secrets `sync:false` in het Render-dashboard staan, dus activatie
  buiten de repo gebeurt.)
- **consent_version.** In de journey-repo is `maculis-contact-v1` ingevoerd (BUILD_LOG 2026-08-14).
  Behandel als vastgesteld, niet als open, tenzij het team een nieuwe versie wil.

**Nog wel open (echte menselijke poorten):**

- **Places API-key en billing** (betaalde calls) voor de review-echo. Financiële verplichting.
- **Per-connector approvals** (Exact App Center, GBP allowlist, Google Ads, Meta, PSD2-aggregator),
  pas relevant vanaf Level 3.
- **Pricing- en packaging-beslissing.**
- **Goedkeuring van de progressive-disclosure UX-ronde** op het SILENCE-scherm.
- **Beslissing om de productie-selector te verbreden**, op basis van echte First Five pilot-data.

---

## 10. Reproduceerbaarheid

De volledige harness staat in `docs/research/first-five-1.1-eval/` (`lib.ts`, `eval.ts`, `results.txt`,
`README.md`). Ze draait de echte frozen engine en de echte live quality gate uit
`ftrprf-labs/maculis-first-five.` en is één commando (`tsx eval.ts`) opnieuw uit te voeren. De
AMA-NED fixture is een getrouwe reconstructie van de gedocumenteerde echte case; de productiesite kon
niet worden opgehaald (egress geblokkeerd), dus dit is een representatieve fixture, geen live crawl.

---

*Einde deep dive. RESEARCH ONLY. Geen productiecode gewijzigd, geen PR geopend. De aanbeveling (C:
minimale First Five verdieping eerst, daarna Lens 2) wacht op jouw besluit voordat er iets gebouwd
wordt.*
