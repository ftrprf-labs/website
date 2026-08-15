// SMS channel provider.
//
// Selected route: Twilio Programmable Messaging (one provider for SMS + Voice, strong EU support,
// stable webhook signing). Provider-neutral outbound so MessageBird/Bird stays a drop-in
// alternative. Normalised E.164 numbers, delivery receipts, STOP/opt-out handling (§15). Runs as a
// full-contract MOCK until credentials are connected; the live scaffold is not executed until then.

import { config } from '../../config.mjs';
import { makeMockChannel } from './mock-channel.mjs';
import { postJsonWithRetry, postFormWithRetry } from './http.mjs';
import { normalizeTwilioInbound } from './sms-webhook.mjs';

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: true, read_receipts: false,
  media: false, templates: false, stop_keyword: true, cost_aware: true,
};
const REQUIRED = [
  { key: 'SMS_PROVIDER', where: 'Render → Environment', note: "'twilio' (aanbevolen) of 'messagebird'" },
  { key: 'SMS_ACCOUNT_SID', where: 'Twilio Console', note: 'account SID (uitgaand, Twilio)' },
  { key: 'SMS_API_KEY', where: 'Twilio Console', note: 'auth token / API key (uitgaand)' },
  { key: 'SMS_ORIGINATOR', where: 'Render → Environment', note: 'afzendernummer (E.164) of Messaging Service SID' },
  { key: 'SMS_WEBHOOK_SECRET', where: 'Twilio Console', note: 'auth token om inkomende/status-webhooks te verifiëren' },
];

// Basic-auth header for Twilio (accountSid:authToken).
function basicAuth(user, pass) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

export function smsProvider() {
  const live = Boolean(config.smsProvider && config.smsApiKey);
  if (!live) return makeMockChannel({ name: 'sms-mock', channel: 'SMS', caps: CAPS, required: REQUIRED });

  const isTwilio = config.smsProvider === 'twilio';
  return {
    name: `sms-${config.smsProvider}`, channel: 'SMS', mode: 'live',
    capabilities() { return CAPS; },
    requiredConfig() { return []; },
    async send({ to, text, fetchImpl }) {
      if (!to) return { ok: false, reason: 'no_recipient' };
      const opt = fetchImpl ? { fetchImpl } : {};
      if (isTwilio) {
        // Twilio Messages API: form-encoded, basic auth (accountSid:authToken).
        const url = config.smsApiUrl || `https://api.twilio.com/2010-04-01/Accounts/${config.smsAccountSid}/Messages.json`;
        const res = await postFormWithRetry({
          url,
          headers: { Authorization: basicAuth(config.smsAccountSid, config.smsApiKey) },
          body: { To: to, From: config.smsOriginator, Body: text },
          ...opt,
        });
        if (!res.ok) return { ok: false, reason: `sms_${res.error || res.status}`, attempts: res.attempts };
        return { ok: true, providerMessageId: (res.json && res.json.sid) || null, delivery: 'SENT', attempts: res.attempts };
      }
      // MessageBird/Bird: JSON, AccessKey auth.
      const res = await postJsonWithRetry({
        url: config.smsApiUrl || 'https://rest.messagebird.com/messages',
        headers: { Authorization: `AccessKey ${config.smsApiKey}` },
        body: { originator: config.smsOriginator, recipients: [to], body: text },
        ...opt,
      });
      if (!res.ok) return { ok: false, reason: `sms_${res.error || res.status}`, attempts: res.attempts };
      return { ok: true, providerMessageId: (res.json && res.json.id) || null, delivery: 'SENT', attempts: res.attempts };
    },
    // Twilio inbound is form-encoded; the signed webhook parses + normalizes it. This keeps the
    // adapter contract complete for the (non-Twilio) simulator path too.
    normalizeInbound(payload = {}) {
      if (isTwilio) return normalizeTwilioInbound(payload);
      return { channel: 'SMS', provider: `sms-${config.smsProvider}`, providerMessageId: payload.id, from: payload.originator || payload.from, to: payload.recipient || payload.to, text: payload.body || '', media: [], at: payload.createdDatetime };
    },
  };
}
