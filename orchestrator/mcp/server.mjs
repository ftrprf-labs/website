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
  { name: 'get_maculis_task', description: 'Get one task by id.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'list_maculis_tasks', description: 'List tasks, optionally filtered by status or agent.', inputSchema: { type: 'object', properties: { status: { type: 'string' }, agent: { type: 'string' } } } },
  { name: 'cancel_maculis_task', description: 'Cancel a task by id.', inputSchema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'approve_maculis_action', description: 'Approve or reject a pending approval.', inputSchema: { type: 'object', properties: { approval_id: { type: 'string' }, approve: { type: 'boolean' } }, required: ['approval_id', 'approve'] } },
];

function ok(result) { return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }; }

async function callTool(name, a = {}) {
  switch (name) {
    case 'submit_maculis_task': {
      const out = engine.submit(a.request, { priority: a.priority, preferredAgent: a.preferred_agent, deployRequired: Boolean(a.deploy_required) });
      setImmediate(() => engine.drain().catch(() => {}));
      return ok({ task_id: out.task.task_id, routed_to: out.task.selected_agent, repository: out.task.repository, status: out.task.status, reason: out.task.routing_reason, deduped: out.deduped || null });
    }
    case 'get_maculis_task': { const t = getTask(a.task_id); return ok(t || { error: 'not found' }); }
    case 'list_maculis_tasks': return ok(listTasks({ status: a.status, agent: a.agent }).map((t) => ({ task_id: t.task_id, status: t.status, agent: t.selected_agent, title: t.title })));
    case 'cancel_maculis_task': { const t = engine.cancel(a.task_id); return ok(t || { error: 'not found' }); }
    case 'approve_maculis_action': { const r = engine.resolveApproval(a.approval_id, Boolean(a.approve)); return ok(r || { error: 'not found' }); }
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
