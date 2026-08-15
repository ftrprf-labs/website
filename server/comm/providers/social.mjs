// SOCIAL messaging channel provider (LinkedIn / Instagram / Facebook Messenger / …).
//
// Only ever via OFFICIAL platform APIs and permitted use (§17): NO scraping, NO browser bots, NO
// cookie/session abuse. Instagram & Messenger have official Cloud APIs (Meta); LinkedIn has NO
// general messaging API, so it is surfaced as a FUTURE capability / manual activity, never faked.
// All run as MOCK/architecture-ready until a platform is officially connected.

import { makeMockChannel } from './mock-channel.mjs';

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: false, read_receipts: false,
  media: true, templates: false, official_api_required: true,
};
const REQUIRED = [
  { key: 'META_APP_ID / META_APP_SECRET', where: 'Meta App', note: 'Instagram + Messenger Cloud API' },
  { key: 'META_PAGE_ACCESS_TOKEN', where: 'Meta Business', note: 'gekoppelde pagina/IG-account' },
  { key: 'LinkedIn', where: 'n.v.t.', note: 'geen officiële messaging-API — toekomstige capability / handmatige activiteit' },
];

export function socialProvider() {
  const base = makeMockChannel({ name: 'social-mock', channel: 'SOCIAL', caps: CAPS, required: REQUIRED });
  return { ...base, channel: 'SOCIAL' };
}
