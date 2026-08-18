# Maculis op WhatsApp · het slotmoment

Onderzoek en visuele studie. Geen implementatie.

**Studie 1, de drie richtingen:** `docs/studies/whatsapp-signature.html`
**Studie 2, verfijning van richting C:** `docs/studies/whatsapp-signature-c.html` (zie hoofdstuk 9)
Beide openen in een browser, geen build nodig.
**Status:** afgerond op 18 augustus 2026. Besluit vastgelegd in hoofdstuk 10.
Niets geïntegreerd, niets gedeployed, verzendlogica onaangeraakt, geen template gewijzigd,
geen Meta-configuratie gewijzigd, geen asset in productie, geen bericht verzonden.
**De goedgekeurde e-mailhandtekening is niet aangeraakt.**

**Gekozen richting:** C, levende signatuur, in de uitvoering van variant 2, "Eén punt".
De parameters zijn bevroren in `docs/studies/tools/wa-seal-reference.js`.

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

---

## 9. Verfijningsronde op C

**Studie:** `docs/studies/whatsapp-signature-c.html`
**Status:** nog steeds niets geïntegreerd, geen asset in productie, geen bericht verzonden.

Richting akkoord: C is de voorkeursrichting. Deze ronde onderzoekt alleen C, met één opdracht:
minder animatie, meer verwondering. Het gewenste gevoel is niet "kijk, een animatie", maar "wacht,
bewoog daar iets?".

### 9.1 Twee besluiten die het ontwerp veranderen

**Geen vaste afscheidstekst.** Het menselijke bericht eindigt zoals het gesprek dat vraagt. "Fijn,
dan spreken we elkaar donderdag." "Prima, dan is het geregeld." Daar komt geen slogan achteraan, geen
"Kijk nog eens.", geen groet van het merk. Het zegel is de punt achter het gesprek, en de vorm draagt
de signatuur. Dat maakt hoofdstuk 5 niet ongeldig: de payoff blijft ongewijzigd waar hij hoort, in de
e-mailhandtekening. Hij hoort alleen niet standaard onder een WhatsApp-gesprek.

**B is het object, C is het moment.** Het zegel in rust mag bijna vanzelfsprekend ogen. De magie
komt niet uit het beeld maar uit de ene kleine gebeurtenis eromheen. Dat betekent ook: het rustframe
blijft de waarheid, en elke variant moet daar exact op eindigen.

### 9.2 Het moment

Het slot is een ritueel, geen footer. Het kan alleen plaatsvinden wanneer het gesprek inhoudelijk
werkelijk is afgerond, iemand dat slot expliciet bevestigt, en het laatste menselijke bericht zijn
eigen natuurlijke afsluiting houdt. De signatuur komt daarna, als visuele punt.

Hoe software betrouwbaar vaststelt dat een gesprek is afgerond, is in deze ronde bewust niet
onderzocht. Eerst het juiste moment ontwerpen, daarna pas de vraag wie of wat het herkent.

### 9.3 De drie microvarianten

Alle drie zijn hetzelfde slotmoment binnen dezelfde grammatica: dezelfde boog, dezelfde ster,
dezelfde kleuren, punten die naderen zonder aan te komen, één respons, daarna stilte. Wat verschilt is
uitsluitend de tijd, het aantal en de helderheid. De nulvariant zonder beweging doet als controle mee.

| | 0 · Stil | 1 · Nadering | 2 · Eén punt | 3 · In wording |
| --- | :-: | :-: | :-: | :-: |
| Stilte vooraf | n.v.t. | 1,20 s | 1,30 s | 1,15 s |
| Punten | 0 | 3 | 1 | 3, waarvan 1 violet |
| Aankomst | n.v.t. | 96 · 62 · 78 procent | 42 procent | 80 · 66 · 40 procent |
| Helderheid op de piek | n.v.t. | 0,48 · 0,29 · 0,38 | 0,26 | 0,39 · 0,31 · 0,34 |
| Respons van de ster | geen | 0,16 op, 0,30 af, winst 0,28 | 0,14 op, 0,34 af, winst 0,18 | 0,16 op, 0,30 af, winst 0,26 |
| Volledig stil | altijd | 4,44 s | 3,90 s | 5,15 s |
| Duur | n.v.t. | 4,64 s | 4,10 s | 5,35 s |

De verfijning zit in drie dingen die alle drie de varianten delen en die de vorige ronde nog niet had:

1. **Ongelijke aankomst.** De punten komen niet even ver. In de e-mailanimatie deelden ze één
   aankomstfractie, waardoor ze als groep bewogen. Nu stopt de een vlak bij de ster en blijft de ander
   ver weg. Naderen is niet bereiken, en niet iedereen nadert even hard.
2. **Ongelijk einde per punt.** Elk punt heeft een eigen moment en een eigen duur van loslaten. Een
   gelijk einde leest als een clip die afloopt.
3. **De helderheid volgt de nabijheid.** Een punt dat maar tot 42 procent komt, wordt ook maar tot
   42 procent van zijn licht helder. Dat is niet een extra regel, maar dezelfde regel consequent
   doorgetrokken.

Bij variant 2 komt daar iets bij dat de moeite waard is om te noemen: het enige punt komt exact op de
straal van de curve tot stilstand. Het gaat er niet doorheen. De curve is de grens van wat is
waargenomen, en het punt blijft daar precies aan de rand van staan.

### 9.4 De meting

De studie meet zichzelf, zodat het oordeel niet alleen op smaak rust. Alles op ware grootte, 118
pixels bij dubbele dichtheid, per kleurkanaal.

| | 0 · Stil | 1 · Nadering | 2 · Eén punt | 3 · In wording |
| --- | :-: | :-: | :-: | :-: |
| Eerste frame tegen laatste frame | 0 van 255 | **0 van 255** | **0 van 255** | **0 van 255** |
| Piek van de afwijking | 0 | 132 van 255 | 75 van 255 | 114 van 255 |
| Bewegend oppervlak op de piek | 0 | 449 beeldpunten | 99 beeldpunten | 441 beeldpunten |

De eerste regel is de belangrijkste: alle drie de varianten eindigen exact op het beeld waarmee ze
begonnen. De statische terugval verliest dus aantoonbaar niets.

De tweede en derde regel geven het antwoord op "hoeveel animatie is dit eigenlijk". Variant 2 beweegt
ongeveer een vijfde van het oppervlak van variant 1, met bijna de helft minder afwijking op de piek.

Bij variant 3 leverde de meting een echte correctie op. In de eerste opzet doofde het violette punt
mee met de rest, en op het moment dat het alleen overbleef mat het 12 van 255 over zes beeldpunten.
Dat is niets. De betekenis bestond alleen in de toelichting, niet op het scherm. Om het violette
moment te laten bestaan moest het punt na het koper blijven staan, en toen mat het 119 van 255. Dat
is meer dan de hele gebeurtenis van variant 2.

### 9.5 Oordeel

Tien punten per criterium. Bij "geen gimmick" is tien het laagste risico.

| Criterium | 0 · Stil | 1 · Nadering | 2 · Eén punt | 3 · In wording |
| --- | :-: | :-: | :-: | :-: |
| Rust | 10 | 7 | 9 | 8 |
| Verwondering | 2 | 8 | 9 | 8 |
| Maculis-herkenning | 6 | 9 | 8 | 9 |
| Natuurlijk in WhatsApp | 9 | 6 | 9 | 7 |
| Geen gimmick | 9 | 6 | 9 | 7 |
| Technisch robuust | 10 | 7 | 9 | 6 |
| **Totaal** | 46 | 43 | **53** | 45 |

**Variant 1 valt af** omdat het de e-mailanimatie in het klein is. Drie punten die zichtbaar reizen,
lezen in een chatvenster als iets dat wordt afgespeeld. Je ziet hem, dus je kijkt ernaar, dus de
verwondering is bij de tweede keer op.

**Variant 3 valt af** ondanks de mooiste gedachte van de drie. Zodra het violette moment zichtbaar
genoeg is om iets te betekenen, is het een tweede gebeurtenis geworden, en precies dat heeft de
e-mailstudie al afgewezen. Daar komt bij dat de betekenis alleen klopt bij een afsluiting die iets
meedraagt. Zet in de studie de afsluiting op gesloten en kijk opnieuw: het violet belooft dan iets wat
er niet is. Een slotmoment dat afhangt van de juiste soort afscheid, is een slotmoment met een
voorwaarde die niemand kan onthouden.

**Variant 0 verliest niet op rust maar op verwondering.** Hij scoort hoog, en dat hoort ook. Als de
metingen op een echt toestel tegenvallen, is dit de terugval waar niets aan kapot kan.

### 9.6 Aanbeveling

> **Variant 2, Eén punt.** Eén punt wordt waarneembaar aan de rand van het zegel, schuift een haar
> naar binnen tot precies op de curve, de ster haalt één keer adem, en het laat ongelijk los. Volledig
> stil op 3,90 seconden, duur 4,10 seconden, geen lus.

Er is niets te volgen, dus je kunt het alleen opmerken. Dat is het verschil tussen een animatie en een
waarneming, en het is de enige variant waarvan ik durf te zeggen dat hij bij de tiende keer nog werkt.

Streng gelezen betekent dit: van de vier punten uit de e-mailhandtekening blijft er in WhatsApp één
over, en dat is winst. De rest van de beweging is weggehaald omdat hij niets toevoegde aan wat de
ontvanger voelt.

### 9.7 Ideaal, drager, ontvangst en terugval

| Laag | Wat het is | Wat er gebeurt |
| --- | --- | --- |
| Het ideaal | één waarneming aan de rand van het zichtbare, daarna stilte | volledig bereikbaar in de vorm |
| Wat WhatsApp kan | geanimeerde WebP-sticker, 512 bij 512, maximaal 500 kB | de enige drager die beweegt zonder afspeelknop. GIF wordt geweigerd, video leest als inhoud |
| Wat de ontvanger krijgt | de sticker speelt zodra hij in beeld komt | gerapporteerd gedrag: één keer, en opnieuw bij langs scrollen. Nog te toetsen op een echt toestel |
| De terugval | statische WebP, 512 bij 512, maximaal 100 kB | identiek aan het eerste en het laatste frame, dus er gaat aantoonbaar niets verloren |

Twee dingen blijven onbewezen tot iemand het bouwt en op een telefoon bekijkt: of het bestand onder
500 kB blijft, en of een geanimeerde sticker werkelijk stopt in plaats van te herhalen. Variant 2 is
van de drie het gunstigst voor beide vragen, want hij is het kortst en beweegt het minst.

### 9.8 Bouwspecificatie van variant 2

| Onderdeel | Waarde |
| --- | --- |
| Bestand | `maculis-seal-perceive-wa-v1.webp` |
| Terugval | `maculis-seal-rest-wa-v1.webp`, identiek aan het eerste en laatste frame |
| Afmeting | 512 bij 512, transparant, merk vult ongeveer tachtig procent van het vlak |
| Beeldsnelheid | 15 fps |
| Duur | 4,10 s, waarvan 1,30 s stilte vooraf als één frame met een lange vertraging |
| Lus | geen |
| Budget | 500 kB voor de bewegende sticker, 100 kB voor de statische |
| Bron van de vorm | `docs/studies/tools/seal-reference.js`, ongewijzigd |

Meet na export opnieuw of het eerste en het laatste frame identiek zijn. De studie doet dat nu in de
browser en komt op 0 van 255. De export moet dat cijfer halen, anders is de terugval geen terugval.

### 9.9 Wat deze ronde bewust niet doet

- Geen enkele wijziging aan verzendlogica, WhatsApp-route, templates of Meta-configuratie.
- Geen asset naar `public/brand`. De studie tekent het zegel live uit de bevroren vorm.
- Geen onderzoek naar hoe software een afgerond gesprek herkent. Eerst het moment, daarna het
  mechanisme.
- Geen wijziging aan de e-mailhandtekening en niet aan `seal-reference.js`.

---

## 10. Besluit

**Datum:** 18 augustus 2026
**Gekozen:** richting C, levende signatuur, in de uitvoering van variant 2, "Eén punt".
**Vastgelegd in:** `docs/studies/tools/wa-seal-reference.js`

### 10.1 Wat er precies is besloten

Het Maculis-slotmoment op WhatsApp is één stille sticker met het zegel, waarin één punt waarneembaar
wordt aan de rand, tot precies op de curve schuift, de ster één keer laat ademen, en daarna ongelijk
loslaat. Volledig stil op 3,90 seconden, duur 4,10 seconden, geen lus. Het rustframe is de waarheid en
de beweging voegt daar niets aan toe wat verloren kan gaan.

Het slot verschijnt uitsluitend nadat het gesprek inhoudelijk is afgerond en iemand dat slot bevestigt.
Het menselijke bericht ervoor houdt zijn eigen natuurlijke afsluiting. Er komt geen vaste afscheidstekst
achteraan: geen "Kijk nog eens.", geen groet van het merk, geen slogan. De vorm draagt de signatuur.

De frequentieregel uit hoofdstuk 3 blijft gelden: ten hoogste eens per dertig dagen per persoon, en in
de praktijk enkele keren per relatie per jaar. Ziet iemand het vaker dan eens per maand, dan is de
regel gebroken, niet het ontwerp.

De payoff "Kijk nog eens." blijft ongewijzigd waar hij hoort, in de e-mailhandtekening. Het besluit om
hem niet standaard onder een WhatsApp-gesprek te zetten, verandert niets aan de merkregel zelf.

### 10.2 De bevroren parameters

| | |
| --- | --- |
| Stilte voor de gebeurtenis | 1,30 s |
| Punten | 1 |
| Aankomst | 42 procent, precies op de straal van de curve |
| Helderheid op de piek | 0,26 |
| Respons van de ster | 0,14 s op, 0,34 s af, winst 0,18 |
| Loslaten | tot 3,90 s, later dan het einde van de nadering |
| Volledig stil | 3,90 s |
| Duur | 4,10 s, inclusief het vastgehouden rustframe |
| Lus | geen |
| Uitsnede | het merk vult ongeveer tachtig procent van het vlak |

Gemeten op ware grootte, 118 pixels bij dubbele dichtheid, per kleurkanaal: het eerste en het laatste
frame verschillen 0 van 255, de piek wijkt 75 van 255 af, en er bewegen 99 beeldpunten. Die eerste
waarde is een eis en geen waarneming. Haalt een toekomstige export hem niet, dan is de statische
terugval geen terugval en klopt het ontwerp niet meer.

`wa-seal-reference.js` is vanaf nu de enige bron voor deze beweging. De vorm erin is letterlijk die van
`seal-reference.js` en mag daar nooit los van veranderen. De tijd is nieuw, want WhatsApp is een ander
medium en dit is een ander ritueel. De referentie is gecontroleerd tegen de beoordeelde variant in de
studie: op elf gemeten momenten is het verschil 0 van 255.

### 10.3 Wat dit besluit niet is

Dit is een ontwerpbesluit, geen bouwopdracht. Er is niets geïntegreerd, geen asset gemaakt, geen route
aangepast, geen template gewijzigd, geen Meta-configuratie geraakt en geen bericht verzonden.

Drie vragen zijn bewust nog niet beantwoord en horen bij een volgende ronde:

1. **Past het bestand?** 512 bij 512 met alfa onder 500 kB is aannemelijk maar onbewezen. Variant 2 is
   van de onderzochte varianten het gunstigst, want hij is het kortst en beweegt het minst.
2. **Stopt de sticker werkelijk?** Het gerapporteerde gedrag is dat een geanimeerde sticker één keer
   speelt en opnieuw begint bij langs scrollen. Dat is niet hetzelfde als de GIF in e-mail, die
   definitief stopt. Toetsen op een echt toestel, op iOS en op Android.
3. **Hoe stelt software vast dat een gesprek is afgerond?** Vandaag kent het datamodel geen einde van
   een gesprek. Zolang dat zo is, is het slot een menselijke handeling, en dat is verdedigbaar omdat de
   mens toch al op verzenden drukt.

Als vraag 1 of 2 slecht uitpakt, is de terugval al ontworpen en al goedgekeurd: de statische sticker.
Die verliest aantoonbaar niets, want hij is exact het eerste en het laatste frame.

### 10.4 Wat er nodig is voordat er iets wordt gebouwd

- `maculis-seal-perceive-wa-v1.webp` genereren uit de bevroren referentie, en na export opnieuw meten of
  het eerste en laatste frame identiek zijn.
- `maculis-seal-rest-wa-v1.webp` uit hetzelfde bestand, als terugval en als los te versturen zegel.
- Het gedrag op een echt toestel toetsen, voordat er een regel productiecode verandert.
- Pas daarna de vraag of dit via de handmatige route loopt, via een stickerpak op het toestel van de
  verzender, of via de Communication Layer met doorgifte van media in `sendOnChannel()`.

### 10.5 Afronding

Hiermee is deze studie gesloten. De drie richtingen uit hoofdstuk 2 en de drie microvarianten uit
hoofdstuk 9 blijven staan als verantwoording van de keuze, niet als openstaande opties. De twee
browserstudies blijven bruikbaar om het besluit opnieuw te beoordelen, met de gekozen variant als
uitgangspunt.
