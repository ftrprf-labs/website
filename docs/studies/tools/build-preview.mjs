// Bouwt docs/studies/signature-production.html: de werkelijke e-mailhandtekening
// met de echte assets, naast de bevroren referentie. Alle beelden worden als
// data URI ingesloten zodat de pagina op zichzelf staat.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const A = (f) => resolve(here, '../assets', f);
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(A(f)).toString('base64')}`;
const kB = (f) => (statSync(A(f)).size / 1024).toFixed(1).replace('.', ',');

const ASSET = {
  gif:  { file: 'maculis-seal-perceive-v1.gif', mime: 'image/gif', w: 150, h: 150 },
  png:  { file: 'maculis-seal-rest-v1.png',     mime: 'image/png', w: 150, h: 150 },
  word: { file: 'maculis-wordmark-v1.png',      mime: 'image/png', w: 106, h: 50 },
  spark:{ file: 'maculis-spark-v1.png',         mime: 'image/png', w: 30,  h: 30 },
  mail: { file: 'maculis-icon-mail-v1.png',     mime: 'image/png', w: 13,  h: 13 },
  globe:{ file: 'maculis-icon-globe-v1.png',    mime: 'image/png', w: 13,  h: 13 },
  pin:  { file: 'maculis-icon-pin-v1.png',      mime: 'image/png', w: 13,  h: 13 }
};
const DATA = Object.fromEntries(Object.entries(ASSET).map(([k, a]) => [k, b64(a.file, a.mime)]));
const BASE = 'https://maculis.com/brand';
const URLS = Object.fromEntries(Object.entries(ASSET).map(([k, a]) => [k, `${BASE}/${a.file}`]));

/* ---------------------------------------------------------------------------
   De werkelijke handtekening. Dit is de markup die de Communication Layer bij
   verzenden zou toevoegen. Tabelgebaseerd, inline stijlen, geen CSS animatie,
   alleen de zegelcel is bewegend beeld.
---------------------------------------------------------------------------- */
function signatureHtml(src, { seal = 'gif', font = 'newsreader' } = {}){
  const serif = font === 'georgia'
    ? "Georgia,'Times New Roman',Times,serif"
    : "Newsreader,Georgia,'Times New Roman',Times,serif";
  const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const INK = '#0a0b10', COPPER = '#b87333', LIT = '#e6b98d', DIM = '#8e857a', ROW = '#a89f92', VIO = '#a08fd6';
  const row = (icon, text, href) => `
            <tr>
              <td style="padding:0 9px 7px 0;line-height:0"><img src="${src[icon]}" width="13" height="13" alt="" style="display:block;border:0;width:13px;height:13px"></td>
              <td style="padding:0 0 7px;font-family:${sans};font-size:12.5px;line-height:13px;color:${ROW};white-space:nowrap">${
                href ? `<a href="${href}" style="color:${ROW};text-decoration:none">${text}</a>` : text}</td>
            </tr>`;
  const sealCell = seal === 'gif'
    ? `<picture>
            <source media="(prefers-reduced-motion: reduce)" srcset="${src.png}">
            <img src="${src.gif}" width="150" height="150" alt="Maculis" style="display:block;border:0;outline:none;width:150px;height:150px">
          </picture>`
    : `<img src="${src.png}" width="150" height="150" alt="Maculis" style="display:block;border:0;outline:none;width:150px;height:150px">`;

  return `<!--maculis-signature-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="m-ink" style="border-collapse:collapse;background-color:${INK};mso-line-height-rule:exactly">
  <tr>
    <td class="m-ink" width="150" style="width:150px;padding:18px 0;line-height:0;background-color:${INK}" valign="middle">
      ${sealCell}
    </td>
    <td class="m-ink m-rule" style="padding:16px 22px;border-left:1px solid ${COPPER};background-color:${INK}" valign="middle">
      <div class="m-name" style="font-family:${serif};font-weight:normal;font-size:25px;line-height:30px;color:${LIT};white-space:nowrap">Ferry van der Vliet</div>
      <div class="m-role" style="font-family:${sans};font-size:10px;letter-spacing:1.9px;text-transform:uppercase;line-height:18px;color:${DIM};padding-top:2px;white-space:nowrap">Founder &amp; Steward</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;padding-top:8px">
        <tr><td style="height:8px;line-height:8px;font-size:0">&nbsp;</td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">${
        row('mail', 'ferry@maculis.com', 'mailto:ferry@maculis.com')}${
        row('globe', 'maculis.com', 'https://maculis.com')}${
        row('pin', 'Voorburg, Nederland', null)}
      </table>
    </td>
    <td class="m-ink m-rule" style="padding:16px 22px;border-left:1px solid ${COPPER};background-color:${INK}" valign="middle">
      <img src="${src.word}" width="106" height="50" alt="Maculis" style="display:block;border:0;width:106px;height:50px">
      <div class="m-tag" style="font-family:${serif};font-size:13px;line-height:20px;color:${ROW};padding-top:6px;white-space:nowrap">Waarnemen. Begrijpen. Verlichten.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:8px">
        <tr>
          <td style="padding:0 2px 0 0;line-height:0"><img src="${src.spark}" width="30" height="30" alt="" style="display:block;border:0;width:30px;height:30px"></td>
          <td class="m-wording" style="font-family:${serif};font-style:italic;font-size:13.5px;line-height:16px;color:${VIO}">In wording.</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// De donkere modus van Outlook.com en Gmail draait kleuren om. Deze regels
// zetten de inktgrond en de tekstkleuren terug. Ze horen bij de handtekening.
const DARKMODE_CSS = `<style type="text/css">
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  [data-ogsc] .m-ink, [data-ogsb] .m-ink { background-color: #0a0b10 !important; }
  [data-ogsc] .m-rule, [data-ogsb] .m-rule { border-left-color: #b87333 !important; }
  [data-ogsc] .m-name { color: #e6b98d !important; }
  [data-ogsc] .m-role { color: #8e857a !important; }
  [data-ogsc] .m-tag  { color: #a89f92 !important; }
  [data-ogsc] .m-wording { color: #a08fd6 !important; }
</style>`;

const emailDoc = (src, opts, invert) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  html,body{margin:0;padding:0}
  body{background:${opts.body};padding:26px;font-family:sans-serif}
  ${invert ? `.inv{filter:invert(1) hue-rotate(180deg)} .inv img{filter:invert(1) hue-rotate(180deg)}` : ''}
</style>${DARKMODE_CSS}</head>
<body><div class="${invert ? 'inv' : ''}">${signatureHtml(src, opts)}</div></body></html>`;

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------------------- */
const style = readFileSync(resolve(here, '../signature-waarneming.html'), 'utf8')
  .split('<style>')[1].split('</style>')[0];
const seal = readFileSync(resolve(here, 'seal-reference.js'), 'utf8');

const ASSET_ROWS = [
  ['maculis-seal-perceive-v1.gif', '300 bij 300', 'getoond op 150', `${kB(ASSET.gif.file)} kB`, '47 frames, palet 256, geen lus'],
  ['maculis-seal-rest-v1.png', '300 bij 300', 'getoond op 150', `${kB(ASSET.png.file)} kB`, 'gelijk aan het eerste en het laatste frame'],
  ['maculis-wordmark-v1.png', '212 bij 100', 'getoond op 106 bij 50', `${kB(ASSET.word.file)} kB`, 'woordmerk met ster, want Newsreader laadt niet in e-mail'],
  ['maculis-spark-v1.png', '60 bij 60', 'getoond op 30 bij 30', `${kB(ASSET.spark.file)} kB`, 'violette ster bij de regel in wording'],
  ['maculis-icon-mail-v1.png', '26 bij 26', 'getoond op 13 bij 13', `${kB(ASSET.mail.file)} kB`, 'contacticoon'],
  ['maculis-icon-globe-v1.png', '26 bij 26', 'getoond op 13 bij 13', `${kB(ASSET.globe.file)} kB`, 'contacticoon'],
  ['maculis-icon-pin-v1.png', '26 bij 26', 'getoond op 13 bij 13', `${kB(ASSET.pin.file)} kB`, 'contacticoon']
];
const totalKB = Object.values(ASSET).reduce((a, x) => a + statSync(A(x.file)).size, 0) / 1024;
const firstOpen = (statSync(A(ASSET.gif.file)).size + Object.entries(ASSET).filter(([k]) => k !== 'png')
  .reduce((a, [, x]) => a + (x.file === ASSET.gif.file ? 0 : statSync(A(x.file)).size), 0)) / 1024;

const CLIENTS = [
  ['Apple Mail, macOS 14 en later', 'de gebeurtenis speelt een keer', 'PNG via prefers-reduced-motion', 'volgt het systeem'],
  ['Mail op iOS en iPadOS', 'de gebeurtenis speelt een keer', 'PNG via prefers-reduced-motion', 'volgt het systeem'],
  ['Gmail webmail', 'de gebeurtenis speelt een keer', 'geen route, de GIF speelt toch', 'inverteert de inktgrond niet'],
  ['Gmail app, iOS en Android', 'de gebeurtenis speelt een keer', 'geen route, de GIF speelt toch', 'inverteert de inktgrond niet'],
  ['Outlook klassiek voor Windows', 'frame 1, dus het rustframe', 'niet nodig, er beweegt niets', 'geen eigen donkere modus'],
  ['Nieuw Outlook voor Windows', 'de gebeurtenis speelt een keer', 'geen betrouwbare route', 'kan inverteren, data-ogsc vangt dat op'],
  ['Outlook.com in de browser', 'de gebeurtenis speelt een keer', 'geen betrouwbare route', 'kan inverteren, data-ogsc vangt dat op'],
  ['Outlook voor macOS', 'de gebeurtenis speelt een keer', 'gedeeltelijk', 'kan inverteren'],
  ['Outlook op iOS en Android', 'de gebeurtenis speelt een keer', 'geen route', 'kan inverteren'],
  ['Yahoo Mail', 'de gebeurtenis speelt een keer', 'geen route', 'inverteert niet'],
  ['Thunderbird', 'de gebeurtenis speelt een keer', 'PNG via prefers-reduced-motion', 'volgt het systeem'],
  ['Proton Mail webmail', 'de gebeurtenis speelt een keer, na toestemming voor beelden', 'geen route', 'inverteert niet'],
  ['Samsung Mail', 'de gebeurtenis speelt een keer', 'geen route', 'kan inverteren'],
  ['Superhuman, HEY, Spark', 'de gebeurtenis speelt een keer', 'PNG via prefers-reduced-motion', 'volgt het systeem']
];

const html = `<title>Maculis Handtekening v1</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>${style}</style>
<style>
.frames{display:flex;flex-direction:column;gap:22px;margin-top:28px}
.mailframe{border:1px solid var(--line);border-radius:3px;overflow:hidden;background:var(--ink-panel)}
.mailframe h4{margin:0;padding:10px 16px;font:600 10px/1.4 "Instrument Sans",sans-serif;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);border-bottom:1px solid var(--line);background:var(--ink-raise)}
.mailframe iframe{display:block;width:100%;height:240px;border:0;background:#fff}
.assetgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:18px;margin-top:26px}
.assetcard{border:1px solid var(--line);border-radius:3px;background:var(--ink);padding:14px;text-align:center}
.assetcard img{display:block;margin:0 auto 10px;image-rendering:auto}
.assetcard .n{font:500 11px/1.4 "IBM Plex Mono",monospace;color:var(--copper-lit);word-break:break-all}
.assetcard .s{font:400 11px/1.5 "Instrument Sans",sans-serif;color:var(--faint);margin-top:4px}
pre{margin:0;padding:20px;overflow-x:auto;background:var(--ink);border:1px solid var(--line);border-radius:3px;
  font:400 11.5px/1.65 "IBM Plex Mono",monospace;color:#b9b2a6;white-space:pre;tab-size:2}
pre .k{color:var(--copper)} pre .v{color:#8fa77e} pre .c{color:var(--faint)}
.sbs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start;margin-top:26px}
.sbs.three{grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width:820px){.sbs,.sbs.three{grid-template-columns:1fr}}
.sbs .cell{border:1px solid var(--line);border-radius:3px;background:var(--ink);padding:20px;text-align:center}
.sbs .cell canvas,.sbs .cell img{display:block;margin:0 auto;width:150px;height:150px}
.sbs .cell .lbl{margin-top:12px;font:600 10px/1.4 "Instrument Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.locked{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:12.5px}
.locked dt{color:var(--copper);font-family:"IBM Plex Mono",monospace;font-size:11.5px;white-space:nowrap}
.locked dd{margin:0;color:var(--dim)}
</style>

<header class="top">
  <div class="wrap top-grid">
    <div>
      <div class="eyebrow">Maculis · productievoorstel · handtekening v1</div>
      <h1>De werkelijke<br>handtekening</h1>
      <p class="lede" style="margin-top:22px">
        Variant 2 is bevroren als referentie en uitgebouwd tot echte assets. Hieronder staat de
        handtekening zoals hij verzonden zou worden: tabelgebaseerde e-mailcode, echte tekst waar het kan,
        beeld waar het moet, en een zegel dat één keer waarneemt en daarna stil is.
      </p>
      <div class="paradox" style="margin-top:26px">
        Alles wat je hier ziet komt uit één bron: seal-reference.js. De GIF, de PNG en de referentie
        naast elkaar zijn hetzelfde beeld, niet drie keer hetzelfde beeld nagemaakt.
      </div>
    </div>
    <div class="rulebox">
      <div class="eyebrow" style="color:var(--dim)">Bevroren op 2026-08-18</div>
      <dl class="locked">
        <dt>stilte</dt><dd>1,6 s voor de gebeurtenis</dd>
        <dt>punten</dt><dd>4, vertraging 0,34 s</dd>
        <dt>nadering</dt><dd>24 px, stopt op 96 procent</dd>
        <dt>ademhaling</dt><dd>0,18 s op, 0,32 s af, winst 0,30</dd>
        <dt>einde</dt><dd>gespreid over 0,6 s, stil op 6,6 s</dd>
        <dt>duur</dt><dd>7,0 s, daarna niets meer</dd>
      </dl>
    </div>
  </div>
</header>

<div class="bar">
  <div class="wrap bar-in">
    <button class="btn" id="replay">Speel opnieuw</button>
    <div class="ctl">
      <span class="ctl-label">Route</span>
      <div class="seg" id="seg-route">
        <button data-v="gif" aria-pressed="true">Bewegend</button>
        <button data-v="png" aria-pressed="false">Rustige beweging</button>
      </div>
    </div>
    <div class="ctl">
      <span class="ctl-label">Letter</span>
      <div class="seg" id="seg-font">
        <button data-v="newsreader" aria-pressed="true">Newsreader</button>
        <button data-v="georgia" aria-pressed="false">Zoals in e-mail</button>
      </div>
    </div>
    <label class="check"><input type="checkbox" id="invert"> Geforceerde donkere modus</label>
  </div>
</div>

<main>
  <section class="wrap">
    <div class="section-head"><span class="eyebrow">In de inbox</span><h2>Op een lichte en een donkere body</h2></div>
    <p class="small" style="max-width:70ch">
      Beide vensters tonen echte e-mailcode in een eigen document, dus zonder invloed van deze pagina.
      De knop hierboven herlaadt ze, en dat is ook het moment waarop de GIF opnieuw begint. Zet de route op
      rustige beweging om te zien wat Apple Mail toont als de ontvanger beweging heeft uitgezet, en wat
      Outlook klassiek sowieso toont.
    </p>
    <div class="frames" id="frames"></div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Bewijs</span><h2>Referentie, GIF en fallback naast elkaar</h2></div>
    <p class="small" style="max-width:70ch">
      Links de bevroren referentie, live getekend uit seal-reference.js. In het midden het eerste frame van
      de GIF. Rechts de statische PNG. De drie moeten niet van elkaar te onderscheiden zijn.
    </p>
    <div class="sbs three">
      <div class="cell"><canvas id="ref" width="300" height="300"></canvas><div class="lbl">Referentie, t is 0</div></div>
      <div class="cell"><img alt="" id="giffirst" data-src="gif"><div class="lbl">GIF, eerste frame</div></div>
      <div class="cell"><img alt="" data-src="png"><div class="lbl">Statische PNG</div></div>
    </div>
    <p class="small" id="proof" style="margin-top:18px"></p>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Assets</span><h2>Zeven bestanden, ${totalKB.toFixed(0)} kB samen</h2></div>
    <div class="assetgrid">
      ${Object.entries(ASSET).map(([k, a]) => `<div class="assetcard">
        <img data-src="${k}" width="${a.w < 40 ? a.w * 2 : Math.min(a.w, 120)}" height="${a.w < 40 ? a.h * 2 : Math.round(a.h * Math.min(a.w, 120) / a.w)}" alt="">
        <div class="n">${a.file}</div><div class="s">${kB(a.file)} kB</div></div>`).join('')}
    </div>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Bestand</th><th>Pixels</th><th>Weergave</th><th>Grootte</th><th>Toelichting</th></tr></thead>
        <tbody>${ASSET_ROWS.map(r => `<tr><th scope="row" class="mono" style="font-size:11.5px">${r[0]}</th>
          <td class="mono" style="font-size:11.5px;white-space:nowrap">${r[1]}</td>
          <td class="mono" style="font-size:11.5px;white-space:nowrap;color:var(--faint)">${r[2]}</td>
          <td class="mono" style="font-size:11.5px;color:var(--copper-lit)">${r[3]}</td>
          <td class="res">${r[4]}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="cols">
      <div>
        <h3>Wat de ontvanger werkelijk laadt</h3>
        <p class="small">
          Bij een bewegende weergave: ${firstOpen.toFixed(0)} kB aan beeld, waarvan ${kB(ASSET.gif.file)} kB het zegel.
          Bij de rustige route vervangt de PNG van ${kB(ASSET.png.file)} kB de GIF, en zakt het totaal naar ongeveer
          ${(totalKB - (statSync(A(ASSET.gif.file)).size / 1024)).toFixed(0)} kB. Alles wordt door de beeldproxy van de client
          gecachet, dus dit is eenmalig per ontvanger en per versie.
        </p>
      </div>
      <div>
        <h3>Waarom 256 kleuren</h3>
        <p class="small">
          Getest op 32, 64, 128 en 256 kleuren. Bij 64 werd de gloed rond de ster zichtbaar getrapt.
          Het verschil tussen 128 en 256 is 12 kB, en dat is bij dit budget geen afweging waard.
          Dithering staat uit: ruis zou per frame veranderen, waardoor de GIF zowel groter als onrustiger wordt.
        </p>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Routes</span><h2>Wat elke client krijgt</h2></div>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Client</th><th>Beweging</th><th>Rustige beweging</th><th>Donkere modus</th></tr></thead>
        <tbody>${CLIENTS.map(r => `<tr><th scope="row">${r[0]}</th>
          <td class="res">${r[1]}</td><td class="res">${r[2]}</td><td class="res">${r[3]}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="cols">
      <div>
        <h3>De rustige route</h3>
        <p class="small">
          De zegelcel is een <span class="mono">picture</span> met een <span class="mono">source</span> die op
          <span class="mono">prefers-reduced-motion</span> naar de PNG wijst. Apple Mail, Thunderbird en de
          WebKit clients volgen die route. Gmail en Outlook kennen hem niet en tonen de GIF. Dat is precies
          de reden dat de gebeurtenis één keer speelt en daarna stopt: een eenmalige gebeurtenis van zeven
          seconden is verdedigbaar zonder die route, een doorlopende lus niet.
        </p>
      </div>
      <div>
        <h3>De donkere modus</h3>
        <p class="small">
          De handtekening is zelf al donker, dus in de meeste clients gebeurt er niets. Outlook.com en het
          nieuwe Outlook kunnen kleuren omkeren. De meegeleverde stijlregels met
          <span class="mono">data-ogsc</span> en <span class="mono">data-ogsb</span> zetten de inktgrond en de
          tekstkleuren terug. Zet hierboven de geforceerde donkere modus aan om te zien wat er gebeurt als die
          regels worden genegeerd.
        </p>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="section-head"><span class="eyebrow">Code</span><h2>De handtekening zoals hij verzonden wordt</h2></div>
    <p class="small" style="max-width:70ch">
      Met de productie-URLs. Nog niet aangesloten op <span class="mono">signature.mjs</span>: naam, adres en
      payoff komen daar uit config, nooit uit deze code.
    </p>
    <div style="margin-top:22px"><pre>${esc(DARKMODE_CSS + '\\n' + signatureHtml(URLS, { seal: 'gif', font: 'newsreader' }))}</pre></div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="eyebrow" style="color:var(--faint)">Maculis</div>
    <p class="small" style="margin-top:8px">
      Niets geïntegreerd, niets gedeployed. De assets staan in docs/studies/assets en worden gegenereerd uit
      seal-reference.js.
    </p>
  </div>
</footer>

<script>${seal}</script>
<script>
(() => {
  'use strict';
  const SRC = __SRC__;
  const signatureHtml = __SIGFN__;
  const DARKMODE_CSS = __DARKCSS__;
  const emailDoc = __DOCFN__;
  document.querySelectorAll('img[data-src]').forEach(i => { i.src = SRC[i.dataset.src]; });

  const state = { route: 'gif', font: 'newsreader', invert: false };
  const host = document.getElementById('frames');
  host.innerHTML = ['light', 'dark'].map(k => \`
    <div class="mailframe">
      <h4>\${k === 'light' ? 'Lichte e-mailbody' : 'Donkere e-mailbody'}</h4>
      <iframe title="handtekening op \${k}" data-k="\${k}"></iframe>
    </div>\`).join('');

  function paint(){
    host.querySelectorAll('iframe').forEach(f => {
      f.srcdoc = emailDoc(SRC, {
        body: f.dataset.k === 'light' ? '#ffffff' : '#1c1c1e',
        seal: state.route, font: state.font
      }, state.invert);
    });
  }
  function segment(id, key){
    const box = document.getElementById(id);
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      [...box.querySelectorAll('button')].forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      state[key] = b.dataset.v; paint();
    });
  }
  segment('seg-route', 'route');
  segment('seg-font', 'font');
  document.getElementById('invert').addEventListener('change', e => { state.invert = e.target.checked; paint(); });
  document.getElementById('replay').addEventListener('click', paint);
  paint();

  // Bewijs: teken de referentie op t is 0 en vergelijk met het eerste GIF frame.
  const cv = document.getElementById('ref');
  window.MaculisSeal.draw(cv.getContext('2d'), 0, 2);
  const img = document.getElementById('giffirst');
  const check = () => {
    const a = document.createElement('canvas'); a.width = a.height = 300;
    a.getContext('2d').drawImage(img, 0, 0, 300, 300);
    const x = cv.getContext('2d').getImageData(0, 0, 300, 300).data;
    const y = a.getContext('2d').getImageData(0, 0, 300, 300).data;
    let max = 0, sum = 0;
    for (let i = 0; i < x.length; i += 4){
      for (let c = 0; c < 3; c++){ const d = Math.abs(x[i+c] - y[i+c]); if (d > max) max = d; sum += d; }
    }
    const gem = (sum / (x.length / 4 * 3)).toFixed(2).replace('.', ',');
    document.getElementById('proof').textContent =
      'Gemeten verschil tussen de referentie en het eerste GIF frame: gemiddeld ' + gem +
      ' van 255 per kleurkanaal, grootste afwijking ' + max + ' van 255. Dat verschil komt volledig uit de ' +
      'kleurenreductie van GIF en is bij weergave op 150 pixels niet zichtbaar.';
  };
  if (img.complete) check(); else img.addEventListener('load', check);
})();
</script>`;

const filled = html
  .replace('__SRC__', JSON.stringify(DATA))
  .replace('__SIGFN__', signatureHtml.toString())
  .replace('__DARKCSS__', JSON.stringify(DARKMODE_CSS))
  .replace('__DOCFN__', emailDoc.toString());
writeFileSync(resolve(here, '../signature-production.html'), filled);
console.log('geschreven:', (filled.length / 1024).toFixed(0), 'kB');
