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

// Vat een of meer opgehaalde vensters samen tot een beeld per locatie.
export function vatVensterSamen(vensters, { peildatum, drempels = DREMPELS } = {}) {
  const dagen = [];
  for (const venster of vensters) {
    for (const dag of venster?.days ?? []) dagen.push(dag);
  }

  const dagenMetTijden = dagen
    .filter((d) => !d.disabled && telTijden(d) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totaalTijden = dagen.reduce((som, d) => som + telTijden(d), 0);
  const vandaag = dagen.find((d) => d.date === peildatum);
  const tijdenVandaag = telTijden(vandaag);

  const eerste = dagenMetTijden[0] ?? null;
  const eersteDatum = eerste?.date ?? null;
  const wachtdagen = eersteDatum ? dagenVerschil(peildatum, eersteDatum) : null;

  const laatsteVenster = vensters[vensters.length - 1] ?? null;
  const horizon = laatsteVenster?.dates?.max ?? null;

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
    dagenBekeken: dagen.length,
    horizon,
    eersteTijden: (eerste?.slots ?? []).filter((s) => !s.disabled).map((s) => s.label).slice(0, 8),
  };
}

// Haalt de beschikbaarheid van een locatie op, en bladert door zolang er nog
// geen enkele vrije dag gevonden is. Zo komt de eerstvolgende mogelijkheid ook
// in beeld als die buiten het eerste venster valt.
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

  for (let i = 0; i < maxVensters; i += 1) {
    const venster = await client.haalSlots(apiUrl, token, { ...params, date: datum });
    vensters.push(venster);

    const heeftTijden = (venster?.days ?? []).some((d) => !d.disabled && (d.slots ?? []).some((s) => !s.disabled));
    const volgende = venster?.dates?.next ?? null;
    if (heeftTijden || !volgende) break;
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
