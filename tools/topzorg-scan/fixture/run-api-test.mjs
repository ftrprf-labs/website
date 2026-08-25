// Toetst de API laag zonder netwerk, tegen antwoorden die gemodelleerd zijn op
// de echte verkenningen.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiFout, kiesOpLabel, leesAdres, maakClient } from '../src/api.mjs';
import { maakLogger } from '../src/logger.mjs';
import { verkenApi } from '../src/api-verken.mjs';
import { haalBeschikbaarheid, STATUS, vatVensterSamen } from '../src/beschikbaarheid.mjs';
import { bouwProvincieKaart, zoekProvincie } from '../src/ophalen.mjs';
import { maakNepFetch, REFERENTIES } from './api-antwoorden.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const UITVOER = resolve(HIER, '..', 'runs', 'api-test');
rmSync(UITVOER, { recursive: true, force: true });

let fouten = 0;
const meld = (goed, tekst) => {
  process.stdout.write(`${goed ? 'PASS' : 'FAIL'}: ${tekst}\n`);
  if (!goed) fouten += 1;
};

// 1. Exacte labelkeuze gaat voor op een gedeeltelijke match.
const focuses = [
  { reference: 'a', label: 'Bekkenfysiotherapie (intake)' },
  { reference: 'b', label: 'Fysiotherapie (intake)' },
];
meld(
  kiesOpLabel(focuses, 'Fysiotherapie (intake)')?.reference === 'b',
  'kiesOpLabel pakt de exacte behandeling en niet Bekkenfysiotherapie',
);

// 2. Adres uitlezen.
const adres = leesAdres({ address_line2: '3821AL Amersfoort' });
meld(adres.postcode === '3821AL' && adres.plaats === 'Amersfoort', 'postcode en plaats uit het adresblok');

// 3. De volledige flow over de nep API.
const log = [];
const client = maakClient({ fetchImpl: maakNepFetch({ log }), pauzeMs: 0 });
const { resultaat } = await verkenApi({
  out: join(UITVOER, 'flow'),
  client,
  logger: maakLogger(null),
});

meld(resultaat.focus?.reference === REFERENTIES.FOCUS_FYSIO, 'de flow kiest Fysiotherapie (intake)');
meld(resultaat.referral?.reference === REFERENTIES.REFERRAL_GEEN, 'de flow kiest Geen verwijzing');
meld(resultaat.practices?.length === 2, `de flow leest ${resultaat.practices?.length} locaties`);
meld(
  resultaat.practices?.[0]?.plaats === 'Amersfoort' && resultaat.practices?.[0]?.postcode === '3821AL',
  'locaties krijgen postcode en plaats mee',
);
meld(
  resultaat.standaarden?.employee === REFERENTIES.EMPLOYEE && resultaat.standaarden?.gender === REFERENTIES.GENDER,
  'standaardparameters komen uit de stappen',
);

const gelukteVariant = (resultaat.slotVarianten ?? []).find((v) => v.gelukt);
meld(gelukteVariant?.naam === 'volledig', `de werkende slotvariant is "${gelukteVariant?.naam}"`);

// 4. De cliënt weigert de stappen persoonsgegevens en bevestigen.
for (const pad of ['data', 'confirmation']) {
  let geweigerd = false;
  try {
    await client.haalJson(`https://api.mijnzorgtoegang.nl/appointment/compose-first-appointments/v1/${pad}`);
  } catch (err) {
    geweigerd = err instanceof ApiFout && /bewust niet opgehaald/.test(err.message);
  }
  meld(geweigerd, `de cliënt weigert de stap ${pad}`);
}

// 5. Er is nooit een schrijvend verzoek gedaan.
meld(log.length > 0 && log.every((u) => typeof u === 'string'), `${log.length} verzoeken gedaan, alle lezend`);

// 6. Analyse van de beschikbaarheid.
const venster = {
  dates: { current: '2026-08-24', min: '2026-08-24', max: '2026-09-21', next: '2026-09-01' },
  days: [
    { date: '2026-08-24', disabled: true, slots: [] },
    { date: '2026-08-27', disabled: false, slots: [
      { reference: 'a', label: '15:00', disabled: false },
      { reference: 'b', label: '15:30', disabled: false },
    ] },
    { date: '2026-08-28', disabled: false, slots: [{ reference: 'c', label: '09:00', disabled: true }] },
  ],
};
const samenvatting = vatVensterSamen([venster], { peildatum: '2026-08-24' });
meld(samenvatting.totaalTijden === 2, `uitgeschakelde tijden tellen niet mee (${samenvatting.totaalTijden})`);
meld(samenvatting.eersteDatum === '2026-08-27', 'de eerstvolgende mogelijkheid wordt gevonden');
meld(samenvatting.wachtdagen === 3, `wachttijd in dagen klopt (${samenvatting.wachtdagen})`);
meld(samenvatting.status === STATUS.KRAP, `weinig tijden levert status ${samenvatting.status} op`);

const leeg = vatVensterSamen([{ dates: {}, days: [{ date: '2026-08-24', disabled: true, slots: [] }] }], {
  peildatum: '2026-08-24',
});
meld(leeg.status === STATUS.GEEN_RUIMTE, 'nul tijden levert GEEN_RUIMTE op');
meld(leeg.eersteDatum === null, 'zonder tijden is er geen eerstvolgende datum');

// 7. Provincie-indeling uit de namen van de locatiepagina's.
const kaart = bouwProvincieKaart([
  { naam: 'Fysiotherapie Amersfoort', provincie: 'Utrecht' },
  { naam: 'Revalidatie Assen', provincie: 'Drenthe' },
]);
meld(zoekProvincie(kaart, 'Amersfoort') === 'Utrecht', 'plaats naar provincie');
meld(zoekProvincie(kaart, 'Onbekendstad') === null, 'onbekende plaats levert niets op in plaats van een gok');

// 8. Tellen over dezelfde periode, zonder dubbeltelling en zonder de horizon te
//    overschrijden. Blok 1 en blok 2 delen 2 september, en 14 september ligt
//    voorbij de horizon van 10 september.
const overBlokken = await haalBeschikbaarheid({
  client,
  apiUrl: 'https://api.mijnzorgtoegang.nl',
  token: 'test-token',
  params: {
    focus: REFERENTIES.FOCUS_FYSIO,
    referral: REFERENTIES.REFERRAL_GEEN,
    practice: REFERENTIES.PRACTICE_A,
  },
  peildatum: '2026-08-24',
});

meld(overBlokken.vensters === 2, `beide blokken opgehaald (${overBlokken.vensters})`);
meld(overBlokken.totaalTijden === 4, `2 september telt een keer mee, totaal ${overBlokken.totaalTijden} in plaats van 5`);
meld(overBlokken.horizon === '2026-09-10', `horizon ${overBlokken.horizon}`);
// Meegeteld horen: 24 en 25 augustus, en 2, 5 en 8 september. Dus vijf dagen.
// 20 augustus valt voor de peildatum, 14 september valt voorbij de horizon, en 2
// september zit in beide blokken maar telt een keer.
meld(
  overBlokken.dagenGeteld === 5,
  `vijf dagen geteld, dus niets voor de peildatum en niets voorbij de horizon (${overBlokken.dagenGeteld})`,
);
meld(overBlokken.eersteDatum === '2026-08-25', `eerste mogelijkheid ${overBlokken.eersteDatum}`);
meld(overBlokken.tijdenVandaag === 0, 'de peildatum zelf staat uitgeschakeld en telt nul');

process.stdout.write(`\n${fouten === 0 ? 'API TEST GESLAAGD' : `${fouten} API CONTROLES GEFAALD`}\n`);
process.exit(fouten === 0 ? 0 : 1);
