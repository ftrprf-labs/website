// Mijn Maculis — customer environment front end.
//
// CSP-safe: no inline handlers, no external resources. The access token is read once from the URL
// (?t=), kept in memory, and removed from the address bar so it is not left in history/bookmarks.
// Every API call carries it in the x-mijn-token header.

(() => {
  'use strict';

  // ---- token bootstrap ----
  const url = new URL(location.href);
  let token = url.searchParams.get('t') || sessionStorage.getItem('mijn_token') || '';
  if (url.searchParams.get('t')) {
    sessionStorage.setItem('mijn_token', token);
    url.searchParams.delete('t');
    history.replaceState(null, '', url.pathname + (url.hash || ''));
  }

  const $ = (id) => document.getElementById(id);
  const gate = $('gate'), gateMsg = $('gate-msg'), app = $('app'), view = $('view');

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: { 'x-mijn-token': token, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data };
  }

  // ---- small helpers ----
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  function fmtDate(iso, withWeekday) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const opt = withWeekday
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' };
      return cap(d.toLocaleDateString('nl-NL', opt));
    } catch { return ''; }
  }

  const STANCE = {
    reveal: 'Dit valt op',
    tension: 'Hier zit spanning',
    consistency: 'Hier zien we consistentie',
    non_reveal: 'Hier zien we géén verschil',
    unknown: 'Dit weten we nog niet',
  };
  const stanceLabel = (s) => STANCE[s] || 'Dit zien we';
  const tintClass = (ins) => ins.sharing === 'SHARED' ? 'tint-blue'
    : (ins.stance === 'consistency' || ins.stance === 'non_reveal') ? 'tint-green' : '';

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.5" cy="9" r="3"/><circle cx="16" cy="10" r="2.4"/><path d="M3.5 19c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6"/><path d="M14.5 18.6c.2-2 1.6-3.3 3.6-3.3 1.9 0 3.4 1.3 3.4 3.6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3.5 19 6v5.5c0 4.3-3 7.4-7 9-4-1.6-7-4.7-7-9V6z"/><path d="M9.2 12.2 11.2 14l3.6-3.7"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z" fill="currentColor" stroke="none"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.3 2.3 4.7-4.9"/></svg>',
    research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="6.2"/><path d="m20 20-4.2-4.2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6"/><path d="M4.5 17h15"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 6 6 6-6 6"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 8 2.5-1.8 5 4v6l-2 .6"/><path d="M12 8 8 6 3 9.2v5.3l3 1.4"/><path d="m6.5 14 3 2.6c.8.7 1.8.6 2.4-.1l.3-.3 1.7 1.4c.8.6 1.7.5 2.3-.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></svg>',
  };

  function shareTag(sharing) {
    if (sharing === 'SHARED') return `<span class="share-tag shared">${ICON.people}Gedeeld</span>`;
    if (sharing === 'AGGREGATED') return `<span class="share-tag">${ICON.people}Patroon</span>`;
    return `<span class="share-tag">${ICON.lock}Alleen voor jou</span>`;
  }

  const ORBIT = `<svg class="orbit" viewBox="0 0 320 320" aria-hidden="true">
    <g fill="none" stroke="#6b5bd6" stroke-opacity="0.16">
      <circle cx="160" cy="160" r="42"/><circle cx="160" cy="160" r="78"/><circle cx="160" cy="160" r="116"/><circle cx="160" cy="160" r="150"/>
    </g>
    <circle cx="160" cy="160" r="15" fill="#6b5bd6" fill-opacity="0.9"/>
    <circle cx="238" cy="160" r="4" fill="#6b5bd6" fill-opacity="0.55"/>
    <circle cx="120" cy="82" r="3.5" fill="#6b5bd6" fill-opacity="0.4"/>
    <circle cx="196" cy="262" r="3.5" fill="#6b5bd6" fill-opacity="0.4"/>
    <circle cx="58" cy="196" r="3" fill="#c8894a" fill-opacity="0.5"/>
  </svg>`;

  // ---- navigation / router ----
  const PAGES = {
    overzicht: { title: 'Waar vraagt onze organisatie om aandacht?', sub: 'Dit is wat we op dit moment zien, begrijpen en samen doen.' },
    inzichten: { title: 'De Spiegel', sub: 'Wat we over jullie organisatie zien. Nieuw, bevestigd, en soms nog onzeker.' },
    samenwerking: { title: 'Samenwerking', sub: 'Waar we samen aan werken en wat we hebben afgesproken.' },
    inzicht: { title: 'Inzicht', sub: '' },
  };

  function setActiveNav(route) {
    document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
  }
  function setHeader(page) {
    $('page-title').textContent = PAGES[page].title;
    $('page-sub').textContent = PAGES[page].sub;
  }
  const go = (hash) => { location.hash = hash; };

  async function router() {
    const hash = location.hash.replace(/^#\//, '') || 'overzicht';
    const [route, arg] = hash.split('/');
    if (route === 'inzichten') { setActiveNav('inzichten'); setHeader('inzichten'); return renderInsights(); }
    if (route === 'samenwerking') { setActiveNav('samenwerking'); setHeader('samenwerking'); return renderCollaboration(); }
    if (route === 'inzicht' && arg) { setActiveNav('inzichten'); setHeader('inzicht'); return renderDetail(arg); }
    setActiveNav('overzicht'); setHeader('overzicht'); return renderOverview();
  }

  // ---- views ----
  function skeleton() { view.innerHTML = '<div class="skel">Eén moment…</div>'; }

  async function renderOverview() {
    skeleton();
    const { data } = await api('/api/mijn/overview');
    const a = data.attention;
    const c = data.collaboration || {};

    const hero = a ? `
      <section class="hero">
        ${ORBIT}
        <div class="hero-inner">
          <div class="hero-ico">${ICON.compass}</div>
          ${a.attention ? '<span class="badge badge-new">Nieuw inzicht</span>' : ''}
          <h2>${esc(a.title)}</h2>
          <p>${esc(a.basis || a.observation || '')}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-nav="inzicht/${esc(a.id)}">Bekijk inzicht</button>
            <button class="btn btn-ghost" data-nav="inzichten">Meer inzichten ${ICON.arrow}</button>
          </div>
        </div>
      </section>` : `<section class="hero"><div class="hero-inner"><h2>Nog geen inzichten</h2><p>Zodra Maculis iets over jullie organisatie ziet, verschijnt het hier.</p></div></section>`;

    const recent = (data.recent || []).map((i) => insightCard(i)).join('');
    const recentPanel = `
      <section class="panel">
        <p class="section-label">Recente inzichten</p>
        <div class="insight-grid">${recent || '<p class="empty">Nog geen inzichten.</p>'}</div>
        ${data.insightCount > 1 ? '<button class="btn btn-block" data-nav="inzichten">Naar alle inzichten</button>' : ''}
      </section>`;

    const glance = `
      <section class="panel">
        <p class="section-label">Samenwerking in één oogopslag</p>
        <div class="glance">
          ${c.upcomingAppointment ? glanceRow('ok', ICON.check, 'Eerstvolgende afspraak', `${esc(fmtDate(c.upcomingAppointment.due_at, true))}${c.upcomingAppointment.detail ? '. ' + esc(c.upcomingAppointment.detail) : ''}`, 'samenwerking') : ''}
          ${c.research ? glanceRow('', ICON.research, esc(c.research.title), esc(c.research.detail || 'Lopend onderzoek'), 'samenwerking') : ''}
          ${glanceRow('', ICON.bell, 'Gedeeld met Maculis', `${c.sharedCount || 0} ${(c.sharedCount === 1) ? 'inzicht' : 'inzichten'}${c.lastSharedAt ? '. Laatste gedeeld op ' + esc(fmtDate(c.lastSharedAt)) : ''}`, 'inzichten')}
        </div>
      </section>`;

    const step = c.nextStep;
    const laatste = `
      <section class="panel laatste">
        <div class="laatste-ico">${ICON.handshake}</div>
        <p>${esc(step ? (step.detail || step.title) : 'Zodra we samen een volgende stap afspreken, zie je die hier.')}</p>
        <button class="btn btn-amber" data-nav="samenwerking">Bekijk alle afspraken</button>
      </section>`;

    view.innerHTML = `
      <div class="ov-grid">
        <div class="ov-col">${hero}${recentPanel}</div>
        <div class="ov-col">${glance}${laatste}</div>
      </div>
      ${privacyRow()}`;
    wireNav();
  }

  function glanceRow(icoMod, ico, title, meta, nav) {
    return `<button class="glance-row" data-nav="${esc(nav)}">
      <span class="glance-ico ${icoMod}">${ico}</span>
      <span class="glance-text"><span class="glance-title">${title}</span><span class="glance-meta">${meta}</span></span>
      <span class="glance-chev">${ICON.chev}</span>
    </button>`;
  }

  function insightCard(i) {
    // Subtle left marker: a "Nieuw" badge for a fresh attention insight, else a quiet "Bijgewerkt"
    // when the insight has developed since its previous reading. Never a count or an attention badge.
    const leftMark = (i.attention && i.status === 'new')
      ? '<span class="badge badge-new">Nieuw</span>'
      : (i.developed ? '<span class="chip-updated">Bijgewerkt</span>' : '<span></span>');
    return `<button class="icard ${tintClass(i)}" data-nav="inzicht/${esc(i.id)}">
      <div class="icard-top">
        ${leftMark}
        ${shareTag(i.sharing)}
      </div>
      <h3>${esc(i.title)}</h3>
      <p>${esc(i.observation || '')}</p>
      <span class="btn-link">Bekijk inzicht ${ICON.arrow}</span>
    </button>`;
  }

  function privacyRow() {
    return `<section class="panel privacy">
      <p class="section-label">Jouw informatie, jouw keuze</p>
      <div class="privacy-grid">
        <div class="priv"><span class="priv-ico lock">${ICON.lock}</span><div><h4>Wat blijft privé?</h4><p>Inzichten die alleen voor jou zichtbaar zijn. Deze gebruikt Maculis niet zonder jouw expliciete toestemming.</p></div></div>
        <div class="priv"><span class="priv-ico share">${ICON.people}</span><div><h4>Wat kun je delen?</h4><p>Jij bepaalt wat je met Maculis wilt bespreken. Alleen gedeelde inzichten worden onderdeel van onze samenwerking.</p></div></div>
        <div class="priv"><span class="priv-ico trust">${ICON.shield}</span><div><h4>Jouw vertrouwen, onze basis</h4><p>Privacy en vertrouwelijkheid staan centraal. Zo gaan we zorgvuldig met jouw informatie om.</p></div></div>
      </div>
    </section>`;
  }

  async function renderInsights() {
    skeleton();
    const { data } = await api('/api/mijn/insights');
    const items = data.insights || [];
    if (!items.length) { view.innerHTML = '<p class="empty">Er zijn nog geen inzichten om te tonen.</p>'; return; }
    view.innerHTML = `<div class="spiegel-grid">${items.map(insightCard).join('')}</div>`;
    wireNav();
  }

  async function renderDetail(id) {
    skeleton();
    const { status, data } = await api('/api/mijn/insights/' + encodeURIComponent(id));
    if (status !== 200 || !data.insight) { view.innerHTML = `<p class="empty">Dit inzicht is niet gevonden.</p><button class="btn btn-ghost" data-nav="inzichten">Terug naar De Spiegel</button>`; wireNav(); return; }
    view.innerHTML = detailMarkup(data.insight, data.development || []);
    wireNav();
    wireDetail(data.insight);
  }

  // The human development timeline: a calm, DEFAULT-COLLAPSED section (native <details>, no JS, fully
  // accessible). Only shown once an insight has actually developed (more than one reading). No version
  // ids, confidence or provenance — only what we saw earlier, what changed, and the current reading.
  function developmentSection(development) {
    if (!development || development.length < 2) return '';
    const rows = development.map((e) => `
      <li class="dev-entry ${e.current ? 'current' : ''}">
        <span class="dev-when">${esc(fmtDate(e.at, false))}${e.current ? ' · nu' : ''}</span>
        <span class="dev-body">
          <span class="dev-stance">${esc(e.stanceLabel)}</span>
          <span class="dev-note">${esc(e.note || e.headline || '')}</span>
        </span>
      </li>`).join('');
    return `<details class="dev">
      <summary><span class="dev-summary-title">Hoe dit inzicht zich ontwikkelde</span><span class="dev-summary-hint">${development.length} momenten</span></summary>
      <ol class="dev-list">${rows}</ol>
    </details>`;
  }

  function sharePanel(i) {
    const shared = i.sharing === 'SHARED';
    const unshared = shared && i.unshared_development;
    if (unshared) {
      // An older reading is shared; a newer reading is private. Calm, unambiguous, no dark pattern.
      return `<div class="share-panel">
        <div class="share-status">
          <span class="priv-ico share">${ICON.people}</span>
          <span class="share-status-text">
            <span class="share-status-title">Gedeeld met Maculis</span>
            <span class="share-status-desc">Maculis gebruikt op dit moment de eerder gedeelde lezing.</span>
          </span>
        </div>
        <div class="dev-notice">${ICON.compass}<span>Er is een nieuwe ontwikkeling die je nog niet met Maculis hebt gedeeld.</span></div>
        <p class="share-note">Als je de nieuwe ontwikkeling deelt, werk je de eerder gedeelde lezing bij voor Maculis. Er wordt niets automatisch gedeeld.</p>
        <div class="share-actions">
          <button class="btn btn-violet" id="act-share-update">Deel de nieuwe ontwikkeling</button>
          <button class="btn" id="act-revoke">Delen intrekken</button>
        </div>
      </div>`;
    }
    return `<div class="share-panel">
      <div class="share-status">
        <span class="priv-ico ${shared ? 'share' : 'lock'}">${shared ? ICON.people : ICON.lock}</span>
        <span class="share-status-text">
          <span class="share-status-title">${shared ? 'Gedeeld met Maculis' : 'Alleen voor jou'}</span>
          <span class="share-status-desc">${shared ? 'Maculis mag dit inzicht gebruiken in jullie samenwerking.' : 'Dit inzicht blijft privé tot je het zelf deelt.'}</span>
        </span>
      </div>
      <p class="share-note">${shared
        ? 'Je kunt dit op elk moment weer intrekken. Dan gebruikt Maculis dit inzicht niet langer.'
        : 'Als je dit deelt, kan Maculis dit inzicht gebruiken in jullie samenwerking en relevante gesprekken.'}</p>
      ${shared
        ? '<button class="btn" id="act-revoke">Delen intrekken</button>'
        : '<button class="btn btn-violet" id="act-share">Bespreek met Maculis</button>'}
    </div>`;
  }

  function detailMarkup(i, development) {
    return `<div class="detail">
      <div class="detail-back"><button class="btn-link" data-nav="inzichten">${leftArrow()} De Spiegel</button></div>
      <div class="detail-head">
        <span class="chip stance-${esc(i.stance)}"><span class="dot"></span>${esc(stanceLabel(i.stance))}</span>
        ${shareTag(i.sharing)}
        ${i.developed ? '<span class="chip-updated">Bijgewerkt</span>' : ''}
      </div>
      <h2>${esc(i.title)}</h2>

      <div class="qa"><h3>Wat zien we?</h3><p>${esc(i.observation || '—')}</p></div>
      <div class="qa"><h3>Wat betekent dit mogelijk?</h3><p>${esc(i.meaning || '—')}</p></div>
      <div class="qa"><h3>Waar baseren we dit op?</h3><p>${esc(i.basis || '—')}</p></div>
      <div class="qa unknown"><h3>Wat weten we nog niet?</h3><p>${esc(i.not_yet_known || '—')}</p></div>

      ${developmentSection(development)}
      ${sharePanel(i)}
    </div>`;
  }

  function leftArrow() { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-3px"><path d="M20 12H5"/><path d="m11 6-6 6 6 6"/></svg>'; }

  function wireDetail(insight) {
    const shareBtn = $('act-share'), updateBtn = $('act-share-update'), revokeBtn = $('act-revoke');
    if (shareBtn) shareBtn.addEventListener('click', () => confirmShare(insight, 'share'));
    if (updateBtn) updateBtn.addEventListener('click', () => confirmShare(insight, 'share-update'));
    if (revokeBtn) revokeBtn.addEventListener('click', () => confirmShare(insight, 'revoke'));
  }

  async function renderCollaboration() {
    skeleton();
    const { data } = await api('/api/mijn/collaboration');
    const items = data.items || [];
    if (!items.length) { view.innerHTML = '<p class="empty">Er zijn nog geen gezamenlijke afspraken of stappen.</p>'; return; }
    const KIND = { agreement: 'Afspraak', next_step: 'Volgende stap', research: 'Onderzoek', decision: 'Besluit', shared_note: 'Notitie' };
    const rows = items.map((i) => {
      const meta = [KIND[i.kind] || 'Item', i.due_at ? fmtDate(i.due_at, true) : ''].filter(Boolean).join(' · ');
      const ico = i.kind === 'research' ? ICON.research : i.due_at ? ICON.check : ICON.handshake;
      return `<div class="glance-row" style="cursor:default">
        <span class="glance-ico ${i.due_at ? 'ok' : 'amber'}">${ico}</span>
        <span class="glance-text"><span class="glance-title">${esc(i.title)}</span><span class="glance-meta">${esc(meta)}${i.detail ? '. ' + esc(i.detail) : ''}</span></span>
      </div>`;
    }).join('');
    view.innerHTML = `<section class="panel"><p class="section-label">Wat we samen doen</p><div class="glance">${rows}</div></section>`;
  }

  // ---- share confirmation flow ----
  const confirm = $('confirm'), confirmTitle = $('confirm-title'), confirmBody = $('confirm-body'), confirmOk = $('confirm-ok'), confirmCancel = $('confirm-cancel');
  let pending = null;

  function confirmShare(insight, action) {
    pending = { insight, action };
    if (action === 'share') {
      confirmTitle.textContent = 'Delen met Maculis';
      confirmBody.textContent = 'Als je dit deelt, kan Maculis dit inzicht gebruiken in jullie samenwerking en relevante gesprekken. Je kunt het later weer intrekken.';
      confirmOk.textContent = 'Delen met Maculis';
      confirmOk.className = 'btn btn-violet';
    } else if (action === 'share-update') {
      confirmTitle.textContent = 'Nieuwe ontwikkeling delen';
      confirmBody.textContent = 'Je werkt de eerder gedeelde lezing bij voor Maculis met de huidige ontwikkeling. Vanaf dat moment gebruikt Maculis de nieuwe lezing. Er wordt niets automatisch gedeeld.';
      confirmOk.textContent = 'Nieuwe ontwikkeling delen';
      confirmOk.className = 'btn btn-violet';
    } else {
      confirmTitle.textContent = 'Delen intrekken';
      confirmBody.textContent = 'Maculis gebruikt dit inzicht daarna niet langer in jullie samenwerking. Het blijft wel voor jou zichtbaar.';
      confirmOk.textContent = 'Intrekken';
      confirmOk.className = 'btn btn-primary';
    }
    confirm.classList.remove('hidden');
  }
  function closeConfirm() { confirm.classList.add('hidden'); pending = null; }
  confirmCancel.addEventListener('click', closeConfirm);
  confirm.addEventListener('click', (e) => { if (e.target === confirm) closeConfirm(); });
  confirmOk.addEventListener('click', async () => {
    if (!pending) return;
    const { insight, action } = pending;
    // 'share' and 'share-update' both hit the share endpoint; only 'revoke' hits revoke.
    const endpoint = action === 'revoke' ? 'revoke' : 'share';
    confirmOk.disabled = true;
    const { status, data } = await api(`/api/mijn/insights/${encodeURIComponent(insight.id)}/${endpoint}`, { method: 'POST', body: {} });
    confirmOk.disabled = false;
    closeConfirm();
    if (status === 200) {
      toast(action === 'revoke' ? 'Delen ingetrokken' : action === 'share-update' ? 'Nieuwe ontwikkeling gedeeld' : 'Gedeeld met Maculis');
      view.innerHTML = detailMarkup(data.insight, data.development || []);
      wireNav(); wireDetail(data.insight);
    } else {
      toast('Er ging iets mis. Probeer het opnieuw.');
    }
  });

  let toastTimer = null;
  function toast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = ICON.check + '<span></span>';
    t.querySelector('span').textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2600);
  }

  // Event delegation for all data-nav buttons (CSP-safe: no inline handlers).
  function wireNav() {
    view.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => go('#/' + el.dataset.nav));
    });
  }

  // ---- boot ----
  async function boot() {
    if (!token) { gateMsg.textContent = 'Deze link is niet meer geldig. Vraag Maculis om een nieuwe toegang.'; gateMsg.classList.add('error'); return; }
    const { status, data } = await api('/api/mijn/session');
    if (status !== 200) {
      gateMsg.textContent = status === 401 ? 'Deze toegang is niet (meer) geldig. Vraag Maculis om een nieuwe link.' : 'Mijn Maculis kon niet worden geopend.';
      gateMsg.classList.add('error');
      sessionStorage.removeItem('mijn_token');
      return;
    }
    $('side-org-name').textContent = data.organization || '—';
    const name = (data.user && data.user.label) || 'Klant';
    $('side-user-name').textContent = name;
    $('side-user-role').textContent = (data.user && data.user.role) || '';
    $('side-avatar').textContent = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    gate.classList.add('hidden');
    app.classList.remove('hidden');
    window.addEventListener('hashchange', router);
    if (!location.hash) location.hash = '#/overzicht';
    router();
  }

  boot();
})();
