// Future Cockpit — Slice 5 (collaborative): work from digital colleagues lands in ONE attention model.
//
// Human and digital colleagues work from the same relational reality. Authored work (a finding, a
// proposal, an approval request) is persisted with origin, owner, evidence and a proposal, merges into
// the same ranked/bucketed attention stream as derived signals, aggregates per relation (no
// agent-spam), and is resolved by a human (view/approve/edit/take_over/reject/complete). Approving a
// proposed lead materialises a real relation in the SAME reality — no second database. Pure layer
// always runs; the DB + route layers skip without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { expectedSilenceThreshold, workElement, aggregateSignals } from '../server/comm/signals.mjs';

// Set BEFORE routes.mjs (and thus config.mjs) is dynamically imported, so the keyed ingestion path is
// exercised. The test file's static imports do not pull config, so this runs first.
process.env.AGENT_INGEST_KEY = process.env.AGENT_INGEST_KEY || 'test-agent-key';

// ---- pure -------------------------------------------------------------------------------------
test('cadence seam: default silence threshold is a single seam, overridable per relation', () => {
  assert.equal(expectedSilenceThreshold(), 45);
  assert.equal(expectedSilenceThreshold({ cadenceDays: 14 }), 14, 'future contextual cadence hook');
  assert.equal(expectedSilenceThreshold({ cadenceDays: 0 }), 45, 'ignores non-positive');
});

test('a work item folds onto a relation card instead of creating a second card (no double attention)', () => {
  // A derived inbound signal + an authored work item on the SAME contact → one card.
  const inbound = { key: 'COMM:v1', kind: 'signal', type: 'INBOUND_QUESTION', bucket: 'NU', priority: 90,
    contactId: 'k', conversationId: 'v1', who: 'Kim', reason: 'Kim vraagt iets.', relevantAt: '2026-08-17T10:00:00Z',
    provenance: { source: 'COMM' } };
  const work = workElement({ id: 'w1', type: 'AGENT_FINDING', bucket: 'KLAAR', priority: 55, contactId: 'k',
    who: 'Kim', title: 'Antwoord voorbereid', origin: { kind: 'AGENT', key: 'conversation', label: 'Gesprekscollega' },
    needs: 'review', actions: ['view', 'take_over', 'complete', 'reject'], createdAt: '2026-08-17T09:00:00Z' });
  const cards = aggregateSignals([work, inbound]);
  assert.equal(cards.length, 1, 'one relation, one card');
  assert.equal(cards[0].primary.type, 'INBOUND_QUESTION', 'the more urgent derived signal leads');
  assert.equal(cards[0].work.length, 1, 'the colleague work rides along on the card');
  assert.equal(cards[0].work[0].origin.label, 'Gesprekscollega');
});

test('a work item with no relation stands as its own card carrying its origin', () => {
  const work = workElement({ id: 'w2', type: 'AGENT_PROPOSAL', bucket: 'NU', priority: 85, contactId: null,
    who: 'Tibo Claes', title: 'Mogelijke nieuwe relatie', origin: { kind: 'AGENT', key: 'growth', label: 'Growth' },
    needs: 'approval', actions: ['view', 'approve', 'edit', 'reject'], createdAt: '2026-08-17T09:00:00Z' });
  const cards = aggregateSignals([work]);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, 'work');
  assert.equal(cards[0].primary.origin.label, 'Growth');
  assert.equal(cards[0].primary.needs, 'approval');
});

// ---- DB + service -----------------------------------------------------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — collab DB E2E skipped' };

test('DB — record, dedup, merge, resolve, approve-creates-relation, ownership, isolation, idempotency', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { recordWorkItem, resolveWorkItem, listWorkItems } = await import('../server/comm/work.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, ai_draft, follow_up, activity, audit_event, attention_item cascade');
    const tenantId = await getDefaultTenantId();
    const other = (await query("insert into tenant(slug,name) values ('collab-other','Other') on conflict (slug) do update set name=excluded.name returning id")).rows[0].id;
    const now = new Date('2026-08-17T12:00:00.000Z');

    // An existing relation for the colleague to work on.
    const org = (await query("insert into organization(tenant_id,name) values ($1,'De Brug') returning id", [tenantId])).rows[0].id;
    const kim = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'kim@debrug.be','Kim','kim@debrug.be') returning id", [tenantId, org])).rows[0].id;

    // recordWorkItem — an awareness finding on Kim; defaults derive bucket/priority/actions from needs.
    const f = await recordWorkItem(tenantId, { origin: { kind: 'AGENT', key: 'relationship', label: 'Relatiecollega' },
      type: 'AGENT_FINDING', relation: { contactId: kim, organizationId: org },
      title: 'Afwijkend patroon', reason: 'Anders dan gebruikelijk.', evidence: { demo: true, observations: ['trager'] },
      proposal: { summary: 'Goed om te weten.', needs: 'awareness' }, dedupKey: 'pattern:kim' });
    assert.ok(f.ok && f.id);
    const shaped = (await listWorkItems(tenantId, { contactId: kim })).map((r) => r);
    assert.equal(shaped.length, 1);
    assert.equal(shaped[0].bucket, 'RADAR', 'awareness → RADAR by default');
    assert.equal(shaped[0].owner_kind, 'HUMAN', 'default owner is human, not an implicit single user assumption baked in');

    // dedup — same colleague, same dedupKey → update in place, no stacking.
    const f2 = await recordWorkItem(tenantId, { origin: { kind: 'AGENT', key: 'relationship', label: 'Relatiecollega' },
      type: 'AGENT_FINDING', relation: { contactId: kim }, title: 'Afwijkend patroon (bijgewerkt)',
      proposal: { needs: 'awareness' }, dedupKey: 'pattern:kim' });
    assert.equal(f2.deduped, true);
    assert.equal(f2.id, f.id);
    assert.equal((await query("select count(*)::int n from attention_item where tenant_id=$1 and status='open'", [tenantId])).rows[0].n, 1, 'exactly one open item');

    // Growth proposes a NEW relation (no contact yet) needing approval.
    const g = await recordWorkItem(tenantId, { origin: { kind: 'AGENT', key: 'growth', label: 'Growth' },
      type: 'AGENT_PROPOSAL', proposedRelation: { name: 'Tibo Claes', org: 'Veldwerk', email: 'tibo@veldwerk.be' },
      title: 'Mogelijke nieuwe relatie', proposal: { summary: 'Toevoegen?', needs: 'approval' }, dedupKey: 'lead:tibo' });
    assert.ok(g.ok);

    // buildRadar merges work into the ONE model.
    let radar = await buildRadar(tenantId, { now });
    assert.ok(radar.counts.work >= 2, 'work items counted');
    const growthCard = [...radar.buckets.NU].find((c) => c.kind === 'work' && c.primary.origin && c.primary.origin.label === 'Growth');
    assert.ok(growthCard, 'the Growth proposal is its own NU card');
    assert.equal(growthCard.primary.needs, 'approval');
    // Kim's awareness finding folded onto her (only) card, not a separate one.
    const kimCards = [...radar.buckets.NU, ...radar.buckets.KLAAR, ...radar.buckets.RADAR].filter((c) => c.contactId === kim);
    assert.equal(kimCards.length, 1, 'no double attention for Kim');
    assert.ok(kimCards[0].work.some((w) => w.origin.label === 'Relatiecollega'));

    // Deep-links: cards carry the ids the UI routes on.
    assert.ok(kimCards[0].contactId === kim);

    // approve the proposed lead → materialises a real relation in the same reality.
    const before = (await query('select count(*)::int n from contact where tenant_id=$1', [tenantId])).rows[0].n;
    const appr = await resolveWorkItem(tenantId, g.id, 'approve', { actorKey: 'lud' });
    assert.ok(appr.ok && appr.result.createdContactId, 'approval created the relation');
    const after = (await query('select count(*)::int n from contact where tenant_id=$1', [tenantId])).rows[0].n;
    assert.equal(after, before + 1, 'exactly one relation created');
    // transform-after-action: the approved item leaves the OPEN attention stream.
    radar = await buildRadar(tenantId, { now });
    assert.ok(![...radar.buckets.NU].some((c) => c.kind === 'work' && c.primary.origin && c.primary.origin.label === 'Growth'), 'approved work leaves NU');

    // take_over transfers ownership to a human without closing the work.
    const to = await resolveWorkItem(tenantId, f.id, 'take_over', { actorKey: 'lud' });
    assert.ok(to.ok);
    assert.equal((await query('select owner_kind, owner_key from attention_item where id=$1', [f.id])).rows[0].owner_key, 'lud');
    assert.equal((await query("select status from attention_item where id=$1", [f.id])).rows[0].status, 'open', 'take_over keeps it open');

    // complete closes it; re-resolving a closed item is refused (idempotency of decisions).
    const done = await resolveWorkItem(tenantId, f.id, 'complete', { actorKey: 'lud' });
    assert.ok(done.ok);
    const again = await resolveWorkItem(tenantId, f.id, 'complete', { actorKey: 'lud' });
    assert.equal(again.ok, false, 'a resolved item cannot be resolved again');

    // reject path.
    const r = await recordWorkItem(tenantId, { origin: { kind: 'AGENT', key: 'growth', label: 'Growth' }, type: 'AGENT_PROPOSAL', title: 'Weg te wuiven', proposal: { needs: 'approval' } });
    const rej = await resolveWorkItem(tenantId, r.id, 'reject', { actorKey: 'lud' });
    assert.ok(rej.ok);
    assert.equal((await query('select status from attention_item where id=$1', [r.id])).rows[0].status, 'rejected');

    // tenant isolation — a foreign-tenant work item never appears.
    await recordWorkItem(other, { origin: { kind: 'AGENT', key: 'growth', label: 'Growth' }, type: 'AGENT_PROPOSAL', title: 'Andere tenant', proposal: { needs: 'approval' } });
    const mine = await buildRadar(tenantId, { now });
    assert.ok(![...mine.buckets.NU, ...mine.buckets.KLAAR, ...mine.buckets.RADAR].some((c) => c.primary.reason === 'Andere tenant'), 'foreign tenant excluded');
    // and resolving another tenant's item by id is refused.
    const foreignItem = (await query("select id from attention_item where tenant_id=$1 limit 1", [other])).rows[0].id;
    assert.equal((await resolveWorkItem(tenantId, foreignItem, 'approve', {})).ok, false, 'cannot resolve across tenants');
  } finally {
    await closePool();
  }
});

// ---- route: the agent ingestion contract ------------------------------------------------------
async function call(method, path, { body = null, authed = true, headers = {} } = {}) {
  const { handleCockpit } = await import('../server/cockpit/routes.mjs');
  const req = new Readable({ read() {} });
  Object.assign(req, { method, url: path, socket: { remoteAddress: '127.0.0.1' }, headers });
  if (body != null) req.push(Buffer.from(JSON.stringify(body)));
  req.push(null);
  return await new Promise((resolve) => {
    const res = { writeHead(s) { this._s = s; }, end(b) { resolve({ status: this._s, data: b ? JSON.parse(b) : null }); } };
    const u = new URL(path, 'http://x');
    handleCockpit(req, res, { pathname: u.pathname, method, isAuthed: () => authed });
  });
}

test('DB route — agent ingestion accepts the key OR an admin session, and lands work; resolve is admin-only', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { config } = await import('../server/config.mjs');
  config.agentIngestKey = 'test-agent-key'; // routes read this per-request, so setting it now is enough
  try {
    await runMigrations({ silent: true });
    await query('truncate attention_item cascade');
    const workBody = { origin: { kind: 'AGENT', key: 'growth', label: 'Growth' }, type: 'AGENT_PROPOSAL',
      title: 'Handoff-contract test', proposal: { summary: 'x', needs: 'approval' }, dedupKey: 'handoff:1' };

    // Unauthenticated + no key → refused.
    const noAuth = await call('POST', '/api/cockpit/agent/work', { body: workBody, authed: false });
    assert.equal(noAuth.status, 401, 'no session and no key → 401');

    // Unauthenticated + correct key → accepted (out-of-process colleague).
    const keyed = await call('POST', '/api/cockpit/agent/work', { body: workBody, authed: false, headers: { 'x-agent-key': 'test-agent-key' } });
    assert.equal(keyed.status, 200);
    assert.equal(keyed.data.ok, true);

    // Same key + same dedupKey → idempotent (no stacking through the endpoint either).
    const keyed2 = await call('POST', '/api/cockpit/agent/work', { body: workBody, authed: false, headers: { 'x-agent-key': 'test-agent-key' } });
    assert.equal(keyed2.data.deduped, true);

    // Admin session also lands work (the same contract).
    const authed = await call('POST', '/api/cockpit/agent/work', { body: { ...workBody, dedupKey: 'handoff:2' }, authed: true });
    assert.equal(authed.data.ok, true);

    // It shows on Vandaag and in the work list.
    const today = await call('GET', '/api/cockpit/today', { authed: true });
    const all = [...today.data.buckets.NU, ...today.data.buckets.KLAAR, ...today.data.buckets.RADAR];
    assert.ok(all.some((c) => c.primary.reason === 'Handoff-contract test'), 'ingested work reaches Vandaag');

    // Resolving requires an admin session.
    const id = (await query("select id from attention_item where dedup_key='handoff:1' limit 1")).rows[0].id;
    assert.equal((await call('POST', '/api/cockpit/work/' + id + '/approve', { authed: false })).status, 401, 'resolve is admin-only');
    const ok = await call('POST', '/api/cockpit/work/' + id + '/complete', { authed: true });
    assert.equal(ok.data.ok, true);
  } finally {
    await closePool();
  }
});

// ---- FAILED delivery is a TECHNICAL fact, not a relational signal ------------------------------
test('DB — a historical FAILED superseded by a SENT creates no relational attention', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');
  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, ai_draft, follow_up, attention_item cascade');
    const tenantId = await getDefaultTenantId();
    const now = new Date();
    const ago = (m) => new Date(now.getTime() - m * 60000).toISOString();
    const org = (await query("insert into organization(tenant_id,name) values ($1,'Org') returning id", [tenantId])).rows[0].id;
    const c = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'x@x.nl','X','x@x.nl') returning id", [tenantId, org])).rows[0].id;
    const conv = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'ANSWERED',$4,$4) returning id", [tenantId, c, org, ago(60)])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','x@x.nl','vraag','RECEIVED',$3)", [tenantId, conv, ago(60)]);
    // A technical FAILED, then a later SENT that supersedes it.
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','poging','FAILED',$3)", [tenantId, conv, ago(40)]);
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','antwoord','SENT',$3)", [tenantId, conv, ago(10)]);
    const radar = await buildRadar(tenantId, { now });
    const card = [...radar.buckets.NU, ...radar.buckets.KLAAR, ...radar.buckets.RADAR].find((x) => x.contactId === c);
    assert.ok(!card, 'the superseded technical failure does not raise attention or become a relational signal');
    assert.ok(!radar.signals.some((s) => s.contactId === c), 'no signal derived from the old delivery failure');
  } finally {
    await closePool();
  }
});
