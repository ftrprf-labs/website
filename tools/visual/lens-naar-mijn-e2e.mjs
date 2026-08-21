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
// Een tweede deelnemer, met een SILENCE-sessie: afgerond, bewaartoestemming gegeven, maar zonder
// uitspraak. Zo bewijzen we dat een ontbrekende uitspraak nooit als rust wordt behandeld.
const TOKEN_STIL = 'e2e-participant-token-0002';
// Een derde deelnemer: SILENCE, maar mét gegronde observaties. Die hoort wél een omgeving te
// openen, want een non-reveal met grond is een volwaardige uitspraak (ADR-0005).
const TOKEN_GROND = 'e2e-participant-token-0003';

const REVEAL = 'De expertise van OCEA lijkt online minder zichtbaar dan de werkelijkheid.';

// ---- 1. de nagebootste Journey: één afgeronde sessie, precies zoals de echte export hem levert --
const sessies = {
  count: 3,
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
  }, {
    // EEN SILENCE ZONDER GROND. De observatie heeft wel een tekst en geen enkel citaat eronder.
    //
    // Sinds de poort ook op betekenisvolle observaties opent, is dít het geval dat nog steeds moet
    // sluiten: een waarneming zonder grond is een mening, en een mening opent geen omgeving. De
    // reden moet naleesbaar in de historie staan in plaats van stil te verdwijnen.
    //
    // Deze deelnemer dekt daarnaast de blijvende situatie waarin twee systemen niet gelijk op
    // deploy staan: hij heeft de bewaarvraag nog wél gekregen.
    received_at: new Date().toISOString(),
    participant: TOKEN_STIL,
    session_id: 'e2e-2',
    started_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date().toISOString(),
    shown: { outcome: 'SILENCE', observations: [{ note: 'iets wat opviel', meaning: '', lens: 'eerste indruk' }] },
    inner_circle_opt_in: true,
    contact_consent_version: 'maculis-contact-v1',
    events: [
      { name: 'session_started' },
      { name: 'recognition_answered', value: 'ja' },
      { name: 'account_handoff_accepted', at: new Date().toISOString() },
      { name: 'session_completed' },
    ],
  }, {
    // EEN SILENCE MET GROND. Geen uitspraak, wel twee observaties met een citaat en een vindplaats.
    // Dit is het pad dat de Lens het vaakst oplevert, en tot voor kort leverde het niets op.
    received_at: new Date().toISOString(),
    participant: TOKEN_GROND,
    session_id: 'e2e-3',
    started_at: new Date(Date.now() - 600000).toISOString(),
    updated_at: new Date().toISOString(),
    shown: {
      outcome: 'SILENCE',
      pages_seen: 6,
      observations: [{
        subject: 'Samen werken aan herstel',
        note: 'Op je homepage krijgt "Samen werken aan herstel" veel nadruk.',
        meaning: 'Daarmee vertel je duidelijk waar je voor staat.',
        lens: 'Begrijpt een nieuwe bezoeker ook waarom dit voor hem de juiste keuze is?',
        basis: 'inferred',
        evidence: [{ surface: 'homepage', url: 'https://grond-e2e.nl/', quote: 'Samen werken aan herstel' }],
      }, {
        subject: 'binnen een week terecht',
        note: 'Je site zegt zelf: "Je kunt bij ons meestal binnen een week terecht."',
        meaning: 'Dit staat er letterlijk.',
        lens: 'Wat wil je dat iemand hieruit opmaakt?',
        basis: 'explicit',
        evidence: [{ surface: 'pagina Contact', url: 'https://grond-e2e.nl/contact', quote: 'Je kunt bij ons meestal binnen een week terecht.' }],
      }],
    },
    inner_circle_opt_in: true,
    contact_consent_version: 'maculis-contact-v1',
    events: [
      { name: 'session_started' },
      { name: 'account_handoff_accepted', at: new Date().toISOString() },
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

// ---- 2. schone lei ------------------------------------------------------------------------------
//
// Deze harness ruimde zichzelf niet op. Een tweede run vond de organisatie, de kamer en de tester
// van de vorige run terug en werd rood op stappen die niets mankeerden, waarna de achtergebleven
// server de poort bezet hield en de dérde run al bij het opstarten strandde. Een testinstrument dat
// alleen de eerste keer de waarheid vertelt, is erger dan geen instrument.
//
// Beide kanten van de staat gaan weg: het bestand van Testerbeheer en het schema van de database.
// Het hele schema, niet de inhoud van de tabellen: leegmaken laat de migraties als toegepast staan
// terwijl wat zij zaaien (de standaardtenant) verdwenen is, en dan start de server met een
// communicatielaag die nergens meer bij hoort. De migraties draaien bij het opstarten opnieuw en
// bouwen alles terug.
const { rm } = await import('node:fs/promises');
await rm('/var/tmp/e2e-data', { recursive: true, force: true });
{
  const { Client } = await import('pg');
  const c = new Client({ connectionString: 'postgresql://maculis@127.0.0.1:55432/maculis_e2e' });
  try {
    await c.connect();
    await c.query('drop schema public cascade');
    await c.query('create schema public');
  } catch (e) {
    console.log(`  let op: kon de e2e-database niet legen (${e.message}). Draait Postgres op 55432 met database maculis_e2e?`);
  } finally { await c.end().catch(() => {}); }
}

// ---- 3. de echte server -------------------------------------------------------------------------
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
  // Zoals de pilot draait: de kale hostnaam leidt naar de Cockpit, niet naar de losse tool. Een
  // medewerker hoeft geen technische route te kennen.
  PREVIEW_COCKPIT_ROOT: '1',
};
delete env.NODE_ENV;
const srv = spawn('node', ['server/index.mjs'], { env, cwd: '/home/user/website', stdio: ['ignore', 'pipe', 'pipe'] });
// De tweede server (de herstart-controle) leeft in het try-blok, maar moet ook opgeruimd worden
// wanneer daar iets misgaat. Daarom staat hij hier.
let srv2 = null;
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

  // De tweede tester, die straks een SILENCE-sessie blijkt te hebben. Nu al aanmaken zodat één
  // herstart beide tokens oppikt.
  const maakStil = await api('/api/invitations', {
    method: 'POST',
    body: { first_name: 'Wies', last_name: 'Doorn', company_name: 'Doorn Advies', email: 'wies@doorn-e2e.nl', domain: 'doorn-e2e.nl' },
  });
  stap(maakStil.status === 201, 'tweede tester aangemaakt, die straks niets te bewaren blijkt te hebben');
  const invIdStil = maakStil.body && maakStil.body.invitation && maakStil.body.invitation.id;

  // De derde: een SILENCE MET grond. Die hoort wél een omgeving te openen.
  const maakGrond = await api('/api/invitations', {
    method: 'POST',
    body: { first_name: 'Bram', last_name: 'Grond', company_name: 'Praktijk Grond', email: 'bram@grond-e2e.nl', domain: 'grond-e2e.nl' },
  });
  stap(maakGrond.status === 201, 'derde tester aangemaakt, met een SILENCE die wél grond heeft');
  const invIdGrond = maakGrond.body && maakGrond.body.invitation && maakGrond.body.invitation.id;

  // Zorg dat het token van de tester hetzelfde is als dat van de nagebootste sessie, want daarop
  // wordt gejoind. In het echt komt dat token uit de persoonlijke link.
  const { execSync } = await import('node:child_process');
  execSync(`node -e "
    const f='/var/tmp/e2e-data/invitations.json';
    const fs=require('fs'); const db=JSON.parse(fs.readFileSync(f,'utf8'));
    db.invitations.forEach(i=>{
      if(i.id==='${invId}'){ i.token='${TOKEN}'; i.status='SENT'; }
      if(i.id==='${invIdStil}'){ i.token='${TOKEN_STIL}'; i.status='SENT'; }
      if(i.id==='${invIdGrond}'){ i.token='${TOKEN_GROND}'; i.status='SENT'; }
    });
    fs.writeFileSync(f, JSON.stringify(db,null,2));
  "`);
  // De server houdt de store in geheugen; herstart hem zodat hij het aangepaste token leest.
  srv.kill('SIGTERM');
  await wacht(800);
  srv2 = spawn('node', ['server/index.mjs'], { env, cwd: '/home/user/website', stdio: ['ignore', 'pipe', 'pipe'] });
  srv2.stdout.on('data', (b) => { bootlog += b; });
  srv2.stderr.on('data', (b) => { bootlog += b; });
  for (let i = 0; i < 60; i++) { await wacht(300); try { const r = await fetch(`${BASE}/healthz`); if (r.ok) break; } catch { /* wacht */ } }
  for (let i = 0; i < 80; i++) { const s = await api('/api/comm/status'); if (s.status === 200) break; await wacht(400); }

  // ---- de enige voordeur ------------------------------------------------------------------------
  // Wie de kale hostnaam opent, hoort in de Cockpit te landen en niet in de losse uitnodigingstool.
  const voordeur = await fetch(BASE + '/');
  const voordeurHtml = await voordeur.text();
  stap(voordeur.status === 200 && /cockpit-live\.js/.test(voordeurHtml),
    'de kale hostnaam opent de Cockpit, zonder technische route', voordeur.status + '');
  stap(!/app\.js/.test(voordeurHtml), 'en niet de losse uitnodigingstool');

  // ---- de sync: dit is de hele automatische voorbereiding ---------------------------------------
  //
  // Bewust UITSLUITEND via Cockpit Vandaag, en niet via de testerlijst. Dat is sinds deze stap de
  // enige interne voordeur: een medewerker opent de Cockpit en verder niets. Wie hier eerst
  // /api/invitations aanroept, test de oude weg en merkt de reparatie niet.
  let vandaag = null;
  let kaart = null;
  for (let i = 0; i < 20; i++) {
    vandaag = await api('/api/cockpit/today');
    const alle = vandaag.status === 200 && vandaag.body.buckets
      ? [...vandaag.body.buckets.NU, ...vandaag.body.buckets.KLAAR, ...vandaag.body.buckets.RADAR] : [];
    kaart = alle.find((c) => c.kamer) || null;
    if (kaart) break;
    await wacht(400);
  }
  stap(vandaag && vandaag.body.sync && vandaag.body.sync.ok === true,
    'Vandaag werkt zichzelf bij vanaf de Lens', vandaag && vandaag.body.sync ? JSON.stringify(vandaag.body.sync) : 'geen sync');

  // Pas hierna de testerlijst, om vast te stellen wat de Cockpit al had veroorzaakt.
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

  // ---- de actiekaart in Vandaag -----------------------------------------------------------------
  stap(Boolean(kaart), 'de actiekaart staat in Vandaag, zonder dat de testerlijst is geopend');
  stap(kaart && kaart.bucket === 'KLAAR', 'als voorbereid werk, niet als urgentie', kaart ? kaart.bucket : '');
  stap(kaart && kaart.primary.type === 'MIJN_ROOM_READY', 'met de juiste reden', kaart ? kaart.primary.type : '');
  stap(kaart && kaart.primary.source === 'FIRST_LENS', 'en de Lens als herkomst', kaart ? kaart.primary.source : '');
  stap(kaart && kaart.org === 'OCEA', 'met de juiste organisatie', kaart ? kaart.org : '');
  stap(kaart && kaart.who === 'Ludwig Vermeulen', 'en de juiste mens');
  stap(kaart && kaart.kamer.uitspraak === REVEAL, 'de kaart toont de zin uit de Lens, woordelijk');
  const kanalen = kaart ? Object.fromEntries(kaart.kamer.kanalen.map((k) => [k.kanaal, k.reden])) : {};
  // Deze tester heeft geen mobiel nummer, dus WhatsApp valt af op het adres en e-mail op het
  // ontbrekende transport. Twee verschillende redenen, en allebei zichtbaar: een medewerker die een
  // kanaal mist, moet kunnen weten of hij dat oplost met een instelling of nooit.
  stap(kaart && kaart.kamer.kanalen.every((k) => !k.mogelijk),
    'geen enkel kanaal doet alsof: de mock-adapter levert nooit "verzonden"', JSON.stringify(kanalen));
  stap(kanalen.EMAIL === 'geen_transport' && kanalen.WHATSAPP === 'geen_adres',
    'en de reden staat er per kanaal bij', JSON.stringify(kanalen));
  const geenPersoonlijk = !JSON.stringify(kaart || {}).includes('deels');
  stap(geenPersoonlijk, 'het antwoord uit de Lens staat NIET op de actiekaart');

  // ---- de ene menselijke bevestiging ------------------------------------------------------------
  const nodig = await api(`/api/comm/mijn/kamers/${kaart.kamer.id}/uitnodigen`, { method: 'POST', body: {} });
  stap(nodig.status === 200 && nodig.body.ok, 'de medewerker bevestigt, en Maculis voert de rest uit');
  stap(nodig.body.bezorging === 'handmatig', 'geen verzendkanaal, dus niets verstuurd en de link komt terug');
  stap(nodig.body.herhaling === false, 'en dit is de eerste keer');
  const link = nodig.body.link || '';
  stap(link.startsWith(BASE + '/mijn.html?u='), 'de link wijst naar Mijn Maculis', link.slice(0, 40) + '…');

  // De kaart is een afleiding en geen object: beslist is beslist.
  //
  // Afgebakend op DEZE deelnemer. Sinds een gegronde SILENCE ook een omgeving opent, staan er
  // meerdere kamers in het systeem, en "nul kaarten in totaal" zou dan iets anders meten dan wat
  // deze stap bedoelt: dat de kaart van wie beslist is verdwijnt.
  const naBesluit = await api('/api/cockpit/today');
  const nogSteeds = naBesluit.status === 200 && naBesluit.body.buckets
    ? [...naBesluit.body.buckets.NU, ...naBesluit.body.buckets.KLAAR, ...naBesluit.body.buckets.RADAR]
      .filter((c) => c.kamer && JSON.stringify(c).includes('Vermeulen')) : [];
  stap(nogSteeds.length === 0, 'de kaart van wie beslist is verdwijnt vanzelf uit Vandaag', `${nogSteeds.length} over`);

  // De historie van de tester weet ervan, want Testerbeheer is de plek waar een medewerker de reis
  // van één mens naleest.
  const naLijst = await api('/api/invitations');
  const recNa = (naLijst.body.invitations || []).find((x) => x.id === invId);
  stap(recNa && recNa.history.some((h) => h.event === 'mijn_maculis_invited'),
    'de uitnodiging staat in de historie van de tester');

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

  // ---- twee stemmen -----------------------------------------------------------------------------
  // Wat hij tijdens de Lens zei en wat hij hier zegt, staan naast elkaar. De tweede vervangt de
  // eerste niet, en beide dragen het moment waarop hij ze gaf.
  const naDetail = await api(`/api/mijn/insights/${ins.id}`, { headers: { 'x-mijn-token': mijn } });
  const stemmen = naDetail.body.stemmen || [];
  const uitLens = stemmen.find((v) => v.origin === 'lens');
  const uitKamer = stemmen.find((v) => v.origin === 'mijn');
  stap(stemmen.length === 2, 'de kamer houdt twee stemmen uit elkaar', `${stemmen.length}`);
  stap(Boolean(uitLens) && uitLens.answer === 'deels', 'zijn antwoord uit de Lens staat er onveranderd');
  stap(Boolean(uitKamer) && uitKamer.answer === 'ja', 'en zijn reflectie hier is de tweede stem');
  stap(Boolean(uitKamer) && uitKamer.note === 'Klopt, dit zeggen klanten ook.', 'met zijn eigen woorden erbij');
  stap(Boolean(uitLens) && !uitLens.note, 'en de eerste stem draagt geen woorden die hij pas later schreef');
  const bewijsNa = (naDetail.body.evidence || []).length;
  stap(bewijsNa === 3, 'de grond is niet meebewogen met zijn antwoord', `${bewijsNa} regels`);
  stap(naDetail.body.insight.title === REVEAL, 'en de uitspraak staat er woordelijk nog steeds');

  // ---- terugkomen -------------------------------------------------------------------------------
  const nogmaals = await api('/api/mijn/toegang/uitnodiging', { method: 'POST', body: { code } });
  stap(nogmaals.status === 400 && nogmaals.body.error === 'used', 'dezelfde uitnodiging werkt geen tweede keer');
  const tweedeBezoek = await api('/api/mijn/insights', { headers: { 'x-mijn-token': mijn } });
  const ins2 = (tweedeBezoek.body.insights || [])[0];
  stap(ins2 && ins2.id === ins.id && ins2.recognition === 'ja', 'zijn toegang blijft werken en toont dezelfde kamer');

  // ---- een sessie zonder uitspraak: geen kamer, en nooit stil -----------------------------------
  //
  // De Lens kan tot de slotsom komen dat hij niets gegronds te zeggen heeft. Dat is een geldige
  // uitkomst en geen storing. Maar iemand die dan tóch om bewaren vroeg, moet niet in het niets
  // verdwijnen: er is geen kamer, en juist daarom hoort er een spoor te zijn.
  const stil = (await api('/api/invitations')).body.invitations.find((x) => x.id === invIdStil);
  stap(Boolean(stil), 'de tweede tester bestaat');
  stap(stil && stil.status === 'COMPLETED', 'zijn Lens is gewoon afgerond', stil ? stil.status : '');
  stap(stil && stil.keep_consent === true, 'en zijn bewaartoestemming is vastgelegd');
  stap(stil && !stil.history.some((h) => h.event === 'mijn_room_prepared'),
    'er is GEEN persoonlijke omgeving klaargezet');
  const nietKlaar = stil && stil.history.find((h) => h.event === 'mijn_room_not_prepared');
  stap(Boolean(nietKlaar), 'en dat staat in zijn historie, in plaats van stil te verdwijnen');
  stap(nietKlaar && nietKlaar.reason === 'no_statement', 'met de reden erbij', nietKlaar ? nietKlaar.reason : '');

  // Hij STAAT wel als relatie in de Cockpit, en dat is geen gevolg van de Lens: `migrateInvitations`
  // brengt bij het opstarten elke tester over naar contact en organisatie (§9). Een relatie zonder
  // kamer is administratie, geen signaal: hij levert geen kaart op en er is niets van hem te lezen.
  const naStil = await api('/api/comm/relationships');
  const namen = (naStil.body.relationships || naStil.body.items || [])
    .map((r) => [r.first_name, r.last_name].filter(Boolean).join(' '));
  stap(namen.includes('Wies Doorn'), 'hij staat als gewone relatie in de Cockpit, zoals elke tester', namen.join(', '));

  // En hij levert geen kaart op. Geen kamer betekent geen signaal, ook niet als aandachtspunt.
  const naStilVandaag = await api('/api/cockpit/today');
  const alleKaarten = naStilVandaag.status === 200 && naStilVandaag.body.buckets
    ? [...naStilVandaag.body.buckets.NU, ...naStilVandaag.body.buckets.KLAAR, ...naStilVandaag.body.buckets.RADAR] : [];
  stap(!JSON.stringify(alleKaarten).includes('Wies'), 'en geen kaart in Vandaag');

  // Herhaalde verversingen schrijven de historie niet vol: dit is een toestand, geen reeks pogingen.
  for (let i = 0; i < 3; i++) await api('/api/invitations');
  // ---- de SILENCE die wél grond had --------------------------------------------------------------
  //
  // Dit is de kern van deze uitbreiding: een non-reveal met citaten is een volwaardige uitspraak en
  // opent een omgeving. Zonder deze stap zou de keten alleen werken op de zeldzaamste uitkomst.
  const grond = (await api('/api/invitations')).body.invitations.find((x) => x.id === invIdGrond);
  stap(Boolean(grond) && grond.status === 'COMPLETED', 'de derde tester rondde de Lens af');
  stap(grond && grond.history.some((h) => h.event === 'mijn_room_prepared'),
    'en zijn omgeving IS klaargezet, zonder dat er ooit een uitspraak was',
    grond ? grond.history.map((h) => h.event).join(', ') : '');
  stap(grond && !grond.history.some((h) => h.event === 'mijn_room_not_prepared'),
    'en er staat geen enkele reden waarom het niet zou kunnen');

  const vandaagGrond = await api('/api/cockpit/today');
  const kaartGrond = (() => {
    const b = vandaagGrond.status === 200 && vandaagGrond.body.buckets ? vandaagGrond.body.buckets : null;
    const alle = b ? [...b.NU, ...b.KLAAR, ...b.RADAR] : [];
    return alle.find((c) => c.kamer && JSON.stringify(c).includes('Grond')) || null;
  })();
  stap(Boolean(kaartGrond), 'hij krijgt een kaart in Vandaag, net als een reveal');
  stap(kaartGrond && !/rust op/i.test(JSON.stringify(kaartGrond)),
    'en de kaart spreekt geen sterktetaal over een afwezigheid');

  const stilNa = (await api('/api/invitations')).body.invitations.find((x) => x.id === invIdStil);
  const aantal = stilNa ? stilNa.history.filter((h) => h.event === 'mijn_room_not_prepared').length : 0;
  stap(aantal === 1, 'en de melding staat er precies één keer, ook na drie verversingen', `${aantal}`);

  // ---- de vier eigenaarsvragen ------------------------------------------------------------------
  //
  // Precies de dingen die je bij een echte pilot met het blote oog wilt kunnen vaststellen. De eerste
  // drie gaan over koppeling en dubbeling; de vierde is de grens die nooit mag schuiven.

  // 1. KOMT DE JUISTE PERSOON BINNEN, EN IS DE JUISTE KAMER GEKOPPELD?
  // De relatie in de Cockpit en de mens in Mijn Maculis moeten dezelfde zijn, en de kamer moet bij
  // dezelfde organisatie horen. Anders kijkt iemand in de omgeving van een ander.
  const relaties = await api('/api/comm/relationships');
  const alleRel = relaties.body.relationships || relaties.body.items || [];
  const relatie = alleRel.find((r) => [r.first_name, r.last_name].filter(Boolean).join(' ') === 'Ludwig Vermeulen');
  stap(Boolean(relatie), 'de mens uit de kamer staat als relatie in de Cockpit');
  stap((relatie && (relatie.org || relatie.organisatie || relatie.organization)) === 'OCEA',
    'bij dezelfde organisatie als de kamer');

  // 2. WORDT ER NIETS DUBBEL OPGESLAGEN?
  // De sync draait bij ELKE keer dat iemand Vandaag of Beheer opent. Als die niet idempotent is,
  // groeit het aantal kamers en inzichten stilletjes mee met het aantal keren dat je kijkt.
  for (let i = 0; i < 3; i++) { await api('/api/cockpit/today'); await api('/api/invitations'); }
  const naKijken = await api('/api/comm/relationships');
  stap((naKijken.body.relationships || naKijken.body.items || []).length === alleRel.length,
    'driemaal opnieuw kijken levert geen enkele relatie extra op', `${alleRel.length}`);
  const insNa = await api('/api/mijn/insights', { headers: { 'x-mijn-token': mijn } });
  stap((insNa.body.insights || []).length === 1, 'en nog steeds één inzicht', `${(insNa.body.insights || []).length}`);
  // Idem: afgebakend op deze organisatie. De kamer van de gegronde SILENCE hoort er wél te staan.
  const kamersNa = await api('/api/comm/mijn/kamers');
  const eigenKamers = (kamersNa.body.kamers || []).filter((k) => JSON.stringify(k).includes('Vermeulen'));
  stap(eigenKamers.length === 0,
    'en er staat geen tweede kamer klaar naast de actieve', `${eigenKamers.length}`);
  const detailNa = await api(`/api/mijn/insights/${ins.id}`, { headers: { 'x-mijn-token': mijn } });
  stap((detailNa.body.stemmen || []).length === 2, 'zijn twee stemmen blijven twee stemmen');
  stap((detailNa.body.evidence || []).length === 3, 'en de grond blijft drie regels');

  // 3. ZIET DE COCKPIT ALLEEN WAT HIJ MAG ZIEN?
  // Één harde greep over alles wat de Cockpit over deze mens kan tonen, en daarin mag zijn reflectie
  // nergens voorkomen.
  const dossier = await api(`/api/cockpit/relation/${relatie ? relatie.id || relatie.contact_id : 'x'}`);
  const alles = JSON.stringify([relaties.body, kamersNa.body, dossier.body, (await api('/api/cockpit/today')).body]);
  stap(!alles.includes('Klopt, dit zeggen klanten ook'), 'zijn reflectie staat op GEEN ENKEL Cockpitpad');
  stap(!alles.includes(code) && !alles.includes(mijn), 'en er staat geen enkele toegangswaarde in');

} catch (e) {
  stap(false, 'onverwachte fout', e.message);
  console.log('\n--- serverlog ---\n' + bootlog.slice(-2500));
} finally {
  // Allebei, ook als het misging. srv2 werd alleen op het gelukkige pad afgesloten, waardoor een
  // rode run poort 8099 bezet liet en de volgende run al bij het opstarten strandde op iets dat
  // niets met de keten te maken had.
  journey.close();
  for (const p of [srv, srv2]) { try { if (p) p.kill('SIGKILL'); } catch { /* al weg */ } }
}

const fout = stappen.filter((s) => !s.ok);
console.log(`\n${fout.length ? 'ROOD: ' + fout.length + ' van ' + stappen.length : 'GROEN: alle ' + stappen.length + ' stappen'}\n`);
process.exit(fout.length ? 1 : 0);
