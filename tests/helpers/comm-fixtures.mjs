// Communication Layer — shared test fixtures + DB harness (READINESS / preparation, tests only).
//
// This is TEST-ONLY infrastructure. It ships no product behaviour and is imported by nothing under
// server/ or public/. It exists so the Slice 3 overview tests (Relaties / Gesprekken) and any future
// Communication Layer DB test can reuse ONE skip guard, ONE reset, and a small set of deterministic
// seed helpers, instead of copy-pasting the truncate/seed/closePool block into every file.
//
// Design rules that keep it safe:
//   1. NO top-level import of `pg` / db.mjs. A checkout without the `pg` dependency or without a
//      DATABASE_URL must still let a test file IMPORT this helper and SKIP cleanly. Every function
//      that touches Postgres imports db.mjs lazily, inside the call, after the skip guard has run.
//   2. Deterministic seeds: timestamps and identity keys are derived from the caller's input, never
//      from Math.random()/Date.now() unless the caller opts in, so an assertion never races the clock.
//   3. Idempotent-friendly: reset truncates the relationship tables but NEVER the `tenant` table (the
//      default `maculis` tenant is seeded by migration 002 and reused across tests).

// The canonical Communication Layer DB skip guard (identical semantics to every comm-*.test.mjs).
export const HAS_DB = Boolean(process.env.DATABASE_URL) && /^(1|true|yes|on)$/i.test(process.env.COMM_LAYER_ENABLED || '');

// Pass as the options object to node:test's `test(name, opts, fn)`. Skips with a clear reason when no
// database is configured, exactly like the existing comm DB tests.
export const dbSkip = { skip: HAS_DB ? false : 'no DATABASE_URL/COMM_LAYER_ENABLED — Communication Layer DB test skipped' };

// Lazy db handle — importing this pulls in `pg`, so it only happens once a DB test is actually running.
async function db() { return import('../../server/comm/db.mjs'); }

// All relationship tables, widest-first so `truncate ... cascade` clears everything a comm test can
// touch. `tenant` is deliberately excluded (the default tenant is a migration seed, not test data).
const RESET_TABLES = [
  'message', 'conversation', 'contact', 'organization', 'mailbox', 'invitation',
  'webhook_event', 'attachment', 'ai_draft', 'comm_draft', 'comm_draft_version',
  'draft_chat_message', 'follow_up', 'delivery_event', 'activity', 'channel_identity',
  'communication_preference', 'call_record', 'internal_note', 'relationship_memory',
].join(', ');

// Apply migrations (idempotent) and return the default tenant id. Optionally reset first.
export async function setupCommDb({ reset = true } = {}) {
  const { runMigrations } = await import('../../server/comm/migrate.mjs');
  const { getDefaultTenantId } = await import('../../server/comm/tenant.mjs');
  await runMigrations({ silent: true });
  if (reset) await resetCommTables();
  return { tenantId: await getDefaultTenantId() };
}

export async function resetCommTables() {
  const { query } = await db();
  await query(`truncate ${RESET_TABLES} cascade`);
}

export async function closeCommDb() {
  const { closePool } = await db();
  await closePool();
}

// A second tenant, for isolation assertions. Idempotent by slug.
export async function seedTenant(slug, name = slug) {
  const { query } = await db();
  return (await query(
    'insert into tenant(slug,name) values ($1,$2) on conflict (slug) do update set name=excluded.name returning id',
    [slug, name])).rows[0].id;
}

export async function seedOrg(tenantId, { name = 'OCA', domain = null, stage = null } = {}) {
  const { query } = await db();
  return (await query(
    'insert into organization(tenant_id,name,primary_domain,relationship_stage) values ($1,$2,$3,$4) returning id',
    [tenantId, name, domain, stage])).rows[0].id;
}

// A permanent Contact. identity_key must be unique per tenant; it defaults to the email/mobile-derived
// key (the same convention repo.mjs uses) so seeding the same person twice is a caller error, not a
// silent duplicate. Pass `identityKey` explicitly to seed two contacts that share an email across
// tenants (the isolation case).
export async function seedContact(tenantId, { firstName = null, lastName = null, email = null, mobile = null, orgId = null, stage = null, identityKey = null } = {}) {
  const { query } = await db();
  const key = identityKey
    || (email ? `email:${String(email).toLowerCase()}` : null)
    || (mobile ? `mobile:${mobile}` : null);
  if (!key) throw new Error('seedContact needs email, mobile, or an explicit identityKey');
  return (await query(
    `insert into contact(tenant_id, organization_id, first_name, last_name, email, mobile, identity_key, relationship_stage)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [tenantId, orgId, firstName, lastName, email, mobile, key, stage])).rows[0].id;
}

// A conversation. `lastInboundAt`/`lastMessageAt` default to a fixed point safely in the PAST so a
// read-watermark set to now() is always later (mirrors the comm-attention pattern).
const PAST = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
export async function seedConversation(tenantId, { contactId = null, orgId = null, channel = 'EMAIL', privacy = false, status = 'NEW', subject = null, lastInboundAt = null, lastMessageAt = PAST } = {}) {
  const { query } = await db();
  return (await query(
    `insert into conversation(tenant_id, contact_id, organization_id, channel, is_privacy, status, subject, last_message_at, last_inbound_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [tenantId, contactId, orgId, channel, privacy, status, subject, lastMessageAt, lastInboundAt])).rows[0].id;
}

// A message on a conversation. Inbound defaults to delivery RECEIVED; outbound callers pass e.g.
// { direction: 'OUTBOUND', delivery: 'FAILED' } to seed a delivery problem.
export async function seedMessage(tenantId, conversationId, { direction = 'INBOUND', channel = 'EMAIL', from = null, body = 'hoi', delivery = null, createdAt = PAST } = {}) {
  const { query } = await db();
  const deliv = delivery || (direction === 'INBOUND' ? 'RECEIVED' : 'SENT');
  return (await query(
    `insert into message(tenant_id, conversation_id, direction, channel, from_address, body_text, delivery, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
    [tenantId, conversationId, direction, channel, from, body, deliv, createdAt])).rows[0].id;
}

// A proposed AI draft on a conversation — the durable fact behind the "AI-voorstel" attention tag.
export async function seedAiDraft(tenantId, conversationId, { suggestedReply = 'Dank je voor je bericht.', status = 'proposed' } = {}) {
  const { query } = await db();
  return (await query(
    `insert into ai_draft(tenant_id, conversation_id, suggested_reply, status)
     values ($1,$2,$3,$4) returning id`,
    [tenantId, conversationId, suggestedReply, status])).rows[0].id;
}

// An activity row — feeds listRelationships.last_activity (the overview's "laatste contact" column).
export async function seedActivity(tenantId, { contactId = null, orgId = null, type = 'message_received', channel = 'EMAIL', at = PAST } = {}) {
  const { query } = await db();
  return (await query(
    `insert into activity(tenant_id, contact_id, organization_id, type, channel, at)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [tenantId, contactId, orgId, type, channel, at])).rows[0].id;
}

export { PAST as PAST_TS };
