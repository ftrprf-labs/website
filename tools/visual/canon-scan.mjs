// Statische nulmeting van de Maculis Cockpit tegen Visual DNA v1.0.
//
// Leest de Cockpit-bronbestanden en telt elke waarde die de canon vastlegt: kleur, hairline,
// easing, letter, radius, spacing, oneindige beweging en percentagevormen. Geen oordeel over
// smaak, alleen "staat deze waarde in de canon, ja of nee".
//
//   node tools/visual/canon-scan.mjs            -> leesbaar rapport
//   node tools/visual/canon-scan.mjs --json     -> machineleesbaar

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILES = [
  'public/cockpit.css',
  'public/cockpit.html',
  'public/cockpit.js',
  'public/cockpit-live.html',
  'public/cockpit-live.js',
];

// ---- de canon, als platte waardenlijst -----------------------------------------------------
const CANON_HEX = new Set([
  // ink
  'f7f1e6', 'ece2d4', 'a89a86', '8b8377', '251a10', '1d130b', '14120f', '0f0a06', '080503', '0a0b10',
  // merk
  'c8894a', 'e6a866', '8a5f38', 'd7b36a', 'f3e387', 'b0894a',
  // semantiek nacht en werklicht
  '8a79e0', '1f9470', 'e5674f',
  // semantiek dag
  '925826', '5f4fb0', '097159', '6b6152', 'a33422', '17120c', '8a8073', 'ece0c9', 'fdfbf6', 'ffffff',
  // grafieken
  'c07c3e', 'a8672f', '0b8a6e',
]);
const CANON_EASE = 'cubic-bezier(.22,.61,.36,1)';
const CANON_RADII = new Set(['10px', '16px', '20px', '999px', '50%']);
const CANON_SPACE = new Set(['0', '0px', '1px', '2px', '4px', '8px', '12px', '16px', '24px', '40px', '64px']);

const norm = (s) => s.replace(/\s+/g, '').toLowerCase();
const expand = (h) => (h.length === 3 ? h.split('').map((c) => c + c).join('') : h);

// ---- scanners ------------------------------------------------------------------------------
function scanHex(src) {
  const out = new Map();
  for (const m of src.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    const hex = expand(m[1].toLowerCase());
    out.set(hex, (out.get(hex) || 0) + 1);
  }
  return out;
}

function scanRgba(src) {
  const out = new Map();
  for (const m of src.matchAll(/rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)/g)) {
    const key = `rgba(${m[1]},${m[2]},${m[3]},${m[4] ?? '1'})`;
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

function scanEase(src) {
  const out = new Map();
  for (const m of src.matchAll(/cubic-bezier\([^)]*\)/g)) {
    const key = norm(m[0]);
    out.set(key, (out.get(key) || 0) + 1);
  }
  // `var(--ease)` is de canonieke curve en telt niet als losse keyword-easing.
  for (const m of src.matchAll(/(?<![-\w])(ease-in-out|ease-out|ease-in|linear|ease)(?=[\s;,)])/g)) {
    const key = m[1];
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

function scanRadius(src) {
  const out = new Map();
  for (const m of src.matchAll(/border-radius:\s*([^;}"']+)/g)) {
    for (const v of m[1].trim().split(/\s+/)) {
      const key = v.replace(/[;]/, '');
      out.set(key, (out.get(key) || 0) + 1);
    }
  }
  return out;
}

function scanInfinite(src) {
  return [...src.matchAll(/[^;{}\n]*\binfinite\b[^;{}\n]*/g)].map((m) => m[0].trim());
}

function scanFonts(src) {
  const out = new Map();
  for (const m of src.matchAll(/font-family:\s*([^;}"']+)/g)) {
    const key = m[1].trim().replace(/\s+/g, ' ');
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

function scanPct(src) {
  // Percentagevormen in datavisualisatie (canon 11 verbiedt percentages, gauges en balken).
  const hits = [];
  for (const m of src.matchAll(/[^\n]*(?:kpi-bar|funnel-bar|progress|gauge|\bbar-fill\b|percent|procent|\bpct\b)[^\n]*/gi)) {
    hits.push(m[0].trim().slice(0, 160));
  }
  return hits;
}

function scanDashCopy(src) {
  // Streepje als stijlmiddel in ZICHTBARE copy: spatie-streepje-spatie binnen een Nederlandse
  // string- of tekstliteral. Code, URL's en comments blijven buiten beschouwing.
  const hits = [];
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--')) return;
    for (const m of line.matchAll(/(['"`])([^'"`\n]{6,}?)\1/g)) {
      const s = m[2];
      if (!/[ ][—–][ ]|[ ]-[ ]/.test(s)) continue;
      if (/^[a-z-]+$/i.test(s) || s.includes('://')) continue;
      if (!/[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/.test(s)) continue;
      hits.push(`${i + 1}: ${s.slice(0, 120)}`);
    }
  });
  return hits;
}

// ---- rapport -------------------------------------------------------------------------------
const report = { files: {}, totals: {} };
const allHex = new Map(); const allRgba = new Map(); const allEase = new Map();
const allRadius = new Map(); const allFonts = new Map();
let allInfinite = []; let allPct = []; let allDash = [];

const merge = (into, from) => { for (const [k, v] of from) into.set(k, (into.get(k) || 0) + v); };

for (const rel of FILES) {
  const src = await readFile(join(ROOT, rel), 'utf8');
  const hex = scanHex(src); const rgba = scanRgba(src); const ease = scanEase(src);
  const radius = scanRadius(src); const fonts = scanFonts(src);
  const inf = scanInfinite(src); const pct = scanPct(src); const dash = scanDashCopy(src);
  merge(allHex, hex); merge(allRgba, rgba); merge(allEase, ease);
  merge(allRadius, radius); merge(allFonts, fonts);
  allInfinite = allInfinite.concat(inf.map((s) => `${basename(rel)}  ${s}`));
  allPct = allPct.concat(pct.map((s) => `${basename(rel)}  ${s}`));
  allDash = allDash.concat(dash.map((s) => `${basename(rel)}  ${s}`));
  report.files[rel] = { hex: hex.size, rgba: rgba.size, ease: ease.size, radius: radius.size };
}

const offHex = [...allHex.entries()].filter(([h]) => !CANON_HEX.has(h)).sort((a, b) => b[1] - a[1]);
const onHex = [...allHex.entries()].filter(([h]) => CANON_HEX.has(h)).sort((a, b) => b[1] - a[1]);
const offEase = [...allEase.entries()].filter(([e]) => e !== CANON_EASE).sort((a, b) => b[1] - a[1]);
const offRadius = [...allRadius.entries()].filter(([r]) => !CANON_RADII.has(r) && !r.startsWith('var(')).sort((a, b) => b[1] - a[1]);
// Neutraal grijze hairline: rgba waarvan R, G en B binnen 12 van elkaar liggen (canon 6 verbiedt
// neutraal grijs), of een koude/neutrale kleur zonder warme hue.
const neutralRgba = [...allRgba.entries()].filter(([k]) => {
  const [r, g, b] = k.match(/\d+/g).map(Number);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  return max - min <= 12 && max > 0;
}).sort((a, b) => b[1] - a[1]);

report.totals = {
  hexUniek: allHex.size, hexCanoniek: onHex.length, hexAfwijkend: offHex.length,
  rgbaUniek: allRgba.size, rgbaNeutraalGrijs: neutralRgba.length,
  easeUniek: allEase.size, easeAfwijkend: offEase.length,
  radiusAfwijkend: offRadius.length,
  fontStacks: allFonts.size,
  oneindigeBeweging: allInfinite.length,
  percentagevormen: allPct.length,
  streepjesInCopy: allDash.length,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    ...report,
    offHex, onHex, offEase, offRadius, neutralRgba,
    fonts: [...allFonts.entries()], infinite: allInfinite, pct: allPct, dash: allDash,
  }, null, 2));
} else {
  const line = (s) => console.log(s);
  line('NULMETING — Maculis Cockpit tegenover Visual DNA v1.0 (tokens 1.0.3)');
  line('='.repeat(78));
  line('');
  line('TELLING');
  for (const [k, v] of Object.entries(report.totals)) line(`  ${k.padEnd(22)} ${v}`);
  line('');
  line(`AFWIJKENDE HEXKLEUREN (${offHex.length} uniek, ${offHex.reduce((a, b) => a + b[1], 0)} voorkomens)`);
  for (const [h, n] of offHex.slice(0, 60)) line(`  #${h}  ${String(n).padStart(3)}x`);
  if (offHex.length > 60) line(`  ... en nog ${offHex.length - 60}`);
  line('');
  line(`CANONIEKE HEXKLEUREN AANWEZIG (${onHex.length})`);
  for (const [h, n] of onHex) line(`  #${h}  ${String(n).padStart(3)}x`);
  line('');
  line(`AFWIJKENDE EASING (${offEase.length})`);
  for (const [e, n] of offEase) line(`  ${e.padEnd(34)} ${n}x`);
  line('');
  line(`NEUTRAAL GRIJZE RGBA, canon 6 verbiedt neutrale hairlines (${neutralRgba.length})`);
  for (const [k, n] of neutralRgba.slice(0, 30)) line(`  ${k.padEnd(30)} ${n}x`);
  if (neutralRgba.length > 30) line(`  ... en nog ${neutralRgba.length - 30}`);
  line('');
  line(`AFWIJKENDE RADII, canon 6 kent 10 / 16 / 20 / 999 (${offRadius.length})`);
  for (const [r, n] of offRadius.slice(0, 30)) line(`  ${r.padEnd(14)} ${n}x`);
  line('');
  line(`LETTERSTAPELS (${allFonts.size})`);
  for (const [f, n] of allFonts) line(`  ${String(n).padStart(3)}x  ${f.slice(0, 100)}`);
  line('');
  line(`ONEINDIGE BEWEGING, canon 8.1 verbiedt de lus (${allInfinite.length})`);
  for (const s of allInfinite.slice(0, 20)) line(`  ${s.slice(0, 150)}`);
  line('');
  line(`PERCENTAGE- EN GAUGEVORMEN, canon 11 (${allPct.length})`);
  for (const s of allPct.slice(0, 20)) line(`  ${s}`);
  line('');
  line(`STREEPJE ALS STIJLMIDDEL IN ZICHTBARE COPY (${allDash.length})`);
  for (const s of allDash.slice(0, 40)) line(`  ${s}`);
  if (allDash.length > 40) line(`  ... en nog ${allDash.length - 40}`);
}
