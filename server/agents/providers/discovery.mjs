// Digital Colleagues — discovery provider boundary (deterministic, testable, honest).
//
// This is the seam where real external discovery is plugged in LATER, safely. Until then we do NOT
// invent companies or present fake data as real found leads (§FASE 4). The default provider is
// DETERMINISTIC and INTERNAL: it qualifies a candidate that a human PROVIDED, or that already
// exists in our own data, using only real signals (a provided domain, an existing organization,
// known contacts, prior activity). Every claim gets an evidence row with an explicit source_type.
//
// The external-web provider is a stub that reports "not configured" and returns NOTHING, so nobody
// can mistake absence of infrastructure for a real result. Swap in a real implementation behind the
// same interface when live search/enrichment exists.

import { config } from '../../config.mjs';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function round2(n) { return Math.round(n * 100) / 100; }

// The internal, deterministic qualification. `candidate` is human-provided or internal-signal data;
// `known` is what our own database already establishes about it. No fabricated external facts.
function internalQualify({ candidate, known }) {
  const evidence = [];
  const name = (candidate.name || '').trim();
  const domain = (candidate.domain || '').trim().toLowerCase() || null;

  // Evidence 1: the candidate itself and where it came from (provided vs internal signal).
  evidence.push({
    sourceType: candidate.sourceType || 'provided',
    sourceRef: candidate.sourceRef || (domain ? { domain } : { name }),
    detail: candidate.note ? `Aangedragen met context: ${candidate.note}` : 'Kandidaat aangedragen voor kwalificatie.',
    provider: 'internal',
  });

  let confidence = 0.3;
  let epistemicStatus = 'HYPOTHESIS';
  const reasons = [];

  if (domain) {
    confidence += 0.25;
    epistemicStatus = 'OBSERVATION';
    reasons.push('een concreet domein is bekend');
  }

  if (known && known.organization) {
    confidence += 0.2;
    reasons.push('deze organisatie bestaat al in Maculis');
    evidence.push({
      sourceType: 'internal_db',
      sourceRef: { type: 'organization', id: known.organization.id },
      detail: `Bestaat al als organisatie: ${known.organization.name}${known.organization.stage ? ` (fase ${known.organization.stage})` : ''}.`,
      provider: 'internal',
    });
  }

  let viaContact = null;
  if (known && Array.isArray(known.contacts) && known.contacts.length) {
    confidence += 0.2;
    epistemicStatus = 'INFERENCE'; // we infer fit from an existing warm relationship
    const c = known.contacts[0];
    viaContact = { contactId: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email, email: c.email };
    reasons.push(`er is al een bekende contactpersoon (${viaContact.name})`);
    evidence.push({
      sourceType: 'internal_db',
      sourceRef: { type: 'contact', id: c.id },
      detail: `Bekende contactpersoon bij deze organisatie: ${viaContact.name}.`,
      provider: 'internal',
    });
  }

  if (known && known.activityCount > 0) {
    confidence += 0.1;
    reasons.push('er is eerdere relatiehistorie');
    evidence.push({ sourceType: 'internal_db', sourceRef: { type: 'activity' }, detail: `${known.activityCount} eerdere activiteit(en) vastgelegd.`, provider: 'internal' });
  }

  confidence = round2(clamp(confidence, 0.1, 0.95));

  // WHY this may fit Maculis. Honest and grounded: it only states what the evidence supports.
  const why = reasons.length
    ? `Mogelijk relevant omdat ${reasons.join(', ')}.`
    : 'Aangedragen kandidaat zonder verdere onderbouwing. Menselijke beoordeling nodig.';

  // Proposed next step. A warm path proposes a prepared introduction (still human-approved before
  // any external contact). Otherwise it proposes human review. Nothing is sent.
  const proposedAction = viaContact
    ? { kind: 'prepare_intro', summary: `Mogelijke warme ingang via ${viaContact.name}. Bereid een introductie voor.`, domain, person: viaContact, mandate_required: 'send', approval_required: true }
    : { kind: 'human_review', summary: 'Nieuwe kandidaat. Menselijke beoordeling nodig voordat er iets gebeurt.', domain, approval_required: true };

  return {
    fits: true,
    epistemicStatus,
    confidence,
    summary: why,
    evidence,
    proposedAction,
    person: viaContact,
    providerName: 'internal',
  };
}

// The external-web provider seam. Returns configured=false until real infrastructure exists. It
// NEVER returns fabricated candidates.
function externalProvider() {
  return {
    name: 'external_web',
    configured: false,
    async discover() { return { ok: false, reason: 'external_discovery_not_configured', candidates: [] }; },
    async qualify() { throw new Error('external_discovery_not_configured'); },
  };
}

function internalProvider() {
  return {
    name: 'internal',
    configured: true,
    // qualify a single candidate against known DB facts (pure/deterministic).
    async qualify(args) { return internalQualify(args); },
  };
}

// Select the discovery provider. Default is the deterministic internal one. An external provider is
// only used when explicitly configured AND real (never in v1). config.agentDiscoveryProvider is an
// optional future flag; absent => 'internal'.
export function getDiscoveryProvider() {
  const want = (config.agentDiscoveryProvider || 'internal').toLowerCase();
  if (want === 'external_web') {
    const ext = externalProvider();
    return ext.configured ? ext : internalProvider(); // never fall into a fake external result
  }
  return internalProvider();
}

export { internalQualify, externalProvider, internalProvider };
