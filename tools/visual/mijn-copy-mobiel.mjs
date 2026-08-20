// Past het paar "Gedeeld met Maculis" en "Niet gedeeld met Maculis" rustig op een telefoon?
//
//   node tools/visual/mijn-copy-mobiel.mjs
//
// De staat van dimensie B staat op twee plekken: als merkje naast de houdingspil in Alle patronen,
// en als regel boven de grensuitleg in het bewijsblad. Het merkje is de krappe: het deelt een
// regel met de pil en de lijst is smal. "Rustig passen" is hier geen smaak maar vier metingen:
//
//   1. de tekst breekt niet af binnen het merkje zelf, dus het merkje blijft één regel hoog;
//   2. het merkje overlapt de houdingspil niet;
//   3. de lijst en de kop schuiven niet horizontaal, dus niets valt buiten het scherm;
//   4. dezelfde drie eisen gelden voor de staatregel in het bewijsblad.
//
// Naast de pil valt een merkje soms naar een tweede regel. Dat is geen fout: de kop is een
// wrap-flex en een tweede regel is precies wat die hoort te doen. Het telt wel, want het is de
// enige maat waarop een langere tekst zichtbaar duurder is. Daarom meet deze harness het aantal
// omgeslagen merkjes voor het nieuwe paar EN voor het oude paar, op hetzelfde scherm en dezelfde
// lijst. Alleen een verschil dat daar uitkomt is een argument om in te korten.
//
// Alleen als dit aantoonbaar niet haalt, mag het paar naar "Gedeeld" en "Niet gedeeld". En dan
// allebei, want een half ingekort paar leest als een betekenisverschil dat er niet is.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const PUBLIC = join(resolve(import.meta.dirname, '..', '..'), 'public');
const PORT = 4419;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer(async (q, r) => { try { const b = await readFile(join(PUBLIC, decodeURIComponent(new URL(q.url, 'http://x').pathname))); r.writeHead(200, { 'content-type': MIME[extname(q.url.split('?')[0])] || 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

let fout = 0;
const ok = (l, c, d = '') => { if (!c) fout++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };
const br = await chromium.launch();

// Eén regel hoog: de gemeten hoogte blijft binnen anderhalve regelhoogte van de eigen tekst.
const REGEL = (el) => el.evaluate((e) => {
  const st = getComputedStyle(e);
  const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.2;
  const r = e.getBoundingClientRect();
  const buur = e.previousElementSibling;
  return {
    hoogte: Math.round(r.height * 10) / 10, regel: Math.round(lh * 10) / 10,
    links: Math.round(r.left), rechts: Math.round(r.right), breedte: Math.round(r.width * 10) / 10,
    omslag: Boolean(buur) && r.top >= buur.getBoundingClientRect().bottom - 0.5,
  };
});

// Hetzelfde scherm, dezelfde lijst, alleen andere woorden in de merkjes: hoeveel slaan er om?
// Zo is het verschil tussen het volledige en het korte paar een meting en geen indruk.
const OMSLAG_MET = (page, gedeeld, prive) => page.evaluate(([g, p]) => {
  const items = [...document.querySelectorAll('.pt-item')];
  const oud = items.map((it) => it.querySelector('.merkje').lastChild.textContent);
  items.forEach((it) => { const m = it.querySelector('.merkje'); m.lastChild.textContent = m.classList.contains('gedeeld') ? g : p; });
  void document.body.offsetHeight;
  const n = items.filter((it) => {
    const m = it.querySelector('.merkje').getBoundingClientRect();
    const q = it.querySelector('.pil').getBoundingClientRect();
    return m.top >= q.bottom - 0.5;
  }).length;
  items.forEach((it, i) => { it.querySelector('.merkje').lastChild.textContent = oud[i]; });
  return n;
}, [gedeeld, prive]);

for (const vp of [
  { w: 393, h: 660, n: 'in-app browser 393 x 660' },
  { w: 390, h: 844, n: 'iPhone 390 x 844' },
  { w: 430, h: 932, n: 'iPhone 430 x 932' },
]) {
  console.log(`\n=== ${vp.n} ===`);
  const ctx = await br.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: 'reduce', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const p = await ctx.newPage();
  await F.routeMijn(p, F.maakStore(F.startDraden));
  await p.goto(`http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.zeg.in');

  // ---- 1. het merkje in Alle patronen ----
  await p.click('#btn-patronen'); await p.waitForSelector('.patronen.in'); await p.waitForTimeout(500);

  const items = await p.locator('.pt-item').count();
  let gedeeldGezien = 0, prive = 0, omslag = 0;
  for (let i = 0; i < items; i++) {
    const item = p.locator('.pt-item').nth(i);
    const merk = item.locator('.merkje');
    const pil = item.locator('.pil');
    const tekst = (await merk.textContent()).trim();
    const m = await REGEL(merk); const q = await REGEL(pil);
    const kop = await item.locator('.pt-kop').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    const overlap = await item.evaluate((e) => {
      const a = e.querySelector('.pil').getBoundingClientRect(), b = e.querySelector('.merkje').getBoundingClientRect();
      return !(b.left >= a.right - 0.5 || a.left >= b.right - 0.5 || b.top >= a.bottom - 0.5 || a.top >= b.bottom - 0.5);
    });
    if (m.omslag) omslag++;
    if (tekst.startsWith('Gedeeld')) gedeeldGezien++; else prive++;
    ok(`merkje "${tekst}" blijft één regel`, m.hoogte <= m.regel * 1.5, `${m.hoogte}px hoog, regel ${m.regel}px, breed ${m.breedte}px`);
    ok(`merkje "${tekst}" overlapt de houdingspil niet`, !overlap,
      m.omslag ? `staat op een tweede regel onder de pil` : `naast de pil, die loopt tot ${q.rechts}px`);
    ok(`de kop van dit patroon schuift niet horizontaal`, kop.sw <= kop.cw + 1, `scrollWidth ${kop.sw}, clientWidth ${kop.cw}`);
    ok(`merkje "${tekst}" blijft binnen het scherm`, m.rechts <= vp.w, `rechterrand ${m.rechts} van ${vp.w}`);
  }
  ok('beide staten kwamen voor in de lijst', gedeeldGezien > 0 && prive > 0, `${gedeeldGezien} gedeeld, ${prive} niet gedeeld`);
  const kort = await OMSLAG_MET(p, 'Gedeeld', 'Niet gedeeld');
  console.log(`  [MEET] merkjes op een tweede regel: ${omslag} van ${items} met het volledige paar, ${kort} van ${items} met het korte paar`);
  const lijst = await p.locator('#patronen .blad-body').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
  ok('de patronenlijst schuift niet horizontaal', lijst.sw <= lijst.cw + 1, `scrollWidth ${lijst.sw}, clientWidth ${lijst.cw}`);

  // ---- 2. de staatregel in het bewijsblad, in beide staten ----
  for (const [idx, verwacht] of [[0, 'Niet gedeeld met Maculis'], [1, 'Gedeeld met Maculis']]) {
    await p.locator('.pt-item').nth(idx).click();
    await p.waitForSelector('.bewijs.in'); await p.waitForTimeout(900);
    const staat = p.locator('#bw-staat');
    const tekst = (await staat.textContent()).trim();
    const s = await REGEL(staat);
    const rij = await p.locator('#bewijs .grens-staat').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    ok(`de staat in het bewijsblad leest "${tekst}"`, tekst === verwacht, `verwacht "${verwacht}"`);
    ok(`de staatregel blijft één regel`, s.hoogte <= s.regel * 1.5, `${s.hoogte}px hoog, regel ${s.regel}px, breed ${s.breedte}px`);
    ok(`de staatregel schuift niet horizontaal`, rij.sw <= rij.cw + 1, `scrollWidth ${rij.sw}, clientWidth ${rij.cw}`);
    await p.click('#btn-sluit'); await p.waitForTimeout(700);
    await p.click('#btn-patronen'); await p.waitForSelector('.patronen.in'); await p.waitForTimeout(400);
  }
  await ctx.close();
}

await br.close(); srv.close();
console.log(fout ? `\n${fout} fout(en)` : '\nAlles goed');
process.exit(fout ? 1 : 0);
