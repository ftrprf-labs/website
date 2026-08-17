# Scout discovery sources: research and recommendation

For the Growth/Lead colleague (Scout). This is the source research behind the generic multi-provider
discovery layer (`server/agents/providers/`). Scout stays the brain: normalisation, relation check,
evidence, reasoning, confidence, deduplication, attention decision and proposal live in Scout, not in
any vendor. A source only supplies raw, source-tagged observations.

Writing rule respected: no stylistic hyphens or dashes in prose.

## The four roles

- **DISCOVERY** who exists and who could be relevant (find new organisations/people).
- **SIGNALS** what is happening now that makes someone interesting (news, hiring, tenders, change).
- **ENRICHMENT** responsibly add to what we already know (firmographics, description, addresses).
- **VERIFICATION** can we check a claim, identity, organisation or contactability?

A source can play one or several roles. Scout combines roles: DISCOVERY finds a candidate, SIGNALS
explains why now, ENRICHMENT rounds out what we know, VERIFICATION keeps us honest.

## Source comparison (NL / BE / EU focus)

| Source | Gives | Role(s) | Access | Cost | Geo / relevance | Legal / privacy | Complexity | Dependency risk | Evidence we may keep |
|---|---|---|---|---|---|---|---|---|---|
| **KVK Handelsregister** (NL) | Official company identity, KVK number, address, SBI | DISCOVERY, ENRICHMENT, VERIFICATION | Official REST API, needs API key AND a Dutch registered entity | Approx EUR 6.40/month per key + EUR 0.02/query (search free) | NL authoritative | Public register; official terms; store fields, not bulk copies | Low | Low (official) | KVK number, name, address, status, retrieved_at, source=KVK |
| **KBO / BCE** (BE) | Official Belgian company identity, VAT, activity | DISCOVERY, ENRICHMENT, VERIFICATION | Free open-data download (no account); official web service EUR 50/2000 req; free public search page | Open data free; API paid | BE authoritative | Public register open data; free reuse | Medium (ingest open-data files) | Low (official) | Enterprise number, name, VAT, activity, retrieved_at, source=KBO |
| **TED** (EU tenders) | Public procurement notices, buyers, subjects | SIGNALS | Official REST API, anonymous read-only, no key | Free | EU incl. NL/BE | Public data | Low/medium (filter relevance) | Low (official) | Notice id, buyer, subject, date, url, source=TED |
| **Company website** | Positioning, hiring, news, propositions | SIGNALS, ENRICHMENT | Direct HTTPS, robots-respecting, no key | Free | Any | Public page; honour robots.txt; keep short snippets only | Low | None (the subject itself) | Title, description, section presence, url, retrieved_at |
| **News / RSS** | Press, announcements, changes | SIGNALS | Publisher RSS/Atom, mostly no key | Free | Any | Publisher intends syndication | Low/medium (feed discovery) | Low | Headline, link, date, source feed |
| **OpenCorporates** | Cross-jurisdiction company data | DISCOVERY, VERIFICATION | API key required | Approx GBP 2,250+/year, rate-limited; free only for public-benefit | Global | Licensed; attribution | Low | Medium (paid dependency) | Company number, jurisdiction, url |
| **Vendor enrichment** (Clearbit / People Data Labs / Apollo / Cognism) | Firmographics + person/contact data | ENRICHMENT, DISCOVERY | Paid API key | Paid, often per-record | Global, variable EU depth | PII-heavy; GDPR lawful basis + purpose needed; sourcing risk | Low | High (intelligence becomes the vendor) | Only what has a lawful basis; minimise |
| **LinkedIn / social** | People, roles, moves | SIGNALS, ENRICHMENT | No compliant API for this; scraping violates ToS | Not applicable | Global | Excluded for V1 (ToS + privacy) | Not applicable | Not applicable | Not stored |

Notes: pricing and terms above should be re-verified at the moment of commitment (they change). Free
third-party REST wrappers exist for KBO and TED, but they add a dependency and a trust question, so the
official open route is preferred.

## Recommended minimal combination for Scout V1

The smallest set with which Scout can genuinely discover something meaningful, not the most sources.

1. **VERIFICATION + DISCOVERY base = KVK (NL) + KBO/BCE (BE).** These give authoritative identity and
   deduplication anchors (KVK/enterprise number, VAT, domain), so a candidate is a real organisation and
   we can reliably check whether we already know it. KBO open data is free; KVK is the one paid piece and
   is cheap. This is the strongest, lowest-risk backbone for a NL/BE colleague and avoids vendor lock.
2. **SIGNALS (why now) = TED + company website.** TED (free, anonymous) surfaces public-sector
   opportunities. The company website (free, robots-respecting) surfaces positioning, hiring and news.
   Together they answer "waarom nu" without paid vendors.
3. **Deliberately NOT in V1:** OpenCorporates (expensive), vendor enrichment (paid, PII-heavy, lock-in),
   LinkedIn/social (ToS + privacy). Add only later, with a lawful basis and a clear need.

Rationale: identity/verification from official registers keeps the relational truth clean; free signal
sources give timeliness; Scout keeps all reasoning. No single vendor becomes Scout's intelligence.

## What is built now (credential-free, no live calls by default)

- The **generic multi-provider layer** (`providers/registry.mjs`): role model, provider registry, a
  normalising aggregator (`gatherExternalSignals`) that tags every observation by source and never lets
  a failing source break a run.
- The **website signal provider** (`providers/website.mjs`): credential-free, OFF by default
  (`SCOUT_WEBSITE_SIGNALS`), robots-respecting, single homepage read, short snippets, results treated as
  EXTERNAL observations. Deterministic and unit-tested with an injected fetch (no live network).
- Scout folds external observations into its evidence as their own kind (OBSERVATION with a source and
  url), distinct from our own FACT / INFERENCE / HYPOTHESIS, and lets them modestly raise confidence.

KVK, KBO/BCE and TED are wired as **documented seams** in the status board, not implemented, because they
are a provider decision (and KVK needs credentials).

## Stop points that need Lud (see the report back)

- **KVK**: needs an API key and a Dutch registered entity. Paid (cheap). A human account step.
- **KBO/BCE open data**: free, but bulk ingest is a product decision (where to store, how often to refresh).
- **TED**: free and credential-free, but choosing to switch on live external calls is a deliberate step.
- **Website signals**: ready and credential-free, but enabling live fetching (`SCOUT_WEBSITE_SIGNALS=1`)
  is likewise a deliberate "Scout now touches the external web" decision.

None of these are enabled in this build.
