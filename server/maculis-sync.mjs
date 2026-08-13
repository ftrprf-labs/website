// Server-to-server publish to Maculis (Fase 2, optie A).
//
// Turns selected invitation records into the Maculis participant map and PUTs it
// to {MACULIS_HOST}/api/participants, authenticated with the shared sync key.
//
// Privacy-by-default / data minimisation:
//   - the token is the ONLY thing that ever appears in a URL (never here anyway)
//   - we send ONLY the context fields Maculis actually uses to personalise the
//     opening: first_name, last_name, company_name, domain
//   - e-mail and mobile are deliberately NOT sent to Maculis; the Invitation
//     Manager stays the single source of truth for contact data
//   - nothing here is logged (the caller logs counts only, never the payload)

import { config } from './config.mjs';

// Build { "<token>": { first_name, last_name, company_name, domain }, … }.
export function buildParticipantsPayload(records) {
  const participants = {};
  for (const r of records) {
    if (!r || !r.token) continue;
    const rec = {};
    if (r.first_name) rec.first_name = String(r.first_name).trim();
    if (r.last_name) rec.last_name = String(r.last_name).trim();
    if (r.company_name) rec.company_name = String(r.company_name).trim();
    if (r.domain) rec.domain = String(r.domain).trim();
    participants[r.token] = rec;
  }
  return { participants };
}

// PUT the payload to Maculis. Returns a small result object; never throws for
// an HTTP-level failure (so the caller can report it cleanly).
export async function publishToMaculis(records) {
  if (!config.maculisSyncKey) {
    return { ok: false, reason: 'not_configured', message: 'MACULIS_SYNC_KEY ontbreekt in de omgeving.' };
  }
  const payload = buildParticipantsPayload(records);
  const count = Object.keys(payload.participants).length;
  if (count === 0) {
    return { ok: false, reason: 'empty', message: 'Geen testers geselecteerd om te publiceren.' };
  }

  const url = `${config.maculisHost}/api/participants`;
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-sync-key': config.maculisSyncKey },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // Network / DNS / TLS problem — no PII in the message (only the host).
    return { ok: false, reason: 'network', message: `Kon Maculis niet bereiken (${config.maculisHost}): ${e.message}` };
  }

  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }

  if (res.status === 403) return { ok: false, reason: 'forbidden', status: 403, message: 'Sync-key geweigerd door Maculis (403).' };
  if (res.status === 503) return { ok: false, reason: 'no_data_dir', status: 503, message: 'Maculis heeft geen MACULIS_DATA_DIR ingesteld (503).' };
  if (!res.ok) return { ok: false, reason: 'http', status: res.status, message: `Maculis gaf status ${res.status}.` };

  return { ok: true, published: count, maculis: body || null };
}
