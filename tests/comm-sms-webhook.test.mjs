// Offline unit tests for the SMS (Twilio) inbound webhook: X-Twilio-Signature verification,
// form parsing, inbound vs status classification, normalization, and the thin orchestrator with
// injected pipeline stubs (no Twilio account, no DB). Signature is the safety-critical path.

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.SMS_WEBHOOK_SECRET = 'twilio_auth_token_test';
process.env.SMS_PROVIDER = 'twilio';

const {
  parseForm, twilioSignatureBase, verifyTwilioSignature, signTwilioRequest,
  classifyTwilioForm, normalizeTwilioInbound, normalizeTwilioStatus,
} = await import('../server/comm/providers/sms-webhook.mjs');
const { processSmsWebhook } = await import('../server/comm/sms-inbound.mjs');

const TOKEN = 'twilio_auth_token_test';
const URL = 'https://www.maculis.nl/api/comm/inbound/sms';
const enc = (obj) => new URLSearchParams(obj).toString();

// ---- signature base + verification ----------------------------------------------------------

test('signature base is URL + params concatenated with keys sorted ascending', () => {
  const base = twilioSignatureBase('https://x/y', { b: '2', a: '1', c: '3' });
  assert.equal(base, 'https://x/ya1b2c3');
});

test('a correctly signed Twilio request verifies', () => {
  const params = { From: '+31612345678', To: '+3120', Body: 'Hoi', MessageSid: 'SM1' };
  const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
  assert.equal(verifyTwilioSignature({ authToken: TOKEN, url: URL, params, signatureHeader: sig }).ok, true);
});

test('a tampered param fails verification', () => {
  const params = { From: '+31612345678', Body: 'Hoi', MessageSid: 'SM1' };
  const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
  assert.equal(verifyTwilioSignature({ authToken: TOKEN, url: URL, params: { ...params, Body: 'Gewijzigd' }, signatureHeader: sig }).ok, false);
});

test('a different URL fails verification (URL is part of the signed string)', () => {
  const params = { Body: 'Hoi', MessageSid: 'SM1' };
  const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
  assert.equal(verifyTwilioSignature({ authToken: TOKEN, url: 'https://evil/hook', params, signatureHeader: sig }).ok, false);
});

test('fail-closed: no auth token and missing signature are rejected', () => {
  assert.equal(verifyTwilioSignature({ authToken: '', url: URL, params: {}, signatureHeader: 'x' }).reason, 'no_auth_token');
  assert.equal(verifyTwilioSignature({ authToken: TOKEN, url: URL, params: {}, signatureHeader: '' }).reason, 'missing_signature');
});

// ---- parsing + classification + normalization -----------------------------------------------

test('parseForm decodes an application/x-www-form-urlencoded body', () => {
  const p = parseForm('From=%2B31612345678&Body=Hoi+daar&MessageSid=SM1');
  assert.deepEqual(p, { From: '+31612345678', Body: 'Hoi daar', MessageSid: 'SM1' });
});

test('classifies inbound (Body present) vs status (MessageStatus, no Body)', () => {
  assert.equal(classifyTwilioForm({ Body: 'Hoi', MessageSid: 'SM1' }), 'inbound');
  assert.equal(classifyTwilioForm({ MessageStatus: 'delivered', MessageSid: 'SM1' }), 'status');
  assert.equal(classifyTwilioForm({ SmsStatus: 'sent', MessageSid: 'SM1' }), 'status');
  assert.equal(classifyTwilioForm({}), 'unknown');
});

test('normalizes an inbound SMS with media', () => {
  const m = normalizeTwilioInbound({ From: '+316', To: '+3120', Body: 'kijk', MessageSid: 'SM9', NumMedia: '1', MediaUrl0: 'https://api.twilio/img', MediaContentType0: 'image/jpeg' });
  assert.equal(m.channel, 'SMS');
  assert.equal(m.from, '+316');
  assert.equal(m.text, 'kijk');
  assert.equal(m.providerMessageId, 'SM9');
  assert.deepEqual(m.media, [{ kind: 'media', url: 'https://api.twilio/img', mimeType: 'image/jpeg' }]);
});

test('maps Twilio statuses to the delivery vocabulary', () => {
  assert.equal(normalizeTwilioStatus({ MessageSid: 'SM1', MessageStatus: 'sent' }).state, 'SENT');
  assert.equal(normalizeTwilioStatus({ MessageSid: 'SM1', MessageStatus: 'delivered' }).state, 'DELIVERED');
  assert.equal(normalizeTwilioStatus({ MessageSid: 'SM1', MessageStatus: 'undelivered', ErrorCode: '30003' }).state, 'FAILED');
  assert.equal(normalizeTwilioStatus({ MessageSid: 'SM1', MessageStatus: 'undelivered', ErrorCode: '30003' }).errorReason, 'twilio_30003');
  assert.equal(normalizeTwilioStatus({ MessageSid: 'SM1', MessageStatus: 'read' }).state, 'READ');
});

// ---- orchestrator (injected stubs; no DB) ---------------------------------------------------

test('processSmsWebhook rejects an invalid signature (fail-closed)', async () => {
  const body = enc({ From: '+316', Body: 'hi', MessageSid: 'SM1' });
  let received = 0;
  const res = await processSmsWebhook({
    url: URL, headers: { 'x-twilio-signature': 'wrong' }, rawBody: body,
    receive: async () => { received += 1; return { ok: true }; }, applyStatus: async () => ({ ok: true }),
    tenantId: 'T1', authToken: TOKEN,
  });
  assert.equal(res.ok, false);
  assert.equal(res.status, 403);
  assert.equal(received, 0);
});

test('processSmsWebhook routes an inbound message through the shared pipeline', async () => {
  const params = { From: '+31612345678', To: '+3120', Body: 'Hoi via SMS', MessageSid: 'SMIN' };
  const body = enc(params);
  const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
  const got = [];
  const res = await processSmsWebhook({
    url: URL, headers: { 'x-twilio-signature': sig }, rawBody: body,
    receive: async (a) => { got.push(a); return { ok: true }; }, applyStatus: async () => ({ ok: true }),
    tenantId: 'T1', authToken: TOKEN,
  });
  assert.equal(res.ok, true);
  assert.equal(res.messages, 1);
  assert.equal(got[0].channel, 'SMS');
  assert.equal(got[0].from, '+31612345678');
  assert.equal(got[0].text, 'Hoi via SMS');
});

test('processSmsWebhook routes a delivery-status callback to applyDeliveryStatus', async () => {
  const params = { MessageSid: 'SMOUT', MessageStatus: 'delivered' };
  const body = enc(params);
  const sig = signTwilioRequest({ authToken: TOKEN, url: URL, params });
  const applied = [];
  const res = await processSmsWebhook({
    url: URL, headers: { 'x-twilio-signature': sig }, rawBody: body,
    receive: async () => ({ ok: true }), applyStatus: async (a) => { applied.push(a); return { ok: true }; },
    tenantId: 'T1', authToken: TOKEN,
  });
  assert.equal(res.receipts, 1);
  assert.equal(applied[0].providerMessageId, 'SMOUT');
  assert.equal(applied[0].state, 'DELIVERED');
});
