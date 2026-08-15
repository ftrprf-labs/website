// Webhook / callback dispatch (brief §45). Fire-and-forget POST of lifecycle
// events (task.completed / task.failed / task.human_required / approval.required)
// so downstream clients (e.g. a future ChatGPT bridge) do not have to poll.
//
// Signed with an HMAC over the body when a secret is configured, so the receiver
// can verify authenticity. Best-effort: a webhook failure never blocks a task.

import { createHmac } from 'node:crypto';
import { config } from './config.mjs';

// Only non-sensitive task fields go over the wire.
function publicView(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const allow = ['task_id', 'id', 'status', 'selected_agent', 'repository', 'task_type',
    'risk_level', 'title', 'branch', 'commit_sha', 'pr', 'deploy_url', 'result_summary',
    'human_action_required', 'reason', 'kind', 'created_at', 'updated_at'];
  const out = {};
  for (const k of allow) if (payload[k] !== undefined) out[k] = payload[k];
  return out;
}

export function dispatchWebhook(event, payload) {
  const url = config.api.webhookUrl;
  if (!url) return; // disabled
  const body = JSON.stringify({ event, at: new Date().toISOString(), data: publicView(payload) });
  const headers = { 'content-type': 'application/json', 'x-maculis-event': event };
  if (config.api.webhookSecret) {
    headers['x-maculis-signature'] = 'sha256=' + createHmac('sha256', config.api.webhookSecret).update(body).digest('hex');
  }
  // Node 18+ global fetch; swallow all errors (best-effort).
  try {
    fetch(url, { method: 'POST', headers, body }).catch(() => {});
  } catch { /* ignore */ }
}
