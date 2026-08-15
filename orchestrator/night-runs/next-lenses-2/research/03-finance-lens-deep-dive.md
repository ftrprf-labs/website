# Finance Lens — Deep Dive (NL/EU accounting, PSD2 open banking, payments) and a no-integration design
## EPIC-2 WS-3 (MAC-110) — analysis/read-only

**Run:** Maculis "Next Lenses & Intelligence Strategy" — EPIC-2 workstream WS-3, sub-task MAC-110 (HIGH risk).
**Scope:** Design a Maculis **Finance Lens** that shows an entrepreneur something essential about their finances they had not seen — evidence-bound, no dashboard, privacy-first, consent fail-closed — and ground it in the real NL/EU accounting-API, PSD2 open-banking, and payments landscape.
**Method:** Read-only desk research against **official vendor / regulator domains only** (developer portals, support KBs, pricing pages, EBA). All access dates **2026-08-15**.
**Constraint honoured:** **No accounts created, nothing signed, no credentials acquired, no sandbox registered.** Every account/credential/DPA/licence step is listed under **Human Actions** and left for a human.
**Inputs skimmed (not repeated):** `next-lenses/research/03-provider-api-research.md` (comms/enrichment posture — the fail-closed, EU-residency, DPA-gated, "defer person-level enrichment" stance carries over) and `05-data-strategy-architecture.md` (the `lens_signal` model: evidence[] + source + model, no PII columns, cascade-delete, tenant-isolated, precision-over-recall abstain). This dive assumes that architecture and does not restate it.

> **Sourcing caveat (read first).** The session egress proxy **blocks full-page `WebFetch`** to the vendor developer domains (confirmed: `developers.exactonline.com` returned `EGRESS_BLOCKED`; the same policy applies across the dev/docs hosts). All findings below therefore come from **official-domain search indexing (snippets of official pages)**, not full-page reads. Every claim is tied to an official URL in the Provenance Table, but **before any commercial or technical commitment a human must open each cited URL and confirm the exact current figure** — API limits, prices, scopes, and coverage counts change and are plan/country-specific. Numbers here are directionally correct as of the access date, not a contract.

---

## 1. Executive summary

**The headline finding is a refusal, not a recommendation.** For a consent-fail-closed, EU, privacy-first product, the instinct to "connect all the banks" is the wrong first move — and for most of the ladder, the wrong move full stop. A Finance Lens earns trust by showing an entrepreneur **one true, timing-based thing they had not seen**, from the least invasive data that can support it. The valuable insight almost never requires a live bank feed; it requires *a few honest numbers and the arithmetic of timing*.

**Three structural realities drive this:**

1. **PSD2 "connected" is heavier than it looks and lighter than it seems.** Live bank access legally requires an **AISP licence** from a National Competent Authority (in NL, **De Nederlandsche Bank**) — *or* riding an aggregator's licence as its **agent** (Tink's model), which is itself a regulated, contracted, due-diligence-heavy arrangement. Even once connected, access is **consent-expiring**: SCA must be renewed (historically 90 days; the EBA's 2022 RTS amendment moves the renewal cadence toward **180 days** and mandates the exemption, but **TPPs must still re-confirm consent every 90 days**), and banks impose **per-account rate limits as low as ~4 calls/day per endpoint**. Industry attrition at the re-auth wall runs **20–40%**. A "continuous" bank feed is in practice a **decaying, re-consent-gated** feed. (§3)

2. **Accounting APIs are the better coupling — but only where the books are actually kept up to date.** Exact Online, Twinfield, Moneybird, e-Boekhouden.nl and Yuki all expose clean OAuth/API access to GL accounts, invoices, and bank mutations. The data is *structured and categorised* (unlike raw bank lines). **But the finding that matters is latency: books are only as fresh as the entrepreneur's last bookkeeping session.** For a solo founder that can be weeks or a quarter stale. A lens built on stale books will confidently say something false. (§2)

3. **Payments/commerce data (Mollie, Adyen, Stripe) is the sleeper.** It is *timely* (near-real-time), *already consented* (the founder owns the account), *structured for reconciliation* (balance transactions, settlements, payout reports), and it directly supports the two signals entrepreneurs most under-see: **settlement lag** (money earned vs money arrived) and **fee/margin erosion**. For a founder who sells online, this is the highest value-per-unit-of-invasiveness source on the board. (§4)

**The recommended Finance Lens is therefore not a dashboard and not a bank connection.** It is a **small, evidence-bound "timing and truth" lens** that runs first on **zero integration** (a tiny set of high-value questions + one optional CSV export), reveals the **runway/timing gap** an entrepreneur cannot feel from their bank balance, and only *offers* deeper coupling where the marginal insight clearly beats the marginal invasiveness. (§5, §6)

**Where we deliberately seek the opposite of "connect everything" (§7 threads throughout):** we prefer a founder typing four numbers to a bank OAuth; we prefer a monthly CSV to a live feed; we refuse to infer personal spending from transaction lines; we abstain rather than assert on stale data; and we treat "connected" as an earned, reversible, clearly-worth-it upgrade — never the default.

---

## 2. Per-provider findings — NL/EU accounting APIs

General shape: all five are **cloud accounting/bookkeeping systems** whose APIs expose the *general ledger, invoices, and reconciled bank mutations*. This is the richest data for a Finance Lens because it is **already categorised** (a bank line "SEPA 340.00" is noise; the ledger knows it's "Rent, expense, cost centre X"). The universal caveat — **freshness** — is the load-bearing risk and is repeated per provider because it changes the *trustworthiness* of any lens, not just the plumbing.

### 2.1 Exact Online (market leader NL SME/accountant)
- **API/auth:** REST API; **OAuth 2.0, Authorization Code grant only**. Redirect URI **must be a public HTTPS URL — `localhost` is not allowed**, which raises the bar for any local/desktop or dev flow. [eol-oauth-step2] [eol-oauth-cases]
- **Rate limits (the operative constraint):** **60 calls/company/minute** and **5,000 calls/company/day**; over-limit returns **HTTP 429**; usage is exposed via `X-RateLimit-Minutely-Limit/Remaining` and daily headers. A **Premium licence lifts the daily cap to ~30,000 calls/company/day** with no per-app restriction. [eol-apilimits]
- **Data usable for a Finance Lens:** G/L accounts, financial transactions/entries, sales & purchase invoices, sales orders, bank entries (documented example endpoints for G/L account and sales order). Rich enough for margin, ageing, and cash-timing signals. [eol-restsample] [eol-restdocs]
- **Access model / pricing:** developer registration via the Exact **App Centre** developer portal; publishing an app to real customers is an **App-Centre partner** path (human action). Accounting product itself starts around **Essentials €55/month** (per-document processing fees apply). [eol-devportal] [exact-essentials]
- **Complexity:** Medium-high. OAuth is standard but the **public-HTTPS-only redirect**, per-company (not per-app) rate limits, and App-Centre partner onboarding make this a *deliberate integration*, not a weekend one.
- **Critical stance:** highest-quality NL data, but **the coupling cost (partner onboarding + per-company rate budgeting) only pays off once a lens is proven valuable on cheaper data.** Not a day-one target.

### 2.2 Twinfield (Wolters Kluwer)
- **API/auth:** **OpenID Connect for identity + OAuth 2.0 for authorization**; the underlying web service is **SOAP** — you obtain an access token via OAuth then **pass it in the SOAP header**. Refresh tokens require the **`offline_access`** scope. Client registration is on the Twinfield developer portal and **requires a Wolters Kluwer account**. [twinfield-oidc] [twinfield-docs]
- **Data usable:** full accountancy dataset (transactions, dimensions, browse/reporting data) — Twinfield is accountant-oriented, so data tends to be **well-structured but professionally maintained** (a plus for reliability).
- **Complexity:** **High.** OAuth-wrapped **SOAP** is the most awkward surface of the five; modern REST tooling doesn't map cleanly. Best where an accountant already runs the books.
- **Critical stance:** the data quality is good precisely because an accountant maintains it — but that same fact means **the entrepreneur is not the one holding the credentials**, so a consent flow may route through a third party. More work than value for a self-serve founder lens.

### 2.3 Moneybird (popular NL ZZP/small-business)
- **API/auth:** **OAuth 2.0**, plus a simpler **personal API token** option (convenience at a security cost). Register an app at `moneybird.com/user/applications/new`. **Scopes:** `sales_invoices`, `documents`, `estimates`, `bank`, `settings` (default `sales_invoices`). Uses an **administration ID** in the path + bearer token. [mb-auth] [mb-getstarted]
- **Webhooks:** yes — POST to a subscriber URL, per-event subscription, HTTPS strongly recommended (payloads carry contacts/invoices). Good for *event-driven* freshness rather than polling. [mb-webhooks]
- **Data usable:** **`financial_mutations`** (transactions on financial accounts, linkable to invoices/ledgers/payment batches), **`financial_accounts`**, **`financial_statements`**, general/typeless **documents**. This is a near-ideal shape for a cash-timing + invoice-ageing lens. [mb-fin-mutations] [mb-fin-statements]
- **Pricing (public, honest signal of the customer):** tiered by **bank-transaction volume** — **€15 / €28 / €39 per month** (20 / 50 / unlimited transactions, prices from 1 Dec 2025), **60-day free trial**; optional Payment Account add-on (€7/mo after 12 free months). [mb-pricing] [mb-newprices-2025]
- **Complexity:** **Low-medium — the friendliest of the five.** Clean REST, real scopes, webhooks, Dutch-hosted SME base.
- **Critical stance:** **best first accounting integration** *if* one is pursued — but still gated behind proving the lens on no-integration data. The `bank`/`documents` scopes are broad; request the **minimum scope** (likely `sales_invoices` + `bank`) and never `settings`.

### 2.4 e-Boekhouden.nl
- **API/auth:** **legacy SOAP** (`soap.e-boekhouden.nl/soap.asmx?wsdl`; credentials from **Beheer → Instellingen → API/SOAP**) **and a newer REST API** (Scalar/Swagger reference at `api.e-boekhouden.nl/swagger`). Functions include `AddFactuur` (invoices), ledger-account and mutation operations. PHP/C# examples provided. [eb-api] [eb-soapdoc] [eb-swagger]
- **Data usable:** invoices, ledger accounts, mutations — sufficient for ageing/cash signals.
- **Complexity:** **Medium**, improving. Historically SOAP-only (awkward); the REST surface lowers the barrier. Auth is **API-key/credential-based** (simpler than OAuth, but the entrepreneur must generate and paste a key — a manual, revocable step, which is actually *fine* for a privacy-first, explicit-consent design).
- **Critical stance:** the **key-paste model is honest** — the founder explicitly hands over a credential they can revoke in-product, no OAuth scope-sprawl. A reasonable "lightweight connected" option precisely because it is un-magical.

### 2.5 Yuki (Visma group)
- **API/auth:** **`WebServiceAccessKey`** (a web-service API key) + **Administration ID**; some services (e.g. Purchase) additionally require a **Client ID/Secret issued by Yuki over email**. **SOAP web services**, ~**twelve** of them (Accounting, AccountingInfo, Sales, Purchase, …). [yuki-apilink] [yuki-accounting] [yuki-keys]
- **Call limits:** raised via **accountant add-ons** — **Yuki Webservice (1,000→5,000 calls/day)** or **Extended (5,000→10,000/day)**. [yuki-apilink]
- **Data usable:** AccountingInfo/Accounting services expose ledger and administrative financial data.
- **Complexity:** **High.** SOAP, email-issued secrets, per-add-on call quotas, and a strong **accountant-mediated** posture (like Twinfield).
- **Critical stance:** accountant-mediated again — good data hygiene, poor self-serve fit. Deprioritise for a founder-facing lens.

**Accounting-API verdict:** **Moneybird** (self-serve REST + webhooks) and **e-Boekhouden.nl** (revocable key + REST) are the only two that fit a privacy-first *self-serve founder* without an accountant in the loop. **Exact Online** is the quality target but a partner-grade commitment. **Twinfield/Yuki** are accountant-mediated SOAP — powerful, wrong shape for this lens. **All five share the fatal-if-ignored caveat: the data is only as true as the last bookkeeping session.** A lens must **read and surface the "books last updated" date and abstain / caveat when stale** — otherwise it will assert confidently on fiction.

---

## 3. Per-provider findings — Open Banking / PSD2 aggregators

This is where the "connect all the banks" instinct must be actively resisted. The aggregators are genuinely capable; the **regulatory and consent physics** make "connected" a *decaying, licence-encumbered* state, not a clean pipe.

### 3.0 The PSD2 licensing reality (the finding that governs everything else)
- To read a customer's bank account data (AIS) you must be a **licensed/registered AISP with a National Competent Authority** — in the Netherlands that is **De Nederlandsche Bank (DNB)** — **or** operate **as an agent under an aggregator's licence** (e.g. "become an agent of Tink, operating under their licence"). There is no unlicensed path. [tink-enroll] [enable-faq]
- **Consent is explicit, scoped, time-boxed, and revocable by design** (Ponto: "explicit consent… limit what data is shared, control how long, revoke at any time"). This *aligns* with Maculis fail-closed — but it also means a "connected" state is **inherently expiring**. [ponto-ais]
- **The re-authentication wall:** under the RTS on SCA, account-access consent required **SCA renewal every 90 days**; the **EBA's final RTS amendment (EBA/RTS/2022/03, 5 Apr 2022)** makes a **mandatory SCA exemption** for AISP access and moves the **renewal cadence to 180 days**, but **TPPs must still re-confirm the customer's consent every 90 days**. Documented customer **attrition at the 90-day mark is 20–40%**. [eba-rts-2022] [eba-final-report] [gc-90day]
- **Bank-imposed rate limits** can be **as low as ~4 API calls/day per account per endpoint** (details/balances/transactions each metered). "Continuous intelligence" from a bank feed is therefore **coarse and rationed**, not a live stream. [gc-overview]

**Consequence for Maculis:** a bank connection is a **regulated, expiring, rate-limited, re-consent-treadmill** relationship. It can be justified — but only for an insight that genuinely needs *raw, cross-account, real-balance* data and that a founder will actively re-consent to every quarter. Most Finance-Lens value does not clear that bar.

### 3.1 GoCardless Bank Account Data (formerly Nordigen)
- **Model:** **free AIS** access ("kept free by using PSD2 regulated costless open APIs"), premium tiers for enriched data. **AISP-licensed** (Nordigen, regulated by Latvia's FCMC; authorised in **31 EEA countries**), **~2,300+ banks / 31 countries**. [gc-nordigen] [gc-overview]
- **Data:** up to **24 months transaction history**, **90 days continuous access**, endpoints for account details/balances/transactions. Default end-user agreement = 90 days history + 90 days access. [gc-overview]
- **Consent physics:** first access via SCA; thereafter **consent re-confirmation every 90 days**; **bank rate limits down to ~4 calls/day/account/endpoint**. [gc-overview] [gc-90day]
- **Critical stance:** the **free + no-own-licence-needed** path makes this the most *approachable* aggregator — and therefore the most tempting trap. It is still a full PSD2 consent relationship with the re-auth treadmill and rate rationing. **Approachable ≠ low-commitment.**

### 3.2 Enable Banking
- **Model:** **one PSD2 API to 2,700+ banks / 30 countries**; **"TPP Infrastructure as a Service."** Production use requires **your own licence/registration from an NCA, OR reliance on Enable Banking acting as authorised AISP** (register in the EBA register). Directly-implemented AIS+PIS connectors listed for **8 countries** (DK, EE, FI, LT, LV, NO, PL, SE) within the broader 30-country reach. [enable-home] [enable-faq] [enable-tpp]
- **Sandbox:** strong — **Mock ASPSP** + real ASPSP sandboxes, control-panel manipulable, PIS auto-enabled in sandbox. Good for building without touching live data (fits read-only research posture — but *registering* the sandbox app is a human action, not done here). [enable-sandbox]
- **Critical stance:** flexible licensing story (bring-your-own or ride theirs) and a real sandbox, but the **direct-connector heartland is Nordics/Baltics**, not NL — confirm NL bank coverage (ING/ABN AMRO/Rabobank/bunq/Knab) before assuming a Dutch founder is served. **Human must verify NL coverage.**

### 3.3 Tink (Visa-owned)
- **Model:** **~3,400 banks, one API**; free developer trial. **Licensing:** own PSD2 licence **or become an agent under Tink's licence.** Products (aggregation, enrichment, PIS, PFM) sold individually or combined; **pricing is quote-based** (no public rate card retrieved). [tink-aggregation] [tink-enroll] [tink-pricing]
- **Critical stance:** broadest coverage and a mature enrichment stack — but **agent-of-Tink is a formal regulated relationship** (contract, due diligence, ongoing obligations), and the **enrichment layer re-opens the exact person-level-data hazard flagged in MAC-103**: categorising a founder's bank transactions can reveal personal spending. For a privacy-first lens this is a feature to **avoid**, not adopt. Enterprise/quote pricing also signals this is not a lightweight add-on.

### 3.4 Ponto / Isabel Group (Ibanity)
- **Model:** **licence-as-a-service** — Ponto is a **regulated PSD2 AISP and PISP**; handles PSD2 + AML compliance so you don't hold the licence. **~1,800–2,000+ banks / 15 EU countries** (Belgium-centred Isabel Group, ~30 yrs multibanking). **Single API** for account info + payments. [ponto-isabel] [ponto-ais] [ponto-company]
- **Pricing (refreshingly public & usage-based):** **pay per linked bank account + per payment initiated**, billed monthly, no hidden fees. **Free sandbox**, public + dedicated Slack, libraries. [ponto-pricing] [ponto-products]
- **Critical stance:** the **cleanest commercial + compliance story** for the EU/BeNeLux (transparent per-account pricing, licence-as-a-service, real sandbox). **If** a bank connection is ever justified for a Dutch/Belgian founder, Ponto is the front-runner — but the "if" remains the hard part. Confirm exact NL bank coverage.

**Open-banking verdict:** **Do not build "connected banking" into the first (or second) version of the Finance Lens.** If a later stage genuinely needs it, the shortlist is **Ponto** (transparent EU pricing, licence-as-a-service, BeNeLux fit) and **GoCardless Bank Account Data** (free, own AISP licence, broad EEA) — both **subject to human verification of exact NL bank coverage and a DPIA/DPA on the raw-transaction data flow.** The whole category stays behind an explicit, re-consentable, revocable, clearly-worth-it gate.

---

## 4. Per-provider findings — Payments / commerce (the under-rated source)

Payments data is **timely, founder-owned, and reconciliation-shaped** — the opposite of the bank-feed's decaying-consent problem. For any founder who sells online, this is the **highest value-per-invasiveness** source.

### 4.1 Mollie (NL-native, dominant for Dutch SMEs)
- **API/auth:** clean **REST**; **Payments API** core, plus **Balances API ("time-based bookkeeping")** and **Settlements API ("settlement-based bookkeeping")** — explicitly bookkeeping-oriented. **OAuth (Mollie Connect)** for platforms acting on a merchant's behalf; access to virtually any endpoint with the merchant's permission. [mollie-overview] [mollie-connect]
- **Finance-Lens data:** settlements (when money actually lands vs when it was earned), balances, fees per payment. Directly powers **settlement-lag** and **fee-drag** signals.
- **Critical stance:** because the founder **already owns the Mollie account**, connecting it is *low-invasiveness self-data*, not third-party surveillance. **This, not the bank, is the natural first "connected" source for an online-selling founder.**

### 4.2 Adyen (enterprise/scale)
- **Data:** **Balance Platform Accounting Report (BPAR)** — a **daily report of all balance changes** (payments, transfers, payouts, fees, invoice deductions); **CSV/TSV**; **`balancePlatform.report.created` webhook** delivers a download URL. Also payout/statement reports. [adyen-bpar] [adyen-platform-reports]
- **Critical stance:** report-file-based (batch, not live) — actually *good* for a privacy-first lens (pull a daily reconciliation file, don't stream). But Adyen skews enterprise; **most Maculis founders will be on Mollie/Stripe**, so treat Adyen as coverage, not priority.

### 4.3 Stripe
- **Data:** **Balance Transactions API** (every credit/debit affecting the Stripe balance — "the building blocks of all activity"), **Reports API** (programmatic prebuilt reports), **Balance summary report** (bank-statement-like monthly reconciliation, CSV), **Payout reconciliation report**; **`payout.paid` / `payout.reconciliation_completed` webhooks**. [stripe-baltxn] [stripe-reports-api] [stripe-balance-report] [stripe-payout-recon]
- **Critical stance:** best-documented, but note **EU data-residency and processor posture must be confirmed** per MAC-103 discipline before any live use. Same virtue as Mollie: **founder-owned self-data.**

**Payments verdict:** For the two signals entrepreneurs most under-see — **"money earned ≠ money arrived" (settlement lag)** and **"where the margin actually goes" (fees + refunds + chargebacks)** — **Mollie (NL default) and Stripe** are the right first connected sources, using **batch reports/settlements over live streaming**. This is the one place where "connected" clears the value-vs-invasiveness bar early, because it is the founder's *own* commerce data and it is *timely*.

---

## 5. The no-integration Finance Lens (the core deliverable)

**Design premise:** the most valuable thing a Finance Lens can do is not aggregate data — it is to make a founder **feel a timing gap their bank balance hides.** A bank balance is a *point*; a business lives or dies on *flows and timing*. Almost every founder can *see* their balance and almost none can *see* their runway, their settlement lag, or the month their fixed costs cross their collections. That gap is reachable with **four numbers and honest arithmetic** — no API, no bank, no dashboard.

### 5.1 The insight to deliver (pick ONE, evidence-bound)
**Primary insight — "The Timing Gap / true runway."** Not "you have €X in the bank" (they know that) but: **"At your current burn and your real collection lag, your covered runway ends around <month>, ~<n> weeks earlier than your bank balance suggests — because ~€Y you've 'earned' hasn't arrived yet and won't in time."** This is the thing they had not seen: the difference between *balance*, *earned*, and *available-when-needed*.

Secondary insights, unlocked only with a little more data: **settlement lag** (from payments data, §4), **invoice ageing concentration** ("62% of your outstanding cash is one client, 40 days late"), **fixed-cost creep** (subscriptions growing faster than revenue).

### 5.2 The TINY high-value question set (the entire no-integration input)
Fail-closed, minimal, and each question **earns its place** by feeding the insight — nothing is collected "to have it." Six questions maximum; the lens works at four.

1. **Cash on hand today** (one number the founder reads off their banking app — *typed, not connected*).
2. **Typical monthly fixed outgoings** (rent, salaries, subscriptions, loan — the floor).
3. **Money owed to you right now** (outstanding invoices total) **and roughly how late** ("mostly on time / often 30–60 days / it's a problem").
4. **Expected money in over the next ~30 days you're confident about.**
5. *(optional)* **One-time known upcoming outflows** (VAT/BTW payment, tax, big purchase) — this alone often flips a "fine" into a "watch out," because founders forget the quarterly **BTW** hit.
6. *(optional)* **"What would break first if cash got tight?"** — a qualitative field that makes the output *theirs*, not generic.

That is the whole input surface for stage 0. It is **less invasive than a single bank OAuth** and produces an insight a bank connection *cannot* (a raw bank feed doesn't know which receivables are reliable or that a BTW payment is coming).

### 5.3 Why no dashboard (design stance)
A dashboard shows *everything and means nothing*; it also implies continuous data Maculis has deliberately not taken. The Finance Lens output is a **single evidence-bound statement + its workings**, in the same "here's the signal, here's why it fired" idiom as the existing `lens_signal` model (§05 input). Example shape:

> **"Your true runway is ~<n> weeks, not the ~<m> weeks your €<balance> suggests."**
> *Because:* fixed outgoings ≈ €<A>/mo; of your €<B> owed to you, you told us ~€<C> is reliably coming in 30 days and the rest is late; a €<BTW> BTW payment lands in <month>. Working: <balance + reliable-in − fixed×months − known-outflows>. **This is arithmetic on the numbers you gave — not a bank connection, not an estimate of your spending.**

Every clause traces to an input the founder typed. **No fabricated precision. No inferred personal data.**

### 5.4 Safe import (when typing isn't enough) — CSV/exports and documents, not connections
The bridge between "typed four numbers" and "connected" is the **file the founder already has**:
- **Bank CSV/MT940/CAMT export** (every NL bank offers a manual download) — parsed **client-side / in-tenant**, never re-uploaded to a third party, to compute *actual* monthly burn and identify the largest recurring outflows. This gives ~80% of "connected" insight with **zero PSD2 exposure and zero consent treadmill.**
- **Accounting export** (Moneybird/Exact/e-Boekhouden all export ledgers/invoice lists to CSV/Excel) — for invoice ageing without an API.
- **A payout/settlement CSV** from Mollie/Stripe/Adyen (§4) — for settlement lag without OAuth.
- **Documents:** an uploaded invoice PDF or a VAT return, read for the *one figure that matters*, then discarded — not retained as a document store.

**Critical stance on import:** a CSV a founder chose to export and hand over is **more consensual and more legible** than a background OAuth that silently keeps pulling. Prefer the file. Parse it in-tenant, extract only the figures the lens needs, and **do not retain the raw file** beyond the computation (retention parity with the existing 12-month, PII-minimising discipline).

### 5.5 Where a Finance Lens could feel invasive (and how the design refuses it)
- **Categorising transactions = inferring a person's life.** Bank/settlement lines reveal health spend, gambling, personal habits. The lens **must not categorise personal spending** and must never present "here's where your money goes" at line-item personal granularity. It computes *business* aggregates (fixed vs variable, in vs out) only.
- **Prediction as judgement.** "You'll run out of money" delivered coldly is frightening and can be wrong. Frame as **the founder's own arithmetic made visible**, always with the workings and always reversible/editable.
- **Silent continuous access.** Anything "always on" (webhooks, aggregator feeds) must be **visibly on, explained, and one-tap revocable** — fail-closed the moment consent lapses.
- **Stale-data confidence.** The deepest invasiveness is *being confidently wrong*. If the newest input (books/import) is old, the lens **abstains or heavily caveats** rather than asserting — mirroring the precision-over-recall / `confidence=null` abstain rule in the §05 architecture.

---

## 6. The progressive-data ladder (insight unlocked per rung)

Each rung is **opt-in, reversible, and justified by a strictly larger insight**. The founder never climbs because Maculis wants data; they climb because the *next true thing* requires it. Most founders should get durable value and **stop at rung 1 or 2.**

| Rung | Data taken | Invasiveness | Insight unlocked | Recommended? |
|---|---|---|---|---|
| **0 — No integration** | 4–6 typed numbers (§5.2) | Minimal (self-reported, nothing stored beyond the answer) | **True runway / the Timing Gap**; the forgotten BTW hit | **Default. Ship this first.** |
| **1 — Lightweight import** | Founder-exported **bank CSV** and/or accounting/settlement CSV, parsed in-tenant, raw file discarded | Low (founder chose the file; no live link; no third party) | **Actual** burn vs *felt* burn; largest recurring outflow; **invoice-ageing concentration**; **settlement lag** from a payout CSV | **Yes — the sweet spot.** ~80% of "connected" value, ~none of the PSD2 cost. |
| **2 — Connected commerce** | **Mollie / Stripe** OAuth or report pull (§4), founder's own account, batch reports preferred | Low-medium (self-data, timely, but a live link + processor DPA) | **Continuous settlement-lag + fee/margin-erosion** signals; "money earned ≠ arrived" over time | **Only if the founder sells online** and re-consents knowingly. |
| **3 — Connected accounting** | **Moneybird / e-Boekhouden** (self-serve) API, minimum scope, revocable | Medium (live link to the books; freshness-gated) | Live ageing + GL-accurate margin — **but only as fresh as the bookkeeping** | Cautious. Gate on a **"books updated recently?"** freshness check; abstain if stale. |
| **4 — Connected banking (PSD2)** | Aggregator (**Ponto / GoCardless**) AIS, licensed, re-consent every 90d, rate-limited | **High** (regulated, expiring, rationed, personal-inference hazard) | Real cross-account balances + raw cashflow truth, independent of bookkeeping | **Discouraged / last resort.** Justify per-founder; DPIA + DPA + NL-coverage check + explicit re-consent UX first. |

**"Continuous intelligence" is deliberately *not* rung 4 by default.** The most durable continuous signal is **rung 2** (founder-owned, timely commerce data) — not a decaying bank feed. The ladder's gravity points *down*, toward the least invasive rung that supports the insight, not up toward full connection.

**Where couplings are more work than value (explicit):**
- **Twinfield / Yuki** (SOAP, accountant-mediated, email-issued secrets) — more integration work than a self-serve founder lens will repay. Skip unless serving accountants.
- **Exact Online** — quality data, but App-Centre-partner onboarding + per-company rate budgeting is a *product commitment*, not a lens experiment. Defer until a lens is proven.
- **Any PSD2 bank connection near-term** — licensing (DNB or agent-of-aggregator), 90-day re-consent attrition (20–40%), ~4-calls/day rate rationing, and the personal-inference hazard make "connected banking" **impractical and against the privacy-first grain** for the foreseeable roadmap. The CSV import (rung 1) captures most of the value without any of it.

---

## 7. Provenance table (every claim → official URL, access date 2026-08-15)

> Fetched via **official-domain search indexing** (full-page `WebFetch` egress-blocked). A human must open each URL to confirm exact live figures before any commitment. **All access dates: 2026-08-15.**

| # | Tag | Claim | Official URL |
|---|---|---|---|
| 1 | eol-oauth-step2 | Exact Online OAuth2; redirect must be public HTTPS, no localhost | https://support.exactonline.com/community/s/article/All-All-DNO-Content-oauth-eol-oauth-devstep2?language=en_GB |
| 2 | eol-oauth-cases | Exact Online supports Authorization Code grant only | https://support.exactonline.com/community/s/article/All-All-DNO-Simulation-oauth-eol-oauth-dev-oauthimplecases?language=en_GB |
| 3 | eol-apilimits | 60 calls/company/min, 5,000/company/day, 429, X-RateLimit headers, 30,000/day premium | https://support.exactonline.com/community/s/article/All-All-HNO-Concept-general-exactonlineappcentre-appcent-apilimitc?language=en_GB |
| 4 | eol-restsample | Exact Online REST example — G/L account endpoint | https://support.exactonline.com/community/s/article/All-All-DNO-Content-restsamplecode?language=en_GB |
| 5 | eol-restdocs | Exact Online REST API reference docs | https://support.exactonline.com/community/s/article/All-All-DNO-Content-restrefdocs?language=en_GB |
| 6 | eol-devportal | Exact Online developer portal (App Centre) | https://developers.exactonline.com/ |
| 7 | exact-essentials | Exact Online Accounting Essentials ~€55/mo; per-document fees | https://www.exact.com/nl/producten/boekhouden/features-en-prijzen |
| 8 | twinfield-oidc | Twinfield OpenID Connect + OAuth2; token in SOAP header; offline_access for refresh | https://developers.twinfield.com/documentation/api/authentication/openid-connect-auth |
| 9 | twinfield-docs | Twinfield developer portal / docs; Wolters Kluwer account required | https://developers.twinfield.com/documentation/ |
| 10 | mb-auth | Moneybird OAuth2 + personal token; scopes sales_invoices/documents/estimates/bank/settings | https://developer.moneybird.com/authentication |
| 11 | mb-getstarted | Moneybird getting started; app registration; administration ID | https://developer.moneybird.com/integration/getting-started |
| 12 | mb-webhooks | Moneybird webhooks (POST, per-event, HTTPS recommended) | https://developer.moneybird.com/api/webhooks/ |
| 13 | mb-fin-mutations | Moneybird financial mutations (transactions, linkable to invoices/ledgers/batches) | https://developer.moneybird.com/api/financial-mutations |
| 14 | mb-fin-statements | Moneybird financial statements / financial accounts | https://developer.moneybird.com/api/financial_statements/ |
| 15 | mb-pricing | Moneybird pricing tiers (transaction-based), 60-day trial, Payment Account add-on | https://www.moneybird.com/pricing/ |
| 16 | mb-newprices-2025 | Moneybird new prices 1 Dec 2025: €15 / €28 / €39 | https://www.moneybird.nl/blog/nieuwe-prijzen-voor-moneybird-2025/ |
| 17 | eb-api | e-Boekhouden.nl API-koppeling overview (SOAP + REST) | https://www.e-boekhouden.nl/koppelingen/api |
| 18 | eb-soapdoc | e-Boekhouden.nl SOAP manual (WSDL, AddFactuur, credentials via Beheer>Instellingen>API/SOAP) | https://cdn.e-boekhouden.nl/handleiding/Documentation_soap_english.pdf |
| 19 | eb-swagger | e-Boekhouden.nl REST API reference (Scalar/Swagger) | https://api.e-boekhouden.nl/swagger/index.html |
| 20 | yuki-apilink | Yuki API link; WebServiceAccessKey; ~12 web services; call limits 1,000–10,000/day via add-ons | https://support.yuki.nl/en/support/solutions/articles/80000787670-yuki-api-link |
| 21 | yuki-accounting | Yuki Accounting webservice docs | http://help.yuki.nl/documents/homepage/startpagina-yuki-api-documentatie/accounting-webservice |
| 22 | yuki-keys | Yuki API key + Administration ID location | https://support.yuki.nl/en/support/solutions/articles/80000786451-where-can-i-find-the-api-key-and-administration-id-in-yuki- |
| 23 | tink-aggregation | Tink account aggregation, ~3,400 banks, one API | https://tink.com/account-aggregation/ |
| 24 | tink-enroll | Tink PSD2 enrolment; own licence or agent-of-Tink under their licence | https://docs.tink.com/resources/aggregation/enroll-with-psd2 |
| 25 | tink-pricing | Tink pricing (products individually/combined; quote-based) | https://tink.com/pricing/ |
| 26 | gc-nordigen | GoCardless acquired Nordigen; free open-banking connectivity | https://gocardless.com/en-us/g/gc-nordigen/ |
| 27 | gc-overview | GoCardless Bank Account Data: free AIS, 2,300+ banks/31 countries, AISP, 24mo history, 90-day access, ~4 calls/day/account rate limits | https://developer.gocardless.com/bank-account-data/overview |
| 28 | gc-90day | GoCardless on 90-day re-authentication / consent reconfirmation | https://gocardless.com/guides/posts/90-day-re-authentication-rule |
| 29 | enable-home | Enable Banking: 2,700+ banks / 30 countries, one PSD2 API | https://enablebanking.com/ |
| 30 | enable-faq | Enable Banking FAQ: production requires NCA licence or reliance on Enable Banking as AISP; AIS+PIS connectors in 8 countries | https://enablebanking.com/docs/faq/ |
| 31 | enable-tpp | Enable Banking TPP Infrastructure as a Service | https://enablebanking.com/tpp-infrastructure |
| 32 | enable-sandbox | Enable Banking sandbox: Mock ASPSP + real ASPSP sandboxes | https://enablebanking.com/docs/api/sandbox/ |
| 33 | ponto-isabel | Ponto (Isabel Group) 1,800+ banks / 15 EU countries, single API | https://www.isabelgroup.eu/en/products/ponto |
| 34 | ponto-ais | Ponto AISP: regulated, explicit consent, limit/revoke access | https://myponto.com/en/products/account-information-service/ |
| 35 | ponto-pricing | Ponto pricing: pay per linked account + per payment, monthly, no hidden fees | https://myponto.com/en/pricing/ |
| 36 | ponto-products | Ponto products; free sandbox; Slack; libraries | https://myponto.com/en/products/ |
| 37 | ponto-company | Ponto is a solution of Isabel Group (BeNeLux multibanking) | https://myponto.com/en/company/ |
| 38 | eba-rts-2022 | EBA final RTS amendment on SCA 90-day exemption (EBA/RTS/2022/03, 5 Apr 2022); 180-day renewal alignment | https://www.eba.europa.eu/sites/default/files/document_library/Publications/Draft%20Technical%20Standards/2022/EBA-RTS-2022-03%20RTS%20on%20SCA&CSC/1029858/Final%20Report%20on%20the%20amendment%20of%20the%20RTS%20on%20SCA&CSC.pdf |
| 39 | eba-final-report | EBA press release: final report on SCA exemption for account access | https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-final-report-amendment-its-technical-standards |
| 40 | mollie-overview | Mollie REST API overview; Balances API (time-based) + Settlements API (settlement-based bookkeeping) | https://docs.mollie.com/reference/overview |
| 41 | mollie-connect | Mollie Connect OAuth for platforms/marketplaces (act on merchant's behalf) | https://docs.mollie.com/reference/authentication |
| 42 | adyen-bpar | Adyen Balance Platform Accounting Report (daily, all balance changes, CSV/TSV) | https://docs.adyen.com/marketplaces/reports-and-fees/balance-platform-accounting-report |
| 43 | adyen-platform-reports | Adyen platform reports; balancePlatform.report.created webhook | https://docs.adyen.com/reporting/platform-reports |
| 44 | stripe-baltxn | Stripe Balance Transactions API (building blocks of all balance activity) | https://docs.stripe.com/api/balance_transactions |
| 45 | stripe-reports-api | Stripe Reports API (programmatic prebuilt reports) | https://docs.stripe.com/reports/api |
| 46 | stripe-balance-report | Stripe Balance summary report (bank-statement-like monthly reconciliation, CSV) | https://docs.stripe.com/reports/balance |
| 47 | stripe-payout-recon | Stripe Payout reconciliation report | https://docs.stripe.com/reports/payout-reconciliation |

*Secondary/derived reasoning (e.g. 20–40% attrition figure) appears in EBA consultation material and the GoCardless 90-day guide [gc-90day/eba]; treated as context, not relied on for a recommendation. No non-official source underpins any recommendation.*

---

## 8. HUMAN ACTIONS (only a human can do these — flagged, not performed)

MAC-110 performed **none** of these. Each requires an account, credential, contract, licence, or legal sign-off.

1. **Confirm exact live figures** for every cited URL (prices, API limits, scopes, coverage) before any build or commercial decision — the egress proxy blocked full-page reads, so all numbers here need human verification against the source page.
2. **Verify NL bank coverage** for any aggregator considered (Ponto, GoCardless, Enable Banking): confirm ING, ABN AMRO, Rabobank, bunq, Knab, SNS are actually connectable — do **not** assume from headline country counts.
3. **PSD2 legal decision (do not proceed without this):** choose licence path — own **AISP registration with DNB** vs **agent-under-aggregator** — and complete a **DPIA + signed DPA** covering the raw-transaction data flow, *before* any bank-connection account or sandbox is registered. This is gated on legal sign-off, per the MAC-103 "defer/gate person-level data" stance.
4. **Accounting-API developer registration** (human-created accounts + accepted terms): Exact **App-Centre partner** onboarding; **Wolters Kluwer/Twinfield** developer account; **Moneybird** app registration; **e-Boekhouden.nl** API/SOAP credential generation; **Yuki** key + emailed Client ID/Secret. Each with **minimum-scope** selection and a **DPA**.
5. **Payments-provider setup** (if rung 2 pursued): **Mollie Connect** OAuth app / **Stripe** / **Adyen** account creation, **EU data-residency + processor DPA** confirmation (per MAC-103), sender/processor terms accepted.
6. **Sandbox registration** for any provider (Enable Banking Mock ASPSP, Ponto sandbox, etc.) — registering a sandbox app is a human action; none were created in this read-only run.
7. **Freshness/abstain policy sign-off:** a human product decision on the "books/import too stale → abstain" threshold, so the lens never asserts confidently on old data.
8. **Privacy-notice + RoPA updates** for whichever data source(s) are adopted, and the explicit, revocable, re-consentable consent UX for any live connection — before go-live.

---

*End of MAC-110 findings. Read-only; no accounts, credentials, sandboxes, licences, or agreements were created. Every recommendation favours the least-invasive rung that supports the insight; "connect all the banks" is explicitly rejected.*
