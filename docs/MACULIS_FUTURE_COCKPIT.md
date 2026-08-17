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
>
> **Update na de meaning-first ronde (§20).** De permanente navigatie is verder teruggebracht tot
> **Vandaag, Relaties, Gesprekken plus een discrete Beheer**. Journeys is geen vaste bestemming meer
> (context binnen de relatie); Groei verschijnt alleen wanneer er echt een patroon over meerdere
> relaties bestaat. Relaties is herontworpen vanuit de 5.000-vraag: meaning-first, geen CRM-lijst. Het
> uitlegblok is weg; gedrag leert de gebruiker. §20 bevat ook de gevraagde tegengas op dit reduceren.
> Waar eerdere secties nog Journeys of Groei als vaste bestemming noemen, geldt §20 als de actuele stand.
>
> **Update na de agency-ronde (§21).** De prototype-besturing is volledig uit de productervaring gehaald
> (één navigatiemodel, alleen de linkerrail) en in een aparte "Prototype controls"-lade gezet. Relaties
> heeft nu twee modi: Maculis kiest, of jij hebt het stuur met een echte high-density werkruimte
> (zoeken, combineerbare filters, sorteren, selectie, bulkacties). §21 bevat de derde first-day test, de
> vier-intent stresstest, uitgebreide tegengas, en de aanbeveling dat de IA klaar is voor visuele
> verfijning.
>
> **Update na de dossier-ronde (§22).** Het bestaande Testerbeheer is getrouw teruggeplaatst onder
> Beheer › Testerbeheer (lifecycle, consent fail-closed, invite-flows, Pass the Lens, evaluaties), op
> basis van de echte code. En het ontbrekende niveau is toegevoegd: een volwaardig relatiedossier,
> meaning-first met detail-on-demand, waarin elke sectie eerlijk gelabeld is als A (in Maculis),
> B (afgeleid) of C (toekomstig). De navigatie Vandaag ↔ relatie ↔ gesprek ↔ overzicht is sluitend.
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

---

## 20. Meaning-first: nog kleinere navigatie, schaal tot 5.000, gedrag dat leert

Deze ronde maakt Maculis radicaal meaning-first, tot in de navigatie en tot op de schaal van 5.000
relaties. Richting C en de dual-space blijven. Geen productie, geen migratie, geen cosmetische polish.

### 20.1 De permanente navigatie krimpt

Getest en doorgevoerd: de permanente navigatie kan terug naar drie bestemmingen plus een discrete
Beheer.

- **Vandaag, Relaties, Gesprekken** zijn de enige permanente bestemmingen.
- **Beheer** staat discreet onderaan de rail, niet tussen het dagelijkse werk.
- **Journeys is geen permanente bestemming meer.** Een journey (First Five) is context en flow binnen
  een relatie: je ziet in de relatie waar iemand staat en wat de volgende stap is. De operationele
  kant (uitnodigen, pipeline, evaluaties) leeft onder Beheer, als Testerbeheer.
- **Groei is geen permanente bestemming meer.** Groei verschijnt in de navigatie alleen wanneer
  Maculis daadwerkelijk een betekenisvol patroon over meerdere relaties ziet. Bestaat dat niet, dan is
  Groei nergens. Je bereikt het via het patroon zelf, op Vandaag, niet via een vast tabblad.
- **Reveal is nergens een bibliotheek of feature.** Er is geen plek die "alle reveals" toont. Een
  reveal verschijnt uitsluitend waar en wanneer hij relevant is: op Vandaag, in een relatie, of als
  groei-patroon.

### 20.2 Schaal: wat gebeurt er bij 5.000 relaties?

Relaties is herontworpen vanuit deze ene vraag. Het resultaat mag geen CRM-lijst met slimmere filters
zijn, en is dat ook niet.

- Relaties opent niet met een lijst. Het opent met **betekenis**: "Van je 5.000 relaties bewegen er nu
  7." Die selectie is even groot bij 50 als bij 5.000 relaties. Maculis kiest; de gebruiker scrollt niet.
- De bewegende relaties staan als **rijke kaarten**, gegroepeerd op reden (vraagt jou, er beweegt iets,
  klaar, dreigt uit beeld), niet als tabelrijen.
- **Zoeken is de manier** om iemand anders te bereiken, prominent bovenaan. De volledige lijst van 5.000
  is er wel, maar bewust niet het startpunt: hij zit achter een rustige "Toon de volledige lijst", met
  de tekst "je hoeft er zelden doorheen".
- Cognitief kost 5.000 daardoor nauwelijks meer dan 50. De hoeveelheid die je ziet groeit niet mee met
  de populatie. Dat is het hele punt.

Hetzelfde principe stuurt Vandaag ("Bijna vijfduizend relaties, de meeste rustig") en Gesprekken ("Van
al je gesprekken vragen er nu drie iets").

### 20.3 De tweede first-day test, zonder uitlegblok

Het eerdere orientatieblok is verwijderd. Een nieuwe collega moet Maculis door gedrag begrijpen, niet
door een tekst. Getest op de drie vragen die er op dag één toe doen:

- **Wat vraagt mijn aandacht?** De begroeting zegt het in mensentaal ("Twee gesprekken vragen je
  aandacht. Eén antwoord staat klaar."). Daaronder staan de items onder heldere koppen: Nu, Beweging,
  Klaar, Rust. Je hoeft niets te leren om dit te lezen.
- **Waarom?** Elk item heeft "Waarom zie ik dit?" dat in één regel de herkomst toont. Geen jargon,
  geen paneel. De reden staat er zodra je erom vraagt.
- **Wat kan ik nu doen?** Elk item is een duidelijke deur: "Open het gesprek" met een pijl en een
  chevron, de hele kaart opent het gesprek, ook met toetsenbord. De route van aandacht naar gesprek
  naar relatie leert zichzelf door te klikken.

De navigatie helpt mee: drie bestemmingen zijn in één oogopslag te bevatten, en Journeys en Groei
staan er niet om te verwarren. Groei verschijnt alleen wanneer er echt iets te zien is, met een
duidelijke ingang vanuit Vandaag. Zo leert het product zichzelf uit, zonder wizard.

### 20.4 Tegengas: waar het reduceren risico heeft

De brief vroeg expliciet om tegengas als het uit de navigatie halen van Journeys of Groei een slecht
idee blijkt. Drie eerlijke risico's.

1. **Journeys als operationeel werk heeft een echt thuis nodig.** Een journey is prima context binnen
   één relatie, maar het *beheren* van een journey over veel mensen (vijftig testers importeren,
   uitnodigingen versturen, de funnel bewaken) is relatie-overstijgend werk. Als jij dat vaak en in
   volume doet, is het wegstoppen onder Beheer een verstopping, geen vereenvoudiging. Advies: houd het
   onder Beheer zolang het incidenteel is, maar als batch-journeywerk dagelijks terugkeert, verdient
   het een eigen operationele oppervlakte. Dan is het geen manier van kijken, maar een werkplek, en
   hoort het terug, alleen niet als "lens".

2. **Conditionele Groei is een ontdekbaarheidsrisico.** Iets dat alleen verschijnt wanneer er een
   patroon is, kan onopgemerkt blijven, en een eerder getoond patroon kan onvindbaar worden. In het
   prototype is dat deels ondervangen: het patroon wordt onthouden in de betrokken relaties en de
   nav-ingang verschijnt wanneer het speelt. Maar een nav-item dat komt en gaat kan onrustig voelen.
   Advies: laat Groei alleen verschijnen bij een echt patroon (rustig, voorspelbaar), en geef eerdere
   patronen een duurzame vindplaats (bijvoorbeeld onder Beheer of in de relatie), zodat waarde niet
   verdampt zodra het van Vandaag verdwijnt.

3. **Een navigatie van drie legt alle druk op Maculis' selectie en op zoeken.** Met minder handmatige
   ingangen moet de selectie op Vandaag kloppen en moet zoeken uitstekend zijn, want zoeken wordt de
   voornaamste manier om iemand te bereiken die niet toevallig vandaag beweegt. Als de selectie ooit
   incompleet is, heeft de gebruiker minder vangnet. Dit is geen reden om het niet te doen, wel om
   zoekkwaliteit als eerste-klas eis te behandelen, niet als bijzaak.

Netto: het reduceren is juist, mits deze drie randvoorwaarden bewust worden bewaakt. Journeys en Groei
horen niet als vaste dagelijkse tabbladen, maar hun onderliggende werk en waarde mogen niet verdwijnen,
alleen verhuizen naar waar ze thuishoren.

### 20.5 In het prototype te zien

- Kleinere nav en Relaties meaning-first bij 5.000: `/cockpit.html?dir=C&scn=relaties`
- De volledige lijst als bewuste fallback: `...&showall=1`
- Groei die verschijnt door een patroon (drukke dag): `?scn=vandaag&day=busy`, dan het patroon openen
- De Groei-patroonweergave: `?scn=groei&day=busy` (en de eerlijke lege staat: `?scn=groei&day=normal`)
- Gedrag dat leert, zonder uitlegblok: `?scn=vandaag&day=normal`

---

## 21. Eén navigatiemodel, en de cockpit als gereedschap (agency-ronde)

Deze ronde bewijst twee dingen tegelijk: dat er visueel maar één navigatiemodel bestaat, en dat de
cockpit niet alleen vóór de gebruiker kijkt maar ook krachtig gereedschap in zijn handen wordt.
Prototype only. Geen productie, geen migratie, geen nieuwe backend.

### 21.1 De twee navigatiesystemen ontward

De observatie klopte: er liepen twee navigaties door elkaar. Audit van de oude bovenbalk:

| Element bovenin | Wat het was | Oordeel |
|---|---|---|
| Richting (C/A) | visuele richting wisselen | **puur prototype** |
| Scherm (Vandaag/Reveal/Relaties/Gesprekken/Work) | naar een state springen | **puur prototype** (dupliceerde bovendien de linkernav) |
| Dag (rustig/één ding/normaal/druk) | een dagsituatie kiezen | **puur prototype** (een echte gebruiker kiest zijn dag niet) |
| Reveal-switch (Kim/Saar/lens) | een reveal kiezen om te tonen | **puur prototype** |

**Er zat geen enkele echte productfunctionaliteit bovenin.** Alles was besturing van het prototype.
Daarom is de hele bovenbalk uit de productervaring gehaald. Alle testbesturing zit nu in één discrete
"Prototype controls"-lade, bereikbaar via één klein knopje ("Prototype", rechtsonder), duidelijk buiten
de product-UI: donker, monospace, met een streepjeskader en de tekst "Alleen voor ontwerp en test. Een
echte gebruiker ziet dit niet." We gooien de controls dus niet weg, we zetten ze in een aparte
buitenlaag voor onszelf.

**Before/after (navigatie).**
- Before: links de echte IA, boven een tweede balk die grotendeels prototype-besturing was. Twee
  mentale modellen.
- After: links de enige navigatie (Vandaag, Relaties, Gesprekken, plus discrete Beheer en, alleen bij
  een patroon, Groei). De inhoud vertelt wat er gebeurt en wat je kunt doen. De prototype-lade staat
  los, zichtbaar als test-gereedschap, niet als product.

**Tegengas: is er horizontale productnavigatie die wél nodig is?** Op dit moment niet. De enige
serieuze kandidaat voor iets persistents bovenin is een globale zoekbalk. Maar zoeken hoort hier
contextueel: op Vandaag hoef je niet te zoeken (Maculis selecteert), en in Relaties staat zoeken
prominent in beide modi. Zou later een echt product-brede sprong nodig blijken (zoek over relaties,
gesprekken en journeys tegelijk), dan is een enkel zoekveld in de rail of een command-palette (toets
te openen) logischer dan een tweede horizontale balk. Advies: houd het bij één nav-model tot echt
gebruik een globale sprong afdwingt, en los dat dan op met zoeken, niet met tabbladen.

### 21.2 Het fundamentele interactieprincipe: Maculis voor jou versus jij van Maculis

De cockpit maakt nu expliciet onderscheid tussen twee houdingen.

- **Maculis heeft iets voor jou.** Vandaag, en de standaardingang van Relaties ("Maculis kijkt voor
  je"). Hier selecteert en duidt Maculis. De gebruiker hoeft niet te zoeken, filteren of configureren.
- **Jij wilt iets van Maculis.** De werkmodus van Relaties ("Jij hebt het stuur"). Hier zoekt,
  filtert, sorteert, selecteert en handelt de gebruiker zelf.

De overgang is één rustige stap: op de meaning-first Relaties staat onderaan "Zelf zoeken, filteren en
werken". In de werkmodus staat bovenaan "Terug naar wat Maculis toont". Meaning-first betekent hier dus
nadrukkelijk niet user-agency-last.

### 21.3 Relaties in twee modi, één product

- **Modus A, Maculis kiest.** "Van je 5.000 relaties bewegen er nu 7", gegroepeerd op reden. Even
  rustig bij 50 als bij 50.000. De kalme default.
- **Modus B, zelf werken.** Een echte high-density werkruimte over de volledige 5.000: een compacte
  zoekbalk, meerdere combineerbare filters (organisatie, First Five, laatste contact, eigenaar, open
  actie, reveal geweest), filters wissen, sorteren (recente beweging, laatste contact, naam), een
  live resultaatteller ("377 van 5.000"), meervoudige selectie met select-all, en geloofwaardige
  bulkacties (follow-up plannen, opslaan als segment, exporteren) die als prototype duidelijk niets
  echt versturen. Een tabel is hier niet verboden omdat het op SaaS lijkt; een tabel is juist het
  goede gereedschap voor deze taak. Het onderscheidende zit in de rust van modus A en de intelligentie
  eromheen, niet in het vermijden van bewezen patronen.

De filterset is bewust gecureerd, niet de volledige CRM-waslijst. Dimensies die betekenis dragen voor
Maculis (journey/First Five, laatste contact, open actie, eigenaar, recente beweging, reveal) zijn
opgenomen; puur administratieve velden zijn weggelaten om ruis te voorkomen.

### 21.4 De derde first-day test (tien taken, geen uitleg)

Doorlopen als nieuwe collega, nul uitleg, prototype-lade dicht.

| Taak | Waar ik klikte | Aarzeling | Nav-wissels | Uitleg nodig? |
|---|---|---|---|---|
| 1. Wat vraagt aandacht? | Vandaag (staat bovenaan, actief) | geen | 0 | nee |
| 2. Waarom? | "Waarom zie ik dit?" op het item | geen | 0 | nee |
| 3. Beantwoord Jean-Baptiste | item → "Open het gesprek" → composer | geen | 1 | nee |
| 4. Eén specifieke rustige relatie | Relaties → zelf zoeken → naam typen | kort: eerst gezocht naar zoekveld in modus A | 1 tot 2 | nee |
| 5. Alle relaties van organisatie X | Relaties → zelf werken → filter Organisatie | geen | 1 | nee |
| 6. Twee of drie voorwaarden combineren | filters stapelen (org + First Five + laatste contact) | geen | 0 | nee |
| 7. Twintig selecteren + bulk | select-all + "Follow-up plannen" | kort: select-all koos zichtbare, niet alle 377 | 0 | licht (zie risico) |
| 8. Wat Maculis eerder bij een relatie zag | relatie openen → "Wat Maculis zag" | geen | 1 | nee |
| 9. Waar zit iemand in zijn journey | relatie openen → Journey-paneel | geen | 1 | nee |
| 10. Organisatiebreed patroon | Vandaag (drukke dag) → patroon → Groei | geen, mits het patroon bestaat | 1 | nee |

Conclusie: negen van de tien taken lukken zonder uitleg en met hooguit één of twee navigatiewissels.
De twee lichte aarzelingen (zoeken in modus A, en select-all-zichtbaar versus alle resultaten) zijn
interactiedetails, geen IA-problemen, en zijn in het prototype al deels ondervangen (de hand-off naar
modus B, en "Selecteer alle N resultaten"). Geen enkele taak vroeg om uitlegtekst.

### 21.5 De vier-intent stresstest

| Intentie | Draagt de kerninterface het? | Hoe |
|---|---|---|
| Dagelijks relationeel werk | Ja, ruim | Leeft vrijwel volledig op Vandaag en in Gesprekken. Ziet modus B zelden. |
| Gericht zoeken | Ja | Zoeken in Relaties (beide modi) en straks eventueel een command-palette. |
| Onderzoeken/segmenteren | Ja | Modus B: filters combineren, sorteren, opslaan als segment. |
| Operationeel werk | Grotendeels | Modus B: selectie + bulkacties. Grote journey-operaties zijn de grens, zie 21.6. |

Dezelfde kerninterface draagt de vier intenties zonder voor iedereen permanent alle complexiteit te
tonen. De zwaardere modi (onderzoeken, operationeel) zitten achter een bewuste stap (progressive
disclosure), niet achter verstopte features.

### 21.6 Tegengas en resterende risico's

- **Drie permanente bestemmingen kunnen te weinig zijn** als zoeken niet uitstekend is. De hele
  belofte leunt op goede selectie en goed zoeken. Behandel zoekkwaliteit als eerste-klas eis.
- **Vandaag krijgt veel macht.** Als Maculis' selectie ooit fout of incompleet is, mist de gebruiker
  het, want er is minder handmatig vangnet. Mitigatie: elk item blijft uitlegbaar ("waarom"), en de
  volledige werkruimte is altijd één stap weg. Maar dit blijft de kern van het risico van meaning-first.
- **Vertrouwen.** De gebruiker moet Maculis kunnen laten kiezen zonder controle te verliezen. Het
  expliciete onderscheid "Maculis kijkt voor je" versus "Jij hebt het stuur", plus provenance overal,
  is het antwoord. Verdwijnt dat onderscheid, dan slaat rust om in machteloosheid.
- **Meaning-first kan informatie verbergen.** Een relatie die nooit "beweegt" bestaat op Vandaag niet.
  Daarom moet modus B altijd de volledige dataset kunnen tonen, ongefilterd. Dat is nu zo.
- **Conditionele Groei blijft een voorspelbaarheidsrisico.** Een nav-item dat komt en gaat kan
  onrustig zijn. Mitigatie: alleen bij een echt patroon, en een duurzame vindplaats voor eerdere
  patronen (voorstel: onder Beheer, plus in de betrokken relaties). Nog te bewijzen bij echt gebruik.
- **Journeys operationeel.** Dit is de sterkste tegengas. Zodra "meerdere relaties tegelijk naar een
  volgende stap brengen", groepen samenstellen, capaciteit plannen en uitzonderingen behandelen
  frequent, dagelijks werk zijn, is het dogmatisch om ze onder Beheer te verstoppen. **Wanneer verdient
  Journeys opnieuw een zelfstandige operationele werkplek?** Antwoord: wanneer journey-operaties
  regelmatig over veel relaties tegelijk gaan en een eigen overzicht (pipeline, funnel, capaciteit)
  vereisen dat niet natuurlijk in Relaties of een relatie past. Tot dan is de journey context in de
  relatie, plus bulkwerk via modus B en Testerbeheer onder Beheer, voldoende. Dit is een meetbare
  drempel, geen principekwestie: laat echt gebruik hem bepalen.
- **Gesprekken en Relaties kunnen te veel gaan dragen.** Als beide blijven groeien, ontstaat het risico
  dat ze zelf mini-producten worden. Bewaak dat met dezelfde discipline: modus/progressive disclosure,
  niet nog een permanente bestemming.
- **Waar rust omslaat in gebrek aan controle** is precies de grens die deze ronde adresseert. Het
  antwoord is niet minder meaning-first, maar het altijd-bereikbare stuur (modus B) en het zichtbare
  onderscheid tussen de twee houdingen.

### 21.7 Drie intelligentielagen gescheiden gehouden

Reveal (haalt de hoge kwaliteitsdrempel, betekenisvol, met provenance), duiding/context (nuttig om te
begrijpen, geen reveal, bijvoorbeeld de "Wat Maculis zag"-regels en de aperture-observatie), en
technische signalen (concreet operationeel, bijvoorbeeld "levering mislukt") zijn in de copy en
plaatsing uit elkaar gehouden. Niet elk technisch probleem is een reveal; niet elke nuttige observatie
verdient Vandaag. Stilte blijft een geldige uitkomst.

### 21.8 Wat bewust niet is gebouwd

- Geen rollen- en rechtenmodel (wel rolbewust getest: de kerninterface draagt de intenties).
- Geen echte Journeys-operatieplek (pipeline/funnel/capaciteit), alleen de vraag beantwoord wanneer die
  nodig wordt.
- Geen duurzame Groei-historievindplaats geïmplementeerd (alleen conceptueel belegd).
- Geen echte zoekmachine of command-palette (zoeken werkt binnen Relaties; product-brede zoek is een
  latere stap).
- Geen productie-UI vervangen, geen migratie, geen backend, geen Lens 2, geen uitbreiding van Reveal
  Engine of Gate. Bulkacties zijn prototype-no-ops die niets versturen of wijzigen.

### 21.9 In het prototype te zien

- Product zonder prototype-navigatie: `/cockpit.html?dir=C&scn=vandaag&day=normal`
- Relaties, Maculis kiest: `?scn=relaties`
- Relaties, zelf werken (high-density): `?scn=relaties&relmode=work`
- De prototype-lade (voor ons): `?proto=1`, of het knopje rechtsonder

### 21.10 Aanbeveling: klaar voor visuele verfijning?

**Ja.** De informatiearchitectuur en de interactiemodellen staan nu stevig: één navigatiemodel, een
helder onderscheid tussen Maculis-voor-jou en jij-aan-het-stuur, een meaning-first ingang die niet in
user-agency-last vervalt, en een geloofwaardige werkruimte bij 5.000 relaties. De open punten (globale
zoek, Journeys-operatieplek, Groei-historie) zijn afgebakende, meetbare vervolgvragen, geen fundamentele
gaten. Ze hoeven visuele verfijning niet te blokkeren, mits we ze als bekende drempels meenemen.

Advies: ga naar visuele verfijning van richting C, met deze IA als vaste basis, en houd de drie open
punten op de agenda voor het moment dat echt gebruik ze afdwingt.

---

## 22. Testerbeheer terug op zijn plek, en het relatiedossier (dossier-ronde)

Deze ronde lost twee gaten op: waar het bestaande Testerbeheer landt, en het ontbrekende niveau
tussen de relatietabel en het gesprek: het relatiedossier. Eerst is de echte code geïnventariseerd,
daarna gebouwd. Prototype only, geen productie, geen migratie, bestaande functionaliteit ongewijzigd.

### 22.1 Testerbeheer: hergebruikt, niet opnieuw bedacht

Op basis van een inventarisatie van de echte implementatie (`server/store.mjs`, `server/index.mjs`,
`public/app.js`, `server/import.mjs`, `server/maculis-sessions.mjs`) landt Testerbeheer nu onder
**Beheer › Testerbeheer**, getrouw aan wat er is:

- **Lifecycle** DRAFT, SENT, OPENED, COMPLETED, plus DECLINED en ERROR (in de UI: Concept,
  Uitgenodigd, Gestart, Afgerond, Afgewezen, Fout). Systeemgestuurd; OPENED en COMPLETED komen alleen
  uit echte Maculis-sessie-events.
- **Consent fail-closed**: `mayContact` = alleen OPTED_IN. In de tabel zijn WhatsApp en e-mail
  uitgeschakeld bij Onbekend of Geen toestemming (Federico, Lieselotte, Milan).
- **Hoe Maculis aan/uit gaat voor een tester** (letterlijk zo in de code): toestemming vastleggen,
  de uitnodiging met de persoonlijke link versturen (e-mail of de tweestaps WhatsApp-flow), de tester
  opent de link (gestart) en rondt First Five af. De persoonlijke link/token is de toegang.
  "Publiceer naar Maculis" is een personalisatie van de begroeting, geen toegangsschakelaar, en vuurt
  automatisch mee op elke uitnodiging.
- **Kolommen** Naam, Bedrijf, Contact, Persoonlijke link, Status, Toestemming, Acties. Bulk:
  Publiceer naar Maculis, Via e-mail uitnodigen, Via WhatsApp uitnodigen. Toolbar: Sjabloon,
  Importeren, Tester toevoegen. Footer met per-status telling.
- **Pass the Lens** kandidaten staan er als Concept met consent Onbekend en het label "Pass the Lens
  · via <verwijzer>".
- **Evaluaties en inzichten** als sub-tab: read-only uit Maculis (Option B), Maculis blijft de bron.

In het prototype zijn de acties inert; de echte Testerbeheer in productie blijft ongewijzigd. Dit is
een getrouwe weergave zodat je de bestaande beheerlogica herkent, geen nieuw beheerproduct.

### 22.2 Het relatiedossier: meaning-first, detail-on-demand

Nieuwe laag in de hiërarchie: Relaties › overzicht (Maculis kiest) of zelf werken › **relatiedossier**
› gesprek. Het dossier opent niet met veertig CRM-velden. Het opent met **Wat speelt er nu**: de
handeling of observatie die er op dit moment toe doet, met een directe actie ("Open het gesprek",
of een donkere reveal-aperture met "Bekijk de reveal"). Pas daaronder staan uitklapbare
detailsecties, dichtgeklapt tenzij je ze nodig hebt.

Dezelfde filosofie als elders: **Maculis heeft iets voor jou** (de Nu-hero) versus **jij wilt iets van
Maculis** (de detailsecties die je zelf opent). Meaning-first, detail-on-demand, zonder informatie of
controle weg te nemen.

### 22.3 Eerlijk over data: A, B, C

Elke dossiersectie draagt een zichtbaar herkomstlabel, zodat niets wordt gemockt alsof het al bestaat.
Gebaseerd op een inventarisatie van de echte relatiedata (`server/comm/relationship.mjs`, de migraties
`001`–`005`, `memory.mjs`, `followups.mjs`, `consent.mjs`, `store.mjs`).

| Dossierelement | Klasse | Grond |
|---|---|---|
| Identiteit, organisatie, stage | **A** in Maculis | `contact`, `organization`, `relationship_stage` |
| Contact- en gesprekshistorie (e-mail) | **A** | `conversation` + `message` met delivery; alleen e-mail wordt echt ingelezen |
| Historie via WhatsApp, SMS, telefoon | **C** toekomstig | schema aanwezig, nog geen writer/adapter |
| First Five status (concept/uitgenodigd/gestart/afgerond) | **A** | `invitation.status` |
| Detail per sessie en stap | **C** | leeft deels in de JSON-store, niet in de relatieview |
| Wat Maculis zag (geheugen, bevestigd en AI-voorstel) | **A** | `relationship_memory`, met confirm/dismiss |
| Open acties en follow-ups (met verlopen) | **A** | `follow_up` |
| Toestemming per kanaal + provenance | **A** | `communication_preference` |
| Eén gedeelde consent-versie over beide systemen | **C** | versie leeft alleen in de JSON-store |
| Pass the Lens herkomst | **A** | activity + memory + `introductions[]` |
| Eigenaar/verantwoordelijke van de relatie | **C** | bestaat alleen per gesprek/taak, niet op relatieniveau |
| Reveals eerder getoond (wanneer en waarom) | **C** | **de enige echt ontbrekende pijler: nergens opgeslagen** |
| Vrije notities op relatieniveau | **C** | alleen gespreks-notities bestaan |
| "Wat speelt er nu" per relatie | **B** afgeleid | `deriveAttention()` bestaat, wordt nog niet in de relatieview aangeroepen |
| Tags op relatieniveau | **C** | alleen ongebruikte `conversation.tags` |

De belangrijkste eerlijke boodschap: een **duurzame reveal-historie bestaat nog niet**. In het dossier
staat die sectie er wel, maar expliciet gemarkeerd als toekomstig, met de tekst dat dit is hoe het
eruit zou zien, geen echte data. Zo blijft de belofte scheidbaar van de werkelijkheid.

### 22.4 Eén samenhangend navigatiemodel

De schermen zijn nu één geheel, binnen dezelfde linkernavigatie:

- **Vandaag → gesprek → relatie**: een aandachtsitem opent het gesprek; in het gesprek staat
  "Open relatie" naar het dossier.
- **Relatieoverzicht → dossier**: klik op een persoon (mover-kaart of tabelrij) opent diens dossier.
- **Dossier → gesprek**: elke dossier heeft "Open het gesprek".
- **Reveal → relatie**: een reveal op Vandaag opent de relatie waar hij bij hoort.

Broodkruimels ("Relaties › Jean-Baptiste", "Beheer › Testerbeheer") houden je georiënteerd, en de
linkerrail licht de juiste bestemming op (dossier onder Relaties, Testerbeheer onder Beheer). Geen
tweede navigatiesysteem.

### 22.5 First-day test: "wat speelt er bij klant X?"

De taak: "Ik wil weten wat er speelt bij klant X, wat we eerder hebben besproken, waar hij in zijn
journey staat en wat ik nu moet doen." Doorlopen zonder uitleg:

1. Relaties openen. Ofwel klant X beweegt (dan staat hij in de selectie), ofwel je zoekt hem via
   "Zelf zoeken" en typt zijn naam.
2. Klik op de naam. Het dossier opent met **Wat speelt er nu** bovenaan: precies "wat er speelt" en
   "wat ik nu moet doen", met een knop.
3. "Wat Maculis zag" en "Gesprekshistorie" openklappen: "wat we eerder hebben besproken".
4. "First Five en journey": "waar hij in zijn journey staat".
5. "Open het gesprek" om te handelen.

Alle vijf deelvragen zijn zonder uitleg beantwoordbaar, binnen één scherm plus een gesprek. Het
meaning-first-hero beantwoordt de twee belangrijkste vragen (wat speelt er, wat nu) meteen; de rest is
detail-on-demand.

### 22.6 Hergebruikt / aangepast / bewust niet gebouwd

- **Hergebruikt (als bron, getrouw weergegeven):** de volledige Testerbeheer-logica (lifecycle,
  consent, invite-flows, Pass the Lens, evaluaties) en het relatie-aggregatiemodel (identiteit,
  historie, geheugen, follow-ups, consent, provenance).
- **Aangepast (alleen prototype-presentatie):** Testerbeheer meaning-bewust onder Beheer geplaatst;
  de relatie krijgt een dossier met een Nu-hero en uitklapbare secties; navigatie tussen Vandaag,
  relatie, gesprek en overzicht sluitend gemaakt; de weergavebreedte van de brede views gecorrigeerd.
- **Bewust niet gebouwd (C, geen fake):** duurzame reveal-historie, relatie-eigenaar op relatieniveau,
  non-e-mail kanaalhistorie, per-sessie journeydetail, relatie-notities, unified consent-versie, tags.
  Deze vragen backendwerk en zijn in het dossier zichtbaar als toekomstig gemarkeerd. Ook geen echte
  Testerbeheer-acties (inert), geen productie, geen migratie, geen Lens 2, geen uitbreiding van Reveal
  Engine of Gate.

### 22.7 In het prototype te zien

- Beheer: `/cockpit.html?dir=C&scn=beheer` → Testerbeheer: `?scn=testerbeheer` (sub-tab Evaluaties via
  de prototype-lade of de tab zelf)
- Relatiedossier: open een persoon vanuit Relaties, of via de prototype-lade
  ("Relatiedossier · Jean-Baptiste", "Relatiedossier · Saar (reveal)")
- De loop: Vandaag → item → gesprek → "Open relatie" → dossier → "Open het gesprek"

### 22.8 Aanbeveling

Met Testerbeheer op zijn plek, een volwaardig relatiedossier en een sluitend navigatiemodel werken
Vandaag, Relaties, dossier, gesprek en Beheer nu als één coherent geheel. De open punten zijn eerlijk
afgebakend als C (met de reveal-historie als enige echt ontbrekende pijler). De IA is hiermee stabiel
genoeg om breed naar visuele verfijning te gaan, met de C-punten als bekende, meetbare vervolgstappen
die backendwerk vragen wanneer echt gebruik ze afdwingt.

## 23. Integrale IA-review vóór visuele verfijning (freeze-ronde)

Doel van deze ronde: het hele skelet toetsen vanuit de gebruiker, niet vanuit de schermen die we
toevallig gebouwd hebben, en één ondubbelzinnige conclusie geven: bevriezen, of maximaal drie
fundamentele problemen eerst oplossen. Geen productie, geen backend, geen nieuwe capabilities.

### 23.1 De architectuur zoals getoetst

Permanente navigatie (linkerrail), in deze volgorde:

- **Vandaag** → Maculis kijkt voor je. Wat verdient nu aandacht.
- **Relaties** → twee modi in één product: Maculis selecteert wat beweegt, of jij neemt het stuur
  (zoeken, filteren, segmenteren, selecteren, bulk). Relatie → dossier → gesprek/actie.
- **Gesprekken** → operationele communicatie, kanaal-agnostisch, altijd gekoppeld aan een relatie.
- **Groei** → conditioneel: verschijnt alleen wanneer Maculis een patroon over meerdere relaties ziet.
- **Beheer** (rustige voet in de rail) → minder frequent operationeel werk: Testerbeheer,
  Berichtsjablonen, Imports, Instellingen.

Testerbeheer blijft bewust onder Beheer, niet als permanent raileditem. Dit onderscheid tussen
dagelijks werk (Vandaag, Relaties, Gesprekken) en operationeel beheer (Beheer) is bevestigd als goed.

### 23.2 Stresstest: vijftien gebruikersintenties

Per intent: startpunt, aantal stappen, voorspelbaarheid, en of je het systeemmodel moet kennen.

| # | Intent | Startpunt → bestemming | Stappen | Oordeel |
|---|--------|------------------------|---------|---------|
| 1 | Waar moet ik 's ochtends naar kijken? | Vandaag (landing) | 0 | Sterk. Maculis kijkt voor je, meteen zichtbaar. |
| 2 | Wat speelt er bij klant X? | Relaties → zoek → dossier → "Wat speelt er nu" | 2 tot 3 | Sterk na fix: zoeken staat nu direct in Relaties. |
| 3 | Laatste gesprek met klant X terugvinden | Relaties → dossier → "Open het gesprek" | 3 | Goed. Relatie is de duurzame ingang. |
| 4 | Zelf door 5.000 relaties zoeken | Relaties → zoekveld of "Zelf werken" → tabel | 1 tot 2 | Sterk na fix. |
| 5 | Alle relaties die aan voorwaarden voldoen | Relaties → werkruimte → filters | 2 | Sterk. Echte filterbalk (org, First Five, laatste contact, eigenaar, open actie, reveal). |
| 6 | Meerdere selecteren en er iets mee doen | Relaties → werkruimte → selectie → bulk | 2 | Sterk. Follow-up, segment, export. |
| 7 | Waarom ziet Maculis een verandering? | Vandaag → reveal → "Waarom zie ik dit?" + lagen | 1 tot 2 | Sterk. Feit → observatie → gevolgtrekking → suggestie, met evidence en zekerheid. |
| 8 | Nieuw bericht van een relatie, waar landt dat? | Vandaag (Nu) en Gesprekken (Nu) | 0 tot 1 | Sterk. |
| 9 | Wat onthield/zag Maculis eerder? | Dossier → "Wat Maculis zag" + "Reveals eerder getoond" | 2 | Sterk, en eerlijk over de reveal-historie-gap. |
| 10 | Waar staat iemand in First Five/journey? | Dossier → "First Five en journey" | 2 | Sterk op relatieniveau. |
| 11 | Een tester toevoegen | Beheer → Testerbeheer → "Tester toevoegen" | 2 | Goed. Bewuste keuze: buiten de dagelijkse aandacht. |
| 12 | Wie gaf toestemming, wie rondde First Five af? | Beheer → Testerbeheer → kolommen + Evaluaties | 2 | Sterk. |
| 13 | Uitnodiging of template beheren | Beheer → Berichtsjablonen | 2 | Bestemming aanwezig (placeholder in prototype). |
| 14 | Operationele instelling wijzigen | Beheer → Instellingen | 2 | Bestemming aanwezig (placeholder). |
| 15 | Ik ken de persoon, niet waar iets zit | Relaties → zoekveld → dossier | 2 | Sterk na fix. Vóór de fix was dit de scherpste wrijving. |

Uitkomst: veertien van de vijftien intents waren al sterk. Intent 15 (en daarmee de ingang van 2, 3, 4)
legde één echte fundamentele wrijving bloot, hieronder.

### 23.3 Het fundamentele probleem dat de review vond (en dat nu is opgelost)

**Vindbaarheid van zoeken/zelf-sturen was verstopt achter de modus-ontdekking van Relaties.**

Relaties opende in de kalme modus "Maculis kijkt voor je": bewegende relaties, en geen zoekveld. De
volledige lijst én zoeken zaten achter de knop "Zelf zoeken, filteren en werken" onderaan. Voor de
meest voorkomende professionele ingang ("ik zoek klant X") zag een nieuwe collega dus geen zoekveld;
je wist alleen dat je die knop moest indrukken omdat wíj wisten dat hij er stond. Dat faalt precies op
de eigen norm: iets telt niet als geslaagd als het alleen logisch is doordat wij het prototype kennen.
Dit is progressive disclosure één stap te ver, toegepast op een vindbaarheidsprimitief.

**Fix (klein, IA-gemotiveerd, uitgevoerd):** het zoekveld staat nu permanent in Relaties, direct onder
de betekenislijn "Van je 5.000 relaties bewegen er nu 7", in beide modi zichtbaar. Typen en verzenden
brengt je meteen in de werkruimte, gefilterd. De kalme modus leidt nog steeds met wat beweegt
(meaning first blijft intact); zoeken is nooit meer verstopt. De hand-off "Zelf werken" blijft bestaan
voor wie het hele bestand wil doorbladeren.

Dit beantwoordt meteen de zoekvraag hieronder: een globale zoekbalk of command palette is nu **niet**
nodig.

### 23.4 Een latent leesbaarheidsdefect dat de review blootlegde (opgelost)

Tijdens het aanscherpen van de donkere attention-states bleek een echte bug: de kleur-tokens leven op
`.shell` (die draagt `data-direction` en `data-space`), maar alleen `body` (dat bóven `.shell` staat)
paste ze toe. Daardoor was de donkere achtergrond in feite het donkere canvas van de kijker, en erfden
koppen zonder eigen kleur (de begroeting op Vandaag, de reveal-kop) zwart op bijna-zwart. Dat was de
kern van "onvoldoende comfortabele leesbaarheid".

**Fix:** achtergrond en tekstkleur worden nu op `.shell` gezet, waar de tokens oplossen. De donkere
laag is echte CSS, niet langer afhankelijk van de systeemvoorkeur van de kijker. Daarnaast: lichtere
primaire en secundaire tekst, een donker vlak dat van puur zwart is afgetild zodat het minder zwaar
weegt, en goud/oranje uitsluitend als accent (nooit bodytekst). De semantische kleuren (ok, warn,
danger) bleven ongewijzigd omdat ze gedeeld worden met de lichte werkruimte, waar oplichten juist
contrast op wit zou kosten. Getoetst op het oog op normale laptopafstand, niet alleen op formele
contrastwaarden.

### 23.5 First-day test (nieuwe collega, geen uitleg, een paar minuten)

- Wat vraagt aandacht? → Vandaag, eerste item in de rail, landingsscherm. Ja.
- Waar staan alle relaties? → Relaties. Ja.
- Hoe vind ik een specifieke klant? → zoekveld staat nu direct in Relaties. Ja (was het zwakke punt).
- Kan ik op een relatie klikken? → ja, elke naam/kaart/rij opent het dossier.
- Waar zit het volledige dossier? → één klik op de relatie, opent meaning first.
- Waar staan gesprekken? → Gesprekken, en vanuit elk dossier via "Open het gesprek".
- Van gesprek naar relatie en terug? → "Open relatie" in het gesprek, "Open het gesprek" in het dossier.
- Waar zitten minder frequente beheertaken? → Beheer, rustig onderin de rail.
- Waar zit Testerbeheer? → Beheer → Testerbeheer.

Alle negen slagen nu zonder voorkennis van onze architectuur.

### 23.6 Tegengas, expliciet (het ontwerp niet beschermen, de eenvoud wel)

- **Relatiedossier te zwaar?** Nee, mits de secties grotendeels ingeklapt blijven. Er staat een korte
  Nu-hero plus acht inklapbare secties, standaard slechts twee open. Waakpunt: het aantal secties niet
  laten groeien; elke nieuwe sectie moet een echte gebruikersvraag beantwoorden.
- **Verdient Gesprekken een hoofdbestemming?** Ja, maar de identiteit moet scherper. Nu overlapt het
  deels met Vandaag (dezelfde communicatie-items). Voor een communicatielaag is een operationele,
  kanaal-agnostische gespreksplek een eigen taak (jouw hele werkstroom berichten), los van wat Maculis
  vóór je selecteert. Aanscherping hoort in content-refinement, niet in de IA: Gesprekken is de
  werkstroom, Vandaag is alleen wat aandacht verdient. Geen blokkade.
- **Raakt Beheer te diep verstopt?** Nee. Twee klikken, bewust rustig. De voet-plaatsing is gewild en
  blijft zichtbaar gelabeld. Waakpunt: de bestemmingen ín Beheer herkenbaar houden (nu vier duidelijke
  kaarten).
- **Verwarren de twee Relaties-modi?** Dat wás het risico, precies via de verstopte zoekfunctie. Met
  zoeken nu permanent zichtbaar is de scherpe kant weg. De modi zijn geen tweede navigatiemodel; het is
  één primitief (vind/werk met relaties) dat dieper doorschakelt.
- **Is globale zoek nodig?** Nee, niet nu. Trigger voor later: als gebruikers structureel vanuit
  Vandaag, Gesprekken of Beheer naar een willekeurige persoon willen springen zonder eerst naar
  Relaties te gaan. Tot dan is "Relaties, typ de naam" voorspelbaar en genoeg. Niet bouwen omdat
  moderne software het heeft.
- **Moet Journeys zelfstandig worden?** Nee. De huidige use cases tonen geen operationeel werkproces
  waarin groepen relaties door journey-stappen bewogen worden of capaciteit gepland wordt. Journey is
  context ván een relatie (First Five in het dossier) plus operationeel werk onder Beheer. Trigger voor
  later: zodra journey-stappen als zelfstandig, herhaald groepsproces beheerd moeten worden.
- **Botst meaning first met snelheid voor professionals?** Dat was exact de zoek-wrijving: de
  professional wilde snel het stuur, en meaning first had het verstopt. Opgelost door zoeken altijd
  zichtbaar te maken. Meaning first blijft de default, snelheid is nooit meer weggestopt.

### 23.7 Reveals, observatie en geheugen: drie dingen, niet één

De drie zijn conceptueel gescheiden, en het dossier kan dat dragen:

- **Wat Maculis onthoudt** (geheugen): bevestigde afspraken en AI-voorstellen. In Maculis (A).
- **Wat Maculis observeert**: patroonbreuken en signalen, zichtbaar in reveals en in de aperture. Deels
  afgeleid (B).
- **Wat Maculis als reveal daadwerkelijk heeft getoond**: de duurzame historie van welke reveal wanneer
  en waarom is getoond. Bestaat backendmatig **niet** (C), eerlijk zo gemarkeerd in "Reveals eerder
  getoond", nooit met neppe data.

Aanscherping voor content-refinement (geen blokkade): de sectiekop "Wat Maculis zag" bevat nu zowel
onthouden feiten als geobserveerde voorstellen. De labels mogen scherper het verschil tussen onthouden
en observeren benoemen. De structuur hoeft daarvoor niet te veranderen.

### 23.8 Groei: conditioneel, maar duurzaam vindbaar (opgelost)

Groei verschijnt alleen wanneer een echt patroon over meerdere relaties bestaat. Het risico dat de
gebruiker flagde: verdwijnt de conditionele ingang, dan mag eerder zichtbare betekenis niet zoekraken.
De copy beloofde die duurzaamheid al ("blijft terugvindbaar in de betrokken relaties"), maar de weg
terug was niet gelegd.

**Fix:** het patroon is nu een sectie "Onderdeel van een patroon" (afgeleid, B) in het dossier van de
betrokken relatie (Saar). Zo blijft het patroon vindbaar bij de relatie zelf, ook nadat het van Vandaag
verdwijnt en het conditionele Groei-item weg is. De belofte klopt nu letterlijk, zonder Groei permanent
te maken en zonder fictieve live-navigatie die zou doodlopen.

### 23.9 A/B/C-capabilities (eerlijkheid behouden)

- **A, bestaat in Maculis**: identiteit en e-mailhistorie, First Five status, geheugen (bevestigd en
  AI-voorstel), follow-ups, consent per kanaal, Testerbeheer-lifecycle, Pass the Lens-herkomst.
- **B, afgeleid uit bestaande data**: "wat speelt er nu", en het Groei-patroon per relatie.
- **C, toekomstig (nooit als bestaand voorgesteld)**: relatie-eigenaar, non-e-mail kanaalhistorie,
  journeydetail per sessie, relatie-notities, unified consent-versie, en de **duurzame reveal-historie**
  (de enige echt ontbrekende pijler). Alle C-elementen dragen zichtbaar het label "toekomstig".

### 23.10 Resterende risico's (bewust geen blokkades)

1. Gesprekken kan als attention-queue gaan overlappen met Vandaag. Scherp de rol aan in content: hier de
   werkstroom, daar alleen aandacht.
2. Het dossier kan sluipend zwaarder worden. Houd secties ingeklapt en bewaak het aantal.
3. De reveal-historie (C) blijft een echte capability-gap. Bouwen zodra echt gebruik dit afdwingt.
4. "Wat Maculis zag" mengt onthouden en observeren; label-aanscherping in content-refinement.

### 23.11 Wat NIET is gebouwd in deze ronde

Geen productie, geen migratie, geen backend. Geen Lens 2, geen Reveal Engine- of Gate-wijzigingen.
Geen globale zoekbalk of command palette. Geen zelfstandige Journeys-werkplek. Geen extra
navigatiebestemmingen "voor de zekerheid". Geen fictieve backenddata. Testerbeheer niet opnieuw
gestructureerd. Prototype controls blijven buiten het product (één navigatiemodel voor de gebruiker).

### 23.12 Conclusie en IA-baseline

De review vond geen structureel gat in het productmodel. De A/B/C-spine (Maculis kijkt voor mij →
Vandaag; ik heb het stuur → Relaties; ik beheer Maculis → Beheer) is gezond. Er was één fundamentele
wrijving (verstopte vindbaarheid van zoeken) en één latent leesbaarheidsdefect (donkere koppen zwart
door tokens op de verkeerde node). Beide zijn in deze ronde klein en gericht opgelost, getest en visueel
geverifieerd. De volledige testsuite blijft groen (55 pass, 9 skip zonder DB, 0 fail).

**Aanbeveling: de IA is stabiel. Bevriezen en breed naar visuele/content-verfijning gaan.** De
C-capabilities (met de reveal-historie voorop) zijn bekende, meetbare vervolgstappen die pas backendwerk
vragen wanneer echt gebruik ze afdwingt.

Vastgelegde baseline:

- **Vandaag** → Maculis kijkt voor je.
- **Relaties** → Maculis selecteert wat beweegt, of jij opent de volledige werkruimte (zoeken altijd
  zichtbaar) → relatie → dossier → gesprek/actie.
- **Gesprekken** → operationele communicatie, altijd gekoppeld aan een relatie.
- **Beheer** → minder frequent operationeel beheer: Testerbeheer, templates, imports, instellingen.

Vastgelegde principes:

- één productnavigatie;
- meaning first, maar progressive disclosure nooit ten koste van vindbaarheid;
- detail on demand;
- Maculis kijkt voor je ↔ jij hebt het stuur;
- relatie is de duurzame contextdrager;
- gesprek is activiteit binnen een relatie;
- journey is context tenzij operationeel gebruik zelfstandigheid rechtvaardigt;
- beheer blijft uit de dagelijkse aandacht;
- prototype controls bestaan buiten het product;
- toekomstige capabilities worden niet als bestaande data voorgesteld;
- aandacht trekken mag nooit ten koste gaan van comfortabel lezen.

### 23.13 In het prototype te zien

- Zoeken in Relaties: `/cockpit.html?dir=C&scn=relaties` (zoekveld staat direct onder de betekenislijn).
- Donkere leesbaarheid: `?scn=vandaag&day=busy`, `?scn=reveal&rev=r-kim&expand=1`, `?scn=work` (aperture).
- Groei duurzaam vindbaar: open Saar vanuit Relaties → dossiersectie "Onderdeel van een patroon".

## 24. Pre-freeze productarchitectuur-review (DEFINITIEVE BASELINE)

Dit is de definitieve pre-freeze review. Doel: de eenvoudige menselijke bovenlaag toetsen tegen de
vraag of ze overeind blijft wanneer Maculis veel intelligenter wordt, duizenden relaties volgt,
meerdere medewerkers bedient en meerdere kanalen gebruikt. Bron van waarheid voor wat werkelijk bestaat:
de echte implementatie (`server/comm/*.mjs`, migraties 001 tot 005), niet de prototype-fixtures.

Belangrijkste bevinding van deze ronde: **de backend is aanzienlijk rijker dan de prototype-fixtures
suggereerden.** Verschillende zaken die het dossier als "toekomstig" markeerde, bestaan in werkelijkheid
al in het datamodel. De A/B/C-classificatie hieronder is daarop gecorrigeerd, en het prototype is
bijgewerkt zodat het bestaande capabilities niet langer als toekomstig voorstelt.

### 24.1 De fundamentele productbelofte (frozen)

Maculis mag steeds meer zien, begrijpen en onthouden, zodat de mens steeds beter alleen ziet wat ertoe
doet. De cockpit is de menselijke bovenlaag tussen wat Maculis waarneemt en waar een mens aandacht aan
moet geven of mee wil werken. De intelligence eronder mag sterk groeien zonder dat de interface
evenredig drukker wordt. Geen dashboard van alle data, geen activiteitenfeed.

### 24.2 Vandaag = aandachtsfilter met twee legitieme bronnen (frozen)

Vandaag toont niet wat er gebeurde, maar waar een mens er nú iets aan heeft om te zien, beoordelen,
beslissen of doen. First Five-completions, scans, reveals, observaties en communicatie-events komen niet
automatisch op Vandaag. Schaaltest: 137 sessies, 42 reveals, honderden veranderingen en tientallen
berichten in één nacht, en als slechts vier zaken menselijke aandacht verdienen toont Vandaag vier. Niets
te melden mag leeg zijn.

Twee bronnen passeren dezelfde strenge drempel:

- **Reactieve aandacht**: iets vraagt aantoonbaar om je, bijvoorbeeld een onbeantwoord bericht, een
  verlopen follow-up, een beslissing. In de code: `getRelationship().summary.nextAction` (unread /
  follow_up / waiting / ai). Bestaat (A/B).
- **Ontdekte aandacht**: Maculis combineert meerdere signalen, herinneringen en veranderingen over tijd
  en bronnen en ontdekt een betekenisvol verband dat op zichzelf door geen enkel event werd gevraagd. In
  het prototype: de reveals (Kim: reactietijd plus toon plus timing; Saar: stilte plus heropende mail
  plus onbeantwoorde vraag) en het Groei-patroon (drie relaties, zelfde verloop). Menselijke taal: "Dit
  valt me op", met provenance (wat, waarom, waarop gebaseerd, welke context verder).

De lat is hoog: onzekerheid blijft eerlijk (hypothese als hypothese, nooit afgeleid verband als feit),
en de stille meerderheid blijft gebundeld en rustig. De architectuur biedt hier ruimte voor zonder een
feed van AI-observaties te worden. Dit is een principe, geen opdracht om nu een correlation engine te
bouwen.

### 24.3 Signal → Movement → Attention → Action (frozen)

SIGNAL (Maculis neemt waar) → MOVEMENT (iets veranderde betekenisvol) → ATTENTION (verdient nu menselijke
aandacht) → ACTION (er is iets te doen). Niet ieder signal wordt movement, niet iedere movement wordt
attention, niet iedere attention wordt action, en niet iedere action is communicatie. Cruciaal en
bevestigd door de code: **attention is afgeleid, nooit dubbel opgeslagen** (migratie 005:
"ATTENTION IS DERIVED, NEVER STORED TWICE ... computed at read time"). Aandacht is geen notificatiepile en
geen takenlijst. Aandacht is bovendien niet hetzelfde als taak.

### 24.4 "Voor mij" en meerdere medewerkers (frozen principe; A in het model)

De werkruimte is voor Maculis-medewerkers, niet voor klanten. Meerdere medewerkers moeten later dezelfde
IA kunnen delen zonder dat iedereen dezelfde Vandaag krijgt. Het model draagt dit al: `app_user`, `team`,
`team_member`, `conversation.owner_user_id`, `conversation.team_id`, `assigned_to`, en een `notification`
tabel met types (new_inbound, mention, assigned, reply_overdue). Vandaag is daarom principieel persoons-
of verantwoordelijkheidsrelatief (mijn/mijn team/aan mij toegewezen), niet één globale lijst. Geen
rollen- of permissiesysteem in deze ronde; wel als baseline vastgelegd dat Vandaag scopebaar is op
eigenaar/toewijzing.

### 24.5 Prioriteit en overbelasting (frozen principe; thresholds niet frozen)

Ook terechte aandacht kan te veel worden. Bij dertig echte aandachtspunten is het antwoord niet dertig
grote kaarten. De IA draagt schaal via tiers (Nu, Beweging, Klaar, Rust), bundeling (de stille
meerderheid als één regel), urgentieonderscheid en het "één ding" versus "druk" onderscheid. Concrete
ranking, thresholds en bundelregels zijn expliciet niet frozen (verfijnen op echt gebruik).

### 24.6 Aandacht heeft een levenscyclus (frozen principe)

Aandacht verschijnt en kan betekenisvol verdwijnen: gezien, afgehandeld ("terugval in rust", nooit
zomaar weg), klant is aan zet. Rijkere toestanden (later, gedelegeerd/toegewezen, bewust geen actie,
automatisch niet meer relevant) worden gedragen door de aanwezige bouwstenen (owner/assignment,
attention-read-state 005) en zijn nu niet volledig gedemonstreerd. Onderscheid aandacht versus taak
blijft: niet ieder aandachtspunt wordt een taak, niet iedere taak komt uit intelligence.

### 24.7 Hoofdarchitectuur (frozen)

Vandaag (wat vraagt mij nu) · Relaties (wat beweegt in mijn netwerk plus toegang tot alle relaties) ·
Gesprekken (waar communicatie operationeel plaatsvindt) · Relatiedossier (wat Maculis weet, onthoudt en
zag rond deze relatie) · Beheer (hoe we Maculis en infrastructuur beheren). Geen nieuwe
hoofdnavigatiebestemmingen zonder aantoonbare gebruikersnoodzaak.

### 24.8 Relaties: Maculis kijkt ↔ jij hebt het stuur (frozen)

Kalme default toont een kleine betekenisvolle selectie (wat beweegt). Zoeken staat permanent zichtbaar
(vorige ronde), en de volledige werkruimte (zoeken, filteren, sorteren, selecteren, segmenteren, bulk,
individuele relatie openen) is één stap weg. `listRelationships` (zoek over naam/e-mail/mobiel/
organisatie/domein) bestaat (A). Meaning-first blokkeert professionele agency niet.

### 24.9 Relatiedossier (frozen)

Duurzaam detailniveau, meaning first: eerst "Wat speelt er nu", daarna detail-on-demand. Betekenis →
context → historie → handelen → administratie, niet databasevelden → categorieën → scherm. Geen eindeloze
CRM-accordeon; secties standaard grotendeels ingeklapt.

### 24.10 Persoon, organisatie en relatie (GEEN structureel blocker; A in het model)

Getoetst en opgelost. Het model draagt B2B al: `organization` (naam, domein, stage), `contact`
(organization_id, rol, stage), en `orgContacts` (alle contactpersonen binnen een organisatie); follow-ups
en conversaties kennen zowel `contact_id` als `organization_id`. Een relatie is dus een persoon **of** een
organisatie, en het dossierpatroon geldt voor beide. Het prototype gelijkstelde "relatie" impliciet aan
één persoon; dat is deze ronde gecorrigeerd met een dossiersectie "Organisatie en andere contacten" (A).
Geen nieuw datamodel gebouwd; de capability bestaat al.

### 24.11 Communicatie is een contextuele capability (frozen)

Communicatie is geen apart eiland. Vanuit context leidt één actie "Neem contact op" naar alleen de
relevante en toegestane kanalen, nooit losse kanaalknoppen. Bestaat in het model: `channel_identity` per
kanaal, `communication_preference` (per kanaal én doel: transactional/research/commercial/privacy, met
legal_basis en withdrawn_at), `consent` per kanaal, `call_record`, `ai_draft`. Deze ronde
gedemonstreerd in het dossier: E-mail (opent het gesprek), Bellen (telefonie bestaat, A), WhatsApp
(vereist opt-in, verzendadapter volgt, C). De verzendadapters voor WhatsApp/SMS/social zijn de C-laag;
de identiteiten, consent en conversatiestructuur eronder bestaan.

### 24.12 Cross-channel continuïteit (frozen principe; e-mail A, overige adapters C)

Denk kanaalonafhankelijk vanuit de relatie. `channel_identity` (meerdere kanalen), conversaties met een
`channel`, en de `activity`-timeline (unified, message plus non-message events) dragen één relationele
historie. De medewerker reconstrueert de relatie niet per kanaal opnieuw. E-mail is volledig aanwezig (A);
de overige kanaaladapters zijn C.

### 24.13 AI-uitleg en menselijke controle (frozen)

Waarom-zie-ik-dit, gelaagd (Feit → Observatie → Gevolgtrekking → Suggestie) met evidence en, waar zinvol,
een zekerheidsindicatie in menselijke taal ("samenval in tijd, geen bewezen oorzaak"). Menselijke
provenance, niet overal technische modeldetails. Niets wordt automatisch verzonden; de mens houdt het
laatste woord en een menselijke wijziging blijft behouden.

### 24.14 Geheugen, observatie, interpretatie en reveal zijn niet hetzelfde (frozen)

Vier gescheiden begrippen die nooit één generieke "AI insights"-bak mogen worden: wat Maculis onthoudt
(`relationship_memory`, A), wat het observeert, wat het interpreteert (de reveal-lagen), en wat
daadwerkelijk als reveal is getoond. Aanscherping voor content-refinement: de dossierlabels mogen
onthouden en observeren scherper scheiden. Structuur hoeft niet te wijzigen.

### 24.15 A/B/C-capabilities, definitief (gecorrigeerd tegen de echte code)

**A — bestaat werkelijk** (schema plus aggregatie in `relationship.mjs`):
persoon en organisatie plus meerdere contacten per organisatie; kanaalidentiteiten per kanaal;
omnichannel conversaties; unified activity-timeline (incl. merges/assignments); relationship_memory;
follow-ups (contact- en organisatieniveau); consent per kanaal en `communication_preference` per doel;
ai_draft; interne notities per gesprek; app_user/team/team_member/owner/assignment; notification (getypt);
call_record; audit_event/delivery_event; afgeleide attention-read-state; zoeken (`listRelationships`).

**B — betrouwbaar afleidbaar**: "wat speelt er nu" (nextAction), attention zelf (derived), het
Groei-patroon per relatie, en ontdekte-aandacht-synthese uit activity plus memory plus conversaties.

**C — vereist nieuwe backend/persistence**, met prioritering:

- *Nodig vóór echte pilot/productie*: de verzendadapters voor niet-e-mailkanalen (WhatsApp/SMS), voor
  zover de pilot die kanalen echt gebruikt.
- *Later waarschijnlijk waardevol*: duurzame reveal-/ontdekte-inzicht-historie (welke reveal wanneer,
  waarom en aan wie getoond, en welke actie volgde). Dit is de enige echt ontbrekende inhoudelijke
  pijler en het sluitstuk van auditability (§24.20). Ook: relatie-niveau notities en tags,
  per-sessie journeydetail, één geünificeerde consent-versie over invitation- en comm-systeem.
- *Mogelijk niet nodig, eerst gebruik afwachten*: een aparte globale zoekingang, een zelfstandige
  Journeys-werkplek, expliciete merge/dedup-UX (de `activity`-merge bestaat, de bediening niet).

Een future-prototype-element is geen engineeringbestelling.

### 24.16 Fouten, onzekerheid en lege states (frozen principe)

Gedemonstreerd: lege Vandaag ("Je bent bij"), lege Groei ("Nog geen patroon"), onzekerheid (zekerheid
plus "geen bewezen oorzaak"), mislukte levering (bounce bij Tom), ontbrekende toestemming (kanaalknoppen
uitgeschakeld), weinig historie ("nog niets vastgelegd"). De filosofie houdt overal stand: niet bluffen,
niet overclaimen, geen fictieve zekerheid. Mogelijk dubbele records: de `activity`-merge bestaat (A), de
merge-bediening is C.

### 24.17 Notificaties buiten de werkruimte (frozen principe)

Vandaag is het interne aandachtsfilter. Een attention-item rechtvaardigt niet automatisch een push, mail
of WhatsApp naar de medewerker; externe onderbreking vereist een hogere drempel dan zichtbaarheid op
Vandaag. Het model heeft er een thuis voor (`notification`, getypt), maar toekomstige workstreams sturen
niet ieder hun eigen notificaties. Geen notificatiesysteem in deze ronde.

### 24.18 Beheer en Testerbeheer (frozen)

Beheer blijft één rustige ingang (voet van de rail) met Testerbeheer, Berichtsjablonen, Imports,
Instellingen. Testerbeheer hoort niet in de hoofdnavigatie. Beheer blijft uit de dagelijkse aandacht.

### 24.19 Journeys, Groei, zoeken (frozen)

Journey is context van een relatie; een zelfstandige werkplek pas als medewerkers dagelijks groepen
relaties operationeel door journey-stappen bewegen of capaciteit plannen (nu niet het geval). Groei is
conditioneel maar duurzaam vindbaar bij de betrokken relatie (vorige ronde). Zoeken in Relaties volstaat;
globale zoek is nu niet nodig (trigger: structureel personen zoeken vanuit Vandaag/Gesprekken/Beheer).

### 24.20 Herleidbaarheid/audit (frozen principe; grotendeels A, sluitstuk C)

`audit_event`, `activity` en `delivery_event` dragen wat Maculis deed, wanneer en waarop gebaseerd. Het
sluitstuk "wat werd aan de medewerker getoond en welke menselijke actie volgde" hangt aan de duurzame
reveal-historie (C). De provenance-filosofie maakt audit mogelijk, niet onmogelijk.

### 24.21 Desktop, mobiel, responsiveness (frozen uitgangspunt)

De volledige professionele werkruimte is primair desktop/laptop. Onderweg minimaal relevant: Vandaag
bekijken, relatie opzoeken, contactgegevens, gesprek lezen, contact starten. De CSS is responsive
(rail en tabellen hebben mobiele varianten); geen aparte mobiele app. De architectuur werkt niet op één
prototypebreedte.

### 24.22 Donker en licht (principe frozen; palet-per-scherm NIET frozen)

Principe: de lichte cockpit is de standaard dagelijkse werkomgeving; donker is betekenisvolle nadruk
(reveal/aperture, bijzondere aandacht), niet de permanente dagelijkse omgeving. De verbeterde contrast-
en leesbaarheidsregels blijven. **Openstaande visual-refinement beslissing (bewust niet nu beslist):**
Vandaag rendert in het huidige prototype nog volledig donker (het "dual-space: donker om te zien"
concept). Onder principe §24.22 is dat de eerste vraag voor de visuele fase. Aanbeveling: Vandaag licht
maken als dagelijkse standaard, met de donkere behandeling gereserveerd voor de reveal/aperture-momenten
erbinnen. Dit is een paletkeuze, geen IA-wijziging, en valt bewust binnen "niet frozen".

### 24.23 CRM-drift review (frozen filosofie)

Per onderdeel getoetst: Vandaag (curatie, geen feed), Relaties-default (movers, geen tabel), dossier
(betekenis eerst), Gesprekken (aandacht-tiers). De tabel in Relaties-werkruimte en Testerbeheer zijn
gereedschap achter "jij hebt het stuur", niet de productfilosofie. Maculis zegt "dit doet ertoe; de
werkelijkheid erachter is beschikbaar", niet "hier is alles wat we weten".

### 24.24 Wat frozen is, en wat bewust niet

**Frozen:** hoofd-IA; rol van Vandaag als aandachtsfilter met twee bronnen (reactief en ontdekt); rol van
Relaties (twee modi); relatiedossierprincipe (meaning-first, detail-on-demand); Gesprekken; Beheer;
attention-principe en signal→movement→attention→action; communicatie als contextuele capability;
meaning-first/detail-on-demand; licht/donker-principe; provenance/eerlijkheid en de scheiding geheugen/
observatie/interpretatie/reveal; relatie (persoon of organisatie) als duurzame contextdrager; Vandaag
scopebaar op eigenaar/toewijzing; attention ≠ externe notificatie.

**Bewust NIET frozen:** exacte copy; pixels; definitieve kleuren en het palet-per-scherm (incl. of Vandaag
licht of donker is); specifieke componentvormen; rankingalgoritmes; exacte attention-thresholds en
bundelregels; toekomstige capabilities; alle aannames die alleen echt gebruik kan bewijzen. Frozen
betekent geen willekeurige architectuurwijziging zonder bewijs, niet "nooit meer leren".

### 24.25 Prototype-correcties in deze ronde (alleen aantoonbare inconsistenties)

- Eigenaar in het dossier: van "toekomstig" naar "in Maculis" (owner/assignment bestaan in het model).
- WhatsApp-identiteit: niet langer als geheel "toekomstig"; het nummer bestaat (channel_identity, A), de
  verzendadapter is de C-laag (nu correct in "Neem contact op").
- Nieuwe dossiersectie "Organisatie en andere contacten" (A): relatie is persoon of organisatie.
- Nieuwe contextuele actie "Neem contact op" in het dossier: één actie, alleen relevante/toegestane
  kanalen, eerlijk over kanaalstatus. Geen losse kanaalknoppen, geen gefakete capabilities. Acties inert
  in het prototype.

### 24.26 Eindconclusie

De laatste toets: kan Maculis straks honderd keer meer zien zonder dat de medewerker honderd keer meer
hoeft te zien, en kan die medewerker, zodra hij wil handelen, vanuit dezelfde relatiecontext moeiteloos
begrijpen, beslissen en communiceren? Het antwoord is overtuigend ja. Vandaag filtert (twee bronnen,
zelfde hoge drempel, afgeleide attention, geen feed); de relatie is de duurzame contextdrager voor
persoon én organisatie; communicatie is een contextuele capability met echte consent- en kanaalmodellen
eronder; en de enige echt ontbrekende inhoudelijke pijler (duurzame reveal-historie) is eerlijk als C
belegd met een vaste plek in het dossier.

**A — FUTURE COCKPIT BASELINE FROZEN.**

Geen resterende fundamentele blockers. Vanuit deze baseline kunnen de echte onderliggende capabilities
gericht verder worden ontwikkeld (verzendadapters waar de pilot ze nodig heeft, en daarna de duurzame
reveal-/inzicht-historie als sluitstuk van geheugen en auditability). Volgende stap is visuele/content-
verfijning, met als eerste beslissing het licht/donker-palet van Vandaag (§24.22).

## 25. Consolidatie- en completeness-pass (binnen de frozen baseline)

Een gerichte pass om de bestaande cockpit coherent en compleet te maken, zonder de architectuur opnieuw
te openen. Alleen aantoonbare inconsistenties opgelost; geen nieuwe capabilities, geen gefakete data. De
conclusie A uit §24 blijft ongewijzigd, met deze verbeteringen erin opgenomen.

### 25.1 Identiteit en bereikbaarheid direct zichtbaar (primaire correctie)

Probleem: contact en identiteit stond alleen in een standaard ingeklapte sectie. Een relatiedossier moet
de basale vragen (wie is dit, bij welke organisatie, hoe bereik ik hem) zonder uitklappen beantwoorden.

Kleinste rustige oplossing: een compacte identiteits- en bereikbaarheidszone direct onder de header
(naam en organisatie stonden er al; toegevoegd: het primaire e-mailadres, telefoonnummer en de
WhatsApp-aanwezigheid) plus de contextuele actie "Neem contact op". De volledige sectie "Contact en
identiteiten" blijft eronder voor detail (verified, primair, meerdere adressen). Meaning-first blijft:
een zone, geen CRM-kaart. Grondslag in de code: `channel_identity` (channel, value, verified,
is_primary).

### 25.2 Neem contact op: drie lagen eerlijk gescheiden

De contactactie maakt nu expliciet onderscheid tussen drie lagen die de echte code ook scheidt:

1. het contactgegeven/identity bestaat (`channel_identity`);
2. consent staat dit kanaal toe (`channelConsentState`/`channelAllowed`: EMAIL/PHONE standaard toegestaan,
   WHATSAPP/SMS vereisen expliciete opt-in);
3. de technische verzend- of beladapter bestaat (`channel_kind`: e-mail is er; WhatsApp/SMS zijn C).

Zo is E-mail volledig bruikbaar; Bellen heeft nummer en toestemming; WhatsApp en SMS tonen eerlijk dat ze
op opt-in en adapter wachten. Bij een relatie zonder toestemming (OPTED_OUT) tonen de gegevens zich nog
wel, maar zijn de uitgaande kanalen uitgeschakeld met "geen toestemming", plus een zichtbare hint in de
bereikbaarheidszone. Werkelijk bruikbaar nu: e-mail (identity plus consent plus adapter) en bellen
(nummer plus consent, mens draait zelf). Alleen data, nog niet uitvoerbaar: WhatsApp/SMS (identity kan
bestaan, maar opt-in en adapter ontbreken, C).

### 25.3 Observatie versus geheugen expliciet gescheiden

"Wat Maculis zag" (nu gemarkeerd als afgeleid, B) bevat de observaties en AI-voorstellen, met Bevestigen
en Verwerpen, en de regel dat een observatie nog geen geheugen is. Een aparte sectie "Geheugen" (in
Maculis, A) bevat alleen wat duurzaam bevestigd is. Zo wordt een oude AI-inferentie nooit stilzwijgend
een feit. Dit maakt de lifecycle expliciet: signaleren, interpreteren, voorstellen, bevestigen of
verwerpen, en pas daarna duurzaam onthouden.

### 25.4 Aandacht wegleggen met betekenis

De enkele knop "Afgehandeld" op Vandaag is vervangen door een rustige keuze "Leg weg": Afgehandeld,
Gezien geen actie, of Later. Niet ieder item dat Vandaag verlaat is werkelijk afgehandeld. De keuze is
lichtgewicht (geen formulier) en is tegelijk eerlijke feedback waar Maculis later van kan leren welke
signalen de gebruiker wel of niet relevant vindt. Het item valt nog steeds terug in rust, met de reden
zichtbaar.

### 25.5 Persoon versus organisatie blijft gerespecteerd

De bereikbaarheidszone hoort bij de persoon; de organisatie staat in de header en de sectie "Organisatie
en andere contacten" (A) blijft beschikbaar. De correctie hardcodeert dus niet opnieuw relatie is één
persoon plus één bedrijf: het model draagt meerdere contactpersonen per organisatie en een persoon kan
van organisatie wisselen.

### 25.6 Herloop van het dossier als gewone medewerker

1. Wie is deze relatie? Naam en rol in de header. Ja.
2. Bij welke organisatie hoort deze persoon nu? Header-subtitel plus sectie organisatie. Ja.
3. Hoe bereik ik hem? Bereikbaarheidszone onder de header, zonder uitklappen. Ja.
4. Welke kanalen zijn daadwerkelijk beschikbaar? "Neem contact op" toont ze met eerlijke status. Ja.
5. Welke mag ik gebruiken? Consent zichtbaar (hint plus per-kanaal in de actie). Ja.
6. Kan ik vanuit deze context contact leggen zonder apart systeem? Ja, via dezelfde relatiecontext.
7. Andere contacten van dezelfde organisatie? Sectie organisatie (A); fixtures tonen één contact.
8. Blijft het rustig en meaning-first? Ja: een compacte zone, geen contactkaart vol velden.
9. Bestaand versus toekomstig nog eerlijk? Ja: e-mail A, bellen A, WhatsApp/SMS C, reveal-historie C.

### 25.7 Wat bewust niet is toegevoegd

Geen aparte contactpagina, geen CRM-contactkaart, geen losse kanaalknoppen, geen dialer/verzendadapter,
geen nieuwe hoofdnavigatie, geen extra scherm. De architectuur uit §24 blijft ongewijzigd. Testsuite
groen; nul console-errors.

---

## 26. Relationele radar (Slice 4-correctie + Slice 5)

### 26.1 Slice 4-correctie: aandacht is afgeleid, nooit een momentopname

Aandacht wordt na iedere betekenisvolle transitie opnieuw uit de actuele autoritatieve state
afgeleid (`server/comm/attention.mjs`, `deriveAttention`). De kern: een succesvol verzonden
antwoord dat later valt dan de laatste inbound *settelt* die inbound. Versturen is een sterker
"afgehandeld"-signaal dan het menselijke leeswatermerk (de cockpit-lees is bewust bijwerkingsvrij,
dus het watermerk schuift niet mee bij verzenden). Een FAILED-verzending settelt niet en blijft als
`DELIVERY_PROBLEM` aandacht vragen. Een delivery-probleem wordt afgeleid uit de *laatste*
outbound-poging: een oude FAILED die door een latere SENT is opgevolgd, vraagt geen aandacht meer,
terwijl het FAILED-record als systeemhistorie bewaard blijft.

### 26.2 Attention Signal

Het radarmodel (`server/comm/signals.mjs`) werkt met kleine, bron-agnostische, deterministisch
*afgeleide* signalen:

```
BRON → SIGNAAL → RELATIONELE BETEKENIS → AANDACHT → VOORBEREID WERK → MENSELIJKE BESLISSING
```

Een signaal draagt: `source`, `type`, `contactId`, menselijke `reason`, `bucket`, `priority`,
`occurredAt`/`relevantAt`, optionele conversation/follow-up-referenties en expliciete `provenance`
(`source`, `sourceId`, `rule`, `derivedAt`). Geen opgeslagen score, geen LLM die feiten verzint:
elk signaal wordt telkens opnieuw uit de werkelijkheid berekend, dus zodra de reden verdwijnt,
verdwijnt het signaal.

**Radarregels in Slice 5 (alleen betrouwbaar afleidbaar uit de huidige state):**

- COMM: `DELIVERY_PROBLEM`, `INBOUND_QUESTION`, `INBOUND_MESSAGE` (een onbeantwoorde inbound blijft NU,
  ook als er al een concept klaarstaat; het concept is een attribuut, geen kalmere bucket).
- FOLLOW_UP: `FOLLOWUP_OVERDUE`, `FOLLOWUP_DUE` (NU) en `FOLLOWUP_UPCOMING` (KLAAR).
- RADAR: `QUIET_RELATIONSHIP`, conservatief. Vuurt alleen als er aantoonbaar eerder contact was
  (laatste `last_message_at` bekend), de stilte een centrale drempel (45 dagen) overschrijdt en er
  geen open aandacht is. Copy blijft feitelijk ("Al 45 dagen geen contact"), nooit een vermoeden.

**Buckets (geen mysterieuze score):** `NU` (mens nodig), `KLAAR` (Maculis zette iets klaar),
`OP DE RADAR` (uitlegbare reden, geen directe actie).

**Aggregatie en ranking:** per relatie één kaart met een primaire reden plus secundaire redenen
(geen kaart-explosie). Ranking is deterministisch: direct onbeantwoorde inbound, dan overdue
follow-up, dan due, dan voorbereid werk, dan radar/stilte.

**Datagat (bewust niet gefaket):** `OPEN_COMMITMENT` als losse MEMORY-afleiding ontbreekt, omdat er
geen gestructureerde toezegging-met-deadline in de huidige state zit. De follow-up dekt dit
betrouwbaar, dus een aparte afleiding is uitgesteld en wordt als `dataGaps` teruggegeven.

### 26.3 Één werkelijkheid

Vandaag en het relatiedossier lezen dezelfde `buildRadar`; het dossier roept hem gescoped op één
relatie aan (`buildRadar(tenantId, { contactId })`). De primaire reden bovenin het dossier is per
definitie gelijk aan de reden op Vandaag.

### 26.4 First Lens-hook (nu niet geïntegreerd)

De attention-laag is geschreven tegen een `source`, niet tegen "alleen conversations". De
`SIGNAL_SOURCES` bevatten al `FIRST_LENS`, `MEMORY`, `MANUAL` en `OTHER_LENS`. Later kan First Lens
als bron een observatie/signaal aanleveren dat via dezelfde aggregatie, ranking en buckets op
Vandaag verschijnt, met dezelfde provenance-eisen. Er is nu bewust niets van First Lens herbouwd of
geïntegreerd; alleen het contract is source-agnostisch gemaakt.
