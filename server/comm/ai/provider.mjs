// Communication Layer — AI provider abstraction.
//
// A tiny interface so the copilot never depends on a specific vendor. Two implementations:
//   - 'mock'      : deterministic, offline. Default when no key is set — the whole pipeline is
//                   testable without any external call or credential.
//   - 'anthropic' : Claude Messages API (api.anthropic.com), key from env only.
// generate() returns raw model text; the copilot is responsible for parsing/validation. AI output
// is treated as UNTRUSTED (sanitised before display, never auto-sent).

import { config } from '../../config.mjs';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function getProvider() {
  if (config.aiProvider === 'anthropic' && config.aiApiKey) return anthropicProvider();
  return mockProvider();
}

export function aiAvailable() {
  return config.aiProvider === 'anthropic' && Boolean(config.aiApiKey);
}

function anthropicProvider() {
  return {
    name: 'anthropic',
    // maxTokens is a CEILING, not a target. Claude Sonnet 5 uses adaptive thinking that also consumes
    // the output budget; 700 truncated the longer Gesprekken drafts. 1200 is a conservative headroom
    // for this short use case (a concept plus its thinking) without inviting longer answers — length is
    // steered by the prompt/output contract, not by this cap.
    async generate({ system, prompt, maxTokens = 1200, fetchImpl = fetch }) {
      const res = await fetchImpl(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.aiApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.aiModel,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`anthropic_${res.status}`);
      const body = await res.json();
      return (body.content || []).map((c) => c.text || '').join('').trim();
    },
  };
}

// Deterministic offline stand-in. Produces valid, useful-looking JSON so the human-in-the-loop
// flow and storage are fully exercised; clearly marked model name so drafts are never mistaken
// for real AI output in analysis.
function mockProvider() {
  return {
    name: 'mock',
    async generate({ prompt }) {
      const text = (prompt.match(/LAATSTE BERICHT:\n([\s\S]*?)(\n\n|$)/) || [])[1] || '';
      const lc = text.toLowerCase();
      const asksMore = /(kijken|arbeidsmarkt|ook naar|kun(nen)? jullie|mogelijk)/.test(lc);
      const isQuestion = text.includes('?') || /\b(kan|kun|hoe|wat|wanneer|waarom)\b/.test(lc);
      const intent = asksMore ? 'commercial_opportunity' : isQuestion ? 'question' : 'information';
      const summary = text ? `De afzender ${asksMore ? 'vraagt of Maculis ook naar een ander onderdeel kan kijken' : isQuestion ? 'stelt een vraag' : 'deelt informatie'}.` : 'Kort bericht zonder duidelijke vraag.';
      const reply = `Dank je voor je bericht.${asksMore ? ' Ja, daar kunnen we zeker met dezelfde blik naar kijken — ik denk even mee over een goede volgende stap.' : ' Ik pak dit op en kom er bij je op terug.'}`;
      const actions = asksMore
        ? [{ type: 'mark_commercial_opportunity' }, { type: 'propose_next_lens' }, { type: 'follow_up_task', in_days: 3 }]
        : [{ type: 'follow_up_task', in_days: 7 }];
      return JSON.stringify({ summary, intent, suggested_reply: reply, suggested_actions: actions });
    },
  };
}
