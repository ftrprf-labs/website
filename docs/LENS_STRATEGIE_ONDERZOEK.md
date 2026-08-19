# Lens strategie onderzoek

**Onderzoeksnotitie met hypotheses. Geen productstrategie en geen governancebesluit.**

Datum onderzoek: 2026-08-19
Status vastgesteld: 2026-08-19 door Lud
Aanleiding: de eerste volledige end to end testjourney met echte testers.

---

## STATUS EN GELDIGHEID

> **Dit document is een onderzoeksnotitie. Alles erin is een hypothese, ook waar de tekst
> stellig is geformuleerd. Er is op basis van dit document GEEN GO gegeven, niet voor een
> wijziging van de Lens strategie en niet voor Lens 2.**

Reden, en die is doorslaggevend. De actuele `ftrprf-labs/maculis-first-five.` en
`ftrprf-labs/ftrlabs-docs` zijn tijdens dit onderzoek **niet gelezen**, zie hoofdstuk 0.2. Daarmee
ontbraken precies de bronnen die nodig zijn om conclusies als "Lens 1 heeft drie beschrijvende paden
en één revealpad" en "Lens 2 wordt Verbanden" als besluit te kunnen vastleggen: de actuele
detectorinventaris, de gatelogica, de Lens 1 implementatie en de canon.

**Bestaande governance blijft onverkort gelden.**

| Regel | Status |
|---|---|
| Lens werk | **PAUSED** |
| Lens 2 | **niet bouwen** |
| Nieuwe Epic | **niet starten** |
| Detectoren toevoegen | **niet doen** |
| Gate aanpassen | **niet doen** |
| First Five aanpassen | **niet vóór echte pilot evidence en expliciete GO van Lud** |
| De twee voorstellen uit 11.1 (SILENCE anders presenteren, revealklasse per sessie vastleggen) | **niet bouwen.** Meenemen als hypotheses voor de pilotopzet |
| Never weaken a gate to avoid SILENCE. Expand evidence before lowering truth standards | **onveranderd van kracht** |

### De volgende stap is niet bouwen

Zodra repository access beschikbaar is, volgt een **tweede read only validatieronde** op de actuele
bronnen. Pas daarna kan iets uit dit document de status van besluit krijgen.

| # | Validatiestap | Raakt |
|---|---|---|
| 1 | Lees de actuele Lens 1 implementatie volledig | hoofdstuk 1 |
| 2 | Reconstrueer exact welke detectoren, evidence types en gates werkelijk actief zijn | hoofdstuk 1, 3 |
| 3 | Lees de actuele canon en alle relevante Lens governance | hele document |
| 4 | Leg de werkelijke Lens 1 architectuur naast de hypothese uit dit onderzoek | hoofdstuk 1 |
| 5 | Beoordeel opnieuw of bewijsafstand inderdaad de beperkende factor is | H-1, hoofdstuk 1.3 |
| 6 | Toets de twaalf voorbeelden tegen de bestaande truth standards en bewijsregels | hoofdstuk 4 |
| 7 | Herbeoordeel pas daarna de bake off tussen Reputation, Finance, Dependency en Verbanden | hoofdstuk 6, 7, 8 |

### H-1 · De open onderzoeksvraag die bewaard blijft

> **Is de revealkracht van Maculis sterker afhankelijk van de afstand tussen onafhankelijke
> bewijsbronnen dan van de analysediepte binnen één bron?**

Dit is de vraag die uit dit onderzoek behouden blijft. Hij is **expliciet nog geen principe.**

Voorwaarde om H-1 tot Maculis principe te verklaren, en beide moeten waar zijn:

1. de **actuele implementatie** ondersteunt hem, vastgesteld in de validatieronde hierboven;
2. **echte pilotdata** ondersteunen hem.

Zolang aan één van beide niet is voldaan, blijft H-1 een hypothese en mag er niets op gebouwd worden.

Hoofdstuk 1.3 is de argumentatie ónder H-1, niet het bewijs ervóór.

---

## 0. Verantwoording van het bewijs onder dit rapport

Dit rapport doet uitspraken over een systeem dat grotendeels in een andere repository staat. Om te
voorkomen dat aannames als feiten gaan meelopen, staat hier eerst wat wel en niet is geverifieerd.

### 0.1 Wat is geverifieerd, en waar

Alles hieronder is gelezen in `ftrprf-labs/website` (deze repository).

| Feit | Vindplaats |
|---|---|
| Lens 1 leeft in `maculis-first-five./public/index.html`, stages `encounter → ask → looking → outcome` | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0.md:122`, `..._HERZIEN.md:45` |
| De uitkomstoppervlakken zijn **First Impression**, **Story of the Site**, **Technical Signals** | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0.md:122` |
| De uitkomsten zijn **REVEAL**, **SILENCE** en **failure**, en bij SILENCE worden de drie panelen uitgeklapt getoond | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0.md:650` |
| In de generieke variant typt de bezoeker zelf een URL in `#stage-ask` | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0.md:142` |
| Benoemde motorcomponenten: Reveal Engine, Reveal Gate, zakelijke thermometer, technische website-thermometer, GrowBrain | `docs/BUILD_LOG.md:134-137` |
| **Pilotbevinding Lens 1:** bij een website zonder Reveal komt te weinig van de andere lagen terug. SILENCE bij Reveal is niet SILENCE van de journey. De Reveal Gate wordt niet verlaagd | `docs/BUILD_LOG.md:148-151` |
| Maculis ontvangt per deelnemer **uitsluitend** `first_name`, `last_name`, `company_name`, `domain` | `server/maculis-sync.mjs:17-28`, `README.md` |
| De in-journey evaluatie meet letterlijk drie dingen: `recognition` "Herken je dit?", `accuracy` "Klopt dit volgens jou?", `novelty` "Had je dit zelf al zo gezien?" plus twee vrije contextvelden | `server/maculis-sessions.mjs:16-34` |
| Na Lens 1 volgt: welcome, recognition, continuation, account, evaluatie-intro, Pass the Lens, closing | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0.md:651` |
| Pass the Lens draait in productie en is functioneel geaccepteerd | `docs/BUILD_LOG.md:218-263` |
| Canonregel: **licht volgt bewijsdichtheid**, en de straal van `light.core` is een functie van het aantal **onafhankelijke** signalen | `docs/PRE_IMPLEMENTATION_GATE.md:183`, `..._HERZIEN.md:182` |
| Canonregel: **beweging is onzekerheid, stilte is inzicht** | `docs/HARMONISATIEPLAN_VISUAL_DNA_V1.0_HERZIEN.md:187` |
| Reveal en Technical Signals zijn nog niet aan een relatie gekoppeld in de Cockpit | `public/workspace.js:151` |

### 0.2 Wat NIET is geverifieerd

Toegang tot `ftrprf-labs/maculis-first-five.` en `ftrprf-labs/ftrlabs-docs` was in deze sessie
geblokkeerd. Daarom is **niet** gelezen:

* de daadwerkelijke detectorinventaris van de Reveal Engine;
* de exacte drempelwaarden en de logica van de Reveal Gate;
* de precieze copy van de reveals;
* het eerdere Lens bake off document en de volledige First Five bevindingen;
* de Product Bible.

**Consequentie.** Overal waar dit rapport spreekt over "wat Lens 1 vandaag onderzoekt", is dat een
reconstructie op basis van de bovenstaande geverifieerde feiten, niet een inventarisatie van de
detectoren. De structurele diagnose in hoofdstuk 1 hangt daar bewust niet van af: hij volgt uit de
**bewijstopologie**, en die is wel volledig geverifieerd, namelijk één domein als enige invoer. Waar
detectorkennis wel nodig zou zijn, staat dat er expliciet bij als **te verifiëren**.

Er is in dit rapport geen enkele capability als bestaand gepresenteerd die niet in de tabel van 0.1
staat.

---

## 1. De huidige kracht en zwakte van Lens 1

### 1.1 Wat Lens 1 vandaag feitelijk is

Lens 1 krijgt één ding binnen: een domein. Daaromheen kent hij een voornaam en een bedrijfsnaam,
puur om de opening persoonlijk te maken. Dat is de volledige invoer. Alles wat Lens 1 daarna weet,
heeft hij zelf uit dat ene domein gehaald.

Hij levert vier dingen op:

1. **First Impression.** Wat een bezoeker in de eerste seconden waarneemt.
2. **Story of the Site.** Het verhaal dat de site over de organisatie vertelt.
3. **Technical Signals.** De technische werkelijkheid onder de site.
4. **De Reveal.** Voorwaardelijk. Als de Reveal Gate niet gehaald wordt: SILENCE.

Dat is een goed doordacht geheel. Het is bovendien de rijkste en meest consistente kamer van het
hele merk, en de facto de bron van de visuele taal. Daar is geen twijfel over.

### 1.2 De ladder: waar eindigt Lens 1 werkelijk

De gevraagde ladder, toegepast op de vier oppervlakken:

| Niveau | Wat de ondernemer denkt | First Impression | Story of the Site | Technical Signals | Reveal |
|---|---|---|---|---|---|
| 1 · observatie | "Maculis ziet iets" | ✓ altijd | ✓ altijd | ✓ altijd | ✓ |
| 2 · herkenning | "Ja, dat klopt" | ✓ sterk | ✓ sterk | ✓ | ✓ |
| 3 · betekenis | "Dat heeft blijkbaar een gevolg" | ≈ soms | ≈ soms | ≈ zwak, want technisch | ✓ |
| 4 · reveal | "Dat verband had ik zelf niet gezien" | ✗ | ✗ | ✗ | ✓ **alleen hier** |
| 5 · nieuwsgierigheid | "Wat ziet Maculis nog meer?" | ✗ | ✗ | ✗ | ✓ afgeleid |
| 6 · handelingswaarde | "Hier wil ik iets mee" | ✗ | ✗ | ≈ losse tips | ≈ |

**De conclusie is structureel en niet cosmetisch: Lens 1 heeft drie herkenningspaden en één
revealpad.** Drie van de vier oppervlakken kunnen per definitie niet hoger komen dan niveau 2 of 3,
want ze beschrijven. Alleen de Reveal verbindt. En juist die ene is voorwaardelijk.

Daaruit volgt waar Lens 1 vandaag meestal eindigt: **tussen niveau 2 en 3.** Een goed geproduceerde
herkenningservaring, met een revealervaring als bonus. Dat is precies omgekeerd aan wat de eerste
kennismaking met Maculis zou moeten zijn.

De reeds vastgelegde pilotbevinding zegt hetzelfde in andere woorden: bij een website zonder Reveal
komt te weinig van de andere lagen terug. Vertaald: als de bonus wegvalt, blijft er beschrijving
over, en beschrijving is geen Maculis.

### 1.3 De werkelijke oorzaak: bewijsafstand, niet analysediepte

Dit is de kern van het hele rapport.

Een reveal is geen functie van hoe diep je analyseert. Een reveal is een functie van **hoe ver het
bewijs van de ondernemer af staat.**

* Twee observaties uit **dezelfde bron, op hetzelfde moment, door de ondernemer zelf gemaakt** kunnen
  bijna nooit iets onthullen. Hij heeft die bron vaker bekeken dan wie ook.
* Twee observaties uit **verschillende bronnen**, waarvan er minstens één buiten zijn dagelijkse
  blikveld ligt, kunnen dat wel.

Lens 1 leest vandaag één bron: de website. En die website is uitgerekend het artefact dat de
ondernemer van alles wat hij bezit het vaakst heeft bekeken. Vragen wat hij op zijn eigen homepage
niet gezien heeft, is het moeilijkst denkbare startpunt voor verrassing.

**Dat is geen tekortkoming van de Reveal Engine. Het is een eigenschap van de bewijsbasis.** De
Reveal Gate doet exact wat hij moet doen. Hij krijgt alleen te weinig onafhankelijk bewijs
aangeboden om vaak te kunnen vuren.

De canon zegt dit trouwens zelf al, in de vormtaal: de straal van `light.core` is een functie van het
aantal **onafhankelijke** signalen, en licht volgt bewijsdichtheid. De visuele grammatica anticipeert
op bewijsuitbreiding. De bewijsbasis is er alleen nog niet.

### 1.4 De tweede zwakte: SILENCE wordt vandaag verontschuldigend gepresenteerd

Geverifieerd: bij SILENCE worden First Impression, Story of the Site en Technical Signals uitgeklapt
getoond. Functioneel is dat begrijpelijk, er moet iets staan. Maar in betekenis is het een
troostprijs, en een troostprijs vertelt de ondernemer precies het verkeerde: dat Maculis eigenlijk
een analysetool is die deze keer niet zo goed uit de verf kwam.

Canon: **stilte is inzicht.** Vandaag is stilte een gebrek aan inzicht dat met panelen wordt
opgevuld. Dat is een presentatieprobleem, geen gateprobleem, en het is goedkoop op te lossen. Zie
hoofdstuk 11.

### 1.5 De derde zwakte: de meting kan de diagnose nog niet dragen

De evaluatie meet exact de goede dingen: herkenning, juistheid en nieuwheid. Dat is sterk, en het is
precies de ladder uit de opdracht, geoperationaliseerd.

Maar er is één gat. Zolang per sessie niet wordt vastgelegd **welke soort reveal** is getoond, kan
`novelty = nieuw` niet worden teruggerekend naar een revealtype. Dan levert de pilot wel een
gemiddelde op, maar geen bruikbare richting. Zie hoofdstuk 11, dit is de belangrijkste
instrumentatievraag vóór de pilot.

*Te verifiëren in `maculis-first-five.`: stempelt de journey vandaag al een revealklasse in de
sessie? Zo ja, dan is het enige werk dat de export hem meegeeft.*

### 1.6 Het expliciete oordeel, als hypothese

De opdracht vroeg hier niet om diplomatie, dus het oordeel staat er scherp. Het is wel een
**hypothese**, want het rust op de bewijstopologie en niet op de gelezen detectorinventaris.
Validatiestap 1, 2 en 4 kunnen het weerleggen.

> **HYPOTHESE.** Lens 1 is sterk genoeg om een pilot te dragen. Hij is nog niet sterk genoeg om de
> eerste betaalwaardige Maculis ervaring te dragen.

Onderbouwing in één alinea. De ervaring is vakkundig, de vormtaal is af, de evaluatie meet het
juiste, en de Reveal Gate is principieel correct. Maar de kans dat een willekeurige ondernemer uit
deze ervaring komt met "dit had ik zelf niet gezien" hangt aan één voorwaardelijk revealpad boven één
bron die hij zelf beheert en het beste kent. Dat is te smal om geld voor te vragen, en het is te smal
om de zin "als Maculis dit nu al ziet, wil ik weten wat het nog meer ziet" betrouwbaar op te wekken.

**En daaruit volgt de belangrijkste negatieve aanbeveling van dit rapport: bouw geen Lens 2 om dit te
compenseren.** Een tweede Lens op een even dunne bewijsbasis verdubbelt het oppervlak en halveert de
aandacht. De oplossing zit in bewijs, niet in een tweede onderwerp.

---

## 2. De natuurlijke grens en de kernvraag van Lens 1

### 2.1 De kernvraag in één menselijke zin

Voorgestelde formulering, nog niet vastgesteld. De canon is niet gelezen, dus het is mogelijk dat
Lens 1 daar al een kernvraag heeft. Validatiestap 3 gaat daarover, en de canon wint.

> **VOORSTEL.** "Laat je van buiten het bedrijf zien dat je inmiddels bent?"

Drie dingen zitten er bewust in.

* **"van buiten"** zet de blik van de ondernemer af en die van een onbekende aan.
* **"inmiddels"** brengt de tijd binnen. Dat is geen stijl, het is de belangrijkste
  bewijsuitbreiding van hoofdstuk 3.
* **"het bedrijf dat je bent"** maakt het een identiteitsvraag en geen kwaliteitsoordeel. Maculis
  zegt niet dat je site slecht is. Maculis zegt dat hij iemand anders beschrijft dan jij.

### 2.2 De grensregel die voorkomt dat Lens 1 alles wordt

Eén regel, in twee delen, en beide moeten waar zijn:

> **Lens 1 gebruikt uitsluitend bewijs dat de organisatie zelf heeft geschreven, en uitsluitend over
> de manier waarop zij zichzelf presenteert.**

Deel één sluit iedereen buiten die niet de organisatie is. Deel twee sluit onderwerpen buiten die de
organisatie wel zelf publiceert maar die geen presentatiehandeling zijn.

Daarmee is de grens hard en toetsbaar:

| Bewijs | Zelf geschreven? | Over zelfpresentatie? | Lens 1? |
|---|---|---|---|
| Alle pagina's van de eigen site, nu | ja | ja | **binnen** |
| Alle pagina's van de eigen site, in het verleden | ja | ja | **binnen** |
| Eigen vacatureteksten | ja | ja | **binnen** |
| Eigen structured data en OpenGraph | ja | ja | **binnen** |
| Eigen DNS, mail en certificaatconfiguratie | ja, of namens haar | ja, het is publieke infrastructuur onder de naam | **binnen** |
| Eigen bedrijfsvermelding, ingevuld door de organisatie | ja | ja | **binnen** |
| Inschrijving in het handelsregister, op organisatieniveau | ja | ja | **binnen** |
| Reviews en beoordelingen | nee | ja | **buiten**, dit is Lens 2 gebied |
| Vermelding op de site van een derde | nee | ja | **buiten** |
| Gedeponeerde jaarrekening | ja | **nee**, dit gaat over geld | **buiten** |
| Verkeer, conversie, omzet | ja | nee | **buiten**, en bovendien niet passief waarneembaar |
| Concurrenten en markt | nee | nee | **buiten** |

En de negatieve regel die de grens bewaakt:

> **Lens 1 heeft nooit een tweede auteur nodig. Zodra een uitspraak alleen waar kan zijn omdat iemand
> anders iets heeft geschreven, hoort die uitspraak niet meer in Lens 1.**

Dat is precies het scharnier naar Lens 2 in hoofdstuk 6.

### 2.3 Wat vandaag in Lens 1 zit en er strikt genomen niet thuishoort

**Technical Signals als zelfstandig oppervlak.** Een technische thermometer beantwoordt de vraag
"werkt je site goed", niet de vraag "laat je zien wie je bent". Los getoond is het een gratis
sitecheck, en dat is precies het genre waar Maculis niet in wil zitten.

Het advies is niet om Technical Signals te verwijderen. Het advies is om het **van eerste bewijs naar
tweede bewijs te verplaatsen.** Technische signalen zijn zwak als observatie en sterk als
bevestiging. "Je belofte is veranderd" wordt aanzienlijk sterker als de technische sporen laten zien
dat er sindsdien niets meer is aangeraakt. Zie voorbeeld V4 en V11 in hoofdstuk 4.

---

## 3. Hoe Lens 1 inhoudelijk rijker wordt zonder de gate te verlagen

### 3.1 Het onderscheid, hard gemaakt

Deze twee dingen lijken op elkaar en zijn tegengesteld.

| | Bewijs uitbreiden | Gate verlagen |
|---|---|---|
| Wat verandert | het aantal onafhankelijke bronnen per claim | wat één bron mag beweren |
| Effect op zekerheid | **omhoog** | omlaag |
| Effect op aantal reveals | omhoog, want meer claims halen de bestaande lat | omhoog, want de lat zakt |
| Effect op SILENCE | kan tijdelijk **stijgen**, want nieuwe bronnen kunnen bestaande claims tegenspreken | daalt |
| Toegestaan | **ja** | **nee** |

Het diagnostische kenmerk: bewijsuitbreiding maakt een claim die je vandaag toont **beter
onderbouwd**. Gateverlaging maakt een claim die je vandaag níet toont plotseling toonbaar zonder dat
er bewijs bij is gekomen. Als een voorstel het aantal reveals verhoogt zonder dat er een bron bij is
gekomen, is het gateverlaging, hoe het ook heet.

### 3.2 De valkuil: schijnonafhankelijkheid

Dit is de manier waarop bewijsuitbreiding ongemerkt gateverlaging wordt, en hij verdient een naam.

Twee pagina's op hetzelfde domein, gepubliceerd door hetzelfde CMS, geschreven in dezelfde week, door
dezelfde persoon, zijn **niet twee onafhankelijke bronnen.** Ze zijn één bron, twee keer geteld. Wie
zo telt, verhoogt de bewijsdichtheid op papier en niet in werkelijkheid, en haalt daarmee de gate
zonder de gate te raken. Dat is de gevaarlijkste variant, want hij ziet er in de code uit als
bewijsuitbreiding.

Werkbare definitie:

> **Twee bewijzen zijn onafhankelijk wanneer ze verschillen in auteurmoment of in uitgever.**

Twee versies van dezelfde pagina op twee data zijn onafhankelijk, want het auteurmoment verschilt.
Een vacaturetekst en een homepage zijn meestal onafhankelijk, want auteur en moment verschillen. Twee
dienstpagina's uit dezelfde websitelevering zijn dat niet.

### 3.3 De drie assen van bewijsafstand

Bewijsuitbreiding binnen Lens 1 gaat niet over meer detectoren op dezelfde pagina. Ze gaat over
**dezelfde auteur op een ander oppervlak of op een ander moment.** Drie assen, oplopend in kracht.

**As 1 · Over het oppervlak.** Pagina A tegenover pagina B. Zwakste as. Vaak schijnonafhankelijk, en
dit is bovendien het gebied dat de ondernemer het beste kent. Vandaag is dit vrijwel de enige as die
Lens 1 heeft.

**As 2 · Over de kanalen die de organisatie zelf ook vult.** Site tegenover vacaturetekst, tegenover
structured data, tegenover de eigen bedrijfsvermelding, tegenover de inschrijving in het
handelsregister. Deze teksten zijn bijna nooit door dezelfde persoon op hetzelfde moment geschreven
en worden nooit naast elkaar gelegd. Sterk.

**As 3 · Over de tijd.** De site van nu tegenover de site van twee jaar geleden, via publieke
gedateerde archieven. Sterkste as, en om drie redenen tegelijk:

* **Niemand herleest zijn eigen oude site.** Verandering is van binnenuit onzichtbaar, want ze is
  geleidelijk en per stap bewust geweest.
* **Weglating is de meest onzichtbare gebeurtenis die er is.** Je merkt wat je toevoegt. Je merkt
  nooit wat je gestopt bent te onderhouden.
* **Datering is hard bewijs.** Een gedateerde snapshot is een van de betrouwbaarste bronnen die er
  überhaupt bestaan, en ze verhoogt de bewijskracht in plaats van haar te verlagen.

As 3 is bovendien uniek voor Maculis. Een consultant doet dit niet, analytics kan het niet, en een
taalmodel dat naar je site kijkt ziet alleen vandaag.

### 3.4 Beoordeling van de aangeboden bronnenlijst

De opdracht vraagt de aangeboden lijst niet automatisch over te nemen. Hieronder het eigen oordeel op
vier criteria: betrouwbaar, legaal en verantwoord, structureel beschikbaar, en levert het werkelijk
nieuwe relaties op.

**Overnemen, hoge prioriteit**

| Bron | Betrouwbaar | Legaal | Beschikbaar | Nieuwe relaties | Oordeel |
|---|---|---|---|---|---|
| Eigen site, alle pagina's | hoog | ja | hoog | matig | binnen. Verbreedt as 1 |
| Eigen site over de tijd, publiek archief | **zeer hoog**, gedateerd | ja, mits de voorwaarden van het archief worden gerespecteerd | goed voor gevestigde sites, zwak voor jonge | **hoog** | **eerste keuze.** Beste verhouding tussen waarde en inspanning |
| DNS, MX, SPF, DMARC, certificaat | **zeer hoog**, machinaal verifieerbaar | ja, publiek | zeer hoog | matig tot hoog | binnen. Zeer goedkoop |
| Structured data, schema.org, OpenGraph | zeer hoog | ja | matig | **hoog**, dit is de machineleesbare zelfbeschrijving | binnen |
| Sitemap, publicatiedata, versheid per sectie | hoog | ja | hoog | **hoog**, onderhoudsgedrag per deel van de organisatie | binnen. Onderschat |
| Contactroutes en klantreis op de eigen site | hoog | ja | hoog | matig tot hoog | binnen |
| Eigen vacatureteksten | hoog | ja, publiek | **wisselend**, alleen bij werving | **hoog** | binnen, maar opportunistisch. Afwezigheid bewijst niets |
| Handelsregister, **organisatieniveau** | zeer hoog | **te toetsen**, hergebruik kent voorwaarden | hoog | hoog | binnen, met een expliciete licentiecheck vooraf |
| Eigen bedrijfsvermelding, door de organisatie ingevuld | matig tot hoog | **te toetsen**, API voorwaarden en cachebeperkingen | hoog | hoog | binnen, met licentiecheck |
| Eigen sociale kanalen, alleen metadata | matig | wisselt per platform | wisselend | hoog, "laatste bericht veertien maanden geleden" is sterk bewijs | binnen waar een officiële route bestaat, anders buiten |

**Niet overnemen, met reden**

| Bron | Waarom niet |
|---|---|
| **Persoonsgegevens van medewerkers, en professionele netwerkprofielen** | Geautomatiseerd verzamelen is in strijd met de voorwaarden van de dominante platforms, en het is bewijs op persoonsniveau. Dat is een AVG risico dat niet in verhouding staat tot de opbrengst. Dit is de bron die iedereen wil en het is de bron die het snelst schade oplevert. **Buiten, ook later.** |
| **Reviews en beoordelingen** | Twee redenen. Inhoudelijk hoort het bij de vraag "wat vinden anderen", en die vraag is Lens 2. En praktisch: geautomatiseerd ophalen botst met de voorwaarden van de grote platforms. **Buiten Lens 1.** |
| **Concurrentie en marktvergelijking** | Een verdedigbare vergelijkingsgroep is passief niet betrouwbaar vast te stellen. Eén verkeerd gekozen concurrent vernietigt het vertrouwen in de hele reveal onmiddellijk. **Buiten, ook later, tenzij de ondernemer de groep zelf aanwijst.** |
| **Alles waarvoor de ondernemer een account moet koppelen** | Breekt de belofte dat Maculis zelfstandig kijkt. Voor de eerste ervaring is dat de kern van de magie. **Buiten voor de eerste ervaring.** |
| **Gedeponeerde jaarrekening** | Betrouwbaar en publiek, maar het is geen presentatiehandeling. Het valt buiten de kernvraag van Lens 1. Zie hoofdstuk 6 en 8. |

### 3.5 Hypothese: een getrapte gate in plaats van één gate

> **De gate wordt niet aangepast.** Dit is een denkmodel, geen voorstel dat klaarligt om gebouwd te
> worden. De actuele gatelogica is niet gelezen, dus het is goed mogelijk dat de bestaande gate al
> getrapt is of om goede redenen bewust niet. Validatiestap 2 en 6 gaan hierover.

Als denkmodel is dit nadrukkelijk **geen verlaging.** Het zou een verfijning zijn die op sommige
claimsoorten juist strenger is dan vandaag.

| Niveau | Bewijs | Wat Maculis dan mag doen |
|---|---|---|
| **E1** | één bron, één moment | **alleen beschrijven.** Nooit een gevolg trekken |
| **E2** | twee onafhankelijke bronnen, of één bron op twee gedateerde momenten | een **verband** benoemen |
| **E3** | twee onafhankelijke bronnen plus een gedateerde verandering plus een waarneembaar gevolg | een **reveal** tonen |
| **E4** | raakt een persoon, geld, of impliceert een verwijt | E3, plus geen namen, plus geformuleerd als waarneming van buiten. Bij twijfel **SILENCE** |

Twee regels die hierbij horen en die zelfstandig gelden:

> **Maculis benoemt het patroon, nooit de verklaring.** Dat drie actualiteitssignalen in hetzelfde
> kwartaal stilvallen is bewijs. Waaróm is dat niet, en het is precies waar een systeem in de
> verleiding komt om in te vullen.

> **Afwezigheid is de moeilijkste bewijssoort.** "Dit staat nergens" mag alleen als er genoeg
> plaatsen zijn gecontroleerd om afwezigheid betekenis te geven. Bij een organisatie met alleen een
> website is dat vrijwel nooit het geval, en dan is het antwoord SILENCE.

---

## 4. Twaalf voorbeelden: evidence, verband, reveal

Elk voorbeeld staat in de gevraagde vorm. De laatste regel is telkens de vereiste bewijskracht
volgens de tabel in 3.5. Voorbeeld V7 is bewust opgenomen als een voorbeeld dat **afvalt**, omdat de
opdracht vraagt zwakke observaties niet te promoveren.

De revealteksten zijn geschreven als publieksgerichte copy en volgen de permanente schrijfregel.

---

### V1 · De belofte is meegegroeid, het bewijs eronder niet

**EVIDENCE A** De belofte op de homepage noemt vandaag een breder werkgebied dan twee jaar geleden,
aantoonbaar via twee gedateerde archiefmomenten.
**EVIDENCE B** De sectie die die belofte moet staven, cases, referenties of portfolio, is sinds die
verandering niet meer gewijzigd.

**→ VERBAND** De claim is verbreed. De onderbouwing onder de claim is achtergebleven.

**→ MOGELIJKE REVEAL**
"Je belofte is in twee jaar breder geworden. Het bewijs eronder is dat niet. Wie je vandaag voor het
eerst leest, ziet een groter bedrijf dan je kunt aantonen."

**→ WAAROM DIT NIEUW KAN ZIJN** De ondernemer heeft de belofte bewust veranderd. Hij heeft de cases
nooit bewust níet veranderd. Weglating is voor de auteur onzichtbaar.

**→ BEWIJSDREMPEL** E3. Twee gedateerde archiefpunten voor de belofteverandering, plus aantoonbare
non-wijziging van de bewijssectie over dezelfde periode. Zonder betrouwbare datering: SILENCE.

---

### V2 · De vacature beschrijft een ander bedrijf dan de homepage

**EVIDENCE A** De positionering op de homepage: voor wie, welk type werk.
**EVIDENCE B** De eigen vacaturetekst beschrijft dagelijkse werkzaamheden en klanttypes die daar niet
mee overeenkomen.

**→ VERBAND** Het interne zelfbeeld, geschreven voor mensen die het werk echt gaan doen, tegenover
het externe zelfbeeld, geschreven voor mensen die moeten kopen.

**→ MOGELIJKE REVEAL**
"Je vacature is eerlijker over wat je doet dan je homepage. De mensen die je zoekt lezen iets anders
dan de klanten die je zoekt."

**→ WAAROM DIT NIEUW KAN ZIJN** Deze twee teksten zijn bijna nooit door dezelfde persoon op hetzelfde
moment geschreven, en ze worden nooit naast elkaar gelegd.

**→ BEWIJSDREMPEL** E3, en uitsluitend op concrete overlappende dimensies: type klant, type werk,
sector, schaal. **Nooit op toon of sfeer.** Toon is interpretatie en geen bewijs.

---

### V3 · Voor mensen landelijk, voor machines lokaal

**EVIDENCE A** De copy claimt landelijk bereik.
**EVIDENCE B** De structured data beschrijft één lokale vestiging, de eigen bedrijfsvermelding kent
één adres en één categorie, en het handelsregister kent één vestiging.

**→ VERBAND** De machineleesbare zelfbeschrijving en de menselijke claim spreken elkaar tegen.

**→ MOGELIJKE REVEAL**
"Voor een mens claim je heel Nederland. Voor elke machine die je leest ben je één lokaal bedrijf."

**→ WAAROM DIT NIEUW KAN ZIJN** Structured data is vrijwel altijd door de bouwer gezet en nooit door
de ondernemer gelezen. Het is letterlijk een zelfbeschrijving die hij nooit heeft gezien.

**→ BEWIJSDREMPEL** E2 voor de constatering. **E3 voor elke gevolgtrekking over vindbaarheid**, want
zonder derde bron is dat een aanname en geen waarneming.

---

### V4 · Het onderhoud is verschoven van de kern naar de rand

**EVIDENCE A** Certificaat, hosting en sitemapdata laten zien wanneer welk deel van de site voor het
laatst technisch en inhoudelijk is aangeraakt.
**EVIDENCE B** Het archief laat zien dat de kernpagina's, waar iemand beslist, al maanden ongewijzigd
zijn, terwijl de nieuws of blogsectie nog wel doorloopt.

**→ VERBAND** Er wordt nog gepubliceerd, maar niet meer op de plek waar de beslissing valt.

**→ MOGELIJKE REVEAL**
"Je publiceert nog steeds. Alleen niet meer op de pagina's waar iemand beslist. Je nieuwste tekst
staat op je minst bezochte pagina."

**→ WAAROM DIT NIEUW KAN ZIJN** Publiceren vóélt als onderhoud. De verschuiving van wáár je
publiceert is van binnenuit niet waarneembaar.

**→ BEWIJSDREMPEL** E3, met gedateerde bronnen aan beide kanten. "Je site is verouderd" is E1 en mag
dus alleen beschrijvend voorkomen, nooit als oordeel.

---

### V5 · De tekst begint een gesprek, het formulier vraagt een besluit

**EVIDENCE A** Het taalregister en de belofte richten zich op oriëntatie, of juist op een
gekwalificeerde koper.
**EVIDENCE B** De enige contactroute doet het omgekeerde: een offerteaanvraag van twaalf velden bij
een oriënterende belofte, of een volledig ongekwalificeerd algemeen formulier bij een specialistische
belofte.

**→ VERBAND** De belofte en de route naar binnen vragen om een ander stadium van de klantreis.

**→ MOGELIJKE REVEAL**
"Je tekst begint een gesprek. Je formulier vraagt om een besluit. Daartussen valt precies de bezoeker
weg die je zoekt."

**→ WAAROM DIT NIEUW KAN ZIJN** Tekst en formulier zijn zelden samen ontworpen. Het formulier is
bijna altijd ouder dan de tekst.

**→ BEWIJSDREMPEL** E2 minimaal, en te formuleren als **spanning**, nooit als verklaring van
conversieverlies. Maculis kan geen conversie waarnemen en mag dat dus niet suggereren.

---

### V6 · Drie zelfbeschrijvingen, drie antwoorden

**EVIDENCE A** De expliciete specialisatieclaim in de positionering.
**EVIDENCE B** De verdeling van diensten, cases en paginagewicht over de site wijst overwegend op
iets anders.
**EVIDENCE C** De hoofdactiviteit in het handelsregister wijst op een derde ding.

**→ VERBAND** Drie zelfbeschrijvingen van dezelfde organisatie, drie verschillende antwoorden.

**→ MOGELIJKE REVEAL**
"Je noemt jezelf het één, je site bewijst het ander, en formeel sta je als iets derds ingeschreven.
Wie je onderzoekt vindt drie bedrijven."

**→ WAAROM DIT NIEUW KAN ZIJN** De activiteit in het handelsregister wordt bij oprichting één keer
gekozen en daarna nooit meer bekeken.

**→ BEWIJSDREMPEL** E3. De registerobservatie mag **nooit als fout** worden gepresenteerd, alleen als
derde zelfbeschrijving. De inschrijving is administratief en niet strategisch, en Maculis moet dat
verschil respecteren.

---

### V7 · Meer vestigingen dan de site toont. **Dit voorbeeld valt af, en dat is het punt**

**EVIDENCE A** Het handelsregister kent meerdere vestigingen of handelsnamen.
**EVIDENCE B** De website noemt er één.

**→ VERBAND** Het publieke bedrijf is smaller dan het geregistreerde bedrijf.

**→ OORDEEL: dit mag in deze richting niet getoond worden.** Het bewijs is hard, maar de observatie
is bijna altijd een **bewuste keuze** van de ondernemer. Een reveal die vertelt wat iemand zelf heeft
besloten, is geen reveal maar een echo, en hij beschadigt het vertrouwen in alle andere reveals.

**→ De omgekeerde richting mag wél:** de site toont een vestiging, een handelsnaam of een
dienstverband dat formeel niet meer bestaat. Dat is een fout in plaats van een keuze, niemand ziet
hem, en hij is direct te herstellen.

**→ BEWIJSDREMPEL** E2 voor de omgekeerde richting. Voor de oorspronkelijke richting: **SILENCE**,
ongeacht hoe hard het bewijs is. Bewijskracht is een noodzakelijke en geen voldoende voorwaarde.

---

### V8 · De mailinfrastructuur vertelt een andere professionaliteitsklasse dan de site

**EVIDENCE A** De DNS records laten een ontbrekende of niet afdwingende mailauthenticatie zien, of
een mailplatform dat niet past bij de gepresenteerde schaal.
**EVIDENCE B** De site presenteert een organisatie die met vertrouwelijke klantinformatie werkt of
die zich op zorgvuldigheid beroept.

**→ VERBAND** De gepresenteerde betrouwbaarheid en de feitelijk ingerichte betrouwbaarheid lopen
uiteen, op precies het kanaal waar het contact plaatsvindt.

**→ MOGELIJKE REVEAL**
"Iedereen kan vandaag e-mail versturen die van jouw domein lijkt te komen. Voor een bedrijf dat
zorgvuldigheid belooft is dat het eerste wat een kritische klant controleert."

**→ WAAROM DIT NIEUW KAN ZIJN** DNS is voor de eigenaar volledig onzichtbaar. Het is bijna altijd
door de bouwer of de provider ingericht en daarna nooit meer bekeken.

**→ BEWIJSDREMPEL** E2, want DNS is een harde, publieke, machinaal verifieerbare bron. **Maar** het
mag alleen getoond worden in combinatie met de belofte uit EVIDENCE B. Los is dit een technische tip
en geen Maculis reveal, en het hoort dan niet in Lens 1 thuis.

---

### V9 · Het woord waarmee je jezelf uitlegt bestaat alleen op je eigen site

**EVIDENCE A** De kernbegrippen op de homepage zijn intern jargon of een eigen methodenaam, en de
sector of het probleem wordt nergens benoemd in woorden die een onbekende zou gebruiken.
**EVIDENCE B** Diezelfde methodenaam komt op geen enkele andere door de organisatie zelf beheerde
bron voor: niet in de vacature, niet in de structured data, niet in de eigen bedrijfsvermelding.

**→ VERBAND** De belangrijkste term van het bedrijf bestaat alleen op één pagina.

**→ MOGELIJKE REVEAL**
"Het woord waarmee jij je bedrijf uitlegt, bestaat alleen op je eigen homepage. Buiten die pagina
heeft niemand er iets aan."

**→ WAAROM DIT NIEUW KAN ZIJN** Eigen taal voelt nooit als jargon. Dit is een van de weinige dingen
die letterlijk onmogelijk van binnenuit waar te nemen zijn.

**→ BEWIJSDREMPEL** E3, en dit is een **afwezigheidsclaim**, dus de zwaarste soort. Alleen toegestaan
als er voldoende eigen bronnen zijn gecontroleerd om afwezigheid betekenis te geven. Bij een
organisatie met alleen een website: SILENCE.

---

### V10 · Je nieuwste dienst is je slechtst gepositioneerde

**EVIDENCE A** De dienst die volgens het archief het laatst is toegevoegd, staat het diepst in de
structuur en ontbreekt in de hoofdnavigatie.
**EVIDENCE B** De oudste dienst staat nog steeds bovenaan en heeft de meeste interne verwijzingen,
terwijl de belofte op de homepage of de vacature juist de nieuwe richting benoemt.

**→ VERBAND** De sitestructuur weerspiegelt de volgorde van ontstaan en niet de huidige prioriteit.

**→ MOGELIJKE REVEAL**
"Je site is gerangschikt op de volgorde waarin je dingen bent gaan doen, niet op wat je nu wilt
verkopen."

**→ WAAROM DIT NIEUW KAN ZIJN** Structuur groeit aan. Aangroei gebeurt in stappen die elk logisch
waren, en het resultaat heeft niemand ooit als geheel besloten.

**→ BEWIJSDREMPEL** E2 voor de structuurobservatie. **E3** om het als prioriteitsconflict te
benoemen, want daarvoor is een expliciete claim elders nodig dat de nieuwe dienst de belangrijke is.

---

### V11 · De stilte begint op een datum, en op die datum veranderde er iets

**EVIDENCE A** Meerdere onafhankelijke actualiteitssignalen, laatste artikel, laatste case, laatste
vacature, laatste wijziging aan de teampagina, laatste eigen bericht, clusteren in hetzelfde
kwartaal.
**EVIDENCE B** Rond datzelfde moment veranderde er volgens het archief iets structureels: de
navigatie, de belofte, of een verwijderde dienst.

**→ VERBAND** Niet "de site is oud", maar "er is één moment waarop het stil werd, en dat moment valt
samen met een verandering".

**→ MOGELIJKE REVEAL**
"Je site is niet geleidelijk verouderd. Er is één kwartaal waarin het stil werd, en sindsdien is er
bijna niets meer bijgewerkt."

**→ WAAROM DIT NIEUW KAN ZIJN** Van binnenuit is dit "we hadden het druk", verdeeld over
tweeëntwintig losse momenten. Van buitenaf is het één datum. Dat verschil is de reveal.

**→ BEWIJSDREMPEL** E3, met minimaal drie onafhankelijke actualiteitsbronnen die binnen één venster
clusteren. **Maculis mag de oorzaak nooit benoemen.** Alleen de samenval. Dit is het voorbeeld waarin
de verleiding om in te vullen het grootst is, en het is precies daarom de belangrijkste toepassing
van de regel uit 3.5.

---

### V12 · Vier verhalen, één brievenbus

**EVIDENCE A** Alle contactmogelijkheden op de site, formulier, mailadres en telefoon, lopen uit op
één generiek adres.
**EVIDENCE B** De site vertelt meerdere gescheiden verhalen: meerdere specialisaties, doelgroepen,
vestigingen of teams.

**→ VERBAND** De gedifferentieerde buitenkant komt binnen op één ongedifferentieerd punt.

**→ MOGELIJKE REVEAL**
"Je site vertelt vier verhalen. Ze komen alle vier op hetzelfde adres binnen. Wie er antwoordt weet
niet welk verhaal iemand gelezen heeft."

**→ WAAROM DIT NIEUW KAN ZIJN** De ondernemer ziet de binnenkomende vraag, niet het verhaal dat
eraan voorafging. Het verlies zit precies op de naad die hij niet kan zien.

**→ BEWIJSDREMPEL** E2. Zuiver observeerbaar, geen interpretatie nodig.

**Opmerking.** Dit is tevens de natuurlijke brug naar de reeds gebouwde Communication Layer. De
reveal benoemt een probleem waarvan Maculis de oplossing al in huis heeft. Dat is
commercieel relevant en het is inhoudelijk eerlijk, want de waarneming staat op eigen benen.

---

### 4.1 Wat deze twaalf voorbeelden gemeen hebben

Ze zijn niet gekozen op onderwerp maar op **mechanisme**, en er zijn er maar vier:

| Mechanisme | Voorbeelden | Waarom het werkt |
|---|---|---|
| **Twee auteurmomenten** | V1, V4, V10, V11 | De ondernemer heeft elke stap bewust gezet en het geheel nooit gezien |
| **Twee publieken** | V2, V5, V12 | Teksten voor verschillende lezers worden nooit naast elkaar gelegd |
| **Mens tegenover machine** | V3, V6, V8 | De machineleesbare zelfbeschrijving heeft hij nooit gelezen |
| **Afwezigheid over meerdere bronnen** | V9 | Het enige mechanisme dat van binnenuit principieel onwaarneembaar is |

**Geen van de twaalf komt uit één pagina op één moment.** Dat is de operationele samenvatting van
hoofdstuk 3: er is geen enkele reveal die je uit één bron kunt halen, hoe goed je detector ook is.

---

## 5. De blinde vlekken van een ondernemer, van nul opnieuw bekeken

De vraag "welke werkelijkheid ziet een ondernemer structureel slecht" heeft een structureel antwoord.
Hij ziet slecht wat aan minstens één van deze vier voorwaarden voldoet.

| Type blinde vlek | Waarom hij structureel is |
|---|---|
| **Het weglatingsgat** | Je merkt wat je toevoegt. Je merkt nooit wat je gestopt bent te doen |
| **Het buitenoog** | Wat anderen zien en zeggen komt zelden ongefilterd terug, en nooit compleet |
| **Het opeenstapelingsgat** | Wat gegroeid is zonder besluit: structuur, afhankelijkheden, verplichtingen |
| **Het stiltegat** | De klant die niet terugkwam, de sollicitant die niet solliciteerde, de mail die nooit aankwam |

Daarna de vraag die de opdracht terecht bovenaan zet: een Lens bestaat pas als Maculis daar
**zelfstandig voldoende betrouwbaar bewijs** voor kan verzamelen. Hieronder de aangedragen
onderwerpen, elk met een verdict.

| Onderwerp | Blinde vlek | Kan Maculis het zelfstandig waarnemen? | Verdict |
|---|---|---|---|
| Belofte tegenover werkelijkheid | weglating | ja | **Lens 1, bestaat** |
| Verbanden en bevestiging van buiten | buitenoog | ja, via publieke registers | **Lens 2, bouwbaar. Zie hoofdstuk 6** |
| Afhankelijkheden | opeenstapeling | **deels.** Technische afhankelijkheden goed, commerciële niet | later, en dan smal |
| Reputatie en klantperceptie | buitenoog | deels, en de beschikbaarheid is bimodaal | later. Zie hoofdstuk 8 |
| Financiën en continuïteit | buitenoog | ja voor rechtspersonen met deponeringsplicht, met vertraging | later. Zie hoofdstuk 8 |
| Mensen en werkgeversbeeld | buitenoog | alleen tijdens werving | later, episodisch |
| Communicatie | stilte | **nee, niet passief.** Dit vereist de eigen data van de klant | **geen Lens.** Het is een capability, en die is al gebouwd |
| Commercie en groei | stilte | nee, vereist interne data | **geen Lens** |
| Markt en concurrentie | buitenoog | **nee**, de vergelijkingsgroep is niet betrouwbaar vast te stellen | **geen Lens** |
| Operationele frictie | opeenstapeling | passief nee. Van binnenuit ja | **geen Lens nu.** Waarschijnlijk de rijkste Lens ooit, zodra Maculis binnen is |

Twee opmerkingen die dit rapport niet wil laten liggen.

**Communicatie is geen Lens, en dat is goed nieuws.** Het is geen blinde vlek die je van buiten kunt
waarnemen, maar een werkelijkheid die pas zichtbaar wordt als Maculis meekijkt. Dat is precies de
overgang van "kijken" naar "blijven kijken", en die capability is al gebouwd. Zie hoofdstuk 10.

**Operationele frictie is de grootste prijs en tegelijk de verste.** Het is waar de meeste waarde
zit, en het is passief onbereikbaar. Het rechtvaardigt geen Lens vandaag, maar het is wel het
argument waarom de journey uiteindelijk naar binnen moet leiden en niet oneindig van buiten moet
blijven kijken.

---

## 6. Shortlist van kandidaat Lenzen

Vijf kandidaten. De eerdere bake off uitkomst, Reputation als voorlopige Lens 2 en Finance als sterke
volgende, is als input behandeld en niet als besluit.

**L-A · Reputatie.** Wat anderen over je zeggen, en of jij daar deel van uitmaakt. Bewijs: aantallen,
recentheid, spreiding en reactiegedrag op openbare beoordelingen.

**L-B · Verbanden.** Klopt wat jij over je verbanden claimt met wat de andere partij bevestigt.
Bewijs: elke claim van lidmaatschap, keurmerk, certificering, partnerschap of samenwerking op de
eigen site, getoetst aan het publieke register van de uitgevende partij.

**L-C · Afhankelijkheid.** Waar ben je kwetsbaar door concentratie. Bewijs: technische en
infrastructurele afhankelijkheden, één auteur, één kanaal, één ingang.

**L-D · Continuïteit en financiën.** De gedeponeerde werkelijkheid over meerdere jaren, en het
contrast met de gepresenteerde ambitie.

**L-E · Werkgeversbeeld.** Hoe je eruitziet voor mensen die bij je zouden kunnen werken. Bewijs:
eigen vacatures over de tijd, wijzigingen op de teampagina, wervingsfrequentie.

---

## 7. Score per kandidaat op de tien criteria

Schaal 1 tot 5. De motivering per opvallende score staat onder de tabel.

| # | Criterium | L-A Reputatie | L-B **Verbanden** | L-C Afhankelijkheid | L-D Financiën | L-E Werkgeversbeeld |
|---|---|---|---|---|---|---|
| 1 | Verrassing | 3 | **4** | **5** | 2 | 4 |
| 2 | Persoonlijke relevantie | 5 | **5** | 4 | 5 | 4 |
| 3 | Bewijsbaarheid | 4 | **5** | 3 | **5** | 3 |
| 4 | Databeschikbaarheid | 2 | **4** | 3 | 2 | 2 |
| 5 | Handelingswaarde | 4 | **5** | 4 | 3 | 4 |
| 6 | Onderscheidend vermogen | 2 | **4** | **5** | 3 | 4 |
| 7 | Continuïteit | 5 | **5** | 4 | 2 | 2 |
| 8 | Relatie met Het Veld | 4 | **5** | **5** | 2 | 3 |
| 9 | Nieuwsgierigheid | 3 | **4** | **5** | 2 | 3 |
| 10 | Commerciële trekkracht | 4 | **4** | 3 | 4 | 2 |
| | **Totaal** | **36** | **45** | **41** | **30** | **31** |

**Toelichting op de scores die het meest sturen.**

*Reputatie, databeschikbaarheid 2.* Dit is de bevinding die de eerdere bake off uitkomst het hardst
raakt. De beschikbaarheid van beoordelingen is **bimodaal**. Een praktijk of een horecazaak heeft er
honderden. Een zakelijke dienstverlener uit de First Five doelgroep heeft er vaak nul tot drie. Een
Lens die voor de helft van de pilotgroep in SILENCE eindigt, is geen tweede ervaring.

*Reputatie, onderscheidend vermogen 2.* Beoordelingen monitoren is een verzadigde categorie. Het is
bovendien het enige onderwerp waarvan een ondernemer al verwacht dat een systeem ernaar kijkt, en het
verwachte leveren is het tegendeel van een reveal.

*Verbanden, bewijsbaarheid 5.* Een publiek register noemt je wel of het noemt je niet. Dat is de enige
binaire, extern verifieerbare bewijssoort in de hele shortlist. Er is geen interpretatie nodig, en
dus ook geen ruimte voor een zwakke reveal.

*Verbanden, continuïteit 5.* Registers veranderen, lidmaatschappen verlopen, certificeringen
vervallen. Dit is de enige kandidaat die uit zichzelf blijft veranderen op een menselijke tijdschaal.
Dat is exact de motor onder "ik wil dat Maculis blijft kijken".

*Verbanden, relatie met Het Veld 5.* Elke controle levert een **echte, genoemde andere organisatie**
op. Dat is geen afgeleid signaal maar een relatie, en Het Veld heeft relaties nodig en geen scores.

*Afhankelijkheid, verrassing 5 en bewijsbaarheid 3.* De hoogste verrassingsscore van allemaal, want
niemand heeft zijn eigen afhankelijkheden ooit in kaart gebracht. Maar passief is alleen de
technische laag betrouwbaar waarneembaar. Een Lens die alleen technische afhankelijkheden ziet,
landt bij de ondernemer als "nog meer technische signalen", en dat is precies de zwakte van Lens 1.

*Financiën, verrassing 2 en continuïteit 2.* De ondernemer kent zijn eigen cijfers beter dan Maculis
ooit zal doen. Bovendien komt er per jaar één nieuw signaal binnen, met twaalf tot twintig maanden
vertraging. Dat is een slechte motor onder een abonnementsgevoel. De enige werkelijk verrassende
financiële reveal is niet het cijfer maar wat een derde over je kan opzoeken, en dat is eigenlijk
een reputatievraag.

---

## 8. De beargumenteerde voorkeur, en wat bewust nog niet gebouwd wordt

> **Statuswaarschuwing.** Dit hoofdstuk lag in de oorspronkelijke opdracht als "jouw beargumenteerde
> keuze". Het is een **beargumenteerde voorkeur en geen besluit.** De eerdere bake off tussen
> Reputation, Finance en Dependency is niet gelezen, alleen als tweedehands input meegenomen. Het
> hele hoofdstuk staat op de herbeoordeling van validatiestap 7. Er wordt geen Lens 2 gebouwd.

### 8.1 Hypothese: de sterkste kandidaat voor Lens 2 is Verbanden

> **VOORSTEL, GEEN BESLUIT.** Lens 2 · Verbanden. "Klopt wat jij over jezelf claimt met wat een
> ander bevestigt?"

Vier argumenten, in volgorde van gewicht.

**Eén. Het opent precies de volgende blinde vlek, niet zomaar een andere.** Lens 1 kan nooit zeggen
dat iets niet waar is. Hij kan alleen zeggen dat twee dingen die jij hebt geschreven niet bij elkaar
passen. Lens 2 kan voor het eerst zeggen: **iemand anders bevestigt dit niet.** Dat is een
categorisch ander soort oordeel, en het is precies één stap verder van de controle van de ondernemer
vandaan. Volgens de kernthese uit 1.3 is dat waar revealkracht vandaan komt.

**Twee. Het bewijs is binair en daarmee onaantastbaar.** Het register noemt je of het noemt je niet.
Er is geen enkele ruimte om een zwakke observatie te promoveren, want er bestaat geen zwakke
observatie in deze categorie. Dat maakt Lens 2 de veiligste tweede stap die er is: een Lens die per
constructie niet kan verleiden tot gateverlaging.

**Drie. Het bouwt Het Veld werkelijk op.** Elke controle produceert een edge naar een genoemde,
bestaande organisatie. Na tien deelnemers is er geen verzameling scores maar een beginnend netwerk
van echte partijen: brancheorganisaties, keurmerken, certificerende instanties, partners. Dat is de
eerste keer dat Mijn Maculis relationeel rijker wordt in plaats van voller.

**Vier. Het levert reveals met onmiddellijke handelingswaarde.** Een verlopen keurmerk dat nog op je
site staat, is vandaag te repareren en het is een ding dat je niet had willen laten staan.

Een concreet voorbeeld van de vorm:

> "Je site draagt sinds 2021 een keurmerk. Het register van dat keurmerk noemt je sinds vorig jaar
> niet meer. Het staat nog op vier pagina's."

Wat die zin doet, in de ladder van hoofdstuk 1: hij is observatie, herkenning, betekenis, reveal én
handelingswaarde tegelijk. Alle zes de niveaus in één zin, uit twee bronnen, zonder één
interpretatie.

**Eerlijke zwakte van Lens 2, die vooraf benoemd hoort te worden.** Als een organisatie geen enkele
claim over verbanden maakt, heeft Lens 2 niets om te toetsen en is SILENCE het juiste antwoord. Dat
is geen defect maar het moet wel in de verwachting mee: Lens 2 is scherp waar hij aangrijpt, en hij
grijpt niet overal aan. Precies daarom is hij een tweede Lens en geen eerste.

### 8.2 Wat bewust nog NIET gebouwd wordt

**Primair: Reputatie.** Dit is de bewuste omkering van de eerdere bake off uitkomst.

* De databeschikbaarheid is bimodaal, en juist in de doelgroep waar de First Five zich bevindt is ze
  het dunst. Een tweede ervaring die bij de helft van de deelnemers stil valt, is geen tweede
  ervaring.
* De dominante bronnen zijn juridisch en contractueel het lastigst van alle kandidaten.
* Het is de categorie met de laagste onderscheidendheid. Een ondernemer verwacht dit al, en verwacht
  inzicht is geen inzicht.
* En het zwaarste argument: **Reputatie wordt pas een goede Lens als Het Veld genoeg structuur heeft
  om een beoordelingspatroon aan iets te kunnen relateren.** Vandaag zou hij beoordelingen
  rapporteren. Na Lens 2 kan hij ze verbinden. Hetzelfde onderwerp is dan een aanzienlijk sterkere
  Lens. Wachten maakt hem beter, niet alleen later.

**Secundair: Financiën.** Hoogste bewijsbaarheid van de hele shortlist en op één na de laagste
verrassing. Dat is de verkeerde combinatie voor een tweede ervaring. Eén signaal per jaar met meer
dan een jaar vertraging kan bovendien het gevoel "ik wil dat Maculis blijft kijken" niet dragen.
Financiën is een uitstekende **derde of vierde** Lens, op het moment dat continuïteit een expliciete
vraag van de ondernemer zelf is geworden.

**Ook niet: Afhankelijkheid, nu.** De hoogste verrassingsscore van allemaal, en toch niet nu. Passief
is alleen de technische laag betrouwbaar, en een Lens die alleen technische afhankelijkheden toont,
herhaalt precies de zwakte van Lens 1. Afhankelijkheid wordt sterk zodra Het Veld relaties bevat,
want dan kan concentratie in relaties worden waargenomen in plaats van in infrastructuur. Dat is na
Lens 2. **Afhankelijkheid is daarmee de logische Lens 3, en het is een goede reden om Lens 2 te
kiezen zoals hij gekozen is.**

---

## 9. Drie modellen voor de eerste klantjourney

### Model A · De trap

Lens 1, dan Lens 2, dan Lens 3. Elke Lens een nieuw onderwerp, oplopend in diepte.

*Sterk:* voorspelbaar, makkelijk uit te leggen, makkelijk te verkopen.

*Zwak:* elke volgende Lens voelt als meer analyse over een nieuw onderwerp. Nieuwsgierigheid wordt
belóófd in plaats van verdiend, en dat is precies de gamification die de opdracht uitsluit. En als
Lens 1 in SILENCE eindigt, heeft de trap geen eerste trede.

### Model B · De brede opening met verdieping vanuit Het Veld

Eén brede eerste ervaring die bewijs uit meerdere domeinen tegelijk trekt en alleen toont wat de gate
haalt. Daarna biedt Het Veld zelf de natuurlijke verdiepingen aan.

*Sterk:* de kans dat er íets sterks tussen zit is het hoogst van de drie, en dat is een reëel
antwoord op de vastgelegde SILENCE bevinding. Het past bovendien bij Het Veld als organiserend
principe.

*Zwak, en zwaarwegend:* breedte zonder diepte is een dashboard, en een dashboard is precies wat
Maculis niet mag zijn. Het maakt de Lensgrenzen onzichtbaar, waardoor het grenswerk uit hoofdstuk 2
zinloos wordt en Lens 1 alsnog alles gaat proberen te worden. En het duurste bezwaar: als de eerste
ervaring alles aanraakt, is er geen tweede perspectief meer over dat werkelijk nieuw voelt.

### Model C · Eén scherpe Lens, daarna een ander perspectief

Lens 1 gaat diep op de zelfgeschreven werkelijkheid. De tweede ervaring verandert niet het onderwerp
maar **wiens woord telt.**

*Sterk:* de omslag is het product, niet de diepte. En het is eerlijk uit te leggen zonder iets achter
te houden.

*Zwak in de kale vorm:* zonder expliciete formulering voelt "een ander perspectief" alsnog als een
nieuw onderwerp, en dan is Model C in de praktijk Model A met andere woorden.

### Model C+ · Eén vraag, meer getuigen. **De voorkeur**

Model C, maar met de as expliciet gemaakt.

De eerste ervaring stelt één vraag, de kernvraag van Lens 1, en beantwoordt hem met het bewijs dat de
ondernemer zelf heeft geschreven. De tweede ervaring stelt **dezelfde vraag** en beantwoordt hem met
het bewijs van iemand anders. De derde voegt opnieuw een getuige toe.

De reveal is dan nooit "hier is een nieuw onderwerp" maar:

> "Dezelfde vraag heeft nu een tweede getuige, en de getuigen zijn het niet eens."

---

## 10. De voorkeur, en waarom hij de drie zinnen oplevert

**Voorkeur, geen besluit: Model C+, met Lens 2 Verbanden als tweede getuige.** Dit hoofdstuk erft de
status van hoofdstuk 8 en valt onder validatiestap 7.

Getoetst aan de drie zinnen uit de opdracht.

**"Dit had ik zelf niet gezien."**
C+ maakt bewijsafstand het organiserende principe in plaats van onderwerpdiepte. Volgens de these uit
1.3 is bewijsafstand de enige variabele die verrassing werkelijk aanstuurt. Model A vergroot diepte
en Model B vergroot breedte. Geen van beide vergroot afstand.

**"Wat ziet Maculis nog meer?"**
Deze vraag krijgt in C+ een eerlijk, concreet antwoord: meer getuigen. Dat is precies wat de roadmap
werkelijk is, dus er wordt niets achtergehouden en niets gesuggereerd. In Model A is het antwoord
"meer onderwerpen", en dat klinkt als een productcatalogus. In Model B is het antwoord onduidelijk,
want de eerste ervaring heeft al overal aan geraakt.

**"Ik wil dat Maculis blijft kijken."**
Getuigen veranderen. Registers wijzigen, lidmaatschappen verlopen, sites worden herschreven. Blijven
kijken is in C+ geen abonnementsargument maar een logische consequentie: één getuige die verandert,
verandert het antwoord op een vraag die de ondernemer al belangrijk vindt. En de laatste stap in die
lijn is de sterkste: de laatste getuige is de organisatie zelf, van binnenuit, via de communicatie
die al door Maculis loopt. Daar houdt kijken op en begint meekijken.

**En C+ lost de vastgelegde SILENCE bevinding op zonder de gate aan te raken.** Vandaag hangt de hele
journey aan één poort. In C+ zijn er meerdere getuigen en dus meerdere poorten, elk met dezelfde
onverlaagde lat. Geen reveal uit je eigen bewijs betekent niet dat er geen reveal is. Dat is
bewijsuitbreiding volgens de definitie in 3.1, en nadrukkelijk geen versoepeling.

---

## 11. Nu nodig, leren, en pas daarna bouwen

### 11.1 HYPOTHESES VOOR DE PILOTOPZET

> **Status. Dit was in de eerste versie een lijst "nu nodig". Dat is het niet. Niets hieronder wordt
> gebouwd. Het zijn hypotheses voor de pilotopzet, ter beoordeling, en punt 2 en 3 vallen expliciet
> onder de bouwstop op First Five.**

Alles hieronder is klein, en niets ervan raakt de Reveal Gate. Dat maakt het nog geen GO.

**1. Overweeg de kernvraag en de grens van Lens 1 vast te leggen.** Eén zin plus de tweedelige
grensregel uit hoofdstuk 2. Alleen zinvol nádat de canon is gelezen, want die kan er al een hebben.
Validatiestap 3.

**2. Hypothese: SILENCE presenteren als geloofwaardige uitkomst in plaats van als troostprijs.**
**Niet bouwen.** Dit zou een copy en ontwerpwijziging zijn, geen gatewijziging, maar het raakt First
Five en valt dus onder de bouwstop. Vandaag wordt SILENCE gevuld met drie uitgeklapte panelen, en dat
leest als een verontschuldiging. Benoemd met een bewijstelling zou het als karakter lezen:

> "Ik heb elf bronnen bekeken en geen verband gevonden dat sterk genoeg was om te tonen."

Canon: stilte is inzicht. Als hypothese is dit de goedkoopste wijziging in het hele rapport en
mogelijk de meest waardevolle voor de pilot, want zonder haar zou een SILENCE deelnemer kunnen
afhaken en helemaal geen meting opleveren. Dat vermoeden is niet getoetst.

**3. Hypothese: de revealklasse per sessie vastleggen.** **Niet bouwen.** Zonder die klasse kan
`novelty` niet worden teruggerekend naar een revealtype, en levert de pilot een gemiddelde op in
plaats van een richting. *Eerst verifiëren of de journey dit al stempelt. Dat is een leesvraag voor
de validatieronde, geen bouwvraag.*

**4. Draai de pilot op de ONGEWIJZIGDE Lens 1.** Dit is contra-intuïtief en het is belangrijk. De
pilot moet meten of de huidige Lens 1 volstaat. Wie hem eerst verbetert, meet zijn eigen verbetering
en niet de diagnose. De hypothese van dit rapport, dat Lens 1 tussen niveau 2 en 3 blijft steken,
moet weerlegbaar zijn. Dat kan alleen op de huidige versie.

**5. Bouw geen Lens 2 vóór de pilot.** Om de reden uit 1.6.

### 11.2 LEREN UIT DE EERSTE PILOT

De pilot moet vijf dingen opleveren, en de eerste drie zijn de beslissende.

**1. De verdeling van `novelty` per revealklasse.** De kernvraag. Als `nieuw` structureel onder de
helft blijft, is de diagnose uit hoofdstuk 1 bevestigd en is bewijsuitbreiding de enige juiste
volgende stap.

**2. Het SILENCE percentage op echte domeinen, en wat de stille gevallen gemeen hebben.** Als de
stille sites systematisch klein, jong of eenpersoons zijn, is dat een doelgroepbesluit en geen
techniekbesluit.

**3. De vrije tekst in `recognition_context` en `accuracy_context`.** Dit is het waardevolste
materiaal van de hele pilot. Waar een tester schrijft "dat klopt niet helemaal, want", staat
letterlijk welk bewijs Maculis miste. Dat is de bronnenlijst voor hoofdstuk 3, geschreven door de
doelgroep zelf.

**4. Waar op de ladder testers stoppen, gemeten aan gedrag en niet aan een vraag.** Lopen ze door naar
het gesprek, stellen ze zelf een vraag, en dragen ze iemand aan. Niet vragen of ze nieuwsgierig zijn,
want dat is een sturende vraag.

**5. Het Pass the Lens percentage.** De eerlijkste beschikbare proxy voor "dit was iets waard". Wie
zijn naam aan een aanbeveling verbindt, heeft waarde ervaren. De lus draait al in productie.

### 11.3 PAS DAARNA BOUWEN

> **Status. Dit is een voorgestelde volgorde voor als er ooit een GO komt, geen goedgekeurde
> roadmap.** Er ligt vandaag geen GO, Lens werk is PAUSED, en de hele volgorde staat op de uitkomst
> van de validatieronde en de pilot.

In deze volgorde, en elke stap pas na de vorige.

**1. Bewijsuitbreiding as 3, de tijd.** Het archief. Hoogste waarde, laagste inspanning, laagste
juridische wrijving, en het maakt V1, V4, V10 en V11 in één keer mogelijk. Als er na de pilot maar
één ding gebouwd wordt, is dit het.

**2. Bewijsuitbreiding as 2, de eigen kanalen.** Structured data, DNS en mail, sitemapversheid,
vacatures. In die volgorde, want dat is de volgorde van betrouwbaarheid en niet van
aantrekkelijkheid.

**3. De getrapte gate E1 tot E4 formaliseren.** Nadat de nieuwe bronnen er zijn, want een getrapte
gate zonder meerdere bronnen is een lege structuur. En vóór Lens 2, want E4 moet bestaan voordat er
een Lens komt die uitspraken over derden doet.

**4. Handelsregister en eigen bedrijfsvermelding, na de licentiecheck.** De licentievraag is een echte
vraag en moet beantwoord zijn voordat er een regel code voor geschreven wordt.

**5. Lens 2 Verbanden.**

**6. Pas daarna, in deze volgorde:** Afhankelijkheid, dan Reputatie, dan Financiën.

---

## 12. Samenvatting in tien regels

**Alle tien zijn hypotheses, niet vastgestelde uitspraken.** Regel 1 tot en met 4 staan op
validatiestap 1, 2, 4 en 5. Regel 7 tot en met 9 staan op validatiestap 3 en 7.

1. Lens 1 lijkt drie herkenningspaden en één voorwaardelijk revealpad te hebben.
2. Daardoor zou de huidige eerste ervaring meestal eindigen tussen herkenning en betekenis, niet bij
   de reveal.
3. De vermoede oorzaak is niet de Reveal Engine maar de bewijstopologie: één bron, die de ondernemer
   zelf beheert en het beste kent.
4. Vermoeden H-1: revealkracht is een functie van bewijsafstand, niet van analysediepte.
5. Lens 1 zou sterker kunnen worden langs twee assen die de gate onaangeroerd laten: de tijd, en de
   eigen kanalen van de organisatie.
6. Bewijsuitbreiding en gateverlaging verschillen hierin: uitbreiding voegt een bron toe,
   gateverlaging niet. De valkuil ertussen heet schijnonafhankelijkheid. Dit is de enige regel in
   deze lijst die geen bronkennis vraagt en dus zelfstandig houdbaar is.
7. Voorgestelde kernvraag van Lens 1: laat je van buiten het bedrijf zien dat je inmiddels bent. De
   voorgestelde grens: alleen bewijs dat de organisatie zelf heeft geschreven, en alleen over
   zelfpresentatie. De canon is niet gelezen en gaat voor.
8. Voorgestelde richting voor Lens 2: Verbanden, als enige kandidaat met binair extern bewijs die
   tegelijk Het Veld met echte relaties vult. Geen besluit, en er wordt geen Lens 2 gebouwd.
9. Voorstel om Reputatie en Financiën uit te stellen. Berust op een niet gelezen bake off en moet in
   validatiestap 7 opnieuw.
10. **Vermoeden: Lens 1 kan een pilot dragen, nog geen betaalde ervaring. Bouw in geen geval een
    tweede Lens om dat te compenseren.**

---

## 13. Wat dit document niet is

Geen code. Geen UI. Geen nieuwe detector. Geen gewijzigde gate. Geen roadmap van twintig Lenzen. Geen
Epic. Geen wijziging aan preview of productie. **En geen productstrategie en geen governancebesluit.**

Alle bestaande governance blijft ongewijzigd gelden, in het bijzonder: **een gate wordt nooit
verzwakt om SILENCE te vermijden. Breid bewijs uit voordat je waarheidsstandaarden verlaagt.** Lens
werk blijft PAUSED. Zie het statusblok bovenaan dit document voor de volledige lijst.

Dit document legt onderzoek en hypotheses vast en stopt daar. De volgende stap is de read only
validatieronde uit het statusblok, niet bouwen.
