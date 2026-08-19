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
// PRESENTATION — "Het signatuurmoment", ontwerp 1 (Minimal Seal) met variant 2 "Eén ademtocht".
// The frozen motion reference lives in docs/studies/tools/seal-reference.js and the approved assets
// were generated from it; nothing here re-interprets the design. What the recipient gets:
//   • 1,6 s of complete stillness, then four points approach the seal once, the star breathes once,
//     everything lets go unevenly, and it is still again at 6,6 s. The GIF has no loop.
//   • THE FIRST FRAME, THE LAST FRAME AND THE STATIC PNG ARE THE SAME IMAGE. That is the whole
//     architecture: motion carries NO information, so a client that shows only frame 1 (Outlook
//     classic, Word engine) or the PNG (prefers-reduced-motion) loses nothing at all.
//   • Only the seal cell is an image. Name, role, contact and payoff stay REAL TEXT: selectable,
//     searchable, translatable, and readable when images are blocked.
//   • No remote fonts (mail clients ignore them anyway) — the canonical fallback is Georgia/Times.
//   • No CSS animation: it would double the motion in the few clients that support it.
//   • No tracking. The assets are plain static files on our own domain, identical for every
//     recipient, with no query string, no per-recipient path and no 1x1 pixel.

import { config } from '../config.mjs';

export const SIG_MARKER = '<!--maculis-signature-->';
export const SIG_TEXT_DELIM = '\n-- \n'; // RFC 3676 signature delimiter (clients + AI recognise it)

// Visual DNA v1.0. Copper is what has been perceived, violet is meaning in the making.
const INK = '#0a0b10';
const COPPER = '#b87333';
const COPPER_LIT = '#e6b98d';
const DIM = '#8e857a';
const ROW = '#a89f92';
const VIOLET_TEXT = '#a08fd6';
const SERIF = "Georgia,'Times New Roman',Times,serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function textToHtml(s) {
  return esc(s).replace(/\r?\n/g, '<br>');
}

// Canonical signature fields for a given send. NOTHING is invented: name comes from config
// (SENDER_FIRST_NAME) and is omitted when unset; email is the real sending address; website is the
// canonical brand domain. Role, location and the "in wording" line are optional and empty by
// default — an empty value drops the whole line instead of rendering a placeholder. No phone, no
// social, no disclaimer (§3).
export function signatureConfig({ fromAddress } = {}) {
  const asset = (file) => `${config.signatureAssetBase}/brand/${file}`;
  return {
    name: (config.signatureSenderName || config.senderFirstName || '').trim(), // canonical, never guessed
    org: 'Maculis',
    role: (config.signatureRole || '').trim(),
    payoff: config.signaturePayoff || 'Kijk nog eens.',
    location: (config.signatureLocation || '').trim(),
    wording: (config.signatureWording || '').trim(),
    email: (fromAddress || config.commMailboxes[0] || '').trim().toLowerCase() || null,
    website: 'maculis.nl',
    // Approved assets, version-locked in the filename. The version NEVER varies per recipient or
    // per send: identical URLs for everyone is what keeps this untrackable and proxy-cacheable.
    sealGif: asset('maculis-seal-perceive-v1.gif'),  // the one-time perception, no loop
    sealPng: asset('maculis-seal-rest-v1.png'),      // identical to the GIF's first and last frame
    wordmark: asset('maculis-wordmark-v1.png'),      // the logotype, because Newsreader cannot load in mail
    spark: asset('maculis-spark-v1.png'),
    iconMail: asset('maculis-icon-mail-v1.png'),
    iconGlobe: asset('maculis-icon-globe-v1.png'),
    iconPin: asset('maculis-icon-pin-v1.png'),
  };
}

// Outlook.com and new Outlook can invert colours in dark mode. These rules put our own ink ground,
// rules and text colours back. They are scoped to our own .mac- classes so they can never touch the
// message body above the signature. Gmail leaves dark backgrounds alone; Apple Mail honours ours.
function darkModeCss() {
  return `<style type="text/css">
[data-ogsc] .mac-ink,[data-ogsb] .mac-ink{background-color:${INK} !important}
[data-ogsc] .mac-rule,[data-ogsb] .mac-rule{border-left-color:${COPPER} !important}
[data-ogsc] .mac-name{color:${COPPER_LIT} !important}
[data-ogsc] .mac-dim{color:${DIM} !important}
[data-ogsc] .mac-row{color:${ROW} !important}
[data-ogsc] .mac-wording{color:${VIOLET_TEXT} !important}
</style>`;
}

// One contact line: a decorative icon plus real text. The icon is alt="" on purpose — it repeats
// what the text already says, so with images off nothing is lost and nothing is read twice.
function contactRow(icon, inner) {
  return `<tr>
            <td style="padding:0 9px 7px 0;line-height:0"><img src="${esc(icon)}" width="13" height="13" alt="" style="display:block;border:0;width:13px;height:13px"></td>
            <td class="mac-row" style="padding:0 0 7px;font-family:${SANS};font-size:12.5px;line-height:13px;color:${ROW};white-space:nowrap">${inner}</td>
          </tr>`;
}

// HTML signature — table-based (Outlook-safe), inline styles, images at 2x for HiDPI shown at 1x.
// The seal is a <picture>: clients that understand prefers-reduced-motion get the static PNG, all
// others get the GIF that plays once. Outlook classic ignores both and shows the GIF's first frame,
// which IS the static image. Every route ends on the same picture.
export function renderSignatureHtml(cfg) {
  const identity = cfg.name || cfg.org; // never a fabricated person name
  const rows = [
    cfg.email ? contactRow(cfg.iconMail, `<a href="mailto:${esc(cfg.email)}" style="color:${ROW};text-decoration:none">${esc(cfg.email)}</a>`) : '',
    cfg.website ? contactRow(cfg.iconGlobe, `<a href="https://${esc(cfg.website)}" style="color:${ROW};text-decoration:none">${esc(cfg.website)}</a>`) : '',
    cfg.location ? contactRow(cfg.iconPin, esc(cfg.location)) : '',
  ].filter(Boolean).join('\n          ');

  const roleLine = cfg.role
    ? `<div class="mac-dim" style="font-family:${SANS};font-size:10px;letter-spacing:1.9px;text-transform:uppercase;line-height:18px;color:${DIM};padding-top:2px;white-space:nowrap">${esc(cfg.role)}</div>`
    : '';

  const wordingLine = cfg.wording
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:6px">
        <tr>
          <td style="padding:0 2px 0 0;line-height:0"><img src="${esc(cfg.spark)}" width="30" height="30" alt="" style="display:block;border:0;width:30px;height:30px"></td>
          <td class="mac-wording" style="font-family:${SERIF};font-style:italic;font-size:13.5px;line-height:16px;color:${VIOLET_TEXT};white-space:nowrap">${esc(cfg.wording)}</td>
        </tr>
      </table>`
    : '';

  return `${SIG_MARKER}
${darkModeCss()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="mac-ink" style="border-collapse:collapse;background-color:${INK};mso-line-height-rule:exactly;margin-top:20px">
  <tr>
    <td class="mac-ink" width="150" style="width:150px;padding:18px 0;line-height:0;background-color:${INK}" valign="middle">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcset="${esc(cfg.sealPng)}">
        <img src="${esc(cfg.sealGif)}" width="150" height="150" alt="" style="display:block;border:0;outline:none;width:150px;height:150px">
      </picture>
    </td>
    <td class="mac-ink mac-rule" style="padding:16px 22px;border-left:1px solid ${COPPER};background-color:${INK}" valign="middle">
      <div class="mac-name" style="font-family:${SERIF};font-weight:normal;font-size:25px;line-height:30px;color:${COPPER_LIT};white-space:nowrap">${esc(identity)}</div>
      ${roleLine}
      ${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:10px">
          ${rows}
      </table>` : ''}
    </td>
    <td class="mac-ink mac-rule" style="padding:16px 22px;border-left:1px solid ${COPPER};background-color:${INK}" valign="middle">
      <img src="${esc(cfg.wordmark)}" width="106" height="50" alt="${esc(cfg.org)}" style="display:block;border:0;width:106px;height:50px">
      <div class="mac-row" style="font-family:${SERIF};font-size:13px;line-height:20px;color:${ROW};padding-top:6px;white-space:nowrap">${esc(cfg.payoff)}</div>
      ${wordingLine}
    </td>
  </tr>
</table>`;
}

// Plain-text signature — the text version does NOT try to imitate the animation (§13). Canonical
// fields only, standard "-- " delimiter so replies/AI can recognise and strip it.
export function renderSignatureText(cfg) {
  const lines = [];
  if (cfg.name) lines.push(cfg.name);
  if (cfg.role) lines.push(cfg.role);
  lines.push('Maculis');
  lines.push(cfg.payoff);
  if (cfg.email) lines.push(cfg.email);
  if (cfg.website) lines.push(cfg.website);
  if (cfg.location) lines.push(cfg.location);
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
  const bodyHtmlSafe = bodyHtml || `<div style="font-family:${SANS};font-size:15px;line-height:1.5;color:#2b2b2b">${textToHtml(bodyText)}</div>`;
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
