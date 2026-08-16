// Communication Layer — Gesprekken overzicht data contract (Slice 3 READINESS, characterization).
//
// The "Gesprekken" overview reuses the EXISTING inboxConversations()/inboxSummary() services (already
// exposed at GET /api/comm/inbox — the central Inbox is today's de-facto conversations overview).
// This test adds no behaviour: it pins the derived attention tags, the privacy split, the filter
// semantics, the summary counters and tenant isolation, so the overview UI can be wired on a locked
// contract. Attention tags are derived from durable message/draft/delivery state (provenance), never
// stored.
//
// DB-backed only: skips cleanly without DATABASE_URL/COMM_LAYER_ENABLED.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dbSkip, setupCommDb, closeCommDb, seedTenant,
  seedOrg, seedContact, seedConversation, seedMessage, seedAiDraft,
} from './helpers/comm-fixtures.mjs';

test('Gesprekken overzicht: attention tags, privacy split, filters, summary, isolation', dbSkip, async () => {
  const { inboxConversations, inboxSummary } = await import('../server/comm/inbox.mjs');
  try {
    const { tenantId } = await setupCommDb();
    const otherTenant = await seedTenant('slice3-convs-other', 'Other');

    const org = await seedOrg(tenantId, { name: 'OCA', domain: 'oca.nl' });
    const kim = await seedContact(tenantId, { firstName: 'Kim', email: 'kim@oca.nl', orgId: org });

    // 1  NEW + inbound            → new, waiting_on_us
    const cNew = await seedConversation(tenantId, { contactId: kim, orgId: org, status: 'NEW', subject: 'Hallo' });
    await seedMessage(tenantId, cNew, { direction: 'INBOUND', from: 'kim@oca.nl', body: 'hoi Maculis' });
    // 2  OPEN + inbound + AI draft → waiting_on_us, ai_ready
    const cAi = await seedConversation(tenantId, { contactId: kim, status: 'OPEN' });
    await seedMessage(tenantId, cAi, { direction: 'INBOUND', from: 'kim@oca.nl' });
    await seedAiDraft(tenantId, cAi);
    // 3  NEW + inbound + no contact → new, waiting_on_us, unknown_contact
    const cUnknown = await seedConversation(tenantId, { contactId: null, status: 'NEW' });
    await seedMessage(tenantId, cUnknown, { direction: 'INBOUND', from: 'stranger@example.com' });
    // 4  OPEN + failed outbound    → delivery_problem
    const cDelivery = await seedConversation(tenantId, { contactId: kim, status: 'OPEN' });
    await seedMessage(tenantId, cDelivery, { direction: 'OUTBOUND', delivery: 'FAILED' });
    // 5  WAITING_ON_CONTACT        → waiting_on_contact
    const cWaitContact = await seedConversation(tenantId, { contactId: kim, status: 'WAITING_ON_CONTACT' });
    await seedMessage(tenantId, cWaitContact, { direction: 'OUTBOUND' });
    // 6  RESOLVED                  → resolved (and only resolved)
    const cResolved = await seedConversation(tenantId, { contactId: kim, status: 'RESOLVED' });
    await seedMessage(tenantId, cResolved, { direction: 'INBOUND', from: 'kim@oca.nl' });
    // 7  WAITING_ON_US             → drives summary.waiting_on_us
    const cWaitUs = await seedConversation(tenantId, { contactId: kim, status: 'WAITING_ON_US' });
    await seedMessage(tenantId, cWaitUs, { direction: 'INBOUND', from: 'kim@oca.nl' });
    // 8  privacy NEW               → excluded from communication box, shown in privacy box
    const cPrivacy = await seedConversation(tenantId, { contactId: kim, status: 'NEW', privacy: true });
    await seedMessage(tenantId, cPrivacy, { direction: 'INBOUND', from: 'kim@oca.nl' });
    // 9  foreign tenant            → isolation
    const cForeign = await seedConversation(otherTenant, { status: 'NEW' });
    await seedMessage(otherTenant, cForeign, { direction: 'INBOUND', from: 'x@other.nl' });

    const list = await inboxConversations(tenantId, { box: 'communication', filter: 'all' });
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));

    // --- privacy split + isolation ------------------------------------------------------------
    assert.ok(!byId[cPrivacy], 'privacy conversation excluded from communication box');
    assert.ok(!byId[cForeign], 'foreign-tenant conversation excluded');
    const privacyBox = await inboxConversations(tenantId, { box: 'privacy', filter: 'all' });
    assert.equal(privacyBox.length, 1, 'privacy box shows exactly the privacy conversation');
    assert.equal(privacyBox[0].id, cPrivacy, 'privacy box holds the right conversation');

    // --- derived attention tags (provenance from state) ---------------------------------------
    assert.deepEqual(byId[cNew].attention, ['new', 'waiting_on_us'], 'NEW + inbound');
    assert.equal(byId[cNew].primary, 'new', 'primary = most-urgent tag');
    assert.deepEqual(byId[cAi].attention, ['waiting_on_us', 'ai_ready'], 'OPEN + inbound + proposed AI draft');
    assert.equal(byId[cAi].ai_ready, true, 'ai_ready reflects a real proposed ai_draft row');
    assert.deepEqual(byId[cUnknown].attention, ['new', 'waiting_on_us', 'unknown_contact'], 'unlinked contact tagged');
    assert.deepEqual(byId[cDelivery].attention, ['delivery_problem'], 'failed outbound surfaces');
    assert.equal(byId[cDelivery].delivery_problem, true, 'delivery_problem flag set from FAILED delivery');
    assert.deepEqual(byId[cWaitContact].attention, ['waiting_on_contact'], 'ball in their court');
    assert.deepEqual(byId[cResolved].attention, ['resolved'], 'resolved collapses to a single calm tag');

    // --- last message provenance --------------------------------------------------------------
    assert.equal(byId[cNew].last_dir, 'INBOUND', 'last_dir from newest message');
    assert.match(byId[cNew].last_body || '', /hoi Maculis/, 'last_body is the newest message body');
    assert.equal(byId[cNew].org, 'OCA', 'organization joined onto the row');

    // --- filters narrow to a single attention bucket ------------------------------------------
    assert.deepEqual((await inboxConversations(tenantId, { box: 'communication', filter: 'ai_ready' })).map((c) => c.id), [cAi], 'filter=ai_ready');
    assert.deepEqual((await inboxConversations(tenantId, { box: 'communication', filter: 'unknown_contact' })).map((c) => c.id), [cUnknown], 'filter=unknown_contact');
    assert.deepEqual((await inboxConversations(tenantId, { box: 'communication', filter: 'delivery_problem' })).map((c) => c.id), [cDelivery], 'filter=delivery_problem');

    // --- summary counters (the calm header numbers) -------------------------------------------
    const s = await inboxSummary(tenantId);
    assert.equal(s.new, 2, 'summary.new = NEW & non-privacy (cNew, cUnknown)');
    assert.equal(s.waiting_on_us, 1, 'summary.waiting_on_us = status WAITING_ON_US (cWaitUs)');
    assert.equal(s.unknown_contact, 1, 'summary.unknown_contact');
    assert.equal(s.ai_ready, 1, 'summary.ai_ready');
    assert.equal(s.delivery_problem, 1, 'summary.delivery_problem');
    assert.equal(s.privacy_open, 1, 'summary.privacy_open counts the open privacy conversation');
  } finally {
    await closeCommDb();
  }
});
