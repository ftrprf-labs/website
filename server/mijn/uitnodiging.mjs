// Mijn Maculis — de uitnodiging en de terugkeer.
//
// De uitnodiging is de enige handeling in deze keten die het gebouw verlaat, en daarom de enige die
// een mens doet (ADR-0002 niveau 2, ADR-0003 D4). Alles hieronder gaat over wat er daarna gebeurt.
//
// DRIE DINGEN DIE UIT ELKAAR MOETEN BLIJVEN
//
//   uitnodiging   eenmalig, verloopt, aan één mens gebonden. Verbruikt zichzelf bij gebruik.
//   toegang       duurzaam. Ontstaat bij het verzilveren en blijft daarna bestaan.
//   inloglink     kort geldig, eenmalig, om terug te komen zonder wachtwoord.
//
// De harde regel daaruit, en de reden dat dit bestand bestaat in plaats van één functie:
// EEN VERLOPEN UITNODIGING HAALT GEEN TOEGANG WEG. De uitnodiging is de deurbel, niet de sleutel.
// Zou het anders zijn, dan verliest iemand zijn kamer door een datum die hij nooit heeft gezien.
//
// Van elke waarde wordt alleen de SHA-256 bewaard, precies zoals bij customer_access. De rauwe
// waarde bestaat één keer, in het antwoord aan de aanroeper, en nergens anders.

import { query, withTransaction } from '../comm/db.mjs';
import { recordAudit } from '../comm/audit.mjs';
import { createAccess, generateAccessToken, hashToken } from './access.mjs';

// Zeven dagen (ADR-0003 D5). De inloglink is bewust veel korter: die reist door de mailbox van
// iemand die al binnen is geweest, en hoeft alleen de sprong van mail naar browser te overleven.
export const UITNODIGING_DAGEN = 7;
export const INLOG_MINUTEN = 30;

function overDagen(n) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000); }
function overMinuten(n) { return new Date(Date.now() + n * 60 * 1000); }

// Zet een uitnodiging klaar voor één mens. Geeft de rauwe waarde één keer terug.
//
// Idempotent op de open uitnodiging: is er al een geldige, onverbruikte uitnodiging voor deze
// persoon, dan komt die NIET nog een keer. Twee levende links voor één kamer is twee keer zoveel
// dat kwijt kan raken, voor nul extra waarde.
export async function maakUitnodiging(tenantId, organizationId, contactId, { byUserId = null } = {}) {
  if (!contactId) return { ok: false, error: 'no_contact' };
  const open = (await query(
    `select id, expires_at from customer_invite
      where tenant_id=$1 and contact_id=$2 and accepted_at is null and revoked_at is null
        and expires_at > now()
      order by created_at desc limit 1`,
    [tenantId, contactId])).rows[0];
  if (open) return { ok: true, bestond: true, inviteId: open.id, token: null, expiresAt: open.expires_at };

  const raw = generateAccessToken();
  const r = await query(
    `insert into customer_invite(tenant_id, organization_id, contact_id, token_hash, expires_at, created_by_user)
     values ($1,$2,$3,$4,$5,$6) returning id, expires_at`,
    [tenantId, organizationId, contactId, hashToken(raw), overDagen(UITNODIGING_DAGEN), byUserId]);
  return { ok: true, bestond: false, inviteId: r.rows[0].id, token: raw, expiresAt: r.rows[0].expires_at };
}

// Trek een uitnodiging in die nooit is aangekomen.
//
// Alleen bedoeld voor de ene situatie waarin de uitnodiging wél is gemaakt maar de verzending
// mislukte. Zonder dit zou die rij als "levende" uitnodiging blijven gelden, terwijl zijn rauwe
// waarde nergens bestaat en niemand hem ooit heeft gezien. De kamer zat dan zeven dagen dicht.
//
// Intrekken en niet verwijderen: dat er een poging is geweest hoort te blijven staan. Een reeds
// verzilverde uitnodiging wordt nooit ingetrokken, want die heeft echte toegang opgeleverd.
export async function trekUitnodigingIn(inviteId) {
  if (!inviteId) return { ok: false, error: 'no_invite' };
  const r = await query(
    'update customer_invite set revoked_at=now() where id=$1 and accepted_at is null and revoked_at is null returning id',
    [inviteId]);
  return { ok: Boolean(r.rows[0]) };
}

// Verzilver een uitnodiging: van deurbel naar sleutel.
//
// Fail-closed op elke voorwaarde, en de foutredenen zijn bewust grof. Een aanvaller mag niet uit het
// verschil tussen "bestaat niet" en "is al gebruikt" kunnen afleiden of een waarde ooit geldig was.
export async function verzilverUitnodiging(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20) return { ok: false, error: 'invalid' };
  const hash = hashToken(rawToken);
  const inv = (await query(
    `select ci.id, ci.tenant_id, ci.organization_id, ci.contact_id, ci.expires_at, ci.accepted_at,
            ci.revoked_at, ci.accepted_access_id, c.first_name, c.last_name
       from customer_invite ci join contact c on c.id = ci.contact_id
      where ci.token_hash=$1`, [hash])).rows[0];
  if (!inv) return { ok: false, error: 'invalid' };
  if (inv.revoked_at) return { ok: false, error: 'invalid' };

  // Al verzilverd. Dit is geen fout van de gebruiker maar een tweede klik op dezelfde mail, dus we
  // geven geen nieuwe toegang en ook geen bestaande weg: hij hoort de inloglink te gebruiken.
  if (inv.accepted_at) return { ok: false, error: 'used' };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { ok: false, error: 'expired' };

  const label = [inv.first_name, inv.last_name].filter(Boolean).join(' ') || null;

  // Eén mens heeft één toegang tot zijn kamer. Had hij er al een, dan levert een tweede uitnodiging
  // GEEN tweede naast de eerste op: dan draaien we de waarde van de bestaande om. Twee parallelle
  // toegangen zouden betekenen dat intrekken de ene sluit en de andere open laat staan, en dat is
  // een deur waarvan niemand meer weet hoeveel sleutels er zijn.
  const bestaande = (await query(
    `select id from customer_access
      where tenant_id=$1 and contact_id=$2 and revoked_at is null order by created_at asc limit 1`,
    [inv.tenant_id, inv.contact_id])).rows[0];
  let access;
  if (bestaande) {
    const raw = generateAccessToken();
    await query('update customer_access set token_hash=$2, label=coalesce($3, label) where id=$1',
      [bestaande.id, hashToken(raw), label]);
    access = { id: bestaande.id, token: raw };
  } else {
    access = await createAccess(inv.tenant_id, inv.organization_id, {
      label, role: 'Klantadmin', contactId: inv.contact_id,
    });
  }
  await withTransaction(async (c) => {
    await c.query('update customer_invite set accepted_at=now(), accepted_access_id=$2 where id=$1', [inv.id, access.id]);
    await c.query('update customer_access set activated_at=coalesce(activated_at, now()), invite_id=$2 where id=$1', [access.id, inv.id]);
    // De kamer gaat pas op `actief` als er werkelijk iemand binnen is geweest. Monotoon vooruit.
    await c.query(
      `update mijn_room set status='actief', activated_at=coalesce(activated_at, now()), updated_at=now()
        where tenant_id=$1 and organization_id=$2 and status in ('klaargezet','uitgenodigd')`,
      [inv.tenant_id, inv.organization_id]);
  });
  await recordAudit({
    tenantId: inv.tenant_id, action: 'mijn_invite_redeemed', entityType: 'customer_access',
    entityId: access.id, meta: { organization_id: inv.organization_id },
  });
  return { ok: true, token: access.token, accessId: access.id, organizationId: inv.organization_id };
}

// Terugkomen. Kort geldig, eenmalig, en het levert GEEN nieuwe toegang op: het wijst de bestaande
// toegang van deze persoon aan. Zo blijft de kamer van hem, ook als een uitnodiging lang verlopen is.
export async function maakInloglink(tenantId, contactId) {
  const heeft = (await query(
    `select id from customer_access where tenant_id=$1 and contact_id=$2 and revoked_at is null limit 1`,
    [tenantId, contactId])).rows[0];
  if (!heeft) return { ok: false, error: 'no_access' };
  const raw = generateAccessToken();
  await query(
    'insert into customer_login_token(tenant_id, contact_id, token_hash, expires_at) values ($1,$2,$3,$4)',
    [tenantId, contactId, hashToken(raw), overMinuten(INLOG_MINUTEN)]);
  return { ok: true, token: raw };
}

// Wissel een inloglink in voor de bestaande toegang. De toegang wordt hier niet opnieuw gemaakt en
// niet verlengd; hij bestond al en blijft bestaan.
export async function gebruikInloglink(rawToken, { ipRef = null } = {}) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20) return { ok: false, error: 'invalid' };
  const hash = hashToken(rawToken);
  const t = (await query(
    'select id, tenant_id, contact_id, expires_at, used_at from customer_login_token where token_hash=$1', [hash])).rows[0];
  if (!t || t.used_at) return { ok: false, error: 'invalid' };
  if (new Date(t.expires_at).getTime() < Date.now()) return { ok: false, error: 'expired' };
  // De rauwe toegangswaarde is nergens bewaard, alleen zijn hash. Een inloglink kan dus niet de
  // oude waarde teruggeven; hij geeft een nieuwe waarde voor DEZELFDE toegang.
  const acc = (await query(
    `select id, organization_id from customer_access
      where tenant_id=$1 and contact_id=$2 and revoked_at is null order by created_at asc limit 1`,
    [t.tenant_id, t.contact_id])).rows[0];
  if (!acc) return { ok: false, error: 'no_access' };
  const raw = generateAccessToken();
  await withTransaction(async (c) => {
    await c.query('update customer_login_token set used_at=now(), ip_ref=$2 where id=$1', [t.id, ipRef]);
    await c.query('update customer_access set token_hash=$2, last_seen_at=now() where id=$1', [acc.id, hashToken(raw)]);
  });
  return { ok: true, token: raw, accessId: acc.id, organizationId: acc.organization_id };
}
