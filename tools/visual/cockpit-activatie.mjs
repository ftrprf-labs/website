// De actiekaart in Cockpit Vandaag: de ene menselijke bevestiging.
//
//   node tools/visual/cockpit-activatie.mjs
//
// Geen unit test: dit laadt de echte cockpit-live.html in een browser met een gestubde
// /api/cockpit/today, en meet wat een medewerker werkelijk ziet en kan aanraken. Precies het deel
// dat een test op de server nooit vaststelt.
//
// Vier vragen, en alle vier zijn het grenzen:
//   * staat de uitspraak er woordelijk, zonder dat iemand ergens op moet klikken;
//   * biedt de kaart alleen kanalen aan die werkelijk kunnen bezorgen;
//   * verdwijnt de activatieknop wanneer iemand geen toestemming gaf om benaderd te worden;
//   * gaat er bij één klik precies één verzoek uit, met het gekozen kanaal erin.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const PORT = 4419;

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

const ZIN = 'De expertise van Topzorggroep lijkt online minder zichtbaar dan de werkelijkheid.';
const KAMER_ID = '00000002-0000-4000-8000-000000000002';

function kaart({ status = 'klaargezet', kanalen, type = 'MIJN_ROOM_READY', bucket = 'KLAAR' } = {}) {
  return {
    key: 'c:kim', kind: 'kamer', bucket, contactId: 'kim-contact-id', conversationId: null,
    who: 'Kim Mertens', org: 'Topzorggroep', channel: null,
    primary: { type, reason: 'Kim vroeg om dit te bewaren. De persoonlijke omgeving staat klaar.', source: 'FIRST_LENS', priority: 60, origin: null, needs: null },
    secondary: [], followUps: [], work: [],
    kamer: { id: KAMER_ID, status, uitspraak: ZIN, kanalen, herhaling: false },
    hasPrepared: false, priority: 60, relevantAt: '2026-08-21T09:00:00.000Z', provenance: [],
  };
}

const stappen = [];
const stap = (ok, tekst, extra = '') => { stappen.push(ok); console.log(`  [${ok ? 'OK ' : 'FOUT'}] ${tekst}${extra ? ' · ' + extra : ''}`); };

const browser = await chromium.launch();
const fouten = [];

async function open({ kaarten, sync = { ok: true } }) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 }, locale: 'nl-NL', timezoneId: 'Europe/Amsterdam', reducedMotion: 'reduce',
  });
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
  const verzonden = [];
  await page.route('**/api/**', async (r) => {
    const req = r.request();
    const p = new URL(req.url()).pathname;
    const j = (b) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (p === '/api/cockpit/config') return j({ commEnabled: true, authed: true, emailOnly: true, mailConfigured: false, agentsEnabled: false, slice: 'slice-5' });
    if (p === '/api/cockpit/today') {
      return j({
        headline: { primary: 'Geen nieuwe vragen.', secondary: 'Wel werk dat Maculis voor je klaarzette.', zero: false },
        sync,
        privacy: { count: 0 },
        counts: { nu: 0, klaar: kaarten.length, radar: 0, work: 0, kamers: kaarten.length },
        buckets: { NU: [], KLAAR: kaarten, RADAR: [] },
        dataGaps: [], quietThresholdDays: 45, source: 'communication-layer/radar',
      });
    }
    if (/\/api\/comm\/mijn\/kamers\/.+\/uitnodigen$/.test(p)) {
      verzonden.push(JSON.parse(req.postData() || '{}'));
      return j({ ok: true, bezorging: 'email', herhaling: false, link: null });
    }
    return j({});
  });
  await page.goto(`http://127.0.0.1:${PORT}/cockpit-live.html`);
  await page.waitForTimeout(1200);
  return { page, verzonden };
}

// ---- 1. een kamer met één werkend kanaal ------------------------------------------------------
{
  const { page, verzonden } = await open({ kaarten: [kaart({
    kanalen: [{ kanaal: 'WHATSAPP', mogelijk: false, reden: 'geen_toestemming' }, { kanaal: 'EMAIL', mogelijk: true, reden: 'ok' }],
  })] });
  const tekst = await page.evaluate(() => document.body.innerText);
  stap(tekst.includes('Kim Mertens'), 'de mens staat er bij naam');
  stap(tekst.includes('Topzorggroep'), 'met zijn organisatie');
  stap(tekst.includes(ZIN), 'de uitspraak staat er woordelijk, zonder dat iemand hoeft te klikken');
  stap(/vroeg om dit te bewaren/i.test(tekst), 'en waarom de kaart er staat');

  const knoppen = await page.evaluate(() => [...document.querySelectorAll('.kamer-acties button')].map((b) => b.textContent.trim()));
  stap(knoppen.some((k) => /^bekijk$/i.test(k)), 'Bekijk staat er', knoppen.join(' | '));
  stap(knoppen.some((k) => /activeer via e-mail/i.test(k)), 'Activeer via e-mail staat er');
  stap(!knoppen.some((k) => /activeer via whatsapp/i.test(k)), 'WhatsApp wordt NIET aangeboden zonder toestemming');
  stap(knoppen.some((k) => /^later$/i.test(k)), 'Later staat er');
  stap(/whatsapp/i.test(tekst) && /geen toestemming voor dit kanaal/i.test(tekst),
    'en de reden dat WhatsApp niet kan, staat er eerlijk bij');

  // ---- één klik, precies één verzoek, met het gekozen kanaal erin ----
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.kamer-acties button')].find((x) => /activeer via/i.test(x.textContent));
    b.click();
  });
  await page.waitForTimeout(600);
  stap(verzonden.length === 1, 'één klik levert precies één verzoek', `${verzonden.length}`);
  stap(verzonden[0] && verzonden[0].kanaal === 'EMAIL', 'met het gekozen kanaal erin, niet geraden', JSON.stringify(verzonden[0] || {}));
  await page.close();
}

// ---- 2. bewaren zonder benaderen: geen enkele knop naar buiten --------------------------------
{
  const { page, verzonden } = await open({ kaarten: [kaart({
    status: 'wacht_op_contact', type: 'MIJN_ROOM_WAITING', bucket: 'RADAR',
    kanalen: [{ kanaal: 'WHATSAPP', mogelijk: false, reden: 'geen_adres' }, { kanaal: 'EMAIL', mogelijk: true, reden: 'ok' }],
  })] });
  const knoppen = await page.evaluate(() => [...document.querySelectorAll('.kamerblok button')].map((b) => b.textContent.trim()));
  stap(knoppen.length === 0, 'er is geen enkele knop, ook niet wanneer een kanaal zou kunnen', knoppen.join(' | '));
  const tekst = await page.evaluate(() => document.body.innerText);
  stap(/geen toestemming om benaderd te worden/i.test(tekst), 'zijn keuze staat er in woorden');
  stap(/er gaat niets uit/i.test(tekst), 'en wat dat betekent');
  stap(verzonden.length === 0, 'er gaat niets uit');
  await page.close();
}

// ---- 3. geen enkel kanaal kan bezorgen: de knop belooft niets anders dan wat er gebeurt -------
{
  const { page } = await open({ kaarten: [kaart({
    kanalen: [{ kanaal: 'WHATSAPP', mogelijk: false, reden: 'geen_transport' }, { kanaal: 'EMAIL', mogelijk: false, reden: 'geen_transport' }],
  })] });
  const knoppen = await page.evaluate(() => [...document.querySelectorAll('.kamer-acties button')].map((b) => b.textContent.trim()));
  stap(knoppen.some((k) => /activeer en toon de link/i.test(k)), 'de knop zegt precies wat er gebeurt', knoppen.join(' | '));
  stap(!knoppen.some((k) => /activeer via/i.test(k)), 'en biedt geen kanaal aan dat niets kan bezorgen');
  await page.close();
}

// ---- 4. een storing in de Lens leest nooit als rust -------------------------------------------
{
  const { page } = await open({ kaarten: [], sync: { ok: false, reason: 'timeout' } });
  const tekst = await page.evaluate(() => document.body.innerText);
  stap(/reageerde niet op tijd/i.test(tekst), 'de reden staat op het scherm, ook zonder kaarten');
  await page.close();
}

stap(fouten.length === 0, 'geen fouten in de console', fouten.slice(0, 2).join(' | '));

await browser.close();
server.close();
const rood = stappen.filter((x) => !x).length;
console.log(rood ? `\nROOD: ${rood} van ${stappen.length}` : `\nGROEN: alle ${stappen.length} stappen`);
process.exit(rood ? 1 : 0);
