# De Vijfde Kamer, technische route

Deze verkenning komt bewust ná het ontwerp. Zij kiest geen technologie vooruitlopend op de
experience, en bouwt geen integratie die de ontwerpstudie niet nodig heeft.

Leidend principe uit het ontwerp: **er komen geen vijf Maculis-appjes die om aandacht concurreren.**
Eén kamer, één renderlaag, meerdere aanwezigheden.

---

## 1. De architectonische kern

Het ontwerp lost het probleem van "wallpaper plus screensaver plus cockpit worden drie producten"
niet met techniek op, maar conceptueel. Drie dingen vallen weg zodra het ontwerp klopt:

**Er is geen screensaver-product.** Idle betekent in dit DNA uitademen en stoppen, niet iets anders
tonen. Een kamer die bij inactiviteit tot rust komt en dan het scherm normaal laat slapen, heeft
geen tweede artefact nodig. Het scheelt een volledige macOS-screensaverbundel, en dat is niet
alleen werk maar ook een tweede plek waar de grammatica uit elkaar kan lopen.

**Er is geen menubalk-item en geen notificatiecentrum.** De kamer spreekt uitsluitend waar de kamer
is. Ligt zij onder vensters, dan wacht de mededeling. Dat is niet een gebrek maar precies het
ontwerp: onderbreken is duur en zeldzaam. Dit scheelt een statusitem, een badge-model en een tweede
copy-oppervlak.

**Er is geen aparte startpagina en geen aparte app.** Wat een browserstartpagina of een lokale
webapp zou zijn, is in dit ontwerp geen tweede plek maar een **tweede dichtheid van dezelfde kamer**:
hetzelfde veld, hetzelfde lichtplafond, alleen omhoog gedraaid omdat ik nu bewust kijk. In de studie
is dat de aandachtige blik.

Wat overblijft is dus: **één renderlaag, twee dichtheden, één gastheer.**

```
                 ┌──────────────────────────────────────┐
                 │  de kamer (web canvas)               │
                 │  veld, licht, taal, één werkwoord    │
                 └──────────────────────────────────────┘
                     ▲                        ▲
        rustige dichtheid            aandachtige dichtheid
     (bureaubladniveau venster)    (fullscreen of tabblad)
                     ▲
                 ┌──────────────────────────────────────┐
                 │  gastheer (klein native omhulsel)    │
                 │  vensterniveau, idle, energie,       │
                 │  meerdere schermen                   │
                 └──────────────────────────────────────┘
                     ▲
                 ┌──────────────────────────────────────┐
                 │  toestandsbron                       │
                 │  afgeleide punten, geen inventaris   │
                 └──────────────────────────────────────┘
```

---

## 2. Nu lokaal realiseerbaar

Zonder enige backendarchitectuur, met fictieve of lokaal opgeslagen toestand:

- **De volledige renderlaag.** Veld, drift, lichtplafond, bezonken grond, verbinding, taal,
  reduced motion. Dat is wat de studie nu al bewijst.
- **De aandachtige dichtheid**, als lokale pagina of fullscreen venster.
- **De dagboog**, voor zover die van klepgedrag en inactiviteit afhangt.
- **De rusttoestand**, die is per definitie datavrij.

Wat hiervoor nodig is aan native gastheer, is klein en scherp begrensd. Precies vier
verantwoordelijkheden, en niets meer:

| Verantwoordelijkheid | Waarom native | Risico |
|---|---|---|
| Venster op bureaubladniveau, achter iconen en vensters | Een browser kan niet achter het bureaublad staan. Dit is de enige harde reden dat er überhaupt native code is. | Apple's vensterniveaus zijn niet formeel gedocumenteerd voor dit gebruik. **Te verifiëren op echte hardware.** |
| Inactiviteit waarnemen | De uitademing moet starten op systeeminactiviteit, niet op muisbeweging binnen één venster. | Vereist een systeem-API voor idle-tijd. Te verifiëren welke variant zonder extra rechten werkt. |
| Energie | De renderlus moet stoppen zodra de kamer volledig bedekt is, en op accu terugschakelen. Anders is een permanent bureaublad onverantwoord. | Direct af te leiden uit DNA GAP 1: geen beweging zonder toeschouwer. Het ontwerp maakt dit makkelijk in plaats van moeilijk. |
| Meerdere schermen en spaces | Eén kamer, niet vier kopieën die uit de pas lopen. | Eén gedeelde toestand, meerdere weergaven. Alleen het scherm met de aandacht rendert vol. |

**Aanbeveling:** een zeer klein native omhulsel dat een webweergave host. Alles wat betekenis draagt
blijft web, zodat er nooit twee implementaties van de grammatica ontstaan. Native doet uitsluitend
wat web niet kan.

**Statisch bureaubladbestand als tussenstap.** Een gerenderde stilstaande grond als gewone wallpaper
is vandaag mogelijk zonder één regel native code. Dat geeft alleen de rusttoestand, zonder leven en
zonder taal. Bruikbaar om de leefbaarheid van de grond over dagen te toetsen voordat er iets
gebouwd wordt. Dit is de goedkoopste echte test die er is, en ik zou daarmee beginnen.

---

## 3. Vereist Maculis-data

Hier is de studie concreet, want de onderlaag bestaat al in deze repository.

`server/comm/attention.mjs` levert `attentionOverview(tenantId)`: tenant-scoped, afgeleid, nooit
dubbel opgeslagen, met een menselijk leeswatermerk dat alleen verspringt wanneer een mens een
gesprek werkelijk opent. In `docs/BUILD_LOG.md` is bovendien vastgelegd dat deze primitieven
bewust zijn gebouwd om later door een hogere laag geconsumeerd te worden. Dat is precies wat Kamer 5
zou doen.

De vier categorieën van hoofdstuk 5 tegen wat vandaag bestaat:

| Categorie | Bestaande bron | Oordeel |
|---|---|---|
| Iemand wacht op mij | `NEEDS_ACTION`, `REPLY_READY`, `NEW`, `UNREAD` uit `attentionOverview` | **Vandaag afleidbaar.** Wel met een extra drempel: Kamer 5 mag niet elk ongelezen bericht tot stilstand brengen, want dan is hij de Cockpit. Nodig is een grens, bijvoorbeeld wachttijd of expliciet toegezegd antwoord. |
| Er is iets stuk | `DELIVERY_PROBLEM`, gevoed door de delivery-webhooks | **Vandaag afleidbaar.** Dit is de schoonste categorie, want de bron is extern verifieerbaar en voldoet dus meteen aan drempel 1. |
| Iets dat onzeker was, staat nu vast | geen bron | **Ontbreekt.** Vereist een expliciete registratie van epistemische overgang: iets was een vermoeden en is nu bevestigd. Dat is een Lens-onderwerp, niet een Communication-onderwerp, en valt buiten de vastgelegde scope van de Communication Layer. |
| Er sluit vandaag iets | geen bron | **Ontbreekt.** Vereist een notie van een venster dat sluit. Vandaag nergens vastgelegd. |

**Belangrijke architectonische opmerking.** Kamer 5 mag nooit een tweede administratie krijgen. Hij
consumeert afgeleide toestand en houdt zelf niets bij, met precies één uitzondering: **het
onderbrekingsbudget**. Dat is een eigenschap van mijn aandacht, niet van het materiaal, en heeft
dus nergens anders een thuis. Dat is de enige lokale state die Kamer 5 mag bezitten.

**Scopegrens.** In `docs/BUILD_LOG.md` staat vastgelegd dat Reveal Engine, Lens 1 en 2 en de Future
Cockpit-architectuur buiten de Communication-workstream vallen. De twee ontbrekende categorieën
horen daar thuis. Deze studie bouwt daar niets voor en stelt niets voor dat die grens overschrijdt.

---

## 4. Vereist toekomstige integraties

Agenda, persoonlijke e-mail, relatiebronnen, verplichtingen buiten Maculis.

**Aanbeveling: nu niet, en niet vanwege techniek.** Zodra mijn agenda binnenkomt, houden de vier
categorieën op verdedigbaar te zijn. "Iemand wacht op mij" wordt dan ook een vergadering, en daarna
is er geen principiële reden meer om iets buiten te sluiten. Dan is het een persoonlijk dashboard
met Maculis-kleuren, en dat is precies wat de opdracht verbiedt.

De volgorde die ik zou aanhouden:

1. Eerst de twee bestaande categorieën in de echte kamer, maanden lang, op echte data.
2. Meten of stilte werkelijk de normaaltoestand is. Zo niet, dan zijn de drempels te laag en is
   uitbreiden precies verkeerd.
3. Pas daarna eventueel één externe bron toevoegen, en alleen als die een categorie **vult** die al
   verdedigd is, nooit als die een nieuwe categorie **introduceert**.

---

## 5. Native macOS versus web

| Onderdeel | Web volstaat | Native nodig | Waarom |
|---|---|---|---|
| Veld, drift, licht, verbinding | ja | nee | Canvas is ruim voldoende voor tientallen punten met trage beweging. |
| Taal en typografie | ja | nee | En web houdt de grammatica op één plek. |
| Reduced motion | ja | nee | Systeeminstelling is in web direct leesbaar. |
| Aandachtige dichtheid | ja | nee | Fullscreen venster of tabblad. |
| Bureaubladniveau | nee | **ja** | De enige harde reden voor native code. |
| Systeeminactiviteit | nee | **ja** | Web kent alleen inactiviteit binnen het eigen venster. |
| Energie en bedekking | nee | **ja** | Renderen stoppen als niemand kijkt. |
| Meerdere schermen | nee | **ja** | Eén kamer, meerdere weergaven. |
| Onderbreken | ja | nee | En dat is een ontwerpkeuze, geen beperking: er is geen systeemnotificatie in dit ontwerp. |

**Conclusie: de kamer is web, het huis is native.** Vier native verantwoordelijkheden, geen enkele
daarvan raakt de grammatica. Dat is de kleinst mogelijke native oppervlakte waarmee het ontwerp
klopt, en het is precies de grens waarop een tweede implementatie van het DNA voorkomen wordt.

---

## 6. Wat ik nu niet zou bouwen

- Elke integratie die de ontwerpstudie niet nodig heeft.
- Een screensaverbundel.
- Een menubalk-item.
- Een instellingenscherm. Als deze kamer instellingen nodig heeft, klopt de selectie niet.
- Een tweede toestandsopslag naast `attentionOverview`.
- Synchronisatie tussen apparaten. Dit is per definitie de kamer van één MacBook.

---

## 7. Volgorde die ik zou aanhouden

1. **Statische grond als wallpaper.** Nul code. Toetst de leefbaarheid van de rusttoestand over
   dagen, wat de moeilijkste test is en tegelijk de goedkoopste.
2. **De aandachtige dichtheid als lokale pagina** met fictieve toestand. Toetst taal, drempels en
   het ene werkwoord.
3. **De echte twee categorieën** aansluiten op `attentionOverview`, nog steeds in dezelfde lokale
   pagina. Vanaf hier is het echt.
4. **Het native omhulsel** met de vier verantwoordelijkheden. Pas hier woont de kamer werkelijk op
   het bureaublad.
5. **Meten.** Hoeveel procent van de tijd is het stil, hoe vaak werd er onderbroken, hoe vaak was
   dat terecht.
6. Pas daarna eventueel de ontbrekende twee categorieën, en die horen in de Lens-workstream.

Stap 1 tot 3 zijn vandaag mogelijk. Stap 4 is klein maar vereist verificatie op echte hardware.
Stap 5 bepaalt of stap 6 überhaupt mag.
