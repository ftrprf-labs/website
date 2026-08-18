# Maculis Visual DNA — waar de canon staat

Het visuele DNA van Maculis wordt **niet** in deze repository vastgelegd en mag **nooit** uit
productcode worden gereconstrueerd. De bindende bron staat centraal:

| Wat | Waar |
|---|---|
| De canon | `ftrprf-labs/ftrlabs-docs` → `03-ux/principles/maculis-visual-dna.md` (`UX-VISUAL-DNA`, approved, v1.0) |
| De tokens | `ftrprf-labs/ftrlabs-docs` → `03-ux/specifications/maculis-tokens.css` en `.json` |
| Het visuele ijkpunt | `ftrprf-labs/ftrlabs-docs` → `03-ux/assets/maculis-visual-north-star.html` |
| Leesvolgorde en regels | `ftrprf-labs/ftrlabs-docs` → `03-ux/README.md` |

**`public/styles.css` en de inline styles in `public/workspace.html` en `public/comm.html` zijn geen
canon.** Ze beschrijven hoe deze omgeving vandaag toevallig gebouwd is, niet hoe het hoort. Wijkt
deze repository af van de canon, dan wint de canon en staat dit onderdeel op de lijst voor
harmonisatie. Leid hier dus geen design system uit af.

Bekende afwijkingen, al gepland, niet op eigen initiatief wijzigen: de easing in `styles.css` wijkt
een cijfer af van de canonieke curve, `workspace.html` en `comm.html` gebruiken neutraal grijze
hairlines en koele ink waar de canon koper en warme ink voorschrijft, en er is daar geen serif
terwijl de canon Newsreader voorschrijft.

Heb je geen toegang tot `ftrlabs-docs`, vraag er dan om. Begin niet met visueel werk zonder de canon
gelezen te hebben.

---

# Maculis Testerbeheer / Communication Layer — repo-instructies

## Permanente schrijfregel (publieksgerichte copy) — VERPLICHT

In alle publieksgerichte Maculis-copy worden **geen koppeltekens en geen gedachtestreepjes als
stijlmiddel** gebruikt. Dit geldt voor alle huidige en toekomstige werkzaamheden en voor alle
zichtbare teksten: Testerbeheer / Invitation Manager, Communication Layer, uitnodigings- en
e-mailteksten, CTA's, formulieren, foutmeldingen, onboarding, en elke andere zichtbare tekst.

Concreet:
- Gebruik nooit een spatie-gedachtestreepje-spatie (` — ` of ` – `) of een spatie-koppelteken-spatie
  (` - `) als pauze of stijlmiddel in zichtbare copy.
- Herschrijf zulke zinnen natuurlijk met een **punt, komma, dubbele punt of een nieuwe zin**.
- Controleer bij **iedere** wijziging ook de bestaande zichtbare copy die je aanraakt en verwijder
  dergelijke tekens daar meteen.

Uitzonderingen (alleen technisch noodzakelijke tekens, nooit als stijlmiddel):
- code, URL's, identifiers, bestandsnamen, HTML/CSS-attributen, JSON-sleutels;
- letterlijk geciteerde externe tekst (bijv. de body van een ontvangen e-mail);
- samenstellingen/spelling waar een koppelteken taalkundig verplicht is (bijv. "e-mail").
  Dat is geen stijlmiddel en blijft toegestaan.

Interne code-commentaren zijn geen publieksgerichte copy; de regel richt zich op zichtbare teksten.
Bij twijfel: kies de variant zonder streepje.

Deze regel is permanent en geldt ook voor toekomstige sessies en agents. Niet opnieuw om
bevestiging vragen.
