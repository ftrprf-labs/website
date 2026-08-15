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
    test_commands: { lint: null, unit: null, build: 'npm run build', e2e: 'npm run test:e2e' },
    build_commands: ['npm run build'],
    deploy_strategy: 'auto-on-merge',       // static/site host redeploys on merge
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'normal-engineering',
    system_instructions:
      'You own the PUBLIC Maculis website. Optimise for WOW, micro-reveal quality, ' +
      'SEO and Core Web Vitals. Never leak private/tester data into public pages. ' +
      'Public privacy and consent copy is load-bearing — do not weaken it.',
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
    test_commands: { lint: 'npm run lint', unit: 'npm test', build: 'npm run build', e2e: 'npm run test:e2e' },
    build_commands: ['npm run build'],
    deploy_strategy: 'auto-on-merge',
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'normal-engineering',
    system_instructions:
      'You own the First Five Journey. The Journey is a state machine; every step ' +
      '(First Impression → Reveal → Recognition → Technical Signals → "Nog een lens" ' +
      '→ Aandacht → Deepen) must be reproduced with a REAL personal invitation token ' +
      'before you claim a fix. Negative controls must stay closed.',
  },
  {
    agent_id: 'relationship',
    name: 'Relationship',
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
    test_commands: { lint: null, unit: 'npm test', build: null, e2e: null },
    build_commands: [],
    deploy_strategy: 'render-auto',       // Render autoDeploy on push to connected branch
    deploy_targets: ['NO_DEPLOY', 'STAGING', 'PRODUCTION'],
    permission_profile: 'normal-engineering',
    system_instructions:
      'You own the Relationship Workspace / Invitation Manager (this repo). It holds ' +
      'PII: never put names, e-mail, mobile, tokens or secrets in logs, prompts, PRs or ' +
      'summaries. Consent is fail-closed (OPTED_IN only). Communication is AI-first but ' +
      'human-in-the-loop — never auto-send on a customer\'s behalf without an explicit gate.',
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
