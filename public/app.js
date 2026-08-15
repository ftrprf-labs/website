// FTRLABS Invitation Manager — admin SPA (vanilla, no build step).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Inline line icons (no dependency, no emoji). They inherit the button's text
// colour via stroke="currentColor" so they sit quietly in the Dark Admin theme.
const svg = (p) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON = {
  whatsapp: svg('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5Z"/>'),
  email: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
  edit: svg('<path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z"/><path d="M14.5 6.5l3 3"/>'),
  del: svg('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7"/><path d="M10 11v6M14 11v6"/>'),
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  history: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 1.8"/>'),
};

// Dutch UI labels for the consent enum (internal values stay English).
const CONSENT_LABEL = { UNKNOWN: 'ONBEKEND', OPTED_IN: 'TOEGESTAAN', OPTED_OUT: 'AFGEWEZEN' };
// Dutch labels for the standardised consent-method machine values (audit/reporting).
const METHOD_LABEL = { VERBAL: 'Mondeling', PHONE: 'Telefonisch', EMAIL: 'Per e-mail', WHATSAPP: 'Via WhatsApp', WRITTEN: 'Schriftelijk', OTHER: 'Anders' };

// Dutch UI labels for the history layer (internal event/values stay English).
const EVENT_LABEL = {
  tester_created: 'Tester aangemaakt',
  invitation_sent: 'Uitnodiging verzonden',
  invitation_failed: 'Uitnodiging mislukt',
  invitation_skipped: 'Uitnodiging overgeslagen',
  invitation_blocked: 'Uitnodiging geblokkeerd',
  journey_started: 'Maculis gestart',
  evaluation_started: 'Evaluatie gestart',
  evaluation_completed: 'Evaluatie afgerond',
  consent_recorded: 'Toestemming vastgelegd',
  consent_changed: 'Toestemming gewijzigd',
  published_to_maculis: 'Gepubliceerd naar Maculis',
  pass_the_lens_introduction: 'Aangedragen via Pass the Lens',
};
const CHANNEL_LABEL = { whatsapp: 'WhatsApp', email: 'E-mail' };
const RESULT_LABEL = {
  success: 'Succesvol', failed: 'Mislukt', skipped: 'Overgeslagen', blocked: 'Geblokkeerd',
  opted_in: 'Toestemming gegeven', opted_out: 'Geen toestemming', unknown: 'Onbekend',
};
const SOURCE_LABEL = {
  manual: 'Handmatig', csv: 'CSV-import', xlsx: 'Excel-import', import: 'Import',
  pass_the_lens: 'Pass the Lens', unknown: 'Onbekend',
};
const CONSENT_OPTIONS = [
  ['UNKNOWN', 'Onbekend'],
  ['OPTED_IN', 'Toestemming gegeven'],
  ['OPTED_OUT', 'Geen toestemming'],
];

const state = {
  cfg: null,
  template: null,
  invitations: [],
  selection: new Set(),
  search: '',
  statusFilter: '',
  waQueue: [],
  waIndex: 0,
  editingId: null,
  view: 'testers',
  evalData: null,
  evalFilter: '',
  attention: null,
};

// Attention — HUMAN presentation of the server's canonical states. The user maintains relationships,
// not an AI: the copy never says "AI", it says what is true for them ("Antwoord staat klaar"). One
// quiet accent per state; gold is reserved for the single most meaningful thing.
const ATTN_PRESENT = {
  DELIVERY_PROBLEM: 'Levering mislukt',
  REPLY_READY: 'Antwoord staat klaar',
  NEW: 'Nieuw bericht',
  UNREAD: 'Nieuw bericht',
  NEEDS_ACTION: 'Vraagt aandacht',
  WAITING_FOR_CUSTOMER: 'Wacht op klant',
  RESOLVED: 'Afgehandeld',
};
const ATTN_CHANNEL = { EMAIL: 'E-mail', WHATSAPP: 'WhatsApp', SMS: 'SMS', PHONE: 'Telefoon', SOCIAL: 'Social' };
const attnLabel = (s) => ATTN_PRESENT[s] || 'Vraagt aandacht';

// ---- tiny API layer ------------------------------------------------------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw Object.assign(new Error((data && data.error) || res.statusText), { status: res.status, data });
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}

function personalUrl(token) {
  // Show the PUBLIC Journey URL (what the tester opens), matching server links.
  const base = state.cfg.maculisPublicUrl || state.cfg.maculisHost;
  return `${base}/?p=${encodeURIComponent(token)}`;
}

// ---- bootstrap -----------------------------------------------------------
async function boot() {
  state.cfg = await api('/api/config');
  if (state.cfg.authRequired && !state.cfg.authed) {
    showLogin();
  } else {
    await startApp();
  }
}

function showLogin() {
  $('#login').classList.remove('hidden');
  $('#app').classList.add('hidden');
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-error');
    err.classList.add('hidden');
    try {
      await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) });
      location.reload();
    } catch (ex) {
      err.textContent = ex.message || 'Inloggen mislukt';
      err.classList.remove('hidden');
    }
  });
}

async function startApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#campaign-pill').textContent = state.cfg.campaign;
  if (state.cfg.authRequired) $('#btn-logout').classList.remove('hidden');

  // status filter options
  const sf = $('#status-filter');
  state.cfg.statuses.forEach((s) => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s; sf.appendChild(o);
  });

  wireEvents();
  const t = await api('/api/template');
  state.template = t.template;
  await refresh();
  loadAttention(); // best-effort, non-blocking — cockpit fills in as soon as attention data returns
}

async function refresh() {
  const data = await api('/api/invitations');
  state.invitations = data.invitations;
  // prune selection of removed ids
  state.selection = new Set([...state.selection].filter((id) => state.invitations.some((i) => i.id === id)));
  render();
}

// ---- rendering -----------------------------------------------------------
function visibleRows() {
  const q = state.search.trim().toLowerCase();
  return state.invitations.filter((r) => {
    if (state.statusFilter && r.status !== state.statusFilter) return false;
    if (!q) return true;
    const hay = `${r.first_name} ${r.last_name} ${r.company_name}`.toLowerCase();
    return hay.includes(q);
  });
}

function render() {
  const rows = visibleRows();
  const tbody = $('#tester-rows');
  tbody.innerHTML = '';

  $('#empty-state').classList.toggle('hidden', state.invitations.length !== 0);

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = rowHtml(r);
    tbody.appendChild(tr);
  }

  // wire per-row controls
  $$('#tester-rows [data-check]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) state.selection.add(cb.dataset.check);
      else state.selection.delete(cb.dataset.check);
      updateSelectionUi();
    });
  });
  $$('#tester-rows [data-copy]').forEach((b) => {
    b.addEventListener('click', () => copyLink(b.dataset.copy));
  });
  $$('#tester-rows [data-wa]').forEach((b) => {
    b.addEventListener('click', () => startWhatsAppSequence([b.dataset.wa]));
  });
  $$('#tester-rows [data-mail]').forEach((b) => {
    b.addEventListener('click', () => openMailto(b.dataset.mail));
  });
  $$('#tester-rows [data-history]').forEach((b) => {
    b.addEventListener('click', () => openHistory(b.dataset.history));
  });
  $$('#tester-rows [data-rel]').forEach((b) => {
    b.addEventListener('click', () => openRelationship(b.dataset.rel));
  });
  $$('#tester-rows [data-edit]').forEach((b) => {
    b.addEventListener('click', () => openEdit(b.dataset.edit));
  });
  $$('#tester-rows [data-del]').forEach((b) => {
    b.addEventListener('click', () => removeTester(b.dataset.del));
  });

  updateSelectionUi();
  renderStats();
}

function rowHtml(r) {
  const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || '—';
  const contact = [r.email, r.mobile].filter(Boolean);
  const url = personalUrl(r.token);
  const checked = state.selection.has(r.id) ? 'checked' : '';
  // Pass the Lens candidate marker: a quiet tag + the referrer, so the admin sees at a
  // glance that this is a controlled introduction (brief §5). Latest introduction shown.
  const intros = Array.isArray(r.introductions) ? r.introductions : [];
  const lastIntro = intros.length ? intros[intros.length - 1] : null;
  const ptlVia = lastIntro && lastIntro.by_name ? ' · via ' + esc(lastIntro.by_name) : '';
  const ptlTag = (r.source === 'pass_the_lens')
    ? `<div class="ptl-tag" title="Aangedragen via Pass the Lens${lastIntro && lastIntro.at ? ' op ' + esc(fmtTs(lastIntro.at)) : ''}${intros.length > 1 ? ' (' + intros.length + '×)' : ''}">Pass the Lens${ptlVia}</div>`
    : '';
  // Fail-closed: contact is only allowed with an explicit OPTED_IN. UNKNOWN and
  // OPTED_OUT both disable the WhatsApp/e-mail actions.
  const noContact = r.consent_status !== 'OPTED_IN';
  const blockTitle = r.consent_status === 'OPTED_OUT'
    ? 'Geblokkeerd — toestemming ingetrokken/geweigerd'
    : 'Geblokkeerd — geen toestemming (OPTED_IN vereist)';
  return `
    <td class="col-check" data-label="">
      <input type="checkbox" data-check="${r.id}" ${checked} />
    </td>
    <td data-label="Naam">${attnDot(r.email)}<button class="name-main link-name" data-rel="${r.id}" title="Open relatie (Communicatie, Journey, Historie)">${esc(name)}</button>${ptlTag}</td>
    <td data-label="Bedrijf"><button class="link-name link-dim" data-rel="${r.id}" title="Open relatie">${esc(r.company_name || '—')}</button></td>
    <td data-label="Contact">
      <div>${esc(contact[0] || '—')}</div>
      ${contact[1] ? `<div class="contact-line">${esc(contact[1])}</div>` : ''}
    </td>
    <td data-label="Domein">${esc(r.domain || '—')}</td>
    <td data-label="Link">
      <div class="link-cell">
        <code title="${esc(url)}">${esc(url)}</code>
        <button class="copy-btn" data-copy="${r.id}" title="Kopieer link" aria-label="Kopieer link">${ICON.copy}</button>
      </div>
    </td>
    <td data-label="Status">
      <span class="status-badge status-${r.status}" title="Systeemgestuurd — corrigeren via Bewerken">${r.status}</span>
    </td>
    <td data-label="Toestemming">
      <span class="status-badge consent-${r.consent_status}" title="Toestemming — wijzigen via Bewerken">${CONSENT_LABEL[r.consent_status] || r.consent_status}</span>
    </td>
    <td class="col-actions" data-label="Acties">
      <div class="row-actions">
        <button data-rel="${r.id}" title="Open relatie (Relationship Workspace)" aria-label="Open relatie">${ICON.relation || '🗂'}</button>
        <button class="act-wa" data-wa="${r.id}" title="${noContact ? blockTitle : 'Via WhatsApp uitnodigen'}" aria-label="Via WhatsApp uitnodigen" ${noContact ? 'disabled' : ''}>${ICON.whatsapp}</button>
        <button data-mail="${r.id}" title="${noContact ? blockTitle : 'E-mail uitnodigen'}" aria-label="E-mail uitnodigen" ${noContact ? 'disabled' : ''}>${ICON.email}</button>
        <button data-history="${r.id}" title="Historie bekijken" aria-label="Historie bekijken">${ICON.history}</button>
        <button data-edit="${r.id}" title="Bewerken" aria-label="Bewerken">${ICON.edit}</button>
        <button data-del="${r.id}" title="Verwijderen" aria-label="Verwijderen">${ICON.del}</button>
      </div>
    </td>`;
}

// Open the Relationship Workspace for a tester. The client is the primary entry point (Ingang A):
// name/company open the full relationship (Overzicht, Journey, Inzichten, Communicatie, Activiteit).
// We stash the minimal record so the workspace can bridge it into a permanent Contact even if the
// Communication Layer has not migrated this tester yet (§9).
function openRelationship(id) {
  const r = state.invitations.find((x) => x.id === id);
  if (!r) return;
  const minimal = { id: r.id, token: r.token, first_name: r.first_name, last_name: r.last_name, email: r.email, mobile: r.mobile, company_name: r.company_name, domain: r.domain, campaign: r.campaign, status: r.status };
  try { sessionStorage.setItem('rel:' + r.id, JSON.stringify(minimal)); if (r.token) sessionStorage.setItem('rel:' + r.token, JSON.stringify(minimal)); } catch { /* ignore */ }
  window.location.href = '/workspace.html?invitation=' + encodeURIComponent(r.id);
}

function renderStats() {
  const total = state.invitations.length;
  $('#stat-total').textContent = `${total} tester${total === 1 ? '' : 's'}`;
  const counts = {};
  for (const r of state.invitations) counts[r.status] = (counts[r.status] || 0) + 1;
  $('#stat-breakdown').textContent = Object.entries(counts)
    .map(([s, n]) => `${n} ${s}`)
    .join('  ·  ');
}

// ---- Attention Cockpit ---------------------------------------------------
// One channel-agnostic glance above the table: is there new communication, how much, from whom, on
// which channel, where an AI reply is ready. Read-state comes from the server watermark, so the badge
// reflects real human interaction — not raw webhook/DB counts. One click deep-links into the exact
// conversation in the Inbox. Fails silently (hidden) when the Communication Layer is not enabled.
async function loadAttention() {
  try {
    const a = await api('/api/comm/attention');
    state.attention = a;
  } catch {
    state.attention = null; // layer off / not authed — no cockpit, no noise
  }
  renderCockpit();
  updateInboxBadge();
  if (state.view === 'testers') render(); // refresh row indicators
}

function updateInboxBadge() {
  const badge = $('#inbox-badge');
  if (!badge) return;
  const n = state.attention && state.attention.summary ? state.attention.summary.actionable : 0;
  if (n > 0) { badge.textContent = n > 99 ? '99+' : String(n); badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

// One compact conversation preview. It is the relationship + what they last said + what Maculis has
// ready — a meaningful line, not a feed row. The whole card is one button that opens the exact
// conversation (which marks it read). Channel is quiet context, never a separate product world.
function previewCard(c, { hero = false } = {}) {
  const st = attnLabel(c.state);
  const meta = [c.org || c.email, ATTN_CHANNEL[c.channel] || c.channel].filter(Boolean).join(' · ');
  const snippet = c.preview ? `<span class="attn-snippet">${esc(c.preview)}</span>` : '';
  const cta = hero ? 'Bekijk gesprek' : 'Bekijk';
  const aria = `Open gesprek met ${c.name}${c.org ? ' van ' + c.org : ''} — ${st}`;
  return `
    <button class="attn-card${hero ? ' attn-card-hero' : ''} attn-${c.state}" data-attn-conv="${c.id}" aria-label="${esc(aria)}">
      <span class="attn-state">${esc(st)}</span>
      <span class="attn-line">
        <span class="attn-who">${esc(c.name)}</span>
        <span class="attn-meta">${esc(meta)}</span>
      </span>
      ${snippet}
      <span class="attn-cta">${cta} <span class="arw" aria-hidden="true">→</span></span>
    </button>`;
}

function renderCockpit() {
  const el = $('#attention-cockpit');
  if (!el) return;
  const a = state.attention;
  if (!a || !a.summary) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  const sum = a.summary;
  const head = sum.headline || {};

  // Zero-state — designed, not an afterthought. Calm, almost luxurious; Maculis gives attention back.
  if (!sum.actionable) {
    el.classList.add('is-calm');
    el.innerHTML = `
      <div class="cockpit-zero" role="status">
        <span class="zero-mark" aria-hidden="true"></span>
        <span class="zero-text"><b>${esc(head.primary || 'Je bent bij.')}</b> ${esc(head.secondary || 'Voor nu hoeft er niets van je.')}</span>
      </div>`;
    return;
  }
  el.classList.remove('is-calm');

  const queue = a.queue || [];
  const hero = queue[0];
  const rest = queue.slice(1, 4); // keep it calm: a clear first step + a few more, the rest live in the Inbox
  const overflow = queue.length - (1 + rest.length);

  // Level 1: what matters today, in human language. Level 2: the priority + a few more. Level 3 (the
  // table) sits below. Gold is spent only on the single most meaningful next step.
  const header = `
    <div class="cockpit-head">
      <h2 class="cockpit-h1">${esc(head.primary)}</h2>
      ${head.secondary ? `<p class="cockpit-h2">${esc(head.secondary)}</p>` : ''}
      <a class="cockpit-inbox" href="/comm.html">Naar Inbox<span class="arw" aria-hidden="true"> →</span></a>
    </div>`;

  // Present a single "first to look at" ONLY when there is more than one — the deterministic priority
  // (most-urgent state, then oldest waiting) is honest, never an invented AI ranking.
  const heroBlock = queue.length > 1
    ? `<div class="cockpit-hero"><span class="hero-eyebrow">Als eerste bekijken</span>${previewCard(hero, { hero: true })}</div>`
    : previewCard(hero, { hero: true });
  const restBlock = rest.length ? `<div class="cockpit-rest">${rest.map((c) => previewCard(c)).join('')}</div>` : '';
  const moreBlock = overflow > 0
    ? `<a class="cockpit-more" href="/comm.html">Nog ${overflow} gesprek${overflow === 1 ? '' : 'ken'} in de Inbox<span class="arw" aria-hidden="true"> →</span></a>`
    : '';

  el.innerHTML = header + heroBlock + restBlock + moreBlock;
}

// A small attention dot on a Testerbeheer row, keyed by the tester's e-mail (the stable join to a
// comm relationship). Colour is never the ONLY signal: the accessible label carries the state text,
// and the cockpit above states it in words. Only actionable relationships get a dot.
function attnDot(email) {
  const map = state.attention && state.attention.byEmail;
  const key = (email || '').trim().toLowerCase();
  const hit = map && key ? map[key] : null;
  if (!hit) return '';
  const label = `${attnLabel(hit.state)} — open gesprek`;
  return `<span class="row-attn attn-${hit.state}" role="button" tabindex="0" title="${esc(label)}" aria-label="${esc(label)}" data-attn-conv="${hit.conversationId}"></span>`;
}

function updateSelectionUi() {
  const n = state.selection.size;
  $('#selection-count').textContent = `${n} geselecteerd`;
  $('#btn-wa-next').disabled = n === 0;
  $('#btn-publish').disabled = n === 0;
  $('#btn-email-invite').disabled = n === 0;
  const vis = visibleRows();
  const allChecked = vis.length > 0 && vis.every((r) => state.selection.has(r.id));
  $('#check-all').checked = allChecked;
}

// ---- actions -------------------------------------------------------------
// Status is SYSTEM-DRIVEN — it changes only on real events:
//   create -> DRAFT · successful e-mail/WhatsApp send -> INVITED ·
//   personal link activated (resolve) -> STARTED.
// The table shows a read-only badge; the only manual path is the explicit
// "Status corrigeren" field inside the edit modal (administrative exception),
// which calls POST /api/invitations/:id/status directly.

async function copyLink(id) {
  const r = state.invitations.find((x) => x.id === id);
  if (!r) return;
  const url = personalUrl(r.token);
  try {
    await navigator.clipboard.writeText(url);
    toast('Persoonlijke link gekopieerd');
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast('Link gekopieerd');
  }
}

async function openMailto(id) {
  const { url, hasEmail } = await api(`/api/invitations/${id}/mailto`);
  if (!hasEmail) { toast('Geen e-mailadres bekend'); return; }
  window.location.href = url;
}

async function removeTester(id) {
  const r = state.invitations.find((x) => x.id === id);
  const who = r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || r.company_name : '';
  if (!confirm(`Tester "${who}" definitief verwijderen?`)) return;
  await api(`/api/invitations/${id}`, { method: 'DELETE' });
  state.selection.delete(id);
  await refresh();
  toast('Verwijderd');
}

// ---- Publish to Maculis --------------------------------------------------
async function publishSelected() {
  const ids = visibleRows().filter((r) => state.selection.has(r.id)).map((r) => r.id);
  if (!ids.length) { toast('Selecteer eerst één of meer testers'); return; }
  if (!state.cfg.maculisConfigured) {
    toast('Maculis-sync niet ingesteld (MACULIS_SYNC_KEY ontbreekt)');
    return;
  }
  const btn = $('#btn-publish');
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = '⇪ Publiceren…';
  try {
    // Browser sends only ids — never PII.
    const res = await api('/api/publish', { method: 'POST', body: JSON.stringify({ ids }) });
    toast(`${res.published} tester(s) gepubliceerd naar Maculis` + (res.blocked ? ` · ${res.blocked} geblokkeerd (geen toestemming)` : ''));
  } catch (e) {
    toast(e.message || 'Publiceren mislukt');
  } finally {
    btn.textContent = prev;
    updateSelectionUi();
  }
}

// ---- E-mail invite -------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function startEmailInvite() {
  const recs = visibleRows().filter((r) => state.selection.has(r.id));
  if (!recs.length) { toast('Selecteer eerst één of meer testers'); return; }
  state.emailIds = recs.map((r) => r.id);

  // Per-tester check for a valid e-mail (server re-checks on send).
  const list = recs.map((r) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.company_name || '—';
    return { name, email: (r.email || '').trim(), valid: EMAIL_RE.test((r.email || '').trim()) };
  });
  const validCount = list.filter((x) => x.valid).length;

  $('#email-recipients').innerHTML = list
    .map((x) => `<div class="rcpt ${x.valid ? '' : 'invalid'}">
        <span class="rcpt-name">${esc(x.name)}</span>
        <span class="rcpt-addr">${x.valid ? esc(x.email) : 'geen geldig e-mailadres'}</span>
      </div>`)
    .join('');
  $('#email-summary').textContent =
    `${recs.length} geselecteerd · ${validCount} met geldig e-mailadres` +
    (validCount < recs.length ? ` · ${recs.length - validCount} worden overgeslagen` : '');

  // Rendered subject/body preview (server-side template) from the first valid tester.
  const firstValid = recs.find((r) => EMAIL_RE.test((r.email || '').trim())) || recs[0];
  try {
    const m = await api(`/api/invitations/${firstValid.id}/mailto`);
    $('#email-subject-preview').value = m.subject;
    $('#email-body-preview').value = m.body;
  } catch { /* leave preview blank */ }

  const warn = $('#email-warn');
  if (!state.cfg.mailConfigured) {
    warn.textContent =
      'In deze omgeving wordt e-mail niet echt verzonden (geen verzendend mailtransport). Er wordt niets verstuurd en niemand komt op INVITED.';
    warn.classList.remove('hidden');
  } else {
    warn.classList.add('hidden');
  }
  $('#email-error').classList.add('hidden');
  $('#btn-email-send').disabled = validCount === 0;
  $('#email-modal').classList.remove('hidden');
}

async function sendEmailInvites() {
  const btn = $('#btn-email-send');
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verzenden…';
  const err = $('#email-error');
  err.classList.add('hidden');
  try {
    // Browser sends only ids — never PII. Server marks INVITED only on success.
    const res = await api('/api/invite/email', { method: 'POST', body: JSON.stringify({ ids: state.emailIds }) });
    closeModal('#email-modal');
    await refresh();
    const blocked = (res.results || []).filter((x) => x.reason === 'opted_out' || x.reason === 'no_consent').length;
    const noEmail = (res.results || []).filter((x) => x.reason === 'no_email').length;
    if (!res.delivers) {
      // No real delivering transport (mock/unset): nothing was actually sent and
      // NOBODY was moved to INVITED — say so honestly.
      toast('E-mail niet echt verzonden (geen verzendend transport) — niemand op INVITED' +
        (blocked ? ` · ${blocked} geblokkeerd (geen toestemming)` : ''));
    } else {
      const parts = [`${res.sent} verzonden`];
      if (noEmail) parts.push(`${noEmail} zonder e-mail`);
      if (blocked) parts.push(`${blocked} geblokkeerd (geen toestemming)`);
      if (res.failed) parts.push(`${res.failed} mislukt`);
      toast(parts.join(' · '));
    }
  } catch (e) {
    err.textContent = e.message || 'Verzenden mislukt';
    err.classList.remove('hidden');
  } finally {
    btn.textContent = prev;
    btn.disabled = false;
  }
}

// ---- WhatsApp sequence ---------------------------------------------------
async function startWhatsAppSequence(ids) {
  state.waQueue = ids.filter(Boolean);
  state.waIndex = 0;
  if (!state.waQueue.length) return;
  $('#wa-modal').classList.remove('hidden');
  await showWaCurrent();
}

async function showWaCurrent() {
  const id = state.waQueue[state.waIndex];
  const r = state.invitations.find((x) => x.id === id);
  if (!r) { advanceWa(); return; }
  // Fail-closed: WhatsApp only with explicit OPTED_IN (server enforces 403 too).
  if (r.consent_status !== 'OPTED_IN') {
    const why = r.consent_status === 'OPTED_OUT' ? 'AFGEWEZEN' : 'geen toestemming';
    toast(`${r.first_name || r.company_name || 'Tester'}: ${why} — WhatsApp overgeslagen`);
    advanceWa(); return;
  }
  let wa;
  try { wa = await api(`/api/invitations/${id}/whatsapp`); }
  catch (e) { toast(e.message); advanceWa(); return; }
  $('#wa-progress').textContent =
    state.waQueue.length > 1 ? `Tester ${state.waIndex + 1} van ${state.waQueue.length}` : '';
  $('#wa-name').textContent = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.company_name || '—';
  $('#wa-number').textContent = wa.hasNumber ? `· ${r.mobile}` : '· geen mobiel nummer';
  $('#wa-preview').value = wa.text;
  const warn = $('#wa-warn');
  if (!wa.hasNumber) {
    warn.textContent = 'Geen mobiel nummer: WhatsApp opent zonder ontvanger, je moet het contact zelf kiezen.';
    warn.classList.remove('hidden');
  } else {
    warn.classList.add('hidden');
  }
  $('#btn-wa-open').dataset.url = wa.url;
  $('#btn-wa-open').dataset.id = id;
  // Two-step manual flow: opening WhatsApp does NOT change status. Reset the
  // buttons so every tester starts at "WhatsApp openen".
  $('#btn-wa-open').classList.remove('hidden');
  $('#btn-wa-sent').classList.add('hidden');
  $('#wa-hint').classList.add('hidden');
}

// Step 1: open WhatsApp. Deliberately does NOT touch the lifecycle status — the
// admin still has to press Send in WhatsApp and then confirm here (option 2).
function openWaCurrent() {
  const btn = $('#btn-wa-open');
  window.open(btn.dataset.url, '_blank', 'noopener');
  $('#btn-wa-sent').dataset.id = btn.dataset.id;
  btn.classList.add('hidden');
  $('#btn-wa-sent').classList.remove('hidden');
  $('#wa-hint').classList.remove('hidden');
}

// Step 2: the admin explicitly confirms the invitation was actually sent. ONLY
// now does the tester go to INVITED (+ invited_at + invitation_sent history).
async function confirmWaSent() {
  const id = $('#btn-wa-sent').dataset.id;
  try {
    await api(`/api/invitations/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'SENT', channel: 'whatsapp' }) });
    toast('Uitnodiging geregistreerd — SENT');
  } catch (e) { toast(e.message); }
  advanceWa();
}

async function advanceWa() {
  state.waIndex++;
  if (state.waIndex >= state.waQueue.length) {
    $('#wa-modal').classList.add('hidden');
    await refresh();
    toast('WhatsApp-uitnodiging(en) verwerkt');
    return;
  }
  await refresh();
  await showWaCurrent();
}

// ---- import wizard -------------------------------------------------------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

let importPreview = null;

async function onImportFile(file) {
  const err = $('#import-error');
  err.classList.add('hidden');
  // Remember the file kind so provenance can record csv vs xlsx (brief §6).
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  state.importSource = (ext === 'xlsx' || ext === 'xls') ? 'xlsx' : (ext === 'csv' ? 'csv' : 'import');
  try {
    const dataBase64 = await fileToBase64(file);
    const preview = await api('/api/import/preview', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type, dataBase64 }),
    });
    importPreview = preview;
    renderPreview(preview);
  } catch (ex) {
    err.textContent = ex.message || 'Import mislukt';
    err.classList.remove('hidden');
  }
}

function renderPreview(pv) {
  $('#import-step-file').classList.add('hidden');
  $('#import-step-preview').classList.remove('hidden');
  $('#btn-commit-import').classList.remove('hidden');

  const s = pv.summary;
  $('#import-summary').innerHTML = `
    <span class="chip chip-ok">${s.ok} importeren</span>
    <span class="chip chip-dup">${s.duplicate} dubbel</span>
    <span class="chip chip-bad">${s.invalid} ongeldig</span>`;

  const fields = ['first_name', 'last_name', 'company_name', 'email', 'mobile', 'domain'];
  const labels = { first_name: 'Voornaam', last_name: 'Achternaam', company_name: 'Bedrijf', email: 'E-mail', mobile: 'Mobiel', domain: 'Domein' };

  const head = `<thead><tr>
    <th>#</th>
    ${fields.map((f) => `<th>${labels[f]}</th>`).join('')}
    <th>Signaal</th></tr></thead>`;

  const body = pv.rows.map((row, i) => {
    const cls = row._action === 'error' ? 'pv-error' : row._action === 'duplicate' ? 'pv-dup' : '';
    let tag = '<span class="pv-tag ok">✓ ok</span>';
    if (row._action === 'error') tag = `<span class="pv-tag err" title="${esc(row._errors.join('; '))}">✕ ${esc(row._errors.join('; '))}</span>`;
    else if (row._action === 'duplicate') tag = `<span class="pv-tag dup">⚠ dubbel (${esc(row._duplicate.label)})</span>`;
    else if (row._warnings.length) tag = `<span class="pv-tag ok" title="${esc(row._warnings.join('; '))}">✓ let op</span>`;
    return `<tr class="${cls}">
      <td>${i + 1}</td>
      ${fields.map((f) => `<td>${esc(row[f] || '')}</td>`).join('')}
      <td>${tag}</td></tr>`;
  }).join('');

  $('#preview-table').innerHTML = head + `<tbody>${body}</tbody>`;
}

async function commitImport() {
  if (!importPreview) return;
  // Only rows flagged 'import' get created. Invalid rows never import; duplicates
  // are skipped by default so nothing is silently overwritten.
  const rows = importPreview.rows
    .filter((r) => r._action === 'import')
    .map(({ first_name, last_name, company_name, email, mobile, domain }) =>
      ({ first_name, last_name, company_name, email, mobile, domain }));
  if (!rows.length) { toast('Geen geldige, unieke rijen om te importeren'); return; }
  const res = await api('/api/import/commit', { method: 'POST', body: JSON.stringify({ rows, source: state.importSource || 'import' }) });
  closeModal('#import-modal');
  resetImport();
  await refresh();
  toast(`${res.created} tester(s) geïmporteerd`);
}

function resetImport() {
  importPreview = null;
  $('#import-file').value = '';
  $('#import-step-file').classList.remove('hidden');
  $('#import-step-preview').classList.add('hidden');
  $('#btn-commit-import').classList.add('hidden');
  $('#import-error').classList.add('hidden');
}

// ---- edit / add ----------------------------------------------------------
function openEdit(id) {
  state.editingId = id || null;
  const r = id ? state.invitations.find((x) => x.id === id) : null;
  $('#edit-title').textContent = id ? 'Tester bewerken' : 'Tester toevoegen';
  for (const f of ['first_name', 'last_name', 'company_name', 'domain', 'email', 'mobile', 'notes']) {
    $(`#ef-${f}`).value = r ? (r[f] || '') : '';
  }
  // Provenance is read-only here (brief §15) — shown for existing testers only.
  const provRow = $('#edit-provenance-row');
  if (r) {
    $('#ef-source').textContent = SOURCE_LABEL[r.source] || r.source || 'Onbekend';
    provRow.classList.remove('hidden');
  } else {
    provRow.classList.add('hidden');
  }
  // Consent (independent dimension) — editable for both new and existing testers.
  $('#ef-consent').value = r ? (r.consent_status || 'UNKNOWN') : 'UNKNOWN';
  // Consent provenance (brief §5/§15): show where an explicit choice came from.
  const prov = $('#ef-consent-prov');
  if (r && r.consent_source) {
    const src = SOURCE_LABEL[r.consent_source] || r.consent_source;
    // Method label (new machine value) or the legacy free-text note, whichever is present.
    const wijze = r.consent_method
      ? (METHOD_LABEL[r.consent_method] || r.consent_method) + (r.consent_method === 'OTHER' && r.consent_note ? ` — ${r.consent_note}` : '')
      : (r.consent_note || '');
    prov.textContent = `Toestemming via ${src}${wijze ? ' · ' + wijze : ''}${r.consent_at ? ' · ' + fmtTs(r.consent_at) : ''}` +
      (r.consent_version ? ` · versie ${r.consent_version}` : '');
    prov.classList.remove('hidden');
  } else {
    prov.classList.add('hidden');
  }
  state.editConsentOriginal = r ? (r.consent_status || 'UNKNOWN') : 'UNKNOWN';
  // Manual-consent method (required when hand-recording OPTED_IN). Reset + toggle.
  $('#ef-consent-method').value = '';
  $('#ef-consent-other').value = '';
  $('#ef-consent-other-row').classList.add('hidden');
  toggleConsentNote();
  // "Status corrigeren" — only for existing testers, as an explicit exception.
  const statusRow = $('#edit-status-row');
  if (r) {
    $('#ef-status').innerHTML = state.cfg.statuses.map((s) => `<option value="${s}">${s}</option>`).join('');
    $('#ef-status').value = r.status;
    state.editStatusOriginal = r.status;
    statusRow.classList.remove('hidden');
  } else {
    state.editStatusOriginal = null;
    statusRow.classList.add('hidden');
  }
  $('#edit-error').classList.add('hidden');
  $('#edit-modal').classList.remove('hidden');
}

// Show the "how was consent obtained?" note only when hand-recording a NEW
// OPTED_IN (fail-closed provenance requirement). Not shown when it's already
// OPTED_IN (no change) or for UNKNOWN/OPTED_OUT.
function toggleConsentNote() {
  const val = $('#ef-consent').value;
  const need = val === 'OPTED_IN' && state.editConsentOriginal !== 'OPTED_IN';
  $('#ef-consent-note-row').classList.toggle('hidden', !need);
  if (!need) {
    // Row hidden (Onbekend / Geen toestemming / al OPTED_IN) → reset, geen dropdown tonen.
    $('#ef-consent-method').value = '';
    $('#ef-consent-other').value = '';
    $('#ef-consent-other-row').classList.add('hidden');
  } else {
    toggleConsentOther();
  }
}
// "Anders" (OTHER) → toon een klein verplicht toelichtingsveld.
function toggleConsentOther() {
  $('#ef-consent-other-row').classList.toggle('hidden', $('#ef-consent-method').value !== 'OTHER');
}

async function saveEdit() {
  const payload = {};
  for (const f of ['first_name', 'last_name', 'company_name', 'domain', 'email', 'mobile', 'notes']) {
    payload[f] = $(`#ef-${f}`).value.trim();
  }
  const err = $('#edit-error');
  err.classList.add('hidden');
  try {
    let targetId = state.editingId;
    if (state.editingId) {
      await api(`/api/invitations/${state.editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      // Administrative status correction (explicit exception, not the normal flow).
      const newStatus = $('#ef-status').value;
      if (newStatus && newStatus !== state.editStatusOriginal) {
        if (confirm(`Status administratief corrigeren van ${state.editStatusOriginal} naar ${newStatus}?\n\n` +
          `Normale statussen worden automatisch door systeemgebeurtenissen bepaald.`)) {
          await api(`/api/invitations/${state.editingId}/status`, { method: 'POST', body: JSON.stringify({ status: newStatus }) });
        }
      }
    } else {
      const created = await api('/api/invitations', { method: 'POST', body: JSON.stringify(payload) });
      targetId = created.invitation.id;
    }
    // Consent change (independent dimension). Hand-recording OPTED_IN requires a
    // provenance note (fail-closed §1); OPTED_OUT is an explicit withdrawal.
    const newConsent = $('#ef-consent').value;
    if (targetId && newConsent && newConsent !== state.editConsentOriginal) {
      const body = { consent_status: newConsent, consent_source: 'manual' };
      let go = true;
      if (newConsent === 'OPTED_IN') {
        const methodEl = $('#ef-consent-method');
        const method = methodEl ? methodEl.value : '';
        if (!method) {
          throw new Error('Kies hoe de toestemming is verkregen (mondeling/telefonisch/e-mail/WhatsApp/schriftelijk/anders).');
        }
        body.consent_method = method;
        if (method === 'OTHER') {
          const other = $('#ef-consent-other').value.trim();
          if (!other) throw new Error('Kies "Anders": geef een korte toelichting op de toestemmingswijze.');
          body.consent_note = other;
        }
      }
      if (newConsent === 'OPTED_OUT') {
        go = confirm('Toestemming intrekken: deze tester wordt geblokkeerd voor uitnodigingen en publicatie naar Maculis. Registreren?');
      }
      if (go) await api(`/api/invitations/${targetId}/consent`, { method: 'POST', body: JSON.stringify(body) });
    }
    closeModal('#edit-modal');
    await refresh();
    toast('Opgeslagen');
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.remove('hidden');
  }
}

// ---- template ------------------------------------------------------------
function openTemplate() {
  $('#tpl-whatsapp').value = state.template.whatsapp;
  $('#tpl-email-subject').value = state.template.emailSubject;
  $('#tpl-email-body').value = state.template.emailBody;
  $('#template-modal').classList.remove('hidden');
}
async function saveTemplate() {
  const patch = {
    whatsapp: $('#tpl-whatsapp').value,
    emailSubject: $('#tpl-email-subject').value,
    emailBody: $('#tpl-email-body').value,
  };
  const res = await api('/api/template', { method: 'PUT', body: JSON.stringify(patch) });
  state.template = res.template;
  closeModal('#template-modal');
  toast('Template opgeslagen');
}

// ---- Evaluaties / Inzichten (Maculis is source of truth) -----------------
function switchView(view) {
  state.view = view;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  const onEval = view === 'evaluaties';
  $('.controls').classList.toggle('hidden', onEval);
  $('.table-wrap').classList.toggle('hidden', onEval);
  $('.statusbar').classList.toggle('hidden', onEval);
  $('#view-evaluaties').classList.toggle('hidden', !onEval);
  // The cockpit belongs to Testerbeheer; hide it on the Evaluaties view.
  $('#attention-cockpit').classList.toggle('hidden', onEval || !state.attention || !state.attention.summary);
  if (onEval) loadEvaluations();
  else loadAttention(); // refresh attention when returning to Testerbeheer
}

async function loadEvaluations() {
  try {
    state.evalData = await api('/api/evaluations');
    $('#eval-sync').textContent = 'Laatste ophaling ' + new Date().toLocaleTimeString('nl-NL');
    renderEvaluations();
  } catch (e) {
    const n = $('#eval-notice');
    n.textContent = 'Kon evaluaties niet laden: ' + e.message;
    n.classList.remove('hidden');
  }
}

function fmtTs(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

function renderEvaluations() {
  const data = state.evalData;
  if (!data) return;
  const rows = data.evaluations || [];
  const questions = data.questions || [];

  const notice = $('#eval-notice');
  if (!data.ok) {
    const map = {
      not_configured: 'Maculis-export is niet geconfigureerd (MACULIS_EXPORT_KEY ontbreekt).',
      forbidden: 'Maculis weigerde de export-sleutel.',
      network: 'Maculis is niet bereikbaar.',
    };
    notice.textContent = 'Let op: ' + (map[data.reason] || ('Maculis-resultaten niet beschikbaar (' + data.reason + ').')) +
      ' Evaluatiestatussen tonen dan alleen "niet gestart".';
    notice.classList.remove('hidden');
  } else notice.classList.add('hidden');

  // Campaign-wide funnel counts (factual status data only).
  const total = rows.length;
  const invited = rows.filter((r) => ['SENT', 'OPENED', 'COMPLETED'].includes(r.lifecycle)).length;
  const started = rows.filter((r) => r.started).length;
  const evalStarted = rows.filter((r) => r.eval_status !== 'NOT_STARTED').length;
  const evalComplete = rows.filter((r) => r.eval_status === 'COMPLETED').length;
  const pct = total ? Math.round((evalComplete / total) * 100) : 0;
  $('#eval-campaign').textContent = rows[0] ? rows[0].campaign : (state.cfg.campaign || 'Evaluaties');

  // Empty state (brief §9): keep it human, not an empty dashboard.
  if (total === 0) {
    $('#eval-summary').innerHTML = '';
    $('#eval-funnel').innerHTML = `<div class="eval-empty"><p><strong>Nog geen testers in deze campagne</strong></p>
      <p class="muted">Voeg testers toe in Testerbeheer; hun voortgang en antwoorden verschijnen hier zodra Maculis-sessies binnenkomen.</p></div>`;
    $('#eval-distributions').innerHTML = '';
    $('#eval-open').innerHTML = '';
    $('#eval-testers').innerHTML = '';
    return;
  }

  // KPI cards — value + subtle progress where a ratio is meaningful.
  const card = (label, value, num, den) => {
    const p = den ? Math.round((num / den) * 100) : 0;
    const bar = den == null ? '' :
      `<div class="kpi-bar" role="img" aria-label="${num} van ${den} (${p}%)"><span style="width:${p}%"></span></div>
       <div class="kpi-sub">${num}/${den} · ${p}%</div>`;
    return `<div class="eval-card"><div class="eval-card-num">${value}</div><div class="eval-card-lbl">${label}</div>${bar}</div>`;
  };
  $('#eval-summary').innerHTML =
    card('Testers', total) +
    card('Uitgenodigd', invited, invited, total) +
    card('Gestart', started, started, total) +
    card('Evaluatie gestart', evalStarted, evalStarted, total) +
    card('Evaluatie compleet', evalComplete, evalComplete, total) +
    card('Compleet', pct + '%', evalComplete, total);

  // Testerreis funnel — where do testers drop off? (counts + share of total)
  const stages = [
    ['Uitgenodigd', invited], ['Gestart', started],
    ['Evaluatie gestart', evalStarted], ['Evaluatie compleet', evalComplete],
  ];
  $('#eval-funnel').innerHTML = `<h2 class="eval-sub">Testerreis</h2>
    <div class="funnel">` + stages.map(([label, n], i) => {
      const p = total ? Math.round((n / total) * 100) : 0;
      const drop = i > 0 ? stages[i - 1][1] - n : 0;
      return `<div class="funnel-stage">
        <div class="funnel-count">${n}</div>
        <div class="funnel-bar" role="img" aria-label="${label}: ${n} van ${total} (${p}%)"><span style="width:${p}%"></span></div>
        <div class="funnel-label">${esc(label)}</div>
        ${drop > 0 ? `<div class="funnel-drop" title="Afhakers t.o.v. vorige fase">−${drop}</div>` : '<div class="funnel-drop"></div>'}
      </div>${i < stages.length - 1 ? '<div class="funnel-arrow" aria-hidden="true">›</div>' : ''}`;
    }).join('') + `</div>`;

  // Per-question distributions — label + bar + count + percentage (never colour-only).
  $('#eval-distributions').innerHTML = `<h2 class="eval-sub">Gezamenlijke antwoorden</h2>` + questions.map((q) => {
    const opts = Object.entries(q.options || {});
    const counts = opts.map(([val, label]) => ({ label, n: rows.filter((r) => r.answers[q.id] === val).length }));
    const answered = counts.reduce((a, c) => a + c.n, 0);
    const bars = counts.map((c) => {
      const p = answered ? Math.round((c.n / answered) * 100) : 0;
      return `<div class="dist-row">
        <span class="dist-lbl">${esc(c.label)}</span>
        <span class="dist-bar" role="img" aria-label="${esc(c.label)}: ${c.n}${answered ? ' (' + p + '%)' : ''}"><span style="width:${p}%"></span></span>
        <span class="dist-n">${c.n} · ${answered ? p + '%' : '—'}</span></div>`;
    }).join('');
    const sub = answered ? `${answered} van ${total} beantwoord` : 'nog niet beantwoord';
    return `<div class="dist-block"><h3>${esc(q.text)}</h3><div class="dist-sub muted small">${sub}</div>${bars}</div>`;
  }).join('');

  // Open insights — qualitative, quiet card list (no charts, no invented text).
  const openBlocks = questions.filter((q) => q.context).map((q) => {
    const cid = q.context.id;
    const items = rows.filter((r) => r.contexts && r.contexts[cid]).map((r) =>
      `<div class="open-item"><div class="open-quote">${esc(r.contexts[cid])}</div>` +
      `<div class="open-who">${esc(r.name)}${r.company_name ? ' · ' + esc(r.company_name) : ''}</div></div>`).join('');
    return items ? `<div class="open-block"><h3>${esc(q.context.text)}</h3>${items}</div>` : '';
  }).filter(Boolean).join('');
  $('#eval-open').innerHTML = openBlocks ? `<h2 class="eval-sub">Open inzichten</h2>${openBlocks}` : '';

  // Per-tester list with a factual 4-step progress indicator + consent when set.
  const f = state.evalFilter;
  const list = f ? rows.filter((r) => r.eval_status === f) : rows;
  $('#eval-testers').innerHTML = `<h2 class="eval-sub">Per tester</h2>` + (list.length
    ? list.map((r) => {
        const inv = state.invitations.find((x) => x.id === r.id);
        const consent = inv ? inv.consent_status : 'UNKNOWN';
        const consentTag = (consent === 'OPTED_IN' || consent === 'OPTED_OUT')
          ? `<span class="status-badge consent-${consent} et-consent">${CONSENT_LABEL[consent]}</span>` : '';
        // Steps reached, using ONLY real status (never mark a step done that isn't).
        const steps = [
          ['Uitgenodigd', ['SENT', 'OPENED', 'COMPLETED'].includes(r.lifecycle)],
          ['Gestart', r.started],
          ['Evaluatie', r.eval_status !== 'NOT_STARTED'],
          ['Compleet', r.eval_status === 'COMPLETED'],
        ];
        const prog = `<div class="et-steps" role="img" aria-label="Voortgang: ${steps.filter((s) => s[1]).map((s) => s[0]).join(', ') || 'nog geen'}">` +
          steps.map(([lbl, on]) => `<span class="et-step ${on ? 'on' : ''}" title="${esc(lbl)}${on ? '' : ' — nog niet'}"></span>`).join('') + `</div>`;
        return `<div class="eval-tester">
          <div class="eval-tester-main">
            <span class="et-name">${esc(r.name)}</span>
            ${r.company_name ? `<span class="muted small">${esc(r.company_name)}</span>` : ''}
            ${prog}
          </div>
          ${consentTag}
          <span class="status-badge eval-${r.eval_status}">${r.eval_status.replace('_', ' ')}</span>
          <button class="btn btn-ghost" data-eval="${r.id}">Evaluatie bekijken</button>
        </div>`;
      }).join('')
    : `<p class="muted">Geen testers in deze filter.</p>`);
  $$('#eval-testers [data-eval]').forEach((b) => b.addEventListener('click', () => openEvalDetail(b.dataset.eval)));
}

function openEvalDetail(id) {
  const r = (state.evalData.evaluations || []).find((x) => x.id === id);
  if (!r) return;
  const questions = state.evalData.questions || [];
  $('#eval-detail-name').textContent = r.name + (r.company_name ? ' · ' + r.company_name : '');
  let html = `<p class="muted small">Campagne ${esc(r.campaign)} · Lifecycle ${esc(r.lifecycle)} · Evaluatie ${esc(r.eval_status.replace('_', ' '))}</p>`;
  if (r.eval_status === 'NOT_STARTED' && !r.started) {
    html += `<p class="muted">${r.started ? 'Evaluatie in uitvoering.' : 'Nog geen evaluatieresultaten.'}</p>`;
  }
  html += questions.map((q) => {
    const val = r.answers[q.id];
    const label = val ? (q.options[val] || val) : '—';
    let block = `<div class="qa"><div class="qa-q">${esc(q.text)}</div><div class="qa-a ${val ? '' : 'muted'}">${esc(label)}</div>`;
    if (q.context && r.contexts[q.context.id]) {
      block += `<div class="qa-ctx"><div class="muted small">${esc(q.context.text)}</div><div>${esc(r.contexts[q.context.id])}</div></div>`;
    }
    return block + `</div>`;
  }).join('');
  const ts = [];
  if (r.started_at) ts.push('Gestart: ' + fmtTs(r.started_at));
  if (r.completed_at) ts.push('Afgerond: ' + fmtTs(r.completed_at));
  if (ts.length) html += `<p class="muted small">${esc(ts.join(' · '))}</p>`;
  $('#eval-detail-body').innerHTML = html;
  $('#eval-detail-modal').classList.remove('hidden');
}

// ---- Testerdossier / historie --------------------------------------------
async function openHistory(id) {
  let h;
  try { h = await api(`/api/invitations/${id}/history`); }
  catch (e) { toast(e.message || 'Kon historie niet laden'); return; }

  const r = state.invitations.find((x) => x.id === id);
  const name = r ? ([r.first_name, r.last_name].filter(Boolean).join(' ') || r.company_name || '—') : '—';
  $('#history-name').textContent = 'Historie · ' + name;

  // Chronological (append order can differ from real time for Maculis milestones).
  const entries = (h.history || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const lastInvite = [...entries].reverse().find((e) => e.event === 'invitation_sent');
  const lastActivity = entries.length ? entries[entries.length - 1] : null;

  // Pass the Lens provenance: who introduced this candidate, when, and from which journey.
  // Most recent first; a repeat introduction stays visible (brief §8).
  const intros = Array.isArray(h.introductions) ? h.introductions.slice().reverse() : [];
  const introRows = intros.map((i) => {
    const who = i.by_name ? esc(i.by_name) + (i.by_company ? ' (' + esc(i.by_company) + ')' : '') : 'Onbekende verwijzer';
    return `Aangedragen door ${who} · ${esc(fmtTs(i.at))}`;
  });

  $('#history-summary').innerHTML = [
    ['Bron', SOURCE_LABEL[h.source] || h.source],
    ...(introRows.length ? [['Aangedragen door', introRows.join(' · daarnaast: ')]] : []),
    ['Aangemaakt', fmtTs(h.created_at)],
    ['Laatste uitnodiging', lastInvite
      ? fmtTs(lastInvite.at) + (lastInvite.channel ? ' · ' + (CHANNEL_LABEL[lastInvite.channel] || lastInvite.channel) : '')
      : '—'],
    ['Laatste activiteit', lastActivity ? fmtTs(lastActivity.at) : '—'],
    ['Lifecycle', h.lifecycle],
    ['Toestemming', CONSENT_LABEL[h.consent_status] || h.consent_status],
  ].map(([k, v]) => `<div class="hs-row"><span class="hs-k">${esc(k)}</span><span class="hs-v">${esc(v || '—')}</span></div>`).join('');

  $('#history-timeline').innerHTML = entries.length
    ? entries.map((e) => {
        const meta = [];
        if (e.channel) meta.push(CHANNEL_LABEL[e.channel] || e.channel);
        if (e.result) meta.push(RESULT_LABEL[e.result] || e.result);
        if (e.source) meta.push(SOURCE_LABEL[e.source] || e.source);
        return `<div class="tl-item tl-${esc(e.result || 'info')}">
          <div class="tl-time">${esc(fmtTs(e.at))}</div>
          <div class="tl-body">
            <div class="tl-event">${esc(EVENT_LABEL[e.event] || e.event)}</div>
            ${meta.length ? `<div class="tl-meta muted small">${esc(meta.join(' · '))}</div>` : ''}
          </div>
        </div>`;
      }).join('')
    : `<p class="muted">Nog geen gebeurtenissen.</p>`;

  $('#history-modal').classList.remove('hidden');
}

// ---- misc ui -------------------------------------------------------------
function closeModal(sel) { $(sel).classList.add('hidden'); }

function wireEvents() {
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; render(); });
  $('#status-filter').addEventListener('change', (e) => { state.statusFilter = e.target.value; render(); });

  $('#check-all').addEventListener('change', (e) => {
    const vis = visibleRows();
    if (e.target.checked) vis.forEach((r) => state.selection.add(r.id));
    else vis.forEach((r) => state.selection.delete(r.id));
    render();
  });

  $('#btn-wa-next').addEventListener('click', () => {
    // Sequence through selected testers in the current visible order.
    const ordered = visibleRows().filter((r) => state.selection.has(r.id)).map((r) => r.id);
    startWhatsAppSequence(ordered);
  });

  $$('.tab[data-view]').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));

  // Attention Cockpit — one delegated handler (CSP-safe, no inline onclick). Any element carrying a
  // non-empty data-attn-conv deep-links into the exact conversation in the Inbox; the read watermark
  // is set server-side when that conversation is opened.
  $('#attention-cockpit').addEventListener('click', (e) => {
    const el = e.target.closest('[data-attn-conv]');
    if (el && el.dataset.attnConv) window.location.href = '/comm.html#conv=' + encodeURIComponent(el.dataset.attnConv);
  });
  // A row dot is also a one-click (or keyboard) route to its conversation.
  const openDot = (dot) => { window.location.href = '/comm.html#conv=' + encodeURIComponent(dot.dataset.attnConv); };
  $('#tester-rows').addEventListener('click', (e) => {
    const dot = e.target.closest('.row-attn[data-attn-conv]');
    if (dot && dot.dataset.attnConv) { e.stopPropagation(); openDot(dot); }
  });
  $('#tester-rows').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const dot = e.target.closest('.row-attn[data-attn-conv]');
    if (dot && dot.dataset.attnConv) { e.preventDefault(); openDot(dot); }
  });
  $('#btn-eval-refresh').addEventListener('click', loadEvaluations);
  $('#eval-filter').addEventListener('change', (e) => { state.evalFilter = e.target.value; renderEvaluations(); });

  $('#btn-publish').addEventListener('click', publishSelected);

  $('#btn-email-invite').addEventListener('click', startEmailInvite);
  $('#btn-email-send').addEventListener('click', sendEmailInvites);

  $('#btn-import').addEventListener('click', () => { resetImport(); $('#import-modal').classList.remove('hidden'); });
  $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) onImportFile(e.target.files[0]); });
  $('#btn-commit-import').addEventListener('click', commitImport);

  $('#btn-template').addEventListener('click', openTemplate);
  $('#btn-save-template').addEventListener('click', saveTemplate);

  $('#btn-add').addEventListener('click', () => openEdit(null));
  $('#btn-empty-add').addEventListener('click', () => openEdit(null));
  $('#btn-save-edit').addEventListener('click', saveEdit);
  $('#ef-consent').addEventListener('change', toggleConsentNote);
  $('#ef-consent-method').addEventListener('change', toggleConsentOther);

  $('#btn-wa-open').addEventListener('click', openWaCurrent);
  $('#btn-wa-sent').addEventListener('click', confirmWaSent);
  $('#btn-wa-skip').addEventListener('click', advanceWa);

  $('#btn-logout').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' });
    location.reload();
  });

  // generic modal close (backdrop + [data-close])
  $$('.modal').forEach((m) => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.hasAttribute('data-close')) m.classList.add('hidden');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal').forEach((m) => m.classList.add('hidden'));
  });
}

boot().catch((e) => {
  document.body.innerHTML = `<pre style="padding:20px;color:#dc2626">Kon de app niet laden: ${esc(e.message)}</pre>`;
});
