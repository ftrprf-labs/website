// Mijn Maculis — de melding dat er een antwoord klaarstaat.
//
// Een antwoord in Mijn Maculis is stil: de klant ziet het pas bij een volgend bezoek. Daarom gaat
// er een e-mail uit die precies één ding zegt, en niets meer.
//
// DE HARDE REGEL, en de reden dat dit een eigen bestand is met een eigen test:
//   In de melding staat GEEN inhoud. Niet van het antwoord, niet van de vraag, niet van het
//   patroon waar het over ging, en al helemaal niet van een privé-inzicht. De melding weet
//   letterlijk niet meer dan dat er iets klaarstaat. Dat is geen belofte maar een constructie:
//   deze module leest de body van het bericht nergens uit, en het onderwerp is een constante.
//
// De tweede regel: de bestaande consentregels blijven leidend. De melding is een gewone uitgaande
// zending en gaat door dezelfde poort als elke andere. Geen geldige toestemming, geen melding, en
// dat wordt teruggemeld in plaats van stil weggeslikt.
//
// De derde regel, en die staat los van het kanaal: dit bericht is SECUNDAIR. Het brengt onder de
// aandacht dat er iets klaarstaat; het is niet het bericht zelf. Daarom gaat het als
// isNotification de verzendlaag in, en daarom kan een mislukte melding het gesprek nooit als
// bezorgprobleem laten zien. Zie migratie 010.
//
// Vandaag gaat de melding over e-mail. Dat is een POLICY-keuze en geen eigenschap van dit
// mechanisme: welk toegestaan kanaal iemands voorkeur heeft, hoort in communication_preference en
// wordt hier straks één opzoeking. Zolang die er niet is, kiest deze module niet en raadt ze niet,
// maar neemt ze het kanaal waarvan de consentpolicy service-verkeer standaard toestaat.
//
// Fail-closed op elke schakel: geen contact aan de toegang gekoppeld betekent geen ontvanger en
// dus geen melding. We raden nooit een adres.

import { config } from '../config.mjs';
import { query } from '../comm/db.mjs';

// Eén tekst, altijd dezelfde. Er is geen variant die iets over de inhoud zegt, want die zou dan
// ooit gekozen kunnen worden.
const ONDERWERP = 'Er staat een antwoord voor je klaar in Mijn Maculis';

function bodyTekst() {
  const regels = [
    'Er staat een antwoord van Maculis voor je klaar.',
    '',
    'Je vindt het in Mijn Maculis, in het gesprek dat je zelf begon. We zetten het antwoord daar neer en niet in deze e-mail, omdat wat jullie omgeving betreft in jullie omgeving hoort te blijven.',
  ];
  if (config.mijnMaculisUrl) {
    regels.push('', `Open Mijn Maculis: ${config.mijnMaculisUrl}/mijn.html`, '', 'Gebruik daarbij je eigen toegangslink. Deze e-mail bevat er geen, zodat hij ook veilig is als hij bij iemand anders terechtkomt.');
  } else {
    regels.push('', 'Open Mijn Maculis met je eigen toegangslink. Deze e-mail bevat er geen, zodat hij ook veilig is als hij bij iemand anders terechtkomt.');
  }
  return regels.join('\n');
}

// Wie krijgt de melding: de contactpersonen achter de actieve toegangen van deze organisatie.
// Een toegang zonder gekoppeld contact levert niets op. Dat is geen tekortkoming maar de grens:
// zonder contact is er geen ontvanger en geen consentsubject.
async function ontvangers(tenantId, organizationId) {
  return (await query(
    `select distinct ca.contact_id
       from customer_access ca
      where ca.tenant_id=$1 and ca.organization_id=$2
        and ca.revoked_at is null and ca.contact_id is not null`,
    [tenantId, organizationId])).rows.map((r) => r.contact_id);
}

// Meld dat er een antwoord klaarstaat. Wordt aangeroepen nadat een MIJN_MACULIS-bericht is
// weggeschreven. Geeft altijd een uitkomst terug, ook wanneer er niets is verstuurd, zodat in de
// Cockpit en in de test zichtbaar is waarom niet.
export async function announceReply({ tenantId, organizationId, conversationId, messageId }) {
  if (!tenantId || !organizationId || !messageId) return { ok: false, reason: 'incomplete' };

  // Precies één melding per antwoord. De stempel staat op het bericht zelf, dus een tweede
  // aanroep (herstart, herverzending, dubbele webhook) doet niets.
  const claim = await query(
    `update message set notified_at=now()
      where id=$1 and tenant_id=$2 and direction='OUTBOUND' and channel='MIJN_MACULIS' and notified_at is null
      returning id`, [messageId, tenantId]);
  if (!claim.rows[0]) return { ok: false, reason: 'already_announced' };

  const contacts = await ontvangers(tenantId, organizationId);
  if (!contacts.length) {
    await query('update message set notified_at=null where id=$1', [messageId]).catch(() => {});
    return { ok: false, reason: 'no_recipient' };
  }

  // De melding is een gewone uitgaande e-mail en loopt daarom door het gewone verzendpad, met de
  // gewone consentpoort. Dynamisch geïmporteerd omdat send.mjs deze module aanroept.
  const { sendOnChannel } = await import('../comm/send.mjs');
  const uit = [];
  for (const contactId of contacts) {
    // eslint-disable-next-line no-await-in-loop
    const r = await sendOnChannel({
      tenantId, contactId, organizationId,
      channel: 'EMAIL', purpose: 'service',
      subject: ONDERWERP,
      text: bodyTekst(),
      // Dit is de melding, niet het bericht. Het antwoord staat al in Mijn Maculis en is daar
      // bezorgd. Mislukt deze zending, dan is er een meldingsprobleem en geen bezorgprobleem, en
      // het aandachtsmodel mag er nooit uit afleiden dat de klant ons bericht niet kreeg.
      // De vlag hangt aan de ROL van dit bericht, niet aan het kanaal: gaat de melding later over
      // een ander toegestaan kanaal, dan verandert hier alleen de waarde van `channel`.
      isNotification: true,
    });
    uit.push({ contactId, ok: Boolean(r.ok), reason: r.ok ? null : r.reason, consent: r.consent || null });
  }
  const verstuurd = uit.filter((r) => r.ok).length;
  if (!verstuurd) await query('update message set notified_at=null where id=$1', [messageId]).catch(() => {});
  return { ok: verstuurd > 0, sent: verstuurd, conversationId, results: uit };
}

// Alleen voor de test: de melding moet inspecteerbaar zijn zonder te versturen.
export const _melding = { onderwerp: ONDERWERP, tekst: bodyTekst };
