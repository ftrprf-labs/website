# Pilotrapport · Cockpit / Relatie-workspace

> **Uitgevoerd binnen de vastgestelde scope. Niet gemerged, niet gedeployed.**
> Oppervlak: `public/workspace.html`. Controlegroep: `public/comm.html`, onaangeraakt.
> Canon: `ftrlabs-docs` @ `139ea06`, tokens 1.0.0, checksum `04d6b40907f2bbda`.

Uitgevoerd: 2026-08-18

---

## 1. Before en after

Baseline vastgelegd vóór elke visuele wijziging: **48 renders**, 4 viewports (390, 768, 1280, 1920)
× 6 schermen × normaal en `reduce`, met bevroren animaties, vaste locale en tijdzone, en
deterministische fixtures zonder database of PII.

Vergelijking na de pilot:

| | Resultaat |
|---|---|
| `comm.html`, controlegroep, 8 renders | **byte-identiek, alle acht** |
| `workspace.html`, 40 renders | gewijzigd, 29% tot 89% van de pixels |
| Beeldformaat gewijzigd | **nergens** |
| Horizontale overflow | **nul**, alle viewports, voor en na |
| Console errors | **nul**, voor en na |
| `reduce` tegenover normaal | **identiek** per scherm, in beide runs |
| `npm test` | **64 tests, 0 fail**, 9 overgeslagen (vereisen live Postgres) |
| Checksumpoort | groen |

Grote diffpercentages zijn hier verwacht en betekenisloos als kwaliteitsmaat: elk paneel, elke
hairline en elke tekstkleur is vervangen, dus vrijwel elke pixel verschilt. De informatieve
uitkomst is de **nul** op de controlegroep, op formaat, op overflow en op console.

Beelden: `tools/visual/compare-*.png`.

---

## 2. Wat aantoonbaar beter is geworden

**Twee toegankelijkheidsfouten opgelost, met gemeten contrast:**

| Rol | Voor | Na | Oordeel |
|---|---|---|---|
| `text.quiet` (alle `.aihint`, metaregels) | `#6b7280` op `#14161b` = **3,74:1** | `#8b8377` op `#14120f` = **5,00:1** | zakte onder AA voor kleine tekst, haalt hem nu |
| consent "toegestaan" | `#4f8a5b` = **4,41:1** | `#1f9470` = **4,92:1** | zakte onder AA, haalt hem nu |
| consent "niet toegestaan" | `#c98a4a` = 6,22:1 | `#a89a86` = 6,79:1 | beide AA, licht verbeterd |
| `text.secondary` | `#9aa0ac` = 6,89:1 | `#a89a86` = 6,79:1 | beide ruim AA |

De eerste twee waren echte defecten, niet stijlverschillen. Ze zaten in de meest voorkomende
tekstrol van het scherm.

**Focustoestand bestaat nu.** Dit bestand had er nul. Elk focusbaar element heeft een zichtbare
koperen ring.

**Reduced motion bestaat nu.** Ook nul voorheen. De enige transitie op dit scherm vervalt onder
`reduce`, en de eindtoestand is direct zichtbaar, conform canon 8.5.

**Zeven vervallen kleuren uit canon 3.5 weg**: `#9aa0ac`, `#6b7280`, `#e8cf97`, `#4f8a5b`,
`#c98a4a`, `#2a2e39`, `#343a47`. Harde hexwaarden in dit bestand: van 33 naar 12, en van die 12 zijn
er 3 alleen nog commentaar dat documenteert wát er is vervangen.

**Geen eigen palet meer.** De `:root` is een aliaslaag: elke waarde wijst naar `maculis-tokens.css`.
Canon 13 verbiedt een eigen `:root` met eigen kleuren per scherm.

**Newsreader draait, met gemeten impact.** `.org` resolveert naar Newsreader op gewicht 300.
Layoutgevolg gemeten in de scrollcontainers, niet uit beeldhoogte afgeleid, want dit oppervlak is
viewport-vast:

```
overzicht   752/752 -> 752/752   +0px
inzichten   752/752 -> 752/752   +0px
activiteit  752/752 -> 752/752   +0px
rail        752/752 -> 752/752   +0px
.org hoogte     25px -> 26px     +1px
```

Geen enkele container overschrijdt zijn client-hoogte, nergens clipping.

**Merkanker terug.** Het wordmerk was sans; het is nu serif, zoals in elke andere kamer.

---

## 3. Wat onverwacht slechter werd of spanning met de canon gaf

**A. De koude statusbadges vallen nu hard op.** `#2b3a4a`, `#3a2430`, `#20262f` stonden eerst tussen
koude panelen en vielen niet op. In een warme kamer zijn het nu de enige koude vlakken op het scherm.
Dit is het C-2-blok zichtbaar geworden. Het is geen regressie in absolute zin, maar het scherm is op
dit punt **minder samenhangend dan voor de pilot**. Dat is een reëel argument om C-2 vóór de rest
van de Cockpit op te lossen.

**B. De hiërarchie in de linkerrail is omgekeerd.** `.org` staat nu op serif gewicht 300, conform
canon 4.2 (Uitspraak). De contactnaam eronder staat op sans 600. Gevolg: de persoon domineert
optisch de organisatie, terwijl de organisatie de kop van de kamer is. Canon 4.2 en canon 4.3 zijn
hier allebei gevolgd en het resultaat is toch zwakker. **Dit is spanning binnen de canon, geen
implementatiefout**, en hij zal in elke dichte kamer terugkomen.

**C. Het onderscheid tussen inkomend en uitgaand is subtieler geworden.** Voorheen droeg temperatuur
het verschil (`--in` koud blauw tegen `--out` warm). Nu dragen twee tonale stappen het, `ink.800`
tegen `ink.600`, wat canon 12 juist voorschrijft. Uitlijning en de metaregel dragen de richting nog
steeds, dus de betekenis blijft overeind, maar de eerste oogopslag is minder scherp. Beslissing O-5
werkt hier zoals bedoeld; het is de moeite waard dat je hem in gebruik beoordeelt.

**D. Canon-deltas die dit bestand niet kan oplossen.** Zichtbaar geworden door de pilot, maar de
tekst komt uit `workspace.js`, dat buiten scope viel:

* **Engelse hoofdletterbadges**, canon 10 verbiedt ze expliciet: `DRAFT`, `SENT`, `OPENED`,
  `COMPLETED` in de Journey-tijdlijn, en `EMAIL` en `WHATSAPP` als kanaallabels.
* **Zes gedachtestreepjes in zichtbare copy**, canon 13 en `CLAUDE.md` verbieden ze als stijlmiddel:
  `workspace.js` regels 107, 120, 138 en 203. Elders in de codebasis: `comm.js` 2 en `app.js` 32,
  waarvan een deel commentaar is.

**E. Eén canonregel blijft bewust overtreden.** Canon 6 staat maximaal drie tonale niveaus toe. Dit
scherm heeft er vier: grond plus `panel`, `panel2`, `panel3`. Alle vier zijn nu canonieke
ink-stappen, maar het zijn er één te veel. Opheffen hoort bij de grondconversie, dus bij C-1.

---

## 4. Aannames bevestigd of verworpen

| Aanname uit de gate | Uitkomst |
|---|---|
| De controlegroep blijft onaangeraakt | **Bevestigd.** Acht van acht byte-identiek. Geen enkele bleed. |
| Newsreader zelf hosten werkt en de assets uit de North Star volstaan | **Bevestigd.** Twee woff2, 129 en 143 KB, geen externe request. |
| Newsreader kan een dichte layout laten verspringen | **Verworpen voor dit oppervlak.** +1px op het grootste serif-element, nul containeroverloop. Maar dit scherm is viewport-vast met interne scroll, dus dit bewijst niets voor de Website of de Lens, die wél meegroeien. |
| Beeldformaat is een goede test voor layoutverschuiving | **Verworpen.** `body{height:100vh;overflow:hidden}` maakt de beeldhoogte constant. De harness moet scrollhoogtes meten, niet beeldhoogtes. **De harness is hierop aangepast.** |
| De badge-taal is in `workspace.html` op te lossen | **Verworpen.** Het weghalen van `text-transform:uppercase` hielp alleen waar de bron al kleine letters was: `VERLOPEN` werd `verlopen`, `AFSPRAAK` werd `afspraak`. `EMAIL` en `WHATSAPP` blijven, want die staan in hoofdletters in de data. De echte oplossing zit in `workspace.js`. **Mijn scopedefinitie was hier te optimistisch.** |
| C-1 blokkeert alleen de grond | **Bevestigd**, en het vierde tonale niveau blijkt eraan vast te zitten. |
| C-2 blokkeert alleen de badgekleuren | **Bevestigd**, maar zwaarder dan gedacht: zie punt A. |
| Een neutrale placeholder voor `--warn` beweert niets | **Bevestigd.** "niet toegestaan" leest nu feitelijk in plaats van waarschuwend, en dat past bij een consent-toestand. |

---

## 5. Resterende blockers

**C-1, werklicht.** Blokkeert: de grond van dit scherm en van heel Testerbeheer, plus het opheffen
van het vierde tonale niveau. Het scherm draagt nu `data-maculis-regime="night"` op instructie van
de kop van het tokenbestand zelf. Dat is geen verzonnen waarde, maar het is provisorisch: C-1
verandert precies één attribuutwaarde plus de grondtokens.

**C-2, `border.semantic`.** Blokkeert: de zes statusbadges. Zichtbaar urgenter geworden, zie punt A.

Niet-blokkerend gebleken en bevestigd: C-3 (geen diffuse schaduw op dit scherm), C-4 (geen gloed),
C-5 (geen modal), C-6 (geen signal language), C-7 en C-8 (raken e-mail en de regimeovergang).

---

## 6. Oordeel

**GO voor verdere harmonisatie**, met twee aanpassingen aan de volgorde.

De pilot heeft gedaan waarvoor hij bedoeld was. De keten van canon naar gevendorde tokens naar een
gerenderd scherm werkt, de controlegroep bewijst dat er niets lekt, de harness levert een harde poort,
en twee echte toegankelijkheidsfouten zijn en passant opgelost en gemeten.

Twee dingen wil ik anders dan in de gate staat:

1. **C-2 vóór de rest van de Cockpit, niet erna.** Punt A laat zien dat een half geharmoniseerde
   kamer op dit punt minder samenhangend is dan een niet-geharmoniseerde. Dat is een reden om de
   badges niet lang half te laten staan.
2. **Punt B, de omgekeerde hiërarchie, terug naar de canon.** Serif gewicht 300 werkt in een
   cinematische kamer en verzwakt een dichte. Dat is geen productkeuze en hoort niet lokaal opgelost;
   het is precies het soort vondst dat canon 17 punt 5 bedoelt.

Geen enkele bevinding is een reden voor ADJUST of STOP op het geheel. De blokkades zijn benoemd en
klein, en geen ervan raakt de fundering.

---

**Niet gemerged, niet gedeployed.** De wijziging staat op de werkbranch en is met één commit terug
te draaien.
