// De eerste kamer: hoe Mijn Maculis eruitziet voor iemand die net de Lens heeft afgerond.
//
// Eén organisatie, één gebied, één uitspraak, bron Lens, en zijn eigen antwoord uit de Lens. Dat is
// de toestand waar het V1-acceptatiekader op wordt beoordeeld, en het is precies de toestand die de
// bestaande harness NIET dekt: die draait op zes patronen en meet daarmee een volle kamer.
//
//   node tools/visual/mijn-eerste-kamer.mjs
//
// Meet drie dingen die je niet met een unit test vaststelt:
//   * herkenning: staat zijn eigen zin er, woordelijk, zonder dat hij ergens op moet klikken;
//   * leegte: is er geen enkele bestemming zichtbaar die nergens heen gaat;
//   * uitnodiging: is de vervolgvraag bereikbaar, zodat de kamer geen leeskamer is.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const PORT = 4413;
const OUT = join(import.meta.dirname, 'mijn-eerste-kamer.png');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

// De uitspraak zoals de Lens hem toonde. Woordelijk, want dat is de hele toets.
const ZIN = 'De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.';
const ID = '00000001-0000-4000-8000-000000000001';
const GROND = 'Maculis vond hiervoor 3 aanwijzingen op jullie website.';

const insight = {
  id: ID, title: ZIN, stance: 'reveal', sharing: 'SHARED', attention: true, status: 'new',
  observation: ZIN, meaning: null, basis: null, not_yet_known: null,
  audience: 'ORGANISATIE', source: 'lens', area: 'zichtbaarheid', perspective: 'buitenwereld',
  created_at: '2026-08-20T09:00:00.000Z', updated_at: '2026-08-20T09:00:00.000Z',
  shared_at: '2026-08-20T09:00:00.000Z', developed: false, unshared_development: false,
  evidence_count: 1, recognition: 'deels',
};

const stappen = [];
const stap = (ok, tekst, extra = '') => { stappen.push(ok); console.log(`  [${ok ? 'OK ' : 'FOUT'}] ${tekst}${extra ? ' · ' + extra : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 2,
  locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', reducedMotion: 'reduce',
});
const fouten = [];
page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });

await page.route('**/api/mijn/**', async (r) => {
  const p = new URL(r.request().url()).pathname;
  const j = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
  if (p === '/api/mijn/session') return j({ organization: 'OCEA', user: { label: 'Ludwig Vermeulen', role: 'Klantadmin' } });
  if (p === '/api/mijn/overview') return j({ attention: { id: ID }, counts: {} });
  if (p === '/api/mijn/insights') return j({ insights: [insight] });
  if (p === '/api/mijn/collaboration') return j({ items: [] });
  if (p === '/api/mijn/conversations') return j({ items: [], unread: 0 });
  if (p === `/api/mijn/insights/${ID}`) {
    return j({ insight, evidence: [{ label: GROND, at: '2026-08-20T09:00:00.000Z' }], versions: [] });
  }
  return j({});
});

await page.goto(`http://127.0.0.1:${PORT}/mijn.html?t=eerste-kamer-token-0001`);
await page.waitForTimeout(2500);

const veld = await page.evaluate(() => document.body.innerText);

// 1. herkenning, op het scherm waar hij LANDT (het veld), zonder dat hij ergens op hoeft te tikken
stap(veld.includes('Ludwig'), 'hij wordt bij naam begroet');
stap(veld.includes(ZIN), 'zijn eigen zin staat er meteen, zonder tikken');
stap(veld.includes('bewaren') || veld.includes('Maculis tot nu toe'), 'er staat waarom deze kamer bestaat');

// Daarna tikt hij op de ster. Met één patroon staat die midden in het veld; we zoeken hem op door
// het helderste punt op het canvas te nemen, precies zoals de affordance-harness dat doet.
const punt = await page.evaluate(() => {
  const c = document.getElementById('veld');
  const r = c.getBoundingClientRect();
  const ctx = c.getContext('2d');
  const img = ctx.getImageData(0, 0, c.width, c.height).data;
  let best = -1; let bx = 0; let by = 0;
  const schaal = c.width / r.width;
  for (let y = 0; y < c.height; y += 4) {
    for (let x = 0; x < c.width; x += 4) {
      const i = (y * c.width + x) * 4;
      const l = img[i] + img[i + 1] + img[i + 2];
      if (l > best) { best = l; bx = x; by = y; }
    }
  }
  return [r.left + bx / schaal, r.top + by / schaal];
});
await page.mouse.click(punt[0], punt[1]);
await page.waitForTimeout(600);
const bewijsOpen = await page.evaluate(() => {
  const el = document.getElementById('bewijs');
  return Boolean(el) && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
});
stap(bewijsOpen, 'één tik op de ster opent het bewijs', punt.map(Math.round).join(', '));
const tekst = await page.evaluate(() => document.body.innerText);

stap(veld.includes('OCEA'), 'zijn eigen organisatie staat er');

// 2. geen leegte
const zichtbaar = async (id) => page.evaluate((i) => {
  const el = document.getElementById(i);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
}, id);
for (const [id, naam] of [['btn-patronen', 'Alle patronen'], ['btn-blind', 'Wat zie ik niet'], ['btn-samen', 'Samenwerking'], ['btn-gesprekken', 'Gesprekken']]) {
  // eslint-disable-next-line no-await-in-loop
  stap(!(await zichtbaar(id)), `bestemming "${naam}" is niet zichtbaar, want hij gaat nergens heen`);
}
stap(await zichtbaar('btn-opnieuw'), 'Opnieuw blijft wel staan, want die werkt altijd');

// 3. de kamer nodigt uit
stap(tekst.includes('Herken je dit'), 'de herkenningsvraag staat er');
stap(tekst.includes('Wil je hier iets mee'), 'en de vervolgvraag, dus het is geen leeskamer');
stap(tekst.includes('Deze antwoorden gaf je') || tekst.includes('Deels'), 'zijn eigen antwoord uit de Lens is zichtbaar');

// 4. bron
stap(/lens/i.test(tekst), 'de bron wordt genoemd');

stap(fouten.length === 0, 'geen console errors', fouten.length ? fouten[0] : 'nul');

await page.screenshot({ path: OUT, fullPage: false });
// Ook het scherm waar hij LANDT, want dat is het scherm waarop de herkenning wordt beoordeeld.
await page.evaluate(() => { const b = document.getElementById('btn-sluit'); if (b) b.click(); });
await page.waitForTimeout(600);
await page.screenshot({ path: OUT.replace('.png', '-veld.png'), fullPage: false });
console.log(`\n  schermafbeelding: ${OUT}`);
await browser.close();
server.close();

const rood = stappen.filter((s) => !s).length;
console.log(`\n${rood ? 'ROOD: ' + rood + ' van ' + stappen.length : 'EERSTE KAMER: ALLES GROEN'}\n`);
process.exit(rood ? 1 : 0);
