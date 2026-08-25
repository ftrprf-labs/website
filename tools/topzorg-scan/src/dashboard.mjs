#!/usr/bin/env node
// Bouwt het overzicht als een zelfstandig HTML bestand.
//
//   node src/dashboard.mjs <meting.json> [--out=<bestand>]
//
// Het bestand heeft geen externe afhankelijkheden, dus het werkt lokaal, als
// bijlage, en straks ook gehost. Kleuren komen uit de vaste statuspalet, en een
// status draagt altijd een pictogram en een woord, nooit alleen een kleur.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STATUS } from './beschikbaarheid.mjs';

const STATUS_VOLGORDE = [STATUS.GEEN_RUIMTE, STATUS.KRAP, STATUS.RUIMTE, STATUS.GEEN_ONLINE_ROUTE, STATUS.FOUT];

const STATUS_UITERLIJK = {
  [STATUS.GEEN_RUIMTE]: { woord: 'Geen ruimte', teken: '●', rol: 'critical' },
  [STATUS.KRAP]: { woord: 'Krap', teken: '◐', rol: 'warning' },
  [STATUS.RUIMTE]: { woord: 'Ruimte', teken: '○', rol: 'good' },
  [STATUS.GEEN_ONLINE_ROUTE]: { woord: 'Geen online route', teken: '■', rol: 'serious' },
  [STATUS.FOUT]: { woord: 'Meting mislukt', teken: '△', rol: 'serious' },
};

const esc = (waarde) =>
  String(waarde ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function nlDatum(iso) {
  if (!iso) return null;
  const [jaar, maand, dag] = iso.split('-');
  const maanden = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december',
  ];
  return `${Number(dag)} ${maanden[Number(maand) - 1]}`;
}

function wachttekst(locatie) {
  if (locatie.status === STATUS.GEEN_RUIMTE) return 'geen enkele';
  if (!locatie.eersteDatum) return 'onbekend';
  const dagen = locatie.wachtdagen;
  if (dagen === 0) return `vandaag, ${nlDatum(locatie.eersteDatum)}`;
  if (dagen === 1) return `morgen, ${nlDatum(locatie.eersteDatum)}`;
  return `over ${dagen} dagen, ${nlDatum(locatie.eersteDatum)}`;
}

// Verdeling per provincie, gesorteerd op hoeveel er mis is.
function perProvincie(locaties) {
  const kaart = new Map();
  for (const l of locaties) {
    const sleutel = l.provincie ?? 'Onbekend';
    const rij = kaart.get(sleutel) ?? { provincie: sleutel, totaal: 0, statussen: {} };
    rij.totaal += 1;
    rij.statussen[l.status] = (rij.statussen[l.status] ?? 0) + 1;
    kaart.set(sleutel, rij);
  }
  const rijen = [...kaart.values()];
  for (const rij of rijen) {
    rij.problemen = (rij.statussen[STATUS.GEEN_RUIMTE] ?? 0) + (rij.statussen[STATUS.KRAP] ?? 0);
    rij.aandeelProbleem = rij.totaal > 0 ? rij.problemen / rij.totaal : 0;
  }
  // Sorteren op het absolute aantal, want daar zit de hefboom. Een provincie
  // met een locatie die krap staat is minder urgent dan een provincie met
  // negentien.
  return rijen.sort((a, b) => b.problemen - a.problemen || b.aandeelProbleem - a.aandeelProbleem);
}

function statTegel(rol, aantal, woord, toelichting) {
  return `<div class="tegel" data-rol="${rol}">
    <div class="tegel-waarde">${aantal}</div>
    <div class="tegel-naam"><span class="stip" data-rol="${rol}" aria-hidden="true"></span>${esc(woord)}</div>
    <div class="tegel-toelichting">${esc(toelichting)}</div>
  </div>`;
}

// De hoofdstatussen staan altijd op de kaart, ook als ze nul zijn. Zo staan de
// cijfers op elke kaart op dezelfde plek en is een rij kaarten te scannen.
const KAART_STATUSSEN = [STATUS.GEEN_RUIMTE, STATUS.KRAP, STATUS.RUIMTE];

function provincieKaart(rij) {
  const delen = STATUS_VOLGORDE.filter((s) => rij.statussen[s] > 0)
    .map((s) => {
      const aantal = rij.statussen[s];
      const breedte = ((aantal / rij.totaal) * 100).toFixed(2);
      const uiterlijk = STATUS_UITERLIJK[s];
      return `<span class="segment" data-rol="${uiterlijk.rol}" style="width:${breedte}%" title="${esc(uiterlijk.woord)}: ${aantal} van ${rij.totaal}"></span>`;
    })
    .join('');

  const extra = [STATUS.GEEN_ONLINE_ROUTE, STATUS.FOUT]
    .filter((s) => rij.statussen[s] > 0)
    .map((s) => {
      const u = STATUS_UITERLIJK[s];
      return `<div class="pkc-regel" data-rol="${u.rol}">
        <span class="stip" data-rol="${u.rol}" aria-hidden="true"></span>
        <span class="pkc-getal getal">${rij.statussen[s]}</span>
        <span class="pkc-woord">${esc(u.woord)}</span>
      </div>`;
    })
    .join('');

  const regels = KAART_STATUSSEN.map((s) => {
    const u = STATUS_UITERLIJK[s];
    const aantal = rij.statussen[s] ?? 0;
    return `<div class="pkc-regel${aantal === 0 ? ' leeg' : ''}" data-rol="${u.rol}">
      <span class="stip" data-rol="${u.rol}" aria-hidden="true"></span>
      <span class="pkc-getal getal">${aantal}</span>
      <span class="pkc-woord">${esc(u.woord)}</span>
    </div>`;
  }).join('');

  return `<article class="pkaart">
    <header class="pkc-kop">
      <h3>${esc(rij.provincie)}</h3>
      <span class="pkc-totaal">${rij.totaal} ${rij.totaal === 1 ? 'locatie' : 'locaties'}</span>
    </header>
    <span class="balk" role="img" aria-label="Verdeling in ${esc(rij.provincie)}">${delen}</span>
    <div class="pkc-cijfers">${regels}${extra}</div>
  </article>`;
}

function locatieRij(l) {
  const uiterlijk = STATUS_UITERLIJK[l.status] ?? STATUS_UITERLIJK[STATUS.FOUT];
  return `<tr data-rol="${uiterlijk.rol}" data-provincie="${esc(l.provincie ?? 'Onbekend')}" data-status="${esc(l.status)}"
      data-zoek="${esc(`${l.naam} ${l.plaats ?? ''} ${l.provincie ?? ''}`.toLowerCase())}">
    <td>
      <span class="status" data-rol="${uiterlijk.rol}">
        <span class="teken" aria-hidden="true">${uiterlijk.teken}</span>${esc(uiterlijk.woord)}
      </span>
    </td>
    <td class="naam">${esc(l.naam)}<span class="straat">${esc(l.straat ?? '')}</span></td>
    <td>${esc(l.plaats ?? '')}</td>
    <td>${esc(l.provincie ?? 'onbekend')}</td>
    <td class="getal">${l.tijdenVandaag ?? 0}</td>
    <td class="getal">${l.totaalTijden ?? 0}</td>
    <td>${esc(wachttekst(l))}</td>
  </tr>`;
}

// artefact=true levert alleen de inhoud, zonder doctype en body, voor een
// gepubliceerde pagina die zelf een omhulsel toevoegt. Zo blijft er een
// generator bestaan in plaats van twee kopieen die uit elkaar gaan lopen.
export function bouwDashboard(dataset, { artefact = false } = {}) {
  const locaties = [...(dataset.locaties ?? [])].sort((a, b) => {
    const rang = STATUS_VOLGORDE.indexOf(a.status) - STATUS_VOLGORDE.indexOf(b.status);
    if (rang !== 0) return rang;
    const wachtA = a.wachtdagen ?? 999;
    const wachtB = b.wachtdagen ?? 999;
    if (wachtA !== wachtB) return wachtB - wachtA;
    return (a.naam ?? '').localeCompare(b.naam ?? '');
  });

  const s = dataset.samenvatting ?? {};
  const m = dataset.meting ?? {};
  const provincies = [...new Set(locaties.map((l) => l.provincie ?? 'Onbekend'))].sort();
  const gemeten = new Date(m.tijdstip ?? Date.now());
  const tijdstip = gemeten.toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Amsterdam' });

  // De horizon staat per locatie in de meting. Meestal is die overal gelijk, en
  // dan kan hij in de uitleg genoemd worden.
  const horizons = [...new Set(locaties.map((l) => l.horizon).filter(Boolean))];
  const horizonZin = horizons.length === 1 ? `, nu tot en met ${nlDatum(horizons[0])}` : '';

  const tegels = [
    statTegel('critical', s.perStatus?.[STATUS.GEEN_RUIMTE] ?? 0, 'Geen ruimte', 'Geen enkele vrije tijd online'),
    statTegel('warning', s.perStatus?.[STATUS.KRAP] ?? 0, 'Krap', 'Lange wachttijd of weinig vrije tijden'),
    statTegel('good', s.perStatus?.[STATUS.RUIMTE] ?? 0, 'Ruimte', 'Snel terecht, genoeg vrije tijden'),
    statTegel('serious', (s.perStatus?.[STATUS.FOUT] ?? 0) + (s.perStatus?.[STATUS.GEEN_ONLINE_ROUTE] ?? 0), 'Aandacht', 'Meting mislukt of geen online route'),
  ].join('\n');

  const volledig = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Online beschikbaarheid TopzorgGroep</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
  :root {
    color-scheme: light;
    --accent: #2a78d6;
    --plane: #f9f9f7;
    --surface: #fcfcfb;
    --ink: #0b0b0b;
    --ink-2: #52514e;
    --ink-muted: #898781;
    --lijn: #e1e0d9;
    --rand: #c3c2b7;
    --good: #0ca30c;
    --warning: #fab219;
    --serious: #ec835a;
    --critical: #d03b3b;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --accent: #3987e5;
      --plane: #0d0d0d;
      --surface: #1a1a19;
      --ink: #ffffff;
      --ink-2: #c3c2b7;
      --ink-muted: #898781;
      --lijn: #2c2c2a;
      --rand: #383835;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --accent: #3987e5;
    --plane: #0d0d0d;
    --surface: #1a1a19;
    --ink: #ffffff;
    --ink-2: #c3c2b7;
    --ink-muted: #898781;
    --lijn: #2c2c2a;
    --rand: #383835;
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--plane);
    color: var(--ink);
    font: 15px/1.55 "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .cijfer, .getal, .tegel-waarde {
    font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
    font-variant-numeric: tabular-nums;
  }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
  .blad { max-width: 1180px; margin: 0 auto; padding: 32px 20px 72px; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .onderkop { color: var(--ink-2); margin: 0 0 28px; }
  .onderkop strong { color: var(--ink); font-weight: 600; }

  h2 { font-size: 17px; margin: 36px 0 12px; }
  .uitleg { color: var(--ink-2); margin: 0 0 14px; max-width: 62ch; }

  [data-rol="good"] { --rol: var(--good); }
  [data-rol="warning"] { --rol: var(--warning); }
  [data-rol="serious"] { --rol: var(--serious); }
  [data-rol="critical"] { --rol: var(--critical); }

  .kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .tegel {
    background: var(--surface);
    border: 1px solid var(--lijn);
    border-radius: 10px;
    padding: 16px 18px;
  }
  .tegel-waarde { font-size: 40px; line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; }
  .tegel-naam { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-weight: 600; }
  .tegel-toelichting { color: var(--ink-muted); font-size: 13px; margin-top: 2px; }
  .stip { width: 10px; height: 10px; border-radius: 50%; background: var(--rol); flex: none; }

  table { width: 100%; border-collapse: collapse; background: var(--surface); }
  .tabelhoes { overflow-x: auto; border: 1px solid var(--lijn); border-radius: 10px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--lijn); vertical-align: top; }
  thead th {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--ink-muted); font-weight: 500;
  }
  tbody tr:last-child td, tbody tr:last-child th { border-bottom: 0; }
  .getal { text-align: right; font-variant-numeric: tabular-nums; }
  .naam { font-weight: 600; }
  td:nth-child(3), td:nth-child(4) { white-space: nowrap; }
  .straat { display: block; font-weight: 400; color: var(--ink-muted); font-size: 13px; }

  tbody tr td:first-child { border-left: 3px solid var(--rol, transparent); }
  .status { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-weight: 600; }
  .status .teken { color: var(--rol); font-size: 13px; }

  .balk { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: var(--lijn); }
  .segment { background: var(--rol); }
  .segment + .segment { box-shadow: -2px 0 0 var(--surface); }

  .provinciekaarten {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
    gap: 12px;
  }
  .pkaart {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--surface);
    border: 1px solid var(--lijn);
    border-radius: 10px;
    padding: 15px 16px 16px;
  }
  .pkc-kop { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .pkc-kop h3 { margin: 0; font-size: 15px; font-weight: 600; }
  .pkc-totaal { color: var(--ink-muted); font-size: 12px; white-space: nowrap; }
  .pkc-cijfers { display: flex; flex-direction: column; gap: 5px; }
  .pkc-regel { display: grid; grid-template-columns: 10px 2.4em 1fr; align-items: center; gap: 8px; }
  .pkc-getal { font-size: 19px; font-weight: 600; text-align: right; line-height: 1.2; }
  .pkc-woord { color: var(--ink-2); font-size: 13px; }
  .pkc-regel.leeg .pkc-getal, .pkc-regel.leeg .pkc-woord { color: var(--ink-muted); font-weight: 500; }
  .pkc-regel.leeg .stip { background: var(--lijn); }

  .legenda { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0 0; color: var(--ink-2); font-size: 13px; }
  .legenda span.stip { width: 9px; height: 9px; }
  .legenda-item { display: inline-flex; align-items: center; gap: 7px; }

  .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: end; margin: 0 0 14px; }
  .filters label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--ink-muted); }
  .filters select, .filters input {
    font: inherit; padding: 7px 9px; border: 1px solid var(--rand); border-radius: 7px;
    background: var(--surface); color: var(--ink); min-width: 170px;
  }
  .telling { color: var(--ink-muted); font-size: 13px; margin: 10px 0 0; }
  footer { color: var(--ink-muted); font-size: 13px; margin-top: 40px; border-top: 1px solid var(--lijn); padding-top: 16px; }
</style>
</head>
<body>
<div class="blad">

  <h1>Online beschikbaarheid TopzorgGroep</h1>
  <p class="onderkop">
    Behandeling: <strong>${esc(m.behandeling?.label ?? 'onbekend')}</strong>, zonder verwijzing.
    Gemeten op ${esc(tijdstip)}. ${s.totaal ?? 0} locaties bieden deze behandeling online aan.
  </p>

  <div class="kpi">
${tegels}
  </div>

  <h2>Per provincie</h2>
  <p class="uitleg">
    Dezelfde telling, uitgesplitst naar provincie en gesorteerd op het aantal locaties waar iets aan
    de hand is. Beweeg over een balk voor de aantallen.
  </p>
  <div class="provinciekaarten">
${perProvincie(locaties).map(provincieKaart).join('\n')}
  </div>

  <h2>Alle locaties</h2>
  <p class="uitleg">
    Gesorteerd op urgentie. Bovenaan staan de locaties waar online niets te plannen is, daarna de
    krappe. De aantallen zijn de vrije tijden die een patiënt op dit moment online kan kiezen: die van
    vandaag, en het totaal vanaf vandaag tot het einde van de periode die het portaal openstelt${horizonZin}.
    Voor elke locatie over dezelfde periode geteld.
  </p>

  <div class="filters">
    <label>Provincie
      <select id="filter-provincie">
        <option value="">alle provincies</option>
        ${provincies.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('\n        ')}
      </select>
    </label>
    <label>Status
      <select id="filter-status">
        <option value="">alle statussen</option>
        ${STATUS_VOLGORDE.map((st) => `<option value="${esc(st)}">${esc(STATUS_UITERLIJK[st].woord)}</option>`).join('\n        ')}
      </select>
    </label>
    <label>Zoeken
      <input id="filter-zoek" type="search" placeholder="locatie of plaats" autocomplete="off">
    </label>
  </div>

  <div class="tabelhoes">
    <table id="locatietabel">
      <thead>
        <tr>
          <th scope="col">Status</th>
          <th scope="col">Locatie</th>
          <th scope="col">Plaats</th>
          <th scope="col">Provincie</th>
          <th scope="col" class="getal">Vrije tijden vandaag</th>
          <th scope="col" class="getal">Vrije tijden totaal</th>
          <th scope="col">Eerstvolgende mogelijkheid</th>
        </tr>
      </thead>
      <tbody>
${locaties.map(locatieRij).join('\n')}
      </tbody>
    </table>
  </div>
  <p class="telling" id="telling"></p>

  <footer>
    Meting via de publieke afsprakenroute van Mijn Zorgtoegang. Alleen lezende verzoeken, geen
    afspraken gemaakt en geen persoonsgegevens gebruikt. Een status zegt iets over wat een patiënt op
    dit moment online kan plannen, en niet over de volledige agenda van een praktijk.
  </footer>
</div>

<script>
  const rijen = Array.from(document.querySelectorAll('#locatietabel tbody tr'));
  const provincie = document.getElementById('filter-provincie');
  const status = document.getElementById('filter-status');
  const zoek = document.getElementById('filter-zoek');
  const telling = document.getElementById('telling');

  function pasToe() {
    const p = provincie.value;
    const s = status.value;
    const z = zoek.value.trim().toLowerCase();
    let zichtbaar = 0;
    for (const rij of rijen) {
      const past =
        (!p || rij.dataset.provincie === p) &&
        (!s || rij.dataset.status === s) &&
        (!z || rij.dataset.zoek.includes(z));
      rij.hidden = !past;
      if (past) zichtbaar += 1;
    }
    telling.textContent = zichtbaar + ' van ' + rijen.length + ' locaties zichtbaar.';
  }

  for (const veld of [provincie, status, zoek]) veld.addEventListener('input', pasToe);
  pasToe();
</script>
</body>
</html>
`;

  if (!artefact) return volledig;

  // Een gepubliceerde pagina krijgt haar eigen omhulsel, dus lever alleen de
  // titel, de stijlen en de inhoud.
  const kop = volledig.slice(volledig.indexOf('<title>'), volledig.indexOf('</head>'));
  const romp = volledig.slice(volledig.indexOf('<body>') + '<body>'.length, volledig.lastIndexOf('</body>'));
  return `${kop.trim()}\n${romp.trim()}\n`;
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const argumenten = process.argv.slice(2);
  const bron = argumenten.find((a) => !a.startsWith('--'));
  const uitArg = argumenten.find((a) => a.startsWith('--out='));
  const artefact = argumenten.includes('--artefact');
  if (!bron) {
    process.stderr.write('Geef het pad naar meting.json mee.\n');
    process.exit(2);
  }
  const doel = uitArg ? uitArg.slice('--out='.length) : bron.replace(/meting\.json$/, 'dashboard.html');
  const dataset = JSON.parse(readFileSync(bron, 'utf8'));
  writeFileSync(doel, bouwDashboard(dataset, { artefact }), 'utf8');
  process.stdout.write(`Dashboard geschreven naar ${doel}\n`);
}
