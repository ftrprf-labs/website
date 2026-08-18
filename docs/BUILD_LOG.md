# Build log — Maculis Testerbeheer

Compacte, chronologische bouwlog van de Testerbeheer-portal (`ftrprf-labs/website`).
Geen persoonlijke of gevoelige data. Uitsluitend architectuur- en testbeslissingen.

---

## Deploykoppeling: `claude/invitation-manager-mvp-d5r5h8` is ook de productiebranch

**Deze branch is tegelijk merge-target en productie-deploybranch. Gebruik hem niet als gewone
integratiebranch zolang die koppeling bestaat.**

De Render-service `ftrlabs-testerbeheer` (productie, met persistente schijf) staat op autoDeploy
met trigger `commit` en volgt `claude/invitation-manager-mvp-d5r5h8`. Elke push naar die branch,
en dus ook elke merge erin, gaat rechtstreeks en zonder tussenstap naar productie.

Vastgesteld op 2026-08-18, toen de merge van PR #2 een niet-bedoelde productiedeploy veroorzaakte
naar commit `23ddbba`. Productie bleef gezond en is bewust niet teruggerold, maar de deploy was
niet geautoriseerd op dat moment. Eerder diezelfde dag liep de handtekening-workstream tegen
hetzelfde aan: commit `ec02a45` vermeldt "Niet gedeployed", terwijl de push hem wel live zette.

**Praktische regel zolang de koppeling bestaat:**

1. Behandel elke merge naar `claude/invitation-manager-mvp-d5r5h8` als een productierelease en
   vraag daar expliciet toestemming voor. Ga er niet vanuit dat mergen en deployen los staan.
2. Controleer vóór een merge welke Render-service aan de doelbranch hangt. `list_services` toont
   per service het veld `branch` en `autoDeploy`.
3. Werk niet-vrijgegeven werk af op een eigen branch en houd die uit de doelbranch tot de release
   bedoeld is.

Zodra autoDeploy op `ftrlabs-testerbeheer` uit staat, of de service een eigen releasebranch krijgt,
vervalt deze waarschuwing. Werk hem dan hier bij in plaats van hem stilzwijgend te laten staan.

---

## 2026-08-18 — Website F1 en F4: visueel akkoord op de canonieke grond

**F4 visueel goedgekeurd.** Lud heeft de statische harmonisatie van de Website beoordeeld en
akkoord bevonden: het koele night-canvas en de warmere verhoogde en interactieve vlakken blijven
zoals ze nu staan. De overige Website-routes krijgen dezelfde canonieke grond; er komen **geen
route-specifieke scopes**, want als die oppervlakken dezelfde Website en hetzelfde nachtregime
delen, hoort de grond gezamenlijk te zijn.

**Goedgekeurde commit:** `0e8fab7712ec71d831c52940e52caf9ef1751745` op
`claude/website-harmonisatie-nulmeting` in `ftrprf-labs/groeiplatform-website`. Beoordeeld op de
previewservice `srv-da27a1r7uimc73dvhntg`.

**Wat F4 inhoudt:** `--background` van `#0b0705` warm naar `#0a0b10` koel (`surface.ground`,
`ink.980`), `--card` naar `surface.raised` `#14120f` en `--card-2` naar `surface.elevated`
`#251a10`. `--foreground` en `--muted` waren al `text.primary` en `text.secondary`. Eén bestand,
zes waarden, geen enkele layoutwijziging: alle 36 renders wijzigen met maximaal 11 per kanaal en
alle afmetingen blijven identiek.

**F1 daaraan voorafgaand** (`bfb3468`) is nul-delta gebleken: 35 van 36 renders byte-identiek en
één met de bekende ruis van 1 van 255. Daarbij is een namespace-botsing opgelost die anders de
kleuren had gebroken: de canon bezit `--ink-50` tot `--ink-980` als hex, de Website had dezelfde
negen namen als HSL-drietallen. De eigen schaal heet nu `--w-ink-*`.

**Nog niet aan de orde:** F5 typografie, en de signature- en magic-laag (M-2, M-3, M-4).

---

## 2026-08-18 — Website M-1: motion-hygiene afgerond

**GO gegeven en afgerond.** De opschoning en de canonieke timing zijn akkoord. De hero-onthulling
op 1400ms geldt vanaf nu als onderdeel van de motioncanon en niet als een openstaand punt.

**Commit:** `d9698a3ab0d378f130359db5d336641fe65771e6`.

**Wat er is gebeurd.** Vier oneindige lussen verwijderd (`float`, `float-slow`, `marquee`,
`pulse-ring`) met hun keyframes, conform canon 8.1 en 8.3. Alle vier zaten in code die nooit
rendert, en `pulse-ring` droeg de enige niet-canonieke curve in het project. Er is nu nog één curve
en dat is de canonieke. De duren van `animate-lens-in` en `hero-focus` komen uit de canonieke
tokens in plaats van hardgecodeerd, dus 1400ms `motion.reveal` en 120ms `motion.micro`.

**Bewijs.** Audit 26 controles en 0 afwijkingen, reduced motion blijft harde gate, en 36 van de 36
renders byte-identiek aan de goedgekeurde F4-staat.

**Blijft open als eigen F2-punt:** elf sectiecomponenten die nergens worden gerenderd.

---

## F5 Website: zes gescheiden beslispunten (afgehandeld)

Vastgelegd zodat ze niet in elkaar schuiven. De A/B stond op `/f5-ab` van de Website-preview,
commit `eae9d72`. **Alle zes zijn inmiddels beslist**; de uitkomst zit in de bevroren commit
`39db6f7`. De tabel blijft staan als verslag van hoe de beslissing tot stand kwam, met de
uitkomst in de statuskolom.

| # | Beslispunt | Aard | Status |
|---|---|---|---|
| **1** | **Hoofdtypografie.** Fraunces plus Inter tegenover Newsreader plus systeemstack | **Visuele merkbeslissing van Lud.** Niet af te leiden uit de canon: de canon wijst Newsreader aan, maar of dat op deze pagina's het juiste merkgevoel geeft is een oordeel | **Beslist: Newsreader voor Uitspraak, Inter voor functie en body.** Canon 4.1 is hierop verduidelijkt met amendement C-8 |
| **2** | **Privacy: veertien functionele juridische sectiekoppen.** "1. Wie is verantwoordelijk" tot "14. Wijzigingen" staan in serif | **Afzonderlijke canoncorrectie.** Canon 4.2: staat er serif, dan staat er een waarneming, gedachte of vraag. Een genummerde juridische sectiekop is structuur. Dit geldt onafhankelijk van welke serif er staat en is **geen argument voor of tegen Newsreader** | **Beslist: naar sans.** Een genummerde juridische sectiekop is structuur, geen uitspraak. Uitgevoerd in F5b |
| **3** | **Wordmark MACULIS.** `site-nav` en `site-footer` | **Merkasset.** Valt buiten de algemene fontmigratie. Verhuist niet mee met `font-display` | **Bevestigd: buiten de fontmigratie.** Fraunces blijft, en uitsluitend op de wordmark |
| **4** | **Kleine cursieve serif.** "Ik heb gekeken.", de stapvragen, de twee kaders van blok 6 | Gewicht en leesbaarheid op kleine maten. Canon 4.2 schrijft gewicht 300 voor bij Uitspraak; of dat ook voor de cursieve modifier klein houdbaar is, is de vraag | **Beslist: gewicht 400 waar de modifier klein staat.** Gemeten grond: de cursief is 13,9 procent smaller dan de rechte snit. Canon 4.2 is hierop verduidelijkt met amendement C-9 |
| **5** | **Twee grensgevallen.** De h1 van de privacyverklaring, en het organisatielabel in de lenscirkel (`lenses.tsx:96`, 13px) | Classificatie tussen uitspraak en functie | **Beslist.** De h1 van de privacyverklaring is functioneel en gaat naar sans; het organisatielabel in de lenscirkel blijft bij de uitspraak |
| **6** | **Afwijkende `clamp()` in `founder.tsx`.** Twee eigen waarden, `clamp(1.35rem,2.6vw,1.9rem)` en `clamp(1.6rem,3.4vw,2.5rem)`, die niet in de canonieke schaal van hoofdstuk 4.3 staan | Schaal, niet familie | **Blijft open.** Niet meegenomen in de harmonisatie en niet in de polishpass; `founder.tsx` is op verzoek vrijwel met rust gelaten |

**Wat de classificatie opleverde.** Van de 74 serif-plekken zijn er 43 levend; 31 zitten in
componenten die nergens worden gerenderd. Van die 43: veertien Uitspraak, elf Stem van Maculis in
cursief, twee merkasset, veertien functioneel (punt 2) en twee grensgeval (punt 5).

---

## Hostinginventarisatie bij de afronding van de Website (voorlopig, niets verwijderen)

Opgesteld op 2026-08-18 uit `list_services` van de Render-workspace Maculis
(`tea-d9tholugekts738lr3gg`). **Voorlopig**, want de afspraak was deze inventarisatie pas te
definitiveren na geslaagde productieverificatie, en die is geblokkeerd op de Vercel-koppeling.
**Er is niets verwijderd en er wordt niets verwijderd zonder apart GO.**

| Servicenaam | Repo | Branch | Functie | Soort | autoDeploy | Plan | Veilig te verwijderen |
|---|---|---|---|---|---|---|---|
| `ftrlabs-testerbeheer` | `ftrprf-labs/website` | `claude/invitation-manager-mvp-d5r5h8` | Testerbeheer, Cockpit en Communication Layer | **productie** | nee, handmatig uitgezet | starter, betaald, met schijf van 1 GB | **nee.** Productie, en de persistente schijf draagt echte data |
| `maculis-first-five.` | `ftrprf-labs/maculis-first-five.` | `main` | First Five, de Lens | **productie** | ja, op commit | starter, betaald, met schijf van 1 GB | **nee.** Productie |
| `maculis-cockpit-preview` | `ftrprf-labs/website` | `claude/maculis-future-cockpit-z9naou` | preview Future Cockpit | preview | ja, op commit | starter, betaald | **nee, nog niet.** Lud heeft deze service expliciet buiten elke ingreep geplaatst |
| `maculis-cockpit-harmonisatie-preview` | `ftrprf-labs/website` | `claude/maculis-visual-harmonization-s0nt5t` | preview Cockpit-harmonisatie | preview | ja, op commit | starter, betaald | **kandidaat.** De Cockpit-harmonisatie is gemerged en CLOSED, dus de beoordelingsfunctie is vervuld. Wel de laatste visuele referentie van die workstream |
| `claude/website-harmonisatie-nulmeting` (`srv-da27a1r7uimc73dvhntg`) | `ftrprf-labs/groeiplatform-website` | `claude/website-harmonisatie-nulmeting` | preview Website-harmonisatie | preview | nee | starter, betaald | **nee, nog niet.** Dit is op dit moment de enige draaiende weergave van de goedgekeurde commit `39db6f7` en dient als rollbackreferentie tot productie geverifieerd is |
| `mijn-maculis-preview` | `ftrprf-labs/website` | `claude/mijn-maculis-customer-v1-d29lib` | preview Mijn Maculis | preview | ja, op commit | starter, betaald | **nee, nog niet.** Mijn Maculis staat nog op de harmonisatieplanning |
| `maculis-orchestrator` | `ftrprf-labs/website` | `claude/maculis-dev-orchestrator-paox3h` | ontwikkeltooling | tooling | ja, op commit | gratis | **kandidaat**, maar kost niets. Oordeel van Lud nodig over of de tooling nog gebruikt wordt |

Wat deze tabel **niet** dekt: het Vercel-project dat `www.maculis.nl` bedient. Dat valt buiten de
Render-workspace en is vanuit deze sessie niet leesbaar. Zie de sectie over de productiekoppeling.

Drie services staan op autoDeploy met trigger `commit`. Bij elke push naar die branches deployt
Render zonder tussenstap. Dat geldt niet voor productie: `ftrlabs-testerbeheer` staat sinds
2026-08-18 handmatig op autoDeploy uit.

---

## Opschoning bij de afronding van de harmonisatie (openstaande actie)

Vast te leggen zodat het niet bij de laatste GO vergeten wordt.

1. **Tijdelijke previews verwijderen zodra ze niet meer nodig zijn.** Vandaag draaien
   `maculis-cockpit-harmonisatie-preview` (starter, Frankfurt) en de Website-preview
   `srv-da27a1r7uimc73dvhntg` (starter, Frankfurt). Beide zijn per definitie tijdelijk.
2. **Per betaalde service vaststellen of hij nog een productiefunctie heeft.** Op het moment van
   vastleggen draaien er zeven services in de workspace Maculis, waarvan zes op het starterplan en
   één gratis. Twee daarvan zijn productie: `ftrlabs-testerbeheer` en `maculis-first-five.`. De
   overige vijf zijn preview of tooling en verdienen elk een expliciet oordeel: nog nodig, of weg.
3. **Bij het opruimen dezelfde regel als altijd:** eerst controleren welke branch aan welke service
   hangt en met welke autoDeploy-stand, en pas daarna iets verwijderen.

---

## Technische schuld (open)

| # | Onderwerp | Waar | Beschrijving | Ingebracht |
| --- | --- | --- | --- | --- |
| TD-001 | Tekstkleur van de e-mailbody in donkere modus | `server/comm/signature.mjs`, `wrapEmail()` | Wanneer de composer platte tekst stuurt, bouwt `wrapEmail()` de HTML-body op met een vaste `color:#2b2b2b`. In een donkere leesomgeving kan dat donker op donker uitpakken. Dit zit in het **bericht**, niet in de handtekening, en is bestaand gedrag van vóór de handtekening-integratie. Bewust niet opgelost bij de deploy van 2026-08-18: het raakt de leesbaarheid van elke verzonden e-mail en verdient een eigen ronde. | 2026-08-18, gezien bij de renderproeven van de handtekening |
| TD-002 | `/reply` verstuurt buiten de centrale handtekening en buiten de consent-gate om | `server/comm/outbound.mjs` (`sendReply`), route `POST /api/comm/conversations/:id/reply` | Deze AI-vrije fallbackroute verstuurt rechtstreeks via `sendThreadedEmail` en roept dus **niet** `wrapEmail()` aan: uitgaande mail langs deze weg draagt geen enkele handtekening, oud noch nieuw. Dezelfde route passeert ook de `channelAllowed()` consent-gate niet die `sendOnChannel` wel toepast. Geen UI-code roept hem aan; alleen een directe API-aanroep bereikt hem. Bewust ongemoeid gelaten: dit vraagt een eigen architectuur- en securityreview, geen contentcorrectie. | 2026-08-18, bij de audit van de handtekeningroutes |
| F3-UITGESTELD | Percentagebalken in Evaluaties, Cockpit | `public/app.js` (`kpi-bar`, `funnel-bar`, verdelingsbalken per vraag), `public/styles.css` | Planregel F3 "percentagebalken uit Evaluaties" is niet uitgevoerd in de Cockpit-workstream. Terecht buiten scope gehouden: het is informatieontwerp, geen tokenwissel, en de opdracht was uitsluitend bewezen canonieke ingrepen toe te passen. De Cockpit is inmiddels CLOSED en bevroren, dus dit punt wordt niet meegenomen zonder een eigen besluit. | 2026-08-18, bij het hernemen van het harmonisatieplan na de Cockpit |
| TD-003 | Canonieke hairline versus de Tailwind alfa-consumenten, Website | `groeiplatform-website`: `src/app/globals.css` (`--border`, `--border-strong`), `tailwind.config.ts`, en vijftien consumenten | Canon 6 legt `border.hairline` vast als koper op 18 procent en `border.defined` op 34 procent. De Website slaat beide op als HSL-drietal en consumeert ze als `hsl(var(--border))`, waar geen alfa in past. De omzetting naar een kale `var()` is bij de F4-pilot geprobeerd en meteen teruggedraaid: hij breekt vijftien consumenten, acht die zelf een alfa opleggen (`border-border/60`, `divide-border/70`) en zeven die `hsl(var(--border))` rechtstreeks gebruiken. Tailwind kan op een kale `var()` geen alfamodifier toepassen. De kern van het beslispunt is niet technisch maar semantisch: de canonieke hairline op 18 procent en een consument die er `/60` overheen zet kunnen niet allebei gelden. Een voorstel moet de canonieke waarde respecteren zonder de bestaande consumenten stilzwijgend van betekenis te veranderen. | 2026-08-18, bij de F4-grondpilot van de Website |

---

## 2026-08-18 — Website naar productie: `main` staat op `39db6f7`, publieke verificatie geblokkeerd

Lud heeft de productiekoppeling zelf in Vercel geverifieerd en GO gegeven. Vastgelegd zoals
opgegeven: Vercel-project `groeiplatform-website`, gekoppeld aan
`ftrprf-labs/groeiplatform-website`, Production Branch `main`, elke commit naar `main` maakt een
Production Deployment, `Auto-assign Custom Production Domains` staat Enabled, en `www.maculis.nl`
hangt aan Production.

**Preflight op exact de kandidaat die naar `main` ging.**

`main` stond op `3e8c00e` en was een directe voorouder van `39db6f7`, dus de overgang is een
**fast-forward zonder mergecommit**. Wat op `main` staat is daarmee byte-identiek aan de
goedgekeurde en geteste boom. Geen enkele nieuwe wijziging toegevoegd.

Tien commits gingen mee. De diff raakt 27 bestanden buiten de baselineafbeeldingen en de
gevendorde letter. Wat er **niet** in zit en dat wel had gekund: `package.json`,
`package-lock.json`, `next.config.mjs`, `tsconfig.json` en `postcss.config.mjs` zijn geen van alle
gewijzigd, dus er komt geen nieuwe dependency en geen configuratiewijziging mee. De A/B-route
`/f5-ab` uit commit `eae9d72` was in een latere commit al opgeruimd en gaat dus niet live.

Nieuw in deze preflight, want dit codepad was nooit eerder uitgevoerd: een build met
`VERCEL_ENV=production`, de stand die Vercel zelf zet. Uitkomst:

| Controle onder `VERCEL_ENV=production` | Uitkomst |
|---|---|
| `robots.txt` | `Allow: /`, de vijf legacy demo-routes op `Disallow`, `Host` en `Sitemap` op `https://www.maculis.nl` |
| `sitemap.xml` | twee URL's, `/` en `/privacy`, beide op `https://www.maculis.nl` |
| Robots-metatag op `/` en `/privacy` | `index, follow` |
| Canonicals | `https://www.maculis.nl` en `https://www.maculis.nl/privacy` |
| Kernroutes | `/`, `/privacy`, `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image` alle 200 |

Bij de eerste meting leek de homepage `noindex, nofollow` te dragen. Dat was een meetfout: een
oude `next-server` uit de capture-runs hield poort 4610 nog vast en bediende een mengsel van twee
builds. Op een schone server klopt alles. De code is niet aangeraakt.

**Push.** `39db6f7` is als fast-forward naar `main` geduwd (`3e8c00e..39db6f7`). Op GitHub staat
`main` bevestigd op `39db6f720ca0fadf67bea7532b2e4f1f71c5056f`. Niets gewijzigd aan DNS, Domains,
Environment Variables, Vercel-projectinstellingen of hostingconfiguratie.

**Wat NIET geverifieerd kon worden, en waarom.**

De egresspolicy van deze sessie weigert beide productiehosts. De proxy registreerde het letterlijk:

```
connect_rejected  www.maculis.nl:443  gateway answered 403 to CONNECT (policy denial)
connect_rejected  maculis.nl:443      gateway answered 403 to CONNECT (policy denial)
```

Daardoor is vanuit deze sessie **niet** te controleren: of de Vercel Production Deployment slaagde,
welke commit productie feitelijk serveert, en het gedrag van de publieke site (homepage,
kernroutes, letters, motion en constellatie, reduced motion, responsive, formulieren en CTA's,
console, en de canonical-, robots- en sitemap-uitvoer op het echte domein). Er is ook geen
Vercel-connector aan deze sessie gekoppeld, dus de deploymentstatus is evenmin langs die weg te
lezen. De handleiding van de proxy is expliciet dat een policyweigering niet omzeild of herhaald
mag worden, en dat is dan ook niet gedaan.

**Rollbackpunt.** Twee, en beide staan.

1. De vorige productiecommit is `3e8c00e89ca2663410f3f216d95a81a16b119807`. Terugzetten is een
   push van die commit naar `main`, waarna Vercel opnieuw deployt. In Vercel zelf kan de vorige
   Production Deployment ook direct gepromoveerd worden.
2. De Render-preview `srv-da27a1r7uimc73dvhntg` draait live op `39db6f7` en blijft staan als
   vergelijkingsreferentie. Niet verwijderen tot productie definitief geverifieerd is.

**Status: niet CLOSED.** De overgang is uitgevoerd, de publieke verificatie niet. De
harmonisatie sluit pas als iemand met toegang tot `www.maculis.nl` de verificatielijst afloopt.

---

## 2026-08-18 — Website harmonisatie Visual DNA v1.0: visueel akkoord en freeze

**Lud heeft finale GO gegeven op de Website.** Commit
`39db6f720ca0fadf67bea7532b2e4f1f71c5056f` op `claude/website-harmonisatie-nulmeting` in
`ftrprf-labs/groeiplatform-website` is vanaf nu de goedgekeurde Website-basis. De onderstaande
elf punten zijn daarmee vastgesteld en **geen open ontwerppunten meer**. Wie ze wil wijzigen,
opent een nieuwe workstream met een eigen akkoord.

| # | Vastgelegd | Waarde |
|---|---|---|
| 1 | Uitspraak | Newsreader |
| 2 | Functie en body | Inter |
| 3 | Wordmark | Fraunces, en uitsluitend daar |
| 4 | Modifier | Newsreader cursief, gewicht 400 |
| 5 | Grond | `surface.ground` / `ink.980`, `#0a0b10` |
| 6 | Verhoogde en interactieve vlakken | `surface.raised` `#14120f`, `surface.elevated` `#251a10` |
| 7 | Verticaal ritme | zoals in `39db6f7`, per sectie afgestemd, niet mechanisch gelijk |
| 8 | Lensvisual | de huidige verhouding en schaal |
| 9 | Signaaltaal | de vier trappen uit canon 9, zoals in de SignalRail |
| 10 | Constellatie | de bewegende constellatie zoals gebouwd, canon 8.1 en 8.4 |
| 11 | Motion | speelt eenmalig af naar een betekenisvolle rusttoestand; onder `prefers-reduced-motion` staat die eindtoestand er onmiddellijk |

**Volledige suite opnieuw gedraaid op exact `39db6f7`, schone werkboom, verse build.**

| Controle | Uitkomst |
|---|---|
| Tokens en checksum | 3 van 3. Versie `1.0.3`, checksum `a8a21414415b8e06`, niet met de hand bewerkt |
| Build | `next build` compileert, 13 statische pagina's, geen waarschuwing |
| Canon- en toegankelijkheidsaudit | 26 controles, 0 afwijkingen, over mobiel en desktop |
| Regimepoort en grond | precies een `data-maculis-regime` (`night`), grond `rgb(10, 11, 16)` gelijk aan canon |
| Horizontale overflow | 0px op alle gemeten breedtes |
| Toetsenbord en focus | elke werkelijke Tab-stop heeft een focusring |
| Console | nul errors |
| Reduced motion | nul lopende animaties, nul oneindige lussen, niets blijft op `opacity: 0` |
| Determinisme | twee volledige capture-runs, **36 van 36 byte-identiek** |
| Constellatie zonder JavaScript | de bezonken eindtoestand is identiek aan de afgespeelde referentie, in alle vier de condities, nul lopende animaties |

Voor die laatste controle is de eindtoestand gemeten met JavaScript uit, met JavaScript uit plus
reduced motion, met JavaScript aan plus reduced motion, en als referentie met JavaScript aan en
normale motion nadat de animatie daadwerkelijk was afgespeeld. Alle vier leveren dezelfde waarden:
vijf verbindingen volledig getekend, zes punten op eindpositie, kern ontstoken. De klasse
`mac-play` voegt uitsluitend de weg naar die toestand toe, nooit de toestand zelf. Dat is canon 8.5.

**Wat de vergelijking met de nulmeting laat zien.** Alle 36 renders wijken af van de baseline van
vóór de harmonisatie. Dat is de bedoelde wijziging, geen regressie: F1 en F4 raken de globale
tokens in `.dark` en gelden daarom ook op de vijf niet-ontsloten routes. Een controlegroep met nul
verschil is bij een globale grondwijziging niet haalbaar; het determinismecijfer is daarom de
werkelijke regressiepoort, en die staat op 36 van 36.

**Niet gewijzigd om testverschillen weg te poetsen.** Twee keer wees mijn eigen poort een verschil
aan dat geen defect was: de bezonken dekking van de constellatie (0.9 en 0.8 op de svg, 0.92 op de
kern) is ontwerp, en `matrix(1, 0, 0, 1, 0, 0)` is dezelfde transform als `none`. Beide keren is
de meting aangepast, niet de productcode.

---

## 2026-08-18 — Productiekoppeling Website: Vercel, niet Render (opgelost, zie de sectie hierboven)

De Website staat **niet** op Render. Dat is met DNS aangetoond en niet aangenomen.

| Vraag | Bevinding |
|---|---|
| Wat bedient publiek productie | Vercel |
| `www.maculis.nl` | A-records in `76.76.21.0/24` en `66.33.60.0/24`, Vercel-adresruimte, roterend per resolve |
| `maculis.nl` | `76.76.21.21`, het vaste Vercel-apexadres |
| Render-ingress ter vergelijking | `216.24.57.15`, met PTR `ip-216-24-57-15.ingress.render.com`. Geen van de maculis-adressen valt daarin |
| Render-services met een maculis-domein | geen. Zeven services in de workspace, alle op `*.onrender.com` |
| Repository | vrijwel zeker `ftrprf-labs/groeiplatform-website`. Enige repo in de organisatie die `maculis.nl` noemt, en de enige met `VERCEL_ENV` in de code |
| Branch in Vercel | **`main`**, naderhand door Lud in Vercel bevestigd |
| Productiecommit op het moment van dit onderzoek | `3e8c00e`, inmiddels vervangen door `39db6f7` |
| autoDeploy | **aan**: elke commit naar `main` maakt een Production Deployment |
| Externe deploykoppeling | ja, Vercel. Geen `vercel.json` en geen `.vercel` in enige repo van de organisatie, dus de koppeling zit volledig in het Vercel-project |

Twee harde blokkades in deze sessie: de egressproxy blokkeert `maculis.nl` en `onrender.com`, dus
de live site is niet op te vragen, en er is geen Vercel-connector aangesloten. De registry toont
Vercel wel, met `installState: "not_installed"`.

**Conform de afspraak is er daarom niet gedeployed en niets aan DNS, custom domains of
hostingkoppelingen gewijzigd.** De goedgekeurde commit staat klaar op zijn eigen branch. `main`
van `groeiplatform-website` is onaangeroerd op `3e8c00e`.

**Wat nog nodig is, precies een ding:** de **Production Branch van het Vercel-project** dat
`www.maculis.nl` bedient, plus de bevestiging dat dat project aan `ftrprf-labs/groeiplatform-website`
hangt. Te lezen in het Vercel-dashboard onder Project → Settings → Git, of beschikbaar te maken
door de Vercel-connector aan deze sessie te koppelen. Met die branchnaam is de rest mechanisch.

**Wat gunstig is voor de overgang:** de SEO-bedrading vraagt geen enkele codewijziging. `SITE_URL`
valt terug op `https://www.maculis.nl`, `metadataBase`, de canonicals, `sitemap.ts` en `robots.ts`
lezen allemaal die waarde, en `robots.ts` zet alles op `disallow: /` zolang
`VERCEL_ENV !== "production"`. De Render-preview is daarmee aantoonbaar niet indexeerbaar en kan
zonder SEO-risico als rollbackreferentie blijven staan.

---

## 2026-08-18 — Cockpit-harmonisatie Visual DNA v1.0: visueel akkoord en freeze

**Visueel akkoord vastgelegd.** Lud heeft de live preview beoordeeld op Testerbeheer, Workspace
en Inbox en de harmonisatielaag akkoord bevonden. Vanaf dit punt geldt een **freeze** op de
visuele harmonisatie: geen verdere verfijning, geen extra kleurcorrecties, geen spacing-polish
en geen nieuwe interpretaties binnen deze workstream.

**Beoordeelde commit:** `3e8c740ac159994df631a6b574d7131dc96cc3f1`
(branch `claude/maculis-visual-harmonization-s0nt5t`). Gelijk aan de branch tip, aan de lokale
werkboom en aan de live previewdeploy `dep-da21ov61egvs7395v3b0`. Alle drie deploys van de
previewservice draaiden op deze ene commit, dus er is geen twijfel over wat beoordeeld is.

**Preview:** `maculis-cockpit-harmonisatie-preview` (Render, Frankfurt, Node-runtime, geen disk,
geen productiegegevens, Communication Layer uit). Tijdelijk, uitsluitend voor deze beoordeling.

### Wat de harmonisatie inhoudt

De Cockpit draait nu op de gegenereerde canon in plaats van op handmatig beheerde kleurwaarden.

- **Canonieke tokenlaag** gevendord als `public/vendor/maculis-tokens.css`, versie 1.0.2,
  checksum `b95d91b7a0a82c18`, byte-identiek aan `ftrlabs-docs/main`. Bewaakt door
  `tools/check-tokens.mjs` op checksum, versie en handmatige bewerking.
- **Lichtregime `worklight`** op alle drie de oppervlakken, via `data-maculis-regime` op `<html>`.
  Grond is `ink.950` `#080503`, conform canonamendement C-1.
- **`:root` teruggebracht tot een aliaslaag.** Geen eigen kleurwaarden meer per scherm
  (canon hoofdstuk 13). In `styles.css` verviel `--surface-2` en verdween `--shadow`
  (canon hoofdstuk 6: hairline of schaduw, niet beide).
- **Statuspil als transparant vlak** met een `border.semantic` hairline en de `semantic.*`-kleur
  als tekst, conform canonamendement C-2. Geen gevulde badge meer.
- **Newsreader zelf gehost** uit de North Star, geen externe CDN. Server serveert `.woff2` nu als
  `font/woff2`.
- **Toegankelijkheid:** twee echte WCAG AA-fouten opgelost (`text.quiet` 3,74 naar 5,00 en
  consent-ok 4,41 naar 4,92). Klikbare `div`/`span` vervangen door echte `<button type="button">`,
  waardoor de Inbox van 8 naar 15 Tab-stops ging.
- **Zichtbare copy** ontdaan van streepjes als stijlmiddel, en labelmaps toegevoegd
  (`STATUS_LABEL`, `EVAL_LABEL`, `CONSENT_LABEL`, `CHANNEL_LABEL`, `JOURNEY_LABEL`,
  `DELIVERY_LABEL`) zodat ruwe enumwaarden niet meer in de UI verschijnen.

### Verificatie op het moment van de freeze

Uitsluitend de bestaande controles, zonder nieuwe ontwerpcriteria.

| Controle | Resultaat |
|---|---|
| Token en checksum (`tools/check-tokens.mjs`) | 3/3 pass |
| Testsuite (`npm test`) | 64 tests, 0 fail, 9 overgeslagen (vereisen live Postgres) |
| Toegankelijkheid, overflow, console, reduced-motion (`tools/visual/audit.mjs`) | alles groen over 3 oppervlakken × 2 viewports |
| Focusring op elke Tab-stop | Workspace 7, Inbox 15, Testerbeheer 51 desktop en 49 mobiel |
| Statuspillen AA (`.att`) | Workspace 7/7, Inbox 6/6 |
| Statusbadges AA (`.status-badge`, handmatig, zie schuld 3) | 12/12 states, laagste 4,92:1 |
| Horizontale overflow | 0px op 1280 en op 390, alle oppervlakken |
| Reduced motion | 0 lopende animaties, 0 elementen onzichtbaar door een niet-gestarte animatie |
| Drift sinds de beoordeling | hercapture van 56 renders, 56/56 byte-identiek |
| Delta tegenover de pre-harmonisatie baseline | 56/56 gewijzigd, 99,3 tot 100 procent van de pixels. Verwacht: grond en letter veranderen op elk oppervlak |

### Bewust openstaande afwijkingen en technische schuld

1. **Inbox heeft geen weg terug als de Communication Layer uit staat.** `comm.js:14` vervangt de
   volledige `document.body` door de activatiebanner, waardoor de header en de link naar
   Testerbeheer verdwijnen. Bestaand gedrag, ongewijzigd door de harmonisatie. Niet gerepareerd,
   omdat dat buiten de scope van deze workstream valt.
2. **Workspace heeft geen vast menu-item.** Die wordt contextueel bereikt vanuit een rij in
   Testerbeheer (`app.js:296`) of een gesprek in de Inbox (`comm.js:100`). Bij een lege store
   bestaan die ingangen niet. Bestaand gedrag, ongewijzigd.
3. **`audit.mjs` dekt alleen de `.att`-pil.** De `.status-badge` van Testerbeheer valt buiten de
   geautomatiseerde contrastcheck, waardoor die als "0 statuspillen" groen meldt. Bij de freeze
   handmatig gemeten over alle 12 states, alle boven AA. Schuld: de check uitbreiden naar
   `.status-badge`.
4. **`--priv: #8a3a63` in `comm.html` blijft een lokale waarde.** Bewust niet gecanoniseerd: de
   Privacy-inbox is een context, en `surface.private` bestaat in de canon alleen in dagregime.
5. **De focusring is een implementatiekeuze, geen canon.** 2px `copper-500` met 2px offset,
   afgesproken als zodanig bij de pilotgate.
6. **9 tests blijven overgeslagen** zolang er geen `DATABASE_URL` is. Dat zijn de
   Communication Layer DB-tests, niet de visuele laag.
7. **Canonchecksum 1.0.0 (`04d6b40907f2bbda`) is niet reproduceerbaar.** Die waarde dateert van
   vóór de generatorregel in canon hoofdstuk 17. Vanaf 1.0.2 is de checksum wel reproduceerbaar.
8. **De server bindt standaard op `127.0.0.1`** (`server/config.mjs:40`). Op Render moet `HOST`
   expliciet op `0.0.0.0` staan, anders zakt de deploy door de poortscan. Kostte twee mislukte
   deploys bij het opzetten van de preview. Geen visueel punt, wel een deployvalkuil.

### Merge-readiness

- **Inhoudelijk:** de branch is compleet en groen. Geen ongecommitte wijzigingen, branch tip gelijk
  aan origin.
- **Eén blokkade:** PR #2 staat op `mergeable_state: dirty`. De basis
  (`claude/invitation-manager-mvp-d5r5h8`) liep zes commits vooruit met de
  signature- en motionstudies. De enige echte conflict zit in `.gitignore`, waar beide kanten een
  regel achteraan toevoegden. `server/index.mjs` merget vanzelf. Oplossing is mechanisch: beide
  regels behouden.
- **Tweede punt:** de beschrijving van PR #2 is automatisch gegenereerd en beschrijft een eerdere
  tussenstand. Die noemt Testerbeheer nog `night`, de grond nog `ink.980`, `index.html` nog "Lens",
  en `comm.html` nog een byte-identieke controlegroep. Geen van die vier klopt nog.
- **Niet mergen en niet naar productie deployen** zonder expliciete GO.

### Wat hierna NIET volgt

De volgende ontwerpfase is geen verdere harmonisatie, maar een afzonderlijke
**Maculis signature- en magic-laag**: sterren, zeer subtiele onverwachte beweging, kleine
typografische en woordelijke verschuivingen, momenten waarop de interface bijna levend lijkt.
Die laag komt bovenop deze goedgekeurde canonieke basis, is betekenisgedreven en schaars,
respecteert `prefers-reduced-motion` volledig, introduceert geen nieuwe canonwaarden zonder
aparte canongate, en wordt **niet** in deze harmonisatiebranch gebouwd. De bestaande
signature- en motionstudies (branch `claude/maculis-signature-magic-study-qtjg5z` en de studies
op de basisbranch) en de Visual DNA dienen daar later als onderzoeksbron.

---

## 2026-08-15 — Scope & ownership: Communication Layer grens (productbeslissing)

**Geen code-wijziging. Uitsluitend een vastgelegde scope/ownership-grens** (op verzoek), zodat
toekomstige sessies/agents niet vanuit de Communication-workstream buiten hun mandaat bouwen.

**De Communication Layer is en blijft eigenaar van de communicatie-primitieven en -state:**
inbound/outbound, conversations, drafts, AI-suggesties (human-in-the-loop), delivery + delivery
events, read-watermarks, attention-state, channel-adapters en betrouwbare relationship-linked
communicatie.

**Niet vanuit deze workstream bouwen of wijzigen** (behoren tot de Lens/First Five- of toekomstige
Future Cockpit-workstream): Reveal Engine, Reveal Gate, zakelijke thermometer, technische
website-thermometer, Lens 1, Lens 2, Future Cockpit-architectuur, GrowBrain, en nieuwe Relationship
Intelligence zonder bewezen databron.

**Twee vastgelegde architectuurpunten:**
1. De huidige Communication Layer is bewust zo gebouwd dat een toekomstige **Future Cockpit** hem
   later als **betrouwbare onderlaag** kan consumeren: `attentionOverview` (afgeleide, tenant-scoped
   attention-state), het conversation-level read-watermerk en de channel-agnostische adapters zijn
   stabiele primitieven, los van hun huidige UI-presentatie.
2. De huidige **Attention Cockpit is een operationele baseline, NIET de definitieve toekomstige
   Maculis Home.** De cockpit mag later opgaan in of vervangen worden door de Future Cockpit; de
   onderliggende communicatie-primitieven blijven dan de bron van waarheid.

**Lens 1-pilotbevinding (ter referentie, hoort NIET bij Communication):** bij een website zonder
Reveal komt in de huidige journey te weinig van de andere lagen terug. `SILENCE` bij de Reveal Gate
mag de héle journey niet stilleggen (SILENCE bij Reveal ≠ SILENCE van de journey); de Reveal Gate
wordt niet verlaagd. Dit wordt elders in de Lens/First Five-workstream opgepakt.

**Productie-baseline blijft ongewijzigd — geen rollback.**

---

## 2026-08-15 — Attention Cockpit + Living Signature + outbound delivery fix (productie)

**1) Outbound delivery-incident opgelost (200 ≠ afgeleverd).** Root cause: de live-gate
van de e-mailprovider hing aan `MAIL_FROM`; die was leeg → de provider viel terug op de
**mock** → een interne 200 zonder echte Resend-call. Fix: live-gate losgekoppeld van
`MAIL_FROM` (`mailTransport==='resend' && MAIL_API_KEY`), in productie **nooit** stil
mocken (mock → expliciete fout), plus PII-veilige send-diagnostiek die de échte
providermodus logt. Delivery-status webhooks (sent/delivered/bounced/failed/complained)
werken de `message.delivery` bij zonder positieve statussen te laten terugvallen.

**2) Living Maculis e-mailhandtekening.** Deterministisch, centraal bij verzenden
toegevoegd (nooit door de AI, nooit in de opgeslagen body), exact één keer, idempotent,
e-mailclient-veilig (knipoog als animated GIF met statische PNG-fallback, geen tracking
pixel), dark-mode/mobiel/toegankelijk. AI-context sluit de eigen handtekening + geciteerde
historie uit (`stripForContext`). **Definitieve copy:** `Ludwig van der Kuijl` /
`Maculis · Kijk nog eens.` / `hello@maculis.nl · maculis.nl` (naam + payoff config-baar,
nooit verzonnen; plain-text valt logisch terug op dezelfde regels).

**3) Attention Cockpit — dagelijkse cockpit boven Testerbeheer.** Eén kanaal-agnostische
"wat vraagt vandaag mijn aandacht?".
- **Read = menselijk signaal:** conversation-level `last_read_at`-watermerk, alleen gezet
  wanneer een bevoegde gebruiker het gesprek daadwerkelijk **opent** — nooit door webhook,
  AI of achtergrondjob. Idempotent (watermerk loopt alleen vooruit).
- **Attention is afgeleid, nooit dubbel opgeslagen:** uit `last_inbound_at` vs
  `last_read_at`, een klaarstaand voorstel en leverstatus → `NEW/UNREAD/NEEDS_ACTION/
  REPLY_READY/WAITING_FOR_CUSTOMER/RESOLVED (+ DELIVERY_PROBLEM)`.
- **Eén bron van waarheid:** Inbox-badge, cockpit-kop, rij-indicator komen alle uit
  `attentionOverview` (tenant-scoped, privacy uitgesloten). Behandelde communicatie
  verdwijnt overal coherent.
- **UX:** menselijke copy ("Antwoord staat klaar", correcte enkelvoud/meervoud), één
  deterministische prioriteit ("Als eerste bekijken", op urgentie → oudste wachtend, geen
  verzonnen AI-ranking), compacte conversation-previews met snippet, ontworpen zero-state
  ("Je bent bij."), subtiele micro-interacties (respecteert `prefers-reduced-motion`),
  responsive (mobiel = één boodschap + één actie), toegankelijk (kleur nooit het enige
  signaal). Eén klik → juiste gesprek (`/comm.html#conv=<id>`, markeert gelezen).
- **Migratie 005** forward-only/non-destructief: `last_read_at/last_read_by/last_inbound_at`
  + backfill van `last_inbound_at` + tenant-scoped index. Geen read-state gebackfilld
  (eerlijk "ongelezen tot geopend").

**Tests:** volledige comm-suite **65/65** (serieel). Nieuw: 22 attention-cases (pure
derivation + DB-E2E: watermerk, idempotentie, tenant-isolatie, privacy-uitsluiting,
zero-state, headline enkelvoud/meervoud) + uitgebreide signature-cases. Visuele QA
(desktop + mobiel + zero-state) via headless Chromium.

**Menselijke acties — afgerond (niet langer openstaand):**
- Communicatielaag geactiveerd (`DATABASE_URL` gekoppeld; Comm ENABLED, migraties 001–005).
- Resend inbound webhook + `RESEND_WEBHOOK_SECRET` + `COMM_MAILBOXES` gezet; MX `maculis.nl`
  geverifieerd; echte inbound→AI→bewerk→goedkeuren→outbound E2E aangetoond in productie.
- `MAIL_API_KEY` en `MAIL_FROM` gezet (echte outbound live).

**Resterende menselijke acties:** (a) visuele acceptatie van de knipoog in een échte
ontvangen mail in echte clients (Apple Mail/Gmail); (b) na deze deploy Testerbeheer één
keer openen zodat de productie-cockpit met echte relaties zichtbaar wordt (de read/write
van het watermerk is lokaal tegen echte Postgres bewezen en de productie-boot is schoon,
maar directe productie-DB-queries zijn vanuit de sandbox geblokkeerd (SSL/TLS)).

**Commits:** branch `claude/maculis-communication-layer-gk5x2i` → merge naar deploybranch
`claude/invitation-manager-mvp-d5r5h8` (auto-deploy Render, migratie 005 toegepast, schone boot).

---

## 2026-08-15 — Pass the Lens: productie-acceptatie (functioneel geaccepteerd, gesloten)

**Status: in productie werkend en functioneel geaccepteerd.** Bevestigd via een echte
productietest: een bestaande tester is opnieuw door First Five gegaan, Pass the Lens verscheen
op het juiste moment, een nieuwe ondernemer is ingevuld en die persoon kwam correct in
Testerbeheer binnen. Geen verdere wijzigingen; alleen heropenen bij een concrete bevinding uit
echte testdata.

**Wat het is.** De eerste ingebouwde organische groeilus: een ondernemer die First Five heeft
ervaren draagt aan het einde (na de Meaningful End én de evaluatie) een andere ondernemer aan
("Aan wie zou jij deze lens doorgeven?"). De aangedragen ondernemer landt als KANDIDAAT in
Testerbeheer; een beheerder beoordeelt en nodigt uit via de bestaande Invitation Manager.

**Architectuur (bestaande entiteiten hergebruikt, geen parallel CRM).**
- First Five is een dunne forwarder: `POST /api/pass-the-lens` → forwardt de 4 minimale velden
  (voornaam, achternaam, bedrijf, e-mail) naar Testerbeheer `POST /api/intake` (server-to-server,
  `INTAKE_KEY`). First Five bewaart niets over de derde persoon (privacy §10).
- `store.intake()` (bestaand seam): dedup op person_key, `source:'pass_the_lens'`, lifecycle nooit
  gereset. Provenance in append-only `record.introductions[]` = `{ at, by_id, by_name, by_company,
  source_journey }`; de verwijzer wordt uit zijn eigen token opgelost (`getByToken`), voert zijn
  gegevens niet opnieuw in, en geen token/secret wordt opgeslagen. Repeat-introductie wordt
  toegevoegd (zichtbaar), nooit een stille duplicaat/merge. History-event
  `pass_the_lens_introduction` (observatie; stuurt nooit status/consent).
- HARDE REGEL §4: geen automatische uitnodiging. Kandidaat = DRAFT + consent UNKNOWN → de
  fail-closed `mayContact()`-gate blokkeert elke automatische outbound. Uitnodigen loopt via de
  ONGEWIJZIGDE bestaande consent-gated e-mail/WhatsApp-flow; status schuift door naar SENT →
  COMPLETED.
- Relatiehistorie (§9/§15): best-effort `server/comm/pass-the-lens.mjs` (`bridgePassTheLens`) legt,
  wanneer de Comm Layer aan staat, een Contact + `pass_the_lens_introduction`-activity + een
  bevestigde memory ("Geïntroduceerd via Pass the Lens door X") vast, zichtbaar voor de AI-context.
  Volledig guarded/no-op wanneer uit. In productie staat de Comm Layer AAN, dus dit speelt mee.
- UI: rustig "Pass the Lens · via \<verwijzer\>"-label op de kandidaatrij + "Aangedragen door" in de
  Historie. Schrijfregel gerespecteerd (geen streepjes als stijlmiddel).

**Config (productie).** `INTAKE_KEY` gedeeld op `ftrlabs-testerbeheer` én `maculis-first-five`;
`TESTERBEHEER_INTAKE_URL=https://ftrlabs-testerbeheer.onrender.com/api/intake` op First Five. Het
gedeelde geheim staat NIET in code/log/docs. Zonder deze config degradeert de feature zacht (geen
kandidaat, geen kapotte UX).

**Tests.** Unit `tests/pass-the-lens.test.mjs` 5/5 (DRAFT + UNKNOWN → geen auto-invite; token-
provenance; dedup/repeat-append; onbekende verwijzer; dossier). core 19/19 ongewijzigd. Cross-service
E2E (beide échte servers lokaal) 15/15. First Five: tsc schoon, technical 13/13, selftest 8/8.
Analytics PII-vrij: `pass_the_lens_shown/_submitted/_skipped` (geen namen/e-mail).

**Commits.** Testerbeheer `ed6a9b5` (feat: controlled referral intake + provenance). First Five
`091c4de` (feat: the organic growth loop terminal beat). Beide live gedeployed en schoon geboot.

---

## 2026-08-15 — Inbound e-mail end to end: zichtbaar bij de klant + AI-verwerking

**Gerichte afrondingsbug.** Inkomende e-mail verscheen niet bij Klant → Communicatie.

**Root cause (config, geen codebug).** De keten stopt bij de voordeur: de Communication
Layer staat in productie UIT (`Comm : off`; `/api/comm/status → 404`), want
`COMM_LAYER_ENABLED` + `DATABASE_URL` zijn niet gezet op de service. De inbound-route
`/api/comm/inbound/resend` is daardoor inert; er wordt niets opgeslagen of getoond.
De inbound-code zelf is geverifieerd tegen de actuele officiële Resend-documentatie en
klopt: `email.received` is metadata-only, de body wordt via de Receiving API
(`GET /emails/receiving/{id}`, identiek aan `resend.emails.receiving.get`) opgehaald,
Svix-handtekening (whsec_, base64 HMAC-SHA256). Tweede meest voorkomende oorzaak in de
praktijk: het ontvangstadres moet exact op `COMM_MAILBOXES` staan, anders wordt de mail
genegeerd.

**Wijzigingen (in scope, geen nieuwe onderdelen):**
- PII-veilige inbound-diagnostiek (`[comm/inbound] rejected|ignored|stored|error …`) zonder
  afzender/inhoud/onderwerp, zodat in productie zichtbaar is wáár de keten stopt (o.a.
  `recipient_not_allowlisted`).
- De automatische AI-copilot bouwt zijn voorstel nu op de bounded Relationship Context
  Engine: recente + eerdere communicatie, First Five-status, open follow-ups én BEVESTIGDE
  Relationship Memory. Kanaal is metadata; dezelfde pipeline verwerkt later WhatsApp/SMS.
- `.env.example`: `COMM_MAILBOXES` toelichting bevestigd als het ontvangstadres.

**Getest (echte keten op een echte Postgres, fictieve data):** suite **32/32**; zonder DB
skippen de comm-tests netjes. Nieuwe E2E `comm-inbound-visibility` (echte Svix-webhook →
juiste klant → zichtbaar in Communicatie → juiste afzender/onderwerp/inhoud/tijd → refresh
blijft → reply-threading → onbekende afzender veilig → duplicate/ongeldige-signature/HTML/
plain/geen-onderwerp/lange-mail → verkeerd ontvangstadres genegeerd). Nieuwe E2E
`comm-inbound-ai-acceptance` (inbound → AUTOMATISCH AI-voorstel zonder knop, context met
bevestigde memory → mens past aan, edit blijft behouden → goedkeuren + verzenden → uitgaand
in dezelfde conversation, audit toont AI-draft + human approval → klant antwoordt → threadt
terug → AI stelt volgende stap voor; AI verzendt nooit zelf).

**Resterende human action (extern, alleen Lud):** de laag activeren (link
`maculis-relationship-db` → `DATABASE_URL` + `COMM_LAYER_ENABLED=1`) en Resend inbound
opzetten (MX-record op ontvangstdomein, inbound-webhook naar
`/api/comm/inbound/resend`, `RESEND_WEBHOOK_SECRET`, ontvangstadres = `COMM_MAILBOXES`).

---

## 2026-08-15 — Relationship Workspace + AI-first omnichannel Communication Layer

**Product.** De relatie is het productobject. Testerbeheer → klik op naam/bedrijf →
**Relationship Workspace** (Overzicht / Journey / Inzichten / Communicatie / Activiteit).
Communicatie zit IN de klant, niet in een los tabblad. De **centrale Inbox** (`/comm.html`)
is de tweede ingang: een rustig aandachtsmodel (Nieuw / Wacht op mij / AI-voorstel /
Onbekend / Levering / Follow-ups) op exact dezelfde data. AI is de primaire werklaag:
elk inbound bericht krijgt een conceptantwoord dat je conversationeel met Maculis verfijnt.

**Backend (additief op 001/002; migratie `003_drafts_followups_channels.sql`):**
- **Provider-abstractie** `server/comm/providers/*` — één neutrale interface
  (`send/capabilities/normalizeInbound/requiredConfig`). EMAIL is LIVE via Resend zodra
  geconfigureerd; WHATSAPP/SMS/PHONE/SOCIAL draaien als volledige MOCK-adapters (officiële
  routes: WhatsApp Business Cloud API, EU SMS/voice; nooit scraping) en melden exact welke
  credentials nog nodig zijn.
- **Unified outbound** `send.mjs` — één verzendpad voor alle kanalen met **consent-gate**
  (`consent.mjs`, per kanaal/doel, opt-out first-class), persist OUTBOUND message,
  `delivery_event`, activity + audit. AI verzendt nooit; alleen expliciete human-approval.
- **AI-first drafts** `drafts.mjs` + AI-serviceboundary `ai/service.mjs`
  (`summarize/classifyIntent/draftReply/reviseDraft/suggestNextAction/extractFollowUps/explain`)
  + bounded **Context Engine** `ai/context.mjs`. Composer en AI-chat delen dezelfde draft;
  `reviseDraft` rebaset op de HUIDIGE tekst → **menselijke wijzigingen worden nooit
  overschreven** (versiehistorie `comm_draft_version`). Deterministische offline-modus +
  fallback: communiceren werkt óók zonder AI.
- **Relationship aggregation** `relationship.mjs` (parallelle queries), **Inbox** `inbox.mjs`
  (attention model), **omnichannel inbound + identity resolution** `channel-inbound.mjs`
  (unknown-contact veilig, handmatig koppelen), **follow-ups** `followups.mjs`.
- Boot bridget bestaande Testerbeheer-invitations idempotent naar permanente Contact/Organization.
- Relationship-georiënteerde API onder `/api/comm/*` (relationship / inbox / drafts / followups /
  consent / status). Alles tenant-scoped; privacy-inbox blijft gescheiden en zonder auto-AI.

**Getest (fictieve data):** volledige suite **30/30** tegen een echte Postgres; zonder DB
skippen de comm-tests netjes (24 pass / 5 skip → productie-pariteit, laag blijft dormant).
Nieuwe E2E `comm-workspace.test.mjs`: inbound → Contact/Org → AI-voorstel → draft warmer/korter
→ **menselijke edit** → AI "voeg dinsdag toe" behoudt de edit → goedkeuren/verzenden →
delivery_event + audit → WhatsApp inbound (unknown) → koppelen → consent-blokkade →
opt-in → verzenden via mock; SMS onafhankelijk geblokkeerd. **Browser (Playwright,
desktop 1280 + mobiel 390):** login → naam klikken → Workspace (OCA) → Communicatie →
AI-chat past body aan → human edit behouden → verzenden → Inbox-aandachtsmodel; 0 console-errors.
CSP intact (externe JS, geen inline handlers; nooit `unsafe-inline` toegevoegd).

**Kanaalstatus (eerlijk, §81):** EMAIL architecture-ready + provider-connectable (Resend);
WHATSAPP/SMS/PHONE/SOCIAL architecture-ready + **MOCK E2E verified**, provider-connected =
nee (credentials ontbreken — zie ALLEEN DOOR LUD).

---

## 2026-08-14 — Online-acceptatie: deploybaar, beveiligd, fail-closed

**Doel.** Van lokale acceptatie naar een gecontroleerde ONLINE acceptatieomgeving
op Render (altijd-aan containers, geen localhost/Mac). Geen productlogica-wijziging;
uitsluitend deploybaarheid + online hardening.

**Wijzigingen (Testerbeheer, `ftrprf-labs/website`):**
- **Deploy:** `Dockerfile` (node:22-slim, `HOST=0.0.0.0`, `NODE_ENV=production`,
  `CMD node server/index.mjs`), `.dockerignore`, `render.yaml` (Docker web service,
  Frankfurt/EU, `plan: starter` always-on, persistente Disk op `/var/data`,
  `healthCheckPath /healthz`, secrets als `sync:false`). Nieuw `GET /healthz`.
- **Datastore configureerbaar:** `DATA_DIR` stuurt de JSON-store naar de
  persistente Disk (default `./data` lokaal). Geen datamodel-wijziging, geen migratie.
- **Auth-hardening:** sessie-HMAC uit vaste `AUTH_SECRET` (env) i.p.v. per-restart
  random → admin blijft ingelogd over redeploys. In productie **fail-closed**:
  server weigert te starten zonder `ADMIN_PASSWORD`, zonder `AUTH_SECRET`, of met
  een niet-https / localhost `MACULIS_PUBLIC_URL`.
- **Publieke vs interne URL (§3):** nieuwe `MACULIS_PUBLIC_URL` voor de persoonlijke
  tester-link (wat de tester op de telefoon opent); `MACULIS_HOST` blijft de interne
  server-to-server basis. Uitnodigingen bevatten nooit meer localhost.
- **Security headers op ALLE responses** (ook JSON-API) incl. **HSTS**.
- **Resend-e-mailadapter:** `MAIL_TRANSPORT=resend` (POST api.resend.com/emails,
  Bearer key, `{from,to,subject,text}`). Vereist key + geverifieerde afzender;
  het "alleen echt afgeleverd → INVITED"-contract blijft intact.
- **Lichte rate limiting** (in-memory, single-instance) op `/api/login` (10/5min)
  en `/api/intake` (60/min) → 429.
- `.env.example` gecorrigeerd/aangevuld (`MACULIS_EXPORT_KEY`, `MACULIS_PUBLIC_URL`,
  `AUTH_SECRET`, `DATA_DIR`, `NODE_ENV`, Resend).

**Journey (`ftrprf-labs/maculis-first-five.`, branch `claude/journey-consent-v1`):**
additieve baseline security-headers (HSTS, nosniff, X-Frame-Options SAMEORIGIN,
Referrer-Policy) — géén CSP (frozen inline scripts/video ongemoeid). Deploy-config
(Dockerfile/render.yaml) bestond al.

**Getest (fictief):** 19/19 unit; **online-acceptatie A–T 42/42** (beide echte
servers, productie-config, publieke/interne URL-split, s2s-auth beide richtingen,
consent fail-closed, lifecycle DRAFT→INVITED→STARTED→COMPLETED, e-mail
delivered-contract, WhatsApp 0629538336→31629538336, security-headers, rate-limit,
geen PII/secret in logs); prod-fail-closed startup 5/5; Journey selftest 8/8;
volledige bestaande regressie groen (wa 30/30 + 16/16 + 13/13, lifecycle 12/12,
fail-closed 22/22, intake 41/41, journey-pull 8/8, eval-UX 38/38, consent 34/34,
browser 18/18 + 16/16). Geen deployment uitgevoerd; geen productielogica gewijzigd.

---

## 2026-08-14 — E-mail lifecycle fix (INVITED = aantoonbaar verzonden)

**Blocker uit handmatige acceptatietest.** Een tester kon op INVITED komen
zonder aantoonbare verzending: het `mock`-transport fake'te succes. (De
WhatsApp-variant — openen zette direct INVITED — was al opgelost met de
tweestaps-bevestiging in `aad394c`; die zit in deze branch.)

**Fix.** Alleen een **echt verzendend transport met bevestigd succes** zet
INVITED.

- `mailer.mjs`: elk resultaat draagt nu een expliciete `delivered`-vlag.
  `mock` → `delivered:false` (reason `mock`), niet-geconfigureerd →
  `delivered:false`. Alleen `http` met een 2xx-respons → `delivered:true`.
  `mailConfigured()`/nieuwe `mailDelivers()` betekenen "een echt verzendend
  transport" (mock/leeg → false).
- `index.mjs` e-mailroute: zet INVITED + `invited_at` + `invitation_sent`
  **uitsluitend** bij `delivered === true`. `mock`/niet-geconfigureerd →
  blijft DRAFT, géén event, geteld als `notSent`. Een échte mislukte
  verzending → `invitation_failed`, DRAFT.
- `app.js`: eerlijke melding wanneer er geen verzendend transport is
  ("E-mail niet echt verzonden — niemand op INVITED").

**Regel bevestigd:** create / consent / publish / persoonlijke link / preview
/ modal openen zetten **nooit** zelfstandig INVITED. Alleen een expliciete
WhatsApp-verzendbevestiging of een echt geslaagde e-mailverzending doet dat.

**Tests toegevoegd/aangepast:** nieuwe lifecycle-E2E (A–K + geen-losse-INVITED,
12/12) met een echt HTTP-mailtransport (fake endpoint 2xx/5xx) voor de
succes/faal-paden; mailer-unittest herschreven op het `delivered`-contract.
Volledige regressie groen (17/17 unit, 12/12 lifecycle, 22/22 fail-closed,
30/30 WhatsApp, Step 3, 41/41 intake, 8/8 journey-pull, 38/38 eval-UX,
18/18 + 16/16 browser). Geen PII/keys in logs.

---

## 2026-08-14 — Journey-consent afronding (consent_version uit sessie)

**Feature (IM-kant van een cross-repo wijziging).** De Maculis-journey stempelt
sinds `maculis-contact-v1` de getoonde consent-versie in de sessie
(`contact_consent_version`) en het `inner_circle_opt_in`-event. De IM-pull leest
die versie nu uit en legt hem vast bij de OPTED_IN, zodat aantoonbaar is met
welke tekst iemand heeft ingestemd (voorheen `null`).

- `maculis-sessions.mjs`: `deriveByToken` leest `contact_consent_version` (sessie
  en event) → `d.consent_version`.
- `index.mjs`: de evaluations-pull geeft `version: d.consent_version` mee aan
  `setConsent` i.p.v. hardcoded `null`.
- Ongewijzigd: alleen een expliciete opt-in → OPTED_IN; "Nog niet"
  (`contact_consent_deferred` én de oude `inner_circle_declined`) → geen
  transitie; COMPLETED ≠ consent. Historische `null`-versies blijven `null`.

**Journey-repo (apart):** `ftrprf-labs/maculis-first-five.` branch
`claude/journey-consent-v1` — memory/contact ontkoppeld, V1-copy, nieuw event,
version-stamping, privacy-placeholder. **Consent-registry:** `ftrprf-labs/ftrlabs-docs`
(`00-governance/compliance/gdpr/consent-registry.md`).

**Getest:** 17/17 unit, 8/8 journey-pull-E2E, 34/34 journey-browser (desktop+375),
volledige IM-regressie groen. Geen tokens/PII in logs.

---

## 2026-08-14 — Fail-closed contactmodel + consent-provenance

**Feature.** Contact is voortaan **fail-closed**: alleen een expliciete
`OPTED_IN` staat benaderen toe.

**Beslissingen (na product/governance-review):**
- **`mayContact = consent_status === 'OPTED_IN'`.** UNKNOWN én OPTED_OUT
  blokkeren e-mail, WhatsApp, publish en de overgang naar INVITED (server-side,
  403/400). "Geen aantoonbare opt-in = geen contact."
- **"Nog niet" (`inner_circle_declined`) → geen consent-transitie** (blijft
  UNKNOWN), i.p.v. de eerdere OPTED_OUT. "Nog niet" is een uitstel, geen
  weigering. De oude event-naam wordt nog gelezen (backward compatible) maar
  stuurt geen transitie. OPTED_OUT is gereserveerd voor expliciete
  weigering/intrekking.
- **Handmatige OPTED_IN is geen vrijblijvend vinkje**: de admin-route eist een
  provenance-notitie (`consent_note`, hoe is toestemming verkregen) en stempelt
  `consent_source=manual`. Zonder notitie → 400.
- **Intrekking (First Five)** via de bestaande admin-route: `OPTED_IN →
  OPTED_OUT` met `consent_changed` (append-only) en directe blokkade. Een
  publieke self-service afmeldlink (W1) is bewust uitgesteld tot bredere
  opschaling.
- Geen historische migratie nodig (feitelijk 0 productierecords; identificeerbaar
  als `OPTED_OUT + consent_source=pass_the_lens` mocht het ooit voorkomen).

**Gewijzigd:** `store.mjs` (`mayContact`, `consent_note`, migratie),
`index.mjs` (fail-closed gates + verplichte notitie), `maculis-sessions.mjs`
(declined niet meer → OPTED_OUT), `public/*` (knoppen disabled voor alle
niet-OPTED_IN, notitieveld), `tests/core.test.mjs`.

**Getest (fictief):** 17/17 unit, 22/22 fail-closed-E2E, 41/41 intake-E2E,
16/16 fail-closed-browser; regressie Step 3-integratie, Evaluaties-UX 38/38,
WhatsApp-bevestiging 30/30, intake-browser 18/18. Logs zonder notitie/PII/keys.

**Nog open (aparte GO's):** Maculis-journey (nieuwe copy, memory/contact
ontkoppelen, privacy-link, `consent_version=maculis-contact-v1`), consent-
registry, en later self-service withdrawal (W1).

---

## 2026-08-14 — Pass the Lens → consent → Testerbeheer (intake-keten)

**Feature.** De ontbrekende ruggengraat tussen de Maculis-journey ("Pass the Lens")
en Testerbeheer: consent uit de journey wordt vastgelegd met provenance en er is een
beveiligd automatisch intake-endpoint.

**Architectuurbeslissingen (na read-only inventarisatie van `website`,
`maculis-first-five` en `ftrlabs-docs`):**

- **Consent-bron = bestaande Maculis inner-circle opt-in.** De journey heeft al een
  expliciete, niet-vooraangevinkte consent-stap (`inner_circle_opt_in` /
  `inner_circle_declined`, knoppen "Houd me op de hoogte" / "Nog niet"). Deze wordt
  hergebruikt; er is geen nieuwe consent-tekst of -UX gebouwd.
- **Twee kanalen (gebruikerskeuze).**
  1. *Pull* — de bestaande Option-B session-export-pull leidt consent af
     (`inner_circle_opt_in` → OPTED_IN, `inner_circle_declined` → OPTED_OUT, geen
     keuze → UNKNOWN) en past die idempotent toe met `consent_source=pass_the_lens`.
  2. *Push* — `POST /api/intake` als beveiligd ontvangstcontract voor een
     toekomstige Pass the Lens (nu nog geen live caller).
- **Drie dimensies strikt gescheiden.** Lifecycle, evaluatiestatus en consent
  overschrijven elkaar nooit. `COMPLETED ≠ OPTED_IN`: een afgeronde journey zonder
  expliciete keuze blijft UNKNOWN.
- **`consent_version = null`** tot een officiële consent-versie is vastgesteld (geen
  verzonnen versie).
- **Dedup via `person_key`** (genormaliseerde e-mail primair, mobiel als fallback,
  binnen campagne) — bewust níét het participant/session-token.
- **Intake-auth** apart van de admin-gate: header `x-intake-key` = `INTAKE_KEY`;
  ontbreekt de key → 503 (uitgeschakeld), verkeerd → 403. Nooit een publieke intake.
- **Geen lifecycle-reset** bij her-intake van een bestaande tester; consent wordt
  alleen bij een expliciete nieuwe keuze bijgewerkt. Migratie additief/non-destructief.

**Datamodel toegevoegd:** `consent_source`, `consent_version`, `person_key`
(migratie-veilig, legacy → null / afgeleid). History-event `consent_recorded`
(eerste consent) naast `consent_changed`.

**Testresultaten (fictieve data):**
- Unit: 16/16.
- E2E intake (scenario A–I + pull-consent + auth + disabled): 38/38.
- Browser (desktop + 375px): 18/18, 0 console-errors, geen horizontale scroll.
- Regressie: Step 3-integratie, Evaluaties-UX 38/38, WhatsApp-bevestiging 30/30.
- Privacy/log-audit: logs alleen `METHOD PATH -> status`; geen keys/tokens/PII;
  history bevat geen bodies/tokens/antwoorden.

**Resterend (infrastructuur, buiten deze code):** een echte Pass the Lens-caller die
`POST /api/intake` aanroept bestaat nog niet; `www.maculis.nl` moet via DNS/host naar
de Maculis-server wijzen; officiële `consent_version` moet worden vastgesteld.

**Commit:** zie git-historie op branch `claude/invitation-manager-mvp-d5r5h8`.

---

## Eerder (samengevat)

- **V1 basis:** import (CSV/XLSX), opaque tokens, persoonlijke `MACULIS_HOST/?p=<token>`-link,
  WhatsApp/e-mail-uitnodiging, publish naar Maculis, systeemgestuurde lifecycle.
- **Evaluaties/Inzichten (Optie B):** Maculis is source of truth; read-only pull,
  join op participant-token; geen tweede vragenlijst.
- **Consent (opt-in/opt-out):** onafhankelijke dimensie met server-side OPTED_OUT-blokkade.
- **Uitnodigingshistorie + provenance:** append-only `history[]`, `source`.
- **Evaluaties-UX:** KPI-kaarten, testerreis-funnel, verdelingen, open inzichten.
- **Canonieke host:** één `MACULIS_HOST` (default `https://www.maculis.nl`).
- **WhatsApp:** handmatige "Uitnodiging verzonden"-bevestiging (openen ≠ verzenden).
