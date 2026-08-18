# Voorstel C-1 · Werklicht machineleesbaar

> **Voorstel. Niets geïmplementeerd, niets gemerged, niets gedeployed.**
> Laatste blokkerende canonvraag voor de Cockpit. Hoort via hoofdstuk 17 in `ftrlabs-docs`.

Opgesteld: 2026-08-18 · Canon @ `139ea06` plus amendement C-2 (`claude/canon-c2-border-semantic`)

---

## Huidige canon

Hoofdstuk 5 legt drie regimes vast. De rij voor werklicht:

| Regime | Grond | Waar het licht vandaan komt | Diepte uit | Kamer |
|---|---|---|---|---|
| **Werklicht** | `ink.980` naar `ink.950` | de inhoud straalt, streng gerantsoeneerd tot één plek | tonale stapeling | Cockpit |

Hoofdstuk 14 herhaalt de grond identiek. Hoofdstuk 6 staat maximaal drie tonale niveaus toe:
ground, raised, elevated.

## Waargenomen probleem

Het tokenbestand kent alleen `night` en `day`, en de kop wijst de Cockpit `night` toe met een egale
`#0a0b10`. Werklicht bestaat dus niet machineleesbaar, en `ink.980` naar `ink.950` is op minstens
drie manieren te lezen: als verloop, als band, of als één stap dieper dan nacht.

Zolang dat open staat, kan de Cockpit-grond niet worden gezet zonder een waarde te verzinnen, en dat
verbiedt hoofdstuk 17.

## Het ijkpunt beslist het

De canon wijst `maculis-visual-north-star.html` aan als **de definitieve visuele referentie**, vast
op Newsreader en zonder schakelaars. Die referentie rendert de vier kamers expliciet:

| Kamer | Klasse in de North Star | Grond |
|---|---|---|
| Website | `frame-night` | `--ground-cool` = `ink.980` `#0a0b10` |
| Lens | `frame-night` | `--ground-cool` = `ink.980` `#0a0b10` |
| Mijn Maculis | `frame-day` | `--parchment` = `ink.50` `#f7f1e6` |
| **Cockpit** | **`frame-warm`** | **`--ground-warm` = `ink.950` `#080503`** |

De Cockpit staat in het ijkpunt op **ink.950**. Er valt dus niets te kiezen: `ink.980` naar
`ink.950` beschrijft de **stap** die de grond zet ten opzichte van het nachtregime, en het eindpunt
van die stap is de grond van de Cockpit. Geen verloop, geen band.

**En dat klopt met de kolom "Diepte uit: tonale stapeling."** Werklicht is het enige regime dat zijn
diepte noch uit gloed noch uit schaduw haalt, dus de tonale afstand tussen grond en het eerste
verhoogde vlak moet groter zijn. Doorgerekend:

```
                grond      raised     elevated
  nacht         ink.980 -> ink.800 -> ink.600     1,051 : 1  /  1,099 : 1
  werklicht     ink.950 -> ink.800 -> ink.600     1,087 : 1  /  1,099 : 1
```

De eerste stap is in werklicht ruim anderhalf keer zo groot in luminantieverschil. Dat is precies
wat de dichtste kamer nodig heeft en wat "tonale stapeling" betekent. Er komt geen waarde bij: alle
drie de stappen bestaan al.

## Minimaal amendement

Drie dingen. Geen nieuwe kleur, geen nieuw effect, geen nieuwe esthetische laag.

**1. Eén verduidelijkende zin in hoofdstuk 5**, direct onder de regimetabel:

> `ink.980` naar `ink.950` beschrijft de **stap** die de grond in werklicht zet ten opzichte van het
> nachtregime, niet een verloop en niet een band. De grond van de Cockpit **is** `ink.950`. Doordat
> het eerste verhoogde vlak `ink.800` blijft, wordt de eerste tonale stap groter dan in nacht, en
> juist die grotere stap is de diepte die werklicht in plaats van gloed en schaduw gebruikt.

**2. Een derde regimeblok in de generator**, mechanisch afgeleid. Werklicht is nacht met één andere
grond:

```css
[data-maculis-regime="worklight"] {
  --surface-ground: #080503;   /* ink.950, de enige afwijking van nacht */
  --surface-raised: #14120f;   /* ink.800, gelijk aan nacht */
  --surface-elevated: #251a10; /* ink.600, gelijk aan nacht */
  /* tekst, semantiek en border.semantic: identiek aan nacht */
}
```

**3. Kopregel van het tokenbestand corrigeren:** `Cockpit <html data-maculis-regime="worklight">`.
Vandaag staat daar `night`, en dat is de instructie waar de pilot op is gevaren.

## Welke delen van de Cockpit hierdoor veranderen

Hier zit een correctie op mijn eigen pilotrapport in.

| Onderdeel | Vandaag | Onder werklicht | Gevolg |
|---|---|---|---|
| **Testerbeheer**, `styles.css` | `--bg: #080503` | `ink.950` `#080503` | **Al canoniek. Nul verandering.** |
| **Inbox**, `comm.html` | `--bg: #0b0c0f` | `#080503` | verandert |
| **Relatie-workspace**, `workspace.html` | `--bg: #0b0c0f` | `#080503` | verandert |
| Verhoogde vlakken, alle drie | in Testerbeheer warm, in de andere twee nu al canoniek na de pilot | ongewijzigd | geen |
| Regime-attribuut | `night` (pilot, provisorisch) | `worklight` | één attribuutwaarde |
| Vierde tonale niveau in de Inbox | `panel2` bestaat naast panel en panel3 | max drie (hoofdstuk 6) | opheffen, hoort bij deze stap |

**Correctie op het pilotrapport.** Ik schreef daar dat de koude grond van Inbox en Workspace
"directioneel goed" was, omdat `#0b0c0f` vrijwel gelijk is aan `ink.980`. Dat klopt alleen als de
Cockpit onder het nachtregime zou vallen. Onder werklicht is het omgekeerd: **Testerbeheer had de
grond al goed en Inbox en Workspace moeten alsnog naar de warme diepe grond.** Mijn eerste
harmonisatieplan had op dit punt dus gelijk, en mijn correctie daarop in het herziene plan was zelf
te snel. De reden dat het nu wél vaststaat is dat het ijkpunt is geraadpleegd in plaats van de
tokenkop.

Praktisch gevolg: één regel per bestand, in twee bestanden, plus het opheffen van `panel2`.

## Gevolgen elders

| | |
|---|---|
| **Tokenbestand** | +1 regimeblok, 3 tot 13 tokens afhankelijk van of tekst en semantiek worden herhaald of overgeërfd. Versie naar 1.0.2, nieuwe checksum |
| **Website, Lens** | Geen. Zij blijven `night` |
| **Mijn Maculis** | Geen. Blijft `day` |
| **Vendoring** | Cockpit hervendort en zet het attribuut om. Website en Lens dragen het bestand vandaag nog niet |
| **Onze poort** | `tools/check-tokens.mjs` faalt tot de pin naar 1.0.2 gaat. Bedoelde werking |

## Regressierisico

**Canon: nul.** Puur additief, geen bestaande waarde of regel wijzigt.

**Toepassing: middel, en geconcentreerd.** Twee gronden kantelen van `#0b0c0f` naar `#080503`. Dat
is een klein absoluut verschil, luminantieverhouding 1,039 : 1, maar het raakt elk vlak op beide
schermen en moet daarom atomair landen: één commit per bestand, allebei in dezelfde deploy, met een
vooraf beschreven verwachte diff.

Twee aandachtspunten voor die stap, geen van beide blokkerend:

* **Contrast opnieuw meten.** Alle tekstwaarden zijn doorgerekend op paneel `ink.800`, niet op de
  grond. Tekst die rechtstreeks op de grond staat, verschuift mee.
* **Het opheffen van `panel2`** is een echte layoutbeslissing, geen kleurwissel. Drie niveaus voor
  vier bestaande rollen betekent dat twee rollen samenvallen. Dat hoort bij deze stap, met een eigen
  verwachte diff.

## Wat dit voorstel bewust niet doet

Geen gloedregel, geen `light.field` op de grond, geen vignet, geen verloop. De kolom "waar het licht
vandaan komt" zegt voor werklicht: *de inhoud straalt, streng gerantsoeneerd tot één plek.* Dat is
al vastgelegd in hoofdstuk 7 en valt onder amendement C-4, niet onder C-1.

---

## Samenvatting

| | |
|---|---|
| **Amendement nodig** | Ja, en het is het kleinst denkbare: één zin, één regimeblok, één kopregel |
| **Nieuwe waarden** | Geen. `ink.950` bestaat al |
| **Nieuwe esthetische laag** | Geen |
| **Vrije interpretatie** | Weggenomen door het ijkpunt: de Cockpit staat daar op `ink.950` |
| **Verandert in de Cockpit** | Inbox en Workspace: grond en het vierde tonale niveau. Testerbeheer: niets |
| **Regressierisico** | Canon nul, toepassing middel en geconcentreerd in twee bestanden |

Na dit besluit is de canongate voor de Cockpit gesloten: C-1 en C-2 zijn de enige twee blokkades
die de pilot heeft aangetoond, en C-3 tot en met C-8 zijn bevestigd niet-blokkerend voor deze kamer.
