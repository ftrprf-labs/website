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
- Visuele regressie Cockpit tegen `c96856a`: 104/104 byte-identiek.
- Audit Mijn Maculis: alles groen. De pixelharness van die lijn is niet-deterministisch
  (fixtures gebruiken `new Date()`), dus pixelregressie kan daar geen uitspraak doen.

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
