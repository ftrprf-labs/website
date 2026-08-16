// Communication Layer — Relaties overzicht data contract (Slice 3 READINESS, characterization).
//
// The future "Relaties" overview in the cockpit is fed by the EXISTING listRelationships() service
// (already exposed at GET /api/comm/relationships). This test does not add or change behaviour: it
// pins the exact shape and semantics the overview UI will bind to, and proves tenant isolation,
// soft-delete exclusion, search, ordering and derived-field provenance (open_convs / last_activity
// are real counts from state, never fabricated). If a later change alters that contract, this fails
// loudly BEFORE the UI is wired on top of it.
//
// DB-backed only: skips cleanly without DATABASE_URL/COMM_LAYER_ENABLED, like every comm DB test.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dbSkip, setupCommDb, closeCommDb, seedTenant,
  seedOrg, seedContact, seedConversation, seedActivity,
} from './helpers/comm-fixtures.mjs';

test('Relaties overzicht: listRelationships shape, isolation, search, ordering, provenance', dbSkip, async () => {
  const { query } = await import('../server/comm/db.mjs');
  const { listRelationships } = await import('../server/comm/relationship.mjs');
  try {
    const { tenantId } = await setupCommDb();
    const otherTenant = await seedTenant('slice3-relations-other', 'Other');

    // --- seed a realistic directory ----------------------------------------------------------
    const org = await seedOrg(tenantId, { name: 'OCA', domain: 'oca.nl' });
    const kim = await seedContact(tenantId, { firstName: 'Kim', lastName: 'de Vries', email: 'kim@oca.nl', orgId: org, stage: 'ACTIVE' });
    // two OPEN-ish conversations (counted) + one RESOLVED (not counted) → open_convs must be exactly 2
    await seedConversation(tenantId, { contactId: kim, orgId: org, status: 'NEW' });
    await seedConversation(tenantId, { contactId: kim, orgId: org, status: 'OPEN' });
    await seedConversation(tenantId, { contactId: kim, orgId: org, status: 'RESOLVED' });
    await seedActivity(tenantId, { contactId: kim, orgId: org, type: 'message_received' });

    // a contact with no org, no activity, no conversations → honest empty derived fields
    const bob = await seedContact(tenantId, { firstName: 'Bob', email: 'bob@acme.nl' });

    // a foreign-tenant contact reusing the SAME email — must never leak into this tenant's overview
    await seedContact(otherTenant, { firstName: 'Kim', email: 'kim@oca.nl' });

    // --- 1. tenant-scoped directory: exactly our two contacts, foreign excluded ---------------
    const all = await listRelationships(tenantId, {});
    assert.equal(all.length, 2, '1 only this tenant\'s contacts are listed');
    const rowKim = all.find((r) => r.id === kim);
    const rowBob = all.find((r) => r.id === bob);
    assert.ok(rowKim && rowBob, '1 both seeded contacts present');

    // --- 2. Kim carries the columns the overview renders (org, stage, derived counts) ----------
    assert.equal(rowKim.first_name, 'Kim', '2 name');
    assert.equal(rowKim.relationship_stage, 'ACTIVE', '2 stage passes through');
    assert.equal(rowKim.org, 'OCA', '2 organization name joined');
    assert.equal(rowKim.org_id, org, '2 org_id joined');
    assert.equal(rowKim.primary_domain, 'oca.nl', '2 domain joined');
    assert.equal(Number(rowKim.open_convs), 2, '2 open_convs counts NEW/OPEN/WAITING_ON_US only (RESOLVED excluded)');
    assert.ok(rowKim.last_activity, '2 last_activity derived from a real activity row');

    // --- 3. Bob shows honest empties — no fabricated org/activity/counts -----------------------
    assert.equal(rowBob.org, null, '3 no org → null, not invented');
    assert.equal(rowBob.last_activity, null, '3 no activity → null');
    assert.equal(Number(rowBob.open_convs), 0, '3 no conversations → 0');

    // --- 4. search matches name / email / org / domain ----------------------------------------
    assert.deepEqual((await listRelationships(tenantId, { q: 'OCA' })).map((r) => r.id), [kim], '4 q matches org name');
    assert.deepEqual((await listRelationships(tenantId, { q: 'bob@acme' })).map((r) => r.id), [bob], '4 q matches email');
    assert.deepEqual((await listRelationships(tenantId, { q: 'Vries' })).map((r) => r.id), [kim], '4 q matches last name');
    assert.equal((await listRelationships(tenantId, { q: 'nobody-xyz' })).length, 0, '4 no match → empty');

    // --- 5. ordering: most-recent activity first, null-activity contacts last ------------------
    assert.equal(all[0].id, kim, '5 contact with activity sorts before contact without');

    // --- 6. soft-deleted contacts drop out of the overview ------------------------------------
    await query('update contact set deleted_at=now() where id=$1', [bob]);
    const afterDelete = await listRelationships(tenantId, {});
    assert.ok(!afterDelete.find((r) => r.id === bob), '6 soft-deleted contact excluded');
    assert.equal(afterDelete.length, 1, '6 only the live contact remains');
  } finally {
    await closeCommDb();
  }
});
