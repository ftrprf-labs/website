// Bouwt de pre-deploy review: docs/studies/signature-predeploy.html.
// Alles hierin komt uit de werkelijke integratie, niet uit de designstudy.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { wrapEmail, renderSignatureText, signatureConfig } from '../../../server/comm/signature.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const proofs = resolve(here, '../proofs');
const meta = JSON.parse(readFileSync(resolve(proofs, 'proofs.json'), 'utf8'));

const MIMES = { '.gif': 'image/gif', '.png': 'image/png' };
const asData = (p) => `data:${MIMES[p.slice(p.lastIndexOf('.'))]};base64,${readFileSync(p).toString('base64')}`;
const shot = (id) => asData(resolve(proofs, `${id}.png`));

// De echte uitvoer van wrapEmail(). Voor deze offline pagina worden alleen de
// asset-URLs vervangen door data-URIs; er wordt niets aan de markup veranderd.
const PROD_BASE = 'https://ftrlabs-testerbeheer.onrender.com';
const mail = wrapEmail({ bodyText: 'Hoi Kim,\n\nDank je voor je bericht. Ik heb het bekeken en kom er morgen op terug.\n\nHartelijke groet,', fromAddress: 'hello@maculis.nl' });
const brand = resolve(here, '../../../public/brand');
const inlined = mail.html.replace(/https?:\/\/[^"']*\/brand\/([a-z0-9.-]+)/g, (_, f) => asData(resolve(brand, f)));
const productionHtml = mail.html.replace(/https?:\/\/[^"'/]+\/brand\//g, `${PROD_BASE}/brand/`);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const emailDoc = (bg) => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}body{background:${bg};padding:22px}</style></head><body>${inlined}</body></html>`;

const kB = (f) => (statSync(resolve(brand, f)).size / 1024).toFixed(1).replace('.', ',');
const ASSETS = ['maculis-seal-perceive-v1.gif', 'maculis-seal-rest-v1.png', 'maculis-wordmark-v1.png',
  'maculis-spark-v1.png', 'maculis-icon-mail-v1.png', 'maculis-icon-globe-v1.png', 'maculis-icon-pin-v1.png'];

const git = (c) => { try { return execSync(c, { cwd: resolve(here, '../../..') }).toString().trim(); } catch { return ''; } };
const HEAD = git('git rev-parse --short HEAD');

const MATRIX = [
  ['Apple Mail, macOS 14 en later', 'GIF speelt een keer', 'PNG via prefers-reduced-motion', 'eigen kleuren blijven staan', 'getest in WebKit-equivalent'],
  ['Mail op iOS en iPadOS', 'GIF speelt een keer', 'PNG via prefers-reduced-motion', 'eigen kleuren blijven staan', 'proef 05 en 06'],
  ['Gmail webmail', 'GIF speelt een keer', 'geen route, GIF speelt', 'donkere grond blijft donker', 'proef 01 t/m 04'],
  ['Gmail app, iOS en Android', 'GIF speelt een keer', 'geen route, GIF speelt', 'donkere grond blijft donker', 'proef 05'],
  ['Outlook klassiek voor Windows', 'frame 1, dus het rustframe', 'niet nodig', 'geen eigen donkere modus', 'proef 10, pixelgelijk aan proef 01'],
  ['Nieuw Outlook en Outlook.com', 'GIF speelt een keer', 'geen betrouwbare route', 'data-ogsc zet onze kleuren terug', 'proef 11 toont de randsituatie'],
  ['Outlook voor macOS', 'GIF speelt een keer', 'gedeeltelijk', 'kan inverteren', 'proef 11'],
  ['Outlook op iOS en Android', 'GIF speelt een keer', 'geen route', 'kan inverteren', 'proef 05 en 11'],
  ['Yahoo, Proton, Thunderbird', 'GIF speelt een keer', 'Thunderbird volgt de PNG-route', 'inverteren niet', 'proef 01 en 06'],
  ['Beelden geblokkeerd of onbereikbaar', 'niets, en dat mag', 'niet van toepassing', 'niet van toepassing', 'proef 07 en 08'],
  ['Platte tekst', 'niet van toepassing', 'niet van toepassing', 'niet van toepassing', 'tekstblok hieronder']
];

const DEVIATIONS = [
  ['Rol en plaats ontbreken', 'De referentie toont "Founder &amp; Steward" en "Voorburg, Nederland".',
   'Die horen bij de ontwerpinhoud, niet bij de huidige afzender. Contactgegevens worden nooit verzonnen (§3), dus beide regels renderen alleen als <span class="mono">SIGNATURE_ROLE</span> en <span class="mono">SIGNATURE_LOCATION</span> gezet zijn. Daardoor is het blok 562 px breed in plaats van 613.', 'bewust'],
  ['Georgia in plaats van Newsreader', 'Naam, payoff en de regel in wording renderen in Georgia of Times.',
   'Goedgekeurd compromis 1. Het woordmerk blijft als beeld in Newsreader.', 'goedgekeurd'],
  ['Geforceerde donkere modus', 'Zonder onze stijlregels wordt het tekstpaneel licht en blijft het zegel donker.',
   'Goedgekeurd compromis 2. Zichtbaar in proef 11.', 'goedgekeurd'],
  ['Statische PNG opnieuw gegenereerd', 'De PNG kwam uit de bronrender, de GIF uit het gekwantiseerde palet.',
   'Daardoor verschilden beide beelden met maximaal 11 van 255. De PNG is nu exact frame 1 van de GIF, en dus pixelgelijk. Het beeld verandert niet, de regel eerste = laatste = fallback klopt nu letterlijk. Bijkomend: de PNG werd kleiner, van 20,2 naar 11,7 kB.', 'gecorrigeerd'],
  ['Tekstkleur van het bericht in donkere modus', 'De body die wrapEmail opbouwt uit platte tekst zet <span class="mono">color:#2b2b2b</span>.',
   'Op een donkere leesomgeving kan dat donker op donker worden. Dit is bestaand gedrag van vóór deze wijziging en het zit in het bericht, niet in de handtekening, dus het is hier bewust niet aangeraakt. Zichtbaar in de donkere proef hierboven. Voorstel voor een aparte ronde.', 'observatie'],
  ['Beeldtypen ontbraken in de server', 'PNG en GIF stonden niet in de MIME-tabel en werden als octet-stream geserveerd.',
   'Beeldproxy\'s van Gmail en Outlook weigeren dat. Toegevoegd, plus een echte 404 voor ontbrekende assets in plaats van de SPA-pagina met status 200.', 'gecorrigeerd']
];

const CHANGED = [
  ['server/comm/signature.mjs', 'presentatie herschreven, contracten ongewijzigd', 'wrapEmail, stripForContext, SIG_MARKER, SIG_TEXT_DELIM en de exports zijn identiek gebleven'],
  ['server/config.mjs', 'drie optionele velden', 'SIGNATURE_ROLE, SIGNATURE_LOCATION en SIGNATURE_WORDING, alle drie leeg of uit-schakelbaar'],
  ['server/index.mjs', 'MIME voor beelden, 404 voor ontbrekende assets, waarschuwing bij een niet-publieke assetbasis', 'nodig om de asset-URLs in echte e-mail bereikbaar te maken'],
  ['tests/comm-signature.test.mjs', '19 tests, was 8', 'contracten plus nieuwe toetsen op fallback, tracking, fonts, HiDPI en determinisme'],
  ['public/brand/maculis-*-v1.{gif,png}', '7 nieuwe assets', 'de goedgekeurde bestanden, byte-identiek aan docs/studies/assets'],
  ['docs/studies/**', 'studie, gereedschap en renderproeven', 'geen productiecode']
];

const style = readFileSync(resolve(here, '../signature-waarneming.html'), 'utf8').split('<style>')[1].split('</style>')[0];

const html = `<title>Signature Pre-deploy Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${style}</style>
<style>
.verdictbar{display:flex;align-items:center;gap:18px;border:1px solid var(--ok);border-radius:3px;
  background:rgba(127,160,106,.07);padding:18px 22px;margin-top:26px;flex-wrap:wrap}
.verdictbar .tag{font:600 13px/1 "Instrument Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;
  color:var(--ok);border:1px solid var(--ok);border-radius:2px;padding:9px 14px}
.verdictbar p{margin:0;font-size:13.5px;color:var(--dim);max-width:74ch}
.mailframe{border:1px solid var(--line);border-radius:3px;overflow:hidden;background:var(--ink-panel);margin-top:22px}
.mailframe h4{margin:0;padding:10px 16px;font:600 10px/1.4 "Instrument Sans",sans-serif;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);border-bottom:1px solid var(--line);background:var(--ink-raise)}
.mailframe iframe{display:block;width:100%;height:330px;border:0}
.proofs{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:20px;margin-top:26px}
.proof{border:1px solid var(--line);border-radius:3px;background:var(--ink-panel);overflow:hidden;display:flex;flex-direction:column}
.proof .cap{padding:12px 15px;border-bottom:1px solid var(--line);background:var(--ink-raise)}
.proof .cap b{display:block;font:600 12.5px/1.4 "Instrument Sans",sans-serif;color:var(--text)}
.proof .cap span{font:400 10.5px/1.4 "IBM Plex Mono",monospace;color:var(--copper)}
.proof .img{padding:14px;background:var(--ink);display:flex;align-items:center;justify-content:center;min-height:120px}
.proof img{max-width:100%;height:auto;display:block}
.proof p{margin:0;padding:12px 15px;font-size:12px;line-height:1.55;color:var(--dim);border-top:1px solid var(--line-soft)}
.proof .req{padding:0 15px 12px;font:400 10px/1.5 "IBM Plex Mono",monospace;color:var(--faint);word-break:break-all}
pre{margin:0;padding:18px;overflow-x:auto;background:var(--ink);border:1px solid var(--line);border-radius:3px;
  font:400 11.5px/1.6 "IBM Plex Mono",monospace;color:#b9b2a6;white-space:pre}
.tag-b{display:inline-block;font:600 9.5px/1 "Instrument Sans",sans-serif;letter-spacing:.1em;text-transform:uppercase;
  padding:4px 8px;border-radius:2px;border:1px solid currentColor}
.tag-b.bewust{color:var(--dim)} .tag-b.goedgekeurd{color:var(--copper)} .tag-b.gecorrigeerd{color:var(--ok)} .tag-b.observatie{color:var(--warn)}
.check{display:grid;grid-template-columns:22px 1fr;gap:8px 12px;margin-top:20px;font-size:13.5px}
.check i{color:var(--ok);font-style:normal;font-weight:600}
.check span{color:var(--dim)}
.check span b{color:var(--text);font-weight:500}
</style>

<header class="top">
  <div class="wrap">
    <div class="eyebrow">Maculis · pre-deploy review · handtekening v1</div>
    <h1 style="margin-top:6px">Geïntegreerd,<br>nog niet verzonden</h1>
    <p class="lede" style="margin-top:20px">
      De handtekening zit nu in <span class="mono">server/comm/signature.mjs</span> en gebruikt de bevroren
      variant 2 assets. Alle proeven hieronder komen uit de werkelijke uitvoer van
      <span class="mono">wrapEmail()</span>, met de assets echt opgehaald bij de draaiende app.
      Er is geen mail verstuurd en er is niets gedeployed.
    </p>
    <div class="verdictbar">
      <span class="tag">Ready</span>
      <p>
        Alle 66 tests groen, 19 daarvan op de handtekening. De drie stille routes (GIF in rust,
        rustige beweging, Outlook klassiek) zijn pixelgelijk. Twee afwijkingen op de referentie zijn
        bewust, twee eerder gevonden fouten zijn gecorrigeerd. Wacht op jouw deploy-GO.
      </p>
    </div>
  </div>
</header>

<main>
  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Levend</span><h2>De werkelijk geïntegreerde handtekening</h2></div>
    <p class="small" style="max-width:72ch">
      Dit is letterlijk de html die <span class="mono">wrapEmail()</span> teruggeeft. Alleen de asset-URLs zijn
      voor deze offline pagina vervangen door ingesloten beelden; aan de markup is niets veranderd.
      De knop herlaadt het venster, en dat is het moment waarop de GIF opnieuw begint.
    </p>
    <div style="margin-top:18px"><button class="btn" id="replay">Speel opnieuw</button></div>
    <div class="mailframe"><h4>Lichte leesomgeving</h4><iframe title="handtekening licht" data-bg="#ffffff"></iframe></div>
    <div class="mailframe"><h4>Donkere leesomgeving</h4><iframe title="handtekening donker" data-bg="#1c1c1e"></iframe></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Proeven</span><h2>Statisch en bewegend, per scenario</h2></div>
    <p class="small" style="max-width:72ch">
      Elke proef noemt welke assets de client in dat scenario werkelijk heeft opgehaald. Bij rustige beweging
      staat de GIF er niet tussen: die wordt dan niet eens gedownload.
    </p>
    <div class="proofs">
      ${meta.report.map((r) => `<div class="proof">
        <div class="cap"><b>${r.title}</b><span>${r.id}${r.size !== 'n.v.t.' ? ' · ' + r.size + ' px' : ''}</span></div>
        <div class="img"><img src="${shot(r.id)}" alt="${r.title}"></div>
        <p>${r.note}</p>
        <div class="req">opgehaald: ${r.requested.join(', ') || 'niets'}</div>
      </div>`).join('')}
    </div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Platte tekst</span><h2>De tekstversie, onveranderd</h2></div>
    <p class="small" style="max-width:72ch">
      De tekstversie imiteert de animatie nergens en noemt beweging niet. Dit is de volledige uitvoer,
      inclusief het standaard scheidingsteken waaraan clients en de AI de handtekening herkennen.
    </p>
    <div style="margin-top:20px"><pre>${esc(meta.text)}</pre></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Clients</span><h2>Clientmatrix</h2></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Client</th><th>Beweging</th><th>Rustige beweging</th><th>Donkere modus</th><th>Bewijs</th></tr></thead>
      <tbody>${MATRIX.map((r) => `<tr><th scope="row">${r[0]}</th><td class="res">${r[1]}</td>
        <td class="res">${r[2]}</td><td class="res">${r[3]}</td><td class="res">${r[4]}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="small" style="margin-top:18px;max-width:72ch">
      Betrouwbaar getest is wat in een echte Chromium te toetsen valt: de picture-route, de donkere
      omgeving, HiDPI, geblokkeerde en ontbrekende beelden, de mobiele breedte en het gedrag van de GIF
      over de tijd. De regels voor Outlook klassiek en de donkere modus van Outlook.com zijn gebaseerd op
      hun gedocumenteerde renderengines en worden hier gesimuleerd, niet in die clients zelf gemeten.
    </p>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Afwijkingen</span><h2>Ten opzichte van de goedgekeurde referentie</h2></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Wat</th><th>Verschil</th><th>Reden</th><th>Status</th></tr></thead>
      <tbody>${DEVIATIONS.map((d) => `<tr><th scope="row">${d[0]}</th><td class="res">${d[1]}</td>
        <td class="res">${d[2]}</td><td><span class="tag-b ${d[3]}">${d[3]}</span></td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Assets</span><h2>Wat er in public/brand staat</h2></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Bestand</th><th>Grootte</th><th>Rol</th></tr></thead>
      <tbody>${ASSETS.map((f, i) => `<tr><th scope="row" class="mono" style="font-size:11.5px">${f}</th>
        <td class="mono" style="font-size:11.5px;color:var(--copper-lit)">${kB(f)} kB</td>
        <td class="res">${['de eenmalige waarneming, geen lus', 'exact frame 1 en het laatste frame', 'het woordmerk in Newsreader',
          'de violette ster', 'contacticoon e-mail', 'contacticoon website', 'contacticoon plaats, alleen bij een ingestelde plaats'][i]}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="small" style="margin-top:16px">
      Alle URLs zijn statisch, zonder queryreeks, gelijk voor elke ontvanger en versievast in de bestandsnaam.
      Geen pixel van 1 bij 1, geen unieke paden, dus niets waarmee een opening te herleiden is.
      De oude <span class="mono">maculis-eye</span> bestanden blijven staan: eerder verzonden mail verwijst er nog naar.
    </p>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Wijzigingen</span><h2>Exact deze bestanden</h2></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Bestand</th><th>Wijziging</th><th>Toelichting</th></tr></thead>
      <tbody>${CHANGED.map((c) => `<tr><th scope="row" class="mono" style="font-size:11.5px">${c[0]}</th>
        <td class="res">${c[1]}</td><td class="res">${c[2]}</td></tr>`).join('')}</tbody>
    </table></div>
    <h3 style="margin-top:30px">Rollback</h3>
    <p class="small" style="max-width:72ch">
      De presentatie zit in één bestand en één commit. Terugdraaien raakt geen verzendlogica, geen
      database en geen contracten.
    </p>
    <div style="margin-top:16px"><pre>${esc(`# alleen de handtekening terug naar de vorige presentatie
git checkout ${HEAD} -- server/comm/signature.mjs tests/comm-signature.test.mjs
npm test

# of de hele integratie terugdraaien
git revert <sha van de integratiecommit>

# de assets mogen blijven staan: ze worden dan nergens meer aangeroepen,
# en verwijderen zou beelden breken in mail die al verzonden is.`)}</pre></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Code</span><h2>De handtekening zoals hij verzonden wordt</h2></div>
    <div style="margin-top:20px"><pre>${esc(productionHtml)}</pre></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Oordeel</span><h2>Ready</h2></div>
    <div class="check">
      ${[
        ['Alleen de presentatie is gewijzigd', 'wrapEmail, stripForContext, de exports en de verzendweg zijn ongewijzigd; 66 tests groen'],
        ['Exact de bevroren variant 2 assets', 'byte-identiek aan de goedgekeurde bestanden, geen herinterpretatie'],
        ['Geen nieuwe animatieparameters', 'de beweging zit alleen in de GIF, gegenereerd uit seal-reference.js'],
        ['Geen remote fonts', 'geen link, geen font-face, canonieke fallback Georgia en Times'],
        ['Tekst blijft tekst', 'naam, payoff, e-mailadres en website staan buiten elke afbeelding'],
        ['Beweging draagt geen informatie', 'geen alt tekst noemt beweging, de tekstversie evenmin'],
        ['Statische fallback volledig', 'drie stille routes pixelgelijk aan elkaar'],
        ['Assets bereikbaar in externe mail', 'over http getoetst bij de draaiende app: 200 met image/gif en image/png'],
        ['Geen tracking via de assets', 'geen queryreeks, geen unieke paden, geen pixel van 1 bij 1'],
        ['Geen cache-busting per ontvanger', 'identieke URLs voor elke afzender en ontvanger, versie in de bestandsnaam'],
        ['Configuratie behouden', 'naam, payoff, rol, plaats en de regel in wording komen uit config'],
        ['Niets verzonden, niets gedeployed', 'alleen lokale renderproeven']
      ].map(([k, v]) => `<i>✓</i><span><b>${k}.</b> ${v}</span>`).join('')}
    </div>
    <p class="small" style="margin-top:26px">
      Wacht op expliciete deploy-GO.
    </p>
  </section>
</main>

<footer><div class="wrap"><div class="eyebrow" style="color:var(--faint)">Maculis</div>
  <p class="small" style="margin-top:8px">Pre-deploy review, gebouwd op commit ${HEAD}.</p></div></footer>

<script>
(() => {
  'use strict';
  const DOC = ${JSON.stringify(emailDoc('__BG__'))};
  const paint = () => document.querySelectorAll('iframe[data-bg]').forEach((f) => {
    f.srcdoc = DOC.replace('__BG__', f.dataset.bg);
  });
  document.getElementById('replay').addEventListener('click', paint);
  paint();
})();
</script>`;

writeFileSync(resolve(here, '../signature-predeploy.html'), html);
console.log('geschreven:', (html.length / 1024).toFixed(0), 'kB');
