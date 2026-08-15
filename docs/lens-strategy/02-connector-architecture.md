# Maculis Connector Architecture

> Companion to the Lens Strategy Masterplan (`00-masterplan.md`) and the Lens Architecture
> (`01-lens-architecture.md`). Purpose: a single shared connector layer so that no lens ever rebuilds
> OAuth, token refresh, webhooks, retries, rate limits, or consent. Design the foundation first, then
> prioritise which providers to actually build. For this assignment we design and prioritise; we do
> not activate any production connector (see the masterplan non-autonomy list and HUMAN ACTIONS).

---

## 0. Why this exists

The Finance and Marketing research (see `research/`) shows that every serious connected data source
carries the same recurring machinery: OAuth2 (or a quirky variant), token refresh, per tenant
credentials, rate limits that differ per provider (Exact 60/min/company, Moneybird 150/5min,
GSC 1,200 QPM, Twinfield credit budget), webhooks with signature verification, incremental sync, and
a consent and withdrawal lifecycle. If each lens implements this itself, the roadmap pays the same
tax repeatedly and the security surface multiplies. A shared connector plane pays it once.

The Communication Layer already proves the pattern in miniature: `server/comm/providers/*` defines a
single neutral provider interface (`send / capabilities / normalizeInbound / requiredConfig`), with
EMAIL live via Resend and WhatsApp/SMS/phone/social as full mock adapters that report exactly which
credentials they still need. The connector plane generalises this proven shape from outbound
communication to inbound evidence acquisition.

---

## 1. Design principles (inherited from FTRLABS Architecture Principles)

The connector plane is bound by the FTRLABS Architecture Principles (`ftrlabs-docs`): API First, No
Vendor Lock-in, Multi-Tenant, Privacy by Design, Security by Design, Human in the Loop, Clean
Architecture. Concretely:

1. Provider neutrality. A lens asks for financial objects or marketing metrics in a normalised shape.
   It never imports an Exact SDK or a GSC client directly. Swapping Exact for Moneybird for a given
   tenant changes configuration, not lens code.
2. Capability declaration, not assumption. Each provider declares which capabilities it supports
   (invoices, ledger, bank transactions, reviews, search analytics) and at what confidence and
   freshness. A lens reads capabilities and degrades gracefully when one is absent. This is the same
   idea as `capabilities()` in the comm providers.
3. Consent is a first-class object, not a flag. Every connection carries an explicit, purpose scoped,
   revocable consent with provenance. Withdrawal deletes derived data and stops sync. This extends the
   fail-closed `mayContact` stance from communication to data ingestion.
4. Secrets never touch code, logs, or docs. Credentials live in a vault, encrypted per tenant. Logs
   carry `METHOD PATH -> status` and provenance references, never tokens or bodies (the existing
   logging discipline).
5. Everything is versioned and auditable. Connector version, provider API version, sync cursor, and
   the exact objects read are stamped on the evidence so a reveal is reproducible.

---

## 2. Component model

```
                       ┌─────────────────────────────────────────────┐
                       │              Connector Plane                 │
                       │                                              │
  Lens (finance.core) ─┤  Provider Registry   ── capabilities        │
       asks for        │  Credential Vault    ── per-tenant secrets  │
   normalised objects  │  OAuth Lifecycle     ── connect/refresh     │
                       │  Consent Ledger      ── scope + withdrawal   │
                       │  Sync Engine         ── incremental, cursors │
                       │  Rate Limiter        ── per provider budget  │
                       │  Retry / Backoff     ── idempotent, jittered │
                       │  Webhook Receiver    ── signature verified   │
                       │  Normalizer          ── provider -> canonical│
                       │  Provenance Stamper  ── source refs on data  │
                       │  Health / Observ.    ── per connection state │
                       └─────────────────────────────────────────────┘
                                        │
                          Canonical Financial / Marketing objects
                                        │
                                  Evidence Bundle  ──►  frozen Reveal Engine
```

### 2.1 Provider Registry
A declarative catalogue. Each entry: `providerId`, display name, category (accounting, banking,
payments, search, ads, reviews, registry), auth type (`oauth2_authcode`, `oauth2_password`,
`api_key`, `token`, `afas_token`), capability set, published rate limits, sandbox availability,
production gate (none / app-review / certification / partner), and data classes it can surface. The
research matrices in `research/finance-integration-landscape.md` and
`research/marketing-and-outside-in-evidence.md` are the seed content for this registry.

### 2.2 Credential Vault
Per tenant, per connection encrypted storage of tokens and refresh tokens. Tenant isolation is
enforced by design (Architecture Principle 3). No credential is ever returned to the browser; the
existing Testerbeheer stance (privacy by default, opaque tokens, secrets only in env) is the baseline.

### 2.3 OAuth Lifecycle
One implementation of authorization-code, refresh, and revoke, parameterised per provider. Handles
the awkward cases the research surfaced: SnelStart's password grant plus subscription key, AFAS's
static `AfasToken` header (no refresh), LinkedIn's mandatory monthly version header, Klaviyo's moved
token endpoint. Each quirk is a registry field, not a fork.

### 2.4 Consent Ledger
Append-only record of what was granted, for what purpose, by whom, when, and its withdrawal state.
Mirrors the consent model already in `server/comm/consent.mjs` and the fail-closed contactability
gate. A lens may only read objects whose consent is active for the lens's declared purpose.

### 2.5 Sync Engine
Incremental sync with per connection cursors (Moneybird's synchronization API and Exact's sync
endpoints are first-class here; polling is the fallback). Emits domain events (`InvoiceSynced`,
`BankTransactionsUpdated`) that continuous lenses subscribe to. Respects deletion and consent
withdrawal by tombstoning derived data.

### 2.6 Rate Limiter and Retry
A per provider token-bucket configured from the registry (Exact 60/min/company, Moneybird 150/5min,
Stripe 100/s, Twinfield credit budget, GSC 1,200 QPM). Retries are idempotent with exponential
backoff and jitter, and they surface `429` and `Retry-After` handling in one place.

### 2.7 Webhook Receiver
One signature-verified intake (the comm layer already verifies Svix/Resend signatures; the same
discipline applies to provider webhooks). Verifies, deduplicates by idempotency key, persists, and
routes to the sync engine.

### 2.8 Normalizer
Maps provider-specific payloads to canonical objects (see section 3). This is the boundary that gives
the lens provider neutrality. A normalizer is small and testable against recorded fixtures.

### 2.9 Provenance Stamper
Every canonical object carries `{ providerId, objectType, objectId, asOf, connectionId }`. This is
what lets a reveal answer "waar zie je dat" for connected data, and what makes a reveal reproducible
and auditable.

### 2.10 Health and Observability
Per connection state (connected, needs-reauth, rate-limited, error), last successful sync, and
freshness. A stale or broken connection degrades the lens to a lower disclosure level rather than
producing a wrong reveal.

---

## 3. Canonical object model (the normalisation target)

Lenses read these, never provider payloads. Minimal shapes for the first wave:

- Finance
  - `LedgerAccount { id, code, name, type, asOf, provenance }`
  - `JournalEntry / Transaction { id, date, amount, accountId, counterparty?, vatCode?, provenance }`
  - `Invoice { id, direction(sales|purchase), customerId|supplierId, issued, due, gross, net, vat, status, lines[], provenance }`
  - `Relation { id, role(customer|supplier), name, externalIds, provenance }`
  - `BankTransaction { id, bookingDate, amount, currency, counterparty?, description, accountRef, provenance }`
  - `Report { kind(pl|balance), period, lines[], provenance }` (used when only report-level data is available)
- Marketing
  - `SearchAnalyticsRow { query|page, clicks, impressions, ctr, position, date, provenance }`
  - `TrafficMetric { channel, sessions, users, conversions, revenue, period, provenance }`
  - `ReviewAggregate { source, rating, count, sampledReviews[], recency, provenance }`
  - `AdSpend { platform, campaign, spend, impressions, clicks, conversions, period, provenance }`
  - `PublicSiteSignal { kind(perf|schema|security|a11y|tech|dns), value, method(lab|field|deterministic), provenance }`

Each canonical object carries a `confidence` mapped to the engine's `EvidenceLevel` at ingestion, so
observations inherit a defensible confidence without the lens guessing.

---

## 4. Disclosure levels and the connector plane

The connector plane serves all four disclosure levels the masterplan defines, and Level 1 needs no
credentials at all:

- Level 1 Outside In. Public evidence connectors: website fetch, PageSpeed/CrUX, DNS/RDAP, security
  headers, KVK registry, public Places aggregate. No OAuth, no vault, minimal consent (it is public
  data about the business), but still rate limited and provenance stamped. This is where every lens
  starts and where the connector plane earns trust before asking for anything.
- Level 2 Bring Your Data. File ingestion connectors (see section 5). No live credential; a consent
  to process the uploaded file.
- Level 3 Connected. Full OAuth connectors (Exact, Moneybird, GSC, GA4, and so on) with vault,
  refresh, sync, webhooks.
- Level 4 Continuous. The sync engine plus event subscriptions turn periodic reads into change
  detection for continuous lenses.

---

## 5. File ingestion (the underrated connector)

The Finance-without-API strategy (masterplan section on zero integration finance) depends on treating
file upload as a first-class connector, reusing the exact pattern already shipped in Testerbeheer's
importer (`server/import.mjs`: CSV/XLSX parsing, column mapping, validation, dedupe, safe preview).
Generalise it to:

- Accept CSV, XLSX, and structured PDF (P&L, balance, aged receivables/payables, bank export, invoice
  export) plus a small set of hand-entered key figures.
- Recognise and normalise the file into the same canonical objects as the API connectors, so the lens
  code is identical whether data came from Exact or from an uploaded trial balance.
- Never trust an upload blindly: validate, show a safe preview (the green/orange/red pattern already in
  the importer), and stamp provenance as `providerId: file_upload`.
- Files with personal data follow the existing minimisation and retention rules; the file is processed,
  the canonical objects retained per policy, the raw file retained only as long as needed.

File ingestion is the highest-leverage connector because it delivers Level 2 value for many lenses
with no provider approval, no OAuth, and no per provider rate limit.

---

## 6. What to build first (connector roadmap, not activation)

This is a build order, not an instruction to activate anything now. Activation of any production
connector is a HUMAN ACTION (see masterplan).

1. Generic connector plane skeleton: registry, vault interface, OAuth lifecycle, rate limiter, retry,
   provenance, normalizer boundary, health. Provider-agnostic. Fully mockable, following the comm
   provider precedent (mock adapters that declare required config).
2. Level 1 public-evidence connectors (no credentials): website fetch is already built in
   `maculis-first-five.` `src/live`; add PageSpeed/CrUX, DNS/RDAP, security headers, KVK, public Places
   aggregate. These power Marketing-outside-in and enrich the current lens.
3. File ingestion connector (generalised importer). Powers Finance Level 2.
4. First OAuth connector: Exact Online (highest leverage per the finance research), behind app review
   as a HUMAN ACTION. Moneybird as the low-friction second to validate the plane on a clean API.
5. One Open Banking aggregator (Enable Banking or Tink) for bank-transaction ground truth, as a
   commercial HUMAN ACTION.
6. GSC and GA4 for the Marketing lens connected level (low approval friction).

Everything beyond this (e-Boekhouden, SnelStart, Twinfield, Mollie/Stripe, GBP, Meta, LinkedIn, Ads)
is added on demand, each as a registry entry plus a normalizer plus its production gate.

---

## 7. Anti-patterns the connector plane refuses

- No lens talks to a provider SDK directly.
- No credential in code, logs, docs, or the browser.
- No sync without a consent that is active for the reading purpose.
- No connector without a mock adapter and recorded fixtures for tests.
- No production connector activated during design or pilot work; activation is an explicit human
  decision with its own review.
- No provider quirk handled by forking the OAuth code; quirks are registry fields.
