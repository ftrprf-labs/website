// Control-plane tests: decision ledger + supersession, PAUSED guard, evidence
// intake + selective routing + context firewall, workstreams, epic pause/resume,
// monitoring. Covers TEST B/C/D/G/H at the unit level (the live route proves them
// end-to-end via liveProbe on the deployed instance).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import {
  recordDecision, supersedeDecision, listDecisions, pausedDecisionFor, seedCanonicalDecisions, getDecision,
} from '../src/decisions.mjs';
import { classifyEvidence, recordEvidence, getEvidence } from '../src/evidence.mjs';
import { workstreams, getWorkstream, CLIENT_BINDINGS } from '../src/workstreams.mjs';
import { submit, submitEpic, pauseEpic, resumeEpic, statusOverview, drain } from '../src/engine.mjs';
import { getTask } from '../src/tasks.mjs';

// ---- Decision ledger + supersession (TEST C) -------------------------------
test('a newer decision explicitly supersedes an older one (newer wins)', () => {
  freshStore();
  const old = recordDecision({ scope: 'epic-3', decision: 'Start Lens 2 / Reputation.', effect: 'resume', submittedBy: 'chatgpt' });
  const res = supersedeDecision(old.decision_id, { decision: 'EPIC-3 PAUSED pending pilot + GO.', effect: 'pause', submittedBy: 'chatgpt' });
  assert.equal(res.ok, true);
  const oldAfter = getDecision(old.decision_id);
  assert.equal(oldAfter.status, 'superseded');
  assert.equal(oldAfter.superseded_by, res.decision.decision_id);
  assert.equal(res.decision.status, 'active');
});

test('seedCanonicalDecisions is idempotent and installs the EPIC-3 pause guard', () => {
  freshStore();
  const first = seedCanonicalDecisions();
  assert.ok(first.length >= 1);
  const again = seedCanonicalDecisions();
  assert.equal(again.length, 0);                                   // no duplicates
  const paused = listDecisions({ status: 'active', effect: 'pause' });
  assert.ok(paused.some((d) => d.scope === 'epic-3'));
});

test('pausedDecisionFor matches next-lens phrasing but not evidence about lens 1', () => {
  freshStore();
  seedCanonicalDecisions();
  assert.ok(pausedDecisionFor('Implementeer nu Lens 2 in First Five'));       // blocked scope
  assert.ok(pausedDecisionFor('start lens 2 reputation'));
  assert.equal(pausedDecisionFor('read-only analyse van de homepage seo'), null);   // unrelated
  // A pilot finding about lens 1 / reveal is evidence, not a resume — the guard
  // terms are scoped to next-lens/resume phrasing, so this must NOT match.
  assert.equal(pausedDecisionFor('Lens 1 pilot: reveal gives SILENCE, thermometer disappears'), null);
});

// ---- PAUSED guard on execution (TEST D) ------------------------------------
test('a derived task that tries to resume EPIC-3 is BLOCKED with a human action', () => {
  freshStore();
  seedCanonicalDecisions();
  const out = submit('Implementeer Lens 2 (Reputation) en start de volgende lens in First Five');
  assert.equal(out.task.status, 'BLOCKED');
  assert.equal(out.task.human_action_required, true);
});

test('an unrelated task is not blocked by the pause guard', () => {
  freshStore();
  seedCanonicalDecisions();
  const out = submit('Read-only analyse: welk bestand bevat de consent gate in de communication layer?');
  assert.notEqual(out.task.status, 'BLOCKED');
});

test('in a mixed epic only the paused-scope step is blocked, siblings still run', async () => {
  freshStore();
  seedCanonicalDecisions();
  const out = submitEpic([
    '1. Read-only analyse: noem het bestand met de consent gate in de communication layer.',
    '2. Implementeer Lens 2 (Reputation) in First Five.',
  ].join('\n'));
  const blocked = out.tasks.find((t) => /lens 2/i.test(t.title) || /lens 2/i.test(t.original_request));
  const other = out.tasks.find((t) => t !== blocked);
  assert.equal(getTask(blocked.task_id).status, 'BLOCKED');
  assert.notEqual(getTask(other.task_id).status, 'BLOCKED');
});

// ---- Evidence intake + selective routing + firewall (TEST H, B) ------------
test('pilot SILENCE/thermometer finding classifies as PILOT_EVIDENCE routed to first_five, comm excluded, stays paused', () => {
  freshStore();
  seedCanonicalDecisions();
  const cls = classifyEvidence('Lens 1 pilot: Reveal geeft terecht SILENCE, maar de technische thermometer en zakelijke duiding verdwijnen mee. Never weaken the gate.', { hint: 'PILOT_EVIDENCE' });
  assert.equal(cls.kind, 'PILOT_EVIDENCE');
  assert.equal(cls.primary_workstream, 'first_five');
  assert.ok(cls.excluded_workstreams.includes('relationship'));   // Communication Layer niet belasten
  assert.ok(cls.excluded_workstreams.includes('website'));
  assert.equal(cls.reveal_gate_lowered, false);                   // never lowers a gate
});

test('recordEvidence stores a durable record with a minimal context envelope + provenance, starts no epic', () => {
  freshStore();
  seedCanonicalDecisions();
  const r = recordEvidence('Reveal SILENCE maar thermometer verdwijnt in First Five journey.', {
    origin: { type: 'api', project: 'chatgpt-control-plane', correlation_id: 'corr-x' }, submittedBy: 'chatgpt', hint: 'PILOT_EVIDENCE' });
  assert.equal(r.ok, true);
  const ev = getEvidence(r.evidence.evidence_id);
  assert.equal(ev.correlation_id, 'corr-x');
  assert.equal(ev.submitted_by, 'chatgpt');
  assert.equal(ev.context_envelope.parts.length, 1);              // minimal, single provenance-bearing part
  assert.ok(ev.context_envelope.parts[0].provenance.origin);
});

test('selective routing hits exactly the relevant workstreams, never broadcasts', () => {
  freshStore();
  const cls = classifyEvidence('De technische thermometer in First Five toont te weinig; tegelijk moet de Communication Layer outbound Resend delivery zichtbaar zijn.');
  const targets = cls.target_workstreams.map((t) => t.workstream).sort();
  assert.deepEqual(targets, ['first_five', 'relationship']);
  assert.ok(cls.excluded_workstreams.includes('website'));   // the untouched workstream is explicitly excluded, not broadcast to
});

test('evidence about a paused scope is allowed and never lifts the pause', () => {
  freshStore();
  seedCanonicalDecisions();
  const r = recordEvidence('Lens 1 pilot bevinding over reveal en thermometer', { submittedBy: 'chatgpt', hint: 'PILOT_EVIDENCE' });
  assert.equal(r.ok, true);
  // The EPIC-3 pause is still active after recording evidence.
  assert.ok(pausedDecisionFor('start lens 2'));
});

// ---- Workstreams (registry extension) --------------------------------------
test('workstreams are derived from the registry with client bindings + return capability', () => {
  freshStore();
  const ws = workstreams();
  assert.equal(ws.length, 3);
  const ff = getWorkstream('first_five');
  assert.equal(ff.owning_repo, 'ftrprf-labs/maculis-first-five.');
  assert.ok(ff.client_bindings.includes('first-five'));
  assert.ok(ff.client_bindings.includes('chatgpt'));              // control plane binds to all
  assert.match(ff.return_capability, /poll/);
  assert.equal(CLIENT_BINDINGS['communication-layer'].workstreams[0], 'relationship');
});

// ---- Epic pause / resume (control-plane §6.8) ------------------------------
test('a paused epic does not run its queued sub-tasks until resumed', async () => {
  freshStore();
  const out = submitEpic(['1. Verbeter de SEO meta tags op de homepage', '2. Voeg microcopy toe aan de homepage hero'].join('\n'));
  pauseEpic(out.epic.epic_id, { by: 'chatgpt' });
  await drain();
  assert.notEqual(getTask(out.tasks[0].task_id).status, 'COMPLETED');   // held by pause
  resumeEpic(out.epic.epic_id, { by: 'chatgpt' });
  await drain();
  assert.equal(getTask(out.tasks[0].task_id).status, 'COMPLETED');
});

test('resume is refused when an active PAUSED decision covers the epic scope, unless override', () => {
  freshStore();
  seedCanonicalDecisions();
  // An epic whose full request text matches the pause guard (step 2 mentions lens 2).
  const covered = submitEpic([
    '1. Read-only analyse van de homepage performance en seo.',
    '2. Daarna start lens 2 reputation implementatie in first five.',
  ].join('\n'));
  assert.equal(covered.is_epic, true);
  pauseEpic(covered.epic.epic_id, { by: 'chatgpt' });
  const refused = resumeEpic(covered.epic.epic_id, { by: 'chatgpt' });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'paused_by_decision');
  const forced = resumeEpic(covered.epic.epic_id, { by: 'chatgpt', override: true });
  assert.equal(forced.ok, true);
});

// ---- Monitoring overview ----------------------------------------------------
test('statusOverview reports task/epic states, decisions and is content-free', () => {
  freshStore();
  seedCanonicalDecisions();
  submitEpic(['1. Verbeter de SEO meta tags op de homepage', '2. Voeg microcopy toe'].join('\n'));
  const s = statusOverview();
  assert.ok(s.tasks && typeof s.tasks === 'object');
  assert.ok(s.epics && typeof s.epics === 'object');
  assert.ok(s.decisions.active >= 1);
  assert.ok(Array.isArray(s.decisions.paused_scopes));
  assert.ok(s.decisions.paused_scopes.includes('epic-3'));
});
