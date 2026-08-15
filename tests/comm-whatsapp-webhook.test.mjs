// Offline unit tests for the WhatsApp Cloud API inbound webhook: signature verification,
// GET verify-challenge, payload normalization, and the thin orchestrator (with injected pipeline
// stubs so NO database or provider account is needed). Security-critical paths first.

import test from 'node:test';
import assert from 'node:assert/strict';

// Configure the layer BEFORE importing modules that read config (config.mjs reads env at load).
process.env.NODE_ENV = 'test';
process.env.WHATSAPP_APP_SECRET = 'test_app_secret_value';
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify_token_123';

const { verifyMetaSignature, signMetaBody, verifyChallenge, normalizeWhatsAppPayload } =
  await import('../server/comm/providers/whatsapp-webhook.mjs');
const { processWhatsAppWebhook, handleWhatsAppChallenge } =
  await import('../server/comm/whatsapp-inbound.mjs');

const APP_SECRET = 'test_app_secret_value';

// ---- signature verification -----------------------------------------------------------------

test('valid Meta signature over the raw body verifies', () => {
  const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const header = signMetaBody({ appSecret: APP_SECRET, rawBody: raw });
  assert.equal(verifyMetaSignature({ appSecret: APP_SECRET, rawBody: raw, signatureHeader: header }).ok, true);
});

test('a tampered body fails signature verification', () => {
  const raw = JSON.stringify({ a: 1 });
  const header = signMetaBody({ appSecret: APP_SECRET, rawBody: raw });
  const res = verifyMetaSignature({ appSecret: APP_SECRET, rawBody: raw + ' ', signatureHeader: header });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'signature_mismatch');
});

test('a wrong app secret fails signature verification', () => {
  const raw = JSON.stringify({ a: 1 });
  const header = signMetaBody({ appSecret: 'other_secret', rawBody: raw });
  assert.equal(verifyMetaSignature({ appSecret: APP_SECRET, rawBody: raw, signatureHeader: header }).ok, false);
});

test('a missing signature header is rejected', () => {
  assert.equal(verifyMetaSignature({ appSecret: APP_SECRET, rawBody: '{}', signatureHeader: undefined }).reason, 'missing_signature');
});

test('a malformed signature header is rejected (no scheme / wrong scheme)', () => {
  assert.equal(verifyMetaSignature({ appSecret: APP_SECRET, rawBody: '{}', signatureHeader: 'deadbeef' }).reason, 'bad_signature_format');
  assert.equal(verifyMetaSignature({ appSecret: APP_SECRET, rawBody: '{}', signatureHeader: 'sha1=deadbeef' }).reason, 'bad_signature_format');
});

test('fail-closed: no app secret means no verification', () => {
  assert.equal(verifyMetaSignature({ appSecret: '', rawBody: '{}', signatureHeader: 'sha256=abc' }).reason, 'no_app_secret');
});

test('a non-hex signature of the right shape does not crash and fails safely', () => {
  const res = verifyMetaSignature({ appSecret: APP_SECRET, rawBody: '{}', signatureHeader: 'sha256=zzzz' });
  assert.equal(res.ok, false);
});

// ---- GET verify-challenge -------------------------------------------------------------------

test('challenge echoes on a token + subscribe-mode match', () => {
  const r = verifyChallenge({ mode: 'subscribe', token: 'verify_token_123', challenge: '42', expectedToken: 'verify_token_123' });
  assert.deepEqual(r, { ok: true, challenge: '42' });
});

test('challenge rejects a wrong token', () => {
  assert.equal(verifyChallenge({ mode: 'subscribe', token: 'nope', challenge: '42', expectedToken: 'verify_token_123' }).reason, 'token_mismatch');
});

test('challenge rejects a non-subscribe mode', () => {
  assert.equal(verifyChallenge({ mode: 'unsubscribe', token: 'verify_token_123', challenge: '42', expectedToken: 'verify_token_123' }).reason, 'bad_mode');
});

test('challenge is not_configured when no expected token is set', () => {
  assert.equal(verifyChallenge({ mode: 'subscribe', token: 'x', challenge: '1', expectedToken: '' }).reason, 'not_configured');
});

test('handleWhatsAppChallenge reads the configured verify token', () => {
  assert.equal(handleWhatsAppChallenge({ mode: 'subscribe', token: 'verify_token_123', challenge: 'ok' }).ok, true);
  assert.equal(handleWhatsAppChallenge({ mode: 'subscribe', token: 'wrong', challenge: 'ok' }).ok, false);
});

// ---- payload normalization ------------------------------------------------------------------

function waEnvelope(value) {
  return { object: 'whatsapp_business_account', entry: [{ id: 'WABA', changes: [{ field: 'messages', value }] }] };
}

test('normalizes a plain text message with sender profile name', () => {
  const p = waEnvelope({
    metadata: { phone_number_id: '111222' },
    contacts: [{ wa_id: '31612345678', profile: { name: 'Sam' } }],
    messages: [{ from: '31612345678', id: 'wamid.AAA', timestamp: '1700000000', type: 'text', text: { body: 'Hoi' } }],
  });
  const { messages, statuses } = normalizeWhatsAppPayload(p);
  assert.equal(statuses.length, 0);
  assert.equal(messages.length, 1);
  assert.deepEqual(
    { from: messages[0].from, to: messages[0].to, text: messages[0].text, id: messages[0].providerMessageId, name: messages[0].profileName },
    { from: '31612345678', to: '111222', text: 'Hoi', id: 'wamid.AAA', name: 'Sam' },
  );
});

test('normalizes an image message: caption as text, media referenced by id (never fetched)', () => {
  const p = waEnvelope({
    metadata: { phone_number_id: '111222' },
    messages: [{ from: '316', id: 'wamid.IMG', type: 'image', image: { id: 'MEDIA_1', mime_type: 'image/jpeg', caption: 'kijk' } }],
  });
  const { messages } = normalizeWhatsAppPayload(p);
  assert.equal(messages[0].text, 'kijk');
  assert.deepEqual(messages[0].media, [{ kind: 'image', mediaId: 'MEDIA_1', mimeType: 'image/jpeg', filename: null }]);
});

test('captures reply context so threading can relate a reply to the prior message', () => {
  const p = waEnvelope({ messages: [{ from: '316', id: 'wamid.R', type: 'text', text: { body: 'ja' }, context: { id: 'wamid.PARENT' } }] });
  assert.equal(normalizeWhatsAppPayload(p).messages[0].replyTo, 'wamid.PARENT');
});

test('interactive button reply surfaces the human-readable title as text', () => {
  const p = waEnvelope({ messages: [{ from: '316', id: 'wamid.B', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'yes', title: 'Ja graag' } } }] });
  assert.equal(normalizeWhatsAppPayload(p).messages[0].text, 'Ja graag');
});

test('maps delivery statuses (sent/delivered/read/failed) to the message vocabulary', () => {
  const mk = (status, extra = {}) => waEnvelope({ statuses: [{ id: 'wamid.OUT', status, recipient_id: '316', timestamp: '1700', ...extra }] });
  assert.equal(normalizeWhatsAppPayload(mk('sent')).statuses[0].state, 'SENT');
  assert.equal(normalizeWhatsAppPayload(mk('delivered')).statuses[0].state, 'DELIVERED');
  assert.equal(normalizeWhatsAppPayload(mk('read')).statuses[0].state, 'READ');
  const failed = normalizeWhatsAppPayload(mk('failed', { errors: [{ code: 131026, title: 'Message undeliverable' }] })).statuses[0];
  assert.equal(failed.state, 'FAILED');
  assert.equal(failed.errorReason, 'Message undeliverable');
});

test('handles multiple messages in one payload', () => {
  const p = waEnvelope({ messages: [
    { from: '31A', id: 'w1', type: 'text', text: { body: 'een' } },
    { from: '31B', id: 'w2', type: 'text', text: { body: 'twee' } },
  ] });
  assert.equal(normalizeWhatsAppPayload(p).messages.length, 2);
});

test('malformed / empty payloads never throw and yield empties', () => {
  for (const bad of [undefined, null, {}, { entry: null }, { entry: [{}] }, { entry: [{ changes: [{}] }] }, 'nonsense']) {
    const r = normalizeWhatsAppPayload(bad);
    assert.deepEqual({ m: r.messages.length, s: r.statuses.length }, { m: 0, s: 0 });
  }
});

// ---- orchestrator (injected pipeline stubs; no DB) ------------------------------------------

test('processWhatsAppWebhook rejects an invalid signature (fail-closed)', async () => {
  const raw = JSON.stringify(waEnvelope({ messages: [{ from: '316', id: 'x', type: 'text', text: { body: 'hi' } }] }));
  let received = 0;
  const res = await processWhatsAppWebhook({
    headers: { 'x-hub-signature-256': 'sha256=bad' }, rawBody: raw,
    receive: async () => { received += 1; return { ok: true }; },
    applyStatus: async () => ({ ok: true }), tenantId: 'T1',
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 401);
  assert.equal(received, 0, 'nothing is processed when the signature is invalid');
});

test('processWhatsAppWebhook routes messages and statuses through the shared pipeline', async () => {
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value: {
      metadata: { phone_number_id: '111' },
      messages: [{ from: '316', id: 'in1', type: 'text', text: { body: 'hallo' } }],
      statuses: [{ id: 'out1', status: 'delivered', recipient_id: '316', timestamp: '1700' }],
    } }] }],
  };
  const raw = JSON.stringify(payload);
  const header = signMetaBody({ appSecret: APP_SECRET, rawBody: raw });
  const receives = []; const applied = [];
  const res = await processWhatsAppWebhook({
    headers: { 'x-hub-signature-256': header }, rawBody: raw,
    receive: async (a) => { receives.push(a); return { ok: true }; },
    applyStatus: async (a) => { applied.push(a); return { ok: true }; },
    tenantId: 'T1',
  });
  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(receives.length, 1);
  assert.equal(receives[0].channel, 'WHATSAPP');
  assert.equal(receives[0].from, '316');
  assert.equal(receives[0].text, 'hallo');
  assert.equal(applied.length, 1);
  assert.equal(applied[0].state, 'DELIVERED');
  assert.equal(applied[0].providerMessageId, 'out1');
});

test('processWhatsAppWebhook counts a duplicate inbound as duplicate, not stored', async () => {
  const payload = waEnvelope({ metadata: { phone_number_id: '111' }, messages: [{ from: '316', id: 'dupe', type: 'text', text: { body: 'x' } }] });
  const raw = JSON.stringify(payload);
  const header = signMetaBody({ appSecret: APP_SECRET, rawBody: raw });
  const res = await processWhatsAppWebhook({
    headers: { 'x-hub-signature-256': header }, rawBody: raw,
    receive: async () => ({ ok: true, duplicate: true }),
    applyStatus: async () => ({ ok: true }), tenantId: 'T1',
  });
  assert.equal(res.messages, 0);
  assert.equal(res.duplicates, 1);
});

test('processWhatsAppWebhook ignores a non-WhatsApp object type', async () => {
  const raw = JSON.stringify({ object: 'page', entry: [] });
  const header = signMetaBody({ appSecret: APP_SECRET, rawBody: raw });
  const res = await processWhatsAppWebhook({
    headers: { 'x-hub-signature-256': header }, rawBody: raw,
    receive: async () => ({ ok: true }), applyStatus: async () => ({ ok: true }), tenantId: 'T1',
  });
  assert.equal(res.ignored, true);
});
