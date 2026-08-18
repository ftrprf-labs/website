// Bewijs voor de levenscyclus van het signaalveld (canon 8.1 en 8.5).
//
//   node tools/visual/mijn-motion.mjs
//
// Controleert drie dingen die een screenshot niet laat zien:
//   1. de cyclus loopt één keer en komt tot rust, er blijft geen enkele animatie draaien
//      behalve het ademen van het licht (canon 14: alleen ademen);
//   2. de eindtoestand na de cyclus is dezelfde als wat reduced motion direct toont;
//   3. onderweg verandert er werkelijk iets, dus de cyclus is geen stilstaand plaatje.
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

let fails = 0;
const chk = (l, c, d = '') => { if (!c) fails++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };
const URL_ = `http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}#/overzicht`;

// De vorm van het veld op een moment: posities, opacity en zichtbare lengte van de lijnen.
const shape = () => document.querySelectorAll('.orbit .sf-node').length === 0 ? null : {
  nodes: [...document.querySelectorAll('.orbit .sf-node')].map((n) => {
    const b = n.getBoundingClientRect();
    return [Math.round(b.x), Math.round(b.y), Math.round(b.width)];
  }),
  links: [...document.querySelectorAll('.orbit .sf-link')].map((n) => Math.round(parseFloat(getComputedStyle(n).strokeDashoffset) || 0)),
  core: (() => { const c = document.querySelector('.orbit .sf-core'); const b = c.getBoundingClientRect(); return Math.round(b.width); })(),
};

const br = await chromium.launch();

// ---- 1. de cyclus zelf --------------------------------------------------------------------
console.log('\n=== levenscyclus ===');
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
const p = await ctx.newPage(); await route(p);
await p.goto(URL_, { waitUntil: 'networkidle' });
await p.waitForSelector('.orbit .sf-core');

const marks = [];
for (const [ms, label] of [[300, '1-waarnemen'], [2600, '2-verband'], [5200, '3-inzicht'], [11000, '4-rust']]) {
  await p.waitForTimeout(ms - (marks.length ? marks[marks.length - 1].ms : 0));
  const s = await p.evaluate(shape);
  const running = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running')
    .map((a) => a.animationName || 'onbekend'));
  marks.push({ ms, label, s, running });
  await p.locator('.hero').screenshot({ path: join(OUT, `${label}.png`) });
  console.log(`  ${String(ms).padStart(5)}ms  ${label}  lopend: ${running.length ? [...new Set(running)].join(', ') : 'niets'}`);
}

const [m1, m2, m3, m4] = marks;
chk('onderweg verandert het veld werkelijk', JSON.stringify(m1.s) !== JSON.stringify(m3.s));
chk('de verbanden worden getrokken', m1.s.links.some((v) => v > 0) && m3.s.links.every((v) => v === 0));
chk('het inzicht ontsteekt na de signalen', m1.s.core < m3.s.core, `${m1.s.core}px naar ${m3.s.core}px`);
const restRunning = [...new Set(m4.running)];
chk('na de cyclus staat alles stil, op het ademen van het licht na',
  restRunning.every((n) => n === 'mijnBreathe'), restRunning.join(', ') || 'niets');

// ---- 2. eindtoestand tegenover reduced motion ------------------------------------------------
console.log('\n=== reduced motion toont de eindtoestand ===');
const ctx2 = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
const p2 = await ctx2.newPage(); await route(p2);
await p2.goto(URL_, { waitUntil: 'networkidle' });
await p2.waitForSelector('.orbit .sf-core');
await p2.waitForTimeout(400);
const reduced = await p2.evaluate(shape);
await p2.locator('.hero').screenshot({ path: join(OUT, '5-reduced.png') });
chk('reduced motion staat op exact de eindtoestand', JSON.stringify(reduced) === JSON.stringify(m4.s),
  JSON.stringify(reduced) === JSON.stringify(m4.s) ? 'identiek' : 'wijkt af');
chk('reduced motion draait niets', (await p2.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)) === 0);

await br.close(); srv.close();
console.log(fails ? `\nMOTION: ${fails} GEFAALD` : '\nMOTION: ALLES GROEN');
process.exit(fails ? 1 : 0);
