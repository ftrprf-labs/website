// Central configuration for the Invitation Manager.
// Loads a local .env (simple parser, no dependency) and exposes typed config.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..');

// --- minimal .env loader (no dependency) ---------------------------------
function loadDotEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

export const config = {
  port: Number(process.env.PORT || 4321),
  host: process.env.HOST || '127.0.0.1',
  maculisHost: (process.env.MACULIS_HOST || 'https://maculis.ftrlabs.example').replace(/\/+$/, ''),
  // Shared server-to-server key for publishing participants to Maculis
  // (PUT {MACULIS_HOST}/api/participants). Empty → publish is not configured.
  maculisSyncKey: process.env.MACULIS_SYNC_KEY || '',
  // Read key for pulling Maculis session/evaluation results
  // (GET {MACULIS_HOST}/api/session/export?key=…). Empty → results view is off.
  maculisExportKey: process.env.MACULIS_EXPORT_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // E-mail sending contract (see server/mailer.mjs). No credentials in code:
  //   MAIL_TRANSPORT = ''    → not configured; the app never fake-sends.
  //   MAIL_TRANSPORT = http  → POST each mail to MAIL_API_URL (Bearer MAIL_API_KEY).
  //   MAIL_TRANSPORT = mock  → deterministic TEST transport (local verification only).
  mailTransport: (process.env.MAIL_TRANSPORT || '').toLowerCase(),
  mailApiUrl: process.env.MAIL_API_URL || '',
  mailApiKey: process.env.MAIL_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || '',
  dataDir: join(ROOT, 'data'),
  dbFile: join(ROOT, 'data', 'invitations.json'),
  // The only campaign this MVP builds for (see brief §12).
  campaign: 'MACULIS_FIRST_FIVE',
};

// Default WhatsApp/e-mail message template (brief §6). Editable at runtime
// through the settings UI; this is the seed value.
export const DEFAULT_TEMPLATE = {
  whatsapp:
    'Hoi {first_name},\n\n' +
    'ik wil je graag laten kennismaken met iets waar we aan werken: Maculis.\n\n' +
    'Maculis kijkt met andere ogen naar wat er op je website zichtbaar is.\n\n' +
    'Ik ben benieuwd wat je ervan vindt.\n\n' +
    'Dit is jouw persoonlijke link:\n{personal_url}',
  emailSubject: 'Je bent uitgenodigd om Maculis te testen',
  emailBody:
    'Hoi {first_name},\n\n' +
    'We nodigen je graag uit om Maculis te testen.\n\n' +
    'Via onderstaande persoonlijke link kun je de ervaring bekijken:\n{personal_url}\n\n' +
    'Alvast bedankt voor het meekijken en je feedback.\n\n' +
    'Groet,\nLud',
};
