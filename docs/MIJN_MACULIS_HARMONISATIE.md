# Mijn Maculis — harmonisatie op Maculis Visual DNA v1.0

**Datum** 2026-08-18 · **Branch** `claude/mijn-maculis-visual-dna-94ut9s` · **Canon** UX-VISUAL-DNA v1.0, tokens 1.0.3
**Nulmeting** `docs/MIJN_MACULIS_NULMETING.md` · **Status** kandidaat, wacht op visuele GO

---

## 1. Het uitgangspunt

Mijn Maculis is de reflectieruimte. Canon 14 zegt het kort: spiegelen en betekenis geven, warm,
contemplatief, traag, dagregime, dichtheid midden, magie is rust, trap 4 leidt en trap 1 tot 3 zijn
het bewijs. Dat is iets anders dan de Website, die naar buiten spreekt, en iets anders dan de
Cockpit, die onder dichtheid moet blijven werken.

Die eigenheid is het uitgangspunt van deze pass geweest. De informatiearchitectuur, de klantreis en
de hele grens tussen privé en gedeeld zijn ongemoeid gebleven. Wat is veranderd, is de taal waarin
die ruimte spreekt.

## 2. Wat is veranderd

### 2.1 Regime en tokens

`<html data-maculis-regime="day">` staat er nu, en `mijn.css` is een **aliaslaag** geworden: het
bestand definieert geen enkele eigen kleur meer. De oude `:root` met ruim vijftig handmatige
hexwaarden is weg. Daarmee vervallen in één keer:

* de navy ankerkleuren `#0d1524`, `#121d33` en `#1a2740`, die canon 3.5 uitsluit;
* de vierde semantische kleur "ice" `#4b78b4`, die naast koper, violet en jade een eigen betekenis
  droeg en die canon 11 niet kent;
* de eigen violet-, koper- en jadestappen, vervangen door de doorgerekende dagwaarden;
* de eigen radii, spacing, drie schaduwschalen, scrim en motioncurve.

Het gevendorde tokenbestand stond op 1.0.2 en is bijgewerkt naar de gemergede canon 1.0.3, die
`shadow.diffuse` (C-3) en `scrim.modal` (C-5) machineleesbaar maakt. Beide zijn hier nodig: het
dagregime draagt diepte met schaduw, en de bevestigingsdialoog gebruikte een eigen scrim die canon
12 verbiedt. De bump wijzigt geen enkele bestaande waarde; dat is met 56 byte-identieke opnamen van
de Cockpit bewezen.

### 2.2 De donkere zijkant is verdwenen

Dit is de zichtbaarste ingreep. De oude sidebar was een donker navy anker naast een licht werkveld.
Canon 5 laat dat niet toe: **elke kamer heeft precies één regime**, en een tweede regime is een
systeemwijziging met een eigen doorgerekende semantische set. De zijkant staat nu op dezelfde grond,
gescheiden door een koperen hairline. Het actieve item draagt een koperen markering aan één zijde in
plaats van een gevuld blok (canon 12).

Dat maakt de ruimte ook werkelijk persoonlijker. Er is geen podium en geen bedieningspaneel meer,
alleen een licht veld waarin gekeken wordt.

### 2.3 Typografie: serif spreekt, sans wijst

Newsreader vervangt de Palatino-stack. De rolverdeling is opnieuw gelegd:

* **Uitspraak** (serif 300, tracking -0.017em): de paginavraag, de titel van een inzicht, de
  leidende waarneming in het detail, de privacyvragen, de titel van de bevestiging.
* **Aanwijzing** (sans 11px uppercase tracking .16em): sectielabels, de vier vragen in het detail,
  de eyebrow boven de laatste stap.
* **Functie** (sans regular): bodycopy, metadata, knoppen, navigatie.
* **Stem van Maculis** (serif cursief 400 op kleine maten, canon C-9): de reflectieregels en de
  lege staten.

Serif is daarmee nergens meer decoratief. De voetnoot, de organisatienaam, de tijdstempelhint en de
navigatie-ondertitel stonden in serif zonder dat er een waarneming, gedachte of vraag stond; die
staan nu in sans.

De functionele sans blijft de systeemstack. De webfont-uitzondering uit hoofdstuk 14 geldt de
Website, en canon C-8 bevestigt dat die uitzondering niet naar deze kamer overslaat.

### 2.4 Betekenis draagt de kleur

De houding van een inzicht vertaalt nu naar precies één van de vijf semantische rollen:

| Houding | Rol | Waarom |
|---|---|---|
| spanning, valt op | `signal` | vraagt aandacht |
| consistentie, geen verschil | `confirmed` | bevestigd |
| nog niet bekend | `uncertain` | kleurloos, Maculis kleurt niet wat het niet weet |
| nog niet gedeelde ontwikkeling | `emerging` | aan het worden, als **aparte** toestand |

Die laatste is bewust een eigen dimensie gebleven. Canon 10 zegt dat de drie toestandsdimensies
elkaar nooit overschrijven, dus een nieuwe ontwikkeling overschrijft de houding niet maar draagt
een eigen pil.

De statuspil is een transparant vlak met één semantische hairline en de semantische kleur als
tekst, in pilvorm. De oude gevulde violette badge met witte tekst is weg (canon 10).

Koper is weer schaars en stuurt de blik: de focusring, de primaire knop, de actieve
navigatiemarkering en de lichtpunten in het veld. Violet beschrijft uitsluitend toestand en staat
nergens meer op de rusttoestand van een knop, een link of een focusring (canon 2 en 13).

### 2.5 Privé is een oppervlak, geen kleurcode

Canon 6 kent `surface.private`, zand `#ece0c9`, met de toelichting "zichtbaar aan het oppervlak,
niet aan een badge". Canon 12 zegt bij de collaboration surface: onderscheid via oppervlak, nooit
via kleurcodering alleen.

De oude kaart deed het omgekeerde: gedeeld was ijsblauw getint, consistent was groen getint. Nu
draagt een privé-inzicht het zandoppervlak en een gedeeld inzicht het gewone paneel, met in beide
gevallen het tekstlabel "Alleen voor jou" of "Gedeeld" erbij. De houding staat in een linkerrand van
2px, wat canon 10 voorschrijft voor een rustige context.

Praktisch gevolg: op de grond van perkament valt meteen op wat van jou alleen is. Dat is precies wat
deze kamer moet uitstralen.

### 2.6 Het signaalveld is bewijs geworden

Het oude veld was een vast plaatje: zes spaken vanuit een kern naar willekeurige punten, met drie
oneindig lopende animaties. Canon 8.1 verbiedt lijnen op grond van afstand alleen, canon 13 verbiedt
een oneindig lopende animatie, en canon 7 zegt dat er geen gloed hoort waar je het bewijs niet kunt
benoemen.

Het veld wordt nu opgebouwd uit de werkelijke inzichten van deze organisatie:

* elk punt is een waarneming, en punten met dezelfde houding komen naast elkaar te staan, want
  nabijheid is het gevolg van betekenis;
* een verbinding ontstaat alleen tussen signalen met dezelfde houding, en naar de kern alleen vanuit
  signalen die de leidende uitspraak dragen;
* de straal van het licht volgt het aantal signalen dat naar de kern loopt;
* een tekstregel eronder benoemt waarop het licht rust, zodat het licht ook zonder kleur eerlijk is.

Koper aan de rand, violet in de kern (canon 9). In het dagregime is er geen emissie: de kern draagt
een zachte bloom en een slagschaduw, geen gloed (canon 7).

### 2.7 Motion: waarnemen, verband, inzicht, rust

De levenscyclus uit canon 8.1 loopt nu werkelijk, en precies één keer:

| tijd | wat er gebeurt |
|---|---|
| 0 tot 2,2s | de waarnemingen verschijnen en landen, gespreid |
| 2,3 tot 4,4s | de verbanden worden getrokken tussen samenhangende signalen |
| 4,4 tot 6,0s | het inzicht ontsteekt, de halo groeit met het bewijs |
| daarna | rust. Alleen het licht ademt nog, wat canon 14 deze kamer als enige beweging toestaat |

De basisstijl in CSS **is** de eindtoestand; animaties spelen uitsluitend vanaf een afwijking
daarvandaan. Daardoor toont `prefers-reduced-motion: reduce` de eindtoestand direct in plaats van
een bevroren begin (canon 8.5), en blijft de inhoud kloppen als een animatie nooit start.

`tools/visual/mijn-motion.mjs` bewijst dit meetbaar: onderweg verandert het veld werkelijk, de
verbanden worden getrokken, de kern groeit van 2px naar 11px, na de cyclus draait niets meer behalve
het ademen, en de reduced-motion-toestand is **identiek** aan de eindtoestand van de cyclus.

### 2.8 Compositie en leesbaarheid

* De uitspraak en haar bewijs stonden over elkaar heen. Ze staan nu in een raster naast elkaar, en
  onder 860px staat het bewijs eronder.
* Het inzichtdetail volgt de insight surface uit canon 12: de serif-uitspraak leidt, het bewijs staat
  eronder achter een rail van 1px, en de vier vragen zijn Aanwijzingen.
* Het kaartraster was drie vaste kolommen binnen een smalle kolom, wat op 1280px regels van vier
  tekens gaf. Het beweegt nu mee.
* De uitgevonden horizonillustratie met zon en mist is vervangen door een canoniek paneel met
  `light.edge`. Dat was eigen beeldtaal buiten de grammatica.

### 2.9 Copy

De gedachtestreepjes als lege waarde in het inzichtdetail zijn weg, conform `CLAUDE.md`. Lege staten
zijn ontworpen in plaats van leeg: een regel in de stem van Maculis plus één actie, met "Je bent bij."
als model (canon 12).

## 3. Wat bewust onaangeraakt is gebleven

* **De informatiearchitectuur.** Overzicht, Inzichten (De Spiegel), Samenwerking, en het detail met
  de vier vragen. Die was goed en is niet aangeraakt.
* **De klantreis en de hiërarchie.** Dezelfde volgorde, dezelfde nadruk, dezelfde entreepunten.
* **De sharing boundary.** Geen enkele regel in `server/mijn/*`, `server/comm/*` of de migraties is
  gewijzigd. De grens tussen PRIVATE, SHARED en AGGREGATED is architectuur en blijft dat.
* **Alle API-contracten.** Dezelfde endpoints, dezelfde velden, dezelfde headers.
* **Website, Lens en Cockpit.** Zie hoofdstuk 5.
* **De canon zelf.** Er is geen canonwaarde toegevoegd, gewijzigd of geïnterpreteerd buiten wat
  hoofdstuk 17 toestaat.

## 4. Open beslispunten voor de canon

Geregistreerd, niet zelfstandig ingevuld. Geen ervan blokkeert deze kandidaat.

| # | Punt | Wat er nu gebeurt |
|---|---|---|
| M-1 | **Donkere tekst op een koperen vlak.** Canon 12 schrijft voor de primaire knop een warm verzadigd oppervlak met donkere tekst voor, maar kent daar geen token voor. | Conservatief: `#241606`, dezelfde waarde die de Cockpit al gebruikt. Eén handmatige waarde, gemarkeerd in `mijn.css`. Kandidaat voor een canoniek `text.on-signal`. |
| M-2 | **`text.quiet` haalt in het dagregime 3,9:1** en is dus alleen toegestaan op grote tekst. In een kamer met veel kleine metadata is dat in de praktijk onbruikbaar. | Conservatief: alle kleine metadata staat op `text.secondary`. `text.quiet` wordt hier niet gebruikt. Vraag voor de canon: is een derde dagtekstwaarde nodig, of vervalt `text.quiet` voor dag? |
| M-3 | **`semantic.signal` haalt op `surface.private` 4,41:1** en zakt daarmee net onder AA voor kleine tekst. De canon rekent de dagwaarden door op perkament, niet op zand. | Conservatief: geen semantisch gekleurde kleine tekst op het zandoppervlak. De houding staat daar in een linkerrand van 2px plus een tekstlabel, wat canon 10 voor een rustige context sowieso voorschrijft. Vraag voor de canon: moeten de semantische dagwaarden ook op `surface.private` worden doorgerekend? |
| M-4 | **Ademen tegenover "geen oneindig lopende animatie".** Canon 8.3 en 14 staan ademen op licht toe, canon 13 verbiedt een oneindig lopende animatie. | Gelezen als: de **cyclus** loopt niet in een lus, ademen op licht is de enige uitzondering en canon 14 kent die uitzondering deze kamer uitdrukkelijk toe. Onder reduced motion staat ook het ademen stil. |
| M-5 | **De constellatie als datavisualisatie** staat als open punt E in canon 16. | Het veld hier is signal language (canon 9), geen grafiek: het codeert geen waarden en kent geen assen. Zodra punt E wordt ingevuld, hoort dit veld daaraan te worden getoetst. |

## 5. Bewijs

| Poort | Uitkomst |
|---|---|
| Volledige testsuite | 89 tests, 74 geslaagd, 0 gefaald, 15 overgeslagen (die vragen een database) |
| Tokencontrole en checksum | groen, canon 1.0.3, checksum `a8a21414415b8e06`, bestand niet met de hand bewerkt |
| Audit desktop en mobiel | **ALLES GROEN**, was 12 gefaald bij de nulmeting |
| Contrast | alle tekst op alle vier de schermen haalt AA, gemeten tegen de feitelijk samengestelde ondergrond |
| Focus en keyboard | elke Tab-stop draagt een focusring, op beide viewports, op alle vier de schermen |
| Overflow | nul horizontale overflow op 390, 768, 1280 en 1920 |
| Console | nul fouten |
| Reduced motion | nul lopende animaties, niets onzichtbaar door een niet-gestarte animatie |
| Motion | cyclus loopt één keer, komt tot rust, reduced motion staat op exact de eindtoestand |
| Determinisme | vaste fixtures met vaste tijdstempels; twee runs geven hetzelfde veld |
| Visuele regressie | 32 opnamen voor en 32 na, in `tools/visual/mijn-baseline/` en de niet-gecommitte `mijn-after/` |
| Website, Lens en Cockpit | zie hieronder |

**Website, Lens en Cockpit zijn niet gewijzigd.**

* `groeiplatform-website` (Website) en `maculis-first-five.` (Lens) zijn in deze workstream alleen
  gelezen. Er is geen commit en geen push naar die repositories.
* Binnen `ftrprf-labs/website` zijn `public/comm.html`, `public/comm.js`, `public/workspace.html`,
  `public/workspace.js`, `public/styles.css`, `public/app.js` en `public/index.html` **byte-identiek**
  aan de basisbranch.
* Het gevendorde tokenbestand is het enige gedeelde bestand dat deze workstream aanraakt. Bewijs dat
  de Cockpit daar niets van merkt: alle 56 opnamen van workspace, comm en testerbeheer zijn in
  dezelfde container byte-identiek vastgelegd met tokens 1.0.2 en met 1.0.3.
* De harnassen zijn nieuw en apart (`tools/visual/mijn-*`), zodat de Cockpit-harnassen en hun
  baseline ongemoeid blijven.
