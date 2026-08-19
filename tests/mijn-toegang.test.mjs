// Mijn Maculis — toegang per persoon, en de twee privacyvragen uit elkaar.
//
// FASE 0. Deze fase voegt alleen datamodel toe en verandert geen enkel gedrag. Wat hier bewezen
// wordt is daarom precies dat: de migratie is additief, hij is idempotent, de backfill neemt over
// wat aan een persoon te hangen is en laat de rest met rust, en dimensie A is een gecontroleerde
// waarde in plaats van de afwezigheid van een controle.
//
// Vereist een Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SLAAT OVER zonder.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — toegangs-DB-tests overgeslagen' };

test('fase 0: migratie 010 is additief, idempotent en scheidt de twee privacyvragen', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');

  try {
    await runMigrations({ silent: true });

    // ---- idempotent -----------------------------------------------------------------------------
    const opnieuw = await runMigrations({ silent: true });
    assert.equal(opnieuw.ran.length, 0, 'een tweede run past niets toe');

    // ---- alles staat er, en op de juiste plek ----------------------------------------------------
    const kolommen = async (tabel) => (await query(
      'select column_name from information_schema.columns where table_name=$1', [tabel])).rows.map((r) => r.column_name);

    for (const [tabel, verwacht] of [
      ['customer_invite', ['tenant_id', 'organization_id', 'contact_id', 'token_hash', 'expires_at', 'accepted_at', 'revoked_at']],
      ['customer_login_token', ['tenant_id', 'contact_id', 'token_hash', 'expires_at', 'used_at']],
      ['insight_recognition', ['tenant_id', 'organization_id', 'insight_id', 'contact_id', 'answer', 'note']],
      ['insight_context_share', ['tenant_id', 'organization_id', 'insight_id', 'conversation_id', 'contact_id', 'title', 'stance']],
    ]) {
      const heeft = await kolommen(tabel);
      for (const k of verwacht) assert.ok(heeft.includes(k), `${tabel} mist ${k}`);
    }
    const ca = await kolommen('customer_access');
    assert.ok(ca.includes('activated_at') && ca.includes('invite_id'), 'customer_access kent zijn herkomst');

    // Niets is weggegooid: de oude herkenningskolommen staan er nog, want migraties zijn additief.
    const ci = await kolommen('customer_insight');
    for (const k of ['recognition', 'recognition_note', 'recognition_at', 'recognition_by', 'sharing', 'audience']) {
      assert.ok(ci.includes(k), `customer_insight mist ${k}`);
    }

    // ---- dimensie A is een waarde, geen afwezigheid ---------------------------------------------
    await query(`truncate insight_context_share, insight_recognition, customer_invite, customer_login_token,
      customer_insight, insight_version, insight_observation, insight_share_event, insight_recognition_event,
      customer_access, collaboration_item, relationship_memory, message, conversation,
      communication_preference, channel_identity, contact, organization cascade`);
    const tid = await getDefaultTenantId();
    const org = (await query(`insert into organization(tenant_id,name,relationship_stage) values ($1,'Toegang Org','CUSTOMER') returning id`, [tid])).rows[0].id;

    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Een inzicht', stance: 'reveal',
      observation: 'iets', sharing: 'PRIVATE',
    });
    const rij = (await query('select audience, sharing from customer_insight where id=$1', [insightId])).rows[0];
    assert.equal(rij.audience, 'ORGANISATIE', 'een nieuw inzicht is zichtbaar binnen de organisatie');
    assert.equal(rij.sharing, 'PRIVATE', 'en is niet gedeeld met Maculis');

    // De twee vragen zijn twee kolommen: de een verzetten raakt de ander niet.
    await query(`update customer_insight set sharing='SHARED' where id=$1`, [insightId]);
    assert.equal((await query('select audience from customer_insight where id=$1', [insightId])).rows[0].audience,
      'ORGANISATIE', 'delen met Maculis verandert de zichtbaarheid binnen de klant niet');
    await query(`update customer_insight set sharing='PRIVATE' where id=$1`, [insightId]);

    // Een tweede audiencewaarde vraagt een bewuste migratie en kan niet per ongeluk ontstaan.
    await assert.rejects(
      () => query(`update customer_insight set audience='ALLEEN_JIJ' where id=$1`, [insightId]),
      /audience_chk/, 'de check weigert een niet vastgestelde audience');

    // ---- de backfill: neemt over wat aan een persoon hangt, en laat de rest met rust -------------
    // We draaien migratie 010 opnieuw op oude data. Daarvoor gaan de artefacten van 010 er even af,
    // zodat de runner hem echt opnieuw uitvoert in plaats van over te slaan.
    const contact = (await query(
      `insert into contact(tenant_id, organization_id, first_name, email, identity_key)
       values ($1,$2,'Sanne','sanne@toegang.nl','email:sanne@toegang.nl') returning id`, [tid, org])).rows[0].id;
    const metContact = await createAccess(tid, org, { label: 'Sanne', token: 'toegang-a-' + 'a'.repeat(30), contactId: contact });
    const zonderContact = await createAccess(tid, org, { label: 'Losse toegang', token: 'toegang-b-' + 'b'.repeat(30) });

    const b = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Tweede inzicht', stance: 'tension', sharing: 'PRIVATE',
    });
    // Oude stijl: het antwoord staat op het inzicht zelf.
    await query(`update customer_insight set recognition='deels', recognition_note='de helft', recognition_at=now(), recognition_by=$2 where id=$1`,
      [insightId, metContact.id]);
    await query(`update customer_insight set recognition='nee', recognition_at=now(), recognition_by=$2 where id=$1`,
      [b.insightId, zonderContact.id]);

    await query('drop table if exists insight_context_share');
    await query('drop table if exists insight_recognition');
    await query('drop table if exists customer_login_token');
    await query('alter table customer_access drop column if exists invite_id');
    await query('drop table if exists customer_invite');
    await query('alter table customer_insight drop constraint if exists customer_insight_audience_chk');
    await query('alter table customer_insight drop column if exists audience');
    await query(`delete from schema_migrations where version='010_mijn_maculis_toegang.sql'`);

    const her = await runMigrations({ silent: true });
    assert.deepEqual(her.ran, ['010_mijn_maculis_toegang.sql'], 'de migratie draait opnieuw');

    const overgenomen = (await query('select insight_id, contact_id, answer, note from insight_recognition order by answer')).rows;
    assert.equal(overgenomen.length, 1, 'alleen wat aan een persoon te hangen is, komt mee');
    assert.equal(overgenomen[0].insight_id, insightId);
    assert.equal(overgenomen[0].contact_id, contact);
    assert.equal(overgenomen[0].answer, 'deels');
    assert.equal(overgenomen[0].note, 'de helft');

    // Het antwoord zonder herleidbare persoon is niet verdwenen, het is alleen niet aan de
    // verkeerde mens gehangen. Dat is de fail-closed kant van deze backfill.
    assert.equal((await query('select recognition from customer_insight where id=$1', [b.insightId])).rows[0].recognition,
      'nee', 'een onherleidbaar antwoord blijft staan waar het stond');

    // En nog eens draaien voegt niets toe.
    await query(`delete from schema_migrations where version='010_mijn_maculis_toegang.sql'`);
    await runMigrations({ silent: true });
    assert.equal((await query('select count(*)::int n from insight_recognition')).rows[0].n, 1,
      'de backfill is idempotent');

    // ---- de scheiding is ook een codegrens -------------------------------------------------------
    // insight_recognition en insight_context_share horen tot het klantzijdige leespad. Geen enkele
    // query onder server/comm/ mag ze noemen. Dit is nu triviaal waar en moet dat blijven.
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'server', 'comm');
    const bestanden = [];
    const loop = async (d) => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        if (e.isDirectory()) await loop(join(d, e.name));
        else if (e.name.endsWith('.mjs')) bestanden.push(join(d, e.name));
      }
    };
    await loop(dir);
    for (const f of bestanden) {
      const src = await readFile(f, 'utf8');
      for (const verboden of ['insight_recognition', 'insight_context_share']) {
        assert.ok(!src.includes(verboden), `${f} noemt ${verboden}; de persoonlijke laag hoort niet in het interne leespad`);
      }
    }
  } finally {
    await closePool();
  }
});

// FASE 1. Twee mensen bij één organisatie. Wat hier bewezen wordt is de scheiding die het hele
// ontwerp draagt: dezelfde gedeelde werkelijkheid, maar persoonlijke aandacht. En de nieuwe grens
// eromheen: praten over een nog niet gedeeld inzicht mag, en dat is iets anders dan het delen.
test('fase 1: gedeelde werkelijkheid, persoonlijke aandacht, en gesprekscontext als eigen handeling', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg, conversationContext } = await import('../server/mijn/sharing.mjs');

  const roep = (method, path, { token = null, body = null } = {}) => {
    const raw = body == null ? '' : JSON.stringify(body);
    const req = { method, url: path, headers: token ? { 'x-mijn-token': token } : {},
      on(ev, cb) { if (ev === 'data' && raw) cb(raw); if (ev === 'end') cb(); } };
    return new Promise((resolve) => {
      let status;
      const res = { writeHead(s) { status = s; return res; }, end(b) { resolve({ status, json: JSON.parse(b || '{}') }); } };
      Promise.resolve(handleMijn(req, res, { pathname: path.split('?')[0], method }))
        .then((h) => { if (!h) resolve({ status: 0, json: {} }); });
    });
  };

  try {
    await runMigrations({ silent: true });
    await query(`truncate insight_context_share, insight_recognition, customer_invite, customer_login_token,
      customer_insight, insight_version, insight_observation, insight_share_event, insight_recognition_event,
      customer_access, collaboration_item, relationship_memory, message, conversation,
      communication_preference, channel_identity, contact, organization cascade`);
    const tid = await getDefaultTenantId();
    const org = (await query(`insert into organization(tenant_id,name,relationship_stage) values ($1,'De Voorbeeld Groep','CUSTOMER') returning id`, [tid])).rows[0].id;

    const maakPersoon = async (voornaam, mail, token) => {
      const c = (await query(
        `insert into contact(tenant_id, organization_id, first_name, email, identity_key)
         values ($1,$2,$3,$4,$5) returning id`, [tid, org, voornaam, mail, 'email:' + mail])).rows[0].id;
      const a = await createAccess(tid, org, { label: voornaam, token, contactId: c });
      return { contactId: c, ...a };
    };
    const sanne = await maakPersoon('Sanne', 'sanne@voorbeeld.nl', 'sanne-' + 's'.repeat(30));
    const piet = await maakPersoon('Piet', 'piet@voorbeeld.nl', 'piet-' + 'p'.repeat(30));

    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Jullie positionering wordt intern niet overal hetzelfde ervaren',
      stance: 'tension', observation: 'de lezing eronder', meaning: 'de betekenis eronder',
      basis: 'de basis eronder', notYetKnown: 'de open vraag eronder', sharing: 'PRIVATE',
    });

    // ---- dimensie A: dezelfde gedeelde werkelijkheid --------------------------------------------
    const lijstS = await roep('GET', '/api/mijn/insights', { token: sanne.token });
    const lijstP = await roep('GET', '/api/mijn/insights', { token: piet.token });
    assert.deepEqual(lijstS.json.insights.map((i) => i.id), lijstP.json.insights.map((i) => i.id),
      'beiden zien dezelfde inzichten');
    assert.equal(lijstS.json.insights[0].audience, 'ORGANISATIE', 'zichtbaarheid binnen de klant is een waarde');
    assert.equal(lijstS.json.insights[0].sharing, 'PRIVATE', 'en dat staat los van delen met Maculis');

    // Zichtbaarheid is een echte controle: een inzicht dat niet organisatiebreed staat, verdwijnt.
    await query(`alter table customer_insight drop constraint customer_insight_audience_chk`);
    await query(`update customer_insight set audience='IETS_ANDERS' where id=$1`, [insightId]);
    assert.equal((await roep('GET', '/api/mijn/insights', { token: sanne.token })).json.insights.length, 0,
      'audience wordt werkelijk gecontroleerd en niet weggelaten');
    await query(`update customer_insight set audience='ORGANISATIE' where id=$1`, [insightId]);
    await query(`alter table customer_insight add constraint customer_insight_audience_chk check (audience in ('ORGANISATIE'))`);

    // ---- 1. Sanne praat over een NIET gedeeld inzicht --------------------------------------------
    const verstuur = await roep('POST', '/api/mijn/conversations', {
      token: sanne.token,
      body: { insightId, text: 'Waar baseren jullie dit precies op? Ik herken het niet overal.' },
    });
    assert.equal(verstuur.status, 200, 'praten over een niet gedeeld inzicht mag');
    const draadSanne = verstuur.json.conversationId;

    // De Cockpit kan het gesprek begrijpen: het bericht plus de bewust gedeelde context.
    const ctx = await conversationContext(tid, draadSanne);
    assert.equal(ctx.length, 1);
    assert.equal(ctx[0].title, 'Jullie positionering wordt intern niet overal hetzelfde ervaren');
    assert.equal(ctx[0].stance, 'tension');
    const bericht = (await query(
      "select body_text, subject from message where conversation_id=$1 and direction='INBOUND'", [draadSanne])).rows[0];
    assert.ok(bericht.body_text.startsWith('Waar baseren jullie dit'), 'de vraag zelf staat er gewoon');
    assert.equal(bericht.subject, 'Over een inzicht in Mijn Maculis', 'het onderwerp blijft neutraal');

    // En niets van de lezing eronder reist mee.
    const allesWatMaculisZiet = JSON.stringify({ ctx, bericht,
      conv: (await query('select subject from conversation where id=$1', [draadSanne])).rows[0] });
    for (const eronder of ['de lezing eronder', 'de betekenis eronder', 'de basis eronder', 'de open vraag eronder']) {
      assert.ok(!allesWatMaculisZiet.includes(eronder), `"${eronder}" reist niet mee`);
    }

    // ---- 2 en 3. het inzicht blijft ongedeeld, ook voor de gedeelde werkelijkheid ----------------
    assert.equal((await query('select sharing from customer_insight where id=$1', [insightId])).rows[0].sharing, 'PRIVATE');
    assert.equal((await sharedContextForOrg(tid, org)).length, 0,
      'praten voegt het inzicht niet toe aan de gedeelde organisatiewerkelijkheid');

    // ---- 4. Sanne's herkenning en notitie blijven bij Sanne --------------------------------------
    await roep('POST', `/api/mijn/insights/${insightId}/recognition`, {
      token: sanne.token, body: { answer: 'deels', note: 'Bij ons speelt vooral iets anders.' },
    });
    const naHerkenning = JSON.stringify(await sharedContextForOrg(tid, org));
    assert.ok(!naHerkenning.includes('deels') && !naHerkenning.includes('Bij ons speelt'),
      'de herkenning bereikt de Cockpit niet');

    // ---- 5. Piet ziet Sanne's gesprek niet -------------------------------------------------------
    const lijstPietDraden = await roep('GET', '/api/mijn/conversations', { token: piet.token });
    assert.equal(lijstPietDraden.json.items.length, 0, 'Piet heeft geen gesprekken');
    const directeToegang = await roep('GET', `/api/mijn/conversations/${draadSanne}`, { token: piet.token });
    assert.equal(directeToegang.status, 404, 'ook niet met het gesprek-id in de hand');
    const detailPiet = await roep('GET', `/api/mijn/insights/${insightId}`, { token: piet.token });
    assert.equal(detailPiet.json.conversation, null, 'en niet via het bewijsblad van het patroon');
    assert.equal(detailPiet.json.insight.recognition, null, 'en hij ziet haar antwoord niet');

    // Piets eigen antwoord overschrijft dat van Sanne niet.
    await roep('POST', `/api/mijn/insights/${insightId}/recognition`, { token: piet.token, body: { answer: 'ja' } });
    const detailSanne = await roep('GET', `/api/mijn/insights/${insightId}`, { token: sanne.token });
    assert.equal(detailSanne.json.insight.recognition, 'deels', 'Sanne houdt haar eigen antwoord');
    assert.equal(detailSanne.json.insight.recognition_note, 'Bij ons speelt vooral iets anders.');
    assert.equal((await roep('GET', `/api/mijn/insights/${insightId}`, { token: piet.token })).json.insight.recognition, 'ja');

    // ---- 6. Piet deelt het inzicht; niets van Sanne verandert ------------------------------------
    const voor = {
      herkenning: (await query('select answer, note, at from insight_recognition where insight_id=$1 and contact_id=$2',
        [insightId, sanne.contactId])).rows[0],
      draad: (await query('select id, subject, contact_id from conversation where id=$1', [draadSanne])).rows[0],
      context: await conversationContext(tid, draadSanne),
    };
    const deel = await roep('POST', `/api/mijn/insights/${insightId}/share`, { token: piet.token });
    assert.equal(deel.json.sharing, 'SHARED', 'Piet deelt het inzicht');
    assert.equal((await sharedContextForOrg(tid, org)).length, 1, 'en Maculis mag het nu kennen');

    const na = {
      herkenning: (await query('select answer, note, at from insight_recognition where insight_id=$1 and contact_id=$2',
        [insightId, sanne.contactId])).rows[0],
      draad: (await query('select id, subject, contact_id from conversation where id=$1', [draadSanne])).rows[0],
      context: await conversationContext(tid, draadSanne),
    };
    assert.deepEqual(na, voor, 'aan Sanne is niets veranderd door een handeling van Piet');

    // En het delen blijft persoonlijk vastgelegd: wie het deed is aantoonbaar.
    const spoor = (await query(
      `select actor_access_id, actor_label from insight_share_event where insight_id=$1 and action='shared'`, [insightId])).rows;
    assert.equal(spoor.length, 1);
    assert.equal(spoor[0].actor_access_id, piet.id, 'de deelhandeling is herleidbaar tot Piet');

    // Ook ná het delen bereikt de persoonlijke laag de Cockpit nooit.
    const naDelen = JSON.stringify(await sharedContextForOrg(tid, org));
    assert.ok(!naDelen.includes('deels') && !naDelen.includes('Bij ons speelt'),
      'delen sleept het antwoord van Sanne niet mee naar binnen');
  } finally {
    await closePool();
  }
});
