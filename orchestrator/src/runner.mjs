// Runner (brief §13). Primary execution architecture: the installed Claude Code
// CLI in headless mode (`claude -p --output-format json`). This is a supported,
// programmable interface — no browser automation, no UI scripting, no session
// scraping. Session persistence uses --session-id / --resume; permissions use a
// --settings profile + --permission-mode; cost is bounded with --max-turns and a
// hard timeout + heartbeat.
//
// Two modes:
//   mock — deterministic structured result, no Claude invoked. Used by tests, the
//          router demo, and any repo without a local checkout. The wiring is real;
//          only the model call is simulated.
//   real — spawns `claude` for the repo's checkout with the built argv below.

import { spawn } from 'node:child_process';
import { config } from './config.mjs';
import { getProfile, settingsJsonFor } from './permissions.mjs';
import { checkoutDir, hasCheckout } from './git.mjs';

// Build the exact argv the real runner would execute — pure, so it is unit
// testable and shown in `logs`/audit without secrets.
export function buildClaudeArgs({ prompt, agent, sessionDecision, task }) {
  const profile = getProfile(agent.permission_profile);
  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--permission-mode', profile.permissionMode,
    '--settings', settingsJsonFor(agent.permission_profile),
    '--max-turns', String(config.runner.maxTurns),
    '--append-system-prompt', agent.system_instructions,
  ];
  if (sessionDecision?.action === 'resume') {
    args.push('--resume', sessionDecision.session_id);
  } else if (sessionDecision?.session_id) {
    args.push('--session-id', sessionDecision.session_id);
  }
  return args;
}

// Run the agent for a task. Returns { ok, session_id, result?, raw?, error? }.
export async function runAgent({ task, agent, prompt, sessionDecision }) {
  const mode = config.runner.mode === 'real' && hasCheckout(agent.repository) ? 'real' : 'mock';
  if (mode === 'mock') return mockRun({ task, agent, sessionDecision });
  return realRun({ task, agent, prompt, sessionDecision });
}

// ---- Real runner ----------------------------------------------------------
function realRun({ task, agent, prompt, sessionDecision }) {
  const cwd = checkoutDir(agent.repository);
  const args = buildClaudeArgs({ prompt, agent, sessionDecision, task });
  return new Promise((resolve) => {
    const child = spawn(config.runner.claudeBin, args, {
      cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '', settled = false;
    let lastBeat = Date.now();
    const beat = setInterval(() => {
      if (Date.now() - lastBeat > config.runner.heartbeatMs) { /* heartbeat handled by engine timeout */ }
    }, 30_000);
    const timer = setTimeout(() => {
      if (!settled) { settled = true; clearInterval(beat); child.kill('SIGKILL'); resolve({ ok: false, error: 'timeout', raw: clip(out + err) }); }
    }, config.runner.timeoutMs);

    child.stdout.on('data', (d) => { out += d; lastBeat = Date.now(); });
    child.stderr.on('data', (d) => { err += d; lastBeat = Date.now(); });
    child.on('error', (e) => { if (!settled) { settled = true; clearTimeout(timer); clearInterval(beat); resolve({ ok: false, error: e.message }); } });
    child.on('close', (code) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearInterval(beat);
      try {
        const env = JSON.parse(out);
        resolve({ ok: !env.is_error && code === 0, session_id: env.session_id, ...env });
      } catch {
        resolve({ ok: false, error: `non-JSON output (exit ${code})`, raw: clip(out + err) });
      }
    });
  });
}

// ---- Mock runner (deterministic) -----------------------------------------
// Behaviour is driven by task content so tests can assert real outcomes.
function mockRun({ task, agent, sessionDecision }) {
  const req = task.original_request.toLowerCase();
  const sid = sessionDecision?.session_id || 'mock-session';
  const branch = task.branch;

  // Deliberate-failure marker for the failure test (brief §70).
  if (req.includes('simulate_fail') || req.includes('simulate fail')) {
    return Promise.resolve({
      ok: false, session_id: sid,
      result: {
        status: 'failed',
        summary: 'Reproduced the issue but the fix did not pass its regression test.',
        tests: [{ name: 'regression', passed: false }, { name: 'unit', passed: true }],
        warnings: ['Fix attempt left the failing case red.'],
      },
      raw: 'mock: simulated failure',
    });
  }

  // Missing-external-credential scenario (brief §71): build what is possible,
  // surface a central human action, do NOT claim a live connected result.
  const missingCredential = /whatsapp|sms|telefonie|telephony/.test(req) && !/credential (present|available)/.test(req);

  const tests = (task.required_checks || []).map((c) => ({ name: c, passed: true }));
  if (task.task_type === 'bug' && !tests.some((t) => t.name === 'regression')) {
    tests.push({ name: 'regression', passed: true });
  }

  const result = {
    status: missingCredential ? 'partial' : 'done',
    summary: missingCredential
      ? `Implemented the ${agent.name} slice for "${task.title}"; outbound path stubbed pending provider credential.`
      : `Completed "${task.title}" in ${agent.name}. Reproduced, fixed, and verified.`,
    root_cause: task.task_type === 'bug' ? 'Condition gating the feature evaluated false for the affected case.' : null,
    files_changed: [`${agent.working_directory}/example-change.mjs`],
    tests,
    commit: `mocksha_${task.task_id.replace('-', '').toLowerCase()}`,
    pr: { number: null, branch, url: `https://github.com/${agent.repository}/tree/${branch}` },
    deployment: task.deploy_required ? { target: 'PRODUCTION', status: 'deployed' } : null,
    live_verification: task.deploy_required ? { ok: true, url: 'https://example.invalid', checked: true } : null,
    human_actions: missingCredential
      ? [{ kind: 'external-credential', title: `Add ${/whatsapp/.test(req) ? 'WhatsApp Business' : 'provider'} API credential`, why: 'Required to send real messages' }]
      : [],
    warnings: [],
  };
  return Promise.resolve({ ok: true, session_id: sid, result, raw: 'mock: structured result' });
}

function clip(s, n = 20000) { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…[clipped]' : t; }
