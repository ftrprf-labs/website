# Maculis Harmonisatieplan Visual DNA v1.0

> **Status: ANALYSE. Geen productcode gewijzigd. Geen deploy. Geen restyling.**
> Dit document legt vast wat er moet gebeuren, in welke volgorde, met welk risico.
> Implementatie start pas na expliciet akkoord van Lud.

Opgesteld: 2026-08-17
Onderzochte repositories: `ftrprf-labs/website` (volledige historie), `ftrprf-labs/maculis-first-five.` (main @ 7a03c6d)

---

## 0. Blokkerende bevinding vooraf: de canon ontbreekt in de code-omgeving

De opdracht noemt `MACULIS_VISUAL_DNA_V1.0.md` en de definitieve Visual North Star als bron van
waarheid. **Beide documenten bestaan niet in de omgeving waar ik bij kan.** Ik heb gezocht in:

| Bron | Resultaat |
|---|---|
| `ftrprf-labs/website`, alle branches, volledige git-historie (`--diff-filter=A` over alle commits) | niet aanwezig |
| `ftrprf-labs/maculis-first-five.`, main plus GitHub code search over de hele repo | niet aanwezig |
| Alle 18 branches van `maculis-first-five.` | geen enkele naam die erop lijkt |
| Google Drive (`fullText contains 'Maculis'`, `title contains 'VISUAL DNA'`, `'North Star'`) | 0 resultaten |
| `www.maculis.nl` live ophalen | geblokkeerd door de netwerkproxy van deze sessie |

Wat ik dus **wel** kan onderbouwen: de volledige feitelijke toestand van alle bestaande visuele
oppervlakken, hun onderlinge strijdigheden, en een technische fundering die klaarstaat om de canon
te dragen. Wat ik **niet** kan: uitspreken of een specifieke waarde afwijkt van de canon, want ik
ken de canonieke waarde niet.

Daarom is de delta-matrix in §2 opgesplitst in twee kolommen:

* **Canon-A (bewijsbaar):** het blok dat in de Journey letterlijk `MACULIS DESIGN SYSTEM V1` heet
  en al als tokenlaag is opgezet. Dit is de enige geschreven, in code aanwezige ontwerpbeslissing.
* **Canon-B (uit jouw briefing, ongeverifieerd):** de dertien dimensies die je noemt. Voor drie
  daarvan geldt iets dat je moet weten voordat je verder plant, zie §0.1.

### 0.1 Drie punten uit je briefing die in geen enkele kamer bestaan

Dit zijn geen afwijkingen die je kunt harmoniseren. Dit is nieuw ontwerp dat de canon blijkbaar
introduceert. Ik los ze niet zelf op en ik verzin er geen invulling bij. Ik meld ze:

1. **Newsreader.** Er wordt nergens een webfont geladen. Geen `@font-face`, geen
   `fonts.googleapis`, geen `fonts.gstatic`. Alle vier de oppervlakken gebruiken dezelfde
   systeem-serif-stack: `"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`.
   Op macOS/iOS rendert dat als Iowan Old Style, op Windows als Palatino Linotype, op Android als
   Georgia. De "Newsreader / sans-verdeling" uit de canon is dus niet een verdeling die scheef staat.
   Het is een lettertype dat nog nergens is geïntroduceerd, plus een bestaande verdeling die op drie
   besturingssystemen al drie verschillende gezichten heeft.

2. **Violet.** Koper is aanwezig en consistent: `#c8894a` (`--amber` / `--primary`), aangevuld met
   goud `#d7b36a`. Violet komt nergens voor. Het dichtstbijzijnde is `--priv:#8a3a63`, een pruim/
   magenta die uitsluitend de Privacy-inbox en de attentiestaat `unknown_contact` markeert, plus
   `#e79fc4` als bijbehorende tekstkleur. Dat is een functionele statuskleur, geen merkkleur. Als de
   canon violet als tweede merkkleur invoert, botst dat semantisch met `--priv`: dezelfde kleurfamilie
   zou dan tegelijk "merk" en "privacy-context" betekenen. **Dit is een aantoonbare inconsistentie
   tussen canon en implementatie die ik niet zelfstandig oplos.**

3. **Dag-/nachtregime.** Er is geen lichtmodus. Nergens `prefers-color-scheme`, nergens `data-theme`.
   Testerbeheer declareert hard `color-scheme: dark`. De Journey declareert helemaal niets, waardoor
   native formuliercontrols en scrollbars daar in de lichte systeemstijl renderen boven een
   bijna-zwarte achtergrond. Een dagregime is dus geen harmonisatie maar een nieuwe laag, en de
   Journey heeft daarnaast vandaag al een echte bug op dit punt.

---

## 1. Executive summary: hoe groot is dit werkelijk?

**Kort: de esthetiek is al één familie. De techniek deelt niets. En één van de vier kamers staat
kleurtechnisch buiten de familie.**

Vier feiten die de omvang bepalen:

**1. Er is nul gedeelde code.** Vier oppervlakken, vier volledig losse stylesheets, geen enkele
gedeelde regel, geen build-stap, geen import, geen package. Ongeveer 2.600 CSS-declaraties in totaal:

| Oppervlak | Bestand | Declaraties | Tokenlaag |
|---|---|---:|---|
| Journey (Lens + Mijn Maculis) | `maculis-first-five./public/index.html` inline | ~1.204 | volwaardig, DS V1 |
| Testerbeheer + Attention Cockpit | `website/public/styles.css` | ~922 | eigen, andere namen |
| Inbox | `website/public/comm.html` inline | ~195 | eigen, koude palet |
| Relatie-workspace | `website/public/workspace.html` inline | ~293 | eigen, koude palet |

Drie van de vier zitten inline in HTML. Er is dus letterlijk geen plek waar je vandaag een token kunt
wijzigen die op meer dan één kamer effect heeft.

**2. Toch is het merk grotendeels intact.** `#ece2d4` als inkt, `#c8894a` als koper en `#d7b36a` als
goud komen in alle vier terug. De warme bijna-zwarte grond `#080503` staat in drie van de vier. Dit
is geen herontwerp. Dit is een consolidatie.

**3. Eén echte breuk: de Inbox en de Relatie-workspace staan op een koude grond.** Zij gebruiken
`--bg:#0b0c0f`, `--panel:#14161b`, `--line:#2a2e39`. Dat zijn blauwgrijzen, geen warme bruinen.
Naast Testerbeheer (`#080503` / `#140e08` / `rgba(200,137,74,.18)`) is dat direct zichtbaar: je klikt
in Testerbeheer op "Naar Inbox" en de temperatuur van het hele scherm kantelt. Dit is de enige
afwijking in het hele systeem die een gebruiker onbewust registreert als "andere applicatie". Het is
ook meteen de goedkoopste winst: het is één `:root`-blok per bestand.

**4. De tokenlaag die je nodig hebt bestaat al, maar op de verkeerde plek.** De Journey bevat een
compleet, doordacht en van commentaar voorzien blok dat zichzelf `MACULIS DESIGN SYSTEM V1` noemt:
spacingschaal `--s-1` t/m `--s-7`, radii `--r-sm/md/lg/pill`, typeschaal `--t-hero/statement/question/
body/label/fine`, glow-presets `--glow-sm/md/lg`, en de klassen `.btn-primary`, `.btn-secondary`,
`.btn-link`, `.orb`. Dat is precies de fundering die §4 nodig heeft. Ze staat alleen begraven in een
inline `<style>` in één HTML-bestand in de andere repository.

**Omvang, eerlijk ingeschat.** De harmonisatie zelf is middelgroot en goed te faseren: een canonieke
tokenlaag optillen, vier `:root`-blokken erop aansluiten, de koude kamers omzetten, en de echte
technische schuld (§3) opruimen. Dat is beheersbaar en grotendeels laag-risico.

Wat de omvang onzeker maakt zijn de drie punten uit §0.1. Newsreader invoeren raakt élke tekstregel
in alle vier de kamers. Een dagregime invoeren verdubbelt de kleurmatrix. Violet invoeren vraagt een
semantische beslissing over `--priv`. Die drie samen zijn groter dan de rest van de harmonisatie bij
elkaar, en ze zijn geen van drieën te plannen zonder de canon.

---

## 1.1 Kamerindeling: wat ik heb aangetroffen, en waar ik jouw bevestiging nodig heb

De namen Website, Lens, Mijn Maculis en Cockpit komen als zodanig **niet in de code voor**. Ik heb
gemapt op functie. Zo ligt het er feitelijk bij:

| Jouw kamer | Wat ik heb gevonden | Zekerheid |
|---|---|---|
| **Lens** | `maculis-first-five./public/index.html`, stages `encounter → ask → looking → outcome`, plus First Impression, Story of the Site, Technical Signals | hoog |
| **Mijn Maculis** | Dezelfde HTML: `stage-welcome`, de `.personal`-variant van ASK, `recognition`, `continuation`, `account`, evaluatie, Pass the Lens, closing | middel, zie hieronder |
| **Cockpit** | `website/`: Testerbeheer (`index.html` + `styles.css`), Attention Cockpit (`.cockpit` in `styles.css`), Inbox (`comm.html`), Relatie-workspace (`workspace.html`) | hoog |
| **Website** | **Niet gevonden.** Zie hieronder. | laag |

**Over Mijn Maculis.** Lens en Mijn Maculis zitten vandaag in één bestand en delen één stagesysteem.
Ze zijn functioneel wél twee kamers: de ene is "kijk naar deze site", de andere is "dit is jouw
verhaal, jouw evaluatie, jouw doorgeven". Als de canon ze als aparte kamers behandelt, is de eerste
technische consequentie dat dit bestand van 2.535 regels gesplitst moet worden. Dat is een aparte,
grotere beslissing dan harmonisatie en ik heb hem niet in het migratieplan opgenomen zonder jouw
akkoord.

**Over Website.** `MACULIS_HOST` staat in `.env.example` op `https://www.maculis.nl`, maar in
`render.yaml` op `https://maculis-first-five.onrender.com`. De Journey draagt bovendien
`<meta name="robots" content="noindex, nofollow">` en beschrijft zichzelf als "Private, invite-based
Journey". Een publieke marketingsite gedraagt zich niet zo. Twee lezingen zijn mogelijk:

* (a) `www.maculis.nl` is een aparte publieke site in een codebase waar deze sessie geen toegang toe
  heeft. Dan ontbreekt kamer 1 volledig in deze analyse.
* (b) `www.maculis.nl` wijst naar de First Five-service, en "Website" betekent het generieke pad
  (`#stage-ask` waar je zelf een URL typt) tegenover het persoonlijke `?p=`-pad. Dan is Website géén
  aparte codebase maar een aparte route door dezelfde kamer.

Ik heb het niet kunnen vaststellen: de egressproxy blokkeert `www.maculis.nl`, en de Render-integratie
vraagt een workspace-keuze die ik niet zelfstandig hoor te maken. **Dit is open beslissing O-2 in §9.**

---

## 2. Delta-matrix: canon × vier kamers

Legenda: **✓** conform · **≈** dichtbij, andere waarde of naam · **✗** strijdig · **∅** afwezig ·
**?** canon onbekend

| Dimensie | Canon-A (DS V1, in code) | Lens | Mijn Maculis | Cockpit / Testerbeheer | Cockpit / Inbox + Workspace | Canon-B (jouw briefing) |
|---|---|---|---|---|---|---|
| **Grond** | `--bg:#080503` warm | ✓ | ✓ | ≈ `#080503`, maar `--surface:#140e08` vs `--panel:#14120f` | ✗ `#0b0c0f` koud blauwgrijs | ? |
| **Inkt** | `--ink:#ece2d4` | ✓ | ✓ | ≈ heet `--text` | ≈ heet `--ink`, zelfde waarde | ? |
| **Koper** | `--amber:#c8894a` | ✓ | ✓ | ≈ heet `--primary` | ✓ heet `--amber` | ? |
| **Violet** | ∅ | ∅ | ∅ | ∅ | ≈ `--priv:#8a3a63` als privacy-status, niet als merk | **nieuw, botst met `--priv`** |
| **Goud als licht** | `--gold:#d7b36a`, `--gold-light:#f3e387`, schaars | ✓ | ✓ | ≈ geen `--gold`; goudrol wordt door `--primary` gespeeld | ≈ `--gold` + `--goldsoft:#e8cf97`, extra token | ? |
| **Serif** | Iowan/Palatino/Georgia-stack | ✓ | ✓ | ✓ zelfde stack, 6 gebruiksplekken | ✗ geen serif, ook niet in het wordmerk | **Newsreader, nergens geladen** |
| **Sans** | `--sans` met Inter in de stack | ✓ | ✓ | ✗ andere stack (Roboto i.p.v. Inter) | ✗ derde stack (Roboto + system-ui) | ? |
| **Typeschaal** | `--t-hero/statement/question/body/label/fine`, clamp() | ≈ tokens bestaan, veel componenten gebruiken nog eigen clamp() | ≈ idem | ✗ geen schaal, vaste px van 10 t/m 24 | ✗ geen schaal, vaste px van 10 t/m 22 | ? |
| **Spacing** | `--s-1..--s-7` (4/8/12/16/24/40/64) | ≈ tokens bestaan, deels gebruikt | ≈ idem | ✗ geen schaal, ad-hoc px | ✗ geen schaal, ad-hoc px | ? |
| **Radii** | `--r-sm:10 --r-md:16 --r-lg:20 --r-pill:999` | ≈ 6× token, daarnaast 999px/16px/8px/6px/4px los | ≈ idem | ✗ `--radius:10px`, maar 13× hard `8px` ernaast | ✗ alleen `--r:12px` in workspace; 999px/12/10/8 hard | ? |
| **Licht/gloed** | `--glow-sm/md/lg` op goud | ✓ rijk: orb, fi-dot, story-rand, glow-CTA | ✓ | ≈ één zachte radial in `.cockpit`, verder geen gloed | ∅ geen enkele gloed | ? |
| **Signaalveld** | grain + vignette overlays, orb, lichtpunt | ✓ volledig | ✓ volledig | ∅ afwezig | ∅ afwezig | ? |
| **Motion: easing** | `--ease: cubic-bezier(.22,.61,.36,1)` | ✓ | ✓ | ✗ `cubic-bezier(0.22, 1, 0.36, 1)`, ándere curve | ∅ geen easing, alleen default | ? |
| **Motion: duur** | `--slow:1200ms`, beats van 0.3s tot 2.6s | ✓ cinematisch | ✓ | ≈ 0.05s tot 0.34s, functioneel snel | ≈ alleen 0.2s op de toast | ? |
| **Interactieve states** | `.btn-primary/.btn-secondary/.btn-link`, `:focus-visible` | ≈ DS-klassen bestaan maar vervangen `.rec-btn`/`.link` niet | ≈ idem | ≈ eigen `.btn`-familie, `:focus-visible` aanwezig | ✗ eigen `.btn`, `:hover` only, **geen `:focus-visible`** | ? |
| **Reduced motion** | volledig `@media (prefers-reduced-motion:reduce)` | ✓ 4 blokken, dekkend | ✓ | ≈ 1 blok, omgekeerd geformuleerd (`no-preference`), dekt alleen de cockpit | ✗ **0 blokken** | ? |
| **Responsive** | 440px / 640px | ✓ | ✓ | ✗ 760px | ✗ 860px (Inbox) en 900px (Workspace) | ? |
| **Dag/nacht** | alleen nacht | nacht, **geen `color-scheme`** | idem | nacht, `color-scheme: dark` | nacht, geen `color-scheme` | **dagregime is nieuw** |

**Vijf breekpunten springen eruit:**

1. Inbox en Workspace staan op een koude grond. Enige echte kleurbreuk in het systeem.
2. Vijf breekpunten in responsive: 440, 640, 760, 860, 900. Geen twee kamers delen er één.
3. Vier verschillende sans-stacks, waaronder de e-mailhandtekening (§3.5). Vier gerenderde gezichten.
4. Twee easingcurves die op één cijfer na identiek zijn: `.22,.61,.36,1` tegenover `0.22, 1, 0.36, 1`.
   Bijna zeker een overtypfout, geen ontwerpkeuze.
5. Inbox en Workspace hebben geen `prefers-reduced-motion` en geen `:focus-visible`.

---

## 3. Per-kamer analyse

Per kamer: **A** wat klopt en moet blijven · **B** wat afwijkt · **C** waarom · **D** wat er technisch
moet veranderen.

### 3.1 Lens (`maculis-first-five./public/index.html`, regels 15 t/m 605)

**A. Wat klopt en moet blijven.**
Dit is de rijkste en meest consistente kamer, en de facto de bron van het merk. Behouden:
de warme radial grond `radial-gradient(120% 90% at 22% 42%, #17100a, #0c0805 46%, var(--bg))`;
grain plus vignette als signaalveld; het stagesysteem met `opacity`/`transform` over `--slow`;
goud als licht en niet als vlak; het lichtpunt (`.fi-dot`, `.orb`, `.story-sig-dot`) als terugkerend
motief; de `tsSharpen`-beweging van onscherp naar scherp bij Technical Signals; de volledige
reduced-motion-dekking; en het complete DS V1-tokenblok.

**B. Wat afwijkt.**
* *Tokens bestaan maar worden niet consequent gebruikt.* `rgba(215,179,106, …)` komt **39 keer** voor
  als letterlijke waarde in plaats van via `--gold`. Verreweg de grootste tokenschuld in het systeem.
* *Radii deels los:* `999px` 3×, `16px`, `8px`, `6px`, `4px` naast de `--r-*`-tokens.
* *DS V1-knopklassen zijn zaad gebleven.* `.btn-primary`/`.btn-secondary`/`.btn-link` staan er, maar
  het commentaar zegt expliciet dat ze `.rec-btn`/`.link` niet vervangen. Er zijn nu twee parallelle
  knopstelsels met verschillende hover-, focus- en radiusregels.
* *Geen `color-scheme: dark`.* Native `<textarea>`, `<input>` en scrollbars renderen in de lichte
  systeemstijl. Echte bug, zichtbaar op `.ctx-field textarea` en `.ptl-input`.
* *Geen `:focus-visible`* op `.rec-btn`, `.link`, `.fe-pick`. Alleen de DS V1-klassen hebben het.
* *Root-`index.html` (1.105 regels) is dood.* De `Dockerfile` kopieert alleen `src` en `public`. Het
  is een oudere kopie van de Journey met een verouderd tokenblok. Wie daarin harmoniseert, harmoniseert
  niets.

**C. Waarom.**
Punt 1 t/m 3 is technische schuld met een duidelijke oorsprong: DS V1 is **additief** ingevoerd, met
de bewuste keuze "waarden identiek aan de huidige componenten, dus migratie zonder visuele wijziging".
Dat was verstandig. De tweede helft, het daadwerkelijk laten aflossen van de oude waarden, is nooit
gebeurd. Punt 4 en 5 zijn omissies. Punt 6 is dode code.

**D. Technisch.**
1. `rgba(215,179,106,x)` → `color-mix(in srgb, var(--gold) …)` of aanvullende `--gold-a{12,25,40,60}`
   tokens. 39 vervangingen, puur mechanisch, byte-identieke rendering te verifiëren.
2. Losse radii → `--r-*`.
3. `.rec-btn`/`.link` intrekken tot alias van `.btn-secondary`/`.btn-link`, of andersom. Eén stelsel.
4. `color-scheme: dark` op `:root`.
5. `:focus-visible` op alle interactieve elementen.
6. Root-`index.html` verwijderen of expliciet markeren als bevroren snapshot.

### 3.2 Mijn Maculis (zelfde bestand, `stage-welcome`/`recognition`/`continuation`/`account`/evaluatie/PTL/closing)

**A. Wat klopt.**
De meest voldragen momenten van het hele merk zitten hier: `.eval-intro` met de ademende orb,
`.closing` waarin video 05 op zwart eindigt en dat zwart de uitnodiging draagt, en de Pass the
Lens-beat als een vraag met een schaars formulier in plaats van een leadgenerator. De hiërarchie
serif-hero → cursieve duiding → één gouden CTA is hier het scherpst uitgewerkt. Dit is de referentie
waar de andere kamers naartoe moeten bewegen, niet omgekeerd.

**B. Wat afwijkt.**
* *Erft alle Lens-schuld* (39 gouden literals, dubbele knopstelsels, geen `color-scheme`).
* *De primaire CTA is drie keer los gedefinieerd.* Exact dezelfde
  `linear-gradient(180deg,#efd7a0 0%,var(--gold) 58%,#b0894a 100%)` plus `--glow-md` staat in
  `.ask-wrap.personal .ask-cta`, in `.eval-yes`, én in `.btn-primary`. Drie kopieën van één knop.
* *`.ptl-input` gebruikt `rgba(236,226,212,.35)` waar `--ink-*` bestaat.*
* *Geen kamer-eigen ruimtelijk kenmerk in tokens.* Het verschil met Lens (top-verankerd en scrollbaar
  in plaats van gecentreerd) leeft in een selectorlijst
  `#stage-recognition,#stage-continuation,#stage-account`, niet in een benoemde kamerlaag. Als
  Mijn Maculis een eigen kamer wordt, is dit het eerste dat een naam nodig heeft.

**C. Waarom.**
Overwegend organische groei: elk nieuw moment kreeg zijn eigen CTA-definitie omdat er nog geen
gedeelde was, en toen die er kwam (`.btn-primary`) zijn de bestaande niet teruggetrokken. Het
ontbreken van een kamerlaag is geen schuld maar een architectuurgat dat pas ontstaat op het moment
dat je Mijn Maculis als aparte kamer benoemt.

**D. Technisch.**
1. `.ask-wrap.personal .ask-cta` en `.eval-yes` reduceren tot `.btn-primary` plus hoogstens een
   maatvariant. Verwijdert twee van de drie gradiëntkopieën.
2. `.ptl-input` op `--ink-faint`/`--line`.
3. Bij splitsing: de selectorlijst vervangen door één kamerklasse, bijvoorbeeld
   `[data-room="mijn-maculis"]`, die de verankering en de scrollregels draagt.

### 3.3 Cockpit A: Testerbeheer + Attention Cockpit (`website/public/styles.css`, 713 regels)

**A. Wat klopt.**
Deze kamer is opvallend goed doordacht en de kop van `styles.css` legt de intentie expliciet vast:
"Warm, dark, restrained. Clearly the admin environment behind Maculis, but still a fast, scannable,
functional tool. Not a copy of the journey." Dat is precies het principe "één DNA is niet één
interface", en het staat er al. Behouden: de warme grond en amber hairlines die aantoonbaar van
de Journey zijn afgeleid (het commentaar noemt de bronwaarden erbij); serif uitsluitend als
merk-accent op zes plekken (wordmerk, `.cockpit-h1`, `.zero-text b`, `.eval-sub`, `.history-sub`,
`.empty-state strong`); goud dat alleen leidt waar het het meest betekent, letterlijk zo
becommentarieerd bij `.hero-eyebrow`; de ontworpen zero-state; de tabel die op mobiel netjes naar
kaarten degradeert; en `:focus-visible` met een echte focusring op `.attn-card` en `.row-attn`.

**B. Wat afwijkt.**
* *Andere tokennamen voor dezelfde begrippen:* `--text`/`--primary`/`--muted`/`--surface`/`--border`
  tegenover `--ink`/`--amber`/`--ink-dim`/`--panel`/`--line`.
* *Andere sans-stack:* Roboto in plaats van Inter.
* *Geen typeschaal en geen spacingschaal.* Vaste px-waarden van 10 tot 24, ad-hoc padding.
* *`--radius:10px` bestaat, maar `8px` staat er 13 keer hard naast.*
* *`--gold` bestaat niet.* De gouden lichtrol wordt door `--primary` (koper) gespeeld. Daarmee valt
  in deze kamer het canonieke onderscheid koper/goud weg.
* *Andere easingcurve:* `cubic-bezier(0.22, 1, 0.36, 1)` tegenover `.22,.61,.36,1`.
* *Reduced motion omgekeerd geformuleerd.* Er staat `@media (prefers-reduced-motion: no-preference)`
  om `attn-rise` aan te zetten. Functioneel correct en zelfs elegant, maar het is het spiegelbeeld
  van het `reduce`-patroon in de Journey. Twee patronen voor één regel.
* **Echte bug.** Regels 204 t/m 206 en 211: `var(--ink, #ece2d4)`, `var(--amber, #c8894a)`,
  `var(--dim, #9aa0ac)`. Die drie tokens bestaan niet in dit bestand. Ze vallen dus **altijd** terug
  op de hardgecodeerde literals. `.link-name`, `.link-name.link-dim` en `.ptl-tag` staan daarmee
  buiten de tokenlaag, en `#9aa0ac` is bovendien de kóúde grijstint uit de Inbox, niet de warme
  `--muted:#a89a86` van deze kamer. Het is één kopieerslip die de koude waarde de warme kamer
  binnenhaalt.
* *`.cockpit` heeft geen signaalveld,* alleen één zachte radial in de hoek.

**C. Waarom.**
De meeste punten zijn **bewuste, te respecteren functionele differentiatie**: een admin-tool hoort
sneller, dichter en zakelijker te zijn dan een journey, en 0.12s-transitions horen daarbij. Dat is
géén afwijking om weg te harmoniseren.

De tokennamen zijn een **lokale uitzondering die technische schuld is geworden**: op het moment van
schrijven bestond DS V1 nog niet als deelbaar artefact, dus is er een parallelle naamgeving ontstaan.

De ontbrekende `--gold`, de easing-slip en de undefined-token-bug zijn **technische schuld en fouten**.
De undefined-token-bug is de enige plek in het hele systeem waar een koude waarde ongemerkt een warme
kamer is binnengelekt.

**D. Technisch.**
1. `:root` in `styles.css` wordt een dunne alias-laag op de canonieke tokens:
   `--text: var(--mc-ink)`, `--primary: var(--mc-copper)`, enzovoort. Nul visuele wijziging bij
   gelijke waarden, en vanaf dat moment volgt deze kamer de canon automatisch.
2. `--ink`/`--amber`/`--dim` op regels 204 t/m 206 en 211 vervangen door de bestaande, correcte
   tokens `--text`/`--primary`/`--muted`. Let op: `--muted:#a89a86` is warm, `#9aa0ac` is koud. Dit is
   een **zichtbare** kleurcorrectie op `.link-name.link-dim`, geen no-op. Apart landen en apart
   verifiëren.
3. `--gold` introduceren en de plekken waar goud bedoeld is (`.hero-eyebrow`, `.zero-mark`) daarop
   zetten. **Zichtbare wijziging.** Vraagt jouw akkoord, zie O-4.
4. Easing uit de canon halen via `--mc-ease`.
5. 13× `8px` → `--r-sm`.
6. Sans-stack uit de canon.

### 3.4 Cockpit B: Inbox + Relatie-workspace (`comm.html` 195 decls, `workspace.html` 293 decls)

**A. Wat klopt.**
De informatiearchitectuur is goed en moet blijven: de driekolomsopzet van de Inbox (lijst, thread,
context), de linkerrail van de Workspace als relatie-identiteit, de kanaalchips, en het
`.aipanel` met gouden rand dat AI-suggesties duidelijk als voorstel markeert en niet als feit. De
attentie-badges (`.att.new`, `.att.waiting_on_us`, …) zijn semantisch consistent met de
attentiestaten van de Attention Cockpit. Ook goed: beide bestanden zijn onderling nagenoeg identiek
qua taal, dus wat je in de één repareert geldt in de ander.

**B. Wat afwijkt.** Dit is de zwaarste kamer.
* **Koude grond.** `--bg:#0b0c0f`, `--panel:#14161b`, `--panel2:#1b1e25`, `--panel3:#22262f`,
  `--line:#2a2e39`, `--line2:#343a47`, `--dim:#9aa0ac`, `--faint:#6b7280`. Acht blauwgrijze tokens
  waar de rest van Maculis warm bruin is. **Dit is de enige echte strijdigheid met de canon in het
  hele systeem.**
* **Geen serif.** Ook het wordmerk niet: `header .brand` is sans met `letter-spacing:.22em`. In alle
  andere kamers is `MACULIS` serif. Het merkanker ontbreekt hier dus letterlijk.
* **Geen `:focus-visible`, nergens.** Alleen `:hover`. Toetsenbordnavigatie door de Inbox is
  onzichtbaar. Toegankelijkheidsdefect, niet slechts een stijlverschil.
* **Geen `prefers-reduced-motion`.**
* *Geen enkele token uit DS V1.* Geen spacing-, type-, radius- of glowschaal. 29 respectievelijk 33
  unieke hardgecodeerde hex-waarden.
* *`var(--priv,#8a3a63)` in `comm.html`, maar `--priv` is daar niet gedefinieerd.* Zelfde klasse bug
  als in `styles.css`: valt altijd terug op de literal. In `workspace.html` is hij wél gedefinieerd.
* *Twee eigen breekpunten:* 860px en 900px, voor twee bijna identieke layouts.
* *De favicon van beide bestanden gebruikt `#080503`,* de warme grond. Binnen één bestand staan dus
  de warme merkkleur en de koude UI-kleur naast elkaar.

**C. Waarom.**
Dit is **oud ontwerp dat vervangen moet worden**, geen bewuste keuze. Het bewijs staat in de
git-historie: `comm.html` en `workspace.html` ontstonden in `2c76906` en `510d3df` als snelle,
functionele communicatie-UI ("HTTP routes + boot migrations + Communication UI"), in dezelfde periode
waarin de zwaarte op de backend lag: inbound pipeline, identiteit, threading, AI-copilot. Er is
zichtbaar een generiek donker-dashboardpalet gepakt en daar zijn `--amber`/`--gold`/`--ink` bovenop
gelegd. Vandaar de mengvorm: warme merkaccenten op een koude grond.

Het ontbreken van `:focus-visible` en reduced motion is **geen functionele differentiatie maar een
omissie**, want de Attention Cockpit in dezelfde applicatie heeft beide wel.

**D. Technisch.**
1. Beide `:root`-blokken vervangen door de canonieke warme laag. `--bg → #080503`, `--panel → #140e08`,
   `--panel2 → #1d130b`, `--panel3 → #251a10`, `--line → rgba(200,137,74,.18)`,
   `--line2 → rgba(200,137,74,.34)`, `--dim → #a89a86`, `--faint` naar een warme equivalent.
   **Grootste visuele wijziging van het hele plan.** Moet als één atomaire stap landen, want een
   halve conversie geeft warme panelen op een koude grond.
2. `--in:#26333f` (koud blauw, inkomend bericht) en `--out:#2e2a1c` (warm, uitgaand) opnieuw bepalen.
   Het temperatuurverschil tussen in en uit is hier **betekenisdragend** en dat moet blijven. Dit
   vraagt een ontwerpkeuze, zie O-5.
3. `header .brand` serif maken, gelijk aan `.brand-mark` in Testerbeheer.
4. `:focus-visible` toevoegen op `.tab`, `.af`, `.conv`, `.chan`, `.btn`, `.sug .s`, `.list-item`,
   `nav.tabs button`.
5. `@media (prefers-reduced-motion:reduce)` toevoegen.
6. `--priv` definiëren in `comm.html`.
7. Breekpunt 860/900 gelijktrekken naar de canonieke waarde.
8. Radii en spacing op de tokens.

### 3.5 Vijfde oppervlak dat je niet noemde: de e-mailhandtekening

`website/server/comm/signature.mjs` rendert de Living Maculis Signature die uitgaat naar echte
ontvangers. Dit is een **publieksgericht Maculis-oppervlak** en hij staat buiten alle vier de kamers:

* `const GOLD = '#c8894a'` is geen goud maar **koper**. De handtekening noemt de kopertint "gold" en
  gebruikt hem als enige merkkleur. Semantisch onjuist ten opzichte van de canon, waarin koper en
  goud verschillende rollen hebben.
* `const DIM = '#8a8073'` is een warm grijs dat **nergens anders in het systeem voorkomt**. Een
  zesde grijstint naast `--muted:#a89a86`, `--dim:#9aa0ac`, `--ink-dim`, `--faint:#6b7280`.
* Vierde sans-stack: `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`.
* Body-tekstkleur `#2b2b2b` op wit: dit is het enige **lichte** Maculis-oppervlak dat vandaag bestaat.
  Als de canon een dagregime invoert, is dit al de facto de dagvariant en zou hij daarop moeten
  aansluiten.

Technische randvoorwaarde: e-mail dwingt inline styles en table-layout af. Tokens kunnen hier dus
niet als CSS-custom-properties landen. Ze moeten **server-side als JS-constanten** uit dezelfde bron
komen. Dat maakt de handtekening tot de enige plek waar de canon in twee formaten moet bestaan.

---

## 4. Voorstel: canonieke token- en componentarchitectuur

### 4.1 Uitgangspunt

Eén DNA is niet één interface. Daarom drie lagen, niet één:

```
Laag 1  CANON      onveranderlijk, kamer-onafhankelijk. Vertaalt Visual DNA v1.0 één op één.
Laag 2  KAMER      per kamer een dunne laag die canon-tokens op rollen mapt en het
                   ruimtelijke/interactionele karakter van die kamer vastlegt.
Laag 3  COMPONENT  gedeeld waar de betekenis gedeeld is; kamerspecifiek waar de functie verschilt.
```

Laag 2 is het punt. Zonder die laag maak je de kamers identiek en verlies je precies waar
`styles.css` nu al goed in is.

### 4.2 Laag 1: canonieke tokens

Voorstel: `packages/maculis-dna/tokens.css` plus een gegenereerde `tokens.js` voor de
e-mailhandtekening. Prefix `--mc-` zodat er nooit een botsing is met bestaande kamertokens tijdens de
migratie, en zodat je aan de naam ziet of iets canon is.

```css
:root{
  /* GROND EN VLAK */
  --mc-ground:#080503;  --mc-ground-2:#0f0a06;
  --mc-surface-1:#140e08; --mc-surface-2:#1d130b; --mc-surface-3:#251a10;
  --mc-panel:#14120f;

  /* INKT */
  --mc-ink:#ece2d4; --mc-ink-dim:rgba(236,226,212,.62); --mc-ink-faint:rgba(236,226,212,.34);
  --mc-ink-muted:#a89a86;

  /* KOPER EN GOUD. Twee rollen, nooit inwisselbaar.
     Koper = merk, structuur, hairline, primaire actie in functionele kamers.
     Goud  = LICHT. Schaars. Markeert een moment, nooit een vlak.            */
  --mc-copper:#c8894a; --mc-copper-soft:#8a5f38; --mc-copper-hover:#e6a866;
  --mc-gold:#d7b36a;   --mc-gold-light:#f3e387;  --mc-gold-soft:#e8cf97;

  /* VIOLET: GERESERVEERD, NIET INGEVULD. Zie open beslissing O-3. */

  /* LIJN */
  --mc-line:rgba(200,137,74,.18); --mc-line-strong:rgba(200,137,74,.34);

  /* FUNCTIONEEL. Bewust buiten het merkpalet, want betekenis gaat voor esthetiek. */
  --mc-ok:#4cae86; --mc-warn:#cf8a3c; --mc-danger:#e5674f; --mc-privacy:#8a3a63;

  /* TYPOGRAFIE */
  --mc-serif: <CANON: Newsreader-stack, zie O-1>;
  --mc-sans:  <CANON: één stack, zie O-1>;
  --mc-t-hero:clamp(29px,5.6vw,50px);      --mc-t-statement:clamp(22px,4vw,32px);
  --mc-t-question:clamp(21px,3.8vw,30px);  --mc-t-body:clamp(14px,2.2vw,17px);
  --mc-t-fine:clamp(13px,2vw,15px);        --mc-t-label:11px;
  /* Functionele kamers hebben een dichtere, niet-schalende variant nodig: */
  --mc-t-ui-lg:16px; --mc-t-ui:14px; --mc-t-ui-sm:12.5px; --mc-t-ui-xs:11px;

  /* RUIMTE EN VORM */
  --mc-s-1:4px; --mc-s-2:8px; --mc-s-3:12px; --mc-s-4:16px; --mc-s-5:24px; --mc-s-6:40px; --mc-s-7:64px;
  --mc-r-sm:10px; --mc-r-md:16px; --mc-r-lg:20px; --mc-r-pill:999px;

  /* LICHT */
  --mc-glow-sm:0 0 9px 2px rgba(215,179,106,.40);
  --mc-glow-md:0 0 22px 5px rgba(215,179,106,.32);
  --mc-glow-lg:0 0 34px 9px rgba(215,179,106,.46);

  /* MOTION. Eén curve. Drie tempi, want een cockpit mag niet cinematisch zijn. */
  --mc-ease:cubic-bezier(.22,.61,.36,1);
  --mc-dur-instant:120ms; --mc-dur-quick:340ms; --mc-dur-beat:800ms; --mc-dur-slow:1200ms;

  /* RESPONSIVE. Eén set breekpunten voor alle kamers. */
  --mc-bp-compact:440px; --mc-bp-narrow:640px; --mc-bp-wide:900px;
}
```

Twee opmerkingen bij dit blok.

*De gouden alfa's.* Voeg `--mc-gold-a12/a25/a40/a60` toe. Dat is wat de 39 losse
`rgba(215,179,106,x)`-instanties in de Journey nodig hebben om zonder `color-mix` te kunnen migreren.

*`--mc-t-ui-*` naast `--mc-t-*`.* De journey-typeschaal is fluid en cinematisch. Een tabel met
veertien kolommen kan niet fluid schalen zonder onleesbaar te worden. Dit is geen concessie aan de
canon maar het expliciet maken van een verschil dat er nu ook al is, alleen dan ongedocumenteerd.

### 4.3 Laag 2: kamerlagen

Elke kamer krijgt `[data-room="…"]` op `<html>` en een eigen bestand dat uitsluitend canon-tokens
naar rollen mapt en het karakter van de kamer vastlegt.

| Kamer | Karakter | Wat de kamerlaag mag bepalen |
|---|---|---|
| `lens` | cinematisch, één beat per keer, volledig scherm | `--room-dur: var(--mc-dur-slow)`, signaalveld aan, typeschaal fluid, gloed rijk |
| `mijn-maculis` | intiem, verticaal verankerd, scrollbaar | idem, plus scrollverankering en `margin-block:auto` |
| `cockpit` | snel, dicht, scanbaar | `--room-dur: var(--mc-dur-instant)`, signaalveld uit, typeschaal `--mc-t-ui-*`, gloed schaars |
| `website` | nog te bepalen, zie O-2 | |

Concreet betekent dit dat de bestaande zin uit `styles.css`, "Not a copy of the journey", een
technische representatie krijgt in plaats van alleen een commentaarregel.

### 4.4 Laag 3: welke componenten écht gedeeld horen te worden

**Gedeeld, want de betekenis is identiek in elke kamer:**

| Component | Waarom | Vervangt vandaag |
|---|---|---|
| Wordmerk `MACULIS` | Het merkanker. Moet overal serif zijn. | `.brand-mark`, `header .brand` (nu sans), `#mark` |
| Knopfamilie `primary/secondary/link` | Eén actiehiërarchie in het hele organisme | `.btn-primary` (2×), `.eval-yes`, `.ask-cta`, `.rec-btn`, `.link`, `.btn`, `.btn.gold`, `.insp-btn`, `.fe-pick` |
| Focusring | Toegankelijkheid is niet kamerafhankelijk | ontbreekt volledig in Inbox en Workspace |
| Pill/chip | Zelfde vorm, zelfde betekenis in alle vier | `.chip`, `.af`, `.chan`, `.fi-chip`, `.campaign-pill`, `.org-tag`, `.ptl-tag`, `.att` |
| Lichtpunt / orb | Hét terugkerende Maculis-motief | `.orb`, `.fi-dot`, `.story-sig-dot`, `.eval-orb`, `.zero-mark` |
| Signaalveld (grain + vignette) | Per kamer aan of uit, maar één implementatie | `#grain`, `#vignette` |
| Attentiestaat-badge | Zelfde zes staten uit dezelfde `attentionOverview` | `.att.*` (2×), `.attn-state`, `.row-attn` |
| Reduced-motion-contract | Eén patroon, niet twee spiegelbeelden | `reduce` in Journey, `no-preference` in Cockpit |

**Kamerspecifiek, en dat moet zo blijven:**

| Blijft lokaal | Waarom |
|---|---|
| Stagesysteem, video-orkestratie, clip-overlays | Uniek voor Lens en Mijn Maculis. Een cockpit heeft geen beats. |
| First Impression, Story of the Site, Technical Signals | Analyse-eigen. Verplaatsen zou de Lens leegtrekken. |
| Tabel en de mobiele kaart-degradatie | Alleen Testerbeheer heeft rijen. |
| Driekolomsthread, composer, kanaalchips | Alleen de Inbox voert gesprekken. |
| Linkerrail relatie-identiteit | Alleen de Workspace. |
| Attention Cockpit-compositie (hero, rest, meer) | Presentatie mag wijken. De **primitieven** eronder zijn al gedeeld en stabiel volgens de scope-notitie in `BUILD_LOG.md`. |

**Bewust géén gedeeld component:** een generieke `Card`. Er staan nu `.card`, `.eval-card`,
`.attn-card`, `.story`, `.ts`, `.aipanel`, `.dist-block`, `.open-item`, `.funnel-stage` en
`.priv-card` naast elkaar. Die verschillen niet cosmetisch maar functioneel. Ze onder één `Card`
persen is exact de reductie tot varianten van hetzelfde dashboard die je wilt vermijden. Deel de
tokens, niet de doos.

### 4.5 Distributie: hoe komt laag 1 in twee repositories terecht

Dit is de lastigste technische vraag van het plan, want er is vandaag géén build-stap: alles is
statische HTML met inline CSS, en de kamers zitten in twee losse repositories met twee losse Render-
services. Drie opties:

| Optie | Werking | Voor | Tegen |
|---|---|---|---|
| **A. Gekopieerd bestand plus CI-check** | `tokens.css` staat in beide repos, een test faalt bij drift | Nul infrastructuur. Werkt vandaag. | Kopie blijft kopie |
| **B. npm-package** | `@maculis/dna` als dependency | Echt één bron | Vraagt een registry en een build-stap in twee repos die er nu geen hebben |
| **C. Runtime van één origin** | `<link href="https://maculis.nl/dna/tokens.css">` | Direct één bron | Cross-origin afhankelijkheid op de kritieke renderpad van de Journey. Een storing maakt beide kamers ongestyled. Afgeraden. |

**Advies: A nu, B zodra er om een andere reden een build-stap komt.** A geeft je vandaag het volledige
harmonisatie-effect zonder infrastructuurrisico, en de CI-check maakt drift onmogelijk in plaats van
onwaarschijnlijk. C is voor een journey die op cinematische timing draait een reëel bedrijfsrisico.

---

## 5. Migratievolgorde

Het leidende principe: **de tokenlaag moet gecanonicaliseerd zijn vóórdat één kamer migreert.** Wie
eerst een kamer omzet, moet hem twee keer omzetten. Daarnaast: **eerst alles wat nul zichtbaar effect
heeft, dan pas wat zichtbaar is.** Zo blijft elke zichtbare wijziging afzonderlijk beoordeelbaar.

| # | Stap | Zichtbaar? | Atomair? |
|---|---|---|---|
| 0 | Canon aanleveren en O-1 t/m O-6 beslissen | nee | blokkeert alles |
| 1 | `tokens.css` + `tokens.js` schrijven, nog nergens ingeladen | nee | ja |
| 2 | Bugfixes zonder kleurgevolg: `--priv` in `comm.html`, `color-scheme` in Journey, dode root-`index.html` | minimaal | ja, los |
| 3 | `:focus-visible` en `prefers-reduced-motion` in Inbox en Workspace | alleen bij toetsenbord | ja |
| 4 | Journey: 39 gouden literals → tokens, radii → tokens | **nee, byte-identiek** | ja |
| 5 | Testerbeheer: `:root` wordt alias-laag op canon | **nee bij gelijke waarden** | ja |
| 6 | Testerbeheer: undefined-token-bug (`#9aa0ac` → warm `--muted`) | **ja, klein** | ja |
| 7 | Knopfamilie consolideren in Journey en Mijn Maculis | ja, klein | nee, in één keer |
| 8 | **Inbox + Workspace: koud → warm** | **ja, groot** | nee, beide samen |
| 9 | Inbox + Workspace: serif wordmerk, radii, spacing, breekpunt | ja, middel | ja |
| 10 | Cockpit: `--gold` introduceren en goud/koper scheiden | ja, middel | ja |
| 11 | Kamerlaag `[data-room]` invoeren | nee | ja |
| 12 | Gedeelde componenten uitfaseren naar laag 3 | wisselend | per component |
| 13 | E-mailhandtekening op `tokens.js` | ja, klein, extern zichtbaar | ja |
| 14 | *(indien O-1 zegt: ja)* Newsreader invoeren | **ja, zeer groot, overal** | eigen traject |
| 15 | *(indien canon dat vraagt)* Dagregime | **ja, zeer groot** | eigen traject |
| 16 | *(indien canon dat vraagt)* Violet, na beslissing O-3 | ja, groot | eigen traject |

**Waarom stap 8 niet opsplitsbaar is.** `--bg` en `--panel` afzonderlijk omzetten geeft één deploy
lang warme panelen op een koude grond, of andersom. Dat is lelijker dan beide eindtoestanden. Inbox
en Workspace moeten bovendien samen, want de gebruiker navigeert er direct tussen.

**Waarom stap 14 t/m 16 eigen trajecten zijn.** Ze zijn geen van drieën harmonisatie. Het zijn nieuwe
ontwerplagen die uit de canon komen. Ze na de harmonisatie doen betekent dat ze op een gezonde
fundering landen in plaats van op vier losse stylesheets. Andersom kost het een veelvoud.

---

## 6. Risico- en afhankelijkhedenkaart

### 6.1 Afhankelijkheden

```
CANON (ontbreekt)
  └─> O-1 typografie ─┬─> stap 1 tokens ──┬─> stap 4 Journey
      O-3 violet ─────┤                   ├─> stap 5 Testerbeheer ──> stap 6 ──> stap 10
      O-6 dag/nacht ──┘                   └─> stap 8 Inbox+Workspace ──> stap 9
                                                     │
      O-2 Website ─────────────────────────> ?  ─────┤
                                          stap 11 kamerlaag ──> stap 12 componenten
                                                                 └─> stap 13 handtekening
```

Kritiek pad: **canon → O-1 → stap 1 → alles**. Elke dag zonder canon is een dag waarop stap 1 niet af
kan, want `--mc-serif` en `--mc-sans` zijn er de eerste twee regels van.

### 6.2 Risico per stap

| Stap | Risico | Regressierisico | Rollback |
|---|---|---|---|
| 1 | geen | geen | bestand verwijderen |
| 2 | laag. `color-scheme: dark` in de Journey verandert wél de weergave van native controls, dus zichtbaar op `.ptl-input` en `.ctx-field textarea` | laag | één regel terug |
| 3 | laag | geen | git revert |
| 4 | laag, maar 39 handmatige vervangingen zijn foutgevoelig. Eén verkeerde alfa is direct zichtbaar op de orb | **middel**: raakt First Impression, Story, Technical Signals, evaluatie, closing | git revert, één bestand |
| 5 | laag mits waarden exact gelijk. Elke afwijking slaat door naar 922 declaraties | middel | git revert |
| 6 | laag | laag | git revert |
| 7 | middel. Drie CTA-definities samenvoegen raakt de meest waardevolle momenten van Mijn Maculis (`eval-yes`, persoonlijke ASK) | **hoog**: dit zijn conversiepunten | git revert |
| 8 | **hoogste van het plan.** Twee complete kamers kantelen van temperatuur | **hoog**. Bijzonder aandachtspunt: `--in`/`--out` dragen betekenis, en zes `.att.*`-badges hebben handgekozen achtergronden die tegen een koude grond zijn ontworpen | git revert per bestand, maar niet halverwege |
| 9 | laag tot middel. Breekpunt 860/900 → 900 verandert de layout van de Inbox tussen 860 en 900px | middel | git revert |
| 10 | middel. Goud invoeren waar nu koper staat verandert de accentkleur van de Attention Cockpit | middel | git revert |
| 11 | laag | laag | attribuut verwijderen |
| 12 | wisselend, per component te beoordelen | wisselend | per component |
| 13 | laag technisch, maar **extern zichtbaar en onherroepelijk**. Een verzonden mail komt niet terug | laag | alleen vooruit |
| 14 | **zeer hoog.** Andere x-hoogte en andere metrics betekenen dat elke `clamp()`, elke `line-height` en elke `max-width` in `em` opnieuw beoordeeld moet worden, in vier kamers | **zeer hoog** | git revert, maar de herijking is het werk |
| 15 | zeer hoog. Verdubbelt de kleurmatrix en elk contrastoordeel | zeer hoog | feature flag |
| 16 | hoog. Semantische botsing met `--mc-privacy` | middel | git revert |

### 6.3 Drie risico's die geen stap zijn

1. **Twee repositories, twee deploys.** Journey en Cockpit deployen los naar Render. Een canonwijziging
   landt dus nooit gelijktijdig. Tussen de twee deploys bestaat er een venster waarin de kamers uit de
   pas lopen. Voor tokenwijzigingen zonder visueel effect is dat onschadelijk. Voor stap 14 en 15 niet.
   **Advies: plan die twee als gecoördineerde deploys binnen één venster.**

2. **Er is geen visuele regressietest.** `BUILD_LOG.md` noemt handmatige "visuele QA via headless
   Chromium". De 65 bestaande tests zijn functioneel, geen daarvan bewaakt een pixel. Voor stap 4 en 5,
   die byte-identiek horen te zijn, is dat precies de test die je nodig hebt. Zie §7.

3. **De Journey is een enkel bestand van 2.535 regels met CSS, HTML en JS door elkaar.** Elke
   wijziging raakt hetzelfde bestand, dus parallel werken geeft merge-conflicten. Plan Journey-stappen
   serieel.

---

## 7. Verificatieplan

### 7.1 Referentiebeelden vastleggen vóór stap 1

Zonder nulmeting is "byte-identiek" een bewering in plaats van een feit. Leg met headless Chromium
per oppervlak een vaste set schermen vast, in vier viewports (360×800, 768×1024, 1280×800, 1920×1080),
en telkens in twee varianten: normaal en `prefers-reduced-motion: reduce`.

| Kamer | Schermen |
|---|---|
| Lens | encounter, ask generiek, looking, **REVEAL**, **SILENCE met First Impression + Story + Technical Signals uitgeklapt**, failure |
| Mijn Maculis | welcome, ask persoonlijk, recognition, continuation, account, evaluatie-intro, Pass the Lens, Pass the Lens ingevuld, closing |
| Cockpit / Testerbeheer | login, tabel gevuld, tabel leeg, **cockpit met hero + rest**, **cockpit zero-state**, evaluaties, testerdossier, elke modal |
| Cockpit / Inbox | leeg, gesprek geselecteerd, AI-paneel open, composer met kanaalkeuze, privacy-tab |
| Cockpit / Workspace | rail, elk tabblad, thread, timeline |
| Handtekening | gerenderd in licht en in donker |

Animaties moeten bevroren zijn (`animation-play-state: paused`), anders is elke vergelijking ruis.

### 7.2 Poortcriteria per stap

**Stappen 1, 4, 5, 11 zijn "nul-delta"-stappen.** Poort: de pixeldiff tegen de nulmeting is
**exact nul**. Elk verschil is een fout, geen smaakoordeel. Dit is de enige objectieve manier om 39
handmatige vervangingen te durven doen.

**Stappen 6 t/m 10, 13 zijn "verwachte-delta"-stappen.** Poort: diff bestaat, en de diff bevat
uitsluitend wat je vooraf hebt opgeschreven. Schrijf de verwachting op vóór de wijziging. Een diff op
een scherm dat je niet had genoemd is een regressie.

### 7.3 Vaste checklist per stap

| Dimensie | Hoe |
|---|---|
| Desktop | 1280 en 1920, elk kernscherm |
| Mobiel | 360×800 en 768×1024. Testerbeheer specifiek: de tabel-naar-kaart-degradatie onder 760px |
| Licht/donker | Nu alleen donker. Handtekening in beide, want die is al licht. Vanaf stap 15 overal beide |
| Reduced motion | Elk scherm met `reduce`. Poort: geen enkele lopende animatie, en niets onzichtbaar door een `opacity:0` die van een animatie afhing. Let specifiek op `.fi-dot`, `.ts-lens`, `.closing-invite`, `.attn-card` |
| Typografie | Per platform, want de serif-stack rendert per OS anders: macOS Iowan, Windows Palatino Linotype, Android Georgia. Vanaf stap 14 vervalt dit en komt fontladingsgedrag ervoor in de plaats (FOUT/FOIT, `font-display`) |
| Interactieve states | Voor elk interactief element: rust, hover, focus via toetsenbord, actief, disabled. Poort: **elk** focusbaar element heeft een zichtbare ring. Vandaag faalt de Inbox hier volledig |
| Contrast | WCAG AA op alle tekst. Specifiek toetsen na stap 8: `--faint:#6b7280` haalt vandaag op de koude grond nét AA op grote tekst; de warme vervanger moet opnieuw gemeten |
| Performance | Journey: de video-beats mogen niet verschuiven. Meet time-to-first-frame van VIDEO 1 en VIDEO 2. Vanaf stap 14: CLS meten, want een webfont introduceert layout shift waar er nu geen is |
| Console | Nul errors, nul warnings. Ook nul 404's op assets |
| Horizontale overflow | Per scherm `document.documentElement.scrollWidth <= clientWidth`. Verhoogd risico bij `.attn-snippet` (`max-width:52ch`), `.ptl-grid`, `.intent-grid`, `.fi-spectrum` en de driekolomsopzet van de Inbox rond het nieuwe breekpunt |
| Functionele regressie | `npm test` in beide repos. Website: 65 comm-tests plus core, serieel. Journey: `npm run selftest` (8/8) en `engine:regression`. Poort: onveranderd groen |

### 7.4 Wat de bestaande tests niet dekken, en dus handmatig moet

De attentie-toestanden `NEW`, `UNREAD`, `NEEDS_ACTION`, `REPLY_READY`, `WAITING_FOR_CUSTOMER`,
`RESOLVED` en `DELIVERY_PROBLEM` hebben elk een eigen kleur op drie plekken: `.attn-card`-randlinks,
`.row-attn`-punt en `.att`-badge. Na stap 8 en 10 moeten alle zeven op alle drie de plekken visueel
worden nagelopen. Er is geen fixture die dit afdwingt.

---

## 8. Concrete implementatiebatches

Elke batch is één PR, één review, één deploy, één rollbackpunt.

| Batch | Inhoud (stappen) | Repo | Zichtbaar | Poort |
|---|---|---|---|---|
| **B0** | Nulmeting §7.1 vastleggen. Geen productcode | beide | nee | referentieset compleet |
| **B1** | `tokens.css` + `tokens.js` + CI-driftcheck. Nergens ingeladen (stap 1) | beide | nee | tests groen |
| **B2** | Bugfixes en toegankelijkheid: `--priv`, `color-scheme`, dode root-`index.html`, `:focus-visible` en reduced motion in Inbox/Workspace (stap 2, 3) | beide | minimaal | elk focusbaar element heeft een ring |
| **B3** | Journey op tokens: 39 gouden literals, radii (stap 4) | maculis-first-five | nee | **pixeldiff exact nul** |
| **B4** | Testerbeheer `:root` als alias-laag (stap 5) | website | nee | **pixeldiff exact nul** |
| **B5** | Undefined-token-bug `#9aa0ac` → warm (stap 6) | website | ja, klein | diff alleen op `.link-name.link-dim` en `.ptl-tag` |
| **B6** | Knopfamilie consolideren (stap 7) | maculis-first-five | ja, klein | evaluatie-CTA en persoonlijke ASK identiek aan referentie |
| **B7** | **Inbox + Workspace koud → warm** (stap 8). Beide bestanden in één commit | website | **ja, groot** | volledige §7.3-checklist, plus de zeven attentiestaten uit §7.4 |
| **B8** | Inbox + Workspace: serif wordmerk, radii, spacing, breekpunt naar 900 (stap 9) | website | ja, middel | geen horizontale overflow tussen 840 en 960px |
| **B9** | Cockpit `--gold` scheiden van koper (stap 10) | website | ja, middel | Attention Cockpit-accenten expliciet beoordeeld |
| **B10** | Kamerlaag `[data-room]` (stap 11) | beide | nee | **pixeldiff exact nul** |
| **B11** | Gedeelde componenten uitfaseren (stap 12). Eén component per PR | beide | wisselend | per component |
| **B12** | E-mailhandtekening op `tokens.js` (stap 13) | website | extern | in Apple Mail en Gmail, licht en donker, vóór verzending aan echte ontvangers |
| **B13+** | Newsreader / dagregime / violet (stap 14 t/m 16) | beide | zeer groot | eigen trajecten, eigen plan |

B0 tot en met B6 kunnen achter elkaar door zonder dat iemand buiten het team iets merkt. **B7 is het
moment waarop de harmonisatie zichtbaar wordt.** Plan die niet op een vrijdag en niet vlak voor een
gesprek met een tester.

---

## 9. Open beslissingen die alleen Lud kan nemen

| # | Beslissing | Waarom alleen jij | Blokkeert |
|---|---|---|---|
| **O-0** | **Lever `MACULIS_VISUAL_DNA_V1.0.md` en de Visual North Star aan.** Ze staan in geen van beide repositories, in geen enkele branch, en niet in de gekoppelde Drive | Ze bestaan buiten mijn bereik | alles |
| **O-1** | **Newsreader: ja of nee, en welke sans ernaast?** Er wordt vandaag nergens een webfont geladen. "Newsreader / sans-verdeling" beschrijft een verdeling die nog niet bestaat | Merkbeslissing met de grootste technische impact van het hele plan | stap 1 en 14 |
| **O-2** | **Wat is de kamer "Website" precies?** Een aparte publieke site op `www.maculis.nl` waar deze sessie geen toegang toe heeft, of het generieke pad door de Journey? Zie §1.1 | Alleen jij weet welke deployment dit is | volledigheid van dit plan |
| **O-3** | **Violet is nieuw en botst met `--priv:#8a3a63`.** Wordt violet een merkkleur naast koper, en wat gebeurt er dan met de privacy-status die vandaag diezelfde kleurfamilie heeft? | Semantisch conflict tussen twee betekenissen van één kleur. Ik los dit niet zelfstandig op | stap 1 en 16 |
| **O-4** | **Mag de Attention Cockpit goud gaan gebruiken?** Vandaag speelt koper daar de gouden rol. Goud invoeren scheidt de rollen conform de canon, maar verandert de accentkleur van een productiescherm dat je dagelijks gebruikt | Jouw dagelijkse werkomgeving | stap 10 |
| **O-5** | **Inkomend blauw tegenover uitgaand warm in de Inbox.** `--in:#26333f` en `--out:#2e2a1c` gebruiken temperatuur om richting te betekenen. Na de warme conversie is dat contrast weg. Wat draagt de betekenis dan? | Functionele betekenis tegenover merkconsistentie | stap 8 |
| **O-6** | **Komt er een dagregime?** Er is vandaag geen lichtmodus. De e-mailhandtekening is het enige lichte oppervlak en zou de facto de dagvariant zijn | Verdubbelt de kleurmatrix en elk contrastoordeel | stap 1 en 15 |
| **O-7** | **Worden Lens en Mijn Maculis technisch gesplitst?** Ze delen vandaag één bestand van 2.535 regels en één stagesysteem. Als de canon ze als aparte kamers behandelt, volgt daar een splitsing uit die groter is dan de harmonisatie zelf | Productbeslissing, geen technische | stap 11 |
| **O-8** | **Distributie A of B** uit §4.5: gekopieerd bestand met CI-driftcheck, of een npm-package met een build-stap in twee repos die er nu geen hebben. Mijn advies is A nu, B later | Bepaalt of er infrastructuur bijkomt | stap 1 |

---

## 10. Slot

Het goede nieuws: de vier kamers voelen al grotendeels als één organisme, en op één plek na is dat
geen toeval maar zorgvuldig werk. De Journey heeft de tokenlaag die je nodig hebt al geschreven,
en `styles.css` verwoordt in zijn eigen kop al precies het principe dat je nastreeft.

De harmonisatie is daarom vooral: die tokenlaag optillen naar een plek waar alle vier de kamers hem
kunnen zien, twee kamers van een koude grond naar een warme halen, en de technische schuld aflossen
die ontstond doordat DS V1 wel additief is ingevoerd maar nooit is afgemaakt.

Wat de omvang werkelijk bepaalt zijn de drie dingen uit de canon die nog nergens bestaan: Newsreader,
violet en een dagregime. Die zijn samen groter dan de hele rest, en geen ervan is te plannen zonder
het document.

---

**READY FOR HARMONISATION**, met één uitdrukkelijke beperking: dit plan is volledig onderbouwd op de
bestaande implementaties, die ik regel voor regel heb onderzocht in beide repositories. Het is
**niet** onderbouwd tegen `MACULIS_VISUAL_DNA_V1.0.md`, want dat document is in deze omgeving
nergens te vinden (§0). Zodra je de canon aanlevert, kan §2 in één ronde worden aangevuld met de
echte canonieke waarden, en kunnen O-1, O-3 en O-6 vervallen of concreet worden.

**Ik wijzig geen productcode. Ik wacht op jouw akkoord.**
