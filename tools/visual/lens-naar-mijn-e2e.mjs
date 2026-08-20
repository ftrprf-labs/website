// Echte end to end door de hele keten, over HTTP, tegen een draaiende server.
//
//   createdb maculis_e2e && node tools/visual/lens-naar-mijn-e2e.mjs
//
// Vereist een Postgres op 127.0.0.1:55432 met een database `maculis_e2e`.
//
// Geen unit test: dit start de werkelijke server, zet een nagebootste Journey-export ernaast, en
// loopt daarna precies de weg die een ondernemer en een medewerker lopen. Wat hier groen is, is de
// keten zoals hij op de preview draait, met dezelfde routes en dezelfde poorten.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const PORT = 8099;
const JPORT = 8098;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = 'e2e-participant-token-0001';

const REVEAL = 'De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.';

// ---- 1. de nagebootste Journey: één afgeronde sessie, precies zoals de echte export hem levert --
const sessies = {
  count: 1,
  lines: [{
    received_at: new Date().toISOString(),
    participant: TOKEN,
    session_id: 'e2e-1',
    started_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date().toISOString(),
    shown: { outcome: 'REVEAL', family: 'visibility', reveal_line: REVEAL },
    inner_circle_opt_in: true,
    contact_consent_version: 'maculis-contact-v1',
    events: [
      { name: 'session_started' },
      { name: 'reveal_presented',
        family: 'visibility',
        line: REVEAL,
        evidence_count: 3,
        // De grond die de Lens hem achter "Waar zie je dat?" liet zien, woordelijk meegestuurd.
        evidence: [
          { quote: 'twintig jaar ervaring in complexe trajecten', label: 'Over ons', url: 'https://ocea-e2e.nl/over-ons' },
          { quote: 'wij denken graag mee', label: 'Homepage', url: 'https://ocea-e2e.nl/' },
          { quote: 'neem contact op', label: 'Contact', url: 'https://ocea-e2e.nl/contact' },
        ] },
      { name: 'recognition_answered', value: 'deels' },
      { name: 'accuracy_answered', value: 'ja' },
      { name: 'novelty_answered', value: 'nieuw' },
      { name: 'account_handoff_accepted', at: new Date().toISOString() },
      { name: 'inner_circle_opt_in', version: 'maculis-contact-v1' },
      { name: 'session_completed' },
    ],
  }],
};
const journey = createServer((req, res) => {
  if (req.url.startsWith('/api/session/export')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessies));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
});
await new Promise((r) => journey.listen(JPORT, '127.0.0.1', r));

// ---- 2. de echte server -------------------------------------------------------------------------
const env = {
  ...process.env,
  PORT: String(PORT),
  SESSION_SECRET: 'e2e-session-secret-0123456789abcdef',
  DATABASE_URL: 'postgresql://maculis@127.0.0.1:55432/maculis_e2e',
  COMM_LAYER_ENABLED: '1',
  DATA_DIR: '/var/tmp/e2e-data',
  MACULIS_HOST: `http://127.0.0.1:${JPORT}`,
  MACULIS_PUBLIC_URL: `http://127.0.0.1:${JPORT}`,
  MACULIS_EXPORT_KEY: 'e2e-export-key',
  MIJN_MACULIS_URL: BASE,
  MIJN_PREVIEW_SEED: '',
};
delete env.NODE_ENV;
const srv = spawn('node', ['server/index.mjs'], { env, cwd: '/home/user/website', stdio: ['ignore', 'pipe', 'pipe'] });
let bootlog = '';
srv.stdout.on('data', (b) => { bootlog += b; });
srv.stderr.on('data', (b) => { bootlog += b; });

const wacht = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  await wacht(300);
  try { const r = await fetch(`${BASE}/healthz`); if (r.ok) break; } catch { /* nog niet */ }
}

let cookie = '';
const api = async (pad, opts = {}) => {
  const r = await fetch(BASE + pad, {
    method: opts.method || 'GET',
    headers: { ...(cookie ? { cookie } : {}), ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  let body = null;
  try { body = await r.json(); } catch { /* geen json */ }
  return { status: r.status, body };
};

const stappen = [];
const stap = (ok, tekst, extra = '') => { stappen.push({ ok, tekst, extra }); console.log(`  [${ok ? 'OK ' : 'FOUT'}] ${tekst}${extra ? ' · ' + extra : ''}`); };

try {
  console.log('\nECHTE END TO END: Lens naar Mijn Maculis\n');

  // Auth staat op loopback open, dus er is geen inlogstap nodig. Wachten tot de migraties klaar zijn.
  for (let i = 0; i < 80; i++) { const s = await api('/api/comm/status'); if (s.status === 200) break; await wacht(400); }
  stap((await api('/api/comm/status')).status === 200, 'de communicatielaag is klaar');

  // ---- de tester bestaat, is uitgenodigd, en heeft het token van de Lens ------------------------
  const maak = await api('/api/invitations', {
    method: 'POST',
    body: { first_name: 'Ludwig', last_name: 'Vermeulen', company_name: 'OCEA', email: 'ludwig@ocea-e2e.nl', domain: 'ocea-e2e.nl' },
  });
  stap(maak.status === 201, 'tester aangemaakt in Testerbeheer');
  const invId = maak.body && maak.body.invitation && maak.body.invitation.id;

  // Zorg dat het token van de tester hetzelfde is als dat van de nagebootste sessie, want daarop
  // wordt gejoind. In het echt komt dat token uit de persoonlijke link.
  const { execSync } = await import('node:child_process');
  execSync(`node -e "
    const f='/var/tmp/e2e-data/invitations.json';
    const fs=require('fs'); const db=JSON.parse(fs.readFileSync(f,'utf8'));
    db.invitations.forEach(i=>{ if(i.id==='${invId}'){ i.token='${TOKEN}'; i.status='SENT'; } });
    fs.writeFileSync(f, JSON.stringify(db,null,2));
  "`);
  // De server houdt de store in geheugen; herstart hem zodat hij het aangepaste token leest.
  srv.kill('SIGTERM');
  await wacht(800);
  const srv2 = spawn('node', ['server/index.mjs'], { env, cwd: '/home/user/website', stdio: ['ignore', 'pipe', 'pipe'] });
  srv2.stdout.on('data', (b) => { bootlog += b; });
  srv2.stderr.on('data', (b) => { bootlog += b; });
  for (let i = 0; i < 60; i++) { await wacht(300); try { const r = await fetch(`${BASE}/healthz`); if (r.ok) break; } catch { /* wacht */ } }
  for (let i = 0; i < 80; i++) { const s = await api('/api/comm/status'); if (s.status === 200) break; await wacht(400); }

  // ---- de sync: dit is de hele automatische voorbereiding ---------------------------------------
  let rec = null;
  for (let i = 0; i < 20; i++) {
    const lijst = await api('/api/invitations');
    rec = (lijst.body.invitations || []).find((x) => x.id === invId);
    if (rec && rec.history.some((h) => h.event === 'mijn_room_prepared')) break;
    await wacht(400);
  }
  stap(rec && rec.status === 'COMPLETED', 'de status loopt mee naar AFGEROND', rec ? rec.status : 'geen record');
  stap(rec && rec.keep_consent === true, 'de bewaartoestemming is vastgelegd');
  stap(rec && rec.consent_status === 'OPTED_IN', 'de contacttoestemming staat er los naast');
  stap(rec && rec.history.some((h) => h.event === 'mijn_room_prepared'), 'de kamer is automatisch klaargezet');

  // ---- de Cockpitregel --------------------------------------------------------------------------
  const kamers = await api('/api/comm/mijn/kamers');
  const kamer = (kamers.body.kamers || [])[0];
  stap(Boolean(kamer), 'de kamer staat in de Cockpit');
  stap(kamer && kamer.organisatie === 'OCEA', 'met de juiste organisatie', kamer ? kamer.organisatie : '');
  stap(kamer && kamer.naam === 'Ludwig Vermeulen', 'en de juiste mens');
  stap(kamer && kamer.eersteInzicht === REVEAL, 'de regel toont de zin uit de Lens, woordelijk');
  stap(kamer && kamer.inzichten === 1, 'precies één inzicht', kamer ? String(kamer.inzichten) : '');
  const geenPersoonlijk = !JSON.stringify(kamers.body).includes('deels');
  stap(geenPersoonlijk, 'het antwoord uit de Lens staat NIET in de Cockpitregel');

  // ---- de menselijke handeling ------------------------------------------------------------------
  const nodig = await api(`/api/comm/mijn/kamers/${kamer.id}/uitnodigen`, { method: 'POST', body: {} });
  stap(nodig.status === 200 && nodig.body.ok, 'de medewerker nodigt uit');
  stap(nodig.body.bezorging === 'handmatig', 'geen e-mailtransport, dus niets verstuurd en de link komt terug');
  const link = nodig.body.link || '';
  stap(link.startsWith(BASE + '/mijn.html?u='), 'de link wijst naar Mijn Maculis', link.slice(0, 40) + '…');

  // ---- de ondernemer komt binnen ----------------------------------------------------------------
  const code = new URL(link).searchParams.get('u');
  const binnen = await api('/api/mijn/toegang/uitnodiging', { method: 'POST', body: { code } });
  stap(binnen.status === 200 && binnen.body.ok && binnen.body.token, 'hij komt binnen zonder wachtwoord en zonder registratie');
  const mijn = binnen.body.token;

  const sessie = await api('/api/mijn/session', { headers: { 'x-mijn-token': mijn } });
  stap(sessie.status === 200, 'zijn sessie werkt');
  stap(sessie.body.organization === 'OCEA', 'hij ziet zijn eigen organisatie', sessie.body.organization);
  stap((sessie.body.user && sessie.body.user.label) === 'Ludwig Vermeulen', 'en zijn eigen naam');

  // ---- de eerste ster ---------------------------------------------------------------------------
  const inzichten = await api('/api/mijn/insights', { headers: { 'x-mijn-token': mijn } });
  const ins = (inzichten.body.insights || [])[0];
  stap((inzichten.body.insights || []).length === 1, 'precies één ster in het veld');
  stap(ins && ins.title === REVEAL, 'de ster toont exact wat hij in de Lens zag');
  stap(ins && ins.recognition === 'deels', 'zijn eigen antwoord uit de Lens staat er al bij');

  const detail = await api(`/api/mijn/insights/${ins.id}`, { headers: { 'x-mijn-token': mijn } });
  stap(detail.status === 200, 'het inzicht opent');
  const regels = (detail.body.evidence || []).map((e) => e.label);
  stap(regels.length === 3, 'de grond staat eronder', `${regels.length} regels`);
  stap(regels.some((r) => r.includes('twintig jaar ervaring in complexe trajecten')),
    'en het is woordelijk wat hij in de Lens zag');
  stap(!regels.some((r) => /https?:/.test(r)), 'de vindplaats blijft intern');
  stap(/van buitenaf gekeken/.test(detail.body.insight.not_yet_known || ''),
    'de verdieping staat er: wat we nog niet weten');

  // ---- hij reageert -----------------------------------------------------------------------------
  const reageer = await api(`/api/mijn/insights/${ins.id}/recognition`, {
    method: 'POST', headers: { 'x-mijn-token': mijn },
    body: { answer: 'ja', note: 'Klopt, dit zeggen klanten ook.' },
  });
  stap(reageer.status === 200, 'hij past zijn reflectie aan in de kamer');

  const naReactie = await api('/api/comm/mijn/kamers');
  stap(!JSON.stringify(naReactie.body).includes('Klopt, dit zeggen klanten ook'), 'zijn woorden komen NIET in de Cockpit');

  // ---- terugkomen -------------------------------------------------------------------------------
  const nogmaals = await api('/api/mijn/toegang/uitnodiging', { method: 'POST', body: { code } });
  stap(nogmaals.status === 400 && nogmaals.body.error === 'used', 'dezelfde uitnodiging werkt geen tweede keer');
  const tweedeBezoek = await api('/api/mijn/insights', { headers: { 'x-mijn-token': mijn } });
  const ins2 = (tweedeBezoek.body.insights || [])[0];
  stap(ins2 && ins2.id === ins.id && ins2.recognition === 'ja', 'zijn toegang blijft werken en toont dezelfde kamer');

  srv2.kill('SIGTERM');
} catch (e) {
  stap(false, 'onverwachte fout', e.message);
  console.log('\n--- serverlog ---\n' + bootlog.slice(-2500));
} finally {
  journey.close();
  try { srv.kill('SIGKILL'); } catch { /* al weg */ }
}

const fout = stappen.filter((s) => !s.ok);
console.log(`\n${fout.length ? 'ROOD: ' + fout.length + ' van ' + stappen.length : 'GROEN: alle ' + stappen.length + ' stappen'}\n`);
process.exit(fout.length ? 1 : 0);
