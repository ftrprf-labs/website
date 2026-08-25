# FTRLABS · Invitation Manager (MVP)

Een kleine, zelfstandige beheermodule om testers te importeren, per tester een
persoonlijke Maculis-uitnodigingslink te maken en die handmatig via WhatsApp te
versturen. Gebouwd voor de campagne **`MACULIS_FIRST_FIVE`**.

> Deze module staat **los** van de Maculis-journey zelf. Ze bereidt de
> uitnodigingen voor; Maculis opent later de link.

---

## Snel starten

```bash
npm install          # installeert alleen SheetJS (voor Excel-import)
cp .env.example .env # pas MACULIS_HOST en ADMIN_PASSWORD aan
npm start
```

Open daarna **http://127.0.0.1:4321**.

Geen `.env` nodig om te proberen: zonder configuratie draait de server
loopback-only (alleen bereikbaar op je eigen machine) zonder wachtwoord.

### Eerste testers importeren

1. Klik **⤓ Importeren**.
2. Kies een CSV- of Excel-bestand (voorbeeld: `data/sample-testers.csv`).
3. Kolommen worden automatisch herkend; controleer de **preview**
   (groen = importeren, oranje = dubbel, rood = ongeldig).
4. Klik **Importeren**. Alleen geldige, unieke rijen worden opgeslagen.

---

## Hoe het werkt

| Onderdeel | Waar |
|-----------|------|
| Server (Node, geen framework) | `server/index.mjs` |
| Opslag (JSON-bestand) | `data/invitations.json` |
| Opaque tokens | `server/tokens.mjs` |
| Import (CSV/XLSX, mapping, validatie, dedupe) | `server/import.mjs` |
| WhatsApp/e-mail rendering | `server/messages.mjs` |
| Admin-gate | `server/auth.mjs` |
| Beheer-UI (SPA) | `public/` |

### Persoonlijke link

Per tester wordt één opaque token gegenereerd (32 random bytes → base64url,
~43 tekens). De link is:

```
{MACULIS_HOST}/?p=<opaque-token>
```

Er staat **geen** naam, e-mail of bedrijf in de URL.

### Maculis-koppeling (integratie-naad)

Maculis hoeft niet herbouwd te worden. Deze module biedt één endpoint waarmee
Maculis een token omzet naar de minimale participant-context:

```
GET /api/resolve/<token>
→ { first_name, company_name, domain, campaign, status }
```

Bewust **privacy-by-default**: e-mail, mobiel en achternaam gaan hier *niet* naar
de browser — alleen wat nodig is om te tonen "Welkom Edwin" en
"Ik heb alvast naar {bedrijf} gekeken". Bij de eerste keer openen zet dit
endpoint de status automatisch van `INVITED` → `STARTED`.

### Publiceren naar Maculis (server-to-server sync)

De echte Maculis-app (`ftrprf-labs/maculis-first-five.`) leest een
`participants.json` (token → context) en resolvet die via zijn eigen
`GET /api/participant?p=<token>`. De knop **⇪ Publiceer naar Maculis** stuurt de
geselecteerde testers server-to-server naar Maculis:

```
POST /api/publish { ids:[…] }        (Invitation Manager, admin-gated)
   → PUT {MACULIS_HOST}/api/participants   (header x-sync-key: MACULIS_SYNC_KEY)
```

- Meegestuurd: **alleen** `first_name, last_name, company_name, domain` per token.
  **E-mail en mobiel gaan NIET naar Maculis** (dataminimalisatie — de Invitation
  Manager blijft de bron voor contactgegevens).
- Maculis **merged** (upsert): eerder gepubliceerde testers blijven staan.
- Vereist `MACULIS_HOST` en `MACULIS_SYNC_KEY` in `.env` (beide kanten dezelfde key).
  Aan Maculis-kant moet `MACULIS_DATA_DIR` gezet zijn (de Render-disk).
- Publiceren wijzigt de status niet; het maakt alleen de persoonlijke link
  resolvebaar. Uitnodigen (→ INVITED) blijft de aparte WhatsApp-actie.

---

## Privacy & security

Hier worden persoonsgegevens verwerkt. Wat is meegenomen:

- **Opaque tokens**, geen PII in de URL.
- **Geen PII in logs**: de server logt alleen `METHODE PAD → status`, nooit de
  request-body en nooit de query string (die een token kan bevatten).
- **Duidelijke opslaglocatie**: één bestand, `data/invitations.json`.
- **Veilig verwijderen**: per tester via de UI (🗑), of verwijder het databestand.
- **Git-ignore op data**: `data/*.json` staat in `.gitignore` — echte
  testergegevens worden nooit gecommit.
- **CSP**: de pagina mag geen enkele externe host benaderen, dus PII kan niet via
  een ingeladen resource weglekken.
- **Admin-gate**: optioneel wachtwoord (`ADMIN_PASSWORD`), HMAC-cookie
  (httpOnly, SameSite=Strict), constant-time vergelijking.

### ⚠️ Eerlijke security-status (blocker-melding)

Dit is een **green-field repository** — er was **geen bestaande FTRlabs
auth/admin-context** om op te bouwen. De ingebouwde gate is daarom een
**lokale-admin oplossing**, geen productie-authenticatie (één gedeeld wachtwoord,
geen gebruikers/rollen, sleutel roteert per herstart).

Veilig gebruik nu: **draai lokaal** (standaard bind op `127.0.0.1`). De server
**weigert te starten** op een niet-loopback adres zolang `ADMIN_PASSWORD` leeg
is. Voor echt intern/gedeeld gebruik is een echte auth-laag (SSO / bestaande
FTRlabs login / reverse-proxy met authenticatie) nodig — zie V2.

---

## Statussen

`DRAFT → INVITED → STARTED → COMPLETED` (+ `DECLINED`, `ERROR`).

- `INVITED` wordt gezet wanneer je op **WhatsApp openen & INVITED** klikt.
- `STARTED` kan automatisch gezet worden als Maculis `/api/resolve/<token>`
  aanroept bij het openen van de link.
- `COMPLETED` / `DECLINED` zijn nu handmatig (dropdown per rij).

---

## Testen

```bash
npm test        # 11 unit tests (tokens, validatie, CSV, mapping, WhatsApp)
```

Voorbeeldbestanden in `data/`:
`sample-testers.csv` (5 schone testers, incl. Edwin),
`sample-testers-messy.csv` (dubbel + ongeldig, voor de preview),
`sample-testers.xlsx` (Excel-variant).

---

## Bewust niet gebouwd (scope)

Geen volledige CRM, geen WhatsApp Business API, geen automatische
bulkverzending, geen e-mailinfrastructuur, geen analytics. Zie de sprint-brief
§17.

## Beschikbaarheidsoverzicht TopzorgGroep (`/topzorg`)

Naast Testerbeheer draait in dezelfde service een dagelijkse meting van de online plancapaciteit van
alle TopzorgGroep vestigingen. Elke ochtend om 07:00 Nederlandse tijd wordt via de publieke
afsprakenroute van Mijn Zorgtoegang per vestiging opgehaald hoeveel tijden er vrij zijn en wanneer de
eerstvolgende mogelijkheid is. Het resultaat staat op `/topzorg`.

Alleen lezende verzoeken. Er wordt nooit een afspraak gemaakt en er worden geen persoonsgegevens
opgehaald of opgeslagen. De meetlaag weigert de stappen persoonsgegevens en bevestigen actief.

**Toegang.** Het overzicht heeft een eigen wachtwoord, `TOPZORG_WACHTWOORD`, los van
`ADMIN_PASSWORD`. Zo kan een bredere groep collega's meekijken zonder toegang tot Testerbeheer, dat
wel persoonsgegevens bevat.

**Instellingen.**

| Variabele | Betekenis | Standaard |
| --- | --- | --- |
| `TOPZORG_WACHTWOORD` | wachtwoord voor het overzicht | leeg, dan is het overzicht dicht in productie |
| `TOPZORG_UUR` | meetmoment in Nederlandse tijd | `7` |
| `TOPZORG_BEHANDELING` | welke behandeling gemeten wordt | `Fysiotherapie (intake)` |
| `TOPZORG_GELIJKTIJDIG` | verzoeken tegelijk | `3` |
| `TOPZORG_ACTIEF` | op `0` legt de meting stil | `1` |
| `TOPZORG_ALLEEN` | op `1` bedient de instantie alleen het overzicht | `0` |

**Alleen het overzicht draaien.** Met `TOPZORG_ALLEEN=1` bedient een instantie uitsluitend
`/topzorg`. Testerbeheer bestaat daar dan niet: elk ander adres verwijst door naar het overzicht en
de API is onbereikbaar. Zo kan een aparte service het overzicht met een bredere groep delen zonder
dat er ooit testergegevens op die service staan. In die modus is `ADMIN_PASSWORD` niet nodig, maar
weigert de service in productie te starten zonder `TOPZORG_WACHTWOORD`. Liever dicht dan per ongeluk
open.

**Waarom in het proces en niet als losse cron job.** Een cron job draait op het platform als aparte
service en kan de persistente schijf van de webservice niet benaderen, want een schijf hoort bij een
service. Deze opzet herstelt zichzelf bovendien: gaat de service om 07:00 net opnieuw op, dan ziet de
eerstvolgende controle dat er nog geen meting van vandaag is en haalt die alsnog op. Er wordt elk
kwartier gekeken, en per dag hoogstens een keer gemeten.

De metingen staan als een bestand per dag op de persistente schijf, onder `topzorg/metingen/`. De
historie is dus gewoon in te zien, en oude bestanden worden na ruim een jaar opgeruimd.
