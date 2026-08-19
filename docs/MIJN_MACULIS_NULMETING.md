# Mijn Maculis — nulmeting vóór de harmonisatie

**Datum** 2026-08-18 · **Workstream** Mijn Maculis Visual DNA · **Branch** `claude/mijn-maculis-visual-dna-94ut9s`
**Status** vastgelegd bewijs. Dit document beschrijft de toestand zoals die was, niet de gewenste toestand.

---

## 1. Waar Mijn Maculis werkelijk staat

Dit is eerst uitgezocht, niet aangenomen. De oude stages in `maculis-first-five` zijn **niet** het
actuele product.

| | |
|---|---|
| Repository | `ftrprf-labs/website` (dezelfde repo als Testerbeheer en de Cockpit) |
| Productbranch | `claude/mijn-maculis-customer-v1-d29lib`, head `24d80cd` |
| Bestanden | `public/mijn.html`, `public/mijn.css`, `public/mijn.js`, `server/mijn/*`, migraties `006` en `007` |
| Render-service | `mijn-maculis-preview` (`srv-da1i1tg1ne8s73cgiu10`), regio Frankfurt |
| Preview-URL | `https://mijn-maculis-preview.onrender.com` |
| Gekoppelde branch | `claude/mijn-maculis-customer-v1-d29lib`, `autoDeploy: yes` op iedere commit |
| Basisbranch van de repo | `claude/invitation-manager-mvp-d5r5h8`, head `23ddbba`. Er is geen `main` |

**Nog levende oudere Mijn-Maculis-sporen.** Er draait geen tweede Mijn-Maculis-service. Wat er nog is:

* `ftrprf-labs/website` bevat twee oude, niet-gedeployde branches `claude/maculis-vijfde-kamer-rz4n2i`
  en `claude/maculis-vijfde-kamer-sxfcby`. Die dragen de conceptfase van de vijfde kamer en zijn aan
  geen enkele service gekoppeld.
* `ftrprf-labs/maculis-first-five.` is de Lens en bevat geen Mijn-Maculis-oppervlak.
* `ftrprf-labs/groeiplatform-website` bevat `/portal` en `/dashboard`. Dat is de publieke Website,
  geen klantomgeving, en valt buiten deze workstream.

Conclusie: het zelfstandige `mijn.*`-oppervlak is het actuele product.

## 2. Deploykoppelingen zoals aangetroffen

| Service | Repo | Branch | autoDeploy |
|---|---|---|---|
| `mijn-maculis-preview` | `ftrprf-labs/website` | `claude/mijn-maculis-customer-v1-d29lib` | ja, op commit |
| `maculis-cockpit-harmonisatie-preview` | `ftrprf-labs/website` | `claude/maculis-visual-harmonization-s0nt5t` | ja, op commit |
| `maculis-cockpit-preview` | `ftrprf-labs/website` | `claude/maculis-future-cockpit-z9naou` | ja, op commit |
| `ftrlabs-testerbeheer` | `ftrprf-labs/website` | `claude/invitation-manager-mvp-d5r5h8` | **nee**, uit |
| `claude/website-harmonisatie-nulmeting` | `ftrprf-labs/groeiplatform-website` | `claude/website-harmonisatie-nulmeting` | nee |
| `maculis-first-five.` | `ftrprf-labs/maculis-first-five.` | `main` | ja |

Van belang voor deze workstream: er is **geen** service gekoppeld aan
`claude/mijn-maculis-visual-dna-94ut9s`. Een push naar deze branch deployt dus niets, zolang de
preview niet bewust wordt omgezet.

## 3. Git-toestand bij aanvang

Beide werkkopieën waren schoon, zonder lokale wijzigingen. `claude/mijn-maculis-visual-dna-94ut9s`
stond in beide repositories op hetzelfde punt als de basisbranch en droeg nog geen eigen werk.
De productbranch splitste bij `a29564e`, vóór de Cockpit-harmonisatie, en droeg daardoor nog geen
canoniek tokenbestand en geen Newsreader.

## 4. De meting zelf

Twee harnassen, apart van de Cockpit-harnassen, zodat deze workstream niets van de parallelle
workstreams aanraakt:

* `tools/visual/mijn-capture.mjs` legt vier schermen vast op vier viewports, met en zonder reduced
  motion. Resultaat: 32 opnamen in `tools/visual/mijn-baseline/`.
* `tools/visual/mijn-audit.mjs` meet regime, grond, letter, curve, overflow, focus met echte
  Tab-navigatie, contrast van alle tekst tegen de feitelijk samengestelde ondergrond, console en
  reduced motion.
* `tools/visual/mijn-fixtures.mjs` levert vaste API-antwoorden met vaste tijdstempels, zodat een
  verschil tussen twee runs alleen stijl kan zijn.

**Uitkomst nulmeting: 12 gefaalde controles.** Alle overige controles stonden groen, waaronder
overflow op alle schermen en viewports, focusringen op elke Tab-stop, nul console-fouten, en reduced
motion zonder lopende animatie.

## 5. Wat al canoniek was

* Het dagregime als **idee**: de kamer stond al op een licht, warm perkamentachtig oppervlak.
* De informatiehiërarchie: Overzicht, Inzichten (De Spiegel), Samenwerking, en het inzichtdetail met
  de vier vragen. Die architectuur is goed en blijft.
* Statuslabels zijn Nederlands en menselijk, geen Engelse hoofdletterbadges.
* Onzekerheid draagt geen kleur in de tekstinhoud: "Dit weten we nog niet" is als taal aanwezig.
* Reduced motion schakelde alle animatie en transitie uit.
* Geen horizontale overflow, focusringen aanwezig, geen console-fouten.
* De signal language was als **idee** aanwezig: een veld met punten, verbindingen en een lichte kern.

## 6. Wat aantoonbaar afweek

| # | Afwijking | Canon | Gemeten |
|---|---|---|---|
| A-1 | Geen `data-maculis-regime` | canon 5, dag voor Mijn Maculis | attribuut afwezig (`null`) |
| A-2 | Eigen `:root` met eigen kleuren | canon 13, nooit een eigen `:root` per scherm | ruim 50 handmatige hexwaarden in `mijn.css` |
| A-3 | Grond wijkt af | `ink.50` `#f7f1e6` | `#f2eee4` |
| A-4 | Navy als ankerkleur | canon 3.5, navy is en blijft geen Maculis-kleur | `#0d1524`, `#121d33`, `#1a2740` in de sidebar |
| A-5 | Vierde semantische kleur | canon 11, maximaal drie reeksen | "ice" `#4b78b4` als eigen betekenisdrager voor gedeeld |
| A-6 | Violet buiten de canon | `semantic.emerging` dag `#5f4fb0` | `#6857cc`, `#8574e2`, `#443896` |
| A-7 | Violet roept om aandacht | canon 2, violet nooit op de rusttoestand van een knop of focusring | gevulde violette primaire knop, violette focusring, gevulde violette badge |
| A-8 | Koper buiten de canon | dag `semantic.signal` `#925826`, merk `#c8894a` | `#b0762f`, `#cf9346`, `#7c4f1c` |
| A-9 | Jade buiten de canon | dag `semantic.confirmed` `#097159` | `#3d8c68`, `#2a6549` |
| A-10 | Verkeerde serif | canon 4.1, Newsreader | Iowan Old Style / Palatino / Georgia |
| A-11 | Serif decoratief gebruikt | canon 4.2, serif is nooit decoratief | serif op voetnoot, tijdstempelhint, organisatienaam, navigatie-ondertitel |
| A-12 | Eigen motioncurve | canon 8.2, één curve `cubic-bezier(.22,.61,.36,1)` | `cubic-bezier(0.2,0.65,0.2,1)` |
| A-13 | Oneindige animatie | canon 8.1 en 8.4, geen oneindige lus | `sfBreath`, `sfPulse`, `sfRot` alle drie `infinite` |
| A-14 | Geen levenscyclus | canon 8.1, zes stadia met een eindtoestand | het veld staat er meteen, er ontstaat niets |
| A-15 | Lijnen op afstand | canon 8.1, verbinding alleen tussen samenhangende signalen | zes spaken vanuit de kern naar willekeurige punten |
| A-16 | Gevulde badge | canon 10, statuspil is transparant met semantische hairline | gevulde violette pil met witte tekst |
| A-17 | Schaduw naast hairline | canon 6, één hairline of één schaduw, nooit beide | panelen, kaarten en knoppen dragen beide |
| A-18 | Eigen schaduwwaarden | canon 6, `shadow.diffuse` | drie eigen `--sh-*`-schalen |
| A-19 | Eigen radii en spacing | canon 6 | `12/16/20/26` naast de canonieke `10/16/20` |
| A-20 | Scrim buiten de canon | canon 12, `scrim.modal` `rgba(4,2,1,.62)` | `rgba(18,14,8,.46)` met blur |
| A-21 | Contrast onder AA | canon 3.3 en 3.4 | `#6c7791` op de sidebar 3,02:1 · `#857b6c` op perkament 3,34:1 · datum 3,83:1 · badge 3,75:1 · avatar 3,75:1 |
| A-22 | Neutrale hairlines | canon 6, nooit neutraal grijs | `rgba(40,31,18,.10)` en varianten, warm maar neutraal, niet koper |
| A-23 | Gedachtestreepje in zichtbare copy | `CLAUDE.md` | `'—'` als lege waarde in het inzichtdetail |
| A-24 | Kleur als enige drager | canon 10 en 11 | de kaarttint codeert gedeeld tegenover consistent zonder eigen tekstlabel |

## 7. Wat de nulmeting nog meer liet zien

* De drie kaarten onder "Recente inzichten" staan op het Overzicht in drie kolommen binnen een smalle
  kolom. Op 1280 px levert dat regels van vier tot vijf tekens per woord. Dat is geen canonpunt maar
  wel een leesbaarheidsprobleem dat in dezelfde pass hoort te worden opgelost.
* De atmosferische horizon achter "Onze laatste stap" is een eigen beeldtaal, geen Maculis-grammatica.
* Het signaalveld staat alleen op het Overzicht en De Spiegel, en dan als decoratie naast de tekst,
  niet als bewijs onder de uitspraak.
