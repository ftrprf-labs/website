# Integratie Cockpit x Mijn Maculis — uitvoeringsbewijs

Branch `claude/maculis-integratie-cockpit-mijn`.
Basis: `c96856a` (Cockpit visuele kandidaat) met daarin gemerged `6a05d6a` (Mijn Maculis-lijn).
Merge `c18446d`, correcties `3d9eb19`.

Canon: tokens 1.0.4, checksum `069d988aeef024ba` (C-10 en C-10b staan op `ftrlabs-docs/main`,
PR #6, `4080dc3`). Het worklight-blok is byte-identiek tussen 1.0.3 en 1.0.4, dus de Cockpit
verandert visueel niets door 1.0.4 te volgen.

## Opgeloste conflicten

| Bestand | Aard | Resolutie |
|---|---|---|
| `server/comm/ai/copilot.mjs` | architectuur | Constitution (Context Layer) en het expliciete handtekeningbeleid samengevoegd in één `SYSTEM`. Ze spreken elkaar niet tegen. |
| `server/comm/ai/service.mjs` | architectuur | `mockDraftFromContext` en de relatiebewuste toezeggingsregel behouden. De vaste EMAIL-afsluiting is verwijderd, want de centrale handtekening zet die identiteit al. |
| `server/index.mjs` | 4 hunks | Beide importsets, beide MIME-sets (dubbele `.woff2` opgeruimd), cockpit-routeblok en boot-hook met de hand samengevoegd. Comm-bootstraps blijven achter `commEnabled()`, de twee Mijn Maculis-bootstraps staan daarbuiten. |
| `tools/check-tokens.mjs` | gate | Naar 1.0.4 gezet, plus de regimecontrole voor zowel worklight als night. |

Migraties uit beide lijnen raken elkaar niet: nul tabeloverlap, en de alfabetische
bestandsnaamvolgorde voldoet toevallig aan de afhankelijkheden. Alle 12 migraties zijn in die
volgorde live toegepast. Hernummeren is niet nodig en gebeurt hier niet.

## De drie Production GO-correcties

**A. Antwoorden op het oorspronkelijke kanaal.** Drie EMAIL-hardcodings uit
`server/cockpit/routes.mjs` verwijderd: concept openen, concept bewerken, concept verzenden nemen
nu het kanaal van het gesprek. Nieuwe expliciete grens `canReplyOnChannel`, met
`COCKPIT_REPLY_CHANNELS = ['EMAIL','MIJN_MACULIS']` plus de eis dat de provider werkelijk een
`send` heeft. Bewijs: `tests/cockpit-mijn-maculis-antwoord.test.mjs`.

**B. TD-002 structureel gesloten.** `server/comm/outbound.mjs` is verwijderd. Die module had een
eigen `sendReply()` die langs `channelAllowed()` en `wrapEmail()` heen ging.
`/api/comm/conversations/:id/reply` loopt nu door `sendOnChannel`, dus consent, handtekening,
threading, audit en delivery-registratie zijn niet meer te omzeilen. Bewijs:
`tests/comm-uitgaande-grens.test.mjs`, zes controles waaronder een gedragscontrole dat WHATSAPP
zonder opt-in geweigerd wordt en geen bericht achterlaat.

**C. Privacysignaal zonder inhoud.** `privacyAttention()` in `server/comm/inbox.mjs` geeft exact
drie velden terug: aantal open verzoeken, tijdstip van het oudste, leeftijd in dagen. Geen naam,
geen onderwerp, geen tekst, geen AI. De Cockpit toont één regel met een ingang naar de bestaande
Privacy-inbox. Bewijs: een sleutelvergelijking in `tests/comm-uitgaande-grens.test.mjs`.

## Gates

- Volledige databasesuite: 245 tests, 245 geslaagd, 0 gefaald, 0 overgeslagen.
- Tokengate: 4/4 op canon 1.0.4. Canon-scan: 0 afwijkende kleuren.
- Visuele audit Cockpit: 90 controles, 0 afwijkingen.
- Visuele regressie Cockpit tegen `c96856a`: geen visuele wijziging. Zie de kanttekening hieronder
  over hoe die meting moet worden gedaan.
- Audit Mijn Maculis: alles groen. De pixelharness van die lijn is niet-deterministisch
  (fixtures gebruiken `new Date()`), dus pixelregressie kan daar geen uitspraak doen.

### Kanttekening bij de pixelmeting van de Cockpit

Twee dingen kwamen pas bij de nacontrole boven en ze zijn allebei relevant voor wie deze meting
herhaalt.

**De baseline in de repo is niet in deze omgeving gemaakt.** De goedgekeurde baseline van
`c96856a` opnieuw renderen in de sessieomgeving levert 104 van de 104 keer een ander bestand op,
met afwijkende hoogtes (bijvoorbeeld 1367 tegen 1424 pixels). Dat is geen wijziging in het
product maar een andere Chromium-build en een ander lettertypebestand. Een render uit deze
omgeving mag dus nooit rechtstreeks tegen de baseline in de repo worden gelegd, en al helemaal
niet als nieuwe baseline worden weggeschreven. De geldige meting is: de goedgekeurde boom hier
renderen, de integratieboom hier renderen, en die twee tegen elkaar leggen. Zo gemeten is de
uitkomst 103 identiek en 1 gewijzigd.

In commit `3d9eb19` was dat aanvankelijk misgegaan: alle 104 baselinebestanden waren met
sessierenders overschreven. Dat is teruggedraaid; de baseline is nu weer byte-identiek aan
`c96856a`.

**Het ene verschil is harnasruis, geen wijziging.** Het betreft `prototype.beheer.mobile`. Twee
renders van dezelfde, ongewijzigde boom leveren daar hetzelfde verschil op, en bij een derde run
komt `prototype.beheer.tablet` er ook bij (ongeveer 1,1 procent en 0,5 procent van de pixels). De
Beheer-ruimte opent met de `mac-sharpen`-beweging en die wordt door de harness niet volledig
bevroren. Het gaat om een tekortkoming in het meetgereedschap, niet in de Cockpit. Genoteerd als
technische schuld, niet opgelost, want harnasonderhoud valt buiten de afgesproken scope.

Conclusie: de integratie en de drie correcties veranderen niets aan de Cockpit-prototypes,
behalve op het Beheer-scherm, waar de harness geen uitspraak kan doen.

## Ketenproef lokaal

Postgres 16, beide preview-seeds op één database, alle 12 migraties toegepast.

1. Klant post op `/api/mijn/conversations`, INBOUND bericht op kanaal `MIJN_MACULIS`.
2. Cockpit `/api/cockpit/today` toont het in NU, kanaal `MIJN_MACULIS`.
3. Concept opent op `MIJN_MACULIS`.
4. Mens bewerkt, akkoord, verzendt: `DELIVERED`.
5. Klantdraad toont beide berichten.
6. Privacysignaal: `{"open":1,"oldestAt":"2026-08-13T08:42:29.054Z","oldestDays":6}`. Het
   privacygesprek staat in geen enkele bucket en in geen enkele gesprekslijst.
7. Nul consolefouten. Schermafdrukken in `tools/visual/integratie-e2e/`.

## Openstaand defect, niet opgelost want buiten scope

De aankondigingsmail "Er staat een antwoord voor je klaar in Mijn Maculis" gaat via
`server/mijn/notify.mjs` door `sendOnChannel` zonder `conversationId`. Daardoor landt hij als
OUTBOUND bericht op een **apart EMAIL-gesprek**. Mislukt die mail, dan blijft daar
`delivery=FAILED` staan. Het aandachtsmodel leest dat als `DELIVERY_PROBLEM` (prioriteit 100) en
zet bovenaan NU: "Je vorige bericht aan Sanne kwam niet aan." Dat klopt niet. Het antwoord zelf is
wel degelijk bezorgd, in Mijn Maculis.

Geen van beide lijnen kon dit alleen zien. De aankondiging komt uit Mijn Maculis, het
aandachtsmodel uit de Cockpit. Lokaal trad het op omdat e-mailtransport niet geconfigureerd was
(`reason: email_transport_not_configured`, consent stond op `allowed: true`). Met echte Resend zal
de mail normaal slagen, dus het is geen zekere blokkade voor de ketenproef, maar het is wel een
echte fout in de integratie. De beslissing hoe dit opgelost wordt ligt bij de opdrachtgever.

## Nalevering: primaire bezorging tegenover secundaire notificatie

Het defect hierboven is opgelost, en wel op het niveau waar het thuishoort.

### Wat er mis was

Een bericht kan twee heel verschillende dingen zijn. Het kan de communicatie zelf zijn, of een
melding dat er ergens anders iets klaarstaat. Die twee hebben tegengestelde gevolgen als ze
mislukken, en ze waren in de message-tabel niet uit elkaar te houden. Allebei OUTBOUND, allebei met
een kanaal, allebei met een delivery-status. Het aandachtsmodel leest de laatste OUTBOUND-aflevering
en concludeert bij FAILED dat ons bericht de klant niet bereikte. Mislukte de melding, dan zei de
Cockpit dat het antwoord niet was aangekomen terwijl het aantoonbaar bezorgd was.

Dat is geen weergavefout maar een betekenisfout: twee verschillende feiten deelden één veld.

### De oplossing

Migratie `010_secundaire_notificatie.sql` voegt één kolom toe: `message.is_notification`, boolean,
niet null, default false. De rol van een bericht in de relatie is een duurzaam feit over dat bericht
zelf, dus het is een kolom en geen filter in een query, geen uitzondering op onderwerp en geen
correctie in het scherm. Wie later een andere lezer schrijft, erft de grens automatisch.

`sendOnChannel` krijgt een parameter `isNotification`, standaard false. Wie niets zegt, verstuurt
echte communicatie. `server/mijn/notify.mjs` zet hem expliciet op true. Een geslaagde melding zet
het gesprek bovendien niet meer op ANSWERED, want een melding beantwoordt niets.

Vier lezers negeren voortaan secundaire berichten bij het bepalen van de bezorgstatus:
`attention.mjs` voor `last_dir`, `last_outbound_at` en `last_outbound_delivery`, en `inbox.mjs` voor
de twee `delivery_problem`-tellingen.

De melding blijft volledig bestaan: in de draad, met haar eigen kanaal, haar eigen delivery-status,
haar delivery_event, haar audit- en haar activity-regel. Er wordt niets verzwegen. Wat vervalt is
uitsluitend de vertaling van haar mislukking naar de uitspraak dat het primaire bericht niet is
aangekomen. Juist doordat die registratie blijft, kan Maculis later zien dat een melding niet
aankwam en desgewenst een ander toegestaan kanaal proberen.

### Kanaalonafhankelijk

De grens loopt langs de rol van het bericht, nergens langs een kanaalnaam. Vandaag ziet dat er zo
uit:

| | kanaal | status |
|---|---|---|
| primair | `MIJN_MACULIS` | `DELIVERED` |
| notificatie | `EMAIL` | `FAILED` |

en een tweede notificatiekanaal is dezelfde twee regels met een andere waarde in `message.channel`:

| | kanaal | status |
|---|---|---|
| primair | `MIJN_MACULIS` | `DELIVERED` |
| notificatie | `WHATSAPP` | `DELIVERED` |

Er staat geen kanaalnaam in de migratie en er hoeft er later ook geen bij. Toestemming volgt
automatisch dezelfde weg, want een notificatie is een gewone uitgaande zending en gaat door dezelfde
consentpoort: geen toestemming, niet verzenden. Welk toegestaan kanaal iemands voorkeur heeft, hoort
bij `communication_preference` en is hier bewust niet gebouwd.

### Regressietests

`tests/comm-primair-versus-notificatie.test.mjs`, tegen de echte tabellen en het echte
aandachtsmodel. Een mislukking komt uit de verzendlaag zelf via een provider die aantoonbaar faalt,
niet uit een met de hand geschreven databaserij.

| # | Situatie | Verwacht |
|---|---|---|
| 1 | Mijn Maculis-antwoord bezorgd, melding bezorgd | geen bezorgprobleem |
| 2 | Mijn Maculis-antwoord bezorgd, melding mislukt | geen bezorgprobleem, melding wel duurzaam vastgelegd |
| 3 | primair e-mailbericht mislukt | wel een bezorgprobleem |
| 4 | drie relaties naast elkaar | precies één bezorgprobleem, en dat is situatie 3 |
| 5 | melding mislukt op een ander kanaal | gedraagt zich identiek aan situatie 2 |
| 6 | de echte meldingsweg draagt de vlag | en primair blijft de standaard |

Situatie 4 gebruikt drie verschillende personen. Dat is wezenlijk: een melding zonder gespreks-id
zoekt de e-maildraad van díe persoon op, dus zo krijgt elke melding een eigen draad, precies zoals
het defect zich voordeed. Deelden ze één persoon, dan zou de test de fout niet meer kunnen zien.

Tegenproef: met de fix slagen alle zes. Met alleen `attention.mjs` teruggedraaid falen 1, 2, 4 en 5,
en blijft 3 groen. Situatie 3 is dus de controle die bewijst dat een echt bezorgprobleem nog steeds
gewoon bovenkomt.
