# Status van deze studie

**Bevroren op 2026-08-18. Exploratieve hypothese, geen vastgelegd ontwerp.**

Alles in deze map blijft volledig behouden: de conceptuele architectuur, de browserbevindingen en de
drie beslissingen. Er wordt niet verder ontworpen tot de centrale canon gelezen is.

---

## Wat er sinds het schrijven is veranderd

De definitieve **Visual DNA v1.0 en Visual North Star zijn centraal gepubliceerd in
`ftrlabs-docs/03-ux/`** en zijn vanaf nu de enige canonieke visuele bron.

Daarmee vervalt de grondslag waarop deze studie is geschreven:

- **Productcode is geen bron meer voor het Visual DNA.** Bron B in `ONTWERPSTUDIE.md` hoofdstuk 0,
  de tokentabel uit `public/styles.css` en `server/comm/signature.mjs`, is vanaf nu uitsluitend een
  waarneming over de implementatie, niet over de grammatica.
- **De twee gemelde inconsistenties waren geen inconsistenties.** Dat Newsreader en een epistemisch
  violettoken leken te ontbreken, kwam doordat de canon niet in deze werkomgeving stond. Een
  ontbrekend token of patroon in productcode is geen DNA GAP. Die conclusie is ingetrokken.

Wat daarmee ook ter discussie staat: elk van de zes gemarkeerde DNA GAPs, want die zijn alle zes
afgeleid tegen een onvolledige grondslag.

---

## Wat er gebeurt zodra de canon op `main` staat

In deze volgorde, en niet eerder beginnen met ontwerpen.

**1. Eerst volledig lezen.** De hele canon in `ftrlabs-docs/03-ux/`, voordat er één ontwerpuitspraak
opnieuw wordt beoordeeld.

**2. Daarna elke belangrijke uitspraak uit deze studie classificeren:**

| Label | Betekenis |
|---|---|
| CANON | rechtstreeks vastgelegd in Visual DNA v1.0 |
| DERIVATION | logisch afgeleid uit de canon, niet letterlijk vastgelegd |
| KAMER-5 PROPOSAL | specifiek ontwerpvoorstel voor deze kamer |
| DNA GAP CANDIDATE | iets waarvoor de canon aantoonbaar geen grammatica bevat |

**3. Alle zes DNA GAPs opnieuw beoordelen.** Ze staan nu in `ONTWERPSTUDIE.md` hoofdstuk 7 en
gelden tot die herbeoordeling als vervallen, niet als open. Alleen wat na volledige lezing van de
canon werkelijk niet uitdrukbaar blijkt, mag kandidaat blijven. Voorstellen blijven voorstellen:
wijzigingen aan de Visual DNA lopen via de governance van de canon, nooit vanuit deze studie.

**4. Deze these expliciet herbeoordelen:**

> "De Cockpit kan niet zeggen dat je haar niet nodig hebt. Kamer 5 wel."

Belangrijk genoeg om verder te toetsen, **niet vastgelegd als bestaansrecht.** In
`ONTWERPSTUDIE.md` hoofdstuk 1 en 2 staat die uitspraak nu stelliger dan haar status rechtvaardigt.

**5. De oorspronkelijke hypothese blijft even zwaar wegen:** de Vijfde Kamer als persoonlijke
Maculis-werkruimte op de MacBook. De vraag is niet welke van de twee wint, maar of ze elkaar
versterken. Werkrichting: een persoonlijke werkruimte die zichtbaar wordt wanneer er iets van mij
nodig is, en die durft te verdwijnen wanneer dat niet zo is.

**6. Drie lagen eerst afzonderlijk onderzoeken, pas daarna de vraag of ze samen Kamer 5 vormen:**

1. persoonlijke werkruimte;
2. aandacht en afwezigheid;
3. persistent geheugen, waarvoor het eerder gevonden geheugen- of ledgerpatroon kan dienen als
   opslag van besluiten, bewijs, vragen en open lijnen.

Dat die drie samen Kamer 5 zijn, is nu een aanname en geen uitkomst.

---

## Wat er in de tussentijd niet gebeurt

Niets implementeren, niets deployen, geen canon wijzigen, geen productcode aanraken, en geen
verdere ontwerpontwikkeling in deze map.
