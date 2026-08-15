// Communication Layer — identity + organization matching + migration idempotency.
// Pure-function checks always run; the DB-backed checks SKIP without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactIdentityKey, orgSignal, isFreeMailDomain } from '../server/comm/identity.mjs';

test('contact identity key is permanent + campaign-independent', () => {
  assert.equal(contactIdentityKey({ email: 'Kim@OCA.nl' }), 'email:kim@oca.nl');
  assert.equal(contactIdentityKey({ mobile: '0629538336' }), 'mobile:31629538336');
  assert.equal(contactIdentityKey({}), null);
});

test('organization matching treats domain as a signal, not proof', () => {
  assert.equal(orgSignal({ company_name: 'OCA', email: 'kim@oca.nl' }).confidence, 'linked');
  assert.equal(orgSignal({ email: 'kim@gmail.com' }).confidence, 'none');   // free-mail → no org
  assert.equal(orgSignal({ email: 'kim@oca.nl' }).confidence, 'suggested'); // domain-only → confirm
  assert.ok(isFreeMailDomain('gmail.com'));
  assert.ok(!isFreeMailDomain('oca.nl'));
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
test('migration: same person across campaigns → one Contact, many Invitations (idempotent)',
  { skip: HAS_DB ? false : 'no DATABASE_URL — DB identity test skipped' }, async () => {
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { migrateInvitations, contactCount } = await import('../server/comm/repo.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate invitation, contact, organization cascade');
      const recs = [
        { id: 'a', token: 't1', first_name: 'Ludwig', company_name: 'OCA', email: 'lud@oca.nl', campaign: 'C1', status: 'COMPLETED' },
        { id: 'b', token: 't2', first_name: 'Ludwig', company_name: 'OCA', email: 'lud@oca.nl', campaign: 'C2', status: 'DRAFT' },
      ];
      await migrateInvitations(recs);
      assert.equal(await contactCount(), 1, 'one Contact for the same person across campaigns');
      await migrateInvitations(recs);
      assert.equal(await contactCount(), 1, 're-run must not duplicate');
      const invs = Number((await query('select count(*)::int n from invitation')).rows[0].n);
      assert.equal(invs, 2, 'two invitations under the one Contact');
    } finally {
      await closePool();
    }
  });
