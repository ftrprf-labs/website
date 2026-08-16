# Maculis Future Cockpit

Product-, UX- en informatiearchitectuur voor de toekomstige dagelijkse Maculis-omgeving.
Onderzoek, recovery, architectuur, drie visuele richtingen, prototype, vergelijking, aanbeveling en migratiepad.

> **Status: besluitrijp voorstel. Geen productie-rewrite.**
> Dit document eindigt met één productbeslissing die alleen Ludwig kan nemen: welke visuele richting.
> De bestaande productie (Testerbeheer, inbound/outbound mail, signature, Inbox, drafts,
> AI-suggesties, human approval, threading, Pass the Lens, consent, First Five, attention layer)
> blijft ongewijzigd en werkend. Het prototype staat er los naast, additief, onder `/cockpit.html`.

Schrijfregel gerespecteerd: geen koppeltekens of gedachtestreepjes als stijlmiddel in zichtbare copy.

> **Update na productbeslissing (richting C gekozen).** Ludwig koos richting C, met A als fase 1.
> Er volgde een tweede, verdiepende ontwerp- en prototyperonde die richting C moest bewijzen én
> actief kapot proberen te redeneren. De resultaten daarvan staan in **§18 (verdiepingsronde)**,
> inclusief de dual-space stresstest, de C versus A vergelijking na verdieping en het belangrijkste
> zwakke punt van C.
>
> **Update na de first-day UX-test (§19).** De informatiearchitectuur is aangescherpt. **Lenzen is
> uit de primaire navigatie gehaald**: een lens is hoe Maculis kijkt, geen bestemming. Lens-uitkomsten
> landen nu als reveal op Vandaag, als geheugen in de relatie ("Wat Maculis zag") en als patroon in
> Groei. De navigatie is gesplitst in drie dagelijkse bestemmingen plus een rustige groep "Verder".
> Waar §0 tot §17 nog "Lenzen" als navigatiebestemming noemen, geldt §19 als de actuele stand.
> Nog steeds geen productie-rewrite en geen migratie uitgevoerd.

---

## 0. Samenvatting in één minuut

**Belangrijkste ontdekking.** De "eerdere lichtere/witte dashboardrichting" die sterker aanvoelde
was geen groter product. Het was dezelfde testertabel in een generieke licht/blauwe SaaS-skin, drie
uur lang op de eerste dag, daarna donker herstyled. Het "grotere" gevoel kwam puur van de
esthetiek, niet van scope. Dat betekent: er valt geen oud dashboard te herstellen. Wat er wel valt
te winnen is de *productgedachte* die nu nog ontbreekt, namelijk een dagelijkse omgeving die
selecteert in plaats van toont.

**Aanbevolen architectuur.** Een primaire bestemming **Vandaag** die betekenis selecteert boven een
aandachtshiërarchie (Nu, Beweging, Klaar, Rust), met **Relaties** als de volledige relationship
universe, **Gesprekken** als omnichannel-laag binnen relaties, **Lenzen** en **Journeys** als
verdieping, en **Reveal** als productbrede interactietaal in plaats van een First Five-feature.

**Aanbevolen visuele richting.** Richting C, Reveal / Work: een dual-space model. Donker om te zien,
lichter om te werken. Kleur wordt geen theme-toggle maar cognitieve architectuur.

**Belangrijkste tegengas aan Ludwig.** Drie dingen die tegen je hypotheses ingaan staan in §12.
De kern: bouw dual-space alleen als twee ruimtes, niet als drie of vier; en houd Testerbeheer als
naam in leven, want het is een bewezen operationele view, geen legacy die weg moet.

**Prototype.** `public/cockpit.html`, `public/cockpit.css`, `public/cockpit.js`. Zes scenario's,
drie richtingen, de Reveal-interactie, 520 fixture-relaties. Alles gemarkeerd als PROTOTYPE DATA.
Deep-links: `/cockpit.html?dir=C&scn=reveal`.

---

## 1. Current state analysis (de huidige donkere Maculis-wereld)

Gebaseerd op een volledige lezing van `public/index.html`, `public/app.js`, `public/styles.css`,
`public/comm.html`, `public/comm.js`, `public/workspace.html`, `public/workspace.js` en de
server-CSP in `server/index.mjs`.

### 1.1 Wat er staat

Drie pagina's, **twee uiteenlopende tokensystemen**:

| Surface | Bestand | Palet |
|---|---|---|
| Testerbeheer (tabel + cockpit) | `index.html` + `app.js` + externe `styles.css` | warm bruin-zwart `#080503`, ivoor `#ece2d4`, amber `#c8894a`, amber-getinte randen |
| Inbox | `comm.html` + `comm.js` | koeler grafiet `#0b0c0f`, blauwgrijze panelen, neutrale randen, feller goud `#d7b36a` |
| Relationship Workspace | `workspace.html` + `workspace.js` | zelfde grafiet/goud als Inbox |

Dit is het belangrijkste structurele feit: de vlaggenschip-tabel en de twee relatieviews **delen
geen stylesheet en geen `:root`**. De tokens in `comm.html:10` en `workspace.html:10-15` staan inline
en wijken af van de hoofd-app. Eén gedeelde tokenbron ontbreekt.

### 1.2 Wat inmiddels karakteristiek Maculis is

1. **De Attention Cockpit.** Een serif, mensvriendelijke kop "wat vraagt vandaag aandacht?" met
   één deterministische "als eerste bekijken"-prioriteit en een ontworpen kalme zero-state
   ("Je bent bij."). De copydiscipline is een echte productfilosofie in CSS: nooit "AI", altijd
   "Antwoord staat klaar"; goud alleen voor de enige meest betekenisvolle volgende stap.
2. **Warm bruin-zwart met amber, inclusief amber-getinte hairlines.** Herkenbaar niet-generiek.
3. **Serif als zwaartekracht** (Iowan/Palatino), spaarzaam voor koppen en het woordmerk.
4. **Human-in-the-loop AI.** "Maculis begrijpt dit gesprek", "Niets wordt automatisch verzonden",
   memory als voorstellen die je bevestigt of verwerpt.
5. **Consent als fail-closed, provenance-gedragen eerste-klas dimensie**, geen vinkje.
6. **Pass the Lens** provenance als rustige gouden labels en aparte historieregels.

### 1.3 Wat nog generieke beheer- of SaaS-UX is

- De **kern-testertabel** is een klassiek datagrid: selectiekolom, negen kolommen, een **rij van zes
  altijd-zichtbare icoonknoppen per rij**, zoekveld plus statusdropdown plus bulk-toolbar.
- **Badges en pills overal** (status, consent, evaluatie, attention-tags).
- **Evaluaties** is een generiek analytics-dashboard (KPI-kaarten, funnel, verdelingsbalken), zij het
  feitelijk gehouden.
- **Modals** voor import, bewerken, template, WhatsApp en e-mail zijn standaard centrale dialogen.
- De Inbox 3-panelen (lijst, thread, context) is de canonieke gedeelde-inbox-layout.

### 1.4 Densiteit en toegankelijkheid

Testerbeheer heeft **hoge informatie- en interactiedensiteit**: tot ongeveer tien doelen per rij,
meerdere disabled door consent. De Inbox en Workspace zijn kalmer, met één primaire actie per view.

Toegankelijkheid is grotendeels goed: kleur is zelden het enige signaal, dots en balken dragen
`aria-label`, rij-dots zijn toetsenbord-activeerbaar, reduced-motion wordt volledig gehonoreerd.
Gaten: contrast van `--faint #6b7280` op grafiet is waarschijnlijk onder WCAG AA voor kleine tekst;
modals zijn niet focus-trapped en missen `role="dialog"`; icoon-only actierijen leunen op tooltips;
attention-pills en tabs missen `aria-pressed`/`role="tab"`.

### 1.5 Technische randvoorwaarden

CSP (`server/index.mjs:175-177`): `default-src 'self'; script-src 'self'; style-src 'self'
'unsafe-inline'; img-src 'self' data:`. Dus geen externe JS, **geen inline scripts en geen inline
handlers**. Inline `<style>` mag wel. De code respecteert dit via gedelegeerde `data-*`-handlers.
Het prototype volgt exact deze regels.

---

## 2. Old dashboard recovery (eerlijk resultaat)

**Er bestaat geen eerder, groter, wit dashboardproduct in de repo-history.** Volledige forensische
zoektocht over 42 commits, beide branches, alle deleted files en alle assets.

Wat werkelijk bestaat:

- **Commit `2d49854`** (13 aug 2026, 15:15) shipte `public/styles.css` met een **licht, blauw-geaccentueerd
  palet** plus een `prefers-color-scheme: dark` media query. Branding was **FTRLABS**, niet Maculis.

  ```css
  /* FTRLABS Invitation Manager — internal admin styling.
     Functional, fast, professional, responsive. Light + dark aware. */
  :root {
    --bg: #f4f6f8;  --surface: #ffffff;  --border: #e2e8f0;
    --text: #0f172a; --muted: #64748b;   --primary: #0ea5e9; /* sky blue */
  }
  ```

- De **layout was al de huidige testertabel**: topbar, controls (zoek, statusfilter, bulk-WhatsApp),
  tabel (Naam/Bedrijf/Contact/Domein/Persoonlijke link/status), modals, responsive breakpoint.
- **Commit `cfc0711`** (zelfde dag, 18:41, ruim drie uur later) is de kanteling. De boodschap zegt:
  "Dropped the old light/blue palette and the prefers-color-scheme media query", plus
  "no functional, layout, or API changes". Alleen de skin veranderde, plus FTRLabs naar MACULIS.
- `git log --all --diff-filter=D` geeft **niets**: er zijn nooit files verwijderd. Geen mockups, geen
  screenshots, geen designnotes van een groter dashboard.

**Welke productgedachte erachter zat.** Een neutrale, systeem-native admin-skin (Slate/Sky in
Tailwind-stijl) die OS-voorkeur respecteerde. Een conventionele SaaS-admin-esthetiek.

**Wat nog sterk is.** De tokenarchitectuur zelf. Omdat alles via CSS-variabelen loopt, is een
lichte modus een drop-in re-theme. Het lichte `:root`-blok uit `2d49854` mapt 1-op-1 op de huidige
componentklassen.

**Wat achterhaald is.** De specifieke lichte waarden (koel wit `#f4f6f8`, sky-blue `#0ea5e9`, koele
slate-tekst), de FTRLABS-branding, de automatische `prefers-color-scheme`-switch. Off-brand voor
Maculis.

**Waarom het "groter" aanvoelde.** Niet door functionaliteit. Een licht/blauw canvas met witte
kaarten en sky-blue primary pattern-matcht op brede horizontale platformproducten. De huidige
donker/amber-skin is bewust smaller en opinion-rijker: "clearly the admin environment behind
Maculis, not a copy of the journey". De ervaren verkleining is puur esthetisch.

**Conclusie voor de opdracht.** We herstellen geen oude UI. We nemen de *drop-in re-theme-kwaliteit*
mee (een lichte Maculis is technisch triviaal) en, belangrijker, we bouwen de productgedachte die
in beide oude skins ontbrak: selectie boven weergave.

---

## 3. Future information architecture

Voorgestelde primaire bestemmingen. Onderzoekscategorieën uit de brief, hier verbeterd en benoemd.

| Bestemming | Rol | Bestaat nu als |
|---|---|---|
| **Vandaag** | Betekenis, aandacht, reveals, volgende handelingen. De home. | Attention Cockpit (deel van Testerbeheer) |
| **Relaties** | De volledige relationship universe. Zoeken, segmenteren, memory, context. | Testertabel + Workspace |
| **Gesprekken** | Omnichannel communicatie. Kanaal is metadata, relatie is de eenheid. | Inbox (`comm.html`) |
| **Lenzen** | First Five en toekomstige lenzen. Evidence, observations, reveals. | First Five (extern) + Inzichten-tab |
| **Journeys** | First Five, toekomstige journeys, invitations, progressie. | Testerbeheer lifecycle + invitation flow |
| **Groei** | GrowBrain. Verschijnt wanneer er genoeg begrepen is. | nog niet |
| **Beheer** | Templates, imports, instellingen, operationele controls. | topbar-acties + modals |

Twee principes bepalen deze indeling:

1. **Relationship first.** Maculis heeft geen inbox met contacten eraan. Maculis heeft relaties waar
   communicatie, journeys, evidence en intelligence doorheen lopen. Gesprek, journey, memory en
   provenance horen allemaal bij de relatie. Elke ingang (Vandaag-item, gesprek, zoekresultaat) leidt
   snel naar de juiste relatiecontext zonder in CRM-detailpagina's te verdrinken.
2. **Communication is een laag, niet het product.** Gesprekken ondersteunt relaties. Vandaag e-mail,
   later WhatsApp/SMS/telefonie. Nooit vier verschillende inboxproducten. Eén coherent
   attention-model over alle kanalen.

---

## 4. Attention model

Eén toekomstvaste attention-laag. Een attention-item kan verwijzen naar een relationship, een
conversation, een journey, een reveal, een lens observation of een toekomstig finance/marketing
signal. Geen generiek event-platform, alleen genoeg om te voorkomen dat elke toekomstige module zijn
eigen badge- en tellersysteem bouwt.

### 4.1 De hiërarchie (Nederlandse semantiek, niet de Engelse labels uit de brief)

| Tier | Semantiek | Wanneer |
|---|---|---|
| **Nu** | Vereist menselijke aandacht. | Klant wacht, levering mislukt, iemand vraagt iets. |
| **Beweging** | Betekenisvol signaal, geen directe actie. | Een relatie verandert, een patroon breekt. |
| **Klaar** | Maculis heeft iets voorbereid. | Een concept-antwoord staat klaar voor jouw goedkeuring. |
| **Rust** | Niets hoeft nu. Een successtatus. | De rest is stil. Zichtbaar gemaakt, niet verstopt. |

Dit bouwt direct voort op de bestaande afgeleide attention-status
(`NEW/UNREAD/NEEDS_ACTION/REPLY_READY/WAITING_FOR_CUSTOMER/RESOLVED/DELIVERY_PROBLEM`, zie
`server/comm/attention.mjs`). De cockpit-tiers zijn een menselijke groepering daarvan, geen nieuw
opgeslagen veld. Attention blijft afgeleid, nooit dubbel opgeslagen.

### 4.2 Waar aandacht landt

De vraag uit de brief was: waar landt aandacht in Maculis? Antwoord: op **Vandaag**, als geselecteerde
tiers. Niet als nog een notificatieblok boven een tabel. Het huidige cockpit-concept is waardevol en
blijft, maar verhuist van "blokje boven de testertabel" naar de primaire bestemming, en wordt
bronneutraal: een e-mail, een reveal en straks een finance-signaal delen dezelfde tier-taal.

---

## 5. Reveal interaction model

De belangrijkste onderzoeksvraag: kan Reveal groter worden dan First Five? **Ja.** Reveal wordt de
productbrede interactietaal, niet een journey-resultaat.

### 5.1 Het patroon

```
Er valt iets op.                         (Maculis selecteert, toont minimaal)
   je opent
Kim reageert anders dan eerst.           (de observatie)
   je kijkt verder  ·  "Kijk nog eens."
Feit: antwoorden komen later binnen.     (evidence, laag 1)
   je kijkt verder
Observatie: de toon werd korter.         (evidence, laag 2, met zekerheid)
   je kijkt verder
Gevolgtrekking: begon na jullie gesprek. (samenval in tijd, expliciet geen bewezen oorzaak)
   je kijkt verder
Suggestie: een korte check zou passen.   (nooit een dwang; geen actie is ook goed)
```

Progressive disclosure with meaning. Geen dump van alle informatie tegelijk. "Kijk nog eens." wordt
een ontwerpprincipe, niet een slogan die overal herhaald wordt.

### 5.2 De gate (heilig)

Geen dashboardkaart mag zich als reveal vermommen. Een reveal moet:

- evidence-grounded zijn;
- betekenisvol zijn;
- verrassend of inzichtgevend zijn;
- voldoende betrouwbaar zijn;
- geen causaliteit verzinnen (samenval in tijd wordt expliciet zo benoemd);
- geen zwakke observatie tonen omdat het scherm anders leeg is.

**Never weaken a gate to avoid silence. Expand evidence before lowering truth standards.** Als er
niets betekenisvols is, toont Vandaag stilte ("Je bent bij."), niet vijf zwakke insights.

### 5.3 De provenance-typen

De UI toont het verschil tussen vier soorten kennis zonder academisch te worden:

- **Feit** (groen): een meting, geen interpretatie.
- **Observatie** (amber): een waargenomen patroon, met zekerheidspercentage.
- **Gevolgtrekking** (warn): een verband, met expliciete onzekerheid en geen verzonnen oorzaak.
- **Suggestie** (gedempt): wat je *zou kunnen* doen, nooit wat je *moet*.

Elke intelligence heeft provenance, evidence en confidence, en is human-interpretable. Dit is zowel
in de docs als in het prototype geïmplementeerd (zie de reveal-lagen in `cockpit.js`).

### 5.4 Toekomstige lenzen via Reveal

Hetzelfde patroon draagt later Finance ("Je groeit. Je vrije ruimte niet.") en Marketing
("Je wordt beter gevonden. Alleen niet door de mensen die je probeert te bereiken."). In het
prototype is dit als scenario 4 opgenomen, **ondubbelzinnig gemarkeerd als PROTOTYPE DATA en als
hypothetische, nog niet bestaande lens.** Geen fake intelligence.

---

## 6. Relationship model

- Conversation hoort bij relationship.
- Journey hoort bij relationship.
- Lens observations kunnen relationship-context krijgen.
- Memory hoort bij relationship.
- Communication history hoort bij relationship.
- Introductions (Pass the Lens) horen bij relationship provenance.

De huidige `server/comm/relationship.mjs` aggregeert dit al. De architectuur klopt; wat verandert is
de *ingang*. In plaats van "tabel als startpunt" wordt de relatie bereikbaar vanuit elk aandachtsitem,
elk gesprek en elke zoekopdracht. De Relationship Workspace (Overzicht/Journey/Inzichten/
Communicatie/Activiteit) blijft de detailweergave, maar is niet langer de enige manier om context te
bereiken.

### Schaal: van 10 naar 10.000

| Aantal | Primair interactiemodel |
|---|---|
| 10 | Persoonlijke herkenning volstaat. Vandaag toont bijna alles. |
| 100 | Search, filter en attention worden belangrijk. |
| 1.000 | Segmentatie, intelligent selection en saved views worden noodzakelijk. |
| 10.000+ | Handmatig bladeren kan niet meer het startpunt zijn. Zoeken en betekenis wel. |

Architectonisch voorbereiden (nu): een attention queue, saved views, segmentatie-abstractie,
recent-movement als sorteersignaal, search als kerninteractie. **Niet nu implementeren:**
enterprise-segmentatie-UI, org-hierarchie-management, bulk-workflow-automatisering. Het prototype
toont scenario 5 (520 relaties) om te bewijzen dat de gekozen architectuur "waardevoller, niet
drukker" wordt bij schaal.

---

## 7. Visual direction A — Deep Maculis

Volledig voortbouwend op het huidige donker/bruin/goud. Warm bijna-zwart `#080503`, ivoor `#ece2d4`,
amber `#c8894a`, amber-getinte hairlines, Iowan-serif voor koppen.

- **Sterk in:** merkidentiteit, reveal-kracht (donker draagt contemplatie), avondgebruik, premium
  gevoel, het "zien" van betekenis. Bewijst zich al in productie.
- **Zwak in:** langdurig deep work (lange mails schrijven, finance-tabellen vergelijken) bij daglicht;
  grote datatabellen worden zwaar; sommige contrasten randen tegen WCAG AA aan.
- **Screenshot-test:** ruim voldoende. Herkenbaar zonder logo.

`/cockpit.html?dir=A`

---

## 8. Visual direction B — Maculis Licht

Een evolutie van de oorspronkelijke lichtere richting, maar met Maculis-warmte in plaats van
generieke SaaS-wit. Warme ivoor achtergrond `#f7f2ea`, roomwit oppervlak, warm bruine tekst
`#2b2114`, dieper amber `#9a5f21`, serif-koppen behouden.

- **Sterk in:** daglicht, deep work, grote lijsten, leesbaarheid, lage cognitieve belasting bij lang
  gebruik, toegankelijkheid (contrast is eenvoudiger te halen).
- **Zwak in:** reveal-kracht. Betekenis "verschijnt" minder in licht; de contemplatieve, bijna
  filmische kwaliteit van een donkere reveal gaat verloren. Risico dat het richting het generieke
  lichte SaaS-dashboard schuift dat we juist willen vermijden.
- **Screenshot-test:** net voldoende, dankzij serif, amber en warmte. Kwetsbaarder dan A.

`/cockpit.html?dir=B`

---

## 9. Visual direction C — Reveal / Work (dual-space), aanbevolen

De hypothese uit de brief, bewezen in het prototype. Maculis is niet simpelweg light óf dark. Er zijn
twee mentale ruimtes binnen één producttaal.

- **Reveal / Attention space** (donker, rijk, rustig): Vandaag, reveals, lenzen. Hier verschijnt
  betekenis en ontstaat nieuwsgierigheid.
- **Work / Analysis space** (lichter, neutraler): Gesprekken (lange mails), Relaties (grote lijsten),
  toekomstige finance-analyse. Hier werk je langdurig.

Kleur is geen theme-toggle maar cognitieve architectuur. Donker is zien. Licht is werken. Beide delen
één typescale, één spacingscale en één componentset, dus het blijft één product. De overgang volgt
automatisch de bestemming (Vandaag is donker, Gesprekken is licht), niet een handmatige schakelaar.

- **Sterk in:** vrijwel alles. Reveal-kracht (donker) én deep-work-bruikbaarheid (licht),
  differentiatie, dagelijks gebruik zowel overdag als 's avonds, schaalbaarheid.
- **Zwak in:** technische en conceptuele complexiteit. Twee ruimtes moeten consistent blijven; de
  overgang mag niet gimmicky voelen. Vereist strakke tokendiscipline (juist wat nu ontbreekt: twee
  losse tokensystemen).
- **Bewijs van de hypothese:** het prototype toont dat dezelfde componenten in beide ruimtes werken.
  Het gevaar (verwarrend of gimmicky) wordt bezworen door de overgang aan de bestemming te koppelen,
  niet aan een knop. Zie de tegengas in §12 voor de grens: twee ruimtes, nooit meer.

`/cockpit.html?dir=C&scn=reveal` (donker) versus `/cockpit.html?dir=C&scn=work` (licht)

---

## 10. Decision matrix

Kwalitatief beoordeeld. Sterk / gemiddeld / zwak, met argument. Geen pseudo-objectieve decimalen.

| Criterium | A · Deep Maculis | B · Maculis Licht | C · Reveal / Work |
|---|---|---|---|
| Maculis identity | **sterk** al bewezen | gemiddeld, warmte redt het | **sterk** donker draagt merk |
| Differentiation | sterk | zwak, lijkt op SaaS | **sterk** dual-space is uniek |
| Daily usability | gemiddeld, 's avonds top | sterk, overdag top | **sterk** past zich aan |
| Scalability | gemiddeld, tabellen zwaar | **sterk** | **sterk** lijsten in lichte ruimte |
| Reveal power | **sterk** | zwak, licht dempt reveals | **sterk** donkere reveal-ruimte |
| Deep-work usability | zwak, lang lezen vermoeit | **sterk** | **sterk** lichte werk-ruimte |
| Accessibility | gemiddeld, contrastranden | **sterk** | sterk, mits beide ruimtes AA halen |
| Technical complexity | **laag** | laag, drop-in re-theme | hoog, twee ruimtes onderhouden |
| Migration risk | **laag** | laag | gemiddeld, tokenwerk nodig |
| Mobile | gemiddeld | sterk | **sterk** mobiel kiest per view |
| Future lenses | sterk | gemiddeld | **sterk** reveals in donker, analyse in licht |
| GrowBrain fit | sterk | gemiddeld | **sterk** verdieping in reveal-ruimte |
| Communication fit | gemiddeld | **sterk** | **sterk** gesprek in werk-ruimte |
| Relationship fit | sterk | sterk | **sterk** |

Netto: A is het veiligst en snelst. B is het meest bruikbaar voor werk maar het zwakst voor identiteit
en reveal. C wint op productkracht en verliest alleen op complexiteit.

---

## 11. Recommendation

**Bouw richting C, Reveal / Work, gefaseerd, met richting A als vertrekpunt.**

De redenering:

1. C is de enige richting die zowel de reveal-kracht (donker om te zien) als de deep-work-bruikbaarheid
   (licht om te werken) haalt. Beide zijn essentieel voor een product dat je twintig keer per dag opent.
2. C is de enige richting die de brede toekomst (finance-analyse, grote lijsten, lange mails) draagt
   zonder de contemplatieve reveal op te offeren.
3. Het enige echte nadeel, complexiteit, is beheersbaar en valt samen met werk dat toch al moet
   gebeuren: de twee losse tokensystemen consolideren tot één bron. Dual-space *dwingt* die discipline
   af, wat op zich gezond is.
4. Je hoeft niet te kiezen tussen A en C. C begint als A (de donkere reveal-ruimte is de huidige
   Deep Maculis) en voegt daarna de lichte werk-ruimte toe. A is dus fase 1 van C, niet een concurrent.

Als je risico wilt minimaliseren en snelheid boven differentiatie stelt: kies A en stel de lichte
werk-ruimte uit. Als je Maculis maximaal onderscheidend wilt maken: kies C. Kies **niet** B als
enige richting, want het offert precies datgene op wat Maculis apart maakt.

---

## 12. Tegengas (de brief vroeg hier expliciet om)

Ik bevestig je hypotheses niet automatisch. Drie punten waar ik tegenin ga:

1. **Het oude witte dashboard was niet beter, en niet groter.** Je herinnering dat het "sterker
   aanvoelde als groter product" klopt als *gevoel*, maar de oorzaak is niet wat je denkt. Het was
   dezelfde tabel in een generieke licht/blauwe skin. Het voelde groter omdat generieke SaaS-esthetiek
   breedte suggereert. Als je die richting puur herstelt, krijg je een minder onderscheidend product
   terug, niet een groter. Herstel de *productgedachte* (selectie), niet de skin.

2. **Dual-space is krachtig maar gevaarlijk als het meer dan twee ruimtes wordt.** De verleiding zal
   zijn om per module een eigen ruimte te maken. Doe dat niet. Twee ruimtes, gekoppeld aan één as
   (zien versus werken), is coherent. Drie of vier ruimtes is een gimmick en breekt de belofte. De
   grens bewaken is een productbeslissing, geen designdetail.

3. **Testerbeheer moet niet verdwijnen als naam.** De brief oppert dat de tabel "Relaties" wordt.
   Deels waar: de primaire relationship universe hoort onder Relaties. Maar Testerbeheer is een
   bewezen, geladen operationele view (invitation lifecycle, consent-gates, Pass the Lens intake). Die
   verdient te blijven bestaan als gespecialiseerde journey-view onder Journeys, niet opgeheven te
   worden. Twee views, één datamodel. Zie §13-C.

Kleinere tegengas:

- **"Vandaag" is een goede naam, beter dan "Dashboard", maar test hem.** Een dashboard toont data,
  Maculis stuurt aandacht, dus "Dashboard" is fout. "Vandaag" is sterk omdat het tijd en selectie
  impliceert. Enige risico: als iemand ook morgen of gisteren wil zien, kan "Vandaag" te letterlijk
  voelen. Alternatief om te overwegen: "Nu". Mijn advies blijft "Vandaag".
- **Reveal productbreed maken: ja, maar met een strak plafond.** Als alles een reveal wordt, is niets
  meer een reveal. De gate in §5.2 is niet optioneel. Liever drie echte reveals per week dan drie per
  dag.

---

## 13. Acceptance questions

**A. Wat is Maculis Home?** Vandaag. Een geselecteerde, bronneutrale aandachtsomgeving die toont wat
nu betekenis heeft, niet alles wat er is. Geen rij KPI-kaarten.

**B. Is "Vandaag" de juiste naam?** Ja. Beter dan "Dashboard" (dat toont data; Maculis stuurt
aandacht). Enig alternatief om te testen: "Nu". Aanbeveling: houd "Vandaag".

**C. Wat gebeurt er met Testerbeheer?** Het blijft, als gespecialiseerde operationele journey-view
onder Journeys (invitation lifecycle, consent, Pass the Lens). Het wordt niet de drager van de
toekomstige relatiearchitectuur en niet opgeheven.

**D. Wat gebeurt er met Inbox?** Het wordt "Gesprekken", een omnichannel-laag binnen relaties. Kanaal
wordt metadata. Aandacht uit gesprekken verschijnt op Vandaag; de volledige communicatie leeft onder
Gesprekken; gespreks-historie leeft binnen de relatie. Geen vier inboxproducten.

**E. Verschil tussen Relaties en Testerbeheer?** Relaties is de volledige relationship universe (alle
relaties, alle context, alle kanalen, memory, intelligence). Testerbeheer is een operationele view op
één journey (First Five testers, lifecycle, invitations). Zelfde datamodel, andere lens.

**F. Hoe ziet Maculis eruit met 1.000 relaties?** Niet als een lijst van 1.000. Vandaag toont de
handvol die beweegt; Relaties biedt zoeken, saved views en segmentatie; de rest is bereikbaar maar
rustig. Waardevoller, niet drukker. Zie scenario 5.

**G. Waar verschijnen reveals?** Op Vandaag als primaire plek, binnen de relatie voor context, en in
de Lenzen-werkruimte voor verdieping. Nooit als vermomde dashboardkaart.

**H. Wanneer blijft Maculis stil?** Wanneer er niets is dat de gate haalt. Stilte is een successtatus:
"Je bent bij. Voor nu hoeft er niets van je." Beter dan vijf zwakke insights.

**I. Dark, light of dual-space?** Dual-space (richting C). Donker om te zien, licht om te werken.

**J. Welke elementen uit het oude dashboard moeten terugkomen?** Geen skin. Wel de *technische
kwaliteit* (tokengebaseerd, drop-in re-theme) en de *productgedachte* die beide oude skins misten:
selectie boven weergave. De lichte werk-ruimte van richting C is de goede erfgenaam van "licht", niet
het oude blauw.

**K. Dé signature interaction die geen ander CRM heeft?** "Kijk nog eens." Reveal-progressive-disclosure
met provenance: iets valt op, je kijkt, evidence verschijnt laag voor laag, met feit/observatie/
gevolgtrekking/suggestie en expliciete onzekerheid. Geen enkel CRM toont intelligence zo eerlijk en zo
rustig.

**L. Hoe verbindt dit met GrowBrain?** GrowBrain verschijnt niet als upgrade-knop. Wanneer een reveal
laat zien dat er "iets onder zit" en Maculis genoeg begrijpt om een diepere stap betekenisvol te maken,
opent zich de verdieping. De overgang voelt als natuurlijke nieuwsgierigheid, niet als sales.

**M. Welke delen kunnen veilig als eerste gebouwd worden?** De nieuwe shell plus Vandaag naast het
bestaande Testerbeheer (fase 1). Tokenconsolidatie tot één bron (fase 1). Beide additief en
rollbackbaar. Zie §14.

**N. Welke delen mogen absoluut nog niet gebouwd worden?** Finance/Marketing/Reputation-lenzen als
echte intelligence (alleen als hypothetische, gemarkeerde prototypes). GrowBrain-salesfeatures.
Enterprise-segmentatie. Elke reveal zonder echte evidence. Geen productie-rewrite.

---

## 14. Migration strategy

Elke fase is backwards compatible, rollbackbaar, testbaar en zelfstandig waardevol. Illustratief pad,
afgestemd op de echte code.

- **Fase 0. Behouden.** Bestaande productie ongewijzigd. Prototype staat additief naast onder
  `/cockpit.html`. (Dit is de huidige staat na deze run.)
- **Fase 1. Shell + Vandaag + tokenbron.** Nieuwe shell en Vandaag-bestemming naast het bestaande
  Testerbeheer. Consolideer de twee tokensystemen (`styles.css` versus de inline `:root` in
  `comm.html`/`workspace.html`) tot één gedeelde bron. Vandaag hergebruikt de bestaande
  `attentionOverview`. Rollback: verwijder de nieuwe route.
- **Fase 2. Communication integreren.** Inbox wordt "Gesprekken" binnen de nieuwe shell, met de
  tier-taal Nu/Beweging/Klaar/Rust. Bestaande draft-, consent- en threading-logica ongewijzigd.
- **Fase 3. Relaties abstraheren van Testerbeheer.** Introduceer Relaties als de volledige universe;
  Testerbeheer blijft als journey-view. Search en saved views toevoegen. Zelfde datamodel.
- **Fase 4. Reveal / intelligence primitives.** Reveal als herbruikbaar componentmodel, met de gate en
  de provenance-typen. Eerste echte relationship-reveal alleen bij aantoonbare evidence.
- **Fase 5. Dual-space voltooien.** De lichte werk-ruimte activeren voor Gesprekken en Relaties.
  Vandaag en reveals blijven donker.
- **Fase 6. Toekomstige lenzen / GrowBrain.** Alleen wanneer evidence en begrip het rechtvaardigen.

De volgorde is bewust: waarde eerst (Vandaag), dan hygiëne (tokens), dan de grote abstracties, dan de
intelligence, dan de tweede ruimte, dan de toekomst. Op elk moment kun je stoppen met een werkend,
waardevoller product.

---

## 15. Prototype

Locatie: `public/cockpit.html`, `public/cockpit.css`, `public/cockpit.js`. Geïsoleerd en additief.
Raakt geen productiefunctionaliteit. CSP-safe (externe JS, geen inline handlers). Alle data is
PROTOTYPE DATA (fictief), zichtbaar gemarkeerd.

Bediening: bovenin schakel je tussen **richting** (A/B/C) en **scenario** (1 tot 6). Deep-links via
`?dir=` en `?scn=` (en `?expand=1` om alle reveal-lagen ineens te tonen).

De zes verplichte scenario's:

| # | Scenario | Wat het toont | Deep-link |
|---|---|---|---|
| 1 | Quiet morning | Stilte als successtatus. "Je bent bij." | `?scn=quiet` |
| 2 | Communication | Twee gesprekken vragen aandacht, twee antwoorden staan klaar. Tiers Nu/Klaar/Rust. | `?scn=comm` |
| 3 | Relationship reveal | Eén evidence-grounded observatie met feit/observatie/gevolgtrekking/suggestie. | `?scn=reveal` |
| 4 | Lens reveal | Een hypothetische Finance-lens, ondubbelzinnig als prototype gemarkeerd. | `?scn=lens` |
| 5 | Scale | 520 fixture-relaties. Toont wat beweegt, niet alles. | `?scn=scale` |
| 6 | Deep work | Gesprek plus AI-voorstel plus context. In richting C: de lichte werk-ruimte. | `?scn=work` |

Signature interactions in het prototype:

- Een reveal die rustig ontstaat en laag voor laag opengaat op "Kijk nog eens."
- Evidence die pas verschijnt wanneer je verder kijkt.
- Een relatie die subtiel naar voren komt in Relaties omdat er iets veranderd is ("Er beweegt iets").
- Een zero-state die bijna uitademt (de ademende oog-cirkel, reduced-motion-safe).

Toegankelijkheid in het prototype: toetsenbaar, `aria-pressed` op de schakelaars, `aria-current` op
navigatie, zekerheidsbalken met `role="img"` en `aria-label`, kleur nooit het enige signaal,
`prefers-reduced-motion` gehonoreerd, responsive met echte mobile intent (navigatie klapt in, Vandaag
toont één boodschap).

---

## 16. De ultieme test

- **Screenshot-test.** Zonder logo herkenbaar? Ja. De serif-greeting, de warme amber, de tier-taal, de
  reveal met provenance en de "Kijk nog eens."-knop maken het onmiskenbaar iets anders dan een mooie
  SaaS-app. Richting C en A slagen ruim; B net.
- **500-relaties-test.** Waardevoller of drukker met 500 relaties? Waardevoller. Vandaag toont de
  handvol die beweegt, de rest is rustig en bereikbaar. Zie scenario 5.
- **20-keer-per-dag-test.** Wil je hier twintig keer per dag naar terug? Ja, omdat je weet: als er iets
  werkelijk toe doet, zie ik het hier. En als er niets is, zwijgt het.

---

## 17. De ene beslissing die nu nodig is

**Welke visuele richting wordt de basis: A (Deep Maculis, veilig en snel) of C (Reveal / Work,
onderscheidend, met A als fase 1)?**

Mijn aanbeveling: C, gestart als A. Richting B niet als enige keuze.

Alle overige stappen (shell, Vandaag, tokenconsolidatie, Gesprekken, Relaties, Reveal-primitives)
volgen uit die keuze en staan in §14. Geen productie-rewrite tot de richting expliciet gekozen is.

---

## 18. Verdiepingsronde (richting C bewezen en gestrest)

Ludwig koos richting C. Deze ronde bracht het prototype naar een niveau waarop de ervaring echt te
beoordelen is, met realistische fixtures (lange namen, lange organisaties, lange e-mailadressen, 520
relaties, lege en uitzonderlijke states, mobiel, reduced motion, toetsenbord). Geen prototype-theater.

### 18.1 Wat nu concreet in het prototype zit

**Vandaag met vier echte states** (`/cockpit.html?scn=vandaag&day=...`):

- **Rustig.** Stilte als successtatus. "Je bent bij. Voor nu hoeft er niets van je."
- **Eén ding.** Precies één item krijgt het hele podium. "Het enige dat nu telt." 519 relaties blijven
  rustig en bereikbaar. Bewijst dat Maculis durft te reduceren tot één.
- **Normaal.** Enkele betekenisvolle items over Nu, Beweging en Klaar, plus rust.
- **Druk.** Zevenendertig gebeurtenissen vannacht, maar geen zevenendertig kaarten. Drie stijgen naar
  Nu, twee reveals naar Beweging, twee antwoorden naar Klaar. De overige vierendertig worden
  samengevat in één rustige, openbare regel. Dit is het bewijs dat Maculis rustiger wordt bij meer
  informatie, niet drukker.

**Drie signature interactions** die andere CRM- en dashboardproducten niet vanzelf hebben:

1. **Kijk nog eens.** De reveal. Feit, observatie, gevolgtrekking, suggestie verschijnen laag voor
   laag, met zekerheid en herkomst, en een expliciete "Waarom laat Maculis mij dit zien?". Onzekerheid
   wordt getoond, causaliteit nooit verzonnen ("samenval in tijd, geen bewezen oorzaak"). Silence is
   een first-class success state naast de reveal.
2. **Terugval in rust.** Een afgehandeld item verdwijnt niet met een schok. Het verzadigt uit, krimpt
   en zakt zichtbaar terug in een rust-zone ("afgehandeld, zojuist"). Het tegenovergestelde van een
   notificatie die ploft en weg is. Behandelde dingen worden rustig, niet weg.
3. **De stille meerderheid.** Op een drukke dag houdt Maculis de ruis samengevat in één regel die je
   pas opent als je erom vraagt. Maculis imponeert door wat het besluit niet te tonen.

**Relaties op schaal** (`?scn=relaties`): door Maculis voorgestelde weergaven (er beweegt iets, actief
gesprek, lang stil was actief, First Five afgerond, alle relaties), gesorteerd op recent movement in
plaats van alfabet, met per rij context (laatste gesprek, journey, geheugenhint) en een reveal-badge
waar er een reveal klaarstaat. Zoeken is de kerninteractie. De volledige lijst blijft bereikbaar maar
is niet het startpunt.

**Gesprekken omnichannel** (`?scn=gesprekken`): de relatie is de eenheid, het kanaal is metadata. Een
gesprek toont e-mail, WhatsApp, SMS of telefoon als context ("ook via telefoon"), niet als apart
inboxproduct. Eén aandachtsmodel over alle kanalen.

**Work space** (`?scn=work`): de lichte ruimte voor diep werk. Een lange, realistische mail, een lang
concept-antwoord, relatiecontext, journey en geheugen ernaast. En, cruciaal, een **donkere reveal
aperture binnen de lichte ruimte** ("Binnen dit gesprek valt iets op"). Zien gebeurt in donker, ook
midden in het werken in licht.

### 18.2 Dual-space kritisch getest (geprobeerd kapot te redeneren)

- **Voelt donker naar licht natuurlijk?** Ja, mits de overgang aan de route hangt, niet aan een knop.
  In het prototype wisselt de ruimte wanneer je van kijken (Vandaag, Reveal) naar werken (Gesprekken,
  Relaties, Work) gaat. Je flipt nooit midden in een taak.
- **Eén product of twee?** Eén, zolang beide ruimtes exact dezelfde typescale, spacing en
  componentset delen. Ze doen dat in het prototype. Alleen de tokens verschillen. Zodra een ruimte een
  eigen componenttaal zou krijgen, worden het twee producten. Dat is de bewakingsgrens.
- **Wanneer wisselt de ruimte precies?** Op route/bestemming, wat neerkomt op intentie (zien versus
  werken). Niet per taak binnen een scherm, niet handmatig.
- **Hoe werkt terugkeer?** Symmetrisch. Terug naar Vandaag is terug naar donker. Voorspelbaar.
- **Reveal binnen een lichte werkcontext?** Als een donkere aperture. Zo blijft "zien" altijd donker,
  ook binnen een lichte kamer. Dit is de elegantste vondst van deze ronde en het antwoord op de vraag
  die dual-space had kunnen breken.
- **Communicatie?** Leeft in de werkruimte (licht), met aandacht die naar Vandaag (donker) stroomt.
- **Mobiel?** De ruimte wisselt nog steeds op bestemming. Vandaag blijft donker en selecteert scherper
  (één ding, twee gesprekken). Werk opent in licht. Getest op een echt smal scherm (402 px, device
  emulation): geen horizontale overflow, alles vouwt.
- **Visuele vermoeidheid?** Het risico is echt: snel heen en weer flipperen tussen donker en licht
  vermoeit. Mitigatie in het prototype: overgangen zijn traag en geëased, de ruimte is stabiel per
  bestemming (je flipt niet constant), en `prefers-reduced-motion` schakelt de overgang uit.

**Waar dual-space alsnog zou kunnen verliezen van volledig Deep Maculis:** als je in de praktijk merkt
dat je de hele dag in de werkruimte zit (veel mail, veel lijsten) en Vandaag maar kort bezoekt, dan
draag je de kosten van twee ruimtes voor een donkere ruimte die je weinig ziet. In dat gebruikspatroon
is volledig licht (of volledig donker) eenvoudiger. Dit is een empirische vraag die alleen echt gebruik
beantwoordt. Het prototype maakt die vraag toetsbaar; het beslist hem niet.

### 18.3 C versus A na verdieping

| Dimensie | A · Deep (alles donker) | C · Reveal/Work (dual-space) |
|---|---|---|
| Reveal en aandacht | sterk | sterk, identiek aan A in de reveal-ruimte |
| Lange mail schrijven | zwak, donker vermoeit bij lang lezen/typen | **sterk**, lichte werkruimte |
| Grote lijsten scannen | gemiddeld | **sterk**, licht leest rustiger bij dichtheid |
| Eén product-gevoel | **sterk**, per definitie één ruimte | sterk, mits tokendiscipline streng blijft |
| Complexiteit | **laag** | hoger, twee palettes onderhouden |
| Risico op incoherentie | **laag** | reëel, vereist bewaking |
| Dagelijkse duurzaamheid | goed 's avonds, zwaarder overdag | **sterk**, past zich aan het moment aan |

Na de verdieping blijft de conclusie: C wint op productkracht en dagelijkse duurzaamheid, A wint op
eenvoud en zekerheid. Het verschil is scherper geworden, niet kleiner. De donkere reveal-aperture in
de lichte werkruimte is de doorslag: het bewijst dat C de reveal-kracht van A volledig behoudt en er
de werkruimte bovenop legt, zonder de reveal op te offeren.

### 18.4 Het belangrijkste zwakke punt van C

**De coherentie hangt aan discipline die het huidige product nog niet heeft.** Vandaag bestaan er twee
losse tokensystemen (bruin voor Testerbeheer, grafiet/goud voor Inbox en Workspace). C vraagt het
tegenovergestelde: één gedeelde tokenbron met twee kleurmodi die perfect synchroon lopen. Als die
discipline verslapt, wordt C twee producten die op elkaar lijken, precies de generieke SaaS-uitkomst
die we willen vermijden. C is dus niet alleen een designkeuze, het is een verplichting tot
tokenhygiëne. Dat is beheersbaar en valt samen met werk dat toch moet gebeuren (§14, fase 1), maar het
is een echte kost en het is de plek waar C kan mislukken. Wie C kiest, kiest die discipline.

Tweede zwakte, kleiner: de dubbele-ruimte legt een leercurve op ("waarom is dit scherm ineens licht?").
De route-gebonden overgang en de badge "Reveal space / Work space" dempen dit, maar het is een concept
dat je één keer moet snappen. Voor een product dat je twintig keer per dag opent is dat aanvaardbaar.

### 18.5 Definitieve aanbeveling

**Houd vast aan C, gestart als A, en maak tokenhygiëne tot voorwaarde vooraf.** De verdieping heeft C
niet verzwakt maar versterkt, met de reveal-aperture als sluitstuk. Bouw fase 1 (shell, Vandaag,
tokenconsolidatie) als A-in-donker en voeg de lichte werkruimte pas toe wanneer de gedeelde tokenbron
staat en bewezen synchroon loopt. Zo krijg je de kracht van C zonder het risico ervan vooruit te nemen.

Zou echt gebruik uitwijzen dat je vrijwel alleen in de werkruimte leeft, val dan terug op één ruimte
(waarschijnlijk licht). Die uitweg is goedkoop omdat C toch al één gedeelde tokenbron gebruikt: één
ruimte uitzetten is een configuratie, geen herbouw.

### 18.6 Prototype en screenshots

- **Klikbaar (live):** dezelfde Artifact-URL, nu verdiept. Schakel bovenin richting (C/A) en scherm;
  op Vandaag schakel je de dagstate (rustig, één ding, normaal, druk).
- **Deep-links:** `?dir=C&scn=vandaag&day=busy`, `?scn=reveal&rev=r-saar`, `?scn=relaties&seg=stil`,
  `?scn=work`, plus `&expand=1` om alle reveal-lagen ineens te tonen.
- **Bestanden:** `public/cockpit.html`, `public/cockpit.css`, `public/cockpit.js`. Geïsoleerd,
  additief, CSP-safe. Alle data PROTOTYPE DATA.

Geen productie-implementatie tot Ludwig het prototype zelf heeft beoordeeld en expliciet GO geeft.

---

## 19. First-day UX test en IA-herziening (lens uit de navigatie)

Aanleiding: een nieuwe collega moet zonder uitleg kunnen beginnen. De interface mag niet vragen dat
hij eerst onze interne structuur leert. Uitgangspunt: je begint op Vandaag, Maculis selecteert wat
aandacht verdient en brengt je vandaar naar het juiste gesprek, de juiste relatie of het juiste
inzicht. De andere ruimtes zijn er voor zoeken, verdiepen en specifiek werk.

### 19.1 De test (nieuwe collega, nul uitleg, vijf minuten)

Ik heb richting C doorlopen alsof ik net binnen ben. Per vraag het oordeel voor en na de aanscherping.

| Vraag | Voor | Na |
|---|---|---|
| Wat doet Maculis voor mij? | Onduidelijk. Zeven navigatie-items en het jargon "Reveal space" dwongen me een taxonomie te leren. | De orientatie zegt het in drie regels: Maculis kijkt, onthoudt, en laat het zien als iets ertoe doet. |
| Waar begin ik mijn dag? | Vandaag stond bovenaan, maar zonder dat gezegd werd. | "Begin gewoon bovenaan." De drie dagelijkse bestemmingen staan apart bovenaan. |
| Wat vraagt nu mijn aandacht? | Al goed. De tier Nu is helder. | Ongewijzigd sterk. |
| Wat moet ik vervolgens doen? | Onduidelijk. Niet zichtbaar dat een kaart klikbaar is. | Elk item toont "Open het gesprek" met een pijl en een chevron. De kaart opent het gesprek. |
| Waar vind ik een relatie terug? | Relaties, vindbaar. | Ongewijzigd. Vandaag brengt je er ook vanzelf heen. |
| Waar vindt communicatie plaats? | Gesprekken, maar de route vanaf Vandaag was niet benoemd. | Klikken op een aandachtsitem opent het gesprek. De route leert zichzelf. |
| Wat betekent een journey? | Alleen te snappen door het tabblad Journeys te openen. | Je ontmoet "journey" binnen de relatie (First Five, sessie 1 van 5) en op Vandaag, in context. |
| Hoe verschijnen reveals, zonder "lens" te snappen? | Een navigatie-item "Lenzen" suggereerde dat ik een concept moest leren voordat ik kon werken. | "Lenzen" is uit de navigatie. Reveals verschijnen gewoon op Vandaag als "Er valt iets op". |

### 19.2 De kern: lens is geen plek

We haalden twee dingen door elkaar. **Een lens is hoe Maculis kijkt. Een reveal is wat Maculis laat
zien wanneer de uitkomst betekenisvol is.** Een medewerker heeft geen dagelijkse werkruimte nodig om
"alle reveals van bestaande relaties" te bekijken. Daarom is Lenzen **uit de primaire navigatie
gehaald**. De lens wordt een onderliggende intelligentielaag die door heel Maculis heen werkt en op
drie plekken zichtbaar wordt:

1. **Op Vandaag**, als een reveal, wanneer de uitkomst er nu toe doet. Een eerdere reveal mag
   **terugkomen** wanneer nieuwe gebeurtenissen hem weer relevant maken (zichtbaar als "Kwam terug").
2. **In de relatie**, als geheugen. Het nieuwe paneel **"Wat Maculis zag"** toont per relatie welke
   lens liep, wat de reveal was en wat daarna gebeurde. Hier zie je de geschiedenis terug, niet in een
   apart Lenzen-tabblad.
3. **In Groei**, wanneer Maculis een patroon over meerdere relaties of losse reveals samen ziet. Dat
   is intelligence op een hoger niveau, geen dagelijkse bladerruimte.

Principe, door de hele interface heen: **Maculis kijkt. Maculis onthoudt. En als iets ertoe doet, laat
Maculis het zien.**

### 19.3 De herziene informatiearchitectuur

Primaire navigatie, opnieuw beoordeeld vanuit het werk van de gebruiker.

**Dagelijks (bovenaan, waar het oog landt):**
- **Vandaag.** Start. Aandacht en reveals. Vanaf hier routeert Maculis je naar de rest.
- **Relaties.** Zoeken en verdiepen. De volledige universe, met per relatie het geheugen.
- **Gesprekken.** Communicatie, omnichannel, binnen de relatie.

**Verder (rustiger, wanneer je het nodig hebt):**
- **Journeys.** Operationeel: First Five pipeline en Testerbeheer. Je komt hier zelden vanuit het niets.
- **Groei.** Intelligence over meerdere relaties. Verschijnt wanneer verdiend.
- **Beheer.** Templates, imports, instellingen.

**Verwijderd uit de primaire navigatie:** Lenzen. Niet omdat lenzen onbelangrijk zijn, maar omdat een
lens iets is waarmee Maculis kijkt, geen bestemming waar de gebruiker heen navigeert.

De rail toont deze splitsing letterlijk: drie dagelijkse bestemmingen, een rustige scheiding met het
label "Verder", dan de secundaire drie. Een nieuwe collega hoeft op dag één alleen de bovenste drie te
begrijpen, en zelfs die leert hij vanzelf door vanuit Vandaag te klikken.

### 19.4 Wat behouden bleef

De cockpit blijft een intelligence-cockpit, geen SaaS-dashboard. Behouden: de aandachtshiërarchie
(Nu, Beweging, Klaar, Rust), de vier dagstates, de reveal met provenance en "Kijk nog eens.", de drie
signature interactions, de dual-space, stilte als successtatus. De orientatie is eenmalig en verdwijnt
zodra je hem wegklikt. Geen wizard, geen tour, geen permanente uitleg. Maculis blijft voelen alsof het
vóór je kijkt en je alleen lastigvalt wanneer iets ertoe doet.

### 19.5 In het prototype te zien

- Vandaag met orientatie en de herziene rail: `/cockpit.html?dir=C&scn=vandaag&day=normal`
- Zonder orientatie (na wegklikken): `...&firstday=0`
- Reveal die terugkwam: `?scn=reveal&rev=r-saar`
- Relatie met "Wat Maculis zag": `?scn=work`
- Groei als cross-relatie intelligence: `?scn=groei`

Nog geen productie, geen migratie, geen nieuwe functionaliteit. Alleen richting C op dit fundamentele
punt aangescherpt.
