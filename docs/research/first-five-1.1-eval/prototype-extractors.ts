// First Five 1.1 — PROTOTYPE evidence extractors (the 5 minimal extensions).
// Real deterministic detectors over already-fetched HTML. NOT production code. They implement the
// ClaimExtractor interface so the REAL live pipeline (analyseWebsite) can run them unchanged, and
// they feed the FROZEN engine + Gate without touching either.
//
// Extensions:
//  1) waarde/belofte evidence      -> value/positioning self_claims (lens: waarde)
//  2) generalized promise-vs-fact  -> promise self_claim(contradicted_by) + operational_fact (beyond waittime)
//  3) DRIFT where truly observable -> operational_fact(discontinued) for an advertised service
//  4) outside-in review-echo       -> one public review quote as external_signal (injected per host)
//  5) perspective/lens provenance  -> every claim carries `lens` (carried here on the candidate object)

type Lens = "zichtbaarheid" | "toestroom" | "verbondenheid" | "waarde";
const WALL = new Set(["persoonlijk","betrouwbaar","kwaliteit","maatwerk","service","snel","flexibel","deskundig","ervaren","professioneel","klantgericht","duurzaam","innovatief","oplossing","advies","specialist"]);

function fieldsOf(p: any): { text: string; surface: string }[] {
  const f: { text: string; surface: string }[] = [];
  if (p.title) f.push({ text: p.title, surface: `${p.role} <title>` });
  (p.h1 ?? []).forEach((h: string) => f.push({ text: h, surface: `${p.role} H1` }));
  (p.h2 ?? []).forEach((h: string) => f.push({ text: h, surface: `${p.role} H2` }));
  if (p.bodyClean) f.push({ text: p.bodyClean, surface: `${p.role} bodytekst` });
  return f;
}

// ---- 1) waarde / positionering ----------------------------------------------------------------
// Specific value/positioning terms with the noun they qualify. Deliberately conservative: only
// shopfront-ish surfaces (home/about/services), skip wallpaper, require a following noun so the
// subject is specific ("hoogwaardige interieurs", not a bare adjective).
const VALUE_RE = /\b(hoogwaardig[a-z]*|premium|high[- ]?end|exclusiev?[a-z]*|luxe|topsegment|toonaangevend[a-z]*|vooraanstaand[a-z]*|marktleider)\s+([a-zà-ÿ]{4,}[a-zà-ÿ\- ]{0,30}?)(?:[.,;!?]|$| voor | in | uit )/i;
function valueClaims(pages: any[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    if (!["home","about","services"].includes(p.role)) continue;
    for (const f of fieldsOf(p)) {
      const m = f.text.match(VALUE_RE);
      if (!m) continue;
      const phrase = (m[1] + " " + m[2]).trim().replace(/\s+/g, " ");
      const subjectTokens = phrase.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
      if (!subjectTokens.length || subjectTokens.every((t) => WALL.has(t))) continue;
      const subject = subjectTokens.slice(0, 3).join(" ");
      if (seen.has(subject)) continue; seen.add(subject);
      // quote: verbatim slice around the match so grounding passes
      const quote = m[0].replace(/[.,;!?]?\s*(voor|in|uit)?\s*$/i, "").trim();
      out.push({ kind: "self_claim", subject, lens: "waarde" as Lens,
        statement: `De organisatie positioneert zich op "${subject}".`,
        surface: f.surface, url: p.finalUrl, quote, page_role: p.role, extraction_method: "proposed:value-positioning" });
    }
  }
  return out;
}

// ---- 2) generalized promise-vs-fact -----------------------------------------------------------
// Beyond the existing waittime detector. Each rule pairs a PROMISE regex with a FACT regex on a
// shared subject key; fires only when BOTH appear (verbatim) somewhere on the site.
const PF_RULES: { subject: string; lens: Lens; promise: RegExp; fact: RegExp }[] = [
  { subject: "prijzen", lens: "waarde",
    promise: /\b(?:vaste|transparante|duidelijke|heldere)\s+(?:en\s+\w+\s+)?prijz\w*/i,
    fact: /\bprijz\w*\s+op\s+aanvraag\b|\bofferte\s+op\s+maat\b|\bneem\s+contact\s+op\s+voor\s+(?:een\s+)?(?:prijs|offerte)\b/i },
  { subject: "bereikbaarheid", lens: "toestroom",
    promise: /\b(?:24\/?7|dag\s+en\s+nacht|altijd\s+bereikbaar|24\s+uur\s+per\s+dag)\b/i,
    fact: /\b(?:ma|maandag)[a-z ]*?(?:van\s+)?\d{1,2}[:.]\d{2}\s*(?:tot|-|–)\s*\d{1,2}[:.]\d{2}\b|\bgesloten\s+(?:in\s+het\s+)?weekend\b|\balleen\s+op\s+afspraak\b/i },
];
function promiseFact(pages: any[]): any[] {
  const out: any[] = [];
  const corpus: { text: string; surface: string; url: string }[] = [];
  for (const p of pages) for (const f of fieldsOf(p)) corpus.push({ ...f, url: p.finalUrl });
  for (const rule of PF_RULES) {
    const pm = corpus.map((c) => ({ c, m: c.text.match(rule.promise) })).find((x) => x.m);
    const fm = corpus.map((c) => ({ c, m: c.text.match(rule.fact) })).find((x) => x.m);
    if (!pm || !fm) continue;
    out.push({ kind: "self_claim", subject: rule.subject, lens: rule.lens, contradicted_by: rule.subject,
      statement: `De etalage belooft "${pm.m![0].trim()}".`, surface: pm.c.surface, url: pm.c.url,
      quote: pm.m![0].trim(), page_role: "home", extraction_method: "proposed:promise-fact" });
    out.push({ kind: "operational_fact", subject: rule.subject, lens: "toestroom",
      statement: `De eigen tekst zegt "${fm.m![0].trim()}".`, surface: fm.c.surface, url: fm.c.url,
      quote: fm.m![0].trim(), page_role: "page", extraction_method: "proposed:promise-fact" });
  }
  return out;
}

// ---- 3) DRIFT (advertised, no longer delivered) -----------------------------------------------
const DRIFT_RE = /\b([a-zà-ÿ]{4,})\s+(?:bieden|leveren|verzorgen|doen|geven)\s+wij\s+niet\s+meer\s+aan\b|\bwij\s+(?:bieden|leveren)\s+geen\s+([a-zà-ÿ]{4,})\s+meer\b/i;
function driftClaims(pages: any[]): any[] {
  const out: any[] = [];
  const advertised = new Set<string>();
  for (const p of pages) {
    (p.navLabels ?? []).forEach((n: string) => n.toLowerCase().split(/\s+/).forEach((t) => t.length >= 4 && advertised.add(t)));
    if (p.title) p.title.toLowerCase().split(/\s+/).forEach((t: string) => t.length >= 4 && advertised.add(t));
    (p.h1 ?? []).forEach((h: string) => h.toLowerCase().split(/\s+/).forEach((t) => t.length >= 4 && advertised.add(t)));
  }
  for (const p of pages) for (const f of fieldsOf(p)) {
    const m = f.text.match(DRIFT_RE);
    if (!m) continue;
    const term = (m[1] || m[2] || "").toLowerCase();
    const advertisedHit = [...advertised].some((a) => a.includes(term) || term.includes(a));
    if (!advertisedHit) continue;   // only DRIFT if it was actually advertised
    out.push({ kind: "operational_fact", subject: term, lens: "zichtbaarheid", discontinued: true,
      statement: `De eigen tekst zegt dat "${term}" niet meer wordt aangeboden.`, surface: f.surface,
      url: p.finalUrl, quote: m[0].trim(), page_role: p.role, extraction_method: "proposed:drift" });
  }
  return out;
}

// ---- ClaimExtractor implementation ------------------------------------------------------------
export class ProposedExtractor {
  readonly name = "proposed-1.1(value+promisefact+drift+review)";
  constructor(private reviewsByHost: Record<string, any[]> = {}) {}
  async extract(pages: any[], host: string) {
    const claims = [...valueClaims(pages), ...promiseFact(pages), ...driftClaims(pages)];
    const reviews = this.reviewsByHost[host] ?? [];   // outside-in review-echo (one public quote)
    return { claims, caseSet: [], reviews, vacancies: [], extractor: this.name };
  }
}
