# Advies bij de PoC

## Korte samenvatting

De opzet is betrouwbaar genoeg om naar meerdere locaties uit te breiden, maar nog niet betrouwbaar
genoeg om er zonder menselijke controle op te alarmeren. Zet eerst één locatie twee weken lang
dagelijks aan, meet hoe vaak de uitkomst wisselt zonder dat er iets veranderd is, en schaal daarna op.

## Is dit betrouwbaar genoeg om uit te breiden?

Wat pleit voor uitbreiden:

- Een locatie is puur configuratie in `src/config.mjs`. Een vestiging toevoegen kost geen code.
- De zoeklogica werkt op rol en zichtbare tekst, niet op broze CSS selectors. Een restyling van de
  site breekt de scan dus niet meteen.
- De scan zoekt in elk tabblad en in elk iframe, dus het maakt niet uit of het widget ingebed of
  losgekoppeld draait.
- Elke stap levert een schermafbeelding en een logregel op, dus een uitkomst is altijd na te lopen
  zonder de scan opnieuw te draaien.
- De veiligheidslaag is getest en niet optioneel. Er is geen pad waarlangs de agent per ongeluk
  bevestigt.

Wat nog ontbreekt voor productiegebruik:

- De wizard is nog niet tegen de echte Mijn Zorgtoegang gedraaid. De keuzepatronen in de configuratie
  zijn gebaseerd op de beschreven route en moeten na de eerste live run bijgesteld worden.
- Er is nog geen onderscheid tussen "kapot" en "vol". Een agenda zonder tijden kan betekenen dat de
  praktijk vol zit. Dat is bedrijfsmatig iets heel anders dan een defecte flow.
- Eén meting zegt weinig. Zonder herhaling en historie leidt elke tijdelijke storing tot een vals alarm.

## Technische risico's

**1. Wisselende uitkomsten zonder dat er iets stuk is.**
Trage schermen, een cookiebanner die niet verschijnt, of een agenda die net iets later laadt kunnen
een ORANJE opleveren terwijl de route gewoon werkt. Beheersing: meet drie keer voordat je een status
vaststelt, en behandel alleen een uitkomst die zich herhaalt als een echt signaal.

**2. Verschil tussen leeg en stuk.**
De check op tijdsloten meet zichtbaarheid, niet capaciteit. Beheersing: leg per run het aantal
tijdsloten vast in `rapport.json`, en alarmeer op een plotselinge daling naar nul in plaats van op
de nulmeting zelf.

**3. Botdetectie en toegangsbeperking.**
Zowel de website als het portaal kunnen geautomatiseerd verkeer blokkeren, met een captcha of met
een tijdelijke blokkade van het IP adres. Beheersing: stem het scanritme af met de leverancier van
Mijn Zorgtoegang, draai hoogstens een paar keer per dag, en gebruik een vast en herkenbaar IP adres
zodat de scan als bekend verkeer te whitelisten is. Doe dit voordat je opschaalt.

**4. Wijzigingen in de wizard.**
Een nieuwe tussenstap, andere labels of een extra verplichte keuze laten de flow stranden voor de
agenda. Dat wordt zichtbaar als ORANJE, niet als een crash, dus het valt op. Beheersing: bekijk bij
elke nieuwe ORANJE eerst de schermafbeeldingen voordat je de configuratie aanpast.

**5. Te ruime herkenning van de agenda.**
De agenda wordt ook herkend aan een reeks weekdagen. Een pagina met openingstijden kan daar in
theorie op lijken. De controle op tijdsloten vangt dat af, maar bij uitbreiding naar locaties met
een andere paginaopbouw is dit het eerste dat vals positief kan worden.

**6. Toegang tot het inlogdeel.**
De publieke route stopt bij de agenda. Wat daarna komt, dus inloggen, gegevens invullen en
bevestigen, wordt bewust niet getest. Een storing die pas na het inloggen optreedt, ziet deze scan
dus niet. Dat is een bewuste grens en geen tekortkoming, maar hij moet wel expliciet zijn richting de
opdrachtgever.

**7. Onderhoud aan de browserversie.**
Playwright en Chromium horen bij elkaar. Een ongecontroleerde upgrade kan het gedrag veranderen.
Beheersing: `npm ci` gebruiken en de versie bewust bijwerken, met daarna één keer `npm test`.

## Voorgestelde vervolgstappen

1. Draai de scan één keer live vanaf een werkplek met internettoegang en stel de keuzepatronen bij op
   basis van de schermafbeeldingen.
2. Zet daarna een dagelijkse run op één locatie, veertien dagen lang, en bewaar `rapport.json` per dag.
3. Voeg pas daarna de overige vestigingen toe, in blokken van vijf, zodat een fout in de configuratie
   niet meteen het hele beeld vervuilt.
4. Bouw de meldingen op de historie en niet op de losse meting: alarmeer bij twee opeenvolgende runs
   met dezelfde afwijking.
5. Overweeg pas daarna de uitbreidingen uit de opdracht, dus visuele analyse, een dashboard en
   meldingen in Teams. Die hebben alleen waarde als de onderliggende meting stabiel is.
