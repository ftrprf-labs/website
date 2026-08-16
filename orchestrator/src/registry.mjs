// Agent registry — the extensible source of truth for the development domains.
//
// This is intentionally a data structure, not hardcoded branching. Adding a new
// Maculis domain later means appending one entry here (or dropping a JSON file
// in config/agents.d/), not editing the router. Each agent describes the repo it
// owns, how to recognise work for it, how to test/build/deploy it, and which
// permission profile it runs under.
//
// Repository names below were verified against the live GitHub org at build time
// (not assumed from old chat text — see the orchestrator README "Environment").

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ORCH_ROOT } from './config.mjs';

// Signal weights used by the router. Keep them small and explainable.
const AGENTS = [
  {
    agent_id: 'website',
    name: 'Website',
    description:
      'Public Maculis / groeiplatform website: homepage, WOW-laag, micro reveal, ' +
      'SEO, public performance, public privacy, public conversion.',
    repository: 'ftrprf-labs/groeiplatform-website',
    working_directory: '.',
    // Paths that, when touched by a task, strongly imply this owner.
    ownership_patterns: ['app/', 'pages/', 'components/', 'public/', 'seo', 'sitemap', 'homepage'],
    // Routing signals.
    keywords: [
      'website', 'homepage', 'home page', 'landing', 'wow', 'micro reveal', 'micro-reveal',
      'reveal op de homepage', 'seo', 'sitemap', 'meta tags', 'performance', 'lighthouse',
      'publieke', 'public', 'conversie', 'conversion', 'scherp genoeg kijken', 'maculis.nl',
      'groeiplatform', 'cookie', 'analytics',
    ],
    // Domain names / entities that appear in public-website reports.
    entities: ['vanegmond.nl', 'vanegmond', 'maculis.nl'],
    // Real capability manifest (verified from the repo's package.json).
    test_commands: { lint: 'npm run lint', typecheck: 'npx tsc --noEmit', unit: null, build: 'npm run build', e2e: null },
    build_commands: ['npm run build'],
    // Real deployment (verified: Next.js 14 App Router, no vercel.json → Vercel
    // git integration; production = default branch; verify with Lighthouse).
    deploy: {
      provider: 'vercel', production_branch: 'main', auto_deploy: true,
      preview: true, health_path: '/', production_url: 'https://maculis.nl',
      verify: 'lighthouse', rollback: 'vercel-redeploy-previous',
    },
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'agent-worktree',
    system_instructions:
      'You own the PUBLIC Maculis website (Next.js 14 App Router). Optimise for WOW, ' +
      'micro-reveal quality (precision over recall, evidence-bound), SEO and Core Web ' +
      'Vitals; mobile-first. Maculis copy is restrained — no free audit. NEVER leak ' +
      'private/tester data into public pages; privacy/consent copy is load-bearing. ' +
      'In visible public copy use no hyphen/dash as a stylistic pause (repo copy rule).',
  },
  {
    agent_id: 'first_five',
    name: 'First Five',
    description:
      'First Five Journey: invitation, First Impression, thermometer, Reveal, ' +
      'Recognition, Technical Signals, Aandacht, Deepen, journey state machine, ' +
      'personal token flow.',
    repository: 'ftrprf-labs/maculis-first-five.',
    working_directory: '.',
    ownership_patterns: ['journey', 'reveal', 'recognition', 'technical-signals', 'state-machine'],
    keywords: [
      'first five', 'first-five', 'journey', 'first impression', 'thermometer', 'reveal',
      'recognition', 'herken je dit', 'herkenning', 'technical signals', 'technische signalen',
      'nog een lens', 'aandacht', 'deepen', 'verdieping', 'state machine', 'statemachine',
      'invitation flow', 'token flow', 'persoonlijke token', 'lens', 'onboarding journey',
    ],
    // Named testers/customers that show up in First Five journey reports.
    entities: ['hema', 'nog een lens'],
    // Real capability manifest (verified: TypeScript + tsx, Node >=20; the "tests"
    // are the engine regression + selftest + technical-signals live test).
    test_commands: { lint: null, typecheck: 'npx tsc --noEmit', unit: 'npm run engine:regression', build: 'npm run selftest', e2e: 'npm run test:technical' },
    build_commands: [],
    // Real deployment (verified from render.yaml): Render Docker, frankfurt,
    // autoDeploy on push, health /healthz.
    deploy: {
      provider: 'render', production_branch: 'main', auto_deploy: true,
      preview: false, health_path: '/healthz', production_url: 'https://maculis-first-five.onrender.com',
      verify: 'healthz+journey', rollback: 'render-rollback-previous-deploy',
    },
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'agent-worktree',
    system_instructions:
      'You own the First Five Journey (TypeScript, tsx). The Journey is a state machine; ' +
      'reproduce every bug with a REAL personal invitation token before claiming a fix. ' +
      'Steps: First Impression → Reveal → Recognition ("Herken je dit" gate) → Technical ' +
      'Signals (a SEPARATE lens) → "Nog een lens" → Aandacht → Deepen. Fail-closed: ' +
      'negative controls stay closed. Reveal stays grounded/evidence-bound; no score ' +
      'dashboard. Run the engine regression + technical test for critical journey changes. ' +
      'In visible public copy use no hyphen/dash as a stylistic pause (repo copy rule).',
  },
  {
    agent_id: 'relationship',
    name: 'Relationship',
    public: true,               // ftrprf-labs/website is a public repo → cloneable without a git token
    description:
      'Relationship Workspace: testerbeheer, organization, contact, communication ' +
      'layer, inbox, AI communication (email/WhatsApp/SMS/telephony/social), consent, ' +
      'follow-ups.',
    repository: 'ftrprf-labs/website',            // this repo (Invitation Manager / comm layer)
    working_directory: '.',
    ownership_patterns: ['server/comm/', 'server/store.mjs', 'server/messages.mjs', 'inbox', 'contact', 'organization'],
    keywords: [
      'relationship', 'relatie', 'workspace', 'testerbeheer', 'tester', 'organization',
      'organisatie', 'contact', 'communication', 'communicatie', 'inbox', 'whatsapp', 'sms',
      'telefonie', 'telephony', 'social', 'email communicatie', 'e-mail communicatie', 'consent',
      'follow up', 'follow-up', 'opvolging', 'copilot', 'ai communication', 'outbound', 'inbound',
      'invitation manager', 'uitnodiging', 'crm',
    ],
    // Customer/organisation names that appear in relationship tasks.
    entities: ['oca', 'ftrprf', 'ftrlabs'],
    // Real capability manifest (verified: Node ESM, node --test).
    test_commands: { lint: null, typecheck: null, unit: 'npm test', build: null, e2e: null },
    build_commands: [],
    // Real deployment (verified from render.yaml): Render Docker, frankfurt,
    // autoDeploy on push, health /healthz, persistent disk for the JSON store.
    deploy: {
      provider: 'render', production_branch: 'main', auto_deploy: true,
      preview: false, health_path: '/healthz', production_url: 'https://ftrlabs-testerbeheer.onrender.com',
      verify: 'healthz+workspace', rollback: 'render-rollback-previous-deploy',
    },
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'agent-worktree',
    system_instructions:
      'You own the Relationship Workspace / Invitation Manager (this repo, Node ESM). ' +
      'The client/organisation is the primary navigation object; communication lives inside ' +
      'the relationship context with one history across channels and an AI-first composer ' +
      'with human override. It holds PII: never put names, e-mail, mobile, tokens or secrets ' +
      'in logs, prompts, PRs or summaries. Consent is fail-closed (OPTED_IN only). Channel ' +
      'providers are abstracted; missing provider credentials become a central human action, ' +
      'never a faked "live connected" result. Auditability matters. ' +
      'In visible public copy use no hyphen/dash as a stylistic pause (repo copy rule).',
  },
  {
    agent_id: 'orchestrator',
    name: 'Orchestrator',
    public: true,                 // lives in the public ftrprf-labs/website repo → cloneable tokenless
    description:
      'The Maculis Development Orchestrator itself: the central CONTROL PLANE — routing/classification, ' +
      'task lifecycle, runner, acceptance/verification, governance, registry, store, decompose/epics, ' +
      'origin & return, decision ledger, evidence intake, workstreams, monitoring. Central engineering ' +
      'of the Orchestrator, NOT one of the three products and NOT the Relationship product under server/.',
    repository: 'ftrprf-labs/website',            // SAME physical repo as Relationship (Orchestrator lives under orchestrator/)
    working_directory: 'orchestrator',
    // Path ownership scoped to the orchestrator/ subtree — this is what functionally
    // separates it from Relationship (server/) inside the same physical repository.
    ownership_patterns: [
      'orchestrator/', 'orchestrator/src/', 'orchestrator/bin/', 'orchestrator/mcp/', 'orchestrator/config/',
      'src/router.mjs', 'src/engine.mjs', 'src/decompose.mjs', 'src/registry.mjs', 'src/governance.mjs',
      'src/store.mjs', 'src/decisions.mjs', 'src/evidence.mjs', 'src/workstreams.mjs', 'src/liveprobe.mjs',
    ],
    // Central control-plane terms (brief bootstrap §5). Deliberately distinct from the
    // Relationship/First Five/Website keyword sets so the domains stay separable.
    keywords: [
      'orchestrator', 'control plane', 'control-plane', 'task router', 'routing engine', 'router', 'routing',
      'runner', 'lifecycle', 'acceptance', 'verification', 'governance', 'registry', 'decompose', 'epic engine',
      'permission broker', 'origin and return', 'origin & return', 'decision ledger', 'evidence intake',
      'orchestrator store', 'orchestrator engine', 'orchestrator router', 'classification', 'workstream identities',
      'cockpit', 'status overview', 'bootstrap', 'routing defect',
    ],
    entities: [],                 // no product entities — central engineering, not a product
    // Real capability manifest (verified: Node ESM, node --test — same repo as Relationship).
    test_commands: { lint: null, typecheck: null, unit: 'npm test', build: null, e2e: null },
    build_commands: [],
    // Real deployment: Render, this very service.
    deploy: {
      provider: 'render', production_branch: 'main', auto_deploy: true,
      preview: false, health_path: '/healthz', production_url: 'https://maculis-orchestrator.onrender.com',
      verify: 'healthz', rollback: 'render-rollback-previous-deploy',
    },
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'agent-worktree',
    system_instructions:
      'You own the Maculis Development Orchestrator itself (the central control plane; Node ESM, zero runtime ' +
      'deps, tests via node --test). Work ONLY under orchestrator/. This is NOT one of the three products and ' +
      'NOT the Relationship / Communication Layer product under server/. Strict separation: never edit server/ ' +
      '(Relationship) from an orchestrator task, and never edit orchestrator/ from a Relationship task; the two ' +
      'share ONE physical repo and ONE write lock, so never assume you are the only writer. Registry is data — ' +
      'never hardcode routing branches. Never weaken the permission deny-list, never push to main, never rewrite ' +
      'history, never print secrets/PII. Do NOT modify, weaken or bypass DEC-1 (EPIC-3 PAUSED) or any decision; ' +
      'do not resume EPIC-3, open Lens 2, or change First Five. ' +
      'In visible public copy use no hyphen/dash as a stylistic pause (repo copy rule).',
  },
];

// Optional: merge extra agents from config/agents.d/*.json so new domains can be
// added without editing this file (registry stays a registry, not a hardcode).
function loadExtraAgents() {
  const dir = join(ORCH_ROOT, 'config', 'agents.d');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try { out.push(JSON.parse(readFileSync(join(dir, f), 'utf8'))); }
    catch { /* ignore a malformed drop-in rather than crash routing */ }
  }
  return out;
}

let cache = null;
export function getAgents() {
  if (!cache) {
    const extra = loadExtraAgents();
    const byId = new Map();
    for (const a of [...AGENTS, ...extra]) byId.set(a.agent_id, a);
    cache = [...byId.values()];
  }
  return cache;
}

export function getAgent(id) {
  return getAgents().find((a) => a.agent_id === id) || null;
}

export function getAgentByRepo(repo) {
  return getAgents().find((a) => a.repository === repo) || null;
}

export function _resetForTests() { cache = null; }
