// Opslag van de dagelijkse metingen.
//
// Metingen gaan naar de persistente schijf van de service, een bestand per dag.
// Geen database nodig, en de historie is gewoon een map die je kunt inzien.
// Er staan geen persoonsgegevens in: alleen praktijknamen, adressen en
// aantallen vrije tijden.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { config } from '../config.mjs';

const MAP = join(config.dataDir, 'topzorg');
const METINGEN = join(MAP, 'metingen');
const LAATSTE = join(MAP, 'laatste.json');

// Hoe lang de dagbestanden blijven staan. Ruim genoeg om een seizoenspatroon te
// zien, kort genoeg om de schijf niet te laten vollopen.
const BEWAARDAGEN = 400;

function zorgVoorMappen() {
  mkdirSync(METINGEN, { recursive: true });
}

// Datum in Nederlandse tijd, want daar gaat de meting over. Op de server staat
// de klok op UTC en dan zou een meting van 07:00 in de zomer op de vorige dag
// belanden.
export function datumNL(moment = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(moment);
}

export function uurNL(moment = new Date()) {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Amsterdam',
      hour: '2-digit',
      hour12: false,
    }).format(moment),
  );
}

// Schrijven gaat via een tijdelijk bestand, zodat een half weggeschreven meting
// nooit als geldig resultaat wordt gelezen.
function schrijfAtomisch(pad, inhoud) {
  const tijdelijk = `${pad}.tmp`;
  writeFileSync(tijdelijk, inhoud, 'utf8');
  renameSync(tijdelijk, pad);
}

export function bewaarMeting(dataset) {
  zorgVoorMappen();
  const datum = dataset?.meting?.peildatum ?? datumNL();
  const inhoud = JSON.stringify(dataset, null, 2);
  schrijfAtomisch(join(METINGEN, `${datum}.json`), inhoud);
  schrijfAtomisch(LAATSTE, inhoud);
  ruimOp();
  return datum;
}

export function laatsteMeting() {
  try {
    return JSON.parse(readFileSync(LAATSTE, 'utf8'));
  } catch {
    return null;
  }
}

export function metingVan(datum) {
  try {
    return JSON.parse(readFileSync(join(METINGEN, `${datum}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function heeftMeting(datum) {
  return existsSync(join(METINGEN, `${datum}.json`));
}

// Alle datums met een meting, nieuwste eerst.
export function beschikbareDatums() {
  try {
    return readdirSync(METINGEN)
      .filter((naam) => /^\d{4}-\d{2}-\d{2}\.json$/.test(naam))
      .map((naam) => naam.replace(/\.json$/, ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function ruimOp() {
  const datums = beschikbareDatums();
  for (const datum of datums.slice(BEWAARDAGEN)) {
    try {
      unlinkSync(join(METINGEN, `${datum}.json`));
    } catch {
      // opruimen mag nooit een meting laten mislukken
    }
  }
}

export const PADEN = { MAP, METINGEN, LAATSTE };
