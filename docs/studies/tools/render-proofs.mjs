// Renderproeven van de WERKELIJK geintegreerde handtekening.
// Bron: server/comm/signature.mjs via wrapEmail(). Niet de designstudy.
// De assets worden echt over http opgehaald bij de draaiende app, zodat ook
// bereikbaarheid en content type worden getoetst.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wrapEmail, renderSignatureText, signatureConfig } from '../../../server/comm/signature.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../proofs');
mkdirSync(out, { recursive: true });

const BODY = 'Hoi Kim,\n\nDank je voor je bericht. Ik heb het bekeken en kom er morgen op terug.\n\nHartelijke groet,';
const mail = wrapEmail({ bodyText: BODY, fromAddress: 'hello@maculis.nl' });

// Een e-mailclient plaatst onze html in zijn eigen leesvenster. Dit is de kaalste
// omhulling die daarbij past: geen eigen stijlen, alleen een achtergrond.
const doc = (bg, extra = '') => `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0}body{background:${bg};padding:24px}${extra}</style></head>
<body>${mail.html}</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const report = [];

async function shot({ id, title, note, bg = '#ffffff', width = 900, dsf = 1, reduced = 'no-motion',
                      at = 600, block = null, invert = false, still = false, whole = false }) {
  const ctx = await browser.newContext({ viewport: { width, height: 700 }, deviceScaleFactor: dsf,
                                         reducedMotion: reduced === 'reduce' ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const requested = [];
  await page.route('**/brand/**', async (route) => {
    const url = route.request().url();
    requested.push(url.split('/brand/')[1]);
    if (block === 'abort') return route.abort();
    if (block === '404') return route.fulfill({ status: 404, body: 'Not found' });
    return route.continue();
  });
  let html = doc(bg, invert ? 'body>*{filter:invert(1) hue-rotate(180deg)}body img{filter:invert(1) hue-rotate(180deg)}' : '');
  if (still) {
    // Outlook klassiek (Word engine) kent picture niet en toont alleen frame 1 van de GIF.
    // Frame 1 is bit voor bit de statische PNG, dus dat is exact wat we hier tonen.
    html = html.replace(/<picture>[\s\S]*?<\/picture>/, (m) =>
      m.replace(/src="[^"]*maculis-seal-perceive-v1\.gif"/, 'src="http://127.0.0.1:3111/brand/maculis-seal-rest-v1.png"')
       .replace(/<source[^>]*>/, ''));
  }
  await page.setContent(html, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(at);
  const table = whole ? null : await page.$('table.mac-ink');
  const file = `${id}.png`;
  if (whole) await page.screenshot({ path: resolve(out, file), clip: { x: 0, y: 0, width, height: 420 } });
  else if (table) await table.screenshot({ path: resolve(out, file) });
  else await page.screenshot({ path: resolve(out, file) });
  const box = table ? await table.boundingBox() : null;
  report.push({ id, title, note, file, requested: [...new Set(requested)].sort(),
                size: box ? `${Math.round(box.width)} bij ${Math.round(box.height)}` : 'n.v.t.' });
  await ctx.close();
}

await shot({ id: '01-rust', title: 'Desktop, lichte body, stille aanloop', at: 600,
  note: 'Wat de ontvanger het eerste anderhalve seconde ziet. Dit is ook het beeld waar alles op eindigt.' });
await shot({ id: '02-waarneming', title: 'Desktop, lichte body, het moment zelf', at: 4600,
  note: 'De vier punten staan bij de ster, de ster ademt. Dit duurt ongeveer een halve seconde.' });
await shot({ id: '03-stil', title: 'Desktop, lichte body, na afloop', at: 8200,
  note: 'Acht seconden na openen. Identiek aan de eerste proef, dus de GIF is gestopt en herhaalt niet.' });
await shot({ id: '04-donkere-body', title: 'Donkere leesomgeving', bg: '#1c1c1e', at: 600,
  note: 'Apple Mail en Gmail in donkere modus laten donkere achtergronden staan.' });
await shot({ id: '05-mobiel', title: 'Mobiel, 390 px', width: 390, dsf: 2, at: 600,
  note: 'Gmail app en Mail op iOS. Het blok is breder dan het venster en schuift horizontaal, zoals elke tabelhandtekening.' });
await shot({ id: '06-reduced-motion', title: 'Rustige beweging ingeschakeld', reduced: 'reduce', at: 900,
  note: 'De source met prefers-reduced-motion wint: de client haalt de PNG op en de GIF wordt niet eens gedownload.' });
await shot({ id: '07-images-uit', title: 'Beelden geblokkeerd', block: 'abort', at: 700,
  note: 'Alle tekst blijft staan. De alt tekst van het woordmerk draagt de merknaam.' });
await shot({ id: '08-images-404', title: 'Assets onbereikbaar (404)', block: '404', at: 700,
  note: 'Zelfde situatie als geblokkeerd, met de placeholder van de client. Er gaat geen informatie verloren.' });
await shot({ id: '09-hidpi', title: 'HiDPI, twee keer de pixeldichtheid', dsf: 2, at: 600,
  note: 'De assets zijn op 300 px gerenderd en worden op 150 px getoond, dus scherp op retina.' });
await shot({ id: '10-outlook-klassiek', title: 'Outlook klassiek, alleen frame 1', still: true, at: 600,
  note: 'De Word engine toont het eerste frame. Dat frame is bit voor bit de statische PNG.' });
await shot({ id: '11-forced-dark', title: 'Geforceerde donkere modus zonder onze stijlregels', invert: true, at: 600,
  note: 'De geaccepteerde randsituatie: tekstpaneel keert om, het zegel blijft donker.' });

await shot({ id: '00-volledige-mail', title: 'De volledige e-mail', whole: true, at: 900,
  note: 'Bericht plus handtekening, zoals de ontvanger hem opent. De handtekening staat los onder de tekst.' });

writeFileSync(resolve(out, 'proofs.json'), JSON.stringify({
  report,
  text: mail.text,
  html: mail.html,
  assets: signatureConfig({ fromAddress: 'hello@maculis.nl' }),
  textOnly: renderSignatureText(signatureConfig({ fromAddress: 'hello@maculis.nl' })),
}, null, 2));

console.log(report.map(r => `${r.id.padEnd(22)} ${r.size.padEnd(14)} ${r.requested.join(', ') || 'geen assets opgehaald'}`).join('\n'));
await browser.close();
