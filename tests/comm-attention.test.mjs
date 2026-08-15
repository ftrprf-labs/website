// Communication Layer — Attention Cockpit (§ ATTENTION COCKPIT).
//
// Two layers: pure derivation (always runs, no DB) and a DB-backed E2E of the read watermark,
// aggregate summary, row-indicator maps, idempotency, tenant isolation and privacy exclusion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAttention, attentionHeadline, ATTENTION_STATES, ACTIONABLE_STATES } from '../server/comm/attention.mjs';

const T0 = '2026-08-15T10:00:00.000Z';   // an inbound time
const T1 = '2026-08-15T11:00:00.000Z';   // a later read time
const Tm1 = '2026-08-15T09:00:00.000Z';  // an earlier time

// ---- 1..14 pure derivation (no DB) ----------------------------------------------------------
test('01 new inbound, never read → NEW', () => {
  const a = deriveAttention({ status: 'NEW', last_inbound_at: T0, last_read_at: null, last_dir: 'INBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'NEW'); assert.equal(a.unread, true); assert.equal(a.actionable, true);
});

test('02 read earlier, newer inbound arrived → UNREAD', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T1, last_read_at: T0, last_dir: 'INBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'UNREAD'); assert.equal(a.unread, true);
});

test('03 unread inbound + AI proposal ready → REPLY_READY', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T0, last_read_at: null, last_dir: 'INBOUND', has_ai_proposed: true, contact_id: 'c1' });
  assert.equal(a.state, 'REPLY_READY'); assert.equal(a.hasAiProposed, true);
});

test('04 read up to date, last word theirs → NEEDS_ACTION', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T0, last_read_at: T1, last_dir: 'INBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'NEEDS_ACTION'); assert.equal(a.unread, false); assert.equal(a.actionable, true);
});

test('05 read, we replied last, still open → WAITING_FOR_CUSTOMER (calm)', () => {
  const a = deriveAttention({ status: 'ANSWERED', last_inbound_at: T0, last_read_at: T1, last_dir: 'OUTBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'WAITING_FOR_CUSTOMER'); assert.equal(a.actionable, false);
});

test('06 closed and nothing new → RESOLVED (calm)', () => {
  const a = deriveAttention({ status: 'CLOSED', last_inbound_at: T0, last_read_at: T1, last_dir: 'OUTBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'RESOLVED'); assert.equal(a.actionable, false);
});

test('07 delivery problem overrides everything → DELIVERY_PROBLEM', () => {
  const a = deriveAttention({ status: 'ANSWERED', last_inbound_at: T0, last_read_at: T1, last_dir: 'OUTBOUND', has_delivery_problem: true, contact_id: 'c1' });
  assert.equal(a.state, 'DELIVERY_PROBLEM'); assert.equal(a.actionable, true);
});

test('08 delivery problem surfaces even when unread', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T1, last_read_at: null, last_dir: 'INBOUND', has_delivery_problem: true, contact_id: 'c1' });
  assert.equal(a.state, 'DELIVERY_PROBLEM');
});

test('09 closed but reopened with new inbound is NOT resolved', () => {
  const a = deriveAttention({ status: 'CLOSED', last_inbound_at: T1, last_read_at: T0, last_dir: 'INBOUND', contact_id: 'c1' });
  assert.notEqual(a.state, 'RESOLVED'); assert.equal(a.state, 'UNREAD');
});

test('10 no inbound at all, we sent first → WAITING_FOR_CUSTOMER', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: null, last_read_at: null, last_dir: 'OUTBOUND', contact_id: 'c1' });
  assert.equal(a.state, 'WAITING_FOR_CUSTOMER'); assert.equal(a.unread, false);
});

test('11 unknown contact flag when contact_id is null', () => {
  const a = deriveAttention({ status: 'NEW', last_inbound_at: T0, last_read_at: null, last_dir: 'INBOUND', contact_id: null });
  assert.equal(a.unknownContact, true); assert.equal(a.state, 'NEW');
});

test('12 watermark EQUAL to inbound time counts as READ (not unread)', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T0, last_read_at: T0, last_dir: 'INBOUND', contact_id: 'c1' });
  assert.equal(a.unread, false); assert.equal(a.state, 'NEEDS_ACTION');
});

test('13 AI proposal but already READ → NEEDS_ACTION, not REPLY_READY', () => {
  const a = deriveAttention({ status: 'OPEN', last_inbound_at: T0, last_read_at: T1, last_dir: 'INBOUND', has_ai_proposed: true, contact_id: 'c1' });
  assert.equal(a.state, 'NEEDS_ACTION');
});

test('14 priority ordering + actionable set are consistent', () => {
  assert.equal(ATTENTION_STATES[0], 'DELIVERY_PROBLEM', 'delivery problem is most urgent');
  assert.ok(ATTENTION_STATES.indexOf('REPLY_READY') < ATTENTION_STATES.indexOf('WAITING_FOR_CUSTOMER'));
  assert.ok(!ACTIONABLE_STATES.has('WAITING_FOR_CUSTOMER') && !ACTIONABLE_STATES.has('RESOLVED'));
  assert.ok(ACTIONABLE_STATES.has('NEW') && ACTIONABLE_STATES.has('UNREAD') && ACTIONABLE_STATES.has('NEEDS_ACTION'));
});

// ---- canonical headline (meaning over counts, correct singular/plural, honest 'ready' line) -----
test('H1 zero-state copy is calm, not "0 berichten"', () => {
  const h = attentionHeadline(0, 0);
  assert.equal(h.zero, true);
  assert.equal(h.primary, 'Je bent bij.');
  assert.equal(h.secondary, 'Voor nu hoeft er niets van je.');
});
test('H2 singular vs plural is grammatically correct', () => {
  assert.equal(attentionHeadline(1, 0).primary, '1 gesprek vraagt je aandacht');
  assert.equal(attentionHeadline(3, 0).primary, '3 gesprekken vragen je aandacht');
});
test('H3 "answer ready" second line only states what is true', () => {
  assert.equal(attentionHeadline(2, 0).secondary, null, 'no proposals → no claim');
  assert.equal(attentionHeadline(1, 1).secondary, 'Er staat al een antwoord voor je klaar.');
  assert.equal(attentionHeadline(3, 3).secondary, 'Voor alle 3 staat al een antwoord klaar.');
  assert.equal(attentionHeadline(3, 1).secondary, 'Voor één staat al een antwoord klaar.');
  assert.equal(attentionHeadline(3, 2).secondary, 'Voor 2 staat al een antwoord klaar.');
});

// ---- 15..22 DB-backed (skipped without a real DATABASE_URL) ----------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — attention DB E2E skipped' };

test('attention DB E2E: watermark, summary, idempotency, isolation, privacy', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { attentionOverview, markConversationRead } = await import('../server/comm/attention.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, ai_draft cascade');
    const tenantId = await getDefaultTenantId();
    // a second tenant for the isolation test
    const otherTenant = (await query("insert into tenant(slug,name) values ('attn-other','Other') on conflict (slug) do update set name=excluded.name returning id")).rows[0].id;

    const org = (await query("insert into organization(tenant_id,name) values ($1,'OCA') returning id", [tenantId])).rows[0].id;
    const contact = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,'kim@oca.nl','Kim','kim@oca.nl') returning id", [tenantId, org])).rows[0].id;

    // helper: make a conversation with one inbound message at a given time
    const mkConv = async (tid, { contactId = null, email = null, privacy = false, channel = 'EMAIL', inboundAt = null, dir = 'INBOUND', status = 'NEW' } = {}) => {
      const c = (await query(
        `insert into conversation(tenant_id, contact_id, channel, is_privacy, status, last_message_at, last_inbound_at)
         values ($1,$2,$3,$4,$5, now(), $6) returning id`, [tid, contactId, channel, privacy, status, inboundAt])).rows[0].id;
      if (inboundAt) await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,$3,$4,$5,'hoi','RECEIVED',$6)", [tid, c, dir, channel, email, inboundAt]);
      return c;
    };

    // Inbound times are safely in the PAST so the read watermark (now()) is always later.
    const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    // 15 — a fresh inbound conversation shows as NEW + populates byEmail/byContact
    const conv = await mkConv(tenantId, { contactId: contact, email: 'kim@oca.nl', inboundAt: past });
    let ov = await attentionOverview(tenantId);
    const it = ov.queue.find((x) => x.id === conv);
    assert.ok(it, '15 conversation is in the act-now queue');
    assert.equal(it.state, 'NEW', '15 fresh inbound is NEW');
    assert.equal(ov.byEmail['kim@oca.nl'].conversationId, conv, '15 byEmail maps the row');
    assert.equal(ov.byContact[contact].state, 'NEW', '15 byContact maps the row');
    assert.ok(ov.summary.actionable >= 1, '15 summary counts it');
    assert.ok(ov.summary.headline && ov.summary.headline.primary, '15 canonical headline present');
    assert.equal(typeof it.preview, 'string', '15 preview snippet present for the cockpit card');
    assert.ok(/hoi/i.test(it.preview), '15 preview is the cleaned inbound body');

    // 16 — opening it (markConversationRead) clears UNREAD but NOT the reply obligation: NEW → NEEDS_ACTION
    const r1 = await markConversationRead(tenantId, conv, { userId: null });
    assert.equal(r1.ok, true, '16 mark read ok');
    ov = await attentionOverview(tenantId);
    const it16 = ov.queue.find((x) => x.id === conv);
    assert.ok(it16, '16 still needs a reply, so still actionable');
    assert.equal(it16.state, 'NEEDS_ACTION', '16 read cleared NEW → NEEDS_ACTION');
    assert.equal(it16.unread, false, '16 no longer unread after human opened it');

    // 17 — idempotent: reading again does not regress and does not error
    const before = (await query('select last_read_at from conversation where id=$1', [conv])).rows[0].last_read_at;
    const r2 = await markConversationRead(tenantId, conv, { userId: null });
    assert.equal(r2.ok, true, '17 second read ok');
    const after = (await query('select last_read_at from conversation where id=$1', [conv])).rows[0].last_read_at;
    assert.ok(new Date(after) >= new Date(before), '17 watermark only advances');

    // 18 — a NEW inbound after reading makes it UNREAD again (watermark semantics). Use a clearly
    // later timestamp so the assertion never races the wall clock.
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','kim@oca.nl','nog iets','RECEIVED', now() + interval '1 hour')", [tenantId, conv]);
    await query("update conversation set last_inbound_at=now() + interval '1 hour', last_message_at=now() + interval '1 hour' where id=$1", [conv]);
    ov = await attentionOverview(tenantId);
    const it2 = ov.queue.find((x) => x.id === conv);
    assert.ok(it2 && it2.state === 'UNREAD', '18 new inbound after read → UNREAD');

    // 19 — tenant isolation: a conversation in another tenant never appears
    const foreign = await mkConv(otherTenant, { email: 'x@other.nl', inboundAt: past });
    ov = await attentionOverview(tenantId);
    assert.ok(!ov.queue.find((x) => x.id === foreign), '19 foreign-tenant conversation excluded');

    // 20 — privacy conversations are excluded from the cockpit
    const priv = await mkConv(tenantId, { contactId: contact, email: 'kim@oca.nl', privacy: true, inboundAt: past });
    ov = await attentionOverview(tenantId);
    assert.ok(!ov.queue.find((x) => x.id === priv), '20 privacy conversation excluded');

    // 21 — mark-read on a non-existent conversation fails cleanly (no throw)
    const bad = await markConversationRead(tenantId, '00000000-0000-0000-0000-000000000000', {});
    assert.equal(bad.ok, false, '21 not_found handled');

    // 22 — calm empty state: with everything read/closed, actionable count reaches zero
    await query('truncate message, conversation cascade');
    ov = await attentionOverview(tenantId);
    assert.equal(ov.summary.actionable, 0, '22 empty → nothing needs attention');
    assert.equal(ov.queue.length, 0, '22 empty queue');
  } finally {
    await closePool();
  }
});
