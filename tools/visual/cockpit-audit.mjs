// Toegankelijkheids- en canonaudit voor de Maculis Cockpit.
//
// Meet per oppervlak en per viewport: lichtregime en grond, horizontale overflow, focusring op
// elke echte Tab-stop, contrast van statuspillen en tekst, consoleschoonheid, en het gedrag onder
// prefers-reduced-motion. Meet, oordeelt niet over smaak.
//
//   node tools/visual/cockpit-audit.mjs

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import * as F from './cockpit-fixtures.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('not found'); }
});

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
function routeApi(page) {
  return page.route('**/api/**', async (r) => {
    const p = new URL(r.request().url()).pathname;
    const json = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/api/cockpit/config') return json(F.config);
    if (p === '/api/cockpit/today') return json(F.today);
    if (p === '/api/cockpit/relations') return json(F.relations);
    if (p === '/api/cockpit/conversations') return json(F.conversations);
    if (p === '/api/cockpit/actions') return json({ actions: [], count: 0 });
    if (p === '/api/cockpit/work') return json({ work: [], count: 0 });
    if (new RegExp(`^/api/cockpit/relation/${UUID}$`).test(p)) return json(F.relation);
    if (new RegExp(`^/api/cockpit/conversation/${UUID}$`).test(p)) return json(F.conversation);
    return json({ ok: true });
  });
}

const SCENES = [
  { name: 'vandaag', go: async () => {} },
  { name: 'relaties', go: async (p) => { await p.locator('[data-nav="relaties"]').first().dispatchEvent('click'); } },
  { name: 'gesprekken', go: async (p) => { await p.locator('[data-nav="gesprekken"]').first().dispatchEvent('click'); } },
  { name: 'dossier', go: async (p) => { await p.locator('.item.openable').first().dispatchEvent('click'); } },
  { name: 'gesprek', go: async (p) => { await p.locator('.item.openable').first().dispatchEvent('click'); await p.waitForTimeout(250); await p.locator('.dos-now-item .btn-primary').first().dispatchEvent('click'); } },
];
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }, { name: 'mobile', width: 390, height: 844 }];

// ---- contrast -----------------------------------------------------------------------------
function srgb(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function lum([r, g, b]) { return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); }
function parse(css) {
  const m = String(css).match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x));
  return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
}
function over(fg, bg) { return fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a)); }
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }

const results = [];
const fail = (s) => results.push({ ok: false, msg: s });
const pass = (s) => results.push({ ok: true, msg: s });

async function main() {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(LOCAL) ? { executablePath: LOCAL } : {});

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', colorScheme: 'dark' });
    for (const scene of SCENES) {
      const page = await ctx.newPage();
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', (e) => errs.push(String(e)));
      await routeApi(page);
      await page.goto(`${base}/cockpit-live.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      try { await scene.go(page); } catch { /* scene unreachable at this width */ }
      await page.waitForTimeout(400);
      const tag = `${scene.name}/${vp.name}`;

      // 1. Lichtregime en grond
      const regime = await page.evaluate(() => {
        const html = document.documentElement;
        const shell = document.getElementById('shell');
        const cs = getComputedStyle(document.body);
        const shellBg = shell ? getComputedStyle(shell).backgroundColor : null;
        const main = document.querySelector('.main');
        return {
          htmlRegime: html.getAttribute('data-maculis-regime'),
          space: shell && shell.getAttribute('data-space'),
          bodyBg: cs.backgroundColor,
          shellBg,
          mainBg: main ? getComputedStyle(main).backgroundColor : null,
          railBg: document.querySelector('.rail') ? getComputedStyle(document.querySelector('.rail')).backgroundColor : null,
          regimeNodes: document.querySelectorAll('[data-maculis-regime]').length,
        };
      });
      if (regime.htmlRegime === 'worklight') pass(`${tag}: regime worklight`);
      else fail(`${tag}: regime is "${regime.htmlRegime}", canon 14 eist worklight`);
      if (regime.shellBg === 'rgb(8, 5, 3)') pass(`${tag}: grond ink.950 #080503`);
      else fail(`${tag}: grond ${regime.shellBg}, canon 5 eist rgb(8, 5, 3)`);
      if (regime.regimeNodes === 1) pass(`${tag}: precies een regimeknoop`);
      else fail(`${tag}: ${regime.regimeNodes} regimeknopen, canon 5 eist er een`);

      // 2. Horizontale overflow
      const ox = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
      if (ox === 0) pass(`${tag}: geen horizontale overflow`); else fail(`${tag}: ${ox}px horizontale overflow`);

      // 3. Focusring op elke echte Tab-stop
      const focus = await page.evaluate(() => {
        const vis = (n) => { const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const stops = [...document.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(vis);
        let missing = 0;
        for (const n of stops) {
          n.focus();
          const s = getComputedStyle(n);
          const has = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)
            || s.boxShadow !== 'none' || getComputedStyle(n, ':focus-visible').outlineStyle !== 'none';
          if (!has) missing++;
        }
        document.activeElement && document.activeElement.blur();
        return { total: stops.length, missing };
      });
      if (focus.missing === 0) pass(`${tag}: ${focus.total} Tab-stops, alle met focusring`);
      else fail(`${tag}: ${focus.missing} van ${focus.total} Tab-stops zonder focusring`);

      // 4. Contrast van pillen, chips en tekst tegen hun eigen achtergrond
      const samples = await page.evaluate(() => {
        const sel = '.chip,.intent-chip,.ev-k,.dos-stage,.work-demo,.mem-ai,.mem-conf,.fu-k,.prov,.line,.echo,.who,.muted,.dos-sub,.lead-note,.eyebrow-line,.moves-h,.assess-k,.assess-v,.ev-src,.ev-foot';
        const out = [];
        const bgOf = (n) => { let p = n; while (p) { const c = getComputedStyle(p).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)/.test(c)) return c; p = p.parentElement; } return 'rgb(0,0,0)'; };
        document.querySelectorAll(sel).forEach((n) => {
          const r = n.getBoundingClientRect(); if (!r.width || !r.height) return;
          const s = getComputedStyle(n);
          out.push({ cls: n.className, color: s.color, bg: bgOf(n), size: parseFloat(s.fontSize), weight: s.fontWeight });
        });
        return out;
      });
      let low = 0;
      for (const s of samples) {
        const fg = parse(s.color); const bg = parse(s.bg);
        if (!fg || !bg) continue;
        const c = ratio(over(fg, bg.rgb), bg.rgb);
        const large = s.size >= 24 || (s.size >= 18.66 && Number(s.weight) >= 700);
        if (c < (large ? 3 : 4.5)) { low++; if (low <= 6) fail(`${tag}: contrast ${c.toFixed(2)} op .${String(s.cls).split(' ')[0]} (${s.size}px)`); }
      }
      if (low === 0) pass(`${tag}: ${samples.length} tekst- en pilmonsters, alle AA`);
      else fail(`${tag}: ${low} van ${samples.length} monsters onder AA`);

      // 5. Console
      if (errs.length === 0) pass(`${tag}: console schoon`); else fail(`${tag}: ${errs.length} consolefouten: ${errs[0].slice(0, 90)}`);
      await page.close();
    }
    await ctx.close();
  }

  // 6. Reduced motion: geen lopende animatie, niets onzichtbaar door een niet-gestarte animatie
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', locale: 'nl-NL', colorScheme: 'dark' });
  for (const scene of SCENES) {
    const page = await rctx.newPage();
    await routeApi(page);
    await page.goto(`${base}/cockpit-live.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    try { await scene.go(page); } catch { /* unreachable */ }
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      let running = 0, invisible = 0, infinite = 0;
      document.querySelectorAll('*').forEach((n) => {
        const s = getComputedStyle(n);
        if (s.animationName !== 'none' && s.animationPlayState === 'running' && parseFloat(s.animationDuration) > 0) running++;
        if (s.animationIterationCount === 'infinite' && s.animationName !== 'none') infinite++;
        const r = n.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && parseFloat(s.opacity) === 0 && s.animationName !== 'none') invisible++;
      });
      return { running, invisible, infinite };
    });
    const tag = `${scene.name}/reduce`;
    if (m.running === 0) pass(`${tag}: 0 lopende animaties`); else fail(`${tag}: ${m.running} lopende animaties`);
    if (m.infinite === 0) pass(`${tag}: 0 oneindige lussen`); else fail(`${tag}: ${m.infinite} oneindige lussen`);
    if (m.invisible === 0) pass(`${tag}: niets onzichtbaar door een niet-gestarte animatie`); else fail(`${tag}: ${m.invisible} elementen op opacity 0`);
    await page.close();
  }
  await rctx.close();

  await browser.close(); server.close();

  const bad = results.filter((r) => !r.ok);
  console.log(`AUDIT — Maculis Cockpit: ${results.length} controles, ${bad.length} afwijkingen\n`);
  for (const r of results) console.log(`${r.ok ? 'ok  ' : 'FOUT'}  ${r.msg}`);
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
