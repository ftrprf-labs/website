# First Five 1.1 — Route A: zoektocht naar bestaande echte analyse-data (read-only)

> Voordat we naar de handmatige real-site ronde gaan, eerst de vraag: bestaat de echte First Five
> input/output al ergens in data, logs, database of opgeslagen analyses? Dit stuk rapporteert de
> read-only zoektocht, wat er wel en niet in zit, en de conclusie.
>
> **Datumcontext:** 2026-08-16. **Status:** RESEARCH, read-only. Niets in productie gewijzigd, niets
> naar productie geschreven. Geen Gate-wijziging, geen fixturebouw, geen implementatie, geen PR.
> Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## 1. Onderzochte bronnen, wat erin zit, wat ontbreekt

### Bron 1: de First Five analyse-code zelf (`maculis-first-five.` repo, read-only)

- **Wat erin zit (FACT).** `GET /api/analyse?url=` roept `analyseWebsite` aan en geeft
  `{ result, trace }` terug aan de browser. Het **persisteert de analyse niet**. Het schrijft alleen
  één PII-veilige diagnostische logregel: `ANALYSE {host, outcome, technical_*}` (server/index.ts,
  regel 119). De volledige trace (evidence, observations, relations, gate, reveal, first_impression,
  technical) gaat naar de browser en wordt daarna niet bewaard.
- **Wel gepersisteerd, maar alleen bij `MACULIS_DATA_DIR` + capture-consent:** append-only bestanden
  op de Render-disk: `first-five.jsonl` (sessie-events), `interest.jsonl`, `evaluation.jsonl`,
  `participants.json`.
- **Wat de sessie-events maximaal bevatten (FACT, public/index.html):**
  `reveal_presented {family, novelty_engine, line (wording), evidence_count}`,
  `silence_presented {suppressed_reason, observations count, shown:[{note, lens}]}`,
  `technical_teaser_shown {domains, total, proof_domain}`.
- **Wat ontbreekt:** de **opgehaalde paginacontent** (RawPage: title/H1/H2/body per pagina) en de
  **volledige evidence-set**. Nergens gepersisteerd, niet in logs, niet in sessie-events.

### Bron 2: productie-logs (Render, First Five service, read-only via MCP)

- **Onderzocht.** Service `maculis-first-five.` (`srv-d9ths3bm8hqs73d6gog0`), logs gefilterd op
  `ANALYSE`, laatste 30 dagen (de retentiegrens).
- **Wat erin zit (FACT, echte productie-analyses in het venster):**
  - `oca.nl` → SILENCE, technisch: security:3, performance:2, seo:1, accessibility:1 (proof: accessibility).
  - `ama-ned.nl` → SILENCE, technisch: geen teaser (total 0). (tweemaal)
  - `strategie.nl` → SILENCE, technisch: geen teaser.
  - Overige regels zijn boot-regels, geen analyses.
- **Observatie:** zeer laag volume in het venster, en het lijkt probe/testverkeer, geen brede pilot.
  Alle uitkomsten SILENCE.
- **Wat ontbreekt:** de logregel bevat per ontwerp alleen host + outcome + technisch aggregaat. Geen
  evidence, geen paginacontent, geen reveal-wording, geen provenance.

### Bron 3: productie-disk `/var/data` (Render disk `first-five.jsonl` etc.)

- **Status.** Bevat de sessie-capture (zie Bron 1 voor het schema). Niet leesbaar via een read-only
  MCP-bestandstool; alleen via SSH naar de productie-instance, wat ik bewust niet doe (buiten de
  read-only opdracht, en niet nodig). Ook als het gelezen werd, bevat het per code geen paginacontent.
- **Wat ontbreekt:** idem, de opgehaalde paginacontent en volledige evidence.

### Bron 4: de repo zelf (gecommitte echte uitkomsten, read-only)

- **Wat erin zit (FACT, echte gedocumenteerde uitkomsten):**
  - `DEMO_OUTCOMES` (public/index.html): één echte REVEAL met volledige evidence en provenance,
    plus vier echte SILENCE en twee ACCESS_FAILED:
    - `psycholoognederland.org` → REVEAL, CONTRADICTION: belofte "Geen wachtlijst" versus eigen tekst
      "Wachttijd tot intake: 4 tot 8 weken", met bron-URLs (homepage en vestigingspagina Utrecht).
    - `topzorggroep.nl`, `restaurantdekas.nl`, `cepezed.nl`, `buurtzorg.com` → SILENCE.
    - `kwieker.nl` → ACCESS_FAILED (503), `bestaat-echt-niet-12345.nl` → DNS_NOT_FOUND.
  - `TECHPROBE` (technical-failclosed.test.ts): echte technische signalen voor `ama-ned.nl` (null
    teaser), `hema.nl` (SEO, geen H1), `oca.nl` (toegankelijkheid, lage alt-dekking).
- **Wat ontbreekt:** de opgehaalde paginacontent achter deze uitkomsten. Voor de REVEAL zijn twee
  evidence-citaten bewaard, maar niet de volledige pagina's die de nieuwe extractoren nodig hebben.

## 2. Wat de echte data die er WEL is al aantoont

Ook al is het niet genoeg voor een CURRENT versus 1.1 reconstructie, de echte data bevestigt twee
dingen op echte sites:

- **CURRENT-selectiviteit werkt op echte sites.** Aantoonbaar sterke of grote organisaties krijgen
  terecht SILENCE: `ama-ned.nl` (goed gebouwd, productie: SILENCE + null teaser), `cepezed.nl`
  (gerenommeerd architectenbureau, SILENCE), `buurtzorg.com` (grote zorgorganisatie, SILENCE),
  `restaurantdekas.nl`, `topzorggroep.nl`, `oca.nl` en `strategie.nl` (productie: SILENCE). Dit zijn
  echte false-positive controls die correct stil blijven.
- **De CONTRADICTION-familie levert op een echte site een echte reveal.** `psycholoognederland.org`:
  "Geen wachtlijst" versus "Wachttijd tot intake: 4 tot 8 weken". Dit is precies de familie die de
  IN-kandidaat *generalized promise-vs-fact* verbreedt, en het voelt als Maculis die iets ziet (de
  site spreekt zichzelf tegen), niet als een auditbevinding.
- **De gelaagde ervaring klopt in productie.** `oca.nl` kreeg geen reveal maar wél een technische
  teaser (toegankelijkheid); `ama-ned.nl` kreeg geen reveal en terecht geen teaser. Reveal en
  technische thermometer zijn in productie aantoonbaar gescheiden lagen.

## 3. Conclusie over Route A

**Route A kan de beslissende CURRENT versus 1.1 evaluatie niet dragen.** De reden is precies aan te
wijzen: de vier IN-kandidaten (promise-vs-fact, DRIFT, review-echo, lens-provenance) leiden nieuwe
evidence af uit de **opgehaalde paginacontent**, en die content wordt **nergens** bewaard: niet in de
logs (alleen host + outcome + technisch aggregaat), niet in de sessie-capture (alleen reveal-familie
en wording, silence-notities, technisch aggregaat), niet op de disk, niet in de repo. Zonder de
paginacontent kan de "nieuwe evidence → candidate relation → Gate → nieuwe uitkomst" helft van de
trace niet worden gereconstrueerd.

Wat de echte data wél geeft is validatie van CURRENT (echte SILENCE-controls die correct stil
blijven, en één echte CONTRADICTION-reveal), maar niet de 1.1-vergelijking.

**Daarom gaan we naar Route C:** een real-site ronde met een vooraf vastgelegd selectieprotocol,
zodat we de dataset niet achteraf kiezen. Onderstaand protocol gebruikt de echte sites die First Five
al heeft geanalyseerd als ruggengraat, aangevuld met een objectieve spreiding.

## 4. Route C: vooraf vastgelegd selectieprotocol en commando

### 4.1 Vaste caseset (vooraf vastgelegd, niet achteraf te kiezen)

De set is verankerd aan sites die First Five aantoonbaar al heeft gezien (DEMO_OUTCOMES, TECHPROBE,
productie-logs), aangevuld zodat elke vereiste categorie gedekt is. Leg deze lijst vast vóór de run.

| # | Site | Categorie (vooraf) | Waarom in de set |
|---|------|--------------------|------------------|
| 1 | psycholoognederland.org | bestaande REVEAL (CONTRADICTION) | echte reveal; blijft die staan en wordt hij niet verslechterd? |
| 2 | topzorggroep.nl | bestaande SILENCE (zorg) | blijft correct SILENCE? |
| 3 | cepezed.nl | sterke site / false-positive control (architectuur) | mag geen reveal krijgen |
| 4 | buurtzorg.com | sterke site / false-positive control (grote zorg) | mag geen reveal krijgen |
| 5 | ama-ned.nl | sterke site / false-positive control (industrie) | echt goed gebouwd; SILENCE + null teaser |
| 6 | restaurantdekas.nl | bestaande SILENCE (horeca) | ander organisatietype |
| 7 | oca.nl | technisch signaal, geen reveal (toegankelijkheid) | thermometer wel, reveal niet |
| 8 | hema.nl | technisch signaal, geen reveal (SEO, retail) | thermometer wel, reveal niet |
| 9 | strategie.nl | bestaande SILENCE (advies) | ander organisatietype |
| 10 | <5 tot 10 echte pilot-URL's naar keuze van de eigenaar> | mogelijk-nieuw signaal, gemengde sectoren | waar een extension iets kán toevoegen; blind gekozen |

Regel tegen cherry-picking: rij 1 tot 9 staan vast. De extra pilot-URL's (rij 10) worden gekozen op
een objectieve grond (bijv. de eerstvolgende N echte uitgenodigde testers uit Testerbeheer, of een
sectorspreiding), **niet** op basis van verwachte uitkomst. Leg de exacte lijst vast voordat je draait.

### 4.2 Wat we per case beoordelen (vooraf vastgelegd)

Compacte trace per case (de runner print dit):

```
CURRENT evidence → CURRENT uitkomst
+ nieuwe evidence → candidate relation → bestaande Gate → nieuwe uitkomst
Apart: Duiding | Reveal | Technische thermometer
```

En per nieuwe reveal, vanuit de ondernemer (handmatig scoren, niet alleen technisch):

1. **Is het waar?**
2. **Is het verrassend, of zag ik dit zelf al?**
3. **Is het betekenisvol voor mijn bedrijf of relatie?**
4. **Zou ik hierdoor anders kijken of handelen?**
5. **Voelt dit als Maculis die iets ziet, of als een audittool die iets vindt?** (essentieel)

Aggregaat dat we rapporteren: welke nieuwe reveal echt waardevol is versus auditachtig; of bestaande
sterke reveals veranderen of verslechteren; hoeveel correcte SILENCE-cases correct SILENCE blijven;
en wat de gebruiker in elke SILENCE-case wél krijgt via Duiding en technische thermometer.

### 4.3 Exact commando

De runner staat klaar (`docs/research/first-five-1.1-eval/run-real-cases.ts`), value-absence is uit,
de vier IN-kandidaten staan aan. Draai op een machine met internettoegang:

```
git clone --depth 1 https://github.com/ftrprf-labs/maculis-first-five. /tmp/ff && cd /tmp/ff && npm install
# kopieer de eval-map ernaast of verwijs met een absoluut pad:
node_modules/.bin/tsx <pad>/run-real-cases.ts \
  https://psycholoognederland.org https://topzorggroep.nl https://cepezed.nl \
  https://buurtzorg.com https://www.ama-ned.nl https://restaurantdekas.nl \
  https://oca.nl https://www.hema.nl https://strategie.nl \
  <extra echte pilot-URL's>
```

Optioneel: vul in de runner één publieke review-quote per host in (`REVIEWS`), zodat de review-echo
(één sterk outside-in signaal) meegenomen wordt. Houd het bewust bij één signaal per host; de
volledige review/reputatie-intelligentie blijft Lens 2.

Lever de output terug. Dan rapporteer ik per case de compacte trace en de ondernemersbeoordeling, en
bevestigen of herzien we de vier IN-kandidaten. Pas daarna beslissen we over implementatie.

## 5. Wat ik NIET heb gedaan

Niets in productie gewijzigd, niets naar productie geschreven (alleen logs en servicelijst read-only
gelezen), geen SSH naar de productie-instance, geen Gate-wijziging, geen nieuwe synthetische fixtures,
geen implementatie, geen PR. De definitieve First Five 1.1 scope is bewust nog niet vastgezet: de vier
IN-items blijven kandidaten met goede technische onderbouwing tot de real-case ronde is gedaan.
