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
};
function humanLabel(map, v) {
  if (v == null || v === '') return '';
  const key = String(v).toUpperCase();
  return map[key] || String(v).toLowerCase().replace(/_/g, ' ');
}
const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
function lensDate(iso) { try { const d = new Date(iso); if (isNaN(d)) return null; return `${d.getDate()} ${NL_MONTHS[d.getMonth()]}`; } catch { return null; } }

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
async function boot() {
  const { data: cfg } = await api('/api/cockpit/config');
  if (!cfg || !cfg.commEnabled) return renderDisabled();
  if (!cfg.authed) return renderLogin();
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
  view.appendChild(wrap);
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
  card.classList.add('just-landed');
  setTimeout(() => card.classList.remove('just-landed'), 2600);
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
       ${c.channel ? `<span class="chan">${esc(CHAN_ICO[c.channel] || '')} ${esc(humanLabel(CHANNEL_LABEL, c.channel))}</span>` : ''}
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
  const wrap = el('div', 'work-block');
  if (w.id) wrap.dataset.attnId = w.id;   // scroll target for the "Bekijk" jump after a Scout run
  const ev = w.evidence || {};
  if (w.proposal && w.proposal.summary) wrap.appendChild(el('div', 'work-proposal', esc(w.proposal.summary)));
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
    data.conversations.forEach(cv => { b.innerHTML += `<div class="tl-ev"><span class="tl-when">${esc(humanLabel(CHANNEL_LABEL, cv.channel))}</span><p>${esc(cv.subject || 'Gesprek')} · ${esc(humanLabel(CONV_STATUS_LABEL, cv.status))}${cv.aiReady ? ' · concept klaar' : ''}</p></div>`; });
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
  // Lens — a content-free relational hoofdlijn (Niveau C). Only the fact that this relation went
  // through the Lens; never reveal content, answers or personal reflections. Designed so a client-shared
  // insight ("1 inzicht door klant gedeeld") can appear later, once an explicit sharing consent exists.
  if (data.lens && data.lens.participated) {
    secWrap.appendChild(dosSection('Lens', 'A', true, () => {
      const b = el('div', 'dos-lens');
      const at = data.lens.completedAt || data.lens.startedAt;
      const when = at ? lensDate(at) : null;
      b.innerHTML = `<p class="lens-line">${data.lens.completedAt ? 'Doorlopen' : 'Gestart'}${when ? ' op ' + esc(when) : ''}.</p>`;
      if (data.lens.sharedCount > 0) {
        b.innerHTML += `<p class="lens-line">${data.lens.sharedCount} inzicht${data.lens.sharedCount === 1 ? '' : 'en'} door klant gedeeld.</p>`;
      }
      b.innerHTML += `<p class="dos-note">De Lens is van de klant. Alleen deze hoofdlijn is gedeeld. Antwoorden en persoonlijke reflectie blijven privé.</p>`;
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
  const row = el('article', 'conv'); row.tabIndex = 0; row.setAttribute('role', 'button');
  const chips = [];
  if (c.hasPrepared) chips.push('<span class="chip ready"><span class="k"></span>concept klaar</span>');
  if (c.waitingOnUs) chips.push('<span class="chip now"><span class="k"></span>wacht op jou</span>');
  chips.push(`<span class="chip">${esc(humanLabel(CONV_STATUS_LABEL, c.status))}</span>`);
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

/* ---------- Beheer → Testerbeheer (administrative; reuses the existing invitation tool) ---------- */
// This is administrative functionality, not the relational workspace. It reads and writes the SAME
// JSON invitation store as the standalone tool via /api/invitations (no new backend, no new
// outbound). A tester here is NOT a Maculis relation: this view never touches the relational layer,
// so nothing is silently promoted from tester to relation.
const TESTER_STATUS = {
  DRAFT: ['nog niet verstuurd', ''], SENT: ['uitnodiging verstuurd', 'ready'],
  OPENED: ['link geopend', 'ready'], COMPLETED: ['afgerond', 'ready'],
  DECLINED: ['afgewezen', 'now'], ERROR: ['fout', 'now'],
};
const TESTER_CONSENT = { OPTED_IN: ['toestemming', 'ready'], OPTED_OUT: ['geen toestemming', 'now'], UNKNOWN: ['toestemming onbekend', ''] };

async function renderBeheer() {
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(el('div', 'eyebrow-line', 'Beheer'));
  wrap.appendChild(el('h1', 'work-h1', 'Testerbeheer'));
  wrap.appendChild(el('p', 'lead-note', 'Administratief. Testers en uitnodigingen voor de campagne. Dit staat los van je relaties: een tester wordt hier geen Maculis-relatie.'));

  // Add a tester (reuses POST /api/invitations; creates a record + link, sends niets).
  const form = el('form', 'beheer-add');
  form.innerHTML =
    `<div class="ba-row">
       <input type="text" id="ba-first" placeholder="Voornaam" aria-label="Voornaam">
       <input type="text" id="ba-last" placeholder="Achternaam" aria-label="Achternaam">
       <input type="text" id="ba-org" placeholder="Organisatie" aria-label="Organisatie">
     </div>
     <div class="ba-row">
       <input type="email" id="ba-email" placeholder="E-mail" aria-label="E-mail">
       <input type="text" id="ba-mobile" placeholder="Mobiel" aria-label="Mobiel">
       <button class="btn btn-primary" type="submit">Tester toevoegen</button>
     </div>`;
  const err = el('p', 'lead-note'); err.style.color = 'var(--danger)'; err.style.display = 'none';
  wrap.appendChild(form); wrap.appendChild(err);

  const meta = el('div', 'work-meta'); wrap.appendChild(meta);
  const bar = el('div', 'filterbar');
  bar.innerHTML = `<span class="search big"><span aria-hidden="true">⌕</span><input type="text" id="t-q" placeholder="Zoek een tester of organisatie" aria-label="Zoek tester"></span>`;
  wrap.appendChild(bar);
  const list = el('div', 'ck-list'); wrap.appendChild(list);

  // A discreet bridge to the full tool for the heavier admin flows (import, e-mail, evaluaties),
  // which keep their own tested safety rules; the cockpit does not rebuild them.
  const more = el('p', 'lead-note beheer-more');
  more.innerHTML = 'Importeren, uitnodigingen versturen en evaluaties: <a href="/index.html">open de volledige uitnodigingstool</a>.';
  wrap.appendChild(more);
  view.appendChild(wrap);

  let all = [];
  function draw(q) {
    const needle = (q || '').toLowerCase();
    const rows = all.filter((r) => !needle || (
      `${r.first_name || ''} ${r.last_name || ''} ${r.company_name || ''} ${r.email || ''}`.toLowerCase().includes(needle)));
    list.innerHTML = '';
    meta.innerHTML = `<span class="wm-count"><b>${rows.length}</b> tester${rows.length === 1 ? '' : 's'}</span>`;
    if (!rows.length) { list.appendChild(el('p', 'muted', all.length ? 'Geen tester gevonden.' : 'Nog geen testers. Voeg er hierboven een toe of importeer via de volledige tool.')); return; }
    rows.forEach((r) => list.appendChild(testerRow(r)));
  }
  async function load() {
    const { ok, data } = await api('/api/invitations');
    if (!ok || !data) { list.appendChild(el('p', 'lead-note', 'Kon testers niet laden.')); return; }
    all = data.invitations || [];
    draw(bar.querySelector('#t-q').value.trim());
  }
  let t; bar.querySelector('#t-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => draw(e.target.value.trim()), 150); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.style.display = 'none';
    const body = {
      first_name: form.querySelector('#ba-first').value.trim(),
      last_name: form.querySelector('#ba-last').value.trim(),
      company_name: form.querySelector('#ba-org').value.trim(),
      email: form.querySelector('#ba-email').value.trim(),
      mobile: form.querySelector('#ba-mobile').value.trim(),
    };
    const r = await api('/api/invitations', { method: 'POST', body: JSON.stringify(body) });
    if (r.ok) { form.reset(); load(); } else { err.textContent = (r.data && r.data.error) || 'Kon tester niet toevoegen.'; err.style.display = ''; }
  });
  load();
}

function testerRow(r) {
  const row = el('article', 'conv');
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || r.company_name || 'Onbekend';
  const [stLbl, stCls] = TESTER_STATUS[r.status] || [(r.status || '').toLowerCase(), ''];
  const [csLbl, csCls] = TESTER_CONSENT[r.consent_status] || ['', ''];
  const chips = [`<span class="chip ${stCls}"><span class="k"></span>${esc(stLbl)}</span>`];
  if (csLbl) chips.push(`<span class="chip ${csCls}">${esc(csLbl)}</span>`);
  if (r.campaign) chips.push(`<span class="chip">${esc(r.campaign)}</span>`);
  const contact = r.email || r.mobile || '';
  row.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(name))}</span>
     <div class="conv-main">
       <div class="conv-top"><span class="conv-who">${esc(name)}</span></div>
       ${r.company_name ? `<div class="conv-org">${esc(r.company_name)}</div>` : ''}
       ${contact ? `<div class="conv-snip">${esc(contact)}</div>` : ''}
       <div class="conv-tags">${chips.join('')}</div>
     </div>`;
  return row;
}

boot();
