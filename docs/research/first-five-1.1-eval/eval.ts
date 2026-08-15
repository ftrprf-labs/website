// First Five 1.1 evaluation — 12 fixtures through the REAL frozen engine. CURRENT vs 1.1.
import { page, runCurrent, runProposed, summary } from "./lib.js";

// helper for a proposed additive claim (perspective-tagged; passes through the real quality gate)
const claim = (o: any) => ({ page_role: o.page_role ?? "home", extraction_method: "proposed-1.1", ...o });

type Fx = {
  id: string; host: string; kind: string; pages: any[];
  proposed?: { claims?: any[]; reviews?: any[] };
  expect: string;   // human-labelled expectation
  // estimated rubric (HYPOTHESIS — real recognition needs real users). 0..3.
  est: { nontrivial: number; surprise: number; recognition: number; wow: number; fp_risk: number };
};

const F: Fx[] = [
  // 1) AMA-NED regression: genuinely well-built, modest, proven. Must stay SILENT in BOTH.
  { id: "ama-ned", host: "ama-ned.nl", kind: "regression/well-built", expect: "SILENCE both (correct)",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://www.ama-ned.nl/", "home", { title: "AMA-NED industriele automatisering", h1: ["Betrouwbare industriele automatisering"], body: "Sinds 1998 bouwen wij besturingskasten en panelen voor de voedingsindustrie en machinebouw. Bekijk onze projecten." }),
      page("https://www.ama-ned.nl/projecten", "cases", { title: "Projecten", h2: ["Besturingskast voedingsindustrie", "Paneelbouw machinebouw", "Retrofit productielijn", "Schakelkast waterbehandeling", "Automatisering verpakkingslijn"], body: "Onze projecten in besturingskasten en paneelbouw voor voedingsindustrie en machinebouw." }),
      page("https://www.ama-ned.nl/over-ons", "about", { title: "Over ons", h1: ["Over AMA-NED"], body: "Ons team van engineers bouwt besturingskasten sinds 1998." }),
    ] },

  // 2) Existing reveal: waiting-time contradiction (deterministic detector already handles this).
  { id: "fysio-direct", host: "fysio-direct.nl", kind: "existing/contradiction", expect: "REVEAL both (unchanged)",
    est: { nontrivial: 3, surprise: 2, recognition: 3, wow: 2, fp_risk: 0 },
    pages: [
      page("https://fysio-direct.nl/", "home", { title: "Fysio Direct", h1: ["Bij ons geen wachtlijst, u kunt direct terecht"], body: "Bij ons geen wachtlijst, u kunt direct terecht voor fysiotherapie." }),
      page("https://fysio-direct.nl/afspraak", "services", { title: "Afspraak", h1: ["Aanmelden"], body: "De wachttijd voor behandeling is momenteel 6 weken." }),
      page("https://fysio-direct.nl/over-ons", "about", { title: "Over ons", body: "Onze praktijk bestaat sinds 2010." }),
    ] },

  // 3) NEW reveal: value/positioning claim with no proof -> TELLING_ABSENCE (undeniable, L3), unchanged gate.
  { id: "premium-studio", host: "premium-studio.nl", kind: "new/value-absence", expect: "CURRENT SILENCE -> 1.1 REVEAL",
    est: { nontrivial: 2, surprise: 2, recognition: 2, wow: 2, fp_risk: 2 },
    pages: [
      page("https://premium-studio.nl/", "home", { title: "Premium Studio", h1: ["Hoogwaardige interieurs op maat"], body: "Hoogwaardige interieurs op maat voor uw woning." }),
      page("https://premium-studio.nl/contact", "contact", { title: "Contact", body: "Neem contact op voor een kennismaking." }),
      page("https://premium-studio.nl/over", "about", { title: "Over", body: "Wij zijn een jong studio." }),
    ],
    proposed: { claims: [ claim({ kind: "self_claim", subject: "hoogwaardige interieurs", lens: "waarde",
      statement: "De organisatie positioneert zich op hoogwaardigheid.", surface: "home H1",
      url: "https://premium-studio.nl/", quote: "Hoogwaardige interieurs op maat" }) ] } },

  // 4) Existing reveal: specialism claim with no proof (detectSpecialism already handles this).
  { id: "vastgoed-expert", host: "vastgoed-expert.nl", kind: "existing/specialism-absence", expect: "REVEAL both",
    est: { nontrivial: 2, surprise: 2, recognition: 2, wow: 2, fp_risk: 2 },
    pages: [
      page("https://vastgoed-expert.nl/", "home", { title: "Vastgoed Expert", h1: ["Welkom"], body: "Wij zijn specialist in vastgoedtaxaties voor ondernemers." }),
      page("https://vastgoed-expert.nl/diensten", "services", { title: "Diensten", body: "Taxaties en advies." }),
      page("https://vastgoed-expert.nl/over", "about", { title: "Over", body: "Ons kantoor bestaat sinds 2015." }),
    ] },

  // 5) Regression: specialism claim WITH proof (term repeated across pages) -> SILENCE correct.
  { id: "daktuin-proof", host: "daktuin-proof.nl", kind: "regression/proven-claim", expect: "SILENCE both (proof suppresses)",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://daktuin-proof.nl/", "home", { title: "Daktuinen", h1: ["Specialist in daktuinen"], body: "Wij zijn specialist in daktuinen en leveren daktuinen door heel Nederland." }),
      page("https://daktuin-proof.nl/projecten", "cases", { title: "Daktuinen projecten", h2: ["Daktuin kantoorpand", "Daktuin woning", "Daktuin school", "Daktuin ziekenhuis"], body: "Bekijk onze daktuinen projecten." }),
      page("https://daktuin-proof.nl/over", "about", { title: "Over daktuinen", body: "Ons team legt daktuinen aan sinds 2008." }),
    ] },

  // 6) NEW reveal: price-transparency CONTRADICTION across waarde vs toestroom (cross-perspective).
  { id: "bouwadvies-prijs", host: "bouwadvies-prijs.nl", kind: "new/contradiction-crossperspective", expect: "CURRENT SILENCE -> 1.1 REVEAL (cross-lens)",
    est: { nontrivial: 3, surprise: 3, recognition: 3, wow: 3, fp_risk: 1 },
    pages: [
      page("https://bouwadvies-prijs.nl/", "home", { title: "Bouwadvies", h1: ["Altijd vaste, transparante prijzen"], body: "Altijd vaste, transparante prijzen zonder verrassingen." }),
      page("https://bouwadvies-prijs.nl/contact", "contact", { title: "Contact", body: "Neem contact op voor een offerte; prijzen op aanvraag." }),
      page("https://bouwadvies-prijs.nl/over", "about", { title: "Over", body: "Wij adviseren bij bouwprojecten." }),
    ],
    proposed: { claims: [
      claim({ kind: "self_claim", subject: "vaste prijzen", lens: "waarde", contradicted_by: "vaste prijzen",
        statement: "De etalage belooft vaste, transparante prijzen.", surface: "home H1",
        url: "https://bouwadvies-prijs.nl/", quote: "Altijd vaste, transparante prijzen" }),
      claim({ kind: "operational_fact", subject: "vaste prijzen", lens: "toestroom", page_role: "contact",
        statement: "De eigen tekst zegt dat prijzen op aanvraag zijn.", surface: "contact bodytekst",
        url: "https://bouwadvies-prijs.nl/contact", quote: "prijzen op aanvraag" }),
    ] } },

  // 7) NEW flagship reveal: MISCAST — content carries "begeleiding", shopfront sells speed, a public review echoes it.
  { id: "snel-vs-review", host: "snel-geregeld.nl", kind: "new/miscast-review-echo", expect: "CURRENT SILENCE -> 1.1 REVEAL (cross-lens via review)",
    est: { nontrivial: 3, surprise: 3, recognition: 3, wow: 3, fp_risk: 1 },
    pages: [
      page("https://snel-geregeld.nl/", "home", { title: "Snel geregeld", h1: ["Snel en efficient geregeld"], body: "Snel en efficient geregeld. Onze begeleiding is er voor u." }),
      page("https://snel-geregeld.nl/diensten", "services", { title: "Diensten", h1: ["Onze diensten"], body: "Persoonlijke begeleiding gedurende het hele traject, met aandacht en begeleiding." }),
      page("https://snel-geregeld.nl/over", "about", { title: "Over", h1: ["Over ons"], body: "Wij bieden begeleiding aan ondernemers." }),
    ],
    proposed: { reviews: [ { url: "https://maps.google.com/review1", subject: "begeleiding", quote: "De begeleiding was fantastisch en heel persoonlijk." } ] } },

  // 8) Regression: pure wallpaper -> SILENCE (quality gate + gate filter both protect).
  { id: "wallpaper-co", host: "wallpaper-co.nl", kind: "regression/wallpaper", expect: "SILENCE both",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://wallpaper-co.nl/", "home", { title: "Betrouwbaar en persoonlijk", h1: ["Betrouwbaar, persoonlijk, kwaliteit"], body: "Wij staan voor kwaliteit, service en maatwerk. Betrouwbaar en persoonlijk." }),
      page("https://wallpaper-co.nl/over", "about", { title: "Over", body: "Deskundig en flexibel." }),
      page("https://wallpaper-co.nl/contact", "contact", { title: "Contact", body: "Neem contact op." }),
    ],
    proposed: { claims: [ claim({ kind: "self_claim", subject: "kwaliteit", lens: "waarde",
      statement: "De organisatie noemt kwaliteit.", surface: "home H1", url: "https://wallpaper-co.nl/", quote: "kwaliteit" }) ] } },

  // 9) Regression: modest, well-built, proven small firm -> SILENCE correct.
  { id: "modest-clean", host: "modest-clean.nl", kind: "regression/modest", expect: "SILENCE both",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://modest-clean.nl/", "home", { title: "Bakkerij Jansen", h1: ["Ambachtelijk brood uit Utrecht"], body: "Wij bakken ambachtelijk brood in Utrecht. Kom langs in onze winkel." }),
      page("https://modest-clean.nl/assortiment", "services", { title: "Assortiment", body: "Brood, gebak en taarten." }),
      page("https://modest-clean.nl/over", "about", { title: "Over", body: "Onze bakkerij bestaat sinds 1975." }),
    ] },

  // 10) Regression: value claim WITH proof (repeated) -> 1.1 must NOT reveal.
  { id: "maatwerk-proof", host: "maatwerk-proof.nl", kind: "regression/value-with-proof", expect: "SILENCE both (1.1 respects proof)",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://maatwerk-proof.nl/", "home", { title: "Hoogwaardig maatwerk meubelen", h1: ["Hoogwaardig maatwerk meubelen"], body: "Hoogwaardig maatwerk meubelen uit eigen werkplaats." }),
      page("https://maatwerk-proof.nl/werk", "cases", { title: "Ons werk", h2: ["Maatwerk kast", "Maatwerk tafel", "Maatwerk keuken", "Maatwerk trap"], body: "Hoogwaardig maatwerk meubelen die wij maakten." }),
      page("https://maatwerk-proof.nl/over", "about", { title: "Over", body: "Onze schrijnwerkerij levert hoogwaardig maatwerk sinds 1990." }),
    ],
    proposed: { claims: [ claim({ kind: "self_claim", subject: "hoogwaardig maatwerk", lens: "waarde",
      statement: "De organisatie positioneert op hoogwaardig maatwerk.", surface: "home H1",
      url: "https://maatwerk-proof.nl/", quote: "Hoogwaardig maatwerk meubelen" }) ] } },

  // 11) Regression: inflated positioning NOT in the verbatim quote -> quality gate rejects -> SILENCE.
  { id: "puffery-co", host: "puffery-co.nl", kind: "regression/inflation-guard", expect: "SILENCE both (quality gate rejects inflated wording)",
    est: { nontrivial: 0, surprise: 0, recognition: 0, wow: 0, fp_risk: 0 },
    pages: [
      page("https://puffery-co.nl/", "home", { title: "Installatiebedrijf", h1: ["Uw installatiebedrijf in de regio"], body: "Wij zijn een installatiebedrijf in de regio." }),
      page("https://puffery-co.nl/over", "about", { title: "Over", body: "Wij installeren cv en sanitair." }),
      page("https://puffery-co.nl/contact", "contact", { title: "Contact", body: "Bel ons." }),
    ],
    proposed: { claims: [ claim({ kind: "self_claim", subject: "installatiebedrijf", lens: "waarde",
      statement: "De organisatie claimt de beste te zijn.", surface: "home bodytekst",
      url: "https://puffery-co.nl/", quote: "Wij zijn een installatiebedrijf in de regio" }) ] } },

  // 12) NEW reveal: DRIFT — advertised service no longer delivered.
  { id: "drift-training", host: "drift-training.nl", kind: "new/drift", expect: "CURRENT SILENCE -> 1.1 REVEAL",
    est: { nontrivial: 3, surprise: 2, recognition: 3, wow: 2, fp_risk: 1 },
    pages: [
      page("https://drift-training.nl/", "home", { title: "Adviesbureau", h1: ["Advies en trainingen"], nav: ["Home", "Trainingen", "Contact"], body: "Wij geven advies en trainingen aan teams." }),
      page("https://drift-training.nl/trainingen", "services", { title: "Trainingen", h1: ["Trainingen"], body: "Trainingen bieden wij niet meer aan; wij richten ons nu op advies." }),
      page("https://drift-training.nl/over", "about", { title: "Over", body: "Ons bureau adviseert organisaties." }),
    ],
    proposed: { claims: [
      claim({ kind: "operational_fact", subject: "trainingen", lens: "zichtbaarheid", discontinued: true, page_role: "services",
        statement: "De eigen tekst zegt dat trainingen niet meer worden aangeboden.", surface: "trainingen bodytekst",
        url: "https://drift-training.nl/trainingen", quote: "Trainingen bieden wij niet meer aan" }),
    ] } },
];

const rows: any[] = [];
for (const f of F) {
  const cur = await runCurrent(f.host, f.pages);
  const pro = await runProposed(f.host, f.pages, f.proposed ?? {});
  const c = summary(cur.trace), p = summary(pro.trace);
  rows.push({ id: f.id, kind: f.kind, expect: f.expect,
    cur_outcome: c.outcome, cur_gate: c.gatePassed,
    pro_outcome: p.outcome, pro_gate: p.gatePassed, pro_family: p.surfacedFamily, pro_cross: p.crossLens,
    est: f.est });
}

// ---- report ----
const pad = (s: any, n: number) => String(s).padEnd(n);
console.log("\n=== FIRST FIVE 1.1 EVALUATION (real frozen engine, gate UNCHANGED) ===\n");
console.log(pad("fixture", 17), pad("CUR", 9), pad("1.1", 9), pad("1.1 family", 16), "cross");
console.log("-".repeat(64));
for (const r of rows) {
  console.log(pad(r.id, 17), pad(r.cur_outcome, 9), pad(r.pro_outcome, 9), pad(r.pro_family ?? "-", 16), r.pro_cross ? "yes" : "-");
}

// ---- aggregate metrics (what the assignment asked to MEASURE) ----
const isReveal = (o: string) => o === "REVEAL";
const curReveals = rows.filter(r => isReveal(r.cur_outcome)).length;
const proReveals = rows.filter(r => isReveal(r.pro_outcome)).length;
const newReveals = rows.filter(r => !isReveal(r.cur_outcome) && isReveal(r.pro_outcome));
const brokenSilence = rows.filter(r => r.expect.includes("SILENCE both") && isReveal(r.pro_outcome)); // regressions that must stay silent
const correctSilenceKept = rows.filter(r => r.expect.includes("SILENCE both") && !isReveal(r.pro_outcome)).length;
const silenceRegressionTotal = rows.filter(r => r.expect.includes("SILENCE both")).length;
const amaned = rows.find(r => r.id === "ama-ned");

console.log("\n=== AGGREGATE ===");
console.log("fixtures:", rows.length);
console.log("CURRENT reveals:", curReveals, "| 1.1 reveals:", proReveals);
console.log("NEW reveal-worthy candidates unlocked by 1.1:", newReveals.length, "->", newReveals.map(r => `${r.id}(${r.pro_family}${r.pro_cross ? ",cross" : ""})`).join(", "));
console.log("correct-SILENCE regressions kept silent:", correctSilenceKept, "/", silenceRegressionTotal);
console.log("SILENCE wrongly broken by 1.1 (should be 0):", brokenSilence.length, brokenSilence.map(r => r.id).join(","));
console.log("AMA-NED regression:", amaned ? `CURRENT=${amaned.cur_outcome} 1.1=${amaned.pro_outcome} (must both be SILENCE)` : "MISSING");

// estimated quality (HYPOTHESIS) averaged over NEW reveals only
const avg = (xs: number[]) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : "n/a";
const nr = newReveals.map(r => r.est);
console.log("\n=== ESTIMATED QUALITY of NEW reveals (0..3, HYPOTHESIS, needs real users) ===");
console.log("non-triviality:", avg(nr.map((e: any) => e.nontrivial)),
  "| surprise:", avg(nr.map((e: any) => e.surprise)),
  "| recognition:", avg(nr.map((e: any) => e.recognition)),
  "| WOW:", avg(nr.map((e: any) => e.wow)),
  "| false-positive risk:", avg(nr.map((e: any) => e.fp_risk)));
console.log("\ntime-to-first-value: UNCHANGED (both Level 1, same public retrieval, +0 network for HTML-derived evidence; +1 lookup only when public reviews are used).");
