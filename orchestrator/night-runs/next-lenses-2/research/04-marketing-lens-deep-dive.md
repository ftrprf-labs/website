# Marketing Lens — Deep Dive (Public Intelligence, Voluntary Data, Couplings)

**EPIC-2 WS-4 (MAC-111) — analysis/read-only**

**Run:** Maculis "Next Lenses & Intelligence Strategy" — second night run (`next-lenses-2`).
**Scope:** Design a Maculis "Marketing Lens" that shows an entrepreneur something essential about their marketing they had not seen — evidence-bound, no dashboard, privacy-first, restrained. Grounded provider/API research on what is observable from public sources, what a user can voluntarily add, and which couplings earn their integration.
**Method:** Read-only desk research against **official vendor/developer domains only** (`developers.google.com`, `support.google.com`, `adstransparency.google.com`, `developers.facebook.com`, `facebook.com`, `transparency.meta.com`, `developers.hubspot.com`, `shopify.dev`, `developers.trustpilot.com`). All access dates **2026-08-15**.
**Constraint honoured:** No accounts created, no credentials acquired, no app submitted for review, no DPA accepted. Every such step is listed under **Human Actions** and left for a human.
**Non-repetition:** This document deliberately does **not** repeat the first run's messaging/enrichment work (`next-lenses/research/03-provider-api-research.md`, MAC-103 — Twilio/SendGrid/WhatsApp/Meta messaging + person-enrichment privacy) nor the website-presentation copy strategy (`next-lenses/research/04-website-presentation.md`, MAC-104) nor the First Five lens contract (`01-first-five-next-lenses.md`, MAC-101). It builds on their principles (evidence-bound, fail-closed, no score dashboard, privacy load-bearing) and applies them to the **marketing** surface specifically.

> **Sourcing caveat (read first).** All findings below are drawn from **official-domain search indexing (snippets of official developer/help pages)**, not full-page `WebFetch` reads. Full-page fetches to developer domains (notably `developers.facebook.com`, and Google/Shopify/HubSpot developer docs) were **not performed and are expected to be proxy-restricted** as they were in the prior run (MAC-103). Every claim is tied to an official URL in the Provenance Table, but **API quotas, rate limits, access tiers, and pricing change frequently and are region-specific. Before any build or commercial commitment, a human must open each cited URL and confirm the exact current figure.** Numbers here are directionally correct as of the access date and must not be treated as a contract.

---

## 1. Executive Summary

The instinct behind a "Marketing Lens" is to connect every ad and analytics platform and render a dashboard. That is the wrong product and the wrong stance. This research argues the **opposite**:

1. **A large, defensible Marketing Lens can ship with zero integrations.** The public marketing surface of a business — its own website head/structured data, its social presence, its review-platform footprint, its ad-transparency footprint, and its field performance data (Core Web Vitals via CrUX) — is observable **without a single login or credential**, using public pages and a small number of free/keyed Google APIs. This is where the "something you had not seen" lives for most entrepreneurs.

2. **Most couplings are low value and should be killed.** Of the eight providers surveyed, only **two** (Google Search Console, and voluntarily-supplied first-party context) clear the bar of *high insight, low creepiness, low integration cost, defensible consent*. GA4, Google Ads, Meta Marketing, HubSpot, and Shopify each carry heavy OAuth/App-Review/DPA overhead and, more importantly, mostly re-surface data the entrepreneur **already owns and sees**. A lens that tells you what your own GA4 already tells you is not a lens; it is a worse dashboard.

3. **The single highest-value coupling is Google Search Console.** It is the one dataset that (a) the entrepreneur almost always has but rarely reads, (b) reveals a genuine blind spot — *the gap between the queries you think you rank for and the queries people actually reach you with* — and (c) is read-only, first-party, and consent-clean (the owner authorises access to their own property).

4. **Competitor "spying" via ad-transparency APIs is a trap.** Meta Ad Library and Google Ads Transparency Center are legitimate public sources, but pointing them at *competitors* turns the product into a surveillance tool, invites noisy/unreliable inference, and corrodes the restrained, privacy-first brand. Use ad-transparency **only to reflect the entrepreneur's own ad footprint back to them** ("here is what the public can see about your advertising"), never to profile others.

**One-line strategy:** Ship a **zero-integration Marketing Lens** built on the business's own public surface plus a handful of voluntary questions; offer **exactly one** first opt-in coupling (Google Search Console, read-only) as the deepening step; treat every other ad/analytics API as **deferred and justified-per-case**, not adopted by default.

---

## 2. Public-Source Intelligence (no login)

What can be observed about a business's marketing from public surfaces alone, and — critically — **what is reliably observable versus guesswork**. The lens must only speak from the "reliable" column; the "guesswork" column is where competitors' tools overclaim and where Maculis must stay silent.

### 2.1 The business's own website surface (fully reliable)

Everything in the document `<head>` and structured data is public and self-authored, so it is **evidence-grade** and tester-verifiable (they can view-source themselves). This overlaps with, but is narrower and more marketing-flavoured than, the First Five "Findability Basics" lens (MAC-101 Lens E).

| Observable | Reliability | Marketing meaning |
|---|---|---|
| `<title>`, meta description | **Reliable** | The literal words Google shows in the results snippet. Often nobody ever wrote them deliberately. |
| Open Graph / Twitter Card tags | **Reliable** | Exactly how a shared link renders on social. Missing/blank = links share as grey boxes. |
| JSON-LD structured data (`Organization`, `LocalBusiness`, `Product`, `Review`/`AggregateRating`, `FAQPage`, `BreadcrumbList`) | **Reliable** | Whether the site is eligible for rich results (stars, FAQ accordions, sitelinks). Google supports a defined gallery of types; presence is a fact, *display* is not guaranteed. |
| Canonical tags, `robots.txt`, `sitemap.xml`, `hreflang` | **Reliable** | Whether the site is technically findable and whether language/region targeting is set. |
| Presence of analytics/pixel tags in page source (e.g. a GA tag, a Meta pixel) | **Reliable that a tag exists; NOT reliable about what it does** | Can honestly say "a tracking tag is present"; must **not** infer audiences, spend, or performance from its presence. |

**Guesswork (do not surface):** inferring traffic volume, conversion rate, ad spend, or "how well marketing works" from page source. None of that is in the HTML. A lens that claims it is lying.

### 2.2 Google rich-results / SERP appearance (reliable via official tooling)

Google's own **Rich Results Test** and the documented **structured-data search gallery** define exactly which rich results a page is *eligible* for. Eligibility is reliably observable from the markup; **actual display in search is explicitly not guaranteed by Google even with valid markup**, so the lens may say "your markup makes you eligible for X" but never "you will appear as X." Note Google's own guidance: `Review`/`AggregateRating` markup is powerful but abuse-prone and policy-restricted (self-serving reviews are disallowed) — the lens should flag *presence and validity*, not encourage fabricated ratings (consistent with MAC-104 §3.3's rejection of fake ratings).

### 2.3 Core Web Vitals / field performance (reliable, free, keyed API)

The **PageSpeed Insights API** and **Chrome UX Report (CrUX) API** expose real-world field performance (LCP, INP, CLS) and Lighthouse lab audits for any public URL. Both are **free** but require a **Google Cloud API key** (a key, not user OAuth — no access to anyone's account, only public field data). CrUX data is aggregated and anonymised across real Chrome users; it exists only for URLs with enough traffic to meet Google's privacy threshold, so **absence of CrUX data is itself a signal** ("not enough traffic to report," never "the site is broken"). This is a genuine marketing insight because slow real-world performance silently suppresses conversion, and most entrepreneurs have never seen their *field* numbers (only the greener lab score).

### 2.4 Social presence (partially reliable)

Public profile existence, handle consistency, follower counts, and recency of posting are observable by visiting public profiles. **Reliable:** does a linked, active profile exist; is the handle consistent with the brand; is the newest public post recent. **Guesswork (do not surface):** engagement quality, audience demographics, reach, or "is their social working" — these require private analytics and are not honestly inferable from a public profile. Automated scraping of social platforms also frequently violates their terms; the lens should read only what a normal visitor sees and prefer *the business's own linked profiles*, not discovery/crawling.

### 2.5 Review-platform public footprint (reliable for the business's own listings)

- **Trustpilot** exposes a **public Business Units API** (API key / Client ID only, no OAuth) that returns a business unit's aggregate rating and a public list of reviews **without customer emails or order IDs**. This is reliable, aggregate, and non-personal.
- **Google reviews / Google Business Profile**: the aggregate star rating and review count are publicly visible on a business's Google listing. Programmatic access to *review content* requires the approved **Google Business Profile API** (see §4), but the public aggregate is observable to any visitor.

**Reliable:** aggregate rating, review count, presence/absence of a claimed listing, recency of the newest public review. **Guesswork (do not surface):** sentiment analysis of individual reviews, "why" a rating is what it is, or attributing reviews to named individuals (privacy — see §6).

### 2.6 Ad-transparency footprint (reliable existence, USE WITH CARE)

Legally-mandated ad-transparency registries make a business's *own* advertising publicly inspectable:

- **Meta Ad Library** (`facebook.com/ads/library`) — a public, searchable library of ads currently running across Meta platforms. In the **EU and UK**, ads of *any* type delivered in the past year are searchable (a DSA transparency requirement); worldwide, only social-issue/electoral/political ads have deep 7-year history. The **Ad Library API** requires a confirmed Facebook identity and (for political/issue analysis) the same authorisation flow as running political ads — a meaningful gate.
- **Google Ads Transparency Center** (`adstransparency.google.com`) — searchable by advertiser or website name, filterable by region and date; shows verified advertisers' legal/trademark name and location, and a "verified" badge for those who completed advertiser verification.

**Reliable:** whether the business is *currently running public ads*, roughly what creatives/formats are live, and (in the EU/UK) recent history. **Legitimate lens use:** reflect the entrepreneur's **own** footprint back to them — "here is what any member of the public, including a competitor, can already see about your advertising." That is a real, often-surprising insight and it is *their own data*.

**Guesswork and creepiness (kill this):** using these registries to profile **competitors** — spend estimates, strategy inference, "what your rival is doing." Ad-transparency libraries do not reliably show spend for non-political ads, so competitor inference is both **noisy/unreliable** and **off-brand surveillance**. See §6.

### 2.7 What is NOT reliably observable from public sources (the guesswork frontier)

The lens must stay silent on all of these, because competitors' "audit" tools overclaim exactly here:
- Traffic volume, sessions, bounce/conversion rates (private analytics).
- Ad spend, ROAS, CAC (private billing).
- Email list size, open/click rates (private ESP).
- Attribution ("which channel drives sales").
- Keyword rankings at scale (SERP position is personalised, geo/time-variable, and rank-tracking is estimation, not fact).
- Audience demographics or intent.

---

## 3. Voluntary Data the Entrepreneur Can Add (a few high-value inputs)

The design principle from MAC-101/104 carries over: **precision over recall, ask for little, make each input earn exponential clarity.** The goal is a *tiny* set of self-declared context that turns public observations from "facts about your site" into "facts measured against what you were trying to do." Voluntary data is consent-clean by construction (the user typed it about their own business) and needs no DPA.

The highest-value voluntary inputs (target: five or fewer):

1. **Who is this for, in one sentence?** (the intended audience). Lets the lens judge whether the public promise, structured data, and review language actually address that audience — turns "your title tag says X" into "your title tag says X, but you told us you serve Y."
2. **What is the one action you want a visitor to take?** (buy / book / enquire / sign up). Lets the lens check whether that action is publicly reachable and prominent — a marketing-flavoured Reachability check.
3. **Which one query/phrase do you most want to be found for?** A single string. This is the pivot that makes Google Search Console (§4) exponentially more insightful: it lets the lens contrast *the phrase you want* against *the phrases you actually get found for*. Even without GSC, it sharpens the title/description observation.
4. **Where do you think your customers find you today?** (word of mouth / search / social / ads / marketplace). A guess, deliberately. The lens's job is to show where *the public evidence* agrees or disagrees with that belief — the "something you had not seen" moment.
5. **(Optional) Your main competitor or reference brand's website.** Used **only** for the entrepreneur's own benefit and only on public, self-authored surfaces (structured data, title, OG). Flagged as sensitive; see §6 on why this must not become competitor surveillance.

Everything beyond this set (revenue, budgets, customer lists, CRM contacts) is explicitly **out of scope for the voluntary tier** — it raises PII/consent stakes without proportional lens value.

---

## 4. Couplings — Value-Ranked (choose on value, not because an API exists)

Each coupling is scored on **Insight uplift** (does it reveal a genuine blind spot, beyond what the owner already sees?), **Integration cost** (OAuth/App-Review/DPA/verification burden), **Consent/privacy posture**, **Noise risk**, and a **Verdict**. Ranked by value, highest first. The critical stance is applied: most are **killed or deferred**.

| Rank | Provider / API | Auth & access gate | Public pricing | EU / privacy | Insight uplift | Noise risk | **Verdict** |
|---|---|---|---|---|---|---|---|
| **1** | **Google Search Console API** (`searchanalytics.query`) | OAuth 2.0; owner must already be a verified property owner; read-only scope (`webmasters.readonly`). Free. Sensitive-scope OAuth verification if public app. | **Free.** QPS/QPM/QPD quotas (per docs: ~1,200 QPM/site, project-level 40,000 QPM / 30M QPD). | First-party: the owner authorises access to **their own** search data. Cleanest consent story of any coupling. | **Highest.** Reveals the query↔page gap: the searches people actually reach you with vs. what you think. Almost nobody reads this. | Low (Google's own aggregated field data). | **ADOPT as the one first coupling.** Pairs directly with voluntary input #3. |
| **2** | *(Voluntary first-party context — §3)* | None (user types it). | Free. | Consent-clean by construction. | High as a **multiplier** on every other observation. | None. | **ADOPT.** The cheapest, safest "coupling" of all. |
| 3 | **Google Analytics 4 — Data API (v1)** | OAuth 2.0; `analytics.readonly`; user must grant access to their GA4 property. Free (token-based quota; most calls ≤10 tokens; no paid tier for standard). | **Free** (quota, not paid). | First-party but GA4 itself carries the entrepreneur's cookie-consent/ePrivacy obligations; Maculis reading it inherits sensitivity. | Medium — but **the owner already has this dashboard.** Re-surfacing GA4 mostly duplicates what they see. | Medium (GA4 data is noisy, consent-mode gaps, bot traffic). | **DEFER.** Low marginal insight over the user's own GA4; adds OAuth + a data-sensitivity surface for little "unseen" value. Only revisit if a lens finds a *specific* GA4-only insight worth the cost. |
| 4 | **Meta Marketing / Graph API** (`ads_read`) | OAuth + **App Review** + **Business Verification**; two-tier access (Dev / Standard); must make a successful call per requested permission. 2026 out-of-cycle changes ongoing. | Free API; ad spend is the user's. | Meta as processor; US-transfer via DPF; heavy. | Medium, but the owner sees this in Ads Manager already. | High for anything inferential. | **KILL for v1.** App Review + Business Verification is disproportionate; re-surfaces owned data. |
| 5 | **Google Ads API** | Developer token (starts Test-only, needs approval for Basic/Standard); OAuth; must link a manager account. | Free API; spend is the user's. | First-party but heavy. | Medium; owner already has Google Ads UI. | Medium–High (attribution). | **KILL for v1.** Developer-token approval + linkage overhead for data the owner already sees. |
| 6 | **HubSpot CRM API** | OAuth 2.0 scopes; free developer/test account; marketplace app rate-limited (~110 req/10s per install). | Free dev tier; product itself paid. | Controller/processor; CRM = PII-heavy. | Low for a *marketing* lens (CRM is sales/relationship data — that is the Relationship Workspace's domain, MAC-103, not this lens). | Medium. | **KILL for this lens.** Wrong product surface; PII-heavy; belongs to Relationship, not Marketing. |
| 7 | **Shopify Admin API** | OAuth (public app) or admin-generated token (custom app); least-privilege scopes; REST 40 req/min/store (×10 Plus), GraphQL cost-based. | Free API; Shopify plan is the user's. | First-party commerce data; PII (orders/customers) if broad scopes. | Medium **only for commerce businesses**; irrelevant to service/local businesses. | Medium. | **DEFER, segment-gated.** Only meaningful for a merchant; even then order/customer scopes are PII-heavy. Not a default coupling. |
| 8 | **Trustpilot Business API / Google Business Profile API** | Trustpilot: public Business Units API by API key (aggregate, non-personal) — **light**. GBP: application + approval, 0→300 QPM on approval, review content access gated. | Trustpilot public read: free/keyed. GBP: free but approval-gated. | Trustpilot public endpoint returns **no** customer emails/order IDs (non-personal). GBP review content can include reviewer identity (PII). | Low–Medium; aggregate rating is already public (§2.5) without any coupling. | Low for aggregates. | **Trustpilot public aggregate: FOLD INTO PUBLIC TIER (no coupling needed).** GBP review-content API: **DEFER** (approval + reviewer-PII cost not justified for v1). |

### 4.1 The couplings we deliberately reject, and why

- **"Connect every ad platform."** Rejected outright. It maximises integration cost, consent surface, and noise while minimising *unseen* insight (the owner already has Ads Manager and Google Ads). It also pushes the product toward the score-dashboard pattern MAC-104 §1.4 explicitly rejects.
- **GA4 as a default.** Rejected for v1. The entrepreneur's own GA4 is the baseline they already stare at; a lens that echoes it adds an OAuth-and-privacy burden for near-zero novelty.
- **CRM (HubSpot) in a Marketing lens.** Wrong product. CRM/PII belongs to the Relationship Workspace (MAC-103), gated by that run's consent-fail-closed discipline. Pulling it into a marketing lens conflates surfaces and multiplies PII risk.
- **Competitor-pointed ad-transparency.** Rejected on brand and reliability grounds (§6).

---

## 5. Zero-Integration Marketing Lens — Design

The v1 lens ships with **no OAuth, no credentials, no DPA** — only the business's public surface (§2) plus the five voluntary questions (§3). It inherits the First Five lens contract (MAC-101): observation + mandatory evidence + two strength buckets (`clear`/`notable`, never a number) + fail-closed silence when evidence is absent or ambiguous.

### 5.1 The single question the lens answers

> **"Does the public evidence of your marketing match what you are trying to do?"**

Not a score. Not "how good is your marketing." One alignment question, evidence-bound, that surfaces a gap the entrepreneur had not seen.

### 5.2 What it reads (all public, all tester-verifiable)

1. The homepage + one interior page `<head>`: title, meta description, OG/Twitter tags, JSON-LD types present.
2. `robots.txt`, `sitemap.xml`, canonical — findability facts only.
3. Rich-results **eligibility** from the structured data present (via documented gallery rules).
4. Field performance from **CrUX / PageSpeed Insights API** (free, keyed — the one "API" the zero-integration tier uses, and it touches nobody's account).
5. Public review aggregate where the business links its own Trustpilot/Google listing (rating + count + recency only).
6. The business's **own** ad-transparency footprint (existence of live public ads), reflected back, never competitors'.

### 5.3 The reveal (illustrative copy, no dash as a stylistic pause, labelled Example)

The output is one or two grounded observations, each citable, framed against the voluntary inputs. Following MAC-104's restrained reveal:

> **Marketing Lens** *(Example)*
> One question: does what the public can see match what you are trying to do?
>
> You told us you want to be found for **"handmade oak tables"** and you want visitors to **book a showroom visit**. The words search engines show for your homepage are your business name and the phrase **"quality furniture."** The phrase you care about does not appear in your title or description, and a booking link is not on the first screen. Here is where we looked: your page title, your meta description, and your homepage. Nothing here came from tracking you or your visitors.

The closing line does the privacy reassurance at the moment of impact, exactly as MAC-104 §5.2 recommends.

### 5.4 Fail-closed cases (must produce silence, tested as negative controls)

- Site is a client-rendered shell that did not return head content → `Closed(unreadable)`, never a fabricated finding.
- No structured data and no dated content → say nothing about rich results or freshness.
- CrUX has no data for the URL → "not enough public traffic to report field performance," never "your site is slow."
- No public reviews and no linked listing → **absence is not a finding**; the lens does not say "you have no reviews" as a defect.
- Voluntary inputs skipped → the lens degrades to pure public observation, still evidence-bound, and asks nothing twice (no dark patterns, per MAC-101 §3.4).

### 5.5 Why this is a lens and not a dashboard

It shows **one** alignment, chosen, with evidence, and stays quiet otherwise. It never aggregates the observations into a marketing "grade," never charts a trend, and never displays raw signals or internal method (MAC-104 §4.2). The WOW is the *recognition* — "I never noticed the words Google actually shows are not the words I care about" — not a data fireworks show.

---

## 6. Critical Stance — Kill / Flag (required)

### 6.1 Couplings killed or deferred (summary of §4)
- **Killed for v1:** Meta Marketing API, Google Ads API, HubSpot (wrong-surface + PII), competitor-pointed ad-transparency.
- **Deferred, case-by-case:** GA4 Data API (low marginal insight), Shopify (segment-gated to merchants), Google Business Profile review-content API (approval + reviewer PII).
- **Folded into the free public tier (no coupling):** Trustpilot public aggregate, public review counts, ad-transparency *existence* of the owner's own ads.
- **Adopted:** Google Search Console (one, read-only, first-party) + voluntary context.

### 6.2 Where public data is too noisy to trust (lens must stay silent)
- **Competitor ad spend / strategy** from ad-transparency libraries: non-political ad spend is not reliably disclosed; inference is guesswork. Do not surface.
- **Sentiment / "why" behind a review score:** aggregate rating is a fact; interpreting individual reviews is not. Surface the aggregate only.
- **Keyword rankings:** SERP position is personalised and volatile; rank "tracking" is estimation. The lens uses *the owner's own GSC query data* (a fact about their impressions) instead, never a scraped rank.
- **Anything inferred from the mere presence of a pixel/tag:** "a tag exists" is reliable; "your retargeting works" is not.
- **Social engagement/reach from public profiles:** existence and recency are reliable; performance is not.

### 6.3 Creepy / consent issues flagged
- **Competitor surveillance is the central temptation and must be designed out.** Voluntary input #5 (a reference brand) must be strictly limited to the *entrepreneur's own learning* on *public, self-authored* surfaces, must be labelled sensitive, and must never build a competitor profile, estimate their spend, or store their data beyond the run. The safe framing is "compare your public promise to a reference you admire," not "spy on your rival." If this cannot be held to that line, **cut input #5 entirely.**
- **Tracking-about-tracking.** The lens reads whether a tracking tag is *present* (public HTML) but must never itself track the entrepreneur's visitors, and must say so at the reveal (§5.3 closing line).
- **Review-content PII.** Trustpilot's public endpoint deliberately omits customer emails/order IDs; the lens must use only that non-personal aggregate. Google Business Profile review *content* can carry reviewer identity — deferred precisely because pulling named reviewers into a marketing tool is disproportionate.
- **Scraping vs. reading.** The lens reads what a normal visitor/owner-authorised API returns; it must not crawl social platforms or third-party sites in ways their terms prohibit, and must prefer the business's own linked profiles over discovery.
- **GA4/Ads data sensitivity.** Even first-party, connecting analytics/ads inherits the entrepreneur's own consent-mode/ePrivacy obligations; another reason v1 avoids them.

---

## 7. Provenance Table

Every load-bearing claim traces to one of these official-domain URLs. **All accessed 2026-08-15.** Findings are from **official-domain search indexing (page snippets)**; full-page `WebFetch` was not performed and is expected to be proxy-restricted (see Sourcing Caveat). A human should open each URL to confirm exact live figures before build or commitment.

| # | Claim / topic | Official source URL | Access date |
|---|---|---|---|
| 1 | Meta Ad Library API: access requires confirmed FB identity / political-ads authorization; deep 7-yr history for issue/political ads; EU/UK all-ad-type history past year | https://www.facebook.com/ads/library/api | 2026-08-15 |
| 2 | About the Meta Ad Library (public searchable library of running ads) | https://www.facebook.com/business/help/2405092116183307 | 2026-08-15 |
| 3 | Meta Ad Library research tools overview | https://transparency.meta.com/researchtools/ad-library-tools | 2026-08-15 |
| 4 | Meta Marketing API 2026 out-of-cycle changes (ongoing) | https://developers.facebook.com/documentation/ads-commerce/marketing-api/out-of-cycle-changes/occ-2026 | 2026-08-15 |
| 5 | Google Ads Transparency Center: search by advertiser/website, filter region/date | https://adstransparency.google.com/ | 2026-08-15 |
| 6 | Google advertiser verification: legal/trademark name + location, verified badge | https://support.google.com/adspolicy/answer/9703665?hl=en | 2026-08-15 |
| 7 | Google Ads transparency / DSA regional disclosure requirements | https://support.google.com/adspolicy/answer/13733850?hl=en | 2026-08-15 |
| 8 | GA4 Data API v1 quotas: token-based, Core/Realtime/Funnel, most calls ≤10 tokens; no quota-increase for standard | https://developers.google.com/analytics/devguides/reporting/data/v1/quotas | 2026-08-15 |
| 9 | GA4 Data API v1 REST reference (OAuth, methods) | https://developers.google.com/analytics/devguides/reporting/data/v1/rest | 2026-08-15 |
| 10 | Search Console API: `searchAnalytics.query` (query/page/impressions data) | https://developers.google.com/webmaster-tools/v1/searchanalytics/query | 2026-08-15 |
| 11 | Search Console API: OAuth 2.0 authorization required | https://developers.google.com/webmaster-tools/v1/how-tos/authorizing | 2026-08-15 |
| 12 | Search Console API usage limits (QPS/QPM/QPD per site/user/project) | https://developers.google.com/webmaster-tools/limits | 2026-08-15 |
| 13 | OAuth 2.0 scopes for Google APIs (incl. `webmasters.readonly`, `analytics.readonly`) | https://developers.google.com/identity/protocols/oauth2/scopes | 2026-08-15 |
| 14 | Meta Marketing API authorization (OAuth, permissions) | https://developers.facebook.com/docs/marketing-api/get-started/authorization | 2026-08-15 |
| 15 | Meta Graph API access levels (Dev / Standard tiers) | https://developers.facebook.com/docs/graph-api/overview/access-levels/ | 2026-08-15 |
| 16 | Meta permissions reference (`ads_read`, App Review) | https://developers.facebook.com/docs/permissions/ | 2026-08-15 |
| 17 | HubSpot API usage guidelines & rate limits | https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines | 2026-08-15 |
| 18 | HubSpot private vs public apps (OAuth, marketplace ~110 req/10s per install) | https://developers.hubspot.com/blog/hubspot-integration-choosing-private-public-hubspot-apps | 2026-08-15 |
| 19 | Shopify API access scopes (least privilege) | https://shopify.dev/docs/api/usage/access-scopes | 2026-08-15 |
| 20 | Shopify API authentication (OAuth public apps / admin custom-app tokens) | https://shopify.dev/docs/api/usage/authentication | 2026-08-15 |
| 21 | Shopify REST Admin rate limits (40 req/min/store, ×10 Plus); GraphQL cost-based | https://shopify.dev/docs/api/admin-rest | 2026-08-15 |
| 22 | Trustpilot developer portal (public vs private APIs) | https://developers.trustpilot.com/ | 2026-08-15 |
| 23 | Trustpilot Business Units API (public): reviews list, no customer emails/order IDs, API key | https://developers.trustpilot.com/business-units-api-(public)/ | 2026-08-15 |
| 24 | Trustpilot authentication (API key for public, OAuth for private) | https://developers.trustpilot.com/authentication | 2026-08-15 |
| 25 | Trustpilot Service Reviews API | https://developers.trustpilot.com/service-reviews-api/ | 2026-08-15 |
| 26 | Google Business Profile API limits (0 QPM = not approved, 300 QPM = approved) | https://developers.google.com/my-business/content/limits | 2026-08-15 |
| 27 | Google Business Profile API prerequisites (access request/approval) | https://developers.google.com/my-business/content/prereqs | 2026-08-15 |
| 28 | Google Business Profile API review data (batchGetReviews) | https://developers.google.com/my-business/content/review-data | 2026-08-15 |
| 29 | Google Ads API access levels (Test / Basic / Standard) | https://developers.google.com/google-ads/api/docs/api-policy/access-levels | 2026-08-15 |
| 30 | Google Ads API developer token (Pending → Test access, approval flow) | https://developers.google.com/google-ads/api/docs/api-policy/developer-token | 2026-08-15 |
| 31 | Google Ads API test accounts (no approved token needed for test) | https://developers.google.com/google-ads/api/docs/best-practices/test-accounts | 2026-08-15 |
| 32 | Google structured data intro (JSON-LD, how rich results work) | https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data | 2026-08-15 |
| 33 | Google structured-data search gallery (supported rich-result types) | https://developers.google.com/search/docs/appearance/structured-data/search-gallery | 2026-08-15 |
| 34 | Google Review snippet structured data (Review/AggregateRating policy, no self-serving reviews) | https://developers.google.com/search/docs/appearance/structured-data/review-snippet | 2026-08-15 |
| 35 | PageSpeed Insights API get-started (free, API key) | https://developers.google.com/speed/docs/insights/v5/get-started | 2026-08-15 |
| 36 | PSI + CrUX API codelab (field CWV data, key required) | https://developers.google.com/codelabs/chrome-web-vitals-psi-crux | 2026-08-15 |
| 37 | PageSpeed Insights API REST reference | https://developers.google.com/speed/docs/insights/rest | 2026-08-15 |
| 38 | schema.org (structured-data vocabulary) | https://schema.org/ | 2026-08-15 |

**Official sources cited: 38.**

---

## 8. Human Actions (only a human can do these — flagged, not performed)

MAC-111 created no accounts, acquired no credentials, submitted nothing for review, and accepted no DPA. The following are gated for a human:

1. **Confirm exact live figures.** Open each Provenance URL and verify current quotas, rate limits, access tiers, scopes, and pricing (they change and are region-specific; this run read snippets, not full pages).
2. **Google Cloud project + API key** for PageSpeed Insights / CrUX (the only "API" in the zero-integration tier). A key, not user data — but still a human provisioning step.
3. **Google Search Console coupling (the one adopted coupling):** create the OAuth client, request the `webmasters.readonly` scope, and complete **Google's sensitive-scope OAuth app verification** if distributed as a public app. Confirm the consent screen wording states read-only, first-party use.
4. **Legal / privacy sign-off** on: the voluntary-data questions (§3), the sensitive competitor-reference input #5 (or the decision to cut it), the "we do not track you or your visitors" claim, and the handling of any review aggregates. Update the privacy notice and RoPA before any coupling goes live.
5. **Decision to keep deferred/killed couplings deferred.** GA4, Google Ads, Meta Marketing, HubSpot, Shopify, and GBP review-content each require their own account, OAuth/App-Review/token-approval, and (where PII is involved) a DPIA + signed DPA before adoption. Do not adopt any of them without a specific lens-level insight that justifies the cost — the default is *not to connect*.
6. **Confirm the First Five lens contract** (`ftrprf-labs/maculis-first-five`) so §5's Marketing Lens plugs into the real observation/evidence/strength types rather than the proposed shape from MAC-101 §1.2.
7. **Brand/voice sign-off** on the reveal copy (§5.3), consistent with MAC-104's restrained register.

---

*End of MAC-111 (EPIC-2 WS-4). Read-only research; no accounts, credentials, or agreements were created; private repos not accessed.*
