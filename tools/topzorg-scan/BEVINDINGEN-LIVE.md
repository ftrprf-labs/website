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
