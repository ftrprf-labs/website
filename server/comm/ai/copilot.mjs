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
import { constitutionText } from './constitution.mjs';
import { recordActivity } from '../activity.mjs';
import { buildRelationshipContext, renderContextForModel } from './context.mjs';
import { stripForContext } from '../signature.mjs';

// Extensible intent vocabulary. Unknown labels from the model fall back to 'information'.
export const INTENTS = ['question', 'interest', 'meeting', 'commercial_opportunity', 'objection', 'information', 'action_requested', 'no_action'];

// Shared Maculis DNA (the Constitution) + this capability's output contract. No separate tone copy.
const SYSTEM = [
  constitutionText(),
  '',
  'Je stelt een BEKNOPT concept op voor een medewerker die het antwoord zelf controleert en verstuurt.',
  'Antwoord UITSLUITEND met geldige JSON: {"summary": string, "intent": string, "suggested_reply": string, "suggested_actions": array}.',
].join('\n');

// Build the prompt from the bounded Relationship Context Engine so the AUTOMATIC proposal is
// genuinely relationship-aware: recent conversation, earlier communication, First Five status,
// open follow-ups and CONFIRMED Relationship Memory — never a database dump, never privacy@ (§31,
// PRIVACY EN AI). The channel is metadata; the same assembly serves e-mail/WhatsApp/SMS inbound.
function buildPrompt(ctx, currentText) {
  return [
    renderContextForModel(ctx),
    `LAATSTE BERICHT:\n${(currentText || '').slice(0, 2000)}`,
    'Geef summary (feitelijke kern van wat de afzender schrijft), intent (kies uit: ' + INTENTS.join(', ') + '), ' +
    'suggested_reply (concept, mens controleert) en suggested_actions. Presenteer onzekerheid niet als feit.',
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

    const ctx = await buildRelationshipContext(conv.tenant_id, { conversationId });
    const current = (await query('select body_text from message where id=$1', [messageId])).rows[0];
    const currentText = stripForContext(current ? current.body_text : '');
    const provider = getProvider();
    let parsed = null; let error = null;
    try {
      const raw = await provider.generate({ system: SYSTEM, prompt: buildPrompt(ctx, currentText) });
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

    // Proactively PROPOSE relationship-memory items (agreements/preferences/reminders) from this
    // message. Stored as source='ai', confidence='proposed' — never a hard fact until a human
    // confirms (§RELATIONSHIP MEMORY). Best-effort; dynamic import avoids a circular dependency.
    try {
      const { extractMemory } = await import('./service.mjs');
      const { addMemory, listMemory } = await import('../memory.mjs');
      const who = (await query('select contact_id, organization_id from conversation where id=$1', [conversationId])).rows[0] || {};
      if (who.contact_id) {
        const { memory } = await extractMemory({ tenantId: conv.tenant_id, conversationId });
        const existing = new Set((await listMemory(conv.tenant_id, { contactId: who.contact_id })).map((m) => m.content));
        for (const m of (memory || [])) {
          if (existing.has(m.content)) continue;
          await addMemory(conv.tenant_id, { contactId: who.contact_id, organizationId: who.organization_id, conversationId, kind: m.kind, content: m.content, source: 'ai', sourceRef: { type: 'message', id: messageId } });
        }
      }
    } catch { /* memory proposal is best-effort — never breaks receipt */ }

    return { ok: !error, draftId: ins.rows[0].id, intent: parsed?.intent, error };
  } catch (e) {
    // Absolute guarantee: AI never breaks the pipeline.
    return { ok: false, reason: 'copilot_failed', error: String(e.message || e) };
  }
}
