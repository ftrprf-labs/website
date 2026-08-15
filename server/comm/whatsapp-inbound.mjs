// Communication Layer — inbound WhatsApp pipeline (Cloud API webhook).
//
// WhatsApp is a CHANNEL ADAPTER inside the one Relationship + Communication architecture (§8, §12),
// never a parallel inbox. So this file is deliberately thin: it authenticates the untrusted webhook,
// normalizes Meta's payload, and hands each message to the SAME receiveChannelInbound pipeline that
// already does identity resolution, conversation threading, persistence and the automatic AI draft.
// Delivery receipts (sent/delivered/read/failed) update the outbound message they refer to.
//
//   verify x-hub-signature-256 -> parse -> normalize -> per message: receiveChannelInbound
//                                                    -> per status:  applyDeliveryStatus
//
// Persistence-before-intelligence and idempotency (dedup on providerMessageId) are inherited from
// receiveChannelInbound. Fail-closed: without WHATSAPP_APP_SECRET the signature check rejects.

import { config } from '../config.mjs';
import { verifyMetaSignature, verifyChallenge, normalizeWhatsAppPayload } from './providers/whatsapp-webhook.mjs';
import { receiveChannelInbound, applyDeliveryStatus } from './channel-inbound.mjs';
import { getDefaultTenantId } from './tenant.mjs';

// PII-safe diagnostics: stage + reason + non-PII counts only. Never a sender/number/body. Silenced
// in tests. Mirrors the inbound e-mail logger so "where did the chain stop?" is visible in prod.
function logWa(stage, extra = {}) {
  if (process.env.NODE_ENV === 'test') return;
  try {
    const safe = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ');
    // eslint-disable-next-line no-console
    console.log(`[comm/whatsapp] ${stage}${safe ? ' ' + safe : ''}`);
  } catch { /* logging must never break inbound */ }
}

// GET webhook verification (Meta subscribes the callback URL). Returns { ok, challenge } / reason.
export function handleWhatsAppChallenge({ mode, token, challenge }) {
  return verifyChallenge({ mode, token, challenge, expectedToken: config.whatsappVerifyToken });
}

// POST webhook. `receive`/`applyStatus` are injectable for offline tests. Returns a structured
// result; never throws for an expected condition (bad signature, empty, unknown message).
export async function processWhatsAppWebhook({
  headers = {}, rawBody = '',
  receive = receiveChannelInbound, applyStatus = applyDeliveryStatus, tenantId = null,
  appSecret = config.whatsappAppSecret,
}) {
  // 1) signature (untrusted input) — fail-closed.
  const sig = verifyMetaSignature({
    appSecret,
    rawBody,
    signatureHeader: headers['x-hub-signature-256'],
  });
  if (!sig.ok) { logWa('rejected', { reason: sig.reason }); return { ok: false, status: 401, reason: sig.reason }; }

  // 2) parse
  let payload;
  try { payload = JSON.parse(rawBody || '{}'); } catch { return { ok: false, status: 400, reason: 'bad_json' }; }
  if (payload.object && payload.object !== 'whatsapp_business_account') {
    return { ok: true, status: 200, ignored: true, reason: 'object_type' };
  }

  // 3) normalize (never throws on malformed input)
  const { messages, statuses } = normalizeWhatsAppPayload(payload);
  const tid = tenantId || await getDefaultTenantId();

  // 4) messages -> the shared inbound pipeline (identity + threading + persist + AI draft).
  let stored = 0; let duplicate = 0;
  for (const m of messages) {
    if (!m.from) continue;
    const r = await receive({
      tenantId: tid, channel: 'WHATSAPP', from: m.from, to: m.to,
      text: m.text || '', providerMessageId: m.providerMessageId, provider: m.provider,
    });
    if (r && r.duplicate) duplicate += 1; else if (r && r.ok) stored += 1;
  }

  // 5) statuses -> advance the outbound message they refer to (append-only receipt + forward-only).
  let receipts = 0;
  for (const s of statuses) {
    if (!s.providerMessageId || !s.state) continue;
    const r = await applyStatus({ tenantId: tid, providerMessageId: s.providerMessageId, state: s.state, detail: s.errorReason, provider: 'whatsapp-cloud' });
    if (r && r.ok) receipts += 1;
  }

  logWa('processed', { messages: stored, duplicates: duplicate, receipts });
  // Meta requires a fast 200 or it retries; a duplicate/empty payload is still a 200.
  return { ok: true, status: 200, messages: stored, duplicates: duplicate, receipts };
}
