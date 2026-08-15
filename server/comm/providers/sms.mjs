// SMS channel provider.
//
// Provider-neutral. Architecture-ready for an EU-friendly SMS provider (e.g. MessageBird/Bird or
// Twilio) with a normalised E.164 number, delivery receipts and STOP/opt-out handling (§15). Runs
// as a full-contract MOCK until credentials are connected.

import { config } from '../../config.mjs';
import { makeMockChannel } from './mock-channel.mjs';

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: true, read_receipts: false,
  media: false, templates: false, stop_keyword: true, cost_aware: true,
};
const REQUIRED = [
  { key: 'SMS_PROVIDER', where: 'Render → Environment', note: "bv. 'messagebird' of 'twilio'" },
  { key: 'SMS_API_KEY', where: 'Render → Environment', note: 'provider API-sleutel' },
  { key: 'SMS_ORIGINATOR', where: 'Render → Environment', note: 'afzendernaam of nummer (E.164)' },
  { key: 'SMS_WEBHOOK_SECRET', where: 'Provider → Webhooks', note: 'delivery/inbound verifiëren' },
];

export function smsProvider() {
  const live = Boolean(config.smsProvider && config.smsApiKey);
  if (!live) return makeMockChannel({ name: 'sms-mock', channel: 'SMS', caps: CAPS, required: REQUIRED });

  // LIVE adapter scaffold — generic HTTP SMS. Not executed until credentials exist.
  return {
    name: `sms-${config.smsProvider}`, channel: 'SMS', mode: 'live',
    capabilities() { return CAPS; },
    requiredConfig() { return []; },
    async send({ to, text }) {
      const res = await fetch(config.smsApiUrl || 'https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: { Authorization: `AccessKey ${config.smsApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ originator: config.smsOriginator, recipients: [to], body: text }),
      });
      if (!res.ok) return { ok: false, reason: `sms_${res.status}` };
      const body = await res.json().catch(() => ({}));
      return { ok: true, providerMessageId: body.id || null, delivery: 'SENT' };
    },
    normalizeInbound(payload = {}) {
      return { channel: 'SMS', provider: `sms-${config.smsProvider}`, providerMessageId: payload.id, from: payload.originator || payload.from, to: payload.recipient || payload.to, text: payload.body || '', media: [], at: payload.createdDatetime };
    },
  };
}
