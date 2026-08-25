# Meldingen aan praktijkcoördinator en regiomanager

Status: **besloten, nog niet gebouwd.** Wachten tot het dashboard een paar weken draait, zodat de
drempels op echte cijfers gebaseerd zijn in plaats van op een aanname.

Besloten op 25 augustus 2026.

## Waarom wachten

De grens voor "krap" staat nu op meer dan zeven dagen wachten, of minder dan vijf vrije tijden in de
periode. Dat is een redelijke eerste gok, maar het is een gok. Meldingen sturen op een grens die nog
niet gevalideerd is, kost geloofwaardigheid die je daarna niet terugkrijgt.

Met twee tot vier weken metingen is te zien hoe vaak een locatie van status wisselt, en of die zeven
dagen bij deze organisatie hoog of laag zijn. Pas dan kloppen de meldingen.

## Kanaal

E-mail. Dit project heeft al een werkende mailkoppeling via Resend, iedereen heeft e-mail, en een
bericht blijft staan tot iemand er iets mee doet. Teams kan later, maar vraagt een webhook of een
app-registratie in de Microsoft omgeving en dus iemand met beheerrechten.

## Het ontwerp

Melden bij een **verandering**, niet bij een toestand. Een praktijk die drie weken krap staat mag geen
eenentwintig berichten opleveren, want dan leest niemand het derde nog.

| Wanneer | Aan wie |
| --- | --- |
| Van ruimte naar krap of geen ruimte | praktijkcoördinator en regiomanager |
| Van krap naar geen ruimte | praktijkcoördinator en regiomanager |
| Herstel naar ruimte | alleen de praktijkcoördinator, kort |
| Onveranderd krap of geen ruimte | niets |

Daarnaast één keer per week een overzicht aan de regiomanager met alles in zijn regio, ook wat
onveranderd is. Zo blijft een sluimerend probleem zichtbaar zonder dagelijkse ruis.

## Wat er nog moet komen

**De koppeling locatie naar personen.** Die hebben we niet. De API van Mijn Zorgtoegang geeft alleen
de praktijknaam en het adres, geen contactpersonen. Er is dus een lijst nodig vanuit TopzorgGroep,
per vestiging de naam en het e-mailadres van de praktijkcoördinator en de regiomanager. Dit project
kan al xlsx en csv inlezen.

Die lijst bevat persoonsgegevens. Hij hoort dus niet in de code en niet in git, maar op de
persistente schijf van de service, met dezelfde zorg als de testergegevens.

**Een geschiedenis van statussen.** Om een verandering te kunnen zien is de meting van gisteren nodig
naast die van vandaag. De opslag bewaart al een bestand per dag, dus dat is er zodra het dagelijks
draait.

## Voorwaarde

Dit hangt aan een dagelijkse meting die vanzelf draait. Zolang de meting handmatig gestart wordt,
komt er geen bruikbare reeks en dus ook geen onderbouwde drempel. De keuze over hosting gaat hier dus
aan vooraf.
