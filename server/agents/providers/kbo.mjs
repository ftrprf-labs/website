// Digital Colleagues — KBO/BCE (Belgian Crossroads Bank) VERIFICATION seam (documented, NOT live).
//
// KBO/BCE is the authoritative Belgian company register and its core dataset is genuinely FREE open
// data. But there is no clean credential-free LIVE per-query API: the free route is a bulk open-data
// download (large files from FPS Economy) that must be ingested and refreshed, and the official live
// web service is paid per request. So KBO is a prepared SEAM, not wired live: turning it on is a
// product/infra decision (where to store the open data, how often to refresh), not just a flag.
//
// It stays `configured: false` and returns nothing, so nothing is fabricated. When the open-data
// ingest exists, implement verify() to look up an enterprise by name/VAT against the local mirror.

export function kboProvider() {
  return {
    name: 'kbo_bce',
    roles: ['DISCOVERY', 'ENRICHMENT', 'VERIFICATION'],
    configured: false, // free open data requires a bulk-ingest decision; no credential-free live query
    async verify() { return { matches: [], reason: 'kbo_open_data_ingest_required' }; },
  };
}
