// Beheer in de Cockpit: de hele administratieve laag, achter één URL.
//
//   node tools/visual/cockpit-beheer.mjs
//
// Laadt de echte cockpit-live.html met gestubde bestaande routes en meet wat een medewerker
// werkelijk kan. Vooral de grenzen die tijdens de verhuizing hadden kunnen versimpelen:
//
//   * toestemming met de hand vastleggen kan niet zonder de wijze waarop die is verkregen;
//   * zonder toestemming staat er geen enkele uitnodigingsknop;
//   * WhatsApp openen verandert de status NIET, alleen de bevestiging doet dat;
//   * zonder verzendend transport meldt het scherm dat er niets is verstuurd;
//   * er is nergens nog een weg naar /index.html.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PUBLIC = join(ROOT, 'public');
const PORT = 4421;

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

const TESTERS = [
  { id: 't1', first_name: 'Kim', last_name: 'Mertens', company_name: 'Topzorggroep', email: 'kim@topzorg.test',
    mobile: '+31612345678', domain: 'topzorg.test', notes: '', status: 'DRAFT', consent_status: 'OPTED_IN',
    campaign: 'MACULIS_FIRST_FIVE', token: 'tok-kim', history: [] },
  { id: 't2', first_name: 'Sam', last_name: 'de Wit', company_name: 'De Brug', email: 'sam@debrug.test',
    mobile: '', domain: 'debrug.test', notes: '', status: 'DRAFT', consent_status: 'UNKNOWN',
    campaign: 'MACULIS_FIRST_FIVE', token: 'tok-sam', history: [] },
];
const VRAGEN = [{
  id: 'recognition', text: 'Herkende je wat Maculis zag?',
  options: { ja: 'Ja', deels: 'Deels', nee: 'Nee' },
  context: { id: 'recognition_context', text: 'Wat klopte er wel, en wat niet?' },
}];
const EVALS = {
  ok: true,
  questions: VRAGEN,
  evaluations: [{
    id: 't1', name: 'Kim Mertens', company_name: 'Topzorggroep', campaign: 'MACULIS_FIRST_FIVE',
    lifecycle: 'COMPLETED', started: true, completed: true, eval_status: 'COMPLETED',
    answers: { recognition: 'deels' },
    contexts: { recognition_context: 'De toon klopt, de nadruk op techniek niet.' },
    started_at: '2026-08-20T09:00:00.000Z', completed_at: '2026-08-20T09:20:00.000Z',
  }, {
    id: 't2', name: 'Sam de Wit', company_name: 'De Brug', campaign: 'MACULIS_FIRST_FIVE',
    lifecycle: 'DRAFT', started: false, completed: false, eval_status: 'NOT_STARTED',
    answers: {}, contexts: {}, started_at: null, completed_at: null,
  }],
};
const HISTORIE = {
  source: 'manual', created_at: '2026-08-19T08:00:00.000Z', lifecycle: 'COMPLETED', consent_status: 'OPTED_IN',
  introductions: [],
  history: [
    { at: '2026-08-19T08:00:00.000Z', event: 'tester_created' },
    { at: '2026-08-19T09:00:00.000Z', event: 'invitation_sent', channel: 'whatsapp' },
    { at: '2026-08-20T09:20:00.000Z', event: 'evaluation_completed' },
    { at: '2026-08-20T09:21:00.000Z', event: 'mijn_maculis_invited', channel: 'email' },
    { at: '2026-08-20T09:22:00.000Z', event: 'publish_to_maculis_failed', reason: 'not_configured' },
  ],
};

const stappen = [];
const stap = (ok, tekst, extra = '') => { stappen.push(ok); console.log(`  [${ok ? 'OK ' : 'FOUT'}] ${tekst}${extra ? ' · ' + extra : ''}`); };

const browser = await chromium.launch();
const fouten = [];

async function open({ mailConfigured = false, maculisConfigured = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, locale: 'nl-NL', reducedMotion: 'reduce' });
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
  // window.open stubben, anders opent de harness werkelijk een tabblad naar wa.me.
  const geopend = [];
  await page.exposeFunction('_noteerOpen', (u) => { geopend.push(u); });
  await page.addInitScript(() => { window.open = (u) => { window._noteerOpen(String(u)); return null; }; });
  const verzoeken = [];
  await page.route('**/api/**', async (r) => {
    const req = r.request();
    const p = new URL(req.url()).pathname;
    const j = (b, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(b) });
    if (req.method() !== 'GET') verzoeken.push({ p, method: req.method(), body: JSON.parse(req.postData() || '{}') });
    if (p === '/api/cockpit/config') return j({ commEnabled: true, authed: true, emailOnly: true, mailConfigured, agentsEnabled: false, slice: 'slice-5' });
    if (p === '/api/cockpit/today') {
      return j({ headline: { primary: 'Je bent bij.', secondary: null, zero: true }, sync: { ok: true },
        privacy: { count: 0 }, counts: { nu: 0, klaar: 0, radar: 0, work: 0, kamers: 0 },
        buckets: { NU: [], KLAAR: [], RADAR: [] }, dataGaps: [], quietThresholdDays: 45, source: 'x' });
    }
    if (p === '/api/config') {
      return j({ maculisPublicUrl: 'https://lens.test', campaign: 'MACULIS_FIRST_FIVE',
        statuses: ['DRAFT', 'SENT', 'OPENED', 'COMPLETED', 'DECLINED', 'ERROR'],
        consentStatuses: ['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'], sources: ['manual'],
        authRequired: true, authed: true, maculisConfigured, mailConfigured, evaluationsConfigured: true, intakeConfigured: false });
    }
    if (p === '/api/invitations' && req.method() === 'GET') return j({ invitations: TESTERS });
    if (p === '/api/evaluations') return j(EVALS);
    if (/^\/api\/invitations\/[^/]+\/history$/.test(p)) return j(HISTORIE);
    if (/^\/api\/invitations\/[^/]+\/whatsapp$/.test(p)) return j({ text: 'Hoi Kim, ik heb iets voor je.', url: 'https://wa.me/31612345678?text=x', hasNumber: true });
    if (p === '/api/invite/email') return j({ delivers: mailConfigured, sent: mailConfigured ? 1 : 0, failed: 0, results: [] });
    if (p === '/api/template') return j({ template: { whatsapp: 'Hoi {{voornaam}}, mag ik je iets laten zien?', emailSubject: 'Een blik op {{bedrijf}}', emailBody: 'Beste {{voornaam}},' } });
    return j({ ok: true });
  });
  await page.goto(`http://127.0.0.1:${PORT}/cockpit-live.html`);
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-nav="beheer"]').click());
  await page.waitForTimeout(700);
  return { page, verzoeken, geopend };
}
const naarTab = async (page, label) => {
  await page.evaluate((l) => [...document.querySelectorAll('.beheer-tab')].find((b) => b.textContent.trim() === l).click(), label);
  await page.waitForTimeout(500);
};

// ---- 1. de vijf onderdelen staan er ------------------------------------------------------------
{
  const { page } = await open();
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.beheer-tab')].map((b) => b.textContent.trim()));
  stap(JSON.stringify(tabs) === JSON.stringify(['Testerbeheer', 'Uitnodigingen', 'Evaluaties', 'Inzichten', 'Historie']),
    'Beheer heeft de vijf onderdelen', tabs.join(' | '));
  const tekst = await page.evaluate(() => document.body.innerText);
  stap(tekst.includes('Kim Mertens') && tekst.includes('Sam de Wit'), 'de testers staan er');
  stap(await page.evaluate(() => Boolean(document.querySelector('.beheer-add button'))), 'een tester toevoegen kan hier');
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  stap(!links.some((h) => /index\.html$/.test(h || '')), 'er is geen weg meer naar de losse uitnodigingstool', links.join(' '));
  await page.close();
}

// ---- 2. toestemming met de hand: fail-closed ---------------------------------------------------
{
  const { page, verzoeken } = await open();
  await page.evaluate(() => [...document.querySelectorAll('.beheer-rij')].find((r) => r.innerText.includes('Sam')).querySelector('button').click());
  await page.waitForTimeout(300);
  stap(await page.evaluate(() => Boolean(document.querySelector('.beheer-edit'))), 'bewerken opent in de rij zelf');

  await page.evaluate(() => {
    const s = document.querySelector('.beheer-edit [data-f="consent"]');
    s.value = 'OPTED_IN'; s.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(200);
  stap(await page.evaluate(() => document.querySelector('.edit-methode').hidden === false),
    'toestemming op toegestaan zetten vraagt om de wijze waarop die is verkregen');

  await page.evaluate(() => [...document.querySelectorAll('.beheer-edit button')].find((b) => b.textContent.trim() === 'Opslaan').click());
  await page.waitForTimeout(400);
  const consentCalls = verzoeken.filter((v) => /\/consent$/.test(v.p));
  stap(consentCalls.length === 0, 'zonder die wijze wordt er geen toestemming vastgelegd', `${consentCalls.length} aanroepen`);
  const melding = await page.evaluate(() => (document.querySelector('.beheer-edit .beheer-melding') || {}).textContent || '');
  stap(/kies hoe de toestemming is verkregen/i.test(melding), 'en het scherm zegt waarom', melding);
  await page.close();
}

// ---- 3. uitnodigen: geen toestemming, geen knop -------------------------------------------------
{
  const { page, verzoeken, geopend } = await open();
  await naarTab(page, 'Uitnodigingen');
  const perRij = await page.evaluate(() => [...document.querySelectorAll('.beheer-rij')].map((r) => ({
    wie: (r.querySelector('.conv-who') || {}).textContent || '',
    knoppen: [...r.querySelectorAll('button')].map((b) => b.textContent.trim()),
    tekst: r.innerText,
  })));
  const sam = perRij.find((r) => r.wie.includes('Sam'));
  const kim = perRij.find((r) => r.wie.includes('Kim'));
  stap(sam && sam.knoppen.length === 0, 'zonder toestemming staat er geen enkele uitnodigingsknop', sam ? sam.knoppen.join(' | ') : '');
  stap(sam && /nog geen toestemming/i.test(sam.tekst), 'en het scherm zegt wat er moet gebeuren');
  stap(kim && kim.knoppen.some((k) => /whatsapp/i.test(k)) && kim.knoppen.some((k) => /e-mail/i.test(k)),
    'met toestemming staan WhatsApp en e-mail er wel', kim ? kim.knoppen.join(' | ') : '');

  // WhatsApp in twee stappen: openen verandert niets.
  await page.evaluate(() => [...document.querySelectorAll('.beheer-rij')].find((r) => r.innerText.includes('Kim'))
    .querySelector('button').click());
  await page.waitForTimeout(500);
  stap(geopend.length === 1 && geopend[0].includes('wa.me'), 'WhatsApp opent in een nieuw tabblad', geopend.join(' '));
  stap(verzoeken.filter((v) => /\/status$/.test(v.p)).length === 0,
    'openen verandert de status NIET', `${verzoeken.filter((v) => /\/status$/.test(v.p)).length} statuswijzigingen`);
  const preview = await page.evaluate(() => (document.querySelector('.beheer-preview') || {}).value || '');
  stap(preview.includes('Hoi Kim'), 'de tekst die verstuurd wordt staat erbij');

  await page.evaluate(() => [...document.querySelectorAll('.beheer-rij')].find((r) => r.innerText.includes('Kim'))
    .querySelectorAll('button').forEach((b) => { if (/ik heb hem verstuurd/i.test(b.textContent)) b.click(); }));
  await page.waitForTimeout(500);
  const status = verzoeken.filter((v) => /\/status$/.test(v.p));
  stap(status.length === 1 && status[0].body.status === 'SENT' && status[0].body.channel === 'whatsapp',
    'pas de bevestiging zet de tester op Verstuurd', JSON.stringify(status[0] ? status[0].body : {}));
  // De berichttekst hoort hier, niet in een apart scherm.
  await page.evaluate(() => document.querySelector('.beheer-template summary').click());
  await page.waitForTimeout(400);
  const tpl = await page.evaluate(() => (document.querySelector('[data-t="whatsapp"]') || {}).value || '');
  stap(tpl.includes('mag ik je iets laten zien'), 'de berichttekst is hier aan te passen', tpl.slice(0, 30));
  await page.evaluate(() => [...document.querySelectorAll('.beheer-template button')].find((b) => /tekst opslaan/i.test(b.textContent)).click());
  await page.waitForTimeout(400);
  const tplPut = verzoeken.filter((v) => v.p === '/api/template' && v.method === 'PUT');
  stap(tplPut.length === 1 && typeof tplPut[0].body.emailBody === 'string', 'en op te slaan via de bestaande route', `${tplPut.length}`);

  await page.close();
}

// ---- 4. e-mail zonder transport doet niet alsof -------------------------------------------------
{
  const { page } = await open({ mailConfigured: false });
  await naarTab(page, 'Uitnodigingen');
  const waarschuwing = await page.evaluate(() => document.body.innerText);
  stap(/geen verzendend mailtransport/i.test(waarschuwing), 'het scherm waarschuwt vooraf');
  await page.evaluate(() => {
    const rij = [...document.querySelectorAll('.beheer-rij')].find((r) => r.innerText.includes('Kim'));
    [...rij.querySelectorAll('button')].find((b) => /via e-mail/i.test(b.textContent)).click();
  });
  await page.waitForTimeout(500);
  const na = await page.evaluate(() => document.body.innerText);
  stap(/niet verstuurd/i.test(na) && /niemand is op uitgenodigd/i.test(na),
    'en meldt na de klik eerlijk dat er niets is verstuurd');
  await page.close();
}

// ---- 5. evaluaties, inzichten en historie -------------------------------------------------------
{
  const { page } = await open();
  await naarTab(page, 'Evaluaties');
  let tekst = await page.evaluate(() => document.body.innerText);
  stap(/2\s*\n?\s*Testers/i.test(tekst) || tekst.includes('Testers'), 'evaluaties tonen de stand');
  stap(tekst.includes('afgerond') && tekst.includes('niet gestart'), 'per tester de evaluatiestatus');

  await naarTab(page, 'Inzichten');
  await page.evaluate(() => {
    const s = document.querySelector('.beheer-kiezer select');
    s.value = 't1'; s.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(600);
  tekst = await page.evaluate(() => document.body.innerText);
  stap(tekst.includes('Herkende je wat Maculis zag?'), 'de vraag staat er zoals de Lens hem stelde');
  stap(tekst.includes('Deels'), 'met het antwoord dat zij gaf');
  stap(tekst.includes('De toon klopt, de nadruk op techniek niet.'), 'en haar eigen woorden, woordelijk');

  await naarTab(page, 'Historie');
  await page.evaluate(() => {
    const s = document.querySelector('.beheer-kiezer select');
    s.value = 't1'; s.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(600);
  tekst = await page.evaluate(() => document.body.innerText);
  stap(tekst.includes('Tester aangemaakt') && tekst.includes('Uitnodiging verstuurd'), 'de tijdlijn staat er in mensentaal');
  stap(tekst.includes('Mijn Maculis uitnodiging verstuurd'), 'inclusief de activatie van Mijn Maculis');
  stap(/koppeling niet ingesteld/i.test(tekst), 'en een mislukte publicatie draagt zijn reden', '');
  stap(!/tok-kim/.test(tekst), 'er staat geen token op het scherm');
  await page.close();
}

stap(fouten.length === 0, 'geen fouten in de console', fouten.slice(0, 2).join(' | '));

await browser.close();
server.close();
const rood = stappen.filter((x) => !x).length;
console.log(rood ? `\nROOD: ${rood} van ${stappen.length}` : `\nGROEN: alle ${stappen.length} stappen`);
process.exit(rood ? 1 : 0);
