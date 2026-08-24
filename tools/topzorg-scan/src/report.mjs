// Rapportage. Levert drie vormen op: het leesbare rapport uit de opdracht,
// een JSON versie voor latere automatisering, en een korte samenvatting voor
// de console.

export const CHECK_DEFINITIES = [
  { sleutel: 'websiteBereikbaar', label: 'Website bereikbaar', blokkerend: true },
  { sleutel: 'locatieHerkenbaar', label: 'Locatie herkenbaar', blokkerend: true },
  { sleutel: 'afspraakknop', label: 'Afspraakknop', blokkerend: true },
  { sleutel: 'portaalBereikbaar', label: 'Mijn Zorgtoegang bereikbaar', blokkerend: true },
  { sleutel: 'behandelingBeschikbaar', label: 'Behandeling beschikbaar', blokkerend: false },
  { sleutel: 'agendaGeladen', label: 'Agenda geladen', blokkerend: false },
  { sleutel: 'beschikbareTijden', label: 'Beschikbare tijden', blokkerend: false },
];

export function bepaalStatus(checks) {
  const waarde = (s) => checks[s]?.waarde ?? 'NEE';

  for (const def of CHECK_DEFINITIES) {
    if (def.blokkerend && waarde(def.sleutel) === 'NEE') return 'ROOD';
  }
  const alles = CHECK_DEFINITIES.every((def) => waarde(def.sleutel) === 'JA');
  return alles ? 'GROEN' : 'ORANJE';
}

export function bouwConclusie(status, checks, context) {
  const waarde = (s) => checks[s]?.waarde ?? 'NEE';
  const detail = (s) => checks[s]?.detail ?? '';
  const zinnen = [];

  if (status === 'GROEN') {
    zinnen.push(
      `Een patiënt kan bij ${context.naam} de volledige online route doorlopen tot en met de keuze van een tijdslot.`,
    );
    const aantal = checks.beschikbareTijden?.meta?.aantal;
    if (aantal) {
      zinnen.push(`De agenda toonde ${aantal} beschikbare tijden op het moment van de scan.`);
    }
    zinnen.push('De scan is gestopt voor het bevestigingsscherm, dus er is geen afspraak vastgelegd.');
    return zinnen.join(' ');
  }

  if (status === 'ROOD') {
    // Een netwerkfout aan de kant van de scanner is geen bevinding over de
    // vestiging. Die uitkomst mag dus ook niet als zodanig gelezen worden.
    if (checks.websiteBereikbaar?.meta?.eigenNetwerk) {
      return [
        `De scan kon ${context.naam} niet bereiken, maar de oorzaak ligt bij het netwerk van de scanner.`,
        detail('websiteBereikbaar'),
        'Deze run zegt daarom niets over de online route van de vestiging en telt niet mee als meting.',
      ].join(' ');
    }
    if (waarde('websiteBereikbaar') === 'NEE') {
      zinnen.push(`De locatiepagina van ${context.naam} was niet bereikbaar. ${detail('websiteBereikbaar')}`);
    } else if (waarde('locatieHerkenbaar') === 'NEE') {
      zinnen.push(
        `De pagina laadde wel, maar de vestiging was niet herkenbaar in de tekst. Mogelijk is de URL verhuisd of leidt hij naar een overzichtspagina.`,
      );
    } else if (waarde('afspraakknop') === 'NEE') {
      zinnen.push(
        `Op de locatiepagina staat geen zichtbare knop om online een afspraak te maken. Een patiënt die hier landt, kan alleen nog bellen.`,
      );
    } else if (waarde('portaalBereikbaar') === 'NEE') {
      zinnen.push(
        `De afspraakknop leidt niet naar een werkend Mijn Zorgtoegang scherm. ${detail('portaalBereikbaar')}`,
      );
    }
    zinnen.push('Dit blokkeert de online route volledig en vraagt om directe opvolging.');
    return zinnen.join(' ');
  }

  // ORANJE
  if (waarde('behandelingBeschikbaar') === 'NEE') {
    zinnen.push(
      `Het portaal opent wel, maar de scan vond geen keuze voor een fysiotherapie intake. ${detail('behandelingBeschikbaar')}`,
    );
  } else if (waarde('agendaGeladen') === 'NEE') {
    zinnen.push(
      `De behandeling is te kiezen, maar er verscheen geen agenda. ${detail('agendaGeladen')}`,
    );
  } else if (waarde('beschikbareTijden') === 'NEE') {
    zinnen.push(
      'De agenda laadt, maar toont geen beschikbare tijden. Voor een patiënt ziet dit eruit als een praktijk zonder ruimte.',
    );
  }
  zinnen.push('De route start dus wel, maar loopt vast voordat een patiënt een moment kan kiezen.');
  return zinnen.join(' ');
}

function jaNee(checks, sleutel) {
  const waarde = checks[sleutel]?.waarde ?? 'NEE';
  return waarde === 'JA' ? 'JA' : waarde === 'NVT' ? 'NIET GETEST' : 'NEE';
}

export function bouwRapportTekst(resultaat) {
  const { locatie, datum, status, checks, conclusie, gestoptBij, veiligheid } = resultaat;
  const r = [];

  r.push('DIGITALE PATIËNTSCAN');
  r.push('');
  r.push('Locatie:');
  r.push(locatie.naam);
  r.push('');
  r.push('Datum test:');
  r.push(datum);
  r.push('');
  r.push('Status:');
  r.push(status);
  r.push('');
  r.push('Checks:');
  r.push('');
  for (const def of CHECK_DEFINITIES) {
    r.push(`${def.label}:`);
    r.push(jaNee(checks, def.sleutel));
    const detail = checks[def.sleutel]?.detail;
    if (detail) r.push(`Toelichting: ${detail}`);
    r.push('');
  }
  r.push('Gestopt bij:');
  r.push(gestoptBij);
  r.push('');
  r.push('Veiligheid:');
  r.push(
    `Geen afspraak bevestigd. Geblokkeerde schrijfverzoeken: ${veiligheid.geblokkeerdeVerzoeken}. Ingevulde persoonsgegevens: geen.`,
  );
  r.push('');
  r.push('Conclusie:');
  r.push(conclusie);
  r.push('');

  return r.join('\n');
}

export function bouwRapportJson(resultaat) {
  return JSON.stringify(resultaat, null, 2);
}
