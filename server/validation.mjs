// Field validation for imported / edited testers (brief §1, §19).

import { normaliseMobile } from './store.mjs';

// Deliberately permissive but catches obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  if (!email) return false;
  return EMAIL_RE.test(String(email).trim());
}

// Accepts international / local mobile formats. Requires 8–15 digits after
// stripping formatting; may start with +.
export function isValidMobile(mobile) {
  if (!mobile) return false;
  const norm = normaliseMobile(mobile);
  return /^\+?\d{8,15}$/.test(norm);
}

// Extract a clean domain from a website/domain field (strips scheme, path, www).
export function cleanDomain(raw) {
  if (!raw) return '';
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
  s = s.split(/[/?#]/)[0];
  return s;
}

// Validate one candidate row. Returns { errors: [], warnings: [] }.
// Errors block a clean import for that row; warnings are informational.
export function validateRow(row) {
  const errors = [];
  const warnings = [];

  if (!row.first_name && !row.last_name && !row.company_name) {
    errors.push('Geen naam of bedrijf ingevuld');
  }
  if (!row.email && !row.mobile) {
    errors.push('Geen e-mail én geen mobiel — minstens één contactweg vereist');
  }
  if (row.email && !isValidEmail(row.email)) {
    errors.push('Ongeldig e-mailadres');
  }
  if (row.mobile && !isValidMobile(row.mobile)) {
    errors.push('Ongeldig mobiel nummer');
  }
  if (!row.first_name) {
    warnings.push('Geen voornaam — persoonlijk bericht wordt onpersoonlijk');
  }
  return { errors, warnings };
}
