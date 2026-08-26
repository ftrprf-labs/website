// Rekenen met ISO weken.
//
// Coördinatoren plannen vakanties in weeknummers, dus het overzicht rekent ook
// in weeknummers en niet in blokken van zeven dagen vanaf vandaag. Een week
// loopt van maandag tot en met zondag.
//
// Alles hier is pure datumrekenkunde op ISO strings (YYYY-MM-DD), zonder
// tijdzone en zonder netwerk. De klok van de server doet er dus niet toe.

const DAG_MS = 86_400_000;

function alsGetal(iso) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

function alsIso(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function plusDagen(iso, aantal) {
  const t = alsGetal(iso);
  return t === null ? null : alsIso(t + aantal * DAG_MS);
}

// Maandag = 0, zondag = 6.
function dagIndex(iso) {
  const t = alsGetal(iso);
  return t === null ? null : (new Date(t).getUTCDay() + 6) % 7;
}

// ISO weekdag: maandag is 1, zondag is 7.
export function weekdag(iso) {
  const index = dagIndex(iso);
  return index === null ? null : index + 1;
}

export function maandagVan(iso) {
  const index = dagIndex(iso);
  return index === null ? null : plusDagen(iso, -index);
}

// Het weeknummer volgens ISO 8601. De donderdag van een week bepaalt in welk
// jaar en welke week hij valt, ook rond de jaarwisseling.
export function isoWeek(iso) {
  const index = dagIndex(iso);
  if (index === null) return null;
  const donderdag = plusDagen(iso, 3 - index);
  const jaar = Number(donderdag.slice(0, 4));
  const week = 1 + Math.floor((alsGetal(donderdag) - Date.UTC(jaar, 0, 1)) / (7 * DAG_MS));
  return { jaar, week, sleutel: `${jaar}-W${String(week).padStart(2, '0')}` };
}

// De weken vanaf de peildatum tot en met de horizon van het portaal.
//
// De eerste week is bijna altijd een halve week, want de peildatum valt zelden
// op maandag. Daarom draagt elke week mee welk deel er werkelijk zichtbaar is,
// zodat een half getal nooit als een heel getal gelezen wordt. Hetzelfde geldt
// aan het einde: het portaal publiceert maar een kleine vier weken vooruit, en
// wat daarbuiten valt is niet leeg maar onbekend.
export function bouwWeken(peildatum, horizon, { maxWeken = 8 } = {}) {
  if (!peildatum) return [];
  const weken = [];
  let start = maandagVan(peildatum);

  while (weken.length < maxWeken) {
    if (horizon && start > horizon) break;
    const eind = plusDagen(start, 6);
    const vanaf = start < peildatum ? peildatum : start;
    const totEnMet = horizon && eind > horizon ? horizon : eind;
    weken.push({
      ...isoWeek(start),
      start,
      eind,
      vanaf,
      totEnMet,
      // Een volledige week is van maandag tot en met zondag zichtbaar. Alleen
      // die weken zijn onderling vergelijkbaar.
      volledig: vanaf === start && totEnMet === eind,
    });
    if (!horizon && weken.length >= 6) break;
    start = plusDagen(start, 7);
  }

  return weken;
}
