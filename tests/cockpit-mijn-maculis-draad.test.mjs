// Twee draden bij één relatie, en de grens tussen praten en onthouden.
//
// WAT HIER MIS GING
//   Eén relatie kan bij Maculis in meer dan één gesprek tegelijk op antwoord wachten: een vraag bij
//   een patroon in Mijn Maculis, en daarnaast een los bericht. Het aandachtsmodel vat een relatie
//   samen tot één kaart. Dat is de bedoeling. Wat niet de bedoeling was: die samenvatting
//   ontdubbelde de nevenredenen op SIGNAALTYPE alleen. Twee onbeantwoorde klantberichten leveren
//   hetzelfde type op, dus de tweede draad viel volledig weg. Het nieuwste klantbericht was daarmee
//   nergens meer te zien, en de knop van de kaart wees naar de andere draad.
//
//   Daar bovenop gaf het dossier twee verschillende antwoorden op dezelfde vraag: de radar koos de
//   langst wachtende draad, en `primaryConversationId` de nieuwste ongelezen. In één respons stonden
//   dus twee gesprekken als "het gesprek dat je hier opent".
//
// WAT DEZE TESTS BEWAKEN
//   1. De kaart wijst naar het gesprek van zijn eigen primaire reden.
//   2. Een tweede wachtende draad blijft zichtbaar als nevenreden, mét zijn eigen gespreks-id.
//   3. Een tweede en derde bericht over hetzelfde patroon blijven in dezelfde draad en staan
//      daar als nieuwste.
//   4. Praten is niet onthouden: zonder het vinkje ontstaat er geen enkel geheugenrecord.
//   5. Mét het vinkje ontstaat het langs de bedoelde route, als voorstel en niet als feit.

import test from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const SKIP = HAS_DB ? false : 'no DATABASE_URL — dradentest overgeslagen';

async function omgeving() {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  await runMigrations({ silent: true });
  await query('truncate message, conversation, contact, organization, customer_insight, relationship_memory, activity cascade');
  const tenantId = await getDefaultTenantId();
  const organizationId = (await query(
    "insert into organization(tenant_id, name) values ($1,'De Voorbeeld Groep') returning id", [tenantId])).rows[0].id;
  const contactId = (await query(
    `insert into contact(tenant_id, organization_id, identity_key, first_name, last_name, email)
     values ($1,$2,'sanne@voorbeeld.nl','Sanne','de Vries','sanne@voorbeeld.nl') returning id`,
    [tenantId, organizationId])).rows[0].id;
  const insightId = (await query(
    `insert into customer_insight(tenant_id, organization_id, title, sharing, status)
     values ($1,$2,'Positionering wordt extern duidelijker dan intern','SHARED','confirmed') returning id`,
    [tenantId, organizationId])).rows[0].id;
  return { tenantId, organizationId, contactId, insightId, query };
}

// De kaart van deze relatie, uit de echte radar.
async function kaartVan(tenantId, contactId) {
  const { buildRadar } = await import('../server/comm/signals.mjs');
  const r = await buildRadar(tenantId, {});
  const alle = [...r.buckets.NU, ...r.buckets.KLAAR, ...r.buckets.RADAR];
  return alle.find((c) => c.contactId === contactId) || null;
}

test('1+2. twee wachtende draden: de kaart wijst naar zijn eigen reden en verliest de andere draad niet',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { stuurBericht } = await import('../server/mijn/gesprek.mjs');

      const los = await stuurBericht(env.tenantId, env.organizationId, {
        contactId: env.contactId, insightId: null, text: 'dit is een test', weegMee: false });
      assert.equal(los.ok, true);
      await new Promise((r) => setTimeout(r, 1100));   // aparte seconde, zodat de volgorde vaststaat
      const bijPatroon = await stuurBericht(env.tenantId, env.organizationId, {
        contactId: env.contactId, insightId: env.insightId,
        text: 'Waar baseren jullie dit precies op? Intern herkennen we dit niet zo.', weegMee: false });
      assert.equal(bijPatroon.ok, true);
      assert.notEqual(bijPatroon.conversationId, los.conversationId,
        'een vraag bij een patroon is een eigen draad, geen voortzetting van het losse bericht');

      const kaart = await kaartVan(env.tenantId, env.contactId);
      assert.ok(kaart, 'de relatie staat op de radar');

      // 1. De knop van de kaart hoort bij de reden die eronder staat.
      const draadVanReden = [los, bijPatroon].find((c) => kaart.primary.reason.includes(
        c === los ? 'dit is een test' : 'Waar baseren jullie'));
      assert.ok(draadVanReden, 'de primaire reden komt aantoonbaar uit een van beide draden');
      assert.equal(kaart.conversationId, draadVanReden.conversationId,
        'de kaart opent het gesprek waar zijn eigen reden vandaan komt');

      // 2. De andere draad is niet weggevallen en draagt zijn eigen gespreks-id.
      const anders = draadVanReden === los ? bijPatroon : los;
      const neven = (kaart.secondary || []).find((s) => s.conversationId === anders.conversationId);
      assert.ok(neven, 'de tweede wachtende draad blijft zichtbaar als nevenreden');
      assert.equal(typeof neven.reason, 'string');
      assert.ok(neven.reason.length > 0, 'en met een leesbare reden');

      // Samen dekken de kaart en zijn nevenredenen beide draden. Geen enkel wachtend klantbericht
      // verdwijnt nog uit beeld.
      const zichtbaar = new Set([kaart.conversationId, ...(kaart.secondary || []).map((s) => s.conversationId)]);
      assert.ok(zichtbaar.has(los.conversationId) && zichtbaar.has(bijPatroon.conversationId),
        'beide draden zijn vanaf de kaart bereikbaar');
    } finally { await closePool(); }
  });

test('1b. de dossierroute geeft één antwoord op de vraag welk gesprek je opent',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { stuurBericht } = await import('../server/mijn/gesprek.mjs');
      await stuurBericht(env.tenantId, env.organizationId, { contactId: env.contactId, insightId: null, text: 'dit is een test', weegMee: false });
      await new Promise((r) => setTimeout(r, 1100));
      await stuurBericht(env.tenantId, env.organizationId, { contactId: env.contactId, insightId: env.insightId, text: 'Waar baseren jullie dit op?', weegMee: false });

      // De ECHTE route aanroepen, niet zijn logica overschrijven. Anders toetst de test zijn eigen
      // aanname en niet het product.
      const { handleCockpit } = await import('../server/cockpit/routes.mjs');
      const pathname = `/api/cockpit/relation/${env.contactId}`;
      let body = null;
      const res = {
        writeHead() { return res; },
        setHeader() {},
        end(payload) { body = JSON.parse(payload); },
      };
      const handled = await handleCockpit({ url: pathname, headers: {} }, res,
        { pathname, method: 'GET', isAuthed: () => true });
      assert.equal(handled, true, 'de route handelt dit pad af');
      assert.ok(body, 'en levert een respons');

      const attentionConv = (body.attention || {}).conversationId;
      assert.ok(attentionConv, 'de aandachtsreden wijst naar een gesprek');

      // Het scenario is alleen bewijskrachtig als de oude, tweede afleiding hier werkelijk iets
      // ANDERS zou hebben gekozen. Anders zou deze test ook slagen met de fout er nog in.
      const convs = body.conversations || [];
      const oudeRegel = (convs.find((cv) => cv.aiReady) || convs.find((cv) => cv.unread > 0) || convs[0] || {}).id;
      assert.notEqual(oudeRegel, attentionConv,
        'de twee oude afleidingen kiezen in dit scenario aantoonbaar verschillende gesprekken');

      assert.equal(body.primaryConversationId, attentionConv,
        'de respons noemt één gesprek als het gesprek dat je hier opent, en dat is het gesprek van de reden');
    } finally { await closePool(); }
  });

test('3. een tweede en derde bericht over hetzelfde patroon blijven dezelfde draad en staan als nieuwste',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { stuurBericht } = await import('../server/mijn/gesprek.mjs');
      const ids = [];
      for (const t of ['Eerste vraag.', 'Tweede vraag.', 'Derde vraag.']) {
        // eslint-disable-next-line no-await-in-loop
        const r = await stuurBericht(env.tenantId, env.organizationId, {
          contactId: env.contactId, insightId: env.insightId, text: t, weegMee: false });
        ids.push(r.conversationId);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 1100));
      }
      assert.equal(new Set(ids).size, 1, 'drie berichten over hetzelfde patroon, één draad');
      const n = Number((await env.query(
        "select count(*)::int n from conversation where channel='MIJN_MACULIS' and deleted_at is null")).rows[0].n);
      assert.equal(n, 1, 'er ontstaat geen tweede of losstaand gesprek');

      const berichten = (await env.query(
        `select body_text from message where conversation_id=$1 and direction='INBOUND' order by created_at`,
        [ids[0]])).rows.map((r) => r.body_text);
      assert.deepEqual(berichten, ['Eerste vraag.', 'Tweede vraag.', 'Derde vraag.']);
      assert.equal(berichten[berichten.length - 1], 'Derde vraag.', 'het laatste bericht is het nieuwste');
    } finally { await closePool(); }
  });

test('4. praten is niet onthouden: zonder het vinkje ontstaat er geen enkel geheugenrecord',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { stuurBericht } = await import('../server/mijn/gesprek.mjs');
      await stuurBericht(env.tenantId, env.organizationId, {
        contactId: env.contactId, insightId: env.insightId, text: 'dit is een test', weegMee: false });

      const n = Number((await env.query('select count(*)::int n from relationship_memory')).rows[0].n);
      assert.equal(n, 0, 'geen feit, geen voorstel, geen geheugen');

      // Het bericht zelf blijft wel gewoon bestaan: het is een bericht, geen kennis.
      const m = Number((await env.query(
        "select count(*)::int n from message where direction='INBOUND' and body_text='dit is een test'")).rows[0].n);
      assert.equal(m, 1, 'het bericht blijft onderdeel van de gesprekshistorie');
    } finally { await closePool(); }
  });

test('5. mét het vinkje ontstaat het langs de bedoelde route: voorstel van de klant, geen feit',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { stuurBericht } = await import('../server/mijn/gesprek.mjs');
      await stuurBericht(env.tenantId, env.organizationId, {
        contactId: env.contactId, insightId: env.insightId, text: 'Wij werken sinds kort met twee merken.', weegMee: true });

      const rows = (await env.query(
        'select kind, source, confidence, content, source_ref from relationship_memory')).rows;
      assert.equal(rows.length, 1, 'precies één voorstel');
      assert.equal(rows[0].source, 'customer', 'herkomst is de klant zelf, niet de AI');
      assert.equal(rows[0].confidence, 'proposed', 'een voorstel, dat een mens nog bevestigt');
      assert.equal(rows[0].source_ref.type, 'mijn_maculis_message', 'herleidbaar tot het bericht');
    } finally { await closePool(); }
  });

// ---- geen regressie op de andere kanalen -------------------------------------------------------
test('6. een e-mailrelatie met één draad houdt precies één reden en geen lege nevenreden',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const conv = (await env.query(
        `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, subject, status, last_message_at, last_inbound_at)
         values ($1,$2,$3,'EMAIL',false,'Vraag','NEW', now(), now()) returning id`,
        [env.tenantId, env.organizationId, env.contactId])).rows[0].id;
      await env.query(
        `insert into message(tenant_id, conversation_id, direction, channel, body_text, delivery)
         values ($1,$2,'INBOUND','EMAIL','Kunnen jullie hier iets mee?','DELIVERED')`, [env.tenantId, conv]);

      const kaart = await kaartVan(env.tenantId, env.contactId);
      assert.ok(kaart, 'de e-mailrelatie staat gewoon op de radar');
      assert.equal(kaart.conversationId, conv, 'en wijst naar zijn enige draad');
      assert.deepEqual(kaart.secondary, [], 'één draad levert geen nevenreden op');
    } finally { await closePool(); }
  });
