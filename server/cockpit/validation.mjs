// PREVIEW-ONLY live-model validation for Gesprekken. NOT for production.
//
// Purpose: prove that the LIVE model (whatever provider/model is configured) produces natural,
// relationally-intelligent Maculis communication — not just that an API call happens. It runs the
// EXISTING capability functions UNCHANGED (assessConversation, draftReply, reviseDraft) over a set of
// disposable, clearly-labelled scenario fixtures, captures context -> assessment -> concept ->
// Warmer/Korter for each, then DELETES the fixtures.
//
// Safety by construction:
//   - callable only behind an admin session AND PREVIEW_SEED (wired in routes.mjs); inert in prod.
//   - REFUSES to run unless the live provider is active (getProvider().name === 'anthropic'), so a
//     result can never be a silent mock fallback.
//   - it changes NOTHING about the Constitution, prompts, model, provider or generation logic. It
//     only orchestrates the real functions and reads what they produce.
//   - additive + self-cleaning: every row it inserts is tracked and removed in a finally block, with
//     a marker-domain sweep as a safety net.

import { query } from '../comm/db.mjs';
import { getProvider, aiAvailable } from '../comm/ai/provider.mjs';
import { config } from '../config.mjs';
import { draftReply, reviseDraft, assessConversation } from '../comm/ai/service.mjs';
import { buildRelationshipContext } from '../comm/ai/context.mjs';
import { assembleContext, decisionLabel } from '../comm/ai/context-layer.mjs';
import { createFollowUp } from '../comm/followups.mjs';

const MARK = '@gesprek-validatie.test';       // disposable marker domain for the safety-net sweep
const DAY = 86400000;

// ---- disposable scenario fixtures -------------------------------------------------------------
// Each scenario is real DB state so the REAL buildRelationshipContext path runs (no hand-built ctx).
// msgs: { dir: 'INBOUND'|'OUTBOUND', body, minsAgo }. memory: { kind, content } (confirmed).
// followUps: { title, dueDays } (negative dueDays = overdue). privacy marks a privacy conversation.
const SCENARIOS = [
  {
    key: 'praktische_vraag',
    title: '1. Eenvoudige praktische vraag (geen historie)',
    org: 'Coöperatie Zonnewind', first: 'Anouk', role: 'Coördinator',
    subject: 'Tweede sessie inplannen',
    msgs: [{ dir: 'INBOUND', body: 'Zou de tweede sessie deze maand nog kunnen? We willen graag door.', minsAgo: 10 }],
    expect: 'REPLY_NEEDED',
    revise: true,
  },
  {
    key: 'warme_relatie',
    title: '2. Warme bestaande relatie',
    org: 'Wijkhuis Ommekeer', first: 'Pieter', role: 'Teamleider',
    subject: 'Even bijpraten?',
    msgs: [
      { dir: 'OUTBOUND', body: 'Fijn dat de eerste sessie zo goed viel bij het team, Pieter. Laat gerust weten hoe het verder landt.', minsAgo: 3 * 24 * 60 },
      { dir: 'INBOUND', body: 'Echt, het team was enthousiast. Er kwam veel los.', minsAgo: 2 * 24 * 60 },
      { dir: 'INBOUND', body: 'Zouden we binnenkort eens kunnen bijpraten over een mogelijk vervolg?', minsAgo: 15 },
    ],
    memory: [{ kind: 'preference', content: 'Spreekt liever even samen dan via lange mails.' }],
    expect: 'REPLY_NEEDED',
    revise: true,
  },
  {
    key: 'relevante_afspraak',
    title: '3. Relevante eerdere afspraak (plus irrelevante historie)',
    org: 'Buurtwerk De Brug', first: 'Kim', role: 'Communicatie',
    subject: 'Arbeidsmarktcommunicatie',
    msgs: [{ dir: 'INBOUND', body: 'Kunnen jullie ook naar arbeidsmarktcommunicatie kijken? We willen met dezelfde blik verder.', minsAgo: 10 }],
    memory: [
      { kind: 'agreement', content: 'We sturen na de zomer een voorstel voor de tweede sessie.' },
      { kind: 'fact', content: 'Hun kantoor verhuist in het voorjaar naar een nieuw pand aan de kaai.' }, // irrelevant on purpose
    ],
    expect: 'REPLY_NEEDED',
    revise: true,
  },
  {
    key: 'geen_antwoord_nodig',
    title: '4. Geen antwoord nodig (afronding/bedankje)',
    org: 'Stadsatelier Lumen', first: 'Samir', role: 'Directeur',
    subject: 'Bedankt',
    msgs: [
      { dir: 'OUTBOUND', body: 'Hierbij de samenvatting die we bespraken. Fijne week.', minsAgo: 120 },
      { dir: 'INBOUND', body: 'Top, bedankt voor het snelle antwoord! Geen haast verder.', minsAgo: 10 },
    ],
    expect: 'NO_REPLY_NEEDED',
    revise: false,
  },
  {
    key: 'wachten_op_hen',
    title: '5. Wij reageerden als laatste (bal ligt bij hen)',
    org: 'Coöperatie Noorderlicht', first: 'Lotte', role: 'Projectleider',
    subject: 'Ons voorstel',
    msgs: [
      { dir: 'INBOUND', body: 'Kunnen jullie een voorstel sturen voor het vervolgtraject?', minsAgo: 5 * 24 * 60 },
      { dir: 'OUTBOUND', body: 'Bij deze ons voorstel. Laat gerust weten wat je ervan vindt, dan plannen we een moment.', minsAgo: 4 * 24 * 60 },
    ],
    followUps: [{ title: 'Voorstel bij Lotte opvolgen', dueDays: 3 }], // future -> not yet the moment
    expect: 'WAITING_FOR_THEM',
    revise: false,
  },
  {
    key: 'actie_geen_antwoord',
    title: '6. Actie nodig (openstaande follow-up is nu aan de orde)',
    org: 'Stadslab Kanaal', first: 'Bram', role: 'Zaakvoerder',
    subject: 'Vervolg',
    msgs: [{ dir: 'OUTBOUND', body: 'Goed je te spreken vandaag. Ik kom er snel bij je op terug.', minsAgo: 8 * 24 * 60 }],
    followUps: [{ title: 'Offerte opvolgen bij Bram', dueDays: -1 }], // overdue -> ACTION_NEEDED
    expect: 'ACTION_NEEDED',
    revise: false,
  },
  {
    key: 'ambigu_uncertain',
    title: '7. Ambigu inbound (geen valse zekerheid)',
    org: 'Onderwijs Collectief', first: 'Yasmin', role: 'Beleidsmedewerker',
    subject: 'Intern besproken',
    msgs: [
      { dir: 'OUTBOUND', body: 'Dank voor het gesprek. Neem gerust de tijd om het intern af te stemmen.', minsAgo: 3 * 24 * 60 },
      { dir: 'INBOUND', body: 'We hebben het intern besproken.', minsAgo: 10 },
    ],
    expect: 'UNCERTAIN',
    revise: false,
  },
];

// A privacy conversation used only to prove the model is never reached for privacy@ (guardrail).
const PRIVACY = {
  org: 'Vertrouwelijk Dossier', first: 'Privacyverzoek', role: null, subject: 'AVG-verzoek',
  msgs: [{ dir: 'INBOUND', body: 'Ik wil graag weten welke gegevens jullie van mij bewaren.', minsAgo: 10 }],
};

// ---- seeding + cleanup ------------------------------------------------------------------------
async function seedScenario(tenantId, s, track) {
  const orgId = (await query(
    'insert into organization(tenant_id,name,primary_domain) values ($1,$2,$3) returning id',
    [tenantId, `[VALIDATIE] ${s.org}`, 'gesprek-validatie.test'])).rows[0].id;
  track.orgs.push(orgId);
  const email = `${s.first.toLowerCase().replace(/[^a-z]/g, '')}${MARK}`;
  const contactId = (await query(
    `insert into contact(tenant_id,organization_id,identity_key,first_name,email,role)
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [tenantId, orgId, email, s.first, email, s.role])).rows[0].id;
  track.contacts.push(contactId);
  await query("insert into channel_identity(tenant_id,contact_id,channel,value,is_primary) values ($1,$2,'EMAIL',$3,true)", [tenantId, contactId, email]);
  const convId = (await query(
    `insert into conversation(tenant_id,contact_id,organization_id,channel,is_privacy,status,subject,last_message_at,last_inbound_at)
     values ($1,$2,$3,'EMAIL',$4,'OPEN',$5, now(), now()) returning id`,
    [tenantId, contactId, orgId, Boolean(s.privacy), s.subject])).rows[0].id;
  track.convs.push(convId);
  for (const m of s.msgs) {
    await query(
      `insert into message(tenant_id,conversation_id,direction,channel,from_address,body_text,delivery,created_at)
       values ($1,$2,$3,'EMAIL',$4,$5,$6, now() - ($7 * interval '1 minute'))`,
      [tenantId, convId, m.dir, m.dir === 'INBOUND' ? email : 'hello@maculis.nl', m.body, m.dir === 'INBOUND' ? 'RECEIVED' : 'SENT', m.minsAgo]);
  }
  for (const mem of (s.memory || [])) {
    await query(
      "insert into relationship_memory(tenant_id,contact_id,kind,content,source,confidence) values ($1,$2,$3,$4,'human','confirmed')",
      [tenantId, contactId, mem.kind, mem.content]);
  }
  for (const f of (s.followUps || [])) {
    await createFollowUp(tenantId, { contactId, organizationId: orgId, conversationId: convId, title: f.title, channelHint: 'EMAIL', dueAt: new Date(Date.now() + f.dueDays * DAY).toISOString() });
  }
  return { orgId, contactId, convId };
}

async function cleanup(tenantId, track) {
  const del = async (sql, ids) => { if (ids.length) { try { await query(sql, [tenantId, ids]); } catch { /* best-effort */ } } };
  // Children first, then anchors. draftReply/reviseDraft persist nothing, so only seeded rows exist.
  await del('delete from activity where tenant_id=$1 and contact_id = any($2::uuid[])', track.contacts);
  await del('delete from follow_up where tenant_id=$1 and contact_id = any($2::uuid[])', track.contacts);
  await del('delete from message where tenant_id=$1 and conversation_id = any($2::uuid[])', track.convs);
  await del('delete from relationship_memory where tenant_id=$1 and contact_id = any($2::uuid[])', track.contacts);
  await del('delete from channel_identity where tenant_id=$1 and contact_id = any($2::uuid[])', track.contacts);
  await del('delete from conversation where tenant_id=$1 and id = any($2::uuid[])', track.convs);
  await del('delete from contact where tenant_id=$1 and id = any($2::uuid[])', track.contacts);
  await del('delete from organization where tenant_id=$1 and id = any($2::uuid[])', track.orgs);
  // Safety-net sweep by marker, in case anything slipped tracking.
  try {
    await query("delete from message m using conversation c where m.conversation_id=c.id and c.tenant_id=$1 and c.contact_id in (select id from contact where tenant_id=$1 and email like $2)", [tenantId, `%${MARK}`]);
    await query("delete from follow_up where tenant_id=$1 and contact_id in (select id from contact where tenant_id=$1 and email like $2)", [tenantId, `%${MARK}`]);
    await query("delete from relationship_memory where tenant_id=$1 and contact_id in (select id from contact where tenant_id=$1 and email like $2)", [tenantId, `%${MARK}`]);
    await query("delete from channel_identity where tenant_id=$1 and contact_id in (select id from contact where tenant_id=$1 and email like $2)", [tenantId, `%${MARK}`]);
    await query("delete from conversation where tenant_id=$1 and contact_id in (select id from contact where tenant_id=$1 and email like $2)", [tenantId, `%${MARK}`]);
    await query("delete from contact where tenant_id=$1 and email like $2", [tenantId, `%${MARK}`]);
    await query("delete from organization where tenant_id=$1 and primary_domain='gesprek-validatie.test'", [tenantId]);
  } catch { /* best-effort */ }
}

// ---- the run ----------------------------------------------------------------------------------
export async function runGesprekkenValidation(tenantId) {
  const provider = getProvider();
  // Hard gate: never produce validation results from a silent mock fallback.
  if (!aiAvailable() || provider.name !== 'anthropic') {
    return { ok: false, error: 'not_live', reason: 'De live provider is niet actief; validatie geweigerd om stille mock-resultaten te voorkomen.', runtime: { aiAvailable: aiAvailable(), provider: provider.name, model: config.aiModel } };
  }

  const track = { orgs: [], contacts: [], convs: [] };
  const out = { ok: true, runtime: { aiAvailable: true, provider: provider.name, model: config.aiModel }, scenarios: [], guardrails: {} };

  const timed = async (fn) => { const t0 = Date.now(); const v = await fn(); return { v, ms: Date.now() - t0 }; };

  try {
    for (const s of SCENARIOS) {
      const { contactId, convId } = await seedScenario(tenantId, s, track);

      // Context actually assembled for the model (read-only, same functions the draft uses). asm is
      // the result of BOTH gates: authorizeContext (privacy/role) then selectTaskRelevance (task need).
      const ctx = await buildRelationshipContext(tenantId, { conversationId: convId });
      const asm = assembleContext({ role: 'comm_assistant', ctx });

      // 1) assessment BEFORE writing (task context).
      const assess = await assessConversation({ tenantId, conversationId: convId });
      // 2) first concept from the LIVE model.
      const draft = await timed(() => draftReply({ tenantId, conversationId: convId, channel: 'EMAIL' }));

      const rec = {
        key: s.key, title: s.title,
        expected: s.expect,
        context: asm.workContext,                                   // exactly what the model received (post BOTH gates)
        excludedSources: asm.excluded,                              // removed by authorisation (privacy/role)
        relevance: asm.relevance,                                   // per memory item: kept/withheld + why
        withheldFromModel: (asm.withheld || []).map((m) => ({ kind: m.kind, content: m.content })),
        assessment: { decision: assess.decision, label: decisionLabel(assess.decision), reason: assess.reason, provenance: assess.provenance, matchesExpected: assess.decision === s.expect },
        firstConcept: draft.v.ok ? draft.v.body : `(geen concept: ${draft.v.reason})`,
        firstConceptMs: draft.ms,
        warmer: null, korter: null,
      };

      // 3) Warmer / Korter from the SAME context (only where a reply is the point).
      if (s.revise && draft.v.ok) {
        const warmer = await timed(() => reviseDraft({ currentBody: draft.v.body, instruction: 'warmer', channel: 'EMAIL', tenantId, conversationId: convId }));
        const korter = await timed(() => reviseDraft({ currentBody: draft.v.body, instruction: 'korter', channel: 'EMAIL', tenantId, conversationId: convId }));
        rec.warmer = { body: warmer.v.body, ms: warmer.ms };
        rec.korter = { body: korter.v.body, ms: korter.ms };
      }
      out.scenarios.push(rec);
    }

    // Guardrail A — privacy conversation never reaches the model.
    const { convId: pConv } = await seedScenario(tenantId, { ...PRIVACY, privacy: true }, track);
    const pDraft = await draftReply({ tenantId, conversationId: pConv, channel: 'EMAIL' });
    out.guardrails.privacy = { drafted: pDraft.ok, reason: pDraft.reason || null, blocked: pDraft.ok === false && pDraft.reason === 'privacy_excluded' };

    // Guardrail B — authorizeContext strips Lens PRIVATE before any prompt (in-memory, no model call).
    const probe = assembleContext({ role: 'comm_assistant', ctx: { contact: { first_name: 'X' }, recent: [], memory: [], followUps: [], lensPrivate: { reveal: 'GEHEIM' }, refs: [] } });
    out.guardrails.lensPrivateStripped = { excluded: probe.excluded.includes('lens_private'), leakInPrompt: probe.workContext.includes('GEHEIM') };
  } catch (e) {
    out.ok = false; out.error = String(e && e.message || e);
  } finally {
    await cleanup(tenantId, track);
  }
  return out;
}
