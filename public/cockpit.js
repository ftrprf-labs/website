/* =====================================================================
   Maculis Future Cockpit — PROTOTYPE logic
   Isolated, additive. All data below is PROTOTYPE DATA (fictional).
   CSP-safe: no inline handlers, all listeners attached here.

   This drives:
     - three visual directions (A Deep, B Licht, C Reveal/Work)
     - six scenarios (quiet / comm / reveal / lens / scale / work)
     - the "Kijk nog eens." progressive-disclosure Reveal interaction
     - an attention hierarchy: NU / BEWEGING / KLAAR / RUST
   ===================================================================== */

'use strict';

const shell = document.getElementById('shell');
const view = document.getElementById('view');

/* ---------- tiny seeded RNG so the 500-row list is stable in screenshots ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =====================================================================
   FIXTURES — PROTOTYPE DATA
   ===================================================================== */

const ATTENTION = {
  // Scenario "comm": three conversations asking for attention, two replies ready.
  comm: {
    now: [
      { who: 'Kim Deraedt', org: 'Fietsatelier Deraedt', chan: 'e-mail', when: '9:12',
        line: 'Vraagt of de tweede sessie deze week nog past. Wacht sinds gisteren.',
        tag: { cls: 'now', label: 'Vraagt aandacht' } },
      { who: 'Bram Peeters', org: 'Peeters Interim', chan: 'whatsapp', when: 'gisteren',
        line: 'Antwoordde op je vraag over de planning. Nog niet gelezen.',
        tag: { cls: 'now', label: 'Nieuw bericht' } },
    ],
    ready: [
      { who: 'Nadia el Amrani', org: 'Studio Noord', chan: 'e-mail', when: '8:40',
        line: 'Bedankt voor het First Five gesprek. Een antwoord staat voor je klaar.',
        tag: { cls: 'ready', label: 'Antwoord staat klaar' } },
      { who: 'Tom Vervoort', org: 'Vervoort Bouw', chan: 'e-mail', when: 'eergisteren',
        line: 'Vroeg naar de volgende stap. Een antwoord staat voor je klaar.',
        tag: { cls: 'ready', label: 'Antwoord staat klaar' } },
    ],
  },
};

// Scenario "reveal": one evidence-grounded relationship observation.
const REVEAL_RELATIONSHIP = {
  noticed: 'Er valt iets op',
  headline: 'Kim reageert anders dan eerst.',
  relto: 'Kim Deraedt · Fietsatelier Deraedt',
  layers: [
    { prov: 'fact', tag: 'Feit',
      text: 'Haar antwoorden komen sinds drie weken later binnen.',
      evidence: 'Reactietijd liep van gemiddeld 4 uur naar gemiddeld 2 dagen, over de laatste vijf berichten.',
      conf: null },
    { prov: 'observation', tag: 'Observatie',
      text: 'De toon werd korter en zakelijker.',
      evidence: 'Waar eerdere berichten open eindigden, sluiten de laatste drie zonder vraag of vervolg.',
      conf: 0.72 },
    { prov: 'inference', tag: 'Gevolgtrekking',
      text: 'De verandering begon na jullie laatste gesprek.',
      evidence: 'De omslag valt samen met het gesprek van 21 juli over de planning. Dit is een samenval in tijd, geen bewezen oorzaak.',
      conf: 0.51 },
    { prov: 'suggestion', tag: 'Suggestie',
      text: 'Een korte, persoonlijke check zou nu passen.',
      evidence: 'Geen actie is ook goed. Maculis dringt niet aan. Dit is wat je zou kunnen doen, niet wat je moet doen.',
      conf: null },
  ],
  fixture: false,
};

// Scenario "lens": a HYPOTHETICAL future lens reveal, clearly marked as prototype.
const REVEAL_LENS = {
  noticed: 'Er valt iets op',
  headline: 'Je groeit. Je vrije ruimte niet.',
  relto: 'Finance lens · hypothetisch voorbeeld',
  layers: [
    { prov: 'fact', tag: 'Feit',
      text: 'Je omzet ligt dit kwartaal 7 procent hoger dan vorig kwartaal.',
      evidence: 'Voorbeeldcijfers. Deze lens bestaat nog niet in Maculis.',
      conf: null },
    { prov: 'observation', tag: 'Observatie',
      text: 'Je vrije tijd tussen afspraken werd juist krapper.',
      evidence: 'Voorbeeldobservatie op fictieve agendadata.',
      conf: 0.6 },
    { prov: 'inference', tag: 'Gevolgtrekking',
      text: 'Meer omzet komt hier uit meer uren, niet uit meer ruimte.',
      evidence: 'Illustratief. Zou pas een echte gevolgtrekking worden met echte, betrouwbare evidence.',
      conf: 0.44 },
  ],
  fixture: true,
};

// Scenario "work": a deep-work conversation with AI-prepared draft (human keeps the last word).
const THREAD = {
  who: 'Nadia el Amrani', org: 'Studio Noord', chan: 'e-mail', subject: 'Na het First Five gesprek',
  messages: [
    { dir: 'in', who: 'Nadia', body: 'Dank je wel voor het gesprek van gisteren. Ik bleef er nog even over nadenken. Vooral dat tweede stuk raakte iets.' },
    { dir: 'out', who: 'Maculis · jij', body: 'Fijn dat het bleef hangen, Nadia. Dat tweede stuk is precies waar het vaak begint.' },
    { dir: 'in', who: 'Nadia', body: 'Zou een vervolg kunnen? Ik weet alleen niet goed wanneer.' },
  ],
  draft: 'Natuurlijk, Nadia. Laten we het rustig plannen. Ik heb volgende week dinsdag en donderdag ruimte. Zeg gerust wat voor jou het beste past, dan houd ik het vrij.',
  draftBy: 'Maculis stelde dit voor. Jij houdt het laatste woord.',
  facts: [
    { k: 'Organisatie', v: 'Studio Noord' },
    { k: 'Kanaal', v: 'E-mail' },
    { k: 'First Five', v: 'Afgerond op 12 augustus' },
    { k: 'Toestemming', v: 'Gegeven, mondeling vastgelegd' },
  ],
  memory: 'Onthouden: Nadia werkt het liefst op dinsdag. Bevestigd door jou op 2 augustus.',
};

/* ----- Scale fixtures: 520 relationships, deterministically generated ----- */
const FIRST = ['Kim','Bram','Nadia','Tom','Sanne','Joris','Lea','Milan','Fatima','Ruben','Iris','Daan','Yassine','Noor','Wout','Emma','Karel','Lotte','Sem','Anouk','Hugo','Maud','Tijn','Fenna','Bas','Julie','Stijn','Roos','Lars','Amber','Koen','Sofie','Niels','Eva','Jesse','Lieke','Mees','Nina','Pim','Sara'];
const LAST = ['Deraedt','Peeters','el Amrani','Vervoort','Janssen','De Vos','Maes','Willems','Bakker','Hendrickx','Claes','Smit','Dubois','Vermeulen','Aerts','Mertens','Wouters','De Smet','Jacobs','Goossens'];
const ORG = ['Fietsatelier','Studio','Interim','Bouw','Praktijk','Atelier','Collectief','Bureau','Werkplaats','Kwekerij','Uitgeverij','Kliniek','Brouwerij','Ontwerp','Advies'];
const STATES = [
  { cls: 'quiet', label: 'Rustig' },
  { cls: 'quiet', label: 'Rustig' },
  { cls: 'quiet', label: 'Rustig' },
  { cls: 'active', label: 'Actief gesprek' },
  { cls: 'moving', label: 'Er beweegt iets' },
];
function buildRelationships(n) {
  const rnd = mulberry32(20260815);
  const out = [];
  for (let i = 0; i < n; i++) {
    const fn = FIRST[Math.floor(rnd() * FIRST.length)];
    const ln = LAST[Math.floor(rnd() * LAST.length)];
    const org = ORG[Math.floor(rnd() * ORG.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)];
    const st = STATES[Math.floor(rnd() * STATES.length)];
    out.push({ fn, ln, org, st, surfaced: st.cls === 'moving' });
  }
  return out;
}
const RELATIONSHIPS = buildRelationships(520);

/* =====================================================================
   RENDER HELPERS
   ===================================================================== */

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function initials(fn, ln) { return (fn[0] || '') + (ln[0] || ''); }

/* =====================================================================
   VIEWS
   ===================================================================== */

function greeting() {
  const hr = 9; // fixed for the prototype ("Goedemorgen")
  const word = hr < 12 ? 'Goedemorgen' : hr < 18 ? 'Goedemiddag' : 'Goedenavond';
  return word;
}

function attnItem(it) {
  const b = el('button', 'item');
  b.innerHTML =
    `<span class="row1">
       <span class="who">${esc(it.who)}</span>
       <span class="chan">${esc(it.chan)}</span>
       <span class="when">${esc(it.when)}</span>
     </span>
     <span class="line">${esc(it.line)}</span>
     <span class="tags">
       <span class="chip ${it.tag.cls}"><span class="k"></span>${esc(it.tag.label)}</span>
       <span class="chip">${esc(it.org)}</span>
     </span>`;
  b.addEventListener('click', () => go('gesprekken', 'work'));
  return b;
}

function tierHead(cls, label, hint) {
  const h = el('div', 'attn-head');
  h.innerHTML =
    `<span class="tier ${cls}"><span class="pip"></span><b>${esc(label)}</b></span>
     ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}`;
  return h;
}

/* ---- Vandaag: quiet morning (silence is a success state) ---- */
function viewQuiet() {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge('reveal'));
  const g = el('div', 'greet');
  g.innerHTML =
    `<div class="eyebrow">Vandaag · vrijdag 15 augustus</div>
     <h1>${greeting()}, Ludwig.</h1>
     <p class="sub">Er is vanmorgen niets dat je aandacht vraagt.</p>`;
  wrap.appendChild(g);

  const s = el('div', 'silence');
  s.innerHTML =
    `<div class="eye" aria-hidden="true">
       <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
         <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="2.6"/>
       </svg>
     </div>
     <h2>Je bent bij.</h2>
     <p>Voor nu hoeft er niets van je.</p>
     <div class="whisper">Maculis kijkt verder. Als er iets werkelijk toe doet, zie je het hier.</div>`;
  wrap.appendChild(s);
  return wrap;
}

/* ---- Vandaag: communication attention ---- */
function viewComm() {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge('reveal'));
  const c = ATTENTION.comm;
  const total = c.now.length + c.ready.length;

  const g = el('div', 'greet');
  g.innerHTML =
    `<div class="eyebrow">Vandaag · vrijdag 15 augustus</div>
     <h1>${greeting()}, Ludwig.</h1>
     <p class="sub">Twee gesprekken vragen je aandacht. Twee antwoorden staan al klaar.</p>`;
  wrap.appendChild(g);

  const now = el('div', 'attn-group');
  now.appendChild(tierHead('now', 'Nu', 'vraagt jou'));
  c.now.forEach(it => now.appendChild(attnItem(it)));
  wrap.appendChild(now);

  const ready = el('div', 'attn-group');
  ready.appendChild(tierHead('ready', 'Klaar', 'Maculis heeft iets voorbereid'));
  c.ready.forEach(it => ready.appendChild(attnItem(it)));
  wrap.appendChild(ready);

  const rest = el('div', 'attn-group');
  rest.appendChild(tierHead('quiet', 'Rust', 'de rest is stil'));
  const q = el('div', 'silence');
  q.style.padding = '32px 16px';
  q.innerHTML = `<p class="muted">De overige ${RELATIONSHIPS.length - total} relaties zijn rustig. Ze blijven bereikbaar onder Relaties.</p>`;
  rest.appendChild(q);
  wrap.appendChild(rest);
  return wrap;
}

/* ---- The Reveal component (shared by relationship + lens scenarios) ---- */
function revealBlock(data) {
  const r = el('section', 'reveal');
  r.setAttribute('aria-label', 'Reveal');
  let head =
    `<div class="noticed">${esc(data.noticed)}</div>
     <h2>${esc(data.headline)}</h2>
     <div class="relto">${esc(data.relto)}</div>`;
  r.innerHTML = head;

  const expandAll = new URLSearchParams(location.search).get('expand') === '1';
  const layers = el('div', 'layers');
  data.layers.forEach((L, i) => {
    const d = el('div', 'layer' + (i === 0 || expandAll ? ' on' : ''));
    let conf = '';
    if (L.conf != null) {
      conf = `<div class="conf">Zekerheid ${Math.round(L.conf * 100)} procent</div>
              <div class="bar" role="img" aria-label="Zekerheid ${Math.round(L.conf * 100)} procent"><i style="width:${Math.round(L.conf * 100)}%"></i></div>`;
    }
    d.innerHTML =
      `<span class="prov ${L.prov}">${esc(L.tag)}</span>
       <p>${esc(L.text)}</p>
       <div class="evidence">${esc(L.evidence)}</div>${conf}`;
    layers.appendChild(d);
  });
  r.appendChild(layers);

  // "Kijk nog eens." reveals the next layer, one at a time.
  const btn = el('button', 'look-again');
  let shown = expandAll ? data.layers.length : 1;
  const total = data.layers.length;
  function label() {
    return shown < total
      ? `<span>Kijk nog eens.</span><span class="arw" aria-hidden="true">→</span>`
      : `<span>Je hebt alles gezien.</span>`;
  }
  btn.innerHTML = label();
  btn.addEventListener('click', () => {
    if (shown >= total) return;
    const next = layers.children[shown];
    if (next) next.classList.add('on');
    shown++;
    btn.innerHTML = label();
    if (shown >= total) btn.setAttribute('disabled', '');
  });
  r.appendChild(btn);

  if (data.fixture) {
    const f = el('div', 'fixture-note');
    f.textContent = 'Prototype data · deze lens bestaat nog niet';
    r.appendChild(f);
  }
  return r;
}

function viewReveal(data, subline) {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge('reveal'));
  const g = el('div', 'greet');
  g.innerHTML =
    `<div class="eyebrow">Vandaag · vrijdag 15 augustus</div>
     <h1>${greeting()}, Ludwig.</h1>
     <p class="sub">${esc(subline)}</p>`;
  wrap.appendChild(g);
  wrap.appendChild(revealBlock(data));

  const note = el('p', 'scale-note');
  note.textContent = 'Elke laag verschijnt pas als je verder kijkt. Geen dump van alles tegelijk.';
  wrap.appendChild(note);
  return wrap;
}

/* ---- Relaties: scale (520 records), quiet by default ---- */
function viewScale() {
  const wrap = el('div', 'view-enter');
  wrap.classList.add('wide');
  wrap.appendChild(spaceBadge('work'));

  const top = el('div', 'rel-top');
  top.innerHTML =
    `<h1>Relaties</h1><span class="n">${RELATIONSHIPS.length} in beeld</span>
     <span class="search"><span aria-hidden="true">⌕</span><input type="text" id="relsearch" placeholder="Zoek een persoon, organisatie of onderwerp" aria-label="Zoeken"></span>`;
  wrap.appendChild(top);

  const moving = RELATIONSHIPS.filter(r => r.surfaced).length;
  const active = RELATIONSHIPS.filter(r => r.st.cls === 'active').length;
  const views = el('div', 'views');
  views.innerHTML =
    `<button class="viewpill" aria-pressed="true" data-v="beweegt">Er beweegt iets<span class="c">${moving}</span></button>
     <button class="viewpill" aria-pressed="false" data-v="actief">Actief gesprek<span class="c">${active}</span></button>
     <button class="viewpill" aria-pressed="false" data-v="alles">Alle relaties<span class="c">${RELATIONSHIPS.length}</span></button>
     <button class="viewpill" aria-pressed="false" data-v="stil">Al een tijd stil<span class="c">${Math.round(RELATIONSHIPS.length * 0.4)}</span></button>`;
  wrap.appendChild(views);

  const lead = el('p', 'scale-note');
  lead.style.textAlign = 'left';
  lead.style.margin = '0 0 16px';
  lead.textContent = 'Met honderden relaties toont Maculis eerst wat beweegt. De volledige lijst blijft één klik weg. Zo wordt het waardevoller, niet drukker.';
  wrap.appendChild(lead);

  const list = el('div', 'rel-list');
  list.id = 'rel-list';
  wrap.appendChild(list);

  const foot = el('div', 'scale-note');
  foot.id = 'rel-foot';
  wrap.appendChild(foot);

  function render(filter) {
    let rows = RELATIONSHIPS;
    if (filter === 'beweegt') rows = RELATIONSHIPS.filter(r => r.surfaced);
    else if (filter === 'actief') rows = RELATIONSHIPS.filter(r => r.st.cls === 'active');
    else if (filter === 'stil') rows = RELATIONSHIPS.filter(r => r.st.cls === 'quiet').slice(0, Math.round(RELATIONSHIPS.length * 0.4));
    const shown = rows.slice(0, filter === 'alles' ? 60 : rows.length);
    list.innerHTML = '';
    shown.forEach(r => {
      const row = el('div', 'rel' + (r.surfaced ? ' surfaced' : ''));
      row.tabIndex = 0;
      row.innerHTML =
        `<span class="movement" aria-hidden="true"></span>
         <span class="av" aria-hidden="true">${esc(initials(r.fn, r.ln))}</span>
         <span class="nm">${esc(r.fn)} ${esc(r.ln)}<small>${esc(r.org)}</small></span>
         <span class="org">${esc(r.org)}</span>
         <span class="state ${r.st.cls}"><span class="k"></span>${esc(r.st.label)}</span>
         <span class="act">
           <button title="Open relatie" aria-label="Open relatie">◇</button>
           <button title="Gesprek" aria-label="Gesprek">❯</button>
         </span>`;
      row.querySelector('.act').addEventListener('click', e => { e.stopPropagation(); go('gesprekken', 'work'); });
      row.addEventListener('click', () => go('gesprekken', 'work'));
      list.appendChild(row);
    });
    foot.textContent = filter === 'alles'
      ? `Eerste 60 van ${RELATIONSHIPS.length} getoond. Bij duizenden relaties is bladeren niet meer het startpunt. Zoeken en betekenis wel.`
      : `${shown.length} getoond. De rest is rustig en blijft bereikbaar.`;
  }
  render('beweegt');

  views.querySelectorAll('.viewpill').forEach(p => {
    p.addEventListener('click', () => {
      views.querySelectorAll('.viewpill').forEach(x => x.setAttribute('aria-pressed', 'false'));
      p.setAttribute('aria-pressed', 'true');
      render(p.getAttribute('data-v'));
    });
  });
  return wrap;
}

/* ---- Gesprekken: deep work (Work space, light in direction C) ---- */
function viewWork() {
  const wrap = el('div', 'view-enter');
  wrap.classList.add('wide');
  wrap.appendChild(spaceBadge('work'));

  const head = el('div', '');
  head.innerHTML =
    `<div class="eyebrow-line">Gesprek · Work space</div>
     <p class="lead-note">Hier werk je langer. Lange mails, context, analyse. Rustiger licht, meer ruimte, minder signaal. Maculis stuurt hier niet, het ondersteunt.</p>`;
  wrap.appendChild(head);

  const grid = el('div', 'work-grid');

  const thread = el('div', 'thread');
  let msgs = '';
  THREAD.messages.forEach(m => {
    msgs += `<div class="msg ${m.dir}"><div class="who">${esc(m.who)}</div><div class="b">${esc(m.body)}</div></div>`;
  });
  thread.innerHTML =
    `<div class="th-head"><h2>${esc(THREAD.subject)}</h2><div class="meta">${esc(THREAD.who)} · ${esc(THREAD.org)} · ${esc(THREAD.chan)}</div></div>
     <div class="msgs">${msgs}</div>
     <div class="composer">
       <textarea id="draft" aria-label="Antwoord">${esc(THREAD.draft)}</textarea>
       <div class="bar">
         <span class="draftby">${esc(THREAD.draftBy)}</span>
         <button class="btn btn-ghost">Opslaan</button>
         <button class="btn btn-primary">Goedkeuren en verzenden</button>
       </div>
     </div>`;
  grid.appendChild(thread);

  const side = el('div', 'side-panel');
  const facts = el('div', 'panel');
  let fx = '<h3>Relatie</h3>';
  THREAD.facts.forEach(f => { fx += `<div class="fact"><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span></div>`; });
  facts.innerHTML = fx;
  side.appendChild(facts);

  const mem = el('div', 'panel');
  mem.innerHTML = `<h3>Geheugen</h3><div class="memory">${esc(THREAD.memory)}</div>`;
  side.appendChild(mem);

  const help = el('div', 'panel');
  help.innerHTML =
    `<h3>Maculis begrijpt dit gesprek</h3>
     <p class="muted" style="font-size:13px;margin:0 0 12px">Nadia vroeg om een vervolg maar twijfelt over het moment. Het voorstel biedt twee concrete opties en laat de keuze bij haar.</p>
     <button class="btn btn-ghost">Warmer</button> <button class="btn btn-ghost">Korter</button>`;
  side.appendChild(help);

  const note = el('div', 'panel');
  note.innerHTML = `<div class="muted" style="font-size:12px">Niets wordt automatisch verzonden. Jij houdt het laatste woord. Een menselijke wijziging blijft altijd behouden.</div>`;
  side.appendChild(note);

  grid.appendChild(side);
  wrap.appendChild(grid);
  return wrap;
}

/* ---- generic "Lenzen / Journeys / Groei / Beheer" placeholder ---- */
function viewPlaceholder(title, body, space) {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge(space || 'reveal'));
  wrap.innerHTML +=
    `<div class="eyebrow-line">${esc(title)}</div>
     <h1 style="font-family:var(--serif);font-weight:600;font-size:var(--t-title);margin:8px 0 12px">${esc(title)}</h1>
     <p class="lead-note">${esc(body)}</p>`;
  return wrap;
}

function spaceBadge(space) {
  const b = el('div', 'space-badge');
  const isWork = space === 'work';
  b.innerHTML = `<span class="d"></span>${isWork ? 'Work space · om te werken' : 'Reveal space · om te zien'}`;
  // only meaningful in direction C; harmless label elsewhere
  return b;
}

/* =====================================================================
   ROUTER + STATE
   ===================================================================== */

let dir = 'A';
let scn = 'comm';
let nav = 'vandaag';

// which "space" a nav view lives in (drives direction C dual-space)
const SPACE = { vandaag: 'reveal', lenzen: 'reveal', journeys: 'reveal', groei: 'reveal',
                relaties: 'work', gesprekken: 'work', beheer: 'work' };

function render() {
  // space follows the active view (direction C flips dark/light; A and B ignore it)
  shell.setAttribute('data-space', SPACE[nav] || 'reveal');

  view.innerHTML = '';
  let node;
  if (nav === 'vandaag') {
    if (scn === 'quiet') node = viewQuiet();
    else if (scn === 'reveal') node = viewReveal(REVEAL_RELATIONSHIP, 'Er beweegt iets bij een relatie die je goed kent.');
    else if (scn === 'lens') node = viewReveal(REVEAL_LENS, 'Een toekomstige lens laat iets zien. Duidelijk als prototype.');
    else node = viewComm();
  } else if (nav === 'relaties') {
    node = viewScale();
  } else if (nav === 'gesprekken') {
    node = viewWork();
  } else if (nav === 'lenzen') {
    node = viewPlaceholder('Lenzen', 'First Five en toekomstige lenzen. Een lens wordt hier geen tabblad met twintig metrics. Wat een lens ziet, landt in Vandaag, in de relatie, of als reveal.', 'reveal');
  } else if (nav === 'journeys') {
    node = viewPlaceholder('Journeys', 'First Five en toekomstige journeys. Uitnodigingen, voortgang, evaluaties. Testerbeheer leeft hier verder als operationele journey view.', 'reveal');
  } else if (nav === 'groei') {
    node = viewPlaceholder('Groei', 'GrowBrain verschijnt pas wanneer Maculis genoeg begrijpt om een diepere stap betekenisvol te maken. Geen upgrade knop. Een natuurlijke verdieping, wanneer er iets onder zit.', 'reveal');
  } else {
    node = viewPlaceholder('Beheer', 'Templates, imports, instellingen en operationele controls. Alles wat nodig is, buiten de dagelijkse aandacht gehouden.', 'work');
  }
  view.appendChild(node);

  // reflect nav state
  document.querySelectorAll('#nav a').forEach(a => {
    a.removeAttribute('aria-current');
    if (a.getAttribute('data-nav') === nav) a.setAttribute('aria-current', 'page');
  });
}

function go(navTo, spaceHint) {
  nav = navTo;
  // keep scenario buttons in sync where a scenario maps cleanly to a nav
  if (navTo === 'relaties') setScn('scale', false);
  else if (navTo === 'gesprekken') setScn('work', false);
  else if (navTo === 'vandaag' && (scn === 'scale' || scn === 'work')) setScn('comm', false);
  render();
}

function setDir(d) {
  dir = d;
  shell.setAttribute('data-direction', d);
  document.querySelectorAll('[data-dir]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-dir') === d)));
}

function setScn(s, doRender = true) {
  scn = s;
  document.querySelectorAll('[data-scn]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-scn') === s)));
  // scenario also picks the nav destination
  if (s === 'scale') nav = 'relaties';
  else if (s === 'work') nav = 'gesprekken';
  else nav = 'vandaag';
  if (doRender) render();
}

/* ---------- wire up controls ---------- */
document.querySelectorAll('[data-dir]').forEach(b =>
  b.addEventListener('click', () => setDir(b.getAttribute('data-dir'))));
document.querySelectorAll('[data-scn]').forEach(b =>
  b.addEventListener('click', () => setScn(b.getAttribute('data-scn'))));
document.querySelectorAll('#nav a').forEach(a =>
  a.addEventListener('click', e => { e.preventDefault(); go(a.getAttribute('data-nav')); }));

/* ---------- boot (supports deep-linking: /cockpit.html?dir=C&scn=reveal) ---------- */
const params = new URLSearchParams(location.search);
const wantDir = (params.get('dir') || 'A').toUpperCase();
const wantScn = params.get('scn') || 'comm';
setDir(['A', 'B', 'C'].includes(wantDir) ? wantDir : 'A');
setScn(['quiet', 'comm', 'reveal', 'lens', 'scale', 'work'].includes(wantScn) ? wantScn : 'comm');

/* nav counts (attention only, never a notification pile) */
const total = ATTENTION.comm.now.length + ATTENTION.comm.ready.length;
document.getElementById('nc-vandaag').textContent = total;
document.getElementById('nc-gesprekken').textContent = ATTENTION.comm.now.length;
