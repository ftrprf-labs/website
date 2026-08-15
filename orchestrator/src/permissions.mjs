// Permission architecture (brief §17–§19).
//
// Two layers work together:
//
//   1. PROFILES — a named set of Claude Code permission rules (allow/ask/deny)
//      that is written into a --settings file and handed to the headless agent.
//      This is what removes the endless "Allow?" prompts for normal engineering
//      while keeping Claude Code's own safety checks on.
//
//   2. BROKER — an orchestrator-side classifier that inspects a requested action
//      BEFORE it is ever dispatched and decides allow / ask-human / deny. This is
//      the hard backstop: even if a profile were misconfigured, the broker denies
//      force-pushing main, reading secret VALUES, destructive DB commands, etc.
//
// This is NOT "YOLO mode": nothing here disables security. Normal development is
// autonomous; risky and irreversible actions are explicitly routed to a human.

// ---- Profiles -------------------------------------------------------------
// Each profile compiles to Claude Code `permissions` settings. Tool-rule syntax
// follows Claude Code: "Bash(git status:*)", "Edit", "Read", etc.

const READ_AND_BUILD = [
  'Read', 'Grep', 'Glob', 'Edit', 'MultiEdit', 'Write', 'NotebookEdit',
  'Bash(npm run lint:*)', 'Bash(npm test:*)', 'Bash(npm run test:*)',
  'Bash(npm run typecheck:*)', 'Bash(npm run build:*)', 'Bash(npm ci:*)', 'Bash(npm install:*)',
  'Bash(node --test:*)', 'Bash(node --test)', 'Bash(pnpm *:*)', 'Bash(yarn *:*)',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git fetch:*)',
  'Bash(git show:*)', 'Bash(git branch:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(rg:*)',
];

const DELIVERY_EXTRA = [
  'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git checkout -b:*)', 'Bash(git switch:*)',
  'Bash(git push -u origin:*)', 'Bash(git push origin:*)',
];

// Rules that are NEVER auto-allowed — encoded as Claude Code `deny` entries so the
// headless agent is blocked at its own layer too, in addition to the broker.
const HARD_DENY_RULES = [
  'Bash(git push --force:*)', 'Bash(git push -f:*)', 'Bash(git push --force-with-lease:*)',
  'Bash(git push * main*)', 'Bash(git push * master*)',
  'Bash(git reset --hard origin/main:*)', 'Bash(git filter-branch:*)', 'Bash(git rebase:*)',
  'Bash(rm -rf:*)', 'Bash(dropdb:*)', 'Bash(psql * DROP*)', 'Bash(* DROP DATABASE*)',
  'Bash(cat .env)', 'Bash(cat *.env)', 'Bash(printenv:*)', 'Bash(env)',
  'Read(./.env)', 'Read(./.env.*)', 'Read(**/.env)', 'Read(**/secrets*)',
  'Bash(vercel * --prod:*)', 'Bash(render deploy:*)',
];

export const PROFILES = {
  'normal-engineering': {
    name: 'normal-engineering',
    description: 'Autonomous normal development: read, edit, test, lint, typecheck, build, safe git reads.',
    settings: {
      permissions: {
        allow: READ_AND_BUILD,
        ask: ['Bash(git push:*)', 'WebFetch'],
        deny: HARD_DENY_RULES,
      },
    },
    permissionMode: 'acceptEdits',
  },
  delivery: {
    name: 'delivery',
    description: 'Adds commit + push to a TASK branch + PR/CI on top of normal engineering.',
    settings: {
      permissions: {
        allow: [...READ_AND_BUILD, ...DELIVERY_EXTRA],
        ask: [],
        deny: HARD_DENY_RULES,
      },
    },
    permissionMode: 'acceptEdits',
  },
  production: {
    name: 'production',
    description: 'Strict. Production deploy only per explicit policy; everything risky asks a human.',
    settings: {
      permissions: {
        allow: READ_AND_BUILD,
        ask: [...DELIVERY_EXTRA, 'Bash(git merge:*)'],
        deny: HARD_DENY_RULES,
      },
    },
    permissionMode: 'default',
  },
};

export function getProfile(name) {
  return PROFILES[name] || PROFILES['normal-engineering'];
}

// The Claude Code --settings payload for a profile (JSON string ready for the CLI).
export function settingsJsonFor(profileName) {
  return JSON.stringify(getProfile(profileName).settings);
}

// ---- Broker (action classifier) ------------------------------------------
// Categories: 'allow' (auto), 'human' (needs approval), 'deny' (never).

const NEVER = [
  { re: /\bgit\s+push\b.*(--force|-f|--force-with-lease)/i, why: 'force push' },
  { re: /\bgit\s+push\b.*\b(main|master)\b/i, why: 'push to protected main/master' },
  { re: /\bgit\s+(filter-branch|reset\s+--hard\s+origin\/(main|master))/i, why: 'history rewrite on main' },
  { re: /\bdrop\s+database\b/i, why: 'DROP DATABASE' },
  { re: /\bdelete\b.*\bproduction\b.*\bdata\b/i, why: 'delete production data' },
  { re: /\btruncate\b.*\b(users|contacts|invitations|messages)\b/i, why: 'truncate production table' },
  { re: /\b(cat|less|print(env)?|echo)\b.*\.env\b/i, why: 'read secret values from .env' },
  { re: /\bprintenv\b|\benv\b\s*$/i, why: 'dump environment (secret values)' },
  { re: /\bdisable\b.*\b(security|auth|csp|firewall)\b/i, why: 'disable a security control' },
];

const HUMAN = [
  { re: /\b(create|add|rotate)\b.*\b(secret|credential|api\s*key|token)\b/i, why: 'secret/credential change' },
  { re: /\b(dns|nameserver|cname|a\s+record)\b/i, why: 'DNS change' },
  { re: /\b(billing|payment|invoice|subscription)\b/i, why: 'billing change' },
  { re: /\bmeta\s+business\b|\bwhatsapp\s+business\s+api\b/i, why: 'Meta / WhatsApp Business verification' },
  { re: /\b(buy|purchase|aanschaf)\b.*\b(number|nummer|domain|domein)\b/i, why: 'purchase external resource' },
  { re: /\bprovider\s+account\b|\baccount\s+creation\b/i, why: 'external provider account' },
  { re: /\b(migrat(e|ion)|alter\s+table|schema\s+change)\b/i, why: 'database migration' },
  { re: /\bdeploy\b.*\b(prod|production)\b/i, why: 'production deploy' },
];

// Classify a proposed shell/tool action. `text` is the command or a description.
export function classifyAction(text) {
  const t = String(text || '');
  for (const rule of NEVER) if (rule.re.test(t)) return { decision: 'deny', reason: rule.why };
  for (const rule of HUMAN) if (rule.re.test(t)) return { decision: 'human', reason: rule.why };
  return { decision: 'allow', reason: 'normal engineering action' };
}

// Convenience booleans used by tests / callers.
export function isAutoAllowed(text) { return classifyAction(text).decision === 'allow'; }
export function isDenied(text) { return classifyAction(text).decision === 'deny'; }
export function needsHuman(text) { return classifyAction(text).decision === 'human'; }
