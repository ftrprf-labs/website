// Preview-only seed for the staging Cockpit. NOT for production.
//
// The preview runs against its OWN isolated database. To let Slice 1 + Slice 2 be used the moment
// the URL opens, this seeds a few clearly-labelled DEMONSTRATION relations and runs the REAL copilot
// on each, so the understanding, the prepared next moves and the memory proposals are genuine engine
// output (real backend state), not front-end fixtures.
//
// Safety by construction:
//   - runs ONLY when PREVIEW_SEED is truthy AND the Communication Layer is enabled;
//   - idempotent: does nothing if the tenant already has any contact (never duplicates, never
//     overwrites real data). On the shared production database (no PREVIEW_SEED) this file is inert.
//   - additive only; never deletes.
//
// Everything here flows through the same services the cockpit uses. Outbound stays mocked at the
// transport layer, so nothing is ever sent.

import { query } from './db.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { runCopilot } from './ai/copilot.mjs';

function enabled() {
  return /^(1|true|yes|on)$/i.test(process.env.PREVIEW_SEED || '');
}

// Clearly-labelled demonstration relations. Fictional; no real person or customer.
const RELATIONS = [
  {
    org: 'Coöperatie Noorderlicht', domain: 'noorderlicht.coop',
    first: 'Jean-Baptiste', last: 'Vandenberghe', email: 'jb@noorderlicht.coop', mobile: '+32470112233', role: 'Coördinator',
    subject: 'Re: de tweede sessie',
    inbound: 'Dank voor de eerste sessie. Zou de tweede sessie deze maand nog kunnen? We willen graag door.',
  },
  {
    org: 'Buurtwerk De Brug', domain: 'debrug.be',
    first: 'Kim', last: 'De Vos', email: 'kim@debrug.be', mobile: '+32470998877', role: 'Communicatie',
    subject: 'Vraag over arbeidsmarktcommunicatie',
    inbound: 'Kunnen jullie ook naar arbeidsmarktcommunicatie kijken? We willen graag verder met dezelfde blik.',
  },
  {
    org: 'Stadsatelier Lumen', domain: 'lumen.city',
    first: 'Samir', last: 'El Amrani', email: 'samir@lumen.city', mobile: null, role: 'Directeur',
    subject: 'Korte terugkoppeling',
    inbound: 'Bedankt, we hebben het intern besproken. Ik laat snel iets weten.',
  },
];

export async function previewSeedOnBoot() {
  if (!enabled()) return { skipped: true, reason: 'PREVIEW_SEED off' };
  try {
    const tenantId = await getDefaultTenantId();
    const existing = (await query('select count(*)::int n from contact where tenant_id=$1', [tenantId])).rows[0].n;
    if (existing > 0) return { skipped: true, reason: 'already seeded' };

    let seeded = 0;
    for (const r of RELATIONS) {
      const org = (await query(
        'insert into organization(tenant_id,name,primary_domain) values ($1,$2,$3) returning id',
        [tenantId, r.org, r.domain])).rows[0].id;
      const contact = (await query(
        `insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,mobile,role)
         values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
        [tenantId, org, r.email, r.first, r.last, r.email, r.mobile, r.role])).rows[0].id;
      await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL',$3,true)", [tenantId, contact, r.email]);
      const conv = (await query(
        `insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at)
         values ($1,$2,$3,'EMAIL',false,'NEW',$4, now(), now()) returning id`,
        [tenantId, contact, org, r.subject])).rows[0].id;
      const msg = (await query(
        `insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at)
         values ($1,$2,'INBOUND','EMAIL',$3,$4,$5,'RECEIVED', now()) returning id`,
        [tenantId, conv, r.email, r.subject, r.inbound])).rows[0].id;
      // REAL intelligence: same call the inbound pipeline makes. Produces the ai_draft
      // (summary/intent/suggested_actions) and proposes relationship memory.
      await runCopilot({ conversationId: conv, messageId: msg }).catch(() => {});
      seeded += 1;
    }
    console.log(`  Preview  : ${seeded} demonstratierelatie(s) geseed (echte copilot-output)`);
    return { ok: true, seeded };
  } catch (e) {
    console.log(`  Preview  : seed uitgesteld (${e.message})`);
    return { ok: false, error: String(e.message || e) };
  }
}
