// Primaire bezorging tegenover secundaire notificatie.
//
// HET PROBLEEM DAT DEZE TESTS VASTZETTEN
//   Een antwoord in Mijn Maculis is bezorgd zodra het is weggeschreven: de klant leest uit dezelfde
//   database. De melding dat er iets klaarstaat, is een tweede, apart bericht dat wél de deur uit
//   gaat en dus kan mislukken. Zolang beide als "de laatste uitgaande zending" telden, sloeg een
//   mislukte melding om in de uitspraak "je vorige bericht kwam niet aan", terwijl het bericht
//   aantoonbaar was aangekomen.
//
// DE REGEL DIE HIER WORDT BEWAAKT
//   Alleen de bezorgstatus van de PRIMAIRE communicatie bepaalt of een gesprek een bezorgprobleem
//   heeft. Een secundaire notificatie heeft haar eigen kanaal en haar eigen bezorgstatus, en die
//   staan los. De grens loopt langs de ROL van het bericht en nadrukkelijk niet langs het kanaal:
//   een mislukte melding is een mislukte melding, of ze nu over EMAIL of over een ander kanaal ging.
//
//   Deze tests draaien tegen de echte tabellen en het echte aandachtsmodel. Ze slaan over zonder
//   DATABASE_URL.

import test from 'node:test';
import assert from 'node:assert/strict';

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
const SKIP = HAS_DB ? false : 'no DATABASE_URL — bezorgsemantiek overgeslagen';

// Een provider die aantoonbaar mislukt. Zo is een bezorgfout in de test een echte fout uit de
// verzendlaag en niet een met de hand geschreven databaserij.
const mislukt = (channel, name = 'stub') => ({
  name, channel, mode: 'live',
  capabilities() { return { inbound: false, outbound: true }; },
  requiredConfig() { return []; },
  async send() { return { ok: false, reason: 'transport_niet_beschikbaar' }; },
});
const slaagt = (channel, name = 'stub') => ({
  name, channel, mode: 'live',
  capabilities() { return { inbound: false, outbound: true }; },
  requiredConfig() { return []; },
  async send() { return { ok: true, providerMessageId: `${name}-1`, delivery: 'SENT' }; },
});

async function omgeving() {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { query } = await import('../server/comm/db.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  await runMigrations({ silent: true });
  await query('truncate message, conversation, contact, organization, communication_preference, delivery_event, activity, audit_event cascade');
  const tenantId = await getDefaultTenantId();
  const org = (await query(
    "insert into organization(tenant_id, name) values ($1,'Voorbeeld BV') returning id", [tenantId])).rows[0];
  const contact = (await query(
    `insert into contact(tenant_id, organization_id, identity_key, first_name, last_name, email)
     values ($1,$2,'sanne@voorbeeld.nl','Sanne','de Vries','sanne@voorbeeld.nl') returning id`,
    [tenantId, org.id])).rows[0];
  // Een extra relatie aanmaken. Een melding zonder gespreks-id zoekt de bestaande e-maildraad van
  // DIE persoon op, dus per persoon ontstaat een eigen meldingsdraad. Precies zoals in productie.
  const nogEenContact = async (naam) => (await query(
    `insert into contact(tenant_id, organization_id, identity_key, first_name, last_name, email)
     values ($1,$2,$3,$4,'Testpersoon',$5) returning id`,
    [tenantId, org.id, `${naam}@voorbeeld.nl`, naam, `${naam}@voorbeeld.nl`])).rows[0].id;
  return { tenantId, organizationId: org.id, contactId: contact.id, query, nogEenContact };
}

// Een klantvraag in Mijn Maculis, zodat er iets te beantwoorden valt en het gesprek een echte
// inbound heeft. Zonder inbound zou het aandachtsmodel nooit over "ons antwoord" kunnen oordelen.
async function vraagInMijnMaculis({ tenantId, organizationId, contactId, query }, wie = null) {
  contactId = wie || contactId;
  const conv = (await query(
    `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, subject, status, last_message_at, last_inbound_at)
     values ($1,$2,$3,'MIJN_MACULIS',false,'Waar baseren jullie dit op?','NEW', now() - interval '1 hour', now() - interval '1 hour')
     returning id`, [tenantId, organizationId, contactId])).rows[0];
  await query(
    `insert into message(tenant_id, conversation_id, direction, channel, body_text, delivery, created_at)
     values ($1,$2,'INBOUND','MIJN_MACULIS','Waar baseren jullie dit precies op?','DELIVERED', now() - interval '1 hour')`,
    [tenantId, conv.id]);
  return conv.id;
}

// De aandachtswachtrij bevat uitsluitend gesprekken die werkelijk iets van een mens vragen. Een
// gesprek dat er NIET in staat, is daarmee bewezen kalm. Dat is precies de uitspraak die we willen
// toetsen, dus we meten op de echte publieke uitkomst en niet op een tussenvorm.
async function overzicht(tenantId) {
  const { attentionOverview } = await import('../server/comm/attention.mjs');
  const o = await attentionOverview(tenantId);
  return {
    states: o.summary.states,
    problemen: o.queue.filter((c) => c.state === 'DELIVERY_PROBLEM').map((c) => c.id),
    inWachtrij: (id) => o.queue.some((c) => c.id === id),
    rij: (id) => o.queue.find((c) => c.id === id) || null,
  };
}

// ---- 1. antwoord geslaagd, melding geslaagd -----------------------------------------------------
test('1. Mijn Maculis-antwoord bezorgd en melding bezorgd: geen bezorgprobleem',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { sendOnChannel } = await import('../server/comm/send.mjs');
      const convId = await vraagInMijnMaculis(env);

      const primair = await sendOnChannel({
        tenantId: env.tenantId, conversationId: convId, contactId: env.contactId,
        organizationId: env.organizationId, channel: 'MIJN_MACULIS', text: 'Dat baseren we hierop.' });
      assert.equal(primair.ok, true);
      assert.equal(primair.delivery, 'DELIVERED');

      const melding = await sendOnChannel({
        tenantId: env.tenantId, contactId: env.contactId, organizationId: env.organizationId,
        channel: 'EMAIL', subject: 'Er staat een antwoord voor je klaar in Mijn Maculis',
        text: 'Er staat iets voor je klaar.', isNotification: true, provider: slaagt('EMAIL') });
      assert.equal(melding.ok, true);

      const o = await overzicht(env.tenantId);
      assert.equal(o.states.DELIVERY_PROBLEM, 0, 'nergens een bezorgprobleem');
      assert.equal(o.inWachtrij(convId), false, 'het gesprek vraagt niets meer van een mens');
      assert.equal(o.states.WAITING_FOR_CUSTOMER, 1, 'we hebben geantwoord, de bal ligt bij de klant');
    } finally { await closePool(); }
  });

// ---- 2. antwoord geslaagd, melding mislukt ------------------------------------------------------
test('2. Mijn Maculis-antwoord bezorgd maar melding mislukt: nog steeds geen bezorgprobleem',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { sendOnChannel } = await import('../server/comm/send.mjs');
      const convId = await vraagInMijnMaculis(env);

      const primair = await sendOnChannel({
        tenantId: env.tenantId, conversationId: convId, contactId: env.contactId,
        organizationId: env.organizationId, channel: 'MIJN_MACULIS', text: 'Dat baseren we hierop.' });
      assert.equal(primair.delivery, 'DELIVERED', 'het antwoord staat in de omgeving van de klant');

      const melding = await sendOnChannel({
        tenantId: env.tenantId, contactId: env.contactId, organizationId: env.organizationId,
        channel: 'EMAIL', subject: 'Er staat een antwoord voor je klaar in Mijn Maculis',
        text: 'Er staat iets voor je klaar.', isNotification: true, provider: mislukt('EMAIL') });
      assert.equal(melding.ok, false, 'de melding kwam er niet doorheen');
      assert.equal(melding.delivery, 'FAILED');

      // DIT IS DE KERN. De melding mislukte, het antwoord niet.
      const o = await overzicht(env.tenantId);
      assert.equal(o.states.DELIVERY_PROBLEM, 0,
        'een mislukte melding mag nooit betekenen dat het antwoord de klant niet bereikte');
      assert.equal(o.inWachtrij(convId), false, 'het gesprek blijft kalm');
      assert.equal(o.states.WAITING_FOR_CUSTOMER, 1, 'het antwoord staat, de bal ligt bij de klant');

      // En de mislukking is niet weggepoetst: ze staat er duurzaam, met haar eigen kanaal en status.
      const bewaard = (await env.query(
        `select channel, delivery, is_notification from message
          where tenant_id=$1 and direction='OUTBOUND' and is_notification order by created_at`,
        [env.tenantId])).rows;
      assert.equal(bewaard.length, 1, 'de mislukte melding is bewaard');
      assert.equal(bewaard[0].delivery, 'FAILED', 'met haar echte status');
      assert.equal(bewaard[0].channel, 'EMAIL', 'en haar eigen kanaal');
      const ev = Number((await env.query(
        `select count(*)::int n from delivery_event where state='FAILED'`)).rows[0].n);
      assert.ok(ev >= 1, 'en met een bezorggebeurtenis, zodat er later op te handelen valt');
    } finally { await closePool(); }
  });

// ---- 3. het primaire bericht mislukt ------------------------------------------------------------
test('3. een mislukt PRIMAIR bericht levert wel een bezorgprobleem op',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { sendOnChannel } = await import('../server/comm/send.mjs');
      const conv = (await env.query(
        `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, subject, status, last_message_at, last_inbound_at)
         values ($1,$2,$3,'EMAIL',false,'Vraag','NEW', now() - interval '1 hour', now() - interval '1 hour')
         returning id`, [env.tenantId, env.organizationId, env.contactId])).rows[0];
      await env.query(
        `insert into message(tenant_id, conversation_id, direction, channel, body_text, delivery, created_at)
         values ($1,$2,'INBOUND','EMAIL','Kunnen jullie hier iets mee?','DELIVERED', now() - interval '1 hour')`,
        [env.tenantId, conv.id]);

      const r = await sendOnChannel({
        tenantId: env.tenantId, conversationId: conv.id, contactId: env.contactId,
        organizationId: env.organizationId, channel: 'EMAIL', text: 'Ons antwoord.',
        provider: mislukt('EMAIL') });
      assert.equal(r.ok, false);
      assert.equal(r.delivery, 'FAILED');

      const o = await overzicht(env.tenantId);
      const rij = o.rij(conv.id);
      assert.ok(rij, 'een bezorgprobleem hoort in de wachtrij te staan');
      assert.equal(rij.state, 'DELIVERY_PROBLEM',
        'de primaire communicatie bereikte de klant niet, en dat hoort de Cockpit wel te zeggen');
    } finally { await closePool(); }
  });

// ---- 4. uitsluitend situatie 3 ------------------------------------------------------------------
test('4. alleen een mislukt primair bericht kan een bezorgprobleem veroorzaken',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { sendOnChannel } = await import('../server/comm/send.mjs');

      // Drie RELATIES naast elkaar in één tenant, elk met een eigen persoon. Dat is wezenlijk: een
      // melding zonder gespreks-id zoekt de e-maildraad van die persoon op, dus zo krijgt elke
      // melding haar eigen draad, precies zoals het defect zich in productie voordeed. Deelden ze
      // één persoon, dan zouden alle meldingen op dezelfde draad belanden en zou deze test de fout
      // niet meer kunnen zien.
      const pa = await env.nogEenContact('anna');
      const pb = await env.nogEenContact('bram');
      const pc = await env.nogEenContact('carla');

      const a = await vraagInMijnMaculis(env, pa);   // antwoord ok, melding ok
      const b = await vraagInMijnMaculis(env, pb);   // antwoord ok, melding mislukt
      const c = (await env.query(
        `insert into conversation(tenant_id, organization_id, contact_id, channel, is_privacy, subject, status, last_message_at, last_inbound_at)
         values ($1,$2,$3,'EMAIL',false,'Vraag','NEW', now() - interval '1 hour', now() - interval '1 hour')
         returning id`, [env.tenantId, env.organizationId, pc])).rows[0].id;
      await env.query(
        `insert into message(tenant_id, conversation_id, direction, channel, body_text, delivery, created_at)
         values ($1,$2,'INBOUND','EMAIL','Vraag','DELIVERED', now() - interval '1 hour')`, [env.tenantId, c]);

      const org = env.organizationId;
      await sendOnChannel({ tenantId: env.tenantId, organizationId: org, contactId: pa, conversationId: a, channel: 'MIJN_MACULIS', text: 'Antwoord A.' });
      await sendOnChannel({ tenantId: env.tenantId, organizationId: org, contactId: pa, channel: 'EMAIL', subject: 'Melding', text: 'Klaar.', isNotification: true, provider: slaagt('EMAIL') });
      await sendOnChannel({ tenantId: env.tenantId, organizationId: org, contactId: pb, conversationId: b, channel: 'MIJN_MACULIS', text: 'Antwoord B.' });
      await sendOnChannel({ tenantId: env.tenantId, organizationId: org, contactId: pb, channel: 'EMAIL', subject: 'Melding', text: 'Klaar.', isNotification: true, provider: mislukt('EMAIL') });
      await sendOnChannel({ tenantId: env.tenantId, organizationId: org, contactId: pc, conversationId: c, channel: 'EMAIL', text: 'Antwoord C.', provider: mislukt('EMAIL') });

      const o = await overzicht(env.tenantId);
      assert.equal(o.states.DELIVERY_PROBLEM, 1, 'precies één bezorgprobleem in de hele tenant');
      assert.deepEqual(o.problemen, [c], 'en dat is het gesprek waarvan het PRIMAIRE bericht mislukte');
      assert.equal(o.inWachtrij(a), false, 'antwoord bezorgd en melding bezorgd: kalm');
      assert.equal(o.inWachtrij(b), false, 'antwoord bezorgd en melding mislukt: ook kalm');
    } finally { await closePool(); }
  });

// ---- 5. de grens loopt langs de rol, niet langs het kanaal ---------------------------------------
test('5. een mislukte melding op een ander kanaal gedraagt zich precies hetzelfde',
  { skip: SKIP }, async () => {
    const { closePool } = await import('../server/comm/db.mjs');
    try {
      const env = await omgeving();
      const { sendOnChannel } = await import('../server/comm/send.mjs');
      const { setPreference } = await import('../server/comm/consent.mjs');
      const convId = await vraagInMijnMaculis(env);

      await sendOnChannel({
        tenantId: env.tenantId, conversationId: convId, contactId: env.contactId,
        organizationId: env.organizationId, channel: 'MIJN_MACULIS', text: 'Antwoord.' });

      // WHATSAPP is een opt-in-kanaal. Zonder toestemming gaat er niets uit: fail closed, en dat
      // geldt voor een melding net zo goed als voor communicatie. Hier geven we die toestemming
      // expliciet, want anders zou de test de bezorgstatus nooit bereiken.
      const zonder = await sendOnChannel({
        tenantId: env.tenantId, contactId: env.contactId, organizationId: env.organizationId,
        channel: 'WHATSAPP', text: 'Er staat iets voor je klaar in Mijn Maculis.',
        isNotification: true, provider: mislukt('WHATSAPP') });
      assert.equal(zonder.reason, 'consent_blocked', 'ook een melding komt niet langs de consentpoort');

      await setPreference(env.tenantId, env.contactId, { channel: 'WHATSAPP', purpose: 'service', allowed: true });
      await env.query(
        `insert into channel_identity(tenant_id, contact_id, channel, value, is_primary, verified)
         values ($1,$2,'WHATSAPP','+31600000000',true,true)`, [env.tenantId, env.contactId]);

      const melding = await sendOnChannel({
        tenantId: env.tenantId, contactId: env.contactId, organizationId: env.organizationId,
        channel: 'WHATSAPP', text: 'Er staat iets nieuws voor je klaar in Mijn Maculis.',
        isNotification: true, provider: mislukt('WHATSAPP') });
      assert.equal(melding.ok, false);
      assert.equal(melding.delivery, 'FAILED');

      const o = await overzicht(env.tenantId);
      assert.equal(o.states.DELIVERY_PROBLEM, 0,
        'de regel hangt aan de rol van het bericht, niet aan het kanaal waarop de melding ging');
      assert.equal(o.inWachtrij(convId), false, 'het gesprek blijft kalm');

      const kanalen = (await env.query(
        `select channel, delivery from message where tenant_id=$1 and is_notification`, [env.tenantId])).rows;
      assert.deepEqual(kanalen, [{ channel: 'WHATSAPP', delivery: 'FAILED' }],
        'de melding houdt haar eigen kanaal en haar eigen status');
    } finally { await closePool(); }
  });

// ---- 6. de echte meldingsweg draagt de vlag ook werkelijk ---------------------------------------
test('6. announceReply markeert zijn zending als secundair, niet als communicatie',
  { skip: SKIP }, async () => {
    const { readFile } = await import('node:fs/promises');
    const src = await readFile(new URL('../server/mijn/notify.mjs', import.meta.url), 'utf8');
    assert.match(src, /isNotification:\s*true/, 'de meldingsmodule stuurt uitdrukkelijk als melding');
    const send = await readFile(new URL('../server/comm/send.mjs', import.meta.url), 'utf8');
    assert.match(send, /isNotification = false/, 'en primair is de standaard, dus niemand wordt per ongeluk secundair');
  });
