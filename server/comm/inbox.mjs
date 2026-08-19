// Communication Layer — central Inbox: the ATTENTION model (§22, §35).
//
// Not "every message ever" — WHAT NEEDS MY ATTENTION. The Inbox is a SECOND entry point (Ingang B)
// onto the exact same data the Relationship Workspace uses (Ingang A). Calm, no gamification, no red
// badges everywhere. Attention states are derived, never a stored duplicate.

import { query } from './db.mjs';

// A conversation with its derived attention tags, for one box (communication|privacy).
export async function inboxConversations(tenantId, { box = 'communication', filter = 'all', limit = 200 } = {}) {
  const isPrivacy = box === 'privacy';
  const rows = (await query(
    `select c.id, c.subject, c.status, c.channel, c.is_privacy, c.contact_id, c.last_message_at,
            ct.first_name, ct.last_name, ct.email, o.name as org,
            (select direction from message m where m.conversation_id=c.id order by created_at desc limit 1) as last_dir,
            (select body_text from message m where m.conversation_id=c.id order by created_at desc limit 1) as last_body,
            exists(select 1 from message m where m.conversation_id=c.id and m.direction='OUTBOUND' and m.delivery in ('FAILED','BOUNCED')) as delivery_problem,
            exists(select 1 from ai_draft a where a.conversation_id=c.id and a.status='proposed') as ai_ready
       from conversation c
       left join contact ct on ct.id=c.contact_id
       left join organization o on o.id=c.organization_id
      where c.tenant_id=$1 and c.deleted_at is null and c.is_privacy=$2
      order by c.last_message_at desc nulls last limit $3`, [tenantId, isPrivacy, limit])).rows;

  const tagged = rows.map((c) => {
    const attention = [];
    if (c.status === 'NEW') attention.push('new');
    if (['NEW', 'OPEN', 'WAITING_ON_US'].includes(c.status) && c.last_dir === 'INBOUND') attention.push('waiting_on_us');
    if (['ANSWERED', 'WAITING_ON_CONTACT'].includes(c.status)) attention.push('waiting_on_contact');
    if (!c.contact_id) attention.push('unknown_contact');
    if (c.delivery_problem) attention.push('delivery_problem');
    if (c.ai_ready) attention.push('ai_ready');
    if (c.status === 'RESOLVED' || c.status === 'CLOSED') attention.length = 0, attention.push('resolved');
    return { ...c, attention, primary: attention[0] || 'open' };
  });

  const wanted = filter === 'all' ? tagged : tagged.filter((c) => c.attention.includes(filter) || (filter === 'unread' && c.attention.includes('new')));
  return wanted;
}

// Attention counters for the calm header + follow-ups / missed calls that are not a conversation.
// Privacy-attentie voor de Cockpit: UITSLUITEND een telling en een ouderdom.
//
// De Cockpit toont geen privacygesprekken en mag dat ook niet: de attentieafleiding sluit ze uit en
// het openen ervan geeft 403. Maar een AVG-verzoek mag ook niet ongezien blijven liggen voor wie
// operationeel verantwoordelijk is. Deze functie is het compromis dat beide eisen respecteert: zij
// geeft terug HOEVEEL er open staan en HOE LANG het oudste al wacht, en verder niets. Geen id, geen
// naam, geen onderwerp, geen tekst, geen kanaal. Er is dus niets te lekken, en er valt niets af te
// leiden over wie het verzoek deed.
export async function privacyAttention(tenantId) {
  const r = (await query(
    `select count(*)::int as open, min(coalesce(last_message_at, created_at)) as oldest
       from conversation
      where tenant_id=$1 and deleted_at is null and is_privacy=true and status in ('NEW','OPEN')`,
    [tenantId])).rows[0];
  const open = Number(r.open || 0);
  const oldest = open > 0 && r.oldest ? new Date(r.oldest) : null;
  return {
    open,
    oldestAt: oldest ? oldest.toISOString() : null,
    oldestDays: oldest ? Math.max(0, Math.floor((Date.now() - oldest.getTime()) / 86400000)) : null,
  };
}

export async function inboxSummary(tenantId) {
  const [conv, followUps, missed] = await Promise.all([
    query(
      `select
         count(*) filter (where status='NEW' and is_privacy=false) as new,
         count(*) filter (where status='WAITING_ON_US' and is_privacy=false) as waiting_us,
         count(*) filter (where contact_id is null and is_privacy=false and deleted_at is null) as unknown,
         count(*) filter (where is_privacy=true and status in ('NEW','OPEN')) as privacy_open,
         count(*) filter (where exists(select 1 from ai_draft a where a.conversation_id=conversation.id and a.status='proposed')) as ai_ready,
         count(*) filter (where exists(select 1 from message m where m.conversation_id=conversation.id and m.direction='OUTBOUND' and m.delivery in ('FAILED','BOUNCED'))) as delivery_problem
       from conversation where tenant_id=$1 and deleted_at is null`, [tenantId]).then((r) => r.rows[0]),
    query("select count(*) filter (where status='open' and (due_at is null or due_at <= now())) as due from follow_up where tenant_id=$1", [tenantId]).then((r) => r.rows[0]),
    query("select count(*) as missed from call_record where tenant_id=$1 and status='MISSED'", [tenantId]).then((r) => r.rows[0]),
  ]);
  return {
    new: Number(conv.new || 0),
    waiting_on_us: Number(conv.waiting_us || 0),
    unknown_contact: Number(conv.unknown || 0),
    ai_ready: Number(conv.ai_ready || 0),
    delivery_problem: Number(conv.delivery_problem || 0),
    follow_up_due: Number(followUps.due || 0),
    missed_calls: Number(missed.missed || 0),
    privacy_open: Number(conv.privacy_open || 0),
  };
}
