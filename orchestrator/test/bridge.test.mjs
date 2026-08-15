// ChatGPT bridge + Phase 2 API surface (brief §19, §24, §44, §52).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { config } from '../src/config.mjs';
import { createApiServer } from '../src/api.mjs';
import { openApiSpec } from '../src/openapi.mjs';
import { buildClaudeArgs } from '../src/runner.mjs';
import { getAgent } from '../src/registry.mjs';

function listen(server) { return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port))); }
async function req(port, method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json().catch(() => null) };
}

test('OpenAPI spec exposes exactly the small ChatGPT tool surface', () => {
  const spec = openApiSpec();
  const ops = Object.values(spec.paths).flatMap((p) => Object.values(p).map((o) => o.operationId));
  for (const t of ['submit_maculis_task', 'get_maculis_task', 'list_maculis_tasks', 'cancel_maculis_task', 'approve_maculis_action', 'list_maculis_human_actions']) {
    assert.ok(ops.includes(t), `missing ${t}`);
  }
  assert.equal(spec.components.securitySchemes.bearerAuth.scheme, 'bearer');
});

test('/openapi.json is public but operations still require the token', async () => {
  freshStore(); config.api.token = 'sekret';
  const server = createApiServer(); const port = await listen(server);
  try {
    assert.equal((await req(port, 'GET', '/openapi.json')).status, 200);       // public
    assert.equal((await req(port, 'POST', '/tasks', { body: { request: 'x' } })).status, 401); // needs token
    // task log + agent disable
    const sub = await req(port, 'POST', '/tasks', { token: 'sekret', body: { request: 'homepage SEO verbeteren' } });
    const id = sub.json.task.task_id;
    assert.equal((await req(port, 'GET', `/tasks/${id}/log`, { token: 'sekret' })).status, 200);
    assert.equal((await req(port, 'POST', '/agents/website/disable', { token: 'sekret', body: { reason: 'test' } })).status, 200);
    const ha = await req(port, 'GET', '/human-actions', { token: 'sekret' });
    assert.equal(ha.status, 200);
  } finally { server.close(); config.api.token = ''; }
});

test('buildClaudeArgs uses the worktree profile and resume/session flags correctly', () => {
  const agent = getAgent('first_five');
  const resumed = buildClaudeArgs({ prompt: 'p', agent, sessionDecision: { action: 'resume', session_id: 'sid-1' } });
  assert.ok(resumed.includes('--resume') && resumed.includes('sid-1'));
  assert.ok(resumed.includes('--settings'));
  const fresh = buildClaudeArgs({ prompt: 'p', agent, sessionDecision: { action: 'new', session_id: 'sid-2' } });
  assert.ok(fresh.includes('--session-id') && fresh.includes('sid-2'));
  // The worktree profile denies push (orchestrator delivers).
  const settingsIdx = resumed.indexOf('--settings');
  const settings = JSON.parse(resumed[settingsIdx + 1]);
  assert.ok(settings.permissions.deny.some((r) => /git push/.test(r)));
});
