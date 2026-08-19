// Vergelijkt tools/visual/baseline met tools/visual/after.
//
// Geen extra dependencies: de PNG-decode en de pixelvergelijking gebeuren in Chromium
// zelf, via canvas. Dat is precies de engine die de screenshots ook heeft gemaakt.
//
//   node tools/visual/compare.mjs            -> rapport
//   node tools/visual/compare.mjs --expect-zero <patroon>  -> faalt bij elk verschil
//
// De poort "pixeldiff exact nul" is een byte-identieke PNG. Daaronder rapporteren we
// hoeveel pixels verschillen en waar, zodat een verwachte diff beschrijfbaar is.

import { chromium } from 'playwright';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIR = import.meta.dirname;
const A = join(DIR, 'baseline');
const B = join(DIR, 'after');
const expectZero = process.argv.includes('--expect-zero')
  ? process.argv[process.argv.indexOf('--expect-zero') + 1] : null;

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 12);
const names = (await readdir(A)).filter((f) => f.endsWith('.png')).sort();

const browser = await chromium.launch();
const page = await browser.newPage();

async function diff(aBuf, bBuf) {
  return page.evaluate(async ([a, b]) => {
    const load = (d) => new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + d;
    });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = Math.max(ia.width, ib.width), h = Math.max(ia.height, ib.height);
    const px = (img) => {
      const c = new OffscreenCanvas(w, h); const x = c.getContext('2d');
      x.clearRect(0, 0, w, h); x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, w, h).data;
    };
    const pa = px(ia), pb = px(ib);
    let n = 0, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < pa.length; i += 4) {
      if (pa[i] !== pb[i] || pa[i+1] !== pb[i+1] || pa[i+2] !== pb[i+2] || pa[i+3] !== pb[i+3]) {
        n++;
        const p = i / 4, y = Math.floor(p / w), x = p % w;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
      }
    }
    return { n, total: w * h, w, h,
      sizeChanged: ia.width !== ib.width || ia.height !== ib.height,
      dims: { a: [ia.width, ia.height], b: [ib.width, ib.height] },
      box: n ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null };
  }, [aBuf.toString('base64'), bBuf.toString('base64')]);
}

let identical = 0, changed = 0, failures = 0;
const rows = [];

for (const name of names) {
  let bBuf;
  try { bBuf = await readFile(join(B, name)); }
  catch { rows.push([name, 'ONTBREEKT in after', '']); failures++; continue; }
  const aBuf = await readFile(join(A, name));
  if (sha(aBuf) === sha(bBuf)) { identical++; rows.push([name, 'identiek', '']); continue; }
  const d = await diff(aBuf, bBuf);
  changed++;
  const pct = ((d.n / d.total) * 100).toFixed(2);
  const note = d.sizeChanged ? `formaat ${d.dims.a.join('x')} -> ${d.dims.b.join('x')}` : '';
  const box = d.box ? `zone x${d.box.x} y${d.box.y} ${d.box.w}x${d.box.h}` : '';
  rows.push([name, `${d.n} px (${pct}%)`, [note, box].filter(Boolean).join(' · ')]);
  if (expectZero && name.includes(expectZero)) failures++;
}

await browser.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad('bestand', 46)} ${pad('verschil', 20)} details`);
console.log('-'.repeat(100));
for (const [a, b, c] of rows) console.log(`${pad(a, 46)} ${pad(b, 20)} ${c}`);
console.log('-'.repeat(100));
console.log(`identiek: ${identical}   gewijzigd: ${changed}   totaal: ${names.length}`);
if (expectZero) {
  console.log(`poort "exact nul" op patroon "${expectZero}": ${failures ? 'GEFAALD (' + failures + ')' : 'GEHAALD'}`);
  process.exit(failures ? 1 : 0);
}
