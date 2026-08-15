// Communication Layer — AI Relationship Copilot.
//
// NOT an "email -> reply" feature: given a new inbound Interaction, it assembles minimal
// RELATIONSHIP context (who is this person, which organization, what happened recently) and
// produces a summary, an intent/signal, a suggested reply and prepared suggested_actions[]. It is
// a HUMAN-IN-THE-LOOP draft only — it never sends. It runs AFTER the message is safely persisted
// and NEVER blocks receipt: any failure is recorded on the ai_draft, the message stays intact.
// privacy@ is excluded entirely in V1 (no automatic AI analysis of privacy communication).

import { query } from '../db.mjs';
import { getProvider } from './provider.mjs';
import { recordActivity } from '../activity.mjs';

// Extensible intent vocabulary. Unknown labels from the model fall back to 'information'.
export const INTENTS = ['question', 'interest', 'meeting', 'commercial_opportunity', 'objection', 'information', 'action_requested', 'no_action'];

const SYSTEM = [
  'Je bent de Relationship Copilot van Maculis. Maculis kijkt met andere ogen naar wat er van',
  'buitenaf zichtbaar is op de website van een organisatie. Je stelt een BEKNOPT concept op voor een',
  'medewerker die het antwoord zelf controleert en verstuurt. Toon: rustig, persoonlijk, oprecht,',
  'nooit verkoperig, nooit overdreven. Verzin geen feiten over de relatie. Antwoord UITSLUITEND met',
  'geldige JSON: {"summary": string, "intent": string, "suggested_reply": string, "suggested_actions": array}.',
].join(' ');

// Assemble a compact relationship context (§31 — never dump the whole history).
async function buildContext(conversationId, messageId) {
  const conv = (await query(
    `select c.id, c.subject, c.is_privacy, ct.first_name, ct.last_name, ct.email, o.name as org
       from conversation c
       left join contact ct on ct.id = c.contact_id
       left join organization o on o.id = c.organization_id
      where c.id = $1`, [conversationId])).rows[0];
  const recent = (await query(
    `select direction, from_address, body_text, created_at from message
      where conversation_id=$1 order by created_at desc limit 6`, [conversationId])).rows.reverse();
  const current = (await query('select body_text from message where id=$1', [messageId])).rows[0];
  return { conv, recent, currentText: current ? current.body_text : '' };
}

function buildPrompt(ctx) {
  const who = [ctx.conv?.first_name, ctx.conv?.last_name].filter(Boolean).join(' ') || ctx.conv?.email || 'onbekend';
  const org = ctx.conv?.org || 'onbekende organisatie';
  const history = ctx.recent.map((m) => `${m.direction === 'INBOUND' ? 'ZIJ' : 'MACULIS'}: ${(m.body_text || '').slice(0, 500)}`).join('\n');
  return [
    `CONTACT: ${who}`, `ORGANISATIE: ${org}`,
    `RECENTE COMMUNICATIE:\n${history || '(geen eerdere berichten)'}`,
    `LAATSTE BERICHT:\n${(ctx.currentText || '').slice(0, 2000)}`,
    'Geef summary, intent (kies uit: ' + INTENTS.join(', ') + '), suggested_reply en suggested_actions.',
  ].join('\n\n');
}

function parseModel(text) {
  try {
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const intent = INTENTS.includes(json.intent) ? json.intent : 'information';
    return {
      summary: String(json.summary || '').slice(0, 1000),
      intent,
      suggested_reply: String(json.suggested_reply || '').slice(0, 4000),
      suggested_actions: Array.isArray(json.suggested_actions) ? json.suggested_actions.slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

// Produce and store an AI draft for a freshly-received message. Returns the draft row id, or a
// stored error draft. Skips privacy conversations. NEVER throws to the caller.
export async function runCopilot({ conversationId, messageId }) {
  try {
    const conv = (await query('select tenant_id, is_privacy from conversation where id=$1', [conversationId])).rows[0];
    if (!conv) return { ok: false, reason: 'no_conversation' };
    if (conv.is_privacy) return { ok: false, reason: 'privacy_excluded' };   // §33 — never auto-AI privacy

    const ctx = await buildContext(conversationId, messageId);
    const provider = getProvider();
    let parsed = null; let error = null;
    try {
      const raw = await provider.generate({ system: SYSTEM, prompt: buildPrompt(ctx) });
      parsed = parseModel(raw);
      if (!parsed) error = 'unparseable_model_output';
    } catch (e) {
      error = String(e.message || e);
    }

    const ins = await query(
      `insert into ai_draft(tenant_id, conversation_id, message_id, summary, intent, suggested_reply,
          suggested_actions, model, status, error)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) returning id`,
      [conv.tenant_id, conversationId, messageId,
       parsed?.summary || null, parsed?.intent || null, parsed?.suggested_reply || null,
       JSON.stringify(parsed?.suggested_actions || []), provider.name,
       error ? 'error' : 'proposed', error]);

    if (!error) {
      await recordActivity({ tenantId: conv.tenant_id, type: 'ai_draft_created', channel: 'EMAIL',
        conversationId, meta: { intent: parsed.intent, draftId: ins.rows[0].id } });
    }
    return { ok: !error, draftId: ins.rows[0].id, intent: parsed?.intent, error };
  } catch (e) {
    // Absolute guarantee: AI never breaks the pipeline.
    return { ok: false, reason: 'copilot_failed', error: String(e.message || e) };
  }
}
