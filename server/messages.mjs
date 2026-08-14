// Message rendering + deep-link builders (brief §5, §6, §8).
//
// One central template (stored in the DB) is rendered per tester. V1 does NOT
// use the WhatsApp Business API or any automatic sending — it only builds a
// wa.me deep link (and an optional mailto:) that the admin opens and sends by
// hand. No bulk, no background send.

import { personalUrl } from './tokens.mjs';
import { config } from './config.mjs';
import { normaliseMobile } from './store.mjs';

// Replace {placeholders} with record values. Unknown placeholders are left
// untouched so a typo in the template is visible rather than silently blanked.
export function render(template, record) {
  const vars = {
    first_name: record.first_name || '',
    last_name: record.last_name || '',
    company_name: record.company_name || '',
    domain: record.domain || '',
    personal_url: personalUrl(config.maculisHost, record.token),
  };
  return String(template).replace(/\{(\w+)\}/g, (m, key) =>
    key in vars ? vars[key] : m
  );
}

// wa.me needs a digits-only INTERNATIONAL recipient (no '+'). This delegates to
// the single normalisation choke point, which converts Dutch national numbers
// (0X…) to international (31X…) and rejects implausible numbers (returns '').
export function waNumber(mobile) {
  return normaliseMobile(mobile || '');
}

// Build the full WhatsApp payload for a record.
export function buildWhatsApp(template, record) {
  const text = render(template.whatsapp, record);
  const number = waNumber(record.mobile);
  const base = number ? `https://wa.me/${number}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  return { url, text, hasNumber: Boolean(number) };
}

export function buildMailto(template, record) {
  const subject = render(template.emailSubject, record);
  const body = render(template.emailBody, record);
  const to = record.email || '';
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  return { url, subject, body, hasEmail: Boolean(to) };
}

// Plain rendered e-mail (recipient + subject + body) for server-side sending.
// The personal Maculis link is embedded in the body via {personal_url}.
export function buildEmail(template, record) {
  return {
    to: record.email || '',
    subject: render(template.emailSubject, record),
    body: render(template.emailBody, record),
    hasEmail: Boolean(record.email),
  };
}
