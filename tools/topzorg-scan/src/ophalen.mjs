#!/usr/bin/env node
// Dagelijkse meting voor het organisatiebrede overzicht.
//
//   node src/ophalen.mjs [--focus="Fysiotherapie (intake)"] [--out=<map>]
//                        [--gelijktijdig=3] [--max-locaties=0]
//
// Haalt via de publieke API alle locaties op die de gekozen behandeling
// aanbieden, en meet per locatie de beschikbaarheid. Uitsluitend lezende
// verzoeken. De stappen persoonsgegevens en bevestigen worden nooit benaderd.
//
// De provincie komt uit de afspraakpagina van TopzorgGroep, die de vestigingen
// per provincie groepeert. Zo hoeft de indeling niet uit een postcode geraden
// te worden.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { kiesOpLabel, leesAdres, maakClient } from './api.mjs';
import { ACTIE_BIJ_STATUS, haalBeschikbaarheid, STATUS } from './beschikbaarheid.mjs';
import { maakLogger } from './logger.mjs';
import { AFSPRAAKPAGINA, leesLocatiepaginas } from './register.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HIER, '..');

const STANDAARD_FOCUS = 'Fysiotherapie (intake)';
const STANDAARD_VERWIJZING = 'Geen verwijzing';

// Voert taken uit met een bovengrens op het aantal tegelijk, zodat de meting
// vriendelijk blijft voor een systeem dat niet van ons is.
async function metGrens(items, grens, taak) {
  const resultaten = new Array(items.length);
  let volgende = 0;

  async function werker() {
    while (volgende < items.length) {
      const index = volgende;
      volgende += 1;
      resultaten[index] = await taak(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(grens, items.length) }, werker));
  return resultaten;
}

// Plaats naar provincie, afgeleid uit de afspraakpagina. De namen van de
// locatiepagina's bevatten de plaats, bijvoorbeeld "Fysiotherapie Amersfoort".
export function bouwProvincieKaart(locatiepaginas) {
  const kaart = new Map();
  for (const locatie of locatiepaginas) {
    const plaats = locatie.naam.replace(/^(Fysiotherapie|Revalidatie|Diëtetiek|Dietetiek)\s+/i, '').trim();
    if (!plaats) continue;
    const sleutel = plaats.toLowerCase();
    if (!kaart.has(sleutel)) kaart.set(sleutel, locatie.provincie);
  }
  return kaart;
}

// Vaste tabel als basis. Het locatiemenu op de afspraakpagina wordt door
// JavaScript opgebouwd, dus een gewoon verzoek ziet die indeling niet. De
// tabel is een keer uit de gerenderde pagina afgeleid en verandert zelden,
// want plaatsen verhuizen niet van provincie. Nieuwe vestigingen kunnen wel
// nieuwe plaatsen opleveren, en die vallen dan zichtbaar op als onbekend.
export function laadVasteProvincieKaart(pad = join(PROJECT, 'data', 'plaats-provincie.json')) {
  try {
    const data = JSON.parse(readFileSync(pad, 'utf8'));
    const kaart = new Map();
    for (const bron of [data.afgeleid ?? {}, data.handmatig ?? {}]) {
      for (const [plaats, provincie] of Object.entries(bron)) {
        kaart.set(plaats.toLowerCase(), provincie);
      }
    }
    return kaart;
  } catch {
    return new Map();
  }
}

export function zoekProvincie(kaart, plaats) {
  if (!plaats) return null;
  const sleutel = plaats.toLowerCase();
  if (kaart.has(sleutel)) return kaart.get(sleutel);
  // Plaatsnamen kunnen net anders geschreven zijn. Val terug op het eerste woord.
  const eerste = sleutel.split(/[\s-]/)[0];
  for (const [k, v] of kaart) {
    if (k === eerste || k.startsWith(`${eerste} `) || k.startsWith(`${eerste}-`)) return v;
  }
  return null;
}

export async function haalAlles({
  focusLabel = STANDAARD_FOCUS,
  verwijzingLabel = STANDAARD_VERWIJZING,
  out = null,
  gelijktijdig = 3,
  maxLocaties = 0,
  peildatum = new Date().toISOString().slice(0, 10),
  client = maakClient({ pauzeMs: 300 }),
  haalPagina = async (url) => (await fetch(url)).text(),
  logger = maakLogger(null),
} = {}) {
  const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runMap = out ?? join(PROJECT, 'runs', `meting_${stempel}`);
  mkdirSync(runMap, { recursive: true });

  logger.stap('Publiek token en stappen ophalen.');
  const { token, apiUrl, verlooptOp } = await client.haalContext();
  const { standaarden } = await client.haalStappen(apiUrl, token);
  logger.ok(`Token geldig tot ${verlooptOp}.`);

  logger.stap('Aandachtsgebied en verwijzing kiezen.');
  const focusData = await client.haalFocuses(apiUrl, token, standaarden);
  const focus = kiesOpLabel(focusData?.focuses ?? [], focusLabel);
  if (!focus) throw new Error(`Aandachtsgebied "${focusLabel}" niet gevonden.`);

  const referralData = await client.haalReferrals(apiUrl, token, { ...standaarden, focus: focus.reference });
  const referral = kiesOpLabel(referralData?.referrals ?? [], verwijzingLabel);
  if (!referral) throw new Error(`Verwijzingsoptie "${verwijzingLabel}" niet gevonden.`);
  logger.ok(`"${focus.label}" met "${referral.label}".`);

  logger.stap('Locaties ophalen.');
  const basisParams = { ...standaarden, focus: focus.reference, referral: referral.reference };
  const practiceData = await client.haalPractices(apiUrl, token, basisParams);
  let practices = practiceData?.practices ?? [];
  logger.ok(`${practices.length} locaties bieden deze behandeling online aan.`);
  if (maxLocaties > 0) practices = practices.slice(0, maxLocaties);

  logger.stap('Provincie-indeling laden.');
  const provincieKaart = laadVasteProvincieKaart();
  logger.ok(`${provincieKaart.size} plaatsen uit de vaste tabel.`);

  // Mocht het menu ooit wel server-side geleverd worden, dan vult dat de tabel
  // vanzelf aan. Lukt het niet, dan is dat geen probleem.
  try {
    const html = await haalPagina(AFSPRAAKPAGINA);
    const live = bouwProvincieKaart(leesLocatiepaginas(html));
    let toegevoegd = 0;
    for (const [plaats, provincie] of live) {
      if (!provincieKaart.has(plaats)) {
        provincieKaart.set(plaats, provincie);
        toegevoegd += 1;
      }
    }
    if (toegevoegd > 0) logger.ok(`${toegevoegd} plaatsen aangevuld vanaf de afspraakpagina.`);
  } catch {
    // De vaste tabel is leidend, dus dit mag falen.
  }

  logger.stap(`Beschikbaarheid meten voor ${practices.length} locaties, ${gelijktijdig} tegelijk.`);
  let klaar = 0;

  const metingen = await metGrens(practices, gelijktijdig, async (practice) => {
    const adres = leesAdres(practice);
    const basis = {
      reference: practice.reference,
      naam: practice.label,
      straat: practice.address_line1 ?? null,
      postcode: adres.postcode,
      plaats: adres.plaats,
      provincie: zoekProvincie(provincieKaart, adres.plaats),
    };

    try {
      const beschikbaarheid = await haalBeschikbaarheid({
        client,
        apiUrl,
        token,
        params: { ...basisParams, practice: practice.reference },
        peildatum,
      });
      klaar += 1;
      if (klaar % 10 === 0) logger.info(`${klaar} van ${practices.length} gemeten.`);
      return { ...basis, ...beschikbaarheid, actie: ACTIE_BIJ_STATUS[beschikbaarheid.status] };
    } catch (err) {
      klaar += 1;
      logger.waarschuwing(`Meting mislukt voor "${practice.label}": ${err.message}`);
      return { ...basis, status: STATUS.FOUT, fout: err.message, actie: ACTIE_BIJ_STATUS[STATUS.FOUT] };
    }
  });

  const dataset = {
    meting: {
      tijdstip: new Date().toISOString(),
      peildatum,
      behandeling: { label: focus.label, reference: focus.reference },
      verwijzing: { label: referral.label, reference: referral.reference },
      locatiesGemeten: metingen.length,
    },
    samenvatting: vatSamen(metingen),
    locaties: metingen,
  };

  writeFileSync(join(runMap, 'meting.json'), JSON.stringify(dataset, null, 2), 'utf8');
  logger.ok(`Meting opgeslagen in ${runMap}`);
  return { runMap, dataset };
}

export function vatSamen(metingen) {
  const perStatus = {};
  for (const status of Object.values(STATUS)) perStatus[status] = 0;
  for (const m of metingen) perStatus[m.status] = (perStatus[m.status] ?? 0) + 1;

  const metTijden = metingen.filter((m) => (m.totaalTijden ?? 0) > 0);
  const wachttijden = metingen.map((m) => m.wachtdagen).filter((w) => typeof w === 'number');

  return {
    totaal: metingen.length,
    perStatus,
    totaalTijden: metingen.reduce((s, m) => s + (m.totaalTijden ?? 0), 0),
    locatiesMetTijden: metTijden.length,
    medianeWachtdagen: mediaan(wachttijden),
    provincies: new Set(metingen.map((m) => m.provincie).filter(Boolean)).size,
    plaatsen: new Set(metingen.map((m) => m.plaats).filter(Boolean)).size,
  };
}

function mediaan(getallen) {
  if (getallen.length === 0) return null;
  const gesorteerd = [...getallen].sort((a, b) => a - b);
  const midden = Math.floor(gesorteerd.length / 2);
  return gesorteerd.length % 2 === 0
    ? (gesorteerd[midden - 1] + gesorteerd[midden]) / 2
    : gesorteerd[midden];
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const opties = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--focus=')) opties.focusLabel = arg.slice('--focus='.length);
    else if (arg.startsWith('--out=')) opties.out = arg.slice('--out='.length);
    else if (arg.startsWith('--gelijktijdig=')) opties.gelijktijdig = Number(arg.slice('--gelijktijdig='.length)) || 3;
    else if (arg.startsWith('--max-locaties=')) opties.maxLocaties = Number(arg.slice('--max-locaties='.length)) || 0;
  }
  const runMap = opties.out ?? join(PROJECT, 'runs', `meting_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  mkdirSync(runMap, { recursive: true });
  opties.out = runMap;
  opties.logger = maakLogger(join(runMap, 'meting.log'));

  try {
    const { dataset } = await haalAlles(opties);
    const s = dataset.samenvatting;
    process.stdout.write(`\nLocaties gemeten: ${s.totaal}\n`);
    for (const [status, aantal] of Object.entries(s.perStatus)) {
      if (aantal > 0) process.stdout.write(`  ${status}: ${aantal}\n`);
    }
    process.stdout.write(`Totaal aantal tijden: ${s.totaalTijden}\n`);
    process.stdout.write(`Mediane wachttijd in dagen: ${s.medianeWachtdagen ?? 'onbekend'}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Meting afgebroken: ${err.stack ?? err.message}\n`);
    process.exit(3);
  }
}
