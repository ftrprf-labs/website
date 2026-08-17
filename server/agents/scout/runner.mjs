// Growth / Lead colleague — "Scout" runner (§ FASE 4 + AGENT_COCKPIT_CONTRACT).
//
// Scout finds and qualifies potential NEW relationships and lands well-reasoned work in the cockpit,
// so Maculis contributes to new relationships, not just existing ones. It works entirely inside the
// one shared reality: for each candidate it checks whether we already know the organization or
// people (dedup), qualifies fit from REAL signals via a deterministic discovery provider, separates
// FACT / INFERENCE / HYPOTHESIS, proposes a human next step, and records an ATTENTION ITEM through
// the cockpit's own contract (recordWorkItem). It NEVER resolves its own work, NEVER materialises a
// relation, and NEVER contacts anyone: those are the human's decision (cockpit approve). The mandate
// guard enforces this. A not-yet-existing lead rides as a `proposedRelation`; an already-known
// relation is referenced by id. Idempotent per candidate (dedupKey) so repeated runs never spam.

import { query } from '../../comm/db.mjs';
import { recordWorkItem } from '../../comm/work.mjs';
import { getActor, assertCan, requiresApproval } from '../registry.mjs';
import { startRun, finishRun, failRun, recordCapabilityCall } from '../run.mjs';
import { getDiscoveryProvider } from '../providers/discovery.mjs';
import { gatherExternalSignals, gatherVerification } from '../providers/registry.mjs';
import { emailDomain } from '../../comm/identity.mjs';

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function candidateKey(c) { return (c.domain || '').toLowerCase() || (c.person && c.person.email ? String(c.person.email).toLowerCase() : '') || slug(c.name) || null; }

// What our own database already knows about a candidate organization (dedup + warm path).
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
  // Also check whether the specific person already exists (by e-mail), so we never propose a duplicate.
  let contact = null;
  const email = candidate.person && candidate.person.email ? String(candidate.person.email).toLowerCase() : null;
  if (email) {
    contact = (await query('select id, organization_id from contact where tenant_id=$1 and lower(email)=lower($2) and deleted_at is null limit 1', [tenantId, email])).rows[0] || null;
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
    contact,
    contacts,
    activityCount,
  };
}

// Turn provider output + DB facts into an evidence object with an EXPLICIT epistemic split, so the
// human (and later a learning loop) can tell fact from observation from inference from hypothesis.
// It carries BOTH a fit confidence and an identity status, kept separate on purpose: an organisation
// can have interesting signals while we are not yet sure the signals are about the same legal entity.
export function buildEvidence(candidate, known, q) {
  const facts = [];
  // What a human handed us is CONTEXT, marked as provided so it never reads as evidence of fit.
  if (candidate.note) facts.push({ kind: 'FACT', provided: true, text: `Aangedragen met context: ${candidate.note}` });
  if (candidate.domain) facts.push({ kind: 'FACT', provided: true, text: `Aangedragen domein: ${candidate.domain}` });
  // Real DB facts from qualification evidence (existing org, known contact, prior activity).
  const externals = [];
  for (const e of q.evidence || []) {
    // Our own DB facts and official-register verification are FACT (with a source on the register).
    if (e.sourceType === 'internal_db') facts.push({ kind: 'FACT', text: e.detail, ref: e.sourceRef });
    else if (e.sourceType === 'official_register') facts.push({ kind: 'FACT', text: e.detail, source: e.source, url: e.url || null });
    // EXTERNAL observations (from signal sources) stay their own kind, with a source + when seen.
    else if (e.sourceType === 'external') externals.push({ kind: 'OBSERVATION', text: e.detail, source: e.source || e.provider, url: e.url || null, observedAt: e.observedAt || null, interpretation: e.interpretation || null, uncertainties: e.uncertainties || null });
  }
  const inferences = [{ kind: 'INFERENCE', text: q.summary }];
  const hypotheses = [];
  if (q.identityStatus !== 'verified') {
    hypotheses.push({ kind: 'HYPOTHESIS', text: q.identityStatus === 'unverified'
      ? 'Identiteit niet bevestigd: de waarnemingen kunnen (deels) een naamgenoot betreffen.'
      : 'Identiteit waarschijnlijk, maar niet officieel bevestigd.' });
  }
  const observations = [...facts, ...externals, ...inferences, ...hypotheses];
  const ev = {
    source: candidate.demo ? 'demo-fixture' : 'scout/internal',
    provider: q.providerName || 'internal',
    // Two distinct axes, never collapsed into one number.
    fitConfidence: q.fitConfidence,
    confidence: q.fitConfidence,           // backward-compatible alias (was the single score)
    identityStatus: q.identityStatus,      // 'unverified' | 'probable' | 'verified'
    identityConfidence: q.identityConfidence,
    identityReasons: q.identityReasons || [],
    decision: q.decision,                  // 'awareness' | 'approval'
    epistemicStatus: q.epistemicStatus,
    fitBreakdown: q.fitBreakdown || null,
    observations,
    facts, external: externals, inferences, hypotheses,
  };
  // Contract §7: a demonstration/fixture must be unmistakably marked so it can never read as a real find.
  if (candidate.demo) ev.demo = true;
  return ev;
}

// Run Scout over a set of candidates. Lands attention items through the cockpit contract. Idempotent
// on runDedupeKey (double-submit guard) and per-candidate on the work dedupKey (no attention spam).
export async function runScout({ tenantId, candidates = [], trigger = 'human', runDedupeKey = null, scope = 'provided', sources = null, verificationSources = null }) {
  const scout = await getActor(tenantId, 'scout');
  if (!scout) return { ok: false, reason: 'scout_actor_missing' };

  const started = await startRun(tenantId, { actor: scout, trigger, autonomyUsed: scout.autonomy, inputRef: { candidates: candidates.length, scope }, dedupeKey: runDedupeKey });
  if (started.reused) return { ok: true, reused: true, runId: started.run.id, status: 'reused' };
  const runId = started.run.id;
  console.log(`[scout] run ${runId} start: ${candidates.length} kandidaat(en), scope=${scope}, trigger=${trigger}`);

  try {
    await assertCan(scout, 'read_shared_truth', { tenantId, resource: { type: 'agent_run', id: runId } });
    if (scope === 'external_web') {
      // Honest boundary: external discovery is above Scout's mandate in this build. Deny + audit.
      await assertCan(scout, 'external_discovery', { tenantId, resource: { type: 'agent_run', id: runId } });
    }
    const provider = getDiscoveryProvider();
    await recordCapabilityCall(tenantId, runId, { capability: 'discovery_provider', note: provider.name });

    const landed = []; let recorded = 0; let skipped = 0; let known = 0;
    for (const raw of candidates) {
      const candidate = {
        name: (raw.name || '').trim(),
        domain: (raw.domain || (raw.email ? emailDomain(raw.email) : '') || '').trim().toLowerCase() || null,
        note: raw.note || null,
        person: raw.person || (raw.email ? { email: String(raw.email).toLowerCase(), first_name: raw.first_name || null, last_name: raw.last_name || null } : null),
        demo: raw.demo === true || raw.sourceType === 'demo-fixture',
        sourceType: raw.sourceType || 'provided',
        sourceRef: raw.sourceRef || null,
      };
      const key = candidateKey(candidate);
      if (!candidate.name && !key) { skipped += 1; continue; }

      const existence = await checkExistence(tenantId, candidate);
      await recordCapabilityCall(tenantId, runId, { capability: 'check_existence', note: key });
      // External SOURCE providers (default none live). Injected `sources` in tests; a source problem
      // never breaks the run. Results are normalised, source-tagged EXTERNAL observations.
      const externalSignals = await gatherExternalSignals({ name: candidate.name, domain: candidate.domain }, { sources });
      if (externalSignals.length) await recordCapabilityCall(tenantId, runId, { capability: 'gather_external_signals', note: `${key}:${externalSignals.length}` });
      // Official-register verification (KVK/KBO). Empty unless a verification provider is configured.
      const verification = await gatherVerification({ name: candidate.name, domain: candidate.domain }, { sources: verificationSources });
      if (verification.length) await recordCapabilityCall(tenantId, runId, { capability: 'verify_identity', note: `${key}:${verification.length}` });
      const q = await provider.qualify({ candidate, known: existence, externalSignals, verification });
      await recordCapabilityCall(tenantId, runId, { capability: 'qualify', note: `${key}:fit=${q.fitConfidence}:id=${q.identityStatus}` });

      // Per-source breakdown for the trace (website vs ted vs other). Non-PII: sources + counts only.
      const sigBy = {};
      for (const s of externalSignals) { const p = /ted/i.test(s.provider || s.source || '') ? 'ted' : (/website/i.test(s.provider || s.source || '') ? 'website' : (s.provider || s.source || 'extern')); sigBy[p] = (sigBy[p] || 0) + 1; }
      const sigStr = Object.keys(sigBy).length ? Object.entries(sigBy).map(([p, n]) => `${p}:${n}`).join(',') : 'geen';
      const subj = candidate.name || candidate.domain || key;

      // DEDUPE / one reality: a known organisation is recognised and NEVER re-proposed as a new
      // relation; it only surfaces (new) signals. A truly new lead rides as a proposedRelation.
      const touchesKnown = Boolean(existence.organization || existence.contact);
      // Compression: a NEW lead needs a concrete handle (domain, e-mail/person) or a real external
      // signal to be worth surfacing; a bare vague name with nothing is dropped (no attention spam).
      const recordable = touchesKnown || Boolean(candidate.domain) || Boolean(candidate.person && candidate.person.email) || externalSignals.length > 0;
      if (!recordable) {
        skipped += 1;
        console.log(`[scout] run ${runId} · ${subj}: bronnen=${sigStr} fit=${q.fitConfidence} identiteit=${q.identityStatus} -> overgeslagen (geen concreet aanknopingspunt)`);
        continue;
      }

      // Decision -> needs. A known relation surfaces as calm awareness. A new lead follows Scout's
      // fit+identity decision, which is never stronger than 'awareness' until identity is at least
      // probable AND fit is strong (discovery.FIT). Human approval stays mandatory in every case.
      const needs = touchesKnown ? 'awareness' : q.decision;

      const evidence = buildEvidence(candidate, existence, q);

      const relation = {};
      let proposedRelation = null;
      if (existence.contact) {
        relation.contactId = existence.contact.id;
        if (existence.contact.organization_id) relation.organizationId = existence.contact.organization_id;
      } else if (existence.organization) {
        relation.organizationId = existence.organization.id;
        if (existence.contacts && existence.contacts.length) relation.contactId = existence.contacts[0].id; // warm anchor
      } else {
        // A not-yet-created lead rides as a proposedRelation; the human materialises it on approve.
        const person = candidate.person || (q.person && q.person.email ? { email: q.person.email } : null);
        proposedRelation = {
          name: (person && (person.name || [person.first_name, person.last_name].filter(Boolean).join(' '))) || candidate.name,
          org: candidate.name || null,
          email: person && person.email ? person.email : null,
          domain: candidate.domain,
        };
        await assertCan(scout, 'propose_relation', { tenantId, resource: { type: 'attention_item', id: key } });
      }

      const whoLabel = candidate.name || (proposedRelation && proposedRelation.name) || 'onbekend';
      const title = touchesKnown
        ? `Scout ziet signalen bij een bestaande relatie: ${whoLabel}`
        : (needs === 'approval' ? `Nieuwe relatie voorgesteld: ${whoLabel}` : `Mogelijke nieuwe relatie om te bekijken: ${whoLabel}`);
      // Human-facing ask, matched to the decision so the card reads honestly.
      const ask = touchesKnown
        ? 'Scout ziet publieke signalen bij deze bestaande relatie.'
        : (needs === 'approval'
          ? 'Scout heeft voldoende onderbouwing. Wil je deze kandidaat opnemen?'
          : 'Scout ziet iets dat kan passen. Wil je dit bekijken? De identiteit is nog niet bevestigd.');
      const proposal = {
        summary: ask,
        needs,
        step: q.proposedAction.kind,
        fitConfidence: q.fitConfidence,
        identityStatus: q.identityStatus,
      };
      // Preparing/recording work is within Scout's autonomy; asserted (audited on denial). Note that
      // any external step (mandate_required 'send') stays a proposal that a human must approve first.
      if (q.proposedAction.mandate_required === 'send') proposal.needsHumanBeforeContact = requiresApproval(scout, 'send_external');
      await assertCan(scout, 'record_work', { tenantId, resource: { type: 'attention_item', id: key } });

      // A new lead dedups per candidate; signals on a KNOWN org dedup per org, so repeated runs
      // update one card in place instead of stacking a second one (and never a second relation).
      const dedupKey = touchesKnown
        ? `signals:${existence.organization ? existence.organization.id : (existence.contact ? existence.contact.id : key)}`
        : `lead:${key}`;

      const input = {
        origin: { kind: 'AGENT', key: scout.slug, label: scout.display_name },
        owner: { kind: 'HUMAN', key: null },
        type: 'AGENT_PROPOSAL',
        relation,
        proposedRelation,
        title,
        reason: q.summary,
        evidence,
        proposal,
        dedupKey,
      };
      const res = await recordWorkItem(tenantId, input);
      if (res.ok) {
        landed.push({ id: res.id, deduped: Boolean(res.deduped), key }); recorded += 1; if (touchesKnown) known += 1;
        const b = q.fitBreakdown || {};
        const perSrc = Object.entries(b.perSource || {}).map(([p, n]) => `${p}:${n}`).join(',') || 'geen';
        console.log(`[scout] run ${runId} · ${subj}: bronnen=${sigStr} fit=${q.fitConfidence} identiteit=${q.identityStatus} besluit=${needs} bekend=${touchesKnown} -> ${res.deduped ? 'bijgewerkt' : 'geland'} attention_item ${res.id}`);
        console.log(`[scout] run ${runId} · ${subj}: fit-opbouw intern=${b.internal || 0} extern=${b.externalApplied || 0} (${perSrc}) corroboratie=${b.corroboration || 0} verificatie=${b.verification || 0} gate=${b.gate}(${b.gateCap})`);
      }
    }

    const output = { candidates: candidates.length, recorded, skipped, touchesKnown: known, landed: landed.map((l) => l.id), provider: provider.name };
    await finishRun(tenantId, runId, { actor: scout, outputRef: output });
    console.log(`[scout] run ${runId} klaar: kandidaten=${candidates.length}, geland=${recorded}, overgeslagen=${skipped}, items=[${landed.map((l) => l.id).join(', ')}]`);
    return { ok: true, runId, ...output, landed };
  } catch (err) {
    await failRun(tenantId, runId, err.message || String(err), { actor: scout });
    return { ok: false, reason: 'run_failed', error: String(err.message || err), runId };
  }
}
