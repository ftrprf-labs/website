# Pilot Cockpit · Relatie-workspace, uitgevoerd op de gemergede canon

> **Uitgevoerd binnen scope. Niet gemerged, niet gedeployed.**
> Oppervlak: `public/workspace.html`. Controlegroep: `public/comm.html`, onaangeraakt.
> Canon: Visual DNA v1.0 met C-1 en C-2, tokens 1.0.2 / `b95d91b7a0a82c18`.

Uitgevoerd: 2026-08-18

---

## 1. Before en after

48 renders per staat, 4 viewports × 6 schermen × normaal en `reduce`, animaties bevroren,
deterministische fixtures zonder database of PII.

| | Resultaat |
|---|---|
| `comm.html`, controlegroep, 8 renders | **byte-identiek, alle acht** |
| `workspace.html`, 40 renders | gewijzigd, 99,3 tot 100 procent van de pixels |
| Beeldformaat gewijzigd | nergens |
| Horizontale overflow | **nul**, 5 tabs × 2 viewports |
| Console errors, page errors, mislukte requests | **nul** |
| `npm test` | **64 tests, 0 fail**, 9 overgeslagen (vereisen live Postgres) |
| Checksumpoort | groen op 1.0.2 |

Beelden: `tools/visual/compare-*.png`.

---

## 2. Wat is uitgevoerd

| Scope-item | Uitkomst |
|---|---|
| Regime naar `worklight` | `data-maculis-regime="worklight"` op `<html>`, geverifieerd in de browser |
| Grond naar `ink.950` | `body` rendert `rgb(8, 5, 3)`, gemeten |
| Warme tonale stapeling | `--panel2` **opgeheven**. Drie niveaus: ground `ink.950`, raised `ink.800`, elevated `ink.600` |
| Koperen hairlines | `--border-hairline` en `--border-defined`. Geen neutraal grijs meer |
| Statusbadges als semantische pil | Transparant, `border.semantic` hairline, semantische tekst, `radius.pill` |
| Newsreader waar de canon de stem voorschrijft | Wordmerk, kamerkop, AI-paneel, ontworpen lege staat |
| `.person .name` naar sans regular | Gedaan, conformiteitsfix |
| Serif wordmerk | Hersteld |
| `:focus-visible` | 10 van 10 toetsenbordstops met een ring |
| `prefers-reduced-motion` | Geen lopende animatie, niets op `opacity: 0` |
| Nederlandse statuslabels | Kanalen, journeystappen en leverstatus |

**Semantische toewijzing van de pillen**, afgeleid uit canon 3.3 en 10:

| Staat | Rol | Grond |
|---|---|---|
| `new`, `waiting_on_us` | `signal` | vraagt aandacht |
| `ai_ready` | `emerging` | een voorstel is nog niet vastgesteld. Violet beschrijft toestand, roept niet |
| `unknown_contact` | `uncertain` | Maculis kleurt niet wat het niet weet |
| `waiting_on_contact` | `uncertain` | **geen schone match**, zie §4 |
| `delivery_problem` | `broken` | gebroken |

---

## 3. Wat aantoonbaar beter is geworden

**De kamer staat op de canonieke grond.** Werklicht, `ink.950`, met de grotere eerste tonale stap
die C-1 beschrijft. De vier tonale niveaus zijn teruggebracht naar de drie die canon 6 toestaat.

**De statuspil draagt nu betekenis in plaats van decoratie.** Zes handgekozen achtergronden zijn
vervangen door de canonieke constructie. Op het Inzichten-scherm staan nu drie semantische kleuren
naast elkaar die elk iets zeggen: violet voor het AI-voorstel dat nog niet vaststaat, jade voor
verleende toestemming, neutraal voor wat niet gekleurd hoort te worden.

**Alle zeven pillen halen AA**, gemeten op hun feitelijke ondergrond:

```
  E-mail (signal)     6,35:1      afspraak (neutraal)  6,79:1
  E-mail (neutraal)   6,79:1      AI-voorstel (violet) 5,25:1
  WhatsApp            6,79:1      feit                 6,79:1
  verlopen (broken)   5,68:1
```

**De hiërarchie in de rail is hersteld.** De organisatienaam leidt weer, de contactnaam is
ondergeschikt. Zonder canonwijziging, precies zoals de meting voorspelde.

**Statuslabels zijn Nederlands en menselijk.** `EMAIL` werd `E-mail`, `WHATSAPP` werd `WhatsApp`,
`DRAFT/SENT/OPENED/COMPLETED` werden `Concept/Verstuurd/Geopend/Afgerond`, en `delivered` werd
`afgeleverd`. Canon 10 verbiedt Engelse hoofdletterbadges.

**Vier gedachtestreepjes uit zichtbare copy.** Canon 13 en `CLAUDE.md` verbieden ze als stijlmiddel.
De twee die resteren staan in code-commentaar en zijn uitgezonderd.

**Toegankelijkheid en beweging blijven op orde.** Tien toetsenbordstops, tien ringen van 2px koper.
Onder `reduce` nul lopende animaties en niets onzichtbaar door een niet-gestarte animatie.

---

## 4. Wat onverwacht was of spanning gaf

**A. `waiting_on_contact` heeft geen schone canonieke rol.** "Wacht op de klant" is een bekende
toestand, dus niet `uncertain`, maar hij vraagt ook geen aandacht, dus niet `signal`. Ik heb hem op
`uncertain` gezet omdat een kleurloze pil het enige is dat niets beweert. Dat is een keuze, geen
afleiding. **Dit is de enige plek in de pilot waar ik verder ga dan de canon dwingt**, en ik meld
hem daarom expliciet. Hij rendert vandaag niet in dit scherm; alleen `comm.html` gebruikt hem.

**B. De klikbare rijen zijn niet met het toetsenbord te bereiken.** De focusaudit haalde tien stops,
en dat zijn er te weinig: `.conv` en `.list-item` zijn `div`-elementen met een `data-act`, zonder
`tabindex` en zonder `role`. Ze hebben nu wel een focusring, maar niemand kan die met Tab bereiken.
**Dit is een bestaand defect, niet door de pilot geïntroduceerd**, en het valt buiten de scope die
je hebt vastgesteld. Het hoort in de Cockpit-harmonisatie thuis, want het is een echte
toegankelijkheidsfout in een productiescherm.

**C. De primaire knop is niet gecanoniseerd.** `.btn.gold` houdt zijn eigen gradient met `#efd7a0`
en `#241708`, en de badge houdt `#1a1206` als donkere tekst op koper. Canon 12 beschrijft de
primaire knop als "warm verzadigd oppervlak, donkere tekst", wat hij is, maar er zijn geen tokens
voor deze drie waarden en canon 12 kent ook geen hover-lift die hier ontbreekt. Aanraken zou
creatieve interpretatie zijn. **Bewust ongemoeid gelaten en gemeld.**

**D. Formuliervelden hebben geen canonieke grammatica.** Canon 12 beschrijft knoppen, kaarten,
statussen, navigatie, modals, lege staten en twee oppervlakken, maar geen invoerveld. Ik heb
`textarea` en `input` op de secundaire-knopgrammatica gezet (transparant plus één hairline), omdat
dat de bestaande grammatica toepast in plaats van een nieuwe te verzinnen. Werkt goed, maar het is
een gat in canon 12 dat bij de volgende kamers terugkomt.

**E. Eén scope-uitbreiding, bewust en gemeld.** De Nederlandse statuslabels stonden in
`workspace.js`, niet in `workspace.html`. Ik meldde dat in het vorige pilotrapport en jij hebt ze
daarna expliciet in de scope opgenomen, dus ik heb `workspace.js` aangeraakt. **Uitsluitend
weergavetekst**: één labelmap, vier verwijzingen omgezet, en de vier gedachtestreepjes. Geen logica,
geen opgeslagen waarden, geen datastructuur. De comm-suite blijft groen.

---

## 5. Aannames bevestigd of verworpen

| Aanname | Uitkomst |
|---|---|
| Controlegroep blijft onaangeraakt | **Bevestigd.** Acht van acht byte-identiek, ook nu de grond veranderde |
| C-1 klopt: Testerbeheer had de grond al goed, Inbox en Workspace niet | **Bevestigd in de praktijk.** `#0b0c0f` naar `#080503` maakt de kamer samenhangend in plaats van, zoals bij nacht, tegenstrijdig |
| C-2 deblokkeert de badges | **Bevestigd.** Zes hardgecodeerde achtergronden weg, alle zeven pillen halen AA |
| Het opheffen van `--panel2` is een layoutbeslissing | **Bevestigd, en groter dan verwacht.** Tien verwijzingen, waarvan vijf geen oppervlak bleken te zijn maar knoppen, pillen en velden. Die zijn nu transparant, wat canon 12 al voorschreef |
| Serif 300 werkt zodra de omgeving canon-conform is | **Bevestigd** voor de kamerkop. Nog niet getoetst in Testerbeheer, de dichtste omgeving |
| `el.focus()` is een goede focustest | **Verworpen.** Het triggert `:focus-visible` niet voor knoppen en links, waardoor mijn eerste audit vier valse fouten gaf. Alleen echte Tab-navigatie meet dit. Correctie meegenomen in de harness |
| De pilot raakt alleen `workspace.html` | **Verworpen**, zie punt E |

---

## 6. Oordeel: GO

De canonieke keten werkt end tot end: gemergede canon, gegenereerde tokens, gevendord met
checksumbewaking, toegepast in een kamer, en een controlegroep die bewijst dat er niets lekt. Alle
functionele, toegankelijkheids-, overflow- en console-controles zijn groen, en de testsuite is
onveranderd.

Drie dingen mee te nemen naar de rest van de Cockpit, geen ervan blokkerend:

1. **`.conv` en `.list-item` toetsenbordbereikbaar maken.** Bestaand defect, hoort erbij.
2. **Formuliervelden: bevestig de grammatica** die ik hier heb toegepast, of leg hem vast in
   canon 12. Hij komt in elke kamer terug.
3. **`waiting_on_contact`** verdient een bewuste keuze in plaats van mijn kleurloze standaard.

Volgende stap volgens de vastgestelde volgorde: `comm.html`, met exact dezelfde ingrepen. Dat is nu
grotendeels mechanisch, want de bestanden zijn onderling bijna identiek en de beslissingen zijn hier
genomen. Daarna Testerbeheer, dat als enige de grond al goed heeft en waar de dichtheid het hoogst
is.

**Niet gemerged, niet gedeployed.**
