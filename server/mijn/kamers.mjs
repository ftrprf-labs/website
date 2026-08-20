// De Cockpitkant van de kamer: één regel, één beslissing.
//
// ADR-0003 D4. Alles wat afleidbaar en intern is, is al gebeurd. Wat overblijft is de enige
// handeling die het gebouw verlaat, en die blijft menselijk. De medewerker kan uitnodigen,
// uitstellen of afwijzen, en verder niets.
//
// WAT HIER MET OPZET ONTBREEKT
//
//   * een manier om de uitspraak te wijzigen, te herschrijven of aan te vullen. `Amplify, do not
//     author` is hier een bevoegdheidsgrens en geen stijladvies: wat in de kamer staat moet zijn wat
//     de ondernemer werkelijk zag, en een goedbedoelde redactieslag maakt dat onwaar;
//   * een leespad naar de persoonlijke laag. De regel hieronder wordt gevoed door de kamer, de
//     organisatie en het inzicht. Hij KAN geen reflectie lezen, en dat is de constructie waarmee
//     "wat je hier zegt blijft van jou" waar blijft in plaats van beloofd.

import { query } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';
import { sendOnChannel } from '../comm/send.mjs';
import { config } from '../config.mjs';
import { maakUitnodiging } from './uitnodiging.mjs';

// Alles wat de medewerker nodig heeft om te beslissen, in één blik. Bewust zonder enige join op de
// persoonlijke laag: die tabellen horen niet op dit pad thuis, en een test bewaakt dat deze module
// ze zelfs niet bij naam noemt.
const SELECT = `
  select r.id, r.status, r.entrance, r.created_at, r.invited_at, r.activated_at,
         r.decline_reason, r.organization_id, r.contact_id,
         o.name as organisatie,
         c.first_name, c.last_name,
         (select ci.title from customer_insight ci
           where ci.organization_id = r.organization_id and ci.status <> 'archived'
           order by ci.created_at asc limit 1) as eerste_inzicht,
         (select count(*)::int from customer_insight ci
           where ci.organization_id = r.organization_id and ci.status <> 'archived') as inzichten
    from mijn_room r
    join organization o on o.id = r.organization_id
    left join contact c on c.id = r.contact_id`;

function vorm(row) {
  return {
    id: row.id,
    status: row.status,
    ingang: row.entrance,
    organisatie: row.organisatie,
    naam: [row.first_name, row.last_name].filter(Boolean).join(' ') || null,
    eersteInzicht: row.eerste_inzicht || null,
    inzichten: Number(row.inzichten || 0),
    klaarSinds: row.created_at,
    uitgenodigdOp: row.invited_at,
    actiefSinds: row.activated_at,
    afwijsreden: row.decline_reason || null,
  };
}

// De aandachtslijst. Alleen kamers waar werkelijk iets te beslissen valt, plus de kamers die
// wachten op toestemming om te benaderen. Die laatste zijn geen actiepunt maar ze moeten wel
// zichtbaar zijn: iemand heeft gevraagd om te bewaren en krijgt bewust niets, en dat hoort niet
// stil te gebeuren.
export async function kamersDieWachten(tenantId) {
  const r = await query(
    `${SELECT} where r.tenant_id=$1 and r.status in ('klaargezet','wacht_op_contact')
      order by r.created_at asc limit 100`, [tenantId]);
  return r.rows.map(vorm);
}

export async function kamer(tenantId, roomId) {
  const r = await query(`${SELECT} where r.tenant_id=$1 and r.id=$2`, [tenantId, roomId]);
  return r.rows[0] ? vorm(r.rows[0]) : null;
}

// De uitnodigingstekst. Eén ding zeggen en niets meer: er staat iets klaar dat hij zelf heeft
// gevraagd. Geen inhoud, geen samenvatting, geen citaat uit het inzicht, zodat het bericht
// onschadelijk blijft als het bij iemand anders terechtkomt.
export function uitnodigingstekst({ voornaam, organisatie, link }) {
  const regels = [
    voornaam ? `Hoi ${voornaam},` : 'Hoi,',
    '',
    organisatie
      ? `Je vroeg me om te bewaren wat ik bij ${organisatie} zag. Dat staat nu voor je klaar.`
      : 'Je vroeg me om te bewaren wat ik zag. Dat staat nu voor je klaar.',
    '',
    'Open Mijn Maculis:',
    link,
    '',
    'Deze link is van jou alleen en blijft zeven dagen geldig.',
  ];
  return regels.join('\n');
}

// De enige handeling die naar buiten gaat.
//
// Fail-closed op toestemming om te benaderen: bewaren gaf het recht om de kamer klaar te zetten en
// nooit het recht om iets te sturen (ADR-0003 D2). De uitgaande poort controleert dat zelf nog eens;
// de controle hier staat er zodat er niet eens een uitnodiging ontstaat die niemand mag ontvangen.
export async function nodigUit(tenantId, roomId, { userId = null, ipRef = null } = {}) {
  const k = (await query(
    `select r.id, r.status, r.organization_id, r.contact_id, o.name as organisatie,
            c.first_name, c.email
       from mijn_room r join organization o on o.id=r.organization_id
       left join contact c on c.id=r.contact_id
      where r.tenant_id=$1 and r.id=$2`, [tenantId, roomId])).rows[0];
  if (!k) return { ok: false, error: 'not_found' };
  if (k.status === 'wacht_op_contact') return { ok: false, error: 'no_contact_consent' };
  if (k.status !== 'klaargezet') return { ok: false, error: 'wrong_status' };
  if (!k.contact_id) return { ok: false, error: 'no_contact' };

  const inv = await maakUitnodiging(tenantId, k.organization_id, k.contact_id, { byUserId: userId });
  if (!inv.ok) return { ok: false, error: inv.error || 'invite_failed' };
  // Er lag al een levende uitnodiging. De rauwe waarde bestaat maar één keer en is niet opnieuw te
  // maken, dus hier valt niets te versturen. Dat is geen fout maar een dubbele klik.
  if (!inv.token) return { ok: false, error: 'already_open' };

  const basis = (config.mijnMaculisUrl || '').replace(/\/+$/, '');
  const link = `${basis}/mijn.html?u=${encodeURIComponent(inv.token)}`;
  const tekst = uitnodigingstekst({ voornaam: k.first_name || null, organisatie: k.organisatie || null, link });

  const verstuurd = await sendOnChannel({
    tenantId, contactId: k.contact_id, organizationId: k.organization_id,
    channel: 'EMAIL', subject: 'Wat Maculis zag staat voor je klaar',
    text: tekst, purpose: 'service', userId, ipRef,
  });
  if (!verstuurd || !verstuurd.ok) return { ok: false, error: verstuurd ? verstuurd.reason : 'send_failed' };

  await query(
    `update mijn_room set status='uitgenodigd', invited_at=now(), invited_by=$2, updated_at=now()
      where id=$1`, [roomId, userId]);
  await recordAudit({
    tenantId, actorUserId: userId, action: 'mijn_room_invited', entityType: 'mijn_room', entityId: roomId,
    ipRef, meta: { organization_id: k.organization_id, channel: 'EMAIL' },
  });
  return { ok: true, contactId: k.contact_id, organizationId: k.organization_id };
}

// Afwijzen is een volwaardige uitkomst met een genoteerde reden, geen verstopte optie. De kamer
// blijft bestaan: de ondernemer heeft gevraagd om te bewaren, en dat gaat door of wij hem nu
// uitnodigen of niet.
export async function wijsAf(tenantId, roomId, reden, { userId = null } = {}) {
  const r = await query(
    `update mijn_room set declined_at=now(), decline_reason=$3, updated_at=now()
      where tenant_id=$1 and id=$2 and status in ('klaargezet','wacht_op_contact') returning id`,
    [tenantId, roomId, (reden || '').slice(0, 500) || null]);
  if (!r.rows[0]) return { ok: false, error: 'not_found' };
  await recordAudit({
    tenantId, actorUserId: userId, action: 'mijn_room_declined', entityType: 'mijn_room',
    entityId: roomId, meta: { reden: Boolean(reden) },
  });
  return { ok: true };
}
