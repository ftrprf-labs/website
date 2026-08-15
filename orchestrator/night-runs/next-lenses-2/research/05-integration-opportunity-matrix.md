# Integration Opportunity Matrix — Maculis Lens Portfolio

EPIC-2 WS-5 (MAC-112) — analysis/read-only

**Run:** Maculis "Next Lenses & Intelligence Strategy" autonomous night run (EPIC-2).
**Scope:** A real integration opportunity map across every candidate provider category that could feed a Maculis lens (finance, marketing, sales, reputation, findability, identity) — not just communication providers. This decides which couplings are worth building and which lenses they feed.
**Method:** Read-only desk research via **WebSearch restricted to official vendor / official-institution domains** (developer portals, official docs, official pricing/billing pages). All access dates **2026-08-15**. The comms row reuses EPIC-1 MAC-103 (`research/03-provider-api-research.md`) and was **not** re-researched.
**Constraint honoured:** No accounts created, no credentials acquired, nothing signed. Every account/verification/app-review/DPA is a **HUMAN ACTION**, flagged only (see §5).

> **Sourcing caveat (read first).** Findings are drawn from **official-domain search snippets** (indexed official pages), not full-page `WebFetch` reads — the same posture and same proxy limitation recorded in EPIC-1 MAC-103, where full-page fetches to several vendor domains were policy-blocked. Every row traces to an official URL in the Provenance Table (§6). **Pricing, quota, and rate-limit figures are directional as of the access date and must be confirmed by a human on the cited page before any commercial commitment** — rate cards and access tiers change frequently.

---

## 1. Intro & stance

Maculis lenses are **evidence-bound, fail-closed, privacy-first, and "wow within minutes without a connection"** (MAC-101, MAC-113). That product ethos is the lens through which every integration below is judged. An integration only earns "Build Now" if it is **cheap or free, low privacy risk, owner-consented or genuinely public, low-to-medium build cost, and produces a real reveal** — the opposite of "integrate everything."

The default answer here is deliberately **not** "Build Now." Most integrations in this map are more work than value, carry visitor/third-party PII and consent hazards, or sit behind partner-approval gates (Google Ads developer token, Meta/LinkedIn app review, Google Business Profile allowlist). Those are marked **Defer** or **Avoid** with a reason. For the finance lens specifically, the day-one path is **secure import (CSV/export), not a live API** (per MAC-110/MAC-113); the accounting/open-banking/payment APIs below are the *later* "connected intelligence" rung, hence Research Next, not Build Now.

**Lens shorthand used in the table:** Fin=Finance, Cash=Cashflow, Marg=Margin, Price=Pricing, Comm=Commercial performance, Mkt=Marketing, Find=Digital findability, Sales, Cust=Customer, Rep=Reputation, CX=Customer experience, Brand, Ops=Operations, Ident=Company identity (feeds all), RW=Relationship Workspace transport.

---

## 2. The matrix

Wide table — scroll horizontally. Priority legend: **Build Now** / **Research Next** / **Defer** / **Avoid**. Access date for every row: **2026-08-15**.

| # | Provider | Category | Official API | Auth | Data available | RT/Batch | Sandbox | Cost (public, directional) | Privacy / EU posture | Tech cx | Comm. value | Lens(es) fed | Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Exact Online** | Accounting | Yes (REST) | OAuth2 (auth-code only) | GL, invoices, transactions, contacts, divisions | Batch (poll) | Yes (demo/trial admin) | API free; needs paid Exact subscription | NL vendor, EU hosting | High | High | Fin, Cash, Marg, Price | Research Next |
| 2 | **Moneybird** | Accounting / Invoicing | Yes (REST) | OAuth2 or personal token | Invoices, contacts, ledger, bank, estimates | Batch + webhooks | Partial (own admin) | API free; needs paid Moneybird plan | NL, EU | Low-Med | High (SME) | Fin, Cash, Price, Comm | Research Next |
| 3 | **Twinfield** (Wolters Kluwer) | Accounting | Yes (SOAP + newer) | OpenID Connect / OAuth2 | Ledgers, transactions, invoices | Batch | Limited | Needs Twinfield subscription | NL, EU | High (legacy SOAP) | Med-High | Fin, Cash, Marg | Defer — legacy SOAP, accountant-oriented; Exact/Moneybird cover the SME market better |
| 4 | **GoCardless Bank Account Data** (ex-Nordigen) | Open banking | Yes (REST) | OAuth2 secret + end-user bank SCA | Balances, up to **24 mo** transactions, account-holder name/IBAN | Batch (PSD2-limited, ~4 refresh/day) | Yes (sandbox bank) | **Free AIS tier** + premium | Regulated **AISP**, EEA — strong | Med-High | Very High (cashflow) | Cash, Fin, Marg | Research Next — leading finance-spine candidate; PSD2 consent + 90-day re-consent is heavy |
| 5 | **Tink** (Visa) | Open banking | Yes (REST) | OAuth2 + bank SCA | Aggregated + enriched/categorised transactions, 3,400+ banks | Batch (up to 4×/day) | Yes (test providers) | Commercial / quote-based | Regulated, EU | Med-High | High | Cash, Fin | Defer — commercial pricing; GoCardless free tier is the cheaper first probe |
| 6 | **Mollie** | Payments | Yes (REST) | API key + OAuth (Mollie Connect) | Payments, refunds, settlements, methods, chargebacks | Realtime webhooks + batch | Yes (test-mode keys) | Per-transaction (merchant already pays); API free | NL, EU | Low-Med | High (NL-dominant) | Cash, Comm, Price | Research Next |
| 7 | **Stripe** | Payments | Yes (REST) | Secret/restricted keys + Connect OAuth | Payments, subscriptions, payouts, balance | Realtime webhooks | Yes (test mode / sandboxes) | Per-transaction; API free | US co., EU data options, DPF/SCC | Low-Med | High | Cash, Comm, Price | Research Next — adopt when the customer already uses Stripe; behind Mollie for NL SME |
| 8 | **Adyen** | Payments | Yes (REST) | API key (X-API-Key) + HMAC webhooks | Payments, settlement, reporting | Realtime webhooks + batch reports | Yes (test env) | Enterprise (interchange++) | NL, EU | Med-High | High (enterprise) | Cash, Comm | Defer — enterprise-grade; overkill for the SME lens portfolio |
| 9 | **Shopify** | Commerce | Yes (GraphQL Admin; REST legacy) | OAuth (apps) / admin token | Orders, products, customers, inventory, payouts | Realtime webhooks + batch | Yes (dev stores) | API free w/ Shopify plan | CA/US, EU data considerations | Med (GraphQL migration, versioned) | High | Comm, Marg, Price, Mkt | Research Next |
| 10 | **WooCommerce** | Commerce | Yes (WP REST `wc/v3`) | Consumer key/secret (Basic) or OAuth1.0a | Orders, products, customers | Batch (self-host; no native webhooks) | Any staging site | Free (self-hosted) | **Self-hosted — data stays with merchant** (privacy plus) | Med (per-site keys, install variance) | Med-High | Comm, Marg, Price | Defer — fragmented self-hosted installs, inconsistent reliability; support opportunistically |
| 11 | **Google Analytics Data API (GA4)** | Web analytics | Yes (REST) | OAuth2 / service account | Sessions, events, conversions, acquisition, audiences | Batch (token-bucket quotas, no increase) | Own property only | Free (quota-limited) | US; **visitor PII + consent-mode** concerns | Med-High | High | Mkt, Find, Cust | Research Next — high value but visitor-PII/consent posture must be resolved; owner-consented first-party |
| 12 | **Plausible Analytics** | Web analytics | Yes (Stats API v2) | Bearer API key | Aggregate pageviews, sources, goals | Batch (600 req/h) | Own site | Paid SaaS (or self-host) | **EU-hosted, cookieless, GDPR-friendly** — strong | Low | Med | Mkt, Find | Research Next — privacy-aligned; smaller install base |
| 13 | **Matomo** | Web analytics | Yes (Reporting API) | `token_auth` | Full analytics, aggregate + visitor logs | Batch | Own instance | Free self-host / paid cloud | EU cloud or self-host — GDPR-friendly | Low-Med | Med | Mkt, Find | Defer — fragmented installs; Plausible + GSC cover the privacy-first need more cleanly |
| 14 | **Google Search Console API** | Search console | Yes (REST) | OAuth2 | Search queries, impressions, clicks, avg position, indexing, sitemaps (16-mo) | Batch | Own verified property | **Free** | US, but data is **aggregate search performance — no visitor PII** | Med (OAuth + property verify) | High | Find, Mkt | **Build Now** |
| 15 | **Google Ads API** | Advertising | Yes (REST/gRPC) | OAuth2 + **developer token (approval)** | Campaigns, spend, conversions, keywords | Batch | Yes (test accounts, no approval) | API free (ad spend separate) | US, DPF | High (dev-token approval, MCC, RMF) | High | Mkt, Comm, Price | Defer — developer-token approval + per-account OAuth; heavy for the value at portfolio stage |
| 16 | **Meta Marketing API** | Advertising | Yes (Graph) | OAuth (user/system-user) + **App Review + Business Verification** | Ad insights, spend, audiences | Batch | Yes (dev-tier/test) | API free | US, DPF; heavy platform terms | High (App Review, ongoing review) | Med-High | Mkt, Comm | Defer — App Review + business verification is disproportionate |
| 17 | **LinkedIn Marketing API** | Advertising / Social | Yes (REST) | 3-legged OAuth + **partner/dev-program vetting** | Ad performance, some audience/insights | Batch | Dev tier | API free | US/MS, DPF | High (tiered access approval; some APIs restricted) | Med (B2B) | Mkt, Sales | **Avoid** — partner-approval gate + restricted APIs; low ROI for a lens layer |
| 18 | **HubSpot CRM API** | CRM | Yes (REST) | Private-app token (OAuth-based) / public OAuth | Contacts, deals, pipelines, activities, engagements | Realtime webhooks + batch | Yes (developer test accounts) | **Free tier exists**; paid scales | US; EU data-hosting option, DPF | Low-Med (private app is fast) | High | Sales, Cust, Comm, RW | Research Next |
| 19 | **Pipedrive** | CRM | Yes (REST) | API token / OAuth2 | Deals, contacts, pipeline, activities | Realtime webhooks + batch | Yes (sandbox accounts) | Paid CRM; API included | **EU (Estonia) hosting available** — privacy plus | Low | Med-High (SME) | Sales, Cust, Comm | Research Next |
| 20 | **Salesforce** | CRM | Yes (REST + Streaming) | OAuth2 | Full CRM objects, activities | Batch + streaming | Yes (sandboxes) | Enterprise | US, EU options, DPF | High | High (enterprise) | Sales, Cust | Defer — enterprise; HubSpot/Pipedrive fit the SME lens buyer |
| 21 | **Meta Graph — Instagram / FB Pages** | Social | Yes (Graph) | OAuth + **App Review** | Page/IG insights, posts, followers, engagement | Batch | Dev | API free | US, DPF; heavy | High (App Review, permissions) | Med | Mkt, Rep, Brand | Defer — App Review gate; inbound DM handling already covered in EPIC-1 comms |
| 22 | **Google Business Profile API** | Reviews | Yes (REST v4) | OAuth2 + **access-request approval (~14-day allowlist)** | Reviews, ratings, replies, Q&A, local insights | Batch | Own verified locations | Free | US; review content + **reviewer names = third-party PII** | High (access approval + verification) | High | Rep, CX, Find | Research Next — top value for a reputation lens; gated by Google approval + reviewer-PII minimisation |
| 23 | **Trustpilot API** | Reviews | Yes (REST) | API key (Client ID) public / OAuth2 private | Business reviews, star ratings, review counts | Batch | Docs/test | Public read limited; rich data needs paid Trustpilot plan | DK/EU | Low-Med | Med | Rep, CX | Defer — useful data behind a paid plan; narrower coverage than Google reviews |
| 24 | **Google Places API (New)** | Maps / Places | Yes (REST) | API key / OAuth | Place details, ratings, review counts, hours, categories | Realtime (per request) | None (live, billed) | Per-SKU usage billing (field-masked; monthly credit) | US; **third-party review PII** in payloads | Low-Med (field masks for cost) | Med | Rep, Find, CX | Research Next — cheap public-data probe for "how do you show up locally" without owner login; watch per-call cost + PII minimisation |
| 25 | **KVK API (Handelsregister)** | Company registry | Yes (REST) | **API key** (`apikey` header) | Company name, KvK/RSIN, address, SBI codes, establishments, status | Lookup / batch | **Yes — free test env, fictitious data** | Small per-query on paid plan; test env free | **NL official register, public data** — strong | Low | High (identity spine) | Ident (feeds ALL): Fin, Mkt, Sales, Ops | **Build Now** |
| 26 | **VIES VAT validation** (EU Commission) | Company registry | Yes (SOAP; test WSDL) | **None** (no account/key) | VAT-number validity + name/address (member-state dependent) | Realtime lookup | **Yes — official test service** | **Free** | Official EU service — strong | Low (SOAP; occasional downtime) | Med-High | Fin, Sales, Ident | **Build Now** |
| 27 | **Comms stack** — Twilio (SendGrid email + SMS/Verify) + WhatsApp Cloud API *(EPIC-1 MAC-103 summary)* | Comms | Yes | API key / OAuth / provider tokens | Email/SMS/OTP/WhatsApp send+receive, delivery events | Realtime webhooks | Yes (test creds) | Per-message (see MAC-103) | **Twilio EU residency (IE1), DPF** — strong; WhatsApp per-msg + verification heavy | Med (per-channel; WhatsApp verify heavy) | High | **RW transport** (not a lens data-source; the growbrain bridge / outreach layer) | Research Next — Twilio primary, WhatsApp phase-2, per EPIC-1 |

---

## 3. Build Now (max 3-4) — the ruthless shortlist

Only three integrations clear the bar. Each is **free or near-free, owner-consented or genuinely public, carries little/no third-party visitor PII, is low-to-medium build cost, and produces an immediate, evidence-bound reveal** — exactly the Maculis "wow within minutes" test.

1. **KVK API (Handelsregister)** — *the identity spine.* Free test environment with fictitious data (no account gate to prototype), simple API-key auth, and **public** company data (name, KvK/RSIN, SBI activity codes, establishments, status). It feeds *every* lens by anchoring the subject to a real legal entity, and it carries essentially no privacy hazard because the register is public. Lowest complexity, highest leverage. Build it first.
2. **VIES VAT validation (EU Commission)** — *free, no account, trivial.* No credentials at all, an official EU test service, instant validity + (where the member state returns it) name/address. Pairs with KVK to give a finance/B2B lens a real "we confirmed this is a live registered VAT entity" reveal. Only watch item: SOAP quirks and occasional service downtime → fail-closed on error, never fabricate a "valid".
3. **Google Search Console API** — *the first-party findability reveal.* Free, OAuth-consented by the site owner, and — crucially — the data is **aggregate search performance with no visitor PII**. It powers the Digital Findability / Marketing lens with a genuine "here is what people search to find you, and where you actually rank" moment. Medium build (OAuth + property verification) but the value/privacy ratio is the best in the marketing category by far.

**Deliberately NOT Build Now (and why that is correct):** the finance lens's day-one experience is **secure import**, not a live accounting/banking API (MAC-110/MAC-113) — so Exact, Moneybird, Mollie, and even the free **GoCardless Bank Account Data** tier are **Research Next**, the strongest of the "next rung." The whole advertising category (Google Ads, Meta, LinkedIn) is **Defer/Avoid** because of developer-token approval, App Review, and partner-vetting gates that cost more than a lens layer returns today. Google Business Profile reviews are high-value but gated behind a Google allowlist and reviewer-PII handling → Research Next, not now.

---

## 4. Ruthless "do not build" calls (the anti-integrate-everything findings)

| Provider | Verdict | Reason |
|---|---|---|
| **LinkedIn Marketing API** | **Avoid** | Partner/dev-program vetting gate + several APIs restricted to qualified partners; low ROI for a lens layer. |
| **Google Ads / Meta Marketing / Meta Graph** | **Defer** | Developer-token approval, App Review, and Business Verification are disproportionate to the marketing-lens value at this stage. |
| **Adyen / Salesforce** | **Defer** | Enterprise-grade; SME-focused Mollie/HubSpot/Pipedrive fit the actual lens buyer. |
| **Twinfield** | **Defer** | Legacy SOAP, accountant-oriented; Exact + Moneybird cover the SME market with cleaner REST. |
| **WooCommerce / Matomo** | **Defer** | Fragmented self-hosted installs → inconsistent reliability and per-site key management; support opportunistically, don't lead with them. |
| **Tink** | **Defer** | Commercial/quote pricing when GoCardless offers a free AIS tier for the same first probe. |
| **Trustpilot** | **Defer** | Useful data sits behind a paid Trustpilot plan; narrower coverage than Google reviews. |

**Cross-cutting privacy/consent hazards to respect everywhere (fail-closed):** GA4 (visitor PII + consent-mode), Google Business Profile / Places (reviewer names = third-party PII), and *all* open-banking (PSD2 SCA consent + re-consent). Any of these that is ever adopted must inherit the Maculis consent gate, minimise third-party PII to a location/aggregate reference, and appear in the RoPA with a DPA — mirroring EPIC-1 MAC-103's enrichment stance.

---

## 5. HUMAN ACTIONS (flagged, not performed)

MAC-112 created no accounts and acquired no credentials. Before any row moves from research to build, a human must:

1. **KVK** — request a production API subscription/plan (test env needs nothing); confirm per-query pricing on the plan page.
2. **VIES** — nothing to sign; but confirm acceptable-use / rate limits and design fail-closed handling of `SERVICE_UNAVAILABLE`.
3. **Google (Search Console, GA4, Ads, Business Profile, Places)** — create a Google Cloud project + OAuth consent screen; for **Business Profile** submit the access-request form (~14-day review); for **Ads** obtain and upgrade a developer token; accept Google API terms / DPF posture.
4. **Meta / LinkedIn** — app creation, **Business Verification**, and **App Review / partner vetting** (only if ever pursued).
5. **Accounting/payments/open-banking (Exact, Moneybird, Twinfield, Mollie, Stripe, Adyen, GoCardless, Tink)** — register OAuth clients, accept each vendor's DPA, and for open banking confirm the AISP consent + re-consent flow and record it in the RoPA + privacy notice.
6. **CRM/commerce/analytics (HubSpot, Pipedrive, Salesforce, Shopify, WooCommerce, Plausible, Matomo, Trustpilot)** — account + API-credential creation and DPA acceptance per adopted vendor.
7. **Confirm every pricing/quota/rate-limit figure** in this matrix against the live official page before commercial commitment (see sourcing caveat).

---

## 6. Provenance table (URL + access date)

All access dates **2026-08-15**. Sources are official developer/documentation/pricing pages, gathered via official-domain-restricted WebSearch (snippets), **not** full-page WebFetch — confirm exact figures on the page before relying on them.

| # | Provider | Official source URL | Access date |
|---|---|---|---|
| 1 | Exact Online | https://developers.exactonline.com/ | 2026-08-15 |
| 2 | Moneybird | https://developer.moneybird.com/authentication | 2026-08-15 |
| 3 | Twinfield | https://developers.twinfield.com/documentation/api/authentication/openid-connect-auth | 2026-08-15 |
| 4 | GoCardless Bank Account Data | https://developer.gocardless.com/bank-account-data/overview | 2026-08-15 |
| 5 | Tink | https://docs.tink.com/api | 2026-08-15 |
| 6 | Mollie | https://docs.mollie.com/reference/authentication | 2026-08-15 |
| 7 | Stripe | https://docs.stripe.com/keys | 2026-08-15 |
| 8 | Adyen | https://docs.adyen.com/development-resources/api-credentials | 2026-08-15 |
| 9 | Shopify | https://shopify.dev/docs/api/usage/authentication | 2026-08-15 |
| 10 | WooCommerce | https://developer.woocommerce.com/docs/apis/rest-api/authentication/ | 2026-08-15 |
| 11 | Google Analytics Data API (GA4) | https://developers.google.com/analytics/devguides/reporting/data/v1/quotas | 2026-08-15 |
| 12 | Plausible Analytics | https://plausible.io/docs/stats-api | 2026-08-15 |
| 13 | Matomo | https://developer.matomo.org/api-reference/reporting-api | 2026-08-15 |
| 14 | Google Search Console API | https://developers.google.com/webmaster-tools/v1/how-tos/authorizing | 2026-08-15 |
| 15 | Google Ads API | https://developers.google.com/google-ads/api/docs/api-policy/access-levels | 2026-08-15 |
| 16 | Meta Marketing API | https://developers.facebook.com/docs/marketing-api/get-started/authorization | 2026-08-15 |
| 17 | LinkedIn Marketing API | https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access | 2026-08-15 |
| 18 | HubSpot CRM API | https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview | 2026-08-15 |
| 19 | Pipedrive | https://developers.pipedrive.com/docs/api/v1/Oauth | 2026-08-15 |
| 20 | Salesforce | https://developer.salesforce.com/docs/apis (category ref; confirm) | 2026-08-15 |
| 21 | Meta Graph (Instagram/FB Pages) | https://developers.facebook.com/docs/permissions/ | 2026-08-15 |
| 22 | Google Business Profile API | https://developers.google.com/my-business/content/review-data | 2026-08-15 |
| 23 | Trustpilot API | https://documentation-apidocumentation.trustpilot.com/authentication | 2026-08-15 |
| 24 | Google Places API (New) | https://developers.google.com/maps/documentation/places/web-service/usage-and-billing | 2026-08-15 |
| 25 | KVK API (Handelsregister) | https://developers.kvk.nl/documentation | 2026-08-15 |
| 26 | VIES VAT validation | https://ec.europa.eu/taxation_customs/vies/ | 2026-08-15 |
| 27 | Comms (Twilio/SendGrid/WhatsApp) | EPIC-1 MAC-103, `research/03-provider-api-research.md` (provenance table therein) | 2026-08-15 |

> **Proxy-blocked / snippet-only flag.** As in EPIC-1 MAC-103, full-page `WebFetch` reads were not performed (the same egress-proxy policy that blocked `developers.facebook.com`, `twilio.com`, `bird.com` in that run applies). All rows above are **official-domain search-snippet** derived. Row 20 (Salesforce) is a category placeholder — confirm the exact developer-docs entry URL. **A human must open each cited page and confirm exact pricing, quota, access-tier, and residency figures before any commercial commitment.**

---

*End of MAC-112 findings. Read-only; no accounts, credentials, or agreements were created.*
