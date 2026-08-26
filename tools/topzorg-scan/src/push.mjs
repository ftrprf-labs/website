// De wekelijkse signalering voor marketing: welke locaties hebben de komende
// week zoveel online ruimte dat er extra op ingezet kan worden.
//
// Deze module kiest en schrijft alleen. Versturen gebeurt in de server, zodat
// dit deel zonder netwerk en zonder mailkoppeling te toetsen is.

import { STATUS } from './beschikbaarheid.mjs';

export const PUSH_DREMPELS = {
  // Minstens zoveel vrije tijden in de komende week.
  minTijdenKomendeWeek: 10,
  // En snel terecht kunnen, want ruimte over twee weken is geen argument om
  // vandaag meer bezoekers naar die locatie te sturen.
  maxWachtdagen: 3,
};

function nlDatum(iso) {
  if (!iso) return '';
  const maanden = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
  ];
  const [, maand, dag] = iso.split('-');
  return `${Number(dag)} ${maanden[Number(maand) - 1]}`;
}

// De week waarin de peildatum valt. Op maandagochtend is dat precies de week
// die voor de deur staat.
export function komendeWeek(locatie) {
  return locatie?.weken?.[0] ?? null;
}

export function kiesPushLocaties(dataset, drempels = PUSH_DREMPELS) {
  const gekozen = [];
  for (const locatie of dataset?.locaties ?? []) {
    if (locatie.status !== STATUS.RUIMTE) continue;
    const week = komendeWeek(locatie);
    if (!week) continue;
    if (week.tijden < drempels.minTijdenKomendeWeek) continue;
    if (typeof locatie.wachtdagen !== 'number' || locatie.wachtdagen > drempels.maxWachtdagen) continue;
    gekozen.push({ locatie, week });
  }
  return gekozen.sort(
    (a, b) => b.week.tijden - a.week.tijden || (a.locatie.naam ?? '').localeCompare(b.locatie.naam ?? ''),
  );
}

function wachtzin(locatie) {
  if (locatie.wachtdagen === 0) return 'vandaag al terecht';
  if (locatie.wachtdagen === 1) return 'morgen al terecht';
  return `binnen ${locatie.wachtdagen} dagen terecht`;
}

// Platte tekst, want dat is wat de verzendlaag aankan en wat in elke mailclient
// leesbaar blijft.
export function bouwPushMail(dataset, { url = '', drempels = PUSH_DREMPELS } = {}) {
  const gekozen = kiesPushLocaties(dataset, drempels);
  const week = gekozen[0]?.week ?? dataset?.locaties?.find((l) => l.weken?.length)?.weken?.[0] ?? null;
  const behandeling = dataset?.meting?.behandeling?.label ?? 'de gemeten behandeling';
  const periode = week ? `${nlDatum(week.vanaf)} tot en met ${nlDatum(week.totEnMet)}` : '';
  const weeknaam = week ? `week ${week.week}` : 'de komende week';

  const onderwerp = gekozen.length
    ? `Ruimte in de agenda, ${weeknaam}: ${gekozen.length} ${gekozen.length === 1 ? 'locatie' : 'locaties'} om extra te pushen`
    : `Ruimte in de agenda, ${weeknaam}: geen locaties met veel ruimte`;

  const regels = [];
  regels.push('Hoi,');
  regels.push('');

  if (gekozen.length === 0) {
    regels.push(
      `Deze week zijn er geen locaties met opvallend veel online ruimte in ${weeknaam}` +
        `${periode ? ` (${periode})` : ''}. Er is dus geen locatie die zich nu aanbiedt voor extra inzet.`,
    );
  } else {
    regels.push(
      `Deze locaties hebben de meeste online ruimte in ${weeknaam}${periode ? ` (${periode})` : ''}. ` +
        'Hier kan extra op ingezet worden, want een patiënt kan er snel terecht.',
    );
    if (week && !week.volledig) {
      regels.push('');
      regels.push(
        'Let op: deze meting valt midden in de week, dus de getallen gaan over het deel van de week ' +
          `dat nog komt, van ${periode}.`,
      );
    }
    regels.push('');

    const perProvincie = new Map();
    for (const rij of gekozen) {
      const naam = rij.locatie.provincie ?? 'Provincie onbekend';
      if (!perProvincie.has(naam)) perProvincie.set(naam, []);
      perProvincie.get(naam).push(rij);
    }
    const provincies = [...perProvincie.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );

    for (const [provincie, rijen] of provincies) {
      regels.push(`${provincie}`);
      for (const { locatie, week: w } of rijen) {
        regels.push(`  ${locatie.naam}, ${locatie.plaats ?? ''}`.trimEnd());
        regels.push(`    ${w.tijden} vrije tijden, ${wachtzin(locatie)}`);
      }
      regels.push('');
    }
  }

  regels.push(
    `Geteld zijn de tijden die een patiënt online kan kiezen voor ${behandeling} zonder verwijzing. ` +
      'Dat is niet de volledige agenda van een praktijk.',
  );
  regels.push(
    `Een locatie komt in deze lijst bij minstens ${drempels.minTijdenKomendeWeek} vrije tijden in ${weeknaam} ` +
      `en een eerste mogelijkheid binnen ${drempels.maxWachtdagen} dagen.`,
  );
  regels.push('');
  if (url) {
    regels.push('Het volledige overzicht, ook de locaties waar juist geen ruimte is:');
    regels.push(url);
    regels.push('');
  }
  regels.push('Deze mail gaat elke maandagochtend automatisch uit, na de meting van die ochtend.');

  return { onderwerp, tekst: regels.join('\n'), aantal: gekozen.length, gekozen, week };
}
