import { chromium } from 'playwright';
import http from 'node:http'; import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import * as F from './fixtures.mjs';
const PUBLIC='/home/user/website/public';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml'};
const srv=http.createServer(async(q,r)=>{try{const b=await readFile(join(PUBLIC,decodeURIComponent(new URL(q.url,'http://x').pathname)));r.writeHead(200,{'content-type':MIME[extname(q.url.split('?')[0])]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}});
await new Promise(r=>srv.listen(4403,'127.0.0.1',r));
const br=await chromium.launch();
const ctx=await br.newContext({viewport:{width:1280,height:800},locale:'nl-NL',timezoneId:'Europe/Amsterdam'});
const p=await ctx.newPage();
await p.route('**/api/**',async r=>{const u=new URL(r.request().url()).pathname;const j=b=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(b)});
  if(u==='/api/comm/status')return j(F.status); if(u==='/api/comm/relationship')return j(F.relationship);
  if(/\/ai\/suggest$/.test(u))return j(F.suggestions); if(/\/draft$/.test(u))return j(F.draft);
  if(/^\/api\/comm\/conversations\/[^/]+$/.test(u))return j(F.conversation); return j({});});
await p.goto(`http://127.0.0.1:4403/workspace.html?contact=${F.CONTACT_ID}`,{waitUntil:'networkidle'});
await p.waitForTimeout(400);
console.log('Echte toetsenbordnavigatie: Tab door het scherm, meet de ring per stop.\n');
const seen=new Set(); let missing=[], n=0;
for (let i=0;i<40;i++){
  await p.keyboard.press('Tab');
  const info=await p.evaluate(()=>{
    const e=document.activeElement;
    if(!e||e===document.body) return null;
    const s=getComputedStyle(e);
    return {id:e.tagName+'.'+(String(e.className||'').split(' ')[0]||'-'),
            txt:(e.textContent||e.placeholder||'').trim().slice(0,24),
            ring:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,
            colour:s.outlineColor, width:s.outlineWidth};
  });
  if(!info) break;
  const key=info.id+'|'+info.txt;
  if(seen.has(key)) continue;
  seen.add(key); n++;
  if(!info.ring) missing.push(key);
  else if(n<=6) console.log(`  ${info.id.padEnd(22)} ring ${info.width} ${info.colour}`);
}
console.log(`\n  ${n} focusstops bereikt, ${missing.length} zonder ring`);
if(missing.length) console.log('  ontbreekt: '+missing.join(', '));
await br.close(); srv.close();
process.exit(missing.length?1:0);
