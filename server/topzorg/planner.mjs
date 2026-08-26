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
import { controleerPush } from './push.mjs';

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
// is en er vandaag nog geen meting ligt. Daarna kijkt de wekelijkse mail of hij
// aan de beurt is, want die hangt aan de meting van diezelfde ochtend.
async function controleer() {
  try {
    const datum = datumNL();
    if (!heeftMeting(datum) && uurNL() >= config.topzorgUur) {
      await meetNu({ reden: `dagmeting ${datum}` });
    }
    await controleerPush();
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
  if (config.topzorgPushActief) {
    const dagen = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
    log(
      `wekelijkse mail actief op ${dagen[config.topzorgPushDag] ?? `dag ${config.topzorgPushDag}`} ` +
        `vanaf ${String(config.topzorgPushUur).padStart(2, '0')}:00, ` +
        `${config.topzorgPushOntvangers.length} ontvangers.`,
    );
    if (config.topzorgPushOntvangers.length === 0) {
      log('let op: de wekelijkse mail staat aan maar er zijn geen ontvangers ingesteld (TOPZORG_PUSH_ONTVANGERS).');
    }
  } else {
    log('wekelijkse mail staat uit (TOPZORG_PUSH_ACTIEF=1 zet hem aan).');
  }

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
