// Communication Layer — permanent identity + organization matching.
//
// Contact is a PERMANENT, campaign-independent person identity. Its natural key is the
// normalised e-mail (primary) or mobile (fallback), WITHOUT any campaign prefix — so the same
// human across First Five, a later journey, a prospect e-mail, etc. is always ONE Contact.
// (The JSON store's person_key is `${campaign}|${id}` and is campaign-scoped; it is used only to
// find legacy rows during migration, never as the Contact identity.)
//
// Organization matching uses signals, never blind proof. An e-mail DOMAIN is a signal only:
// free-mail domains (gmail/outlook/…) and low-confidence matches are surfaced as SUGGESTED and
// require human confirmation — they are never auto-linked as a definitive Organization.

import { normaliseMobile } from '../store.mjs';

// Public free-mail / consumer domains: never a reliable organization signal.
const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'hotmail.nl', 'live.com', 'live.nl',
  'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'gmx.de', 'aol.com', 'zoho.com',
  'hey.com', 'pm.me', 'ziggo.nl', 'kpnmail.nl', 'planet.nl', 'home.nl', 'telfort.nl', 'xs4all.nl',
]);

export function emailDomain(email) {
  const e = (email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 0) return '';
  return e.slice(at + 1);
}

export function isFreeMailDomain(domain) {
  return FREE_MAIL.has((domain || '').trim().toLowerCase());
}

// The permanent, campaign-independent Contact identity key. E-mail wins over mobile.
export function contactIdentityKey({ email, mobile }) {
  const e = (email || '').trim().toLowerCase();
  if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return `email:${e}`;
  const m = normaliseMobile(mobile || '');
  if (m) return `mobile:${m}`;
  return null;
}

// Decide the organization signal for a contact.
//   { name, domain, confidence }  where confidence ∈ 'linked' | 'suggested' | 'none'.
// - An explicit company_name (e.g. from Testerbeheer) is a confident 'linked' signal.
// - A NON-free-mail e-mail domain is a 'suggested' signal (needs confirmation) unless a
//   company_name already pins it.
// - A free-mail domain contributes NOTHING to org identity.
export function orgSignal({ company_name, email, domain }) {
  const company = (company_name || '').trim();
  const dom = (domain || emailDomain(email) || '').trim().toLowerCase();
  const freeMail = isFreeMailDomain(dom);
  if (company) {
    return { name: company, domain: freeMail ? null : (dom || null), confidence: 'linked' };
  }
  if (dom && !freeMail) {
    // Domain-only: a real signal but not proof of the org's canonical name → suggest.
    return { name: dom, domain: dom, confidence: 'suggested' };
  }
  return { name: null, domain: null, confidence: 'none' };
}
