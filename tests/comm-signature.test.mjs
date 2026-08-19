// Communication Layer — Maculis email signature (no DB needed; pure rendering + safety).
//
// Two kinds of assertions live here and they are deliberately separated:
//   1. CONTRACTS that must survive any redesign — exactly once, idempotent, no invented contact
//      data, no tracking, clean AI context, intact plain-text fallback.
//   2. PRESENTATION of the approved design ("het signatuurmoment", ontwerp 1 + variant 2). These
//      pin down the things a careless edit would silently break: the static fallback route, real
//      text staying text, no remote fonts, no animation in CSS, identical URLs for every recipient.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapEmail, renderSignatureHtml, renderSignatureText, signatureConfig, stripForContext, SIG_MARKER, SIG_TEXT_DELIM } from '../server/comm/signature.mjs';

const from = 'hello@maculis.nl';

// ---- contracts -------------------------------------------------------------------------------

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

test('role and location are omitted unless configured — never a placeholder, never invented', () => {
  const cfg = signatureConfig({ fromAddress: from });
  assert.equal(cfg.role, '', 'no role configured by default');
  assert.equal(cfg.location, '', 'no location configured by default');
  const html = renderSignatureHtml(cfg);
  assert.ok(!/text-transform:uppercase/.test(html), 'no empty role line rendered');
  assert.ok(!/maculis-icon-pin/.test(html), 'no location row, so no location icon');
  // When they ARE configured they appear in both html and text, from config only.
  const filled = { ...cfg, role: 'Founder & Steward', location: 'Voorburg, Nederland' };
  const html2 = renderSignatureHtml(filled);
  assert.ok(html2.includes('Founder &amp; Steward') && html2.includes('Voorburg, Nederland'), 'configured values render');
  assert.ok(renderSignatureText(filled).includes('Founder & Steward'), 'role also in plain text');
});

test('order is name → contact → brand → payoff, and the visible hierarchy holds', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  const iName = html.indexOf('Ludwig van der Kuijl');
  const iMail = html.indexOf('mailto:hello@maculis.nl');
  const iWordmark = html.indexOf('maculis-wordmark');
  const iPayoff = html.indexOf('Kijk nog eens.');
  assert.ok(iName >= 0 && iMail > iName && iWordmark > iMail && iPayoff > iWordmark, 'reading order preserved');
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
  assert.ok(html.includes('maculis-seal-perceive-v1.gif'), 'approved motion asset referenced');
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
  assert.ok(!/<script>evil/.test(html), 'script tag escaped');
  assert.ok(/&lt;script&gt;/.test(html), 'body html-escaped');
  assert.ok(/&amp;/.test(html), 'ampersand escaped');
});

test('configured signature values are escaped, never injected raw', () => {
  const cfg = { ...signatureConfig({ fromAddress: from }), name: '<img src=x onerror=alert(1)>', payoff: 'A & B' };
  const html = renderSignatureHtml(cfg);
  assert.ok(!/<img src=x/.test(html), 'no live tag from config');
  assert.ok(/&lt;img src=x onerror=alert\(1\)&gt;/.test(html), 'config value fully escaped');
  assert.ok(/A &amp; B/.test(html), 'ampersand in payoff escaped');
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

test('the html signature never reaches the AI context, presentation and all', () => {
  const { html } = wrapEmail({ bodyText: 'Korte vraag.', fromAddress: from });
  const clean = stripForContext(html);
  assert.ok(/Korte vraag/.test(clean), 'body kept');
  for (const leak of ['maculis-seal-perceive', 'prefers-reduced-motion', 'data-ogsc', 'mac-ink']) {
    assert.ok(!clean.includes(leak), `presentation detail "${leak}" excluded from AI context`);
  }
});

// ---- presentation of the approved design -------------------------------------------------------

test('the static route is complete: reduced motion and first frame land on the same still image', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  assert.ok(/<picture>/.test(html), 'picture element present');
  assert.ok(/<source media="\(prefers-reduced-motion: reduce\)" srcset="[^"]+maculis-seal-rest-v1\.png">/.test(html),
    'reduced-motion route points at the static png');
  assert.ok(/<img src="[^"]+maculis-seal-perceive-v1\.gif"/.test(html), 'the img stays the gif for clients without picture');
  // Everything the recipient needs is present without any image loading at all.
  const noImages = html.replace(/<img[^>]*>/g, '').replace(/<source[^>]*>/g, '');
  for (const must of ['Ludwig van der Kuijl', 'hello@maculis.nl', 'maculis.nl', 'Kijk nog eens.']) {
    assert.ok(noImages.includes(must), `"${must}" survives with images disabled`);
  }
});

test('motion carries no information: nothing in the copy or alt text mentions it', () => {
  const cfg = signatureConfig({ fromAddress: from });
  const html = renderSignatureHtml(cfg);
  const alts = [...html.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(alts.length >= 4, 'every image has an explicit alt attribute');
  for (const a of alts) assert.ok(!/beweg|animat|blink|knipoog|sparkle|glow/i.test(a), `alt text "${a}" says nothing about motion`);
  assert.ok(alts.includes('Maculis'), 'the wordmark carries the brand name for images-off readers');
  assert.ok(!/beweg|animat/i.test(renderSignatureText(cfg)), 'plain text never imitates the animation');
});

test('real text stays real text — the name, payoff and contact are never images', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  const outsideImages = html.replace(/<img[^>]*>/g, '');
  for (const must of ['Ludwig van der Kuijl', 'Kijk nog eens.', 'hello@maculis.nl', 'maculis.nl']) {
    assert.ok(outsideImages.includes(must), `"${must}" is live text, not an image`);
  }
});

test('no remote fonts and no CSS animation', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  assert.ok(!/fonts\.googleapis|fonts\.gstatic|@font-face|@import/i.test(html), 'no remote or embedded webfont');
  assert.ok(!/@keyframes|animation:|transition:|transform:/i.test(html), 'no CSS animation next to the gif');
  assert.ok(/Georgia,'Times New Roman',Times,serif/.test(html), 'canonical serif fallback stack');
});

test('assets are untrackable: same host, no query string, identical for every recipient', () => {
  const a = renderSignatureHtml(signatureConfig({ fromAddress: 'hello@maculis.nl' }));
  const b = renderSignatureHtml(signatureConfig({ fromAddress: 'privacy@maculis.nl' }));
  const urlsOf = (html) => [...html.matchAll(/(?:src|srcset)="([^"]+)"/g)].map((m) => m[1]);
  const urls = urlsOf(a);
  assert.ok(urls.length >= 6, 'all assets found');
  assert.deepEqual(urls, urlsOf(b), 'asset urls do not vary per sender or recipient');
  for (const u of urls) {
    assert.ok(u.startsWith('https://'), `absolute https url: ${u}`);
    assert.ok(!u.includes('?') && !u.includes('#'), `no query string or fragment (cache busting / tracking): ${u}`);
    assert.ok(/\/brand\/maculis-[a-z-]+-v1\.(gif|png)$/.test(u), `version-locked static asset path: ${u}`);
  }
  // A tracking pixel would be a 1x1 image; every image here has real dimensions.
  assert.ok(!/width="1"|height="1"/.test(a), 'no 1x1 tracking pixel');
});

test('images are 2x sources shown at 1x, with explicit dimensions for HiDPI and images-off layout', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    assert.ok(/width="\d+"/.test(m[0]) && /height="\d+"/.test(m[0]), `explicit width and height: ${m[0].slice(0, 60)}`);
    assert.ok(/style="[^"]*display:block/.test(m[0]), 'display:block to avoid the descender gap');
    assert.ok(/border:0/.test(m[0]), 'no link border in older clients');
  }
  assert.ok(/width="150" height="150"[^>]*width:150px;height:150px/.test(html), 'the 300px seal is shown at 150px');
});

test('dark mode overrides exist and are scoped to the signature only', () => {
  const html = renderSignatureHtml(signatureConfig({ fromAddress: from }));
  assert.ok(/\[data-ogsc\] \.mac-ink,\[data-ogsb\] \.mac-ink\{background-color:#0a0b10 !important\}/.test(html), 'ink ground restored');
  for (const rule of html.matchAll(/\[data-ogs[cb]\]([^{]*)\{/g)) {
    assert.ok(rule[1].includes('.mac-'), `dark-mode rule stays inside the signature: ${rule[0]}`);
  }
  assert.ok(!/:root|body\s*\{|\*\s*\{/.test(html), 'never styles the surrounding message');
});

test('rendering is deterministic — two sends produce byte-identical signature html', () => {
  const one = wrapEmail({ bodyText: 'Zelfde bericht.', fromAddress: from }).html;
  const two = wrapEmail({ bodyText: 'Zelfde bericht.', fromAddress: from }).html;
  assert.equal(one, two, 'no timestamps, ids or random values in the signature');
});
