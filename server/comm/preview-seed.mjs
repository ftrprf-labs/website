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
import { recordWorkItem } from './work.mjs';
import { recordLensSummary } from './lens.mjs';

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
    if (existing > 0) { await ensureDemoFollowUp(tenantId); await ensureRadarDemo(tenantId); await ensureColleagueDemo(tenantId); await ensureLensDemo(tenantId); return { skipped: true, reason: 'already seeded', ensuredFollowUp: true, ensuredRadar: true, ensuredColleagues: true, ensuredLens: true }; }

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
    await ensureColleagueDemo(tenantId);
    await ensureLensDemo(tenantId);
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

// Slice 5 collaborative cockpit — DEMONSTRATION colleague work, so the collaborative model is visible
// before a real digital colleague is connected. Every item is explicitly marked as a fixture in its
// evidence (evidence.demo=true, source 'demo-fixture'): preview-only, additive, idempotent, and it
// NEVER claims a real external find. Once a real colleague lands work through recordWorkItem(), these
// demo items sit alongside it identically. Guarded by PREVIEW_SEED (inert in production/tests).
async function ensureColleagueDemo(tenantId) {
  const demoEvidence = (observations) => ({ demo: true, source: 'demo-fixture', observations });
  const has = async (originKey, dedupKey) =>
    Boolean((await query('select 1 from attention_item where tenant_id=$1 and origin_key=$2 and dedup_key=$3 limit 1', [tenantId, originKey, dedupKey])).rows[0]);
  const contactByEmail = async (email) =>
    (await query('select id, organization_id from contact where tenant_id=$1 and lower(email)=lower($2) limit 1', [tenantId, email])).rows[0] || null;
  const firstConv = async (contactId) =>
    (await query("select id from conversation where tenant_id=$1 and contact_id=$2 and is_privacy=false order by created_at asc limit 1", [tenantId, contactId])).rows[0] || null;
  try {
    let made = 0;
    // Growth: a possible new relation (a proposed lead, fictional). Approving it creates the relation.
    if (!(await has('growth', 'demo:lead:tibo@veldwerk.be'))) {
      await recordWorkItem(tenantId, {
        origin: { kind: 'AGENT', key: 'growth', label: 'Growth' }, owner: { kind: 'HUMAN', key: 'lud' },
        type: 'AGENT_PROPOSAL', proposedRelation: { name: 'Tibo Claes', org: 'Veldwerk Collectief', email: 'tibo@veldwerk.be' },
        title: 'Mogelijke nieuwe relatie: Tibo Claes (Veldwerk Collectief)',
        reason: 'Profiel sluit aan bij jullie werk rond buurtcommunicatie.',
        evidence: demoEvidence(['Werkt aan buurtcommunicatie in dezelfde regio', 'Deelde recent een oproep die bij Maculis past']),
        proposal: { summary: 'Toevoegen als prospect en later benaderen?', needs: 'approval', actions: ['create_relation'] },
        dedupKey: 'demo:lead:tibo@veldwerk.be',
      });
      made += 1;
    }
    // Gesprekscollega: a prepared answer on Kim's existing conversation (review).
    const kim = await contactByEmail('kim@debrug.be');
    if (kim && !(await has('conversation', 'demo:draft:kim'))) {
      const conv = await firstConv(kim.id);
      await recordWorkItem(tenantId, {
        origin: { kind: 'AGENT', key: 'conversation', label: 'Gesprekscollega' }, owner: { kind: 'HUMAN', key: 'lud' },
        type: 'AGENT_FINDING', relation: { contactId: kim.id, organizationId: kim.organization_id, conversationId: conv ? conv.id : null },
        title: 'Antwoord voorbereid voor Kim',
        reason: 'Een concept staat klaar om te bekijken en te versturen.',
        evidence: demoEvidence(['Kim vroeg naar arbeidsmarktcommunicatie']),
        proposal: { summary: 'Bekijk het concept en verstuur het als het klopt.', needs: 'review', actions: [] },
        dedupKey: 'demo:draft:kim',
      });
      made += 1;
    }
    // Relatiecollega: an unusual contact pattern on Samir (awareness → radar).
    const samir = await contactByEmail('samir@lumen.city');
    if (samir && !(await has('relationship', 'demo:pattern:samir'))) {
      await recordWorkItem(tenantId, {
        origin: { kind: 'AGENT', key: 'relationship', label: 'Relatiecollega' }, owner: { kind: 'HUMAN', key: 'lud' },
        type: 'AGENT_FINDING', relation: { contactId: samir.id, organizationId: samir.organization_id },
        title: 'Afwijkend contactpatroon bij Samir',
        reason: 'Het contact met Samir verloopt anders dan de afgelopen maanden.',
        evidence: demoEvidence(['Reactietijd nam toe', 'Toon werd korter dan gebruikelijk']),
        proposal: { summary: 'Goed om te weten. Geen directe actie nodig.', needs: 'awareness', actions: [] },
        dedupKey: 'demo:pattern:samir',
      });
      made += 1;
    }
    // Opvolgcollega: a compressed result — checked several, one needs you (approval).
    const anke = await contactByEmail('anke@ritmiek.be');
    if (anke && !(await has('followup', 'demo:check:anke'))) {
      await recordWorkItem(tenantId, {
        origin: { kind: 'AGENT', key: 'followup', label: 'Opvolgcollega' }, owner: { kind: 'HUMAN', key: 'lud' },
        type: 'APPROVAL_REQUIRED', relation: { contactId: anke.id, organizationId: anke.organization_id },
        title: 'Drie opvolgingen gecontroleerd. Eén vraagt jou.',
        reason: 'Twee liepen op schema. De opvolging van Anke is te laat en vraagt jouw besluit.',
        evidence: demoEvidence(['3 opvolgingen gecontroleerd', '2 op schema', '1 te laat: Anke']),
        proposal: { summary: 'Zal ik een korte, vriendelijke opvolging voorbereiden voor Anke?', needs: 'approval', actions: ['prepare_followup_draft'] },
        dedupKey: 'demo:check:anke',
      });
      made += 1;
    }
    if (made) console.log(`  Preview  : collega-demonstratie klaargezet (${made} werkitem(s): Growth, Gesprek, Relatie, Opvolg)`);
  } catch (e) { console.log(`  Preview  : collega-demo uitgesteld (${e.message})`); }
}

// Slice 5 — a content-free Niveau-C Lens hoofdlijn for ONE demonstration relation, so the dossier
// presentation ("Lens · Doorlopen op [datum]") is visible. SUMMARY only: no reveal content, answers or
// reflections are ever written. Idempotent (recordLensSummary dedupes per contact+milestone).
async function ensureLensDemo(tenantId) {
  try {
    const kim = (await query('select id from contact where tenant_id=$1 and lower(email)=lower($2) limit 1', [tenantId, 'kim@debrug.be'])).rows[0];
    if (!kim) return;
    const at = new Date(Date.now() - 3 * 86400000).toISOString();
    const r = await recordLensSummary(tenantId, { contactId: kim.id, milestone: 'COMPLETED', occurredAt: at, sourceRef: { demo: true, source: 'demo-fixture' } });
    if (r.ok && !r.deduped) console.log('  Preview  : lens-hoofdlijn klaargezet (Niveau C, alleen "doorlopen op")');
  } catch (e) { console.log(`  Preview  : lens-demo uitgesteld (${e.message})`); }
}
