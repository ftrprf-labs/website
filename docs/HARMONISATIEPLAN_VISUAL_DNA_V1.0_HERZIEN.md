# Herzien harmonisatieplan Visual DNA v1.0

> **Status: ANALYSE. Geen productcode gewijzigd. Niets geharmoniseerd, gemerged of gedeployed.**
> Herberekend tegen de echte canon. Vervangt `HARMONISATIEPLAN_VISUAL_DNA_V1.0.md`, dat als
> audit-record blijft staan voor de ruwe technische inventarisatie.

Opgesteld: 2026-08-18
Canon gelezen: `ftrprf-labs/ftrlabs-docs` @ `139ea06`, `03-ux/`

| Gelezen | Versie |
|---|---|
| `03-ux/README.md` | governance en leesvolgorde |
| `03-ux/principles/maculis-visual-dna.md` | `UX-VISUAL-DNA`, approved, v1.0, 2026-08-17, 563 regels |
| `03-ux/specifications/maculis-tokens.css` | 1.0.0, checksum `04d6b40907f2bbda` |
| `03-ux/specifications/maculis-tokens.json` | 1.0.0, zelfde checksum, waarden identiek aan de CSS |
| `03-ux/assets/maculis-visual-north-star.html` | vast op Newsreader, twee woff2 inline, geen stemschakelaar |

Productimplementaties zijn nergens als canon behandeld. Waar dit document een waarde uit code noemt,
staat die er als bevinding, nooit als norm.

---

## 0. O-2 is objectief opgelost. Geen vraag nodig.

**De publieke Maculis-website is `ftrprf-labs/groeiplatform-website`.** Dat is vastgesteld op
bewijs, niet op aanname. Zes onafhankelijke bevestigingen:

| Bewijs | Vindplaats |
|---|---|
| `BRAND_NAME = "Maculis"` | `src/lib/constants.ts:5` |
| Paginatitel `Maculis · Er was altijd al meer te zien` | `src/app/layout.tsx:39` |
| Twaalf Maculis-secties: hero, lens-reveal, lenses, method, principles, proof, founder, contact-cta | `src/components/sections/maculis/` |
| Next.js 14 plus Tailwind, exact wat de canon in hoofdstuk 12 over de website zegt | `package.json`, `tailwind.config.ts` |
| `--paper` en `--signal`, precies de tokens die de canon in 3.1 en 3.5 bij naam citeert | `src/app/globals.css:38,41` |
| Verwijzing naar "Design Constitution, 12 wetten", exact canon-hoofdstuk 16 punt D | `src/app/globals.css:12` |

De repositorynaam is misleidend maar dat is bekend: canon 16 punt C heeft het hernoemen van
`ftrprf-labs/website` en `groeiplatform-website` al als open organisatiepunt staan.

**Definitieve kamerafbakening:**

| Kamer | Repository | Bestanden |
|---|---|---|
| **Website** | `ftrprf-labs/groeiplatform-website` | `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, 76 bronbestanden |
| **Lens** | `ftrprf-labs/maculis-first-five.` | `public/index.html`, stages encounter, ask, looking, outcome |
| **Mijn Maculis** | `ftrprf-labs/maculis-first-five.` | **hetzelfde bestand**, stages welcome, recognition, continuation, account, evaluatie, Pass the Lens, closing |
| **Cockpit** | `ftrprf-labs/website` | `public/styles.css`, `public/comm.html`, `public/workspace.html` |

First Five, Journey en Lens zijn nergens als Website behandeld. Ik heb geen verdere infrastructuur
geopend: `websiteftrprflab` en `growth-os` zijn niet aangehaakt en niet nodig.

---

## 1. Executive summary van de herijking

**De canon draait mijn belangrijkste conclusie om.**

Mijn eerste rapport concludeerde: de warme grond `#080503` is de canonieke Maculis-grond, drie van
de vier kamers hebben hem goed, en de koude grond van Inbox en Workspace is de enige echte breuk en
daarmee het zwaarste en meest risicovolle werk.

De canon zegt iets anders. Grond is `ink.980 #0a0b10`, **de enige koele stap in het hele systeem**,
en `#080503` is `ink.950`, een stap daarboven. Hoofdstuk 3.1 legt uit waarom: warm koper op warme
grond scheidt slecht en de halo dooft modderig uit, terwijl dezelfde halo op `#0a0b10` tot in de rand
schoon blijft. Het is een lichtbeslissing, geen kleurbeslissing.

Daaruit volgt:

**Geen enkele kamer heeft vandaag de juiste grond.** Niet één van de vier.

En de kamer die ik als de zwaarste breuk aanwees, blijkt het dichtst bij de canon te staan:

```
Inbox en Workspace vandaag   --bg: #0b0c0f
Canon                        ink.980 #0a0b10
verschil                     R 11>10 · G 12>11 · B 15>16
```

Dat is visueel niet te onderscheiden. **De koude grond van de Inbox was directioneel goed.** Wat er
mis is, is niet de grond maar alles wát erop staat: de verhoogde oppervlakken `#14161b`, `#1b1e25`,
`#22262f` zijn koel waar de canon warm eist, en de hairlines `#2a2e39` en `#343a47` zijn neutraal
grijs, wat hoofdstuk 6 expliciet verbiedt.

Mijn geplande batch B7, "Inbox en Workspace van koud naar warm", was daarmee gedeeltelijk de
verkeerde ingreep in de verkeerde richting. Als ik die had uitgevoerd, had ik de enige kamer met een
bijna-canonieke grond ervan weggetrokken.

**De tweede grote verschuiving: Mijn Maculis moet naar het dagregime.** Perkament `ink.50 #f7f1e6`,
licht dat van buiten op de inhoud valt, diepte uit schaduw en hairline in plaats van gloed. Vandaag
is Mijn Maculis het diepste zwart in het hele systeem. Dat is de grootste enkele visuele wijziging
van het hele programma.

En die wijziging brengt een dwingend architectuurgevolg mee dat ik in mijn eerste rapport nog als
optionele productbeslissing had geformuleerd. Zie 1.1.

### 1.1 De regimeregel dwingt de splitsing van Lens en Mijn Maculis af

Canon hoofdstuk 5: **"Elke kamer heeft precies één regime. Een tweede regime is een
systeemwijziging."** Hoofdstuk 14 wijst Lens het nachtregime toe en Mijn Maculis het dagregime.

Lens en Mijn Maculis zijn vandaag **één HTML-bestand van 2.535 regels met één `:root` en één
stagesysteem.** Twee regimes in één documentscope is precies wat de regel uitsluit.

Dit is dus geen open productvraag meer, zoals ik hem eerder stelde als O-7. Het is een afgeleide
technische noodzaak. Er zijn twee manieren om eraan te voldoen en beide zijn ingrijpend:

1. **Scopewissel binnen één bestand.** `data-maculis-regime` van `night` naar `day` op het moment dat
   de journey van Lens naar Mijn Maculis overgaat. Goedkoopst, maar het maakt van de regimegrens een
   runtime-toestand in plaats van een documenteigenschap, en de overgang tussen twee volledige
   regimes midden in een lopende journey is een ontwerpmoment dat de canon niet beschrijft.
2. **Splitsen in twee documenten.** Zuiver ten opzichte van de canon, en het lost meteen de seriële
   merge-druk op het bestand op. Maar het raakt het stagesysteem, de video-orkestratie en de
   sessielogica.

**Ik kies hier niet.** Dit is de enige nieuwe open vraag die de herijking oplevert, en hij hoort bij
canon 16 punt B (krijgt Mijn Maculis een eigen repository), dat als architectuur en niet als visueel
open staat. Zie hoofdstuk 8.

### 1.2 Omvang, herijkt

| | Eerste rapport | Na de canon |
|---|---|---|
| Kamers geauditeerd | 3 van 4 | **4 van 4** |
| Stylesheets | 4, circa 2.614 declaraties | **5, circa 2.734 declaraties** |
| Kamers met correcte grond | 3 van 4 | **0 van 4** |
| Tokenlaag | zelf ontwerpen | **bestaat, gegenereerd, gestempeld** |
| Newsreader | te introduceren, bron onbekend | **assets bestaan al**, twee woff2 in de North Star |
| Zwaarste batch | Inbox en Workspace warm maken | **Mijn Maculis naar dag, plus de splitsing** |
| Gedeelde componentlaag | voorgesteld | **door de canon verboden** |

De harmonisatie is netto **groter** geworden, niet kleiner. Maar hij is ook veel beter gedefinieerd:
waar ik eerder negen open beslissingen had, zijn er nu nog twee, en beide liggen buiten het visuele
domein.

---

## 2. Classificatie

Elke bevinding krijgt precies één label.

| Label | Betekenis |
|---|---|
| **IMPLEMENTATION FACT** | Aantoonbaar in de code vandaag. Waardevrij. Verandert niet door de canon. |
| **CANON DELTA** | Wijkt aantoonbaar af van een REGEL of een vastgelegde waarde in Visual DNA v1.0. |
| **TECHNICAL DEBT** | Technisch problematisch los van het visuele DNA. Zou ook zonder canon opgelost moeten worden. |
| **INTENTIONAL ROOM DIFFERENCE** | Mag anders zijn omdat de kamer een andere functie heeft. De canon staat het expliciet toe. |

Een bevinding kan feitelijk zijn én een delta opleveren. In dat geval staat het feit onder
IMPLEMENTATION FACT en de gevolgtrekking onder CANON DELTA, met een kruisverwijzing.

---

## 3. Herziene delta-matrix

Uitgebreid met de canonieke dimensies die mijn eerste matrix niet had: signal language, licht
gekoppeld aan bewijsdichtheid, beweging tegenover stilte, states en datavisualisatie.

`✓` conform · `≈` dichtbij · `✗` strijdig · `∅` afwezig · `▲` toegestane kamerafwijking

| # | Canonieke dimensie | Canon | Website | Lens | Mijn Maculis | Cockpit |
|---|---|---|---|---|---|---|
| 1 | **Grond** | `ink.980 #0a0b10` (Cockpit: naar `ink.950`; MM: `ink.50`) | ✗ `hsl(24 40% 3%)` warm | ✗ `#080503` = ink.950 | ✗ donker, moet **dag** worden | ✗ Tester `#080503`; Inbox `#0b0c0f` ≈ canon |
| 2 | **Alleen ink.980 koel** | REGEL | ✗ alles warm | ✗ alles warm | ✗ | ✗ Inbox/Workspace hebben **koele verhoogde vlakken**, precies andersom |
| 3 | **Ink-schaal** | 10 stappen, vast | ≈ eigen 11-staps HSL-schaal, andere waarden | ≈ 4 stappen aanwezig | ≈ idem | ≈ 4 stappen, andere namen |
| 4 | **Koper `#c8894a`** | HET signaal, schaars | ✓ waarde klopt | ✓ | ✓ | ✓ |
| 5 | **Koper nooit als categorie** | REGEL | ≈ `--signal` en `--amber` zijn duplicaten | ✓ | ✓ | ✗ koper draagt in Tester ook de goudrol |
| 6 | **Goud is licht, geen kleur** | `#d7b36a`, `#f3e387` | ∅ geen goud | ✓ | ✓ | ✗ geen `--gold`, koper speelt de rol |
| 7 | **Violet `semantic.emerging`** | `#8a79e0` nacht, `#5f4fb0` dag | ∅ | ∅ | ∅ | ∅ (wel `--priv #8a3a63`, ander begrip) |
| 8 | **Violet nooit op rusttoestand** | REGEL | n.v.t. | n.v.t. | n.v.t. | ✓ triviaal, violet ontbreekt |
| 9 | **Serif = Newsreader** | REGEL, zelf gehost | ✗ **Fraunces** via next/font | ✗ Iowan/Palatino-stack | ✗ idem | ✗ idem; Inbox/Workspace hebben **geen serif** |
| 10 | **Sans = systeemstack** | vast | ✗ **Inter** via next/font | ≈ stack met Inter erin | ≈ idem | ≈ Roboto-varianten, 3 stacks |
| 11 | **Serif spreekt, sans wijst** | REGEL | ≈ serif ook decoratief in koppen | ✓ sterk | ✓ sterkst | ≈ Tester 6 plekken, correct; Inbox/Workspace ∅ |
| 12 | **`font-optical-sizing: auto`** | REGEL | ∅ | ∅ | ∅ | ∅ |
| 13 | **Typeschaal** | 6 stappen | ≈ eigen Tailwind-schaal | ≈ eigen clamp-waarden | ≈ idem | ▲ **vaste px is toegestaan** |
| 14 | **Lichtregime** | Website nacht, Lens nacht, MM **dag**, Cockpit **werklicht** | ≈ nacht via `.dark`-klasse | ≈ nacht | ✗ **nacht, moet dag** | ✗ geen werklicht-gestapelde grond |
| 15 | **`prefers-color-scheme` stuurt niets** | REGEL | ≈ `.dark` hardgezet, maar er is wel een lichte `:root` | ✓ | ✓ | ✓ |
| 16 | **Surfaces: 3 tonale niveaus** | REGEL | ≈ card, card-2 | ≈ panel | ≈ | ✗ Inbox heeft er **4** (panel, panel2, panel3) |
| 17 | **Hairline of schaduw, nooit beide** | REGEL | ✗ `.glass` heeft rand plus blur plus schaduw | ✓ | ✓ | ≈ mobiele kaartrijen hebben rand plus schaduw |
| 18 | **Hairlines nooit neutraal grijs** | REGEL | ≈ `--border 32 20% 84%` warm | ✓ koper | ✓ | ✗ `#2a2e39`, `#343a47` neutraal |
| 19 | **Spacing 4·8·12·16·24·40·64** | vast | ≈ Tailwind-schaal | ≈ tokens aanwezig, deels gebruikt | ≈ | ✗ ad hoc |
| 20 | **Radii 10·16·20·999** | vast | ≈ Tailwind | ≈ deels | ≈ | ✗ 13× hard `8px` |
| 21 | **Licht volgt bewijsdichtheid** | REGEL | ✗ gloed is decoratief (`.bg-radial-fade`, `shadow-glow`) | ✗ gloed is compositie, niet bewijs | ✗ orb is moment, niet bewijs | ∅ nauwelijks gloed |
| 22 | **`light.core` max één per scherm** | REGEL | ✗ meerdere | ✗ orb, fi-dot, story-dots tegelijk | ✗ | ✓ |
| 23 | **Dag kent geen emissie** | REGEL | n.v.t. | n.v.t. | ✗ nog niet van toepassing, wordt kritiek na 14 | n.v.t. |
| 24 | **Motion: één curve** | `cubic-bezier(.22,.61,.36,1)` | ✗ **3 notaties plus 2 vreemde curves** (`[.16,1,.3,1]` 5×) | ✓ | ✓ | ✗ `cubic-bezier(0.22, 1, 0.36, 1)` |
| 25 | **Motion-levenscyclus, 6 stadia** | REGEL, loopt één keer | ∅ scroll-reveals, geen cyclus | ≈ `tsSharpen` is stadium 6 | ∅ | ∅ |
| 26 | **Beweging is onzekerheid, stilte is inzicht** | REGEL | ✗ beweging is decoratief | ≈ blur naar scherp klopt semantisch | ✗ `evalOrb` ademt oneindig op een **bevestigd** inzicht | ✓ stil, behalve wat aandacht vraagt |
| 27 | **Geen oneindige lus** | REGEL | ✓ | ✗ `breathe` 14s infinite, `fiBreath`, `sndPulse` | ✗ `evalOrb` 6s infinite | ✓ |
| 28 | **Reduced motion = eindtoestand** | REGEL | ≈ 2 van 76 bestanden | ✓ toont eindtoestand, correct | ✓ | ≈ Tester via `no-preference`; Inbox/Workspace ∅ |
| 29 | **Geen cursorreactie, parallax, AI-orb** | REGEL | ≈ hero-micro-interacties te controleren | ✓ | ≈ `.orb` is een lichtpunt, geen AI-orb | ✓ |
| 30 | **Signal language, 4 trappen** | REGEL | ∅ geen veld | ≈ trap 1 en 4 los, geen grammatica | ≈ trap 4 leidt, bewijs aanwezig | ∅ alleen losse punten |
| 31 | **Veld koper aan de rand, violet in de kern** | REGEL | ∅ | ✗ kern is goud, niet violet | ✗ | ∅ |
| 32 | **Verbinding alleen bij betekenis** | REGEL | ∅ | ∅ geen verbindingen | ∅ | ∅ |
| 33 | **States: vorm draagt soort, tekst draagt betekenis** | REGEL | n.v.t. | n.v.t. | n.v.t. | ✓ tekstlabel altijd aanwezig |
| 34 | **Statuslabels Nederlands en menselijk** | REGEL | n.v.t. | n.v.t. | n.v.t. | ✗ `.att` badges zijn **Engelse uppercase** |
| 35 | **Dataviz: geen percentages, geen gauges** | REGEL | ≈ dashboard-preview te toetsen | n.v.t. | n.v.t. | ✗ `width:${p}%` balken in Evaluaties, 3 plekken |
| 36 | **Max 3 categorische reeksen** | REGEL | ✓ | n.v.t. | n.v.t. | ✓ één reeks |
| 37 | **Grafiekkleuren** | `#c07c3e` `#8a79e0` `#1f9470` | ✗ `--ok: 152 39% 49%` staat op de vervallijst | n.v.t. | n.v.t. | ✗ `--ok #4cae86` vervallen |
| 38 | **Vervallen kleuren** | 3.5 | ✗ `--ok`, `--signal` duplicaat | ✓ | ✓ | ✗ `#4cae86`, `#cf8a3c`, `#e8cf97`, `#9aa0ac`, `#2a2e39`, `#343a47` |
| 39 | **Geen eigen `:root` per scherm** | REGEL | ✗ eigen palet | ✗ eigen palet | ✗ | ✗ **drie** eigen paletten |
| 40 | **Modal-scrim `rgba(4,2,1,.62)`** | canoniek | ≈ | ✗ `rgba(4,3,2,.72)` | ✗ | ≈ |
| 41 | **Canoniek tokenbestand vendoren** | hoofdstuk 17 | ∅ | ∅ | ∅ | ∅ |

---

## 4. Wat blijft overeind

Alle feitelijke observaties uit het eerste rapport houden stand. Ze zijn canon-onafhankelijk en
blijven de basis van de planning.

### IMPLEMENTATION FACT

* **Circa 2.734 CSS-declaraties over vijf stylesheets, nul gedeeld.** Bijgesteld naar boven omdat de
  Website er nu bij zit: Lens plus Mijn Maculis 1.204, Cockpit/Testerbeheer 922, Workspace 293,
  Inbox 195, Website 120 in `globals.css` plus `tailwind.config.ts`.
* **Drie van de vijf stylesheets zitten inline in HTML.** Onveranderd.
* **39 losse `rgba(215,179,106, …)` in de Lens** in plaats van een goudtoken. Onveranderd, en nu
  bovendien relevant omdat hoofdstuk 7 gloed aan bewijs koppelt.
* **Undefined tokens die stil op literals terugvallen.** `styles.css` regels 204 t/m 206 en 211
  (`--ink`, `--amber`, `--dim`), en `var(--priv,#8a3a63)` in `comm.html` zonder definitie.
* **Dode code:** `maculis-first-five./index.html`, 1.105 regels, wordt door de `Dockerfile` niet
  gekopieerd.
* **Vijf tot zes responsive breekpuntsets, geen twee gedeeld:** 440, 640 (Lens en Mijn Maculis), 760
  (Testerbeheer), 860 (Inbox), 900 (Workspace), plus de Tailwind-defaults van de Website.
* **De e-mailhandtekening is een vijfde publieksgericht Maculis-oppervlak.** `signature.mjs`, met een
  eigen grijstint `#8a8073`, een vierde sans-stack, en koper dat daar `GOLD` heet.
* **De Lens is één bestand van 2.535 regels** met CSS, HTML en JS door elkaar. Wijzigingen moeten
  serieel.
* **Inbox en Workspace hebben de hoogste informatiedichtheid** en zijn onderling bijna identiek.
* **Er is geen visuele regressietest.** 65 functionele comm-tests plus core, geen daarvan bewaakt een
  pixel.
* **Twee repositories deployen los naar Render**, dus een canonwijziging landt nooit gelijktijdig.
  Met de Website erbij zijn het er drie.

### TECHNICAL DEBT

Onafhankelijk van het DNA op te lossen, en daarom veilig vóór alle canon-werk te plannen:

* De undefined tokens hierboven. Bijzonder geval: `#9aa0ac` is de koele grijstint die zo ongemerkt
  de warme kamer binnenlekt.
* Geen `:focus-visible` in Inbox en Workspace. Toegankelijkheidsdefect, WCAG 2.1 AA is
  architectuurprincipe in `ftrlabs-docs`.
* Geen `prefers-reduced-motion` in Inbox en Workspace.
* Geen `color-scheme` in de Lens, waardoor native controls licht renderen.
* Drie identieke CTA-gradiëntdefinities in Mijn Maculis.
* Twee parallelle knopstelsels in de Lens.
* Twee overtypfouten in de easing: `cubic-bezier(0.22, 1, 0.36, 1)` in de Cockpit en
  `[0.16, 1, 0.3, 1]` in de Website. Beide bijna zeker geen ontwerpkeuze.
* `--signal` als duplicaat van `--amber` in de Website.

---

## 5. Wat verandert door de echte canon

### 5.1 Omgekeerd

| Eerdere conclusie | Wat de canon zegt |
|---|---|
| "`#080503` is dé Maculis-grond en drie van de vier kamers hebben hem goed" | Fout. `#080503` is `ink.950`. Grond is `ink.980 #0a0b10`. **Nul van de vier is goed.** |
| "De koude grond van Inbox en Workspace is de enige echte breuk" | Omgekeerd. `#0b0c0f` staat op één tot twee eenheden per kanaal van de canonieke grond. De grond was goed; de **verhoogde vlakken en hairlines** zijn fout. |
| "Batch B7, Inbox en Workspace van koud naar warm, is de zwaarste ingreep" | Verkeerde richting. De grond blijft koel. Alleen wat erop staat wordt warm. Aanzienlijk kleiner én veiliger dan gepland. |
| "Er is geen dagregime, dat zou nieuw ontwerp zijn" | Feitelijk juist, maar dag is nu **verplicht** voor Mijn Maculis. Van gap naar grootste enkele wijziging. |
| "Mijn Maculis splitsen is een productbeslissing die buiten harmonisatie valt" | De regimeregel dwingt het af. Van optie naar afgeleide noodzaak. |

### 5.2 Aangescherpt

| Eerdere conclusie | Nu |
|---|---|
| "Newsreader wordt nergens geladen" | Klopt, en scherper: de Website laadt **Fraunces**, een andere serif, plus **Inter** waar de canon de systeemstack eist. Beide via `next/font/google`. Erger dan geen serif: een concurrerende serif. |
| "Violet ontbreekt en botst met `--priv`" | Violet is `semantic.emerging` `#8a79e0`. `--priv #8a3a63` is een ánder begrip. Geen botsing, wel twee paars-achtige kleuren met verschillende betekenis in één kamer. Ontwerpaandacht, geen conflict. |
| "De easing wijkt af in de Cockpit" | Ook in de Website, in drie notaties, plus twee niet-canonieke curves. |
| "Inbox en Workspace missen serif" | En hoofdstuk 10 verbiedt bovendien hun Engelse hoofdletterbadges. |
| "De Cockpit heeft geen typeschaal" | Vaste pixels zijn daar juist **canoniek toegestaan**, hoofdstuk 4.3. Geen delta. |

### 5.3 Nieuw, en niet eerder gezien

* De Website is volledig geauditeerd. Vier eigen deltas: Fraunces, Inter, `--ok` op de vervallijst,
  en `.glass` dat rand plus blur plus schaduw combineert waar hoofdstuk 6 er één toestaat.
* De Cockpit toont **percentagebalken** in Evaluaties. Hoofdstuk 11 verbiedt percentages en gauges.
* De Inbox heeft **vier** tonale niveaus waar hoofdstuk 6 er drie toestaat.
* **Newsreader hoeft niet gezocht te worden.** De North Star draagt de complete self-hosted set:
  roman en cursief, variabel 300 tot 700, `font-display: block`, als woff2 data-URI. Circa 129 KB en
  143 KB. Direct herbruikbaar.
* De canon regelt de distributie zelf, hoofdstuk 17: Website importeert het tokenbestand, Cockpit
  linkt het statisch, Lens houdt een **gestempelde inline kopie** als bewuste uitzondering.

---

## 6. Wat vervalt

Deze conclusies uit het eerste rapport trek ik in.

| Vervalt | Reden |
|---|---|
| **O-1** Newsreader ja of nee | Beslist. Hoofdstuk 4.1, met motivering: de cursief is een echte schrijfletter. |
| **O-3** Violet en `--priv` | Beslist. Hoofdstuk 3.3 plus de grens in hoofdstuk 2. |
| **O-4** Mag de Cockpit goud gebruiken | Beslist. Goud is licht, koper is signaal, hoofdstuk 2. |
| **O-5** Inkomend blauw tegenover uitgaand warm | Beslist. Hoofdstuk 10: kleur is nooit de enige drager, tekst draagt de betekenis. Temperatuurcodering vervalt als mechanisme. |
| **O-6** Komt er een dagregime | Beslist. Hoofdstuk 5, en Mijn Maculis krijgt het. |
| **O-8** Distributie A, B of C | Beslist. Hoofdstuk 17 wijst per kamer een vorm aan. |
| **Mijn voorstel voor een `--mc-` tokenprefix** | Vervalt volledig. Het tokenbestand bestaat, is gegenereerd en gestempeld, en mag in een product nooit met de hand worden bewerkt. |
| **Mijn voorgestelde laag 3, gedeelde componenten** | Vervalt volledig. Hoofdstuk 12: **"Geen gedeelde componentbibliotheek."** Eén bibliotheek zou twee van de vier producten tot herbouw dwingen. Alleen familiegelijkenis is canon. |
| **Mijn drielaagse architectuur canon, kamer, component** | Vervangen door de canonieke tweelaag: gegenereerde tokens plus `data-maculis-regime` per kamer. |
| **Mijn `[data-room]`-voorstel** | Vervangen door het canonieke `data-maculis-regime`. |
| **Mijn voorstel voor `--mc-t-ui-*`** | Overbodig. Hoofdstuk 4.3 regelt de vaste Cockpit-pixels al. |

Dat mijn eigen architectuurvoorstel grotendeels sneuvelt is het juiste resultaat. Ik had het
gereconstrueerd uit productcode, en dat is exact wat de canon-README verbiedt.

---

## 7. Wat bewust functioneel mag blijven

Canon hoofdstuk 14 legt dit zelf vast. Dit is geen achterstand en mag nooit als delta worden
gerapporteerd.

### INTENTIONAL ROOM DIFFERENCE

| Kamer | Mag anders zijn | Canonieke grond |
|---|---|---|
| **Website** | Webfonts, SEO, scroll-reveals, navigatie. Typeschaal tot `hero`. Hoogste magie. Signal language trap 1 tot 4 volledig zichtbaar. Volle motion-cyclus. | 14, rij "Uniek en terecht" |
| **Lens** | Geen navigatie, video, grain en vignet, onderstreepte velden. Diepste nacht. Laagste dichtheid. Eén trap per moment, altijd met bron. Inline gestempelde tokenkopie. | 14 en 17 |
| **Mijn Maculis** | Licht oppervlak, `surface.private` zand `#ece0c9`. `insight` als leidende typestap. Alleen ademen als beweging. Trap 4 leidt. | 14 |
| **Cockpit** | **Vaste pixelmaten in plaats van `clamp()`**, expliciet "de enige toegestane afwijking". Hoogste dichtheid, snelle transities, laagste magie. Alleen trap 1. Stil, behalve wat aandacht vraagt. | 4.3 en 14 |

**Absoluut gedeeld, en dus nooit een kamerkeuze:** de ink-familie, koper `#c8894a`, serif spreekt en
sans wijst, `cubic-bezier(.22,.61,.36,1)`, blur naar scherp, het lichtpunt, koper ziet en violet
wordt, beweging is onzekerheid, onzeker is kleurloos, kleur nooit als enige signaal, en reduced
motion toont de eindtoestand.

Concreet gevolg voor mijn eerdere plan: de "harmoniseer de breekpunten naar één set"-stap uit het
eerste rapport moet **kamerbewust** worden. Dichtheid verschilt per canon, dus breekpunten mogen
verschillen. Wat niet mag verschillen is de curve, de grond, de letter en de betekenis van kleur.

---

## 8. Observaties aan de canonzijde

Conform hoofdstuk 17 meld ik deze en los ik ze niet zelf op. Het zijn geen fouten in de besluiten,
maar plekken waar het gegenereerde tokenbestand nog niet alles draagt wat de canon vastlegt.

| # | Observatie | Blokkeert |
|---|---|---|
| **C-1** | **Werklicht heeft geen machineleesbare vorm.** Hoofdstuk 5 en 14 leggen drie regimes vast en geven de Cockpit werklicht, grond `ink.980` naar `ink.950`. Het tokenbestand kent alleen `night` en `day`, en de kop wijst de Cockpit `night` toe met een egale `#0a0b10`. De tonale stapeling die werklicht definieert, is nergens uitdrukbaar. | alle Cockpit-grondwerk |
| **C-2** | `border.semantic`, de statuskleur op 35 procent uit hoofdstuk 6, ontbreekt in `tokens.css` en `.json`. | statuswerk in alle kamers |
| **C-3** | De canonieke schaduw `0 22px 55px -32px rgba(0,0,0,.85)` uit hoofdstuk 6 staat niet in het tokenbestand. | dagregime Mijn Maculis, waar schaduw de diepte draagt |
| **C-4** | `light.core`, `light.field` en `light.edge` uit hoofdstuk 7 hebben geen tokens. Juist deze drie moeten met bewijsdichtheid meeschalen. | alle gloedwerk |
| **C-5** | De modal-scrim `rgba(4,2,1,.62)` uit hoofdstuk 12 staat niet in het tokenbestand. | modals in Cockpit en Lens |
| **C-6** | De North Star gebruikt `--violet-core #a99bec`, dat in geen van beide tokenbestanden voorkomt. | signal-language-werk |
| **C-7** | De canon regelt geen e-mailoppervlak. De Living Signature is publieksgericht Maculis, in vier opzichten afwijkend, en e-mail dwingt inline waarden af in plaats van custom properties. | de handtekening-batch |

C-1 is de zwaarste. Zolang werklicht niet uitdrukbaar is, kan de Cockpit niet naar de canonieke
grond zonder dat iemand met de hand een waarde verzint, en dat is precies wat hoofdstuk 17 verbiedt.

---

## 9. Herziene harmonisatievolgorde

Leidend: eerst wat de canon zelf moet aanvullen, dan wat canon-onafhankelijk veilig is, dan de
tokenlaag, dan pas per kamer. Alle nul-delta-stappen vóór alle zichtbare stappen.

| Fase | Stap | Kamer | Zichtbaar | Afhankelijk van |
|---|---|---|---|---|
| **F0** | C-1 tot C-6 in de canon aanvullen, nieuwe checksum | canon | nee | hoofdstuk 17 |
| **F0** | C-7 beslissen: valt e-mail onder het DNA | canon | nee | Lud |
| **F1** | Newsreader-woff2 uit de North Star extraheren, zelf hosten per kamer | alle | nee, nog niet toegepast | F0 niet nodig |
| **F1** | Gestempelde tokens vendoren per hoofdstuk 17, nog nergens toegepast. Plus checksum-CI | alle | nee | F0 |
| **F2** | **Technische schuld** uit §4: undefined tokens, dode code, `:focus-visible`, reduced motion, `color-scheme`, dubbele CTA's, dubbele knopstelsels, easing-overtypfouten | alle | minimaal | geen |
| **F3** | Vervallen kleuren uit 3.5 verwijderen | Website, Cockpit | klein | F1 |
| **F3** | Statusbadges naar Nederlands en menselijk | Cockpit | klein | geen |
| **F3** | Percentagebalken uit Evaluaties | Cockpit | middel | F0 |
| **F4** | Grond naar `ink.980`, plus verhoogde vlakken warm | Website | middel | F1 |
| **F4** | Grond naar `ink.980` | Lens | middel | F1 |
| **F4** | Grond blijft, **verhoogde vlakken en hairlines warm**, vierde tonale niveau weg | Cockpit Inbox en Workspace | middel | F1 |
| **F4** | Grond naar werklicht-stapeling | Cockpit Testerbeheer | middel | **F0 / C-1** |
| **F5** | Fraunces naar Newsreader, Inter naar systeemstack | Website | **groot** | F1 |
| **F5** | Serif-stack naar Newsreader, `font-optical-sizing: auto` | Lens, Mijn Maculis, Cockpit | **groot** | F1 |
| **F6** | **Beslissing: splitsen of runtime-regimewissel** | Lens en Mijn Maculis | nee | Lud, zie §10 |
| **F7** | **Mijn Maculis naar dagregime.** Perkament, schaduw in plaats van gloed, `surface.private` | Mijn Maculis | **zeer groot** | F6, C-3 |
| **F8** | Signal language als grammatica, vier trappen, per kamer op de canonieke diepte | alle | groot | F0 / C-6 |
| **F8** | Gloed koppelen aan bewijsdichtheid, oneindige lussen beëindigen | alle | groot | F0 / C-4 |
| **F8** | Motion-levenscyclus, zes stadia, eindigt in rust | Website, Lens | groot | F1 |
| **F9** | E-mailhandtekening | Cockpit-backend | extern | C-7 |

**Wat atomair moet landen.** F4 per kamer in één commit, want een halve grondconversie geeft warme
panelen op een koude grond. F5 per kamer in één commit, want een halve letterwissel is onleesbaar.
F7 volledig in één keer, want een half dagregime is geen regime.

**Wat los kan.** Heel F2. Dat is bewust: het is de grootste hoeveelheid werk zonder enig
canon-risico, het maakt elke latere stap veiliger, en het kan vandaag beginnen.

**Volgorde-omkering ten opzichte van het eerste plan.** Ik had de Inbox als batch B7 halverwege
staan, als zwaarste ingreep. Die zakt nu naar F4 en wordt aanzienlijk kleiner. Wat omhoog schuift is
Mijn Maculis, van "niet in het plan" naar de zwaarste stap van allemaal.

### Verificatie

Het protocol uit het eerste plan blijft geldig en krijgt vier poorten erbij:

* **Regimepoort.** Per kamer precies één `data-maculis-regime`. Twee in één documentscope is een fout.
* **Checksumpoort.** Elk gevendord tokenbestand draagt `04d6b40907f2bbda`, of de actuele waarde na F0.
  Afwijking betekent stale en mag niet gebruikt worden.
* **Reduced-motion-poort.** Onder `reduce` toont elk scherm de **eindtoestand**: samengekomen,
  verbonden, violette kern op volle straal. Een bevroren begin is een fout, ook als er niets beweegt.
* **Gloedpoort.** Voor elke gloed op het scherm moet benoembaar zijn welk bewijs hem draagt. Kan dat
  niet, dan hoort er geen gloed.

De nulmeting uit het eerste plan moet vóór F1 opnieuw, nu met de Website erbij en met de vier
canonieke regimes als variabele.

---

## 10. Open beslissingen

Van negen naar twee. Beide liggen buiten het visuele domein.

| # | Beslissing | Waarom alleen Lud | Blokkeert |
|---|---|---|---|
| **N-1** | **Splitsen of runtime-regimewissel voor Lens en Mijn Maculis.** Twee kamers, twee regimes, vandaag één bestand van 2.535 regels. Splitsen is canon-zuiver en lost de seriële merge-druk op, maar raakt stagesysteem, video-orkestratie en sessielogica. Een runtime-wissel is goedkoper maar maakt de regimegrens een toestand in plaats van een documenteigenschap, en de canon beschrijft die overgang niet. Hangt samen met canon 16 punt B. | Architectuur en product, geen visuele keuze | F6, F7 |
| **N-2** | **Valt de e-mailhandtekening onder Visual DNA v1.0?** De canon noemt vier kamers en geen e-mail, terwijl de handtekening wel publieksgericht Maculis is. E-mail dwingt inline waarden af, dus tokens moeten daar als server-side constanten bestaan. Dat is een canonuitbreiding, geen productkeuze. | Hoofdstuk 17: een product mag nooit zelf besluiten dat zijn vondst merkbreed is | F9 |

C-1 tot en met C-6 zijn geen beslissingen maar aanvullingen die via hoofdstuk 17 in de canon horen te
landen. Ik kan ze voorbereiden zodra je dat vraagt, in `ftrlabs-docs`, niet in een product.

---

## 11. Slot

De canon heeft mijn belangrijkste conclusie omgedraaid en dat is precies waarom hij nodig was. Ik had
`#080503` tot norm verheven omdat drie codebases het gebruiken. De canon laat zien dat dat `ink.950`
is en dat de grond een stap dieper en één tint koeler ligt, om een reden die niets met smaak te maken
heeft: koper moet schoon kunnen uitdoven.

Dat is ook meteen het argument voor de hele governance. Een systeem gereconstrueerd uit
productiecode reproduceert wat er is, niet wat er zou moeten zijn.

Wat overeind blijft is de technische inventarisatie, en die blijkt waardevoller dan verwacht: het
grootste deel van het werk in fase F2 heeft geen enkele canon-afhankelijkheid en kan onmiddellijk
beginnen zonder één visueel risico.

---

## HERZIEN HARMONISATIEPLAN — READY FOR GO/NO-GO

Canon gelezen uit `ftrlabs-docs/03-ux/`, checksum `04d6b40907f2bbda` geverifieerd in beide
tokenbestanden. Alle vier de kamers geauditeerd, inclusief de Website, die nu objectief is
geïdentificeerd als `ftrprf-labs/groeiplatform-website`. Delta-matrix herberekend over 41 canonieke
dimensies. Elke bevinding geclassificeerd.

Twee open beslissingen, N-1 en N-2, en zeven canonzijdige aanvullingen, C-1 tot en met C-7.
Fase F2 kan zonder enige van die antwoorden starten.

**Geen productcode gewijzigd. Niets gerestyled, gemerged of gedeployed. Ik wacht op go of no-go.**
