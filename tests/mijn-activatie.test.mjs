// Lens → Cockpit → Mijn Maculis: de activatieflow, en de grenzen eromheen.
//
// De ondernemer vraagt zelf om te bewaren, de omgeving wordt automatisch klaargezet, en er is
// precies één menselijke bevestiging voordat er iets het gebouw verlaat. Daarna voert Maculis de
// rest uit. Deze tests bewijzen dat het werkt, en vooral wat er NIET gebeurt.
//
// De helft die stukgaat zodra iemand later iets vanzelfsprekends toevoegt:
//
//   * het signaal is een AFLEIDING uit de kamer, geen opgeslagen object. Beslist een mens, dan
//     verdwijnt het vanzelf. Er is geen interesse-tabel en geen rij in attention_item;
//   * bewaren zonder benaderen levert nooit een activatieknop op;
//   * het kanaal wordt gekozen door de mens, nooit afgeleid uit de algemene toestemming;
//   * een mock-provider levert nooit "verzonden";
//   * opnieuw uitnodigen gebruikt DEZELFDE kamer, zonder nieuwe toestemming.
//
// Twee lagen: pure afleiding (draait altijd) en een DB-keten (SLAAT OVER zonder Postgres).

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MIJN_MACULIS_URL = process.env.MIJN_MACULIS_URL || 'https://mijn-maculis.test';

// Dynamisch, en dat is geen stijlkeuze: een statische import wordt gehesen tot BOVEN de regel
// hierboven, waardoor config.mjs zou laden zonder publieke basis-URL en elke uitnodiging zou
// stranden op `no_public_url`.
const {
  deriveKamerSignaal, aggregateSignals, deriveFollowUpSignal, deriveQuietSignal, SIGNAL_PRIORITY,
} = await import('../server/comm/signals.mjs');

const NOW = '2026-08-21T12:00:00.000Z';
const rij = (over = {}) => ({
  id: 'room-1', status: 'klaargezet', contactId: 'kim', organizationId: 'org-1',
  firstName: 'Kim', lastName: 'Mertens', org: 'Topzorggroep',
  createdAt: NOW, invitedAt: null, uitspraak: 'De expertise lijkt online minder zichtbaar dan de werkelijkheid.',
  levendeUitnodiging: false, kanalen: [{ kanaal: 'EMAIL', mogelijk: true, reden: 'ok' }],
  ...over,
});

// ---- A: een klaargezette omgeving is voorbereid werk, geen urgentie ----------------------------
test('A klaargezette kamer → MIJN_ROOM_READY in KLAAR, met de uitspraak die hij zelf las', () => {
  const s = deriveKamerSignaal(rij(), { derivedAt: NOW });
  assert.equal(s.type, 'MIJN_ROOM_READY');
  assert.equal(s.bucket, 'KLAAR');
  assert.equal(s.kind, 'kamer');
  assert.equal(s.source, 'FIRST_LENS');
  assert.equal(s.who, 'Kim Mertens');
  assert.equal(s.org, 'Topzorggroep');
  assert.match(s.reason, /^Kim vroeg om dit te bewaren/);
  assert.equal(s.kamer.uitspraak, rij().uitspraak);
  assert.equal(s.kamer.herhaling, false);
});

// ---- B: bewaren zonder benaderen is zichtbaar, maar nooit een actiepunt ------------------------
test('B wacht_op_contact → MIJN_ROOM_WAITING in RADAR, en zegt dat er niets uitgaat', () => {
  const s = deriveKamerSignaal(rij({ status: 'wacht_op_contact' }), { derivedAt: NOW });
  assert.equal(s.type, 'MIJN_ROOM_WAITING');
  assert.equal(s.bucket, 'RADAR');
  assert.match(s.reason, /geen toestemming om benaderd te worden/);
  assert.match(s.reason, /Er gaat niets uit/);
});

// ---- C: een levende uitnodiging vraagt niets ---------------------------------------------------
test('C uitgenodigd met een levende link → geen signaal', () => {
  assert.equal(deriveKamerSignaal(rij({ status: 'uitgenodigd', levendeUitnodiging: true }), { derivedAt: NOW }), null);
});

test('C2 actief en ingetrokken leveren nooit een signaal', () => {
  for (const status of ['actief', 'ingetrokken']) {
    assert.equal(deriveKamerSignaal(rij({ status }), { derivedAt: NOW }), null, status);
  }
});

// ---- D: een verlopen uitnodiging is opnieuw voorbereid werk ------------------------------------
test('D uitgenodigd zonder levende link → MIJN_ROOM_EXPIRED in KLAAR, gemarkeerd als herhaling', () => {
  const s = deriveKamerSignaal(rij({ status: 'uitgenodigd', levendeUitnodiging: false, invitedAt: NOW }), { derivedAt: NOW });
  assert.equal(s.type, 'MIJN_ROOM_EXPIRED');
  assert.equal(s.bucket, 'KLAAR');
  assert.equal(s.kamer.herhaling, true, 'de Cockpit mag weten dat dit een tweede keer is');
  assert.match(s.reason, /verlopen zonder dat hij binnen is geweest/);
});

// ---- E: zonder mens geen signaal ---------------------------------------------------------------
test('E een kamer zonder contact levert niets op: er is geen ontvanger en geen consentsubject', () => {
  assert.equal(deriveKamerSignaal(rij({ contactId: null }), { derivedAt: NOW }), null);
});

// ---- F: GRENS — het signaal draagt alleen wat hij zelf las --------------------------------------
test('F het signaal draagt geen reflectie, geen intentie en geen token', () => {
  const s = deriveKamerSignaal(rij(), { derivedAt: NOW });
  const plat = JSON.stringify(s);
  for (const woord of ['recognition', 'reflect', 'intent', 'token', 'notitie']) {
    assert.equal(plat.includes(woord), false, `${woord} hoort niet op dit pad`);
  }
  assert.deepEqual(Object.keys(s.kamer).sort(), ['herhaling', 'id', 'kanalen', 'status', 'uitspraak']);
});

// ---- G: rangorde — een mens die zelf iets vroeg staat boven algemeen voorbereid werk -----------
test('G een klaargezette kamer weegt zwaarder dan een toekomstige follow-up, en nooit zwaarder dan iets dat vandaag moet', () => {
  assert.ok(SIGNAL_PRIORITY.MIJN_ROOM_READY > SIGNAL_PRIORITY.FOLLOWUP_UPCOMING);
  assert.ok(SIGNAL_PRIORITY.MIJN_ROOM_READY < SIGNAL_PRIORITY.FOLLOWUP_DUE);
  assert.ok(SIGNAL_PRIORITY.MIJN_ROOM_READY > SIGNAL_PRIORITY.MIJN_ROOM_EXPIRED);
  assert.ok(SIGNAL_PRIORITY.MIJN_ROOM_WAITING > SIGNAL_PRIORITY.QUIET_RELATIONSHIP);
});

// ---- H: aggregatie — één kaart per relatie, met de kamer erbij ---------------------------------
test('H de kamer rijdt mee op de kaart van dezelfde relatie', () => {
  const kamer = deriveKamerSignaal(rij(), { derivedAt: NOW });
  const stil = deriveQuietSignal(
    { contactId: 'kim', organizationId: 'org-1', who: 'Kim Mertens', org: 'Topzorggroep', lastContactAt: '2026-05-01T00:00:00.000Z' },
    new Date(NOW), { thresholdDays: 45 });
  const [kaart] = aggregateSignals([stil, kamer]);
  assert.equal(kaart.kind, 'kamer', 'de kamer is de primaire reden');
  assert.equal(kaart.bucket, 'KLAAR');
  assert.ok(kaart.kamer, 'de kamer rijdt mee zodat de kaart de kanalen kent');
  assert.equal(kaart.kamer.id, 'room-1');
  assert.equal(kaart.secondary.length, 1, 'de stilte blijft leesbaar als nevenreden');
});

test('H2 een relatie zonder kamer houdt kamer op null', () => {
  const fu = deriveFollowUpSignal({ id: 'f1', status: 'open', first_name: 'Sam', contact_id: 'sam', due_at: null }, new Date(NOW));
  const [kaart] = aggregateSignals([fu]);
  assert.equal(kaart.kamer, null);
  assert.equal(kaart.kind, 'relation');
});

// ================================================================================================
// DB-keten
// ================================================================================================

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — ketentests overgeslagen' };

const BEWIJS = [{ quote: 'twintig jaar ervaring', label: 'Over ons', url: 'https://topzorg-test.nl/over-ons' }];
const sessie = (over = {}) => ({
  started: true, completed: true, completed_at: new Date().toISOString(),
  keep: true, keep_at: new Date().toISOString(),
  consent: 'OPTED_IN',
  answers: { recognition: 'deels' }, contexts: {},
  reveal: {
    line: 'De expertise van Topzorggroep lijkt online minder zichtbaar dan de werkelijkheid.',
    family: 'visibility', outcome: 'REVEAL', evidence_count: BEWIJS.length, evidence: BEWIJS,
    at: new Date().toISOString(),
  },
  ...over,
});
const tester = (over = {}) => ({
  id: 'inv-activatie-1', first_name: 'Kim', last_name: 'Mertens', company_name: 'Topzorggroep',
  email: 'kim@topzorg-test.nl', mobile: '+31612345678', domain: 'topzorg-test.nl', ...over,
});

async function schoon(query) {
  await query(`truncate mijn_room, help_dossier_actor, help_dossier, insight_intent_event,
    insight_intent, insight_context_share, insight_recognition, insight_recognition_event,
    customer_invite, customer_login_token, customer_insight, insight_version, insight_observation,
    insight_share_event, customer_access, collaboration_item, relationship_memory, ai_draft,
    follow_up, message, conversation, communication_preference, channel_identity, contact,
    organization cascade`);
}

const kamerKaarten = (radar) => [...radar.buckets.NU, ...radar.buckets.KLAAR, ...radar.buckets.RADAR].filter((c) => c.kamer);

test('de volledige activatieflow: Lens afgerond, Cockpit signaal, één bevestiging, omgeving actief', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');
  const { nodigUit, wijsAf } = await import('../server/mijn/kamers.mjs');
  const { verzilverUitnodiging } = await import('../server/mijn/uitnodiging.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    // ---- 1: de afgeronde Lens zet de omgeving klaar ------------------------------------------
    const voorbereid = await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    assert.equal(voorbereid.ok, true);
    assert.equal(voorbereid.status, 'klaargezet');

    // ---- 2: de Cockpit toont dat automatisch in Vandaag ---------------------------------------
    let radar = await buildRadar(tid);
    let kaarten = kamerKaarten(radar);
    assert.equal(kaarten.length, 1, 'precies één kaart, geen kaartenexplosie');
    const kaart = kaarten[0];
    assert.equal(kaart.bucket, 'KLAAR', 'voorbereid werk, geen urgentie');
    assert.equal(kaart.primary.type, 'MIJN_ROOM_READY');
    assert.equal(kaart.primary.source, 'FIRST_LENS');
    assert.equal(kaart.who, 'Kim Mertens');
    assert.equal(kaart.org, 'Topzorggroep');
    assert.equal(kaart.kamer.uitspraak, sessie().reveal.line, 'woordelijk de zin die zij zelf las');
    assert.equal(radar.counts.kamers, 1);

    // ---- 3: GRENS — geen enkel kanaal doet alsof ----------------------------------------------
    // Zonder echt transport is elk kanaal onmogelijk, en de reden staat erbij. De mock-adapter geeft
    // `ok:true` terug, dus toetsen op het bestaan van een provider zou hier "verzonden" opleveren.
    const redenen = Object.fromEntries(kaart.kamer.kanalen.map((k) => [k.kanaal, k]));
    assert.equal(redenen.EMAIL.mogelijk, false);
    assert.equal(redenen.EMAIL.reden, 'geen_transport');
    assert.equal(redenen.WHATSAPP.mogelijk, false);
    assert.equal(redenen.WHATSAPP.reden, 'geen_transport', 'WhatsApp draait als mock, dus niet live');

    // ---- 4: GRENS — het kanaal wordt nooit geraden --------------------------------------------
    const onzin = await nodigUit(tid, kaart.kamer.id, { kanaal: 'DUIF' });
    assert.equal(onzin.ok, false);
    assert.equal(onzin.error, 'unknown_channel');

    // ---- 5: één menselijke bevestiging, daarna voert Maculis uit ------------------------------
    const uit = await nodigUit(tid, kaart.kamer.id, { kanaal: null });
    assert.equal(uit.ok, true);
    assert.equal(uit.bezorging, 'handmatig', 'geen transport, dus we melden niet dat er iets verstuurd is');
    assert.equal(uit.herhaling, false);
    assert.match(uit.link, /^https:\/\/mijn-maculis\.test\/mijn\.html\?u=/);
    assert.equal(uit.email, 'kim@topzorg-test.nl');

    const na = (await query('select status, invited_at from mijn_room')).rows[0];
    assert.equal(na.status, 'uitgenodigd');
    assert.ok(na.invited_at, 'het moment van de menselijke beslissing staat vast');

    // ---- 6: het signaal verdwijnt vanzelf, want het is een afleiding --------------------------
    radar = await buildRadar(tid);
    assert.equal(kamerKaarten(radar).length, 0, 'beslist is beslist: geen kaart die blijft hangen');
    assert.equal(radar.counts.kamers, 0);

    // ---- 7: GRENS — twee keer klikken levert geen tweede link ---------------------------------
    const nogmaals = await nodigUit(tid, kaart.kamer.id, { kanaal: null });
    assert.equal(nogmaals.ok, false);
    assert.equal(nogmaals.error, 'already_open', 'een dubbele klik is geen tweede uitnodiging');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 1);

    // ---- 8: een verlopen uitnodiging komt terug als beslissing --------------------------------
    await query("update customer_invite set expires_at = now() - interval '1 day'");
    radar = await buildRadar(tid);
    kaarten = kamerKaarten(radar);
    assert.equal(kaarten.length, 1, 'een dode deurbel hoort niet stil te blijven');
    assert.equal(kaarten[0].primary.type, 'MIJN_ROOM_EXPIRED');
    assert.equal(kaarten[0].bucket, 'KLAAR');
    assert.equal(kaarten[0].kamer.herhaling, true);

    // ---- 9: opnieuw uitnodigen gebruikt DEZELFDE kamer ----------------------------------------
    const opnieuw = await nodigUit(tid, kaart.kamer.id, { kanaal: null });
    assert.equal(opnieuw.ok, true);
    assert.equal(opnieuw.herhaling, true);
    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 1, 'geen tweede kamer');
    assert.equal((await query('select count(*)::int n from organization')).rows[0].n, 1, 'geen tweede organisatie');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 2, 'wel een tweede deurbel');
    // Geen nieuwe toestemming: er is geen enkele kanaalvoorkeur bijgeschreven.
    assert.equal((await query('select count(*)::int n from communication_preference')).rows[0].n, 0);

    // ---- 10: audit en historie --------------------------------------------------------------
    // Op deze kamer, want audit_event wordt bewust nooit leeggemaakt: een logboek dat je kunt
    // wissen is geen logboek.
    const audit = (await query(
      "select action, meta from audit_event where action='mijn_room_invited' and entity_id=$1 order by at asc",
      [kaart.kamer.id])).rows;
    assert.equal(audit.length, 2, 'beide beslissingen staan vast');
    assert.equal(audit[0].meta.herhaling, false);
    assert.equal(audit[1].meta.herhaling, true);
    assert.equal(audit[1].meta.bezorging, 'handmatig');

    // ---- 11: binnenkomen maakt de omgeving actief ---------------------------------------------
    const raw = opnieuw.link.split('u=')[1];
    const binnen = await verzilverUitnodiging(decodeURIComponent(raw));
    assert.equal(binnen.ok, true);
    assert.equal((await query('select status from mijn_room')).rows[0].status, 'actief');
    radar = await buildRadar(tid);
    assert.equal(kamerKaarten(radar).length, 0, 'een actieve omgeving vraagt niets meer');

    // ---- 12: afwijzen laat de kaart verdwijnen zonder de kamer te wissen ----------------------
    await schoon(query);
    const tweede = await bereidKamerVoor(tester({ id: 'inv-activatie-2' }), sessie(), { tenantId: tid });
    assert.equal(tweede.ok, true);
    assert.equal(kamerKaarten(await buildRadar(tid)).length, 1);
    await wijsAf(tid, (await query('select id from mijn_room')).rows[0].id, 'nu niet passend');
    assert.equal(kamerKaarten(await buildRadar(tid)).length, 0, 'een afgewezen kamer blijft niet nagen');
    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 1, 'en blijft wel bestaan');
  } finally {
    await closePool();
  }
});

test('bewaren zonder benaderen: zichtbaar op de radar, en geen enkele weg naar buiten', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');
  const { nodigUit } = await import('../server/mijn/kamers.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    // Bewaren gegeven, benaderen niet. ADR-0003 D2: dat is een geldige uitkomst, geen halve toestand.
    const r = await bereidKamerVoor(tester({ id: 'inv-geen-contact' }), sessie({ consent: null }), { tenantId: tid });
    assert.equal(r.status, 'wacht_op_contact');

    const kaarten = kamerKaarten(await buildRadar(tid));
    assert.equal(kaarten.length, 1, 'zijn keuze hoort zichtbaar te zijn, niet stil');
    assert.equal(kaarten[0].bucket, 'RADAR', 'geen actiepunt');
    assert.equal(kaarten[0].primary.type, 'MIJN_ROOM_WAITING');

    // En er is geen weg naar buiten, ook niet wanneer iemand de route rechtstreeks aanroept.
    const poging = await nodigUit(tid, kaarten[0].kamer.id, { kanaal: 'EMAIL' });
    assert.equal(poging.ok, false);
    assert.equal(poging.error, 'no_contact_consent');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 0, 'er ontstaat niet eens een uitnodiging');
    assert.equal((await query('select status from mijn_room')).rows[0].status, 'wacht_op_contact');
  } finally {
    await closePool();
  }
});
