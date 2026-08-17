# Mijn Maculis V2 — functioneel en architectonisch ontwerp

Status: ONTWERP ter besluitvorming. Nog niet bouwen. Geen productie, geen migraties, geen nieuwe
integraties, geen herontwerp van V1. Dit document legt de richting vast en markeert expliciet de
keuzes die een besluit van de eigenaar nodig hebben (zie "Beslispunten").

Uitgangspunt (eigenaar): de Cockpit is waar Maculis werkt. Mijn Maculis is waar de klant ziet,
begrijpt, kiest en samenwerkt. De V1-basis blijft intact: Overzicht, Inzichten (De Spiegel),
Samenwerking, en vooral de harde privacygrens PRIVATE → expliciete toestemming → SHARED.

Wat er nu daadwerkelijk staat (V1, samengevat): een klant opent Mijn Maculis met een opaque,
organisatie-gebonden toegang; ziet Overzicht, De Spiegel en Samenwerking; een inzicht draagt een
epistemische `stance` (reveal, non_reveal, tension, consistency, unknown) en vier mensgerichte
velden (wat zien we, wat betekent dit mogelijk, waar baseren we dit op, wat weten we nog niet);
delen is een expliciete, geaudite, server-afgedwongen actie (PRIVATE → SHARED) die pas daarna interne
context wordt; intrekken draait dat terug. De grens wordt in SQL afgedwongen, niet in een prompt.

Deze V2 beschrijft hoe die intelligente spiegel logisch uitgroeit tot een echte klantomgeving,
vanuit de klantbeleving, niet vanuit de database of bestaande techniek.

---

## 1. De rol van Mijn Maculis binnen het totale Maculis-systeem

Maculis kent twee perspectieven op één werkelijkheid.

- De Cockpit is het interne, operationele, aandachtgedreven werkperspectief van Maculis: Vandaag,
  Relaties, Gesprekken, Scout, voorstellen, approvals, evidence, confidence, interne observaties.
  Centrale vraag: "waar vraagt mijn werk, mijn relaties en de buitenwereld nu om mijn aandacht?"
- Mijn Maculis is het klantperspectief: rustiger, reflectiever, betekenisgedreven. Centrale vragen:
  "wat zien we over onze organisatie, wat betekent dat, waar werken we aan, wat vraagt aandacht, wat
  hebben we afgesproken, wat verandert er?"

Mijn Maculis is nadrukkelijk geen venster op de Cockpit en geen klantversie van de Cockpit. Het is
een eigen perspectief dat via een harde, gecontroleerde grens samenwerkt met de Cockpit. De rol:

1. De plek waar de klant de eigen organisatie steeds beter leert zien, via wat Maculis waarneemt.
2. De plek waar vertrouwen groeit, doordat de klant altijd begrijpt wat privé is, wat gedeeld is en
   wat Maculis daadwerkelijk mag gebruiken, en daar zelf over beslist.
3. De plek waar de samenwerking zichtbaar en navolgbaar wordt: wat onderzoeken we, wat is
   afgesproken, wat is besloten, wat is bereikt.

Ten opzichte van de andere lagen:

- Lens is de waarnemingsmotor die inzichten levert (met reveal of non-reveal en herkomst). Mijn
  Maculis is waar die inzichten menselijke betekenis krijgen en waar de klant er iets mee kan doen.
  Mijn Maculis is dus geen rapportviewer voor de Lens.
- De Context Layer (available context → authorization/privacy → task relevance → model → human
  control) geldt onverkort, met een klantrol en klanttaken. Mijn Maculis is tegelijk consument van
  die keten (voor eventuele klantgerichte AI) en producent van geautoriseerde context: alleen wat de
  klant bewust deelt (SHARED) mag de keten aan de Cockpit-kant voeden.

---

## 2. Klantjobs en gebruiksmomenten

Vanuit de klant geformuleerd (jobs to be done), niet vanuit onze features.

Kernjobs:

- Oriënteren: "laat me in een oogopslag zien wat er nu toe doet voor onze organisatie", rustig en kort.
- Begrijpen: "help me dit inzicht echt begrijpen", betekenis in plaats van data.
- Ontwikkeling zien: "laat me zien hoe dit zich over tijd ontwikkelt", nieuw, bevestigd, verdiept,
  genuanceerd, of niet langer relevant.
- Samenhang zien: "help me begrijpen hoe dit inzicht samenhangt met onze gesprekken, afspraken en
  wat we samen doen."
- Kiezen: "laat me aangeven wat ik met dit inzicht wil", herkennen, bespreken, delen, parkeren.
- Samenwerken: "laat ons samen aan relevante onderwerpen en vervolgstappen werken en de voortgang volgen."
- Terugzien: "laat me terugzien wat is afgesproken, onderzocht, besloten en bereikt."
- Bijblijven: "geef me relevante nieuwe signalen, rustig, zonder dat het een druk dashboard wordt."
- Vertrouwen houden: "laat me altijd begrijpen wat privé is, wat gedeeld is en wat Maculis echt gebruikt."

Gebruiksmomenten (laagfrequent maar betekenisvol, geen dagelijkse operationele tool):

- Na een Lens of een sessie: er is iets nieuws om te zien en te duiden.
- Tussendoor, kort: "is er iets veranderd of nieuw sinds ik laatst keek?"
- Rond een gesprek met Maculis: voorbereiden of terugkijken.
- Bij een beslissing: iets willen bespreken, delen of vastleggen.
- Periodieke reflectie: een maand- of kwartaalterugblik, "waar staan we, wat hebben we bereikt?"

Ontwerpconsequentie: Mijn Maculis moet beloond worden voor rust en betekenis, niet voor frequentie
of activiteit. Geen streaks, geen engagement-mechaniek.

---

## 3. Gewenste informatiearchitectuur

De drie ruimtes uit V1 blijven de ruggengraat: Overzicht, De Spiegel (Inzichten), Samenwerking.
V2 voegt geen nieuwe tabbladen toe, maar drie dwarsdoorsnijdende dimensies die de bestaande ruimtes
rijker maken:

- Tijd en ontwikkeling: elk inzicht en elk samenwerkingsonderwerp heeft een geschiedenis. Op
  Overzicht verschijnt "wat is veranderd", in het inzichtdetail een ontwikkelingslijn.
- Samenhang: inzichten, gesprekspunten, afspraken en werk worden gebundeld rond betekenisvolle
  onderwerpen ("thema's", bijvoorbeeld Positionering of Klantgerichtheid). Dit is de sleutel tot
  "verbanden begrijpen" zonder een knowledge-graph-interface.
- Signalen: een rustige, gedoseerde stroom "er is iets nieuws of veranderd", ondergebracht in
  Overzicht, niet als aparte notificatie-inbox.

Voorgestelde structuur:

```
Mijn Maculis
  Overzicht        wat doet er nu toe, wat is nieuw/veranderd, waar werken we aan
  De Spiegel       de inzichten: nieuw, bevestigd, verdiept, genuanceerd; per stance leesbaar
  Samenwerking     wat we samen onderzoeken, afspreken, besluiten en bereiken
  (Thema's)        dwarsdoorsnede: één onderwerp bundelt inzichten + samenwerking + ontwikkeling
```

Thema's zijn in eerste instantie een dwarsdoorsnede (een lens over de drie ruimtes), niet
noodzakelijk een vierde hoofdruimte. Zie Beslispunt D1.

Bewust niet in de IA: geen aparte ruimtes voor documenten, facturen, tickets, of een gedeelde inbox.
Dat zijn softwarecategorieën, geen Maculis-categorieën.

---

## 4. Kernfuncties voor V2, en wat er juist niet thuishoort

Kernfuncties V2 (in volgorde van klantwaarde, zie ook §10):

1. Inzichtontwikkeling door de tijd. Een inzicht is een levend object met een geschiedenis:
   waargenomen, bevestigd, verdiept, genuanceerd, minder relevant. De epistemische betekenis
   (reveal, non_reveal, en de herkomst) blijft behouden bij elke stap. De klant ziet ontwikkeling,
   niet een statisch rapport.
2. "Wat wil je hiermee?" Lichte, klant-geïnitieerde intenties naast delen: herkennen ("dit
   herkennen we"), niet herkennen, bespreken, later. Deze intenties vergroten de agency van de klant
   en voeden, uitsluitend waar bewust gedeeld, de Cockpit.
3. Thema's. Bundeling van samenhangende inzichten, afspraken, onderzoek en gesprekspunten rond een
   betekenisvol onderwerp. De plek waar samenhang en ontwikkeling samenkomen.
4. Samenwerking als levende werkstroom. Van een lijst naar een stroom per onderwerp: wat
   onderzoeken we, wat is afgesproken, wat is besloten, wat is bereikt, met voortgang door de tijd.
5. Terugblik. Een rustige, periodieke synthese ("dit zagen we, dit is veranderd, dit hebben we samen
   bereikt"), die de opgebouwde waarde voelbaar maakt.
6. Signalen. Gedoseerde, rustige attendering op nieuw of veranderd, in Overzicht. Nooit een
   badge-explosie.
7. Deel-controle en inzichtelijkheid. Per inzicht helder PRIVATE, SHARED of AGGREGATED, met een
   klantzichtbare deelhistorie ("gedeeld op, ingetrokken op") en een eenvoudig overzicht "wat heb ik
   gedeeld".

Wat niet in Mijn Maculis thuishoort (bevestiging van de V1-grenzen, uitgebreid voor V2):

- Geen interne Maculis-werking: geen agent-traces, Scout-internals, confidence-scores, interne
  hypotheses, interne relationele notities, ruwe evidence-architectuur, prompts, commerciële of
  prospect-kwalificatie.
- Geen gedeelde inbox of volledige mailthreads. Alleen bevestigde, klant-relevante afspraken of
  besluiten uit communicatie komen, na expliciete promotie, in Samenwerking.
- Geen facturatie, tickets, documentbibliotheek, notificatiecentrum, gamification, KPI-dashboards,
  autonome AI-acties, Scout of Discovery voor klanten, of een knowledge-graph-visualisatie.
- Geen chatbot als hoofdinterface. Een eventueel begrensd "gesprek met Maculis" is hooguit een
  ondersteunende functie binnen de Context Layer-keten, geen centrale metafoor (zie D5).

---

## 5. Relatie met Lens, Cockpit en Context Layer

Lens naar Mijn Maculis (ingest-grens, aparte workstream, nog niet aansluiten):

- Lens levert inzichten met een reveal- of non-reveal-betekenis en met herkomst. Een ingest-stap
  vertaalt Lens-uitvoer naar een `customer_insight`: de epistemische `stance` blijft behouden, de
  ruwe herkomst gaat naar de interne `provenance` (nooit naar de klant), en er ontstaat een
  mensgerichte formulering (de vier vragen). Reveal en non-reveal behouden hun betekenis; een
  non-reveal ("we zien hier geen verschil") is een volwaardig inzicht.
- Mijn Maculis toont nooit Lens-internals. Een aanwijzing wordt nooit als stellige conclusie getoond.

Cockpit en Mijn Maculis (harde grens, gecontroleerde samenwerking):

- Van klant naar Cockpit beweegt uitsluitend SHARED. Dit is al zo afgedwongen: de interne leesfunctie
  geeft per definitie alleen `sharing = 'SHARED'` terug. PRIVATE kan structureel niet in een interne
  weergave, prompt, log of andere agent belanden.
- Van Cockpit naar klant beweegt uitsluitend een bevestigde, klant-relevante en deelbare afspraak of
  besluit, via een expliciete promotie. Nooit een interne notitie automatisch publiceren omdat die
  toevallig aan dezelfde relatie hangt.
- Elke beweging van buiten (bijvoorbeeld een signaal dat Scout of een toekomstige agent over een
  bestaande klant vindt) moet eerst door identity, evidence, epistemische beoordeling,
  authorization/sharing en task relevance voordat er iets klantgericht kan worden. Geen directe
  agent-naar-klant-uitvoer.

Context Layer (dezelfde fundering, andere rol):

- De keten blijft: available context → authorization/privacy → task relevance → model → human
  control. Een klantgerichte AI-rol krijgt alleen context die voor die klant en die concrete taak is
  toegestaan. Geautoriseerd is nog niet relevant: relevantie kan alleen weglaten, nooit autoriteit
  toevoegen.
- Mijn Maculis levert de klant-stem als geautoriseerde context terug aan de Cockpit, maar alleen via
  SHARED. Geen apart "Mijn Maculis AI" met een eigen persoonlijkheid of promptuniversum; één gedeeld
  Maculis-DNA, andere rollen en autorisaties.

---

## 6. Privacy- en toestemmingsmodel

Behoud de drie server-afgedwongen niveaus als eerste-klas begrippen:

- PRIVATE: uitsluitend voor de klant.
- SHARED: bewust door de klant met Maculis gedeeld, of expliciet vastgesteld als bruikbaar.
- AGGREGATED: een patroon of hoofdlijn zonder gevoelige broninformatie.

Uitbreidingen in V2:

- Klantzichtbare deelhistorie. Een eenvoudige, menselijke weergave "wat heb ik gedeeld en wanneer",
  als klantzichtbare subset van de interne, append-only deel-audit. Intern blijft de volledige,
  onveranderlijke audit bestaan (wat, door wie, wanneer, vanuit welk inzicht, welk niveau, en
  wanneer eventueel ingetrokken).
- Transparantie over AI-gebruik. Als een klantgerichte AI-functie context gebruikt, tonen welke
  bronnen dat waren (dezelfde transparantie-referenties die de Context Engine al teruggeeft), zodat
  de klant kan zien waarop iets is gebaseerd.
- AGGREGATED scherp begrenzen. In V2 uitsluitend binnen de eigen organisatie over tijd ("dit zien we
  vaker terug bij jullie"), niet over klanten heen. Cross-tenant aggregatie is een aparte, zwaar te
  governen beslissing en hoort niet in V2 (zie D3).

Onveranderd principe: privacy is architectuur, afgedwongen vóór elke modelcall. Menselijke controle,
geen dark patterns, geen automatische publicatie van klantinzichten, geen autonome toezeggingen of
externe communicatie namens de klant.

---

## 7. Beweging van PRIVATE naar SHARED en eventueel terug

Bestaand (V1) en te behouden:

- PRIVATE is de standaard. De klant kiest expliciet om te delen: PRIVATE → SHARED, server-side en
  geaudit. Pas daarna is het inzicht geautoriseerde interne context.
- Intrekken: SHARED → PRIVATE, geaudit, en verwijdert het inzicht direct weer uit de interne context.

Verrijkingen in V2:

- Intentie vóór delen. "Dit herkennen we", "bespreken" of "later" zijn lichtere stappen dan volledig
  delen. "Bespreken" plant een onderwerp in Samenwerking, maar geeft de inhoud nog niet als
  SHARED-context vrij: bij de eerste inhoudelijke stap wordt alsnog expliciete deel-toestemming
  gevraagd. De grens blijft hard (zie D4).
- Delen met een kader. Bij delen kan de klant optioneel een korte notitie meegeven ("we delen dit,
  maar let op…"), die als klant-stem meereist naar de Cockpit.
- Eerlijk gevolg tonen. Bij intrekken helder maken wat dat betekent: Maculis gebruikt het inzicht
  niet langer, maar reeds gevoerde gesprekken worden niet teruggedraaid.
- Terugbeweging naar de klant. Een bevestigde afspraak of besluit in de Cockpit wordt, indien
  klant-relevant en deelbaar, expliciet gepromoot naar Samenwerking. Nooit automatisch.

```
   Lens ─► (ingest) ─► INZICHT [PRIVATE]  ──(klant kiest: delen)──►  [SHARED] ─► geautoriseerde Cockpit-context
                              ▲                                          │
                              └──────────────(klant trekt in)───────────┘   (audit bij elke overgang)

   Cockpit: bevestigde afspraak/besluit ──(expliciete promotie, klant-relevant)──► Samenwerking (klant ziet dit)
```

---

## 8. Hoe Mijn Maculis door de tijd steeds waardevoller wordt

- Levende inzichten. Elk inzicht heeft een geschiedenis met behouden herkomst en epistemische status.
  De klant ziet dat het beeld scherper wordt, niet dat er telkens een nieuw los rapport verschijnt.
- Accumulatie via thema's. Over meerdere Lenzen en sessies groeit een rijker organisatiebeeld.
  Thema's worden "dikker": meer inzichten, meer afspraken, meer bereikt, meer samenhang.
- Voelbare terugblik. Een rustige periodieke synthese maakt de opgebouwde waarde zichtbaar: "dit
  zagen we een half jaar geleden, dit is veranderd, dit hebben we samen bereikt."
- Vertrouwen als kapitaal. Elke deel-beslissing en elke nagekomen afspraak versterkt de relatie; de
  deelhistorie en de terugblik maken die betrouwbaarheid zichtbaar.
- Zonder de interface voller te maken. De bewuste rust en witruimte van V1 worden functioneel benut
  voor samenhang, context en ontwikkeling in de tijd, via progressive disclosure: het inzicht-tijdlijntje,
  de thema-bundeling en een lichte "wat is veranderd", niet via extra widgets. Ruimte wordt betekenis,
  geen leegte die opgevuld moet worden.

---

## 9. Voorstel voor de belangrijkste schermen en flows

- Overzicht V2. Behoudt het hero-attention-inzicht. Voegt rustig toe: "wat is veranderd sinds je
  laatst keek", "onze laatste stap", en een compacte thema-strip "waar we samen aan werken". De
  witruimte draagt een subtiele ontwikkelingsband, geen dashboard.
- Inzichtdetail V2. De vier vragen blijven. Toegevoegd: een ontwikkelingslijn (hoe dit inzicht
  veranderde), "verwante inzichten, afspraken en gesprekspunten" (samenhang), "wat wil je hiermee?"
  (herkennen, bespreken, delen, later), en de deel-status met historie.
- Thema-scherm (nieuw). Eén betekenisvol onderwerp met de samenhangende inzichten, wat we
  onderzoeken, de afspraken, de besluiten en wat bereikt is. De plek waar verbanden en ontwikkeling
  samenkomen.
- Samenwerking V2. Van lijst naar werkstroom per onderwerp, met voortgang door de tijd en een helder
  onderscheid tussen onderzoeken, afspreken, besluiten en bereiken.
- Terugblik (licht, periodiek). Een rustige samenvatting, bijvoorbeeld rond een Lens of per kwartaal.
- "Wat heb ik gedeeld" (deel-overzicht). Klantzichtbare deelhistorie, versterkt vertrouwen.
- Desktop-ruimtegebruik. De rechterkolom of een onderband beweegt mee met wat je bekijkt (context,
  tijd, samenhang), via progressive disclosure. Standaard rustig, rijker wanneer de klant iets opent.

Voorbeeld-copy volgt de Maculis-schrijfregel (geen streepjes als stijlmiddel). Voorbeelden:
"Dit herkennen we." "Dit lijkt erop te wijzen dat…" "Dit zien we op meerdere plekken terug." "Hier
hebben we nog onvoldoende zicht op." "Als je dit deelt, kan Maculis dit gebruiken in jullie
samenwerking en relevante gesprekken."

---

## 10. Gefaseerde bouwvolgorde: kleinste volgende slice met de grootste klantwaarde

Afweging: wat maakt Mijn Maculis het snelst echt "levend" en waardevoller, met de minste bouw, puur
additief, en zonder de privacygrens te versoepelen?

- Slice A (aanbevolen eerste). Inzichtontwikkeling door de tijd. Een inzicht-tijdlijn plus
  status-evolutie (nieuw, bevestigd, verdiept, genuanceerd, minder relevant). Grootste "de spiegel
  wordt levend"-waarde, laag risico, puur additief op het bestaande inzichtmodel, geen grenswijziging.
  Dit onderscheidt Mijn Maculis het duidelijkst van een rapport.
- Slice B. "Wat wil je hiermee?" Lichte intenties (herkennen, bespreken, later) naast delen. Vergroot
  klant-agency en voedt, alleen waar gedeeld, de Cockpit. Additief.
- Slice C. Thema's. Bundeling van inzichten en samenwerking rond een onderwerp. Levert "verbanden
  begrijpen". Grotere slice, na A en B.
- Slice D. Samenwerking als werkstroom plus terugblik. Maakt "samen werken en terugzien" echt.
- Slice E. Klant-deel-overzicht "wat heb ik gedeeld". Klein, versterkt vertrouwen.
- Randvoorwaardelijk, aparte workstreams (niet nodig om klantwaarde op preview te bewijzen): Lens →
  Mijn Maculis ingest, en echte klant-authenticatie (SSO) ter vervanging van de opaque preview-link.

Aanbeveling voor de eerstvolgende bouwopdracht: Slice A (inzichtontwikkeling door de tijd),
eventueel met een klein deel van Slice B.

---

## Beslispunten (jouw besluit nodig)

- D1. Thema's als vierde hoofdruimte, of als dwarsdoorsnede binnen de bestaande drie? Aanbeveling:
  eerst dwarsdoorsnede, eventueel later een eigen ruimte.
- D2. Eén helder SHARED-niveau vasthouden, of doel- of scope-gebonden delen introduceren
  (bijvoorbeeld "delen om te bespreken" versus "delen om in gesprekken te gebruiken")? Aanbeveling:
  één helder niveau in V2, om complexiteit en dark-pattern-risico te vermijden.
- D3. AGGREGATED uitsluitend binnen de eigen organisatie over tijd, of ooit cross-tenant en
  geanonimiseerd? Aanbeveling: alleen eigen organisatie in V2; cross-tenant is een aparte
  governance-beslissing.
- D4. Mag "bespreken" een beperkte, doelgebonden zichtbaarheid geven, of blijft alles hard PRIVATE
  tot expliciet SHARED? Aanbeveling: hard PRIVATE tot SHARED; "bespreken" plant alleen een onderwerp.
- D5. Wel of geen begrensd "gesprek met Maculis" in Mijn Maculis (klant-AI binnen de Context Layer)?
  Zo ja, in welke fase? Aanbeveling: ja, later en strikt begrensd, niet als hoofdinterface.
- D6. Is Slice A (inzichtontwikkeling door de tijd) de gewenste eerstvolgende bouwopdracht?
- D7. Hoe proactief mag Mijn Maculis attenderen: alleen in-app, of ook per e-mail? Aanbeveling:
  eerst alleen in-app rust, geen e-mailnotificaties in V2.

---

Niets in dit document is gebouwd of gewijzigd aan V1, productie of de datamodellen. Na jouw besluit
op de beslispunten bepalen we samen de eerstvolgende concrete bouwopdracht (naar verwachting Slice A).
