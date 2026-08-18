// Deterministische fixtures voor de visuele regressietest.
// Geen echte data, geen PII, geen database. Vaste tijdstempels, zodat elke render
// byte-voor-byte reproduceerbaar is en een pixeldiff alleen stijl kan betreffen.

const T = (iso) => iso; // vaste ISO-tijden, nooit Date.now()

export const CONTACT_ID = 'c-0000-fixture';

export const status = {
  enabled: true,
  ai: { available: false },
  channels: { EMAIL: { mode: 'live' }, WHATSAPP: { mode: 'mock' }, SMS: { mode: 'mock' } },
  sendable: ['EMAIL', 'WHATSAPP', 'SMS'],
};

export const relationship = {
  contact: {
    id: CONTACT_ID,
    first_name: 'Renske',
    last_name: 'Bouwmeester',
    email: 'renske@voorbeeldbureau.nl',
    mobile: '+31 6 12 34 56 78',
    role: 'Eigenaar',
    company_name: 'Voorbeeldbureau',
  },
  organization: { name: 'Voorbeeldbureau', primary_domain: 'voorbeeldbureau.nl' },
  stage: 'In gesprek',
  identities: [
    { channel: 'EMAIL', value: 'renske@voorbeeldbureau.nl' },
    { channel: 'WHATSAPP', value: '+31 6 12 34 56 78' },
  ],
  summary: {
    unread: 2,
    openConversations: 3,
    openFollowUps: 2,
    lastActivityAt: T('2026-08-14T09:24:00.000Z'),
    nextAction: { label: 'Antwoord staat klaar, nog te versturen' },
  },
  journey: { status: 'OPENED', campaign: 'MACULIS_FIRST_FIVE' },
  consent: {
    EMAIL: { allowed: true },
    WHATSAPP: { allowed: true },
    SMS: { allowed: false, reason: 'geen toestemming vastgelegd' },
  },
  memory: [
    { id: 'm1', kind: 'afspraak', confidence: 'confirmed', content: 'Belt liever dan mailt na 16:00.', valid_until: T('2026-12-31T00:00:00.000Z') },
    { id: 'm2', kind: 'feit', confidence: 'proposed', content: 'Overweegt een tweede vestiging in Deventer.' },
    { id: 'm3', kind: 'feit', confidence: 'confirmed', content: 'Werkt met een vast team van vier.' },
  ],
  conversations: [
    { id: 'cv1', subject: 'Je eerste blik op Voorbeeldbureau', channel: 'EMAIL', status: 'NEW', last_body: 'Dank je, dit raakt wel iets. Ik wil er graag verder over praten volgende week.' },
    { id: 'cv2', subject: 'Vraag over de evaluatie', channel: 'EMAIL', status: 'OPEN', last_body: 'Kort vraagje: hoe lang blijft de link geldig?' },
    { id: 'cv3', subject: 'Kennismaking', channel: 'WHATSAPP', status: 'OPEN', last_body: 'Top, tot dan.' },
  ],
  followUps: [
    { id: 'f1', title: 'Terugkoppeling na evaluatie', due_at: T('2026-08-20T00:00:00.000Z'), channel_hint: 'e-mail', overdue: false },
    { id: 'f2', title: 'Tweede blik inplannen', due_at: T('2026-08-10T00:00:00.000Z'), channel_hint: 'telefoon', overdue: true },
  ],
  activity: [
    { at: T('2026-08-14T09:24:00.000Z'), kind: 'inbound_email', label: 'Bericht ontvangen van Renske Bouwmeester' },
    { at: T('2026-08-12T14:02:00.000Z'), kind: 'outbound_email', label: 'Uitnodiging verstuurd' },
    { at: T('2026-08-11T11:40:00.000Z'), kind: 'journey', label: 'First Five geopend' },
  ],
};

export const conversation = {
  conversation: { id: 'cv1', subject: 'Je eerste blik op Voorbeeldbureau', channel: 'EMAIL' },
  consent: relationship.consent,
  messages: [
    { direction: 'OUTBOUND', channel: 'EMAIL', created_at: T('2026-08-12T14:02:00.000Z'), body_text: 'Ik heb naar jullie site gekeken. Er valt me iets op wat je zelf misschien niet meer ziet.', delivery: 'delivered' },
    { direction: 'INBOUND', channel: 'EMAIL', from_address: 'renske@voorbeeldbureau.nl', created_at: T('2026-08-14T09:24:00.000Z'), body_text: 'Dank je, dit raakt wel iets. Ik wil er graag verder over praten volgende week.' },
  ],
  ai_draft: { summary: 'Renske reageert positief en vraagt om een vervolggesprek volgende week.' },
};

export const suggestions = { suggestions: [
  { label: 'Stel een moment voor', why: 'Zij vraagt zelf om volgende week' },
  { label: 'Vat de eerste blik samen', why: 'Zij verwijst ernaar' },
] };

export const draft = {
  draft: { channel: 'EMAIL', body: 'Fijn dat het iets raakt. Zal ik dinsdagmiddag bellen, of past woensdag beter?', ai_generated: true, human_edited: false },
  chat: [],
};

export const followups = { followUps: relationship.followUps };

// ---- Testerbeheer / Attention Cockpit -------------------------------------------------
export const config = { authRequired: false, authed: true, campaign: 'MACULIS_FIRST_FIVE',
  org: 'FTRlabs', maculisPublicUrl: 'https://example.invalid', mailEnabled: true,
  commEnabled: true, intakeEnabled: false,
  statuses: ['DRAFT', 'INVITED', 'SENT', 'OPENED', 'COMPLETED', 'OPTED_OUT'],
  consentMethods: ['mondeling', 'schriftelijk', 'digitaal'] };

export const invitations = { invitations: [
  { id: 'i1', first_name: 'Renske', last_name: 'Bouwmeester', company_name: 'Voorbeeldbureau',
    email: 'renske@voorbeeldbureau.nl', mobile: '+31 6 12 34 56 78', status: 'OPENED', domain: 'voorbeeldbureau.nl',
    token: 'Aa1Bb2Cc3Dd4Ee5Ff6Gg7Hh', created_at: T('2026-08-11T09:00:00.000Z'),
    consent_method: 'mondeling', consent_status: 'OPTED_IN', consent_at: T('2026-08-11T08:55:00.000Z'), source: 'manual', introductions: [] },
  { id: 'i2', first_name: 'Joost', last_name: 'Veenstra', company_name: 'Veenstra Advies',
    email: 'joost@veenstra-advies.nl', mobile: '', status: 'SENT', domain: 'veenstra-advies.nl',
    token: 'Bb2Cc3Dd4Ee5Ff6Gg7Hh8Ii', created_at: T('2026-08-12T10:30:00.000Z'),
    consent_method: 'mondeling', consent_status: 'OPTED_IN', consent_at: T('2026-08-12T10:25:00.000Z'), source: 'manual', introductions: [] },
  { id: 'i3', first_name: 'Amira', last_name: 'Talhaoui', company_name: 'Talhaoui Interieur',
    email: 'amira@talhaoui.nl', mobile: '+31 6 98 76 54 32', status: 'COMPLETED',
    token: 'Cc3Dd4Ee5Ff6Gg7Hh8Ii9Jj', created_at: T('2026-08-09T08:15:00.000Z'),
    consent_method: 'mondeling', consent_status: 'OPTED_IN', consent_at: T('2026-08-09T08:10:00.000Z'), source: 'pass_the_lens',
    introductions: [{ by: 'Renske Bouwmeester', at: T('2026-08-09T08:10:00.000Z') }] },
  { id: 'i4', first_name: 'Pieter', last_name: 'de Waal', company_name: 'De Waal Bouw',
    email: 'pieter@dewaalbouw.nl', mobile: '', status: 'DRAFT',
    token: 'Dd4Ee5Ff6Gg7Hh8Ii9Jj0Kk', created_at: T('2026-08-13T14:45:00.000Z'),
    consent_method: 'mondeling', consent_status: 'UNKNOWN', source: 'manual', introductions: [] },
] };

// De cockpit: een duidelijke eerste stap plus een paar meer, precies zoals de UI hem toont.
export const attention = {
  summary: { actionable: 3, unread: 2,
    headline: { primary: 'Drie gesprekken vragen vandaag je aandacht.',
                secondary: 'Eén ervan wacht al het langst.' } },
  queue: [
    { id: 'cv1', state: 'REPLY_READY', who: 'Renske Bouwmeester', org: 'Voorbeeldbureau',
      channel: 'EMAIL', snippet: 'Dank je, dit raakt wel iets. Ik wil er graag verder over praten volgende week.',
      last_inbound_at: T('2026-08-14T09:24:00.000Z'), contact_id: 'c1' },
    { id: 'cv2', state: 'NEW', who: 'Joost Veenstra', org: 'Veenstra Advies',
      channel: 'EMAIL', snippet: 'Kort vraagje: hoe lang blijft de link geldig?',
      last_inbound_at: T('2026-08-14T08:02:00.000Z'), contact_id: 'c2' },
    { id: 'cv3', state: 'DELIVERY_PROBLEM', who: 'Pieter de Waal', org: 'De Waal Bouw',
      channel: 'EMAIL', snippet: 'Bericht kwam niet aan.',
      last_inbound_at: T('2026-08-13T16:40:00.000Z'), contact_id: 'c4' },
  ],
};

export const template = { template: { whatsapp: 'Hoi {first_name}, ...', email_subject: 'Maculis', email_body: '...' } };
export const evaluations = { participants: [], questions: [], summary: {} };

// ---- Inbox (comm.html) ----------------------------------------------------------------
export const inbox = {
  summary: { new: 1, waiting_on_us: 1, ai_ready: 1, unknown_contact: 1, delivery_problem: 1, follow_up_due: 2 },
  conversations: [
    { id: 'cv1', first_name: 'Renske', last_name: 'Bouwmeester', org: 'Voorbeeldbureau',
      email: 'renske@voorbeeldbureau.nl', channel: 'EMAIL', contact_id: 'c1',
      attention: ['ai_ready', 'waiting_on_us'],
      last_body: 'Dank je, dit raakt wel iets. Ik wil er graag verder over praten volgende week.' },
    { id: 'cv2', first_name: 'Joost', last_name: 'Veenstra', org: 'Veenstra Advies',
      email: 'joost@veenstra-advies.nl', channel: 'EMAIL', contact_id: 'c2',
      attention: ['new'],
      last_body: 'Kort vraagje: hoe lang blijft de link geldig?' },
    { id: 'cv3', first_name: '', last_name: '', org: '',
      email: 'onbekend@ergensanders.nl', channel: 'EMAIL', contact_id: null,
      attention: ['unknown_contact'],
      last_body: 'Ik kreeg dit doorgestuurd van een collega. Kunnen jullie ook naar ons kijken?' },
    { id: 'cv4', first_name: 'Pieter', last_name: 'de Waal', org: 'De Waal Bouw',
      email: 'pieter@dewaalbouw.nl', channel: 'EMAIL', contact_id: 'c4',
      attention: ['delivery_problem'],
      last_body: 'Bericht kwam niet aan.' },
    { id: 'cv5', first_name: 'Amira', last_name: 'Talhaoui', org: 'Talhaoui Interieur',
      email: 'amira@talhaoui.nl', channel: 'WHATSAPP', contact_id: 'c3',
      attention: ['waiting_on_contact'],
      last_body: 'Top, ik laat het weten.' },
  ],
};
