// Digital Colleagues — external SOURCE provider registry (multi-source, Scout stays the brain).
//
// Scout must never become "just a wrapper around one vendor". Its intelligence — normalisation,
// relation check, evidence, reasoning, confidence, deduplication, attention decision, proposal — stays
// in Scout. This registry is only the pluggable SOURCE layer beneath it. Each provider declares which
// role(s) it can play and whether it is configured; the aggregator gathers their raw observations and
// hands them back NORMALISED and SOURCE-TAGGED for Scout to reason over.
//
// Roles (§FASE 1):
//   DISCOVERY     — who exists / who could be relevant (find new orgs/people).
//   SIGNALS       — what is happening now that makes someone interesting (news, hiring, tenders, change).
//   ENRICHMENT    — responsibly add to what we already know (firmographics, description).
//   VERIFICATION  — can we check a claim / identity / organisation / contactability?
//
// DEFAULT: no source makes a live external call. External registries (KVK, KBO/BCE, TED, ...) are
// documented seams (see docs/architecture/SCOUT_DISCOVERY_SOURCES.md), NOT wired here — they need a
// product/provider decision and credentials. The only built-in provider is the credential-free website
// signal provider, and even that is OFF unless SCOUT_WEBSITE_SIGNALS is set.

import { websiteProvider } from './website.mjs';
import { tedProvider } from './ted.mjs';
import { kvkProvider } from './kvk.mjs';
import { kboProvider } from './kbo.mjs';

export const SOURCE_ROLES = ['DISCOVERY', 'SIGNALS', 'ENRICHMENT', 'VERIFICATION'];

// SIGNALS/ENRICHMENT source providers that are actually enabled for this process. Empty unless a
// credential-free source is explicitly switched on. Never includes a stub that would fabricate data.
export function listSourceProviders() {
  return [websiteProvider(), tedProvider()].filter((p) => p.configured);
}

// VERIFICATION providers (official registers). Enabled only when configured (KVK needs a key; KBO
// needs a bulk-ingest decision, so it stays off).
export function listVerificationProviders() {
  return [kvkProvider(), kboProvider()].filter((p) => p.configured);
}

// A compact status board for /api/agents/status: which roles each source can play, whether it is
// configured, and whether it needs credentials. Reflects the REAL configured state.
export function sourceProviderStatus() {
  const site = websiteProvider(); const ted = tedProvider(); const kvk = kvkProvider(); const kbo = kboProvider();
  return [
    { name: site.name, roles: site.roles, configured: site.configured, credentials: false, note: 'Eigen website van de organisatie (robots-respecterend). Aan met SCOUT_WEBSITE_SIGNALS.' },
    { name: ted.name, roles: ted.roles, configured: ted.configured, credentials: false, note: 'EU aanbestedingen (TED). Anonieme API. Aan met SCOUT_TED.' },
    { name: kvk.name, roles: kvk.roles, configured: kvk.configured, credentials: true, note: 'NL Handelsregister. Klaar; vereist KVK_API_KEY + NL-entiteit (menselijke stap).' },
    { name: kbo.name, roles: kbo.roles, configured: kbo.configured, credentials: false, note: 'BE Kruispuntbank open data. Gratis, maar bulk-ingest nodig (productbeslissing).' },
  ];
}

function normalizeSignal(s, provider) {
  return {
    claim: String(s.claim || '').slice(0, 300),
    support: s.support ? String(s.support).slice(0, 500) : null,
    confidence: typeof s.confidence === 'number' ? s.confidence : 0.4,
    source: s.source || provider.name,
    provider: provider.name,
    sourceType: s.sourceType || 'external',
    url: s.url || null,
    observedAt: s.observedAt || null,
    interpretation: s.interpretation || null,
    uncertainties: Array.isArray(s.uncertainties) ? s.uncertainties : (s.uncertainties ? [String(s.uncertainties)] : null),
    relevantNow: Boolean(s.relevantNow),
    reason: s.reason || null,
  };
}

// Gather external SIGNALS / ENRICHMENT for a subject across enabled providers. Never throws: a failing
// or slow source is skipped so a colleague's source problem never breaks the run. `sources` may be
// injected (tests) to avoid any live call. Returns NORMALISED, source-tagged observations.
export async function gatherExternalSignals(subject, { sources = null, fetchImpl = null } = {}) {
  const providers = sources || listSourceProviders();
  const out = [];
  for (const p of providers) {
    if (!p || typeof p.signals !== 'function') continue;
    try {
      const r = await p.signals(subject, { fetchImpl });
      for (const s of (r && r.signals) || []) out.push(normalizeSignal(s, p));
    } catch { /* a source problem must not break the colleague */ }
  }
  return out;
}

// Gather official-register VERIFICATION matches for a subject. Empty unless a verification provider is
// configured (KVK/KBO). Each match is tagged with its official source, for a traceable identity FACT.
export async function gatherVerification(subject, { sources = null, fetchImpl = null } = {}) {
  const providers = sources || listVerificationProviders();
  const out = [];
  for (const p of providers) {
    if (!p || typeof p.verify !== 'function') continue;
    try {
      const r = await p.verify(subject, { fetchImpl });
      for (const m of (r && r.matches) || []) out.push({ ...m, source: m.source || p.name, provider: p.name });
    } catch { /* a source problem must not break the colleague */ }
  }
  return out;
}
