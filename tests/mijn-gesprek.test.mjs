// Mijn Maculis — de communicatielaag, end to end door de echte HTTP-routes.
//
// Wat hier bewezen wordt is niet dat er berichten heen en weer gaan, maar dat de drie beloftes uit
// het product ook werkelijk in de code zitten:
//
//   praten is niet delen · reageren is niet onthouden · gelezen is twee dingen
//
// Plus de vierde, die pas telt als hij ook fout kan gaan: er staat geen enkele inhoud in de
// e-mailmelding, en zonder geldige toestemming gaat die melding niet.
//
// Vereist een Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SLAAT OVER zonder.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — gespreks-DB-tests overgeslagen' };

async function mijnCall(handleMijn, method, path, { token = null, body = null } = {}) {
  const raw = body == null ? '' : JSON.stringify(body);
  const req = {
    method, url: path, headers: token ? { 'x-mijn-token': token } : {},
    on(ev, cb) { if (ev === 'data' && raw) cb(raw); if (ev === 'end') cb(); },
  };
  return new Promise((resolve) => {
    let status;
    const res = { writeHead(s) { status = s; return res; }, end(b) { resolve({ status, json: JSON.parse(b || '{}') }); } };
    Promise.resolve(handleMijn(req, res, { pathname: path.split('?')[0], method }))
      .then((handled) => { if (!handled) resolve({ status: 0, json: {} }); });
  });
}

test('Mijn Maculis: de communicatielaag, van patroon tot antwoord', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');
  const { sendOnChannel } = await import('../server/comm/send.mjs');
  const { deriveAttention } = await import('../server/comm/attention.mjs');
  const { _melding } = await import('../server/mijn/notify.mjs');

  try {
    await runMigrations({ silent: true });
    await query(`truncate customer_insight, insight_version, insight_observation, insight_share_event,
      insight_recognition_event, customer_access, collaboration_item, relationship_memory,
      message, conversation, communication_preference, channel_identity, contact, organization cascade`);
    const tid = await getDefaultTenantId();

    const org = (await query(`insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,'Gesprek Org','gesprek.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const vreemd = (await query(`insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,'Andere Org','ander.nl','CUSTOMER') returning id`, [tid])).rows[0].id;
    const contact = (await query(
      `insert into contact(tenant_id, organization_id, first_name, last_name, email, identity_key)
       values ($1,$2,'Sanne','de Vries','sanne@gesprek.nl','email:sanne@gesprek.nl') returning id`, [tid, org])).rows[0].id;

    const access = await createAccess(tid, org, { label: 'Sanne de Vries', token: 'gesprek-token-' + 'q'.repeat(30), contactId: contact });

    const priveInzicht = (await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Sterke betrokkenheid bij klantgerichtheid',
      stance: 'consistency', observation: 'privé lezing', meaning: 'privé betekenis',
      basis: 'privé basis', notYetKnown: 'privé open vraag', sharing: 'PRIVATE',
    })).insightId;
    const gedeeldInzicht = (await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Positionering wordt extern duidelijker dan intern',
      stance: 'tension', observation: 'gedeelde lezing', meaning: 'gedeelde betekenis',
      basis: 'gedeelde basis', notYetKnown: 'gedeelde open vraag', sharing: 'PRIVATE',
    })).insightId;
    const vreemdInzicht = (await createInsightWithInitialVersion({
      tenantId: tid, organizationId: vreemd, title: 'Van een andere organisatie',
      stance: 'reveal', observation: 'niet van jou', sharing: 'PRIVATE',
    })).insightId;

    // ---- 1. een gesprek beginnen vanuit een patroon --------------------------------------------
    let r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token,
      body: { insightId: gedeeldInzicht, text: 'Waar baseren jullie dit precies op?' },
    });
    assert.equal(r.status, 200, 'een gesprek beginnen vanuit een patroon lukt');
    assert.equal(r.json.ok, true);
    const draadGedeeld = r.json.conversationId;
    assert.equal(r.json.conversation.messages.length, 1);
    assert.equal(r.json.conversation.messages[0].van, 'jij');
    assert.equal(r.json.conversation.messages[0].tekst, 'Waar baseren jullie dit precies op?');
    assert.equal(r.json.conversation.insight_id, gedeeldInzicht, 'de draad weet waar hij over gaat');

    // Het is één kanaal op de bestaande laag, geen eigen opslag.
    const conv = (await query('select * from conversation where id=$1', [draadGedeeld])).rows[0];
    assert.equal(conv.channel, 'MIJN_MACULIS');
    assert.equal(conv.organization_id, org);
    assert.equal(conv.customer_access_id, access.id, 'het bericht is herleidbaar tot de toegang die het schreef');
    const msg = (await query("select * from message where conversation_id=$1 and direction='INBOUND'", [draadGedeeld])).rows[0];
    assert.equal(msg.channel, 'MIJN_MACULIS');
    assert.equal(msg.customer_access_id, access.id);

    // En hij vraagt aandacht in het bestaande attentiemodel, precies zoals een binnengekomen mail.
    const att = deriveAttention({
      status: conv.status, last_inbound_at: conv.last_inbound_at, last_read_at: conv.last_read_at,
      last_dir: 'INBOUND', has_ai_proposed: false, has_delivery_problem: false, contact_id: conv.contact_id,
    });
    assert.equal(att.state, 'NEW', 'een eerste bericht uit Mijn Maculis staat als NEW in de cockpit');
    assert.equal(att.actionable, true);

    // ---- 2. over een privépatroon praten zonder het te delen ------------------------------------
    r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token,
      body: { insightId: priveInzicht, text: 'Dit herken ik deels, maar bij ons speelt nog iets anders.' },
    });
    assert.equal(r.status, 200, 'praten over een privépatroon mag');
    const draadPrive = r.json.conversationId;

    let intern = await sharedContextForOrg(tid, org);
    assert.equal(intern.length, 0, 'praten deelt niets: de interne kant ziet nog altijd geen enkel inzicht');
    let insightNa = (await query('select sharing from customer_insight where id=$1', [priveInzicht])).rows[0];
    assert.equal(insightNa.sharing, 'PRIVATE', 'het inzicht is niet stil van staat veranderd');

    // Wat Maculis met het gesprek wél meekrijgt is de uitspraak zoals Maculis die zelf opschreef, en
    // niets van de lezing eronder. Dat is precies wat de klant vooraf te zien krijgt.
    const convPrive = (await query('select subject, insight_id from conversation where id=$1', [draadPrive])).rows[0];
    // Het ONDERWERP is neutraal. Dat is organisatiebrede metadata die ook in het attentiemodel
    // meekomt, en daar hoort de uitspraak van een nog niet gedeeld inzicht niet impliciet in.
    assert.equal(convPrive.subject, 'Over een inzicht in Mijn Maculis');
    for (const geheim of ['privé lezing', 'privé betekenis', 'privé basis', 'privé open vraag']) {
      assert.ok(!String(convPrive.subject).includes(geheim), 'de privélezing staat niet in het onderwerp');
    }
    // Wat Maculis wél meekreeg staat als eigen handeling vastgelegd: de uitspraak en de houding,
    // per gesprek, en verder niets.
    const { conversationContext } = await import('../server/mijn/sharing.mjs');
    const ctx = await conversationContext(tid, draadPrive);
    assert.equal(ctx.length, 1, 'versturen deelde precies één stuk context');
    assert.equal(ctx[0].title, 'Sterke betrokkenheid bij klantgerichtheid');
    assert.equal(ctx[0].stance, 'consistency');
    for (const geheim of ['privé lezing', 'privé betekenis', 'privé basis', 'privé open vraag']) {
      assert.ok(!JSON.stringify(ctx).includes(geheim), 'de lezing eronder reist niet mee');
    }
    // En die handeling is niet het inzicht delen.
    assert.equal((await query('select sharing from customer_insight where id=$1', [priveInzicht])).rows[0].sharing,
      'PRIVATE', 'gesprekscontext delen verandert de deelstatus niet');

    // ---- 3. hetzelfde patroon daarna wél delen: een aparte handeling ----------------------------
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${gedeeldInzicht}/share`, { token: access.token });
    assert.equal(r.status, 200);
    assert.equal(r.json.sharing, 'SHARED');
    intern = await sharedContextForOrg(tid, org);
    assert.equal(intern.length, 1, 'pas na de expliciete deelhandeling ziet de interne kant iets');
    assert.equal(intern[0].id, gedeeldInzicht);
    assert.ok(!intern.some((i) => i.id === priveInzicht), 'het besproken privépatroon is nog steeds niet gedeeld');

    // ---- 4. Ja/Deels/Nee, met optionele toelichting, duurzaam ----------------------------------
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${gedeeldInzicht}/recognition`, {
      token: access.token, body: { answer: 'deels', note: 'De helft klopt, de andere helft speelde vorig jaar.' },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.recognition, 'deels');
    let detail = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${gedeeldInzicht}`, { token: access.token });
    assert.equal(detail.json.insight.recognition, 'deels', 'het antwoord overleeft het bezoek');
    assert.equal(detail.json.insight.recognition_note, 'De helft klopt, de andere helft speelde vorig jaar.');

    // Van gedachten veranderen overschrijft niets stil: het spoor blijft.
    await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${gedeeldInzicht}/recognition`, {
      token: access.token, body: { answer: 'ja' },
    });
    const spoor = (await query('select answer from insight_recognition_event where insight_id=$1 order by at asc', [gedeeldInzicht])).rows;
    assert.deepEqual(spoor.map((s) => s.answer), ['deels', 'ja'], 'elk antwoord is bewaard');

    // Het antwoord volgt dezelfde grens als het inzicht: op een privé-inzicht blijft het bij de klant.
    await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${priveInzicht}/recognition`, {
      token: access.token, body: { answer: 'nee', note: 'Dit gaat over iets wat wij niet zo ervaren.' },
    });
    intern = await sharedContextForOrg(tid, org);
    assert.equal(intern.length, 1);
    assert.equal(intern[0].id, gedeeldInzicht);
    // De persoonlijke laag reist NOOIT mee met het delen van een inzicht. Anders zou een handeling
    // van de een een privacykeuze van de ander veranderen.
    const alleTekst = JSON.stringify(intern);
    assert.equal(intern[0].recognition, undefined, 'het herkenningsantwoord staat niet in de gedeelde werkelijkheid');
    assert.ok(!alleTekst.includes('De helft klopt'), 'en de toelichting evenmin');
    assert.ok(!alleTekst.includes('Dit gaat over iets wat wij niet zo ervaren'),
      'de toelichting bij een privé-inzicht bereikt de interne kant nooit');

    // ---- 5. "Laat dit meewegen" staat standaard uit ---------------------------------------------
    let geheugen = (await query('select * from relationship_memory where organization_id=$1', [org])).rows;
    assert.equal(geheugen.length, 0, 'drie berichten zonder vinkje hebben niets in het geheugen gezet');

    r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token,
      body: { insightId: gedeeldInzicht, text: 'Wij hebben sinds januari een nieuw klantteam.', weegMee: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.weegtMee, true);
    geheugen = (await query('select * from relationship_memory where organization_id=$1', [org])).rows;
    assert.equal(geheugen.length, 1, 'met vinkje komt er precies één voorstel binnen');
    assert.equal(geheugen[0].source, 'customer', 'de herkomst is de klant, niet een mens bij Maculis en niet de AI');
    assert.equal(geheugen[0].confidence, 'proposed', 'het komt binnen als voorstel, niet als vastgesteld feit');
    assert.equal(geheugen[0].confirmed_at, null, 'niets is stilzwijgend bevestigd');
    assert.equal(geheugen[0].source_ref.type, 'mijn_maculis_message', 'het voorstel is herleidbaar tot het bericht');

    // En het is één relationeel model: hetzelfde geheugen als de Cockpit, geen tweede tabel.
    const { listMemory } = await import('../server/comm/memory.mjs');
    const viaCockpit = await listMemory(tid, { organizationId: org });
    assert.equal(viaCockpit.length, 1, 'de Cockpit ziet dit voorstel via het bestaande geheugenpad');

    // ---- 6. een nieuw gesprek zonder patroon ----------------------------------------------------
    r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token, body: { text: 'Er is bij ons iets veranderd dat jullie nog niet gezien hebben.' },
    });
    assert.equal(r.status, 200);
    const draadLos = r.json.conversationId;
    assert.equal(r.json.conversation.insight_id, null, 'een gesprek hoeft nergens over te gaan');
    assert.equal(r.json.conversation.subject, 'Iets vertellen vanuit Mijn Maculis');

    // Een tweede vraag over hetzelfde patroon hoort in dezelfde draad, geen tweede postvakregel.
    r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token, body: { insightId: gedeeldInzicht, text: 'Nog een vraag hierover.' },
    });
    assert.equal(r.json.conversationId, draadGedeeld, 'hetzelfde patroon houdt één draad');

    // ---- 11a. een id van een andere organisatie levert niets op ---------------------------------
    r = await mijnCall(handleMijn, 'POST', '/api/mijn/conversations', {
      token: access.token, body: { insightId: vreemdInzicht, text: 'Waar gaat dit over?' },
    });
    assert.equal(r.status, 404, 'een inzicht van een andere organisatie bestaat hier niet');
    r = await mijnCall(handleMijn, 'GET', `/api/mijn/conversations/${draadGedeeld}`, { token: null });
    assert.equal(r.status, 401, 'zonder geldige toegang is er geen gesprek');

    // ---- 7. Maculis antwoordt, via hetzelfde ene verzendpad -------------------------------------
    let uit = await sendOnChannel({
      tenantId: tid, conversationId: draadGedeeld, channel: 'MIJN_MACULIS',
      text: 'Dit rust op zeven waarnemingen uit de gesprekken van maart. Ik loop ze met je door.',
    });
    assert.equal(uit.ok, true, 'een antwoord op het Mijn Maculis-kanaal gaat gewoon door sendOnChannel');
    assert.equal(uit.delivery, 'DELIVERED');
    assert.equal(uit.consent.allowed, true);

    const draad = await mijnCall(handleMijn, 'GET', `/api/mijn/conversations/${draadGedeeld}`, { token: access.token });
    assert.equal(draad.status, 200);
    const vanMaculis = draad.json.conversation.messages.filter((m) => m.van === 'maculis');
    assert.equal(vanMaculis.length, 1, 'de klant ziet het antwoord in dezelfde draad');
    assert.ok(vanMaculis[0].tekst.startsWith('Dit rust op zeven waarnemingen'));

    // Gelezen is twee dingen: de klant lezen verzet nooit het Maculis-watermerk.
    const na = (await query('select last_read_at, customer_read_at from conversation where id=$1', [draadGedeeld])).rows[0];
    assert.equal(na.last_read_at, null, 'het Maculis-watermerk staat er nog steeds niet');
    assert.ok(na.customer_read_at, 'het klantwatermerk is wel verzet');

    // ---- 8. de e-mailmelding: geen inhoud, en consent is leidend --------------------------------
    // De melding is meegelift op het antwoord hierboven. Zij ging door de gewone EMAIL-poort.
    const meldingen = (await query(
      `select m.subject, m.body_text, m.to_addresses from message m
        join conversation c on c.id=m.conversation_id
       where m.channel='EMAIL' and m.direction='OUTBOUND' and c.organization_id=$1`, [org])).rows;
    assert.equal(meldingen.length, 1, 'er is precies één melding uitgegaan');
    assert.equal(meldingen[0].subject, _melding.onderwerp);

    const inhoud = (meldingen[0].subject + ' ' + meldingen[0].body_text).toLowerCase();
    const nooit = [
      'zeven waarnemingen',                                  // het antwoord
      'waar baseren jullie dit precies op',                  // de vraag
      'positionering wordt extern duidelijker',              // het patroon
      'sterke betrokkenheid bij klantgerichtheid',           // het privépatroon
      'dit gaat over iets wat wij niet zo ervaren',          // de privétoelichting
      'nieuw klantteam',                                     // het geheugenvoorstel
      access.token.toLowerCase(),                            // en nooit een toegangslink
    ];
    for (const woord of nooit) {
      assert.ok(!inhoud.includes(woord), `de melding bevat geen inhoud: "${woord}" komt er niet in voor`);
    }
    assert.ok(inhoud.includes('er staat een antwoord'), 'de melding zegt alleen dát er iets klaarstaat');

    // Precies één keer, ook bij een tweede poging op hetzelfde bericht.
    const { announceReply } = await import('../server/mijn/notify.mjs');
    const nogmaals = await announceReply({ tenantId: tid, organizationId: org, conversationId: draadGedeeld, messageId: uit.messageId });
    assert.equal(nogmaals.ok, false);
    assert.equal(nogmaals.reason, 'already_announced');

    // Zonder geldige toestemming gaat er geen melding. De klant zegt e-mail op; het antwoord in de
    // eigen omgeving gaat gewoon door, want dat verlaat het pand niet.
    const { setPreference } = await import('../server/comm/consent.mjs');
    await setPreference(tid, contact, { channel: 'EMAIL', purpose: 'service', allowed: false, source: 'test' });
    const voorAantal = (await query(`select count(*)::int n from message where channel='EMAIL' and direction='OUTBOUND'`)).rows[0].n;
    uit = await sendOnChannel({
      tenantId: tid, conversationId: draadGedeeld, channel: 'MIJN_MACULIS',
      text: 'En dit is het tweede antwoord.',
    });
    assert.equal(uit.ok, true, 'het antwoord in de eigen omgeving gaat door: dat is geen uitgaand kanaal');
    assert.equal(uit.notified.ok, false, 'maar er gaat geen melding uit');
    assert.equal(uit.notified.results[0].reason, 'consent_blocked');
    const naAantal = (await query(`select count(*)::int n from message where channel='EMAIL' and direction='OUTBOUND'`)).rows[0].n;
    assert.equal(naAantal, voorAantal, 'er is werkelijk niets verstuurd');

    // Zonder gekoppeld contact is er geen ontvanger, en dus ook geen melding. Fail-closed.
    await query('update customer_access set contact_id=null where id=$1', [access.id]);
    uit = await sendOnChannel({
      tenantId: tid, conversationId: draadGedeeld, channel: 'MIJN_MACULIS', text: 'Derde antwoord.',
    });
    assert.equal(uit.ok, true);
    assert.equal(uit.notified.reason, 'no_recipient', 'geen contact betekent geen melding, nooit een geraden adres');
    await query('update customer_access set contact_id=$2 where id=$1', [access.id, contact]);

    // ---- 9. een bestaand gesprek terugvinden ----------------------------------------------------
    const lijst = await mijnCall(handleMijn, 'GET', '/api/mijn/conversations', { token: access.token });
    assert.equal(lijst.status, 200);
    const ids = lijst.json.items.map((i) => i.id);
    assert.ok(ids.includes(draadGedeeld) && ids.includes(draadPrive) && ids.includes(draadLos),
      'alle drie de gesprekken zijn terug te vinden');
    const gevonden = lijst.json.items.find((i) => i.id === draadGedeeld);
    assert.equal(gevonden.insight_title, 'Positionering wordt extern duidelijker dan intern',
      'een gesprek draagt het patroon waar het over ging als context');
    assert.equal(lijst.json.unread, 2, 'de twee nog niet geopende antwoorden staan als ongelezen');

    // En het gesprek over dit patroon staat ook in het bewijsblad van dat patroon zelf.
    detail = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${gedeeldInzicht}`, { token: access.token });
    assert.equal(detail.json.conversation.id, draadGedeeld, 'het gesprek staat bij het patroon');
    assert.ok(detail.json.conversation.messages.length >= 2);
    // Het bewijsblad openen telt niet als het gesprek lezen.
    const watermerk = (await query('select customer_read_at from conversation where id=$1', [draadGedeeld])).rows[0];
    const nogSteedsOngelezen = (await mijnCall(handleMijn, 'GET', '/api/mijn/conversations', { token: access.token })).json.unread;
    assert.equal(nogSteedsOngelezen, 2, 'een antwoord wordt niet stil als gezien geteld');
    assert.ok(watermerk.customer_read_at);

    // ---- 11b. de grens houdt ook na alles wat hierboven gebeurde --------------------------------
    intern = await sharedContextForOrg(tid, org);
    assert.equal(intern.length, 1, 'na vijf gesprekken en drie antwoorden is er nog steeds precies één gedeeld inzicht');
    assert.ok(!JSON.stringify(intern).includes('privé'), 'geen enkel privéveld is via het gesprek overgelopen');
  } finally {
    await closePool();
  }
});
