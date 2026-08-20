# Build log — Maculis Testerbeheer

Compacte, chronologische bouwlog van de Testerbeheer-portal (`ftrprf-labs/website`).
Geen persoonlijke of gevoelige data. Uitsluitend architectuur- en testbeslissingen.

---

## 2026-08-20 — De grond reist mee, en de eerste ster krijgt drie lagen

**Stand.** De bevinding uit de vorige ronde is opgelost bij de bron. De kamer zegt niet langer dat er
te weinig bewijs is voor iets wat de ondernemer mét bewijs heeft gezien. Volledige suite 100 van 100,
alle harnessen groen, de echte end to end **31 van 31**.

**Deze wijziging raakt twee repo's.** `ftrprf-labs/maculis-first-five.` is daarvoor aan de sessie
toegevoegd; daar staat de wijziging op dezelfde branchnaam.

### Aan de Lenskant: alleen overdracht

`reveal_presented` droeg wel de onthulling maar van het bewijs alleen het aantal. De citaten die de
deelnemer achter "Waar zie je dat?" zag, reizen nu mee: citaat, bronlabel en vindplaats, begrensd op
lengte, en alleen regels die werkelijk een citaat hebben. Ook op `session.shown`, zodat een sessie
die haar eventspoor kwijtraakt hetzelfde oplevert.

Geen nieuwe analyse, geen nieuwe observatie, geen nieuwe bron, en geen enkele wijziging aan wat de
deelnemer ziet of moet doen.

### Aan de kamerkant: drie lagen, en alleen de eerste twee komen uit de Lens

**1. Uitspraak.** Zijn zin, woordelijk, met eronder waar hij vandaan komt.

**2. Onderbouwing.** Eén bewijsregel per stuk bewijs, in de volgorde waarin hij ze zag, als
`Over ons: "twintig jaar ervaring in complexe trajecten"`. Niet één regel met een aantal erin: een
aantal is een bewering over bewijs, een citaat ís het bewijs. De vindplaatsen gaan naar de interne
herkomst en niet naar de klantzijde, want een URL in die lijst zou een link zijn die de kamer niet
kan openen.

**3. Verdieping.** "We hebben hier alleen van buitenaf gekeken. Wat we nog niet weten, is hoe dit
van binnenuit wordt ervaren." Die zin hangt aan het PERSPECTIEF en niet aan de klant. Daarmee is het
geen bewering over hun organisatie en dus geen authoring, maar een eerlijke uitspraak over onze
eigen kijkhoek. En het is nadrukkelijk geen aanbod: er staat wat we niet weten, niet wat je zou
moeten koppelen.

**Terugval blijft.** Sessies van vóór deze wijziging dragen alleen een aantal. Dan noemt de kamer
het aantal en verzint de citaten niet.

### Wat er visueel gebeurde, en dat was onverwacht mooi

Het veld tekent een patroon als een sterrenbeeld van zijn waarnemingen. Met één bewijsregel was de
ster één punt. Met drie is het een sterrenbeeld van drie verbonden punten: **de ster is de betekenis,
de punten eronder zijn waarom die betekenis er is.** Dat is precies het model, en het kwam eruit
zonder dat er iets aan het veld is veranderd.

En de regel die de vorige ronde de onthulling onderuithaalde is weg. Waar stond "Hier is nog te
weinig bewijs om iets te zeggen" staat nu "3 onafhankelijke waarnemingen".

### Eén harness gerepareerd

`mijn-gesprek-ui` faalde twee van de drie keer op "het gesprek staat meteen open met de eerste zin er
al in". Dat bleek geen regressie maar een race die er al stond: de harness wachtte op het bestaan van
het formulier terwijl de openingszin er pas na het aanmaken van de draad in komt. Aangetoond door
hem drie keer op de vorige commit te draaien, met dezelfde uitkomst. Hij wacht nu op de inhoud.
Vier runs op rij groen. Een test die één op drie slaagt is erger dan geen test.

---

## 2026-08-20 — De keten echt gelopen, en wat de eerste kamer laat zien

**Stand.** De hele keten is over HTTP tegen een draaiende server gelopen, niet alleen in unit tests:
`tools/visual/lens-naar-mijn-e2e.mjs` start de echte server met een nagebootste Journey-export
ernaast en loopt daarna de weg van de ondernemer en de medewerker. **28 van 28 stappen groen.**
Volledige suite 100 van 100, alle visuele harnessen groen, plus een nieuwe.

### Uitgaand zonder mailtransport: klaarzetten, niet doen alsof

`nodigUit` kijkt nu naar de werkelijke modus van het e-mailkanaal. Staat er een echt transport, dan
gaat de uitnodiging per mail. Staat dat er niet, dan wordt er **niets verstuurd en ook niets
beweerd**: de uitnodiging staat klaar en de link gaat terug naar de mens die op de knop drukte,
zodat hij hem zelf kan doorgeven. Er is nog steeds precies één menselijke handeling en er verlaat
niets ongemerkt het gebouw. Dit maakt de keten testbaar op een omgeving zonder mailsleutel, zonder
ergens een valse "verzonden" te melden.

Daarnaast: zonder publieke basis-URL wordt er geen uitnodiging meer gemaakt. Liever niets dan een
link die begint met een schuine streep.

### Eén mens, één toegang

Een tweede uitnodiging voor iemand die al toegang heeft, zette er een tweede naast. Dan sluit
intrekken de ene en laat de andere openstaan, en weet niemand meer hoeveel sleutels er zijn. Het
verzilveren draait nu de waarde van de bestaande toegang om in plaats van een tweede aan te maken.

### Wat de eerste kamer visueel opleverde

`tools/visual/mijn-eerste-kamer.mjs` is nieuw en meet de toestand die de bestaande harness juist
NIET dekt: één organisatie, één gebied, één uitspraak, bron Lens. De bestaande harness draait op zes
patronen en meet daarmee een volle kamer. Vier dingen kwamen daar uit, en drie zijn gerepareerd.

**De uitspraak stond er twee keer.** Groot als titel, en er direct onder nog eens als waarneming.
Bij een inzicht dat rechtstreeks uit de Lens komt, is de uitspraak de waarneming. De lead blijft nu
leeg wanneer die twee gelijk zijn.

**Twee lege modules met een kop erop.** "Wat betekent dit mogelijk?" en "Wat weten we nog niet?"
toonden allebei "Dit hebben we nog niet opgeschreven." Een vraag zonder antwoord wordt nu
weggelaten in plaats van met een plaatshouder gevuld (ADR-0003 D6).

**De bron werd nergens genoemd**, terwijl ADR-0003 D3 dat eist. Waar de lead leeg zou blijven staat
nu de herkomst: "Bron: Maculis Lens. Dit is wat Maculis vanuit het perspectief van buitenaf zag."

**De eerste keer sprong hij het bewijsblad in**, en miste daarmee de begroeting. Dat maakte de kamer
een dossier in plaats van een vervolg. Hij landt nu op het veld, waar zijn naam, zijn organisatie én
zijn eigen zin al staan, en het bewijs is één tik weg.

### En één bevinding die NIET is gerepareerd, met opzet

Onder zijn eigen onthulling staat: **"Hier is nog te weinig bewijs om iets te zeggen."** In het
bewijsblad staat het nog scherper: "1 waarneming. Te weinig om iets te zeggen, en dat zeggen we dan
ook."

Dat is technisch waar, want er is één klantzijdige bewijsregel. Maar de Lens liet hem er drie zien
en toonde de onthulling met vertrouwen. De kamer haalt daarmee, in de eerste seconden, precies dat
vertrouwen onderuit.

Dit is niet met copy op te lossen en het is ook geen reden om de bewijsdrempel te verlagen. Het is
het bewijs dat de geparkeerde beslissing genomen moet worden: **het event `reveal_presented` moet de
citaten meesturen die de Lens tóch al aan de ondernemer toonde.** Zolang dat niet gebeurt, vertelt de
kamer hem dat er te weinig grond is voor iets wat hij zelf met bewijs onderbouwd heeft gezien.

---

## 2026-08-20 — Van de Lens naar Mijn Maculis: de V1-keten

**Stand.** De keten loopt end to end in code en in tests: Lens afgerond, toestemming bewaren, kamer
voorbereid, uitnodiging klaargezet, menselijke verstuuractie, ondernemer binnen, eerste ster
zichtbaar, en terugkomen zonder dat een verlopen link iets weghaalt. Volledige suite 100 van 100,
mobiele acceptatie, gesprek-UI, affordance en de mobiele copycontrole allemaal groen.

Grondslag: ADR-0003 (de overgang vraagt geen onboarding), ADR-0004 (Mijn Maculis is de
relatiecontext, de Lens is één ingang), `PROD-RELATIONSHIP-MODEL` en het V1-acceptatiekader.

### Wat is toegevoegd, en waarom precies dat

**Bewaartoestemming afleiden** (`maculis-sessions.mjs`, `store.mjs`, `index.mjs`). De sessie droeg
`account_handoff_accepted` allang mee, maar er werd alleen naar de contacttoestemming gekeken. Dit
is de enige trigger van de hele keten (ADR-0003 D1) en hij krijgt een eigen paar velden naast
`consent_status`. Samenvoegen zou de toestemming om voor te bereiden vouwen in de toestemming om te
benaderen, en dat is de ene samenvoeging die het model verbiedt (D2).

**De voorbereider** (`mijn/voorbereiden.mjs`). Organisatie en persoon komen uit de herkenning die er
al was en al ontdubbelt. Het inzicht is de zin uit `reveal_presented`, woordelijk. Er wordt niets
opnieuw geanalyseerd, niets samengevat en niets afgeleid uit zijn antwoorden. Idempotent op
(organisatie, bron, titel), want de aanroeper draait bij elke lijstweergave.

**De drie assen** (migratie 012, `mijn/woordenschat.mjs`). Gebied en perspectief als kolommen en
niet als tabellen: de namen zijn voor elke organisatie dezelfde, en een tabel zou suggereren dat een
organisatie eigen gebieden heeft. De bron zat al in `customer_insight.source`.

**Herkomst van een reflectie** (migratie 012). `insight_recognition` bevat vanaf nu twee soorten met
verschillende regels: een antwoord uit de Lens had Maculis aantoonbaar al, een antwoord uit de kamer
is van de persoon. Zonder markering leest een latere functie de tabel en trekt de verkeerde
conclusie. Default `mijn`, dus fail-closed op persoonlijk.

**De kamer** (migratie 012, `mijn_room`). Een eigen levensloop naast die van de tester, want ze gaan
over verschillende dingen. Een verlopen uitnodiging zet een kamer nooit terug.

**Uitnodiging en terugkeer** (`mijn/uitnodiging.mjs`). De tabellen lagen er sinds migratie 010 en
werden nergens gebruikt. De uitnodiging is de deurbel, de toegang is de sleutel: een verlopen of
gebruikte uitnodiging haalt geen toegang weg. Alleen hashes worden bewaard.

**Eén regel in de Cockpit** (`mijn/kamers.mjs`, `comm.js`). Uitnodigen of afwijzen. Geen knop om de
tekst te wijzigen, want wat in zijn kamer staat moet zijn wat hij zag. De module noemt de
persoonlijke tabellen zelfs niet bij naam, en een test bewaakt dat.

**De kamer bij één patroon** (`mijn.js`). Bestemmingen die nergens heen gaan worden verborgen en niet
uitgeschakeld: een grijze knop is nog steeds een belofte van iets dat er niet is. En de eerste keer
landt hij op zijn eigen zin, niet op de kaart.

### Twee dingen die eerlijk moeten worden opgeschreven

**Het bewijs onder het eerste inzicht is een aantal en geen citaten.** De Lens toont achter "Waar zie
je dat?" letterlijke citaten met bron, maar het event `reveal_presented` draagt alleen
`evidence_count` mee. De kamer zegt daarom hoeveel aanwijzingen Maculis vond en verzint de citaten
niet. De schone oplossing is één extra veld op dat event aan Journeykant; die repo valt buiten de
GitHub-scope van deze sessie, dus dat is een aparte stap.

**Antwoorden op "Klopt dit?" en "Had je dit zelf al zo gezien?" reizen niet mee.** De kamer stelt één
vraag, "Herken je dit?", en die krijgt het antwoord uit de Lens. Voor de andere twee een plek maken
zou een nieuw scherm zijn, en dat verbiedt ADR-0003 D6. Ze blijven zichtbaar in de
evaluatieweergave van Testerbeheer.

### Eén reparatie onderweg

`tests/mijn-toegang.test.mjs` laat migratie 010 opnieuw draaien door de tabellen te droppen. Migratie
012 hangt aan een van die tabellen, dus die moet mee terug, anders blijft `insight_recognition.origin`
weg terwijl 012 als toegepast geregistreerd staat. Beide migraties zijn volledig herhaalbaar.

### Wat nog niet werkt buiten de code

De Journey-preview heeft `MACULIS_DATA_DIR=/var/data` en geen disk, dus de sessie-export levert 200
met een lege lijst en er komt niets binnen. Zolang dat zo is, kan de keten niet live worden gemeten.

---

## 2026-08-19 — Twee losse correcties na fase 1, geaccepteerd (preview)

**Stand.** `415afee` en `860ed48` op `claude/mijn-maculis-visual-dna-94ut9s` zijn door de opdracht-
gever geaccepteerd en gelden als de actuele stand. Fase 2, dus uitnodiging, activatie, sessie en
intrekking, is uitdrukkelijk nog niet gestart. Twee bewust kleine wijzigingen, apart gecommit zodat
hun bewijs en bedoeling los van elkaar herleidbaar blijven.

### `415afee` — de comm-ai testfout, uitsluitend in de testopzet

De DB-test in `tests/comm-ai.test.mjs` zette `RESEND_WEBHOOK_SECRET` in de body van de test. Dat is
te laat: `server/config.mjs` leest die variabele eenmalig bij het laden van de module, en de
statische imports bovenaan het testbestand laden config al. De secret stond daardoor leeg,
`signWebhook` tekende met `''`, `verifyWebhook` antwoordde `no_secret`, de webhook eindigde op 401,
er ontstond geen gesprek en `runCopilot` gaf terecht `{ ok: false, reason: 'no_conversation' }`.

Aantoonbaar geen regressie van fase 0 of 1: de test faalt identiek op `7002853` van 15 augustus, de
commit die zowel de statische import als de te late toewijzing introduceerde. Hij heeft dus nooit
geslaagd zonder die omgevingsvariabele.

De volgorde wordt nu afgedwongen door `tests/helpers/webhook-secret.mjs`, dat als allereerste import
staat. ESM voert modules uit in importvolgorde, dus de variabele staat er voordat config wordt
geladen. Een secret uit de omgeving wint nog steeds. **Geen productcode aangeraakt**: de 401 bij een
ontbrekende secret is correct gedrag en blijft staan. De volledige suite was direct na deze
wijziging 91 van 91.

### `860ed48` — de deelstaat gaat over Maculis, niet over je collega

"Alleen voor jou" stond voor `sharing != SHARED`, dus voor dimensie B, maar het beloofde iets over
dimensie A. Zolang er één mens per klant was viel dat niet op; vanaf fase 1 zitten Sanne en Piet
naast elkaar en is die belofte onwaar. Precies de twee dimensies die migratie 010 uit elkaar haalde,
raakten in de zichtbare tekst weer op één hoop. Dit is het geparkeerde punt uit de fase 1-notitie
hieronder, en het is hiermee opgelost.

Vijf plekken, allemaal uitsluitend dimensie B, dus uitsluitend de vraag of Maculis het inzicht mag
zien en gebruiken:

| Plek | Nu |
|---|---|
| staat in het bewijsblad | `Gedeeld met Maculis` / `Niet gedeeld met Maculis` |
| merkje in Alle patronen | hetzelfde volledige paar |
| uitleg bij niet gedeeld | "Maculis gebruikt dit inzicht niet zolang het niet gedeeld is. Delen is een aparte keuze, en je kunt hem later weer intrekken." |
| bevestiging bij intrekken | "… Het blijft in Mijn Maculis gewoon zichtbaar." |
| blok in Samenwerking | "Maculis gebruikt alleen inzichten die je hebt gedeeld. Wat niet gedeeld is, blijft buiten onze samenwerking, en je kunt een gedeeld inzicht op elk moment weer intrekken." |

"Je antwoord blijft bij jou" bij de herkenningsvraag blijft staan. Dat gaat niet over het inzicht
maar over de persoonlijke laag, en daar is "bij jou" sinds fase 1 gewoon waar.

**Gemeten, niet preventief ingekort.** `tools/visual/mijn-copy-mobiel.mjs` meet op 393x660, 390x844
en 430x932, in beide staten: het merkje is 19,2px hoog bij een regelhoogte van 19,2px, dus het
breekt nergens binnen zichzelf af; het is 147,7px breed voluit tegen 125,7px voor de gedeelde
variant; het overlapt de houdingspil nergens en niets schuift horizontaal. Op 393 en 390 valt het
merkje bij 2 van de 6 patronen naar een tweede regel onder de pil, bij de twee langste
houdingslabels. De kop is een wrap-flex, dus dat is wat die hoort te doen, en het blijft links
uitgelijnd en rustig. Met het korte paar zou het 0 van 6 zijn. Dat is geen aantoonbaar niet passen,
dus het volledige paar blijft staan.

**Vastgelegd.** Drie tests in `tests/mijn-toegang.test.mjs`, zonder database: de exacte eindteksten,
een verbodslijst met "Alleen voor jou", "blijft van jou tot", "Inzichten zijn van jou" en "voor jou
zichtbaar", dat `PRIVATE`, `AGGREGATED` en `ORGANISATIE` nooit zichtbaar worden, en dat de belofte
bij de herkenningsvraag blijft staan. Zo raken dimensie A en dimensie B later niet opnieuw stilletjes
door elkaar.

### Bewijs en previewstatus

Volledige suite **94 van 94 groen**, nul rood, nul overgeslagen. Dat is de 91 van hierboven plus de
drie nieuwe copytests. De privacygrenzen tussen Sanne en Piet draaien mee en zijn groen, inclusief de
zes regressies en de `deepEqual` die aantoont dat een handeling van Piet niets aan Sanne verandert.
Audit, gesprek-UI, mobiele acceptatie en affordance ALLES GROEN.

Uitsluitend naar de harmonisatiepreview, niets gemerged en niets naar productie. Render heeft
automatisch gedeployd: deploy `dep-da2pquoae00c73c68pp0` op commit `860ed48` staat op live.

**Nog visueel te controleren door de opdrachtgever.** De preview zelf is vanuit de bouwomgeving niet
op te halen: het netwerkbeleid van die omgeving beantwoordt een CONNECT naar `onrender.com` met een
403. Het bewijs dat de nieuwe copy draait is daarom de deploystatus van Render op exact `860ed48`,
en niet een eigen ophaalactie. De visuele eindcontrole op het toestel staat dus nog open, op
`/mijn.html?t=preview-mijn-maculis-de-voorbeeld-groep-0001` en dezelfde link met `-piet` erachter.

**Blijft geparkeerd.** Het opruimen van de ongebruikte `customer_insight.recognition*` kolommen, het
ontdubbelen van "Waarop dit rust" en "Waar baseren we dit op?", en het terugkoppelen van Samenwerking
naar de patronen. Alle drie wachten op een eigen GO.

---

## 2026-08-19 — Mijn Maculis fase 1: gedeelde werkelijkheid, persoonlijke aandacht (preview)

**Wat.** Twee mensen bij één organisatie zien vanaf nu dezelfde inzichten, maar niet elkaars
gesprekken en antwoorden. Daarvoor moesten twee privacyvragen uit elkaar die er tot nu toe als één
uitzagen. Dimensie A, wie binnen de klantorganisatie een inzicht mag zien, leest `customer_insight.audience`
en wordt expliciet gecontroleerd. Dimensie B, of Maculis de inhoud mag zien en gebruiken, blijft
`customer_insight.sharing` en verandert geen letter. Ze mogen nooit hetzelfde veld en nooit dezelfde
autorisatiebeslissing worden.

**Een privacyfout hersteld.** Bij de communicatielaag waren `recognition` en `recognition_note`
toegevoegd aan `sharedContextForOrg`, met de redenering dat het antwoord op een gedeeld inzicht
precies is wat Maculis vroeg. Dat was fout. Het koppelt een persoonlijke keuze aan een handeling van
iemand anders: antwoordt Sanne "Nee" op een ongedeeld inzicht en deelt Piet dat later, dan zou haar
antwoord alsnog naar de Cockpit stromen. De persoonlijke laag reist nu nooit mee met `sharing`.

**Gesprekscontext als eigen handeling.** Praten over een nog niet gedeeld inzicht mag, en dat is iets
anders dan het delen. Het onderwerp van de draad is neutraal geworden, want dat is organisatiebrede
metadata die ook in het attentiemodel meekomt. Wat Maculis meekrijgt om de vraag te begrijpen staat
als momentopname in `insight_context_share`: de uitspraak zoals Maculis die zelf schreef en de
houding, per gesprek. Niet de lezing eronder, niet het bewijs, nooit de persoonlijke laag. Versturen
ís de keuze, en dat staat er vooraf. `sharing` blijft onaangeraakt en `sharedContextForOrg` leest
deze tabel niet.

**Verder.** Gesprekken, herkenning en de leesstatus zijn persoonsgebonden, fail-closed: zonder
contact is de persoonlijke laag leeg en kan er niet geschreven worden. De preview heeft een tweede
persoon, Piet Jansen, bij dezelfde organisatie.

**Bewijs.** `tests/mijn-toegang.test.mjs` doet de zes gevraagde regressies end to end door de echte
routes, plus dat `audience` werkelijk gecontroleerd wordt en dat een handeling van Piet niets aan
Sanne verandert (`deepEqual` over haar herkenning, haar draad en haar gedeelde context, vóór en na).
Volledige suite 90 van 91; de ene rode is de bekende comm-ai copilot. Audit, motion, affordance,
gesprek en de mobiele acceptatie ALLES GROEN.

**Geparkeerd.** De copy "Alleen voor jou" is nu op twee manieren onnauwkeurig en blijft bewust staan
tot daar een eigen ronde voor komt. Opruimen van de ongebruikte `customer_insight.recognition*`
kolommen is schuld.

---

## 2026-08-19 — Mijn Maculis: de mobiele compositie van Het Veld (preview)

**Wat.** Op een telefoon liepen de waarnemingen dwars door de leesbare HUD-tekst, terwijl er onderin
ruimte onbenut bleef. Oorzaak: `meet()` centreerde het veld op `(H − 236) / 2`. Die 236 reserveert
de uitspraak onderaan, maar bovenaan werd niets gereserveerd. Op desktop hoeft dat niet, want daar
staat de HUD in verre hoeken. Op een telefoon is de HUD een band dwars over de bovenkant, gemeten
van 14 tot 218px, en het veldmidden landde daar middenin.

- Boven wordt nu gereserveerd wat er werkelijk staat, gemeten en niet vastgezet, en opnieuw gemeten
  zodra de regels onder de groet er staan.
- Onder wordt alleen het dekkende deel van de uitspraak gereserveerd. Zij ligt als een verloop over
  het veld (`0deg, var(--bg) 58%, transparent`), dus de bovenste 42 procent is bewust doorzichtig en
  daar mag het veld doorheen lopen. Gemeten is de uitspraak 230 tot 245px hoog, waarvan 133 tot
  142px dekkend; de vloer staat op 150px zodat de compositie stabiel is vanaf het eerste beeld.
- Het veld wordt in de overgebleven band gecentreerd en daarop geschaald. Op 390x844 en 430x932
  blijft de straal exact gelijk en verhuist het veld alleen; op een korte in-app browser krimpt het,
  want daar is niet meer ruimte.
- Het trefvlak van een patroon schaalt op mobiel mee omlaag met het veld. Zonder dat overlapten de
  vaste 46px-vlakken van buurpatronen elkaar zodra het veld kleiner werd, en raakte je met één tik
  het verkeerde patroon. Alleen kleiner, nooit groter, en alleen op een telefoon.

**Gemeten, kernen in rust.** 393x660: midden 223 naar 378. 390x844: midden 315 naar 473, halve
hoogte 113 en 113. 430x932: midden 360 naar 518, halve hoogte 124 en 124. Helderste veldpixel
bovenop leesbare tekst, gewogen met alfa: 192 naar 2 (390x844), 192 naar 3 (393x660), 10 naar 1
(430x932).

**Bewijs.** `tools/visual/mijn-mobiel.mjs` dwingt dit nu hard af, op drie viewports, in rust én over
de hele opbouwcyclus, plus dat elk patroon zijn eigen trefvlak houdt. Terugdraaien van de fix maakt
die harness rood, dus hij meet werkelijk iets. Audit, motion, affordance en de gesprekstest
ALLES GROEN.

**Twee bevindingen over de harness zelf.** De opname van het `praat`-scherm hing af van waar de klik
op de ingang het blad toevallig heen schoof; dat is nu vastgezet. En de plaatsing van de uitspraak
op een breed scherm wisselt 4px tussen runs, ook zonder codewijziging: gemeten 348 en 352 over acht
runs op de oude code. Byte-identieke opnames zijn voor een levend canvas dus niet haalbaar; de
vergelijking blijft daardoor een beoordeling en geen poort.

---

## 2026-08-19 — Mijn Maculis: de mobiele presentatie van een inzicht (preview)

**Wat.** Op een telefoon dekte het bewijsblad het hele veld af: het blad was 88vh en de 101px die
overbleef werd bezet door de navigatie, die er zelfs overheen liep. Het patroon dat je zojuist
aantikte was daardoor onzichtbaar, en daarmee viel de belofte weg dat dit inzicht uit dit patroon
komt. Vier ingrepen, allemaal in de mobiele media query op één na.

- De periferie wijkt nu ook op mobiel zodra een blad opent. De strook boven het blad is veld en
  geen menu. Terug kan via "Terug naar het veld" of door lege veldruimte aan te tikken.
- Het blad is `min(72dvh, 700px)` in plaats van `min(88vh, 760px)`, met de vh-regel als terugval.
  `dvh` en niet `vh`, want de adresbalk van Safari verandert van hoogte en `vh` rekent met de
  grootste stand. Gemeten: 28 procent van het scherm blijft veld, op beide iPhone-formaten.
- De camera mikt het geopende patroon in die strook in plaats van in het midden van het canvas,
  met een zoom die zich naar de hoogte van de strook voegt. Onder `prefers-reduced-motion` draait
  er geen lus, dus daar springt de camera er ineens heen en tekent één keer: canon 8.5 vraagt de
  eindtoestand, niet stilstand. Dat laatste alleen op mobiel, want op een breed scherm staat het
  veld gewoon naast het blad en valt er niets te herstellen.
- Elk blad begint bovenaan. Zonder dat erfde een nieuw patroon de scrollpositie van het vorige:
  gemeten stond de titel dan 311px boven de rand van het scherm.
- De onderrand van het blad rekent met `env(safe-area-inset-bottom)`.

**Twee correcties uit de UX-doorloop, in dezelfde ronde.** "Praat hierover met Maculis" is de
primaire handeling in het bewijsblad geworden en "Deel dit met Maculis" is secundair. De betekenis
en de privacygrenzen van beide veranderen niet: praten is nog steeds iets anders dan delen, met
dezelfde bevestiging en dezelfde grens. Zodra de invoer open staat treedt de uitnodiging terug,
zodat er nooit twee primaire knoppen tegelijk staan. Daarnaast verdwijnt het label
`TE WEINIG BEWIJS` uit het veld: onder de drempel krijgt een constellatie geen naam meer, precies
zoals canon 8 zegt dat een naam pas verschijnt als het patroon echt is. De eerlijke behandeling in
het bewijsblad blijft volledig staan, inclusief "Te weinig om iets te zeggen, en dat zeggen we dan
ook."

**Bewijs.** `tools/visual/mijn-mobiel.mjs` is nieuw en meet dit op 390x844 en 430x932: ALLES GROEN,
inclusief draaien en terugdraaien. Audit, motion, affordance en de gesprekstest onveranderd ALLES
GROEN. Alleen `public/mijn.css` en `public/mijn.js` zijn aangeraakt; Cockpit, Website, Lens en
Testerbeheer zijn niet aangeraakt. Op desktop veranderen alleen de twee bewust gevraagde dingen.

---

## 2026-08-19 — Integratie Cockpit en Mijn Maculis: een spoor afgerond, geaccepteerd, nog geen Production GO

**Status: geaccepteerd op de integratiepreview. Nog GEEN Production GO en niets naar de
productiebranch.** De volledige verantwoording staat in `docs/INTEGRATIE_COCKPIT_MIJN_MACULIS.md`;
deze regel legt vast wat er is gebeurd en waar het te vinden is.

**Branch:** `claude/maculis-integratie-cockpit-mijn`. **Preview:** `maculis-integratie-preview`
(`srv-da2mnr9t0dsc73aohvjg`), met een eigen database `maculis-integratie-db`. De twee
oorspronkelijke previews zijn gedurende het hele spoor niet aangeraakt en staan onveranderd op
`c96856a` en `6a05d6a`.

### Wat er is gedaan, en waarom

| Commit | Wat | Reden |
|---|---|---|
| `4080dc3` (ftrlabs-docs) | C-10 en C-10b naar main, tokens 1.0.4 | Mijn Maculis van dag naar nacht; `surface.private` hoort op `:root` en niet in het dagblok |
| `c18446d` | merge van beide ontwikkellijnen, zeven conflicten | de Mijn Maculis-lijn was gebouwd naast de Cockpit-lijn en moest erin |
| `3d9eb19` | de drie Production GO-blockers A, B en C | antwoorden op het oorspronkelijke kanaal; TD-002 structureel gesloten; een privacysignaal zonder inhoud |
| `b162b0b` | goedgekeurde baseline hersteld | de sessieomgeving rendert anders dan de omgeving waarin de baseline is gemaakt; de meetmethode staat nu opgeschreven |
| `aa58388` | primaire bezorging tegenover secundaire notificatie | een mislukte melding zei dat het antwoord de klant niet had bereikt, terwijl het bezorgd was |
| `90b31ee` | twee wachtende draden bij een relatie | de tweede draad viel weg en de knop wees naar de andere; op recordniveau gereproduceerd |
| `a54ef7e` | herkomst tegenover status in de relatiekaart | boven een uitspraak van de klant stond "AI-voorstel"; wie het las kon niet zien wie iets beweerde |

### Architectuurbeslissingen die blijven gelden

- **Een melding over communicatie is geen communicatie.** `message.is_notification` (migratie 010)
  scheidt primaire bezorging van secundaire notificatie. De grens loopt langs de ROL van het
  bericht en nergens langs een kanaalnaam, dus een tweede notificatiekanaal zoals WhatsApp kan er
  later bij zonder wijziging aan `conversation`, `message` of `delivery_event`. Toestemming loopt
  automatisch mee: een melding gaat door dezelfde consentpoort en is fail closed.
- **Herkomst en status zijn twee vragen.** `source` zegt waar informatie vandaan komt, `confidence`
  wat ze telt. Ze mogen niet uit elkaar worden afgeleid. Een uitspraak van de klant wordt nooit als
  afleiding van Maculis gepresenteerd en andersom. `public/herkomst.js` draagt die regel voor zowel
  het product als het prototype.
- **Het lichtpunt hoort bij een waarneming van Maculis zelf** (canon 9, val 1). Wat de klant, een
  collega of de Lens ons vertelde draagt het punt niet.
- **Een relatie blijft een kaart, maar verliest geen draad.** Nevenredenen worden ontdubbeld per
  type en per gesprek, en dragen hun eigen gespreks-id.
- **Er is precies een uitgaande weg**, `sendOnChannel`. `server/comm/outbound.mjs` is verwijderd,
  niet alleen ongebruikt gemaakt.
- **Praten is niet onthouden.** Zonder het vinkje in Mijn Maculis ontstaat er geen geheugenrecord.
  Twee keer gemeten, en er bestaat geen andere route die het zou kunnen doen.

### Testresultaten

- Volledige databasesuite: **267 van 267**, 0 gefaald, 0 overgeslagen (van 245 bij de merge).
- Nieuwe regressietests: `comm-uitgaande-grens` (7), `cockpit-mijn-maculis-antwoord` (4),
  `comm-primair-versus-notificatie` (6), `cockpit-mijn-maculis-draad` (6), `cockpit-herkomst` (10).
- Elke reparatie is met een tegenproef getoetst: met de fix teruggedraaid falen de tests die hem
  bewaken, en de controletests blijven groen.
- Tokenpoort 4/4 op canon 1.0.4, canonscan 0 afwijkende kleuren en 0 streepjes als stijlmiddel,
  Cockpit-audit 90 controles 0 afwijkingen, Mijn Maculis-audit groen.
- Visuele regressie, beide bomen in dezelfde omgeving gerenderd: de integratie en de drie blockers
  veranderen niets; de herkomstwijziging raakt precies de 16 dossierrenders en geen enkel ander
  scherm.
- Testerbeheer, Inbox en Workspace zijn byte-identiek aan de goedgekeurde productiestaat `23ddbba`,
  op een additief `MIJN_MACULIS`-kanaallabel na.

### Wat nog open staat voor Production GO

De ketenproef met het echte taalmodel en de ketenproef met echte e-mail heen en terug. Beide
vragen om een koppeling in Render die nog niet is gelegd. Pas als beide ketens bewezen zijn, valt
de beslissing over Production GO.

---

## 2026-08-19 — Cockpit-verfijning: de signaaltaal terug, en hiërarchie waar het vlak vlak werd

**Status: GO met visuele correcties op de vorige kandidaat, nog geen definitieve visuele GO en
geen Production GO.** Lud heeft de basisrichting goedgekeurd en zeven gerichte correcties gevraagd.
Dit is de kandidaat die daarop volgt.

**Branch:** `claude/maculis-cockpit-visual-dna-5zqhjd`. **Preview:**
`maculis-cockpit-visual-dna-preview` (`srv-da2jsmn40ujc73aggn1g`). Het wachtwoord staat in Render
onder Environment en niet meer in de chat.

### De signaaltaal, en waarom elk lichtpunt daar staat

Canon 14 geeft de Cockpit **uitsluitend trap 1**: het lichtpunt. Trap 2, een verbinding, en trap 3,
een patroon, horen bij de Website, de Lens en Mijn Maculis. Er wordt hier dus geen lijn getrokken
en geen constellatie gebouwd. Wat meerdere waarnemingen samen betekenen, wordt uitgedrukt in de
**straal van het licht**, precies zoals canon 7 dat voorschrijft.

Vier regels, en alle vier zijn hard:

1. **Een lichtpunt verschijnt alleen waar Maculis zelf iets heeft waargenomen.** Een bericht dat
   binnenkomt is geen waarneming van Maculis. Daardoor draagt de kaart van een wachtende klant geen
   punt, en de radarkaarten wel: die staan er omdat Maculis iets opmerkte zonder dat iemand vroeg.
2. **De halo volgt het bewijs.** De straal is een functie van het aantal onafhankelijke, gegronde
   signalen: alleen een feit en een waarneming tellen mee, want die bestaan buiten Maculis. Een
   afleiding of hypothese is Maculis' eigen redenering en draagt geen licht.
3. **Hoogstens een light.core per scherm**, conform canon 7. De kern gaat naar de best onderbouwde
   uitspraak op dat scherm; de andere punten blijven kaal.
4. **Beweging is onzekerheid.** Een bevestigd geheugen draagt hetzelfde punt, gedoofd.

Drie gebaren, alle uit canon 8.3 en 15, en alle eenmalig:

| Gebaar | Waar | Waarom daar |
|---|---|---|
| **Scherpstellen** | de uitspraak van de dag, de reveal, een open observatie | Canon 15, signature 3: het enige onthullingsgebaar, exclusief voorbehouden aan iets wat Maculis heeft gezien |
| **Land** | een waarneming die zojuist binnenkwam | Canon 8.3. Vervangt de randflits, die aandacht vroeg zonder betekenis te dragen |
| **light.edge** | elk vlak waar Maculis spreekt | Canon 7: markeert dat hier iets onthuld wordt. Nooit op archief of administratie |

Onder `prefers-reduced-motion` staat de eindtoestand er onmiddellijk. De audit meet dat nu expliciet
per gebaar: scherp, zichtbaar en op zijn plaats.

### Hiërarchie in plaats van meer kaarten

- **Dossier.** Tien vrijwel identieke rechthoeken. De secties dragen nu een rol: waar Maculis
  spreekt is een verhoogd vlak met light.edge, het archief is een stille lijst onder de kop
  Dossier. Dezelfde secties, dezelfde inhoud, andere rangorde en ander gewicht.
- **Gesprekken.** Een gesprek dat niets vraagt en waarvoor niets klaarstaat draagt geen eigen vlak
  meer. Canon 10: een pil in een dichte context, een linkerrand in een rustige.
- **Beheer.** Was vier kaarten waarvan drie "binnenkort in de cockpit". Nu een uitspraak, een echte
  ingang en een eerlijke zin over wat elders woont. Canon 12: ontworpen, niet leeg.
- **Koper was versiering geworden.** Elke rij droeg een gevulde koperen avatar. Canon 2 maakt koper
  schaars, dus de avatars zijn een hairline. Daardoor leest een echt signaal weer als signaal.
- **Beweging krijgt de violette pip.** Violet beschrijft toestand en roept nooit om aandacht.

### Leesbaarheid

Dertig regels secundaire tekst van `text.quiet` (5,00:1) naar `text.secondary` (6,79:1), en zes
teksten die op dekking stonden naar een echte tokenkleur. Geen nieuw tonaal niveau.

### Verificatie

| Controle | Uitkomst |
|---|---|
| Tokenpoort | 4 van 4 |
| `npm test` | 175 tests, 0 fail, 27 overgeslagen |
| Canonscan | 0 afwijkende kleuren, 0 neutrale hairlines, 0 oneindige beweging, 0 streepjes in copy |
| Audit | 90 controles, 0 afwijkingen, inclusief de nieuwe eindtoestandcontrole per gebaar |
| Determinisme | 104 van 104 byte-identiek over twee volledige runs |
| Delta tegenover de goedgekeurde staat | gericht: Relaties 0,5 procent, Gesprek 3,4 procent, Vandaag 5,8 procent, Gesprekken 30 procent, dossier 21 procent |

### Openstaande canonvraag

**Mag de Cockpit trap 2 of trap 3 tonen?** Canon 14 zegt nee: alleen trap 1. Een verbinding tussen
twee waarnemingen of een kleine constellatie is dus niet gebouwd, hoe aantrekkelijk ook. Wil de
Cockpit dat wel, dan is dat een canonwijziging via hoofdstuk 17 en niet een schermbeslissing.

---

## 2026-08-19 — Cockpit-harmonisatie Visual DNA v1.0: klaar voor visuele beoordeling

**Status: nog geen akkoord.** Dit is de staat die ter beoordeling voorligt, niet een freeze.

**Branch:** `claude/maculis-cockpit-visual-dna-5zqhjd`, afgetakt van
`claude/maculis-future-cockpit-z9naou` (de branch waar de Cockpit zelf op staat).
**Preview:** `maculis-cockpit-visual-dna-preview` (`srv-da2jsmn40ujc73aggn1g`), Frankfurt,
Node-runtime, geen schijf, geen productiegegevens. Productie is niet aangeraakt:
`ftrlabs-testerbeheer` staat op autoDeploy uit en volgt een andere branch.

### Waarom niet gemerged met de geharmoniseerde basis

De Cockpit staat op een eigen branch die vóór de Testerbeheer-harmonisatie is afgetakt.
Een merge daarvan gaf drie conflicten, waarvan twee in `server/comm/ai/copilot.mjs` en
`server/comm/ai/service.mjs`. Dat zijn inhoudelijke conflicten tussen het
handtekeningbeleid en de Context Layer, en dus een productbeslissing en geen visuele.
Die is hier bewust niet genomen. Het gevolg is dat de runtime van de Cockpit
byte-identiek blijft aan de branch die de preview al draaide, en dat het verschil van
deze branch precies de visuele laag plus de meetgereedschappen is.

### Nulmeting, vóór er iets veranderde

| Meting | Uitkomst |
|---|---|
| Afwijkende hexkleuren | 60 uniek, 111 voorkomens, tegenover 3 canonieke |
| `var()` naar niet-bestaande tokens | 46 in het operationele scherm, alle terugvallend op een hardgecodeerde kleur |
| Transities op de browserstandaard | 48 |
| Audit (regime, grond, overflow, focus, contrast, console, reduced motion) | 113 controles, 66 afwijkingen |
| Echte WCAG AA-fouten | contrast 2,67 tot 4,35 op chips, eyebrows, afzenderregels en geheugenlabels |

### Wat er is gewijzigd

1. **Een lichtregime.** De Cockpit had drie eigen paletten (A, B en C) plus een tweede,
   licht regime voor `[data-space="work"]`: dossier en gesprek stonden in dagkleuren
   terwijl de rail donker bleef. Canon 5 laat per kamer precies een regime toe en canon
   14 wijst de Cockpit werklicht toe. Alles staat nu op grond `ink.950` `#080503`.
   Het onderscheid tussen tonen en werken wordt gedragen door `light.field` op het
   toonmoment, niet meer door een tweede palet.
2. **Aliaslaag in plaats van eigen kleuren.** Tokens 1.0.3, checksum `a8a21414415b8e06`,
   statisch ingelinkt conform canon 17 en byte-identiek aan `ftrlabs-docs/main`.
   `cockpit.css` bezit geen enkele eigen kleurwaarde meer.
3. **Statuspil als transparant vlak** met een `border.semantic` hairline en semantische
   tekst, conform canon 10 en amendement C-2.
4. **Navigatie actief als koperen markering aan een zijde**, nooit een gevuld blok (canon 12).
5. **Knoppen als pil**, primair een warm verzadigd vlak met donkere tekst, secundair
   transparant met een hairline waarvan bij hover alleen de randkleur verandert.
6. **Drie tonale niveaus in plaats van vijf**, en nooit een hairline en een schaduw op
   hetzelfde element (canon 6).
7. **Ruimte, radius en typeschaal op de canonieke stappen.** `hero`, `statement` en de drie
   oude kopmaten vallen samen op `insight`, de enige kopstap die de Cockpit kent (canon 4.3).
8. **Newsreader zelf gehost**, gewicht 300 voor de Uitspraak en cursief 400 voor de Stem
   van Maculis (amendement C-9). Namen staan niet langer in de serif: sans wijst, serif spreekt.
9. **Een curve voor alle beweging**, en de oneindige ademhaling in de lege staat vervalt
   (canon 8.4: geen constante achtergrondbeweging in een werkomgeving).
10. **Geen percentages en geen meters** meer (canon 11). Zekerheid en onderbouwing lezen
    als woord.
11. **Statuslabels Nederlands en menselijk** via labelkaarten voor gespreksstatus,
    aflevering, relatiefase en kanaal, zodat ruwe enumwaarden niet in beeld komen (canon 10).
12. **Onzekerheid is kleurloos.** Demonstratie, afleiding en hypothese dragen geen koper meer.
    Rood is voorbehouden aan wat gebroken is; wat nu aandacht vraagt is koper.
13. **De richtingschakelaar in de prototypelade vervalt**, want met een regime valt er
    niets meer te kiezen.

### Verificatie

| Controle | Uitkomst |
|---|---|
| Tokenpoort (`tools/check-tokens.mjs`) | 4 van 4 |
| Testsuite (`npm test`) | 175 tests, 0 fail, 27 overgeslagen (vereisen live Postgres) |
| Canonscan | 0 afwijkende kleuren, 0 neutrale hairlines, 0 oneindige beweging, 0 streepjes in copy |
| Audit | 85 controles, 0 afwijkingen, 5 schermen x 2 viewports |
| Focusring per Tab-stop | Vandaag 15, Relaties 12, Gesprekken 9, Dossier 19, Gesprek 8, alle voorzien |
| Horizontale overflow | 0px op 1280 en op 390 |
| Reduced motion | 0 lopende animaties, 0 oneindige lussen, niets onzichtbaar |
| Determinisme | twee volledige runs, 56 van 56 byte-identiek |
| Delta tegenover de nulmeting | 56 van 56 gewijzigd. Verwacht: grond en letter veranderen op elk oppervlak |

### Bewust openstaand

1. **De preview toont het operationele scherm pas met een database.** `cockpit-live.html`
   is fail-closed: zonder `DATABASE_URL` en `COMM_LAYER_ENABLED` toont hij "nog niet
   geconfigureerd" in plaats van verzonnen data. De database
   `maculis-cockpit-visual-dna-db` staat klaar, maar de koppeling vraagt een handeling in
   het Render-dashboard. Zolang die er niet is, is `/cockpit.html` het beoordeelbare scherm.
2. **De preview is vanuit de sessie niet op te vragen.** De egressproxy blokkeert
   `onrender.com`. Het bewijs in deze entry komt uit lokale renders en de deploystatus.
3. **De monospace letter in de prototypelade blijft staan.** Die lade is uitdrukkelijk
   geen product; de letter markeert dat.
4. **De organisatienaam staat in een statuspil.** Dat is informatieontwerp, geen
   tokenkwestie, en valt buiten deze workstream.
5. **De MIME-tabel van de server kent nog geen `.png` en `.gif`.** Alleen `.woff2` is
   toegevoegd, omdat de canonieke serif dat nodig heeft. De brand-assets van de
   e-mailhandtekening worden nog als `application/octet-stream` geserveerd. Bestaand
   gedrag, buiten scope, hier vastgelegd zodat het niet ongezien blijft.

---

## 2026-08-17 — Scout externe bronnen: Website Signals + TED live-ready, KVK/KBO verificatie-seams

**Van DEMO naar echte externe waarneming (bronnen live-ready, standaard uit).** Twee credential-free
signaalbronnen zijn nu echte, live-klare providers, en officiële identiteitsverificatie is als seam
voorbereid. Scout blijft het brein: externe waarneming, normalisatie, bestaande-relatiecontrole,
evidence, FEIT/AFLEIDING/HYPOTHESE, confidence, deduplicatie, relevantie, proposal, attention.

**Website Signals** (`providers/website.mjs`, `SCOUT_WEBSITE_SIGNALS`): leest de eigen publieke homepage
van een organisatie, respecteert robots.txt, één request, korte snippets. **TED** (`providers/ted.mjs`,
`SCOUT_TED`): de anonieme EU-aanbestedingen Search API v3 (`POST /v3/notices/search`), per kandidaat
recente aanbestedings- of gunningsactiviteit, met notice-URL en een expliciete "naam-match kan
naamgenoot zijn"-onzekerheid. Beide standaard UIT; aanzetten betekent echte externe HTTP-calls.

**Verificatie-seams.** `providers/kvk.mjs` (NL Handelsregister): interface + config volledig gereed,
UIT tot `KVK_API_KEY` gezet is (nooit in code); een officiële match landt als FEIT met KVK-nummer als
dedup-anker. `providers/kbo.mjs` (BE Kruispuntbank): gedocumenteerde seam, niet live (gratis open data,
maar per-query vereist bulk-ingest, een productbeslissing). Registry: `gatherVerification` naast
`gatherExternalSignals`; Scout vouwt verificatie als FEIT en signalen als OBSERVATION, gescheiden.

**Persoonsidentificatie:** als gedocumenteerde seam vastgelegd (rol `resolvePersons`), nog niet gebouwd;
geen PII-harvesting, geen LinkedIn/vendor.

**Aandacht beschermd:** externe waarnemingen gaan altijd door Scouts kwalificatie, dedup en
relevantiedrempel; alleen betekenisvolle kandidaten worden een attention_item.

**Sandbox-beperking (eerlijk):** de egress-policy van deze buildomgeving blokkeert algemene externe
hosts (TED en bedrijfssites gaven `connect_rejected`/403 via de proxy). Een échte live externe call kon
hier dus niet worden uitgevoerd; de providers zijn live-klaar en draaien echt in een omgeving met open
egress (de preview). De volledige keten is deterministisch bewezen met geïnjecteerde fetch (echte
provider-code, testfixtures ondubbelzinnig als test gemarkeerd), geen live netwerkcall in de suite.

**Tests.** `agents-discovery` uitgebreid (TED off-by-default, query/parse/multilingual, KVK seam +
extract, verificatie als FEIT) en een DB-E2E die website + TED signalen én KVK-verificatie door Scout op
één attention_item combineert met FEIT vs externe OBSERVATION gescheiden. Config: `SCOUT_TED`,
`KVK_API_KEY`, `KVK_API_BASE` in `.env.example`. Geen deploy, geen credentials in code.

---

## 2026-08-17 — Scout discovery-laag: generieke multi-bron architectuur (geen credentials, geen live calls)

**Onderzoek + generieke bouw, met een expliciet stopmoment vóór een providerkeuze.** Scout mag geen
wrapper om één leverancier worden: normalisatie, relatiecheck, evidence, reasoning, confidence, dedup,
attention-beslissing en proposal blijven in Scout. Alleen de bronlaag eronder is pluggable.

**Gebouwd (credential-free, standaard uit):** `server/agents/providers/registry.mjs` (rolmodel
DISCOVERY/SIGNALS/ENRICHMENT/VERIFICATION, provider-registry, normaliserende aggregator
`gatherExternalSignals` die elke waarneming van een bron-tag voorziet en een falende bron overslaat) en
`server/agents/providers/website.mjs` (credential-free website-signaalbron: leest de eigen publieke
homepage van een organisatie, respecteert robots.txt, één request, korte snippets, resultaten als
EXTERNE waarnemingen). Standaard UIT (`SCOUT_WEBSITE_SIGNALS`); live fetchen is een bewuste keuze. Scout
vouwt externe waarnemingen als eigen soort (OBSERVATION met bron + url) in de evidence, gescheiden van
onze eigen FEIT/AFLEIDING/HYPOTHESE, en laat ze de confidence licht verhogen.

**Onderzoek vastgelegd** in `docs/architecture/SCOUT_DISCOVERY_SOURCES.md`: vergelijking van KVK (NL),
KBO/BCE (BE), TED (EU aanbestedingen), bedrijfswebsite, nieuws/RSS, OpenCorporates en vendor-enrichment,
plus de aanbevolen minimale V1-combinatie (KVK + KBO als identiteit/verificatie, TED + website als
signalen) en de stoppunten die een menselijke/betaalde keuze vereisen.

**Bewust NIET gedaan:** geen KVK/KBO/TED live aangesloten (providerkeuze + credentials), geen scraper die
blokkades omzeilt, geen fake externe resultaten, geen PII zonder doel, geen outreach. KVK/KBO/TED staan
als gedocumenteerde seams in het statusbord (`/api/agents/status`), niet geïmplementeerd.

**Tests.** `tests/agents-discovery.test.mjs` (pure unit: website standaard uit, robots-respect, extractie,
normalisatie/aggregatie, externe signalen als OBSERVATION in reasoning) + een DB-E2E die met een
geïnjecteerde bron aantoont dat een extern signaal bron-herleidbaar op het attention_item landt. Geen
live netwerkcall in tests. Geen deploy, geen infra/secret-wijziging.

---

## 2026-08-17 — Scout aangesloten op de Cockpit (Slice 5 integratie, één werkelijkheid)

**Twee werelden samengevoegd.** De Cockpit-chat realiseerde Slice 5 (collaboratieve cockpit met een
persistente `attention_item`-laag, `server/comm/work.mjs` en de routes `/api/cockpit/agent/work` en
`/api/cockpit/work/:id/:action`, contract in `docs/AGENT_COCKPIT_CONTRACT.md`). Deze branch bracht de
agent-runtime. Beide zijn nu samengevoegd (merge van `claude/maculis-future-cockpit-z9naou`).

**Parallelle abstractie opgeruimd.** Het eerdere eigen work-model (`work_item`, `agent_finding`,
`agent_evidence`, `/api/agents`-findings/promote/dismiss, `server/agents/cockpit.mjs`,
`docs/architecture/COCKPIT_AGENT_INTEGRATION.md`) is verwijderd. Er is nu geen tweede werkvoorraad en
geen tweede lead-database: Scout landt werk uitsluitend via `recordWorkItem` in `attention_item`. De
oude migratie `006_agent_foundation.sql` is vervangen door `007_agent_runtime.sql` met alleen wat het
agentdomein echt bezit en de Cockpit niet: `actor` (identiteit, mandaat, autonomie) en `agent_run` (de
run-trace voor observability). De collision met hun `006_attention_items.sql` is daarmee weg.

**Scout, echte verticale keten (werkt end-to-end tegen Postgres).** waarnemen (aangedragen of interne
kandidaten) → begrijpen (kwalificatie via deterministische providergrens) → controleren (dedup en
relatiecheck tegen bestaande organisaties/personen) → evidence met expliciete scheiding FEIT /
AFLEIDING / HYPOTHESE en confidence → voorstel → `recordWorkItem` (`attention_item`) → Cockpit →
menselijke beslissing (`resolveWorkItem`: approve materialiseert een `proposedRelation` tot een echte,
op e-mail gededupliceerde relatie) → status/ownership terug → audit/activity. Bestaande relaties worden
per id gerefereerd (geen duplicaat); alleen echt nieuwe leads rijden als `proposedRelation`.

**Grenzen afgedwongen.** Scout (autonomie `PREPARE`) mag observeren en werk vastleggen, maar nooit zelf
resolven, een relatie materialiseren, extern communiceren, consent zetten, privacy lezen, identiteiten
mergen of extern web raadplegen. De mandaat/autonomie-guard weigert en auditeert dat. Externe discovery
is een expliciete providergrens die `configured:false` meldt en niets teruggeeft. Demo/fixtures worden
ondubbelzinnig gemarkeerd (`evidence.demo=true`, `source='demo-fixture'`), nooit als echte vondst.
Compressie: kandidaten onder de relevantiedrempel worden niet vastgelegd; herhaalde runs dedupliceren
via `dedupKey` (geen spam).

**Aparte `AGENTS_ENABLED`-flag** blijft: het agentdomein is onafhankelijk activeerbaar; het gedeelde
schema (006 + 007) wordt op boot toegepast zodra Comm of Agents aanstaat.

**Tests.** `tests/agents-registry.test.mjs` (pure unit) en `tests/agents-scout.test.mjs` (DB-E2E:
landing via het cockpitcontract, FEIT/AFLEIDING/HYPOTHESE, dedup, bestaande relatie herkend, proposed
relation niet stil echt, approve/reject/take_over, geen externe outbound, tenant-isolatie, demo-marker,
Scout-fout breekt de Cockpit niet, auditability). Volledige suite tegen echte Postgres inclusief de
overgenomen cockpit-slices. Geen deploy, geen infra/secret-wijziging.

---

## 2026-08-17 — Digitale collega's: gedeelde agentfundering + eerste collega (Scout, Growth/Lead)

**Van onderzoek naar realisatie.** De eerste echte digitale collega is gebouwd op een minimale,
gedeelde agentfundering die binnen dezelfde relationele werkelijkheid werkt. Geen parallel universum,
geen tweede Cockpit, geen autonome externe acties. Additief en feature-flagged achter de bestaande
`COMM_LAYER_ENABLED` + `DATABASE_URL`-gate. Niets gedeployed.

**Datamodel (migratie `006_agent_foundation.sql`, additief, idempotent):** `actor` (HUMAN|AGENT|
SYSTEM, met granted autonomie), `work_item` (het gedeelde werkobject), `agent_run` (één uitvoering,
audit/kosten/idempotentie), `agent_finding` (evidence-gegronde bevinding = voorstel, met epistemische
status en confidence), `agent_evidence` (herkomst per claim, expliciete `source_type`). Hergebruikt
zonder duplicatie: `audit_event`, `activity`, `notification`, `relationship_memory` (proposed vs
confirmed), `organization/contact.relationship_stage` (lead-lifecycle), `channel_identity`.

**Mandaat en autonomie (veilig als default).** Ladder `OBSERVE -> PROPOSE -> PREPARE ->
ACT_WITH_APPROVAL -> AUTONOMOUS`. Twee onafhankelijke gates in `server/agents/registry.mjs`:
autonomie (hoe ver zelfstandig) en mandaat (welke resources/acties). Scout heeft `PREPARE`: mag
observeren, voorstellen en voorbereiden, maar mag nooit zelf verzenden, promoveren, consent zetten,
privacy lezen, identiteiten samenvoegen of extern web raadplegen. Elke weigering wordt geauditeerd
(`mandate_denied`/`autonomy_denied`). Mandaat blokkeert ook een hoog-autonome agent.

**Growth/Lead-collega (Scout), end-to-end.** `server/agents/scout/runner.mjs`: krijgt een
`growth_discovery` work item met echte, aangedragen kandidaten, controleert per kandidaat of we de
organisatie of personen al kennen (dedup), kwalificeert fit uit ECHTE signalen via een
deterministische providergrens, bewaart evidence + confidence + epistemische status, stelt een
volgende stap voor, en laat het als prepared work achter. Verzendt nooit. Promoveert nooit zelf.
Promotie is een menselijke actie die een `LEAD` in de gedeelde waarheid zet plus een PROPOSED memory,
zodat gevonden informatie, afleiding en bevestigde relationele state gescheiden blijven.

**Providergrens (eerlijk).** `server/agents/providers/discovery.mjs`: de standaardprovider is
deterministisch en intern (kwalificeert op basis van aangedragen of interne data, verzint niets). De
externe web-provider is een stub die `configured:false` meldt en NIETS teruggeeft, zodat echte
discovery later veilig kan worden aangesloten. Geen nepdata als echte leads.

**Cockpit-integratiecontract.** `server/agents/cockpit.mjs` + `handleAgents` (`/api/agents/*`,
admin-gated, gemount naast `handleComm`). De Cockpit consumeert findings als prepared work op Vandaag,
per relatie op het dossier, met promote/dismiss als menselijke beslissing. Contract vastgelegd in
`docs/architecture/COCKPIT_AGENT_INTEGRATION.md`.

**Tests.** Nieuw: `tests/agents-registry.test.mjs` (pure unit, altijd groen: mandaat/autonomie,
provider-eerlijkheid) en `tests/agents-scout.test.mjs` (DB-E2E: volledige lifecycle, tenant-isolatie,
idempotentie/double-submit, provenance, geen externe actie zonder goedkeuring, state transitions,
failure handling, promotie/afwijzing, en dat agent-output nooit stil als bevestigd feit belandt).
Lokaal tegen een echte Postgres: 12/12 agent-tests groen; zonder DB skippen de E2E-tests netjes
(66 pass / 10 skip). Eén bestaande comm-copilot-test (`comm-ai` test 2) faalt in deze lokale sandbox
door een pre-existing race in de mock-copilot (reproduceert op de schone baseline zonder deze
wijziging, en is groen in de echte CI volgens deze log); niet veroorzaakt door dit werk.

**Aparte `AGENTS_ENABLED`-flag.** Het agentdomein is nu onafhankelijk van de Communication Layer te
activeren (`AGENTS_ENABLED` + `DATABASE_URL`). Het gedeelde schema (inclusief migratie 006) wordt op
boot toegepast zodra één van beide features aanstaat; `handleAgents` gate't op `agentsEnabled()`. De
invitation-bridge blijft comm-specifiek. Bewezen: agent-suite draait en slaagt met alleen
`AGENTS_ENABLED` gezet (12/12), boot toont "Comm: off / Agents: ENABLED", en zonder flags skippen de
E2E-tests netjes. Gedocumenteerd in `.env.example`.

**Commit:** branch `claude/maculis-team-agents-arch-cuybdp`. Geen deploy, geen infra/secret-wijziging.
## 2026-08-19 — Mijn Maculis: de communicatielaag en de affordance van het veld (preview)

**Affordancecorrectie.** Punt is waarneming, verbinding is groeiend verband, patroon is betekenis.
Een los punt is dus geen onderwerp en suggereert dat nu ook niet meer: de tooltip is weg, de cursor
verandert alleen boven een patroon, en de klik die vanaf een los punt naar het patroon eronder sprong
is verdwenen. De animatie is ongewijzigd. `tools/visual/mijn-affordance.mjs` rastert het veld af en
toont aan dat alleen grote patroongebieden aanwijsbaar zijn.

**Communicatielaag.** Mijn Maculis is een kanaal geworden op de bestaande Communication Layer, geen
tweede systeem. Dezelfde `conversation`, `message`, hetzelfde attentiemodel, hetzelfde
`relationship_memory`. Eén additieve migratie, 009. Drie beloftes zitten in de code: praten is niet
delen, reageren is niet onthouden, en gelezen betekent twee verschillende dingen aan de twee kanten.
De herkenningsvraag is daarbij duurzaam geworden, want een correctie mag niet hechter zijn vastgelegd
dan het antwoord waar hij bij hoort. Volledige verantwoording in `docs/MIJN_MACULIS_COMMUNICATIE.md`
hoofdstuk 12.

**Consent.** Een antwoord in de eigen omgeving van de klant verlaat het pand niet en heeft daarom een
`allow`-regel voor service. De e-mailmelding dat er een antwoord klaarstaat verlaat het pand wel, en
gaat door dezelfde poort als elke andere uitgaande mail. Geen geldige toestemming en geen gekoppeld
contact betekent geen melding. De melding bevat geen inhoud en geen toegangslink.

**Cockpit.** Bewust minimaal aangeraakt: drie opzoektabellen krijgen `MIJN_MACULIS: 'Mijn Maculis'`
zodat er nergens een enum-naam op het scherm komt. Het kanaal staat niet in `SENDABLE_CHANNELS` en is
dus antwoord-only; een concept op zo'n gesprek opent al op het juiste kanaal. Bestaande
Cockpit-schermen veranderen niet, want geen bestaand gesprek heeft dit kanaal.

**Bewijs.** Testsuite met Postgres 88 van 89 (dezelfde pre-existing comm-ai-fout, identiek op de
basisbranch). `tools/visual/mijn-gesprek-ui.mjs` ALLES GROEN op 1440 en 390. Audit ALLES GROEN op
alle vier de viewports, nu ook op de schermen `praat` en `gesprekken`. Motion en affordance ALLES
GROEN. Website, Lens, Testerbeheer en Cockpit niet aangeraakt.

**Openstaand.** Zes echte productbeslissingen, opgesomd in `docs/MIJN_MACULIS_COMMUNICATIE.md` 12.5.

---

## 2026-08-19 — Mijn Maculis wordt Het Veld (kandidaat, wacht op Production GO)

**Wat.** De kamer is het veld geworden. Navigatie, uitspraak, bewijs, vraag en grens komen eruit
voort in plaats van ernaast te staan. Volledige verantwoording in `docs/MIJN_MACULIS_HET_VELD.md`.

**Canon.** Amendement C-10 in ftrlabs-docs, vastgelegd vóór de bouw: Mijn Maculis gaat van dag naar
nacht. Reden is een signaal uit de praktijk, precies de voorwaarde die open punt A stelde. Canon 7
stelt dat `light.core` in het dagregime niet als emissie bestaat, terwijl licht in het veld juist de
drager van het bewijs is. C-10b maakt `surface.private` een rol op `:root`. Tokens 1.0.4.

**Backend.** Eén additieve migratie, 008: `insight_observation.customer_label`, fail-closed. Zonder
klantveilige bron per waarneming zou de bewijstelling verzonnen zijn. De grens is niet gewijzigd en
wordt strenger uitgevoerd; `sharedContextForOrg` is niet aangeraakt.

**Beperking.** De herkenningsvraag geldt voor dit bezoek en wordt niet opgeslagen. Dat vraagt een
productbeslissing over hoe een menselijk antwoord weegt tegenover nieuw bewijs.
*Opgeheven op dezelfde dag, zie de entry hierboven: het antwoord wordt nu bewaard, en volgt dezelfde
grens als het inzicht.*

**Bewijs.** Testsuite met Postgres 90 van 91 (de ene fout is pre-existing en faalt identiek op de
basisbranch), zonder Postgres 74 geslaagd en 16 overgeslagen. Audit ALLES GROEN op desktop en
mobiel. Motion ALLES GROEN. Website, Lens, Testerbeheer en Cockpit byte-identiek aan de basisbranch.

---

## 2026-08-18 — Mijn Maculis geharmoniseerd op Visual DNA v1.0 (kandidaat)

**Wat.** Mijn Maculis is integraal op de canon gezet als eigen kamer: dagregime, canonieke tokens,
Newsreader voor Uitspraak, de vijf semantische rollen, `surface.private` als drager van "alleen voor
jou", en het signaalveld als bewijs met de levenscyclus uit canon 8.1. De donkere navy zijkant is
verdwenen, want canon 5 laat maar één regime per kamer toe. Volledige verantwoording in
`docs/MIJN_MACULIS_HARMONISATIE.md`, nulmeting in `docs/MIJN_MACULIS_NULMETING.md`.

**Onaangeraakt.** Informatiearchitectuur, klantreis, alle API-contracten en de sharing boundary in
`server/mijn/*`. Website, Lens en Cockpit zijn niet gewijzigd; de Cockpit-oppervlakken zijn
byte-identiek aan de basisbranch.

**Tokens.** Het gevendorde bestand ging van 1.0.2 naar de gemergede canon 1.0.3 (C-3 `shadow.diffuse`,
C-5 `scrim.modal`). Geen bestaande waarde wijzigt: alle 56 Cockpit-opnamen zijn byte-identiek
vastgelegd met 1.0.2 en met 1.0.3.

**Bewijs.** Testsuite 89/0 gefaald, tokencontrole groen, audit ALLES GROEN (was 12 gefaald bij de
nulmeting), motion-poort groen, 32 opnamen voor en 32 na.

**Open canonpunten** M-1 tot M-5, geregistreerd in het harmonisatiedocument, geen ervan blokkerend.
Kort: er is geen token voor donkere tekst op koper; `text.quiet` haalt in dag maar 3,9:1 en is dus
alleen voor grote tekst bruikbaar; `semantic.signal` haalt op `surface.private` 4,41:1 en zakt daar
net onder AA; de verhouding tussen ademen en "geen oneindig lopende animatie"; en de constellatie als
datavisualisatie is nog steeds open punt E in canon 16.

---

## Technische schuld (open)

| # | Onderwerp | Waar | Beschrijving | Ingebracht |
| --- | --- | --- | --- | --- |
| TD-001 | Tekstkleur van de e-mailbody in donkere modus | `server/comm/signature.mjs`, `wrapEmail()` | Wanneer de composer platte tekst stuurt, bouwt `wrapEmail()` de HTML-body op met een vaste `color:#2b2b2b`. In een donkere leesomgeving kan dat donker op donker uitpakken. Dit zit in het **bericht**, niet in de handtekening, en is bestaand gedrag van vóór de handtekening-integratie. Bewust niet opgelost bij de deploy van 2026-08-18: het raakt de leesbaarheid van elke verzonden e-mail en verdient een eigen ronde. | 2026-08-18, gezien bij de renderproeven van de handtekening |
| TD-002 | `/reply` verstuurt buiten de centrale handtekening en buiten de consent-gate om | `server/comm/outbound.mjs` (`sendReply`), route `POST /api/comm/conversations/:id/reply` | Deze AI-vrije fallbackroute verstuurt rechtstreeks via `sendThreadedEmail` en roept dus **niet** `wrapEmail()` aan: uitgaande mail langs deze weg draagt geen enkele handtekening, oud noch nieuw. Dezelfde route passeert ook de `channelAllowed()` consent-gate niet die `sendOnChannel` wel toepast. Geen UI-code roept hem aan; alleen een directe API-aanroep bereikt hem. Bewust ongemoeid gelaten: dit vraagt een eigen architectuur- en securityreview, geen contentcorrectie. | 2026-08-18, bij de audit van de handtekeningroutes |

---

## 2026-08-18 — Cockpit-harmonisatie Visual DNA v1.0: visueel akkoord en freeze

**Visueel akkoord vastgelegd.** Lud heeft de live preview beoordeeld op Testerbeheer, Workspace
en Inbox en de harmonisatielaag akkoord bevonden. Vanaf dit punt geldt een **freeze** op de
visuele harmonisatie: geen verdere verfijning, geen extra kleurcorrecties, geen spacing-polish
en geen nieuwe interpretaties binnen deze workstream.

**Beoordeelde commit:** `3e8c740ac159994df631a6b574d7131dc96cc3f1`
(branch `claude/maculis-visual-harmonization-s0nt5t`). Gelijk aan de branch tip, aan de lokale
werkboom en aan de live previewdeploy `dep-da21ov61egvs7395v3b0`. Alle drie deploys van de
previewservice draaiden op deze ene commit, dus er is geen twijfel over wat beoordeeld is.

**Preview:** `maculis-cockpit-harmonisatie-preview` (Render, Frankfurt, Node-runtime, geen disk,
geen productiegegevens, Communication Layer uit). Tijdelijk, uitsluitend voor deze beoordeling.

### Wat de harmonisatie inhoudt

De Cockpit draait nu op de gegenereerde canon in plaats van op handmatig beheerde kleurwaarden.

- **Canonieke tokenlaag** gevendord als `public/vendor/maculis-tokens.css`, versie 1.0.2,
  checksum `b95d91b7a0a82c18`, byte-identiek aan `ftrlabs-docs/main`. Bewaakt door
  `tools/check-tokens.mjs` op checksum, versie en handmatige bewerking.
- **Lichtregime `worklight`** op alle drie de oppervlakken, via `data-maculis-regime` op `<html>`.
  Grond is `ink.950` `#080503`, conform canonamendement C-1.
- **`:root` teruggebracht tot een aliaslaag.** Geen eigen kleurwaarden meer per scherm
  (canon hoofdstuk 13). In `styles.css` verviel `--surface-2` en verdween `--shadow`
  (canon hoofdstuk 6: hairline of schaduw, niet beide).
- **Statuspil als transparant vlak** met een `border.semantic` hairline en de `semantic.*`-kleur
  als tekst, conform canonamendement C-2. Geen gevulde badge meer.
- **Newsreader zelf gehost** uit de North Star, geen externe CDN. Server serveert `.woff2` nu als
  `font/woff2`.
- **Toegankelijkheid:** twee echte WCAG AA-fouten opgelost (`text.quiet` 3,74 naar 5,00 en
  consent-ok 4,41 naar 4,92). Klikbare `div`/`span` vervangen door echte `<button type="button">`,
  waardoor de Inbox van 8 naar 15 Tab-stops ging.
- **Zichtbare copy** ontdaan van streepjes als stijlmiddel, en labelmaps toegevoegd
  (`STATUS_LABEL`, `EVAL_LABEL`, `CONSENT_LABEL`, `CHANNEL_LABEL`, `JOURNEY_LABEL`,
  `DELIVERY_LABEL`) zodat ruwe enumwaarden niet meer in de UI verschijnen.

### Verificatie op het moment van de freeze

Uitsluitend de bestaande controles, zonder nieuwe ontwerpcriteria.

| Controle | Resultaat |
|---|---|
| Token en checksum (`tools/check-tokens.mjs`) | 3/3 pass |
| Testsuite (`npm test`) | 64 tests, 0 fail, 9 overgeslagen (vereisen live Postgres) |
| Toegankelijkheid, overflow, console, reduced-motion (`tools/visual/audit.mjs`) | alles groen over 3 oppervlakken × 2 viewports |
| Focusring op elke Tab-stop | Workspace 7, Inbox 15, Testerbeheer 51 desktop en 49 mobiel |
| Statuspillen AA (`.att`) | Workspace 7/7, Inbox 6/6 |
| Statusbadges AA (`.status-badge`, handmatig, zie schuld 3) | 12/12 states, laagste 4,92:1 |
| Horizontale overflow | 0px op 1280 en op 390, alle oppervlakken |
| Reduced motion | 0 lopende animaties, 0 elementen onzichtbaar door een niet-gestarte animatie |
| Drift sinds de beoordeling | hercapture van 56 renders, 56/56 byte-identiek |
| Delta tegenover de pre-harmonisatie baseline | 56/56 gewijzigd, 99,3 tot 100 procent van de pixels. Verwacht: grond en letter veranderen op elk oppervlak |

### Bewust openstaande afwijkingen en technische schuld

1. **Inbox heeft geen weg terug als de Communication Layer uit staat.** `comm.js:14` vervangt de
   volledige `document.body` door de activatiebanner, waardoor de header en de link naar
   Testerbeheer verdwijnen. Bestaand gedrag, ongewijzigd door de harmonisatie. Niet gerepareerd,
   omdat dat buiten de scope van deze workstream valt.
2. **Workspace heeft geen vast menu-item.** Die wordt contextueel bereikt vanuit een rij in
   Testerbeheer (`app.js:296`) of een gesprek in de Inbox (`comm.js:100`). Bij een lege store
   bestaan die ingangen niet. Bestaand gedrag, ongewijzigd.
3. **`audit.mjs` dekt alleen de `.att`-pil.** De `.status-badge` van Testerbeheer valt buiten de
   geautomatiseerde contrastcheck, waardoor die als "0 statuspillen" groen meldt. Bij de freeze
   handmatig gemeten over alle 12 states, alle boven AA. Schuld: de check uitbreiden naar
   `.status-badge`.
4. **`--priv: #8a3a63` in `comm.html` blijft een lokale waarde.** Bewust niet gecanoniseerd: de
   Privacy-inbox is een context, en `surface.private` bestaat in de canon alleen in dagregime.
5. **De focusring is een implementatiekeuze, geen canon.** 2px `copper-500` met 2px offset,
   afgesproken als zodanig bij de pilotgate.
6. **9 tests blijven overgeslagen** zolang er geen `DATABASE_URL` is. Dat zijn de
   Communication Layer DB-tests, niet de visuele laag.
7. **Canonchecksum 1.0.0 (`04d6b40907f2bbda`) is niet reproduceerbaar.** Die waarde dateert van
   vóór de generatorregel in canon hoofdstuk 17. Vanaf 1.0.2 is de checksum wel reproduceerbaar.
8. **De server bindt standaard op `127.0.0.1`** (`server/config.mjs:40`). Op Render moet `HOST`
   expliciet op `0.0.0.0` staan, anders zakt de deploy door de poortscan. Kostte twee mislukte
   deploys bij het opzetten van de preview. Geen visueel punt, wel een deployvalkuil.

### Merge-readiness

- **Inhoudelijk:** de branch is compleet en groen. Geen ongecommitte wijzigingen, branch tip gelijk
  aan origin.
- **Eén blokkade:** PR #2 staat op `mergeable_state: dirty`. De basis
  (`claude/invitation-manager-mvp-d5r5h8`) liep zes commits vooruit met de
  signature- en motionstudies. De enige echte conflict zit in `.gitignore`, waar beide kanten een
  regel achteraan toevoegden. `server/index.mjs` merget vanzelf. Oplossing is mechanisch: beide
  regels behouden.
- **Tweede punt:** de beschrijving van PR #2 is automatisch gegenereerd en beschrijft een eerdere
  tussenstand. Die noemt Testerbeheer nog `night`, de grond nog `ink.980`, `index.html` nog "Lens",
  en `comm.html` nog een byte-identieke controlegroep. Geen van die vier klopt nog.
- **Niet mergen en niet naar productie deployen** zonder expliciete GO.

### Wat hierna NIET volgt

De volgende ontwerpfase is geen verdere harmonisatie, maar een afzonderlijke
**Maculis signature- en magic-laag**: sterren, zeer subtiele onverwachte beweging, kleine
typografische en woordelijke verschuivingen, momenten waarop de interface bijna levend lijkt.
Die laag komt bovenop deze goedgekeurde canonieke basis, is betekenisgedreven en schaars,
respecteert `prefers-reduced-motion` volledig, introduceert geen nieuwe canonwaarden zonder
aparte canongate, en wordt **niet** in deze harmonisatiebranch gebouwd. De bestaande
signature- en motionstudies (branch `claude/maculis-signature-magic-study-qtjg5z` en de studies
op de basisbranch) en de Visual DNA dienen daar later als onderzoeksbron.
---


## 2026-08-17 — Mijn Maculis (klantomgeving) V1: inzichten, sharing boundary, Cockpit-brug

**Product.** De eerste verticale slice van **Mijn Maculis**, het klantgerichte perspectief op
dezelfde werkelijkheid als de interne Cockpit, met een **harde, server-afgedwongen grens** tussen
PRIVATE (alleen de klant), SHARED (bewust met Maculis gedeeld) en AGGREGATED. Informatiearchitectuur:
Overzicht / Inzichten (De Spiegel) / Samenwerking. Rustig, reflectief, mobile-first, eigen visuele
taal (licht canvas, donkere sidebar, violet accent) maar duidelijk familie van Maculis.

**Scope-respect.** Geen Reveal Engine / Reveal Gate / Lens 1-2 gebouwd (die horen bij de
Lens/First Five-workstream, zie 2026-08-15). Mijn Maculis **consumeert** inzichten als een
deelbaar, epistemisch object; de inzichtcontent zelf is **preview-only fixture** (er is geen live
Lens-pijplijn in deze repo). Reveal/non-reveal blijven behouden als `stance`
(reveal | non_reveal | tension | consistency | unknown); een non_reveal ("we zien géén verschil") is
een volwaardig inzicht, niet "niets gevonden".

**Architectuur (additief; hergebruikt bestaande primitieven, geen parallelle modellen).**
- **Migratie `006_mijn_maculis.sql`** (additief, backwards-compatible, veilig op elke boot):
  `customer_insight` (tenant + org scoped, `stance`, vier mensgerichte velden, `sharing`,
  internal-only `provenance` jsonb, `is_preview`), `insight_share_event` (append-only sharing-audit,
  §18), `customer_access` (opaque org-scoped token; **alleen SHA-256 opgeslagen**, nooit de ruwe
  token), `collaboration_item` (alleen `customer_visible` items = Samenwerking, niet de interne
  takenlijst, §13).
- **Sharing boundary als centrale primitive** (`server/mijn/sharing.mjs`): beide kanten gaan hier
  langs. Klant leest eigen PRIVATE + SHARED; de interne kant (`sharedContextForOrg`) kan **per SQL
  alleen `sharing='SHARED'`** zien. Een PRIVATE-inzicht kan daardoor **structureel** niet in een
  interne weergave, modelprompt, log of andere agent belanden. Grens = architectuur, geen
  promptinstructie, en wordt vóór elke modelcall afgedwongen omdat de Context Engine de data via deze
  functie ophaalt. Crossing (PRIVATE → SHARED) is uitsluitend een expliciete, menselijke,
  klant-geïnitieerde actie en wordt geaudit; intrekken (SHARED → PRIVATE) haalt het inzicht direct
  weer uit de interne context.
- **Klant-API** `/api/mijn/*` (token-authed via `x-mijn-token`, **niet** de admin-gate; token nooit
  in de URL/log): session / overview / insights / insight-detail / share / revoke / collaboration.
  Alles tenant + org scoped uit de resolved access-grant, nooit uit client-input → directe
  id/URL-manipulatie lekt niets (cross-org read → 404).
- **Cockpit-brug** (`ai/context.mjs`, `relationship.mjs`): een SHARED-inzicht wordt geautoriseerde
  interne context in de relatie-aggregatie én de model-context. Nevenfix: contact-only context
  resolvet nu ook de organisatie (contact.organization_id), zodat de brug werkt zonder conversation.
- **Frontend** `public/mijn.{html,css,js}`: CSP-safe (externe JS, geen inline handlers), hash-router
  (Overzicht/De Spiegel/Inzichtdetail/Samenwerking), share-flow met heldere bevestiging (§20), geen
  dark patterns. Schrijfregel gerespecteerd (geen streepjes als stijlmiddel).
- **Preview-fixtures** (`server/mijn/seed.mjs`, `scripts/seed-mijn-preview.mjs`): demo-org
  "De Voorbeeld Groep", volledige epistemische spreiding, `is_preview=true`. **HARD REFUSE bij
  `NODE_ENV=production`** → geen fictieve klantdata in productie.

**Getest (fictieve data, echte Postgres).** Volledige comm-suite serieel **66/66** (was 65; +1 nieuw
bestand `mijn-maculis.test.mjs`, 13 assertions in één E2E): Mijn Maculis laadt voor geautoriseerde
klant; ongeldig/geen token → 401; tenant/org-isolatie (org B ziet alleen eigen, cross-org read →
404); PRIVATE zichtbaar voor eigen klant, `provenance` nooit in klant-payload; PRIVATE **niet** in
interne SHARED-context / relatie-aggregatie / modelprompt; expliciet delen → precies dat inzicht
SHARED; daarna intern beschikbaar; andere PRIVATE blijft PRIVATE; provenance behouden + share
geaudit (`insight_share_event` + `audit_event`); Samenwerking toont geen interne taak; intrekken
haalt het weer uit interne context. Zonder DB skippen de DB-tests netjes (build-box-pariteit
behouden). **Browser (Playwright, desktop 1440 + mobiel 390):** 0 console-errors, geen horizontale
scroll, share-flow end-to-end geverifieerd; screenshots van Overzicht, inzichtdetail (PRIVATE),
deel-bevestiging, na delen, De Spiegel, Samenwerking, mobiel.

**Productie onaangeroerd.** Gebouwd/gevalideerd op preview/lokaal; **geen deploy uitgevoerd**, geen
nieuwe provider/credential/betaalde dienst. Op de designated feature-branch
`claude/mijn-maculis-customer-v1-d29lib` (niet de deploybranch). De additieve migratie 006 wordt pas
op productie toegepast bij een bewuste merge/deploy van de deploybranch (menselijke beslissing);
tot dan blijft productie functioneel inert (lege tabellen, geen `customer_access` → elk token 401).

**Privacy proof.** PRIVATE Lens-inzicht "Jullie positionering wordt intern niet overal hetzelfde
ervaren": zichtbaar voor de klant, **niet** in `sharedContextForOrg`/Cockpit/modelprompt. Klant deelt
expliciet → SHARED → vanaf dat moment geautoriseerde interne context. Negatief bewijs: een tweede
PRIVATE-inzicht ("Tussen jullie belofte en wat klanten ervaren zien we geen kloof", non_reveal) blijft
intern onzichtbaar. Bewezen in `tests/mijn-maculis.test.mjs`.

**Open punten (klant-GO nodig).** (a) Echte klanttoegang: `customer_access`-grant + eigen
opaque-tokenuitgifte/e-mail (nu handmatig/preview). (b) Productie-deploy van migratie 006 (bewuste
merge). (c) Live Lens → `customer_insight`-ingest (aparte Lens-workstream). (d) Echte
klant-authenticatie (SSO) i.p.v. losse opaque link, bij opschaling.

---

## 2026-08-15 — Scope & ownership: Communication Layer grens (productbeslissing)

**Geen code-wijziging. Uitsluitend een vastgelegde scope/ownership-grens** (op verzoek), zodat
toekomstige sessies/agents niet vanuit de Communication-workstream buiten hun mandaat bouwen.

**De Communication Layer is en blijft eigenaar van de communicatie-primitieven en -state:**
inbound/outbound, conversations, drafts, AI-suggesties (human-in-the-loop), delivery + delivery
events, read-watermarks, attention-state, channel-adapters en betrouwbare relationship-linked
communicatie.

**Niet vanuit deze workstream bouwen of wijzigen** (behoren tot de Lens/First Five- of toekomstige
Future Cockpit-workstream): Reveal Engine, Reveal Gate, zakelijke thermometer, technische
website-thermometer, Lens 1, Lens 2, Future Cockpit-architectuur, GrowBrain, en nieuwe Relationship
Intelligence zonder bewezen databron.

**Twee vastgelegde architectuurpunten:**
1. De huidige Communication Layer is bewust zo gebouwd dat een toekomstige **Future Cockpit** hem
   later als **betrouwbare onderlaag** kan consumeren: `attentionOverview` (afgeleide, tenant-scoped
   attention-state), het conversation-level read-watermerk en de channel-agnostische adapters zijn
   stabiele primitieven, los van hun huidige UI-presentatie.
2. De huidige **Attention Cockpit is een operationele baseline, NIET de definitieve toekomstige
   Maculis Home.** De cockpit mag later opgaan in of vervangen worden door de Future Cockpit; de
   onderliggende communicatie-primitieven blijven dan de bron van waarheid.

**Lens 1-pilotbevinding (ter referentie, hoort NIET bij Communication):** bij een website zonder
Reveal komt in de huidige journey te weinig van de andere lagen terug. `SILENCE` bij de Reveal Gate
mag de héle journey niet stilleggen (SILENCE bij Reveal ≠ SILENCE van de journey); de Reveal Gate
wordt niet verlaagd. Dit wordt elders in de Lens/First Five-workstream opgepakt.

**Productie-baseline blijft ongewijzigd — geen rollback.**

---

## 2026-08-15 — Maculis Future Cockpit: onderzoek, architectuur en prototype (geen productie-rewrite)

**Type.** Strategische product-, UX- en informatiearchitectuuropdracht met prototype. Uitkomst is
besluitrijp, geen productie-vervanging. Productie (Testerbeheer, in/outbound mail, signature, Inbox,
drafts, AI-suggesties, human approval, threading, Pass the Lens, consent, First Five, attention layer)
bleef ongewijzigd. Alles additief onder `/cockpit.html`.

**Recovery-uitkomst (eerlijk).** Er bestaat geen eerder groter wit dashboardproduct in de history.
Wel: één licht/blauwe admin-skin (`2d49854`, FTRLABS-branding) die drie uur later donker herstyled werd
(`cfc0711`, "no functional/layout/API changes"). Zelfde testertabel. Het "grotere" gevoel was puur
esthetisch. Geen deleted files, geen mockups, geen designnotes van een groter dashboard.

**Voorstel.** Vandaag als primaire home die selecteert boven een aandachtshiërarchie
(Nu/Beweging/Klaar/Rust); Relaties als volledige universe; Gesprekken als omnichannel-laag binnen
relaties; Reveal als productbrede interactietaal met gate en provenance (feit/observatie/gevolgtrekking/
suggestie) in plaats van een First Five-feature. Aanbevolen visuele richting: C, Reveal / Work
(dual-space: donker om te zien, licht om te werken), gestart als richting A. Tegengas expliciet gegeven
(oud dashboard was niet groter; dual-space nooit meer dan twee ruimtes; Testerbeheer blijft als
journey-view).

**Prototype.** `public/cockpit.html` + `cockpit.css` + `cockpit.js`. CSP-safe (externe module, geen
inline handlers). Zes scenario's (quiet/comm/reveal/lens/scale/work), drie richtingen (A/B/C), de
"Kijk nog eens."-reveal met progressive disclosure, 520 fixture-relaties. Alle data gemarkeerd als
PROTOTYPE DATA. Deep-links `?dir=`/`?scn=`/`?expand=1`. Toegankelijk (aria, toetsenbord, reduced-motion,
mobile intent). Screenshots via headless Chromium (desktop + mobiel, alle richtingen en scenario's).

**Durable output.** `docs/MACULIS_FUTURE_COCKPIT.md` (current state, recovery, IA, attention model,
reveal model, relationship model, drie visuele richtingen, decision matrix, aanbeveling, tegengas,
acceptance questions A-N, migratiestrategie, prototype, ultieme test).

**Tests.** Bestaande suite ongewijzigd en groen (comm-tests skippen zonder DB, zoals ontworpen). Geen
productielogica geraakt. Branch `claude/maculis-future-cockpit-z9naou`.

---

## 2026-08-15 — Attention Cockpit + Living Signature + outbound delivery fix (productie)

**1) Outbound delivery-incident opgelost (200 ≠ afgeleverd).** Root cause: de live-gate
van de e-mailprovider hing aan `MAIL_FROM`; die was leeg → de provider viel terug op de
**mock** → een interne 200 zonder echte Resend-call. Fix: live-gate losgekoppeld van
`MAIL_FROM` (`mailTransport==='resend' && MAIL_API_KEY`), in productie **nooit** stil
mocken (mock → expliciete fout), plus PII-veilige send-diagnostiek die de échte
providermodus logt. Delivery-status webhooks (sent/delivered/bounced/failed/complained)
werken de `message.delivery` bij zonder positieve statussen te laten terugvallen.

**2) Living Maculis e-mailhandtekening.** Deterministisch, centraal bij verzenden
toegevoegd (nooit door de AI, nooit in de opgeslagen body), exact één keer, idempotent,
e-mailclient-veilig (knipoog als animated GIF met statische PNG-fallback, geen tracking
pixel), dark-mode/mobiel/toegankelijk. AI-context sluit de eigen handtekening + geciteerde
historie uit (`stripForContext`). **Definitieve copy:** `Ludwig van der Kuijl` /
`Maculis · Kijk nog eens.` / `hello@maculis.nl · maculis.nl` (naam + payoff config-baar,
nooit verzonnen; plain-text valt logisch terug op dezelfde regels).

**3) Attention Cockpit — dagelijkse cockpit boven Testerbeheer.** Eén kanaal-agnostische
"wat vraagt vandaag mijn aandacht?".
- **Read = menselijk signaal:** conversation-level `last_read_at`-watermerk, alleen gezet
  wanneer een bevoegde gebruiker het gesprek daadwerkelijk **opent** — nooit door webhook,
  AI of achtergrondjob. Idempotent (watermerk loopt alleen vooruit).
- **Attention is afgeleid, nooit dubbel opgeslagen:** uit `last_inbound_at` vs
  `last_read_at`, een klaarstaand voorstel en leverstatus → `NEW/UNREAD/NEEDS_ACTION/
  REPLY_READY/WAITING_FOR_CUSTOMER/RESOLVED (+ DELIVERY_PROBLEM)`.
- **Eén bron van waarheid:** Inbox-badge, cockpit-kop, rij-indicator komen alle uit
  `attentionOverview` (tenant-scoped, privacy uitgesloten). Behandelde communicatie
  verdwijnt overal coherent.
- **UX:** menselijke copy ("Antwoord staat klaar", correcte enkelvoud/meervoud), één
  deterministische prioriteit ("Als eerste bekijken", op urgentie → oudste wachtend, geen
  verzonnen AI-ranking), compacte conversation-previews met snippet, ontworpen zero-state
  ("Je bent bij."), subtiele micro-interacties (respecteert `prefers-reduced-motion`),
  responsive (mobiel = één boodschap + één actie), toegankelijk (kleur nooit het enige
  signaal). Eén klik → juiste gesprek (`/comm.html#conv=<id>`, markeert gelezen).
- **Migratie 005** forward-only/non-destructief: `last_read_at/last_read_by/last_inbound_at`
  + backfill van `last_inbound_at` + tenant-scoped index. Geen read-state gebackfilld
  (eerlijk "ongelezen tot geopend").

**Tests:** volledige comm-suite **65/65** (serieel). Nieuw: 22 attention-cases (pure
derivation + DB-E2E: watermerk, idempotentie, tenant-isolatie, privacy-uitsluiting,
zero-state, headline enkelvoud/meervoud) + uitgebreide signature-cases. Visuele QA
(desktop + mobiel + zero-state) via headless Chromium.

**Menselijke acties — afgerond (niet langer openstaand):**
- Communicatielaag geactiveerd (`DATABASE_URL` gekoppeld; Comm ENABLED, migraties 001–005).
- Resend inbound webhook + `RESEND_WEBHOOK_SECRET` + `COMM_MAILBOXES` gezet; MX `maculis.nl`
  geverifieerd; echte inbound→AI→bewerk→goedkeuren→outbound E2E aangetoond in productie.
- `MAIL_API_KEY` en `MAIL_FROM` gezet (echte outbound live).

**Resterende menselijke acties:** (a) visuele acceptatie van de knipoog in een échte
ontvangen mail in echte clients (Apple Mail/Gmail); (b) na deze deploy Testerbeheer één
keer openen zodat de productie-cockpit met echte relaties zichtbaar wordt (de read/write
van het watermerk is lokaal tegen echte Postgres bewezen en de productie-boot is schoon,
maar directe productie-DB-queries zijn vanuit de sandbox geblokkeerd (SSL/TLS)).

**Commits:** branch `claude/maculis-communication-layer-gk5x2i` → merge naar deploybranch
`claude/invitation-manager-mvp-d5r5h8` (auto-deploy Render, migratie 005 toegepast, schone boot).

---

## 2026-08-15 — Pass the Lens: productie-acceptatie (functioneel geaccepteerd, gesloten)

**Status: in productie werkend en functioneel geaccepteerd.** Bevestigd via een echte
productietest: een bestaande tester is opnieuw door First Five gegaan, Pass the Lens verscheen
op het juiste moment, een nieuwe ondernemer is ingevuld en die persoon kwam correct in
Testerbeheer binnen. Geen verdere wijzigingen; alleen heropenen bij een concrete bevinding uit
echte testdata.

**Wat het is.** De eerste ingebouwde organische groeilus: een ondernemer die First Five heeft
ervaren draagt aan het einde (na de Meaningful End én de evaluatie) een andere ondernemer aan
("Aan wie zou jij deze lens doorgeven?"). De aangedragen ondernemer landt als KANDIDAAT in
Testerbeheer; een beheerder beoordeelt en nodigt uit via de bestaande Invitation Manager.

**Architectuur (bestaande entiteiten hergebruikt, geen parallel CRM).**
- First Five is een dunne forwarder: `POST /api/pass-the-lens` → forwardt de 4 minimale velden
  (voornaam, achternaam, bedrijf, e-mail) naar Testerbeheer `POST /api/intake` (server-to-server,
  `INTAKE_KEY`). First Five bewaart niets over de derde persoon (privacy §10).
- `store.intake()` (bestaand seam): dedup op person_key, `source:'pass_the_lens'`, lifecycle nooit
  gereset. Provenance in append-only `record.introductions[]` = `{ at, by_id, by_name, by_company,
  source_journey }`; de verwijzer wordt uit zijn eigen token opgelost (`getByToken`), voert zijn
  gegevens niet opnieuw in, en geen token/secret wordt opgeslagen. Repeat-introductie wordt
  toegevoegd (zichtbaar), nooit een stille duplicaat/merge. History-event
  `pass_the_lens_introduction` (observatie; stuurt nooit status/consent).
- HARDE REGEL §4: geen automatische uitnodiging. Kandidaat = DRAFT + consent UNKNOWN → de
  fail-closed `mayContact()`-gate blokkeert elke automatische outbound. Uitnodigen loopt via de
  ONGEWIJZIGDE bestaande consent-gated e-mail/WhatsApp-flow; status schuift door naar SENT →
  COMPLETED.
- Relatiehistorie (§9/§15): best-effort `server/comm/pass-the-lens.mjs` (`bridgePassTheLens`) legt,
  wanneer de Comm Layer aan staat, een Contact + `pass_the_lens_introduction`-activity + een
  bevestigde memory ("Geïntroduceerd via Pass the Lens door X") vast, zichtbaar voor de AI-context.
  Volledig guarded/no-op wanneer uit. In productie staat de Comm Layer AAN, dus dit speelt mee.
- UI: rustig "Pass the Lens · via \<verwijzer\>"-label op de kandidaatrij + "Aangedragen door" in de
  Historie. Schrijfregel gerespecteerd (geen streepjes als stijlmiddel).

**Config (productie).** `INTAKE_KEY` gedeeld op `ftrlabs-testerbeheer` én `maculis-first-five`;
`TESTERBEHEER_INTAKE_URL=https://ftrlabs-testerbeheer.onrender.com/api/intake` op First Five. Het
gedeelde geheim staat NIET in code/log/docs. Zonder deze config degradeert de feature zacht (geen
kandidaat, geen kapotte UX).

**Tests.** Unit `tests/pass-the-lens.test.mjs` 5/5 (DRAFT + UNKNOWN → geen auto-invite; token-
provenance; dedup/repeat-append; onbekende verwijzer; dossier). core 19/19 ongewijzigd. Cross-service
E2E (beide échte servers lokaal) 15/15. First Five: tsc schoon, technical 13/13, selftest 8/8.
Analytics PII-vrij: `pass_the_lens_shown/_submitted/_skipped` (geen namen/e-mail).

**Commits.** Testerbeheer `ed6a9b5` (feat: controlled referral intake + provenance). First Five
`091c4de` (feat: the organic growth loop terminal beat). Beide live gedeployed en schoon geboot.

---

## 2026-08-15 — Inbound e-mail end to end: zichtbaar bij de klant + AI-verwerking

**Gerichte afrondingsbug.** Inkomende e-mail verscheen niet bij Klant → Communicatie.

**Root cause (config, geen codebug).** De keten stopt bij de voordeur: de Communication
Layer staat in productie UIT (`Comm : off`; `/api/comm/status → 404`), want
`COMM_LAYER_ENABLED` + `DATABASE_URL` zijn niet gezet op de service. De inbound-route
`/api/comm/inbound/resend` is daardoor inert; er wordt niets opgeslagen of getoond.
De inbound-code zelf is geverifieerd tegen de actuele officiële Resend-documentatie en
klopt: `email.received` is metadata-only, de body wordt via de Receiving API
(`GET /emails/receiving/{id}`, identiek aan `resend.emails.receiving.get`) opgehaald,
Svix-handtekening (whsec_, base64 HMAC-SHA256). Tweede meest voorkomende oorzaak in de
praktijk: het ontvangstadres moet exact op `COMM_MAILBOXES` staan, anders wordt de mail
genegeerd.

**Wijzigingen (in scope, geen nieuwe onderdelen):**
- PII-veilige inbound-diagnostiek (`[comm/inbound] rejected|ignored|stored|error …`) zonder
  afzender/inhoud/onderwerp, zodat in productie zichtbaar is wáár de keten stopt (o.a.
  `recipient_not_allowlisted`).
- De automatische AI-copilot bouwt zijn voorstel nu op de bounded Relationship Context
  Engine: recente + eerdere communicatie, First Five-status, open follow-ups én BEVESTIGDE
  Relationship Memory. Kanaal is metadata; dezelfde pipeline verwerkt later WhatsApp/SMS.
- `.env.example`: `COMM_MAILBOXES` toelichting bevestigd als het ontvangstadres.

**Getest (echte keten op een echte Postgres, fictieve data):** suite **32/32**; zonder DB
skippen de comm-tests netjes. Nieuwe E2E `comm-inbound-visibility` (echte Svix-webhook →
juiste klant → zichtbaar in Communicatie → juiste afzender/onderwerp/inhoud/tijd → refresh
blijft → reply-threading → onbekende afzender veilig → duplicate/ongeldige-signature/HTML/
plain/geen-onderwerp/lange-mail → verkeerd ontvangstadres genegeerd). Nieuwe E2E
`comm-inbound-ai-acceptance` (inbound → AUTOMATISCH AI-voorstel zonder knop, context met
bevestigde memory → mens past aan, edit blijft behouden → goedkeuren + verzenden → uitgaand
in dezelfde conversation, audit toont AI-draft + human approval → klant antwoordt → threadt
terug → AI stelt volgende stap voor; AI verzendt nooit zelf).

**Resterende human action (extern, alleen Lud):** de laag activeren (link
`maculis-relationship-db` → `DATABASE_URL` + `COMM_LAYER_ENABLED=1`) en Resend inbound
opzetten (MX-record op ontvangstdomein, inbound-webhook naar
`/api/comm/inbound/resend`, `RESEND_WEBHOOK_SECRET`, ontvangstadres = `COMM_MAILBOXES`).

---

## 2026-08-15 — Relationship Workspace + AI-first omnichannel Communication Layer

**Product.** De relatie is het productobject. Testerbeheer → klik op naam/bedrijf →
**Relationship Workspace** (Overzicht / Journey / Inzichten / Communicatie / Activiteit).
Communicatie zit IN de klant, niet in een los tabblad. De **centrale Inbox** (`/comm.html`)
is de tweede ingang: een rustig aandachtsmodel (Nieuw / Wacht op mij / AI-voorstel /
Onbekend / Levering / Follow-ups) op exact dezelfde data. AI is de primaire werklaag:
elk inbound bericht krijgt een conceptantwoord dat je conversationeel met Maculis verfijnt.

**Backend (additief op 001/002; migratie `003_drafts_followups_channels.sql`):**
- **Provider-abstractie** `server/comm/providers/*` — één neutrale interface
  (`send/capabilities/normalizeInbound/requiredConfig`). EMAIL is LIVE via Resend zodra
  geconfigureerd; WHATSAPP/SMS/PHONE/SOCIAL draaien als volledige MOCK-adapters (officiële
  routes: WhatsApp Business Cloud API, EU SMS/voice; nooit scraping) en melden exact welke
  credentials nog nodig zijn.
- **Unified outbound** `send.mjs` — één verzendpad voor alle kanalen met **consent-gate**
  (`consent.mjs`, per kanaal/doel, opt-out first-class), persist OUTBOUND message,
  `delivery_event`, activity + audit. AI verzendt nooit; alleen expliciete human-approval.
- **AI-first drafts** `drafts.mjs` + AI-serviceboundary `ai/service.mjs`
  (`summarize/classifyIntent/draftReply/reviseDraft/suggestNextAction/extractFollowUps/explain`)
  + bounded **Context Engine** `ai/context.mjs`. Composer en AI-chat delen dezelfde draft;
  `reviseDraft` rebaset op de HUIDIGE tekst → **menselijke wijzigingen worden nooit
  overschreven** (versiehistorie `comm_draft_version`). Deterministische offline-modus +
  fallback: communiceren werkt óók zonder AI.
- **Relationship aggregation** `relationship.mjs` (parallelle queries), **Inbox** `inbox.mjs`
  (attention model), **omnichannel inbound + identity resolution** `channel-inbound.mjs`
  (unknown-contact veilig, handmatig koppelen), **follow-ups** `followups.mjs`.
- Boot bridget bestaande Testerbeheer-invitations idempotent naar permanente Contact/Organization.
- Relationship-georiënteerde API onder `/api/comm/*` (relationship / inbox / drafts / followups /
  consent / status). Alles tenant-scoped; privacy-inbox blijft gescheiden en zonder auto-AI.

**Getest (fictieve data):** volledige suite **30/30** tegen een echte Postgres; zonder DB
skippen de comm-tests netjes (24 pass / 5 skip → productie-pariteit, laag blijft dormant).
Nieuwe E2E `comm-workspace.test.mjs`: inbound → Contact/Org → AI-voorstel → draft warmer/korter
→ **menselijke edit** → AI "voeg dinsdag toe" behoudt de edit → goedkeuren/verzenden →
delivery_event + audit → WhatsApp inbound (unknown) → koppelen → consent-blokkade →
opt-in → verzenden via mock; SMS onafhankelijk geblokkeerd. **Browser (Playwright,
desktop 1280 + mobiel 390):** login → naam klikken → Workspace (OCA) → Communicatie →
AI-chat past body aan → human edit behouden → verzenden → Inbox-aandachtsmodel; 0 console-errors.
CSP intact (externe JS, geen inline handlers; nooit `unsafe-inline` toegevoegd).

**Kanaalstatus (eerlijk, §81):** EMAIL architecture-ready + provider-connectable (Resend);
WHATSAPP/SMS/PHONE/SOCIAL architecture-ready + **MOCK E2E verified**, provider-connected =
nee (credentials ontbreken — zie ALLEEN DOOR LUD).

---

## 2026-08-14 — Online-acceptatie: deploybaar, beveiligd, fail-closed

**Doel.** Van lokale acceptatie naar een gecontroleerde ONLINE acceptatieomgeving
op Render (altijd-aan containers, geen localhost/Mac). Geen productlogica-wijziging;
uitsluitend deploybaarheid + online hardening.

**Wijzigingen (Testerbeheer, `ftrprf-labs/website`):**
- **Deploy:** `Dockerfile` (node:22-slim, `HOST=0.0.0.0`, `NODE_ENV=production`,
  `CMD node server/index.mjs`), `.dockerignore`, `render.yaml` (Docker web service,
  Frankfurt/EU, `plan: starter` always-on, persistente Disk op `/var/data`,
  `healthCheckPath /healthz`, secrets als `sync:false`). Nieuw `GET /healthz`.
- **Datastore configureerbaar:** `DATA_DIR` stuurt de JSON-store naar de
  persistente Disk (default `./data` lokaal). Geen datamodel-wijziging, geen migratie.
- **Auth-hardening:** sessie-HMAC uit vaste `AUTH_SECRET` (env) i.p.v. per-restart
  random → admin blijft ingelogd over redeploys. In productie **fail-closed**:
  server weigert te starten zonder `ADMIN_PASSWORD`, zonder `AUTH_SECRET`, of met
  een niet-https / localhost `MACULIS_PUBLIC_URL`.
- **Publieke vs interne URL (§3):** nieuwe `MACULIS_PUBLIC_URL` voor de persoonlijke
  tester-link (wat de tester op de telefoon opent); `MACULIS_HOST` blijft de interne
  server-to-server basis. Uitnodigingen bevatten nooit meer localhost.
- **Security headers op ALLE responses** (ook JSON-API) incl. **HSTS**.
- **Resend-e-mailadapter:** `MAIL_TRANSPORT=resend` (POST api.resend.com/emails,
  Bearer key, `{from,to,subject,text}`). Vereist key + geverifieerde afzender;
  het "alleen echt afgeleverd → INVITED"-contract blijft intact.
- **Lichte rate limiting** (in-memory, single-instance) op `/api/login` (10/5min)
  en `/api/intake` (60/min) → 429.
- `.env.example` gecorrigeerd/aangevuld (`MACULIS_EXPORT_KEY`, `MACULIS_PUBLIC_URL`,
  `AUTH_SECRET`, `DATA_DIR`, `NODE_ENV`, Resend).

**Journey (`ftrprf-labs/maculis-first-five.`, branch `claude/journey-consent-v1`):**
additieve baseline security-headers (HSTS, nosniff, X-Frame-Options SAMEORIGIN,
Referrer-Policy) — géén CSP (frozen inline scripts/video ongemoeid). Deploy-config
(Dockerfile/render.yaml) bestond al.

**Getest (fictief):** 19/19 unit; **online-acceptatie A–T 42/42** (beide echte
servers, productie-config, publieke/interne URL-split, s2s-auth beide richtingen,
consent fail-closed, lifecycle DRAFT→INVITED→STARTED→COMPLETED, e-mail
delivered-contract, WhatsApp 0629538336→31629538336, security-headers, rate-limit,
geen PII/secret in logs); prod-fail-closed startup 5/5; Journey selftest 8/8;
volledige bestaande regressie groen (wa 30/30 + 16/16 + 13/13, lifecycle 12/12,
fail-closed 22/22, intake 41/41, journey-pull 8/8, eval-UX 38/38, consent 34/34,
browser 18/18 + 16/16). Geen deployment uitgevoerd; geen productielogica gewijzigd.

---

## 2026-08-14 — E-mail lifecycle fix (INVITED = aantoonbaar verzonden)

**Blocker uit handmatige acceptatietest.** Een tester kon op INVITED komen
zonder aantoonbare verzending: het `mock`-transport fake'te succes. (De
WhatsApp-variant — openen zette direct INVITED — was al opgelost met de
tweestaps-bevestiging in `aad394c`; die zit in deze branch.)

**Fix.** Alleen een **echt verzendend transport met bevestigd succes** zet
INVITED.

- `mailer.mjs`: elk resultaat draagt nu een expliciete `delivered`-vlag.
  `mock` → `delivered:false` (reason `mock`), niet-geconfigureerd →
  `delivered:false`. Alleen `http` met een 2xx-respons → `delivered:true`.
  `mailConfigured()`/nieuwe `mailDelivers()` betekenen "een echt verzendend
  transport" (mock/leeg → false).
- `index.mjs` e-mailroute: zet INVITED + `invited_at` + `invitation_sent`
  **uitsluitend** bij `delivered === true`. `mock`/niet-geconfigureerd →
  blijft DRAFT, géén event, geteld als `notSent`. Een échte mislukte
  verzending → `invitation_failed`, DRAFT.
- `app.js`: eerlijke melding wanneer er geen verzendend transport is
  ("E-mail niet echt verzonden — niemand op INVITED").

**Regel bevestigd:** create / consent / publish / persoonlijke link / preview
/ modal openen zetten **nooit** zelfstandig INVITED. Alleen een expliciete
WhatsApp-verzendbevestiging of een echt geslaagde e-mailverzending doet dat.

**Tests toegevoegd/aangepast:** nieuwe lifecycle-E2E (A–K + geen-losse-INVITED,
12/12) met een echt HTTP-mailtransport (fake endpoint 2xx/5xx) voor de
succes/faal-paden; mailer-unittest herschreven op het `delivered`-contract.
Volledige regressie groen (17/17 unit, 12/12 lifecycle, 22/22 fail-closed,
30/30 WhatsApp, Step 3, 41/41 intake, 8/8 journey-pull, 38/38 eval-UX,
18/18 + 16/16 browser). Geen PII/keys in logs.

---

## 2026-08-14 — Journey-consent afronding (consent_version uit sessie)

**Feature (IM-kant van een cross-repo wijziging).** De Maculis-journey stempelt
sinds `maculis-contact-v1` de getoonde consent-versie in de sessie
(`contact_consent_version`) en het `inner_circle_opt_in`-event. De IM-pull leest
die versie nu uit en legt hem vast bij de OPTED_IN, zodat aantoonbaar is met
welke tekst iemand heeft ingestemd (voorheen `null`).

- `maculis-sessions.mjs`: `deriveByToken` leest `contact_consent_version` (sessie
  en event) → `d.consent_version`.
- `index.mjs`: de evaluations-pull geeft `version: d.consent_version` mee aan
  `setConsent` i.p.v. hardcoded `null`.
- Ongewijzigd: alleen een expliciete opt-in → OPTED_IN; "Nog niet"
  (`contact_consent_deferred` én de oude `inner_circle_declined`) → geen
  transitie; COMPLETED ≠ consent. Historische `null`-versies blijven `null`.

**Journey-repo (apart):** `ftrprf-labs/maculis-first-five.` branch
`claude/journey-consent-v1` — memory/contact ontkoppeld, V1-copy, nieuw event,
version-stamping, privacy-placeholder. **Consent-registry:** `ftrprf-labs/ftrlabs-docs`
(`00-governance/compliance/gdpr/consent-registry.md`).

**Getest:** 17/17 unit, 8/8 journey-pull-E2E, 34/34 journey-browser (desktop+375),
volledige IM-regressie groen. Geen tokens/PII in logs.

---

## 2026-08-14 — Fail-closed contactmodel + consent-provenance

**Feature.** Contact is voortaan **fail-closed**: alleen een expliciete
`OPTED_IN` staat benaderen toe.

**Beslissingen (na product/governance-review):**
- **`mayContact = consent_status === 'OPTED_IN'`.** UNKNOWN én OPTED_OUT
  blokkeren e-mail, WhatsApp, publish en de overgang naar INVITED (server-side,
  403/400). "Geen aantoonbare opt-in = geen contact."
- **"Nog niet" (`inner_circle_declined`) → geen consent-transitie** (blijft
  UNKNOWN), i.p.v. de eerdere OPTED_OUT. "Nog niet" is een uitstel, geen
  weigering. De oude event-naam wordt nog gelezen (backward compatible) maar
  stuurt geen transitie. OPTED_OUT is gereserveerd voor expliciete
  weigering/intrekking.
- **Handmatige OPTED_IN is geen vrijblijvend vinkje**: de admin-route eist een
  provenance-notitie (`consent_note`, hoe is toestemming verkregen) en stempelt
  `consent_source=manual`. Zonder notitie → 400.
- **Intrekking (First Five)** via de bestaande admin-route: `OPTED_IN →
  OPTED_OUT` met `consent_changed` (append-only) en directe blokkade. Een
  publieke self-service afmeldlink (W1) is bewust uitgesteld tot bredere
  opschaling.
- Geen historische migratie nodig (feitelijk 0 productierecords; identificeerbaar
  als `OPTED_OUT + consent_source=pass_the_lens` mocht het ooit voorkomen).

**Gewijzigd:** `store.mjs` (`mayContact`, `consent_note`, migratie),
`index.mjs` (fail-closed gates + verplichte notitie), `maculis-sessions.mjs`
(declined niet meer → OPTED_OUT), `public/*` (knoppen disabled voor alle
niet-OPTED_IN, notitieveld), `tests/core.test.mjs`.

**Getest (fictief):** 17/17 unit, 22/22 fail-closed-E2E, 41/41 intake-E2E,
16/16 fail-closed-browser; regressie Step 3-integratie, Evaluaties-UX 38/38,
WhatsApp-bevestiging 30/30, intake-browser 18/18. Logs zonder notitie/PII/keys.

**Nog open (aparte GO's):** Maculis-journey (nieuwe copy, memory/contact
ontkoppelen, privacy-link, `consent_version=maculis-contact-v1`), consent-
registry, en later self-service withdrawal (W1).

---

## 2026-08-14 — Pass the Lens → consent → Testerbeheer (intake-keten)

**Feature.** De ontbrekende ruggengraat tussen de Maculis-journey ("Pass the Lens")
en Testerbeheer: consent uit de journey wordt vastgelegd met provenance en er is een
beveiligd automatisch intake-endpoint.

**Architectuurbeslissingen (na read-only inventarisatie van `website`,
`maculis-first-five` en `ftrlabs-docs`):**

- **Consent-bron = bestaande Maculis inner-circle opt-in.** De journey heeft al een
  expliciete, niet-vooraangevinkte consent-stap (`inner_circle_opt_in` /
  `inner_circle_declined`, knoppen "Houd me op de hoogte" / "Nog niet"). Deze wordt
  hergebruikt; er is geen nieuwe consent-tekst of -UX gebouwd.
- **Twee kanalen (gebruikerskeuze).**
  1. *Pull* — de bestaande Option-B session-export-pull leidt consent af
     (`inner_circle_opt_in` → OPTED_IN, `inner_circle_declined` → OPTED_OUT, geen
     keuze → UNKNOWN) en past die idempotent toe met `consent_source=pass_the_lens`.
  2. *Push* — `POST /api/intake` als beveiligd ontvangstcontract voor een
     toekomstige Pass the Lens (nu nog geen live caller).
- **Drie dimensies strikt gescheiden.** Lifecycle, evaluatiestatus en consent
  overschrijven elkaar nooit. `COMPLETED ≠ OPTED_IN`: een afgeronde journey zonder
  expliciete keuze blijft UNKNOWN.
- **`consent_version = null`** tot een officiële consent-versie is vastgesteld (geen
  verzonnen versie).
- **Dedup via `person_key`** (genormaliseerde e-mail primair, mobiel als fallback,
  binnen campagne) — bewust níét het participant/session-token.
- **Intake-auth** apart van de admin-gate: header `x-intake-key` = `INTAKE_KEY`;
  ontbreekt de key → 503 (uitgeschakeld), verkeerd → 403. Nooit een publieke intake.
- **Geen lifecycle-reset** bij her-intake van een bestaande tester; consent wordt
  alleen bij een expliciete nieuwe keuze bijgewerkt. Migratie additief/non-destructief.

**Datamodel toegevoegd:** `consent_source`, `consent_version`, `person_key`
(migratie-veilig, legacy → null / afgeleid). History-event `consent_recorded`
(eerste consent) naast `consent_changed`.

**Testresultaten (fictieve data):**
- Unit: 16/16.
- E2E intake (scenario A–I + pull-consent + auth + disabled): 38/38.
- Browser (desktop + 375px): 18/18, 0 console-errors, geen horizontale scroll.
- Regressie: Step 3-integratie, Evaluaties-UX 38/38, WhatsApp-bevestiging 30/30.
- Privacy/log-audit: logs alleen `METHOD PATH -> status`; geen keys/tokens/PII;
  history bevat geen bodies/tokens/antwoorden.

**Resterend (infrastructuur, buiten deze code):** een echte Pass the Lens-caller die
`POST /api/intake` aanroept bestaat nog niet; `www.maculis.nl` moet via DNS/host naar
de Maculis-server wijzen; officiële `consent_version` moet worden vastgesteld.

**Commit:** zie git-historie op branch `claude/invitation-manager-mvp-d5r5h8`.

---

## Eerder (samengevat)

- **V1 basis:** import (CSV/XLSX), opaque tokens, persoonlijke `MACULIS_HOST/?p=<token>`-link,
  WhatsApp/e-mail-uitnodiging, publish naar Maculis, systeemgestuurde lifecycle.
- **Evaluaties/Inzichten (Optie B):** Maculis is source of truth; read-only pull,
  join op participant-token; geen tweede vragenlijst.
- **Consent (opt-in/opt-out):** onafhankelijke dimensie met server-side OPTED_OUT-blokkade.
- **Uitnodigingshistorie + provenance:** append-only `history[]`, `source`.
- **Evaluaties-UX:** KPI-kaarten, testerreis-funnel, verdelingen, open inzichten.
- **Canonieke host:** één `MACULIS_HOST` (default `https://www.maculis.nl`).
- **WhatsApp:** handmatige "Uitnodiging verzonden"-bevestiging (openen ≠ verzenden).
