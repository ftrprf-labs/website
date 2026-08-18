// Mijn Maculis — customer environment front end.
//
// CSP-safe: no inline handlers, no external resources. The access token is read once from the URL
// (?t=), kept in memory, and removed from the address bar so it is not left in history/bookmarks.
// Every API call carries it in the x-mijn-token header.
//
// Visueel volgt dit bestand de canon (UX-VISUAL-DNA v1.0, tokens 1.0.3). Twee dingen die hier
// bewust worden afgedwongen en niet alleen in CSS staan:
//   1. De vijf semantische rollen worden afgeleid uit de houding van het inzicht, nooit uit opmaak.
//   2. Het signaalveld is bewijs, geen versiering: het aantal punten, de verbindingen en de straal
//      van het licht volgen de werkelijke inzichten. Canon 7: als je niet kunt zeggen welk bewijs
//      de gloed draagt, hoort er geen gloed.

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
  let orgName = '';

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

  // Menselijke, Nederlandse statuslabels (canon 10). Geen Engelse hoofdletterbadges.
  const STANCE = {
    reveal: 'Dit valt op',
    tension: 'Hier zit spanning',
    consistency: 'Hier zien we consistentie',
    non_reveal: 'Hier zien we géén verschil',
    unknown: 'Dit weten we nog niet',
  };
  const stanceLabel = (s) => STANCE[s] || 'Dit zien we';

  // De houding van een inzicht vertaalt naar precies één van de vijf semantische rollen uit
  // canon 3.3. Er wordt hier geen nieuwe betekenislaag verzonnen: spanning en waarneming vragen
  // aandacht, consistentie en géén-verschil zijn bevestigd, onbekend blijft kleurloos.
  // De houding is de houding. Dat er een nog niet gedeelde ontwikkeling ligt, is een
  // aparte toestand ("aan het worden") en draagt zijn eigen pil; het overschrijft de
  // houding niet. Canon 10: de drie dimensies overschrijven elkaar nooit.
  function role(ins) {
    if (!ins) return 'uncertain';
    switch (ins.stance) {
      case 'tension': case 'reveal': return 'signal';
      case 'consistency': case 'non_reveal': return 'confirmed';
      default: return 'uncertain';
    }
  }

  const ICON = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.5" cy="9" r="3"/><circle cx="16" cy="10" r="2.4"/><path d="M3.5 19c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6"/><path d="M14.5 18.6c.2-2 1.6-3.3 3.6-3.3 1.9 0 3.4 1.3 3.4 3.6"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3.5 19 6v5.5c0 4.3-3 7.4-7 9-4-1.6-7-4.7-7-9V6z"/><path d="M9.2 12.2 11.2 14l3.6-3.7"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="m15.6 8.4-2 5.2-5.2 2 2-5.2z" fill="currentColor" stroke="none"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.3 2.3 4.7-4.9"/></svg>',
    research: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="6.2"/><path d="m20 20-4.2-4.2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6"/><path d="M4.5 17h15"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m9 6 6 6-6 6"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m12 8 2.5-1.8 5 4v6l-2 .6"/><path d="M12 8 8 6 3 9.2v5.3l3 1.4"/><path d="m6.5 14 3 2.6c.8.7 1.8.6 2.4-.1l.3-.3 1.7 1.4c.8.6 1.7.5 2.3-.2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></svg>',
  };

  // Gedeeld of privé draagt tekst; het oppervlak draagt het onderscheid (canon 6 en 12).
  function shareTag(sharing) {
    if (sharing === 'SHARED') return `<span class="share-tag">${ICON.people}Gedeeld</span>`;
    if (sharing === 'AGGREGATED') return `<span class="share-tag">${ICON.people}Patroon</span>`;
    return `<span class="share-tag">${ICON.lock}Alleen voor jou</span>`;
  }

  // De statuspil: transparant vlak, één semantische hairline, de semantische kleur als tekst
  // (canon 10). Nooit een gevulde badge.
  function stancePill(ins) {
    return `<span class="pill is-${role(ins)}"><span class="dot"></span>${esc(stanceLabel(ins.stance))}</span>`;
  }

  // ============================================================================================
  // HET SIGNAALVELD
  //
  // Trap 1 tot 4 van de signal language (canon 9), in het dagregime. Koper aan de rand, violet
  // in de kern. Elk punt is een werkelijke waarneming van deze organisatie. Een verbinding
  // ontstaat uitsluitend tussen signalen die over hetzelfde gaan, nooit op grond van afstand
  // (canon 8.1). De straal van het licht volgt het aantal signalen dat de uitspraak draagt
  // (canon 7), niet de opmaak.
  //
  // De beweging is de levenscyclus uit canon 8.1: waarnemen, elkaar herkennen, verband, bewijs,
  // inzicht, rust. Hij loopt één keer en blijft daarna staan. In het dagregime is er geen emissie
  // (canon 7): het inzicht draagt een zachte bloom en een slagschaduw in plaats van gloed.
  // ============================================================================================
  function signalField(insights, leading) {
    const CX = 160, CY = 160, R = 116;
    const others = (insights || []).filter((i) => !leading || i.id !== leading.id);
    if (!others.length) return { svg: '', signals: 0, links: 0 };

    const leadRole = role(leading);
    // Nabijheid is het gevolg van betekenis: gelijke rollen komen naast elkaar te staan.
    const ORDER = ['signal', 'emerging', 'confirmed', 'uncertain'];
    const sorted = others.slice().sort((a, b) => ORDER.indexOf(role(a)) - ORDER.indexOf(role(b)));

    const n = sorted.length;
    const nodes = sorted.map((ins, k) => {
      // Deterministische plaatsing. Geen willekeur, dus twee runs geven hetzelfde veld.
      const angle = (-Math.PI / 2) + (k * 2 * Math.PI / n) + 0.32;
      const r = R - (k % 3) * 13;
      const x = CX + Math.cos(angle) * r;
      const y = CY + Math.sin(angle) * r * 0.92;
      return { ins, x, y, role: role(ins), k, angle };
    });

    // Trap 2 en 3. Twee soorten verbanden, beide betekenisdragend:
    //   naar de kern  : dit signaal draagt de leidende uitspraak (zelfde rol)
    //   onderling     : deze twee waarnemingen gaan over hetzelfde (zelfde rol, naast elkaar)
    const links = [];
    for (const nd of nodes) {
      if (nd.role === leadRole) links.push({ x1: CX, y1: CY, x2: nd.x, y2: nd.y, kind: 'core' });
    }
    for (let k = 1; k < nodes.length; k++) {
      if (nodes[k].role === nodes[k - 1].role) {
        links.push({ x1: nodes[k - 1].x, y1: nodes[k - 1].y, x2: nodes[k].x, y2: nodes[k].y, kind: 'peer' });
      }
    }

    // Het bewijs onder de uitspraak: het aantal signalen dat naar de kern loopt. Daar volgt de
    // straal van het licht uit, en verder niets.
    const carrying = links.filter((l) => l.kind === 'core').length;
    const halo = 34 + carrying * 13;
    const core = 7 + Math.min(carrying, 4);

    const len = (l) => Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
    const linkSvg = links.map((l, i) => {
      const stroke = l.kind === 'core' ? 'var(--semantic-emerging)' : 'var(--copper-700)';
      const op = l.kind === 'core' ? 0.34 : 0.24;
      return `<line class="sf-link" style="--len:${len(l)};--i:${i}" x1="${l.x1.toFixed(1)}" y1="${l.y1.toFixed(1)}" x2="${l.x2.toFixed(1)}" y2="${l.y2.toFixed(1)}" stroke="${stroke}" stroke-opacity="${op}" stroke-width="1"/>`;
    }).join('');

    const nodeSvg = nodes.map((nd) => {
      // Signalen komen binnen als koper (canon 9). Alleen wat nog aan het worden is, staat violet.
      const fill = nd.role === 'emerging' ? 'var(--semantic-emerging)' : 'var(--copper-500)';
      const r = nd.role === leadRole ? 4 : 3;
      // Ze drijven van buiten naar binnen: waarnemen, dan naar elkaar toe buigen.
      const dx = (Math.cos(nd.angle) * 26).toFixed(1);
      const dy = (Math.sin(nd.angle) * 26).toFixed(1);
      return `<circle class="sf-node" style="--i:${nd.k};--dx:${dx}px;--dy:${dy}px" cx="${nd.x.toFixed(1)}" cy="${nd.y.toFixed(1)}" r="${r}" fill="${fill}" fill-opacity="${nd.role === leadRole ? 0.95 : 0.7}"/>`;
    }).join('');

    const svg = `<svg class="orbit" viewBox="0 0 320 320" aria-hidden="true">
      <defs>
        <radialGradient id="sfBloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--semantic-emerging)" stop-opacity="0.22"/>
          <stop offset="55%" stop-color="var(--semantic-emerging)" stop-opacity="0.07"/>
          <stop offset="100%" stop-color="var(--semantic-emerging)" stop-opacity="0"/>
        </radialGradient>
        <filter id="sfCast" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#5f4fb0" flood-opacity="0.35"/>
        </filter>
      </defs>
      ${linkSvg}
      ${nodeSvg}
      <circle class="sf-halo" cx="${CX}" cy="${CY}" r="${halo}" fill="url(#sfBloom)"/>
      <circle class="sf-core" cx="${CX}" cy="${CY}" r="${core}" fill="var(--semantic-emerging)" filter="url(#sfCast)"/>
    </svg>`;

    return { svg, signals: nodes.length, links: links.length };
  }

  // De legenda maakt het licht eerlijk: in tekst staat waarop het rust (canon 7 en 10).
  function fieldLegend(field) {
    if (!field.svg) return '';
    const w = (n, one, many) => `<b>${n}</b> ${n === 1 ? one : many}`;
    return `<p class="field-legend">Dit inzicht rust op ${w(field.signals, 'waarneming', 'waarnemingen')}
      en ${w(field.links, 'verband', 'verbanden')}.</p>`;
  }

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
  function skeleton() { view.innerHTML = '<p class="skel">Eén moment.</p>'; }

  // Lege staat: ontworpen, niet leeg. Serif-regel plus één actie (canon 12).
  function emptyState(line, actionLabel, nav) {
    return `<div class="empty">
      <p class="stem">${esc(line)}</p>
      ${actionLabel ? `<button class="btn-link" data-nav="${esc(nav)}">${esc(actionLabel)} ${ICON.arrow}</button>` : ''}
    </div>`;
  }

  async function renderOverview() {
    skeleton();
    // Het signaalveld moet op ALLE waarnemingen rusten, niet alleen op de drie recente.
    // Anders zou het licht meer beweren dan het bewijs draagt (canon 7).
    const [ov, ins] = await Promise.all([api('/api/mijn/overview'), api('/api/mijn/insights')]);
    const data = ov.data || {};
    const a = data.attention;
    const c = data.collaboration || {};
    const all = ((ins.data && ins.data.insights) || []).length
      ? ins.data.insights
      : (a ? [a, ...(data.recent || [])] : (data.recent || []));

    const field = a ? signalField(all, a) : { svg: '', signals: 0, links: 0 };
    const hero = a ? `
      <section class="hero">
        <div class="hero-inner">
          <div class="detail-head">
            ${stancePill(a)}
            ${shareTag(a.sharing)}
          </div>
          <h2>${esc(a.title)}</h2>
          <p>${esc(a.basis || a.observation || '')}</p>
          ${fieldLegend(field)}
          <div class="hero-actions">
            <button class="btn btn-primary" data-nav="inzicht/${esc(a.id)}">Bekijk inzicht</button>
            <button class="btn-ghost" data-nav="inzichten">Meer inzichten ${ICON.arrow}</button>
          </div>
        </div>
        ${field.svg}
      </section>` : `<section class="hero"><div class="hero-inner">
        <h2>Je bent bij.</h2>
        <p class="stem">Zodra Maculis iets over jullie organisatie ziet, verschijnt het hier.</p>
      </div></section>`;

    const recent = (data.recent || []).map((i) => insightCard(i)).join('');
    const recentPanel = `
      <section class="panel">
        <p class="section-label">Recente inzichten</p>
        <div class="insight-grid">${recent || emptyState('Er is nog niets anders te zien.')}</div>
        ${data.insightCount > 1 ? '<button class="btn btn-block" data-nav="inzichten">Naar alle inzichten</button>' : ''}
      </section>`;

    // Een stille reflectie in de eigen stem van de omgeving, geen aanbeveling.
    const epigraph = `
      <section class="epigraph">
        <p class="stem">Losse signalen krijgen hier langzaam betekenis, tot je ziet wat er werkelijk speelt.</p>
        <span class="epigraph-src"><span class="brand-ring" aria-hidden="true"></span>Mijn Maculis</span>
      </section>`;

    view.innerHTML = `
      <div class="ov-grid">
        <div class="ov-col">${hero}${recentPanel}</div>
        <div class="ov-col">${collabGlance(c)}${laatsteStap(c)}${epigraph}</div>
      </div>
      ${privacyRow()}`;
    wireNav();
  }

  // Right-column building blocks, shared between the Overzicht and De Spiegel compositions so both
  // pages carry the same samenwerking glance and next-step card.
  function collabGlance(c) {
    c = c || {};
    return `
      <section class="panel">
        <p class="section-label">Samenwerking in één oogopslag</p>
        <div class="glance">
          ${c.upcomingAppointment ? glanceRow('ok', ICON.check, 'Eerstvolgende afspraak', `${esc(fmtDate(c.upcomingAppointment.due_at, true))}${c.upcomingAppointment.detail ? '. ' + esc(c.upcomingAppointment.detail) : ''}`, 'samenwerking') : ''}
          ${c.research ? glanceRow('', ICON.research, esc(c.research.title), esc(c.research.detail || 'Lopend onderzoek'), 'samenwerking') : ''}
          ${glanceRow('', ICON.bell, 'Gedeeld met Maculis', `${c.sharedCount || 0} ${(c.sharedCount === 1) ? 'inzicht' : 'inzichten'}${c.lastSharedAt ? '. Laatste gedeeld op ' + esc(fmtDate(c.lastSharedAt)) : ''}`, 'inzichten')}
        </div>
      </section>`;
  }

  function laatsteStap(c) {
    const step = (c || {}).nextStep;
    return `
      <section class="atmos-card">
        <div class="atmos-inner">
          <p class="atmos-eyebrow">Onze laatste stap</p>
          <p class="atmos-line">${esc(step ? (step.detail || step.title) : 'Zodra we samen een volgende stap afspreken, zie je die hier.')}</p>
          <button class="btn-ghost" data-nav="samenwerking">Bekijk alle afspraken ${ICON.arrow}</button>
        </div>
      </section>`;
  }

  // De Spiegel sluit af met een reflectie in de stem van de organisatie zelf.
  function orgEpigraph() {
    return `
      <section class="epigraph">
        <p class="stem">De inzichten geven ons een helder beeld van waar we staan en waar de kansen liggen.</p>
        <span class="epigraph-src"><span class="brand-ring" aria-hidden="true"></span>${esc(orgName || 'Onze organisatie')}</span>
      </section>`;
  }

  function glanceRow(icoMod, ico, title, meta, nav) {
    return `<button class="glance-row" data-nav="${esc(nav)}">
      <span class="glance-ico ${icoMod}">${ico}</span>
      <span class="glance-text"><span class="glance-title">${title}</span><span class="glance-meta">${meta}</span></span>
      <span class="glance-chev">${ICON.chev}</span>
    </button>`;
  }

  // De kaart draagt drie dingen, elk met een eigen drager: het oppervlak zegt of dit van jou
  // alleen is, de linkerrand van 2px zegt welke houding het inzicht heeft, en de tekst zegt
  // allebei nog een keer. Kleur is nooit de enige drager (canon 10).
  function insightCard(i) {
    const when = fmtDate(i.updated_at || i.created_at, false);
    const priv = i.sharing === 'SHARED' || i.sharing === 'AGGREGATED' ? '' : ' is-private';
    return `<button class="icard on-${role(i)}${priv}" data-nav="inzicht/${esc(i.id)}">
      <div class="icard-top">
        ${shareTag(i.sharing)}
        ${i.unshared_development ? '<span class="pill is-emerging"><span class="dot"></span>Bijgewerkt</span>' : ''}
      </div>
      <h3>${esc(i.title)}</h3>
      <p>${esc(i.observation || '')}</p>
      <div class="icard-foot">
        <span class="icard-when">${esc(when)}</span>
        <span class="icard-go" aria-hidden="true">${ICON.arrow}</span>
      </div>
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

  // De Spiegel: één leidende uitspraak die het signaalveld draagt, de rest in een rustig raster.
  function spiegelHero(i, all) {
    const field = signalField(all, i);
    return `<button class="spiegel-hero" data-nav="inzicht/${esc(i.id)}">
      <div class="spiegel-hero-inner">
        <div class="detail-head">
          ${stancePill(i)}
          ${shareTag(i.sharing)}
        </div>
        <h2>${esc(i.title)}</h2>
        <p>${esc(i.observation || '')}</p>
        ${fieldLegend(field)}
        <span class="btn-link">Bekijk inzicht ${ICON.arrow}</span>
      </div>
      ${field.svg}
    </button>`;
  }

  async function renderInsights() {
    skeleton();
    const [ins, ov] = await Promise.all([api('/api/mijn/insights'), api('/api/mijn/overview')]);
    const items = (ins.data && ins.data.insights) || [];
    if (!items.length) {
      view.innerHTML = emptyState('Je bent bij. Er is nog niets dat we jullie kunnen teruggeven.', 'Naar samenwerking', 'samenwerking');
      wireNav();
      return;
    }
    const c = (ov.data && ov.data.collaboration) || {};
    const dominant = items.find((i) => i.attention) || items[0];
    const rest = items.filter((i) => i.id !== dominant.id);

    const recentPanel = `
      <section class="panel">
        <p class="section-label">Recente inzichten</p>
        <div class="insight-grid">${rest.length ? rest.map(insightCard).join('') : emptyState('Dit is op dit moment het enige inzicht.')}</div>
      </section>`;

    view.innerHTML = `
      <div class="ov-grid">
        <div class="ov-col">${spiegelHero(dominant, items)}${recentPanel}</div>
        <div class="ov-col">${collabGlance(c)}${laatsteStap(c)}${orgEpigraph()}</div>
      </div>
      ${privacyRow()}`;
    wireNav();
  }

  async function renderDetail(id) {
    skeleton();
    const { status, data } = await api('/api/mijn/insights/' + encodeURIComponent(id));
    if (status !== 200 || !data.insight) {
      view.innerHTML = emptyState('Dit inzicht is niet gevonden.', 'Terug naar De Spiegel', 'inzichten');
      wireNav();
      return;
    }
    view.innerHTML = detailMarkup(data.insight, data.development || []);
    wireNav();
    wireDetail(data.insight);
  }

  // De menselijke ontwikkeling: rustig, standaard dichtgeklapt, zonder versie-ids of confidence.
  function developmentSection(development) {
    if (!development || development.length < 2) return '';
    const rows = development.map((e) => `
      <li class="dev-entry ${e.current ? 'current' : ''}">
        <span class="dev-when">${esc(fmtDate(e.at, false))}${e.current ? ', nu' : ''}</span>
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
    const skin = shared ? '' : ' is-private';
    if (unshared) {
      // Een eerdere lezing is gedeeld, een nieuwere is privé. Kalm, ondubbelzinnig, geen dark pattern.
      return `<div class="share-panel${skin}">
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
          <button class="btn btn-primary" id="act-share-update">Deel de nieuwe ontwikkeling</button>
          <button class="btn" id="act-revoke">Delen intrekken</button>
        </div>
      </div>`;
    }
    return `<div class="share-panel${skin}">
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
        : '<button class="btn btn-primary" id="act-share">Bespreek met Maculis</button>'}
    </div>`;
  }

  // Insight surface (canon 12): de serif-uitspraak leidt, het bewijs staat eronder achter een
  // rail van 1px. "Nog niet bekend" blijft kleurloos, en waar niets staat, staat dat in woorden.
  function detailMarkup(i, development) {
    const q = (label, text, mod) =>
      `<div class="qa${mod ? ' ' + mod : ''}"><h3>${label}</h3><p>${esc(text || 'Dit hebben we nog niet opgeschreven.')}</p></div>`;
    return `<div class="detail">
      <div class="detail-back"><button class="btn-link" data-nav="inzichten">${leftArrow()} De Spiegel</button></div>
      <div class="detail-head">
        ${stancePill(i)}
        ${shareTag(i.sharing)}
      </div>
      <h2>${esc(i.title)}</h2>

      <p class="qa-lead">${esc(i.observation || 'Dit hebben we nog niet opgeschreven.')}</p>

      <div class="evidence">
        ${q('Wat betekent dit mogelijk?', i.meaning)}
        ${q('Waar baseren we dit op?', i.basis)}
        ${q('Wat weten we nog niet?', i.not_yet_known, 'unknown')}
      </div>

      ${developmentSection(development)}
      ${sharePanel(i)}
    </div>`;
  }

  function leftArrow() { return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" style="vertical-align:-2px"><path d="M20 12H5"/><path d="m11 6-6 6 6 6"/></svg>'; }

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
    if (!items.length) {
      view.innerHTML = emptyState('Er zijn nog geen gezamenlijke afspraken of stappen.', 'Naar De Spiegel', 'inzichten');
      wireNav();
      return;
    }
    const KIND = { agreement: 'Afspraak', next_step: 'Volgende stap', research: 'Onderzoek', decision: 'Besluit', shared_note: 'Notitie' };
    const rows = items.map((i) => {
      const meta = [KIND[i.kind] || 'Item', i.due_at ? fmtDate(i.due_at, true) : ''].filter(Boolean).join(', ');
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
    } else if (action === 'share-update') {
      confirmTitle.textContent = 'Nieuwe ontwikkeling delen';
      confirmBody.textContent = 'Je werkt de eerder gedeelde lezing bij voor Maculis met de huidige ontwikkeling. Vanaf dat moment gebruikt Maculis de nieuwe lezing. Er wordt niets automatisch gedeeld.';
      confirmOk.textContent = 'Nieuwe ontwikkeling delen';
    } else {
      confirmTitle.textContent = 'Delen intrekken';
      confirmBody.textContent = 'Maculis gebruikt dit inzicht daarna niet langer in jullie samenwerking. Het blijft wel voor jou zichtbaar.';
      confirmOk.textContent = 'Intrekken';
    }
    confirmOk.className = 'btn btn-primary';
    confirm.classList.remove('hidden');
    confirmOk.focus();
  }
  function closeConfirm() { confirm.classList.add('hidden'); pending = null; }
  confirmCancel.addEventListener('click', closeConfirm);
  confirm.addEventListener('click', (e) => { if (e.target === confirm) closeConfirm(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !confirm.classList.contains('hidden')) closeConfirm(); });
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
    t.setAttribute('role', 'status');
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
    orgName = data.organization || '';
    $('side-org-name').textContent = data.organization || 'Onbekend';
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
