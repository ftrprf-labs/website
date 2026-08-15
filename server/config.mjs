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

// Are we running in a real (non-local) deployment? Managed platforms (Render)
// set NODE_ENV=production. This flips several fail-closed safety checks on.
const PRODUCTION = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.PORT || 4321),
  host: process.env.HOST || '127.0.0.1',
  production: PRODUCTION,
  // INTERNAL server-to-server base for Maculis (publish PUT, session-export GET).
  // Override per environment via MACULIS_HOST. In a single-URL deployment this is
  // the same public HTTPS URL as the Journey; the split below lets them differ.
  maculisHost: (process.env.MACULIS_HOST || 'https://www.maculis.nl').replace(/\/+$/, ''),
  // PUBLIC base URL for the tester's personal Journey link ({base}/?p=<token>).
  // This is what a tester opens on their phone, so it must be a browser-reachable
  // HTTPS URL and must NEVER be localhost in production (fail-closed at startup).
  // Falls back to MACULIS_HOST when MACULIS_PUBLIC_URL is not set.
  maculisPublicUrl: (process.env.MACULIS_PUBLIC_URL || process.env.MACULIS_HOST || 'https://www.maculis.nl').replace(/\/+$/, ''),
  // Server session-signing secret (admin cookie HMAC). MUST be set in production
  // so admin sessions survive restarts/redeploys; local runs fall back to a
  // per-process random secret (see auth.mjs).
  authSecret: process.env.AUTH_SECRET || '',
  // Shared server-to-server key for publishing participants to Maculis
  // (PUT {MACULIS_HOST}/api/participants). Empty → publish is not configured.
  maculisSyncKey: process.env.MACULIS_SYNC_KEY || '',
  // Read key for pulling Maculis session/evaluation results
  // (GET {MACULIS_HOST}/api/session/export?key=…). Empty → results view is off.
  maculisExportKey: process.env.MACULIS_EXPORT_KEY || '',
  // Separate server-to-server key for the automatic intake endpoint
  // (POST /api/intake, used by Pass the Lens). Empty → intake is DISABLED
  // (returns 503); never a public unauthenticated intake.
  intakeKey: process.env.INTAKE_KEY || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // E-mail sending contract (see server/mailer.mjs). No credentials in code:
  //   MAIL_TRANSPORT = ''      → not configured; the app never fake-sends.
  //   MAIL_TRANSPORT = resend  → transactional send via Resend (MAIL_API_KEY +
  //                              MAIL_FROM). Recommended for online acceptance.
  //   MAIL_TRANSPORT = http    → POST each mail to MAIL_API_URL (Bearer MAIL_API_KEY).
  //   MAIL_TRANSPORT = mock    → deterministic TEST transport (local verification only).
  mailTransport: (process.env.MAIL_TRANSPORT || '').toLowerCase(),
  mailApiUrl: process.env.MAIL_API_URL || '',
  mailApiKey: process.env.MAIL_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || '',
  // Where the JSON store lives. Defaults to ./data for local runs; in a managed
  // deployment point DATA_DIR at a PERSISTENT disk mount (e.g. /var/data on
  // Render) so tester data survives restarts and redeploys.
  dataDir: process.env.DATA_DIR || join(ROOT, 'data'),
  dbFile: join(process.env.DATA_DIR || join(ROOT, 'data'), 'invitations.json'),
  // The only campaign this MVP builds for (see brief §12).
  campaign: 'MACULIS_FIRST_FIVE',

  // ---- Communication / Relationship Layer (Build Phase 1) --------------------------------
  // OFF unless BOTH the flag and a database are set, so the live Invitation Manager / First
  // Five flow is unaffected until we deliberately switch it on. No secrets in code.
  commLayerEnabled: /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || ''),
  databaseUrl: process.env.DATABASE_URL || '',
  // Resend inbound (Receiving). MAIL_API_KEY (already used for outbound) doubles as the
  // Receiving-API key; the webhook signing secret is set AFTER the webhook is created in Resend.
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  // Recipient allowlist: only these @maculis.nl addresses are processed; others are ignored.
  commMailboxes: (process.env.COMM_MAILBOXES || 'hello@maculis.nl,privacy@maculis.nl')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  // AI Communication Copilot. Provider key is a human-provided secret; without it the copilot
  // runs in mock mode (no external call) so the rest of the pipeline is fully testable.
  aiProvider: (process.env.COMM_AI_PROVIDER || 'mock').toLowerCase(),
  aiApiKey: process.env.COMM_AI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
  aiModel: process.env.COMM_AI_MODEL || 'claude-sonnet-5',
  // Sender identity for invitations (personalises {sender_first_name}); falls back per-request
  // to the logged-in user. Never hardcoded to a name.
  senderFirstName: process.env.SENDER_FIRST_NAME || '',
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
