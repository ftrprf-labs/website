// De SILENCE-keten: een betekenisvolle non-reveal opent net zo goed een omgeving als een reveal.
//
// WAAROM DIT BESTAAT
//
// De poort toetste op de aanwezigheid van een reveal-regel. Daarmee gold "geen conclusie" als
// "niets gezien", en dat zijn twee verschillende dingen. De Lens noemt een SILENCE zelf een
// volwaardige uitkomst en berekent er gegronde observaties bij; die werden aan drie kanten
// weggegooid. Deze tests leggen alle drie de schakels vast, plus de grens eronder.
//
// De helft die stukgaat zodra iemand later iets vanzelfsprekends toevoegt:
//
//   * de betekenispoort staat in de Lens, niet hier. Een lege observatielijst opent NIETS;
//   * een observatie zonder grond is een mening en telt niet mee;
//   * de breedte van de blik is geen bewijssterkte, en spreekt dus andere taal dan een reveal;
//   * zijn antwoord op "herken je dit" hoort bij de reveal en wordt nooit aan een non-reveal
//     gehangen: die vraag is over deze observaties nooit gesteld.
//
// Twee lagen: pure afleiding (draait altijd) en een DB-keten (SLAAT OVER zonder Postgres).

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MIJN_MACULIS_URL = process.env.MIJN_MACULIS_URL || 'https://mijn-maculis.test';

const { deriveByToken } = await import('../server/maculis-sessions.mjs');

const NU = '2026-08-21T12:00:00.000Z';

// Zoals de Lens het wegschrijft: note, meaning, lens en de grond eronder.
const OBS = [
  {
    subject: 'Samen werken aan herstel dat blijft',
    note: 'Op je homepage krijgt "Samen werken aan herstel dat blijft" veel nadruk.',
    meaning: 'Daarmee vertel je duidelijk waar je voor staat.',
    lens: 'Begrijpt een nieuwe bezoeker ook waarom dit voor hem de juiste keuze is?',
    basis: 'inferred',
    evidence: [{ surface: 'homepage', url: 'https://vandoorn-test.nl/', quote: 'Samen werken aan herstel dat blijft' }],
  },
  {
    subject: 'binnen een week terecht',
    note: 'Je site zegt zelf: "Je kunt bij ons meestal binnen een week terecht."',
    meaning: 'Dit staat er letterlijk.',
    lens: 'Wat wil je dat iemand hieruit opmaakt?',
    basis: 'explicit',
    evidence: [{ surface: 'pagina Contact', url: 'https://vandoorn-test.nl/contact', quote: 'Je kunt bij ons meestal binnen een week terecht.' }],
  },
];

const sessie = (shown, over = {}) => ({
  participant: 'tok-1', started_at: NU, received_at: NU, updated_at: NU,
  inner_circle_opt_in: true, shown,
  events: [{ name: 'session_completed' }, { name: 'account_handoff_accepted', at: NU }],
  ...over,
});

// ---- 1. de afleiding ---------------------------------------------------------------------------

test('een SILENCE met gegronde observaties komt door de afleiding heen', () => {
  const d = deriveByToken([sessie({ outcome: 'SILENCE', pages_seen: 6, observations: OBS })]).get('tok-1');
  assert.equal(d.reveal, null, 'een non-reveal komt NOOIT in het reveal-veld terecht');
  assert.ok(d.observaties, 'maar hij is er wel');
  assert.equal(d.observaties.items.length, 2);
  assert.equal(d.observaties.pages_seen, 6, 'de breedte van de blik reist mee');
  assert.equal(d.observaties.items[0].evidence[0].quote, 'Samen werken aan herstel dat blijft');
  assert.equal(d.observaties.items[0].evidence[0].label, 'homepage',
    'de vindplaats heet in de Lens `surface` en hier `label`; het is hetzelfde ding');
  assert.equal(d.observaties.items[1].basis, 'explicit');
  assert.equal(d.keep, true);
});

test('een SILENCE zonder observaties levert niets op', () => {
  const d = deriveByToken([sessie({ outcome: 'SILENCE', pages_seen: 6, observations: [] })]).get('tok-1');
  assert.equal(d.observaties, null, 'geen betekenis, geen inhoud');
  assert.equal(d.reveal, null);
});

test('een observatie zonder grond telt niet mee', () => {
  const kaal = [{ note: 'Iets wat we zagen.', meaning: '', lens: '', evidence: [] }];
  const d = deriveByToken([sessie({ outcome: 'SILENCE', pages_seen: 4, observations: kaal })]).get('tok-1');
  assert.equal(d.observaties, null, 'zonder citaat is het een mening, en die opent niets');
});

test('een REVEAL blijft precies doen wat hij deed', () => {
  const d = deriveByToken([sessie(
    { outcome: 'REVEAL', family: 'TELLING_ABSENCE', reveal_line: 'Wat je het duidelijkst belooft, laat je nergens zien.',
      evidence: [{ quote: 'gespecialiseerd in sportrevalidatie', label: 'homepage' }] },
  )]).get('tok-1');
  assert.equal(d.reveal.line, 'Wat je het duidelijkst belooft, laat je nergens zien.');
  assert.equal(d.observaties, null, 'en hij krijgt geen observatieveld erbij');
});

// ---- 2. de keten, met database ------------------------------------------------------------------

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — ketentests overgeslagen' };

const tester = () => ({
  id: 'inv-stil-1', first_name: 'Thomas', last_name: 'van Doorn', company_name: 'Fysiotherapie Van Doorn',
  email: 'thomas@vandoorn-test.nl', mobile: '+31612345678', domain: 'vandoorn-test.nl',
});
const basis = { started: true, completed: true, completed_at: NU, keep: true, keep_at: NU,
  consent: 'OPTED_IN', answers: {}, contexts: {} };

async function schoon(query) {
  await query(`truncate mijn_room, help_dossier_actor, help_dossier, insight_intent_event,
    insight_intent, insight_context_share, insight_recognition, insight_recognition_event,
    customer_invite, customer_login_token, customer_insight, insight_version, insight_observation,
    insight_share_event, customer_access, collaboration_item, relationship_memory, ai_draft,
    follow_up, message, conversation, communication_preference, channel_identity, contact,
    organization cascade`);
}

test('TEST 1 · een echte Reveal opent een omgeving', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();
    const r = await bereidKamerVoor(tester(), {
      ...basis,
      reveal: { line: 'Wat je het duidelijkst belooft, laat je nergens zien.', outcome: 'REVEAL',
        family: 'TELLING_ABSENCE', evidence_count: 1,
        evidence: [{ quote: 'gespecialiseerd in sportrevalidatie', label: 'homepage' }], at: NU },
    }, { tenantId: tid });
    assert.equal(r.ok, true);
    assert.equal(r.status, 'klaargezet');
    const ins = (await query('select stance, title from customer_insight')).rows;
    assert.equal(ins.length, 1);
    assert.equal(ins[0].stance, 'reveal');
  } finally { await closePool(); }
});

test('TEST 2 · een betekenisvolle SILENCE opent een omgeving', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    const afgeleid = deriveByToken([sessie({ outcome: 'SILENCE', pages_seen: 6, observations: OBS })]).get('tok-1');
    const r = await bereidKamerVoor(tester(), { ...basis, reveal: null, observaties: afgeleid.observaties }, { tenantId: tid });

    assert.equal(r.ok, true, 'de omgeving ontstaat');
    assert.equal(r.status, 'klaargezet');

    const ins = (await query('select title, stance, meaning, basis, not_yet_known, perspective, area from customer_insight order by created_at asc')).rows;
    assert.equal(ins.length, 2, 'één inzicht per betekenisvolle observatie, geen samenvattende');
    assert.ok(ins.every((i) => i.stance === 'non_reveal'), 'allebei als non-reveal, want dat is de houding');
    assert.equal(ins[0].title, OBS[0].note, 'de observatie zelf is de uitspraak, woordelijk');
    assert.equal(ins[0].meaning, OBS[0].meaning);
    assert.ok(ins[0].basis.includes('6 plekken'), 'de breedte staat in de onderbouwing, in woorden');
    assert.ok(ins[0].not_yet_known.includes(OBS[0].lens), 'de open vraag van de Lens komt woordelijk mee');
    assert.ok(ins.every((i) => i.perspective === 'buitenwereld' && i.area === 'zichtbaarheid'));

    const grond = (await query('select customer_label from insight_observation where customer_label is not null')).rows;
    assert.ok(grond.some((g) => g.customer_label.includes('Samen werken aan herstel dat blijft')),
      'het citaat en zijn vindplaats staan onder het inzicht');

    const herk = (await query('select count(*)::int n from insight_recognition')).rows[0].n;
    assert.equal(herk, 0, 'hij beantwoordde "herken je dit" nooit over deze observaties');

    // audit_event wordt nooit leeggemaakt, dus zonder afbakening lees je een rij van een vorige run.
    const audit = (await query(
      "select meta from audit_event where action='mijn_room_prepared' and entity_id=$1 order by at desc",
      [r.roomId])).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].meta.uitkomst, 'SILENCE');
    assert.equal(audit[0].meta.observaties, 2);

    // Nog een keer dezelfde sessie: dat is één werkelijkheid, geen tweede.
    const opnieuw = await bereidKamerVoor(tester(), { ...basis, reveal: null, observaties: afgeleid.observaties }, { tenantId: tid });
    assert.equal(opnieuw.ok, true);
    assert.equal((await query('select count(*)::int n from customer_insight')).rows[0].n, 2, 'idempotent');
    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 1);
  } finally { await closePool(); }
});

test('TEST 3 · een SILENCE zonder betekenis opent niets', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    const leeg = deriveByToken([sessie({ outcome: 'SILENCE', pages_seen: 6, observations: [] })]).get('tok-1');
    assert.equal(leeg.observaties, null);

    const r = await bereidKamerVoor(tester(), { ...basis, reveal: null, observaties: leeg.observaties }, { tenantId: tid });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no_statement', 'en de reden is dezelfde als altijd: er is geen uitspraak');

    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 0, 'geen kamer');
    assert.equal((await query('select count(*)::int n from customer_insight')).rows[0].n, 0, 'geen inzicht');
    assert.equal((await query('select count(*)::int n from organization')).rows[0].n, 0,
      'en zelfs geen organisatie: de poort staat vóór de identiteit');
  } finally { await closePool(); }
});
