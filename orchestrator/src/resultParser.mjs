// Result parser (brief §29).
//
// Turns raw agent output (the JSON envelope from `claude -p --output-format json`,
// or the mock runner's structured object) into a normalised result the acceptance
// checker and storage understand. Raw output is kept (bounded) for debugging.

// Normalise to:
// { status, summary, root_cause, files_changed[], tests[], commit, pr,
//   deployment, live_verification, human_actions[], warnings[], session_id, raw }
export function parseResult(runOutput) {
  // The mock runner already returns a normalised object under `.result`.
  if (runOutput && runOutput.result && typeof runOutput.result === 'object') {
    return { ...normalise(runOutput.result), session_id: runOutput.session_id || null, raw: clip(runOutput.raw) };
  }

  // Real `claude -p --output-format json` envelope: { result: "<text>", session_id, is_error, ... }
  const env = runOutput || {};
  const text = typeof env.result === 'string' ? env.result : JSON.stringify(env);
  const extracted = extractStructured(text);
  const normalised = normalise({
    status: env.is_error ? 'failed' : (extracted.status || 'done'),
    summary: extracted.summary || firstLine(text),
    root_cause: extracted.root_cause || null,
    files_changed: extracted.files_changed || [],
    tests: extracted.tests || [],
    commit: extracted.commit || null,
    pr: extracted.pr || null,
    deployment: extracted.deployment || null,
    live_verification: extracted.live_verification || null,
    human_actions: extracted.human_actions || [],
    warnings: extracted.warnings || [],
  });
  return { ...normalised, session_id: env.session_id || null, raw: clip(text) };
}

// If the agent emitted a ```json fenced block or an inline {…} we trust that; a
// summary requested in the prompt makes this reliable. Falls back to empty.
function extractStructured(text) {
  const fence = /```json\s*([\s\S]*?)```/i.exec(text);
  const candidate = fence ? fence[1] : sliceBraces(text);
  if (!candidate) return {};
  try { return JSON.parse(candidate); } catch { return {}; }
}

function sliceBraces(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : null;
}

function normalise(r) {
  return {
    status: r.status || 'done',
    summary: r.summary || '',
    root_cause: r.root_cause || null,
    files_changed: Array.isArray(r.files_changed) ? r.files_changed : [],
    tests: Array.isArray(r.tests) ? r.tests.map((t) => ({ name: String(t.name || t).toLowerCase(), passed: t.passed !== false })) : [],
    commit: r.commit || null,
    pr: r.pr || null,
    deployment: r.deployment || null,
    live_verification: r.live_verification || null,
    human_actions: Array.isArray(r.human_actions) ? r.human_actions : [],
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
  };
}

function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 200); }
function clip(s, n = 20000) { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…[clipped]' : t; }
