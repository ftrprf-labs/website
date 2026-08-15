// Offline unit tests for PII-safe observability (server/comm/obs.mjs). The whole point is that a log
// line can NEVER carry personal data or content, even if a caller passes it by mistake. These tests
// assert that guarantee against realistic PII inputs, plus the stage/failure-class taxonomy.

import test from 'node:test';
import assert from 'node:assert/strict';
import { format, redactValue, classifyError, STAGE, FAILURE_CLASS } from '../server/comm/obs.mjs';

test('an e-mail address is never emitted', () => {
  const line = format('comm/inbound', 'stored', { email: 'kim@oca.nl', reason: 'ok' });
  assert.ok(!line.includes('kim@oca.nl'), 'email redacted');
  assert.ok(line.includes('reason=ok'));
});

test('a phone number is never emitted', () => {
  const line = format('comm/whatsapp', 'processed', { from: '+31612345678', messages: 1 });
  assert.ok(!line.includes('31612345678'), 'phone redacted');
  assert.ok(line.includes('messages=1'));
});

test('a name or subject is redacted by key even if it looks innocuous', () => {
  const line = format('comm/inbound', 'stored', { name: 'Kim de Vries', subject: 'Vraag over planning' });
  assert.ok(!line.includes('Kim de Vries'));
  assert.ok(!line.includes('Vraag over planning'));
  assert.ok(line.includes('name=[redacted:key]'));
  assert.ok(line.includes('subject=[redacted:key]'));
});

test('free-form long content is redacted by length', () => {
  const body = 'x'.repeat(200);
  assert.equal(redactValue(body), '[redacted:len]');
});

test('a bare e-mail / phone value is redacted regardless of key', () => {
  assert.equal(redactValue('someone@example.com'), '[redacted:pii]');
  assert.equal(redactValue('0612345678'), '[redacted:pii]');
});

test('safe operational values pass through unchanged', () => {
  const line = format('comm/outbound', 'sent', { channel: 'WHATSAPP', mode: 'mock', delivery: 'SENT', attempts: 2, contact_matched: true });
  assert.ok(line.includes('channel=WHATSAPP'));
  assert.ok(line.includes('mode=mock'));
  assert.ok(line.includes('delivery=SENT'));
  assert.ok(line.includes('attempts=2'));
  assert.ok(line.includes('contact_matched=true'));
});

test('a UUID conversation id is not mistaken for PII', () => {
  const id = 'c726cad5-08c1-4a97-bf2d-fa7e0b0f7816';
  const line = format('comm/inbound', 'stored', { conversation: id });
  assert.ok(line.includes(`conversation=${id}`), 'UUID preserved for correlation');
});

test('undefined fields are omitted', () => {
  const line = format('comm/sms', 'processed', { kind: 'inbound', reason: undefined });
  assert.ok(!line.includes('reason'));
  assert.ok(line.includes('kind=inbound'));
});

test('stage + failure-class vocabularies are stable enums', () => {
  assert.equal(STAGE.WEBHOOK, 'webhook');
  assert.equal(STAGE.DELIVERY, 'delivery');
  assert.equal(STAGE.CONSENT, 'consent');
  assert.equal(FAILURE_CLASS.TIMEOUT, 'timeout');
});

test('classifyError maps by name/code only (never the message)', () => {
  const abort = new Error('boom'); abort.name = 'AbortError';
  assert.equal(classifyError(abort), FAILURE_CLASS.TIMEOUT);
  const conn = new Error('down'); conn.code = 'ECONNRESET';
  assert.equal(classifyError(conn), FAILURE_CLASS.DEPENDENCY);
  const pg = new Error('dup'); pg.code = '23505';
  assert.equal(classifyError(pg), FAILURE_CLASS.DATABASE);
  assert.equal(classifyError(null), FAILURE_CLASS.UNKNOWN);
});
