// Communication Layer — outbound is REAL, and delivery status reflects provider truth.
// Regression for the production incident: the email provider silently ran in mock mode (because
// mailDelivers() also required MAIL_FROM) and returned a fake SENT. Now: LIVE needs only
// resend+MAIL_API_KEY, production never fakes a send, and Resend delivery events update the message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../server/comm/webhook.mjs';

// Set BEFORE any config import (webhook.mjs does not import config, so this runs first).
process.env.MAIL_TRANSPORT = 'resend';
process.env.MAIL_API_KEY = 're_test_key';
process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('outbound-del-secret').toString('base64'));

test('email provider is LIVE with resend + MAIL_API_KEY alone (MAIL_FROM not required)', async () => {
  const { emailProvider } = await import('../server/comm/providers/email.mjs');
  assert.equal(emailProvider().mode, 'live', 'resend + key -> live, independent of MAIL_FROM');
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
test('Resend delivery webhooks update the outbound message truthfully', { skip: HAS_DB ? false : 'no DATABASE_URL — outbound delivery E2E skipped' }, async () => {
  const { runMigrations } = await import('../server/comm/migrate.mjs');
  const { processInbound } = await import('../server/comm/inbound.mjs');
  const { query, closePool } = await import('../server/comm/db.mjs');
  const { config } = await import('../server/config.mjs');
  const { getDefaultTenantId } = await import('../server/comm/tenant.mjs');
  await runMigrations({ silent: true });
  const tenantId = await getDefaultTenantId();
  const secret = config.resendWebhookSecret;
  try {
    await query('truncate message, conversation, delivery_event, webhook_event cascade');
    const conv = (await query("insert into conversation(tenant_id, channel, is_privacy, status) values ($1,'EMAIL',false,'ANSWERED') returning id", [tenantId])).rows[0];
    const msg = (await query("insert into message(tenant_id, conversation_id, direction, channel, from_address, provider, provider_message_id, delivery, sent_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl','resend','re_123','SENT', now()) returning id", [tenantId, conv.id])).rows[0];

    const hook = (type, data, id) => { const rawBody = JSON.stringify({ type, data }); return { headers: signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret }), rawBody }; };
    const delivery = async () => (await query('select delivery from message where id=$1', [msg.id])).rows[0].delivery;

    // email.delivered -> DELIVERED (provider-confirmed)
    const r1 = await processInbound(hook('email.delivered', { email_id: 're_123' }, 'd1'));
    assert.equal(r1.deliveryUpdated, true);
    assert.equal(r1.state, 'DELIVERED');
    assert.equal(await delivery(), 'DELIVERED', 'provider confirmed delivery');

    // out-of-order email.sent must NOT regress a confirmed delivery
    await processInbound(hook('email.sent', { email_id: 're_123' }, 'd2'));
    assert.equal(await delivery(), 'DELIVERED', 'sent-after-delivered does not regress');

    // a bounce always surfaces (actionable failure)
    await processInbound(hook('email.bounced', { email_id: 're_123' }, 'd3'));
    assert.equal(await delivery(), 'BOUNCED', 'bounce surfaces');

    // every event is logged for provider evidence
    assert.ok((await query('select count(*)::int n from delivery_event where message_id=$1', [msg.id])).rows[0].n >= 3, 'delivery events recorded');

    // an event for an unknown message id is acknowledged but matches nothing (no crash)
    const r4 = await processInbound(hook('email.delivered', { email_id: 'unknown' }, 'd4'));
    assert.equal(r4.deliveryUpdated, false, 'no match for unknown provider id');
    assert.equal(r4.ok, true);
  } finally {
    await closePool();
  }
});
