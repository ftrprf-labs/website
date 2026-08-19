// Deterministische fixtures voor de Mijn-Maculis-harness.
//
// Mijn Maculis praat met /api/mijn/*. Die routes vragen een Postgres en een geldige
// toegangsgrant. Voor visuele regressie en de audit is dat niet nodig en zelfs
// schadelijk: een database maakt de meting niet-deterministisch. Deze fixtures geven
// exact de vormen terug die server/mijn/insights.mjs en sharing.mjs opleveren, met
// vaste tijdstempels, zodat een verschil tussen twee runs alleen stijl kan zijn.
//
// De inhoud volgt server/mijn/seed.mjs, zodat de meting het echte epistemische bereik
// dekt: spanning, waarneming, consistentie, geen-verschil en een expliciet onbekend.

export const TOKEN = 'harness-mijn-maculis-0001';

const ID = (n) => `0000000${n}-0000-4000-8000-00000000000${n}`;

export const session = {
  organization: 'De Voorbeeld Groep',
  user: { label: 'Sanne de Vries', role: 'Klantadmin' },
  preview: true,
};

// Vaste tijdstempels. Nooit Date.now(): dat zou elke run een andere datum tonen.
const T = {
  a: '2026-08-12T09:12:00.000Z',
  b: '2026-08-05T14:03:00.000Z',
  c: '2026-07-29T10:41:00.000Z',
  d: '2026-07-22T08:55:00.000Z',
  e: '2026-07-15T16:20:00.000Z',
  f: '2026-07-08T11:05:00.000Z',
  due: '2026-09-22T13:00:00.000Z',
};

// Het vorige bezoek, vast gezet. Zonder dit zou "nieuw sinds je vorige bezoek" per run
// verschillen en was een visuele regressie niet te lezen. Alles ná dit moment is nieuw.
export const VORIG_BEZOEK = '2026-08-08T12:00:00.000Z';

export const insights = [
  {
    id: ID(1),
    title: 'Jullie positionering wordt intern niet overal hetzelfde ervaren',
    stance: 'tension', sharing: 'PRIVATE', attention: true, status: 'new',
    observation: 'Op de website staat een heldere belofte over wie jullie zijn. In de signalen die we teruglezen, klinkt die belofte niet overal even sterk door.',
    meaning: 'Dit kan erop wijzen dat het verhaal aan de buitenkant af is, maar intern nog niet door iedereen op dezelfde manier wordt gedragen. Dat is heel gewoon in een groeiende organisatie.',
    basis: 'We zien dit terug in de eerste Lens, op meerdere plekken in hoe jullie naar buiten en naar binnen over jezelf spreken.',
    not_yet_known: 'We weten nog niet of dit verschil bewust is, of dat het vooral een kwestie van taal en herhaling is. Daar hebben we jullie beeld bij nodig.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.c, updated_at: T.a, shared_at: null,
    developed: true, unshared_development: false, evidence_count: 7,
  },
  {
    id: ID(2),
    title: 'Positionering wordt extern duidelijker dan intern',
    stance: 'reveal', sharing: 'SHARED', attention: false, status: 'confirmed',
    observation: 'Naar buiten toe is het verhaal herkenbaar en helder. Naar binnen toe is dat nog niet overal het geval.',
    meaning: 'Het fundament staat. De winst zit in het intern net zo helder maken als het extern al is.',
    basis: 'Een terugkerend patroon in de eerste Lens tussen jullie externe en interne uitingen.',
    not_yet_known: 'Waar precies het verschil ontstaat, willen we samen met jullie scherper krijgen.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.d, updated_at: T.b, shared_at: T.c,
    developed: true, unshared_development: true, evidence_count: 5,
  },
  {
    id: ID(3),
    title: 'Sterke betrokkenheid bij klantgerichtheid',
    stance: 'consistency', sharing: 'PRIVATE', attention: false, status: 'confirmed',
    observation: 'Rond de klantbelofte zien we juist veel consistentie. Mensen zijn er zichtbaar trots op en voelen zich betrokken.',
    meaning: 'Dit is een sterke basis. Waar consistentie al bestaat, hoef je niets te repareren, alleen te koesteren en te benutten.',
    basis: 'We zien dit op meerdere plekken in de eerste Lens op dezelfde manier terugkomen.',
    not_yet_known: 'Of deze betrokkenheid overal even sterk is, of vooral bij bepaalde teams, is nog een open vraag.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.e, updated_at: T.c, shared_at: null,
    developed: false, unshared_development: false, evidence_count: 6,
  },
  {
    id: ID(4),
    title: 'Interne communicatie mist een consistente lijn',
    stance: 'reveal', sharing: 'PRIVATE', attention: false, status: 'new',
    observation: 'We zien verschillen in hoe hetzelfde verhaal intern wordt overgebracht, afhankelijk van waar en door wie.',
    meaning: 'Een consistente lijn maakt het voor mensen makkelijker om hetzelfde te vertellen en zich er ook echt achter te scharen.',
    basis: 'Terug te zien in de eerste Lens, in de variatie tussen verschillende interne uitingen.',
    not_yet_known: 'Of dit als storend wordt ervaren, of juist als ruimte, weten we nog niet.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.e, updated_at: T.d, shared_at: null,
    developed: false, unshared_development: false, evidence_count: 4,
  },
  {
    id: ID(5),
    title: 'Tussen jullie belofte en wat klanten ervaren zien we geen kloof',
    stance: 'non_reveal', sharing: 'PRIVATE', attention: false, status: 'confirmed',
    observation: 'We hebben bewust gezocht naar een verschil tussen wat jullie beloven en wat klanten lijken te ervaren. Dat verschil zien we hier niet.',
    meaning: 'Dat géén verschil zichtbaar is, is zelf een waardevol inzicht. Het betekent dat jullie belofte op dit punt klopt met de praktijk.',
    basis: 'We hebben hier in de eerste Lens gericht naar gekeken en geen spanning aangetroffen.',
    not_yet_known: 'Of dit zo blijft naarmate jullie groeien, is iets om in de gaten te houden.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.f, updated_at: T.e, shared_at: null,
    developed: false, unshared_development: false, evidence_count: 3,
  },
  {
    id: ID(6),
    title: 'Over jullie interne besluitvorming hebben we nog onvoldoende zicht',
    stance: 'unknown', sharing: 'PRIVATE', attention: false, status: 'new',
    observation: 'Hoe besluiten bij jullie tot stand komen, kunnen we vanaf de buitenkant nog niet goed zien.',
    meaning: 'Dit is geen tekort, maar een grens van wat één Lens van buitenaf kan waarnemen.',
    basis: 'De eerste Lens kijkt vooral naar wat zichtbaar is aan de buitenkant. Besluitvorming laat zich daar lastig uit aflezen.',
    not_yet_known: 'Vrijwel alles. Als jullie hier meer zicht op willen, is dit iets om samen te verkennen.',
    audience: 'ORGANISATIE',
    source: 'lens', created_at: T.f, updated_at: T.f, shared_at: null,
    developed: false, unshared_development: false, evidence_count: 1,
  },
];

export const collaborationItems = [
  {
    id: ID(7), kind: 'next_step', status: 'scheduled',
    title: 'Tweede sessie: verdieping op positionering',
    detail: 'Een vervolgsessie waarin we het beeld uit de eerste Lens samen aanscherpen.',
    due_at: T.due, created_at: T.d, updated_at: T.d,
  },
  {
    id: ID(8), kind: 'agreement', status: 'active',
    title: 'We onderzoeken samen hoe we jullie positionering intern sterker maken',
    detail: 'We spraken af om samen te kijken hoe jullie positionering intern net zo consistent kan gaan voelen als hij extern al is.',
    due_at: null, created_at: T.e, updated_at: T.e,
  },
  {
    id: ID(9), kind: 'research', status: 'in_progress',
    title: 'Positionering en merkverhaal',
    detail: 'We zijn in de analysefase. Zodra er een helder beeld ligt, delen we dat hier.',
    due_at: null, created_at: T.f, updated_at: T.f,
  },
];

export const overview = {
  attention: insights[0],
  recent: insights.slice(1, 4),
  insightCount: insights.length,
  collaboration: {
    upcomingAppointment: collaborationItems[0],
    research: collaborationItems[2],
    sharedCount: 1,
    lastSharedAt: T.c,
    nextStep: collaborationItems[0],
  },
};

// De ontwikkeling van één inzicht. Twee of meer momenten laten de tijdlijn verschijnen.
const DEV = {
  [ID(1)]: [
    { at: T.c, stanceLabel: 'Dit valt op', headline: 'Verschil tussen buiten en binnen', note: 'De eerste lezing: het externe verhaal is helder, intern klinkt het minder eenduidig.', current: false },
    { at: T.a, stanceLabel: 'Hier zit spanning', headline: 'Jullie positionering wordt intern niet overal hetzelfde ervaren', note: 'De lezing is scherper geworden. Wat eerst een observatie was, leest nu als spanning.', current: true },
  ],
  [ID(2)]: [
    { at: T.d, stanceLabel: 'Dit valt op', headline: 'Extern helderder dan intern', note: 'De eerste lezing van dit verschil.', current: false },
    { at: T.c, stanceLabel: 'Dit valt op', headline: 'Positionering wordt extern duidelijker dan intern', note: 'Bevestigd op een tweede plek in dezelfde Lens.', current: false },
    { at: T.b, stanceLabel: 'Dit valt op', headline: 'Positionering wordt extern duidelijker dan intern', note: 'De lezing is aangevuld met waar het verschil het sterkst zichtbaar is.', current: true },
  ],
};

// Het bewijs onder elk inzicht: precies zoveel waarnemingen als evidence_count belooft,
// want het licht mag nooit meer beweren dan de lijst kan tonen.
const BRON = {
  [ID(1)]: ['De pagina Over ons op jullie website', 'De klantcase over de gemeente',
    'Vacaturetekst voor accountmanager', 'Vacaturetekst voor projectleider',
    'Bericht van een teamlid op LinkedIn', 'Interne nieuwsbrief, editie mei',
    'Tweede bericht van een teamlid'],
  [ID(2)]: ['Homepage en dienstenpagina', 'Twee persberichten', 'Profiel op een brancheplatform',
    'Presentatie die publiek staat', 'Bericht van een teamlid, intern van toon'],
  [ID(3)]: ['Zes klantverhalen op de site', 'Reactie op een recensie',
    'Teampagina, hoe jullie het zelf zeggen', 'Nieuwsbericht over een geslaagd project',
    'Antwoord op een klantvraag, publiek', 'De belofte op de homepage'],
  [ID(4)]: ['Interne nieuwsbrief, editie maart', 'Interne nieuwsbrief, editie mei',
    'Twee vacatureteksten naast elkaar', 'Bericht van een teamlid'],
  [ID(5)]: ['Elf publieke reacties van klanten', 'De belofte op de homepage', 'Drie klantverhalen'],
  [ID(6)]: ['Eén zin in een jaarbericht'],
};
const MOMENT = [T.f, T.e, T.d, T.c, T.b, T.a, T.a];

export const evidence = (id) => (BRON[id] || []).map((label, k) => ({ label, at: MOMENT[k % MOMENT.length] }));

export const detail = (id, store = null) => {
  const insight = insights.find((i) => i.id === id);
  if (!insight) return null;
  return {
    insight: store ? store.metStand(insight) : insight,
    development: DEV[id] || [],
    evidence: evidence(id),
    conversation: store ? store.overInzicht(id) : null,
  };
};

// ---- de communicatielaag ----------------------------------------------------------------------
// Het gesprek is toestand: wat je zegt moet je daarna terugzien. Een vaste JSON-stub kan dat niet,
// dus de harness krijgt een klein geheugen dat zich precies zo gedraagt als server/mijn/gesprek.mjs:
// één draad per patroon, een eigen leeswatermerk, en de herkenning die het bezoek overleeft.
// Nog steeds volledig deterministisch: elke tijdstempel komt uit T, nooit uit de klok.
export function maakStore(startDraden = []) {
  let n = 0;
  const draden = startDraden.map((d) => ({ ...d, messages: d.messages.map((m) => ({ ...m })) }));
  const titel = (insightId) => {
    const i = insights.find((x) => x.id === insightId);
    return i ? i.title : 'Iets vertellen vanuit Mijn Maculis';
  };
  const uit = (d) => ({
    id: d.id, subject: d.subject, insight_id: d.insight_id,
    insight_title: d.insight_id ? titel(d.insight_id) : null,
    insight_sharing: d.insight_id ? (insights.find((x) => x.id === d.insight_id) || {}).sharing : null,
    last_message_at: d.last_message_at, unread: d.unread || 0,
    awaiting: !d.messages.some((m) => m.van === 'maculis'),
    messages: d.messages,
  });
  return {
    // wat de klant heeft gezegd, zodat een test kan controleren wat er werkelijk is verstuurd
    verstuurd: [],
    herkenningen: [],
    gedeeld: [],
    lijst() {
      return {
        items: draden.slice().reverse().map(uit),
        unread: draden.reduce((a, d) => a + (d.unread || 0), 0),
      };
    },
    open(id) {
      const d = draden.find((x) => x.id === id);
      if (!d) return null;
      d.unread = 0;
      return uit(d);
    },
    overInzicht(insightId) {
      const d = draden.find((x) => x.insight_id === insightId);
      return d ? uit(d) : null;
    },
    // Maculis antwoordt. Voor de test die moet aantonen dat een antwoord in dezelfde draad landt.
    antwoord(insightId, tekst) {
      const d = draden.find((x) => x.insight_id === insightId);
      if (!d) return null;
      d.messages.push({ id: 'a' + (++n), van: 'maculis', naam: 'Maculis', tekst, at: T.a });
      d.unread = (d.unread || 0) + 1;
      return uit(d);
    },
    stuur({ insightId = null, text, ...rest }) {
      // `rest` wordt bewust bewaard: zo kan een harness aantonen dat de klantzijde geen enkel
      // toestemmingsveld meer meestuurt, en niet alleen dat het vinkje van het scherm is.
      this.verstuurd.push({ insightId, text, extra: rest });
      let d = draden.find((x) => (x.insight_id || null) === (insightId || null));
      if (!d) {
        d = { id: 'draad-' + (++n), subject: titel(insightId), insight_id: insightId || null,
          last_message_at: T.a, unread: 0, messages: [] };
        draden.push(d);
      }
      d.messages.push({ id: 'm' + (++n), van: 'jij', naam: 'Sanne de Vries', tekst: text, at: T.a });
      return { ok: true, conversationId: d.id, conversation: uit(d) };
    },
    // De herkenning hoort bij dit geheugen en niet bij de gedeelde fixture. Anders zou de ene
    // meting de volgende beïnvloeden, en dan meet je je eigen vorige run.
    stand: {},
    metStand(i) {
      const h = this.stand[i.id];
      const d = this.deelstand[i.id];
      return {
        ...i,
        recognition: (h && h.answer) || null,
        recognition_note: (h && h.note) || null,
        ...(d || {}),
      };
    },
    // De deelstaat, per store en niet in de gedeelde fixture, om dezelfde reden als de herkenning.
    // Hiermee zijn alle vier de toestanden van het grensblok in één ronde te bereiken: niet
    // gedeeld, gedeeld, gedeeld met een nieuwere lezing, en niets vastgesteld.
    deelstand: {},
    deel(insightId, { update = false } = {}) {
      this.gedeeld.push({ insightId, update });
      this.deelstand[insightId] = { sharing: 'SHARED', unshared_development: false, shared_at: T.a };
      return { ok: true, sharing: 'SHARED', updated: update };
    },
    trekIn(insightId) {
      this.gedeeld.push({ insightId, revoke: true });
      this.deelstand[insightId] = { sharing: 'PRIVATE', unshared_development: false, shared_at: null };
      return { ok: true, sharing: 'PRIVATE' };
    },
    herkenning(insightId, { answer = null, note = null } = {}) {
      this.herkenningen.push({ insightId, answer, note });
      this.stand[insightId] = answer ? { answer, note: note || null } : null;
      return { ok: true, recognition: answer, recognition_note: answer ? note : null };
    },
  };
}

// Een gesprek dat er al is. Zo tonen de opnames en de audit niet alleen een leeg formulier maar
// ook een echte draad, met een antwoord van Maculis erin.
export const startDraden = [
  {
    id: 'draad-bestaand', subject: insights[1].title, insight_id: insights[1].id,
    last_message_at: T.b, unread: 1,
    messages: [
      { id: 'm1', van: 'jij', naam: 'Sanne de Vries', at: T.c,
        tekst: 'Waar baseren jullie dit precies op? Ik herken het wel, maar niet overal even sterk.' },
      { id: 'm2', van: 'maculis', naam: 'Maculis', at: T.b,
        tekst: 'Op vijf plekken in de eerste Lens, waarvan drie extern en twee intern. Ik loop ze in de volgende sessie met je door.' },
    ],
  },
];

// Eén routetabel voor de hele harness, zodat capture, audit, motion en de gesprekstest niet elk
// hun eigen versie van de werkelijkheid onderhouden.
export function routeMijn(page, store = null) {
  return page.route('**/api/mijn/**', async (r) => {
    const url = new URL(r.request().url());
    const p = url.pathname;
    const j = (b, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(b) });
    const body = () => { try { return JSON.parse(r.request().postData() || '{}'); } catch { return {}; } };
    const method = r.request().method();

    if (p === '/api/mijn/session') return j(session);
    if (p === '/api/mijn/overview') return j(overview);
    if (p === '/api/mijn/insights') return j({ insights: store ? insights.map((i) => store.metStand(i)) : insights });
    if (p === '/api/mijn/collaboration') return j({ items: collaborationItems });

    if (p === '/api/mijn/conversations' && method === 'GET') return j(store ? store.lijst() : { items: [], unread: 0 });
    if (p === '/api/mijn/conversations' && method === 'POST') {
      if (!store) return j({ ok: false }, 400);
      return j(store.stuur(body()));
    }
    const draad = p.match(/^\/api\/mijn\/conversations\/([^/]+)$/);
    if (draad && method === 'GET') {
      const d = store && store.open(draad[1]);
      return d ? j({ conversation: d }) : j({}, 404);
    }
    const herken = p.match(/^\/api\/mijn\/insights\/([^/]+)\/recognition$/);
    if (herken && method === 'POST') {
      return store ? j(store.herkenning(herken[1], body())) : j({ ok: true });
    }
    const deel = p.match(/^\/api\/mijn\/insights\/([^/]+)\/(share|revoke)$/);
    if (deel && method === 'POST') {
      if (!store) return j({ ok: true });
      const was = store.metStand(insights.find((x) => x.id === deel[1]) || {});
      const res = deel[2] === 'share'
        ? store.deel(deel[1], { update: Boolean(was.unshared_development) })
        : store.trekIn(deel[1]);
      return j({ ...res, ...detail(deel[1], store) });
    }
    const m = p.match(/^\/api\/mijn\/insights\/([^/]+)$/);
    if (m) { const d = detail(m[1], store); return d ? j(d) : j({}, 404); }
    return j({});
  });
}
