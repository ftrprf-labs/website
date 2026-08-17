// Slice 4 correction — attention is DERIVED from the actual authoritative state after every
// meaningful transition, never a stale attention snapshot (§ 5, 6, 27).
//
// The casus: a question is asked (attention), the human approves + successfully sends an answer, and
// the relation must fall out of "NU — vraagt jou" because the underlying reason is gone. A FAILED
// send is NOT an answer, so it must keep attention. Two layers: pure derivation (always runs) and a
// DB-backed check that the real attentionOverview query feeds the derivation the latest-outbound
// facts. Idempotent re-evaluation must not multiply or drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveAttention } from '../server/comm/attention.mjs';

const T_IN = '2026-08-15T10:00:00.000Z';        // inbound (their question)
const T_OUT = '2026-08-15T10:30:00.000Z';       // our reply, later than the inbound
const T_OLD_OUT = '2026-08-15T09:00:00.000Z';   // an earlier outbound (before the inbound)

// ---- A — an inbound question demands attention -------------------------------------------------
test('A pure — inbound question, not yet answered → actionable', () => {
  const a = deriveAttention({ status: 'NEW', last_inbound_at: T_IN, last_read_at: null, last_dir: 'INBOUND', has_ai_proposed: true, contact_id: 'c1' });
  assert.equal(a.actionable, true);
  assert.equal(a.answered, false);
  assert.equal(a.state, 'REPLY_READY');
});

// ---- B — a SUCCESSFUL answer settles that inbound ----------------------------------------------
test('B pure — inbound + successful outbound answer → NOT actionable (leaves NU)', () => {
  const a = deriveAttention({
    status: 'ANSWERED', last_inbound_at: T_IN, last_read_at: null,
    last_outbound_at: T_OUT, last_outbound_delivery: 'SENT',
    last_dir: 'OUTBOUND', has_ai_proposed: true, contact_id: 'c1',
  });
  assert.equal(a.answered, true);
  assert.equal(a.actionable, false);
  assert.equal(a.state, 'WAITING_FOR_CUSTOMER');
});

test('B pure — a successful answer wins even though the human never opened it (read watermark null)', () => {
  // The cockpit read is side-effect-free, so last_read_at stays null after a send. The answer itself,
  // not the watermark, is what settles the question. This is the exact Jean-Baptiste regression.
  const a = deriveAttention({
    status: 'ANSWERED', last_inbound_at: T_IN, last_read_at: null,
    last_outbound_at: T_OUT, last_outbound_delivery: 'SENT', last_dir: 'OUTBOUND', contact_id: 'c1',
  });
  assert.equal(a.state, 'WAITING_FOR_CUSTOMER');
  assert.equal(a.actionable, false);
});

// ---- C — a FAILED answer is not an answer: attention stays -------------------------------------
test('C pure — inbound + FAILED outbound → DELIVERY_PROBLEM (attention stays)', () => {
  const a = deriveAttention({
    status: 'ANSWERED', last_inbound_at: T_IN, last_read_at: null,
    last_outbound_at: T_OUT, last_outbound_delivery: 'FAILED', last_dir: 'OUTBOUND', contact_id: 'c1',
  });
  assert.equal(a.answered, false);
  assert.equal(a.actionable, true);
  assert.equal(a.state, 'DELIVERY_PROBLEM');
});

// ---- The Jean-Baptiste correction: an OLD failed send then a SUCCESSFUL one → answered ----------
test('Jean-Baptiste — a historical FAILED superseded by a later SENT no longer raises attention', () => {
  // Latest outbound is the successful one (SENT), so the derivation sees an answered question, not a
  // permanent delivery problem from the kept-for-history FAILED record.
  const a = deriveAttention({
    status: 'ANSWERED', last_inbound_at: T_IN, last_read_at: null,
    last_outbound_at: T_OUT, last_outbound_delivery: 'SENT', last_dir: 'OUTBOUND', contact_id: 'c1',
  });
  assert.equal(a.state, 'WAITING_FOR_CUSTOMER');
  assert.equal(a.actionable, false);
});

test('an outbound that predates the inbound does NOT count as answered', () => {
  const a = deriveAttention({
    status: 'NEW', last_inbound_at: T_IN, last_read_at: null,
    last_outbound_at: T_OLD_OUT, last_outbound_delivery: 'SENT', last_dir: 'INBOUND', has_ai_proposed: true, contact_id: 'c1',
  });
  assert.equal(a.answered, false);
  assert.equal(a.actionable, true);
  assert.equal(a.state, 'REPLY_READY');
});

// ---- DB-backed A/B/C/D through the REAL attentionOverview query ---------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — attention transition DB E2E skipped' };

test('DB — answered/failed transitions via attentionOverview + idempotent re-evaluation', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { attentionOverview } = await import('../server/comm/attention.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, ai_draft cascade');
    const tenantId = await getDefaultTenantId();
    const org = (await query("insert into organization(tenant_id,name) values ($1,'Noorderlicht') returning id", [tenantId])).rows[0].id;
    const contact = (await query("insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email) values ($1,$2,'jb@n.coop','Jean-Baptiste','Vandenberghe','jb@n.coop') returning id", [tenantId, org])).rows[0].id;

    const past = (mins) => new Date(Date.now() - mins * 60000).toISOString();
    // A conversation with an inbound question 60 minutes ago (never opened via the cockpit).
    const conv = (await query(
      "insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'NEW','Re: de tweede sessie',$4,$4) returning id",
      [tenantId, contact, org, past(60)])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','jb@n.coop','Zou de tweede sessie deze maand nog kunnen?','RECEIVED',$3)", [tenantId, conv, past(60)]);

    // A — the question is actionable.
    let ov = await attentionOverview(tenantId);
    assert.ok(ov.queue.find((x) => x.id === conv), 'A the question is in the act-now queue');

    // Jean-Baptiste's history: an early FAILED send attempt (kept as system history).
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','poging','FAILED',$3)", [tenantId, conv, past(40)]);
    await query("update conversation set last_message_at=$2 where id=$1", [conv, past(40)]);

    // C — the latest outbound FAILED → attention stays (delivery problem), NOT a silent drop.
    ov = await attentionOverview(tenantId);
    const cItem = ov.queue.find((x) => x.id === conv);
    assert.ok(cItem, 'C a failed answer keeps the relation in the queue');
    assert.equal(cItem.state, 'DELIVERY_PROBLEM', 'C failed send surfaces as a delivery problem');

    // B — a later SUCCESSFUL send supersedes the failure and answers the question.
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','Ja, dat kan.','SENT',$3)", [tenantId, conv, past(10)]);
    await query("update conversation set status='ANSWERED', last_message_at=$2 where id=$1", [conv, past(10)]);

    ov = await attentionOverview(tenantId);
    assert.ok(!ov.queue.find((x) => x.id === conv), 'B a successfully answered question leaves NU');

    // D — repeated evaluation is idempotent: still not actionable, still exactly one conversation row,
    // no duplicate/drift.
    const ov2 = await attentionOverview(tenantId);
    assert.ok(!ov2.queue.find((x) => x.id === conv), 'D re-evaluation keeps it out of NU');
    assert.equal(ov.summary.actionable, ov2.summary.actionable, 'D actionable count is stable across evaluations');
    const rows = (await query('select count(*)::int n from conversation where id=$1', [conv])).rows[0].n;
    assert.equal(rows, 1, 'D no conversation duplication');
  } finally {
    await closePool();
  }
});
