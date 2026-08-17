// Digital Colleagues — discovery provider boundary (deterministic, testable, honest).
//
// This is the seam where real external discovery is plugged in LATER, safely. Until then we do NOT
// invent companies or present fake data as real found leads (§FASE 4). The default provider is
// DETERMINISTIC and INTERNAL: it qualifies a candidate that a human PROVIDED, or that already
// exists in our own data, using only real signals (external observations, an existing organization,
// known contacts, prior activity). Every claim gets an evidence row with an explicit source_type.
//
// The external-web provider is a stub that reports "not configured" and returns NOTHING, so nobody
// can mistake absence of infrastructure for a real result. Swap in a real implementation behind the
// same interface when live search/enrichment exists.

import { config } from '../../config.mjs';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function round2(n) { return Math.round(n * 100) / 100; }

// --- Scout's epistemic model -------------------------------------------------------------------
// Two independent questions, never collapsed into one number:
//   FIT confidence   — how strong are the signals that this organisation is relevant/interesting?
//   IDENTITY status  — how sure are we the signals are about the SAME (legal) organisation?
//
// Principles (learned from the first live run, where a cold lead scored 0.95):
//   - Operator-supplied input (name, domain, note) is INPUT/CONTEXT, never evidence of fit. A
//     provided domain no longer adds fit confidence.
//   - External observations contribute, but with a PER-SOURCE cap and DIMINISHING returns, so many
//     light signals from one source can never stack into certainty.
//   - CORROBORATION across INDEPENDENT sources counts for more than repetition within one source.
//   - An unverified TED name-match is weak evidence and, alone, is gated so it can never produce
//     strong fit.
//   - Official verification (KVK/KBO, when connected later) is a strong FACT that lifts the identity
//     status to 'verified' and unlocks the 'approval' decision. It is OFF in this iteration.
export const FIT = {
  RECORD_MIN: 0.20,          // below this, a lead with no concrete handle is compressed away
  APPROVE_FIT: 0.60,         // fit needed for an 'approval' ask (also requires identity != unverified)
  SOURCE_CAP: { website: 0.15, 'company-website': 0.15, ted: 0.08, default: 0.10 },
  DIMINISH: 0.5,             // each extra same-source signal adds half the previous marginal
  CORROBORATION: 0.15,       // bonus when >= 2 independent external sources contribute
  INTERNAL: { org: 0.15, warmContact: 0.20, activity: 0.10 },
  VERIFICATION_FIRST: 0.35, VERIFICATION_MORE: 0.10, VERIFICATION_CAP: 0.50,
  EXTERNAL_GATE: { unverified: 0.30, probable: 0.55, verified: 1.0 }, // identity caps external fit
  IDENTITY_CONF: { unverified: 0.25, probable: 0.6, verified: 0.95 },
};

// Normalise a signal's source to a stable key for capping (website vs ted vs other).
function sourceKeyOf(s) {
  const n = String((s && (s.provider || s.source)) || '').toLowerCase();
  if (n.includes('ted')) return 'ted';
  if (n.includes('website')) return 'website';
  return n || 'extern';
}
function sourceCap(key) { return FIT.SOURCE_CAP[key] != null ? FIT.SOURCE_CAP[key] : FIT.SOURCE_CAP.default; }

// The internal, deterministic REASONING. `candidate` is human-provided or internal-signal data;
// `known` is what our own database already establishes about it; `externalSignals` are normalized
// observations gathered from external SOURCE providers (see providers/registry.mjs) — always treated
// as EXTERNAL OBSERVATIONS with a source, never as our own fact. No fabricated external facts.
function internalQualify({ candidate, known, externalSignals = [], verification = [] }) {
  const evidence = [];
  const name = (candidate.name || '').trim();
  const domain = (candidate.domain || '').trim().toLowerCase() || null;

  // Evidence 1: what the human handed us. This is CONTEXT, explicitly NOT proof of fit.
  evidence.push({
    sourceType: candidate.sourceType || 'provided', provided: true,
    sourceRef: candidate.sourceRef || (domain ? { domain } : { name }),
    detail: candidate.note ? `Aangedragen met context: ${candidate.note}` : 'Aangedragen kandidaat.',
    provider: 'operator',
  });
  if (domain) evidence.push({ sourceType: 'provided', provided: true, sourceRef: { domain }, detail: `Aangedragen domein: ${domain}.`, provider: 'operator' });

  const fitReasons = [];
  const identityReasons = [];

  // --- external observations: recorded, then scored per-source with diminishing returns --------
  const perSourceCount = {};
  let sawWebsite = false;
  for (const s of externalSignals || []) {
    if (!s || !s.claim) continue;
    const key = sourceKeyOf(s);
    perSourceCount[key] = (perSourceCount[key] || 0) + 1;
    if (key === 'website') sawWebsite = true;
    evidence.push({
      sourceType: 'external', source: s.source || null, url: s.url || null, observedAt: s.observedAt || null,
      sourceRef: s.url ? { url: s.url } : (s.sourceRef || {}), detail: s.claim, support: s.support || null,
      interpretation: s.interpretation || null, uncertainties: s.uncertainties || null,
      provider: s.provider || s.source || 'external',
      // Provenance of the binding decision (all external signals reaching qualify are already bound).
      bindingBasis: s.bindingBasis || null, identityBound: s.identityBound === true,
    });
    fitReasons.push(s.reason || `externe waarneming: ${s.claim}`);
  }
  const perSource = {};
  let externalRaw = 0;
  for (const [key, n] of Object.entries(perSourceCount)) {
    const c = sourceCap(key) * (1 - Math.pow(FIT.DIMINISH, n));
    perSource[key] = round2(c);
    externalRaw += c;
  }
  const distinctSources = Object.keys(perSourceCount).length;
  const corroboration = distinctSources >= 2 ? FIT.CORROBORATION : 0;
  if (corroboration) fitReasons.push('meerdere onafhankelijke bronnen wijzen dezelfde kant op');

  // --- internal (our own DB): a real existing relationship IS genuine fit evidence -------------
  let internal = 0; let viaContact = null;
  if (known && known.organization) {
    internal += FIT.INTERNAL.org;
    fitReasons.push('deze organisatie bestaat al in Maculis');
    identityReasons.push('bekend in Maculis');
    evidence.push({ sourceType: 'internal_db', sourceRef: { type: 'organization', id: known.organization.id }, detail: `Bestaat al als organisatie: ${known.organization.name}${known.organization.stage ? ` (fase ${known.organization.stage})` : ''}.`, provider: 'internal' });
  }
  if (known && Array.isArray(known.contacts) && known.contacts.length) {
    internal += FIT.INTERNAL.warmContact;
    const c = known.contacts[0];
    viaContact = { contactId: c.id, name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email, email: c.email };
    fitReasons.push(`er is al een bekende contactpersoon (${viaContact.name})`);
    evidence.push({ sourceType: 'internal_db', sourceRef: { type: 'contact', id: c.id }, detail: `Bekende contactpersoon bij deze organisatie: ${viaContact.name}.`, provider: 'internal' });
  }
  if (known && known.activityCount > 0) {
    internal += FIT.INTERNAL.activity;
    fitReasons.push('er is eerdere relatiehistorie');
    evidence.push({ sourceType: 'internal_db', sourceRef: { type: 'activity' }, detail: `${known.activityCount} eerdere activiteit(en) vastgelegd.`, provider: 'internal' });
  }

  // --- official verification (KVK/KBO): strong FACT + identity anchor (none live yet) ----------
  let verificationFit = 0; let verified = false; let vCount = 0;
  for (const m of verification || []) {
    if (!m || !m.name) continue;
    vCount += 1; verified = true;
    verificationFit += vCount === 1 ? FIT.VERIFICATION_FIRST : FIT.VERIFICATION_MORE;
    identityReasons.push(`officieel geverifieerd via ${m.source || 'register'}`);
    evidence.push({ sourceType: 'official_register', source: m.source || 'register', url: m.url || null, sourceRef: m.kvkNumber ? { kvkNumber: m.kvkNumber } : {}, detail: `Officieel geverifieerd (${m.source || 'register'}): ${m.name}${m.kvkNumber ? ` (KVK ${m.kvkNumber})` : ''}${m.place ? `, ${m.place}` : ''}.`, provider: m.provider || m.source || 'register' });
  }
  verificationFit = Math.min(verificationFit, FIT.VERIFICATION_CAP);

  // --- identity status: unverified -> probable -> verified ------------------------------------
  let identityStatus = 'unverified';
  if (verified) identityStatus = 'verified';
  else if (sawWebsite || (known && known.organization)) {
    identityStatus = 'probable';
    if (sawWebsite && !(known && known.organization)) identityReasons.push('eigen website op het opgegeven domein gezien');
  } else {
    identityReasons.push('alleen naam-match; identiteit niet bevestigd');
  }

  // --- fit: internal + identity-gated external + verification ---------------------------------
  const gate = FIT.EXTERNAL_GATE[identityStatus];
  const externalApplied = Math.min(gate, externalRaw + corroboration);
  const fitConfidence = round2(clamp(internal + externalApplied + verificationFit, 0, 0.99));

  // An 'approval' ask is only justified when the evidence is strong AND we are at least probably
  // sure of the identity. A cold, unverified lead is therefore never an automatic approval.
  const decision = (fitConfidence >= FIT.APPROVE_FIT && identityStatus !== 'unverified') ? 'approval' : 'awareness';

  // Epistemic status of the strongest claim (kept distinct; an observation never silently becomes fact).
  const epistemicStatus = verified ? 'FACT' : (externalRaw > 0 ? 'OBSERVATION' : (internal > 0 ? 'INFERENCE' : 'HYPOTHESIS'));

  const why = fitReasons.length
    ? `Mogelijk relevant omdat ${fitReasons.join(', ')}.`
    : 'Aangedragen kandidaat zonder externe onderbouwing. Menselijke beoordeling nodig.';

  // Proposed next step. A warm path proposes a prepared introduction (still human-approved before any
  // external contact). Otherwise human review. Nothing is sent.
  const proposedAction = viaContact
    ? { kind: 'prepare_intro', summary: `Mogelijke warme ingang via ${viaContact.name}. Bereid een introductie voor.`, domain, person: viaContact, mandate_required: 'send', approval_required: true }
    : { kind: 'human_review', summary: 'Nieuwe kandidaat. Menselijke beoordeling nodig voordat er iets gebeurt.', domain, approval_required: true };

  return {
    fits: true,
    epistemicStatus,
    confidence: fitConfidence,        // backward-compatible alias (was the single score)
    fitConfidence,
    identityStatus,
    identityConfidence: FIT.IDENTITY_CONF[identityStatus],
    identityReasons,
    decision,
    summary: why,
    reasons: fitReasons,
    evidence,
    proposedAction,
    person: viaContact,
    providerName: 'internal',
    fitBreakdown: {
      internal: round2(internal),
      perSource,
      externalRaw: round2(externalRaw),
      corroboration,
      externalApplied: round2(externalApplied),
      verification: round2(verificationFit),
      gate: identityStatus,
      gateCap: gate,
      total: fitConfidence,
    },
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
