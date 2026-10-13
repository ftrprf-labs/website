# Beschikbaarheidsoverzicht stopzetten en weer aanzetten

Vastgelegd op 13 oktober 2026, bij het besluit de doorlopende kosten te stoppen.

## Wat er draait

Eén betaalde resource, en verder niets.

| Onderdeel | Waarde |
| --- | --- |
| Render webservice | `topzorg-beschikbaarheid` |
| Service id | `srv-da6mtau1egvs7398fo00` |
| Adres | https://topzorg-beschikbaarheid.onrender.com |
| Repository | `ftrprf-labs/website` |
| Branch | `claude/topzorg-appointment-poc-h2f5e7` |
| Plan | starter, één instance, regio Frankfurt |
| Beheerpagina | https://dashboard.render.com/web/srv-da6mtau1egvs7398fo00 |

Er hangt geen database aan, geen key value store, geen schijf en geen cron job. De dagelijkse meting
om 07:00 draait in het proces van de webservice zelf, dus die stopt vanzelf zodra de service stopt.
Er zijn ook geen betaalde externe diensten: de code praat alleen met www.topzorggroep.nl,
tzg.mijnzorgtoegang.nl en Google Fonts, allemaal zonder kosten.

## Stopzetten

In Render, op de beheerpagina hierboven: **Settings**, dan onderaan **Suspend Web Service**.

Pauzeren is hier het juiste gereedschap en niet verwijderen. De omgevingsvariabelen blijven bewaard,
waaronder het wachtwoord waarmee collega's het overzicht openen, en aanzetten is later één klik.
Verwijderen gooit die waarden weg en levert geen cent extra besparing op.

Zet daarna ook **Auto-Deploy** op `No` onder Settings. Een gepauzeerde service hervat niet vanzelf
bij een commit, maar zo is er geen twijfel mogelijk.

## Controleren dat het echt stopt

1. De servicepagina toont **Suspended** in plaats van Live.
2. Onder **Events** staat een regel `service_suspended`.
3. Onder **Metrics** zakt `instance_count` naar nul. Zolang daar een 1 staat, draait er een instance
   en loopt de klok door.
4. Op https://dashboard.render.com/billing loopt het bedrag voor deze service niet verder op.

Punt 4 is de enige echte bevestiging. De eerste drie laten zien dat de service stilstaat, de
factuurpagina laat zien dat Render dat ook zo rekent.

## Wat er niet bewaard blijft

Er is bewust nooit een persistente schijf toegevoegd. De metingen stonden dus in het geheugen van de
container en waren bij elke herstart al weg. Er is daarom geen meetgeschiedenis om veilig te stellen.
Er gaat met het pauzeren niets verloren dat er nog was.

De broncode staat volledig in de repository en is gepusht. Pauzeren of zelfs verwijderen van de
service raakt die code niet.

## Weer aanzetten

Na pauzeren: op de beheerpagina **Resume Web Service**, en Auto-Deploy weer op `Yes` als je wilt dat
een commit op de branch opnieuw uitrolt. De eerste meting volgt dan vanzelf op de eerstvolgende
controle na 07:00 Nederlandse tijd, want de planner ziet dat er voor vandaag nog geen meting ligt.

Is de service wel verwijderd, dan staat in `data/render-service-snapshot.json` precies welke
instellingen nodig zijn om hem opnieuw te maken. De waarden van de omgevingsvariabelen staan daar
niet in, want die horen niet in git. `TOPZORG_WACHTWOORD` kies je dan opnieuw.
