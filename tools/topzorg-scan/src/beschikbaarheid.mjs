// Analyse van de beschikbaarheid van een locatie.
//
// De API geeft per opvraging een venster van zes weken terug:
//
//   { dates: { current, min, max, previous, next },
//     days:  [ { date, disabled, slots: [ { reference, label, disabled } ] } ] }
//
// Deze module rekent dat om naar de vragen die het overzicht moet beantwoorden:
// hoeveel tijden zijn er, wanneer is de eerstvolgende mogelijkheid, en is er
// iets aan de hand.
//
// Alles hier is pure rekenkunde op een antwoord, zonder netwerk, zodat het
// zonder de echte API te toetsen is.

export const STATUS = {
  RUIMTE: 'RUIMTE',
  KRAP: 'KRAP',
  GEEN_RUIMTE: 'GEEN_RUIMTE',
  GEEN_ONLINE_ROUTE: 'GEEN_ONLINE_ROUTE',
  FOUT: 'FOUT',
};

export const DREMPELS = {
  // Meer dan zoveel dagen wachten op de eerste mogelijkheid telt als krap.
  krapNaDagen: 7,
  // Minder dan zoveel tijden in het hele venster telt ook als krap.
  krapOnderAantalTijden: 5,
};

function telTijden(dag) {
  return (dag?.slots ?? []).filter((s) => !s.disabled).length;
}

export function dagenVerschil(vanIso, totIso) {
  const van = Date.parse(`${vanIso}T00:00:00Z`);
  const tot = Date.parse(`${totIso}T00:00:00Z`);
  if (Number.isNaN(van) || Number.isNaN(tot)) return null;
  return Math.round((tot - van) / 86_400_000);
}

// Vat de opgehaalde vensters samen tot een beeld per locatie.
//
// Het portaal levert blokken van 42 dagen die ongeveer vier weken in het
// verleden beginnen en elkaar overlappen. Daarom worden dagen op datum
// ontdubbeld, en tellen alleen de dagen vanaf de peildatum tot en met de
// horizon mee. Zo betekent het getal voor elke locatie hetzelfde: alle vrije
// tijden die vanaf vandaag online te plannen zijn.
export function vatVensterSamen(vensters, { peildatum, drempels = DREMPELS } = {}) {
  const horizon = vensters.reduce((laatste, v) => {
    const max = v?.dates?.max;
    return max && (!laatste || max > laatste) ? max : laatste;
  }, null);

  const perDatum = new Map();
  for (const venster of vensters) {
    for (const dag of venster?.days ?? []) {
      if (!dag?.date) continue;
      if (dag.date < peildatum) continue;
      if (horizon && dag.date > horizon) continue;
      // Bij overlap wint de rijkste opgave, zodat een dag die in het ene blok
      // nog leeg was maar in het volgende gevuld, niet verloren gaat.
      const bestaand = perDatum.get(dag.date);
      if (!bestaand || telTijden(dag) > telTijden(bestaand)) perDatum.set(dag.date, dag);
    }
  }

  const dagen = [...perDatum.values()].sort((a, b) => a.date.localeCompare(b.date));
  const dagenMetTijden = dagen.filter((d) => !d.disabled && telTijden(d) > 0);
  const totaalTijden = dagen.reduce((som, d) => som + telTijden(d), 0);
  const tijdenVandaag = telTijden(perDatum.get(peildatum));

  const eerste = dagenMetTijden[0] ?? null;
  const eersteDatum = eerste?.date ?? null;
  const wachtdagen = eersteDatum ? dagenVerschil(peildatum, eersteDatum) : null;

  let status;
  if (totaalTijden === 0) {
    status = STATUS.GEEN_RUIMTE;
  } else if (
    (wachtdagen !== null && wachtdagen > drempels.krapNaDagen) ||
    totaalTijden < drempels.krapOnderAantalTijden
  ) {
    status = STATUS.KRAP;
  } else {
    status = STATUS.RUIMTE;
  }

  return {
    status,
    peildatum,
    tijdenVandaag,
    totaalTijden,
    eersteDatum,
    wachtdagen,
    dagenMetTijden: dagenMetTijden.length,
    dagenGeteld: dagen.length,
    horizon,
    eersteTijden: (eerste?.slots ?? []).filter((s) => !s.disabled).map((s) => s.label).slice(0, 8),
  };
}

// Haalt de beschikbaarheid op tot en met de horizon van het portaal, voor elke
// locatie even ver. Eerder werd alleen doorgebladerd als het eerste blok leeg
// was, waardoor een volle locatie over een kortere periode geteld werd dan een
// lege. Het getal was daardoor niet tussen locaties te vergelijken.
export async function haalBeschikbaarheid({
  client,
  apiUrl,
  token,
  params,
  peildatum,
  maxVensters = 3,
  drempels = DREMPELS,
}) {
  const vensters = [];
  let datum = peildatum;
  const bezocht = new Set();

  for (let i = 0; i < maxVensters; i += 1) {
    if (bezocht.has(datum)) break;
    bezocht.add(datum);

    const venster = await client.haalSlots(apiUrl, token, { ...params, date: datum });
    vensters.push(venster);

    const horizon = venster?.dates?.max ?? null;
    const laatsteDag = (venster?.days ?? []).at(-1)?.date ?? null;
    const volgende = venster?.dates?.next ?? null;

    // Klaar zodra het opgehaalde blok tot aan de horizon reikt, of zodra het
    // portaal geen volgend blok meer aanbiedt.
    if (!volgende) break;
    if (horizon && laatsteDag && laatsteDag >= horizon) break;
    datum = volgende;
  }

  return { ...vatVensterSamen(vensters, { peildatum, drempels }), vensters: vensters.length };
}

// Vertaalt een status naar de actie die de opdrachtgever moet overwegen.
export const ACTIE_BIJ_STATUS = {
  [STATUS.RUIMTE]: 'Geen actie nodig.',
  [STATUS.KRAP]: 'Let op. Overweeg advertentiebudget te temperen voor deze locatie.',
  [STATUS.GEEN_RUIMTE]:
    'Er is online niets te plannen binnen de horizon. Overweeg advertenties voor deze locatie te pauzeren.',
  [STATUS.GEEN_ONLINE_ROUTE]:
    'Deze locatie biedt deze behandeling niet online aan. Adverteren op online plannen heeft hier geen zin.',
  [STATUS.FOUT]: 'De meting is mislukt. Beoordeel dit handmatig voordat je actie onderneemt.',
};
