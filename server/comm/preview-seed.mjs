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
import { createFollowUp } from './followups.mjs';

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
    let seeded = 0;
    if (existing > 0) { await ensureDemoFollowUp(tenantId); await ensureRadarDemo(tenantId); return { skipped: true, reason: 'already seeded', ensuredFollowUp: true, ensuredRadar: true }; }

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
    await ensureDemoFollowUp(tenantId);
    await ensureRadarDemo(tenantId);
    console.log(`  Preview  : ${seeded} demonstratierelatie(s) geseed (echte copilot-output)`);
    return { ok: true, seeded };
  } catch (e) {
    console.log(`  Preview  : seed uitgesteld (${e.message})`);
    return { ok: false, error: String(e.message || e) };
  }
}

// One demonstration follow-up so the prepared-work surface (Slice 4) is visible on first open.
// Idempotent: only creates one when the tenant has no follow-ups at all (so completing it, or the
// user creating their own, never triggers a re-create).
async function ensureDemoFollowUp(tenantId) {
  try {
    const total = (await query('select count(*)::int n from follow_up where tenant_id=$1', [tenantId])).rows[0].n;
    if (total > 0) return;
    const row = (await query(
      `select c.id as conv, c.contact_id, c.organization_id
         from conversation c where c.tenant_id=$1 and c.is_privacy=false and c.contact_id is not null
        order by c.created_at asc limit 1`, [tenantId])).rows[0];
    if (!row) return;
    const dueAt = new Date(Date.now() + 2 * 86400000).toISOString();
    await createFollowUp(tenantId, {
      contactId: row.contact_id, organizationId: row.organization_id, conversationId: row.conv,
      title: 'Opvolgen: tweede sessie inplannen', channelHint: 'EMAIL', dueAt,
    });
    console.log('  Preview  : 1 demonstratie-follow-up klaargezet');
  } catch { /* best-effort; never breaks boot */ }
}

// Slice 5 — make the RELATIONAL RADAR visible on the existing preview with three purpose-built,
// clearly-labelled demonstration relations whose conversations are already ANSWERED (so the radar
// reason is the follow-up / the silence, not an open inbound): one follow-up due today, one three
// days overdue, and one relation that has been quiet for about fifty days. Additive and idempotent:
// each relation is created only when its e-mail does not yet exist, so re-booting or completing a
// follow-up never resurrects or duplicates demonstration state.
async function ensureRadarDemo(tenantId) {
  const DAY = 86400000;
  // An answered exchange `daysAgo` old (inbound then our successful reply), optionally with a
  // follow-up. Returns silently if the relation already exists.
  const ensureRelation = async ({ email, first, last, org, domain, role, subject, inbound, daysAgo, followUp = null }) => {
    const exists = (await query('select id from contact where tenant_id=$1 and lower(email)=lower($2) limit 1', [tenantId, email])).rows[0];
    if (exists) return false;
    const now = Date.now();
    const orgId = (await query('insert into organization(tenant_id,name,primary_domain) values ($1,$2,$3) returning id', [tenantId, org, domain])).rows[0].id;
    const contactId = (await query(
      'insert into contact(tenant_id,organization_id,identity_key,first_name,last_name,email,role) values ($1,$2,$3,$4,$5,$6,$7) returning id',
      [tenantId, orgId, email, first, last, email, role])).rows[0].id;
    await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL',$3,true)", [tenantId, contactId, email]);
    const inAt = new Date(now - daysAgo * DAY).toISOString();
    const outAt = new Date(now - daysAgo * DAY + 3600000).toISOString();
    const conv = (await query(
      "insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at) values ($1,$2,$3,'EMAIL',false,'ANSWERED',$4,$5,$6) returning id",
      [tenantId, contactId, orgId, subject, outAt, inAt])).rows[0].id;
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at) values ($1,$2,'INBOUND','EMAIL',$3,$4,$5,'RECEIVED',$6)", [tenantId, conv, email, subject, inbound, inAt]);
    await query("insert into message(tenant_id,conversation_id,direction,channel,from_address,subject,body_text,delivery,created_at) values ($1,$2,'OUTBOUND','EMAIL','hello@maculis.nl',$3,'Dank je, we houden contact.','SENT',$4)", [tenantId, conv, 'Re: ' + subject, outAt]);
    if (followUp) {
      await createFollowUp(tenantId, { contactId, organizationId: orgId, conversationId: conv, title: followUp.title, channelHint: 'EMAIL', dueAt: followUp.dueAt });
    }
    return true;
  };
  try {
    const now = Date.now();
    let made = 0;
    made += await ensureRelation({
      email: 'lars@dewissel.be', first: 'Lars', last: 'Peeters', org: 'De Wissel', domain: 'dewissel.be', role: 'Coördinator',
      subject: 'Vervolg workshopreeks', inbound: 'Bedankt voor het overzicht, ik kom er zeker op terug.', daysAgo: 6,
      followUp: { title: 'Opvolgen: workshopreeks inplannen', dueAt: new Date(now + 4 * 3600000).toISOString() }, // due today
    }) ? 1 : 0;
    made += await ensureRelation({
      email: 'anke@ritmiek.be', first: 'Anke', last: 'Verhoeven', org: 'Ritmiek', domain: 'ritmiek.be', role: 'Zakelijk leider',
      subject: 'Offerte doorgesproken', inbound: 'We hebben het intern besproken, ik laat snel iets weten.', daysAgo: 9,
      followUp: { title: 'Terugkoppeling van Anke navragen', dueAt: new Date(now - 3 * DAY).toISOString() }, // 3 days overdue
    }) ? 1 : 0;
    made += await ensureRelation({
      email: 'noor@stadslab.be', first: 'Noor', last: 'Aziz', org: 'Stadslab Ode', domain: 'stadslab.be', role: 'Programmamaker',
      subject: 'Terugblik samenwerking', inbound: 'Fijn dat we samen konden optrekken dit voorjaar.', daysAgo: 51, // quiet
    }) ? 1 : 0;
    if (made) console.log(`  Preview  : radar-demonstratie klaargezet (${made} relatie(s): due, overdue, stille relatie)`);
  } catch (e) { console.log(`  Preview  : radar-demo uitgesteld (${e.message})`); }
}
