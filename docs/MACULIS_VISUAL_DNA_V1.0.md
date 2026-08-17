# Maculis Visual DNA v1.0

**Source of truth voor alle Maculis-omgevingen.**
Versie 1.0 · 2026-08-17 · **Status: VASTGESTELD. Dit is de canon voor het visuele DNA.**
Vervangt het voorstel in `MACULIS_VISUAL_DNA_V1.md`. De feitelijke code-audit blijft
`MACULIS_VISUAL_DNA_AUDIT.md`. Het visuele ijkpunt is `maculis-visual-north-star.html`, dat sinds de
vaststelling vast op Newsreader staat en geen stemschakelaar meer bevat.

Dit document verhuist naar `ftrprf-labs/ftrlabs-docs` onder `03-ux/` als eerste stap van het
harmonisatieplan, conform beslissing 7. Wijzigen kan uitsluitend via hoofdstuk 17.

**De Vijfde Kamer**, de persoonlijke Maculis-werkomgeving, loopt als apart spoor. Dat spoor gebruikt
deze canon en mag hem niet zelfstandig wijzigen. Zie hoofdstuk 16, punt F.

---

## 0. Hoe dit document werkt

Dit is een canon, geen inspiratiedocument. Wat hier staat, geldt. Wat hier niet staat, is nog niet
vastgesteld en mag geen product zelfstandig invullen.

Drie soorten uitspraken, en het onderscheid is bindend:

| | |
|---|---|
| **REGEL** | Geldt overal. Afwijken is een systeemwijziging, geen productkeuze. |
| **PER KAMER** | Elke kamer vult dit zelf in, binnen de vastgelegde grenzen. |
| **OPEN** | Nog niet vastgesteld in v1.0. Zie hoofdstuk 16. |

Alle contrastwaarden in dit document zijn doorgerekend, niet ingeschat. Alle kleuren voor
grafieken zijn gevalideerd met een kleurenblindheidscontrole. Waar een waarde uit bestaande code
komt, staat de vindplaats erbij.

### 0.1 De zeven vastgelegde beslissingen

| # | Beslissing | Uitkomst |
|---|---|---|
| 1 | Koele grondstap | `ink.980 #0a0b10` ingevoerd, met de harde grens dat alleen de grond koel is |
| 2 | Violet | Gecanoniseerd als `semantic.emerging`, met de harde grens dat violet nooit om aandacht roept |
| 3 | Serif | **Newsreader** |
| 4 | Dagregime | Canoniek voor Mijn Maculis, met gecorrigeerde koper- en jadestappen |
| 5 | Tweede regimes | Niet in v1.0. Eén regime per kamer. `prefers-color-scheme` stuurt niets aan |
| 6 | Grafieken | Maximaal drie categorische reeksen. Kleur codeert identiteit óf toestand, nooit allebei |
| 7 | Canon | `ftrlabs-docs` onder `03-ux/`, plus één gestempeld tokenbestand |

---

## 1. De onveranderlijke kern

Vijf uitspraken. Als één ervan wijzigt, is het een ander merk.

1. **Maculis is warm.** De hele ink-schaal ligt tussen hue 24 en 40. Eén uitzondering: de diepste
   grond, waar hue geen kleur meer is maar diepte.
2. **Koper `#c8894a` is het signaal en het is schaars.** De enige kleur die om aandacht vraagt.
3. **Serif spreekt, sans wijst.** Waar serif staat, staat iets wat Maculis heeft waargenomen,
   gedacht of gevraagd.
4. **Licht ontstaat uit betekenis.** Er gloeit niets omdat het mooi is.
5. **Maculis kleurt niet wat het niet weet.** Onzekerheid is neutraal, altijd.

---

## 2. De vier semantische assen

Dit is het hart van v1.0. Vier dragers, elk met één vaste betekenis en een grens die hem beschermt.
Decoratief gebruik van een van deze vier is een fout, geen smaakverschil.

| Drager | Betekenis | De grens die hem beschermt |
|---|---|---|
| **Koper** | Wat Maculis heeft gezien. Waargenomen, gegrond in een bron, voltooid. Vraagt aandacht. | Koper is de enige kleur die "kijk hier" zegt. Nooit als categorie, nooit als versiering. |
| **Violet** | Wat aan het worden is. In beweging, nog niet vastgesteld. | **Violet roept nooit om aandacht.** Het verschijnt nooit op de rusttoestand van een knop, link of focusring. Het beschrijft uitsluitend toestand. |
| **Licht** | Hoeveel bewijs eronder ligt. Halo en intensiteit volgen het aantal onafhankelijke signalen. | Gloed is nooit een stijlkeuze. Als je niet kunt zeggen welk bewijs de gloed draagt, hoort er geen gloed. |
| **Beweging** | Hoeveel er nog onzeker is. | **Beweging is onzekerheid. Stilte is bevestigd inzicht.** Wat betekenis heeft gekregen, verplaatst zich niet meer. |

**REGEL.** Deze vier assen zijn onafhankelijk. Koper stuurt de blik, violet duidt de toestand, licht
meet het bewijs, beweging toont de onzekerheid. Ze mogen elkaar nooit vervangen.

---

## 3. Kleur

### 3.1 De ink-schaal

Eén doorlopende schaal. Negen van de tien stappen bestaan al in productiecode.

| Token | Waarde | Herkomst |
|---|---|---|
| `ink.50` | `#f7f1e6` | perkament. `--paper` in `globals.css` |
| `ink.100` | `#ece2d4` | ivoor. In vier codebases |
| `ink.200` | `#a89a86` | warme greige. `--muted` in `styles.css` |
| `ink.300` | `#8b8377` | afgeleid van `DIM` in `signature.mjs` |
| `ink.600` | `#251a10` | `--surface-elevated` |
| `ink.700` | `#1d130b` | `--surface-2` |
| `ink.800` | `#14120f` | Lens `--panel` |
| `ink.900` | `#0f0a06` | Lens `--bg-2` |
| `ink.950` | `#080503` | dé Maculis-grond |
| `ink.980` | `#0a0b10` | **nieuw.** De enige koele stap |

**REGEL.** Alleen `ink.980` mag koel zijn. Elk verhoogd oppervlak is warm. Deze grens is niet
onderhandelbaar; zonder haar verliest Maculis zijn temperatuur.

**Waarom die ene koele stap.** Warm licht op warme grond scheidt slecht: koper op `#080503` is
familie van de achtergrond en de halo dooft modderig uit. Op `#0a0b10` blijft dezelfde halo tot in
de rand schoon en leest hij als licht. Onder ongeveer 8 procent lichtheid is hue geen kleur meer
maar diepte. Dit is dus een lichtbeslissing, geen kleurbeslissing, en er wordt geen navy ingevoerd.

### 3.2 Merkkleuren

```
copper.500  #c8894a   HET signaal. Onveranderlijk. Schaars.
copper.400  #e6a866   hover
copper.700  #8a5f38   gedempt, ondergeschikt bewijs
gold.500    #d7b36a   LICHT, geen kleur. Nog schaarser dan koper.
gold.300    #f3e387   de kern van het licht
gold.700    #b0894a   onderkant van de gouden gradient
```

### 3.3 Semantische kleuren, per lichtregime

**REGEL.** Elke semantische kleur wordt per lichtregime apart vastgesteld en doorgerekend. Nooit
overgenomen uit het andere regime. Deze regel bestaat omdat precies die fout in het eerste voorstel
zat: twee dagstappen vielen onder de norm zodra de ondergrond veranderde.

| Rol | Betekenis | Nacht en werklicht | Contrast | Dag | Contrast |
|---|---|---|---|---|---|
| `semantic.signal` | vraagt aandacht | `#c8894a` | 6,35:1 | `#925826` | 5,12:1 |
| `semantic.emerging` | ontwikkelt zich | `#8a79e0` | 5,25:1 | `#5f4fb0` | 5,78:1 |
| `semantic.confirmed` | bevestigd | `#1f9470` | 4,92:1 | `#097159` | 5,31:1 |
| `semantic.uncertain` | onzeker | `ink.300`, **geen kleur** | 5,00:1 | `#6b6152` | 5,40:1 |
| `semantic.broken` | gebroken | `#e5674f` | 5,68:1 | `#a33422` | 6,08:1 |

Nachtwaarden gemeten op paneel `ink.800 #14120f`, dagwaarden op perkament `ink.50 #f7f1e6`. Alle
tien halen AA voor kleine tekst.

**`semantic.uncertain` is expliciet kleurloos.** Dat is een merkuitspraak, geen gebrek. Maculis
kleurt niet wat het niet weet, en juist dat maakt de andere vier geloofwaardig.

### 3.4 Tekst

| Token | Nacht | Contrast | Dag | Contrast |
|---|---|---|---|---|
| `text.primary` | `#ece2d4` | 14,60:1 | `#17120c` | 16,56:1 |
| `text.secondary` | `#a89a86` | 6,79:1 | `#6b6152` | 5,40:1 |
| `text.quiet` | `#8b8377` | 5,00:1 | `#8a8073` | 3,9:1 · alleen groot |

### 3.5 Wat vervalt

`#7c3aed` (koude violet) · `#4cae86`, `#4f8a5b`, `152 39% 49%` (drie groenen voor één begrip) ·
`#cf8a3c`, `#c98a4a` (twee okers) · `#b45b5b` (derde rood) · `--goldsoft #e8cf97` (vierde goudtint)
· `--dim #9aa0ac` (koel grijs) · `--line #2a2e39`, `--line2 #343a47` (neutrale hairlines) ·
`--signal` als duplicaat van `--amber`.

**Navy is en blijft geen Maculis-kleur.** De enige navy in de organisatie is `#0B2545` in
`growth-os`, en dat is Praktijk Groeiscan, een ander product.

---

## 4. Typografie

### 4.1 De stem

**Newsreader** is de serif van Maculis. Variabel, met een optische as van 6 tot 72, zelf gehost.

De keuze is gemaakt op een test met zeven identieke composities waarin uitsluitend de letter
veranderde. Doorslaggevend was de cursief: in Maculis is cursief geen nadruk maar een stem, en
Newsreader heeft daar een echte schrijfletter in plaats van een gehelde romein. Daarnaast is de
letter getekend voor schermlezen, met een rationeel skelet en warme details, en hij houdt stand van
6,75rem tot 16px op perkament.

De functionele sans blijft de systeemstack:
`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.

**REGEL.** `font-optical-sizing: auto`. De optische as wordt nooit handmatig overschreven.

### 4.2 De drie rollen plus één modifier

| Rol | Vorm | Wanneer |
|---|---|---|
| **Uitspraak** | serif, gewicht 300, tracking -0.017em | Wat Maculis ziet, denkt of vraagt |
| **Aanwijzing** | sans, 11px, uppercase, tracking .16em, gewicht 600 | Eyebrow, label, kolomkop, kanaal |
| **Functie** | sans, regular | Bodycopy, tabelinhoud, formulier, metadata |
| **Stem van Maculis** | serif, cursief | Wat Maculis zelf zegt. Modifier op Uitspraak |

**REGEL.** Serif is nooit decoratief. Staat er serif, dan staat er een waarneming, een gedachte of
een vraag. Overal waar dat niet zo is, staat sans.

**REGEL.** De cursieve nadruk binnen een serif-zin valt op het woord dat het inzicht draagt, nooit
op een willekeurig woord.

### 4.3 De schaal

| Stap | Waarde | Website | Lens | Mijn Maculis | Cockpit |
|---|---|---|---|---|---|
| `hero` | `clamp(2.55rem, 6.2vw, 6.75rem)` | ja | nee | nee | nooit |
| `statement` | `clamp(1.95rem, 4.6vw, 4.25rem)` | ja | ja | ja | nooit |
| `insight` | `clamp(1.55rem, 3.2vw, 2.85rem)` | ja | ja | **leidend** | de cockpit-kop |
| `body` | `clamp(14px, 2.2vw, 17px)` | ja | ja | ja | vast 14px |
| `fine` | `clamp(13px, 2vw, 15px)` | ja | ja | ja | vast 12,5px |
| `label` | `11px` uppercase tracking `.16em` | ja | ja | ja | ja |

De Cockpit gebruikt vaste pixels in plaats van `clamp()`, omdat vloeiende typografie in een dichte
tabel kolombreedtes onvoorspelbaar maakt. **PER KAMER**, en dit is de enige toegestane afwijking.

---

## 5. Lichtregimes

**REGEL.** Het verschil tussen de regimes is niet hoe licht het is, maar waar het licht vandaan
komt. Daarom is dit geen thema en geen schakelaar.

| Regime | Grond | Waar het licht vandaan komt | Diepte uit | Kamer |
|---|---|---|---|---|
| **Nacht** | `ink.980` | de inhoud straalt zelf | luminantie en gloed | Website, Lens |
| **Werklicht** | `ink.980` naar `ink.950` | de inhoud straalt, streng gerantsoeneerd tot één plek | tonale stapeling | Cockpit |
| **Dag** | `ink.50` perkament | licht valt van buiten op de inhoud | schaduw en hairline | Mijn Maculis |

**REGEL.** Elke kamer heeft precies één regime. Een tweede regime is een systeemwijziging en
vereist een eigen doorgerekende semantische set.

**REGEL.** `prefers-color-scheme` stuurt in Maculis niets aan. Het regime volgt de functie van de
ruimte, niet de instelling van het besturingssysteem.

---

## 6. Surfaces en diepte

| Rol | Betekenis |
|---|---|
| `surface.ground` | Het veld. De ruimte waarin gekeken wordt |
| `surface.raised` | Dit hoort bij elkaar. Kaart, paneel, gespreksblok |
| `surface.elevated` | Dit vraagt nu je aandacht en niets anders. Modal, sheet |
| `surface.private` | Dit is van jou alleen. Zand `#ece0c9`. Zichtbaar aan het oppervlak, niet aan een badge |

**Vier diepteregels, REGEL:**

1. Eén hairline of één schaduw. Nooit beide op hetzelfde element.
2. Maximaal drie tonale niveaus: ground, raised, elevated.
3. Schaduw is diffuus of hij is er niet. Canoniek: `0 22px 55px -32px rgba(0,0,0,.85)`.
4. Licht is geen schaduw. Gloed gaat naar buiten en is voorbehouden aan betekenis.

**Hairlines.** `border.hairline` koper op 18 procent · `border.defined` koper op 34 procent ·
`border.semantic` de statuskleur op 35 procent. **Nooit neutraal grijs.**

**Spacing.** `4 · 8 · 12 · 16 · 24 · 40 · 64`
**Radii.** `sm 10 · md 16 · lg 20 · pill 999`

---

## 7. Licht en gloed

| Niveau | Definitie | Gebruik |
|---|---|---|
| `light.core` | `0 0 9px 2px` plus halo van 3 tot 4 keer de diameter | Het lichtpunt. Maximaal één per scherm |
| `light.field` | zeer wijde radiale gradient, 6 tot 14 procent alpha | Geeft een oppervlak richting |
| `light.edge` | 1px verloop bovenop een paneel | Markeert dat hier iets onthuld wordt |

**REGEL.** De straal van `light.core` is een functie van het aantal onafhankelijke signalen dat de
uitspraak draagt. Niet van de opmaak. Een scherm met veel licht heeft veel bewijs.

**REGEL.** In het dagregime bestaat `light.core` niet als emissie. Daar wordt dezelfde betekenis
gedragen door een zachte slagschaduw en een lichte bloom, want licht dat op perkament valt gloeit
niet, het werpt schaduw.

---

## 8. Motion

### 8.1 De levenscyclus

**REGEL.** Beweging is onzekerheid. Stilte is bevestigd inzicht.

Er is één levenscyclus met zes stadia. De vier kamers zijn geen vier animaties maar vier momenten
in deze cyclus.

| # | Stadium | Wat er gebeurt |
|---|---|---|
| 1 | Maculis kijkt | Waarnemingen verschijnen als losse koperen punten |
| 2 | Signalen bewegen | Elk signaal drijft autonoom, met een eigen traag ritme |
| 3 | Signalen herkennen elkaar | Signalen die over hetzelfde gaan, buigen naar elkaar toe |
| 4 | Verband ontstaat | Een hairline verschijnt, uitsluitend tussen samenhangende signalen |
| 5 | Bewijs verdicht | Meer signalen sluiten aan. Het cluster trekt samen, de drift neemt af |
| 6 | Inzicht verschijnt | Violet ontsteekt, de halo groeit met het aantal signalen, het patroon komt tot rust |

**REGEL.** De cyclus loopt één keer en blijft daarna staan. Er is een eindtoestand en dat is het
inzicht. Geen oneindige lus.

**REGEL.** Een verbinding ontstaat alleen tussen signalen die werkelijk over hetzelfde gaan.
Nabijheid is het gevolg van betekenis, nooit de oorzaak. Lijnen trekken op basis van afstand alleen
is het neural-network-cliché en is verboden.

**REGEL.** De drempel waarboven violet ontsteekt, hangt af van het soort uitspraak, niet van een
vast getal. Een tegenstrijdigheid heeft aan twee gegronde signalen genoeg. Een patroon heeft er
veel meer nodig.

### 8.2 Curve en duur

**Eén curve: `cubic-bezier(.22, .61, .36, 1)`.** De duur verschilt per kamer, de curve nooit.

```
motion.micro    120ms       hover en focus in dichte omgevingen
motion.enter    340ms       een element verschijnt
motion.reveal   1400ms      blur naar scherp
motion.stage    1200ms      een scherm wisselt
motion.breathe  6s tot 14s  licht ademt
motion.cycle    7s tot 13s  de volledige levenscyclus
```

### 8.3 De vier gebaren

**Rise** translateY 6 tot 10px plus opacity · **Sharpen** blur naar scherp · **Land** een lichtpunt
schaalt van .15 naar 1 · **Breathe** zeer traag, oneindig, alleen op licht.

### 8.4 Wat Maculis niet doet

Geen bounce. Geen spring. Geen elastische overshoot. Geen skeleton shimmer. Geen parallax. Geen
cursorreactie of muisafstoting in het signaalveld. Geen constante achtergrondbeweging in een
werkomgeving. Geen alles-pulseert. Geen sterrenhemel. Geen AI-orb. Geen beweging die alleen bestaat
om te tonen dat er beweging is.

### 8.5 Reduced motion

**REGEL, niet onderhandelbaar.** `prefers-reduced-motion: reduce` toont de **eindtoestand** van de
cyclus: volledig samengekomen, verbonden, met de violette kern op volle straal. Nooit een bevroren
begin. De betekenis blijft daarmee volledig overeind, alleen de weg ernaartoe vervalt.

---

## 9. Signal language

Vier trappen, één grammatica, vier intensiteiten.

| Trap | Vorm | Kleur | Betekenis |
|---|---|---|---|
| 1 Signaal | een lichtpunt | koper | er is iets waargenomen, losstaand |
| 2 Relatie | twee punten plus 1px verbinding | koper | deze twee horen bij elkaar |
| 3 Patroon | meerdere punten met gedeelde richting | koper naar violet | dit herhaalt zich |
| 4 Inzicht | serif-uitspraak met de punten als bewijs | violette kern | dit betekent iets |

**REGEL.** Het veld is koper aan de rand en violet in de kern. Signalen komen binnen als koper. Waar
er genoeg samenkomen, ontstaat violet licht.

**REGEL.** Dezelfde grammatica, nooit hetzelfde plaatje. Wie van de ene kamer naar de andere gaat,
herkent het lichtpunt zonder dezelfde grafiek te zien.

**REGEL.** Boven ongeveer acht knopen wordt trap 3 een geordende vorm, bijvoorbeeld een rail of een
gerichte grafiek, in plaats van een vrij zwevende wolk. De grammatica blijft, de vorm past zich aan
de hoeveelheid aan.

---

## 10. States

Drie onafhankelijke dimensies. **REGEL:** ze overschrijven elkaar nooit.

**Semantische toestand.** `signal` vraagt aandacht · `emerging` ontwikkelt zich · `confirmed`
bevestigd · `uncertain` onzeker · `broken` gebroken.

**Attention** (Cockpit, afgeleid, nooit dubbel opgeslagen). Nieuw · Ongelezen · Vraagt handeling ·
Antwoord staat klaar · Wacht op de klant · Afgehandeld · Leveringsprobleem.

**Consent** (onafhankelijk, fail-closed). Onbekend · Toestemming · Ingetrokken.

**REGEL.** Vorm draagt de soort, kleur ondersteunt de ernst, **tekst draagt altijd de betekenis.**
Kleur is nooit de enige drager. Pil in een dichte context, linkerrand van 2px in een rustige
context.

**REGEL.** Statuslabels zijn Nederlands en menselijk. Geen Engelse hoofdletterbadges.

---

## 11. Datavisualisatie

**REGEL.** Maculis toont één ding, niet een score. Geen percentages, geen weektrends, geen deltas,
geen gauges. Een getal mag een getal blijven; wat het betekent staat in een zin eronder.

**REGEL.** Maximaal drie categorische reeksen. Daarboven small multiples, of samenvouwen tot
"Overig". Nooit een gegenereerde vierde kleur.

| Slot | Nacht | Dag |
|---|---|---|
| 1 koper | `#c07c3e` | `#a8672f` |
| 2 violet | `#8a79e0` | `#5f4fb0` |
| 3 jade | `#1f9470` | `#0b8a6e` |

Beide sets halen alle vijf de controles: lichtheidsband, chromadrempel, kleurenblindheidsscheiding
(slechtste paar ΔE 16,5 nacht en 17,6 dag), normaalzicht-ondergrens en contrast. Vier slots faalt
aantoonbaar: elke merkpassende vierde kleur komt uit de warmrode hoek en botst met jade bij
deuteranopie en protanopie, gemeten tussen ΔE 2,6 en 6,7 tegen een drempel van 8.

**REGEL.** Een grafiek codeert met kleur óf identiteit óf toestand, nooit allebei.

**REGEL.** Koper en jade staan nooit als enig onderscheid naast elkaar. Altijd met direct label of
een tussenruimte van 2px.

Sequentieel is één hue, koper, licht naar donker. Divergerend is violet tegenover jade met neutrale
ink in het midden, wat in Maculis-termen betekent: aan het worden, onzeker, bevestigd. Nooit twee
y-assen. Kleur volgt de entiteit, nooit de rangorde. Tekst draagt tekst-tokens, nooit de
reekskleur.

---

## 12. Component-DNA

**Geen gedeelde componentbibliotheek.** De Lens is één HTML-bestand zonder buildstap, de Cockpit is
vanilla ES-modules, de website is Next.js met Tailwind. Eén bibliotheek zou twee van de vier
producten tot herbouw dwingen, en dat is precies wat niet moet.

Wel gedeelde familiegelijkenis:

| Component | Familiekenmerken |
|---|---|
| **Button primair** | Pil. Warm verzadigd oppervlak, donkere tekst. Hover is een lift van 1 tot 2px, nooit een schaalsprong |
| **Button secundair** | Transparant, één hairline, dezelfde pil. Hover verandert alleen de randkleur |
| **Button tertiair** | Alleen tekst met een 1px onderlijn |
| **Card of paneel** | Eén hairline, één tonale stap, `radius.md`. Optioneel `light.edge` wanneer het paneel iets onthult |
| **Status** | Zie hoofdstuk 10 |
| **Navigation item** | Rustig in ruststand. Actief is een koperen markering aan één zijde, nooit een gevuld blok |
| **Modal** | `surface.elevated`, warme gedempte scrim `rgba(4,2,1,.62)`. Nooit puur zwart |
| **Empty state** | Ontworpen, niet leeg. Serif-regel plus één actie. Het model is "Je bent bij." |
| **Insight surface** | Serif-uitspraak leidt, bewijs eronder achter een 1px rail, bron altijd bereikbaar |
| **Collaboration surface** | Onderscheid via oppervlak, nooit via kleurcodering alleen |

**REGEL.** Geen product vindt zijn eigen kaartsysteem, statussysteem of palet uit. Een nieuw
oppervlak is een wijziging aan de grammatica, niet aan het scherm.

---

## 13. Do's en don'ts

### Altijd

* Koper reserveren voor wat aandacht verdient, en verder met rust laten.
* Gloed koppelen aan bewijs dat je kunt benoemen.
* Beweging laten afnemen naarmate iets zekerder wordt.
* Elke status een leesbaar tekstlabel geven.
* Onzekerheid kleurloos laten.
* Lege en foutstaten evenveel ontwerpaandacht geven als een reveal.
* Ruimte gebruiken naar het gewicht van de uitspraak.
* Per lichtregime opnieuw doorrekenen.

### Nooit

* Violet op de rusttoestand van een knop, link of focusring.
* Koper als categorie of als versiering.
* Gloed zonder onderliggend bewijs.
* Neutraal grijze hairlines.
* Navy als merkkleur.
* Een eigen `:root` met eigen kleuren per scherm.
* Lijnen tussen signalen op basis van afstand alleen.
* Cursorreactie in het signaalveld.
* Een oneindig lopende animatie.
* Engelse hoofdletter-statusbadges.
* Tegelwanden met weekpercentages, avatars, teamplanning.
* Koppeltekens of gedachtestreepjes als stijlmiddel in zichtbare copy (zie `CLAUDE.md`).

---

## 14. Toepassing per kamer

| | **Website** | **Lens** | **Mijn Maculis** | **Cockpit** |
|---|---|---|---|---|
| **Rol** | De voordeur. Verleiden en verwonderen | De observatieruimte. Ontdekken en verbinden | De reflectieruimte. Spiegelen en betekenis geven | De werkruimte. Concentreren en handelen |
| **Temperatuur** | Expressief, ambitieus | Onderzoekend, cinematografisch | Warm, contemplatief, traag | Functioneel, kalm onder dichtheid |
| **Lichtregime** | Nacht | Nacht, het diepst | **Dag** | Werklicht |
| **Grond** | `ink.980` | `ink.980` | `ink.50` | `ink.980` naar `ink.950` |
| **Dichtheid** | Laag | Laagst | Midden | Hoogst |
| **Magie** | Hoogst | Gericht | Rust | Laagst |
| **Typeschaal** | tot `hero` | tot `statement` | `insight` leidend | `insight` als kop, verder `body` |
| **Signal language** | Trap 1 tot 4, volledig zichtbaar | Trap 1 tot 4, één per moment, altijd met bron | Trap 4 leidt, 1 tot 3 als bewijs | Alleen trap 1 |
| **Motion** | De volle cyclus, traag, komt tot rust | Zoekt en vindt verband | Alleen ademen | Stil, behalve wat aandacht vraagt |
| **Uniek en terecht** | Webfonts, SEO, scroll-reveals, navigatie | Geen navigatie, video, grain en vignet, onderstreepte velden | Licht oppervlak, `surface.private` | Vaste pixelmaten, hoge dichtheid, snelle transities |

**Absoluut gedeeld door alle vier:** ink-familie · koper `#c8894a` · serif spreekt en sans wijst ·
`cubic-bezier(.22,.61,.36,1)` · blur naar scherp · het lichtpunt · koper ziet en violet wordt ·
beweging is onzekerheid · onzeker is kleurloos · kleur nooit als enige signaal · reduced motion
toont de eindtoestand.

---

## 15. De vijf signatures

1. **Licht ontstaat uit betekenis.** De hoeveelheid licht is een functie van het bewijs eronder.
2. **Koper ziet, violet wordt.** Waarneming tegenover betekenis in wording.
3. **Scherpstellen is het enige onthullingsgebaar.** Blur naar scherp, exclusief voorbehouden aan
   iets wat Maculis heeft gezien.
4. **Het signaalveld met vier trappen.** Signaal, relatie, patroon, inzicht.
5. **De eerlijke stilte.** Maculis kleurt niet wat het niet weet, en maakt van niets-gevonden een
   ontworpen moment.

---

## 16. Wat v1.0 niet vastlegt

**OPEN.** Deze punten zijn bewust niet beslist en mogen niet stilzwijgend worden ingevuld.

| # | Open punt | Aard |
|---|---|---|
| A | Tweede lichtregimes voor Mijn Maculis en de Cockpit | Heropenen bij signalen uit de praktijk, niet op aanname |
| B | Krijgt Mijn Maculis een eigen repository | Architectuur, niet visueel |
| C | Hernoemen van `ftrprf-labs/website` en `groeiplatform-website` | Organisatiehygiëne. Breekt remotes en deploy-hooks, apart plannen |
| D | Bestaat er een eerder "Design Constitution, 12 wetten" buiten Git | `globals.css` verwijst ernaar als bestaand. Nergens gevonden. Als er een versie is, moet die met dit document worden verzoend |
| E | De constellatie als datavisualisatie | Alleen als statisch merkbeeld op de website vastgelegd. Als datavorm nog niet ontworpen |
| F | De vijfde kamer: de persoonlijke Maculis-werkomgeving | Volgende stap, af te leiden uit exact dit DNA |

---

## 17. Hoe deze canon wijzigt

**REGEL.** Een product mag nooit zelfstandig besluiten dat zijn vondst merkbreed is.

1. Een wijziging aan laag 1 of 2 van de tokens, aan een van de vier semantische assen, of aan een
   REGEL in dit document, is een systeemwijziging.
2. Een systeemwijziging wordt hier vastgelegd voordat hij ergens wordt gebouwd.
3. Elke nieuwe of gewijzigde semantische kleur wordt per lichtregime doorgerekend voordat hij
   canon wordt.
4. Het tokenbestand draagt een versiestempel in de kop en wordt in een product **nooit met de hand
   bewerkt**.
5. Wat in een kamer werkt en breed blijkt te gelden, gaat eerst terug naar de canon en daarna pas
   naar de andere kamers.

**Waar het woont.** Dit document en het gegenereerde `maculis-tokens.css` komen in
`ftrprf-labs/ftrlabs-docs` onder `03-ux/`. De website importeert het tokenbestand. De Cockpit linkt
het als statisch bestand. De Lens houdt een gestempelde inline kopie, als bewuste uitzondering
omdat een losse stylesheet daar render-blocking zou zijn op het moment dat video start.

---

## 18. Bevestiging

Er is bij het opstellen van dit document geen productiecode aangeraakt, geen bestaande interface
gerestyled, geen token geïmplementeerd, geen repository geharmoniseerd en niets gedeployed. Het
enige uitgevoerde rekenwerk betreft contrast- en kleurenblindheidsvalidatie op losstaande
hexwaarden.

De volgende stap na goedkeuring is het harmonisatieplan, en dat begint uitdrukkelijk niet met
opnieuw bouwen.
