// First Five 1.1 evaluation harness — drives the REAL frozen 0.2 engine + REAL live quality gate.
// No production code is modified. This file lives OUTSIDE the repo and imports the repo verbatim.
// Run with the repo's tsx:  cd /workspace/maculis-first-five. && node_modules/.bin/tsx <this-dir>/eval.ts
import { runEngine } from "/workspace/maculis-first-five./src/engine/engine.js";
import { DeterministicClaimExtractor } from "/workspace/maculis-first-five./src/live/extract.js";
import { qualityGateClaims, qualityGateCases } from "/workspace/maculis-first-five./src/live/quality-gate.js";

const OBS = "2026-08-15T00:00:00Z";

// Minimal faithful RawPage builder (fills fields the extractor/quality-gate actually read).
export function page(url: string, role: string, o: any = {}): any {
  const body = o.body ?? "";
  return {
    requestedUrl: url, finalUrl: url, role, selection_reason: "fixture", status: 200, ok: true,
    title: o.title ?? null, metaDescription: o.meta ?? null, lang: o.lang ?? "nl-NL",
    h1: o.h1 ?? [], h2: o.h2 ?? [], h3: o.h3 ?? [], navLabels: o.nav ?? [],
    internalLinks: o.links ?? [],
    bodyRaw: body, bodyClean: body, wordCount: body.split(/\s+/).filter(Boolean).length,
    observed_at: OBS, retrieval_layer: "fixture",
  };
}

function toPageEvidence(p: any) {
  const role = p.role === "home" ? "home" : p.role === "about" ? "about" : "page";
  return { url: p.finalUrl, role, title: p.title, metaDescription: p.metaDescription,
    h1: p.h1, h2: p.h2, h3: p.h3, navLabels: p.navLabels, bodyText: p.bodyClean };
}
function toClaimEvidence(c: any) {
  return { kind: c.kind, subject: c.subject, statement: c.statement, surface: c.surface, url: c.url,
    quote: c.quote, lens: c.lens, promise_negation: c.promise_negation, contradicted_by: c.contradicted_by,
    discontinued: c.discontinued, acknowledged: c.acknowledged };
}

// CURRENT First Five: real deterministic extractor + real quality gate + frozen engine.
export async function runCurrent(host: string, pages: any[]) {
  const ex = await new DeterministicClaimExtractor().extract(pages, host);
  const qc = qualityGateClaims(ex.claims, pages);
  const qcase = qualityGateCases(ex.caseSet, pages);
  const bundle = {
    organisation_id: host, input_label: host, observed_at: OBS,
    website: { pages: pages.map(toPageEvidence) },
    claims: qc.accepted.map(toClaimEvidence),
    caseSet: qcase.accepted.map((c: any) => ({ url: c.url, label: c.label, sector: c.sector })),
    reviews: ex.reviews.map((r: any) => ({ url: r.url, quote: r.quote, subject: r.subject })),
    vacancies: ex.vacancies.map((v: any) => ({ url: v.url, quote: v.quote, subject: v.subject })),
    mock: false,
  };
  const trace = runEngine(bundle, { now: OBS });
  return { trace, acceptedClaims: qc.accepted.length };
}

// PROPOSED First Five 1.1: CURRENT evidence + additive multi-perspective claims (each passed through
// the SAME real quality gate) + public reviews (zero-integration, Places). Same frozen engine.
export async function runProposed(host: string, pages: any[], proposed: { claims?: any[]; reviews?: any[] }) {
  const ex = await new DeterministicClaimExtractor().extract(pages, host);
  const extraClaims = proposed.claims ?? [];
  const allClaims = [...ex.claims, ...extraClaims];
  const qc = qualityGateClaims(allClaims, pages);       // proposed claims MUST survive the existing quality bar
  const qcase = qualityGateCases(ex.caseSet, pages);
  const reviews = [...ex.reviews, ...(proposed.reviews ?? [])];
  const bundle = {
    organisation_id: host, input_label: host, observed_at: OBS,
    website: { pages: pages.map(toPageEvidence) },
    claims: qc.accepted.map(toClaimEvidence),
    caseSet: qcase.accepted.map((c: any) => ({ url: c.url, label: c.label, sector: c.sector })),
    reviews: reviews.map((r: any) => ({ url: r.url, quote: r.quote, subject: r.subject })),
    vacancies: ex.vacancies.map((v: any) => ({ url: v.url, quote: v.quote, subject: v.subject })),
    mock: false,
  };
  const trace = runEngine(bundle, { now: OBS });
  return { trace, acceptedClaims: qc.accepted.length, rejected: qc.rejected };
}

export function gatePassed(trace: any): number {
  return (trace.reveals ?? []).filter((r: any) => r.gate?.passed).length;
}
export function summary(trace: any) {
  return {
    outcome: trace.outcome,
    gatePassed: gatePassed(trace),
    surfacedFamily: trace.surfaced?.family ?? null,
    surfacedWording: trace.surfaced?.wording ?? null,
    crossLens: trace.surfaced?.cross_lens ?? false,
    relations: trace.relations.length,
    observations: trace.observations.length,
  };
}
