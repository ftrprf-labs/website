// FTRLABS Invitation Manager — admin SPA (vanilla, no build step).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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
};

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
  return `${state.cfg.maculisHost}/?p=${encodeURIComponent(token)}`;
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
  $$('#tester-rows [data-status]').forEach((sel) => {
    sel.addEventListener('change', () => changeStatus(sel.dataset.status, sel.value));
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
  const statusOpts = state.cfg.statuses
    .map((s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`)
    .join('');
  return `
    <td class="col-check" data-label="">
      <input type="checkbox" data-check="${r.id}" ${checked} />
    </td>
    <td data-label="Naam"><span class="name-main">${esc(name)}</span></td>
    <td data-label="Bedrijf">${esc(r.company_name || '—')}</td>
    <td data-label="Contact">
      <div>${esc(contact[0] || '—')}</div>
      ${contact[1] ? `<div class="contact-line">${esc(contact[1])}</div>` : ''}
    </td>
    <td data-label="Domein">${esc(r.domain || '—')}</td>
    <td data-label="Link">
      <div class="link-cell">
        <code title="${esc(url)}">${esc(url)}</code>
        <button class="copy-btn" data-copy="${r.id}" title="Kopieer link">⧉</button>
      </div>
    </td>
    <td data-label="Status">
      <select class="status-select status-${r.status}" data-status="${r.id}">${statusOpts}</select>
    </td>
    <td class="col-actions" data-label="Acties">
      <div class="row-actions">
        <button class="act-wa" data-wa="${r.id}" title="Via WhatsApp uitnodigen">🟢</button>
        <button data-mail="${r.id}" title="E-mail (mailto)">✉</button>
        <button data-edit="${r.id}" title="Bewerken">✎</button>
        <button data-del="${r.id}" title="Verwijderen">🗑</button>
      </div>
    </td>`;
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

function updateSelectionUi() {
  const n = state.selection.size;
  $('#selection-count').textContent = `${n} geselecteerd`;
  $('#btn-wa-next').disabled = n === 0;
  $('#btn-publish').disabled = n === 0;
  const vis = visibleRows();
  const allChecked = vis.length > 0 && vis.every((r) => state.selection.has(r.id));
  $('#check-all').checked = allChecked;
}

// ---- actions -------------------------------------------------------------
async function changeStatus(id, status) {
  try {
    await api(`/api/invitations/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
    await refresh();
    toast(`Status → ${status}`);
  } catch (e) { toast(e.message); }
}

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
    toast(`${res.published} tester(s) gepubliceerd naar Maculis`);
  } catch (e) {
    toast(e.message || 'Publiceren mislukt');
  } finally {
    btn.textContent = prev;
    updateSelectionUi();
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
  const wa = await api(`/api/invitations/${id}/whatsapp`);
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
}

async function openWaCurrent() {
  const btn = $('#btn-wa-open');
  const url = btn.dataset.url;
  const id = btn.dataset.id;
  // Open WhatsApp (admin still presses send there) ...
  window.open(url, '_blank', 'noopener');
  // ... and mark this tester INVITED (manual trigger, brief §9 + acceptance §20).
  try {
    await api(`/api/invitations/${id}/status`, { method: 'POST', body: JSON.stringify({ status: 'INVITED' }) });
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
  const res = await api('/api/import/commit', { method: 'POST', body: JSON.stringify({ rows }) });
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
  $('#edit-error').classList.add('hidden');
  $('#edit-modal').classList.remove('hidden');
}

async function saveEdit() {
  const payload = {};
  for (const f of ['first_name', 'last_name', 'company_name', 'domain', 'email', 'mobile', 'notes']) {
    payload[f] = $(`#ef-${f}`).value.trim();
  }
  const err = $('#edit-error');
  err.classList.add('hidden');
  try {
    if (state.editingId) {
      await api(`/api/invitations/${state.editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    } else {
      await api('/api/invitations', { method: 'POST', body: JSON.stringify(payload) });
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

  $('#btn-publish').addEventListener('click', publishSelected);

  $('#btn-import').addEventListener('click', () => { resetImport(); $('#import-modal').classList.remove('hidden'); });
  $('#import-file').addEventListener('change', (e) => { if (e.target.files[0]) onImportFile(e.target.files[0]); });
  $('#btn-commit-import').addEventListener('click', commitImport);

  $('#btn-template').addEventListener('click', openTemplate);
  $('#btn-save-template').addEventListener('click', saveTemplate);

  $('#btn-add').addEventListener('click', () => openEdit(null));
  $('#btn-save-edit').addEventListener('click', saveEdit);

  $('#btn-wa-open').addEventListener('click', openWaCurrent);
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
