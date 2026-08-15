// Shared deterministic MOCK channel adapter.
//
// Implements the full provider contract offline so the internal omnichannel chain (compose ->
// consent -> send -> persist -> delivery receipt -> timeline) is end-to-end testable WITHOUT any
// vendor credentials (§14/§15/§67). A mock send always "succeeds" and reports a synthetic provider
// message id; a caller can later simulate delivery/read receipts via the webhook route. When real
// credentials are added, the matching live adapter replaces this without touching the workspace.

export function makeMockChannel({ name, channel, caps, required }) {
  return {
    name,
    channel,
    mode: 'mock',
    capabilities() { return caps; },
    requiredConfig() { return required; },
    async send({ to }) {
      if (!to) return { ok: false, reason: 'no_recipient' };
      // Deterministic id (no Math.random) so tests are stable; salted by recipient + channel.
      const salt = Buffer.from(`${channel}:${to}`).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 10);
      return { ok: true, providerMessageId: `mock-${channel.toLowerCase()}-${salt}`, delivery: 'SENT', mock: true };
    },
    // Canonical inbound shape a live webhook would produce; used by the mock inbound simulator.
    normalizeInbound(payload = {}) {
      return {
        channel,
        provider: name,
        providerMessageId: payload.id || payload.message_id || null,
        from: payload.from || null,
        to: payload.to || null,
        text: payload.text || payload.body || '',
        media: payload.media || [],
        at: payload.at || null,
      };
    },
  };
}
