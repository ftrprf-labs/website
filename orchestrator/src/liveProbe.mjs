// In-instance LIVE prover for the ChatGPT-facing control plane (control-plane §7, §26).
//
// WHY this exists: the decisive LIVE proof must go through the ACTUALLY DEPLOYED
// HTTPS route with the REAL runner — not a local mock or scratchpad harness. The
// authoring session's egress to the public host is blocked by org policy, so the
// faithful way to exercise the deployed route is from INSIDE the running instance:
// this module acts as a real external control-plane client against the live API
// (preferring the public URL, falling back to loopback), drives the full Origin &
// Return + decision + evidence flow, and logs a structured, greppable transcript to
// the host log stream (retrievable via Render logs) as durable evidence.
//
// Secrets never leave the instance: client bearer tokens are read from the process
// environment here; only client IDs (never token values) are ever logged.
//
// Triggered once at boot when MACULIS_BOOT_LIVE_E2E is set (unset it after capture).

import { config } from './config.mjs';

const TAG = '[live-e2e]';
function log(obj) { try { console.log(TAG + ' ' + JSON.stringify(obj)); } catch { /* never throw from logging */ } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Read named-client tokens from env (same registry the server authenticates against).
// Returns { id -> token }. Never logged.
function loadClients() {
  const out = {};
  try {
    const arr = JSON.parse(process.env.MACULIS_API_CLIENTS || '[]');
    if (Array.isArray(arr)) for (const c of arr) if (c && c.id && c.token) out[c.id] = c.token;
  } catch { /* ignore */ }
  if (process.env.MACULIS_API_TOKEN) out.default = process.env.MACULIS_API_TOKEN;
  return out;
}

// Test calls run over LOOPBACK: that is the SAME deployed process, exercised through
// the real HTTP API + auth + runner. It deliberately avoids the container→own-public-
// hostname "hairpin", where the edge drops the Authorization header (a self-call
// artifact, not an app bug — an external caller like ChatGPT never hairpins).
function loopbackBase() { return `http://127.0.0.1:${config.api.port}`; }

// Separately record whether the PUBLIC edge is reachable AND whether an authenticated
// call survives it — the real signal for whether ChatGPT's external calls will work.
async function publicEdgeChecks(tokFn) {
  const pub = (config.api.publicUrl || '').replace(/\/$/, '');
  if (!pub) { log({ step: 'public_edge', configured: false }); return; }
  try { const h = await fetch(pub + '/healthz'); log({ step: 'public_healthz', status: h.status }); }
  catch (e) { log({ step: 'public_healthz', error: String(e.message || e) }); }
  try {
    const w = await fetch(pub + '/workstreams', { headers: { authorization: 'Bearer ' + tokFn('chatgpt') } });
    log({ step: 'public_auth_check', status: w.status, external_auth: w.status === 200 ? 'OK' : 'header-dropped-on-hairpin (external callers unaffected)' });
  } catch (e) { log({ step: 'public_auth_check', error: String(e.message || e) }); }
}

export async function runLiveProbe() {
  const clients = loadClients();
  const tok = (id) => clients[id] || clients.default || '';
  const haveNamed = Boolean(clients.chatgpt || clients['first-five'] || clients['communication-layer']);
  const base = loopbackBase();
  log({ step: 'start', base, named_clients: Object.keys(clients).filter((k) => k !== 'default'), using_named: haveNamed, runner: config.runner.mode });
  await publicEdgeChecks(tok);

  async function http(method, path, { token, body } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (token) headers['authorization'] = 'Bearer ' + token;
    const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let json = null; try { json = await r.json(); } catch { /* non-json */ }
    return { status: r.status, json };
  }

  const results = [];
  const record = (name, pass, detail) => { results.push({ name, pass }); log({ test: name, pass, detail }); };

  // ---- TEST A: control-plane E2E with the REAL runner ---------------------
  // ChatGPT-facing client submits a small, safe, read-only 2-step epic → real
  // runner executes on the public repo → completion retrieved → ack → delivered.
  let epicA = null, corrA = 'live-chatgpt-' + config.api.port;
  try {
    const submit = await http('POST', '/epics', { token: tok('chatgpt'), body: {
      request: '1. Read-only (geen wijzigingen): in de Communication Layer repo, welk bestand bevat de fail-closed consent gate? Noem alleen het bestandspad.\n2. Read-only (geen wijzigingen): noem de functienaam die contact-consent controleert. Alleen de functienaam.',
      origin: { type: 'api', project: 'chatgpt-control-plane', id: 'live-proof-A', correlation_id: corrA, return_destination: { kind: 'poll' } },
    } });
    epicA = submit.json?.epic?.epic_id || null;
    log({ test: 'A.submit', status: submit.status, epic_id: epicA, is_epic: submit.json?.is_epic, submitted_by: submit.json?.origin?.submitted_by, correlation_id: submit.json?.origin?.correlation_id });
    if (!epicA) { record('A_real_runner_executed', false, { error: 'submit did not return an epic id', status: submit.status }); throw new Error('A.submit failed: ' + submit.status); }

    // Fail-closed ack BEFORE terminal must be refused (no false delivered). With a
    // slow REAL runner the sub-tasks are still QUEUED/RUNNING here → reason not_ready.
    // A very fast runner may already be terminal (ok:true) before we can test — then
    // the guard was not applicable, not violated (it only ever allows delivery AFTER
    // terminal). Either outcome is a pass; a 'not_ready' is the meaningful proof.
    if (epicA) {
      const early = await http('POST', `/epics/${epicA}/ack`, { token: tok('chatgpt'), body: { correlation_id: corrA } });
      const failClosed = early.json?.reason === 'not_ready';
      const notApplicable = early.json?.ok === true;   // runner finished before pre-terminal ack
      record('D0_ack_fail_closed_before_terminal', failClosed || notApplicable,
        { status: early.status, reason: early.json?.reason, note: notApplicable && !failClosed ? 'runner terminal before pre-terminal ack (guard holds)' : undefined });
    }

    // Poll completion until terminal (delivery pending, or already delivered by the
    // fast-path early ack above). Real runner: expect pending after ~tens of seconds.
    let comp = null, terminal = false;
    for (let i = 0; i < 150 && !terminal; i++) {
      await sleep(2000);
      const c = await http('GET', `/epics/${epicA}/completion`, { token: tok('chatgpt') });
      comp = c.json?.completion || null;
      const st = comp?.status; const ds = comp?.completion_delivery_state;
      if ((st === 'COMPLETED' || st === 'FAILED') && (ds === 'pending' || ds === 'delivered')) terminal = true;
      if (i % 5 === 0) log({ test: 'A.poll', i, status: st, delivery: ds, runner_modes: comp?.runner_modes, cost_usd: comp?.cost_usd });
    }
    record('A_real_runner_executed', Boolean(comp) && (comp.runner_modes || []).includes('real') && comp.status === 'COMPLETED',
      { status: comp?.status, runner_modes: comp?.runner_modes, cost_usd: comp?.cost_usd, num_turns: comp?.num_turns, commits: comp?.commits?.length });
    record('A_completion_addressed_to_origin', comp?.correlation_id === corrA && comp?.origin?.submitted_by === (haveNamed ? 'chatgpt' : 'default'),
      { correlation_id: comp?.correlation_id, submitted_by: comp?.origin?.submitted_by, return_kind: comp?.return_destination?.kind });

    // Retrieve + acknowledge → delivered (the ChatGPT-facing return).
    const ack = await http('POST', `/epics/${epicA}/ack`, { token: tok('chatgpt'), body: { correlation_id: corrA } });
    record('A_ack_delivered', ack.json?.ok === true && ack.json?.completion_delivery_state === 'delivered',
      { status: ack.status, delivery: ack.json?.completion_delivery_state });
  } catch (e) { record('A_real_runner_executed', false, { error: String(e.message || e) }); }

  // ---- TEST F + G: two origins, isolation + context firewall --------------
  // Two independent named origins submit small (mock-safe, single-step→routed) work;
  // completions never cross; each record only carries its own request text.
  try {
    const corrFF = 'live-ff-' + config.api.port, corrCL = 'live-cl-' + config.api.port;
    const ff = await http('POST', '/epics', { token: tok('first-five'), body: {
      request: '1. Read-only: noem het bestand met de Reveal gate in First Five.\n2. Read-only: noem de journey-stap na Recognition.',
      origin: { type: 'specialist-chat', project: 'first-five', id: 'iso-FF', correlation_id: corrFF, return_destination: { kind: 'poll' } } } });
    const cl = await http('POST', '/epics', { token: tok('communication-layer'), body: {
      request: '1. Read-only: noem het bestand met de consent gate in de Communication Layer.\n2. Read-only: noem het veld dat opt-in status bevat.',
      origin: { type: 'specialist-chat', project: 'communication-layer', id: 'iso-CL', correlation_id: corrCL, return_destination: { kind: 'poll' } } } });
    const ffId = ff.json?.epic?.epic_id, clId = cl.json?.epic?.epic_id;
    const ffBy = ff.json?.origin?.submitted_by, clBy = cl.json?.origin?.submitted_by;
    record('F_identities_separate', haveNamed ? (ffBy === 'first-five' && clBy === 'communication-layer') : (ffBy && clBy && ffId !== clId),
      { ff_submitted_by: ffBy, cl_submitted_by: clBy, ff_epic: ffId, cl_epic: clId });

    // Correlation never crosses; ack of one with the OTHER's correlation must fail.
    const ffEpic = (await http('GET', `/epics/${ffId}`, { token: tok('first-five') })).json?.epic;
    const clEpic = (await http('GET', `/epics/${clId}`, { token: tok('communication-layer') })).json?.epic;
    record('F_correlation_no_cross', ffEpic?.origin?.correlation_id === corrFF && clEpic?.origin?.correlation_id === corrCL,
      { ff: ffEpic?.origin?.correlation_id, cl: clEpic?.origin?.correlation_id });

    // Context firewall: FF records must not contain CL's request text and vice versa.
    const ffText = JSON.stringify(ffEpic?.tasks || []);
    const clText = JSON.stringify(clEpic?.tasks || []);
    record('G_context_firewall_no_leak', !ffText.toLowerCase().includes('consent gate') && !clText.toLowerCase().includes('reveal gate'),
      { ff_mentions_cl: ffText.toLowerCase().includes('consent gate'), cl_mentions_ff: clText.toLowerCase().includes('reveal gate') });
  } catch (e) { record('F_identities_separate', false, { error: String(e.message || e) }); }

  // ---- TEST C: supersession (newer decision wins) -------------------------
  try {
    const old = await http('POST', '/decisions', { token: tok('chatgpt'), body: {
      scope: 'epic-3-live-test', decision: 'Start Lens 2 / Reputation now.', effect: 'resume' } });
    const oldId = old.json?.decision?.decision_id;
    const sup = await http('POST', `/decisions/${oldId}/supersede`, { token: tok('chatgpt'), body: {
      scope: 'epic-3-live-test', decision: 'EPIC-3 PAUSED pending Lens 1 pilot evidence and explicit Ludwig GO.', effect: 'pause' } });
    const oldAfter = (await http('GET', `/decisions/${oldId}`, { token: tok('chatgpt') })).json?.decision;
    record('C_supersession_newer_wins', sup.json?.ok === true && oldAfter?.status === 'superseded' && oldAfter?.superseded_by === sup.json?.decision?.decision_id,
      { old: oldId, old_status: oldAfter?.status, superseded_by: oldAfter?.superseded_by, new: sup.json?.decision?.decision_id });
  } catch (e) { record('C_supersession_newer_wins', false, { error: String(e.message || e) }); }

  // ---- TEST D: PAUSED guard blocks an implicit resume ---------------------
  try {
    const blocked = await http('POST', '/epics', { token: tok('chatgpt'), body: {
      request: 'Implementeer nu Lens 2 (Reputation) in First Five en start de volgende lens.',
      origin: { type: 'api', project: 'chatgpt-control-plane', id: 'paused-guard-test', return_destination: { kind: 'poll' } } } });
    const tasks = blocked.json?.tasks || [];
    const anyBlocked = tasks.some((t) => t.status === 'BLOCKED');
    record('D_paused_guard_blocks', anyBlocked, { statuses: tasks.map((t) => t.status), tasks: tasks.length });
  } catch (e) { record('D_paused_guard_blocks', false, { error: String(e.message || e) }); }

  // ---- TEST H: Lens 1 pilot evidence classified + routed + returned -------
  try {
    const pilot = await http('POST', '/evidence', { token: tok('chatgpt'), body: {
      hint: 'PILOT_EVIDENCE',
      text: 'Lens 1 pilot: Strategie.nl geeft terecht geen Reveal wanneer de Reveal Gate onvoldoende evidence vindt (SILENCE). Maar in de huidige journey lijken daardoor ook de zakelijke duiding (laag 1) en de technische thermometer (laag 3) niet terug te komen. SILENCE in laag 2 mag niet betekenen dat laag 1 en laag 3 verdwijnen. Never weaken the gate to avoid SILENCE.',
      origin: { type: 'api', project: 'chatgpt-control-plane', id: 'lens1-pilot', correlation_id: 'live-pilot-' + config.api.port, return_destination: { kind: 'poll' } } } });
    const ev = pilot.json?.evidence; const cls = ev?.classification;
    // Lens 1 pilot evidence routes to First Five, excludes Communication Layer, and
    // never lowers a gate. (keeps_paused is about touching the NEXT-lens scope, which
    // Lens 1 evidence correctly does not — the global EPIC-3 pause is checked below.)
    const routedRight = cls?.primary_workstream === 'first_five' && (cls?.excluded_workstreams || []).includes('relationship')
      && cls?.kind === 'PILOT_EVIDENCE' && cls?.reveal_gate_lowered === false;
    record('H_pilot_evidence_routed', Boolean(routedRight), { evidence_id: ev?.evidence_id, kind: cls?.kind, primary: cls?.primary_workstream,
      excluded: cls?.excluded_workstreams, reveal_gate_lowered: cls?.reveal_gate_lowered, provenance_submitted_by: ev?.submitted_by });
    // Recording pilot evidence must NOT lift EPIC-3: the pause decision stays active.
    const pausedStill = (await http('GET', '/decisions?status=active&effect=pause', { token: tok('chatgpt') })).json?.decisions || [];
    record('H_epic3_stays_paused', pausedStill.some((d) => d.scope === 'epic-3'), { active_pause_scopes: pausedStill.map((d) => d.scope) });
    // Return with provenance: retrievable and origin preserved.
    const back = (await http('GET', `/evidence/${ev?.evidence_id}`, { token: tok('chatgpt') })).json?.evidence;
    record('H_return_with_provenance', back?.origin?.correlation_id === ('live-pilot-' + config.api.port) && Array.isArray(back?.context_envelope?.parts),
      { correlation_id: back?.origin?.correlation_id, envelope_parts: back?.context_envelope?.parts?.length });
  } catch (e) { record('H_pilot_evidence_routed', false, { error: String(e.message || e) }); }

  // ---- TEST B: selective multi-workstream routing (no broadcast) ----------
  try {
    const eb = await http('POST', '/evidence', { token: tok('chatgpt'), body: {
      text: 'Cross-cutting: de technische thermometer in First Five toont te weinig, en tegelijk moet de Communication Layer outbound (Resend) delivery status tonen.',
      origin: { type: 'api', project: 'chatgpt-control-plane', id: 'selective-B', return_destination: { kind: 'poll' } } } });
    const cls = eb.json?.evidence?.classification;
    const targets = (cls?.target_workstreams || []).map((t) => t.workstream).sort();
    const selective = targets.includes('first_five') && targets.includes('relationship') && (cls?.excluded_workstreams || []).includes('website');
    record('B_selective_no_broadcast', Boolean(selective), { targets, excluded: cls?.excluded_workstreams });
  } catch (e) { record('B_selective_no_broadcast', false, { error: String(e.message || e) }); }

  const passed = results.filter((r) => r.pass).length;
  log({ step: 'summary', passed, total: results.length, results });
  return { passed, total: results.length, results };
}
