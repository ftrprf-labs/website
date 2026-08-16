// Bootstrap-deadlock fix (control-plane bootstrap §): the Orchestrator now has its
// own `orchestrator` engineering domain, and the router no longer reads a protective
// mention of a domain as positive intent for it. Regression proof for:
//  - central control-plane engineering  -> orchestrator
//  - Relationship engineering           -> relationship
//  - real First Five work               -> first_five
//  - "do not touch First Five/EPIC-3/Lens 2" -> NOT first_five
//  - a real paused First Five/Lens resume stays BLOCKED by DEC-1 (unchanged)
//  - orchestrator and relationship cannot hold the same repo write-lock at once
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { route } from '../src/router.mjs';
import { getAgent } from '../src/registry.mjs';
import { tryAcquire, release } from '../src/locks.mjs';
import { submit } from '../src/engine.mjs';
import { seedCanonicalDecisions } from '../src/decisions.mjs';

// ---- The new domain exists and owns the real repo the Orchestrator lives in ----
test('an orchestrator engineering domain exists, owning the physical Orchestrator repo', () => {
  const orch = getAgent('orchestrator');
  assert.ok(orch, 'orchestrator agent must be registered');
  assert.equal(orch.repository, 'ftrprf-labs/website');            // the repo the Orchestrator actually lives in
  const rel = getAgent('relationship');
  assert.equal(rel.repository, orch.repository);                    // SAME physical repo as Relationship
  assert.notEqual(orch.agent_id, rel.agent_id);                     // but functionally separate domains
});

// ---- Central engineering routes to orchestrator (bootstrap §5) ----
test('central control-plane engineering routes to orchestrator', () => {
  for (const req of [
    'Verbeter de routing- en runner-lifecycle in de Orchestrator control plane',
    'Fix the task router classification in the orchestrator',
    'Update the governance and registry of the control plane',
    'Refactor the acceptance/verification step in the orchestrator engine',
    'Analyseer de decompose en decision ledger van de control plane',
  ]) {
    const r = route(req);
    assert.equal(r.selected_agent, 'orchestrator', `"${req}" should route to orchestrator, got ${r.selected_agent}`);
  }
});

// ---- Relationship still routes to relationship (strict separation, same repo) ----
test('Relationship engineering still routes to relationship, not orchestrator', () => {
  for (const req of [
    'Fix the consent gate in the communication layer inbox',
    'Voeg WhatsApp outbound toe aan de tester communicatie',
    'Verbeter de invitation manager en organisatie contactweergave',
  ]) {
    const r = route(req);
    assert.equal(r.selected_agent, 'relationship', `"${req}" should route to relationship, got ${r.selected_agent}`);
  }
});

// ---- Real First Five work still routes to First Five ----
test('genuine First Five work still routes to first_five', () => {
  for (const req of [
    'De reveal toont geen recognition na de thermometer in de journey',
    'Fix de technical signals lens in de First Five journey',
  ]) {
    const r = route(req);
    assert.equal(r.selected_agent, 'first_five', `"${req}" should route to first_five, got ${r.selected_agent}`);
  }
});

// ---- Negative/exclusion context must NOT route to First Five (bootstrap §6) ----
test('protective mentions of First Five/EPIC-3/Lens 2 do not cause First Five routing', () => {
  for (const req of [
    'do not touch First Five',
    'Improve the orchestrator router and runner lifecycle; do not touch First Five and keep Lens 2 paused',
    'Refactor the control plane classification, do not resume EPIC-3, Lens 2 must remain paused',
    'Fix the orchestrator registry, leave First Five alone',
  ]) {
    const r = route(req);
    assert.notEqual(r.selected_agent, 'first_five', `"${req}" must NOT route to first_five, got ${r.selected_agent}`);
  }
});

test('a real orchestrator command that also protects First Five routes to orchestrator', () => {
  const r = route('Improve the orchestrator router and runner lifecycle; do not touch First Five and keep Lens 2 paused');
  assert.equal(r.selected_agent, 'orchestrator');
});

// ---- DEC-1 is untouched: a real resume of a paused scope stays BLOCKED ----
test('a real First Five / Lens 2 resume is still BLOCKED by DEC-1 (guard unchanged)', () => {
  freshStore();
  seedCanonicalDecisions();
  const out = submit('Resume EPIC-3 and implement Lens 2 (Reputation) in First Five now');
  assert.equal(out.task.status, 'BLOCKED');
  assert.equal(out.task.human_action_required, true);
});

// ---- One shared write-lock: orchestrator + relationship cannot both hold it ----
test('orchestrator and relationship share ONE write lock on the physical repo', () => {
  freshStore();
  const repo = getAgent('orchestrator').repository;
  assert.equal(repo, getAgent('relationship').repository);
  const a = tryAcquire('MAC-orch', [repo]);
  assert.equal(a.acquired, true);
  const b = tryAcquire('MAC-rel', [repo]);                          // second agent, same physical repo
  assert.equal(b.acquired, false);
  assert.equal(b.blockers[0].held_by, 'MAC-orch');
  release('MAC-orch');
  const c = tryAcquire('MAC-rel', [repo]);                          // free again after release
  assert.equal(c.acquired, true);
  release('MAC-rel');
});
