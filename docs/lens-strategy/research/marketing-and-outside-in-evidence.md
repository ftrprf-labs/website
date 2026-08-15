# Marketing Lens and Outside-In Evidence: Data Sources and APIs

> Research artifact for the Lens Strategy Masterplan. Current as of August 2026. Facts from official
> docs and strong secondary sources; assumptions and items needing legal/technical confirmation are
> marked. Context: Dutch/EU SMB entrepreneurs, so GDPR posture and Dutch sources (KVK) matter.
> Confidence tags: [F] fact from official/strong source, [A] assumption/inference, [V] verify against
> primary contract/ToS before building on it.

---

## Part A: Connected marketing APIs (owner grants OAuth)

| API | OAuth2 | Key scopes / tokens | Key objects / metrics | Rate limits | Approval / review | Cost | Complexity | Sandbox |
|---|---|---|---|---|---|---|---|---|
| Google Search Console | Yes (required) | webmasters.readonly, webmasters (sensitive) | Search Analytics: clicks, impressions, CTR, position by query/page/country/device/date; URL Inspection; Sitemaps | 1,200 QPM per site and per user; ~30M queries/day per project; 25,000 rows/request | No app review; sensitive scope triggers OAuth verification for external apps | Free | Low-Med | No sandbox; use own verified property |
| GA4 Data API | Yes (or service account) | analytics.readonly (sensitive) | runReport, batch, realtime, pivot; sessions, users, conversions, revenue, channels | Token model: 40,000 Core tokens/property/hour, 200,000/day, 10 concurrent/property | No app review; sensitive scope triggers OAuth verification | Free (GA4 standard) | Med (token accounting, sampling) | Own property / GA4 demo account |
| Google Business Profile | Yes | business.manage | Accounts, Locations, Reviews (read + reply), Local Posts, Media, Performance (calls, direction requests, searches, views) | 300 QPM per API after approval; new projects start at zero quota | Required allowlisting: verified GBP 60+ days, website domain matches email domain, concrete use case; ~14-day review | Free once approved | High (approval friction + many sub-APIs) | No sandbox; real verified location |
| Meta Graph (FB/IG + Ads) | Yes (Facebook Login) | pages_show_list, pages_read_engagement, read_insights, instagram_basic, instagram_manage_insights, ads_read, business_management | Page insights, IG media/account insights, Ads Insights (spend, reach, impressions, CPC, ROAS) | Business Use Case rate limits, app and per-object throttling | App Review + Business Verification for Advanced Access to data you do not own | Free | High (review, verification, token refresh) | Dev mode + test users |
| LinkedIn Marketing / Pages | Yes (3-legged) | r_organization_social, rw_organization_admin, r_ads, r_ads_reporting | Organization/Page stats (follower, share, page-view), Ad campaigns and adAnalytics | Per-app and per-member daily throttles; monthly versioning header mandatory | Required: Marketing Developer Platform / Community Management application; some APIs restricted to select partners with no timeline | Free | High (gating, partner selection, versioning) | Development tier |
| Google Ads | Yes + developer token + login-customer-id | adwords | GAQL over campaigns, ad_group, metrics (cost_micros, impressions, clicks, conversions), recommendations, search terms | Basic 15,000 ops/day; Standard higher | Developer token approval (Test/Explorer/Basic/Standard); Basic requires review | Free | High (dev token, GAQL, MCC) | Test manager accounts |
| Microsoft/Bing Ads | Yes (Entra) + developer token | Entra app | Campaigns, reporting, bulk | Per-service throttling | Developer token self-serve; production writes need Super Admin. Lighter gate than Google | Free | Med; target REST (SOAP decommission Jan 2027) | Sandbox available |
| TikTok Ads | Yes (advertiser auth) | client_key/secret | Campaign/adgroup/ad reporting (spend, impressions, video views, conversions), audience | Tiered | App review + business verification; basic in days, advanced 1-3 weeks | Free | Med-High | Sandbox ad accounts |

Email marketing (all low complexity, self-serve): Mailchimp (API key datacenter-suffixed or OAuth2,
free tier, lists/campaigns/reports/automations), Klaviyo (private/public key or OAuth for apps; OAuth
token traffic must route to a.klaviyo.com/oauth/token since 2025-03-31; rich events/metrics), Brevo
(api-key header or OAuth2, simple REST, contacts/campaigns/transactional stats).

Part A takeaways:
- Easiest to light up: Search Console and GA4. Standard OAuth, free, no bespoke approval, immediately
  usable against the owner's own property. First-class connect targets.
- High-friction but high-value: Google Business Profile (60-day/domain-match allowlisting), Meta (app
  review + business verification), LinkedIn (partner gating, no timeline), Google Ads (developer
  token). Budget weeks of lead time. For a young product these approvals are the main schedule risk,
  not the coding.
- Meta and LinkedIn approvals are use-case reviews: every requested permission must map to a visible
  screen and a data-retention story. Design the connect UX first, then apply.

---

## Part B: Zero-integration outside-in evidence (no login)

Recurring legal principle: fetching a single public page you were pointed at, at a polite rate,
honoring robots.txt, is materially different from mass scraping. Most ToS problems come from bulk
extraction, bypassing anti-bot measures, or storing/redistributing third-party content. Public DNS and
RDAP have essentially no usage restriction. Third-party review platforms and Google Maps content carry
real ToS and caching constraints.

| Signal | How obtained | What you learn | Reliability | Legal / privacy notes |
|---|---|---|---|---|
| Performance / CWV (lab) | PageSpeed Insights API v5 (free, key, 25,000 req/day; runs Lighthouse) | LCP, CLS, INP proxy (TBT), score, opportunities | High but run-to-run variable | Public, within Google ToS |
| CWV (field / real users) | CrUX API (free, key) by origin/URL; CrUX on BigQuery | Real-user LCP/CLS/INP, 28-day rolling, phone vs desktop | High where present; [F] only for origins above a popularity threshold | Aggregated, anonymized, opted-in Chrome users |
| Structured data / schema.org, OG, meta, sitemap, robots | Direct HTTPS fetch + parse; Rich Results / Schema Validator for spot checks | LocalBusiness/Organization/Product schema, OG completeness, title/description, indexable page count, crawl directives | Very high (deterministic) | Honor robots.txt, identify UA, rate-limit |
| Accessibility (WCAG) | axe-core (MPL-2.0, run via Playwright), Lighthouse a11y, Pa11y | Contrast, alt text, labels, ARIA, landmarks | Automated tools catch only ~30-40% of WCAG issues; good for gross failures, not a verdict | Runs on your own render; no restriction |
| SEO on-page + mobile-friendliness | Parse title/meta/H1/canonical/hreflang/word count; Lighthouse SEO + viewport/tap-target | On-page hygiene, canonical/hreflang, mobile signals | High for on-page facts | Google standalone Mobile-Friendly Test API retired Dec 2023; use Lighthouse |
| SSL/TLS, security headers, HSTS | Read response headers yourself (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) + TLS handshake; optional Mozilla HTTP Observatory v2 (free) | HTTPS enforcement, HSTS, header hardening, cert validity/expiry, protocol/cipher grade | High | [V] SSL Labs ToU restricts commercial/redistributive use; reading headers/cert yourself is unrestricted; Observatory is open |
| Tech stack detection | OSS rulesets (enthec/webappanalyzer, tunetheweb/wappalyzer, wappalyzergo MIT); WhatWeb | CMS, framework, hosting, analytics/marketing pixels (GA4, Meta Pixel, tag managers), CMP, ecommerce | Medium (fingerprint-based; false pos/neg) | Fingerprinting your own fetch is fine; MIT rulesets reusable; Wappalyzer proprietary DB is not |
| GBP public data | Google Places API (New) Place Details | rating, userRatingCount, up to 5 reviews, categories, hours, website | High for rating/count | [V] Pricing tiers (rating is Pro-tier); [V] Maps ToS restricts caching most Places content beyond place_id |
| Other review platforms | Trustpilot Business Units API (public, keyed, owned-business oriented) | Presence, aggregate rating, review count | Medium | [V] Trustpilot ToS forbids scraping; prefer official aggregate fields |
| Company registry KVK (NL) | KVK API (developers.kvk.nl): Zoeken (free), Basisprofiel, Vestigingsprofiel, Naamgeving | Official registration, trade name, legal form, SBI activity codes, address, branches | Authoritative | [F] EUR 6.40/mo per key + EUR 0.02/query; up to 300k/mo, <=100 QPS; requires a Dutch registered entity (Maculis qualifies); residential addresses shielded |
| EU business registers | BRIS via European e-Justice Portal | Existence, registered office, number, type, status across EU | Authoritative | [F] No API, manual search only; national registers vary |
| DNS / MX / email deliverability | Public DNS TXT/MX (dig or DNS-over-HTTPS) | SPF, DMARC policy, MX host (Google Workspace vs M365 vs other), MTA-STS, DKIM if selector known | High for SPF/DMARC/MX; DKIM needs selector | Fully public DNS; strong, underused professionalism/security signal |
| Social presence + consistency | HTTP existence checks on platform handle URLs; compare handle and NAP | Which platforms, handle consistency, dead vs live | Medium (squatting, private/renamed) | Existence/public-metadata fine; do not scrape profile content |
| Domain age / WHOIS | RDAP (mandated for gTLDs since 2025-01-28, structured JSON) | Creation date, registrar, nameservers, DNSSEC, status | High for dates/registrar | GDPR redacts registrant PII; dates and registrar are fine |

Part B notes:
- The CrUX coverage gap is the biggest outside-in limitation for this audience [A]: most Dutch SMB
  sites sit below CrUX's popularity threshold, so real-user field CWV will be absent for a large share
  of targets. Fall back to Lighthouse lab data (PSI) and label it lab, not field. This affects any
  "your real users experience X" claim.
- Google Maps / Places caching [V]: before storing review rating/count in a profile, confirm the
  current Maps ToS on caching. Displaying live is safer than persisting.
- Trustpilot and SSL Labs are the two sources where a naive integration could breach ToS. Use
  Trustpilot official aggregate fields only, and do not make SSL Labs a productized feature. Both are
  replaceable: read headers/cert yourself, and read review aggregates only from sources that permit it.
- KVK is a genuine advantage for a Dutch product [F]: authoritative, cheap, real-time, and you qualify
  for a key. It anchors NAP verification and lets you cross-check the registered name/address against
  what the website and GBP claim.

---

## Part C: Cross-signal relationships for a Marketing Lens (revealworthy)

Test for revealworthy: it combines two or more signals the owner never looks at together, and the
combination points at money left on the table or risk hidden behind a nice surface. Single-signal
observations (your site is slow, you have a Facebook page, your title tag is long) are trivial and
belong in the background, not the headline.

1. Earned demand that leaks at the door. High GSC impressions and decent position on high-intent
   queries, but low CTR and poor LCP/mobile CWV. Already ranking and seen, then losing the click.
   Evidence: GSC + PSI/CrUX LCP. Reliability: high (field CWV may be missing, then weaker lab claim).
2. Reputation capital that never reaches search. Strong GBP rating and review count, but no
   LocalBusiness/Organization schema and inconsistent NAP. Google cannot connect the trusted profile
   to the site, so the reputation does not lift rankings. Evidence: Places rating/count + homepage
   schema + KVK/DNS NAP. Reliability: high.
3. Paying for traffic the site wastes. Active ad spend, but landing pages fail mobile CWV, carry no
   detectable conversion pixel, or thin schema. Evidence: Ads spend + PSI mobile + pixel fingerprint.
   Reliability: high for spend/performance; pixel detection medium.
4. Old and invisible. RDAP creation date 10+ years ago and an established GBP, but very low GSC
   impressions and a thin indexed footprint. Long-standing trusted business, nearly absent from
   organic search. Evidence: RDAP + GBP + GSC + sitemap size. Reliability: high.
5. Marketing to the spam folder. Active email marketing (ESP detected) while the domain has no DMARC
   enforcement (p=none or absent) and weak SPF. Deliverability has a ceiling and the brand is
   spoofable. Evidence: DNS DMARC/SPF/MX + ESP fingerprint. Reliability: high for DNS; ESP link medium.
6. Social effort with no owned payoff. Healthy IG/FB cadence and follower growth, but GA4 shows near-
   zero social referral sessions and no assisted conversions. Evidence: Meta insights + GA4 channels.
   Reliability: high when both connected.
7. Content bloat. Large sitemap and many indexed pages, but traffic concentrated on two or three URLs
   while the rest are flat zero. Evidence: sitemap + GSC page-level + GA4. Reliability: high.
8. A widening reputation gap the owner cannot feel. Comparable local competitors have more and more
   recent reviews, while the subject's review velocity is flat even at 4.6 stars. Recency and volume,
   not just average, drive the local pack. Evidence: Places rating/count/recency for subject + a
   competitor set. Reliability: medium-high (only 5 reviews via API; rating/count solid).
9. A pretty site with a soft underbelly. Good on-page SEO and performance, but no HSTS, weak security
   headers, mixed content, or a near-expiry cert. Evidence: header/cert read + Observatory.
   Reliability: high.
10. Buying clicks you already own. Google Ads spend on the brand's own name while GSC shows the site
    ranks #1 organically for those brand terms. Brand-bidding waste, unless a competitor is bidding.
    Evidence: Ads search terms + GSC brand queries. Reliability: high, but needs a competitor-bidding
    judgment before calling it waste.
11. A fractured identity across the web. The GBP website link, the actual domain, and the KVK-
    registered name/address disagree, or GBP points at a social page. Citations contradict, so local
    SEO signals cancel out. Evidence: Places website field + live site + KVK Basisprofiel. Reliability:
    high (three authoritative sources).
12. Tracker drag plus consent exposure. Heavy load of marketing pixels, high blocking time, and no
    consent-management platform detected. Trackers slow the site and likely fire before consent, a
    GDPR exposure for this EU audience. Evidence: tech fingerprint (pixels + CMP) + PSI TBT.
    Reliability: medium (flag as worth a check, not a legal verdict).

Trivial by contrast (keep as supporting detail, not insight): your page is slow, you are not on
TikTok, your meta description is missing, your SSL is valid. Their value only appears when paired.

---

## Assumptions and open items to confirm before building

- [V] Google Maps Platform ToS on caching/storing Places rating/userRatingCount/reviews. Displaying
  live is the safe default.
- [V] SSL Labs Terms of Use for any productized use; prefer reading headers/cert directly or Mozilla
  Observatory.
- [V] Current Places API and CrUX/PSI free-tier ceilings at projected volume (pricing tiers move).
- [A] CrUX field data unavailable for a large fraction of Dutch SMB sites; design the lens to degrade
  to lab data gracefully.
- [A] Pixel/tech-stack detection has meaningful false-positive/negative rates; present it as detected,
  not confirmed.
- [F] GBP, Meta, LinkedIn, Google Ads all require multi-week approvals that gate the connected side;
  sequence product/legal work accordingly.

---

## Sources

Part A: developers.google.com/webmaster-tools/limits and /v1/how-tos/authorizing and
identity/protocols/oauth2/scopes; developers.google.com/analytics/blog/2023/data-api-quota-management;
developers.google.com/my-business/content/limits and /prereqs and /faq; developers.facebook.com/docs/permissions/
and /docs/instagram-platform/api-reference/.../insights/; learn.microsoft.com/linkedin/marketing/increasing-access
and /integrations/marketing-tiers and shared/authentication/getting-access; linkedin.com/legal/l/marketing-api-terms;
developers.google.com/google-ads/api/docs/api-policy/access-levels and /developer-token;
learn.microsoft.com/advertising/guides/authentication-oauth; business-api.tiktok.com/portal/docs;
developers.tiktok.com/products/commercial-content-api; mailchimp.com/developer/guides/marketing-api-conventions;
developers.klaviyo.com/en/docs/set_up_oauth and /authenticate_; developers.brevo.com/docs/getting-started

Part B: developers.google.com/codelabs/chrome-web-vitals-psi-crux; developer.chrome.com/docs/crux/api and
/methodology; github.com/mdn/mdn-http-observatory; ssllabs.com Terms of Use; notifications.qualys.com SSL Labs
API v4; dev.to Wappalyzer paywalled OSS replacement; seomator.com Wappalyzer alternatives;
developers.google.com/maps/documentation/places/web-service/usage-and-billing; woosmap.com Places pricing;
developers.trustpilot.com Business Units API; corporate.trustpilot.com business terms; developers.kvk.nl/pricing
and /faq/billing and /apis; ec.europa.eu e-Justice BRIS; icann.org launching RDAP sunsetting WHOIS 2025-01-27;
dynadot.com WHOIS vs RDAP 2025

Secondary (approval friction, pricing): xovionlabs.com GBP hidden gate; graphapi.substack.com Meta approval;
getphyllo.com LinkedIn API 2026; debugbear.com PSI API guide. Load-bearing numbers tagged [V] to confirm
against primary contracts before committing product or pricing.
