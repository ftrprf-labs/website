# GrowBrain Bridge and Relationship Intelligence, per Lens 2 Candidate

> Bake-off workstream document for the three Lens 2 candidates: Reputation and Reception (Buitenkant),
> Finance via Bring Your Data (Kasbeeld), and Dependency and Resilience (Afhankelijkheid).
>
> Scope. This is an internal design document. It designs two things for each candidate: the GrowBrain
> bridge (how a reveal becomes an earned action, Part A) and what that candidate contributes to
> Relationship Intelligence (Part B), then ranks the three on both axes (Part C).
>
> Grounding. The Reveal Engine discipline is taken verbatim from `01-lens-architecture.md` (the four
> questions contract, the relation strength ladder, recognition). The Relationship Memory discipline is
> taken from the shipped code in `server/comm/memory.mjs` and `server/comm/ai/context.mjs`: AI derived
> items are stored as `source='ai'` with `confidence='proposed'` and are shown as suggestions only, and
> the bounded Context Engine feeds the model `confidence='confirmed'` items exclusively. That is the
> exact stance every lens inherits.
>
> House writing rule respected throughout. No stylistic hyphens or dashes in visible copy or prose.
> All example copy is Dutch and clearly labelled hypothetical.

---

## 0. The two disciplines every candidate inherits

Before the per candidate design, two rules from the codebase bound everything below. They are not
optional and they are not re-litigated per lens.

**The relation strength ladder (from `01-lens-architecture.md`, section 5).** Maculis may signal a
relationship at five levels: correlation, temporal coincidence, plausible hypothesis, confirmed
relationship, and causal claim. Observation alone can reach level 4 (confirmed by recognition or by two
independent lenses at L3 or higher). Level 5, an actual causal claim, requires an intervention and a
measured result. It exists only after a GrowBrain experiment. This single fact is why GrowBrain is not
a nice-to-have: it is the only path from "these two things move together" to "changing this caused
that."

**The memory contract (from `server/comm/memory.mjs`).** There are four states, and the AI can only
ever produce the weakest one:

- Event data: what happened (a lens was viewed, a reveal was shown, a recognition was captured). Recorded
  as activity, never as a fact about the relationship.
- Derived hypothesis: what it might mean. The AI may propose this, and only as `source='ai'`,
  `confidence='proposed'`. `addMemory` forces that confidence for any AI source, so speculation is
  structurally prevented from entering as fact.
- Confirmed memory: human approved (`confirmMemory` sets `confidence='confirmed'`). Only confirmed items
  are read back into model context by `buildRelationshipContext`. A proposed item is a suggestion for a
  person, never established truth.
- Rejected interpretation: `dismissMemory` supersedes it. A rejection is kept, not deleted, because it is
  itself valuable relationship knowledge.

The line that governs Part B: the AI may never write speculation as fact into memory. It may only
propose. A human recognition is what turns a proposal into a fact.

---

# PART A. The GrowBrain bridge

## A.0 Shared rules for the bridge

The transition Maculis is designing is: seeing, then wanting to understand, then wanting to act. The
engine already produces the first two through the four questions contract (`01-lens-architecture.md`,
section 2.1): the grounded observation, the tension, the decision it touches, and the invitation to go
deeper. GrowBrain owns only the last step, and it owns it under strict rules so it never becomes a
sales button.

1. **Earned, never automatic.** GrowBrain is offered only after a recognised reveal, meaning the owner
   said "yes, I recognise this" or asked to go deeper. It is never attached to a silence, to a
   partly recognised gap, or to a raw observation. This is the same rule the masterplan states in
   section 16.
2. **The handoff carries evidence, not a recommendation.** What travels is the grounded relation, its
   basis, and the bounded hypothesis, tagged with provenance. GrowBrain does not receive, and Maculis
   does not send, an instruction to buy or do anything. The experiment remains the owner's choice.
3. **The tone is shared curiosity.** "This is interesting, why is this happening, shall we find out
   together." Never "here is our next product." The emotional register is a colleague wondering aloud,
   not a vendor closing.
4. **Level 5 is the only new thing GrowBrain can create.** Everything up to a confirmed relationship
   (level 4) is available from observation and recognition. GrowBrain intervenes and measures, which is
   the only way to reach a causal claim (level 5), and the measured result flows back as a new
   confirmed relationship in Relationship Intelligence, stamped with the experiment id, the baseline,
   the single lever changed, the measured delta, and the as-of date.

What travels with every handoff, in all three candidates:

- The grounded relation (the four families object) with its `tension` and `why_might_matter`.
- The `basis` and `observation_ids`, so the experiment is designed against real evidence, not a vibe.
- The bounded hypothesis, phrased at ladder level 3 (a mechanism the owner can confirm or reject),
  never as a cause.
- The relationship context the Context Engine already assembles for this owner: relationship stage,
  confirmed memories, open follow-ups, and the recognition just captured. Nothing more, per the data
  minimisation stance in `context.mjs`.

## A.1 Reputation and Reception (Buitenkant)

**The transition.** Seeing is easy and cheap here: the owner sees their own promise placed next to how
the public actually receives them. The site claims a named strength, the public reviews emphasise
something else. Wanting to understand follows naturally, because the gap is about the owner's own words.
Wanting to act follows only if the owner accepts that the public surface, not just a sample of reviews,
really diverges from the promise.

**What travels with the handoff.** The evidence is the promise quote (verbatim, from the Lens 1
extraction) and the public reception signal (the review theme cluster and the aggregate rating and
recency). The hypothesis is bounded: the strength you claim may not be the strength your customers
experience or notice, or it may be real but invisible on the surfaces people read. The relationship
context is thin here on purpose, because most of this lens is about the public surface of the business,
not about the relationship. That thinness matters in Part B and Part C.

**Enough to hand off, versus needs more evidence first.** Maculis has seen enough to hand off when the
gap is corroborated across at least two surfaces (site plus reviews, or site plus registry) and the
owner has recognised it (`recognition = yes`). Maculis has not seen enough, and should deepen rather
than hand off, when: the review base is too thin to read themes (the Places aggregate exposes only a
small sample, so a five review read is a sample, not a verdict), or the gap rests on a single surface,
or the recognition was "partly." In those cases the right next move is another evidence beat
(findability, identity consistency, trust signals), not GrowBrain.

**Avoiding the sales button.** The specific risk here is that "close the gap" reads as "buy our
marketing service." Three guards. Offer the handoff only after a clean `recognition = yes`, never after
the reveal alone. Frame it as a test the owner runs on their own site and their own outreach, with
Maculis watching alongside. And accept that many Reputation experiments will not cleanly reach a causal
claim, so present the handoff as curiosity, not as a promised result.

**Example handoff (hypothetical, Dutch, house style).**

> "Je herkende het: je site belooft persoonlijke aandacht, en je publieke reviews gaan vooral over
> snelheid en prijs. Interessant dat die twee uit elkaar lopen. Zullen we samen uitzoeken of het helpt
> om die aandacht ergens zichtbaar te bewijzen, en dan een tijd meekijken wat je bezoekers en je
> nieuwe reviews erover gaan zeggen. Geen belofte over de uitkomst. Gewoon kijken wat er gebeurt."

**How the measured result flows back.** The intervention is cheap and fast: make the claimed strength
provable on the site and in outreach. The measurement is slow and noisy: review theme drift accumulates
over months, the sample is small, and enquiry quality is a soft signal. Honest consequence: most
Reputation experiments will land at level 4 (a confirmed relationship, "making the strength visible
shifted what enquirers mention"), not a clean level 5 causal claim, because the attribution is
confounded and the sample is thin. When it does reach level 5, it flows back as a confirmed causal
memory with the experiment provenance attached. The honest position is that Reputation is the candidate
whose GrowBrain loop is the cleanest to start and the hardest to close.

## A.2 Finance via Bring Your Data (Kasbeeld)

**The transition.** Seeing is a jolt here: two numbers the owner tracks separately, placed in a
relationship they had not made. Revenue grew, free cash shrank, and the difference sits in the debtors.
Wanting to understand is immediate, because cash is survival. Wanting to act is the strongest of any
candidate, because the levers are concrete and in the owner's own hands (collections, pricing, cost,
mix, concentration).

**What travels with the handoff.** The evidence is hard: two comparable periods of ledger data, born at
L3 or L4 (a ledger figure is a hard signal, per `01-lens-architecture.md`, section 3.1). The relation
is a `CONTRADICTION` across the cash and profit sub lenses, with the exact figures as basis. The
hypothesis is bounded and locates the divergence (the debtors are paying later than a year ago). The
relationship context includes any prior confirmed financial memory (for example a previously confirmed
seasonality shape, or a previously confirmed deliberate concentration), so the experiment is designed
against what Maculis already knows about this owner.

**Enough to hand off, versus needs more evidence first.** Maculis has seen enough when a flagship
relation rests on hard signals across two comparable periods, the owner recognised it, and the owner has
confirmed that the pattern is not already intentional. Maculis has not seen enough when only one period
is uploaded (no development or drift relation is possible), or when the relation might reflect a
deliberate choice the owner already made. A concentration rise, for instance, may be an intentional
strategic bet. In that case the right move is to confirm intent first, because proposing a
"reduce concentration" experiment to an owner who deliberately built that concentration is both wrong
and patronising.

**Avoiding the sales button.** The risk is that "improve your collections" reads as an upsell to a
collections product. The guard is that GrowBrain proposes an experiment design using the owner's own
levers and the owner's own data, and measures with the owner's own next period. Maculis sells the
owner a way to know, not a service to buy.

**Example handoff (hypothetical, Dutch, house style).**

> "Je zag het zelf: je omzet groeide, je vrij beschikbare kas daalde, en het verschil zit in je
> debiteuren. Voordat je een conclusie trekt, wil je samen een kleine proef doen. We passen één ding
> aan in hoe je factureert of aanmaant, en we kijken over de komende periode wat er met je
> debiteurentermijn en je kas gebeurt. Dan weet je of het daar echt aan ligt, in plaats van dat we het
> alleen vermoeden."

**How the measured result flows back.** This is the cleanest level 5 loop of the three. One lever
(payment terms or dunning cadence), a hard baseline (current days sales outstanding and free cash), a
short measurement window (one billing cycle), and a hard measured delta. When the next period is
uploaded, Maculis compares baseline to result and, if the owner confirms the reading, writes a confirmed
causal relationship into Relationship Intelligence: intervention X moved debtor days from A to B and
freed cash C, as-of this date, experiment id attached. Because the outcome metric is hard and
re-measurable from the same upload path the lens already uses, Finance produces the strongest and most
trustworthy causal claims Maculis can make.

## A.3 Dependency and Resilience (Afhankelijkheid)

**The transition.** Seeing here is the most emotionally powerful of the three: the business grows, yet
almost every customer relationship routes through the owner personally, or two suppliers together
control the margin. Wanting to understand is instant, because it touches the owner's own future and the
value of what they built. Wanting to act is also instant in feeling, but the action is a structural
change, not a quick lever, and that gap between the strength of the desire and the difficulty of the
action is the defining feature of this candidate's bridge.

**What travels with the handoff.** The evidence combines two sources: financial concentration (customer
or supplier share across periods, the same hard ledger data Finance uses) and owner dependency (who is
on every thread, drawn from Relationship Intelligence, meaning the Communication Layer's own record of
who handles each relationship). The relation is often a `CONTRADICTION` (growth up, resilience down) or a
`TELLING_ABSENCE` (no relationship exists that does not route through the owner). The hypothesis is
bounded: if you were away for a period, the revenue would go with you. The relationship context is the
richest of the three candidates, because this lens literally reads and writes Relationship Intelligence.

**Enough to hand off, versus needs more evidence first.** Maculis has seen enough to reveal when
concentration and owner-thread share both cross their thresholds at L3 or higher and the owner
recognises the fragility. But enough to reveal is not enough to hand off eagerly. This is the candidate
where the reveal lands hard and the action is a months-long or years-long programme, so premature or
pushy handoff feels like being told to restructure your life the same afternoon. The bias should be
toward sitting with the recognition and toward a gentle, optional, owner-led handoff. Maculis should
wait for the owner to ask "what could I do about it" before proposing anything.

**Avoiding the sales button.** This candidate carries the highest sales-button risk precisely because
the emotional charge makes any pitch feel manipulative. The guard is to never lead with action. Let the
recognition breathe, let the owner ask, and only then offer to explore together, in small and reversible
steps, with no urgency.

**Example handoff (hypothetical, Dutch, house style).**

> "Je herkende dat bijna elke klantrelatie via jou loopt. Dat is geen probleem dat je vanmiddag
> oplost, en dat hoeft ook niet. Als je er ooit iets mee wilt, kunnen we het klein maken: we kiezen een
> paar relaties uit die iemand anders zou kunnen overnemen, en na een tijd kijken we samen of die
> klanten inderdaad niet meer alleen bij jou uitkomen. Geen haast. Zeg maar wanneer, of niet."

**How the measured result flows back.** The outcome metric is genuinely hard and re-measurable: run the
lens again next period and see whether the owner-thread share and the customer concentration fell. So
the measurement side is quantifiable, better than Reputation's sampled reviews. The problem is the
intervention side. Reducing owner dependency is a diffuse, slow, heavily confounded change, not a single
crisp lever. Level 5 causal claims here are the slowest and least clean of the three, and honesty
demands that most Dependency results stay at level 4 (a confirmed relationship, "we handed off these
relationships and the concentration fell") rather than a tight causal claim. When a result does flow
back, it is a high value confirmed memory, because it is about the owner's own role in the business.

---

# PART B. Relationship Intelligence

## B.0 What actually deserves memory

The taxonomy the brief asks for maps cleanly onto the shipped memory model. For each item type below,
the default is stated once, then specialised per candidate.

- **Event** (lens viewed, reveal shown, recognition captured, deepening chosen, data uploaded,
  experiment started or finished). Always recorded as activity, via `recordActivity`. Never promoted to
  a memory fact by itself. Events are the audit trail, not the relationship picture.
- **Observation** (a grounded statement with provenance). Stays in the engine trace. An observation is
  not a relationship fact and is not promoted to memory on its own. This is where the auto-found
  technical signals live, and where the great majority of them should stay.
- **Temporary hypothesis** (what a relation might mean). At most a proposed memory (`source='ai'`,
  `confidence='proposed'`), visible as a suggestion, structurally barred from model context until a human
  confirms. Never written as fact.
- **User recognition** (`recognition = yes`). The single most valuable signal Maculis produces. A
  recognised reveal is a strong candidate for a confirmed memory. One recognised reveal is worth more
  than twenty auto-found technical signals, because it is the owner telling Maculis which relationship
  actually matters to them.
- **Rejected interpretation** (`recognition = no`, or a dismissed proposal). Recorded as superseded, and
  kept. A rejection is knowledge: it tells Maculis not to resurface this reading and that this owner sees
  it differently.
- **Confirmed memory** (human approved). The only thing the Context Engine reads back as fact. Per
  candidate below, this is almost always a recognised relationship plus, where relevant, the owner's
  confirmation of intent behind it.
- **Follow-up** (an owed next step). Lives in `follow_up`, not in memory. Revisit reviews next quarter,
  upload the next period, re-measure after an experiment.
- **Next-lens interest** (which lens the owner leaned toward next). A soft signal that informs
  sequencing. A proposed interest at most, promoted only if it recurs or is confirmed.

The governing sentence, repeated because it is the whole point: the AI may never write speculation as
fact. It proposes; recognition confirms.

## B.1 Reputation and Reception

**What deserves memory.** One thing, mostly: the recognised promise-experience gap, including which
named strength it concerns. A confirmed memory reads like "owner claims persoonlijke aandacht as the
core strength, public reception emphasises snelheid and prijs, owner recognised this gap on this date."
That single confirmed relationship is worth more than the entire pile of outside-in technical signals the
lens also gathered (HSTS, certificate validity, schema completeness, title length), which stay as
observations and context and should almost never become memory. They are true, obvious, and not about
the relationship.

**What stays out of memory.** The review aggregate number, the security header reads, the identity
match. These refresh and are re-derivable. Memorising them would be memorising evidence, not
relationship knowledge.

**Rejected interpretations that are worth keeping.** If the owner says "no, the reviews just have not
caught up with how we work now," that is a valuable rejected interpretation: the owner disputes that the
public reception reflects the current business. Recorded as superseded, it stops Maculis re-asserting the
gap and flags that the owner reads their own reception charitably.

**Follow-up and next-lens interest.** A natural follow-up is to revisit review theme drift in a quarter.
A promise gap often opens interest in the actual customer experience and, downstream, in the finance
side, so a soft next-lens interest toward Finance is a reasonable proposed signal.

**Honest limit.** Most Reputation evidence is about the public surface of the business, not about the
relationship with a person or an organisation. So it enriches the customer picture the least of the
three. It produces one strong confirmed memory and then does not compound as richly.

## B.2 Finance via Bring Your Data

**What deserves memory.** Two things, and the second is the gold. First, the recognised flagship
relation (revenue up cash down, or concentration rising). Second, and more valuable, the owner's
confirmation of intent behind it. "Owner confirms the concentration in customer X is a deliberate
strategic bet and accepts the risk" is a durable confirmed memory that can only come from a human and
that changes how every future reveal about that customer is read. The intent confirmation is pure
relationship knowledge: no ledger can produce it.

**What stays out of memory.** The ratios themselves. Days sales outstanding, gross margin percent, the
cash figure. These are observations that refresh every period. Do not memorise the number, memorise the
confirmed relationship and the confirmed intent.

**Rejected interpretations that are worth keeping.** "No, that debtor lag is a one-off from a single
late client" is a valuable rejection: it tells Maculis the pattern is not structural in this owner's
eyes, and it should not be resurfaced as a standing relation without new evidence.

**Follow-up and next-lens interest.** Upload the next period. Re-measure after a collections experiment.
A confirmed concentration naturally opens interest in the Dependency and Resilience lens, a strong and
well grounded next-lens interest.

**Why it is rich.** Financial confirmations are hard, durable, and decision-shaping, and the intent
confirmations are things only the human can give. Finance produces confirmed memories that stay true and
that reshape future readings.

## B.3 Dependency and Resilience

**What deserves memory.** The recognised fragility and its shape, and which parts of it the owner accepts
versus wants to change. "Owner recognises that nearly all client relationships route through them
personally" is arguably the single most valuable confirmed memory Maculis can hold about an owner,
because it is about the owner's own role and the transferability of what they built. Alongside it: "owner
accepts the supplier concentration as a price for quality" or "owner wants to reduce personal
dependency over the next year" are durable, decision-shaping confirmed memories.

**The compounding property.** This candidate is unique in that it both reads and writes Relationship
Intelligence. It consumes the owner-thread data the Communication Layer already holds (who is on every
relationship) and writes back the confirmed structural picture. The loop feeds itself, which is exactly
why the masterplan sequences it as Lens 4, after the relationship data exists.

**Rejected interpretations that are worth keeping.** "No, my partner covers half of those relationships"
is a high value rejection: it corrects the owner-thread inference at the source and improves every future
Dependency reading. A rejection here does real work.

**Follow-up and next-lens interest.** Re-run the lens next period to re-measure concentration and
owner-thread share. Interest tends to flow toward transferability and business value, the emotional core
of this lens.

**Why it is the richest.** The reveals are the most personal, and the confirmations reshape the whole
customer and owner picture rather than a single metric. A recognised owner-in-the-middle reveal is worth
far more than any number of auto-found technical signals, and this lens produces exactly those
recognitions.

---

# PART C. Comparison and ranking

The brief asks for two rankings and gives explicit permission to conclude that Reputation is not the
strongest, if the evidence says so. The evidence says so on both axes.

## C.1 Ranking by strength of the GrowBrain bridge

A GrowBrain bridge is only as strong as the intervene-and-measure loop it can offer, because a level 5
causal claim is the only new thing GrowBrain creates. Judged on the crispness of the intervention, the
speed and cleanliness of the measurement, and the owner's pull to act:

1. **Finance (Kasbeeld). Clearly strongest.** Many crisp levers (collections, pricing, cost, mix,
   concentration), each with a hard baseline, a single changed variable, a short measurement window, and
   a hard re-measurable outcome from the same upload path. It produces the cleanest level 5 causal claims
   Maculis can make, and the pull to act is the highest because cash is survival.
2. **Reputation and Reception (Buitenkant). Middle.** The intervention is clean, cheap, and fast (make
   the real strength provable), but the measurement is slow, sampled, and confounded (review themes
   trickle, the Places sample is small, enquiry quality is soft). The loop is the easiest to start and the
   hardest to close, so most experiments land at level 4, not level 5.
3. **Dependency and Resilience (Afhankelijkheid). Weakest on this specific axis, despite the strongest
   desire to act.** The outcome metric is hard and re-measurable, but the intervention is a diffuse,
   slow, heavily confounded structural programme, not a single lever. In the specific GrowBrain sense of
   producing a clean causal claim within a practical window, it is the weakest, even though the owner's
   emotional pull to act is the highest of the three. This split, highest motivation and weakest
   experimental loop, is the non-obvious finding of this workstream.

## C.2 Ranking by richness of Relationship Intelligence produced

Judged on the value, durability, and compounding of the confirmed memories each candidate produces:

1. **Dependency and Resilience. Richest.** It both reads and writes Relationship Intelligence, and its
   recognised reveals are the most personal and the most decision-shaping (owner dependency,
   transferability, the value of what the owner built). Its confirmed memories reshape the whole owner
   picture, and its rejections correct the relationship data at the source.
2. **Finance. Strong second.** It produces hard, durable confirmed memories, and the intent confirmations
   (is the concentration deliberate) are things only the human can give and that change every future
   reading. Slightly behind Dependency only because it is about the business's numbers rather than the
   owner's own role.
3. **Reputation and Reception. Thinnest.** It produces one strong confirmed memory (the recognised
   promise-experience gap) and then does not compound, because most of its evidence is about the public
   surface of the business, not about the relationship. It is genuinely the least rich of the three on
   this axis.

## C.3 The honest conclusion

On the two axes this workstream owns, GrowBrain bridge strength and Relationship Intelligence richness,
Reputation and Reception is the weakest of the three candidates. Finance dominates the GrowBrain axis.
Dependency and Resilience dominates the Relationship Intelligence axis. Reputation ranks second on the
first axis and third on the second, and leads on neither.

This is not an argument against Reputation as Lens 2. The prioritisation model (`03-prioritization-
model.md`) already ranks it first overall at 85.2, and it wins that ranking on feasibility, zero-
integration value, time to first value, low risk, and learning value, not on GrowBrain or Relationship
Intelligence. The two findings are consistent: Reputation is the right lens to build second because it is
cheap, fast, low-risk, and proves cross-lens reveals with public data, and it is deliberately not the
lens with the strongest action loop or the richest relationship memory. Those strengths belong to Finance
and to Dependency and Resilience, which is exactly why the roadmap places them as Lens 3 and Lens 4, once
the trust curve and the relationship data that they depend on have been built.

The sequencing implication for these two axes specifically: expect Reputation to seed the relationship
(the first recognised gap, the first taste of the action loop), expect Finance to be where the GrowBrain
loop first pays off in clean causal claims, and expect Dependency and Resilience to be where Relationship
Intelligence finally compounds. Do not over-invest in a Reputation GrowBrain experience early, because
its loop rarely closes to level 5. Invest the GrowBrain build effort where the loop is cleanest, which is
Finance.
