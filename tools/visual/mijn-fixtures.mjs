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
  a: '2027-03-02T09:12:00.000Z',
  b: '2027-02-24T14:03:00.000Z',
  c: '2027-02-17T10:41:00.000Z',
  d: '2027-02-10T08:55:00.000Z',
  e: '2027-02-03T16:20:00.000Z',
  f: '2027-01-27T11:05:00.000Z',
  due: '2027-04-20T13:00:00.000Z',
};

export const insights = [
  {
    id: ID(1),
    title: 'Jullie positionering wordt intern niet overal hetzelfde ervaren',
    stance: 'tension', sharing: 'PRIVATE', attention: true, status: 'new',
    observation: 'Op de website staat een heldere belofte over wie jullie zijn. In de signalen die we teruglezen, klinkt die belofte niet overal even sterk door.',
    meaning: 'Dit kan erop wijzen dat het verhaal aan de buitenkant af is, maar intern nog niet door iedereen op dezelfde manier wordt gedragen. Dat is heel gewoon in een groeiende organisatie.',
    basis: 'We zien dit terug in de eerste Lens, op meerdere plekken in hoe jullie naar buiten en naar binnen over jezelf spreken.',
    not_yet_known: 'We weten nog niet of dit verschil bewust is, of dat het vooral een kwestie van taal en herhaling is. Daar hebben we jullie beeld bij nodig.',
    source: 'lens', created_at: T.c, updated_at: T.a, shared_at: null,
    developed: true, unshared_development: false,
  },
  {
    id: ID(2),
    title: 'Positionering wordt extern duidelijker dan intern',
    stance: 'reveal', sharing: 'SHARED', attention: false, status: 'confirmed',
    observation: 'Naar buiten toe is het verhaal herkenbaar en helder. Naar binnen toe is dat nog niet overal het geval.',
    meaning: 'Het fundament staat. De winst zit in het intern net zo helder maken als het extern al is.',
    basis: 'Een terugkerend patroon in de eerste Lens tussen jullie externe en interne uitingen.',
    not_yet_known: 'Waar precies het verschil ontstaat, willen we samen met jullie scherper krijgen.',
    source: 'lens', created_at: T.d, updated_at: T.b, shared_at: T.c,
    developed: true, unshared_development: true,
  },
  {
    id: ID(3),
    title: 'Sterke betrokkenheid bij klantgerichtheid',
    stance: 'consistency', sharing: 'PRIVATE', attention: false, status: 'confirmed',
    observation: 'Rond de klantbelofte zien we juist veel consistentie. Mensen zijn er zichtbaar trots op en voelen zich betrokken.',
    meaning: 'Dit is een sterke basis. Waar consistentie al bestaat, hoef je niets te repareren, alleen te koesteren en te benutten.',
    basis: 'We zien dit op meerdere plekken in de eerste Lens op dezelfde manier terugkomen.',
    not_yet_known: 'Of deze betrokkenheid overal even sterk is, of vooral bij bepaalde teams, is nog een open vraag.',
    source: 'lens', created_at: T.e, updated_at: T.c, shared_at: null,
    developed: false, unshared_development: false,
  },
  {
    id: ID(4),
    title: 'Interne communicatie mist een consistente lijn',
    stance: 'reveal', sharing: 'PRIVATE', attention: false, status: 'new',
    observation: 'We zien verschillen in hoe hetzelfde verhaal intern wordt overgebracht, afhankelijk van waar en door wie.',
    meaning: 'Een consistente lijn maakt het voor mensen makkelijker om hetzelfde te vertellen en zich er ook echt achter te scharen.',
    basis: 'Terug te zien in de eerste Lens, in de variatie tussen verschillende interne uitingen.',
    not_yet_known: 'Of dit als storend wordt ervaren, of juist als ruimte, weten we nog niet.',
    source: 'lens', created_at: T.e, updated_at: T.d, shared_at: null,
    developed: false, unshared_development: false,
  },
  {
    id: ID(5),
    title: 'Tussen jullie belofte en wat klanten ervaren zien we geen kloof',
    stance: 'non_reveal', sharing: 'PRIVATE', attention: false, status: 'confirmed',
    observation: 'We hebben bewust gezocht naar een verschil tussen wat jullie beloven en wat klanten lijken te ervaren. Dat verschil zien we hier niet.',
    meaning: 'Dat géén verschil zichtbaar is, is zelf een waardevol inzicht. Het betekent dat jullie belofte op dit punt klopt met de praktijk.',
    basis: 'We hebben hier in de eerste Lens gericht naar gekeken en geen spanning aangetroffen.',
    not_yet_known: 'Of dit zo blijft naarmate jullie groeien, is iets om in de gaten te houden.',
    source: 'lens', created_at: T.f, updated_at: T.e, shared_at: null,
    developed: false, unshared_development: false,
  },
  {
    id: ID(6),
    title: 'Over jullie interne besluitvorming hebben we nog onvoldoende zicht',
    stance: 'unknown', sharing: 'PRIVATE', attention: false, status: 'new',
    observation: 'Hoe besluiten bij jullie tot stand komen, kunnen we vanaf de buitenkant nog niet goed zien.',
    meaning: 'Dit is geen tekort, maar een grens van wat één Lens van buitenaf kan waarnemen.',
    basis: 'De eerste Lens kijkt vooral naar wat zichtbaar is aan de buitenkant. Besluitvorming laat zich daar lastig uit aflezen.',
    not_yet_known: 'Vrijwel alles. Als jullie hier meer zicht op willen, is dit iets om samen te verkennen.',
    source: 'lens', created_at: T.f, updated_at: T.f, shared_at: null,
    developed: false, unshared_development: false,
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

export const detail = (id) => {
  const insight = insights.find((i) => i.id === id);
  if (!insight) return null;
  return { insight, development: DEV[id] || [] };
};
