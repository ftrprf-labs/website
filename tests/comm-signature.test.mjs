// Communication Layer — Living Maculis email signature (no DB needed; pure rendering + safety).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapEmail, renderSignatureHtml, renderSignatureText, signatureConfig, stripForContext, SIG_MARKER, SIG_TEXT_DELIM } from '../server/comm/signature.mjs';

const from = 'hello@maculis.nl';

test('signature carries only canonical data — no invented surname/title/phone/social', () => {
  const cfg = signatureConfig({ fromAddress: from });
  const html = renderSignatureHtml(cfg); const text = renderSignatureText(cfg);
  for (const s of [html, text]) {
    assert.ok(/Maculis/.test(s));
    assert.ok(/Zag je dat\?/.test(s), 'payoff present');
    assert.ok(/maculis\.nl/.test(s), 'canonical website present');
    assert.ok(!/\+?\d[\d ()-]{7,}/.test(s), 'no invented phone number');
    assert.ok(!/linkedin|instagram|twitter|x\.com|facebook/i.test(s), 'no invented social');
  }
  // email is the real sending address, not invented.
  assert.ok(html.includes('hello@maculis.nl'));
});

test('unset sender name is omitted, never guessed', () => {
  // SENDER_FIRST_NAME is unset in tests → name omitted; brand identity still present.
  const cfg = signatureConfig({ fromAddress: from });
  assert.equal(cfg.name, '');
  const html = renderSignatureHtml(cfg);
  assert.ok(/>Maculis</.test(html), 'falls back to the Maculis identity, no fabricated person name');
});

test('wrapEmail adds the signature EXACTLY ONCE (html marker + text delimiter)', () => {
  const { text, html } = wrapEmail({ bodyText: 'Hoi Kim,\n\nDank je.', fromAddress: from });
  assert.equal((html.match(new RegExp(SIG_MARKER, 'g')) || []).length, 1, 'one html signature');
  assert.equal((text.match(/\n-- \n/g) || []).length, 1, 'one text signature delimiter');
  assert.ok(text.startsWith('Hoi Kim,'), 'body preserved');
  assert.ok(html.includes('maculis-eye.gif'), 'blink asset referenced');
  assert.ok(html.includes('alt="Maculis'), 'accessible alt text');
});

test('wrapEmail is idempotent — re-wrapping never doubles the signature', () => {
  const once = wrapEmail({ bodyText: 'Hallo', fromAddress: from });
  const twice = wrapEmail({ bodyText: once.text, bodyHtml: once.html, fromAddress: from });
  assert.equal((twice.html.match(new RegExp(SIG_MARKER, 'g')) || []).length, 1, 'still one html signature');
  assert.equal((twice.text.match(/\n-- \n/g) || []).length, 1, 'still one text delimiter');
});

test('a plain-text body is turned into safe HTML (no injection)', () => {
  const { html } = wrapEmail({ bodyText: 'Kijk <script>evil()</script> & "quotes"', fromAddress: from });
  assert.ok(!/<script>/.test(html), 'script tag escaped');
  assert.ok(/&lt;script&gt;/.test(html), 'body html-escaped');
  assert.ok(/&amp;/.test(html), 'ampersand escaped');
});

test('stripForContext removes our signature and quoted history for the AI', () => {
  const inbound = 'Bedankt, dat is duidelijk!\n\nOp 15 aug 2026 schreef Maculis <hello@maculis.nl>:\n> Dank je voor je bericht.\n> -- \n> Maculis\n> Zag je dat?';
  const clean = stripForContext(inbound);
  assert.ok(/Bedankt, dat is duidelijk/.test(clean), 'keeps the real reply');
  assert.ok(!/Zag je dat/.test(clean), 'drops our quoted signature');
  assert.ok(!/schreef Maculis/.test(clean), 'drops the quote header');
  assert.ok(!/>/.test(clean), 'drops quoted lines');
  // our own outbound signature block is stripped too
  const withSig = 'Hoi,\n\nTot snel.' + SIG_TEXT_DELIM + 'Maculis\nZag je dat?\nhello@maculis.nl';
  const cleaned2 = stripForContext(withSig);
  assert.ok(!/Zag je dat/.test(cleaned2) && /Tot snel/.test(cleaned2), 'our signature excluded, content kept');
});
