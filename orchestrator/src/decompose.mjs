// Assignment decomposition (Lead Engineering — Autonomous Night Run).
//
// A large engineering assignment handed in from ChatGPT is split into the
// smallest independently-verifiable sub-tasks, each routed to its owning repo and
// sequenced by dependency. This is deterministic and explainable on purpose — the
// same philosophy as the router: split on EXPLICIT structure (numbered/bulleted
// steps, new lines, ordering words), never on a guess. A single instruction stays
// a single task. Ambiguous sub-tasks route to a human review, they are not forced.

import { route } from './router.mjs';
import { maxSubtasks } from './governance.mjs';

// Ordering words that make a sub-task depend on the one before it (across repos).
const ORDER_MARKERS = /^(daarna|vervolgens|tot slot|en tot slot|en vervolgens|ten slotte|als laatste|nadat|zodra|pas als|then|afterwards?|finally|next)\b[\s,:.-]*/i;

function stripBullet(line) {
  return line.replace(/^\s*(\d+[.)]|[-*•·▪])\s+/, '').trim();
}
function hasContent(s) {
  return Boolean(s) && s.length >= 8 && /[a-zA-Z]/.test(s);
}

// Split the raw assignment into candidate step strings using explicit structure.
export function splitSteps(request) {
  const raw = String(request || '').replace(/\r/g, '');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1) Enumerated / bulleted list (strongest, most explicit signal).
  const bulletLines = lines.filter((l) => /^\s*(\d+[.)]|[-*•·▪])\s+/.test(l));
  if (bulletLines.length >= 2) return bulletLines.map(stripBullet).filter(hasContent);

  // 2) Several non-trivial lines — one step per line.
  if (lines.length >= 2) {
    const nontrivial = lines.filter(hasContent);
    if (nontrivial.length >= 2) return nontrivial;
  }

  // 3) One blob: split on semicolons or before an ordering word, if present.
  const one = lines.join(' ');
  const parts = one
    .split(/\s*;\s*|\s+(?=(?:daarna|vervolgens|tot slot|en tot slot|en vervolgens|ten slotte|then|afterwards?|finally|next)\b)/i)
    .map((s) => s.trim())
    .filter(hasContent);
  if (parts.length >= 2) return parts;

  return [one.trim()].filter(hasContent);
}

// Decompose + route + compute inter-step dependencies (by step index).
export function decompose(request, { max = maxSubtasks() } = {}) {
  let steps = splitSteps(request);
  const truncated = steps.length > max;
  steps = steps.slice(0, max);

  const enriched = steps.map((text, index) => {
    const ordered = ORDER_MARKERS.test(text);
    const clean = text.replace(ORDER_MARKERS, '').trim() || text;
    const routing = route(clean);
    return {
      index,
      text: clean,
      ordered,
      selected_agent: routing.selected_agent,
      repository: routing.repository,
      task_type: routing.task_type,
      risk_level: routing.risk_level,
      routing,
    };
  });

  // Dependencies (brief: same repo → sequential; ordering word → depend on the
  // immediately preceding step across repos; otherwise independent → parallel).
  for (const s of enriched) {
    s.depends_on_index = [];
    if (s.index === 0) continue;
    if (s.ordered) { s.depends_on_index = [s.index - 1]; continue; }
    for (let j = s.index - 1; j >= 0; j--) {
      if (enriched[j].repository && enriched[j].repository === s.repository) {
        s.depends_on_index = [j];
        break;
      }
    }
  }

  return {
    is_epic: enriched.length >= 2,
    count: enriched.length,
    truncated,
    repositories: [...new Set(enriched.map((s) => s.repository).filter(Boolean))],
    needs_routing_review: enriched.some((s) => s.selected_agent === 'NEEDS_ROUTING_REVIEW'),
    steps: enriched,
  };
}
