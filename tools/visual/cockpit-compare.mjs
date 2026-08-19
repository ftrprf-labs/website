// Pixelvergelijking tussen twee mappen met renders. Geen extra afhankelijkheden:
// het decoderen en vergelijken gebeurt in Chromium zelf, via canvas.
//
//   node tools/visual/cockpit-compare.mjs cockpit-baseline cockpit-after

import { chromium } from 'playwright';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HERE = resolve(import.meta.dirname);
const A = join(HERE, process.argv[2] || 'cockpit-baseline');
const B = join(HERE, process.argv[3] || 'cockpit-after');
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const files = readdirSync(A).filter((f) => f.endsWith('.png')).sort();
const browser = await chromium.launch(existsSync(LOCAL) ? { executablePath: LOCAL } : {});
const page = await browser.newPage();

let identical = 0, changed = 0, missing = 0;
const rows = [];
for (const f of files) {
  const pb = join(B, f);
  if (!existsSync(pb)) { missing++; rows.push([f, 'ontbreekt', '']); continue; }
  const a = 'data:image/png;base64,' + readFileSync(join(A, f)).toString('base64');
  const b = 'data:image/png;base64,' + readFileSync(pb).toString('base64');
  const r = await page.evaluate(async ([sa, sb]) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [ia, ib] = await Promise.all([load(sa), load(sb)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const px = (img) => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib);
    let diff = 0, maxd = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > 2) diff++;
      if (d > maxd) maxd = d;
    }
    return { w, h, total: w * h, diff, maxd, sizeA: [ia.width, ia.height], sizeB: [ib.width, ib.height] };
  }, [a, b]);
  if (r.diff === 0) { identical++; rows.push([f, 'identiek', '']); }
  else { changed++; rows.push([f, `${(100 * r.diff / r.total).toFixed(1)}% pixels`, `max kanaaldelta ${r.maxd}, ${r.sizeA.join('x')} -> ${r.sizeB.join('x')}`]); }
}
await browser.close();

for (const [f, s, extra] of rows) console.log(`${f.padEnd(42)} ${s.padEnd(16)} ${extra}`);
console.log(`\n${files.length} renders: ${identical} identiek, ${changed} gewijzigd, ${missing} ontbrekend`);
