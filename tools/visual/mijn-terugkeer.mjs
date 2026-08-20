// Wat ziet iemand die morgen terugkomt?
//
//   node tools/visual/mijn-terugkeer.mjs
//
// Drie dingen moeten dan zichtbaar zijn, en het derde alleen als het waar is:
//   1. dit zagen wij eerder;
//   2. dit voegde jij toe;
//   3. dit is veranderd.
//
// Ook het geval dat je niet met een unit test vindt: de uitnodiging komt per e-mail binnen, dus
// openen op de telefoon en terugkomen op de laptop is niet het randgeval maar het normale geval.

import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const PUBLIC='/home/user/website/public', PORT=4421;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.gif':'image/gif','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname);const f=join(PUBLIC,rel);if(!f.startsWith(PUBLIC)){res.writeHead(403);return res.end();}try{const b=await readFile(f);res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(PORT,r));
const ZIN='De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.';
const ID='00000001-0000-4000-8000-000000000001';
const EIGEN='Bij ons speelt vooral dat we het mondeling wel vertellen.';
const GROND=['Over ons: "twintig jaar ervaring in complexe trajecten"','Homepage: "wij denken graag mee"','Contact: "neem contact op"'];
const insight={id:ID,title:ZIN,stance:'reveal',sharing:'SHARED',attention:true,status:'new',observation:ZIN,meaning:null,basis:null,not_yet_known:'We hebben hier alleen van buitenaf gekeken. Wat we nog niet weten, is hoe dit van binnenuit wordt ervaren.',audience:'ORGANISATIE',source:'lens',area:'zichtbaarheid',perspective:'buitenwereld',created_at:'2026-08-19T09:00:00.000Z',updated_at:'2026-08-19T09:00:00.000Z',shared_at:'2026-08-19T09:00:00.000Z',developed:false,unshared_development:false,evidence_count:3,recognition:'deels',recognition_note:EIGEN,intent:'samen'};
const routes=async r=>{const p=new URL(r.request().url()).pathname;const j=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
 if(p==='/api/mijn/session')return j({organization:'OCEA',user:{label:'Ludwig Vermeulen',role:'Klantadmin'}});
 if(p==='/api/mijn/overview')return j({attention:{id:ID},counts:{}});
 if(p==='/api/mijn/insights')return j({insights:[insight]});
 if(p==='/api/mijn/collaboration')return j({items:[]});
 if(p==='/api/mijn/conversations')return j({items:[],unread:0});
 if(p===`/api/mijn/insights/${ID}`)return j({insight,evidence:GROND.map(l=>({label:l,at:'2026-08-19T09:00:00.000Z'})),versions:[],conversation:null,
   stemmen:[{origin:'lens',answer:'deels',note:null,at:'2026-08-19T09:00:00.000Z'},
            {origin:'mijn',answer:'deels',note:EIGEN,at:'2026-08-19T15:00:00.000Z'}]});
 return j({});};
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:430,height:932},locale:'nl-NL',timezoneId:'Europe/Amsterdam',reducedMotion:'reduce'});
const page=await ctx.newPage(); await page.route('**/api/mijn/**',routes);
await page.goto(`http://127.0.0.1:${PORT}/mijn.html?t=terugkeer-token`); await page.waitForTimeout(2200);
const stappen=[];
const stap=(ok,t,x='')=>{stappen.push(ok);console.log(`  [${ok?'OK ':'FOUT'}] ${t}${x?' · '+x:''}`);};

const een=(await page.evaluate(()=>document.body.innerText)).trim();
stap(een.includes(ZIN),'bezoek 1: de uitspraak staat er');
stap(!/sinds je vorige bezoek/i.test(een),'en er wordt geen vorig bezoek verzonnen');

await page.reload(); await page.waitForTimeout(2200);
const twee=(await page.evaluate(()=>document.body.innerText)).trim();
stap(twee.includes(ZIN),'1. dit zagen wij eerder: de uitspraak staat er onveranderd');
stap(/sinds je vorige bezoek is er niets bijgekomen/i.test(twee),
  '3. dit is veranderd: er wordt niets verzonnen wanneer er niets gebeurd is');
stap(!/te weinig bewijs/i.test(twee),'en de kamer haalt zijn eigen uitspraak niet onderuit');

// 2. dit voegde jij toe. Op het scherm waar hij LANDT, niet pas na zoeken: wat van hem is, hoort
// niet weggestopt te zijn achter een tik.
stap(/jij herkende dit deels/i.test(twee),
  '2. dit voegde jij toe: zijn eigen bijdrage staat op het landingsscherm');

// het blad zelf: beide stemmen, met hun eigen moment
const punt=await page.evaluate(()=>{const c=document.getElementById('veld');const r=c.getBoundingClientRect();const ctx3=c.getContext('2d');const im=ctx3.getImageData(0,0,c.width,c.height).data;let b=-1,bx=0,by=0;const sc=c.width/r.width;for(let y=0;y<c.height;y+=4)for(let x=0;x<c.width;x+=4){const i=(y*c.width+x)*4;const l=im[i]+im[i+1]+im[i+2];if(l>b){b=l;bx=x;by=y;}}return [r.left+bx/sc,r.top+by/sc];});
await page.mouse.click(punt[0],punt[1]);
await page.waitForTimeout(700);
const blad=await page.evaluate(()=>document.getElementById('bewijs').innerText);
stap(/dit zagen wij/i.test(blad),'in het blad: dit zagen wij');
stap(/dit voeg jij toe/i.test(blad),'en dit voeg jij toe');
stap(blad.includes(EIGEN),'met zijn eigen woorden, woordelijk');

// ander apparaat
const ctx2=await browser.newContext({viewport:{width:430,height:932},locale:'nl-NL',reducedMotion:'reduce'});
const p2=await ctx2.newPage(); await p2.route('**/api/mijn/**',routes);
await p2.goto(`http://127.0.0.1:${PORT}/mijn.html?t=terugkeer-token`); await p2.waitForTimeout(2200);
const ander=(await p2.evaluate(()=>document.body.innerText)).trim();
stap(ander.includes(ZIN),'op een ander apparaat staat dezelfde werkelijkheid er');
stap(!/sinds je vorige bezoek/i.test(ander),
  'en er wordt geen vorig bezoek beweerd dat dit apparaat niet kan weten');

await browser.close(); server.close();
const rood=stappen.filter(s=>!s).length;
console.log(`\n${rood?'ROOD: '+rood+' van '+stappen.length:'TERUGKEER: ALLES GROEN'}\n`);
process.exit(rood?1:0);
