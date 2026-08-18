// Rendert de kleine merkonderdelen die in e-mail geen levende tekst kunnen zijn:
// het woordmerk met zijn ster, de drie contacticonen en de violette ster.
// Alles op 2x voor retina, met echte transparantie (PNG, geen GIF).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../assets');
mkdirSync(out, { recursive: true });
const fontCss = readFileSync(process.env.FONT_CSS, 'utf8');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
await page.setContent('<canvas id="c"></canvas>');
await page.addStyleTag({ content: fontCss });
await page.evaluate(() => document.fonts.load('300 32px Newsreader').then(() => document.fonts.ready));

const marks = await page.evaluate(() => {
  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const COPPER_LIT = '#e6b98d', VIOLET = '#7c4dff', ICON = '#9a9186';
  const S = 2;
  const res = {};

  function star(c, x, y, s){
    const ly = s, lx = s*0.60, k = s*0.045;
    c.beginPath();
    c.moveTo(x, y-ly);
    c.quadraticCurveTo(x+k, y-k, x+lx, y);
    c.quadraticCurveTo(x+k, y+k, x, y+ly);
    c.quadraticCurveTo(x-k, y+k, x-lx, y);
    c.quadraticCurveTo(x-k, y-k, x, y-ly);
    c.closePath();
  }
  // De eindstop krijgt dezelfde kleurtoon met alfa nul. Een transparant zwart
  // eindpunt geeft een donkere rand rond de ster op een transparante achtergrond.
  function glow(c, x, y, r, rgb, a0){
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a0})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.save(); c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); c.restore();
  }

  // Woordmerk
  ctx.font = '300 32px Newsreader, Georgia, serif';
  const w = ctx.measureText('maculis').width;
  const box = { w: Math.ceil(w) + 8, h: 50, base: 38, pad: 4 };
  cv.width = box.w * S; cv.height = box.h * S;
  const c = cv.getContext('2d');
  c.scale(S, S);
  c.font = '300 32px Newsreader, Georgia, serif';
  c.fillStyle = COPPER_LIT;
  c.textBaseline = 'alphabetic';
  c.fillText('maculis', box.pad, box.base);
  const sx = box.pad + w*0.845, sy = box.base - 22;
  glow(c, sx, sy, 4.6*2.6, '230,185,141', 0.30);
  c.fillStyle = COPPER_LIT; star(c, sx, sy, 4.6); c.fill();
  res.wordmark = { data: cv.toDataURL('image/png'), w: box.w, h: box.h, text: Math.round(w) };

  // Violette ster bij de regel in wording
  const vb = 30;
  cv.width = vb*S; cv.height = vb*S;
  const v = cv.getContext('2d'); v.scale(S, S);
  glow(v, vb/2, vb/2, 6*2.4, '124,77,255', 0.22);
  v.fillStyle = VIOLET; star(v, vb/2, vb/2, 6); v.fill();
  res.spark = { data: cv.toDataURL('image/png'), w: vb, h: vb };

  // Contacticonen, identiek aan ontwerp 1
  const paths = {
    mail: ['M1 3h11v7H1z', 'M1 3.6 6.5 7 12 3.6'],
    globe: ['M1 6.5a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0', 'M1 6.5h11', 'M6.5 1a9 9 0 0 1 0 11 9 9 0 0 1 0-11'],
    pin: ['M6.5 12S11 8.2 11 5.2A4.5 4.5 0 0 0 2 5.2C2 8.2 6.5 12 6.5 12z', 'M4.9 5.1a1.6 1.6 0 1 0 3.2 0 1.6 1.6 0 1 0-3.2 0']
  };
  for (const [name, ds] of Object.entries(paths)){
    cv.width = 13*S; cv.height = 13*S;
    const ic = cv.getContext('2d'); ic.scale(S, S);
    ic.strokeStyle = ICON; ic.lineWidth = 1; ic.lineJoin = 'round'; ic.globalAlpha = 0.62;
    ds.forEach(d => ic.stroke(new Path2D(d)));
    res['icon_' + name] = { data: cv.toDataURL('image/png'), w: 13, h: 13 };
  }
  return res;
});

const manifest = {};
for (const [k, v] of Object.entries(marks)){
  const file = `maculis-${k.replace('_', '-')}-v1.png`;
  const buf = Buffer.from(v.data.split(',')[1], 'base64');
  writeFileSync(resolve(out, file), buf);
  manifest[k] = { file, w: v.w, h: v.h, bytes: buf.length };
  console.log(`${file.padEnd(34)} ${v.w} bij ${v.h} css, ${buf.length} bytes`);
}
writeFileSync(resolve(out, 'marks.json'), JSON.stringify(manifest, null, 2));
await browser.close();
