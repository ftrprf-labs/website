// Mijn Maculis — PREVIEW-ONLY fixtures (§16, §24).
//
// There is no live Lens insight pipeline in this repository (the Reveal/Lens engine is a separate
// workstream), so Mijn Maculis is proven end-to-end with clearly-marked preview fixtures. Every row
// created here is stamped is_preview=true and belongs to a preview organization. This module HARD
// REFUSES to run when NODE_ENV=production, so no fictional customer data can ever land in production.
//
// Run it against a local/preview database:  node scripts/seed-mijn-preview.mjs

import { query, commEnabled } from '../comm/db.mjs';
import { getDefaultTenantId } from '../comm/tenant.mjs';
import { config } from '../config.mjs';
import { createAccess } from './access.mjs';
import { createInsightWithInitialVersion } from './versions.mjs';

export const PREVIEW_ORG_NAME = 'De Voorbeeld Groep';
export const PREVIEW_USER = { label: 'Sanne de Vries', role: 'Klantadmin' };

// A stable, non-secret preview token so the preview link is reproducible. Only ever used for a
// preview grant (is_preview=true). Overridable via MIJN_PREVIEW_TOKEN.
export function previewToken() {
  return process.env.MIJN_PREVIEW_TOKEN || 'preview-mijn-maculis-de-voorbeeld-groep-0001';
}

function daysFromNow(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// The fixture insights. They deliberately cover the full epistemic range so the UI proves it can
// hold more than a "spectacular reveal": a tension, a plain reveal, a consistency finding, a
// non_reveal ("we see NO difference"), and an explicit unknown. `provenance` is internal-only.
function fixtureInsights() {
  return [
    {
      title: 'Jullie positionering wordt intern niet overal hetzelfde ervaren',
      stance: 'tension', sharing: 'PRIVATE', attention: true, status: 'new',
      observation: 'Op de website staat een heldere belofte over wie jullie zijn. In de signalen die we teruglezen, klinkt die belofte niet overal even sterk door.',
      meaning: 'Dit kan erop wijzen dat het verhaal aan de buitenkant af is, maar intern nog niet door iedereen op dezelfde manier wordt gedragen. Dat is heel gewoon in een groeiende organisatie.',
      basis: 'We zien dit terug in de eerste Lens, op meerdere plekken in hoe jullie naar buiten en naar binnen over jezelf spreken.',
      not_yet_known: 'We weten nog niet of dit verschil bewust is, of dat het vooral een kwestie van taal en herhaling is. Daar hebben we jullie beeld bij nodig.',
      provenance: { lens: 'Lens 1', evidence: 'pattern', confidence: 'indication', signals: ['website_positioning', 'internal_language_variance'] },
    },
    {
      title: 'Interne communicatie mist een consistente lijn',
      stance: 'reveal', sharing: 'PRIVATE', attention: false, status: 'new',
      observation: 'We zien verschillen in hoe hetzelfde verhaal intern wordt overgebracht, afhankelijk van waar en door wie.',
      meaning: 'Een consistente lijn maakt het voor mensen makkelijker om hetzelfde te vertellen en zich er ook echt achter te scharen.',
      basis: 'Terug te zien in de eerste Lens, in de variatie tussen verschillende interne uitingen.',
      not_yet_known: 'Of dit als storend wordt ervaren, of juist als ruimte, weten we nog niet.',
      provenance: { lens: 'Lens 1', evidence: 'observation', confidence: 'indication', signals: ['internal_comms_variance'] },
    },
    {
      title: 'Sterke betrokkenheid bij klantgerichtheid',
      stance: 'consistency', sharing: 'PRIVATE', attention: false, status: 'confirmed',
      observation: 'Rond de klantbelofte zien we juist veel consistentie. Mensen zijn er zichtbaar trots op en voelen zich betrokken.',
      meaning: 'Dit is een sterke basis. Waar consistentie al bestaat, hoef je niets te repareren, alleen te koesteren en te benutten.',
      basis: 'We zien dit op meerdere plekken in de eerste Lens op dezelfde manier terugkomen.',
      not_yet_known: 'Of deze betrokkenheid overal even sterk is, of vooral bij bepaalde teams, is nog een open vraag.',
      provenance: { lens: 'Lens 1', evidence: 'pattern', confidence: 'strong', signals: ['customer_focus_consistency'] },
    },
    {
      title: 'Positionering wordt extern duidelijker dan intern',
      stance: 'reveal', sharing: 'SHARED', attention: false, status: 'confirmed',
      observation: 'Naar buiten toe is het verhaal herkenbaar en helder. Naar binnen toe is dat nog niet overal het geval.',
      meaning: 'Het fundament staat. De winst zit in het intern net zo helder maken als het extern al is.',
      basis: 'Een terugkerend patroon in de eerste Lens tussen jullie externe en interne uitingen.',
      not_yet_known: 'Waar precies het verschil ontstaat, willen we samen met jullie scherper krijgen.',
      provenance: { lens: 'Lens 1', evidence: 'pattern', confidence: 'indication', signals: ['external_vs_internal_clarity'] },
    },
    {
      title: 'Tussen jullie belofte en wat klanten ervaren zien we geen kloof',
      stance: 'non_reveal', sharing: 'PRIVATE', attention: false, status: 'confirmed',
      observation: 'We hebben bewust gezocht naar een verschil tussen wat jullie beloven en wat klanten lijken te ervaren. Dat verschil zien we hier niet.',
      meaning: 'Dat géén verschil zichtbaar is, is zelf een waardevol inzicht. Het betekent dat jullie belofte op dit punt klopt met de praktijk.',
      basis: 'We hebben hier in de eerste Lens gericht naar gekeken en geen spanning aangetroffen.',
      not_yet_known: 'Of dit zo blijft naarmate jullie groeien, is iets om in de gaten te houden.',
      provenance: { lens: 'Lens 1', evidence: 'absence_of_signal', confidence: 'indication', signals: ['promise_experience_alignment'] },
    },
    {
      title: 'Over jullie interne besluitvorming hebben we nog onvoldoende zicht',
      stance: 'unknown', sharing: 'PRIVATE', attention: false, status: 'new',
      observation: 'Hoe besluiten bij jullie tot stand komen, kunnen we vanaf de buitenkant nog niet goed zien.',
      meaning: 'Dit is geen tekort, maar een grens van wat één Lens van buitenaf kan waarnemen.',
      basis: 'De eerste Lens kijkt vooral naar wat zichtbaar is aan de buitenkant. Besluitvorming laat zich daar lastig uit aflezen.',
      not_yet_known: 'Vrijwel alles. Als jullie hier meer zicht op willen, is dit iets om samen te verkennen.',
      provenance: { lens: 'Lens 1', evidence: 'out_of_scope', confidence: 'none', signals: [] },
    },
  ];
}

function fixtureCollaboration() {
  return [
    {
      kind: 'agreement', status: 'active', customer_visible: true,
      title: 'We onderzoeken samen hoe we jullie positionering intern sterker maken',
      detail: 'We spraken af om samen te kijken hoe jullie positionering intern net zo consistent kan gaan voelen als hij extern al is.',
      due_at: null,
      source_ref: { kind: 'agreement', origin: 'gesprek' },
    },
    {
      kind: 'next_step', status: 'scheduled', customer_visible: true,
      title: 'Tweede sessie: verdieping op positionering',
      detail: 'Een vervolgsessie waarin we het beeld uit de eerste Lens samen aanscherpen.',
      due_at: daysFromNow(21),
      source_ref: { kind: 'appointment' },
    },
    {
      kind: 'research', status: 'in_progress', customer_visible: true,
      title: 'Positionering en merkverhaal',
      detail: 'We zijn in de analysefase. Zodra er een helder beeld ligt, delen we dat hier.',
      due_at: null,
      source_ref: { kind: 'research' },
    },
    {
      // Internal-only item: proves the customer view does NOT show the internal task list (§13).
      kind: 'next_step', status: 'active', customer_visible: false,
      title: 'Intern: factuur tweede sessie voorbereiden',
      detail: 'Interne actie, niet zichtbaar voor de klant.',
      due_at: null, source_ref: { kind: 'internal' },
    },
  ];
}

// Ensure a preview organization exists (idempotent by name within the tenant).
async function ensurePreviewOrg(_client, tenantId) {
  const existing = (await query(
    'select id from organization where tenant_id=$1 and name=$2 limit 1', [tenantId, PREVIEW_ORG_NAME])).rows[0];
  if (existing) return existing.id;
  const ins = (await query(
    `insert into organization(tenant_id, name, primary_domain, relationship_stage)
     values ($1,$2,$3,'CUSTOMER') returning id`,
    [tenantId, PREVIEW_ORG_NAME, 'voorbeeldgroep.nl'])).rows[0];
  return ins.id;
}

// Safety gate for seeding on a running (possibly production-mode) preview service: refuse if the
// tenant already has ANY real (non-preview) customer access grant. Preview fixtures may therefore
// only ever be created on a tenant that has no real customers — they can never mix with real data.
export async function assertNoRealCustomers(tenantId) {
  const n = (await query(
    'select count(*)::int c from customer_access where tenant_id=$1 and is_preview=false and revoked_at is null',
    [tenantId])).rows[0].c;
  if (n > 0) throw new Error('tenant heeft echte klanttoegang; preview-seeding geweigerd');
}

// The CLI entry point. Hard-refuses NODE_ENV=production so a local/CLI run can never seed production.
// A preview SERVICE (which runs with NODE_ENV=production for parity) seeds through the admin-gated,
// flag-gated, no-real-customers endpoint that calls seedPreviewCore directly.
export async function seedPreview({ tenantId = null } = {}) {
  if (config.production) throw new Error('refusing to seed preview fixtures with NODE_ENV=production (use the guarded admin endpoint on a preview service)');
  return seedPreviewCore({ tenantId });
}

// Seed (or re-seed) the preview environment. Idempotent: preview rows for the preview org are
// cleared and re-created, so running it twice yields the same clean state. Returns the preview link.
export async function seedPreviewCore({ tenantId = null } = {}) {
  if (!commEnabled()) throw new Error('Communication Layer is off (need COMM_LAYER_ENABLED + DATABASE_URL)');
  const tid = tenantId || await getDefaultTenantId();

  const orgId = await ensurePreviewOrg(null, tid);

  // Clear previous preview data for this org so re-seeding is clean (preview rows only). Deleting an
  // insight cascades to its append-only versions/observations (insight_id ON DELETE CASCADE).
  await query('delete from customer_insight where organization_id=$1 and is_preview=true', [orgId]);
  await query('delete from collaboration_item where organization_id=$1 and is_preview=true', [orgId]);

  // Create each insight through the durable-insight primitive so it gets exactly one v1 reading +
  // one observation, and (for a pre-shared fixture) a version-bound share pointer.
  for (const i of fixtureInsights()) {
    await createInsightWithInitialVersion({
      tenantId: tid, organizationId: orgId, title: i.title, stance: i.stance,
      observation: i.observation, meaning: i.meaning, basis: i.basis, notYetKnown: i.not_yet_known,
      sharing: i.sharing, source: 'lens', provenance: i.provenance || {}, status: i.status,
      isPreview: true, attention: i.attention,
      sharedAt: i.sharing === 'SHARED' ? daysFromNow(-14) : null,
      signal: { keys: (i.provenance && i.provenance.signals) || [] },
    });
  }
  for (const c of fixtureCollaboration()) {
    await query(
      `insert into collaboration_item
         (tenant_id, organization_id, kind, title, detail, status, due_at, customer_visible, source_ref, is_preview)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,true)`,
      [tid, orgId, c.kind, c.title, c.detail, c.status, c.due_at, c.customer_visible, JSON.stringify(c.source_ref || {})]);
  }

  // Grant preview access (idempotent on the token hash).
  const access = await createAccess(tid, orgId, { ...PREVIEW_USER, isPreview: true, token: previewToken() });

  return {
    tenantId: tid,
    organizationId: orgId,
    organizationName: PREVIEW_ORG_NAME,
    token: access.token,
    link: `/mijn.html?t=${encodeURIComponent(access.token)}`,
  };
}

// PREVIEW-ONLY live self-check. Runs the whole sharing boundary against the REAL preview database and
// logs each result, so the deployment can be verified from the server logs (the CI test proves the
// same on a local Postgres). It self-cleans (revokes what it shares) so the customer starts from a
// clean PRIVATE state. Never runs unless MIJN_PREVIEW_SEED is on; never touches production.
export async function previewSelfCheck({ tenantId, organizationId }) {
  const { boundaryProof, visibleInsights, insightForCustomer, shareInsight, revokeInsight } = await import('./sharing.mjs');
  const log = (m) => console.log(`  [mijn/preview] ${m}`);

  const b0 = await boundaryProof(tenantId, organizationId);
  log(`na seed: intern geautoriseerd=${b0.sharedCount} (gedeeld), privé onzichtbaar voor Maculis=${b0.withheldPrivateCount}`);

  const all = await visibleInsights(tenantId, organizationId);
  const att = all.find((i) => i.attention && i.sharing === 'PRIVATE') || all.find((i) => i.sharing === 'PRIVATE');
  if (!att) { log('WARNING: geen PRIVATE-inzicht gevonden'); return; }

  await shareInsight(tenantId, organizationId, att.id, { actorLabel: 'preview-selfcheck' });
  const b1 = await boundaryProof(tenantId, organizationId);
  const nowAuthorized = b1.authorized.some((x) => x.id === att.id);
  log(`na expliciet delen "${att.title.slice(0, 34)}…": intern geautoriseerd=${b1.sharedCount}, privé onzichtbaar=${b1.withheldPrivateCount}, gedeelde nu intern zichtbaar=${nowAuthorized}`);

  // Isolation: a foreign org id cannot read this insight, and a random id in this org resolves to null.
  const crossOrg = await insightForCustomer(tenantId, '11111111-1111-1111-1111-111111111111', att.id);
  const crossId = await insightForCustomer(tenantId, organizationId, '00000000-0000-0000-0000-000000000000');
  log(`org-isolatie: vreemde org leest inzicht=${crossOrg ? 'LEK!' : 'nee'}, onbekende id in eigen org=${crossId ? 'LEK!' : 'nee'}`);

  await revokeInsight(tenantId, organizationId, att.id, { actorLabel: 'preview-selfcheck' });
  const b2 = await boundaryProof(tenantId, organizationId);
  log(`na intrekken (schone startstaat): intern geautoriseerd=${b2.sharedCount}, privé onzichtbaar=${b2.withheldPrivateCount}`);

  const pass = b0.sharedCount === 1 && b0.withheldPrivateCount >= 1
    && b1.sharedCount === b0.sharedCount + 1 && nowAuthorized
    && !crossOrg && !crossId
    && b2.sharedCount === b0.sharedCount;
  log(pass
    ? 'SELF-CHECK PASSED: PRIVATE → expliciet delen → SHARED → intern zichtbaar; overige PRIVATE blijft onzichtbaar; org-isolatie OK.'
    : 'SELF-CHECK WARNING: onverwachte waarden, controleer handmatig.');
}
