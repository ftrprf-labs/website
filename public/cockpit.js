/* =====================================================================
   Maculis Future Cockpit — PROTOTYPE logic (deepening round, direction C)
   Isolated, additive. All data is PROTOTYPE DATA (fictional).
   CSP-safe: no inline handlers, all listeners attached here.

   Proves direction C (Reveal / Work, dual-space):
     - Vandaag as an intelligence cockpit with four real states:
         quiet · one thing · normal · busy (busy groups, never dumps)
     - Reveal: FACT -> OBSERVATION -> INFERENCE -> SUGGESTION, provenance,
       "waarom zie ik dit?", and the "Kijk nog eens." disclosure
     - Relaties at scale: Maculis-proposed segments, recent movement, context
     - Gesprekken: relationship is the unit, channel is metadata
     - Work space: light room for deep work, with a dark reveal aperture
     - Three signature interactions:
         1. Kijk nog eens.        (reveal, evidence disclosure)
         2. Terugval in rust.     (a handled item settles down, never vanishes)
         3. De stille meerderheid (many signals grouped into calm; open on ask)
   ===================================================================== */

'use strict';

const shell = document.getElementById('shell');
const view = document.getElementById('view');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- seeded RNG so the large list is stable in screenshots ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- tiny DOM helpers ---------- */
function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0] || '')[0] || '') + ((p[p.length - 1] || '')[0] || '');
}
const CHAN_ICO = { 'e-mail': '✉', 'whatsapp': '◇', 'sms': '▤', 'telefoon': '☎' };

/* =====================================================================
   FIXTURES — PROTOTYPE DATA (deliberately varied: long names, long orgs,
   long addresses, one-word names, no-organisation, accents)
   ===================================================================== */

const PEOPLE = {
  kim:   { name: 'Kim Deraedt', org: 'Fietsatelier Deraedt', email: 'kim@fietsatelierderaedt.be' },
  jb:    { name: 'Jean-Baptiste Vandenberghe', org: 'Coöperatie Noorderlicht Zorg en Welzijn', email: 'jean-baptiste.vandenberghe@noorderlicht-zorgenwelzijn.coop' },
  nadia: { name: 'Nadia el Amrani', org: 'Studio Noord', email: 'nadia@studionoord.nl' },
  bram:  { name: 'Bram Peeters', org: 'Peeters Interim en Detachering', email: 'bram.peeters@peeters-interim.be' },
  fed:   { name: 'Federico Gonçalves da Silva', org: 'zelfstandig, zonder organisatie', email: 'federico.goncalves.dasilva@proton.me' },
  tom:   { name: 'Tom Vervoort', org: 'Vervoort Bouw', email: 'tom@vervoortbouw.be' },
  saar:  { name: 'Saar', org: 'Saar Keramiek', email: 'hallo@saarkeramiek.nl' },
  lieselotte: { name: 'Lieselotte Vandewalle', org: 'Advocatenkantoor Vandewalle en Partners', email: 'l.vandewalle@vandewalle-partners.be' },
};

/* Attention items. tier: nu | beweging | klaar. Each can answer "waarom". */
const NU = {
  delivery: {
    id: 'a-delivery', who: PEOPLE.tom, chan: 'e-mail', when: 'zojuist', tier: 'nu',
    kind: 'now', label: 'Levering mislukt',
    line: 'Je antwoord aan Tom kwam niet aan. Het e-mailadres bounced.',
    why: 'De provider meldde een harde bounce op tom@vervoortbouw.be. Niets verzonden, niets stils gemaakt.',
  },
  waiting: {
    id: 'a-waiting', who: PEOPLE.jb, chan: 'e-mail', when: '2 dagen', tier: 'nu',
    kind: 'now', label: 'Wacht op jou',
    line: 'Jean-Baptiste vroeg of de tweede sessie deze week nog past. Twee dagen stil.',
    why: 'Laatste inbound was 2 dagen geleden, nog geen antwoord van jouw kant. Ouder dan al het andere dat wacht.',
  },
  unread: {
    id: 'a-unread', who: PEOPLE.bram, chan: 'whatsapp', when: 'gisteren', tier: 'nu',
    kind: 'now', label: 'Nieuw bericht',
    line: 'Bram antwoordde op je vraag over de planning. Nog niet gelezen.',
    why: 'Inbound via WhatsApp, later dan jouw laatste leesmoment in dit gesprek.',
  },
};
const KLAAR = {
  nadia: {
    id: 'a-nadia', who: PEOPLE.nadia, chan: 'e-mail', when: '8:40', tier: 'klaar',
    kind: 'ready', label: 'Antwoord staat klaar',
    line: 'Nadia bedankte voor het First Five gesprek. Een concept staat voor je klaar.',
    why: 'Maculis stelde een antwoord voor op basis van dit gesprek en de bevestigde afspraken. Jij houdt het laatste woord.',
  },
  fed: {
    id: 'a-fed', who: PEOPLE.fed, chan: 'e-mail', when: 'eergisteren', tier: 'klaar',
    kind: 'ready', label: 'Antwoord staat klaar',
    line: 'Federico vroeg naar de volgende stap. Een concept staat voor je klaar.',
    why: 'Voorstel op basis van zijn vraag en de open follow-up. Nog niet verzonden.',
  },
};

/* Reveals (evidence-grounded). Relationship reveal + hypothetical lens reveal. */
const REVEAL_RELATIONSHIP = {
  id: 'r-kim', who: PEOPLE.kim, tier: 'beweging',
  noticed: 'Er valt iets op', headline: 'Kim reageert anders dan eerst.',
  relto: 'Kim Deraedt · Fietsatelier Deraedt',
  why: 'Deze reveal verscheen omdat een gemeten patroon brak. Reactietijd en toon veranderden samen, over vijf berichten.',
  layers: [
    { prov: 'fact', tag: 'Feit', text: 'Haar antwoorden komen sinds drie weken later binnen.',
      evidence: 'Reactietijd liep van gemiddeld 4 uur naar gemiddeld 2 dagen, over de laatste vijf berichten.', conf: null },
    { prov: 'observation', tag: 'Observatie', text: 'De toon werd korter en zakelijker.',
      evidence: 'Waar eerdere berichten open eindigden, sluiten de laatste drie zonder vraag of vervolg.', conf: 0.72 },
    { prov: 'inference', tag: 'Gevolgtrekking', text: 'De verandering begon na jullie laatste gesprek.',
      evidence: 'De omslag valt samen met het gesprek van 21 juli over de planning. Dit is een samenval in tijd, geen bewezen oorzaak.', conf: 0.51 },
    { prov: 'suggestion', tag: 'Suggestie', text: 'Een korte, persoonlijke check zou nu passen.',
      evidence: 'Geen actie is ook goed. Maculis dringt niet aan. Dit is wat je zou kunnen doen, niet wat je moet doen.', conf: null },
  ],
  fixture: false,
};
const REVEAL_SAAR = {
  id: 'r-saar', who: PEOPLE.saar, tier: 'beweging',
  noticed: 'Er valt iets op', headline: 'Saar raakt langzaam uit beeld.',
  relto: 'Saar · Saar Keramiek',
  why: 'Een relatie die drie maanden actief was, viel stil. Niet ineens, geleidelijk.',
  layers: [
    { prov: 'fact', tag: 'Feit', text: 'Het laatste contact was zeven weken geleden.',
      evidence: 'Daarvoor was er gemiddeld elke tien dagen contact, drie maanden lang.', conf: null },
    { prov: 'observation', tag: 'Observatie', text: 'De stilte volgde op een onbeantwoorde vraag van haar.',
      evidence: 'Haar laatste bericht bevatte een vraag die zonder antwoord bleef.', conf: 0.68 },
    { prov: 'suggestion', tag: 'Suggestie', text: 'Een korte terugkoppeling zou de draad kunnen oppakken.',
      evidence: 'Alleen als het echt past. Stilte laten is ook een keuze.', conf: null },
  ],
  fixture: false,
};
const REVEAL_LENS = {
  id: 'r-lens', who: { name: 'Finance lens', org: 'hypothetisch voorbeeld' }, tier: 'beweging',
  noticed: 'Er valt iets op', headline: 'Je groeit. Je vrije ruimte niet.',
  relto: 'Finance lens · deze lens bestaat nog niet',
  why: 'Illustratie van hoe een toekomstige lens via Reveal zou landen. Nog geen echte intelligence.',
  layers: [
    { prov: 'fact', tag: 'Feit', text: 'Je omzet ligt dit kwartaal 7 procent hoger dan vorig kwartaal.',
      evidence: 'Voorbeeldcijfers. Deze lens bestaat nog niet in Maculis.', conf: null },
    { prov: 'observation', tag: 'Observatie', text: 'Je vrije tijd tussen afspraken werd juist krapper.',
      evidence: 'Voorbeeldobservatie op fictieve agendadata.', conf: 0.6 },
    { prov: 'inference', tag: 'Gevolgtrekking', text: 'Meer omzet komt hier uit meer uren, niet uit meer ruimte.',
      evidence: 'Illustratief. Zou pas een echte gevolgtrekking worden met echte, betrouwbare evidence.', conf: 0.44 },
  ],
  fixture: true,
};

/* The "stille meerderheid": many small movements grouped into one calm line. */
const QUIET_MOVEMENTS = [
  'Drie relaties openden je vorige mail opnieuw.',
  'Twee First Five links werden bekeken, nog niet gestart.',
  'Een organisatie kreeg een nieuwe contactpersoon.',
  'Vier gesprekken werden vanzelf rustig, klant is aan zet.',
  'Een oude relatie werd voor het eerst in maanden weer actief.',
];

/* Deep-work conversation: a long, realistic email and a long draft reply. */
const THREAD = {
  who: PEOPLE.jb, chan: 'e-mail', subject: 'Re: de tweede sessie en de planning van het najaar',
  messages: [
    { dir: 'in', who: 'Jean-Baptiste', when: 'maandag 09:14', body:
      'Beste Ludwig, allereerst dank voor het eerste gesprek, het heeft binnen ons team echt iets losgemaakt. We hebben er de dag erna nog lang over nagepraat, vooral over het onderdeel waar je vroeg wat we zouden doen als niemand ooit zou weten dat wij het waren. Dat bleef hangen. Nu de praktische kant. We willen graag door met een tweede sessie, maar ons najaar loopt vol met de verhuizing van de coöperatie en twee subsidietrajecten die tegelijk lopen. Zou de tweede sessie deze maand nog kunnen, of is het verstandiger om te wachten tot na de verhuizing zodat we er echt de rust voor hebben? Ik hoor het graag. Hartelijke groet, Jean-Baptiste' },
    { dir: 'out', who: 'Maculis · jij', when: 'maandag 09:41', body:
      'Dag Jean-Baptiste, wat fijn om te horen dat het is blijven hangen. Juist dat onderdeel is waar het vaak begint.' },
    { dir: 'in', who: 'Jean-Baptiste', when: 'woensdag 16:02', body:
      'Precies. Laat me het even intern aftoetsen en dan kom ik snel bij je terug op de planning.' },
  ],
  draft:
    'Dag Jean-Baptiste,\n\ndank voor je eerlijke afweging, en fijn dat het gesprek is blijven doorwerken bij het team.\n\nOver de planning: je hoeft niet te kiezen tussen snel en goed. Als de energie er nu is, kunnen we de tweede sessie deze maand nog doen, kort en gericht, zonder dat het bovenop de verhuizing komt. Wil je liever de volle rust, dan plannen we hem net na de verhuizing en houd ik tot die tijd de draad warm.\n\nIk heb twee momenten vrij: donderdag 26 in de ochtend, of dinsdag 1 in de namiddag. Zeg gerust wat past, dan bevestig ik.\n\nEn los van de planning: het onderdeel dat bleef hangen, daar kunnen we in de tweede sessie op doorgaan. Er zit meer onder.\n\nHartelijke groet,\nLudwig',
  facts: [
    { k: 'Persoon', v: 'Jean-Baptiste Vandenberghe' },
    { k: 'Organisatie', v: 'Coöperatie Noorderlicht Zorg en Welzijn' },
    { k: 'Kanaal', v: 'E-mail' },
    { k: 'First Five', v: 'Eerste sessie afgerond op 4 augustus' },
    { k: 'Toestemming', v: 'Gegeven, schriftelijk vastgelegd' },
  ],
  memory: 'Onthouden: het team praatte de dag na de eerste sessie lang na over de vraag "wat als niemand het ooit zou weten". Bevestigd door jou op 5 augustus.',
  journey: 'First Five · sessie 1 van 5 afgerond · tweede sessie in overleg',
  aperture: {
    noticed: 'Binnen dit gesprek valt iets op',
    text: 'Jean-Baptiste noemt twee keer tijdsdruk, maar vraagt niet om uitstel. Hij vraagt om een goede keuze.',
    prov: 'observation', tag: 'Observatie', conf: 0.64,
    evidence: 'Beide berichten noemen de verhuizing en de subsidietrajecten, en eindigen met een open vraag in plaats van een verzoek tot uitstel.',
  },
};

/* Conversations for Gesprekken (relationship is the unit, channel is metadata). */
const CONVERSATIONS = [
  { who: PEOPLE.jb, chan: 'e-mail', altChans: [], tier: 'nu', label: 'Wacht op jou', when: '2 dagen',
    snippet: 'Zou de tweede sessie deze maand nog kunnen, of is het verstandiger om te wachten tot na de verhuizing?' },
  { who: PEOPLE.bram, chan: 'whatsapp', altChans: ['e-mail'], tier: 'nu', label: 'Nieuw bericht', when: 'gisteren',
    snippet: 'Antwoordde op je vraag over de planning. Dit gesprek liep eerder via e-mail, nu via WhatsApp.' },
  { who: PEOPLE.nadia, chan: 'e-mail', altChans: [], tier: 'klaar', label: 'Antwoord staat klaar', when: '8:40',
    snippet: 'Bedankt voor het First Five gesprek. Ik bleef er nog even over nadenken.' },
  { who: PEOPLE.fed, chan: 'e-mail', altChans: ['sms'], tier: 'klaar', label: 'Antwoord staat klaar', when: 'eergisteren',
    snippet: 'Vroeg naar de volgende stap. Eerder contact liep ook via SMS.' },
  { who: PEOPLE.tom, chan: 'e-mail', altChans: ['telefoon'], tier: 'nu', label: 'Levering mislukt', when: 'zojuist',
    snippet: 'Je antwoord kwam niet aan, het adres bounced. Eerder was er telefonisch contact.' },
  { who: PEOPLE.lieselotte, chan: 'e-mail', altChans: [], tier: 'rust', label: 'Klant is aan zet', when: '4 dagen',
    snippet: 'Dank, ik neem het door met de partners en kom er bij je op terug.' },
  { who: PEOPLE.saar, chan: 'whatsapp', altChans: [], tier: 'rust', label: 'Rustig', when: '7 weken',
    snippet: 'Zou het lukken om er nog eens naar te kijken? (onbeantwoord)' },
];

/* ----- Scale fixtures: 520 relationships, deterministic, varied lengths ----- */
const FIRST = ['Kim', 'Bram', 'Nadia', 'Tom', 'Sanne', 'Joris', 'Lea', 'Milan', 'Fatima', 'Ruben', 'Iris', 'Daan', 'Yassine', 'Noor', 'Wout', 'Emma', 'Karel', 'Lotte', 'Jean-Baptiste', 'Federico', 'Lieselotte', 'Saar', 'Amber', 'Koen', 'Sofie', 'Niels', 'Eva', 'Jesse', 'Lieke', 'Anna-Maria'];
const LAST = ['Deraedt', 'Peeters', 'el Amrani', 'Vervoort', 'Janssen', 'De Vos', 'Vandenberghe', 'Gonçalves da Silva', 'Vandewalle', 'Hendrickx', 'Claes', 'Smit', 'Vermeulen', 'Aerts', 'Mertens', 'Wouters', 'De Smet', 'Jacobs', 'Goossens', ''];
const ORGS = ['Fietsatelier Deraedt', 'Studio Noord', 'Peeters Interim en Detachering', 'Coöperatie Noorderlicht Zorg en Welzijn', 'Vervoort Bouw', 'Advocatenkantoor Vandewalle en Partners', 'Saar Keramiek', 'Praktijk voor Loopbaan en Werk', 'zelfstandig, zonder organisatie', 'Brouwerij De Nachtwacht'];
const MOVE = [
  { cls: 'quiet', label: 'Rustig', w: 46 },
  { cls: 'quiet', label: 'Al een tijd stil', w: 22 },
  { cls: 'active', label: 'Actief gesprek', w: 18 },
  { cls: 'moving', label: 'Er beweegt iets', w: 8 },
  { cls: 'reveal', label: 'Reveal beschikbaar', w: 6 },
];
function pickWeighted(rnd, arr) {
  const total = arr.reduce((s, x) => s + x.w, 0);
  let r = rnd() * total;
  for (const x of arr) { if ((r -= x.w) < 0) return x; }
  return arr[0];
}
const HINTS = ['Laatste gesprek: 3 dagen geleden', 'First Five afgerond', 'Open follow-up', 'Onthouden: werkt liefst dinsdag', 'Nieuwe contactpersoon', 'Introductie via Pass the Lens', 'Geen open acties'];
function buildRelationships(n) {
  const rnd = mulberry32(20260815);
  const out = [];
  for (let i = 0; i < n; i++) {
    const fn = FIRST[Math.floor(rnd() * FIRST.length)];
    const ln = LAST[Math.floor(rnd() * LAST.length)];
    const name = (fn + ' ' + ln).trim();
    const org = ORGS[Math.floor(rnd() * ORGS.length)];
    const mv = pickWeighted(rnd, MOVE);
    const hint = HINTS[Math.floor(rnd() * HINTS.length)];
    out.push({ name, org, mv, hint, surfaced: mv.cls === 'moving' || mv.cls === 'reveal' });
  }
  return out;
}
const RELATIONSHIPS = buildRelationships(520);

/* Maculis-proposed segments (saved views) over the population. */
const SEGMENTS = [
  { key: 'beweegt', label: 'Er beweegt iets', desc: 'Recent veranderd, verdient een blik', test: r => r.surfaced },
  { key: 'actief', label: 'Actief gesprek', desc: 'Nu in gesprek', test: r => r.mv.cls === 'active' },
  { key: 'stil', label: 'Lang stil, was actief', desc: 'Dreigt uit beeld te raken', test: r => r.mv.label === 'Al een tijd stil' },
  { key: 'firstfive', label: 'First Five afgerond', desc: 'Klaar voor een vervolg', test: r => r.hint === 'First Five afgerond' },
  { key: 'alles', label: 'Alle relaties', desc: 'De volledige lijst blijft bereikbaar', test: () => true },
];

/* =====================================================================
   SHARED PIECES
   ===================================================================== */

function greeting() { return 'Goedemorgen'; }

function spaceBadge(space) {
  const b = el('div', 'space-badge');
  b.innerHTML = `<span class="d"></span>${space === 'work' ? 'Work space · om te werken' : 'Reveal space · om te zien'}`;
  return b;
}

function dayBar(active) {
  const bar = el('div', 'daybar');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Toon een dagsituatie');
  bar.innerHTML = `<span class="daybar-label">Dag</span>`;
  const opts = [['quiet', 'Rustig'], ['one', 'Eén ding'], ['normal', 'Normaal'], ['busy', 'Druk']];
  opts.forEach(([k, lbl]) => {
    const b = el('button', 'dayopt', esc(lbl));
    b.setAttribute('aria-pressed', String(k === active));
    b.addEventListener('click', () => { day = k; render(); });
    bar.appendChild(b);
  });
  return bar;
}

function greetBlock(sub) {
  const g = el('div', 'greet');
  g.innerHTML =
    `<div class="eyebrow">Vandaag · vrijdag 15 augustus</div>
     <h1>${greeting()}, Ludwig.</h1>
     <p class="sub">${esc(sub)}</p>`;
  return g;
}

function tierHead(cls, label, hint) {
  const h = el('div', 'attn-head');
  h.innerHTML =
    `<span class="tier ${cls}"><span class="pip"></span><b>${esc(label)}</b></span>
     ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}`;
  return h;
}

/* An attention item with: meaning, "waarom zie ik dit?", and the settle action. */
function attnItem(it, restContainer) {
  const b = el('article', 'item');
  b.setAttribute('tabindex', '0');
  b.innerHTML =
    `<div class="row1">
       <span class="who">${esc(it.who.name)}</span>
       <span class="chan">${esc(CHAN_ICO[it.chan] || '')} ${esc(it.chan)}</span>
       <span class="when">${esc(it.when)}</span>
     </div>
     <div class="line">${esc(it.line)}</div>
     <div class="tags">
       <span class="chip ${it.kind}"><span class="k"></span>${esc(it.label)}</span>
       <span class="chip">${esc(it.who.org)}</span>
     </div>
     <div class="itemfoot">
       <button class="why-btn" aria-expanded="false">Waarom zie ik dit?</button>
       <button class="settle-btn" title="Leg terug in rust">Afgehandeld</button>
     </div>
     <div class="why" hidden><span class="prov ${it.tier === 'klaar' ? 'suggestion' : 'observation'}">Provenance</span> ${esc(it.why)}</div>`;

  // signature interaction: "waarom zie ik dit?" reveals the provenance line
  const whyBtn = b.querySelector('.why-btn');
  const whyBox = b.querySelector('.why');
  whyBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = whyBox.hasAttribute('hidden');
    if (open) { whyBox.removeAttribute('hidden'); whyBtn.setAttribute('aria-expanded', 'true'); whyBtn.textContent = 'Verberg'; }
    else { whyBox.setAttribute('hidden', ''); whyBtn.setAttribute('aria-expanded', 'false'); whyBtn.textContent = 'Waarom zie ik dit?'; }
  });

  // signature interaction: "Terugval in rust" — a handled item settles, never vanishes
  b.querySelector('.settle-btn').addEventListener('click', e => {
    e.stopPropagation();
    settleToRest(b, it, restContainer);
  });
  return b;
}

function settleToRest(node, it, restContainer) {
  if (!restContainer) return;
  const settled = el('div', 'rest-item');
  settled.innerHTML = `<span class="rk"></span>${esc(it.who.name)} · <span class="muted">afgehandeld, zojuist</span>`;
  if (reduceMotion) {
    node.remove();
    revealRestArea(restContainer);
    restContainer.querySelector('.rest-list').prepend(settled);
    return;
  }
  node.classList.add('settling');
  node.addEventListener('transitionend', function done(ev) {
    if (ev.propertyName !== 'opacity') return;
    node.removeEventListener('transitionend', done);
    node.remove();
    revealRestArea(restContainer);
    settled.classList.add('landing');
    restContainer.querySelector('.rest-list').prepend(settled);
  });
}
function revealRestArea(c) { c.classList.remove('hidden'); }

/* =====================================================================
   VANDAAG — four states
   ===================================================================== */

function restArea(labelWhenEmpty) {
  const c = el('div', 'attn-group rest-area hidden');
  c.innerHTML =
    `<div class="attn-head"><span class="tier quiet"><span class="pip"></span><b>Rust</b></span>
       <span class="hint">afgehandeld, teruggevallen in rust</span></div>
     <div class="rest-list"></div>`;
  return c;
}

function quietTail(text) {
  const rest = el('div', 'attn-group');
  rest.appendChild(tierHead('quiet', 'Rust', 'de rest is stil'));
  const q = el('div', 'silence soft');
  q.innerHTML = `<p class="muted">${esc(text)}</p>`;
  rest.appendChild(q);
  return rest;
}

function viewVandaag() {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge('reveal'));

  if (day === 'quiet') {
    wrap.appendChild(greetBlock('Er is vanmorgen niets dat je aandacht vraagt.'));
    wrap.appendChild(dayBar('quiet'));
    const s = el('div', 'silence');
    s.innerHTML =
      `<div class="eye" aria-hidden="true">${eyeSvg()}</div>
       <h2>Je bent bij.</h2>
       <p>Voor nu hoeft er niets van je.</p>
       <div class="whisper">Maculis kijkt verder. Als er iets werkelijk toe doet, zie je het hier.</div>`;
    wrap.appendChild(s);
    return wrap;
  }

  if (day === 'one') {
    wrap.appendChild(greetBlock('Vandaag verdient één ding je aandacht.'));
    wrap.appendChild(dayBar('one'));
    const rest = restArea();
    const one = el('div', 'attn-group one-thing');
    one.appendChild(tierHead('now', 'Nu', 'het enige dat nu telt'));
    one.appendChild(attnItem(NU.waiting, rest));
    wrap.appendChild(one);
    wrap.appendChild(rest);
    wrap.appendChild(quietTail('Verder is alles rustig. 519 relaties, niets dat nu iets van je vraagt.'));
    return wrap;
  }

  if (day === 'busy') {
    wrap.appendChild(greetBlock('Er gebeurde veel vannacht. Maculis koos wat telt.'));
    wrap.appendChild(dayBar('busy'));
    const rest = restArea();

    const nu = el('div', 'attn-group');
    nu.appendChild(tierHead('now', 'Nu', 'drie dingen vragen jou'));
    [NU.delivery, NU.waiting, NU.unread].forEach(it => nu.appendChild(attnItem(it, rest)));
    wrap.appendChild(nu);

    const bw = el('div', 'attn-group');
    bw.appendChild(tierHead('beweging', 'Beweging', 'betekenisvol, geen directe actie'));
    bw.appendChild(revealTeaser(REVEAL_RELATIONSHIP));
    bw.appendChild(revealTeaser(REVEAL_SAAR));
    wrap.appendChild(bw);

    const kl = el('div', 'attn-group');
    kl.appendChild(tierHead('ready', 'Klaar', 'Maculis heeft iets voorbereid'));
    [KLAAR.nadia, KLAAR.fed].forEach(it => kl.appendChild(attnItem(it, rest)));
    wrap.appendChild(kl);

    // signature interaction 3: the quiet majority, grouped into one calm line
    wrap.appendChild(quietMajority());
    wrap.appendChild(rest);

    const foot = el('p', 'scale-note');
    foot.textContent = 'Zevenendertig gebeurtenissen vannacht. Zeven verdienden een plek. De rest bleef rustig, samengevat in één regel. Zo voorkomt Maculis dat drukte je dag bepaalt.';
    wrap.appendChild(foot);
    return wrap;
  }

  // normal day
  wrap.appendChild(greetBlock('Twee gesprekken vragen je aandacht. Eén antwoord staat klaar. Bij één relatie beweegt iets.'));
  wrap.appendChild(dayBar('normal'));
  const rest = restArea();

  const nu = el('div', 'attn-group');
  nu.appendChild(tierHead('now', 'Nu', 'vraagt jou'));
  [NU.waiting, NU.unread].forEach(it => nu.appendChild(attnItem(it, rest)));
  wrap.appendChild(nu);

  const bw = el('div', 'attn-group');
  bw.appendChild(tierHead('beweging', 'Beweging', 'betekenisvol, geen directe actie'));
  bw.appendChild(revealTeaser(REVEAL_RELATIONSHIP));
  wrap.appendChild(bw);

  const kl = el('div', 'attn-group');
  kl.appendChild(tierHead('ready', 'Klaar', 'Maculis heeft iets voorbereid'));
  kl.appendChild(attnItem(KLAAR.nadia, rest));
  wrap.appendChild(kl);

  wrap.appendChild(rest);
  wrap.appendChild(quietTail('De overige relaties zijn rustig. Ze blijven bereikbaar onder Relaties.'));
  return wrap;
}

function quietMajority() {
  const g = el('div', 'attn-group');
  const box = el('div', 'grouped');
  box.innerHTML =
    `<button class="grouped-head" aria-expanded="false">
       <span class="gk"></span>
       <span class="gt">Vierendertig kleine bewegingen vanochtend. Niets dat nu iets van je vraagt.</span>
       <span class="gopen" aria-hidden="true">Toon</span>
     </button>
     <div class="grouped-body" hidden></div>`;
  const body = box.querySelector('.grouped-body');
  QUIET_MOVEMENTS.forEach(m => body.appendChild(el('div', 'gline', esc(m))));
  body.appendChild(el('div', 'gline muted', 'En 29 vergelijkbare, samengevat gehouden.'));
  const btn = box.querySelector('.grouped-head');
  btn.addEventListener('click', () => {
    const open = body.hasAttribute('hidden');
    if (open) { body.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); btn.querySelector('.gopen').textContent = 'Verberg'; }
    else { body.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); btn.querySelector('.gopen').textContent = 'Toon'; }
  });
  g.appendChild(box);
  return g;
}

function eyeSvg() {
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>`;
}

/* A compact teaser for a reveal, sitting in the Beweging tier on Vandaag. */
function revealTeaser(data) {
  const t = el('button', 'reveal-teaser');
  t.innerHTML =
    `<span class="rt-noticed">${esc(data.noticed)}</span>
     <span class="rt-head">${esc(data.headline)}</span>
     <span class="rt-rel">${esc(data.relto)}</span>
     <span class="rt-go">Kijk <span class="arw" aria-hidden="true">→</span></span>`;
  t.addEventListener('click', () => { scn = 'reveal'; revealWhich = data.id; render(); });
  return t;
}

/* =====================================================================
   REVEAL — full flow
   ===================================================================== */

function revealBlock(data, opts = {}) {
  const r = el('section', 'reveal' + (opts.inset ? ' inset' : ''));
  r.setAttribute('aria-label', 'Reveal');
  r.innerHTML =
    `<div class="noticed">${esc(data.noticed)}</div>
     <h2>${esc(data.headline)}</h2>
     <div class="relto">${esc(data.relto)}</div>`;

  // "waarom zie ik dit?" — the trust mechanism, one line, on demand
  if (data.why) {
    const whyWrap = el('div', 'reveal-why');
    whyWrap.innerHTML =
      `<button class="why-btn ghost" aria-expanded="false">Waarom laat Maculis mij dit zien?</button>
       <div class="why" hidden>${esc(data.why)}</div>`;
    const wb = whyWrap.querySelector('.why-btn'), wx = whyWrap.querySelector('.why');
    wb.addEventListener('click', () => {
      const open = wx.hasAttribute('hidden');
      if (open) { wx.removeAttribute('hidden'); wb.setAttribute('aria-expanded', 'true'); wb.textContent = 'Verberg'; }
      else { wx.setAttribute('hidden', ''); wb.setAttribute('aria-expanded', 'false'); wb.textContent = 'Waarom laat Maculis mij dit zien?'; }
    });
    r.appendChild(whyWrap);
  }

  const expandAll = new URLSearchParams(location.search).get('expand') === '1';
  const layers = el('div', 'layers');
  data.layers.forEach((L, i) => {
    const d = el('div', 'layer' + (i === 0 || expandAll ? ' on' : ''));
    let conf = '';
    if (L.conf != null) {
      const pct = Math.round(L.conf * 100);
      conf = `<div class="conf">Zekerheid ${pct} procent</div>
              <div class="bar" role="img" aria-label="Zekerheid ${pct} procent"><i style="width:${pct}%"></i></div>`;
    }
    d.innerHTML =
      `<span class="prov ${L.prov}">${esc(L.tag)}</span>
       <p>${esc(L.text)}</p>
       <div class="evidence">${esc(L.evidence)}</div>${conf}`;
    layers.appendChild(d);
  });
  r.appendChild(layers);

  const btn = el('button', 'look-again');
  let shown = expandAll ? data.layers.length : 1;
  const total = data.layers.length;
  const label = () => shown < total
    ? `<span>Kijk nog eens.</span><span class="arw" aria-hidden="true">→</span>`
    : `<span>Je hebt alles gezien.</span>`;
  btn.innerHTML = label();
  btn.addEventListener('click', () => {
    if (shown >= total) return;
    const next = layers.children[shown];
    if (next) next.classList.add('on');
    shown++;
    btn.innerHTML = label();
    if (shown >= total) btn.setAttribute('disabled', '');
  });
  if (!opts.inset) r.appendChild(btn);

  if (data.fixture) {
    const f = el('div', 'fixture-note');
    f.textContent = 'Prototype data · deze lens bestaat nog niet';
    r.appendChild(f);
  }
  return r;
}

function currentReveal() {
  return { 'r-kim': REVEAL_RELATIONSHIP, 'r-saar': REVEAL_SAAR, 'r-lens': REVEAL_LENS }[revealWhich] || REVEAL_RELATIONSHIP;
}

function viewReveal() {
  const data = currentReveal();
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge('reveal'));

  // toggle between the two relationship reveals and the hypothetical lens
  const tog = el('div', 'reveal-switch');
  tog.setAttribute('role', 'group');
  tog.setAttribute('aria-label', 'Kies een reveal');
  [['r-kim', 'Kim verandert'], ['r-saar', 'Saar valt stil'], ['r-lens', 'Toekomstige lens']].forEach(([k, lbl]) => {
    const b = el('button', 'rsw', esc(lbl));
    b.setAttribute('aria-pressed', String(k === revealWhich));
    b.addEventListener('click', () => { revealWhich = k; render(); });
    tog.appendChild(b);
  });
  wrap.appendChild(tog);

  wrap.appendChild(revealBlock(data));

  const note = el('p', 'scale-note');
  note.textContent = 'Elke laag verschijnt pas als je verder kijkt. Feit, observatie, gevolgtrekking, suggestie. Onzekerheid en herkomst blijven zichtbaar. Een reveal zonder voldoende evidence bestaat niet.';
  wrap.appendChild(note);

  // silence as a first-class success state, shown alongside
  const sil = el('div', 'reveal-silence');
  sil.innerHTML =
    `<span class="prov fact">Stilte</span>
     <p>Is er niets dat de drempel haalt? Dan toont Vandaag geen reveal, maar rust. Liever niets dan een zwakke observatie.</p>`;
  wrap.appendChild(sil);
  return wrap;
}

/* =====================================================================
   RELATIES — scale with depth
   ===================================================================== */

function viewRelaties() {
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(spaceBadge('work'));

  const top = el('div', 'rel-top');
  top.innerHTML =
    `<h1>Relaties</h1><span class="n">${RELATIONSHIPS.length} in beeld</span>
     <span class="search"><span aria-hidden="true">⌕</span><input type="text" id="relsearch" placeholder="Zoek een persoon, organisatie, gesprek of onderwerp" aria-label="Zoeken"></span>`;
  wrap.appendChild(top);

  const lead = el('p', 'lead-note');
  lead.textContent = 'Met vijfhonderd relaties toont Maculis eerst wat beweegt en groepeert het de rest. De volledige lijst blijft één klik weg. Zo wordt het waardevoller, niet drukker.';
  wrap.appendChild(lead);

  // Maculis-proposed segments (saved views), each with a count
  const segs = el('div', 'segments');
  segs.setAttribute('role', 'group');
  segs.setAttribute('aria-label', 'Voorgestelde weergaven');
  SEGMENTS.forEach(s => {
    const count = RELATIONSHIPS.filter(s.test).length;
    const b = el('button', 'segment');
    b.setAttribute('aria-pressed', String(s.key === relSeg));
    b.innerHTML = `<span class="seg-l">${esc(s.label)}</span><span class="seg-d">${esc(s.desc)}</span><span class="seg-c">${count}</span>`;
    b.addEventListener('click', () => { relSeg = s.key; render(); });
    segs.appendChild(b);
  });
  wrap.appendChild(segs);

  const list = el('div', 'rel-list');
  wrap.appendChild(list);
  const foot = el('div', 'scale-note');
  wrap.appendChild(foot);

  const seg = SEGMENTS.find(s => s.key === relSeg) || SEGMENTS[0];
  let rows = RELATIONSHIPS.filter(seg.test);
  const cap = relSeg === 'alles' ? 40 : rows.length;
  const shown = rows.slice(0, cap);

  shown.forEach(r => {
    const row = el('article', 'rel' + (r.surfaced ? ' surfaced' : ''));
    row.tabIndex = 0;
    const revealBadge = r.mv.cls === 'reveal' ? `<span class="rev-badge">Reveal</span>` : '';
    row.innerHTML =
      `<span class="movement" aria-hidden="true"></span>
       <span class="av" aria-hidden="true">${esc(initials(r.name))}</span>
       <span class="nm">${esc(r.name)}<small>${esc(r.hint)}</small></span>
       <span class="org">${esc(r.org)}</span>
       <span class="state ${r.mv.cls}"><span class="k"></span>${esc(r.mv.label)} ${revealBadge}</span>
       <span class="act">
         <button title="Open relatie" aria-label="Open relatie ${esc(r.name)}">◇</button>
         <button title="Gesprek" aria-label="Open gesprek met ${esc(r.name)}">❯</button>
       </span>`;
    row.querySelector('.act').addEventListener('click', e => { e.stopPropagation(); scn = 'gesprekken'; render(); });
    row.addEventListener('click', () => { scn = 'gesprekken'; render(); });
    list.appendChild(row);
  });

  foot.textContent = relSeg === 'alles'
    ? `Eerste 40 van ${RELATIONSHIPS.length} getoond. Bij duizenden relaties is bladeren niet meer het startpunt. Zoeken, betekenis en voorgestelde weergaven wel.`
    : `${shown.length} van ${RELATIONSHIPS.length} relaties. Maculis koos deze op recent movement, niet op alfabet. De rest is rustig en blijft bereikbaar.`;
  return wrap;
}

/* =====================================================================
   GESPREKKEN — omnichannel, relationship is the unit
   ===================================================================== */

function viewGesprekken() {
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(spaceBadge('work'));

  const head = el('div', '');
  head.innerHTML =
    `<div class="eyebrow-line">Gesprekken · Work space</div>
     <h1 class="work-h1">Gesprekken</h1>
     <p class="lead-note">Een gesprek hoort bij een relatie, niet bij een kanaal. E-mail nu, WhatsApp, SMS en telefoon later. Het kanaal is context, geen apart product. Eén aandachtsmodel over alles.</p>`;
  wrap.appendChild(head);

  const tiers = [
    ['nu', 'Nu', 'vraagt jou'],
    ['klaar', 'Klaar', 'antwoord staat klaar'],
    ['rust', 'Rust', 'klant is aan zet of rustig'],
  ];
  tiers.forEach(([tk, tl, th]) => {
    const group = CONVERSATIONS.filter(c => c.tier === tk);
    if (!group.length) return;
    const g = el('div', 'attn-group');
    g.appendChild(tierHead(tk === 'nu' ? 'now' : tk === 'klaar' ? 'ready' : 'quiet', tl, th));
    group.forEach(c => g.appendChild(convRow(c)));
    wrap.appendChild(g);
  });
  return wrap;
}

function convRow(c) {
  const row = el('article', 'conv');
  row.tabIndex = 0;
  const alt = c.altChans.length
    ? `<span class="alt-chans">ook via ${c.altChans.map(x => `${CHAN_ICO[x] || ''} ${x}`).join(', ')}</span>` : '';
  row.innerHTML =
    `<span class="av" aria-hidden="true">${esc(initials(c.who.name))}</span>
     <div class="conv-main">
       <div class="conv-top">
         <span class="conv-who">${esc(c.who.name)}</span>
         <span class="conv-chan" title="${esc(c.chan)}">${esc(CHAN_ICO[c.chan] || '')} ${esc(c.chan)}</span>
         <span class="conv-when">${esc(c.when)}</span>
       </div>
       <div class="conv-org">${esc(c.who.org)}</div>
       <div class="conv-snip">${esc(c.snippet)}</div>
       <div class="conv-tags">
         <span class="chip ${c.tier === 'nu' ? 'now' : c.tier === 'klaar' ? 'ready' : ''}"><span class="k"></span>${esc(c.label)}</span>
         ${alt}
       </div>
     </div>`;
  row.addEventListener('click', () => { scn = 'work'; render(); });
  return row;
}

/* =====================================================================
   WORK — light room, long email, context, and a dark reveal aperture
   ===================================================================== */

function viewWork() {
  const wrap = el('div', 'view-enter wide');
  wrap.appendChild(spaceBadge('work'));

  const head = el('div', '');
  head.innerHTML =
    `<div class="eyebrow-line">Gesprek · Work space</div>
     <p class="lead-note">Hier werk je langer. Een lange mail, context erbij, rustig licht. De ruimte wisselde van donker naar licht toen je van kijken naar werken ging. Zelfde product, andere modus.</p>`;
  wrap.appendChild(head);

  const grid = el('div', 'work-grid');

  const thread = el('div', 'thread');
  let msgs = '';
  THREAD.messages.forEach(m => {
    msgs += `<div class="msg ${m.dir}"><div class="who">${esc(m.who)} · ${esc(m.when)}</div><div class="b">${esc(m.body)}</div></div>`;
  });
  thread.innerHTML =
    `<div class="th-head">
       <h2>${esc(THREAD.subject)}</h2>
       <div class="meta">${esc(THREAD.who.name)} · ${esc(THREAD.who.org)} · ${esc(CHAN_ICO[THREAD.chan])} ${esc(THREAD.chan)}</div>
     </div>
     <div class="msgs">${msgs}</div>
     <div class="composer">
       <textarea id="draft" aria-label="Antwoord" rows="10">${esc(THREAD.draft)}</textarea>
       <div class="bar">
         <span class="draftby">Maculis stelde dit voor. Jij houdt het laatste woord.</span>
         <button class="btn btn-ghost">Warmer</button>
         <button class="btn btn-ghost">Korter</button>
         <button class="btn btn-primary">Goedkeuren en verzenden</button>
       </div>
     </div>`;
  grid.appendChild(thread);

  const side = el('div', 'side-panel');

  // dark reveal aperture inside the light work space: seeing, inside working
  const ap = el('div', 'aperture');
  const a = THREAD.aperture;
  ap.innerHTML =
    `<div class="ap-noticed">${esc(a.noticed)}</div>
     <p class="ap-text">${esc(a.text)}</p>
     <button class="why-btn ghost" aria-expanded="false">Kijk nog eens.</button>
     <div class="ap-evidence" hidden>
       <span class="prov ${a.prov}">${esc(a.tag)} · zekerheid ${Math.round(a.conf * 100)} procent</span>
       <p>${esc(a.evidence)}</p>
     </div>`;
  const apBtn = ap.querySelector('.why-btn'), apEv = ap.querySelector('.ap-evidence');
  apBtn.addEventListener('click', () => {
    const open = apEv.hasAttribute('hidden');
    if (open) { apEv.removeAttribute('hidden'); apBtn.setAttribute('aria-expanded', 'true'); apBtn.textContent = 'Verberg'; }
    else { apEv.setAttribute('hidden', ''); apBtn.setAttribute('aria-expanded', 'false'); apBtn.textContent = 'Kijk nog eens.'; }
  });
  side.appendChild(ap);

  const facts = el('div', 'panel');
  let fx = '<h3>Relatie</h3>';
  THREAD.facts.forEach(f => { fx += `<div class="fact"><span class="k">${esc(f.k)}</span><span class="v">${esc(f.v)}</span></div>`; });
  facts.innerHTML = fx;
  side.appendChild(facts);

  const journey = el('div', 'panel');
  journey.innerHTML = `<h3>Journey</h3><div class="memory" style="border-color:var(--ok)">${esc(THREAD.journey)}</div>`;
  side.appendChild(journey);

  const mem = el('div', 'panel');
  mem.innerHTML = `<h3>Geheugen</h3><div class="memory">${esc(THREAD.memory)}</div>`;
  side.appendChild(mem);

  const note = el('div', 'panel');
  note.innerHTML = `<div class="muted" style="font-size:12px">Niets wordt automatisch verzonden. Jij houdt het laatste woord. Een menselijke wijziging blijft altijd behouden.</div>`;
  side.appendChild(note);

  grid.appendChild(side);
  wrap.appendChild(grid);
  return wrap;
}

/* =====================================================================
   PLACEHOLDERS
   ===================================================================== */

function viewPlaceholder(title, body, space) {
  const wrap = el('div', 'view-enter');
  wrap.appendChild(spaceBadge(space || 'reveal'));
  wrap.innerHTML +=
    `<div class="eyebrow-line">${esc(title)}</div>
     <h1 style="font-family:var(--serif);font-weight:600;font-size:var(--t-title);margin:8px 0 12px">${esc(title)}</h1>
     <p class="lead-note">${esc(body)}</p>`;
  return wrap;
}

/* =====================================================================
   ROUTER + STATE
   ===================================================================== */

let dir = 'C';
let scn = 'vandaag';
let day = 'normal';
let revealWhich = 'r-kim';
let relSeg = 'beweegt';

const NAV_TO_SCN = { vandaag: 'vandaag', relaties: 'relaties', gesprekken: 'gesprekken', lenzen: 'lenzen', journeys: 'journeys', groei: 'groei', beheer: 'beheer' };
const SPACE = { vandaag: 'reveal', reveal: 'reveal', lenzen: 'reveal', journeys: 'reveal', groei: 'reveal',
                relaties: 'work', gesprekken: 'work', work: 'work', beheer: 'work' };

function render() {
  shell.setAttribute('data-space', SPACE[scn] || 'reveal');
  view.innerHTML = '';
  let node;
  switch (scn) {
    case 'vandaag': node = viewVandaag(); break;
    case 'reveal': node = viewReveal(); break;
    case 'relaties': node = viewRelaties(); break;
    case 'gesprekken': node = viewGesprekken(); break;
    case 'work': node = viewWork(); break;
    case 'lenzen': node = viewPlaceholder('Lenzen', 'First Five en toekomstige lenzen. Een lens wordt hier geen tabblad met twintig metrics. Wat een lens ziet, landt in Vandaag, in de relatie, of als reveal.', 'reveal'); break;
    case 'journeys': node = viewPlaceholder('Journeys', 'First Five en toekomstige journeys. Uitnodigingen, voortgang, evaluaties. Testerbeheer leeft hier verder als operationele journey view.', 'reveal'); break;
    case 'groei': node = viewPlaceholder('Groei', 'GrowBrain verschijnt pas wanneer Maculis genoeg begrijpt om een diepere stap betekenisvol te maken. Geen upgrade knop. Een natuurlijke verdieping, wanneer er iets onder zit.', 'reveal'); break;
    default: node = viewPlaceholder('Beheer', 'Templates, imports, instellingen en operationele controls. Alles wat nodig is, buiten de dagelijkse aandacht gehouden.', 'work');
  }
  view.appendChild(node);

  // reflect nav + screen controls
  const navKey = scn === 'reveal' || scn === 'work' ? (scn === 'work' ? 'gesprekken' : 'vandaag') : scn;
  document.querySelectorAll('#nav a').forEach(a => {
    a.removeAttribute('aria-current');
    if (a.getAttribute('data-nav') === navKey) a.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-scn]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-scn') === scn)));
}

function setDir(d) {
  dir = d;
  shell.setAttribute('data-direction', d);
  document.querySelectorAll('[data-dir]').forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-dir') === d)));
}

/* wire controls */
document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', () => setDir(b.getAttribute('data-dir'))));
document.querySelectorAll('[data-scn]').forEach(b => b.addEventListener('click', () => { scn = b.getAttribute('data-scn'); render(); }));
document.querySelectorAll('#nav a').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  scn = NAV_TO_SCN[a.getAttribute('data-nav')] || 'vandaag';
  render();
}));

/* boot with deep-link support: ?dir=C&scn=vandaag&day=busy&rev=r-saar&seg=stil */
const params = new URLSearchParams(location.search);
const wantDir = (params.get('dir') || 'C').toUpperCase();
setDir(['A', 'C'].includes(wantDir) ? wantDir : 'C');
const wantScn = params.get('scn');
if (['vandaag', 'reveal', 'relaties', 'gesprekken', 'work', 'lenzen', 'journeys', 'groei', 'beheer'].includes(wantScn)) scn = wantScn;
const wantDay = params.get('day');
if (['quiet', 'one', 'normal', 'busy'].includes(wantDay)) day = wantDay;
const wantRev = params.get('rev');
if (['r-kim', 'r-saar', 'r-lens'].includes(wantRev)) revealWhich = wantRev;
const wantSeg = params.get('seg');
if (SEGMENTS.some(s => s.key === wantSeg)) relSeg = wantSeg;

/* nav counts: attention only, never a notification pile */
document.getElementById('nc-vandaag').textContent = '5';
document.getElementById('nc-gesprekken').textContent = '3';

render();
