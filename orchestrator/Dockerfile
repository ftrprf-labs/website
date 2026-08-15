# Maculis Development Orchestrator — always-on service (brief §21, §72).
#
# Runs the authenticated HTTP API + async worker in one process. Zero runtime
# npm dependencies, so the image is small and the build is trivial. `git` is
# included for the workspace manager; the Claude Code CLI is installed for the
# REAL runner (headless). In mock mode neither the CLI nor a git token is needed.
FROM node:22-slim

# git for the workspace manager; ca-certificates for HTTPS.
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Claude Code CLI for the real headless runner (optional at runtime; MACULIS_RUNNER=mock ignores it).
RUN npm install -g @anthropic-ai/claude-code || true

WORKDIR /app
COPY . /app/orchestrator
WORKDIR /app/orchestrator

# Persistent task state lives on a mounted disk in production (see render.yaml).
ENV MACULIS_DATA_DIR=/var/data \
    MACULIS_WORKSPACE_ROOT=/var/workspaces \
    MACULIS_API_HOST=0.0.0.0 \
    MACULIS_API_PORT=4610 \
    MACULIS_RUNNER=mock

EXPOSE 4610
# API + worker in one authoritative process.
CMD ["node", "bin/maculis-dev.mjs", "serve"]
