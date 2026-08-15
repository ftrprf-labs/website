// WHATSAPP channel provider.
//
// Architecture-ready via the official WhatsApp Business Platform (Cloud API) route — NEVER browser
// automation or WhatsApp Web scraping (§14). Until a WhatsApp Business account + credentials are
// connected it runs as a full-contract MOCK so the internal chain is testable; requiredConfig()
// names exactly what a human must provision.

import { config } from '../../config.mjs';
import { makeMockChannel } from './mock-channel.mjs';
import { normalizeWhatsAppPayload } from './whatsapp-webhook.mjs';
import { postJsonWithRetry } from './http.mjs';

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: true, read_receipts: true,
  media: true, templates: true, session_window: true, opt_in_required: true,
};
const REQUIRED = [
  { key: 'WHATSAPP_PROVIDER', where: 'Render → Environment', note: "'cloud' (Meta WhatsApp Business Cloud API)" },
  { key: 'WHATSAPP_PHONE_NUMBER_ID', where: 'Meta Business → WhatsApp', note: 'zakelijk WhatsApp-nummer id' },
  { key: 'WHATSAPP_ACCESS_TOKEN', where: 'Meta Business → System user token', note: 'permanent access token' },
  { key: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', where: 'Meta App → Webhooks', note: 'inkomende berichten verifiëren' },
  { key: 'WHATSAPP_APP_SECRET', where: 'Meta App → Settings', note: 'webhook-handtekening verifiëren' },
];

export function whatsappProvider() {
  const live = config.whatsappProvider === 'cloud' && Boolean(config.whatsappToken && config.whatsappPhoneId);
  if (!live) return makeMockChannel({ name: 'whatsapp-mock', channel: 'WHATSAPP', caps: CAPS, required: REQUIRED });

  // LIVE adapter scaffold — Meta Cloud API. Kept minimal and non-executed until credentials exist.
  return {
    name: 'whatsapp-cloud', channel: 'WHATSAPP', mode: 'live',
    capabilities() { return CAPS; },
    requiredConfig() { return []; },
    async send({ to, text, template, mediaUrl, fetchImpl }) {
      if (!to) return { ok: false, reason: 'no_recipient' };
      const url = `https://graph.facebook.com/v21.0/${config.whatsappPhoneId}/messages`;
      const payload = template
        ? { messaging_product: 'whatsapp', to, type: 'template', template }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
      if (mediaUrl) { payload.type = 'image'; payload.image = { link: mediaUrl }; }
      // Timeout + bounded retry (429/5xx/network only; never a 4xx) so a transient blip does not
      // lose the message and a permanent error is not retried into a duplicate.
      const res = await postJsonWithRetry({
        url,
        headers: { Authorization: `Bearer ${config.whatsappToken}` },
        body: payload,
        ...(fetchImpl ? { fetchImpl } : {}),
      });
      if (!res.ok) return { ok: false, reason: `whatsapp_${res.error || res.status}`, attempts: res.attempts };
      const id = res.json && res.json.messages && res.json.messages[0] && res.json.messages[0].id;
      return { ok: true, providerMessageId: id || null, delivery: 'SENT', attempts: res.attempts };
    },
    // Single source of truth for Meta payload parsing: the shared normalizer (also used by the
    // signature-authed webhook). Returns the first message for the legacy single-message shape.
    normalizeInbound(payload = {}) {
      const { messages } = normalizeWhatsAppPayload(payload);
      return messages[0] || { channel: 'WHATSAPP', provider: 'whatsapp-cloud', providerMessageId: null, from: null, to: config.whatsappPhoneId, text: '', media: [], at: null };
    },
  };
}
