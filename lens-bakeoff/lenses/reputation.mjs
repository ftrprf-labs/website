// Lens candidate 1: Reputation and Reception (outside-in cross-lens).
// Question: how does the outside world receive my business, and does it match what I project.
// Evidence: website promise (reused First Five style extraction, pre-extracted here) crossed with
// public reviews, identity consistency (KVK vs site vs GBP), findability, trust/security signals.
// All Level 1 outside-in (public data about a business, not persons).
//
// Relation families used: CONTRADICTION (cross-surface promise vs reception, identity mismatch,
// trust vs promise), TELLING_ABSENCE (claimed strength never corroborated; reviews unanswered),
// and the extended ASYMMETRY family (established but invisible) which we keep as-is to test the gate.

import { obs, rel, ref, pct } from './_util.mjs';

const LENS = 'reputation';

// A promise theme is "supported" if it appears in customer review themes above a small floor.
function themeShare(themes, theme) {
  const t = (themes || []).find((x) => x.theme === theme);
  return t ? t.share : 0;
}

// Identity matching must NOT flag the normal, benign difference between a legal entity name
// (KVK: "Bloom Retail BV") and a customer-facing trade name ("Webshop Bloom"). Doing so is a
// classic false-positive machine. We normalise legal suffixes and treat a containment as a match,
// and we only compare the two customer-facing surfaces (site and Google profile) for a name gap.
const LEGAL_SUFFIX = /\b(b\.?v\.?|v\.?o\.?f\.?|n\.?v\.?|holding|groep|group|cv|c\.?v\.?)\b/gi;
function normName(s) {
  return String(s || '').toLowerCase().replace(LEGAL_SUFFIX, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function nameGap(a, b) {
  const na = normName(a); const nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return false;
  if (na.includes(nb) || nb.includes(na)) return false; // shortened trade name is not a gap
  return true;
}
function realAddress(a) {
  const t = String(a || '').toLowerCase();
  return t && !/online|afgeschermd|thuisadres/.test(t);
}

export const reputationLens = {
  id: 'reputation.reception',
  name: 'Reputation and Reception',
  observe(c) {
    const out = [];
    const w = c.website || {};
    const r = c.reputation || {};

    // Brand promise observations (what the site fronts as its strength).
    for (const claim of w.claims || []) {
      out.push(obs({
        lens: LENS,
        kind: claim.kind === 'self_emphasis' ? 'self_emphasis' : 'self_claim',
        subject: claim.subject,
        statement: `De site presenteert "${claim.subject}" als kernbelofte.`,
        confidence: claim.prominence === 'hero' ? 'L2' : 'L1',
        basis: [ref('website', `"${claim.quote}"`, 'extraction')],
        notes: claim.acknowledged ? 'acknowledged' : '',
      }));
    }

    // Public review reception.
    const places = r.places;
    if (places && typeof places.count === 'number' && places.count >= 5) {
      for (const th of places.reviewThemes || []) {
        out.push(obs({
          lens: LENS,
          kind: 'external_signal',
          subject: th.theme,
          statement: `Klanten schrijven vooral over "${th.theme}" (${pct(th.share * 100)} van de themas).`,
          confidence: th.share >= 0.25 ? 'L2' : 'L1',
          basis: [ref('reviews', `${places.count} reviews, thema-aandeel ${pct(th.share * 100)}`, 'aggregate')],
        }));
      }
      out.push(obs({
        lens: LENS, kind: 'external_signal', subject: 'reviewrespons',
        statement: `Van ${places.count} reviews is ${pct((places.responseRate || 0) * 100)} beantwoord.`,
        confidence: 'L3',
        basis: [ref('reviews', `responsgraad ${pct((places.responseRate || 0) * 100)}`, 'aggregate')],
      }));
    }

    // Identity consistency (authoritative sources).
    const id = r.identity;
    if (id) {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'naam- en adresconsistentie',
        statement: `KVK: ${id.kvkName} / ${id.kvkAddress}. Site: ${id.siteName} / ${id.siteAddress}. Google: ${id.gbpName}.`,
        confidence: 'L4',
        basis: [ref('kvk', id.kvkName, 'registry'), ref('website', id.siteName, 'fetch'), ref('gbp', id.gbpName, 'places')],
      }));
    }

    // Findability footprint.
    const f = r.findability;
    if (f) {
      out.push(obs({
        lens: LENS, kind: 'external_signal', subject: 'vindbaarheid',
        statement: `Domein ${f.domainAgeYears} jaar oud, ${f.indexedPages} geindexeerde paginas, ${f.nonBrandedImpressions} niet-merkgebonden vertoningen.`,
        confidence: 'L3',
        basis: [ref('rdap', `domein ${f.domainAgeYears} jaar`, 'registry'), ref('search', `${f.nonBrandedImpressions} non-branded impressies`, 'proxy')],
      }));
    }

    // Trust / security signals.
    const t = r.trust;
    if (t) {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'trustsignalen',
        statement: `HTTPS ${t.https ? 'ja' : 'nee'}, HSTS ${t.hsts ? 'ja' : 'nee'}, security-headers score ${t.securityHeadersScore}/5, cert ${t.certDaysToExpiry} dagen geldig.`,
        confidence: 'L4',
        basis: [ref('headers', `HSTS ${t.hsts ? 'aan' : 'uit'}, score ${t.securityHeadersScore}/5`, 'deterministic')],
      }));
    }
    return out;
  },

  relate(observations, c) {
    const out = [];
    const r = c.reputation || {};
    const places = r.places;
    const promises = observations.filter((o) => o.kind === 'self_claim' || o.kind === 'self_emphasis');
    const extThemes = places ? places.reviewThemes || [] : [];

    // 1) Promise vs reception. A claimed strength that the public simply does not echo.
    for (const p of promises) {
      if (p.notes.includes('acknowledged')) continue;
      const share = themeShare(extThemes, p.subject);
      if (places && places.count >= 5 && share < 0.1) {
        // Is there a competing theme that dominates? Then it is a CONTRADICTION, else a TELLING_ABSENCE.
        const dominant = extThemes.filter((x) => x.share >= 0.25).map((x) => x.theme);
        const contradicts = dominant.length > 0;
        out.push(rel({
          family: contradicts ? 'CONTRADICTION' : 'TELLING_ABSENCE',
          obsList: [p, ...observations.filter((o) => o.kind === 'external_signal' && dominant.includes(o.subject))],
          crossLens: true,
          tension: contradicts
            ? `De belofte "${p.subject}" komt niet terug in klanttaal, terwijl klanten vooral "${dominant.join('", "')}" benoemen.`
            : `De belofte "${p.subject}" wordt in geen enkele publieke review benoemd.`,
          why: 'Raakt de vraag: is de kracht die ik claim de kracht die mijn klanten ervaren?',
          confidence: contradicts ? 'L3' : 'L3',
        }));
      }
    }

    // 2) Identity mismatch across CUSTOMER-FACING surfaces (site vs Google profile), plus a genuine
    //    address gap. Legal-vs-trade name differences are normalised away (not a reveal).
    const id = r.identity;
    if (id) {
      const nameMismatch = nameGap(id.siteName, id.gbpName);
      const addrMismatch = realAddress(id.siteAddress) && realAddress(id.kvkAddress) &&
        normName(id.siteAddress) !== normName(id.kvkAddress);
      if (nameMismatch || addrMismatch) {
        const idObs = observations.find((o) => o.subject === 'naam- en adresconsistentie');
        out.push(rel({
          family: 'CONTRADICTION',
          obsList: [idObs],
          crossLens: true,
          tension: nameMismatch
            ? `Je site en je Google-profiel presenteren je onder een andere naam: "${id.siteName}" tegenover "${id.gbpName}".`
            : `Het adres op je site en je registratie komen niet overeen.`,
          why: 'Raakt de vraag: kan wie mij zoekt mij eenduidig terugvinden?',
          confidence: 'L3',
        }));
      }
    }

    // 3) Established but invisible (ASYMMETRY, extended family, kept to test the gate).
    const f = r.findability;
    if (f && f.domainAgeYears >= 8 && (places && places.rating >= 4.3) && f.nonBrandedImpressions < 300) {
      const fObs = observations.find((o) => o.subject === 'vindbaarheid');
      out.push(rel({
        family: 'ASYMMETRY',
        obsList: [fObs],
        crossLens: true,
        tension: `Je bent al ${f.domainAgeYears} jaar gevestigd en goed beoordeeld, maar bijna onvindbaar voor wie je nog niet kent.`,
        why: 'Raakt de vraag: bereikt mijn reputatie ook de mensen die mij nog niet kennen?',
        confidence: 'L3',
      }));
    }

    // 4) Trust vs promise (care claimed, trust signals weak).
    const t = r.trust;
    const caresClaim = promises.find((p) => /aandacht|zorg|veilig|vertrouwen|betrouwbaar|professioneel/i.test(p.subject));
    if (t && caresClaim && (!t.hsts || t.securityHeadersScore <= 1 || t.certDaysToExpiry < 20)) {
      const tObs = observations.find((o) => o.subject === 'trustsignalen');
      out.push(rel({
        family: 'CONTRADICTION',
        obsList: [caresClaim, tObs],
        crossLens: true,
        tension: `Je merk belooft "${caresClaim.subject}", maar je site mist basale beveiligingssignalen die vertrouwen dragen.`,
        why: 'Raakt de vraag: straalt mijn digitale voordeur dezelfde zorg uit als mijn belofte?',
        confidence: 'L3',
      }));
    }

    // 5) Reviews unanswered while attention is the promise (TELLING_ABSENCE).
    const attentionClaim = promises.find((p) => /aandacht|persoonlijk|betrokken|contact/i.test(p.subject));
    if (places && places.count >= 10 && (places.responseRate || 0) < 0.1 && attentionClaim) {
      const respObs = observations.find((o) => o.subject === 'reviewrespons');
      out.push(rel({
        family: 'TELLING_ABSENCE',
        obsList: [attentionClaim, respObs],
        crossLens: true,
        tension: `Je belooft "${attentionClaim.subject}", maar bijna geen enkele publieke review is beantwoord.`,
        why: 'Raakt de vraag: laat ik mijn belofte ook zien waar iedereen meekijkt?',
        confidence: 'L3',
      }));
    }
    return out;
  },

  word(rel) {
    // Neutral, non-causal wording for the reveal screen.
    return rel.tension;
  },
};
