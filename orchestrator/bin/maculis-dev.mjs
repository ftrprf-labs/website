#!/usr/bin/env node
// maculis-dev — the human-facing CLI (brief §39–§41).
//
//   maculis-dev submit "<free text>"     submit a task (routes automatically)
//   maculis-dev route  "<free text>"     dry-run: show routing only, no task
//   maculis-dev status [TASK_ID]         list tasks, or one task in detail
//   maculis-dev agents                   list development domains
//   maculis-dev queue                    show queued tasks
//   maculis-dev approvals                show pending approvals
//   maculis-dev actions                  show the central human-action queue
//   maculis-dev logs TASK_ID             show audit trail for a task
//   maculis-dev cancel TASK_ID           cancel a task
//   maculis-dev run                      drain the queue once (worker tick)
//   maculis-dev serve                    start the HTTP API
//   maculis-dev approve AP_ID [--reject] resolve an approval

import { route } from '../src/router.mjs';
import { getAgents } from '../src/registry.mjs';
import * as engine from '../src/engine.mjs';
import { getTask, listTasks } from '../src/tasks.mjs';
import { tail } from '../src/audit.mjs';
import { startApi } from '../src/api.mjs';

const [, , cmd, ...args] = process.argv;
const rest = args.join(' ');

function pad(s, n) { s = String(s); return s + ' '.repeat(Math.max(0, n - s.length)); }
function ago(iso) {
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

async function main() {
  switch (cmd) {
    case 'submit': {
      if (!rest) return fail('usage: maculis-dev submit "<request>"');
      const out = engine.submit(rest);
      const t = out.task;
      if (out.deduped) console.log(`↺ ${out.message || 'Linked to existing task'} (${t.task_id})`);
      console.log(`Task:        ${t.task_id}`);
      console.log(`Routed to:   ${agentName(t.selected_agent)}`);
      console.log(`Repository:  ${t.repository || '—'}`);
      console.log(`Type/Risk:   ${t.task_type} / ${t.risk_level}`);
      console.log(`Confidence:  ${t.routing_confidence}`);
      console.log(`Status:      ${t.status}`);
      if (t.cross_domain) console.log(`Cross-domain: primary ${t.primary_owner}, dependency ${t.dependency?.agent_id} (${t.dependency?.repository})`);
      console.log(`Reason:      ${t.routing_reason}`);
      // Execute the queue now so a local `submit` is self-contained.
      const done = await engine.drain();
      if (done.includes(t.task_id)) {
        const f = getTask(t.task_id);
        console.log(`\n→ ${f.status}: ${f.result_summary || ''}`);
      }
      break;
    }
    case 'route': {
      if (!rest) return fail('usage: maculis-dev route "<request>"');
      console.log(JSON.stringify(route(rest), null, 2));
      break;
    }
    case 'agents': {
      for (const a of getAgents()) {
        console.log(`${pad(a.agent_id, 14)} ${pad(a.name, 14)} ${a.repository}`);
        console.log(`${' '.repeat(29)}${a.description}`);
      }
      break;
    }
    case 'status': {
      const id = args[0];
      if (id) {
        const t = getTask(id);
        if (!t) return fail(`No such task ${id}`);
        console.log(`${t.task_id}   ${agentName(t.selected_agent)}   ${t.status}`);
        console.log(`Title:       ${t.title}`);
        console.log(`Repository:  ${t.repository}`);
        console.log(`Branch:      ${t.branch || '—'}`);
        console.log(`Type/Risk:   ${t.task_type} / ${t.risk_level}`);
        if (t.cross_domain) console.log(`Cross-domain: primary ${t.primary_owner} · dependency ${t.dependency?.agent_id} (${t.dependency?.repository})`);
        console.log(`Updated:     ${ago(t.updated_at)}`);
        if (t.commit_sha) console.log(`Commit:      ${t.commit_sha}`);
        if (t.pr?.url) console.log(`PR/branch:   ${t.pr.url}`);
        if (t.result_summary) console.log(`Result:      ${t.result_summary}`);
        console.log(`Acceptance:\n${(t.acceptance_criteria || []).map((c) => '  • ' + c).join('\n')}`);
      } else {
        const list = listTasks();
        if (!list.length) return console.log('No tasks yet. Try: maculis-dev submit "…"');
        for (const t of list) {
          console.log(`${pad(t.task_id, 9)} ${pad(t.selected_agent, 22)} ${pad(t.status, 18)} ${pad(ago(t.updated_at), 9)} ${t.title}`);
        }
      }
      break;
    }
    case 'queue': {
      const q = engine.queueSnapshot();
      if (!q.length) return console.log('Queue empty.');
      q.forEach((t, i) => console.log(`${i + 1}. ${pad(t.task_id, 9)} ${pad(t.priority, 7)} ${pad(t.selected_agent, 16)} ${t.title}`));
      break;
    }
    case 'approvals': {
      const a = engine.listApprovals();
      if (!a.length) return console.log('No pending approvals.');
      a.forEach((x) => console.log(`${pad(x.id, 6)} ${pad(x.task_id, 9)} ${x.reason}`));
      break;
    }
    case 'actions': {
      const a = engine.listHumanActions();
      if (!a.length) return console.log('No open human actions. ✅');
      console.log('ACTION REQUIRED (central queue):');
      a.forEach((x) => console.log(`  [${x.id}] ${x.task_id} — ${x.title || x.kind}${x.why ? ' (' + x.why + ')' : ''}`));
      break;
    }
    case 'approve': {
      const id = args[0];
      if (!id) return fail('usage: maculis-dev approve AP_ID [--reject]');
      const approve = !args.includes('--reject');
      const r = engine.resolveApproval(id, approve);
      if (!r) return fail(`No such approval ${id}`);
      console.log(`${r.id} → ${r.status}`);
      break;
    }
    case 'logs': {
      const id = args[0];
      if (!id) return fail('usage: maculis-dev logs TASK_ID');
      for (const e of tail(100, id)) console.log(`${e.at}  ${pad(e.event, 26)} ${JSON.stringify({ ...e, at: undefined, event: undefined })}`);
      break;
    }
    case 'cancel': {
      const id = args[0];
      if (!id) return fail('usage: maculis-dev cancel TASK_ID');
      const t = engine.cancel(id);
      if (!t) return fail(`No such task ${id}`);
      console.log(`${t.task_id} → ${t.status}`);
      break;
    }
    case 'run': {
      const done = await engine.drain();
      console.log(done.length ? `Processed: ${done.join(', ')}` : 'Nothing runnable.');
      break;
    }
    case 'worker': {
      engine.startWorker();
      console.log('Worker started (heartbeat + stuck-task recovery). Ctrl-C to stop.');
      break;
    }
    case 'disable': {
      const id = args[0];
      if (!id) return fail('usage: maculis-dev disable <agent_id> [reason]');
      engine.disableAgent(id, args.slice(1).join(' ') || 'via CLI');
      console.log(`Agent ${id} disabled (no new write tasks will start).`);
      break;
    }
    case 'enable': {
      const id = args[0];
      if (!id) return fail('usage: maculis-dev enable <agent_id>');
      engine.enableAgent(id);
      console.log(`Agent ${id} enabled.`);
      break;
    }
    case 'serve': {
      startApi();
      engine.startWorker();   // API + async worker in one process (single authoritative worker)
      // Optional one-shot boot self-test (diagnostic, brief §4/§6 online verification).
      // When MACULIS_BOOT_SELFTEST is set, submit exactly one task on startup, run
      // it, and log the outcome (runner mode, status, cost) so an operator can prove
      // the live runner end-to-end from the host log stream. Never blocks serving;
      // errors are caught. Unset the env var after verifying so it does not re-run.
      if (process.env.MACULIS_BOOT_SELFTEST) {
        const request = process.env.MACULIS_BOOT_SELFTEST.length > 3
          ? process.env.MACULIS_BOOT_SELFTEST
          : 'Read-only diagnose (geen wijzigingen) in Testerbeheer: welk bestand bevat de fail-closed consent gate mayContact en op welke consent status staat die? Alleen bestandsnaam en voorwaarde.';
        setImmediate(async () => {
          try {
            console.log('[selftest] submitting boot self-test task…');
            const { task } = engine.submit(request);
            console.log(`[selftest] ${task.task_id} routed=${task.selected_agent} repo=${task.repository} type=${task.task_type}`);
            // The async worker (startWorker) drains it — just poll to terminal.
            const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'WAITING_FOR_HUMAN', 'BLOCKED']);
            let f = getTask(task.task_id);
            for (let i = 0; i < 240 && !terminal.has(f.status); i++) {
              await new Promise((r) => setTimeout(r, 1000));
              f = getTask(task.task_id);
            }
            console.log(`[selftest] RESULT ${f.task_id} status=${f.status} mode=${f.mode || 'n/a'} turns=${f.num_turns || 'n/a'} cost_usd=${f.cost_usd || 'n/a'} commit=${f.commit_sha || 'none'}`);
            console.log(`[selftest] summary: ${(f.result_summary || '').slice(0, 240)}`);
          } catch (e) { console.log('[selftest] error: ' + e.message); }
        });
      }
      break;
    }
    default:
      console.log(`maculis-dev — Maculis Development Orchestrator

  submit "<text>"     route + queue + run a development task
  route  "<text>"     show routing decision only (no task created)
  status [TASK_ID]    list tasks, or show one in detail
  agents              list development domains (Website / First Five / Relationship)
  queue               show queued tasks
  approvals           show pending human approvals
  actions             show the central human-action queue
  approve AP_ID       approve a pending action (--reject to reject)
  logs TASK_ID        audit trail for a task
  cancel TASK_ID      cancel a task
  run                 drain the queue once
  serve               start the authenticated HTTP API`);
  }
}

function agentName(id) {
  const a = getAgents().find((x) => x.agent_id === id);
  return a ? a.name : id;
}
function fail(msg) { console.error(msg); process.exitCode = 1; }

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
