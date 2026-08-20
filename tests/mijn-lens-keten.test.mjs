// Van de Lens naar Mijn Maculis: de hele keten, en de grenzen eromheen.
//
// Dit dekt de tien acceptatietests van de V1-opdracht. De helft bewijst dat het werkt; de andere
// helft bewijst wat er NIET gebeurt, en dat is het deel dat stukgaat zodra iemand later iets
// vanzelfsprekends toevoegt:
//
//   * bewaren zet nooit een uitnodiging in gang (twee toestemmingen, nooit één veld);
//   * er verlaat niets het gebouw zonder dat een mens erop heeft geklikt;
//   * een verlopen of gebruikte uitnodiging haalt geen toegang weg;
//   * wat iemand ín de kamer antwoordt, is op geen enkel Cockpitpad te bereiken.
//
// Vereist een Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SLAAT OVER zonder.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// De uitnodigingslink heeft een publieke basis nodig, anders krijgt iemand een link die hij niet
// kan openen. node:test draait elk bestand in een eigen proces, dus dit staat er voordat config
// wordt geladen. Een echte omgeving krijgt deze waarde van Render.
process.env.MIJN_MACULIS_URL = process.env.MIJN_MACULIS_URL || 'https://mijn-maculis.test';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — ketentests overgeslagen' };

// Eén afgeronde Lens, zoals hij uit de sessie-export komt. Precies de velden die deriveByToken
// oplevert, zodat de test op dezelfde vorm draait als de werkelijkheid.
function sessie({ keep = true, contact = true, lijn = 'De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.', bewijs = 3 } = {}) {
  return {
    started: true, completed: true, completed_at: new Date().toISOString(),
    keep, keep_at: keep ? new Date().toISOString() : null,
    consent: contact ? 'OPTED_IN' : null,
    answers: { recognition: 'deels' }, contexts: {},
    reveal: lijn ? { line: lijn, family: 'visibility', outcome: 'REVEAL', evidence_count: bewijs, at: new Date().toISOString() } : null,
  };
}

const tester = (over = {}) => ({
  id: 'inv-' + Math.abs(Date.now() % 100000) + '-' + (over.email || 'x'),
  first_name: 'Ludwig', last_name: 'Vermeulen', company_name: 'OCEA',
  email: 'ludwig@ocea-test.nl', mobile: '', domain: 'ocea-test.nl', ...over,
});

async function schoon(query) {
  await query(`truncate mijn_room, help_dossier_actor, help_dossier, insight_intent_event,
    insight_intent, insight_context_share, insight_recognition, insight_recognition_event,
    customer_invite, customer_login_token, customer_insight, insight_version, insight_observation,
    insight_share_event, customer_access, collaboration_item, relationship_memory, ai_draft,
    follow_up, message, conversation, communication_preference, channel_identity, contact,
    organization cascade`);
}

test('lens naar mijn maculis: voorbereiden, uitnodigen, binnenkomen, terugkomen', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor, kamerVoorOrganisatie } = await import('../server/mijn/voorbereiden.mjs');
  const { maakUitnodiging, verzilverUitnodiging, maakInloglink, gebruikInloglink } = await import('../server/mijn/uitnodiging.mjs');
  const { resolveAccess } = await import('../server/mijn/access.mjs');
  const { kamersDieWachten, nodigUit } = await import('../server/mijn/kamers.mjs');
  const { V1_GEBIED, V1_PERSPECTIEF } = await import('../server/mijn/woordenschat.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();

    // ---- T1: een afgeronde Lens leidt automatisch tot een voorbereide omgeving ----------------
    const d = sessie();
    const r1 = await bereidKamerVoor(tester(), d, { tenantId: tid });
    assert.equal(r1.ok, true, 'voorbereiden slaagt');
    assert.equal(r1.status, 'klaargezet', 'met contacttoestemming staat de kamer klaar');

    const org = (await query('select id, name from organization where tenant_id=$1', [tid])).rows;
    assert.equal(org.length, 1, 'precies één organisatie');
    assert.equal(org[0].name, 'OCEA');

    // ---- T2: de eerste ster toont exact de onthulling uit de Lens -----------------------------
    const inz = (await query('select * from customer_insight where organization_id=$1', [r1.organizationId])).rows;
    assert.equal(inz.length, 1, 'precies één inzicht');
    assert.equal(inz[0].title, d.reveal.line, 'woordelijk, teken voor teken');
    assert.equal(inz[0].observation, d.reveal.line, 'ook de observatie is de zin zelf');
    assert.equal(inz[0].source, 'lens', 'bron is de Lens');
    assert.equal(inz[0].area, V1_GEBIED, 'precies één gebied, uit de gedeelde woordenschat');
    assert.equal(inz[0].perspective, V1_PERSPECTIEF, 'precies één perspectief');
    assert.equal(inz[0].stance, 'reveal', 'de houding is uit de Lensuitkomst overgenomen, niet geraden');

    // Zijn antwoord uit de Lens reist mee, met de herkomst die zegt waar het vandaan komt.
    const refl = (await query('select answer, origin from insight_recognition where insight_id=$1', [inz[0].id])).rows;
    assert.equal(refl.length, 1);
    assert.equal(refl[0].answer, 'deels');
    assert.equal(refl[0].origin, 'lens', 'gegeven tijdens de Lens, niet in de kamer');

    // De grond staat er als de Lens hem had, en telt dan ook mee als bewijs.
    const bewijs = (await query(
      'select customer_label from insight_observation where insight_id=$1 and customer_label is not null', [inz[0].id])).rows;
    assert.equal(bewijs.length, 1, 'één bewijsregel, want de export levert een aantal en geen citaten');
    assert.match(bewijs[0].customer_label, /3 aanwijzingen/, 'het aantal dat de Lens telde, en niets verzonnens');

    // ---- T3: opnieuw uitvoeren levert geen dubbels op -----------------------------------------
    for (let i = 0; i < 3; i++) await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    assert.equal((await query('select count(*)::int n from organization where tenant_id=$1', [tid])).rows[0].n, 1, 'geen tweede organisatie');
    assert.equal((await query('select count(*)::int n from contact where tenant_id=$1', [tid])).rows[0].n, 1, 'geen tweede persoon');
    assert.equal((await query('select count(*)::int n from customer_insight where organization_id=$1', [r1.organizationId])).rows[0].n, 1, 'geen tweede inzicht');
    assert.equal((await query('select count(*)::int n from mijn_room where tenant_id=$1', [tid])).rows[0].n, 1, 'geen tweede kamer');

    // ---- T4: bewaren zonder benaderen: kamer bestaat, er gaat niets uit -----------------------
    await schoon(query);
    const zonderContact = await bereidKamerVoor(
      tester({ email: 'piet@stil-test.nl', company_name: 'Stil BV', domain: 'stil-test.nl' }),
      sessie({ contact: false }), { tenantId: tid });
    assert.equal(zonderContact.ok, true, 'de kamer wordt wél voorbereid');
    assert.equal(zonderContact.status, 'wacht_op_contact', 'maar hij wacht op toestemming om te benaderen');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 0, 'er is geen uitnodiging aangemaakt');

    // En de Cockpit kan hem ook niet forceren: de poort zit in de handeling zelf.
    const geweigerd = await nodigUit(tid, zonderContact.roomId, {});
    assert.equal(geweigerd.ok, false);
    assert.equal(geweigerd.error, 'no_contact_consent', 'bewaren is geen benaderen');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 0);

    // Geen bewaartoestemming betekent helemaal geen kamer. Fail-closed op de trigger zelf.
    await schoon(query);
    const geen = await bereidKamerVoor(tester({ email: 'nee@test.nl' }), sessie({ keep: false }), { tenantId: tid });
    assert.equal(geen.ok, false);
    assert.equal(geen.reason, 'no_keep_consent');
    assert.equal((await query('select count(*)::int n from mijn_room')).rows[0].n, 0, 'geen toestemming, geen kamer');

    // Geen uitspraak betekent ook geen kamer: een lege kamer is een gebroken belofte.
    const leeg = await bereidKamerVoor(tester({ email: 'leeg@test.nl' }), sessie({ lijn: '' }), { tenantId: tid });
    assert.equal(leeg.ok, false);
    assert.equal(leeg.reason, 'no_statement');

    // ---- T5: geen automatisch bericht zonder menselijke handeling -----------------------------
    await schoon(query);
    const k = await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    assert.equal((await query('select count(*)::int n from message')).rows[0].n, 0, 'voorbereiden verstuurt niets');
    assert.equal((await query('select count(*)::int n from customer_invite')).rows[0].n, 0, 'en maakt ook geen uitnodiging klaar');

    // De kamer staat op de Cockpitlijst, met alles wat nodig is om te beslissen.
    const wachtend = await kamersDieWachten(tid);
    assert.equal(wachtend.length, 1);
    assert.equal(wachtend[0].organisatie, 'OCEA');
    assert.equal(wachtend[0].naam, 'Ludwig Vermeulen');
    assert.equal(wachtend[0].eersteInzicht, sessie().reveal.line);

    // De menselijke handeling. Zonder echt e-mailtransport wordt er NIET gedaan alsof: er gaat
    // niets uit, de uitnodiging staat klaar en de link gaat terug naar de mens die klikte. Een
    // omgeving die "verzonden" meldt zonder transport is precies het incident dat we vermijden.
    const gezet = await nodigUit(tid, k.roomId, {});
    assert.equal(gezet.ok, true);
    assert.equal(gezet.bezorging, 'handmatig', 'geen transport, dus geen verzending');
    assert.match(gezet.link || '', /\/mijn\.html\?u=/, 'de link gaat terug naar de Cockpit');
    assert.equal((await query("select count(*)::int n from message where direction='OUTBOUND'")).rows[0].n, 0,
      'er is werkelijk niets verstuurd');
    assert.equal((await kamerVoorOrganisatie(tid, k.organizationId)).status, 'uitgenodigd');
    // En die link werkt: dit is dezelfde weg die de ondernemer loopt.
    const viaCockpit = await verzilverUitnodiging(new URL(gezet.link, 'http://x').searchParams.get('u'));
    assert.equal(viaCockpit.ok, true, 'de link uit de Cockpit brengt hem binnen');
    assert.ok(await resolveAccess(viaCockpit.token));
    assert.equal((await kamerVoorOrganisatie(tid, k.organizationId)).status, 'actief');

    // ---- T6: de uitnodiging werkt zonder registratie en zonder wachtwoord ---------------------
    // Een tweede uitnodiging voor dezelfde mens. Die mag geen tweede toegang naast de eerste zetten:
    // één mens heeft één toegang, anders weet niemand meer hoeveel sleutels er zijn.
    await query('delete from customer_invite');
    const uitn = await maakUitnodiging(tid, k.organizationId, k.contactId, {});
    assert.equal(uitn.ok, true);
    assert.ok(uitn.token && uitn.token.length > 30, 'de rauwe waarde bestaat één keer');
    // Alleen de hash is bewaard. De waarde zelf staat nergens in de database.
    const opgeslagen = (await query('select token_hash from customer_invite where id=$1', [uitn.inviteId])).rows[0];
    assert.notEqual(opgeslagen.token_hash, uitn.token, 'nooit de rauwe waarde');

    const binnen = await verzilverUitnodiging(uitn.token);
    assert.equal(binnen.ok, true, 'één klik en hij is binnen');
    const toegang = await resolveAccess(binnen.token);
    assert.ok(toegang, 'de toegang werkt meteen');
    assert.equal(toegang.organizationId, k.organizationId);
    assert.equal(toegang.contactId, k.contactId, 'de toegang is aan deze mens gebonden');
    assert.equal((await kamerVoorOrganisatie(tid, k.organizationId)).status, 'actief', 'de kamer is nu actief');

    // Tweede keer klikken op dezelfde mail geeft geen tweede toegang.
    const nogmaals = await verzilverUitnodiging(uitn.token);
    assert.equal(nogmaals.ok, false);
    assert.equal(nogmaals.error, 'used');
    assert.equal((await query('select count(*)::int n from customer_access where organization_id=$1', [k.organizationId])).rows[0].n, 1);

    // ---- T8: een verlopen uitnodiging haalt geen toegang weg ----------------------------------
    await query("update customer_invite set expires_at = now() - interval '1 day' where id=$1", [uitn.inviteId]);
    const verlopen = await verzilverUitnodiging(uitn.token);
    assert.equal(verlopen.ok, false, 'de link doet niets meer');
    const nogSteeds = await resolveAccess(binnen.token);
    assert.ok(nogSteeds, 'maar de toegang bestaat gewoon nog');
    assert.equal((await kamerVoorOrganisatie(tid, k.organizationId)).status, 'actief', 'en de kamer staat er nog');

    // ---- T9: een tweede keer inloggen toont dezelfde kamer ------------------------------------
    const link = await maakInloglink(tid, k.contactId);
    assert.equal(link.ok, true);
    const terug = await gebruikInloglink(link.token);
    assert.equal(terug.ok, true);
    assert.equal(terug.organizationId, k.organizationId, 'dezelfde organisatie');
    assert.equal(terug.accessId, toegang.accessId, 'dezelfde toegang, niet een tweede');
    assert.equal((await query('select count(*)::int n from customer_access where organization_id=$1', [k.organizationId])).rows[0].n, 1,
      'terugkomen maakt geen tweede toegang');
    const nieuweSessie = await resolveAccess(terug.token);
    assert.ok(nieuweSessie);
    assert.equal(nieuweSessie.accessId, toegang.accessId);
    // En de inhoud is ongewijzigd: dezelfde werkelijkheid.
    assert.equal((await query('select count(*)::int n from customer_insight where organization_id=$1', [k.organizationId])).rows[0].n, 1);
    // Een inloglink is eenmalig.
    assert.equal((await gebruikInloglink(link.token)).ok, false, 'een tweede keer werkt niet');
  } finally {
    const { closePool } = await import('../server/comm/db.mjs');
    await closePool();
  }
});

test('lens naar mijn maculis: de persoonlijke laag komt nergens in de Cockpit', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { bereidKamerVoor } = await import('../server/mijn/voorbereiden.mjs');
  const { kamersDieWachten, kamer } = await import('../server/mijn/kamers.mjs');

  try {
    await runMigrations({ silent: true });
    await schoon(query);
    const tid = await getDefaultTenantId();
    const k = await bereidKamerVoor(tester(), sessie(), { tenantId: tid });
    assert.equal(k.ok, true);

    // Hij antwoordt in de kamer, met zijn eigen woorden. Dit is de persoonlijke laag.
    const GEHEIM = 'Dit durf ik intern eigenlijk niet hardop te zeggen.';
    await query(
      `update insight_recognition set answer='ja', note=$2, origin='mijn' where insight_id=$1`,
      [k.insightId, GEHEIM]);

    // ---- T10: geen enkel Cockpitpad draagt dat mee --------------------------------------------
    const lijst = JSON.stringify(await kamersDieWachten(tid));
    const een = JSON.stringify(await kamer(tid, k.roomId));
    for (const payload of [lijst, een]) {
      assert.equal(payload.includes(GEHEIM), false, 'de toelichting komt niet mee');
      assert.equal(/"answer"/.test(payload), false, 'en het antwoord ook niet');
      assert.equal(/recognition/i.test(payload), false, 'de persoonlijke laag wordt niet eens genoemd');
    }

    // Sterker: de module die de Cockpitregel bouwt, noemt de persoonlijke tabellen nergens. Dat is
    // geen stijlregel maar de constructie waarmee "wat je hier zegt blijft van jou" waar blijft:
    // dit pad KAN de persoonlijke laag niet lezen, ook niet als iemand later een veld toevoegt.
    const { readFileSync } = await import('node:fs');
    const bron = readFileSync(new URL('../server/mijn/kamers.mjs', import.meta.url), 'utf8');
    for (const tabel of ['insight_recognition', 'insight_intent', 'insight_context_share']) {
      assert.equal(bron.includes(tabel), false, `kamers.mjs noemt ${tabel} nergens`);
    }
  } finally {
    const { closePool } = await import('../server/comm/db.mjs');
    await closePool();
  }
});
