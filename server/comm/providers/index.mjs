// Communication Layer — channel provider abstraction (§18, §66).
//
// One neutral interface so the Relationship Workspace never talks to a vendor SDK directly and a
// provider can be swapped without rebuilding the workspace. Every channel adapter implements:
//
//   name            string           vendor/adapter name
//   channel         channel_kind     'EMAIL' | 'WHATSAPP' | 'SMS' | 'PHONE' | ...
//   mode            'live' | 'mock'  is a real provider connected (credentials present)?
//   capabilities()  -> { inbound, outbound, delivery_receipts, read_receipts, media, templates, ... }
//   requiredConfig()-> [ { key, where, note } ]   what a human must still set for LIVE (§65)
//   async send({ tenantId, from, to, subject, text, html, mediaUrl, template, threading }) ->
//                     { ok, providerMessageId, delivery, reason }
//   normalizeInbound(payload) -> canonical inbound shape (for webhooks)
//
// HONESTY (§81): a channel reports its true state. EMAIL is LIVE when Resend is configured;
// WHATSAPP/SMS/PHONE/SOCIAL run as fully-contracted MOCK adapters until a provider is connected,
// and requiredConfig() names exactly what is missing — no invented credentials.

import { emailProvider } from './email.mjs';
import { whatsappProvider } from './whatsapp.mjs';
import { smsProvider } from './sms.mjs';
import { phoneProvider } from './phone.mjs';
import { socialProvider } from './social.mjs';
import { mijnMaculisProvider } from './mijn-maculis.mjs';

const REGISTRY = {
  EMAIL: emailProvider,
  WHATSAPP: whatsappProvider,
  SMS: smsProvider,
  PHONE: phoneProvider,
  INSTAGRAM: socialProvider,
  FACEBOOK_MESSENGER: socialProvider,
  LINKEDIN: socialProvider,
  MIJN_MACULIS: mijnMaculisProvider,
};

// Channels that can carry an outbound message from the composer today (INTERNAL_NOTE is handled
// separately; JOURNEY/WEB are inbound/system only).
// MIJN_MACULIS is sendable because a customer who asked something inside their own environment
// must be able to be answered there. It is the only channel whose "delivery" is a database write.
export const SENDABLE_CHANNELS = ['EMAIL', 'WHATSAPP', 'SMS', 'MIJN_MACULIS'];

export function getChannelProvider(channel) {
  const factory = REGISTRY[channel];
  if (!factory) return null;
  return factory();
}

// A compact status board for the whole channel layer (used by the workspace + observability §48).
export function channelStatusBoard() {
  const out = {};
  for (const ch of Object.keys(REGISTRY)) {
    const p = getChannelProvider(ch);
    out[ch] = {
      provider: p.name,
      mode: p.mode,
      capabilities: p.capabilities(),
      requiredConfig: p.mode === 'live' ? [] : p.requiredConfig(),
    };
  }
  return out;
}
