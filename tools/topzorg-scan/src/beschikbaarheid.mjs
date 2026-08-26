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

import { bouwWeken, plusDagen } from './weken.mjs';

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

// Wanneer een komende week opvalt als een deuk in de agenda, bijvoorbeeld door
// een vakantie. Een deuk wordt altijd afgezet tegen de weken eromheen bij
// dezelfde locatie, nooit tegen een andere locatie of tegen een vast getal.
// Dat moet ook wel: dichtbij staat elke agenda voller dan verderop, dus een
// vlakke drempel over alle weken heen zou vooral ruis opleveren.
export const DEUK = {
  // De week telt als deuk zodra hij onder dit deel van het gemiddelde van de
  // twee dichtstbijzijnde andere weken zakt.
  aandeelVanBuren: 0.4,
  // Strengere eis voor de eerstvolgende week, want die is altijd leger dan de
  // weken erna. Daar zijn al afspraken op gemaakt. Zonder dit verschil zou elke
  // normale volgeboekte week als vakantie gelden.
  aandeelVanBurenDichtbij: 0.25,
  // Onder dit aantal in de vergelijkingsweken zegt een verschil te weinig. Twee
  // tijden tegenover vijf is geen vakantie, dat is toeval.
  minimumBuren: 6,
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

  const weken = vulWeken(bouwWeken(peildatum, horizon), perDatum);
  const deuken = zoekDeuken(weken);

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
    weken,
    deuken,
    horizon,
    eersteTijden: (eerste?.slots ?? []).filter((s) => !s.disabled).map((s) => s.label).slice(0, 8),
  };
}

// Telt de vrije tijden per week. De dagen zijn al ontdubbeld en al begrensd op
// de peildatum en de horizon, dus hier hoeft alleen nog opgeteld te worden.
export function vulWeken(weken, perDatum) {
  return weken.map((week) => {
    let tijden = 0;
    let dagenMetTijden = 0;
    for (let datum = week.vanaf; datum <= week.totEnMet; datum = plusDagen(datum, 1)) {
      const aantal = telTijden(perDatum.get(datum));
      tijden += aantal;
      if (aantal > 0) dagenMetTijden += 1;
    }
    return { ...week, tijden, dagenMetTijden };
  });
}

// Zoekt weken die opvallend leger zijn dan de weken eromheen. Alleen volledige
// weken doen mee, want een halve week is per definitie leger en dat is geen
// signaal maar een rekenfout in wording.
//
// Elke week wordt afgezet tegen de twee dichtstbijzijnde andere volledige
// weken, bij voorkeur een aan elke kant. Dat de eerste en de laatste week
// meedoen is belangrijk: het portaal toont maar een kleine vier weken, dus vaak
// zijn er niet meer dan drie volledige weken, en een regel die alleen het
// middelste blokje kan beoordelen ziet in de praktijk vrijwel niets.
export function zoekDeuken(weken, drempels = DEUK) {
  const volledige = weken.filter((w) => w.volledig);
  if (volledige.length < 3) return [];
  const deuken = [];

  for (let i = 0; i < volledige.length; i += 1) {
    const deze = volledige[i];
    const vorige = volledige[i - 1] ?? null;
    const volgende = volledige[i + 1] ?? null;

    // Bij voorkeur een week aan elke kant. Ontbreekt er een, dan de twee
    // dichtstbijzijnde aan de andere kant, zodat ook de rand beoordeeld wordt.
    const vergelijking = vorige && volgende
      ? [vorige, volgende]
      : vorige
        ? [volledige[i - 2], vorige].filter(Boolean)
        : [volgende, volledige[i + 2]].filter(Boolean);
    if (vergelijking.length < 2) continue;

    const basis = vergelijking.reduce((som, w) => som + w.tijden, 0) / vergelijking.length;
    if (basis < drempels.minimumBuren) continue;

    // Zonder een eerdere week is dit de eerstvolgende week. Die ligt van
    // nature lager, dus daar geldt de strengere grens.
    const grens = vorige ? drempels.aandeelVanBuren : drempels.aandeelVanBurenDichtbij;
    if (deze.tijden > basis * grens) continue;

    deuken.push({
      sleutel: deze.sleutel,
      week: deze.week,
      start: deze.start,
      eind: deze.eind,
      tijden: deze.tijden,
      basis: Math.round(basis * 10) / 10,
      vergelekenMet: vergelijking.map((w) => ({ week: w.week, tijden: w.tijden })),
      eerstvolgendeWeek: !vorige,
      // Een agenda die nog niet open staat is verderop leeg, niet ertussenin.
      // Is een latere week wel gevuld, dan verklaart een publicatieachterstand
      // deze lege week dus niet meer.
      publicatieUitgesloten: deze.tijden === 0 && volgende !== null && volgende.tijden > 0,
    });
  }

  return deuken;
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
