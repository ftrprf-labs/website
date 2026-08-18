# Maculis, De Vijfde Kamer

**Ontwerpstudie voor de persoonlijke Maculis-werkomgeving.**
Zelfstandig spoor. Geen wijziging aan de Visual North Star, de vier bestaande kamers of
productiecode. Niets gedeployed.

**Status: SOURCE / CLOSED, 2026-08-18. Uitsluitend bronmateriaal.**
Zie `STATUS.md`. De Visual DNA v1.0 is inmiddels centraal gepubliceerd in `ftrlabs-docs/03-ux/` en
is de enige canonieke bron. Alles hieronder is geschreven zonder die canon en is nooit daartegen
getoetst. Die toetsing hoort in de primaire Kamer 5-werkstroom, niet hier.

Geschreven: 2026-08-17.

---

## 0. Uitgangspunt en source of truth

> **Achterhaald, 2026-08-18.** Dit hoofdstuk is geschreven toen de canon niet in deze
> werkomgeving stond. Productcode is geen bron voor het Visual DNA. De twee hieronder gemelde
> inconsistenties, de ontbrekende Newsreader en het ontbrekende epistemische violet, zijn
> daarmee ingetrokken: zij zeggen iets over de implementatie, niet over de grammatica. Bron B
> blijft staan als waarneming over de code, niet als grondslag. De toetslijst in hoofdstuk 8
> vervalt ten gunste van de herbeoordeling in `STATUS.md`.

**Belangrijke bevinding vooraf.** Het canonieke Visual North Star-document bestaat niet in deze
repository. Er is hier geen `VISUAL_DNA.md`, geen North Star, en geen kamerdocumentatie. Wat wel
verifieerbaar is, is de *gebouwde* grammatica in productiecode. Deze studie is daarom expliciet
gebaseerd op twee bronnen, en op niets anders:

**Bron A. Het DNA zoals geformuleerd in de opdracht zelf.**
Losse signalen worden samenhang. Beweging is onzekerheid, stilte is bevestigd inzicht. Koper is
waargenomen grond. Violet is betekenis in wording. Licht volgt bewijs. Verbinding volgt inhoudelijk
verband. Vier kamers met elk een lichtregime.

**Bron B. De tokens die in deze repository daadwerkelijk in productie staan.**

| Token | Waarde | Vindplaats |
|---|---|---|
| grond | `#080503` | `public/styles.css:9` |
| ivoor (tekst) | `#ece2d4` | `public/styles.css:19` |
| gedempt | `#a89a86` | `public/styles.css:20` |
| koper | `#c8894a` | `public/styles.css:23`, `server/comm/signature.mjs:46` |
| koper, opgelicht | `#e6a866` | `public/styles.css:24` |
| lijnwerk | `rgba(200,137,74,.18)` en `.34` | `public/styles.css:15` |
| violet | `#7c3aed` | `public/styles.css:249`, als status OPENED |
| serif in productie | Iowan Old Style, Palatino, Georgia | `public/styles.css:32` |

**Twee inconsistenties die ik niet stilzwijgend heb opgelost:**

1. De opdracht noemt **Newsreader** als het gekozen vertrekpunt voor de serif. De productiecode
   gebruikt de systeemserif Iowan Old Style. De studie zet Newsreader vooraan in de stack en valt
   terug op precies de productiestack. Zo is de studie waar Newsreader beschikbaar is trouw aan het
   voornemen, en waar dat niet zo is trouw aan de bestaande code.
2. Er bestaat in productie **geen violettoken als betekenisdrager**. De enige violet is `#7c3aed`
   als statuskleur voor OPENED. Ik heb die waarde overgenomen als vertrekpunt en gemarkeerd als
   onzeker. Zie DNA GAP 5.

Wanneer Visual DNA v1.0 definitief wordt, moet deze studie hiertegen worden gelegd. De volledige
lijst van punten die dan getoetst moeten worden staat in hoofdstuk 8.

---

## 1. Bestaansrecht

> **Kamer 5 bestaat omdat geen enkele kamer over zichzelf kan zeggen dat zij vandaag gesloten mag
> blijven.**

Dat is geen woordspel, het is een structureel gat. De Website weet niet of er vandaag een bezoeker
komt die ertoe doet. De Lens weet niet of het signaal dat zij vanochtend zag jouw dag waard is.
Mijn Maculis weet niet of de klant al gekeken heeft. De Cockpit weet alleen wat er in de Cockpit
ligt, en zal daarom altijd zeggen: kom binnen. Elke kamer pleit onvermijdelijk voor zichzelf.

Iemand moet daarboven staan. Dat is precies de plek die vandaag leeg is, en die ik nu vul.

---

## 2. Relatie tot de vier bestaande kamers

| | Kamer 1 tot 4 | Kamer 5 |
|---|---|---|
| Voor wie | prospect, onderzoeker, klant, operator | de enige voor wie alle vier tegelijk waar zijn |
| Richting van de blik | naar buiten, naar de klant en de wereld | naar binnen, naar het huis zelf |
| Onderwerp | informatie | de toestand van het huis en de kosten van mijn aandacht |
| Schaal | per klant, per traject, per gesprek | over alles heen, en maar één persoon |
| Bestaan | bestaat wanneer je hem opent | bestaat ook wanneer niemand kijkt |
| Doel | tonen | weglaten |

Twee dingen maken Kamer 5 categorisch anders, niet gradueel.

**Kamer 5 is de enige reflexieve kamer.** Zijn onderwerp is niet de klant maar het huis. Hij is de
enige kamer die iets kan zeggen over de andere vier, en de enige die kan zeggen: ga nergens heen.

**Kamer 5 is de enige permanent aanwezige kamer.** De andere vier zijn er wanneer je ze opent. Deze
kamer is er terwijl je koffie haalt, terwijl je in Mail zit, terwijl de MacBook dicht is. Dat is
geen technisch detail. Het is de reden dat hij op het bureaublad woont en niet in een tabblad. Een
kamer waarin je woont, kan niet in een venster zitten dat je moet openen.

**Waar Kamer 5 aansluit op het huis:** hij deelt de grond, het koper, het violet, de serif, de
spacing en de bewegingslogica. Hij deelt ook de bron. Wat in Kamer 5 tot rust komt, komt tot rust
omdat het in Kamer 4 is afgehandeld. Kamer 5 heeft geen eigen waarheid en geen eigen administratie.

**Het onderscheid met de Cockpit, in één zin.**

> **Hypothese, niet vastgelegd, 2026-08-18.** De uitspraak hieronder staat stelliger dan haar
> status rechtvaardigt. Zij is belangrijk genoeg om verder te toetsen, maar geldt niet als
> bestaansrecht. De oorspronkelijke hypothese, Kamer 5 als persoonlijke werkruimte op de
> MacBook, weegt even zwaar. Zie `STATUS.md`.

> De Cockpit is de kamer waarin ik werk aan wat aandacht vraagt. De Vijfde Kamer is de kamer die
> beslist of ik die kamer vandaag hoef te openen.

De hypothese uit de opdracht was: de Cockpit vertelt wat aandacht vraagt binnen Maculis, Kamer 5
vertelt waar mijn eigen aandacht heen moet. Ik heb die getoetst en hij is te zwak. Zo geformuleerd
is Kamer 5 een prioriteringslaag bovenop de Cockpit, en dat is precies de super-cockpit die de
opdracht verbiedt. Een sorteervolgorde rechtvaardigt geen vijfde kamer.

Het werkelijke onderscheid zit een niveau eerder. De Cockpit beantwoordt een vraag binnen zijn eigen
domein en gaat er daarbij vanzelfsprekend van uit dat je er bent. Kamer 5 beantwoordt de vraag die
daaraan voorafgaat en die niemand anders kan stellen: **is dit een moment waarop Maculis mij
werkelijk nodig heeft.** Het meest waardevolle antwoord van Kamer 5 is nee. De Cockpit kan dat
antwoord niet geven, want een kamer die zegt dat je haar niet nodig hebt, heeft zichzelf opgeheven.

Daarom is Kamer 5 ook **kleiner** dan de Cockpit, niet groter. Dat is de test. Als Kamer 5 ooit
meer toont dan de Cockpit, is hij mislukt.

---

## 3. De ontwerpthese

> **De Vijfde Kamer toont niet wat er gebeurt, maar wat vaststaat. Alleen wat tot rust is gekomen
> mag mijn aandacht kosten. Alles wat nog beweegt is nog niet van mij.**

Dit is één afleiding uit het bestaande DNA, doorgetrokken tot haar consequentie.

In Kamer 1 tot 4 beschrijft "beweging is onzekerheid" hoe het **materiaal** zich gedraagt. Je kijkt
naar een veld en je leest af hoe zeker Maculis is. In Kamer 5 wordt hetzelfde principe een **regel
van aanspreken**: beweging is niet alleen een uitspraak over het materiaal, het is een uitspraak
over eigenaarschap.

Wat beweegt, is nog van Maculis. Wat stilstaat, is van mij.

De consequentie is de omkering die de hele kamer draagt. In vrijwel elke interface trekt beweging de
blik en betekent beweging: kijk hier. In Kamer 5 betekent beweging: **kijk hier nog niet**. Beweging
stelt uit. Stilte spreekt.

Daaruit volgt vanzelf een reeks dingen die anders arbitraire smaakregels zouden zijn:

- Alleen een stilstaand punt mag taal dragen. Bewegende punten zijn woordloos, altijd.
- Alleen een stilstaand punt mag koper zijn. Koper is grond, en grond staat stil.
- Violet kan per definitie nooit iets van mij vragen, want violet is betekenis in wording, en dus
  nog in beweging. Violet in Kamer 5 is uitsluitend een mededeling dat Maculis ergens mee bezig is.
- Een druk veld is niet alarmerend, het is juist geruststellend: er is veel dat Maculis nog aan het
  uitzoeken is, en dus nog niets voor mij.
- Er kan geen kunstmatige urgentie ontstaan, want urgentie zou beweging vereisen en beweging maakt
  iets juist minder van mij.

En daaruit volgt de tweede omkering, in het veld zelf. In de Lens verdicht beweging zich tot inzicht:
losse signalen worden samenhang. In Kamer 5 is samenhang de **grondtoestand**. De bezonken grond is
alles wat al begrepen is. Alleen wat nog niet is opgelost maakt zich daaruit los als een punt. In
Kamer 5 kijk je dus niet naar signalen die zich verzamelen, maar naar het weinige dat zich nog niet
heeft laten opnemen.

---

## 4. De dagboog

De dagboog wordt niet gestuurd door de klok. Hij wordt gestuurd door drie dingen: het openen en
sluiten van de klep, het passeren van drempels door het materiaal zelf, en precies één afgeleide
tijdsgrens, namelijk het einde van de werkdag. Die grens is semantisch, niet decoratief: daarna
verandert de betekenis van "iemand wacht op mij", want vandaag bereikt niemand nog iemand.

### MacBook dicht

Er gebeurt niets. Er wordt niets berekend, niets gerenderd, niets voorbereid.

Belangrijker: **ook wanneer het scherm aan is maar niemand kijkt, beweegt het veld niet.** Beweging
is in dit systeem een uitspraak, en een uitspraak zonder toehoorder wordt niet gedaan. Dit is een
nieuwe afleiding voor Kamer 5, zie DNA GAP 1.

### Openen

Geen begroeting. Geen naam. Geen datum. Geen samenvatting.

Wat er gebeurt, in deze volgorde:

1. **De grond komt op.** Ongeveer 1,2 seconde. Alleen de warme grond met haar bezonken structuur.
2. **Stilte.** Ongeveer 1,6 seconde waarin er niets bij komt. Dit is het hele ritueel. Je ziet eerst
   de toestand van het huis, en niets anders.
3. **Pas dan, en alleen als er iets stilstaat, verschijnt één punt met één regel.**

Als er niets stilstaat, gebeurt stap 3 nooit. Dan is dat het beeld, en blijft het dat.

Dit ritueel is met opzet bijna niets, want het moet honderden keren houdbaar zijn. Het duurt onder
de drie seconden, het heeft geen eigen animatie die je leert herkennen, en de meest voorkomende
uitkomst is dat er niets gebeurt. Een ritueel dat meestal in stilte eindigt, gaat niet vervelen.

### Begin van de werkdag

Bij de eerste opening van een dag mag de kamer maximaal **drie** stilstaande punten tonen in plaats
van één. Een dagovergang is een legitieme reden voor overzicht. Verder is er geen enkel verschil, en
er is geen kop, geen begroeting, geen "3 dingen voor vandaag". Drie regels, meer niet.

Wat mag dat zijn? Zie hoofdstuk 5. Als er niets is, zijn er nul regels en is de dagstart identiek
aan elke andere opening.

### Tijdens het werk

De kamer ligt achter alles. Meestal zie je hem niet, en dat is de bedoeling.

- Punten die oplossen, verdwijnen zonder aankondiging. Er is geen "afgehandeld", geen vinkje, geen
  bevestiging. Iets dat in de Cockpit is afgehandeld, is hier gewoon niet meer.
- Nieuwe punten mogen verschijnen, maar uitsluitend bewegend en woordloos. Ze vragen dus niets.
- Een punt dat tot stilstand komt terwijl je aan het werk bent, wacht op het moment dat je zelf
  kijkt. Het onderbreekt niet.
- Onderbreken mag alleen onder de voorwaarden van drempel 3, en met een hard budget: **maximaal één
  onderbreking per dagdeel.** Wat daarboven komt, wacht. Zie DNA GAP 3.

### Afwezigheid

Dit is het punt waarop de categorie "screensaver" conceptueel onjuist blijkt.

Een screensaver doet meer wanneer jij minder doet. In dit DNA is dat een leugen, want jouw
afwezigheid heeft de onzekerheid in het huis niet vergroot. Het correcte gedrag is het
tegenovergestelde: **de kamer ademt uit.**

Over ongeveer veertig seconden dempt alle beweging naar nul, zakt het lichtplafond naar de vloer, en
lossen de bewegende punten op. Wat overblijft is uitsluitend wat al vaststond: de bezonken grond, en
eventueel de stilstaande punten, zonder taal. Daarna gaat het scherm gewoon slapen zoals macOS dat
doet.

Er is dus geen screensaver-product. Er is een kamer die stopt. Dat is niet alleen conceptueel
zuiverder, het scheelt ook een volledig los te bouwen artefact. Zie hoofdstuk 7.

### Einde van de werkdag

Geen dagafsluiting. Geen terugblik. Geen telling.

Bij het passeren van de werkdaggrens gebeuren twee dingen, allebei semantisch:

- Het lichtplafond zakt één stap. Dat is de mededeling: hier hoeft vandaag niets meer.
- De drempel voor onderbreken gaat omhoog naar alleen nog "er is iets stuk".

Wat om vijf uur nog stilstond, staat er om zes uur nog steeds, in exact hetzelfde gewicht. Het wordt
niet roder, niet groter, niet dringender. Het is niet erger geworden omdat er tijd overheen is
gegaan. Dat is een expliciete weigering van kunstmatige urgentie.

Wat is er dan aan het einde van de dag? Meestal: het veld dat is gaan liggen. Dat is genoeg. Het is
ook eerlijker dan een samenvatting, want een samenvatting zou dingen moeten opsommen die er niet
meer toe doen.

### Rust

De grond. Geen taal. Zie hoofdstuk 6, toestand 1.

---

## 5. Informatiehiërarchie

### Wat er ooit zichtbaar mag worden

Precies vier categorieën mogen tot stilstand komen en taal krijgen. Bij elke categorie staat waarom
zij mijn aandacht verdient. Als dat antwoord zwak is, staat de categorie er niet.

| Categorie | Waarom dit mijn aandacht verdient |
|---|---|
| **Iemand wacht op mij.** | Uitstel kost iemand anders tijd. Dat is de enige kostenpost die niet van mij is en die ik daarom niet mag negeren. |
| **Er is iets stuk.** | Stilte is in dit systeem een betekenisvolle toestand. Als een kanaal kapot is, liegt de stilte. Dat is de enige situatie waarin het systeem zichzelf moet corrigeren. |
| **Iets dat gisteren onzeker was, staat nu vast.** | Dit verandert wat ik geloof. Het is de enige categorie die informatie toevoegt in plaats van werk, en de enige reden om vooruit te kijken in plaats van achteruit. |
| **Er sluit vandaag iets.** | Onomkeerbaarheid. Na vandaag is de keuze weg, en dat is niet terug te draaien door harder te werken. |

Alles wat niet in deze vier valt, mag bestaan in het veld als beweging, en mag nooit taal krijgen.

### Wat nooit zichtbaar wordt

- Aantallen, badges, percentages, voortgangsbalken, reeksen, streaks.
- Activiteit zonder geadresseerde. Iets dat gebeurd is maar van niemand iets vraagt, is geen nieuws.
- Alles wat over mij gaat in plaats van over het huis. Geen productiviteit, geen ritme, geen
  gemiddelde reactietijd. De kamer meet mij niet.
- Werk van anderen als getal.
- Alles wat alleen zichtbaar is omdat de data er toevallig is.
- Een tweede versie van de Cockpit-inhoud. Kamer 5 herhaalt nooit de inventaris van Kamer 4.

### De drie drempels

**Drempel 1, verschijnen.** Iets wordt pas een punt in het veld wanneer er onafhankelijke grond
onder ligt: meer dan één waarneming, of één waarneming die extern verifieerbaar is, zoals een
harde bounce. Eén los voorval maakt geen punt. Dit is wat een feed onmogelijk maakt.

**Drempel 2, verstillen en spreken.** Een punt mag pas tot stilstand komen en taal krijgen wanneer
Maculis in één zin kan zeggen wát het is én wat het van mij vraagt. Kan het dat niet, dan blijft het
bewegen, woordloos. Er komt dus nooit een samenvatting van iets half begrepens, en nooit een
"Maculis denkt na". Onzekerheid wordt getoond als beweging, niet als tekst met een slag om de arm.

**Drempel 3, onderbreken.** Een stilstaand punt mag mij pas uit een andere context halen wanneer
uitstel aantoonbaar iets kost dat Maculis kan benoemen: iemand wacht, er sluit iets, of er is iets
stuk. Anders wacht het tot ik zelf kijk. En zelfs dan geldt het budget van één onderbreking per
dagdeel.

Merk op dat de drie drempels oplopen in bewijslast, niet in urgentie. Dat is bewust. Urgentie is een
gevoel, bewijs is een toestand.

---

## 6. Toestanden van de ruimte

Vijf toestanden. Het zijn geen schermen en geen navigatie, het zijn toestanden waarin de kamer kan
verkeren. De cyclus uit de opdracht (rust, waarneming, wording, aandacht, handeling, rust) is
bruikbaar gebleken als **beschrijving van het materiaal**, maar niet als UI. Ik heb hem daarom
gebruikt om de toestanden af te leiden en vervolgens weggelaten als zichtbare structuur. Je ziet
nooit welke fase iets heeft. Je ziet alleen of het beweegt.

### 1. Grond

Niets heeft drempel 1 gepasseerd. Er zijn geen bewegende punten en geen taal.

Wat je ziet is niet leeg. Je ziet de bezonken grond: een warme, dichte donkerte met een uiterst
zwakke structuur van wat al begrepen is, volkomen stil, plus een langzame ademhaling van ongeveer
twaalf seconden op enkele procenten helderheid.

**De kamer zwijgt hier volledig.** Geen "Je bent bij", geen "Voor nu hoeft er niets van je". Die
zinnen bestaan al in de Cockpit en horen daar, want de Cockpit heeft je binnengelaten en is je een
antwoord schuldig. Kamer 5 heeft je niets gevraagd en is je dus niets schuldig. De afwezigheid van
taal ís de mededeling. Dit is de belangrijkste toestand van de kamer en de mooiste.

### 2. Veld

Eén of meer punten bewegen. Geen taal, geen koper, geen verbinding.

Dit is de toestand die zegt: Maculis is bezig, en er is nog niets van jou. Een druk veld is hier
geruststellend. Dit is ook de meest voorkomende toestand tijdens werkuren.

### 3. Verdichting

Een punt vertraagt. Het licht neemt toe naarmate er meer onafhankelijke grond onder komt. Er kan
violet verschijnen. Er kan een verbinding verschijnen naar een ander punt, maar uitsluitend wanneer
er inhoudelijk verband is, nooit op grond van nabijheid.

Nog steeds geen taal. Nog steeds niet van mij.

### 4. Stilstand

Een punt staat stil, is koper, en draagt exact één regel.

Dit is de enige toestand met taal, en de enige met een werkwoord. Het werkwoord is er precies één:
**ga erheen**. Het punt opent de kamer waarin het thuishoort. Kamer 5 kent geen afhandelen, geen
uitstellen, geen archiveren en geen antwoorden. Hij is een drempelkamer, en zijn enige handeling is
een andere kamer binnengaan. Dat is wat hem structureel belet een werkruimte te worden.

### 5. Onderbreking

Visueel identiek aan stilstand. Het verschil is uitsluitend dat de kamer zich nu naar voren brengt
terwijl ik ergens anders was.

Het gebeurt op precies één manier: het lichtplafond stijgt, en de regel verschijnt op dezelfde plek
waar de kamer altijd spreekt. Geen kaart, geen badge, geen geluid, geen paneel dat inschuift, geen
tweede plek. Maculis spreekt altijd op dezelfde plaats, zodat ik nooit hoef te zoeken en nooit hoef
te leren waar iets kan opduiken.

**Terug naar 1 gebeurt door oplossing, niet door een handeling in deze kamer.** Wat in de Cockpit is
afgehandeld, verdwijnt hier vanzelf. Dat is de reden dat de kamer geen knoppen nodig heeft.

---

## 7. Verantwoording per ontwerpbesluit

Legenda: **[DNA]** volgt rechtstreeks uit het bestaande Visual DNA. **[NIEUW]** nieuwe afleiding
voor Kamer 5. **[UITZONDERING]** bewuste afwijking. **[ONZEKER]** nog niet vastgesteld.

| Besluit | Herkomst | Toelichting |
|---|---|---|
| Beweging is onzekerheid, stilte is bevestigd inzicht | **[DNA]** | Ongewijzigd overgenomen. |
| Beweging stelt uit, alleen stilte spreekt mij aan | **[NIEUW]** | De signature interaction doorgetrokken van uitspraak over materiaal naar regel van aanspreken. Dit is de kern van Kamer 5. |
| Samenhang is de grondtoestand, alleen het onopgeloste maakt zich los | **[NIEUW]** | De verdichtingsrichting van de Lens omgekeerd, omdat Kamer 5 kijkt naar wat over is, niet naar wat ontstaat. |
| Koper alleen op stilstaande punten | **[DNA]** | Koper is waargenomen grond, en grond beweegt niet. Volgt logisch. |
| Koper markeert hier "het staat vast dat dit van jou is" | **[NIEUW]** | De semantiek van koper blijft identiek, waargenomen en gegrond. Alleen de geadresseerde verschuift van de klant naar mij. |
| Violet kan nooit iets vragen | **[DNA]** | Violet is betekenis in wording, dus per definitie nog niet vast, dus per definitie nog niet van mij. |
| Violet is schaars en nooit decoratief | **[DNA]** | Ongewijzigd. In de hele studie kan violet op hoogstens één punt tegelijk staan. |
| Violetwaarde `#7c3aed` | **[ONZEKER]** | Zie DNA GAP 5. Overgenomen uit de enige violet in productie, een statuskleur. |
| Licht volgt bewijs, niet belang | **[DNA]** | Helderheid van een punt schaalt met onafhankelijke grond, niet met prioriteit. |
| Spreiding volgt onzekerheid, naast drift | **[NIEUW]** | Onzeker is diffuus en zonder kern, bevestigd is scherp en klein. Zie DNA GAP 6. Dit kwam pas boven bij het bouwen: onzekerheid had één drager en dat was er één te weinig. |
| Lichtregime: nacht met een verlaagd plafond | **[NIEUW]** | Zie DNA GAP 2. Geen vijfde regime, maar een modifier op een bestaand regime. |
| Het plafond volgt het huis, niet de klok | **[NIEUW]** | Voorkomt het verboden dark-mode-overdag-systeem. De enige tijdgebonden stap is de werkdaggrens, en die is semantisch. |
| Verbinding alleen bij inhoudelijk verband | **[DNA]** | Nabijheid is gevolg, nooit oorzaak. In de studie krijgen punten een expliciete relatie-id, afstand doet niets. |
| Serif alleen voor de stem van de kamer | **[DNA]** | Consistent met het bestaande gebruik: de serif draagt de menselijke zin, nooit de chrome. |
| Geen taal in de rusttoestand | **[NIEUW]** | Onderscheid met de Cockpit, die in zijn zero-state wél spreekt ("Je bent bij."). Kamer 5 mag dat niet herhalen. |
| Precies één werkwoord: ga erheen | **[NIEUW]** | Wat een drempelkamer belet een werkruimte te worden. |
| Geen beweging zonder toeschouwer | **[NIEUW]** | Zie DNA GAP 1. |
| Maximaal één onderbreking per dagdeel | **[NIEUW]** | Zie DNA GAP 3. |
| De kamer spreekt altijd op dezelfde plek | **[NIEUW]** | Praktische afleiding uit "aandacht is het schaarste goed": nooit hoeven zoeken. |
| Newsreader vooraan in de serifstack | **[ONZEKER]** | De opdracht noemt Newsreader, productie gebruikt Iowan Old Style. Zie hoofdstuk 0. |
| Geen menubalk-item, geen notificatiecentrum | **[NIEUW]** | Een permanent icoon met badge-affordance is precies wat hoofdstuk 9 van de opdracht verbiedt. De kamer spreekt waar de kamer is. |

### DNA GAPs

> **Alle zes vervallen tot herbeoordeling, 2026-08-18.** Zij zijn afgeleid tegen een
> onvolledige grondslag. Een ontbrekend token of patroon in productcode is geen DNA GAP.
> Alleen wat na volledige lezing van de centrale canon werkelijk niet uitdrukbaar blijkt, mag
> kandidaat blijven. Zie `STATUS.md`.

**DNA GAP 1. Onwaargenomen toestand.**
Het bestaande DNA beschrijft hoe het veld zich gedraagt, maar niet of het zich gedraagt wanneer
niemand kijkt.
*Eén voorstel:* beweging is een uitspraak, en een uitspraak zonder toehoorder wordt niet gedaan. Het
veld beweegt uitsluitend bij een waarnemer. Dit is niet alleen conceptueel zuiver, het is ook wat
een permanent bureaublad energetisch verantwoord maakt.

**DNA GAP 2. Het lichtregime van Kamer 5.**
Het DNA koppelt vier regimes aan vier kamers. Een vijfde regime zou een vijfde grammatica riskeren,
wat lattest 9 verbiedt.
*Eén voorstel:* Kamer 5 krijgt geen eigen regime maar een modifier. Hij gebruikt de nachtgrond van
Website en Lens, met een verlaagd **lichtplafond**. Het plafond is geen kleur en geen palet, het is
een maximum op de luminantie van alles wat getekend wordt. Het beweegt tussen een vloer en een
maximum, aangestuurd door bewijs. Zo blijft het aantal regimes vier, en krijgt Kamer 5 wat hij nodig
heeft: leefbaarheid over acht uur.

**DNA GAP 3. Frequentie van onderbreken.**
Het DNA specificeert wat beweging en licht betekenen, maar niet hoe vaak Maculis een mens mag
storen. Semantiek zonder budget lekt op termijn altijd vol.
*Eén voorstel:* een hard budget van maximaal één onderbreking per dagdeel, en na de werkdaggrens
alleen nog voor "er is iets stuk". Wat daarboven komt wacht op het eerstvolgende moment dat ik zelf
kijk. Een budget is toetsbaar, een intentie niet.

**DNA GAP 4. Koper met mij als geadresseerde.**
In Kamer 1 tot 4 betekent koper: waargenomen en gegrond, over een klant. In Kamer 5 gaat het over
mijn eigen betrokkenheid.
*Eén voorstel:* de semantiek van koper verandert niet. Waargenomen en gegrond blijft waargenomen en
gegrond. Alleen de geadresseerde verschuift. Zou koper hier iets anders gaan betekenen, dan
ontstaat er een tweede koper en dat is het begin van een vijfde grammatica.

**DNA GAP 5. Violet als token.**
Er bestaat in productie geen violettoken met epistemische betekenis. `#7c3aed` is een statuskleur
voor OPENED, met een koele, blauwe ondertoon die niet vanzelfsprekend past op een warme grond.
*Eén voorstel:* Visual DNA v1.0 legt één violettoken vast met expliciet epistemische definitie
("betekenis in wording"), afgestemd op de warme grond, en de statuskleur in Testerbeheer wordt
daarvan losgekoppeld zodat een UI-status nooit per ongeluk epistemische betekenis draagt.

---

**DNA GAP 6. Onzekerheid zonder beweging.**
Dit gat kwam pas naar boven tijdens het bouwen, en het is het scherpste van de zes. Als beweging de
drager van onzekerheid is, wat gebeurt er dan bij `prefers-reduced-motion`? Beweging wegnemen neemt
dan niet een effect weg maar de betekenis zelf. Een systeem dat zijn epistemiek verliest zodra
iemand rustiger beeld nodig heeft, is niet toegankelijk maar stom.
*Eén voorstel:* onzekerheid krijgt een tweede drager die geen beweging nodig heeft, namelijk
**spreiding**. Wat onzeker is, is diffuus en heeft geen kern. Wat vaststaat, is scherp en klein.
Licht blijft ondertussen bewijs volgen. Zo dragen drift en scherpte samen dezelfde betekenis, valt
er onder reduced motion één drager weg in plaats van de betekenis, en wint het beeld er ook in de
gewone toestand aan leesbaarheid bij. In de studie is dit geïmplementeerd en zichtbaar te
vergelijken.

Dit is bovendien een gat dat waarschijnlijk niet alleen Kamer 5 raakt. Als het signaalveld in de
Lens dezelfde afhankelijkheid van beweging heeft, dan heeft de Lens onder reduced motion hetzelfde
probleem, en dan hoort dit voorstel niet in Kamer 5 maar in het DNA zelf.

---

## 8. Toetslijst voor Visual DNA v1.0

Wanneer v1.0 definitief is, moet deze studie op deze punten worden gelegd, in deze volgorde:

1. Is de serif Newsreader of Iowan Old Style, en geldt dat ook buiten de webinterface?
2. Wat is het violettoken en wat is de exacte epistemische definitie ervan?
3. Bestaat het begrip lichtplafond, of moet Kamer 5 een van de vier bestaande regimes overnemen?
4. Klopt de aanname dat verbinding een expliciete relatie vereist en nooit uit afstand volgt?
5. Is koper met de operator als geadresseerde toegestaan, of is koper gereserveerd voor
   klantwaarneming?
6. Bestaat er een uitspraak over onwaargenomen toestand?
7. Is de bezonken grond, stille en zeer zwakke structuur als beeld van bevestigd inzicht, verenigbaar
   met de bestaande definitie van het signaalveld?
8. Hoe draagt het signaalveld onzekerheid wanneer beweging niet beschikbaar is? Dit raakt
   waarschijnlijk ook de Lens.

---

## 9. De toestand 'niets'

Dit verdient een eigen hoofdstuk omdat het de belangrijkste toestand is.

Er is niets urgents. Niemand wacht. Er is geen nieuwe ontwikkeling. Er is geen betekenis in wording.

**Wat je ziet:** de warme grond, met daarin een uiterst zwakke, volkomen stilstaande structuur van
wat al begrepen is, en een ademhaling van ongeveer twaalf seconden op enkele procenten helderheid.
Het lichtplafond staat op zijn vloer. Er is geen tekst, nergens.

**Waarom dit niet leeg is.** Een leeg scherm zegt: er is hier niets. Dit scherm zegt: alles wat hier
is, is begrepen. Dat is het verschil tussen afwezigheid en verzadiging, en het is precies wat de
bezonken grond visueel maakt. De donkerte is dicht, niet hol.

**Waarom er geen tekst staat.** Elke zin, ook "er is niets", is een handeling van het systeem
richting mij. Een systeem dat niets van mij nodig heeft en dat tóch tegen mij praat, spreekt zichzelf
tegen. De enige eerlijke vorm van "ik heb je niet nodig" is zwijgen.

**Waarom dit niet als kapot voelt.** Drie redenen. De grond leeft, dus het is duidelijk aan. De
grond heeft structuur, dus het is duidelijk niet leeg. En het is de dagelijkse normaaltoestand, dus
het wordt de referentie waartegen alles afsteekt, in plaats van een randgeval.

**De praktische winst.** Omdat rust de normaaltoestand is, kost één stilstaand punt met één regel
buitengewoon veel aandacht zonder dat er ook maar iets hoeft te schreeuwen. De schaarste doet het
werk. Dat is precies waarom deze kamer geen rood, geen badges en geen geluid nodig heeft.

---

## 10. Zelfbeoordeling tegen de lat

| Vraag | Oordeel |
|---|---|
| 1. Aantoonbaar Maculis zonder logo? | Ja. Grond, koper, serif en bovenal het gedrag. |
| 2. Door gedrag of alleen door kleur en typografie? | Door gedrag. Haal alle kleur weg en de regel "wat beweegt is niet van jou" blijft leesbaar in beweging alleen. Dat is de sterkste toets en die haalt hij. |
| 3. Ander bestaansrecht dan de Cockpit? | Ja. De Cockpit kan niet zeggen dat je haar niet nodig hebt. Kamer 5 is bovendien kleiner, niet groter. |
| 4. Is beweging altijd inhoudelijk verklaarbaar? | Ja. Drift schaalt met onzekerheid, licht met bewijs, verbinding met verband. Er is geen enkele beweging die alleen esthetisch is, met één uitzondering: de ademhaling van de grond. Die is bewust behouden als teken van leven en heeft geen informatieve lading. Dat is een bewuste uitzondering en ik markeer hem als zodanig. |
| 5. Is stilte een volwaardige toestand? | Ja, sterker nog: het is de normaaltoestand en de enige woordloze. |
| 6. Wordt mijn aandacht beschermd? | Ja, en toetsbaar: vier categorieën, drie drempels, één onderbreking per dagdeel, één werkwoord. |
| 7. Kan ik hier dagelijks naast leven? | Waarschijnlijk. Het risico zit in de bezonken grond bij lage helderheid op een OLED-scherm en in banding bij grote gradiënten. Zie hoofdstuk 11. |
| 8. Intelligent zonder AI te spelen? | Ja. De intelligentie zit uitsluitend in wat wordt weggelaten en in de weigering te spreken voordat drempel 2 is gehaald. Er is geen sparkle, geen chat, geen orb, geen streaming tekst. |
| 9. Ontstaat er een vijfde grammatica? | Nee, en dat is bewust bewaakt. Geen nieuw palet, geen nieuw regime maar een modifier, geen nieuwe iconografie, geen nieuwe font. Wat nieuw is, is gedrag, en gedrag is precies wat een familie zou moeten delen zonder klonen te worden. |
| 10. Eenvoudiger dan een dashboard? | Ja. De maximale inhoud is drie regels tekst en een handvol punten. Er is geen navigatie, geen filter, geen instelling en één werkwoord. |

**En de belangrijkste vraag.** Haal alle informatie weg en houd alleen het gedrag over: een ruimte
die zwijgt tot iets bewezen is, die beweegt zolang zij twijfelt, die stil wordt wanneer zij het
weet, en die zichzelf uitschakelt wanneer er niemand is om iets tegen te zeggen.

Ja. Dat denkt als Maculis.

---

## 11. Waar dit kan stukgaan

Eerlijk over de risico's, want deze studie is nog niet bewezen over tijd.

- **Banding en OLED.** Een grote, zeer donkere gradiënt bandt op grote schermen. De studie voegt
  daarom een fijne ruistextuur toe op ongeveer 2 procent dekking. Dat moet op echte hardware worden
  gecontroleerd, niet in een schermafbeelding.
- **De ademhaling.** Twaalf seconden op enkele procenten is bedoeld om onder de waarnemingsdrempel
  te blijven en toch leven te geven. Als je hem na een week nog opmerkt, is hij te sterk. Dit is de
  enige beweging zonder informatieve lading en dus de eerste kandidaat om te schrappen.
- **De vier categorieën.** Dit is de zwakste plek van de studie, niet visueel maar inhoudelijk. Als
  in de praktijk blijkt dat er structureel een vijfde categorie nodig is, dan is dat een signaal dat
  de selectie niet klopte. Eén nieuwe categorie is te overwegen. Twee betekent dat het model faalt.
- **Het onderbrekingsbudget.** Één per dagdeel is een aanname zonder bewijs. Meten voordat je hem
  verruimt, en nooit verruimen omdat het "soms te weinig" voelde op een drukke dag.
- **Leesbaarheid op een echt bureaublad.** Vensters, iconen, de menubalk en het Dock concurreren met
  de kamer. De studie bevat daarom een macOS-context om dat te kunnen beoordelen.

### Wat de gebouwde studie al heeft aangetoond

Gecontroleerd in Chromium op 1512 bij 945 en op 900 bij 620, met schermafbeeldingen van alle tien de
momenten, in beide bewegingstoestanden. Geen console-errors.

- **Banding was echt en zichtbaar**, als een boog dwars over het beeld, precies in de rusttoestand
  waar het het meest schaadt. Opgelost met dithering, fijne ruis die per pixel enkele
  luminantieniveaus toevoegt. Zonder die correctie is dit ontwerp niet leefbaar als bureaublad. Dit
  is geen implementatiedetail maar een voorwaarde.
- **Het veld was in de eerste versie te zwak om iets te betekenen.** Onzekerheid uitsluitend in
  drift uitdrukken werkt niet, want een klein en donker punt is gewoon onzichtbaar. Dat leidde tot
  DNA GAP 6 en tot spreiding als tweede drager. Het beeld werd daardoor niet alleen toegankelijker
  maar ook leesbaarder.
- **De verbinding was onzichtbaar** bij de oorspronkelijke waarde. Verband is een sterke uitspraak
  en moet dus ook sterk getekend worden, anders is het principe wel geïmplementeerd maar niet
  waarneembaar.
- **Het verschil tussen diffuus en scherp draagt de betekenis werkelijk.** In de toestand
  Verdichting is zonder één woord uitleg zichtbaar welke punten nog van Maculis zijn en welke bijna
  vaststaan.

Nog niet getoetst, en dat is de belangrijkste test: langdurige rust op echte hardware, over dagen.

---

## 12. Wat hierna komt

De interactieve visual study staat in `study/index.html`. De technische route staat in
`TECHNISCHE-ROUTE.md`. De drie beslissingen staan in `BESLISSINGEN.md`.
