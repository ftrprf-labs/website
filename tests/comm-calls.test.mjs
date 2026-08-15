// Telephony phase 1 (click to call). Offline unit tests for the tel:/E.164 helpers always run; the
// DB-backed call-record lifecycle (initiate -> consent gate -> log outcome -> timeline) SKIPS
// without a DATABASE_URL. No dialing happens on the server; we record the call intent + outcome.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toE164, telUri } from '../server/comm/calls.mjs';

test('toE164 normalizes Dutch national + international forms', () => {
  assert.equal(toE164('0612345678'), '+31612345678');
  assert.equal(toE164('+31612345678'), '+31612345678');
  assert.equal(toE164('31612345678'), '+31612345678');
  assert.equal(toE164('  06 12 34 56 78 '), '+31612345678');
  assert.equal(toE164(''), null);
  assert.equal(toE164('123'), null, 'implausible number fails closed');
});

test('telUri builds a dialer URI or null', () => {
  assert.equal(telUri('0612345678'), 'tel:+31612345678');
  assert.equal(telUri('nonsense'), null);
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — call-record E2E skipped' };

test('click-to-call lifecycle: consent gate -> call_record -> outcome -> timeline', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { resolveContactTx } = await import('../server/comm/repo.mjs');
  const { withTransaction } = await import('../server/comm/db.mjs');
  const { initiateClickToCall, logCallOutcome, listCalls } = await import('../server/comm/calls.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, call_record, internal_note, relationship_memory cascade');
    const tenantId = await getDefaultTenantId();

    // A contact with a mobile number.
    const contact = await withTransaction((client) => resolveContactTx(client, tenantId, { first_name: 'Kim', last_name: 'de Vries', mobile: '0612345678' }));
    const contactId = contact.id;

    // 1) initiate — PHONE service defaults to allow; returns a valid tel: URI + a call_record.
    const init = await initiateClickToCall({ tenantId, contactId });
    assert.ok(init.ok, 'click-to-call allowed by default (no opt-out)');
    assert.equal(init.tel, 'tel:+31612345678');
    assert.ok(init.callRecordId);
    const rec = (await query('select status, direction, provider, to_number from call_record where id=$1', [init.callRecordId])).rows[0];
    assert.equal(rec.direction, 'OUTBOUND');
    assert.equal(rec.provider, 'click_to_call');
    assert.equal(rec.to_number, '+31612345678');
    assert.equal(rec.status, 'RINGING', 'starts as RINGING (intent recorded, outcome unknown)');
    // an Activity landed on the timeline
    const started = (await query("select count(*)::int n from activity where type='call_started' and contact_id=$1", [contactId])).rows[0].n;
    assert.ok(started >= 1, 'call_started activity recorded');

    // 2) log the human outcome — answered, 3 minutes, with a short summary.
    const out = await logCallOutcome({ tenantId, callRecordId: init.callRecordId, status: 'completed', durationSeconds: 185, summary: 'Kort kennisgemaakt; dinsdag terugbellen.' });
    assert.ok(out.ok);
    const after = (await query('select status, duration_seconds, summary, answered_at, ended_at from call_record where id=$1', [init.callRecordId])).rows[0];
    assert.equal(after.status, 'COMPLETED');
    assert.equal(after.duration_seconds, 185);
    assert.ok(after.answered_at, 'answered_at stamped');
    assert.ok(after.ended_at, 'ended_at stamped');
    assert.match(after.summary, /dinsdag/i);
    const logged = (await query("select count(*)::int n from activity where type='call_logged' and contact_id=$1", [contactId])).rows[0].n;
    assert.ok(logged >= 1, 'call_logged activity recorded');

    // a bad status is rejected
    const bad = await logCallOutcome({ tenantId, callRecordId: init.callRecordId, status: 'banana' });
    assert.equal(bad.ok, false);

    // 3) an explicit PHONE opt-out fail-closes a new initiation.
    await setPreference(tenantId, contactId, { channel: 'PHONE', purpose: 'service', allowed: false, source: 'manual' });
    const blocked = await initiateClickToCall({ tenantId, contactId });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, 'consent_blocked', 'explicit opt-out blocks click-to-call');

    // 4) the timeline lists the call.
    const calls = await listCalls(tenantId, contactId);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].status, 'COMPLETED');
  } finally {
    await closePool();
  }
});
