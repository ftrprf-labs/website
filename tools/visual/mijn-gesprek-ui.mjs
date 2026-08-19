// Bewijs voor de communicatielaag, op het echte oppervlak.
//
//   node tools/visual/mijn-gesprek-ui.mjs
//
// De backendtest (tests/mijn-gesprek.test.mjs) bewijst dat de grenzen in de database kloppen.
// Die test kan niet zien wat de klant leest, en juist daar zit de helft van de belofte. Hier
// wordt daarom gemeten wat er op het scherm staat en wat er werkelijk de deur uit gaat:
//
//   * een gesprek begint vanuit een patroon, en de tekst die je typt komt terecht bij dat patroon;
//   * bij een patroon dat nog van jou alleen is staat er wát Maculis meekrijgt, en delen is een
//     aparte knop en een aparte bevestiging;
//   * het vinkje "Laat dit meewegen" staat uit, en zonder aanvinken gaat het ook als uit mee;
//   * Ja, Deels en Nee worden bewaard, met de vraag om toelichting erbij;
//   * een gesprek kan ook zonder patroon beginnen, en is later terug te vinden;
//   * een antwoord van Maculis komt in dezelfde draad terug;
//   * de klant leest nergens interne bestuurstaal;
//   * en alles hierboven werkt op een telefoon, met knoppen die passen.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const PUBLIC = join(resolve(import.meta.dirname, '..', '..'), 'public');
const PORT = 4416;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

const srv = http.createServer(async (q, r) => {
  try {
    const b = await readFile(join(PUBLIC, decodeURIComponent(new URL(q.url, 'http://x').pathname)));
    r.writeHead(200, { 'content-type': MIME[extname(q.url.split('?')[0])] || 'application/octet-stream' });
    r.end(b);
  } catch { r.writeHead(404); r.end(); }
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const VASTE_OPSLAG = `(() => {
  const echt = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) {
    if (String(k).startsWith('mijn_laatst_')) return ${JSON.stringify(F.VORIG_BEZOEK)};
    return echt.call(this, k);
  };
})();`;

// De ingang is een schakelaar: nog eens klikken sluit de invoer weer. De test wil hem open
// hebben, niet omklappen.
async function openInvoer(page, ingang, vorm) {
  if (await page.locator(vorm).count() === 0) await page.click(ingang);
  await page.waitForSelector(vorm);
}

let fails = 0;
const chk = (l, c, d = '') => { if (!c) fails++; console.log(`  [${c ? 'OK ' : 'FOUT'}] ${l}${d ? ' · ' + d : ''}`); };

const PRIVE = F.insights[0];      // aandachtspatroon, nog van jou alleen
const GEDEELD = F.insights[1];    // al gedeeld met Maculis

// Interne bestuurstaal die de klant nooit hoort te lezen. `proposed` staat bovenaan omdat dat de
// term is waarmee het voorstel intern binnenkomt: waar wordt gezegd dat we iets meenemen, mag
// nergens staan dat het "voorgesteld" is en op iemand wacht.
const NOOIT_ZICHTBAAR = ['proposed', 'confirmed', 'confidence', 'relationship_memory',
  'customer_access', 'MIJN_MACULIS', 'conversation', 'PRIVATE', 'SHARED', 'AGGREGATED', 'INBOUND', 'OUTBOUND'];

async function ronde(br, { breedte, hoogte, naam }) {
  console.log(`\n=== ${naam} ${breedte} ===`);
  const ctx = await br.newContext({
    viewport: { width: breedte, height: hoogte }, reducedMotion: 'reduce',
    locale: 'nl-NL', timezoneId: 'Europe/Amsterdam',
  });
  await ctx.addInitScript(VASTE_OPSLAG);
  const page = await ctx.newPage();
  const fouten = [];
  page.on('pageerror', (e) => fouten.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });

  const store = F.maakStore(F.startDraden);
  await F.routeMijn(page, store);
  await page.goto(`http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.zeg.in');

  // Er staat een antwoord klaar dat de klant nog niet heeft gezien: een stille stip, meer niet.
  chk('een wachtend antwoord geeft één stille stip in de periferie',
    await page.locator('#gs-stip:not(.hidden)').count() === 1);

  // ---- 1. een gesprek beginnen vanuit een patroon ---------------------------------------------
  await page.click('#btn-waarom');
  await page.waitForSelector('.bewijs.in');
  await page.waitForSelector('.praat-ingang');
  const ingangTekst = await page.locator('.praat-ingang').textContent();
  chk('de ingang bij een patroon heet "Praat hierover met Maculis"', ingangTekst.trim() === 'Praat hierover met Maculis');

  await page.click('.praat-ingang');
  await page.waitForSelector('.praat-vorm');

  // ---- 2. praten over een privépatroon: de grens staat er, en delen is apart -------------------
  const context = (await page.locator('.praat-context').textContent()).trim();
  // Versturen ís de keuze om context te delen, dus dat moet er vóór het versturen staan, en er moet
  // staan wat er NIET meegaat en dat het inzicht ongedeeld blijft.
  chk('bij een niet gedeeld patroon staat wat versturen wél en niet deelt',
    /nog niet gedeeld met Maculis/i.test(context)
    && /door te versturen/i.test(context)
    && /blijven bij jou/i.test(context)
    && /blijft ongedeeld/i.test(context), context.slice(0, 96) + '...');
  chk('en er staat een aparte knop om het inzicht er wél bij te doen',
    await page.locator('.praat-grens .knop', { hasText: 'Deel dit inzicht met Maculis' }).count() === 1);

  // ---- 5. het vinkje staat uit ----------------------------------------------------------------
  chk('"Laat dit meewegen" staat standaard uit', (await page.locator('.praat-weeg input').isChecked()) === false);

  const veld = page.locator('.praat-vorm .veldtekst');
  await veld.fill('Waar baseren jullie dit precies op?');
  await page.click('.praat-acties .knop.primair');
  await page.waitForTimeout(220);

  const eerste = store.verstuurd[0];
  chk('het bericht gaat naar het patroon waar je op keek',
    eerste && eerste.insightId === PRIVE.id, eerste && eerste.insightId);
  chk('en het gaat als gesprek, niet als geheugen', eerste && eerste.weegMee === false);
  chk('praten heeft niets gedeeld: er is geen deelactie gedaan',
    !store.verstuurd.some((v) => v.gedeeld), 'delen blijft een aparte handeling');
  chk('je ziet je eigen woorden meteen in de draad',
    (await page.locator('.draad-item.van-jij .draad-tekst').last().textContent()).includes('Waar baseren jullie dit'));

  // ---- 3. het inzicht daarna wél delen: aparte handeling, eigen bevestiging --------------------
  await openInvoer(page, '.praat-ingang', '.praat-vorm');
  await page.click('.praat-grens .knop');
  await page.waitForSelector('#confirm:not(.hidden)');
  chk('delen vraagt een eigen bevestiging',
    (await page.locator('#confirm-title').textContent()).trim() === 'Delen met Maculis');
  chk('en de knop zegt wat hij doet',
    (await page.locator('#confirm-ok').textContent()).trim() === 'Deel dit met Maculis');
  await page.click('#confirm-cancel');

  // ---- 4. Ja, Deels en Nee, met de vraag om toelichting ---------------------------------------
  await page.click('[data-antwoord="deels"]');
  await page.waitForSelector('#bw-toel:not(.hidden)');
  chk('Deels vraagt meteen om een toelichting',
    (await page.locator('#bw-toel-vraag').textContent()).trim() === 'Wat klopt er wel en wat niet?');
  chk('en het antwoord is meteen bewaard',
    store.herkenningen.some((h) => h.insightId === PRIVE.id && h.answer === 'deels'));
  chk('de tekst zegt waar je antwoord blijft',
    /je antwoord blijft bij jou/i.test(await page.locator('#bw-uitkomst').textContent()));

  await page.fill('#bw-toel-tekst', 'De helft klopt, de andere helft speelde vorig jaar.');
  await page.click('#bw-toel-bewaar');
  await page.waitForTimeout(200);
  const metNoot = store.herkenningen.filter((h) => h.note);
  chk('de toelichting wordt bewaard bij het antwoord',
    metNoot.length === 1 && metNoot[0].note.startsWith('De helft klopt'));

  // ---- 5b. mét vinkje komt het er wél bij -----------------------------------------------------
  await openInvoer(page, '.praat-ingang', '.praat-vorm');
  await page.locator('.praat-weeg input').check();
  await page.locator('.praat-vorm .veldtekst').fill('Wij hebben sinds januari een nieuw klantteam.');
  await page.click('.praat-acties .knop.primair');
  await page.waitForTimeout(220);
  const laatste = store.verstuurd[store.verstuurd.length - 1];
  chk('met het vinkje aan gaat het als voorstel mee', laatste && laatste.weegMee === true);

  // ---- 6. een gesprek zonder patroon ----------------------------------------------------------
  // Op een telefoon is het bewijsblad een bodemvel dat de periferie bedekt. Eerst terug naar het
  // veld, precies zoals een bezoeker dat ook moet doen.
  await page.click('#btn-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-gesprekken');
  await page.waitForSelector('.gesprekken.in');
  chk('de ingang zonder patroon heet "Iets vertellen"',
    (await page.locator('.gs-ingang').textContent()).trim() === 'Iets vertellen');
  await openInvoer(page, '.gs-ingang', '#gs-nieuw .praat-vorm');
  await page.locator('#gs-nieuw .veldtekst').fill('Er is bij ons iets veranderd dat jullie nog niet gezien hebben.');
  await page.click('#gs-nieuw .praat-acties .knop.primair');
  await page.waitForTimeout(250);
  const los = store.verstuurd[store.verstuurd.length - 1];
  chk('een gesprek hoeft nergens over te gaan', los && los.insightId === null);

  // ---- 9. terugvinden, met het patroon als context --------------------------------------------
  await page.waitForSelector('.gs-item');
  const titels = await page.locator('.gs-item .gs-titel').allTextContents();
  chk('elk gesprek is terug te vinden', titels.length >= 3, titels.length + ' draden');
  chk('en draagt het patroon waar het over ging als context',
    titels.includes(GEDEELD.title) && titels.includes(PRIVE.title));
  chk('een gesprek zonder patroon heet gewoon "Iets vertellen"', titels.includes('Iets vertellen'));

  // ---- 7. het antwoord van Maculis ------------------------------------------------------------
  const rij = page.locator('.gs-item', { hasText: GEDEELD.title }).first();
  chk('een wachtend antwoord is zichtbaar in de lijst', (await rij.getAttribute('class')).includes('nieuw'));
  await rij.click();
  await page.waitForSelector('#gs-draad .draad-item');
  const vanMaculis = await page.locator('#gs-draad .draad-item.van-maculis .draad-tekst').allTextContents();
  chk('het antwoord van Maculis staat in dezelfde draad', vanMaculis.length === 1
    && vanMaculis[0].startsWith('Op vijf plekken in de eerste Lens'));
  chk('en na lezen dooft de stip', await page.locator('#gs-stip:not(.hidden)').count() === 0);

  // Nog een antwoord, om te zien dat het ook bij het patroon zelf terugkomt.
  store.antwoord(PRIVE.id, 'Ik loop het in de volgende sessie met je door.');
  await page.click('#btn-gesprekken-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-patronen');
  await page.waitForSelector('.patronen.in');
  await page.locator('.pt-item', { hasText: PRIVE.title }).first().click();
  await page.waitForSelector('.bewijs.in .draad-item');
  const bijPatroon = await page.locator('#bw-praat .draad-item.van-maculis .draad-tekst').allTextContents();
  chk('het gesprek staat ook in het bewijsblad van het patroon zelf',
    bijPatroon.length === 1 && bijPatroon[0].startsWith('Ik loop het in de volgende sessie'));

  // ---- geen interne bestuurstaal, nergens -----------------------------------------------------
  await openInvoer(page, '.praat-ingang', '.praat-vorm');
  const zichtbaar = await page.evaluate(() => document.body.innerText);
  const gevonden = NOOIT_ZICHTBAAR.filter((w) => zichtbaar.includes(w));
  chk('de klant leest nergens interne bestuurstaal', gevonden.length === 0, gevonden.join(', ') || 'niets gevonden');
  chk('en waar we zeggen dat we iets meenemen, staat geen voorbehoud in vakjargon',
    /Laat dit meewegen in wat Maculis van ons weet/.test(zichtbaar));

  // ---- 10. knoppen passen, ook op een telefoon ------------------------------------------------
  const teBreed = await page.evaluate(() => {
    const uit = [];
    document.querySelectorAll('.knop, .praat-opener, .gs-item, .pt-item').forEach((b) => {
      if (b.offsetParent === null) return;
      const r = b.getBoundingClientRect();
      const ouder = b.parentElement.getBoundingClientRect();
      if (r.width > Math.max(ouder.width, document.documentElement.clientWidth) + 1) {
        uit.push(`${b.textContent.trim().slice(0, 34)} (${Math.round(r.width)}px)`);
      }
    });
    return uit;
  });
  chk('geen enkele knoptekst loopt buiten haar plek', teBreed.length === 0, teBreed.join(' · ') || 'alles past');

  chk('geen console errors', fouten.length === 0, fouten.slice(0, 2).join(' | ') || 'nul');
  await ctx.close();
}

const br = await chromium.launch();
await ronde(br, { breedte: 1440, hoogte: 900, naam: 'desktop' });
await ronde(br, { breedte: 390, hoogte: 844, naam: 'mobiel' });
await br.close(); srv.close();
console.log(fails ? `\nGESPREK UI: ${fails} GEFAALD` : '\nGESPREK UI: ALLES GROEN');
process.exit(fails ? 1 : 0);
