// Mijn Maculis — het hulpdossier: wat Maculis voorbereidt zodra iemand vraagt het samen op te pakken.
//
// De regel eronder is architectuurprincipe 21 (ADR-0002): Maculis vraagt een mens alleen iets te
// doen wanneer het dat niet betrouwbaar zelf kan. Een handeling mag automatisch wanneer hij
// AFLEIDBAAR, OMKEERBAAR en BINNEN MANDAAT is, en hij moet altijd navolgbaar zijn. Alles wat deze
// module doet, valt binnen niveau 0 en 1 van de mandaatladder: waarnemen, samenstellen,
// prioriteren, voorstellen, een concept schrijven en een interne taak klaarzetten. Er gaat hier
// niets naar buiten. Dat blijft één menselijk besluit, via het bestaande uitgaande pad.
//
// DRIE GRENZEN DIE DEZE MODULE NIET MAG OVERSCHRIJDEN
//
//   1. Het dossier draagt NOOIT het herkenningsantwoord en NOOIT de persoonlijke toelichting. Het
//      draagt wat iemand deed: hij vroeg dit, op deze datum. Daarmee blijft "Je antwoord blijft bij
//      jou" letterlijk waar. Er wordt ook nergens iets uit afgeleid dat daarop neerkomt: geen
//      score, geen vlag, geen omweg. De persoonlijke herkenningstabel wordt hier nergens gelezen,
//      en de test controleert dat op de letter: haar naam komt in dit bestand niet voor, ook niet
//      in commentaar, zodat de controle niet met woorden te omzeilen is.
//   2. Vragen is niet delen. `customer_insight.sharing` wordt hier nergens aangeraakt.
//   3. Het dossier heeft geen klantzijdig leespad. Geen enkele route onder /api/mijn/ geeft het
//      terug, en dat is wat voorkomt dat het signaal van de een zichtbaar wordt voor de ander.
//
// EÉN DOSSIER PER INZICHT
//
// Vragen twee mensen hetzelfde, dan is dat één vraag. De tweede klik versterkt het signaal en
// dupliceert geen werk. Elk van hen houdt wel zijn eigen gesprek.

import { query, withTransaction } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';

// De escalatiegrens voor V1. Dit is UITDRUKKELIJK GEEN WACHTTIJD: zodra de voorbereiding klaar is,
// staat het dossier meteen in de Cockpit. Deze termijn telt alleen wanneer geen mens heeft
// gehandeld. Later per type hulpvraag of serviceniveau configureerbaar te maken; die keuze zit
// daarom in één constante en niet verspreid door de code.
export const ESCALATIE_WERKDAGEN = 2;

export function escalatieMoment(vanaf, werkdagen = ESCALATIE_WERKDAGEN) {
  const d = new Date(vanaf.getTime());
  let over = werkdagen;
  while (over > 0) {
    d.setDate(d.getDate() + 1);
    const dag = d.getDay();
    if (dag !== 0 && dag !== 6) over -= 1;
  }
  return d;
}

// ---- het dossier aanleggen en aanvragers koppelen ------------------------------------------------

// De aanleiding als momentopname. Uitsluitend organisatiebrede feiten over het inzicht: de uitspraak
// zoals Maculis die zelf schreef, de houding, hoeveel bewijs eronder ligt en of het al vrijgegeven
// was. Niets hiervan is persoonlijk, en niets hiervan verandert mee wanneer het inzicht later een
// nieuwe lezing krijgt.
async function aanleiding(tenantId, organizationId, insightId) {
  const r = await query(
    `select ci.title, ci.stance, ci.sharing,
            (select count(*)::int from insight_observation o
              where o.insight_id = ci.id and o.customer_label is not null) as bewijs
       from customer_insight ci
      where ci.id=$1 and ci.tenant_id=$2 and ci.organization_id=$3 and ci.status <> 'archived'`,
    [insightId, tenantId, organizationId]);
  return r.rows[0] || null;
}

// Koppelt deze persoon als aanvrager, en maakt het dossier aan wanneer het er nog niet is.
// Idempotent: nog eens klikken levert geen tweede dossier en geen tweede actor op.
export async function koppelAanvrager(tenantId, organizationId, insightId, { contactId, accessId = null, conversationId = null }) {
  if (!contactId) return { ok: false, error: 'no_contact' };
  const a = await aanleiding(tenantId, organizationId, insightId);
  if (!a) return { ok: false, error: 'not_found' };

  return withTransaction(async (client) => {
    const bestaand = (await client.query(
      'select id, status from help_dossier where insight_id=$1 for update', [insightId])).rows[0];

    let dossierId;
    let nieuw = false;
    if (bestaand) {
      dossierId = bestaand.id;
      // Een eerder ingetrokken vraag die opnieuw gesteld wordt, leeft weer op.
      if (bestaand.status === 'vervallen') {
        await client.query(
          `update help_dossier set status='voorbereiden', voorbereiding='geen', updated_at=now() where id=$1`,
          [dossierId]);
        nieuw = true;
      }
    } else {
      dossierId = (await client.query(
        `insert into help_dossier(tenant_id, organization_id, insight_id, titel, houding, bewijs_aantal, gedeeld)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [tenantId, organizationId, insightId, a.title, a.stance, a.bewijs, a.sharing === 'SHARED'])).rows[0].id;
      nieuw = true;
    }

    const alActor = (await client.query(
      'select id from help_dossier_actor where dossier_id=$1 and contact_id=$2', [dossierId, contactId])).rows[0];
    await client.query(
      `insert into help_dossier_actor(tenant_id, dossier_id, contact_id, conversation_id, access_id)
       values ($1,$2,$3,$4,$5)
       on conflict (dossier_id, contact_id)
       do update set conversation_id = coalesce(excluded.conversation_id, help_dossier_actor.conversation_id)`,
      [tenantId, dossierId, contactId, conversationId, accessId]);

    // Nieuw of een aanvrager erbij is een reden om opnieuw voor te bereiden; nog eens dezelfde klik
    // van dezelfde persoon niet. Anders stapelen taken en concepten zich op zonder dat er iets is
    // veranderd, en dat is precies het werk dat dit model wil weghalen.
    return { ok: true, dossierId, nieuw, nieuweActor: !alActor };
  });
}

// Iemand trekt zijn vraag in. Intern en omkeerbaar, dus dit mag automatisch (principe 21).
//
// Is er al geantwoord, dan blijft het dossier staan en beslist een mens: er is dan iets de deur uit
// en dat kan het systeem niet ongedaan maken.
export async function ontkoppelAanvrager(tenantId, insightId, contactId) {
  return withTransaction(async (client) => {
    const d = (await client.query(
      'select id, status, follow_up_id from help_dossier where insight_id=$1 for update', [insightId])).rows[0];
    if (!d) return { ok: true, dossier: null };

    await client.query('delete from help_dossier_actor where dossier_id=$1 and contact_id=$2', [d.id, contactId]);
    const over = Number((await client.query(
      'select count(*)::int n from help_dossier_actor where dossier_id=$1', [d.id])).rows[0].n);

    if (over > 0) return { ok: true, dossier: d.id, status: d.status, over };
    if (d.status === 'opgepakt' || d.status === 'afgerond') {
      return { ok: true, dossier: d.id, status: d.status, over: 0, blijft: true };
    }
    await client.query(`update help_dossier set status='vervallen', updated_at=now() where id=$1`, [d.id]);
    if (d.follow_up_id) {
      await client.query(
        `update follow_up set status='cancelled', completed_at=now() where id=$1 and status='open'`, [d.follow_up_id]);
    }
    return { ok: true, dossier: d.id, status: 'vervallen', over: 0 };
  });
}

// ---- de voorbereiding ---------------------------------------------------------------------------

const HOUDING = {
  reveal: 'Dit valt op', tension: 'Hier zit spanning', consistency: 'Hier zien we consistentie',
  non_reveal: 'Hier zien we géén verschil', unknown: 'Dit weten we nog niet',
};

// Alles wat een mens nodig heeft om dit in vijf seconden te wegen, zonder iets te hoeven opzoeken.
// Alleen bronnen die er al zijn: het inzicht, het bewijs, de afsprakenhistorie, eerdere gesprekken
// en de relatiefase. Nergens de persoonlijke laag.
async function context(tenantId, organizationId, insightId, dossierId) {
  const [insight, org, afspraken, gesprekken, aanvragers] = await Promise.all([
    query(
      `select ci.title, ci.stance, ci.observation, ci.meaning, ci.not_yet_known, ci.sharing, ci.status,
              (select count(*)::int from insight_observation o
                where o.insight_id=ci.id and o.customer_label is not null) as bewijs,
              (select count(*)::int from insight_version v where v.insight_id=ci.id) as lezingen
         from customer_insight ci where ci.id=$1 and ci.tenant_id=$2`, [insightId, tenantId]).then((r) => r.rows[0] || null),
    query('select name, relationship_stage from organization where id=$1 and tenant_id=$2',
      [organizationId, tenantId]).then((r) => r.rows[0] || null),
    query(
      `select kind, title, due_at from collaboration_item
        where tenant_id=$1 and organization_id=$2 and customer_visible=true and status <> 'cancelled'
        order by (due_at is null), due_at asc limit 5`, [tenantId, organizationId]).then((r) => r.rows),
    query(
      `select count(*)::int n from conversation
        where tenant_id=$1 and organization_id=$2 and insight_id=$3 and deleted_at is null`,
      [tenantId, organizationId, insightId]).then((r) => r.rows[0].n),
    query(
      `select c.first_name, c.last_name, a.at
         from help_dossier_actor a join contact c on c.id = a.contact_id
        where a.dossier_id=$1 order by a.at asc`, [dossierId]).then((r) => r.rows),
  ]);
  return { insight, org, afspraken, gesprekken, aanvragers };
}

const naam = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'iemand';

// De samenvatting die de medewerker leest. Offline deterministisch, met AI rijker. In beide gevallen
// dezelfde feiten: er wordt niets bijverzonnen dat niet uit de context komt.
function samenvatting(ctx) {
  const i = ctx.insight;
  const wie = ctx.aanvragers.map(naam).join(' en ') || 'iemand';
  const regels = [
    `${HOUDING[i.stance] || 'Dit zien we'}: ${i.title}.`,
    `Rust op ${i.bewijs} ${i.bewijs === 1 ? 'waarneming' : 'waarnemingen'}${i.lezingen > 1 ? `, in ${i.lezingen} lezingen` : ''}.`,
    i.sharing === 'SHARED' ? 'Dit inzicht is gedeeld met Maculis.' : 'Dit inzicht is niet gedeeld met Maculis, dus citeer de volledige lezing niet terug.',
  ];
  if (ctx.afspraken.length) {
    const a = ctx.afspraken[0];
    regels.push(`Loopt al: ${a.title}${a.due_at ? ` (${new Date(a.due_at).toLocaleDateString('nl-NL')})` : ''}.`);
  }
  regels.push(`Gevraagd door ${wie}.`);
  return regels.join(' ');
}

function voorgesteldeStap(ctx) {
  const wie = ctx.aanvragers.length ? naam(ctx.aanvragers[0]) : 'de aanvrager';
  const meer = ctx.aanvragers.length > 1 ? ` en ${ctx.aanvragers.length - 1} collega` : '';
  const eerst = ctx.afspraken.find((a) => a.due_at);
  return `Een gesprek van 45 minuten met ${wie}${meer} over wat hier speelt`
    + (eerst ? `, bij voorkeur vóór ${new Date(eerst.due_at).toLocaleDateString('nl-NL')}.` : '.');
}

// Het voorstel draagt zijn eigen onzekerheid. Zonder dat kan een mens het niet in vijf seconden
// wegen, en dan is de voorbereiding waardeloos. Maculis is epistemisch eerlijk naar de klant; dat
// hoort het ook naar de eigen mensen te zijn.
function zekerheid(ctx) {
  const i = ctx.insight;
  const sterk = i.bewijs >= 4 ? 'sterk bewijs' : i.bewijs >= 2 ? 'beperkt bewijs' : 'weinig bewijs';
  const n = ctx.aanvragers.length;
  return `${sterk} (${i.bewijs}), ${n === 1 ? 'één aanvrager' : `${n} aanvragers`}, `
    + 'geen signaal over budget, timing of mandaat. Dat hoort in het eerste gesprek, niet in een formulier.';
}

// Het conceptantwoord. Wordt NIET verzonden: het landt als `proposed` in ai_draft, precies zoals de
// copilot dat op de andere kanalen al doet, en een mens verstuurt het via het bestaande uitgaande
// pad. Dat is het ene beslismoment.
async function concept(ctx) {
  const wie = ctx.aanvragers.length ? (ctx.aanvragers[0].first_name || naam(ctx.aanvragers[0])) : 'jullie';
  const basis = [
    `Dag ${wie},`,
    '',
    `Je gaf aan dat jullie hier graag samen naar willen kijken. Dat doen we.`,
    '',
    `Ik stel voor dat we ${voorgesteldeStap(ctx).charAt(0).toLowerCase()}${voorgesteldeStap(ctx).slice(1)}`,
    '',
    'Schikt dat, of heb je liever een ander moment?',
  ].join('\n');

  // Met een echte provider laten we die het schrijven, met dezelfde toon en dezelfde instructie die
  // de copilot op de andere kanalen al gebruikt. Zonder provider is het bovenstaande de tekst. In
  // beide gevallen komt er geen feit bij dat niet uit de context volgt, en wordt er niets verzonden.
  try {
    const { available, CHANNEL_HINT } = await import('../comm/ai/service.mjs');
    if (!available()) return { body: basis, model: 'offline' };
    const { getProvider } = await import('../comm/ai/provider.mjs');
    const prompt = [
      'AANLEIDING:', samenvatting(ctx),
      '', 'WAT WE VOORSTELLEN:', voorgesteldeStap(ctx),
      '', CHANNEL_HINT.EMAIL || '',
      '', 'Schrijf een kort, warm conceptantwoord aan de klant. Geen aanbod, geen prijs, en geen '
      + 'belofte over wie het uitvoert. Bevestig dat we het oppakken en stel de vervolgstap voor.',
    ].filter(Boolean).join('\n');
    const raw = await getProvider().generate({ system: 'Je schrijft namens Maculis: rustig, concreet, zonder verkooptaal.', prompt });
    const body = String(raw || '').trim();
    return body ? { body: body.slice(0, 4000), model: 'ai' } : { body: basis, model: 'offline' };
  } catch {
    return { body: basis, model: 'offline' };
  }
}

// Stelt het dossier samen. Best effort en nooit blokkerend: een mislukte voorbereiding mag een echte
// klantvraag niet onzichtbaar maken, dus het dossier komt hoe dan ook op `klaar` te staan en de
// medewerker ziet de rauwe aanleiding.
export async function bereidVoor(tenantId, organizationId, dossierId, { conversationId = null } = {}) {
  const d = (await query('select id, insight_id, status from help_dossier where id=$1 and tenant_id=$2',
    [dossierId, tenantId])).rows[0];
  if (!d) return { ok: false, error: 'not_found' };
  if (d.status === 'opgepakt' || d.status === 'afgerond') return { ok: true, overgeslagen: true };

  let ctx = null;
  let uit = { samenvatting: null, stap: null, zeker: null, body: null, model: null };
  let kwaliteit = 'mislukt';
  try {
    ctx = await context(tenantId, organizationId, d.insight_id, dossierId);
    if (ctx.insight) {
      uit.samenvatting = samenvatting(ctx);
      uit.stap = voorgesteldeStap(ctx);
      uit.zeker = zekerheid(ctx);
      kwaliteit = 'deels';
      const c = await concept(ctx);
      uit.body = c.body; uit.model = c.model;
      if (uit.body) kwaliteit = 'volledig';
    }
  } catch {
    kwaliteit = 'mislukt';
  }

  // Het concept hangt aan het gesprek van de aanvrager, want daar wordt het straks verstuurd.
  const draadId = conversationId
    || (await query('select conversation_id from help_dossier_actor where dossier_id=$1 and conversation_id is not null order by at asc limit 1',
      [dossierId])).rows[0]?.conversation_id || null;
  if (draadId && uit.body) {
    // Een eerder concept op dit gesprek gaat naar superseded in plaats van dat er een tweede
    // voorstel naast komt te liggen. De medewerker hoort één voorstel te zien, niet een stapel.
    await query(
      `update ai_draft set status='superseded' where conversation_id=$1 and status='proposed'`,
      [draadId]).catch(() => {});
    await query(
      `insert into ai_draft(conversation_id, summary, intent, suggested_reply, suggested_actions, model, status)
       values ($1,$2,$3,$4,$5::jsonb,$6,'proposed')`,
      [draadId, uit.samenvatting, 'action_requested', uit.body,
        JSON.stringify(uit.stap ? [{ label: uit.stap }] : []), uit.model]).catch(() => {});
  }

  // De interne taak. Niveau 1: intern en omkeerbaar, dus dit mag automatisch. Eén per dossier: een
  // tweede aanvrager versterkt het signaal, hij dupliceert geen werk.
  let followUpId = (await query(
    `select f.id from help_dossier d join follow_up f on f.id = d.follow_up_id
      where d.id=$1 and f.status='open'`, [dossierId])).rows[0]?.id || null;
  try {
    if (followUpId) {
      await query('update follow_up set note=$2 where id=$1', [followUpId, uit.stap]);
    } else {
      const actor = (await query(
        'select contact_id, conversation_id from help_dossier_actor where dossier_id=$1 order by at asc limit 1',
        [dossierId])).rows[0] || {};
      followUpId = (await query(
        `insert into follow_up(tenant_id, organization_id, contact_id, conversation_id, title, note, channel_hint, due_at, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,'open') returning id`,
        [tenantId, organizationId, actor.contact_id || null, actor.conversation_id || draadId,
          'Samen met Maculis: een klant vroeg om een vervolgstap', uit.stap, 'MIJN_MACULIS',
          escalatieMoment(new Date())])).rows[0].id;
    }
  } catch { /* de taak is een hulpmiddel, geen voorwaarde: de vraag blijft hoe dan ook staan */ }

  await query(
    `update help_dossier
        set status = case when status='voorbereiden' then 'klaar' else status end,
            voorbereiding=$2, samenvatting=$3, voorgestelde_stap=$4, zekerheid=$5, model=$6,
            follow_up_id=coalesce($7, follow_up_id), updated_at=now()
      where id=$1`,
    [dossierId, kwaliteit, uit.samenvatting, uit.stap, uit.zeker, uit.model, followUpId]);

  // Navolgbaar, zoals principe 21 eist: wat is er afgeleid, en waaruit.
  await recordAudit({
    tenantId, action: 'help_dossier_prepared', entityType: 'help_dossier', entityId: dossierId,
    meta: {
      organizationId, insightId: d.insight_id, voorbereiding: kwaliteit, model: uit.model,
      bronnen: ['customer_insight', 'insight_observation', 'insight_version', 'collaboration_item', 'conversation', 'organization'],
    },
  }).catch(() => {});

  return { ok: true, voorbereiding: kwaliteit };
}

// ---- lezen aan de Maculis-zijde ------------------------------------------------------------------

// Het dossier bij een gesprek, voor de Cockpit. Dit is het enige leespad, en het loopt bewust via
// server/mijn/ zodat de query hier blijft staan en niet in de communicatielaag belandt. Er zit
// niets persoonlijks in behalve wie het vroeg en wanneer.
export async function dossierVoorGesprek(tenantId, conversationId) {
  const r = await query(
    `select d.id, d.status, d.voorbereiding, d.titel, d.houding, d.bewijs_aantal, d.gedeeld,
            d.samenvatting, d.voorgestelde_stap, d.zekerheid, d.created_at, d.insight_id
       from help_dossier d
       join help_dossier_actor a on a.dossier_id = d.id
      where d.tenant_id=$1 and a.conversation_id=$2
      order by d.created_at desc limit 1`,
    [tenantId, conversationId]);
  const d = r.rows[0];
  if (!d) return null;
  const actors = (await query(
    `select c.first_name, c.last_name, a.at from help_dossier_actor a
       join contact c on c.id = a.contact_id where a.dossier_id=$1 order by a.at asc`, [d.id])).rows;
  return { ...d, aanvragers: actors.map((c) => ({ naam: naam(c), at: c.at })) };
}

// Een mens heeft geantwoord. Wordt aangeroepen zodra er via het bestaande uitgaande pad iets is
// verstuurd in een gesprek waar een dossier aan hangt.
export async function markeerOpgepakt(tenantId, conversationId) {
  await query(
    `update help_dossier set status='opgepakt', opgepakt_at=now(), updated_at=now()
      where tenant_id=$1 and status in ('voorbereiden','klaar')
        and id in (select dossier_id from help_dossier_actor where conversation_id=$2)`,
    [tenantId, conversationId]).catch(() => {});
}
