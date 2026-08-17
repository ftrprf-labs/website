// Future Cockpit — Slice 5: the first RELATIONAL RADAR.
//
// Maculis brings a relation forward only when a concrete, explainable reason exists now, aggregates
// per relation so Vandaag never floods, ranks deterministically, and keeps full provenance so First
// Lens can later plug in as just another source. Two layers: pure derivation/aggregation/ranking
// (always runs) and a DB-backed buildRadar E2E (skips without DATABASE_URL).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCommSignal, deriveFollowUpSignal, deriveQuietSignal,
  aggregateSignals, rankCards, SIGNAL_PRIORITY, BUCKETS,
} from '../server/comm/signals.mjs';

const NOW = new Date('2026-08-17T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(NOW.getTime() + n * 86400000).toISOString();
const fu = (over) => ({ id: over.id || 'f1', status: 'open', first_name: 'Kim', last_name: 'De Vos', org: 'De Brug', contact_id: over.contact_id || 'kim', conversation_id: over.conversation_id || null, due_at: over.due_at, ...over });

// ---- E — a future follow-up is prepared work, never direct urgency -----------------------------
test('E future follow-up → KLAAR, not NU', () => {
  const s = deriveFollowUpSignal(fu({ due_at: daysAhead(4) }), NOW);
  assert.equal(s.type, 'FOLLOWUP_UPCOMING');
  assert.equal(s.bucket, 'KLAAR');
});

// ---- F — a due follow-up asks for attention ----------------------------------------------------
test('F due-today follow-up → NU (FOLLOWUP_DUE) with human reason', () => {
  const s = deriveFollowUpSignal(fu({ due_at: new Date(NOW.getTime() + 3 * 3600000).toISOString() }), NOW);
  assert.equal(s.type, 'FOLLOWUP_DUE');
  assert.equal(s.bucket, 'NU');
  assert.equal(s.reason, 'Follow-up met Kim is vandaag gepland.');
});

// ---- G — overdue outranks due ------------------------------------------------------------------
test('G overdue follow-up → NU, higher priority than a due one, human reason', () => {
  const overdue = deriveFollowUpSignal(fu({ id: 'f2', due_at: daysAgo(3) }), NOW);
  const due = deriveFollowUpSignal(fu({ id: 'f3', due_at: new Date(NOW.getTime() + 3600000).toISOString() }), NOW);
  assert.equal(overdue.type, 'FOLLOWUP_OVERDUE');
  assert.equal(overdue.reason, 'Follow-up met Kim is 3 dagen te laat.');
  assert.ok(overdue.priority > due.priority, 'overdue ranks above due');
  assert.equal(SIGNAL_PRIORITY.FOLLOWUP_OVERDUE > SIGNAL_PRIORITY.FOLLOWUP_DUE, true);
});

// ---- H — completing a follow-up removes its signal ---------------------------------------------
test('H a non-open follow-up yields no signal (completion clears attention)', () => {
  assert.equal(deriveFollowUpSignal(fu({ due_at: daysAgo(3), status: 'done' }), NOW), null);
});

// ---- I — quiet relationship, conservative and factual ------------------------------------------
test('I quiet relationship → RADAR signal with a factual human reason', () => {
  const s = deriveQuietSignal({ contactId: 'x', who: 'Kim De Vos', org: 'De Brug', lastContactAt: daysAgo(50), hasOpenAttention: false }, NOW, { thresholdDays: 45 });
  assert.equal(s.type, 'QUIET_RELATIONSHIP');
  assert.equal(s.bucket, 'RADAR');
  assert.equal(s.reason, 'Al 50 dagen geen contact met Kim.');
});
test('I quiet never fires below threshold, for never-contacted, or when attention is open', () => {
  assert.equal(deriveQuietSignal({ contactId: 'x', who: 'Kim', lastContactAt: daysAgo(10), hasOpenAttention: false }, NOW), null);
  assert.equal(deriveQuietSignal({ contactId: 'x', who: 'Kim', lastContactAt: null, hasOpenAttention: false }, NOW), null);
  assert.equal(deriveQuietSignal({ contactId: 'x', who: 'Kim', lastContactAt: daysAgo(90), hasOpenAttention: true }, NOW), null);
});

// ---- J — many signals for one relation aggregate into ONE card ---------------------------------
test('J multiple signals, one relation → one card, primary + secondary, no explosion', () => {
  const inbound = deriveCommSignal({ state: 'NEW', conversationId: 'v1', contactId: 'jb', who: 'Jean-Baptiste', summary: 'Jean-Baptiste vraagt of de tweede sessie deze maand kan.', intent: 'question' }, { derivedAt: NOW.toISOString() });
  const upcoming = deriveFollowUpSignal(fu({ id: 'f9', contact_id: 'jb', conversation_id: 'v1', first_name: 'Jean-Baptiste', last_name: '', due_at: daysAhead(2) }), NOW);
  const cards = aggregateSignals([upcoming, inbound]);
  assert.equal(cards.length, 1, 'one relation → one card');
  const card = cards[0];
  assert.equal(card.primary.type, 'INBOUND_QUESTION', 'most urgent is primary');
  assert.equal(card.bucket, 'NU');
  assert.equal(card.secondary.length, 1);
  assert.equal(card.secondary[0].type, 'FOLLOWUP_UPCOMING');
  assert.equal(card.followUps.length, 1, 'the prepared follow-up is still completable from the card');
});

// ---- M — deterministic ranking -----------------------------------------------------------------
test('M ranking is deterministic: delivery > inbound > overdue > due > upcoming > quiet', () => {
  const mk = (type, priority) => ({ key: type, type, bucket: 'NU', priority, relevantAt: NOW.toISOString() });
  const order = ['DELIVERY_PROBLEM', 'INBOUND_QUESTION', 'FOLLOWUP_OVERDUE', 'FOLLOWUP_DUE', 'FOLLOWUP_UPCOMING', 'QUIET_RELATIONSHIP'];
  const shuffled = order.map((t) => mk(t, SIGNAL_PRIORITY[t])).reverse();
  const ranked = rankCards(shuffled).map((c) => c.type);
  assert.deepEqual(ranked, order);
});

// ---- REPLY_READY is still NU (unanswered inbound), with a prepared concept ----------------------
test('REPLY_READY → NU inbound signal flagged prepared (concept ready), not a calmer bucket', () => {
  const s = deriveCommSignal({ state: 'REPLY_READY', conversationId: 'v2', contactId: 'k', who: 'Kim', summary: 'Kim vraagt iets.', intent: 'question' }, { derivedAt: NOW.toISOString() });
  assert.equal(s.bucket, 'NU');
  assert.equal(s.prepared, true);
  assert.equal(s.type, 'INBOUND_QUESTION');
});

// ---- L — provenance is present and traceable on every derived signal ---------------------------
test('L every signal carries traceable provenance (source, sourceId, rule, derivedAt)', () => {
  const s = deriveFollowUpSignal(fu({ id: 'f7', due_at: daysAgo(1) }), NOW);
  assert.equal(s.provenance.source, 'FOLLOW_UP');
  assert.equal(s.provenance.sourceId, 'f7');
  assert.ok(s.provenance.rule && s.provenance.derivedAt);
  assert.equal(s.key, 'FOLLOW_UP:f7');
});

// ---- DB-backed radar E2E (F/G/H/I/J/K/L/N through buildRadar) -----------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const dbopts = { skip: HAS_DB ? false : 'no DATABASE_URL — radar DB E2E skipped' };

test('DB — buildRadar: buckets, ranking, aggregation, quiet, tenant isolation, idempotency', dbopts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');
  const { createFollowUp, updateFollowUp } = await import('../server/comm/followups.mjs');

  try {
    await runMigrations({ silent: true });
    await query('truncate message, conversation, contact, organization, ai_draft, follow_up, activity cascade');
    const tenantId = await getDefaultTenantId();
    const other = (await query("insert into tenant(slug,name) values ('radar-other','Other') on conflict (slug) do update set name=excluded.name returning id")).rows[0].id;
    const now = new Date('2026-08-17T12:00:00.000Z');
    const ago = (m) => new Date(now.getTime() - m * 60000).toISOString();
    const agoDays = (d) => new Date(now.getTime() - d * 86400000).toISOString();

    const mkContact = async (tid, first, email, org) => {
      const o = (await query('insert into organization(tenant_id,name) values ($1,$2) returning id', [tid, org])).rows[0].id;
      const c = (await query('insert into contact(tenant_id,organization_id,identity_key,first_name,email) values ($1,$2,$3,$4,$5) returning id', [tid, o, email, first, email])).rows[0].id;
      return { o, c };
    };
    const inbound = async (tid, c, o, subject, body, at, { answered = false } = {}) => {
      const conv = (await query("insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,$4,$5,$6,$6) returning id",
        [tid, c, o, answered ? 'ANSWERED' : 'NEW', subject, at])).rows[0].id;
      await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL','x@x.nl',$3,'RECEIVED',$4)", [tid, conv, body, at]);
      if (answered) {
        await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','Antwoord.','SENT',$3)", [tid, conv, new Date(new Date(at).getTime() + 60000).toISOString()]);
        await query("update conversation set last_message_at=$2 where id=$1", [conv, new Date(new Date(at).getTime() + 60000).toISOString()]);
      }
      return conv;
    };

    // JB: unanswered inbound question + a proposed concept + a FUTURE follow-up (aggregation J).
    const jb = await mkContact(tenantId, 'Jean-Baptiste', 'jb@n.coop', 'Noorderlicht');
    const jbConv = await inbound(tenantId, jb.c, jb.o, 'Re: de tweede sessie', 'Zou de tweede sessie deze maand nog kunnen?', ago(60));
    await query("insert into ai_draft(tenant_id,conversation_id,summary,intent,status) values ($1,$2,'Jean-Baptiste vraagt of de tweede sessie deze maand kan.','question','proposed')", [tenantId, jbConv]);
    await createFollowUp(tenantId, { contactId: jb.c, organizationId: jb.o, conversationId: jbConv, title: 'Opvolgen: tweede sessie', dueAt: new Date(now.getTime() + 2 * 86400000).toISOString() });

    // Samir: OVERDUE follow-up (answered conversation, so no COMM signal competes).
    const samir = await mkContact(tenantId, 'Samir', 'samir@lumen.city', 'Lumen');
    const samirConv = await inbound(tenantId, samir.c, samir.o, 'Korte terugkoppeling', 'Ik laat snel iets weten.', ago(120), { answered: true });
    let samirFu = await createFollowUp(tenantId, { contactId: samir.c, organizationId: samir.o, conversationId: samirConv, title: 'Terugkoppeling navragen', dueAt: agoDays(3) });

    // Kim: DUE-today follow-up (answered conversation).
    const kim = await mkContact(tenantId, 'Kim', 'kim@debrug.be', 'De Brug');
    const kimConv = await inbound(tenantId, kim.c, kim.o, 'Vraag', 'Kunnen jullie ook kijken?', ago(200), { answered: true });
    const kimFu = await createFollowUp(tenantId, { contactId: kim.c, organizationId: kim.o, conversationId: kimConv, title: 'Opvolgen arbeidsmarkt', dueAt: new Date(now.getTime() + 3 * 3600000).toISOString() });

    // Noor: QUIET — answered exchange ~50 days ago (the reply lands a minute later), no open follow-up.
    const noor = await mkContact(tenantId, 'Noor', 'noor@stil.be', 'Stil');
    await inbound(tenantId, noor.c, noor.o, 'Bedankt', 'Bedankt voor de sessie.', agoDays(51), { answered: true });

    // Foreign tenant relation with its own overdue follow-up (isolation K).
    const f = await mkContact(other, 'Vreemd', 'v@ander.nl', 'Ander');
    await createFollowUp(other, { contactId: f.c, organizationId: f.o, title: 'Andere tenant', dueAt: agoDays(2) });

    const radar = await buildRadar(tenantId, { now, quietThresholdDays: 45 });

    // K — no foreign-tenant signal ever appears.
    assert.ok(!radar.signals.find((s) => s.who === 'Vreemd'), 'K foreign tenant excluded');

    // Buckets populated as expected.
    assert.equal(radar.counts.nu, 3, 'NU = JB (inbound) + Samir (overdue) + Kim (due)');
    assert.equal(radar.counts.radar, 1, 'RADAR = Noor (quiet)');
    // JB has a future follow-up folded in as secondary, so it is NOT a separate KLAAR card.
    assert.equal(radar.counts.klaar, 0, 'the only upcoming follow-up is aggregated onto JB’s NU card');

    // M — deterministic NU ranking: JB inbound (90) > Samir overdue (80) > Kim due (70).
    const nuTypes = radar.buckets.NU.map((c) => c.primary.type);
    assert.deepEqual(nuTypes, ['INBOUND_QUESTION', 'FOLLOWUP_OVERDUE', 'FOLLOWUP_DUE']);

    // J — JB is one card, inbound primary + upcoming follow-up secondary, follow-up completable.
    const jbCard = radar.buckets.NU.find((c) => c.contactId === jb.c);
    assert.equal(jbCard.primary.type, 'INBOUND_QUESTION');
    assert.equal(jbCard.primary.reason, 'Jean-Baptiste vraagt of de tweede sessie deze maand kan.');
    assert.ok(jbCard.secondary.some((s) => s.type === 'FOLLOWUP_UPCOMING'), 'future follow-up folded in');
    assert.equal(jbCard.followUps.length, 1);

    // I — Noor quiet with a factual reason.
    const noorCard = radar.buckets.RADAR[0];
    assert.equal(noorCard.primary.type, 'QUIET_RELATIONSHIP');
    assert.equal(noorCard.primary.reason, 'Al 50 dagen geen contact met Noor.');

    // L — provenance is traceable to the right source.
    const samirCard = radar.buckets.NU.find((c) => c.contactId === samir.c);
    assert.equal(samirCard.primary.type, 'FOLLOWUP_OVERDUE');
    assert.ok(samirCard.provenance.some((p) => p.source === 'FOLLOW_UP' && p.sourceId === samirFu.id));

    // H — completing Samir's follow-up removes his NU signal on the next evaluation.
    await updateFollowUp(tenantId, samirFu.id, { status: 'done' });
    const radar2 = await buildRadar(tenantId, { now, quietThresholdDays: 45 });
    assert.ok(!radar2.buckets.NU.find((c) => c.contactId === samir.c), 'H completed follow-up leaves NU');
    assert.equal(radar2.counts.nu, 2, 'H one fewer NU card');

    // N — idempotency: re-evaluating the SAME state yields the SAME buckets (no drift, no dupes).
    const radar3 = await buildRadar(tenantId, { now, quietThresholdDays: 45 });
    assert.deepEqual(radar3.counts, radar2.counts, 'N counts stable');
    assert.deepEqual(radar3.buckets.NU.map((c) => c.key), radar2.buckets.NU.map((c) => c.key), 'N same cards, same order');

    // Dossier consistency (§ 20, één werkelijkheid): the same radar scoped to one relation tells the
    // exact same story as Vandaag — never a second, contradictory reality.
    const jbScoped = await buildRadar(tenantId, { now, contactId: jb.c, quietThresholdDays: 45 });
    const jbFromToday = radar3.buckets.NU.find((c) => c.contactId === jb.c);
    const jbScopedCard = [...jbScoped.buckets.NU, ...jbScoped.buckets.KLAAR, ...jbScoped.buckets.RADAR][0];
    assert.equal(jbScopedCard.primary.reason, jbFromToday.primary.reason, 'dossier reason equals Vandaag reason');
    assert.ok(!jbScoped.signals.some((s) => s.contactId && s.contactId !== jb.c), 'dossier radar is scoped to the one relation');
  } finally {
    await closePool();
  }
});

test('BUCKETS contract is the three meaningful states', () => {
  assert.deepEqual(BUCKETS, ['NU', 'KLAAR', 'RADAR']);
});
