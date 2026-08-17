// Digital Colleagues — agent RUNTIME routes.
//
// Mounted only when the agent domain is enabled (AGENTS_ENABLED + a database), next to handleComm and
// handleCockpit, behind the admin session gate. This surface is deliberately small: it lets you see
// which colleagues exist and what they may do, and TRIGGER a colleague to run. A colleague LANDS its
// work into the cockpit via recordWorkItem (server/comm/work.mjs); listing and RESOLVING that work is
// the Cockpit's surface (/api/cockpit/*), not here. No second work inbox, no send, no external calls.

import { agentsEnabled } from '../comm/db.mjs';
import { getDefaultTenantId } from '../comm/tenant.mjs';
import { listActors, getActor, colleagueCard } from './registry.mjs';
import { runScout } from './scout/runner.mjs';
import { listRuns } from './run.mjs';
import { getDiscoveryProvider } from './providers/discovery.mjs';

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
  if (!isAuthed(req)) { json(res, 401, { error: 'Niet ingelogd' }); return true; }
  const tenantId = await getDefaultTenantId();

  // Registry: which colleagues exist and what they may do (autonomy + mandate), plus provider status.
  if (pathname === '/api/agents/status' && method === 'GET') {
    const actors = await listActors(tenantId);
    const provider = getDiscoveryProvider();
    const colleagues = await Promise.all(
      actors.filter((a) => a.kind === 'AGENT').map(async (a) => colleagueCard(await getActor(tenantId, a.slug))));
    json(res, 200, { colleagues, discovery: { provider: provider.name, configured: provider.configured } });
    return true;
  }
  if (pathname === '/api/agents/colleagues' && method === 'GET') {
    json(res, 200, { colleagues: await listActors(tenantId) });
    return true;
  }

  // Trigger the Growth/Lead colleague (Scout). Body: { candidates:[{name,domain?,email?,note?,demo?}],
  // scope?, runDedupeKey? }. Scout qualifies and LANDS work into the cockpit; it never resolves it.
  if (pathname === '/api/agents/scout/run' && method === 'POST') {
    const body = await readJson(req);
    if (!body || (!Array.isArray(body.candidates) && body.scope !== 'external_web')) {
      json(res, 400, { error: 'candidates[] of scope vereist' }); return true;
    }
    const result = await runScout({
      tenantId, candidates: body.candidates || [], scope: body.scope || 'provided',
      runDedupeKey: body.runDedupeKey || null, trigger: 'human',
    });
    json(res, result.ok ? 200 : 400, result);
    return true;
  }

  // Observability: recent runs (why did work appear? trace run -> capability calls -> landed items).
  if (pathname === '/api/agents/runs' && method === 'GET') {
    json(res, 200, { runs: await listRuns(tenantId, { limit: 50 }) });
    return true;
  }

  return false;
}
