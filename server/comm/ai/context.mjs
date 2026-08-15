// Communication Layer — bounded Relationship Context Engine (§CONTEXT ENGINE, §31, PRIVACY EN AI).
//
// Assembles ONLY the relationship context relevant to the current communication goal — never a
// database dump. Purpose-limited, tenant-scoped, privacy-safe: privacy@ conversations are excluded,
// internal notes are included only where the AI is permitted, secrets never appear. Every context
// item is returned with a transparency reference (type + id + label) so the UI can explain WHY the
// AI proposed something and link back to the source (§AI TRANSPARANTIE).

import { query } from './../db.mjs';
import { stripForContext } from '../signature.mjs';

export async function buildRelationshipContext(tenantId, { conversationId = null, contactId = null, limitMessages = 8 } = {}) {
  const refs = [];
  const add = (type, id, label) => { if (id) refs.push({ type, id, label }); };

  // Anchor: conversation (preferred) or contact.
  let conv = null;
  if (conversationId) {
    conv = (await query(
      `select c.id, c.subject, c.status, c.channel, c.is_privacy, c.contact_id, c.organization_id, c.follow_up_at
         from conversation c where c.id=$1 and c.tenant_id=$2`, [conversationId, tenantId])).rows[0] || null;
  }
  const cId = contactId || (conv && conv.contact_id) || null;
  const oId = (conv && conv.organization_id) || null;
  const isPrivacy = conv ? conv.is_privacy : false;

  const contact = cId ? (await query(
    `select id, first_name, last_name, email, mobile, role, relationship_stage from contact where id=$1 and tenant_id=$2`,
    [cId, tenantId])).rows[0] : null;
  if (contact) add('contact', contact.id, [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email);

  const org = (oId || (contact && contact.organization_id)) ? (await query(
    `select id, name, primary_domain, relationship_stage from organization where id = coalesce($1,(select organization_id from contact where id=$2)) and tenant_id=$3`,
    [oId, cId, tenantId])).rows[0] : null;
  if (org) add('organization', org.id, org.name);

  // Recent conversation history (bounded). Privacy conversations contribute NOTHING to AI context.
  const recent = (conv && !isPrivacy) ? (await query(
    `select direction, from_address, body_text, channel, created_at from message
      where conversation_id=$1 order by created_at desc limit $2`, [conv.id, limitMessages])).rows.reverse() : [];
  if (conv && !isPrivacy) add('conversation', conv.id, conv.subject || 'gesprek');

  // First Five / journey status (mirror row; the JSON store holds the live lifecycle).
  const journey = cId ? (await query(
    `select campaign, status from invitation where contact_id=$1 order by created_at desc limit 1`, [cId])).rows[0] || null : null;
  if (journey) add('journey', cId, `First Five: ${journey.status || 'onbekend'}`);

  // Open follow-ups (what we still owe / are waiting on).
  const followUps = cId ? (await query(
    `select id, title, due_at, channel_hint from follow_up where tenant_id=$1 and contact_id=$2 and status='open' order by due_at nulls last limit 5`,
    [tenantId, cId])).rows : [];
  for (const f of followUps) add('follow_up', f.id, f.title);

  // Consent snapshot (so the AI can note "WhatsApp niet toegestaan" as a suggestion, never act on it).
  const prefs = cId ? (await query(
    `select channel, purpose, allowed, withdrawn_at from communication_preference where tenant_id=$1 and contact_id=$2`,
    [tenantId, cId])).rows : [];

  // Channel identities the person can be reached on.
  const identities = cId ? (await query(
    `select channel, value, verified, is_primary from channel_identity where tenant_id=$1 and contact_id=$2`,
    [tenantId, cId])).rows : [];

  // Relationship Memory — CONFIRMED facts/agreements only feed the model as fact; proposed AI items
  // are excluded from generation context (they are suggestions for a human, not established truth).
  const memory = cId ? (await query(
    `select id, kind, content from relationship_memory
      where tenant_id=$1 and contact_id=$2 and superseded_at is null and confidence='confirmed'
        and (valid_until is null or valid_until > now()) order by created_at desc limit 8`, [tenantId, cId])).rows : [];
  for (const m of memory) add('memory', m.id, m.content);

  return {
    tenantId, isPrivacy,
    contact, org, journey,
    conversation: conv ? { id: conv.id, subject: conv.subject, status: conv.status, channel: conv.channel } : null,
    recent, followUps, prefs, identities, memory,
    refs,
  };
}

// Render a compact, model-ready text block from bounded context (used by the live provider path).
export function renderContextForModel(ctx) {
  const who = ctx.contact ? ([ctx.contact.first_name, ctx.contact.last_name].filter(Boolean).join(' ') || ctx.contact.email) : 'onbekend';
  const org = ctx.org ? ctx.org.name : 'onbekende organisatie';
  const stage = (ctx.org && ctx.org.relationship_stage) || (ctx.contact && ctx.contact.relationship_stage) || null;
  const history = ctx.recent.map((m) => `${m.direction === 'INBOUND' ? 'ZIJ' : 'MACULIS'} (${m.channel}): ${stripForContext(m.body_text || '').slice(0, 400)}`).join('\n');
  const fu = ctx.followUps.map((f) => `- ${f.title}${f.due_at ? ' (uiterlijk ' + new Date(f.due_at).toLocaleDateString('nl-NL') + ')' : ''}`).join('\n');
  const mem = (ctx.memory || []).map((m) => `- [${m.kind}] ${m.content}`).join('\n');
  return [
    `CONTACT: ${who}`,
    `ORGANISATIE: ${org}${stage ? ` (relatie: ${stage})` : ''}`,
    ctx.journey ? `FIRST FIVE: ${ctx.journey.status || 'onbekend'}` : null,
    mem ? `VASTGELEGDE AFSPRAKEN EN FEITEN:\n${mem}` : null,
    `RECENTE COMMUNICATIE:\n${history || '(geen eerdere berichten)'}`,
    fu ? `OPEN FOLLOW-UPS:\n${fu}` : null,
  ].filter(Boolean).join('\n\n');
}
