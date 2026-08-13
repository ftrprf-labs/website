// Unit tests for the Invitation Manager core logic.
// Run with: npm test   (uses Node's built-in test runner)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateToken, personalUrl } from '../server/tokens.mjs';
import { isValidEmail, isValidMobile, cleanDomain, validateRow } from '../server/validation.mjs';
import { parseCsv, autoMap } from '../server/import.mjs';
import { render, waNumber, buildWhatsApp } from '../server/messages.mjs';

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

test('waNumber is digits-only, no plus/spaces', () => {
  assert.equal(waNumber('+31 6 12345678'), '31612345678');
  assert.equal(waNumber('06-23 45 67 89'), '0623456789');
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
