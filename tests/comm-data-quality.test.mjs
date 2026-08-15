// Data-quality diagnostic (§7). Real-DB test: seed a clean graph, then a duplicate and a
// cross-channel identity split, and assert the read-only checks detect them WITHOUT merging.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL — data-quality test skipped' };

test('data-quality detects duplicates and cross-channel splits, merges nothing', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { runDataQualityChecks } = await import('../server/comm/data-quality.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment, comm_draft, comm_draft_version, draft_chat_message, follow_up, delivery_event, activity, channel_identity, communication_preference, ai_draft, call_record, internal_note, relationship_memory cascade');
    const tid = await getDefaultTenantId();

    const byName = (res) => Object.fromEntries(res.findings.map((f) => [f.check, f.count]));

    // Baseline: one contact, one reachable identity. Capture counts as a baseline (assert deltas,
    // not absolute zeros, so residual state can never make this flake).
    const a = (await query(`insert into contact(tenant_id, first_name, last_name, email, mobile, identity_key) values ($1,'Kim','A','kim@oca.nl','31611110000','email:kim@oca.nl') returning id`, [tid])).rows[0].id;
    await query(`insert into channel_identity(tenant_id, contact_id, channel, value, source) values ($1,$2,'WHATSAPP','31611110000','seed')`, [tid, a]);
    let r = await runDataQualityChecks({});
    assert.equal(r.ok, true, 'baseline has no hard integrity violations');
    const base = byName(r);

    // Seed a SECOND contact reachable via the SAME phone number through contact.mobile (contact A
    // holds the WhatsApp channel_identity for that number; a value is unique per channel by
    // constraint, so the split shows up across mobile + identity — exactly what we want caught).
    await query(`insert into contact(tenant_id, first_name, last_name, mobile, identity_key) values ($1,'Kim','B','31611110000','mobile:31611110000')`, [tid]);
    // And a duplicate e-mail on a third contact.
    await query(`insert into contact(tenant_id, first_name, email, identity_key) values ($1,'Kim','kim@oca.nl','email:kim@oca.nl:2')`, [tid]);

    r = await runDataQualityChecks({});
    const counts = byName(r);
    assert.ok(counts.cross_channel_number_split > base.cross_channel_number_split, 'cross-channel number split newly detected');
    assert.ok(counts.duplicate_mobile > base.duplicate_mobile, 'duplicate mobile newly detected');
    assert.ok(counts.duplicate_email > base.duplicate_email, 'duplicate email newly detected');

    // Read-only guarantee: the number of contacts is unchanged (nothing merged/deleted).
    const n = (await query('select count(*)::int n from contact')).rows[0].n;
    assert.equal(n, 3, 'diagnostic merged/deleted nothing');

    // Samples carry ids only, never a raw identity_key/email.
    const split = r.findings.find((f) => f.check === 'cross_channel_number_split');
    assert.ok(Array.isArray(split.sample[0].contactIds), 'split sample exposes contact ids only');
    for (const s of split.sample) assert.ok(!JSON.stringify(s).match(/\d{7,}/), 'no raw phone number in split sample');
    const dupKey = r.findings.find((f) => f.check === 'duplicate_identity_key');
    for (const s of dupKey.sample) assert.ok(!JSON.stringify(s).includes('@'), 'no raw e-mail in identity_key sample');
  } finally {
    await closePool();
  }
});
