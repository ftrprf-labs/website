// Bewijs voor de affordance van Het Veld.
//
//   node tools/visual/mijn-affordance.mjs
//
// De betekenislaag van Het Veld is: punt = waarneming, verbinding = groeiend verband,
// patroon = betekenis. Een los punt is dus geen onderwerp. Het hoeft voor de klant niet
// afzonderlijk ontcijferbaar te zijn en mag dat ook niet suggereren. Deze test meet dat
// op het echte oppervlak, want de affordance zit in een canvas en niet in de DOM:
//
//   1. er bestaat geen tooltip meer, ook niet leeg en verborgen;
//   2. de cursor verandert alleen boven een patroon, en de plekken waar dat gebeurt zijn
//      grote, aaneengesloten gebieden: geen zwerm kleine trefvlakjes rond losse punten;
//   3. klikken op een los lichtpunt opent niets;
//   4. klikken op een patroon opent wel de toelichting.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const PUBLIC = join(resolve(import.meta.dirname, '..', '..'), 'public');
const PORT = 4415;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

const srv = http.createServer(async (q, r) => {
  try {
    const b = await readFile(join(PUBLIC, decodeURIComponent(new URL(q.url, 'http://x').pathname)));
    r.writeHead(200, { 'content-type': MIME[extname(q.url.split('?')[0])] || 'application/octet-stream' });
    r.end(b);
  } catch { r.writeHead(404); r.end(); }
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const VASTE_OPSLAG = `(() => {
  const echt = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (String(k).startsWith('mijn_laatst_')) return ${JSON.stringify(F.VORIG_BEZOEK)};
    return echt.call(this, k);
  };
})();`;

// Eén routetabel voor de hele harness (tools/visual/mijn-fixtures.mjs), inclusief het gesprek.
const route = (page) => F.routeMijn(page, F.maakStore());

let fails = 0;
const chk = (l, c, d = '') => { if (!c) fails++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };

const br = await chromium.launch();
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
await ctx.addInitScript(VASTE_OPSLAG);
const page = await ctx.newPage();
await route(page);
await page.goto(`http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}`, { waitUntil: 'networkidle' });
await page.waitForSelector('.zeg.in');
await page.waitForTimeout(400);

console.log('\n=== losse punten dragen geen eigen affordance ===');

chk('er is geen tooltip meer in de pagina', (await page.locator('#tip, .tip').count()) === 0);

// De cursor is de enige overgebleven aanwijzing. We rasteren het hele veld af en kijken waar
// hij verandert. Alleen patronen mogen dat doen, en die zijn groot.
const STAP = 12;
const vak = await page.locator('#veld').boundingBox();
const raak = await page.evaluate(({ STAP, vak }) => {
  const cv = document.getElementById('veld');
  const uit = [];
  for (let y = vak.y + STAP; y < vak.y + vak.height - STAP; y += STAP) {
    for (let x = vak.x + STAP; x < vak.x + vak.width - STAP; x += STAP) {
      cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      if (cv.classList.contains('aanwijsbaar')) uit.push([x, y]);
    }
  }
  cv.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  return uit;
}, { STAP, vak });

// Clusteren: alles wat binnen anderhalve rasterstap van elkaar ligt hoort bij hetzelfde gebied.
// Union-find, want een greedy indeling hangt af van de volgorde van het raster.
const ouder = raak.map((_, i) => i);
const wortel = (i) => (ouder[i] === i ? i : (ouder[i] = wortel(ouder[i])));
for (let i = 0; i < raak.length; i++) {
  for (let j = i + 1; j < raak.length; j++) {
    if (Math.hypot(raak[i][0] - raak[j][0], raak[i][1] - raak[j][1]) <= STAP * 1.5) ouder[wortel(i)] = wortel(j);
  }
}
const bak = new Map();
raak.forEach((punt, i) => { const w = wortel(i); if (!bak.has(w)) bak.set(w, []); bak.get(w).push(punt); });
const groepen = [...bak.values()];
const straal = (g) => {
  const cx = g.reduce((s, [a]) => s + a, 0) / g.length, cy = g.reduce((s, [, b]) => s + b, 0) / g.length;
  return Math.max(...g.map(([a, b]) => Math.hypot(a - cx, b - cy)));
};
const kleinste = groepen.length ? Math.min(...groepen.map(straal)) : 0;

console.log(`  ${raak.length} rasterpunten aanwijsbaar, verdeeld over ${groepen.length} gebieden`);
chk('de cursor verandert ergens: patronen zijn wél interactief', groepen.length > 0);
chk('en alleen daar: hooguit één gebied per patroon', groepen.length <= F.insights.length,
  `${groepen.length} gebieden bij ${F.insights.length} inzichten`);
chk('elk gebied is een patroon, geen los punt', kleinste >= 24,
  `kleinste gebied heeft straal ${Math.round(kleinste)}px, een los punt zou onder de 20 blijven`);

// Een los lichtpunt: een plek waar het veld duidelijk licht geeft maar de cursor niet verandert.
const los = await page.evaluate(({ groepen, vak }) => {
  const cv = document.getElementById('veld');
  const c = cv.getContext('2d', { willReadFrequently: true });
  const s = cv.width / vak.width;
  const ver = (x, y) => groepen.every((g) => g.every(([a, b]) => Math.hypot(a - x, b - y) > 70));
  let beste = null, best = 0;
  for (let y = vak.y + 8; y < vak.y + vak.height - 8; y += 4) {
    for (let x = vak.x + 8; x < vak.x + vak.width - 8; x += 4) {
      if (!ver(x, y)) continue;
      const d = c.getImageData(Math.round((x - vak.x) * s), Math.round((y - vak.y) * s), 1, 1).data;
      const l = (d[0] + d[1] + d[2]) / 3;
      if (l > best) { best = l; beste = [x, y]; }
    }
  }
  return { punt: beste, licht: Math.round(best) };
}, { groepen, vak });

chk('er is een duidelijk zichtbaar los lichtpunt om op te klikken', los.licht > 40,
  `helderheid ${los.licht} op ${los.punt && los.punt.map(Math.round).join(', ')}`);
await page.mouse.move(los.punt[0], los.punt[1]);
chk('boven een los punt verandert de cursor niet', (await page.locator('#veld.aanwijsbaar').count()) === 0);
await page.mouse.click(los.punt[0], los.punt[1]);
await page.waitForTimeout(250);
chk('en klikken op een los punt opent niets', (await page.locator('#bewijs.in').count()) === 0);

console.log('\n=== een patroon is wél interactief ===');
const kern = groepen.sort((a, b) => b.length - a.length)[0];
const mid = [kern.reduce((s, [a]) => s + a, 0) / kern.length, kern.reduce((s, [, b]) => s + b, 0) / kern.length];
await page.mouse.move(mid[0], mid[1]);
chk('boven een patroon verandert de cursor wel', (await page.locator('#veld.aanwijsbaar').count()) === 1);
await page.mouse.click(mid[0], mid[1]);
await page.waitForSelector('#bewijs.in', { timeout: 2500 }).catch(() => {});
chk('en klikken op een patroon opent de toelichting', (await page.locator('#bewijs.in').count()) === 1,
  (await page.locator('#bw-titel').textContent().catch(() => '')) || '');

await br.close(); srv.close();
console.log(fails ? `\nAFFORDANCE: ${fails} GEFAALD` : '\nAFFORDANCE: ALLES GROEN');
process.exit(fails ? 1 : 0);
