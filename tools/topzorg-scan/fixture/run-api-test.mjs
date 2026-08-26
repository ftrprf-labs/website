// Toetst de API laag zonder netwerk, tegen antwoorden die gemodelleerd zijn op
// de echte verkenningen.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiFout, kiesOpLabel, leesAdres, maakClient } from '../src/api.mjs';
import { maakLogger } from '../src/logger.mjs';
import { verkenApi } from '../src/api-verken.mjs';
import { haalBeschikbaarheid, STATUS, vatVensterSamen, zoekDeuken } from '../src/beschikbaarheid.mjs';
import { bouwWeken, isoWeek, maandagVan, weekdag } from '../src/weken.mjs';
import { bouwPushMail, kiesPushLocaties } from '../src/push.mjs';
import { bouwDashboard } from '../src/dashboard.mjs';
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

// 9. Weekrekenen. De jaarwisseling is de plek waar een eigen weeknummer
//    misgaat, dus die staat er expliciet in.
meld(isoWeek('2026-01-01').sleutel === '2026-W01', 'nieuwjaarsdag 2026 valt in week 1');
meld(isoWeek('2026-12-31').week === 53, '2026 heeft een week 53');
meld(isoWeek('2027-01-01').jaar === 2026, '1 januari 2027 hoort bij het weekjaar 2026');
meld(maandagVan('2026-08-26') === '2026-08-24', 'de maandag van een woensdag');
meld(weekdag('2026-08-24') === 1 && weekdag('2026-08-30') === 7, 'maandag is 1 en zondag is 7');

// 10. De weken tussen peildatum en horizon. De eerste en de laatste zijn half,
//     en die mogen niet als hele week meetellen.
const weekLijst = bouwWeken('2026-08-26', '2026-09-23');
meld(weekLijst.length === 5, `vijf weken tussen 26 augustus en 23 september (${weekLijst.length})`);
meld(weekLijst[0].vanaf === '2026-08-26' && !weekLijst[0].volledig, 'de eerste week begint op de peildatum en is half');
meld(weekLijst.at(-1).totEnMet === '2026-09-23' && !weekLijst.at(-1).volledig, 'de laatste week stopt op de horizon');
meld(weekLijst.filter((w) => w.volledig).length === 3, 'er zijn drie hele weken');

// 11. Het weekprofiel telt de vrije tijden per week.
function dagenReeks(perWeekAantal) {
  const days = [];
  let datum = '2026-08-26';
  let index = 0;
  while (datum <= '2026-09-23') {
    const week = Math.floor((index + 2) / 7); // 26 augustus is woensdag
    const n = perWeekAantal[week] ?? 0;
    days.push({
      date: datum,
      disabled: n === 0,
      slots: Array.from({ length: n }, (_, i) => ({ reference: `${datum}-${i}`, label: '09:00', disabled: false })),
    });
    const d = new Date(`${datum}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    datum = d.toISOString().slice(0, 10);
    index += 1;
  }
  return { dates: { current: '2026-08-26', min: '2026-08-26', max: '2026-09-23', next: null }, days };
}

// Twee per dag in elke week, behalve in de derde week. Dat is de vakantie.
const metVakantie = vatVensterSamen([dagenReeks([2, 2, 0, 2, 2])], { peildatum: '2026-08-26' });
meld(metVakantie.weken.length === 5, `vijf weken in de samenvatting (${metVakantie.weken.length})`);
meld(metVakantie.weken[1].tijden === 14, `een hele week met twee per dag telt 14 (${metVakantie.weken[1].tijden})`);
meld(metVakantie.deuken.length === 1, `een deuk gevonden (${metVakantie.deuken.length})`);
meld(metVakantie.deuken[0]?.tijden === 0, 'de deuk is de lege week');
meld(metVakantie.deuken[0]?.publicatieUitgesloten === true, 'een gevulde week erna sluit een publicatieachterstand uit');

// Een vlakke agenda levert geen deuk op, en een lege agenda ook niet, want dan
// is er niets om mee te vergelijken.
meld(vatVensterSamen([dagenReeks([2, 2, 2, 2, 2])], { peildatum: '2026-08-26' }).deuken.length === 0,
  'een gelijkmatige agenda geeft geen valse deuk');
meld(vatVensterSamen([dagenReeks([0, 0, 0, 0, 0])], { peildatum: '2026-08-26' }).deuken.length === 0,
  'een lege agenda levert geen deuk op maar de status GEEN_RUIMTE');

// De halve eerste en laatste week doen niet mee, anders zou elke meting midden
// in de week twee valse deuken opleveren.
meld(zoekDeuken(metVakantie.weken).every((d) => d.week !== metVakantie.weken[0].week), 'de halve eerste week is nooit een deuk');

// 12. De keuze voor de wekelijkse mail aan marketing.
const pushSet = {
  meting: { peildatum: '2026-08-24', behandeling: { label: 'Fysiotherapie (intake)' } },
  locaties: [
    { naam: 'Veel ruimte', plaats: 'Assen', provincie: 'Drenthe', status: STATUS.RUIMTE, wachtdagen: 0,
      weken: [{ week: 35, sleutel: '2026-W35', vanaf: '2026-08-24', totEnMet: '2026-08-30', volledig: true, tijden: 20 }] },
    { naam: 'Net te weinig', plaats: 'Breda', provincie: 'Noord-Brabant', status: STATUS.RUIMTE, wachtdagen: 0,
      weken: [{ week: 35, sleutel: '2026-W35', vanaf: '2026-08-24', totEnMet: '2026-08-30', volledig: true, tijden: 9 }] },
    { naam: 'Ruimte maar pas laat', plaats: 'Zwolle', provincie: 'Overijssel', status: STATUS.RUIMTE, wachtdagen: 6,
      weken: [{ week: 35, sleutel: '2026-W35', vanaf: '2026-08-24', totEnMet: '2026-08-30', volledig: true, tijden: 30 }] },
    { naam: 'Krap', plaats: 'Utrecht', provincie: 'Utrecht', status: STATUS.KRAP, wachtdagen: 0,
      weken: [{ week: 35, sleutel: '2026-W35', vanaf: '2026-08-24', totEnMet: '2026-08-30', volledig: true, tijden: 40 }] },
  ],
};

const gekozen = kiesPushLocaties(pushSet);
meld(gekozen.length === 1 && gekozen[0].locatie.naam === 'Veel ruimte', `alleen de locatie met veel ruimte en snel terecht (${gekozen.length})`);

const pushMail = bouwPushMail(pushSet, { url: 'https://voorbeeld.test/topzorg' });
meld(/week 35/.test(pushMail.onderwerp), `het weeknummer staat in het onderwerp: "${pushMail.onderwerp}"`);
meld(pushMail.tekst.includes('Veel ruimte') && !pushMail.tekst.includes('Krap'), 'de mail noemt alleen de gekozen locaties');
meld(pushMail.tekst.includes('https://voorbeeld.test/topzorg'), 'de link naar het overzicht staat in de mail');
// De huisregel voor zichtbare tekst: geen streepje als stijlmiddel.
meld(!/ [-–—] /.test(pushMail.tekst), 'de mailtekst gebruikt geen streepje als pauze');

const leegPush = bouwPushMail({ meting: {}, locaties: [] });
meld(leegPush.aantal === 0 && /geen locaties/.test(leegPush.onderwerp), 'zonder ruimte zegt de mail dat er niets te pushen valt');

// 13. Het dashboard verwerkt het weekprofiel zonder te struikelen.
const html = bouwDashboard({
  meting: { tijdstip: '2026-08-26T05:00:00.000Z', peildatum: '2026-08-26', behandeling: { label: 'Fysiotherapie (intake)' } },
  samenvatting: { totaal: 1, perStatus: {} },
  locaties: [{ naam: 'Testlocatie', plaats: 'Assen', provincie: 'Drenthe', straat: 'Weg 1', ...metVakantie }],
});
meld(html.includes('Komende weken'), 'het dashboard toont de kolom met komende weken');
meld(html.includes('Deuken in de komende weken'), 'het dashboard toont de sectie met deuken');
meld((html.match(/class="wblok/g) || []).length === 5, 'er staan vijf weekblokjes in de rij');
meld(html.includes('filter-week'), 'de weekkiezer staat in de pagina');

process.stdout.write(`\n${fouten === 0 ? 'API TEST GESLAAGD' : `${fouten} API CONTROLES GEFAALD`}\n`);
process.exit(fouten === 0 ? 0 : 1);
