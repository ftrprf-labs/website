// Communication Layer — Living Maculis email signature (no DB needed; pure rendering + safety).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapEmail, renderSignatureHtml, renderSignatureText, signatureConfig, stripForContext, SIG_MARKER, SIG_TEXT_DELIM } from '../server/comm/signature.mjs';

const from = 'hello@maculis.nl';

test('signature carries only the canonical, authorised content — no corporate ballast', () => {
  const cfg = signatureConfig({ fromAddress: from });
  const html = renderSignatureHtml(cfg); const text = renderSignatureText(cfg);
  for (const s of [html, text]) {
    assert.ok(/Maculis/.test(s));
    assert.ok(/Kijk nog eens\./.test(s), 'definitive tagline present');
    assert.ok(!/Zag je dat/.test(s), 'old tagline removed');
    assert.ok(/maculis\.nl/.test(s), 'canonical website present');
    assert.ok(!/\+?\d[\d ()-]{7,}/.test(s), 'no phone number');
    assert.ok(!/linkedin|instagram|twitter|x\.com|facebook/i.test(s), 'no social icons');
    assert.ok(!/disclaimer|vertrouwelijk|confidential/i.test(s), 'no disclaimer ballast');
  }
  // canonical personal name + real sending address, nothing invented.
  assert.ok(cfg.name === 'Ludwig van der Kuijl', 'definitive full name');
  assert.ok(html.includes('Ludwig van der Kuijl'), 'name rendered');
  assert.ok(html.includes('hello@maculis.nl'), 'real sending address');
});

test('brand line reads exactly "Maculis · Kijk nog eens." and order is name → brand → contact', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  // Visible-text hierarchy: the name comes before the brand line, which comes before the contact.
  // (Maculis also appears in the image alt text, so anchor the brand line on the "· Kijk nog eens."
  // tagline that only exists in the visible brand line.)
  const iName = html.indexOf('Ludwig van der Kuijl');
  const iBrandLine = html.indexOf('· Kijk nog eens.');
  const iMail = html.indexOf('mailto:hello@maculis.nl');
  assert.ok(iName >= 0 && iBrandLine > iName && iMail > iBrandLine, 'vertical hierarchy preserved');
  // the brand + tagline compose the exact merkregel content, in order, on one line.
  assert.ok(/Maculis\b[\s\S]{0,120}·[\s\S]{0,60}Kijk nog eens\./.test(html.slice(iName)), 'exact merkregel');
});

test('an explicitly empty sender name still falls back to the Maculis identity, never a fabricated one', () => {
  const cfg = { ...signatureConfig({ fromAddress: from }), name: '' };
  const html = renderSignatureHtml(cfg);
  assert.ok(/>Maculis</.test(html), 'falls back to the Maculis identity, no fabricated person name');
});

test('mailto + website links are correct', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  assert.ok(/href="mailto:hello@maculis\.nl"/.test(html), 'correct mailto link');
  assert.ok(/href="https:\/\/maculis\.nl"/.test(html), 'correct https website link');
});

test('wrapEmail adds the signature EXACTLY ONCE (html marker + text delimiter)', () => {
  const { text, html } = wrapEmail({ bodyText: 'Hoi Kim,\n\nDank je.', fromAddress: from });
  assert.equal((html.match(new RegExp(SIG_MARKER, 'g')) || []).length, 1, 'one html signature');
  assert.equal((text.match(/\n-- \n/g) || []).length, 1, 'one text signature delimiter');
  assert.ok(text.startsWith('Hoi Kim,'), 'body preserved');
  assert.ok(html.includes('maculis-eye.gif'), 'blink asset referenced');
  assert.ok(html.includes('alt="Maculis'), 'accessible alt text');
  // plain-text fallback falls back logically to name / brand line / contact.
  assert.ok(/Ludwig van der Kuijl\nMaculis\nKijk nog eens\.\nhello@maculis\.nl\nmaculis\.nl/.test(text), 'plain-text fallback content');
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
