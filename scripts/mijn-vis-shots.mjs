// Visual QA capture across viewports and screens. Reusable for before/after via SHOT_DIR.
// Also a functional smoke test: asserts 0 console errors and no horizontal overflow.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.MIJN_BASE || 'http://127.0.0.1:4399';
const TOKEN = process.env.MIJN_PREVIEW_TOKEN || 'preview-mijn-maculis-de-voorbeeld-groep-0001';
const OUT = process.env.SHOT_DIR || '/tmp/mijn-vis';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: CHROME });
async function page(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return p;
}
async function noH(p, label) {
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 1) throw new Error(`horizontal overflow (${o}px) at ${label}`);
}
async function go(p, hash) { await p.goto(`${BASE}/mijn.html?t=${TOKEN}${hash}`, { waitUntil: 'networkidle' }); }

// Overzicht across viewports.
for (const [w, h, name] of [[1600, 1040, 'overzicht-1600'], [1440, 960, 'overzicht-1440'], [834, 1112, 'overzicht-834']]) {
  const p = await page({ width: w, height: h });
  await go(p, '#/overzicht'); await p.waitForSelector('.hero h2'); await noH(p, name);
  await p.screenshot({ path: `${OUT}/${name}.png` });
  await p.context().close();
}
{ // mobile overzicht (full page)
  const p = await page({ width: 390, height: 844 });
  await go(p, '#/overzicht'); await p.waitForSelector('.hero h2'); await noH(p, 'overzicht-390');
  await p.screenshot({ path: `${OUT}/overzicht-390.png`, fullPage: true });
  await p.context().close();
}
{ // De Spiegel
  const p = await page({ width: 1440, height: 1100 });
  await go(p, '#/inzichten'); await p.waitForSelector('.spiegel-grid'); await noH(p, 'spiegel');
  await p.screenshot({ path: `${OUT}/spiegel.png` });
  await p.context().close();
}
{ // Insight detail — the SHARED insight with an unshared development, timeline expanded.
  const p = await page({ width: 1440, height: 1100 });
  await go(p, '#/inzichten'); await p.waitForSelector('.spiegel-grid');
  await p.click('.icard:has-text("Positionering wordt extern duidelijker")');
  await p.waitForSelector('.detail h2');
  const dev = await p.$('.dev > summary'); if (dev) await dev.click();
  await noH(p, 'detail');
  await p.screenshot({ path: `${OUT}/detail.png`, fullPage: true });
  await p.context().close();
}
{ // Insight detail mobile
  const p = await page({ width: 390, height: 844 });
  await go(p, '#/inzichten'); await p.waitForSelector('.spiegel-grid');
  await p.click('.icard:has-text("Positionering wordt extern duidelijker")');
  await p.waitForSelector('.detail h2'); await noH(p, 'detail-mobiel');
  await p.screenshot({ path: `${OUT}/detail-390.png`, fullPage: true });
  await p.context().close();
}
{ // Samenwerking
  const p = await page({ width: 1440, height: 900 });
  await go(p, '#/samenwerking'); await p.waitForSelector('.glance-row'); await noH(p, 'samenwerking');
  await p.screenshot({ path: `${OUT}/samenwerking.png` });
  await p.context().close();
}

await browser.close();
if (errors.length) { console.error('CONSOLE/PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK — screenshots in ' + OUT + ' (0 console errors, no horizontal scroll)');
