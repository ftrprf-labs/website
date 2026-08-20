// Central Inbox — the attention entry point (Ingang B). CSP-compliant: no inline handlers.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = (p, o) => fetch(p, { ...o, headers: { 'Content-Type': 'application/json', ...(o && o.headers) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const fmt = (d) => (d ? new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

let box = 'communication'; let filter = 'all'; let current = null;
const STATE = { status: null, draft: null, conv: null };

async function boot() {
  const st = await api('/api/comm/status');
  if (st.status === 401) { document.body.innerHTML = '<div class="empty" style="padding:60px">Niet ingelogd. <a href="/">Log in bij Testerbeheer.</a></div>'; return; }
  if (st.status !== 200) { document.body.innerHTML = '<div class="empty" style="padding:60px"><b>Communicatielaag nog niet geactiveerd.</b><br>De Inbox verschijnt zodra de Communication Layer live staat.</div>'; return; }
  STATE.status = st.body;
  $('#tab-comm').addEventListener('click', () => setBox('communication'));
  $('#tab-priv').addEventListener('click', () => setBox('privacy'));
  await loadList();
  loadKamers();
  // Deep link from the Attention Cockpit: /comm.html#conv=<id> opens that exact conversation (and,
  // via the GET, marks it read + shows its AI proposal) in one click.
  const m = (location.hash || '').match(/conv=([0-9a-f-]{36})/i);
  if (m) openConv(m[1]);
}
// Canon 10: statuslabels zijn Nederlands en menselijk. De attentielabels waren dat al;
// alleen de kanaalnamen kwamen nog rauw uit de data. Uitsluitend weergave.
const CHANNEL_LABEL = { EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', SMS: 'Sms', PHONE: 'Telefoon', SOCIAL: 'Social', MIJN_MACULIS: 'Mijn Maculis' };
const chan = (c) => CHANNEL_LABEL[c] || (c ? c.charAt(0) + c.slice(1).toLowerCase() : '');

const FILTERS = [['all', 'Alles'], ['new', 'Nieuw'], ['waiting_on_us', 'Wacht op mij'], ['ai_ready', 'AI-voorstel'], ['unknown_contact', 'Onbekend'], ['delivery_problem', 'Leveringsprobleem']];
function renderAttbar(sum) {
  const map = { all: '', new: sum.new, waiting_on_us: sum.waiting_on_us, ai_ready: sum.ai_ready, unknown_contact: sum.unknown_contact, delivery_problem: sum.delivery_problem };
  $('#attbar').innerHTML = FILTERS.map(([k, l]) => `<button type="button" class="af ${filter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}${map[k] ? ` <b>${map[k]}</b>` : ''}</button>`).join('')
    + (sum.follow_up_due ? `<button type="button" class="af" title="Open follow-ups">Follow-ups <b>${sum.follow_up_due}</b></button>` : '');
}
function setFilter(f) { filter = f; loadList(); }
function setBox(b) { box = b; current = null; filter = 'all'; $('#tab-comm').classList.toggle('on', b === 'communication'); $('#tab-priv').classList.toggle('on', b === 'privacy'); $('#thread').innerHTML = '<div class="empty">Kies een gesprek.</div>'; $('#ctx').innerHTML = ''; loadList(); }

async function loadList() {
  const r = await api('/api/comm/inbox?box=' + box + '&filter=' + filter);
  if (r.status === 403) { $('#list').innerHTML = '<div class="empty">Geen privacy-toegang.</div>'; $('#attbar').innerHTML = ''; return; }
  if (r.status !== 200) { $('#list').innerHTML = '<div class="empty">Kon inbox niet laden.</div>'; return; }
  if (box === 'communication') renderAttbar(r.body.summary || {}); else $('#attbar').innerHTML = '';
  const cs = r.body.conversations || [];
  const label = { new: 'nieuw', waiting_on_us: 'wacht op mij', ai_ready: 'voorstel klaar', unknown_contact: 'onbekend', delivery_problem: 'leveringsprobleem', waiting_on_contact: 'wacht op klant' };
  $('#list').innerHTML = cs.length ? cs.map((c) => {
    const who = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
    const tags = (c.attention || []).filter((a) => a !== 'open').slice(0, 2).map((a) => `<span class="att ${a}">${label[a] || a}</span>`).join('');
    return `<button type="button" class="conv" data-act="openConv" data-id="${c.id}"><div class="who">${esc(who)}${tags}</div><div class="org">${esc(c.org || c.email || '')} · ${esc(chan(c.channel))}</div><div class="snip">${esc((c.last_body || '').slice(0, 80))}</div></button>`;
  }).join('') : '<div class="empty">Niets vraagt hier je aandacht.</div>';
}

async function openConv(id) {
  current = id;
  document.querySelectorAll('.conv').forEach((x) => x.classList.toggle('on', x.dataset.id === id));
  const r = await api('/api/comm/conversations/' + id);
  if (r.status !== 200) { $('#thread').innerHTML = '<div class="empty">Kon gesprek niet laden.</div>'; return; }
  STATE.conv = r.body; const d = r.body; const c = d.conversation;
  const msgs = (d.messages || []).map((m) => `<div class="m ${m.direction === 'INBOUND' ? 'in' : 'out'}"><div class="meta">${m.direction === 'INBOUND' ? esc(m.from_address || '') : 'Maculis'} · ${esc(m.channel)} · ${fmt(m.created_at)} ${m.direction === 'OUTBOUND' ? esc(m.delivery) : ''}</div>${esc(m.body_text || '')}</div>`).join('') || '<div class="empty">Geen berichten.</div>';
  const ai = d.ai_draft ? `<div class="aipanel"><h4>Maculis begrijpt dit gesprek</h4><div class="sum">${esc(d.ai_draft.summary || '')}</div><div class="sug" id="sugbar"></div></div>` : '';
  const unknown = !c.contact_id;
  $('#thread').innerHTML = `<div class="msgs" id="msgs">${msgs}${ai}</div><div class="composer" id="composer">${unknown ? '<div class="aihint">Onbekende afzender. Koppel eerst aan een relatie rechts, of antwoord direct.</div>' : ''}</div>`;
  $('#msgs').scrollTop = 99999;
  if (d.ai_draft) loadSuggestions(id);
  openDraft(id);
  renderCtx(d, c);
}
async function loadSuggestions(id) { const bar = $('#sugbar'); if (!bar) return; const r = await api('/api/comm/conversations/' + id + '/ai/suggest', { method: 'POST' }); if (r.status === 200) bar.innerHTML = (r.body.suggestions || []).map((s) => `<button type="button" class="s" title="${esc(s.why || '')}">${esc(s.label)}</button>`).join(''); }

async function openDraft(id) {
  const r = await api('/api/comm/conversations/' + id + '/draft', { method: 'POST', body: JSON.stringify({}) });
  if (r.status !== 200) return;
  STATE.draft = r.body; renderComposer();
}
function channelButtons() {
  const consent = (STATE.conv && STATE.conv.consent) || {}; const sendable = (STATE.status.sendable) || ['EMAIL', 'WHATSAPP', 'SMS']; const cur = STATE.draft.draft.channel;
  return sendable.map((ch) => { const cs = consent[ch]; const b = cs && !cs.allowed; return `<button type="button" class="chan ${ch === cur ? 'on' : ''} ${b ? 'blocked' : ''}" title="${b ? ('Geblokkeerd: ' + esc(cs.reason)) : ''}" ${b ? '' : `data-act="switchChannel" data-ch="${ch}"`}>${esc(chan(ch))}</button>`; }).join('');
}
function renderComposer() {
  const dr = STATE.draft.draft; const chat = STATE.draft.chat || [];
  const el = $('#composer'); const pre = el.querySelector('.aihint') ? el.querySelector('.aihint').outerHTML : '';
  el.innerHTML = pre + `
    <div class="chrow">${channelButtons()}<span class="aihint" style="margin-left:auto">${dr.ai_generated ? 'AI-concept' : 'jouw tekst'}${dr.human_edited ? ' · door jou aangepast' : ''}</span></div>
    <textarea id="body"></textarea>
    <div class="aichat"><div class="log" id="chatlog">${chat.map((m) => `<div class="cm ${m.role}">${esc(m.content)}</div>`).join('')}</div>
    <div class="aibar"><input id="aiin" placeholder="Zeg wat Maculis moet doen…"><button class="btn" data-act="sendChat">Vraag Maculis</button></div></div>
    <div class="sendrow"><button class="btn gold" id="sendbtn" data-act="approveSend">Goedkeuren en verzenden</button><button class="btn" data-act="saveEdit">Opslaan</button><span class="note">Niets wordt automatisch verzonden.</span></div>`;
  $('#body').value = dr.body || '';
  $('#body').addEventListener('input', markDirty);
  $('#aiin').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
}
let dirty = false; let saveTimer = null;
function markDirty() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveEdit, 900); }
async function saveEdit() { if (!STATE.draft) return; const r = await api('/api/comm/drafts/' + STATE.draft.draft.id, { method: 'PATCH', body: JSON.stringify({ body: $('#body').value }) }); if (r.status === 200) { STATE.draft = r.body; dirty = false; } }
async function sendChat() { const inp = $('#aiin'); const msg = inp.value.trim(); if (!msg) return; inp.value = ''; if (dirty) await saveEdit(); $('#chatlog').insertAdjacentHTML('beforeend', `<div class="cm user">${esc(msg)}</div>`); const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/chat', { method: 'POST', body: JSON.stringify({ message: msg }) }); if (r.status === 200) { STATE.draft = { draft: r.body.draft, versions: r.body.versions, chat: r.body.chat }; renderComposer(); $('#chatlog').scrollTop = 99999; } else toast('Kon dit niet verwerken.'); }
async function switchChannel(ch) { if (dirty) await saveEdit(); const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/channel', { method: 'POST', body: JSON.stringify({ channel: ch }) }); if (r.status === 200) { STATE.draft = r.body; renderComposer(); toast('Kanaal: ' + ch); } }
async function approveSend() { if (dirty) await saveEdit(); $('#sendbtn').disabled = true; const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/send', { method: 'POST', body: JSON.stringify({}) }); if (r.status === 200 && r.body.ok) { toast('Verzonden' + (r.body.providerMode === 'mock' ? ' (mock)' : '')); openConv(current); loadList(); } else { $('#sendbtn').disabled = false; toast('Geblokkeerd: ' + (r.body.reason || '') + (r.body.consent ? (' (' + r.body.consent.reason + ')') : '')); } }

function renderCtx(d, c) {
  const who = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
  const open = c.contact_id ? `<a href="/workspace.html?contact=${c.contact_id}">Open relatie →</a>` : '';
  const link = !c.contact_id ? `<button class="btn" data-act="linkUnknown">Koppel aan relatie</button>` : '';
  const notes = (d.notes || []).map((n) => `<div class="v" style="color:var(--dim)">${esc(n.body)}</div>`).join('') || '<div class="v" style="color:var(--faint)">Geen notities.</div>';
  $('#ctx').innerHTML = `<h3>Relatie</h3><div class="v">${esc(who)}</div>${open}
    <div class="k">Organisatie</div><div class="v">${esc(c.org || '—')}</div>
    <div class="k">E-mail</div><div class="v">${esc(c.email || '—')}</div>
    <div class="k">Kanaal</div><div class="v">${esc(c.channel)} · ${esc(c.status)}${c.is_privacy ? ' · PRIVACY' : ''}</div>
    ${link}
    <h3 style="margin-top:16px">Interne notities</h3>${notes}
    <button class="btn" style="margin-top:8px" data-act="addNote">＋ Notitie</button>`;
}
async function addNote() { const t = prompt('Interne notitie (nooit extern verzonden):'); if (!t) return; await api('/api/comm/conversations/' + current + '/notes', { method: 'POST', body: JSON.stringify({ body: t }) }); openConv(current); }
async function linkUnknown() { const email = prompt('Koppel deze afzender aan een nieuwe relatie — e-mail (optioneel):', ''); const name = prompt('Naam:', ''); if (name === null) return; const r = await api('/api/comm/conversations/' + current + '/link', { method: 'POST', body: JSON.stringify({ newContact: { first_name: name, email: email || undefined } }) }); if (r.status === 200) { toast('Gekoppeld'); openConv(current); loadList(); } else toast('Koppelen mislukt'); }

// ---- Mijn Maculis: de kamers die op één beslissing wachten (ADR-0003 D4) ----------------------
//
// Eén regel per ondernemer die vroeg om het te bewaren, met alles wat nodig is om te beslissen en
// niets meer. Er is bewust geen knop om de tekst te wijzigen: wat in zijn kamer staat moet zijn wat
// hij werkelijk zag, en een redactieslag maakt dat onwaar. `Amplify, do not author`.
//
// Uitstellen is geen knop. Dat is de knop niet indrukken, en de regel blijft dan gewoon staan.
async function loadKamers() {
  const box = $('#kamers');
  if (!box) return;
  const r = await api('/api/comm/mijn/kamers');
  const ks = (r.status === 200 && r.body.kamers) || [];
  if (!ks.length) { box.innerHTML = ''; return; }
  box.innerHTML = ks.map((k) => {
    const wie = esc(k.naam || 'Iemand');
    const org = k.organisatie ? ` (${esc(k.organisatie)})` : '';
    const wacht = k.status === 'wacht_op_contact';
    // Zonder toestemming om te benaderen gaat er niets uit. Dat is geen storing maar zijn keuze,
    // en het hoort zichtbaar te zijn in plaats van stil.
    const knoppen = wacht
      ? '<span class="note">Hij gaf geen toestemming om benaderd te worden. Er gaat niets uit.</span>'
      : `<button type="button" class="btn gold" data-act="kamerUitnodigen" data-id="${k.id}">Uitnodigen</button>`
        + `<button type="button" class="btn" data-act="kamerAfwijzen" data-id="${k.id}">Afwijzen</button>`;
    return `<div class="kamer"><div class="kamer-t">${wie}${org} heeft gevraagd om dit te bewaren. De kamer staat klaar.</div>`
      + `<div class="kamer-i">${esc(k.eersteInzicht || '')}</div><div class="kamer-a">${knoppen}</div></div>`;
  }).join('');
}
async function kamerUitnodigen(ds) {
  const r = await api('/api/comm/mijn/kamers/' + ds.id + '/uitnodigen', { method: 'POST', body: JSON.stringify({}) });
  if (r.status !== 200 || !r.body.ok) { toast('Niet verstuurd: ' + ((r.body && r.body.error) || 'onbekend')); loadKamers(); return; }
  if (r.body.bezorging === 'email') { toast('Uitnodiging verstuurd.'); loadKamers(); return; }
  // Geen e-mailtransport op deze omgeving. We melden dus niet dat er iets verstuurd is, want dat is
  // niet zo. De uitnodiging staat klaar en jij geeft de link zelf door.
  const box = $('#kamers');
  loadKamers();
  if (box) {
    box.insertAdjacentHTML('afterbegin',
      '<div class="kamer"><div class="kamer-t">Uitnodiging klaargezet. Er staat op deze omgeving geen e-mail aan, dus er is niets verstuurd.</div>'
      + '<div class="kamer-i">Geef deze link zelf door. Hij is eenmalig en zeven dagen geldig.</div>'
      + '<div class="kamer-a"><input class="uitn-link" readonly value="' + esc(r.body.link || '') + '"></div></div>');
  }
}
async function kamerAfwijzen(ds) {
  const reden = prompt('Waarom nodig je deze ondernemer niet uit? Wordt alleen intern vastgelegd.');
  if (reden === null) return;
  await api('/api/comm/mijn/kamers/' + ds.id + '/afwijzen', { method: 'POST', body: JSON.stringify({ reden }) });
  loadKamers();
}

const ACTIONS = { filter: (ds) => setFilter(ds.f), openConv: (ds) => openConv(ds.id), switchChannel: (ds) => switchChannel(ds.ch), sendChat, approveSend, saveEdit, addNote, linkUnknown, kamerUitnodigen, kamerAfwijzen };
document.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (!t) return; const fn = ACTIONS[t.dataset.act]; if (fn) fn(t.dataset, t, e); });
boot();
