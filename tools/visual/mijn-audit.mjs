// Toegankelijkheids-, contrast-, overflow-, console- en reduced-motion-audit voor Mijn Maculis.
//
//   node tools/visual/mijn-audit.mjs
//
// Focus wordt met echte Tab-navigatie gemeten: el.focus() triggert :focus-visible niet
// voor knoppen en links. Contrast wordt gemeten op de werkelijk berekende kleuren, dus
// inclusief de ondergrond die het element feitelijk krijgt.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const PORT = 4412;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml' };

const srv = http.createServer(async (q, r) => {
  try {
    const b = await readFile(join(PUBLIC, decodeURIComponent(new URL(q.url, 'http://x').pathname)));
    r.writeHead(200, { 'content-type': MIME[extname(q.url.split('?')[0])] || 'application/octet-stream' });
    r.end(b);
  } catch { r.writeHead(404); r.end(); }
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const lum = (s) => {
  const c = s.match(/[\d.]+/g).slice(0, 3).map((x) => x / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const CR = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let fails = 0;
const chk = (l, c, d = '') => { if (!c) fails++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };

const route = (page) => page.route('**/api/mijn/**', async (r) => {
  const p = new URL(r.request().url()).pathname;
  const j = (b, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
  if (p === '/api/mijn/session') return j(F.session);
  if (p === '/api/mijn/overview') return j(F.overview);
  if (p === '/api/mijn/insights') return j({ insights: F.insights });
  if (p === '/api/mijn/collaboration') return j({ items: F.collaborationItems });
  const m = p.match(/^\/api\/mijn\/insights\/([^/]+)$/);
  if (m) { const d = F.detail(m[1]); return d ? j(d) : j({ error: 'nope' }, 404); }
  return j({});
});

const SCREENS = [
  { name: 'overzicht', hash: '#/overzicht', wait: '.hero h2' },
  { name: 'spiegel', hash: '#/inzichten', wait: '.icard, .spiegel-hero' },
  { name: 'detail', hash: `#/inzicht/${F.insights[1].id}`, wait: '.detail h2' },
  { name: 'samenwerking', hash: '#/samenwerking', wait: '.glance-row' },
];
const BASE = `http://127.0.0.1:${PORT}`;
const url = (hash) => `${BASE}/mijn.html?t=${F.TOKEN}${hash}`;

const br = await chromium.launch();

// ---- regime en grond -----------------------------------------------------------------
{
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const p = await ctx.newPage(); await route(p);
  await p.goto(url('#/overzicht'), { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  console.log('\n=== regime ===');
  const regime = await p.getAttribute('html', 'data-maculis-regime');
  chk('regime is day', regime === 'day', String(regime));
  const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  chk('grond is ink.50 perkament', bg === 'rgb(247, 241, 230)', bg);
  const serif = await p.evaluate(() => {
    const h = document.querySelector('.hero h2') || document.querySelector('h2');
    return h ? getComputedStyle(h).fontFamily : '';
  });
  chk('Uitspraak staat op Newsreader', /Newsreader/i.test(serif), serif);
  const ease = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--motion-ease').trim());
  chk('canonieke curve beschikbaar', ease === 'cubic-bezier(.22,.61,.36,1)', ease || 'ontbreekt');
  await ctx.close();
}

// ---- per scherm en per viewport -------------------------------------------------------
for (const vp of [{ n: 'desktop 1280', w: 1280, h: 800 }, { n: 'mobiel 390', w: 390, h: 844 }]) {
  console.log(`\n=== ${vp.n} ===`);
  const ctx = await br.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('requestfailed', (r) => errs.push('request failed: ' + r.url()));
  await route(p);

  for (const s of SCREENS) {
    await p.goto(url(s.hash), { waitUntil: 'networkidle' });
    await p.waitForSelector(s.wait, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(300);

    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    chk(`geen horizontale overflow · ${s.name}`, ov <= 0, ov + 'px');

    // Alle tekst tegen zijn feitelijke ondergrond. AA voor kleine tekst is 4,5:1,
    // grote tekst (>=24px, of >=18.66px vet) mag op 3:1.
    const texts = await p.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll('body *')) {
        if (!e.offsetParent && e.tagName !== 'BODY') continue;
        const direct = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!direct) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
        // Effectieve ondergrond, correct samengesteld. Een vlak kan doorzichtig zijn,
        // een halfdoorzichtige laag dragen of zijn kleur uit een gradient halen. We stapelen
        // daarom van onder naar boven: eerst de ondergrond van de ouder, daarna elke
        // achtergrondlaag van dit element (de laatste in de lijst wordt als eerste geschilderd).
        const parse = (c) => {
          const m = c && c.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const n2 = m[1].split(',').map((x) => parseFloat(x));
          return { r: n2[0], g: n2[1], b: n2[2], a: n2.length > 3 ? n2[3] : 1 };
        };
        const over = (top, base) => top.a >= 1 ? { ...top, a: 1 } : {
          r: top.r * top.a + base.r * (1 - top.a),
          g: top.g * top.a + base.g * (1 - top.a),
          b: top.b * top.a + base.b * (1 - top.a), a: 1,
        };
        // Haakjesbewuste splitsing van de lagenlijst.
        const layersOf = (img) => {
          const out2 = []; let depth = 0, cur = '';
          for (const ch of img) {
            if (ch === '(') depth++;
            if (ch === ')') depth--;
            if (ch === ',' && depth === 0) { out2.push(cur); cur = ''; continue; }
            cur += ch;
          }
          if (cur.trim()) out2.push(cur);
          return out2;
        };
        const resolve = (el) => {
          if (!el || el === document.documentElement.parentNode) return { r: 255, g: 255, b: 255, a: 1 };
          let acc = el === document.documentElement ? { r: 255, g: 255, b: 255, a: 1 } : resolve(el.parentElement || document.documentElement);
          const cs2 = getComputedStyle(el);
          const img = cs2.backgroundImage;
          if (img && img !== 'none') {
            const layers = layersOf(img);
            for (let k = layers.length - 1; k >= 0; k--) {
              // Een lichtpunt van een paar pixels is geen ondergrond van de tekst. Zulke
              // decoratieve puntgradients slaan we over, anders meten we een kleur die
              // op de plek van de letters helemaal niet ligt.
              const tiny = /radial-gradient\(\s*([\d.]+)px/.exec(layers[k]);
              if (tiny && parseFloat(tiny[1]) < 8) continue;
              const c = parse(layers[k]);   // eerste kleurstop als representant van de laag
              if (c) acc = over(c, acc);
            }
          }
          const bc = parse(cs2.backgroundColor);
          if (bc && bc.a > 0) acc = over(bc, acc);
          return acc;
        };
        const c0 = resolve(e);
        const bg = `rgb(${Math.round(c0.r)}, ${Math.round(c0.g)}, ${Math.round(c0.b)})`;
        const size = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight, 10) >= 700;
        out.push({
          t: e.textContent.trim().slice(0, 34),
          fg: cs.color, bg,
          large: size >= 24 || (bold && size >= 18.66),
        });
      }
      return out;
    });
    const bad = texts.filter((q) => CR(q.fg, q.bg) < (q.large ? 3 : 4.5))
      .map((q) => `"${q.t}" ${CR(q.fg, q.bg).toFixed(2)}`);
    chk(`alle ${texts.length} tekstelementen halen AA · ${s.name}`, bad.length === 0, bad.slice(0, 4).join(' | ') || 'laagste ok');

    // Echte Tab-navigatie.
    await p.evaluate(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); });
    let stops = 0; const missing = []; const seen = new Set();
    for (let i = 0; i < 60; i++) {
      await p.keyboard.press('Tab');
      const info = await p.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const s2 = getComputedStyle(e);
        return { k: e.tagName + '.' + (String(e.className || '').split(' ')[0] || '-'),
          ring: s2.outlineStyle !== 'none' && parseFloat(s2.outlineWidth) > 0 };
      });
      if (!info) break;
      if (seen.has(info.k + i)) continue;
      seen.add(info.k + i); stops++;
      if (!info.ring) missing.push(info.k);
    }
    chk(`elke Tab-stop heeft een focusring (${stops}) · ${s.name}`, stops > 0 && missing.length === 0,
      stops === 0 ? 'GEEN stops, check ongeldig' : ([...new Set(missing)].join(', ') || 'alle'));
  }
  chk('geen console errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'nul');
  await ctx.close();
}

// ---- reduced motion -------------------------------------------------------------------
console.log('\n=== reduced motion ===');
for (const s of SCREENS) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam' });
  const p = await ctx.newPage(); await route(p);
  await p.goto(url(s.hash), { waitUntil: 'networkidle' });
  await p.waitForSelector(s.wait, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(400);
  const anim = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  chk(`geen lopende animatie · ${s.name}`, anim === 0, anim + ' actief');
  const hidden = await p.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).opacity) === 0).length);
  chk(`niets onzichtbaar door een niet-gestarte animatie · ${s.name}`, hidden === 0, hidden + ' op opacity 0');
  await ctx.close();
}

await br.close(); srv.close();
console.log(fails ? `\nAUDIT: ${fails} GEFAALD` : '\nAUDIT: ALLES GROEN');
process.exit(fails ? 1 : 0);
