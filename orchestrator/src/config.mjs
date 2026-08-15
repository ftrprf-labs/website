// Central configuration for the Maculis Development Orchestrator.
//
// Everything configurable lives here so the rest of the code never reads
// process.env directly. Values come from the environment with safe defaults so
// the orchestrator runs out-of-the-box locally with zero setup, yet can be
// hardened for a shared worker by setting a handful of env vars.

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const SRC_DIR = dirname(__filename);
export const ORCH_ROOT = resolve(SRC_DIR, '..');        // orchestrator/
export const REPO_ROOT = resolve(ORCH_ROOT, '..');      // the website repo root

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

export const config = {
  // Where the JSON store + audit log live. On a persistent worker point this at
  // a durable disk (same pattern as the product's DATA_DIR on Render).
  dataDir: resolve(env('MACULIS_DATA_DIR', join(ORCH_ROOT, 'data'))),

  // Task ids are MAC-<n>. Counter starts here (first task = MAC-101).
  taskIdSeed: 100,
  taskIdPrefix: 'MAC',

  // API server.
  api: {
    host: env('MACULIS_API_HOST', '127.0.0.1'),
    port: Number(env('MACULIS_API_PORT', '4610')),
    // Bearer token required on every mutating endpoint. If unset, the API binds
    // loopback-only and refuses to start on a non-loopback host (fail-closed,
    // same discipline as the product server).
    token: env('MACULIS_API_TOKEN', ''),
    // Simple fixed-window rate limit per token/ip.
    rateLimit: { windowMs: 60_000, max: Number(env('MACULIS_API_RATE', '120')) },
    // Optional webhook the orchestrator POSTs task lifecycle events to.
    webhookUrl: env('MACULIS_WEBHOOK_URL', ''),
    webhookSecret: env('MACULIS_WEBHOOK_SECRET', ''),
  },

  // Runner. 'mock' produces a deterministic structured result without invoking
  // Claude Code — used for tests, the router demo, and any repo we should not
  // touch. 'real' shells out to the installed `claude` CLI in headless mode.
  runner: {
    mode: env('MACULIS_RUNNER', 'mock'),           // 'mock' | 'real'
    claudeBin: env('MACULIS_CLAUDE_BIN', 'claude'),
    maxTurns: Number(env('MACULIS_MAX_TURNS', '40')),
    timeoutMs: Number(env('MACULIS_TIMEOUT_MS', String(30 * 60_000))), // 30 min
    heartbeatMs: Number(env('MACULIS_HEARTBEAT_MS', String(5 * 60_000))),
    maxRetries: Number(env('MACULIS_MAX_RETRIES', '2')),
    // Local checkout roots per repo, for the 'real' runner. When a repo has no
    // local checkout the runner stays in mock mode for that task.
    checkouts: {
      'ftrprf-labs/website': REPO_ROOT,
      // Add local clones here to enable real runs for the other domains:
      // 'ftrprf-labs/maculis-first-five.': '/path/to/maculis-first-five',
      // 'ftrprf-labs/groeiplatform-website': '/path/to/groeiplatform-website',
    },
  },

  // Concurrency: how many write tasks may run at once (per repo it is always 1;
  // this bounds the whole pool).
  maxConcurrentAgents: Number(env('MACULIS_MAX_AGENTS', '3')),

  // Session freshness thresholds (see sessions.mjs).
  session: {
    maxAgeMs: Number(env('MACULIS_SESSION_MAX_AGE_MS', String(6 * 60 * 60_000))), // 6h
    maxTasks: Number(env('MACULIS_SESSION_MAX_TASKS', '8')),
  },

  // Routing confidence below which a task is flagged NEEDS_ROUTING_REVIEW.
  routingMinConfidence: Number(env('MACULIS_ROUTING_MIN_CONFIDENCE', '0.34')),
};

export function isLoopback(host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}
