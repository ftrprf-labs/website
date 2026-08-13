// Real data normalisation for name fields (brief §36). Applied server-side at
// the single write choke point (store.pickFields) so every route — manual add,
// edit, CSV, XLSX, future Pass-the-Lens intake — stores the same clean value.
// This is data normalisation, NOT CSS presentation.
//
// RULE — person names (first_name, last_name):
//   trim + collapse internal whitespace; the FIRST WORD gets an upper-case first
//   letter and its remainder lower-cased; every following word is preserved.
//     edwin / EDWIN / eDWIN → Edwin ; pavert / PAVERT → Pavert
//     van de Pavert → Van de Pavert ; de Vries → De Vries
//
// RULE — company_name (conservative, brand-safe):
//   trim + collapse whitespace; capitalise the first letter ONLY when the first
//   word is entirely lower-case letters; otherwise the existing capitalisation
//   is preserved untouched (so AI Labs, FTRLABS, McKinsey, iDEAL stay as typed).
//     maculis → Maculis ; maculis labs → Maculis labs ; ftrprf labs → Ftrprf labs
//   KNOWN LIMITATION: brand de-capitalisation (MACULIS → Maculis) is NOT done,
//   because it is mechanically indistinguishable from FTRLABS → FTRLABS. That
//   needs a brand allow-list / product decision — see report.

function tidy(s) {
  return String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
}

function capFirstLowerRest(word) {
  const chars = [...word];
  if (!chars.length) return word;
  return chars[0].toLocaleUpperCase('nl') + chars.slice(1).join('').toLocaleLowerCase('nl');
}

export function normalizePersonName(input) {
  const t = tidy(input);
  if (!t) return '';
  const words = t.split(' ');
  words[0] = capFirstLowerRest(words[0]);
  return words.join(' ');
}

// Small explicit brand allow-list (brief §11). Only these known brands are
// re-cased; unknown brands are never guessed.
const BRANDS = new Map([
  ['maculis', 'Maculis'],
  ['maculis ai', 'Maculis AI'],
  ['ftrlabs', 'FTRLABS'],
  ['ideal', 'iDEAL'],
  ['mckinsey', 'McKinsey'],
]);

export function normalizeCompany(input) {
  const t = tidy(input);
  if (!t) return '';
  const brand = BRANDS.get(t.toLowerCase());
  if (brand) return brand;
  const words = t.split(' ');
  // Only lift a fully-lowercase first word; never rewrite existing brand casing.
  if (/^\p{Ll}[\p{Ll}\p{M}]*$/u.test(words[0])) {
    const chars = [...words[0]];
    words[0] = chars[0].toLocaleUpperCase('nl') + chars.slice(1).join('');
  }
  return words.join(' ');
}
