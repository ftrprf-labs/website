# Twee amendementvoorstellen voor Visual DNA v1.0

> **Voorstel. Niets geïmplementeerd, niets gemerged, niets gedeployed.**
> Volgt uit de Cockpit-pilot (`docs/PILOT_COCKPIT_WORKSPACE.md`).
> Hoort via canon hoofdstuk 17 in `ftrprf-labs/ftrlabs-docs` te landen, nooit in een product.

Opgesteld: 2026-08-18 · Canon gelezen @ `139ea06`, tokens 1.0.0, checksum `04d6b40907f2bbda`

**Uitkomst vooraf: één amendement, niet twee.** Voorstel 1 is nodig. Voorstel 2 blijkt geen
canonprobleem maar een implementatiefout, en dat is met een meting aangetoond.

---

## Voorstel 1 · `border.semantic` machineleesbaar maken

### Huidige canon

Hoofdstuk 6, Hairlines, is al normatief en volledig:

> `border.hairline` koper op 18 procent · `border.defined` koper op 34 procent ·
> `border.semantic` **de statuskleur op 35 procent**. Nooit neutraal grijs.

Hoofdstuk 3.3 legt de vijf statuskleuren per lichtregime vast en doorgerekend. Hoofdstuk 10 zegt
dat kleur de ernst ondersteunt en dat de vorm de soort draagt, met een pil in een dichte context.

De regel bestaat dus. Er ontbreekt niets aan het besluit.

### Waargenomen probleem

Het gegenereerde tokenbestand kent alleen `--border-hairline` en `--border-defined`.
`border.semantic` heeft geen machineleesbare vorm, terwijl het de enige hairline is die per
statuskleur verschilt. Gevolg in de pilot: de zes statusbadges in `workspace.html` konden niet
mee, houden hun oude handgekozen achtergronden (`#2b3a4a`, `#3a2430`, `#20262f` en drie andere),
en zijn nu de enige koude vlakken in een warme kamer. Het scherm is op dat punt minder samenhangend
dan vóór de harmonisatie.

Bovendien is "de statuskleur" niet eenduidig te lezen zonder de vijf rollen expliciet te noemen, en
staat nergens dat 35 procent een alfawaarde is en niet een menging met de ondergrond.

### Minimaal amendement

Puur afgeleid. Geen nieuwe kleur, geen nieuwe vorm, geen nieuwe visuele taal. Twee dingen:

**1a. Eén verduidelijkende zin in hoofdstuk 6**, direct achter de bestaande regel:

> `border.semantic` is de betreffende `semantic.*`-kleur van het actieve lichtregime, als alfawaarde
> van 35 procent, net als `border.hairline` en `border.defined` alfawaarden van koper zijn.

**1b. Tien tokens in de generator**, één per semantische rol per regime, mechanisch afgeleid uit de
al vastgestelde waarden van hoofdstuk 3.3:

```css
/* nacht en werklicht */
--border-semantic-signal:    rgba(200,137,74,.35);   /* #c8894a */
--border-semantic-emerging:  rgba(138,121,224,.35);  /* #8a79e0 */
--border-semantic-confirmed: rgba(31,148,112,.35);   /* #1f9470 */
--border-semantic-uncertain: rgba(139,131,119,.35);  /* #8b8377 */
--border-semantic-broken:    rgba(229,103,79,.35);   /* #e5674f */

/* dag */
--border-semantic-signal:    rgba(146,88,38,.35);    /* #925826 */
--border-semantic-emerging:  rgba(95,79,176,.35);    /* #5f4fb0 */
--border-semantic-confirmed: rgba(9,113,89,.35);     /* #097159 */
--border-semantic-uncertain: rgba(107,97,82,.35);    /* #6b6152 */
--border-semantic-broken:    rgba(163,52,34,.35);    /* #a33422 */
```

Er is niets gekozen. Elke waarde volgt uit hoofdstuk 3.3 plus het getal 35 uit hoofdstuk 6.

### Eén observatie die geen onderdeel van het amendement is

`border-semantic-signal` wordt `rgba(200,137,74,.35)`. `border-defined` is `rgba(200,137,74,.34)`.
Dat is **één procentpunt verschil en visueel niet te onderscheiden**. Twee lezingen:

* 35 is bewust: dezelfde familie, andere bron, en dat koper en koper samenvallen is logisch.
* 35 is een verschrijving voor 34.

Ik los dit niet op. Als het bewust is, verandert er niets. Als het een verschrijving is, is de
eenvoudigste uitkomst dat `border-semantic-signal` gewoon naar `border-defined` verwijst. Dit is
een vraag aan de eigenaar, geen voorstel.

### Wat dit níet regelt

De pil zelf. Hoofdstuk 10 zegt "pil in een dichte context", hoofdstuk 12 beschrijft de secundaire
knop als "transparant, één hairline, dezelfde pil". Daaruit is een statuspil af te leiden als
transparant vlak, `border.semantic` als hairline, en de semantische kleur als tekst. Dat is een
**lezing van bestaande canon**, geen amendement, en ik voer hem niet zelfstandig door. Bevestig de
lezing, of leg de pil expliciet vast; in beide gevallen is er geen nieuwe taal nodig.

Contrast is geen bezwaar: alle vijf de semantische kleuren halen volgens hoofdstuk 3.3 minstens
4,92:1 op paneel `ink.800`, dus semantische tekst op een transparante pil haalt AA.

### Gevolgen

| | |
|---|---|
| **Tokenbestand** | +10 tokens. Checksum wijzigt, dus versie naar 1.0.1 |
| **Website** | Geen visueel gevolg. Gebruikt vandaag geen statuspillen |
| **Lens** | Geen gevolg |
| **Mijn Maculis** | Geen gevolg vandaag. De dagwaarden worden alvast correct meegeleverd |
| **Cockpit** | Deblokkeert de zes badges in `workspace.html`, de badges in `comm.html`, en de attentiestaten in de Attention Cockpit. Dat laatste is het scherm dat Lud dagelijks gebruikt |
| **Vendoring** | Alle drie de producten moeten het bestand opnieuw vendoren zodra ze het dragen. Vandaag draagt alleen de Cockpit het |
| **Onze eigen poort** | `tools/check-tokens.mjs` pint de checksum en zal falen tot hij is bijgewerkt. Dat is de bedoelde werking, niet een storing |

### Regressierisico

**Laag voor de canon, nul voor de andere kamers.** Het amendement voegt alleen toe: geen bestaande
waarde verandert, geen bestaande regel wordt geherformuleerd.

Het risico zit in de toepassing, niet in het amendement. Zes badges hercoloreren is een zichtbare
wijziging op een productiescherm en hoort een eigen verwachte-diff en een eigen poort te krijgen.
Aandachtspunt: `semantic.uncertain` is bewust kleurloos, dus een "onzeker"-badge krijgt een
neutrale rand die nauwelijks van `border.hairline` verschilt. Dat is canon-conform en bedoeld, maar
het moet niet als een renderfout worden gelezen.

---

## Voorstel 2 · De Newsreader-bevinding. Ingetrokken na meting.

### Huidige canon

Hoofdstuk 4.2: **Uitspraak** is serif, gewicht 300, tracking -0.017em. **Functie** is
**sans, regular**, voor bodycopy, tabelinhoud, formulier en metadata.
Hoofdstuk 4.3 geeft de Cockpit één toegestane afwijking, vaste pixels in plaats van `clamp()`,
"omdat vloeiende typografie in een dichte tabel kolombreedtes onvoorspelbaar maakt".

### Waargenomen probleem

In het pilotrapport meldde ik dit als spanning binnen de canon: de organisatienaam op serif 300
verliest het optisch van de contactnaam eronder, waardoor de persoon de kop van de kamer domineert.

### Wat de meting laat zien

Vier varianten van dezelfde rail, gerenderd zonder één productbestand aan te raken
(`tools/visual/hierarchie-varianten.png`):

| Variant | Organisatie | Contactnaam | Uitkomst |
|---|---|---|---|
| **V0** pilot | serif 300 | sans **600** | hiërarchie omgekeerd |
| **V1** | serif 300 | sans **regular** | **hiërarchie hersteld** |
| **V2** | serif **400** | sans 600 | onvoldoende, de vette naam blijft concurreren |
| **V3** | serif 400 | sans regular | hersteld, maar met een canonwijziging erbij |

**V1 lost het volledig op en verandert niets aan de canon.**

De oorzaak is dat `.person .name` op `font-weight:600` staat. Een contactnaam in de relatierail is
metadata: rol **Functie**, en die is volgens hoofdstuk 4.2 **sans, regular**. Gewicht 600 is de
Aanwijzing-rol, en die is voorbehouden aan eyebrows, labels, kolomkoppen en kanalen. De 600 dateert
van vóór de canon en is nooit uit een regel afgeleid.

**Mijn conclusie in het pilotrapport was verkeerd.** Dit is geen spanning tussen twee canonregels
maar een implementatie die één van beide niet volgt. De canon is hier intern consistent.

### Wat een amendement zou zijn geweest, en waarom niet

De opdracht vroeg beide routes te onderscheiden. Beide zijn onderzocht en beide vallen af:

**Route A, de serif-regel algemeen wijzigen** (Uitspraak naar gewicht 400 of een bereik).
Raakt de Website-hero op 6,75rem, de statements in de Lens, de leidende `insight` in Mijn Maculis,
en elke toekomstige kamer. Doorslaggevend bezwaar: **de Visual North Star staat vast op gewicht 300
en is het ijkpunt.** Een algemene wijziging maakt het ijkpunt zelf non-conform. Dat is een zware
prijs voor een probleem dat in één kamer is waargenomen en daar een andere oorzaak heeft.

**Route B, een contextuele regel voor dichte functionele interfaces**, bijvoorbeeld de bestaande
uitzondering in 4.3 verbreden van maatvoering naar optisch gewicht. Verdedigbaar: het
dichtheidsargument dat vaste pixels rechtvaardigt, rechtvaardigt in beginsel ook een gewichtsstap.
Maar 4.3 zegt uitdrukkelijk "dit is de **enige** toegestane afwijking", dus verbreden is een echte
systeemwijziging. En V2 laat zien dat de route het probleem **niet eens oplost** zolang de
contactnaam op 600 blijft. Een systeemwijziging die de waarneming niet wegneemt, is de verkeerde
ingreep.

### Aanbeveling

**Geen amendement.** Corrigeer `.person .name` naar sans regular tijdens de Cockpit-harmonisatie,
als canon-conformiteitsfix, niet als ontwerpkeuze. Nul gevolgen voor de canon, het tokenbestand of
een andere kamer.

### Wanneer deze vraag terug moet komen

Route B blijft legitiem, maar pas op ander bewijs. Heropen hem alleen als serif 300 ook faalt
wanneer de omgeving wél canon-conform is. Twee plekken om dat te toetsen tijdens de
Cockpit-harmonisatie:

* `.aipanel .sum`, serif 300 op 14,5px. In de pilot goed leesbaar, maar dat is één paneel.
* Testerbeheer, de dichtste omgeving van alle vier de kamers, met tabelrijen en de Attention Cockpit.

Blijkt serif 300 daar structureel te zwak in een canon-conforme omgeving, dan is er een echt
dichtheidsargument en is route B de juiste, met 4.3 als natuurlijke plek.

### Gevolgen en regressierisico

Geen. Er wijzigt niets aan de canon en niets aan het tokenbestand. De implementatiecorrectie is één
declaratie in `workspace.html`, valt binnen de reeds geplande Cockpit-harmonisatie, en krijgt daar
een verwachte diff.

---

## Samenvatting

| | Voorstel 1 · `border.semantic` | Voorstel 2 · Newsreader-gewicht |
|---|---|---|
| **Amendement nodig** | **Ja** | **Nee, ingetrokken** |
| **Aard** | Verduidelijking plus tien afgeleide tokens | Implementatiefout, geen canonprobleem |
| **Nieuwe visuele taal** | Geen | Geen |
| **Tokenbestand** | +10 tokens, versie 1.0.1, nieuwe checksum | Ongewijzigd |
| **Andere kamers** | Geen visueel gevolg; dagwaarden alvast correct | Geen |
| **Deblokkeert** | C-2, en daarmee de badges in beide Cockpit-schermen en de Attention Cockpit | Niets |
| **Regressierisico amendement** | Laag, uitsluitend additief | Nul |
| **Openstaande vraag** | Is de 35 procent bewust, of een verschrijving voor 34? | Geen |

**Aanbeveling:** neem voorstel 1 aan, samen met het antwoord op de 35-procentvraag, en verwerk de
`.person .name`-correctie als gewone conformiteitsfix in de Cockpit-harmonisatie.

Daarmee resteert **C-1, werklicht**, als enige blokkerende canonzijdige aanvulling voor de Cockpit.
