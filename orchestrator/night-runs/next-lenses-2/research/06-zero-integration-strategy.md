# Zero Integration Strategy per Lens

EPIC-2 WS-6 (MAC-113) — analysis/read-only

> Product strategy for how every major Maculis lens delivers real, evidence-bound
> value within minutes, with zero setup. Insight first, data later. This document
> changes no product code, claims no knowledge of `ftrprf-labs/maculis-first-five`
> internals, and inherits the lens contract and EU/consent posture from the EPIC-1
> masterplan (`../../next-lenses/masterplan.md`) and the First Five slate
> (`../../next-lenses/research/01-first-five-next-lenses.md`). Anything beyond the
> brief is marked **[ASSUMPTION]**.

---

## 0. Scope, grounding, inheritance

**The strategic principle, restated as a design law.** Maculis must not be worthless
until twenty SaaS integrations are wired. The entrepreneur is seduced by insight and
only then asked for more data. Therefore: **the first grounded observation must land
before any question is asked and before any data is requested.** A lens that cannot
say something true and verifiable from public material alone has no zero-integration
mode and must say so honestly rather than fake one.

**Inherited, non-negotiable (from the masterplan):**
- A lens is *one deliberately chosen, evidence-bound perspective — a focus, never a
  verdict or a score.* Output is `Closed(reason)` or `Observations[]`, every claim
  carrying a tester-verifiable locator and a two-bucket strength (`clear` / `notable`),
  **never a number, never a dashboard**.
- **Fail-closed**: absence of evidence is not evidence. Silence beats a confident
  wrong finding.
- **Consent fail-closed / PII minimisation**: lenses read the *subject* surface, not
  the entrepreneur. No person-level enrichment against data brokers or people-databases
  (deferred behind DPIA in the masterplan). Public org-level material only.
- **No dark patterns**: an offer is a door, declining is a first-class outcome, no
  re-prompt.

**The three permitted zero-integration inputs (and only these):**

| Input | What it is | Consent / privacy boundary |
|---|---|---|
| **Public data** | The subject's own site (rendered DOM, head, sitemap, robots, headers), and public org-level surfaces: search-result identity, public map/business listing, public review aggregates, public ad-transparency libraries, public business register, public share previews, public archive snapshots. | Org-level, already public. Never a person-profile. Quote the location, not the personal value. |
| **A tiny set of earned questions** | 1 to 3 questions the entrepreneur answers in seconds, each asked **after** an observation to sharpen it, never as a gate. | Entrepreneur's own words about their own business. No third-party PII. |
| **An optional safe upload/export** | A one-time, user-controlled file drop (a CSV they already have, a screenshot, numbers they type). No OAuth, no credential, no persistent access. | One-time and revocable. An upload is *not* a licence for ongoing processing or enrichment. |

Everything past these three inputs is a **rung on the ladder** (Section 3), reached
only by pull, never as a precondition.

---

## 1. The zero-integration mode, per lens category

For each category: **what the entrepreneur sees in minutes with zero setup**, the
public data behind it, the earned question(s), the optional safe upload, an **honesty
flag** on credibility, and the four-rung ladder for that lens.

### 1.1 First Five (the native zero-integration lens)

First Five is already the reference implementation of this doctrine: it reads only the
public subject surface, no external account. Its zero-integration mode is its *only*
mode, and it is credible.

- **Sees in minutes:** enter a URL, and within seconds the Reveal lands one grounded,
  verifiable statement drawn from the six-lens slate (Clarity of Promise, Reachability,
  Freshness, Findability Basics, Accessibility, Name & Identity). Example:
  *"Op de eerste schermweergave staat niet wat jullie doen. We keken naar de kop en de
  eerste alinea."* The entrepreneur can open the page and check it themselves.
- **Public data:** rendered homepage, head tags, one interior hop, `robots.txt`,
  `/sitemap.xml`, HTTP headers. All tester-verifiable.
- **Earned question (after the Reveal, never before):** *"Klopt dit? En als je een ding
  wilde dat een vreemde meteen begreep, welk?"* — sharpens Clarity of Promise using the
  entrepreneur's own framing.
- **Optional safe upload:** none needed. First Five's whole point is *zero* even of the
  optional kind.
- **Honesty flag:** **Strong.** This is the gold standard the other lenses are measured
  against. No credibility gap.

### 1.2 Reputation / Findability

The strongest zero-integration lens after First Five, because reputation and
findability are, by definition, *public* surfaces.

- **Sees in minutes:** searching the business name plus its city, and reading its public
  map/business listing and public review aggregate, Maculis lands observations like:
  *"Als iemand jullie naam plus de stad zoekt, verschijnt eerst een oude vermelding met
  andere openingstijden dan op jullie site. We laten je beide zien."* Or:
  *"Er staat geen deelvoorbeeld ingesteld, dus een gedeelde link toont geen kaartje."*
  Findability facts from the site head (title, meta description, Open Graph, sitemap)
  compose with the public search-result identity.
- **Public data:** public search-result snippet and knowledge-panel identity, public
  business/map listing (name, hours, category, photo presence, review count and visible
  star aggregate), public review-platform aggregates, site head and share-preview tags.
- **Earned question:** *"Waar wil je gevonden worden: welke plaats of buurt?"* — turns a
  generic findability read into a located one.
- **Optional safe upload:** a screenshot of what they see when they search their own
  name (surfaces the gap between their view, often signed-in and personalised, and a
  stranger's).
- **Honesty flag:** **Strong**, with one conditional: a brand-new business with no
  listing and no reviews yields thinner material. That is itself a *true, useful*
  observation (*"we vonden nog geen publieke vermelding"*), not a failure to paper over.

**Ladder:**

| Rung | Unlocks | Data needed | Why they step up (the pull) |
|---|---|---|---|
| 0 Zero | Public identity vs. claimed identity; findability facts | URL + name (public) | Already delivered free |
| 1 Enrichment | Theme extraction across all visible public reviews (what strangers actually praise or fault) | Consent to read a wider public review set | "We saw one bad review. Want to know if it is a pattern?" |
| 2 Connected | Respond to and monitor reviews in place; alert on new ones; Search Console query and impression data (what people actually type to find you) | OAuth to a review platform and/or Search Console | "You are found for X but you sell Y. Connect Search Console to see the real gap." |
| 3 Longitudinal | Rating trajectory, findability drift, seasonal query shifts, response-time flywheel | Sustained connection | "Your rating moved. Here is what changed the week it did." |

### 1.3 Marketing

Credible at zero integration because a large part of marketing leaves a *public*
footprint: the site's own conversion affordances, and the public ad-transparency
libraries that regulators now mandate.

- **Sees in minutes:** *"Jullie hebben geen zichtbare manier om je aan te melden voor
  nieuws, dus een geinteresseerde bezoeker die nog niet klaar is om te kopen, verdwijnt.
  We keken op de homepagina en een pagina dieper."* Composed with a public
  ad-transparency read: *"Jullie draaien nu geen zichtbare advertenties; een naam die je
  straks noemt wel."* Presence of analytics/pixel markup in page source is a public,
  verifiable fact and reads as *"jullie meten bezoek wel, maar sturen bezoekers nergens
  naartoe"*.
- **Public data:** site conversion affordances (signup, lead capture, clear next step),
  analytics/pixel markup visible in page source, Open Graph share-readiness, public
  ad-transparency libraries (whether the business runs ads, roughly what creative),
  public social-profile existence and last-activity dates.
- **Earned question:** *"Hoe vinden de meeste nieuwe klanten je nu?"* — one answer, and
  the lens can contrast their believed channel against what the public surface actually
  supports.
- **Optional safe upload:** a one-time export of a single campaign or a sales
  spreadsheet, used once to sanity-check channel mix. No account connection.
- **Honesty flag:** **Medium-strong.** The public read is real but partial: it sees the
  *shape* of the funnel and public ad presence, not spend, not conversion rates. Say so.
  Do not imply Maculis can see their performance from the outside; it can see whether the
  machinery to capture and route interest even exists.

**Ladder:**

| Rung | Unlocks | Data needed | Why they step up |
|---|---|---|---|
| 0 Zero | Funnel completeness; public ad presence; channel-belief gap | URL + one question | Free |
| 1 Enrichment | One-time campaign or spreadsheet sanity check | Safe upload | "You said most people find you via search. Your one export says otherwise. Want to look?" |
| 2 Connected | Real spend, real conversion, cost per outcome per channel | OAuth to one ad or analytics platform | "You are spending on a channel that captures interest you cannot follow up. Connect it and we will show the leak." |
| 3 Longitudinal | Channel decay, creative fatigue, what actually drove the good month | Sustained connection | "Last month worked. Here is the specific thing that caused it, so you can repeat it." |

### 1.4 Finance

**This is the lens to flag honestly.** Real financial intelligence needs the
entrepreneur's own numbers. A zero-integration finance lens that pretends to analyse a
business's finances from the outside would be dishonest and would violate the
evidence-bound rule. So the zero mode is deliberately reframed: **not analysis of their
books, but a framing and a small set of *public* financial facts.**

- **Sees in minutes (honest version):** two things only.
  1. **Public register facts** where a public business register exists (in NL, KVK; in
     the EU, national registers): legal name, registration status, filing currency, and
     for larger entities any publicly filed figures. *"Jullie laatste publieke jaarstuk
     is van 2023. We linken de bron."* This is real, cited, verifiable.
  2. **A back-of-envelope frame built from one answer.** After First Five, ask
     *"Wat betaalt een nieuwe klant ongeveer de eerste keer?"* and *"Hoeveel nieuwe
     klanten per maand, ruwweg?"* Maculis reflects the arithmetic back, labelled clearly
     as the entrepreneur's own estimate: *"Met jouw eigen cijfers is dat ongeveer X per
     maand aan nieuwe klanten. Dit is jouw schatting, geen meting."*
- **Public data:** public business register (filing status and public figures only).
- **Earned question(s):** first-price and rough new-customer volume. Two numbers, typed.
- **Optional safe upload:** a bank or payment-processor CSV export they already have.
  Used once to replace the estimate with their real recent inflow — still no account
  connection, no credential.
- **Honesty flag:** **THIN as "finance intelligence" and must be labelled as such.** The
  register facts are real but shallow; the frame is coaching arithmetic on the
  entrepreneur's own guesses, not a measurement. **Reject any temptation to present the
  back-of-envelope figure as analysis.** Maculis's credibility rests on never dressing a
  guess as a finding. The wow here is not a number Maculis produced; it is the moment the
  entrepreneur sees their own arithmetic laid out and realises they had never done it.

**Ladder (note the missing-rung honesty):**

| Rung | Unlocks | Data needed | Why they step up |
|---|---|---|---|
| 0 Zero | Public register facts + self-estimate frame | Register + two typed numbers | Free; the frame surprises them |
| 1 Enrichment | **Weak rung — flag.** A one-time CSV replaces the guess with real recent inflow | Safe upload | Modest pull: "Replace the estimate with your actual last three months?" |
| 2 Connected | Real revenue, margin, cash runway, the numbers that decide whether the business survives | OAuth to accounting or payment platform | **This is where the entire value lives.** "You told us your guess. Connect the books and we will tell you your real runway." |
| 3 Longitudinal | Cash-flow forecast, seasonality, the month things tighten before it happens | Sustained connection | "Cash gets tight in November every year. This year we will warn you in September." |

**Where enrichment stops adding value (explicit):** for Finance, the middle
"enrichment" rung is nearly worthless. The honest architecture is to jump the
entrepreneur from the zero frame **straight to the connected books**, because a
one-time CSV is neither the seductive free insight nor the durable connected truth. Do
not engineer a fake intermediate step to make the ladder look symmetrical.

### 1.5 Customer / CX

Credible at zero integration *when public reviews exist*, because a business's public
reviews are its customers speaking in their own words. This is genuine voice-of-customer,
free.

- **Sees in minutes:** theme extraction over the visible public reviews, cited to the
  quotes: *"Drie recente reviewers noemen wachttijd; twee noemen juist de vriendelijkheid.
  We laten je de zinnen zien."* Plus a public behavioural fact: whether the business
  visibly responds to reviews at all. *"Op negatieve reviews staat geen reactie; op
  positieve wel. Bezoekers zien dat patroon ook."*
- **Public data:** public review text and aggregates, public response behaviour, the
  site's own contact/reachability affordances (from First Five's Reachability lens).
- **Earned question:** *"Welke klacht hoor je zelf het vaakst?"* — then contrast the
  entrepreneur's felt complaint against what the public record actually shows. The gap is
  often the insight.
- **Optional safe upload:** a one-time export of recent support emails or a feedback
  spreadsheet, theme-extracted once. No mailbox connection.
- **Honesty flag:** **Conditional.** Strong for consumer businesses with public review
  volume; **thin for young or B2B businesses with few or no public reviews.** When
  reviews are absent, say so plainly and fall back to Reachability facts rather than
  manufacturing sentiment from nothing. Do not infer CX from tone or design.

**Ladder:**

| Rung | Unlocks | Data needed | Why they step up |
|---|---|---|---|
| 0 Zero | Public review themes + felt-vs-shown gap | Public reviews + one question | Free |
| 1 Enrichment | One-time theme extraction of their own support/feedback export | Safe upload | "The public sees wait-times. Do your own emails say the same? Drop a month and we will check." |
| 2 Connected | Live tickets, response times, recurring issue clusters, the thing that generates the most contact | OAuth to a helpdesk or inbox | "You answer the same question all week. Connect support and we will show you which one, so you can fix it once." |
| 3 Longitudinal | Issue trends, seasonal complaint spikes, whether a fix actually reduced contact | Sustained connection | "You changed the checkout. Contact about it dropped by half. Proof the fix worked." |

### 1.6 Competition / Market

Strong and genuinely surprising at zero integration, because **every public lens you can
run on the subject, you can run on a named competitor** — from a single question.

- **Sees in minutes:** *"Noem een concurrent"* → one name → and Maculis runs the public
  reads side by side: *"Zij tonen een prijs op de homepagina, jullie niet. Zij draaien nu
  advertenties op jullie categorie, jullie niet. Jullie laden sneller. We laten alle drie
  de bronnen zien."* Public ad-transparency libraries make "are they advertising, and on
  what" a citable fact, not a guess.
- **Public data:** the competitor's public site, public listing, public review aggregate,
  public ad-transparency presence, public share/identity surface. Org-level only.
- **Earned question:** the competitor's name (one), optionally a second.
- **Optional safe upload:** none; keep this lens strictly public to stay clean.
- **Honesty flag:** **Strong, with a hard ceiling.** It must stay at public, org-level
  material. No person-profiling, no scraping behind logins, no inferring private strategy.
  The value is the honest side-by-side of two public storefronts, which is exactly what a
  prospective customer sees anyway. This is also prime **"surprising lens"** territory:
  the wow is that Maculis did in one minute what the entrepreneur has been meaning to do
  for a year.

**Ladder:**

| Rung | Unlocks | Data needed | Why they step up |
|---|---|---|---|
| 0 Zero | Public side-by-side on one named rival | One competitor name | Free, and it stings in a good way |
| 1 Enrichment | A small set (3 to 5) of rivals, and category-level public patterns | A few more names | "You named one. Want to see where you sit among five?" |
| 2 Connected | Your real position: your connected metrics against public rival surfaces | Any one of the entrepreneur's own connections (finance, ads, reviews) | "You can see their storefront. Connect one of yours and we will tell you where you actually win." |
| 3 Longitudinal | Competitor moves over time: new ads, price changes, listing changes, since you last looked | Sustained public monitoring | "Your rival dropped their price and started advertising last week. You would not have noticed." |

### 1.7 Surprising lenses (two concrete, zero-integration)

The shortlist reserves room for 1 to 2 surprising lenses. Both below are fully
zero-integration and lean on the *composition* of public reads rather than new data.

- **Ghost Town Check ("Welk kanaal ziet er verlaten uit?").** Across the public
  channels a stranger can reach — the blog, each public social profile, the map listing —
  read only the *last visible activity date* and flag the abandoned-looking one.
  *"Jullie Instagram lijkt levendig; de blog stopte in 2022. Een bezoeker die daar landt,
  denkt dat jullie stil zijn gevallen."* Surprising, cited, and it reframes "we are
  active" into "we look inactive *there*". Zero integration, high recognition.
- **What The Search Result Thinks You Are ("Wat denkt de zoekmachine dat jullie doen?").**
  Contrast the public search-result identity and knowledge-panel category against the
  entrepreneur's own claimed promise (First Five, Clarity). *"Jullie zeggen dat je
  strategie doet; de zoekresultaten noemen jullie een reclamebureau. We tonen allebei."*
  The gap between claimed and perceived identity is a genuine, evidence-bound surprise.

Honesty flag: **Strong.** Both are pure recompositions of already-public facts, which is
the safest possible ground for a surprising claim.

---

## 2. The progression ladder (general model)

Every lens climbs the same four rungs. The rungs differ by *data commitment*, and each
transition is triggered by an **insight the entrepreneur already wants to deepen**,
phrased as a consequence of what they just saw, never as a setup demand.

```
Rung 0  Zero integration      public data + earned questions + optional safe upload
   |    trigger: none. This is free, and it lands first.
Rung 1  Optional enrichment   one one-time, consented enhancement (a CSV, a few names,
   |                          a wider public read). Still no persistent connection.
   |    trigger: "we saw a pattern; a small drop of your own data confirms it."
Rung 2  Connected intelligence one live OAuth/API connection to a real system.
   |                          Cross-signal, current, actionable in place.
   |    trigger: "the outside view has a ceiling; connect one thing and we cross it."
Rung 3  Longitudinal intel     sustained connection over time: trend, anomaly, forecast,
        relationship flywheel. trigger: "you fixed something; only time proves it worked."
```

**Design rules for the ladder:**
- **Insight-first, always.** Every rung is sold by the *insight it unlocks*, shown as a
  concrete teaser drawn from what the entrepreneur just saw, not by the data it needs.
  The ask is a footnote to the promise.
- **One rung at a time.** Never present rung 2 as the entry price. Never show an
  integration list before an insight.
- **Rungs can be skipped or missing.** Finance's rung 1 is honestly weak; say so and jump
  to rung 2. Do not fabricate symmetry.
- **Upload is not connection.** A rung-1 upload grants a one-time read, never ongoing
  processing or enrichment. Climbing to rung 2 is a fresh, explicit consent.
- **Consent fail-closed at every rung.** No rung silently widens data scope; each is its
  own opt-in, each reversible, per the masterplan privacy posture.

Consolidated view of the *first two* rungs across lenses (the free and near-free tier,
which is where seduction happens):

| Lens | Rung 0 first wow (zero setup) | Rung 1 optional enrichment |
|---|---|---|
| First Five | A grounded, verifiable observation on the public site | (none needed) |
| Reputation / Findability | Public identity vs. claimed identity; share-preview gap | Themes across the wider public review set |
| Marketing | Funnel-completeness + public ad presence + channel-belief gap | One-time campaign/spreadsheet sanity check |
| Finance | Public register facts + self-estimate frame **(labelled a guess)** | Weak: one-time CSV replaces the guess (flag) |
| Customer / CX | Public review themes + felt-vs-shown gap | One-time theme extraction of own support export |
| Competition / Market | Public side-by-side on one named rival | 3 to 5 rivals, category-level public patterns |
| Surprising | Ghost Town / What-search-thinks-you-are | (recomposition only; no new data) |

---

## 3. The cross-lens "minutes-to-first-wow" principle

One principle governs every lens:

> **The first true, verifiable, mildly surprising observation must reach the
> entrepreneur within roughly one to two minutes of entering nothing but a URL, before
> any question and before any data request. The wow is recognition, not spectacle.**

Operationalised:

1. **Public read runs first, silently.** No "connect to begin", no empty dashboard, no
   loading gate. The entrepreneur types a URL and the surface is read.
2. **Land one observation, evidence attached.** Every wow carries a locator the
   entrepreneur can open and check. Evidence-bound wow beats magic-trick wow; the
   masterplan forbids the score, and the *"Herken je dit"* recognition gate is the real
   dopamine.
3. **Then, and only then, one earned question.** Phrased as sharpening what they just
   saw. A declined question still leaves them with the free insight.
4. **One wow per lens, then a door.** "Nog een lens" offers the next facet; never a
   firehose of ten findings, never a re-prompt on decline.
5. **Upgrade pull, not upgrade gate.** The move to any higher rung is teased by a
   specific consequence of the current insight (*"we saw X; connect Y and we show Z"*),
   so the entrepreneur is pulled by the payoff, not pushed by the ask.
6. **Honest thinness beats fake depth.** When a lens has little public material (a new
   B2B firm, no reviews, no register filing), the correct move is to say so and offer a
   different lens, not to manufacture a finding. Credibility is the whole product.

---

## 4. Anti-patterns (explicitly rejected)

These are the designs WS-6 rejects on the record.

1. **The data wall / setup-first onboarding.** "Connect your accounts to begin."
   **Rejected.** It inverts the strategic principle; the entrepreneur leaves before any
   value. Every lens must produce its first insight at rung 0.
2. **The empty-state dashboard.** Zeros, skeletons, and placeholders waiting for data.
   **Rejected.** An empty dashboard is a promise of future value; Maculis owes value now.
3. **The score / verdict.** A number, a grade, a gauge. **Rejected** by the lens
   contract itself. It is cheap wow that hollows out trust and cannot be evidence-bound.
4. **Fake precision from thin data.** Presenting the Finance back-of-envelope as
   analysis, or review sentiment where there are no reviews. **Rejected.** Label guesses
   as guesses; abstain rather than dress up.
5. **The questionnaire gauntlet.** Twenty profiling questions before the first insight.
   **Rejected.** Questions are earned by a prior observation and capped at 1 to 3 per
   lens, each optional.
6. **Enrichment for its own sake.** Adding an integration that changes no decision (a
   fifth review platform, a vanity follower count). **Rejected.** Every rung must unlock a
   decision, or it does not exist. See the Finance rung-1 and Reputation-beyond-Search-
   Console notes.
7. **Consent laundering.** Treating a one-time upload as licence for ongoing processing
   or person-level enrichment. **Rejected** by the masterplan's consent-fail-closed and
   no-enrichment posture. Each rung is its own explicit, reversible opt-in.
8. **Vanity metrics without a decision.** Follower counts, visit counts, "you rank #4"
   with nothing to do about it. **Rejected.** Every observation attaches a locator and,
   where it can, a next step.
9. **Creepy competition.** Person-profiling a rival's staff, scraping behind logins.
   **Rejected.** Competition lens stays at public, org-level storefront material only.

---

## 5. Honest flags register (consolidated)

Per the required critical stance, on the record:

- **Finance zero-integration is thin as "finance intelligence" and must be labelled a
  frame, not a finding.** Its register facts are real but shallow; its arithmetic is the
  entrepreneur's own guess reflected back. Credible only if honestly framed. **Its
  rung-1 enrichment is near-worthless**; the honest path jumps from the zero frame
  straight to connected books (rung 2), where the entire value lives.
- **Customer / CX zero-integration is conditional on public review volume.** Strong for
  consumer businesses, **thin for young or B2B firms with no public reviews.** When
  reviews are absent, say so and fall back to Reachability; do not manufacture sentiment.
- **Reputation / Findability enrichment stops adding value after Search Console.**
  Connecting Search Console (real queries and impressions) is a large jump; piling on
  rank-trackers and extra review platforms after it is diminishing returns for an SMB.
- **Marketing zero mode sees funnel shape and public ad presence, not performance.** Do
  not imply outside-in visibility into spend or conversion. That is a rung-2 unlock.
- **Competition is strong but has a hard public-only ceiling.** All value must come from
  material a prospective customer could already see.
- **Every "ask for data first" framing is rejected** (Section 4, item 1). No lens in this
  document gates its first insight behind a connection, an upload, or a questionnaire.
- **Where a lens genuinely has nothing to say at rung 0** (no site, no listing, no
  reviews, no register), the honest output is `Closed(reason)` plus an offer of a
  different lens, never a fabricated finding.

---

## 6. Handoff

This zero-integration strategy is designed to compose with the parallel EPIC-2
workstreams: the lens-universe portfolio and ranking (WS-7 / WS-8), the Finance and
Marketing deep dives (whose real-value tiers become rung 2 and 3 here), the wow-moment
design (WS-14, which this document feeds with per-lens rung-0 first-wow specs), the
integration opportunity matrix (WS-12, which inherits the ladder's rung-2 connection
list), and the growbrain / relationship-flywheel bridge (WS-15, which is the rung-3
longitudinal payoff). Nothing here changes product code or provider posture; it sets the
product law that every lens ships a credible, honest, evidence-bound rung 0 first.
