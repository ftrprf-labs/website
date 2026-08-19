// Mijn Maculis channel provider.
//
// The only provider without a vendor. A message on this channel travels nowhere: it is stored in
// the same database the customer's own environment reads from, so persistence IS delivery. That is
// why mode is 'live' and there is nothing to configure. Reporting it as a mock would be dishonest
// in the other direction (§81): a mock is a channel that CANNOT deliver yet, and this one can.
//
// The provider deliberately does nothing in send(): sendOnChannel persists the message right after
// this returns, and that persistence is the whole transport. The customer is separately ANNOUNCED
// by e-mail, and that announcement is an ordinary consent-gated EMAIL send, not part of this
// channel.

const CAPS = {
  inbound: true, outbound: true, delivery_receipts: true, read_receipts: true,
  media: false, templates: false,
};

export function mijnMaculisProvider() {
  return {
    name: 'mijn-maculis', channel: 'MIJN_MACULIS', mode: 'live',
    capabilities() { return CAPS; },
    requiredConfig() { return []; },
    // Delivered, not merely sent: the message is in the store the customer reads from.
    async send() { return { ok: true, providerMessageId: null, delivery: 'DELIVERED' }; },
    normalizeInbound(payload = {}) {
      return { channel: 'MIJN_MACULIS', provider: 'mijn-maculis', providerMessageId: null,
        from: payload.from || null, to: payload.to || null, text: payload.text || '', media: [], at: payload.at };
    },
  };
}
