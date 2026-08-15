// OpenAPI 3.1 spec for the ChatGPT bridge (brief §19, §20, §24, §44).
//
// This is the supported, official integration path: a ChatGPT custom GPT
// "Action" (or any OpenAPI client) points at GET /openapi.json, authenticates
// with the bearer token, and gets the SMALL Maculis tool surface — no browser
// automation, no DOM scripting. The same operations are also exposed over MCP.

import { config } from './config.mjs';

export function openApiSpec() {
  const server = config.api.publicUrl || `http://${config.api.host}:${config.api.port}`;
  return {
    openapi: '3.1.0',
    info: {
      title: 'Maculis Development Orchestrator',
      description: 'Submit one free-text development task; it is routed to the right Maculis domain (Website / First Five / Relationship), built by a real coding agent, verified, and delivered. Poll task status for the outcome.',
      version: '2.0.0',
    },
    servers: [{ url: server }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } },
      schemas: {
        TaskRef: {
          type: 'object',
          properties: {
            task_id: { type: 'string' }, status: { type: 'string' },
            selected_agent: { type: 'string' }, repository: { type: 'string' },
            task_type: { type: 'string' }, risk_level: { type: 'string' },
            routing_reason: { type: 'string' }, result_summary: { type: 'string' },
            commit_sha: { type: 'string' }, deploy_url: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/tasks': {
        post: {
          operationId: 'submit_maculis_task',
          summary: 'Submit a development task (routes automatically).',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['request'],
              properties: {
                request: { type: 'string', description: 'The development task in natural language.' },
                priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
                preferred_agent: { type: 'string', enum: ['website', 'first_five', 'relationship'] },
                deploy_required: { type: 'boolean' },
              },
            } } },
          },
          responses: { 202: { description: 'Task accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskRef' } } } } },
        },
        get: { operationId: 'list_maculis_tasks', summary: 'List tasks.', responses: { 200: { description: 'OK' } } },
      },
      '/tasks/{id}': {
        get: {
          operationId: 'get_maculis_task', summary: 'Get one task by id.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaskRef' } } } }, 404: { description: 'Not found' } },
        },
      },
      '/tasks/{id}/cancel': {
        post: {
          operationId: 'cancel_maculis_task', summary: 'Cancel a task.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Cancelled' } },
        },
      },
      '/epics': {
        post: {
          operationId: 'submit_maculis_epic',
          summary: 'Submit a LARGE assignment: it is decomposed into ordered, routed sub-tasks and run under the Autonomous Night Run governance. Use this for multi-step engineering work spanning steps or repos; use submit_maculis_task for a single instruction.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object', required: ['request'],
              properties: {
                request: { type: 'string', description: 'The full multi-step engineering assignment in natural language (numbered/bulleted steps welcome).' },
                priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
                deploy_required: { type: 'boolean' },
                origin: {
                  type: 'object',
                  description: 'Where this assignment came from, so its result can return to the right specialist context. submitted_by is set from your API key, not this object.',
                  properties: {
                    type: { type: 'string', enum: ['specialist-chat', 'api', 'mcp', 'cli', 'system', 'unspecified'] },
                    id: { type: 'string', description: 'Opaque origin identifier (e.g. a thread id).' },
                    project: { type: 'string', description: 'Workstream, e.g. first-five, communication-layer, finance.' },
                    correlation_id: { type: 'string', description: 'Your id to correlate the completion; generated if omitted.' },
                    return_destination: { type: 'object', properties: { kind: { type: 'string', enum: ['poll', 'webhook', 'mcp', 'none'] }, ref: { type: 'string' } } },
                  },
                },
              },
            } } },
          },
          responses: { 202: { description: 'Epic accepted; returns the epic id, its sub-tasks, and the registered origin.' } },
        },
        get: { operationId: 'list_maculis_epics', summary: 'List decomposed epics and their rollup status.', responses: { 200: { description: 'OK' } } },
      },
      '/epics/{id}/completion': {
        get: {
          operationId: 'get_maculis_epic_completion', summary: 'Retrieve the structured completion record for an epic (status, commits, result refs, human actions, delivery state).',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
      },
      '/epics/{id}/ack': {
        post: {
          operationId: 'acknowledge_maculis_epic', summary: 'Acknowledge receipt of a completed epic from the origin context. Only then is delivery marked delivered. Fails if the epic is not yet terminal.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { correlation_id: { type: 'string' } } } } } },
          responses: { 200: { description: 'Delivered' }, 409: { description: 'Not terminal or correlation mismatch' } },
        },
      },
      '/cockpit': { get: { operationId: 'get_maculis_cockpit', summary: 'Compact cockpit: one line per epic (origin, phase, task count, commits, delivery state) — no bulky content.', responses: { 200: { description: 'OK' } } } },
      '/epics/{id}': {
        get: {
          operationId: 'get_maculis_epic', summary: 'Get one epic with its sub-tasks and rollup status.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } },
        },
      },
      '/decompose': {
        post: {
          operationId: 'plan_maculis_assignment',
          summary: 'Dry-run: show how a large assignment would be split and routed into sub-tasks, without creating anything.',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['request'], properties: { request: { type: 'string' } } } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/governance': { get: { operationId: 'get_maculis_governance', summary: 'Read the durable Lead Engineering / Autonomous Night Run governance framework the Orchestrator applies to every task.', responses: { 200: { description: 'OK' } } } },
      '/human-actions': { get: { operationId: 'list_maculis_human_actions', summary: 'List open human actions (things only the human can do).', responses: { 200: { description: 'OK' } } } },
      '/approvals/{id}': {
        post: {
          operationId: 'approve_maculis_action', summary: 'Approve or reject a pending approval.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { approve: { type: 'boolean' } }, required: ['approve'] } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/agents': { get: { operationId: 'list_maculis_agents', summary: 'List development domains.', responses: { 200: { description: 'OK' } } } },
    },
  };
}
