# Maculis · De Vijfde Kamer

**Conceptuele ontwerpstudie. Geen productiewijziging. Geen bouwopdracht.**

Status: ter beoordeling.
Datum: 2026-08-17.
Scope: uitsluitend de studie uit de opdracht. Niets aan Website, Lens, Mijn Maculis, Cockpit,
Visual DNA of productie gewijzigd.

---

## 0. Wat ik vooraf moet melden

Twee dingen, zodat je de rest op waarde kunt schatten.

**De canon staat niet in deze repository.** Ik heb gezocht naar Visual DNA v1.0 en de Visual North
Star. Ze bestaan hier niet als document. Wat hier wel verifieerbaar is: de inktwereld (`#080503`),
perkament (`#ece2d4`), koper (`#c8894a`), warme haarlijnen (`rgba(200,137,74,.18)`) en een
serif-stack zonder Newsreader. De grammatica (koper, violet, beweging, stilte, lichtsterkte,
verbinding) ken ik alleen uit jouw opdracht. Ik heb daar strikt binnen gewerkt en niets aan
gewijzigd, maar je moet de studie langs de echte documenten leggen voordat je hem accepteert.

**Ik heb één ding gevonden dat de hele studie stuurt.** In `docs/BUILD_LOG.md` staat de entry van
15 augustus: "Scope & ownership: Communication Layer grens (productbeslissing). Geen
code-wijziging. Uitsluitend een vastgelegde scope/ownership-grens (op verzoek), zodat toekomstige
sessies/agents niet vanuit de Communication-workstream buiten hun mandaat bouwen."

Dat is het bewijs waar deze studie op rust. Je hebt een hele sessie besteed aan het opschrijven van
een besluit, zonder één regel code, puur om samenhang vast te houden over sessies en agents heen.
Het probleem uit hoofdstuk 2 van je opdracht is dus niet hypothetisch. Het kost je nu al tijd, en
je hebt er al een noodoplossing voor gebouwd.

---

## 1. Thesis

> **Het Atelier is het geheugen van de bouw van Maculis. Het bewaart wat besloten is, wat nog
> onzeker is en waarvoor bewijs bestaat, zodat ik dat niet langer in mijn hoofd hoef te dragen.**

Let op wat hier níet staat. Er staat niet "dashboard". Er staat niet "overzicht". Er staat niet
"aandacht".

Dat is een correctie op je eigen vraagstelling, en ik denk dat het de belangrijkste uitkomst van
deze studie is. Je opdracht presenteert aandacht als het schaarse goed (hoofdstuk 7). Ik geloof dat
niet, en je eigen lijst in hoofdstuk 18 bewijst het tegendeel. Loop hem langs:

| Situatie uit jouw lijst | Wat er werkelijk misgaat |
|---|---|
| meerdere parallelle Claude Code-opdrachten | je verliest welke waarover ging. **continuïteit** |
| ontwerpbeslissingen | ze raken verspreid over chats. **continuïteit** |
| Visual DNA | agents kennen de canon niet. **continuïteit** |
| harmonisatie | de reden van een keuze verdampt. **continuïteit** |
| besluiten die niet verloren mogen raken | letterlijk. **continuïteit** |
| hypotheses die nog openstaan | niemand houdt ze bij. **continuïteit** |
| previews die beoordeeld moeten worden | er ligt iets klaar. **aandacht** |
| code die gebouwd en getest wordt | staat al in GitHub. **niets nodig** |

Zes van de acht zijn geheugen. Eén is aandacht. Eén is al opgelost.

Dat verandert het ontwerp fundamenteel. Een kamer die begint met "wat vraagt nu jouw aandacht?"
kopieert de grammatica van de Cockpit en lost het verkeerde probleem op. Het Atelier begint met
"waar staan we, en wat weten we".

Aandacht is in dit ontwerp geen invalshoek. Het is een **afgeleide van het geheugen**. Zie
hoofdstuk 5.

---

## 2. Bestaansrecht naast de Cockpit

Jouw hypothese was: Cockpit gaat over het werk dat Maculis uitvoert, Kamer 5 over de ontwikkeling
van Maculis zelf. Die hypothese klopt, maar hij is te zwak om een aparte kamer te dragen. Zo
geformuleerd is het een filter op dezelfde lijst, en een filter is een tabblad, geen kamer.

De sterkere formulering:

> **De Cockpit gaat over werk dat Maculis voor anderen doet en meet in uren en reacties. Het
> Atelier gaat over werk dat aan Maculis zelf gebeurt en meet in besluiten en bewijs. Die twee
> hebben een verschillende klok, en daarom kan het ene het andere niet dragen zonder er zijn
> tempo aan op te leggen.**

Dat verschil is concreet en toetsbaar:

| | Cockpit | Atelier |
|---|---|---|
| eenheid | het gesprek | de vraag |
| klok | uren | weken |
| te laat is | een klant wacht | een besluit is vergeten |
| succes | leeg | dichter |
| einde | afgehandeld, verdwijnt | beantwoord, blijft staan als canon |
| gedrag over tijd | stroomt door en leegt | groeit aan en verdicht |

De laatste regel is de beslissende. **Een Cockpit hoort leeg te lopen. Een Atelier hoort vol te
lopen.** Een Cockpit die volloopt is een probleem. Een Atelier dat leegloopt is kapot. Twee
oppervlakken met tegengestelde gezondheidsdefinities kun je niet in één ruimte leggen zonder dat
één van beide zijn betekenis verliest.

Dit is de reden dat het Atelier bestaansrecht heeft. Niet omdat het over andere dingen gaat, maar
omdat het over andere dingen gaat **op een andere tijdschaal, met een tegengestelde
succesdefinitie.**

Aanvullend bewijs uit je eigen repo: de build log legt vast dat de Attention Cockpit uitdrukkelijk
"een operationele baseline, NIET de definitieve toekomstige Maculis Home" is. De Cockpit is dus zelf
nog in beweging. Er iets fundamenteels bovenop stapelen zou beide beschadigen.

---

## 3. Ontwerpthese

> **Een ontwikkellijn is geen project. Een ontwikkellijn is een vraag die Maculis op dit moment
> aan het beantwoorden is.**

Dit is de stelling die de hele kamer stuurt, en hij is bewust gekozen om projectmanagement
onmogelijk te maken.

Vergelijk:

- "Visual DNA" is een bak. Er kan van alles in. Hij is nooit klaar. Hij vraagt om subtaken,
  statussen en een bord.
- "Blijven vier kamers herkenbaar familie zonder elkaar te kopiëren?" is een vraag. Hij heeft een
  antwoord of hij heeft er nog geen. Hij kan sterker of zwakker worden. Hij kan heropend worden.
  Hij kan samenvallen met een andere vraag.

Wat dit oplevert:

1. **Er valt niets te verslepen.** Een vraag beweegt niet over een bord. Hij wordt beantwoord.
   Kanban is structureel onmogelijk gemaakt.
2. **Klaar heeft betekenis.** Een lijn eindigt wanneer zijn vraag beantwoord is en het antwoord
   standhoudt, niet wanneer taken afgevinkt zijn.
3. **Samenvallen wordt natuurlijk.** Twee lijnen versmelten wanneer blijkt dat het dezelfde vraag
   was. Dat is precies wat je in hoofdstuk 3 beschreef, en met vragen als eenheid is het geen
   speciale functie maar een gewone gebeurtenis.
4. **Het dwingt tot scherpte.** Een vraag die je niet kunt opschrijven, bestaat nog niet. Dat is
   op zichzelf al waardevolle informatie.
5. **Het is het formaat dat een agent nodig heeft.** Zie hoofdstuk 8.

Onder een lijn bestaan precies **vijf soorten regels**, niet meer:

- **vraag** wat we willen weten
- **onzekerheid** wat we expliciet nog niet weten
- **besluit** wat is vastgesteld, met datum en reden
- **bewijs** wat het heeft aangetoond, met een verwijzing
- **bron** waar het vandaan kwam, met één zin over wat het opleverde

Meer soorten voegen we niet toe. Elk zesde type is het begin van een ticketsysteem.

---

## 4. Toestand: twee assen, geen status

Je stelde voor: rust, wording, aandacht, handeling, beoordeling, canon. Dat is een goede intuïtie,
maar als één lijst wordt het een statuskolom, en een statuskolom is Jira.

Het klopt niet omdat er twee onafhankelijke dingen door elkaar lopen:

**As 1 · Grond.** Hoe vast staat het?

`vermoeden → onderzocht → besloten → bewezen → canon`

**As 2 · Beweging.** Gebeurt er nu iets?

`stil · in beweging · wacht op mij`

Ze zijn echt onafhankelijk, en juist de combinaties die een enkele status onmogelijk maakt, zijn de
belangrijkste:

- **canon + in beweging** = een vastgelegd besluit wordt heropend. De gevaarlijkste toestand in
  Maculis, en met één statuskolom onzichtbaar.
- **vermoeden + stil** = een geparkeerde hypothese. Volstrekt gezond. Vraagt niets.
- **besloten + wacht op mij** = er is besloten, er is gebouwd, er ligt bewijs, en niemand heeft
  gekeken.
- **vermoeden + in beweging** = er wordt gebouwd aan iets waarvoor geen besluit bestaat. Precies
  wat je notitie van 15 augustus probeerde te voorkomen.

Dit is ook waar de grammatica exact op landt, zonder dat ik er iets aan hoef toe te voegen:

| Grammatica | Betekenis in het Atelier |
|---|---|
| koper | grond. waargenomen, onderbouwd |
| violet | betekenis in wording. er ontstaat iets, het staat niet vast |
| lichtsterkte | verdicht bij onafhankelijke bevestiging. drie bronnen is helderder dan drie keer dezelfde bron |
| beweging | onzekerheid, of werk dat loopt |
| stilte | bevestigd. voldoende rust |
| verbinding | alleen bij inhoudelijk verband. nooit omdat twee dingen op dezelfde dag gebeurden |

Grond stuurt kleur en licht. Beweging stuurt beweging. Er is geen derde codering nodig, en er komt
geen enkel statuslabel in beeld.

### DNA GAP

De grammatica beschrijft een signaal **nu**. Het Atelier moet ook tonen dat iets ooit vaststond en
weer is opengegaan. Stilte die terugkeert naar beweging ziet er in de huidige grammatica identiek
uit aan iets dat nooit stil is geweest, en dat is precies het verschil dat ertoe doet.

**Voorstel, één oplossing:** een **spoor**. Wanneer een tot rust gekomen lijn heropent, blijft de
vorige stilte zichtbaar als een zwakkere koperen afdruk achter de nieuwe beweging. Geen nieuwe
kleur, geen nieuw token, geen nieuw label. Alleen: wat vaststond laat een afdruk na.

Dit is een voorstel, geen wijziging. De canon blijft ongewijzigd tot jij hem wijzigt.

---

## 5. Aandacht is afgeleid, nooit opgeslagen

Dit is de intelligentie, en het is bewust klein. Een lijn vraagt om jou in precies drie gevallen:

1. **Bewijs zonder oordeel.** Er ligt bewijs tegenover een open vraag en niemand heeft geoordeeld.
   *Er staat een preview klaar sinds dinsdag.*
2. **Besluit onder druk.** Nieuw bewijs of nieuw inzicht spreekt een vastgelegd besluit tegen.
   *De Lens 1-bevinding raakt de scopegrens van 15 augustus.*
3. **Werk zonder grond.** Er wordt gebouwd aan iets waarvoor geen besluit bestaat.
   *Dit is de duurste fout die je kunt maken, en de enige waar je zelf al een handmatige
   noodoplossing voor hebt geschreven.*

Alles wat hier niet onder valt, is stilte. Ook als er van alles gebeurt.

Waarom dit werkt: alle drie zijn **berekenbaar uit de ledger zelf**. Er is geen model nodig, geen
ranking, geen scoring, geen AI-oordeel. Het is een afleiding, precies zoals `attentionOverview` in
de Communication Layer al werkt: afgeleid, tenant-scoped, nooit dubbel opgeslagen. Diezelfde
architectuurdiscipline, toegepast op de bouw van Maculis zelf.

Het derde geval is de reden dat het Atelier waarde toevoegt die geen enkel bestaand hulpmiddel
biedt. Git laat zien dát er gebouwd wordt. Alleen een ledger van besluiten kan zien dat er gebouwd
wordt **zonder besluit**.

---

## 6. De toestand 'niets'

Je vroeg hier expliciet aandacht voor, en ik denk dat je gelijk hebt dat het de mooiste toestand is.

Het antwoord: **wanneer het Atelier niets van je nodig heeft, is het geen leeg dashboard. Het is
het geheugen in rust.**

Concreet: één zin in serif, groot, boven een donker veld. Daaronder de lijnen, stil, als koperen
afdrukken. Wat je ziet is niet "er is niets". Wat je ziet is **alles wat inmiddels vaststaat**.
Een leeg dashboard voelt als verlies. Een stil archief voelt als bezit.

De zin is geen begroeting en geen samenvatting van activiteit. Het is de stand van Maculis:

> *Er wacht niets op jou. Negen lijnen. Vier staan vast.*

En dan de kern van de zaak: **die rusttoestand is al een stilstaand beeld.** Eén donker veld, een
paar stille koperen sporen, één regel tekst. Dat is precies wat een wallpaper is.

Daarmee is hoofdstuk 9 van je opdracht opgelost zonder één regel extra werk. De wallpaper is geen
apart project. **De wallpaper is een schermafbeelding van de rusttoestand.** Als het Atelier ooit
gebouwd wordt, is de ambient desktop een exportknop, geen ontwikkelspoor. Als de rusttoestand geen
mooie wallpaper oplevert, is de rusttoestand fout ontworpen.

Dat is de toets die ik voorstel voor hoofdstuk 9, en de reden om er verder geen woord aan vuil te
maken.

---

## 7. Experience architecture

Drie diepten. Meer niet.

**Het veld.** Wat je ziet bij openen. Eén zin, en de lijnen als sporen in een donker veld.
Horizontaal loopt tijd, rechts is nu. Verticaal staan de lijnen, en de volgorde is niet
alfabetisch en niet naar prioriteit maar naar **grond**: wat vaststaat zakt naar onderen en wordt
stil, wat in wording is zweeft bovenin en beweegt. De ruimte sorteert zichzelf naar zekerheid.

**De lijn.** Eén klik. Een rustig leespaneel in serif. Vier dingen, in deze volgorde:

1. de vraag
2. wat we inmiddels weten, en waarop dat rust
3. wat we nog niet weten
4. het laatste besluit, met datum en reden

Geen tijdlijn, geen activiteitenstroom, geen commit-log. De volgorde is niet chronologisch maar
naar zekerheid, want dat is wat je komt halen.

**Het oordeel.** Alleen wanneer er iets ligt. Het bewijs komt naar de vraag toe, met de vraag
ernaast waar het antwoord op geeft. Drie mogelijke reacties, en niet meer:

- *dit klopt* → wordt besluit, de lijn wordt stil en helderder
- *dit klopt niet* → wordt onzekerheid, de lijn blijft bewegen
- *nog niet genoeg* → wordt een expliciete open vraag, de lijn wacht op meer grond

Het derde antwoord is het belangrijkste. Zonder dat antwoord wordt elk oordeel een ja of een nee,
en verdwijnt het echte antwoord ("ik weet het nog niet") uit het systeem. Precies dát antwoord
draag je nu in je hoofd.

**Wat er niet is:** geen instellingen, geen filters, geen zoekbalk, geen weergavekeuzes, geen
tabbladen, geen chatvenster. Elk daarvan is een uitnodiging om het Atelier te bedienen in plaats
van te lezen.

---

## 8. Bronnen, en de lezer die je vergeet

Gesprekken met ChatGPT en Claude Code zijn bronnen. Een bron in het Atelier is **een verwijzing
plus één zin over wat hij opleverde.** Nooit het transcript.

Eén regel houdt dit gezond:

> **Een bron mag alleen bestaan als er minstens één regel uit voortkomt.**

Zonder die regel groeit er een archief van gesprekken, en dan heb je je chatgeschiedenis
nagebouwd met extra stappen.

En dan het punt dat de hele kosten-batenafweging kantelt:

> **De belangrijkste lezer van het Atelier ben jij niet. Het is de volgende sessie.**

Nu begint elke Claude Code-sessie leeg. Jij bent degene die uitlegt wat de canon is, welk besluit
al genomen is, welke vraag nog openstaat en waar de grens ligt. Dat is de herhaalde kost die je
het meeste tijd kost, en het is precies waarom je op 15 augustus die scope-notitie schreef.

Een ledger van vragen, besluiten en onzekerheden die in de repository leeft en waar `CLAUDE.md`
naar wijst, wordt automatisch gelezen door elke sessie. Niet omdat er een integratie is, maar
omdat het een bestand is.

Dat verplaatst het Atelier van "persoonlijk hulpmiddel dat prettig zou zijn" naar "infrastructuur
die het opnieuw uitleggen wegneemt". Dat is de enige lezing waarin Kamer 5 de harde productregel
uit hoofdstuk 11 haalt.

Daaruit volgt ook de architectuur:

> **De repository weet wat er gebeurt. De ledger weet wat het betekent.**

Wat er gebeurt (branches, commits, tests, previews) staat al ergens en is gratis af te lezen. Het
Atelier hoeft dat niet op te slaan en al helemaal niet na te bouwen. Wat nergens staat is wat het
betekent. Dat is het enige wat het Atelier bewaart.

---

## 9. Dagelijkse gebruikslus

**'s Ochtends.** Eén zin. Meestal: er wacht niets op jou. Soms: één ding wacht op jouw oordeel.
Nooit een lijst van alles wat er speelt. Als er niets is, is het scherm binnen twee seconden klaar
met je.

**Terwijl Code bouwt.** De lijn beweegt zacht. Geen voortgangsbalk, geen logstroom, geen
percentage. Alleen: hier gebeurt iets. Je hoeft niets te doen, en het scherm vraagt ook niets.
Beweging is hier geen uitnodiging.

**Wanneer iets klaarstaat.** Het bewijs komt naar de vraag toe. Je ziet waar het antwoord op geeft
voordat je ziet wat het is. Drie reacties, één zin van jou.

**Wanneer je een besluit neemt.** Je zin wordt de tekst van het besluit. Niet een label, niet een
statuswijziging. De beweging stopt, de lijn wordt stiller en helderder. Vanaf dat moment lezen
volgende sessies het besluit voordat ze beginnen.

**Wanneer alles rustig is.** Zie hoofdstuk 6. Het veld staat stil en het is mooi.

---

## 10. Waarde tegenover bouwkosten

Vier niveaus, met mijn oordeel per niveau.

### A · Volledig lokaal en statisch: de ledger. **BOUWEN**

Platte tekst in de repository. Per ontwikkellijn één bestand, of één bestand met alles. Vijf
regeltypes. `CLAUDE.md` wijst ernaar.

- Kosten: twee tot drie uur eenmalig. Daarna ongeveer twee minuten per sessie.
- Opbrengst: elke sessie begint met context. Besluiten raken niet kwijt. Open vragen blijven open
  in plaats van te verdampen.
- Oordeel: **duidelijk positief, vanaf de eerste week.** Dit is de kleinst mogelijke bruikbare v0
  en hij is verrassend klein: het is een bestandsformaat en een gewoonte, geen software.

### B · Eenvoudige koppeling: een lezer over de ledger. **NOG NIET**

Een statische pagina die de ledger leest en de rusttoestand toont. Beweging kan uit git komen
(open branches, laatste commit, CI-status), alles read-only.

- Kosten: ongeveer één dag voor de lezer, twee tot drie dagen extra voor de git-koppeling.
- Opbrengst: onzeker. Aangenaam. Maar de tekst bevat al alle betekenis.
- Oordeel: **pas na bewijs dat A gebruikt wordt.** Toets over zes weken. Zie hoofdstuk 12.

### C · Nieuwe infrastructuur: ChatGPT-export, samenvatting, synchronisatie. **NIET BOUWEN**

- Kosten: weken. En het vraagt onderhoud, precies de mentale belasting die het zou wegnemen.
- Opbrengst: het vervangt handwerk dat twee minuten kost.
- Oordeel: **kosten hoger dan waarde. Niet nu, en waarschijnlijk nooit.**

### D · Kamer 5 als volwaardige vijfde kamer met eigen productoppervlak. **NIET BOUWEN**

- Kosten: weken, en daarna permanent onderhoud dat meeloopt met elke DNA-wijziging en elke
  harmonisatieronde. Kamer 5 zou aan elke toekomstige harmonisatie meedoen zonder er ooit klanten
  mee te bedienen.
- Opbrengst: negatief tegenover Website, Lens, Mijn Maculis en Cockpit.
- Oordeel: **niet bouwen. Dit is de val van deze opdracht.** Het Atelier is een privé-instrument.
  Op het moment dat het een kamer wordt, krijgt het onderhoudsplicht en gaat het concurreren met
  het werk dat het zou moeten versnellen.

**Samengevat:** het concept is goed. De vijfde kamer is dat niet. Bouw het substraat, niet de
ruimte.

---

## 11. Toets aan het succescriterium

"Had dit mij de afgelopen weken aantoonbaar geholpen?" Getoetst aan de werkelijke geschiedenis in
deze repository.

| Werkelijke gebeurtenis | Had de ledger geholpen? |
|---|---|
| Scopegrens Communication Layer, 15 aug | **Ja.** Dit was letterlijk een handgeschreven ledger-regel. Hij had twee minuten gekost in plaats van een sessie. |
| "Attention Cockpit is baseline, niet de Maculis Home" | **Ja.** Dit is een besluit met een houdbaarheidsdatum. Precies het soort dat verdwijnt. |
| Lens 1-bevinding: SILENCE bij Reveal mag de journey niet stilleggen | **Ja.** Dit staat nu in een build log van de verkeerde workstream omdat er geen plek voor was. Een lijn "Wat mag SILENCE stilleggen?" had die plek gegeven. |
| Outbound-incident: 200 was geen aflevering | **Deels.** Het incident had het niet voorkomen. Maar de conclusie ("in productie nooit stil mocken") is een canonregel die anders in een build log verdwijnt. |
| Tests 65/65 groen | **Nee.** Staat al in CI. Het Atelier hoeft dit niet te weten. |
| Parallelle Claude Code-opdrachten | **Ja, en dit is de grootste.** Elke sessie begint nu leeg. |
| Visual DNA en harmonisatie | **Onbekend, en dat is veelzeggend.** Ik kon de canon niet vinden in de repository. Als ik hem niet kan vinden, kan geen enkele agent hem vinden. |

Zes van de zeven leveren voordeel op, en het voordeel komt in alle zes gevallen van hetzelfde:
**tekst die op de juiste plek staat.** Niet van een interface.

Dat is de eerlijke uitkomst van deze studie.

---

## 12. Wanneer we deze studie opnieuw openen

Niet op gevoel. Op bewijs. Toets over zes weken:

**Bouw de lezer (niveau B) alleen als alle drie waar zijn:**

1. de ledger bevat minstens vijftien echte regels, door gebruik ontstaan, niet in één keer
   ingevuld;
2. je hebt hem minstens drie keer geraadpleegd om "wat hadden we ook alweer besloten" te
   beantwoorden;
3. minstens één keer heeft de ledger een agent tegengehouden of bijgestuurd.

**Als één daarvan niet waar is: parkeer Kamer 5 definitief.** De ledger blijft dan gewoon staan als
een goed bestand, en dat is een prima uitkomst.

Punt 3 is de belangrijkste. Als de ledger nooit een sessie bijstuurt, is hij een dagboek en niet
de infrastructuur waarvoor deze studie hem houdt.

---

## 13. De visuele studie

> **Statusnotitie, toegevoegd 18 augustus 2026.** Deze visuele studie is gemaakt vóór de centrale
> canon beschikbaar was, en is visueel afgeleid uit deze repository. Zij geldt daarom **niet** als
> visuele richting en **niet** als canon. Zodra `ftrlabs-docs/03-ux/` de vastgestelde Visual DNA
> v1.0 en Visual North Star bevat, wordt de visuele uitwerking opnieuw gedaan vanuit die bron. Wat
> in deze studie standhoudt, is uitsluitend de informatiearchitectuur, en die is verder uitgewerkt
> in `TWEELAAGS-ARCHITECTUUR.md`.


Bij deze studie hoort één interactieve visuele studie, `atelier-study.html`. Zelfstandig bestand,
geen productie, geen server, geen echte data. Hij staat bewust niet in `public/`, zodat hij nergens
kan worden uitgeserveerd.

Hij bestaat om één vraag te beantwoorden die tekst niet kan beantwoorden: **voelt de rusttoestand
als bezit of als leegte?** Als het antwoord "leegte" is, klopt hoofdstuk 6 niet en vervalt daarmee
ook het argument voor de wallpaper.

De studie doorloopt negen momenten: rust, een vraag ontstaat, signalen verdichten, betekenis
ontstaat, er wordt gebouwd, bewijs wacht op oordeel, je besluit, bewijs verdicht, en de lijn komt
tot rust. De data is fictief maar afgeleid van de echte geschiedenis in deze repository, zodat de
toets uit hoofdstuk 11 ook visueel te maken is.

Het is een peiling, geen toezegging. Als hij overtuigt, verandert dat niets aan het advies in
hoofdstuk 10: bouw eerst de ledger.

---

## 14. Drie beslissingen

Meer dan drie zijn het er niet, en de andere twee volgen uit de eerste.

### Beslissing 1 · Bouwen we het substraat nu, en de kamer niet?

**Aanbeveling: ja.** Begin vandaag met de ledger (niveau A). Bouw Kamer 5 niet als kamer (niveau
D). Beslis over de lezer (niveau B) pas over zes weken, op de toets uit hoofdstuk 12.

Dit is de enige vorm waarin Kamer 5 de harde productregel uit hoofdstuk 11 haalt.

### Beslissing 2 · Waar leeft het geheugen?

Opties: in deze repository, of in een eigen `maculis-atelier`-repository.

**Aanbeveling: hier, in `docs/atelier/`, en pas splitsen wanneer een tweede repository hem echt
nodig heeft.** Reden: een agent leest wat in zijn eigen werkboom staat. Een aparte repository moet
elke sessie eerst worden aangehaakt, en dat is precies de drempel waardoor het niet gebeurt. Begin
waar het werk gebeurt. Splitsen kan altijd nog en kost dan een uur.

### Beslissing 3 · Wie mag schrijven?

Dit bepaalt of de ledger de eerste maand overleeft.

**Aanbeveling: agents schrijven waarneming, jij schrijft besluiten.**

- Claude Code mag aan het eind van een sessie **vraag**, **bewijs** en **bron** voorstellen.
- Alleen jij schrijft **besluit**. Nooit een agent, nooit automatisch.
- **onzekerheid** mag door beiden, want een agent die iets niet weet moet dat kunnen opschrijven.

Dit is dezelfde human-in-the-loop-discipline die de Communication Layer al hanteert: de AI stelt
voor, de mens besluit, en het besluit is de bron van waarheid. Het is bovendien de enige regel die
voorkomt dat de ledger volloopt met plausibel klinkende besluiten die je nooit genomen hebt.

---

## 15. Slot

De opdracht was niet om Kamer 5 te rechtvaardigen. Dus:

Het concept klopt. De diagnose in je opdracht klopt, met één correctie: het probleem is geheugen,
niet aandacht. Het bestaansrecht naast de Cockpit is aantoonbaar en het verschil is de klok en de
tegengestelde succesdefinitie.

En toch is mijn advies om de kamer niet te bouwen.

Wat je nodig hebt is geen ruimte. Het is een bestand, een gewoonte van twee minuten, en een regel
in `CLAUDE.md`. Dat kost je een middag en het begint direct terug te geven. De mooie donkere ruimte
mag daarna komen, of nooit, en dat maakt voor het bouwen van Maculis geen verschil.

De ruimte is het cadeau. Het geheugen is het werk.
