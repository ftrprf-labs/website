// Maculis AI Context Layer — the shared foundation, proven on Gesprekken. Constitution (shared DNA)
// → role context → AUTHORISED work context → task context. Provider-agnostic: these tests use the
// deterministic mock, no live model. They prove the LAYER changes the answer and enforces access —
// not that a model is smart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { constitutionText, CONSTITUTION_VERSION, systemForRole, roleBrief } from '../server/comm/ai/constitution.mjs';
import { decideResponse, authorizeContext, assembleContext, decisionLabel, RESPONSE_DECISIONS } from '../server/comm/ai/context-layer.mjs';

// ---- Constitution: one shared, versioned DNA ---------------------------------------------------
test('Constitution is compact, versioned, and carries the V1 principles incl. "relatie vóór transactie"', () => {
  const t = constitutionText();
  assert.match(t, /maculis-constitution-1/);
  assert.match(t, /Relatie vóór transactie/i);
  assert.match(t, /Aandacht beschermen/i);
  assert.match(t, /Je verstuurt nooit zelf/i);
  assert.equal(CONSTITUTION_VERSION, 'maculis-constitution-1');
});

test('every role shares the SAME Constitution DNA; role adds its own mission + boundaries', () => {
  const comm = systemForRole('comm_assistant');
  const scout = systemForRole('scout');
  assert.ok(comm.includes(constitutionText()) && scout.includes(constitutionText()), 'shared DNA');
  assert.match(comm, /communicatie-assistent/i);
  assert.match(scout, /externe signalen/i);
  assert.notEqual(comm, scout, 'role context differs on top of shared DNA');
});

// ---- Task context: decideResponse is semantic, not message order -------------------------------
const msg = (direction, body, mins) => ({ direction, body_text: body, channel: 'EMAIL', created_at: new Date(Date.now() - mins * 60000).toISOString() });

test('decideResponse: an inbound question → REPLY_NEEDED', () => {
  const r = decideResponse({ recent: [msg('OUTBOUND', 'Hoi', 120), msg('INBOUND', 'Zou de tweede sessie deze maand nog kunnen?', 10)], followUps: [] });
  assert.equal(r.decision, 'REPLY_NEEDED');
});
test('decideResponse: an inbound closing/thanks with no question → NO_REPLY_NEEDED', () => {
  const r = decideResponse({ recent: [msg('OUTBOUND', 'Hier is het.', 120), msg('INBOUND', 'Top, bedankt! Geen haast.', 10)], followUps: [] });
  assert.equal(r.decision, 'NO_REPLY_NEEDED');
});
test('decideResponse: we replied last, nothing open → WAITING_FOR_THEM (not "no reply" by order)', () => {
  const r = decideResponse({ recent: [msg('INBOUND', 'Kun je iets sturen?', 120), msg('OUTBOUND', 'Bij deze, alsjeblieft.', 10)], followUps: [] });
  assert.equal(r.decision, 'WAITING_FOR_THEM');
});
test('decideResponse: a due follow-up → ACTION_NEEDED regardless of who wrote last', () => {
  const r = decideResponse({ recent: [msg('OUTBOUND', 'Tot snel.', 200)], followUps: [{ id: 'f1', title: 'Offerte opvolgen', due_at: new Date(Date.now() - 86400000).toISOString() }] });
  assert.equal(r.decision, 'ACTION_NEEDED');
  assert.ok(r.provenance.some((p) => p.type === 'follow_up'));
});
test('decideResponse: an ambiguous inbound → UNCERTAIN (no false certainty)', () => {
  const r = decideResponse({ recent: [msg('OUTBOUND', 'Hoi', 120), msg('INBOUND', 'We hebben het intern besproken.', 10)], followUps: [] });
  assert.equal(r.decision, 'UNCERTAIN');
  assert.ok(RESPONSE_DECISIONS.includes(r.decision));
  assert.equal(typeof decisionLabel(r.decision), 'string');
});

// ---- Authorised work context: PRIVATE / disallowed sources stripped BEFORE the prompt ----------
test('authorizeContext: the comm-assistant never receives Lens PRIVATE or unconfirmed memory', () => {
  const ctx = {
    contact: { first_name: 'Kim' }, org: { name: 'De Brug' },
    recent: [msg('INBOUND', 'vraag?', 10)],
    memory: [{ kind: 'agreement', content: 'Bevestigd', confidence: 'confirmed' }, { kind: 'fact', content: 'Onbevestigd voorstel', confidence: 'proposed' }],
    followUps: [{ id: 'f1', title: 'X' }],
    lensPrivate: { reveal: 'GEHEIME reveal-inhoud', answers: { recognition: 'ja' } },
    refs: [],
  };
  const out = authorizeContext(ctx, { role: 'comm_assistant' });
  assert.equal(out.lensPrivate, undefined, 'Lens PRIVATE removed before it can reach a prompt');
  assert.ok(out.excluded.includes('lens_private'));
  assert.ok(!out.memory.some((m) => m.confidence === 'proposed'), 'unconfirmed memory never enters generation context');
  assert.ok(out.memory.some((m) => m.content === 'Bevestigd'), 'confirmed memory stays');
  // The rendered prompt must not contain the private reveal text.
  const asm = assembleContext({ role: 'comm_assistant', ctx });
  assert.ok(!asm.workContext.includes('GEHEIME'), 'private Lens content never appears in the assembled prompt');
});

test('authorizeContext: an agent role gets NO relationship/comm/Lens context at all', () => {
  const ctx = { contact: { first_name: 'Kim' }, org: { name: 'De Brug' }, recent: [msg('INBOUND', 'x', 5)], memory: [{ kind: 'fact', content: 'y', confidence: 'confirmed' }], followUps: [{ id: 'f', title: 'z' }], lensPrivate: { reveal: 'x' }, refs: [] };
  const out = authorizeContext(ctx, { role: 'scout' });
  assert.equal(out.recent.length, 0);
  assert.equal(out.memory.length, 0);
  assert.equal(out.contact, null);
  assert.equal(out.lensPrivate, undefined);
});

// ---- DB-backed proof: history + a prior commitment change the concept (mock, deterministic) ----
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — context-layer DB proof skipped' };

test('DB — a prior agreement changes the draft; Warmer/Korter keep it; privacy yields no context', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const ai = await import('../server/comm/ai/service.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, relationship_memory, follow_up cascade');
    const tenantId = await getDefaultTenantId();
    const org = (await query("insert into organization(tenant_id,name) values ($1,'De Brug') returning id", [tenantId])).rows[0].id;
    const kim = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'kim@debrug.be','Kim','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;

    // Conversation A — no prior history/commitment.
    const cA = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag',now(),now()) returning id", [tenantId, kim, org])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@debrug.be','Kunnen jullie ook naar arbeidsmarktcommunicatie kijken?','RECEIVED',now())", [tenantId, cA]);
    const draftA = await ai.draftReply({ tenantId, conversationId: cA, channel: 'EMAIL' });

    // Conversation B — same inbound, but a CONFIRMED prior agreement exists in the relationship.
    const cB = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Vraag',now(),now()) returning id", [tenantId, kim, org])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@debrug.be','Kunnen jullie ook naar arbeidsmarktcommunicatie kijken?','RECEIVED',now())", [tenantId, cB]);
    await query("insert into relationship_memory(tenant_id,contact_id,kind,content,source,confidence) values ($1,$2,'agreement','We sturen na de zomer een voorstel voor de tweede sessie','human','confirmed')", [tenantId, kim]);
    const draftB = await ai.draftReply({ tenantId, conversationId: cB, channel: 'EMAIL' });

    // PROOF 1: relevant relationship history changes the concept.
    assert.notEqual(draftA.body, draftB.body, 'the prior agreement changes the draft');
    assert.match(draftB.body, /eerder afspraken|voorstel voor de tweede sessie/i, 'the concept carries the prior commitment');
    assert.ok(!/eerder afspraken/i.test(draftA.body), 'without the agreement, the draft does not invent one');

    // PROOF 2: the first concept already carries the Maculis tone (no repair needed).
    assert.match(draftB.body, /Dank je voor je bericht/i);

    // PROOF 3: Warmer/Korter revise from the same context and PRESERVE the commitment.
    const warmer = await ai.reviseDraft({ currentBody: draftB.body, instruction: 'warmer', channel: 'EMAIL', tenantId, conversationId: cB });
    assert.match(warmer.body, /Wat goed om van je te horen/i, 'warmer applied');
    assert.match(warmer.body, /afspraken|voorstel voor de tweede sessie/i, 'warmer keeps the commitment');
    const korter = await ai.reviseDraft({ currentBody: draftB.body, instruction: 'korter', channel: 'EMAIL', tenantId, conversationId: cB });
    assert.match(korter.body, /afspraken|voorstel voor de tweede sessie/i, 'korter keeps the commitment (meaning preserved, not blindly truncated)');

    // PROOF 4: the AI assesses what is relationally needed BEFORE writing.
    assert.equal(draftB.assessment.decision, 'REPLY_NEEDED', 'an inbound question is assessed as reply-needed');
    const assessAfterReply = await ai.assessConversation({ tenantId, conversationId: cB });
    assert.ok(RESPONSE_DECISIONS.includes(assessAfterReply.decision));

    // PROOF 5: a privacy conversation yields no draft context at all.
    const cP = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',true,'NEW',now(),now()) returning id", [tenantId, kim, org])).rows[0].id;
    const draftP = await ai.draftReply({ tenantId, conversationId: cP, channel: 'EMAIL' });
    assert.equal(draftP.ok, false);
    assert.equal(draftP.reason, 'privacy_excluded');
  } finally {
    await closePool();
  }
});
