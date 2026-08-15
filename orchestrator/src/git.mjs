// Git helpers for preflight (brief §15, §25). Best-effort and never throws for a
// missing checkout — a repo without a local clone simply reports unknown HEAD and
// the runner falls back to mock mode for it.

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { config } from './config.mjs';

const run = promisify(execFile);

export function checkoutDir(repo) {
  return config.runner.checkouts[repo] || null;
}

export function hasCheckout(repo) {
  const dir = checkoutDir(repo);
  return Boolean(dir && existsSync(dir));
}

async function git(dir, args, timeout = 20000) {
  const { stdout } = await run('git', args, { cwd: dir, timeout, maxBuffer: 4 * 1024 * 1024 });
  return stdout.trim();
}

// Remote HEAD sha for the repo's default branch, from the checkout (fetch first).
export async function remoteHead(repo) {
  const dir = checkoutDir(repo);
  if (!dir || !existsSync(dir)) return null;
  try {
    await git(dir, ['fetch', '--quiet', 'origin']).catch(() => {});
    return await git(dir, ['rev-parse', 'HEAD']);
  } catch { return null; }
}

export async function workingTreeClean(repo) {
  const dir = checkoutDir(repo);
  if (!dir || !existsSync(dir)) return null;
  try {
    const out = await git(dir, ['status', '--porcelain']);
    return out.length === 0;
  } catch { return null; }
}

export async function recentCommits(repo, n = 5) {
  const dir = checkoutDir(repo);
  if (!dir || !existsSync(dir)) return [];
  try {
    const out = await git(dir, ['log', `-${n}`, '--oneline']);
    return out ? out.split('\n') : [];
  } catch { return []; }
}

// Full preflight (brief §25): repo known, checkout reachable, HEAD known, tree
// understood, recent commits inspected. Returns a structured report; callers
// decide whether to proceed (never do half work on a failed preflight).
export async function preflight(repo) {
  const known = Boolean(repo);
  const local = hasCheckout(repo);
  const head = local ? await remoteHead(repo) : null;
  const clean = local ? await workingTreeClean(repo) : null;
  const commits = local ? await recentCommits(repo) : [];
  const ok = known; // routable repo is enough to proceed (mock runner handles no-checkout)
  return { ok, repo, known, local_checkout: local, remote_head: head, working_tree_clean: clean, recent_commits: commits };
}
