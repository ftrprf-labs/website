// Verificatie van de bewaarvraag na de SILENCE-keten. Laadt de ECHTE pagina en roept
// gotoBewaren() aan met drie toestanden: reveal, gegronde SILENCE, kale SILENCE.
import { chromium } from 'playwright';

const BASE = process.env.LENS || 'http://127.0.0.1:4599';
let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`  FAIL ${n} ${extra}`); } };

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => { fail++; console.log('  PAGE ERROR ' + e.message); });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.gotoBewaren === 'function' || typeof gotoBewaren === 'function').catch(() => {});

async function scenario(naam, setup) {
  const r = await page.evaluate((s) => {
    const gezien = [];
    const echteEv = window.ev;
    window.ev = function (naam, data) { gezien.push(naam); return echteEv && echteEv.apply(this, arguments); };
    // eslint-disable-next-line no-eval
    eval(s);
    gotoBewaren();
    window.ev = echteEv;
    return { events: gezien, html: document.getElementById('acc-beat') ? document.getElementById('acc-beat').innerHTML : (document.querySelector('.beat.bewaar, #account .beat') || {}).innerHTML || '' };
  }, setup);
  console.log(`\n${naam}`);
  return r;
}

// 1. REVEAL: de vraag hoorde er altijd al te zijn en mag niet veranderen.
let r = await scenario('REVEAL', `
  currentOutcome = { outcome:'REVEAL', line:'Je zegt dat je meedenkt, maar je toont alleen wat je levert.' };
  session.shown = { outcome:'REVEAL', reveal_line: currentOutcome.line, evidence: [] };
  measure = {recognition:'ja', accuracy:null, novelty:null, recognition_context:null, accuracy_context:null};
`);
ok('reveal stelt de bewaarvraag', r.events.includes('account_handoff_seen'), JSON.stringify(r.events));
ok('reveal sluit niet af met goodbye', !r.events.includes('goodbye_shown'), JSON.stringify(r.events));
ok('reveal toont de uitspraak woordelijk', r.html.includes('maar je toont alleen wat je levert'));

// 2. SILENCE MET GROND: dit is de breuk die we repareren.
r = await scenario('SILENCE met gegronde observaties', `
  currentOutcome = { outcome:'SILENCE', line:null, observations:[{note:'x'}] };
  session.shown = { outcome:'SILENCE', pages_seen:6, observations:[
    { subject:'tarieven', note:'Je noemt nergens wat het kost.', meaning:'m', lens:'l', basis:'inferred',
      evidence:[{ surface:'homepage', url:'https://x.nl/', quote:'Neem contact op voor een offerte' }] },
    { subject:'team', note:'Je team staat er zonder gezicht bij.', meaning:'m', lens:'l', basis:'inferred',
      evidence:[{ surface:'over ons', url:'https://x.nl/over', quote:'Ons team staat voor je klaar' }] },
  ]};
  measure = {recognition:'deels', accuracy:null, novelty:null, recognition_context:null, accuracy_context:null};
`);
ok('gegronde SILENCE stelt de bewaarvraag', r.events.includes('account_handoff_seen'), JSON.stringify(r.events));
ok('gegronde SILENCE sluit niet stil af', !r.events.includes('goodbye_shown'), JSON.stringify(r.events));
ok('de vraag toont de eerste waarneming', r.html.includes('Je noemt nergens wat het kost.'));
ok('de vraag toont de tweede waarneming', r.html.includes('Je team staat er zonder gezicht bij.'));
ok('de vraag doet geen uitspraak-claim', !r.html.includes('reveal'));

// 3. SILENCE ZONDER GROND: moet blijven weigeren.
r = await scenario('SILENCE zonder grond', `
  currentOutcome = { outcome:'SILENCE', line:null };
  session.shown = { outcome:'SILENCE', pages_seen:4, observations:[
    { subject:'x', note:'Een mening zonder citaat.', meaning:'m', lens:'l', basis:'inferred', evidence:[] },
  ]};
  measure = {recognition:null, accuracy:null, novelty:null, recognition_context:null, accuracy_context:null};
`);
ok('SILENCE zonder grond stelt de vraag NIET', !r.events.includes('account_handoff_seen'), JSON.stringify(r.events));
ok('SILENCE zonder grond sluit eerlijk af', r.events.includes('goodbye_shown'), JSON.stringify(r.events));

// 4. Helemaal niets.
r = await scenario('geen observaties', `
  currentOutcome = { outcome:'SILENCE', line:null };
  session.shown = { outcome:'SILENCE', pages_seen:2, observations:[] };
  measure = {recognition:null, accuracy:null, novelty:null, recognition_context:null, accuracy_context:null};
`);
ok('lege SILENCE stelt de vraag NIET', !r.events.includes('account_handoff_seen'), JSON.stringify(r.events));
ok('lege SILENCE sluit eerlijk af', r.events.includes('goodbye_shown'), JSON.stringify(r.events));

await browser.close();
console.log(`\n${fail === 0 ? 'GROEN' : 'ROOD'}: ${pass} geslaagd, ${fail} mislukt`);
process.exit(fail === 0 ? 0 : 1);
