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

Exitcodes voor automatisering: `0` bij GROEN, `1` bij ORANJE, `2` bij ROOD, `3` bij een onverwachte fout.

## Resultaten

Elke run maakt een map onder `runs/`:

```
runs/2026-08-22_09-30-11_revalidatie-amersfoort-databankweg/
  rapport.txt          het leesbare rapport
  rapport.json         dezelfde uitkomst als data, voor dashboards en meldingen
  run.log              tijdgestempelde log van elke handeling
  screenshots/         schermafbeelding per stap
```

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

## Bekende beperking bij het bouwen

Deze PoC is gebouwd in een omgeving zonder netwerktoegang tot topzorggroep.nl. De egress proxy
weigert dat domein met een 403 op de CONNECT, en de scanner meldt dat netjes als
`ERR_TUNNEL_CONNECTION_FAILED`. De eerste live meting moet daarom gedraaid worden vanaf een werkplek
met gewone internettoegang. De werking van de scanner zelf is aangetoond met `npm test`, tegen de
lokale nabootsing van de route.
