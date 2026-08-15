# Next Lenses & Intelligence — Website Presentation Strategy

**Sub-task: MAC-104 (Website) — analysis/read-only**

Part of the Maculis "Next Lenses & Intelligence Strategy" autonomous night run. This document is a design/strategy artifact only. No code was written and no repository was modified. I do not have access to the private repo `ftrprf-labs/groeiplatform-website`; everything here is reasoned from the task brief and the public domain context, with assumptions marked `[ASSUMPTION]`. All copy examples respect the repo rule: **no hyphen/dash as a stylistic pause in visible public copy.**

---

## 0. Framing and constraints (what "good" means here)

Maculis is introducing two connected public ideas:

- **Lenses** — a way of looking at something (a site, a piece of content, a growth question) through one focused perspective at a time.
- **A growing intelligence capability** — the sense that the product keeps getting sharper over time, without saying how.

The hard constraints that shape every decision below:

1. **Precision over recall.** Say fewer things, each fully defensible. One evidence-bound claim beats five aspirational ones.
2. **Evidence-bound, never overclaim.** Every public claim must map to something we can actually show or stand behind. No "guaranteed", no "instantly", no numeric promises we cannot substantiate.
3. **Restrained voice.** No free-audit hooks, no growth-hack tone, no urgency theatre, no "unlock your score now".
4. **Do not expose how the sausage is made.** Lenses are a felt outcome, not a documented pipeline. No internal scoring methods, model names, signal lists, or thresholds.
5. **Privacy is load-bearing.** Never leak tester or private data, raw signals, or internal metrics into public pages. Consent and transparency copy is a feature, not a footnote.
6. **Mobile-first, Core Web Vitals as a hard budget.** The WOW must survive a mid-tier phone on a slow connection.
7. **No dash as a stylistic pause** in any user-visible copy.

---

## 1. Positioning and narrative

### 1.1 The one-line story

> Maculis gives you focused ways to look at your growth, one lens at a time, and it keeps getting sharper.

This does three things: it names the object ("lenses"), it frames the benefit (focus and clarity, not a verdict), and it hints at the intelligence arc ("keeps getting sharper") without a single claim about how.

### 1.2 What a "lens" is, in public language

A lens is **one perspective, deliberately chosen.** The value proposition is *focus*, not *judgement*. A lens shows you one thing clearly rather than everything at once. This framing is strategically important because it:

- Sidesteps the score-dashboard trap. A lens is not a grade. It is a way of seeing.
- Justifies restraint. A lens shows *less* on purpose, which reads as confidence, not as a thin product.
- Is inherently extensible. "More lenses over time" is a natural, honest roadmap story that needs no mechanism.

**Narrative spine (three beats):**

1. **Look closer.** Growth work is noisy. A lens removes the noise and shows one thing clearly.
2. **See what matters.** Each lens is built around a single question worth answering.
3. **Keep sharpening.** New lenses arrive, and existing ones deepen, as the product learns its craft.

### 1.3 How to talk about "growing intelligence" without overclaiming

The safe frame is **craft and range, not intelligence-as-magic.** Talk about the *catalogue growing* and the *perspectives deepening*, not about an AI that "understands" or "predicts".

Safe register:
- "New lenses arrive over time."
- "Each lens is refined as we learn."
- "The collection keeps growing."

Unsafe register (avoid):
- "Our AI learns from every user." (implies harvesting tester data)
- "Predictive intelligence that knows what you need." (overclaim + creepy)
- "Gets smarter with every scan." (implies a scoring pipeline and data accumulation)

The public should feel momentum without being told there is a model, a training loop, or accumulated user signals behind it. `[ASSUMPTION]` The underlying capability is genuinely improving over time; if it is not, the "keeps getting sharper" language must be softened to "the collection keeps growing" only.

### 1.4 Positioning against the patterns we reject

| Rejected pattern | Why we reject it | What we do instead |
|---|---|---|
| Free audit / instant score | Cheapens the product, invites gaming, sets a transactional tone | Invite a closer look, not a verdict |
| Score dashboard (0 to 100) | Reduces nuanced perspective to a number; implies objective truth | Show one qualitative insight per lens |
| Growth-hack urgency | Off-brand, erodes trust | Calm, confident, unhurried copy |
| "See everything at once" | Overwhelms; implies we surface raw internals | One lens, one question, on purpose |

---

## 2. WOW and micro-reveal treatment

### 2.1 What the WOW is (and is not)

The WOW here is **the feeling of a clean, deliberate reveal**, not a data fireworks show. It is the difference between a spotlight turning on in a dark room and a slot machine paying out. Restraint *is* the WOW: the product looks like it knows exactly what to show you and chose to show you only that.

**Micro-reveal principle:** a lens should *resolve into focus*, the way a camera lens racks from blur to sharp. That single metaphor drives the motion design, the copy, and the visuals.

### 2.2 The lens reveal, concretely

A restrained, evidence-bound lens teaser on a public page:

1. **Rest state:** a soft, slightly out-of-focus visual element (a frosted card, a blurred field) with the lens name and its single question. Calm, inviting, not loud.
2. **Trigger:** on scroll into view (or on hover/tap), the element *resolves* — a short blur-to-sharp transition, one qualitative line of insight settles into place. One reveal, not a cascade.
3. **Landing state:** a single, concrete, evidence-bound statement. Not a number out of 100. A sentence a human wrote and can defend.

Timing and motion budget `[ASSUMPTION]` (tune with the design team):
- Reveal duration around 400 to 600ms, one ease-out curve.
- Respect `prefers-reduced-motion`: fall back to a simple opacity fade, no blur/transform animation.
- The reveal must never block content. The landing text is present in the DOM at load (SEO and no-JS safe); motion only *stages* it.

### 2.3 Contrast table: our reveal vs. the patterns we reject

| Dimension | Score dashboard / free audit | Maculis lens reveal |
|---|---|---|
| Output | A number, a grade, a gauge | One qualitative sentence |
| Emotional beat | "Here is your verdict" | "Here is what is worth noticing" |
| Motion | Counters spinning, meters filling | One blur-to-sharp resolve |
| Density | Everything, maximised | One thing, chosen |
| Implied claim | Objective measurement | Considered perspective |
| Data shown | Raw-looking signals | Nothing internal, ever |

### 2.4 Guardrails on the WOW

- The reveal shows **product-authored insight**, never live tester data or a real person's results.
- No fake data that looks real. Teaser content is illustrative and should read as illustrative, or be clearly a product example. `[HUMAN ACTION: content/legal sign-off on whether teaser insights are labelled "example".]`
- Motion is progressive enhancement. The page is complete, legible, and indexable with JavaScript disabled.

---

## 3. Information architecture and SEO

### 3.1 Page and section structure

`[ASSUMPTION]` A dedicated "Lenses" page or section under the existing Maculis site, plus supporting per-lens content as the catalogue grows.

**Primary page: `/lenses` (the intelligence story)**

1. **Hero** — the one-line story + primary CTA. (Sample in section 5.)
2. **What a lens is** — the "one perspective, deliberately chosen" explainer, three-beat spine.
3. **Lens gallery** — a small grid of lens teasers, each with the micro-reveal treatment. Start with the few that are real; do not pad.
4. **How it grows** — the restrained "keeps getting sharper" section (craft and range framing).
5. **Trust and privacy** — a short, plain-language block on what we do and do not do with data. Load-bearing (see section 4).
6. **CTA / next step** — restrained invitation, no free-audit hook.

**Per-lens detail (later, as catalogue justifies it): `/lenses/[lens-name]`**
- Each real lens can earn its own page for long-tail intent. Only build these when there is genuine, defensible content behind them. Thin per-lens pages hurt SEO and trust equally.

### 3.2 Target intents and keywords

`[ASSUMPTION]` Maculis operates in a growth/insight space; exact keyword research is a `[HUMAN ACTION]`. Reasoned intent map:

| Intent type | Example queries | Where it lands |
|---|---|---|
| Informational | "how to see what is working on my site", "focused growth insights" | "What a lens is" section |
| Product/branded | "maculis lenses" | Hero + gallery |
| Comparison | "growth insight tool without a score", "alternative to site audit tools" | Positioning copy, "how it grows" |
| Long-tail per-lens | "[specific lens question]" | Per-lens pages, later |

Keyword hygiene: target the *concept* (focused perspective, clarity, one question at a time), not high-competition audit/score terms we are deliberately not competing on. Do not chase "free audit" traffic; it attracts the wrong intent and contradicts positioning.

### 3.3 Structured data (JSON-LD)

- **`WebPage` / `WebSite`** on the main page with `SearchAction` if site search exists.
- **`BreadcrumbList`** for the `/lenses/[lens]` hierarchy.
- **`FAQPage`** on the "What a lens is" and privacy sections, *only if* the questions and answers appear visibly on the page (Google requires visible parity). Good fit: "What is a lens?", "Do you use my data?", "How is this different from a score?"
- **`Organization`** (site-wide) with logo and sameAs.
- Avoid `Product`/`Review`/`AggregateRating` markup here. It invites star-rating and score connotations we reject, and we have no legitimate review data to show. Do not fabricate ratings.

`[ASSUMPTION]` No `SoftwareApplication` markup unless there is a genuine app listing; if used, keep it claim-free (no `offers` with fake pricing, no `aggregateRating`).

### 3.4 Core Web Vitals guardrails

The micro-reveal is the main CWV risk. Guardrails:

- **LCP:** hero text and hero image must be the LCP candidate and must not depend on JS. Preload the hero image, serve responsive `next/image` with correct `sizes`, prioritise it. Target LCP under 2.5s on mobile.
- **CLS:** every lens teaser card must have a reserved, fixed aspect ratio. Blur-to-sharp reveals must animate `opacity`/`filter`/`transform` only, never properties that reflow layout. Target CLS under 0.1. No late-injected banners (including the consent notice — reserve its space or use a non-shifting pattern).
- **INP:** keep reveal handlers cheap. Use `IntersectionObserver`, not scroll listeners. Debounce nothing heavy on the main thread. Target INP under 200ms.
- **JS budget:** the reveals are pure CSS transitions triggered by a tiny observer. No animation library needed. Ship the landing insight text in HTML; motion is enhancement only.
- **Fonts:** `font-display: swap` or `optional`, subset, self-hosted via `next/font` to avoid layout shift and third-party requests.
- **App Router specifics:** favour Server Components for all static content; the only client component is the small reveal observer. Stream the page; do not gate content behind client hydration.

---

## 4. Privacy-first copy

This is the load-bearing section. Public pages must never become a leak surface.

### 4.1 Claims that are SAFE

- "A lens shows one focused perspective." (describes the product, no data claim)
- "New lenses arrive over time." (roadmap, no mechanism)
- "Each lens is refined as we learn our craft." (about us improving, not about harvesting users)
- "We keep tester information private." (a commitment we can hold)
- Plain descriptions of what the user themselves will see.

### 4.2 What must NEVER appear on public pages

- **Tester or user PII** of any kind: names, emails, org names, real results tied to a real person.
- **Raw signals** or the input data a lens looks at (feature lists, metric names, data sources, thresholds).
- **Internal scoring** — no score formulas, model names, weights, confidence numbers, internal dashboards, or "how we rank" explanations.
- **Real tester output presented as a demo.** Teaser content is product-authored and illustrative, never a real account's data.
- **Internal signals or telemetry** framed as social proof ("we analysed 4,201 tester sites this week"). This both overclaims and implies surveillance.
- **Anything that implies we accumulate and reuse individual user data** to get smarter.

### 4.3 Consent and transparency copy

Keep it plain, short, and honest. Restrained voice applies to legal copy too.

Sample transparency block (respects no-dash rule):

> **Your data stays yours.** Maculis is built to show you your own view. We do not sell your data, and we do not put tester results on public pages. When we ask for information, we tell you why and you stay in control.

Consent notice (cookie/analytics), if applicable `[HUMAN ACTION: legal to confirm scope and lawful basis]`:

> We use a small amount of analytics to keep the site fast and useful. You can accept or decline, and you can change your choice at any time.

Guardrail: the consent UI must not cause layout shift (reserve its space) and must not block LCP. Prefer a non-modal, dismissible banner over a full-screen interstitial for CWV and UX.

---

## 5. Sample copy (restrained, evidence-bound, no dash as a pause)

### 5.1 Hero

**Eyebrow:** Lenses by Maculis

**Headline:**
> See your growth one lens at a time.

**Subhead:**
> A lens brings one question into focus, so you notice what matters instead of everything at once. The collection keeps growing.

**Primary CTA:**
> Explore the lenses

**Note:** no "free", no "instant", no "score", no urgency. The subhead promises focus, not a verdict. "The collection keeps growing" carries the intelligence arc honestly.

### 5.2 One lens teaser (illustrative)

`[ASSUMPTION]` Real lens names and questions are a `[HUMAN ACTION]`. Placeholder shown with an "Example" label so it never reads as a real user result.

**Rest state (blurred card):**
> **Clarity lens** *(Example)*
> One question: is your main message landing?

**Landing state (resolves into focus):**
> When a visitor reads your page for the first time, one idea should stand out. The Clarity lens shows you whether that idea is coming through, so you can make it sharper.

**Micro-line under the reveal:**
> One lens. One question. Nothing you did not ask to see.

**Note:** the payoff is a qualitative sentence a human can defend, not a number. The closing micro-line quietly reinforces the privacy and restraint positioning at the exact moment of WOW.

---

## 6. Open questions, assumptions, and human actions

### 6.1 Open questions

1. Is "Lenses" a new top-level section, or woven into an existing page? Affects IA and internal linking.
2. How many lenses are genuinely real and shippable today? The gallery must not be padded with vapour.
3. Is the "growing intelligence" claim currently true in a defensible way, or aspirational? Determines how strong the "keeps getting sharper" language can be.
4. Do teaser insights need an explicit "Example" label, or is illustrative framing enough for legal comfort?
5. Is there any site search? Determines `SearchAction` structured data.

### 6.2 Assumptions (marked throughout, collected)

- `[ASSUMPTION]` A `/lenses` page or section is the right home for this story.
- `[ASSUMPTION]` Per-lens detail pages come later, only when content justifies them.
- `[ASSUMPTION]` The underlying capability genuinely improves over time.
- `[ASSUMPTION]` Motion timing (400 to 600ms) is a starting point for the design team.
- `[ASSUMPTION]` Standard Next.js 14 App Router + `next/image` + `next/font` stack is available.
- `[ASSUMPTION]` Consent/analytics banner is in scope; exact lawful basis is a legal call.

### 6.3 Human actions required

- `[HUMAN ACTION]` **Brand/voice sign-off** on hero and teaser copy.
- `[HUMAN ACTION]` **Legal sign-off** on privacy, transparency, and consent copy, and on whether teaser insights must be labelled "Example".
- `[HUMAN ACTION]` **Real content:** actual lens names, questions, and defensible payoff sentences (replace all placeholders in section 5).
- `[HUMAN ACTION]` **Keyword research** to validate the intent map in section 3.2.
- `[HUMAN ACTION]` **Design:** finalise the blur-to-sharp reveal, reduced-motion fallback, and CWV budget verification on real devices.
- `[HUMAN ACTION]` **Confirm** which lenses are real and shippable before building the gallery.

---

*End of MAC-104. Read-only strategy artifact. No code changed; private repo not accessed.*
