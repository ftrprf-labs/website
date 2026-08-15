# Next Lenses Framework (First Five Journey)

Sub-task: MAC-101 (First Five) — analysis/read-only

> Design document for the **Next Lenses** generation: the analytical lenses beyond Technical Signals, offered through the "Nog een lens" extension point. This is strategy/product research. It changes no product code and does not claim knowledge of `ftrprf-labs/maculis-first-five` internals. Anything not given in the task brief is marked **[ASSUMPTION]**.

---

## 0. Scope and grounding

**What is given (treated as fact):**
- The First Five Journey is a state machine: First Impression -> Reveal -> Recognition (the "Herken je dit" gate) -> Technical Signals (a separate lens) -> "Nog een lens" -> Aandacht -> Deepen.
- Core principles: Reveal stays grounded and evidence-bound (no speculation); precision over recall; no score dashboard; fail-closed (negative controls stay closed, nothing fires without evidence); no dark patterns; strong privacy (never expose tester PII).
- Technical Signals is today's flagship lens. Next Lenses are the next generation, reached via "Nog een lens".

**What I do not have:** the repo, so I do not know the concrete lens type signatures, the Reveal renderer contract, the evidence store schema, or how Technical Signals is implemented. Every structural claim about "how a lens plugs in" below is a **proposed** contract, marked where it leans on an assumption.

**[ASSUMPTION] Working model of the journey mechanics** (used throughout; flag for human confirmation):
- A "lens" runs against a single subject: the organisation / website / brand under test.
- Each lens produces zero or more **observations**, each backed by concrete **evidence** the tester could verify themselves.
- The Reveal surface renders observations as grounded statements ("we noticed X, here is where"), never as speculation or scores.
- "Nog een lens" is an extension point that offers the tester the *next* lens after the current one resolves. It is an offer, not an auto-advance.
- The negative-control discipline means each lens ships with cases where it MUST stay closed (produce nothing) and this is tested.

---

## 1. The Lens abstraction

Every Next Lens must **declare** itself against a common interface so the journey can schedule it, the Reveal renderer can trust it, and the guardrail harness can test it. A lens is a *contract*, not just a function.

### 1.1 Declaration (what every lens must state)

| Field | Meaning | Why it is mandatory |
|---|---|---|
| `id`, `name`, `dutchLabel` | Stable id + tester-facing name (NL copy) | Journey routing, telemetry, copy review |
| `observes` | One sentence: what this lens looks at | Forces a single, legible purpose per lens |
| `evidenceSources[]` | Concrete inputs it may read (e.g. rendered DOM, public homepage HTML, sitemap, HTTP headers) | Bounds the lens; anything not listed is off-limits |
| `evidenceModel` | How raw input becomes a citable observation (extraction rule + what "evidence" means for this lens) | Makes every claim traceable |
| `failClosedDefault` | The output when evidence is absent, ambiguous, or the source is unreachable | Guarantees silence over speculation |
| `confidencePolicy` | Precision-first rule: the threshold/condition below which the lens emits nothing (not a low-confidence guess) | Enforces precision over recall |
| `journeyPlacement` | Where it may render: Reveal, post-Recognition, Aandacht, Deepen; and its eligibility to be the "Nog een lens" offer | Keeps the state machine coherent |
| `privacyPosture` | PII stance: what it must never read, never store, never surface (esp. tester PII, and third-party personal data) | Non-negotiable privacy principle |
| `negativeControls[]` | Named cases where the lens MUST stay closed | The lens proves itself before it ships |
| `cost` | Rough runtime/data cost + whether it needs an external account/API | Sequencing and human-action planning |

### 1.2 Runtime shape (proposed, **[ASSUMPTION]** on exact types)

```
Lens.run(subject, context) -> LensResult

LensResult =
  | Closed(reason)                 // fail-closed: nothing to show, and WHY (for the harness, not the tester)
  | Observations([Observation])    // one or more grounded findings

Observation = {
  claim:        string   // grounded, evidence-bound, NL copy
  evidence:     Evidence // citable, tester-verifiable
  strength:     "clear" | "notable"   // NOT a numeric score; two buckets only, precision-gated
  renderHint:   placement + how it should read in Reveal
}

Evidence = {
  sourceRef:  which declared evidenceSource
  locator:    where the tester can see it themselves (URL, header name, element/region)
  excerpt?:   minimal quote/snippet, PII-scrubbed
}
```

Key design commitments:
- **No score.** `strength` is a two-value editorial bucket, never a number, never aggregated into a dashboard. The journey never sums lenses into a rating.
- **`Closed` carries a reason for the harness, not the tester.** Testers see silence or the next offer, never "we found nothing (confidence 0.31)".
- **Evidence is mandatory for every claim.** A lens that cannot cite cannot speak. This is the mechanical form of "evidence-bound".

### 1.3 How a lens composes with "Nog een lens"

- After a lens resolves (Observations rendered, or Closed and silently skipped), the journey may offer the *next* eligible lens through "Nog een lens".
- Eligibility to be offered is a lens property (`journeyPlacement.offerable`), plus a runtime gate: **a lens is only offered if it would have something grounded to say, or is cheap enough that a Closed result costs the tester nothing.**
- **[ASSUMPTION]** Offer ordering is precision-and-safety-first (see Section 4), not novelty-first. The tester is never pushed; "Nog een lens" is a door, not a nudge. Declining is a first-class outcome, no re-prompting (no dark patterns).
- Lenses must be **independent**: no lens may depend on another lens's output as input. Composition happens in the tester's experience (one lens after another), not in a hidden pipeline. This keeps each lens individually testable and individually fail-closed.

---

## 2. Candidate slate of Next Lenses (beyond Technical Signals)

Six candidates. Each is restrained, evidence-bound, and observes something about the organisation / website / brand from public, tester-verifiable material. None profiles individuals. Sample tester-facing copy follows the Maculis rule (no hyphen/dash as a stylistic pause).

Legend: each lens gives **Observes / Evidence model / Fail-closed / Placement / Composition**.

### Lens A — Clarity of Promise ("Wat beloven ze?")
- **Observes:** whether the site states, in plain language, what the organisation actually does and for whom, above the fold and on the primary landing view.
- **Evidence model:** extract the first meaningful heading + hero copy from the rendered homepage. An observation fires only when the promise is present-and-plain or conspicuously-absent, each citable to the exact rendered region.
- **Fail-closed:** if the hero is behind a script that did not render, or copy is ambiguous, emit `Closed(unrendered_or_ambiguous)`. Never guess intent.
- **Placement:** strong Reveal candidate; grounded, low-cost, immediately verifiable by the tester.
- **Composition:** natural *first* "Nog een lens" after Technical Signals: it shifts from "how it is built" to "what it says", an obvious next facet.
- **Sample copy:** "Op de eerste schermweergave staat niet wat jullie doen. We keken naar de kop en de eerste alinea."

### Lens B — Consistency of Name & Identity ("Heten jullie overal hetzelfde?")
- **Observes:** whether the organisation's name, brand spelling, and primary tagline are used consistently across the pages the tester can already reach (homepage, title tag, footer, contact page).
- **Evidence model:** collect name/brand strings from `<title>`, header, footer, and one interior page; flag only *concrete* mismatches (different legal name, different spelling, stale tagline), each with both locations quoted.
- **Fail-closed:** a single source, or trivial casing differences, produces nothing. Requires at least two conflicting citations to speak.
- **Placement:** post-Recognition or Aandacht; it rewards a tester who is already paying attention.
- **Composition:** pairs well after Clarity of Promise; both are "what they say about themselves".
- **Sample copy:** "In de titelbalk staat een andere naam dan in de voettekst. Beide zagen we op deze pagina."

### Lens C — Reachability ("Kun je ze bereiken?")
- **Observes:** whether a real, working contact path exists from the public site: a contact page, a non-broken email/phone, an obvious next step.
- **Evidence model:** locate contact affordances on the homepage and one hop deep; verify the *presence and shape* of a contact route (mailto/tel present, contact page returns content). It checks reachability, it does not contact anyone.
- **Fail-closed:** if no contact affordance is found within the allowed hop budget, emit `Closed(not_found)` rather than "they are unreachable" (absence of evidence is not evidence). Only a *broken* affordance (dead link, empty contact page) is a positive observation.
- **Placement:** Aandacht; a concrete, actionable facet.
- **Composition:** stands alone well; good mid-slate offer.
- **Privacy note:** never stores or surfaces the specific email/phone as *personal* data of a named individual; treats a role address (info@) and a personal one identically and quotes the minimum. See Section 3.
- **Sample copy:** "De contactpagina opent, maar er staat geen manier op om te reageren. We keken op deze pagina."

### Lens D — Freshness Signals ("Leeft de site nog?")
- **Observes:** public, non-speculative signs of whether the site is maintained: a visible dated item (news/blog/changelog) far in the past, a copyright year in the footer that is stale, obviously outdated seasonal content.
- **Evidence model:** read only *explicitly published dates* and the footer year. Compares against the run date. Fires only on a concrete stale artifact, quoting the date and its location.
- **Fail-closed:** no dated content -> `Closed(no_dated_evidence)`. It never infers staleness from tone, design, or "feel". A modern-looking site with no dates says nothing here, correctly.
- **Placement:** Aandacht or Deepen.
- **Composition:** composes cleanly after Reachability (both are "is this a live, tended thing?").
- **Sample copy:** "In de voettekst staat het jaartal 2021. Dat namen we daar waar."

### Lens E — Findability Basics ("Is de site vindbaar?")
- **Observes:** the small set of *objective, public* signals that affect whether the site can be found and shared: presence of a title tag, a meta description, a social-share preview (Open Graph), and an XML sitemap or robots directive.
- **Evidence model:** read the document head, `robots.txt`, and `/sitemap.xml`. Each observation is a present/absent fact with the exact tag or file cited. This is deliberately narrower than Technical Signals: it is about *findability*, not full technical health, so it does not overlap the flagship lens.
- **Fail-closed:** if head parsing fails or files are unreachable, `Closed(unreadable)`. It reports only what it could actually read.
- **Placement:** Deepen (it is more technical and less viscerally recognisable), or offered later in "Nog een lens".
- **Composition:** deliberately positioned *after* the human-legible lenses so the journey does not front-load technical facets.
- **Boundary risk:** highest overlap with Technical Signals. **Open question:** confirm the exact remit of Technical Signals before shipping E, or fold E into it. See Section 5.
- **Sample copy:** "Er is geen deelvoorbeeld ingesteld, dus gedeelde links tonen geen kaartje. We keken in de paginakop."

### Lens F — Accessibility First Pass ("Kan iedereen erbij?")
- **Observes:** a *restrained, high-precision* subset of accessibility facts that are unambiguous from markup: images missing alt text in the main content, a page with no `lang` attribute, form fields with no label, severe text-contrast failures on the hero.
- **Evidence model:** static, rule-based checks with zero interpretation. Each observation cites the specific element. It deliberately covers only checks with near-zero false-positive rate, not a full audit (precision over recall, hard).
- **Fail-closed:** anything requiring judgement (is this alt text *good*? is this contrast borderline?) is out of scope and produces nothing. Ambiguity -> silence.
- **Placement:** Aandacht or Deepen; framed as care, never as compliance-shaming.
- **Composition:** strong, distinctive facet; pairs with Clarity of Promise as "who is this really for, and can they use it?".
- **Sample copy:** "Vier afbeeldingen in de hoofdtekst hebben geen alt tekst. We wijzen ze je aan."

### Slate summary

| Lens | Observes | External account needed? | Overlap risk w/ Tech Signals | Human-recognisable? |
|---|---|---|---|---|
| A Clarity of Promise | Plain statement of what/for whom | No | Low | High |
| B Name & Identity Consistency | Consistent naming across pages | No | Low | High |
| C Reachability | A working contact path exists | No | Low | High |
| D Freshness Signals | Concrete stale artifacts | No | Low | Medium |
| E Findability Basics | Title/OG/sitemap/robots facts | No | **Medium** | Medium |
| F Accessibility First Pass | Unambiguous a11y facts | No | Low | Medium-High |

None requires paid data or an account. That is a deliberate first-generation constraint: all six read only the public, tester-verifiable surface. Lenses that *would* need accounts are deferred (Section 5).

---

## 3. Guardrails

These are the rules a lens must satisfy to ship. They are the mechanical expression of the stated principles.

### 3.1 Evidence-bound
- **No claim without a locator.** Every observation carries `Evidence.locator` the tester can open and check. A lens that cannot cite must return `Closed`.
- **No inference across the evidence gap.** Lenses report what is present, not what its absence "means" about the organisation. (Reachability finds a *broken* contact route, not "they do not care about customers".)
- **Excerpt minimality.** Quote the least text needed to make the evidence checkable.

### 3.2 Precision over recall
- Two strength buckets only (`clear`, `notable`); no numbers, no aggregation, no score dashboard anywhere in the journey.
- Each lens declares a `confidencePolicy` that is a *silence threshold*: below it, emit nothing. A missed true finding is acceptable; a confident wrong finding is not.
- Preference ordering when in doubt: **stay closed**.

### 3.3 Privacy / PII
- **Tester PII is never an input and never surfaced.** Lenses run against the *subject* (the org/site), not the tester. No lens may read, store, or render tester identity.
- **Third-party personal data is minimised.** Where a subject's public site exposes personal data (a named employee's direct email, a photo), a lens treats it as reluctant evidence: role-level where possible, minimal excerpt, never re-published as a profile, never stored beyond the run. Prefer citing the *location* ("there is a contact address here") over reproducing the value.
- **No enrichment.** No lens cross-references the subject against external people-databases, social graphs, or data brokers. First-generation lenses read only the subject's own public surface.

### 3.4 Consent
- **[ASSUMPTION]** The subject site is provided by the tester for testing, which is the consent basis for reading its public surface. Confirm with the humans that the tester is entitled to submit the subject (their own org, or one they may evaluate).
- "Nog een lens" is opt-in each time. Declining ends the offer chain with no re-prompt, no re-ordering to sneak the offer back (no dark patterns).
- No lens performs an action that touches the subject beyond reading public assets (no form submissions, no sending mail, no login attempts).

### 3.5 How a lens proves itself (negative controls)
Every lens ships with a `negativeControls[]` test set that MUST return `Closed`:
- **The clean subject:** a site that does the thing right -> the lens finds nothing to flag.
- **The empty/unreachable subject:** unrendered SPA, 500 page, blocked robots -> `Closed(unreadable)`, never a fabricated finding.
- **The ambiguous subject:** borderline case the lens is *designed to stay silent on* (e.g. contrast at threshold, casing-only name difference).
- **The adversarial-absence subject:** something is missing (no dates, no contact) where absence must NOT be reported as a defect.

A lens does not enter the "Nog een lens" rotation until its negative controls pass in CI. This is the fail-closed discipline made testable: the harness proves the lens stays quiet before it is allowed to speak.

---

## 4. Sequencing (cheapest / safest first)

Ordering principle: lowest privacy risk, lowest overlap with Technical Signals, highest human-recognisability, no external accounts, and easiest negative controls come first.

**Wave 1 (ship first, safest and cheapest):**
1. **A Clarity of Promise** — reads only the hero, immediately verifiable, high recognisability, trivial negative controls. Best first "Nog een lens".
2. **C Reachability** — concrete, actionable, no interpretation; strong absence-handling discipline makes it a good early proving ground for fail-closed.

**Wave 2 (add once Wave 1 is proven in the offer chain):**
3. **B Name & Identity Consistency** — needs multi-source comparison, slightly more logic, still no external data.
4. **F Accessibility First Pass** — high value and distinctive, but demands the strictest precision gating; ship once the two-bucket strength model is validated on A and C.

**Wave 3 (later, higher care):**
5. **D Freshness Signals** — depends on date parsing and a "stale" judgement that must be tightly bounded; more negative-control surface.
6. **E Findability Basics** — deferred last of the six because of its **overlap with Technical Signals**; do not ship until that boundary is resolved (fold in vs. keep separate).

Rationale for front-loading A and C: both are human-legible ("of course I would look at that"), both fail closed cleanly, neither touches PII or external accounts, and both give the negative-control harness an easy first workout.

---

## 5. Open questions, assumptions, and human actions

### 5.1 Open questions (need repo/product answers)
1. **Technical Signals remit.** What exactly does today's flagship lens cover? This decides whether Lens E (Findability Basics) is a distinct lens, a subset already covered, or a natural extension of Technical Signals. Highest-priority question.
2. **Lens result contract.** Does the real journey already have a lens interface / result type? If so, the Section 1.2 shape should be reconciled with it rather than introduced.
3. **Offer ordering control.** Is "Nog een lens" ordering fixed, weighted, or per-session adaptive? Section 4 assumes a fixed safety-first order.
4. **Strength buckets.** Is a two-value editorial strength acceptable, or must lenses be purely binary (finding / no finding) to stay furthest from anything score-like?
5. **Reveal vs. later stages.** Which lenses are allowed to render at Reveal (the most grounded, evidence-bound stage) vs. only at Aandacht/Deepen? Section 2 proposes placements; product owns the final call.
6. **Run cadence and caching.** Are lenses re-run live per journey, or is subject evidence captured once and lenses read a snapshot? Affects freshness and privacy-retention design.
7. **Retention.** How long may subject evidence (excerpts, snapshots) be kept? Section 3.3 assumes "not beyond the run" as the safe default.

### 5.2 Assumptions (clearly marked, restated)
- **[ASSUMPTION]** Journey mechanics in Section 0 (single subject, observation+evidence model, "Nog een lens" as an opt-in offer, negative controls tested in CI).
- **[ASSUMPTION]** Lens runtime shape in Section 1.2 is a proposal, not a description of existing code.
- **[ASSUMPTION]** Offer ordering is fixed and safety-first (Section 4).
- **[ASSUMPTION]** Tester submitting the subject is the consent basis for reading its public surface (Section 3.4).
- **[ASSUMPTION]** "No score dashboard" extends to forbidding any numeric confidence surfaced to the tester; numbers, if any, live only in the harness.

### 5.3 Human actions required
- **Confirm the Technical Signals boundary** (unblocks Lens E). — product owner.
- **Confirm the lens interface / result contract** in `ftrprf-labs/maculis-first-five` so Section 1.2 can be reconciled. — engineer.
- **Confirm consent + retention policy** for subject evidence and any third-party personal data on subject sites. — privacy/legal.
- **No external accounts are needed for Wave 1-3 as scoped.** All six lenses read only the public subject surface. *If* a future generation wants lenses that need accounts (e.g. verified-business registries, WHOIS/domain-age APIs, review-platform data, uptime monitors), each of those requires: a provisioned account/API key, a data-processing review, and a fresh privacy assessment. Those are explicitly out of this generation and flagged for a later run.

---

*End of MAC-101 design document. Read-only research; no product code changed.*
