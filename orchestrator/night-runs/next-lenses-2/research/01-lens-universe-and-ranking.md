# The Maculis Lens Universe and Candidate Ranking

EPIC-2 WS-1 (MAC-107/108) — analysis/read-only

> Strategic deepening of Next Lenses. This document designs the **full** Maculis lens
> universe (far broader than the six First Five lenses in EPIC-1), ranks every candidate
> on twelve weighted criteria, and argues a Top-10 shortlist and a roadmap with an
> explicit provisional pick for **Lens #2**. It changes no product code and claims no
> knowledge of repo internals beyond the EPIC-1 deliverables cited below. New assumptions
> are marked **[ASSUMPTION]**.

Builds directly on (does not repeat):
[`masterplan.md`](../../next-lenses/masterplan.md) ·
[`research/01-first-five-next-lenses.md`](../../next-lenses/research/01-first-five-next-lenses.md)
(the six lenses: Clarity of Promise, Reachability, Freshness, Findability Basics,
Accessibility First Pass, Name/Identity Consistency) ·
[`research/02-relationship-intelligence-layer.md`](../../next-lenses/research/02-relationship-intelligence-layer.md).

---

## 0. What EPIC-1 settled, and where this goes next

EPIC-1 established the **lens contract** (observes / evidence / fail-closed / precision-first
silence / placement / privacy / negative-controls) and one deliberate constraint: the First
Five slate reads **only the public subject surface, with no external accounts**. That constraint
is not a limitation to escape. It is the reason the lenses are trustworthy. This document keeps
the contract and asks a bigger question: *across the whole of what an entrepreneur could be shown
about their business, which perspectives can Maculis actually stand behind, and which are the ones
that will make someone say "I never saw that"?*

The honest answer reorganises the whole space around **one axis the EPIC-1 slate did not have to
confront: evidence availability.** Most classic business domains cannot be observed from evidence
Maculis can ethically and reliably obtain. Naming that up front is the spine of everything below.

### 0.1 The evidence-availability tiers (the organising insight)

| Tier | Evidence source | Reliability / privacy | Fit with the lens contract |
|---|---|---|---|
| **A. Own public surface** | The subject's own site: rendered DOM, copy, headers, sitemap, its own linked pages | High precision, no third-party PII, tester-verifiable | **Native home of the lens.** All six First Five lenses live here. |
| **B. Wider public web** | Search results, review platforms, competitor sites, WHOIS, Wayback, the owner's own linked profiles | Coverage is patchy, results are ToS-bound, some carry third-party personal data | **Conditional.** Each needs a precision case and a privacy case before it ships. |
| **C. Entrepreneur-provided / integrated** | Accounting, analytics, CRM, the Relationship Workspace's own conversation and journey events | Reliable but private, consent-gated, higher friction | **Different surface.** Belongs to the Relationship product and to GrowBrain, not First Five. |
| **D. Unobservable / inferred** | Finance, margin, market size, "innovativeness" as such | Cannot be grounded in verifiable evidence about *this* subject | **Fail-closed to silence, i.e. worthless as a lens.** These are the kills. |

**The strategic consequence:** the WOW lenses are almost all Tier A. A tiny, cheap, public signal
that reveals something the entrepreneur genuinely had not seen about *themselves* is the magic.
The moment a lens needs Tier C data the entrepreneur already has (their own finances), the surprise
evaporates; the moment it needs Tier D it cannot speak without guessing, which the whole product
forbids. This is the **opposite of the obvious hypothesis** that "more business domains covered =
more valuable lenses." Breadth of *domain* is a trap. Breadth of *cheap, surprising, verifiable
perspective* is the prize.

### 0.2 A note on scoring, given the no-score rule

The product rule "never a numeric score" governs **lens output to the entrepreneur**. It does not
forbid **internal portfolio scoring** of lens *candidates* in a strategy document. The ranking in
Section 4 is internal engineering triage and is never surfaced to a tester. All *sample tester copy*
below obeys the house no-dash rule (no hyphen or dash used as a stylistic pause).

---

## 1. The lens universe, one concept per required domain

Each entry gives: **Reveals** (the chosen perspective) · **The surprise** (what the entrepreneur
did not see) · **Evidence** (tier + source) · **Verdict**. Sample copy is illustrative and dash-free.

### Marketing — "Message Discipline" (D-MKT)
- **Reveals:** whether the site says *one* coherent thing, or scatters across many competing claims and calls to action.
- **The surprise:** you believe you have a focused message. The lens counts seven different value claims and four competing next steps on a single page. The visitor chooses none.
- **Evidence:** Tier A. Extracted headings, value statements, and CTAs across the primary pages.
- **Verdict:** **Viable, high value.** Strong GrowBrain pull ("which one message should win?").
- Sample copy: "Op deze pagina staan zeven beloftes en vier knoppen. We telden ze voor je."

### Brand / positioning — "Who You Sound Like" (routed to N-CLICHE, see 2)
- **Reveals:** whether your language differentiates you, or echoes generic category boilerplate.
- **The surprise:** your "unique" copy is interchangeable with your category. The swap-the-logo test passes on your competitors' sites too.
- **Evidence:** the *reliable* version is Tier A (cliché-corpus match on your own copy, invented as N-CLICHE in Section 2). The competitor-comparison version is Tier B and weaker (see kill note in 3.3).
- **Verdict:** **Viable via the Tier A cliché lens.** The competitor-comparison framing is downgraded.

### Proposition — "Proposition Backing" (D-PROP)
- **Reveals:** whether each promise on the site sits next to concrete proof (a specific, an example, a number, a name), or floats unsupported.
- **The surprise:** your strongest promise has nothing beside it; a throwaway feature has three proofs. You backed the wrong claim.
- **Evidence:** Tier A. Claim-to-proof adjacency in the rendered DOM.
- **Verdict:** **Viable, top-tier.** High commercial and GrowBrain value; the natural depth question is "what proof would you add?".
- Sample copy: "Naast jullie grootste belofte staat geen enkel bewijs. We keken wat er direct naast stond."

### Customer — "Audience Legibility" (D-CUST)
- **Reveals:** whether a first-time visitor can tell, in seconds, *who this is for*.
- **The surprise:** the site never names its customer. You assumed it was obvious because it is obvious to you.
- **Evidence:** Tier A. Presence and placement of audience signposting in the hero and primary landing view.
- **Verdict:** **Viable.** Note: partial overlap with Clarity of Promise (what you do) versus this (for whom). Ship as a distinct facet or fold; see 3.2.

### Commercial performance — "Are You Winning?" (K-COMMPERF)
- **Reveals:** revenue and sales trajectory.
- **Evidence:** Tier D. Not observable from any public surface.
- **Verdict:** **KILL as a lens.** See 3.1. Belongs to GrowBrain over provided data.

### Sales — "Path to Yes" (D-SALES)
- **Reveals:** whether there is one clear, unbroken path from interest to a buying or contact action.
- **The surprise:** your primary path has a dead end, or three equally-weighted next steps, so the visitor who *wants* to buy cannot tell how.
- **Evidence:** Tier A. CTA presence, path continuity, form reachability. (Distinct from Reachability: that asks "can they contact you"; this asks "can they act/buy".)
- **Verdict:** **Viable, strong commercial value.**

### Finance — "The Books" (K-FIN)
- **Reveals:** financial health. **Evidence:** Tier C/D. Private and, from the public surface, unobservable.
- **Verdict:** **KILL as a public lens.** The entrepreneur already sees their finances; no surprise, and any public inference would be a guess. GrowBrain territory only.

### Cashflow — "Runway" (K-CASH)
- **Reveals:** liquidity and runway. **Evidence:** Tier C/D. Unobservable publicly.
- **Verdict:** **KILL.** Same reasoning as Finance. A *proxy* ("Payment Friction", how many steps to actually pay you) is real but is a CX/Sales lens, not a cashflow lens.

### Margin — "Where the Money Leaks" (K-MARGIN)
- **Reveals:** unit economics. **Evidence:** Tier D publicly.
- **Verdict:** **KILL as a lens.** The *interesting, observable* cousin is pricing confidence (below), not margin.

### Pricing — "Price Visibility and Confidence" (D-PRICE)
- **Reveals:** whether a price is visible at all, and *how confidently* it is presented (shown plainly, hidden behind "contact us", or only ever expressed as a discount).
- **The surprise:** your only price signal is a discount, which quietly tells every visitor you do not believe your own price. Or: you hide price to protect it, while the visitor reads the silence as "too expensive to say".
- **Evidence:** Tier A. Presence and shape of pricing on the public pages.
- **Verdict:** **Viable and among the highest-ranked** (Section 4). Caveat: hiding price is *correct* for many models (bespoke services), so the lens must fail closed on ambiguity rather than scold. Reliability landmine flagged in the roadmap.
- Sample copy: "Jullie prijs zien we alleen als korting. Nergens staat de prijs zelf."

### Operations — "Operational Promises" (D-OPS)
- **Reveals:** whether the operational promises the site *makes* actually hold: the booking flow opens, the checkout loads, the form submits, the opening hours agree with each other.
- **The surprise:** your "book now" leads to an error, or your hours contradict across two pages, and no visitor ever told you.
- **Evidence:** Tier A, functional. Harder to make reliable (functional interaction, more moving parts).
- **Verdict:** **Conditional.** High value, lower build speed and reliability. Sequence after the pure-read lenses.

### Team / organisation — "The Faces Behind It" (D-TEAM)
- **Reveals:** whether credible, real humans are visible behind the business, or it presents as a faceless facade.
- **The surprise:** people buy from people, and there is not a single human anywhere on your site.
- **Evidence:** Tier A. Presence of team/about/named-people, at presence level only.
- **Verdict:** **Viable but modest WOW. Privacy flag:** reads third-party personal data (employees). Must stay at presence level, never profile, minimal excerpt, never re-publish. See 3.4.

### Customer experience — "The First Two Minutes" (D-CX)
- **Reveals:** the friction a real first-time visitor meets on arrival: stacked popups, cookie walls, load jank, a signup demanded before any value is shown.
- **The surprise:** you never see your own site as a stranger on a phone. The lens shows three interruptions before a single line of content.
- **Evidence:** Tier A. Render-time interstitials, consent-wall and popup detection, mobile viewport behaviour.
- **Verdict:** **Viable, very high WOW** (the stranger's-eyes magic). Reliability of interstitial detection needs care.

### Reputation — "What Others Say" (D-REP)
- **Reveals:** whether the business has a visible public reputation footprint (testimonials on site, reviews elsewhere) or is invisible.
- **The surprise:** you have strong reviews on one platform and surface none of them; or you have none anywhere and did not realise how that reads.
- **Evidence:** the on-site-testimonial-presence version is Tier A and viable. The external-review version is **Tier B, flagged**: coverage is patchy, matching the right business is error-prone, and reviewer text carries third-party PII.
- **Verdict:** **Conditional.** Ship the Tier A "do you show the proof you have" version; defer external-review fetching.

### Digital findability — "Branded Search Presence" (D-FIND)
- **Reveals:** whether searching your own business name surfaces *you*, clearly and first.
- **The surprise:** your own name does not bring you up first, or brings up something you do not control.
- **Evidence:** Tier B. External search, which is ToS-bound and unstable.
- **Verdict:** **Downgraded.** The Tier A basics are already covered by First Five's Findability Basics; the Tier B extension is low-reliability. Flag 3.3.

### Competition — "Category Neighbours" (D-COMP)
- **Reveals:** who a visitor perceives as your alternatives, and how indistinguishable your language is from theirs.
- **The surprise:** you share your core claims with five lookalikes.
- **Evidence:** Tier B. Requires identifying competitors, which is **fuzzy and easy to get wrong**.
- **Verdict:** **Downgraded / GrowBrain-only.** Competitor identification cannot meet precision-over-recall as a fail-closed lens; naming the wrong competitor is a confident wrong finding. The *safe* expression of "are you distinctive" is the Tier A cliché lens (N-CLICHE), which needs no competitor list.

### Market — "The Water You Swim In" (K-MARKET)
- **Reveals:** market size and trend. **Evidence:** Tier D for *this* subject; only generic reports exist.
- **Verdict:** **KILL as a lens.** A market lens *sounds* valuable but cannot be evidence-bound to the subject. It would be generic content wearing a lens costume.

### Growth — "Compounding Assets" (D-GROW)
- **Reveals:** whether the business is accumulating assets that bring people back (content, indexable pages, email capture, a reason to return), or running on one-shot cold traffic.
- **The surprise:** you have no way to bring anyone back. Every visit is a first visit forever.
- **Evidence:** Tier A for the assets themselves; Tier B (Wayback) if you want growth-*over-time*.
- **Verdict:** **Viable (Tier A version).** Strong GrowBrain pull.

### Risk — "Concentration and Exposure" (D-RISK)
- **Reveals:** visible single points of failure: one contact channel, one person the whole brand rests on, a domain or certificate about to expire.
- **The surprise:** your entire business routes through one free mailbox and one person's name.
- **Evidence:** concentration is Tier A; cert/domain expiry is Tier B (headers/WHOIS).
- **Verdict:** **Conditional.** Moderate WOW; overlaps the founder-dependency lens (3.4). Keep framing to resilience, never judgement.

### Resilience — "Graceful Degradation" (D-RESIL)
- **Reveals:** whether the site holds up under stress: works without JavaScript, on a slow connection, when a third party fails.
- **The surprise:** block one script and your whole site is blank.
- **Evidence:** Tier A. No-JS render, third-party dependency count.
- **Verdict:** **Conditional. Boundary risk:** overlaps Technical Signals. Confirm remit before shipping (same open question EPIC-1 raised for Findability Basics).

### Innovation — "Are You Standing Still?" (K-INNOV)
- **Reveals:** innovativeness. **Evidence:** Tier D. Subjective and unobservable.
- **Verdict:** **KILL as a standalone lens.** The only observable signal (has anything changed over time) is already Freshness/Growth. Do not dress subjectivity as a lens.

### AI / digital maturity — "Digital-Era Tell" (D-AIMAT)
- **Reveals:** the era and sophistication of the digital stack, without shaming.
- **The surprise:** you feel current; the stack signals a decade ago.
- **Evidence:** Tier A/B fingerprint from public markup and headers.
- **Verdict:** **Conditional. Two risks:** heavy overlap with Technical Signals, and a strong pull toward becoming a scolding maturity *score*, which the product forbids. Only viable as a restrained, single-observation facet.

### Relationship intelligence — "Relationship Temperature" (D-REL)
- **Reveals:** across real conversation and journey events, which relationships are warming and which are going cold, each backed by the specific messages and events that moved it.
- **The surprise:** the deal you thought was hot has gone quiet; a contact you ignored is quietly engaging.
- **Evidence:** Tier C. Internal Relationship Workspace data (inbound messages, journey events), consent-gated, tenant-scoped, PII-bearing. Grounded in EPIC-1 doc 02.
- **Verdict:** **Viable, but a different surface and product.** Highest commercial and GrowBrain value of any lens, but consent-fail-closed and PII discipline are hard gates, and it is *not* a First Five public lens. Roadmap it as the flagship of the **Relationship** lens track, not the First Five track.

### Founder / leadership — "Founder Dependency" (D-FOUND), responsible version only
- **Reveals:** how much of the business's *own public identity* rests on one person, framed as key-person resilience.
- **The surprise:** your name and face are the entire brand. If you step back, there is nothing else.
- **Evidence:** Tier A, and **strictly the subject's own site**, never external profiling of the individual.
- **Verdict:** **Conditional, highest creepiness risk in the set.** See 3.4. A lens *about a person* is a line the product should approach only from the business's own self-presentation, never by enriching the individual. If in doubt, fold into D-RISK and drop the personal framing.

---

## 2. Invented lens categories (the hunt for the surprising)

These are not in the domain list. They are where the magic concentrates: tiny Tier A signals that
reveal something genuinely unseen. The strongest new ideas are here, not in the classic domains.

### "What You Repeat" (N-REPEAT) — the obsession tell
- **Reveals:** the word or theme you unconsciously repeat most across your whole site. Your real obsession, made visible.
- **The surprise:** your most-repeated word is a feature *you* love. The word your customer would use appears zero times. You have been talking to yourself.
- **Evidence:** Tier A. Term-frequency across your own copy. Cheapest possible evidence, fully verifiable, no corpus, no external call, no PII.
- **Why it is special:** this is the purest expression of the Maculis promise. It shows you something essential you had not seen, from evidence you can check in one glance, and the depth question writes itself ("why do you keep saying this, and what does your customer actually search for?"). **Provisional Lens #2** (Section 5).

### "Who You Sound Like" (N-CLICHE) — cliché density
- **Reveals:** how much of your language is category cliché ("passionate about", "we go the extra mile", "customer-centric solutions") versus specific to you.
- **The surprise:** most of your copy is interchangeable with anyone in your field.
- **Evidence:** Tier A, matched against a maintained cliché corpus (a small internal build/maintenance dependency, but no per-subject external call). More reliable than the Tier B competitor-comparison it replaces.
- **Verdict:** **Top-tier.** This is the safe, evidence-bound form of "positioning".

### "The Accidental Message" (N-PLACEHOLDER) — what you did not mean to say
- **Reveals:** signals the owner never intended and cannot see: a live placeholder ("Lorem ipsum", "Your Company Name", default template text), a test page still indexed, a broken image that has been there since launch.
- **The surprise:** a placeholder from launch day is still public, still indexed, and you stopped seeing it years ago.
- **Evidence:** Tier A, very high precision (default-string and template-artifact detection).
- **Verdict:** **Delightful, high WOW, extremely safe.** Modest commercial/GrowBrain depth (it is a "gotcha" more than a strategy), which is why it ranks just below the strategic lenses. Excellent for the shareable, "Pass the Lens" moment.

### "The Question You Don't Answer" (N-OBJECTION) — the objection gap
- **Reveals:** the obvious buyer question the site never addresses (no price, no "how it works", no "who it is for", no proof).
- **The surprise:** the single thing every buyer needs to know is nowhere on the site.
- **Evidence:** Tier A, checklist-based, so reliable and fail-closed by construction.
- **Verdict:** **Top-tier customer value and GrowBrain pull.** Slightly more *useful* than *magical*; overlaps Clarity, Proposition and Pricing, so it works best as a synthesis lens later, not as the surprise-lead.

### "Built for the Thumb" (N-MOBILE) — the mobile reality
- **Reveals:** what the site is actually like for the majority who arrive on a phone: tap targets, readable text, no sideways scroll, the real mobile hero.
- **The surprise:** you design on a desktop; on a phone your call to action sits below three screens of menu.
- **Evidence:** Tier A, mobile-viewport render facts. Reliable, cheap.
- **Verdict:** **Viable, very high WOW** on the device most visitors actually use.

### "The Echo" (N-ECHO) — what shows when someone passes your link
- **Reveals:** the gap between how you describe yourself (your copy) and how the web describes you when your link is shared (the OG/meta card, the search snippet).
- **The surprise:** what appears when someone passes your link is not what you would ever choose to say.
- **Evidence:** Tier A. OG/meta versus hero copy.
- **Verdict:** **Viable, high WOW,** and it ties directly to **"Pass the Lens"** (sharing): the lens is *about* what happens when your business is shared. Strong viral/brand alignment.

### "The Effort Map" (N-EFFORT) — where the care went
- **Reveals:** where effort was clearly invested versus neglected (a polished homepage, a stub "Services" page, an empty contact page).
- **The surprise:** the page that matters most to buyers is your least-tended one.
- **Evidence:** Tier A. Relative completeness/tending across key pages.
- **Verdict:** **Viable, mid-tier.**

### "The Confidence Tell" (N-HEDGE) — hedging language
- **Reveals:** hedging and uncertain language ("we try to", "we hope", "one of the leading") that undercuts authority.
- **The surprise:** your key promise is hedged while your disclaimer is confident.
- **Evidence:** Tier A, but **reliability flagged**: this needs linguistic judgement and false positives are easy. Would need a tightly-bounded, high-precision pattern set.
- **Verdict:** **Conditional.** Attractive idea, precision risk. Ship only after the two-bucket strength model is proven on safer lenses.

### "Two Doors, One Person" (N-SURFACES) — cross-surface consistency
- **Reveals:** whether who you are on your site matches who you are on the one other public surface *you yourself link to* (same name, same promise, same recency).
- **The surprise:** your site says one thing; the profile you link to says another, or is dead.
- **Evidence:** Tier B, but limited to links the subject *published themselves* (a softer consent posture than crawling for them).
- **Verdict:** **Conditional, moderate.** Privacy is manageable *only* because it follows the subject's own outbound links.

### "The Load You Put on Others" (N-THIRDPARTY) — the invisible passengers
- **Reveals:** how many third parties (trackers, scripts) load on arrival, the passengers every visitor carries.
- **The surprise:** twenty-two trackers fire before your content does.
- **Evidence:** Tier A. Request inventory.
- **Verdict:** **Conditional.** Overlaps Technical/Resilience, but it is strongly aligned with the Maculis privacy-first brand and could be framed as a values statement rather than a defect.

---

## 3. Critical stance (required): kills, flags, and the opposite of the obvious

### 3.1 The kill list (explicit, with reasons)

| Killed lens | Reason it dies | Where the real value lives instead |
|---|---|---|
| **Commercial Performance** | Tier D. Unobservable from any surface Maculis may read. | GrowBrain over entrepreneur-provided data. |
| **Finance** | Tier C/D. Private; the entrepreneur already sees it, so zero surprise. | GrowBrain, on integrated accounting. |
| **Cashflow** | As Finance. A public inference would be a guess. | "Payment Friction" (a CX/Sales lens), if wanted. |
| **Margin** | Tier D publicly. | Pricing Confidence (D-PRICE) is the observable cousin. |
| **Market size / trend** | Cannot be bound to *this* subject; only generic reports exist. A lens that is really just a content article. | Not a lens at all. |
| **Innovation (as such)** | Subjective and unobservable. The only observable part is change-over-time. | Folded into Freshness / Growth. |
| **Competitor identification lens (D-COMP as fail-closed lens)** | Identifying competitors is fuzzy; naming the wrong one is a confident wrong finding, which violates precision-over-recall. | The Tier A cliché lens (N-CLICHE) answers "are you distinctive" with no competitor list. |
| **Branded Search Presence (D-FIND, Tier B part)** | ToS-bound, unstable, low precision; the reliable basics are already First Five. | Keep First Five Findability Basics; drop the search extension. |

**The discipline:** a lens dies not because the domain is unimportant, but because Maculis cannot
*ground* it. An ungroundable lens can only stay silent (useless) or guess (forbidden). Killing it is
the fail-closed principle applied at the portfolio level.

### 3.2 Overlap / fold decisions (avoid a bloated catalogue)

- **Audience Legibility (D-CUST)** vs **Clarity of Promise (FF1):** what-you-do vs for-whom. Keep as
  two facets *or* merge into one two-part lens. Recommend merging unless testing shows the "for whom"
  gap is independently surprising.
- **The Question You Don't Answer (N-OBJECTION)** is a *synthesis* over Clarity + Proposition +
  Pricing. Ship it *after* those, as an integrator, not before.
- **Resilience / Digital-Era Tell / Load on Others** all touch Technical Signals. Resolve the Technical
  Signals boundary (EPIC-1 open question) before shipping any of the three.
- **Founder Dependency (D-FOUND)** and **Concentration & Exposure (D-RISK)** share the key-person idea.
  Prefer the impersonal D-RISK framing; treat D-FOUND as an option only if the personal framing can be
  kept to the subject's own self-presentation.

### 3.3 Lenses that need unreliable data (flagged, not shipped early)

- **External reputation/reviews (D-REP Tier B):** patchy coverage, wrong-business matching, reviewer PII.
- **Branded search (D-FIND):** ToS and instability.
- **Competitor identification (D-COMP):** fuzzy, precision-breaking.
- **Digital-Era Tell (D-AIMAT):** fingerprinting is probabilistic and drifts.
- **The Confidence Tell (N-HEDGE):** linguistic judgement, false-positive prone.

Rule for all five: they may only ever emit on **high-precision, unambiguous** evidence, and must fail
closed generously. None should be an early lens; each earns its place only after its precision is proven
in the negative-control harness.

### 3.4 Lenses that could feel creepy (privacy flags)

- **Founder Dependency (D-FOUND):** the only lens *about a person*. Highest creepiness risk. Read the
  business's own self-presentation only; never enrich or profile the individual; when in doubt, do not ship.
- **Team Presence (D-TEAM):** reads third-party (employee) personal data. Presence level only, minimal
  excerpt, never re-published as a profile, never stored beyond the run.
- **Two Doors, One Person (N-SURFACES):** acceptable *only* because it follows links the subject published
  themselves. It must never crawl outward to find profiles the subject did not link.
- **Relationship Temperature (D-REL):** PII-bearing and consent-gated by construction. It is safe *inside*
  the Relationship Workspace's existing consent-fail-closed spine, and nowhere else.
- **External reviews (D-REP):** reviewer text is third-party PII; cite location, never re-publish content.

### 3.5 Seeking the opposite of the obvious hypothesis

- **Obvious:** "Cover every business domain (finance, market, competition) for a complete lens suite."
  **Opposite that holds:** the most valuable lenses cover *no classic domain at all* (What You Repeat,
  The Accidental Message, The Echo). Domain-completeness is a distraction; evidence-cheap surprise is the asset.
- **Obvious:** "A pricing lens should tell you if your price is right." **Opposite:** Maculis cannot know if
  a price is *right* (Tier D). It *can* show whether you present price with confidence. The observable,
  humble version is the valuable one.
- **Obvious:** "Hiding your price is a mistake to flag." **Opposite:** for many models, hiding price is
  correct. The lens must fail closed on that ambiguity, or it becomes a confidently-wrong scold.
- **Obvious:** "A distinctiveness lens needs to compare you to competitors." **Opposite:** it does not.
  Comparing your copy to a cliché corpus (N-CLICHE) is more reliable, needs no competitor list, and avoids
  the precision-breaking competitor-identification problem entirely.
- **Obvious:** "Founders will love a lens about their leadership." **Opposite:** a lens about a *person* is
  the one most likely to feel like surveillance. The responsible move is to pull back to the business surface.

---

## 4. The weighted ranking (every candidate)

**Twelve criteria, each 1 to 5, higher is always more favourable.** For the four "burden" criteria the
score is favourability (5 = low data need / low external dependency / low privacy risk / low cost).

**Weighting rationale.** The product's moat is *trustworthy surprise*, so WOW, customer value, reliability
and privacy carry the heaviest weight; a lens that is unreliable or creepy is disqualifying regardless of
its appeal. Data-need and external-dependency are weighted next because the first-generation constraint is
"Tier A, no accounts", and GrowBrain potential and commercial value are weighted for strategic pull-through.
Build speed, cost and repeatability are real but rarely decide between two otherwise-comparable lenses, so
they carry the least weight.

| Criterion | Weight | Why this weight |
|---|---|---|
| Customer value (CV) | 3 | The lens must matter to the entrepreneur. |
| WOW | 3 | Trustworthy surprise is the product's differentiator. |
| Reliability (REL) | 3 | Precision-over-recall is non-negotiable; an unreliable lens cannot ship. |
| Privacy-safe (PRIV) | 3 | Fail-closed privacy is a hard gate; a creepy lens is disqualifying. |
| Surprise (SUR) | 2 | The "I never saw that" moment, distinct from raw WOW. |
| Low data need (DATA) | 2 | Gates the Tier-A-first constraint. |
| External-integration independence (EXT) | 2 | No-accounts first generation. |
| Commercial value (COM) | 2 | Pull toward paid Maculis. |
| GrowBrain potential (GB) | 2 | Pull-through to the deeper product. |
| Build speed (BLD) | 1 | Real, rarely decisive. |
| Low cost (COST) | 1 | Derived-first keeps most lenses cheap anyway. |
| Repeatability (REP) | 1 | Most Tier A lenses re-run cheaply by default. |

Weighted total is out of a maximum of 125. Ranking (First Five lenses marked [FF] as anchors; kills at the foot):

| Rank | Total | Lens | Tier | Note |
|---|---|---|---|---|
| 1 | 119 | **Price Visibility & Confidence** (D-PRICE) | A | Highest overall; reliability landmine on "hiding is correct". |
| 2 | 116 | **What You Repeat** (N-REPEAT) | A | Provisional **Lens #2**. Cheapest, safest, most magical. |
| 3 | 115 | **The Question You Don't Answer** (N-OBJECTION) | A | Reliable synthesis lens; ship after its inputs. |
| 3 | 115 | **Who You Sound Like** (N-CLICHE) | A | Safe, evidence-bound "positioning". |
| 3 | 115 | **Proposition Backing** (D-PROP) | A | Proof-beside-promise; top commercial + GB. |
| 6 | 114 | **The Echo** (N-ECHO) | A | Ties to "Pass the Lens". |
| 6 | 114 | **Audience Legibility** (D-CUST) | A | Consider folding into FF1. |
| 8 | 112 | **The Accidental Message** (N-PLACEHOLDER) | A | Delightful, high precision, low depth. |
| 9 | 111 | **Built for the Thumb** (N-MOBILE) | A | Dominant-device reality. |
| 9 | 111 | Clarity of Promise (FF1) | A | Shipped anchor. |
| 11 | 111 | **Path to Yes** (D-SALES) | A | Conversion path integrity. |
| 12 | 110 | **Message Discipline** (D-MKT) | A | One message or many. |
| 13 | 104 | The Effort Map (N-EFFORT) | A | Mid-tier. |
| 14 | 103 | Reachability (FF2) | A | Shipped anchor. |
| 15 | 102 | The First Two Minutes (D-CX) | A | High WOW; interstitial-detection reliability. |
| 16 | 101 | Accessibility First Pass (FF5) | A | Shipped anchor. |
| 17 | 99 | The Confidence Tell (N-HEDGE) | A | Precision risk; ship late. |
| 18 | 98 | Compounding Assets (D-GROW) | A/B | Growth assets. |
| 19 | 96 | Freshness (FF3) | A | Shipped anchor. |
| 20 | 95 | The Load You Put on Others (N-THIRDPARTY) | A | Brand-aligned; tech overlap. |
| 21 | 95 | Findability Basics (FF4) | A | Shipped anchor. |
| 22 | 95 | Operational Promises (D-OPS) | A | Functional, lower build speed. |
| 23 | 94 | Name/Identity Consistency (FF6) | A | Shipped anchor. |
| 24 | 90 | Team Presence (D-TEAM) | A | Privacy flag (third-party PII). |
| 25 | 90 | Graceful Degradation (D-RESIL) | A | Tech Signals boundary. |
| 26 | 89 | Relationship Temperature (D-REL) | C | Different surface; highest commercial/GB; consent-gated. |
| 27 | 87 | Concentration & Exposure (D-RISK) | A/B | Moderate; keep impersonal. |
| 28 | 86 | Digital-Era Tell (D-AIMAT) | A/B | Tech overlap + score-creep risk. |
| 29 | 83 | Reputation Presence (D-REP) | A/B | Ship Tier A part only. |
| 30 | 82 | Two Doors, One Person (N-SURFACES) | B | Owner-linked only. |
| 31 | 81 | Category Neighbours (D-COMP) | B | Precision-breaking; GrowBrain-only. |
| 32 | 75 | Founder Dependency (D-FOUND) | A | Highest creepiness risk. |
| 33 | 73 | Branded Search Presence (D-FIND) | B | ToS/instability; downgraded. |
| — | 64 | Commercial Performance | D | **KILL** |
| — | 53 | Margin | D | **KILL** |
| — | 52 | Market size/trend | D | **KILL** |
| — | 51 | Finance | C/D | **KILL** |
| — | 51 | Cashflow | C/D | **KILL** |
| — | 49 | Innovation | D | **KILL** |

*(Scores and weights are reproducible from the accompanying calculation; see the scratchpad `rank.py`
used to generate this table. The scoring is internal triage only and is never shown to a tester.)*

---

## 5. Top-10 shortlist and the roadmap

### 5.1 Top-10 (build-worthy, Tier A, no accounts)

1. **What You Repeat** (N-REPEAT) — provisional Lens #2
2. **Price Visibility & Confidence** (D-PRICE) — commercial lead
3. **Proposition Backing** (D-PROP)
4. **Who You Sound Like** (N-CLICHE)
5. **The Echo** (N-ECHO) — the "Pass the Lens" lens
6. **Audience Legibility** (D-CUST) — or fold into Clarity of Promise
7. **The Accidental Message** (N-PLACEHOLDER) — the shareable delight
8. **Built for the Thumb** (N-MOBILE)
9. **Path to Yes** (D-SALES)
10. **The Question You Don't Answer** (N-OBJECTION) — the synthesis lens, shipped last of the ten

*(Note: N-REPEAT ranks 2nd on the all-criteria total but is the roadmap's Lens #2 because the four-factor
Lens-#2 test in 5.3 rewards it over the 1st-ranked D-PRICE. D-PRICE is the immediate follow-on.)*

### 5.2 The argued roadmap

The sequencing principle from EPIC-1 holds: safest, cheapest, most human-legible, lowest overlap first.
EPIC-1 already sequences the six First Five lenses (ship Clarity of Promise and Reachability first).
This roadmap picks up *after* that foundation.

| Wave | Lenses | Why here |
|---|---|---|
| **Foundation (EPIC-1)** | First Five slate, led by Clarity of Promise + Reachability | Proves the contract, the two-bucket strength model, and the negative-control harness. |
| **Wave A — the surprise** | **Lens #2: What You Repeat** → then **The Echo**, **The Accidental Message** | Pure Tier A, maximal WOW and surprise, near-zero data and privacy risk. Establishes Maculis as the product that shows you something you had not seen. All three also feed "Pass the Lens" sharing. |
| **Wave B — the strategy** | **Proposition Backing** → **Price Visibility & Confidence** → **Who You Sound Like** | Higher commercial and GrowBrain pull. Price leads the commercial story but carries the "hiding is correct" reliability caveat, so it ships *after* the harness is battle-tested on Wave A. |
| **Wave C — the reality** | **Built for the Thumb** → **Path to Yes** → **Audience Legibility / Message Discipline** | The stranger's-eyes and conversion lenses. Slightly more render/interaction machinery. |
| **Wave D — the synthesis** | **The Question You Don't Answer** | Integrates Clarity + Proposition + Pricing; only meaningful once those exist. |
| **Wave E — conditional, gated** | Operational Promises, Resilience/Digital-Era/Load (after Technical Signals boundary is resolved), Reputation (Tier A part), Concentration & Exposure | Each needs a precision or boundary question closed first. |
| **Separate track — Relationship** | **Relationship Temperature** and its siblings | Different surface (Tier C), different product, consent-fail-closed. Highest commercial value but sequenced inside the Relationship Workspace, not First Five. |
| **Never (unless data changes)** | Finance, Cashflow, Margin, Market, Innovation, Commercial Performance, Founder-as-person, external Competitor ID | The kills of Section 3.1 / 3.4. |

### 5.3 Provisional Lens #2: **What You Repeat** (N-REPEAT)

Judged on the four-factor test the brief specifies (**feasibility × WOW × low data-dependency ×
GrowBrain pull**):

- **Feasibility (highest in the set):** term frequency over the subject's own copy. No external call, no
  corpus to maintain, no interaction, no third-party data. It is close to trivial to build and, crucially,
  trivially *reliable*: the evidence is arithmetic on text the tester can re-count themselves, so it meets
  precision-over-recall by construction and fails closed naturally (too little text, no observation).
- **WOW and surprise (top of the set):** "the word you say most is not the word your customer would use"
  is a genuine, visceral "I never saw that" moment. It reframes the entrepreneur's relationship to their own
  voice in one line.
- **Low data-dependency (maximal):** Tier A, own surface only, zero PII, zero accounts, zero external
  dependency. It sits furthest inside the first-generation constraint.
- **GrowBrain pull (high):** the depth question writes itself and is exactly the GrowBrain promise. "You keep
  saying X. Here is *why* that happens, and here is what your customers are actually looking for." It is a
  natural doorway from a First Five surprise into the deeper product.

**Why not the #1-ranked D-PRICE as Lens #2:** Price Visibility scores highest on the all-criteria total and
is the right *commercial* follow-on, but as Lens #2 it carries a reliability landmine (hiding price is correct
for many models, so it risks a confidently-wrong finding) and slightly lower feasibility (it must reliably
locate and interpret pricing across very different business types). The four-factor Lens-#2 test rewards the
cleaner, safer, more magical N-REPEAT, and D-PRICE follows immediately in Wave B once the harness is proven.

**Runner-up alternatives, if product weights differ:** **The Echo (N-ECHO)** if "Pass the Lens" virality is
the priority (it is literally about what happens when your business is shared); **Proposition Backing (D-PROP)**
if commercial/GrowBrain depth should lead over surprise.

### 5.4 Open questions carried forward (for humans/product)

1. **Technical Signals boundary** (from EPIC-1, still open): gates Resilience, Digital-Era Tell, and Load on
   Others, and confirms whether Findability Basics stays separate.
2. **Fold-or-keep** for Audience Legibility vs Clarity of Promise, and for Founder Dependency vs Concentration
   & Exposure.
3. **Cliché corpus ownership** (N-CLICHE): who curates and maintains the category-cliché list, and in which
   languages, given the NL-first tester copy.
4. **Relationship track consent surface:** confirm Relationship Temperature is only ever exposed inside the
   existing consent-fail-closed spine (EPIC-1 doc 02), never on the public First Five surface.
5. **Retention** for any snapshot a lens takes (EPIC-1 assumed "not beyond the run"); confirm before any
   over-time lens (Growth, Two Doors) that needs history.

---

*End of MAC-107/108 design document. Read-only strategy; no product code changed. Builds on the EPIC-1
Next Lenses deliverables and does not repeat them.*
