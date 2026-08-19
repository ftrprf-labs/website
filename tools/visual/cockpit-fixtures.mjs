// Deterministische fixtures voor de visuele nulmeting van de Maculis Cockpit.
//
// Geen database, geen login, geen echte data. De vormen volgen exact de contracten van
// server/cockpit/routes.mjs, zodat een verschil tussen twee runs alleen stijl kan zijn.
// Alle namen zijn verzonnen en alle tijdstempels staan vast.

const T = '2026-08-19T09:00:00.000Z';
const ID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const config = {
  commEnabled: true,
  authed: true,
  emailOnly: true,
  mailConfigured: true,
  agentsEnabled: true,
  slice: 'slice-5',
};

const werk = {
  id: ID(90),
  title: 'Mogelijke nieuwe relatie: Stichting Bergwater',
  needs: 'approval',
  origin: { kind: 'AGENT', label: 'Scout' },
  actions: ['view', 'approve', 'reject'],
  proposedRelation: { name: 'Stichting Bergwater', org: 'Stichting Bergwater' },
  proposal: { summary: 'Stichting Bergwater zoekt begeleiding bij een meerjarige koerswijziging.' },
  evidence: {
    demo: true,
    fitConfidence: 0.72,
    identityStatus: 'probable',
    observations: [
      { kind: 'FACT', text: 'Ingeschreven als stichting met een culturele doelstelling.', source: 'Handelsregister' },
      { kind: 'OBSERVATION', text: 'Op de eigen website staat een oproep voor een meerjarenplan.', source: 'bergwater.nl', url: 'https://voorbeeld.nl' },
      { kind: 'INFERENCE', text: 'De vraag lijkt op wat andere relaties in deze fase stelden.' },
      { kind: 'HYPOTHESIS', text: 'Mogelijk speelt een bestuurswissel mee.', uncertainties: ['naam kan een naamgenoot zijn'] },
    ],
  },
};

export const today = {
  // Vorm exact zoals radarHeadline() in server/cockpit/routes.mjs hem teruggeeft.
  headline: {
    primary: 'Twee relaties vragen nu iets van je.',
    secondary: 'Bij een derde staat een concept klaar.',
    zero: false,
  },
  counts: { nu: 2, klaar: 1, radar: 3 },
  quietThresholdDays: 45,
  source: 'radar',
  dataGaps: [],
  buckets: {
    NU: [
      {
        contactId: ID(1), conversationId: ID(11), who: 'Hanne Vermeulen', org: 'Vergezicht', channel: 'EMAIL',
        hasPrepared: false,
        primary: { reason: 'Hanne stelde een vraag en wacht sinds gisteren op antwoord.', needs: 'review', origin: { kind: 'HUMAN', label: 'Hanne' } },
        secondary: [{ reason: 'Eerder deze maand ging het gesprek over hetzelfde onderwerp.' }],
        followUps: [],
        work: [],
      },
      {
        contactId: ID(2), conversationId: null, who: 'Stichting Bergwater', org: 'Stichting Bergwater', channel: null,
        hasPrepared: false,
        primary: { reason: 'Scout vraagt jouw akkoord voor een nieuwe relatie.', needs: 'approval', origin: { kind: 'AGENT', label: 'Scout' } },
        secondary: [],
        followUps: [],
        work: [werk],
      },
    ],
    KLAAR: [
      {
        contactId: ID(3), conversationId: ID(13), who: 'Joris Aalders', org: 'De Kade', channel: 'EMAIL',
        hasPrepared: true,
        primary: { reason: 'Maculis zette een concept klaar op de vraag over de planning.', needs: 'review', origin: { kind: 'HUMAN', label: 'Maculis' } },
        secondary: [],
        followUps: [{ id: ID(41), title: 'Terugkoppeling planning' }],
        work: [],
      },
    ],
    RADAR: [
      {
        contactId: ID(4), conversationId: null, who: 'Marijke de Wilde', org: 'Noorderlicht', channel: null,
        hasPrepared: false,
        primary: { reason: 'Al negen weken stil, terwijl het laatste gesprek open eindigde.', needs: 'awareness', origin: { kind: 'HUMAN', label: 'Maculis' } },
        secondary: [], followUps: [], work: [],
      },
      {
        contactId: ID(5), conversationId: null, who: 'Sam Okonkwo', org: 'Veldwerk', channel: null,
        hasPrepared: false,
        primary: { reason: 'Doorliep de Lens en gaf toestemming om contact te houden.', needs: 'awareness', origin: { kind: 'HUMAN', label: 'Maculis' } },
        secondary: [], followUps: [], work: [],
      },
      {
        contactId: ID(6), conversationId: null, who: 'Fenna Bakker', org: null, channel: null,
        hasPrepared: false,
        primary: { reason: 'Nieuwe introductie via een bestaande relatie.', needs: 'awareness', origin: { kind: 'HUMAN', label: 'Maculis' } },
        secondary: [], followUps: [], work: [],
      },
    ],
  },
};

export const relations = {
  count: 6,
  query: '',
  relations: [
    { contactId: ID(1), name: 'Hanne Vermeulen', org: 'Vergezicht', email: 'hanne@voorbeeld.nl', stage: 'ACTIEF', openConversations: 1, lastActivity: T },
    { contactId: ID(3), name: 'Joris Aalders', org: 'De Kade', email: 'joris@voorbeeld.nl', stage: 'ACTIEF', openConversations: 1, lastActivity: T },
    { contactId: ID(4), name: 'Marijke de Wilde', org: 'Noorderlicht', email: 'marijke@voorbeeld.nl', stage: 'STIL', openConversations: 0, lastActivity: T },
    { contactId: ID(5), name: 'Sam Okonkwo', org: 'Veldwerk', email: 'sam@voorbeeld.nl', stage: 'NIEUW', openConversations: 0, lastActivity: T },
    { contactId: ID(6), name: 'Fenna Bakker', org: null, email: 'fenna@voorbeeld.nl', stage: 'NIEUW', openConversations: 0, lastActivity: T },
    { contactId: ID(7), name: 'Bram Haverkamp', org: 'Tussenland', email: 'bram@voorbeeld.nl', stage: 'ACTIEF', openConversations: 2, lastActivity: T },
  ],
};

export const conversations = {
  count: 4,
  conversations: [
    { conversationId: ID(11), contactId: ID(1), who: 'Hanne Vermeulen', org: 'Vergezicht', channel: 'EMAIL', subject: 'Vraag over de tweede ronde', status: 'OPEN', preview: 'Dank je voor het gesprek van vorige week. Ik zat nog met een vraag over de tweede ronde.', lastMessageAt: T, hasPrepared: false, waitingOnUs: true },
    { conversationId: ID(13), contactId: ID(3), who: 'Joris Aalders', org: 'De Kade', channel: 'EMAIL', subject: 'Planning najaar', status: 'OPEN', preview: 'Zouden we de planning voor het najaar kunnen aanscherpen?', lastMessageAt: T, hasPrepared: true, waitingOnUs: true },
    { conversationId: ID(14), contactId: ID(7), who: 'Bram Haverkamp', org: 'Tussenland', channel: 'EMAIL', subject: 'Terugkoppeling', status: 'WAITING', preview: 'Ik kom er volgende week op terug.', lastMessageAt: T, hasPrepared: false, waitingOnUs: false },
    { conversationId: ID(15), contactId: ID(5), who: 'Sam Okonkwo', org: 'Veldwerk', channel: 'EMAIL', subject: 'Kennismaking', status: 'CLOSED', preview: 'Fijn dat we elkaar spraken.', lastMessageAt: T, hasPrepared: false, waitingOnUs: false },
  ],
};

export const relation = {
  identity: { name: 'Hanne Vermeulen', role: 'Directeur', org: 'Vergezicht', stage: 'ACTIEF' },
  reachability: {
    email: { value: 'hanne@voorbeeld.nl' },
    phone: { value: '+31 6 00 00 00 00' },
    consent: { EMAIL: { allowed: true } },
  },
  attention: {
    bucket: 'NU',
    reason: 'Hanne stelde een vraag en wacht sinds gisteren op antwoord.',
    conversationId: ID(11),
    secondary: [{ reason: 'Eerder deze maand ging het gesprek over hetzelfde onderwerp.' }],
  },
  primaryConversationId: ID(11),
  conversations: [
    { id: ID(11), channel: 'EMAIL', subject: 'Vraag over de tweede ronde', status: 'OPEN', aiReady: true, unread: 1 },
    { id: ID(12), channel: 'EMAIL', subject: 'Kennismaking', status: 'CLOSED', aiReady: false, unread: 0 },
  ],
  observed: [
    { id: ID(21), kind: 'wens', content: 'Wil in het najaar een tweede ronde doen met een kleinere groep.', confidence: 'proposed' },
  ],
  remembered: [
    { id: ID(22), kind: 'context', content: 'Werkt sinds dit voorjaar met een nieuw bestuur.', confidence: 'confirmed' },
  ],
  followups: [
    { id: ID(41), title: 'Terugkoppeling planning', status: 'open', dueAt: T, overdue: false },
  ],
  work: [werk],
  lens: { participated: true, startedAt: T, completedAt: T, sharedCount: 1 },
};

export const conversation = {
  conversation: {
    id: ID(11), contactId: ID(1), who: 'Hanne Vermeulen', org: 'Vergezicht',
    channel: 'EMAIL', subject: 'Vraag over de tweede ronde', status: 'OPEN',
  },
  messages: [
    { id: ID(31), direction: 'INBOUND', channel: 'EMAIL', body_text: 'Dank je voor het gesprek van vorige week. Ik zat nog met een vraag over de tweede ronde: kunnen we die met een kleinere groep doen?', delivery: null },
    { id: ID(32), direction: 'OUTBOUND', channel: 'EMAIL', body_text: 'Goed dat je het vraagt. Ik kijk ernaar en kom er deze week op terug.', delivery: 'DELIVERED' },
  ],
  understanding: {
    summary: 'Hanne wil de tweede ronde kleiner houden en zoekt bevestiging dat dat kan.',
    intent: 'vraagt bevestiging',
  },
  assessment: { label: 'Bevestigen wat al besproken is', reason: 'De vraag is concreet en het antwoord ligt binnen wat eerder is afgesproken.' },
  proposal: { suggested_reply: 'Ja, een kleinere groep kan. Ik zet de opzet voor je op papier.' },
  workingDraft: null,
  consent: { EMAIL: { allowed: true } },
  nextMoves: [
    { type: 'follow_up_task', label: 'Follow-up over twee weken', executable: true, in_days: 14 },
    { type: 'mark_commercial_opportunity', label: 'Markeren als kans', executable: false },
  ],
};

export const invitations = { invitations: [], count: 0 };
