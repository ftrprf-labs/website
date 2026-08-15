# Lens 2 Bake-off: The Moment of Revelation (Wow and UX)

> Companion to `00-masterplan.md` (sections 3, 12 to 18 on wow, seduction, and presentation, and the
> candidate definitions in section 5) and `01-lens-architecture.md` (section 6 on beats and
> progressive disclosure).
>
> Scope. This document designs the MOMENT OF REVELATION for the three bake-off candidates. It does not
> design the intelligence (the detectors, the evidence adapters, the ratios). It assumes the frozen
> Reveal Engine unchanged: evidence to observations to relations to candidates to gate to reveal or
> silence to recognition. It answers one question for each candidate: when Maculis has something worth
> saying, how does saying it feel like a revelation rather than a report.
>
> House rule respected throughout: no stylistic hyphens or dashes in any visible copy or in the prose.
> Pauses are periods, commas, and colons. All example reveals are labelled EXAMPLE COPY / HYPOTHETICAL
> and state relationships and questions only. No reveal asserts cause and no reveal gives advice.

---

## 1. Why this document exists

The pilot proved the hard lesson in code and in testers: a correct analysis is not automatically a
special experience. First Five stacked First Impression, Story of the Site, and Observations on one
screen, and the feeling shifted from "Maculis shows me something" to "Maculis makes me read a report"
(`/workspace/maculis-first-five./docs/ux-observations-next-round.md`). The intelligence was right. The
revelation died anyway.

The bake-off is therefore not a contest of which lens is smartest. All three can be made correct. The
contest is which lens can turn a correct finding into a moment an owner feels, and which one is most
at risk of collapsing back into a dashboard. This document designs that moment for each candidate and
then judges them against each other on the moment alone.

The three candidates:

1. Reputation and Reception. Outside-in cross-lens. Your brand promise placed next to how the public
   actually receives you.
2. Finance via Bring Your Data. One upload. Relationships between figures you track separately: revenue
   versus cash, concentration versus risk, margin drift.
3. Dependency and Resilience. A hidden vulnerability assembled from several loose data sources: growth
   that quietly routes everything through a single point of failure.

---

## 2. The shared revelation contract (what all three inherit)

Before the per-candidate designs, the invariants every candidate must honour. These are not negotiable
per lens. They come from the frozen engine and the architecture and they are the reason a Maculis
moment is not a dashboard tile.

### 2.1 Beats, not pages

The platform renders one beat at a time. A lens declares its beats and never dumps its trace on first
contact (`01-lens-architecture.md`, section 6). The canonical beat sequence:

- Beat 1, the wow. One discovery. The grounded observation and the tension, nothing competing for
  attention.
- Beat 2, the evidence. One consistent "waar zie je dat" affordance. Proof stays proof, it never
  becomes the product.
- Beat 3, the meaning and the question. Why it touches a decision, and the invitation to go one step
  deeper or to add one piece of context.
- Beat 4 and beyond, deepening on demand. Pulled by the owner, never pushed.

### 2.2 The four questions

Every surfaced reveal answers, in order: wat zie ik (the grounded observation with a verbatim quote or
exact figure and its source), waarom is dat opmerkelijk (the tension, one sentence), waarom doet dat
ertoe (the decision it touches, phrased as a question the owner recognises, never as advice), and wat
zou ik nu willen begrijpen (the seam to deepening). A candidate that cannot fill all four from grounded
evidence stays silent.

### 2.3 One reveal, and silence is a success

The selector surfaces at most one reveal per run, by family priority then significance then cross-lens.
SILENCE is a designed, valued outcome. For every candidate below, the silence screen is designed with
the same care as the reveal screen, because a lens that always finds something is a slot machine, not a
lens. The most important test for each candidate is not "does it reveal," it is "does it stay silent
when it should."

### 2.4 No cause, no advice, the relation ladder

Reveals live at ladder levels 1 to 4: correlation, temporal sequence, plausible hypothesis phrased as a
question, or a confirmed relationship on recognition. Level 5, a causal claim, never comes from
observation and is handed to GrowBrain only after a recognised reveal. The `defensible` gate check
forbids causal and recommendation language, so this is enforced, not merely intended.

### 2.5 Recognition is the point

Every reveal ends in a recognition capture: ja, voor een deel, nee. A "nee, dit had ik niet zo gezien"
becomes confirmed_new and is the single most valuable event Maculis produces. The recognition moment is
designed per candidate below, because how you ask changes what you learn.

---

## 3. Candidate 1: Reputation and Reception

The promise versus reception gap. Your own words on one surface, the public's words on another, and the
distance between them.

### 3.1 Timing

Zero login, zero upload. The owner gives a website address and Maculis looks. This is the only candidate
whose moment can arrive on first contact with no cost paid by the owner, which is its structural gift and
its structural trap. The gift: no friction stands between the owner and the wow. The trap: with public
review data and security scans one query away, the pull toward a scan report is strong.

The pacing must resist instant delivery. A revelation needs a beat of anticipation. The sequence in time:
a short "ik heb je site gelezen" moment (the promise is heard), then a short "ik heb geluisterd naar hoe
je ontvangen wordt" moment (the reception is heard), then the collision. Roughly ten to twenty seconds of
felt looking, not a spinner theatre, but enough that the gap lands as something Maculis found, not
something it looked up.

### 3.2 Progressive disclosure and beats

- Beat 1. The gap, as one sentence pair. Your claimed strength on one side, the public signal on the
  other.
- Beat 2. The evidence. The verbatim line from your site, and the verbatim theme from the public
  surface, each with its source. This is where the promise quote and the reception quote sit side by
  side.
- Beat 3. The meaning and the question. Why a promise the public does not echo matters, and an invitation
  to see the words the public does use.
- Beat 4 and beyond, on demand. Findability, identity consistency, trust and security signals, each a
  separate beat, pulled one at a time. Never a reputation report card.

### 3.3 Example reveal screens

EXAMPLE COPY / HYPOTHETICAL. Illustrative wording only. No real business, no real reviews.

Screen A, the theme gap:

> Je site noemt persoonlijke aandacht je grootste kracht.
> Je publieke reviews gaan vooral over snelheid en prijs. Aandacht wordt er bijna nooit in genoemd.
> De kracht die je claimt, is niet de kracht die je klanten opschrijven.

Screen B, old and hard to find:

> Je bestaat al vijftien jaar en je wordt goed beoordeeld.
> Voor wie je nog niet kent, ben je bijna onvindbaar.
> Je bent sterk bij wie je al kent, en stil bij wie je nog moet vinden.

Screen C, a fractured identity:

> Op je site heet je bedrijf net anders dan in het handelsregister, en je Google-profiel noemt weer een
> ander adres.
> Voor jou is dit één bedrijf. Voor wie je opzoekt, zijn het drie sporen die niet samenkomen.

Each screen is one gap. The next beat is a question, never a list.

### 3.4 Visual tension

Two surfaces, two voices. Your words versus their words. The natural visual is a split with the owner's
promise on one side and the public reception on the other, and the tension living in the space between
them. The promise side is warm and first-person, the reception side is quieter and quoted. The wow is
the collision of two voices that never normally meet on one screen. No charts, no gauges, no rating dial.

### 3.5 Use of silence

When the promise and the reception agree, there is no reveal, and the screen says so honestly:

EXAMPLE COPY / HYPOTHETICAL:

> Je belooft aandacht. Je klanten schrijven ook over aandacht.
> Hier zie ik geen kloof tussen wat je zegt en hoe je ontvangen wordt. Dat is op zichzelf iets waard.

This silence is not an empty result. It confirms the promise holds, which is a genuine finding, and it
proves the lens is not manufacturing gaps to justify itself.

### 3.6 Contrast

Two contrasts carry this lens. The obvious one is promise versus reception. The quieter one is confidence:
the promise is read from the owner's full site (solid), while the reception is a small public sample, often
five reviews via the Places aggregate. Copy therefore says "wat je publieke reviews laten zien," never
"wat je klanten vinden." The contrast is honest precisely because it does not overclaim the reception side.

### 3.7 One reveal versus multiple

One gap. The lens selects the single strongest cross-surface contradiction and surfaces only that.
Findability, identity, and trust are deepening beats, available but never stacked. The moment stacking
begins, this becomes the reputation report the pilot warned against.

### 3.8 What we deliberately do not show yet

- No aggregate star rating as a headline. A number invites a scorecard reading and turns a gap into a grade.
- No full review list. The themes are evidence for one gap, not a feed to browse.
- No SEO metrics panel, no security header table, no competitor comparison bars on first contact.
- No advice. Not "verzamel meer reviews," not "verbeter je vindbaarheid." The reveal names a gap and asks a
  question. The closing of the gap is a later, owner-chosen GrowBrain step.
- No second gap while the first is still on screen.

### 3.9 Recognition capture

After the meaning beat:

EXAMPLE COPY / HYPOTHETICAL:

> Herken je deze kloof?
> Ja. Voor een deel. Nee, zo had ik het niet gezien.

A "nee" here is the prize: the owner has just learned that the world receives a different strength than
the one they lead with. That is confirmed_new. A "voor een deel" often means the owner knew the reception
but had not connected it to their own promise, which is still a reveal about the pairing.

### 3.10 Transition to deepening

On ja or voor een deel, offer exactly one next step, phrased as curiosity, not as a menu:

EXAMPLE COPY / HYPOTHETICAL:

> Wil je de precieze woorden zien die je klanten wél gebruiken?

That opens Beat 2 detail or an adjacent surface, one at a time. Only after a recognised gap does a
GrowBrain handoff appear, and it carries the grounded relation, not a recommendation, so making the real
strength visible stays the owner's choice.

---

## 4. Candidate 2: Finance via Bring Your Data

Two figures you track separately, placed in a relationship you had not made. Revenue up while cash falls.
One customer quietly becoming a third of the business. Margin slipping under rising revenue.

### 4.1 Timing

This is the only candidate that asks the owner to pay a cost before the moment: an upload, and the trust
it takes to hand over financial data. Everything about the timing must honour that the owner has already
invested. The upload and validation are a calm, functional step, not a reveal and not a celebration. Then
a short "ik heb je cijfers gelezen" beat. Then one relationship.

The danger unique to this candidate is what happens in the seconds right after the parse. The owner just
handed Maculis a spreadsheet, and the gravitational pull is to hand the spreadsheet back, prettier, as a
summary. That is the dashboard, and it is fatal here. The moment must be worth the upload precisely because
it shows the owner something the spreadsheet did not: a relationship between two of its own numbers.

### 4.2 Progressive disclosure and beats

- Beat 0. Upload, mapping, safe preview, validation. Functional and minimal. This is not a reveal and must
  not look like one. Reuse the shipped importer pattern.
- Beat 1. The wow. One relationship. Two figures in tension, one sentence.
- Beat 2. The evidence. The two exact figures, each period, and their source line in the uploaded file.
  This is "waar zie je dat" for finance: the ledger reference, not a chart.
- Beat 3. The meaning and the question. Why the relationship touches a decision, phrased as a question.
- Beat 4 and beyond, on demand. Which customers, which cost lines, which periods. The contributing detail,
  pulled by the owner.

### 4.3 Example reveal screens

EXAMPLE COPY / HYPOTHETICAL. Figures are placeholders. No real ledger.

Screen A, revenue up while cash falls:

> Je omzet groeide dit jaar.
> Je vrij beschikbare kas daalde in diezelfde periode.
> Twee cijfers die je apart bijhoudt, bewegen tegengesteld.

Screen B, concentration rising with growth:

> Vorig jaar was je grootste klant ongeveer een vijfde van je omzet. Dit jaar ruim een derde.
> Je groei en je risico komen nu uit dezelfde bron.

Screen C, margin drift under rising revenue:

> Je omzet steeg.
> Je brutomarge zakte in dezelfde periode.
> Je verkoopt meer, en per verkoop houd je er minder aan over.

Each states a relationship. None states a cause. Screen A does not say the debtors are to blame. The
debtor days may appear later, on deepening, as a further grounded observation phrased as a question, never
as a verdict on first contact.

### 4.4 Visual tension

Two numbers moving in opposite directions. The honest image is two values in opposition, not a wall of
tiles. If a mark is used at all, it is a single restrained pair (two small lines, or two values with
opposing direction), sized as proof under the sentence, never as the hero. The hero is the sentence. The
figures are its evidence. If the reader's eye lands on a chart before the sentence, the beat has already
become a dashboard.

### 4.5 Use of silence

The finance silence screen is the most important silence in the whole bake-off, because the owner paid an
upload to get here:

EXAMPLE COPY / HYPOTHETICAL:

> Ik heb je cijfers gelezen.
> De relaties die ik controleer, bewegen samen. Je omzet, je kas en je marge lopen in dezelfde richting.
> Ik heb hier geen verrassing voor je. Dat is ook een uitkomst.

This returns real value (a coherence confirmation across the relations that matter) without inventing a
reveal and without becoming a report. A finance lens that can say "nothing surprising, and here is the
honest reason" after an upload is more trustworthy than one that always finds a problem.

### 4.6 Contrast

The signature contrast is between what the top-line feels like and what the relationship shows. Revenue up
feels like health. The reveal shows a second figure that the top-line was hiding. The tension is that both
numbers are the owner's own, both are correct, and only their relationship is new.

### 4.7 One reveal versus multiple

Strictest discipline of the three. Finance carries eight or more candidate relations (revenue versus cash,
concentration, margin drift, personnel versus revenue, and so on). The selector surfaces exactly one, the
strongest gate-passer. The rest are deepening or silence. Showing three relations at once is not three
times the wow, it is a ratio table, which is the exact dashboard this lens exists to avoid.

### 4.8 What we deliberately do not show yet

- No P&L or balance shown back. The uploaded figures are evidence for one relationship, not content to
  redisplay.
- No ratio table, no KPI row, no health score, no gauge.
- No benchmark as a headline. Sector context may sit inside a reveal later, never as the opening act.
- No second or third relationship on first contact.
- No advice. Not "chase your debtors," not "raise your prices," not "diversify." The reveal names the
  relationship and asks a question. Action is a later, owner-chosen GrowBrain step.

### 4.9 Recognition capture

After the meaning beat, the standard capture, with a finance-specific nuance in the "voor een deel" path,
because a relationship can be seen yet unexamined:

EXAMPLE COPY / HYPOTHETICAL:

> Herken je dit verband?
> Ja. Voor een deel, ik zag het ene cijfer maar niet dit verband. Nee, zo had ik het niet bekeken.

The intent question (was the concentration deliberate) belongs to deepening, not to the recognition tap.
Recognition captures whether the owner saw the relationship. Intent is the first deepening question after
a ja.

### 4.10 Transition to deepening

Finance has the strongest GrowBrain handoffs of any lens, which makes restraint here even more important.
On ja, one curiosity-led step:

EXAMPLE COPY / HYPOTHETICAL:

> Wil je zien waar het verschil vastzit?

That opens the contributing detail (which customers, which cost lines) one beat at a time. GrowBrain
(collections, pricing, mix) appears only after a recognised reveal and carries the grounded relation, not
a recommendation. It must never feel like a sell button bolted under every number.

---

## 5. Candidate 3: Dependency and Resilience

Growth that quietly increases fragility. The business grows while everything routes through one customer,
one supplier, or the owner. A hidden vulnerability assembled from several loose sources.

### 5.1 Timing

This candidate has the longest and softest evidence chain: finance figures, invoice-level data, and
relationship signals combined. Its moment cannot arrive on first contact the way Reputation can, and it
cannot arrive from a single upload the way Finance can. It arrives after Maculis has assembled a pattern
from sources that individually say little.

Timing here is also emotional, not only technical. The reveal touches the owner personally, their future,
and the value of what they built. You cannot open cold with "if you disappear, the business goes with
you." The pacing must earn the right to say it: first the growth is acknowledged (a true, warm signal),
then the pattern is shown, then the meaning is offered gently and as a question. The tension is real and
must not be softened into meaninglessness, but the delivery is careful, because a wrong or blunt reveal
here does more damage than in either other lens.

### 5.2 Progressive disclosure and beats

- Beat 1. The pattern. Growth on one side, a single point of convergence on the other, in one sentence
  pair.
- Beat 2. The evidence. The combined signals, shown honestly as combined: the concentration figure, the
  relationship pattern, each with its source. This is where "several loose sources" become one visible
  shape.
- Beat 3. The meaning and the question. Why a business resting on one point is harder to transfer and more
  fragile, phrased as a question, never as a warning or a prescription.
- Beat 4 and beyond, on demand. Where the dependency is strongest, and the transferability picture, pulled
  by the owner only if they lean in.

### 5.3 Example reveal screens

EXAMPLE COPY / HYPOTHETICAL. Illustrative only. No real relationships, no real invoices.

Screen A, the owner in the middle:

> Je omzet groeit.
> In bijna elke klantrelatie die ik kan zien, ben jij de enige vaste contactpersoon.
> Je groei en je onmisbaarheid groeien samen.

Screen B, supplier concentration:

> Twee leveranciers leveren samen het grootste deel van wat je inkoopt.
> Je marge beweegt mee met de voorwaarden van twee partijen.

Screen C, where the value sits:

> Veel van wat je bedrijf waardevol maakt, leeft in jouw contacten en jouw kennis.
> Op papier staat er een bedrijf. In de praktijk loopt het meeste via jou.

Screen C is the most powerful and the most dangerous. It surfaces only when grounded at the evidence
floor, never as an assertion about the owner's character. It states where the signals point, and it asks.

### 5.4 Visual tension

Convergence. The honest image is many lines routing into a single node: customers, suppliers, or threads
all funneling to one point, the owner. That single image carries the entire tension of the lens, because
concentration is literally convergence to a point. It is a strong, non-dashboard visual precisely because
it is one shape, not a panel of risk meters.

### 5.5 Use of silence

Silence must be the most common outcome of this lens, by design. When the dependencies are distributed,
Maculis says so and stops:

EXAMPLE COPY / HYPOTHETICAL:

> Je bedrijf leunt niet op één punt dat ik kan vinden.
> Je klanten, je leveranciers en je contacten zijn verdeeld. Dat is een vorm van veerkracht.

Because the evidence is soft and combined, the gate should push more of these runs to silence than in the
other two lenses. A dependency lens that finds a vulnerability every time is not a lens, it is a fear
generator, and it will be dismissed exactly when it is right.

### 5.6 Contrast

The signature contrast of the whole bake-off lives here: the thing that looks like success is the same
thing that is the risk. Growth, being central, being needed, all read as winning. The reveal shows they
are also the fragility. Growth increases dependence. That single inversion is the most emotionally
powerful contrast Maculis can draw, which is exactly why it must be drawn carefully and rarely.

### 5.7 One reveal versus multiple

One point of failure, the strongest. Multiple dependency warnings on one screen is a risk console, and a
risk console produces fear and paralysis, not recognition. The lens names the single most concentrated
point and stops.

### 5.8 What we deliberately do not show yet

- No resilience score, no risk index, no traffic-light panel.
- No ranked list of every vulnerability. That is the fear console.
- No business valuation number, and no quantified catastrophe. Not "if this customer leaves you lose X."
  Predicting the size of the disaster is both ungrounded and cruel.
- No advice. Not "hire a number two," not "document your processes," not "reduce concentration." The reveal
  names the pattern and asks a question.
- No second dependency while the first is on screen.

### 5.9 Recognition capture

Recognition here is emotionally loaded, and the capture must be non-judgmental:

EXAMPLE COPY / HYPOTHETICAL:

> Herken je dit?
> Ja. Voor een deel. Nee, zo voelt het voor mij niet.

A "nee" is not a failure of the lens. Owners may resist a reveal about their own indispensability, and the
resistance is itself valuable data. The capture must make "nee" feel safe to choose, because a coerced
"ja" teaches Maculis nothing.

### 5.10 Transition to deepening

The most delicate transition of the three. After a genuine ja, the next step is understanding, not a
pitch:

EXAMPLE COPY / HYPOTHETICAL:

> Wil je zien waar dit het sterkst speelt?

Deepening shows where the convergence is tightest, one beat at a time. A GrowBrain handoff toward
transferability appears only if the owner leans in, and it must never read as "and now buy our resilience
package." The emotional weight that makes this lens powerful is the same weight that makes a premature sell
feel like a betrayal.

---

## 6. Which wow is structurally strongest, and where each collapses

Three different kinds of strength, and they do not rank the same way.

### 6.1 Reputation and Reception: strongest wow as a first moment

Its wow is two-sided, verbatim, and needs no scaffolding. Your words collide with the public's words. It
requires no number literacy, no upload, no login, and the contrast is self-evident the instant it is on
screen. The gate can clear on a single undeniable cross-surface gap. Of the three, it is the most likely to
actually produce a felt revelation on first contact rather than a report, because the moment is legible to
anyone and costs the owner nothing to reach.

Its weakness is the thinness of the reception side. Five public reviews is a sample, so the reveal must be
modest in confidence and honest in phrasing. That modesty caps the ceiling of the wow: it is a real
surprise, rarely a gut-punch.

Where it collapses into a dashboard: the moment it leads with the aggregate star rating as a headline,
lists the reviews, or adds an SEO panel, a security scorecard, and competitor bars. The collapse trigger is
turning one gap into a reputation report card.

### 6.2 Finance: strongest wow as payload, most endangered

Its wow rests on hard signals. The two figures are born at L3 or L4, the relationship is undeniable
arithmetic, and "je omzet groeide, je kas kromp" is a genuine gut-punch that maps perfectly onto a single
beat: two figures in tension is one sentence. On raw revelatory force, this is the strongest moment in the
bake-off.

But it is the most structurally endangered. It has upload friction before the moment, and it has the
heaviest dashboard gravity of any candidate, because the owner just handed over a spreadsheet and every
instinct says to show it back. Its wow is strong only for as long as the presentation discipline holds. The
day someone adds "just a small summary of what we imported," the wow is gone.

Where it collapses into a dashboard: instantly, if it shows the P&L back, a ratio table, a KPI row, a
health score, or more than one relationship. This is the highest-gravity collapse of the three and needs
the strictest guardrails.

### 6.3 Dependency and Resilience: strongest wow as meaning, softest to produce

Its wow is the deepest, because it touches the owner personally and the future, and it carries the single
most powerful contrast available to Maculis: growth is fragility, success is the risk. When it lands, no
other lens lands as hard.

But it has the softest and longest evidence chain, the highest false-positive and offense risk, and it
depends on the finance and relationship data the other lenses build first. Its wow is the most powerful
when honest and the most damaging when wrong. It is also the one most in need of a high silence rate.

Where it collapses into a dashboard: into a risk console, the moment it shows a resilience index, a ranked
vulnerability list, or a quantified catastrophe. That collapse is worse than the others, because a
dependency dashboard does not just bore the owner, it frightens them, and fear is dismissed faster than
boredom.

### 6.4 The judgement

For the bake-off question, the moment of revelation on its own terms, the answer is layered rather than a
single winner:

- The structurally strongest wow as a repeatable first-contact moment is Reputation and Reception. It is
  the safest bet to produce a genuine revelation rather than a report, because the contrast is two-sided
  and verbatim, it needs no numeracy and no upload, and its failure mode (a modest surprise) is gentle. It
  is the lowest-risk wow and the one that best preserves the zero-integration magic.

- The strongest wow as pure payload is Finance. On revelatory force it wins outright, and it carries the
  clearest onward value. But its wow survives only under discipline that the other two need less, so it is
  the strongest moment that is also the easiest to lose.

- The strongest wow as meaning is Dependency and Resilience. It has the highest ceiling and the highest
  risk, and it is not a first-contact lens. It is the moment to build once the evidence and the trust from
  the other two exist.

The recommendation for the bake-off: lead with Reputation and Reception, because it most reliably delivers
a felt revelation at the lowest risk and cost, and because a first win here builds the trust the other two
moments need. Treat Finance as the highest-value moment to protect with the strictest anti-dashboard
guardrails, and treat Dependency as the deepest moment to earn last, where silence is the feature and a
wrong reveal is the real risk.

---

## 7. The shared anti-dashboard test

For each candidate, the same question decides whether the moment survived: on the first screen, does one
grounded discovery dominate, or do several signals compete. If the eye can graze, it is a dashboard. If the
eye is led through one discovery, it is a revelation. The three collapse triggers, kept visible so the
build resists them:

- Reputation collapses when the gap becomes a report card.
- Finance collapses when the relationship becomes a ratio table.
- Dependency collapses when the pattern becomes a risk console.

The frozen engine already gives the tools to hold the line: one reveal per run, silence as a first-class
outcome, provenance under every claim, and recognition as the measure of whether the moment landed. The
UX job is only to keep faith with them, one beat at a time.
