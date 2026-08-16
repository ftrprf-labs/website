#!/usr/bin/env node
// Minimal MCP server for the Maculis Orchestrator (brief §46).
//
// Exposes the orchestrator as MCP tools so any MCP-capable client (Claude Code,
// Claude Desktop, or a future ChatGPT connector) can drive it over a supported,
// programmable interface — no browser automation, no UI scripting.
//
// Zero dependencies: implements the MCP stdio transport (newline-delimited
// JSON-RPC 2.0) directly. Tools:
//   submit_maculis_task, get_maculis_task, list_maculis_tasks,
//   cancel_maculis_task, approve_maculis_action.

import { createInterface } from 'node:readline';
import * as engine from '../src/engine.mjs';
import { getTask, listTasks } from '../src/tasks.mjs';
import { recordDecision, listDecisions, supersedeDecision } from '../src/decisions.mjs';
import { recordEvidence, getEvidence } from '../src/evidence.mjs';
import { workstreams } from '../src/workstreams.mjs';

const TOOLS = [
  {
    name: 'submit_maculis_task',
    description: 'Submit a free-text Maculis development task. Routes automatically to Website, First Five or Relationship and returns the task id + routing.',
    inputSchema: {
      type: 'object',
      properties: {
        request: { type: 'string', description: 'The development task in natural language.' },
        preferred_agent: { type: 'string', enum: ['website', 'first_five', 'relationship'] },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
        deploy_required: { type: 'boolean' },
      },
      required: ['request'],
    },
  },
  {
    name: 'submit_maculis_epic',
    description: 'Submit a LARGE multi-step engineering assignment. It is decomposed into ordered, routed sub-tasks (one per repo/step), chained by dependency, and run under the Autonomous Night Run governance. Use for assignments spanning multiple steps or repos; use submit_maculis_task for a single instruction.',
    inputSchema: {
      type: 'object',
      properties: {
        request: { type: 'string', description: 'The full assignment in natural language (numbered/bulleted steps welcome).' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
        deploy_required: { type: 'boolean' },
        origin: { type: 'object', description: 'Where this came from (type/id/project/correlation_id/return_destination) so its result returns to the right specialist context.' },
      },
      required: ['request'],
    },
  },
  { name: 'plan_maculis_assignment', description: 'Dry-run: show how a large assignment would be split and routed into sub-tasks, without creating anything.', inputSchema: { type: 'object', properties: { request: { type: 'string' } }, required: ['request'] } },
  { name: 'get_maculis_epic', description: 'Get one decomposed epic with its sub-tasks and rollup status.', inputSchema: { type: 'object', properties: { epic_id: { type: 'string' } }, required: ['epic_id'] } },
  { name: 'get_maculis_epic_completion', description: 'Retrieve the structured completion record for an epic (status, commits, result refs, human actions, delivery state).', inputSchema: { type: 'object', properties: { epic_id: { type: 'string' } }, required: ['epic_id'] } },
  { name: 'acknowledge_maculis_epic', description: 'Acknowledge receipt of a completed epic from its origin context; only then is delivery marked delivered. Fails if not yet terminal.', inputSchema: { type: 'object', properties: { epic_id: { type: 'string' }, correlation_id: { type: 'string' } }, required: ['epic_id'] } },
  { name: 'get_maculis_cockpit', description: 'Compact cockpit view: one line per epic (origin, phase, tasks, commits, delivery state).', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_maculis_governance', description: 'Read the durable Lead Engineering / Autonomous Night Run governance framework applied to every task.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_maculis_task', description: 'Get one task by id.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'list_maculis_tasks', description: 'List tasks, optionally filtered by status or agent.', inputSchema: { type: 'object', properties: { status: { type: 'string' }, agent: { type: 'string' } } } },
  { name: 'cancel_maculis_task', description: 'Cancel a task by id.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'approve_maculis_action', description: 'Approve or reject a pending approval.', inputSchema: { type: 'object', properties: { approval_id: { type: 'string' }, approve: { type: 'boolean' } }, required: ['approval_id', 'approve'] } },
  { name: 'list_maculis_human_actions', description: 'List open human actions (things only the human can do: credentials, DNS, billing, verification).', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_maculis_task_log', description: 'Get the audit trail for one task.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  // ---- Control plane: workstreams, status, decisions, evidence, pause -----
  { name: 'list_maculis_workstreams', description: 'List durable Maculis workstream identities (chat-independent): id, domain, scope, owning repo, status, active epics, paused scopes, client bindings.', inputSchema: { type: 'object', properties: {} } },
  { name: 'get_maculis_status', description: 'Monitoring overview: task/epic states (RUNNING/WAITING/PAUSED/BLOCKED/HUMAN ACTION/COMPLETED/FAILED), active+superseded decisions, cross-workstream conflicts, undelivered completions.', inputSchema: { type: 'object', properties: {} } },
  { name: 'record_maculis_decision', description: 'Record a canonical DECISION in the ledger (scope/decision/rationale/effect). effect "pause" installs a guard; pass supersedes to mark older decisions superseded (newer wins).', inputSchema: { type: 'object', properties: { scope: { type: 'string' }, decision: { type: 'string' }, rationale: { type: 'string' }, effect: { type: 'string', enum: ['pause', 'resume', 'policy', 'note'] }, supersedes: { type: 'array', items: { type: 'string' } } }, required: ['decision'] } },
  { name: 'list_maculis_decisions', description: 'List decisions (optionally by scope/status/effect), including supersession chain.', inputSchema: { type: 'object', properties: { scope: { type: 'string' }, status: { type: 'string' }, effect: { type: 'string' } } } },
  { name: 'supersede_maculis_decision', description: 'Record a new decision that explicitly supersedes an existing one (newer wins).', inputSchema: { type: 'object', properties: { decision_id: { type: 'string' }, decision: { type: 'string' }, rationale: { type: 'string' }, effect: { type: 'string' }, scope: { type: 'string' } }, required: ['decision_id', 'decision'] } },
  { name: 'submit_maculis_evidence', description: 'Submit cross-workstream EVIDENCE / PILOT_EVIDENCE once. The Orchestrator classifies it, routes it selectively to the owning workstream(s) without broadcasting, builds a minimal context envelope preserving provenance, and returns the routing decision + why. Never starts execution and never lifts a PAUSED decision.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, hint: { type: 'string', enum: ['EVIDENCE', 'PILOT_EVIDENCE'] }, origin: { type: 'object' } }, required: ['text'] } },
  { name: 'get_maculis_evidence', description: 'Retrieve an evidence record (classification, routing, context envelope, provenance).', inputSchema: { type: 'object', properties: { evidence_id: { type: 'string' } }, required: ['evidence_id'] } },
  { name: 'pause_maculis_epic', description: 'Pause an epic (its queued sub-tasks stop being picked up).', inputSchema: { type: 'object', properties: { epic_id: { type: 'string' }, reason: { type: 'string' } }, required: ['epic_id'] } },
  { name: 'resume_maculis_epic', description: 'Resume a paused epic. Refused when an active PAUSED decision covers its scope unless override is set (explicit GO).', inputSchema: { type: 'object', properties: { epic_id: { type: 'string' }, override: { type: 'boolean' } }, required: ['epic_id'] } },
];

function ok(result) { return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }; }

async function callTool(name, a = {}) {
  switch (name) {
    case 'submit_maculis_task': {
      const out = engine.submit(a.request, { priority: a.priority, preferredAgent: a.preferred_agent, deployRequired: Boolean(a.deploy_required) });
      setImmediate(() => engine.drain().catch(() => {}));
      return ok({ task_id: out.task.task_id, routed_to: out.task.selected_agent, repository: out.task.repository, status: out.task.status, reason: out.task.routing_reason, deduped: out.deduped || null });
    }
    case 'submit_maculis_epic': {
      // MCP callers are identified as the 'mcp' client unless they declare a project.
      const out = engine.submitEpic(a.request, { priority: a.priority, deployRequired: Boolean(a.deploy_required),
        origin: { type: 'mcp', ...(a.origin || {}) }, submittedBy: (a.origin && a.origin.project) ? `mcp:${a.origin.project}` : 'mcp' });
      setImmediate(() => engine.drain().catch(() => {}));
      return ok({
        epic_id: out.epic?.epic_id || null, is_epic: out.is_epic, origin: out.origin || null,
        subtasks: (out.tasks || []).map((t) => ({ task_id: t.task_id, routed_to: t.selected_agent, repository: t.repository, depends_on: t.dependencies })),
        repositories: out.plan?.repositories || [], needs_routing_review: out.plan?.needs_routing_review || false,
      });
    }
    case 'get_maculis_epic_completion': { const c = engine.getEpicCompletion(a.epic_id); return ok(c || { error: 'not found' }); }
    case 'acknowledge_maculis_epic': return ok(engine.acknowledgeEpic(a.epic_id, { correlationId: a.correlation_id || null, by: 'mcp' }));
    case 'get_maculis_cockpit': return ok(engine.cockpitView());
    case 'plan_maculis_assignment': {
      const { decompose } = await import('../src/decompose.mjs');
      const plan = decompose(a.request);
      return ok({ is_epic: plan.is_epic, count: plan.count, repositories: plan.repositories, needs_routing_review: plan.needs_routing_review,
        steps: plan.steps.map((s) => ({ index: s.index, text: s.text, routed_to: s.selected_agent, repository: s.repository, depends_on_index: s.depends_on_index })) });
    }
    case 'get_maculis_epic': { const e = engine.getEpic(a.epic_id); return ok(e || { error: 'not found' }); }
    case 'get_maculis_governance': { const { getGovernance } = await import('../src/governance.mjs'); return ok(getGovernance()); }
    case 'get_maculis_task': { const t = getTask(a.task_id); return ok(t || { error: 'not found' }); }
    case 'list_maculis_tasks': return ok(listTasks({ status: a.status, agent: a.agent }).map((t) => ({ task_id: t.task_id, status: t.status, agent: t.selected_agent, title: t.title })));
    case 'cancel_maculis_task': { const t = engine.cancel(a.task_id); return ok(t || { error: 'not found' }); }
    case 'approve_maculis_action': { const r = engine.resolveApproval(a.approval_id, Boolean(a.approve)); return ok(r || { error: 'not found' }); }
    case 'list_maculis_human_actions': return ok(engine.listHumanActions());
    case 'get_maculis_task_log': { const { tail } = await import('../src/audit.mjs'); return ok(getTask(a.task_id) ? { task_id: a.task_id, log: tail(200, a.task_id) } : { error: 'not found' }); }
    case 'list_maculis_workstreams': return ok(workstreams());
    case 'get_maculis_status': return ok(engine.statusOverview());
    case 'record_maculis_decision': return ok(recordDecision({ scope: a.scope, decision: a.decision, rationale: a.rationale, effect: a.effect, supersedes: a.supersedes, origin: { type: 'mcp' }, submittedBy: 'mcp' }));
    case 'list_maculis_decisions': return ok(listDecisions({ scope: a.scope, status: a.status, effect: a.effect }));
    case 'supersede_maculis_decision': return ok(supersedeDecision(a.decision_id, { decision: a.decision, rationale: a.rationale, effect: a.effect, scope: a.scope, origin: { type: 'mcp' }, submittedBy: 'mcp' }));
    case 'submit_maculis_evidence': return ok(recordEvidence(a.text, { origin: { type: 'mcp', ...(a.origin || {}) }, submittedBy: (a.origin && a.origin.project) ? `mcp:${a.origin.project}` : 'mcp', hint: a.hint || null }));
    case 'get_maculis_evidence': return ok(getEvidence(a.evidence_id) || { error: 'not found' });
    case 'pause_maculis_epic': return ok(engine.pauseEpic(a.epic_id, { reason: a.reason || 'paused via MCP', by: 'mcp' }));
    case 'resume_maculis_epic': return ok(engine.resumeEpic(a.epic_id, { by: 'mcp', override: Boolean(a.override) }));
    default: throw new Error(`unknown tool ${name}`);
  }
}

function reply(id, result, error) {
  const msg = error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result };
  process.stdout.write(JSON.stringify(msg) + '\n');
}

const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  const t = line.trim();
  if (!t) return;
  let req;
  try { req = JSON.parse(t); } catch { return; }
  const { id, method, params } = req;
  try {
    if (method === 'initialize') {
      return reply(id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'maculis-orchestrator', version: '1.0.0' } });
    }
    if (method === 'tools/list') return reply(id, { tools: TOOLS });
    if (method === 'tools/call') return reply(id, await callTool(params.name, params.arguments || {}));
    if (method === 'ping') return reply(id, {});
    if (id !== undefined) reply(id, null, { code: -32601, message: `method not found: ${method}` });
  } catch (err) {
    if (id !== undefined) reply(id, null, { code: -32000, message: err.message });
  }
});
