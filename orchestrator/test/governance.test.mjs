// Governance framework tests. The Autonomous Night Run charter is loaded from
// config/governance.json (durable, machine-readable) and injected into every task
// prompt so execution runs under the framework — not chat context.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { getGovernance, governanceBlock, humanActionCategories, maxSubtasks } from '../src/governance.mjs';
import { buildPrompt } from '../src/promptBuilder.mjs';
import { getAgent } from '../src/registry.mjs';

test('governance loads from the machine-readable charter', () => {
  freshStore();
  const g = getGovernance();
  assert.ok(g.version && g.version !== '0.0.0-fallback', 'real governance.json should load');
  assert.equal(g.autonomy.mode, 'autonomous-night-run');
  assert.ok(Array.isArray(g.human_actions.always_human) && g.human_actions.always_human.length > 0);
  assert.ok(maxSubtasks() >= 2);
});

test('human-action categories include credentials and production migrations', () => {
  freshStore();
  const cats = humanActionCategories().join(' ').toLowerCase();
  assert.match(cats, /credential/);
  assert.match(cats, /migration/);
});

test('the governance block is injected into the task prompt', () => {
  freshStore();
  const agent = getAgent('relationship');
  const task = {
    task_id: 'MAC-1', title: 't', original_request: 'audit consent', task_type: 'analysis',
    risk_level: 'low', branch: 'orchestrator/mac-1-x', acceptance_criteria: ['x'], required_checks: [],
  };
  const prompt = buildPrompt(task, agent, { remote_head: 'abc', recent_commits: [] }, null);
  assert.match(prompt, /Autonomous Night Run/);
  assert.match(prompt, /HUMAN ACTION/);
  assert.match(prompt, /never force-push/i);
});
