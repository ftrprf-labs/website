// Visual QA + browser smoke test for Mijn Maculis. Drives the preview with headless Chromium,
// captures screenshots, and asserts: no console errors, no horizontal overflow, the share flow works.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = process.env.MIJN_BASE || 'http://127.0.0.1:4399';
const TOKEN = process.env.MIJN_PREVIEW_TOKEN || 'preview-mijn-maculis-de-voorbeeld-groep-0001';
const OUT = process.env.SHOT_DIR || '/tmp/mijn-shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: CHROME });

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { ctx, page };
}

async function noHScroll(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`horizontal overflow (${overflow}px) at ${label}`);
}

// ---- desktop ----
{
  const { page } = await newPage({ width: 1440, height: 980 });
  await page.goto(`${BASE}/mijn.html?t=${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hero h2');
  await noHScroll(page, 'overview');
  await page.screenshot({ path: `${OUT}/01-overzicht.png` });

  // Insight detail (PRIVATE) — click the hero CTA.
  await page.click('.hero .btn-primary');
  await page.waitForSelector('.detail h2');
  await noHScroll(page, 'detail');
  await page.screenshot({ path: `${OUT}/02-inzicht-prive.png` });

  // Share confirmation dialog.
  await page.click('#act-share');
  await page.waitForSelector('#confirm:not(.hidden)');
  await page.screenshot({ path: `${OUT}/03-delen-bevestigen.png` });

  // Confirm the share → post-share state.
  await page.click('#confirm-ok');
  await page.waitForSelector('.share-status-title:has-text("Gedeeld met Maculis")');
  await page.screenshot({ path: `${OUT}/04-na-delen.png` });
  const sharedText = await page.textContent('.share-status-title');
  if (!/Gedeeld met Maculis/.test(sharedText)) throw new Error('share did not flip to SHARED in UI');

  // De Spiegel (all insights).
  await page.click('.detail-back .btn-link');
  await page.waitForSelector('.spiegel-grid');
  await page.screenshot({ path: `${OUT}/05-de-spiegel.png` });

  // Samenwerking.
  await page.click('.nav-item[data-route="samenwerking"]');
  await page.waitForSelector('.glance-row');
  await noHScroll(page, 'samenwerking');
  await page.screenshot({ path: `${OUT}/06-samenwerking.png` });

  // Reset the share so re-runs start clean and the mobile shot shows the PRIVATE state.
  await page.evaluate(async (token) => {
    const list = await (await fetch('/api/mijn/insights', { headers: { 'x-mijn-token': token } })).json();
    const shared = (list.insights || []).filter((i) => i.sharing === 'SHARED');
    for (const i of shared) {
      // Only revoke the preview insight we shared in this run (title match), keep the seed's SHARED one.
      if (i.title.startsWith('Jullie positionering')) {
        await fetch(`/api/mijn/insights/${i.id}/revoke`, { method: 'POST', headers: { 'x-mijn-token': token, 'Content-Type': 'application/json' }, body: '{}' });
      }
    }
  }, TOKEN);
}

// ---- mobile ----
{
  const { page } = await newPage({ width: 390, height: 844 });
  await page.goto(`${BASE}/mijn.html?t=${TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hero h2');
  await noHScroll(page, 'mobile-overview');
  await page.screenshot({ path: `${OUT}/07-mobiel-overzicht.png`, fullPage: true });

  await page.click('.hero .btn-primary');
  await page.waitForSelector('.detail h2');
  await noHScroll(page, 'mobile-detail');
  await page.screenshot({ path: `${OUT}/08-mobiel-inzicht.png`, fullPage: true });
}

await browser.close();

if (errors.length) {
  console.error('CONSOLE/PAGE ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK — screenshots in ' + OUT + ', 0 console errors, share flow verified, no horizontal scroll.');
