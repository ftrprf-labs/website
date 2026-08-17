# Maculis Visual DNA Audit

**Design system discovery. Analyse only.**
Datum: 2026-08-17 · Status: ter beoordeling · Niets gebouwd, niets gewijzigd, niets gedeployed.

Legenda die overal in dit document geldt:

* **FEIT** = direct afleesbaar uit code, met bestandspad en regelverwijzing.
* **ONTWERPADVIES** = interpretatie of voorstel van mij. Niet in code aangetoond.

---

## 1. Executive summary

### 1.1 De belangrijkste bevinding: de vier kamers bestaan niet zoals beschreven

De opdracht gaat uit van vier bestaande omgevingen. De werkelijkheid in de code is anders, en dat
verschil bepaalt de rest van dit rapport.

| Omgeving in de opdracht | Wat er werkelijk is | Repo | Bewijs |
|---|---|---|---|
| Website | Bestaat. Volledige Maculis one-pager. | `ftrprf-labs/groeiplatform-website` | `src/components/sections/maculis/*`, `src/app/page.tsx` |
| Lens | Bestaat als de First Five Journey. | `ftrprf-labs/maculis-first-five.` | `public/index.html`, `src/live/lenses/first-impression.ts` |
| Cockpit | Bestaat, maar als drie losse UI's in één repo. | `ftrprf-labs/website` | `public/styles.css`, `public/workspace.html`, `public/comm.html` |
| Mijn Maculis | **Bestaat niet.** Geen repo, geen branch, geen bestand. | geen | zie 1.2 |

Twee repositorynamen zijn misleidend en dat heeft deze audit aantoonbaar vertraagd. **FEIT:**
`ftrprf-labs/website` bevat niet de website maar Testerbeheer, de Attention Cockpit, de Relationship
Workspace en de Inbox. `ftrprf-labs/groeiplatform-website` bevat wel de publieke Maculis-website.
`ftrprf-labs/websiteftrprflab` is een volledig lege repository.

### 1.2 Mijn Maculis is nog niet gebouwd

**FEIT.** Een zoekactie op `Mijn Maculis`, `Intelligent Warmth`, `parchment` en `perkament` over alle
zes repositories van `ftrprf-labs` levert **nul treffers** op. Er is geen branch met die naam in
`maculis-first-five.` (19 branches gecontroleerd) of in `groeiplatform-website` (2 branches).

**FEIT.** `docs/BUILD_LOG.md` regels 24 tot 30 in deze repo legt dit expliciet vast:

> "De huidige **Attention Cockpit is een operationele baseline, NIET de definitieve toekomstige
> Maculis Home.**"

En noemt de Future Cockpit als toekomstige laag die de Communication Layer later consumeert.

**Consequentie voor dit rapport.** Fase 1 vraagt een feitelijke inventarisatie per omgeving met
werkelijke waarden uit de code. Voor Mijn Maculis kan ik die niet leveren, want er is geen code.
Alles wat ik over Mijn Maculis zeg, is per definitie ONTWERPADVIES op basis van het referentiebeeld
en de brief. Ik presenteer dat nergens als feit.

Dat is geen tegenvaller. Het is de gunstigste uitgangspositie die je kunt hebben: Mijn Maculis is
het enige product dat **vanaf regel één binnen het systeem geboren kan worden**, zonder migratie.

### 1.3 Er is al een Maculis Design Language. Twee keer. Ze weten niet van elkaar

Dit is de tweede grote bevinding en zij verandert de aanbevolen volgorde volledig.

**FEIT.** `maculis-first-five./public/index.html` regel 24 tot 43 bevat een blok met het opschrift:

```
/* ---- MACULIS DESIGN SYSTEM V1 — globale tokens (additief; bestaande --amber/--ink blijven) ---- */
--gold:#d7b36a; --gold-light:#f3e387; --panel:#14120f;
--s-1:4px; --s-2:8px; --s-3:12px; --s-4:16px; --s-5:24px; --s-6:40px; --s-7:64px;
--r-sm:10px; --r-md:16px; --r-lg:20px; --r-pill:999px;
--t-hero:clamp(29px,5.6vw,50px); --t-statement:clamp(22px,4vw,32px);
--t-question:clamp(21px,3.8vw,30px); --t-body:clamp(14px,2.2vw,17px);
--t-label:11px; --t-fine:clamp(13px,2vw,15px);
--glow-sm / --glow-md / --glow-lg
```

Met een complete spacing-schaal, radius-schaal, type-schaal en glow-presets. Plus herbruikbare
klassen `.btn-primary`, `.btn-secondary`, `.btn-link` en `.orb` (regel 509 tot 528).

**FEIT.** `groeiplatform-website/src/app/globals.css` regel 6 tot 15 bevat onafhankelijk hiervan:

```
Maculis Design Token Family — gedeeld met Maculis Journey, Testerbeheer en First Five.
Canonieke waarden (uit de drie gebouwde apps):
  achtergrond #080503 · surfaces #140e08 → #1d130b → #251a10
  accent (amber) #c8894a · hover #e6a866 · ink #ece2d4 · muted #a89a86
  hairline rgba(200,137,74,.18–.22) · glow rgba(200,137,74,.16)
  ease cubic-bezier(.22,.61,.36,1) · 1200ms
Semantiek (Design Constitution, 12 wetten):
  amber = signaal/aandacht · serif = betekenis/reveal · sans = functie · glow = focus.
Amber is schaars: alleen voor wat aandacht verdient.
```

Dit is geen losse opmerking. Het is een correcte, gedocumenteerde uitlezing van de drie andere apps.
Iemand heeft dit werk al gedaan.

**FEIT.** De "Design Constitution, 12 wetten" waar deze comment naar verwijst, **bestaat nergens als
document**. Niet in `ftrlabs-docs` (alle 78 markdown-bestanden gecontroleerd, `03-ux/principles/`
bevat alleen een lege README), niet in de andere repositories. Het is een canon zonder tekst.

### 1.4 De echte divergentie zit niet waar de brief hem vermoedt

De brief vermoedt dat Mijn Maculis te ver van de website afdrijft. **FEIT: de grootste onnodige
divergentie in het hele Maculis-landschap zit binnen één product, de Cockpit, in één repository.**

Drie schermen van dezelfde interne applicatie gebruiken drie handmatig gedupliceerde paletten:

| | `public/styles.css` | `public/workspace.html` | `public/comm.html` |
|---|---|---|---|
| Achtergrond | `#080503` warm bijna-zwart | `#0b0c0f` **koel leisteen** | `#0b0c0f` **koel leisteen** |
| Paneel | `#140e08` warm bruin | `#14161b` koel grijs | `#14161b` koel grijs |
| Hairline | `rgba(200,137,74,.18)` **amber** | `#2a2e39` **neutraal grijs** | `#2a2e39` neutraal grijs |
| Secundaire tekst | `#a89a86` warme greige | `#9aa0ac` **koel grijs** | `#9aa0ac` koel grijs |
| Serif | `Iowan Old Style` aanwezig | **geen serif** | **geen serif** |
| Radius | `--radius: 10px` | `--r: 12px` | geen token |

Klik in Testerbeheer op een naam en je gaat van een warm, amber-doorschenen Maculis-scherm naar een
koel, neutraal SaaS-scherm. Binnen dezelfde applicatie, in één klik. Dit is de scherpste breuk die
ik in het hele landschap heb gevonden, en hij is honderd procent onbedoeld: `comm.html` is een
handmatige kopie van het `workspace.html`-palet waarbij `--r` en `--priv` zijn kwijtgeraakt
(`comm.html` regel 25 gebruikt daarom de fallback `var(--priv,#8a3a63)`).

### 1.5 Wat al onmiskenbaar gedeeld is

**FEIT.** Eén waarde is werkelijk universeel. `#c8894a` staat in **elke** omgeving:

* Website: `--amber: 30 53% 54%` en `--signal: 30 53% 54%` in `globals.css`, wat exact `#c88a4c` is.
* Lens: `--amber:#c8894a` in `public/index.html` regel 12.
* Cockpit: `--primary: #c8894a` in `styles.css` regel 24, en `--amber:#c8894a` in beide andere schermen.
* E-mailhandtekening: `const GOLD = '#c8894a'` in `server/comm/signature.mjs` regel 46.
* Favicons: de inline SVG in alle drie de HTML-bestanden en in de Journey gebruikt `%23c8894a`.

**FEIT.** Ook `--ink: #ece2d4` staat identiek in de Lens, alle drie de Cockpit-schermen, en als
`--foreground: 35 39% 88%` op de website.

**FEIT.** De easing `cubic-bezier(.22,.61,.36,1)` staat identiek in de Lens (`--ease`) en op de
website (`animate-lens-in`, `hero-focus`, de reveal-transitie).

**FEIT.** De signatuurbeweging blur naar scherp staat in beide:

* Lens: `@keyframes tsSharpen` blur(6px) naar 0, `@keyframes fiSharpen` blur(5px) naar 0.
* Website: `@keyframes lens-in` blur(14px) naar 0 over 1600ms, `hero-focus` blur(6px) naar 0 over
  2400ms, en de reveal-demo blur(10px) naar 0 over 1400ms.

Kortom: de kleur, de tekstkleur, de easing en de kernbeweging zijn **al** gedeeld. Wat mist is niet
het DNA. Wat mist is een geschreven bron en een gedeelde vindplaats.

### 1.6 Navy is een vreemd lichaam

**FEIT.** Er is geen navy in Maculis. Nul voorkomens. De enige navy in de organisatie is
`brand.blue: "#0B2545"` in `ftrprf-labs/growth-os`, en dat is **Praktijk Groeiscan**, een ander
product met een eigen design system (Geist Sans, groen accent `#16A34A`, radius 14/18/24).

Het referentiebeeld en de brief noemen navy als kleur voor Mijn Maculis. **ONTWERPADVIES:** navy
introduceren is geen harmonisatie maar een merkwijziging. Maculis is aantoonbaar warm bruin, amber
en ivoor. Ik markeer dit als open ontwerpbeslissing 1 en beveel aan het niet te doen. Zie 26.

### 1.7 De aanbevolen volgorde wijkt af van de hypothese

De hypothese was Website plus Mijn Maculis eerst. Ik spreek die tegen, met redenen in 24.

Kort: Mijn Maculis kan niet geharmoniseerd worden want het bestaat niet. Het moet in het systeem
geboren worden, wat pas kan als het systeem er is. De hoogste opbrengst tegen het laagste merkrisico
zit in de Cockpit-consolidatie (drie paletten naar één, volledig intern publiek, nul merkrisico),
en de hoogste merkopbrengst in Website plus Lens, die samen de complete publieke keten vormen en al
dezelfde tokenseed dragen.

---

## 2. Feitelijke inventaris: Website

**Repo** `ftrprf-labs/groeiplatform-website` · branch `main` (`0c67887`), plus branch
`feat/maculis-public-homepage`.
**Stack (FEIT, `package.json`, `layout.tsx`)** Next.js 14 App Router, TypeScript, Tailwind CSS,
framer-motion, lucide-react, class-variance-authority, recharts.
**Let op:** de repo-README beschrijft nog een generiek `{{BRAND_NAME}}` Growth Platform. De
werkelijke homepage in `src/app/page.tsx` is volledig Maculis.

### 2.1 Kleuren

**FEIT** `src/app/globals.css`. Alle waarden in HSL-triplets voor Tailwind.

Het lichte palet staat op `:root` en is **volledig gedefinieerd maar niet actief**:

| Token | Waarde | Opmerking |
|---|---|---|
| `--background` | `40 33% 96%` | warm perkamentwit |
| `--foreground` | `28 24% 8%` | warm bijna-zwart |
| `--card` | `40 30% 99%` | |
| `--muted` | `30 10% 40%` | |
| `--border` | `32 20% 84%` | |
| `--border-strong` | `30 30% 72%` | |
| `--paper` | `40 33% 96%` | identiek aan background |

Warme ink-schaal, hue 24 tot 40 (koper-antraciet naar ivoor):
`--ink-50: 40 33% 96%` · `--ink-100: 37 30% 90%` · `--ink-200: 36 24% 82%` ·
`--ink-300: 35 18% 70%` · `--ink-400: 34 15% 55%` · `--ink-500: 32 16% 40%` ·
`--ink-600: 30 22% 26%` · `--ink-700: 29 30% 16%` · `--ink-800: 28 34% 10%` ·
`--ink-900: 28 40% 6%` · `--ink-950: 24 45% 3%`

Accent:
`--signal: 30 53% 54%` en `--amber: 30 53% 54%`, **identieke waarde**, beide gelijk aan `#c88a4c`.
`--amber-400: 31 72% 65%` · `--amber-500: 28 58% 48%` · `--amber-600: 24 60% 40%`.
`--signal-50/100/400/500/600` idem gestaffeld.

Semantisch: `--ok: 152 39% 49%` · `--warn: 32 60% 52%` · `--danger: 9 74% 60%`.

Het donkere palet staat op `.dark` en **is wat de bezoeker ziet**, want `layout.tsx` regel 89
hardcodeert `<html lang="nl" className="dark">`:

`--background: 24 40% 3%` · `--foreground: 35 39% 88%` · `--card: 30 42% 6%` ·
`--card-2: 28 44% 8%` · `--muted: 35 16% 59%` · `--border: 30 38% 12%` ·
`--border-strong: 30 42% 20%`.

`themeColor: "#14100C"` in de viewport-export.

**Dit is de belangrijkste latente kans in het hele landschap.** Er ligt een compleet, warm,
perkamentkleurig licht thema klaar in productiecode dat nooit wordt aangezet. Zie 25.

### 2.2 Typografie

**FEIT** `layout.tsx` regel 9 tot 15, `tailwind.config.ts`.

* Sans: **Inter** via `next/font/google`, variabele `--font-inter`, `display: swap`.
* Display en serif: **Fraunces** via `next/font/google`, variabele `--font-fraunces`.
  Fallback `Georgia, serif`.
* Mono: **JetBrains Mono**, variabele `--font-mono`.
* `body { font-feature-settings: "ss01", "cv01" }`.

Displayschaal (FEIT, `tailwind.config.ts`):

| Token | clamp | line-height | letter-spacing |
|---|---|---|---|
| `display-1` | `clamp(2.55rem, 6.2vw, 6.75rem)` | 1.03 | -0.02em |
| `display-2` | `clamp(1.95rem, 4.6vw, 4.25rem)` | 1.08 | -0.018em |
| `display-3` | `clamp(1.55rem, 3.2vw, 2.85rem)` | 1.12 | -0.015em |

Patroon in gebruik (FEIT, `hero.tsx` regel 137, `principles.tsx` regel 28):
h1 en h2 zijn `font-display font-light tracking-tight`. Boven elke sectiekop staat een eyebrow:
`text-xs font-medium uppercase tracking-[0.18em] text-ink-400`. In de hero is die tracking `0.22em`,
in kleinere labels `0.2em` op 10px of 11px.

Serif wordt daarnaast consequent **cursief** ingezet voor citaten en betekenis:
`font-display text-[15px] italic text-ink-200` voor de evidence-quotes (`reveal-demo.tsx`).

### 2.3 Spacing en grid

**FEIT** `tailwind.config.ts`.
Container gecentreerd, padding `1.25rem` naar `2rem` (sm) naar `3rem` (lg) naar `4rem` (xl).
Breakpoints `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1440`. `maxWidth.8xl: 90rem`.
Sectieritme (FEIT, alle secties): `py-16 sm:py-32`.
`scroll-margin-top: 5.5rem` op alle `#main [id]` zodat ankers niet onder de sticky nav vallen.
Hero-grid: `lg:grid-cols-[1.05fr_0.95fr]`, dus bewust asymmetrisch. Reveal-grid
`lg:grid-cols-[0.82fr_1.18fr]`, asymmetrisch de andere kant op.

### 2.4 Radii

**FEIT.** `xl: 1rem` · `2xl: 1.5rem` · `3xl: 2rem` · `4xl: 2.5rem`.
Alle knoppen, badges en chips zijn `rounded-full`. Kaarten `rounded-2xl`. Grote podia `rounded-3xl`.

### 2.5 Borders en hairlines

**FEIT.** Globale regel `* { border-color: hsl(var(--border)) }` in `globals.css`.
Sectiescheiding is consequent `border-t border-border/60`.
Accentranden gebruiken alpha op amber: `border-amber/30`, `border-amber/40`, `border-amber/60`.
Evidence-rails zijn `border-l border-amber/25`.

### 2.6 Shadows en depth

**FEIT** `tailwind.config.ts`:

```
soft:  0 1px 2px 0 rgb(0 0 0 / .04), 0 8px 30px -8px rgb(0 0 0 / .12)
lift:  0 2px 8px 0 rgb(0 0 0 / .06), 0 24px 48px -12px rgb(0 0 0 / .22)
glow:  0 0 0 1px hsl(var(--signal) / .15), 0 0 40px -8px hsl(var(--signal) / .35)
```

`glow` is geen schaduw maar licht. Het is gereserveerd voor de signal-knop en het reveal-punt.

Sfeerlagen (FEIT, `globals.css`):
`.bg-grid` een 72px raster van hairlines op 0.6 alpha ·
`.bg-radial-fade` `radial-gradient(58% 50% at 50% 0%, hsl(var(--amber)/.14), transparent 62%)` ·
`.mask-fade-b` een verloopmasker naar transparant ·
`.glass` `backdrop-filter: blur(20px) saturate(140%)` met `bg-card/.66`.

### 2.7 Buttons

**FEIT** `src/components/ui/button.tsx`, class-variance-authority.
Basis: `rounded-full text-sm font-medium transition-all duration-300`.

| Variant | Definitie |
|---|---|
| `primary` | `bg-ink-950 text-paper dark:bg-paper dark:text-ink-950 shadow-soft hover:shadow-lift hover:-translate-y-0.5` |
| `signal` | `bg-signal text-ink-950 shadow-glow hover:brightness-110 hover:-translate-y-0.5` |
| `outline` | `border border-border bg-transparent hover:bg-foreground/5 hover:-translate-y-0.5` |
| `ghost` | `hover:bg-foreground/5` |

Maten: `default h-12 px-6` · `sm h-10 px-5 text-[13px]` · `lg h-14 px-8 text-base`.
Hover is overal een lift van 2px over 300ms. Geen bounce, geen schaalsprong.

### 2.8 Inputs en formulieren

**FEIT** `hero.tsx` regel 175: `min-h-[48px] rounded-full border border-ink-700 bg-ink-900/70 px-5
text-[15px] text-paper placeholder:text-ink-400`. Dus pil-vormig, gevuld, niet onderstreept.
Focus loopt overal via de globale utility `.focus-ring`, die `outline: 2px solid hsl(var(--amber));
outline-offset: 3px` zet op `:focus-visible`.

### 2.9 Cards en surfaces

**FEIT** `src/components/ui/card.tsx`: `rounded-2xl border border-border bg-card shadow-soft`.
`CardHeader p-6 pb-3` · `CardContent p-6 pt-0` · `CardTitle font-display text-lg font-semibold
tracking-tight`.
De hero- en reveal-podia zijn zwaarder: `rounded-3xl border border-border bg-ink-950/70 p-6
shadow-lift` met een `bg-radial-fade` overlay erin.

### 2.10 Navigation

**FEIT** `site-nav.tsx`. Fixed, `z-50`, krimpt bij scroll van `py-3 sm:py-5` naar `py-1.5 sm:py-3`
over 300ms. De navbalk is een `rounded-full` pil die pas na 8px scroll `glass shadow-soft` krijgt.
Merkteken links is `LensMark`: drie concentrische elementen, ring 6x6 op `border-amber/50`, ring
3.5x3.5 op `border-amber/70`, kern 1.5x1.5 `bg-amber`. Daarnaast het woordmerk als
`font-display uppercase tracking-[0.2em]`.
Mobiel: hamburger, scrim `bg-black/60`, drawer `rounded-3xl border bg-ink-950/95 backdrop-blur-xl`
met framer-motion (opacity plus y -12, 250ms easeOut).
Rechtsboven staat exact één CTA in de `signal`-variant.

### 2.11 Iconografie

**FEIT.** `lucide-react` voor functionele iconen (`ArrowRight`, `ArrowDown`, `Eye`, `Menu`, `X`),
plus vier eigen lijniconen in `src/components/sections/maculis/line-icons.tsx`
(`IconHuman`, `IconSee`, `IconEvidence`, `IconPrivacy`) in cirkels van 12x12 met `border-border` en
`text-amber-500`.
Daarnaast drie merkvormen, alle drie concentrisch: `LensMark` (nav), `LensDot` (inline label),
`FocusRing` (het kijkmoment, twee ringen plus kern).

### 2.12 Status en badges

**FEIT** `src/components/ui/badge.tsx`: `rounded-full border px-3 py-1 text-xs font-medium`,
varianten `default` · `signal` (`border-signal/30 bg-signal/10`) · `amber` (`border-amber/30
bg-amber/10 text-amber-500`) · `outline`.
Op de homepage worden badges nauwelijks als status gebruikt. De enige statusachtige component is het
label `Tegenstrijdigheid` in de reveal-demo, in de amber-stijl.

### 2.13 Motion

**FEIT** `globals.css` en de componenten.

```
@keyframes lens-in   { 0% opacity 0, blur(14px), scale(1.02) → 100% opacity 1, blur(0), scale(1) }
.animate-lens-in     { 1600ms cubic-bezier(0.22, 0.61, 0.36, 1) both }
.lens-delay-1/2/3    { 220ms / 440ms / 680ms }
@keyframes hero-focus{ 0% opacity 0, scale(1.4), blur(6px) → 60% opacity 1 → 100% scale(1), blur(0) }
```

De comment erboven noemt het letterlijk "Maculis' handtekeningbeweging: een lens die rustig
scherpstelt, als mist die optrekt. Traag, organisch, geen overshoot, geen snap (1400 tot 1600ms)".

De reveal-demo doet hetzelfde inline: `filter: blur(10px) → blur(0px)` over
`1400ms cubic-bezier(.22,.61,.36,1)`.
Framer-motion wordt uitsluitend voor de nav en scroll-reveals (`LensReveal`) gebruikt.
Hoverbeweging is overal `-translate-y-0.5` over 300ms.

**FEIT.** `prefers-reduced-motion: reduce` zet alle animaties op `0.001ms` met `!important` en maakt
`.animate-lens-in` volledig zichtbaar en scherp. Volledige kill switch, correct.

### 2.14 Beeldtaal

**FEIT.** Geen fotografie. Geen illustraties. Nul afbeeldingsbestanden op de homepage. Alles is
CSS-licht, hairlines en concentrische vormen.
Het platformbeeld in `lenses.tsx` is een naaf: de organisatie als concentrische cirkel in het midden
(`h-28 w-28 rounded-full border-amber/40` met twee binnenringen), perspectieven als pillen links en
rechts, een `bg-radial-fade` gloed van 44x44 eromheen.

### 2.15 Responsive

**FEIT.** Mobile-first Tailwind. Sectieritme verdubbelt bij `sm`. De hero-grid klapt onder `lg` naar
één kolom. Nav wisselt bij `lg` naar hamburger. Touch-targets zijn expliciet `min-h-[44px]` of
`min-h-[48px]` op alle interactieve elementen in de hero en reveal-demo.

### 2.16 Signature-elementen

1. De blur naar scherp reveal.
2. Het concentrische lensmerkteken in drie schaalvarianten.
3. Amber als het enige accent, spaarzaam.
4. De asymmetrische twee-koloms compositie met een donker podium rechts.
5. De eyebrow met wijde uppercase tracking boven elke serif-kop.

---

## 3. Feitelijke inventaris: Lens (First Five Journey)

**Repo** `ftrprf-labs/maculis-first-five.` · branch `main` (`7a03c6d`).
**Stack (FEIT)** TypeScript op de server (`src/server/`, `src/engine/`, `src/live/`), en één
statisch HTML-bestand voor de volledige client: `public/index.html`, 2535 regels, met de complete
CSS inline op regel 14 tot 605 en de complete applicatielogica in een inline script vanaf regel 757.
Geen framework, geen buildstap voor de UI, geen externe stylesheet.
De Lens-logica zelf zit in `src/live/lenses/first-impression.ts`, met `pattern-gate.ts`,
`quality-gate.ts` en `gate.ts` als Reveal Gate.

### 3.1 Kleuren

**FEIT** `public/index.html` regel 15 tot 43.

| Token | Waarde |
|---|---|
| `--bg` | `#080503` warm bijna-zwart |
| `--bg-2` | `#0f0a06` |
| `--panel` | `#14120f` |
| `--amber` | `#c8894a` |
| `--amber-soft` | `#8a5f38` |
| `--gold` | `#d7b36a` |
| `--gold-light` | `#f3e387` |
| `--ink` | `#ece2d4` |
| `--ink-dim` | `rgba(236,226,212,.62)` |
| `--ink-faint` | `rgba(236,226,212,.34)` |
| `--line` | `rgba(200,137,74,.22)` |
| `--glow` | `rgba(200,137,74,.16)` |

De body is geen vlakke kleur maar een gerichte lichtbron:
`radial-gradient(120% 90% at 22% 42%, #17100a 0%, #0c0805 46%, var(--bg) 100%)`.

**Belangrijk onderscheid dat alleen hier bestaat.** Amber en goud zijn twee verschillende rollen.
De comment op regel 25 zegt het expliciet: `--gold` is "lichter primair highlight-goud = LICHT,
schaars gebruiken". Amber is de merkkleur, goud is het licht.

### 3.2 Typografie

**FEIT.**
`--serif: "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif`
`--sans: -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Helvetica,Arial,sans-serif`

Beide zijn **systeemstacks**. Geen enkele webfont wordt geladen. Dit is een bewuste keuze voor een
scherm dat over video moet renderen zonder flash of layout shift.

Typeschaal (FEIT, regel 33 tot 38):

| Token | Waarde |
|---|---|
| `--t-hero` | `clamp(29px, 5.6vw, 50px)` |
| `--t-statement` | `clamp(22px, 4vw, 32px)` |
| `--t-question` | `clamp(21px, 3.8vw, 30px)` |
| `--t-body` | `clamp(14px, 2.2vw, 17px)` |
| `--t-label` | `11px` |
| `--t-fine` | `clamp(13px, 2vw, 15px)` |

De comment vermeldt: "waarden == huidige componenten, dus migratie zonder visuele wijziging". Dit is
al voorbereid op harmonisatie.

Grammatica in gebruik (FEIT): **serif draagt vrijwel alles wat betekenis heeft**. Vragen, statements,
observaties, citaten, zelfs de knoplabels. Sans is beperkt tot labels, eyebrows, chips en
diagnostiek. Cursieve serif is consequent de stem van Maculis zelf (`.ask-sub`, `.look-words`,
`.out-lead`, `.obs-quote`, `.closing-line`).

### 3.3 Spacing

**FEIT.** `--s-1: 4px` · `--s-2: 8px` · `--s-3: 12px` · `--s-4: 16px` · `--s-5: 24px` ·
`--s-6: 40px` · `--s-7: 64px`.

### 3.4 Grid en layout

**FEIT.** Geen grid. Een stage-systeem: `.stage { position:absolute; inset:0 }` met exact één
`.live` tegelijk. Overgang via `opacity` plus `transform: scale(1.02) → scale(1)` over `--slow`
(1200ms). Content is gecentreerd met `width: min(620px, 86vw)` of `min(680px, 88vw)`.
Alleen `#stage-recognition`, `#stage-continuation` en `#stage-account` zijn top-verankerd en
scrollbaar met `margin-block: auto`, zodat lange inhoud niet wordt afgeknipt.

### 3.5 Radii

**FEIT.** `--r-sm: 10px` · `--r-md: 16px` · `--r-lg: 20px` · `--r-pill: 999px`.

### 3.6 Borders en hairlines

**FEIT.** Vrijwel alles is `1px solid var(--line)`, dus amber op 22 procent. Formuliervelden zijn
**onderstreept, niet omkaderd**: `.ask-field` en `.ptl-input` hebben alleen `border-bottom`.
Focus verandert de lijnkleur (`.ask-field:focus-within { border-color: rgba(200,137,74,.55) }`,
`.ptl-input:focus { border-bottom-color: var(--gold) }`).

Panelen krijgen bovenop een gouden lichtnaad:
```
.story::before, .ts::before {
  height: 1px;
  background: linear-gradient(90deg, rgba(215,179,106,0), rgba(215,179,106,.4), rgba(215,179,106,0));
}
```

### 3.7 Shadows en depth

**FEIT.** Diepte komt uit drie lagen, niet uit box-shadow op kaarten.

1. `#vignette` fixed, `radial-gradient(130% 110% at 30% 45%, transparent 40%, rgba(0,0,0,.55))`.
2. `#grain` fixed, inline SVG `feTurbulence fractalNoise baseFrequency .9`, `opacity: .045`,
   `mix-blend-mode: overlay`.
3. Panelen: `box-shadow: 0 22px 55px -32px rgba(0,0,0,.85)`, dus een zeer diffuse, ver uitgelopen
   slagschaduw zonder harde rand.

Glow-presets (FEIT):
`--glow-sm: 0 0 9px 2px rgba(215,179,106,.4)` ·
`--glow-md: 0 0 22px 5px rgba(215,179,106,.32)` ·
`--glow-lg: 0 0 34px 9px rgba(215,179,106,.46)`.

### 3.8 Buttons

**FEIT** regel 511 tot 521, de DS V1 seeds.

```
.btn-primary   serif, r-pill, padding .72em 2em, kleur #241708,
               background linear-gradient(180deg, #efd7a0 0%, var(--gold) 58%, #b0894a 100%),
               box-shadow var(--glow-md) + inset 0 1px 0 rgba(255,244,224,.5)
               hover: glow-lg + translateY(-1px)
.btn-secondary serif, transparent, 1px var(--line), r-pill, padding .55em 1.5em
.btn-link      serif, kleur var(--gold), border-bottom 1px rgba(215,179,106,.5)
```

Daarnaast oudere varianten die nog in gebruik zijn: `.rec-btn` (pil, transparant, 1px line),
`.link` (tekstknop in amber), `.fe-pick`, `.eval-yes` en `.eval-no` (identiek aan primary en link,
maar apart gedefinieerd).

### 3.9 Inputs

**FEIT.** Uitsluitend onderstreepte velden op transparante achtergrond, in serif, op grote schaal
(`#url` is `clamp(20px, 3.4vw, 28px)`). Placeholders in `--ink-faint`. Foutstaat is een
lijnkleurwijziging naar `#c98b6a`, nooit rood.

### 3.10 Cards en surfaces

**FEIT.** Twee panelen, `.story` en `.ts`, identiek opgebouwd:
`linear-gradient(180deg, var(--panel) 0%, rgba(8,5,3,.35) 100%)`, 1px `--line`, `--r-md`, de
diffuse schaduw, en de gouden bovennaad. Dat is het complete surface-systeem. Er zijn geen andere
kaarten.

### 3.11 Navigation

**FEIT.** Geen navigatie. Bewust. De enige permanente chrome is `#mark`, linksboven:
`font-family: var(--serif); letter-spacing: .32em; font-size: 12px; color: rgba(236,226,212,.30);
text-transform: uppercase; pointer-events: none`. En `#privlink` rechtsonder als watermerk op
`rgba(236,226,212,.26)`, 10px, `letter-spacing: .12em`.

### 3.12 Iconografie

**FEIT.** Vrijwel geen. Eén inline SVG voor "Waarom ik dit denk" (`.why-ic`, 14x14). Het merkteken
in de favicon is een oog: een lensvorm met pupil in `#c8894a` op `#080503`.
De echte iconografie is bewegend beeld: zes videobestanden (`first-encounter`, `looking`,
`eye-reveal-approach`, `eye-to-face`, `recognition`, `blink-to-black`) in mp4 en webm.

### 3.13 Status en badges

**FEIT.** Geen statussysteem in de UI. De enige badge-achtige elementen zijn `.fi-chip` en
`.ts-lens-count`, beide pillen met 1px lijn. `.ts-lens-count` is in goud op
`rgba(215,179,106,.34)`.
`.insp-tag` bestaat maar zit in het verborgen inspectiepaneel.

### 3.14 Motion

**FEIT.** Dit is het rijkste motion-systeem in het landschap.

| Naam | Definitie | Rol |
|---|---|---|
| `--ease` | `cubic-bezier(.22,.61,.36,1)` | overal |
| `--slow` | `1200ms` | stage-overgang |
| `rise` | `translateY(10px) → 0` plus opacity | tekst verschijnt |
| `breathe` | `scale(1) ↔ 1.035` over 14s | rustige drift op stilstaand beeld |
| `tsSharpen` | `blur(6px) + translateY(4px) → scherp` | domeinen komen in focus |
| `fiSharpen` | `blur(5px) → 0` over 1.1s | het gevoelswoord wordt scherp |
| `fiDotIn` | `scale(.15) → 1` over 1.5s met 1.6s delay | het lichtpunt landt |
| `fiBreath` | `scale(.92) ↔ 1.12` over 6s, oneindig | het lichtpunt ademt |
| `evalOrb` | glow pulseert over 6s, oneindig | de orb leeft |
| `sndPulse` | glow over 2.6s | luisteraffordance |

Timing is gelaagd en traag: de First Impression-sequentie loopt van 0.5s (label) via 0.95s (rail),
1.6s (lichtpunt), 2.7s (gevoelswoord) naar 3.4s (uitleg). Bijna vier seconden voor één moment.

**FEIT.** Volledig `prefers-reduced-motion` blok op regel 570 tot 580 dat elke animatie uitzet en
alles direct scherp en op eindpositie zet, inclusief de `--fi-pos` van het lichtpunt.

### 3.15 Responsive

**FEIT.** `@media (max-width: 640px)` verschuift de video-`object-position` van `28% 45%` naar
`32% 42%`, verlaagt `#mark` naar 10px en verplaatst de geluidsknop.
`@media (max-width: 440px)` klapt `.intent-grid` en `.ptl-grid` naar één kolom.
Alle typografie schaalt via `clamp()` en `vw`, dus er zijn nauwelijks breakpoints nodig.
`viewport-fit=cover` plus `env(safe-area-inset-*)` voor de notch.

### 3.16 Signature-elementen

1. **Het oog.** Video als hoofdbeeld, niet als decoratie.
2. **Het lichtpunt.** `.orb`, `.fi-dot`, `.story-sig-dot`, alle drie een radiale gradient van
   `#fff7e8` via `--gold-light` naar `--gold`, met dubbele glow.
3. **De emotionele rail.** `.fi-track`, 1px hoog, verloop van koel `rgba(158,174,196,.16)` naar warm
   `rgba(215,179,106,.5)`. Het lichtpunt landt op `--fi-pos`. Geen meter, geen score.
4. **De gouden bovennaad** op panelen.
5. **Grain plus vignette** als permanente sfeerlaag.
6. **Blur naar scherp** als onthullingsgebaar.

---

## 4. Feitelijke inventaris: Cockpit

**Repo** `ftrprf-labs/website` (naam misleidend, dit is niet de website).
**Stack (FEIT, `package.json`)** Node zonder framework, vanilla ES-modules op de client, één externe
dependency voor de UI-kant (geen). Drie los gestylede pagina's.

**FEIT.** De Cockpit is niet één omgeving maar vier oppervlakken met drie paletten:

| Oppervlak | Bestand | Palet |
|---|---|---|
| Testerbeheer plus Attention Cockpit plus Evaluaties | `public/index.html` plus `public/styles.css` | warm |
| Relationship Workspace | `public/workspace.html` (inline) | koel |
| Inbox | `public/comm.html` (inline) | koel |
| E-mailhandtekening | `server/comm/signature.mjs` | warm |

### 4.1 Kleuren, oppervlak A (`styles.css`)

**FEIT** regel 5 tot 35. `color-scheme: dark`.

| Token | Waarde | Comment in code |
|---|---|---|
| `--bg` | `#080503` | "Maculis #080503" |
| `--surface` | `#140e08` | cards, topbar, table |
| `--surface-2` | `#1d130b` | table header, row hover, inputs |
| `--surface-elevated` | `#251a10` | modals en dropdowns |
| `--border` | `rgba(200,137,74,0.18)` | "van Maculis --line" |
| `--border-strong` | `rgba(200,137,74,0.34)` | |
| `--text` | `#ece2d4` | "Maculis #ece2d4" |
| `--muted` | `#a89a86` | warme greige |
| `--primary` | `#c8894a` | Maculis amber |
| `--primary-hover` | `#e6a866` | |
| `--primary-text` | `#241606` | |
| `--danger` | `#e5674f` | |
| `--warn` | `#cf8a3c` | |
| `--ok` | `#4cae86` | |

De comment op regel 1 tot 3 is expliciet over de bedoeling: "Warm, dark, restrained. Clearly the
admin environment behind Maculis, but still a fast, scannable, functional tool. Not a copy of the
journey."

### 4.2 Kleuren, oppervlak B en C (`workspace.html`, `comm.html`)

**FEIT** `workspace.html` regel 10 tot 15, `comm.html` regel 10.

| Token | Waarde | Karakter |
|---|---|---|
| `--bg` | `#0b0c0f` | **koel** blauwzwart |
| `--panel` | `#14161b` | koel |
| `--panel2` | `#1b1e25` | koel |
| `--panel3` | `#22262f` | koel |
| `--line` | `#2a2e39` | **neutraal grijs, geen amber** |
| `--line2` | `#343a47` | neutraal grijs |
| `--ink` | `#ece2d4` | warm, gedeeld |
| `--dim` | `#9aa0ac` | **koel grijs** |
| `--faint` | `#6b7280` | koel grijs (Tailwind slate-500) |
| `--amber` | `#c8894a` | gedeeld |
| `--gold` | `#d7b36a` | gedeeld met de Lens |
| `--goldsoft` | `#e8cf97` | **bestaat alleen hier** |
| `--in` | `#26333f` | inkomend bericht, koel |
| `--out` | `#2e2a1c` | uitgaand bericht, warm |
| `--ok` | `#4f8a5b` | wijkt af van `styles.css` `#4cae86` |
| `--warn` | `#c98a4a` | wijkt af van `#cf8a3c` |
| `--bad` | `#b45b5b` | wijkt af van `--danger #e5674f` |
| `--priv` | `#8a3a63` | privacy-inbox, bestaat alleen hier |
| `--r` | `12px` | wijkt af van `--radius: 10px` |

`comm.html` mist `--r` en `--priv` in zijn `:root` en gebruikt daarom op regel 25 de inline fallback
`var(--priv,#8a3a63)`. **Dat is aantoonbaar kopieerdrift, geen ontwerpkeuze.**

Er is een warm eiland in het koele palet: `.aipanel` en `.cm.assistant` gebruiken `#171410` en
`#191510`, handmatige waarden die in geen enkele token staan.

### 4.3 Typografie

**FEIT.** Oppervlak A: `--serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua",
Georgia, serif`, identiek aan de Lens. Body is de systeem-sans op `14px / 1.45`.
De serif wordt spaarzaam en gericht ingezet: het woordmerk `.brand-mark` (19px, 700,
`letter-spacing: .14em`), de cockpit-kop `.cockpit-h1` (21px, 600), `.eval-sub`, `.history-sub`,
`.empty-state strong` en `.zero-text b`.

**FEIT.** Oppervlak B en C: **geen serif gedefinieerd en geen serif in gebruik**. Volledig sans.

Labels zijn overal `10px` tot `12px`, uppercase, `letter-spacing` tussen `.05em` en `.22em`.
De merkregel in workspace en comm is `font-size:13px; letter-spacing:.22em; font-weight:700;
color: var(--goldsoft)`.

### 4.4 Spacing en grid

**FEIT.** Geen spacing-tokens. Alle waarden zijn hardcoded in pixels.
Oppervlak A: topbar `12px 20px`, controls `14px 20px`, tabelcel `11px 12px`, cockpit `20px 22px`.
Oppervlak B: `.wrap { grid-template-columns: 340px 1fr }`, rail padding `20px 18px`, view padding
`24px 28px`.
Oppervlak C: `main { grid-template-columns: 320px 1fr 300px }`, dus een drie-koloms inbox.

### 4.5 Radii

**FEIT.** `--radius: 10px` (A) tegenover `--r: 12px` (B). In de praktijk staan er vijf waarden door
elkaar: `5px` (inline code), `6px` (kleine knoppen), `7px` (copy-knop), `8px` (knoppen, inputs,
tabs), `10px` (`--radius`, attn-card), `12px` (`--r`, berichten), `999px` (badges, pillen).

### 4.6 Borders

**FEIT.** A: uitsluitend amber-alpha hairlines. B en C: uitsluitend neutrale grijze lijnen.
Dit is het duidelijkste symptoom van de breuk.

### 4.7 Shadows en depth

**FEIT.** A: `--shadow: 0 1px 2px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.45)`, gebruikt op de
login-kaart, modals, toast en mobiele tabelkaarten.
De Attention Cockpit heeft de enige lichtlaag in het hele admin-oppervlak:
```
.cockpit { background:
  radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--primary) 6%, transparent), transparent 60%),
  var(--surface); }
```
**FEIT.** B en C hebben **geen enkele schaduw**. Diepte komt daar uitsluitend uit
`panel → panel2 → panel3` tonale stapeling.

### 4.8 Buttons

**FEIT.** A (`styles.css` regel 82 tot 113):
`.btn` 1px `--border-strong`, `--surface`, `padding 8px 14px`, `border-radius 8px`,
`transition .12s`, `:active { transform: translateY(1px) }`.
`.btn-primary` vlak `--primary` met `--primary-text`, `font-weight 600`.
`.btn-ghost` transparant.
Bijzonder detail op regel 106: `#btn-publish:not(:disabled), #btn-email-invite:not(:disabled)`
krijgen pas een amber contour zodra ze bruikbaar worden. Rustig tot het ertoe doet.

**FEIT.** B en C: `.btn` is een **pil** (`border-radius: 999px`), `padding 9px 16px`, hover wijzigt
alleen de randkleur naar amber.
`.btn.gold` is `linear-gradient(180deg, #efd7a0, var(--gold) 60%, #b0894a)` met `color: #241708`.
**Dat is exact de `.btn-primary` van de Lens.** Eén component is dus al identiek over twee
producten, per toeval of per kopie.

### 4.9 Inputs

**FEIT.** A: omkaderd, `1px --border-strong`, `border-radius 8px`, `background --surface-2`.
`input[type=checkbox] { accent-color: var(--primary) }` zodat selectie nooit browserblauw is.
B en C: `textarea` `border-radius 10px` op `--panel2` met `--line2`, `input` in de AI-balk is een
pil (`999px`).

### 4.10 Cards en surfaces

**FEIT.** A: `.eval-card`, `.dist-block`, `.open-item`, `.eval-tester`, `.funnel-stage`, allemaal
`background --surface; border 1px --border; border-radius --radius`. Consistent.
`.attn-card` wijkt bewust af: transparant met een `border-left: 2px` in de statuskleur, en wordt pas
zichtbaar bij hover. De hero-variant `.attn-card-hero` krijgt `--surface-2` plus een amber-gemengde
rand.
B: `.card { background var(--panel); border 1px var(--line); border-radius var(--r); padding 16px 18px }`.
Zelfde idee, andere waarden, ander palet.

### 4.11 Navigation

**FEIT.** A: horizontale tabs, `border-bottom: 2px` in `--primary` bij actief.
B: verticale rail van 340px, actief item `background --panel3` plus `box-shadow: inset 2px 0 0 var(--amber)`.
C: pil-tabs in de header, actief `border-color: var(--amber)`.
Drie verschillende navigatiepatronen voor dezelfde applicatie.

### 4.12 Iconografie

**FEIT.** A: inline SVG's van 18x18 in de rij-acties, plus **Unicode-glyphs als knoplabels**:
`✎ Template`, `⤓ Importeren`, `＋ Tester toevoegen`, `⇪ Publiceer naar Maculis`,
`➤ Via WhatsApp uitnodigen`. Dit is de enige plek in Maculis waar tekstsymbolen als iconen dienen.
B en C: geen iconen.

### 4.13 Status en badges

**FEIT.** Dit is het rijkste statussysteem in het landschap en het bestaat in twee onverenigbare
vormen.

Oppervlak A, lifecycle (`styles.css` regel 247 tot 252). `.status-badge` is
`border-radius 999px; border 1px color-mix(currentColor 35%); background color-mix(currentColor 12%)`,
dus de kleur wordt uit `currentColor` afgeleid:

| Status | Kleur |
|---|---|
| `DRAFT` | `--muted` |
| `SENT` | `--primary` amber |
| `OPENED` | `#7c3aed` **violet, de enige violet in heel Maculis** |
| `COMPLETED` | `--ok` |
| `DECLINED` / `ERROR` | `--danger` |

Consent, als onafhankelijke dimensie: `UNKNOWN --muted` · `OPTED_IN --ok` · `OPTED_OUT --danger`.

Attention, in de cockpit (regel 439 tot 443), uitsluitend als 2px linkerrand:
`REPLY_READY` amber 55% · `NEW` en `UNREAD` `--primary-hover` 45% · `NEEDS_ACTION` `--warn` 55% ·
`DELIVERY_PROBLEM` `--danger` 60%.
De comment op regel 438 legt de regel vast: "meaning is carried by the text label, colour only
supports it".

Oppervlak B en C, attention als gevulde pil met eigen achtergrond én voorgrond:
`new #2b3a4a / #9ec7e8` · `waiting_on_us #3a2f1a / --gold` · `ai_ready #2a2415 / --goldsoft` ·
`unknown_contact #3a2430 / #e79fc4` · `delivery_problem #3a1f1f / #e79a9a` ·
`waiting_on_contact #20262f / --dim`.

**Dezelfde attention-states, andere namen, andere kleuren, ander vormidioom.**

### 4.14 Motion

**FEIT.** A: `transition: .12s` op knoppen, `.16s` op attn-cards.
Eén echte animatie:
```
@keyframes attn-rise { from { opacity:0; transform: translateY(6px) } to { opacity:1; translateY(0) } }
.cockpit .attn-card { animation: attn-rise .34s cubic-bezier(0.22, 1, 0.36, 1) both }
```
met stagger op 0.03s, 0.06s, 0.10s, 0.14s. De hele blok zit in
`@media (prefers-reduced-motion: no-preference)`, dus reduced motion krijgt niets. Correct.

**Let op de easing.** `cubic-bezier(0.22, 1, 0.36, 1)` is **niet** de Maculis-ease
`cubic-bezier(.22, .61, .36, 1)`. Het tweede controlepunt verschilt (1 tegenover .61). Dit is de
standaard `easeOutQuint`, met een veel snellere start en een langere staart. Waarschijnlijk een
typefout of een los overgenomen snippet.

**FEIT.** B en C: `transition: opacity .2s` op de toast. Verder niets. Geen enkele andere beweging.

### 4.15 Responsive

**FEIT.** A, `@media (max-width: 760px)`: de tabel wordt kaarten via
`display: block` plus `td::before { content: attr(data-label) }`. De cockpit reduceert tot precies
één boodschap en één actie (`.cockpit-rest .attn-card:nth-child(n+2) { display: none }`). De funnel
stapelt verticaal en de pijlen verdwijnen. Touch-targets groeien naar 38px.
Dit is goed en zorgvuldig gedaan.
B, `@media (max-width: 900px)`: rail naar boven, alles één kolom.
C, `@media (max-width: 860px)`: **`.ctx { display: none }`**, de rechterkolom verdwijnt volledig op
mobiel. Andere breakpoint, andere strategie.

### 4.16 De e-mailhandtekening

**FEIT** `server/comm/signature.mjs`. Dit is een aparte merkdrager en de enige die in de inbox van
de klant landt.
`const GOLD = '#c8894a'; const DIM = '#8a8073';`
Table-based, inline styles, Outlook-veilig. Structuur: het oog links (72x45, animated GIF met
statische PNG-fallback), daarnaast een `border-left: 2px solid #c8894a` en de tekstblok.
Naam in `15px / 600 / GOLD`, daaronder `Maculis` plus cursieve payoff, daaronder contact op `12px`.
Payoff (FEIT, `signatureConfig`): `'Kijk nog eens.'`

`--dim #8a8073` bestaat verder nergens. Weer een eigen waarde voor hetzelfde begrip.

### 4.17 Signature-elementen

1. De Attention Cockpit met zijn radiale amber-gloed vanuit rechtsboven.
2. `.zero-mark`, een handgetekend vinkje in een cirkel, voor de zero-state "Je bent bij."
3. De 2px linkerrand als drager van attention-state.
4. Het knipogende oog in de e-mailhandtekening.
5. De `.row-attn` stip van 8px in de naamkolom.

---

## 5. Feitelijke inventaris: Mijn Maculis

**FEIT: er is geen code.**

Onderzocht en niet gevonden:

* Geen repository met deze naam in `ftrprf-labs` (6 repositories, alle geïnventariseerd).
* Geen branch in `maculis-first-five.` (19 branches) of `groeiplatform-website` (2 branches).
* Zoekactie op `Mijn Maculis`, `Intelligent Warmth`, `parchment`, `perkament` over
  `ftrprf-labs/website`, `maculis-first-five.` en `ftrlabs-docs`: **nul treffers**.
* Geen `De Spiegel`, geen `PRIVATE`/`SHARED` surface-model, geen signal field als component.
* `ftrprf-labs/websiteftrprflab` is een **volledig lege repository** (GitHub geeft
  "Git Repository is empty").

**FEIT.** `docs/BUILD_LOG.md` regel 28 tot 30 bevestigt dit als bewuste stand van zaken: de Attention
Cockpit is "een operationele baseline, NIET de definitieve toekomstige Maculis Home", en de Future
Cockpit wordt genoemd als toekomstige consument van de Communication Layer.

**Wat wel bestaat en er verwant aan is.** De Communication Layer in deze repo levert al de
primitieven waarop een reflectieomgeving zou draaien: `attentionOverview` (tenant-scoped, afgeleid),
het conversation-level leeswatermerk, bevestigde Relationship Memory, en kanaal-agnostische
adapters. Dat is de **datalaag** van Mijn Maculis, niet de visuele laag.

**Alles wat hierna over Mijn Maculis wordt gezegd, is ONTWERPADVIES.**

### 5.1 Wat het referentiebeeld toont, en hoe ik dat lees

Het referentiepaneel 3 toont: perkamentkleurige achtergrond, warme navy tekst, een editorial serif
kop met cursieve nadruk ("Jullie positionering wordt intern *niet overal* hetzelfde ervaren"), een
violet gloeiend signaalpunt, en daaronder een raster van vier reflectiekaarten met semantische
randen in groen, violet en zand.

**ONTWERPADVIES.** Dit is de enige van de vier panelen die een **licht** oppervlak toont, en dat is
precies wat het onderscheidt. De reflectieruimte is de plek waar je lang leest. Licht is daar
functioneel juist, niet alleen mooi.

En dat is bruikbaar, want **het lichte palet bestaat al** (zie 2.1, `:root` in `globals.css`).
`--paper: 40 33% 96%` is warm perkament. De ink-schaal is warm. Er hoeft geen nieuw palet te komen.

---

## 6. Visual DNA matrix

Classificatie: **A** gemeenschappelijk · **B** onnodige divergentie · **C** functioneel terecht
verschil · **D** sterk productspecifiek idee, mogelijk breder waardevol · **E** legacy of
technische schuld.

| # | Kenmerk | Website | Lens | Cockpit | Mijn Maculis | Klasse | Toelichting |
|---|---|---|---|---|---|---|---|
| 1 | Accentkleur `#c8894a` | ja | ja | ja | onbekend | **A** | Het sterkste gedeelde DNA. Identiek in alle vier de codebases plus de handtekening en favicons. |
| 2 | Tekstkleur `#ece2d4` | ja (88% lightness) | ja | ja (3x) | onbekend | **A** | Universeel. |
| 3 | Warme donkere basis | `24 40% 3%` | `#080503` | `#080503` (A) | n.v.t. | **A** | Voor website, Lens en Testerbeheer identiek van karakter. |
| 4 | Koele basis `#0b0c0f` | nee | nee | **ja (B, C)** | n.v.t. | **B** | Alleen in Workspace en Inbox. Geen functionele reden. Zie 1.4. |
| 5 | Neutraal grijze hairlines | nee | nee | **ja (B, C)** | n.v.t. | **B** | Amber-hairline is elders de regel. |
| 6 | Easing `cubic-bezier(.22,.61,.36,1)` | ja | ja | **nee** | onbekend | **B** | Cockpit gebruikt `(0.22,1,0.36,1)`. Vermoedelijk een fout. |
| 7 | Blur naar scherp als onthulling | ja (3x) | ja (2x) | nee | zou moeten | **A/D** | Al gedeeld tussen website en Lens. Sterkste kandidaat voor merkbreed. |
| 8 | Serif voor betekenis | Fraunces | Iowan Old Style | Iowan (A), **geen (B,C)** | zou moeten | **B** | Het principe is gedeeld. De letter niet. Zie beslissing 3. |
| 9 | Sans voor functie | Inter | systeem-sans | systeem-sans | onbekend | **A/B** | Principe gedeeld, uitvoering divergent. |
| 10 | Type-schaal als tokens | `display-1/2/3` | `--t-hero` tot `--t-fine` | **geen** | n.v.t. | **B/E** | Twee onafhankelijke schalen, plus één product zonder enige schaal. |
| 11 | Spacing-schaal als tokens | Tailwind | `--s-1` tot `--s-7` | **geen** | n.v.t. | **E** | Cockpit heeft uitsluitend hardcoded pixels. |
| 12 | Radius-schaal | `1/1.5/2/2.5rem` plus full | `10/16/20/999` | **5,6,7,8,10,12,999** | n.v.t. | **E** | Cockpit heeft zeven radii zonder systeem. |
| 13 | Pil-vormige primaire knop | ja | ja | **nee (A)**, ja (B, C) | n.v.t. | **B** | Testerbeheer gebruikt `8px`. Enige plek. |
| 14 | Gouden gradient-knop | nee | `.btn-primary` | `.btn.gold` **identiek** | n.v.t. | **A** | Al toevallig geharmoniseerd over twee producten. |
| 15 | Glow als licht, niet als schaduw | `shadow-glow` | `--glow-sm/md/lg` | `.cockpit` radial | onbekend | **A** | Concept gedeeld, waarden divergent. |
| 16 | Grain plus vignette | nee | **ja** | nee | mogelijk | **C/D** | Terecht alleen in de Lens: het draagt film. Op een tabel zou het ruis zijn. |
| 17 | Video als hoofdbeeld | nee | **ja** | nee | nee | **C** | De Journey is cinematografisch. Terecht uniek. |
| 18 | Geen navigatie | nee | **ja** | nee | nee | **C** | De Journey is een lineaire ervaring. Terecht. |
| 19 | Informatiedichtheid | laag | zeer laag | **hoog** | midden | **C** | Volledig terecht. Zie 10. |
| 20 | Statuskleuren | nauwelijks | geen | **rijk, 2 systemen** | zou moeten | **B/D** | Twee onverenigbare attention-systemen binnen één repo. |
| 21 | Violet `#7c3aed` | nee | nee | **ja, `OPENED`** | voorgesteld | **D** | De enige violet in Maculis. Zie 15 en beslissing 8. |
| 22 | Semantisch groen | `--ok 152 39% 49%` | nee | `#4cae86` (A), `#4f8a5b` (B) | voorgesteld | **B** | Drie verschillende groenen voor hetzelfde begrip. |
| 23 | Lichtpunt of orb | `LensDot`, `FocusRing` | `.orb`, `.fi-dot` | `.row-attn`, `.zero-mark` | signal field | **A/D** | Alle drie de producten hebben al een lichtpunt. Dit **is** het signal language, nog zonder naam. |
| 24 | Concentrische lensvorm | ja (3 varianten) | favicon, `.orb-halo` | nee | onbekend | **D** | Sterk merkteken, alleen op de website volledig uitgewerkt. |
| 25 | Asymmetrische compositie | **ja** (1.05/0.95, 0.82/1.18) | gecentreerd | links uitgelijnd | zou moeten | **C/D** | Website-specifiek en terecht, maar het principe is breder bruikbaar. |
| 26 | Onderstreepte formuliervelden | nee (pil) | **ja** | nee (omkaderd) | onbekend | **C** | In de Journey terecht: een vraag, geen formulier. |
| 27 | Licht oppervlak beschikbaar | **ja, ongebruikt** | nee | nee | zou moeten | **D** | Zie 25. Grootste latente kans. |
| 28 | Reduced motion volledig | ja | ja | ja (A), n.v.t. (B, C) | zou moeten | **A** | Consistent goed gedaan. Een echt gedeeld kwaliteitsniveau. |
| 29 | Kleur nooit enige signaaldrager | ja | n.v.t. | **ja, expliciet** | zou moeten | **A** | In `styles.css` als comment vastgelegd. Verdient merkbrede status. |
| 30 | Webfont geladen | **ja** (Inter, Fraunces, JetBrains) | nee | nee | onbekend | **B/C** | Zie beslissing 3. Op video is een systeemfont verdedigbaar. |
| 31 | Eyebrow boven kop | `tracking .18em` | `.story-eyebrow .2em`, `.ts-eyebrow .24em` | `.hero-eyebrow .08em` | n.v.t. | **A/B** | Patroon volledig gedeeld, tracking-waarden divergent. |
| 32 | Unicode-glyphs als iconen | nee | nee | **ja** (`⤓ ✎ ⇪ ➤`) | nee | **E** | Legacy. Inconsistent met lucide en inline SVG. |
| 33 | Handmatig gedupliceerd palet | nee | nee | **ja** (`comm.html` uit `workspace.html`) | n.v.t. | **E** | Aantoonbaar: `--r` en `--priv` ontbreken. |
| 34 | Design-tokens gedocumenteerd | comment in `globals.css` | comment in `index.html` | nee | nee | **E** | Twee bronnen, geen canon. Zie 1.3. |

Telling: **A 10** · **B 12** · **C 7** · **D 6** · **E 6**. Sommige regels dragen twee klassen.

**Lezing.** Het gedeelde DNA (A) is klein maar fundamenteel: kleur, tekstkleur, beweging, licht,
lichtpunt, toegankelijkheid. Het onnodige verschil (B) is groot maar oppervlakkig: waarden die uit
elkaar zijn gelopen bij gebrek aan een gedeelde bron. Het terechte verschil (C) is beperkt en
duidelijk toe te schrijven aan functie. Dat is een **gunstige verhouding**. Er is geen merkbreuk.
Er is een ontbrekende single source of truth.

---

## 7. Analyse referentieontwerpen

Ik analyseer de vier panelen plus de twee overzichtsstroken als art direction, niet als specificatie.

### 7.1 Waarom het premium voelt

Vier mechanismen, en ze zijn alle vier benoembaar.

**Licht als informatie, niet als versiering.** In elk paneel is er precies één lichtbron en die valt
op wat ertoe doet. Paneel 1 heeft de gouden kern van de constellatie. Paneel 3 heeft het violette
gloeipunt naast het inzicht. Nergens is er gloed op iets dat niet belangrijk is. **Dit principe zit
al in de code**: de comment in `globals.css` zegt "Amber is schaars: alleen voor wat aandacht
verdient", en de Lens zegt over `--gold`: "LICHT, schaars gebruiken".

**Ruimte als statusteken.** De hoeveelheid leegte rond de koppen is groter dan bij normale SaaS. Dat
leest als vertrouwen: iets wat weinig zegt en veel ruimte neemt, gedraagt zich als iets dat zeker is
van zichzelf. In code is dit `py-16 sm:py-32` op de website, en `margin-block: auto` centrering in de
Lens.

**Typografische rangorde in drie stappen, niet vijf.** Overal: kleine uppercase eyebrow, grote
serif-uitspraak, kleine sans-ondersteuning. Meer niveaus zijn er niet. Dat is waarom het rustig
oogt terwijl er veel staat.

**Hairline in plaats van schaduw.** De kaarten worden gescheiden door één lijn, niet door
gestapelde schaduwlagen. Diepte komt uit toonverschil, niet uit doen alsof er ruimte tussen zit.

### 7.2 Waar de wow vandaan komt

Niet uit de constellatie. Uit de **belofte van betekenis**. De grafiek in paneel 2 toont geknoopte
punten met labels als "Positionering, 12 signalen" en "Klantbeleving, 11 signalen". Dat suggereert
dat losse waarnemingen samen iets vormen. Dat is precies het productverhaal en het is precies wat
de Lens-code al doet: `story.ts`, `relations.ts`, `pattern-reader.ts` en `pattern-articulate.ts`
maken van signalen een verhaal.

De wow is dus geen visueel effect. Het is de visualisatie van een mechanisme dat al werkt.

### 7.3 Hoe licht wordt gebruikt

Drie niveaus, en ze zijn overneembaar.

1. **Kernlicht.** Eén gloeiend punt, verzadigd, met een halo van 3 tot 4 keer de eigen diameter.
   In code: `.fi-dot` in de Lens (`box-shadow: 0 0 13px 3px, 0 0 32px 10px`), `FocusRing` op de
   website.
2. **Veldlicht.** Een zeer wijde radiale gradient, laag in alpha, die het oppervlak richting geeft.
   In code: `bg-radial-fade` op de website (14% alpha), `.cockpit` in de admin (6% alpha), de
   body-gradient in de Lens.
3. **Randlicht.** Een 1px verloop bovenop een paneel. In code: `.story::before` en `.ts::before` in
   de Lens.

Alle drie bestaan al. Ze hebben alleen geen gedeelde naam.

### 7.4 Asymmetrie

De referentie gebruikt asymmetrie consequent: de tekst links, het bewijs rechts, en de verhouding is
nooit 50/50. De website doet dit al bewust (`1.05fr 0.95fr` en `0.82fr 1.18fr`). De Cockpit doet het
nergens. De Lens centreert bewust, want daar is er maar één ding.

### 7.5 Wat werkelijk Maculis voelt en wat concept-art is

**Werkelijk Maculis:**

* Het lichtpunt als drager van betekenis.
* De redactionele driedeling eyebrow, serif-uitspraak, sans-ondersteuning.
* Hairline plus tonaal verschil in plaats van schaduw.
* De cursieve nadruk binnen een serif-zin ("niet overal").
* De rustige, brede witruimte.
* Het lichte perkamentoppervlak voor lange leesmomenten.

**Alleen concept-art:**

* De constellatie als letterlijke netwerkgrafiek met verbindingslijnen en labels. Mooi als
  merkbeeld, onhoudbaar als datavisualisatie: hij is niet leesbaar bij meer dan ongeveer acht
  knopen, niet responsive, en de posities zouden betekenisloos zijn tenzij ze uit echte relatiedata
  komen. Nu zijn ze dat niet.
* De vier gekleurde bedrijfslogo's onderaan paneel 1. Dat is een klantenlogo-strook, een generiek
  SaaS-patroon, en het botst met "reveal before prescribe".
* De statusbadges `IN PROGRESS`, `REVIEW`, `PLANNED` in paneel 4. Engels, in hoofdletters,
  projectmanagement-idioom. Dat is niet de Maculis-stem.
* De teamplanning-kalender met avatars in paneel 4. Een generieke SaaS-widget zonder relatie tot het
  merkverhaal.
* De percentages en deltas (`+3 deze week`, `57%`, `+12% deze week`). Groeidashboard-taal. Maculis
  telt geen signalen, Maculis toont er één.

### 7.6 De drie lijsten

**1. MACULIS-BREED WAARDEVOL**

| Principe | Grond in de code |
|---|---|
| Licht in drie niveaus: kern, veld, rand | Bestaat al in alle drie de gebouwde producten, zonder naam. |
| Typografische driedeling eyebrow, serif, sans | Bestaat al op website en Lens. Cockpit heeft het half. |
| Hairline plus tonaal verschil in plaats van gestapelde schaduw | Lens en Cockpit doen dit al. |
| Blur naar scherp als hét onthullingsgebaar | Website en Lens delen dit al letterlijk. |
| Amber schaars, alleen voor wat aandacht verdient | Al vastgelegd als comment in `globals.css`. |
| Kleur nooit als enige signaaldrager | Al vastgelegd als comment in `styles.css` regel 438. |
| Trage, doelgerichte beweging zonder overshoot | Al de gedeelde ease in twee producten. |
| Het lichtpunt als merkatoom | Bestaat in alle drie de producten in drie vormen. |
| Ruime witruimte als teken van zekerheid | Website en Lens doen dit al. |

**2. SPECIFIEK VOOR MIJN MACULIS**

| Element | Waarom niet breed |
|---|---|
| Licht perkamentoppervlak als hoofdmodus | Werkt bij lang, contemplatief lezen. In de Lens zou het de film breken, in de Cockpit de scanbaarheid van dichte tabellen schaden. |
| De cursieve nadruk binnen een lange serif-zin | Vraagt zinnen van enige lengte. In een tabelrij is er geen zin om te benadrukken. |
| Het reflectieraster van gelijkwaardige kaarten met semantische randen | Vraagt om weinig, gelijkwaardige items. De Cockpit heeft er honderden en die zijn niet gelijkwaardig. |
| Atmosferisch, ademend signaalveld op de achtergrond | Passend bij reflectie. In de werkruimte is achtergrondbeweging afleiding. |
| `PRIVATE` en `SHARED` als zichtbaar oppervlakonderscheid | Alleen betekenisvol waar de klant zelf kiest wat gedeeld wordt. |

**3. NIET OVERNEMEN**

| Element | Reden |
|---|---|
| De netwerkgrafiek als letterlijke datavisualisatie | Schaalt niet, is niet responsive, posities zijn betekenisloos zonder echte relatiedata. Wel bruikbaar als statisch merkbeeld op de website. |
| Klantenlogo-strook | Generiek SaaS, botst met de merkhouding. |
| Engelse hoofdletter-statusbadges | Niet de stem. Maculis schrijft Nederlands en menselijk. |
| Percentages, deltas en weektrends | Groeidashboard-taal. Maculis toont één ding, niet een score. |
| Teamplanning met avatars | Geen relatie tot het merkverhaal. |
| Navy als kleur | Zie 1.6 en beslissing 1. |
| Vier bijna gelijke KPI-tegels naast elkaar | De Cockpit heeft dit patroon al (`.eval-card`) en het is daar het zwakste onderdeel. Niet uitbreiden. |

---

## 8. Wat al werkelijk Maculis-breed voelt

Samengevat uit 6, klasse A.

1. **Amber `#c8894a`.** In elke codebase, in de handtekening, in elke favicon. Dit is het merk.
2. **Ivoor `#ece2d4`.** Identiek in drie producten.
3. **De warme donkere basis.** `#080503` in de Lens en Testerbeheer, `24 40% 3%` op de website.
4. **Blur naar scherp.** Website en Lens, letterlijk hetzelfde gebaar met dezelfde ease.
5. **Licht als informatie.** Glow is nergens decoratief. Overal gereserveerd voor betekenis.
6. **Het lichtpunt.** Drie producten, drie namen, één vorm.
7. **De gouden gradient-knop.** `.btn-primary` in de Lens en `.btn.gold` in de Cockpit zijn
   letterlijk identiek.
8. **Serif draagt betekenis, sans draagt functie.** Als principe overal aanwezig.
9. **Toegankelijkheid als kwaliteitsniveau.** `prefers-reduced-motion` volledig afgehandeld in alle
   drie de producten. Kleur nooit als enige signaal, expliciet vastgelegd.
10. **De toon.** Alle zichtbare copy is Nederlands, menselijk, terughoudend, eerlijk over
    onzekerheid ("Ik kan hier nog niet scherp genoeg kijken", "Liever eerlijk dan indrukwekkend",
    "Je bent bij."). Dat is een gedeelde stem en zij is sterker dan het visuele systeem.

---

## 9. Waar onnodige divergentie zit

Op volgorde van ernst.

1. **Het koele palet in Workspace en Inbox.** Zie 1.4. Eén product, twee temperaturen, geen reden.
2. **`comm.html` als handmatige kopie van `workspace.html`.** Aantoonbaar: `--r` en `--priv`
   ontbreken. Elke toekomstige wijziging moet twee keer.
3. **Twee onverenigbare attention-systemen** binnen dezelfde repo, op dezelfde data (`styles.css`
   `attn-*` als linkerrand tegenover `workspace/comm` `att-*` als gevulde pil, met andere namen).
4. **Drie groenen voor "goed"**: `#4cae86`, `#4f8a5b`, `152 39% 49%`.
   Drie oranjes voor "let op": `#cf8a3c`, `#c98a4a`, `32 60% 52%`.
   Drie roden: `#e5674f`, `#b45b5b`, `9 74% 60%`.
5. **De easing in de Cockpit**, `cubic-bezier(0.22, 1, 0.36, 1)` in plaats van
   `cubic-bezier(.22, .61, .36, 1)`. Eén cijfer, en de beweging voelt anders.
6. **Twee serifs**, Fraunces en Iowan Old Style, plus twee schermen zonder serif.
7. **Zeven radiuswaarden** in de Cockpit zonder schaal, tegenover twee gedefinieerde schalen elders.
8. **Geen spacing-tokens** in de Cockpit, terwijl de Lens een complete schaal heeft.
9. **Twee type-schalen** die hetzelfde doen (`display-1/2/3` en `--t-hero`/`--t-statement`).
10. **Eyebrow-tracking** varieert van `.08em` tot `.24em` zonder patroon.
11. **`--muted` heeft vier waarden**: `#a89a86`, `#9aa0ac`, `#8a8073`, `35 16% 59%`.
12. **Unicode-glyphs als iconen** in Testerbeheer.

Punten 1 tot 5 zijn de enige die een gebruiker daadwerkelijk merkt. De rest is onderhoudslast.

---

## 10. Waar verschillen functioneel terecht zijn

Deze verschillen moeten blijven. Ze zijn geen drift maar functie.

| Verschil | Waar | Waarom terecht |
|---|---|---|
| Geen navigatie | Lens | De Journey is een lineaire, cinematografische ervaring. Navigatie zou de dramaturgie breken. |
| Video als hoofdbeeld | Lens | Het oog is de ontmoeting. Dat kan geen stilstaand beeld zijn. |
| Grain en vignette | Lens | Ze dragen film. Op een tabel met veertig rijen zou dit ruis zijn en de leesbaarheid schaden. |
| Systeemfonts | Lens | Een webfont zou over video een flash of layout shift geven op precies het verkeerde moment. |
| Onderstreepte formuliervelden | Lens | Het is een vraag in een gesprek, geen invoerformulier. |
| Zeer lage informatiedichtheid | Lens | Eén moment per scherm is het hele ontwerp. |
| Hoge informatiedichtheid | Cockpit | Dit is een werkinstrument. Vier regels per scherm zou het onbruikbaar maken. |
| Compacte transities van 0.12s | Cockpit | Bij herhaald gebruik per dag is 1200ms onverdraaglijk. De duur mag verschillen, de curve niet. |
| Tabel die kaarten wordt onder 760px | Cockpit | Correcte oplossing voor dichte data op mobiel. |
| Drie-koloms inbox | Cockpit | Lijst, gesprek, context is het juiste patroon voor deze taak. |
| Asymmetrische twee-koloms compositie | Website | Redactioneel. Past bij verleiden en positioneren. |
| Webfonts | Website | De publieke merkexpressie mag een eigen letter dragen en heeft geen video-timingprobleem. |
| Scroll-gedreven reveals | Website | Er is een scrollende pagina. Elders niet. |
| SEO, JSON-LD, Open Graph | Website | Alleen daar relevant. De andere drie zijn `noindex`. |

---

## 11. Maculis Design Language V1: voorstel

**ONTWERPADVIES vanaf hier tot en met 22. Nog niets implementeren.**

### 11.0 De kernstelling

Maculis heeft geen nieuw design system nodig. Maculis heeft een **geschreven** design system nodig
van wat er al is, plus drie correcties.

Het bewijs staat in 1.3 en 1.5: de tokens bestaan al twee keer, de kleur is al universeel, de
beweging is al gedeeld. Wat ontbreekt is een canon en een vindplaats.

### 11.1 A. Brand foundations

**Merktemperatuur.** Warm. Zonder uitzondering. De hele ink-schaal ligt tussen hue 24 en 40. Er is
geen koele kleur in Maculis en die zou er niet moeten komen. Dit sluit navy uit, en het sluit ook de
huidige `#0b0c0f` in Workspace en Inbox uit.

**Kleurwereld.** Drie kleuren en verder niets:
* **Ink**, warm bijna-zwart tot warm ivoor. Een doorlopende schaal, niet twee losse waarden.
* **Amber `#c8894a`**, het signaal. Schaars.
* **Goud `#d7b36a`**, het licht. Nog schaarser dan amber.

Semantische kleuren staan hier bewust buiten. Zie 15.

**Typografie.** Twee stemmen. Serif spreekt, sans wijst. Zie 13.

**Witruimte.** Ruim, en ruimer naarmate de uitspraak zwaarder weegt. Witruimte is in Maculis een
retorisch middel, geen restwaarde.

**Vorm.** Rond waar het menselijk is (pillen, cirkels, lichtpunten), recht waar het functioneel is
(panelen, tabellen). Nooit scherpe hoeken.

**Diepte.** Uit toon en licht, niet uit gestapelde schaduw. Eén hairline, één tonale stap, eventueel
één zeer diffuse slagschaduw. Nooit drie schaduwlagen.

**Iconografie.** Lijnen, open vormen, één lijndikte. Concentrische cirkels zijn het merkmotief. Geen
gevulde iconen, geen Unicode-glyphs.

**Motion.** Traag, doelgericht, geen overshoot. Zie 17.

**Beeldtaal.** Licht, hairline en beweging. Geen stockfotografie. Geen illustraties. Bewegend beeld
is voorbehouden aan de Journey.

**Toon.** Nederlands. Menselijk. Terughoudend. Eerlijk over wat niet zeker is. Nooit
percentagetaal. En, permanent: **geen koppeltekens of gedachtestreepjes als stijlmiddel** in
zichtbare copy (zie `CLAUDE.md`).

### 11.2 Waarom dit geen uniformiteit oplevert

De vier ruimtes verschillen straks nog steeds in oppervlak (donker of licht), dichtheid, tempo,
compositie en de aanwezigheid van beeld. Wat ze delen is de grammatica, niet de zin.

---

## 12. Core token architecture

**ONTWERPADVIES. Conceptueel. Nog niet implementeren.**

Voorstel: één bron, drie lagen. Laag 1 en 2 zijn merkbreed. Laag 3 is per product.

### Laag 1: primitieven

```
color.ink.950   #080503   canonieke Maculis-achtergrond, al in Lens en Cockpit
color.ink.900   #0f0a06
color.ink.800   #14100c   themeColor van de website
color.ink.700   #1d130b
color.ink.600   #251a10
color.ink.300   #8a8073
color.ink.200   #a89a86
color.ink.100   #ece2d4   canonieke Maculis-tekstkleur
color.ink.50    #f7f1e6   perkament, licht oppervlak

color.amber.500 #c8894a   HET signaal. Onveranderlijk.
color.amber.400 #e6a866   hover
color.amber.700 #8a5f38   gedempt
color.gold.500  #d7b36a   licht
color.gold.300  #f3e387   kern van het licht
color.gold.700  #b0894a   onderkant van de gradient
```

### Laag 2: semantische aliassen

```
surface.base         het veld waarop alles staat
surface.raised       paneel, kaart
surface.elevated     modal, dropdown
surface.reflective   licht perkament, alleen voor lang lezen

text.primary         ink.100 op donker, ink.950 op licht
text.secondary       62% van primary
text.quiet           34% van primary

border.hairline      amber op 18%
border.defined       amber op 34%
border.semantic      de statuskleur op 35%

light.core           het lichtpunt, glow-sm
light.field          de radiale veldgloed, 6% tot 14%
light.edge           de 1px bovennaad op een paneel

radius.sm    10px    knop, chip
radius.md    16px    paneel, kaart
radius.lg    20px    podium
radius.pill  999px   pil, badge, lichtpunt

space.1  4    space.2  8    space.3  12   space.4  16
space.5  24   space.6  40   space.7  64

motion.ease      cubic-bezier(.22, .61, .36, 1)
motion.micro     120ms    hover, focus (Cockpit)
motion.enter     340ms    element verschijnt
motion.reveal    1400ms   blur naar scherp
motion.stage     1200ms   scherm wisselt (Lens)
```

De primitieve waarden komen letterlijk uit de bestaande code. Alleen `ink.50` en `ink.800` zijn
nieuw, en `ink.800` is de bestaande `themeColor` van de website.

### Laag 3: product-overrides

Elk product mag `surface.*`, de dichtheid en de motion-duur binden aan andere waarden. Geen enkel
product mag `color.amber.500`, `motion.ease` of de type-grammatica overschrijven.

### Waar dit zou moeten wonen

**ONTWERPADVIES.** Vier codebases, twee talen (CSS custom properties en Tailwind HSL), geen build-
pipeline in de Lens en Cockpit. Een npm-pakket is daarom niet praktisch. Voorstel: één bestand met
tokens in een neutraal formaat (JSON of platte CSS custom properties) in `ftrlabs-docs` onder
`03-ux/`, plus een gegenereerde `maculis-tokens.css` die de Lens en Cockpit letterlijk kunnen
inline-plakken en die de website via `globals.css` importeert. Dat vraagt geen buildstap in twee van
de vier producten.

Dit is beslissing 6 in 26.

---

## 13. Typography grammar

**ONTWERPADVIES.** Eén grammatica, vier temperaturen.

### De drie rollen

| Rol | Letter | Wanneer |
|---|---|---|
| **Uitspraak** | serif, regular of light, negatieve tracking | Wat Maculis ziet, denkt of vraagt. De reveal, de kop, het inzicht, de vraag. |
| **Aanwijzing** | sans, uppercase, wijde tracking, klein | Eyebrow, label, kolomkop, kanaal, status. Wijst waar je bent, zegt zelf niets. |
| **Functie** | sans, regular | Bodycopy, tabelinhoud, formulier, knop in een werkomgeving, metadata. |

Plus één modifier: **cursieve serif is de stem van Maculis zelf**. In alle vier de producten al zo
in gebruik (`.ask-sub`, `.out-lead`, `.obs-quote` in de Lens; `font-display italic` op de website).

### De regel die de grammatica draagt

**Serif is nooit decoratief.** Als er serif staat, staat er iets wat Maculis heeft waargenomen,
gedacht of gevraagd. Overal waar dat niet zo is, staat sans. Dat is waarom `.cockpit-h1` terecht
serif is ("Twee gesprekken wachten op jou" is een waarneming) en de tabelkoppen terecht sans zijn.

### Schaal

Één schaal, vier gebruiken:

| Stap | Waarde | Website | Lens | Cockpit | Mijn Maculis |
|---|---|---|---|---|---|
| `hero` | `clamp(2.55rem, 6.2vw, 6.75rem)` | ja | nee | nooit | nee |
| `statement` | `clamp(1.95rem, 4.6vw, 4.25rem)` | ja | `--t-hero` | nooit | ja |
| `insight` | `clamp(1.55rem, 3.2vw, 2.85rem)` | ja | `--t-statement` | de cockpit-kop | ja, de hoofdrol |
| `body` | `clamp(14px, 2.2vw, 17px)` | ja | ja | 14px vast | ja |
| `fine` | `clamp(13px, 2vw, 15px)` | ja | ja | 12.5px vast | ja |
| `label` | `11px`, uppercase, `tracking .16em` | ja | ja | ja | ja |

**Voorstel:** `tracking` op labels standaardiseren op `.16em`, met `.22em` gereserveerd voor het
woordmerk. Nu lopen de waarden van `.08em` tot `.32em` zonder patroon.

De Cockpit gebruikt bewust vaste pixels in plaats van `clamp()`, want vloeiende typografie in een
dichte tabel maakt kolombreedtes onvoorspelbaar. Dat is een terecht productverschil.

### De open beslissing

Fraunces of Iowan Old Style. Zie beslissing 3 in 26.

---

## 14. Surface and depth grammar

**ONTWERPADVIES.** Vier oppervlakken, en elk oppervlak heeft precies één betekenis.

| Oppervlak | Wat het betekent | Waar |
|---|---|---|
| `surface.base` | Het veld. De ruimte waarin gekeken wordt. | Overal de bodem. |
| `surface.raised` | Iets is samengevat. Dit hoort bij elkaar. | Kaart, paneel, gespreksblok. |
| `surface.elevated` | Dit vraagt nu je aandacht en niets anders. | Modal, dropdown, sheet. |
| `surface.reflective` | Hier lees je lang. Hier denk je na. | Licht perkament. Mijn Maculis, mogelijk de website. |

### De diepte-regels

1. **Eén hairline of één schaduw. Nooit beide op hetzelfde element.**
   De Lens doet dit al goed: `.story` heeft een lijn plus één zeer diffuse schaduw en verder niets.
2. **Diepte komt uit toon, niet uit afstand.** `base → raised → elevated` is één tonale stap per
   niveau. Maximaal drie niveaus.
3. **Schaduw is diffuus of hij is er niet.** `0 22px 55px -32px rgba(0,0,0,.85)` uit de Lens is de
   canonieke vorm: ver uitgelopen, geen zichtbare rand.
4. **Licht is geen schaduw.** Glow gaat naar buiten, is amber of goud, en is voorbehouden aan
   betekenis.

### De drie lichtniveaus

Uit 7.3, met bestaande waarden:

| Niveau | Definitie | Gebruik |
|---|---|---|
| `light.core` | `0 0 9px 2px rgba(215,179,106,.4)` | Het lichtpunt. Maximaal één per scherm. |
| `light.field` | `radial-gradient(..., amber 6% tot 14%, transparent)` | Geeft een oppervlak richting. |
| `light.edge` | `1px linear-gradient(90deg, gold 0, gold .4, gold 0)` | Markeert de bovenkant van een paneel. |

**De regel die dit systeem beschermt:** geen enkel product vindt een eigen kaartsysteem uit. Als een
scherm een nieuw oppervlak nodig heeft, is dat een wijziging aan de grammatica, niet aan het scherm.
Dat is precies wat er in de Cockpit is misgegaan.

---

## 15. Semantic color grammar

**ONTWERPADVIES, en hier wijk ik af van de brief.**

De brief stelt voor: violet is ontwikkeling of spanning, jade is consistentie of bevestiging,
ice of slate is gedeeld, zand is privé, koper is samenwerking. Ik heb dit tegen de code getoetst en
beoordeel het als **gedeeltelijk overneembaar**.

### Wat er nu werkelijk is

**FEIT.** De Cockpit heeft twee semantische systemen. Lifecycle
(`DRAFT / SENT / OPENED / COMPLETED / DECLINED / ERROR`) en attention
(`NEW / UNREAD / NEEDS_ACTION / REPLY_READY / WAITING_FOR_CUSTOMER / RESOLVED / DELIVERY_PROBLEM`).
Plus consent (`UNKNOWN / OPTED_IN / OPTED_OUT`). Drie onafhankelijke dimensies. Dat is een goed
model en het is bewust zo ontworpen (zie `BUILD_LOG.md`).

**FEIT.** Violet `#7c3aed` bestaat al in Maculis, precies één keer, voor `OPENED`. En
`--priv: #8a3a63` bestaat voor de privacy-inbox.

### Mijn beoordeling per voorstel

| Voorstel | Oordeel | Reden |
|---|---|---|
| violet = ontwikkeling of spanning | **overnemen, met correctie** | Er is al violet voor `OPENED`, en "geopend maar nog niet afgerond" **is** een tussenstaat. De betekenis klopt. Maar `#7c3aed` is een koude, verzadigde Tailwind-violet die niet in het warme palet past. Voorstel: hem warmer en gedempter maken en als `semantic.emerging` opnemen. |
| jade = consistentie of bevestiging | **overnemen** | Er zijn al drie groenen voor precies dit begrip. Eén jade die past bij de warme schaal lost dat op. |
| ice of slate = gedeeld | **niet overnemen** | Dit is de enige koele kleur in het voorstel en zij is precies wat de Cockpit nu ziek maakt. Gedeeld tegenover privé is bovendien geen kleurvraag maar een oppervlakvraag. Voorstel: `SHARED` krijgt een normaal oppervlak, `PRIVATE` krijgt een zichtbaar ander oppervlak plus een label. Zie hieronder. |
| zand = privé | **overnemen als oppervlak, niet als kleur** | Privé moet je aan het oppervlak zien, niet aan een randkleurtje. Een zandkleurige tint als `surface` voor privé-inhoud is sterker dan een badge, en werkt ook zonder kleurwaarneming. |
| koper = samenwerking | **niet overnemen** | Koper is `#c8894a`, en dat is het merksignaal. Als koper ook "samenwerking" gaat betekenen, verliest amber zijn enige betekenis. Dit is de belangrijkste regel in het hele systeem en ik zou hem niet opgeven. |

### Voorstel

```
amber            HET SIGNAAL. Nooit semantisch. Nooit "samenwerking", nooit "in behandeling".
                 Alleen: hier moet je kijken.

semantic.confirmed   jade, warm en gedempt      bevestigd, consistent, afgerond, opt-in
semantic.emerging    violet, warm en gedempt    in ontwikkeling, spanning, geopend, nog niet af
semantic.attention   oker                       vraagt handeling
semantic.broken      warm rood                  mislukt, geblokkeerd, opt-out

surface.private      zandkleurige tint          privé-inhoud, zichtbaar aan het oppervlak
```

Vier semantische kleuren. Niet meer. En de regel uit `styles.css` regel 438 wordt merkbreed:
**kleur ondersteunt de betekenis, het tekstlabel draagt haar.**

### Waarom dit merkbreed logisch is

Bevestigd, in ontwikkeling, vraagt aandacht en gebroken zijn geen Cockpit-begrippen. Ze gelden voor
een uitnodiging, voor een observatie in de Lens, voor een inzicht in Mijn Maculis en voor een
levering in de Inbox. De namen zijn abstract genoeg om vier keer te kloppen, en concreet genoeg om
niet leeg te zijn.

---

## 16. Signal language

**ONTWERPADVIES.** Dit is het onderdeel waarvan ik denk dat het werkelijk merkbreed kan worden,
omdat het al in alle drie de producten bestaat zonder dat iemand het zo heeft genoemd.

### De grammatica

Vier trappen. Elke omgeving gebruikt de trappen die bij haar functie horen, in dezelfde volgorde,
met dezelfde visuele taal.

| Trap | Vorm | Betekenis |
|---|---|---|
| 1. **Signaal** | Een lichtpunt. `light.core`. | Er is iets waargenomen. Losstaand. |
| 2. **Relatie** | Twee punten plus een 1px verbinding, of twee waarnemingen naast elkaar. | Deze twee horen bij elkaar. |
| 3. **Patroon** | Meerdere punten met gedeelde richting, of een rail waarop iets landt. | Dit herhaalt zich. |
| 4. **Inzicht** | Serif-uitspraak, met de punten eronder als bewijs. | Dit betekent iets. |

**FEIT: trap 1 bestaat al drie keer.** `.orb` en `.fi-dot` in de Lens, `LensDot` en `FocusRing` op de
website, `.row-attn` in de Cockpit. Alle drie zijn een klein rond lichtpunt in amber of goud.

**FEIT: trap 2 bestaat al twee keer**, maar typografisch in plaats van grafisch: de reveal-demo op de
website zet twee citaten naast elkaar en noemt dat een tegenstrijdigheid, en `.story-signals` in de
Lens toont waarnemingen als rijen met een gouden marker.

**FEIT: trap 4 bestaat al twee keer.** `.story-headline` in de Lens en de reveal-kop op de website.

Trap 3 is de enige die nog nergens bestaat. Dat is waar de constellatie uit het referentiebeeld
thuishoort, en alleen daar.

### De vier intensiteiten

| Omgeving | Intensiteit | Concreet |
|---|---|---|
| **Website** | Expressief, merkbeeld | Trap 1 tot 4 volledig zichtbaar, als verhaal. Hier mag de constellatie als **statisch merkbeeld** verschijnen, want hij illustreert het mechanisme en hoeft geen data te dragen. Bestaat deels al: het lenzen-naafbeeld. |
| **Lens** | Analytisch, signalerend | Trap 1 tot 4, maar één per moment en altijd met bron. De rail met het landende lichtpunt is trap 3 in de meest gereduceerde vorm. Bestaat al. |
| **Mijn Maculis** | Reflectief, atmosferisch | Trap 4 leidt, trap 1 tot 3 zijn er als achtergrond en als bewijs. Het signaalveld ademt maar dringt niet aan. Beweging in seconden, niet in milliseconden. |
| **Cockpit** | Zeer subtiel, functioneel | Alleen trap 1. Eén stip van 8px in de naamkolom, één 2px linkerrand. Nooit trap 2 of 3, want dat zou suggereren dat de Cockpit interpreteert. De Cockpit toont, hij duidt niet. Bestaat al en is correct. |

### De regel die dit beschermt

**Nooit hetzelfde plaatje.** De grammatica is gedeeld, de uitdrukking niet. Een gebruiker die van
Mijn Maculis naar de Cockpit gaat, moet het lichtpunt herkennen zonder dezelfde grafiek te zien.

---

## 17. Motion grammar

**ONTWERPADVIES.** Vrijwel volledig gebaseerd op wat er al is.

### De curve

Eén curve: `cubic-bezier(.22, .61, .36, 1)`.

**FEIT:** al gedeeld tussen de website en de Lens. De Cockpit gebruikt
`cubic-bezier(0.22, 1, 0.36, 1)`, wat vrijwel zeker een fout is (één cijfer verschil, en het is de
generieke `easeOutQuint`).

### De duur

De duur verschilt per product. De curve nooit.

| Token | Duur | Waar |
|---|---|---|
| `motion.micro` | 120ms | Hover en focus in de Cockpit. Bestaat al. |
| `motion.enter` | 340ms | Een element verschijnt. Bestaat al (`attn-rise`). |
| `motion.reveal` | 1400ms | Blur naar scherp. Bestaat al op de website. |
| `motion.stage` | 1200ms | Een scherm wisselt. Bestaat al in de Lens (`--slow`). |
| `motion.breathe` | 6s tot 14s | Een lichtpunt of oppervlak ademt. Bestaat al (`fiBreath`, `evalOrb`, `breathe`). |

### De vier gebaren

1. **Rise.** `translateY(6px tot 10px)` plus opacity. Content verschijnt, hij ploft niet.
   Bestaat al in beide (`rise`, `attn-rise`).
2. **Sharpen.** `blur(5px tot 14px)` naar `blur(0)`. Het onthullingsgebaar. Uitsluitend voor iets
   wat Maculis heeft gezien. Nooit voor een menukaart die opengaat.
3. **Land.** `scale(.15)` naar `scale(1)` op een lichtpunt, met vertraging. Trap 1 van het signal
   language. Bestaat al (`fiDotIn`).
4. **Breathe.** Zeer traag, oneindig, alleen op licht. Nooit op tekst, nooit op een knop.

### Wat Maculis niet doet

Geen bounce. Geen spring. Geen elastische overshoot. Geen skeleton shimmer. Geen constante
achtergrondbeweging in een werkomgeving. Geen parallax. Geen beweging die alleen bestaat om te laten
zien dat er beweging is.

### De regel

**Beweging draagt betekenis of zij bestaat niet.** Als je niet kunt benoemen wat een animatie
betekent, hoort zij er niet.

En, merkbreed en niet onderhandelbaar: **`prefers-reduced-motion` schakelt alles uit en zet alles op
de eindtoestand.** Dit is in alle drie de producten al correct geïmplementeerd en dat mag nooit
verwateren.

---

## 18. Component DNA

**ONTWERPADVIES.** Geen gedeelde componentbibliotheek. Wel gedeelde familiegelijkenis.

De reden om geen bibliotheek af te dwingen is praktisch en hard: de Lens is één HTML-bestand zonder
buildstap, de Cockpit is vanilla ES-modules, de website is Next.js met Tailwind en cva. Eén
bibliotheek zou twee van de vier producten dwingen tot een herbouw. Dat is precies wat niet moet.

### Wat een Maculis-component herkenbaar maakt

| Component | Familiekenmerken |
|---|---|
| **Button, primair** | Pil-vorm. Warm, verzadigd oppervlak. Donkere tekst erop. Hover is een lift van 1 tot 2px, nooit een schaalsprong. In een merkcontext een gouden gradient met glow, in een werkcontext vlak amber. **De gradientvariant bestaat al identiek in de Lens en de Cockpit.** |
| **Button, secundair** | Transparant. Eén hairline. Dezelfde pil-vorm. Hover verandert alleen de randkleur naar amber. Bestaat al in drie producten. |
| **Button, tertiair** | Alleen tekst, met een 1px onderlijn die bij hover van kleur verandert. Bestaat al (`.link`, `.btn-link`). |
| **Card of paneel** | Eén hairline. Eén tonale stap ten opzichte van de bodem. `radius.md`. Optioneel één gouden bovennaad wanneer het paneel iets onthult. Nooit meerdere schaduwlagen. |
| **Status** | Vorm draagt de soort, kleur ondersteunt de ernst, **tekst draagt altijd de betekenis**. Pil in een dichte context, linkerrand in een rustige context. |
| **Navigation item** | Rustig in ruststand. Actief is een amber markering aan één zijde (onder- of linkerrand), nooit een gevuld blok. Bestaat al in drie varianten en die zijn onderling verenigbaar. |
| **Modal of sheet** | `surface.elevated`. Warme, gedempte scrim (`rgba(4,2,1,.62)` bestaat al). Optioneel een lichte blur. Nooit puur zwart. |
| **Empty state** | Ontworpen, niet leeg. Een serif-regel die iets menselijks zegt, plus één actie. **Het beste voorbeeld staat al in de code**: `.cockpit-zero`, "Je bent bij.", met een handgetekend vinkje. Dat is de standaard. |
| **Insight surface** | Serif-uitspraak leidt. Bewijs staat eronder, ingesprongen achter een 1px rail. Bron is altijd bereikbaar. Bestaat al twee keer (`.story-ev`, de reveal-demo). |
| **Collaboration surface** | Nog niet ontworpen. Voorstel: onderscheid loopt via oppervlak (privé is zandkleurig, gedeeld is normaal), nooit via een kleurcodering alleen. |
| **Input** | Twee legitieme vormen. Onderstreept wanneer het een vraag in een gesprek is (Lens). Omkaderd met `radius.sm` wanneer het een formulier is (Cockpit, website). Focus is altijd amber. |

---

## 19. Product expression: Website

**SHARED DNA.** Warme ink-schaal. Amber als enig accent. Serif spreekt, sans wijst. Blur naar scherp
als onthulling. Licht in drie niveaus. `motion.ease`. Concentrisch lensmerkteken.

**PRODUCT EXPRESSION.**

* **Temperatuur:** expressief, verleidend, positionerend. De voordeur.
* **Oppervlak:** donker, met de grootste sprong in typografische schaal van alle vier. `display-1`
  loopt tot 6.75rem en bestaat alleen hier.
* **Compositie:** asymmetrisch en redactioneel. `1.05fr 0.95fr`, `0.82fr 1.18fr`. Bewust nooit
  50/50.
* **Dichtheid:** laag. `py-16 sm:py-32` per sectie. Eén idee per sectie.
* **Motion:** scroll-gedreven. `lens-in` op 1600ms met gestaffelde vertragingen. De traagste
  entree-beweging van alle vier, want hier is tijd.
* **Beeld:** geen fotografie. Licht, hairlines en concentrische vormen. Hier mag de constellatie
  als statisch merkbeeld verschijnen (zie 16).
* **Uniek en terecht:** webfonts, SEO en gestructureerde data, scroll-reveals, de enige plek met een
  echte navigatie en footer.

**Wat de website van de anderen kan leren.** Zie 21 en 22.

---

## 20. Product expression: Lens

**SHARED DNA.** Identieke ink-basis `#080503`. Identieke amber. Identieke ease. Blur naar scherp.
Het lichtpunt. Serif spreekt.

**PRODUCT EXPRESSION.**

* **Temperatuur:** onderzoekend, scherp, nieuwsgierig, cinematografisch. De observatieruimte.
* **Oppervlak:** het donkerste van alle vier, en het enige met een gerichte lichtbron in de body
  (`radial-gradient at 22% 42%`). Plus grain en vignette als permanente laag.
* **Compositie:** gecentreerd, één moment per scherm, `min(620px, 86vw)`. Geen navigatie.
* **Dichtheid:** de laagste. Vaak één vraag, één zin, één keuze.
* **Motion:** de rijkste. Stage-overgangen van 1200ms, gelaagde sequenties tot bijna 4 seconden,
  ademende lichtpunten. Beweging is hier dramaturgie.
* **Beeld:** bewegend beeld is de hoofdrol. Het oog.
* **Uniek en terecht:** geen navigatie, systeemfonts, onderstreepte velden, grain en vignette, video.

**Wat de Lens al bijdraagt aan het geheel.** De complete tokenseed (zie 1.3), de gouden gradient-knop
die de Cockpit al deelt, het lichtpunt in zijn meest uitgewerkte vorm, en de emotionele rail als
voorbeeld van "toon een gevoel zonder een meter te tekenen".

---

## 21. Product expression: Cockpit

**SHARED DNA.** In oppervlak A al vrijwel volledig: `#080503`, `#ece2d4`, `#c8894a`, amber
hairlines, dezelfde serif als de Lens, de gouden gradient-knop.

**PRODUCT EXPRESSION.**

* **Temperatuur:** intelligent, functioneel, kalm onder dichtheid. De werkruimte.
* **Oppervlak:** dezelfde ink-familie, maar met **minder atmosfeer**. Geen grain, geen vignette,
  geen gerichte lichtbron. Precies één lichtveld, op de Attention Cockpit, op 6 procent. Dat is de
  juiste dosering.
* **Compositie:** links uitgelijnd, dicht, tabelgericht. Drie kolommen in de Inbox, een rail van
  340px in de Workspace.
* **Dichtheid:** de hoogste, en terecht. Rijhoogte 11px verticaal, basis 14px op 1.45.
* **Motion:** de snelste. 120ms micro-transities, één `attn-rise` van 340ms met stagger. Dat is de
  juiste keus voor een instrument dat je twintig keer per dag opent.
* **Beeld:** geen. Terecht.
* **Uniek en terecht:** tabel die kaarten wordt onder 760px, drie-koloms inbox, hoge
  informatiedichtheid, snelle transities, rijk statussysteem.

**Waar de Cockpit nu breekt.** Niet in zijn functionele karakter, maar in zijn samenhang: drie
paletten, twee attention-systemen, zeven radii, geen spacing-tokens, de afwijkende ease, en geen
serif in twee van de drie schermen. Zie 9 en 23.

Belangrijk om vast te houden: **oppervlak A is goed.** De Attention Cockpit is aantoonbaar met zorg
ontworpen (de zero-state, de linkerrand-statuslogica, de comment "colour only supports it", de
mobiele reductie tot één boodschap en één actie). Dat is geen legacy. Dat is het model waarnaar B en
C zich zouden moeten voegen.

---

## 22. Product expression: Mijn Maculis

**ONTWERPADVIES. Er is geen code.**

**SHARED DNA.** Alles uit 11.1. Zelfde ink-familie, zelfde amber, zelfde ease, zelfde
typografische grammatica, zelfde lichtniveaus, zelfde signal language.

**PRODUCT EXPRESSION, voorstel.**

* **Temperatuur:** warm, persoonlijk, contemplatief, betekenisgevend. De reflectieruimte.
* **Oppervlak:** **het enige product met een licht hoofdoppervlak.** `surface.reflective`, warm
  perkament. Niet omdat het mooi is, maar omdat hier lang gelezen wordt en licht daar functioneel
  juist is. Donkere accentpanelen mogen erin staan als contrapunt, zoals het referentiebeeld toont.
* **Compositie:** redactioneel. Eén inzicht per keer, groot, met bewijs eronder. Dichter dan de
  Lens, ruimer dan de Cockpit.
* **Dichtheid:** midden. Meer dan de Lens, veel minder dan de Cockpit.
* **Motion:** traag en ademend. Dichter bij de Lens dan bij de Cockpit. `motion.reveal` en
  `motion.breathe` horen hier. `motion.micro` niet.
* **Signaalveld:** trap 4 leidt, trap 1 tot 3 zijn achtergrond en bewijs. Atmosferisch, ademend,
  nooit aandringend.
* **Privé tegenover gedeeld:** via oppervlak, niet via kleurcodering. Zie 15.

**Waarom dit niet als een ander merk voelt.** Omdat het lichte oppervlak uit dezelfde warme
ink-schaal komt (hue 24 tot 40), de amber identiek is, de serif dezelfde is en de beweging dezelfde
curve volgt. Licht en donker binnen één warme familie is geen merkbreuk. Warm en koel binnen één
product wel, en dat is precies wat er nu in de Cockpit gebeurt.

**En dit is het belangrijkste voordeel:** Mijn Maculis hoeft niet gemigreerd te worden. Het kan als
eerste product volledig binnen het systeem worden geboren en daarmee het bewijs zijn dat het systeem
werkt.

---

## 23. Impactanalyse bestaand werk

**ONTWERPADVIES.** Geen big-bang. Inschatting van waar het werk zit, niet van hoeveel uur.

### Level 0, niet aanraken

| Wat | Waarom |
|---|---|
| De hele Lens visueel | Functioneel correct, visueel het sterkste, en het draagt al de DS V1 seed. Bevroren pipeline. Alleen de tokens later herbenoemen. |
| De volledige website-compositie | Correct en al binnen het systeem. |
| Oppervlak A van de Cockpit, structureel | Het amber-warme palet, de Attention Cockpit, de mobiele reductie, de zero-state, de statuslogica. Dit is het model. |
| Alle `prefers-reduced-motion` blokken | Overal correct. |
| De e-mailhandtekening | Werkt, is getest in echte clients, en gebruikt de juiste amber. Alleen `--dim #8a8073` later als token. |
| Alle server- en datalogica | Volledig buiten scope. |

### Level 1, token harmonisatie

Kleur, letter, radius, rand, schaduw, spacing. Geen structuurwijziging.

| Product | Omvang | Wat |
|---|---|---|
| **Website** | **klein** | Tokens hernoemen naar de canon. `--signal` en `--amber` zijn nu dubbel. Verder is alles al correct. |
| **Lens** | **klein** | De seed is er al. `--gold`, `--panel`, `--s-*`, `--r-*`, `--t-*` hernoemen. De comment zegt zelf dat de waarden gelijk zijn aan de componenten, dus migratie zonder visuele wijziging. |
| **Cockpit A** | **klein tot midden** | Ease corrigeren, radii terugbrengen naar de schaal, semantische kleuren gelijktrekken, spacing-tokens introduceren. |
| **Cockpit B en C** | **groot** | Het volledige koele palet vervangen door het warme. Dit is de grootste enkele post in het hele plan en tegelijk de grootste winst. |
| **Mijn Maculis** | **n.v.t.** | Bestaat niet. Wordt in het systeem geboren. |

### Level 2, component harmonisatie

| Product | Omvang | Wat |
|---|---|---|
| Website | klein | Nauwelijks iets. Badge-varianten uitlijnen met de semantische canon. |
| Lens | klein | De oude knopvarianten (`.rec-btn`, `.eval-yes`, `.eval-no`, `.fe-pick`) laten samenvallen met de DS V1 seeds. Puur opruimen. |
| Cockpit A | midden | Eén statuscomponent in plaats van drie (`.status-badge`, `.attn-card` rand, `.row-attn`). Unicode-glyphs vervangen door inline SVG. |
| Cockpit B en C | **groot** | De twee attention-systemen samenvoegen tot één. Serif introduceren waar betekenis staat. Navigatiepatronen op één lijn brengen. |
| Mijn Maculis | n.v.t. | |

### Level 3, compositie

| Product | Omvang | Wat |
|---|---|---|
| Website | geen | Compositie is correct. |
| Lens | geen | Compositie is de kern van het product. Niet aanraken. |
| Cockpit A | klein | Mogelijk de KPI-tegelrij (`.eval-card`) heroverwegen, het zwakste patroon in het product. |
| Cockpit B | midden | Als serif en hiërarchie erin komen, verandert de leesvolgorde van de Workspace. Dit vraagt een echte ontwerpslag, geen tokenwissel. |
| Mijn Maculis | n.v.t. | Volledig nieuw ontwerp, maar dat is bouwen, geen migreren. |

### Level 4, fundamenteel herontwerp

**Voorstel: nergens.** Geen enkel bestaand scherm heeft een fundamenteel herontwerp nodig. Dat is een
gunstige uitkomst en de belangrijkste reden om niet in een big-bang te denken.

De enige echte kandidaat is `comm.html` en `workspace.html`, en die vallen op Level 1 plus 2 als de
palet- en componentbeslissingen eenmaal genomen zijn.

### Zwaartepunt

Ruwweg: **65 procent van al het werk zit in Cockpit B en C.** Dat is één repository, twee bestanden,
intern publiek, nul merkrisico en nul publieke zichtbaarheid. Dat is de gunstigst denkbare
verdeling.

---

## 24. Migratiestrategie

### 24.1 De hypothese getoetst

De hypothese was: **Website plus Mijn Maculis eerst**, omdat de website de publieke merkdrager is en
Mijn Maculis de nieuwe klantbeleving.

**Ik spreek die tegen, op twee gronden.**

**Grond 1. Mijn Maculis kan niet eerst, want het bestaat niet.** Harmoniseren veronderstelt twee
dingen die uit elkaar lopen. Er is hier maar één ding. Mijn Maculis eerst zetten betekent in de
praktijk: het systeem definiëren en dan Mijn Maculis bouwen. Dat is niet stap 1 van een migratie,
dat is stap 3.

**Grond 2. De website is al het verst.** Zij draagt al de warme ink-schaal, de correcte amber, de
gedeelde ease, de blur naar scherp, en zelfs de geschreven token-canon in `globals.css`. Level 1 is
daar klein en Level 2 en 3 zijn nul. De website eerst harmoniseren levert weinig op, want zij is al
grotendeels in het systeem.

**Waar de hypothese wel klopt:** de website is inderdaad de juiste **bron** voor de canon. Alleen
niet het eerste **doel** van de migratie.

### 24.2 Voorgestelde volgorde

**Stap 0. Stop de divergentie. Nu, en zonder code.**

Eén regel die vanaf vandaag geldt: geen nieuw scherm, in geen enkel product, definieert een eigen
`:root` met eigen kleuren. Wie een waarde nodig heeft die er niet is, agendeert dat als
systeemwijziging.

Dit is de goedkoopste maatregel in het hele plan en hij voorkomt dat het probleem groeit terwijl we
het oplossen. `comm.html` is het bewijs dat dit nodig is.

**Stap 1. Schrijf de canon op.**

De "Design Constitution, 12 wetten" wordt in `globals.css` als bestaand aangehaald maar bestaat
nergens. Schrijf hem. Plus de tokentabel uit 12. Voorstel voor de vindplaats: `ftrlabs-docs`
`03-ux/principles/` en `03-ux/specifications/`, twee mappen die nu leeg zijn en precies hiervoor
bedoeld zijn.

Geen code. Alleen tekst. Dit is wat er echt ontbreekt.

**Stap 2. Cockpit interne consolidatie. Het eerste echte migratiedoel.**

Waarom eerst:
* Grootste opbrengst. Hier zit ongeveer 65 procent van al het werk en de enige divergentie die een
  gebruiker binnen één klik voelt.
* Nul merkrisico. Volledig intern publiek, `noindex`, geen klant ziet dit.
* Perfecte proef op de som. Als de tokens een koel palet niet naar warm kunnen brengen zonder de
  bruikbaarheid te schaden, deugt de canon niet. Dat wil je weten vóórdat je Mijn Maculis bouwt.
* Oppervlak A is al het doelbeeld. Er hoeft niets uitgevonden te worden.

Volgorde binnen deze stap: eerst `workspace.html` en `comm.html` naar het warme palet (Level 1),
dan de twee attention-systemen samenvoegen (Level 2), dan pas de compositie van de Workspace
(Level 3).

**Stap 3. Website plus Lens token-alignment.**

Beide dragen al een tokenseed. Deze stap is grotendeels hernoemen, plus één echte beslissing: de
serif (beslissing 3). Samen vormen zij de complete publieke keten, en de website-hero
her-implementeert nu al de reveal uit de Journey. Ze horen bij elkaar en horen samen te bewegen.

**Stap 4. Mijn Maculis wordt in het systeem geboren.**

Geen migratie. Het eerste product dat vanaf regel één de canon volgt, inclusief het lichte
`surface.reflective`, het volledige signal language en de semantische kleuren. Dat maakt het meteen
de beste referentie-implementatie.

**Stap 5. Terugkoppeling.**

Wat in Mijn Maculis werkt en breed blijkt te gelden, gaat terug naar de canon en daarna naar de
andere drie. Nooit andersom: een product mag niet zelf besluiten dat zijn vondst merkbreed is.

### 24.3 Wat expliciet niet gebeurt

Geen big-bang. Geen gedeelde componentbibliotheek die twee producten tot herbouw dwingt. Geen enkele
wijziging aan functionele code, routes, API's, database, privacylogica, Context Layer, Lens-logica of
Communication Layer. Geen deploy tijdens de tokenfase.

---

## 25. Top 15 ontwerpregels voor alle Maculis-omgevingen

**ONTWERPADVIES. Ter vaststelling.**

1. **Maculis is warm.** Elke kleur ligt in de warme helft. Er komt geen koele grijstint en geen navy
   in. Wat nu koel is (`#0b0c0f`, `#2a2e39`, `#9aa0ac`) is een fout, geen keuze.
2. **Amber `#c8894a` is het signaal en betekent niets anders.** Nooit een status, nooit een
   categorie, nooit "samenwerking". Alleen: hier moet je kijken. En daarom schaars.
3. **Goud is licht, geen kleur.** `#d7b36a` verschijnt als gloed, als randlicht en als lichtpunt.
   Nooit als vlak.
4. **Serif spreekt, sans wijst.** Als er serif staat, staat er iets wat Maculis heeft waargenomen,
   gedacht of gevraagd. Cursieve serif is de stem van Maculis zelf.
5. **Blur naar scherp is het onthullingsgebaar en het is exclusief.** Alleen voor iets wat Maculis
   heeft gezien. Nooit voor een menu, een tab of een laadtoestand.
6. **Eén curve: `cubic-bezier(.22, .61, .36, 1)`.** De duur mag per product verschillen, de curve
   nooit. Geen bounce, geen spring, geen overshoot.
7. **Beweging draagt betekenis of zij bestaat niet.** Kun je niet benoemen wat een animatie
   betekent, dan hoort zij er niet.
8. **Diepte komt uit toon en licht, niet uit gestapelde schaduw.** Eén hairline of één diffuse
   schaduw. Nooit beide op hetzelfde element, nooit drie lagen.
9. **Kleur ondersteunt betekenis, tekst draagt haar.** Elke status heeft een leesbaar label. Kleur
   is nooit de enige drager. Dit staat al in `styles.css` en wordt hierbij merkbreed.
10. **`prefers-reduced-motion` schakelt alles uit en zet alles op de eindtoestand.** Niet
    onderhandelbaar. Al overal correct.
11. **Witruimte is retoriek.** Hoe zwaarder de uitspraak, hoe meer ruimte eromheen. Ruimte is nooit
    restwaarde.
12. **Geen product vindt zijn eigen kaartsysteem, statussysteem of palet uit.** Een nieuw oppervlak
    is een wijziging aan de grammatica, niet aan het scherm.
13. **Maculis toont één ding, niet een score.** Geen percentages, geen weektrends, geen deltas, geen
    gauges. Als je meer hebt gezien, zeg dat in woorden.
14. **Geen fotografie, geen illustraties.** Het beeld is licht, hairline en beweging. Bewegend beeld
    is voorbehouden aan de Journey.
15. **Geen koppeltekens of gedachtestreepjes als stijlmiddel in zichtbare copy.** Permanent, in alle
    vier de omgevingen. Zie `CLAUDE.md`.

---

## 26. Open ontwerpbeslissingen die jouw akkoord nodig hebben

Deze elf punten kan ik niet uit de code afleiden. Ze vragen een merkbeslissing.

**1. Navy: in of uit?**
De brief en het referentiebeeld noemen navy voor Mijn Maculis. In Maculis bestaat geen navy; de
enige navy in de organisatie is `#0B2545` in Praktijk Groeiscan, een ander product.
**Mijn advies: uit.** Maculis is warm, en dat is aantoonbaar consistent over vier codebases. Navy
introduceren is een merkwijziging, geen harmonisatie. De warmte die het referentiebeeld uitstraalt
komt van het perkament, niet van het navy.

**2. Licht oppervlak: activeren?**
Er ligt een compleet, warm, perkamentkleurig licht palet in `groeiplatform-website/src/app/globals.css`
op `:root`, dat nooit wordt aangezet omdat `layout.tsx` `className="dark"` hardcodeert.
**Mijn advies: activeren als `surface.reflective`,** eerst voor Mijn Maculis. Dit is de goedkoopste
route naar de warmte van het referentiebeeld en er hoeft geen kleur voor bedacht te worden.
Vervolgvraag: krijgt de website ook een licht thema of blijft die bewust donker?

**3. Welke serif wint?**
Fraunces (webfont, alleen website) of Iowan Old Style (systeemstack, Lens en Cockpit A).
Overwegingen: Fraunces is een variabele webfont met veel expressie, maar kost een netwerkverzoek en
is op video riskant. Iowan is gratis, direct, en al in twee producten in gebruik, maar is een
Apple-systeemfont waardoor Windows terugvalt op Palatino of Georgia, wat merkbaar anders oogt.
**Mijn advies:** Fraunces als merkletter voor website en Mijn Maculis, Iowan als systeemfallback voor
Lens en Cockpit, en de type-schaal en het gebruik identiek houden zodat de grammatica klopt ook als
de letter verschilt. Dat is een compromis en jij moet zeggen of dat acceptabel is.

**4. Amber en goud: twee of één?**
De Lens onderscheidt ze expliciet (amber is merk, goud is licht). De website heeft `--signal` en
`--amber` met dezelfde waarde en gebruikt geen goud.
**Mijn advies: twee houden,** want het onderscheid signaal tegenover licht is betekenisvol en het
bestaat al. Maar dan moet de website goud toevoegen, en moet `--signal` als duplicaat verdwijnen.

**5. Het koele palet in Workspace en Inbox: vervangen of behouden?**
Ik heb geen enkele functionele reden gevonden en de aanwijzingen wijzen op drift.
**Mijn advies: vervangen door het warme palet uit `styles.css`.** Maar dit is de grootste enkele
verandering in het plan, dus ik wil het bevestigd hebben voordat het gepland wordt. Is er een reden
die niet in de code staat?

**6. Waar woont de canon?**
Voorstel: `ftrlabs-docs` `03-ux/principles/` en `03-ux/specifications/`, plus een gegenereerde
`maculis-tokens.css` die de Lens en Cockpit kunnen inline-plakken zonder buildstap.
Akkoord, of hoort dit ergens anders?

**7. De "Design Constitution, 12 wetten": bestaat die ergens buiten de code?**
`globals.css` verwijst ernaar als bestaand document. Ik heb hem nergens gevonden. Is er een versie
buiten Git (Notion, document, hoofd) die ik moet gebruiken als bron, of schrijven we hem vanaf de 15
regels in 25?

**8. Violet: seed of toeval?**
`#7c3aed` bestaat één keer, voor `OPENED`. De brief stelt violet voor als "ontwikkeling of spanning".
Dat is inhoudelijk hetzelfde begrip.
**Mijn advies:** bewust maken als `semantic.emerging`, maar de waarde warmer en gedempter maken zodat
hij in de warme familie past. Akkoord?

**9. Krijgt Mijn Maculis een eigen repository?**
De Communication Layer levert al de datalaag (`attentionOverview`, leeswatermerk, Relationship
Memory). De vraag is of Mijn Maculis daarbovenop in `ftrprf-labs/website` komt of als nieuwe repo.
**Mijn advies: nieuwe repo,** want `ftrprf-labs/website` draagt al vier oppervlakken en een
misleidende naam.

**10. Repositorynamen: hernoemen?**
`ftrprf-labs/website` bevat niet de website. `ftrprf-labs/groeiplatform-website` bevat wel de
Maculis-website. `ftrprf-labs/websiteftrprflab` is leeg.
Dit heeft deze audit aantoonbaar vertraagd en zal elke toekomstige sessie of nieuwe medewerker
vertragen. Hernoemen breekt remotes en deploy-hooks, dus het is geen gratis actie.
**Mijn advies: wel doen, maar apart plannen.** Beslissing bij jou.

**11. De constellatie: merkbeeld of datavisualisatie?**
**Mijn advies:** uitsluitend als statisch merkbeeld op de website. Als datavisualisatie schaalt hij
niet en zouden de posities betekenisloos zijn, want er is geen relatiedata die ze zou kunnen
bepalen. Akkoord?

---

## 27. Bevestiging: er is niets gewijzigd of gedeployed

Ik bevestig expliciet, en dit is verifieerbaar in de git-historie:

* **Geen codewijziging.** Geen enkel `.mjs`, `.ts`, `.tsx`, `.js`, `.html` of `.sql` bestand is
  aangeraakt, in geen van de zes repositories.
* **Geen CSS-wijziging.** `public/styles.css`, de inline styles in `workspace.html`, `comm.html` en
  `public/index.html` van de Journey, en `globals.css` van de website zijn uitsluitend gelezen.
* **Geen design tokens geïmplementeerd.** Alle tokens in 12 zijn conceptueel en staan alleen in dit
  document.
* **Geen component-refactor.** Geen nieuwe frontend-library.
* **Geen routes, API, database of migraties gewijzigd.**
* **Geen privacylogica, Context Layer, Lens-logica, Cockpit-logica of Mijn Maculis-functionaliteit
  gewijzigd.**
* **Geen deploy. Geen productie.** Geen enkele deploy getriggerd, geen omgevingsvariabele gewijzigd.
* **Geen "snelle verbeteringen" alvast doorgevoerd.** Ook niet de ease-fout in de Cockpit, ook niet
  het ontbrekende `--r` in `comm.html`, hoewel beide eenregelige correcties zijn.

**De enige wijziging in de hele sessie is dit document**, toegevoegd als
`docs/MACULIS_VISUAL_DNA_AUDIT.md` op branch `claude/maculis-visual-dna-audit-9ilkir`. Dat volgt het
bestaande patroon in deze repo van documentatie-commits zonder codewijziging (zie `b316087`,
"docs: record Communication Layer scope & ownership boundary (no code change)").

Vier repositories zijn read-only gekloond in `/workspace` voor analyse. Daar is niets in gewijzigd
en niets uit gepusht.

---

## Bijlage A: onderzochte bronnen

| Repository | Rol | Branch en commit | Status |
|---|---|---|---|
| `ftrprf-labs/website` | Cockpit, Testerbeheer, Communication Layer | `claude/maculis-visual-dna-audit-9ilkir` vanaf `a29564e` | volledig geïnventariseerd |
| `ftrprf-labs/groeiplatform-website` | **de publieke Maculis-website** | `main` `0c67887` | volledig geïnventariseerd |
| `ftrprf-labs/maculis-first-five.` | Lens, de First Five Journey | `main` `7a03c6d` | volledig geïnventariseerd |
| `ftrprf-labs/ftrlabs-docs` | governance en documentatie | `main` `38bbb5d` | doorzocht, geen designdocumentatie gevonden |
| `ftrprf-labs/growth-os` | Praktijk Groeiscan, **ander product** | `main` | als reality check bekeken, niet een van de vier |
| `ftrprf-labs/websiteftrprflab` | leeg | n.v.t. | geverifieerd leeg |

## Bijlage B: de belangrijkste bestanden per omgeving

**Website**
`src/app/globals.css` (tokens en de token-canon in de comment) ·
`tailwind.config.ts` (schaal, radii, shadows) ·
`src/app/layout.tsx` (fonts, forced dark) ·
`src/components/ui/{button,card,badge,input,table}.tsx` ·
`src/components/sections/site-nav.tsx` ·
`src/components/sections/maculis/{hero,reveal-demo,lenses,principles}.tsx`

**Lens**
`public/index.html` regel 14 tot 605 (complete CSS, inclusief de DS V1 seed op regel 24 tot 43 en
509 tot 528) · `src/live/lenses/first-impression.ts` · `src/live/pattern-gate.ts` ·
`src/engine/gate.ts`

**Cockpit**
`public/styles.css` (oppervlak A, de Attention Cockpit vanaf regel 386) ·
`public/workspace.html` regel 9 tot 122 (oppervlak B) ·
`public/comm.html` regel 9 tot 67 (oppervlak C) ·
`public/index.html` (structuur) ·
`server/comm/signature.mjs` (de e-mailhandtekening)

**Mijn Maculis**
Geen.
