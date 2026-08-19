// Communication Layer — per-channel / per-purpose consent (§27, §28, §74).
//
// Consent is CONTEXTUAL, never a single boolean. A contact can allow service e-mail, allow
// WhatsApp, but refuse SMS. This gate decides whether an OUTBOUND message may go on a given
// channel for a given purpose, using explicit communication_preference rows on top of a
// conservative default policy. Opt-out is first-class and always wins. The gate is enforced
// SERVER-SIDE on send — hiding a button in the UI is never the control.

import { query } from './db.mjs';

// purpose ∈ 'service' (relationship reply) | 'research' (First Five) | 'commercial' | 'privacy'
// Effective rule per channel/purpose:
//   'allow'          → allowed unless an explicit opt-out exists
//   'require_opt_in' → allowed ONLY with an explicit allowed=true preference (WhatsApp/SMS need opt-in)
const DEFAULT_POLICY = {
  EMAIL:    { service: 'allow', research: 'allow', commercial: 'require_opt_in', privacy: 'allow' },
  WHATSAPP: { service: 'require_opt_in', research: 'require_opt_in', commercial: 'require_opt_in' },
  SMS:      { service: 'require_opt_in', research: 'require_opt_in', commercial: 'require_opt_in' },
  PHONE:    { service: 'allow', research: 'allow', commercial: 'require_opt_in' },
  // Mijn Maculis is not a channel you reach someone ON. The answer is placed in the customer's own
  // authenticated environment, in the thread they started themselves, and it leaves the building
  // nowhere. There is therefore nothing to consent to for service and research: the customer came
  // to us. Commercial stays opt-in, because "their own environment" is not a licence to sell there.
  // The separate e-mail ANNOUNCEMENT that an answer is waiting DOES leave the building, and that is
  // an ordinary EMAIL send that passes this same gate.
  MIJN_MACULIS: { service: 'allow', research: 'allow', commercial: 'require_opt_in', privacy: 'allow' },
};

function defaultRule(channel, purpose) {
  return (DEFAULT_POLICY[channel] || {})[purpose] || 'require_opt_in';
}

// Decide if an outbound send is allowed. contactId may be null (e.g. replying to an unknown inbound
// sender): then EMAIL/PHONE service replies are allowed (they contacted us) but opt-in channels are
// blocked (no verified opted-in identity to send to).
export async function channelAllowed(tenantId, contactId, channel, purpose = 'service') {
  const rule = defaultRule(channel, purpose);
  if (!contactId) {
    if (rule === 'allow') return { allowed: true, reason: 'no_contact_default_allow', basis: 'default' };
    return { allowed: false, reason: 'no_opted_in_identity', basis: 'default' };
  }
  const rows = (await query(
    `select channel, purpose, allowed, withdrawn_at from communication_preference
      where tenant_id=$1 and contact_id=$2 and channel=$3`, [tenantId, contactId, channel])).rows;

  // Explicit opt-out on this channel (any matching purpose, not withdrawn) always blocks.
  const optOut = rows.find((r) => (r.purpose === purpose || r.purpose === 'all') && r.allowed === false && !r.withdrawn_at);
  if (optOut) return { allowed: false, reason: 'opted_out', basis: 'preference' };

  const optIn = rows.find((r) => (r.purpose === purpose || r.purpose === 'all') && r.allowed === true && !r.withdrawn_at);
  if (optIn) return { allowed: true, reason: 'opted_in', basis: 'preference' };

  if (rule === 'allow') return { allowed: true, reason: 'default_allow', basis: 'default' };
  return { allowed: false, reason: 'opt_in_required', basis: 'default' };
}

// Per-channel consent snapshot for the composer UI (§26): what the user may pick, and why not.
export async function channelConsentState(tenantId, contactId) {
  const channels = ['EMAIL', 'WHATSAPP', 'SMS', 'PHONE', 'MIJN_MACULIS'];
  const out = {};
  for (const ch of channels) {
    // eslint-disable-next-line no-await-in-loop
    out[ch] = await channelAllowed(tenantId, contactId, ch, 'service');
  }
  return out;
}

// Record (or update) a per-channel/purpose preference with provenance. Opt-out is just allowed=false.
export async function setPreference(tenantId, contactId, { channel, purpose = 'service', allowed, source = 'manual', legalBasis = null, evidence = null, actorUserId = null }) {
  await query(
    `insert into communication_preference(tenant_id, contact_id, channel, purpose, allowed, legal_basis, source, evidence, actor_user_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (tenant_id, contact_id, channel, purpose)
     do update set allowed=excluded.allowed, legal_basis=excluded.legal_basis, source=excluded.source,
                   evidence=excluded.evidence, actor_user_id=excluded.actor_user_id, at=now(), withdrawn_at=null`,
    [tenantId, contactId, channel, purpose, allowed, legalBasis, source, evidence, actorUserId]);
  return { ok: true };
}

export async function listPreferences(tenantId, contactId) {
  return (await query(
    `select channel, purpose, allowed, legal_basis, source, at, withdrawn_at
       from communication_preference where tenant_id=$1 and contact_id=$2 order by channel, purpose`,
    [tenantId, contactId])).rows;
}
