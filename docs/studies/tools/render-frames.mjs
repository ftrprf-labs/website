// Rendert de frames van de bevroren referentie naar PNG bestanden.
// Bron: seal-reference.js. Uitvoer: docs/studies/assets/frames/*.png
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../assets/frames');
mkdirSync(out, { recursive: true });

const ref = readFileSync(resolve(here, 'seal-reference.js'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
await page.setContent('<canvas id="c" width="300" height="300"></canvas>');
await page.addScriptTag({ content: ref });

const SPEC = await page.evaluate(() => window.MaculisSeal.SPEC);
const times = [0];
for (let t = SPEC.appear; t <= SPEC.motionEnd - 0.05; t += 1 / SPEC.fps) times.push(Math.round(t * 100) / 100);

const data = await page.evaluate((ts) => {
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  return ts.map(t => {
    ctx.clearRect(0, 0, 300, 300);
    window.MaculisSeal.draw(ctx, t, 2);
    return cv.toDataURL('image/png');
  });
}, times);

times.forEach((t, i) => {
  const buf = Buffer.from(data[i].split(',')[1], 'base64');
  writeFileSync(`${out}/f${String(i).padStart(3, '0')}_t${t.toFixed(2)}.png`, buf);
});
writeFileSync(`${out}/times.json`, JSON.stringify({ times, spec: SPEC }, null, 2));
console.log(`frames: ${times.length}, van t=${times[0]} tot t=${times[times.length-1]}`);
await browser.close();
