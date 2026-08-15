// TELEPHONY channel provider.
//
// Telephony is part of the SAME Relationship Workspace from the foundation (§16): a call is stored
// as a call_record + Activity so it appears on the unified timeline. Recording/transcription are
// EXPLICIT, off-by-default capabilities (privacy/telecom law) — never recorded automatically.
// Architecture-ready for an EU voice provider (e.g. Twilio/Voys); MOCK until connected.

import { config } from '../../config.mjs';

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: false, read_receipts: false,
  media: false, recording: false, transcription: false, ai_summary_after_call: true,
};
const REQUIRED = [
  { key: 'PHONE_PROVIDER', where: 'Render → Environment', note: "bv. 'twilio' of 'voys'" },
  { key: 'PHONE_API_KEY', where: 'Render → Environment', note: 'voice API-sleutel' },
  { key: 'PHONE_NUMBER', where: 'Provider → Numbers', note: 'zakelijk telefoonnummer (E.164)' },
  { key: 'PHONE_WEBHOOK_SECRET', where: 'Provider → Webhooks', note: 'call events verifiëren' },
];

export function phoneProvider() {
  const live = Boolean(config.phoneProvider && config.phoneApiKey);
  return {
    name: live ? `phone-${config.phoneProvider}` : 'phone-mock',
    channel: 'PHONE',
    mode: live ? 'live' : 'mock',
    capabilities() { return CAPS; },
    requiredConfig() { return live ? [] : REQUIRED; },
    // Placing a call is not "send a message"; it starts a call. In mock mode we return a synthetic
    // call id and let the caller drive status transitions (RINGING->ANSWERED/MISSED->COMPLETED).
    async startCall({ to, from }) {
      if (live) {
        // Live scaffold — provider REST call to originate. Not executed until credentials exist.
        return { ok: false, reason: 'live_not_wired' };
      }
      if (!to) return { ok: false, reason: 'no_recipient' };
      const salt = Buffer.from(`PHONE:${to}:${from || ''}`).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 10);
      return { ok: true, providerCallId: `mock-call-${salt}`, status: 'RINGING', mock: true };
    },
    normalizeCallEvent(payload = {}) {
      return {
        channel: 'PHONE', provider: live ? `phone-${config.phoneProvider}` : 'phone-mock',
        providerCallId: payload.CallSid || payload.call_id || payload.id,
        from: payload.From || payload.from, to: payload.To || payload.to,
        status: (payload.CallStatus || payload.status || '').toUpperCase(),
        duration: Number(payload.CallDuration || payload.duration || 0) || null,
      };
    },
  };
}
