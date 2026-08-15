# MAC-115 — GrowBrain bridges & the Relationship Flywheel

EPIC-2 WS-8 (MAC-115) — analysis/read-only. No product code changed.

> Builds on `next-lenses/research/02-relationship-intelligence-layer.md` (copilot ->
> `ai_draft` -> human; lens as evidence-bound signal producer) and
> `05-data-strategy-architecture.md` (`lens_signal` table: evidence/source/model;
> consent OPTED_IN fail-closed; tenant isolation; no PII in signals). Everything here
> is a product/strategy contract *over that existing machinery*, not new subsystems.

---

## 0. The one rule that governs this whole document

A lens discovers something **evidence-bound**. That discovery creates curiosity or
tension. GrowBrain — the deeper Maculis product — is offered as the honest answer to
"do you want to understand *why* this is happening, and what you can do about it?".

The bridge is legitimate **only when all three hold**:

1. The lens actually fired on real evidence (`lens_signal.evidence[]` is non-empty).
   No evidence -> no discovery -> no bridge. Fail-closed (`02 §4`, `05 §2.2`).
2. GrowBrain would genuinely add explanation the lens cannot give. If GrowBrain would
   only *restate* the lens finding with a price tag, that is an **upsell, not a next
   step** — and this document flags it as such every time it occurs.
3. The handoff carries only data the subject consented to (`consent_status = OPTED_IN`)
   and every carried datum keeps its `source`/`evidence` provenance. A handoff that
   would strip provenance or move data past its consent basis is **rejected here**,
   not softened.

The mechanical shape is always the same as the copilot's existing output
(`copilot.mjs` -> `ai_draft`): GrowBrain entry is a **`suggested_action` of type
`propose_growbrain`**, landing in `ai_draft` for a human to accept, edit, or discard.
It is never an auto-advance and never an auto-send (`provider.mjs:8`, `outbound.mjs:7`).

---

## 1. GrowBrain bridge per top lens

Each bridge declares six things:

- **Trigger** — the exact `lens_signal` (label + evidence) that opens the door.
- **Transition** — how curiosity/tension is created *honestly* (the finding is real,
  the question is genuine, declining is free).
- **GrowBrain context** — what GrowBrain receives to be useful.
- **First concrete step** — the single next thing GrowBrain does, not a menu.
- **Carried forward** — the precise fields that cross the boundary (nothing else).
- **Consent + provenance** — how both survive the handoff.
- **Creep / upsell flag** — the honest failure mode and its stop.

### 1.1 First Five lens -> GrowBrain

- **Trigger.** First Five journey produces a grounded observation, e.g. Clarity of
  Promise fired `notable`: "above the fold does not state what you do" with an
  `evidence` locator (rendered hero region + excerpt, PII-scrubbed — `01 §2 Lens A`).
- **Transition.** The Reveal already showed the tester the finding and *where* to see
  it themselves. Curiosity is intrinsic: they've just verified a gap with their own
  eyes. The honest question is "you can see the gap — do you want to understand why
  visitors bounce here and what to change first?" GrowBrain is the *why/what-next*,
  the lens was only the *what*. Declining ends the offer with no re-prompt (`01 §3.4`).
- **GrowBrain context handed over.** The observation `label`, its `evidence` ref (so
  GrowBrain can re-cite the same hero region, never re-fetch blind), the lens `id`,
  and the subject id (`contact`/`organization`) — no tester PII, no First Five answer
  text beyond the cited excerpt.
- **First concrete step.** GrowBrain opens *one* diagnostic thread anchored to that
  evidence: "here is the hero visitors read first; here are two plain-language
  rewrites and the reasoning". Not a full audit, not a plan — one anchored move.
- **Carried forward (exact).** `lens_signal.id`, `subject_type`, `subject_id`, `lens`,
  `label`, `evidence[]`, `source`, `model`. That is the whole payload. Names/emails
  stay in `contact`, referenced by id (`05 §3`).
- **Consent + provenance.** First Five's consent basis is the tester submitting their
  own subject for testing (`01 §3.4`) — that basis covers *reading and explaining the
  subject*, which is exactly what GrowBrain continues. It does **not** cover any
  outreach. Provenance survives because GrowBrain receives `evidence[]` + `source` and
  is contractually barred from making any claim it cannot re-cite to that evidence.
- **Creep / upsell flag.** Low risk. The failure mode is GrowBrain arriving *before*
  the tester has absorbed the finding, which reads as "we found a problem, pay us".
  **Stop:** the `propose_growbrain` action is only eligible once the Reveal for that
  observation has actually rendered to the tester (offer follows verification, never
  precedes it).

### 1.2 Finance lens -> GrowBrain

- **Trigger.** A Finance lens signal grounded in *first-party, consented* data the
  tenant already holds — e.g. an intent/journey aggregate showing quote-to-close
  friction, or a tenant-supplied metric. Evidence = the message/event/artefact rows,
  never external enrichment (`05 §5` — external enrichment is a DPA-gated HUMAN ACTION,
  out of scope).
- **Transition.** Tension here is real money: "quotes are opened but not accepted".
  The honest framing is "the lens can see *that* it stalls; GrowBrain can help you
  understand *where* and test a change". The tension must be stated as an observation,
  never as fear ("you're losing revenue!"). Precision over recall: if the lens is not
  confident, it abstains and no bridge appears (`05 §4`).
- **GrowBrain context.** The aggregate `label` + the `evidence[]` that drove it (which
  conversations/steps), the confidence, and subject id. No amounts or client identities
  copied into the signal — GrowBrain reads them live from the consented source, keyed
  by id, at the moment of use.
- **First concrete step.** GrowBrain frames one testable hypothesis tied to the
  evidence ("acceptance drops after step 3 in these threads; try X") — a diagnosis,
  not a subscription page.
- **Carried forward (exact).** Same eight `lens_signal` fields as §1.1. Financial
  values are **not** carried; they are re-read live under the same consent, so the
  handoff payload stays PII/amount-free (`05 §3`).
- **Consent + provenance.** Gate is hard: any Finance insight that would drive
  *outreach* (chasing a client) requires `consent_status = OPTED_IN` on that contact,
  fail-closed (`02 §3.5`, `05 §2.4`). Internal *analysis* for the tenant's own business
  is permitted on first-party data; the boundary GrowBrain must respect is
  analyse-for-owner vs. contact-the-client. Provenance rides on `evidence[]` + `source`.
- **Creep / upsell flag.** **Highest upsell risk of the five.** Finance tension maps
  most directly onto "give us money to fix your money", so a GrowBrain framed as
  "unlock revenue insights" *is* an upsell wearing a lens costume. **Stop:** the bridge
  is only honest if GrowBrain's first step delivers a concrete, evidence-cited
  diagnosis *for free at the point of curiosity*; the paid depth comes after value is
  shown, never as the price of seeing the finding at all. If it can't do that, don't
  build the bridge — send the finding alone.

### 1.3 Marketing lens -> GrowBrain

- **Trigger.** A Marketing-facing lens signal from the public surface — e.g. Clarity of
  Promise + Name/Identity Consistency both fired, or a share-preview gap (`01 Lens A/B`,
  and the OG-preview facet of Lens E). Evidence = the exact rendered regions / head
  tags cited.
- **Transition.** Curiosity, not tension: "your homepage says one thing, your footer
  another — visitors get mixed messages". The honest hook is "the lens sees the
  inconsistency; GrowBrain can help you decide the *one* message and roll it out".
  Framed as clarity, never as shame.
- **GrowBrain context.** The set of related observation `label`s + their `evidence[]`
  (both conflicting locations for Name/Identity), lens ids, subject id.
- **First concrete step.** GrowBrain proposes a single canonical message drafted from
  the *evidence already gathered*, showing both current variants side by side — a
  decision aid, not a campaign.
- **Carried forward (exact).** The `lens_signal` field set for each contributing
  signal (they may be multiple rows sharing a `subject_id`). Nothing beyond the cited
  excerpts leaves the subject's own public surface — no enrichment (`01 §3.3`).
- **Consent + provenance.** Public-surface reading basis (same as First Five). Any step
  that becomes *outreach to the market's contacts* re-enters the consent gate. Every
  proposed message must re-cite the two source locations (provenance preserved).
- **Creep / upsell flag.** Medium. The creep risk is scope-inflation: a homepage
  wording gap "helpfully" expanding into "let us run your marketing". **Stop:** keep
  GrowBrain's first step bounded to the *same subject and same evidence* the lens saw;
  it may not pull in new channels or audiences to manufacture a bigger problem.

### 1.4 Reputation / Findability lens -> GrowBrain

- **Trigger.** Findability Basics fired (`01 Lens E`): missing meta description, no
  social share preview, or no sitemap/robots — each a present/absent *fact* with the
  exact tag or file cited. Evidence = the document head / `robots.txt` / `/sitemap.xml`.
- **Transition.** "Links you share show no preview card; the site is hard to find and
  hard to share." Curiosity is concrete and self-verifiable. Honest question: "want to
  understand which of these actually affects being found, and fix the highest-impact
  one first?" GrowBrain adds prioritisation the lens deliberately does not (the lens
  only reports present/absent facts, no ranking).
- **GrowBrain context.** The present/absent fact `label`s + `evidence[]` (which tags/
  files), subject id. This lens is objective and PII-free by construction, so the
  payload is clean.
- **First concrete step.** GrowBrain orders the facts by real findability impact and
  hands the single highest-impact fix with the exact tag to add — grounded in the
  cited evidence.
- **Carried forward (exact).** The `lens_signal` fields for each fact row. All evidence
  is public technical metadata; no personal data involved.
- **Consent + provenance.** Same public-surface basis. "Reputation" must **not** drift
  into scraping review platforms or people-databases about the business's owners —
  that is enrichment, DPA-gated, out of scope (`01 §3.3`, `05 §5`). Provenance = the
  cited tag/file per fact.
- **Creep / upsell flag.** Low on the Findability facts themselves. **The creep line is
  the word "Reputation".** If the bridge quietly expands from *findability facts on the
  subject's own site* into *what other people say about them online*, it crosses from
  helpful into surveillance. **Stop:** this bridge is contractually limited to
  first-party findability signals; any third-party reputation data is a separate,
  consent-and-DPA-gated product decision and is rejected as a silent handoff.

### 1.5 Surprising lens -> GrowBrain: Accessibility First Pass

Chosen as the "surprising" fifth because accessibility rarely gets framed as a growth
lens, yet it has the *cleanest* honest bridge and the *lowest* creep risk — which makes
it the best proof that the flywheel can be genuinely helpful rather than extractive.

- **Trigger.** Accessibility First Pass fired (`01 Lens F`): e.g. "four main-content
  images have no alt text", each citing the specific element. Zero-interpretation,
  near-zero false-positive checks only.
- **Transition.** Framed as *care*, never compliance-shaming (`01 §2 Lens F`): "some
  visitors — screen-reader users, people on slow connections — can't use these images.
  Want to understand who's affected and fix it?" The tension is other people's
  exclusion, which is motivating without being manipulative.
- **GrowBrain context.** The element-level `label`s + `evidence[]` (which elements),
  subject id.
- **First concrete step.** GrowBrain explains *what each missing alt text costs which
  user*, and drafts alt text for the four cited images — a fix, not a lecture.
- **Carried forward (exact).** The per-element `lens_signal` fields. No user data of any
  kind — accessibility checks read markup, not people.
- **Consent + provenance.** Public-surface basis; every drafted fix re-cites its
  element. Cleanest consent posture of all five.
- **Creep / upsell flag.** Lowest. The only failure mode is turning care into
  compliance-fear ("you could be sued"). **Stop:** copy stays in the register of help,
  and GrowBrain's first step must deliver a real fix for free, or the "care" framing is
  dishonest.

### 1.6 Bridge summary

| Lens | Tension type | Upsell risk | Creep risk | Hard stop |
|---|---|---|---|---|
| First Five | curiosity (self-verified gap) | Low | Low | offer only after Reveal renders |
| Finance | money (real) | **High** | Med | free evidence-cited diagnosis first, or no bridge |
| Marketing | clarity | Med | Med | bounded to same subject + same evidence |
| Reputation/Findability | concrete fact | Low | **Med** (the word "Reputation") | first-party findability only; no third-party reputation |
| Accessibility (surprising) | others' exclusion | Low | Low | real free fix, help-register copy |

---

## 2. The Relationship Flywheel

Eight hops. Each is grounded in the copilot -> `ai_draft` -> human machinery and the
`lens_signal` evidence/provenance model, and each hop makes Maculis *slightly smarter*
by leaving behind a durable, auditable, consented trace.

**Hop 1 — Lens.** A lens runs against a subject on real inputs and, only if evidence
exists, writes a `lens_signal` row (`label`, `evidence[]`, `source`, `model`,
`confidence`; `05 §3`). No evidence -> no row (fail-closed). *Smarter:* the row is the
first durable, explainable fact about this relationship.

**Hop 2 — Insight.** The signal is turned into a human-facing suggestion in `ai_draft`
(`copilot.mjs` shape: `summary`, `intent`, `suggested_actions[]`) — never shown as a
raw score, always with its evidence attached (`02 §2`). *Smarter:* the raw signal
becomes a legible insight, still fully traced to its evidence.

**Hop 3 — Conversation.** A **human** reads the insight and decides. The AI copilot may
draft a reply (`ai_draft.suggested_reply`) but the AI never sends (`outbound.mjs:7`).
Any outbound step is consent-gated: `OPTED_IN` or it fails closed and the send option is
never offered (`02 §3.5`). *Smarter:* the human's accept/edit/discard is itself signal
about which insights are worth acting on.

**Hop 4 — Relationship memory.** The interaction is recorded as append-only history +
`audit_event` (`store.mjs:41`, comm `audit.mjs`). History is **evidence, never control**
— it explains, it does not silently change status or consent. Memory inherits the
12-month retention and PII-free discipline (`05 §2.5`). *Smarter:* the relationship now
has a reproducible track record: what fired, what the human did, why.

**Hop 5 — Next lens.** The `next_lens_fit` lens reads the conversation + memory and
suggests which *additional* lens is appropriate — the formalised backing for the
existing `propose_next_lens` action (`02 §1`, `provider.mjs:63`). It is an offer in
`ai_draft`, human-gated, never an auto-advance. *Smarter:* lens selection becomes
context-aware instead of a fixed menu — but only from consented, evidence-bound memory.

**Hop 6 — GrowBrain.** When a fired lens creates genuine curiosity/tension, the
`propose_growbrain` action lands in `ai_draft` (§1). GrowBrain receives only the eight
`lens_signal` fields, keeps provenance, and delivers one evidence-cited next step.
*Smarter:* the relationship deepens from "what" to "why", with the evidence trail intact.

**Hop 7 — New insight.** GrowBrain's diagnosis, once acted on, produces new
observable events (the hero changed; acceptance moved; alt text added). Those events are
new evidence -> new `lens_signal` rows -> back to Hop 2. *Smarter:* the loop closes on
*measured outcomes*, so Maculis learns which suggestions actually worked, per tenant.

**Hop 8 — Pass the Lens.** A human, seeing value, shares a lens with someone else
(a colleague, a peer business). "Pass the Lens" is a **human-initiated share**, and the
shared lens carries its *contract* (what it observes, its evidence model, its
fail-closed default) but **not** the originating relationship's memory or PII. The
recipient starts a fresh, separately-consented subject. *Smarter:* the *catalogue*
spreads and improves from aggregate, de-identified fires; the *relationship data* does
not travel. This is the growth loop that is safe by construction.

**How the flywheel compounds.** Every hop writes an evidence-bound, provenance-carrying,
consent-scoped trace. Two things get smarter over time: (a) **the catalogue** — which
lenses fire usefully, which next-lens suggestions humans accept, which GrowBrain steps
produce measured outcomes (Hop 7) — learned from aggregate, de-identified signal; and
(b) **each relationship** — a reproducible memory that makes the *next* suggestion
better-targeted. Crucially, (a) never requires exporting (b): the loop improves from
patterns, not from pooling anyone's PII.

---

## 3. Creepiness guardrails

The flywheel's power is exactly what makes it dangerous: it remembers, it connects, it
suggests. The test at **every hop** is: **"would this feel like a friend, or a stalker?"**
A friend remembers what you told them and brings it up helpfully; a stalker knows things
you never shared and surfaces them to unsettle or pressure you. The difference is
always **consent + provenance + evidence** — the three things this architecture already
enforces. Below, per concern, and per hop.

### 3.1 What memory is kept

- Append-only interaction history and `audit_event` (Hop 4), tenant-scoped, 12-month
  retention, PII referenced by id — never copied into signals or logs (`05 §2.5, §3`).
- `lens_signal` rows: `label` + `evidence[]` + `source` + `model` + `confidence`.
  Evidence is a *reference* (message id, event, artefact hash + timestamp), not a
  hoarded copy of content.
- The human's accept/edit/discard decisions on `ai_draft` (what was found useful).

That is the whole memory. It is a **record of interactions the person participated in**,
not a dossier assembled about them.

### 3.2 What is never inferred or surfaced

- **No profiling of individuals.** No lens cross-references a person against external
  people-databases, social graphs, or data brokers (`01 §3.3`). Enrichment is
  DPA-gated and treated as likely out of scope for a consent-fail-closed product
  (`02 §6`, `05 §5`).
- **No inference across the evidence gap.** Lenses report what is present, never what
  its absence "means" about someone ("no contact page" is a fact; "they don't care
  about customers" is forbidden — `01 §3.1`).
- **No opaque scores.** Relationship temperature is explainable (which messages/events
  drove it) or it is not shown (`02 §3`). No number that a person can't trace to
  evidence.
- **No secret sensitivity inference.** Nothing about health, finances-of-individuals,
  politics, or protected traits is ever derived or stored. If a lens would need to
  infer it, the lens is not built.
- **No surfacing of data the person didn't share with this tenant.** Tenant isolation
  is a hard boundary (`05 §2.6`); memory from one relationship never appears in another,
  and Pass-the-Lens (Hop 8) carries the contract, not the memory.

### 3.3 Consent boundaries

- **Fail-closed everywhere.** Unknown consent = not-contactable; `OPTED_IN` is required
  before any signal informs *outreach* (`02 §4`, `05 §2.4`). The send option is not
  merely disabled — it is **not offered** when consent is absent.
- **Analysis vs. outreach is the bright line.** Reading a subject's own public surface,
  or a tenant analysing its own first-party data, is permitted under the submission/
  first-party basis. *Contacting a person* always re-enters the `OPTED_IN` gate. Every
  bridge in §1 respects this line explicitly.
- **Consent is provenanced.** Lawful basis, method, version, and source are recorded
  (`store.mjs:83-93`); a consent state with no provenance is treated as no consent.
- **Right to erasure cascades.** Deleting a relationship cascades its `lens_signal`
  rows (`05 §3`); memory cannot outlive the record it observed.

### 3.4 The reject list (handoffs this document refuses)

These are not "risks to manage" — they are handoffs to **reject outright**:

1. Any handoff carrying a datum with **no `source`** — provenance-less data is treated
   as fabricated (`05 §2.3`), never passed.
2. Any handoff moving data **past its consent basis** — e.g. public-surface findings
   repurposed to justify outreach without `OPTED_IN`.
3. Any GrowBrain context that includes **PII copied into the signal** rather than
   referenced by id (`05 §3`).
4. Any **cross-tenant** carry (`05 §2.6`).
5. Any **enrichment** join (external people/company data) without a DPA + lawful basis
   sign-off (HUMAN ACTION — `02 §6`, `05 §5`).

### 3.5 The friend-or-stalker test, per hop

| Hop | Friend version (ship) | Stalker version (forbidden) | Enforcement |
|---|---|---|---|
| 1 Lens | "I noticed X on your site, here's where" | "I found X about you elsewhere" | evidence[] must ref the subject's own consented surface |
| 2 Insight | shows the finding + its evidence | shows an opaque score/verdict | no signal without evidence; no raw scores (`02 §3`) |
| 3 Conversation | human sends, having chosen to | AI auto-sends "based on your profile" | AI never sends; `OPTED_IN` gate (`outbound.mjs:7`) |
| 4 Memory | remembers what you discussed | builds a dossier from what you didn't | append-only, PII by-ref, retention (`05 §2.5`) |
| 5 Next lens | "want to also look at Y?" — declinable | keeps re-offering after a no | offer in `ai_draft`, no re-prompt (`01 §3.4`) |
| 6 GrowBrain | "want to understand *why*?" | "pay to unlock what we're hiding" | free evidence-cited first step; else it's an upsell (§1) |
| 7 New insight | learns from what actually worked | tracks behaviour to pressure | new evidence = new consented events only |
| 8 Pass the Lens | shares a tool | shares *you* | contract travels, memory/PII never do |

### 3.6 The honest upsell warning

The single most likely place the flywheel tips from helpful to manipulative is **Hop 6
on the Finance lens** (§1.2). Money-tension is the easiest to monetise and the easiest
to weaponise into fear. The rule that keeps it honest is uncomfortable but necessary:
**if GrowBrain cannot deliver real, evidence-cited value at the free point of curiosity,
the bridge should not exist** — ship the lens finding alone and let the person come to
GrowBrain on their own. A "natural next step" that is only reachable through a paywall at
the moment of discovered anxiety is not a next step. It is the exact dark pattern the
First Five principles forbid (`01 §3.4`: no dark patterns, declining is first-class).

---

## 4. Human actions (parked, non-blocking to this research)

- **Canonical relationship id** across the JSON tester store and Postgres comm store,
  so a First Five subject and a Relationship-Workspace contact are the same key for a
  handoff (`02 §6`, `05 §8`). Owner decision.
- **GrowBrain data-processing scope**: confirm GrowBrain runs under the same tenant
  isolation, retention, and PII-by-reference discipline as `lens_signal`, and processes
  only carried `evidence[]` refs — not a fresh crawl or an enrichment join. Engineer +
  privacy sign-off.
- **Finance-lens value proof**: product owner must confirm GrowBrain's free first step
  for the Finance bridge (§1.2) actually delivers cited value, or the bridge is dropped.
- **Any third-party "reputation" data** (review platforms, people-databases): explicit
  DPA + lawful-basis + EU-residency review before it is even prototyped (`05 §5`).

---

*End of MAC-115. Read-only product/strategy design; no product code changed.*
