/* =====================================================================
   Maculis Future Cockpit — OPERATIONAL client, Slice 1 (real data only).
   Every screen here is fed by /api/cockpit/*. There are NO fixtures. If the
   Communication Layer is not configured, this page fails closed and says so;
   it never shows invented data as if it were real (trust invariant).
   Reuses /cockpit.css so the look matches the frozen prototype exactly.
   ===================================================================== */
'use strict';

import { herkomstVan } from './herkomst.js';

const shell = document.getElementById('shell');
const view = document.getElementById('view');

/* ---------- helpers ---------- */
function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function initials(name) { const p = String(name || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[p.length - 1] || '')[0] || '')).toUpperCase(); }
const CHAN_ICO = { EMAIL: '✉', WHATSAPP: '◇', SMS: '▤', PHONE: '☎', MIJN_MACULIS: '◐' };

// Privacy: een telling en een ouderdom, en verder niets.
//
// De Cockpit toont geen privacygesprek en kan er ook geen openen; de server geeft daar 403 op. Maar
// een AVG-verzoek mag niet ongezien blijven liggen, dus staat hier één regel die zegt DAT er iets
// wacht en HOE LANG al. Geen naam, geen onderwerp, geen tekst, geen AI. De weg erheen is de
// bestaande Privacy-inbox, want daar hoort de inhoud thuis.
function privacyNotice(p) {
  if (!p || !p.open) return null;
  const n = p.open;
  const wrap = el('section', 'privacy-notice');
  const hoelang = p.oldestDays == null ? ''
    : p.oldestDays === 0 ? ' Het oudste kwam vandaag binnen.'
    : ` Het oudste wacht ${p.oldestDays} dag${p.oldestDays === 1 ? '' : 'en'}.`;
  wrap.innerHTML =
    `<span class="mac-signal" aria-hidden="true"></span>
     <span class="pn-text">${n} privacyverzoek${n === 1 ? '' : 'en'} open.${esc(hoelang)}</span>
     <a class="pn-link" href="/comm.html">Open de Privacy-inbox</a>`;
  return wrap;
}

// Canon 10: statuslabels zijn Nederlands en menselijk. Geen Engelse hoofdletterbadges.
// De kaarten dekken de opslagwaarden; humanLabel vangt alles wat er nog bij komt op,
// zodat een nieuwe enumwaarde nooit als schreeuwende code in beeld verschijnt.
const CONV_STATUS_LABEL = {
  NEW: 'nieuw', OPEN: 'open', ANSWERED: 'beantwoord', CLOSED: 'afgerond',
  WAITING_ON_US: 'wacht op jou', WAITING_ON_CONTACT: 'wacht op de klant',
};
const DELIVERY_LABEL = {
  RECEIVED: 'ontvangen', DRAFT: 'concept', QUEUED: 'in de wachtrij', SENT: 'verzonden',
  DELIVERED: 'afgeleverd', BOUNCED: 'geweigerd', FAILED: 'niet verzonden',
};
const STAGE_LABEL = {
  NEW: 'nieuw', NIEUW: 'nieuw', LEAD: 'lead', PROSPECT: 'prospect',
  ACTIVE: 'actief', ACTIEF: 'actief', QUIET: 'stil', STIL: 'stil',
  CUSTOMER: 'klant', KLANT: 'klant', ARCHIVED: 'archief',
};
const CHANNEL_LABEL = {
  EMAIL: 'e-mail', WHATSAPP: 'WhatsApp', SMS: 'sms', PHONE: 'telefoon',
  LINKEDIN: 'LinkedIn', INSTAGRAM: 'Instagram', FACEBOOK_MESSENGER: 'Messenger',
  WEB: 'web', JOURNEY: 'journey', INTERNAL_NOTE: 'interne notitie', OTHER: 'overig',
  // Het kanaal van de klant zelf. Zonder dit label zou humanLabel er "mijn maculis" van maken.
  MIJN_MACULIS: 'Mijn Maculis',
};
function humanLabel(map, v) {
  if (v == null || v === '') return '';
  const key = String(v).toUpperCase();
  return map[key] || String(v).toLowerCase().replace(/_/g, ' ');
}
const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function lensDate(iso) { try { const d = new Date(iso); if (isNaN(d)) return null; return `${d.getDate()} ${NL_MONTHS[d.getMonth()]}`; } catch { return null; } }

// ---- signaaltaal (canon 9 trap 1, canon 7) ------------------------------------------------
// Het aantal ONAFHANKELIJKE, GEGRONDE signalen onder een uitspraak. Alleen een feit en een
// waarneming tellen: dat zijn dingen die buiten Maculis bestaan. Een afleiding of hypothese is
// Maculis' eigen redenering en draagt dus geen extra licht. Canon 7 maakt de straal van
// light.core een functie van precies dit getal.
function groundedSignals(ev) {
  if (!ev) return 0;
  const items = evidenceItems(ev);
  return items.filter((o) => o && typeof o === 'object' && (o.kind === 'FACT' || o.kind === 'OBSERVATION')).length;
}

// Een lichtpunt. `core` geeft het de halo, en dat gebeurt hoogstens een keer per scherm
// (canon 7: maximaal een light.core per scherm).
let coreClaimed = false;
function signalPoint(n, { core = false, landing = false } = {}) {
  const dot = el('span', 'mac-signal');
  dot.setAttribute('aria-hidden', 'true');
  if (core && !coreClaimed && n > 0) { coreClaimed = true; dot.classList.add('is-core'); dot.style.setProperty('--sig-n', String(Math.min(n, 5))); }
  if (landing) dot.classList.add('is-landing');
  return dot;
}

async function api(path, opts) {
  const r = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...opts });
  let data = null; try { data = await r.json(); } catch { /* no body */ }
  return { ok: r.ok, status: r.status, data };
}

/* ---------- state ---------- */
let scn = 'vandaag';
let activeContactId = null;
let activeConvId = null;
let activeDraft = null; // full draft state
let agentsOn = false;   // digital-colleague domain enabled (the permanent "Vraag Scout" entry is shown)

/* ---------- boot ---------- */
// De badge in de rail vertelt wat er werkelijk onder dit scherm ligt. Hij mag nooit "echte data"
// beweren terwijl de cockpit meldt dat er geen database is: dat zou precies het vertrouwen breken
// dat deze cockpit bewaakt.
function setLiveBadge(state) {
  const b = document.getElementById('live-badge');
  if (!b) return;
  const MAP = {
    live: { text: 'Echte data', color: 'var(--semantic-confirmed)' },
    off: { text: 'Geen database', color: 'var(--text-quiet)' },
    locked: { text: 'Niet ingelogd', color: 'var(--text-quiet)' },
  };
  const m = MAP[state] || MAP.off;
  b.textContent = m.text;
  b.style.color = m.color;
  b.hidden = false;
}

async function boot() {
  const { data: cfg } = await api('/api/cockpit/config');
  if (!cfg || !cfg.commEnabled) { setLiveBadge('off'); return renderDisabled(); }
  if (!cfg.authed) { setLiveBadge('locked'); return renderLogin(); }
  setLiveBadge('live');
  agentsOn = Boolean(cfg.agentsEnabled);
  wireScoutEntry();
  wireNav();
  render();
}

// The permanent, compact colleague entry in the rail header. Shown only when the digital-colleague
// domain is on. This is the ONE way to call Scout; it is never an attention item in the Vandaag stream.
function wireScoutEntry() {
  const ask = document.getElementById('ask-scout');
  if (!ask) return;
  ask.hidden = !agentsOn;
  ask.onclick = agentsOn ? openScoutModal : null;
}

function renderDisabled() {
  shell.setAttribute('data-space', 'reveal');
  view.innerHTML = '';
  const s = el('div', 'silence');
  s.innerHTML = `<h2>Nog niet geconfigureerd.</h2>
    <p>De Communication Layer staat uit (database of <code>COMM_LAYER_ENABLED</code> ontbreekt).</p>
    <div class="whisper">Deze cockpit toont alleen echte data. Zolang die er niet is, tonen we niets in plaats van iets te verzinnen.</div>`;
  view.appendChild(s);
}

function renderLogin() {
  shell.setAttribute('data-space', 'work');
  view.innerHTML = '';
  const wrap = el('div', 'view-enter');
  wrap.appendChild(el('h1', 'work-h1', 'Inloggen'));
  const form = el('form', 'rel-find');
  form.innerHTML = `<span class="search big"><input type="password" id="pw" placeholder="Adminwachtwoord" aria-label="Adminwachtwoord"></span><button class="btn btn-primary" type="submit">Inloggen</button>`;
  const err = el('p', 'lead-note'); err.style.color = 'var(--danger)';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = form.querySelector('#pw').value;
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: pw }) });
    if (r.ok) boot(); else { err.textContent = (r.data && r.data.error) || 'Onjuist wachtwoord'; }
  });
  wrap.appendChild(form); wrap.appendChild(err);
  view.appendChild(wrap);
}

function wireNav() {
  document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); scn = a.getAttribute('data-nav'); activeContactId = null; activeConvId = null; render();
  }));
}

function lightNav(key) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    a.removeAttribute('aria-current');
    if (a.getAttribute('data-nav') === key) a.setAttribute('aria-current', 'page');
  });
}

/* ---------- router ---------- */
async function render() {
  coreClaimed = false;   // canon 7: hoogstens een light.core per scherm
  view.innerHTML = '';
  if (scn === 'vandaag') { shell.setAttribute('data-space', 'reveal'); lightNav('vandaag'); return renderVandaag(); }
  if (scn === 'dossier') { shell.setAttribute('data-space', 'work'); lightNav('relaties'); return renderDossier(activeContactId); }
  if (scn === 'gesprek') { shell.setAttribute('data-space', 'work'); lightNav('gesprekken'); return renderGesprek(activeConvId); }
  if (scn === 'relaties') { shell.setAttribute('data-space', 'work'); lightNav('relaties'); return renderRelaties(); }
  if (scn === 'gesprekken') { shell.setAttribute('data-space', 'work'); lightNav('gesprekken'); return renderGesprekken(); }
  if (scn === 'beheer') { shell.setAttribute('data-space', 'work'); lightNav('beheer'); return renderBeheer(); }
  shell.setAttribute('data-space', 'work'); lightNav(scn);
  const wrap = el('div', 'view-enter');
  wrap.appendChild(el('div', 'eyebrow-line', scn.charAt(0).toUpperCase() + scn.slice(1)));
  wrap.appendChild(el('h1', 'work-h1', scn.charAt(0).toUpperCase() + scn.slice(1)));
  wrap.appendChild(el('p', 'lead-note', 'Dit onderdeel heeft nog geen eigen scherm in de cockpit. Er wordt hier bewust niets getoond in plaats van voorbeelddata.'));
  view.appendChild(wrap);
}

/* ---------- Vandaag (the attention surface / relational radar) ---------- */
async function renderVandaag() {
  const { ok, data } = await api('/api/cockpit/today');
  const wrap = el('div', 'view-enter');
  if (!ok) { wrap.appendChild(el('p', 'lead-note', 'Kon aandacht niet laden.')); view.appendChild(wrap); return; }
  const h = data.headline || { primary: '', secondary: null, zero: false };
  const syncNote = syncNotice(data.sync);
  const buckets = data.buckets || { NU: [], KLAAR: [], RADAR: [] };
  const counts = data.counts || { nu: 0, klaar: 0, radar: 0 };
  document.getElementById('nc-vandaag').textContent = counts.nu ? String(counts.nu) : '';
  const total = (buckets.NU || []).length + (buckets.KLAAR || []).length + (buckets.RADAR || []).length;

  if (h.zero && !total) {
    // Calm state: the silence block carries the message; no duplicate headline above it.
    wrap.appendChild(el('div', 'eyebrow', 'Vandaag'));
    const s = el('div', 'silence');
    s.innerHTML = `<h2>${esc(h.primary || 'Je bent bij.')}</h2>${h.secondary ? `<p>${esc(h.secondary)}</p>` : ''}
      <div class="whisper">Maculis kijkt verder. Als er iets werkelijk toe doet, zie je het hier.</div>`;
    wrap.appendChild(s);
    // Een storing in de Lens mag nooit als rust lezen. Juist hier niet: op dit scherm staat
    // letterlijk "Je bent bij", terwijl er iemand kan wachten die we simpelweg niet konden ophalen.
    if (syncNote) wrap.appendChild(syncNote);
    view.appendChild(wrap); return;
  }

  const greet = el('div', 'greet');
  // Canon 15, signature 3: scherpstellen is het enige onthullingsgebaar en is voorbehouden
  // aan iets wat Maculis heeft gezien. De radarzin is precies dat.
  greet.innerHTML = `<div class="eyebrow">Vandaag</div><h1 class="mac-sharpen">${esc(h.primary)}</h1>${h.secondary ? `<p class="sub">${esc(h.secondary)}</p>` : ''}`;
  wrap.appendChild(greet);

  // Three meaningful buckets: what needs you now, what Maculis prepared, and what is on the radar.
  const sections = [
    ['NU', 'now', 'Nu', 'vraagt jou'],
    ['KLAAR', 'ready', 'Klaargezet', 'werk dat Maculis voor je klaarzette'],
    ['RADAR', 'quiet', 'Op de radar', 'reden dat dit nu meespeelt'],
  ];
  for (const [key, cls, label, hint] of sections) {
    const items = buckets[key] || [];
    if (!items.length) continue;
    const g = el('div', 'attn-group');
    g.appendChild(tierHead(cls, label, hint));
    items.forEach(c => g.appendChild(radarCard(c)));
    wrap.appendChild(g);
  }
  if (syncNote) wrap.appendChild(syncNote);
  const pa = privacyNotice(data.privacy);
  if (pa) wrap.appendChild(pa);
  view.appendChild(wrap);
}

// Waarom de radar mogelijk niet actueel is, in woorden waar een medewerker iets mee kan. Geen host,
// geen sleutel, geen stacktrace: alleen waar hij moet gaan kijken.
const SYNC_REDEN = {
  not_configured: 'De koppeling met de Lens is niet ingesteld, dus afgeronde Lens-ervaringen komen hier nog niet binnen.',
  timeout: 'De Lens reageerde niet op tijd. Dit beeld kan verouderd zijn. Ververs zo nog een keer.',
  network: 'De Lens is niet bereikbaar. Dit beeld kan verouderd zijn.',
  forbidden: 'De Lens weigerde onze sleutel, dus afgeronde Lens-ervaringen komen hier nog niet binnen.',
  exception: 'Het bijwerken vanaf de Lens ging mis. Dit beeld kan verouderd zijn.',
  unknown: 'Het bijwerken vanaf de Lens lukte niet. Dit beeld kan verouderd zijn.',
};
function syncNotice(sync) {
  if (!sync || sync.ok !== false) return null;
  return el('p', 'lead-note sync-note', esc(SYNC_REDEN[sync.reason] || SYNC_REDEN.unknown));
}

/* ---------- Scout, a digital colleague reachable from the cockpit header ----------
   Calling a colleague is NOT an attention item, so it lives in the rail header, not the Vandaag
   stream. "Vraag Scout" opens a compact modal with the SAME organisation/website/context fields and
   the SAME run API. During the run the page does not move. Afterwards a calm toast offers "Bekijk",
   which jumps to wherever Vandaag's own prioritisation placed the result. The same modal pattern will
   serve future digital colleagues, so no per-colleague card ever has to be added to Vandaag again. */
function openScoutModal() {
  if (document.getElementById('scout-modal')) return; // already open
  const back = el('div', 'scout-modal'); back.id = 'scout-modal';
  back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-label', 'Vraag Scout');
  // The theme tokens (--field, --surface, --text, ...) live on [data-direction] on the shell; the
  // modal is a body child outside that subtree, so carry the shell's direction onto it for legibility.
  back.setAttribute('data-direction', shell.getAttribute('data-direction') || 'C');
  const card = el('div', 'scout-modal-card');
  card.innerHTML = `
    <div class="scout-modal-head">
      <span class="colleague-dot" aria-hidden="true"></span>
      <div class="scout-id"><b>Vraag Scout</b><span class="scout-role">groei-collega</span></div>
      <button type="button" class="scout-x" id="sc-x" aria-label="Sluiten">×</button>
    </div>
    <form class="scout-form" id="sc-form">
      <p class="scout-explain">Scout kijkt naar openbare signalen en legt iets aan je voor als hij iets relevants vindt. Hij verstuurt niets en neemt geen contact op. Jij beslist. De bronnen en het bewijs zie je bij het resultaat.</p>
      <label class="scout-f"><span>Organisatie</span><input type="text" id="sc-name" placeholder="Naam van de organisatie" autocomplete="off" required></label>
      <label class="scout-f"><span>Website <em>(optioneel, helpt Scout kijken)</em></span><input type="text" id="sc-site" placeholder="bijv. voorbeeld.nl" autocomplete="off"></label>
      <label class="scout-f"><span>Context <em>(optioneel)</em></span><input type="text" id="sc-note" placeholder="Waarom kijk je hiernaar?" autocomplete="off"></label>
      <div class="scout-actions">
        <button type="submit" class="btn btn-primary" id="sc-go">Laat Scout kijken</button>
        <button type="button" class="btn btn-ghost" id="sc-cancel">Annuleren</button>
      </div>
      <p class="scout-status" id="sc-status" aria-live="polite"></p>
    </form>`;
  back.appendChild(card);
  document.body.appendChild(back);

  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('mousedown', (e) => { if (e.target === back) close(); });
  card.querySelector('#sc-x').addEventListener('click', close);
  card.querySelector('#sc-cancel').addEventListener('click', close);
  setTimeout(() => { const n = card.querySelector('#sc-name'); if (n) n.focus(); }, 30);

  card.querySelector('#sc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.querySelector('#sc-name').value.trim();
    const domain = normalizeDomain(form.querySelector('#sc-site').value);
    const note = form.querySelector('#sc-note').value.trim();
    const status = form.querySelector('#sc-status');
    const go = form.querySelector('#sc-go');
    if (!name) { status.textContent = 'Geef eerst een organisatie op.'; return; }
    go.disabled = true; go.textContent = 'Scout kijkt…'; status.textContent = 'Scout observeert openbare bronnen en weegt het af. Even geduld.';
    const candidate = { name }; if (domain) candidate.domain = domain; if (note) candidate.note = note;
    // The page stays exactly where it is during the run: the modal is a fixed overlay and we do not
    // re-render Vandaag here, so there is no scroll jump.
    const r = await api('/api/agents/scout/run', { method: 'POST', body: JSON.stringify({ candidates: [candidate] }) });
    if (!r.ok || !r.data || r.data.ok === false) {
      go.disabled = false; go.textContent = 'Laat Scout kijken';
      status.textContent = (r.data && (r.data.error || r.data.reason)) ? `Scout kon niet kijken: ${r.data.error || r.data.reason}` : 'Scout kon nu niet kijken.';
      return;
    }
    close();
    const recorded = Number(r.data.recorded || 0);
    const landed = Array.isArray(r.data.landed) ? r.data.landed : [];
    const first = landed[0];
    const landedId = (first && (typeof first === 'string' ? first : first.id)) || null;
    scoutToast(name, recorded, landedId);
  });
}

// A calm confirmation after a run. It never moves the page; only "Bekijk" navigates to the item,
// which Vandaag's own prioritisation has placed wherever it belongs (Nu / Klaargezet / Op de radar).
function scoutToast(name, recorded, landedId) {
  const old = document.getElementById('scout-toast'); if (old) old.remove();
  const t = el('div', 'scout-toast'); t.id = 'scout-toast'; t.setAttribute('role', 'status');
  if (recorded > 0) {
    t.appendChild(el('span', 'toast-msg', `Scout heeft iets gevonden over ${esc(name)}.`));
    const look = el('button', 'toast-look', 'Bekijk');
    look.addEventListener('click', async () => { t.remove(); await revealWorkItem(landedId); });
    t.appendChild(look);
  } else {
    t.appendChild(el('span', 'toast-msg', `Scout vond nu niets over ${esc(name)} dat je aandacht verdient.`));
    setTimeout(() => { if (t.parentNode) t.remove(); }, 8000);
  }
  const x = el('button', 'toast-x', '×'); x.setAttribute('aria-label', 'Sluiten');
  x.addEventListener('click', () => t.remove());
  t.appendChild(x);
  document.body.appendChild(t);
}

// Bring the user to the new/updated Scout item: show Vandaag with fresh data, then scroll to the card
// and highlight it briefly. This is the ONLY place a Scout run moves the page, and only on request.
async function revealWorkItem(id) {
  scn = 'vandaag'; activeContactId = null; activeConvId = null; lightNav('vandaag');
  shell.setAttribute('data-space', 'reveal');
  await renderVandaag();
  if (!id) return;
  const node = document.querySelector(`[data-attn-id="${cssEsc(id)}"]`);
  if (!node) return;
  const card = node.closest('.item') || node;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Canon 8.3, Land: de waarneming komt een keer binnen en staat daarna stil. Geen randflits
  // die om aandacht roept zonder betekenis te dragen.
  card.classList.add('mac-arrive');
  const dot = card.querySelector('.mac-signal');
  if (dot) dot.classList.add('is-landing');
}
function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

// Strip protocol, path and a leading www. so the website source gets a bare domain (voorbeeld.nl).
function normalizeDomain(v) {
  let s = String(v || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split(/[\/?#]/)[0];
  return s;
}

// One aggregated relation on the radar: WIE, WAAROM NU (primary), wat er nog meespeelt (secondary),
// wat Maculis klaarzette, en wat je kunt doen. The human decides; nothing runs on its own.
// How a digital colleague's contribution reads, by what it needs from you.
const COLLEAGUE_VERB = { approval: 'vraagt jouw akkoord', review: 'heeft iets voorbereid', awareness: 'ziet iets' };
const WORK_ACTION_LABEL = { approve: 'Goedkeuren', edit: 'Aanpassen', take_over: 'Overnemen', reject: 'Afwijzen', complete: 'Afronden' };

// Een nevenreden die een eigen draad draagt, opent die draad. stopPropagation omdat de kaart er
// zelf ook een klik op heeft: zonder dat opent hij eerst het dossier en verdwijnt de keuze.
function bindEchoOpeners(root) {
  root.querySelectorAll('.echo-open').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeConvId = btn.getAttribute('data-conv');
      scn = 'gesprek';
      render();
    });
  });
}

function radarCard(c) {
  const b = el('article', 'item openable'); b.tabIndex = 0; b.setAttribute('role', 'button');
  const chips = [];
  if (c.hasPrepared) chips.push('<span class="chip ready"><span class="k"></span>concept klaar</span>');
  if (c.org) chips.push(`<span class="chip">${esc(c.org)}</span>`);
  // Een nevenreden met een eigen draad is een tweede gesprek dat óók op antwoord wacht. Die hoort
  // niet alleen leesbaar te zijn maar ook te openen, anders is het nieuwste klantbericht wel
  // zichtbaar en toch onbereikbaar. Alleen de regels die een eigen draad hebben worden een knop.
  const secondary = (c.secondary || []).map(s => s.conversationId && s.conversationId !== c.conversationId
    ? `<button type="button" class="echo echo-open" data-conv="${esc(s.conversationId)}">${esc(s.reason)}</button>`
    : `<div class="echo">${esc(s.reason)}</div>`).join('');
  // When a digital colleague produced this, name them above the reason ("Growth vraagt jouw akkoord.").
  // Canon 9 trap 1: het lichtpunt staat er alleen als Maculis zelf iets heeft waargenomen.
  // Een bericht dat binnenkomt is geen waarneming van Maculis en krijgt dus geen punt.
  const attribution = c.primary.origin && c.primary.origin.kind === 'AGENT'
    ? `<div class="colleague"><span class="mac-signal" aria-hidden="true"></span>${esc(c.primary.origin.label)} ${esc(COLLEAGUE_VERB[c.primary.needs] || 'heeft iets voor je')}.</div>` : '';
  // Canon 9 trap 1. Het lichtpunt hoort bij een waarneming van Maculis zelf: iets wat een
  // digitale collega zag, of iets wat Maculis opmerkte zonder dat iemand erom vroeg (de radar).
  // Een binnengekomen bericht is geen waarneming van Maculis en krijgt dus geen punt.
  // Een digitale collega heeft al een eigen regel met lichtpunt eronder; dan hoeft de naam er
  // geen tweede te dragen. Een kaart in de RADAR-bak draagt hem hier: die staat er omdat Maculis
  // zelf iets opmerkte zonder dat iemand erom vroeg, en dat is precies een waarneming.
  // (`primary.needs` is alleen gevuld bij werk van een collega, dus dat veld kan deze vraag niet
  // beantwoorden; de bak van de kaart wel.)
  const byAgent = Boolean(c.primary.origin && c.primary.origin.kind === 'AGENT');
  const observed = !byAgent && c.bucket === 'RADAR';
  b.innerHTML =
    `<div class="row1">
       ${observed ? '<span class="mac-signal" aria-hidden="true"></span>' : ''}
       <span class="who">${esc(c.who)}</span>
       ${c.channel ? `<span class="chan">${esc(CHAN_ICO[c.channel] || '')} ${esc(humanLabel(CHANNEL_LABEL, c.channel))}</span>` : ''}
       <span class="go-chevron" aria-hidden="true">›</span>
     </div>
     ${attribution}
     <div class="line">${esc(c.primary.reason)}</div>
     ${secondary}
     ${chips.length ? `<div class="tags">${chips.join('')}</div>` : ''}`;
  // Colleague work touching this relation: proposal, evidence, and the actions the mandate allows.
  (c.work || []).forEach(w => b.appendChild(workBlock(w)));
  // Een klaargezette persoonlijke omgeving: de uitspraak die hij zelf las, en de enige beslissing.
  if (c.kamer) b.appendChild(kamerBlock(c.kamer, c.contactId));
  // Prepared work (follow-ups) touching this relation can be completed straight from the card.
  if (c.followUps && c.followUps.length) {
    const bar = el('div', 'prepared-actions');
    c.followUps.forEach(f => {
      const done = el('button', 'btn btn-ghost', 'Follow-up afronden');
      done.addEventListener('click', async (e) => {
        e.stopPropagation();
        done.disabled = true; done.textContent = 'Bezig…';
        const r = await api('/api/cockpit/followup/' + f.id + '/done', { method: 'POST' });
        if (r.ok) render(); else { done.disabled = false; done.textContent = 'Follow-up afronden'; }
      });
      bar.appendChild(done);
    });
    b.appendChild(bar);
  }
  bindEchoOpeners(b);
  const open = () => {
    if (c.contactId) { activeContactId = c.contactId; scn = 'dossier'; render(); }
    else if (c.conversationId) { activeConvId = c.conversationId; scn = 'gesprek'; render(); }
  };
  b.addEventListener('click', open);
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return b;
}

// How each piece of evidence is labelled, so a human can tell real external data from Scout's own
// reasoning at a glance. This is the trust invariant made visible.
const EV_KIND = {
  FACT: { label: 'feit', cls: 'fact' },
  OBSERVATION: { label: 'waarneming', cls: 'obs' },
  INFERENCE: { label: 'afleiding', cls: 'inf' },
  HYPOTHESIS: { label: 'hypothese', cls: 'hyp' },
};

// One evidence line: a kind chip, the text, and — for external observations — a linked source and any
// uncertainty Scout flagged (e.g. "naam kan een naamgenoot zijn").
function evItem(o) {
  if (o == null) return null;
  if (typeof o !== 'object') o = { kind: 'INFERENCE', text: String(o) };
  const meta = EV_KIND[o.kind] || EV_KIND.INFERENCE;
  const li = el('li', 'ev-item');
  const src = o.url
    ? ` <a class="ev-src" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">${esc(o.source || 'bron')}</a>`
    : (o.source ? ` <span class="ev-src">${esc(o.source)}</span>` : '');
  const unc = (o.uncertainties && o.uncertainties.length)
    ? `<div class="ev-unc">${esc([].concat(o.uncertainties).join('; '))}</div>` : '';
  li.innerHTML = `<span class="ev-k ${meta.cls}">${esc(meta.label)}</span><span class="ev-t">${esc(o.text || '')}${src}</span>${unc}`;
  return li;
}

// Collect evidence in a stable order: prefer the combined observations list (already FACT → external
// → inference → hypothesis); fall back to the structured arrays; tolerate legacy string observations.
function evidenceItems(ev) {
  const objs = Array.isArray(ev.observations) && ev.observations.some((o) => o && typeof o === 'object');
  if (objs) return ev.observations;
  const structured = [].concat(ev.facts || [], ev.external || [], ev.inferences || [], ev.hypotheses || []);
  if (structured.length) return structured;
  return Array.isArray(ev.observations) ? ev.observations : [];
}

// Fit is not the same as certainty about identity: keep them visually separate on the card.
// Canon 11: Maculis toont een ding, geen score. Geen percentage, geen meter. De
// onderbouwing leest als een woord; wat het betekent staat in de zin eronder.
function fitLabel(v) {
  if (typeof v !== 'number') return null;
  const word = v >= 0.6 ? 'sterk' : v >= 0.35 ? 'redelijk' : v > 0 ? 'zwak' : 'nog geen';
  const tone = v >= 0.6 ? 'hi' : v >= 0.35 ? 'mid' : 'lo';
  return { word, tone };
}
// Identity in human language: a main line plus a short explanation. The underlying epistemic status
// (unverified | probable | verified) is unchanged; this is presentation only, and it already covers
// all three states so a future 'geverifieerd' via KVK/KBO reads naturally here too.
const IDENTITY_UI = {
  verified: { main: 'Identiteit: geverifieerd', sub: 'Officieel register bevestigd', cls: 'id-ok' },
  probable: { main: 'Identiteit: waarschijnlijk dezelfde organisatie', sub: 'Eigen website bevestigd', cls: 'id-maybe' },
  unverified: { main: 'Identiteit: nog onbevestigd', sub: 'Alleen een naam-match, geen eigen bron bevestigd', cls: 'id-no' },
};
// Plain-language reason Scout only asks to look, or asks for approval.
function whyLine(needs, idStatus) {
  if (needs === 'approval') return 'Scout vraagt je akkoord: onderbouwing en identiteit zijn sterk genoeg.';
  if (idStatus === 'unverified') return 'Scout vraagt alleen om te kijken: de identiteit is nog niet bevestigd.';
  return 'Scout vraagt om te kijken. Jij beslist of dit de moeite waard is.';
}

// The human-in-the-loop actions. A proposed NEW relation can be adopted or dismissed; an
// existing-relation note (no proposedRelation) can only be dismissed. Approval stays a human act.
function workActions(w, onResolve) {
  const bar = el('div', 'prepared-actions');
  let acts;
  if (w.proposedRelation) {
    acts = w.needs === 'approval'
      ? [['approve', 'Opnemen', 'btn-primary'], ['reject', 'Afwijzen', 'btn-ghost']]
      : [['approve', 'Opnemen als prospect', 'btn-primary'], ['reject', 'Niet nu', 'btn-ghost']];
  } else {
    acts = (w.actions || []).filter((a) => a !== 'view').map((a) => [a, WORK_ACTION_LABEL[a] || a, a === 'approve' ? 'btn-primary' : 'btn-ghost']);
  }
  acts.forEach(([action, label, cls]) => {
    const btn = el('button', 'btn ' + cls, label);
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true; btn.textContent = 'Bezig…';
      const r = await api('/api/cockpit/work/' + w.id + '/' + action, { method: 'POST' });
      if (r.ok) { (onResolve || (() => render()))(); } else { btn.disabled = false; btn.textContent = label; }
    });
    bar.appendChild(btn);
  });
  return bar;
}

// A colleague's work item: what is proposed, how strong the fit is, whether we are sure of the
// identity, the evidence (honestly labelled), and the human-in-the-loop actions.
// onResolve defaults to a full re-render of Vandaag; the dossier passes its own refresh.
function workBlock(w, onResolve) {
  // Hier spreekt Maculis zelf: light.edge markeert dat op dit vlak iets onthuld wordt (canon 7).
  const wrap = el('div', 'work-block mac-edge');
  if (w.id) wrap.dataset.attnId = w.id;   // scroll target for the "Bekijk" jump after a Scout run
  const ev = w.evidence || {};
  if (w.proposal && w.proposal.summary) {
    const head = el('div', 'work-proposal');
    // De straal van het licht volgt het aantal gegronde signalen onder dit voorstel (canon 7).
    head.appendChild(signalPoint(groundedSignals(ev), { core: true }));
    head.appendChild(el('span', 'work-proposal-t mac-sharpen', esc(w.proposal.summary)));
    wrap.appendChild(head);
  }
  // A demonstration/fixture is marked unmistakably so it can never read as a real find.
  if (ev.demo) wrap.appendChild(el('div', 'work-demo', 'Demonstratie. Geen echte waarneming.'));

  // Fit and identity, distinct: "interessant" (fit) is not the same as "we weten zeker wie dit is".
  const fit = fitLabel(typeof ev.fitConfidence === 'number' ? ev.fitConfidence : ev.confidence);
  const idStatus = ev.identityStatus || null;
  const id = idStatus && IDENTITY_UI[idStatus];
  if (fit || id) {
    const box = el('div', 'work-assess');
    if (fit) box.appendChild(el('div', 'assess-row', `<span class="assess-k">Aanwijzingen dat dit past</span><span class="assess-v fit-${fit.tone}">${esc(fit.word)}</span>`));
    if (id) box.appendChild(el('div', 'assess-id', `<div class="assess-id-main ${id.cls}">${esc(id.main)}</div><div class="assess-id-sub">${esc(id.sub)}</div>`));
    wrap.appendChild(box);
  }

  const items = evidenceItems(ev).map(evItem).filter(Boolean);
  if (items.length) {
    const ul = el('ul', 'work-ev');
    items.slice(0, 6).forEach((li) => ul.appendChild(li));
    wrap.appendChild(ul);
  }

  const why = whyLine(w.needs, idStatus);
  if (why) wrap.appendChild(el('div', 'ev-foot', esc(why)));

  wrap.appendChild(workActions(w, onResolve));
  return wrap;
}

// Slice 4 — an open follow-up rendered as an actionable row (used in the dossier).
function followUpRow(f) {
  const row = el('div', 'fu-row');
  row.innerHTML = `<div class="fu-main"><span class="fu-k ${f.overdue ? 'overdue' : ''}">${f.overdue ? 'verlopen' : 'open'}</span><span class="fu-title">${esc(f.title)}</span></div>`;
  const done = el('button', 'linkbtn', 'Afronden');
  done.addEventListener('click', async () => {
    done.disabled = true; done.textContent = 'Bezig…';
    const r = await api('/api/cockpit/followup/' + f.id + '/done', { method: 'POST' });
    if (r.ok) renderDossier(activeContactId); else { done.disabled = false; done.textContent = 'Afronden'; }
  });
  row.appendChild(done);
  return row;
}

function tierHead(cls, label, hint) {
  const h = el('div', 'attn-head');
  h.innerHTML = `<span class="tier ${cls}"><span class="pip"></span><b>${esc(label)}</b></span>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}`;
  return h;
}

/* ---------- Dossier ---------- */
function provChip(cls) {
  const m = { A: ['in Maculis', 'a'], B: ['afgeleid', 'b'], C: ['toekomstig', 'c'] };
  const [lbl, k] = m[cls] || m.A;
  return `<span class="prov-chip ${k}">${lbl}</span>`;
}

async function renderDossier(contactId) {
  view.innerHTML = ''; // idempotent: also called directly after a memory action, not only via render()
  const { ok, data } = await api('/api/cockpit/relation/' + contactId);
  const wrap = el('div', 'view-enter wide');
  if (!ok) { wrap.appendChild(el('p', 'lead-note', 'Relatie niet gevonden.')); view.appendChild(wrap); return; }

  const crumbs = el('div', 'crumbs');
  const back = el('button', 'crumb-link', 'Vandaag'); back.addEventListener('click', () => { scn = 'vandaag'; render(); });
  crumbs.appendChild(back); crumbs.appendChild(el('span', 'crumb-sep', '›')); crumbs.appendChild(el('span', 'crumb-cur', data.identity.name));
  wrap.appendChild(crumbs);

  const id = data.identity;
  const idc = el('div', 'dos-id');
  idc.innerHTML =
    `<span class="dos-av">${esc(initials(id.name))}</span>
     <div class="dos-idmain"><div class="dos-name">${esc(id.name)}</div>
       <div class="dos-sub">${esc(id.role || 'Contactpersoon')}${id.org ? ' · ' + esc(id.org) : ''}</div></div>
     <div class="dos-meta">${id.stage ? `<span class="dos-stage">${esc(humanLabel(STAGE_LABEL, id.stage))}</span>` : ''}</div>`;
  wrap.appendChild(idc);

  // reachability zone (honest 3 layers; email is the only sendable channel in Slice 1)
  const rc = data.reachability || {};
  const reach = el('div', 'dos-reach');
  const parts = [];
  if (rc.email) parts.push(`<span class="reach-item"><span class="reach-ic">✉</span><span class="reach-v">${esc(rc.email.value)}</span></span>`);
  if (rc.phone) parts.push(`<span class="reach-item"><span class="reach-ic">☎</span><span class="reach-v">${esc(rc.phone.value)}</span></span>`);
  const cons = rc.consent && rc.consent.EMAIL;
  const consentHint = cons && cons.allowed === false ? '<span class="reach-consent out">E-mail: geen toestemming</span>' : '';
  reach.innerHTML = `<div class="reach-lines">${parts.join('')}${consentHint}</div>`;
  wrap.appendChild(reach);

  // NU — the SAME radar reason Vandaag shows (§ 20, één werkelijkheid).
  const now = el('section', 'dos-now');
  now.appendChild(el('div', 'dos-now-h', 'Wat speelt er nu'));
  const att = data.attention;
  if (att) {
    const bucketCls = att.bucket === 'NU' ? 'now' : 'ready';
    const item = el('div', 'dos-now-item ' + bucketCls);
    const secondary = (att.secondary || []).map(s => s.conversationId && s.conversationId !== att.conversationId
      ? `<button type="button" class="echo echo-open" data-conv="${esc(s.conversationId)}">${esc(s.reason)}</button>`
      : `<div class="echo">${esc(s.reason)}</div>`).join('');
    const canOpen = att.conversationId || data.primaryConversationId;
    item.innerHTML = `<div class="dni-top"><span class="chip ${bucketCls}"><span class="k"></span>${esc(att.reason)}</span></div>${secondary}`;
    if (canOpen) { const btn = el('button', 'btn btn-primary', 'Open het gesprek'); btn.addEventListener('click', () => { activeConvId = canOpen; scn = 'gesprek'; render(); }); item.appendChild(btn); }
    bindEchoOpeners(item);
    now.appendChild(item);
  } else if (data.now) {
    const item = el('div', 'dos-now-item now');
    const canOpen = data.primaryConversationId;
    item.innerHTML = `<div class="dni-top"><span class="chip now"><span class="k"></span>${esc(data.now.label || 'Vraagt aandacht')}</span></div>`;
    if (canOpen) { const btn = el('button', 'btn btn-primary', 'Open het gesprek'); btn.addEventListener('click', () => { activeConvId = data.primaryConversationId; scn = 'gesprek'; render(); }); item.appendChild(btn); }
    now.appendChild(item);
  } else { now.appendChild(el('p', 'muted', 'Er speelt nu niets bij deze relatie. Dat is ook een status.')); }
  wrap.appendChild(now);

  // sections
  const secWrap = el('div', 'dos-sections');
  const recWrap = el('div', '');
  secWrap.appendChild(dosSection('Gesprekshistorie', 'A', true, () => {
    const b = el('div', 'dos-timeline');
    if (!data.conversations.length) b.innerHTML = '<p class="muted">Nog geen gesprekken.</p>';
    data.conversations.forEach(cv => { b.innerHTML += `<div class="tl-ev"><span class="tl-when">${esc(humanLabel(CHANNEL_LABEL, cv.channel))}</span><p>${esc(cv.subject || 'Gesprek')} · ${esc(humanLabel(CONV_STATUS_LABEL, cv.status))}${cv.aiReady ? ' · concept klaar' : ''}</p></div>`; });
    return b;
  }, 'work'));
  // Observation vs durable memory, kept explicit.
  secWrap.appendChild(dosSection('Wat Maculis zag', 'B', true, () => {
    const b = el('div', 'dos-memory');
    if (!data.observed.length) b.innerHTML = '<p class="muted">Geen open observaties. Wat bevestigd is, staat onder Geheugen.</p>';
    data.observed.forEach(m => b.appendChild(memoryCard(m, true)));
    return b;
  }, 'voice'));
  secWrap.appendChild(dosSection('Geheugen', 'A', false, () => {
    const b = el('div', 'dos-memory');
    if (!data.remembered.length) b.innerHTML = '<p class="muted">Nog niets duurzaam onthouden.</p>';
    data.remembered.forEach(m => b.appendChild(memoryCard(m, false)));
    return b;
  }, 'voice'));
  secWrap.appendChild(dosSection('Open acties en follow-ups', 'A', false, () => {
    const b = el('div', 'dos-followups');
    const open = (data.followups || []).filter((f) => f.status !== 'done');
    if (!open.length) { b.innerHTML = '<p class="muted">Geen open acties.</p>'; return b; }
    open.forEach((f) => b.appendChild(followUpRow(f)));
    return b;
  }, 'work'));
  // Slice 5 — what colleagues (human or digital) prepared or proposed for this relation.
  const relWork = data.work || [];
  if (relWork.length) {
    secWrap.appendChild(dosSection('Werk van collega’s', 'A', true, () => {
      const b = el('div', 'dos-work');
      relWork.forEach((w) => {
        const head = el('div', 'colleague');
        head.innerHTML = `<span class="colleague-dot" aria-hidden="true"></span>${esc(w.origin.label)} ${esc(COLLEAGUE_VERB[w.needs] || 'heeft iets voor je')}: <b>${esc(w.title)}</b>`;
        b.appendChild(head);
        b.appendChild(workBlock(w, () => renderDossier(activeContactId)));
      });
      return b;
    }, 'voice'));
  }
  // Lens — a content-free relational hoofdlijn (Niveau C). Only the fact that this relation went
  // through the Lens; never reveal content, answers or personal reflections. Designed so a client-shared
  // insight ("1 inzicht door klant gedeeld") can appear later, once an explicit sharing consent exists.
  if (data.lens && data.lens.participated) {
    recWrap.appendChild(dosSection('Lens', 'A', false, () => {
      const b = el('div', 'dos-lens');
      const at = data.lens.completedAt || data.lens.startedAt;
      const when = at ? lensDate(at) : null;
      b.innerHTML = `<p class="lens-line">${data.lens.completedAt ? 'Doorlopen' : 'Gestart'}${when ? ' op ' + esc(when) : ''}.</p>`;
      if (data.lens.sharedCount > 0) {
        b.innerHTML += `<p class="lens-line">${data.lens.sharedCount} inzicht${data.lens.sharedCount === 1 ? '' : 'en'} door klant gedeeld.</p>`;
      }
      b.innerHTML += `<p class="dos-note">De Lens is van de klant. Alleen deze hoofdlijn is gedeeld. Antwoorden en persoonlijke reflectie blijven privé.</p>`;
      return b;
    }, 'record'));
  }
  recWrap.appendChild(dosSection('Contact en identiteiten', 'A', false, () => {
    const b = el('div', 'dos-facts');
    if (rc.email) b.innerHTML += `<div class="fact"><span class="k">e-mail</span><span class="v">${esc(rc.email.value)}</span></div>`;
    if (rc.phone) b.innerHTML += `<div class="fact"><span class="k">telefoon</span><span class="v">${esc(rc.phone.value)}</span></div>`;
    b.innerHTML += `<p class="dos-note">E-mail is het enige digitaal verzendbare kanaal in deze fase. Bellen is een menselijke actie. WhatsApp/SMS ${provChip('C')} volgen later.</p>`;
    return b;
  }, 'record'));
  // Volgorde naar betekenis: eerst wat Maculis ziet, dan het lopende werk. Dezelfde secties en
  // dezelfde inhoud, een andere rangorde. sort() is stabiel, dus binnen een rol blijft de volgorde.
  [...secWrap.children]
    .sort((a, b) => (a.classList.contains('is-voice') ? 0 : 1) - (b.classList.contains('is-voice') ? 0 : 1))
    .forEach((n) => secWrap.appendChild(n));
  wrap.appendChild(secWrap);
  // Het archief staat als groep onderaan: bereikbaar wanneer je ernaar zoekt, verder uit de weg.
  if (recWrap.children.length) {
    const rec = el('div', 'dos-records');
    rec.appendChild(el('div', 'dos-records-h', 'Dossier'));
    rec.appendChild(recWrap);
    wrap.appendChild(rec);
  }
  view.appendChild(wrap);
}

// De rol bepaalt het oppervlak, niet de inhoud. is-voice is waar Maculis zelf spreekt en
// draagt light.edge (canon 7); is-record is het archief en draagt alleen een hairline.
function dosSection(title, prov, open, bodyFn, role = 'work') {
  const sec = el('div', 'dos-sec is-' + role + (role === 'voice' ? ' mac-edge' : ''));
  const head = el('button', 'dos-sec-head');
  head.setAttribute('aria-expanded', String(open));
  head.innerHTML = `<span class="dss-title">${esc(title)}</span>${provChip(prov)}<span class="dss-arw">${open ? '▾' : '▸'}</span>`;
  const body = el('div', 'dos-sec-body' + (open ? '' : ' hidden'));
  body.appendChild(bodyFn());
  head.addEventListener('click', () => { const o = body.classList.toggle('hidden') === false; head.setAttribute('aria-expanded', String(o)); head.querySelector('.dss-arw').textContent = o ? '▾' : '▸'; });
  sec.appendChild(head); sec.appendChild(body);
  return sec;
}

function memoryCard(m, isObservation) {
  const c = el('div', 'mem');
  // Twee losse vragen, twee losse antwoorden. Waar komt dit vandaan, en wat telt het? Ze werden
  // eerder samengeperst tot één etiket, waardoor boven een uitspraak van de klant "AI-voorstel"
  // stond. Wie het las kon niet zien wie iets beweerde.
  const h = herkomstVan(m);
  const herkomst = `<span class="mem-herkomst">${esc(h.herkomst)}</span>`;
  const status = `<span class="${h.teBevestigen ? 'mem-open' : 'mem-conf'}">${esc(h.status)}</span>`;
  // Het lichtpunt staat voor een waarneming van Maculis zelf (canon 9, val 1). Wat de klant, een
  // collega of de Lens ons vertelde, is dat niet, en draagt het punt dus niet. Wat Maculis zelf zag
  // en al bevestigd is, is tot rust gekomen: hetzelfde punt, gedoofd (canon 2).
  const dot = h.vanMaculis
    ? `<span class="mac-signal${h.teBevestigen ? '' : ' is-rest'}" aria-hidden="true"></span>`
    : '';
  c.innerHTML = `<div class="mem-top">${dot}${herkomst}${status}<span class="mem-when">${esc(m.kind || '')}</span></div><p${isObservation ? ' class="mac-sharpen"' : ''}>${esc(m.content)}</p>`;
  if (isObservation) {
    const acts = el('span', 'mem-acts');
    const conf = el('button', 'linkbtn', 'Bevestigen');
    const rej = el('button', 'linkbtn', 'Verwerpen');
    conf.addEventListener('click', async () => { await api('/api/cockpit/memory/' + m.id + '/confirm', { method: 'POST' }); renderDossier(activeContactId); });
    rej.addEventListener('click', async () => { await api('/api/cockpit/memory/' + m.id, { method: 'DELETE' }); renderDossier(activeContactId); });
    acts.appendChild(conf); acts.appendChild(document.createTextNode(' · ')); acts.appendChild(rej);
    c.appendChild(acts);
  }
  return c;
}

/* ---------- Gesprek (thread + prepared draft + human-in-the-loop send) ---------- */
async function renderGesprek(convId) {
  view.innerHTML = ''; // idempotent: also called directly by the send-failure retry, not only via render()
  const { ok, data } = await api('/api/cockpit/conversation/' + convId);
  const wrap = el('div', 'view-enter wide');
  if (!ok) { wrap.appendChild(el('p', 'lead-note', 'Gesprek niet gevonden.')); view.appendChild(wrap); return; }
  const conv = data.conversation;

  const head = el('div', 'work-head');
  head.innerHTML = `<div class="eyebrow-line">Gesprek</div>`;
  if (conv.contactId) { const openRel = el('button', 'back-btn', `Open relatie: ${esc(conv.who)} →`); openRel.addEventListener('click', () => { activeContactId = conv.contactId; scn = 'dossier'; render(); }); head.appendChild(openRel); }
  wrap.appendChild(head);

  const grid = el('div', 'work-grid');
  const thread = el('div', 'thread');
  let msgs = '';
  data.messages.forEach(m => { msgs += `<div class="msg ${m.direction === 'OUTBOUND' ? 'out' : 'in'}"><div class="who">${esc(m.direction === 'OUTBOUND' ? 'Maculis · jij' : conv.who)} · ${esc(humanLabel(CHANNEL_LABEL, m.channel))}${m.delivery ? ' · ' + esc(humanLabel(DELIVERY_LABEL, m.delivery)) : ''}</div><div class="b">${esc(m.body_text || '')}</div></div>`; });
  thread.innerHTML = `<div class="th-head"><h2>${esc(conv.subject || 'Gesprek')}</h2><div class="meta">${esc(conv.who)}${conv.org ? ' · ' + esc(conv.org) : ''} · ${esc(humanLabel(CHANNEL_LABEL, conv.channel))} · ${esc(humanLabel(CONV_STATUS_LABEL, conv.status))}</div></div><div class="msgs">${msgs}</div>`;

  // Slice 2 — what Maculis reads in this thread, grounded in a real ai_draft. Only shown when a
  // reading exists; never an invented understanding.
  if (data.understanding) thread.appendChild(lensPanel(data.understanding));

  // Task context: what is relationally needed here, decided BEFORE any drafting.
  if (data.assessment && data.assessment.label) {
    const a = el('div', 'assess');
    a.innerHTML = `<span class="assess-k" aria-hidden="true">◆</span><b>${esc(data.assessment.label)}.</b> ${esc(data.assessment.reason || '')}`;
    thread.appendChild(a);
  }

  // composer / draft
  const composer = el('div', 'composer');
  thread.appendChild(composer);
  await renderComposer(composer, convId, data);

  // Slice 2 — prepared next moves. The human chooses; nothing auto-executes.
  if (data.nextMoves && data.nextMoves.length) thread.appendChild(movesPanel(convId, data.nextMoves));

  grid.appendChild(thread);
  wrap.appendChild(grid);
  view.appendChild(wrap);
}

function lensPanel(u) {
  const p = el('div', 'lens');
  p.innerHTML =
    `<div class="lens-h"><span aria-hidden="true">◐</span> Wat Maculis hierin ziet</div>
     <div class="lens-body">${esc(u.summary)}</div>
     ${u.intent ? `<div class="lens-intent"><span class="intent-chip now">${esc(u.intent)}</span></div>` : ''}`;
  return p;
}

function movesPanel(convId, moves) {
  const wrap = el('div', 'moves');
  wrap.appendChild(el('div', 'moves-h', 'Voorgestelde volgende stappen'));
  moves.forEach((m) => {
    const row = el('div', 'move');
    row.appendChild(el('span', 'move-lbl', esc(m.label)));
    if (m.executable) {
      const btn = el('button', 'btn btn-ghost', 'Overnemen');
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Bezig…';
        const r = await api('/api/cockpit/conversation/' + convId + '/next-move', { method: 'POST', body: JSON.stringify({ type: m.type, in_days: m.in_days }) });
        row.innerHTML = '';
        row.appendChild(el('span', 'move-lbl', esc(m.label)));
        row.appendChild(el('span', (r.ok && r.data && r.data.ok) ? 'move-done' : 'move-prepared',
          (r.ok && r.data && r.data.ok) ? '✓ Gepland' : 'Kon niet worden overgenomen'));
      });
      row.appendChild(btn);
    } else {
      row.appendChild(el('span', 'move-prepared', 'voorbereid'));
    }
    wrap.appendChild(row);
  });
  return wrap;
}

async function renderComposer(composer, convId, data) {
  composer.innerHTML = '';
  const consentBlocked = data.consent && data.consent.EMAIL && data.consent.EMAIL.allowed === false;
  let draft = data.workingDraft;

  if (!draft) {
    // no working draft yet — offer to open one (seeded from the AI proposal if present)
    const info = el('p', 'draftby', data.proposal ? 'Maculis heeft een concept voorbereid.' : 'Nog geen concept.');
    composer.appendChild(info);
    const openBtn = el('button', 'btn btn-primary', data.proposal ? 'Concept openen' : 'Concept schrijven');
    openBtn.addEventListener('click', async () => {
      const r = await api('/api/cockpit/conversation/' + convId + '/draft', { method: 'POST' });
      if (r.ok && r.data && r.data.draft) { data.workingDraft = r.data.draft; renderComposer(composer, convId, data); }
    });
    composer.appendChild(openBtn);
    return;
  }

  const ta = el('textarea'); ta.id = 'draft'; ta.rows = 10; ta.setAttribute('aria-label', 'Antwoord'); ta.value = draft.body || '';
  composer.appendChild(ta);
  const bar = el('div', 'bar');
  const note = el('span', 'draftby', draft.ai_generated ? 'Maculis stelde dit voor. Jij houdt het laatste woord.' : 'Jouw concept.');
  bar.appendChild(note);

  const warmer = el('button', 'btn btn-ghost', 'Warmer');
  const korter = el('button', 'btn btn-ghost', 'Korter');
  const send = el('button', 'btn btn-primary', 'Goedkeuren en verzenden');
  if (consentBlocked) { send.disabled = true; send.title = 'Geen toestemming voor e-mail'; }

  async function saveEdit() { const r = await api('/api/cockpit/draft/' + draft.id, { method: 'PATCH', body: JSON.stringify({ body: ta.value }) }); if (r.ok && r.data && r.data.draft) draft = r.data.draft; }
  async function revise(instruction) { await saveEdit(); const r = await api('/api/cockpit/draft/' + draft.id + '/revise', { method: 'POST', body: JSON.stringify({ instruction }) }); if (r.ok && r.data && r.data.draft) { draft = r.data.draft; ta.value = draft.body || ''; } }
  warmer.addEventListener('click', () => revise('warmer'));
  korter.addEventListener('click', () => revise('korter'));
  send.addEventListener('click', async () => {
    send.disabled = true; send.textContent = 'Bezig…';
    await saveEdit();
    const r = await api('/api/cockpit/draft/' + draft.id + '/send', { method: 'POST' });
    composer.innerHTML = '';
    if (r.ok && r.data && r.data.ok) {
      composer.appendChild(el('p', 'draftby', '✓ Verzonden. Het gesprek is bijgewerkt en valt weg uit Vandaag.'));
      await api('/api/cockpit/conversation/' + convId + '/settle', { method: 'POST' });
      const backBtn = el('button', 'btn btn-ghost', 'Terug naar Vandaag'); backBtn.addEventListener('click', () => { scn = 'vandaag'; render(); });
      composer.appendChild(backBtn);
    } else {
      const reason = (r.data && (r.data.reason || r.data.error)) || 'onbekend';
      const map = { consent_blocked: 'Geen toestemming voor dit kanaal.', no_recipient: 'Geen geldig e-mailadres.', empty_body: 'Het concept is leeg.', email_transport_not_configured: 'E-mailverzending is niet geconfigureerd.' };
      composer.appendChild(el('p', 'draftby', '✗ Niet verzonden: ' + (map[reason] || esc(reason)) + ' Het concept blijft staan.'));
      const retry = el('button', 'btn btn-ghost', 'Terug'); retry.addEventListener('click', () => renderGesprek(convId)); composer.appendChild(retry);
    }
  });
  bar.appendChild(warmer); bar.appendChild(korter); bar.appendChild(send);
  composer.appendChild(bar);
}

/* ---------- Relaties (real overview, searchable) ---------- */
async function renderRelaties() {
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(el('div', 'eyebrow-line', 'Relaties'));
  const bar = el('div', 'filterbar');
  bar.innerHTML = `<span class="search big"><span aria-hidden="true">⌕</span><input type="text" id="rel-q" placeholder="Zoek een naam of organisatie" aria-label="Zoek relatie"></span>`;
  wrap.appendChild(bar);
  const meta = el('div', 'work-meta'); wrap.appendChild(meta);
  const list = el('div', 'ck-list'); wrap.appendChild(list);
  view.appendChild(wrap);

  async function load(q) {
    const { ok, data } = await api('/api/cockpit/relations' + (q ? ('?q=' + encodeURIComponent(q)) : ''));
    list.innerHTML = '';
    if (!ok) { list.appendChild(el('p', 'lead-note', 'Kon relaties niet laden.')); return; }
    meta.innerHTML = `<span class="wm-count"><b>${data.count}</b> relatie${data.count === 1 ? '' : 's'}</span>`;
    if (!data.relations.length) { list.appendChild(el('p', 'muted', q ? 'Geen relatie gevonden.' : 'Nog geen relaties.')); return; }
    data.relations.forEach((r) => list.appendChild(relRow(r)));
  }
  const input = bar.querySelector('#rel-q');
  let t; input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => load(input.value.trim()), 180); });
  load('');
}

function relRow(r) {
  const row = el('article', 'conv'); row.tabIndex = 0; row.setAttribute('role', 'button');
  const hint = r.openConversations ? `${r.openConversations} open gesprek${r.openConversations === 1 ? '' : 'ken'}` : (r.email || '');
  const chips = [];
  if (r.openConversations) chips.push(`<span class="chip now"><span class="k"></span>${r.openConversations} open</span>`);
  if (r.stage) chips.push(`<span class="chip">${esc(humanLabel(STAGE_LABEL, r.stage))}</span>`);
  row.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(r.name))}</span>
     <div class="conv-main">
       <div class="conv-top"><span class="conv-who">${esc(r.name)}</span></div>
       ${r.org ? `<div class="conv-org">${esc(r.org)}</div>` : ''}
       ${hint ? `<div class="conv-snip">${esc(hint)}</div>` : ''}
       ${chips.length ? `<div class="conv-tags">${chips.join('')}</div>` : ''}
     </div>`;
  const open = () => { activeContactId = r.contactId; scn = 'dossier'; render(); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return row;
}

/* ---------- Gesprekken (real overview) ---------- */
async function renderGesprekken() {
  const { ok, data } = await api('/api/cockpit/conversations');
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(el('div', 'eyebrow-line', 'Gesprekken'));
  if (!ok) { wrap.appendChild(el('p', 'lead-note', 'Kon gesprekken niet laden.')); view.appendChild(wrap); return; }
  const meta = el('div', 'work-meta'); meta.innerHTML = `<span class="wm-count"><b>${data.count}</b> gesprek${data.count === 1 ? '' : 'ken'}</span>`; wrap.appendChild(meta);
  const list = el('div', 'ck-list');
  if (!data.conversations.length) list.appendChild(el('p', 'muted', 'Nog geen gesprekken.'));
  data.conversations.forEach((c) => list.appendChild(gespRow(c)));
  wrap.appendChild(list);
  view.appendChild(wrap);
}

function gespRow(c) {
  // Canon 10: een pil in een dichte context, een linkerrand in een rustige. Een gesprek dat niets
  // van je vraagt en waarvoor niets klaarstaat, draagt geen eigen vlak. Zo weegt de lijst naar
  // betekenis in plaats van naar aantal.
  const quiet = !c.waitingOnUs && !c.hasPrepared;
  const row = el('article', 'conv' + (quiet ? ' is-quiet' : '')); row.tabIndex = 0; row.setAttribute('role', 'button');
  const chips = [];
  if (c.hasPrepared) chips.push('<span class="chip ready"><span class="k"></span>concept klaar</span>');
  if (c.waitingOnUs) chips.push('<span class="chip now"><span class="k"></span>wacht op jou</span>');
  if (!c.waitingOnUs && !c.hasPrepared) chips.push(`<span class="chip">${esc(humanLabel(CONV_STATUS_LABEL, c.status))}</span>`);
  const snip = c.subject
    ? `<b>${esc(c.subject)}</b>${c.preview ? ' · ' + esc(c.preview) : ''}`
    : (c.preview ? esc(c.preview) : '');
  row.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(c.who))}</span>
     <div class="conv-main">
       <div class="conv-top">
         <span class="conv-who">${esc(c.who)}</span>
         <span class="conv-chan">${esc(CHAN_ICO[c.channel] || '')} ${esc(humanLabel(CHANNEL_LABEL, c.channel))}</span>
       </div>
       ${c.org ? `<div class="conv-org">${esc(c.org)}</div>` : ''}
       ${snip ? `<div class="conv-snip">${snip}</div>` : ''}
       <div class="conv-tags">${chips.join('')}</div>
     </div>`;
  const open = () => { activeConvId = c.conversationId; scn = 'gesprek'; render(); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return row;
}

/* ---------- Mijn Maculis: de kamer die op één beslissing wacht (ADR-0003 D4) ----------

   Eén menselijke bevestiging, daarna voert Maculis de rest uit: de uitnodiging wordt gemaakt,
   verstuurd op het gekozen kanaal, de kamer gaat op `uitgenodigd` en de historie wordt vastgelegd.
   De medewerker doet geen tweede stap en kopieert geen link.

   WAT HIER MET OPZET ONTBREEKT

     * een manier om de uitspraak te wijzigen of aan te vullen. `Amplify, do not author` is hier een
       bevoegdheidsgrens: wat in zijn omgeving staat moet zijn wat hij werkelijk zag;
     * een activatieknop bij `wacht_op_contact`. Hij gaf geen toestemming om benaderd te worden, en
       een knop die altijd weigert verplaatst die grens van de architectuur naar de discipline van
       de medewerker;
     * een kanaal dat wordt gekozen door Maculis. De medewerker kiest, want de toestemming uit de
       Lens ging over benaderen en niet over WhatsApp. */

const KAMER_KANAAL = { WHATSAPP: 'WhatsApp', EMAIL: 'e-mail' };
const KAMER_REDEN = {
  geen_adres: 'geen adres bekend',
  geen_transport: 'op deze omgeving niet ingesteld',
  geen_toestemming: 'geen toestemming voor dit kanaal',
};
const KAMER_FOUT = {
  no_contact_consent: 'Deze ondernemer gaf geen toestemming om benaderd te worden. Er gaat niets uit.',
  already_open: 'Er loopt al een geldige uitnodiging. Er is niets opnieuw verstuurd.',
  wrong_status: 'Deze omgeving is al actief of ingetrokken.',
  no_contact: 'Er is geen persoon aan deze omgeving gekoppeld.',
  no_public_url: 'De publieke URL van Mijn Maculis is niet ingesteld, dus er valt geen werkende link te maken.',
  consent_blocked: 'De toestemming voor dit kanaal staat dit niet toe.',
  no_recipient: 'Er is geen adres voor dit kanaal.',
  unknown_channel: 'Dit kanaal bestaat niet voor Mijn Maculis.',
  send_failed: 'Versturen is niet gelukt. Er is niets aangekomen en je kunt het opnieuw proberen.',
  empty_body: 'Er viel niets te versturen. Probeer het opnieuw.',
  privacy_email_only: 'Dit kanaal kan hier niet gebruikt worden.',
  unsupported_channel: 'Dit kanaal kan niets bezorgen.',
  not_found: 'Deze omgeving bestaat niet meer.',
};

function kamerBlock(k, contactId) {
  const box = el('div', 'kamerblok');
  if (k.uitspraak) box.appendChild(el('blockquote', 'kamer-uitspraak', esc(k.uitspraak)));

  if (k.status === 'wacht_op_contact') {
    box.appendChild(el('p', 'kamer-note', 'Hij gaf geen toestemming om benaderd te worden. De omgeving staat klaar en er gaat niets uit.'));
    return box;
  }

  const bar = el('div', 'prepared-actions kamer-acties');
  const melding = el('p', 'kamer-note'); melding.hidden = true;
  const mogelijk = (k.kanalen || []).filter(x => x.mogelijk);
  const geblokkeerd = (k.kanalen || []).filter(x => !x.mogelijk);

  async function activeer(btn, kanaal) {
    [...bar.querySelectorAll('button')].forEach(x => { x.disabled = true; });
    btn.textContent = 'Bezig…';
    const r = await api('/api/comm/mijn/kamers/' + k.id + '/uitnodigen', {
      method: 'POST', body: JSON.stringify(kanaal ? { kanaal } : {}),
    });
    if (r.ok && r.data && r.data.ok) {
      if (r.data.bezorging === 'handmatig') {
        // Er staat geen transport aan. We melden dus NIET dat er iets verstuurd is, want dat is niet
        // zo. De omgeving is actief en de link staat hier, zodat de medewerker hem zelf doorgeeft.
        bar.innerHTML = '';
        melding.hidden = false;
        melding.textContent = 'De omgeving is geactiveerd. Er staat op deze omgeving geen verzendkanaal aan, dus er is niets verstuurd. Deze link is eenmalig en zeven dagen geldig.';
        const veld = el('input', 'kamer-link'); veld.readOnly = true; veld.value = r.data.link || '';
        box.appendChild(veld); veld.select();
        return;
      }
      render();
      return;
    }
    const code = (r.data && r.data.error) || 'send_failed';
    melding.hidden = false;
    // Mislukte verzending: de server heeft de uitnodiging ingetrokken, dus de omgeving staat er nog
    // en de knoppen gaan gewoon weer aan. Opnieuw proberen is hier de bedoeling en geen doorbraak
    // van een grens: er is niets aangekomen en er ontstaat geen tweede uitnodiging.
    melding.textContent = KAMER_FOUT[code]
      || (r.data && r.data.opnieuwMogelijk ? 'Activeren is niet gelukt. Je kunt het opnieuw proberen.' : 'Activeren is niet gelukt.');
    [...bar.querySelectorAll('button')].forEach(x => { x.disabled = false; });
    btn.textContent = btn.dataset.label || 'Activeer Mijn Maculis';
  }

  const bekijk = el('button', 'btn btn-ghost', 'Bekijk');
  bekijk.addEventListener('click', (e) => {
    e.stopPropagation();
    if (contactId) { activeContactId = contactId; scn = 'dossier'; render(); }
  });
  bar.appendChild(bekijk);

  if (mogelijk.length) {
    for (const ch of mogelijk) {
      const label = `Activeer via ${KAMER_KANAAL[ch.kanaal] || ch.kanaal}`;
      const b = el('button', 'btn btn-primary', label);
      b.dataset.label = label;
      b.addEventListener('click', (e) => { e.stopPropagation(); activeer(b, ch.kanaal); });
      bar.appendChild(b);
    }
  } else {
    // Geen enkel kanaal kan werkelijk bezorgen. De knop belooft dan ook niets anders dan wat er
    // gebeurt: de omgeving gaat open en de link komt hier te staan.
    const label = 'Activeer en toon de link';
    const b = el('button', 'btn btn-primary', label);
    b.dataset.label = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); activeer(b, null); });
    bar.appendChild(b);
  }

  // Uitstellen verandert niets aan de werkelijkheid: de omgeving blijft klaarstaan en de kaart komt
  // terug. Daarom slaat deze knop niets op; hij vouwt alleen dit ene beeld dicht.
  const later = el('button', 'btn btn-ghost', 'Later');
  later.addEventListener('click', (e) => {
    e.stopPropagation();
    bar.innerHTML = '';
    melding.hidden = false;
    melding.textContent = 'Blijft klaarstaan tot je beslist.';
  });
  bar.appendChild(later);

  box.appendChild(bar);
  box.appendChild(melding);
  if (geblokkeerd.length) {
    box.appendChild(el('p', 'kamer-note', geblokkeerd
      .map(x => `${KAMER_KANAAL[x.kanaal] || x.kanaal}: ${KAMER_REDEN[x.reden] || 'niet beschikbaar'}`).join(' · ')));
  }
  return box;
}
/* ---------- Beheer: de hele administratieve laag, in de Cockpit ----------

   Vanaf hier is de Cockpit de enige interne voordeur. Alles wat een medewerker aan de campagne doet,
   gebeurt hier: testers, uitnodigingen, evaluaties, inzichten en historie.

   GEEN NIEUWE DATABRON. Elk paneel hieronder praat met een route die al bestond en al getest was:
   /api/invitations, /api/invite/email, /api/publish, /api/import/*, /api/evaluations en
   /api/invitations/:id/history. De oude tool op /index.html blijft technisch bestaan als
   achterliggend onderdeel, maar is niet langer de weg van een mens.

   DRIE GRENZEN DIE MEE ZIJN VERHUISD EN NIET MOGEN VERSIMPELEN

     * toestemming met de hand vastleggen kan alleen mét de wijze waarop die is verkregen, en
       "anders" vraagt om een toelichting. Intrekken vraagt om een bevestiging;
     * WhatsApp openen verandert de status NIET. Pas wanneer een mens bevestigt dat hij werkelijk
       heeft verstuurd, gaat de tester op Verstuurd. Twee stappen, met opzet;
     * zonder verzendend transport wordt er niet gedaan alsof. Dan meldt het scherm dat er niets is
       verstuurd en dat er niemand op Uitgenodigd staat.

   En één grens die uit de Cockpit zelf komt: een tester is geen Maculis-relatie. Dit paneel schrijft
   in de administratie van de campagne en raakt de relationele laag nergens aan. */

const BEHEER_TABS = [
  ['testers', 'Testerbeheer'],
  ['uitnodigingen', 'Uitnodigingen'],
  ['evaluaties', 'Evaluaties'],
  ['inzichten', 'Inzichten'],
  ['historie', 'Historie'],
];
let beheerTab = 'testers';
let beheerTester = null;   // de tester waarvoor Historie en Inzichten openstaan

const TESTER_STATUS = {
  DRAFT: ['concept', ''], SENT: ['uitgenodigd', 'ready'], INVITED: ['uitgenodigd', 'ready'],
  OPENED: ['geopend', 'ready'], COMPLETED: ['afgerond', 'ready'],
  DECLINED: ['afgewezen', 'now'], ERROR: ['fout', 'now'],
};
const TESTER_CONSENT = { OPTED_IN: ['toestemming', 'ready'], OPTED_OUT: ['geen toestemming', 'now'], UNKNOWN: ['toestemming onbekend', ''] };
const EVAL_STATUS = { NOT_STARTED: ['niet gestart', ''], IN_PROGRESS: ['bezig', ''], COMPLETED: ['afgerond', 'ready'] };
const CONSENT_METHODE = { VERBAL: 'Mondeling', PHONE: 'Telefonisch', EMAIL: 'Per e-mail', WHATSAPP: 'Via WhatsApp', WRITTEN: 'Schriftelijk', OTHER: 'Anders' };
const HIST_EVENT = {
  tester_created: 'Tester aangemaakt', invitation_sent: 'Uitnodiging verstuurd',
  invitation_failed: 'Uitnodiging mislukt', invitation_skipped: 'Uitnodiging overgeslagen',
  invitation_blocked: 'Uitnodiging geblokkeerd', journey_started: 'Journey gestart',
  evaluation_started: 'Evaluatie gestart', evaluation_completed: 'Evaluatie afgerond',
  consent_recorded: 'Toestemming vastgelegd', consent_changed: 'Toestemming gewijzigd',
  published_to_maculis: 'Gepubliceerd naar Maculis', publish_to_maculis_failed: 'Publiceren naar Maculis mislukt',
  keep_consent_recorded: 'Bewaartoestemming vastgelegd', mijn_room_prepared: 'Persoonlijke omgeving klaargezet',
  mijn_maculis_invited: 'Mijn Maculis uitnodiging verstuurd', pass_the_lens_introduction: 'Aangedragen via Pass the Lens',
};
const HIST_REDEN = {
  no_data_dir: 'geen schrijfbare opslag bij de Lens', not_configured: 'koppeling niet ingesteld',
  forbidden: 'sleutel geweigerd', network: 'Lens niet bereikbaar', timeout: 'Lens reageerde niet op tijd',
  http: 'onverwacht antwoord van de Lens', exception: 'onverwachte fout',
};
const HIST_KANAAL = { whatsapp: 'WhatsApp', email: 'E-mail' };

// Alles wat Beheer nodig heeft, in één ophaalslag. `/api/invitations` synchroniseert onderweg met de
// Lens, precies zoals Vandaag dat doet, dus dit scherm is nooit ouder dan de radar.
const beheerData = { testers: [], cfg: null, evals: null, geladen: false };
async function laadBeheer({ opnieuw = false } = {}) {
  if (beheerData.geladen && !opnieuw) return beheerData;
  const [inv, cfg] = await Promise.all([api('/api/invitations'), api('/api/config')]);
  beheerData.testers = (inv.ok && inv.data && inv.data.invitations) || [];
  beheerData.cfg = (cfg.ok && cfg.data) || {};
  beheerData.geladen = true;
  return beheerData;
}
async function laadEvaluaties({ opnieuw = false } = {}) {
  if (beheerData.evals && !opnieuw) return beheerData.evals;
  const r = await api('/api/evaluations');
  beheerData.evals = (r.ok && r.data) || { evaluations: [], questions: [], ok: false, reason: 'unknown' };
  return beheerData.evals;
}
const testerNaam = (r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || r.company_name || 'Onbekend';
function beheerTijd(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '—'; }
}
function beheerMelding(box, tekst, soort = '') {
  box.className = 'beheer-melding' + (soort ? ' ' + soort : '');
  box.textContent = tekst;
  box.hidden = !tekst;
}

async function renderBeheer() {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(el('div', 'eyebrow-line', 'Beheer'));
  const titel = (BEHEER_TABS.find(([k]) => k === beheerTab) || [null, 'Beheer'])[1];
  wrap.appendChild(el('h1', 'work-h1', titel));

  const nav = el('nav', 'beheer-tabs');
  nav.setAttribute('aria-label', 'Beheeronderdelen');
  for (const [key, label] of BEHEER_TABS) {
    const b = el('button', 'beheer-tab' + (key === beheerTab ? ' on' : ''), esc(label));
    if (key === beheerTab) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => { beheerTab = key; render(); });
    nav.appendChild(b);
  }
  wrap.appendChild(nav);

  const paneel = el('div', 'beheer-paneel');
  paneel.appendChild(el('p', 'lead-note', 'Laden…'));
  wrap.appendChild(paneel);
  view.appendChild(wrap);

  const data = await laadBeheer();
  paneel.innerHTML = '';
  if (beheerTab === 'testers') return paneelTesters(paneel, data);
  if (beheerTab === 'uitnodigingen') return paneelUitnodigingen(paneel, data);
  if (beheerTab === 'evaluaties') return paneelEvaluaties(paneel);
  if (beheerTab === 'inzichten') return paneelInzichten(paneel);
  return paneelHistorie(paneel, data);
}

/* ---------- Testerbeheer ---------- */

function paneelTesters(paneel, data) {
  paneel.appendChild(el('p', 'beheer-lead mac-sharpen', 'Wie Maculis mag proberen, staat hier.'));
  paneel.appendChild(el('p', 'lead-note', 'Administratief. Testers en toestemming voor de campagne. Dit staat los van je relaties: een tester wordt hier geen Maculis-relatie.'));

  const melding = el('p', 'beheer-melding'); melding.hidden = true;

  const form = el('form', 'beheer-add');
  form.innerHTML = `
    <input type="text" id="ba-first" placeholder="Voornaam" aria-label="Voornaam" required>
    <input type="text" id="ba-last" placeholder="Achternaam" aria-label="Achternaam">
    <input type="text" id="ba-org" placeholder="Organisatie" aria-label="Organisatie">
    <input type="email" id="ba-email" placeholder="E-mail" aria-label="E-mail">
    <input type="text" id="ba-mobile" placeholder="Mobiel" aria-label="Mobiel">
    <button class="btn btn-primary" type="submit">Tester toevoegen</button>`;
  paneel.appendChild(form);
  paneel.appendChild(melding);

  const bar = el('div', 'ck-meta');
  const meta = el('div', 'wm-meta');
  bar.appendChild(meta);
  const zoek = el('span', 'search big', '<span aria-hidden="true">⌕</span><input type="text" id="t-q" placeholder="Zoek een tester of organisatie" aria-label="Zoek tester">');
  bar.appendChild(zoek);
  paneel.appendChild(bar);

  const lijst = el('div', 'ck-list');
  paneel.appendChild(lijst);

  function teken(q) {
    const naald = (q || '').toLowerCase();
    const rijen = data.testers.filter((r) => !naald
      || `${r.first_name || ''} ${r.last_name || ''} ${r.company_name || ''} ${r.email || ''}`.toLowerCase().includes(naald));
    lijst.innerHTML = '';
    meta.innerHTML = `<span class="wm-count"><b>${rijen.length}</b> tester${rijen.length === 1 ? '' : 's'}</span>`;
    if (!rijen.length) { lijst.appendChild(el('p', 'muted', data.testers.length ? 'Geen tester gevonden.' : 'Nog geen testers. Voeg er hierboven een toe of importeer onder Uitnodigingen.')); return; }
    rijen.forEach((r) => lijst.appendChild(testerRij(r, data)));
  }
  let t;
  zoek.querySelector('#t-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => teken(e.target.value.trim()), 150); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    beheerMelding(melding, '');
    const body = {
      first_name: form.querySelector('#ba-first').value.trim(),
      last_name: form.querySelector('#ba-last').value.trim(),
      company_name: form.querySelector('#ba-org').value.trim(),
      email: form.querySelector('#ba-email').value.trim(),
      mobile: form.querySelector('#ba-mobile').value.trim(),
    };
    const r = await api('/api/invitations', { method: 'POST', body: JSON.stringify(body) });
    if (!r.ok) { beheerMelding(melding, (r.data && r.data.error) || 'Kon tester niet toevoegen.', 'fout'); return; }
    form.reset();
    await laadBeheer({ opnieuw: true });
    render();
  });
  teken('');
}

function testerRij(r, data) {
  const rij = el('article', 'conv beheer-rij');
  const naam = testerNaam(r);
  const [stLbl, stCls] = TESTER_STATUS[r.status] || [(r.status || '').toLowerCase(), ''];
  const [csLbl, csCls] = TESTER_CONSENT[r.consent_status] || ['', ''];
  const chips = [`<span class="chip ${stCls}"><span class="k"></span>${esc(stLbl)}</span>`];
  if (csLbl) chips.push(`<span class="chip ${csCls}">${esc(csLbl)}</span>`);
  if (r.campaign) chips.push(`<span class="chip">${esc(r.campaign)}</span>`);
  const contact = r.email || r.mobile || '';
  rij.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(naam))}</span>
     <div class="conv-main">
       <div class="conv-top"><span class="conv-who">${esc(naam)}</span></div>
       ${r.company_name ? `<div class="conv-org">${esc(r.company_name)}</div>` : ''}
       ${contact ? `<div class="conv-snip">${esc(contact)}</div>` : ''}
       <div class="conv-tags">${chips.join('')}</div>
     </div>`;

  const acties = el('div', 'prepared-actions beheer-acties');
  const bewerk = el('button', 'btn btn-ghost', 'Bewerken');
  bewerk.addEventListener('click', () => {
    const open = rij.querySelector('.beheer-edit');
    if (open) { open.remove(); return; }
    rij.appendChild(bewerkPaneel(r, data));
  });
  acties.appendChild(bewerk);

  const hist = el('button', 'btn btn-ghost', 'Historie');
  hist.addEventListener('click', () => { beheerTester = r.id; beheerTab = 'historie'; render(); });
  acties.appendChild(hist);

  if (r.token && data.cfg && data.cfg.maculisPublicUrl) {
    const kopie = el('button', 'btn btn-ghost', 'Kopieer persoonlijke link');
    kopie.addEventListener('click', async () => {
      // `?p=`, en nooit iets anders. Dit MOET gelijk zijn aan personalUrl() in server/tokens.mjs.
      // Stond hier ooit `?t=`, en dat is de gevaarlijkste soort fout die dit systeem kent: de link
      // opent gewoon, de Lens start gewoon, en de ondernemer loopt de hele ervaring door. Alleen
      // hoort die sessie dan bij niemand. Geen naam, geen koppeling terug, en de bewaartoestemming
      // landt nergens. De keten stopt stil en niets meldt dat. Een test bewaakt deze regel.
      const url = `${String(data.cfg.maculisPublicUrl).replace(/\/+$/, '')}/?p=${encodeURIComponent(r.token)}`;
      try { await navigator.clipboard.writeText(url); kopie.textContent = 'Gekopieerd'; }
      catch { kopie.textContent = url; }
    });
    acties.appendChild(kopie);
  }
  rij.appendChild(acties);
  return rij;
}

// Bewerken, status en toestemming in één paneel, met dezelfde regels als de tool waar dit vandaan
// komt. Toestemming is een eigen dimensie naast status: die twee worden hier nooit één veld.
function bewerkPaneel(r, data) {
  const box = el('div', 'beheer-edit');
  const statussen = (data.cfg && data.cfg.statuses) || ['DRAFT', 'SENT', 'OPENED', 'COMPLETED', 'DECLINED', 'ERROR'];
  box.innerHTML = `
    <div class="edit-grid">
      <label>Voornaam<input type="text" data-f="first_name" value="${esc(r.first_name || '')}"></label>
      <label>Achternaam<input type="text" data-f="last_name" value="${esc(r.last_name || '')}"></label>
      <label>Organisatie<input type="text" data-f="company_name" value="${esc(r.company_name || '')}"></label>
      <label>Domein<input type="text" data-f="domain" value="${esc(r.domain || '')}"></label>
      <label>E-mail<input type="email" data-f="email" value="${esc(r.email || '')}"></label>
      <label>Mobiel<input type="text" data-f="mobile" value="${esc(r.mobile || '')}"></label>
      <label class="edit-breed">Notitie<input type="text" data-f="notes" value="${esc(r.notes || '')}"></label>
      <label>Status<select data-f="status">${statussen.map((s) => `<option value="${esc(s)}"${s === r.status ? ' selected' : ''}>${esc((TESTER_STATUS[s] || [s])[0])}</option>`).join('')}</select></label>
      <label>Toestemming<select data-f="consent">${['UNKNOWN', 'OPTED_IN', 'OPTED_OUT'].map((c) => `<option value="${c}"${c === r.consent_status ? ' selected' : ''}>${esc((TESTER_CONSENT[c] || [c])[0])}</option>`).join('')}</select></label>
      <label class="edit-methode" hidden>Hoe is die toestemming gegeven?<select data-f="methode">
        <option value="">Kies…</option>
        ${Object.entries(CONSENT_METHODE).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
      </select></label>
      <label class="edit-anders edit-breed" hidden>Toelichting<input type="text" data-f="anders" placeholder="Korte toelichting op de toestemmingswijze"></label>
    </div>`;
  const melding = el('p', 'beheer-melding'); melding.hidden = true;
  const veld = (f) => box.querySelector(`[data-f="${f}"]`);

  function toonMethode() {
    const nieuw = veld('consent').value;
    box.querySelector('.edit-methode').hidden = !(nieuw === 'OPTED_IN' && nieuw !== r.consent_status);
    box.querySelector('.edit-anders').hidden = !(box.querySelector('.edit-methode').hidden === false && veld('methode').value === 'OTHER');
  }
  veld('consent').addEventListener('change', toonMethode);
  veld('methode').addEventListener('change', toonMethode);
  toonMethode();

  const acties = el('div', 'prepared-actions');
  const opslaan = el('button', 'btn btn-primary', 'Opslaan');
  opslaan.addEventListener('click', async () => {
    beheerMelding(melding, '');
    opslaan.disabled = true;
    try {
      const patch = {};
      for (const f of ['first_name', 'last_name', 'company_name', 'domain', 'email', 'mobile', 'notes']) patch[f] = veld(f).value.trim();
      const p = await api(`/api/invitations/${r.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      if (!p.ok) throw new Error((p.data && p.data.error) || 'Opslaan mislukt.');

      // Een status met de hand zetten is een administratieve correctie, geen normale gang van zaken:
      // statussen komen uit echte gebeurtenissen. Daarom een expliciete bevestiging.
      const nieuweStatus = veld('status').value;
      if (nieuweStatus && nieuweStatus !== r.status) {
        const ok = confirm(`Status administratief corrigeren van ${r.status} naar ${nieuweStatus}?\n\nNormale statussen komen automatisch uit systeemgebeurtenissen.`);
        if (ok) await api(`/api/invitations/${r.id}/status`, { method: 'POST', body: JSON.stringify({ status: nieuweStatus }) });
      }

      // Toestemming: fail-closed. Met de hand vastleggen kan alleen mét de wijze waarop die is
      // verkregen, en intrekken vraagt om een bevestiging omdat het uitnodigen blokkeert.
      const nieuwConsent = veld('consent').value;
      if (nieuwConsent && nieuwConsent !== r.consent_status) {
        const body = { consent_status: nieuwConsent, consent_source: 'manual' };
        let door = true;
        if (nieuwConsent === 'OPTED_IN') {
          const m = veld('methode').value;
          if (!m) throw new Error('Kies hoe de toestemming is verkregen.');
          body.consent_method = m;
          if (m === 'OTHER') {
            const toel = veld('anders').value.trim();
            if (!toel) throw new Error('Kies "Anders": geef een korte toelichting op de toestemmingswijze.');
            body.consent_note = toel;
          }
        }
        if (nieuwConsent === 'OPTED_OUT') {
          door = confirm('Toestemming intrekken: deze tester wordt geblokkeerd voor uitnodigingen en voor publicatie naar Maculis. Registreren?');
        }
        if (door) {
          const c = await api(`/api/invitations/${r.id}/consent`, { method: 'POST', body: JSON.stringify(body) });
          if (!c.ok) throw new Error((c.data && c.data.error) || 'Toestemming vastleggen mislukt.');
        }
      }
      await laadBeheer({ opnieuw: true });
      render();
    } catch (ex) {
      beheerMelding(melding, ex.message || 'Opslaan mislukt.', 'fout');
      opslaan.disabled = false;
    }
  });
  acties.appendChild(opslaan);

  const weg = el('button', 'btn btn-ghost', 'Verwijderen');
  weg.addEventListener('click', async () => {
    if (!confirm(`${testerNaam(r)} verwijderen? De historie van deze tester verdwijnt mee.`)) return;
    const d = await api(`/api/invitations/${r.id}`, { method: 'DELETE' });
    if (!d.ok) { beheerMelding(melding, (d.data && d.data.error) || 'Verwijderen mislukt.', 'fout'); return; }
    await laadBeheer({ opnieuw: true });
    render();
  });
  acties.appendChild(weg);

  box.appendChild(acties);
  box.appendChild(melding);
  return box;
}

/* ---------- Uitnodigingen ---------- */

function paneelUitnodigingen(paneel, data) {
  paneel.appendChild(el('p', 'beheer-lead mac-sharpen', 'De uitnodiging naar de Lens.'));
  paneel.appendChild(el('p', 'lead-note', 'Per tester, met de toestemming ernaast. Er gaat nooit iets uit zonder dat jij erop klikt.'));

  const cfg = data.cfg || {};
  if (!cfg.maculisConfigured) {
    paneel.appendChild(el('p', 'beheer-melding waarschuwing', 'De sync naar de Lens is niet ingesteld, dus een tester komt daar niet met naam aan. Publiceren werkt niet.'));
  }
  if (!cfg.mailConfigured) {
    paneel.appendChild(el('p', 'beheer-melding waarschuwing', 'Er staat op deze omgeving geen verzendend mailtransport. Een e-mailuitnodiging wordt dan niet werkelijk verstuurd en niemand komt op Uitgenodigd.'));
  }

  const importeer = el('div', 'beheer-import');
  importeer.innerHTML = '<label class="btn btn-ghost">Testers importeren<input type="file" accept=".csv,.xlsx,.xls" hidden></label>';
  const impMelding = el('p', 'beheer-melding'); impMelding.hidden = true;
  importeer.appendChild(impMelding);
  importeer.querySelector('input').addEventListener('change', async (e) => {
    const bestand = e.target.files && e.target.files[0];
    if (!bestand) return;
    beheerMelding(impMelding, 'Bestand lezen…');
    try {
      const base64 = await new Promise((ok, mis) => {
        const rd = new FileReader();
        rd.onload = () => ok(String(rd.result).split(',')[1] || '');
        rd.onerror = () => mis(new Error('Kon het bestand niet lezen.'));
        rd.readAsDataURL(bestand);
      });
      const ext = (bestand.name.split('.').pop() || '').toLowerCase();
      const herkomst = (ext === 'xlsx' || ext === 'xls') ? 'xlsx' : (ext === 'csv' ? 'csv' : 'import');
      const pv = await api('/api/import/preview', {
        method: 'POST',
        body: JSON.stringify({ filename: bestand.name, contentType: bestand.type, dataBase64: base64 }),
      });
      if (!pv.ok) throw new Error((pv.data && pv.data.error) || 'Voorbeeld mislukt.');
      // Alleen rijen die de server zelf op `import` zette. Ongeldige rijen komen er nooit in en
      // dubbele worden overgeslagen, zodat een import niets stilzwijgend overschrijft.
      const rijen = (pv.data.rows || []).filter((x) => x._action === 'import')
        .map(({ first_name, last_name, company_name, email, mobile, domain }) => ({ first_name, last_name, company_name, email, mobile, domain }));
      const sam = pv.data.summary || {};
      if (!rijen.length) {
        beheerMelding(impMelding, `Niets te importeren. ${sam.duplicate || 0} dubbel, ${sam.invalid || 0} ongeldig.`, 'waarschuwing');
        return;
      }
      if (!confirm(`${rijen.length} nieuwe tester(s) importeren?${sam.duplicate ? `\n${sam.duplicate} rij(en) bestaan al en worden overgeslagen.` : ''}${sam.invalid ? `\n${sam.invalid} rij(en) zijn ongeldig en komen er niet in.` : ''}`)) {
        beheerMelding(impMelding, ''); return;
      }
      const cm = await api('/api/import/commit', { method: 'POST', body: JSON.stringify({ rows: rijen, source: herkomst }) });
      if (!cm.ok) throw new Error((cm.data && cm.data.error) || 'Importeren mislukt.');
      await laadBeheer({ opnieuw: true });
      render();
    } catch (ex) {
      beheerMelding(impMelding, ex.message || 'Importeren mislukt.', 'fout');
    } finally { e.target.value = ''; }
  });
  paneel.appendChild(importeer);

  const lijst = el('div', 'ck-list');
  if (!data.testers.length) lijst.appendChild(el('p', 'muted', 'Nog geen testers. Voeg er een toe onder Testerbeheer.'));
  data.testers.forEach((r) => lijst.appendChild(uitnodigingRij(r, cfg)));
  paneel.appendChild(lijst);

  paneel.appendChild(templatePaneel());
}

// De tekst die de uitnodiging draagt. Hoort hier omdat je hem leest vlak voordat je iemand
// uitnodigt, en niet in een apart scherm waar niemand hem terugvindt.
function templatePaneel() {
  const box = el('details', 'beheer-template');
  box.innerHTML = '<summary>Berichttekst aanpassen</summary>';
  const melding = el('p', 'beheer-melding'); melding.hidden = true;
  const velden = el('div', 'edit-grid');
  velden.innerHTML = `
    <label class="edit-breed">WhatsApp<textarea class="beheer-preview" data-t="whatsapp" rows="5"></textarea></label>
    <label class="edit-breed">Onderwerp van de e-mail<input type="text" data-t="emailSubject"></label>
    <label class="edit-breed">Tekst van de e-mail<textarea class="beheer-preview" data-t="emailBody" rows="8"></textarea></label>`;
  box.appendChild(velden);

  const acties = el('div', 'prepared-actions');
  const opslaan = el('button', 'btn btn-primary', 'Tekst opslaan');
  acties.appendChild(opslaan);
  box.appendChild(acties);
  box.appendChild(melding);

  let geladen = false;
  box.addEventListener('toggle', async () => {
    if (!box.open || geladen) return;
    const r = await api('/api/template');
    if (!r.ok) { beheerMelding(melding, 'Kon de tekst niet laden.', 'fout'); return; }
    const t = (r.data && r.data.template) || {};
    for (const k of ['whatsapp', 'emailSubject', 'emailBody']) velden.querySelector(`[data-t="${k}"]`).value = t[k] || '';
    geladen = true;
  });
  opslaan.addEventListener('click', async () => {
    opslaan.disabled = true;
    const patch = {};
    for (const k of ['whatsapp', 'emailSubject', 'emailBody']) patch[k] = velden.querySelector(`[data-t="${k}"]`).value;
    const r = await api('/api/template', { method: 'PUT', body: JSON.stringify(patch) });
    opslaan.disabled = false;
    beheerMelding(melding, r.ok ? 'Opgeslagen. Nieuwe uitnodigingen gebruiken deze tekst.' : 'Opslaan mislukt.', r.ok ? '' : 'fout');
  });
  return box;
}

function uitnodigingRij(r, cfg) {
  const rij = el('article', 'conv beheer-rij');
  const naam = testerNaam(r);
  const [stLbl, stCls] = TESTER_STATUS[r.status] || [(r.status || '').toLowerCase(), ''];
  const [csLbl, csCls] = TESTER_CONSENT[r.consent_status] || ['', ''];
  rij.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(naam))}</span>
     <div class="conv-main">
       <div class="conv-top"><span class="conv-who">${esc(naam)}</span></div>
       ${r.company_name ? `<div class="conv-org">${esc(r.company_name)}</div>` : ''}
       <div class="conv-tags"><span class="chip ${stCls}"><span class="k"></span>${esc(stLbl)}</span><span class="chip ${csCls}">${esc(csLbl)}</span></div>
     </div>`;
  const melding = el('p', 'beheer-melding'); melding.hidden = true;
  const acties = el('div', 'prepared-actions beheer-acties');

  const magBenaderen = r.consent_status === 'OPTED_IN';
  if (!magBenaderen) {
    acties.appendChild(el('p', 'kamer-note', r.consent_status === 'OPTED_OUT'
      ? 'Toestemming ingetrokken. Er gaat niets uit.'
      : 'Nog geen toestemming om te benaderen. Leg die eerst vast onder Testerbeheer.'));
    rij.appendChild(acties);
    return rij;
  }

  // WhatsApp in twee stappen. Openen verandert niets; pas de bevestiging zet de status.
  const wa = el('button', 'btn btn-primary', 'Via WhatsApp uitnodigen');
  wa.addEventListener('click', async () => {
    beheerMelding(melding, 'Tekst klaarzetten…');
    const res = await api(`/api/invitations/${r.id}/whatsapp`);
    if (!res.ok) { beheerMelding(melding, (res.data && res.data.error) || 'Kon de uitnodiging niet klaarzetten.', 'fout'); return; }
    beheerMelding(melding, res.data.hasNumber
      ? 'WhatsApp opent in een nieuw tabblad. Verstuur daar het bericht en bevestig hier pas daarna.'
      : 'Geen mobiel nummer. WhatsApp opent zonder ontvanger, je kiest het contact zelf.', 'waarschuwing');
    const tekst = el('textarea', 'beheer-preview'); tekst.readOnly = true; tekst.value = res.data.text || '';
    rij.appendChild(tekst);
    window.open(res.data.url, '_blank', 'noopener');
    wa.hidden = true;
    const bevestig = el('button', 'btn btn-primary', 'Ik heb hem verstuurd');
    bevestig.addEventListener('click', async () => {
      const s = await api(`/api/invitations/${r.id}/status`, { method: 'POST', body: JSON.stringify({ status: 'SENT', channel: 'whatsapp' }) });
      if (!s.ok) { beheerMelding(melding, (s.data && s.data.error) || 'Vastleggen mislukt.', 'fout'); return; }
      await laadBeheer({ opnieuw: true });
      render();
    });
    acties.appendChild(bevestig);
  });
  acties.appendChild(wa);

  const mail = el('button', 'btn btn-ghost', 'Via e-mail uitnodigen');
  mail.addEventListener('click', async () => {
    if (!r.email) { beheerMelding(melding, 'Deze tester heeft geen e-mailadres.', 'fout'); return; }
    mail.disabled = true;
    beheerMelding(melding, 'Bezig…');
    const res = await api('/api/invite/email', { method: 'POST', body: JSON.stringify({ ids: [r.id] }) });
    mail.disabled = false;
    if (!res.ok) { beheerMelding(melding, (res.data && res.data.error) || 'Verzenden mislukt.', 'fout'); return; }
    // Geen verzendend transport betekent: er is NIETS verstuurd. Dat melden we, in plaats van
    // een geslaagde verzending te suggereren die niet heeft plaatsgevonden.
    if (!res.data.delivers) {
      beheerMelding(melding, 'Niet verstuurd: er staat geen verzendend mailtransport aan. Niemand is op Uitgenodigd gezet.', 'waarschuwing');
      return;
    }
    await laadBeheer({ opnieuw: true });
    render();
  });
  acties.appendChild(mail);

  if (cfg.maculisConfigured) {
    const pub = el('button', 'btn btn-ghost', 'Publiceer naar de Lens');
    pub.addEventListener('click', async () => {
      pub.disabled = true;
      const res = await api('/api/publish', { method: 'POST', body: JSON.stringify({ ids: [r.id] }) });
      pub.disabled = false;
      if (!res.ok) { beheerMelding(melding, (res.data && res.data.error) || 'Publiceren mislukt.', 'fout'); return; }
      beheerMelding(melding, res.data.published
        ? 'Gepubliceerd. De Lens begroet deze tester bij naam.'
        : 'Niet gepubliceerd, geblokkeerd wegens ontbrekende toestemming.', res.data.published ? '' : 'waarschuwing');
    });
    acties.appendChild(pub);
  }

  rij.appendChild(acties);
  rij.appendChild(melding);
  return rij;
}

/* ---------- Evaluaties ---------- */

async function paneelEvaluaties(paneel) {
  paneel.appendChild(el('p', 'lead-note', 'Laden…'));
  const data = await laadEvaluaties({ opnieuw: true });
  paneel.innerHTML = '';
  paneel.appendChild(el('p', 'beheer-lead mac-sharpen', 'Hoe ver iedereen is.'));
  paneel.appendChild(el('p', 'lead-note', 'De Lens is de bron. Dit scherm leest mee en bewaart niets van zichzelf.'));
  if (data.ok === false) {
    paneel.appendChild(el('p', 'beheer-melding waarschuwing', SYNC_REDEN[data.reason] || SYNC_REDEN.unknown));
  }

  const rijen = data.evaluations || [];
  const tel = (f) => rijen.filter(f).length;
  const samenvatting = el('div', 'beheer-cijfers');
  samenvatting.innerHTML = [
    ['Testers', rijen.length],
    ['Journey gestart', tel((r) => r.started)],
    ['Evaluatie bezig', tel((r) => r.eval_status === 'IN_PROGRESS')],
    ['Afgerond', tel((r) => r.eval_status === 'COMPLETED')],
  ].map(([k, v]) => `<div class="cijfer"><b>${v}</b><span>${esc(k)}</span></div>`).join('');
  paneel.appendChild(samenvatting);

  const lijst = el('div', 'ck-list');
  if (!rijen.length) lijst.appendChild(el('p', 'muted', 'Nog geen testers.'));
  for (const r of rijen) {
    const rij = el('article', 'conv beheer-rij openable');
    const [evLbl, evCls] = EVAL_STATUS[r.eval_status] || [(r.eval_status || '').toLowerCase(), ''];
    const [stLbl, stCls] = TESTER_STATUS[r.lifecycle] || [(r.lifecycle || '').toLowerCase(), ''];
    rij.innerHTML =
      `<span class="av" aria-hidden="true">${esc(initials(r.name))}</span>
       <div class="conv-main">
         <div class="conv-top"><span class="conv-who">${esc(r.name)}</span></div>
         ${r.company_name ? `<div class="conv-org">${esc(r.company_name)}</div>` : ''}
         <div class="conv-tags">
           <span class="chip ${stCls}"><span class="k"></span>${esc(stLbl)}</span>
           <span class="chip ${evCls}">${esc(evLbl)}</span>
         </div>
       </div>`;
    const naar = el('div', 'prepared-actions beheer-acties');
    const knop = el('button', 'btn btn-ghost', 'Inzichten bekijken');
    knop.addEventListener('click', () => { beheerTester = r.id; beheerTab = 'inzichten'; render(); });
    naar.appendChild(knop);
    rij.appendChild(naar);
    lijst.appendChild(rij);
  }
  paneel.appendChild(lijst);
}

/* ---------- Inzichten ---------- */

async function paneelInzichten(paneel) {
  paneel.appendChild(el('p', 'lead-note', 'Laden…'));
  const data = await laadEvaluaties();
  paneel.innerHTML = '';
  paneel.appendChild(el('p', 'beheer-lead mac-sharpen', 'Wat zij zelf antwoordden.'));
  paneel.appendChild(el('p', 'lead-note', 'Woordelijk, zoals het uit de Lens komt. Niets hiervan is samengevat of geïnterpreteerd.'));

  const rijen = data.evaluations || [];
  const kiezer = el('label', 'beheer-kiezer', 'Tester'
    + `<select>${['<option value="">Kies een tester…</option>'].concat(rijen.map((r) => `<option value="${esc(r.id)}"${r.id === beheerTester ? ' selected' : ''}>${esc(r.name)}${r.company_name ? ' · ' + esc(r.company_name) : ''}</option>`)).join('')}</select>`);
  kiezer.querySelector('select').addEventListener('change', (e) => { beheerTester = e.target.value || null; render(); });
  paneel.appendChild(kiezer);

  const r = rijen.find((x) => x.id === beheerTester);
  if (!r) { paneel.appendChild(el('p', 'muted', 'Kies hierboven een tester.')); return; }

  const kop = el('p', 'lead-note', `${esc(r.campaign || '')} · ${esc((TESTER_STATUS[r.lifecycle] || [r.lifecycle])[0])} · evaluatie ${esc((EVAL_STATUS[r.eval_status] || [r.eval_status])[0])}`);
  paneel.appendChild(kop);

  const vragen = data.questions || [];
  if (r.eval_status === 'NOT_STARTED') {
    paneel.appendChild(el('p', 'muted', r.started ? 'De journey loopt, er zijn nog geen antwoorden.' : 'Nog geen evaluatieresultaten.'));
    return;
  }
  const box = el('div', 'beheer-qa');
  box.innerHTML = vragen.map((q) => {
    const val = r.answers[q.id];
    const label = val ? (q.options[val] || val) : '—';
    let blok = `<div class="qa"><div class="qa-q">${esc(q.text)}</div><div class="qa-a ${val ? '' : 'muted'}">${esc(label)}</div>`;
    if (q.context && r.contexts[q.context.id]) {
      blok += `<div class="qa-ctx"><div class="muted small">${esc(q.context.text)}</div><div>${esc(r.contexts[q.context.id])}</div></div>`;
    }
    return blok + '</div>';
  }).join('');
  paneel.appendChild(box);

  const tijden = [];
  if (r.started_at) tijden.push('Gestart: ' + beheerTijd(r.started_at));
  if (r.completed_at) tijden.push('Afgerond: ' + beheerTijd(r.completed_at));
  if (tijden.length) paneel.appendChild(el('p', 'lead-note', esc(tijden.join(' · '))));
}

/* ---------- Historie ---------- */

async function paneelHistorie(paneel, data) {
  paneel.appendChild(el('p', 'beheer-lead mac-sharpen', 'De reis van één mens.'));
  paneel.appendChild(el('p', 'lead-note', 'Alleen gebeurtenissen. Geen berichten, geen links, geen tokens.'));

  const kiezer = el('label', 'beheer-kiezer', 'Tester'
    + `<select>${['<option value="">Kies een tester…</option>'].concat(data.testers.map((r) => `<option value="${esc(r.id)}"${r.id === beheerTester ? ' selected' : ''}>${esc(testerNaam(r))}${r.company_name ? ' · ' + esc(r.company_name) : ''}</option>`)).join('')}</select>`);
  kiezer.querySelector('select').addEventListener('change', (e) => { beheerTester = e.target.value || null; render(); });
  paneel.appendChild(kiezer);

  if (!beheerTester) { paneel.appendChild(el('p', 'muted', 'Kies hierboven een tester.')); return; }
  const bezig = el('p', 'lead-note', 'Laden…');
  paneel.appendChild(bezig);
  const res = await api(`/api/invitations/${beheerTester}/history`);
  bezig.remove();
  if (!res.ok) { paneel.appendChild(el('p', 'beheer-melding fout', 'Kon de historie niet laden.')); return; }
  const h = res.data;

  const entries = (h.history || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const laatsteUitnodiging = [...entries].reverse().find((e) => e.event === 'invitation_sent');
  const intro = Array.isArray(h.introductions) ? h.introductions.slice().reverse() : [];

  const samen = el('div', 'beheer-samenvatting');
  samen.innerHTML = [
    ['Bron', h.source || '—'],
    ...(intro.length ? [['Aangedragen door', intro.map((i) => (i.by_name || 'Onbekende verwijzer') + (i.by_company ? ` (${i.by_company})` : '')).join(', ')]] : []),
    ['Aangemaakt', beheerTijd(h.created_at)],
    ['Laatste uitnodiging', laatsteUitnodiging
      ? beheerTijd(laatsteUitnodiging.at) + (laatsteUitnodiging.channel ? ' · ' + (HIST_KANAAL[laatsteUitnodiging.channel] || laatsteUitnodiging.channel) : '')
      : '—'],
    ['Status', (TESTER_STATUS[h.lifecycle] || [h.lifecycle])[0]],
    ['Toestemming', (TESTER_CONSENT[h.consent_status] || [h.consent_status])[0]],
  ].map(([k, v]) => `<div class="hs-rij"><span class="hs-k">${esc(k)}</span><span class="hs-v">${esc(v || '—')}</span></div>`).join('');
  paneel.appendChild(samen);

  const tijdlijn = el('div', 'beheer-tijdlijn');
  tijdlijn.innerHTML = entries.length
    ? entries.map((e) => {
      const meta = [];
      if (e.channel) meta.push(HIST_KANAAL[e.channel] || e.channel);
      if (e.result) meta.push(e.result);
      if (e.source) meta.push(e.source);
      if (e.reason) meta.push(HIST_REDEN[e.reason] || e.reason);
      return `<div class="tl-item">
        <div class="tl-time">${esc(beheerTijd(e.at))}</div>
        <div class="tl-body">
          <div class="tl-event">${esc(HIST_EVENT[e.event] || e.event)}</div>
          ${meta.length ? `<div class="tl-meta">${esc(meta.join(' · '))}</div>` : ''}
        </div>
      </div>`;
    }).join('')
    : '<p class="muted">Nog geen gebeurtenissen.</p>';
  paneel.appendChild(tijdlijn);
}

boot();
