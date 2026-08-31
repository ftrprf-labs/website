#!/usr/bin/env node
// Controle vooraf: kunnen we de twee sites überhaupt bereiken.
//
//   node src/verbinding.mjs
//
// Zonder deze controle start de browser, loopt hij vast op het netwerk, en
// levert dat een volledig rood rapport op dat eruitziet als een probleem bij
// TopzorgGroep. Dat is precies de verwarring die we niet willen. Beter een
// korte controle vooraf die zegt wat er aan de hand is.
//
// Uitsluitend lezende verzoeken naar de openbare voorpagina's.

// Per doel een herkenningspunt uit het antwoord zelf. Alleen kijken of er iets
// terugkomt is niet genoeg: een proxy of een portaal van een gastnetwerk
// antwoordt ook, met een eigen foutpagina. Dan lijkt de site bereikbaar terwijl
// je in werkelijkheid met de tussenliggende apparatuur praat.
const DOELEN = [
  { naam: 'TopzorgGroep', url: 'https://www.topzorggroep.nl/', herkenning: /topzorg/i },
  { naam: 'Mijn Zorgtoegang', url: 'https://tzg.mijnzorgtoegang.nl/app/context', herkenning: /organisation|api_url/i },
];

const TIJDSLIMIET_MS = 20_000;

// Een kale fetch wordt door beveiligingslagen nog wel eens geweigerd terwijl een
// browser er gewoon door mag. Deze controle moet meten of het netwerk het
// toelaat, niet of een botfilter ons herkent, dus vraagt hij het op zoals een
// browser dat doet.
const KOPPEN = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
};

// Vertaalt een netwerkfout naar de vraag die ertoe doet: ligt het aan ons of
// aan hen.
export function duidFout(err) {
  const tekst = `${err?.message ?? err} ${err?.cause?.message ?? ''} ${err?.cause?.code ?? ''}`;
  if (/ETIMEDOUT|timed out|AbortError|The operation was aborted/i.test(tekst)) {
    return { soort: 'tijd', eigenNetwerk: true, uitleg: 'De verbinding liep uit de tijd.' };
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(tekst)) {
    return { soort: 'dns', eigenNetwerk: true, uitleg: 'De naam kon niet worden opgezocht. Dat wijst op DNS of op geen internetverbinding.' };
  }
  if (/tunnel|proxy|ECONNREFUSED|ECONNRESET|EPROTO|403/i.test(tekst)) {
    return { soort: 'geblokkeerd', eigenNetwerk: true, uitleg: 'De verbinding werd geweigerd. Dat wijst op een proxy of een firewall op dit netwerk.' };
  }
  if (/certificate|self-signed|UNABLE_TO_VERIFY|CERT_/i.test(tekst)) {
    return { soort: 'certificaat', eigenNetwerk: true, uitleg: 'Het certificaat werd niet vertrouwd. Dat wijst op meelezende netwerkapparatuur.' };
  }
  return { soort: 'onbekend', eigenNetwerk: false, uitleg: `Onverwachte fout: ${err?.message ?? err}` };
}

export async function controleerDoel({ naam, url, herkenning }) {
  const stop = AbortSignal.timeout(TIJDSLIMIET_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', signal: stop, headers: KOPPEN });
    const duurMs = Date.now() - start;
    const romp = (await res.text()).slice(0, 200_000);
    const herkend = herkenning.test(romp);

    if (res.ok && herkend) return { naam, url, bereikbaar: true, status: res.status, duurMs };

    if (res.ok) {
      return {
        naam, url, bereikbaar: false, status: res.status, duurMs,
        soort: 'onverwacht', eigenNetwerk: true,
        uitleg: `Er kwam wel een antwoord (HTTP ${res.status}), maar niet van de site zelf. Dat wijst op een proxy, een firewall of een inlogscherm van een gastnetwerk.`,
      };
    }

    return {
      naam, url, bereikbaar: false, status: res.status, duurMs,
      soort: 'status', eigenNetwerk: res.status === 403 || res.status === 407,
      uitleg: `De site antwoordde met HTTP ${res.status}.${
        res.status === 403 || res.status === 407
          ? ' Een 403 of 407 op dit punt komt vrijwel altijd van een proxy of firewall onderweg.'
          : ''
      }`,
    };
  } catch (err) {
    return { naam, url, bereikbaar: false, duurMs: Date.now() - start, ...duidFout(err) };
  }
}

export async function controleerVerbinding() {
  const uitkomsten = await Promise.all(DOELEN.map(controleerDoel));
  const onbereikbaar = uitkomsten.filter((u) => !u.bereikbaar);
  return {
    uitkomsten,
    allesBereikbaar: onbereikbaar.length === 0,
    // Zijn ze allebei onbereikbaar op een manier die naar het eigen netwerk
    // wijst, dan ligt het vrijwel zeker niet aan TopzorgGroep.
    eigenNetwerk: onbereikbaar.length === uitkomsten.length && onbereikbaar.every((u) => u.eigenNetwerk),
  };
}

const isDirect = process.argv[1] && process.argv[1].endsWith('verbinding.mjs');
if (isDirect) {
  const { uitkomsten, allesBereikbaar, eigenNetwerk } = await controleerVerbinding();

  for (const u of uitkomsten) {
    if (u.bereikbaar) {
      process.stdout.write(`  ${u.naam}: bereikbaar (HTTP ${u.status}, ${u.duurMs} ms)\n`);
    } else {
      process.stdout.write(`  ${u.naam}: NIET bereikbaar. ${u.uitleg}\n`);
    }
  }

  if (allesBereikbaar) {
    process.stdout.write('\nDe verbinding is in orde. De scan kan starten.\n');
    process.exit(0);
  }

  if (eigenNetwerk) {
    process.stdout.write(
      '\nBeide sites zijn onbereikbaar vanaf dit netwerk. Dat wijst op de verbinding van deze\n' +
        'computer, niet op een storing bij TopzorgGroep. Controleer je internetverbinding, een VPN\n' +
        'of een bedrijfsproxy, en probeer het daarna opnieuw. Er is bewust geen scan gestart, want\n' +
        'die zou een rood rapport opleveren dat niets over de vestigingen zegt.\n\n' +
        'Weet je zeker dat je verbinding klopt en dat deze controle zich vergist, zet er dan\n' +
        'TOPZORG_SKIP_PREFLIGHT=1 voor. De scan draait dan alsnog.\n',
    );
    process.exit(3);
  }

  process.stdout.write(
    '\nEen van beide sites is niet bereikbaar terwijl de andere dat wel is. Dat kan een echte\n' +
      'storing zijn. De scan wordt niet automatisch gestart. Wil je toch doorgaan, draai dan\n' +
      'hetzelfde commando met TOPZORG_SKIP_PREFLIGHT=1 ervoor.\n',
  );
  process.exit(4);
}
