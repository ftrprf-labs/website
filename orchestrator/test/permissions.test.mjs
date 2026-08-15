// Permission tests (brief §67). Normal engineering is auto-allowed; forbidden
// actions (force push main, reading secrets) are NOT auto-allowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAction, getProfile, settingsJsonFor } from '../src/permissions.mjs';

test('normal engineering actions are auto-allowed', () => {
  for (const a of ['git status', 'npm test', 'run the unit tests', 'edit server/store.mjs', 'read the file and search']) {
    assert.equal(classifyAction(a).decision, 'allow', a);
  }
});

test('force push main is denied', () => {
  assert.equal(classifyAction('git push --force origin main').decision, 'deny');
  assert.equal(classifyAction('git push -f origin main').decision, 'deny');
});

test('reading secret values is denied', () => {
  assert.equal(classifyAction('cat .env').decision, 'deny');
  assert.equal(classifyAction('printenv').decision, 'deny');
});

test('production deploy and migrations require a human', () => {
  assert.equal(classifyAction('deploy to production').decision, 'human');
  assert.equal(classifyAction('run the database migration').decision, 'human');
  assert.equal(classifyAction('add a WhatsApp Business API credential').decision, 'human');
});

test('profiles compile to Claude Code settings with deny rules present', () => {
  const s = JSON.parse(settingsJsonFor('normal-engineering'));
  assert.ok(s.permissions.allow.includes('Read'));
  assert.ok(s.permissions.deny.some((r) => /force/.test(r)));
  assert.equal(getProfile('delivery').settings.permissions.allow.some((r) => /git commit/.test(r)), true);
});
