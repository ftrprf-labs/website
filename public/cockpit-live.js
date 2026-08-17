/* =====================================================================
   Maculis Future Cockpit — OPERATIONAL client, Slice 1 (real data only).
   Every screen here is fed by /api/cockpit/*. There are NO fixtures. If the
   Communication Layer is not configured, this page fails closed and says so;
   it never shows invented data as if it were real (trust invariant).
   Reuses /cockpit.css so the look matches the frozen prototype exactly.
   ===================================================================== */
'use strict';

const shell = document.getElementById('shell');
const view = document.getElementById('view');

/* ---------- helpers ---------- */
function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function initials(name) { const p = String(name || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[p.length - 1] || '')[0] || '')).toUpperCase(); }
const CHAN_ICO = { EMAIL: '✉', WHATSAPP: '◇', SMS: '▤', PHONE: '☎' };

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
let agentsOn = false;   // digital-colleague domain enabled (Scout can be asked to look)
let scoutOpen = false;  // whether the "vraag Scout" panel is expanded in Vandaag
let scoutNotice = null; // one-line outcome after a Scout run, shown once at the top of Vandaag

/* ---------- boot ---------- */
async function boot() {
  const { data: cfg } = await api('/api/cockpit/config');
  if (!cfg || !cfg.commEnabled) return renderDisabled();
  if (!cfg.authed) return renderLogin();
  agentsOn = Boolean(cfg.agentsEnabled);
  wireNav();
  render();
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
  view.innerHTML = '';
  if (scn === 'vandaag') { shell.setAttribute('data-space', 'reveal'); lightNav('vandaag'); return renderVandaag(); }
  if (scn === 'dossier') { shell.setAttribute('data-space', 'work'); lightNav('relaties'); return renderDossier(activeContactId); }
  if (scn === 'gesprek') { shell.setAttribute('data-space', 'work'); lightNav('gesprekken'); return renderGesprek(activeConvId); }
  if (scn === 'relaties') { shell.setAttribute('data-space', 'work'); lightNav('relaties'); return renderRelaties(); }
  if (scn === 'gesprekken') { shell.setAttribute('data-space', 'work'); lightNav('gesprekken'); return renderGesprekken(); }
  // Only Beheer stays an honest placeholder in this slice — never fixtures.
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
  // A calm one-line outcome after you asked Scout to look; shown once, then cleared.
  if (scoutNotice) { wrap.appendChild(el('div', 'scout-notice', esc(scoutNotice))); scoutNotice = null; }
  const h = data.headline || { primary: '', secondary: null, zero: false };
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
    if (agentsOn) wrap.appendChild(scoutColleague());
    view.appendChild(wrap); return;
  }

  const greet = el('div', 'greet');
  greet.innerHTML = `<div class="eyebrow">Vandaag</div><h1>${esc(h.primary)}</h1>${h.secondary ? `<p class="sub">${esc(h.secondary)}</p>` : ''}`;
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
  if (agentsOn) wrap.appendChild(scoutColleague());
  view.appendChild(wrap);
}

/* ---------- Scout, a digital colleague you can ask to look ----------
   Not an agent console: one calm colleague affordance inside Vandaag. You hand Scout an organisation
   to look at; Scout observes PUBLIC sources (the organisation's own website + open EU tenders via TED),
   checks whether we already know them, and lands ONE well-reasoned proposal in Vandaag. Scout never
   sends anything and never contacts anyone: every next step is your decision on the card it prepares. */
function scoutColleague() {
  const box = el('section', 'scout');
  const head = el('div', 'scout-head');
  head.innerHTML = `<span class="colleague-dot" aria-hidden="true"></span>
    <div class="scout-id"><b>Scout</b><span class="scout-role">groei-collega</span></div>
    <p class="scout-line">Vindt en kwalificeert een organisatie uit openbare bronnen en zet een voorstel voor je klaar.</p>`;
  box.appendChild(head);

  if (!scoutOpen) {
    const ask = el('button', 'btn btn-ghost scout-ask', 'Vraag Scout om te kijken');
    ask.addEventListener('click', () => { scoutOpen = true; render(); });
    box.appendChild(ask);
    return box;
  }

  const form = el('form', 'scout-form');
  form.innerHTML = `
    <p class="scout-explain">Scout kijkt naar openbare bronnen: de eigen website van de organisatie en openbare EU aanbestedingen (TED). Scout maakt daar waarnemingen van, controleert of we de organisatie al kennen, en zet een voorstel klaar. Scout verstuurt niets en neemt geen contact op. Jij beslist.</p>
    <label class="scout-f"><span>Organisatie</span><input type="text" id="sc-name" placeholder="Naam van de organisatie" autocomplete="off" required></label>
    <label class="scout-f"><span>Website <em>(optioneel, helpt Scout kijken)</em></span><input type="text" id="sc-site" placeholder="bijv. voorbeeld.nl" autocomplete="off"></label>
    <label class="scout-f"><span>Context <em>(optioneel)</em></span><input type="text" id="sc-note" placeholder="Waarom kijk je hiernaar?" autocomplete="off"></label>
    <div class="scout-actions">
      <button type="submit" class="btn btn-primary" id="sc-go">Laat Scout kijken</button>
      <button type="button" class="btn btn-ghost" id="sc-cancel">Annuleren</button>
    </div>
    <p class="scout-status" id="sc-status" aria-live="polite"></p>`;
  form.querySelector('#sc-cancel').addEventListener('click', () => { scoutOpen = false; render(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#sc-name').value.trim();
    const domain = normalizeDomain(form.querySelector('#sc-site').value);
    const note = form.querySelector('#sc-note').value.trim();
    const status = form.querySelector('#sc-status');
    const go = form.querySelector('#sc-go');
    if (!name) { status.textContent = 'Geef eerst een organisatie op.'; return; }
    go.disabled = true; go.textContent = 'Scout kijkt…'; status.textContent = 'Scout observeert openbare bronnen en weegt het af. Even geduld.';
    const candidate = { name }; if (domain) candidate.domain = domain; if (note) candidate.note = note;
    const r = await api('/api/agents/scout/run', { method: 'POST', body: JSON.stringify({ candidates: [candidate] }) });
    if (!r.ok || !r.data || r.data.ok === false) {
      go.disabled = false; go.textContent = 'Laat Scout kijken';
      status.textContent = (r.data && (r.data.error || r.data.reason)) ? `Scout kon niet kijken: ${r.data.error || r.data.reason}` : 'Scout kon nu niet kijken.';
      return;
    }
    const recorded = Number(r.data.recorded || 0);
    scoutOpen = false;
    // Re-render Vandaag so a landed proposal appears as Scout's card; carry a short outcome note.
    scoutNotice = recorded > 0
      ? (recorded === 1
        ? `Scout heeft gekeken bij ${name}: 1 voorstel staat voor je klaar.`
        : `Scout heeft gekeken bij ${name}: ${recorded} voorstellen staan voor je klaar.`)
      : `Scout heeft gekeken bij ${name}, maar vond nu niets dat jouw aandacht verdient. Niets geforceerd.`;
    render();
  });
  box.appendChild(form);
  return box;
}

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

function radarCard(c) {
  const b = el('article', 'item openable'); b.tabIndex = 0; b.setAttribute('role', 'button');
  const chips = [];
  if (c.hasPrepared) chips.push('<span class="chip ready"><span class="k"></span>concept klaar</span>');
  if (c.org) chips.push(`<span class="chip">${esc(c.org)}</span>`);
  const secondary = (c.secondary || []).map(s => `<div class="echo">${esc(s.reason)}</div>`).join('');
  // When a digital colleague produced this, name them above the reason ("Growth vraagt jouw akkoord.").
  const attribution = c.primary.origin && c.primary.origin.kind === 'AGENT'
    ? `<div class="colleague"><span class="colleague-dot" aria-hidden="true"></span>${esc(c.primary.origin.label)} ${esc(COLLEAGUE_VERB[c.primary.needs] || 'heeft iets voor je')}.</div>` : '';
  b.innerHTML =
    `<div class="row1">
       <span class="who">${esc(c.who)}</span>
       ${c.channel ? `<span class="chan">${esc(CHAN_ICO[c.channel] || '')} ${esc((c.channel || '').toLowerCase())}</span>` : ''}
       <span class="go-chevron" aria-hidden="true">›</span>
     </div>
     ${attribution}
     <div class="line">${esc(c.primary.reason)}</div>
     ${secondary}
     ${chips.length ? `<div class="tags">${chips.join('')}</div>` : ''}`;
  // Colleague work touching this relation: proposal, evidence, and the actions the mandate allows.
  (c.work || []).forEach(w => b.appendChild(workBlock(w)));
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

// A colleague's work item: what is proposed, why (evidence, honestly labelled), and the actions.
// onResolve defaults to a full re-render of Vandaag; the dossier passes its own refresh.
function workBlock(w, onResolve) {
  const wrap = el('div', 'work-block');
  const ev = w.evidence || {};
  if (w.proposal && w.proposal.summary) wrap.appendChild(el('div', 'work-proposal', esc(w.proposal.summary)));
  // A demonstration/fixture is marked unmistakably so it can never read as a real find.
  if (ev.demo) wrap.appendChild(el('div', 'work-demo', 'Demonstratie. Geen echte waarneming.'));
  const items = evidenceItems(ev).map(evItem).filter(Boolean);
  if (items.length) {
    const ul = el('ul', 'work-ev');
    items.slice(0, 6).forEach((li) => ul.appendChild(li));
    wrap.appendChild(ul);
  }
  if (typeof ev.confidence === 'number') {
    wrap.appendChild(el('div', 'ev-foot',
      `Inschatting van Scout, vertrouwen ${Math.round(ev.confidence * 100)}%${ev.provider ? `, bron-motor ${esc(ev.provider)}` : ''}`));
  }
  const bar = el('div', 'prepared-actions');
  (w.actions || []).filter(a => a !== 'view').forEach(action => {
    const btn = el('button', 'btn ' + (action === 'approve' ? 'btn-primary' : 'btn-ghost'), WORK_ACTION_LABEL[action] || action);
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true; btn.textContent = 'Bezig…';
      const r = await api('/api/cockpit/work/' + w.id + '/' + action, { method: 'POST' });
      if (r.ok) { (onResolve || (() => render()))(); } else { btn.disabled = false; btn.textContent = WORK_ACTION_LABEL[action] || action; }
    });
    bar.appendChild(btn);
  });
  wrap.appendChild(bar);
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
     <div class="dos-meta">${id.stage ? `<span class="dos-stage">${esc(id.stage)}</span>` : ''}</div>`;
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
    const secondary = (att.secondary || []).map(s => `<div class="echo">${esc(s.reason)}</div>`).join('');
    const canOpen = att.conversationId || data.primaryConversationId;
    item.innerHTML = `<div class="dni-top"><span class="chip ${bucketCls}"><span class="k"></span>${esc(att.reason)}</span></div>${secondary}`;
    if (canOpen) { const btn = el('button', 'btn btn-primary', 'Open het gesprek'); btn.addEventListener('click', () => { activeConvId = canOpen; scn = 'gesprek'; render(); }); item.appendChild(btn); }
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
  secWrap.appendChild(dosSection('Gesprekshistorie', 'A', true, () => {
    const b = el('div', 'dos-timeline');
    if (!data.conversations.length) b.innerHTML = '<p class="muted">Nog geen gesprekken.</p>';
    data.conversations.forEach(cv => { b.innerHTML += `<div class="tl-ev"><span class="tl-when">${esc((cv.channel || '').toLowerCase())}</span><p>${esc(cv.subject || 'Gesprek')} · ${esc(cv.status)}${cv.aiReady ? ' · concept klaar' : ''}</p></div>`; });
    return b;
  }));
  // Observation vs durable memory, kept explicit.
  secWrap.appendChild(dosSection('Wat Maculis zag', 'B', true, () => {
    const b = el('div', 'dos-memory');
    if (!data.observed.length) b.innerHTML = '<p class="muted">Geen open observaties. Wat bevestigd is, staat onder Geheugen.</p>';
    data.observed.forEach(m => b.appendChild(memoryCard(m, true)));
    return b;
  }));
  secWrap.appendChild(dosSection('Geheugen', 'A', false, () => {
    const b = el('div', 'dos-memory');
    if (!data.remembered.length) b.innerHTML = '<p class="muted">Nog niets duurzaam onthouden.</p>';
    data.remembered.forEach(m => b.appendChild(memoryCard(m, false)));
    return b;
  }));
  secWrap.appendChild(dosSection('Open acties en follow-ups', 'A', false, () => {
    const b = el('div', 'dos-followups');
    const open = (data.followups || []).filter((f) => f.status !== 'done');
    if (!open.length) { b.innerHTML = '<p class="muted">Geen open acties.</p>'; return b; }
    open.forEach((f) => b.appendChild(followUpRow(f)));
    return b;
  }));
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
    }));
  }
  secWrap.appendChild(dosSection('Contact en identiteiten', 'A', false, () => {
    const b = el('div', 'dos-facts');
    if (rc.email) b.innerHTML += `<div class="fact"><span class="k">e-mail</span><span class="v">${esc(rc.email.value)}</span></div>`;
    if (rc.phone) b.innerHTML += `<div class="fact"><span class="k">telefoon</span><span class="v">${esc(rc.phone.value)}</span></div>`;
    b.innerHTML += `<p class="dos-note">E-mail is het enige digitaal verzendbare kanaal in deze fase. Bellen is een menselijke actie. WhatsApp/SMS ${provChip('C')} volgen later.</p>`;
    return b;
  }));
  wrap.appendChild(secWrap);
  view.appendChild(wrap);
}

function dosSection(title, prov, open, bodyFn) {
  const sec = el('div', 'dos-sec');
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
  const tag = isObservation ? '<span class="mem-ai">AI-voorstel</span>' : '<span class="mem-conf">Bevestigd</span>';
  c.innerHTML = `<div class="mem-top">${tag}<span class="mem-when">${esc(m.kind || '')}</span></div><p>${esc(m.content)}</p>`;
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
  data.messages.forEach(m => { msgs += `<div class="msg ${m.direction === 'OUTBOUND' ? 'out' : 'in'}"><div class="who">${esc(m.direction === 'OUTBOUND' ? 'Maculis · jij' : conv.who)} · ${esc((m.channel || '').toLowerCase())}${m.delivery ? ' · ' + esc(m.delivery) : ''}</div><div class="b">${esc(m.body_text || '')}</div></div>`; });
  thread.innerHTML = `<div class="th-head"><h2>${esc(conv.subject || 'Gesprek')}</h2><div class="meta">${esc(conv.who)}${conv.org ? ' · ' + esc(conv.org) : ''} · ${esc((conv.channel || '').toLowerCase())} · ${esc(conv.status)}</div></div><div class="msgs">${msgs}</div>`;

  // Slice 2 — what Maculis reads in this thread, grounded in a real ai_draft. Only shown when a
  // reading exists; never an invented understanding.
  if (data.understanding) thread.appendChild(lensPanel(data.understanding));

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
  if (r.stage) chips.push(`<span class="chip">${esc(r.stage)}</span>`);
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
  const row = el('article', 'conv'); row.tabIndex = 0; row.setAttribute('role', 'button');
  const chips = [];
  if (c.hasPrepared) chips.push('<span class="chip ready"><span class="k"></span>concept klaar</span>');
  if (c.waitingOnUs) chips.push('<span class="chip now"><span class="k"></span>wacht op jou</span>');
  chips.push(`<span class="chip">${esc((c.status || '').toLowerCase())}</span>`);
  const snip = c.subject
    ? `<b>${esc(c.subject)}</b>${c.preview ? ' · ' + esc(c.preview) : ''}`
    : (c.preview ? esc(c.preview) : '');
  row.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(c.who))}</span>
     <div class="conv-main">
       <div class="conv-top">
         <span class="conv-who">${esc(c.who)}</span>
         <span class="conv-chan">${esc(CHAN_ICO[c.channel] || '')} ${esc((c.channel || '').toLowerCase())}</span>
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

boot();
