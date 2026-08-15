// Shared test setup: isolate each test file in a fresh temp data dir and keep the
// runner in mock mode with no local checkouts (hermetic — no network/git).
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { config } from '../src/config.mjs';
import { _resetForTests } from '../src/store.mjs';

export function freshStore() {
  const dir = mkdtempSync(join(tmpdir(), 'mac-orch-'));
  _resetForTests(dir);
  config.runner.mode = 'mock';
  config.runner.checkouts = {}; // no git/network in tests
  return dir;
}
