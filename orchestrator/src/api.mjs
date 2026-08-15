// Authenticated HTTP API (brief §43–§44, §47). A small, safe machine boundary so
// external clients (a future ChatGPT bridge, an MCP server, CI) can submit tasks
// and read status — WITHOUT a public arbitrary-shell endpoint.
//
// Security: bearer-token auth on every mutating route, fixed-window rate limit,
// strict input validation, repository/agent allowlist (enforced by the router),
// no secrets in responses. Binds loopback-only unless a token is set (fail-closed,
// same discipline as the product server).

import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { config, isLoopback } from './config.mjs';
import { getAgents } from './registry.mjs';
import { route } from './router.mjs';
import * as engine from './engine.mjs';
import { getTask, listTasks } from './tasks.mjs';
import { tail } from './audit.mjs';
import { openApiSpec } from './openapi.mjs';
import { ready } from './store.mjs';
import { getGovernance } from './governance.mjs';
import { decompose } from './decompose.mjs';

const rate = new Map(); // key -> { count, resetAt }

function rateLimited(key) {
  const now = Date.now();
  const w = rate.get(key);
  if (!w || now > w.resetAt) { rate.set(key, { count: 1, resetAt: now + config.api.rateLimit.windowMs }); return false; }
  w.count += 1;
  return w.count > config.api.rateLimit.max;
}

function authed(req) {
  if (!config.api.token) return true; // loopback-only mode (guarded at startup)
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return false;
  const a = Buffer.from(m[1]); const b = Buffer.from(config.api.token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function readJson(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '', size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('payload too large')); req.destroy(); } data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

export function createApiServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;
    const ip = req.socket.remoteAddress || 'unknown';

    // Health is public (brief §61) — minimal info, no internal paths/secrets.
    if (path === '/healthz') {
      let stateOk = true;
      try { ready(); } catch { stateOk = false; }
      return send(res, 200, {
        ok: stateOk, service: 'maculis-orchestrator',
        worker: engine.isWorkerRunning ? engine.isWorkerRunning() : undefined,
        state_backend: stateOk, runner: config.runner.mode, registry_loaded: getAgents().length,
      });
    }
    // The OpenAPI spec is public so a ChatGPT Action can import it; the operations
    // it describes still require the bearer token.
    if (path === '/openapi.json') return send(res, 200, openApiSpec());

    // Auth + rate limit on everything else.
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });
    if (rateLimited(config.api.token ? 'token' : ip)) return send(res, 429, { error: 'rate limited' });

    try {
      // GET /agents
      if (req.method === 'GET' && path === '/agents') {
        return send(res, 200, { agents: getAgents().map(publicAgent) });
      }
      // POST /route  (dry-run routing, no task created)
      if (req.method === 'POST' && path === '/route') {
        const body = await readJson(req);
        if (!body.request || typeof body.request !== 'string' || body.request.length > 4000) return send(res, 400, { error: 'request (string, <=4000 chars) required' });
        return send(res, 200, route(body.request));
      }
      // GET /governance  (the durable Autonomous Night Run framework, read-only)
      if (req.method === 'GET' && path === '/governance') return send(res, 200, getGovernance());
      // POST /decompose  (dry-run: split + route a large assignment, no tasks created)
      if (req.method === 'POST' && path === '/decompose') {
        const body = await readJson(req);
        if (!body.request || typeof body.request !== 'string' || body.request.length > 8000) return send(res, 400, { error: 'request (string, <=8000 chars) required' });
        const plan = decompose(body.request);
        return send(res, 200, { ...plan, steps: plan.steps.map(publicStep) });
      }
      // POST /epics  (decompose + submit a large assignment as linked sub-tasks)
      if (req.method === 'POST' && path === '/epics') {
        const body = await readJson(req);
        if (!body.request || typeof body.request !== 'string' || body.request.length > 8000) return send(res, 400, { error: 'request (string, <=8000 chars) required' });
        const idempotencyKey = req.headers['idempotency-key'] || body.idempotency_key || null;
        const out = engine.submitEpic(body.request, { priority: body.priority, deployRequired: Boolean(body.deploy_required), idempotencyKey });
        setImmediate(() => engine.drain().catch(() => {}));
        return send(res, 202, {
          epic: out.epic, is_epic: out.is_epic, deduped: out.deduped || null,
          tasks: (out.tasks || []).map(publicTask),
          plan: out.plan ? { count: out.plan.count, repositories: out.plan.repositories, needs_routing_review: out.plan.needs_routing_review } : null,
        });
      }
      // GET /epics  and  GET /epics/:id
      if (req.method === 'GET' && path === '/epics') return send(res, 200, { epics: engine.listEpics().map(publicEpic) });
      const me = /^\/epics\/([A-Za-z0-9-]+)$/.exec(path);
      if (me && req.method === 'GET') {
        const e = engine.getEpic(me[1]);
        return e ? send(res, 200, { epic: publicEpic(e) }) : send(res, 404, { error: 'not found' });
      }
      // POST /tasks
      if (req.method === 'POST' && path === '/tasks') {
        const body = await readJson(req);
        if (!body.request || typeof body.request !== 'string' || body.request.length > 4000) {
          return send(res, 400, { error: 'request (string, <=4000 chars) required' });
        }
        const idempotencyKey = req.headers['idempotency-key'] || body.idempotency_key || null;
        const out = engine.submit(body.request, {
          priority: body.priority, preferredAgent: body.preferred_agent,
          deployRequired: Boolean(body.deploy_required), idempotencyKey,
        });
        // Kick the queue without blocking the response (async execution).
        setImmediate(() => engine.drain().catch(() => {}));
        return send(res, 202, { task: publicTask(out.task), deduped: out.deduped || null, message: out.message || null });
      }
      // GET /tasks
      if (req.method === 'GET' && path === '/tasks') {
        const status = url.searchParams.get('status');
        const agent = url.searchParams.get('agent');
        return send(res, 200, { tasks: listTasks({ status, agent }).map(publicTask) });
      }
      // GET /tasks/:id  and  POST /tasks/:id/cancel
      const m = /^\/tasks\/([A-Za-z0-9-]+)(\/cancel)?$/.exec(path);
      if (m) {
        const id = m[1];
        const t = getTask(id);
        if (!t) return send(res, 404, { error: 'not found' });
        if (m[2] === '/cancel' && req.method === 'POST') return send(res, 200, { task: publicTask(engine.cancel(id)) });
        if (req.method === 'GET') return send(res, 200, { task: publicTask(t), audit: tail(50, id) });
      }
      // GET /tasks/:id/log  (task audit trail for get_maculis_task_log)
      const ml = /^\/tasks\/([A-Za-z0-9-]+)\/log$/.exec(path);
      if (ml && req.method === 'GET') {
        if (!getTask(ml[1])) return send(res, 404, { error: 'not found' });
        return send(res, 200, { task_id: ml[1], log: tail(200, ml[1]) });
      }
      // POST /agents/:id/disable | /enable  (brief §71)
      const md = /^\/agents\/([A-Za-z0-9_]+)\/(disable|enable)$/.exec(path);
      if (md && req.method === 'POST') {
        if (!getAgents().some((a) => a.agent_id === md[1])) return send(res, 404, { error: 'no such agent' });
        if (md[2] === 'disable') { const body = await readJson(req).catch(() => ({})); return send(res, 200, { disabled: engine.disableAgent(md[1], body.reason || 'via API') }); }
        return send(res, 200, { enabled: engine.enableAgent(md[1]) });
      }
      // GET /queue  /approvals  /human-actions
      if (req.method === 'GET' && path === '/queue') return send(res, 200, { queue: engine.queueSnapshot().map(publicTask) });
      if (req.method === 'GET' && path === '/approvals') return send(res, 200, { approvals: engine.listApprovals() });
      if (req.method === 'GET' && path === '/human-actions') return send(res, 200, { human_actions: engine.listHumanActions() });
      // POST /approvals/:id  { approve: bool }
      const ma = /^\/approvals\/([A-Za-z0-9-]+)$/.exec(path);
      if (ma && req.method === 'POST') {
        const body = await readJson(req);
        const a = engine.resolveApproval(ma[1], Boolean(body.approve), body.note || '');
        if (!a) return send(res, 404, { error: 'not found' });
        return send(res, 200, { approval: a });
      }

      return send(res, 404, { error: 'no such route' });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  });
}

function publicAgent(a) {
  return { agent_id: a.agent_id, name: a.name, description: a.description, repository: a.repository, permission_profile: a.permission_profile };
}
function publicTask(t) {
  if (!t) return null;
  const { normalized_request, history, ...rest } = t;
  return rest;
}
function publicStep(s) {
  return {
    index: s.index, text: s.text, selected_agent: s.selected_agent, repository: s.repository,
    task_type: s.task_type, risk_level: s.risk_level, depends_on_index: s.depends_on_index || [],
  };
}
function publicEpic(e) {
  if (!e) return null;
  const { tasks, ...rest } = e;
  return { ...rest, tasks: (tasks || []).map(publicTask) };
}

export function startApi() {
  if (!config.api.token && !isLoopback(config.api.host)) {
    throw new Error('Refusing to start on a non-loopback host without MACULIS_API_TOKEN (fail-closed).');
  }
  const server = createApiServer();
  server.listen(config.api.port, config.api.host, () => {
    const mode = config.api.token ? 'token-auth' : 'loopback-only (no token set)';
    console.log(`Maculis Orchestrator API on http://${config.api.host}:${config.api.port} (${mode})`);
  });
  return server;
}
