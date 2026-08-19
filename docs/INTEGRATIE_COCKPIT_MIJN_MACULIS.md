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

## Defect gevonden bij de integratie, inmiddels opgelost

> Opgelost in `aa58388`. Zie "Nalevering: primaire bezorging tegenover secundaire notificatie"
> verderop. De beschrijving hieronder blijft staan omdat ze vastlegt hoe het defect zich voordeed.

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


## Ketenproef Mijn Maculis naar Cockpit, handmatig uitgevoerd

Uitgevoerd op de integratiepreview met de mock-AI, om de communicatie tussen Mijn Maculis en de
Cockpit zuiver te kunnen vaststellen zonder een tweede variabele. De klant stuurde vanuit het
gedeelde patroon "Positionering wordt extern duidelijker dan intern" het bericht "Waar baseren
jullie dit precies op? Intern herkennen we dit niet zo.", met het vinkje "Laat dit meewegen in wat
Maculis van ons weet" UIT.

Bewezen werkend: Mijn Maculis naar Communication Layer naar Vandaag. Twee bevindingen kwamen eruit.

### Bevinding 1: een relatie met twee wachtende draden verloor er een

Opgelost in `90b31ee`.

Op recordniveau gereproduceerd met dezelfde seed en dezelfde twee berichten. De klant had eerder
een los bericht gestuurd en daarna een vraag bij een patroon. Dat zijn terecht twee draden. Beide
wachtten op antwoord.

**Oorzaak A.** `aggregateSignals` vat een relatie samen tot een kaart, wat de bedoeling is, maar
ontdubbelde de nevenredenen op signaaltype alleen. Twee onbeantwoorde klantberichten leveren allebei
`INBOUND_MESSAGE` op, dus de tweede draad viel volledig weg. Het nieuwste klantbericht was in de
Cockpit nergens meer te zien. Welke van de twee overbleef bepaalde `cmpSignals`, dat bij gelijke
prioriteit oudste eerst kiest. Dat is juist voor het rangschikken van relaties onderling, niet voor
het kiezen tussen de draden van een relatie.

**Oorzaak B.** `/api/cockpit/relation/:id` beantwoordde de vraag "welk gesprek open ik hier" twee
keer, met twee verschillende regels. Gemeten in een en dezelfde respons:
`attention.conversationId=507707f4` tegenover `primaryConversationId=0626f463`.

**Reparatie.** Ontdubbelen per type en per gesprek; de nevenreden draagt zijn eigen gespreks-id en
is aanklikbaar; het gespreks-id van de kaart komt van de primaire reden; de dossierroute volgt de
radar. Berichten, draden en gespreksdetail waren al correct en zijn niet aangeraakt. Er worden geen
draden samengevoegd en er ontstaan er geen nieuwe.

**Tests.** `tests/cockpit-mijn-maculis-draad.test.mjs`, zes tests. Tegenproef: met `signals.mjs`
teruggedraaid faalt test 1, met `routes.mjs` teruggedraaid faalt test 2.

### Bevinding 2: de geheugengrens is gecontroleerd en blijkt dicht

Geen reparatie nodig, en dus ook geen reparatie uitgevoerd.

| Meting | Resultaat |
|---|---|
| vinkje UIT, na verzenden | `relationship_memory`: 0 rijen |
| vinkje UIT, daarna "Concept schrijven" | `relationship_memory`: 0 rijen |
| vinkje AAN | 1 rij: `kind=fact, source=customer, confidence=proposed, source_ref.type=mijn_maculis_message` |

`runCopilot` is de enige route die uit zichzelf geheugen voorstelt, en die draait op e-mail en
overige kanalen, niet op een Mijn Maculis-bericht. `openDraft` schrijft geen geheugen. Wat in de
relatiekaart te zien was, is de handtekening van de derde regel: een verzending met het vinkje aan.

Resterende onzekerheid, uitdrukkelijk vastgelegd: de integratiedatabase was vanuit de sessie niet
bevraagbaar, dus dit bewijs komt uit een lokale reproductie met dezelfde seed en dezelfde code. Er
is bewezen dat geen andere route zulke regels kan maken; er is niet bewezen wat de specifieke rijen
in de preview heeft gemaakt.

## Nalevering: herkomst tegenover status in de relatiekaart

Opgelost in `a54ef7e`. Voortgekomen uit bevinding 2 hierboven.

De relatiekaart splitste zijn regels op `confidence` en zette boven elke onbevestigde regel het
etiket "AI-voorstel". Maar `confidence` zegt niets over herkomst. Een klant die uitdrukkelijk iets
deelt levert een regel met `source='customer'` die ook nog bevestigd moet worden. Die stond er dus
bij als een gok van het systeem, en de mens die het las kon niet zien wie iets beweerde.

Twee assen, twee antwoorden, en ze worden nergens uit elkaar afgeleid:

| | vraag | in beeld |
|---|---|---|
| herkomst (`source`) | waar komt dit vandaan | Door de klant gedeeld, Door Maculis afgeleid, Door een collega vastgelegd, Uit de Lens, Herkomst onbekend |
| status (`confidence`) | wat telt het | Nog te bevestigen, Bevestigd |

De opslag verandert niet: `source` en `confidence` blijven wat ze in de database al waren. Een
onbekende herkomst wordt benoemd en niet stilzwijgend toegeschreven.

`public/herkomst.js` draagt de regel en wordt door zowel de operationele Cockpit als het prototype
geimporteerd, zodat de goedgekeurde visuele referentie niet iets anders toont dan het product.

Twee gevolgen die bij deze scheiding horen. Het lichtpunt hoort voortaan alleen bij een waarneming
van Maculis zelf (canon 9, val 1): wat de klant, een collega of de Lens vertelde draagt het niet.
En de herkomstchip is bewust neutraal, zonder kapitalen en zonder semantische kleur, want herkomst
is geen status en canon 2 houdt het koper schaars.

**Tests.** `tests/cockpit-herkomst.test.mjs`, tien tests. Tegenproef: met de herkomst weer uit
`confidence` afgeleid falen er vijf.

## Acceptatiestatus

| Onderdeel | Commit | Status |
|---|---|---|
| Canon 1.0.4 als geldende canon | `4080dc3` (ftrlabs-docs) | vastgesteld |
| Merge van beide ontwikkellijnen, zeven conflicten | `c18446d` | geaccepteerd |
| Blocker A, antwoord op het oorspronkelijke kanaal | `3d9eb19` | geaccepteerd |
| Blocker B, TD-002 structureel gesloten | `3d9eb19` | geaccepteerd |
| Blocker C, privacy-attentiesignaal | `3d9eb19` | geaccepteerd |
| Baseline hersteld, meetmethode vastgelegd | `b162b0b` | geaccepteerd |
| Primaire bezorging tegenover secundaire notificatie | `aa58388` | geaccepteerd |
| Twee wachtende draden, en de knop die naar de andere wees | `90b31ee` | geaccepteerd |
| Herkomst tegenover status in de relatiekaart | `a54ef7e` | geaccepteerd |

Geaccepteerd door Lud op 19 augustus 2026, op de integratiepreview.

**Nog GEEN Production GO.** Wat daarvoor nog open staat:

- de ketenproef met het echte taalmodel, waarvoor `COMM_AI_PROVIDER` en een sleutel gekoppeld
  moeten worden;
- de ketenproef met echte e-mail heen en terug, waarvoor Resend gekoppeld moet worden;
- daarna pas de beslissing over Production GO.

Productie en de twee oorspronkelijke previews zijn gedurende dit hele spoor niet aangeraakt.
`maculis-cockpit-visual-dna-preview` staat op `c96856a`, `mijn-maculis-harmonisatie-preview` op
`6a05d6a`.

## Technische schuld, genoteerd en niet opgelost

| Wat | Waarom niet nu |
|---|---|
| `comm-ai.test.mjs` leest `RESEND_WEBHOOK_SECRET` bij import in plaats van in de testbody | testharnasfout, geen productdefect |
| `prototype.beheer.*` rendert niet-deterministisch door `mac-sharpen` | gereedschap, geen product |
| De pixelharness van Mijn Maculis is niet-deterministisch door `new Date()` in de fixtures | gereedschap, geen product |
| De baseline in de repo is in een andere omgeving gemaakt dan de sessie | meetmethode staat beschreven onder Kanttekening |
