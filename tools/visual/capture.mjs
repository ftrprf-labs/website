// Visuele regressie-harness voor de Maculis-harmonisatie.
//
// Rendert een oppervlak deterministisch en legt het vast. Geen database, geen login,
// geen echte data: alle API-antwoorden komen uit tools/visual/fixtures.mjs, zodat een
// verschil tussen twee runs alleen stijl kan zijn.
//
//   node tools/visual/capture.mjs baseline    -> schrijft naar tools/visual/baseline/
//   node tools/visual/capture.mjs after       -> schrijft naar tools/visual/after/
//
// Determinisme wordt afgedwongen door: vaste viewports, vaste tijdzone en locale,
// bevroren animaties en transities, verborgen caret, en fixtures met vaste tijdstempels.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import * as F from './fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const MODE = process.argv[2] === 'after' ? 'after' : 'baseline';
const OUT = join(import.meta.dirname, MODE);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

// Statische server op public/ — exact wat de echte server ook uitserveert.
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

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'wide', width: 1920, height: 1080 },
];

const TABS = ['overzicht', 'journey', 'inzichten', 'communicatie', 'activiteit'];

// Bevriest alles wat tussen twee runs kan verschillen.
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

function route(page) {
  return page.route('**/api/**', async (r) => {
    const u = new URL(r.request().url());
    const p = u.pathname;
    const json = (body) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/api/comm/status') return json(F.status);
    if (p === '/api/comm/relationship') return json(F.relationship);
    if (p === '/api/comm/followups') return json(F.followups);
    if (/\/ai\/suggest$/.test(p)) return json(F.suggestions);
    if (/\/draft$/.test(p)) return json(F.draft);
    if (/^\/api\/comm\/conversations\/[^/]+$/.test(p)) return json(F.conversation);
    return json({});
  });
}

async function capture(browser, surface, url, { reduce }) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      reducedMotion: reduce ? 'reduce' : 'no-preference',
      locale: 'nl-NL',
      timezoneId: 'Europe/Amsterdam',
      colorScheme: 'dark',
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await route(page);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: FREEZE });
    await page.waitForTimeout(250);

    const tabs = surface === 'workspace' ? TABS : ['default'];
    for (const tab of tabs) {
      if (tab !== 'default') {
        const btn = page.locator(`nav.tabs button[data-tab="${tab}"]`);
        if (await btn.count()) { await btn.click(); await page.waitForTimeout(350); }
      }
      const suffix = reduce ? '.reduce' : '';
      const name = `${surface}.${tab}.${vp.name}${suffix}.png`;
      await page.screenshot({ path: join(OUT, name), fullPage: true, animations: 'disabled' });
      // Horizontale overflow is een harde poort, dus meten we hem hier meteen.
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log(`  ! overflow ${overflow}px  ${name}`);
    }
    if (errors.length) console.log(`  ! console ${vp.name}${reduce ? ' reduce' : ''}: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}

const PORT = 4399;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const base = `http://127.0.0.1:${PORT}`;
const q = `?contact=${F.CONTACT_ID}`;

console.log(`capture -> ${MODE}`);
for (const reduce of [false, true]) {
  // workspace = het pilotoppervlak. comm = de onaangeraakte controlegroep.
  await capture(browser, 'workspace', `${base}/workspace.html${q}`, { reduce });
  await capture(browser, 'comm', `${base}/comm.html`, { reduce });
}
await browser.close();
server.close();
console.log('klaar');
