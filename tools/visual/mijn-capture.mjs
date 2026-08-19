// Visuele regressie-harness voor Mijn Maculis.
//
// Zelfstandig naast tools/visual/capture.mjs: die harness meet Cockpit-oppervlakken en
// mag door deze workstream niet veranderen. Mijn Maculis is een eigen kamer met een eigen
// regime, eigen routes en een eigen baseline.
//
//   node tools/visual/mijn-capture.mjs baseline   -> tools/visual/mijn-baseline/
//   node tools/visual/mijn-capture.mjs after      -> tools/visual/mijn-after/
//
// Determinisme: vaste viewports, vaste locale en tijdzone, fixtures met vaste tijdstempels,
// bevroren animaties, verborgen caret.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const MODE = process.argv[2] === 'after' ? 'after' : 'baseline';
const OUT = join(import.meta.dirname, `mijn-${MODE}`);
const PORT = 4411;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});

// Het vorige bezoek vastzetten. Mijn Maculis leest dat uit localStorage onder een sleutel die
// van de organisatie is afgeleid; welke sleutel dat is, hoeft de harness niet te weten.
const VASTE_OPSLAG = `(() => {
  const echt = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (String(k).startsWith('mijn_laatst_')) return ${JSON.stringify(F.VORIG_BEZOEK)};
    return echt.call(this, k);
  };
  Storage.prototype.setItem = new Proxy(Storage.prototype.setItem, {
    apply(t, self, args) { if (String(args[0]).startsWith('mijn_laatst_')) return; return Reflect.apply(t, self, args); },
  });
})();`;

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1920, height: 1080 },
];

const FREEZE = `
  *, *::before, *::after {
    animation-play-state: paused !important;
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
`;

export function routeMijn(page) {
  return page.route('**/api/mijn/**', async (r) => {
    const p = new URL(r.request().url()).pathname;
    const json = (body, status = 200) =>
      r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/api/mijn/session') return json(F.session);
    if (p === '/api/mijn/overview') return json(F.overview);
    if (p === '/api/mijn/insights') return json({ insights: F.insights });
    if (p === '/api/mijn/collaboration') return json({ items: F.collaborationItems });
    const m = p.match(/^\/api\/mijn\/insights\/([^/]+)$/);
    if (m) { const d = F.detail(m[1]); return d ? json(d) : json({ error: 'nope' }, 404); }
    return json({});
  });
}

// De vier momenten van de kamer. Het veld is er één, de andere drie zijn de bladen die
// eruit voortkomen. De cyclus wordt overgeslagen zodat we altijd de eindtoestand vastleggen.
export const SCREENS = [
  { name: 'veld', wait: '.zeg.in', doe: null },
  { name: 'bewijs', wait: '.bewijs.in', doe: '#btn-waarom' },
  { name: 'patronen', wait: '.patronen.in', doe: '#btn-patronen' },
  { name: 'samen', wait: '.samen.in', doe: '#btn-samen' },
];

const url = (base) => `${base}/mijn.html?t=${F.TOKEN}`;

async function capture(browser, base, { reduce }) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: reduce ? 'reduce' : 'no-preference',
      locale: 'nl-NL',
      timezoneId: 'Europe/Amsterdam',
    });
    await ctx.addInitScript(VASTE_OPSLAG);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await routeMijn(page);

    for (const s of SCREENS) {
      await page.goto(url(base), { waitUntil: 'networkidle' });
      // de cyclus overslaan: een klik op het lege veld brengt hem meteen in de eindtoestand
      await page.mouse.click(4, Math.round(vp.height / 2));
      await page.waitForTimeout(600);
      if (s.doe) await page.click(s.doe);
      await page.waitForSelector(s.wait, { timeout: 8000 }).catch(() => {});
      await page.addStyleTag({ content: FREEZE });
      await page.waitForTimeout(900);
      const name = `mijn.${s.name}.${vp.name}${reduce ? '.reduce' : ''}.png`;
      await page.screenshot({ path: join(OUT, name), fullPage: true, animations: 'disabled' });
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log(`  ! overflow ${overflow}px  ${name}`);
    }
    if (errors.length) console.log(`  ! console ${vp.name}${reduce ? ' reduce' : ''}: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  console.log(`mijn-capture -> ${MODE}`);
  for (const reduce of [false, true]) await capture(browser, `http://127.0.0.1:${PORT}`, { reduce });
  await browser.close();
  server.close();
  console.log('klaar');
}
