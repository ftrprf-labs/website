// Growth / Lead colleague — "Scout" runner (§FASE 4).
//
// Scout finds and qualifies potential new relationships and prepares a sensible next step, so
// Maculis contributes to NEW relationships, not just existing ones. It works entirely inside the
// shared truth: for each candidate it checks whether we already know the organization or people,
// qualifies fit from REAL signals via the deterministic discovery provider, stores evidence and a
// confidence, proposes a next step, and leaves it as prepared work for a human. It NEVER makes
// external contact and NEVER promotes a candidate to a real relationship on its own: those sit above
// its PREPARE autonomy and are enforced by the mandate guard.

import { query } from '../../comm/db.mjs';
import { getActor, assertCan, requiresApproval } from '../registry.mjs';
import { startRun, finishRun, failRun, recordCapabilityCall } from '../run.mjs';
import { addFinding } from '../findings.mjs';
import { setWorkStatus, getWorkItem } from '../work.mjs';
import { getDiscoveryProvider } from '../providers/discovery.mjs';
import { emailDomain } from '../../comm/identity.mjs';

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function subjectKeyFor(candidate) {
  const d = (candidate.domain || '').trim().toLowerCase();
  return d || slug(candidate.name) || null;
}

// Look up what our own database already knows about a candidate organization (dedup + warm path).
async function checkExistence(tenantId, candidate) {
  const domain = (candidate.domain || '').trim().toLowerCase() || null;
  let org = null;
  if (domain) {
    org = (await query(
      `select id, name, primary_domain, relationship_stage from organization
        where tenant_id=$1 and primary_domain=$2 and deleted_at is null limit 1`, [tenantId, domain])).rows[0] || null;
  }
  if (!org && candidate.name) {
    org = (await query(
      `select id, name, primary_domain, relationship_stage from organization
        where tenant_id=$1 and lower(name)=lower($2) and deleted_at is null limit 1`, [tenantId, candidate.name])).rows[0] || null;
  }
  let contacts = [];
  let activityCount = 0;
  if (org) {
    contacts = (await query(
      `select id, first_name, last_name, lower(email) as email from contact
        where tenant_id=$1 and organization_id=$2 and deleted_at is null limit 5`, [tenantId, org.id])).rows;
    activityCount = Number((await query('select count(*)::int n from activity where tenant_id=$1 and organization_id=$2', [tenantId, org.id])).rows[0].n);
  }
  return {
    organization: org ? { id: org.id, name: org.name, domain: org.primary_domain, stage: org.relationship_stage } : null,
    contacts,
    activityCount,
  };
}

// Run Scout on a work item. Idempotent (one non-failed run per work item). Returns a summary.
export async function runScout({ tenantId, workItemId, trigger = 'human' }) {
  const scout = await getActor(tenantId, 'scout');
  if (!scout) return { ok: false, reason: 'scout_actor_missing' };
  const work = await getWorkItem(tenantId, workItemId);
  if (!work) return { ok: false, reason: 'work_not_found' };

  // Idempotent run: a double-submit returns the existing run and does no duplicate work.
  const started = await startRun(tenantId, {
    workItemId, actor: scout, trigger, autonomyUsed: scout.autonomy, dedupeKey: `scout:${workItemId}`,
  });
  if (started.reused) return { ok: true, reused: true, runId: started.run.id, status: 'reused' };
  const runId = started.run.id;

  try {
    // Scout may look at the shared truth. Any forbidden read (e.g. external web) is denied + audited.
    await assertCan(scout, 'read_shared_truth', { tenantId, resource: { type: 'work_item', id: workItemId } });

    const input = work.input || {};
    if (input.scope === 'external_web') {
      // Honest boundary: external discovery is above Scout's mandate in v1. Deny + audit, no fake data.
      await assertCan(scout, 'external_discovery', { tenantId, resource: { type: 'work_item', id: workItemId } });
    }

    const candidates = Array.isArray(input.candidates) ? input.candidates : [];
    await setWorkStatus(tenantId, workItemId, 'in_progress');
    const provider = getDiscoveryProvider();
    await recordCapabilityCall(tenantId, runId, { capability: 'discovery_provider', note: provider.name });

    let created = 0; let known = 0; const findingIds = [];
    for (const raw of candidates) {
      const candidate = {
        name: (raw.name || '').trim(),
        domain: (raw.domain || (raw.email ? emailDomain(raw.email) : '') || '').trim().toLowerCase() || null,
        note: raw.note || null,
        person: raw.person || (raw.email ? { email: raw.email, first_name: raw.first_name, last_name: raw.last_name } : null),
        sourceType: raw.sourceType || 'provided',
        sourceRef: raw.sourceRef || null,
      };
      const subjectKey = subjectKeyFor(candidate);
      if (!candidate.name && !subjectKey) continue; // nothing to qualify

      const existence = await checkExistence(tenantId, candidate);
      await recordCapabilityCall(tenantId, runId, { capability: 'check_existence', note: subjectKey });

      // Qualify against real signals only (deterministic provider). No fabricated external facts.
      const q = await provider.qualify({ candidate, known: existence });
      await recordCapabilityCall(tenantId, runId, { capability: 'qualify', note: `${subjectKey}:${q.confidence}` });

      // If the proposed step would eventually require external contact, Scout may PREPARE it but must
      // NOT act: approval is required because send is above its autonomy.
      const proposedAction = { ...q.proposedAction };
      if (proposedAction.mandate_required === 'send') {
        proposedAction.approval_required = requiresApproval(scout, 'send_external'); // true for Scout
      }
      // Preparing work is within Scout's autonomy; assert it explicitly (audited on denial).
      await assertCan(scout, 'prepare_work', { tenantId, resource: { type: 'work_item', id: workItemId } });

      const person = q.person || candidate.person || null;
      const fin = await addFinding(tenantId, {
        workItemId, agentRunId: runId, actorId: scout.id,
        kind: 'lead_candidate', subjectType: 'organization', subjectKey,
        title: candidate.name || subjectKey, summary: q.summary,
        epistemicStatus: q.epistemicStatus, confidence: q.confidence,
        organizationId: existence.organization ? existence.organization.id : null,
        alreadyKnown: Boolean(existence.organization),
        proposedAction: { ...proposedAction, domain: candidate.domain, person },
        approvalRequired: true, // default safe: a human decides whether this becomes a lead
        evidence: q.evidence,
      });
      if (fin.ok) { findingIds.push(fin.id); if (fin.created) created += 1; if (existence.organization) known += 1; }
    }

    const output = { candidates: candidates.length, findings: findingIds.length, created, alreadyKnown: known, provider: provider.name };
    await finishRun(tenantId, runId, { actor: scout, outputRef: output });
    // Findings await a human decision; the work item is done from Scout's side.
    await setWorkStatus(tenantId, workItemId, 'awaiting_human', { output });
    return { ok: true, runId, ...output, findingIds };
  } catch (err) {
    await failRun(tenantId, runId, err.message || String(err), { actor: scout });
    await setWorkStatus(tenantId, workItemId, 'failed', { output: { error: String(err.message || err).slice(0, 200) } });
    return { ok: false, reason: 'run_failed', error: String(err.message || err) };
  }
}
