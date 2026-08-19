// Relationship Workspace — the client is the primary entry point (Ingang A).
// CSP-compliant: no inline handlers. All interaction goes through delegated data-act attributes.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const api = (p, o) => fetch(p, { ...o, headers: { 'Content-Type': 'application/json', ...(o && o.headers) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const qs = new URLSearchParams(location.search);
const fmt = (d) => (d ? new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const fmtd = (d) => (d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
// Canon 10: statuslabels zijn Nederlands en menselijk. Geen Engelse hoofdletterbadges.
// Uitsluitend weergave: de opgeslagen waarden en alle logica blijven ongewijzigd.
const CHANNEL_LABEL = { EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', SMS: 'Sms', PHONE: 'Telefoon', SOCIAL: 'Social', MIJN_MACULIS: 'Mijn Maculis' };
const chan = (c) => CHANNEL_LABEL[c] || (c ? c.charAt(0) + c.slice(1).toLowerCase() : '');
const JOURNEY_LABEL = { DRAFT: 'Concept', SENT: 'Verstuurd', OPENED: 'Geopend', COMPLETED: 'Afgerond' };
const DELIVERY_LABEL = { queued: 'in wachtrij', sent: 'verstuurd', delivered: 'afgeleverd', opened: 'geopend', bounced: 'niet aangekomen', failed: 'mislukt', complained: 'als spam gemarkeerd' };
const delivery = (d) => DELIVERY_LABEL[String(d || '').toLowerCase()] || d || '';

function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2200); }

const STATE = { tab: 'overzicht', rel: null, contactId: null, convId: null, draft: null, convData: null, status: null };

async function resolveContact() {
  if (qs.get('contact')) return qs.get('contact');
  const inv = qs.get('invitation'); const tok = qs.get('token');
  if (inv || tok) {
    // Prefer the bridge when Testerbeheer stashed the record — it migrates-or-returns the Contact
    // in one call, avoiding a benign 404 probe on the not-yet-migrated case.
    const rec = sessionStorage.getItem('rel:' + (inv || tok));
    if (rec) { const b = await api('/api/comm/relationship/from-invitation', { method: 'POST', body: rec }); if (b.status === 200) return b.body.contactId; }
    const r = await api('/api/comm/relationship?' + (inv ? ('invitation=' + encodeURIComponent(inv)) : ('token=' + encodeURIComponent(tok))));
    if (r.status === 200) return r.body.contact?.id || null;
  }
  return null;
}

async function boot() {
  const st = await api('/api/comm/status');
  if (st.status === 401) { $('#root').innerHTML = '<div class="banner">Niet ingelogd. <a href="/">Log in bij Testerbeheer</a> en open de relatie opnieuw.</div>'; return; }
  if (st.status !== 200) { $('#root').innerHTML = '<div class="banner"><b>Communicatielaag nog niet geactiveerd.</b><br>De Relationship Workspace is beschikbaar zodra de Communication Layer (Postgres) live staat. Testerbeheer en First Five werken ongewijzigd.</div>'; return; }
  STATE.status = st.body;
  $('#mode').textContent = 'AI ' + (st.body.ai?.available ? 'actief' : 'mock') + ' · e-mail ' + (st.body.channels?.EMAIL?.mode || '?');
  const cid = await resolveContact();
  if (!cid) { $('#root').innerHTML = '<div class="banner">Relatie niet gevonden. Open een tester vanuit <a href="/">Testerbeheer</a>.</div>'; return; }
  STATE.contactId = cid;
  await loadRel();
}

async function loadRel() {
  const r = await api('/api/comm/relationship?contact=' + STATE.contactId);
  if (r.status !== 200) { $('#root').innerHTML = '<div class="banner">Relatie niet gevonden.</div>'; return; }
  STATE.rel = r.body; render();
}

function render() {
  const rel = STATE.rel; const c = rel.contact || {}; const o = rel.organization || {}; const s = rel.summary || {};
  const who = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Onbekend';
  const ids = (rel.identities || []).map((i) => `<div class="id"><span class="ch">${esc(chan(i.channel))}</span><span class="v">${esc(i.value)}</span></div>`).join('')
    || `<div class="id"><span class="ch">E-mail</span><span class="v">${esc(c.email || '—')}</span></div>` + (c.mobile ? `<div class="id"><span class="ch">Telefoon</span><span class="v">${esc(c.mobile)}</span></div>` : '');
  const chip = (l, v) => `<span class="chip"><b>${v}</b> ${l}</span>`;
  const badge = (n) => (n ? `<span class="badge">${n}</span>` : '');
  $('#root').innerHTML = `
    <aside class="rail">
      <div class="org">${esc(o.name || c.company_name || 'Onbekende organisatie')}</div>
      ${rel.stage ? `<span class="stage">${esc(rel.stage)}</span>` : ''}
      <div class="person"><div class="name">${esc(who)}</div>${c.role ? `<div class="role">${esc(c.role)}</div>` : ''}</div>
      <div class="ids">${ids}</div>
      ${s.nextAction ? `<div class="next"><div class="lab">Volgende stap</div><div class="val">${esc(s.nextAction.label)}</div></div>` : ''}
      <div class="chips">${chip('ongelezen', s.unread || 0)}${chip('open gesprekken', s.openConversations || 0)}${chip('follow-ups', s.openFollowUps || 0)}</div>
      <nav class="tabs">
        <button data-act="tab" data-tab="overzicht">Overzicht</button>
        <button data-act="tab" data-tab="journey">Journey</button>
        <button data-act="tab" data-tab="inzichten">Inzichten</button>
        <button data-act="tab" data-tab="communicatie">Communicatie ${badge(s.unread)}</button>
        <button data-act="tab" data-tab="activiteit">Activiteit</button>
      </nav>
    </aside>
    <div class="main">
      <div class="view" id="v-overzicht"></div>
      <div class="view" id="v-journey"></div>
      <div class="view" id="v-inzichten"></div>
      <div class="view" id="v-communicatie"></div>
      <div class="view" id="v-activiteit"></div>
    </div>`;
  selectTab(STATE.tab);
}

function selectTab(tab) {
  STATE.tab = tab;
  document.querySelectorAll('nav.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('on'));
  const v = $('#v-' + tab); v.classList.add('on');
  ({ overzicht: renderOverzicht, journey: renderJourney, inzichten: renderInzichten, communicatie: renderCommunicatie, activiteit: renderActiviteit }[tab])(v);
}

function renderOverzicht(v) {
  const rel = STATE.rel; const s = rel.summary || {}; const o = rel.organization || {}; const c = rel.contact || {};
  const convs = (rel.conversations || []).slice(0, 5).map((cv) => `<button type="button" class="list-item" data-act="goComm" data-id="${cv.id}"><div class="li-t">${esc(cv.subject || '(zonder onderwerp)')} <span class="att ${cv.status === 'NEW' ? 'new' : ''}">${esc(chan(cv.channel))}</span></div><div class="li-s">${esc((cv.last_body || '').slice(0, 90))}</div></button>`).join('') || '<div class="empty">Nog geen communicatie.</div>';
  const fus = (rel.followUps || []).map((f) => `<div class="list-item"><div class="li-t">${esc(f.title)} ${f.overdue ? '<span class="att delivery_problem">verlopen</span>' : ''}</div><div class="li-s">${f.due_at ? ('uiterlijk ' + fmtd(f.due_at)) : 'geen datum'}${f.channel_hint ? (' · ' + f.channel_hint) : ''}</div></div>`).join('') || '<div class="empty">Geen open follow-ups.</div>';
  v.innerHTML = `<h2 class="sec">Overzicht</h2>
    <div class="grid2">
      <div class="card"><div class="kv">
        <div class="k">Organisatie</div><div>${esc(o.name || '—')}</div>
        <div class="k">Domein</div><div>${esc(o.primary_domain || '—')}</div>
        <div class="k">Contactpersoon</div><div>${esc([c.first_name, c.last_name].filter(Boolean).join(' ') || '—')}</div>
        <div class="k">Relatie</div><div>${esc(rel.stage || '—')}</div>
        <div class="k">First Five</div><div>${esc(rel.journey ? (JOURNEY_LABEL[rel.journey.status] || rel.journey.status || 'geen') : 'geen')}</div>
        <div class="k">Laatste activiteit</div><div>${fmt(s.lastActivityAt) || '—'}</div>
      </div></div>
      <div class="card">
        <h2 class="sec">Snel handelen</h2>
        <div class="qa">
          <button class="btn gold" data-act="goComm">Communiceren</button>
          <button class="btn" data-act="quickFollowUp">Follow-up plannen</button>
          <button class="btn" data-act="tab" data-tab="activiteit">Historie</button>
        </div>
        <p class="aihint">Vanaf hier mail je, WhatsApp je, sms't of bel je. Maculis stelt alvast een antwoord voor.</p>
      </div>
    </div>
    <div class="grid2">
      <div class="card"><h2 class="sec">Open gesprekken</h2>${convs}</div>
      <div class="card"><h2 class="sec">Open follow-ups</h2>${fus}</div>
    </div>`;
}

function renderJourney(v) {
  const j = STATE.rel.journey;
  const steps = ['DRAFT', 'SENT', 'OPENED', 'COMPLETED'];
  const cur = j ? steps.indexOf((j.status || '').toUpperCase()) : -1;
  v.innerHTML = `<h2 class="sec">Journey · First Five</h2>
    <div class="card">
      ${j ? `<div class="tl">${steps.map((st, i) => `<div class="ev"><div class="d">${i <= cur ? '✓ bereikt' : 'nog niet'}</div><div class="b" style="color:${i <= cur ? 'var(--goldsoft)' : 'var(--faint)'}">${esc(JOURNEY_LABEL[st] || st)}</div></div>`).join('')}</div>
        <p class="aihint">Campagne: ${esc(j.campaign || '—')}. De volledige First Five-ervaring blijft in de journey zelf; hier zie je de status en historie.</p>`
      : '<div class="empty">Deze relatie heeft (nog) geen First Five journey.</div>'}
    </div>`;
}

function renderInzichten(v) {
  const rel = STATE.rel;
  const consent = Object.entries(rel.consent || {}).map(([ch, st]) => `<div class="kv"><div class="k">${esc(chan(ch))}</div><div>${st.allowed ? '<span style="color:var(--ok)">toegestaan</span>' : '<span style="color:var(--warn)">niet toegestaan (' + esc(st.reason) + ')</span>'}</div></div>`).join('');
  const mem = (rel.memory || []);
  const memRows = mem.map((m) => {
    const proposed = m.confidence === 'proposed';
    return `<div class="list-item"><div class="li-t">${esc(m.content)} <span class="att ${proposed ? 'ai_ready' : ''}">${proposed ? 'AI-voorstel' : m.kind}</span></div>
      ${proposed ? `<div class="li-s"><button class="btn" data-act="confirmMemory" data-id="${m.id}">Bevestigen</button> <button class="btn" data-act="dismissMemory" data-id="${m.id}">Verwerpen</button></div>` : `<div class="li-s">vastgelegd${m.valid_until ? ' · tot ' + fmtd(m.valid_until) : ''}</div>`}</div>`;
  }).join('') || '<div class="empty">Nog geen vastgelegde afspraken. Maculis stelt ze voor vanuit gesprekken; jij bevestigt.</div>';
  v.innerHTML = `<h2 class="sec">Inzichten</h2>
    <div class="card"><h2 class="sec">Relatiegeheugen · afspraken en feiten</h2>${memRows}
      <p class="aihint">AI-voorstellen worden pas een vastgelegd feit nadat jij ze bevestigt. Bevestigde afspraken helpen Maculis bij toekomstige concepten.</p>
    </div>
    <div class="card"><h2 class="sec">Toestemming per kanaal</h2>${consent || '<div class="empty">Geen contact gekoppeld.</div>'}</div>
    <div class="card"><h2 class="sec">Maculis-lenses</h2>
      <p class="aihint">First Five, Reveal en Technical Signals verschijnen hier zodra ze aan deze relatie gekoppeld zijn. De evaluatie-inzichten staan in Testerbeheer → Evaluaties (Maculis blijft de bron).</p>
    </div>`;
}
async function confirmMemory(id) { const r = await api('/api/comm/memory/' + id + '/confirm', { method: 'POST' }); if (r.status === 200) { toast('Bevestigd'); await loadRel(); selectTab('inzichten'); } }
async function dismissMemory(id) { const r = await api('/api/comm/memory/' + id, { method: 'DELETE' }); if (r.status === 200) { toast('Verworpen'); await loadRel(); selectTab('inzichten'); } }

async function renderCommunicatie(v) {
  v.innerHTML = '<div class="comm"><div class="convs" id="convs"></div><div class="thread" id="thread"><div class="empty" style="padding:24px">Kies een gesprek of start een nieuw bericht.</div></div></div>';
  const convs = STATE.rel.conversations || [];
  $('#convs').innerHTML = convs.map((cv) => `<button type="button" class="conv" data-act="openConv" data-id="${cv.id}"><div class="t">${esc(cv.subject || '(zonder onderwerp)')}</div><div class="s">${esc(chan(cv.channel))} · ${esc((cv.last_body || '').slice(0, 50))}</div></button>`).join('') || '<div class="empty" style="padding:16px">Nog geen gesprekken.</div>';
  if (STATE.convId) openConv(STATE.convId);
  else if (convs[0]) openConv(convs[0].id);
}
function goComm(id) { STATE.convId = id || STATE.convId; selectTab('communicatie'); }

async function openConv(id) {
  STATE.convId = id;
  document.querySelectorAll('.comm .conv').forEach((x) => x.classList.toggle('on', x.dataset.id === id));
  const r = await api('/api/comm/conversations/' + id);
  if (r.status !== 200) { $('#thread').innerHTML = '<div class="empty" style="padding:24px">Kon gesprek niet laden.</div>'; return; }
  STATE.convData = r.body;
  const d = r.body; const c = d.conversation;
  const msgs = (d.messages || []).map((m) => `<div class="m ${m.direction === 'INBOUND' ? 'in' : 'out'}"><div class="meta">${m.direction === 'INBOUND' ? esc(m.from_address || '') : 'Maculis'} · ${esc(chan(m.channel))} · ${fmt(m.created_at)} ${m.direction === 'OUTBOUND' ? ('<span class="del">' + esc(delivery(m.delivery)) + '</span>') : ''}</div>${esc(m.body_text || '')}</div>`).join('') || '<div class="empty">Geen berichten.</div>';
  const ai = d.ai_draft ? `<div class="aipanel"><h4>Maculis begrijpt dit gesprek</h4><div class="sum">${esc(d.ai_draft.summary || '')}</div><div class="sug" id="sugbar"></div></div>` : '';
  $('#thread').innerHTML = `<div class="msgs" id="msgs">${msgs}${ai}</div><div class="composer" id="composer"></div>`;
  $('#msgs').scrollTop = 99999;
  if (d.ai_draft) loadSuggestions(id);
  openDraft(id);
}

async function loadSuggestions(id) {
  const bar = $('#sugbar'); if (!bar) return;
  const r = await api('/api/comm/conversations/' + id + '/ai/suggest', { method: 'POST' });
  if (r.status === 200) bar.innerHTML = (r.body.suggestions || []).map((s) => `<button type="button" class="s" title="${esc(s.why || '')}">${esc(s.label)}</button>`).join('');
}

async function openDraft(convId) {
  const r = await api('/api/comm/conversations/' + convId + '/draft', { method: 'POST', body: JSON.stringify({}) });
  if (r.status !== 200) { $('#composer').innerHTML = '<div class="aihint">Concept niet beschikbaar. Je kunt het gesprek wel lezen.</div>'; return; }
  STATE.draft = r.body; renderComposer();
}

function channelButtons() {
  const consent = (STATE.convData && STATE.convData.consent) || {};
  const st = STATE.status || {}; const sendable = st.sendable || ['EMAIL', 'WHATSAPP', 'SMS'];
  const cur = STATE.draft.draft.channel;
  return sendable.map((ch) => {
    const cs = consent[ch]; const blocked = cs && !cs.allowed;
    return `<button type="button" class="chan ${ch === cur ? 'on' : ''} ${blocked ? 'blocked' : ''}" title="${blocked ? ('Geblokkeerd: ' + esc(cs.reason)) : ''}" ${blocked ? '' : `data-act="switchChannel" data-ch="${ch}"`}>${esc(chan(ch))}</button>`;
  }).join('');
}

function renderComposer() {
  const dr = STATE.draft.draft; const chat = STATE.draft.chat || [];
  $('#composer').innerHTML = `
    <div class="chrow">${channelButtons()}<span class="aihint" style="margin-left:auto">${dr.ai_generated ? 'AI-concept' : 'jouw tekst'}${dr.human_edited ? ' · door jou aangepast' : ''}</span></div>
    <textarea id="body" data-act="body">${esc(dr.body || '')}</textarea>
    <div class="aichat">
      <div class="log" id="chatlog">${chat.map((m) => `<div class="cm ${m.role}">${esc(m.content)}</div>`).join('')}</div>
      <div class="aibar">
        <input id="aiin" placeholder="Zeg wat Maculis moet doen, bv. maak dit warmer en korter">
        <button class="btn" data-act="sendChat">Vraag Maculis</button>
      </div>
      <div class="aihint">Bijvoorbeeld: “Reageer alleen op zijn laatste vraag” · “Maak hiervan een WhatsApp” · “Waarom stel je dit voor?”</div>
    </div>
    <div class="sendrow">
      <button class="btn gold" id="sendbtn" data-act="approveSend">Goedkeuren en verzenden</button>
      <button class="btn" data-act="saveEdit">Concept opslaan</button>
      <span class="note">Niets wordt automatisch verzonden. Jij keurt het laatste woord.</span>
    </div>`;
  $('#body').addEventListener('input', markDirty);
  $('#aiin').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
}

let dirty = false; let saveTimer = null;
function markDirty() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveEdit, 900); }
async function saveEdit() {
  if (!STATE.draft) return;
  const r = await api('/api/comm/drafts/' + STATE.draft.draft.id, { method: 'PATCH', body: JSON.stringify({ body: $('#body').value }) });
  if (r.status === 200) { STATE.draft = r.body; dirty = false; }
}
async function sendChat() {
  const inp = $('#aiin'); const msg = inp.value.trim(); if (!msg) return; inp.value = '';
  if (dirty) await saveEdit();
  const log = $('#chatlog'); log.insertAdjacentHTML('beforeend', `<div class="cm user">${esc(msg)}</div>`); log.scrollTop = 99999;
  const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
  if (r.status === 200) { STATE.draft = { draft: r.body.draft, versions: r.body.versions, chat: r.body.chat }; renderComposer(); $('#chatlog').scrollTop = 99999; }
  else toast('Maculis kon dit niet verwerken.');
}
async function switchChannel(ch) {
  if (dirty) await saveEdit();
  const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/channel', { method: 'POST', body: JSON.stringify({ channel: ch }) });
  if (r.status === 200) { STATE.draft = r.body; renderComposer(); toast('Kanaal: ' + ch); }
}
async function approveSend() {
  if (dirty) await saveEdit();
  $('#sendbtn').disabled = true;
  const r = await api('/api/comm/drafts/' + STATE.draft.draft.id + '/send', { method: 'POST', body: JSON.stringify({}) });
  if (r.status === 200 && r.body.ok) { toast('Verzonden' + (r.body.providerMode === 'mock' ? ' (mock)' : '')); STATE.convId = r.body.conversationId; await loadRel(); selectTab('communicatie'); }
  else { $('#sendbtn').disabled = false; toast('Verzenden geblokkeerd: ' + (r.body.reason || 'onbekend') + (r.body.consent ? (' (' + r.body.consent.reason + ')') : '')); }
}

function renderActiviteit(v) {
  v.innerHTML = '<h2 class="sec">Activiteit</h2><div class="card"><div id="tl" class="tl"><div class="empty">Laden…</div></div></div>';
  api('/api/comm/relationship/' + STATE.contactId + '/timeline').then((r) => {
    if (r.status !== 200) { $('#tl').innerHTML = '<div class="empty">Geen tijdlijn.</div>'; return; }
    const items = r.body.timeline || [];
    if (!items.length) { $('#tl').innerHTML = '<div class="empty">Nog geen activiteit.</div>'; return; }
    const label = (it) => (it.kind === 'message' ? `${it.direction === 'INBOUND' ? 'Ontvangen' : 'Verzonden'} (${it.channel}): ${esc((it.body || '').slice(0, 120))}` : mapActivity(it.type));
    $('#tl').innerHTML = items.map((it) => `<div class="ev"><div class="d">${fmt(it.at)}${it.kind === 'message' && it.direction === 'OUTBOUND' ? ' · ' + esc(it.delivery) : ''}</div><div class="b">${label(it)}</div></div>`).join('');
  });
}
function mapActivity(t) { return ({ message_received: 'Bericht ontvangen', message_sent: 'Bericht verzonden', message_failed: 'Verzending mislukt', ai_draft_created: 'AI-voorstel gemaakt', follow_up_created: 'Follow-up gepland', follow_up_done: 'Follow-up afgerond', contact_matched: 'Onbekende afzender gekoppeld', invitation_sent: 'First Five uitnodiging verzonden', journey_completed: 'First Five afgerond' }[t] || esc(t)); }

async function quickFollowUp() {
  const title = prompt('Follow-up (bv. “Dinsdag terugbellen”):'); if (!title) return;
  const r = await api('/api/comm/followups', { method: 'POST', body: JSON.stringify({ contactId: STATE.contactId, organizationId: STATE.rel.organization?.id, title }) });
  if (r.status === 201) { toast('Follow-up gepland'); loadRel(); }
}

// ---- one delegated click handler (CSP-safe) ----
const ACTIONS = { tab: (ds) => selectTab(ds.tab), goComm: (ds) => goComm(ds.id), openConv: (ds) => openConv(ds.id), switchChannel: (ds) => switchChannel(ds.ch), sendChat, approveSend, saveEdit, quickFollowUp, confirmMemory: (ds) => confirmMemory(ds.id), dismissMemory: (ds) => dismissMemory(ds.id) };
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const fn = ACTIONS[t.dataset.act]; if (fn) fn(t.dataset, t, e);
});
boot();
