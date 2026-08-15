# Lens 2 Prototype Bake-off: Privacy and Security Evaluation

> Workstream deliverable for the "Lens 2 Prototype Bake-off" Epic. Evaluates the three candidate
> lenses (Reputation and Reception, Finance Bring Your Data, Dependency and Resilience) for privacy
> and security risk, scoped specifically to a prototype and bake-off phase, not to production.
> Compiled 2026-08-15. Grounded in `00-masterplan.md` (sections 11, 19, 20, 30),
> `02-connector-architecture.md`, and the two research artifacts in `research/`.
>
> Confidence tags, reused from the research artifacts so the reader can trust the boundary between
> what is known and what is planning judgement:
> [F] fact from an official source or the codebase, [A] assumption or inference, [V] verify against a
> primary contract or Terms of Service before building on it.
>
> Bake-off rules of engagement assumed throughout: only allowed public data, synthetic data, or
> explicitly permitted test data. No Terms of Service violating scraping. No real sensitive financial
> data without explicit consent. Governance frame: GDPR and AVG, plus the FTRLABS Architecture
> Principles (privacy by design, security by design, fail-closed consent, data minimisation, no
> secrets in code or logs, tenant isolation).

---

## 0. How to read this document

Each candidate is evaluated on the same five axes:

1. Data classes involved, mapped to the FTRLABS classification (Public, Internal, Confidential,
   Restricted), and the GDPR lawful basis that would apply.
2. Privacy risk in the bake-off phase specifically.
3. Security risk in the bake-off phase specifically.
4. What is safe to do autonomously now, versus what is a HUMAN ACTION. Each HUMAN ACTION is scoped so
   that it blocks only its own evidence family, never the whole prototype.
5. A DPIA style risk note where the data is sensitive enough to warrant one.

Section 4 gives the Reputation kill-criterion verdict the Epic asks for. Section 7 gives the
cross-candidate comparison: safest to prototype now, and most drag toward production.

A note on the data classification. The FTRLABS policy names four classes. This document uses them as:
Public (information about a business that is already public and carries no person-level privacy load),
Internal (Maculis operational data, not customer data), Confidential (personal data of identifiable
people, and business-sensitive but not regulated data), Restricted (financial data, and any special
category or high-impact profiling data). [A] The exact policy definitions live in `ftrlabs-docs`; this
mapping is the working interpretation for the bake-off and should be reconciled when the ROPA entries
are opened (HUMAN ACTION H6 in the masterplan).

---

## 1. Candidate A: Reputation and Reception (outside-in)

The core reveal is the promise versus reception gap: the brand promise read from the owner's own
website, placed next to how the public receives and finds the business (review aggregate, findability,
identity consistency, trust and security signals). [F] The masterplan rates this lens low privacy risk
and low security risk because it reads public data about a business, not persons (section 5.1).

### 1.1 Data classes and lawful basis

| Evidence family | Source | Data class | Person-level data? | Lawful basis for the bake-off |
|---|---|---|---|---|
| Brand promise | Owner website fetch (reuse `src/live`) | Public | Rare (a ZZP trade name can equal a person name) | Legitimate interest for a public business page, or the owner's consent when the subject is a pilot participant. [A] |
| Review aggregate | Google Places API (New) Place Details: rating, userRatingCount | Public (aggregate) / Confidential (individual review text and author names) | Yes, once you touch the up-to-five sample reviews (author display names, free text) | Aggregate rating and count: legitimate interest. Individual review text and author names: avoid in the bake-off; if used at all, legitimate interest with a balancing test, and never persisted. [V] |
| Other review platforms | Trustpilot Business Units API (official aggregate) | Public (aggregate) | Aggregate only if you stay to the official fields | Legitimate interest for the aggregate. Scraping review text is out of scope, see 1.4. |
| Findability footprint | Sitemap, indexation proxies, direct fetch | Public | No | Legitimate interest. |
| Identity consistency | KVK registry (Basisprofiel, Naamgeving), DNS, RDAP | Public / Confidential (a residential registered address of a sole trader is personal data) | Yes, for sole traders whose registered address is a home address | Legitimate interest. [F] KVK shields residential addresses; RDAP redacts registrant personal data under GDPR, so the personal exposure is already reduced at source. |
| Trust and security signals | Response headers, TLS handshake, certificate read | Public | No | Legitimate interest. Reading your own fetch of a public endpoint carries no person-level privacy load. |

Net: the aggregate and infrastructure signals are Public and carry the lowest privacy load of any
candidate. The only Confidential edges are individual review text and author names, and sole-trader
registered home addresses. Both are avoidable in a bake-off.

### 1.2 Privacy risk in the bake-off phase

Low. [F] The primary reveal is fully outside-in and about a business, not a person. The residual
privacy points, all controllable:

- Individual review authors. The Places sample of up to five reviews carries author display names and
  free text, which is personal data. [A] The bake-off should read only rating and count, and treat
  theme clustering as out of scope until a production DPIA covers it, or run theme clustering on
  synthetic review fixtures. Do not persist review author names.
- Sole-trader identity. A KVK Basisprofiel for a ZZP can expose a person, and the registered address
  can be a home address. [F] KVK shields residential addresses, which reduces this, but the bake-off
  should still treat KVK output as Confidential where the legal form is a natural person.
- Subject selection. Running the lens against a real third party business that has not consented is
  defensible on legitimate interest for genuinely public data, but the clean bake-off posture is to
  run against the pilot owners' own businesses (consent is explicit and the balancing test is trivial)
  or against synthetic fixtures.

### 1.3 Security risk in the bake-off phase

Low. [A] Level 1 outside-in needs no credentials, no vault, and no OAuth (`02-connector-architecture.md`
section 4). The security surface is limited to API keys for Places and KVK, which are low-sensitivity
read keys, and to outbound fetch hygiene. Controls that apply even at prototype:

- Keep the Places and KVK keys in environment variables only, never in code, logs, or the repo. [F]
  This is the existing Testerbeheer stance.
- Honor robots.txt, identify the user agent, and rate-limit outbound fetches. [F] The research notes
  that polite single-page fetching is materially different from bulk scraping (research Part B).
- Do not build SSL Labs into the prototype. [V] SSL Labs Terms of Use restrict commercial and
  redistributive use. Read headers and the certificate directly, or use Mozilla HTTP Observatory,
  which is open. This keeps the trust-signal family clean without a ToS dependency.

### 1.4 Safe autonomously now, versus HUMAN ACTION

Safe to do autonomously now, no blocker:

- Fetch the owner's own or a synthetic test website and extract the brand promise (reuses shipped
  `src/live`).
- Read DNS, RDAP, response headers, and the TLS certificate directly. These sources have essentially
  no usage restriction (research Part B). [F]
- Build the promise-versus-reception detector against synthetic review fixtures, including adversarial
  silence fixtures, so the reveal logic is proven before any real external data flows.

HUMAN ACTION, each blocking only its own evidence family:

- H1 (masterplan): confirm the Google Maps Platform Terms of Service on caching before persisting
  Places rating or userRatingCount. [V] Displaying live is the safe default; caching most Places
  content beyond place_id is restricted. Blocks only: persisted real review aggregate. Does not block:
  the detector, which can run on fixtures or on live-read-not-stored data.
- H1 (masterplan): confirm Trustpilot business terms and SSL Labs Terms of Use. [V] Blocks only: the
  Trustpilot evidence family, and any productized SSL Labs use (which we avoid anyway).
- H2 (masterplan): obtain a KVK API key (requires a Dutch registered entity; Maculis qualifies).
  Blocks only: the identity-consistency evidence family, which is a deepening beat, not the core
  reveal.
- Obtaining a Google Maps Platform key requires a billing account. [A] Setting up a paid or billed
  account is on the non-autonomy list (masterplan section 30). Blocks only: real Places data. The core
  reveal prototypes on synthetic fixtures without it.

None of these block the prototype as a whole. The detector and the wow can be demonstrated on
synthetic and owner-consented data while the human actions clear the real external sources.

---

## 2. Candidate B: Finance Bring Your Data

The reveal reads uploaded financial files (trial balance, P&L and balance, aged receivables and
payables, bank export) and surfaces relationships such as revenue up while cash is down, rising
customer concentration, and margin drift. [F] The masterplan rates this privacy risk medium to high
and security risk high, because it handles sensitive financial data at rest (section 5.2).

### 2.1 Data classes and lawful basis

| Evidence family | Source | Data class | Lawful basis for the bake-off |
|---|---|---|---|
| P&L, balance, trial balance | Uploaded file (Level 2) | Restricted (financial data of the business; personnel cost lines can touch employee data) | Synthetic data: no personal data, no lawful basis question. Real data: explicit consent of the owner, purpose-scoped to the bake-off, or contract. [A] |
| Aged receivables and payables | Uploaded file | Restricted / Confidential (customer and supplier names are personal data where they are natural persons) | As above. Named counterparties raise the bar: this is third-party personal data the owner is sharing. |
| Bank export | Uploaded file | Restricted | As above. Bank transaction narratives frequently contain third-party personal data. |
| Personnel cost lines | Within P&L | Restricted (can be employee-identifying in a small business) | As above. In a micro business a single personnel line can identify a person. |

The bake-off posture that keeps this clean: use synthetic or fully anonymised test files only. [A]
Genuinely synthetic financial data is not personal data, so GDPR does not attach and there is no
lawful-basis question. The moment a real owner uploads a real trial balance with real receivables, the
data becomes Restricted, it carries third-party personal data (the owner's customers and suppliers),
and explicit purpose-scoped consent plus a DPIA are required before it may be processed.

### 2.2 Privacy risk in the bake-off phase

Medium if the bake-off is disciplined, high if it is not. [A] The risk is not the arithmetic, it is
the data.

- Synthetic data path (recommended): privacy risk is low, because there is no personal data. The only
  risk is accidentally seeding synthetic files with real fragments (a real IBAN, a real customer name).
  Generate fixtures from scratch; do not anonymise a real export by hand and hope.
- Real data path: privacy risk is high even for a single friendly owner. An aged-receivables list is a
  list of that owner's customers and how much they owe, which is third-party personal and commercially
  sensitive data. Processing it needs explicit consent, a defined retention window, and the ability to
  delete on withdrawal. That is production-grade governance and should not be improvised inside a
  bake-off.

### 2.3 Security risk in the bake-off phase

High, and this is the axis where Finance is genuinely different from Reputation. [F] Financial data at
rest is the highest-value target in the whole roadmap (masterplan section 20). Even in a bake-off:

- The uploaded file is the sensitive object. Follow the shipped importer discipline: validate, show a
  safe preview, and retain the raw file only as long as needed (`02-connector-architecture.md`
  section 5). [F]
- Provenance stamp uploads as `providerId: file_upload` and keep derived canonical objects, not raw
  dumps, longer than necessary. [F]
- Tenant isolation applies from the first prototype, not from production. A bake-off that pools several
  owners' files in one unscoped store is a data-protection incident waiting to happen. [A]
- No secrets, no real IBANs, no real ledger fragments in logs or in the repo. [F] Existing logging
  discipline: `METHOD PATH -> status` and provenance references only, never bodies.

The strong mitigation: run the bake-off on synthetic files, which removes the at-rest sensitivity
almost entirely and lets the detector work be judged on its merits without carrying production
security weight.

### 2.4 Safe autonomously now, versus HUMAN ACTION

Safe to do autonomously now:

- Generate synthetic financial fixtures (trial balance, P&L, aged receivables) and build the flagship
  detectors (revenue up cash down, concentration rising, margin drift) against them. [F] This is exactly
  the masterplan's 90-day plan for Finance at Level 2, minus any real data.
- Generalise the shipped importer into the file-ingestion connector against synthetic files, with the
  green, orange, red safe-preview pattern.

HUMAN ACTION, each blocking only its own dependency:

- H6 (masterplan): a DPIA and a ROPA entry for Finance before any real personal or financial data is
  processed. Blocks only: the real-data path. Does not block: the synthetic-data prototype.
- Explicit, purpose-scoped, written consent from any owner whose real files are used. Blocks only: that
  owner's real data. This is on the non-autonomy list.
- No connected finance connector (Exact, Moneybird, Open Banking) is activated for the bake-off. [F]
  Activation is a separate reviewed human decision (masterplan sections 20 and 30). Not needed for
  Bring Your Data at all.

### 2.5 DPIA style risk note (Finance, even synthetic)

Even though a synthetic bake-off carries no personal data, the DPIA thinking should be written now,
because it is the precondition for the level that follows and because the bake-off design decides how
hard the later DPIA will be.

- Nature of processing: ingestion of financial files, deterministic ratio computation, bounded AI
  narration of gate-passed relationships. [F] The AI sees only the evidence bundle, never a database
  dump (masterplan section 19).
- Data subjects, in the real-data path: the owner, the owner's customers and suppliers (via
  receivables, payables, bank narratives), and potentially employees (via personnel cost lines).
- Special category data: not expected in standard financial files. [A] Flag if a bank export narrative
  reveals, for example, medical creditors, which can leak health-adjacent data. The masterplan already
  notes the primary-healthcare segment raises the bar (section 19).
- Necessity and proportionality: the reveal needs relationships between aggregates, not the identity of
  every counterparty. Data minimisation argument: for the core reveals, concentration can be computed
  from ranked shares without persisting customer names. Persist names only for the deepening beat, and
  only under consent.
- Key risks and mitigations: unauthorised access to files at rest (mitigate with encryption at rest and
  tenant isolation), excessive retention (mitigate with a short raw-file retention window and derived-
  object-only storage), function creep from bake-off into production without a DPIA (mitigate by keeping
  the bake-off synthetic and gating the real-data path on H6).
- Verdict: the synthetic bake-off is low risk and needs no DPIA to proceed. [A] The real-data and
  connected levels need a completed DPIA before they ship, which is already registered as H6.

---

## 3. Candidate C: Dependency and Resilience

The reveal surfaces how much of the business depends on a single customer, supplier, person, or on the
owner. [F] It draws on customer and supplier concentration (finance and invoice data), owner dependency
(who is on every thread, from Relationship Intelligence), and transferability. [F] The masterplan rates
privacy and security risk medium to high because it combines financial and relationship data
(section 5.3).

### 3.1 Data classes and lawful basis

| Evidence family | Source | Data class | Lawful basis for the bake-off |
|---|---|---|---|
| Customer and supplier concentration | Finance (invoice or receivables) data | Restricted | Synthetic: none needed. Real: explicit consent plus DPIA, as Finance. |
| Owner dependency | Relationship Intelligence (who is on every thread) | Confidential (relationship and contact data of identifiable people) | Real: this is the owner's contacts and communication metadata. Consent and the existing fail-closed Relationship Memory discipline apply. [F] |
| Transferability and business value | Derived from the above plus organisation signals | Restricted (a derived judgement about the business's sellability and owner dependence) | Derived profiling. Real: needs the same consent and DPIA envelope. |

This is the most data-intensive candidate. It does not introduce a new source so much as it combines
the two most sensitive existing ones: Restricted financial data and Confidential relationship data.
[A] Combination is itself a privacy event. Two datasets that are each acceptable can, joined, produce a
profile of a person (for example, the owner's dependence, or a named key customer's leverage) that
neither carried alone.

### 3.2 Privacy risk in the bake-off phase

Highest of the three on real data, low on synthetic. [A]

- The combination is the risk. Joining finance and relationship data creates a profile of how the
  business, and by extension identifiable people, depend on each other. This edges toward profiling in
  the GDPR sense and deserves the most careful balancing test.
- Relationship data is personal by construction. Owner dependency is computed from who appears on which
  threads, which is communication metadata about identifiable people. The existing Relationship Layer
  already treats this as fail-closed and human-confirmed (masterplan section 15); the bake-off must not
  loosen that.
- For a bake-off, this candidate should run on synthetic combined fixtures only. [A] Building a real
  finance-plus-relationship join for a prototype would front-load the roadmap's heaviest privacy
  exposure with the least governance in place, which is exactly the sequencing mistake the masterplan
  warns against (it is Lens 4 for this reason).

### 3.3 Security risk in the bake-off phase

Highest of the three. [A] It inherits Finance's at-rest financial sensitivity and adds relationship
data, so a breach would expose both the numbers and the network. The controls are the union of the
Finance controls (encryption at rest, tenant isolation, minimisation, no secrets in logs) and the
Relationship Layer controls (bounded AI context, no PII in logs, human-confirmed memory). A bake-off on
synthetic data avoids carrying this weight prematurely.

### 3.4 Safe autonomously now, versus HUMAN ACTION

Safe to do autonomously now:

- Prototype the concentration and owner-dependency detectors against synthetic combined fixtures. [A]
  This proves the reveal logic without touching real personal or financial data.

HUMAN ACTION, each blocking only its own dependency:

- H6 (masterplan): DPIA and ROPA covering the combined finance-plus-relationship processing before any
  real data is used. This candidate's DPIA is the most demanding because of the combination, and it
  should be its own assessment, not a copy of the Finance one. Blocks only: the real-data path.
- Explicit consent from any owner whose real finance and relationship data are joined. Blocks only:
  that owner's real data.
- Availability of the real Finance connector and Relationship Intelligence wiring, which the masterplan
  deliberately sequences after Lenses 1 to 3. [F] For a bake-off this is not a blocker, because the
  prototype runs on synthetic fixtures; it is a reason this candidate is least ready to run on real data
  now.

### 3.5 DPIA style risk note (Dependency, the combination)

- Nature of processing: joining Restricted financial data with Confidential relationship data to derive
  a resilience and transferability profile. This is the profiling-adjacent case, so the DPIA is likely
  mandatory under GDPR, not merely advisable. [A]
- Data subjects: the owner, key customers and suppliers (who may become individually identifiable as
  named dependencies), and people in the relationship graph.
- Necessity and proportionality: the reveal is about concentration and single points of failure, which
  can largely be expressed as shares and structural facts rather than as named-person dossiers. Argue
  for computing the reveal from aggregates and ranks, and surfacing a specific name only on the owner's
  own deepening request.
- Key risks and mitigations: creation of a person-level dependency profile (mitigate by keeping the
  headline reveal aggregate and gating named detail behind owner action), combination surprise where
  joined data reveals more than either source (mitigate by an explicit balancing test in the DPIA),
  security concentration of two sensitive datasets in one store (mitigate with strict tenant isolation
  and minimisation).
- Verdict: real-data Dependency should not be prototyped in this bake-off. [A] Run it synthetic, and
  treat its DPIA as the most involved of the three, its own assessment under H6.

---

## 4. Reputation kill-criterion verdict (the Epic asks for this plainly)

The Epic names a kill-criterion: if the external reputation data sources are legally or commercially
problematic for a bake-off, say so plainly. The verdict, source by source:

- Google Places aggregate (rating, userRatingCount): usable for a bake-off, with a constraint. [F] The
  official Places API (New) exposes rating and count. [V] The open item is caching: the Maps Terms of
  Service restrict storing most Places content beyond place_id, so the safe pattern is to read live and
  not persist the aggregate until H1 confirms the caching terms. Commercially, rating sits in the Pro
  pricing tier and needs a billed Google Maps Platform key, which is a HUMAN ACTION. Not a kill.
- Review platforms (Trustpilot and similar): usable only via the official aggregate API, never by
  scraping. [F][V] Trustpilot Terms of Service forbid scraping; the Business Units API exposes the
  aggregate for an owned business. Reading the official aggregate is fine; scraping review text is a
  ToS breach and is out of scope. Not a kill for the aggregate; a hard no for scraping.
- Employer and recruitment signals (vacancies, hiring): partially usable, with a sharp boundary. [A]
  Public vacancies on the owner's own career page are fine to read. Scraping LinkedIn, Indeed, or other
  job boards for recruitment signals is a Terms of Service breach and, for LinkedIn especially, is
  actively enforced. [V] Confirm any specific job-board source against its primary ToS before use. For
  the bake-off, limit employer signals to first-party public pages, or drop the family. This family is
  the closest to a problem, and the honest call is to keep it out of the core bake-off.

Plain verdict: there is no hard legal or commercial blocker to prototyping the core Reputation reveal.
The promise-versus-reception detector can be built and demonstrated now on synthetic review fixtures
and the owner's own consented public data, which is fully autonomous. Real external data flows are
gated by their own HUMAN ACTIONS (billed Places key, KVK key, and the H1 ToS confirmations), and each
gate blocks only its own evidence family, not the reveal.

The kill-criterion would only trigger if the bake-off design depended on something the sources forbid:
persisting or redistributing cached Places review content, scraping review text from Trustpilot or
similar, or scraping recruitment platforms. None of those is necessary for the core reveal, so they
must simply not be done. Designed within the official aggregate APIs and first-party public data, the
external reputation sources are legally and commercially usable for a bake-off. The lens is not killed
on this criterion.

The one hard blocker to state clearly: real Google Places review data and real KVK data cannot be used
autonomously, because each needs a HUMAN ACTION first (a billed Maps Platform key and the caching ToS
confirmation for Places; the KVK API key for identity consistency). Until those clear, the Reputation
bake-off runs on synthetic fixtures and owner-consented own-site data. That is a scoping constraint on
the real-data evidence, not a blocker on the prototype.

---

## 5. Facts versus assumptions (consolidated)

Facts [F]:

- Reputation and Reception is rated low privacy and low security risk; Finance medium-to-high privacy
  and high security; Dependency medium-to-high on both (masterplan sections 5.1, 5.2, 5.3).
- Level 1 outside-in needs no credentials, no vault, no OAuth (`02-connector-architecture.md` section 4).
- KVK shields residential addresses; RDAP redacts registrant personal data under GDPR (research Part B).
- The bounded AI sees only the current lens evidence bundle, never a database dump (masterplan section 19).
- No production connector is activated during design or pilot work; activation is a separate reviewed
  human decision (masterplan sections 20 and 30).
- HUMAN ACTIONS H1 (Places caching ToS, SSL Labs ToU, Trustpilot terms), H2 (KVK key), and H6 (DPIA and
  ROPA for Finance) are already registered and parked, not blocking research (masterplan section 30).

Assumptions [A]:

- The Public, Internal, Confidential, Restricted mapping used here is the working interpretation of the
  FTRLABS policy and should be reconciled with `ftrlabs-docs` when the ROPA entries are opened.
- Genuinely synthetic financial and relationship data carries no personal data and therefore no
  lawful-basis question, provided the fixtures contain no real fragments.
- Legitimate interest is the working lawful basis for public business data in the bake-off; the owner's
  own consent is the cleaner basis when the subject is a pilot participant.
- Dependency's DPIA is likely mandatory rather than advisory because the finance-plus-relationship join
  is profiling-adjacent.

Items to verify against primary Terms of Service [V]:

- Google Maps Platform Terms of Service on caching Places rating, userRatingCount, and review content.
- SSL Labs Terms of Use for any productized or redistributive use (avoided here by reading headers and
  certificate directly, or using Mozilla HTTP Observatory).
- Trustpilot business terms and the scope of the Business Units API aggregate fields.
- The primary Terms of Service of any specific job board before using recruitment signals beyond
  first-party pages.
- Current Places and PageSpeed free-tier ceilings at projected bake-off volume.

---

## 6. Bake-off guardrails (applies to all three candidates)

These are the non-negotiable controls for the prototype phase, drawn from the FTRLABS principles and the
existing codebase discipline. They are cheap to honor now and expensive to retrofit.

1. Synthetic or explicitly permitted test data first. Real personal or financial data enters only under
   explicit purpose-scoped consent and, for Finance and Dependency, only after the DPIA (H6).
2. No Terms of Service violating scraping. Official aggregate APIs and first-party public data only.
   Honor robots.txt, identify the user agent, rate-limit fetches.
3. No secrets in code, logs, or the repo. Read keys (Places, KVK) live in environment variables only.
   Logs carry method, path, status, and provenance references, never bodies or tokens.
4. Tenant isolation from the first prototype, especially for any Finance or Dependency fixtures, so no
   bake-off store pools multiple subjects unscoped.
5. Data minimisation. Compute reveals from aggregates and ranks where possible; persist named
   counterparties or review authors only under consent and only for a deepening beat.
6. Provenance on every evidence object, so any reveal remains reproducible and auditable.
7. Fail-closed consent. Absent an active, purpose-scoped consent, real data is not read. This extends
   the Communication Layer's `mayContact` stance to data ingestion.

---

## 7. Comparison: safest to prototype now, and most drag toward production

Safest to prototype now: Reputation and Reception, clearly. [F][A] It is the only candidate whose core
reveal reads genuinely public business data, needs no credentials for its infrastructure signals, and
carries low privacy and low security risk in the bake-off. Its real external sources each sit behind a
single scoped HUMAN ACTION, and its detector can be fully proven on synthetic fixtures and owner
consented own-site data before any of those clear. It is the safe first bake-off, which is consistent
with the masterplan's independent conclusion that it is Lens 2.

Middle: Finance Bring Your Data. Safe to prototype on synthetic files, where it carries low risk, but
its production path front-loads the roadmap's highest security weight (financial data at rest) and a
mandatory DPIA. The gap between a safe synthetic bake-off and a shippable real-data lens is the widest
of the three, because the moment real files arrive, the lens becomes Restricted-data, third-party-
personal-data, DPIA-gated processing.

Most drag toward production: Dependency and Resilience. [A] It combines the two most sensitive datasets,
its DPIA is the most demanding (profiling-adjacent), it depends on the Finance connector and
Relationship Intelligence that do not yet exist, and its security surface is the union of Finance and
the Relationship Layer. A synthetic bake-off is feasible and low risk, but its road to production is the
longest and heaviest. This matches the masterplan's decision to make it Lens 4, after Finance and
Relationship Intelligence exist.

Ordering, by privacy and security drag toward production, lightest first: Reputation and Reception, then
Finance Bring Your Data, then Dependency and Resilience.

One-line synthesis: prototype all three on synthetic and consented data safely, ship Reputation first
because its production privacy and security load is genuinely low, and treat Finance and especially
Dependency as candidates whose bake-off is easy but whose production governance (DPIA, consent,
encryption at rest, tenant isolation) is the real work.
