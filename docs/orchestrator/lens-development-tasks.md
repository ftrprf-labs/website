# Maculis Orchestrator — Lens Development Task Classes

> Duurzame governance voor lensontwikkeling via de Maculis Orchestrator. Hoort bij
> `docs/LENS_STRATEGY_MASTERPLAN.md` sectie 39 (AA in de opdracht).
>
> **Status:** RESEARCH ONLY / DESIGNED. Dit stuurt geen productiegedrag. Het definieert hoe
> toekomstige lensontwikkeling herhaalbaar en uitvoerbaar wordt, met gates.
> **Datumcontext:** 2026-08-15.
> Schrijfregel gerespecteerd: geen streepjes als stijlmiddel.

## Doel

Lensontwikkeling wordt geen ad-hoc bouwwerk maar een keten van task classes. Elke task heeft
gedefinieerde inputs, outputs, een gate en kwaliteitscriteria. De gate van een task blokkeert de
volgende tot de criteria gehaald zijn. Zo blijft de strengheid van de Reveal Engine (fail-closed,
SILENCE als succes, geen causale taal, provenance overal) bewaard door de hele pijplijn.

## De keten

```
LENS_RESEARCH
  → PROVIDER_RESEARCH
  → EVIDENCE_RESEARCH
  → DATA_SOURCE_ASSESSMENT
  → LENS_DESIGN
  → PROTOTYPE
  → SECURITY_REVIEW        (harde gate, escaleert naar mens)
  → PRIVACY_REVIEW         (harde gate, escaleert naar mens)
  → CONNECTOR_DESIGN
  → CONNECTOR_BUILD
  → EVALUATION
  → IMPLEMENTATION
  → PILOT
  → DEPLOYMENT             (harde gate, escaleert naar mens)
  → POST_PILOT_REVIEW
```

Level 1 en Level 2 lenzen (Outside In, Bring Your Data) slaan CONNECTOR_DESIGN en CONNECTOR_BUILD
over. Level 3 en 4 doorlopen de volledige keten.

## Gedeelde kwaliteitspoort (geldt voor elke task die de engine raakt)

1. De Reveal Gate wordt nooit verlaagd (engine §18). SILENCE blijft een succespad.
2. Geen hypothese als feit; AI-afgeleide items zijn `proposed` tot een mens bevestigt.
3. Geen causale taal in reveal-copy; de `defensible`-check en het `BOUNDED_LLM_CONTRACT` blijven gelden.
4. Provenance (`EvidenceRef`) reist mee tot in de reveal.
5. Consent fail-closed; geen data zonder aantoonbare grond.

---

## Task classes

### LENS_RESEARCH
- **Inputs:** domein, hypothese over de kern-relatie, doelgroep.
- **Outputs:** lens-hypothese, kandidaat evidence-families, verwachte reveal-vormen, Level 1 tot 4
  waarde-inschatting.
- **Gate:** is er een plausibele revealworthy kern-relatie die de ondernemer zelf zelden legt.
- **Kwaliteitscriteria:** minstens één concreet, niet-triviaal, hypothetisch reveal-voorbeeld;
  expliciete FACT/INFERENCE/HYPOTHESIS scheiding.

### PROVIDER_RESEARCH
- **Inputs:** de evidence-families uit LENS_RESEARCH.
- **Outputs:** per provider een brief (API, auth, sandbox, review-gate, data-diepte, webhooks,
  rate limits, kosten, effort, friction), met FACT/INFERENCE-labels en bron-URL's.
- **Gate:** bestaat er een haalbare, officiële bron (geen scraping) voor de vereiste evidence.
- **Kwaliteitscriteria:** primaire bronnen; een gewogen integration-attractiveness score.

### EVIDENCE_RESEARCH
- **Inputs:** kandidaat-bronnen.
- **Outputs:** per evidence-family: betrouwbaarheid, reproduceerbaarheid, deterministisch
  detecteerbaar of AI-duiding nodig, false-positive risico, revealworthy versus triviaal voorbeeld.
- **Gate:** haalt de sterkste evidence-family de L3-vloer.
- **Kwaliteitscriteria:** advies BUILD/RESEARCH/WAIT/REJECT per family, gemotiveerd.

### DATA_SOURCE_ASSESSMENT
- **Inputs:** de gekozen bronnen.
- **Outputs:** privacy-impact, juridische aandachtspunten, kosten, latency, vendor risk, benodigde
  consent.
- **Gate:** geen onoverkomelijk privacy-, juridisch- of kostenbezwaar.
- **Kwaliteitscriteria:** expliciete HUMAN ACTION-lijst voor alles wat een mens vereist.

### LENS_DESIGN
- **Inputs:** goedgekeurde evidence en bronnen.
- **Outputs:** de domein-configuratie boven de gedeelde engine: EvidenceExtractors,
  RelationDetectors, domein-wallpaper, verboden frasering, Gate-config (nooit onder de vloer).
- **Gate:** is de lens grotendeels configuratie boven de gedeelde engine (geen engine-fork).
- **Kwaliteitscriteria:** de vier lens-onderdelen zijn gescheiden van de gedeelde engine.

### PROTOTYPE
- **Inputs:** het lens-ontwerp.
- **Outputs:** een niet-productief prototype met fixtures (geen echte klantdata), dat reveals en
  SILENCE laat zien op testdata.
- **Gate:** produceert het prototype herkenbare, gegronde reveals én correcte SILENCE.
- **Kwaliteitscriteria:** geen productiegedrag gewijzigd; MOCK-annotaties gelabeld.

### SECURITY_REVIEW (harde gate)
- **Inputs:** prototype en beoogde connector.
- **Outputs:** security-oordeel (credential storage, token-refresh, webhook-signatures,
  error-classificatie, tenant-isolatie).
- **Gate:** escaleert naar een mens; geen productie zonder menselijke goedkeuring.
- **Kwaliteitscriteria:** geen secrets in code/log/docs; fail-closed startup gerespecteerd.

### PRIVACY_REVIEW (harde gate)
- **Inputs:** prototype en databronnen.
- **Outputs:** privacy-oordeel (minimalisatie, consent, retentie, verwijdering, geen export van
  echte klantdata naar externe research-systemen).
- **Gate:** escaleert naar een mens; geen productie zonder menselijke goedkeuring.
- **Kwaliteitscriteria:** privacy-conversaties uitgesloten van AI-context; provenance verwijderbaar.

### CONNECTOR_DESIGN (Level 3 en 4)
- **Inputs:** de gekozen provider.
- **Outputs:** connector-ontwerp op de generieke laag (registry, OAuth, scopes, credential storage,
  token refresh, rate limits, retries, backoff, webhooks, idempotency, incremental/full sync,
  health, consent, withdrawal, deletion, provenance, versies, sandbox, fixtures, observability,
  error-classificatie).
- **Gate:** poll-first waar de provider geen webhooks heeft; per-tenant rate budget.
- **Kwaliteitscriteria:** sandbox en fixtures aanwezig; geen connector zonder lens die hem nodig heeft.

### CONNECTOR_BUILD (Level 3 en 4)
- **Inputs:** het connector-ontwerp.
- **Outputs:** een werkende connector tegen sandbox/fixtures, nog niet productie-geactiveerd.
- **Gate:** groene tests tegen sandbox; geen echte accounts (HUMAN GATE voor activatie).
- **Kwaliteitscriteria:** consent-withdrawal en deletion getest.

### EVALUATION
- **Inputs:** prototype of connector plus testdata.
- **Outputs:** WOW Quality Score per reveal-vorm, false-positive inschatting, SILENCE-correctheid.
- **Gate:** herkenning en non-trivialiteit boven de drempel; correct-maar-oninteressant is
  onvoldoende.
- **Kwaliteitscriteria:** hypothetische voorbeelden expliciet gemarkeerd.

### IMPLEMENTATION
- **Inputs:** geëvalueerd ontwerp.
- **Outputs:** productie-waardige lenscode op de gedeelde engine.
- **Gate:** de Reveal Gate is niet verlaagd; alle gedeelde kwaliteitspoort-eisen gehaald.
- **Kwaliteitscriteria:** tests groen; geen PII/secrets in logs; schrijfregel gerespecteerd.

### PILOT
- **Inputs:** de geïmplementeerde lens.
- **Outputs:** pilot-resultaten (recognition, false-positive, engagement, deeper exploration,
  drop-off, kwalitatieve feedback, willingness to continue).
- **Gate:** kill-criteria uit het pilot-ontwerp (masterplan sectie 35).
- **Kwaliteitscriteria:** echte gebruikers; de lopende First Five pilot wordt niet vervuild.

### DEPLOYMENT (harde gate)
- **Inputs:** een geslaagde pilot.
- **Outputs:** productie-activatie.
- **Gate:** escaleert naar een mens; alle HARD GATES (betaalde accounts, productie-API-activatie,
  consent-beleid, DNS) blijven menselijk.
- **Kwaliteitscriteria:** rollback-pad aanwezig; geen stille live-zetting voor echte gebruikers.

### POST_PILOT_REVIEW
- **Inputs:** pilot- en productie-uitkomsten.
- **Outputs:** leerpunten, update van de prioritering, voorstel voor de volgende lens of verdieping.
- **Gate:** de leerwaarde is vastgelegd (niet in een chat verdwenen).
- **Kwaliteitscriteria:** Relationship Intelligence en het beslismodel bijgewerkt; de anti-roadmap
  herzien.

---

## Verankering in bestaande principes

Deze task-classes hergebruiken bewust de discipline die al in de codebase leeft: de fail-closed
Reveal Gate, de proposed/confirmed provenance van Relationship Memory, de consent fail-closed gate,
de provider-abstractie van de Communication Layer, en de "geen PII/secrets in logs"-regel. De
Orchestrator voegt geen nieuwe soepelheid toe; hij maakt de bestaande strengheid herhaalbaar.
