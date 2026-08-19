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
