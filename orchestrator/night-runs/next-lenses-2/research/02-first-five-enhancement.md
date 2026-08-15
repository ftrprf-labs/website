# Deepening First Five Without New Integrations

EPIC-2 WS-2 (MAC-109) — analysis/read-only.

> Product design for making the *existing* First Five journey see more, on the
> same short surface, with no big integrations. Read-only: changes no code, claims
> no knowledge of `ftrprf-labs/maculis-first-five` internals. Builds on and does not
> repeat: `next-lenses/research/01-first-five-next-lenses.md` (the lens contract +
> the six candidate lenses A–F) and `02-relationship-intelligence-layer.md` (the
> `ai_draft` → human pipeline, `propose_next_lens`, JOURNEY events, provenance,
> 12-month PII-free retention). Anything beyond the brief is marked **[ASSUMPTION]**.

---

## 0. The stance for this workstream

The prior generation asked "what *new lenses* can we add?" (doc 01). This workstream
asks a harder, quieter question: **can the journey we already have see more without
getting longer?** The answer is yes, but only if every idea is measured against one
rule:

> **The screen may not get busier. Depth is bought by making each existing sentence
> sharper, better ordered, and better grounded, not by adding sentences.**

So the default verdict here is *reject*. A "new signal" earns its place only if it
lets the entrepreneur see something essential they had not seen **and** it displaces
or sharpens something already on screen rather than sitting beside it. Every section
below ends with what it costs the surface. Section 9 is a standing kill-list of the
"signals" that are actually noise.

The journey is fixed: First Impression → Reveal → Recognition ("Herken je dit" gate)
→ Technical Signals → "Nog een lens" → Aandacht → Deepen → Meaningful End. Nothing
below adds a stage. Everything below improves a stage that already exists.

Sample copy follows the Maculis rule: no hyphen or dash used as a stylistic pause.

---

## 1. Invisible intelligence improvements (better under the hood, same surface)

These change *nothing* the entrepreneur sees except that the one thing they see is
more true, more recognisable, and never wrong. Zero surface cost by construction.

### 1.1 Render as a human sees it, then observe
- **Observes:** the same things the journey observes today, but read from the
  *rendered* page (post-script, above the fold as painted) rather than raw HTML.
- **Evidence:** the observation cites the region as it actually appeared, so when the
  entrepreneur looks, it is there. The evidence and their experience match.
- **Fail-closed:** if the page never paints meaningful content within the fetch
  budget (SPA that stayed blank, hard redirect, blocked), emit nothing. Never observe
  from raw markup the visitor would not see.
- **Why it deepens without friction:** the whole magic of First Five is "how did they
  see *that*." That feeling collapses the instant one claim points at something the
  entrepreneur cannot find. This is the single highest-leverage under-the-hood
  investment: it protects precision on every existing observation at once.

### 1.2 Multi-witness gating before a claim speaks
- **Observes:** re-checks that a finding is visible in more than one independent place
  before it is allowed to fire (e.g. the missing promise is missing in *both* hero and
  page title, not just one).
- **Evidence:** two or more locators for one claim; the reveal still shows only the
  most recognisable one (see 1.3).
- **Fail-closed:** a single witness does not raise the claim to "clear"; it stays at
  "notable" or stays silent per the lens `confidencePolicy` (doc 01 §1.2).
- **Why:** precision over recall, made mechanical. Fewer, surer claims read as
  uncanny; a scatter of maybe-claims reads as a tool. Same surface, more trust.

### 1.3 Rank evidence by how fast the entrepreneur can verify it
- **Observes:** when a claim has several valid locators, pick the one the entrepreneur
  can confirm fastest (above the fold beats buried; visible label beats attribute).
- **Evidence:** the chosen locator is the most prominent, not the first found.
- **Fail-closed:** if no locator is human-verifiable in one glance, prefer silence
  over citing something they would have to dig for.
- **Why:** the reveal is only as magical as its slowest-to-check claim. This is pure
  ordering intelligence: no new observation, a sharper one.

### 1.4 Phrase-selection as compression, not generation
- **Observes:** nothing new. It chooses the single sharpest sentence for a finding
  from a small fixed phrase bank rather than composing prose.
- **Evidence:** the phrasing is deterministic given the finding + locator, so copy
  stays reviewable and cannot hallucinate (aligns with doc 02's "AI output is
  UNTRUSTED, sanitised").
- **Fail-closed:** if no bank phrase fits the exact evidence shape, do not improvise;
  fall back to the plainest present/absent statement or stay closed.
- **Why:** shorter is the product. Compression is an intelligence task, and doing it
  under the hood keeps the surface restrained without a human editing every run.

**Surface cost of section 1: zero.** Nothing new appears. This is where most of the
"see more" budget should go.

---

## 2. New signals (evidence-bound, public-surface only)

Only signals that are (a) readable from the surface the journey *already* fetches,
(b) essential enough to earn a place at Reveal or Aandacht, and (c) able to *replace*
rather than *append*. Each is precision-gated to a binary fire, never a ratio or
score. Candidates that fail these tests are in Section 9, named as noise.

### 2.1 The tab still says its template name ("Wat staat er op je tabblad?")
- **Observes:** the browser tab title (the `<title>`, already fetched for other
  lenses) still carries a builder default or placeholder ("Home", "Webflow Site",
  "Untitled", "Nieuw project").
- **Evidence:** the exact title string, quoted, plus "this is what a visitor sees on
  the tab before they read a word."
- **Fail-closed:** any real, intentional-looking title (contains the brand name or a
  sentence) → silence. Only known placeholder patterns fire. A borderline title stays
  quiet.
- **Why it deepens:** this is the essence of First Five. It is the very first thing a
  visitor sees, the founder never looks at it, and it is embarrassing in a kind,
  fixable way. Almost zero false positives. High recognisability at the gate.
- **Surface cost:** none; it reuses the title already read for Findability/Technical
  and often *is* sharper than a generic finding it can displace.
- **Sample copy:** "Op het tabblad van je browser staat nog Home. Dat is het eerste
  wat een bezoeker ziet, nog voor je eerste zin."

### 2.2 The page talks only about itself ("Voor wie is deze eerste zin?")
- **Observes:** the hero and first section address no reader at all: entirely
  self-referential ("wij", "ons", the company name) with zero second-person address.
- **Evidence:** the first-person phrases quoted, and the fact that no "je/jij/u/jouw"
  appears in the first meaningful block.
- **Fail-closed:** this is a **binary** fire, not a ratio. It speaks *only* when reader
  address is entirely absent. Any reader address at all → silence. No "score," no
  "mostly about themselves." (A ratio here would be noise; see §9.)
- **Why it deepens:** founders write about their product; they rarely notice they
  never once turned to the reader. Naming it is the "something essential they had not
  seen" the brief asks for. Precision-safe because it fires only at the clean extreme.
- **Surface cost:** none if it displaces a weaker Clarity-of-Promise observation on
  the same hero; it is a sharper cut at the same evidence.
- **Sample copy:** "In je openingszin gaat het alleen over jullie. De bezoeker die
  zich afvraagt of dit voor hem is, komt er niet in voor."

### 2.3 The main button leads nowhere ("Waar brengt je knop je heen?")
- **Observes:** the single visually dominant call to action on the first view points
  at a dead target: `href="#"`, empty, an anchor to a section that does not exist, or
  a 404 on one hop.
- **Evidence:** the button label + its target, both quoted; "this is the main thing
  the page asks a visitor to do."
- **Fail-closed:** only a *concretely* broken target fires. A working button, a
  merely generic label ("Meer info"), or ambiguity about which button is primary →
  silence. Does not judge the label's quality, only its destination.
- **Why it deepens:** the primary action failing is the most consequential thing a
  first visitor can hit, and analytics never surface it because the click just dies.
  Actionable, concrete, unarguable.
- **Surface cost:** none; a Reachability-adjacent finding (doc 01 Lens C) sharpened to
  the *primary* action rather than any contact route.
- **Sample copy:** "De grote knop bovenaan, Start nu, gaat nergens heen. We volgden
  waar hij naartoe wijst."

### 2.4 What the page leads with is not what it asks for (internal contrast)
- **Observes:** the hero *promises* one thing and the primary action *asks* for an
  unrelated one (promise about a product, button says "Schrijf je in voor de
  nieuwsbrief").
- **Evidence:** the hero promise + the button label, side by side, both cited.
- **Fail-closed:** fires only when both are individually clear and plainly unrelated.
  If either is ambiguous, or they plausibly align, stay closed. This is the hardest of
  the four to keep precise; ship it last, behind §2.1–2.3.
- **Why it deepens:** it is a genuine synthesis-grade insight (see §3), not a fact.
  But it must be gated hard or it becomes an opinion, which the product does not give.
- **Surface cost:** none, and it is a candidate *synthesis* line rather than an extra
  observation.
- **Sample copy:** "Bovenaan beloof je een demo. De enige knop vraagt om je
  e-mailadres voor de nieuwsbrief. Allebei zagen we op dit scherm."

**Discipline for section 2:** four signals, each binary, each reusing already-fetched
surface, each able to *replace* a weaker line. None is a new metric. None is
aggregated. The moment any of these is expressed as a number or a percentage it
becomes a dashboard fragment and is rejected.

---

## 3. Better synthesis

Synthesis is the opposite of a dashboard: instead of listing findings, name the one
thread that runs through them. This is how the journey stays short while saying more.

### 3.1 The single thread rule
- **Observes:** whether two or more of the run's observations share one underlying
  cause, and if so states it *once* in the entrepreneur's terms.
- **Evidence:** the constituent observations, each still individually citable beneath
  the synthesis. The synthesis adds no new claim; it *names* existing ones.
- **Fail-closed:** if the observations do not share a genuine thread, **do not
  synthesise**. Show them plainly, or show only the strongest one. Never invent a
  narrative to connect unrelated facts. A fabricated theme is the worst failure mode
  here.
- **Why it deepens without friction:** "the site was never told who it is for"
  (drawn from: no promise + tab says Home + page speaks only about itself) is one
  sentence that carries three findings. The entrepreneur leaves with an insight, not a
  checklist. This is *shorter* than listing three things, not longer.
- **Surface cost: negative.** Good synthesis removes lines.
- **Sample copy:** "Onder alles wat we zagen ligt een ding. Je pagina weet nog niet
  voor wie ze bestaat."

### 3.2 Synthesis by suppression (merge duplicate findings)
- **Observes:** when two lenses report what is really the same underlying fact,
  collapse to one line.
- **Evidence:** both locators are retained internally; only the most recognisable is
  shown.
- **Fail-closed:** if unsure the two are the same fact, keep them separate rather than
  wrongly merging (merging hides a real second finding).
- **Why:** anti-clutter. Two lenses seeing the same thing should feel like one clear
  observation, not two.

---

## 4. Better reveal

The Reveal is the heart. It gets better by *sequencing* and *restraint*, not by
showing more.

### 4.1 Lead with the observation most likely to earn a "ja"
- **Observes:** orders the run's observations by expected recognisability at the
  "Herken je dit" gate and leads with the most recognisable.
- **Evidence:** ordering uses only the finding's type and prominence, not a stored
  model of the person.
- **Fail-closed:** if two are equally strong, prefer the one with the more verifiable
  locator (ties to §1.3).
- **Why:** the first sentence decides whether the gate opens. Leading with the surest,
  most human-legible finding earns the recognition that lets the journey continue.

### 4.2 A strict one-sentence reveal budget, extended only by recognition
- **Observes:** nothing new. It withholds the second sentence until the Recognition
  gate is passed.
- **Evidence:** progressive disclosure gated on the gate event (a JOURNEY event, doc
  02 §3).
- **Fail-closed:** if the entrepreneur does not engage the gate, the journey does not
  push more text; it moves gently to the Meaningful End.
- **Why:** this is the mechanism that keeps the reveal short *by default* and deep
  *only when invited*. Depth becomes opt-in, so the surface never bloats for the
  person who wanted one thing.

### 4.3 Point, do not describe
- **Observes:** the reveal highlights the exact rendered region rather than paraphrasing it.
- **Evidence:** the locator *is* the reveal; the words shrink to a caption.
- **Fail-closed:** if the region cannot be pointed at (off-screen, not renderable),
  fall back to the quoted excerpt, and if neither, stay closed.
- **Why:** showing is shorter than telling and far more magical. The evidence carries
  the message.

---

## 5. Better comparison / context

Comparison is where clutter and privacy risk usually enter (competitor benchmarks,
scores, external data). All of that needs integrations and none of it is magical, it
is anxiety. So comparison here is strictly **self-referential**: the subject against
itself, using only surfaces already fetched.

### 5.1 The homepage promise versus the interior promise
- **Observes:** whether what the site says it does on the homepage matches what it
  says on the one interior page the journey already reached.
- **Evidence:** both statements quoted, both locations named.
- **Fail-closed:** requires two genuinely comparable statements; if the interior page
  has no equivalent, stay closed (absence is not a mismatch).
- **Why:** internal inconsistency is real, verifiable, and needs no outside data. It
  is context the entrepreneur can feel without a benchmark.

### 5.2 What they *say* the page is versus what it *shows* (title/meta vs hero)
- **Observes:** the `<title>` / meta description (the site's own declaration of the
  page) against the rendered hero (what a visitor meets).
- **Evidence:** the declared string and the shown content, both cited.
- **Fail-closed:** fires only on a clear divergence; near-matches stay silent.
- **Why:** this is context drawn entirely from the subject's own words. No external
  frame, no score, no comparison to anyone else.

### 5.3 Change over time against the subject's *own* prior snapshot
- **Observes:** on a re-run, whether a previously observed fact still holds (the tab
  still says Home; the broken button is now fixed).
- **Evidence:** the prior run's stored locator + excerpt (within the existing
  12-month, PII-free retention window, doc 02) and the current one.
- **Fail-closed:** no prior snapshot → behave exactly as a first run; never fabricate a
  history. If the prior evidence is expired or was purged, it simply does not exist.
- **Why it deepens:** "since we last looked" is the only comparison that is both
  magical *and* needs no third party. It compares the entrepreneur to their past
  self, which is the one comparison that motivates rather than shames.

**Rejected here:** competitor comparison, industry benchmarks, "sites like yours score
X." All require integrations, all introduce a score, all trade magic for anxiety. Out
of scope by principle, not just by cost.

---

## 6. Better Meaningful End

The end should land one thing and leave. Its failure mode is padding: a summary card,
a score, a to-do list. All rejected.

### 6.1 One keepsake sentence, phrased as theirs
- **Observes:** nothing new. It selects the single most essential finding of the run
  and states it as something the entrepreneur now owns.
- **Evidence:** the one finding, still pointing at its locator.
- **Fail-closed:** if the run found nothing solid, the end says so plainly and does
  **not** manufacture a finding to feel complete (see §6.3).
- **Why:** a journey the person can recite in one sentence afterward has done its job.
  A summary card is the opposite of memorable.
- **Sample copy:** "Eén ding om mee te nemen. Je tabblad zegt nog niet wie je bent.
  Kijk er morgen naar."

### 6.2 End on something they can re-find alone
- **Observes:** points the entrepreneur at the one place they can re-verify the
  insight after they close the tab.
- **Evidence:** the durable locator ("look at your own browser tab").
- **Fail-closed:** if the finding is not re-findable by them unaided, end on the plain
  keepsake instead without a "go check" instruction.
- **Why:** an insight that survives the closing of the tab is the definition of
  meaningful. Self-verifiability makes it durable with zero follow-up machinery.

### 6.3 The honest quiet end
- **Observes:** whether the run genuinely found little worth saying.
- **Evidence:** the fail-closed results of the lenses that ran.
- **Fail-closed:** *is* the fail-closed case, surfaced with grace: "We keken zorgvuldig
  en vonden niets dat je meteen moet weten. Dat is ook een uitkomst."
- **Why:** a padded end to feel complete is the fastest way to kill the magic. An
  honest short end is proof the product only speaks when it has something. This is the
  single most important guardrail of the whole Meaningful End.

**Surface cost of section 6: negative.** Every item here removes something (a card, a
list, a score) rather than adding.

---

## 7. Better follow-up questions

The "Herken je dit" gate is already a question. Follow-ups deepen the moment without
adding observations, and there is never more than one at a time.

### 7.1 Turn the lens's own limit into the question
- **Observes:** where a lens *fail-closed* because it could not tell (it could not
  read who the page is for), ask the human that exact thing.
- **Evidence:** the abstention itself is the warrant for the question.
- **Fail-closed:** if the lens spoke confidently, do not ask; a question after a clear
  finding reads as doubt. Ask only where the lens was honestly silent.
- **Why it deepens:** it converts the product's humility into a human moment. The
  entrepreneur supplies the context the machine could not, and *feels seen* rather
  than *audited*. This is the most valuable follow-up pattern.
- **Sample copy:** "We konden uit je pagina niet opmaken voor wie ze bedoeld is. Voor
  wie schreef je die eerste zin?"

### 7.2 Ask only what the evidence entitles
- **Observes:** a question is permitted only when a specific observation grounds it.
- **Evidence:** the observation the question follows from.
- **Fail-closed:** no grounding observation → no question. The journey never asks to
  fill a silence.
- **Why:** an ungrounded question is friction. A grounded one is a natural next
  breath.

### 7.3 One question, never a form
- **Observes:** the journey asks at most one follow-up and treats any answer, or none,
  as complete.
- **Fail-closed:** no answer is a first-class outcome; no re-prompt (aligns with doc
  01 §3.4, no dark patterns).
- **Why:** an intake form is the antithesis of magical and short. Rejected outright.
  **NPS / satisfaction questions are also rejected** (§9): they serve the maker, not
  the entrepreneur.

---

## 8. Better relationship-memory, and new triggers for a next lens

Grounded in doc 02's spine: memory lives in the existing `ai_draft` / JOURNEY-event
surface, every remembered item carries provenance (`SOURCES`), and retention stays
inside the existing 12-month, PII-free window. **No new store, no PII, no enrichment.**

### 8.1 Remember the subject's own evidence, not the person
- **Observes / remembers:** the subject site's public evidence snapshot (the tab
  string, the hero excerpt, the button target) so a re-run can speak to change (§5.3).
- **Evidence:** each remembered item is a prior locator + minimal excerpt with a
  `source`, exactly as doc 02 §1 requires.
- **Fail-closed:** on expiry or purge the memory simply is not there; the run proceeds
  as a first run. Never reconstruct a history from inference.
- **Why:** it is the memory that powers the one magical comparison (over time) without
  touching a person.

### 8.2 Remember which finding *landed* at the gate
- **Observes / remembers:** the entrepreneur's yes or no at "Herken je dit," stored as
  a JOURNEY event (doc 02 §3), tied to *which finding* it answered, not to identity.
- **Evidence:** the gate event row.
- **Fail-closed:** no gate response → nothing remembered; the next offer falls back to
  the default safety-first order (doc 01 §4).
- **Why:** what resonated is the single best guide to what to show next, and it is a
  behavioural event, not profiling.

### 8.3 Remember a decline as restraint
- **Observes / remembers:** a declined "Nog een lens."
- **Evidence:** the decline event.
- **Fail-closed:** default to *not* re-offering. Memory here exists to hold the product
  back, never to re-engage.
- **Why:** remembering a "no" and honouring it is trust. This is memory used for
  restraint, which is rare and magical.

### New triggers for a next lens (formalising `propose_next_lens`, doc 02 §3)

Each trigger chooses *which* lens to offer from what was just seen. All obey the
existing gate: offer a lens only if it would have something grounded to say (doc 01
§1.3), at most one offer, and a decline ends the chain cleanly.

- **8.4 Recognition-triggered (lean in):** a strong "ja" at the gate → offer the
  adjacent lens on the *same* theme, because the person is engaged with it.
  *Fail-closed:* if no adjacent grounded lens exists, do not offer.
- **8.5 Rejection-triggered (change facet):** a "nee" at the gate → offer a *different*
  facet, never double down on a theme that did not land.
  *Fail-closed:* if the only eligible lens is the same theme, offer nothing.
- **8.6 Abstention-triggered (a silence becomes a door):** a lens that fail-closed on
  one surface (the hero never rendered) → offer the lens that reads a *different*
  surface (the interior page, the title/meta). The product's limit becomes the next
  invitation.
  *Fail-closed:* if no other surface is available, end gracefully.
- **8.7 Contrast-triggered (answer the obvious next question):** an observation that
  raises one plain adjacent question (found no promise → "for whom?") triggers the lens
  that answers it (the audience signal §2.2).
  *Fail-closed:* offer only if that lens would actually fire on this subject.

**Why the triggers deepen without friction:** today "Nog een lens" is one fixed door.
These make it *the right door for this person, this run*, chosen from evidence already
gathered, still one offer, still declinable, still silent when there is nothing
grounded behind it. More relevance, not more doors.

**Rejected triggers:** novelty ordering ("here is one you have not tried"),
gamification ("you have unlocked 3 more lenses"), and any "keep them in the funnel"
re-prompt. All add clutter and dilute the magic; all are dark-pattern-shaped.

---

## 9. Kill-list: "signals" that are actually noise

Named explicitly so they do not creep back in as "just one more signal." Each fails at
least one non-negotiable: it is a score, it is interpretation, it needs an integration,
or it makes the surface busier for no essential insight.

| Rejected "signal" | Why it is noise |
|---|---|
| Reading-level / word-count / "clarity score" | A number. Becomes a dashboard fragment; forbidden by principle. |
| Tone / sentiment analysis of copy | Interpretation, not evidence. Cannot cite a locator for "feels cold." |
| Self-reference *ratio* ("62% about themselves") | The §2.2 insight turned into a metric. Keep it binary or drop it. |
| Colour / aesthetic / "modern design" judgement | Pure opinion, no verifiable locator, high false-positive rate. |
| Image count, section count, "too much text" | Volume metrics masquerading as insight. Not essential; adds clutter. |
| Competitor / industry benchmark comparison | Needs integration + a score + external data. Anxiety, not magic (see §5). |
| SEO keyword-density / "optimise for Google" | A metric, and it overlaps Technical/Findability without adding meaning. |
| Load-time as a *number* on the surface | A measurement, not a seen thing. If it matters it belongs in Technical, silently. |
| NPS / satisfaction / "how did we do?" question | Serves the maker, not the entrepreneur. Friction at the most magical moment. |
| Any "overall score", grade, or progress bar | The one thing First Five must never become. |

**Rule of thumb for the reviewer:** if a proposed signal cannot be pointed at on the
page in one glance, or if it produces a number, it is noise. Send it here.

---

## 10. Priority (safest, highest-leverage first)

1. **Section 1 (invisible intelligence)** — zero surface cost, protects every existing
   claim. Do this before anything visible. Start with §1.1 (render as seen).
2. **§6.3 honest quiet end + §7.1 limit-as-question** — pure restraint, high magic,
   no new signal to validate.
3. **§2.1 (template tab) and §2.3 (dead primary button)** — the two highest-precision,
   most recognisable new signals; each can displace a weaker line.
4. **§3.1 single-thread synthesis + §4.1/§4.2 reveal ordering and budget** — the
   depth-without-length engine.
5. **§5.3 + §8.1 change-over-time memory** — the one magical comparison; needs the
   memory of §8 first.
6. **§8.4–8.7 next-lens triggers** — layer on once §2 signals exist to be offered.
7. **§2.2 (audience) then §2.4 (promise vs ask)** — highest insight, hardest to gate;
   ship last, behind proven precision on §2.1/§2.3.

---

## 11. Open questions / human actions

- **Rendered-page access:** does the current journey read raw HTML or a rendered DOM?
  §1.1 and much of §2 assume a rendered read is feasible without a new integration.
  Confirm with an engineer. **[ASSUMPTION]** it is, since Technical Signals plausibly
  already renders.
- **Snapshot retention for re-runs:** §5.3/§8.1 reuse doc 02's 12-month PII-free
  window for *subject* evidence. Confirm subject-evidence snapshots are permitted under
  the same retention basis (privacy owner).
- **Gate event capture:** §8.2 assumes the "Herken je dit" yes/no is (or can be) a
  JOURNEY event per doc 02 §3. Confirm the event exists or can be added without a store
  change.
- **Phrase bank ownership:** §1.4 needs an editor-owned Dutch phrase bank per finding
  type. Copy review, not engineering.
- **Binary vs bucket for §2.2:** confirm the audience signal must fire binary (no
  ratio ever reaches the surface), consistent with the no-score principle.

---

*End of MAC-109 analysis. Read-only research; no product code changed. Builds on
`next-lenses/research/01` and `02`; does not repeat their proven material.*
