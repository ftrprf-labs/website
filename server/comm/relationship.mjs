// Communication Layer — Relationship aggregation (§5, §6, §62).
//
// THE RELATIONSHIP IS THE PRODUCT OBJECT. One aggregated read powers the Relationship Workspace so
// opening a client is fast (parallel queries, §62), not twenty sequential calls. It joins identity,
// journey (First Five), communication, follow-ups, consent and a unified activity/message timeline —
// the same underlying data the central Inbox uses (one source of truth, no second architecture).

import { query } from './db.mjs';
import { migrateInvitations } from './repo.mjs';
import { listFollowUps } from './followups.mjs';
import { channelConsentState } from './consent.mjs';

// Resolve a Contact from a legacy invitation id or personal token (the Testerbeheer entry point),
// migrating the JSON invitation into a permanent Contact on demand (idempotent).
export async function contactByInvitation(tenantId, { legacyId = null, token = null, jsonRecord = null }) {
  let row = null;
  if (legacyId) row = (await query('select contact_id from invitation where legacy_id=$1 limit 1', [legacyId])).rows[0];
  if (!row && token) row = (await query('select contact_id from invitation where token=$1 limit 1', [token])).rows[0];
  if (row) return row.contact_id;
  // Not migrated yet — migrate just this record if the caller passed it.
  if (jsonRecord) {
    await migrateInvitations([jsonRecord], tenantId);
    const again = (await query('select contact_id from invitation where legacy_id=$1 limit 1', [jsonRecord.id])).rows[0];
    return again ? again.contact_id : null;
  }
  return null;
}

// One aggregated relationship view. contactId preferred; orgId shows the organization + its contacts.
export async function getRelationship(tenantId, { contactId = null, orgId = null }) {
  if (!contactId && !orgId) return null;

  const contact = contactId ? (await query(
    `select id, organization_id, first_name, last_name, email, mobile, role, relationship_stage, created_at
       from contact where id=$1 and tenant_id=$2`, [contactId, tenantId])).rows[0] : null;
  const organizationId = orgId || (contact && contact.organization_id) || null;

  const [org, orgContacts, identities, journey, conversations, followUps, consent, lastActivity] = await Promise.all([
    organizationId ? query('select id, name, primary_domain, relationship_stage, created_at from organization where id=$1 and tenant_id=$2', [organizationId, tenantId]).then((r) => r.rows[0]) : null,
    organizationId ? query('select id, first_name, last_name, email, role from contact where organization_id=$1 and tenant_id=$2 and deleted_at is null order by created_at', [organizationId, tenantId]).then((r) => r.rows) : [],
    contactId ? query('select channel, value, verified, is_primary from channel_identity where tenant_id=$1 and contact_id=$2 order by is_primary desc', [tenantId, contactId]).then((r) => r.rows) : [],
    contactId ? query('select campaign, status, created_at from invitation where contact_id=$1 order by created_at desc limit 1', [contactId]).then((r) => r.rows[0] || null) : null,
    query(
      `select c.id, c.subject, c.status, c.channel, c.is_privacy, c.last_message_at,
              (select count(*) from message m where m.conversation_id=c.id and m.direction='INBOUND' and c.status in ('NEW')) as unread,
              (select body_text from message m where m.conversation_id=c.id order by created_at desc limit 1) as last_body,
              exists(select 1 from ai_draft a where a.conversation_id=c.id and a.status='proposed') as ai_ready
         from conversation c
        where c.tenant_id=$1 and c.deleted_at is null and c.is_privacy=false
          and (($2::uuid is not null and c.contact_id=$2) or ($3::uuid is not null and c.organization_id=$3))
        order by c.last_message_at desc nulls last limit 50`, [tenantId, contactId, organizationId]).then((r) => r.rows),
    listFollowUps(tenantId, { contactId, organizationId }),
    contactId ? channelConsentState(tenantId, contactId) : null,
    contactId ? query('select type, channel, at from activity where tenant_id=$1 and contact_id=$2 order by at desc limit 1', [tenantId, contactId]).then((r) => r.rows[0] || null) : null,
  ]);

  const unread = conversations.reduce((n, c) => n + Number(c.unread || 0), 0);
  const openConversations = conversations.filter((c) => ['NEW', 'OPEN', 'WAITING_ON_US'].includes(c.status)).length;
  const aiReady = conversations.some((c) => c.ai_ready);

  // A calm "next action" hint (§35 attention model, §92 einddoel).
  let nextAction = null;
  if (unread) nextAction = { type: 'unread', label: `${unread} ongelezen bericht${unread > 1 ? 'en' : ''}` };
  else if (followUps.some((f) => f.overdue)) nextAction = { type: 'follow_up', label: 'Follow-up is verlopen' };
  else if (conversations.some((c) => c.status === 'WAITING_ON_US')) nextAction = { type: 'waiting', label: 'Wacht op jou' };
  else if (aiReady) nextAction = { type: 'ai', label: 'AI-voorstel klaar' };
  else if (followUps.length) nextAction = { type: 'follow_up', label: `Open follow-up: ${followUps[0].title}` };

  return {
    contact, organization: org, orgContacts, identities, journey,
    conversations, followUps, consent,
    stage: (org && org.relationship_stage) || (contact && contact.relationship_stage) || null,
    summary: {
      unread, openConversations, aiReady,
      openFollowUps: followUps.filter((f) => f.status === 'open').length,
      lastActivityAt: lastActivity ? lastActivity.at : (conversations[0] && conversations[0].last_message_at) || null,
      nextAction,
    },
  };
}

// Unified chronological timeline for a contact: communication messages + broader activities (§21).
export async function relationshipTimeline(tenantId, contactId, limit = 100) {
  const [messages, activities] = await Promise.all([
    query(
      `select m.id, m.direction, m.channel, m.from_address, m.subject, m.body_text, m.delivery, m.created_at,
              c.subject as conv_subject
         from message m join conversation c on c.id=m.conversation_id
        where c.tenant_id=$1 and c.contact_id=$2 and c.is_privacy=false order by m.created_at desc limit $3`,
      [tenantId, contactId, limit]).then((r) => r.rows),
    query('select id, type, channel, meta, at from activity where tenant_id=$1 and contact_id=$2 order by at desc limit $3', [tenantId, contactId, limit]).then((r) => r.rows),
  ]);
  const items = [
    ...messages.map((m) => ({ kind: 'message', at: m.created_at, direction: m.direction, channel: m.channel, subject: m.subject || m.conv_subject, body: m.body_text, delivery: m.delivery, id: m.id })),
    ...activities.map((a) => ({ kind: 'activity', at: a.at, type: a.type, channel: a.channel, meta: a.meta, id: a.id })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at));
  return items.slice(0, limit);
}

// Directory / search across relationships (§37). Simple DB search — no heavy infra.
export async function listRelationships(tenantId, { q = '', limit = 50 } = {}) {
  const like = `%${String(q || '').trim().toLowerCase()}%`;
  const contacts = (await query(
    `select ct.id, ct.first_name, ct.last_name, ct.email, ct.mobile, ct.relationship_stage,
            o.id as org_id, o.name as org, o.primary_domain,
            (select max(at) from activity a where a.contact_id=ct.id) as last_activity,
            (select count(*) from conversation c where c.contact_id=ct.id and c.status in ('NEW','OPEN','WAITING_ON_US') and c.deleted_at is null) as open_convs
       from contact ct left join organization o on o.id=ct.organization_id
      where ct.tenant_id=$1 and ct.deleted_at is null
        and ($2='%%' or lower(coalesce(ct.first_name,'')||' '||coalesce(ct.last_name,''))||' '||coalesce(ct.email,'')||' '||coalesce(ct.mobile,'')||' '||coalesce(o.name,'')||' '||coalesce(o.primary_domain,'') like $2)
      order by last_activity desc nulls last, ct.created_at desc limit $3`,
    [tenantId, like, limit])).rows;
  return contacts;
}
