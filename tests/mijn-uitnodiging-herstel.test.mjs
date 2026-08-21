// Een mislukte verzending mag de persoonlijke omgeving nooit dichthouden.
//
// De uitnodiging wordt aangemaakt vóórdat hij verstuurd wordt, en zijn rauwe waarde bestaat maar één
// keer. Mislukte de verzending en bleef die rij staan, dan gold hij daarna als "levende"
// uitnodiging: de volgende poging kreeg `already_open`, en een ondernemer die zelf om zijn omgeving
// had gevraagd was zeven dagen onbereikbaar. Niets meldde dat.
//
// Deze tests draaien met een LIVE e-mailtransport, want alleen dan wordt er werkelijk verstuurd en
// kan de verzending werkelijk mislukken. Daarom staan ze in een eigen bestand: node:test geeft elk
// bestand een eigen proces, en deze omgevingsvariabelen mogen de andere tests niet raken.
//
// De mislukking wordt afgedwongen met een expliciete opt-out, niet met een netwerkfout. Zo is de
// uitkomst deterministisch en gaat er ook in een test nooit werkelijk iets het gebouw uit.

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MIJN_MACULIS_URL = process.env.MIJN_MACULIS_URL || 'https://mijn-maculis.test';
process.env.MAIL_TRANSPORT = 'resend';
process.env.MAIL_API_KEY = 'test-key-not-used-the-consent-gate-stops-us-first';
process.env.MAIL_FROM = 'maculis@voorbeeld.test';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — ketentests overgeslagen' };

const BEWIJS = [{ quote: 'twintig jaar ervaring', label: 'Over ons', url: 'https://topzorg-test.nl/over-ons' }];
const sessie = () => ({
  started: true, completed: true, completed_at: new Date().toISOString(),
  keep: true, keep_at: new Date().toISOString(), consent: 'OPTED_IN',
  answers: { recognition: 'deels' }, contexts: {},
  reveal: {
    line: 'De expertise van Topzorggroep lijkt online minder zichtbaar dan de werkelijkheid.',
    family: 'visibility', outcome: 'REVEAL', evidence_count: 1, evidence: BEWIJS,
    at: new Date().toISOString(),
  },
});
const tester = () => ({
  id: 'inv-herstel-1', first_name: 'Kim', last_name: 'Mertens', company_name: 'Topzorggroep',
  email: 'kim@topzorg-test.nl', mobile: '+31612345678', domain: 'topzorg-test.nl',
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

test('een mislukte verzending laat de omgeving open en opnieuw te proberen', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  const { buildRadar } = await import('../server/comm/signals.mjs');
  const { nodigUit } = await import('../server/mijn/kamers.mjs');
  const { setPreference } = await import('../server/comm/consent.mjs');
  const { getChannelProvider } = await import('../server/comm/providers/index.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    // Voorwaarde voor deze test: e-mail moet werkelijk kunnen bezorgen. Anders wordt de bezorging
    // `handmatig`, gaat er niets uit, en kan er niets mislukken.
    assert.equal(getChannelProvider('EMAIL').mode, 'live', 'de test draait met een live transport');

    const voorbereid = await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    assert.equal(voorbereid.status, 'klaargezet');
    const kamerId = (await query('select id from mijn_room')).rows[0].id;
    const contactId = (await query('select id from contact')).rows[0].id;

    // Deze mens heeft e-mail expliciet geweigerd. De uitgaande poort blokkeert dus, ná het
    // aanmaken van de uitnodiging. Precies het scenario waar het misging.
    await setPreference(tid, contactId, { channel: 'EMAIL', purpose: 'service', allowed: false, source: 'test' });

    const mislukt = await nodigUit(tid, kamerId, { kanaal: 'EMAIL' });
    assert.equal(mislukt.ok, false);
    assert.equal(mislukt.error, 'consent_blocked', 'de uitgaande poort hield hem tegen');
    assert.equal(mislukt.opnieuwMogelijk, true, 'en zegt dat opnieuw proberen kan');

    // ---- de kern: er staat geen dode uitnodiging meer ----------------------------------------
    const na = (await query('select id, revoked_at, accepted_at from customer_invite')).rows;
    assert.equal(na.length, 1, 'er is één poging geweest en die blijft zichtbaar');
    assert.ok(na[0].revoked_at, 'en hij is ingetrokken, want hij is nooit aangekomen');
    assert.equal(na[0].accepted_at, null);

    const kamer = (await query('select status, invited_at from mijn_room')).rows[0];
    assert.equal(kamer.status, 'klaargezet', 'de omgeving is niet op uitgenodigd gezet');
    assert.equal(kamer.invited_at, null, 'er is geen moment van uitnodigen vastgelegd');

    // De kaart staat gewoon nog in Vandaag: de medewerker ziet dat er nog iets te doen is.
    const kaarten = kamerKaarten(await buildRadar(tid));
    assert.equal(kaarten.length, 1, 'de kaart blijft staan');
    assert.equal(kaarten[0].primary.type, 'MIJN_ROOM_READY', 'en nog steeds als klaargezet');

    // De mislukking staat in het logboek, met de reden, zonder adres of sleutel.
    const audit = (await query(
      "select meta from audit_event where action='mijn_room_invite_failed' and entity_id=$1", [kamerId])).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].meta.reden, 'consent_blocked');
    assert.equal(audit[0].meta.kanaal, 'EMAIL');
    assert.equal(JSON.stringify(audit[0].meta).includes('kim@'), false, 'geen adres in het logboek');

    // ---- opnieuw proberen werkt, en levert geen tweede levende uitnodiging op -----------------
    const opnieuw = await nodigUit(tid, kamerId, { kanaal: null });
    assert.equal(opnieuw.ok, true, 'de tweede poging slaagt gewoon');
    assert.equal(opnieuw.bezorging, 'handmatig');
    assert.equal(opnieuw.herhaling, false, 'de omgeving stond nog op klaargezet, dus dit is geen herhaling');

    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 1, 'geen tweede omgeving');
    assert.equal((await query('select count(*)::int n from organization')).rows[0].n, 1, 'geen tweede organisatie');
    const alle = (await query('select revoked_at from customer_invite order by created_at asc')).rows;
    assert.equal(alle.length, 2, 'twee pogingen, allebei zichtbaar');
    assert.equal(alle.filter((r) => !r.revoked_at).length, 1, 'precies één levende uitnodiging');
    assert.equal((await query('select status from mijn_room')).rows[0].status, 'uitgenodigd');

    // Geen nieuwe toestemming: de opt-out die de eerste poging blokkeerde staat er onveranderd.
    const voorkeuren = (await query('select channel, allowed from communication_preference')).rows;
    assert.equal(voorkeuren.length, 1, 'er is niets aan toestemming veranderd');
    assert.equal(voorkeuren[0].allowed, false, 'en zijn weigering staat er nog');
  } finally {
    await closePool();
  }
});

test('zonder publieke basis-URL ontstaat er niet eens een uitnodiging', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  const { nodigUit } = await import('../server/mijn/kamers.mjs');
  const { config } = await import('../server/config.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();
    await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    const kamerId = (await query('select id from mijn_room')).rows[0].id;

    // Dezelfde val als hierboven, langs een andere weg: de controle op de basis-URL stond ooit ná
    // het aanmaken van de uitnodiging, dus elke poging liet er een achter.
    const bewaard = config.mijnMaculisUrl;
    config.mijnMaculisUrl = '';
    try {
      const r = await nodigUit(tid, kamerId, { kanaal: null });
      assert.equal(r.ok, false);
      assert.equal(r.error, 'no_public_url');
      assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 0,
        'er is geen uitnodiging aangemaakt die niemand kan gebruiken');
      assert.equal((await query('select status from mijn_room')).rows[0].status, 'klaargezet');
    } finally { config.mijnMaculisUrl = bewaard; }

    // En daarna werkt het gewoon.
    const goed = await nodigUit(tid, kamerId, { kanaal: null });
    assert.equal(goed.ok, true);
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 1);
  } finally {
    await closePool();
  }
});
