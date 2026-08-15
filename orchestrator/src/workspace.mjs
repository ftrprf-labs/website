// Workspace manager (Phase 2, brief §5–§7).
//
// Gives every write task its own isolated, up-to-date checkout so Website, First
// Five and Relationship agents can work in parallel without corrupting each
// other's filesystem state. Design:
//
//   $WORKSPACE_ROOT/
//     repos/<slug>/          one clone per repo (the "base"), kept fetched
//     worktrees/<task>/       a git worktree per task, on its own task branch
//
// Git is the source of truth (brief §7): before any write task we fetch, read the
// real remote HEAD, and branch from the current default base. Before push we fetch
// again, and if the base moved we integrate (rebase) and re-test rather than blind
// or force pushing (brief §31). Nothing here ever force-pushes or rewrites history.
//
// Safety: all git calls use argv arrays (no shell string interpolation, brief §56);
// repositories are allowlisted against the registry (no arbitrary URL, brief §54);
// branch names are sanitised; the git token is injected into the remote URL only
// and never logged (brief §49).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config } from './config.mjs';
import { getAgentByRepo } from './registry.mjs';

const run = promisify(execFile);

export function repoSlug(repo) {
  // "ftrprf-labs/maculis-first-five." -> "ftrprf-labs__maculis-first-five"
  return repo.replace(/[^A-Za-z0-9._-]+/g, '__').replace(/\.+$/, '');
}

export function sanitizeBranch(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/^-+|[-.]+$/g, '').slice(0, 120);
}

// Only registry repositories may be provisioned (allowlist, brief §54, §69).
function assertAllowed(repo) {
  if (!getAgentByRepo(repo)) throw new Error(`Repository not in registry allowlist: ${repo}`);
}

function remoteUrl(repo) {
  const { gitToken, gitHost } = config.workspace;
  const auth = gitToken ? `x-access-token:${gitToken}@` : '';
  return `https://${auth}${gitHost}/${repo}`;
}
// Redacted form for logs/errors — never leak the token.
function safeUrl(repo) { return `https://${config.workspace.gitHost}/${repo}`; }

function reposDir() { return join(config.workspace.root, 'repos'); }
function worktreesDir() { return join(config.workspace.root, 'worktrees'); }
export function basePath(repo) { return join(reposDir(), repoSlug(repo)); }
export function worktreePath(taskId) { return join(worktreesDir(), taskId); }

async function git(dir, args, timeout = 60_000) {
  try {
    const { stdout } = await run('git', ['-C', dir, ...args], { timeout, maxBuffer: 8 * 1024 * 1024 });
    return stdout.trim();
  } catch (err) {
    // Scrub any accidental token from error text.
    let msg = String(err.stderr || err.message);
    if (config.workspace.gitToken) msg = msg.split(config.workspace.gitToken).join('***');
    throw new Error(`git ${args[0]} failed in ${dir}: ${msg.slice(0, 500)}`);
  }
}

// An operator-provided, already-authenticated checkout for a repo (e.g. a clone
// the host maintains). Preferred over cloning so no git token is needed and the
// host's existing auth is reused.
function existingCheckout(repo) {
  const p = config.runner.checkouts[repo];
  return p && existsSync(join(p, '.git')) ? p : null;
}

// Whether a repo can be provisioned right now (registry-allowed AND either an
// existing checkout, a public repo, or a git token is configured).
export function canProvision(repo) {
  const agent = getAgentByRepo(repo);
  if (!agent) return false;
  // Public repos clone without auth; private repos need an existing checkout or a token.
  return Boolean(existingCheckout(repo) || config.workspace.gitToken || agent.public);
}

// Ensure the base clone exists and is fetched; return { baseDir, defaultBranch, head }.
export async function ensureBase(repo) {
  assertAllowed(repo);
  const existing = existingCheckout(repo);
  const baseDir = existing || basePath(repo);
  if (existing) {
    await git(baseDir, ['fetch', '--quiet', '--prune', 'origin']).catch(() => {});
  } else if (!existsSync(join(baseDir, '.git'))) {
    mkdirSync(reposDir(), { recursive: true });
    await run('git', ['clone', '--quiet', remoteUrl(repo), baseDir], { timeout: config.workspace.cloneTimeoutMs })
      .catch((e) => { throw new Error(`clone ${safeUrl(repo)} failed: ${scrub(e)}`); });
  } else {
    const url = await git(baseDir, ['remote', 'get-url', 'origin']).catch(() => '');
    if (!url.includes(`/${repo}`)) throw new Error(`Base clone remote mismatch for ${repo}`);
    await git(baseDir, ['fetch', '--quiet', '--prune', 'origin']);
  }
  const defaultBranch = await detectDefaultBranch(baseDir);
  const head = await git(baseDir, ['rev-parse', `origin/${defaultBranch}`]);
  return { baseDir, defaultBranch, head };
}

async function detectDefaultBranch(baseDir) {
  // Prefer the remote's advertised HEAD; fall back to main/master.
  const ref = await git(baseDir, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']).catch(() => '');
  const m = /refs\/remotes\/origin\/(.+)$/.exec(ref);
  if (m) return m[1];
  for (const b of ['main', 'master']) {
    if (await git(baseDir, ['rev-parse', '--verify', `origin/${b}`]).then(() => true).catch(() => false)) return b;
  }
  throw new Error('Could not determine default branch');
}

// Create an isolated worktree on a fresh task branch from the current base.
// Returns { path, branch, baseSha, defaultBranch }.
export async function provisionWorktree(repo, taskId, branchName) {
  const { baseDir, defaultBranch, head } = await ensureBase(repo);
  mkdirSync(worktreesDir(), { recursive: true });
  const branch = sanitizeBranch(branchName);
  const path = worktreePath(taskId);
  if (existsSync(path)) await removeWorktree(repo, taskId).catch(() => {});
  // Branch from the freshly-fetched default base (brief §7).
  await git(baseDir, ['worktree', 'add', '--quiet', '-b', branch, path, `origin/${defaultBranch}`]);
  return { path, branch, baseSha: head, defaultBranch };
}

function baseDirOf(repo) { return existingCheckout(repo) || basePath(repo); }

export async function removeWorktree(repo, taskId) {
  const baseDir = baseDirOf(repo);
  const path = worktreePath(taskId);
  if (existsSync(join(baseDir, '.git'))) await git(baseDir, ['worktree', 'remove', '--force', path]).catch(() => {});
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

// Divergence-safe delivery (brief §7, §31). Fetch, and if the base moved under us,
// rebase the task branch onto the updated base and signal a re-test; on conflict
// we DO NOT force — we abort and report needs-human. Never touches other commits.
// Returns { pushed, integrated, needsHuman, reason, headBefore, headAfter }.
export async function deliver(repo, taskId, { push = true } = {}) {
  const baseDir = baseDirOf(repo);
  const path = worktreePath(taskId);
  const branch = await git(path, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const defaultBranch = await detectDefaultBranch(baseDir);
  const headBefore = await git(baseDir, ['rev-parse', `origin/${defaultBranch}`]);

  await git(baseDir, ['fetch', '--quiet', '--prune', 'origin']);
  const headAfter = await git(baseDir, ['rev-parse', `origin/${defaultBranch}`]);

  let integrated = false;
  if (headBefore !== headAfter) {
    // Base advanced (concurrent work). Integrate by rebasing the task branch.
    integrated = true;
    try {
      await git(path, ['rebase', `origin/${defaultBranch}`]);
    } catch {
      await git(path, ['rebase', '--abort']).catch(() => {});
      return { pushed: false, integrated, needsHuman: true, reason: 'rebase conflict with concurrent work — needs human integration', headBefore, headAfter };
    }
  }

  if (!push) return { pushed: false, integrated, needsHuman: false, reason: 'push disabled', headBefore, headAfter, branch };
  // Push the TASK branch only — never the default branch, never --force.
  await git(path, ['push', '--quiet', '-u', 'origin', branch]);
  return { pushed: true, integrated, needsHuman: false, headBefore, headAfter, branch };
}

// Detect which checks a repo actually supports, from its package.json scripts
// (brief §10 capability manifest). Falls back to the registry's declared commands.
export function detectCapabilities(worktreeDir, agent) {
  const caps = { lint: false, typecheck: false, unit: false, build: false, e2e: false };
  try {
    const pkg = JSON.parse(readFileSync(join(worktreeDir, 'package.json'), 'utf8'));
    const s = pkg.scripts || {};
    caps.lint = Boolean(s.lint);
    caps.typecheck = Boolean(s.typecheck || s['type-check']);
    caps.unit = Boolean(s.test);
    caps.build = Boolean(s.build);
    caps.e2e = Boolean(s['test:e2e'] || s.e2e);
  } catch { /* no package.json — rely on registry declarations */ }
  // Merge with what the registry declares so a repo without scripts still routes.
  const t = agent?.test_commands || {};
  return {
    lint: caps.lint || Boolean(t.lint),
    typecheck: caps.typecheck,
    unit: caps.unit || Boolean(t.unit),
    build: caps.build || Boolean(t.build),
    e2e: caps.e2e || Boolean(t.e2e),
  };
}

// Ensure a worktree has its dependencies before the orchestrator runs checks
// (what a real CI does). Best-effort: prefers `npm ci`, falls back to install.
export async function ensureDeps(worktreeDir) {
  if (!existsSync(join(worktreeDir, 'package.json'))) return { installed: false, reason: 'no package.json' };
  if (existsSync(join(worktreeDir, 'node_modules'))) return { installed: true, reason: 'already present' };
  const cmd = existsSync(join(worktreeDir, 'package-lock.json')) ? ['ci'] : ['install'];
  try {
    await run('npm', [...cmd, '--no-audit', '--no-fund'], { cwd: worktreeDir, timeout: config.workspace.cloneTimeoutMs, maxBuffer: 16 * 1024 * 1024 });
    return { installed: true };
  } catch (e) {
    // Fall back to install if ci failed (e.g. lockfile drift), else report.
    try { await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: worktreeDir, timeout: config.workspace.cloneTimeoutMs, maxBuffer: 16 * 1024 * 1024 }); return { installed: true, fallback: true }; }
    catch (e2) { return { installed: false, reason: String(e2.message).slice(0, 200) }; }
  }
}

function scrub(e) {
  const t = String(e?.stderr || e?.message || e);
  return (config.workspace.gitToken ? t.split(config.workspace.gitToken).join('***') : t).slice(0, 400);
}

// For tests: a local "origin" can be provisioned so delivery logic is verifiable
// without the network. Returns nothing; throws on failure.
export function _workspaceRootForTests(root) { config.workspace.root = root; }
