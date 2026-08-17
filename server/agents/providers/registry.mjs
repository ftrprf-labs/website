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

export const SOURCE_ROLES = ['DISCOVERY', 'SIGNALS', 'ENRICHMENT', 'VERIFICATION'];

// Built-in source providers that are actually enabled for this process. Empty unless a credential-free
// provider is explicitly switched on. Never includes a stub that would fabricate data.
export function listSourceProviders() {
  const providers = [];
  const site = websiteProvider();
  if (site.configured) providers.push(site);
  return providers;
}

// A compact status board of source providers for the /api/agents/status surface: which roles they can
// play and whether they are configured. Lets the cockpit/registry show "what can Scout reach today".
export function sourceProviderStatus() {
  const site = websiteProvider();
  return [
    { name: site.name, roles: site.roles, configured: site.configured, credentials: false, note: 'Eigen website van de organisatie (robots-respecterend). Standaard uit.' },
    // Documented seams, not wired (need a provider decision + credentials):
    { name: 'kvk', roles: ['DISCOVERY', 'ENRICHMENT', 'VERIFICATION'], configured: false, credentials: true, note: 'NL Handelsregister. Vereist API-key + NL-entiteit.' },
    { name: 'kbo_bce', roles: ['DISCOVERY', 'ENRICHMENT', 'VERIFICATION'], configured: false, credentials: false, note: 'BE Kruispuntbank open data. Gratis, maar bulk-ingest nodig (productbeslissing).' },
    { name: 'ted', roles: ['SIGNALS'], configured: false, credentials: false, note: 'EU aanbestedingen. Anonieme read-only API. Bronkeuze nodig.' },
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
