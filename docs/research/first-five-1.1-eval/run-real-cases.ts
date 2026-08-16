// First Five 1.1 — REAL-CASE runner (final proof round).
//
// This is the instrument for the last proof round on REAL First Five cases. It runs the REAL live
// pipeline (analyseWebsite) with the REAL ServerRetriever (real server-side fetch of the given public
// URLs) and, per case, prints the THREE SEPARATE OUTCOMES the owner asked to see:
//
//   1) DUIDING                — first_impression + story (what Maculis returns even WITHOUT a Reveal)
//   2) REVEAL                 — does a relation actually clear the existing strict Gate? (frozen
//                               engine, or PatternReader v1 synthesis on the engine's SILENCE)
//   3) TECHNISCHE THERMOMETER — the technical teaser (useful signals that are explicitly NOT a Reveal)
//
// It runs CURRENT (deterministic only) vs FIRST FIVE 1.1 (the four IN extensions: promise-fact,
// drift, one review-echo, lens provenance; value-absence is OUT). The frozen engine and Gate are
// UNTOUCHED. Nothing here is production code.
//
// WHY THIS EXISTS: this session's network policy blocks outbound to public sites (proxy 403 on
// CONNECT; WebFetch EGRESS_BLOCKED), so real sites cannot be fetched from HERE. Run this on a
// machine WITH internet egress, or point it at real pilot URLs, to produce the real-case report.
//
// USAGE (from the First Five repo, which has tsx + node-html-parser installed):
//   node_modules/.bin/tsx <this-folder>/run-real-cases.ts https://site-a.nl https://site-b.nl ...
//
// If the First Five repo is not at /workspace/maculis-first-five., edit the three import paths below.
import { analyseWebsite } from "/workspace/maculis-first-five./src/live/pipeline.js";
import { ServerRetriever } from "/workspace/maculis-first-five./src/server/retriever.js";
import { DeterministicClaimExtractor } from "/workspace/maculis-first-five./src/live/extract.js";
import { ProposedExtractor } from "./prototype-extractors.js";

// Optionally: one public review quote per host = a single outside-in Places lookup. Keep it to ONE
// strong signal. Full review/reputation intelligence is reserved for Lens 2, not First Five 1.1.
const REVIEWS: Record<string, any[]> = {
  // "example.nl": [{ url: "https://maps.google/r", subject: "<term>", quote: "<verbatim public review>" }],
};

// FIRST FIVE 1.1 extractor = deterministic (current) + the four IN extensions (value-absence OFF).
const oneOneExtractor = () => ({
  name: "first-five-1.1(det+promisefact+drift+review)",
  async extract(pages: any, host: string) {
    const a = await new DeterministicClaimExtractor().extract(pages, host);
    const b = await new ProposedExtractor(REVIEWS, { includeValueAbsence: false }).extract(pages, host);
    return { claims: [...a.claims, ...b.claims], caseSet: [...a.caseSet, ...b.caseSet],
      reviews: [...a.reviews, ...b.reviews], vacancies: [...a.vacancies, ...b.vacancies], extractor: b.name };
  },
});

function frozenFamily(f?: string) { return f && ["CONTRADICTION", "TELLING_ABSENCE", "MISCAST", "DRIFT"].includes(f); }
function describeReveal(res: any): string {
  if (res.outcome !== "REVEAL" || !res.reveal) return `SILENCE (${res.outcome === "SILENCE" ? "correct-mogelijk" : res.outcome})`;
  const src = frozenFamily(res.reveal.family) ? "frozen engine" : "PatternReader v1";
  return `REVEAL [${src}: ${res.reveal.family}]\n              "${res.reveal.wording}"`;
}
function describeDuiding(res: any): string {
  const fi = res.first_impression ? `first-impression: ${res.first_impression.band ?? res.first_impression.label ?? "aanwezig"}` : null;
  const st = res.story ? `story: ${res.story.headline ?? "aanwezig"}` : null;
  const parts = [fi, st].filter(Boolean);
  if (res.outcome === "REVEAL") return "(niet getoond bij REVEAL; duiding hoort bij SILENCE)";
  return parts.length ? parts.join(" | ") : "(geen gegronde duiding beschikbaar)";
}
function describeTech(res: any): string {
  const t = res.technical_signals;
  if (!t) return "null (fail-closed, geen technische teaser geforceerd)";
  return `PRESENT [${t.proof?.domain}] ${t.proof?.line} (domeinen: ${(t.domains || []).map((d: any) => d.key).join(",")})`;
}

async function main() {
  const urls = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a));
  if (!urls.length) {
    console.error("Geen URLs meegegeven. Gebruik: tsx run-real-cases.ts https://echte-pilotsite.nl ...");
    process.exit(1);
  }
  const now = new Date().toISOString();
  console.log(`\n=== FIRST FIVE 1.1 — REAL-CASE PROOF (${urls.length} cases) ===`);
  console.log("Per case: CURRENT vs 1.1, met de drie gescheiden uitkomsten.\n");

  const tally = { cur_reveal: 0, one_reveal: 0, flips: [] as string[], changed: [] as string[], silent_with_duiding: 0, silent_with_tech: 0 };

  for (const url of urls) {
    let cur: any, one: any;
    try {
      cur = (await analyseWebsite(url, { retriever: new ServerRetriever(), extractor: new DeterministicClaimExtractor(), now })).result;
      one = (await analyseWebsite(url, { retriever: new ServerRetriever(), extractor: oneOneExtractor(), now })).result;
    } catch (e: any) {
      console.log(`### ${url}\n  FOUT bij ophalen/analyse: ${e?.message || e}\n`);
      continue;
    }
    console.log(`### ${url}`);
    console.log(`  [1] DUIDING (CURRENT) : ${describeDuiding(cur)}`);
    console.log(`  [2] REVEAL  (CURRENT) : ${describeReveal(cur)}`);
    console.log(`  [2] REVEAL  (1.1)     : ${describeReveal(one)}`);
    console.log(`  [3] THERMOMETER       : ${describeTech(one)}`);
    console.log("");

    const isR = (r: any) => r.outcome === "REVEAL";
    if (isR(cur)) tally.cur_reveal++;
    if (isR(one)) tally.one_reveal++;
    if (!isR(cur) && isR(one)) tally.flips.push(`${url} (${one.reveal?.family})`);
    if (isR(cur) && isR(one) && cur.reveal?.family !== one.reveal?.family) tally.changed.push(`${url} ${cur.reveal?.family}->${one.reveal?.family}`);
    if (!isR(one) && (one.first_impression || one.story)) tally.silent_with_duiding++;
    if (!isR(one) && one.technical_signals) tally.silent_with_tech++;
  }

  console.log("---- SAMENVATTING ----");
  console.log(`CURRENT reveals: ${tally.cur_reveal}/${urls.length} | 1.1 reveals: ${tally.one_reveal}/${urls.length}`);
  console.log(`nieuwe reveals (SILENCE->REVEAL): ${tally.flips.length ? tally.flips.join("; ") : "geen"}`);
  console.log(`reveal-kind gewijzigd (let op auditachtig verdringen): ${tally.changed.length ? tally.changed.join("; ") : "geen"}`);
  console.log(`SILENCE-cases met duiding: ${tally.silent_with_duiding} | met technische thermometer: ${tally.silent_with_tech}`);
  console.log("\nBeoordeel per nieuwe reveal handmatig: waardevol vs auditachtig; volledig door evidence gedekt;");
  console.log("veranderen bestaande sterke reveals; blijven correcte SILENCE-cases stil; wat krijgt de gebruiker in SILENCE.");
}
main();
