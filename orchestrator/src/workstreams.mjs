// Workstream identities (control-plane §9, §10). A durable workstream is NOT a chat:
// it survives when a chat ends, a new chat opens, another agent executes, or a runner
// is replaced. We DERIVE workstream identity from the existing registry (we extend the
// canonical registry, we never fork it) and join live operational state from the store.
//
// A specialist chat is at most one interface onto a workstream; the workstream's durable
// truth is repo state + tasks + decisions + evidence + completions + provenance.

import { getAgents } from './registry.mjs';
import { ready } from './store.mjs';
import { listDecisions } from './decisions.mjs';

// Named API clients (identity.mjs) bound to the workstream(s) they submit for. Data,
// not code — the durable mapping from a caller identity to its owning workstream.
// 'chatgpt' and 'central' are cross-cutting (the control plane / general lane).
export const CLIENT_BINDINGS = {
  chatgpt: { scope: 'control-plane', workstreams: '*', label: 'ChatGPT control plane (primary cockpit)' },
  central: { scope: 'general', workstreams: '*', label: 'Central / general workstream' },
  'first-five': { scope: 'workstream', workstreams: ['first_five'], label: 'First Five / Lens' },
  'communication-layer': { scope: 'workstream', workstreams: ['relationship'], label: 'Testerbeheer / Communication Layer' },
  growbrain: { scope: 'workstream', workstreams: ['website'], label: 'Maculis Website / GrowBrain' },
};

// Sub-focus areas a workstream owns (durable tags; not separate registries).
const AREAS = {
  first_five: ['technical-signals', 'post-reveal-flow', 'reveal-gate', 'journey-state-machine', 'lens'],
  relationship: ['communication-layer', 'testerbeheer', 'invitation-manager', 'consent', 'inbox'],
  website: ['public-web', 'wow-laag', 'seo', 'growbrain-facing'],
  orchestrator: ['control-plane', 'routing', 'runner', 'lifecycle', 'governance', 'registry', 'decision-ledger', 'evidence-intake'],
};

function epicsForRepo(repo) {
  return Object.values(ready().epics).filter((e) => (e.repositories || []).includes(repo));
}

// One durable workstream identity + its current operational state.
function identity(agent) {
  const clients = Object.entries(CLIENT_BINDINGS)
    .filter(([, b]) => b.workstreams === '*' || b.workstreams.includes(agent.agent_id))
    .map(([id]) => id);
  const epics = epicsForRepo(agent.repository);
  const activeEpics = epics.filter((e) => !['COMPLETED', 'FAILED'].includes(e.completion_delivery_state ? e.rollup : e.rollup));
  const tasks = Object.values(ready().tasks).filter((t) => t.repository === agent.repository);
  const openHumanActions = Object.values(ready().humanActions).filter((h) => h.status === 'OPEN'
    && (tasks.some((t) => t.task_id === h.task_id)));
  const scopeDecisions = listDecisions({ status: 'active' }).filter((d) => AREAS[agent.agent_id]?.some((a) => d.scope.includes(a) || a.includes(d.scope)) || d.workstream_id === agent.agent_id);
  const pausedScopes = scopeDecisions.filter((d) => d.effect === 'pause').map((d) => d.scope);

  return {
    workstream_id: agent.agent_id,
    name: agent.name,
    domain: agent.description,
    scope: AREAS[agent.agent_id] || [],
    owning_repo: agent.repository,
    public_repo: Boolean(agent.public),
    production_url: agent.deploy?.production_url || null,
    production_branch: agent.deploy?.production_branch || null,
    status: pausedScopes.length ? 'HAS_PAUSED_SCOPE' : (activeEpics.length ? 'ACTIVE' : 'IDLE'),
    active_epics: epics.filter((e) => e.rollup === 'IN_PROGRESS' || e.rollup === 'WAITING_FOR_HUMAN').map((e) => e.epic_id),
    open_human_actions: openHumanActions.length,
    paused_scopes: pausedScopes,
    client_bindings: clients,
    return_capability: 'poll+ack (webhook optional)',   // honest: no async push to a chat exists
    canonical_sources: [`repo:${agent.repository}`, 'orchestrator:store', 'orchestrator:governance'],
  };
}

export function workstreams() {
  return getAgents().map(identity);
}

export function getWorkstream(id) {
  const a = getAgents().find((x) => x.agent_id === id);
  return a ? identity(a) : null;
}
