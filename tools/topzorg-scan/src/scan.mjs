#!/usr/bin/env node
// Startpunt van de scan.
//
//   node src/scan.mjs                        scan de standaardlocatie, headless
//   node src/scan.mjs --headed               zichtbare browser
//   node src/scan.mjs --locatie=<sleutel>    andere geconfigureerde locatie
//   node src/scan.mjs --url=<adres>          overschrijf de locatie URL
//
// Exitcode: 0 bij GROEN, 1 bij ORANJE, 2 bij ROOD, 3 bij een onverwachte fout.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { DEFAULTS, LOCATIES } from './config.mjs';
import { verzamelAdressen, verzamelKandidaten, verzamelTekst } from './dom.mjs';
import { voerScanUit } from './flow.mjs';
import { maakLogger } from './logger.mjs';
import { bepaalStatus, bouwConclusie, bouwRapportJson, bouwRapportTekst } from './report.mjs';
import { installeerNetwerkRem, VeiligheidsStop } from './safety.mjs';
import { nettFoutmelding } from './tekst.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HIER, '..');

function leesArgumenten(argv) {
  const opties = {
    headed: false,
    locatie: 'revalidatie-amersfoort-databankweg',
    url: null,
    slowMo: 0,
    out: null,
    bewaarHtml: false,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--headed') opties.headed = true;
    else if (arg.startsWith('--locatie=')) opties.locatie = arg.slice('--locatie='.length);
    else if (arg.startsWith('--url=')) opties.url = arg.slice('--url='.length);
    else if (arg.startsWith('--slowmo=')) opties.slowMo = Number(arg.slice('--slowmo='.length)) || 0;
    else if (arg.startsWith('--out=')) opties.out = arg.slice('--out='.length);
    else if (arg === '--bewaar-html') opties.bewaarHtml = true;
    else if (arg === '--help' || arg === '-h') opties.help = true;
  }
  return opties;
}

function tijdstempelMap() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

export async function draaiScan(opties) {
  const locatie = { ...(LOCATIES[opties.locatie] ?? {}) };
  if (!locatie.url && !opties.url) {
    throw new Error(`Onbekende locatie "${opties.locatie}". Beschikbaar: ${Object.keys(LOCATIES).join(', ')}`);
  }
  if (opties.url) locatie.url = opties.url;

  const runMap = opties.out ?? join(PROJECT, 'runs', `${tijdstempelMap()}_${locatie.key ?? 'locatie'}`);
  const schermMap = join(runMap, 'screenshots');
  mkdirSync(schermMap, { recursive: true });

  const logger = maakLogger(join(runMap, 'run.log'));
  logger.info(`Scan gestart voor ${locatie.naam ?? locatie.url}`);
  logger.info(`Resultaten komen in ${runMap}`);

  let teller = 0;
  const gemaakteSchermen = [];
  const schermafbeelding = async (page, naam) => {
    if (!page || page.isClosed()) return;
    teller += 1;
    const bestand = join(schermMap, `${String(teller).padStart(2, '0')}-${naam}.png`);
    try {
      await page.screenshot({ path: bestand, fullPage: true });
      gemaakteSchermen.push(bestand.replace(runMap + '/', ''));
      logger.info(`Schermafbeelding opgeslagen: ${bestand.replace(runMap + '/', '')}`);
    } catch (err) {
      logger.waarschuwing(`Schermafbeelding ${naam} mislukt. Technische melding: ${nettFoutmelding(err)}`);
    }
  };

  // Diagnostiek per scherm. Dit is het verschil tussen een live run die
  // antwoord geeft en een live run die alleen een status oplevert: als een
  // keuzepatroon niet matcht, staat hier precies welke labels het scherm wel
  // aanbood, dus is de configuratie bij te stellen zonder opnieuw te draaien.
  const diagnoseMap = join(runMap, 'diagnose');
  mkdirSync(diagnoseMap, { recursive: true });
  let diagnoseTeller = 0;

  const maakDiagnose = (context) => async (naam) => {
    diagnoseTeller += 1;
    const paginas = () => context.pages().filter((p) => !p.isClosed());
    const nummer = String(diagnoseTeller).padStart(2, '0');
    try {
      const adressen = verzamelAdressen(paginas);
      const kandidaten = await verzamelKandidaten(paginas);
      const tekst = await verzamelTekst(paginas);
      const regels = [
        `SCHERM: ${naam}`,
        `TIJD: ${new Date().toISOString()}`,
        '',
        'ADRESSEN:',
        ...adressen.map((a) => `  ${a}`),
        '',
        `KLIKBARE ELEMENTEN (${kandidaten.length}):`,
        ...kandidaten.map((k) => `  ${k}`),
        '',
        'ZICHTBARE TEKST:',
        tekst,
        '',
      ];
      writeFileSync(join(diagnoseMap, `${nummer}-${naam}.txt`), regels.join('\n'), 'utf8');

      if (opties.bewaarHtml) {
        const lijst = paginas();
        const laatste = lijst[lijst.length - 1];
        if (laatste) {
          writeFileSync(join(diagnoseMap, `${nummer}-${naam}.html`), await laatste.content(), 'utf8');
        }
      }
    } catch (err) {
      logger.waarschuwing(`Diagnose ${naam} mislukt. Technische melding: ${nettFoutmelding(err)}`);
    }
  };

  const launchOpties = { headless: !opties.headed, slowMo: opties.slowMo, args: [] };
  // Chromium weigert te starten als root zonder deze vlag. Dat komt voor in
  // containers en CI runners.
  if (typeof process.getuid === 'function' && process.getuid() === 0) launchOpties.args.push('--no-sandbox');
  if (process.env.SCAN_PROXY) launchOpties.proxy = { server: process.env.SCAN_PROXY };
  if (process.env.SCAN_CHROMIUM_PATH) launchOpties.executablePath = process.env.SCAN_CHROMIUM_PATH;

  const browser = await chromium.launch(launchOpties);
  const context = await browser.newContext({
    viewport: DEFAULTS.viewport,
    locale: DEFAULTS.locale,
    timezoneId: DEFAULTS.timezone,
    ignoreHTTPSErrors: false,
  });

  const geblokkeerd = installeerNetwerkRem(context, logger);

  let resultaatFlow;
  let onverwachteFout = null;
  try {
    resultaatFlow = await voerScanUit({
      context,
      locatie,
      logger,
      schermafbeelding,
      diagnose: maakDiagnose(context),
      opties,
    });
  } catch (err) {
    onverwachteFout = err;
    if (err instanceof VeiligheidsStop) {
      logger.fout(`Veiligheidsstop: ${err.message}`);
    } else {
      logger.fout(`Onverwachte fout: ${err.stack ?? err.message}`);
    }
    resultaatFlow = { checks: resultaatFlow?.checks ?? {}, gestoptBij: 'afgebroken door een fout' };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  const checks = resultaatFlow.checks;
  const status = onverwachteFout && !(onverwachteFout instanceof VeiligheidsStop) ? 'ROOD' : bepaalStatus(checks);
  const resultaat = {
    locatie: { key: locatie.key ?? null, naam: locatie.naam ?? locatie.url, url: locatie.url },
    datum: new Date().toISOString(),
    status,
    checks,
    gestoptBij: resultaatFlow.gestoptBij,
    veiligheid: {
      afspraakBevestigd: false,
      geblokkeerdeVerzoeken: geblokkeerd.length,
      geblokkeerdeUrls: geblokkeerd.map((g) => `${g.methode} ${g.url}`),
      persoonsgegevensGebruikt: false,
    },
    schermafbeeldingen: gemaakteSchermen,
    fout: onverwachteFout ? { naam: onverwachteFout.name, bericht: nettFoutmelding(onverwachteFout) } : null,
    conclusie: '',
  };
  resultaat.conclusie = bouwConclusie(status, checks, resultaat.locatie);

  const tekst = bouwRapportTekst(resultaat);
  writeFileSync(join(runMap, 'rapport.txt'), tekst, 'utf8');
  writeFileSync(join(runMap, 'rapport.json'), bouwRapportJson(resultaat), 'utf8');

  process.stdout.write('\n' + tekst + '\n');
  logger.info(`Rapport opgeslagen in ${runMap}`);

  return { resultaat, runMap, tekst };
}

const HULP = `
Topzorg Digital Appointment Guardian

Gebruik:
  node src/scan.mjs [opties]

Opties:
  --headed             toon de browser tijdens de scan
  --locatie=<sleutel>  kies een geconfigureerde locatie
  --url=<adres>        overschrijf de URL van de locatiepagina
  --slowmo=<ms>        vertraag elke handeling, handig om mee te kijken
  --out=<map>          schrijf resultaten naar een eigen map
  --bewaar-html        bewaar ook de ruwe HTML van elk scherm, voor kalibratie
  --help               deze uitleg

Exitcodes: 0 GROEN, 1 ORANJE, 2 ROOD, 3 onverwachte fout.
`;

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const opties = leesArgumenten(process.argv);
  if (opties.help) {
    process.stdout.write(HULP);
    process.exit(0);
  }
  try {
    const { resultaat } = await draaiScan(opties);
    process.exit(resultaat.status === 'GROEN' ? 0 : resultaat.status === 'ORANJE' ? 1 : 2);
  } catch (err) {
    process.stderr.write(`Scan afgebroken: ${err.stack ?? err.message}\n`);
    process.exit(3);
  }
}
