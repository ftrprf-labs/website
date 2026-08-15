// Communication Layer — Maculis Living Email Signature (§MACULIS LIVING EMAIL SIGNATURE).
//
// The signature is added DETERMINISTICALLY and CENTRALLY by the Communication Layer at SEND time —
// never by the AI, never inside the draft/stored body. That guarantees:
//   • exactly one signature per sent mail (§12) — the draft never contains it, so it cannot double;
//   • no hallucinated contact data (§3) — only canonical fields from config are used;
//   • a clean AI context (§11) — our presentation signature is not part of the conversation content
//     the model reasons over (it lives only in the transmitted e-mail), and stripForContext()
//     additionally removes our signature + quoted history from any body before it reaches the model.
//
// The "magic" is a single subtle blink: a tiny transparent GIF (loop once) with a static open-eye
// PNG fallback. No JS, no CSS animation (email-safe), no tracking pixel — a plain visible logo image
// served from our own domain. Accessible: real alt text + a meaningful plain-text signature.

import { config } from '../config.mjs';

export const SIG_MARKER = '<!--maculis-signature-->';
export const SIG_TEXT_DELIM = '\n-- \n'; // RFC 3676 signature delimiter (clients + AI recognise it)

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function textToHtml(s) {
  return esc(s).replace(/\r?\n/g, '<br>');
}

// Canonical signature fields for a given send. NOTHING is invented: name comes from config
// (SENDER_FIRST_NAME) and is omitted when unset; email is the real sending address; website is the
// canonical brand domain. No surname, title, phone, social or address (§3).
export function signatureConfig({ fromAddress } = {}) {
  return {
    name: (config.signatureSenderName || config.senderFirstName || '').trim(), // canonical, never guessed
    org: 'Maculis',
    payoff: config.signaturePayoff || 'Kijk nog eens.',
    email: (fromAddress || config.commMailboxes[0] || '').trim().toLowerCase() || null,
    website: 'maculis.nl',
    eyeGif: `${config.signatureAssetBase}/brand/maculis-eye.gif`,
    eyePng: `${config.signatureAssetBase}/brand/maculis-eye.png`,
  };
}

// HTML signature — table-based (Outlook-safe), inline styles, dark-mode-safe colours (Maculis gold
// reads on light AND dark; the eye is transparent so no white box). The GIF blinks once; a client
// that ignores animation shows the first (open) frame, which is a natural static fallback.
export function renderSignatureHtml(cfg) {
  const GOLD = '#c8894a'; const DIM = '#8a8073';
  const nameLine = cfg.name
    ? `<div style="font-size:15px;font-weight:600;color:${GOLD};line-height:1.3">${esc(cfg.name)}</div>
         <div style="font-size:13px;color:${DIM};line-height:1.5">Maculis <span style="color:${GOLD};font-style:italic">· ${esc(cfg.payoff)}</span></div>`
    : `<div style="font-size:15px;font-weight:600;color:${GOLD};line-height:1.3">Maculis</div>
         <div style="font-size:13px;color:${GOLD};font-style:italic;line-height:1.5">${esc(cfg.payoff)}</div>`;
  const contact = [
    cfg.email ? `<a href="mailto:${esc(cfg.email)}" style="color:${DIM};text-decoration:none">${esc(cfg.email)}</a>` : '',
    cfg.website ? `<a href="https://${esc(cfg.website)}" style="color:${GOLD};text-decoration:none">${esc(cfg.website)}</a>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');
  return `${SIG_MARKER}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <tr>
    <td style="vertical-align:middle;padding-right:14px">
      <img src="${esc(cfg.eyeGif)}" width="72" height="45" alt="Maculis — ${esc(cfg.payoff)}" style="display:block;border:0;outline:none;width:72px;height:45px" />
    </td>
    <td style="vertical-align:middle;border-left:2px solid ${GOLD};padding-left:14px">
      ${nameLine}
      ${contact ? `<div style="font-size:12px;color:${DIM};line-height:1.6;margin-top:3px">${contact}</div>` : ''}
    </td>
  </tr>
</table>`;
}

// Plain-text signature — the text version does NOT try to imitate the animation (§13). Canonical
// fields only, standard "-- " delimiter so replies/AI can recognise and strip it.
export function renderSignatureText(cfg) {
  const lines = [];
  if (cfg.name) lines.push(cfg.name);
  lines.push('Maculis');
  lines.push(cfg.payoff);
  if (cfg.email) lines.push(cfg.email);
  if (cfg.website) lines.push(cfg.website);
  return SIG_TEXT_DELIM + lines.join('\n');
}

// Wrap a human/AI message body into the transmitted e-mail (text + html), appending the signature
// EXACTLY ONCE. bodyHtml is optional (composer sends plain text today) — we build safe HTML from the
// text when no html is supplied, so the branded signature always renders while a plain-text
// alternative stays clean.
export function wrapEmail({ bodyText = '', bodyHtml = null, fromAddress }) {
  const cfg = signatureConfig({ fromAddress });
  // Idempotent: if a signature is already present (defensive against a re-wrap), do not add a second.
  const alreadyText = String(bodyText).includes(SIG_TEXT_DELIM);
  const alreadyHtml = Boolean(bodyHtml && bodyHtml.includes(SIG_MARKER));
  const text = alreadyText ? String(bodyText) : `${bodyText}`.replace(/\s+$/, '') + '\n' + renderSignatureText(cfg);
  const bodyHtmlSafe = bodyHtml || `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#2b2b2b">${textToHtml(bodyText)}</div>`;
  const html = alreadyHtml ? bodyHtmlSafe : `${bodyHtmlSafe}\n${renderSignatureHtml(cfg)}`;
  return { text, html };
}

// Remove OUR signature and quoted history from a body before it feeds the AI context (§11), so the
// model reasons over the actual conversation, not presentation boilerplate or the quoted thread.
export function stripForContext(body) {
  if (!body) return '';
  let s = String(body);
  const m = s.indexOf(SIG_MARKER);
  if (m >= 0) s = s.slice(0, m);
  // Cut at the first of: our "-- " signature delimiter, a quoted-reply attribution header (EN/NL),
  // or the first quoted (">") line — everything from there down is signature/quoted history.
  const lines = s.split('\n');
  let cut = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    const isQuote = /^>/.test(lines[i]);
    const isDelim = l === '--';
    const isHeader = /^(op .+schreef.*:|on .+wrote:|from:\s|-{2,}\s*original message|verzonden vanaf|sent from my)/i.test(l);
    if (isQuote || isDelim || isHeader) { cut = i; break; }
  }
  return lines.slice(0, cut).join('\n').trim();
}
