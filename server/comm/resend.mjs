// Communication Layer — Resend Receiving API client (inbound) + threaded outbound sender.
//
// The email.received webhook carries only metadata; the full message (headers, body, attachments
// metadata) is fetched from the Receiving API. Outbound replies are sent via the Resend Emails
// API with proper threading headers. No secrets in code — the API key comes from config
// (MAIL_API_KEY, already used for outbound). All functions are dependency-injectable so tests run
// fully offline with a mock.

import { config } from '../config.mjs';

const RECEIVING_ENDPOINT = 'https://api.resend.com/emails/receiving';
const EMAILS_ENDPOINT = 'https://api.resend.com/emails';

// Fetch a full inbound message by its Resend id. Returns a normalised shape:
//   { id, from, to[], cc[], subject, text, html, headers{message_id,in_reply_to,references[]},
//     attachments:[{filename,content_type,size,id}] }
export async function fetchInboundEmail(id, { apiKey = config.mailApiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('MAIL_API_KEY not set — cannot fetch inbound message.');
  const res = await fetchImpl(`${RECEIVING_ENDPOINT}/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`resend_receiving_${res.status}`);
  const body = await res.json();
  return normaliseInbound(body);
}

// Map a Resend receiving payload to our normalised shape. Tolerant of header casing/shape.
export function normaliseInbound(body) {
  const h = body.headers || {};
  const get = (k) => h[k] || h[k.toLowerCase()] || h[k.toUpperCase()] || null;
  const refs = get('References') || get('references') || '';
  return {
    id: body.id || body.email_id || null,
    from: (body.from && (body.from.email || body.from)) || get('From') || null,
    to: toArray(body.to),
    cc: toArray(body.cc),
    subject: body.subject || get('Subject') || '',
    text: body.text || '',
    html: body.html || '',
    headers: {
      message_id: body.message_id || get('Message-ID') || get('Message-Id') || null,
      in_reply_to: body.in_reply_to || get('In-Reply-To') || null,
      references: String(refs).split(/\s+/).filter(Boolean),
    },
    attachments: (body.attachments || []).map((a) => ({
      filename: a.filename || a.name || 'bijlage',
      content_type: a.content_type || a.contentType || 'application/octet-stream',
      size: a.size || a.content_length || null,
      id: a.id || a.attachment_id || null,
    })),
  };
}

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (x && (x.email || x)) || x).filter(Boolean);
  return [v.email || v].filter(Boolean);
}

// Send an outbound reply through Resend with threading headers. Returns { ok, id, reason }.
export async function sendThreadedEmail(msg, { apiKey = config.mailApiKey, fetchImpl = fetch, headersExtra = {} } = {}) {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  const headers = { ...headersExtra };
  if (msg.inReplyTo) headers['In-Reply-To'] = msg.inReplyTo;
  if (msg.references && msg.references.length) headers.References = msg.references.join(' ');
  const payload = {
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    ...(msg.html ? { html: msg.html } : {}),
    ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
  };
  try {
    const res = await fetchImpl(EMAILS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, reason: `resend_${res.status}` };
    const body = await res.json().catch(() => ({}));
    return { ok: true, id: body.id || null };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
