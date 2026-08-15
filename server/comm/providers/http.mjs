// Shared outbound HTTP helper for channel adapters (WhatsApp Cloud API, SMS, ...).
//
// Real provider calls fail transiently: connection resets, 429 rate limits, 5xx blips. A naive
// single fetch turns those into lost messages. This helper adds three things every live adapter
// needs, uniformly:
//   - a request TIMEOUT (AbortController) so a hung provider never stalls the send path;
//   - BOUNDED exponential backoff retries with a deterministic (non-random) schedule;
//   - a strict RETRYABILITY policy that only retries when a retry is SAFE.
//
// Idempotency note: we retry a network error only when it happened BEFORE any response was seen
// (no request was acknowledged, so no duplicate can exist), and we retry 429/5xx (the provider
// explicitly signals "try again"). We NEVER retry a 2xx or a 4xx (a 4xx is a permanent client
// error; retrying cannot help and risks a duplicate). This keeps at-least-once delivery from
// becoming accidental double-send.

// Classify an HTTP status. 429 and 5xx are retryable; everything else is terminal.
export function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

// Deterministic backoff (ms) for attempt N (1-based): 200, 400, 800, ... capped. No jitter so
// tests are stable; the wait function is injectable so tests do not actually sleep.
export function backoffMs(attempt, base = 200, cap = 4000) {
  return Math.min(cap, base * 2 ** (attempt - 1));
}

const defaultWait = (ms) => new Promise((r) => setTimeout(r, ms));

// POST JSON with timeout + bounded retry. Returns a normalized result:
//   { ok, status, json, error, attempts }   (ok is true only on a 2xx response)
// `fetchImpl` and `wait` are injectable for offline tests. `retries` is the number of ADDITIONAL
// attempts after the first (so retries:2 means up to 3 attempts total).
export async function postJsonWithRetry({
  url, headers = {}, body, timeoutMs = 10000, retries = 2,
  fetchImpl = fetch, wait = defaultWait, base = 200,
}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, json, attempts: attempt };
      }
      // Non-2xx: retry only when the provider says so (429/5xx) and we have budget left.
      if (isRetryableStatus(res.status) && attempt <= retries) {
        await wait(backoffMs(attempt, base));
        lastError = `http_${res.status}`;
        continue;
      }
      const json = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, json, error: `http_${res.status}`, attempts: attempt };
    } catch (err) {
      clearTimeout(timer);
      // Connection error / abort BEFORE a response: no request was acknowledged, so a retry cannot
      // duplicate. Retry within budget; otherwise surface the error.
      lastError = err && err.name === 'AbortError' ? 'timeout' : 'network_error';
      if (attempt <= retries) { await wait(backoffMs(attempt, base)); continue; }
      return { ok: false, status: 0, error: lastError, attempts: attempt };
    }
  }
  return { ok: false, status: 0, error: lastError || 'exhausted', attempts: attempt };
}
