// Router — free natural language in, a structured routing decision out.
//
// This is deliberately NOT a blind prompt forwarder (brief §3, §9). It scores the
// request against every agent using explainable signals (keywords, named
// entities, path ownership) drawn from the registry, classifies the task type and
// risk, detects cross-domain work, and reports WHY it chose what it chose. When
// confidence is too low it returns NEEDS_ROUTING_REVIEW instead of guessing — but
// the common, clear commands route automatically with no human in the loop.
//
// An optional bounded AI classifier can be layered on top later (route() accepts
// an injected classifier), but the deterministic scorer alone handles every
// example in the brief.

import { getAgents } from './registry.mjs';
import { config } from './config.mjs';

function norm(s) {
  return String(s || '').toLowerCase();
}
// Hyphen/space-insensitive form so "herken-je-dit" matches the keyword
// "herken je dit" and "micro-reveal" matches "micro reveal".
function flat(s) {
  return norm(s).replace(/[-\s]+/g, ' ');
}

// --- Negative / exclusion context (bootstrap §6) ---------------------------
// A protective mention ("do not touch First Five", "keep Lens 2 paused") must NOT
// score as positive intent for that domain. We split the request into clauses and
// drop any clause that is an exclusion/protection statement BEFORE domain scoring.
// Deliberately narrow, multi-word cues so a genuine bug like "reveal does not show"
// or a read-only "geen wijzigingen" ask is NOT mistaken for a domain exclusion.
const EXCLUSION_CUES = [
  'do not touch', "don't touch", 'dont touch', 'not touch', 'never touch', 'hands off',
  'do not resume', "don't resume", 'not resume', 'never resume', 'niet hervatten',
  'do not modify', 'do not change', 'do not edit', 'do not alter', 'do not adjust',
  'do not start', 'do not open', 'do not build', 'do not implement', 'do not add', 'do not create',
  'must not touch', 'must not resume', 'must not change', 'must not modify', 'must not start', 'must not open',
  'niet aanraken', 'niet openen', 'niet starten', 'niet wijzigen aan first', 'met rust laten',
  'leave first five', 'leave it alone', 'leave alone', 'zonder first five', 'zonder eerste',
];

// Clause boundaries: sentence marks, semicolons, newlines, and coordinating words —
// so a positive clause can be isolated from an exclusion clause in the same request.
function splitClauses(flatText) {
  return flatText
    .split(/[.;\n]+|,| and | en | & | plus | but | maar /)
    .map((c) => c.trim())
    .filter(Boolean);
}

function isExclusionClause(clause) {
  if (EXCLUSION_CUES.some((c) => clause.includes(c))) return true;
  // A clause about something being/remaining paused/parked is protective, not a
  // positive build instruction — it must not pull routing toward that domain.
  if (/\b(paused|gepauzeerd|geparkeerd|parked)\b/.test(clause)) return true;
  return false;
}

// The text used for DOMAIN scoring: only the non-exclusion clauses. Task type and
// risk still use the full text (those are not domain routing). If EVERYTHING is an
// exclusion clause, the positive text is empty → no domain signal → routing review.
function positiveText(flatText) {
  return splitClauses(flatText).filter((c) => !isExclusionClause(c)).join(' . ');
}

// Count non-overlapping keyword hits, longer phrases weighted higher (a 2-word
// phrase like "micro reveal" is a stronger signal than the bare word "reveal").
function scoreKeywords(text, keywords) {
  let score = 0;
  const hits = [];
  for (const kw of keywords) {
    const k = flat(kw);
    if (!k) continue;
    if (text.includes(k)) {
      const weight = 1 + k.split(/\s+/).length * 0.5; // phrase bonus
      score += weight;
      hits.push(kw);
    }
  }
  return { score, hits };
}

function scoreEntities(text, entities) {
  let score = 0;
  const hits = [];
  for (const e of entities) {
    const k = flat(e);
    if (k && text.includes(k)) { score += 2.5; hits.push(e); } // named entity = strong
  }
  return { score, hits };
}

// --- Task type -------------------------------------------------------------
// Bug signals include split phrases ("los dit … op", "nog steeds geen … lens"),
// so they are regexes rather than plain substring checks.
const BUG_PATTERNS = [
  /\bbug\b/, /\bfout(en)?\b/, /werkt niet/, /\bfaalt\b/, /\bkapot\b/, /\bbroken\b/,
  /toont (niet|geen)/, /verschijnt (niet|geen)/,
  // "geen … lens/reveal" only counts as a bug when they are close together (same
  // clause) — otherwise "geen wijzigingen … lens" false-matches (a read-only ask).
  /\bgeen\b[^.,;!?]{0,25}\b(lens|zichtbaar|reveal)\b/,
  /niet zichtbaar/, /nog steeds (niet|geen)/, /\blos (dit|het)\b[^.]{0,40}\bop\b/, /\berror\b/,
  /\bcrash/, /regressie/, /\bdefect\b/, /not showing/, /does ?n[o']t/, /niet scherp/,
];
// Explicit read-only markers force analysis regardless of other words (the ask
// forbids changes, so it can never be a bug-fix or feature build).
const READ_ONLY = /\b(read[- ]?only|alleen lezen|geen wijzigingen|niet wijzigen|zonder wijzigingen|diagnose|diagnostic)\b/;
const FEATURE_WORDS = ['bouw', 'build', 'voeg toe', 'add', 'nieuwe', 'implementeer', 'implement',
  'maak', 'create', 'feature', 'ondersteun', 'support', 'integratie', 'koppel'];
const ANALYSIS_WORDS = ['onderzoek', 'analyse', 'analyseer', 'investigate', 'research',
  'controleer', 'audit', 'review', 'diagnose', 'diagnostisch', 'read-only', 'read only',
  'alleen lezen', 'inspecteer', 'rapporteer', 'diagnostic'];

function classifyTaskType(text) {
  if (READ_ONLY.test(text)) return 'analysis';   // explicit "no changes" wins
  if (BUG_PATTERNS.some((re) => re.test(text))) return 'bug';
  if (FEATURE_WORDS.some((w) => text.includes(w))) return 'feature';
  if (ANALYSIS_WORDS.some((w) => text.includes(w))) return 'analysis';
  return 'feature'; // default: treat an unclear ask as buildable work
}

// --- Risk ------------------------------------------------------------------
const HIGH_RISK_WORDS = ['migration', 'migratie', 'database', 'schema', 'drop ', 'delete production',
  'production data', 'payment', 'billing', 'dns', 'secret', 'credential', 'provider account',
  'meta business', 'telefonienummer', 'force push'];
function classifyRisk(text, taskType) {
  if (HIGH_RISK_WORDS.some((w) => text.includes(w))) return 'high';
  if (taskType === 'analysis') return 'low';
  return 'normal';
}

// --- Required checks per task type (per-repo test config refines this) ------
function requiredChecks(agent, taskType) {
  // Read-only analysis / diagnostics never run the build pipeline.
  if (taskType === 'analysis') return [];
  const t = agent.test_commands || {};
  const checks = [];
  if (t.lint) checks.push('lint');
  if (t.typecheck) checks.push('typecheck');
  if (t.unit) checks.push('unit');
  if (taskType === 'bug') {
    checks.push('regression');
    if (t.e2e) checks.push('e2e');
  }
  if (taskType === 'feature' && t.e2e) checks.push('e2e');
  if (t.build) checks.push('build');
  return [...new Set(checks)];
}

// Score every agent, return them sorted best-first with the signal breakdown.
// Domain scoring runs on the POSITIVE (non-exclusion) text so a protective mention
// of a domain does not route work to it (bootstrap §6).
export function scoreAgents(request) {
  const text = positiveText(flat(request));
  return getAgents()
    .map((agent) => {
      const kw = scoreKeywords(text, agent.keywords || []);
      const ent = scoreEntities(text, agent.entities || []);
      const own = scoreKeywords(text, agent.ownership_patterns || []);
      const score = kw.score + ent.score + own.score * 0.75;
      return {
        agent,
        score,
        signals: { keywords: kw.hits, entities: ent.hits, paths: own.hits },
      };
    })
    .sort((a, b) => b.score - a.score);
}

// Full routing decision.
export function route(request, { classifier = null } = {}) {
  const ranked = scoreAgents(request);
  const [top, second] = ranked;
  const text = flat(request);
  const taskType = classifyTaskType(text);
  const riskLevel = classifyRisk(text, taskType);

  const total = ranked.reduce((s, r) => s + r.score, 0) || 1;
  // Confidence = share of the winning score, tempered by absolute signal
  // strength (a single weak keyword should never look "confident").
  const share = top.score / total;
  const absolute = Math.min(1, top.score / 3);
  let confidence = top.score === 0 ? 0 : Math.round((0.6 * share + 0.4 * absolute) * 100) / 100;

  // Cross-domain detection: a second domain also has a real, non-trivial signal.
  const crossDomain =
    second && second.score > 0 && top.score > 0 &&
    second.score / top.score >= 0.5;

  const base = {
    original_request: request,
    task_type: taskType,
    risk_level: riskLevel,
    confidence,
    ranking: ranked.map((r) => ({ agent_id: r.agent.agent_id, score: Math.round(r.score * 100) / 100, signals: r.signals })),
  };

  // Not enough signal to route safely.
  if (top.score === 0 || confidence < config.routingMinConfidence) {
    return {
      ...base,
      selected_agent: 'NEEDS_ROUTING_REVIEW',
      repository: null,
      required_checks: [],
      cross_domain: false,
      reason:
        top.score === 0
          ? 'No domain signal matched. Human routing review required.'
          : `Low confidence (${confidence}). Top candidate ${top.agent.agent_id} not clearly ahead — human routing review required.`,
    };
  }

  const decision = {
    ...base,
    selected_agent: top.agent.agent_id,
    repository: top.agent.repository,
    required_checks: requiredChecks(top.agent, taskType),
    cross_domain: Boolean(crossDomain),
    reason: buildReason(top, taskType, riskLevel),
  };

  if (crossDomain) {
    decision.primary_owner = top.agent.agent_id;
    decision.dependency = {
      agent_id: second.agent.agent_id,
      repository: second.agent.repository,
      signals: second.signals,
    };
    decision.reason += ` Cross-domain: also touches ${second.agent.name} (${second.agent.repository}) — primary owner ${top.agent.name}, dependency coordinated (no simultaneous contract edits).`;
  }

  return decision;
}

function buildReason(top, taskType, risk) {
  const s = top.signals;
  const bits = [];
  if (s.entities.length) bits.push(`entity ${s.entities.join(', ')}`);
  if (s.keywords.length) bits.push(`keywords ${s.keywords.slice(0, 4).join(', ')}`);
  if (s.paths.length) bits.push(`paths ${s.paths.slice(0, 3).join(', ')}`);
  return `Routed to ${top.agent.name} (${top.agent.repository}) as a ${taskType} at ${risk} risk on: ${bits.join('; ') || 'domain description match'}.`;
}
