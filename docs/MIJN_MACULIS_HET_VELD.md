# Mijn Maculis · Het Veld — vastgelegde keuzes en productieuitwerking

**Datum** 2026-08-19 · **Branch** `claude/mijn-maculis-visual-dna-94ut9s`
**Status** kandidaat, wacht op Production GO · **Canon** UX-VISUAL-DNA v1.0 inclusief C-10, tokens 1.0.4

Voorgeschiedenis: `docs/MIJN_MACULIS_NULMETING.md` (de meting vóór de harmonisatie),
`docs/MIJN_MACULIS_HARMONISATIE.md` (de dagregime-versie, afgewezen) en
`docs/MIJN_MACULIS_CONCEPTEN.md` (drie richtingen). Dit document legt vast wat is gekozen en hoe
het is gebouwd.

---

## 1. Het besluit

**Het Veld is Mijn Maculis.** Geen dashboard met daarnaast een visualisatie. De kamer is het veld;
navigatie, uitspraak, bewijs, vraag en grens komen eruit voort.

Goedgekeurd en daarmee bindend voor deze kamer:

| # | Keuze |
|---|---|
| 1 | Het veld is de kamer, niet een onderdeel van de interface |
| 2 | Nachtregime als dragend regime |
| 3 | Licht is betekenistaal, geen decoratie |
| 4 | Beweging is semantisch: onzekerheid beweegt, begrip vindt rust |
| 5 | Signalen verbinden alleen wanneer bewijs en betekenis dat rechtvaardigen |
| 6 | Violet ontstaat pas wanneer het bewijs de drempel bereikt |
| 7 | Intensiteit en omvang van het licht blijven eerlijk gekoppeld aan het dragende bewijs |
| 8 | De menselijke laag is essentieel: herkennen, corrigeren, delen en onderzoeken hebben zichtbare gevolgen |
| 9 | Privé en gedeeld blijven betekenisvol en herkenbaar onderscheiden |
| 10 | De blinde vlek en "Wat zie ik niet?" blijven onderdeel van de ervaring |
| 11 | Bewijs is altijd terug te voeren op de onderliggende bronnen |

## 2. De regimekeuze, en waarom hij een canonwijziging vroeg

Mijn Maculis stond op het dagregime. Dat was beslissing 4 uit hoofdstuk 0.1 van de canon, genomen
op een aanname over de kamer: hier wordt lang gelezen, dus een oppervlak dat draagt in plaats van
straalt.

Die versie is volledig gebouwd, doorgemeten en opgeleverd, en vervolgens productmatig afgewezen.
De oorzaak is canoniek aanwijsbaar en geen uitvoeringsfout:

* hoofdstuk 7: *"In het dagregime bestaat `light.core` niet als emissie."*
* hoofdstuk 7 en 9: in het signaalveld ís licht de drager van het bewijs. De straal volgt het
  aantal onafhankelijke signalen, en violet in de kern betekent dat er genoeg bewijs samenkomt.

Een kamer waarin licht de betekenis draagt, kan niet staan in het enige regime waarin licht geen
emissie is. Hoofdstuk 16 punt A hield een heroverweging expliciet open **bij signalen uit de
praktijk, niet op aanname**. Dit is dat signaal.

Vastgelegd in `ftrprf-labs/ftrlabs-docs` als **amendement C-10**, vóór er iets is gebouwd, conform
hoofdstuk 17 punt 2. Bijgewerkt zijn hoofdstuk 5, hoofdstuk 14, open punt A en hoofdstuk 17.1 met
de volledige onderbouwing. **C-10b** in dezelfde beslissing: `surface.private` verhuist naar de
rollen, omdat hoofdstuk 6 hem in de rollentabel zonder lichtregime noemt.

Geen nieuwe kleur, waarde, curve of grammatica. Nacht was al doorgerekend en al in gebruik bij
Website en Lens. Het dagregime blijft vastgesteld maar wordt door geen kamer meer gebruikt.

## 3. Hoe het veld werkt

**Een patroon is een inzicht.** De waarnemingen eronder zijn de lichtpunten.

| Onderdeel | Regel | Waar het vandaan komt |
|---|---|---|
| Plaatsing | verstrooide thuispositie, semantisch doel per waarneming | canon 8.1, veld-engine North Star |
| Beweging | drift = f(1 − voortgang); wat betekenis kreeg, verplaatst zich niet meer | canon 8.1 |
| Verband | uitsluitend binnen hetzelfde patroon, en pas voorbij de herkenningsdrempel | canon 8.1, nooit op afstand alleen |
| Drempel | hangt af van het soort uitspraak: spanning 2, waarneming 4, patroon 5, onbekend nooit | canon 8.1 letterlijk |
| Licht | halo = f(aantal waarnemingen), begrensd; maximaal één `light.core` per scherm | canon 7 |
| Naam | verschijnt pas als het patroon echt is; anders staat er "te weinig bewijs" | canon 9 en signature 5 |
| light.field | staat waar op dit moment het meeste bewijs ligt | canon 7 |
| Compositie | patronen geordend op rol, dan op een gulden-hoekspiraal met een verschuiving uit de organisatie zelf | volgt de inhoud, nooit een template |

**De uitspraak staat in het leegste gebied naast haar eigen kern.** Zes kandidaatposities worden
gescoord op afstand tot de andere patronen, nabijheid tot de eigen kern, en botsing met de
bediening. De compositie is daarmee een gevolg van wat er te zien is.

**De eerste twintig seconden.** Waarnemen, zoeken, verband, verdichten, inzicht, rust. Eén keer,
met een eindtoestand. Daarna beweegt alleen het licht nog. Een klik in het lege veld brengt hem
meteen in de eindtoestand.

## 4. Bewijs is herleidbaar

Dit vroeg de enige backendwijziging in deze ronde, en die was noodzakelijk: zonder klantveilige
bron per waarneming zou "rust op zeven waarnemingen" verzonnen zijn, en canon 7 verbiedt gloed
waarvan je het bewijs niet kunt benoemen.

Migratie **008**, additief op 001 tot 007: `insight_observation.customer_label`.

De grens blijft ongewijzigd en wordt strenger uitgevoerd:

* `provenance` en `signal` blijven intern en worden in de klantquery niet eens geselecteerd;
* `customer_label` is **fail-closed**: geen label betekent niet tonen en niet meetellen, dus er
  lekt niets doordat iemand vergeet af te schermen;
* `evidence_count` komt uit dezelfde fail-closed bron als de lijst, dus het licht kan nooit meer
  beweren dan de lijst kan tonen;
* `sharedContextForOrg`, de interne leesroute, is niet aangeraakt.

Bewezen in `tests/mijn-veld-bewijs.test.mjs` tegen een echte Postgres.

## 5. De menselijke laag, en de ene bewuste beperking

`Herken je dit? Ja · Deels · Nee` verandert zichtbaar wat het veld toont. **Nee** laat het patroon
los: violet dooft, de naam wordt weer "te weinig bewijs", en de waarnemingen gaan opnieuw bewegen.
**Ja** brengt het tot rust en versterkt het licht.

**Beperking, bewust en zichtbaar in de copy.** Dat antwoord geldt voor dit bezoek en wordt niet
opgeslagen. Vastleggen vraagt een productbeslissing die nog niet genomen is: hoe weegt een
menselijk antwoord tegenover nieuw bewijs, en wat gebeurt er met een patroon dat met Nee is
beantwoord en daarna nieuw bewijs krijgt? Zolang dat niet is beslist, belooft de tekst het ook
niet. Dit is het enige onderdeel van het goedgekeurde concept dat nog niet duurzaam is.

## 6. Privé en gedeeld

Een privépatroon draagt een zandmerkteken op zijn kern (`surface.private`, canon 6). Delen
verplaatst dat zichtbaar: het merkteken verdwijnt en de staat wordt violet. In "Alle patronen"
draagt een privépatroon bovendien een warmer oppervlak plus een tekstlabel, zodat kleur nooit de
enige drager is (canon 10). De handeling loopt via de bestaande share- en revoke-routes; er is geen
contract gewijzigd.

## 7. Toegankelijkheid

Het veld is `aria-hidden` en heeft een volwaardige tweeling in **Alle patronen**: dezelfde inhoud,
dezelfde acties, volledig met het toetsenbord bereikbaar. Dat is geen tweederangs lijst maar de
tweede volwaardige weg naar hetzelfde.

Twee echte bugs gevonden en verholpen tijdens de bouw:

1. de verborgen uitspraak bleef tabbaar terwijl een blad open stond;
2. een lege tooltip stond in de opmaak.

## 8. Testresultaten

| Poort | Uitkomst |
|---|---|
| Testsuite met Postgres, serieel | 91 tests, **90 geslaagd, 1 gefaald** (zie afwijkingen) |
| Testsuite zonder Postgres | 90 tests, 74 geslaagd, 0 gefaald, 16 overgeslagen |
| Tokencontrole en checksum | groen, canon 1.0.4, checksum `069d988aeef024ba` |
| Audit desktop 1280 en mobiel 390 | **ALLES GROEN** over vier schermen |
| Contrast | alle tekst haalt AA, gemeten tegen de feitelijk samengestelde ondergrond |
| Focus en keyboard | elke tab-stop draagt een focusring op beide viewports |
| Overflow | nul horizontale overflow op 390, 768, 1280 en 1920 |
| Console | nul fouten |
| Reduced motion | nul lopende animaties, niets onzichtbaar door een niet-gestarte animatie |
| Motion | **ALLES GROEN**: het veld verandert werkelijk, violet komt pas na bewijs, het komt tot rust, en reduced motion staat direct op exact dezelfde eindtoestand |
| Visuele regressie | 32 opnamen in `tools/visual/mijn-baseline`; de dagregime-nulmeting is bewaard als `mijn-nulmeting-dag` |
| Website, Lens, Cockpit | byte-identiek aan de basisbranch |

## 9. Afwijkingen

1. **Eén pre-existing testfout.** `comm-ai.test.mjs`, "copilot: draft for COMMUNICATION" faalt
   omdat er in deze omgeving geen AI-provider is geconfigureerd. Vastgesteld dat hij identiek faalt
   op de basisbranch, die geen enkele Mijn-Maculis-code bevat. Niet van deze workstream.
2. **De herkenningsvraag is sessiegebonden.** Zie hoofdstuk 5. Vraagt een productbeslissing.
3. **Drie screenshotscripts vervallen.** `scripts/mijn-shots.mjs`, `mijn-a2-shots.mjs` en
   `mijn-vis-shots.mjs` richtten zich op het oude oppervlak en zijn verwijderd; `tools/visual/mijn-*`
   vervangt ze en draait deterministisch.
4. **Het dagregime is nu ongebruikt.** Bewust behouden in de canon en in de tokens, want de
   doorgerekende waarden blijven geldig zodra een oppervlak weer van buiten wordt belicht.

## 10. Wat onaangeraakt is gebleven

De klantreis en de informatie die de klant kreeg: inzichten, hun ontwikkeling, de vier vragen, de
samenwerking en de deelgrens zijn allemaal aanwezig. Alle API-contracten. De sharing boundary in
`server/mijn/sharing.mjs`. Website, Lens, Testerbeheer en Cockpit.
