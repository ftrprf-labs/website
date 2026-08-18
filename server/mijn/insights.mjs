// Mijn Maculis — customer-facing read models (Overzicht, De Spiegel, Samenwerking).
//
// These assemble ONLY what the customer of one organization may see. Insight reads go through the
// sharing boundary (sharing.mjs); collaboration is filtered to customer_visible items so the
// internal task list never leaks. Everything is tenant + organization scoped by the caller.

import { query } from '../comm/db.mjs';
import { visibleInsights, insightForCustomer, sharedInsightCount } from './sharing.mjs';

// Customer-visible collaboration: confirmed agreements, next steps, ongoing research. NOT the
// internal task list — only items explicitly marked customer_visible (§13).
export async function collaboration(tenantId, organizationId) {
  const r = await query(
    `select id, kind, title, detail, status, due_at, created_at, updated_at
       from collaboration_item
      where tenant_id=$1 and organization_id=$2 and customer_visible=true and status <> 'cancelled'
      order by (due_at is null), due_at asc, updated_at desc`,
    [tenantId, organizationId]);
  return r.rows;
}

// The single most relevant "next step" for the Overzicht ("onze laatste stap").
function nextStep(items) {
  const scheduled = items.find((i) => i.due_at && new Date(i.due_at) >= new Date());
  return scheduled
    || items.find((i) => i.kind === 'next_step' || i.kind === 'agreement')
    || items[0]
    || null;
}

// Overzicht: "Waar vraagt onze organisatie om aandacht?" — a calm, few-elements summary, never a
// statistics dashboard. One attention insight, a few recent insights, the collaboration at a glance
// and the next shared step.
export async function customerOverview(tenantId, organizationId) {
  const [insights, collab, sharedCount, lastShare] = await Promise.all([
    visibleInsights(tenantId, organizationId),
    collaboration(tenantId, organizationId),
    sharedInsightCount(tenantId, organizationId),
    query(
      `select at from insight_share_event
        where tenant_id=$1 and organization_id=$2 and action='shared'
        order by at desc limit 1`, [tenantId, organizationId]).then((r) => r.rows[0] || null),
  ]);

  const attention = insights.find((i) => i.attention) || insights[0] || null;
  const recent = insights.filter((i) => !attention || i.id !== attention.id).slice(0, 3);
  const upcomingAppointment = collab.find((i) => i.due_at && new Date(i.due_at) >= new Date()) || null;
  const research = collab.find((i) => i.kind === 'research') || null;

  return {
    attention,
    recent,
    insightCount: insights.length,
    collaboration: {
      upcomingAppointment,
      research,
      sharedCount,
      lastSharedAt: lastShare ? lastShare.at : null,
      nextStep: nextStep(collab),
    },
  };
}

// De Spiegel: the full list of insights the customer may see (PRIVATE + SHARED, own org only).
export async function customerInsights(tenantId, organizationId) {
  return visibleInsights(tenantId, organizationId);
}

// Human stance labels (§10 epistemic integrity, in customer language). No technical badges.
const STANCE_LABEL = {
  reveal: 'Dit valt op', tension: 'Hier zit spanning', consistency: 'Hier zien we consistentie',
  non_reveal: 'Hier zien we géén verschil', unknown: 'Dit weten we nog niet',
};

// The human development of one insight: the readings over time, oldest first. Customer-safe: only the
// human reading fields, never version ids, confidence, provenance, observations or signals. Own-org
// scoped (the join to customer_insight enforces tenant + organization).
export async function insightDevelopment(tenantId, organizationId, insightId) {
  const r = await query(
    `select v.title, v.stance, v.observation, v.meaning, v.change_summary, v.created_at,
            (v.id = ci.current_version_id) as is_current
       from insight_version v
       join customer_insight ci on ci.id = v.insight_id
      where v.insight_id=$1 and v.tenant_id=$2 and v.organization_id=$3
      order by v.version_no asc`,
    [insightId, tenantId, organizationId]);
  return r.rows.map((v) => ({
    at: v.created_at,
    stanceLabel: STANCE_LABEL[v.stance] || 'Dit zien we',
    headline: v.title,
    note: v.change_summary || v.observation || null,
    current: v.is_current,
  }));
}

// One insight detail, strictly own-org scoped (returns null for any other org's id), with its human
// development timeline. The customer sees the CURRENT reading as the main body (insight.*) and the
// progression in `development`; nothing technical about the versioning is exposed.
export async function customerInsightDetail(tenantId, organizationId, insightId) {
  const insight = await insightForCustomer(tenantId, organizationId, insightId);
  if (!insight) return null;
  const development = await insightDevelopment(tenantId, organizationId, insightId);
  return { insight, development };
}
