// Maculis AI Context Layer — the SECOND gate: task relevance. Deterministic, no DB, no live model.
// Proves that after authorization/privacy, an available-but-task-irrelevant fact is withheld from the
// model, while commitments and communication-shaping preferences are kept, and that the SAME selected
// task context is produced for the first concept and for a Warmer/Korter revise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTaskRelevance, assembleContext } from '../server/comm/ai/context-layer.mjs';

const msg = (direction, body) => ({ direction, body_text: body, channel: 'EMAIL', created_at: new Date().toISOString() });

// The scenario-3 shape: an arbeidsmarktcommunicatie question, a relevant prior agreement, and a true
// but task-irrelevant fact (the office move).
const baseCtx = () => ({
  contact: { first_name: 'Kim' }, org: { name: 'De Brug' },
  conversation: { subject: 'Arbeidsmarktcommunicatie' },
  recent: [msg('INBOUND', 'Kunnen jullie ook naar arbeidsmarktcommunicatie kijken? We willen met dezelfde blik verder.')],
  memory: [
    { kind: 'agreement', content: 'We sturen na de zomer een voorstel voor de tweede sessie', confidence: 'confirmed' },
    { kind: 'fact', content: 'Hun kantoor verhuist in het voorjaar naar een nieuw pand aan de kaai', confidence: 'confirmed' },
  ],
  followUps: [], refs: [],
});

test('relevance gate: commitment is kept, an irrelevant fact is withheld', () => {
  const r = selectTaskRelevance(baseCtx());
  const kept = r.memory.map((m) => m.content);
  assert.ok(kept.some((c) => /voorstel voor de tweede sessie/i.test(c)), 'the agreement is kept');
  assert.ok(!kept.some((c) => /verhuist/i.test(c)), 'the verhuizing is not offered to the model');
  assert.ok(r.withheldMemory.some((m) => /verhuist/i.test(m.content)), 'the verhuizing is in withheld');
  assert.equal(r.relevance.find((d) => /verhuist/i.test(d.content)).category, 'beschikbaar_irrelevant');
  assert.equal(r.relevance.find((d) => /tweede sessie/i.test(d.content)).category, 'relationeel_commitment');
});

test('relevance gate: a communication-shaping preference is kept', () => {
  const ctx = baseCtx();
  ctx.memory.push({ kind: 'preference', content: 'Spreekt liever even samen dan via lange mails', confidence: 'confirmed' });
  const r = selectTaskRelevance(ctx);
  assert.equal(r.relevance.find((d) => /lange mails/i.test(d.content)).category, 'relationeel_communicatievorm');
  assert.ok(r.memory.some((m) => /lange mails/i.test(m.content)), 'the belvoorkeur is kept');
});

test('relevance gate: a fact that demonstrably overlaps the task is kept (direct relevant)', () => {
  const ctx = baseCtx();
  ctx.memory.push({ kind: 'fact', content: 'Ze werken al langer aan hun arbeidsmarktcommunicatie', confidence: 'confirmed' });
  const r = selectTaskRelevance(ctx);
  const f = r.relevance.find((d) => /langer aan hun/i.test(d.content));
  assert.equal(f.category, 'direct_relevant');
  assert.ok(f.matched.includes('arbeidsmarktcommunicatie'), 'the shared content term is the demonstrable link');
});

test('relevance gate: a fact is not kept merely for being true/confirmed/recent', () => {
  // Same fact as scenario 3, but a task with NO overlap — it must stay withheld.
  const ctx = baseCtx();
  const r = selectTaskRelevance(ctx);
  assert.ok(r.withheldMemory.some((m) => /verhuist/i.test(m.content)));
});

test('assembleContext: prompt withholds the verhuizing, keeps the commitment, and is identical for the revise', () => {
  const ctx = baseCtx();
  const a = assembleContext({ role: 'comm_assistant', ctx });
  assert.ok(!/verhuist/i.test(a.workContext), 'the verhuizing never reaches the prompt');
  assert.ok(/voorstel voor de tweede sessie/i.test(a.workContext), 'the commitment reaches the prompt');
  assert.ok(a.withheld.some((m) => /verhuist/i.test(m.content)), 'withheld is reported for transparency');
  // Warmer/Korter call assembleContext again on the same ctx: the selection is deterministic and equal,
  // so an irrelevant source cannot slip back in on a revise.
  const b = assembleContext({ role: 'comm_assistant', ctx });
  assert.equal(a.workContext, b.workContext, 'first concept and revise share the same task context');
});

test('authorisation stays BEFORE relevance: Lens PRIVATE never reaches the relevance gate or the prompt', () => {
  const ctx = baseCtx();
  ctx.lensPrivate = { reveal: 'GEHEIME reveal' };
  const a = assembleContext({ role: 'comm_assistant', ctx });
  assert.ok(a.excluded.includes('lens_private'), 'authorisation stripped lensPrivate first');
  assert.ok(!/GEHEIME/i.test(a.workContext), 'no private content in the prompt');
});
