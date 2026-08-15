# Maculis Lens Strategy Masterplan

> A durable work document for the next generation of Maculis lenses, to be used after the First Five
> pilot. It is deliberately comprehensive. It is grounded in the actual codebase (the frozen Reveal
> Engine in `maculis-first-five.`, the Communication and Relationship Layer in `website`, the
> governance SSoT in `ftrlabs-docs`) and in current, sourced research (see `research/`). It separates
> facts, assumptions, and hypotheses, and it gives pushback where the obvious answer is wrong.
>
> Companion documents (read alongside this one):
> `01-lens-architecture.md`, `02-connector-architecture.md`, `03-prioritization-model.md`,
> `04-orchestrator-playbook.md`, and the research artifacts in `research/`.
>
> House rule respected throughout: no stylistic hyphens or dashes in visible copy, including example
> reveals.

---

## 1. Executive synthesis

Maculis is not building dashboards. It is building lenses. A lens makes visible something an
entrepreneur under-sees, underestimates, misreads, or fails to connect to other signals. The pilot,
First Five, has already proven the hard part in code: a frozen Reveal Engine that turns evidence into
at most one thing worth saying, and is willing to say nothing. That engine, and the discipline it
encodes (evidence is not insight, silence is a first-class success, no claim without provenance, no
causality invented), is the single most valuable asset for the entire roadmap.

The market confirms the opportunity from the outside. Competitors have poured capital into the
evidence layer (clean, real-time, reconciled, connected data) and left the insight layer empty for
SMB owners. Dashboards co-display signals; almost nobody cross-interprets them. Two prior attempts at
owner-facing insight (Bilbeo, Fluidly) proved the idea seductive but fragile, because insight is hard
to make trustworthy. Maculis's frozen gate is precisely the antidote to the failure mode that sank
them.

The core strategic recommendation, derived from an explicit weighted model (`03-prioritisation-
model.md`) and argued in section 32:

- Keep deepening Lens 1 (the website lens) continuously and in parallel, without letting it become a
  report. This is the highest-feasibility work and it keeps the current lens alive.
- Build Lens 2 as an outside-in cross-lens: the Reputation and Reception Lens. It preserves the
  zero-integration magic that makes Maculis feel like a revelation, it proves cross-lens reveals
  cheaply, and it earns the trust that later lenses need.
- Build Lens 3 as the Finance Lens, entered through Bring Your Data (file upload) before any ERP
  integration. Finance is the most valuable destination and the strongest moat, but building it
  second would front-load the product's highest privacy and security risk before the pilot has shown
  owners will hand over financial data.
- Build Lens 4 as the Dependency and Resilience Lens, because by then the Finance connector and
  Relationship Intelligence exist, which is exactly the evidence it needs.

This is the pushback the brief asked for: Finance is not Lens 2, despite being the most valuable lens.

The rest of this document develops the analysis, the lens universe, the two deep dives, the
architecture, the cross-lens and GrowBrain and Relationship Intelligence connections, privacy and
security, the economics, the competition, the ranking, the anti-roadmap, the pilot strategy, and the
roadmaps, ending with concrete recommendations for Lens 2, 3, and 4.

---

## 2. The current Maculis world (what is actually built)

Facts, from repository inspection.

Three repositories hold the current world:

- `maculis-first-five.`: the Journey and the Reveal Engine. The engine (`ENGINE_VERSION
  maculis-reveal-0.2.0`) is frozen and ported verbatim. The live layer (`LIVE_PIPELINE_VERSION
  maculis-live-0.14.x`) fetches a real website, extracts grounded claims, and calls the engine
  unchanged. It already carries additive evidence families beyond the core: Technical Signals,
  Beveiliging (security headers), First Impression (a warmth thermometer), Story of the Site.
- `website`: Testerbeheer (the Invitation Manager) plus the Communication and Relationship Layer. It
  holds the permanent Contact and Organization identity model, the Relationship Workspace (the
  relationship is the product object), an AI-first omnichannel communication layer with a bounded
  Relationship Context Engine, consent that is fail-closed, and Relationship Memory (human-confirmed
  facts and agreements). Pass the Lens, the first organic growth loop, is live.
- `ftrlabs-docs`: the governance Single Source of Truth for the broader FTRLABS platform (North Star,
  twenty Architecture Principles, Glossary, ADRs, decision log). Important finding: it does not yet
  mention Maculis, lenses, GrowBrain, or Relationship Intelligence at all. The lens vocabulary lives
  only in code and build logs. Closing that gap is a governance action (see `04-orchestrator-
  playbook.md`).

The engine's shape (facts from `src/engine/model.ts` and neighbours):

- Evidence carries a confidence level L0 to L4.
- Observations are grounded statements with a kind and verbatim evidence.
- Relations are tensions between observations, in exactly four families: CONTRADICTION,
  TELLING_ABSENCE, MISCAST, DRIFT. These four families are domain agnostic (see section 13).
- A candidate must pass a seven-check Gate before it can surface: evidence floor (at least L3), not
  already stated by the owner, specific, non-generic, defensible (no causal or recommendation
  language, no single-data-point cross-lens), meaningful, and attention-worthy.
- The outcome is one of REVEAL, SILENCE, INSUFFICIENT, FAILURE. Silence is designed and valued.
- A bounded LLM may only pick among gate-passed candidates or return null. It may not introduce facts
  or construct causality.
- Recognition captures the owner's yes / partly / no and updates novelty to confirmed-known or
  confirmed-new.

The First Five lens itself contains four sub-perspectives (`Lens` enum): zichtbaarheid (visibility),
toestroom (inflow), verbondenheid (connectedness), waarde (value). These are lenses within the
website lens, not the whole lens taxonomy.

The pilot's decisive learning (fact, from `docs/ux-observations-next-round.md`): when First
Impression, Story of the Site, and Observations are all stacked on one screen, the feeling shifts
from "Maculis shows me something" to "Maculis makes me read a report." This is the most important UX
finding for the whole roadmap and it shapes the shared presentation contract (section 17 and 18).

---

## 3. Deepening the current lens without filling it with triviality

The brief asks how to increase the sight within the current website lens later, without stuffing it
with trivial signals. The engine already stages several additive evidence families (technical,
security, first impression, story). The question is not what can we add, it is what earns a place
above the gate.

Method: rank candidate evidence families by added insight value, and be explicit about what stays
trivial. Each family below is assessed for whether it can be objectively obtained, whether its
combinations can be revealworthy, what is likely to stay trivial, what can be deterministic, where AI
adds semantic value, and where human context is needed. The full outside-in evidence catalogue with
sources is in `research/marketing-and-outside-in-evidence.md`.

Highest added value (surface, when they cross with an existing claim):

- Reputation reception. Public review rating, count, and recency (Places aggregate) crossed with the
  website's own promise. This is the seed of Lens 2 and the strongest single addition. Revealworthy
  because it is a genuine cross-surface contradiction: the brand claims X, the public experience says
  Y. Evidence is public. AI adds value in reading the promise; the reception is largely deterministic.
- Findability reality. Search Console impressions and position crossed with an established, trusted
  business (domain age, review base). Old and trusted but nearly invisible in search is a real reveal.
  Note: this needs the owner to connect Search Console, so it belongs to the connected level, not
  outside-in. Outside-in can only infer thin-footprint from sitemap size and indexation proxies.
- Identity consistency. The registered name and address (KVK), the website, and the Google profile
  disagreeing. A fractured identity cancels local SEO and confuses customers. Fully deterministic from
  three authoritative sources. High confidence, genuinely surprising to owners.
- Trust and security signals crossed with the brand promise. No HSTS, weak security headers, a
  near-expiry certificate, trackers firing before consent, on a site whose brand claims care and
  professionalism. Deterministic to read; revealworthy only when it contradicts a stated promise,
  otherwise it is a technical footnote.

Medium value (context, rarely a headline on their own):

- Performance and Core Web Vitals. High value only when crossed with earned demand (ranking and
  impressions) or ad spend. Alone, your site is slow is trivial. Note the CrUX coverage gap: most
  Dutch SMB sites lack field data, so this often degrades to lab data, which weakens any real-users
  claim (assumption, from research).
- Accessibility. Automated checks catch only 30 to 40 percent of issues, so treat as presence of
  gross failures, not a compliance verdict. Context, not a reveal.
- Structured data completeness. Useful mainly inside the identity-consistency and reputation-reach
  reveals, not on its own.
- Content concentration. A large sitemap with traffic on only a few pages is revealworthy, but needs
  connected analytics to establish.

Likely to stay trivial (keep as background, never a headline): a missing meta description, a valid
SSL certificate, not being on TikTok, a long title tag, a generic performance score. These are true
and obvious. Their only value is as supporting detail inside a paired reveal.

The rule that keeps the current lens from becoming a report is the same rule the whole architecture
enforces: an added evidence family is allowed to speak only when it participates in a relation that
clears the gate. Everything else is available on deepening, never pushed on first contact. The
progressive-disclosure UX round the pilot already scoped (one discovery at a time) is the delivery
mechanism.

Recommendation for the current lens: do not broaden it into a general website audit. Add exactly the
families that create cross-surface reveals (reputation reception, identity consistency, trust-versus-
promise), keep the rest as deepening evidence, and ship the progressive-disclosure beats so the lens
stays a revelation rather than a report.

---

## 4. The full lens taxonomy

A map of the lens universe, organised by the entrepreneur question each answers. This is a vertical
of candidates, not a build list. Selection and sequencing come later (sections 23 and 32).

Function lenses (a single business function):
- Positioning and brand (the current lens, Lens 1).
- Marketing and demand.
- Sales and pipeline.
- Finance (cash, margin, concentration).
- People and organisation.
- Operations and delivery.
- Pricing.

Reception and outside-world lenses (how the world sees and receives the business):
- Reputation and reception (reviews, findability, trust).
- Employer brand and recruitment signals.
- Competitive positioning and drift.

Relationship and cross-function lenses (the strongest Maculis territory):
- Promise versus experience (brand claim vs customer reception).
- Reach versus traction (marketing grows, commercial does not).
- Growth quality (acquisition up, retention down).
- Cash versus profit (profit on paper, no room to move).
- Capacity and productivity (headcount or revenue vs capacity).
- Dependency and resilience (customer, supplier, owner concentration).

Future and resilience lenses (the owner's blind spots about tomorrow):
- Transferability and business value (how sellable and owner-independent is this).
- Digital and AI readiness (is the business ready for what it is investing in).
- Risk and continuity (single points of failure across customers, suppliers, tools, people).

The most valuable lenses are rarely a single function. They are relationships between functions. The
taxonomy exists so that the cross-function reveals (section 14) have named parents to draw
observations from.

---

## 5. Candidate lens definition template

Every serious candidate is defined against this template (from the brief). Filled definitions for the
top candidates follow; the deep dives (sections 6 and 7) expand Finance and Marketing further.

Fields: name and working name; entrepreneur question; target group; primary problem; hidden truth to
surface; key evidence families; possible data sources; required connections; possibilities without
connections; possible reveals; revealworthiness criteria; reliability; false-positive risk; privacy
risk; security risk; historical data needed; minimum data; AI role; deterministic role; human role;
UX concept; first wow moment; deepening; action perspective; connection to other lenses; connection to
Relationship Intelligence; connection to GrowBrain; implementation complexity; time to first value;
commercial value; technical dependencies; pilot options; measurable success criteria.

### 5.1 Reputation and Reception Lens (working name: Buitenkant, the outside view)

- Entrepreneur question: how does the outside world actually receive my business, and does it match
  what I think I project.
- Target group: any SMB with a website and a public presence. Same reach as Lens 1.
- Primary problem: owners see their own brand from the inside and cannot feel the gap between what
  they promise and what the public experiences and finds.
- Hidden truth: the promise-experience gap. The brand claims a strength that public reception,
  findability, or trust signals quietly contradict.
- Key evidence families: brand promise (from the site, reusing Lens 1 extraction), public review
  reception (rating, count, recency), findability footprint, identity consistency (KVK vs site vs
  profile), trust and security signals.
- Data sources: website (already fetched), Google Places aggregate, DNS/RDAP, security headers, KVK
  registry, PageSpeed. All Level 1 outside-in.
- Required connections: none for the core reveal. Search Console and GA4 upgrade it at the connected
  level.
- Possibilities without connections: the primary reveal (promise vs reception) is fully outside-in.
- Possible reveals (hypothetical examples): "Je site belooft persoonlijke aandacht als je grootste
  kracht. Je publieke reviews noemen vooral snelheid en prijs, en bijna nooit aandacht." Or: "Je bent
  al vijftien jaar gevestigd en goed beoordeeld, maar je bent bijna onvindbaar voor wie je nog niet
  kent."
- Revealworthiness criteria: the gap must be specific (a named claimed strength), not sector
  wallpaper, and corroborated across at least two surfaces (site plus reviews, or site plus registry).
- Reliability: high for identity consistency and review aggregate; medium for review-theme reading
  (only five reviews via the Places API, so themes are a sample).
- False-positive risk: medium. Reviews are a sample; the lens must phrase reception as what the
  public surface shows, never as the truth about the business. The gate's defensible check forbids
  overreach.
- Privacy risk: low (public data about a business, not persons).
- Security risk: low.
- Historical data needed: none for the first reveal; recency needs a small window.
- Minimum data: a live website and a findable public profile.
- AI role: read the brand promise and cluster review themes (bounded, from gate-passed candidates).
- Deterministic role: review aggregate, identity match, security and DNS reads.
- Human role: the owner confirms or rejects the gap (recognition), which is the highest-value signal.
- UX concept: one beat, the gap, with the site quote on one side and the public signal on the other.
- First wow moment: seeing your own promise placed next to how the outside actually receives you.
- Deepening: findability, identity consistency, trust signals, each as a further beat on demand.
- Action perspective: a natural GrowBrain handoff (close the gap, or make the strength visible).
- Connection to other lenses: extends Lens 1; feeds the promise side of cross-lens reveals.
- Relationship Intelligence: recognition of the gap is a strong relationship signal.
- GrowBrain: closing a promise-experience gap is a clean experiment (make the real strength visible,
  measure review themes and enquiry quality).
- Implementation complexity: low to medium (reuses `src/live` plus a few outside-in connectors).
- Time to first value: immediate (no login).
- Commercial value: medium to high, and it is the trust builder for Finance.
- Technical dependencies: the Level 1 connectors in the connector plane.
- Pilot options: run alongside Lens 1 on the same testers; compare recognition rates.
- Measurable success: recognition-yes on the gap, and deepening rate.

### 5.2 Finance Lens (working name: Kasbeeld, the cash view). Deep dive in section 6.

- Entrepreneur question: is my business as financially healthy as the top-line makes it feel, and what
  relationship am I not seeing.
- Target group: SMB owners with real revenue and cost structure; strongest for owner-managed
  businesses past survival stage.
- Primary problem: owners read revenue and bank balance and miss the relationships (cash versus
  profit, concentration, margin drift) that determine resilience.
- Hidden truth: the relationships between financial signals, not the figures themselves. Revenue can
  grow while cash and freedom to move shrink.
- Key evidence families: revenue development, gross and net margin, cash and cash conversion,
  receivables and payables, working capital, fixed and personnel costs, recurring revenue, customer
  and revenue concentration, seasonality, runway.
- Data sources: uploaded P&L, balance, trial balance, aged receivables/payables, bank export
  (Level 2); Exact/Moneybird/e-Boekhouden/SnelStart and an Open Banking aggregator (Level 3). See
  `research/finance-integration-landscape.md`.
- Required connections: none at Level 2 (upload); accounting or bank connection at Level 3.
- Possibilities without connections: strong. A trial balance plus an aged-receivables export is
  enough for the flagship reveals.
- Possible reveals (hypothetical): "Je omzet groeide dit jaar, maar je vrij beschikbare kas daalde.
  Het verschil zit in je debiteuren: klanten betalen gemiddeld drie weken later dan een jaar geleden."
  Or: "Eén klant is dit jaar van 18 naar 34 procent van je omzet gegroeid. Je groei en je risico
  komen nu uit dezelfde bron."
- Revealworthiness criteria: the relation must rest on hard ledger signals (born at L3 or L4) and must
  not be something the owner already states.
- Reliability: high (financial data is hard evidence), which is why Finance reaches a defensible
  reveal faster than softer domains.
- False-positive risk: low on the arithmetic, medium on interpretation (a concentration rise may be
  intentional). Phrase as a relationship and a question, never a verdict.
- Privacy risk: medium to high (financial data). Security risk: high (sensitive data at rest).
- Historical data needed: at least two comparable periods for any development or drift reveal.
- Minimum data: one recent P&L and balance, or a trial balance, plus aged receivables.
- AI role: narrate the relationship in plain language from gate-passed candidates; classify uploaded
  files. Deterministic role: all ratios and comparisons. Human role: confirm intent behind a
  relationship (for example, is the concentration deliberate).
- UX concept: one relationship per beat, always two figures in tension, never a full statement dump.
- First wow moment: seeing two numbers you track separately placed in a relationship you had not made.
- Deepening: from the flagship relation into the contributing detail (which customers, which costs).
- Action perspective: the strongest GrowBrain handoff of any lens (collections, pricing, cost, mix).
- Connection to other lenses: the finance backbone for Dependency and Resilience and for Reach versus
  Traction.
- Relationship Intelligence: financial context (confirmed, bounded) enriches the customer picture.
- GrowBrain: pricing, collections, and concentration experiments with measurable outcomes.
- Implementation complexity: medium (file ingestion plus detectors) to high (connected plus review).
- Time to first value: after one upload.
- Commercial value: highest of any lens; the clearest willingness to pay.
- Technical dependencies: file-ingestion connector, later Exact/Open Banking connectors.
- Pilot options: Bring Your Data with a trial balance from a handful of friendly owners.
- Measurable success: recognition-yes on the flagship relations, and willingness to upload a second
  period.

### 5.3 Dependency and Resilience Lens (working name: Afhankelijkheid). Sketch; full definition when it is Lens 4.

- Entrepreneur question: how much of my business quietly depends on a single customer, supplier,
  person, or on me, and how transferable is it.
- Hidden truth: growth can increase fragility. The business grows while everything routes through one
  point of failure.
- Key evidence families: customer and supplier concentration (finance and invoice data), owner
  dependency (who is on every thread, from Relationship Intelligence), key-person and process
  dependency, transferability and business value.
- Reveals (hypothetical): "Je omzet groeit, maar bijna elke klantrelatie loopt via jou persoonlijk.
  Als jij een maand wegvalt, valt de omzet mee weg." Or: "Twee leveranciers leveren samen tachtig
  procent van wat je inkoopt. Je marge hangt aan hun voorwaarden."
- Depends on: the Finance connector and Relationship Intelligence, which is why it is Lens 4, not
  earlier.
- Privacy and security risk: medium to high (combines financial and relationship data).
- Commercial value: high and emotionally powerful (it touches the owner's future and the value of what
  they built).

---

## 6. Finance deep dive

Finance deserves its own analysis because the value is not a financial dashboard. It is the set of
financial relationships that genuinely give an owner insight. The competitor research confirms the
white space: the market has automated the production of clean financial numbers and left the
cross-function meaning empty (`research/competitor-and-differentiation.md`).

### 6.1 The relationships that are revealworthy

Not deviations from a budget, relationships between signals. The strongest, with the evidence each
needs and how reliably it can be established:

1. Revenue up, cash down. Compare revenue development to free cash development across two periods; if
   they diverge, locate the cause in receivables days, inventory, or repayment. Evidence: P&L plus
   balance plus aged receivables. Reliability: high. This is the flagship Finance reveal and a
   textbook CONTRADICTION across the cash and profit sub-lenses.
2. Profit on paper, no room to move. Positive net result with thin or negative working capital and a
   short runway. Evidence: P&L plus balance plus cash. Reliability: high.
3. Customer concentration rising with growth. One customer's share of revenue climbing over time.
   Evidence: invoice-level or receivables data across periods. Reliability: high with invoice data,
   medium from aggregate. This is where growth and risk share a source, and it bridges into the
   Dependency lens.
4. Margin drift under growing revenue. Revenue up while gross margin percent falls. Evidence: P&L
   detail across periods. Reliability: high. Often a silent pricing or cost-mix problem.
5. Price versus margin. Selling more at a margin that no longer covers the true cost to serve.
   Evidence: revenue mix plus cost allocation. Reliability: medium (needs cost-to-serve, often
   partial). A facet, not a headline, until data supports it.
6. Personnel growth versus revenue. Headcount cost rising faster than revenue or gross profit.
   Evidence: personnel cost line across periods. Reliability: high on the ratio; the meaning needs the
   owner (was it a deliberate investment).
7. Seasonality underestimated. The cash trough is deeper or later than the owner plans for. Evidence:
   monthly cash across at least one full cycle. Reliability: medium (needs history).
8. Marketing spend versus new revenue. Commercial cost rising without matching new revenue. Evidence:
   marketing and sales cost lines plus new-customer revenue. Reliability: medium; strongest as a
   cross-lens reveal with the Marketing lens (section 14).

The rule that keeps these honest is the relation strength ladder (section 14 and `01-lens-
architecture.md`): Maculis may state a correlation or a temporal sequence, may pose a plausible
hypothesis as a question, and confirms a relationship only on owner recognition or two independent
signals. It never asserts causality from observation alone. The frozen gate's defensible check
already forbids causal and recommendation language, so Finance inherits the discipline for free.

### 6.2 Progressive finance without an ERP implementation

The owner must not need to implement an ERP before Maculis can say something smart. The disclosure
ladder for Finance:

- Level 1 Outside In. Very limited for finance (no public ledger). What exists: KVK legal form and
  sector, filed annual accounts where available for larger entities, and sector benchmarks from CBS to
  frame a later ratio. Honest position: Finance is the one lens where Level 1 is thin, which is another
  reason it is not Lens 2.
- Level 2 Bring Your Data. The real entry point. Upload a trial balance, a P&L and balance, an aged
  receivables and payables list, or a bank export. This alone powers reveals 1 to 4 above. File
  ingestion reuses the importer already shipped in Testerbeheer (CSV/XLSX parse, mapping, validation,
  safe preview) generalised to finance files and structured PDFs (`02-connector-architecture.md`).
- Level 3 Connected. Exact Online first (highest leverage), Moneybird for a clean low-friction second,
  then e-Boekhouden and SnelStart for reach, Twinfield for the accountant channel, plus one Open
  Banking aggregator for bank ground truth. Full matrix, gates, and costs in
  `research/finance-integration-landscape.md`.
- Level 4 Continuous. The sync engine turns periodic reads into change detection: margin starting to
  slip, a cash buffer thinning, a customer becoming dominant. This is where Finance becomes a standing
  early-warning lens rather than a one-time look.

The progressive-disclosure design is: minimal input first, first value, then voluntarily more data,
then optionally a connection. Wonder before trust before connection.

### 6.3 Integration landscape (summary; full detail and sources in research)

Facts from `research/finance-integration-landscape.md`. NL small-business bookkeeping volume is led by
Exact Online, e-Boekhouden.nl, SnelStart, and Moneybird, with AFAS and Visma strong alternatives and
Twinfield and Yuki dominating the accountant channel. Build order (integration attractiveness):

- Tier 1: Exact Online (dominant, full object model, OAuth2, app review needed), Moneybird (best
  developer experience, self-serve), one Open Banking aggregator (Enable Banking or Tink, since
  GoCardless Bank Account Data closed new signups in mid 2025).
- Tier 2: e-Boekhouden.nl (largest micro-SMB base, effectively free API), SnelStart (250k+ users,
  quirky auth plus certification), Twinfield (accountant channel, SOAP, certify for full rate budget).
- Tier 3: Mollie then Stripe (payment-scoped reconciliation), Yuki and Visma (niche).
- Tier 4: AFAS (heavy per-customer config) and Unit4 (enterprise) only on demand.

Regulatory tailwind: PSD3/PSR provisional agreement reached late 2025, and FIDA (open finance) is
advancing, both expanding the data surface in Maculis's favour over 2026 to 2027. Nothing to act on
now; the aggregator-plus-AISP route remains correct near term.

Caveats to carry: no hard NL market-share percentages were available from free sources (validate with
a paid study before locking roadmap); Twinfield credit numbers were from portal content, not the live
page; app review and certification (Exact, Twinfield, SnelStart, Visma) are real production gates that
add weeks and are HUMAN ACTIONS.

---

## 7. Marketing deep dive

A Marketing Lens must go beyond website analysis, but the honest design is outside-in first and
connected second, because the connected marketing APIs carry heavy approval gates. Full API matrix,
outside-in catalogue, and twelve worked cross-signal relationships with sources are in
`research/marketing-and-outside-in-evidence.md`.

### 7.1 The connected sources and their real cost

Facts. Easiest to light up: Google Search Console and GA4 (standard OAuth, free, no bespoke approval,
usable against the owner's own property). High friction but high value: Google Business Profile
(mandatory allowlisting, 60-day and domain-match gate, new projects start at zero quota), Meta (app
review plus business verification), LinkedIn (partner gating with no guaranteed timeline), Google Ads
(developer token approval). For a young product these approvals, not the coding, are the schedule
risk. Meta and LinkedIn approvals are use-case reviews: every requested permission must map to a
visible screen and a data-retention story, so the connect UX must be designed before applying (these
are HUMAN ACTIONS).

### 7.2 The zero-integration Marketing Lens

The stronger near-term design asks the same question the whole product asks: which relationship
between signals tells the owner something they had not seen, using only public evidence. The
revealworthy outside-in relationships (from research Part C), which are the substance of Lens 2:

- Reputation capital that never reaches search (strong GBP rating, no schema, inconsistent NAP).
- A fractured identity across the web (GBP link, domain, and KVK name/address disagree).
- Old and invisible (long-standing, trusted, nearly absent from organic search).
- A pretty site with a soft underbelly (good SEO, weak security headers or near-expiry cert).
- Marketing to the spam folder (active email marketing while DMARC is unenforced and SPF weak).
- A widening reputation gap the owner cannot feel (competitors accumulate more and more recent reviews
  while the owner sits at a respectable but static rating).

Each is a relationship between two public signals the owner never looks at together. Each is
buildable outside-in. Together they are the Reputation and Reception Lens (Lens 2).

### 7.3 The connected Marketing Lens

The connected upgrade adds the relationships that need the owner's own data: earned demand that leaks
at the door (GSC impressions and position versus CTR and mobile performance), paying for traffic the
site wastes (ad spend versus landing performance and pixels), social effort with no owned payoff (Meta
insights versus GA4 referral), content bloat (sitemap versus page-level traffic), and buying clicks
you already own (brand-term ad spend versus organic rank). These are strong, but they sit behind
OAuth and, for GBP and ads, behind approvals, which is why the connected Marketing Lens is a later
upgrade to Lens 2, not the entry point.

---

## 8. Other top candidates (compact)

- Reach versus Traction (cross-lens: Marketing plus Finance). Marketing reach and audience grow while
  commercial traction (new customers, new revenue) does not. Revealworthy, needs both a marketing
  signal and a finance signal, so it arrives once Lens 2 and Lens 3 exist.
- Growth Quality (Finance plus relationship). Acquisition up while retention worsens. Needs revenue and
  customer-tenure data. A facet that emerges from Finance plus Relationship Intelligence.
- Capacity and Productivity. Revenue versus capacity, or headcount versus productivity. Needs
  personnel and revenue data; better as a facet of Finance and Dependency than a standalone lens.
- Employer Brand and Recruitment. Vacancies and hiring signals versus the brand promise. Buildable
  partly outside-in (public vacancies), medium revealworthiness, a candidate for a later outside-in
  mini-lens.

---

## 9. Unexpected new lens concepts, then judged strictly

The brief asks for at least ten non-obvious concepts, then a strict judgement, preferring two
genuinely good ideas over twenty names.

The candidates:
1. Promise-Experience Gap (brand claim vs public reception). Cross-surface contradiction, outside-in.
2. Silent Concentration (one customer or supplier creeping toward dominance).
3. Owner-in-the-Middle (bus factor: everything routes through the owner).
4. Cash Shadow (profit on paper, no room to move).
5. Reach without Traction (marketing grows, commercial does not).
6. Ghost Offer (you still advertise what you stopped delivering; DRIFT at company level).
7. Trust Debt (security and privacy signals versus the trust the brand claims).
8. Findability Decay (you were findable, now slipping; continuous).
9. Hiring-Signal Gap (your vacancies contradict your brand or employer promise).
10. Transferability and Business Value (how sellable and owner-independent is this).
11. Capacity Ceiling (you are maxed and cannot see it).
12. Quote-to-Cash Friction (how much revenue stalls between quote and payment).

Strict judgement. Most of these are facets of the lenses already named, or are too data-hungry for
their reveal value. Two stand out as genuinely strong and under-built anywhere in the market:

- Transferability and Business Value (concept 10, the heart of the Dependency and Resilience Lens).
  No product builds this for owners. It is emotionally enormous (it touches the value of what someone
  built and their freedom to step back), and it is feasible from finance plus relationship plus
  organisation signals Maculis will already hold. This is the differentiated Lens 4.
- Promise-Experience Gap (concept 1, the heart of the Reputation and Reception Lens). A true cross-lens
  reveal, buildable outside-in and cheaply, and exactly the empty white space the competitor research
  identifies. This is Lens 2.

The rest are kept as facets or deepening evidence, not as headline lenses. Ghost Offer (concept 6) is
worth a note: it is company-level DRIFT, the same family the engine already detects at page level, so
it is cheap to prototype and could become a small deepening beat.

---

## 10. Integration landscape and API matrix

The full, sourced API matrices live in the research artifacts and are the durable reference:
- Accounting, banking, and payments: `research/finance-integration-landscape.md`.
- Marketing and outside-in evidence: `research/marketing-and-outside-in-evidence.md`.

Both separate facts from assumptions, flag items to verify against primary contracts, and give a
build-order recommendation. The connector plane that consumes them is `02-connector-architecture.md`.

---

## 11. Zero-integration-first strategy (the four levels)

A core design principle. For every lens, define how much value Maculis delivers before the owner
connects a single account. The goal sequence: first wonder, then trust, then depth, only then consent
for more data.

- Level 1 Outside In. Public or directly available evidence, no login. The current lens lives here.
  Reputation and Reception (Lens 2) lives here. Finance barely reaches here, which is a reason it is
  not Lens 2.
- Level 2 Bring Your Data. The owner provides files or a few key figures. The real entry point for
  Finance. File ingestion reuses the shipped importer.
- Level 3 Connected. Live connections give continuous, richer sight. Finance via Exact/Moneybird/Open
  Banking; Marketing via GSC/GA4/GBP.
- Level 4 Continuous Intelligence. Maculis combines lenses and detects change, relationships, and
  opportunities over time. This is where the moat compounds (section 21).

The fourth level is worth building because it turns a set of one-time looks into a standing
intelligence that notices margin slipping, a promise drifting, a customer becoming dominant. It is
also where notification noise is the risk, so it ships last and with the same gate discipline (section
14 on continuous lenses).

---

## 12. Connector architecture (summary)

Full spec in `02-connector-architecture.md`. The essence: one shared connector plane so no lens
rebuilds OAuth, token refresh, webhooks, retries, rate limits, or consent. Components: provider
registry (capabilities), credential vault (per-tenant secrets), OAuth lifecycle, consent ledger,
incremental sync engine, rate limiter, retry and backoff, signature-verified webhook receiver,
normalizer to canonical objects, provenance stamper, and health and observability. The Communication
Layer's provider abstraction (`server/comm/providers`) is the proven precedent. Build the shared
foundation first, then prioritise providers; activate none during design or pilot work.

---

## 13. Lens architecture (summary)

Full spec in `01-lens-architecture.md`. The essence: a lens is not a new product, it is configuration
and domain logic on a shared engine. The engine already exists, frozen and tested. A lens supplies
evidence sources, an `observe` function (evidence to grounded observations), a `relate` function
(detectors emitting the four families), a presentation spec, disclosure levels, and a policy. It
inherits the gate, the selector, silence, provenance, recognition, cross-lens reasoning, the bounded
LLM seam, versioning, and observability. The four relation families (CONTRADICTION, TELLING_ABSENCE,
MISCAST, DRIFT) are domain agnostic and map cleanly to finance, marketing, and people. The one
enabling refactor is promoting the fixed website `Lens` enum to an open lens registry; it is small,
mechanical, and is the recommended first engineering task of the 30-day roadmap.

---

## 14. Cross-lens intelligence

Cross-lens reveals are the strongest differentiator Maculis can build, and the competitor research
confirms the space is effectively empty for owners. The engine already has the mechanism: a relation
whose observations span more than one registered lens is a cross-lens relation, and the gate already
rewards cross-lens corroboration.

The rule that keeps it honest is the relation strength ladder. Maculis may signal a relationship
without inventing causality:

1. Correlation. Two signals move together. Statable with care.
2. Temporal coincidence. One shifted, then the other. Statable as sequence, never as cause.
3. Plausible hypothesis. A mechanism the owner can confirm or reject. Always a question.
4. Confirmed relationship. The owner recognised it, or two independent lenses agree at L3 or higher.
5. Causal claim. Requires an intervention and a measured result. Exists only after a GrowBrain
   experiment, never from observation.

The flagship cross-lens reveals, each with the lenses it draws from:
- Revenue grows but cash does not (Finance internal: cash vs profit sub-lenses). Two hard ledger
  signals, safe and striking.
- Brand promises what customers do not experience (Reputation and Reception: website vs reviews).
- Revenue up while one-customer concentration dangerously rises (Finance vs Dependency).
- Marketing reach grows but commercial traction does not (Marketing vs Finance).
- Headcount grows without productivity (Finance vs People).
- The business grows but everything depends on the owner (Dependency, using Relationship Intelligence).

A cross-lens reveal surfaces only when the contributing observations are each at least L3, or one is
L4, and it is phrased at ladder level 1 to 4, never level 5. This is what lets Maculis be surprising
without being reckless, which is exactly where Bilbeo's correlation firehose failed.

---

## 15. Relationship Intelligence

Lens use is not a side effect; it is how the customer picture gets richer. The Relationship Layer
already exists in `website` (Contact and Organization identity, Relationship Workspace, Relationship
Memory, bounded AI Context Engine). Lenses feed it.

What lens use contributes: which lens was viewed, which reveal was recognised, which reveal was
rejected, which deepening was chosen, which data was voluntarily connected, which questions were
asked, which experiments were started, which results were achieved, which themes matter to this owner.

The discipline, inherited from the existing Relationship Memory design (human-confirmed, bounded):
separate strictly between event data (what happened), a derived hypothesis (what it might mean), a
proposed memory (a candidate fact), and a confirmed Relationship Memory (human-approved). The AI may
never write speculation as fact into Relationship Memory. A recognised reveal (recognition-yes on a
cross-lens relation) is a strong candidate memory; a rejected reveal is equally valuable and is
recorded as such. This is the same fail-closed stance the Communication Layer already enforces.

The compounding effect: over time, Relationship Intelligence knows which relationships this owner
cares about, which reveals land, and which lens to reach for next. That is a moat no dashboard can
copy, because it is earned through recognised revelation, not through connecting more data sources.

---

## 16. GrowBrain connection

Maculis must not end at "this is what we see." A reveal should be able to become understanding, then
prioritisation, then experiment, then action, then learning, then measurement again. GrowBrain is the
action layer for that. In the FTRLABS governance vocabulary this aligns with the AI Growth Coach
module; the handoff should be recorded so the two names reconcile (`04-orchestrator-playbook.md`).

Per lens, define: when Maculis has seen enough to hand off; when the owner mainly needs more evidence
first; when an experiment is the logical next step; when GrowBrain becomes relevant; what context
Maculis passes; what GrowBrain returns; how results flow back into Relationship Intelligence; and how
to prevent GrowBrain from feeling like a sales button after every observation.

The rule that keeps the handoff earned: GrowBrain is offered only after a recognised reveal (the owner
said yes, or asked to go deeper), never automatically after every observation. The handoff carries the
grounded relation and its evidence, not a recommendation, so the experiment is the owner's choice. A
GrowBrain experiment is the only path to a level-5 causal claim (section 14): it intervenes and
measures, and the measured result flows back as a confirmed relationship into Relationship
Intelligence. This closes the loop from reveal to learning without turning every reveal into a pitch.

Finance has the strongest GrowBrain handoffs (collections, pricing, cost, mix, concentration), which
is part of why it is the highest-value lens. Reputation and Reception has clean ones too (make the
real strength visible, then measure review themes and enquiry quality).

---

## 17. The wow model

Define, per lens, the explicit wow moment. Not "here are your numbers," but "I had not seen it that
way myself." A wow moment must be evidence-based, understandable, personally relevant, non-trivial,
not overblown, must open curiosity, and must make deepening feel logical.

The engine already produces this structure: waarneming (grounded observation with a verbatim quote or
exact figure and its source), the tension (why it is remarkable), the meaning (why it touches a
decision), and the question (what you might now want to understand). The four questions the brief
names are literally the shared presentation contract (`01-lens-architecture.md`).

Example wow moments (clearly hypothetical, house-style copy):
- Lens 1 (built): "Je noemt persoonlijke aandacht je grootste kracht, maar op je hele site staat er
  geen enkel voorbeeld van. Je bewijst overal snelheid, nergens aandacht."
- Lens 2 (Reputation and Reception): "Je site belooft aandacht. Je klanten schrijven vooral over
  snelheid en prijs. De kracht die je claimt, is niet de kracht die je klanten benoemen."
- Lens 3 (Finance): "Je omzet groeide, je kas kromp. Het verschil zit in je debiteuren."
- Lens 4 (Dependency): "Je groeit, en toch loopt bijna elke klant via jou persoonlijk."

The discipline that protects the wow: it must clear the gate. A wow that a skeptic waves away is
suppressed. Silence is preferred over a weak wow. This is why the pilot's report-versus-revelation
learning matters: even a true observation, stacked among five others, stops being a wow.

---

## 18. The seduction model

Design, per lens, how someone moves from the first insight to wanting to look further, without funnel
tricks, artificial urgency, or dark patterns. The pull must come from relevance.

The sequence: reveal, recognition, curiosity, second evidence, deepening, possible connection to
another lens, action perspective, invitation to the next step. The engine and the scoped
progressive-disclosure UX already support this: one discovery at a time, evidence on demand, adjacent
lenses suggested only when a relation genuinely connects.

The single most important seduction rule comes straight from the pilot: deliver beats, not pages. The
moment Maculis stacks everything on one screen, it becomes a report and the pull dies. Relevance
seduces; completeness repels. This is the direct antidote to the documented dashboard fatigue that the
competitor research identifies as the market's core failure mode.

---

## 19. Privacy

Privacy by design is an FTRLABS Architecture Principle and is already patterned in the codebase
(opaque tokens, data minimisation, fail-closed consent, privacy conversations excluded from AI
context, no PII in logs). For the lens roadmap:

- Level 1 outside-in uses only public data about a business, not persons, so it carries the lowest
  privacy load and is the safe first level for every lens.
- Level 2 and 3 finance and connected marketing introduce personal and financial data. Each requires a
  DPIA before it ships, a data class (Public, Internal, Confidential, Restricted per the FTRLABS data
  classification policy), a lawful basis, purpose-scoped and revocable consent, and retention limits.
  Withdrawal deletes derived data and stops sync (connector plane, section 12).
- The bounded AI Context Engine stance carries over: the engine sees only the evidence bundle for the
  current lens run, tagged with provenance, never a database dump.
- Financial and health-adjacent data is sensitive; the primary-healthcare segment in the FTRLABS North
  Star raises the bar further and argues for conservative defaults.

Register finance and connected-marketing processing in the ROPA and open the DPIAs as HUMAN ACTIONS
before those levels ship (`04-orchestrator-playbook.md`).

---

## 20. Security

Security by design, already patterned (fail-closed startup, HSTS and security headers on all
responses, secrets only in env, constant-time admin comparison, CSP that blocks external resource
leaks). For the lens roadmap:

- The connector plane centralises the security-sensitive machinery (credential vault, signature-
  verified webhooks, tenant isolation) so it is threat-modelled once, not per lens.
- Connected finance data is the highest-value target and must be encrypted at rest, tenant-isolated,
  and minimised (store canonical objects and derived observations, not raw dumps longer than needed).
- Every connector ships with a mock adapter and fixtures, and no production connector is activated
  during design or pilot work. Activation is a separate, reviewed human decision.
- The security signals Maculis reads about others (HSTS, headers, certificate) are also a mirror:
  Maculis must exceed the standard it reveals in others.

---

## 21. Economic analysis (per lens, made visible not fixed)

The brief asks to make economic consequences visible without fixing pricing. Per lens, the cost and
value drivers:

- API costs. Bookkeeping and marketing APIs are mostly free at the API level; the cost is the
  customer's own subscription and the approval or certification effort (a one-time engineering cost,
  weeks per gated provider). Open Banking aggregators are now paid per connection or per call
  (GoCardless free route closed). KVK is cheap (EUR 6.40/month per key plus EUR 0.02/query). Places and
  PageSpeed have free tiers with ceilings to watch (research [V] items).
- AI costs. Bounded and modest: the engine limits the AI to selecting among gate-passed candidates and
  narrating, not open-ended generation. Cost scales with runs, not with data volume, because the gate
  keeps output small. The deterministic-first design (offline fallback already exists) caps AI spend.
- Storage and compute. Canonical objects and traces per tenant. Continuous lenses (Level 4) add sync
  and change-detection compute; keep it event-driven, not polling, to control cost.
- Provider fees, support, onboarding friction, maintenance, vendor risk. Highest for connected finance
  (certification, per-customer config for AFAS, SOAP maintenance for Twinfield and e-Boekhouden). This
  is a further reason to enter Finance via low-friction file upload and Moneybird before the heavy
  connectors.
- Willingness to pay and packaging (make visible, do not fix). Finance has the clearest willingness to
  pay; Reputation and Reception is a strong low-cost trust builder and a natural top of funnel;
  continuous intelligence (Level 4) is the recurring-value anchor. A plausible packaging shape,
  recorded as an option not a decision: outside-in lenses as the free or low-cost entry (wonder),
  Bring Your Data finance as the first paid tier (depth), continuous multi-lens intelligence as the
  retained tier (standing value). No price is set here.

The economic through-line: the zero-integration-first sequence is also the cost-efficient sequence.
Outside-in lenses are cheap to run and build trust; connected finance is where cost and value both
rise; continuous intelligence is where recurring value justifies the standing cost.

---

## 22. Competition and differentiation (summary)

Full analysis and sources in `research/competitor-and-differentiation.md`. The market has automated
the evidence layer (Agicap for cash, Digits/Truewind/Rillet for books, Exact/Bizcuit/Yuki for NL
plumbing, Peppol for invoice streams) and left the insight layer empty for SMB owners. Dashboards
(Databox, Klipfolio, Geckoboard) co-display signals without connecting them. Runway is the closest
philosophical cousin but targets finance teams within a finance model. Silverfin's Talking is the
nearest incumbent motion toward revelation but is accountant-facing. Bilbeo tried automated
correlation-mining for owners and did not durably survive; Fluidly's AI-cashflow brand became a
lending funnel.

Real differentiation for Maculis: cross-lens reveals as the product (not a feature), owner-facing (not
accountant-facing), surprise and what-you-under-see as the framing (the antidote to dashboard fatigue),
and riding NL/EU structured-data tailwinds (Exact, Peppol, KVK, CBS). Illusory or at-risk
differentiation: the AI CFO label (crowding), "we connect all your data" (table stakes), "actionable
insights from your KPIs" (the veneer tier), and correlation-mining as the core engine (Bilbeo's trap).
The moat is trust and restraint, which is exactly what the frozen gate enforces.

---

## 23. Prioritisation model and ranking

Full model in `03-prioritization-model.md`. Eighteen weighted criteria across value (40),
feasibility (35), risk (10), and strategy (15). Scored ranking:

1. Reputation and Reception Lens, 85.2
2. Finance Lens (Bring Your Data), 81.0
3. Deepen Lens 1 (parallel enrichment), 76.0
4. Dependency and Resilience Lens, 70.6 (tie with Marketing Connected)

Finance wins the value cluster outright but Reputation and Reception wins overall on feasibility, zero-
integration value, time to first value, low risk, and learning value. The model therefore recommends
Reputation and Reception as Lens 2 and Finance as Lens 3.

---

## 24. Anti-roadmap (what not to build, and when)

As important as the roadmap. Hold these back, with reasons:

- Standalone AI-Readiness / Data-Maturity Lens. Tends toward a survey or scorecard, weak hard evidence,
  easily replicated by generic AI, low revealworthiness. High risk of cheap noise. Hold.
- Standalone Cybersecurity Audit Lens. Competes with mature scanners, tool-like not revelatory, low
  recurrent engagement. Fold the trust and security signals into Reputation and Reception instead.
- Standalone People / HR Lens. Needs payroll data (high friction, near-zero outside-in), medium
  revealworthiness alone. Deliver productivity as a facet of Finance and Dependency, not a lens.
- Sustainability / ESG Lens. Data-poor for SMB, high effort, low current willingness to pay, too early.
  Hold.
- Any generic benchmarking-only lens (your ratio vs sector, and nothing more). This is a dashboard tile,
  not a reveal. Benchmarks are context inside a reveal, never the headline.
- A general website audit expansion of Lens 1. The temptation to add every technical signal turns the
  reveal into a report, which the pilot already showed is the failure mode. Add only cross-surface
  reveal families; keep the rest as deepening evidence.
- A correlation-firehose cross-lens engine. Bilbeo's cautionary tale. Cross-lens reveals must be
  curated, gated, and phrased at ladder levels 1 to 4, never a raw correlation dump.
- Any connected lens whose approval or certification lead time exceeds its near-term reveal value (for
  example GBP or Meta or LinkedIn connected marketing as an entry point). Enter these as later upgrades,
  after the outside-in version has proven the reveal.

The unifying anti-pattern: anything that is easy but trivial, dashboard-like, dependent on poor data,
too privacy-heavy for its value, or easily replaced by generic AI. A trivial lens that is easy to build
is not a quick win. It is cheap noise.

---

## 25. Pilot strategy

Validate every new lens before building it wide. Per lens define: hypothesis, target group, minimal
prototype, evidence, wow criterion, false-positive criterion, recognition, use, deepening, drop-off,
qualitative feedback, and next action.

The single most important measurement is recognition. The engine already captures yes / partly / no and
turns a "no, I had not seen that" into confirmed-new. That is the empirical definition of a reveal that
landed. The pilot protocol:

1. Prototype the lens at its lowest disclosure level (outside-in, or a single upload for Finance).
2. Run it on a small set of friendly owners alongside the current lens.
3. Measure: recognition rate (especially confirmed-new), wow-criterion hits, false-positive rate,
   deepening rate, and drop-off.
4. Collect qualitative feedback on whether the reveal was correct-but-boring or genuinely surprising.
5. Decide: continue, iterate, or kill.

The kill rule the brief insists on: kill a lens when owners find it correct but uninteresting.
Technical correctness alone is insufficient. A lens that clears the gate but does not move recognition
is a dashboard in disguise. This rule is what keeps the roadmap honest and is the reason the model
weights revealworthiness and wow so heavily.

---

## 26. Roadmap A: next 30 days (alongside the First Five pilot)

No change to the current First Five production flow. Preparation and low-risk building only.

- Promote the lens vocabulary and this strategy into the governance SSoT (glossary, Product Bible entry,
  ADRs, decision-log entry, roadmap themes) via reviewed PRs (`04-orchestrator-playbook.md`). This
  removes the dependency on this chat and these scattered logs. HUMAN ACTION for the `ftrlabs-docs` PRs.
- Engineering: the lens-registry refactor (promote the fixed website `Lens` enum to an open registry).
  Small, mechanical, covered by existing engine tests. The precondition for every later lens.
- Design and prototype Lens 2 (Reputation and Reception) at Level 1 outside-in only: reuse `src/live`
  website extraction, add the public reviews aggregate, DNS, security headers, and KVK connectors as
  read-only Level 1 evidence, and write the cross-surface promise-versus-reception detector against the
  frozen engine unchanged, with adversarial silence fixtures. No production behaviour change.
- Confirm the research [V] items as HUMAN ACTIONS: Places caching ToS, SSL Labs ToU, the KVK API key,
  and the outside-in evidence sources' terms.
- Build the connector-plane skeleton at Level 1 (public evidence connectors, no credentials).
- Ship the scoped progressive-disclosure UX round for the current lens (one discovery at a time), which
  also becomes the shared presentation contract for Lens 2.

---

## 27. Roadmap B: 90 days (two to four lenses that demonstrably add value)

- Lens 2 (Reputation and Reception) to pilot: run it beside the current lens on real testers, measure
  recognition, iterate or kill per the pilot protocol. This proves cross-lens reveals cheaply.
- Finance Lens (Lens 3) at Level 2 Bring Your Data: generalise the shipped importer into the file-
  ingestion connector, implement the flagship detectors (revenue up cash down, concentration rising,
  margin drift), and pilot with a handful of owners uploading a trial balance. DPIA before it ships
  (HUMAN ACTION).
- Connector plane Level 2 and the first Level 3 groundwork: begin the Exact Online app-review process
  (HUMAN ACTION) and the Moneybird self-serve connector in parallel, so connected finance is ready
  when Bring Your Data has proven demand.
- Cross-lens groundwork: with Lens 1, Lens 2, and Finance in place, prototype the first genuine cross-
  lens reveal (brand promise from Lens 1/2 versus a finance signal, or revenue versus concentration).

By day 90 Maculis should have two piloted new lenses (Reputation and Reception, Finance Bring Your
Data) with recognition data, plus the connector plane and the first cross-lens reveal in prototype.

---

## 28. Roadmap C: 12-month vision (a coherent multi-lens intelligence platform)

- Finance Lens at Level 3 Connected (Exact and Moneybird live behind consent, one Open Banking
  aggregator for bank ground truth) and Level 4 Continuous (change detection: margin slipping, cash
  thinning, a customer becoming dominant).
- Lens 4 (Dependency and Resilience) built on the Finance connector plus Relationship Intelligence:
  customer and supplier concentration, owner dependency, transferability and business value. The
  differentiated, emotionally powerful lens no competitor builds for owners.
- Cross-lens intelligence as a first-class capability: the platform routinely surfaces relationships
  across finance, reception, and dependency, gated and phrased at ladder levels 1 to 4.
- GrowBrain integrated as the earned action layer: recognised reveals hand off to experiments, results
  flow back as confirmed relationships into Relationship Intelligence, closing the reveal-to-learning
  loop.
- Relationship Intelligence compounding: Maculis knows which relationships each owner cares about and
  which lens to reach for next, a moat no dashboard can copy.
- Connected Marketing as an upgrade to Lens 2 (GSC and GA4 first, GBP and ads later behind approvals).

Dependencies made visible: the lens-registry refactor precedes everything; the connector plane
precedes all connected levels; Finance Bring Your Data precedes Finance Connected precedes Dependency
and Resilience; Relationship Intelligence and the recognition data precede the compounding moat;
GrowBrain integration follows the first lenses with strong action handoffs (Finance, Reputation).

---

## 29. Technical dependencies (the critical path)

1. Lens-registry refactor (open `LensId`, monotonic gate config). Precondition for every lens and for
   cross-lens.
2. Connector plane skeleton (registry, vault, OAuth lifecycle, consent ledger, sync, rate limit,
   retry, webhook, normalizer, provenance, health). Precondition for Levels 2 to 4.
3. Level 1 public-evidence connectors (website reuse plus reviews, DNS, security, KVK, PageSpeed).
   Precondition for Lens 2 and the current-lens deepening.
4. File-ingestion connector (generalised importer). Precondition for Finance Bring Your Data.
5. Exact and Moneybird and Open Banking connectors (behind review and commercial gates). Precondition
   for Finance Connected.
6. Relationship Intelligence recognition and memory wiring for lenses. Precondition for the moat and
   for Dependency and Resilience.
7. GrowBrain handoff contract. Precondition for the action loop and level-5 causal claims.

---

## 30. HUMAN ACTIONS (parked, not blocking)

Registered so research does not stop. None of these is done autonomously (they are on the non-autonomy
list: no paid accounts, no production connections, no DNS changes, no secrets, no journey changes).

- H1. Confirm outside-in evidence terms before Lens 2 build: Google Maps/Places caching ToS, SSL Labs
  Terms of Use, Trustpilot business terms.
- H2. Obtain a KVK API key (requires a Dutch registered entity; Maculis qualifies) for identity-
  consistency evidence.
- H3. Begin the Exact Online App Center review for the connected Finance level (multi-customer app
  approval, weeks of lead time).
- H4. Select and contract one Open Banking aggregator (Enable Banking or Tink), since GoCardless Bank
  Account Data closed new signups. Commercial decision.
- H5. Marketing connected approvals when the connected Marketing upgrade is scheduled: Google Business
  Profile allowlisting, Meta app review plus business verification, LinkedIn partner application,
  Google Ads developer token. Design the connect UX before applying.
- H6. DPIA and ROPA entries for Finance (Level 2 and 3) and connected Marketing before those levels
  ship.
- H7. Promote this strategy into `ftrlabs-docs` via reviewed PRs (glossary, Product Bible, ADRs,
  decision log, roadmap, compliance). This is the governance handoff.
- H8. Validate NL bookkeeping market share with a paid study before locking the Finance connector order.

---

## 31. Open decisions

Recorded so undecided choices are visible rather than assumed (mirroring the `ftrlabs-docs` open-
decisions convention).

- Whether the connected Marketing upgrade is worth its approval lead time, or whether Lens 2 stays
  outside-in for longer.
- Which Open Banking aggregator (Enable Banking for self-serve, Tink for coverage, Yapily for NL plus
  business accounts, Ponto/Isabel for Benelux bank strength).
- Packaging and pricing shape (made visible in section 21, deliberately not fixed).
- How GrowBrain and Relationship Intelligence map onto the existing FTRLABS modules (AI Growth Coach,
  CRM) in the governance model.
- Whether Dependency and Resilience or Marketing Connected is Lens 4 (the model ties them; the Finance
  dependency argues for Dependency and Resilience).
- The lens registry gate-config composition rules (monotonic strictness) as an ADR.

---

## 32. Concrete recommendations: Lens 2, Lens 3, Lens 4

### Lens 2: Reputation and Reception (outside-in cross-lens). Build next.

Why. It preserves the zero-integration magic that makes Maculis feel like a revelation, delivers a
genuine cross-lens reveal (the promise-experience gap) with public evidence and low risk, reuses the
existing outside-in pipeline, and has the highest learning value per euro because it proves cross-lens
reveals before Maculis bets on the sensitive Finance data path. It scores highest in the model (85.2)
and it is the trust builder Finance will need. It is also a quick win that is genuinely valuable, not
cheap noise, because its reveal is a real cross-surface contradiction the competitor research shows no
one else surfaces for owners.

### Lens 3: Finance, entered via Bring Your Data. Build after Lens 2.

Why, and the pushback. Finance is the most valuable lens and the strongest moat. Its flagship reveals
(revenue up cash down, concentration rising, margin drift) are the empty white space in the market and
carry the clearest willingness to pay and the best GrowBrain handoffs. But it is not Lens 2. Building
Finance second would trade away the zero-integration trust curve, front-load the product's highest
privacy and security risk, and bet on owners handing over financial data before the pilot has shown
they will. Entered at Bring Your Data (one uploaded trial balance), it delivers its wow with minimal
friction and no ERP implementation, and the connected level follows once demand is proven. The model
scores it 81.0, second only because of feasibility and risk, not value.

### Lens 4: Dependency and Resilience. Build once Finance and Relationship Intelligence exist.

Why. It is the differentiated, emotionally powerful lens no competitor builds for owners (customer and
supplier concentration, owner dependency, transferability and business value). It is Lens 4, not
earlier, precisely because it needs the Finance connector and the Relationship Intelligence that Lenses
1 to 3 build. Marketing Connected is the alternative Lens 4 and can instead run as a parallel upgrade
to Lens 2.

### And explicitly: what to hold back now

Do not build, yet: standalone AI-readiness, standalone cybersecurity, standalone HR, sustainability, a
general website-audit expansion of Lens 1, a correlation-firehose cross-lens engine, or any connected
lens whose approval lead time exceeds its near-term reveal value. Section 24 gives the reasons.

### The one-sentence answer

After First Five, do not ask "what shall we build now." Deepen Lens 1 continuously, build Reputation
and Reception as Lens 2 to keep the zero-integration magic and prove cross-lens reveals, build Finance
(Bring Your Data first) as Lens 3 for the moat and the money, and build Dependency and Resilience as
Lens 4 once Finance and Relationship Intelligence make it possible, all on the one shared, frozen,
gated engine that already knows the difference between evidence and insight.
