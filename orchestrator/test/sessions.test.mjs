// Session tests (brief §69). Continuity is used when appropriate; repo HEAD is
// always re-checked and a moved HEAD forces a re-fetch flag; stale/old sessions
// start fresh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore } from './helpers.mjs';
import { decideSession, recordUse } from '../src/sessions.mjs';
import { tx } from '../src/store.mjs';

test('first task creates a new session; second resumes it at same HEAD', () => {
  freshStore();
  const d1 = decideSession('first_five', 'headAAAAAA');
  assert.equal(d1.action, 'new');
  recordUse('first_five', d1.session_id, 'headAAAAAA');

  const d2 = decideSession('first_five', 'headAAAAAA');
  assert.equal(d2.action, 'resume');
  assert.equal(d2.session_id, d1.session_id);
  assert.equal(d2.head_changed, false);
});

test('a moved repo HEAD still resumes but flags a required re-fetch', () => {
  freshStore();
  const d1 = decideSession('website', 'headAAAAAA');
  recordUse('website', d1.session_id, 'headAAAAAA');
  const d2 = decideSession('website', 'headBBBBBB');
  assert.equal(d2.action, 'resume');
  assert.equal(d2.head_changed, true);
});

test('an old session is replaced with a fresh one', () => {
  freshStore();
  const d1 = decideSession('relationship', 'headAAAAAA');
  recordUse('relationship', d1.session_id, 'headAAAAAA');
  // Age the session well beyond the max.
  tx((db) => { db.sessions['relationship'].created_at = new Date(Date.now() - 48 * 3600 * 1000).toISOString(); });
  const d2 = decideSession('relationship', 'headAAAAAA');
  assert.equal(d2.action, 'new');
  assert.notEqual(d2.session_id, d1.session_id);
});
