// Bewijs voor de levenscyclus van Het Veld (canon 8.1 en 8.5).
//
//   node tools/visual/mijn-motion.mjs
//
// Het veld is een canvas, dus de bewering "er gebeurt echt iets, en het komt echt tot rust" kan
// niet uit de DOM komen. Hij wordt hier op de pixels gemeten. Per moment berekenen we een
// signatuur van het veld: hoeveel licht er is, waar het zwaartepunt van dat licht ligt, en
// hoeveel violet er brandt. Daarmee zijn vier dingen controleerbaar:
//
//   1. onderweg verandert het veld werkelijk, dus het is geen stilstaand plaatje;
//   2. violet is er bij de eerste waarnemingen nog niet en aan het eind wel: eerst bewijs,
//      dan pas betekenis;
//   3. na de cyclus komt het veld tot rust: het zwaartepunt beweegt niet meer noemenswaardig,
//      alleen het licht ademt nog (canon 14);
//   4. prefers-reduced-motion toont die eindtoestand DIRECT, en niet een bevroren begin.
//
// Legt daarnaast vier momentopnamen vast in tools/visual/mijn-motion/.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const PUBLIC = join(resolve(import.meta.dirname, '..', '..'), 'public');
const OUT = join(import.meta.dirname, 'mijn-motion');
const PORT = 4413;
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
mkdirSync(OUT, { recursive: true });

const VASTE_OPSLAG = `(() => {
  const echt = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (String(k).startsWith('mijn_laatst_')) return ${JSON.stringify(F.VORIG_BEZOEK)};
    return echt.call(this, k);
  };
})();`;

const route = (page) => page.route('**/api/mijn/**', async (r) => {
  const p = new URL(r.request().url()).pathname;
  const j = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
  if (p === '/api/mijn/session') return j(F.session);
  if (p === '/api/mijn/overview') return j(F.overview);
  if (p === '/api/mijn/insights') return j({ insights: F.insights });
  if (p === '/api/mijn/collaboration') return j({ items: F.collaborationItems });
  const m = p.match(/^\/api\/mijn\/insights\/([^/]+)$/);
  if (m) { const d = F.detail(m[1]); return d ? j(d) : j({}, 404); }
  return j({});
});

// De signatuur van het veld op dit moment: totale helderheid, het zwaartepunt van het licht,
// en hoeveel violet er brandt. Alles genormaliseerd, zodat de maten schermonafhankelijk zijn.
const SIGNATUUR = () => {
  const cv = document.getElementById('veld');
  const c = cv.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = cv;
  const d = c.getImageData(0, 0, w, h).data;
  let licht = 0, sx = 0, sy = 0, violet = 0, n = 0;
  const stap = 4 * 3;   // elke derde pixel: ruim genoeg en snel
  for (let i = 0, px = 0; i < d.length; i += stap, px += 3) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const l = (r + g + b) / 3;
    if (l < 26) continue;
    const x = (px % w) / w, y = Math.floor(px / w) / h;
    licht += l; sx += x * l; sy += y * l; n++;
    if (b > r + 26 && b > 60) violet += 1;    // violet: blauw duidelijk boven rood
  }
  return {
    licht: Math.round(licht / 1000),
    zwaartepunt: n ? [Number((sx / licht).toFixed(4)), Number((sy / licht).toFixed(4))] : [0, 0],
    violet,
    punten: n,
  };
};

let fails = 0;
const chk = (l, c, d = '') => { if (!c) fails++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };
const afstand = (a, b) => Math.hypot(a.zwaartepunt[0] - b.zwaartepunt[0], a.zwaartepunt[1] - b.zwaartepunt[1]);

const br = await chromium.launch();
const URL_ = `http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}`;

// ---- 1. de cyclus -----------------------------------------------------------------------------
console.log('\n=== levenscyclus ===');
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
await ctx.addInitScript(VASTE_OPSLAG);
const p = await ctx.newPage(); await route(p);
await p.goto(URL_, { waitUntil: 'networkidle' });
await p.waitForSelector('#veld');

const merken = [];
let vorig = 0;
for (const [ms, naam] of [[1500, '1-waarnemen'], [7000, '2-zoeken'], [12500, '3-verband'], [18000, '4-inzicht'], [23000, '5-rust'], [26000, '6-nog-in-rust']]) {
  await p.waitForTimeout(ms - vorig); vorig = ms;
  const s = await p.evaluate(SIGNATUUR);
  merken.push({ ms, naam, s });
  if (naam !== '6-nog-in-rust') await p.screenshot({ path: join(OUT, `${naam}.png`) });
  console.log(`  ${String(ms).padStart(6)}ms  ${naam.padEnd(16)} licht ${String(s.licht).padStart(6)}  violet ${String(s.violet).padStart(5)}  zwaartepunt ${s.zwaartepunt.join(', ')}`);
}
const [m1, m2, m3, m4, m5, m6] = merken;

chk('onderweg verandert het veld werkelijk', afstand(m1.s, m4.s) > 0.01,
  `zwaartepunt verschoof ${afstand(m1.s, m4.s).toFixed(4)}`);
// Bij de eerste waarnemingen is er nog geen enkel violet pixel: er is nog niets waar te nemen
// wat betekenis heeft. Aan het eind is er violet, want dan is de drempel gehaald.
chk('violet is er bij de eerste waarnemingen nog niet, en aan het eind wel',
  m1.s.violet === 0 && m4.s.violet > 0, `${m1.s.violet} bij 1,5s en ${m4.s.violet} bij 18s`);
chk('het licht groeit met het bewijs', m4.s.licht > m1.s.licht, `${m1.s.licht} naar ${m4.s.licht}`);
chk('na de cyclus komt het veld tot rust', afstand(m5.s, m6.s) < 0.004,
  `zwaartepunt bewoog nog ${afstand(m5.s, m6.s).toFixed(4)} in 3 s`);
chk('maar het licht ademt nog', m5.s.licht !== m6.s.licht || m5.s.punten !== m6.s.punten,
  `${m5.s.licht} tegenover ${m6.s.licht}`);

// ---- 2. reduced motion toont de eindtoestand ---------------------------------------------------
console.log('\n=== reduced motion ===');
const ctx2 = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
await ctx2.addInitScript(VASTE_OPSLAG);
const p2 = await ctx2.newPage(); await route(p2);
await p2.goto(URL_, { waitUntil: 'networkidle' });
await p2.waitForSelector('.zeg.in');
await p2.waitForTimeout(600);
const rm = await p2.evaluate(SIGNATUUR);
await p2.screenshot({ path: join(OUT, '7-reduced.png') });
console.log(`  direct na laden      licht ${String(rm.licht).padStart(6)}  violet ${String(rm.violet).padStart(5)}  zwaartepunt ${rm.zwaartepunt.join(', ')}`);

chk('reduced motion staat direct op de eindtoestand', afstand(rm, m5.s) < 0.02,
  `verschil met de rusttoestand ${afstand(rm, m5.s).toFixed(4)}`);
chk('reduced motion draagt hetzelfde inzicht', rm.violet > 0, `${rm.violet} violette pixels`);
chk('reduced motion draait geen enkele animatie',
  (await p2.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)) === 0);
const stil = await p2.evaluate(SIGNATUUR);
chk('en het veld staat er ook werkelijk stil', afstand(stil, rm) === 0 && stil.licht === rm.licht);

await br.close(); srv.close();
console.log(fails ? `\nMOTION: ${fails} GEFAALD` : '\nMOTION: ALLES GROEN');
process.exit(fails ? 1 : 0);
