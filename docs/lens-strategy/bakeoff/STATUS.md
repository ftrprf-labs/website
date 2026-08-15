# Status: BAKE-OFF DONE / IMPLEMENTATION PARKED PENDING REAL PILOT EVIDENCE

Recorded 2026-08-15. This is the durable, authoritative status of the Lens 2 work. It supersedes any
implication elsewhere that a Lens 2 build is scheduled. Read it before doing anything with the lens
bake-off artifacts.

## Decision

The Lens 2 Prototype Bake-off is accepted as a completed research and prototype phase. All commits and
artifacts are preserved. No production implementation of any lens starts now.

The bake-off gives enough evidence to KEEP Reputation and Reception as the provisional strongest Lens 2
candidate, but not enough to make that choice final. The measured results show Reputation wins mainly on
zero friction and engine compatibility, while Finance scores stronger on evidence strength and
false-positive risk. The deciding variable, real recognition and WOW with entrepreneurs, cannot be proven
synthetically. That is a stated limitation of the bake-off, not a detail.

## Standing positions

1. Reputation and Reception: provisional Lens 2 candidate.
2. Finance (Bring Your Data): retained as a strong next candidate.
3. Dependency and Resilience: retained for later.
4. None of the three is built to production readiness now.

## What is parked

- No production implementation of Reputation and Reception (or any lens).
- No new Epic.
- No new features.
- No production code.

This holds until the owner explicitly instructs otherwise. Do not restart this workstream, design further,
or write production code on the strength of this bake-off alone.

## The lead we are preserving (do not rebuild, do not extend)

- The runnable harness and the faithful engine port (`lens-bakeoff/`).
- The 14 synthetic fixtures and the false-positive controls learned from them (legal-suffix-normalised
  identity matching, minimum review-base threshold, non-adjacent theme matching).
- The engine-compatibility finding (Finance and Dependency need a relation-family extension plus a numeric
  gate policy; Reputation is config-only). See `01-reveal-engine-compatibility.md`.
- The evaluation model and the Reveal Gallery.

## The one thing that sharpens this choice, and where it comes from

The deciding evidence is real owner recognition, not more design. Use the upcoming genuine First Five
pilot to collect recognition data (ja, voor een deel, nee, and especially confirmed-new: "no, I had not
seen that") that can sharpen or overturn the provisional choice. This is data collection within an
existing pilot, not a new build. If and when the owner decides to move, the head-to-head confirmed-new
recognition measurement (Reputation flagship versus a Finance Bring Your Data flagship, same owners) is
the gate defined in `00-bakeoff-report.md` section 5.

## Next step

None, by instruction. This workstream is stopped. Reopen only on an explicit owner instruction.
