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
      title: 'Maculis Orchestrator — ChatGPT Control Plane',
      description: 'The central control plane for Maculis engineering. Tell it ONCE: submit an assignment/epic, submit cross-workstream evidence, or record a decision. The Orchestrator classifies, routes it selectively to the right durable workstream (Website / First Five / Relationship), executes with a real coding agent under governance, keeps provenance + origin, and returns the structured result to be retrieved here (poll/ack). No async push to a chat exists — retrieval is via this same API. Decisions supersede older ones; a PAUSED decision (e.g. EPIC-3 / next Lens) blocks implicit resumption.',
      version: '3.0.0',
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
      '/workstreams': { get: { operationId: 'list_maculis_workstreams', summary: 'List durable Maculis workstream identities (chat-independent): id, domain, scope, owning repo, status, active epics, paused scopes, client bindings.', responses: { 200: { description: 'OK' } } } },
      '/workstreams/{id}': { get: { operationId: 'get_maculis_workstream', summary: 'Get one workstream identity + live state.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } } },
      '/status': { get: { operationId: 'get_maculis_status', summary: 'Monitoring overview: task/epic states (RUNNING/WAITING/PAUSED/BLOCKED/HUMAN ACTION/COMPLETED/FAILED), active + superseded decisions, cross-workstream conflicts, undelivered completions.', responses: { 200: { description: 'OK' } } } },
      '/decisions': {
        get: { operationId: 'list_maculis_decisions', summary: 'List canonical decisions (optionally by scope/status/effect), including the supersession chain.', parameters: [{ name: 'scope', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
        post: {
          operationId: 'record_maculis_decision',
          summary: 'Record a canonical DECISION (scope/decision/rationale/effect). effect "pause" installs a guard that blocks implicit resumption of that scope; pass supersedes:[id] to mark older decisions superseded (newer wins).',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['decision'], properties: {
            scope: { type: 'string' }, decision: { type: 'string' }, rationale: { type: 'string' },
            effect: { type: 'string', enum: ['pause', 'resume', 'policy', 'note'] }, supersedes: { type: 'array', items: { type: 'string' } },
          } } } } },
          responses: { 201: { description: 'Recorded' } },
        },
      },
      '/decisions/{id}': { get: { operationId: 'get_maculis_decision', summary: 'Get one decision.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } } },
      '/decisions/{id}/supersede': {
        post: { operationId: 'supersede_maculis_decision', summary: 'Record a new decision that explicitly supersedes an existing one (newer wins).',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['decision'], properties: { decision: { type: 'string' }, rationale: { type: 'string' }, effect: { type: 'string' }, scope: { type: 'string' } } } } } },
          responses: { 201: { description: 'Superseded' }, 404: { description: 'Not found' } } },
      },
      '/evidence': {
        get: { operationId: 'list_maculis_evidence', summary: 'List evidence records (optionally by workstream/kind).', parameters: [{ name: 'workstream', in: 'query', schema: { type: 'string' } }, { name: 'kind', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'OK' } } },
        post: {
          operationId: 'submit_maculis_evidence',
          summary: 'Submit cross-workstream EVIDENCE / PILOT_EVIDENCE once. It is classified, routed SELECTIVELY to the owning workstream(s) with no broadcast, given a minimal context envelope preserving provenance, and returned with the routing "why". Never starts execution, never lifts a PAUSED decision.',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: {
            text: { type: 'string', description: 'The finding/observation in natural language.' },
            hint: { type: 'string', enum: ['EVIDENCE', 'PILOT_EVIDENCE'] },
            origin: { type: 'object', description: 'Where it came from (type/id/project/correlation_id/return_destination). submitted_by is set from your API key.' },
          } } } } },
          responses: { 201: { description: 'Recorded + routed' } },
        },
      },
      '/evidence/{id}': { get: { operationId: 'get_maculis_evidence', summary: 'Retrieve an evidence record (classification, routing, context envelope, provenance).', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } } } },
      '/epics/{id}/pause': { post: { operationId: 'pause_maculis_epic', summary: 'Pause an epic (queued sub-tasks stop being picked up).', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { reason: { type: 'string' } } } } } }, responses: { 200: { description: 'Paused' }, 404: { description: 'Not found' } } } },
      '/epics/{id}/resume': { post: { operationId: 'resume_maculis_epic', summary: 'Resume a paused epic. Refused (409) when an active PAUSED decision covers its scope unless override=true (explicit GO).', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { override: { type: 'boolean' } } } } } }, responses: { 200: { description: 'Resumed' }, 409: { description: 'Blocked by paused decision' } } } },
    },
  };
}
