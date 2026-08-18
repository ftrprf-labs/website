# Pre-implementation gate

> **Planstap. Geen productcode gewijzigd, niets gerestyled, gemerged of gedeployed.**
> Volgt op `HARMONISATIEPLAN_VISUAL_DNA_V1.0_HERZIEN.md`. Canon: `ftrlabs-docs` @ `139ea06`,
> `03-ux/`, checksum `04d6b40907f2bbda`.

Opgesteld: 2026-08-18

---

## 1. N-1: technische vergelijking en aanbeveling

Wat er feitelijk over de grens loopt in `maculis-first-five./public/index.html`, 2.535 regels:

| Koppeling | Bewijs |
|---|---|
| Eén analyseresultaat is het anker voor de hele tweede helft | `currentOutcome` gezet op r1515 (Lens), gelezen op r1741, 1787, 1804, 1805, 1874, 1897 (Mijn Maculis) |
| Eén sessieobject, één `session_id`, één beacon | `session` r793, `POST /api/session` r871 t/m 872, `beforeunload` r2420 |
| Eén opaque deelnemertoken, eenmalig opgelost bij boot | `session.participant` r833, `/api/participant` r855 |
| Filmische overgangen vuren óver de grens | `playClip("blink_black")` r1741 en `playClip("recognition")` r1787, beide gegate op `currentOutcome` |
| 93 telemetrie-events op één tijdlijn vanaf één `T0` | `ev()` r803 |
| Consentvragen staan ná de grens, de sessie waarvoor ze gelden begint ervóór | `CONTACT`-consent r2136 |

### Beoordeling op de zes gevraagde criteria

| Criterium | A · splitsen | B · één codebasis, expliciete runtime-regimes |
|---|---|---|
| **Onderhoudbaarheid** | Kleinere bestanden, maar de stage-machine, mediahelpers, telemetrie en tokenkopie moeten worden gedeeld of gedupliceerd. Circa 800 regels infrastructuur zonder buildstap om te delen. | Bestand blijft groot en groeit. Te beheersen door het regime op één wrapper te zetten en kamerspecifieke CSS onder de regime-selector te scopen. |
| **Regressierisico** | **Hoog.** Zes downstream-beslispunten hangen aan `currentOutcome`. Dat moet dan geserialiseerd de grens over. Een documentnavigatie midden in een lopende `playClip` is bovendien een hard probleem. | **Laag.** Er steekt geen data een grens over. De wijziging is additief op één bestaand knooppunt: de stage-machine. |
| **Privacy- en businesslogica** | **Zwaarste bezwaar.** Het opaque token moet mee. Ofwel in een tweede URL, en dan staat een privacygevoelig token in een tweede history- en referrer-entry, terwijl het ontwerp juist eist dat de URL geen betekenisvolle waarde draagt. Ofwel via opslag, en dan is er een nieuw persistentie-oppervlak met een eigen consentvraag. Daarnaast vuurt `session_abandoned` vals bij elke legitieme overgang. | **Geen wijziging.** Eén sessie, één token, één beacon, consentmodel onaangeroerd. |
| **Performance** | Tweede documentload plus opnieuw ophalen en decoderen van video midden in de journey. De canon noemt in hoofdstuk 17 een losse stylesheet hier al render-blocking op het moment dat video start. Een heel tweede document is zwaarder. | Circa 30 extra custom properties. Verwaarloosbaar. |
| **Testbaarheid** | Kleinere eenheden, maar `selftest` en de vijf Pass the Lens-tests draaien tegen één origin. E2E overspant dan een navigatie. | Bestaande tests ongewijzigd. Een regime-assertie is één selectorcheck. |
| **Toekomstige divergentie** | **Beste.** Echt onafhankelijke evolutie. | **Zwakste punt.** Twee kamers in één bestand drijven naar gedeelde code die niet gedeeld hoort te zijn. |

### Aanbeveling: B, met één voorwaarde

B wint of gelijkspeelt op vijf van de zes criteria en verliest alleen op toekomstige divergentie.
Doorslaggevend zijn twee dingen.

**Ten eerste is B omkeerbaar en A niet.** Canon 16 punt B, "krijgt Mijn Maculis een eigen
repository", staat expliciet OPEN. Nu splitsen loopt vooruit op een canonbesluit dat nog niet
genomen is. B houdt beide deuren open: als de canon later voor een eigen repository kiest, is de
regimegrens al netjes gemarkeerd en is de splitsing eenvoudiger dan vandaag.

**Ten tweede raakt A privacylogica en B niet.** Het opaque token en het per-doel-consentmodel zijn
zorgvuldig ontworpen. Ze verplaatsen om een visuele reden is de verkeerde ruil.

Hoofdstuk 5 eist één regime per **kamer**, niet één document per kamer. Zolang de regimegrens
samenvalt met de kamergrens, voldoet B aan de letter en de bedoeling.

**De voorwaarde.** De overgang van nacht naar dag midden in een lopende journey is een moment dat de
canon niet beschrijft. Hoofdstuk 7 zegt dat in het dagregime `light.core` niet als emissie bestaat,
en hoofdstuk 14 geeft Mijn Maculis alleen ademen als beweging. Wat er dus precies gebeurt op het
moment dat de deelnemer van de observatieruimte naar de reflectieruimte gaat, is ontwerp dat nog niet
vastligt. **Dat is een canonvraag, geen productkeuze.** Ik neem hem op als amendement C-8.

Divergentie beheersen we met drie afspraken, geen van drie is code: het regime staat op de root en
wordt op precies één plek gezet, kamerspecifieke CSS staat onder de regime-selector, en er komt geen
nieuwe gedeelde helper over de kamergrens bij.

---

## 2. N-2: vastgelegd besluit en een eigen workstream

**De e-mailhandtekening valt onder Maculis Visual DNA als volwaardig brand surface, niet als vijfde
kamer. De huidige implementatie is geen vertrekpunt en wordt opnieuw ontworpen vanuit Visual DNA
v1.0.**

Daarmee komt er een vijfde workstream naast de vier kamers: **E-mail / Signature**. Hij volgt de
canon, maar niet de room grammar.

### 2.1 De huidige handtekening, uitsluitend als implementation fact

`website/server/comm/signature.mjs`. Geen visuele referentie, geen basis voor iteratie. Wat er staat:

| Feit | Regel |
|---|---|
| `const GOLD = '#c8894a'` is koper, geen goud. Wordt als enige merkkleur gebruikt | 46 |
| `const DIM = '#8a8073'` is een grijstint die nergens anders in het systeem bestaat | 46 |
| Vierde eigen sans-stack, afwijkend van de andere drie | 57 |
| Bodytekst `#2b2b2b` op wit. Het enige lichte Maculis-oppervlak dat vandaag bestaat | 92 |
| Table-based layout met inline styles, Outlook-veilig | 57 t/m 67 |
| Knipoog als animated GIF met statische PNG-fallback, van eigen domein, geen tracking pixel | 60 |
| Plain-text variant met RFC 3676-scheider, imiteert de animatie bewust niet | 72 t/m 80 |
| Centraal en exact eenmaal toegevoegd bij verzenden, idempotent, nooit in de opgeslagen body | 86 t/m 95 |

**Het onderscheid is bindend.** De laatste drie rijen zijn technische contracten en die blijven
staan: exactly-once bij verzenden, idempotentie, de AI-context-scheiding via `stripForContext`, en
de tracking-vrije opzet. Dat is het enige waarvoor dit bestand als implementation fact telt.

**De huidige visuele implementatie vormt geen enkele ontwerpbeperking.** Niet de kleurkeuze, niet de
typografie, niet de table-layout, niet de compositie, en niet het knipoogmechanisme. Waar het
herontwerp met iets daarvan overeenkomt, is dat een uitkomst en nooit een uitgangspunt.

### 2.2 Wat wel en niet uit de canon komt

| Wel toepassen | Niet toepassen |
|---|---|
| Koper `#c8894a` als het signaal, en niet langer `GOLD` genoemd | Room grammar: geen grond, geen surfaces, geen dichtheidsmodel |
| Ink-tekstwaarden in plaats van het eigen `#8a8073` | Signal language: geen trappen, geen veld, geen constellatie |
| De canonieke sans in plaats van de vierde eigen stack | Lichtregimes: e-mail heeft er geen |
| Newsreader waar de handtekening spreekt, met een echte fallback | Gloed: bestaat niet in e-mail |
| Serif spreekt en sans wijst, voor zover e-mail dat toelaat | De volledige motion-levenscyclus met zes stadia |
| Onzeker is kleurloos, en kleur nooit als enige drager | Beweging als **drager** van betekenis, identiteit, contact of bruikbaarheid |

**Geen signal-field-theater.** Waar e-mail iets technisch of inhoudelijk niet draagt, wordt het niet
nagebootst. Een statisch merkbeeld dat onmiskenbaar Maculis is, is beter dan een halve imitatie van
een lichtveld.

### 2.3 De technische bovengrens, en wat dat voor het ontwerp betekent

Dit bepaalt het ontwerp meer dan smaak. Vier harde grenzen:

1. **Geen webfonts.** Newsreader laadt in vrijwel geen enkele client. Elke serif-regel moet leesbaar
   zijn in de fallback, en de fallback is de facto Georgia. Het ontwerp mag niet op Newsreader
   leunen voor zijn herkenbaarheid.
2. **Geen custom properties.** Tokens moeten server-side als constanten bestaan, gegenereerd uit
   hetzelfde gestempelde bestand, nooit met de hand overgetypt.
3. **Geen gecontroleerde achtergrond.** De client bepaalt of de handtekening op wit, op donkergrijs
   of op een geïnverteerde variant landt. Kleuren moeten op alle drie standhouden. Dit is precies
   waarom C-7 nodig is.
4. **Onvoorspelbare motion-ondersteuning.** Clients verschillen sterk in wat ze afspelen, en
   sommige tonen alleen het eerste frame. Zie 2.4: dit is geen verbod, het is de reden voor
   progressive enhancement.

### 2.4 Motion: de grens, en de opdracht voor het herontwerp

**Er is geen verbod op motion in de signature.** De harde grens is een andere:

> **Motion mag nooit noodzakelijk zijn voor betekenis, identiteit, contactinformatie of
> bruikbaarheid.**

Alles wat de handtekening moet overbrengen, moet volledig overkomen zonder dat er iets beweegt.

Het herontwerp onderzoekt daarom **expliciet progressive enhancement**, in deze volgorde:

1. **De statische signature is de universele basis en wordt zelfstandig volledig ontworpen.** Niet
   als afgeleide, niet als reductie, niet als wat er overblijft. Uitzonderlijk sterk op eigen kracht.
   De toets is streng: wie hem alleen statisch ziet, mag nooit het gevoel hebben de mindere versie te
   zien. Als de statische variant pas werkt zodra er beweging bij komt, is het ontwerp niet af.
2. **Subtiele Visual-DNA-motion of signal-life uitsluitend als toevoeging**, en alleen in clients en
   omgevingen waar dat **aantoonbaar** betrouwbaar, waardig en zonder degradatie kan. Aantoonbaar
   betekent gemeten in de clientmatrix, niet aangenomen.
3. **Degradatie is geen optie.** Een client die de verrijking niet aankan, krijgt de statische basis,
   niet een halve animatie of een leeg kader.

Dat het huidige mechanisme, een GIF die eenmaal speelt met een statische PNG-fallback, hier toevallig
al bij past, is een technische constatering. Het is uitdrukkelijk **geen ontwerpvoorstel en geen
vertrekpunt**. Welke vorm de verrijking krijgt, of er überhaupt een komt, en waar de grens tussen
basis en verrijking ligt, wordt bij het herontwerp bepaald.

### 2.5 Wanneer

**Positie: derde workstream, na de Cockpit-pilot, parallel aan de Website, vóór Lens.**

Niet eerder, om twee redenen. C-7 moet beslist zijn, want zonder doorgerekende waardenset voor een
oppervlak zonder regime is elke kleurkeuze een improvisatie. En een herontwerp verdient minstens één
kamer die al canoniek gerenderd is, zodat er tegen een gebouwde referentie ontworpen wordt en niet
alleen tegen proza.

Niet later, om drie redenen. Dit is het enige Maculis-oppervlak dat mensen bereikt die **nog nooit
een kamer hebben gezien**, dus het is vaker een eerste indruk dan de Website. Het is de plek waar je
zelf het minst tevreden over bent, en dat is een reden om er niet mee te wachten tot het einde. En
het is technisch volledig ontkoppeld: één servermodule, geen enkele kamer-CSS, dus het kan geen kamer
laten regresseren en het hoeft op geen kamer te wachten.

**Het hoeft in het bijzonder niet op Mijn Maculis te wachten.** De verleiding is om te denken dat een
licht oppervlak het dagregime nodig heeft, maar de dagwaarden zijn al doorgerekend en staan in het
tokenbestand. Als C-7 uitkomt op "een brand surface gebruikt de dagset", is het ontwerp niet
geblokkeerd door de bouw van Mijn Maculis.

---

## 3. Canon-amendment C-1 t/m C-8

Compact voorstel. Hoort via hoofdstuk 17 in `ftrlabs-docs` te landen, nooit lokaal in productcode.

| # | Al normatief in v1.0 | Machineleesbaar ontbrekend | Minimale tokenaanvulling | Blokkeert |
|---|---|---|---|---|
| **C-1** | H5 en H14: drie regimes. Cockpit is werklicht, grond `ink.980` naar `ink.950`, diepte uit tonale stapeling | Alleen `night` en `day` bestaan. De kop wijst de Cockpit `night` toe met een egale `#0a0b10`. De stapeling is nergens uitdrukbaar | Derde blok `[data-maculis-regime="worklight"]` met een eigen `--surface-ground`, plus de twee stapelingsstappen als tokens | F4 Testerbeheer-grond. Feitelijk alle Cockpit-grondwerk |
| **C-2** | H6: `border.semantic` is de statuskleur op 35 procent | Alleen `hairline` en `defined` bestaan | `--border-semantic` per regime, of een documenteerde afleidingsregel uit de vijf `semantic.*` | Statuswerk in alle kamers, F3 |
| **C-3** | H6 punt 3: schaduw is diffuus of hij is er niet. Canoniek `0 22px 55px -32px rgba(0,0,0,.85)` | Waarde staat alleen in proza | `--shadow-diffuse` | F7. In het dagregime draagt schaduw de diepte, dus dit is daar structureel |
| **C-4** | H7: drie niveaus, en de straal van `light.core` is een functie van het aantal onafhankelijke signalen | Geen tokens, en geen uitgedrukte relatie tussen signaalaantal en straal | `--light-core`, `--light-field`, `--light-edge`, plus een schaalregel of een set stappen voor bewijsdichtheid | F8 volledig. Ook de gloedpoort in de verificatie |
| **C-5** | H12: modal-scrim `rgba(4,2,1,.62)`, nooit puur zwart | Waarde staat alleen in proza | `--scrim-modal` | Modals in Cockpit en Lens, F4 |
| **C-6** | H9: het veld is koper aan de rand en violet in de kern | De North Star gebruikt `--violet-core #a99bec`, dat in geen van beide tokenbestanden voorkomt | `--semantic-emerging-core` per regime, doorgerekend zoals H3.3 eist | F8 signal language |
| **C-7** | H2 en H3: koper is het signaal, ink draagt tekst. N-2 wijst e-mail aan als brand surface | Geen waardenset voor een oppervlak **zonder** regime, terwijl e-mail op licht én donker rendert | Eén expliciet doorgerekende `brand-surface`-set, of de uitspraak dat een brand surface de dagset gebruikt | F9 |
| **C-8** | **Nieuw, volgt uit de N-1-aanbeveling.** H5: één regime per kamer. H7: dag kent geen emissie. H14: Mijn Maculis beweegt alleen ademend | De overgang tussen twee regimes binnen één sessie is nergens beschreven. Duur, curve, en wat er met een brandend lichtpunt gebeurt zijn onbepaald | Geen token maar een normatieve alinea in H5, plus eventueel `--motion-regime-shift` | F6 en F7 |

C-1 is de zwaarste: zonder werklicht kan de Cockpit niet naar de canonieke grond zonder dat iemand
met de hand een waarde verzint, en dat verbiedt hoofdstuk 17.

C-3, C-5 en C-6 zijn het goedkoopst: de waarden staan al in de canon en hoeven alleen mee in de
generator.

---

## 4. F2, gesplitst op risico

Dit is de kern van de gate. De vraag bij elk item is niet "is het schuld" maar **"verandert er een
pixel of een gedraging".**

### F2-a · Gegarandeerd visueel neutraal

Bewezen neutraal, niet aangenomen. Poort: pixeldiff exact nul.

| Item | Waarom bewijsbaar neutraal |
|---|---|
| `styles.css:204` `var(--ink, #ece2d4)` naar `var(--text)` | `--text` is `#ece2d4`. Zelfde waarde |
| `styles.css:205` `var(--amber, #c8894a)` naar `var(--primary)` | `--primary` is `#c8894a`. Zelfde waarde |
| `styles.css:211` `.ptl-tag` idem | Zelfde waarde |
| `comm.html` `--priv:#8a3a63` definiëren | De fallback was al `#8a3a63`. Zelfde waarde |
| Dode `maculis-first-five./index.html` verwijderen | Wordt door de `Dockerfile` niet gekopieerd. Rendert nergens |
| `.eval-yes` vervangen door `.btn-primary` | Beide definities zijn **declaratie voor declaratie identiek**, hover inbegrepen. Geverifieerd |
| Website: `--amber*` opheffen in `--signal*` | `--amber`, `--amber-400` en `--amber-500` zijn identiek aan hun signal-tegenhanger. De enige afwijkende stap, `--amber-600` tegen `--signal-600`, heeft **nul gebruiken** in de codebasis. Geverifieerd |

### F2-b · Kan pixels of gedrag veranderen

Toegestaan in F2, maar elk item krijgt een vooraf opgeschreven verwachte diff en een eigen commit.
Poort: de diff bevat uitsluitend wat vooraf is opgeschreven.

| Item | Verwachte verandering |
|---|---|
| `styles.css:206` `var(--dim, #9aa0ac)` naar `var(--muted)` | **Zichtbaar.** `#9aa0ac` is koud, `--muted` is `#a89a86` en warm. Raakt `.link-name.link-dim` |
| `color-scheme: dark` in de Lens | Native controls en scrollbars wisselen van licht naar donker. Raakt `.ptl-input` en `.ctx-field textarea` |
| `:focus-visible` in Inbox en Workspace | Voegt een toestand toe die vandaag niets rendert. De ruststand kan niet regresseren. Ringkleur is koper per H2, geen improvisatie |
| `prefers-reduced-motion` in Inbox en Workspace | Alleen de toast-transitie van 0,2s vervalt. Direct zichtbaar is de eindtoestand, conform H8.5 |
| Easing-overtypfouten herstellen | Begin- en eindbeeld identiek, de frames ertussen niet. Cockpit `0.22, 1, 0.36, 1` en Website `[0.16, 1, 0.3, 1]` |
| `.ask-wrap.personal .ask-cta` naar `.btn-primary` plus maatvariant | Wijkt op drie waarden af: padding `.7em` tegen `.72em`, letter-spacing `.02em` tegen `.015em`, font-size `clamp(17px,2.6vw,21px)` tegen `clamp(16px,2.5vw,19px)`. Neutraal alleen als de variant alle drie behoudt |

### F2-c · Hoort niet in F2, wacht op kamerharmonisatie

Dit is precies waar cleanup ongemerkt restyle wordt. Deze items **niet aanraken** in F2.

| Item | Waarom later |
|---|---|
| 13× hard `8px` naar `--radius-sm` | `--radius-sm` is 10px. Dat is geen opruiming maar een vormwijziging op elke knop en elk veld in de Cockpit |
| Spacing naar de canonieke schaal | Zelfde probleem, breder |
| `.rec-btn` en `.link` samenvoegen met `.btn-secondary` en `.btn-link` | **Geen van beide is canoniek.** H12 zegt dat een secundaire knop bij hover alleen de randkleur verandert. `.rec-btn` verandert rand én achtergrond, `.btn-secondary` verandert rand én tekstkleur. Er valt hier niets op te ruimen zonder eerst te beslissen wat de canonieke variant is |
| 39 gouden literals naar tokens | Zodra C-4 er is, moeten die waarden aan bewijsdichtheid hangen. Nu tokeniseren is dubbel werk in de verkeerde richting |
| Breekpunten gelijktrekken | H14 geeft de kamers verschillende dichtheid. Breekpunten mógen verschillen. Geen schuld |
| Vierde tonaal niveau in de Inbox weg | Raakt de grondconversie. Hoort bij F4 |
| Engelse statusbadges | Copy en semantiek, geen schuld. Hoort bij F3 |
| `signature.mjs` opschonen | **Niet opruimen.** De handtekening wordt opnieuw ontworpen, niet geharmoniseerd. `GOLD` hernoemen of `#8a8073` vervangen is werk dat het herontwerp weggooit |

---

## 5. Voorgestelde volgorde van de vier kamers, plus de brand surface

Gerangschikt op blast radius en leerwaarde, niet op omvang.

| # | Kamer | Waarom hier | Blokkade |
|---|---|---|---|
| 1 | **Cockpit** | Interne omgeving, één gebruiker, volledig omkeerbaar, geen externe zichtbaarheid. De goedkoopste plek om vendoring, Newsreader en de warme oppervlakken te leren. Inbox en Workspace hebben bovendien al bijna de juiste grond | Alleen de Testerbeheer-grond wacht op C-1. De rest is nu al te doen |
| 2 | **Website** | Mechanisch de eenvoudigste stack: `next/font` inruilen voor zelf gehoste Newsreader is één plek, en Tailwind leest de tokens rechtstreeks. Publiek zichtbaar, maar een regressie breekt niemands werk | Geen |
| 3 | **Lens** | Live met testers, filmische timing, en de enige kamer met de inline-kopie-uitzondering uit H17. Verdient twee kamers ervaring vooraf | Geen, maar wel serieel werk in één bestand |
| 4 | **Mijn Maculis** | Laatst. Grootste enkele wijziging van het programma, en hij hangt aan N-1, C-3 en C-8 | N-1, C-3, C-8 |
| ~ | **E-mail / Signature** | Geen kamer maar een parallelle workstream. Start na de Cockpit-pilot, loopt naast de Website, moet klaar zijn vóór Lens. Technisch ontkoppeld, dus hij blokkeert niets en wordt door niets geblokkeerd behalve C-7 | C-7 |

---

## 6. De eerste concrete pilot

**`website/public/workspace.html`, de Relatie-workspace, volledig.**

Niet omdat het de kleinste is, maar omdat het de kleinste is die het meeste raakt: 293 declaraties,
intern, één gebruiker, en er is een bijna identieke tweeling in `comm.html` die als controlegroep
onaangeroerd blijft.

Wat de pilot bewijst, in één omgeving:

* het gestempelde tokenbestand vendoren en de checksum in CI bewaken;
* zelf gehoste Newsreader met `font-optical-sizing: auto`, en wat de andere metrics met een dichte
  layout doen;
* het serif wordmerk terug op zijn plek;
* warme verhoogde vlakken en koperen hairlines op een grond die al bijna canoniek is;
* `:focus-visible` en `prefers-reduced-motion` waar ze nu volledig ontbreken;
* Nederlandse, menselijke statuslabels.

Wat de pilot bewust **niet** doet: de grond aanraken, want die wacht op C-1. Geen signal language,
geen gloed, geen radii of spacing. De pilot is de generale repetitie voor F1 tot en met F3, niet voor
F4 en verder.

Dat de tweeling `comm.html` onaangeroerd blijft is het punt. Na de pilot staan twee bijna identieke
schermen naast elkaar, één canoniek en één zoals het was. Dat is de eerlijkste vergelijking die dit
programma kan opleveren, en hij kost niets extra.

---

## 7. Stop- en go-poorten vóór elke productwijziging

Elke poort is een harde stop. Geen enkele mag met een oordeel worden gepasseerd.

**Voorwaardelijk aan alles**

1. **Nulmeting compleet.** Referentierenders van alle vijf de oppervlakken, vier viewports, normaal
   en `reduce`, animaties bevroren. Zonder nulmeting is neutraliteit onbewijsbaar.
2. **Checksum geldig.** Elk gevendord tokenbestand draagt de actuele canonchecksum. Wijkt hij af, dan
   is het bestand stale en mag het niet gebruikt worden.
3. **Geen handmatige tokenwaarde.** Ontbreekt een waarde, dan is dat een amendement, geen invulling.
   Blokkeert de stap.

**Per stap**

4. **F2-a: pixeldiff exact nul.** Elk verschil is een fout, geen smaakoordeel.
5. **F2-b: vooraf opgeschreven verwachte diff.** Een diff op een scherm dat niet vooraf is genoemd,
   is een regressie.
6. **F2-c blijft ongemoeid.** Elke aanraking van een F2-c-item in een F2-commit is een stop.
7. **Regimepoort.** Precies één `data-maculis-regime` actief per kamer.
8. **Gloedpoort.** Voor elke gloed op het scherm is benoembaar welk bewijs hem draagt.
9. **Reduced-motion-poort.** Onder `reduce` toont elk scherm de eindtoestand, nooit een bevroren
   begin.
10. **Testpoort.** `npm test` in beide repositories onveranderd groen, plus `selftest` 8/8 en
    `engine:regression`.
11. **Toegankelijkheidspoort.** Elk focusbaar element heeft een zichtbare ring. Contrast opnieuw
    gemeten na elke grondwijziging.

**Per kamer, vooraf**

12. **Atomariteit vastgesteld.** F4, F5 en F7 landen per kamer in één commit. Een halve
    grondconversie of een halve letterwissel mag niet deployen.
13. **Rollbackpunt benoemd** en getest voordat de stap begint.
14. **Deployvenster.** Drie repositories deployen los. Voor F5 en F7 is een gecoördineerd venster
    nodig, anders lopen de kamers zichtbaar uit de pas.

**Voor de brand surface**

15. **Clientmatrix vóór verzending.** Apple Mail, Gmail web, Gmail app, Outlook, elk op lichte én
    donkere clientachtergrond, plus de plain-text variant. Een verzonden mail komt niet terug: dit is
    de enige poort in het hele programma waarachter geen rollback bestaat.
    De matrix kent drie afzonderlijke, elk blokkerende oordelen:
    **(a) De statische basis staat op eigen kracht.** Beoordeeld met alle motion uitgeschakeld, in
    elke client, plus onder `prefers-reduced-motion`. Betekenis, identiteit, contactgegevens en
    bruikbaarheid zijn volledig aanwezig. Het oordeel is niet "acceptabel" maar "dit is de
    handtekening". Zakt de basis hier, dan stopt het.
    **(b) Verrijking is aantoonbaar additief.** Per client gemeten, niet aangenomen. Alleen aan waar
    het betrouwbaar en waardig speelt.
    **(c) Geen degradatie.** Nergens een halve animatie, een leeg kader of een zichtbaar gat waar de
    verrijking niet landt.
16. **Contract intact.** `stripForContext`, het exactly-once-gedrag en de tracking-vrije opzet
    onveranderd. De comm-suite groen. Het herontwerp raakt presentatie, nooit verzendlogica.

---

## Samenvatting

| Onderwerp | Uitkomst |
|---|---|
| **N-1** | Aanbeveling **B**, één codebasis met expliciete runtime-regimes. Omkeerbaar, raakt privacylogica niet, en loopt niet vooruit op canon 16 punt B. Voorwaarde: de nacht-naar-dagovergang is canonwerk, opgenomen als C-8 |
| **N-2** | Vastgelegd. Volwaardig brand surface, geen vijfde kamer. De huidige handtekening is **implementation fact, geen vertrekpunt**, en wordt opnieuw ontworpen. Eigen workstream **E-mail / Signature**, gepland na de Cockpit-pilot en naast de Website. C-7 versmald tot de waardenset voor een oppervlak zonder regime. Motion is niet verboden maar mag nooit betekenis dragen: het herontwerp onderzoekt progressive enhancement op een zelfstandig volwaardige statische basis |
| **Canon-amendment** | C-1 t/m C-8. C-1 is blokkerend voor de Cockpit-grond, C-3, C-5 en C-6 zijn triviaal |
| **Veilige F2-scope** | 7 items bewijsbaar neutraal, 6 items met vooraf beschreven diff, 7 items uitdrukkelijk uitgesteld |
| **Volgorde** | Cockpit, Website, Lens, Mijn Maculis. E-mail / Signature loopt parallel vanaf de Website |
| **Eerste pilot** | `workspace.html` volledig, met `comm.html` als onaangeroerde controlegroep |
| **Poorten** | 16, alle hard. Poort 15 is de enige zonder rollback |

**Geen productcode gewijzigd. Niets gerestyled, gemerged of gedeployed. Ik stop hier en wacht.**
