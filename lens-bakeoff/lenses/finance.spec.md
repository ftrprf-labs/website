# Executable Lens Specification: Finance (Bring Your Data)

> Implemented by `finance.mjs`. Runs on the shared engine. Level 2, no live bookkeeping connection.
> The smallest useful upload produces a surprising but defensible reveal. Not a dashboard.

- Entrepreneur question: is my business as financially healthy as the top-line makes it feel, and what
  relationship am I not seeing.
- Available evidence (smallest useful set): two comparable periods of P&L and balance (revenue, gross
  margin, net result, cash), an aged receivables figure, personnel cost, and a customer revenue split.
  All uploaded (CSV, XLSX, or a structured PDF), all hard signals born at L3 to L4.
- Observation types (`observe`): operational_fact only. Every observation is an exact figure with a
  file provenance (upload:pl, upload:balance, upload:aged-ar, upload:revenue-split).
- Relation families (`relate`): CONTRADICTION for revenue up while cash down (located in receivables) and
  for margin drift under growth. CONCENTRATION for a customer share rising materially over time.
  TREND_DIVERGENCE for personnel cost growing faster than revenue. CONCENTRATION and TREND_DIVERGENCE are
  extended families (see the compatibility finding).
- Candidate generation and wording: one relationship per reveal, always two figures in tension, never a
  statement dump and never the P&L back. Neutral and non-causal.
- Confidence: L4 for the ledger-based contradictions, L3 to L4 for the quantitative relations.
- Freshness: monthly to quarterly; the lens is naturally recurring.
- Provenance: exact figures and the uploaded file surface. Reproducible against the upload.
- Gate: the frozen gate unchanged. CONTRADICTION reveals pass (undeniable). CONCENTRATION and
  TREND_DIVERGENCE reveals are SUPPRESSED by the frozen gate on attention_worthy (measured: 4 candidate
  suppressions across the case-set, one flipping a whole case to silence). This is the central
  compatibility finding: Finance needs a relation-family extension and a numeric gate policy before it
  surfaces its best reveals natively.
- Silence conditions: aligned trends (a genuinely healthy company), a single period (INSUFFICIENT), no
  material divergence or concentration. Measured silence rate 71 percent, the most disciplined of the
  three, which is correct for a lens on sensitive data.
- Revealworthiness: the relation must rest on hard ledger signals and must not be something the owner
  already states. Materiality thresholds are explicit (for example a top-customer share rising at least 8
  points to at least 30 percent).
- Recognition: ja, voor een deel, nee. Finance is expected to have the highest confirmed-new rate; the
  bake-off cannot measure this and the pilot must.
- Meaningful End (candidate): "Dit is de ene relatie in je cijfers die ik je wilde laten zien. Wil je
  weten waar hij vandaan komt?"
- Next-lens trigger: a concentration reveal is the natural bridge to the Dependency and Resilience lens.
- GrowBrain bridge: the strongest of the three. Collections, pricing, cost mix, and concentration are
  clean intervene-and-measure experiments, and Finance is the only lens whose GrowBrain loop can reach a
  level-5 causal claim (workstream 04).
- Empirical profile (measured): reveal rate 21 percent, mean WOW 4.0, mean surprise 5.0 (highest), mean
  evidence strength 4.0, mean false-positive risk 1.0 (lowest and best), action relevance 5 (highest),
  repeatability 5 (highest).
- Friction and drag: needs an upload (time to first value 3, user data required 2) and carries the
  highest privacy and security weight (workstream 05). These, plus the engine extension, are why Finance
  is Lens 3, not Lens 2.
