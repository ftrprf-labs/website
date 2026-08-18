# Maculis e-mailhandtekening · het signatuurmoment

Motion study op ontwerp 1. Onderzoek, geen implementatie.

**Studie:** `docs/studies/signature-magic.html` (open in een browser, geen build nodig)
**Status:** niets geïntegreerd in `server/comm/signature.mjs`, niets gedeployed, verzendlogica onaangeraakt.

---

## 1. Uitgangspunt

Ontwerp 1 is **A, Minimal Seal**: het compacte, donkere blok met het zegel links, naam en rol in het
midden, en het woordmerk met payoff rechts. De latere varianten B en C zijn niet gebruikt en niet
gecombineerd. Waar deze studie afwijkt van ontwerp 1, is dat een fout in de studie, niet een keuze.

De inhoud in de studie (naam, rol, adres) komt letterlijk uit ontwerp 1. In productie komen die
velden uit config, nooit uit een ontwerp. Dat verschil staat los van dit onderzoek.

**De opdracht in één zin.** Het ontwerp mist geen elementen, het mist leven. De vraag is dus niet wat
erbij kan, maar wat er kan bewegen zonder dat er iets bij komt.

---

## 2. Het concept

Eén klein veld lichtpunten rond het zegel. Verder niets. Geen nieuw element, geen nieuwe kleur, geen
tweede accent, geen extra regel.

De canon bepaalt de grenzen, en die grenzen zijn strenger dan ze lijken:

| Regel uit de canon | Wat dat hier concreet betekent |
| --- | --- |
| koper is waargenomen en grond | de punten zijn koper, want zij zijn bevestigd licht |
| violet is betekenis in wording | hoogstens één violet punt, en alleen bij de regel in wording |
| beweging is onzekerheid | beweging mag dus niet de eindtoestand zijn |
| stilte is bevestigd inzicht | elke studie moet eindigen in stilte, niet in een lus |
| lichtsterkte volgt betekenis | een punt is helderder naarmate het dichter bij het inzicht staat |
| geen nieuwe grammatica | curve, ster, punt, koper, violet. Meer is er niet nodig |

Daaruit volgt de belangrijkste ontwerpregel van deze studie:

> **Beweging draagt geen informatie.** Wie niets ziet bewegen, mist niets. De statische handtekening
> is niet de armere versie, maar het beeld waar de beweging naartoe werkt.

Technisch vertaalt die regel zich in één harde eis: **frame 1 van de animatie, het laatste frame van
de animatie en de statische PNG zijn hetzelfde beeld.** Daarmee wordt de fallback geen compromis,
maar de bron. Ontwerp 1 blijft letterlijk leidend, ook in de bestandsvolgorde.

---

## 3. De drie studies

### 1. Bijna stil
Vijf punten bij de curve ademen op hun plek. Er verplaatst zich niets. Elk punt heeft een eigen
periode tussen 6,4 en 9,0 seconden, zodat het patroon nooit herkenbaar herhaalt.
`9,0 s ademcyclus · 8 fps · 5 punten · doorlopend · alleen de zegelcel`

**Wat er niet klopt.** Doorlopende beweging is in de canon doorlopende onzekerheid. Een handtekening
die nooit tot rust komt, bevestigt nooit iets. Daarbij: een ademhaling van negen seconden op 8 fps
overleeft de GIF-compressie nauwelijks, en wat overblijft valt onder de waarnemingsdrempel. Te weinig
om ooit opgemerkt te worden, en te veel om ooit te eindigen.

### 2. Waarneming
Zes punten komen op, naderen één keer traag het hart van het zegel, de ster bevestigt kort, en alles
laat weer los. Daarna is het stil.
`6,4 s · 10 fps · 6 punten · speelt één keer · alleen de zegelcel`

Tijdlijn: opkomen 0,0 tot 1,1 · naderen 1,7 tot 3,35 · bevestiging 3,35 tot 3,95 · loslaten 3,95 tot
5,6 · rust 5,6 tot 6,4. De punten stoppen op ongeveer 22 px van het midden, net buiten de horizontale
armen van de ster. Ze raken de ster nooit aan, want naderen is niet hetzelfde als bereiken.

**Waarom dit werkt.** Er is een gebeurtenis in plaats van een toestand: een aanleiding, één ademtocht
bevestiging, en een einde. Dat einde is de stilte die de canon bedoelt.

### 3. Magic
Licht loopt één keer over de bestaande curve, elf punten worden naar binnen getrokken, de ster
flakkert kort, en één punt wordt violet en reist over de tekst heen naar de regel in wording.
`7,4 s · 12 fps · 11 punten · speelt één keer · zegel plus tekstblok`

De lichtloop tekent de curve niet, maar loopt eroverheen. Dat is bewust: een curve die zich opbouwt,
zou betekenen dat frame 1 een onvolledig ontwerp 1 toont, en dat is precies wat niet mag.

**Wat het kost.** Twee dingen, en beide zijn zwaar.
Ontwerpmatig trekt het reizende punt de blik weg van de naam, en dat is nu net waar ontwerp 1 de blik
wil hebben. Technisch verlaat het punt de zegelcel, en in e-mail betekent dat: de hele handtekening
wordt één afbeelding, dus tekst wordt beeld, of twee losse GIF-bestanden die onmogelijk synchroon
kunnen lopen. De eerste optie kost selecteerbare tekst, schaalbaarheid en toegankelijkheid. De tweede
werkt niet.

---

## 4. Oordeel

Getoetst aan de paradox: je ziet bijna niets gebeuren, maar als je het ziet voelt de handtekening
ineens levend.

| | Blijft rustig | Wordt opgemerkt | Voelt levend | Volgt de canon |
| --- | --- | --- | --- | --- |
| 1 · Bijna stil | 96 | 24 | 30 | 48 |
| **2 · Waarneming** | **88** | **78** | **86** | **96** |
| 3 · Magic | 52 | 95 | 97 | 66 |

Studie 1 haalt de rust maar niet het leven. Studie 3 haalt het leven maar niet de rust. Studie 2 is de
enige die beide haalt, en de enige waarvan de beweging een reden, een hoogtepunt en een einde heeft.

## 5. Aanbeveling

**Studie 2, Waarneming, op 85 procent amplitude.**

Twee aanpassingen ten opzichte van de studie:

1. Piekhelderheid van de punten naar 85 procent, sterflits naar 0,4 in plaats van 0,5. In de studie
   kijk je van dichtbij naar één handtekening. In een inbox zie je hem naast een onderwerpregel.
2. Neem uit studie 3 precies één ding over: de lichtloop over de curve, op een derde van de sterkte en
   alleen in de aanloop (0,0 tot 1,6 s). Dat geeft de aanleiding zonder de aandacht op te eisen.

Wat niet meegaat, is het reizende violette punt. Dat is het punt waarop de magie de rust begint te
kosten, en daar heeft de magie verloren.

---

## 6. Technische haalbaarheid per client

Getoetst op de vier technieken die ertoe doen: animated GIF met lus 1, CSS `@keyframes`,
`@media (prefers-reduced-motion)` en `<picture>` met `<source>`.

| Client | GIF speelt | Lus 1x | keyframes | reduced motion | picture | Wat de ontvanger ziet |
| --- | :-: | :-: | :-: | :-: | :-: | --- |
| Apple Mail, macOS 14 en later | ja | ja | ja | ja | ja | volledige studie, of de PNG bij rustige beweging |
| Mail op iOS en iPadOS | ja | ja | ja | ja | ja | volledige studie, of de PNG bij rustige beweging |
| Gmail webmail | ja | ja | nee | nee | nee | volledige studie, via de Google beeldproxy |
| Gmail app, iOS en Android | ja | ja | nee | nee | nee | volledige studie |
| Outlook klassiek voor Windows | **nee** | n.v.t. | nee | nee | nee | **frame 1, dus ontwerp 1 exact** |
| Nieuw Outlook voor Windows | ja | ja | nee | deels | deels | volledige studie |
| Outlook.com in de browser | ja | ja | nee | deels | deels | volledige studie |
| Outlook voor macOS | ja | ja | deels | deels | deels | volledige studie |
| Outlook op iOS en Android | ja | ja | nee | nee | nee | volledige studie |
| Yahoo Mail | ja | ja | deels | nee | nee | volledige studie |
| Thunderbird | ja | ja | ja | deels | ja | volledige studie |
| Proton Mail webmail | ja | ja | deels | nee | deels | volledige studie zodra beelden zijn toegestaan |
| Samsung Mail | ja | ja | ja | nee | deels | volledige studie |
| Superhuman, HEY, Spark | ja | ja | ja | deels | ja | volledige studie |

Bronnen: [caniemail, CSS animation](https://www.caniemail.com/features/css-animation/),
[caniemail, @keyframes](https://www.caniemail.com/features/css-at-keyframes/),
[caniemail, prefers-reduced-motion](https://www.caniemail.com/features/css-at-media-prefers-reduced-motion/),
[caniemail, APNG](https://www.caniemail.com/features/image-apng/),
[Email on Acid over GIF en Outlook](https://www.emailonacid.com/blog/article/email-development/gifs-and-outlook-what-can-we-do/),
[Email on Acid over het nieuwe Outlook voor Windows](https://www.emailonacid.com/blog/article/industry-news/new-outlook-for-windows/),
[Litmus over CSS animaties in e-mail](https://www.litmus.com/blog/understanding-css-animations-in-email-transitions-and-keyframe-animations),
[Parcel, images in email](https://parcel.io/guides/images-in-email).

### Waarom GIF en niets anders

- **CSS `@keyframes`** werkt alleen in de Apple clients, in Thunderbird en deels in Yahoo. Gmail en
  Outlook strippen de regels volledig. Twee motion-bronnen naast elkaar zetten, CSS voor Apple en GIF
  voor de rest, levert in Apple Mail dubbele beweging op. Eén bron is zuiverder, en die ene bron is
  de GIF, want die haalt Apple ook.
- **APNG** valt in Gmail en Outlook voor Windows terug op het eerste frame. Dat is veilig, maar levert
  niets op boven GIF: het zegel op een vlakke inktgrond heeft ongeveer veertig kleuren nodig, dus de
  kleurdiepte van GIF is hier geen beperking.
- **Animated WebP** breekt in Outlook voor Windows en wordt door Gmail omgezet naar een stilstaand
  beeld. Risico zonder winst.
- **SVG met SMIL of CSS** wordt door Gmail volledig geblokkeerd en door Outlook niet gerenderd.
- **Video** is in e-mail geen serieuze optie en past sowieso niet bij een handtekening.

### Wat GIF technisch oplegt

- **Harde transparantie.** GIF kent één transparante kleur, geen alfakanaal. Zachte lichtpunten op een
  doorzichtige achtergrond krijgen daardoor gekartelde randen. Oplossing: de zegelcel is
  **ondoorzichtig inkt**. Dat kan, omdat ontwerp 1 zelf al een donker blok is.
- **Beperkt palet.** 64 kleuren is ruim genoeg voor koper op inkt. Dithering uit, anders gaan de
  zachte randen ruisen tijdens de beweging.
- **Lus 1.** De Netscape-lusteller op 1 zetten. Sommige clients starten de GIF opnieuw bij opnieuw
  openen of bij hertekenen van het venster. Dat is acceptabel: de gebeurtenis duurt zes seconden en
  eindigt altijd op hetzelfde beeld.
- **Alleen de zegelcel is beeld.** De handtekening is een tabel met twee kolommen: links de
  afbeelding, rechts echte tekst. Naam, rol, adres en payoff blijven selecteerbaar, doorzoekbaar,
  schaalbaar en toegankelijk. Dit is ook precies de reden dat studie 3 duur is.

---

## 7. Bouwspecificatie van de aanbevolen variant

| Onderdeel | Waarde | Waarom |
| --- | --- | --- |
| Bestand | `maculis-seal-perceive-v1.gif` | versie in de bestandsnaam, zodat caches nooit een oude versie vasthouden |
| Afmeting | 300 bij 300 px, getoond op 150 px | dubbele dichtheid voor retina, vierkante zegelcel |
| Beeldsnelheid | 10 fps | genoeg voor traag naderende punten, hoger levert alleen bytes op |
| Duur | 6,4 s, 64 frames | na het laatste frame gebeurt er niets meer |
| Lus | één keer | Netscape-lusteller 1 |
| Kleuren | palet van 64, dithering uit | koper op inkt heeft weinig kleuren nodig |
| Budget | maximaal 240 kB | meten na export. Boven budget eerst frames eruit, nooit de rust eruit |
| Achtergrond | ondoorzichtig `#0a0b10` | GIF kent alleen harde transparantie |
| Statische PNG | `maculis-seal-rest-v1.png` | identiek aan frame 1 en aan het laatste frame. Dit bestand is de waarheid, de GIF volgt |
| Levering | `<picture>` met `<source media="(prefers-reduced-motion: reduce)">` naar de PNG, `<img>` naar de GIF | clients zonder picture krijgen gewoon de GIF |
| Alt tekst | `Maculis` | beschrijft het merk, nooit de animatie |
| Platte tekst | ongewijzigd | de tekstversie noemt beweging nergens |

### De fallbackladder

| | Situatie | Wat er gebeurt |
| --- | --- | --- |
| 01 | Apple Mail of iOS met rustige beweging aan | de statische PNG, geen beweging, geen verschil in inhoud |
| 02 | Apple Mail, Gmail, nieuw Outlook, Outlook.com, Yahoo, Thunderbird, Proton | de GIF speelt één keer en komt tot stilstand op datzelfde beeld |
| 03 | Outlook klassiek voor Windows | frame 1, en frame 1 is ontwerp 1. Geen kapot beeld, geen halve animatie |
| 04 | Beelden geblokkeerd of platte tekst | alt tekst en de platte tekstversie, die beweging nergens noemen |

Alle vier de paden komen uit op hetzelfde beeld. Dat is geen toeval maar de constructie.

### Restrisico's

- **Geforceerde donkere modus.** Outlook.com, het nieuwe Outlook en Gmail draaien kleuren om. De
  inktgrond expliciet zetten en de omkering opvangen met `[data-ogsc]` en `[data-ogsb]`. Testen met
  donkere modus aan, niet alleen uit.
- **Gmail knipt** berichten boven ongeveer 102 kB HTML af. Afbeeldingen tellen daar niet in mee, dus
  de GIF is geen risico, maar de handtekening moet wel compacte HTML blijven.
- **Rustige beweging bereikt Gmail niet.** Gmail kent de media query niet en negeert `<picture>`. Wie
  daar rustige beweging aan heeft staan, krijgt toch de GIF. Dat is de reden dat de beweging één keer
  speelt en niet loopt: een eenmalige gebeurtenis van zes seconden is verdedigbaar, een eeuwige lus
  niet.
- **Beeldproxy's** van Gmail en Outlook cachen de GIF. Bij een wijziging altijd een nieuwe
  bestandsnaam gebruiken.

---

## 8. Wat deze studie bewust niet doet

- Niets geïntegreerd in `server/comm/signature.mjs`, de verzendlogica is niet aangeraakt.
- Niets gedeployed, geen assets toegevoegd aan `public/brand`.
- Geen keuze gemaakt over naam, adres of payoff. Die komen uit config, nooit uit een ontwerp.

---

## 9. Verfijningsronde op Waarneming

**Studie:** `docs/studies/signature-waarneming.html`
**Status:** nog steeds niets geïntegreerd, niets gedeployed.

Richting akkoord: Waarneming is de gekozen variant. De vondst is vastgezet als harde ontwerpvoorwaarde:

> **Eerste frame is gelijk aan het laatste frame en aan de statische fallback.** Ontwerp 1 blijft
> volledig intact, de magie bestaat uitsluitend uit een eenmalig moment dat terugkeert naar exact
> dezelfde rusttoestand.

Deze ronde onderzoekt uitsluitend timing en onderlinge vertraging, amplitude en afstand tot het hart,
de lichtrespons van de ster, de eventuele lichtloop over de curve, en het exacte moment van stilte.
Geen nieuwe concepten, geen extra elementen, geen reizend violet punt.

### De drie microvarianten

| | 1 · Late adem | 2 · Eén ademtocht | 3 · Grond en licht |
| --- | --- | --- | --- |
| Stille aanloop | 2,2 s | 1,6 s | 1,2 s |
| Punten | 3 | 4 | 5 |
| Onderlinge vertraging | 0,55 s | 0,34 s | 0,22 s |
| Nadering | 26 px | 24 px | 23 px |
| Piekhelderheid | 0,42 | 0,52 | 0,50 |
| Sterrespons | 0,12 | 0,30 | 0,26 |
| Lichtloop over de curve | geen | geen | 0,18 piek, dooft voor de opening |
| Volledig stil | 6,9 s | 6,6 s | 7,6 s |
| Frames bij 10 fps | 74 | 70 | 80 |

Drie wijzigingen gelden voor alle drie, en die doen het meeste werk:

1. **Een stille aanloop.** De vorige versie begon meteen, waardoor het voelde als iets dat werd
   afgespeeld. Nu zie je eerst de handtekening zoals hij is. Pas als je niet meer op iets wacht,
   gebeurt het. In de GIF kost die stilte niets: het is één frame met een lange vertraging.
2. **Een ongelijk einde.** De punten doven met een onderlinge vertraging van enkele tienden uit. Een
   gelijktijdig einde leest als een clip die afloopt, een ongelijk einde als iets dat wegtrekt.
3. **De ster ademt in plaats van te flitsen.** Asymmetrisch: snel op, trager af. Een flits wijst naar
   zichzelf, een ademtocht is een reactie op iets anders.

Daarbij vertraagt de nadering nu en stopt op vier procent van het doel. De punten komen dus nooit aan,
want naderen is niet bereiken. En het rustframe wordt aan het einde expliciet 0,4 s vastgehouden,
zodat het laatste frame aantoonbaar hetzelfde beeld is als het eerste.

### Oordeel op de vijf criteria

| Criterium | 1 | 2 | 3 |
| --- | :-: | :-: | :-: |
| Verwondering | 5 | **9** | 8 |
| Rust | **10** | 9 | 7 |
| Maculis-eigenheid | 8 | **9** | **9** |
| Aandacht bij naam en afzender | **10** | 9 | 7 |
| Waargenomen in plaats van afgespeeld | 7 | **9** | 6 |
| **Totaal** | 40 | **45** | 37 |

### Aanbeveling: variant 2, Eén ademtocht

Variant 1 haalt de rust volledig, maar de verwondering blijft uit. Wat je niet opmerkt, kun je ook niet
bijna gemist hebben. Variant 3 is het mooiste beeld, maar zet twee gebeurtenissen achter elkaar, en
precies dat maakt dat het weer voelt als iets dat wordt afgespeeld. De lichtloop hoort thuis in een
groter formaat, niet in een zegel van honderdvijftig pixels. Mijn advies is om hem hier niet alsnog toe
te voegen: op het vijfde criterium kost hij meer dan hij oplevert.

Variant 2 heeft één gebeurtenis, één reactie, en een einde dat niet netjes samenvalt. De stilte vooraf
doet het meeste werk: omdat er anderhalve seconde niets gebeurt, kijk je al niet meer, en dan beweegt
er iets in je ooghoek.

### Gevolgen voor de bouwspecificatie uit hoofdstuk 7

| Onderdeel | Vorige ronde | Variant 2 |
| --- | --- | --- |
| Duur | 6,4 s | 7,0 s, inclusief 0,4 s vastgehouden rustframe |
| Frames | 64 | 70 |
| Punten | 6 | 4 |
| Piekhelderheid | 0,60 | 0,52 |
| Nadering | 22 px | 24 px |
| Sterrespons | flits 0,40, symmetrisch | ademtocht 0,30, asymmetrisch, 0,18 op en 0,32 af |
| Einde | gelijktijdig | gespreid over 0,6 s |
| Bestandsgrootte | budget 240 kB | ruim onder budget, minder bewegende pixels plus een lange eerste framevertraging |

Al het overige uit hoofdstuk 7 blijft ongewijzigd: alleen de zegelcel is beeld, ondoorzichtige
inktgrond, lus 1, levering via `picture` met een `source` voor rustige beweging, alt tekst die de
animatie niet noemt.
