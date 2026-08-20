// Het slot van de Maculis Lens: zien, begrijpen, eventueel bewaren.
//
//   node tools/visual/lens-slot.mjs
//
// De Lens woont in een eigen repo, maar Playwright staat hier. Deze harness rendert daarom de
// pagina van de Lens vanaf schijf, zonder backend, en drijft alleen het slot aan. Wijs LENS_PUBLIC
// aan als de checkout ergens anders staat; ontbreekt hij, dan slaat de harness zichzelf over in
// plaats van rood te worden op iets dat er niet is.
//
// Wat hier wordt vastgehouden: de Lens eindigt met de bewaarvraag en niet met een actievraag, laat
// zien waar ja of nee tegen wordt gezegd, vraagt daarna apart om contact, en eindigt terminaal.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const PUBLIC = process.env.LENS_PUBLIC || '/workspace/maculis-first-five./public';
const PORT = 4431;
try { await (await import('node:fs/promises')).access(join(PUBLIC, 'index.html')); }
catch { console.log(`  overgeslagen: geen Lens-checkout op ${PUBLIC}. Zet LENS_PUBLIC.`); process.exit(0); }
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname);const f=join(PUBLIC,rel==='/'?'/index.html':rel);if(!f.startsWith(PUBLIC)){res.writeHead(403);return res.end();}try{const b=await readFile(f);res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end('nf');}});
await new Promise(r=>server.listen(PORT,r));
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:430,height:932},deviceScaleFactor:2,locale:'nl-NL',reducedMotion:'reduce'});
const fouten=[]; page.on('pageerror',e=>fouten.push(String(e)));
await page.route('**/api/**', r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
await page.goto(`http://127.0.0.1:${PORT}/index.html`);
await page.waitForTimeout(1200);
const stappen=[]; const stap=(ok,t,x='')=>{stappen.push(ok);console.log(`  [${ok?'OK ':'FOUT'}] ${t}${x?' · '+x:''}`);};

const ZIN='De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.';
const gebeurtenissen = await page.evaluate(({ZIN})=>{
  currentOutcome = { outcome:'REVEAL', family:'MISCAST', line:ZIN, evidence:[] };
  measure = { recognition:'deels', accuracy:'deels', novelty:null, recognition_context:null,
              accuracy_context:'Wij groeien bewust via verwijzers en relaties.' };
  session.events.length = 0;
  gotoBewaren();
  return session.events.map(e=>e.name);
}, {ZIN});
await page.waitForTimeout(500);
const t1=await page.evaluate(()=>document.getElementById('acc-beat').innerText.trim());
console.log('\n--- BEWAARVRAAG ---\n'+t1+'\n--- knoppen: '+(await page.evaluate(()=>[...document.querySelectorAll('#acc-actions button')].map(b=>b.textContent).join(' | ')))+'\n');
stap(/Zal ik dit onthouden\?/.test(t1),'de Lens eindigt met de bewaarvraag');
stap(/wat ik zag/i.test(t1)&&t1.includes(ZIN),'wat Maculis zag staat eronder, woordelijk');
stap(/wat jij erover zei/i.test(t1)&&/deels/i.test(t1),'en wat hij er zelf over zei');
stap(t1.includes('verwijzers'),'inclusief zijn eigen woorden');
stap(!/account|inschrijv|mailadres|@/i.test(t1),'geen accountgevoel en geen mailcapture');
stap(!gebeurtenissen.includes('intent_prompt_seen'),'de actievraag is niet gepasseerd');

await page.click('#acc-actions button');
await page.waitForTimeout(600);
const t2=await page.evaluate(()=>document.getElementById('acc-beat').innerText.trim());
console.log('--- CONTACTVRAAG ---\n'+t2+'\n--- knoppen: '+(await page.evaluate(()=>[...document.querySelectorAll('#acc-actions button')].map(b=>b.textContent).join(' | ')))+'\n');
stap(/waar je het terugvindt/.test(t2),'daarna de contactvraag, los van bewaren');
stap(!/nieuws|op de hoogte/i.test(t2),'de contactvraag belooft geen nieuwsstroom');
await page.click('#acc-actions button');
await page.waitForTimeout(600);
const t3=await page.evaluate(()=>document.getElementById('acc-beat').innerText.trim());
console.log('--- SLOT ---\n'+t3+'\n');
stap(await page.evaluate(()=>document.querySelectorAll('#acc-actions button').length===0),'het slot is terminaal, geen knop erna');
stap(fouten.length===0,'geen pagefouten',fouten[0]||'nul');
await browser.close(); server.close();
const rood=stappen.filter(s=>!s).length;
console.log(rood?`ROOD: ${rood} van ${stappen.length}`:'LENS SLOT: ALLES GROEN');
process.exit(rood?1:0);
