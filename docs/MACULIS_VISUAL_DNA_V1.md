# Maculis Visual DNA v1.0

**Merkarchitectuur- en ontwerpbesluit. Nog niets gebouwd.**
Datum: 2026-08-17 · Status: ter beoordeling
Bouwt voort op `docs/MACULIS_VISUAL_DNA_AUDIT.md` (de feitelijke code-audit).
Tweede input: de referentieafbeelding "Maculis Visual North Star", gebruikt als design north star.

Geen code, CSS, tokens, componenten, repositories of deploys gewijzigd. Zie 12.

---

## 1. Hoe dit document zich verhoudt tot de audit

De audit beschrijft wat er **is**. Dit document beschrijft wat het **moet worden**, en houdt die
twee streng gescheiden. De referentie is nadrukkelijk geen opdracht om iets na te bouwen en geen
beschrijving van de werkelijkheid.

Elke uitspraak hierna draagt één van drie labels:

| Label | Betekenis |
|---|---|
| **FEIT** | Staat vandaag in de code. Verifieerbaar met bestandspad. |
| **CANON-KLAAR** | Bestaat al in de code en is sterk genoeg om zonder wijziging canoniek Maculis-DNA te worden. Kost niets. |
| **EVOLUTIE** | Nieuw of ambitieuzer dan wat er is. Een bewuste merkkeuze, geen harmonisatie. |

De verhouding tussen die drie is het belangrijkste resultaat van deze exercitie, en zij is gunstig:
**het overgrote deel van de referentie is CANON-KLAAR.** De referentie vraagt minder nieuwe uitvinding
dan zij op het eerste gezicht suggereert. Zij vraagt vooral dat wat al bestaat consequent wordt
toegepast en een naam krijgt.

---

## 2. De referentie gelezen, in drie lagen

Ik loop de acht punten af die je aanspreken, en classificeer ze.

| Wat je aanspreekt | Classificatie | Grond |
|---|---|---|
| Één huis, vier kamers met eigen functie, dichtheid en temperatuur | **CANON-KLAAR** | De vier functies zijn al zichtbaar in de code. Lens is al extreem laag in dichtheid, Cockpit al hoog, Website al expressief. Wat mist is de gedeelde grammatica eroverheen, niet de differentiatie eronder. |
| Diep donker plus warm ivoor en perkament | **CANON-KLAAR** | `#080503` en `#ece2d4` staan in drie producten. Perkament `40 33% 96%` ligt klaar in `globals.css` en wordt nooit aangezet. |
| Koper en goud | **CANON-KLAAR** | `#c8894a` staat in élke codebase plus de e-mailhandtekening en elke favicon. `#d7b36a` staat in de Lens en de Cockpit. |
| Gecontroleerd violet en licht | **EVOLUTIE, met bestaande wortel** | Violet bestaat één keer (`#7c3aed` voor `OPENED`). De betekenis klopt al. Zie 4. |
| Editorial typografie plus precieze software-UI | **CANON-KLAAR** | Serif voor betekenis, sans voor functie, is al de praktijk in website, Lens en Cockpit-oppervlak A. |
| Intelligentie, diepte, licht en beweging zonder generieke AI-esthetiek | **CANON-KLAAR** | De blur naar scherp, grain plus vignette, de diffuse schaduw en de gerichte lichtbron bestaan al in de Lens. |
| Losse signalen naar verbinding naar patroon naar inzicht | **EVOLUTIE, half aanwezig** | Trap 1 (het lichtpunt) bestaat drie keer. Trap 4 (het inzicht) twee keer. Trap 2 en 3 nog niet visueel. Zie 8. |
| Meer magie en wow dan klassieke SaaS, volwassen en geloofwaardig | **EVOLUTIE in dosering, CANON-KLAAR in middelen** | Alle middelen bestaan. Wat de referentie toevoegt is durf in schaal en compositie, niet nieuwe techniek. |
| Licht, gloed, fijne lijnen, orbitalen, signaalvelden, gelaagdheid | **gemengd** | Licht, gloed, fijne lijnen en gelaagdheid zijn CANON-KLAAR. Orbitalen en het uitgewerkte signaalveld zijn EVOLUTIE. |
| Dezelfde taal, anders per omgeving | **EVOLUTIE als principe, CANON-KLAAR als praktijk** | Het gebeurt al, maar per ongeluk. Het moet gaan gebeuren met opzet. |

### 2.1 Wat er in de referentie staat dat ik niet zou overnemen

Ik ben hier expliciet, want een north star die je kritiekloos volgt is geen north star maar een
specificatie.

| Element in de referentie | Oordeel | Reden |
|---|---|---|
| `IN PROGRESS`, `REVIEW`, `PLANNED` als hoofdletter-Engelse badges | **niet overnemen** | Projectmanagement-idioom. Maculis schrijft Nederlands en menselijk. De states zijn goed, de taal niet. |
| `+3 deze week`, `+6 deze week`, `+12% deze week` | **niet overnemen** | Groeidashboard-taal. Botst met "Maculis toont één ding, niet een score". Zie 9.4. |
| `12.548 signalen geanalyseerd · 237 organisaties · 8 markten` | **met voorbehoud** | Op de website als bewijs van volume verdedigbaar. In een productscherm nooit. |
| Teamplanning met avatars en een weekkalender | **niet overnemen** | Generieke SaaS-widget zonder relatie tot het merkverhaal. |
| De vier klantlogo's onder de hero | **met voorbehoud** | Werkt als bewijs, maar botst met de terughoudende merkhouding. Ondergeschikt uitvoeren of weglaten. |
| De isometrische 3D-huisillustratie (strip 5) | **niet als productbeeld** | Prachtig als intern verhaal en als merkpresentatie. Niet in een product, want het is illustratie en Maculis heeft geen illustratiebeeldtaal. |
| Het constellatiebeeld als datavisualisatie | **alleen als merkbeeld** | Zie 9.5. Als grafiek schaalt hij niet en zijn de posities betekenisloos. |

Alles wat hierboven staat, is precies het deel van de referentie dat "een heel goed design system
voor een SaaS-bedrijf" zou opleveren. Het weglaten ervan is wat ruimte maakt voor distinctiveness.

---

## 3. Navy, opnieuw onderzocht

De referentie noemt in strip 6 letterlijk "Warm navy & parchment". Mijn audit stelde vast dat er geen
navy in Maculis bestaat. Je vroeg mij niet om die conclusie te herhalen maar om te onderzoeken welke
bestaande Maculis-dark het beste canonieke vertrekpunt is. Dat is de juiste vraag en zij heeft een
beter antwoord dan ja of nee.

### 3.1 Wat er te kiezen valt

**FEIT.** De donkere waarden die vandaag in Maculis bestaan:

| Waarde | Waar | Karakter |
|---|---|---|
| `#080503` | Lens `--bg`, Testerbeheer `--bg` | warm bijna-zwart, hue ~24 |
| `#0f0a06` | Lens `--bg-2` | warm |
| `#14120f` | Lens `--panel` | warm |
| `#140e08` | Testerbeheer `--surface` | warm |
| `#14100c` | Website `themeColor` | warm |
| `#0b0c0f` | Workspace en Inbox `--bg` | **koel bijna-zwart, hue ~220, vrijwel onverzadigd** |
| `#0B2545` | `growth-os` | echte navy. **Ander product.** |

### 3.2 Het argument dat de knoop doorhakt

Er is een technische reden waarom de referentie er diep en intelligent uitziet, en zij heeft niets
met navy als merkkleur te maken.

**Warm licht op een warme grond scheidt slecht. Warm licht op een koele grond scheidt maximaal.**

Koper op `#080503` is een familielid van de achtergrond. Het leest als "helderder bruin". Koper op
een koel bijna-zwart leest als **licht**, want het is dan het complement van de grond. Dat is
precies hoe vuurlicht bij nacht werkt, en het is de reden dat de koperen strepen in referentiepaneel
1 en de violette kern in paneel 2 werkelijk gloeien.

Daar komt bij: **onder ongeveer 8 procent lichtheid wordt hue nauwelijks nog als kleur waargenomen.**
Hij wordt waargenomen als diepte. Een koele drift op de allerdiepste stap is dus geen kleurkeuze maar
een lichtkeuze.

### 3.3 Voorstel

**Introduceer geen navy. Sta de ink-schaal toe om op de diepste stap koel te driften.**

Één doorlopende ink-schaal, warm van boven naar beneden, met precies één koele stap onderaan:

| Stap | Waarde | Herkomst |
|---|---|---|
| `ink.50` | `#f7f1e6` perkament | **CANON-KLAAR**, `--paper: 40 33% 96%` in `globals.css` |
| `ink.100` | `#ece2d4` ivoor | **CANON-KLAAR**, in vier codebases |
| `ink.200` | `#a89a86` warme greige | **CANON-KLAAR**, `--muted` in `styles.css` |
| `ink.300` | `#8a8073` | **CANON-KLAAR**, `DIM` in `signature.mjs` |
| `ink.600` | `#251a10` | **CANON-KLAAR**, `--surface-elevated` |
| `ink.700` | `#1d130b` | **CANON-KLAAR**, `--surface-2` |
| `ink.800` | `#14120f` | **CANON-KLAAR**, Lens `--panel` |
| `ink.900` | `#0f0a06` | **CANON-KLAAR**, Lens `--bg-2` |
| `ink.950` | `#080503` | **CANON-KLAAR**, dé Maculis-grond |
| `ink.980` | `#0a0b10` | **EVOLUTIE**, één nieuwe stap, de enige koele |

**Negen van de tien stappen bestaan al letterlijk in de code.** Er komt precies één waarde bij, op de
plek waar hue ophoudt kleur te zijn en diepte wordt.

En `ink.980` ligt dicht bij `#0b0c0f`, dat al in Workspace en Inbox staat.

### 3.4 De correctie op mijn eigen audit

Dit verandert een aanbeveling uit de audit, en dat is materieel.

De audit zei: het koele palet in Workspace en Inbox is drift, vervang het volledig. Dat was te grof.
Met de referentie ernaast is de scherpere diagnose: **de koele grond was per ongeluk goed; de koele
hairlines, de koele ink en de ontbrekende serif waren fout.**

Concreet blijft `--bg: #0b0c0f` staan (als `ink.980`), en gaan weg: `--line: #2a2e39` en
`--line2: #343a47` (neutraal grijs, moeten koper-hairlines worden), `--dim: #9aa0ac` (koel grijs,
moet `ink.200` worden), en het ontbreken van een serif.

Dat scheelt aanzienlijk in het werk en het is precies het soort onnodig opnieuw doen dat je wilde
vermijden. Zie 11.

---

## 4. Violet, opnieuw onderzocht

Je vroeg of violet een betekenisvolle nieuwe semantische kleur moet worden of uit bestaande taal kan
voortkomen. Het tweede, en dat is de sterkere uitkomst.

### 4.1 Violet bestaat al, met de juiste betekenis

**FEIT.** Violet komt in Maculis precies één keer voor: `#7c3aed` voor de status `OPENED` in
`public/styles.css` regel 249. Geopend, maar nog niet afgerond.

Waar de referentie violet gebruikt:

| Plek in de referentie | Betekenis |
|---|---|
| Lens, de gloeiende kern van het signaalveld | het patroon vormt zich |
| Mijn Maculis, de orb naast het actuele inzicht | dit is aan het ontstaan |
| Mijn Maculis, het bolletje bij "Ontwikkelt zich" | in ontwikkeling |
| Cockpit, de badge `IN PROGRESS` | onderweg, nog niet klaar |

**Alle vier betekenen hetzelfde, en het is hetzelfde als `OPENED`: er is iets in beweging dat nog
niet vaststaat.** Violet is dus geen nieuwe kleur. Het is een bestaande betekenis die nog nooit een
naam kreeg.

### 4.2 De relatie tussen koper en violet is het merk

Dit is naar mijn oordeel de sterkste vondst in de hele referentie, en zij is inhoudelijk, niet
esthetisch.

> **Koper is wat Maculis heeft gezien. Violet is wat aan het worden is.**
> Koper is waarneming, gegrond in bewijs, voltooid tijd.
> Violet is betekenis in wording, nog niet bevestigd, onvoltooid tijd.

Kijk naar referentiepaneel 2: koperen knopen aan de buitenkant, een violette kern in het midden. En
naar strip 7: "Losse signalen worden samenhang. Samenhang wordt patroon. Patroon wordt inzicht."

Dat is letterlijk het productmechanisme in twee kleuren. Losse waarnemingen komen binnen als koper.
Waar er genoeg samenkomen, ontstaat violet licht. **Het signaalveld is koper aan de rand en violet
in de kern, en dat is geen decoratie maar een uitspraak over de data.**

### 4.3 De regel die koper beschermt

Er is een risico. Mijn audit stelde als regel: koper is het signaal en betekent verder niets. Als
violet een tweede accent wordt, verwatert dat.

De grens die dat oplost:

> **Violet roept nooit om aandacht. Violet beschrijft alleen toestand.**
> Koper is de enige kleur die "kijk hier" zegt.

Ze liggen op verschillende assen. Koper stuurt de blik. Violet duidt wat de blik aantreft. Zo blijft
koper monopolist op aandacht.

### 4.4 De volledige semantische set

De referentie geeft in Mijn Maculis vier spiegelkaarten: Ontwikkelt zich, Bevestigd, Vraagt aandacht,
Onzeker. Dat is toevallig precies een volledige semantiek, en zij sluit aan op wat er al is.

| Rol | Kleur | Betekenis | Herkomst |
|---|---|---|---|
| `signal` | koper `#c8894a` | vraagt aandacht, kijk hier | **CANON-KLAAR** |
| `emerging` | violet | ontwikkelt zich, in beweging, nog niet gezet | **EVOLUTIE**, wortel in `OPENED` |
| `confirmed` | jade | bevestigd, consistent, gezet, opt-in | **EVOLUTIE**, vervangt drie bestaande groenen |
| `uncertain` | `ink.300`, **geen kleur** | onzeker, onbekend, geen oordeel | **EVOLUTIE als principe** |
| `broken` | warm rood | mislukt, geblokkeerd, opt-out | **CANON-KLAAR**, `--danger #e5674f` |

**`uncertain` is expliciet kleurloos, en dat is een merkuitspraak.** Maculis kleurt niet wat het niet
weet. Dat volgt rechtstreeks uit "reveal before prescribe" en uit de bestaande copy "Liever eerlijk
dan indrukwekkend" en "Ik kan hier nog niet scherp genoeg kijken". Zie signature 5 in 10.

**EVOLUTIE, expliciet:** de bestaande `#7c3aed` is een koude, sterk verzadigde Tailwind-violet die
niet in de warme familie past. De canonieke violet moet warmer en gedempter zijn. Waarden in 5.2.

---

## 5. Maculis Visual DNA v1.0

### 5.1 De onveranderlijke kern

Vijf dingen. Als één ervan wijzigt, is het een ander merk. Alle vijf zijn vandaag al waar.

1. **Maculis is warm.** De hele ink-schaal ligt tussen hue 24 en 40. De enige uitzondering is de
   diepste grond, waar hue diepte wordt in plaats van kleur.
2. **Koper `#c8894a` is het signaal en het is schaars.** Het is de enige kleur die om aandacht vraagt.
3. **Serif spreekt, sans wijst.** Waar serif staat, staat iets wat Maculis heeft waargenomen, gedacht
   of gevraagd.
4. **Licht ontstaat uit betekenis.** Er gloeit niets omdat het mooi is.
5. **Maculis kleurt niet wat het niet weet.** Onzekerheid is neutraal, altijd.

### 5.2 Canonieke kleurrollen en tokens

**Rollen, niet waarden.** Elke kamer bindt de rollen aan andere stappen. Geen kamer herdefinieert een
rol.

**Ink-schaal.** Zie 3.3. Negen bestaande stappen plus `ink.980`.

**Koper en goud.** Twee rollen, allebei CANON-KLAAR.

```
copper.500  #c8894a   HET signaal. Onveranderlijk. Schaars.
copper.400  #e6a866   hover
copper.700  #8a5f38   gedempt, ondergeschikt bewijs
gold.500    #d7b36a   LICHT, niet kleur. Nog schaarser dan koper.
gold.300    #f3e387   de kern van het licht
gold.700    #b0894a   de onderkant van de gouden gradient
```

**Semantiek.** Zie 4.4.

```
semantic.signal      copper.500                       vraagt aandacht
semantic.emerging    violet.500                       ontwikkelt zich          EVOLUTIE
semantic.confirmed   jade.500                         bevestigd                EVOLUTIE
semantic.uncertain   ink.300, geen kleur              onzeker
semantic.broken      #e5674f                          gebroken
surface.private      zand, warme getinte surface      privé-inhoud             EVOLUTIE
```

**Voorgestelde violet- en jadewaarden.** Per lichtregime een eigen stap, want een kleur die op
perkament werkt, werkt niet op `#080503`.

| Rol | Nachtregime | Dagregime |
|---|---|---|
| `violet.500` | `#8a79e0` | `#5f4fb0` |
| `violet.300` (kernlicht) | `#a99bec` | n.v.t. |
| `jade.500` | `#1f9470` | `#0b8a6e` |

Deze zes waarden zijn niet op het oog gekozen. Zie 9.2: ze zijn numeriek gevalideerd tegen beide
grondvlakken op lichtheidsband, chromadrempel, kleurenblindheidsscheiding en contrast.

**Wat verdwijnt:** `#7c3aed` (koude violet), `#4cae86` en `#4f8a5b` en `152 39% 49%` (drie groenen
voor één begrip), `#cf8a3c` en `#c98a4a` (twee okers), `#b45b5b` (derde rood), `--goldsoft #e8cf97`
(vierde goudtint), `--dim #9aa0ac` (koel grijs), `--signal` als duplicaat van `--amber`.

### 5.3 Typografisch systeem

Drie rollen plus één modifier. **CANON-KLAAR**, dit is al de praktijk.

| Rol | Vorm | Wanneer |
|---|---|---|
| **Uitspraak** | serif, regular of light, negatieve tracking | Wat Maculis ziet, denkt of vraagt |
| **Aanwijzing** | sans, uppercase, tracking `.16em`, 11px | Eyebrow, label, kolomkop, kanaal |
| **Functie** | sans, regular | Bodycopy, tabelinhoud, formulier, metadata |
| **Stem van Maculis** | serif, cursief | Wat Maculis zelf zegt. Modifier op Uitspraak. |

De referentie voegt hier één ding aan toe dat de moeite waard is: **cursieve nadruk binnen een
serif-zin** ("Jullie onderscheidend vermogen wordt jullie belangrijkste *groeikracht*"). Dat is
EVOLUTIE en het is sterk, want het legt de klemtoon op het woord dat het inzicht draagt. Met één
harde regel: de cursief valt op het inzichtwoord, nooit op een willekeurig woord.

**Schaal.** Eén schaal, zes stappen, per kamer een ander bereik. De waarden bestaan al, in de Lens
als `--t-*` en op de website als `display-*`.

```
hero        clamp(2.55rem, 6.2vw, 6.75rem)     alleen Website
statement   clamp(1.95rem, 4.6vw, 4.25rem)     Website, Mijn Maculis
insight     clamp(1.55rem, 3.2vw, 2.85rem)     overal waar iets onthuld wordt
body        clamp(14px, 2.2vw, 17px)           overal, in Cockpit vast op 14px
fine        clamp(13px, 2vw, 15px)             ondersteuning, bewijs
label       11px uppercase tracking .16em      overal
```

**De ene beslissing die openstaat** is welke serif. Zie 11, beslissing 3.

### 5.4 Spacing, radius, borders, surfaces en diepte

**Spacing.** De Lens-schaal wordt canon. **CANON-KLAAR**, staat er al.
`4 · 8 · 12 · 16 · 24 · 40 · 64`

**Radius.** De Lens-schaal wordt canon. **CANON-KLAAR.**
`sm 10 · md 16 · lg 20 · pill 999`
De zeven ongestructureerde radii in de Cockpit vervallen.

**Borders.** Eén hairline-familie, altijd koper met alpha, nooit neutraal grijs.
`border.hairline` koper 18% · `border.defined` koper 34% · `border.semantic` de statuskleur 35%

**Surfaces.** Vier rollen. Elke kamer bindt ze aan eigen waarden.

| Rol | Betekenis |
|---|---|
| `surface.ground` | Het veld. De ruimte waarin gekeken wordt. |
| `surface.raised` | Dit hoort bij elkaar. Kaart, paneel, gespreksblok. |
| `surface.elevated` | Dit vraagt nu je aandacht en niets anders. Modal, sheet. |
| `surface.private` | Dit is van jou alleen. Zichtbaar aan het oppervlak, niet aan een badge. |

**Diepte.** De referentie geeft in strip 9 een stack van zes lagen: Licht, Surface, Rand en lijn,
Inhoud, Schaduw, Diepte. Dat is een bruikbaar model en het maakt expliciet wat de code al doet.

Vier regels, alle vier **CANON-KLAAR** uit de Lens:

1. Eén hairline of één schaduw. Nooit beide op hetzelfde element.
2. Maximaal drie tonale niveaus: ground, raised, elevated.
3. Schaduw is diffuus of hij is er niet. Canoniek: `0 22px 55px -32px rgba(0,0,0,.85)`.
4. Licht is geen schaduw. Gloed gaat naar buiten, is koper of goud of violet, en is voorbehouden aan
   betekenis.

### 5.5 Licht en gloed

Drie niveaus. Alle drie bestaan al, geen enkele heeft een naam.

| Niveau | Definitie | Gebruik |
|---|---|---|
| `light.core` | `0 0 9px 2px` plus een halo van 3 tot 4 keer de diameter | Het lichtpunt. Maximaal één per scherm. |
| `light.field` | zeer wijde radiale gradient, 6% tot 14% alpha | Geeft een oppervlak richting. |
| `light.edge` | 1px verloop bovenop een paneel | Markeert dat hier iets onthuld wordt. |

**De regel die dit tot een signature maakt, en niet tot styling:** zie 10, signature 1.

### 5.6 Motion

**Eén curve: `cubic-bezier(.22, .61, .36, 1)`.** **CANON-KLAAR**, al gedeeld tussen website en Lens.
De duur verschilt per kamer, de curve nooit.

```
motion.micro    120ms     hover en focus in dichte omgevingen
motion.enter    340ms     een element verschijnt
motion.reveal   1400ms    blur naar scherp
motion.stage    1200ms    een scherm wisselt
motion.breathe  6s tot 14s  licht ademt
```

**Vier gebaren**, alle vier al in code: rise, sharpen, land, breathe.

**Wat Maculis niet doet:** bounce, spring, elastische overshoot, skeleton shimmer, parallax,
constante achtergrondbeweging in een werkomgeving, beweging die alleen bestaat om te tonen dat er
beweging is.

**Niet onderhandelbaar:** `prefers-reduced-motion` zet alles uit en alles op de eindtoestand. In alle
drie de gebouwde producten al correct.

### 5.7 Iconografie

**CANON-KLAAR met één opruiming.**

* Lijnen, open vormen, één lijndikte. Nooit gevulde iconen.
* **Concentrische cirkels zijn het merkmotief.** Het lensmerkteken bestaat al in drie schaalvarianten
  op de website (`LensMark`, `LensDot`, `FocusRing`) en als favicon-oog in de Lens.
* Functionele iconen: één bibliotheek per product is acceptabel, mits lijnstijl en dikte gelijk zijn.
* **RETIRE:** de Unicode-glyphs in Testerbeheer (`⤓ ✎ ＋ ⇪ ➤`). Enige plek in Maculis waar
  tekstsymbolen als iconen dienen.

### 5.8 De visuele signal language

Dit is het hart van de referentie en het verdient de meeste precisie.

**Vier trappen. Eén grammatica. Vier intensiteiten.**

| Trap | Vorm | Kleur | Betekenis | Status |
|---|---|---|---|---|
| 1. **Signaal** | een lichtpunt, `light.core` | koper | er is iets waargenomen, losstaand | **CANON-KLAAR**, bestaat 3x |
| 2. **Relatie** | twee punten plus een 1px verbinding, of twee waarnemingen naast elkaar | koper | deze twee horen bij elkaar | **half**, bestaat typografisch |
| 3. **Patroon** | meerdere punten met gedeelde richting, of een rail waarop iets landt | koper naar violet | dit herhaalt zich | **EVOLUTIE** |
| 4. **Inzicht** | serif-uitspraak, met de punten eronder als bewijs | violet kern | dit betekent iets | **CANON-KLAAR**, bestaat 2x |

**De kleurlogica van het veld** volgt uit 4.2 en is de kern van de zaak:

> Signalen komen binnen als koper. Waar er genoeg samenkomen, ontstaat violet licht in de kern.
> De hoeveelheid licht is een functie van het aantal ondersteunende signalen, niet van de opmaak.

**De regel die uniformiteit voorkomt:** dezelfde grammatica, nooit hetzelfde plaatje. Iemand die van
Mijn Maculis naar de Cockpit gaat, herkent het lichtpunt zonder dezelfde grafiek te zien.

### 5.9 Component-DNA

**Geen gedeelde componentbibliotheek.** De reden is hard: de Lens is één HTML-bestand zonder
buildstap, de Cockpit is vanilla ES-modules, de website is Next.js met Tailwind en cva. Eén
bibliotheek zou twee van de vier producten tot herbouw dwingen. Dat is precies wat niet moet.

Wel gedeelde familiegelijkenis:

| Component | Familiekenmerken |
|---|---|
| **Button primair** | Pil. Warm verzadigd oppervlak, donkere tekst. Hover is een lift van 1 tot 2px, nooit een schaalsprong. In merkcontext de gouden gradient met gloed, in werkcontext vlak koper. **De gradientvariant bestaat al identiek in Lens en Cockpit.** |
| **Button secundair** | Transparant, één hairline, dezelfde pil. Hover verandert alleen de randkleur. Bestaat al 3x. |
| **Button tertiair** | Alleen tekst met een 1px onderlijn. Bestaat al. |
| **Card of paneel** | Eén hairline, één tonale stap, `radius.md`. Optioneel `light.edge` wanneer het paneel iets onthult. Nooit meerdere schaduwlagen. |
| **Status** | Vorm draagt de soort, kleur ondersteunt de ernst, **tekst draagt altijd de betekenis**. Pil in dichte context, linkerrand in rustige context. |
| **Navigation item** | Rustig in ruststand. Actief is een koperen markering aan één zijde, nooit een gevuld blok. Bestaat al in 3 verenigbare varianten. |
| **Modal** | `surface.elevated`, warme gedempte scrim (`rgba(4,2,1,.62)` bestaat al). Nooit puur zwart. |
| **Empty state** | Ontworpen, niet leeg. Serif-regel plus één actie. **Het model staat al in de code**: `.cockpit-zero`, "Je bent bij." |
| **Insight surface** | Serif-uitspraak leidt, bewijs eronder achter een 1px rail, bron altijd bereikbaar. Bestaat al 2x. |
| **Collaboration surface** | **EVOLUTIE.** Onderscheid via oppervlak, nooit via kleurcodering alleen. |

---

## 6. Datavisualisatie

De referentie bevat KPI-tegels, een constellatie, statusbadges en lijstweergaven. Dit onderdeel legt
vast hoe Maculis met cijfers omgaat, want dat is waar een merk als dit het snelst generiek wordt.

### 6.1 Het uitgangspunt

**Maculis toont één ding, niet een score.** Voor de vorm betekent dat: kies eerst wat de taak van het
getal is, en accepteer dat het antwoord vaak geen grafiek is maar één getal met een zin eronder.

### 6.2 Het categorische palet, numeriek gevalideerd

Het Maculis-palet is smal en warm. Dat is uitstekend voor merk en lastig voor categorische codering.
Ik heb dit niet op het oog beoordeeld maar doorgerekend.

**Uitkomst: Maculis draagt betrouwbaar drie categorische reeksen, niet meer.**

| Slot | Nachtregime, grond `#080503` | Dagregime, grond `#f7f1e6` |
|---|---|---|
| 1 koper | `#c07c3e` | `#a8672f` |
| 2 violet | `#8a79e0` | `#5f4fb0` |
| 3 jade | `#1f9470` | `#0b8a6e` |

Beide sets halen alle vijf de controles: lichtheidsband, chromadrempel, kleurenblindheidsscheiding
(slechtste paar ΔE 16.5 nacht en 17.6 dag), normaalzicht-ondergrens en contrast tegen het
grondvlak.

**Wat er misging bij vier slots, en waarom dat een blijvende beperking is.** Elke vierde kleur die
past bij het merk komt uit de warm-rode of rozehoek, en die botst met jade bij deuteranopie en
protanopie (gemeten ΔE 2.6 tot 6.7, ver onder de drempel van 8). Koper en jade zijn een klassiek
rood-groen paar. Concreet:

* Maximaal drie reeksen per grafiek.
* Koper en jade nooit als enige onderscheid naast elkaar zetten. Altijd direct labelen of een gat
  van 2px ertussen.
* Meer dan drie categorieën: small multiples, of samenvouwen tot "Overig", nooit een gegenereerde
  vierde kleur.

Dat is geen tekortkoming van het merk. Het is een reden om terughoudend te zijn met multi-reeks
grafieken, wat inhoudelijk toch al de bedoeling is.

### 6.3 De andere kleurtaken

* **Sequentieel (grootte).** Eén hue, licht naar donker. Koper. Nooit een regenboog.
* **Divergerend (polariteit).** Violet aan de ene pool, jade aan de andere, `ink.300` als neutrale
  middenwaarde. Dat betekent in Maculis-termen: **aan het worden ↔ onzeker ↔ bevestigd.** Een
  divergerende schaal die inhoudelijk klopt in plaats van willekeurig te zijn.
* **Status.** De set uit 4.4 is gereserveerd en wordt nooit hergebruikt als reeks 4. Altijd met een
  tekstlabel, nooit kleur alleen.

### 6.4 Vaste regels

* **Nooit twee y-assen.** Twee grootheden van verschillende schaal worden twee grafieken of worden
  geïndexeerd op een gedeelde basis.
* **Kleur volgt de entiteit, nooit de rangorde.** Een filter dat het aantal reeksen verandert, mag de
  overblijvers niet omkleuren.
* **Tekst draagt tekst-tokens, nooit de reekskleur.** Waarden en labels blijven in ink; een gekleurde
  markering ernaast draagt de identiteit.
* **Dunne markeringen, terugtredende assen en raster.** Legenda aanwezig bij twee of meer reeksen,
  directe labels bij vier of minder, nooit een getal op elk punt.
* **Dagregime is een eigen selectie, geen automatische omkering** van het nachtregime.

### 6.5 De KPI-tegels en de constellatie uit de referentie

Twee gerichte oordelen, want dit is waar de referentie het meest risico loopt.

**De KPI-rij (Cockpit, referentiepaneel 4).** De tegelvorm zelf is legitiem: vier losse getallen zijn
geen grafiek en horen als getal getoond te worden. Het probleem zit niet in de tegel maar in de
`+3 deze week` en `+12% deze week` eronder. Die maken er een groeidashboard van. Voorstel: het getal
blijft, de delta verdwijnt, en waar context nodig is komt er één zin in plaats van een percentage.
Dat is ook waarom ik dit in de audit te hard afwees: het patroon mag blijven, de taal eronder niet.

**De constellatie.** Als merkbeeld op de website: ja, en zij is daar sterk. Als datavisualisatie:
nee. Zij is onleesbaar boven ongeveer acht knopen, niet responsive, en de posities zouden
betekenisloos zijn omdat er geen relatiedata is die ze kan bepalen. Wanneer er wel zulke data komt,
is de eerlijke vorm een gerichte grafiek met een expliciete ordening, niet een vrij zwevend veld.
Zie signature 4 voor de vorm die wel schaalt.

---

## 7. Lichtregimes in plaats van light of dark mode

Je vroeg mij mijn aanbeveling over warm licht tegenover donker opnieuw te beoordelen, en of het
sterkere systeem niet bestaat uit gedeeld DNA met verschillende lichtregimes per kamer. Dat is
inderdaad sterker, en het onderscheid is scherper te maken dan alleen helderheid.

**Het verschil tussen de regimes is niet hoe licht het is. Het is waar het licht vandaan komt.**

| Regime | Grond | Waar het licht vandaan komt | Diepte uit | Kamers |
|---|---|---|---|---|
| **Nacht** | `ink.980` naar `ink.950` | **de inhoud zelf straalt.** Gloed, emissie, kernlicht | luminantie en gloed | Website, Lens |
| **Werklicht** | `ink.950` naar `ink.900` | de inhoud straalt, maar streng gerantsoeneerd tot één element | tonale stapeling, nauwelijks gloed | Cockpit |
| **Dag** | `ink.50` perkament | **het licht valt van buiten op de inhoud.** Elevatie, zachte schaduw | schaduw en hairline | Mijn Maculis |

Dat is waarom het geen mode is. In het nachtregime is gloed betekenisdrager. In het dagregime zou
diezelfde gloed onzin zijn, want licht dat op perkament valt gloeit niet, het werpt schaduw. Een
automatische omkering van dark naar light zou dus niet alleen kleuren omdraaien maar de hele logica
van diepte breken.

**Het regime is een eigenschap van de functie van de kamer, niet van een gebruikersvoorkeur.**
Mijn Maculis is licht omdat je er lang leest en nadenkt. Lens is donker omdat er film speelt en er
één ding tegelijk oplicht. Dat is dramaturgie en dat hoort niet aan een toggle te hangen.

**Voorstel voor uitzonderingen.** Elke kamer heeft één canoniek regime. Twee kamers mogen een tweede
aanbieden, niet als thema maar als functie:

* **Mijn Maculis** mag een nachtregime hebben voor avondreflectie. Inhoudelijk passend.
* **Cockpit** mag een dagregime hebben voor lichte werkruimtes. Toegankelijkheidsargument.
* **Website en Lens krijgen geen tweede regime.** Hun regime is de ervaring.

Dat beantwoordt je zorg: er komt geen globale light- of dark-mode, en er wordt ook niet
automatisch één modus gekozen.

---

## 8. De kamermatrix

Vier kamers, negen eigenschappen.

| | **Website** | **Lens** | **Mijn Maculis** | **Cockpit** |
|---|---|---|---|---|
| **Rol** | De voordeur. Verleiden, positioneren, verwonderen. | De observatieruimte. Ontdekken en verbinden. | De reflectieruimte. Vertragen, spiegelen, betekenis geven. | De werkruimte. Concentreren, handelen, samenwerken. |
| **Emotionele temperatuur** | Expressief, verleidend, ambitieus | Onderzoekend, scherp, nieuwsgierig, cinematografisch | Warm, persoonlijk, contemplatief, traag | Intelligent, functioneel, kalm onder dichtheid |
| **Lichtregime** | **Nacht.** Grond `ink.980`, licht straalt uit de inhoud | **Nacht**, het diepst van allemaal. Plus grain en vignet | **Dag.** Perkament `ink.50`, licht valt van boven. Donkere accentpanelen als contrapunt | **Werklicht.** Grond `ink.950` naar `ink.980`, gloed streng gerantsoeneerd |
| **Informatiedichtheid** | Laag. Eén idee per sectie, `py-16 sm:py-32` | **Het laagst.** Vaak één vraag, één zin, één keuze | Midden. Eén inzicht groot, bewijs eronder, spiegel in vieren | **Het hoogst.** Tabellen, drie kolommen, rijhoogte 11px |
| **Mate van magie** | **Het hoogst.** Hier mag verwondering leiden | Hoog, maar gericht. Magie dient de onthulling, nooit zichzelf | Midden. Rust is hier de magie, niet spektakel | **Het laagst, en dat is juist.** Precies één moment van licht: de Attention Cockpit |
| **Dominante surfaces** | `ground` plus grote `raised` podia, `radius.lg` | `ground` plus twee panelen, meer niet. `radius.md` | `ground` perkament, `raised` licht ivoor, `private` zand. Ruime radii | `ground`, dichte `raised` kaarten en tabellen, `elevated` voor modals. `radius.sm` |
| **Signal language** | **Trap 1 tot 4 volledig zichtbaar, als verhaal.** Hier hoort de constellatie als statisch merkbeeld | **Trap 1 tot 4, maar één per moment, altijd met bron.** De rail met het landende lichtpunt is trap 3 in gereduceerde vorm | **Trap 4 leidt.** Trap 1 tot 3 zijn achtergrond en bewijs. Het veld ademt maar dringt niet aan | **Alleen trap 1.** Eén stip, één 2px linkerrand. Nooit trap 2 of 3, want de Cockpit toont, hij duidt niet |
| **Motion-intensiteit** | Hoog. `motion.reveal` 1400ms, scroll-gedreven, gestaffeld | **Het hoogst.** `motion.stage` 1200ms, sequenties tot 4 seconden, ademende lichtpunten | Midden-laag maar traag. `motion.reveal` en `motion.breathe`. Nooit `motion.micro` | **Het laagst en het snelst.** `motion.micro` 120ms, één `motion.enter`. Beweging mag nooit vertragen |
| **Absoluut gedeeld met de andere drie** | Ink-familie · koper `#c8894a` · serif spreekt en sans wijst · de ease · blur naar scherp · het lichtpunt · koper ziet en violet wordt · onzeker is kleurloos · kleur nooit als enige signaal · reduced motion volledig | idem | idem | idem |

**De laatste rij is het hele punt.** Vier kamers verschillen op acht van de negen eigenschappen. De
negende is voor alle vier identiek en die draagt de herkenning.

---

## 9. Wat overal hetzelfde is versus wat per kamer mag verschillen

| Onderdeel | Overal identiek | Per kamer vrij |
|---|---|---|
| Koper `#c8894a` | **ja, de waarde** | nee |
| Ink-familie | **ja, de schaal** | welke stap `ground` is |
| Violet en jade | **ja, de betekenis** | de stap per lichtregime |
| Semantische set | **ja, de vijf rollen** | welke rollen een kamer gebruikt |
| Serif spreekt, sans wijst | **ja, de regel** | de letter, zolang de rolverdeling klopt |
| Type-schaal | **ja, de zes stappen** | welk bereik een kamer gebruikt |
| Spacing en radius | **ja, de schalen** | welke stappen dominant zijn |
| Hairline is koper | **ja** | de alpha |
| Motion-curve | **ja** | de duur |
| Vier gebaren | **ja** | welke een kamer gebruikt |
| Signal language grammatica | **ja, de vier trappen** | **welke trappen zichtbaar zijn, en hoe** |
| Lichtniveaus | **ja, de drie soorten** | **welke een kamer gebruikt en hoe vaak** |
| Reduced motion | **ja, volledig** | nee |
| Kleur nooit enige signaaldrager | **ja** | nee |
| Lichtregime | nee | **ja, dit is de kern van de differentiatie** |
| Informatiedichtheid | nee | **ja** |
| Compositie | nee | **ja** |
| Componentbibliotheek | nee | **ja, per stack** |

---

## 10. Vijf Maculis-signatures

Je vroeg om eigenschappen die we over twee jaar kunnen claimen. Alle vijf zijn gekoppeld aan wat
Maculis inhoudelijk doet, en alle vijf hebben een wortel in bestaande code. Dat maakt ze claimbaar
in plaats van aspirationeel.

### Signature 1. Licht ontstaat uit betekenis

**De regel.** Er gloeit niets omdat het mooi is. De hoeveelheid licht op een element is een functie
van het bewijs eronder.

**Concreet.** Een losse waarneming is een gedempt koperen punt zonder halo. Twee waarnemingen die
elkaar tegenspreken krijgen een verbinding. Een patroon dat door meerdere signalen wordt gedragen,
krijgt een violette kern met een halo die groeit met het aantal signalen. Onbevestigd blijft dof.

**Waarom dit uniek is.** In vrijwel elk ander systeem is gloed een stijlkeuze die overal hetzelfde
is. Hier is licht een **afgeleide van data** en dus onvervalsbaar. Een scherm met veel licht heeft
veel bewijs. Dat is direct af te lezen.

**Wortel in de code.** `story.ts`, `relations.ts`, `pattern-reader.ts` en `pattern-articulate.ts` in
de Lens berekenen al precies deze onderbouwing. De koppeling naar licht bestaat nog niet.

### Signature 2. Koper ziet, violet wordt

**De regel.** Koper is wat Maculis heeft waargenomen. Violet is wat aan het ontstaan is. Hun
ontmoeting is het moment van inzicht.

**Concreet.** Signalen komen het veld binnen als koper. Waar er genoeg samenkomen, vormt zich violet
licht in de kern. In tekst: het bewijs is koper gemarkeerd, het inzicht dat eruit volgt is violet.
In status: koper vraagt aandacht, violet ontwikkelt zich, jade is bevestigd.

**De beschermende grens.** Violet roept nooit om aandacht. Koper is de enige kleur die "kijk hier"
zegt.

**Waarom dit uniek is.** Het is geen palet maar een **relatie tussen twee kleuren met inhoud**. Je
kunt hem niet kopiëren zonder ook het onderliggende onderscheid tussen waarneming en betekenis te
kopiëren.

**Wortel in de code.** `#c8894a` overal, `#7c3aed` voor `OPENED`.

### Signature 3. Scherpstellen is het enige onthullingsgebaar

**De regel.** Blur naar scherp is exclusief voorbehouden aan iets wat Maculis heeft gezien. Nooit
voor een menu, een tab, een laadtoestand of een paginawissel.

**Waarom dit uniek is.** Maculis is een lens. De interface stelt letterlijk scherp. Omdat het gebaar
exclusief is, wordt het een betekenisdrager: als iets scherpstelt, wéét je dat er iets onthuld
wordt, nog voordat je de tekst leest.

**Wortel in de code.** Al twee keer aanwezig met dezelfde ease: `lens-in`, `hero-focus` en de
reveal-transitie op de website, `tsSharpen` en `fiSharpen` in de Lens.

### Signature 4. Het signaalveld met vier trappen

**De regel.** Signaal, relatie, patroon, inzicht. Dezelfde grammatica in alle vier de kamers, vier
verschillende intensiteiten, nooit hetzelfde plaatje.

**Waarom dit uniek is.** Het veld is niet decoratie maar het **bewijs van de kernclaim**: dat losse
dingen bij elkaar horen. Het is het enige merkbeeld dat het productmechanisme laat zien in plaats van
het te illustreren.

**En het schaalt, mits de vorm mee-evolueert.** Een vrij zwevend veld werkt tot ongeveer acht knopen.
Daarboven wordt trap 3 een geordende vorm (een rail, een gerichte grafiek) in plaats van een wolk.
De grammatica blijft, de vorm past zich aan de hoeveelheid aan.

**Wortel in de code.** Trap 1 bestaat drie keer (`.orb`, `.fi-dot`, `LensDot`, `.row-attn`), trap 4
twee keer.

### Signature 5. De eerlijke stilte

**De regel.** Maculis kleurt niet wat het niet weet, en Maculis maakt van niets-gevonden een
ontworpen moment in plaats van een lege staat.

**Concreet.** `uncertain` is expliciet kleurloos. Een scherm zonder bevindingen krijgt evenveel
ontwerpaandacht als een scherm met een reveal. Falen wordt eerlijk benoemd, nooit gemaskeerd met een
vage placeholder.

**Waarom dit uniek is.** Vrijwel elk systeem behandelt de lege staat en de foutstaat als restpost.
Maculis kan claimen dat enkele van zijn mooiste schermen die zijn waar het niets vond. Dat is de
visuele uitdrukking van "reveal before prescribe" en het is de reden dat het merk geloofwaardig
blijft terwijl het magisch oogt.

**Wortel in de code, en die is sterk.** `.cockpit-zero` met "Je bent bij." en het handgetekende
vinkje. De SILENCE-uitkomst in de Lens, die dezelfde zorg krijgt als een reveal
(`.silence .out-lead`, de observaties bewust ondergeschikt getoond). Op de website: "Ik kan hier nog
niet scherp genoeg kijken", "Valt er niets op? Dan noemt Maculis het geen reveal. Liever eerlijk dan
indrukwekkend."

Dit is al waar. Het heeft alleen nog geen naam.

---

## 11. KEEP, EVOLVE, INTRODUCE, RETIRE

### KEEP, ongewijzigd overnemen als canon

| Wat | Waar het staat |
|---|---|
| Koper `#c8894a` | overal |
| Ivoor `#ece2d4` en de warme ink-stappen | Lens, Cockpit, website |
| `#080503` als canonieke grond | Lens, Testerbeheer |
| Perkament `40 33% 96%` | `globals.css`, sluimerend |
| Goud `#d7b36a` en `#f3e387` als licht | Lens |
| De ease `cubic-bezier(.22,.61,.36,1)` | website, Lens |
| Blur naar scherp als onthullingsgebaar | website, Lens |
| De spacing-schaal `4 tot 64` | Lens |
| De radius-schaal `10/16/20/999` | Lens |
| De type-schaal, zes stappen | Lens en website |
| `.btn-primary` gouden gradient | Lens, en identiek in de Cockpit |
| De diffuse schaduw `0 22px 55px -32px` | Lens |
| `light.edge`, de gouden bovennaad | Lens |
| Grain en vignet | Lens, uitsluitend daar |
| De Attention Cockpit als geheel | `styles.css` vanaf regel 386 |
| `.cockpit-zero`, de zero-state | `styles.css` |
| Kleur nooit als enige signaaldrager | `styles.css` regel 438 |
| Volledige `prefers-reduced-motion` dekking | alle drie |
| De e-mailhandtekening | `signature.mjs` |
| De toon van alle zichtbare copy | overal |

### EVOLVE, bestaat maar moet scherper

| Wat | Van | Naar |
|---|---|---|
| Violet | `#7c3aed`, koud en naamloos | `semantic.emerging`, warm en gedempt, per regime een stap |
| Groen | drie waarden voor één begrip | één `jade`, per regime een stap |
| Oker en rood | twee okers, drie roden | één `signal`, één `broken` |
| De koele grond in Workspace en Inbox | ongewilde drift | `ink.980`, bewust als lichtkeuze |
| De hairlines in Workspace en Inbox | neutraal grijs | koper met alpha |
| `--dim #9aa0ac` | koel grijs | `ink.200` warm greige |
| De Cockpit-ease | `cubic-bezier(0.22, 1, 0.36, 1)` | de canonieke curve |
| Zeven radii in de Cockpit | ongestructureerd | de schaal van vier |
| Eyebrow-tracking | `.08em` tot `.32em` | `.16em`, met `.22em` voor het woordmerk |
| De twee attention-systemen | onverenigbaar, twee namensets | één systeem, twee presentatievormen |
| Het lichtpunt | drie namen, drie implementaties | één `light.core` met vier trappen |
| De KPI-tegels | getal plus weekdelta | getal plus één zin |

### INTRODUCE, nieuw en bewust

| Wat | Waarom |
|---|---|
| `ink.980` `#0a0b10` | Eén koele stap onderaan zodat koper en violet als licht lezen. Zie 3. |
| Het dagregime als canoniek regime voor Mijn Maculis | Zie 7. Het palet ligt er al. |
| `surface.private`, zand | Privé zichtbaar aan het oppervlak in plaats van aan een badge. |
| `semantic.uncertain` als kleurloze rol | Maculis kleurt niet wat het niet weet. |
| Trap 2 en trap 3 van het signaalveld | De ontbrekende schakels tussen signaal en inzicht. |
| Licht gekoppeld aan bewijsdichtheid | Signature 1. De belangrijkste nieuwe gedachte in dit document. |
| Cursieve nadruk op het inzichtwoord | Uit de referentie. Sterk, met één harde regel. |
| Het gevalideerde categorische palet en de grens van drie reeksen | Zie 6.2. |
| Het geschreven Design Constitution | Wordt in `globals.css` aangehaald als bestaand, bestaat nergens. |

### RETIRE

| Wat | Reden |
|---|---|
| `#7c3aed` | Koude violet, past niet in de warme familie. Betekenis blijft, waarde gaat. |
| `#4cae86`, `#4f8a5b`, `152 39% 49%` | Drie groenen voor één begrip. |
| `#cf8a3c` en `#c98a4a` | Twee okers. |
| `#b45b5b` | Derde rood. |
| `--goldsoft #e8cf97` | Vierde goudtint zonder rol. |
| `--dim #9aa0ac` | Koel grijs in een warm merk. |
| `--line #2a2e39`, `--line2 #343a47` | Neutraal grijze hairlines. |
| `--signal` als duplicaat van `--amber` | Twee namen, één waarde. |
| Unicode-glyphs als iconen | `⤓ ✎ ＋ ⇪ ➤` in Testerbeheer. |
| `comm.html` als handmatige kopie van `workspace.html` | De duplicatie zelf, niet het scherm. |
| Elke `:root` met een eigen palet per scherm | De praktijk die de divergentie veroorzaakte. |
| Navy als merkkleur | Nooit ingevoerd, en dat blijft zo. |

---

## 12. Beslissingen die jouw akkoord vereisen

Zeven. De eerste drie blokkeren alle vervolgstappen.

**1. De koele grondstap `ink.980`.**
Introduceren we één koele stap onderaan de ink-schaal, of blijft `#080503` de enige grond?
**Mijn advies: introduceren.** Het is de technische verklaring voor waarom de referentie gloeit, het
kost één waarde, en het legitimeert werk dat al in Workspace en Inbox staat. Navy blijft er
nadrukkelijk buiten.

**2. Violet als `semantic.emerging`.**
Wordt violet de canonieke kleur voor "ontwikkelt zich, nog niet gezet", met de regel dat violet nooit
om aandacht roept?
**Mijn advies: ja.** De betekenis bestaat al in `OPENED`, de referentie bevestigt hem vier keer, en
de relatie koper-violet geeft het merk een signature die inhoudelijk klopt.

**3. Welke serif.**
Fraunces (webfont, website) of Iowan Old Style (systeemstack, Lens en Cockpit).
**Mijn advies:** Fraunces als merkletter voor Website en Mijn Maculis, Iowan als systeemfallback voor
Lens en Cockpit, met identieke schaal en rolverdeling. Dat is een compromis en jij moet zeggen of dat
acceptabel is. Het alternatief is Fraunces overal, wat in de Lens een risico op layout shift over
video geeft.

**4. Het dagregime voor Mijn Maculis.**
Wordt perkament het canonieke regime voor de reflectieruimte, met de bestaande `:root` uit
`globals.css` als vertrekpunt?
**Mijn advies: ja.** De referentie bevestigt het en het palet ligt klaar.

**5. Tweede regimes.**
Krijgen Mijn Maculis een nachtregime en de Cockpit een dagregime, terwijl Website en Lens er geen
krijgen?
**Mijn advies: ja, maar pas na v1.0.** Niet in de eerste ronde.

**6. De grens van drie categorische reeksen.**
Accepteren we dat Maculis-grafieken maximaal drie reeksen dragen en daarboven small multiples
gebruiken?
**Mijn advies: ja.** Het is doorgerekend, niet ingeschat, en het past bij "Maculis toont één ding".

**7. Waar de canon woont.**
Voorstel ongewijzigd uit de audit: `ftrlabs-docs` onder `03-ux/`, plus een gegenereerd tokenbestand
dat de Lens en Cockpit kunnen inline-plakken zonder buildstap.

De vier open punten uit de audit die hier niet in staan (repositorynamen, eigen repo voor Mijn
Maculis, het bestaan van het Design Constitution-document, de constellatie als merkbeeld) blijven
onveranderd staan in `MACULIS_VISUAL_DNA_AUDIT.md` hoofdstuk 26.

---

## 13. Aanbevolen harmonisatievolgorde

Aangepast ten opzichte van de audit, want 3.4 verkleint de grootste post aanzienlijk.

**Stap 0. Stop de divergentie. Nu, zonder code.**
Geen nieuw scherm definieert nog een eigen `:root` met eigen kleuren. Wie een waarde nodig heeft die
niet bestaat, agendeert een systeemwijziging. Dit is gratis en het voorkomt dat het probleem groeit
terwijl we het oplossen.

**Stap 1. Schrijf de canon.**
Het Design Constitution plus de tokentabel uit 5.2. Geen code, alleen tekst. Dit is wat werkelijk
ontbreekt, en zonder dit is elke volgende stap een gok.

**Stap 2. Cockpit interne consolidatie, nu goedkoper dan geraamd.**
De audit schatte deze post op ongeveer 65 procent van al het werk, uitgaande van een volledige
paletvervanging in Workspace en Inbox. Met `ink.980` als canonieke grond blijft de achtergrond staan
en beperkt het werk zich tot hairlines, ink, serif en de twee attention-systemen. Ruwe herziening:
van 65 naar ongeveer 45 procent.
Nul merkrisico, volledig intern publiek, en de beste proef of de tokens deugen voordat er iets
publieks mee gebeurt.

**Stap 3. Website plus Lens token-alignment.**
Beide dragen al een tokenseed. Grotendeels hernoemen, plus beslissing 3. Samen vormen zij de
complete publieke keten.

**Stap 4. Mijn Maculis wordt in het systeem geboren.**
Geen migratie. Het eerste product dat vanaf regel één de canon volgt, inclusief het dagregime, het
volledige signaalveld en de semantische set. Daarmee meteen de beste referentie-implementatie.

**Stap 5. Signature 1 pas hier.**
Licht koppelen aan bewijsdichtheid is de meest ambitieuze gedachte in dit document en zij raakt
zowel ontwerp als datamodel. Zij hoort thuis in Mijn Maculis en de Lens, niet in stap 2, en pas
nadat de tokens staan. Eerder proberen levert een mooi effect zonder onderbouwing op, wat precies
het tegenovergestelde is van de bedoeling.

**Stap 6. Terugkoppeling.**
Wat in Mijn Maculis werkt en breed blijkt te gelden, gaat terug naar de canon en daarna naar de
andere drie. Nooit andersom.

**Wat expliciet niet gebeurt.** Geen big-bang. Geen gedeelde componentbibliotheek die twee producten
tot herbouw dwingt. Geen wijziging aan functionele code, routes, API's, database, privacylogica,
Context Layer, Lens-logica of Communication Layer. Geen deploy tijdens de tokenfase.

---

## 14. Hoe het gaat voelen

Iemand komt binnen via de website. Het is nacht, er is diepte, en uit die diepte komen koperen
signalen samen tot één punt licht. Er staat weinig, in een grote rustige serif, met veel ruimte
eromheen. Het voelt alsof iets zich openvouwt in plaats van dat er iets verkocht wordt.

Hij geeft zijn domein en de Lens stelt scherp. Letterlijk: het beeld gaat van onscherp naar scherp,
traag, zonder haast. Er verschijnt één waarneming, met de bron erbij. Het is dezelfde nacht, dezelfde
koperen taal, maar stiller en dichter bij. De voordeur beloofde iets en de observatieruimte lost het
in.

Weken later opent hij Mijn Maculis. Het is licht geworden. Perkament, warm, het licht valt nu van
buiten op de tekst in plaats van eruit te komen. Er staat één inzicht, groot, met één woord cursief
waar de klemtoon ligt. Ernaast een violette kern, want dit is iets wat aan het ontstaan is en dat
weet je aan de kleur. Eronder vier kaarten: wat zich ontwikkelt, wat bevestigd is, wat aandacht
vraagt, en wat onzeker is. Dat laatste is grijs, want Maculis kleurt niet wat het niet weet, en juist
dat maakt de andere drie geloofwaardig.

Zijn adviseur opent ondertussen de Cockpit. Het is weer donker en het is dichter dan alle andere
kamers: tabellen, gesprekken, statussen. Er is precies één plek waar licht valt, en dat is de vraag
wat vandaag aandacht nodig heeft. Verder werkt alles snel en zonder ceremonie. Toch is het dezelfde
koperen hairline, dezelfde ivoren tekst, hetzelfde lichtpunt in de naamkolom, dezelfde curve als de
knop op de homepage.

Vier keer iets volledig anders. Vier keer binnen twee seconden hetzelfde huis.

En de dag dat er niets te melden is, is het scherm niet leeg. Er staat: je bent bij. In dezelfde
serif, met dezelfde zorg als een reveal. Dat is waaraan je het merk het duidelijkst herkent, want
bijna niemand anders neemt de moeite.

---

## 15. Bevestiging: er is niets gewijzigd of gedeployed

* **Geen codewijziging.** Geen `.mjs`, `.ts`, `.tsx`, `.js`, `.html` of `.sql` bestand aangeraakt, in
  geen van de zes repositories.
* **Geen CSS-wijziging.** `styles.css`, de inline styles in `workspace.html`, `comm.html` en de
  Journey, en `globals.css` zijn uitsluitend gelezen.
* **Geen design tokens geïmplementeerd.** Alle tokens in dit document zijn conceptueel.
* **Geen componenten, geen frontend-library, geen repositories geharmoniseerd.**
* **Geen routes, API, database, migraties, privacylogica, Context Layer, Lens-logica of
  Communication Layer gewijzigd.**
* **Geen deploy. Geen productie.**
* **Geen snelle verbeteringen alvast doorgevoerd.** Ook niet de ease-fout in de Cockpit of het
  ontbrekende `--r` in `comm.html`, hoewel beide eenregelig zijn.

De enige wijzigingen in deze sessie zijn twee documentatiebestanden in `docs/` op branch
`claude/maculis-visual-dna-audit-9ilkir`.

Het enige uitgevoerde rekenwerk is de paletvalidatie in 6.2, die uitsluitend hexwaarden in een
losstaand validatiescript heeft doorgerekend. Er is niets uit die uitkomst in code gezet.
