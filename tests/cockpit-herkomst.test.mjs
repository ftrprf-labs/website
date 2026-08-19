// Herkomst tegenover status in het relatiedossier.
//
// WAT HIER MIS GING
//   Het dossier splitste zijn regels op `confidence` en toonde boven élke onbevestigde regel het
//   etiket "AI-voorstel". Maar `confidence` zegt niets over herkomst. Een klant die in Mijn Maculis
//   uitdrukkelijk iets deelt, levert een regel met source='customer' die óók nog bevestigd moet
//   worden. Die stond er dus bij als een gok van Maculis. De mens die het las kon niet zien wie
//   iets beweerde, en behandelde een uitspraak van de klant als een afleiding van het systeem.
//
// WAT DEZE TESTS BEWAKEN
//   1. De twee vragen worden apart beantwoord en niet uit elkaar afgeleid: elke combinatie van
//      herkomst en status levert het juiste paar labels.
//   2. Een uitspraak van de klant wordt nooit als afleiding van Maculis gepresenteerd, en andersom.
//   3. Het lichtpunt hoort alleen bij een waarneming van Maculis zelf (canon 9, val 1).
//   4. In de gebruikersinterface staan geen technische termen.
//   5. De dossierroute levert de herkomst werkelijk mee, anders kan het scherm hem niet tonen.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { herkomstVan, herkomstLabel, statusLabel, isWaarnemingVanMaculis } from '../public/herkomst.js';

// ---- 1. de twee assen staan los van elkaar ----------------------------------------------------
test('herkomst en status worden apart beantwoord, in elke combinatie', () => {
  // Dezelfde herkomst, twee statussen.
  assert.equal(herkomstVan({ source: 'customer', confidence: 'proposed' }).herkomst, 'Door de klant gedeeld');
  assert.equal(herkomstVan({ source: 'customer', confidence: 'confirmed' }).herkomst, 'Door de klant gedeeld');
  // Dezelfde status, twee herkomsten. Dit is precies het geval dat eerder samenviel.
  assert.equal(herkomstVan({ source: 'customer', confidence: 'proposed' }).status, 'Nog te bevestigen');
  assert.equal(herkomstVan({ source: 'ai', confidence: 'proposed' }).status, 'Nog te bevestigen');
  assert.notEqual(
    herkomstVan({ source: 'customer', confidence: 'proposed' }).herkomst,
    herkomstVan({ source: 'ai', confidence: 'proposed' }).herkomst,
    'twee onbevestigde regels van verschillende herkomst lezen verschillend');
});

test('alle bekende herkomsten hebben een eigen, menselijke naam', () => {
  assert.equal(herkomstLabel('customer'), 'Door de klant gedeeld');
  assert.equal(herkomstLabel('ai'), 'Door Maculis afgeleid');
  assert.equal(herkomstLabel('human'), 'Door een collega vastgelegd');
  assert.equal(herkomstLabel('manual'), 'Door een collega vastgelegd');
  assert.equal(herkomstLabel('lens'), 'Uit de Lens');
});

test('een onbekende herkomst wordt benoemd en niet geraden', () => {
  // Raden wie iets zei is erger dan zeggen dat je het niet weet.
  for (const raar of [null, undefined, '', 'iets_nieuws']) {
    assert.equal(herkomstLabel(raar), 'Herkomst onbekend');
    assert.equal(herkomstVan({ source: raar, confidence: 'proposed' }).vanKlant, false);
    assert.equal(herkomstVan({ source: raar, confidence: 'proposed' }).vanMaculis, false);
  }
});

test('de status blijft precies wat confidence al betekende', () => {
  assert.equal(statusLabel('proposed'), 'Nog te bevestigen');
  assert.equal(statusLabel('confirmed'), 'Bevestigd');
  assert.equal(herkomstVan({ source: 'ai', confidence: 'proposed' }).teBevestigen, true);
  assert.equal(herkomstVan({ source: 'ai', confidence: 'confirmed' }).teBevestigen, false);
});

// ---- 2. de verwisseling die dit alles veroorzaakte, kan niet meer -----------------------------
test('een uitspraak van de klant wordt nooit als afleiding van Maculis gepresenteerd', () => {
  const klant = herkomstVan({ source: 'customer', confidence: 'proposed' });
  assert.equal(klant.vanKlant, true);
  assert.equal(klant.vanMaculis, false);
  assert.doesNotMatch(klant.herkomst, /maculis/i, 'de naam van Maculis staat niet boven wat de klant zei');
});

test('een afleiding van Maculis wordt nooit als uitspraak van de klant gepresenteerd', () => {
  const afgeleid = herkomstVan({ source: 'ai', confidence: 'proposed' });
  assert.equal(afgeleid.vanMaculis, true);
  assert.equal(afgeleid.vanKlant, false);
  assert.doesNotMatch(afgeleid.herkomst, /klant/i, 'de klant krijgt niet toegeschreven wat Maculis afleidde');
});

// ---- 3. het lichtpunt hoort bij een waarneming van Maculis zelf -------------------------------
test('alleen een waarneming van Maculis draagt het lichtpunt', () => {
  assert.equal(isWaarnemingVanMaculis('ai'), true);
  for (const s of ['customer', 'human', 'manual', 'lens', null]) {
    assert.equal(isWaarnemingVanMaculis(s), false, `${s} is geen waarneming van Maculis`);
  }
});

// ---- 4. geen technische taal in het scherm -----------------------------------------------------
test('de labels dragen geen enkele technische term', () => {
  const alle = ['customer', 'ai', 'human', 'manual', 'lens', 'onbekend']
    .map(herkomstLabel).concat([statusLabel('proposed'), statusLabel('confirmed')]);
  for (const label of alle) {
    assert.doesNotMatch(label, /source|confidence|proposed|confirmed|AI-voorstel|proposal/i,
      `"${label}" hoort in gewone taal te staan`);
    assert.doesNotMatch(label, /\s[-–—]\s/, 'geen streepje als stijlmiddel in zichtbare copy');
  }
});

test('beide schermen leiden de herkomst uit dezelfde regel af', async () => {
  // De operationele Cockpit en het prototype mogen hier niet uit elkaar lopen: dan zou de
  // goedgekeurde visuele referentie iets anders tonen dan het product.
  for (const f of ['public/cockpit-live.js', 'public/cockpit.js']) {
    const src = await readFile(new URL('../' + f, import.meta.url), 'utf8');
    assert.match(src, /import \{ herkomstVan \} from '\.\/herkomst\.js'/, `${f} gebruikt de gedeelde regel`);
    // Alleen wat het scherm werkelijk zet telt. Toelichting die de oude fout beschrijft, mag
    // blijven staan: die legt juist uit waarom het etiket weg is.
    const code = src.split('\n').filter((r) => !r.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(code, /AI-voorstel/, `${f} zet dat etiket nergens meer in beeld`);
  }
});

// ---- 5. de route levert de herkomst werkelijk mee ---------------------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');

test('het dossier levert per regel de herkomst mee, zodat het scherm hem kan tonen',
  { skip: HAS_DB ? false : 'no DATABASE_URL — dossiertest overgeslagen' }, async () => {
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
    const { addMemory } = await import('../server/comm/memory.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, relationship_memory cascade');
      const tenantId = await getDefaultTenantId();
      const organizationId = (await query(
        "insert into organization(tenant_id, name) values ($1,'De Voorbeeld Groep') returning id", [tenantId])).rows[0].id;
      const contactId = (await query(
        `insert into contact(tenant_id, organization_id, identity_key, first_name, last_name, email)
         values ($1,$2,'sanne@voorbeeld.nl','Sanne','de Vries','sanne@voorbeeld.nl') returning id`,
        [tenantId, organizationId])).rows[0].id;

      // Twee regels die eerder niet uit elkaar te houden waren: allebei nog te bevestigen.
      await addMemory(tenantId, { contactId, organizationId, kind: 'fact',
        content: 'Wij werken sinds kort met twee merken.', source: 'customer', confidence: 'proposed' });
      await addMemory(tenantId, { contactId, organizationId, kind: 'fact',
        content: 'Lijkt onder tijdsdruk te staan.', source: 'ai', confidence: 'proposed' });

      const { handleCockpit } = await import('../server/cockpit/routes.mjs');
      const pathname = `/api/cockpit/relation/${contactId}`;
      let body = null;
      const res = { writeHead() { return res; }, setHeader() {}, end(p) { body = JSON.parse(p); } };
      await handleCockpit({ url: pathname, headers: {} }, res, { pathname, method: 'GET', isAuthed: () => true });

      const observed = body.observed || [];
      assert.equal(observed.length, 2, 'beide regels staan er');
      const vanKlant = observed.find((m) => m.content.startsWith('Wij werken'));
      const vanMaculis = observed.find((m) => m.content.startsWith('Lijkt onder'));
      assert.equal(vanKlant.source, 'customer', 'de herkomst van de klant komt mee');
      assert.equal(vanMaculis.source, 'ai', 'de herkomst van Maculis komt mee');
      assert.equal(vanKlant.confidence, vanMaculis.confidence,
        'de status is gelijk, dus alleen de herkomst kan ze nog onderscheiden');

      // En zo leest het scherm ze dan.
      assert.equal(herkomstVan(vanKlant).herkomst, 'Door de klant gedeeld');
      assert.equal(herkomstVan(vanMaculis).herkomst, 'Door Maculis afgeleid');
    } finally { await closePool(); }
  });
