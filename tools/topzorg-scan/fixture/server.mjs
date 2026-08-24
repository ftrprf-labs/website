// Lokale nabootsing van de patiëntroute. Geen kopie van de echte site, wel
// dezelfde structuur: locatiepagina met cookiebanner, afspraakknop die een
// nieuw tabblad opent, en een portaalwizard met vier schermen en een agenda.
//
// Hiermee is de scanner te testen zonder de productiesite te belasten.

import { createServer } from 'node:http';

const HOOFD = `
  body { font-family: system-ui, sans-serif; margin: 0; color: #17242e; }
  header { background: #0d3b52; color: #fff; padding: 20px 32px; }
  main { max-width: 860px; margin: 0 auto; padding: 32px; }
  .knop { display: inline-block; background: #12809b; color: #fff; padding: 14px 22px;
          border-radius: 6px; text-decoration: none; border: 0; font-size: 16px; cursor: pointer; }
  .kaart { border: 1px solid #d5dee4; border-radius: 8px; padding: 16px; margin: 10px 0; cursor: pointer; }
  .kaart:hover { border-color: #12809b; }
  table.calendar { border-collapse: collapse; margin: 18px 0; }
  table.calendar th, table.calendar td { border: 1px solid #d5dee4; padding: 10px 14px; text-align: center; }
  .slot { background: #eaf6f9; border: 1px solid #12809b; border-radius: 4px; padding: 8px 12px;
          margin: 4px; cursor: pointer; font-size: 15px; }
  #cookie { position: fixed; inset: auto 0 0 0; background: #17242e; color: #fff; padding: 18px; }
  /* Twee consentlagen die elkaar afdekken, zoals op de echte site. */
  #laag-modaal { position: fixed; inset: 0; background: rgba(10,20,28,.55); z-index: 9000;
                 display: flex; align-items: center; justify-content: center; }
  #laag-modaal .venster { background: #fff; padding: 24px; border-radius: 8px; max-width: 420px; }
  #laag-banner { position: fixed; left: 16px; bottom: 16px; width: 280px; background: #fff;
                 border: 1px solid #d5dee4; border-radius: 8px; padding: 16px; z-index: 100; }
`;

function pagina(titel, inhoud, { cookiebanner = false } = {}) {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>${titel}</title><style>${HOOFD}</style></head>
<body>
<header><strong>TopzorgGroep</strong></header>
<main>${inhoud}</main>
${cookiebanner ? `<div id="cookie"><p>Wij gebruiken cookies.</p><button class="knop" onclick="document.getElementById('cookie').remove()">Alles accepteren</button></div>` : ''}
</body></html>`;
}

const LOCATIEPAGINA = pagina(
  'Revalidatie Amersfoort Databankweg',
  `
  <h1>Revalidatie Amersfoort Databankweg</h1>
  <p>Databankweg 2A, 3821 AL Amersfoort. Telefoon 088 567 0100.</p>
  <p>Bij deze vestiging behandelen wij chronische pijn, stressklachten en vermoeidheid.</p>
  <p><a class="knop" href="/mijnzorgtoegang/" target="_blank" rel="noopener">Online afspraak maken</a></p>
  <h2>Openingstijden</h2>
  <p>Maandag tot en met vrijdag van 08:30 tot 17:00.</p>
`,
  { cookiebanner: true },
);

const AANDACHTSGEBIED = pagina(
  'Mijn Zorgtoegang',
  `
  <h1>Mijn Zorgtoegang</h1>
  <h2>Waarvoor wilt u een afspraak maken?</h2>
  <a class="kaart" href="/mijnzorgtoegang/behandeling">Revalidatie</a>
  <a class="kaart" href="/mijnzorgtoegang/behandeling">Handtherapie</a>
  <a class="kaart" href="/mijnzorgtoegang/behandeling">Oedeemtherapie</a>
`,
);

const BEHANDELING = pagina(
  'Mijn Zorgtoegang',
  `
  <h1>Mijn Zorgtoegang</h1>
  <h2>Kies een behandeling</h2>
  <a class="kaart" href="/mijnzorgtoegang/verwijzing">Fysiotherapie intake</a>
  <a class="kaart" href="/mijnzorgtoegang/verwijzing">Vervolgconsult fysiotherapie</a>
`,
);

const VERWIJZING = pagina(
  'Mijn Zorgtoegang',
  `
  <h1>Mijn Zorgtoegang</h1>
  <h2>Heeft u een verwijzing?</h2>
  <a class="kaart" href="/mijnzorgtoegang/voorkeur">Ik heb een verwijzing</a>
  <a class="kaart" href="/mijnzorgtoegang/voorkeur">Geen verwijzing</a>
`,
);

const VOORKEUR = pagina(
  'Mijn Zorgtoegang',
  `
  <h1>Mijn Zorgtoegang</h1>
  <h2>Heeft u voorkeur voor een behandelaar?</h2>
  <a class="kaart" href="/mijnzorgtoegang/agenda">Geen voorkeur</a>
  <a class="kaart" href="/mijnzorgtoegang/agenda">Vrouwelijke behandelaar</a>
  <a class="kaart" href="/mijnzorgtoegang/agenda">Mannelijke behandelaar</a>
`,
);

function agendaPagina(metSloten) {
  const sloten = metSloten
    ? ['09:00', '09:30', '10:15', '11:00', '13:45', '14:30']
        .map((t) => `<button class="slot">${t}</button>`)
        .join('\n')
    : '<p>Er zijn op dit moment geen beschikbare tijden.</p>';

  return pagina(
    'Mijn Zorgtoegang',
    `
  <h1>Mijn Zorgtoegang</h1>
  <h2>Kies een datum en tijd</h2>
  <table class="calendar">
    <thead><tr><th>maandag</th><th>dinsdag</th><th>woensdag</th><th>donderdag</th><th>vrijdag</th></tr></thead>
    <tbody><tr><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td></tr></tbody>
  </table>
  <div>${sloten}</div>
  <form method="POST" action="/mijnzorgtoegang/afspraak/bevestigen">
    <button class="knop" type="submit">Afspraak bevestigen</button>
  </form>
`,
  );
}

// Nabootsing van de werkelijk aangetroffen situatie op de locatiepagina:
// twee consentlagen die elkaar afdekken, een menuknop en een tekstknop met
// exact dezelfde tekst, en een tussenpagina voordat het portaal in beeld komt.
const LOCATIEPAGINA_ECHT = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Revalidatie Amersfoort Databankweg</title><style>${HOOFD}</style></head>
<body>
<header>
  <strong>TopzorgGroep</strong>
  <nav>
    <a href="/vestigingen/">Locaties</a>
    <a class="knop" href="/contact/afspraak-maken/">Afspraak maken</a>
  </nav>
</header>
<main>
  <h1>Revalidatie Amersfoort Databankweg</h1>
  <p>Databankweg 2A, 3821 AL Amersfoort. Telefoon 088 567 0100.</p>
  <p>Wil je een afspraak maken? Bel 088 5670 100.</p>
  <p><a class="knop" href="/doodlopend/neem-contact-op/">Afspraak maken</a></p>
  <h2>Openingstijden</h2>
  <p>Maandag tot en met vrijdag van 08:30 tot 17:00.</p>
</main>

<div id="laag-banner">
  <p>TopzorgGroep hecht grote waarde aan het beschermen van jouw persoonsgegevens.</p>
  <button class="knop" onclick="document.getElementById('laag-banner').remove()">Ja, ik accepteer cookies</button>
  <button onclick="document.getElementById('laag-banner').remove()">Nee, liever niet</button>
</div>

<div id="laag-modaal">
  <div class="venster">
    <h2>Cookies</h2>
    <p>TopzorgGroep gebruikt cookies en vergelijkbare technieken.</p>
    <button onclick="document.getElementById('laag-modaal').remove()">Laat mij kiezen</button>
    <button class="knop" onclick="document.getElementById('laag-modaal').remove()">Ok&eacute;!</button>
  </div>
</div>
</body></html>`;

const AFSPRAAK_TUSSENPAGINA = pagina(
  'Maak een afspraak',
  `
  <h1>Maak een afspraak</h1>
  <p>Kies de vestiging waar je terecht wilt.</p>
  <a class="kaart" href="/mijnzorgtoegang/">Revalidatie Amersfoort Databankweg</a>
  <a class="kaart" href="/doodlopend/neem-contact-op/">Revalidatie Zeist</a>
  <a class="kaart" href="/doodlopend/neem-contact-op/">Revalidatie Utrecht</a>
`,
);

const DOODLOPEND = pagina(
  'Neem contact op',
  `
  <h1>Neem contact op</h1>
  <p>Bel ons op 088 567 0100 of stuur een bericht.</p>
`,
);

// Nabootsing van een vestiging zonder online route. Het menu bevat een item
// dat alle vestigingen opsomt, inclusief de gezochte naam. Dat is precies de
// val waar de scan eerder in liep: het menu-item matcht op de vestigingsnaam en
// leidt de route het overzicht in.
const LOCATIEPAGINA_ZONDER_ROUTE = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Revalidatie Amersfoort Databankweg</title><style>${HOOFD}</style></head>
<body>
<header>
  <strong>TopzorgGroep</strong>
  <nav>
    <ul><li>Locaties
      <ul>
        <li><a href="/vestigingen/">Revalidatie Amersfoort Databankweg</a></li>
        <li><a href="/vestigingen/">Revalidatie Zeist</a></li>
      </ul>
    </li></ul>
    <a class="knop" href="/contact/afspraak-maken/">Afspraak maken</a>
  </nav>
</header>
<main>
  <h1>Revalidatie Amersfoort Databankweg</h1>
  <p>Databankweg 2A, 3821 AL Amersfoort.</p>
  <p>Wil je een afspraak maken? Bel 088 5670 100.</p>
</main>
</body></html>`;

const AFSPRAAKPAGINA_ZONDER_ROUTE = pagina(
  'Maak een afspraak',
  `
  <h1>Direct een afspraak maken?</h1>
  <p>Liever dat wij contact met jou opnemen? Gebruik onderstaand formulier.</p>
  <p><a class="kaart" href="/doodlopend/neem-contact-op/">Neem contact op</a></p>
`,
);

const VESTIGINGENOVERZICHT = pagina(
  'Alle vestigingen',
  `
  <h1>Bekijk alle locaties</h1>
  <a class="kaart" href="/vestigingen/revalidatie-amersfoort-databankweg/">Revalidatie Amersfoort Databankweg</a>
  <a class="kaart" href="/doodlopend/neem-contact-op/">Revalidatie Zeist</a>
`,
);

export function startFixture({ port = 0, variant = 'groen' } = {}) {
  const gebeurtenissen = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    gebeurtenissen.push({ methode: req.method, pad: url.pathname });

    const stuur = (html, status = 200) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    };

    if (req.method === 'POST') {
      // Mag nooit gebeuren tijdens een scan.
      stuur(pagina('Bevestigd', '<h1>Afspraak vastgelegd</h1>'), 200);
      return;
    }

    switch (url.pathname) {
      case '/vestigingen/revalidatie-amersfoort-databankweg/':
        if (variant === 'rood-website') return stuur(pagina('Fout', '<h1>Pagina niet gevonden</h1>'), 404);
        if (variant === 'echt-achtig') return stuur(LOCATIEPAGINA_ECHT);
        if (variant === 'rood-geen-online-route') return stuur(LOCATIEPAGINA_ZONDER_ROUTE);
        if (variant === 'rood-knop') {
          return stuur(
            pagina('Revalidatie Amersfoort Databankweg', `
              <h1>Revalidatie Amersfoort Databankweg</h1>
              <p>Databankweg 2A, 3821 AL Amersfoort.</p>
              <p>Bel ons op 088 567 0100.</p>`),
          );
        }
        return stuur(LOCATIEPAGINA);
      case '/contact/afspraak-maken/':
        if (variant === 'rood-geen-online-route') return stuur(AFSPRAAKPAGINA_ZONDER_ROUTE);
        return stuur(AFSPRAAK_TUSSENPAGINA);
      case '/vestigingen/':
        return stuur(VESTIGINGENOVERZICHT);
      case '/doodlopend/neem-contact-op/':
        return stuur(DOODLOPEND);
      case '/mijnzorgtoegang/':
        return stuur(AANDACHTSGEBIED);
      case '/mijnzorgtoegang/behandeling':
        return stuur(BEHANDELING);
      case '/mijnzorgtoegang/verwijzing':
        return stuur(VERWIJZING);
      case '/mijnzorgtoegang/voorkeur':
        return stuur(VOORKEUR);
      case '/mijnzorgtoegang/agenda':
        return stuur(agendaPagina(variant !== 'oranje-geen-tijden'));
      default:
        return stuur(pagina('Fout', '<h1>Pagina niet gevonden</h1>'), 404);
    }
  });

  return new Promise((resolveP) => {
    server.listen(port, '127.0.0.1', () => {
      const adres = server.address();
      resolveP({
        server,
        poort: adres.port,
        basis: `http://127.0.0.1:${adres.port}`,
        gebeurtenissen,
        stop: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

const isDirect = process.argv[1] && process.argv[1].endsWith('server.mjs');
if (isDirect) {
  const variant = process.argv.find((a) => a.startsWith('--variant='))?.slice('--variant='.length) ?? 'groen';
  const { basis } = await startFixture({ port: 8787, variant });
  process.stdout.write(`Fixture draait op ${basis}/vestigingen/revalidatie-amersfoort-databankweg/ (variant ${variant})\n`);
}
