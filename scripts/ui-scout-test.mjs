// UI test for the Scout cockpit-header UX (point 10). Self-contained: a mock server serves the real
// public/ client and stubs /api/* — no database, no network egress, no live Scout. Drives Chromium
// via the globally installed Playwright. Run: node scripts/ui-scout-test.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Playwright is installed globally in this environment; fall back to the global path if the project
// does not resolve it locally.
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const CHROME_BIN = process.env.PW_CHROMIUM_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

// ---- mock state + Scout work item that appears only AFTER a run ------------------------------
let authed = false;
let ranScout = false;
const scoutCard = () => ({
  who: 'TopzorgGroep', org: 'TopzorgGroep', channel: null, contactId: null, conversationId: null,
  hasPrepared: false, secondary: [], followUps: [],
  primary: { reason: 'Mogelijke nieuwe relatie om te bekijken.', needs: 'awareness', origin: { kind: 'AGENT', key: 'scout', label: 'Scout' } },
  work: [{
    id: 'attn-1', kind: 'work', type: 'AGENT_PROPOSAL', needs: 'awareness', bucket: 'RADAR',
    origin: { kind: 'AGENT', key: 'scout', label: 'Scout' }, owner: { kind: 'HUMAN', key: null },
    who: 'TopzorgGroep', org: 'TopzorgGroep',
    proposedRelation: { name: 'TopzorgGroep', org: 'TopzorgGroep', domain: 'topzorggroep.nl' },
    proposal: { summary: 'Scout ziet iets dat kan passen. Wil je dit bekijken? De identiteit is nog niet bevestigd.', needs: 'awareness' },
    actions: ['view', 'approve', 'reject'],
    evidence: {
      fitConfidence: 0.35, identityStatus: 'probable', decision: 'awareness',
      observations: [
        { kind: 'FACT', provided: true, text: 'Aangedragen domein: topzorggroep.nl' },
        { kind: 'OBSERVATION', text: 'Publieke positionering op de website.', source: 'company-website', url: 'https://topzorggroep.nl/' },
        { kind: 'INFERENCE', text: 'Mogelijk relevant.' },
        { kind: 'HYPOTHESIS', text: 'Identiteit waarschijnlijk maar niet officieel bevestigd.' },
      ],
      external: [{ kind: 'OBSERVATION', text: 'Publieke positionering op de website.', source: 'company-website', url: 'https://topzorggroep.nl/' }],
      facts: [], inferences: [], hypotheses: [],
    },
  }],
});
// Some filler radar cards so Vandaag is tall enough to scroll.
const filler = (n) => Array.from({ length: n }, (_, i) => ({
  who: `Relatie ${i + 1}`, org: null, channel: 'EMAIL', contactId: `c${i}`, conversationId: null,
  hasPrepared: false, secondary: [], followUps: [], work: [],
  primary: { reason: `Reden ${i + 1} dat dit meespeelt.`, needs: 'awareness', origin: { kind: 'HUMAN' } },
}));

function today() {
  const radar = [...filler(8)];
  if (ranScout) radar.unshift(scoutCard());
  return { headline: { primary: 'Goedemorgen.', secondary: 'Een paar dingen spelen.', zero: false },
    counts: { nu: 0, klaar: 0, radar: radar.length }, buckets: { NU: [], KLAAR: [], RADAR: radar }, dataGaps: [], source: 'test' };
}

function sendJson(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/cockpit/config') return sendJson(res, 200, { commEnabled: true, authed, agentsEnabled: true, emailOnly: true, mailConfigured: false, slice: 'slice-5' });
  if (pathname === '/api/login' && req.method === 'POST') { authed = true; return sendJson(res, 200, { ok: true }); }
  if (pathname === '/api/cockpit/today') return sendJson(res, 200, today());
  if (pathname === '/api/agents/scout/run' && req.method === 'POST') { ranScout = true; return sendJson(res, 200, { ok: true, recorded: 1, runId: 'r1', landed: [{ id: 'attn-1', deduped: false, key: 'topzorggroep.nl' }] }); }
  if (pathname.startsWith('/api/cockpit/work/')) return sendJson(res, 200, { ok: true });
  // static
  let rel = pathname === '/' ? '/cockpit-live.html' : pathname;
  try { const data = await readFile(join(PUBLIC, rel)); res.writeHead(200, { 'Content-Type': MIME[extname(rel)] || 'text/plain' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});

const PORT = 5199;
await new Promise((r) => server.listen(PORT, r));

const checks = [];
const ok = (name, cond) => { checks.push({ name, pass: !!cond }); console.log(`${cond ? 'ok  ' : 'FAIL'} - ${name}`); };

const browser = await chromium.launch({ executablePath: CHROME_BIN, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${PORT}/`);

  // login
  await page.fill('#pw', 'x');
  await page.click('button[type=submit]');
  await page.waitForSelector('#ask-scout', { state: 'visible' });
  ok('Vraag Scout entry is visible in the header from Vandaag', await page.isVisible('#ask-scout'));

  // it is NOT part of the attention/work stream
  ok('no Scout input card inside the Vandaag view stream', (await page.locator('#view .scout, #view .ask-scout').count()) === 0);

  // open modal
  await page.click('#ask-scout');
  await page.waitForSelector('#scout-modal', { state: 'visible' });
  ok('modal exposes organisatie/website/context fields', (await page.locator('#sc-name').count()) && (await page.locator('#sc-site').count()) && (await page.locator('#sc-note').count()));

  // capture a Vandaag sentinel + scroll position; run must not move/re-render the page
  const before = await page.evaluate(() => {
    const first = document.querySelector('#view .greet, #view .view-enter');
    if (first) first.setAttribute('data-sentinel', '1');
    const sc = document.scrollingElement; if (sc) sc.scrollTop = 250;
    return { scrollTop: (document.scrollingElement || {}).scrollTop || 0 };
  });

  await page.fill('#sc-name', 'TopzorgGroep');
  await page.fill('#sc-site', 'topzorggroep.nl');
  await page.click('#sc-go');
  await page.waitForSelector('#scout-toast', { state: 'visible' });

  const afterRun = await page.evaluate(() => ({
    sentinelConnected: !!document.querySelector('[data-sentinel="1"]'),
    modalGone: !document.getElementById('scout-modal'),
    scrollTop: (document.scrollingElement || {}).scrollTop || 0,
  }));
  ok('modal closes after the run', afterRun.modalGone);
  ok('Vandaag is NOT re-rendered during the run (no scroll jump)', afterRun.sentinelConnected);
  ok('scroll position is unchanged after the run', Math.abs(afterRun.scrollTop - before.scrollTop) < 3);
  ok('a calm confirmation toast with Bekijk appears', await page.isVisible('.scout-toast .toast-look'));

  // Bekijk jumps to the item
  await page.click('.scout-toast .toast-look');
  await page.waitForSelector('[data-attn-id="attn-1"]');
  await page.waitForTimeout(700); // let the smooth scroll settle
  const reveal = await page.evaluate(() => {
    const n = document.querySelector('[data-attn-id="attn-1"]');
    const card = n && (n.closest('.item') || n);
    const r = card && card.getBoundingClientRect();
    // partially within the viewport (smooth block:center can put a tall card's top just above the fold)
    const inView = r ? (r.top < window.innerHeight && r.bottom > 0) : false;
    return { exists: !!n, landed: !!(card && card.classList.contains('just-landed')), inView };
  });
  ok('Bekijk brings the new Scout item into the page', reveal.exists && reveal.inView);
  ok('the revealed item is highlighted', reveal.landed);

  // identity presentation is human, two-line
  const idMain = await page.locator('[data-attn-id="attn-1"] .assess-id-main').first().textContent();
  const idSub = await page.locator('[data-attn-id="attn-1"] .assess-id-sub').first().textContent();
  ok('identity main line is human', /Identiteit: waarschijnlijk dezelfde organisatie/.test(idMain || ''));
  ok('identity sub line explains it', /Eigen website bevestigd/.test(idSub || ''));
  ok('no technical identity phrasing remains', !/waarschijnlijk, eigen website gezien/.test((idMain || '') + (idSub || '')));

  // evidence epistemic separation still visible
  ok('evidence still shows waarneming (external) + feit', (await page.locator('[data-attn-id="attn-1"] .ev-k.obs').count()) >= 1 && (await page.locator('[data-attn-id="attn-1"] .ev-k.fact').count()) >= 1);

  // mobile viewport: entry usable + modal fits
  const m = await browser.newPage({ viewport: { width: 390, height: 780 } });
  await m.goto(`http://localhost:${PORT}/`);
  // already authed on the server; reloading lands straight in Vandaag
  await m.waitForSelector('#ask-scout', { state: 'visible' });
  ok('mobile: Vraag Scout entry visible', await m.isVisible('#ask-scout'));
  await m.click('#ask-scout');
  await m.waitForSelector('#scout-modal', { state: 'visible' });
  const fits = await m.evaluate(() => { const c = document.querySelector('.scout-modal-card'); const r = c.getBoundingClientRect(); return r.width <= window.innerWidth && r.left >= 0; });
  ok('mobile: modal fits within the viewport', fits);
  await m.close();

  await browser.close();
} finally {
  await browser.close().catch(() => {});
  server.close();
}

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} UI checks passed`);
process.exit(failed.length ? 1 : 0);
