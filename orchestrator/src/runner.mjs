// Runner (brief §13). Primary execution architecture: the installed Claude Code
// CLI in headless mode (`claude -p --output-format json`) — supported,
// programmable, no browser/UI automation. Session persistence via --session-id /
// --resume; permissions via a --settings profile + --permission-mode; cost bound
// via --max-turns + a hard timeout + heartbeat.
//
// Phase 2: real mode runs the agent inside an isolated git worktree (cwd), and
// the ORCHESTRATOR runs the required capability checks itself afterwards rather
// than trusting the agent's self-report (brief §10, §30). Two modes:
//   mock — deterministic structured result, no Claude invoked (tests/demo).
//   real — spawns `claude` in the task worktree.

import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { config } from './config.mjs';
import { getProfile, settingsJsonFor } from './permissions.mjs';

const run = promisify(execFile);

// Build the exact argv the real runner executes — pure, unit-testable, no secrets.
export function buildClaudeArgs({ prompt, agent, sessionDecision }) {
  const profile = getProfile(agent.permission_profile);
  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--permission-mode', profile.permissionMode,
    '--settings', settingsJsonFor(agent.permission_profile),
    '--max-turns', String(config.runner.maxTurns),
    '--append-system-prompt', agent.system_instructions,
  ];
  if (sessionDecision?.action === 'resume') args.push('--resume', sessionDecision.session_id);
  else if (sessionDecision?.session_id) args.push('--session-id', sessionDecision.session_id);
  return args;
}

// Run the agent for a task. In real mode `worktreeDir` is the isolated cwd.
// Returns { ok, mode, session_id, summary, commit, baseSha, raw }.
export async function runAgent({ task, agent, prompt, sessionDecision, worktreeDir = null, baseSha = null, onBeat = null }) {
  const mode = config.runner.mode === 'real' && worktreeDir ? 'real' : 'mock';
  if (mode === 'mock') return mockRun({ task, agent, sessionDecision });
  return realRun({ task, agent, prompt, sessionDecision, worktreeDir, baseSha, onBeat });
}

// ---- Real runner ----------------------------------------------------------
function realRun({ task, agent, prompt, sessionDecision, worktreeDir, baseSha, onBeat }) {
  const args = buildClaudeArgs({ prompt, agent, sessionDecision });
  return new Promise((resolve) => {
    const child = spawn(config.runner.claudeBin, args, { cwd: worktreeDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', settled = false;
    const beat = setInterval(() => { if (onBeat) onBeat(); }, config.runner.heartbeatMs);
    const timer = setTimeout(() => {
      if (!settled) { settled = true; clearInterval(beat); child.kill('SIGKILL'); resolve({ ok: false, mode: 'real', error: 'timeout', raw: clip(out + err) }); }
    }, config.runner.timeoutMs);
    child.stdout.on('data', (d) => { out += d; if (onBeat) onBeat(); });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => { if (!settled) { settled = true; clearTimeout(timer); clearInterval(beat); resolve({ ok: false, mode: 'real', error: e.message }); } });
    child.on('close', async (code) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearInterval(beat);
      let env = null;
      try { env = JSON.parse(out); } catch { return resolve({ ok: false, mode: 'real', error: `non-JSON output (exit ${code})`, raw: clip(out + err) }); }
      const commit = await headSha(worktreeDir);
      const committed = commit && commit !== baseSha;
      resolve({
        ok: !env.is_error && code === 0, mode: 'real', session_id: env.session_id,
        summary: typeof env.result === 'string' ? env.result : '', commit: committed ? commit : null,
        baseSha, cost_usd: env.total_cost_usd, num_turns: env.num_turns, raw: clip(env.result || out),
      });
    });
  });
}

// Run the required capability checks in the worktree — orchestrator-owned, so the
// pass/fail is trustworthy (brief §30). Maps a check name to the repo's real
// command from the capability manifest. Returns [{name, passed, output_tail}].
export async function runChecks(worktreeDir, agent, checkNames) {
  const map = agent.test_commands || {};
  const cmdFor = (name) => name === 'regression' ? (map.unit || map.e2e) : map[name];
  const results = [];
  for (const name of checkNames || []) {
    const cmd = cmdFor(name);
    if (!cmd) { results.push({ name, passed: false, output_tail: 'no command configured for this check' }); continue; }
    try {
      const { stdout } = await run('bash', ['-lc', cmd], { cwd: worktreeDir, timeout: config.runner.timeoutMs, maxBuffer: 8 * 1024 * 1024 });
      results.push({ name, passed: true, output_tail: tail(stdout) });
    } catch (e) {
      results.push({ name, passed: false, output_tail: tail(String(e.stdout || '') + String(e.stderr || e.message)) });
    }
  }
  return results;
}

async function headSha(dir) {
  try { const { stdout } = await run('git', ['-C', dir, 'rev-parse', 'HEAD']); return stdout.trim(); }
  catch { return null; }
}

// ---- Mock runner (deterministic) -----------------------------------------
function mockRun({ task, agent, sessionDecision }) {
  const req = task.original_request.toLowerCase();
  const sid = sessionDecision?.session_id || 'mock-session';
  const branch = task.branch;
  if (req.includes('simulate_fail') || req.includes('simulate fail')) {
    return Promise.resolve({ ok: false, mode: 'mock', session_id: sid, result: {
      status: 'failed', summary: 'Reproduced the issue but the fix did not pass its regression test.',
      tests: [{ name: 'regression', passed: false }, { name: 'unit', passed: true }], warnings: ['Fix attempt left the failing case red.'],
    }, raw: 'mock: simulated failure' });
  }
  const missingCredential = /whatsapp|sms|telefonie|telephony/.test(req) && !/credential (present|available)/.test(req);
  const tests = (task.required_checks || []).map((c) => ({ name: c, passed: true }));
  if (task.task_type === 'bug' && !tests.some((t) => t.name === 'regression')) tests.push({ name: 'regression', passed: true });
  const result = {
    status: missingCredential ? 'partial' : 'done',
    summary: missingCredential
      ? `Implemented the ${agent.name} slice for "${task.title}"; outbound path stubbed pending provider credential.`
      : `Completed "${task.title}" in ${agent.name}. Reproduced, fixed, and verified.`,
    root_cause: task.task_type === 'bug' ? 'Condition gating the feature evaluated false for the affected case.' : null,
    files_changed: [`${agent.working_directory}/example-change.mjs`], tests,
    commit: `mocksha_${task.task_id.replace('-', '').toLowerCase()}`,
    pr: { number: null, branch, url: `https://github.com/${agent.repository}/tree/${branch}` },
    deployment: task.deploy_required ? { target: 'PRODUCTION', status: 'deployed' } : null,
    live_verification: task.deploy_required ? { ok: true, url: 'https://example.invalid', checked: true } : null,
    human_actions: missingCredential ? [{ kind: 'external-credential', title: `Add ${/whatsapp/.test(req) ? 'WhatsApp Business' : 'provider'} API credential`, why: 'Required to send real messages' }] : [],
    warnings: [],
  };
  return Promise.resolve({ ok: true, mode: 'mock', session_id: sid, result, raw: 'mock: structured result' });
}

function clip(s, n = 20000) { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…[clipped]' : t; }
function tail(s, n = 1200) { const t = String(s || ''); return t.length > n ? '…' + t.slice(-n) : t; }
