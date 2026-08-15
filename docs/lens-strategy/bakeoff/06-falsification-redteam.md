# Lens 2 Bake-off: Falsification and Red-Team

> Red-team workstream for the Lens 2 Prototype Bake-off. Purpose: try to prove the current strategic
> ranking wrong. That ranking says Lens 2 is Reputation and Reception, Lens 3 is Finance (Bring Your
> Data), Lens 4 is Dependency and Resilience. This document makes the strongest honest case against
> that order, then judges which attacks survive on strategy alone, and states exactly what the
> prototype must measure to settle each one. Reputation gets no favoured treatment. The goal is a
> better decision, not a defence of the existing one.
>
> House style respected throughout: no stylistic dashes in prose. Grounded in `00-masterplan.md`,
> `01-lens-architecture.md`, `03-prioritization-model.md`, and the two research artifacts.

---

## 0. Method and stance

I am not arguing that the ranking is wrong. I am arguing that the ranking is not yet earned, that its
top result is fragile, and that the fragility sits precisely where the prototype can measure it. For
each proposition I write the steelman first (the strongest version I can honestly build), then the
honest counter-pressure, then what survives, then the empirical test that would confirm or refute it.

One measurement recurs and deserves naming up front. The engine records recognition as `yes`,
`partly`, or `no`, and turns a "no, I had not seen that" into `confirmed_new` (`recognition.ts`, and
the pilot-strategy section of the masterplan). Recognition-yes and confirmed-new are not the same
thing. A reveal can be widely recognised (`yes`) and still be an open door if almost nobody marks it
confirmed-new. The masterplan's own kill rule is "kill a lens when owners find it correct but
uninteresting." Confirmed-new is the operational form of that rule, and it is the axis on which the
whole ranking is most exposed.

---

## 1. Proposition 1: Reputation reveals will mostly be open doors

**Claim to defend: the Reputation and Reception flagship reveal is true but obvious, and its wow will
not survive contact with owners.**

### 1.1 The steelman (this is a real risk, not a rhetorical one)

The flagship Reputation reveal is the promise-versus-reception gap: your site promises strength X,
your public reception emphasises Y instead (masterplan 5.1, 7.2, 17). Three structural facts make this
the weakest-evidenced headline of any candidate.

First, the data is thin where it matters most. The Places API (New) returns rating, `userRatingCount`,
and at most five reviews (research Part B, GBP public data row; masterplan 5.1 explicitly notes "only
five reviews via the Places API, so themes are a sample"). The rating and count are hard facts, but
they are also the boring part: an owner knows their own star rating. The interesting part, the theme
gap ("customers write about speed and price, not the attention you claim"), rests on a five-review
sample. A different five reviews next month can produce a different theme cluster. The flagship reveal
is therefore built on the single thinnest evidence base in the entire candidate set, and its most
surprising element is its least stable one. The masterplan itself rates review-theme reading only
"medium" reliability and "medium" false-positive risk (5.1), while rating the rest of the lens high.
The lens is strongest exactly where it is least interesting and weakest exactly where it is most
interesting.

Second, reputation is the outside signal owners already watch most closely. Owners read their own
reviews. They feel their reputation. That is the definition of high `already_stated` exposure, and
`already_stated` is a gate check that suppresses reveals the owner already makes about themselves
(`gate.ts`, check 2). Finance relations, by contrast, are things owners provably do not compute
(revenue and cash tracked separately, never divided). So on the one axis the whole strategy says
matters most, confirmed-new, Reputation starts with a structural handicap that Finance does not.

Third, the emotional register can carry a reveal that is not informationally new, but that is a
double-edged defence. "Seeing your promise next to how the public receives you" (5.1 first wow moment)
can land emotionally even when the owner half-knew it. But an emotional jolt that decays on the second
viewing is the report-versus-revelation failure the pilot already documented. A reveal that lands once
and cannot repeat is a poor anchor for a lens meant to earn recurring engagement (S3 recurrent use,
where Reputation already scores only 3).

### 1.2 The honest counter-pressure

The proposition overreaches if it condemns the whole lens. Two Reputation reveals are genuinely hard
and genuinely surprising, and neither depends on the five-review sample:

- Identity consistency: KVK registered name and address versus the live site versus the Google
  profile, disagreeing (masterplan 3, 5.1; research Part C relationship 11). Three authoritative
  sources, fully deterministic, high confidence, and owners routinely do not know their citations
  contradict. This is a real reveal with no sampling problem.
- Old and invisible, and the widening reputation gap: a long-established, well-reviewed business that
  is nearly absent from organic search, or whose review velocity is flat while competitors accumulate
  more recent reviews (research Part C relationships 4 and 8). These are hard and non-obvious.

But note what this concession actually says. The durable Reputation reveals are the deepening beats,
not the flagship. The reveal that justifies Reputation as the zero-integration wow, promise versus
public reception, is the fragile one. The robust ones are quieter, need more surfaces, and are further
down the disclosure ladder.

### 1.3 What survives

The proposition survives in a sharpened form. Not "Reputation is an open door," but: **the specific
reveal that earns Reputation its Lens 2 slot (promise versus reception) is the most likely of any
candidate flagship to score high recognition-yes and low confirmed-new, and its surprising element is
sampling-unstable.** The lens is not empty. Its headline is soft.

### 1.4 Empirical test

- Confirmed-new rate on the promise-versus-reception reveal specifically, separated from recognition-
  yes. High yes with low confirmed-new (say below one-third) confirms the open-door thesis.
- Theme stability: re-pull reviews after a short interval, or bootstrap-resample the five available
  reviews, and check whether the theme cluster the reveal names is stable. An unstable theme is a
  false-positive generator.
- Silence rate: if the Reputation lens rarely returns SILENCE on real testers, it is leaking
  triviality (architecture 8: a lens whose silence rate collapses is probably leaking triviality).

---

## 2. Proposition 2: Finance (BYD) is the structurally stronger Lens 2

**Claim to defend: Finance delivers stronger reveals because its signals are hard and its relations
are genuinely invisible to owners, and it should be Lens 2 despite the upload friction.**

### 2.1 The steelman

The engine's evidence floor for any reveal is L3 (`gate.ts` check 1; architecture 3.1). Finance data
is born at L3 or L4 because a ledger figure is a hard signal (architecture 3.1 states this explicitly).
The Reputation flagship's most interesting component is born at L1 to L2 (a five-review theme sample).
There is an irony the ranking does not confront: the outside-in lens chosen for Lens 2 clears the
engine's own evidence floor less naturally than the data lens deferred to Lens 3. On the engine's own
terms, Finance is the better-evidenced reveal.

The Finance relations are also invisible in a way Reputation reveals are not. Owners track revenue and
they track the bank balance, on separate screens, and they do not compute the relation between them.
Revenue up while free cash down, one customer climbing from 18 to 34 percent of revenue, gross margin
slipping under rising revenue (masterplan 5.2, 6.1): these are exactly the relations the owner has the
raw numbers for and never puts together. That is the purest possible source of confirmed-new. The
masterplan's own value scores agree: Finance scores 5 on wow (V4) against Reputation's 4, and 5 across
every value criterion, a clean 200 of 200 value subtotal (model section 2). The model already says
Finance is the better reveal. It ranks Reputation first purely on the non-value clusters.

The friction objection is real but the strategy overstates it in one specific way. The masterplan's
argument against Finance-as-Lens-2 is that it "would front-load the product's highest privacy and
security risk before the pilot has shown owners will hand over financial data" (masterplan 1, 32).
That argument conflates two separable things. One is production security engineering (encryption at
rest, tenant isolation, DPIA, ROPA), which genuinely should not be front-loaded. The other is learning
whether the Finance reveal lands, which needs only a handful of friendly owners uploading one trial
balance into a prototype (masterplan 25 pilot protocol, 5.2 pilot options). A bake-off pilot decouples
these. You can measure Finance recognition on five owners without shipping any production security
posture. The "trust must come first" sequencing is an argument about the order of the general-release
rollout. It is not an argument about which reveal is stronger, and it is not a reason the bake-off
cannot test Finance head-to-head now.

### 2.2 The honest counter-pressure

Friction is not only a security-sequencing question. A zero-login lens reaches every owner with a
website; a BYD lens reaches only owners willing to export and upload a trial balance. That is a genuine
funnel difference and a genuine top-of-funnel value for Reputation (F1 zero-integration, F7 reach).
Wonder before trust is a real design principle, and a first contact that asks for financial data can
feel like a demand rather than a gift. If upload completion among invited owners is low, Finance's
superior reveal reaches too few people to be the second lens, whatever its per-owner strength.

There is also a real recognition risk specific to Finance: a concentration rise or a margin slip may be
intentional and known to the owner (deliberate key-account strategy, deliberate margin investment).
The masterplan flags this (5.2, 6.1 reveal 6). So Finance is not automatically all confirmed-new
either. Its interpretation false-positive risk is medium even where its arithmetic is exact.

### 2.3 What survives

The proposition survives, reframed: **Finance is very likely the stronger reveal on the axis the
strategy most values (confirmed-new on invisible relations), and the ranking penalises it on costs that
are engineering-sequencing costs, not reveal-quality costs.** Whether it can be Lens 2 turns on a single
empirical unknown the strategy currently assumes rather than measures: upload completion among invited
owners. If that assumption is wrong in Finance's favour, Finance should be Lens 2.

### 2.4 Empirical test

- Head-to-head confirmed-new rate: Finance flagship versus Reputation flagship, same owners, same
  sitting. If Finance confirmed-new clearly exceeds Reputation confirmed-new, the value ordering the
  model already encodes is confirmed by data.
- Upload completion rate among invited owners, measured, not assumed. This is the true friction number.
  If it is high (say a majority of invited friendly owners complete one upload), the feasibility
  penalty that carries Reputation to first place is largely illusory for the pilot population.
- Finance interpretation false-positive rate: how often the owner responds "yes but that was
  deliberate" to a concentration or margin reveal. This bounds Finance's confirmed-new from above.

---

## 3. Proposition 3: Dependency and Resilience is the most Maculis-native lens

**Claim to defend: hidden vulnerability assembled from several loose sources is the purest cross-lens
reveal, no competitor builds it, and Dependency could leapfrog its Lens 4 slot.**

### 3.1 The steelman

The masterplan defines a Maculis reveal as a relationship the owner cannot see because it lives between
signals, and defines the strongest differentiator as cross-lens reveals assembled from more than one
registered lens (masterplan 14; architecture 5). By that definition Dependency is the most Maculis-
native candidate of all. Reputation crosses two surfaces (site and reviews, or site and registry).
Finance-internal crosses two ledger lines. Dependency fuses finance concentration, supplier
concentration, owner-thread dependency from Relationship Intelligence, and key-person exposure into a
single vulnerability that none of those sources shows alone (masterplan 5.3, 9). It is the candidate
whose reveal is least reproducible by looking at any one source, which is exactly the property the
strategy calls the moat.

It is also the whitest white space. The competitor research finds adjacent players around Reputation
(SEO and review tooling) and around Finance (Agicap, Runway, Digits, Silverfin). It finds nobody
building transferability and owner-dependency for owners (masterplan 9 concept 10, 22). On
differentiation (V3) Dependency scores 5, tied with Finance and above everything else, and its reveal
is the least likely of any to be an open door, because "growth is increasing your fragility" is
counter-intuitive by construction (masterplan 5.3: growth can increase fragility). It is emotionally
the largest reveal in the roadmap, touching the owner's freedom and the sale value of what they built.

### 3.2 The honest counter-pressure

The reason Dependency is Lens 4 is a genuine data dependency, not a value judgement, and this is where
the leapfrog claim mostly breaks. Customer concentration needs invoice-level or receivables data across
periods, which is Finance BYD input. Owner-thread dependency needs the Relationship Intelligence layer
to have accumulated enough confirmed relationship memory to say "every thread routes through the owner"
(masterplan 5.3, 15; architecture concedes Relationship Intelligence must mature). You cannot compute
the full Dependency reveal before Finance and the Relationship layer exist. That is a hard
prerequisite, and it is correctly stated.

But the counter-pressure has a limit worth naming. A thin Dependency reveal, single-source customer or
supplier concentration from one uploaded aged-receivables list, needs exactly the same input as Finance
BYD and no Relationship layer at all. So "Dependency must be Lens 4" is partly an artifact of scoping
Dependency at its full multi-source version. Its concentration facet is available the moment Finance
BYD is. The masterplan already half-admits this by routing customer concentration through the Finance
lens (6.1 reveal 3, "bridges into the Dependency lens").

### 3.3 What survives

Dependency cannot be Lens 2: the full reveal's data dependency on Finance and Relationship Intelligence
is real. But the proposition survives as a ranking critique: **Dependency is under-ranked at 70.6, tied
with Marketing Connected, when on value and differentiation it clearly beats Marketing Connected and
rivals Finance.** The tie is an artifact of the feasibility and risk clusters again, the same clusters
that carry Reputation over Finance. And Dependency's concentration facet is feasible as early as Finance
BYD, which means the roadmap could surface a genuine Dependency reveal at Lens 3 time, not Lens 4 time.

### 3.4 Empirical test

- Run the thin concentration reveal on the same uploaded receivables the Finance pilot uses, and
  measure its confirmed-new and wow against the Finance concentration reveal. If the Dependency framing
  ("your growth and your risk now share one source") outscores the Finance framing on wow, Dependency's
  value is under-ranked and its concentration facet should ship with Finance.
- Measure whether owners rate the Dependency reveal as more or less actionable than Reputation's, since
  Dependency scores lower on GrowBrain handoff (S1) in the model and that deserves a check.

---

## 4. Proposition 4: The prioritisation model is biased toward feasibility over value

**Claim to defend: the model's weighting encodes a feasibility preference as if it were a value-neutral
fact, and a defensible reweighting flips the ranking.**

### 4.1 Where the current result actually comes from

Decompose the top two into cluster contributions (normalised, out of 100). This is arithmetic from
`03-prioritization-model.md`, not reinterpretation.

| Cluster (weight) | Reputation (B) | Finance (C) | Lead |
|---|---:|---:|---:|
| Value (40) | 33.2 | 40.0 | Finance +6.8 |
| Feasibility (35) | 31.2 | 22.0 | Reputation +9.2 |
| Risk (10) | 9.0 | 4.0 | Reputation +5.0 |
| Strategy (15) | 11.8 | 15.0 | Finance +3.2 |
| Total | 85.2 | 81.0 | Reputation +4.2 |

The entire 4.2 point margin, and more, is manufactured by the Feasibility and Risk clusters. Finance
wins Value and Strategy by a combined 10.0. Reputation wins Feasibility and Risk by a combined 14.2. The
decision to make Reputation Lens 2 is, arithmetically, the decision to let Feasibility plus Risk count
for 45 of 100 weight points in a strategic second-lens choice. That is a defensible choice. It is not a
neutral one. The model's own preface admits it: "feasibility is heavy (35) because Maculis is post-pilot
and must ship trustworthy lenses fast, and because the zero-integration-first principle is core"
(model section 1). The weighting is the zero-integration philosophy expressed as numbers. If you doubt
that philosophy should dominate the Lens 2 decision, the ranking has no independent support.

Two finer biases compound this.

- Double-counted reach. F1 (zero-integration value) and F7 (doelgroepbereik) both reward "works with no
  login for everyone." They are close to the same property scored twice, and both favour outside-in
  lenses. Finance is penalised twice for one characteristic.
- No durability axis. V4 is "wow potentieel (first-contact recognition and surprise)." There is no
  separate criterion for durable non-obviousness, the confirmed-new that survives a second look. This is
  the exact axis on which Reputation is weakest (proposition 1). The model cannot see the risk it most
  needs to see, because it never scores it.

### 4.2 A defensible alternative weighting, recomputed

The model's own section 5 licenses reweighting: "if the strategy shifts toward monetisation, raise V6
and S3. If it shifts toward defensibility, raise V3 and V5." A second-lens decision whose stated purpose
is to prove the reveal thesis and earn durable, paid engagement is a defensibility-and-monetisation
decision. So raise Value and Strategy, cut Feasibility, keep Risk light. I keep every candidate's 1-to-5
scores exactly as the model set them and change only the weights, which isolates the effect of the
weighting choice.

Weighting II. Value 50, Feasibility 22, Risk 8, Strategy 20.

| Candidate | Original | Weighting II |
|---|---:|---:|
| B Reputation and Reception | 85.2 | 84.0 |
| C Finance (BYD) | 81.0 | **87.2** |
| A Deepen Lens 1 | 76.0 | 69.2 |
| D Dependency and Resilience | 70.6 | 75.6 |
| E Marketing Connected | 70.6 | 73.2 |

The ranking flips at the top. Finance becomes Lens 2 at 87.2, Reputation second at 84.0. Dependency also
separates cleanly from Marketing Connected. Nothing about the candidates changed. Only the belief about
how much feasibility should count changed, and it changed by an amount the model's own guidance invites.

How fragile is the original result? Holding Risk at 10 and Strategy at 15 and moving weight only from
Feasibility into Value, Finance overtakes Reputation once Value reaches about 50 and Feasibility falls to
about 25. That is a swing of roughly 10 of 100 weight points. The number one ranking of the entire
roadmap turns on a 10-point weight preference between two clusters. That is not a robust decision. It is
a knife-edge decision presented as a settled one.

### 4.3 What survives

The model is not wrong and its transparency is a real virtue. But **its headline result is weight-
fragile, driven almost entirely by two clusters that encode a philosophy rather than a measurement, and
blind to the one value axis (durable confirmed-new) that would most change the answer.** The correct use
of the model is the one it recommends itself: replace the judged V2 and V4 scores with measured
confirmed-new and wow from the bake-off, then re-rank. Until then the model should be read as "Reputation
and Finance are effectively tied, and the tie-break is a bet on feasibility."

---

## 5. Proposition 5: "A new lens is just configuration on the Reveal Engine" breaks for Finance and Dependency

**Claim to defend: Finance and Dependency need new relation families and new gate logic beyond the four
website families, so "just config" is not true for the relation layer.**

### 5.1 What is genuinely just config (concede it plainly)

The engine data model is domain neutral and reusable verbatim: `Observation`, `Relation`,
`CandidateReveal`, `GateResult`, `Reveal`, `EngineTrace` (architecture 1.1). The selector, silence and
failure semantics, provenance, recognition, the bounded-LLM contract, versioning, and observability are
all shared and inherited (architecture 1.4 to 1.8, 2). The gate's seven checks are domain agnostic as
control flow. For all of this, "config plus domain logic on a shared engine" is accurate. The lens
registry refactor is real and small (architecture 4). None of what follows disputes the engine core.

### 5.2 Where it breaks: the four families are qualitative, the Finance and Dependency reveals are
quantitative, temporal, and distributional

The four families (CONTRADICTION, TELLING_ABSENCE, MISCAST, DRIFT) are tensions between discrete claims.
The architecture doc maps finance examples onto them in a table (architecture 1.2), but that table shows
the families can label a finance tension after the fact. It does not show the existing detectors produce
it. The doc itself concedes the distinction: "the detectors themselves are website specific ... a new
lens implements new detectors" (architecture 1.2). The load-bearing question is what those new detectors
need that the website detectors never had. Three things, none of which is config.

- Magnitude and materiality. "Revenue up while cash down" is only a reveal above a materiality
  threshold. A 2 percent revenue rise against a 1 percent cash dip is noise. The website CONTRADICTION
  detector reads two text claims pointing opposite ways and has no concept of magnitude, materiality, or
  measurement noise. Finance needs a materiality gate: how large must a divergence be, relative to base
  and to normal variation, before it clears attention. That is new machinery, and it partly belongs
  inside the gate, because `attention_worthy` (check 7) currently passes an "undeniable single-surface
  gap" with no numeric notion of undeniable.

- Time and comparability. Website DRIFT is a present-tense stale claim: the site still advertises
  something no longer delivered. Finance drift and Dependency trends are two-period-or-more movements:
  margin slipping across periods, a customer climbing across quarters. Detecting them needs period
  normalisation, comparable-period alignment, and seasonality awareness (masterplan 6.1 reveals 4, 7
  need at least two comparable periods; reveal 7 needs a full cycle). None of that exists in the website
  DRIFT detector. This is either a new temporal detector family or, at minimum, a temporal comparability
  check the gate does not have.

- Distribution and concentration. "One customer is 34 percent of revenue" is a statement about the shape
  of a distribution over many invoice rows. It is not a tension between two observations. Which of the
  four families is it? Forcing it into MISCAST ("the weight a signal is given does not match the
  evidence") is a stretch, because the owner never assigned a weight to that customer. Forcing it into
  CONTRADICTION fails because nothing contradicts anything; a single skewed distribution is the whole
  reveal. This is the clearest break: **concentration is a genuinely new relation shape, a
  CONCENTRATION or DISTRIBUTION family, not expressible as configuration over the existing four.**
  Dependency, whose entire thesis is concentration and single-point-of-failure, is built almost entirely
  on this missing family.

### 5.3 Where the gate needs new sub-logic

- specificity and non_generic (checks 3 and 4) are built to reject "sector wallpaper" in text. Their
  numeric analog does not exist: is a 20 percent top-customer share dangerous or merely sector-typical?
  Answering "generic" for a number requires a benchmark, which means the gate now needs an external
  evidence dependency (CBS or KVK sector data, research Category 4) that the website gate never needed.
  That is new gate input, not config.
- defensible (check 5) forbids causal and recommendation language and forbids leaning on a single
  external data point for a cross-lens reading. Finance is internal data, so the single-external-point
  clause does not bite, which paradoxically weakens a protection the website lens relied on. And a
  concentration reveal sits one word away from a normative verdict ("this is dangerous"). The gate needs
  a new rule it does not currently have: no normative or risk verdict on a distribution, state the shape
  and pose the question. The relation strength ladder (architecture 5) governs this in prose, but the
  gate does not yet enforce a distributional version of it in code.

### 5.4 What survives

"A new lens is configuration on the Reveal Engine, not a new product" is **true for the engine core and
false for the relation and gate layer of Finance and Dependency.** Those two lenses need at least one new
relation family (concentration and quantitative divergence), new temporal detection with comparability
handling, and new numeric gate sub-logic (materiality, benchmarked specificity, distributional
defensibility). This is real new domain logic, not parameter tuning. The honest framing is that the
engine is reusable and the relation layer is not, and the masterplan's "just config" language understates
the Finance and Dependency build in a way that flatters their feasibility scores. Reputation, by
contrast, really is close to config: its reveals are qualitative cross-surface contradictions that the
existing families fit. So proposition 5 does not attack Reputation. It attacks the feasibility premise
that helps justify deferring Finance, by showing the deferred lenses carry hidden engine-adjacent work,
while also conceding Reputation is the genuine config-only case.

### 5.5 Empirical test

- False-positive rate of the quantitative, temporal, and concentration detectors specifically, and how
  much hand-tuned thresholding is required to keep it low. If the detectors need materiality thresholds
  tuned by hand to avoid firing on noise, that is direct evidence they are new machinery, not config.
- Silence rate on Finance and Dependency prototypes. Correct silence on thin or immaterial input is the
  proof the new gate sub-logic works (architecture 8, 9.7). A collapsed silence rate means the numeric
  gate analog is missing or too loose.

---

## 6. What the prototype must measure, per proposition

Consolidated so the bake-off instrumentation is explicit. Every row is confirm-or-refute.

| Proposition | Confirms it | Refutes it | Primary metric |
|---|---|---|---|
| 1. Reputation is an open door | High recognition-yes, low confirmed-new on promise-vs-reception; unstable theme cluster on resample; low silence rate | Confirmed-new competitive with Finance; theme stable; healthy silence rate | Confirmed-new on the flagship, plus theme stability |
| 2. Finance is the stronger Lens 2 | Finance confirmed-new exceeds Reputation; upload completion high among invited owners | Upload completion low; Finance confirmed-new dragged down by "deliberate, already knew" responses | Head-to-head confirmed-new, plus upload completion (the true friction number) |
| 3. Dependency under-ranked | Thin concentration reveal outscores Finance concentration framing on wow and confirmed-new | Owners find concentration obvious, or cannot act on it (weak GrowBrain handoff) | Confirmed-new and wow on the concentration facet, same receivables input |
| 4. Model biased to feasibility | Measured Finance value (confirmed-new plus wow) exceeds Reputation by more than the feasibility gap can defend | Reputation confirmed-new holds and Finance friction is real, vindicating the feasibility weight | Replace judged V2 and V4 with measured confirmed-new and wow, then re-rank |
| 5. "Just config" breaks | Finance and Dependency detectors need hand-tuned materiality thresholds; concentration needs a new family; silence rate fragile without them | Existing four-family detectors produce Finance and Dependency reveals with acceptable false-positive and silence rates unchanged | Detector false-positive rate and silence rate, with and without new thresholds |

Across all five, the shared instruments are the same five the brief names: recognition rate split into
yes and confirmed-new, false-positive rate, wow, friction (measured as completion, not assumed), and
silence rate. The engine already captures recognition and outcome distribution (architecture 1.5, 1.7,
8), so most of this is reading existing traces, not new tooling.

---

## 7. Verdict

Given strategy alone, and before a single prototype trace exists, the candidate most at risk of being
mis-ranked is **Reputation and Reception, and the direction of the error is that it is over-ranked at
Lens 2.** Three independent lines of attack converge on the same spot. Its number one position rests
entirely on the Feasibility and Risk clusters, which are 45 of 100 weight and which encode the zero-
integration philosophy rather than a measurement (proposition 4). Its flagship reveal has the thinnest
evidence base of any candidate, a five-review theme sample, and the highest structural exposure to
`already_stated`, because reputation is the outside signal owners watch most (proposition 1). And the
model's own value scores already rank Finance ahead on every value criterion (proposition 2). The only
thing keeping Reputation first is a knife-edge belief about how much feasibility should count, a belief a
10-point weight swing overturns.

The mirror-image risk is that **Finance is under-ranked for the wrong reason.** It is penalised on
feasibility and risk that are production-security-sequencing costs and hidden relation-layer build costs
(propositions 2 and 5), neither of which is a reveal-quality cost, and both of which a friendly-owner BYD
pilot can hold constant while measuring the reveal. Dependency is under-ranked too, though it genuinely
cannot be Lens 2, and its concentration facet deserves to ship earlier than Lens 4 (proposition 3).

None of this proves the ranking wrong. Reputation may well post a strong confirmed-new rate, upload
completion for Finance may be a wall, and the feasibility weight may prove wise. That is precisely why it
is a bake-off and not a memo.

The single most important thing the prototype must measure to settle it: **the head-to-head confirmed-new
recognition rate, Reputation flagship versus Finance flagship, on the same pilot owners in the same
sitting.** Confirmed-new is the operational form of the strategy's own kill rule, it is the one axis the
scoring model never scores, and it is the exact axis on which Reputation is most exposed and Finance most
advantaged. Two tie-breakers ride alongside it, one for each lens: Reputation's theme stability under
resampling, and Finance's upload completion rate among invited owners. If Finance's confirmed-new clearly
exceeds Reputation's and its upload completion is not a wall, then the feasibility weight that is doing
all the work in the current ranking is not load-bearing for the pilot population, and the Lens 2 decision
should flip to Finance. If Reputation's confirmed-new holds and its themes are stable, the ranking earns
the first place the model currently only asserts.
