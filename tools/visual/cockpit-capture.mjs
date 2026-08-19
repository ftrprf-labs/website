// Visuele harness voor de Maculis Cockpit.
//
// Rendert elk Cockpit-oppervlak deterministisch en legt het vast. Geen database, geen login,
// geen echte data: alle API-antwoorden komen uit cockpit-fixtures.mjs.
//
//   node tools/visual/cockpit-capture.mjs baseline    -> tools/visual/cockpit-baseline/
//   node tools/visual/cockpit-capture.mjs after       -> tools/visual/cockpit-after/
//
// Determinisme: vaste viewports, vaste tijdzone en locale, bevroren animaties en transities,
// verborgen caret, en fixtures met vaste tijdstempels.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import * as F from './cockpit-fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const MODE = process.argv[2] === 'after' ? 'after' : 'baseline';
const ONLY = process.argv[3] || null;
const OUT = join(import.meta.dirname, `cockpit-${MODE}`);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};

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

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export function routeApi(page) {
  return page.route('**/api/**', async (r) => {
    const p = new URL(r.request().url()).pathname;
    const json = (body) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (p === '/api/cockpit/config') return json(F.config);
    if (p === '/api/cockpit/today') return json(F.today);
    if (p === '/api/cockpit/relations') return json(F.relations);
    if (p === '/api/cockpit/conversations') return json(F.conversations);
    if (p === '/api/cockpit/actions') return json({ actions: [], count: 0 });
    if (p === '/api/cockpit/work') return json({ work: [], count: 0 });
    if (new RegExp(`^/api/cockpit/relation/${UUID}$`).test(p)) return json(F.relation);
    if (new RegExp(`^/api/cockpit/conversation/${UUID}$`).test(p)) return json(F.conversation);
    if (p === '/api/invitations') return json(F.invitations);
    return json({ ok: true });
  });
}

// De schermen van de operationele Cockpit, elk bereikt zoals een mens hem bereikt.
const SCENES = [
  { name: 'vandaag', go: async () => {} },
  { name: 'relaties', go: async (page) => { await page.click('[data-nav="relaties"]'); } },
  { name: 'gesprekken', go: async (page) => { await page.click('[data-nav="gesprekken"]'); } },
  { name: 'beheer', go: async (page) => { await page.locator('[data-nav="beheer"]').first().dispatchEvent('click'); } },
  { name: 'dossier', go: async (page) => { await page.click('.item.openable'); } },
  { name: 'gesprek', go: async (page) => { await page.click('.item.openable'); await page.click('.dos-now-item .btn-primary'); } },
];

// De schermen van het ontwerpprototype, bereikt via de deeplinks die het zelf kent.
const PROTO_SCENES = [
  { name: 'vandaag', query: '' },
  { name: 'relaties', query: '?scn=relaties' },
  { name: 'gesprekken', query: '?scn=gesprekken' },
  { name: 'gesprek', query: '?scn=work' },
  { name: 'dossier', query: '?scn=dossier' },
  { name: 'beheer', query: '?scn=beheer' },
  { name: 'reveal', query: '?scn=reveal&rev=r-kim' },
];

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(220);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(120);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  // De sandbox levert Chromium mee; het versienummer van het npm-pakket hoeft daar niet
// mee te rijmen. Staat de meegeleverde binary er, dan gebruiken we die.
const LOCAL_CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(existsSync(LOCAL_CHROME) ? { executablePath: LOCAL_CHROME } : {});
  let n = 0;

  for (const reduce of [false, true]) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam',
        reducedMotion: reduce ? 'reduce' : 'no-preference',
        colorScheme: 'dark',
      });
      await ctx.addInitScript(() => { try { Math.random = () => 0.42; } catch { /* frozen */ } });
      for (const scene of SCENES) {
        if (ONLY && scene.name !== ONLY) continue;
        const page = await ctx.newPage();
        await routeApi(page);
        await page.addStyleTag; // no-op guard
        await page.goto(`${base}/cockpit-live.html`, { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: FREEZE });
        await settle(page);
        try { await scene.go(page); } catch (e) { console.warn(`  ! ${scene.name}: ${e.message.split('\n')[0]}`); }
        await settle(page);
        const suffix = reduce ? '.reduce' : '';
        const file = join(OUT, `cockpit.${scene.name}.${vp.name}${suffix}.png`);
        await page.screenshot({ path: file, fullPage: true });
        n++;
        await page.close();
      }
      // De ontwerp-prototypepagina deelt dezelfde stylesheet en dezelfde vormtaal, en is
      // zonder database te beoordelen. Zij wordt via haar eigen deeplinks bevraagd.
      for (const proto of PROTO_SCENES) {
        if (ONLY && `proto:${proto.name}` !== ONLY) continue;
        const page = await ctx.newPage();
        await routeApi(page);
        await page.goto(`${base}/cockpit.html${proto.query}`, { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: FREEZE });
        await settle(page);
        const suffix = reduce ? '.reduce' : '';
        await page.screenshot({ path: join(OUT, `prototype.${proto.name}.${vp.name}${suffix}.png`), fullPage: true });
        n++;
        await page.close();
      }
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  console.log(`${MODE}: ${n} renders in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
