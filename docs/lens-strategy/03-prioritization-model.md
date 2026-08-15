# Maculis Lens Prioritisation Model

> Companion to the Lens Strategy Masterplan (`00-masterplan.md`). Purpose: an explicit, weighted,
> reproducible scoring model that answers which lens Maculis builds second, third, and fourth, and
> which lenses to hold back. The model is a decision aid, not an oracle. Every score is a judgement
> and is stated so it can be challenged. Scores are grounded in the current architecture (frozen
> Reveal Engine, existing outside-in pipeline) and the research artifacts in `research/`.

---

## 1. Scoring criteria and weights

Eighteen criteria in four clusters, weights summing to 100. For the criteria written as a risk or a
cost (complexity, implementation time, privacy risk, security risk), a high score means favourable
(low complexity, short time, low risk), so that a higher total is always better.

| # | Criterion | Cluster | Weight |
|---|-----------|---------|-------:|
| V1 | Ondernemerswaarde (value to the owner) | Value | 8 |
| V2 | Revealworthiness (can it clear the gate with real insight) | Value | 8 |
| V3 | Onderscheidend vermogen (differentiation vs market) | Value | 7 |
| V4 | Wow potentieel (first-contact recognition/surprise) | Value | 6 |
| V5 | Cross-lens waarde (relationships across functions) | Value | 6 |
| V6 | Commerciële relevantie (willingness to pay) | Value | 5 |
| F1 | Zero-integration waarde (value before any account) | Feasibility | 6 |
| F2 | Beschikbare evidence (is the evidence obtainable) | Feasibility | 6 |
| F3 | Time to first value | Feasibility | 5 |
| F4 | Technische eenvoud (low complexity) | Feasibility | 5 |
| F5 | API-beschikbaarheid (access without hard gates) | Feasibility | 4 |
| F6 | Implementatietijd (short) | Feasibility | 4 |
| F7 | Doelgroepbereik (how many owners it applies to) | Feasibility | 5 |
| R1 | Privacy-veiligheid (low privacy risk) | Risk | 5 |
| R2 | Security-veiligheid (low security risk) | Risk | 5 |
| S1 | GrowBrain-verbinding (natural handoff to action) | Strategy | 4 |
| S2 | Leerwaarde voor Maculis (what the platform learns) | Strategy | 5 |
| S3 | Recurrent gebruik (repeat use, not one-off) | Strategy | 6 |

Cluster totals: Value 40, Feasibility 35, Risk 10, Strategy 15. Maximum raw score 500, normalised to
100.

The weighting choice encodes a strategy: value and differentiation lead (40), but feasibility is
heavy (35) because Maculis is post-pilot and must ship trustworthy lenses fast, and because the
zero-integration-first principle is core to the product. Risk is deliberately only 10, since the
architecture already enforces privacy and security by design; it breaks ties, it does not dominate.

---

## 2. Candidates scored

Scores are 1 (poor) to 5 (excellent), each a stated judgement. Five serious contenders are scored at
the criterion level; also-rans are treated compactly in section 4.

Candidates:
- A. Deepen Lens 1: enrich the current website lens with staged evidence families (technical,
  security, accessibility, SEO, structured data). A parallel enrichment track, not a standalone lens.
- B. Reputation and Reception Lens: outside-in, cross-lens. How the outside world receives the
  business. Website promise against public reviews, findability, and trust signals.
- C. Finance Lens (Bring Your Data): upload P&L, balance, aged receivables/payables, bank export.
  Reveals cash against profit, customer concentration, margin drift.
- D. Dependency and Resilience Lens: customer and supplier concentration, owner dependency,
  transferability and business value.
- E. Marketing Connected Lens: GSC, GA4, GBP, Ads via OAuth.

| Criterion (weight) | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|
| V1 Ondernemerswaarde (8) | 3 | 4 | 5 | 5 | 4 |
| V2 Revealworthiness (8) | 3 | 4 | 5 | 5 | 4 |
| V3 Onderscheidend (7) | 3 | 4 | 5 | 5 | 3 |
| V4 Wow (6) | 3 | 4 | 5 | 4 | 4 |
| V5 Cross-lens (6) | 3 | 5 | 5 | 5 | 4 |
| V6 Commercieel (5) | 3 | 4 | 5 | 4 | 4 |
| F1 Zero-integration (6) | 5 | 5 | 2 | 2 | 2 |
| F2 Evidence (6) | 5 | 4 | 4 | 3 | 4 |
| F3 Time to first value (5) | 5 | 5 | 3 | 2 | 3 |
| F4 Tech eenvoud (5) | 5 | 4 | 3 | 3 | 3 |
| F5 API-toegang (4) | 5 | 4 | 3 | 3 | 3 |
| F6 Impl-tijd kort (4) | 5 | 4 | 3 | 2 | 3 |
| F7 Doelgroepbereik (5) | 5 | 5 | 4 | 3 | 4 |
| R1 Privacy-veiligheid (5) | 5 | 4 | 2 | 2 | 3 |
| R2 Security-veiligheid (5) | 5 | 5 | 2 | 2 | 3 |
| S1 GrowBrain (4) | 2 | 4 | 5 | 4 | 4 |
| S2 Leerwaarde (5) | 3 | 5 | 5 | 4 | 4 |
| S3 Recurrent (6) | 2 | 3 | 5 | 3 | 4 |
| Value subtotal (max 200) | 120 | 166 | 200 | 189 | 153 |
| Feasibility subtotal (max 175) | 175 | 156 | 110 | 90 | 110 |
| Risk subtotal (max 50) | 50 | 45 | 20 | 20 | 30 |
| Strategy subtotal (max 75) | 35 | 59 | 75 | 54 | 60 |
| Total (max 500) | 380 | 426 | 405 | 353 | 353 |
| Normalised (0 to 100) | 76.0 | 85.2 | 81.0 | 70.6 | 70.6 |

---

## 3. Ranking and the headline decision

1. Reputation and Reception Lens, 85.2
2. Finance Lens (Bring Your Data), 81.0
3. Deepen Lens 1 (parallel enrichment track), 76.0
4. Dependency and Resilience Lens, 70.6 (tie)
4. Marketing Connected Lens, 70.6 (tie)

The model produces a deliberately non-obvious result, and the tension between the top two is the whole
strategic decision.

Finance wins the value cluster outright (200 of 200): highest owner value, highest revealworthiness,
the clearest differentiation, the biggest wow, and the strongest willingness to pay. It is the moat
and the money. If the only question were "which lens matters most," Finance wins.

But Reputation and Reception scores higher overall because it preserves the property that makes
Maculis magical in the first place: zero integration first. It delivers a genuine cross-lens reveal
(your brand promises X, your customers experience Y) with public evidence, no login, low privacy and
security risk, fast time to first value, and it reuses the existing outside-in pipeline. It also has
the highest learning value per euro, because it proves cross-lens reveals cheaply before Maculis bets
on the expensive, sensitive Finance data path.

The recommendation, developed in the masterplan, follows the model:
- Deepen Lens 1 continuously, in parallel, starting now. It has the best feasibility profile and keeps
  the current lens fresh without becoming a report.
- Lens 2 is Reputation and Reception. It extends the zero-integration magic, proves cross-lens, and
  earns the trust that Finance will need.
- Lens 3 is Finance, entered at Bring Your Data. It is the highest-value destination and the
  strongest moat, but it must be reached after trust is built, not before.
- Lens 4 is Dependency and Resilience, because by then the Finance connector and Relationship
  Intelligence exist, which is exactly the evidence this lens needs. Marketing Connected is the
  alternative Lens 4 and can run as a parallel upgrade to Lens 2 rather than a separate headline.

This is the pushback the brief asked for. Finance is not Lens 2, despite being the most valuable lens,
because building it second would trade away the zero-integration trust curve and front-load the
product's highest privacy and security risk before the pilot has shown owners will hand over financial
data.

---

## 4. Also-rans and the anti-roadmap (scored compactly)

These are not scored at criterion level because they fail an earlier filter, but the model explains
why. Detail and the full argument are in the masterplan anti-roadmap.

- People / Productivity Lens (headcount vs revenue). Real value, but needs payroll/HR data (Nmbrs and
  similar), so near-zero zero-integration value, high friction, medium revealworthiness. Estimated
  mid-50s. Better delivered later as a facet of Dependency and Resilience, using the productivity
  ratio rather than a standalone HR lens.
- AI-Readiness / Data-Maturity Lens. Fashionable, but low revealworthiness (it tends toward a survey
  or a scorecard), weak hard evidence, and easily replicated by generic AI. Estimated low-50s. High
  risk of becoming cheap noise. Hold.
- Standalone Cybersecurity Audit Lens. The security signals are valuable, but as a standalone lens it
  competes with mature security-scanner tools, is tool-like rather than revelatory, and has low
  recurrent owner engagement. Estimated low. Fold the trust and security signals into the Reputation
  and Reception Lens instead, where they cross with the brand promise.
- Sustainability / ESG Lens. Data-poor for SMB, high effort, low current willingness to pay, and too
  early. Hold.
- Pricing and Margin Lens. Strong, but it is a facet of the Finance Lens, not a standalone product.
  Ship it inside Finance.

---

## 5. How to use and evolve this model

- Re-score after each pilot. Recognition rate (`recognition = no`, the confirmed-new signal) is the
  single best empirical input to V2 revealworthiness and V4 wow. Replace judgement with pilot evidence
  as it arrives.
- Re-weight deliberately, and record it. If the strategy shifts toward monetisation, raise V6 and S3.
  If it shifts toward defensibility, raise V3 and V5. A weight change is a decision and belongs in the
  decision log (see the Orchestrator Playbook).
- Never let feasibility alone crown a lens. Candidate A (deepen Lens 1) scores 76 purely on
  feasibility with modest value. The model correctly treats it as an enrichment track, not a headline
  lens. A lens that is easy and trivial is not a quick win; it is cheap noise (masterplan quick-wins
  section).
