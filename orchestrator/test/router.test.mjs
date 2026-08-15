// Router tests (brief §65–§66). The three canonical prompts + cross-domain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { route } from '../src/router.mjs';

test('A. HEMA "Nog een lens" bug routes to First Five', () => {
  const r = route('Bij HEMA verschijnt na Herken je dit → Ja nog steeds geen Nog een lens. Los dit volledig E2E op.');
  assert.equal(r.selected_agent, 'first_five');
  assert.equal(r.repository, 'ftrprf-labs/maculis-first-five.');
  assert.equal(r.task_type, 'bug');
});

test('B. vanegmond.nl micro reveal routes to Website', () => {
  const r = route('Bij vanegmond.nl zegt de homepage dat Maculis niet scherp genoeg kan kijken. Onderzoek de micro reveal.');
  assert.equal(r.selected_agent, 'website');
  assert.equal(r.repository, 'ftrprf-labs/groeiplatform-website');
});

test('C. WhatsApp at OCA routes to Relationship', () => {
  const r = route('Bouw WhatsApp communicatie binnen de klant OCA in de Relationship Workspace.');
  assert.equal(r.selected_agent, 'relationship');
  assert.equal(r.repository, 'ftrprf-labs/website');
  assert.equal(r.task_type, 'feature');
});

test('extra: homepage SEO → Website; Technical Signals → First Five', () => {
  assert.equal(route('homepage SEO verbeteren').selected_agent, 'website');
  assert.equal(route('Technical Signals na Herken je dit').selected_agent, 'first_five');
});

test('cross-domain: First Five completion visible in Relationship Workspace', () => {
  const r = route('Wanneer iemand First Five voltooit wil ik dat dit direct zichtbaar is in de Relationship Workspace.');
  assert.equal(r.cross_domain, true);
  assert.ok(r.primary_owner);
  assert.ok(r.dependency);
  assert.notEqual(r.primary_owner, r.dependency.agent_id);
  // both first_five and relationship must be involved
  const involved = new Set([r.primary_owner, r.dependency.agent_id]);
  assert.ok(involved.has('first_five') && involved.has('relationship'));
});

test('low-confidence gibberish → NEEDS_ROUTING_REVIEW', () => {
  const r = route('xyzzy foo bar qux');
  assert.equal(r.selected_agent, 'NEEDS_ROUTING_REVIEW');
});
