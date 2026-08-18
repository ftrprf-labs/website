# Maculis op WhatsApp · het slotmoment

Onderzoek en visuele studie. Geen implementatie.

**Studie:** `docs/studies/whatsapp-signature.html` (open in een browser, geen build nodig)
**Status:** niets geïntegreerd, niets gedeployed, verzendlogica onaangeraakt, geen template gewijzigd,
geen Meta-configuratie gewijzigd, geen bericht verzonden.
**De goedgekeurde e-mailhandtekening is niet aangeraakt.**

---

## 1. Hoe WhatsApp vandaag werkt in Maculis

Er bestaan twee WhatsApp-routes naast elkaar. Ze zijn technisch en organisatorisch verschillend, en
dat verschil bepaalt bijna alles wat hierna volgt.

| | Route 1 · Uitnodiging | Route 2 · Communication Layer |
| --- | --- | --- |
| Waar | `server/messages.mjs`, `server/index.mjs:437` | `server/comm/providers/whatsapp.mjs` |
| Techniek | `wa.me` deeplink | Meta WhatsApp Business Cloud API |
| Status | **in productie** | **MOCK**, wacht op credentials |
| Verzender | de app van de medewerker zelf | een zakelijk WhatsApp-nummer |
| Verzenden | volledig met de hand | vanuit de composer, met menselijke goedkeuring |
| Media | onmogelijk via de link | wel in de adapter, niet in de verzendketen |
| Sign-off | geen | geen |

### 1.1 Route 1, de uitnodiging, draait vandaag echt

`buildWhatsApp()` rendert het sjabloon voor één tester en bouwt daar een `wa.me`-link van met de
tekst in de querystring. De server verzendt niets. De medewerker opent WhatsApp, drukt daar zelf op
verzenden, en bevestigt daarna handmatig in Testerbeheer (`public/app.js:568` en verder). Openen is
expliciet niet hetzelfde als verzenden: de status schuift pas naar `SENT` na die bevestiging
(`server/index.mjs:427`). De route is fail closed op toestemming, dus zonder expliciete `OPTED_IN`
geeft de server 403 en gebeurt er niets.

Consequentie voor dit onderzoek: **op deze route kan software geen afbeelding, sticker of GIF
meesturen.** Een `wa.me`-link draagt alleen tekst. Alles wat geen tekst is, komt hier uit de handen
van de mens die het bericht verstuurt.

### 1.2 Route 2, de Communication Layer, is voorbereid maar niet verbonden

De adapter is geschreven voor de officiële Cloud API, nooit voor scraping of browserautomatisering.
Zolang `WHATSAPP_PROVIDER`, `WHATSAPP_PHONE_NUMBER_ID` en `WHATSAPP_ACCESS_TOKEN` ontbreken, draait
het kanaal als volledige mock (`server/config.mjs:126`). De mock slaagt altijd en levert een
synthetisch bericht-id, zodat de interne keten testbaar is. Er gaat vandaag dus geen enkel WhatsApp-bericht
via deze route naar buiten.

De live scaffold ondersteunt drie vormen: tekst, een goedgekeurde template, en één afbeelding via
`mediaUrl`. Belangrijk detail: **`sendOnChannel()` geeft `mediaUrl` niet door aan de adapter**
(`server/comm/send.mjs`). De composer kan op WhatsApp dus alleen tekst versturen, ook zodra het
kanaal live is. Media meesturen vraagt een kleine, bewuste codewijziging.

### 1.3 Handmatig of automatisch

Niets aan WhatsApp is geautomatiseerd. De AI schrijft alleen concepten, en de verzendfunctie is per
definitie een menselijke handeling. Er is geen achtergrondtaak, geen bulk, geen drip, geen
herinnering die uit zichzelf een WhatsApp-bericht stuurt. Follow-ups (`server/comm/followups.mjs`)
zijn taken voor een mens, geen verzendopdrachten.

Dat is voor dit vraagstuk gunstig. Een slotmoment dat afhangt van menselijk oordeel past bij een
systeem waarin de mens sowieso op verzenden drukt.

### 1.4 Welke media technisch worden ondersteund

| | Route 1 (`wa.me`) | Route 2 (Cloud API, mock) | Route 2 als hij live staat |
| --- | :-: | :-: | :-: |
| Tekst | ja | ja | ja |
| Afbeelding | nee | in de adapter | ja, na doorgifte van `mediaUrl` |
| GIF | nee | nee | **nee**, zie 1.7 |
| Video | nee | nee | ja, met code erbij |
| Sticker | nee | nee | ja, met code erbij |
| Inkomende media | n.v.t. | wordt weggegooid | vraagt opslag en weergave |

Inkomende media worden nu bewust genegeerd: `normalizeInbound()` levert `media: []` en
`receiveChannelInbound()` bewaart alleen tekst. Wie ons straks een foto stuurt, komt binnen als een
leeg bericht. Dat is een bestaand gat, los van dit onderzoek, maar het is goed om te weten voordat
we iets met media beloven.

### 1.5 Hoe een gesprek begint en eindigt

Een gesprek begint op twee manieren: iemand stuurt ons iets, of wij openen zelf een gesprek vanuit
de workspace. Inkomend wordt een gesprek `NEW`, uitgaand wordt het `ANSWERED`, en een gesloten
gesprek dat opnieuw inkomend verkeer krijgt gaat terug naar `OPEN`.

**Er is geen einde.** Geen automatische afsluiting, geen inactiviteitstermijn, geen systeemgebeurtenis
die zegt: dit gesprek is klaar. Dat is de belangrijkste vondst voor hoofdstuk 4. Een regel als
"stuur het slot bij een echte afronding" kan vandaag niet uit een bestaande status worden afgeleid.
Het is een menselijk oordeel, en dat moet het ontwerp ook durven zeggen.

### 1.6 Templates en vaste berichttypen

Er is precies één vast WhatsApp-berichttype: de uitnodiging (`DEFAULT_TEMPLATE.whatsapp` in
`server/config.mjs`), bewerkbaar in de instellingen. Het is een intern sjabloon met variabelen als
`{first_name}` en `{personal_url}`, geen Meta-template. Meta-templates bestaan bij ons niet, want er
is geen WhatsApp Business-account gekoppeld.

### 1.7 Wat WhatsApp en Meta opleggen

Deze regels gelden voor route 2 zodra die live gaat. Route 1 valt eronder als gewoon persoonlijk
WhatsApp-gebruik en kent ze niet.

**Het venster van 24 uur.** Vrije berichten mogen alleen binnen 24 uur na het laatste bericht van de
klant. Daarbuiten is uitsluitend een vooraf goedgekeurde template toegestaan, en Meta weigert vrije
berichten buiten dat venster. Elk antwoord van de klant opent een nieuw venster.

**Templates zijn ingedeeld en worden beoordeeld.** Meta rekent per gesprek en per categorie: service,
utility, authentication, marketing. Een template met een merkbeeld dat geen functioneel doel dient,
belandt in de marketingcategorie, kost geld per gesprek, en drukt op de kwaliteitsscore van het
nummer als ontvangers hem wegdrukken.

**Media.** De Cloud API accepteert voor een afbeelding alleen `image/jpeg` en `image/png`. Een
geanimeerde GIF wordt geweigerd (foutcode 131053). Beweging kan dus maar op twee manieren:

- **video**, als `video/mp4`, met een afspeelknop en een voorvertoning. In een chat leest dat als
  inhoud die je moet openen, niet als een handtekening;
- **sticker**, als WebP van 512 bij 512 pixels. Statisch maximaal 100 kB, geanimeerd maximaal 500 kB.

**Hoe een geanimeerde sticker zich gedraagt.** Gerapporteerd gedrag is dat een geanimeerde sticker
één keer speelt zodra hij in beeld komt, daarna stil blijft, en opnieuw speelt wanneer je er langs
scrollt. Dat komt dicht bij wat wij willen, maar het is niet hetzelfde als de GIF in e-mail, die
definitief stopt. De bronnen hiervoor zijn oud en het gedrag verschilt mogelijk per client, dus dit
is de eerste aanname die we op een echt toestel moeten toetsen voordat we richting C bouwen.

Bronnen: [SaySimple over het venster van 24 uur](https://www.saysimple.com/blog/whatsapp-business-api-what-is-a-customer-care-window),
[Infobip over vrije berichten](https://www.infobip.com/docs/whatsapp/message-types-and-templates/free-form-messages),
[WhatsApp Node.js SDK, sticker](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/sticker/),
[HighLevel over foutcode 131053](https://help.gohighlevel.com/support/solutions/articles/155000007937-error-131053-media-upload-error),
[Chatwoot issue 12260 over geweigerde MIME-types](https://github.com/chatwoot/chatwoot/issues/12260),
[WABetaInfo over het afspeelgedrag van geanimeerde stickers](https://x.com/WABetaInfo/status/1276189232923578372).

### 1.8 Is er al een afzenderidentiteit of sign-off?

Nee. De handtekening wordt centraal toegevoegd in `sendOnChannel()`, maar uitsluitend voor e-mail:
alleen bij `channel === 'EMAIL'` gaat de body door `wrapEmail()`. WhatsApp krijgt de kale tekst.
Er staat vandaag dus geen naam, geen zegel, geen payoff en geen afsluiting onder een WhatsApp-bericht.

Dat is geen vergeten stukje, maar precies goed. WhatsApp toont de afzender al bovenaan het scherm,
permanent, in elk bericht. Een identiteitsblok herhaalt daar alleen wat er al staat.

---

## 2. De ontwerpvraag

> Wat is de kleinste WhatsApp-native handeling waardoor een ontvanger voelt: dit was Maculis?

Het medium bepaalt het antwoord. E-mail is een document dat je opent: de handtekening is er al
voordat je hem opmerkt, en hij mag ruimte innemen omdat de brief zelf ruimte inneemt. WhatsApp is een
ruimte waarin twee mensen elkaar afwisselen. Daar arriveert alles, in het bijzijn van de ander, in
een venster waarin het vorige bericht nog leesbaar is. Wat in e-mail terughoudend is, is in WhatsApp
al luid.

Daaruit volgen drie regels die voor alle richtingen gelden:

1. **Geen identiteitsblok.** Naam, rol, e-mailadres en website zijn hier ruis.
2. **Geen breedte.** Niets mag de volle breedte van het gesprek pakken.
3. **Het moment doet het werk, niet het beeld.** In WhatsApp is de plaats waar iets verschijnt
   belangrijker dan hoe het eruitziet.

### Richting A · Stil slot

Eén los bericht met alleen de slotregel, verstuurd nadat het inzicht is geland.

Werkt op beide routes, vandaag, zonder één regel code. Kost niets, valt nooit om, en is in geen
enkele client kapot te krijgen. De zwakte is dat tekst in een chat snel leest als een afsluitende
opmerking van een persoon, niet als een teken van Maculis. Wie de payoff niet kent, ziet gewoon een
zin. Er is geen drempel tussen "dit was een gesprek" en "dit was Maculis".

### Richting B · Zegel

Dezelfde slotregel, gevolgd door één stille sticker met het zegel. Geen tekst in het beeld, geen
woordmerk, geen kader.

Dit is de vorm die het dichtst bij de e-mailhandtekening staat, om een reden die uit die studie zelf
komt: het rustbeeld is daar de waarheid en de beweging een toevoeging die geen informatie draagt.
Als dat klopt, dan is het zegel in rust niet de armere versie van C, maar de kern ervan.

Een sticker is bovendien het enige beeldformaat in WhatsApp dat niet leest als bijlage. Hij heeft
geen kader, geen achtergrond, geen bijschrift en geen downloadknop. Hij staat gewoon in het gesprek.
Dat is precies de toon die we zoeken.

### Richting C · Levende signatuur

Hetzelfde zegel, dat één keer reageert en daarna volledig tot rust komt.

De filosofie is die van de e-mailhandtekening, de uitvoering niet. In e-mail werkt de stilte vooraf
omdat de handtekening al aanwezig is terwijl jij de brief leest: je kijkt er niet naar, en dan
beweegt er iets in je ooghoek. In WhatsApp arriveert de sticker, dus je kijkt er wel naar. De stilte
vooraf wordt daardoor nog belangrijker: je ziet eerst een stilstaand zegel, je blik gaat terug naar
de tekst, en pas dan gebeurt het.

Voorstel voor de WhatsApp-timing, afgeleid van de bevroren referentie maar korter, met één punt
minder omdat het zegel hier op ongeveer 118 pixels staat in plaats van 150:

| | E-mail (bevroren) | WhatsApp (voorstel) |
| --- | --- | --- |
| Stilte vooraf | 1,60 s | 1,10 s |
| Punten | 4, vertraging 0,34 s | 3, vertraging 0,26 s |
| Nadering | 24 px, tot 96 procent | zelfde verhouding, tot 96 procent |
| Adem van de ster | 0,18 s op, 0,32 s af | 0,14 s op, 0,26 s af |
| Volledig stil | 6,60 s | 4,00 s |
| Duur | 7,00 s | 4,20 s |
| Lus | geen | geen |

De grammatica verandert niet: de punten naderen maar komen nooit aan, de ster ademt in plaats van te
flitsen, het einde valt niet netjes samen, en het laatste beeld is exact het eerste.

---

## 3. Wanneer hij verschijnt

Dit weegt zwaarder dan het ontwerp. Scène 06 in de studie laat zien waarom: hetzelfde gebaar onder
ieder bericht is binnen één gesprek een footer geworden.

### De regel

Het slot verschijnt alleen wanneer **alle drie** waar zijn:

1. **Maculis heeft iets teruggegeven.** Een waarneming, een uitkomst, een inzicht. Niet een afspraak,
   niet een bevestiging, niet een planning.
2. **De beurt is klaar.** Er staat geen vraag open, van beide kanten niet, en het laatste bericht is
   van ons.
3. **Het is lang geleden.** Deze persoon heeft het slot in de afgelopen dertig dagen niet gezien.

### Nooit

- Niet onder de uitnodiging of enig eerste koud bericht. Er is dan nog niets waargenomen in de
  relatie, en het zegel leest als een logo.
- Niet als antwoord op een vraag. Een antwoord is geen afronding.
- Niet twee keer in hetzelfde gesprek.
- Niet bij excuses, storingen, planning of iets praktisch.
- Niet zolang het menselijke gesprek zichtbaar doorloopt.
- Niet onmiddellijk. Een slot dat binnen enkele seconden na het inzicht komt, leest als
  geautomatiseerd. Even wachten hoort bij het gebaar.

### Aanbevolen frequentie

**Ten hoogste eens per dertig dagen per persoon, en in de praktijk enkele keren per relatie per
jaar.** De toets is eenvoudig: ziet dezelfde persoon het vaker dan eens per maand, dan is de regel
gebroken, niet het ontwerp.

Deze frequentie heeft ook een technische opbrengst. Omdat het slot altijd aan het eind van een levend
gesprek staat, valt het altijd binnen het venster van 24 uur. Er is dus nooit een Meta-template voor
nodig, en er is nooit een marketingcategorie in het spel.

### Wie de regel uitvoert

Vandaag: de mens, want het systeem kent geen einde van een gesprek (zie 1.5). Dat is verdedigbaar,
omdat de mens sowieso op verzenden drukt. Wat later kan helpen, is een stille grens in de workspace
die het slot blokkeert wanneer het minder dan dertig dagen geleden naar deze persoon ging. Die grens
is een beveiliging tegen sleet, geen aanzetknop. Er is nu niets van gebouwd.

---

## 4. Verhouding tot de e-mailhandtekening

### Wat ze absoluut delen

- De betekenisgrammatica: koper is waargenomen, violet is in wording, jade is bevestigd, beweging is
  onzekerheid, stilte is bevestigd inzicht.
- De vorm van het zegel: dezelfde boog, dezelfde ster, dezelfde verhoudingen, uit dezelfde bron
  (`docs/studies/tools/seal-reference.js`).
- Eén gebeurtenis, daarna stilte. Nooit een lus.
- Beweging draagt geen informatie. Wie niets ziet bewegen, mist niets.
- Het rustbeeld is de waarheid, niet de fallback.
- De payoff: "Kijk nog eens."

### Wat WhatsApp bewust anders doet

| | E-mail | WhatsApp |
| --- | --- | --- |
| Identiteit | naam, rol, e-mail, website, woordmerk | niets, de app toont de afzender al |
| Grond | ondoorzichtig inktpaneel | vrijstaand, met alfa, op het behang van de chat |
| Formaat | blok van 613 bij 186 px | vierkant van ongeveer 118 px |
| Aanwezigheid | er al bij het openen | komt aan, in het bijzijn van de ander |
| Duur van de beweging | 7,0 s | 4,2 s |
| Ritme | onder elke verzonden mail | zelden, alleen bij een echte afronding |
| Wat het bepaalt | de vormgeving | het moment |

### Zijn de bestaande assets herbruikbaar?

**De bron wel, de bestanden niet.**

| Asset | Herbruikbaar | Waarom |
| --- | :-: | --- |
| `docs/studies/tools/seal-reference.js` | **ja** | de enige bron van de vorm. Het WhatsApp-bestand wordt hieruit gegenereerd, dus er blijft één waarheid |
| `maculis-seal-rest-v1.png` | nee | 300 bij 300, ondoorzichtige inktgrond, en het merk vult maar zestig procent van het vlak. Als sticker leest het te klein |
| `maculis-seal-perceive-v1.gif` | nee | GIF wordt door de Cloud API geweigerd, duurt 7,0 s en is ondoorzichtig |
| `maculis-wordmark-v1.png` | nee | een woordmerk hoort niet in een persoonlijk gesprek |
| `maculis-spark-v1.png`, de drie contacticoontjes | nee | horen bij het identiteitsblok, dat hier vervalt |

Een aparte WhatsApp-beweging is dus nodig, maar geen apart ontwerp. Dezelfde referentie, andere tijd,
andere uitsnede, ander bestandsformaat.

### Nieuwe assets

| Bestand | Wat | Eisen |
| --- | --- | --- |
| `maculis-seal-rest-wa-v1.webp` | het stille zegel | 512 bij 512, transparant, maximaal 100 kB, merk vult ongeveer tachtig procent van het vlak |
| `maculis-seal-perceive-wa-v1.webp` | de gebeurtenis, later | 512 bij 512, transparant, geanimeerd, maximaal 500 kB, geen lus. Eerst bouwen en meten, dan pas beoordelen |

De 500 kB is de scherpste grens. Vijftig frames van 512 bij 512 met alfa passen daar niet
vanzelfsprechend in. Wat helpt: de stilte vooraf is één frame met een lange vertraging, er beweegt
maar een klein deel van het vlak, en het aantal punten is al terug naar drie. Of het past, blijkt pas
uit een echte export.

---

## 5. De slotregel

"Kijk nog eens." staat in e-mail naast het woordmerk. Daar leest het als payoff: een zin die bij het
merk hoort. In WhatsApp staat dezelfde zin als los bericht in een gesprek tussen twee mensen, en dan
verandert de grammaticale lading. Het wordt een aansporing aan de ontvanger.

Dat is niet per se erg. Na een teruggegeven inzicht is "Kijk nog eens." precies wat je bedoelt, en de
gebiedende wijs maakt het eerder rustig dan dwingend, omdat er niets achteraan komt. Het wordt pas
ongemakkelijk wanneer het bericht op zichzelf staat, zonder inzicht ervoor. Dan klinkt het als een
por. Dat is een argument voor de plaatsingsregel uit hoofdstuk 3, niet voor andere woorden.

**Advies: laat de payoff ongewijzigd.** De onderstaande varianten staan in de studie als hypothese,
niet als voorstel voor een nieuwe merkregel.

| Hypothese | Wat het doet | Risico |
| --- | --- | --- |
| "Kijk nog eens." | de canon, ongewijzigd | kan als los bericht kort aanvoelen |
| "Kijk gerust nog eens." | minder gebiedend, meer uitnodigend | zachter, en daarmee minder Maculis |
| "Kijk er straks nog eens naar." | verwijst terug naar het inzicht, geeft tijd | drie woorden meer, en die kosten precies de stilte |
| "Maculis heeft gekeken. Kijk jij ook nog eens?" | tegenvoorbeeld | legt uit wat het gebaar zelf al doet |

De vierde staat er om te laten zien wat er misgaat zodra het slot zichzelf verklaart.

---

## 6. De visuele studie

`docs/studies/whatsapp-signature.html`. Eén doorlopend gesprek met een tester, geen losse
logo-demonstratie. Wat je kunt doen:

- **Richting** wisselen tussen geen, A, B en C op dezelfde plek in hetzelfde gesprek.
- **Zes scènes:** het gesprek zonder signatuur, het moment vlak ervoor, het slot in rust, de
  gebeurtenis, de toestand dagen later, en het tegenvoorbeeld waarin het onder ieder bericht staat.
- **Beweging** op 1×, ½× en ¼×.
- **Studiemodus:** de gebeurtenis start na een onvoorspelbare pauze van 2 tot 9 seconden. Dat is de
  enige manier om eerlijk te toetsen of je hem opmerkt zonder hem te verwachten. Wie op een knop
  drukt en dan kijkt, ziet altijd iets.
- **Zegel** vrijstaand of op een inktvlak, en **WhatsApp** in donker of licht. Deze twee samen zijn
  een echte beslissing: een sticker heeft één bestand voor beide thema's, en koperlicht op een lichte
  achtergrond verliest kracht. Vergelijk vrijstaand op licht met vrijstaand op donker voordat je
  kiest.
- **Slotregel** wisselen tussen de canon en de drie hypothesen.

De beweging wordt live getekend uit dezelfde wiskunde als de bevroren referentie, dus wat je in de
studie ziet is wat een gebouwde sticker zou tonen, op de compressie na.

---

## 7. Eindadvies

> **Richting B: de slotregel als los bericht, gevolgd door één stil zegel als sticker. Alleen bij een
> echte afronding nadat Maculis iets heeft teruggegeven. Ten hoogste eens per dertig dagen per
> persoon.**

**Waarom B en niet C.** De e-mailstudie heeft één vondst opgeleverd die harder is dan alle andere:
het rustbeeld is de waarheid en de beweging draagt geen informatie. Wie die regel serieus neemt,
komt in een nieuw medium eerst met het rustbeeld en pas daarna met de beweging. C is geen ander
ontwerp dan B, maar hetzelfde ontwerp met een gebeurtenis erbij. We kunnen die gebeurtenis later
toevoegen zonder iets terug te nemen.

Daar komt bij dat drie dingen aan C nog niet bewezen zijn: of 512 bij 512 met alfa onder 500 kB
blijft, of een geanimeerde sticker werkelijk stopt in plaats van te herhalen bij scrollen, en of dat
gedrag hetzelfde is op iOS en Android. Alle drie zijn te toetsen, geen ervan is te raden.

**Waarom niet A alleen.** A is veilig maar maakt geen moment. Er is geen drempel tussen een gewone
afsluitende zin en het teken dat Maculis heeft gekeken. Het zegel maakt die drempel, en juist omdat
het zelden komt, blijft het er een.

**Waarom niet C nooit.** C blijft het doel. Als de metingen goed uitpakken, is de logische volgorde:
B nu, C erbij zodra het bestand klopt, met exact dezelfde vorm en hetzelfde rustframe, zodat niemand
die alleen het stilstaande beeld ziet iets mist.

### Wat betrouwbaar werkt in onze huidige route

- **De slotregel als los bericht.** Op beide routes, vandaag, zonder codewijziging.
- **Het zegel op route 1.** De medewerker verstuurt zelf, dus een sticker in een eigen stickerpak op
  het toestel werkt zonder API, zonder deploy en zonder Meta-configuratie. Dat is vandaag de enige
  volledig werkende weg naar B, en hij is verrassend degelijk.
- **Toestemming.** WhatsApp vereist bij ons expliciete opt-in voor elk doel, en die grens zit
  serverzijdig. Het slot verandert daar niets aan en hoort dat ook niet te doen.

### Wat alleen experimenteel kan

- **Het zegel via route 2.** Vraagt drie dingen: verbonden credentials, doorgifte van `mediaUrl` in
  `sendOnChannel()`, en ondersteuning voor het berichttype sticker in de adapter. Geen van drieën is
  groot, alle drie zijn productielogica.
- **De bewegende sticker.** Bouwen, exporteren, meten, en op een echt toestel toetsen. Pas daarna een
  oordeel.
- **De koelingsregel in software.** Vandaag is er geen einde van een gesprek in het datamodel.

### Wat ik nadrukkelijk niet zou bouwen

- Een handtekening die automatisch onder elk WhatsApp-bericht wordt geplakt, zoals `wrapEmail()` dat
  voor e-mail doet. Dat maakt het gebaar binnen een week tot een footer.
- Een lus. Niet in een sticker, niet in een GIF, nergens.
- Het e-mailhandtekeningblok als afbeelding in WhatsApp.
- Een Meta-template met het zegel als media-header. Dat plaatst het merkbeeld precies op het koude
  moment waarop het als reclame leest, met kosten en een kwaliteitsscore eraan vast.
- Video als drager van de beweging. Een afspeelknop maakt van een handtekening een filmpje.
- Een unieke asset-URL per ontvanger. De e-mailhandtekening is bewust niet volgbaar, en dat blijft zo.
- Tekst in het zegel. Woorden horen in een tekstbericht, waar ze doorzoekbaar en vertaalbaar zijn.

---

## 8. Wat deze studie bewust niet doet

- Niets geïntegreerd. `server/comm/send.mjs`, `server/comm/signature.mjs` en
  `server/comm/providers/whatsapp.mjs` zijn onaangeraakt.
- De goedgekeurde e-mailhandtekening is niet gewijzigd, en `seal-reference.js` is alleen gelezen.
- Geen template aangepast, geen Meta-configuratie geraakt, geen bericht verzonden.
- Geen nieuwe assets aan `public/brand` toegevoegd. De studie tekent het zegel zelf, zodat er geen
  bestand ontstaat dat later uit de pas kan lopen.
