// WHATSAPP channel provider.
//
// Architecture-ready via the official WhatsApp Business Platform (Cloud API) route — NEVER browser
// automation or WhatsApp Web scraping (§14). Until a WhatsApp Business account + credentials are
// connected it runs as a full-contract MOCK so the internal chain is testable; requiredConfig()
// names exactly what a human must provision.

import { config } from '../../config.mjs';
import { makeMockChannel } from './mock-channel.mjs';

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
    async send({ to, text, template, mediaUrl }) {
      const url = `https://graph.facebook.com/v21.0/${config.whatsappPhoneId}/messages`;
      const payload = template
        ? { messaging_product: 'whatsapp', to, type: 'template', template }
        : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
      if (mediaUrl) { payload.type = 'image'; payload.image = { link: mediaUrl }; }
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.whatsappToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return { ok: false, reason: `whatsapp_${res.status}` };
      const body = await res.json().catch(() => ({}));
      const id = body.messages && body.messages[0] && body.messages[0].id;
      return { ok: true, providerMessageId: id || null, delivery: 'SENT' };
    },
    normalizeInbound(payload = {}) {
      // Meta webhook shape -> canonical inbound.
      const entry = payload.entry && payload.entry[0];
      const change = entry && entry.changes && entry.changes[0];
      const msg = change && change.value && change.value.messages && change.value.messages[0];
      return {
        channel: 'WHATSAPP', provider: 'whatsapp-cloud',
        providerMessageId: msg && msg.id, from: msg && msg.from, to: config.whatsappPhoneId,
        text: (msg && msg.text && msg.text.body) || '', media: [], at: msg && msg.timestamp,
      };
    },
  };
}
