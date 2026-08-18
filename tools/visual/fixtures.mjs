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
