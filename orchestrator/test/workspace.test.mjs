// Workspace manager tests (brief §5–§7, §31, §52). Hermetic: a local bare "origin"
// stands in for GitHub, so worktree isolation and divergence-safe delivery are
// proven without any network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../src/config.mjs';
import { provisionWorktree, deliver, detectCapabilities, canProvision, sanitizeBranch } from '../src/workspace.mjs';
import { getAgent } from '../src/registry.mjs';

const REPO = 'ftrprf-labs/website'; // in registry allowlist
function g(dir, ...args) { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim(); }

function setupOrigin() {
  const tmp = mkdtempSync(join(tmpdir(), 'mac-ws-'));
  const origin = join(tmp, 'origin.git');
  execFileSync('git', ['init', '--bare', '-b', 'main', origin]);
  const seed = join(tmp, 'seed');
  execFileSync('git', ['clone', origin, seed]);
  writeFileSync(join(seed, 'a.txt'), 'base\n');
  g(seed, 'add', '.'); g(seed, 'commit', '-m', 'base');
  g(seed, 'push', '-u', 'origin', 'main');
  const checkout = join(tmp, 'checkout');
  execFileSync('git', ['clone', origin, checkout]);
  // Point the workspace manager at this local checkout + a temp worktree root.
  config.runner.checkouts[REPO] = checkout;
  config.workspace.root = join(tmp, 'ws');
  return { tmp, origin, seed, checkout };
}

test('provisions an isolated worktree on a fresh task branch from current base', async () => {
  setupOrigin();
  const wt = await provisionWorktree(REPO, 'MAC-900', 'orchestrator/mac-900-test');
  assert.ok(existsSync(wt.path));
  assert.equal(wt.branch, 'orchestrator/mac-900-test');
  assert.equal(g(wt.path, 'rev-parse', '--abbrev-ref', 'HEAD'), 'orchestrator/mac-900-test');
  // Second task gets a separate worktree — parallel isolation.
  const wt2 = await provisionWorktree(REPO, 'MAC-901', 'orchestrator/mac-901-test');
  assert.notEqual(wt.path, wt2.path);
});

test('divergence-safe delivery: integrates concurrent work by rebase, never force', async () => {
  const { seed } = setupOrigin();
  const wt = await provisionWorktree(REPO, 'MAC-902', 'orchestrator/mac-902-test');
  writeFileSync(join(wt.path, 'b.txt'), 'task work\n');   // non-conflicting file
  g(wt.path, 'add', '.'); g(wt.path, 'commit', '-m', 'task change');
  // Concurrent work lands on origin/main (different file).
  writeFileSync(join(seed, 'c.txt'), 'concurrent\n');
  g(seed, 'add', '.'); g(seed, 'commit', '-m', 'concurrent'); g(seed, 'push', 'origin', 'main');

  const d = await deliver(REPO, 'MAC-902', { push: true });
  assert.equal(d.integrated, true, 'base moved → integrated');
  assert.equal(d.pushed, true);
  assert.equal(d.needsHuman, false);
});

test('conflicting concurrent work → needs human, no force push', async () => {
  const { seed } = setupOrigin();
  const wt = await provisionWorktree(REPO, 'MAC-903', 'orchestrator/mac-903-test');
  writeFileSync(join(wt.path, 'a.txt'), 'task version\n');   // same file as concurrent
  g(wt.path, 'add', '.'); g(wt.path, 'commit', '-m', 'task edits a.txt');
  writeFileSync(join(seed, 'a.txt'), 'main version\n');
  g(seed, 'add', '.'); g(seed, 'commit', '-m', 'main edits a.txt'); g(seed, 'push', 'origin', 'main');

  const d = await deliver(REPO, 'MAC-903', { push: true });
  assert.equal(d.needsHuman, true);
  assert.equal(d.pushed, false);
});

test('capability manifest is detected from package.json + registry', () => {
  const caps = detectCapabilities(process.cwd(), getAgent('relationship'));
  assert.equal(typeof caps.unit, 'boolean');
});

test('branch names are sanitised; only registry repos provision', () => {
  assert.equal(sanitizeBranch('Orchestrator/MAC 1 · héllo!!'), 'orchestrator/mac-1-h-llo');
  assert.equal(canProvision('evil/not-in-registry'), false);
});
