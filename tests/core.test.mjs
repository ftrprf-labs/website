// Unit tests for the Invitation Manager core logic.
// Run with: npm test   (uses Node's built-in test runner)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateToken, personalUrl } from '../server/tokens.mjs';
import { isValidEmail, isValidMobile, cleanDomain, validateRow } from '../server/validation.mjs';
import { parseCsv, autoMap } from '../server/import.mjs';
import { render, waNumber, buildWhatsApp, buildEmail } from '../server/messages.mjs';

test('tokens are opaque, high-entropy and unique', () => {
  const a = generateToken();
  const b = generateToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40, 'token should be long');
  assert.match(a, /^[A-Za-z0-9_-]+$/, 'token must be url-safe base64url');
});

test('personal url contains only the token, no PII', () => {
  const url = personalUrl('https://maculis.example', 'TOKEN123');
  assert.equal(url, 'https://maculis.example/?p=TOKEN123');
  assert.ok(!/edwin|@|company/i.test(url));
});

test('email validation', () => {
  assert.ok(isValidEmail('edwin@vriesinterieur.nl'));
  assert.ok(!isValidEmail('tom@'));
  assert.ok(!isValidEmail('nora(at)peeters.be'));
  assert.ok(!isValidEmail(''));
});

test('mobile validation accepts intl + local, rejects junk', () => {
  assert.ok(isValidMobile('+31 6 12345678'));
  assert.ok(isValidMobile('0623456789'));
  assert.ok(isValidMobile('0032478123456'));
  assert.ok(!isValidMobile('123'));
  assert.ok(!isValidMobile('abc'));
});

test('domain cleaning strips scheme/www/path', () => {
  assert.equal(cleanDomain('https://www.vriesinterieur.nl'), 'vriesinterieur.nl');
  assert.equal(cleanDomain('http://amrani-tt.be/afspraak'), 'amrani-tt.be');
  assert.equal(cleanDomain('bakkeradvies.nl'), 'bakkeradvies.nl');
});

test('validateRow flags invalid + missing contact', () => {
  const bad = validateRow({ first_name: 'Tom', email: 'tom@', mobile: '123' });
  assert.ok(bad.errors.length >= 1);
  const good = validateRow({ first_name: 'Edwin', email: 'edwin@x.nl', mobile: '+31612345678' });
  assert.equal(good.errors.length, 0);
});

test('CSV parser handles comma + semicolon + quotes', () => {
  const comma = parseCsv('a,b,c\n1,2,3');
  assert.deepEqual(comma, [['a', 'b', 'c'], ['1', '2', '3']]);
  const semi = parseCsv('a;b;c\n1;2;3');
  assert.deepEqual(semi, [['a', 'b', 'c'], ['1', '2', '3']]);
  const quoted = parseCsv('name,note\n"Vries, Interieur","zegt ""hoi"""');
  assert.deepEqual(quoted, [['name', 'note'], ['Vries, Interieur', 'zegt "hoi"']]);
});

test('autoMap recognises NL + EN headers', () => {
  const m = autoMap(['Voornaam', 'Achternaam', 'Bedrijfsnaam', 'E-mailadres', 'Mobiel nummer', 'Website']);
  assert.deepEqual(m, {
    0: 'first_name', 1: 'last_name', 2: 'company_name', 3: 'email', 4: 'mobile', 5: 'domain',
  });
});

test('message rendering fills placeholders, no leftover PII in url', () => {
  const rec = { first_name: 'Edwin', company_name: 'Vries', domain: 'vries.nl', token: 'TOK', mobile: '+31612345678' };
  const text = render('Hoi {first_name}, link: {personal_url}', rec);
  assert.ok(text.includes('Hoi Edwin'));
  assert.ok(text.includes('/?p=TOK'));
});

test('waNumber normalises every NL notation to one intl recipient (31…), fail-closed on junk', () => {
  // The bug: 06… national numbers reached wa.me verbatim (wa.me/0629538336),
  // which WhatsApp rejects. Every Dutch input form must land on 31629538336.
  const CANON = '31629538336';
  assert.equal(waNumber('0629538336'), CANON);          // plain national
  assert.equal(waNumber('06 29 53 83 36'), CANON);      // national + spaces
  assert.equal(waNumber('06-29538336'), CANON);         // national + dash
  assert.equal(waNumber('(06) 29538336'), CANON);       // national + parens
  assert.equal(waNumber('+31629538336'), CANON);        // international +31
  assert.equal(waNumber('+31 6 29 53 83 36'), CANON);   // +31 with spaces
  assert.equal(waNumber('0031629538336'), CANON);       // 0031 prefix
  assert.equal(waNumber('0031 6 29 53 83 36'), CANON);  // 0031 with spaces
  assert.equal(waNumber('31629538336'), CANON);         // already international
  // Regression: the older sample number, all forms → one recipient.
  assert.equal(waNumber('+31 6 12345678'), '31612345678');
  assert.equal(waNumber('06-12 34 56 78'), '31612345678');
  // Fail-closed: implausible/ambiguous input yields '' (no broken wa.me link).
  assert.equal(waNumber(''), '');
  assert.equal(waNumber('abc'), '');
  assert.equal(waNumber('06123'), '');                  // far too short
  assert.equal(waNumber('0'), '');
  assert.equal(waNumber('++31'), '');
});

test('name normalization: person names — capitalise first letter, preserve compound', async () => {
  const { normalizePersonName, normalizeCompany } = await import('../server/normalize.mjs');
  assert.equal(normalizePersonName('edwin'), 'Edwin');
  assert.equal(normalizePersonName('EDWIN'), 'Edwin');
  assert.equal(normalizePersonName('eDWIN'), 'Edwin');
  assert.equal(normalizePersonName('pavert'), 'Pavert');
  assert.equal(normalizePersonName('PAVERT'), 'Pavert');
  assert.equal(normalizePersonName('van de Pavert'), 'Van de Pavert');
  assert.equal(normalizePersonName('de Vries'), 'De Vries');
  assert.equal(normalizePersonName('  edwin   '), 'Edwin');
  assert.equal(normalizePersonName(''), '');
  // brand-safe company rule (only lift a fully-lowercase first word)
  assert.equal(normalizeCompany('maculis'), 'Maculis');
  assert.equal(normalizeCompany('maculis labs'), 'Maculis labs');
  assert.equal(normalizeCompany('maculis AI'), 'Maculis AI');
  assert.equal(normalizeCompany('ftrprf labs'), 'Ftrprf labs');
  assert.equal(normalizeCompany('AI Labs'), 'AI Labs');
  assert.equal(normalizeCompany('FTRLABS'), 'FTRLABS');
  assert.equal(normalizeCompany('McKinsey'), 'McKinsey');
  assert.equal(normalizeCompany('iDEAL'), 'iDEAL');
  // brand allow-list (§11)
  assert.equal(normalizeCompany('MACULIS'), 'Maculis');
  assert.equal(normalizeCompany('MACULIS AI'), 'Maculis AI');
  assert.equal(normalizeCompany('maculis'), 'Maculis');
  assert.equal(normalizeCompany('ftrlabs'), 'FTRLABS');
});

test('consent: default UNKNOWN, setConsent + isOptedOut, independent of lifecycle', async () => {
  const store = await import('../server/store.mjs');
  const { config } = await import('../server/config.mjs');
  const { mkdtempSync } = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = mkdtempSync(path.join(os.tmpdir(), 'im-consent-'));
  const prevDb = config.dbFile, prevDir = config.dataDir;
  config.dataDir = dir; config.dbFile = path.join(dir, 'db.json');
  store._resetForTests();
  try {
    const inv = store.createInvitation({ first_name: 'test', email: 'a@b.example' });
    assert.equal(inv.consent_status, 'UNKNOWN');          // new tester → UNKNOWN
    assert.equal(store.isOptedOut(inv.id), false);        // UNKNOWN is not opted-out
    const upd = store.setConsent(inv.id, 'OPTED_OUT');
    assert.equal(upd.consent_status, 'OPTED_OUT');
    assert.ok(upd.consent_at);
    assert.equal(upd.status, 'DRAFT');                    // consent never touches lifecycle
    assert.equal(store.isOptedOut(inv.id), true);
    assert.deepEqual(store.CONSENT, ['UNKNOWN', 'OPTED_IN', 'OPTED_OUT']);
    assert.throws(() => store.setConsent(inv.id, 'MAYBE'));
  } finally {
    config.dbFile = prevDb; config.dataDir = prevDir; store._resetForTests();
  }
});

test('history + provenance: append-only, source, migration-safe, no auto-status', async () => {
  const store = await import('../server/store.mjs');
  const { config } = await import('../server/config.mjs');
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = mkdtempSync(path.join(os.tmpdir(), 'im-history-'));
  const prevDb = config.dbFile, prevDir = config.dataDir;
  config.dataDir = dir; config.dbFile = path.join(dir, 'db.json');
  store._resetForTests();
  const evOf = (rec) => rec.history.map((h) => h.event);
  try {
    // 1. new tester → history has tester_created + source provenance
    const inv = store.createInvitation({ first_name: 'test', email: 'a@b.example', source: 'manual' });
    assert.deepEqual(evOf(inv), ['tester_created']);
    assert.equal(inv.source, 'manual');
    assert.equal(inv.history[0].channel, undefined);   // creation is not an outbound action
    assert.equal(inv.history[0].result, undefined);
    assert.ok(inv.history[0].at);

    // provenance defaults to 'manual' when an unknown/absent source is passed
    assert.equal(store.createInvitation({ first_name: 'x', email: 'x@y.example' }).source, 'manual');
    assert.equal(store.createInvitation({ first_name: 'y', email: 'y@y.example', source: 'HACK' }).source, 'manual');
    // reserved future source is accepted but no intake is built in Step 3
    assert.equal(store.createInvitation({ first_name: 'z', email: 'z@y.example', source: 'pass_the_lens' }).source, 'pass_the_lens');

    // 2-6. channel/result events append with the right shape
    let r = store.addEvent(inv.id, 'invitation_sent', { channel: 'whatsapp', result: 'success' });
    assert.deepEqual(r.history.at(-1), { at: r.history.at(-1).at, event: 'invitation_sent', channel: 'whatsapp', result: 'success' });
    store.addEvent(inv.id, 'invitation_sent', { channel: 'email', result: 'success' });
    store.addEvent(inv.id, 'invitation_failed', { channel: 'email', result: 'failed' });
    store.addEvent(inv.id, 'invitation_skipped', { channel: 'email', result: 'skipped' });
    store.addEvent(inv.id, 'invitation_blocked', { channel: 'whatsapp', result: 'blocked' });

    // 7. re-invitation: BOTH invitation_sent entries survive (append-only, brief §9)
    const sent = store.getHistory(inv.id).history.filter((h) => h.event === 'invitation_sent');
    assert.equal(sent.length, 2);
    assert.deepEqual(sent.map((h) => h.channel), ['whatsapp', 'email']);

    // 8. first consent records consent_recorded; a later change records consent_changed;
    //    neither touches lifecycle (§20)
    const c = store.setConsent(inv.id, 'OPTED_OUT', { source: 'pass_the_lens' });
    assert.equal(c.status, 'DRAFT');                     // history/consent never drive lifecycle
    assert.equal(c.history.at(-1).event, 'consent_recorded');   // first consent on this record
    assert.equal(c.history.at(-1).result, 'opted_out');
    assert.equal(c.history.at(-1).source, 'pass_the_lens');     // provenance on the event
    assert.equal(c.consent_source, 'pass_the_lens');
    const c2 = store.setConsent(inv.id, 'OPTED_IN');
    assert.equal(c2.history.at(-1).event, 'consent_changed');   // subsequent change

    // 9. publish event
    assert.equal(store.addEvent(inv.id, 'published_to_maculis', { result: 'success' }).history.at(-1).event, 'published_to_maculis');

    // idempotent Maculis milestones: recorded once even when observed repeatedly
    store.recordEventOnce(inv.id, 'journey_started', { at: '2026-08-13T10:00:00.000Z' });
    store.recordEventOnce(inv.id, 'journey_started', { at: '2026-08-13T11:00:00.000Z' });
    assert.equal(store.getHistory(inv.id).history.filter((h) => h.event === 'journey_started').length, 1);

    // unknown event names are rejected (defends the vocabulary)
    assert.throws(() => store.addEvent(inv.id, 'nonsense_event', {}));

    // 10. legacy record without history/source is migrated non-destructively
    const legacy = {
      id: 'LEGACY1', token: 'legacytok', first_name: 'Oud', last_name: 'Record',
      company_name: 'Bestaand BV', email: 'oud@record.example', mobile: '', domain: '',
      campaign: 'X', status: 'INVITED', consent_status: 'OPTED_IN', consent_at: '2026-01-01T00:00:00.000Z',
      notes: 'behouden', created_at: '2026-01-01T00:00:00.000Z', invited_at: '2026-01-02T00:00:00.000Z',
      started_at: null, completed_at: null,
      // NB: no `history`, no `source`
    };
    writeFileSync(config.dbFile, JSON.stringify({ invitations: [legacy], template: {}, version: 1 }, null, 2), 'utf8');
    store._resetForTests();
    const migrated = store.getInvitation('LEGACY1');
    assert.deepEqual(migrated.history, []);              // empty, NOT back-filled with fake events
    assert.equal(migrated.source, 'unknown');            // no invented provenance (§16)
    assert.equal(migrated.notes, 'behouden');            // existing fields intact
    assert.equal(migrated.status, 'INVITED');
    assert.equal(migrated.consent_status, 'OPTED_IN');

    assert.deepEqual(store.SOURCES, ['manual', 'csv', 'xlsx', 'import', 'pass_the_lens', 'unknown']);
  } finally {
    config.dbFile = prevDb; config.dataDir = prevDir; store._resetForTests();
  }
});

test('fail-closed: mayContact only OPTED_IN; declined maps to no consent', async () => {
  const store = await import('../server/store.mjs');
  const { config } = await import('../server/config.mjs');
  const { deriveByToken } = await import('../server/maculis-sessions.mjs');
  const { mkdtempSync } = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = mkdtempSync(path.join(os.tmpdir(), 'im-fc-'));
  const prevDb = config.dbFile, prevDir = config.dataDir;
  config.dataDir = dir; config.dbFile = path.join(dir, 'db.json');
  store._resetForTests();
  try {
    const inv = store.createInvitation({ first_name: 'una', email: 'una@b.example' });
    // Fail-closed: UNKNOWN and OPTED_OUT block contact; only OPTED_IN allows it.
    assert.equal(store.mayContact(inv.id), false);              // UNKNOWN
    store.setConsent(inv.id, 'OPTED_OUT', { source: 'manual', note: 'x' });
    assert.equal(store.mayContact(inv.id), false);              // OPTED_OUT
    store.setConsent(inv.id, 'OPTED_IN', { source: 'manual', note: 'akkoord' });
    assert.equal(store.mayContact(inv.id), true);               // OPTED_IN
    assert.equal(store.getInvitation(inv.id).consent_note, 'akkoord');

    // Pull mapping: opt_in → OPTED_IN; "Nog niet" (declined) → no consent signal.
    const optIn = deriveByToken([{ participant: 'TOK1', inner_circle_opt_in: true, events: [{ name: 'inner_circle_opt_in' }] }]);
    assert.equal(optIn.get('TOK1').consent, 'OPTED_IN');
    const declined = deriveByToken([{ participant: 'TOK2', events: [{ name: 'recognition_answered', value: 'nee' }, { name: 'inner_circle_declined' }] }]);
    assert.equal(declined.get('TOK2').consent, null);           // stays UNKNOWN, never OPTED_OUT
    // A completed session without opt-in is never an implicit opt-in.
    const done = deriveByToken([{ participant: 'TOK3', events: [{ name: 'recognition_answered', value: 'ja' }, { name: 'session_completed' }] }]);
    assert.equal(done.get('TOK3').consent, null);
    assert.equal(done.get('TOK3').completed, true);
  } finally {
    config.dbFile = prevDb; config.dataDir = prevDir; store._resetForTests();
  }
});

test('buildEmail renders subject + body with the personal link, no PII in keys', () => {
  const rec = { first_name: 'Edwin', email: 'edwin@x.example', token: 'TOK' };
  const tpl = { emailSubject: 'Hoi {first_name}', emailBody: 'Link: {personal_url}' };
  const m = buildEmail(tpl, rec);
  assert.equal(m.to, 'edwin@x.example');
  assert.equal(m.subject, 'Hoi Edwin');
  assert.ok(m.body.includes('/?p=TOK'));
  assert.equal(m.hasEmail, true);
  assert.equal(buildEmail(tpl, { token: 'T' }).hasEmail, false);
});

test('mailer contract: only a real transport delivers; mock/unset never deliver', async () => {
  const { sendEmail, mailConfigured, mailDelivers } = await import('../server/mailer.mjs');
  const { config } = await import('../server/config.mjs');
  const prev = config.mailTransport, prevUrl = config.mailApiUrl;

  config.mailTransport = '';           // default: nothing configured
  assert.equal(mailConfigured(), false);
  assert.equal(mailDelivers(), false);
  assert.deepEqual(await sendEmail({ to: 'a@b.example', subject: 's', body: 'b' }), { ok: false, delivered: false, reason: 'not_configured' });

  config.mailTransport = 'mock';       // TEST transport — never delivers, never INVITED
  assert.equal(mailConfigured(), false, 'mock is not a delivering transport');
  const m = await sendEmail({ to: 'ok@b.example', subject: 's', body: 'b' });
  assert.equal(m.delivered, false, 'mock never delivers');
  assert.equal(m.reason, 'mock');
  assert.equal((await sendEmail({ to: 'bounce@b.example', subject: 's', body: 'b' })).delivered, false);
  assert.equal((await sendEmail({ to: '', subject: 's', body: 'b' })).reason, 'no_email');

  config.mailTransport = 'http';       // real transport requires a URL to deliver
  config.mailApiUrl = '';
  assert.equal(mailDelivers(), false);
  config.mailApiUrl = 'https://mail.example/send';
  assert.equal(mailDelivers(), true);

  config.mailTransport = prev; config.mailApiUrl = prevUrl;
});

test('mailer: resend transport needs key AND from; unconfigured never delivers (no network)', async () => {
  const { sendEmail, mailDelivers, mailConfigured } = await import('../server/mailer.mjs');
  const { config } = await import('../server/config.mjs');
  const prev = { t: config.mailTransport, k: config.mailApiKey, f: config.mailFrom };

  config.mailTransport = 'resend';
  config.mailApiKey = ''; config.mailFrom = '';
  assert.equal(mailDelivers(), false, 'no key/from → not a delivering transport');
  assert.equal(mailConfigured(), false);
  // Fail-closed: without credentials it returns not_configured WITHOUT a network call.
  assert.deepEqual(await sendEmail({ to: 'a@b.example', subject: 's', body: 'b' }), { ok: false, delivered: false, reason: 'not_configured' });

  config.mailApiKey = 'test_key'; config.mailFrom = 'Maculis <hi@maculis.example>';
  assert.equal(mailDelivers(), true, 'key + from → delivering transport');
  assert.equal(mailConfigured(), true);
  // An empty recipient is rejected before any transport work.
  assert.equal((await sendEmail({ to: '', subject: 's', body: 'b' })).reason, 'no_email');

  config.mailTransport = prev.t; config.mailApiKey = prev.k; config.mailFrom = prev.f;
});

test('public URL split: personal link uses MACULIS_PUBLIC_URL, message renders it', async () => {
  const { personalUrl } = await import('../server/tokens.mjs');
  const { render } = await import('../server/messages.mjs');
  const { config } = await import('../server/config.mjs');
  const prev = config.maculisPublicUrl;
  config.maculisPublicUrl = 'https://journey.example';
  try {
    // personalUrl is host-arg based (pure); render() must pull the PUBLIC url.
    assert.equal(personalUrl(config.maculisPublicUrl, 'TOK'), 'https://journey.example/?p=TOK');
    const text = render('link: {personal_url}', { first_name: 'x', token: 'TOK' });
    assert.equal(text, 'link: https://journey.example/?p=TOK');   // never the internal host, never localhost
  } finally {
    config.maculisPublicUrl = prev;
  }
});

test('buildWhatsApp yields a wa.me deep link with encoded text', () => {
  const rec = { first_name: 'Edwin', token: 'TOK', mobile: '+31612345678' };
  const wa = buildWhatsApp({ whatsapp: 'Hoi {first_name} {personal_url}' }, rec);
  assert.ok(wa.url.startsWith('https://wa.me/31612345678?text='));
  assert.ok(wa.hasNumber);
  const noNum = buildWhatsApp({ whatsapp: 'x' }, { token: 'T' });
  assert.ok(noNum.url.startsWith('https://wa.me/?text='));
  assert.equal(noNum.hasNumber, false);
});
