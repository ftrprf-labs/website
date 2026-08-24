# Bevindingen uit de live runs

## Run 1, 24 augustus 2026, 14:30

Eerste meting vanaf een Mac met gewone internettoegang. Uitkomst ROOD, maar dat was een fout in de
scanner en geen uitspraak over de vestiging.

Wat wel goed ging:

- De locatiepagina was bereikbaar met HTTP 200.
- De vestiging was herkenbaar aan de tekst.
- Er werd een afspraakknop gevonden.

Waar het misging:

De scan koos de knop "Afspraak maken" en klikte erop, waarna de klik na vijftien seconden afliep.
De schermafbeelding liet zien waarom. Er stonden twee consentlagen tegelijk open. Een Axeptio venster
in het midden met de knoppen "Laat mij kiezen" en "Oké!", en daaronder een eigen banner van
TopzorgGroep met "Ja, ik accepteer cookies" en "Nee, liever niet". Geen van beide teksten stond in de
lijst met consentpatronen, dus bleven ze staan. Het Axeptio venster ving vervolgens elke klik op.

### Drie zaken die dit blootlegde

**1. Consent was te smal geconfigureerd.** De patronen dekten alleen varianten als "Alles accepteren".
Nu staan de werkelijke teksten erin, en de scan blijft klikken tot er geen laag meer over is.

**2. Consentlagen kunnen elkaar afdekken.** De onderste banner was niet klikbaar zolang het venster
erboven stond. Een mislukte klik betekent dus niet dat de scan klaar is. De scan probeert nu de
volgende consentknop in plaats van te stoppen, en begint daarna opnieuw bovenaan.

**3. De knopkeuze was willekeurig.** Op de pagina staan twee links met exact de tekst "Afspraak
maken". Een in het menu naar `topzorggroep.nl/contact/afspraak-maken/` en een in de tekst naar
`medinello.nl/neem-contact-op/`. De scan pakte simpelweg de eerste in de DOM. Kandidaten worden nu
gewogen, waarbij een adres dat naar het portaal of naar een afspraakpagina verwijst zwaarder telt dan
een adres dat dat niet doet.

### Wat de opgeslagen HTML verder liet zien

Het woord "zorgtoegang" komt op de locatiepagina nul keer voor. De pagina zelf stuurt patiënten naar
de telefoon: "Wil je een afspraak maken? Bel 088 5670 100." Als er een online route bestaat voor deze
vestiging, loopt die dus via de algemene afspraakpagina en niet via een directe link op de
locatiepagina.

Daarom volgt de scan nu tot drie tussenpagina's voordat hij concludeert dat er geen online route is.
Op zo'n tussenpagina kiest hij eerst de eigen vestiging, herkenbaar aan Databankweg of Amersfoort.

### Bewijs dat de fixes werken

De scenariotest `echt-achtig` bootst deze situatie na: twee consentlagen die elkaar afdekken, twee
knoppen met dezelfde tekst en verschillende bestemming, en een tussenpagina met een vestigingskeuze
voor het portaal. Die test loopt door tot GROEN. Zonder de fixes liep hij vast op precies dezelfde
timeout als de echte run.

### Nog open

Of de online afspraakroute voor Revalidatie Amersfoort Databankweg werkelijk bestaat, is nog niet
vastgesteld. Run 2 moet dat uitwijzen.

## Run 2, 24 augustus 2026, 14:46

De consentlagen gingen nu wel weg en de klik werkte. Uitkomst opnieuw ROOD, maar een stap verder en
met veel meer informatie.

Gevolgde route:

1. Locatiepagina, klik op "Afspraak maken"
2. `topzorggroep.nl/contact/afspraak-maken/`
3. klik op "Locaties", naar `topzorggroep.nl/vestigingen/`
4. twee keer opnieuw op hetzelfde menu-item, dus in een kring

### De fout die dit blootlegde

Het menu-item "Locaties" klapt open met een lijst van alle vestigingen, waaronder Amersfoort. Mijn
zoekopdracht matchte op onderliggende tekst, dus dat menu-item paste op het patroon voor de
vestigingskeuze. De route liep daardoor het algemene overzicht in en bleef daar rondjes draaien.

Hersteld op drie manieren. Menu, kop en voettekst tellen niet meer mee bij het zoeken naar een
vervolgstap. Een kandidaat met een heel tekstblok als label valt af. En de route stopt zodra hij op
een adres uitkomt waar hij al geweest is, of wanneer een klik geen nieuwe pagina oplevert.

### Wat de pagina's zelf zeggen

Op `topzorggroep.nl/contact/afspraak-maken/` staat letterlijk:

> Je boekt eenvoudig en direct in de agenda van de zorgprofessional via de locatie- en praktijkpagina.

Online boeken hoort dus thuis op de vestigingspagina zelf. Maar op de vestigingspagina van
Revalidatie Amersfoort Databankweg komt het woord "zorgtoegang" nul keer voor, en de pagina zegt:

> Wil je een afspraak maken? Bel 088 5670 100.

Ook op de algemene afspraakpagina en op het vestigingenoverzicht komt "zorgtoegang" nul keer voor.

### Wat dit betekent voor de meting

De scan meldt nu expliciet het verschil tussen "de knop werkt niet" en "er is geen online ingang".
Voor dit tweede geval controleert hij of er ergens op de pagina een verwijzing naar het portaal
staat, en of de pagina naar de telefoon verwijst. De conclusie zegt dan dat de online
zelfbedieningsroute voor deze vestiging niet bestaat, of vanaf deze pagina niet te vinden is.

### Openstaande vraag voor run 3

Op Databankweg staan drie vestigingspagina's naast elkaar:

- `/vestigingen/revalidatie-amersfoort-databankweg/` (de gevraagde locatie)
- `/vestigingen/amersfoort-databankweg/` (fysiotherapie)
- `/vestigingen/dietetiek-amersfoort-databankweg/` (diëtetiek)

De opdracht beschrijft een fysiotherapie intake. De fysiotherapiepagina is daarom als
referentiemeting toegevoegd. Run 3 scant beide, zodat vaststaat of de online route überhaupt bestaat
en alleen op de revalidatiepagina ontbreekt, of dat hij nergens op deze vestiging bestaat.

## Run 3, 24 augustus 2026, 15:02

Eerste run met twee locaties. Dit is de run die de hoofdvraag beantwoordt.

| Locatie | Status |
| --- | --- |
| Fysiotherapie Amersfoort Databankweg | ORANJE |
| Revalidatie Amersfoort Databankweg | ROOD |

### De online route bestaat wel degelijk

De fysiotherapiepagina op hetzelfde adres leidt naar een echt afsprakenportaal:

```
https://mtcdatabankweg-tzg.mijnzorgtoegang.nl/app/#/eerste-afspraak-maken
```

Het portaal toont een stappenbalk met vijf stappen: Aandachtsgebied, Verwijzing, Datum en tijd,
Persoonsgegevens, Bevestigen. De eerste inhoudelijke stap vraagt "Waar kom je voor?" met deze keuzes:

Andere klacht, Duizeligheid, Duizeligheid intake met behandeling, Echografie, Elleboog en
Polsklachten, Enkelklachten, Fysiotherapie (intake), Fysiotherapie intake met behandeling (50 min),
Heupklachten, Kinderfysiotherapie, Knieklachten, Manuele therapie (intake), Manuele therapie intake
met behandeling, Nekklachten, Rugklachten, Schouderklachten.

Er is dus geen aparte stap voor de behandeling. Het aandachtsgebied is meteen de keuze voor de
behandeling, en de hele flow heet "Eerste afspraak inplannen", wat neerkomt op een intake.

### Waarom de fysiotherapiescan toch op ORANJE bleef staan

De scan klikte negen keer achter elkaar op "Volgende" zonder ooit een keuze te maken, en het portaal
bleef netjes melden: "Maak een keuze voordat je verder gaat." Twee oorzaken.

**De keuze matchte niet.** Het patroon zocht naar "fysiotherapie intake", maar de optie heet
"Fysiotherapie (intake)". De haakjes braken de match. De patronen staan nu op de werkelijke tekst,
met de gewone intake vóór de variant met directe behandeling, want die laatste duurt vijftig minuten
en is niet wat de opdracht beschrijft.

**De klik landde op het verkeerde element.** Elke keuze bestaat uit een verborgen radio-input met
daarnaast een label in een omhullende kaart. De scan vond de radio-input, die matcht namelijk op naam,
maar die is niet aanklikbaar. Vijftien seconden per poging, negen keer. Kandidaten zonder leesbaar
label vallen nu af, en een echt interactief element zoals een label of een knop weegt zwaarder dan de
omhullende kaart.

### Nog twee fouten die de nieuwe portaalfixture blootlegde

**Tekst uit het verkeerde tabblad.** Het portaal opent in een nieuw tabblad, maar de locatiepagina
blijft open. De agendaherkenning las de tekst van beide tabbladen samen, en een openingstijdenblok met
"Maandag tot en met vrijdag" werd daardoor als agenda geteld. De wizard kijkt nu alleen nog naar het
actieve tabblad.

**Eindeloos doorklikken.** Negen ronden op hetzelfde scherm leveren niets op behalve een lange run.
De wizard stopt nu zodra het scherm twee ronden achter elkaar identiek blijft.

### Nieuwe harde grens

Het portaal vraagt om persoonsgegevens vlak voor het bevestigen. De scan herkent dat scherm nu aan de
invoervelden en stopt daar onmiddellijk, zonder iets in te vullen. Komt zo'n scherm voor de agenda,
dan meldt het rapport dat de beschikbaarheid pas zichtbaar wordt na het invullen van gegevens. Dat is
een uitspraak over de patiëntbeleving en geen technische storing.

### De revalidatiepagina

Route: locatiepagina, dan `/contact/afspraak-maken/`, dan een knop die alleen naar een ankerpunt op
diezelfde pagina springt (`#afspraaksectie`). Geen portaal, en geen verwijzing naar een portaal op de
pagina zelf. Het beeld uit run 2 blijft dus staan, nu met de wetenschap dat de online route op hetzelfde
adres wel bestaat voor fysiotherapie.

## Run 4, 24 augustus 2026, 15:30

| Locatie | Status |
| --- | --- |
| Fysiotherapie Amersfoort Databankweg | ORANJE, één stap van GROEN |
| Revalidatie Amersfoort Databankweg | ROOD, ongewijzigd |

De wizard liep nu wel door. Gekozen: "Fysiotherapie (intake)", daarna "Geen verwijzing", en de agenda
kwam in beeld. Alleen de tijdsloten werden niet gezien.

### Eén selector te smal

De tijdsloten stonden er gewoon: 08:00, 10:05, 13:55, 14:20, 16:50 en 17:15. Ze zijn alleen
opgebouwd als `label` bij een verborgen radio-input, precies zoals de keuzekaarten eerder in de flow.
Mijn zoekopdracht voor tijdsloten keek naar knoppen, links, lijstitems en tabelcellen, maar niet naar
labels. Toegevoegd.

### Doorklikken bij een zichtbare agenda is nu verboden

De wizard drukte vier keer op "Volgende" terwijl de agenda al in beeld stond. Dat is niet onschuldig:
met een gekozen tijdslot leidt die knop naar het scherm voor persoonsgegevens. Zodra de agenda
zichtbaar is, klikt de scan niet meer door. Het enige wat dan nog mag, is een datum kiezen om de
tijdsloten zichtbaar te maken.

### Datum kiezen toegevoegd

In deze praktijk stond al een datum voorgeselecteerd, maar dat is niet vanzelfsprekend. De scan kiest
nu zelf de eerste beschikbare dag in de kalender wanneer er nog geen tijdsloten zichtbaar zijn.
Uitgeschakelde dagen blijven met rust. Een tweede agendafixture dekt dit af: daar verschijnen de
tijdsloten pas na het kiezen van een dag.

Eenendertig controles, exitcode 0.

## Verkenning van het centrale portaal, 24 augustus 2026, 16:47

Het centrale portaal `tzg.mijnzorgtoegang.nl/app/eerste-afspraak-maken` draait op een publieke REST
API. Dat is de belangrijkste vondst van het hele traject.

### De API

```
GET https://tzg.mijnzorgtoegang.nl/app/context
```

Levert een publiek toegangstoken (scope `mzt_public`, `authenticated: false`), het api adres, en de
organisatie: TopzorgGroep, slug `tzg`. Het token is ongeveer twaalf uur geldig.

```
GET https://api.mijnzorgtoegang.nl/appointment/compose-first-appointments/v1/context
```

Levert de zes stappen van de flow, elk met een eigen adres:

| Stap | Code | Adres |
| --- | --- | --- |
| 1 | focuses | `/v1/focuses` |
| 2 | referrals | `/v1/referrals` |
| 3 | practices | `/v1/practices?employee=..&gender=..` |
| 4 | slots | `/v1/slots?employee=..&gender=..` |
| 5 | data | `/v1/data` |
| 6 | confirmation | `/v1/confirmation` |

Stap 3 is de locatielijst en stap 4 is de beschikbaarheid. Precies de twee dingen die het dashboard
nodig heeft. Stap 5 en 6 raken we niet aan.

```
GET .../v1/focuses
```

Levert 38 aandachtsgebieden voor de hele organisatie, elk met een `reference` en een `label`,
waaronder "Fysiotherapie (intake)", "Manuele therapie (intake)", "Bekkenfysiotherapie (intake)",
"Kinderfysiotherapie", "Diëtetiek" en "Ergotherapie".

### Wat dit betekent

Het dagelijkse ophalen hoeft geen browser te gebruiken. Een handvol verzoeken per aandachtsgebied
vervangt honderdvijftig browsersessies. Dat scheelt uren looptijd, het is ordes van grootte minder
belastend voor het portaal, en het is niet gevoelig voor wijzigingen in de vormgeving.

De browserscanner blijft wel waardevol, maar in een andere rol: als steekproef die controleert of wat
de API zegt ook echt is wat een patiënt op zijn scherm ziet.

### Veiligheid tijdens de verkenning

De verkenner stopt zodra er een kalender of een invoerveld in beeld komt, en hij klikt geen
bedieningsknop aan die hij voor een locatie aanziet. In de nabootsing kwam hij daardoor niet eens in
de buurt van het bevestigingsendpoint: nul schrijfverzoeken, ook zonder dat de netwerkrem hoefde in
te grijpen.
