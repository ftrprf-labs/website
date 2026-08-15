# Executable Lens Specification: Reputation and Reception

> Implemented by `reputation.mjs`. Runs on the shared engine (`../engine/engine.mjs`). Outside-in,
> Level 1. This spec is executable: every clause below maps to code that runs against the case-set.

- Entrepreneur question: how does the outside world receive my business, and does it match what I project.
- Available evidence (all public): website promise (reused First Five extraction, pre-extracted in the
  fixtures), public review aggregate (rating, count, recency, themes), identity across KVK and site and
  Google profile, findability footprint (domain age, indexed pages, non-branded impressions), trust and
  security signals (HTTPS, HSTS, headers, certificate).
- Observation types (`observe`): self_claim and self_emphasis (the promise), external_signal (review
  themes, findability), operational_fact (identity, trust). Confidence L1 to L4, hardest for identity and
  trust (deterministic), softest for review themes (small sample).
- Relation families (`relate`): CONTRADICTION (promise versus dominant review themes; identity mismatch
  between site and Google profile; trust signals versus a care or safety promise), TELLING_ABSENCE
  (claimed strength with no public corroboration; many reviews left unanswered while attention is the
  promise), ASYMMETRY (established and well rated but nearly invisible in non-branded search). ASYMMETRY
  is an extended family, admitted here only as a cross-lens relation.
- Candidate generation and wording: neutral, non-causal, two-sided (your words on one side, the public
  signal on the other). No advice, no cause.
- Confidence: relation confidence L3 for the reveal-worthy relations; the promise-reception relation is
  L3 only when a dominant opposing theme exists.
- Freshness: review recency and certificate expiry are time-sensitive; findability is slow-moving.
- Provenance: every observation carries a verbatim quote or an exact figure and a source surface
  (website, reviews, kvk, gbp, headers, rdap). The reveal can always answer waar zie je dat.
- Gate: the frozen gate unchanged. It correctly suppresses wallpaper claims on specificity (measured: 2
  suppressions on kwaliteit and vakmanschap) and single-external-source cross-lens reveals on
  defensible.
- Silence conditions: wallpaper-only promises, a promise the reviews already echo, fewer than five public
  reviews (theme reading unreliable), consistent identity, adequate trust signals. Measured silence rate
  43 percent (6 of 14), which is the discipline working.
- Revealworthiness: the gap must be specific (a named claimed strength, not sector wallpaper) and
  corroborated across at least two surfaces (site plus reviews, or site plus registry).
- Recognition: ja, voor een deel, nee. A nee ("I had not seen that") is the confirmed-new signal and the
  primary pilot metric.
- Meaningful End (candidate): "Dit is hoe de buitenwereld je nu ontvangt. De rest van dat beeld laat ik
  zien wanneer je verder wilt kijken."
- Next-lens trigger: a promise-reception gap invites the deeper look at what customers actually value,
  which is a natural bridge toward the Finance question of which work is worth most.
- GrowBrain bridge: make the real strength visible, then measure whether review themes and enquiry
  quality shift. A clean intervene-and-measure loop, though weaker than Finance's (workstream 04).
- Empirical profile (measured): reveal rate 57 percent, mean WOW 3.9, mean surprise 3.9, mean evidence
  strength 3.0 (lowest of the three), mean false-positive risk 2.9 (highest of the three). Config-only on
  the frozen engine (zero extended-family suppressions).
- Known false-positive modes caught by the bake-off: legal-entity name versus trade name (fixed by
  normalising legal suffixes and containment), thin theme-match on a small review base (de-vries). These
  become hard acceptance criteria for the production build.
