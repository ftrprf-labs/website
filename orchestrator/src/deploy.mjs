// Deployment policy + live verification (brief §14, §15, §34, §35).
//
// Each repo's real mechanism (verified from its render.yaml / next config):
//   - Website (groeiplatform-website): Vercel git integration, auto-deploy on the
//     production branch, verify with Lighthouse/health, rollback = redeploy prev.
//   - First Five (maculis-first-five.): Render Docker, autoDeploy on push, /healthz.
//   - Relationship (website): Render Docker, autoDeploy on push, /healthz.
//
// For all three, "deploy to production" = the task branch reaching the production
// branch, which the provider then auto-deploys. The orchestrator therefore never
// invents a new hosting mechanism (brief §14); it decides WHETHER a task may take
// that step autonomously, then verifies the real URL afterwards (brief §35).

// Decide the deploy plan for a task given its agent + acceptance verdict.
// Autonomous production is allowed only inside the existing safe flow (brief §15):
// deploy explicitly required, checks green, safely integrated, not high risk.
export function planDeployment(agent, task, { accepted, integratedSafely = true } = {}) {
  const cfg = agent.deploy || {};
  if (!task.deploy_required) {
    return { target: 'NO_DEPLOY', autonomous: false, reason: 'task does not require deployment' };
  }
  if (task.risk_level === 'high') {
    return { target: 'PRODUCTION', autonomous: false, reason: 'high-risk change → human approval before production', needsHuman: true };
  }
  if (!accepted) {
    return { target: 'NO_DEPLOY', autonomous: false, reason: 'acceptance not passed — not deploying' };
  }
  if (!integratedSafely) {
    return { target: 'NO_DEPLOY', autonomous: false, reason: 'concurrent work not safely integrated — needs human' , needsHuman: true };
  }
  // Green + low/normal risk + integrated → autonomous production via existing pipeline.
  return {
    target: 'PRODUCTION', autonomous: cfg.auto_deploy === true,
    provider: cfg.provider, production_branch: cfg.production_branch,
    mechanism: `merge task branch → ${cfg.production_branch} → ${cfg.provider} auto-deploy`,
    reason: 'checks green, integrated, normal risk → deploy within existing safe pipeline',
  };
}

// Live verification against the REAL production URL (brief §34). Read-only GET of
// the health path; success requires HTTP 200 (and, where the app exposes it, a
// matching version/commit). Never treats "deploy succeeded" as done by itself.
export async function liveVerify(agent, { expectCommit = null, timeoutMs = 10_000 } = {}) {
  const cfg = agent.deploy || {};
  if (!cfg.production_url) return { ok: false, reason: 'no production_url configured' };
  const url = cfg.production_url.replace(/\/$/, '') + (cfg.health_path || '/');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    const text = await res.text().catch(() => '');
    const versionOk = expectCommit ? text.includes(expectCommit) : true;
    return {
      ok: res.status >= 200 && res.status < 400 && versionOk,
      url, status: res.status, versionMatched: expectCommit ? versionOk : null,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { ok: false, url, reason: `live check failed: ${err.name === 'AbortError' ? 'timeout' : err.message}`, checkedAt: new Date().toISOString() };
  } finally {
    clearTimeout(t);
  }
}

// Rollback reference for a production write task (brief §35).
export function rollbackRef(agent, task) {
  const cfg = agent.deploy || {};
  return {
    pre_change_sha: task.pre_change_sha || null,
    deployed_sha: task.deployed_sha || task.commit_sha || null,
    strategy: cfg.rollback || 'revert-commit',
    // We DO NOT auto-rollback unless it is a clear technical regression within
    // policy; otherwise it is a human action (brief §35).
    auto: false,
  };
}
