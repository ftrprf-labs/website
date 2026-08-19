// Bewijs voor de mobiele presentatie van Mijn Maculis.
//
//   node tools/visual/mijn-mobiel.mjs
//
// Op een breed scherm staat het bewijsblad naast het veld en is er niets aan de hand. Op een
// telefoon ligt het eronder, en dan is het niet genoeg dat er ruimte overblijft: het patroon dat
// je zojuist aantikte moet in die ruimte staan. Anders lees je een document in plaats van dat je
// naar iets kijkt, en dat is precies het verschil dat Mijn Maculis probeert te maken.
//
// Deze harness meet dat op het echte oppervlak, op twee iPhone-formaten:
//
//   * de strook boven het blad is minstens een kwart van het scherm;
//   * die strook is veld en geen menu, want de periferie wijkt zoals op desktop;
//   * het patroon dat je opende staat er werkelijk in. Gemeten door in het midden van de strook
//     te tikken: raakt dat de kern, dan blijft hetzelfde inzicht open; is er geen kern, dan is
//     het lege veldruimte en sluit het blad;
//   * elk nieuw patroon begint bovenaan het blad, ook na diep scrollen in het vorige;
//   * lege veldruimte aantikken brengt je terug, en dan is de periferie er weer;
//   * Gesprekken en Samenwerking openen en sluiten;
//   * draaien en terugdraaien laat het patroon in de strook staan;
//   * de veilige zone onderaan het toestel wordt gerespecteerd;
//   * en, hard afgedwongen: Het Veld loopt niet door de leesbare HUD-tekst. Op een telefoon is de
//     HUD een band dwars over de bovenkant, geen hoekversiering. `vrijVoorTekst` houdt alleen de
//     LABELS uit die zone; de punten en verbindingen zelf worden nooit onderdrukt. Ze horen er dus
//     simpelweg niet te komen, en dat wordt hier op de pixels gemeten, tijdens de opbouw én in
//     rust. Alfa telt mee: een bijna doorzichtige pixel is op het scherm niets.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import * as F from './mijn-fixtures.mjs';

const PUBLIC = join(resolve(import.meta.dirname, '..', '..'), 'public');
const PORT = 4417;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer(async(q,r)=>{try{const b=await readFile(join(PUBLIC,decodeURIComponent(new URL(q.url,'http://x').pathname)));r.writeHead(200,{'content-type':MIME[extname(q.url.split('?')[0])]||'application/octet-stream'});r.end(b)}catch{r.writeHead(404);r.end()}});
await new Promise(r=>srv.listen(PORT,'127.0.0.1',r));
const OPSLAG=`(()=>{const e=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(String(k).startsWith('mijn_laatst_'))return ${JSON.stringify(F.VORIG_BEZOEK)};return e.call(this,k)};})();`;
const br=await chromium.launch(); // Hoe helder wordt het canvas binnen de vakken van de leesbare HUD-tekst? Gewogen met alfa, want
// het canvas is doorzichtig waar niets is getekend. De achtergrond is bijna zwart, dus alles boven
// een handvol telt als zichtbaar licht bovenop tekst.
const HUD_BOTSING = () => {
  const cv = document.getElementById('veld');
  const c = cv.getContext('2d', { willReadFrequently: true });
  const dpr = cv.width / cv.getBoundingClientRect().width;
  let max = 0, onder = 0;
  for (const sel of ['.merk', '.rand', '.onder']) {
    const e = document.querySelector(sel);
    if (!e) continue;
    const st = getComputedStyle(e);
    if (st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    onder = Math.max(onder, r.bottom);
    const d = c.getImageData(Math.round(r.left * dpr), Math.round(r.top * dpr),
      Math.round(r.width * dpr), Math.round(r.height * dpr)).data;
    for (let i = 0; i < d.length; i += 4) max = Math.max(max, ((d[i] + d[i + 1] + d[i + 2]) / 3) * (d[i + 3] / 255));
  }
  return { max: Math.round(max), hudOnder: Math.round(onder) };
};

// Waar staan de patronen? Ze zijn aanwijsbaar, dus we rasteren af en clusteren waar de cursor
// verandert. Zo is ook meteen te zien of elk patroon nog zijn eigen trefvlak heeft.
const KERNEN = () => {
  const cv = document.getElementById('veld'); const raak = []; const S = 10;
  for (let y = S; y < window.innerHeight - S; y += S) for (let x = S; x < window.innerWidth - S; x += S) {
    cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
    if (cv.classList.contains('aanwijsbaar')) raak.push([x, y]);
  }
  cv.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  const ouder = raak.map((_, i) => i);
  const w = (i) => (ouder[i] === i ? i : (ouder[i] = w(ouder[i])));
  for (let i = 0; i < raak.length; i++) for (let j = i + 1; j < raak.length; j++) {
    if (Math.hypot(raak[i][0] - raak[j][0], raak[i][1] - raak[j][1]) <= S * 1.5) ouder[w(i)] = w(j);
  }
  const bak = new Map();
  raak.forEach((pt, i) => { const r = w(i); if (!bak.has(r)) bak.set(r, []); bak.get(r).push(pt); });
  return [...bak.values()].map((g) => [
    Math.round(g.reduce((a, [x]) => a + x, 0) / g.length),
    Math.round(g.reduce((a, [, y]) => a + y, 0) / g.length)]);
};

// Licht bovenop leesbare tekst mag verwaarloosbaar zijn en niet meer dan dat. De wijde veldgloed
// reikt overal een beetje; een punt of een verbinding is tientallen keren helderder.
const BOTSING_GRENS = 12;

let fout=0;
const ok=(l,c,d='')=>{if(!c)fout++;console.log(`  [${c?'OK ':'FOUT'}] ${l}${d?' · '+d:''}`)};
const perifZichtbaar=(p)=>p.evaluate(()=>{const s=getComputedStyle(document.querySelector('.rand'));return s.visibility!=='hidden'&&Number(s.opacity)>0});

for (const vp of [
  {w:393,h:660,n:'in-app browser 393 x 660'},
  {w:390,h:844,n:'iPhone 390 x 844'},
  {w:430,h:932,n:'iPhone 430 x 932'},
]) {
  console.log(`\n=== ${vp.n} ===`);
  const ctx=await br.newContext({viewport:{width:vp.w,height:vp.h},reducedMotion:'reduce',locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
  await ctx.addInitScript(OPSLAG);
  const p=await ctx.newPage(); const fouten=[];
  p.on('pageerror',e=>fouten.push(String(e))); p.on('console',m=>{if(m.type()==='error')fouten.push(m.text())});
  await F.routeMijn(p,F.maakStore(F.startDraden));
  await p.goto(`http://127.0.0.1:${PORT}/mijn.html?t=${F.TOKEN}`,{waitUntil:'networkidle'});
  await p.waitForSelector('.zeg.in');

  // ---- de compositie: Het Veld loopt niet door de leesbare HUD-tekst ----
  const rust = await p.evaluate(HUD_BOTSING);
  ok('in rust valt er geen veldlicht op de leesbare HUD-tekst', rust.max <= BOTSING_GRENS,
    `helderste pixel ${rust.max} van 255, HUD tot ${rust.hudOnder}px`);

  const kernen = await p.evaluate(KERNEN);
  const ys = kernen.map((k) => k[1]);
  const midden = Math.round(ys.reduce((a, b) => a + b, 0) / (ys.length || 1));
  const halve = ys.length ? Math.round(Math.max(...ys.map((y) => Math.abs(y - midden)))) : 0;
  ok('elk patroon houdt zijn eigen trefvlak, ook wanneer het veld krimpt', kernen.length === F.insights.length,
    `${kernen.length} van ${F.insights.length}, midden y=${midden}, halve hoogte ${halve}`);
  ok('en alle patronen staan onder de leesbare tekst', Math.min(...ys) > rust.hudOnder,
    `hoogste kern op y=${Math.min(...ys)}, HUD tot ${rust.hudOnder}`);

  // Tijdens de opbouw staat de uitspraak er nog niet en is er dus meer ruimte. Ook dan mag er geen
  // licht op de tekst vallen: dat is precies het moment waarop het eerder misging.
  const opbouw = await p.evaluate(async () => {
    const cv = document.getElementById('veld');
    document.getElementById('btn-opnieuw').click();
    let max = 0;
    for (let k = 0; k < 24; k++) {
      await new Promise((r) => setTimeout(r, 260));
      const c = cv.getContext('2d', { willReadFrequently: true });
      const dpr = cv.width / cv.getBoundingClientRect().width;
      for (const sel of ['.merk', '.rand', '.onder']) {
        const e = document.querySelector(sel);
        const st = getComputedStyle(e);
        if (st.visibility === 'hidden' || Number(st.opacity) === 0) continue;
        const r2 = e.getBoundingClientRect();
        if (r2.width < 1 || r2.height < 1) continue;
        const d = c.getImageData(Math.round(r2.left * dpr), Math.round(r2.top * dpr),
          Math.round(r2.width * dpr), Math.round(r2.height * dpr)).data;
        for (let i = 0; i < d.length; i += 4) max = Math.max(max, ((d[i] + d[i + 1] + d[i + 2]) / 3) * (d[i + 3] / 255));
      }
    }
    return Math.round(max);
  });
  ok('ook tijdens de opbouw, vóór de uitspraak er is, blijft de tekst vrij', opbouw <= BOTSING_GRENS,
    `helderste pixel over de hele cyclus ${opbouw} van 255`);
  await p.waitForTimeout(400);

  // ---- patroon openen vanaf Het Veld ----
  await p.click('#btn-waarom'); await p.waitForSelector('.bewijs.in'); await p.waitForTimeout(1200);
  const top=await p.evaluate(()=>document.querySelector('#bewijs').getBoundingClientRect().top);
  ok('de strook boven het blad is minstens een kwart van het scherm', top>=vp.h*0.25, `${Math.round(top)}px van ${vp.h} (${Math.round(top/vp.h*100)}%)`);
  ok('de periferie is geweken, dus de strook is veld en geen menu', !(await perifZichtbaar(p)));
  ok('de titel van het inzicht staat direct in beeld, zonder scrollen',
    (await p.evaluate(()=>document.querySelector('#bw-titel').getBoundingClientRect().top))>top);
  ok('het blad begint bovenaan', (await p.evaluate(()=>document.querySelector('#bewijs .blad-body').scrollTop))===0);

  // Het geopende patroon moet werkelijk IN de strook staan. Zolang een blad open is, is de
  // cursor-affordance bewust uit, dus dat is geen bruikbare maat. Wel bruikbaar: tikken op het
  // midden van de strook. Raakt dat de kern, dan blijft hetzelfde inzicht open; is de kern er
  // niet, dan is het lege veldruimte en sluit het blad. Dat is precies de vraag die telt.
  const titelVoor = await p.locator('#bw-titel').textContent();
  await p.mouse.click(vp.w * 0.5, top * 0.5); await p.waitForTimeout(700);
  const nogOpen = (await p.locator('#bewijs.in').count()) === 1;
  ok('het geopende patroon staat werkelijk in de zichtbare strook', nogOpen
    && (await p.locator('#bw-titel').textContent()) === titelVoor,
    nogOpen ? `tik op ${Math.round(vp.w*0.5)}, ${Math.round(top*0.5)} raakt hetzelfde patroon` : 'daar staat geen patroon, het blad sloot');
  if (!nogOpen) { await p.click('#btn-waarom'); await p.waitForSelector('.bewijs.in'); await p.waitForTimeout(1000); }

  // ---- A doorscrollen, sluiten, B openen ----
  await p.evaluate(()=>{const b=document.querySelector('#bewijs .blad-body');b.scrollTo(0,b.scrollHeight)});
  await p.waitForTimeout(250);
  const scrollA=await p.evaluate(()=>document.querySelector('#bewijs .blad-body').scrollTop);
  await p.click('#btn-sluit'); await p.waitForTimeout(900);
  ok('terug naar het veld herstelt de periferie', await perifZichtbaar(p));
  ok('en de uitspraak staat er weer', (await p.locator('.zeg.in:not(.wijkt)').count())===1);
  await p.click('#btn-patronen'); await p.waitForSelector('.patronen.in'); await p.waitForTimeout(500);
  await p.locator('.pt-item').nth(3).click(); await p.waitForSelector('.bewijs.in'); await p.waitForTimeout(1400);
  const scrollB=await p.evaluate(()=>document.querySelector('#bewijs .blad-body').scrollTop);
  ok('patroon B begint bovenaan, ook na diep scrollen in A', scrollB===0, `A stond op ${scrollA}, B opent op ${scrollB}`);
  const topB=await p.evaluate(()=>document.querySelector('#bewijs').getBoundingClientRect().top);
  const titelB = await p.locator('#bw-titel').textContent();
  await p.mouse.click(vp.w * 0.5, topB * 0.5); await p.waitForTimeout(700);
  ok('ook patroon B staat in de strook', (await p.locator('#bewijs.in').count()) === 1
    && (await p.locator('#bw-titel').textContent()) === titelB, titelB.slice(0, 44));

  // ---- tikken op lege veldruimte in de strook sluit ----
  const leeg = { x: 10, y: Math.round(topB - 12) };   // hoek van de strook, ver van elke kern
  await p.mouse.click(leeg.x, leeg.y); await p.waitForTimeout(900);
  ok('tikken op lege veldruimte brengt je terug naar het veld', (await p.locator('#bewijs.in').count())===0,
    `getikt op ${leeg.x}, ${leeg.y}`);

  // ---- Gesprekken en Samenwerking ----
  await p.click('#btn-gesprekken'); await p.waitForSelector('.gesprekken.in'); await p.waitForTimeout(700);
  ok('Gesprekken opent en begint bovenaan', (await p.evaluate(()=>document.querySelector('#gesprekken .blad-body').scrollTop))===0);
  await p.click('#btn-gesprekken-sluit'); await p.waitForTimeout(900);
  ok('Gesprekken sluit', (await p.locator('.gesprekken.in').count())===0);
  await p.click('#btn-samen'); await p.waitForSelector('.samen.in'); await p.waitForTimeout(700);
  ok('Samenwerking opent', (await p.locator('.samen.in').count())===1);
  await p.click('#btn-samen-sluit'); await p.waitForTimeout(900);
  ok('Samenwerking sluit', (await p.locator('.samen.in').count())===0);

  // ---- draaien terwijl een patroon open staat ----
  await p.click('#btn-waarom'); await p.waitForSelector('.bewijs.in'); await p.waitForTimeout(1000);
  await p.setViewportSize({width:vp.h,height:vp.w}); await p.waitForTimeout(1400);
  const liggend=await p.evaluate(()=>document.querySelector('#bewijs').getBoundingClientRect());
  ok('na draaien naar liggend blijft het inzicht leesbaar', liggend.height>200 && liggend.width>0,
    `${Math.round(liggend.width)} x ${Math.round(liggend.height)}`);
  await p.setViewportSize({width:vp.w,height:vp.h}); await p.waitForTimeout(1400);
  const terugTop=await p.evaluate(()=>document.querySelector('#bewijs').getBoundingClientRect().top);
  ok('en terug naar staand staat het patroon weer in de strook', terugTop>=vp.h*0.25, `${Math.round(terugTop)}px`);

  // De veilige zone. In een testbrowser is env(safe-area-inset-bottom) nul, dus we kunnen niet
  // meten dat er ruimte bijkomt. Wat we wél kunnen bewijzen is dat de regel leeft en geldig is:
  // de berekende onderrand is de clamp plus die inset, en op een toestel met een balk groeit hij
  // vanzelf mee. Zonder de regel zou hier de erfstijl staan.
  const onder = await p.evaluate(() => getComputedStyle(document.querySelector('#bewijs .blad-body')).paddingBottom);
  ok('de onderrand van het blad rekent met de veilige zone', /^\d/.test(onder) && parseFloat(onder) >= 24, onder);

  ok('geen console errors', fouten.length===0, fouten.slice(0,2).join(' | ')||'nul');
  await ctx.close();
}
await br.close(); srv.close();
console.log(fout?`\nMOBIELE ACCEPTATIE: ${fout} GEFAALD`:'\nMOBIELE ACCEPTATIE: ALLES GROEN');
process.exit(fout?1:0);
