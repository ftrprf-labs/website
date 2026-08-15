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

// Core retry loop. `body` is an already-encoded string; `headers` are complete. Returns a
// normalized result { ok, status, json, error, attempts } (json is the parsed 2xx/non-2xx body).
async function runWithRetry({
  url, headers = {}, body, timeoutMs = 10000, retries = 2,
  fetchImpl = fetch, wait = defaultWait, base = 200,
}) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { method: 'POST', headers, body, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, json, attempts: attempt };
      }
      if (isRetryableStatus(res.status) && attempt <= retries) {
        await wait(backoffMs(attempt, base));
        lastError = `http_${res.status}`;
        continue;
      }
      const json = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, json, error: `http_${res.status}`, attempts: attempt };
    } catch (err) {
      clearTimeout(timer);
      lastError = err && err.name === 'AbortError' ? 'timeout' : 'network_error';
      if (attempt <= retries) { await wait(backoffMs(attempt, base)); continue; }
      return { ok: false, status: 0, error: lastError, attempts: attempt };
    }
  }
  return { ok: false, status: 0, error: lastError || 'exhausted', attempts: attempt };
}

// POST a JSON body (Content-Type: application/json). `retries` is the number of ADDITIONAL attempts
// after the first (retries:2 => up to 3 attempts total).
export async function postJsonWithRetry({ url, headers = {}, body, ...rest }) {
  return runWithRetry({
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...rest,
  });
}

// POST an application/x-www-form-urlencoded body (Twilio and similar providers). `body` may be an
// object (encoded here) or a pre-encoded string.
export function encodeForm(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj || {})) {
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else if (v != null) p.append(k, String(v));
  }
  return p.toString();
}
export async function postFormWithRetry({ url, headers = {}, body, ...rest }) {
  return runWithRetry({
    url,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: typeof body === 'string' ? body : encodeForm(body),
    ...rest,
  });
}
