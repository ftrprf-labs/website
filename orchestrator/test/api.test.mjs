// API tests (brief §43, §47). Auth is enforced; submit returns a task; healthz is
// public. Uses an ephemeral port on loopback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { config } from '../src/config.mjs';
import { createApiServer } from '../src/api.mjs';

function listen(server) {
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
}
async function req(port, method, path, { token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
}

test('API enforces auth and can submit + read a task', async () => {
  freshStore();
  config.api.token = 'test-secret';
  const server = createApiServer();
  const port = await listen(server);
  try {
    // health is public
    assert.equal((await req(port, 'GET', '/healthz')).status, 200);
    // no token → 401
    assert.equal((await req(port, 'POST', '/tasks', { body: { request: 'x' } })).status, 401);
    // agents list with token
    const agents = await req(port, 'GET', '/agents', { token: 'test-secret' });
    assert.equal(agents.status, 200);
    assert.equal(agents.json.agents.length >= 3, true);
    // submit
    const sub = await req(port, 'POST', '/tasks', { token: 'test-secret', body: { request: 'homepage SEO verbeteren' } });
    assert.equal(sub.status, 202);
    assert.equal(sub.json.task.selected_agent, 'website');
    const id = sub.json.task.task_id;
    // read back
    const got = await req(port, 'GET', `/tasks/${id}`, { token: 'test-secret' });
    assert.equal(got.status, 200);
    assert.equal(got.json.task.task_id, id);
    // dry-run route endpoint
    const rt = await req(port, 'POST', '/route', { token: 'test-secret', body: { request: 'WhatsApp bij OCA' } });
    assert.equal(rt.json.selected_agent, 'relationship');
  } finally {
    server.close();
    config.api.token = '';
  }
});
