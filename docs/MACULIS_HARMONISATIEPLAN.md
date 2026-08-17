# Maculis Harmonisatieplan

**Van vier gegroeide kamers naar één canon.**
2026-08-17 · Status: ter goedkeuring · Er wordt niets uitgevoerd voordat dit plan is goedgekeurd.

Canon: `MACULIS_VISUAL_DNA_V1.0.md` (vastgesteld).
Feitelijke basis: `MACULIS_VISUAL_DNA_AUDIT.md`.
Visueel ijkpunt: `maculis-visual-north-star.html`.

---

## 1. De vijf uitgangspunten van dit plan

1. **Geen big bang.** Vijf fasen met een expliciete poort ertussen. Elke fase is los waardevol en
   los terug te draaien.
2. **Geen herbouw.** Geen gedeelde componentbibliotheek, geen framework-wissel, geen refactor van
   werkende code. Twee van de vier producten hebben bewust geen buildstap en dat blijft zo.
3. **Functionele code blijft ongemoeid.** Routes, API's, datamodel, migraties, privacylogica,
   Context Layer, Lens-logica en de Communication Layer worden niet aangeraakt.
4. **Het goedkoopste werk eerst, waar niemand het ziet.** De grootste post zit intern. Daar wordt
   ook bewezen of de tokens deugen, voordat er iets publieks mee gebeurt.
5. **Bewijs boven vertrouwen.** Waar een wijziging visueel niets hoort te veranderen, wordt dat
   aangetoond met een pixelvergelijking en niet met een oordeel.

---

## 2. Wat expliciet niet wordt aangeraakt

| Wat | Waarom |
|---|---|
| De Lens-dramaturgie: stage-systeem, video, gates, pipeline | Bevroren en functioneel geaccepteerd |
| De Attention Cockpit als concept en compositie | Dit is het model waar de rest naartoe beweegt, niet het doelwit |
| `.cockpit-zero`, de zero-state | Canoniek voorbeeld van signature 5 |
| De e-mailhandtekening | Werkt, getest in echte clients, gebruikt de juiste koper |
| Alle `prefers-reduced-motion`-blokken | Overal al correct |
| De toon van alle zichtbare copy | Al gedeeld en sterker dan het visuele systeem |
| Elke server-, data- en testlaag | Buiten scope |

---

## 3. De fasen in één oogopslag

| Fase | Wat | Repo | Aandeel | Zichtbaar voor | Risico |
|---|---|---|---|---|---|
| 0 | Divergentie stoppen | alle | verwaarloosbaar | niemand | geen |
| 1 | Canon verhuizen, tokenbestand genereren | `ftrlabs-docs` | ~10% | niemand | geen |
| 2 | Cockpit interne consolidatie | `website` | **~45%** | intern | laag |
| 3 | Website | `groeiplatform-website` | ~20% | publiek | midden |
| 4 | Lens | `maculis-first-five.` | ~15% | testers | **hoog** |
| 5 | Mijn Maculis in het systeem geboren | nieuw | n.v.t. | klanten | n.v.t. |

Percentages zijn aandeel van het migratiewerk, niet van de doorlooptijd. Fase 5 staat op n.v.t.
omdat dat bouwen is, geen migreren.

**Poorten.** Fase 2 begint pas als fase 1 af is. Fase 3 en 4 beginnen pas als fase 2 groen is, want
daar wordt bewezen dat de tokenset werkt. Fase 3 en 4 kunnen daarna parallel.

**Eén uitzondering op de volgorde.** Fase 5 kan qua ontwerp en compositie meteen na fase 1 starten,
want Mijn Maculis heeft geen legacy. Het bindt zich pas aan de tokens nadat fase 2 groen is, zodat
het geen fout token-fundament erft.

---

## 4. Fase 0 · Divergentie stoppen

Geen code, direct in te voeren, en de goedkoopste maatregel in het hele plan.

Eén regel, op te nemen in de `CLAUDE.md` van elk van de vier repositories:

> Geen enkel nieuw scherm definieert een eigen `:root` met eigen kleuren, radii of spacing. Wie een
> waarde nodig heeft die niet in `maculis-tokens.css` staat, agendeert een systeemwijziging volgens
> hoofdstuk 17 van de canon.

Dit voorkomt dat het probleem groeit terwijl we het oplossen. `comm.html` is het bewijs dat het
nodig is: dat bestand is een handmatige kopie van `workspace.html` waarbij twee tokens onderweg zijn
verdwenen.

---

## 5. Fase 1 · De canon verhuizen en het tokenbestand genereren

**Repo:** `ftrprf-labs/ftrlabs-docs`

| Werk | Detail |
|---|---|
| Canon plaatsen | `MACULIS_VISUAL_DNA_V1.0.md` naar `03-ux/principles/` |
| North Star plaatsen | `maculis-visual-north-star.html` naar `03-ux/assets/` |
| Tokenbestand genereren | `03-ux/specifications/maculis-tokens.css` |
| Versiestempel | Kop met versie, datum en checksum |

**Drie leveringsvormen, conform beslissing 7.**

* **Website:** importeert het bestand in de build.
* **Cockpit:** linkt het als statisch bestand. Dat past bij de bestaande `<link rel="stylesheet"
  href="/styles.css">` en de CSP staat same-origin toe.
* **Lens:** houdt een gestempelde inline kopie. Bewuste uitzondering: een losse stylesheet zou daar
  render-blocking zijn op precies het moment dat video start.

**Eén integratiedetail dat aandacht vraagt.** De website gebruikt HSL-tripletten omdat Tailwind dat
zo consumeert, de andere drie gebruiken hex. Het tokenbestand levert daarom beide notaties voor
dezelfde waarde, gegenereerd uit één bron, zodat er nooit met de hand geconverteerd wordt.

---

## 6. Fase 2 · Cockpit interne consolidatie

**Repo:** `ftrprf-labs/website` · **~45% van het werk** · intern publiek, `noindex`, nul merkrisico

Dit is de grootste post en tegelijk de veiligste. Het is ook de proef op de som: als de tokens een
koel gestyled scherm niet naar de canon kunnen brengen zonder de bruikbaarheid te schaden, deugt de
canon niet. Dat wil je weten voordat er iets publieks gebeurt.

### 6a. `public/styles.css` · niveau 1

| Wijziging | Van | Naar |
|---|---|---|
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` | `cubic-bezier(.22,.61,.36,1)` |
| Radii | 5, 6, 7, 8, 10, 12, 999 door elkaar | `sm 10 · md 16 · lg 20 · pill 999` |
| Bevestigd | `--ok #4cae86` | `jade #1f9470` |
| Vraagt aandacht | `--warn #cf8a3c` | `signal #c8894a` |
| Gebroken | `--danger #e5674f` | ongewijzigd, is al canon |
| `OPENED` | `#7c3aed` | `emerging #8a79e0` |
| Spacing | volledig hardcoded pixels | `4 · 8 · 12 · 16 · 24 · 40 · 64` |
| `--muted` | `#a89a86` | `ink.200`, zelfde waarde, alleen hernoemen |

De ease-correctie is één teken en verandert het gevoel van elke micro-interactie in de admin.

### 6b. `public/workspace.html` en `public/comm.html` · niveau 1 en 2

Dit is de zichtbaarste verandering van het hele plan.

| Wijziging | Van | Naar | Niveau |
|---|---|---|---|
| Grond | `#0b0c0f` | `ink.980 #0a0b10` | 1, vrijwel onzichtbaar |
| **Hairlines** | `#2a2e39`, `#343a47` neutraal grijs | **koper 18% en 34%** | 1, sterk zichtbaar |
| Secundaire tekst | `--dim #9aa0ac` koel grijs | `ink.200 #a89a86` | 1, zichtbaar |
| Zwakke tekst | `--faint #6b7280` | `ink.300 #8b8377` | 1 |
| Goudtint | `--goldsoft #e8cf97` | `gold.500 #d7b36a` | 1 |
| Radius | `--r 12px` | `radius.sm` en `radius.md` | 1 |
| Eigen `:root` | handmatig gedupliceerd palet | link naar `maculis-tokens.css` | 1 |
| **Serif** | volledig afwezig | Newsreader voor de Uitspraak-rol | **3** |
| Attention-states | twee onverenigbare systemen | één systeem, twee presentatievormen | 2 |

**De grond blijft dus staan.** Dat is de winst van beslissing 1: wat de audit als drift bestempelde,
is nu canon, en dat scheelt het overschilderen van twee complete schermen. De audit raamde deze post
op ongeveer 65 procent van al het werk; met de koele grond als canon is dat ongeveer 45 procent.

**Het serif-punt is niveau 3, geen niveau 1.** In de Workspace staat nu geen enkele serif. Zodra de
Uitspraak-rol een serif krijgt, verandert de leesvolgorde van het scherm. Dat vraagt een echte
ontwerpslag en geen tokenwissel. Plan het als zodanig.

### 6c. Iconografie · niveau 2

De Unicode-glyphs in Testerbeheer (`⤓ ✎ ＋ ⇪ ➤`) vervangen door inline SVG in dezelfde lijnstijl.
Enige plek in Maculis waar tekstsymbolen als iconen dienen.

---

## 7. Fase 3 · Website

**Repo:** `ftrprf-labs/groeiplatform-website` · **~20%** · publiek zichtbaar

| Werk | Detail | Niveau |
|---|---|---|
| Serif | Fraunces naar Newsreader via `next/font/google` | 1 |
| Tokens | Hernoemen naar de canon in `globals.css` | 1 |
| Duplicaat | `--signal` vervalt, was identiek aan `--amber` | 1 |
| Goud | Toevoegen, ontbreekt nu volledig op de website | 1 |
| Radii | `tailwind.config.ts` naar de canonieke schaal | 1 |
| Compositie | Geen wijziging | 0 |

`next/font` host de letter bij de build op de eigen origin, dus er komt geen extern verzoek bij en
er is geen CSP-implicatie.

**Eén opruiming die ik aanraad nu je toch in `globals.css` zit.** Op dit moment staat het **lichte**
palet op `:root` en het donkere op `.dark`, terwijl `layout.tsx` `className="dark"` hardcodeert. De
website is volgens de canon een nachtkamer, dus de omkering is verwarrend. Voorstel: `:root` wordt
het nachtpalet, en het dagpalet verhuist naar het tokenbestand waar Mijn Maculis het ophaalt. Dat is
iets meer werk maar het haalt een structurele denkfout weg. Als je liever niets aan de werkende site
raakt, is het alternatief om de omkering te documenteren en te laten staan.

---

## 8. Fase 4 · Lens

**Repo:** `ftrprf-labs/maculis-first-five.` · **~15%** · **het hoogste risico van het plan**

| Werk | Detail | Niveau |
|---|---|---|
| Tokens hernoemen | `--gold`, `--panel`, `--s-*`, `--r-*`, `--t-*` naar de canon | 1 |
| Serif | Newsreader inline als base64 woff2 | 1 |
| Oude knopvarianten | `.rec-btn`, `.eval-yes`, `.eval-no`, `.fe-pick` laten samenvallen met de DS V1 seeds | 2 |
| Alles overige | Niet aanraken | 0 |

**Waarom dit het laagste risico van alle tokenwerk zou moeten zijn.** De DS V1 seed staat er al, en
de code-comment op regel 32 zegt letterlijk dat de waarden gelijk zijn aan de huidige componenten,
dus migratie zonder visuele wijziging. Dat is toetsbaar: de pixelvergelijking moet nul verschil
opleveren.

**Waarom het toch het hoogste risico van het plan is.** Twee redenen. De pipeline is bevroren en
functioneel geaccepteerd, dus elke aanraking is er één te veel. En de letter komt over video te
staan, precies waar een laadmoment zichtbaar zou worden.

**De mitigatie voor het fontrisico** is `font-display: optional`. Dat betekent: is de letter niet in
cache, dan gebruikt de browser voor die paginalading de systeemstack, zonder later te wisselen. Geen
flash, geen layout shift. Het slechtste geval is exact het gedrag van vandaag.

---

## 9. Fase 5 · Mijn Maculis

Geen migratie. Het eerste product dat vanaf regel één op de canon draait: dagregime, `surface.private`,
het volledige signaalveld en de semantische set. Daarmee meteen de beste referentie-implementatie.

Blokkerend openstaand punt: krijgt Mijn Maculis een eigen repository (open punt B in de canon). Mijn
advies blijft ja, want `ftrprf-labs/website` draagt al vier oppervlakken en een misleidende naam.

---

## 10. Verificatie per niveau

| Niveau | Wat het is | Hoe het wordt aangetoond |
|---|---|---|
| **1a** | Hernoemen, waarde ongewijzigd | **Pixelvergelijking moet nul verschil geven.** Geautomatiseerd, voor en na, desktop en mobiel |
| **1b** | Waarde gewijzigd | Visuele review plus hercontrole van het contrast tegen de nieuwe ondergrond |
| **2** | Component samengevoegd | Visuele review plus alle staten doorlopen |
| **3** | Compositie gewijzigd | Ontwerpreview voordat er code komt |

**Voor elke fase geldt bovendien:** de bestaande testsuites blijven groen. Dit zijn uitsluitend
visuele wijzigingen, dus als een test breekt is er iets aangeraakt dat buiten scope lag. Dat is het
signaal om te stoppen, niet om de test aan te passen.

De pixelvergelijking op niveau 1a is de goedkoopste veiligheidsmaatregel in het hele plan en zij
dekt het grootste deel van het Lens-werk.

---

## 11. Terugdraaien

Elke fase is een eigen branch met een snapshot ervoor. De repositories gebruiken deze conventie al:
in `maculis-first-five.` staan `baseline/first-five-frozen-*`, `rollback/*` en `snapshot/*`. Die
conventie wordt aangehouden.

Omdat het uitsluitend visuele wijzigingen betreft, is terugdraaien in alle gevallen het terugzetten
van een stylesheet of een tokenblok. Er is geen datamigratie en er is dus geen onomkeerbare stap in
het hele plan.

---

## 12. Risico's, eerlijk benoemd

| Risico | Kans | Mitigatie |
|---|---|---|
| De Lens verandert zichtbaar terwijl dat niet de bedoeling was | midden | Pixelvergelijking op nul verschil, anders stoppen |
| De letter flitst over video in de Lens | laag | `font-display: optional`, slechtste geval is het huidige gedrag |
| Koperen hairlines maken de Workspace onrustig bij hoge dichtheid | **midden** | Eerst één scherm omzetten en beoordelen voordat de rest volgt |
| De serif in de Workspace verandert de leesvolgorde | hoog, maar bedoeld | Behandelen als niveau 3, ontwerpreview vooraf |
| Gekopieerde tokens in de Lens lopen na verloop van tijd uiteen | midden | Versiestempel in de kop, nooit met de hand bewerken |
| De canon wordt omzeild door tijdsdruk | **hoog** | Fase 0, plus hoofdstuk 17 van de canon |

Het middelste risico verdient nadruk. Koper op 18 procent werkt uitstekend in Testerbeheer, maar de
Inbox heeft drie kolommen en een veel hogere regeldichtheid. Het is goed mogelijk dat daar een
lagere alpha nodig is. Dat is geen afwijking van de canon maar een invulling ervan, en het hoort in
één keer goed te worden vastgesteld in plaats van per scherm te worden gegokt.

---

## 13. Wat dit plan niet oplost

* De repositorynamen. `ftrprf-labs/website` bevat niet de website. Dat blijft verwarrend en hoort
  apart gepland te worden, want hernoemen breekt remotes en deploy-hooks.
* Het ontbrekende eerdere "Design Constitution, 12 wetten" waar `globals.css` naar verwijst. Als er
  een versie buiten Git bestaat, moet die eerst met de canon worden verzoend.
* De lege repository `ftrprf-labs/websiteftrprflab`.
* De constellatie als datavisualisatie. Alleen als statisch merkbeeld vastgelegd.

---

## 14. Wat ik als eerste zou doen

Fase 0 en fase 1 kosten samen weinig en leveren het meeste op, want zij maken alle latere fasen
controleerbaar. Daarna één scherm uit fase 2b omzetten, bijvoorbeeld `comm.html`, en dat beoordelen
voordat de rest volgt. Dat ene scherm beantwoordt in de praktijk de twee vragen waar dit plan het
meest op steunt: werken koperen hairlines bij hoge dichtheid, en klopt de tokenset.

Geen uitvoering voordat dit plan is goedgekeurd.
