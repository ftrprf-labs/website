// Mijn Maculis — "Wil je hier iets mee?"
//
// Herkenning zegt of een inzicht wáár is. Deze vraag zegt of iemand er iets mee wil. Dat is het
// enige in deze reis dat niet uit context af te leiden is, en dus het enige dat het waard is om te
// vragen. Eén vraag, drie antwoorden, twee klikken in totaal.
//
//   weten  goed om te weten, verder niets
//   zelf   wij pakken dit zelf op
//   samen  help ons de vervolgstap organiseren
//
// "Samen met Maculis" betekent uitdrukkelijk NIET dat Maculis de uitvoerder wordt. Maculis
// organiseert de beste vervolgstap; wie hem uitvoert is een aparte beslissing die later valt
// (architectuurprincipe 22). De copy zegt dat ook zo.
//
// DE KLIK IS DE LAATSTE NOODZAKELIJKE HANDELING. Daarna neemt Maculis het voorbereidende werk over.
// De klant hoeft niets te typen, niets te kiezen en niets te versturen.
//
// WAT DEZE MODULE NIET DOET
//
//   * `customer_insight.sharing` aanraken. Vragen is niet delen. De momentopname bij het gesprek
//     vertelt Maculis waarover het gaat; de vrijgave van het inzicht verandert er niet door.
//   * De persoonlijke laag doorgeven. Het herkenningsantwoord en de toelichting blijven waar ze
//     staan, en worden nergens afgeleid of gereconstrueerd.
//   * Iets naar buiten sturen. Dat blijft één menselijk besluit in de Cockpit.

import { query, withTransaction } from '../comm/db.mjs';
import { zorgVoorDraad } from './gesprek.mjs';
import { koppelAanvrager, ontkoppelAanvrager, bereidVoor } from './hulp.mjs';

export const INTENTIES = new Set(['weten', 'zelf', 'samen']);

// De vraag verschijnt niet bij elk patroon. Vier voorwaarden, alle vier afgeleid uit wat er al
// staat, zodat dit geen trechter wordt maar een vraag op het enige moment waarop hij betekent.
//
//   1. er ligt grond onder (unknown valt af, want die houding IS "hier is te weinig om iets te
//      zeggen" en kent daarom geen drempel);
//   2. er is een antwoord op "Herken je dit?", welk antwoord dan ook;
//   3. de houding is een spanning of een opvallendheid. "Hier zien we consistentie" is goed nieuws,
//      en vragen of je daar iets aan wilt veranderen is een categoriefout.
//
// Hier stond eerder een vierde voorwaarde: het antwoord moest ja of deels zijn, want bij nee zou
// het patroon voor deze mens niet bestaan. Dat klopte niet. Bij nee verschillen twee perspectieven
// op dezelfde werkelijkheid, en dat is precies het moment waarop een vraag betekenis heeft. De
// vraag ging dicht op het moment dat het interessant werd.
//
// Over de getallen: dit is geen score maar wat een soort uitspraak nodig heeft om te bestaan. Zie
// de toelichting bij DREMPEL in public/mijn.js. reveal stond op 4 en staat op 1, omdat de
// onthulling van de Lens uit haar eigen citaten wordt afgeleid en dus niet zonder kan bestaan.
//
// Deze regel staat hier én in de front end. Hier is hij de grens, daar de weergave.
export const DREMPEL = { tension: 2, reveal: 1, consistency: 5, non_reveal: 5, unknown: Infinity };
export function vraagIsRelevant(insight) {
  if (!insight) return false;
  const drempel = DREMPEL[insight.stance] ?? 4;
  if (!Number.isFinite(drempel)) return false;
  if (Number(insight.evidence_count || 0) < 1) return false;
  if (!insight.recognition) return false;
  return insight.stance === 'tension' || insight.stance === 'reveal';
}

// Zet of wijzigt de intentie van DEZE persoon bij dit inzicht. Fail-closed zonder contact: zonder
// persoon zou dit een intentie van iedereen worden, en dat is aan klantzijde per definitie niemand.
//
// Idempotent: nog eens dezelfde keuze klikken verandert niets wezenlijks, levert geen tweede dossier
// op en geen tweede aanvrager.
export async function zetIntentie(tenantId, organizationId, insightId, {
  intent = null, accessId = null, contactId = null,
} = {}) {
  if (!contactId) return { ok: false, error: 'no_contact' };
  const gekozen = intent && INTENTIES.has(String(intent)) ? String(intent) : null;

  const insight = (await query(
    `select id, sharing from customer_insight
      where id=$1 and tenant_id=$2 and organization_id=$3 and status <> 'archived'`,
    [insightId, tenantId, organizationId])).rows[0];
  if (!insight) return { ok: false, error: 'not_found' };

  const vorige = (await query(
    'select intent from insight_intent where insight_id=$1 and contact_id=$2', [insightId, contactId])).rows[0];

  await withTransaction(async (client) => {
    if (gekozen) {
      await client.query(
        `insert into insight_intent(tenant_id, organization_id, insight_id, contact_id, intent, access_id, at)
         values ($1,$2,$3,$4,$5,$6, now())
         on conflict (insight_id, contact_id)
         do update set intent=excluded.intent, access_id=excluded.access_id, at=now()`,
        [tenantId, organizationId, insightId, contactId, gekozen, accessId]);
    } else {
      await client.query('delete from insight_intent where insight_id=$1 and contact_id=$2', [insightId, contactId]);
    }
    await client.query(
      `insert into insight_intent_event(tenant_id, organization_id, insight_id, contact_id, intent, actor_access_id)
       values ($1,$2,$3,$4,$5,$6)`,
      [tenantId, organizationId, insightId, contactId, gekozen, accessId]);
  });

  // Alleen "samen" zet iets in gang. De andere twee zijn een antwoord en verder niets: geen dossier,
  // geen taak, geen gesprek. Dat is wat "Nee, alleen weten" een volwaardig antwoord maakt in plaats
  // van een wegklikoptie.
  let dossierId = null;
  if (gekozen === 'samen') {
    const draad = await zorgVoorDraad(tenantId, organizationId, { contactId, insightId, accessId });
    const koppeling = await koppelAanvrager(tenantId, organizationId, insightId, {
      contactId, accessId, conversationId: draad.ok ? draad.conversationId : null,
    });
    if (koppeling.ok) {
      dossierId = koppeling.dossierId;
      // Alleen voorbereiden wanneer er werkelijk iets veranderd is: een nieuw dossier, of een
      // aanvrager erbij. Nog eens dezelfde klik van dezelfde persoon verandert niets en hoort dus
      // geen tweede taak en geen tweede concept op te leveren.
      //
      // Voorbereiden is best effort en blokkeert de klant nooit. Mislukt het, dan staat het dossier
      // er nog steeds en ziet de medewerker de rauwe aanleiding.
      if (koppeling.nieuw || koppeling.nieuweActor) {
        await bereidVoor(tenantId, organizationId, dossierId, {
          conversationId: draad.ok ? draad.conversationId : null,
        }).catch(() => {});
      }
    }
    return {
      ok: true, intent: gekozen, dossier: Boolean(dossierId),
      conversationId: draad.ok ? draad.conversationId : null,
    };
  }

  // Van "samen" af stappen trekt de vraag in. Intern en omkeerbaar, dus dat mag automatisch.
  if (vorige && vorige.intent === 'samen') {
    await ontkoppelAanvrager(tenantId, insightId, contactId).catch(() => {});
  }
  return { ok: true, intent: gekozen, dossier: false, conversationId: null };
}
