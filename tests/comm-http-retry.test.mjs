// Offline unit tests for the shared outbound HTTP helper (providers/http.mjs). The retry policy is
// safety-critical: retry only when SAFE (network-before-response, 429, 5xx), never a 2xx or 4xx, so
// at-least-once delivery never becomes accidental double-send. fetch + wait are injected; no sleeps.

import test from 'node:test';
import assert from 'node:assert/strict';
import { postJsonWithRetry, isRetryableStatus, backoffMs } from '../server/comm/providers/http.mjs';

const noWait = async () => {};
function fakeRes(status, json = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => json };
}
// A fetch stub that returns/throws per a scripted sequence, recording how many times it was called.
function scriptedFetch(steps) {
  let i = 0;
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    const step = steps[Math.min(i, steps.length - 1)];
    i += 1;
    if (step instanceof Error) throw step;
    if (typeof step === 'function') return step();
    return step;
  };
  fn.count = () => i;
  fn.calls = calls;
  return fn;
}

test('retryability policy: 429 and 5xx retryable; 2xx/4xx not', () => {
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(500), true);
  assert.equal(isRetryableStatus(503), true);
  assert.equal(isRetryableStatus(200), false);
  assert.equal(isRetryableStatus(400), false);
  assert.equal(isRetryableStatus(404), false);
});

test('backoff is deterministic exponential and capped', () => {
  assert.equal(backoffMs(1, 200, 4000), 200);
  assert.equal(backoffMs(2, 200, 4000), 400);
  assert.equal(backoffMs(3, 200, 4000), 800);
  assert.equal(backoffMs(10, 200, 4000), 4000);
});

test('a 2xx on the first attempt returns ok with the parsed json (no retry)', async () => {
  const f = scriptedFetch([fakeRes(200, { messages: [{ id: 'wamid.1' }] })]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 1);
  assert.equal(res.json.messages[0].id, 'wamid.1');
  assert.equal(f.count(), 1);
});

test('a 4xx is terminal and is NEVER retried (avoids duplicate on a permanent error)', async () => {
  const f = scriptedFetch([fakeRes(400, { error: 'bad' })]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 3, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, false);
  assert.equal(res.status, 400);
  assert.equal(res.attempts, 1);
  assert.equal(f.count(), 1, 'no retry on 4xx');
});

test('a 5xx is retried and can then succeed', async () => {
  const f = scriptedFetch([fakeRes(503), fakeRes(200, { id: 'ok' })]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 2, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 2);
});

test('a 429 is retried and can then succeed', async () => {
  const f = scriptedFetch([fakeRes(429), fakeRes(429), fakeRes(200, { id: 'ok' })]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 2, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 3);
});

test('retries are BOUNDED; after the budget a 5xx surfaces as an error', async () => {
  const f = scriptedFetch([fakeRes(500)]); // always 500
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 2, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'http_500');
  assert.equal(res.attempts, 3, 'first + 2 retries');
  assert.equal(f.count(), 3);
});

test('a network error before any response is retried, then can succeed', async () => {
  const f = scriptedFetch([new Error('ECONNRESET'), fakeRes(200, { id: 'ok' })]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 2, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, true);
  assert.equal(res.attempts, 2);
});

test('an exhausted network error surfaces as network_error', async () => {
  const f = scriptedFetch([new Error('ECONNRESET')]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 1, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'network_error');
  assert.equal(res.attempts, 2);
});

test('an AbortError (timeout) is classified as timeout', async () => {
  const abort = new Error('aborted'); abort.name = 'AbortError';
  const f = scriptedFetch([abort]);
  const res = await postJsonWithRetry({ url: 'x', body: {}, retries: 0, fetchImpl: f, wait: noWait });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'timeout');
  assert.equal(res.attempts, 1);
});
