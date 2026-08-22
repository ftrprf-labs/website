// Bewijst dat de veiligheidslaag werkt, los van de rest van de scan.
//   1. veiligKlikken weigert een knop met het label "Afspraak bevestigen";
//   2. de netwerkrem blokkeert een POST naar het bevestigingsendpoint, ook
//      als die buiten de scanner om wordt afgevuurd.

import { chromium } from 'playwright';

import { maakLogger } from '../src/logger.mjs';
import { installeerNetwerkRem, veiligKlikken, VeiligheidsStop } from '../src/safety.mjs';
import { startFixture } from './server.mjs';

const logger = maakLogger(null);
let fouten = 0;

const meld = (geslaagd, tekst) => {
  process.stdout.write(`${geslaagd ? 'PASS' : 'FAIL'}: ${tekst}\n`);
  if (!geslaagd) fouten += 1;
};

const fixture = await startFixture({ variant: 'groen' });
const launchOpties = { headless: true, args: [] };
if (typeof process.getuid === 'function' && process.getuid() === 0) launchOpties.args.push('--no-sandbox');
const browser = await chromium.launch(launchOpties);
const context = await browser.newContext();
const geblokkeerd = installeerNetwerkRem(context, logger);

try {
  const page = await context.newPage();
  await page.goto(`${fixture.basis}/mijnzorgtoegang/agenda`, { waitUntil: 'domcontentloaded' });

  const bevestigKnop = page.getByRole('button', { name: /afspraak bevestigen/i }).first();
  meld((await bevestigKnop.count()) === 1, 'de fixture toont daadwerkelijk een bevestigingsknop');

  let geweigerd = false;
  try {
    await veiligKlikken(bevestigKnop, logger, { context: 'veiligheidstest' });
  } catch (err) {
    geweigerd = err instanceof VeiligheidsStop;
  }
  meld(geweigerd, 'veiligKlikken weigert de knop "Afspraak bevestigen"');

  // Vuur nu bewust een schrijfverzoek af dat de scanner zelf nooit zou doen.
  const uitkomst = await page.evaluate(async () => {
    try {
      const r = await fetch('/mijnzorgtoegang/afspraak/bevestigen', { method: 'POST' });
      return `status ${r.status}`;
    } catch (err) {
      return `geblokkeerd: ${err.message}`;
    }
  });
  meld(/geblokkeerd/.test(uitkomst), `de netwerkrem stopt een POST naar het bevestigingsendpoint (${uitkomst})`);
  meld(geblokkeerd.length === 1, `de rem heeft het verzoek geregistreerd (${geblokkeerd.length})`);

  const bereikt = fixture.gebeurtenissen.some((g) => g.methode === 'POST');
  meld(!bereikt, 'de server heeft nooit een POST ontvangen');
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await fixture.stop();
}

process.stdout.write(`\n${fouten === 0 ? 'VEILIGHEIDSTEST GESLAAGD' : `${fouten} VEILIGHEIDSCONTROLES GEFAALD`}\n`);
process.exit(fouten === 0 ? 0 : 1);
