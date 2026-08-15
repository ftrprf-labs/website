// Communication Layer — inbound SMS pipeline (Twilio webhook).
//
// SMS is a CHANNEL ADAPTER on the one Relationship + Communication architecture, exactly like
// WhatsApp and e-mail. So this file is thin: authenticate the untrusted webhook (X-Twilio-Signature),
// parse the form body, and hand each inbound message to the SAME receiveChannelInbound pipeline
// (identity resolution, threading, persistence, automatic AI draft). Delivery-status callbacks
// update the outbound message they refer to via applyDeliveryStatus.
//
//   verify X-Twilio-Signature -> parse form -> classify -> inbound: receiveChannelInbound
//                                                       -> status:  applyDeliveryStatus
//
// Idempotency (dedup on providerMessageId) and persistence-before-intelligence are inherited from
// receiveChannelInbound. Fail-closed: without the signing secret the signature check rejects.

import { config } from '../config.mjs';
import {
  parseForm, verifyTwilioSignature, classifyTwilioForm,
  normalizeTwilioInbound, normalizeTwilioStatus,
} from './providers/sms-webhook.mjs';
import { receiveChannelInbound, applyDeliveryStatus } from './channel-inbound.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { obs } from './obs.mjs';

// PII-safe diagnostics via the shared obs() formatter (redacts by construction).
function logSms(stage, extra = {}) { obs('comm/sms', stage, extra); }

// The exact URL Twilio signed. Prefer an explicitly configured webhook URL; else the public base
// plus the request path (never a client-supplied Host header, which is spoofable).
export function resolveWebhookUrl(pathname) {
  if (config.smsWebhookUrl) return config.smsWebhookUrl;
  return `${config.maculisPublicUrl}${pathname}`;
}

// POST webhook. `receive`/`applyStatus`/`authToken` are injectable for offline tests. Never throws
// for an expected condition (bad signature, unknown message). Returns a structured result.
export async function processSmsWebhook({
  url, headers = {}, rawBody = '',
  receive = receiveChannelInbound, applyStatus = applyDeliveryStatus, tenantId = null,
  authToken = config.smsWebhookSecret,
}) {
  const params = parseForm(rawBody);
  // 1) signature (untrusted input) — fail-closed.
  const sig = verifyTwilioSignature({ authToken, url, params, signatureHeader: headers['x-twilio-signature'] });
  if (!sig.ok) { logSms('rejected', { reason: sig.reason }); return { ok: false, status: 403, reason: sig.reason }; }

  const tid = tenantId || await getDefaultTenantId();
  const kind = classifyTwilioForm(params);

  if (kind === 'status') {
    const s = normalizeTwilioStatus(params);
    if (s.providerMessageId && s.state) {
      await applyStatus({ tenantId: tid, providerMessageId: s.providerMessageId, state: s.state, detail: s.errorReason, provider: 'sms-twilio' });
    }
    logSms('processed', { kind: 'status', state: s.state });
    return { ok: true, status: 200, receipts: s.state ? 1 : 0 };
  }

  if (kind === 'inbound') {
    const m = normalizeTwilioInbound(params);
    if (!m.from) { logSms('ignored', { reason: 'no_sender' }); return { ok: true, status: 200, ignored: true }; }
    const r = await receive({ tenantId: tid, channel: 'SMS', from: m.from, to: m.to, text: m.text || '', providerMessageId: m.providerMessageId, provider: m.provider });
    logSms('processed', { kind: 'inbound', stored: r && r.ok && !r.duplicate ? 1 : 0, duplicate: r && r.duplicate ? 1 : 0 });
    return { ok: true, status: 200, messages: r && r.ok && !r.duplicate ? 1 : 0, duplicates: r && r.duplicate ? 1 : 0 };
  }

  logSms('ignored', { reason: 'unclassified' });
  return { ok: true, status: 200, ignored: true, reason: 'unclassified' };
}
