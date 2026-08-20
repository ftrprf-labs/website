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
//   * DE DEELSTAAT WOONT OP ÉÉN PLEK. Op een geopend inzicht staat, in elke toestand en met de
//     invoer zowel open als dicht, ten hoogste één zichtbare control die de deelstaat verruimt en
//     ten hoogste één die hem beperkt, allebei uitsluitend in het grensblok. De invoer draagt er
//     nooit een. Dit is de meetbare vorm van de klacht die dit ontwerp opriep: drie controls die
//     voor de lezer allemaal dezelfde vraag stelden;
//   * de gespreksingang staat er meteen, ook voordat de detailaanroep terug is;
//   * "Wil je hier iets mee?" verschijnt alleen wanneer hij ergens over gaat, draagt drie
//     gelijkwaardige keuzes, en "Samen met Maculis" is de laatste noodzakelijke klant-handeling:
//     het gesprek staat daarna open met de eerste zin er al in, zonder dat er iets verstuurd is en
//     zonder dat de deelstaat verandert;
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

// ---- de deelstaat woont op één plek -------------------------------------------------------------
//
// Elke zichtbare control in het bewijsblad waarmee de deelstaat naar Maculis te wijzigen is, met
// zijn eigen naam. Knoppen én invoervelden, want een vinkje is net zo goed een control als een
// knop, en een hernoemde dubbelganger moet ook door de mand vallen.
const DEELCONTROLS = (page) => page.evaluate(() => {
  const blad = document.getElementById('bewijs');
  if (!blad) return [];
  const zichtbaar = (e) => {
    const st = getComputedStyle(e);
    return e.offsetParent !== null && st.visibility !== 'hidden' && Number(st.opacity) > 0;
  };
  const naam = (e) => (e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  const uit = [];
  for (const e of blad.querySelectorAll('button, input[type=checkbox], [role=checkbox]')) {
    if (!zichtbaar(e)) continue;
    const t = e.tagName === 'INPUT' ? naam(e.closest('label') || e) : naam(e);
    if (/\bdeel\b|\bdelen\b|\bmeewegen\b/i.test(t)) uit.push(t);
  }
  return uit.sort();
});

// De invoer draagt er nooit een: geen vinkje, geen deelknop, geen andere toestemmingskeuze.
const geenKeuzeInDeInvoer = async (page) => page.evaluate(() => {
  const praat = document.getElementById('bw-praat');
  if (!praat) return true;
  if (praat.querySelector('input[type=checkbox], [role=checkbox]')) return false;
  return ![...praat.querySelectorAll('button')].some((b) =>
    /\bdeel\b|\bdelen\b|\bmeewegen\b/i.test((b.textContent || '').trim()));
});

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
  chk('en er staat een uitnodiging boven die ingang',
    /iets vragen, aanvullen of bespreken/i.test(await page.locator('#bw-praat .praat-lead').textContent()));
  chk('met de invoer dicht is praten de enige koperen knop op het blad',
    JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#bewijs .knop.primair')]
      .filter((b) => b.offsetParent).map((b) => b.textContent.trim())))
      === JSON.stringify(['Praat hierover met Maculis']));

  // De deelstaat woont op één plek. Bij een niet gedeeld inzicht, met de invoer nog dicht.
  chk('niet gedeeld, invoer dicht: precies één deelcontrol, in het grensblok',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Deel dit met Maculis']),
    JSON.stringify(await DEELCONTROLS(page)));

  await page.click('.praat-ingang');
  await page.waitForSelector('.praat-vorm');

  chk('niet gedeeld, invoer open: nog steeds precies die ene deelcontrol',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Deel dit met Maculis']),
    JSON.stringify(await DEELCONTROLS(page)));

  // Canon 12: één koperen knop per blad. De primaire plek is bewust die van praten, niet die van
  // delen: op het moment dat je een inzicht net begrijpt is reageren de natuurlijke volgende stap.
  // Zodra je schrijft, gaat die plek naar Versturen en treedt de ingang terug.
  const primair = () => page.evaluate(() => [...document.querySelectorAll('#bewijs .knop.primair')]
    .filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
  chk('en er staat precies één koperen knop op het blad, die van Versturen',
    JSON.stringify(await primair()) === JSON.stringify(['Versturen']), JSON.stringify(await primair()));

  // ---- 2. praten over een privépatroon: er staat wat meegaat, en verder geen enkele keuze ------
  const context = (await page.locator('.praat-context').textContent()).trim();
  // Versturen ís de keuze om deze context te delen, dus dat moet er vóór het versturen staan: wat
  // er meegaat, wat er bij jou blijft, en dat het inzicht ongedeeld blijft.
  chk('bij een niet gedeeld patroon staat wat versturen wél en niet meestuurt',
    /uitspraak van dit patroon mee/i.test(context)
    && /blijven bij jou/i.test(context)
    && /blijft ongedeeld/i.test(context), context.slice(0, 96) + '...');
  chk('en de invoer draagt geen enkele toestemmingskeuze', await geenKeuzeInDeInvoer(page),
    'geen vinkje, geen deelknop');

  const veld = page.locator('.praat-vorm .veldtekst');
  await veld.fill('Waar baseren jullie dit precies op?');
  await page.click('.praat-acties .knop.primair');
  await page.waitForTimeout(220);

  const eerste = store.verstuurd[0];
  chk('het bericht gaat naar het patroon waar je op keek',
    eerste && eerste.insightId === PRIVE.id, eerste && eerste.insightId);
  chk('en de klantzijde stuurt geen enkel toestemmingsveld mee',
    eerste && Object.keys(eerste.extra || {}).length === 0, JSON.stringify(eerste && eerste.extra));
  chk('praten heeft niets gedeeld: er is geen deelactie gedaan',
    !store.verstuurd.some((v) => v.gedeeld), 'delen blijft een aparte handeling');
  chk('je ziet je eigen woorden meteen in de draad',
    (await page.locator('.draad-item.van-jij .draad-tekst').last().textContent()).includes('Waar baseren jullie dit'));

  // ---- 3. het inzicht daarna wél delen: aparte handeling, eigen bevestiging --------------------
  // Vanuit het grensblok, want daar woont die beslissing. De invoer mag open staan; ook dan komt
  // er geen tweede deelcontrol bij.
  await openInvoer(page, '.praat-ingang', '.praat-vorm');
  await page.locator('#bw-grens-acties .knop', { hasText: 'Deel dit met Maculis' }).click();
  await page.waitForSelector('#confirm:not(.hidden)');
  chk('delen vraagt een eigen bevestiging',
    (await page.locator('#confirm-title').textContent()).trim() === 'Delen met Maculis');
  chk('en de knop zegt wat hij doet',
    (await page.locator('#confirm-ok').textContent()).trim() === 'Deel dit met Maculis');
  await page.click('#confirm-cancel');

  // ---- 3b. "Wil je hier iets mee?" -------------------------------------------------------------
  //
  // De enige vraag in deze reis die niet af te leiden is. Hij hoort er alleen te staan wanneer hij
  // ergens over gaat: na Ja of Deels, en alleen bij een spanning of een opvallendheid. Dat is de
  // structurele maatregel tegen een trechter, dus die wordt hier gemeten en niet aangenomen.
  chk('de vervolgvraag staat er niet voordat je hebt geantwoord',
    await page.locator('#bw-intentie:not(.hidden)').count() === 0);

  await page.click('[data-antwoord="ja"]');
  await page.waitForSelector('#bw-intentie:not(.hidden)');
  const keuzes = await page.locator('#bw-intentie [data-intentie]').allTextContents();
  chk('na Ja verschijnt hij, met precies drie gelijkwaardige keuzes',
    JSON.stringify(keuzes.map((t) => t.trim()))
      === JSON.stringify(['Nee, alleen weten', 'Zelf oppakken', 'Samen met Maculis']),
    JSON.stringify(keuzes));
  chk('en geen van de drie is luider dan de andere',
    await page.locator('#bw-intentie .knop.primair').count() === 0);

  // Nee, alleen weten is een volwaardig antwoord en geen wegklikoptie.
  await page.click('[data-intentie="weten"]');
  await page.waitForTimeout(200);
  chk('"Nee, alleen weten" laat het rusten en zet niets in gang',
    /laten dit rusten/i.test(await page.locator('#bw-intentie-uit').textContent())
    && (store.intenties[store.intenties.length - 1] || {}).intent === 'weten');

  // Samen met Maculis: de klik is de laatste noodzakelijke handeling. Het gesprek staat daarna open
  // met een vraag van Maculis erboven, en versturen hoeft niet.
  const verstuurdVoor = store.verstuurd.length;
  await page.click('[data-intentie="samen"]');
  await page.waitForSelector('.praat-vorm');
  // De draad wordt aangemaakt en dan pas getekend. Wachten op het bestaan van het formulier is dus
  // te vroeg: dit wacht op de openingsregel, anders meet de test een race in plaats van het gedrag.
  await page.waitForFunction(() => {
    const p2 = document.querySelector('.praat-vorm .praat-opening');
    return Boolean(p2) && String(p2.textContent || '').trim().length > 10;
  }, null, { timeout: 5000 }).catch(() => {});
  chk('"Samen met Maculis" belooft een vervolgstap en geen uitvoering',
    /beste vervolgstap/i.test(await page.locator('#bw-intentie-uit').textContent()));
  // MACULIS SPREEKT NAMENS ZICHZELF. Hier stond eerder een voorgevulde zin in de stem van de
  // ondernemer, in een veld dat "Je eigen woorden" heet. Nu staat de vraag van Maculis erboven en
  // blijft het veld leeg, want alles wat daarin komt is van hem.
  chk('het gesprek staat meteen open met een vraag van Maculis erboven',
    /wil je hier samen verder naar kijken/i.test(
      await page.locator('.praat-vorm .praat-opening').textContent()));
  chk('en het veld met zijn eigen woorden is leeg',
    (await page.locator('.praat-vorm .veldtekst').inputValue()).trim() === '');
  const openers = await page.locator('.praat-opener').allTextContents();
  chk('geen enkele opening is een zin in zijn stem',
    openers.length > 0 && openers.every((o) => /\?$/.test(o.trim())), openers.join(' | '));
  await page.locator('.praat-opener').first().click();
  chk('een opening aanklikken vult zijn veld niet',
    (await page.locator('.praat-vorm .veldtekst').inputValue()).trim() === '');
  chk('de klik alleen heeft nog niets verstuurd', store.verstuurd.length === verstuurdVoor);
  chk('en er komt geen tweede toestemmingskeuze bij', await geenKeuzeInDeInvoer(page));
  chk('de deelstaat is door dit alles niet veranderd',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Deel dit met Maculis']),
    JSON.stringify(await DEELCONTROLS(page)));

  // Bij een sterkte is "wil je hier iets aan veranderen" een categoriefout.
  await page.click('#btn-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-patronen');
  await page.waitForSelector('.patronen.in');
  await page.locator('.pt-item', { hasText: F.insights[2].title }).first().click();
  await page.waitForSelector('.bewijs.in');
  await page.click('[data-antwoord="ja"]');
  await page.waitForTimeout(250);
  chk('op een sterkte verschijnt de vervolgvraag niet, ook niet na Ja',
    await page.locator('#bw-intentie:not(.hidden)').count() === 0);

  // Terug naar het spanningspatroon voor de rest van de ronde.
  await page.click('#btn-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-patronen');
  await page.waitForSelector('.patronen.in');
  await page.locator('.pt-item', { hasText: PRIVE.title }).first().click();
  await page.waitForSelector('.bewijs.in');
  await page.waitForTimeout(400);

  // ---- 4. Ja, Deels en Nee, met de vraag om toelichting ---------------------------------------
  await page.click('[data-antwoord="deels"]');
  await page.waitForSelector('#bw-toel:not(.hidden)');
  chk('Deels vraagt meteen om een toelichting',
    (await page.locator('#bw-toel-vraag').textContent()).trim() === 'Wat klopt er wel, en wat ziet er van binnenuit anders uit?');
  chk('en het antwoord is meteen bewaard',
    store.herkenningen.some((h) => h.insightId === PRIVE.id && h.answer === 'deels'));
  chk('de tekst zegt waar je antwoord blijft',
    /je antwoord blijft bij jou/i.test(await page.locator('#bw-uitkomst').textContent()));

  await page.fill('#bw-toel-tekst', 'De helft klopt, de andere helft speelde vorig jaar.');
  await page.locator('#bw-toel-tekst').blur();
  await page.waitForTimeout(220);
  const metNoot = store.herkenningen.filter((h) => h.note);
  chk('de toelichting wordt bewaard bij het antwoord',
    metNoot.length === 1 && metNoot[0].note.startsWith('De helft klopt'));

  // ---- 5b. een tweede bericht in dezelfde draad blijft ook een gesprek ------------------------
  await openInvoer(page, '.praat-ingang', '.praat-vorm');
  await page.locator('.praat-vorm .veldtekst').fill('Wij hebben sinds januari een nieuw klantteam.');
  await page.click('.praat-acties .knop.primair');
  await page.waitForTimeout(220);
  const laatste = store.verstuurd[store.verstuurd.length - 1];
  chk('ook een tweede bericht draagt geen toestemmingsveld',
    laatste && Object.keys(laatste.extra || {}).length === 0, JSON.stringify(laatste && laatste.extra));

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
  chk('en er staat nergens meer een tweede toestemmingsvraag in de invoer',
    !/Laat dit meewegen/i.test(zichtbaar) && !/Deel dit inzicht met Maculis/i.test(zichtbaar));
  chk('de invoer draagt geen enkele toestemmingskeuze, ook niet bij een tweede bezoek',
    await geenKeuzeInDeInvoer(page));

  // ---- de deelstaat bij een AL GEDEELD inzicht -------------------------------------------------
  // Daar hoort precies één control te staan, en die beperkt in plaats van te verruimen. En de
  // gespreksingang staat er, want praten hangt niet aan de deelstaat.
  await page.click('#btn-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-patronen');
  await page.waitForSelector('.patronen.in');
  await page.locator('.pt-item', { hasText: GEDEELD.title }).first().click();
  await page.waitForSelector('.bewijs.in');
  await page.waitForSelector('.praat-ingang');
  // Dit fixture-inzicht is gedeeld én heeft een nieuwere lezing: toestand 4. Twee controls, en dat
  // is geen dubbeling maar een keuze tussen twee richtingen. Ten hoogste één verruimt, ten hoogste
  // één beperkt.
  chk('gedeeld met een nieuwere lezing: één control die verruimt, één die beperkt',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Deel de nieuwe lezing', 'Delen intrekken']),
    JSON.stringify(await DEELCONTROLS(page)));
  chk('en de gespreksingang staat er ook bij een gedeeld inzicht',
    await page.locator('#bw-praat .praat-ingang').count() === 1);
  const contextG = (await page.evaluate(() => {
    document.querySelector('.praat-ingang').click();
    return new Promise((r) => setTimeout(() => r(
      (document.querySelector('.praat-context') || {}).textContent || ''), 120));
  })).trim();
  chk('bij een gedeeld patroon staat dezelfde belofte over de persoonlijke laag',
    /volledig op ingaan/i.test(contextG) && /blijven bij jou/i.test(contextG),
    contextG.slice(0, 96));
  chk('en met de invoer open komt er nog steeds niets bij',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Deel de nieuwe lezing', 'Delen intrekken']),
    JSON.stringify(await DEELCONTROLS(page)));

  // Toestand 3: gewoon gedeeld, zonder nieuwere lezing. Bereikbaar door de nieuwe lezing te delen.
  await page.locator('#bw-grens-acties .knop', { hasText: 'Deel de nieuwe lezing' }).click();
  await page.waitForSelector('#confirm:not(.hidden)');
  chk('bijwerken heet een lezing en geen ontwikkeling',
    (await page.locator('#confirm-title').textContent()).trim() === 'Nieuwe lezing delen'
    && (await page.locator('#confirm-ok').textContent()).trim() === 'Deel de nieuwe lezing');
  await page.click('#confirm-ok');
  await page.waitForTimeout(400);
  chk('gedeeld zonder nieuwere lezing: precies één control, en die trekt in',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify(['Delen intrekken']),
    JSON.stringify(await DEELCONTROLS(page)));
  chk('en de staat leest "Gedeeld met Maculis"',
    (await page.locator('#bw-staat').textContent()).trim() === 'Gedeeld met Maculis');

  // Toestand 1: er is nog niets vastgesteld, dus er valt niets te delen en er staat geen control.
  await page.click('#btn-sluit');
  await page.waitForTimeout(360);
  await page.click('#btn-patronen');
  await page.waitForSelector('.patronen.in');
  await page.locator('.pt-item', { hasText: F.insights[5].title }).first().click();
  await page.waitForSelector('.bewijs.in');
  await page.waitForSelector('.praat-ingang');
  chk('nog niets vastgesteld: geen enkele deelcontrol',
    JSON.stringify(await DEELCONTROLS(page)) === JSON.stringify([]),
    JSON.stringify(await DEELCONTROLS(page)));
  chk('maar de zichtbaarheidsregel staat er wél',
    /met toegang tot Mijn Maculis ziet dit inzicht/i.test(await page.locator('#bw-grens-wie').textContent()));
  chk('en je kunt er ook over praten',
    await page.locator('#bw-praat .praat-ingang').count() === 1);

  // ---- dimensie A staat er, en uitsluitend daar ------------------------------------------------
  const wie = (await page.locator('#bw-grens-wie').textContent()).trim();
  chk('het grensblok zegt wie binnen de organisatie het inzicht ziet',
    /met toegang tot Mijn Maculis ziet dit inzicht/i.test(wie)
    && /Je antwoord en je gesprek zijn van jou/i.test(wie), wie);
  chk('en de deelstaat zelf zegt daar niets over',
    !/collega|iedereen|binnen/i.test((await page.locator('#bw-staat').textContent())
      + ' ' + (await page.locator('#bw-grens-tekst').textContent())));

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
