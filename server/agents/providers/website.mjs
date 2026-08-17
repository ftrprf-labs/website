// Digital Colleagues — WEBSITE signal provider (credential-free, off by default, honest).
//
// A SOURCE provider that reads an organisation's OWN public website to observe light signals
// (positioning, hiring, news) about what may be happening now. It is credential-free and the least
// vendor-locked source there is: the subject itself. It is nonetheless OFF by default and only ever:
//   - fetches at most robots.txt and the homepage of the given domain (no crawling, no login);
//   - RESPECTS robots.txt (never circumvents a block);
//   - identifies itself with a real User-Agent and a contact URL;
//   - times out fast and stores only SHORT snippets needed for traceability;
//   - returns EXTERNAL OBSERVATIONS (source = the page URL, with the claim/support), never confirmed
//     fact about fit. Scout decides relevance, confidence and proposal.
//
// Live fetching only happens when SCOUT_WEBSITE_SIGNALS is set AND a fetch implementation exists; in
// tests a fetchImpl is injected so nothing external is ever contacted.

import { config } from '../../config.mjs';

const UA = 'MaculisScout/1.0 (+https://maculis.nl/scout; respecteert robots.txt)';
const MAX_BYTES = 200 * 1024;

export function websiteProvider() {
  return {
    name: 'website',
    roles: ['SIGNALS', 'ENRICHMENT'],
    configured: Boolean(config.scoutWebsiteSignals),
    // Observe signals for a subject { domain }. fetchImpl (WHATWG fetch shape) is injectable for tests.
    async signals(subject, { fetchImpl = null } = {}) {
      const domain = ((subject && subject.domain) || '').trim().toLowerCase();
      const fetcher = fetchImpl || (config.scoutWebsiteSignals ? globalThis.fetch : null);
      if (!domain || !fetcher) return { signals: [] };
      return fetchWebsiteSignals(domain, fetcher);
    },
  };
}

// Minimal, conservative robots.txt check. Unknown/absent robots => allowed (convention). A Disallow: /
// under User-agent: * (or our UA) blocks us. We never try to work around a block.
export function robotsAllows(robotsText, path = '/') {
  if (!robotsText) return true;
  const lines = String(robotsText).split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim());
  let applies = false; let disallowed = false;
  for (const line of lines) {
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase(); const val = m[2].trim();
    if (field === 'user-agent') applies = (val === '*' || /maculisscout/i.test(val));
    else if (field === 'disallow' && applies && val) { if (val === '/' || path.startsWith(val)) disallowed = true; }
  }
  return !disallowed;
}

async function safeText(resp) {
  try { return String(await resp.text()).slice(0, MAX_BYTES); } catch { return ''; }
}

// Fetch robots.txt (honour it) then the homepage, and extract signals. Best-effort: any failure yields
// no signals rather than an error, so a colleague's source problem never breaks the run.
export async function fetchWebsiteSignals(domain, fetcher) {
  const base = `https://${domain}`;
  const opt = {
    headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow',
    ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(5000) } : {}),
  };
  let allowed = true;
  try { const r = await fetcher(`${base}/robots.txt`, opt); if (r && r.ok) allowed = robotsAllows(await safeText(r), '/'); } catch { allowed = true; }
  if (!allowed) return { signals: [], blocked: 'robots' };

  let html = '';
  try { const r = await fetcher(`${base}/`, opt); if (!r || !r.ok) return { signals: [] }; html = await safeText(r); } catch { return { signals: [] }; }
  return { signals: extractSignals(html, `${base}/`) };
}

function firstMatch(re, s) { const m = re.exec(s); return m ? m[1].trim() : null; }

// Light, dependency-free extraction. We deliberately keep this shallow: positioning (title/description),
// a hiring section, and a news/press section. Each is an EXTERNAL OBSERVATION with the page URL.
export function extractSignals(html, url) {
  const signals = [];
  if (!html) return signals;
  const title = firstMatch(/<title[^>]*>([^<]{1,200})<\/title>/i, html);
  const desc = firstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i, html)
    || firstMatch(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i, html);
  if (title) {
    signals.push({
      claim: `Publieke positionering op de website: "${title}".`, support: desc || null, confidence: 0.4,
      source: 'company-website', sourceType: 'website', url,
      interpretation: 'Zelfpresentatie van de organisatie.',
      uncertainties: ['Momentopname; de positionering kan verouderd zijn.'],
    });
  }
  if (/(vacature|vacatures|careers|werken-bij|jobs)/i.test(html)) {
    signals.push({
      claim: 'De website heeft een vacature of werken-bij sectie.', confidence: 0.5,
      source: 'company-website', sourceType: 'website', url, relevantNow: true,
      reason: 'zichtbare werving kan op groei wijzen',
      interpretation: 'Mogelijke groei of uitbreiding.',
      uncertainties: ['Werving is een indirect groeisignaal.'],
    });
  }
  if (/(nieuws|news|persbericht|press|actueel|blog)/i.test(html)) {
    signals.push({
      claim: 'De website publiceert nieuws, actueel of persberichten.', confidence: 0.35,
      source: 'company-website', sourceType: 'website', url,
      interpretation: 'Actieve externe communicatie.',
      uncertainties: ['Aanwezigheid zegt niets over recentheid.'],
    });
  }
  return signals;
}
