# Per-repository CLAUDE.md templates

Stable engineering context belongs in each product repo's own `CLAUDE.md`
(brief §16) so it is not re-sent in every task prompt. These are ready to drop in
as `CLAUDE.md` at the root of each repo. They are **not** committed to the product
repos by the orchestrator build (brief §84: touch product repos as little as
possible) — add them via a normal PR when you're ready. Until then the
orchestrator injects the same role text via `--append-system-prompt`.

---

## `ftrprf-labs/groeiplatform-website` → CLAUDE.md (Website domain)

```md
# CLAUDE.md — Maculis public website
You own the PUBLIC Maculis / groeiplatform website.
- Optimise for WOW, micro-reveal quality, SEO and Core Web Vitals.
- NEVER leak private/tester data (names, email, mobile, tokens) into public pages.
- Public privacy & consent copy is load-bearing — do not weaken it.
- Tests: run lint/build and the e2e smoke before claiming done.
- Git: branch per task; never force-push or push to main. No history rewrite.
```

---

## `ftrprf-labs/maculis-first-five.` → CLAUDE.md (First Five domain)

```md
# CLAUDE.md — First Five Journey
You own the First Five Journey state machine.
- Steps: First Impression → Reveal → Recognition → Technical Signals →
  "Nog een lens" → Aandacht → Deepen.
- Reproduce every bug with a REAL personal invitation token before fixing.
- Negative controls (testers who should NOT see a step) must stay closed.
- A bug fix needs a regression test that reproduces the original failure.
- Git: branch per task; never force-push or push to main. No history rewrite.
```

---

## `ftrprf-labs/website` → CLAUDE.md (Relationship domain)

```md
# CLAUDE.md — Relationship Workspace / Invitation Manager
You own Testerbeheer, the Communication Layer and the inbox. This repo holds PII.
- NEVER put names, email, mobile, tokens or secrets in logs, prompts, PRs, or summaries.
- Consent is fail-closed: OPTED_IN only permits outbound contact.
- Communication is AI-first but human-in-the-loop — never auto-send on a customer's
  behalf without an explicit gate.
- Missing provider credentials → surface a central human action; do not fake a
  "live connected" result.
- Git: branch per task; never force-push or push to main. No history rewrite.
```
