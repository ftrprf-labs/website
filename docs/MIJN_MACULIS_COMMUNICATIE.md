# Mijn Maculis · de communicatielaag — productvoorstel

**Datum** 2026-08-19 · **Status** gebouwd op de previewbranch, zie hoofdstuk 12 · **Scope** alleen Mijn Maculis
Raakt niet: productie, Cockpit, Website, Lens, Testerbeheer.

---

## 0. Twee bevindingen vooraf

**1. "Bespreek met Maculis" is op dit moment de deelknop.** In `public/mijn.js` opent dat label de
bevestiging voor `share`. Het belooft dus een gesprek en voert een deling uit. Dat is niet alleen een
tekstprobleem: het bezet precies het woord dat we voor de communicatielaag nodig hebben. Los daarvan
zegt het label ook niet wat er gebeurt, en canon 12 vraagt bij een knop precies dat.

**2. Vrijwel alles wat je vraagt bestaat al.** De Communication Layer heeft `conversation` en
`message` met een kanaal-enum die al `WEB` en `JOURNEY` kent, een attentiemodel dat kanaal-agnostisch
afleidt wat aandacht vraagt, een AI-composer waar een mens altijd akkoord geeft voordat er iets
uitgaat, en `relationship_memory` met precies de scheiding die jij beschrijft:

> AI-derived items are NEVER silently treated as hard fact: they land as `source='ai'`,
> `confidence='proposed'` until a human confirms.

Er hoeft dus geen tweede communicatiesysteem te komen. Er hoeft één kanaal bij, en één laag
betekenis bovenop wat er al is.

---

## 1. Het uitgangspunt

Communicatie in Mijn Maculis is geen supportkanaal en geen chatbot. Het is **doorpraten over wat
Maculis ziet**, in de ruimte waar je dat ziet.

Drie regels die de rest bepalen:

| # | Regel |
|---|---|
| 1 | Je praat altijd *ergens over*. De context is er al; je hoeft hem niet uit te leggen |
| 2 | **Reageren is niet onthouden.** Wat je zegt is een gesprek, tenzij je zegt dat het mee moet wegen |
| 3 | Er antwoordt een mens. Maculis stelt voor, een mens van Maculis bevestigt en verstuurt |

Regel 3 is geen belofte die we moeten bouwen: de Cockpit werkt al zo. `ai_draft` en `comm_draft`
worden voorgesteld, een mens keurt goed, en pas dan gaat er iets weg.

---

## 2. De vier ingangen

### 2.1 Vanuit een patroon, in het bewijsblad

Onder het bewijs, na de herkenningsvraag, staat één regel plus drie voorbeeldopeningen. Geen
invoerveld dat om aandacht schreeuwt: een uitnodiging.

```
ZEG HIER IETS OVER

  Dit herken ik deels, maar bij ons speelt nog iets anders
  Waar baseren jullie dit precies op?
  Wat zouden jullie hiermee doen?

  [ eigen woorden ]
```

De drie openingen zijn geen knoppen die iets versturen. Ze vullen het veld, zodat de drempel laag is
en de toon meteen goed staat. Wie klikt, ziet zijn eigen zin staan en kan hem aanpassen.

**Wat Maculis automatisch meekrijgt:** het patroon, de uitspraak zoals die op dat moment luidde, het
bewijs eronder, de organisatie, de persoon, en het lopende gesprek. Dat wordt zichtbaar getoond
voordat je verstuurt, want context die je niet ziet is context die je niet hebt gegeven:

> *Je stuurt dit mee: dit patroon, de zeven waarnemingen eronder, en wie je bent.*

### 2.2 Vanuit de herkenningsvraag

`Ja` · `Deels` · `Nee` blijft wat het is: één klik, geen gesprek. Maar **Deels** en **Nee** zijn
zonder toelichting arm, en dat weet de gebruiker zelf ook. Dus:

* **Ja** → bevestigd. Geen gesprek nodig. Wel de stille optie eronder om iets toe te voegen.
* **Deels** → direct daaronder: *"Wat klopt er wel en wat niet?"* met het invoerveld al open.
* **Nee** → direct daaronder: *"Wat zien wij verkeerd?"* met het invoerveld al open.

Het antwoord op de vraag en het gesprek zijn twee dingen. Je mag Deels antwoorden en niets zeggen.
Dan weet Maculis dat het deels klopt en verder niets, en dat is een eerlijke uitkomst.

### 2.3 Vanuit het veld zelf, zonder patroon

Eén rustige ingang in de periferie, naast Alle patronen en Samenwerking: **Iets vertellen**.

Voor wat niet bij een patroon hoort: een nieuwe ontwikkeling, een vraag, een correctie op iets wat
Maculis nog niet gezien heeft. Dezelfde compositie, alleen zonder patrooncontext:

```
IETS VERTELLEN

  Er is bij ons iets veranderd
  Ik heb een vraag over wat jullie zien
  Jullie missen iets

  [ eigen woorden ]
```

### 2.4 Terugkijken

**Gesprekken** komt als vierde item in de periferie. Geen inbox: een rustige lijst van draden, elk
met het patroon waar hij over ging als context, nieuwste boven. Wie een gesprek opent dat over een
patroon ging, kan van daaruit terug naar dat patroon in het veld.

Bovendien staat een gesprek dat bij een patroon hoort **ook in het bewijsblad van dat patroon**, als
"Ons gesprek hierover". Zo hoef je nooit ergens anders te zoeken naar wat je hier hebt gezegd.

---

## 3. Gesprek, input of geheugen: de drie niveaus

Dit is het hart van het voorstel, en het antwoord op "reageren is niet automatisch onthouden".

| Niveau | Wat de klant doet | Wat er gebeurt | Waar het landt |
|---|---|---|---|
| **1 · Gesprek** | typt iets en verstuurt | het is een bericht in een gesprek. Meer niet | `message` op een `conversation` |
| **2 · Laat dit meewegen** | vinkt bij het versturen expliciet aan | het wordt een voorstel voor het organisatiebeeld | `relationship_memory`, `source='customer'`, `confidence='proposed'` |
| **3 · Dit klopt niet** | kiest bij een patroon expliciet voor correctie | het gesprek is óók een correctie op wat Maculis ziet | idem, plus het patroon wordt gemarkeerd als betwist |

**Niveau 1 is de standaard.** Er is geen vinkje voorgeselecteerd. Wie niets aanvinkt, praat gewoon.

**Niveau 2 is één vinkje met eerlijke copy.** Niet "onthouden", want dat suggereert een geheugen dat
alles vasthoudt. Wel:

> ☐ Laat dit meewegen in wat Maculis van ons weet

met eronder, klein:

> *Wij nemen dit dan mee in hoe we naar jullie organisatie kijken. Je kunt dat later weer intrekken.*

**Niveau 3 hoort bij Deels en Nee.** Wie zegt dat iets niet klopt, corrigeert per definitie het
beeld. Dat mag niet in een gespreksdraad blijven hangen waar niemand meer naar kijkt.

### Waarom `confidence='proposed'` en niet meteen confirmed

Twee argumenten die tegen elkaar in gaan, en waarom ik voor `proposed` kies.

*Tegen:* het is hún organisatie. Dat Maculis moet bevestigen wat een klant over zichzelf zegt, kan
betuttelend voelen.

*Voor, en dit weegt zwaarder:* het bestaande model is er expliciet op gebouwd dat niets stilzwijgend
harde waarheid wordt, en de klantzijde is precies de plek waar dat het meest telt. Een zin in een
gesprek is bijna nooit een schone, tijdloze uitspraak. "Dat speelde vorig jaar" is waar én
verouderd. Een mens die het even leest, kost weinig en voorkomt dat het organisatiebeeld vervuilt.

**Maar de klant merkt daar niets van als vertraging.** In Mijn Maculis staat direct:

> *We nemen dit mee. Je ziet het terug zodra we het samen hebben vastgelegd.*

En in de Cockpit verschijnt het als een voorstel dat aandacht vraagt, in dezelfde stroom waar
AI-voorstellen al landen. Dat is één plek, niet een tweede werkbak.

---

## 4. De grens tussen privé en gedeeld

Hier zit de scherpste vraag van dit voorstel.

**Praten over een gedeeld patroon** is eenvoudig: het patroon is al van ons samen.

**Praten over een privépatroon** is het niet. Als je vraagt "waar baseren jullie dit op?" over een
inzicht dat je nog niet hebt gedeeld, moet Maculis weten wélk inzicht je bedoelt. Dat is een
grensovergang en die mag nooit stil gebeuren.

Voorstel, en dit is bewust de terughoudende variant:

* Je kunt praten over een privépatroon **zonder het te delen**.
* Wat Maculis dan ziet: jouw bericht, en dát je het over dit inzicht hebt. Niet de volledige
  privélezing eronder.
* Dat staat er letterlijk voordat je verstuurt:

  > *Dit inzicht is nog van jou alleen. Wij zien straks wel waar je vraag over gaat, maar niet de
  > lezing eronder. Wil je die er wel bij, deel het inzicht dan.*

* En één knop ernaast: **Deel het inzicht erbij**.

Dat is technisch uitvoerbaar met wat er al is: `sharedContextForOrg` blijft PRIVATE weglaten, en de
verwijzing van het gesprek naar het inzicht is een aparte, smallere koppeling.

---

## 5. Wat er in de Cockpit gebeurt

Niets nieuws om te leren. Een bericht uit Mijn Maculis is een gewoon gesprek op een nieuw kanaal.

* Het valt in het attentiemodel als `NEW` en daarna `UNREAD` of `NEEDS_ACTION`, precies zoals mail.
* De contextmotor bouwt er de gebruikelijke context bij, en die bevat al de gedeelde inzichten van
  deze organisatie plus het relatiegeheugen.
* De AI stelt een antwoord voor. Een mens leest, past aan en verstuurt. Er gaat nooit iets automatisch.
* Het antwoord verschijnt in Mijn Maculis in dezelfde draad.

Eén ding is anders en moet zichtbaar zijn: dit kwam **uit de eigen omgeving van de klant**, dus de
toon is anders dan een binnengekomen e-mail. Daarom een eigen kanaalwaarde en niet `WEB`.

---

## 6. Architectuurgevolgen

Klein en additief. Elk punt hieronder is een beslissing, geen uitgevoerd feit.

| # | Gevolg | Voorstel |
|---|---|---|
| A-1 | Kanaal | Eén waarde toevoegen aan `channel_kind`: `MIJN_MACULIS`. Eén migratieregel, additief |
| A-2 | Wie schreef dit | Een inkomend bericht is geschreven door een `customer_access`-grant, niet door een `app_user`. Voorstel: een nullable `message.customer_access_id` in plaats van het in `transport_meta` te verstoppen, want herkomst hoort een kolom te zijn |
| A-3 | Waar gaat het over | Een nullable `conversation.insight_id` naar `customer_insight`, plus de regel dat die verwijzing nooit de privélezing ontsluit |
| A-4 | Leesstatus | `conversation.last_read_at` is in het bestaande model uitdrukkelijk een **Maculis-mens**-signaal. De klant heeft een eigen watermerk nodig, gescheiden daarvan |
| A-5 | Geheugen | Geen schemawijziging. `relationship_memory` krijgt `source='customer'` als derde waarde naast `human` en `ai`. De kolom is al vrij tekst |
| A-6 | Herkenning | `Ja/Deels/Nee` is nu sessiegebonden. Om het te bewaren is één kleine tabel nodig, of een kolom op `customer_insight`. Los van dit voorstel te besluiten, maar het hoort erbij |
| A-7 | Consent | Een antwoord *in* Mijn Maculis is geen uitgaand kanaal en hoeft de consentpoort niet. Een **e-mailmelding** dat er antwoord is, wel. Die valt onder `channelAllowed(..., 'service')` |
| A-8 | Retentie | Gespreksinhoud valt onder het bestaande retentiebeleid. Geheugenitems niet automatisch: die zijn juist bedoeld om te blijven, dus die vragen een eigen bewaartermijn |

**Wat er niet komt:** geen tweede berichtenopslag, geen apart klantpostvak, geen eigen AI-route, geen
websockets. Bij openen ophalen en na versturen verversen is genoeg voor een gesprek dat door een
mens beantwoord wordt.

---

## 7. Copy en interactie

De toon is die van de kamer: rustig, menselijk, en nooit een supportdesk.

| Plek | Nu | Voorstel |
|---|---|---|
| Deelknop onder een inzicht | "Bespreek met Maculis" | **"Deel dit met Maculis"** |
| Gesprek starten bij een patroon | bestaat niet | **"Zeg hier iets over"** |
| Gesprek starten zonder patroon | bestaat niet | **"Iets vertellen"** |
| Terugkijken | bestaat niet | **"Gesprekken"** |
| Versturen | bestaat niet | **"Versturen"**. Niet "Verzenden naar Maculis", dat is dubbelop |
| Na versturen | bestaat niet | *"Verstuurd. Iemand van ons leest dit en reageert hier."* |
| Wachtstand in de draad | bestaat niet | *"Nog geen antwoord. We laten het hier weten."* |

Drie dingen die de copy **niet** doet: geen "chat", geen "ticket", geen belofte over hoe snel. En
nergens een schrijvend-indicator of een botpersona, want er zit geen bot achter.

De invoer zelf is één tekstveld dat meegroeit, met de verzendknop eronder in plaats van ernaast.
Geen emoji, geen bijlagen in de eerste versie. Bijlagen zijn een eigen beslissing met een eigen
privacyvraag.

---

## 8. Mobiel

Het bewijsblad is op mobiel al een bodemvel. Het gesprek zit daarin, onderaan, na het bewijs. Bij het
openen van het invoerveld schuift het vel naar volledige hoogte en blijft de knop boven het
toetsenbord staan, met `env(safe-area-inset-bottom)` zoals de rest van de kamer.

Het veld zelf verandert niet. Er komt geen aparte mobiele gespreksweergave, want dan zijn er twee
plekken waar hetzelfde staat.

---

## 9. Aanbevolen flow

```
Het Veld
  └─ patroon gekozen  →  bewijsblad
        ├─ bewijs, ontwikkeling, grens        (bestaat)
        ├─ Herken je dit?  Ja · Deels · Nee   (bestaat, nu sessiegebonden)
        │     └─ Deels/Nee  →  veld opent met "Wat klopt er niet?"
        ├─ Zeg hier iets over                  (nieuw)
        │     ├─ context zichtbaar vóór versturen
        │     ├─ ☐ Laat dit meewegen           (uit, standaard)
        │     └─ Versturen  →  gesprek in de Cockpit, mens antwoordt
        └─ Ons gesprek hierover                (nieuw, als er een draad is)

Periferie
  ├─ Alle patronen        (bestaat)
  ├─ Wat zie ik niet?     (bestaat)
  ├─ Samenwerking         (bestaat)
  ├─ Iets vertellen       (nieuw)
  └─ Gesprekken           (nieuw)
```

---

## 10. Wat ik zou bouwen, en in welke volgorde

Niet in één keer. Drie stappen die elk zelfstandig af zijn.

1. **De ingang en de draad.** Kanaal, bericht schrijven, gesprek tonen bij het patroon, antwoord
   terugzien. Zonder geheugen, zonder correctie. Levert meteen waarde en is klein.
2. **De drie niveaus.** Het vinkje, de correctie bij Deels en Nee, en de doorstroom naar
   `relationship_memory` als voorstel.
3. **Terugkijken en losse gesprekken.** Gesprekken in de periferie, en Iets vertellen zonder patroon.

De herkenningsvraag duurzaam maken (A-6) hoort vóór stap 2, want anders is een correctie hechter
vastgelegd dan het antwoord waar hij bij hoort.

---

## 11. Wat ik nog van jou nodig heb

1. **Bevestiging van de drie niveaus**, en met name of niveau 2 als voorstel binnenkomt of meteen
   als vastgelegd. Ik adviseer voorstel, met de motivering in hoofdstuk 3.
2. **De privékeuze uit hoofdstuk 4**: praten over een privépatroon zonder te delen, met zichtbare
   uitleg. Het alternatief is delen verplicht stellen, en dat vind ik te zwaar.
3. **De knopteksten** uit hoofdstuk 7, en dan vooral of "Zeg hier iets over" de juiste toon heeft.
4. **Of meldingen per e-mail** onderdeel van stap 1 zijn. Zo ja, dan komt de consentpoort er meteen
   bij; zo nee, dan ziet de klant een antwoord pas bij zijn volgende bezoek.


---

## 12. Wat er werkelijk is gebouwd

Dit hoofdstuk is geschreven ná de bouw. Hoofdstuk 1 tot en met 11 blijven staan zoals ze waren,
zodat zichtbaar blijft wat er is voorgesteld en waar de uitvoering daarvan afwijkt.

### 12.1 De vier beslissingen, zoals ze zijn uitgevoerd

| # | De beslissing | Hoe het is gebouwd |
|---|---|---|
| 1 | "Laat dit meewegen" komt binnen als voorstel | `relationship_memory` met `source='customer'` en `confidence='proposed'`, en zonder `confirmed_at`. Precies dezelfde stroom waarin AI-voorstellen al landen |
| 1b | Geen interne bestuurstaal voor de klant | De klant leest "We nemen dit mee. Je ziet het terug zodra we het samen hebben vastgelegd." De harness controleert het hele zichtbare oppervlak op woorden als `proposed` en `confidence` |
| 2 | Praten over een privépatroon zonder het te delen | Het gesprek wijst naar het inzicht, maar het interne leespad filtert nog steeds op `sharing='SHARED'` en volgt die verwijzing niet. Wat Maculis meekrijgt staat vóór het versturen op het scherm |
| 2b | Delen is een aparte handeling | "Deel dit inzicht met Maculis" staat naast de invoer, met de bestaande bevestiging erachter. Versturen deelt nooit |
| 3 | "Praat hierover met Maculis" als gespreksingang | Zo heet de ingang. De deelknop heet nu "Deel dit met Maculis" en doet ook alleen dat |
| 4 | E-mailmelding hoort bij stap 1 | Eén vaste tekst, zonder enige inhoud en zonder toegangslink, door de gewone consentpoort |

### 12.2 Migraties

Eén migratie, `009_mijn_maculis_gesprek.sql`, volledig additief.

| Wat | Waarom |
|---|---|
| `channel_kind` krijgt `MIJN_MACULIS` | Een eigen kanaalwaarde, niet `WEB`: andere herkomst, andere toon, andere consentgevolgen |
| `conversation.insight_id` | Waar gaat dit gesprek over |
| `conversation.customer_access_id`, `message.customer_access_id` | Wie aan klantzijde schreef dit. Herkomst hoort een kolom te zijn |
| `conversation.customer_read_at` | Het klantwatermerk, gescheiden van `last_read_at` dat strikt een Maculis-mens betekent |
| `message.notified_at` | Eén melding per antwoord, en achteraf controleerbaar |
| `customer_access.contact_id` | Zonder contact geen ontvanger en geen consentsubject. Dit knoopt de portaalidentiteit aan dezelfde relationele werkelijkheid als de Cockpit |
| `customer_insight.recognition`, `recognition_note`, `recognition_at`, `recognition_by` | De herkenningsvraag duurzaam, met de toelichting erbij |
| `insight_recognition_event` | Append-only spoor: van gedachten veranderen overschrijft niets stil |

Wat er níét is gekomen: geen tweede berichtenopslag, geen klantpostvak, geen eigen AI-route, geen
websockets, en geen tweede relationeel model.

### 12.3 Beoordelingen die ik zelf heb gemaakt

Drie plekken waar de uitvoering een keuze vroeg die niet in de opdracht stond.

**De herkenningsvraag is duurzaam gemaakt.** Dat stond in het voorstel als A-6, "los van dit
voorstel te besluiten". Ik heb het toch gedaan, om de reden die in hoofdstuk 10 al stond: anders is
een correctie hechter vastgelegd dan het antwoord waar hij bij hoort. Het antwoord volgt dezelfde
grens als het inzicht: bij een privé-inzicht blijft het bij de klant, en dat staat er ook.

**"Iets vertellen" is geen apart item in de periferie geworden.** Zes knoppen naast elkaar wikkelen
op een telefoon naar drie rijen en duwen de begroeting weg. De periferie heeft er daarom één item
bij, "Gesprekken", en "Iets vertellen" staat bovenaan in dat blad. Beide functies uit het voorstel
zijn er, op één plek in plaats van twee.

**Het kanaal is antwoord-only, en de Cockpit is met drie regels aangeraakt.** Een mens bij Maculis
moet kunnen antwoorden, anders is de laag half. Dat werkt vanzelf: een concept op een Mijn
Maculis-gesprek opent al op dat kanaal, want `drafts.mjs` neemt het kanaal van het gesprek over. Ik
heb Mijn Maculis daarom bewust NIET aan `SENDABLE_CHANNELS` toegevoegd. Dat zou het een kanaal maken
waar je naartoe kunt WISSELEN, en dan kan een mailgesprek in een klantomgeving worden geduwd die die
persoon misschien niet eens heeft. De enige Cockpit-wijziging is daardoor de naam: drie
opzoektabellen krijgen `MIJN_MACULIS: 'Mijn Maculis'`, zodat er nergens een enum-naam op het scherm
verschijnt. Aan bestaande Cockpit-schermen verandert niets, want geen enkel bestaand gesprek heeft
dit kanaal.

**De ingang is een tekstknop en geen kop.** "Praat hierover met Maculis" is 26 tekens. Als knoptekst
past dat op 390px, en de harness controleert dat ook: geen enkele knop loopt buiten haar plek. De
verzendknop heet gewoon "Versturen".

### 12.4 Wat er is getest

Twee harnassen, allebei groen, allebei op desktop én mobiel.

`tests/mijn-gesprek.test.mjs` loopt door de echte HTTP-routes op een echte Postgres: een gesprek
vanuit een patroon, praten over een privépatroon zonder te delen, daarna wél delen, Ja/Deels/Nee met
toelichting en het spoor daarvan, het vinkje dat standaard uit staat, een gesprek zonder patroon, het
antwoord van Maculis door hetzelfde ene verzendpad, de melding zonder inhoud, de melding die
uitblijft zonder toestemming en zonder contact, en het terugvinden van een gesprek. Plus de grens
zelf, na afloop van dat alles: nog steeds precies één gedeeld inzicht.

`tools/visual/mijn-gesprek-ui.mjs` meet hetzelfde op het scherm, twee keer: 1440 en 390. Wat de klant
leest, wat er werkelijk wordt verstuurd, dat het vinkje uit staat, dat er nergens interne
bestuurstaal staat, en dat geen enkele knoptekst buiten haar plek loopt.

Daarnaast onveranderd groen: `tools/visual/mijn-audit.mjs` (regime, contrast, focus, overflow,
reduced motion, nu ook op de schermen `praat` en `gesprekken`), `tools/visual/mijn-motion.mjs` en
`tools/visual/mijn-affordance.mjs`.

### 12.5 Wat werkelijk nog openstaat

Dit zijn geen restpunten maar productbeslissingen die niemand nog heeft genomen.

1. **De route terug in de melding.** De e-mail bevat geen toegangslink, want alleen de hash van een
   token wordt bewaard en we verzinnen er geen. De klant opent Mijn Maculis dus met zijn eigen link.
   Het alternatief is een kortlevende link per melding aanmaken. Dat is te bouwen, maar het is een
   nieuwe soort geheim en dus jouw beslissing.
2. **Wat een antwoord doet met het patroon.** Nee zeggen maakt het patroon in het veld weer onzeker.
   Wat een Nee intern zou moeten betekenen voor de status van het inzicht, is nog niet bepaald.
   Nu gebeurt er intern niets automatisch, en dat is de veilige stand.
3. **Bijlagen.** Bewust niet gebouwd. Een bijlage is een eigen privacyvraag.
4. **Bewaartermijn van geheugenitems.** Gespreksinhoud valt onder het bestaande retentiebeleid.
   Voorstellen in het relatiegeheugen zijn bedoeld om te blijven en vragen een eigen termijn.
5. **Waar een bevestigd voorstel terugkomt voor de klant.** De klant leest nu "je ziet het terug
   zodra we het samen hebben vastgelegd". De plek waar dat gebeurt is Samenwerking, maar de promotie
   daarheen is nog handwerk in de Cockpit.
6. **De melding threadt in de gewone e-mailconversatie van het contact.** Dat is eerlijk, want het
   is een echte e-mail die wij stuurden. Of jij die meldingen liever in een eigen draad ziet, is een
   keuze die ik niet voor je heb gemaakt.
