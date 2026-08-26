// De wekelijkse signalering aan marketing.
//
// Elke maandagochtend, na de meting van die dag, gaat er een bericht uit met de
// locaties die de komende week veel online ruimte hebben. Dat is de kant van het
// overzicht waar je iets extra's kunt doen in plaats van iets terugdraaien.
//
// Twee dingen staan hier bewust in de weg van een ongeluk. Verzenden staat
// standaard uit en moet met een omgevingsvariabele aangezet worden, en er gaat
// nooit meer dan een bericht per dag uit, ook niet als de service tussendoor
// opnieuw opstart.

import { bouwPushMail, PUSH_DREMPELS } from '../../tools/topzorg-scan/src/push.mjs';
import { weekdag } from '../../tools/topzorg-scan/src/weken.mjs';
import { config } from '../config.mjs';
import { mailDelivers, sendEmail } from '../mailer.mjs';
import { datumNL, laatsteMeting, leesVlag, uurNL, zetVlag } from './opslag.mjs';

const VLAG = 'push';

// Naast de vlag op schijf ook een geheugenslot, zodat twee controles die elkaar
// overlappen nooit twee berichten opleveren.
let bezig = false;
let laatsteInGeheugen = null;
let laatsteUitkomst = null;

function log(bericht) {
  // eslint-disable-next-line no-console
  console.log(`  Topzorg  : ${bericht}`);
}

export function pushDrempels() {
  return {
    minTijdenKomendeWeek: config.topzorgPushDrempel,
    maxWachtdagen: config.topzorgPushMaxWachtdagen,
  };
}

function alVerstuurdOp() {
  return laatsteInGeheugen ?? leesVlag(VLAG)?.datum ?? null;
}

// Stelt de mail samen zonder iets te versturen. Ook wat de preview laat zien.
export function stelPushSamen(dataset = laatsteMeting()) {
  if (!dataset) return null;
  return bouwPushMail(dataset, { url: config.topzorgUrl, drempels: pushDrempels() });
}

export async function verstuurPush({ reden = 'handmatig', dataset = laatsteMeting() } = {}) {
  if (bezig) return { verstuurd: false, reden: 'er loopt al een verzending' };
  const ontvangers = config.topzorgPushOntvangers;
  if (ontvangers.length === 0) return { verstuurd: false, reden: 'geen ontvangers ingesteld' };
  if (!mailDelivers()) return { verstuurd: false, reden: 'er is geen werkende mailkoppeling ingesteld' };

  const mail = stelPushSamen(dataset);
  if (!mail) return { verstuurd: false, reden: 'er is nog geen meting om over te berichten' };

  bezig = true;
  try {
    const resultaten = [];
    for (const ontvanger of ontvangers) {
      // eslint-disable-next-line no-await-in-loop
      const uitkomst = await sendEmail({ to: ontvanger, subject: mail.onderwerp, body: mail.tekst });
      resultaten.push({ bezorgd: uitkomst.delivered === true, reden: uitkomst.reason ?? null });
    }

    const bezorgd = resultaten.filter((r) => r.bezorgd).length;
    const datum = datumNL();
    // De dag alleen afvinken als er echt iets bezorgd is. Mislukt alles, dan mag
    // de volgende controle het opnieuw proberen.
    if (bezorgd > 0) {
      laatsteInGeheugen = datum;
      zetVlag(VLAG, { datum, tijdstip: new Date().toISOString(), aantalLocaties: mail.aantal, bezorgd, reden });
    }
    laatsteUitkomst = {
      datum,
      tijdstip: new Date().toISOString(),
      reden,
      aantalLocaties: mail.aantal,
      bezorgd,
      mislukt: resultaten.length - bezorgd,
      redenen: [...new Set(resultaten.filter((r) => !r.bezorgd).map((r) => r.reden))],
    };
    log(`wekelijkse mail: ${mail.aantal} locaties, ${bezorgd} van ${resultaten.length} bezorgd (${reden}).`);
    return { verstuurd: bezorgd > 0, ...laatsteUitkomst };
  } finally {
    bezig = false;
  }
}

// Wordt elke kwartiercontrole aangeroepen door de planner.
export async function controleerPush() {
  if (!config.topzorgPushActief) return;
  const datum = datumNL();
  if (alVerstuurdOp() === datum) return;
  if (weekdag(datum) !== config.topzorgPushDag) return;
  if (uurNL() < config.topzorgPushUur) return;

  // Pas na de meting van vandaag, anders gaat er een bericht uit over de cijfers
  // van gisteren.
  const dataset = laatsteMeting();
  if (dataset?.meting?.peildatum !== datum) return;

  await verstuurPush({ reden: `weekmail ${datum}`, dataset });
}

export function pushStatus() {
  return {
    actief: config.topzorgPushActief,
    dag: config.topzorgPushDag,
    uur: config.topzorgPushUur,
    drempels: pushDrempels(),
    aantalOntvangers: config.topzorgPushOntvangers.length,
    ontvangers: config.topzorgPushOntvangers,
    mailWerkt: mailDelivers(),
    alVerstuurdOp: alVerstuurdOp(),
    laatsteUitkomst,
    standaardDrempels: PUSH_DREMPELS,
  };
}
