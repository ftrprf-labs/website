// Decomposition tests (Lead Engineering — Autonomous Night Run). A large
// assignment splits on EXPLICIT structure, routes each sub-task, and computes
// dependencies (same-repo sequential; ordering word → cross-repo dependency).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { decompose, splitSteps } from '../src/decompose.mjs';

test('a single instruction is NOT an epic', () => {
  freshStore();
  const plan = decompose('Verbeter de SEO meta tags op de homepage van de website');
  assert.equal(plan.is_epic, false);
  assert.equal(plan.count, 1);
});

test('a numbered multi-step assignment decomposes and routes each step', () => {
  freshStore();
  const plan = decompose([
    '1. Verbeter de SEO en meta tags op de homepage',
    '2. Bouw een nieuwe reveal stap in de First Five journey',
    '3. Audit testerbeheer consent in de Relationship Workspace',
  ].join('\n'));
  assert.equal(plan.is_epic, true);
  assert.equal(plan.count, 3);
  assert.equal(plan.steps[0].selected_agent, 'website');
  assert.equal(plan.steps[1].selected_agent, 'first_five');
  assert.equal(plan.steps[2].selected_agent, 'relationship');
  // Three different repos, no dependencies → all can run in parallel.
  assert.deepEqual(plan.steps[0].depends_on_index, []);
  assert.deepEqual(plan.steps[1].depends_on_index, []);
  assert.deepEqual(plan.steps[2].depends_on_index, []);
});

test('two steps on the SAME repo are chained sequentially', () => {
  freshStore();
  const plan = decompose([
    '1. Verbeter de SEO meta tags op de homepage',
    '2. Voeg microcopy toe aan de homepage hero',
    '3. Bouw een reveal stap in de First Five journey',
  ].join('\n'));
  assert.equal(plan.steps[0].repository, plan.steps[1].repository); // both website
  assert.deepEqual(plan.steps[1].depends_on_index, [0]);            // second waits for first
  assert.deepEqual(plan.steps[2].depends_on_index, []);             // other repo → parallel
});

test('an ordering word creates a cross-repo dependency', () => {
  freshStore();
  const plan = decompose([
    '1. Verbeter de homepage SEO',
    '2. Daarna audit testerbeheer consent in de Relationship Workspace',
  ].join('\n'));
  assert.notEqual(plan.steps[0].repository, plan.steps[1].repository);
  assert.equal(plan.steps[1].ordered, true);
  assert.deepEqual(plan.steps[1].depends_on_index, [0]);
  assert.equal(plan.steps[1].text.startsWith('Daarna'), false); // marker stripped from the routed text
});

test('splitSteps recognises bullets and is bounded', () => {
  freshStore();
  const steps = splitSteps('- eerste taak hier\n- tweede taak hier\n- derde taak hier');
  assert.equal(steps.length, 3);
  const big = Array.from({ length: 40 }, (_, i) => `${i + 1}. taak nummer ${i + 1} met genoeg tekst`).join('\n');
  const plan = decompose(big);
  assert.equal(plan.truncated, true);
  assert.ok(plan.count <= 20);
});
