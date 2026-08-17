// A2 visual QA: development timeline + "unshared development" share flow. Desktop + mobile.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.MIJN_BASE || 'http://127.0.0.1:4399';
const TOKEN = process.env.MIJN_PREVIEW_TOKEN || 'preview-mijn-maculis-de-voorbeeld-groep-0001';
const OUT = process.env.SHOT_DIR || '/tmp/mijn-a2-shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: CHROME });
async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return page;
}
async function noHScroll(page, label) {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 1) throw new Error(`horizontal overflow (${o}px) at ${label}`);
}
async function openInsight(page, text) {
  await page.goto(`${BASE}/mijn.html?t=${TOKEN}#/inzichten`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.spiegel-grid');
  await page.click(`.icard:has-text("${text}")`);
  await page.waitForSelector('.detail h2');
}

// ---- desktop ----
{
  const page = await newPage({ width: 1440, height: 1000 });

  // De Spiegel: subtle "Bijgewerkt" markers on developed cards.
  await page.goto(`${BASE}/mijn.html?t=${TOKEN}#/inzichten`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.spiegel-grid');
  await noHScroll(page, 'spiegel');
  await page.screenshot({ path: `${OUT}/01-spiegel-bijgewerkt.png` });

  // A SHARED insight that developed: shows the "unshared development" notice + share-update.
  await openInsight(page, 'Positionering wordt extern duidelijker');
  await page.waitForSelector('.dev-notice');
  await page.click('.dev > summary'); // expand the development timeline
  await page.waitForSelector('.dev[open] .dev-list');
  await noHScroll(page, 'detail-unshared');
  await page.screenshot({ path: `${OUT}/02-detail-ontwikkeling-ongedeeld.png`, fullPage: true });

  // Confirm dialog for "Deel de nieuwe ontwikkeling".
  await page.click('#act-share-update');
  await page.waitForSelector('#confirm:not(.hidden)');
  await page.screenshot({ path: `${OUT}/03-deel-nieuwe-ontwikkeling.png` });
  await page.click('#confirm-cancel');

  // A PRIVATE insight that developed: timeline, no unshared-development notice.
  await openInsight(page, 'Sterke betrokkenheid');
  await page.click('.dev > summary');
  await page.waitForSelector('.dev[open] .dev-list');
  await page.screenshot({ path: `${OUT}/04-detail-prive-ontwikkeling.png`, fullPage: true });
}

// ---- mobile ----
{
  const page = await newPage({ width: 390, height: 844 });
  await openInsight(page, 'Positionering wordt extern duidelijker');
  await page.waitForSelector('.dev-notice');
  await page.click('.dev > summary');
  await noHScroll(page, 'mobile-detail');
  await page.screenshot({ path: `${OUT}/05-mobiel-ontwikkeling.png`, fullPage: true });
}

await browser.close();
if (errors.length) { console.error('CONSOLE/PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK — A2 screenshots in ' + OUT + ', 0 console errors, no horizontal scroll.');
