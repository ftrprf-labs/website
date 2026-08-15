// Communication Layer — telephony (phase 1: click to call) + call-record timeline.
//
// Phase 1 uses the OFFICIALLY supported, non-hacky route: a `tel:` URI. Clicking a call action in
// Testerbeheer opens the native dialer — on an iPhone directly, or on a Mac through Apple Continuity
// (iPhone Cellular Calls / Wi-Fi Calling), which places the call over the existing KPN line. No UI
// automation, no screen scraping, no undocumented Apple APIs (§10, §17). The server never dials; it
// records the call INTENT + metadata so the call lands on the same relationship timeline as every
// other channel, and the human logs the outcome afterwards.
//
// Phase 2 (a real EU voice provider, e.g. Twilio Voice for provider consolidation with SMS) plugs in
// behind the SAME call_record + Activity model via phoneProvider().startCall / normalizeCallEvent —
// the Relationship Workspace does not change. Purchase/number activation stays a HUMAN ACTION.

import { withTransaction, query } from './db.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { channelAllowed } from './consent.mjs';
import { recordActivity } from './activity.mjs';
import { normaliseMobile } from '../store.mjs';

const VALID_OUTCOMES = ['ANSWERED', 'MISSED', 'COMPLETED', 'FAILED', 'RINGING'];

// E.164 (with leading +) from any national/international input, or null when implausible.
export function toE164(raw) {
  const digits = normaliseMobile(raw || '');   // returns country+number, no '+'
  return digits ? `+${digits}` : null;
}

// The click-to-call URI the browser/OS hands to the native dialer.
export function telUri(raw) {
  const e = toE164(raw);
  return e ? `tel:${e}` : null;
}

// Resolve the best phone number for a contact: an explicit override, else a PHONE/SMS channel
// identity, else the contact's mobile.
async function resolveNumber(tenantId, contactId, toNumber) {
  if (toNumber) return toNumber;
  if (!contactId) return null;
  const ci = (await query(
    `select value from channel_identity where tenant_id=$1 and contact_id=$2 and channel in ('PHONE','SMS','WHATSAPP')
      order by (channel='PHONE') desc, is_primary desc, verified desc limit 1`, [tenantId, contactId])).rows[0];
  if (ci && ci.value) return ci.value;
  const c = (await query('select mobile from contact where id=$1', [contactId])).rows[0];
  return c && c.mobile ? c.mobile : null;
}

// Initiate a click-to-call: consent-gate (PHONE service defaults to allow, explicit opt-out blocks),
// record the call intent, and return the tel: URI for the UI. The human confirms on their device.
export async function initiateClickToCall({ tenantId, contactId = null, conversationId = null, toNumber = null, fromNumber = null, userId = null }) {
  const tid = tenantId || await getDefaultTenantId();
  const number = await resolveNumber(tid, contactId, toNumber);
  const e164 = toE164(number);
  if (!e164) return { ok: false, reason: 'no_number' };

  // Same server-side consent gate as every other channel (§27). Fail-closed on explicit opt-out.
  const consent = await channelAllowed(tid, contactId, 'PHONE', 'service');
  if (!consent.allowed) return { ok: false, reason: 'consent_blocked', consent };

  const orgId = contactId ? (await query('select organization_id from contact where id=$1', [contactId])).rows[0]?.organization_id || null : null;
  const rec = await query(
    `insert into call_record(tenant_id, conversation_id, contact_id, organization_id, direction, provider, from_number, to_number, status, started_at)
     values ($1,$2,$3,$4,'OUTBOUND','click_to_call',$5,$6,'RINGING', now()) returning id`,
    [tid, conversationId, contactId, orgId, fromNumber, e164]);
  const callRecordId = rec.rows[0].id;
  await recordActivity({ tenantId: tid, type: 'call_started', channel: 'PHONE', contactId, organizationId: orgId, conversationId, actorUserId: userId, meta: { callRecordId, method: 'click_to_call', to: e164 } });
  return { ok: true, callRecordId, tel: `tel:${e164}`, e164, consent };
}

// Log the human-entered outcome of a call (answered/missed/completed/failed + optional duration and
// a short human summary). This is how a manually placed call becomes durable relationship history.
export async function logCallOutcome({ tenantId, callRecordId, status, durationSeconds = null, summary = null, note = null, userId = null }) {
  const tid = tenantId || await getDefaultTenantId();
  const outcome = String(status || '').toUpperCase();
  if (!VALID_OUTCOMES.includes(outcome)) return { ok: false, reason: 'bad_status' };
  const dur = Number.isFinite(Number(durationSeconds)) && Number(durationSeconds) >= 0 ? Number(durationSeconds) : null;

  const result = await withTransaction(async (client) => {
    const cr = (await client.query('select id, contact_id, organization_id, conversation_id from call_record where id=$1 and tenant_id=$2', [callRecordId, tid])).rows[0];
    if (!cr) return null;
    const answered = outcome === 'ANSWERED' || outcome === 'COMPLETED';
    await client.query(
      `update call_record set status=$2, duration_seconds=coalesce($3, duration_seconds),
         summary=coalesce($4, summary), answered_at=case when $5 and answered_at is null then now() else answered_at end,
         ended_at=case when $6 then now() else ended_at end
       where id=$1`,
      [callRecordId, outcome, dur, summary, answered, outcome !== 'RINGING']);
    return cr;
  });
  if (!result) return { ok: false, reason: 'not_found' };
  await recordActivity({ tenantId: tid, type: 'call_logged', channel: 'PHONE', contactId: result.contact_id, organizationId: result.organization_id, conversationId: result.conversation_id, actorUserId: userId, meta: { callRecordId, status: outcome, duration_seconds: dur, note: note ? String(note).slice(0, 500) : null } });
  return { ok: true, callRecordId, status: outcome };
}

// List a contact's calls for the relationship timeline (metadata only; no recording/transcript
// unless those explicit capabilities are ever enabled).
export async function listCalls(tenantId, contactId, limit = 100) {
  const tid = tenantId || await getDefaultTenantId();
  return (await query(
    `select id, direction, provider, from_number, to_number, status, started_at, answered_at, ended_at, duration_seconds, summary
       from call_record where tenant_id=$1 and contact_id=$2 order by created_at desc limit $3`,
    [tid, contactId, limit])).rows;
}
