// First Five 1.1 — evaluation on the REAL live pipeline (analyseWebsite), CURRENT vs NEW extractor.
// Prints the full per-case trace: CURRENT -> new evidence -> candidate relation -> Gate -> outcome.
// Part B uses REAL observed technical signals (ama-ned/hema/oca) to show Reveal vs technical duiding
// are SEPARATE layers. Frozen engine + Gate untouched.
import { analyseWebsite } from "/workspace/maculis-first-five./src/live/pipeline.js";
import { DeterministicClaimExtractor } from "/workspace/maculis-first-five./src/live/extract.js";
import { buildTechnicalTeaser } from "/workspace/maculis-first-five./src/live/technical.js";
import { ProposedExtractor } from "./extractors.js";

const NOW = "2026-08-15T00:00:00.000Z";
const P = (o: any) => ({
  requestedUrl: o.url, finalUrl: o.url, role: o.role, selection_reason: "case", status: 200, ok: true,
  title: o.title ?? null, metaDescription: o.meta ?? null, lang: o.lang ?? "nl",
  h1: o.h1 ?? [], h2: o.h2 ?? [], h3: o.h3 ?? [], navLabels: o.nav ?? [], internalLinks: o.links ?? [],
  bodyRaw: o.body ?? "", bodyClean: o.body ?? "", wordCount: (o.body ?? "").split(/\s+/).filter(Boolean).length,
  observed_at: NOW, retrieval_layer: "stub", technical: o.technical, responseHeaders: o.headers,
});
const stub = (pages: any[]) => ({ name: "stub", async retrieve() {
  return { ok: true, reason: "ok", pages, timings_ms: { retrieval: 1 },
    coverage: { inputUrl: "x", normalizedUrl: "x", registrableHost: "x", retrieval_layer: "stub", maxPages: pages.length,
      maxDepth: 1, pagesDiscovered: [], pagesSelected: [], pagesRetrieved: [], pagesFailed: [], pagesDiscoveredNotRetrieved: [],
      robotsRespected: true, absenceScope: "" } };
} });

// One public review quote per host = what a single outside-in Places lookup would return.
const REVIEWS: Record<string, any[]> = {
  "snel-geregeld.nl": [{ url: "https://maps.google/r1", subject: "begeleiding", quote: "De begeleiding was fantastisch en heel persoonlijk." }],
  "daktuin-proof.nl": [{ url: "https://maps.google/r2", subject: "daktuinen", quote: "Prachtige daktuin aangelegd, echte vakmensen." }],
};

type Case = { id: string; host: string; url: string; real: boolean; expect: string; pages: any[] };
const CASES: Case[] = [
  // --- REAL committed content fixtures (from the First Five test suite) ---
  { id: "brandingbysam", host: "brandingbysam.nl", url: "https://brandingbysam.nl", real: true,
    expect: "CURRENT PatternReader reveal (value_open); NEW should PRESERVE, not replace with audit",
    pages: [
      P({ role: "home", url: "https://brandingbysam.nl/", title: "Branding by Sam", h1: ["Ik maak merken die kloppen"], body: "Ik maak merken die kloppen voor ondernemers." }),
      P({ role: "about", url: "https://brandingbysam.nl/over", title: "Over Sam", h1: ["Dit is Sam, merkontwerper"], body: "Dit is Sam. Ik ben merkontwerper en werk voor ondernemers." }),
      P({ role: "services", url: "https://brandingbysam.nl/diensten", title: "Diensten", h2: ["Logo, huisstijl, merkstrategie"], body: "Logo, huisstijl en merkstrategie voor jouw merk." }),
    ] },
  { id: "praktijk", host: "praktijk.nl", url: "https://praktijk.nl", real: true,
    expect: "CURRENT waittime CONTRADICTION reveal; NEW preserves",
    pages: [
      P({ role: "home", url: "https://praktijk.nl/", title: "Praktijk", h1: ["Psychologische hulp zonder wachtlijst"], body: "Psychologische hulp zonder wachtlijst. Wachttijd tot intake: 6 weken. Wij nemen de tijd." }),
      P({ role: "about", url: "https://praktijk.nl/over", title: "Over", body: "Onze praktijk bestaat sinds 2012." }),
      P({ role: "services", url: "https://praktijk.nl/aanbod", title: "Aanbod", body: "Wij bieden gesprekstherapie." }),
    ] },
  { id: "coherent", host: "coherent.nl", url: "https://coherent.nl", real: true,
    expect: "SILENCE (thin, modest) -> silence duiding only",
    pages: [
      P({ role: "home", url: "https://coherent.nl/", title: "Coherent", h1: ["Welkom bij Coherent"], body: "Wij helpen organisaties met samenwerking." }),
      P({ role: "about", url: "https://coherent.nl/over", title: "Over ons", h1: ["Wie wij zijn"], body: "Wij zijn een klein team dat met plezier werkt." }),
      P({ role: "services", url: "https://coherent.nl/diensten", title: "Diensten", body: "Advies en begeleiding bij samenwerking." }),
    ] },
  // --- representative cases (labelled) exercising each new family ---
  { id: "amaned-like", host: "ama-ned-like.nl", url: "https://ama-ned-like.nl", real: false,
    expect: "REGRESSION: well-built industrial, modest+proven -> SILENCE both",
    pages: [
      P({ role: "home", url: "https://ama-ned-like.nl/", title: "Industriele automatisering", h1: ["Betrouwbare besturingskasten"], body: "Sinds 1998 bouwen wij besturingskasten voor de voedingsindustrie. Bekijk onze projecten." }),
      P({ role: "cases", url: "https://ama-ned-like.nl/projecten", title: "Projecten", h2: ["Besturingskast voedingsindustrie","Paneelbouw machinebouw","Retrofit productielijn","Schakelkast waterbehandeling"], body: "Onze projecten in besturingskasten voor voedingsindustrie en machinebouw." }),
      P({ role: "about", url: "https://ama-ned-like.nl/over", title: "Over ons", h1: ["Over ons"], body: "Ons team van engineers bouwt besturingskasten sinds 1998." }),
    ] },
  { id: "premium-studio", host: "premium-studio.nl", url: "https://premium-studio.nl", real: false,
    expect: "value-claim absence: does NEW help, or is it audit-like / does it preempt PatternReader?",
    pages: [
      P({ role: "home", url: "https://premium-studio.nl/", title: "Premium Studio", h1: ["Hoogwaardige interieurs op maat"], body: "Hoogwaardige interieurs op maat voor uw woning." }),
      P({ role: "services", url: "https://premium-studio.nl/diensten", title: "Diensten", h1: ["Onze diensten"], body: "Wij ontwerpen interieurs." }),
      P({ role: "about", url: "https://premium-studio.nl/over", title: "Over", h1: ["Over ons"], body: "Wij zijn een jong studio." }),
    ] },
  { id: "bouwadvies-prijs", host: "bouwadvies-prijs.nl", url: "https://bouwadvies-prijs.nl", real: false,
    expect: "NEW: price promise-vs-fact CONTRADICTION",
    pages: [
      P({ role: "home", url: "https://bouwadvies-prijs.nl/", title: "Bouwadvies", h1: ["Altijd vaste, transparante prijzen"], body: "Altijd vaste, transparante prijzen zonder verrassingen." }),
      P({ role: "contact", url: "https://bouwadvies-prijs.nl/contact", title: "Contact", body: "Neem contact op voor een offerte; prijzen op aanvraag." }),
      P({ role: "about", url: "https://bouwadvies-prijs.nl/over", title: "Over", body: "Wij adviseren bij bouwprojecten." }),
    ] },
  { id: "snel-vs-review", host: "snel-geregeld.nl", url: "https://snel-geregeld.nl", real: false,
    expect: "NEW: MISCAST via one public review echo (belofte vs buitenwereld)",
    pages: [
      P({ role: "home", url: "https://snel-geregeld.nl/", title: "Snel geregeld", h1: ["Snel en efficient geregeld"], body: "Snel en efficient geregeld. Onze begeleiding is er voor u." }),
      P({ role: "services", url: "https://snel-geregeld.nl/diensten", title: "Diensten", h1: ["Onze diensten"], body: "Persoonlijke begeleiding gedurende het hele traject, met aandacht en begeleiding." }),
      P({ role: "about", url: "https://snel-geregeld.nl/over", title: "Over", h1: ["Over ons"], body: "Wij bieden begeleiding aan ondernemers." }),
    ] },
  { id: "drift-training", host: "drift-training.nl", url: "https://drift-training.nl", real: false,
    expect: "NEW: DRIFT (advertised service no longer delivered)",
    pages: [
      P({ role: "home", url: "https://drift-training.nl/", title: "Adviesbureau", h1: ["Advies en trainingen"], nav: ["Home","Trainingen","Contact"], body: "Wij geven advies en trainingen aan teams." }),
      P({ role: "services", url: "https://drift-training.nl/trainingen", title: "Trainingen", h1: ["Trainingen"], body: "Trainingen bieden wij niet meer aan; wij richten ons nu op advies." }),
      P({ role: "about", url: "https://drift-training.nl/over", title: "Over", body: "Ons bureau adviseert organisaties." }),
    ] },
  { id: "daktuin-proof", host: "daktuin-proof.nl", url: "https://daktuin-proof.nl", real: false,
    expect: "REGRESSION: specialism WITH proof + a public review -> SILENCE (proof suppresses; review must not force)",
    pages: [
      P({ role: "home", url: "https://daktuin-proof.nl/", title: "Daktuinen", h1: ["Specialist in daktuinen"], body: "Wij zijn specialist in daktuinen en leveren daktuinen door heel Nederland." }),
      P({ role: "cases", url: "https://daktuin-proof.nl/projecten", title: "Daktuinen projecten", h2: ["Daktuin kantoorpand","Daktuin woning","Daktuin school","Daktuin ziekenhuis"], body: "Bekijk onze daktuinen projecten." }),
      P({ role: "about", url: "https://daktuin-proof.nl/over", title: "Over daktuinen", body: "Ons team legt daktuinen aan sinds 2008." }),
    ] },
  { id: "wallpaper-co", host: "wallpaper-co.nl", url: "https://wallpaper-co.nl", real: false,
    expect: "REGRESSION: pure wallpaper -> SILENCE both",
    pages: [
      P({ role: "home", url: "https://wallpaper-co.nl/", title: "Betrouwbaar en persoonlijk", h1: ["Betrouwbaar, persoonlijk, kwaliteit"], body: "Wij staan voor kwaliteit, service en maatwerk. Betrouwbaar en persoonlijk." }),
      P({ role: "about", url: "https://wallpaper-co.nl/over", title: "Over", body: "Deskundig en flexibel." }),
      P({ role: "services", url: "https://wallpaper-co.nl/diensten", title: "Diensten", body: "Onze diensten." }),
    ] },
  { id: "maatwerk-proof", host: "maatwerk-proof.nl", url: "https://maatwerk-proof.nl", real: false,
    expect: "REGRESSION: value claim WITH proof -> NEW must NOT reveal",
    pages: [
      P({ role: "home", url: "https://maatwerk-proof.nl/", title: "Hoogwaardig maatwerk meubelen", h1: ["Hoogwaardig maatwerk meubelen"], body: "Hoogwaardig maatwerk meubelen uit eigen werkplaats." }),
      P({ role: "cases", url: "https://maatwerk-proof.nl/werk", title: "Ons werk", h2: ["Maatwerk kast","Maatwerk tafel","Maatwerk keuken","Maatwerk trap"], body: "Hoogwaardig maatwerk meubelen die wij maakten." }),
      P({ role: "about", url: "https://maatwerk-proof.nl/over", title: "Over", body: "Onze schrijnwerkerij levert hoogwaardig maatwerk sinds 1990." }),
    ] },
];

function newEvidenceSummary(trace: any): string {
  // which proposed detectors contributed accepted claims/externals
  const acc = (trace.claims_accepted ?? []).filter((c: any) => String(c.extraction_method).startsWith("proposed:"));
  const ext = (trace.externals ?? []);
  const bits = acc.map((c: any) => `${c.extraction_method.replace("proposed:","")}:${c.subject}`);
  if (ext.length) bits.push(`review-echo:${ext.map((e: any) => e.subject).join("/")}`);
  return bits.length ? bits.join(", ") : "(none accepted)";
}
function candidateChain(trace: any): string {
  const et = trace.engine_trace;
  if (!et) return "-";
  const cands = (et.candidates ?? []).map((c: any) => c.family);
  const passed = (et.reveals ?? []).filter((r: any) => r.gate?.passed).map((r: any) => r.family);
  return `cands=[${cands.join(",")||"-"}] gatePassed=[${passed.join(",")||"-"}]`;
}
function revealDesc(res: any): string {
  if (res.outcome !== "REVEAL" || !res.reveal) return res.outcome;
  const src = res.reveal.family && ["CONTRADICTION","TELLING_ABSENCE","MISCAST","DRIFT"].includes(res.reveal.family) ? "frozen" : "pattern";
  return `REVEAL[${src}:${res.reveal.family}]`;
}

const detOnly = () => new DeterministicClaimExtractor();
const composite = () => ({ name: "det+proposed", async extract(pages: any, host: string) {
  const a = await detOnly().extract(pages, host);
  const b = await new ProposedExtractor(REVIEWS).extract(pages, host);
  return { claims: [...a.claims, ...b.claims], caseSet: [...a.caseSet, ...b.caseSet],
    reviews: [...a.reviews, ...b.reviews], vacancies: [...a.vacancies, ...b.vacancies], extractor: "det+proposed" };
} });

console.log("\n================ PART A — CONTENT REVEAL (real live pipeline) ================\n");
const rows: any[] = [];
for (const c of CASES) {
  const cur = await analyseWebsite(c.url, { retriever: stub(c.pages), extractor: detOnly(), now: NOW });
  const nw = await analyseWebsite(c.url, { retriever: stub(c.pages), extractor: composite(), now: NOW });
  rows.push({ id: c.id, real: c.real, cur: revealDesc(cur.result), nw: revealDesc(nw.result),
    newEv: newEvidenceSummary(nw.trace), chain: candidateChain(nw.trace),
    curReveal: cur.result.reveal?.wording ?? null, nwReveal: nw.result.reveal?.wording ?? null, expect: c.expect });
}
for (const r of rows) {
  console.log(`### ${r.id}${r.real ? " (REAL fixture)" : ""}`);
  console.log(`  expect : ${r.expect}`);
  console.log(`  CURRENT: ${r.cur}`);
  console.log(`  NEW ev : ${r.newEv}`);
  console.log(`  NEW    : ${r.nw}   ${r.chain}`);
  if (r.nwReveal && r.nw !== r.cur) console.log(`  wording: ${r.nwReveal}`);
  console.log("");
}

// aggregate
const isR = (s: string) => s.startsWith("REVEAL");
const flips = rows.filter((r) => !isR(r.cur) && isR(r.nw));
const preserved = rows.filter((r) => isR(r.cur) && isR(r.nw));
const changedKind = rows.filter((r) => isR(r.cur) && isR(r.nw) && r.cur !== r.nw);
const brokeSilence = rows.filter((r) => r.expect.includes("SILENCE") && isR(r.nw));
console.log("---- AGGREGATE (Part A) ----");
console.log("cases:", rows.length);
console.log("CURRENT reveals:", rows.filter((r) => isR(r.cur)).length, "| NEW reveals:", rows.filter((r) => isR(r.nw)).length);
console.log("SILENCE->REVEAL flips:", flips.map((r) => `${r.id}(${r.nw})`).join(", ") || "none");
console.log("reveals preserved:", preserved.map((r) => r.id).join(", ") || "none");
console.log("reveal KIND changed by NEW (watch: audit preempting synthesis):", changedKind.map((r) => `${r.id} ${r.cur}->${r.nw}`).join(", ") || "none");
console.log("regressions wrongly turned to REVEAL (must be 0):", brokeSilence.map((r) => r.id).join(", ") || "0");

console.log("\n================ PART B — TECHNICAL SIGNALS ARE A SEPARATE LAYER (REAL data) ================\n");
const AMANED = { htmlBytes: 106374, hasViewport: true, hasCanonical: true, robotsNoindex: false, jsonLd: 1, imgTotal: 5, imgWithAlt: 5, titleLen: 40, metaDescLen: 151, h1Count: 1 };
const HEMA = { htmlBytes: 439988, hasViewport: true, hasCanonical: true, robotsNoindex: false, jsonLd: 2, imgTotal: 120, imgWithAlt: 120, titleLen: 40, metaDescLen: 153, h1Count: 0 };
const OCA = { htmlBytes: 421829, hasViewport: true, hasCanonical: true, robotsNoindex: false, jsonLd: 0, imgTotal: 143, imgWithAlt: 39, titleLen: 54, metaDescLen: 154, h1Count: 1 };
const techPage = (url: string, t: any, headers: any) => P({ role: "home", url, title: "x", h1: t.h1Count ? ["x"] : [], body: "x", technical: t, headers });
for (const [host, t, hd] of [["ama-ned.nl", AMANED, { "permissions-policy": "x" }], ["hema.nl", HEMA, { "x-content-type-options": "nosniff" }], ["oca.nl", OCA, {}]] as any[]) {
  const teaser = buildTechnicalTeaser([techPage("https://" + host + "/", t, hd)], host);
  console.log(`${host.padEnd(12)} technical teaser: ${teaser ? "PRESENT (" + teaser.proof.domain + ": " + teaser.proof.line + ")" : "null (fail-closed, nothing forced)"}`);
}
console.log("\nInterpretation: a site can correctly receive NO reveal yet still get evidence-based technical duiding");
console.log("(hema/oca), while a genuinely well-built site (ama-ned) gets neither a forced reveal nor a forced teaser.");
console.log("Reveal, contextual duiding, and technical signals stay SEPARATE layers.");
