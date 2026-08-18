# Maculis · Atelier en Vijfde Kamer

**Laagscheiding. Conceptuele uitwerking, ronde 2.**

Status: lagen 1 en 2 uitgewerkt. Laag 3 gereserveerd. Laag 4 nog niet te nemen.
Datum: 2026-08-18.
Bouwt voort op `ONTWERPSTUDIE.md`. Vervangt die niet.

---

## 0. Werkwijze en status

Vanaf deze ronde geldt een harde scheiding tussen vier lagen. Ze worden in volgorde behandeld en
een latere laag mag een eerdere niet vooruitlopen.

| Laag | Inhoud | Status |
|---|---|---|
| **1. Functionele these** | wat de Vijfde Kamer moet oplossen | **uitgewerkt**, hoofdstuk 1 |
| **2. Informatiearchitectuur** | wat er inhoudelijk in moet leven | **uitgewerkt**, hoofdstuk 2 |
| **3. Visual DNA** | uitsluitend uit de centrale canon | **gereserveerd**, hoofdstuk 3 |
| **4. Productbeslissing** | kamer, werkruimte, ledgerlaag of combinatie | **nog niet te nemen**, hoofdstuk 4 |

Twee dingen die hieruit volgen en die ik expliciet vastleg:

**De canon wordt centraal gepubliceerd in `ftrlabs-docs/03-ux/`.** Tot die er is, wordt er niets
visueel uitgewerkt. Niet afgeleid, niet gereconstrueerd, en niet vanuit de bestaande implementatie.

**Het oordeel uit ronde 1 is input, geen conclusie.** De eerste studie eindigde met "bouw het
geheugen, bouw de kamer niet". Die bevinding blijft staan als waarneming: de ledger is mogelijk
waardevoller dan onmiddellijk een volledige vijfde productkamer. Maar het is een invoer voor laag
4, en laag 4 is nog niet aan de beurt.

---

# LAAG 1 · Functionele these

## 1.1 Wat de Vijfde Kamer moet oplossen

> **De Vijfde Kamer moet ervoor zorgen dat ik de samenhang van de ontwikkeling van Maculis niet
> langer zelf hoef te dragen, en dat wat ik dan wél te zien krijg zo weinig mogelijk is.**

Twee helften, en ze zijn allebei nodig. De eerste helft gaat over onthouden. De tweede gaat over
weglaten. Een omgeving die alles onthoudt en alles toont, lost de eerste helft op en maakt de
tweede erger.

## 1.2 Het probleem, precies benoemd

Uit de eerste studie, en het blijft staan: van de acht knelpunten die je noemde zijn er zes
continuïteit (besluiten die verdampen, hypotheses die niemand bijhoudt, agents die de canon niet
kennen, parallelle opdrachten die je uit elkaar moet houden), één is aandacht (er staat iets klaar
voor jouw oordeel), en één staat al in CI.

Daaruit volgt de rangorde van de functionele these:

1. **Continuïteit.** Wat besloten is, blijft besloten en blijft vindbaar, ook voor de volgende
   sessie.
2. **Selectie.** Van alles wat waar is, komt alleen naar voren wat nu betekenis heeft.
3. **Oordeel.** Wanneer alleen jij iets kunt beslissen, is dat het enige wat je te zien krijgt.
4. **Stilte.** Wanneer geen van de drie speelt, is de omgeving stil, en die stilte is een uitspraak
   en geen leegte.

## 1.3 De convergentievraag

Jouw oorspronkelijke uitgangspunt was je MacBook als dagelijkse Maculis-werkruimte. De bevinding
over het geheugen heeft dat niet vervangen. De vraag is of ze samenvallen.

**Mijn these: ze vallen samen, en wel op één specifiek punt.**

Een persoonlijke werkruimte die zelf onthoudt, wordt een systeem dat je moet bijhouden. Een
geheugen zonder voorkant wordt een bestand dat je nooit opent. De twee ideeën vallen samen zodra
het geheugen **onder** de werkruimte ligt en de werkruimte **niets bezit**:

> **ATELIER onthoudt. VIJFDE KAMER projecteert. De werkruimte is de projectie van het geheugen op
> dit moment, voor deze persoon.**

Dat is geen compromis tussen twee ideeën. Het is de reden dat allebei kan werken. Het geheugen
krijgt een voorkant die je dagelijks ziet, waardoor het gevoed blijft. De werkruimte krijgt een
onderlaag, waardoor hij radicaal selectief mag zijn: hij mag dingen weglaten, want niets kan er
verloren gaan.

## 1.4 De grondwet van de scheiding

Vier regels. Ze zijn functioneel, niet visueel, en ze zijn precies wat de scheiding waard maakt.

**Regel 1. De Vijfde Kamer mag niets weten wat het Atelier niet weet.**
Alles wat je ziet, moet herleidbaar zijn tot de ledger plus de repository. Geen voorkeuren, geen
weggeklikte meldingen, geen verborgen scores, geen eigen sorteervolgorde. Zodra er iets bestaat dat
je alleen kunt weten door de kamer te openen, is de scheiding mislukt en is de kamer stiekem het
systeem geworden.

**Regel 2. De kamer leest voortdurend en schrijft zelden.**
Precies twee dingen gaan terug naar het Atelier: dat jij iets gezien hebt, en wat jij besloten
hebt. Beide zijn menselijke signalen. Nooit een webhook, nooit een achtergrondjob, nooit de AI.
Dat is het watermerkprincipe dat de Communication Layer al hanteert, toegepast op de bouw van
Maculis zelf.

**Regel 3. Aandacht wordt afgeleid, nooit opgeslagen.**
Er bestaat nergens een veld dat zegt dat iets aandacht nodig heeft. Het wordt elke keer opnieuw
berekend. Daardoor kan het niet verlopen, niet vastlopen en niet uit de pas raken met de
werkelijkheid.

**Regel 4. Het spoor blijft.**
Iets dat ooit bevestigd en stil was en opnieuw in beweging komt, behoudt zijn vorige bevestigde
toestand. In de tweelaagse architectuur is dat geen visuele keuze maar een eigenschap van het
geheugen: het Atelier bewaart dat er ooit rust was. Hoe dat zichtbaar wordt, is laag 3.

## 1.5 Wat de kamer nadrukkelijk niet oplost

Buiten de these, en niet later alsnog binnenhalen: taakbeheer, notificaties, agenda, e-mail,
algemene productiviteit, een AI-chatvenster, een activiteitenoverzicht en elke vorm van meten
hoeveel er gebeurt.

---

# LAAG 2 · Informatiearchitectuur

## 2.1 Wat het Atelier onthoudt

Zeven soorten. Meer niet. Elk achtste type is het begin van een ticketsysteem.

| Soort | Wat het is | Wie schrijft |
|---|---|---|
| **vraag** | wat we willen weten | jij of een agent |
| **hypothese** | wat we vermoeden, nog zonder grond | jij of een agent |
| **bewijs** | wat iets heeft aangetoond, met verwijzing | agent |
| **besluit** | wat is vastgesteld, met datum en reden | **alleen jij** |
| **onzekerheid** | wat we expliciet nog niet weten | jij of een agent |
| **heropening** | een besluit dat onder druk is komen te staan | jij, na signaal van een agent |
| **bron** | waar het vandaan kwam, plus één zin over wat het opleverde | agent |

Twee regels die het geheugen gezond houden:

- Een bron mag alleen bestaan als er minstens één andere regel uit voortkomt. Zonder die regel
  groeit er een archief van gesprekken, en dan heb je je chatgeschiedenis nagebouwd.
- Een heropening verwijdert het oorspronkelijke besluit niet. Ze legt er een regel naast. Het
  besluit blijft leesbaar, inclusief de reden waarom het toen klopte. Dat is wat het spoor voedt.

Het Atelier heeft geen interface. Zijn belangrijkste lezer is de volgende sessie, niet jij.

## 2.2 De eenheid: een ontwikkellijn is een vraag

Uit ronde 1, en het blijft de dragende keuze. Een ontwikkellijn is geen project maar een vraag die
Maculis op dit moment beantwoordt. "Visual DNA" is een bak waar alles in kan. "Blijven vier kamers
herkenbaar familie zonder elkaar te kopiëren?" heeft een antwoord of nog niet.

Daarmee valt er niets te verslepen, is klaar betekenisvol, en wordt samenvallen van twee lijnen een
gewone gebeurtenis in plaats van een functie.

## 2.3 Twee assen, geen status

Grond en beweging zijn onafhankelijk en mogen nooit tot één statuskolom worden platgeslagen.

**Grond:** vermoeden, onderzocht, besloten, bewezen, canon.
**Beweging:** stil, in beweging, wacht op mij.

De combinaties die één status onmogelijk maakt, zijn juist de belangrijkste: canon dat weer in
beweging komt, een geparkeerde hypothese die volstrekt gezond is, en werk dat loopt zonder dat er
een besluit onder ligt.

## 2.4 Twee projecties

De kamer krijgt vier ingangen: de ledger, de tijd, waar jij het laatst naar keek, en de toestand
van de repository. Die laatste is gratis, want de repository weet al wat er gebeurt.

Er zijn twee verschillende projecties, en ze worden vaak verward.

### Aandacht: vraagt dit iets van mij?

Drie regels. Dit is de hele intelligentie en het is opzettelijk klein.

1. **Bewijs zonder oordeel.** Er ligt bewijs tegenover een open vraag en niemand heeft geoordeeld.
2. **Besluit onder druk.** Nieuw bewijs of nieuw inzicht spreekt een vastgelegd besluit tegen.
3. **Werk zonder grond.** Er wordt gebouwd aan iets waarvoor geen besluit bestaat.

Alle drie zijn berekenbaar uit de ledger. Geen model, geen ranking, geen scoring.

### Betekenis: is hier iets verschoven?

Nieuw in deze ronde. Iets kan betekenis hebben zonder iets te vragen. Vier regels.

1. **Verdichting.** Een lijn kreeg onafhankelijke grond sinds jouw laatste blik.
2. **Nadering.** Een lijn is dicht bij beantwoordbaar. Nog één stuk bewijs.
3. **Samenkomst.** Twee lijnen blijken dezelfde vraag te stellen.
4. **Veroudering.** Een lijn staat lang stil zonder grond. Niet urgent, maar stilletjes aan het
   doodgaan, en dat toont geen enkel dashboard.

Aandacht zegt: doe iets. Betekenis zegt: hier is Maculis bewogen. Op de meeste dagen is er geen
aandacht en één betekenis. Dat is de gezonde toestand.

## 2.5 De drie toestanden

Uit die twee projecties volgen drie toestanden. Niet zes labels. Drie.

**Stil.** Geen aandacht, geen betekenis. Het geheugen in rust.
**Zacht.** Geen aandacht, wel betekenis. Eén zin, geen handeling, geen knop.
**Gericht.** Er is aandacht. Eén ding, met het oordeel eraan vast.

Meer toestanden komen er niet. Bij een vierde ben je hem aan het bedienen in plaats van te lezen.

## 2.6 Het aanwezigheidsmodel

Dit gaat over **wanneer je wat te zien krijgt**, niet over hoe het eruitziet. Vorm is laag 3.

Er is één projectie. Het moment bepaalt hoeveel ervan aanwezig is.

**Aanwezigheid 1. Achtergrond.** Permanent aanwezig, vraagt nooit iets, verandert hooguit eenmaal
per dag. Draagt de stille toestand. Je bent niet bedoeld om ernaar te kijken, je bent bedoeld om
hem te hebben.

**Aanwezigheid 2. Aanspreking.** Bij het begin van je werkdag. Als er sinds je laatste blik iets is
verschoven, komt daar kort één zin bij. Als er niets is verschoven, gebeurt er niets.

**Aanwezigheid 3. Ruimte.** Wanneer je hem bewust opent. Het volledige beeld, met de lijnen en het
oordeel.

Aanwezigheid 1 en 2 zijn dezelfde projectie op verschillende momenten. Daaruit volgt dat een
ambient achtergrond geen apart ontwikkelspoor is: het is de stille toestand die stil blijft staan.
Als de stille toestand geen goede achtergrond oplevert, is de stille toestand fout ontworpen. Dat
is de toets, en hij kost niets.

**Het belangrijkste besluit in dit model: openen is geen gebeurtenis.** Er gebeurt niets doordat
jij verschijnt. Elke omgeving die iets doet omdat jij er bent, traint je om te kijken.

## 2.7 De zes toestanden die je wilde zien

Hier informatiearchitectonisch beschreven. Wat elke toestand betekent en wat er inhoudelijk in
leeft. Hun vorm hoort bij laag 3 en blijft open.

**1. Rust.** Geen aandacht, geen betekenis. Aanwezig is: wat inmiddels vaststaat, en één zin die de
stand van Maculis benoemt. Niet een begroeting en niet een samenvatting van activiteit.

**2. Bij het openen van de MacBook.** Zie 2.6. De achtergrond staat er al. Alleen bij een
verschuiving sinds je laatste blik komt er kort één zin bij.

**3. Wat vandaag betekenis heeft.** De betekenisprojectie uit 2.4 levert hooguit één ding op, en
het is bijna nooit een handeling. Inhoudelijk klinkt dat als: drie onafhankelijke bronnen wijzen
nu dezelfde kant op; deze vraag is nog één stuk bewijs van een antwoord; deze twee vragen blijken
dezelfde vraag; deze hypothese heeft zes weken niets gekregen. Geen van vier vraagt iets van je.

**4. Een nieuw of heropend signaal.** Twee gevallen die inhoudelijk verschillen en die daarom niet
op elkaar mogen lijken.
*Nieuw* is betekenis in wording: het bestaat, het heeft nog geen grond, en het verdicht pas bij
onafhankelijke bevestiging.
*Heropend* is een besluit dat onder druk staat: het spoor van de vorige bevestigde toestand blijft
bestaan naast de nieuwe beweging.
Een heropening is het enige dat de stille toestand mag onderbreken. Niet omdat het dringend is,
maar omdat iets dat je geloofde niet langer veilig is.

**5. Hoe iets tot rust komt.** Rust is niet "af". Rust is: de vraag levert geen nieuwe signalen
meer op. Drie manieren.
*Beantwoord*: een besluit plus bewijs dat standhield. Grond wordt canon.
*Opgegaan in een andere lijn*: het bleek dezelfde vraag. Het spoor van de opgeloste lijn blijft
leesbaar.
*Losgelaten*: niemand heeft hem gevoed en jij laat hem expliciet los. Grond blijft laag. De lijn
verdwijnt niet.
Let op de asymmetrie: beantwoord en losgelaten zijn allebei stil, maar hun grond verschilt
maximaal. Met één statuskolom zouden ze hetzelfde zijn. Ze zijn het niet. Hoe dat verschil
waarneembaar wordt, is een vraag voor laag 3.

**6. Wanneer er werkelijk niets nodig is.** De stille toestand betekent: het geheugen klopt, niets
staat onbeoordeeld, geen besluit staat onder druk, er wordt niets gebouwd zonder grond, en er is
sinds je laatste blik niets verschoven. Dat is een uitspraak, geen afwezigheid. En het is precies
de uitspraak die je nu dagelijks in je hoofd doet, zonder zekerheid.

---

# LAAG 3 · Visual DNA

**Gereserveerd. Nog niet ingevuld.**

De canon wordt centraal gepubliceerd in `ftrlabs-docs/03-ux/`, met minimaal
`MACULIS_VISUAL_DNA_V1.0.md`, het machineleesbare tokenbestand, de definitieve Visual North Star
of een verwijzing daarnaar, en de versie- en governancestatus.

Tot die bron bevestigd beschikbaar is, wordt er niets visueel uitgewerkt. Niet afgeleid, niet
gereconstrueerd, en niet vanuit een bestaande implementatie.

Zodra de canon er is, wordt hij eerst volledig gelezen en pas daarna wordt laag 3 ingevuld. De
open vragen die laag 2 aan laag 3 doorgeeft, staan hieronder. Het zijn vragen, geen voorstellen.

1. Hoe wordt **grond** waarneembaar, en met welke stappen tussen vermoeden en canon?
2. Hoe wordt **beweging** waarneembaar, en hoe verschilt onzekerheid van werk dat loopt?
3. Hoe verschillen **beantwoord** en **losgelaten**, die allebei stil zijn maar tegengestelde
   grond hebben?
4. Hoe ziet het **spoor** eruit, waarmee een heropend besluit zijn vorige bevestigde toestand
   behoudt?
5. Hoe verschilt een **nieuw** signaal van een **heropend** signaal?
6. Wat is de vorm van de **stille toestand**, en houdt die vorm stand als permanente achtergrond?
7. Hoe verschijnt en verdwijnt de **ene zin** bij aanspreking, zonder dat openen een gebeurtenis
   wordt?

---

# LAAG 4 · Productbeslissing

**Nog niet te nemen.** Volgt pas na laag 3.

De vraag die dan beantwoord wordt: moet dit een vijfde kamer worden, een persoonlijke
werkruimte, een ledgerlaag, of een combinatie daarvan.

De invoer die tot nu toe is vastgelegd, zonder er nu een conclusie aan te verbinden:

**Voor de ledgerlaag.** De behoefte is aantoonbaar. De entry van 15 augustus in `BUILD_LOG.md` is
feitelijk al een handgeschreven ledger-regel: een hele sessie besteed aan het vastleggen van een
scopegrens, zonder code, opdat toekomstige sessies niet buiten hun mandaat bouwen. De kosten zijn
laag en de opbrengst begint bij de eerste sessie.

**Voor de werkruimte.** Zonder voorkant wordt het geheugen een bestand dat niemand opent. De
projectie is wat het geheugen gevoed houdt.

**Voor de combinatie.** De scheiding uit 1.3 maakt de voorkant wegwerpbaar: hij bezit niets, dus
hij kan worden herbouwd of weggegooid zonder verlies. Dat is een fundamenteel andere kostenpost
dan een vijfde productlijn met onderhoudsplicht.

**Tegen een volwaardige vijfde kamer.** Een kamer die meeloopt in elke harmonisatieronde en
meegroeit met elke DNA-wijziging, zonder er ooit klanten mee te bedienen, concurreert met het werk
dat hij zou moeten versnellen. Dit was de conclusie van ronde 1 en hij is nog niet weerlegd, alleen
verzwakt door de scheiding.

**Openstaand tot na laag 3.** Of de stille toestand als permanente achtergrond werkelijk standhoudt.
Als dat niet zo is, vervalt het argument dat de ambient laag gratis is, en verschuift de
kostenberekening.

---

## Bijlage · Wat ik in de repositories aantrof

Uitdrukkelijk **geen canon**. Vastgelegd als waarneming, omdat het mogelijk afwijkt van de canon
die nog gepubliceerd wordt, en omdat dat verschil zelf informatie is.

**Doorzocht:** `ftrprf-labs/website`, `ftrprf-labs/ftrlabs-docs`, `ftrprf-labs/maculis-first-five.`,
Google Drive en Canva.

**In `ftrlabs-docs`:** nul vermeldingen van Maculis. `03-ux/` bestaat als structuur met
`principles/`, `flows/`, `specifications/` en `assets/`, maar bevat alleen lege README's. Het
README wijst een externe design source of truth aan. Dit is dus de juiste plek voor de canon en hij
staat er op dit moment nog niet.

**In `maculis-first-five.`:** de live journey bevat een geïmplementeerd tokenblok. Twee mogelijke
afwijkingen ten opzichte van wat jij als canon beschreef, die het lezen waard zijn zodra de canon
er is: de journey gebruikt een andere serif dan Newsreader, en violet komt er niet in voor terwijl
goud daar de rol van licht vervult.

**In Drive en Canva:** niets relevants.

Deze waarnemingen worden niet gebruikt om te ontwerpen. Ze staan hier zodat bij het lezen van de
canon meteen duidelijk is waar de implementatie mogelijk achterloopt.

---

## Wat er niet is gebeurd

Geen productie gewijzigd. Geen interface aangeraakt. Geen Visual DNA gewijzigd of afgeleid. Geen
visuele uitwerking. Geen integratie, geen implementatie, geen deployment. De twee extra
repositories zijn uitsluitend gelezen.
