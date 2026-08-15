// Pass the Lens — intake + provenance unit tests (JSON store).
// Run with: npm test   (Node's built-in test runner)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function freshStore(prefix) {
  const store = await import('../server/store.mjs');
  const { config } = await import('../server/config.mjs');
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  const prev = { db: config.dbFile, dir: config.dataDir };
  config.dataDir = dir; config.dbFile = path.join(dir, 'db.json');
  store._resetForTests();
  return { store, config, restore: () => { config.dbFile = prev.db; config.dataDir = prev.dir; store._resetForTests(); } };
}

test('intake creates a pass_the_lens candidate: DRAFT, consent UNKNOWN (no auto-invite), source tagged', async () => {
  const { store, restore } = await freshStore('ptl-create-');
  try {
    const r = store.intake({ first_name: 'Nora', last_name: 'de Vries', company: 'Atelier Nora', email: 'nora@ateliernora.nl' });
    assert.equal(r.created, true);
    const inv = r.invitation;
    assert.equal(inv.status, 'DRAFT');               // candidate, not invited
    assert.equal(inv.consent_status, 'UNKNOWN');     // referred person did NOT consent
    assert.equal(store.mayContact(inv.id), false);   // HARD RULE: no auto-invite is possible
    assert.equal(inv.source, 'pass_the_lens');
    assert.equal(inv.company_name, 'Atelier Nora');  // company|company_name accepted
    assert.equal(r.consentApplied, false);
  } finally { restore(); }
});

test('intake records introducer provenance resolved from the referrer token', async () => {
  const { store, restore } = await freshStore('ptl-prov-');
  try {
    // The referrer already exists as a tester (they experienced First Five).
    const referrer = store.createInvitation({ first_name: 'Ludwig', last_name: 'Maes', company_name: 'Maculis', email: 'ludwig@maculis.nl', source: 'manual' });
    const r = store.intake({
      first_name: 'Sam', last_name: 'Peeters', company: 'Peeters Interieur', email: 'sam@peetersinterieur.be',
      introducer_token: referrer.token, source_journey: 'first_five',
    });
    const inv = r.invitation;
    assert.equal(inv.introductions.length, 1);
    const intro = inv.introductions[0];
    assert.equal(intro.by_id, referrer.id);
    assert.equal(intro.by_name, 'Ludwig Maes');
    assert.equal(intro.by_company, 'Maculis');
    assert.equal(intro.source_journey, 'first_five');
    assert.ok(intro.at);
    // history carries an observational event, never a status/consent change
    assert.ok(inv.history.some((h) => h.event === 'pass_the_lens_introduction'));
    assert.equal(inv.status, 'DRAFT');
    // no token/secret leaks into the stored introduction
    assert.ok(!JSON.stringify(intro).includes(referrer.token));
  } finally { restore(); }
});

test('intake dedups by person: a repeat introduction is appended, lifecycle never reset', async () => {
  const { store, restore } = await freshStore('ptl-dedup-');
  try {
    const refA = store.createInvitation({ first_name: 'A', email: 'a@ref.nl', source: 'manual' });
    const refB = store.createInvitation({ first_name: 'B', email: 'b@ref.nl', source: 'manual' });
    const first = store.intake({ first_name: 'Kim', company: 'Kim BV', email: 'kim@kimbv.nl', introducer_token: refA.token });
    assert.equal(first.created, true);
    // Simulate the candidate having been invited already (lifecycle advanced).
    store.setStatus(first.invitation.id, 'SENT');
    // Same person referred AGAIN by a different referrer.
    const second = store.intake({ first_name: 'Kim', company: 'Kim BV', email: 'kim@kimbv.nl', introducer_token: refB.token });
    assert.equal(second.created, false);                         // no duplicate record
    assert.equal(second.invitation.id, first.invitation.id);     // same candidate
    assert.equal(second.invitation.status, 'SENT');              // lifecycle NOT reset (§9)
    assert.equal(second.invitation.introductions.length, 2);     // repeat referral is visible (§8)
    assert.equal(second.invitation.introductions[0].by_id, refA.id);
    assert.equal(second.invitation.introductions[1].by_id, refB.id);
  } finally { restore(); }
});

test('intake with an unknown introducer token still records the introduction (introducer null)', async () => {
  const { store, restore } = await freshStore('ptl-anon-');
  try {
    const r = store.intake({ first_name: 'Eva', company: 'Eva Studio', email: 'eva@evastudio.nl', introducer_token: 'not-a-real-token', source_journey: 'first_five' });
    const inv = r.invitation;
    assert.equal(inv.introductions.length, 1);
    assert.equal(inv.introductions[0].by_id, null);              // unresolved → null, not invented
    assert.equal(inv.introductions[0].source_journey, 'first_five');
  } finally { restore(); }
});

test('getHistory surfaces introductions for the admin dossier', async () => {
  const { store, restore } = await freshStore('ptl-hist-');
  try {
    const ref = store.createInvitation({ first_name: 'Ref', company_name: 'Ref Co', email: 'ref@ref.nl', source: 'manual' });
    const r = store.intake({ first_name: 'Tom', company: 'Tom NV', email: 'tom@tomnv.nl', introducer_token: ref.token });
    const dossier = store.getHistory(r.invitation.id);
    assert.equal(dossier.source, 'pass_the_lens');
    assert.equal(dossier.introductions.length, 1);
    assert.equal(dossier.introductions[0].by_name, 'Ref');
  } finally { restore(); }
});
