// Digital Colleagues — HTTP routes (§FASE 6, Cockpit integration).
//
// Mounted ONLY when the Digital Colleagues domain is enabled (AGENTS_ENABLED + a database),
// independently of the Communication Layer, next to handleComm and behind the same admin session
// gate. Returns true if it handled the request so the main server falls through otherwise.
// This is the surface the Cockpit consumes: colleagues, their work, their findings (prepared work),
// and the human decisions (promote / dismiss). No public routes, no send, no external calls.

import { agentsEnabled } from '../comm/db.mjs';
import { getDefaultTenantId } from '../comm/tenant.mjs';
import { listActors, getActor, colleagueCard } from './registry.mjs';
import { createWorkItem, getWorkItem, listWorkItems } from './work.mjs';
import { runScout } from './scout/runner.mjs';
import { listRuns } from './run.mjs';
import { listFindings, getFinding, promoteFinding, dismissFinding } from './findings.mjs';
import { preparedWorkForCockpit, agentContributionsForOrganization, agentContributionsForContact, cockpitSummary } from './cockpit.mjs';
import { getDiscoveryProvider } from './providers/discovery.mjs';

const UUID = '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})';

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readRaw(req, limit = 1 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = ''; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); return; } raw += c; });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}
async function readJson(req) { try { return JSON.parse(await readRaw(req) || '{}'); } catch { return null; } }

export async function handleAgents(req, res, { pathname, method, isAuthed }) {
  if (!agentsEnabled() || !pathname.startsWith('/api/agents/')) return false;

  // All agent routes require the admin session (no public agent surface).
  if (!isAuthed(req)) { json(res, 401, { error: 'Niet ingelogd' }); return true; }
  const tenantId = await getDefaultTenantId();
  const u = new URL(req.url, 'http://x');

  // ---- registry: which colleagues exist and what they may do -----------------------------------
  if (pathname === '/api/agents/status' && method === 'GET') {
    const actors = await listActors(tenantId);
    const provider = getDiscoveryProvider();
    json(res, 200, {
      colleagues: await Promise.all(actors.filter((a) => a.kind === 'AGENT').map(async (a) => colleagueCard(await getActor(tenantId, a.slug)))),
      discovery: { provider: provider.name, configured: provider.configured },
    });
    return true;
  }
  if (pathname === '/api/agents/colleagues' && method === 'GET') {
    const actors = await listActors(tenantId);
    json(res, 200, { colleagues: actors });
    return true;
  }

  // ---- work items ------------------------------------------------------------------------------
  if (pathname === '/api/agents/work' && method === 'GET') {
    const rows = await listWorkItems(tenantId, {
      type: u.searchParams.get('type'), status: u.searchParams.get('status'),
      assignedRole: u.searchParams.get('role'),
    });
    json(res, 200, { work: rows });
    return true;
  }
  if (pathname === '/api/agents/work' && method === 'POST') {
    const body = await readJson(req);
    if (!body || !Array.isArray(body.candidates) && body.scope !== 'external_web') {
      json(res, 400, { error: 'candidates[] of scope vereist' }); return true;
    }
    const scout = await getActor(tenantId, 'scout');
    const created = await createWorkItem(tenantId, {
      type: 'growth_discovery',
      objective: body.objective || 'Kwalificeer mogelijke nieuwe relaties voor Maculis',
      createdBy: scout ? scout.id : null, assignedTo: scout ? scout.id : null, assignedRole: 'growth',
      input: { candidates: body.candidates || [], scope: body.scope || 'provided' },
      dedupeKey: body.dedupeKey || null,
    });
    if (!created.ok) { json(res, 400, created); return true; }
    let run = null;
    if (body.run) run = await runScout({ tenantId, workItemId: created.id, trigger: 'human' });
    json(res, 200, { workItemId: created.id, created: created.created, run });
    return true;
  }
  {
    const m = pathname.match(new RegExp(`^/api/agents/work/${UUID}$`));
    if (m && method === 'GET') {
      const work = await getWorkItem(tenantId, m[1]);
      if (!work) { json(res, 404, { error: 'Niet gevonden' }); return true; }
      const runs = await listRuns(tenantId, { workItemId: m[1] });
      const findings = await listFindings(tenantId, { workItemId: m[1], withEvidence: true });
      json(res, 200, { work, runs, findings });
      return true;
    }
  }

  // ---- run the Growth colleague on an existing work item ---------------------------------------
  if (pathname === '/api/agents/scout/run' && method === 'POST') {
    const body = await readJson(req);
    if (!body || !body.workItemId) { json(res, 400, { error: 'workItemId vereist' }); return true; }
    const result = await runScout({ tenantId, workItemId: body.workItemId, trigger: 'human' });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // ---- findings (prepared work) + human decisions ----------------------------------------------
  if (pathname === '/api/agents/findings' && method === 'GET') {
    const status = u.searchParams.get('status') || 'new';
    const rows = await preparedWorkForCockpit(tenantId, { status, role: u.searchParams.get('role') });
    json(res, 200, { findings: rows });
    return true;
  }
  {
    const m = pathname.match(new RegExp(`^/api/agents/findings/${UUID}$`));
    if (m && method === 'GET') {
      const f = await getFinding(tenantId, m[1]);
      if (!f) { json(res, 404, { error: 'Niet gevonden' }); return true; }
      json(res, 200, { finding: f });
      return true;
    }
    const mp = pathname.match(new RegExp(`^/api/agents/findings/${UUID}/promote$`));
    if (mp && method === 'POST') {
      const body = await readJson(req) || {};
      const result = await promoteFinding(tenantId, mp[1], { userId: null, note: body.note || null });
      json(res, result.ok ? 200 : 404, result);
      return true;
    }
    const md = pathname.match(new RegExp(`^/api/agents/findings/${UUID}/dismiss$`));
    if (md && method === 'POST') {
      const body = await readJson(req) || {};
      const result = await dismissFinding(tenantId, md[1], { userId: null, note: body.note || null });
      json(res, result.ok ? 200 : 404, result);
      return true;
    }
  }

  // ---- Cockpit integration surface (Vandaag / Relaties) ----------------------------------------
  if (pathname === '/api/agents/cockpit' && method === 'GET') {
    const [summary, prepared] = await Promise.all([
      cockpitSummary(tenantId),
      preparedWorkForCockpit(tenantId, { status: 'new' }),
    ]);
    json(res, 200, { summary, prepared });
    return true;
  }
  {
    const mo = pathname.match(new RegExp(`^/api/agents/organizations/${UUID}/contributions$`));
    if (mo && method === 'GET') {
      json(res, 200, { contributions: await agentContributionsForOrganization(tenantId, mo[1]) });
      return true;
    }
    const mc = pathname.match(new RegExp(`^/api/agents/contacts/${UUID}/contributions$`));
    if (mc && method === 'GET') {
      json(res, 200, { contributions: await agentContributionsForContact(tenantId, mc[1]) });
      return true;
    }
  }

  return false; // not an agent route we handle
}
