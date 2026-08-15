// Communication Layer — editable communication drafts (§AI DRAFT STATE, §CONVERSATIONAL COMPOSER).
//
// The AI and the human edit the SAME draft. Two ways of working share one draft state:
//   A. DIRECT EDIT  — humanEdit() writes the body the person typed.
//   B. AI CHAT      — chat()/aiRevise() asks Maculis in natural language to change the SAME draft.
// Every change is versioned (comm_draft_version). A new AI revision ALWAYS rebases on the CURRENT
// body, so a human edit is never silently overwritten (§HARD RULE). Nothing is ever auto-sent.

import { query, withTransaction } from './db.mjs';
import * as ai from './ai/service.mjs';

async function loadDraft(draftId) {
  return (await query('select * from comm_draft where id=$1', [draftId])).rows[0] || null;
}

async function appendVersion(client, draft, { body, subject, author, instruction, channel }) {
  const version = draft.version + 1;
  await client.query(
    `insert into comm_draft_version(draft_id, version, channel, subject, body, author, instruction)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [draft.id, version, channel || draft.channel, subject ?? draft.subject, body, author, instruction || null]);
  return version;
}

export async function getDraftState(draftId) {
  const draft = await loadDraft(draftId);
  if (!draft) return null;
  const versions = (await query('select version, author, instruction, created_at from comm_draft_version where draft_id=$1 order by version', [draftId])).rows;
  const chat = (await query('select role, content, produced_version, meta, created_at from draft_chat_message where draft_id=$1 order by created_at', [draftId])).rows;
  return { draft, versions, chat };
}

// Open (or reuse) the working draft for a conversation. Seeds the body from the existing AI copilot
// proposal if present, else asks the AI service for a channel-aware draft. If AI is unavailable the
// draft opens EMPTY and the human writes it — communication never depends on AI (§FALLBACK).
export async function openDraft({ tenantId, conversationId, channel, userId = null }) {
  const conv = (await query('select id, tenant_id, channel, contact_id, organization_id, is_privacy from conversation where id=$1 and tenant_id=$2', [conversationId, tenantId])).rows[0];
  if (!conv) return { ok: false, reason: 'conversation_not_found' };
  const ch = channel || conv.channel || 'EMAIL';

  const existing = (await query("select id from comm_draft where conversation_id=$1 and status='draft' order by created_at desc limit 1", [conversationId])).rows[0];
  if (existing) return { ok: true, ...(await getDraftState(existing.id)) };

  // Seed: reuse the copilot proposal if it exists (privacy conversations have none), else AI draft.
  let seedBody = '';
  let refs = [];
  let aiGenerated = false;
  if (!conv.is_privacy) {
    const proposal = (await query("select suggested_reply from ai_draft where conversation_id=$1 and status='proposed' order by created_at desc limit 1", [conversationId])).rows[0];
    if (proposal && proposal.suggested_reply) { seedBody = proposal.suggested_reply; aiGenerated = true; }
    else {
      const d = await ai.draftReply({ tenantId, conversationId, channel: ch });
      if (d.ok && d.body) { seedBody = d.body; refs = d.refs || []; aiGenerated = true; }
    }
  }

  const draftId = await withTransaction(async (client) => {
    const ins = await client.query(
      `insert into comm_draft(tenant_id, conversation_id, contact_id, organization_id, channel, body, ai_generated, ai_model, context_refs, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10) returning id`,
      [tenantId, conversationId, conv.contact_id, conv.organization_id, ch, seedBody, aiGenerated, ai.available() ? 'anthropic' : 'mock', JSON.stringify(refs), userId]);
    const id = ins.rows[0].id;
    await client.query(`insert into comm_draft_version(draft_id, version, channel, body, author) values ($1,1,$2,$3,$4)`,
      [id, ch, seedBody, aiGenerated ? 'ai' : 'seed']);
    return id;
  });
  return { ok: true, ...(await getDraftState(draftId)) };
}

// DIRECT EDIT — the human typed/changed the body. Marks human_edited so later AI actions rebase.
export async function humanEdit({ draftId, body, subject, channel, userId = null }) {
  const draft = await loadDraft(draftId);
  if (!draft) return { ok: false, reason: 'not_found' };
  if (draft.status !== 'draft') return { ok: false, reason: 'not_editable' };
  await withTransaction(async (client) => {
    const version = await appendVersion(client, draft, { body, subject, channel, author: 'human' });
    await client.query(
      `update comm_draft set body=$2, subject=coalesce($3,subject), channel=coalesce($4,channel),
         human_edited=true, ai_generated=false, version=$5, updated_at=now() where id=$1`,
      [draftId, body, subject ?? null, channel ?? null, version]);
  });
  return { ok: true, ...(await getDraftState(draftId)) };
}

// AI REVISE — rebases on the CURRENT body (which may hold human edits) and applies the instruction.
export async function aiRevise({ draftId, instruction, tenantId, userId = null }) {
  const draft = await loadDraft(draftId);
  if (!draft) return { ok: false, reason: 'not_found' };
  if (draft.status !== 'draft') return { ok: false, reason: 'not_editable' };
  const res = await ai.reviseDraft({ currentBody: draft.body, subject: draft.subject, instruction, channel: draft.channel, tenantId, conversationId: draft.conversation_id });
  if (!res.ok) return { ok: false, reason: res.reason || 'revise_failed' };
  const newState = await withTransaction(async (client) => {
    const version = await appendVersion(client, draft, { body: res.body, subject: res.subject, author: 'ai', instruction });
    await client.query(
      `update comm_draft set body=$2, ai_generated=true, version=$3, updated_at=now() where id=$1`,
      [draftId, res.body, version]);
    // Record the conversational exchange so the composer shows the chat history.
    await client.query(`insert into draft_chat_message(draft_id, role, content) values ($1,'user',$2)`, [draftId, instruction]);
    await client.query(`insert into draft_chat_message(draft_id, role, content, produced_version, meta) values ($1,'assistant',$2,$3,$4::jsonb)`,
      [draftId, res.variants && res.variants.length > 1 ? 'Ik heb twee varianten gemaakt.' : 'Ik heb het concept aangepast.', version, JSON.stringify(res.variants ? { variants: res.variants } : {})]);
    return version;
  });
  return { ok: true, producedVersion: newState, ...(await getDraftState(draftId)) };
}

// The conversational entry point. A QUESTION ("waarom stel je dit voor?") is answered without
// touching the draft; anything else is treated as a revise instruction.
export async function chat({ draftId, message, tenantId, userId = null }) {
  const draft = await loadDraft(draftId);
  if (!draft) return { ok: false, reason: 'not_found' };
  const isQuestion = /\?\s*$/.test(message) || /^(waarom|wat|hoe|welke|wanneer|kun je uitleggen)\b/i.test(message.trim());
  if (isQuestion) {
    const ex = await ai.explain({ tenantId, conversationId: draft.conversation_id, question: message });
    await withTransaction(async (client) => {
      await client.query(`insert into draft_chat_message(draft_id, role, content) values ($1,'user',$2)`, [draftId, message]);
      await client.query(`insert into draft_chat_message(draft_id, role, content, meta) values ($1,'assistant',$2,$3::jsonb)`, [draftId, ex.answer, JSON.stringify({ refs: ex.refs || [], kind: 'explain' })]);
    });
    return { ok: true, kind: 'explain', answer: ex.answer, ...(await getDraftState(draftId)) };
  }
  return { kind: 'revise', ...(await aiRevise({ draftId, instruction: message, tenantId, userId })) };
}

export async function setChannel({ draftId, channel, adapt = true, userId = null }) {
  const draft = await loadDraft(draftId);
  if (!draft) return { ok: false, reason: 'not_found' };
  let body = draft.body;
  if (adapt && draft.body) {
    const res = await ai.reviseDraft({ currentBody: draft.body, instruction: `Maak hiervan een bericht dat past bij ${channel}.`, channel });
    if (res.ok) body = res.body;
  }
  await withTransaction(async (client) => {
    const version = await appendVersion(client, draft, { body, channel, author: 'ai' });
    await client.query('update comm_draft set channel=$2, body=$3, version=$4, updated_at=now() where id=$1', [draftId, channel, body, version]);
  });
  return { ok: true, ...(await getDraftState(draftId)) };
}

export async function discardDraft({ draftId }) {
  await query("update comm_draft set status='discarded', updated_at=now() where id=$1 and status='draft'", [draftId]);
  return { ok: true };
}
