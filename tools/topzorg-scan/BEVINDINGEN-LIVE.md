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
