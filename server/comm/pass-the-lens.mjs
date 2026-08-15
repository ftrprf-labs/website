// Maculis — Pass the Lens → Relationship Layer bridge (best-effort, feature-flagged).
//
// When the Communication Layer is ON (COMM_LAYER_ENABLED + DATABASE_URL), a Pass the Lens
// introduction is additionally recorded in the relationship graph so it stays part of the
// relatiehistorie (brief §9) and is visible to the AI-first workflow (brief §15):
//   1) the referred person becomes / resolves to a permanent Contact (reuse resolveContactTx),
//   2) a timeline activity `pass_the_lens_introduction` is appended,
//   3) a durable, model-visible provenance fact is stored as CONFIRMED human memory
//      ("Geïntroduceerd via Pass the Lens door <naam>"), so the copilot's bounded context
//      can surface it when an admin reviews the candidate.
//
// This NEVER sends anything, NEVER blocks or breaks the primary JSON-store intake, and is a
// complete no-op when the layer is off. It reuses the existing Comm Layer APIs; it does not
// modify them. AI only ever proposes — a human reviews, edits and sends (brief §4/§15).

import { commEnabled, withTransaction } from './db.mjs';
import { getDefaultTenantId } from './tenant.mjs';
import { resolveContactTx } from './repo.mjs';
import { recordActivity } from './activity.mjs';
import { addMemory } from './memory.mjs';

// record: the freshly intaken candidate invitation record (JSON store).
// intro:  { by_id, by_name, by_company, source_journey } — the introducer provenance.
export async function bridgePassTheLens(record, intro = {}) {
  if (!commEnabled()) return { bridged: false, reason: 'comm_off' };
  try {
    const tenantId = await getDefaultTenantId();
    // 1) Resolve/create the candidate as a permanent Contact (dedup by identity key).
    const contact = await withTransaction((client) => resolveContactTx(client, tenantId, {
      first_name: record.first_name,
      last_name: record.last_name,
      email: record.email,
      mobile: record.mobile,
      company_name: record.company_name,
      domain: record.domain,
    }));
    if (!contact || !contact.id) return { bridged: false, reason: 'no_contact' };
    const byName = intro.by_name || null;
    // 2) Timeline activity (free-text type, no migration needed).
    await recordActivity({
      tenantId,
      type: 'pass_the_lens_introduction',
      contactId: contact.id,
      organizationId: contact.organization_id || null,
      meta: {
        referral_source: 'pass_the_lens',
        source_journey: intro.source_journey || 'first_five',
        introduced_by_name: byName,
        introduced_by_company: intro.by_company || null,
      },
    });
    // 3) Durable, model-visible provenance fact (confirmed human memory).
    const content = byName
      ? `Geïntroduceerd via Pass the Lens door ${byName}.`
      : 'Geïntroduceerd via Pass the Lens.';
    await addMemory(tenantId, {
      contactId: contact.id,
      organizationId: contact.organization_id || null,
      kind: 'fact',
      content,
      source: 'human',
      sourceRef: { type: 'pass_the_lens', id: record.id },
    });
    return { bridged: true, contactId: contact.id };
  } catch (err) {
    // Observational only — a relationship-graph hiccup must never affect intake.
    return { bridged: false, reason: `error: ${err && err.message ? err.message : err}` };
  }
}
