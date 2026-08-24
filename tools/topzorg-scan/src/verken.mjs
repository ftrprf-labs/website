#!/usr/bin/env node
// Verkenner voor het centrale afsprakenportaal.
//
//   node src/verken.mjs [--url=<adres>] [--out=<map>]
//
// Doel: vaststellen hoe het portaal zijn locatielijst en zijn beschikbaarheid
// ophaalt. De verkenner legt daarom niet alleen schermen vast, maar vooral de
// netwerkverzoeken die de applicatie zelf doet. Zit er een API achter, dan is
// die veel goedkoper en stabieler dan honderdvijftig browsersessies per dag.
//
// De verkenner maakt geen afspraak. Hij vult niets in en klikt niets aan wat op
// een definitieve handeling lijkt.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { COOKIE_PATRONEN, DEFAULTS, MAX_COOKIEBANNERS } from './config.mjs';
import {
  pauze,
  verzamelAdressen,
  verzamelKandidaten,
  verzamelTekst,
  zoekAgenda,
  zoekKlikbaar,
} from './dom.mjs';
import { maakLogger } from './logger.mjs';
import { installeerNetwerkRem, veiligKlikken } from './safety.mjs';
import { nettFoutmelding } from './tekst.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HIER, '..');

const CENTRAAL_PORTAAL = 'https://tzg.mijnzorgtoegang.nl/app/eerste-afspraak-maken';

// Verzoeken die niets met de applicatie te maken hebben.
const RUIS = /google|gtm|analytics|doubleclick|facebook|hotjar|sentry|cookiebot|axeptio|recaptcha|fonts\./i;

const MAX_ANTWOORD_BYTES = 400_000;

function slugVan(url) {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function verken({ url = CENTRAAL_PORTAAL, out = null, focus = 'Fysiotherapie (intake)' } = {}) {
  const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runMap = out ?? join(PROJECT, 'runs', `verken_${stempel}`);
  const apiMap = join(runMap, 'api');
  const schermMap = join(runMap, 'schermen');
  mkdirSync(apiMap, { recursive: true });
  mkdirSync(schermMap, { recursive: true });

  const logger = maakLogger(join(runMap, 'verken.log'));
  logger.info(`Verkenning gestart op ${url}`);
  logger.info(`Resultaten komen in ${runMap}`);

  const launchOpties = { headless: true, args: [] };
  if (typeof process.getuid === 'function' && process.getuid() === 0) launchOpties.args.push('--no-sandbox');
  if (process.env.SCAN_PROXY) launchOpties.proxy = { server: process.env.SCAN_PROXY };

  const browser = await chromium.launch(launchOpties);
  const context = await browser.newContext({
    viewport: DEFAULTS.viewport,
    locale: DEFAULTS.locale,
    timezoneId: DEFAULTS.timezone,
  });
  installeerNetwerkRem(context, logger);

  // Het hart van deze verkenning: elk JSON antwoord van de applicatie bewaren.
  const apiIndex = [];
  let apiTeller = 0;

  context.on('response', async (response) => {
    try {
      const adres = response.url();
      if (RUIS.test(adres)) return;
      const type = (response.headers()['content-type'] ?? '').toLowerCase();
      if (!type.includes('json')) return;

      apiTeller += 1;
      const nummer = String(apiTeller).padStart(3, '0');
      const body = await response.text();
      const afgekapt = body.length > MAX_ANTWOORD_BYTES;
      const bestand = `${nummer}-${slugVan(adres)}.json`;
      writeFileSync(join(apiMap, bestand), afgekapt ? body.slice(0, MAX_ANTWOORD_BYTES) : body, 'utf8');

      apiIndex.push({
        nummer,
        methode: response.request().method(),
        status: response.status(),
        url: adres,
        bytes: body.length,
        afgekapt,
        bestand,
      });
      logger.info(`API antwoord bewaard: ${response.request().method()} ${adres} (${body.length} bytes)`);
    } catch {
      // een antwoord kan al opgeruimd zijn
    }
  });

  const paginas = () => context.pages().filter((p) => !p.isClosed());
  let stap = 0;

  const legVast = async (naam) => {
    stap += 1;
    const nummer = String(stap).padStart(2, '0');
    const page = paginas()[paginas().length - 1];
    if (!page) return;
    try {
      await page.screenshot({ path: join(schermMap, `${nummer}-${naam}.png`), fullPage: true });
    } catch (err) {
      logger.waarschuwing(`Schermafbeelding ${naam} mislukt. Technische melding: ${nettFoutmelding(err)}`);
    }
    try {
      const regels = [
        `SCHERM: ${naam}`,
        `TIJD: ${new Date().toISOString()}`,
        '',
        'ADRESSEN:',
        ...verzamelAdressen(paginas).map((a) => `  ${a}`),
        '',
        'KLIKBARE ELEMENTEN:',
        ...(await verzamelKandidaten(paginas, 300)).map((k) => `  ${k}`),
        '',
        'ZICHTBARE TEKST:',
        await verzamelTekst(paginas),
      ];
      writeFileSync(join(schermMap, `${nummer}-${naam}.txt`), regels.join('\n'), 'utf8');
      writeFileSync(join(schermMap, `${nummer}-${naam}.html`), await page.content(), 'utf8');
    } catch (err) {
      logger.waarschuwing(`Vastleggen van ${naam} mislukt. Technische melding: ${nettFoutmelding(err)}`);
    }
  };

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULTS.navigatieTimeoutMs });
    await pauze(3000);
    await legVast('start');

    // Consentlagen wegklikken, anders vangt de overlay elke klik op.
    for (let i = 0; i < MAX_COOKIEBANNERS; i += 1) {
      let geklikt = false;
      for (const patroon of COOKIE_PATRONEN) {
        const treffer = await zoekKlikbaar(paginas, [patroon], { timeoutMs: 900, pollMs: 300 });
        if (!treffer) continue;
        try {
          await veiligKlikken(treffer.locator, logger, { context: 'cookiebanner', timeoutMs: 3000 });
          geklikt = true;
          await pauze(900);
          break;
        } catch {
          // volgende consentknop
        }
      }
      if (!geklikt) break;
    }
    await legVast('na-consent');

    // Loop de publieke route door tot en met de kalender, zodat de applicatie
    // zelf haar locatielijst en haar beschikbaarheid ophaalt. Elk verzoek dat
    // zij daarbij doet wordt vastgelegd. De route stopt voor de
    // persoonsgegevens.
    // Doorklikken mag alleen zolang er geen kalender en geen invoerveld voor
    // persoonsgegevens in beeld is. Achter zo'n scherm ligt de bevestiging, en
    // daar heeft een verkenning niets te zoeken.
    const magDoorklikken = async () => {
      if (await zoekAgenda(paginas)) {
        logger.info('Er staat een kalender in beeld. Verder klikken wordt overgeslagen.');
        return false;
      }
      for (const p of paginas()) {
        if (p.isClosed()) continue;
        for (const frame of p.frames()) {
          try {
            const veld = frame.locator('input[type="text"], input[type="email"], input[type="tel"]').first();
            if ((await veld.count()) > 0 && (await veld.isVisible())) {
              logger.info('Er staat een invoerveld in beeld. Verder klikken wordt overgeslagen.');
              return false;
            }
          } catch {
            // volgende frame
          }
        }
      }
      return true;
    };

    const klik = async (patronen, naam, { verplicht = false, isDoorklik = false } = {}) => {
      if (isDoorklik && !(await magDoorklikken())) return false;
      const treffer = await zoekKlikbaar(paginas, patronen, { timeoutMs: 6000, pollMs: 300 });
      if (!treffer) {
        if (verplicht) logger.waarschuwing(`Stap ${naam} niet gevonden.`);
        return false;
      }
      try {
        await veiligKlikken(treffer.locator, logger, { context: naam, timeoutMs: 8000 });
        await pauze(2500);
        await legVast(naam);
        return true;
      } catch (err) {
        logger.waarschuwing(`Stap ${naam} mislukte. Technische melding: ${nettFoutmelding(err)}`);
        return false;
      }
    };

    // Introscherm.
    await klik([/^volgende$/i, /^verder$/i], 'intro', { isDoorklik: true });

    // Aandachtsgebied. Standaard de gewone fysiotherapie intake, want dat is de
    // referentiebehandeling voor het overzicht.
    const focusPatroon = new RegExp(focus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    await klik([focusPatroon, /fysiotherapie \(intake\)/i], 'aandachtsgebied', { verplicht: true });
    await klik([/^volgende$/i], 'na-aandachtsgebied', { isDoorklik: true });

    // Verwijzing.
    await klik([/geen verwijzing/i, /zonder verwijzing/i, /^nee$/i], 'verwijzing', { verplicht: true });
    await klik([/^volgende$/i], 'na-verwijzing', { isDoorklik: true });

    // Locatiekeuze. Dit is het scherm waar de hele organisatie op staat.
    await legVast('locaties');

    // Kies de eerste locatie, zodat ook het verzoek voor de beschikbaarheid
    // zichtbaar wordt. Daarna stopt de verkenning.
    // Kies alleen een echte locatie. Een catch-all patroon pakt hier anders de
    // knop "Volgende", en die leidt verder de flow in dan de bedoeling is.
    const LOCATIEPATRONEN = [/amersfoort/i, /utrecht/i, /zeist/i, /nieuwegein/i, /amsterdam/i, /rotterdam/i];
    const BEDIENINGSWOORDEN = /^(volgende|vorige|terug|annuleren|sluiten|verder|opnieuw)$/i;

    const locatieTreffer = (await magDoorklikken())
      ? await zoekKlikbaar(paginas, LOCATIEPATRONEN, {
          timeoutMs: 6000,
          pollMs: 300,
          maxLabelLengte: 80,
          mijdNavigatie: true,
        })
      : null;

    if (locatieTreffer && BEDIENINGSWOORDEN.test(locatieTreffer.label.trim())) {
      logger.info('De gevonden kandidaat is een bedieningsknop en geen locatie. Locatiekeuze overgeslagen.');
    } else if (locatieTreffer) {
      try {
        await veiligKlikken(locatieTreffer.locator, logger, { context: 'locatiekeuze', timeoutMs: 8000 });
        await pauze(3000);
        await legVast('na-locatiekeuze');
      } catch (err) {
        logger.waarschuwing(`Locatiekeuze mislukte. Technische melding: ${nettFoutmelding(err)}`);
      }
    }

    await klik([/^volgende$/i], 'naar-kalender', { isDoorklik: true });
    await pauze(3000);
    await legVast('kalender');
    logger.ok('Verkenning stopt hier. De persoonsgegevens worden niet benaderd.');
  } catch (err) {
    logger.fout(`Verkenning afgebroken: ${nettFoutmelding(err)}`);
  } finally {
    await pauze(1500);
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  writeFileSync(join(runMap, 'api-index.json'), JSON.stringify(apiIndex, null, 2), 'utf8');

  logger.ok(`Verkenning klaar. ${apiIndex.length} API antwoorden bewaard in ${apiMap}`);
  return { runMap, apiIndex };
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const opties = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--url=')) opties.url = arg.slice('--url='.length);
    else if (arg.startsWith('--out=')) opties.out = arg.slice('--out='.length);
    else if (arg.startsWith('--focus=')) opties.focus = arg.slice('--focus='.length);
  }
  try {
    const { runMap, apiIndex } = await verken(opties);
    process.stdout.write(`\nVerkenning opgeslagen in ${runMap}\n`);
    process.stdout.write(`API antwoorden: ${apiIndex.length}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Verkenning afgebroken: ${err.stack ?? err.message}\n`);
    process.exit(3);
  }
}
