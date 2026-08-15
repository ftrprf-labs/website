#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Installs the declared npm dependencies (pg, xlsx) so the test suite runs
# immediately in a fresh cloned container. Without this, `npm test` fails with
# ERR_MODULE_NOT_FOUND until dependencies are installed by hand.
# Idempotent and non-interactive. Web sessions only.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# `npm install` (not `npm ci`) so the cached container layer is reused across
# resumes; safe to run repeatedly.
npm install --no-audit --no-fund
