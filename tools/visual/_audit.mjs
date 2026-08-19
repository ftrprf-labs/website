import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import * as F from './fixtures.mjs';
const PUBLIC='/home/user/website/public';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'};
const srv=http.createServer(async(q,r)=>{try{const b=await readFile(join(PUBLIC,decodeURIComponent(new URL(q.url,'http://x').pathname)));r.writeHead(200,{'content-type':MIME[extname(q.url.split('?')[0])]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(4402,'127.0.0.1',r));
const br=await chromium.launch();
const lum=(s)=>{const c=s.match(/\d+/g).slice(0,3).map(x=>x/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};
const CR=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
let fails=0;
const chk=(l,c,d='')=>{if(!c)fails++;console.log(`  [${c?'OK ':'FOUT'}] ${l}${d?' · '+d:''}`)};
const TABS=['overzicht','journey','inzichten','communicatie','activiteit'];

for (const vp of [{n:'desktop 1280x800',w:1280,h:800},{n:'mobiel 390x844',w:390,h:844}]) {
  console.log(`\n### ${vp.n}`);
  const ctx=await br.newContext({viewport:{width:vp.w,height:vp.h},locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
  const p=await ctx.newPage();
  const errs=[];
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('requestfailed',r=>errs.push('request failed: '+r.url()));
  await p.route('**/api/**',async r=>{const u=new URL(r.request().url()).pathname;const j=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
    if(u==='/api/comm/status')return j(F.status); if(u==='/api/comm/relationship')return j(F.relationship);
    if(/\/ai\/suggest$/.test(u))return j(F.suggestions); if(/\/draft$/.test(u))return j(F.draft);
    if(/^\/api\/comm\/conversations\/[^/]+$/.test(u))return j(F.conversation); return j({});});
  await p.goto(`http://127.0.0.1:4402/workspace.html?contact=${F.CONTACT_ID}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(400);

  chk('regime is worklight', await p.getAttribute('html','data-maculis-regime')==='worklight');
  const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  chk('grond is ink.950 #080503', bg==='rgb(8, 5, 3)', bg);
  const ff=await p.evaluate(()=>getComputedStyle(document.querySelector('.org')).fontFamily);
  chk('Newsreader op de kamerkop', ff.includes('Newsreader'), ff.split(',')[0]);
  const fw=await p.evaluate(()=>getComputedStyle(document.querySelector('.person .name')).fontWeight);
  chk('contactnaam sans regular', fw==='400', fw);

  // functionaliteit: elke tab rendert en vult
  for(const t of TABS){
    const b=p.locator(`nav.tabs button[data-tab="${t}"]`);
    await b.click(); await p.waitForTimeout(300);
    const filled=await p.evaluate((t)=>{const v=document.querySelector('#v-'+t);return v&&v.classList.contains('on')&&v.textContent.trim().length>20;},t);
    chk(`tab "${t}" rendert met inhoud`, filled);
    const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    chk(`geen horizontale overflow op "${t}"`, ov<=0, ov+'px');
  }

  // interactie: gesprek openen + kanaal wisselen
  await p.locator('nav.tabs button[data-tab="communicatie"]').click(); await p.waitForTimeout(300);
  await p.locator('.comm .conv').first().click(); await p.waitForTimeout(400);
  chk('gesprek opent met berichten', await p.locator('.msgs .m').count()>=2);
  chk('composer geladen', await p.locator('#body').count()===1);
  chk('AI-paneel aanwezig', await p.locator('.aipanel').count()===1);
  const chans=await p.locator('.chan').allTextContents();
  chk('kanaallabels Nederlands', chans.join('|')==='E-mail|WhatsApp|Sms', chans.join('|'));

  // toegankelijkheid: focusring op elk focusbaar element
  const noRing=await p.evaluate(()=>{
    const sel='button, a[href], textarea, input, [tabindex]';
    const out=[];
    for(const el of document.querySelectorAll(sel)){
      if(el.offsetParent===null) continue;
      el.focus();
      const s=getComputedStyle(el);
      const ring=(s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0);
      if(!ring) out.push(el.tagName+'.'+(el.className||'').toString().split(' ')[0]);
    }
    return [...new Set(out)];
  });
  chk('elk zichtbaar focusbaar element heeft een ring', noRing.length===0, noRing.join(', ')||'alle');

  // contrast van de semantische pillen op hun ondergrond
  await p.locator('nav.tabs button[data-tab="inzichten"]').click(); await p.waitForTimeout(300);
  const pills=await p.evaluate(()=>[...document.querySelectorAll('.att')].map(e=>{
    let n=e.parentElement,bg='rgba(0, 0, 0, 0)';
    while(n&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(n).backgroundColor;n=n.parentElement;}
    return {t:e.textContent.trim(),fg:getComputedStyle(e).color,bd:getComputedStyle(e).borderTopColor,bg};
  }));
  for(const q of pills){
    const r=CR(q.fg,q.bg);
    chk(`pil "${q.t}" contrast AA`, r>=4.5, r.toFixed(2)+':1');
  }
  chk('geen console errors', errs.length===0, errs.slice(0,2).join(' | ')||'nul');
  await ctx.close();
}

// reduced motion: eindtoestand zichtbaar, geen lopende animatie
const ctx=await br.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
const p=await ctx.newPage();
await p.route('**/api/**',async r=>{const u=new URL(r.request().url()).pathname;const j=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
  if(u==='/api/comm/status')return j(F.status); if(u==='/api/comm/relationship')return j(F.relationship); return j({});});
await p.goto(`http://127.0.0.1:4402/workspace.html?contact=${F.CONTACT_ID}`,{waitUntil:'networkidle'});
await p.waitForTimeout(300);
console.log('\n### reduced motion');
const anim=await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);
chk('geen lopende animatie onder reduce', anim===0, anim+' actief');
const hidden=await p.evaluate(()=>[...document.querySelectorAll('.rail *, .view.on *')].filter(e=>e.offsetParent!==null&&parseFloat(getComputedStyle(e).opacity)===0).length);
chk('niets onzichtbaar door een niet-gestarte animatie', hidden===0, hidden+' op opacity 0');
const tr=await p.evaluate(()=>getComputedStyle(document.querySelector('#toast')).transitionDuration);
chk('toast-transitie uit onder reduce', tr==='0s', tr);
await ctx.close();
await br.close(); srv.close();
console.log(fails? `\nAUDIT: ${fails} GEFAALD` : '\nAUDIT: ALLES GROEN');
process.exit(fails?1:0);
