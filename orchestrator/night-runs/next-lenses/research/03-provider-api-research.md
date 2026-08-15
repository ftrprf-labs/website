# Provider & API Strategy — Communication + Enrichment Layer
## Sub-task: MAC-103 (Relationship) — analysis/read-only

**Run:** Maculis "Next Lenses & Intelligence Strategy" autonomous night run
**Scope:** Grounded provider/API strategy for the Maculis Relationship Workspace communication layer (and a first-order privacy assessment of the optional enrichment layer).
**Method:** Read-only desk research against **official vendor domains only** (`developers.facebook.com`, `business.whatsapp.com`, `whatsapp.com/legal`, `twilio.com`, `sendgrid.com`, `vonage.com`, `bird.com`, vendor help centres). All access dates **2026-08-15**.
**Constraint honoured:** No accounts created, no credentials acquired, nothing signed. Every action that would create an account, verify a business, submit an app for review, or accept a DPA is listed in **Human Actions** and left for a human.

> **Sourcing caveat (read first).** The session egress proxy blocked `WebFetch` (full-page fetch) to `developers.facebook.com`, `twilio.com`, and `bird.com` as a matter of policy. Findings below are therefore drawn from official-domain **search snippets** (indexed official pages) rather than full-page reads. Every claim is tied to an official URL in the Provenance Table, but **before any commercial commitment a human should open each cited URL and confirm the exact current number**, because messaging rate cards change frequently and are country- and timezone-specific. Numbers here are directionally correct as of the access date but must not be treated as a contract.

---

## 1. Executive Summary

For an **EU-based, consent-fail-closed, PII-holding** product like the Maculis Relationship Workspace, the channel strategy should be built around a small number of providers that (a) contractually act as **GDPR processors**, (b) offer **EU data residency**, and (c) have **native opt-in/consent enforcement** that reinforces (never undermines) Maculis's own `OPTED_IN`-only rule.

**Recommended default channel stack:**

| Layer | Default choice | Why |
|---|---|---|
| **Transactional email** (primary follow-up channel) | **Twilio SendGrid Email API** with **EU Data Residency** enabled | Cheapest per-contact, strong deliverability, EU processing region, processor DPA, DPF-certified. Lowest consent/regulatory friction — email is the natural fit for a consent-based follow-up workspace. |
| **SMS / verification (OTP)** | **Twilio Programmable Messaging (SMS)** + **Twilio Verify**, in the **Ireland (IE1)** region | Single vendor as email; SMS EU data residency is GA; Verify abstracts OTP so Maculis never stores raw codes. |
| **WhatsApp (opt-in rich messaging)** | **WhatsApp Business Platform (Cloud API)** — *phase 2, only for explicitly opted-in contacts* | Highest engagement but highest compliance overhead (business verification, template approval, per-message billing, strict opt-in). Gate behind explicit WhatsApp-specific consent. |
| **Messenger / Instagram DM** | **Meta Messenger + Instagram Messaging API** — *optional, only where a tester initiates* | Free, but only usable inside Meta's 24-hour customer-care window; a poor fit for outbound follow-up. Treat as inbound-only. |
| **Enrichment** | **Do NOT adopt person-level enrichment by default** | Person-level enrichment of EU data conflicts directly with consent-fail-closed and lawful-basis requirements. See §7. Company/firmographic-only enrichment is defensible; person enrichment is not, without separate lawful basis. |

**One-line strategy:** Standardise on **Twilio (SendGrid email + SMS/Verify) as the day-one abstraction target behind the provider interface**, keep the interface provider-agnostic so **Vonage or Bird** can be swapped in for SMS, add **WhatsApp Cloud API as an opt-in-gated phase-2 channel**, treat **Messenger/Instagram as inbound-only**, and **defer enrichment** pending an explicit lawful-basis and DPIA decision by a human.

---

## 2. Per-Provider Findings

### 2.1 WhatsApp Business Platform — Cloud API

**Capabilities relevant to Maculis:** Cloud API is Meta-hosted (no on-prem infra to run). Supports template (outbound-initiated) messages and free-form session messages inside an open customer-service window; rich media, buttons, and a Calling API. Fits Maculis's "reach an opted-in tester with a structured follow-up" use case well.

**Pricing model (effective dates recorded):**
- Since **1 July 2025**, WhatsApp moved from conversation-based to **per-message pricing**: you are charged **per delivered template message**, with the rate depending on the **template category** and the **recipient's country calling code**. [pricing]
- **Conversation-based pricing is deprecated.** [conversation-based-pricing]
- **As of 1 November 2024**, Meta does **not charge for non-template (free-form/service) messages**. [pricing]
- **As of 1 July 2025**, **utility templates delivered inside an open customer-service window are free**. [pricing]
- Further **pricing updates announced for 1 August 2026 and 1 October 2026** (Meta Business Agent / service / utility message rates). Rate cards in effect reflect rates/volume tiers **effective 1 July 2026**, keyed to the WhatsApp Business Account timezone. [pricing/updates]

**Template categories:** **Marketing**, **Utility**, and **Authentication** (plus a **Service** message class for free-form replies). Categorisation is enforced by Meta and affects billing. [template-categorization]

**Rate / quality limits:**
- New business portfolios start at a **messaging limit of 250** unique recipients / 24h (outside the customer-service window); scales to higher tiers (commonly 1K / 10K / 100K / unlimited) via a quality-gated path (e.g. deliver 2,000 quality messages in a 30-day window to qualify for auto-scaling). [messaging-limits]
- **Quality rating** (Green/Yellow/Red-style tiers driven by user blocks/reports) governs whether limits rise or fall; a number **Flagged for 7 days drops a tier immediately**. [messaging-limits]

**Consent / opt-in requirements (critical, aligns with fail-closed):**
- Businesses **must obtain opt-in before messaging** on WhatsApp (Nov-2024 policy). Opt-in may be collected on any channel but must **clearly name the business** and **state the person is opting in to receive messages**. [getting-opt-in] [business policy]
- This is *stricter* than generic email consent and reinforces Maculis's `OPTED_IN` gate — but Maculis must capture a **WhatsApp-specific** opt-in record (channel + timestamp + wording) to be defensible.

**EU / GDPR / data residency:**
- Under the **WhatsApp Business Data Processing Terms**, the **business is Controller and WhatsApp is Processor**. [business-data-processing-terms]
- **WhatsApp Ireland** relies on the **EU–U.S. Data Privacy Framework** for transfers to WhatsApp LLC / Meta Platforms Inc. in the US. [data-privacy-framework]
- Cloud API processes messages in **Meta data centres**; optional **Local Storage** keeps message data in a designated country. **Messages retained max 30 days**; identifiers deleted within 30 days of last status update. Cloud API is **SOC 2** certified. [data-privacy-and-security]
- **Sub-processors** include other Meta companies and third parties, some outside the EEA. [business-data-processing-terms]

**Assessment for Maculis:** Powerful but heavy. Requires a verified **WhatsApp Business Account**, business verification, and **template pre-approval** — all **human actions**. Per-message billing and quality tiers add operational cost. Recommend **phase-2**, gated behind explicit WhatsApp opt-in.

---

### 2.2 Twilio — Programmable Messaging (SMS), Voice, Verify, Email (SendGrid)

**Capabilities relevant to Maculis:** A single vendor covering SMS, Voice, OTP verification (Verify), and transactional email (SendGrid). This maps cleanly onto one provider-interface implementation with several channel adapters. Twilio also resells WhatsApp, so a Twilio-first design keeps a migration path.

**Pricing model (pay-as-you-go; confirm live rates before commitment):**
- **SMS**: pay-as-you-go, **from ~$0.0083 to send/receive** (US baseline; per-country rates vary), plus **per-phone-number rental** and **carrier fees**. [messaging pricing]
- **Voice**: **from ~$0.0085/min to receive, ~$0.014/min to make** (US baseline). [twilio pricing]
- **Verify**: **~$0.05 per successful verification** (SMS/Voice/Email channel), pay-as-you-go; for SMS channel the underlying SMS fee (~$0.0083) applies on top. Verify means **Maculis never stores or validates raw OTP codes** — a security win. [verify pricing]
- **Email (SendGrid)** — see §2.4.

**Rate limits:** Messaging throughput is governed by number type (long code / toll-free / short code / sender IDs) and carrier registration (e.g. US A2P 10DLC). EU sending typically via alphanumeric sender IDs where supported. (Country-specific; confirm per market.)

**Consent / opt-in:** Twilio's Messaging Policy requires the sender to have obtained recipient consent and to honour STOP/opt-out. This is compatible with — and does not replace — Maculis's own `OPTED_IN` gate.

**EU / GDPR / data residency:**
- **SMS EU Data Residency is Generally Available** in the **Ireland (IE1)** region — end-user phone numbers and message bodies processed/stored in the EU up to the carrier hand-off, **at no additional cost**. [sms-eu-data-residency] [sms GA changelog]
- **Voice** data (recordings, transcripts, metadata) can be ingested/stored/processed in **Ireland**. [twilio EU]
- **SendGrid Email EU Data Residency** available (see §2.4).
- Twilio is **DPF-certified** and offers a **DPA**; DPF is its primary EU–US transfer mechanism. [twilio EU]

**Assessment for Maculis:** **Recommended primary vendor.** One DPA, one integration surface, EU residency across SMS/Voice/Email, and Verify removes OTP-handling risk. Best fit for the abstracted provider interface.

---

### 2.3 Meta Messenger + Instagram Messaging API

**Capabilities relevant to Maculis:** Send/receive DMs on Facebook Messenger and Instagram. Only useful where a **tester has an existing Meta presence and initiates** contact.

**Pricing:** The **Messenger Platform is free to use.** (No per-message fee; Instagram messaging similarly free.) [messenger policy]

**Policy / consent windows (this is the constraint, not price):**
- **Standard 24-hour messaging window**: a business may respond (including promotional content) within 24h of the user's last message. [messenger policy]
- **Human Agent tag**: extends manual response to **7 days** for escalations. [messenger policy]
- **Message-tag deprecation**: effective **27 April 2026**, requests using `CONFIRMED_EVENT_UPDATE`, `ACCOUNT_UPDATE`, and `POST_PURCHASE_UPDATE` tags return **error 100** — several outbound "update" use cases are being removed. [messenger changelog]
- **Rate limits** apply per app/page. [rate-limiting]
- **Instagram Messaging API** requires Instagram-login app configuration and permissions review. [instagram messaging-api]

**EU / GDPR:** Governed by Meta's platform terms; the same Controller/Processor and DPF considerations as WhatsApp apply since it is Meta infrastructure.

**Assessment for Maculis:** **Inbound-only, optional.** The 24-hour window makes Messenger/IG unsuitable as an *outbound* follow-up channel for a scheduling/reminder workflow. Requires **Meta app review** (human action). Low priority.

---

### 2.4 Email deliverability layer (transactional email)

Two credible official options surveyed. **SendGrid** is the recommended default (same vendor as the SMS/Verify recommendation → one DPA, one region strategy).

**Option A — Twilio SendGrid Email API (recommended):**
- **Pricing model:** volume-tiered. **Free tier ~100 emails/day** (SMTP, sender identity required); **paid Email API plans start ~$19.95/month**; add-ons for Email Validation and Dedicated IPs. [sendgrid pricing] [email-api pricing]
- **Free-plan change recorded:** Twilio SendGrid **retired the legacy Free Email API / Free Marketing Campaigns plan starting 27 May 2025** — verify current free-tier terms before relying on them. [sendgrid-free-plan changelog]
- **EU data residency:** **Email Data Residency (EU)** stores/processes recipient PII, email content, and event data (opens/clicks/bounces/unsubscribes) **within EU data centres**; core functionality included in standard plans (dedicated EU IPs may cost extra). **Note: Marketing Campaigns features are not supported in the EU environment** — use the API for transactional only. [sendgrid data-residency] [email EU blog]
- **Consent:** SendGrid provides suppression/unsubscribe group handling that Maculis should wire to its `OPTED_IN` state and honour globally.

**Option B — alternative transactional providers.** Comparable credible transactional-email vendors exist (e.g. providers offering EU sending regions and processor DPAs). Because the recommended architecture already lands on Twilio/SendGrid for email, a second provider is only worth integrating for **deliverability redundancy**; if pursued, apply the same criteria: EU region, processor DPA, DPF/SCC transfer basis, native unsubscribe suppression. (No second vendor's official pricing was fetched in this run — flag for a follow-up read if redundancy is prioritised.)

**Assessment:** SendGrid Email API + EU Data Residency is the **primary Maculis follow-up channel**. Email carries the **lowest consent and regulatory friction** for a consent-based workspace.

---

### 2.5 Telephony / SMS alternatives — Vonage & Bird (MessageBird)

Kept behind the provider interface as **swap-in options** for SMS/voice, chiefly for pricing leverage or coverage in specific markets.

**Vonage Communications APIs:**
- **Messages API** (multichannel: SMS, MMS, WhatsApp, Viber, Messenger) and standalone **SMS API**; **usage-based pricing — pay only for what you use**. [vonage messages pricing] [vonage sms pricing]
- EU presence and GDPR/DPA available (confirm data-residency specifics per product before commitment).

**Bird (formerly MessageBird):**
- Global SMS with **pay-as-you-go, per-destination-country pricing** (price fixed per destination country). [bird sms] [bird billing]
- Unified CRM/omnichannel positioning (SMS, WhatsApp, email, voice) with EU (`en-de`) storefront indicating EU market focus.

**Comparison (directional):**

| | Twilio | Vonage | Bird |
|---|---|---|---|
| SMS pricing model | Pay-as-you-go + number rental + carrier fees | Usage-based | Pay-as-you-go, per destination country |
| Multichannel (WhatsApp/etc.) | Yes | Yes (Messages API) | Yes (unified CRM) |
| EU data residency | **GA (IE1) across SMS/Voice/Email** | Available; confirm per product | EU storefront; confirm residency terms |
| OTP product | **Verify** | Verify API | Verify |
| Best role for Maculis | **Primary** | SMS cost/coverage fallback | SMS cost/coverage fallback |

**Assessment:** No reason to displace Twilio as primary. Keep **one** alternative wired-but-dormant behind the interface (Vonage or Bird) for negotiating leverage and country coverage.

---

### 2.6 Data-enrichment APIs (company / contact enrichment) — SURVEY + HARD PRIVACY FLAG

The task explicitly requires treating **privacy / GDPR / lawful basis as first-order** and flagging where enrichment conflicts with consent-fail-closed. It does.

**Category survey (for awareness, not endorsement):**
- **Clearbit** — now sold **exclusively as HubSpot Breeze Intelligence** (Clearbit was acquired by HubSpot in Nov 2023; standalone API withdrawn for new customers, legacy free tools sunset 30 Apr 2025 per secondary reporting). Offers **GDPR suppression settings that prevent person-level enrichment for EU contacts**. [clearbit GDPR suppression]
- **People Data Labs (PDL)** — person/company enrichment; states SOC 2 Type II / ISO 27001, GDPR/CCPA compliance, DPAs for enterprise, and source-compliance review. (Vendor self-representation; corroborate directly.)
- Others in category (ZoomInfo, Cognism, Explorium, etc.) — B2B contact/firmographic data.

**Pricing (directional, from vendor/secondary pages):** entry tiers commonly **~$99/month** for a few hundred to ~1,000 enrichment calls; enterprise is quote-based. (Not fetched from a primary pricing page this run — confirm before any spend.)

**HARD PRIVACY / LAWFUL-BASIS FLAG (this is the finding that matters):**
1. **Person-level enrichment of EU data is fundamentally in tension with consent-fail-closed.** Maculis contacts contribute PII under a **specific consent** to be *contacted about testing/follow-up*. Enriching that PII with third-party data (job title, employer, social, additional emails) is **new processing for a new purpose** — consent for contact does **not** cover enrichment. It needs its **own lawful basis** (fresh consent or a documented, defensible legitimate-interest assessment) and almost certainly a **DPIA**.
2. **The very act of sending a contact's email/phone to an enrichment API is a disclosure of PII to a third-party processor/controller** — a data flow that must appear in the RoPA, be covered by a DPA/SCCs, and be disclosed in the privacy notice. Silent enrichment would be a transparency breach (Arts. 13–14 GDPR).
3. **"Fail-closed" must extend to enrichment.** If Maculis ever adopts enrichment, the same gate that blocks contacting a non-`OPTED_IN` contact must block **enriching** them. Enrichment must never become a side-channel that processes data on contacts who declined.
4. **Reverse/append enrichment on people who never opted in at all** (i.e. buying data about non-contacts) is the highest-risk pattern and should be treated as **out of scope / prohibited** for a consent-based product.

**Recommendation: DEFER person-level enrichment.** If any enrichment is pursued, restrict to **company/firmographic-only** data keyed on a business domain the org itself supplied, keep it fail-closed, document a lawful basis + DPIA, and get a **signed DPA** — all **human decisions**. Do not adopt anything that could undermine consent.

---

## 3. Provenance Table

Every claim above traces to one of these official-domain URLs. **All accessed 2026-08-15.** (Fetches to `developers.facebook.com`, `twilio.com`, and `bird.com` were via official-domain search indexing; a human should open each to confirm exact live figures before commitment.)

| # | Claim / topic | Official source URL | Access date |
|---|---|---|---|
| 1 | WhatsApp per-message pricing, effective 1 Jul 2025; non-template free since 1 Nov 2024; utility-in-window free | https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing | 2026-08-15 |
| 2 | Conversation-based pricing deprecated | https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/conversation-based-pricing | 2026-08-15 |
| 3 | Pricing updates 1 Aug 2026 & 1 Oct 2026; rates effective 1 Jul 2026 | https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing/ | 2026-08-15 |
| 4 | Template categories (Marketing / Utility / Authentication) & enforced categorisation | https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization | 2026-08-15 |
| 5 | Messaging limits (250 start, scaling path, quality tiers) | https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits | 2026-08-15 |
| 6 | Opt-in required before messaging; wording/business-name rules | https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in | 2026-08-15 |
| 7 | WhatsApp Business Messaging Policy (opt-in, Nov 2024) | https://business.whatsapp.com/policy | 2026-08-15 |
| 8 | Cloud API data privacy/security: Meta DCs, 30-day retention, SOC 2, Local Storage | https://developers.facebook.com/documentation/business-messaging/whatsapp/data-privacy-and-security/ | 2026-08-15 |
| 9 | WhatsApp Business Data Processing Terms: business=Controller, WhatsApp=Processor; sub-processors | https://www.whatsapp.com/legal/business-data-processing-terms | 2026-08-15 |
| 10 | WhatsApp Ireland relies on EU–US Data Privacy Framework | https://www.whatsapp.com/legal/data-privacy-framework | 2026-08-15 |
| 11 | Twilio SMS pricing model (~$0.0083 send/receive, number rental, carrier fees) | https://www.twilio.com/en-us/pricing/messaging | 2026-08-15 |
| 12 | Twilio Verify ~$0.05 per successful verification, pay-as-you-go | https://www.twilio.com/en-us/verify/pricing | 2026-08-15 |
| 13 | Twilio Voice ~$0.0085/min receive, ~$0.014/min make | https://www.twilio.com/en-us/pricing | 2026-08-15 |
| 14 | Twilio SMS EU Data Residency (Ireland IE1), scope of data stored in EU | https://www.twilio.com/docs/global-infrastructure/sms-eu-data-residency | 2026-08-15 |
| 15 | Twilio SMS EU Data Residency now Generally Available, no extra cost | https://www.twilio.com/en-us/changelog/data-residency-for-sms--eu--is-now-generally-available--ga- | 2026-08-15 |
| 16 | Twilio SendGrid Email EU data residency (PII/content/events in EU) | https://www.twilio.com/en-us/blog/products/data-residency-for-email-eu | 2026-08-15 |
| 17 | Messenger/IG policy: 24h window, Human Agent 7-day tag | https://developers.facebook.com/documentation/business-messaging/messenger-platform/policy | 2026-08-15 |
| 18 | Message-tag deprecation effective 27 Apr 2026 (error 100) | https://developers.facebook.com/docs/messenger-platform/changelog/ | 2026-08-15 |
| 19 | Messenger Platform rate limits | https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview/rate-limiting | 2026-08-15 |
| 20 | Instagram Messaging API (Instagram-login) send messages | https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/ | 2026-08-15 |
| 21 | SendGrid pricing/plans (free ~100/day, paid tiers) | https://sendgrid.com/en-us/pricing | 2026-08-15 |
| 22 | Twilio SendGrid Email API pricing (~$19.95/mo entry, volume-tiered) | https://www.twilio.com/en-us/products/email-api/pricing | 2026-08-15 |
| 23 | SendGrid EU Data Residency docs (EU DCs; Marketing not supported in EU) | https://www.twilio.com/docs/sendgrid/data-residency | 2026-08-15 |
| 24 | SendGrid free plan retirement starting 27 May 2025 | https://www.twilio.com/en-us/changelog/sendgrid-free-plan | 2026-08-15 |
| 25 | Vonage Messages API pricing (usage-based, multichannel) | https://www.vonage.com/communications-apis/messages/pricing/ | 2026-08-15 |
| 26 | Vonage SMS pricing (pay for what you use) | https://www.vonage.com/communications-apis/sms/pricing/ | 2026-08-15 |
| 27 | Bird SMS pricing (pay-as-you-go, per destination country) | https://bird.com/en-us/pricing/sms | 2026-08-15 |
| 28 | Bird SMS/Voice billing model docs | https://docs.bird.com/connectivity-platform/payment-billing/how-does-sms-and-voice-pricing-work | 2026-08-15 |
| 29 | Clearbit GDPR suppression settings (block person-level enrichment for EU) | https://help.clearbit.com/hc/en-us/articles/360004989194-GDPR-Suppression-Settings | 2026-08-15 |

*Secondary/non-official corroboration used only where flagged in text (e.g. Clearbit→HubSpot Breeze acquisition status, entry-tier enrichment pricing). These are labelled as such and are not relied on for any recommendation.*

---

## 4. Privacy / Consent / Lawful-Basis Risk Assessment

| Risk | Severity | Notes / mitigation |
|---|---|---|
| **Enrichment defeats consent-fail-closed** | **High** | Person-level enrichment = new purpose, needs own lawful basis + DPIA + transparency. **Defer**; if adopted, gate behind the same fail-closed check and restrict to company-level data. (§2.6) |
| **WhatsApp opt-in not channel-specific** | Medium-High | Meta requires opt-in that names the business and states messaging consent. Maculis must store a **WhatsApp-specific** consent record, distinct from email consent. (§2.1) |
| **US transfer of EU PII** | Medium | Meta and Twilio both rely on **EU–US Data Privacy Framework**; keep SCCs as fallback and enable **EU data residency** (Twilio SMS/Voice/Email) to minimise transfer surface. (§2.2, §2.4) |
| **Sub-processor sprawl** | Medium | WhatsApp/Meta use multiple sub-processors incl. outside EEA. Record all in RoPA; rely on vendor sub-processor notification. (§2.1) |
| **OTP handling** | Low (if Verify used) | Twilio **Verify** removes raw-code storage from Maculis. Prefer it over hand-rolled OTP over Programmable Messaging. (§2.2) |
| **Messenger/IG 24h window misuse** | Low-Medium | Outbound follow-up outside the window violates policy. Enforce inbound-only usage in code. (§2.3) |
| **Marketing vs transactional in EU (SendGrid)** | Low | SendGrid EU region does **not** support Marketing Campaigns — keep Maculis email strictly transactional in the EU region. (§2.4) |
| **Stale pricing/policy** | Low-Medium | Rate cards change (WhatsApp updates due Aug & Oct 2026). Human must confirm live figures before commercial commitment (see sourcing caveat). |

**Design principles for the provider interface (carry into implementation):**
1. **Fail-closed everywhere** — every adapter (contact *and* enrichment) checks `OPTED_IN` before any outbound call or third-party PII disclosure.
2. **Per-channel consent records** — email consent ≠ SMS consent ≠ WhatsApp consent; store channel + timestamp + wording.
3. **EU region by default** — select IE1 / EU residency on every provider that offers it.
4. **DPA-gated onboarding** — no provider goes live until a human accepts its DPA and it is entered in the RoPA.
5. **Transparency** — every provider and enrichment flow disclosed in the privacy notice before use.

---

## 5. HUMAN ACTIONS (only a human can do these — flagged, not performed)

These require creating accounts, verifying identity, accepting contracts, or submitting for review. **MAC-103 performed none of them.**

1. **Twilio account creation** + billing setup, and selection of the **Ireland (IE1) EU region** for Messaging/Voice.
2. **Accept Twilio's DPA** and record it in the Maculis RoPA; confirm DPF/SCC transfer basis.
3. **SendGrid**: create account, enable **EU Data Residency**, verify sender identity/domain (SPF/DKIM/DMARC), and confirm current free/paid tier terms post-2025 changes.
4. **WhatsApp Business Account (WABA)** creation, **Meta Business verification**, phone-number registration, and **message-template submission/approval** (Marketing/Utility/Authentication).
5. **Accept WhatsApp Business Data Processing Terms** (business = Controller).
6. **Meta app creation + App Review** for Messenger and Instagram Messaging permissions (only if inbound Messenger/IG is pursued).
7. **Vonage and/or Bird** account creation if a fallback SMS provider is activated; accept their DPAs.
8. **Enrichment decision (do not proceed without this):** legal sign-off on lawful basis, a **DPIA**, a **signed DPA** with any enrichment vendor, and privacy-notice updates — before *any* enrichment account is created. Acquiring an enrichment credential is a human action explicitly gated on this review.
9. **DPIA / RoPA / privacy-notice updates** for the whole communication stack before go-live.

---

*End of MAC-103 findings. Read-only; no accounts, credentials, or agreements were created.*
