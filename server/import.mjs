// Import pipeline for testers (brief §1).
//
// Handles:
//   - CSV (robust hand-written parser: quotes, commas/semicolons, CRLF)
//   - XLSX / Excel (via SheetJS if available; degrades gracefully if not)
//   - fuzzy column recognition -> canonical field mapping
//   - per-row validation (invalid e-mail / mobile flagged, not dropped)
//   - duplicate detection (within the file AND against existing data)
//
// The parser returns a *preview* only. Nothing is written until the admin
// confirms — so data is never silently overwritten (brief §1).

import { cleanDomain, validateRow } from './validation.mjs';
import { findDuplicate, listInvitations, normaliseMobile } from './store.mjs';

// Canonical fields and the header aliases (NL + EN) we recognise.
const FIELD_ALIASES = {
  first_name: ['first_name', 'firstname', 'first name', 'voornaam', 'first', 'fname', 'naam voor'],
  last_name: ['last_name', 'lastname', 'last name', 'achternaam', 'last', 'lname', 'surname'],
  company_name: ['company_name', 'company', 'companyname', 'bedrijf', 'bedrijfsnaam', 'organisatie', 'organization', 'org'],
  email: ['email', 'e-mail', 'e mail', 'mail', 'emailadres', 'e-mailadres', 'email address'],
  mobile: ['mobile', 'mobiel', 'mobile number', 'mobiel nummer', 'telefoon', 'phone', 'gsm', 'tel', 'telefoonnummer'],
  domain: ['domain', 'domein', 'website', 'site', 'url', 'web', 'webadres'],
};

function normHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Given raw header names, produce a mapping { columnIndex -> canonicalField }.
// Unrecognised columns map to null (ignored). Auto-detected, admin can override.
export function autoMap(headers) {
  const mapping = {};
  const used = new Set();
  headers.forEach((h, i) => {
    const nh = normHeader(h);
    let matched = null;
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (used.has(field)) continue;
      if (aliases.some((a) => a === nh) || aliases.some((a) => nh.includes(a))) {
        matched = field;
        break;
      }
    }
    if (matched) used.add(matched);
    mapping[i] = matched;
  });
  return mapping;
}

// --- CSV parsing ----------------------------------------------------------

// Detect delimiter by counting candidates in the header line.
function detectDelimiter(headerLine) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of headerLine) if (ch in counts) counts[ch]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ',';
}

// Full RFC-4180-ish CSV parser (handles quoted fields, escaped quotes, newlines
// inside quotes, and either , ; or tab delimiters).
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, ''); // strip BOM
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const delim = detectDelimiter(firstLine);

  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && clean[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty rows.
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
}

// --- XLSX parsing (optional dependency) -----------------------------------

async function parseXlsx(buffer) {
  let XLSX;
  try {
    XLSX = (await import('xlsx')).default || (await import('xlsx'));
  } catch {
    const e = new Error(
      'XLSX-ondersteuning is niet geïnstalleerd. Exporteer je bestand als CSV, ' +
        "of voer `npm install` uit om Excel-import in te schakelen."
    );
    e.code = 'NO_XLSX';
    throw e;
  }
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  return rows.map((r) => r.map((c) => (c == null ? '' : String(c))));
}

// --- Public: build an import preview --------------------------------------

// `input` = { filename, contentType, text?, buffer? }
// Returns a preview object the UI renders BEFORE committing.
export async function buildPreview(input) {
  const name = (input.filename || '').toLowerCase();
  const isXlsx =
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    (input.contentType || '').includes('sheet') ||
    (input.contentType || '').includes('excel');

  let matrix;
  if (isXlsx) {
    matrix = await parseXlsx(input.buffer);
  } else {
    matrix = parseCsv(input.text);
  }

  if (!matrix.length) {
    return { headers: [], mapping: {}, rows: [], summary: emptySummary() };
  }

  const headers = matrix[0].map((h) => String(h).trim());
  const mapping = autoMap(headers);
  const dataRows = matrix.slice(1);

  const existing = listInvitations();
  const seenInFile = [];
  const rows = [];
  const summary = emptySummary();

  for (const raw of dataRows) {
    const rec = applyMapping(raw, mapping);
    const { errors, warnings } = validateRow(rec);

    // Duplicate detection: against existing store AND earlier rows in this file.
    let duplicate = null;
    const dupExisting = findDuplicate(rec, existing);
    const dupInFile = findDuplicate(rec, seenInFile);
    if (dupExisting) duplicate = { type: 'existing', label: describe(dupExisting) };
    else if (dupInFile) duplicate = { type: 'file', label: describe(dupInFile) };

    seenInFile.push(rec);

    let action = 'import';
    if (errors.length) action = 'error';
    else if (duplicate) action = 'duplicate';

    rows.push({ ...rec, _errors: errors, _warnings: warnings, _duplicate: duplicate, _action: action });

    summary.total++;
    if (action === 'import') summary.ok++;
    if (action === 'error') summary.invalid++;
    if (action === 'duplicate') summary.duplicate++;
  }

  return { headers, mapping, fields: Object.keys(FIELD_ALIASES), rows, summary };
}

function applyMapping(rawRow, mapping) {
  const rec = { first_name: '', last_name: '', company_name: '', email: '', mobile: '', domain: '' };
  for (const [idx, field] of Object.entries(mapping)) {
    if (!field) continue;
    const val = rawRow[Number(idx)];
    if (val == null) continue;
    rec[field] = String(val).trim();
  }
  rec.domain = cleanDomain(rec.domain);
  rec.mobile = rec.mobile ? normaliseMobile(rec.mobile) : '';
  rec.email = rec.email.toLowerCase();
  return rec;
}

function describe(r) {
  const who = [r.first_name, r.last_name].filter(Boolean).join(' ');
  return who || r.company_name || r.email || r.mobile || 'onbekend';
}

function emptySummary() {
  return { total: 0, ok: 0, invalid: 0, duplicate: 0 };
}

export { FIELD_ALIASES };
