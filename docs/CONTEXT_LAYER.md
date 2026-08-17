# Maculis Context Layer (architectuurprincipe)

Status: V1 gevalideerd en afgerond voor Gesprekken (live getest tegen Claude Sonnet 5).
Reikwijdte: dit is een **Maculis-breed architectuurprincipe**, geen truc binnen Gesprekken.
Elke toekomstige AI-toepassing (Mijn Maculis, en verder) bouwt op deze fundering.

## De keten

```
available context  →  authorization/privacy  →  task relevance  →  model  →  human control
```

Vijf stappen, in deze volgorde, altijd:

1. **available context** — alle context die technisch beschikbaar is voor een relatie/taak
   (communicatie, relatie, bevestigde afspraken, voorkeuren, follow-ups, journey, ...).
2. **authorization/privacy** — wat een rol *mag* zien. Rol-scope en privacy. Dit is architectuur,
   geen promptregel. Lens PRIVATE en niet-toegestane bronnen worden hier verwijderd, vóór er iets
   een prompt kan bereiken.
3. **task relevance** — wat deze *specifieke taak* nodig heeft. Geautoriseerd is nog niet relevant.
   Deze poort houdt beschikbare-maar-irrelevante context weg.
4. **model** — de provider-neutrale modelcall krijgt uitsluitend geautoriseerde én taak-relevante
   context.
5. **human control** — het model levert een concept. De mens beoordeelt, verfijnt en verstuurt.
   Maculis verstuurt nooit zelf.

## Harde regels (vastgelegd)

- **Volgorde is vast: `authorizeContext` komt ALTIJD vóór `selectTaskRelevance`.**
  Autorisatie/privacy bepaalt eerst wat gebruikt *mag* worden; relevantie bepaalt daarna wat voor
  deze taak gebruikt *moet* worden. Relevantie draait dus nooit op niet-geautoriseerde context.

- **Relevantieselectie mag alleen weghouden, nooit toevoegen.**
  `selectTaskRelevance` kan uitsluitend beschikbare context terzijde leggen. Het kan geen bron,
  bevoegdheid of context toevoegen of ontsluiten en kan nooit langs de autorisatie/privacy-poort
  reiken. Er is geen algemene "AI mag alles uit memory kiezen"-route.

- **Commitments/afspraken zijn beschermd tegen onbedoeld wegfilteren.**
  Een `agreement` of `reminder` is een toezegging en wordt door de relevantie-poort **nooit**
  weggelaten (categorie `relationeel_commitment`). Een belofte gaat niet verloren door filtering.

- **Privacy/autorisatie wordt door relevantie nooit versoepeld.**
  De relevantie-poort maakt de autorisatie/privacy-poort niet zwakker; hij komt er strikt ná.

- **Menselijke goedkeuring blijft hard.**
  De AI levert een concept, nooit een verzending. `human control` is de laatste, verplichte stap.

## Categoriemodel van de relevantie-poort (memory)

| Categorie | Bron | Gedrag |
|---|---|---|
| `relationeel_commitment` | `agreement` / `reminder` | Toezegging. Altijd behouden. |
| `relationeel_communicatievorm` | een `preference` die de communicatievorm raakt (kanaal, toon) | Behouden; beïnvloedt aantoonbaar de vorm. |
| `direct_relevant` | een `fact` met aantoonbare link naar de taak (gedeeld inhoudswoord met laatste inbound + onderwerp) | Behouden, met het gedeelde woord vastgelegd. |
| `beschikbaar_irrelevant` | waar, bevestigd, toegestaan, maar geen aantoonbare link | Weggehouden. Niet meegenomen enkel omdat het waar/bevestigd/recent is. |
| (niet toegestaan) | privacy/rol-gate | Bereikt de relevantie-poort niet; al verwijderd in stap 2. |

## Waar dit leeft in de code

- `server/comm/ai/constitution.mjs` — gedeelde Constitution (systeemlaag) + rolcontext
  (`roleBrief`, `allowedSources`). De Constitution is de gedeelde DNA voor elke rol.
- `server/comm/ai/context-layer.mjs`:
  - `authorizeContext(ctx, { role })` — stap 2 (autorisatie/privacy). Verwijdert bronnen buiten
    `allowedSources`, Lens PRIVATE, en niet-bevestigd geheugen.
  - `selectTaskRelevance(ctx)` — stap 3 (taak-relevantie). Houdt alleen weg; rapporteert per item
    een categorie en de weggehouden items.
  - `assembleContext({ role, ctx })` — draait beide poorten in de vaste volgorde en levert de
    systeemlaag plus de geselecteerde werk-context, met wat autorisatie uitsloot en wat relevantie
    weghield.
  - `decideResponse(ctx)` — semantische taakbeslissing (REPLY_NEEDED / NO_REPLY_NEEDED /
    WAITING_FOR_THEM / ACTION_NEEDED / UNCERTAIN). Ongewijzigd door de relevantie-poort.
- `server/comm/ai/service.mjs` — `draftReply` en `reviseDraft` roepen beide `assembleContext` op
  dezelfde context aan, zodat het eerste concept en Warmer/Korter exact dezelfde geselecteerde
  taakcontext gebruiken. Een weggehouden bron kan niet bij een revise terugkomen.
- `server/comm/ai/provider.mjs` — provider-neutrale modelcall (stap 4). Vandaag Anthropic of een
  deterministische mock; geen vendor-koppeling in de laag zelf.

## Validatie en regressie

- Live gevalideerd tegen Claude Sonnet 5 op de preview: 7/7 response-decisions correct, afspraken
  behouden, irrelevante feiten weggehouden (o.a. de "verhuizing" in het afspraak-scenario, weg uit
  eerste concept, Warmer én Korter), privacy/autorisatie vóór de modelcall intact, menselijke
  goedkeuring intact, geen hallucinaties.
- Deterministische regressietests: `tests/comm-ai-context-layer.test.mjs` (de laag verandert het
  antwoord en dwingt toegang af) en `tests/comm-ai-relevance.test.mjs` (de relevantie-poort houdt
  commitments, dwingt aantoonbare relevantie voor feiten af, en autorisatie blijft vóór relevantie).
- Preview-only evaluatie-instrument: `server/cockpit/validation.mjs`, achter een admin-sessie +
  `PREVIEW_SEED`. Staat **standaard uit** (`COMM_AI_VALIDATION=0`), veroorzaakt nooit automatisch
  modelcalls of kosten, weigert te draaien tenzij de live provider actief is, en ruimt zijn eigen
  wegwerp-fixtures op. Bedoeld als regressie-/evaluatie-instrument, niet als productfunctionaliteit.

## Voor volgende toepassingen (o.a. Mijn Maculis)

Dezelfde keten geldt. Bijzondere aandacht bij Mijn Maculis: de harde grens
**PRIVATE → expliciete toestemming → SHARED**. PRIVATE-inhoud bereikt stap 2 nooit voor een rol die
er geen recht op heeft; SHARED bestaat pas na expliciete, vastgelegde toestemming. De Context Layer
dwingt dit af als architectuur (autorisatie/privacy vóór relevantie), niet als promptregel. Die
opdracht bestudeert eerst de bestaande Bible, Lens, website, Cockpit en Context Layer als één geheel
en volgt separaat.
