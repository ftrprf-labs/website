// Communication Layer — inbound/threading/outbound. Signature + sanitiser checks always run;
// the pipeline checks SKIP without DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhook, signWebhook } from '../server/comm/webhook.mjs';
import { sanitizeHtml } from '../server/comm/sanitize.mjs';

test('webhook signature verification (Svix) + replay window', () => {
  const secret = 'whsec_' + Buffer.from('unit-test-secret-000000').toString('base64');
  const rawBody = '{"type":"email.received"}';
  const ts = Math.floor(Date.now() / 1000);
  const headers = signWebhook({ id: 'msg_1', timestamp: ts, rawBody, secret });
  assert.equal(verifyWebhook({ headers, rawBody, secret }).ok, true);
  assert.equal(verifyWebhook({ headers, rawBody: '{"tampered":1}', secret }).ok, false);
  const old = signWebhook({ id: 'msg_1', timestamp: ts - 3600, rawBody, secret });
  assert.equal(verifyWebhook({ headers: old, rawBody, secret }).reason, 'timestamp_out_of_window');
});

test('sanitiser removes scripts/handlers/js-hrefs/resource loads', () => {
  const out = sanitizeHtml('<p onclick="x()">hi</p><script>bad()</script><a href="javascript:e()">a</a><a href="https://ok.nl">ok</a><img src="http://t/x">');
  assert.ok(!/script|onclick|javascript:|<img/i.test(out));
  assert.ok(/https:\/\/ok\.nl/.test(out));
});

const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');
test('inbound pipeline: persist, route, thread, idempotency, outbound reply-back',
  { skip: HAS_DB ? false : 'no DATABASE_URL — inbound pipeline test skipped' }, async () => {
    process.env.RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || ('whsec_' + Buffer.from('inbound-test-secret').toString('base64'));
    const { runMigrations } = await import('../server/comm/migrate.mjs');
    const { processInbound } = await import('../server/comm/inbound.mjs');
    const { sendReply } = await import('../server/comm/outbound.mjs');
    const { query, closePool } = await import('../server/comm/db.mjs');
    const { config } = await import('../server/config.mjs');
    try {
      await runMigrations({ silent: true });
      await query('truncate message, conversation, contact, organization, mailbox, webhook_event, attachment cascade');
      const secret = config.resendWebhookSecret;
      const mk = (data, id) => { const rawBody = JSON.stringify({ type: 'email.received', data }); const headers = signWebhook({ id, timestamp: Math.floor(Date.now() / 1000), rawBody, secret }); return { headers, rawBody }; };
      const email = (over) => async () => ({ id: 'e', from: 'Kim <kim@oca.nl>', to: ['hello@maculis.nl'], cc: [], subject: 'Vraag', text: 'hoi', html: '<p>hoi</p>', headers: { message_id: over.mid, in_reply_to: over.inReplyTo || null, references: over.references || [] }, attachments: [] });
      const r1 = await processInbound({ ...mk({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Vraag' }, 'w1'), fetchEmail: email({ mid: '<c1@oca.nl>' }) });
      assert.equal(r1.stored, true);
      const dup = await processInbound({ ...mk({ email_id: 'e1', from: 'kim@oca.nl', to: ['hello@maculis.nl'] }, 'w1'), fetchEmail: email({ mid: '<c1@oca.nl>' }) });
      assert.equal(dup.duplicate, true);
      const rep = await sendReply({ conversationId: r1.conversationId, text: 'ja', send: async () => ({ ok: true, id: 'x' }) });
      assert.equal(rep.ok, true);
      const r2 = await processInbound({ ...mk({ email_id: 'e2', from: 'kim@oca.nl', to: ['hello@maculis.nl'], subject: 'Re: Vraag' }, 'w2'), fetchEmail: email({ mid: '<c2@oca.nl>', inReplyTo: rep.rfcMessageId, references: [rep.rfcMessageId] }) });
      assert.equal(r2.conversationId, r1.conversationId, 'reply-back threads into same conversation');
    } finally {
      await closePool();
    }
  });
