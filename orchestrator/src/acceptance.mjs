// Acceptance criteria + verification (brief §27, §30, §35).
//
// "The agent said done" is NEVER the same as COMPLETED. This module (1) derives
// minimal, testable acceptance criteria when the request doesn't state them, and
// (2) verifies a parsed agent result against what the task actually required —
// tests run, e2e where required, deploy verified live — before COMPLETED is ever
// allowed.

// Derive minimal acceptance criteria from the request when none are given.
// Deliberately small — no inventing huge requirements for a small bug (brief §27).
export function deriveAcceptance(request, routing) {
  const text = String(request).toLowerCase();

  // The brief's worked example: "HEMA toont Nog een lens niet".
  if (/hema/.test(text) && /(nog een lens|lens)/.test(text)) {
    return [
      'Fresh HEMA tester with a real personal invitation reaches Recognition = "Ja".',
      '"Nog een lens" becomes visible after "Herken je dit → Ja".',
      'Negative control (a tester who should NOT see it) stays closed.',
      'Regression test added that reproduces the original failure.',
    ];
  }
  if (/micro[\s-]?reveal/.test(text)) {
    return [
      'Reproduce the reported micro-reveal failure on the named page/domain.',
      'Root cause identified.',
      'Micro reveal renders correctly after the fix.',
      'Regression/E2E test covers the fixed behaviour.',
    ];
  }
  if (/whatsapp/.test(text)) {
    return [
      'WhatsApp channel wired into the Communication Layer for the named customer.',
      'Inbound + outbound path implemented (or clearly stubbed where a provider credential is missing).',
      'Consent gate (OPTED_IN only) enforced before any outbound message.',
      'Missing external credentials surfaced as a central human action, not silently skipped.',
    ];
  }

  const type = routing.task_type;
  if (type === 'bug') {
    return ['Reproduce the reported failure.', 'Identify root cause.', 'Fix verified.', 'Regression test added.'];
  }
  if (type === 'analysis') {
    return ['Investigate and report findings with evidence from the actual code/state.'];
  }
  return ['Implement a working vertical slice of the request.', 'Tests cover the new behaviour.'];
}

// Verify a parsed result against the task. Returns { accepted, missing[], reasons[] }.
export function verifyAcceptance(task, result) {
  const missing = [];
  const reasons = [];

  // 1. The agent must actually report success, not just "done".
  if (!result || result.status === 'failed' || result.status === 'error') {
    missing.push('agent-success');
    reasons.push('Agent did not report a successful outcome.');
  }

  // 2. Required checks must have RUN and PASSED (brief §30).
  const ranByName = new Map((result?.tests || []).map((t) => [String(t.name).toLowerCase(), t]));
  for (const check of task.required_checks || []) {
    const t = ranByName.get(check.toLowerCase());
    if (!t) { missing.push(`check:${check}`); reasons.push(`Required check "${check}" was not run.`); }
    else if (t.passed === false) { missing.push(`check-failed:${check}`); reasons.push(`Required check "${check}" failed.`); }
  }

  // 3. Bug tasks need a regression test; e2e-required tasks need e2e, not only unit.
  if (task.task_type === 'bug' && !hasCheck(result, 'regression') && !hasCheck(result, 'e2e')) {
    missing.push('regression-test');
    reasons.push('Bug fix has no regression/e2e test proving the failure is gone.');
  }
  if ((task.required_checks || []).includes('e2e') && !hasCheck(result, 'e2e')) {
    missing.push('e2e');
    reasons.push('E2E was required but only unit/other checks were run.');
  }

  // 4. Delivery evidence when the task implies delivery.
  if ((task.tests_required || task.deploy_required) && !result?.commit && !result?.pr) {
    // analysis tasks are exempt from delivery evidence
    if (task.task_type !== 'analysis') {
      missing.push('delivery-evidence');
      reasons.push('No commit or PR reference — nothing was actually delivered.');
    }
  }

  // 5. Deploy-required tasks must be LIVE-verified (brief §35).
  if (task.deploy_required) {
    if (!result?.deployment) { missing.push('deploy'); reasons.push('Deploy required but no deployment reported.'); }
    else if (!result?.live_verification || result.live_verification.ok !== true) {
      missing.push('live-verification');
      reasons.push('Deploy reported but live verification of the real URL did not pass.');
    }
  }

  // 6. Outstanding human actions block full completion.
  if (result?.human_actions && result.human_actions.length) {
    missing.push('human-action');
    reasons.push('Task depends on a human action that is not yet done.');
  }

  return { accepted: missing.length === 0, missing, reasons };
}

function hasCheck(result, name) {
  return (result?.tests || []).some((t) => String(t.name).toLowerCase() === name && t.passed !== false);
}
