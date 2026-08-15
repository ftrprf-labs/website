// Acceptance tests (brief §30). "done" is not COMPLETED unless required checks
// ran, a bug has a regression test, and deploy-required tasks are live-verified.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyAcceptance } from '../src/acceptance.mjs';

const bugTask = { task_type: 'bug', required_checks: ['unit', 'regression'], tests_required: true, deploy_required: false };

test('a bug marked done but with no tests run is NOT accepted', () => {
  const v = verifyAcceptance(bugTask, { status: 'done', tests: [], commit: 'abc' });
  assert.equal(v.accepted, false);
  assert.ok(v.missing.includes('check:unit'));
});

test('a bug with a failing regression test is NOT accepted', () => {
  const v = verifyAcceptance(bugTask, { status: 'done', tests: [{ name: 'unit', passed: true }, { name: 'regression', passed: false }], commit: 'abc' });
  assert.equal(v.accepted, false);
});

test('a bug with unit + passing regression + commit IS accepted', () => {
  const v = verifyAcceptance(bugTask, { status: 'done', tests: [{ name: 'unit', passed: true }, { name: 'regression', passed: true }], commit: 'abc' });
  assert.equal(v.accepted, true, JSON.stringify(v));
});

test('deploy-required task without live verification is NOT accepted', () => {
  const dep = { task_type: 'feature', required_checks: ['build'], tests_required: true, deploy_required: true };
  const base = { status: 'done', tests: [{ name: 'build', passed: true }], commit: 'abc', deployment: { status: 'deployed' } };
  assert.equal(verifyAcceptance(dep, base).accepted, false);
  assert.equal(verifyAcceptance(dep, { ...base, live_verification: { ok: true } }).accepted, true);
});

test('an outstanding human action blocks completion', () => {
  const v = verifyAcceptance({ task_type: 'feature', required_checks: [], tests_required: false, deploy_required: false },
    { status: 'partial', tests: [], commit: 'abc', human_actions: [{ kind: 'external-credential' }] });
  assert.equal(v.accepted, false);
  assert.ok(v.missing.includes('human-action'));
});
