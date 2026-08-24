// Dagelijkse meting, in het proces van de webservice zelf.
//
// Waarom hier en niet als losse cron job op het platform: een cron job draait
// als aparte service en kan de persistente schijf van de webservice niet
// benaderen, want een schijf hoort bij een service. Bovendien herstelt deze
// opzet zichzelf. Ging de service om 07:00 net opnieuw op, dan ziet de eerste
// controle daarna dat er nog geen meting van vandaag is en haalt die alsnog op.
//
// De klok op de server staat op UTC. De meting hoort bij de Nederlandse dag en
// het Nederlandse uur, dus daar wordt op gerekend en niet op UTC.

import { haalAlles } from '../../tools/topzorg-scan/src/ophalen.mjs';
import { config } from '../config.mjs';
import { bewaarMeting, datumNL, heeftMeting, uurNL } from './opslag.mjs';

const CONTROLE_INTERVAL_MS = 15 * 60 * 1000;

let bezig = false;
let laatsteFout = null;
let laatsteRun = null;

function log(bericht) {
  // eslint-disable-next-line no-console
  console.log(`  Topzorg  : ${bericht}`);
}

// Voert de meting uit en bewaart hem. Faalt nooit de server.
export async function meetNu({ reden = 'handmatig' } = {}) {
  if (bezig) return { gestart: false, reden: 'er loopt al een meting' };
  bezig = true;
  const start = Date.now();

  try {
    log(`meting gestart (${reden}).`);
    const { dataset } = await haalAlles({
      out: null,
      gelijktijdig: config.topzorgGelijktijdig,
      peildatum: datumNL(),
      focusLabel: config.topzorgBehandeling,
      logger: {
        info: () => {},
        stap: () => {},
        ok: () => {},
        waarschuwing: (b) => log(`let op: ${b}`),
        fout: (b) => log(`fout: ${b}`),
        regels: () => [],
      },
    });

    const datum = bewaarMeting(dataset);
    const s = dataset.samenvatting;
    laatsteRun = { datum, tijdstip: new Date().toISOString(), duurMs: Date.now() - start };
    laatsteFout = null;
    log(
      `meting ${datum} klaar in ${Math.round((Date.now() - start) / 1000)}s. ` +
        `${s.totaal} locaties, ${s.perStatus.GEEN_RUIMTE} zonder ruimte, ${s.perStatus.KRAP} krap.`,
    );
    return { gestart: true, datum, samenvatting: s };
  } catch (err) {
    laatsteFout = { bericht: err.message, tijdstip: new Date().toISOString() };
    log(`meting mislukt: ${err.message}`);
    return { gestart: true, fout: err.message };
  } finally {
    bezig = false;
  }
}

// Eén controle. Meet alleen als het Nederlandse uur het meetmoment gepasseerd
// is en er vandaag nog geen meting ligt.
async function controleer() {
  try {
    const datum = datumNL();
    if (heeftMeting(datum)) return;
    if (uurNL() < config.topzorgUur) return;
    await meetNu({ reden: `dagmeting ${datum}` });
  } catch (err) {
    log(`controle mislukt: ${err.message}`);
  }
}

export function startPlanner() {
  if (!config.topzorgActief) {
    log('dagelijkse meting staat uit (TOPZORG_ACTIEF=0).');
    return null;
  }

  log(`dagelijkse meting actief, vanaf ${String(config.topzorgUur).padStart(2, '0')}:00 Nederlandse tijd.`);

  // Meteen een controle bij het opstarten, daarna elk kwartier.
  controleer();
  const timer = setInterval(controleer, CONTROLE_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

export function plannerStatus() {
  return {
    actief: config.topzorgActief,
    meetuur: config.topzorgUur,
    behandeling: config.topzorgBehandeling,
    bezig,
    laatsteRun,
    laatsteFout,
    metingVandaag: heeftMeting(datumNL()),
    vandaag: datumNL(),
  };
}
