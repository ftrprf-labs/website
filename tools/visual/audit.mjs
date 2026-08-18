// Toegankelijkheids-, overflow-, console- en reduced-motion-audit per oppervlak.
// Focus wordt met ECHTE Tab-navigatie gemeten: el.focus() triggert :focus-visible niet
// voor knoppen en links, en gaf in de eerste pilot vier valse fouten.
//
//   node tools/visual/audit.mjs [oppervlak ...]
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import * as F from './fixtures.mjs';
const PUBLIC='/home/user/website/public';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'};
const srv=http.createServer(async(q,r)=>{try{const b=await readFile(join(PUBLIC,decodeURIComponent(new URL(q.url,'http://x').pathname)));r.writeHead(200,{'content-type':MIME[extname(q.url.split('?')[0])]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(4404,'127.0.0.1',r));
const lum=(s)=>{const c=s.match(/[\d.]+/g).slice(0,3).map(x=>x/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};
const CR=(a,b)=>{const[x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05)};
let fails=0;
const chk=(l,c,d='')=>{if(!c)fails++;console.log(`  [${c?'OK ':'FOUT'}] ${l}${d?' · '+d:''}`)};
const route=(p)=>p.route('**/api/**',async r=>{const u=new URL(r.request().url()).pathname;const j=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
  if(u==='/api/config')return j(F.config); if(u==='/api/invitations')return j(F.invitations);
  if(u==='/api/comm/attention')return j(F.attention); if(u==='/api/template')return j(F.template);
  if(u==='/api/evaluations')return j(F.evaluations); if(u==='/api/comm/inbox')return j(F.inbox);
  if(u==='/api/comm/status')return j(F.status); if(u==='/api/comm/relationship')return j(F.relationship);
  if(/\/ai\/suggest$/.test(u))return j(F.suggestions); if(/\/draft$/.test(u))return j(F.draft);
  if(/^\/api\/comm\/conversations\/[^/]+$/.test(u))return j(F.conversation); return j({});});

const SURFACES={
  workspace:{url:`/workspace.html?contact=${F.CONTACT_ID}`,tabs:['overzicht','journey','inzichten','communicatie','activiteit']},
  comm:{url:'/comm.html',tabs:[]},
  testerbeheer:{url:'/index.html',tabs:[]},
};
const want=process.argv.slice(2).length?process.argv.slice(2):Object.keys(SURFACES);
const br=await chromium.launch();

for(const name of want){
  const S=SURFACES[name];
  console.log(`\n=== ${name} ===`);
  for(const vp of [{n:'desktop 1280',w:1280,h:800},{n:'mobiel 390',w:390,h:844}]){
    const ctx=await br.newContext({viewport:{width:vp.w,height:vp.h},locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
    const p=await ctx.newPage(); const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    p.on('pageerror',e=>errs.push(String(e)));
    p.on('requestfailed',r=>errs.push('request failed: '+r.url()));
    await route(p);
    await p.goto('http://127.0.0.1:4404'+S.url,{waitUntil:'networkidle'});
    await p.waitForTimeout(450);
    console.log(`  -- ${vp.n}`);
    chk('regime is worklight', await p.getAttribute('html','data-maculis-regime')==='worklight');
    const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    chk('grond is ink.950', bg==='rgb(8, 5, 3)', bg);
    // overflow over alle tabs
    for(const t of (S.tabs.length?S.tabs:[null])){
      if(t){const b=p.locator(`nav.tabs button[data-tab="${t}"]`); if(await b.count()){await b.click();await p.waitForTimeout(280);}}
      const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      chk(`geen horizontale overflow${t?' · '+t:''}`, ov<=0, ov+'px');
    }
    // echte Tab-navigatie
    // Begin bij een bekend punt, anders kan de eerste Tab buiten de pagina landen.
    await p.evaluate(()=>{document.body.setAttribute('tabindex','-1');document.body.focus();});
    let stops=0,missing=[];const seen=new Set();
    for(let i=0;i<60;i++){
      await p.keyboard.press('Tab');
      const info=await p.evaluate(()=>{const e=document.activeElement;if(!e||e===document.body)return null;
        const s=getComputedStyle(e);return{k:e.tagName+'.'+(String(e.className||'').split(' ')[0]||'-'),
        ring:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0};});
      if(!info)break; if(seen.has(info.k+i))continue; seen.add(info.k+i); stops++;
      if(!info.ring)missing.push(info.k);
    }
    chk(`elke Tab-stop heeft een focusring (${stops} stops)`, stops>0 && missing.length===0, stops===0?'GEEN stops bereikt, check ongeldig':([...new Set(missing)].join(', ')||'alle'));
    // semantische pillen halen AA
    const pills=await p.evaluate(()=>[...document.querySelectorAll('.att')].map(e=>{
      let n=e.parentElement,bg='rgba(0, 0, 0, 0)';
      while(n&&(bg==='rgba(0, 0, 0, 0)'||bg==='transparent')){bg=getComputedStyle(n).backgroundColor;n=n.parentElement;}
      return {t:e.textContent.trim(),fg:getComputedStyle(e).color,bg};}));
    const bad=pills.filter(q=>CR(q.fg,q.bg)<4.5).map(q=>`${q.t} ${CR(q.fg,q.bg).toFixed(2)}`);
    chk(`alle ${pills.length} statuspillen halen AA`, bad.length===0, bad.join(', ')||'laagste ok');
    chk('geen console errors', errs.length===0, errs.slice(0,2).join(' | ')||'nul');
    await ctx.close();
  }
  // reduced motion
  const ctx=await br.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
  const p=await ctx.newPage(); await route(p);
  await p.goto('http://127.0.0.1:4404'+S.url,{waitUntil:'networkidle'}); await p.waitForTimeout(350);
  const anim=await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);
  chk('reduce: geen lopende animatie', anim===0, anim+' actief');
  const hidden=await p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.offsetParent!==null&&parseFloat(getComputedStyle(e).opacity)===0).length);
  chk('reduce: niets onzichtbaar door een niet-gestarte animatie', hidden===0, hidden+' op opacity 0');
  await ctx.close();
}
await br.close(); srv.close();
console.log(fails?`\nAUDIT: ${fails} GEFAALD`:'\nAUDIT: ALLES GROEN');
process.exit(fails?1:0);
