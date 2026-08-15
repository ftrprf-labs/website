// Deployment policy + live verification tests (brief §14, §15, §34, §52).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { planDeployment, liveVerify } from '../src/deploy.mjs';
import { getAgent } from '../src/registry.mjs';

const agent = getAgent('first_five');

test('no deploy when task does not require it', () => {
  assert.equal(planDeployment(agent, { deploy_required: false, risk_level: 'normal' }, { accepted: true }).target, 'NO_DEPLOY');
});

test('autonomous production only when green, integrated, normal risk', () => {
  const green = planDeployment(agent, { deploy_required: true, risk_level: 'normal' }, { accepted: true, integratedSafely: true });
  assert.equal(green.target, 'PRODUCTION');
  assert.equal(green.autonomous, true); // first_five auto_deploy: true

  const notAccepted = planDeployment(agent, { deploy_required: true, risk_level: 'normal' }, { accepted: false });
  assert.equal(notAccepted.target, 'NO_DEPLOY');
});

test('high-risk deploy needs a human', () => {
  const p = planDeployment(agent, { deploy_required: true, risk_level: 'high' }, { accepted: true });
  assert.equal(p.needsHuman, true);
  assert.equal(p.autonomous, false);
});

test('unintegrated concurrent work blocks deploy', () => {
  const p = planDeployment(agent, { deploy_required: true, risk_level: 'normal' }, { accepted: true, integratedSafely: false });
  assert.equal(p.needsHuman, true);
});

test('live verify passes on 200 and fails on 500 (real HTTP)', async () => {
  let code = 200;
  const server = createServer((req, res) => { res.writeHead(code); res.end('{"ok":true}'); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const testAgent = { deploy: { production_url: `http://127.0.0.1:${port}`, health_path: '/healthz' } };
  try {
    assert.equal((await liveVerify(testAgent, {})).ok, true);
    code = 500;
    assert.equal((await liveVerify(testAgent, {})).ok, false);
  } finally { server.close(); }
});
