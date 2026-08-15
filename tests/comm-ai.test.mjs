// Communication Layer — AI Relationship Copilot. Mock-provider parse always runs; the DB-backed
// draft/privacy checks SKIP without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProvider } from '../server/comm/ai/provider.mjs';
import { INTENTS } from '../server/comm/ai/copilot.mjs';

test('mock provider returns parseable draft JSON with a known intent', async () => {
  const raw = await getProvider().generate({ system: 's', prompt: 'LAATSTE BERICHT:\nKunnen jullie ook naar arbeidsmarktcommunicatie kijken?\n\n' });
  const json = JSON.parse(raw);
  assert.ok(json.summary && json.suggested_reply);
  assert.ok(INTENTS.includes(json.intent));
  assert.ok(Array.isArray(json.suggested_actions));
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
test('copilot: draft for COMMUNICATION, excluded for privacy@, never auto-sends',
  { skip: HAS_DB ? false : 'no DATABASE_URL — copilot DB test skipped' }, async () => {
    process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('ai-test-secret').toString('base64'));
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { processInbound } = await import('../server/comm/inbound.mjs');
    const { runCopilot } = await import('../server/comm/ai/copilot.mjs');
    const { signWebhook } = await import('../server/comm/webhook.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { config } = await import('../server/config.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, mailbox, webhook_event, ai_draft, activity cascade');
      const mk = (data, id) => { const rawBody = JSON.stringify({ type: 'email.received', data }); return { headers: signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret: config.resendWebhookSecret }), rawBody }; };
      const email = (to, mid) => async () => ({ id: 'e', from: 'Kim <kim@oca.nl>', to, cc: [], subject: 'Vraag', text: 'Kunnen jullie ook kijken?', html: '<p>x</p>', headers: { message_id: mid, in_reply_to: null, references: [] }, attachments: [] });
      const r1 = await processInbound({ ...mk({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'] }, 'w1'), fetchEmail: email(['hello@maculis.nl'], '<c1@oca.nl>') });
      const d = await runCopilot({ conversationId: r1.conversationId, messageId: r1.messageId });
      assert.equal(d.ok, true);
      const rp = await processInbound({ ...mk({ email_id: 'e2', from: 'jan@x.nl', to: ['privacy@maculis.nl'] }, 'w2'), fetchEmail: email(['privacy@maculis.nl'], '<p1@x.nl>') });
      const dp = await runCopilot({ conversationId: rp.conversationId, messageId: rp.messageId });
      assert.equal(dp.reason, 'privacy_excluded');
      const outbound = Number((await query("select count(*)::int n from message where direction='OUTBOUND'")).rows[0].n);
      assert.equal(outbound, 0, 'AI never auto-sends');
    } finally {
      await closePool();
    }
  });
