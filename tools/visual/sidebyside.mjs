// Zet baseline en after naast elkaar in één beeld, met een label erboven.
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const DIR = import.meta.dirname;
const names = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage();
for (const n of names) {
  const a = (await readFile(join(DIR, 'baseline', n + '.png'))).toString('base64');
  const b = (await readFile(join(DIR, 'after', n + '.png'))).toString('base64');
  const out = await page.evaluate(async ([a, b, label]) => {
    const load = (d) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + d; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const GAP = 24, TOP = 44, PAD = 20;
    const w = PAD * 2 + ia.width + GAP + ib.width, h = TOP + Math.max(ia.height, ib.height) + PAD;
    const c = new OffscreenCanvas(w, h), x = c.getContext('2d');
    x.fillStyle = '#0a0b10'; x.fillRect(0, 0, w, h);
    x.font = '600 15px -apple-system, system-ui, sans-serif'; x.fillStyle = '#a89a86';
    x.fillText('VOOR  ' + label, PAD, 28);
    x.fillText('NA  ' + label, PAD + ia.width + GAP, 28);
    x.strokeStyle = 'rgba(200,137,74,.34)'; x.lineWidth = 1;
    x.drawImage(ia, PAD, TOP); x.strokeRect(PAD + .5, TOP + .5, ia.width, ia.height);
    x.drawImage(ib, PAD + ia.width + GAP, TOP); x.strokeRect(PAD + ia.width + GAP + .5, TOP + .5, ib.width, ib.height);
    const blob = await c.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    return Array.from(buf);
  }, [a, b, n]);
  await writeFile(join(DIR, 'compare-' + n + '.png'), Buffer.from(out));
  console.log('geschreven: compare-' + n + '.png');
}
await browser.close();
