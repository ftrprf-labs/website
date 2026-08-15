# Finance Lens: Accounting, Finance and Payment API Landscape for Dutch/EU SMB (MKB)

> Research artifact for the Lens Strategy Masterplan. Compiled 2026-08-15 from current (2025-2026)
> official developer documentation where reachable. Facts are separated from planning assumptions.
> One official page (Twinfield fair use policy) was egress blocked; its numbers come from portal
> content surfaced via search and are flagged. Sources are listed at the end.

---

## 1. Executive summary

For a Dutch MKB focused Finance Lens that reads financial data, the market splits into three layers:

1. Bookkeeping and ERP systems, the richest source of structured financial objects (grootboek,
   invoices, VAT, P&L). This is where the real value is. In NL the volume leaders for small
   business are Exact Online, e-Boekhouden.nl, SnelStart, Moneybird, with AFAS, Twinfield, Yuki,
   Visma strong in specific niches (AFAS in mid market and payroll, Twinfield and Yuki in the
   accountant channel).
2. Payment platforms (Mollie, Stripe): excellent APIs, but they only see payment and settlement
   flows, not the full ledger.
3. Open Banking / PSD2 aggregators (GoCardless Bank Account Data / ex Nordigen, Tink, Yapily,
   Enable Banking, Ponto/Isabel): raw bank transactions across many banks through one AISP licence.
   Fastest way to read financial data broadly, but transactions only, no invoices/VAT/ledger.

Headline recommendation: build Exact Online first, then Moneybird and an Open Banking aggregator
(Enable Banking or Tink) in parallel, then e-Boekhouden.nl and SnelStart for MKB reach, then
Twinfield for the accountant channel and Mollie/Stripe for payment native customers. AFAS, Yuki,
Visma and Unit4 are second wave or on demand.

---

## 2. Summary matrix

Legend: GL = general ledger (grootboek); Tx = bank/mutation transactions; Y = yes; ~ = partial or
conditional; N = no or not applicable; ? = not confirmed in official docs reached.

| Provider | Public API | Auth / OAuth2 | Financial objects | Webhooks | Published rate limits | Sandbox | Partner/App gate | API cost | Complexity | Cert for prod | Impl est. | Lock-in |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Exact Online | Y REST + legacy | OAuth2 auth-code | Invoices (sales/purchase), relations, GL, bank Tx, balance/P&L, VAT | Y | 60 calls/min/company; 50,000/day/company | Y | Y App Center; multi-customer apps need Exact approval | Free API; Exact sub needed | Med-High | Y | 4-8 wk | High |
| AFAS Profit | Y Get/UpdateConnectors | AfasToken header, not OAuth2 | Whatever admin exposes via connectors (can cover all) | Y | Not published | ~ | Y AFAS Connect; connectors per customer | Free API; AFAS licence | Med | Optional listing | 3-6 wk + per-customer | High |
| Twinfield (WK) | Y SOAP + newer REST | OpenID Connect / OAuth2 | Invoices, relations, GL/tx, balance/P&L, VAT | ? | Credit system since 2024-12-01; certified 1,000 credits/min per IP/ClientId/OrgId, 500 combined; non-certified 5% | Y | Y certification strongly rewarded (20x) | Free API; Twinfield licence | High (SOAP) | Y | 6-10 wk | High |
| Moneybird | Y REST (clean JSON) | OAuth2 + personal tokens | Sales/purchase invoices, contacts, financial mutations/statements, ledger accounts, VAT, docs | Y (10 retries) | 150 req / 5 min | ~ | Register app (self-serve) | Free API; Moneybird sub | Low | N | 1-3 wk | Med |
| Visma eAccounting / Visma.net | Y REST | OAuth2 (Visma Connect JWT) | Invoices, customers, GL/accounts, VAT, reports | ~ | Not prominently published | Y | Y partner programme | Free API; Visma licence | Med | ~ | 3-6 wk | High |
| SnelStart | Y B2B API v2 | OAuth2 password grant + subscription key | Invoices, relations, GL, bank Tx, VAT | ? | 500,000 calls/week (prod); dev key 90-day | Y | Y register + certification for prod key | Free API; SnelStart sub | Med | Y | 3-5 wk | Med-High |
| e-Boekhouden.nl | Y SOAP (legacy) + REST | Username + security codes (SOAP); token (REST) | Sales/purchase invoices, relations, GL mutations, VAT | ? | Not prominently published | ~ | Self-serve (enable in Beheer) | Free (in low-cost plans) | Low-Med | N | 2-4 wk | Med |
| Yuki | Y SOAP (+ REST portal) | API key (domain key) | Create customers, sales invoices, journals; retrieve accounting data | ? | 1,000 calls/day per domain (extendable) | ~ | Business Plan + admin role | In Business Plan | Med (SOAP) | N | 3-5 wk | High |
| Unit4 ERPx | Y REST (+ SOAP/XMLi) | OAuth2 | Full ERP financials, GL, e-invoicing (UBL), reports | ~ | Not published | Y | Y developer portal | Enterprise licensing | High | Y | 8-12 wk | High |
| Mollie | Y REST | API keys + OAuth2 (Connect) | Payments, settlements, balances (bank-feed format), refunds, chargebacks | Y | Reasonable (no fixed public number) | Y test mode | OAuth app for multi-merchant | Free API; per-tx fees | Low | ~ | 1-3 wk | Low |
| Stripe | Y REST (best-in-class) | API keys + OAuth (Connect) | Payments, balance, balance transactions, payouts, invoices, customers | Y (rich) | 100 read + 100 write req/s (live) | Y test mode | Connect for multi-account | Free API; per-tx fees | Low | N | 1-2 wk | Low |
| Open Banking aggregators | Y (Tink, Yapily, Enable Banking, Ponto, Salt Edge) | OAuth2 / API keys; bank SCA redirect | Bank account details + transactions only | ~ | Vendor-specific | Y | Y contract + AISP dependency | Mostly paid | Med | Y contract + consent | 4-8 wk | Low |

---

## 3. Per-provider notes

### Exact Online (NL): the anchor connector
FACTS. REST API (plus older bulk/XML). Auth is OAuth2 authorization-code; register an app in the
Exact App Center, and apps for multiple customers must be approved by Exact. Rate limits are a
minimum of 60 API calls per company per minute and a daily limit of 50,000 calls per company per
day; exceeding the daily budget returns HTTP 429. Bulk endpoints support up to 1,000 records per
call. The API surfaces the full accounting model: sales and purchase invoices, relations, general
ledger, bank/financial transactions, balance and P&L, and VAT.
ASSUMPTIONS. Exact is the de facto standard for NL SMB and accountancy firms, so it is the single
highest leverage connector. Expect a real app review step and per company rate budgeting as the
main engineering constraints. Implementation 4-8 weeks including review.

### AFAS Software (Profit): mid-market, config-driven
FACTS. GetConnectors (read) and UpdateConnectors (write) rather than a fixed object API. Auth is an
AfasToken (base64) in the Authorization header, not OAuth2. A GetConnector is defined by the
customer's AFAS administrator, who decides which records and fields are exposed. AFAS documents
Authenticatie, GetConnector, UpdateConnector, Vrije velden, BI-modellen and Webhooks.
ASSUMPTIONS. Because the data surface is defined per customer, onboarding is heavier: each customer
(or their AFAS partner) must publish the connectors you need. Great in mid-market and payroll heavy
orgs, weaker for self-serve micro SMB. No published rate limits found. Impl 3-6 weeks plus
recurring per customer configuration.

### Twinfield (Wolters Kluwer): accountant channel, SOAP-heavy
FACTS. Primarily SOAP/XML with OpenID Connect over OAuth2 and a newer REST surface. A credit based
rate system went live 2024-12-01: query operations cost 1 credit, other operations 3 credits. Per
the developer portal (surfaced via search; the page itself was egress blocked), certified
integrations get 1,000 credits/min per IP, per ClientId and per OrgId, with the combined bucket
capped at 500 credits/min; non certified integrations get 5% of that. Concurrency: max 20
concurrent per ClientId, 10 per ClientId+OrgId. Exposes invoices, relations, GL/transactions,
balance and P&L, VAT.
ASSUMPTIONS. Certification is effectively mandatory for production scale (20x rate budget). SOAP
plus session handling makes this the most technically awkward of the NL bookkeeping APIs. Strong
because Twinfield dominates the administratiekantoor/accountant segment. Impl 6-10 weeks. Flag: the
exact credit numbers are unverified against the live page due to the egress block.

### Moneybird: best developer experience for NL SMB/ZZP
FACTS. Clean REST/JSON API. Auth via OAuth2 or personal API tokens; scoped access. Rate limit 150
requests per 5 minutes. Full webhooks (retried up to 10 times on non-200). A synchronization API
cuts polling by around 90%. Objects: sales/purchase invoices, contacts, financial mutations and
statements, ledger accounts, VAT, documents.
ASSUMPTIONS. Lowest complexity of the NL bookkeeping systems, self-serve app registration, no
certification gate. Ideal early win. Impl 1-3 weeks.

### Visma (eAccounting NL + Visma.net ERP)
FACTS. In NL the product is eAccounting (`eaccountingapi.vismaonline.com`). Access via the
Spiris/Visma Developer Portal and a partner programme granting client id/secret, redirect URI and
sandbox on signup; auth is OAuth2 authorization-code (Visma Connect, JWT). Visma.net ERP offers
Interactive and Service OAuth flows, Swagger documented. Objects: invoices, customers, GL/accounts,
VAT, reports.
ASSUMPTIONS. Solid modern OAuth2. Smaller NL SMB share than Exact/e-Boekhouden/SnelStart, so second
wave. Impl 3-6 weeks.

### SnelStart: large MKB base, quirky auth
FACTS. B2B API v2, base `https://b2bapi.snelstart.nl/v2`, docs auto generated (Dutch). Auth is non
standard: OAuth2 password grant requiring a subscription key (`Ocp-Apim-Subscription-Key`) plus
base64 username/password. Production limit 500,000 calls/week; dev keys valid 90 days. Objects:
invoices, relations, grootboek, bank transactions, VAT. Certification required for a permanent/prod
key.
ASSUMPTIONS. 250k+ users makes it high value for MKB reach, but the credential model and
certification add friction. Impl 3-5 weeks.

### e-Boekhouden.nl: largest ZZP/small-business install base, cheap
FACTS. Two APIs: legacy SOAP and a newer REST. SOAP auth uses username plus security code 1 and
code 2; REST uses a token. Objects: sales/purchase invoices, relations, GL mutations, VAT. Broad
ecosystem of bank/webshop/POS/PSP integrations. API is self-serve (enable in settings).
ASSUMPTIONS. Frequently cited as the most popular bookkeeping tool in NL with the largest third
party ecosystem, and the API is effectively free within its low cost plans, which makes it very
attractive for breadth. REST is the path forward; SOAP is legacy. Impl 2-4 weeks.

### Yuki: accountant-mediated, SOAP
FACTS. SOAP webservices (plus a REST developer portal). Auth via a domain API key. Requires an
active Business Plan and a Portal Administrator/Management role to generate the key. Default limit
1,000 webservice calls/day per Yuki domain, extendable by the accountant. Objects: create
customers, sales invoices, general journals; retrieve accounting data.
ASSUMPTIONS. Yuki's model is accountant centric, so end customer onboarding runs through the
administratiekantoor. Second wave for a self-serve product. Impl 3-5 weeks.

### Unit4 (ERPx / Financials): enterprise, not core SMB
FACTS. REST (following the same business structure as SOAP/XMLi), Swagger documented. OAuth2.
Includes an Electronic Invoicing REST resource (submit UBL invoice/credit note). Full ERP
financials, GL, reporting.
ASSUMPTIONS. Aimed at larger organisations and public sector, not the MKB core. Include only if
enterprise customers demand it. High complexity. Impl 8-12 weeks.

### Mollie: payments and reconciliation data, NL-native
FACTS. REST API. Auth via API keys and OAuth2 (Mollie Connect) for multi-merchant apps. Settlements
API reports all merchant transactions grouped by payout; Balances API returns transactions in a
bank feed format including open/unsettled balances for reconciliation. Webhooks supported. Test
mode available.
ASSUMPTIONS. For a Finance Lens, Mollie gives clean settlement/balance data that reconciles to bank
payouts, but it is payment scoped, not a ledger. Very NL relevant. Impl 1-3 weeks. Cost is per
transaction on the merchant side, not per API.

### Stripe: best API, payment-scoped
FACTS. Best in class REST API. Auth via API keys plus Connect OAuth. Balance and Balance
Transaction objects capture every money movement; payouts, invoices, customers all exposed. Rich
webhooks. Rate limits 100 read plus 100 write requests/second in live mode, per key, 429 on breach.
ASSUMPTIONS. Same scope caveat as Mollie (payments, not full ledger). Lower NL SMB penetration than
Mollie for local methods (iDEAL). Impl 1-2 weeks.

---

## 4. Open Banking / PSD2 in NL/EU: realistic routes

Core trade off. Bank data via PSD2 requires an AISP (Account Information Service Provider) licence.
You either become a licensed AISP yourself (heavy: regulator authorization, capital, compliance,
per bank onboarding), or ride an aggregator's licence (fast: one contract, one API, many banks).
For a product, the aggregator route is almost always the right first move.

FACTS on the main aggregator routes:
- GoCardless Bank Account Data (formerly Nordigen). Licensed AISP regulated in Latvia; 2,300+ banks
  across 31 European countries; historically the only genuinely free PSD2 data API. Critical status
  change: new signups disabled since around July 2025. Existing accounts continue; new projects
  cannot onboard. No longer a viable new dependency.
- Enable Banking. 2,500+ banks across 29 European markets, strongest in Nordics/Baltics/CEE,
  positioned as the most self-serve and indie friendly account data provider. Widely cited as the
  practical replacement for GoCardless BAD for new EU/UK teams.
- Tink (Visa). Around 95% coverage in major European markets; both AISP and PISP (data plus
  payments). Common default for broad EEA coverage. Enterprise oriented commercial terms.
- Yapily. Around 2,000 banks across 19 countries including the Netherlands; authorized AISP and
  PISP in UK and EU; infrastructure only; strong business account connectivity.
- Ponto / Isabel Group. 1,800+ EU banks; Isabel is a Belgian/Benelux banking network incumbent, so
  strong NL/BE bank coverage specifically. Good regional fit.
- Salt Edge, TrueLayer also relevant: Salt Edge for broad coverage, TrueLayer for payments and
  white label.

FACTS on regulation (PSD3 / PSR / FIDA), as of 2025-2026:
- PSD3 + PSR: European Parliament and Council reached a provisional agreement on 2025-11-27. Formal
  adoption/publication expected around Q3 2026, then a 21-month transition, so full alignment by
  roughly end of 2027.
- FIDA (Regulation on a Framework for Financial Data Access, Open Finance): still in trilogue;
  expected formal adoption mid 2026, implementation from late 2027. FIDA extends open banking beyond
  payment accounts to mortgages, loans, savings, investments, insurance, pensions and crypto. It is
  a complement to PSD2/PSD3, not a replacement.

ASSUMPTIONS for the Finance Lens:
- Open Banking gives bank transactions only: no invoices, no grootboek, no VAT breakdown. It is
  complementary to the bookkeeping connectors, not a substitute. Use it to reach customers who do
  not use supported bookkeeping software, and to cross check ledger data against real bank movements.
- Given GoCardless BAD's closed signups, plan on a paid aggregator. For NL specifically, shortlist
  Enable Banking (self-serve), Tink (coverage plus payments), Yapily (confirmed NL plus business
  accounts), and Ponto/Isabel (Benelux bank strength).
- FIDA/PSD3 mean the regulatory surface is expanding in your favour over 2026-2027, but nothing you
  must act on now; near term, the aggregator plus AISP model remains the route. Budget for consent
  renewal UX (PSD2 re-consent cadence) regardless of which aggregator you pick.

---

## 5. Cost and access reality (quick reference)

- Bookkeeping/ERP APIs (Exact, AFAS, Twinfield, Moneybird, Visma, SnelStart, e-Boekhouden, Yuki,
  Unit4): the API itself is generally free; the cost is that the end customer must hold a paid
  subscription to that system, and several gate production behind app review or certification
  (Exact, Twinfield, SnelStart, Visma partner programme). Assumption: no per call API fees on these;
  verify Yuki's extra webservice module cost with the accountant.
- Payments (Mollie, Stripe): free API, revenue is per transaction on the merchant; no API access fee.
- Open Banking aggregators: mostly paid now that the free Nordigen/GoCardless route is closed to new
  signups. Pricing is per connection or per call and commercially negotiated; Enable Banking is the
  most self-serve.

---

## 6. Integration attractiveness ranking (what to build first)

Weighting: NL MKB market reach (40%), API quality and ease of access (30%), breadth of financial
objects (20%), strategic fit and lock-in avoidance (10%).

Tier 1, build first:
1. Exact Online. Dominant among NL SMB and accountancy firms, full financial object model,
   published limits, modern OAuth2. Highest leverage connector despite app review.
2. Moneybird. Best developer experience of the NL set, clean REST plus webhooks plus sync API,
   self-serve, huge ZZP/small-business base. Fastest path to a working integration.
3. One Open Banking aggregator (Enable Banking or Tink). Unlocks every customer regardless of
   bookkeeping software and provides ground truth bank transactions.

Tier 2, build next:
4. e-Boekhouden.nl. Very large small business/ZZP install base, largest third party ecosystem,
   effectively free API, self-serve. Prefer REST over legacy SOAP.
5. SnelStart. 250k+ users across ZZP and MKB; worth the awkward auth plus certification for reach.
6. Twinfield. The key to the accountant/administratiekantoor channel; certify to get the full rate
   budget. SOAP makes it the hardest lift, but channel value is high.

Tier 3, on demand / payment native:
7. Mollie then Stripe. Add when customers are payment led or need settlement/balance reconciliation.
   Mollie first for NL (iDEAL/local footprint).
8. Yuki and Visma eAccounting. Solid but smaller/niche; Yuki is accountant mediated.

Tier 4, only if enterprise demand:
9. AFAS (heavy per customer connector config; great in mid-market once a customer is committed) and
   Unit4 (enterprise ERP, outside the MKB core).

Which providers dominate NL small-business bookkeeping: the consistent signal is Exact Online (SMB
plus accountants, most comprehensive), e-Boekhouden.nl (most popular/largest integration ecosystem
for micro SMB and ZZP), SnelStart (250k+ users), and Moneybird (ZZP/small business, best DX). AFAS
SB and Visma eAccounting appear repeatedly as strong MKB alternatives; Twinfield and Yuki dominate
the accountant channel rather than direct to SMB. Build against those four leaders first and you
cover the large majority of NL MKB bookkeeping volume.

Caveat: none of the sources reached gave hard percentage market share figures; the ranking rests on
repeated qualitative most popular / most used / largest base signals from multiple 2025-2026 NL
comparison sources plus SnelStart's own 250k user figure. Validate with a paid Dutch accounting
software market study before locking the roadmap.

---

## 7. Key caveats to carry forward

1. Twinfield's exact credit numbers came from portal content via search, not the live page (egress
   blocked). Verify on developers.twinfield.com before sizing.
2. GoCardless Bank Account Data is closed to new signups since around July 2025. Do not design a new
   dependency on it; use Enable Banking / Tink / Yapily / Ponto instead.
3. No hard NL market share percentages were available from official/free sources; the ranking rests
   on qualitative signals plus SnelStart's self reported 250k users.
4. SnelStart and Twinfield certification and Exact/Visma app review are real production gates. Add
   2-4 weeks per gated provider for approval on top of build time.

---

## 8. Sources

Exact Online: chift.eu/blog/how-to-integrate-with-exact-online-api-in-2025; apideck.com/blog/guide-to-exact-online-api-integration; brixxs.com/faq/wat-zijn-de-limieten-van-de-exact-online-api/; brixxs.com/faq/waar-kan-ik-de-rest-api-referentiedocumentatie-van-exact-online-vinden/

AFAS Profit: docs.afas.help/Profit/; docs.afas.help/profit/en/authentication; docs.afas.help/profit/en/get-connector; docs.afas.help/profit/nl/update-connector

Twinfield: developers.twinfield.com/documentation/; developers.twinfield.com/documentation/getting-started/fair-use-policy (egress blocked); apideck.com/blog/how-to-integrate-with-the-twinfield-api; chift.eu/blog/twinfield-api-integration; docs.maesn.com/rate-limits

Moneybird: developer.moneybird.com/; developer.moneybird.com/authentication; developer.moneybird.com/webhooks/getting-started; developer.moneybird.com/changelog/2023-08-10

Visma: developer.vismaonline.com/docs/authentication; apideck.com/blog/spiris-visma-eaccounting-api-integration; docs.vismasoftware.no/vismanetapi/authentication/oauth/; community.visma.com Visma.net ERP API startup guide

SnelStart: b2bapi-developer.snelstart.nl/; developer.snelstart.nl/; snelstart.nl/api; apideck.com/blog/how-to-integrate-with-the-snelstart-api

e-Boekhouden.nl: e-boekhouden.nl/koppelingen/api; cdn.e-boekhouden.nl/handleiding/Documentatie_soap.pdf; softwarewiki.nl/boekhouding/e-boekhouden/api/

Yuki: support.yuki.nl/en/support/solutions/articles/80000787670-yuki-api-link; support.yuki.be/.../80000787603-yuki-api-documentation; developer.yukisoftware.com/; documenter.getpostman.com/view/12207912/UVCBB51L

Unit4: ap.unit4.com/rest.html; develop.unit4rd.com/; Unit4 API brochure (info.unit4.com)

Mollie: docs.mollie.com/reference/overview; docs.mollie.com/reference/get-next-settlement; docs.mollie.com/docs/connect-marketplaces-getting-started

Stripe: docs.stripe.com/rate-limits; docs.stripe.com/api/balance_transactions/list; docs.stripe.com/webhooks/handling-payment-events

Open Banking / PSD2: developer.gocardless.com/bank-account-data/overview; bankaccountdata.gocardless.com/new-signups-disabled; openbankingtracker.com/guides/free-open-banking-apis; enablebanking.com/blog/the-open-banking-provider-landscape-in-europe; openbankingtracker.com/open-banking-apis-europe; yapily.com/blog/tink-alternatives; isabel.eu/en/products/ponto

PSD3 / PSR / FIDA: nortonrosefulbright.com PSD3 and PSR readiness; pwc.nl new regulations payment sector; thepaypers.com FIDA explainer; powens.com/blog/eu-fintech-regulations-2026/

NL market positioning: boekhouder.nl/beste-boekhoudprogramma-mkb; appwiki.nl/boekhouding/programma/beste; bedrijfssoftwaregids.nl/blog/moneybird-vs-e-boekhouden-2026/; e-boekhouden.nl/info-ondernemers/beste-boekhoudprogramma-2026
