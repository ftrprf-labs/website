// Routes van het beschikbaarheidsoverzicht.
//
//   GET  /topzorg              het overzicht, of het inlogscherm
//   POST /topzorg/login        wachtwoord controleren
//   POST /topzorg/logout       uitloggen
//   GET  /topzorg/meting.json  de meting als data
//   GET  /topzorg/status.json  draait de planner, en wanneer was de laatste meting
//   GET  /topzorg/push         de wekelijkse mail aan marketing, zoals hij eruit zou gaan
//   POST /topzorg/push/verstuur  die mail nu versturen, met de hand
//
// Alles lezend. Het overzicht bevat geen persoonsgegevens.

import { bouwDashboard } from '../../tools/topzorg-scan/src/dashboard.mjs';
import { plannerStatus } from './planner.mjs';
import { pushStatus, stelPushSamen, verstuurPush } from './push.mjs';
import { beschikbareDatums, laatsteMeting, metingVan } from './opslag.mjs';
import { controleerWachtwoord, heeftToegang, wachtwoordVereist, wisCookie, zetCookie } from './toegang.mjs';

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

function html(res, status, inhoud) {
  res.writeHead(status, HEADERS);
  res.end(inhoud);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function leesBody(req, maxBytes = 8192) {
  return new Promise((resolveBody) => {
    let ruw = '';
    req.on('data', (stuk) => {
      ruw += stuk;
      if (ruw.length > maxBytes) req.destroy();
    });
    req.on('end', () => resolveBody(ruw));
    req.on('error', () => resolveBody(''));
  });
}

function inlogPagina({ foutmelding = '' } = {}) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Online beschikbaarheid TopzorgGroep</title>
<style>
  :root { color-scheme: light; --plane:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
          --lijn:#e1e0d9; --rand:#c3c2b7; --accent:#2a78d6; --critical:#d03b3b; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { color-scheme: dark; --plane:#0d0d0d; --surface:#1a1a19;
      --ink:#fff; --ink-2:#c3c2b7; --lijn:#2c2c2a; --rand:#383835; --accent:#3987e5; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--plane);
         color:var(--ink); font:15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; padding:24px; }
  form { background:var(--surface); border:1px solid var(--lijn); border-radius:12px;
         padding:28px; width:min(380px, 100%); display:flex; flex-direction:column; gap:14px; }
  h1 { font-size:19px; margin:0; }
  p { margin:0; color:var(--ink-2); }
  label { display:flex; flex-direction:column; gap:6px; font-size:13px; color:var(--ink-2); }
  input { font:inherit; padding:10px; border:1px solid var(--rand); border-radius:8px;
          background:var(--plane); color:var(--ink); }
  button { font:inherit; font-weight:600; padding:10px; border:0; border-radius:8px;
           background:var(--accent); color:#fff; cursor:pointer; }
  button:hover { filter:brightness(1.06); }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
  .fout { color:var(--critical); font-size:13px; }
</style>
</head>
<body>
  <form method="POST" action="/topzorg/login">
    <h1>Online beschikbaarheid TopzorgGroep</h1>
    <p>Vul het wachtwoord in dat je van je collega hebt gekregen.</p>
    ${foutmelding ? `<p class="fout">${foutmelding}</p>` : ''}
    <label>Wachtwoord
      <input type="password" name="wachtwoord" autocomplete="current-password" autofocus required>
    </label>
    <button type="submit">Bekijk het overzicht</button>
  </form>
</body>
</html>`;
}

function nogGeenMeting() {
  const status = plannerStatus();
  return `<!doctype html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Online beschikbaarheid TopzorgGroep</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f9f9f7; color:#0b0b0b;
         font:15px/1.6 system-ui, sans-serif; padding:24px; text-align:center; }
  @media (prefers-color-scheme: dark) { body { background:#0d0d0d; color:#fff; } }
  div { max-width:44ch; }
  h1 { font-size:19px; }
</style>
</head>
<body><div>
  <h1>Nog geen meting beschikbaar</h1>
  <p>De eerste meting van vandaag draait om ${String(status.meetuur).padStart(2, '0')}:00.
  Zodra die klaar is, staat het overzicht hier.</p>
  <p>${status.bezig ? 'Er loopt nu een meting.' : 'Er loopt op dit moment geen meting.'}</p>
</div></body>
</html>`;
}

const DAGEN = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

function escHtml(waarde) {
  return String(waarde ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pushPagina({ melding = '' } = {}) {
  const st = pushStatus();
  const mail = stelPushSamen();

  const blokkades = [];
  if (!st.actief) blokkades.push('De automatische verzending staat uit. Zet TOPZORG_PUSH_ACTIEF op 1.');
  if (st.aantalOntvangers === 0) blokkades.push('Er zijn geen ontvangers ingesteld. Vul TOPZORG_PUSH_ONTVANGERS.');
  if (!st.mailWerkt) blokkades.push('Er is geen werkende mailkoppeling. Stel MAIL_TRANSPORT, MAIL_API_KEY en MAIL_FROM in.');
  if (!mail) blokkades.push('Er is nog geen meting om over te berichten.');

  const kanVersturen = st.aantalOntvangers > 0 && st.mailWerkt && Boolean(mail);

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wekelijkse mail aan marketing</title>
<style>
  :root { color-scheme: light; --plane:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
          --ink-muted:#898781; --lijn:#e1e0d9; --rand:#c3c2b7; --accent:#2a78d6; --warning:#fab219; --good:#0ca30c; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { color-scheme: dark; --plane:#0d0d0d; --surface:#1a1a19;
      --ink:#fff; --ink-2:#c3c2b7; --lijn:#2c2c2a; --rand:#383835; --accent:#3987e5; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--plane); color:var(--ink);
         font:15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .blad { max-width: 820px; margin: 0 auto; padding: 32px 20px 72px; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:16px; margin:30px 0 10px; }
  p { color:var(--ink-2); max-width:62ch; }
  a { color:var(--accent); }
  .kaart { background:var(--surface); border:1px solid var(--lijn); border-radius:10px; padding:16px 18px; margin:14px 0; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:6px 18px; margin:0; }
  dt { color:var(--ink-muted); font-size:13px; }
  dd { margin:0; }
  pre { background:var(--surface); border:1px solid var(--lijn); border-radius:10px; padding:16px 18px;
        white-space:pre-wrap; word-wrap:break-word; font:13px/1.6 ui-monospace, Menlo, monospace; }
  ul { color:var(--ink-2); }
  button { font:inherit; font-weight:600; padding:10px 16px; border:0; border-radius:8px;
           background:var(--accent); color:#fff; cursor:pointer; }
  button[disabled] { background:var(--rand); cursor:not-allowed; }
  .melding { border-left:3px solid var(--good); padding-left:12px; }
  .waarschuwing { border-left:3px solid var(--warning); padding-left:12px; }
  :focus-visible { outline:2px solid var(--accent); outline-offset:2px; }
</style>
</head>
<body>
<div class="blad">
  <h1>Wekelijkse mail aan marketing</h1>
  <p>
    Locaties met veel online ruimte in de komende week, zodat daar extra op ingezet kan worden.
    Hieronder staat het bericht precies zoals het verstuurd wordt.
  </p>

  ${melding ? `<p class="melding">${escHtml(melding)}</p>` : ''}

  <div class="kaart">
    <dl>
      <dt>Automatisch</dt>
      <dd>${st.actief ? `elke ${escHtml(DAGEN[st.dag] ?? `dag ${st.dag}`)} vanaf ${String(st.uur).padStart(2, '0')}:00` : 'staat uit'}</dd>
      <dt>Ontvangers</dt>
      <dd>${st.aantalOntvangers === 0 ? 'nog niet ingesteld' : escHtml(st.ontvangers.join(', '))}</dd>
      <dt>Mailkoppeling</dt>
      <dd>${st.mailWerkt ? 'werkt' : 'niet ingesteld'}</dd>
      <dt>Grens</dt>
      <dd>minstens ${st.drempels.minTijdenKomendeWeek} vrije tijden en binnen ${st.drempels.maxWachtdagen} dagen terecht</dd>
      <dt>Laatst verstuurd</dt>
      <dd>${st.alVerstuurdOp ? escHtml(st.alVerstuurdOp) : 'nog nooit'}</dd>
    </dl>
  </div>

  ${
    blokkades.length
      ? `<div class="kaart waarschuwing"><strong>Er gaat nu niets uit.</strong><ul>${blokkades
          .map((b) => `<li>${escHtml(b)}</li>`)
          .join('')}</ul></div>`
      : ''
  }

  <h2>Het bericht</h2>
  ${
    mail
      ? `<p><strong>Onderwerp:</strong> ${escHtml(mail.onderwerp)}</p>
  <pre>${escHtml(mail.tekst)}</pre>
  <form method="POST" action="/topzorg/push/verstuur">
    <button type="submit"${kanVersturen ? '' : ' disabled'}>Verstuur dit bericht nu</button>
  </form>`
      : '<p>Zodra er een meting is, staat het bericht hier.</p>'
  }

  <p style="margin-top:28px"><a href="/topzorg">Terug naar het overzicht</a></p>
</div>
</body>
</html>`;
}

// Retourneert true wanneer het verzoek is afgehandeld.
export async function handleTopzorg(req, res, pathname) {
  if (pathname !== '/topzorg' && !pathname.startsWith('/topzorg/')) return false;
  const methode = req.method;

  if (pathname === '/topzorg/login' && methode === 'POST') {
    const body = await leesBody(req);
    const ingevoerd = new URLSearchParams(body).get('wachtwoord');
    if (controleerWachtwoord(ingevoerd)) {
      zetCookie(res);
      res.writeHead(303, { Location: '/topzorg' });
      return res.end(), true;
    }
    html(res, 401, inlogPagina({ foutmelding: 'Dat wachtwoord klopt niet. Probeer het opnieuw.' }));
    return true;
  }

  if (pathname === '/topzorg/logout' && methode === 'POST') {
    wisCookie(res);
    res.writeHead(303, { Location: '/topzorg' });
    return res.end(), true;
  }

  if (!heeftToegang(req)) {
    if (!wachtwoordVereist()) {
      html(res, 503, inlogPagina({ foutmelding: 'Er is nog geen wachtwoord ingesteld voor dit overzicht.' }));
      return true;
    }
    if (pathname.endsWith('.json')) {
      json(res, 401, { fout: 'Geen toegang' });
      return true;
    }
    html(res, 401, inlogPagina());
    return true;
  }

  if (pathname === '/topzorg/push' && methode === 'GET') {
    html(res, 200, pushPagina());
    return true;
  }

  if (pathname === '/topzorg/push/verstuur' && methode === 'POST') {
    const uitkomst = await verstuurPush({ reden: 'met de hand vanuit het overzicht' });
    const melding = uitkomst.verstuurd
      ? `Verstuurd aan ${uitkomst.bezorgd} van de ${uitkomst.bezorgd + uitkomst.mislukt} ontvangers.`
      : `Er is niets verstuurd. ${uitkomst.reden ?? ''}`.trim();
    html(res, 200, pushPagina({ melding }));
    return true;
  }

  if (pathname === '/topzorg/push.json' && methode === 'GET') {
    const mail = stelPushSamen();
    json(res, 200, { ...pushStatus(), mail: mail ? { onderwerp: mail.onderwerp, aantal: mail.aantal } : null });
    return true;
  }

  if (pathname === '/topzorg/status.json' && methode === 'GET') {
    json(res, 200, { ...plannerStatus(), datums: beschikbareDatums().slice(0, 30) });
    return true;
  }

  if (pathname === '/topzorg/meting.json' && methode === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const datum = url.searchParams.get('datum');
    const dataset = datum ? metingVan(datum) : laatsteMeting();
    if (!dataset) {
      json(res, 404, { fout: 'Geen meting gevonden' });
      return true;
    }
    json(res, 200, dataset);
    return true;
  }

  if ((pathname === '/topzorg' || pathname === '/topzorg/') && methode === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const datum = url.searchParams.get('datum');
    const dataset = datum ? metingVan(datum) : laatsteMeting();
    if (!dataset) {
      html(res, 200, nogGeenMeting());
      return true;
    }
    html(res, 200, bouwDashboard(dataset, { pushLink: true }));
    return true;
  }

  json(res, 404, { fout: 'Onbekende route' });
  return true;
}
