// Uitgaande grens — TD-002, structureel bewaakt.
//
// Er hoort precies EEN uitgaande weg te zijn: sendOnChannel() in server/comm/send.mjs. Die weg
// draagt de consent-gate, de centrale handtekening, threading, audit, activiteit en de
// deliveryregistratie. Vroeger bestond er een tweede weg (sendReply in outbound.mjs) die de
// consent-gate en de handtekening oversloeg. Die is verwijderd.
//
// Deze tests bewaken dat er geen derde weg terugsluipt. Twee soorten bewijs:
//   1. STATISCH — geen enkele module buiten send.mjs en de e-mailprovider mag de vendor-transport
//      rechtstreeks aanroepen, en geen route mag een eigen OUTBOUND-bericht wegschrijven.
//   2. GEDRAGSMATIG — sendOnChannel weigert werkelijk wanneer de toestemming ontbreekt, en laat
//      dan geen bericht achter.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

// Alleen deze twee mogen de VERZENDkant van de vendor-transport aanraken: de e-mailprovider die
// hem inpakt, en de module die hem definieert. Al het andere hoort via de provider-registry te gaan.
// inbound.mjs importeert uit dezelfde module, maar uitsluitend fetchInboundEmail: dat is de
// binnenkomende kant en heeft met de uitgaande grens niets te maken.
const TRANSPORT_ALLOWED = ['server/comm/providers/email.mjs', 'server/comm/resend.mjs'];

// preview-seed.mjs schrijft demonstratiehistorie rechtstreeks in de database, inclusief eerdere
// uitgaande berichten. Dat is geen verzending: er komt geen transport, geen provider en geen
// consent-beslissing aan te pas, en het hele bestand staat achter PREVIEW_SEED. De test bewaakt
// hieronder dat die uitzondering ook werkelijk niets verstuurt.
const OUTBOUND_WRITE_ALLOWED = ['server/comm/send.mjs', 'server/comm/preview-seed.mjs'];

test('geen enkele module buiten de e-mailprovider roept de vendor-transport rechtstreeks aan', async () => {
  const files = await walk(join(ROOT, 'server'));
  const offenders = [];
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1);
    if (TRANSPORT_ALLOWED.includes(rel)) continue;
    const src = await readFile(f, 'utf8');
    if (/\bsendThreadedEmail\s*\(/.test(src)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], 'uitgaande post hoort uitsluitend via sendOnChannel en de provider-registry te lopen');
});

test('geen enkele route schrijft zelf een OUTBOUND-bericht weg', async () => {
  // Een module die zelf een OUTBOUND-rij invoegt, omzeilt daarmee de gate erboven. Alleen send.mjs
  // mag dat, want dat is de weg die de gate zelf draagt.
  const files = await walk(join(ROOT, 'server'));
  const offenders = [];
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1);
    if (OUTBOUND_WRITE_ALLOWED.includes(rel)) continue;
    const src = await readFile(f, 'utf8');
    if (/insert into message\b[\s\S]{0,400}?'OUTBOUND'/.test(src)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], 'alleen send.mjs mag een uitgaand bericht vastleggen');
});

test('de verwijderde tweede weg is niet teruggekomen', async () => {
  const files = await walk(join(ROOT, 'server'));
  const offenders = [];
  for (const f of files) {
    const src = await readFile(f, 'utf8');
    if (/export\s+(async\s+)?function\s+sendReply\b/.test(src)) offenders.push(f.slice(ROOT.length + 1));
  }
  assert.deepEqual(offenders, [], 'sendReply() sloeg consent en handtekening over en mag niet terugkeren');
});

test('sendOnChannel is de enige uitgaande weg die de routes gebruiken', async () => {
  for (const rel of ['server/comm/routes.mjs', 'server/cockpit/routes.mjs']) {
    const src = await readFile(join(ROOT, rel), 'utf8');
    assert.match(src, /import \{ sendOnChannel \}/, `${rel} gebruikt de gedeelde uitgaande weg`);
  }
});

// ---- gedragsmatig: de gate weigert werkelijk ------------------------------------------------
const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');

test('zonder toestemming verstuurt sendOnChannel niets en laat het niets achter',
  { skip: HAS_DB ? false : 'no DATABASE_URL — gedragstest overgeslagen' }, async () => {
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { sendOnChannel } = await import('../server/comm/send.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, communication_preference cascade');
      const tenantId = await getDefaultTenantId();
      const ct = (await query(
        "insert into contact(tenant_id, identity_key, first_name, last_name, email) values ($1,'grens@voorbeeld.nl','Test','Grens','grens@voorbeeld.nl') returning id",
        [tenantId])).rows[0];
      // WHATSAPP vereist een expliciete opt-in. Zonder die opt-in hoort de gate dicht te zitten.
      const r = await sendOnChannel({ tenantId, contactId: ct.id, channel: 'WHATSAPP', text: 'hallo' });
      assert.equal(r.ok, false, 'de gate weigert');
      assert.equal(r.reason, 'consent_blocked', 'en zegt waarom');
      const n = Number((await query("select count(*)::int n from message where direction='OUTBOUND'")).rows[0].n);
      assert.equal(n, 0, 'een geweigerde verzending laat geen bericht achter');
    } finally {
      await closePool();
    }
  });

test('de seed-uitzondering verstuurt aantoonbaar niets', async () => {
  const src = await readFile(join(ROOT, 'server/comm/preview-seed.mjs'), 'utf8');
  assert.doesNotMatch(src, /sendOnChannel|sendThreadedEmail|getChannelProvider/,
    'de previewseed schrijft alleen historie en raakt geen enkele verzendweg aan');
  assert.match(src, /PREVIEW_SEED/, 'en staat achter zijn eigen vlag');
});

// ---- privacygrens: de Cockpit signaleert, maar toont nooit inhoud ----------------------------
test('het privacysignaal draagt uitsluitend een telling en een ouderdom',
  { skip: HAS_DB ? false : 'no DATABASE_URL — privacytest overgeslagen' }, async () => {
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { privacyAttention } = await import('../server/comm/inbox.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, mailbox cascade');
      const tenantId = await getDefaultTenantId();
      const leeg = await privacyAttention(tenantId);
      assert.equal(leeg.open, 0, 'zonder verzoek geen signaal');
      assert.equal(leeg.oldestDays, null);

      await query(
        `insert into conversation(tenant_id, subject, status, channel, is_privacy, last_message_at)
         values ($1, 'Verzoek om inzage in mijn gegevens', 'NEW', 'EMAIL', true, now() - interval '9 days')`,
        [tenantId]);
      const p = await privacyAttention(tenantId);
      assert.equal(p.open, 1, 'het verzoek wordt geteld');
      assert.equal(p.oldestDays, 9, 'en de ouderdom klopt');

      // De vorm zelf is de garantie: er is geen veld waarin inhoud zou kunnen zitten.
      assert.deepEqual(Object.keys(p).sort(), ['oldestAt', 'oldestDays', 'open']);
      assert.doesNotMatch(JSON.stringify(p), /inzage|gegevens|subject/i, 'geen spoor van het onderwerp');
    } finally {
      await closePool();
    }
  });
