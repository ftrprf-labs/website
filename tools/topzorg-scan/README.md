# Topzorg Digital Appointment Guardian

Proof of Concept van een browser agent die controleert of een patiënt daadwerkelijk online een
afspraak kan maken bij TopzorgGroep via Mijn Zorgtoegang.

De eerste test betreft één locatie: **Revalidatie Amersfoort Databankweg**.

De agent maakt **nooit** een echte afspraak. De flow stopt bij de agenda, dus voordat er iets
bevestigd wordt.

## Wat de scan doet

1. Opent een browser en navigeert naar de locatiepagina.
2. Klikt een eventuele cookiebanner weg.
3. Controleert of de pagina bereikbaar is en of de vestiging herkenbaar is in de tekst.
4. Zoekt de knop om online een afspraak te maken en klikt daarop.
5. Wacht tot Mijn Zorgtoegang geladen is, ook als dat in een nieuw tabblad of in een iframe gebeurt.
6. Doorloopt de wizard: aandachtsgebied, fysiotherapie intake, geen verwijzing, geen voorkeur.
7. Controleert of er een agenda verschijnt en of daar beschikbare tijden in staan.
8. Stopt en schrijft het rapport weg.

Bij elke stap komt er een schermafbeelding in de runmap, en elke handeling staat in `run.log`.

## Installatie

Vereist: Node.js 18 of nieuwer.

```bash
cd tools/topzorg-scan
npm ci                      # of: npm install
npx playwright install chromium
```

`npm ci` installeert de vastgezette versie uit `package-lock.json`. Dat houdt scans over langere tijd
vergelijkbaar, want elke Playwright versie hoort bij een eigen Chromium build.

## Scan starten

```bash
npm run scan                # standaardlocatie, headless
npm run scan:headed         # met zichtbare browser, handig om mee te kijken
node src/scan.mjs --help    # alle opties
```

Nuttige opties:

| Optie | Betekenis |
| --- | --- |
| `--headed` | toont de browser tijdens de scan |
| `--slowmo=250` | vertraagt elke handeling met 250 ms |
| `--locatie=<sleutel>` | kiest een andere geconfigureerde locatie |
| `--url=<adres>` | overschrijft de URL van de locatiepagina |
| `--out=<map>` | schrijft de resultaten naar een eigen map |
| `--bewaar-html` | bewaart ook de ruwe HTML per scherm, voor kalibratie |

Exitcodes voor automatisering: `0` bij GROEN, `1` bij ORANJE, `2` bij ROOD, `3` bij een onverwachte fout.

## Resultaten

Elke run maakt een map onder `runs/`:

```
runs/2026-08-22_09-30-11_revalidatie-amersfoort-databankweg/
  rapport.txt          het leesbare rapport
  rapport.json         dezelfde uitkomst als data, voor dashboards en meldingen
  run.log              tijdgestempelde log van elke handeling
  screenshots/         schermafbeelding per stap
  diagnose/            per scherm de adressen, alle klikbare labels en de zichtbare tekst
```

De map `diagnose/` is bedoeld voor kalibratie. Als een keuze in de wizard niet gevonden wordt, staat
daar precies welke labels dat scherm wel aanbood. De patronen in `src/config.mjs` zijn daarmee bij te
stellen zonder de scan opnieuw te draaien.

## Zelftest zonder de productiesite

De PoC bevat een lokale nabootsing van de patiëntroute. Daarmee is de scanner te controleren zonder
de echte site te belasten:

```bash
npm test                # veiligheidstest plus drie scenario's
npm run test:safety     # alleen de veiligheidslaag
npm run test:fixture    # alleen de drie scenario's
npm run fixture         # start de nabootsing op http://127.0.0.1:8787 om zelf te kijken
```

De scenario's controleren dat een gezonde route GROEN oplevert, een agenda zonder tijden ORANJE, en
een pagina zonder afspraakknop ROOD. De veiligheidstest controleert dat een knop met het label
"Afspraak bevestigen" geweigerd wordt en dat een schrijfverzoek naar het bevestigingsendpoint
geblokkeerd wordt.

## Veiligheid

Ontwerpprincipe 1 uit de opdracht is op drie manieren afgedwongen, in `src/safety.mjs`:

1. De flow stopt uit zichzelf zodra de agenda met tijden zichtbaar is.
2. Elke klik gaat door een guard die labels weigert als bevestigen, boeken, afronden, betalen,
   registreren of inloggen.
3. Een netwerkrem blokkeert POST, PUT, PATCH en DELETE naar endpoints die op een boeking lijken,
   ook als een klik onverhoopt toch doorkomt.

Verder vult de scan nooit een formulierveld in, dus er gaan geen persoonsgegevens de flow in. Er
wordt niets opgeslagen behalve de eigen schermafbeeldingen, het logbestand en het rapport.

## Locaties uitbreiden

Een locatie is een object in `src/config.mjs`. Een tweede vestiging toevoegen kost geen nieuwe code:

```js
'fysiotherapie-amersfoort-databankweg': {
  key: 'fysiotherapie-amersfoort-databankweg',
  naam: 'Fysiotherapie Amersfoort De Hoef',
  url: 'https://www.topzorggroep.nl/vestigingen/amersfoort-databankweg/',
  herkenning: [/databankweg/i, /amersfoort/i],
  portaalHost: /zorgtoegang/i,
  keuzes: { aandachtsgebied: [...], behandeling: [...], verwijzing: [...] },
},
```

Lees eerst `ADVIES.md` voordat je opschaalt naar alle vestigingen.

## Live validatie in één commando

De eerste echte meting moet gedaan worden vanaf een werkplek met gewone internettoegang. Daarvoor is
één commando genoeg:

Vanaf een Mac zonder lokale kopie van deze repository, in één commando, ongeacht de map waarin
Terminal staat:

```bash
bash -c 'set -u; D="$HOME/topzorg-live-validatie/$(date +%Y%m%d-%H%M%S)"; mkdir -p "$D" && { git clone --depth 1 --branch claude/topzorg-appointment-poc-h2f5e7 https://github.com/ftrprf-labs/website.git "$D/website" || { rm -rf "$D/website"; git clone --depth 1 --branch claude/topzorg-appointment-poc-h2f5e7 git@github.com:ftrprf-labs/website.git "$D/website"; }; } && TOPZORG_GEISOLEERD=1 bash "$D/website/tools/topzorg-scan/live-validatie.sh"'
```

Elke run kloont naar een eigen map met tijdstempel onder `~/topzorg-live-validatie/`. Met
`TOPZORG_GEISOLEERD=1` blijft het script binnen die kopie en kijkt het niet naar andere
repositories op de machine, dus bestaand lokaal werk blijft ongemoeid. Werkt HTTPS niet, dan valt
het commando terug op SSH.

Staat de repository al lokaal, dan volstaat vanuit `tools/topzorg-scan`:

```bash
bash live-validatie.sh
```

Het script zoekt zelf de juiste repository, ook als je het vanuit een andere map start, haalt de
branch op, installeert wat ontbreekt, hergebruikt een al aanwezige Chromium, draait de scan met
diagnostiek aan, en zet het hele resultaat als zipbestand op het bureaublad. Het maakt nooit een
afspraak.

Werkt er nog geen lokale kopie van de repository? Dan kloont het script die naar
`~/topzorg-live-validatie/website`. Staan er lokale wijzigingen open, dan blijft het script daar
vanaf en draait het met de code die er op dat moment staat.

## Bekende beperking bij het bouwen

Deze PoC is gebouwd in een cloudomgeving zonder netwerktoegang tot topzorggroep.nl. De egress proxy
weigert dat domein met een 403 op de CONNECT. De scanner herkent dat en meldt het als een probleem
van het eigen netwerk, niet als een storing bij de vestiging. Zo'n run levert wel de status ROOD op,
maar de conclusie zegt expliciet dat de run niet meetelt als meting.

De werking van de scanner zelf is aangetoond met `npm test`, tegen de lokale nabootsing van de route.

## Draaien als dienst

In productie draait deze meetlaag mee in de webservice van dit project. Elke ochtend om 07:00
Nederlandse tijd wordt er gemeten en het resultaat staat op `/topzorg`. Zie de README in de hoofdmap
voor de instellingen en de toegang.

## Weekprofiel en deuken in de agenda

Elke meting bewaart naast de totalen ook hoe de vrije tijden over de komende weken verdeeld zijn, in
ISO weeknummers. Dat kost geen enkel extra verzoek aan het portaal: die dagen worden toch al
opgehaald, ze werden alleen weggegooid bij het optellen.

Het overzicht toont per locatie een klein weekprofiel, en er is een keuzelijst om de tabel op een
bepaalde week te sorteren, met de minste ruimte bovenaan. Zo is te zien wat er over drie weken staat
te gebeuren.

Een **deuk** is een week die duidelijk leger is dan de weken eromheen bij dezelfde locatie. Dat is
het patroon van een afwezigheid die niet is opgevangen. De vergelijking gebeurt altijd binnen een
locatie, nooit tussen locaties, want dichtbij staat elke agenda voller dan verderop. Voor de
eerstvolgende hele week geldt een strengere grens, om precies die reden.

Twee dingen om te onthouden:

- Het portaal publiceert maar ongeveer vier weken vooruit. Een afwezigheid daarbuiten is niet
  zichtbaar, hoe je het ook bouwt. Weken die buiten de horizon van een locatie vallen krijgen een
  stip en tellen nergens in mee.
- Een lege week kan vakantie zijn, volgeboekt, of een agenda die nog niet open staat. Eén geval is
  wel te onderscheiden: is een latere week wel gevuld, dan verklaart een publicatieachterstand het
  niet, want agenda's gaan op volgorde open.

De drempels staan in `DEUK` in `src/beschikbaarheid.mjs`.

## Wekelijkse mail aan marketing

Elke maandagochtend, na de meting van die dag, kan er een bericht uitgaan met de locaties die de
komende week veel online ruimte hebben. Dat is de kant van het overzicht waar iets extra's kan, in
plaats van iets terugdraaien.

De selectie zit in `src/push.mjs` en is met opzet streng: minstens tien vrije tijden in de komende
week, en binnen drie dagen terecht kunnen. Ruimte over twee weken is geen argument om vandaag meer
bezoekers naar een locatie te sturen.

Instellingen, allemaal als omgevingsvariabele op de service:

| Variabele | Betekenis |
| --- | --- |
| `TOPZORG_PUSH_ACTIEF` | `1` zet automatisch versturen aan. Standaard uit. |
| `TOPZORG_PUSH_ONTVANGERS` | De ontvangers, gescheiden door komma's. |
| `TOPZORG_PUSH_DAG` | 1 is maandag, 7 is zondag. Standaard 1. |
| `TOPZORG_PUSH_UUR` | Vanaf welk Nederlands uur. Standaard 7. |
| `TOPZORG_PUSH_DREMPEL` | Minimum aantal vrije tijden in de komende week. Standaard 10. |
| `TOPZORG_PUSH_MAX_WACHTDAGEN` | Maximale wachttijd op de eerste mogelijkheid. Standaard 3. |
| `TOPZORG_URL` | Het adres van het overzicht, zoals het in de mail komt te staan. |

De ontvangers staan bewust niet in de code. Het zijn persoonsgegevens en die horen niet in git.

Versturen loopt via de bestaande mailkoppeling (`MAIL_TRANSPORT`, `MAIL_API_KEY`, `MAIL_FROM`). Zolang
die niet is ingesteld, gaat er niets uit en zegt de pagina waarom.

Op `/topzorg/push` staat het bericht precies zoals het verstuurd zou worden, met wie het krijgt en
wat er eventueel nog ontbreekt. Daar zit ook een knop om het met de hand te versturen. De
automatische verzending gaat hooguit één keer per dag, ook als de service tussendoor opnieuw opstart,
zolang er een persistente schijf is. Zonder schijf kan een herstart op maandagochtend een tweede
bericht opleveren.
