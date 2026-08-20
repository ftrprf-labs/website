// Mijn Maculis — van herkennen naar een vervolgstap.
//
// Wat hier bewezen wordt is de hele keten en, belangrijker, de grenzen eromheen. De vraag "Wil je
// hier iets mee?" voegt een DERDE signaal toe naast herkenning en vrijgave, en drie signalen die
// door elkaar gaan lopen is precies de faalmodus die dit hele traject twee keer eerder heeft
// opgeleverd. Daarom staat hier niet alleen dat het werkt, maar vooral wat er NIET gebeurt:
//
//   * de deelstaat van het inzicht verandert nergens;
//   * het herkenningsantwoord en de toelichting komen niet in het hulpdossier, en worden er ook
//     niet uit gereconstrueerd;
//   * Piet ziet niets van de intentie van Sanne, en andersom;
//   * er is geen enkele klantzijdige route die een hulpdossier teruggeeft;
//   * twee aanvragers leveren één dossier op, niet twee;
//   * een mislukte voorbereiding maakt een echte klantvraag niet onzichtbaar.
//
// Vereist een Postgres (DATABASE_URL + COMM_LAYER_ENABLED); SLAAT OVER zonder.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const opts = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — intentietests overgeslagen' };

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

test('intentie: de keten, en alle grenzen eromheen', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  const { handleMijn } = await import('../server/mijn/routes.mjs');
  const { sharedContextForOrg } = await import('../server/mijn/sharing.mjs');
  const { dossierVoorGesprek, escalatieMoment } = await import('../server/mijn/hulp.mjs');
  const { vraagIsRelevant } = await import('../server/mijn/intentie.mjs');

  try {
    await runMigrations({ silent: true });
    await query(`truncate help_dossier_actor, help_dossier, insight_intent_event, insight_intent,
      insight_context_share, insight_recognition, insight_recognition_event, customer_invite,
      customer_login_token, customer_insight, insight_version, insight_observation,
      insight_share_event, customer_access, collaboration_item, relationship_memory, ai_draft,
      follow_up, message, conversation, communication_preference, channel_identity, contact,
      organization cascade`);

    const tid = await getDefaultTenantId();
    const org = (await query(
      `insert into organization(tenant_id,name,relationship_stage) values ($1,'Intentie Org','CUSTOMER') returning id`,
      [tid])).rows[0].id;

    const maakPersoon = async (voornaam, email, token) => {
      const c = (await query(
        `insert into contact(tenant_id, organization_id, first_name, email, identity_key)
         values ($1,$2,$3,$4,$5) returning id`, [tid, org, voornaam, email, 'email:' + email])).rows[0].id;
      const a = await createAccess(tid, org, { label: voornaam, token, contactId: c });
      return { contactId: c, token, id: a.id };
    };
    const sanne = await maakPersoon('Sanne', 'sanne@intentie.nl', 'sanne-' + 's'.repeat(30));
    const piet = await maakPersoon('Piet', 'piet@intentie.nl', 'piet-' + 'p'.repeat(30));

    // Een spanning met genoeg bewijs: dit is een patroon waar de vervolgvraag over gaat.
    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Jullie positionering wordt intern niet overal hetzelfde ervaren',
      stance: 'tension', observation: 'Naar buiten helder, naar binnen niet overal.', sharing: 'PRIVATE',
    });
    for (const label of ['Vacaturetekst', 'Interne nieuwsbrief', 'Bericht van een teamlid', 'Teampagina']) {
      await query(
        `insert into insight_observation(tenant_id, organization_id, insight_id, customer_label, observed_at)
         values ($1,$2,$3,$4, now())`, [tid, org, insightId, label]);
    }
    // Een sterkte: hier hoort de vervolgvraag NIET te verschijnen.
    const sterkte = (await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Sterke betrokkenheid bij klantgerichtheid',
      stance: 'consistency', observation: 'Consistent zichtbaar.', sharing: 'PRIVATE',
    })).insightId;

    // ---- 1. de vraag verschijnt alleen wanneer hij ergens over gaat -----------------------------
    assert.equal(vraagIsRelevant({ stance: 'tension', evidence_count: 4, recognition: 'ja' }), true);
    assert.equal(vraagIsRelevant({ stance: 'tension', evidence_count: 4, recognition: 'deels' }), true,
      'deels herkennen sluit willen veranderen niet uit');
    assert.equal(vraagIsRelevant({ stance: 'tension', evidence_count: 4, recognition: 'nee' }), true,
      'bij nee verschillen twee perspectieven op dezelfde werkelijkheid, en juist daar heeft de vraag betekenis');
    assert.equal(vraagIsRelevant({ stance: 'tension', evidence_count: 4, recognition: null }), false,
      'zonder herkenning is dit een vraag over iets wat nog niet vaststaat');
    assert.equal(vraagIsRelevant({ stance: 'consistency', evidence_count: 9, recognition: 'ja' }), false,
      'op een sterkte is "wil je hier iets aan veranderen" een categoriefout');
    assert.equal(vraagIsRelevant({ stance: 'unknown', evidence_count: 9, recognition: 'ja' }), false,
      'onbekend IS de uitspraak "hier is te weinig om iets te zeggen", daar valt niets te willen');
    // De onthulling van de Lens komt met de citaten waaruit ze is afgeleid. Drie regels, en dat is
    // genoeg grond: dit soort uitspraak kent geen onafhankelijke bevestiging.
    assert.equal(vraagIsRelevant({ stance: 'reveal', evidence_count: 3, recognition: 'deels' }), true,
      'een onthulling uit de Lens draagt zichzelf, ook met drie regels');

    // ---- 2. Ja, Deels en Nee ---------------------------------------------------------------------
    for (const [token, antwoord] of [[sanne.token, 'ja'], [piet.token, 'deels']]) {
      const r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/recognition`,
        { token, body: { answer: antwoord } });
      assert.equal(r.status, 200);
    }
    const naNee = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${sterkte}/recognition`,
      { token: sanne.token, body: { answer: 'nee' } });
    assert.equal(naNee.status, 200);

    // ---- 3. alle drie de keuzes ------------------------------------------------------------------
    let r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${sterkte}/intent`,
      { token: sanne.token, body: { intent: 'weten' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.intent, 'weten');
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 0,
      '"Nee, alleen weten" zet niets in gang: geen dossier, geen taak, geen gesprek');

    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${sterkte}/intent`,
      { token: sanne.token, body: { intent: 'zelf' } });
    assert.equal(r.json.intent, 'zelf');
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 0,
      '"Zelf oppakken" zet ook niets in gang');
    assert.equal((await query('select count(*)::int n from conversation')).rows[0].n, 0,
      'en er ontstaat geen gesprek');

    // ---- 4. Samen met Maculis: de klik is de laatste noodzakelijke handeling ---------------------
    const voorSharing = (await query('select sharing from customer_insight where id=$1', [insightId])).rows[0].sharing;
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
      { token: sanne.token, body: { intent: 'samen' } });
    assert.equal(r.status, 200);
    assert.equal(r.json.intent, 'samen');
    assert.equal(r.json.insight.intent, 'samen', 'de klant ziet zijn keuze meteen terug');

    const dossiers = (await query('select * from help_dossier')).rows;
    assert.equal(dossiers.length, 1, 'er is één hulpdossier');
    const dossier = dossiers[0];
    assert.equal(dossier.insight_id, insightId);
    assert.equal(dossier.status, 'klaar', 'de voorbereiding is af en er wacht een mens');
    assert.ok(['volledig', 'deels'].includes(dossier.voorbereiding), dossier.voorbereiding);
    assert.ok(dossier.samenvatting && dossier.voorgestelde_stap && dossier.zekerheid,
      'de medewerker krijgt aanleiding, vervolgstap en zekerheid in één voorstel');
    assert.equal(dossier.gedeeld, false, 'de momentopname weet dat dit inzicht niet gedeeld was');

    const actors = (await query('select * from help_dossier_actor')).rows;
    assert.equal(actors.length, 1);
    assert.equal(actors[0].contact_id, sanne.contactId);

    const draad = (await query('select id, contact_id, insight_id, last_inbound_at, last_message_at from conversation')).rows;
    assert.equal(draad.length, 1, 'er is één gesprek, van Sanne, over dit patroon');
    assert.equal(draad[0].contact_id, sanne.contactId);
    assert.ok(draad[0].last_inbound_at, 'de klik telt als iets wat van hen kwam');
    assert.equal(draad[0].last_message_at, null, 'maar er is geen bericht, dus dat blijft leeg');
    assert.equal((await query('select count(*)::int n from message')).rows[0].n, 0,
      'de klant hoefde niets te typen en er is niets verstuurd');

    const taak = (await query("select * from follow_up where status='open'")).rows;
    assert.equal(taak.length, 1, 'er staat één interne taak klaar');
    assert.equal(taak[0].channel_hint, 'MIJN_MACULIS');
    assert.ok(new Date(taak[0].due_at) > new Date(), 'met een escalatiegrens in de toekomst');

    const concept = (await query("select * from ai_draft where status='proposed'")).rows;
    assert.equal(concept.length, 1, 'en er ligt één conceptantwoord klaar');
    assert.ok(concept[0].suggested_reply.length > 20);

    // ---- 5. sharing verandert nergens ------------------------------------------------------------
    assert.equal((await query('select sharing from customer_insight where id=$1', [insightId])).rows[0].sharing,
      voorSharing, 'vragen is niet delen');
    assert.equal((await sharedContextForOrg(tid, org)).length, 0,
      'en het inzicht bereikt de gedeelde organisatiewerkelijkheid niet');
    assert.equal((await query("select count(*)::int n from insight_share_event")).rows[0].n, 0,
      'er is geen deelhandeling gebeurd');

    // ---- 6. geen herkenning in het dossier, en geen reconstructie --------------------------------
    const dossierTekst = JSON.stringify(await dossierVoorGesprek(tid, draad[0].id));
    for (const v of ['"ja"', '"deels"', 'recognition', 'toelichting']) {
      assert.ok(!dossierTekst.includes(v), `het dossier draagt ${v} niet`);
    }
    const rijTekst = JSON.stringify(dossier);
    assert.ok(!/recognition|herkenning/i.test(rijTekst), 'ook de rij zelf niet');
    // En de code kan het niet: hulp.mjs leest insight_recognition nergens, ook niet via een omweg.
    const { readFile } = await import('node:fs/promises');
    const bron = await readFile(new URL('../server/mijn/hulp.mjs', import.meta.url), 'utf8');
    assert.ok(!bron.includes('insight_recognition'),
      'hulp.mjs mag insight_recognition niet noemen: geen reconstructie van het persoonlijke antwoord');

    // ---- 7. Piet ziet niets van Sanne, en andersom -----------------------------------------------
    const bijPiet = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${insightId}`, { token: piet.token });
    assert.equal(bijPiet.json.insight.intent, null, 'Piet ziet de intentie van Sanne niet');
    assert.equal(bijPiet.json.insight.recognition, 'deels', 'hij ziet wel zijn eigen antwoord');
    assert.equal(bijPiet.json.conversation, null, 'en haar gesprek niet');
    const bijSanne = await mijnCall(handleMijn, 'GET', `/api/mijn/insights/${insightId}`, { token: sanne.token });
    assert.equal(bijSanne.json.insight.intent, 'samen');
    assert.equal(bijSanne.json.insight.recognition, 'ja');

    // ---- 8. geen klantzijdige toegang tot het hulpdossier -----------------------------------------
    const klantOppervlak = JSON.stringify([
      (await mijnCall(handleMijn, 'GET', '/api/mijn/insights', { token: sanne.token })).json,
      bijSanne.json, bijPiet.json,
      (await mijnCall(handleMijn, 'GET', '/api/mijn/overview', { token: sanne.token })).json,
      (await mijnCall(handleMijn, 'GET', '/api/mijn/conversations', { token: sanne.token })).json,
      (await mijnCall(handleMijn, 'GET', '/api/mijn/collaboration', { token: sanne.token })).json,
    ]);
    for (const woord of ['dossier', 'voorgestelde_stap', 'zekerheid', 'samenvatting', 'aanvrager']) {
      assert.ok(!klantOppervlak.includes(woord), `het klantoppervlak lekt "${woord}" niet`);
    }
    const routes = await readFile(new URL('../server/mijn/routes.mjs', import.meta.url), 'utf8');
    assert.ok(!/help_dossier/.test(routes), 'geen enkele klantzijdige route noemt het dossier');

    // ---- 9. twee aanvragers, één dossier ---------------------------------------------------------
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
      { token: piet.token, body: { intent: 'samen' } });
    assert.equal(r.status, 200);
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 1,
      'twee mensen die hetzelfde vragen is één vraag, geen twee');
    assert.equal((await query('select count(*)::int n from help_dossier_actor')).rows[0].n, 2,
      'maar wel twee aanvragers');
    assert.equal((await query('select count(*)::int n from conversation')).rows[0].n, 2,
      'en ieder houdt zijn eigen gesprek');
    const metTwee = await dossierVoorGesprek(tid, draad[0].id);
    assert.equal(metTwee.aanvragers.length, 2);
    assert.deepEqual(metTwee.aanvragers.map((a) => a.naam).sort(), ['Piet', 'Sanne']);

    // ---- 10. idempotentie: dubbele klik ----------------------------------------------------------
    const voorDubbel = (await query('select count(*)::int n from help_dossier_actor')).rows[0].n;
    for (let k = 0; k < 3; k++) {
      await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
        { token: sanne.token, body: { intent: 'samen' } });
    }
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 1);
    assert.equal((await query('select count(*)::int n from help_dossier_actor')).rows[0].n, voorDubbel);
    assert.equal((await query('select count(*)::int n from insight_intent where insight_id=$1', [insightId])).rows[0].n, 2,
      'één rij per persoon, hoe vaak je ook klikt');

    // ---- 11. wijzigen en intrekken ---------------------------------------------------------------
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
      { token: piet.token, body: { intent: 'zelf' } });
    assert.equal(r.json.intent, 'zelf');
    assert.equal((await query('select count(*)::int n from help_dossier_actor')).rows[0].n, 1,
      'Piet stapt van de vraag af en is geen aanvrager meer');
    assert.equal((await query('select status from help_dossier')).rows[0].status, 'klaar',
      'maar de vraag blijft staan, want Sanne vroeg hem ook');

    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
      { token: sanne.token, body: { intent: null } });
    assert.equal(r.json.intent, null);
    assert.equal((await query('select count(*)::int n from insight_intent where insight_id=$1 and contact_id=$2',
      [insightId, sanne.contactId])).rows[0].n, 0, 'de keuze is ingetrokken');
    assert.equal((await query('select status from help_dossier')).rows[0].status, 'vervallen',
      'zonder aanvragers vervalt de vraag');
    assert.equal((await query("select count(*)::int n from follow_up where status='open'")).rows[0].n, 0,
      'en de interne taak wordt vanzelf gesloten: intern en omkeerbaar, dus dat mag automatisch');

    // Het spoor blijft: van gedachten veranderen overschrijft niets stil.
    const spoor = (await query(
      'select intent from insight_intent_event where insight_id=$1 order by at asc', [insightId])).rows;
    assert.ok(spoor.length >= 5, `het volledige spoor staat er (${spoor.length})`);
    assert.equal(spoor[spoor.length - 1].intent, null, 'de laatste stap is de intrekking');

    // ---- 12. opnieuw vragen laat de vraag weer opleven -------------------------------------------
    r = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${insightId}/intent`,
      { token: sanne.token, body: { intent: 'samen' } });
    assert.equal(r.status, 200);
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 1, 'nog steeds één dossier');
    assert.equal((await query('select status from help_dossier')).rows[0].status, 'klaar');

    // ---- 13. de escalatiegrens is werkdagen en geen wachttijd ------------------------------------
    // Maandag 2026-08-17 plus twee werkdagen is woensdag; vrijdag plus twee is dinsdag.
    assert.equal(escalatieMoment(new Date('2026-08-17T09:00:00Z')).getUTCDate(), 19);
    assert.equal(escalatieMoment(new Date('2026-08-21T09:00:00Z')).getUTCDate(), 25);

    // ---- 14. een onbekend inzicht en een lege intentie -------------------------------------------
    const vreemd = await mijnCall(handleMijn, 'POST',
      '/api/mijn/insights/00000000-0000-4000-8000-000000000000/intent',
      { token: sanne.token, body: { intent: 'samen' } });
    assert.equal(vreemd.status, 404, 'een vreemd id levert geen dossier op maar een weigering');
    const onzin = await mijnCall(handleMijn, 'POST', `/api/mijn/insights/${sterkte}/intent`,
      { token: sanne.token, body: { intent: 'kopen' } });
    assert.equal(onzin.status, 200);
    assert.equal(onzin.json.intent, null, 'een waarde buiten de drie telt als geen keuze');
  } finally {
    await closePool();
  }
});

test('intentie: een mislukte voorbereiding maakt een echte klantvraag niet onzichtbaar', opts, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  const { createInsightWithInitialVersion } = await import('../server/mijn/versions.mjs');
  const { createAccess } = await import('../server/mijn/access.mjs');
  const { koppelAanvrager, bereidVoor, dossierVoorGesprek } = await import('../server/mijn/hulp.mjs');

  try {
    await runMigrations({ silent: true });
    await query(`truncate help_dossier_actor, help_dossier, insight_intent_event, insight_intent,
      insight_context_share, customer_insight, insight_version, insight_observation,
      customer_access, ai_draft, follow_up, message, conversation, contact, organization cascade`);
    const tid = await getDefaultTenantId();
    const org = (await query(
      `insert into organization(tenant_id,name) values ($1,'Mislukt Org') returning id`, [tid])).rows[0].id;
    const contact = (await query(
      `insert into contact(tenant_id, organization_id, first_name, email, identity_key)
       values ($1,$2,'Sanne','sanne@mislukt.nl','email:sanne@mislukt.nl') returning id`,
      [tid, org])).rows[0].id;
    await createAccess(tid, org, { label: 'Sanne', token: 'mis-' + 'm'.repeat(30), contactId: contact });
    const { insightId } = await createInsightWithInitialVersion({
      tenantId: tid, organizationId: org, title: 'Een spanning', stance: 'tension',
      observation: 'iets', sharing: 'PRIVATE',
    });

    const k = await koppelAanvrager(tid, org, insightId, { contactId: contact });
    assert.equal(k.ok, true);

    // Het inzicht verdwijnt onder de voorbereiding uit. De voorbereiding mag daar niet op stuklopen
    // en de vraag mag er niet door verdwijnen.
    await query("update customer_insight set status='archived' where id=$1", [insightId]);
    const res = await bereidVoor(tid, org, k.dossierId);
    assert.equal(res.ok, true, 'de voorbereiding valt niet om');

    const d = (await query('select * from help_dossier where id=$1', [k.dossierId])).rows[0];
    assert.equal(d.status, 'klaar', 'de vraag van de klant staat er nog steeds en wacht op een mens');
    assert.ok(['mislukt', 'deels', 'volledig'].includes(d.voorbereiding));
    assert.ok(d.titel, 'de aanleiding is een momentopname en overleeft het inzicht');

    // En de klant merkt er niets van: zijn keuze is bewaard, wat er ook met de voorbereiding gebeurt.
    assert.equal((await query('select count(*)::int n from help_dossier')).rows[0].n, 1);
    assert.equal(await dossierVoorGesprek(tid, '00000000-0000-4000-8000-000000000000'), null,
      'een gesprek zonder dossier geeft netjes niets terug');
  } finally {
    await closePool();
  }
});
