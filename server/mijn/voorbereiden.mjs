// Van een afgeronde Lens naar een klaargezette Mijn Maculis kamer.
//
// Dit is ADR-0003 D4 in code: alles wat afleidbaar, omkeerbaar en intern is, gebeurt hier vanzelf.
// Er gaat niets naar buiten. De uitnodiging is een eigen, menselijke handeling en staat in
// uitnodiging.mjs.
//
// WAT DEZE MODULE NIET DOET, EN DAT IS DE HELFT VAN HET ONTWERP
//
//   * de website opnieuw analyseren. De Lens heeft de ondernemer verteld dat er niet wordt
//     meegekeken. De uitspraak staat woordelijk in de sessie, dus het is ook niet nodig;
//   * de uitspraak herschrijven, inkorten of samenvatten. Wat in de kamer staat is teken voor teken
//     wat hij op zijn scherm zag. Dat is `amplify, do not author` als datastroom;
//   * een tweede inzicht afleiden uit zijn antwoorden. Zijn "Deels" is geen nieuw patroon;
//   * iets versturen. Bewaren is geen benaderen (ADR-0003 D2).
//
// IDEMPOTENT, EN DAT IS GEEN LUXE
//
// De aanroeper draait bij elke lijstweergave. Zonder strakke idempotentie krijg je een kamer per
// pagina-verversing. Elke stap hieronder zoekt eerst en maakt daarna pas.

import { query, withTransaction } from '../comm/db.mjs';
import { getDefaultTenantId } from '../comm/tenant.mjs';
import { resolveContactTx } from '../comm/repo.mjs';
import { recordAudit } from '../comm/audit.mjs';
import { createInsightWithInitialVersion, addObservation } from './versions.mjs';
import { V1_GEBIED, V1_PERSPECTIEF, BRON_LENS, VERDIEPING } from './woordenschat.mjs';

// De Lens kent uitkomsten, de kamer kent houdingen. Dit is een vertaling en geen gok: `reveal` en
// `non_reveal` zijn in beide vocabulaires hetzelfde begrip, en de kolom `stance` draagt volgens
// migratie 006 uitdrukkelijk "the epistemic kind, preserved from the Lens".
const HOUDING = { REVEAL: 'reveal', SILENCE: 'non_reveal', INSUFFICIENT_EVIDENCE: 'unknown' };

// DE ONDERBOUWING
//
// Wat de Lens achter "Waar zie je dat?" liet zien, komt hier terug: het citaat en waar het stond.
// Woordelijk, want dit is overdracht en geen nieuwe waarneming. De vindplaats gaat NIET mee naar de
// klantzijde maar naar de interne herkomst: in de bewijslijst staat één regel, en een URL erin zou
// een link zijn die de kamer niet kan openen.
//
// Eén regel per stuk bewijs, en niet één regel met een aantal erin. Dat verschil is het hele punt:
// een aantal is een bewering over bewijs, een citaat ís het bewijs.
function bewijsregel(e) {
  const citaat = String(e.quote || '').trim();
  if (!citaat) return null;
  const bron = String(e.label || '').trim();
  return bron ? `${bron}: "${citaat}"` : `"${citaat}"`;
}

// Terugval voor sessies van vóór de overdracht van bewijs. Die dragen alleen een aantal mee. We
// verzinnen de citaten dan niet en doen ook niet alsof ze er niet waren: we noemen het aantal.
function grondtekst(aantal) {
  const n = Number(aantal || 0);
  if (n <= 0) return null;
  if (n === 1) return 'Maculis vond hiervoor één aanwijzing op jullie website.';
  return `Maculis vond hiervoor ${n} aanwijzingen op jullie website.`;
}

// Bestaat er al een kamer voor deze organisatie? Eén organisatie is één relatiecontext
// (architectuurprincipe 24), dus dit is uniek op organisatie en niet op tester of op sessie.
export async function kamerVoorOrganisatie(tenantId, organizationId) {
  return (await query(
    `select id, status, contact_id, entrance, created_at, invited_at, activated_at
       from mijn_room where tenant_id=$1 and organization_id=$2`,
    [tenantId, organizationId])).rows[0] || null;
}

// De volledige voorbereiding voor één afgeronde tester.
//
// `record`  de Testerbeheer-tester (bron van waarheid voor naam, e-mail, mobiel, bedrijf, domein)
// `d`       wat uit de sessie is afgeleid: completed, keep, consent, answers, reveal
//
// Geeft { ok, reason?, roomId, organizationId, contactId, insightId, status, nieuw }.
export async function bereidKamerVoor(record, d, { tenantId = null } = {}) {
  if (!record || !d) return { ok: false, reason: 'no_input' };
  // Drie poorten, en alle drie zijn ze een grens en geen filter.
  if (!d.completed) return { ok: false, reason: 'not_completed' };
  // ADR-0003 D1: dit is de ENIGE trigger. Geen afronding, geen aanname, geen afleiding.
  if (!d.keep) return { ok: false, reason: 'no_keep_consent' };
  // ADR-0004: een ingang is pas geldig als hij een eerste uitspraak levert. Zonder uitspraak zou er
  // een lege kamer ontstaan, en een lege kamer is een gebroken belofte in het pak van het product.
  //
  // WAT EEN UITSPRAAK IS, is verbreed (ADR-0005). Deze poort toetste op de aanwezigheid van een
  // reveal-regel, en daarmee gold "geen conclusie" als "niets gezien". Dat zijn twee verschillende
  // dingen: de Lens noemt een SILENCE zelf een volwaardige uitkomst, en hij berekent er observaties
  // bij die wél gegrond zijn.
  //
  // De betekenispoort staat niet hier maar in de Lens: alleen observaties die zijn eigen
  // drempels overleefden komen mee. Is die lijst leeg, dan was er werkelijk niets, en dan opent er
  // hier ook niets. Geen betekenis, geen omgeving.
  const lijn = d.reveal && typeof d.reveal.line === 'string' ? d.reveal.line.trim() : '';
  const observaties = d.observaties && Array.isArray(d.observaties.items) ? d.observaties.items : [];
  if (!lijn && !observaties.length) return { ok: false, reason: 'no_statement' };

  const tid = tenantId || await getDefaultTenantId();
  const persoon = {
    first_name: record.first_name, last_name: record.last_name, email: record.email,
    mobile: record.mobile, company_name: record.company_name, domain: record.domain,
  };

  // 1. organisatie en mens. Dit pad bestaat al en ontdubbelt al: eerst op hoofddomein, dan op naam
  //    hoofdletterongevoelig, en vrije mailproviders tellen niet als bedrijfsdomein.
  const contact = await withTransaction(async (client) => resolveContactTx(client, tid, persoon));
  if (!contact) return { ok: false, reason: 'no_identity' };
  const organizationId = contact.organization_id;
  if (!organizationId) return { ok: false, reason: 'no_organization' };

  // 2. het eerste inzicht. Idempotent op (organisatie, bron, titel): dezelfde onthulling twee keer
  //    binnenkrijgen is één uitspraak. Er wordt hier bewust NIET op een sessie- of tokenwaarde
  //    ontdubbeld, want dan zou die waarde bewaard moeten worden en dat hoort hier niet.
  const zoekInzicht = async (titel) => (await query(
    `select id from customer_insight
      where tenant_id=$1 and organization_id=$2 and source=$3 and title=$4 and status <> 'archived'
      limit 1`,
    [tid, organizationId, BRON_LENS, titel])).rows[0] || null;

  let insightId = null;
  let nieuwInzicht = false;

  if (lijn) {
  const bestaand = await zoekInzicht(lijn);
  insightId = bestaand ? bestaand.id : null;
  if (!insightId) {
    // Drie lagen, en alleen de eerste twee komen uit de Lens. De uitspraak is zijn zin, de
    // onderbouwing zijn de citaten die hij zag, en de verdieping is een eerlijke uitspraak over
    // onze eigen kijkhoek: we hebben alleen van buitenaf gekeken. Dat laatste is geen bewering over
    // hun organisatie en dus geen authoring; het staat vast per perspectief en niet per klant.
    const regels = Array.isArray(d.reveal.evidence) ? d.reveal.evidence.map(bewijsregel).filter(Boolean) : [];
    const grond = regels.length ? null : grondtekst(d.reveal.evidence_count);
    const gemaakt = await createInsightWithInitialVersion({
      tenantId: tid,
      organizationId,
      // Woordelijk. Niet inkorten, niet netter maken, niet van een punt voorzien.
      title: lijn,
      stance: HOUDING[d.reveal.outcome || 'REVEAL'] || 'reveal',
      observation: lijn,
      // `basis` blijft leeg. De grond staat al als bewijsregel onder "Waarop dit rust"; hem daar
      // ook nog eens als antwoord op "Waar baseren we dit op?" zetten is dezelfde zin twee keer.
      basis: null,
      notYetKnown: VERDIEPING[V1_PERSPECTIEF] || null,
      sharing: 'SHARED',
      source: BRON_LENS,
      // Interne herkomst. Nooit klantzijdig, en zonder token: alleen wat nodig is om later te
      // kunnen navertellen waaruit dit is ontstaan.
      provenance: {
        entrance: 'lens', family: d.reveal.family || null,
        evidence_count: Number(d.reveal.evidence_count || 0) || 0,
        // De vindplaatsen, uitsluitend intern. Nooit klantzijdig teruggegeven (migratie 006).
        evidence_refs: (Array.isArray(d.reveal.evidence) ? d.reveal.evidence : []).map((e) => e.url).filter(Boolean),
      },
      status: 'new',
      observedAt: d.reveal.at || d.completed_at || null,
      // De klantzijdige grond. Zonder label telt een waarneming niet mee als bewijs, en dat is
      // precies goed: geen grond, geen bewijsregel.
      customerLabel: regels.length ? regels[0] : grond,
    });
    insightId = gemaakt.insightId;
    nieuwInzicht = true;
    // De rest van de grond. `createInsightWithInitialVersion` legt er één neer; de overige regels
    // komen hier, in dezelfde volgorde als waarin hij ze in de Lens zag.
    for (const regel of regels.slice(1)) {
      // eslint-disable-next-line no-await-in-loop
      await addObservation({
        tenantId: tid, organizationId, insightId, customerLabel: regel,
        source: BRON_LENS, stance: HOUDING[d.reveal.outcome || 'REVEAL'] || 'reveal',
        observedAt: d.reveal.at || d.completed_at || null,
      });
    }
    // De twee assen die migratie 012 toevoegde. Eén gebied, één perspectief, allebei uit de
    // gedeelde woordenschat en allebei vast in V1.
    await query('update customer_insight set area=$2, perspective=$3 where id=$1',
      [insightId, V1_GEBIED, V1_PERSPECTIEF]);
  }
  } else {
    // ---- 2b. de non-reveal ------------------------------------------------------------------
    //
    // Eén inzicht per betekenisvolle observatie, en niet één samenvattende. Een vaste zin als
    // "wij zagen geen verschil" zou voor elke organisatie identiek zijn, en dat is precies het
    // behang dat de Lens zelf uitfiltert. De observatie is wél specifiek en gegrond, dus die is
    // de uitspraak.
    //
    // De houding draagt de eerlijkheid: `non_reveal` heet klantzijdig "Hier zien we géén verschil".
    // De breedte van de blik staat in de onderbouwing en NOOIT als sterkte: meer plekken bekijken
    // maakt een afwezigheid niet waarder.
    const plekken = Number(d.observaties && d.observaties.pages_seen) || 0;
    const breedte = plekken >= 2
      ? `We keken op ${plekken} plekken op je site.`
      : 'We keken op je site.';
    const wanneer = (d.observaties && d.observaties.at) || d.completed_at || null;

    for (const o of observaties) {
      const titel = String(o.note || '').trim();
      if (!titel) continue;
      // eslint-disable-next-line no-await-in-loop
      const al = await zoekInzicht(titel);
      if (al) { insightId = insightId || al.id; continue; }

      const regels = Array.isArray(o.evidence) ? o.evidence : [];
      // eslint-disable-next-line no-await-in-loop
      const gemaakt = await createInsightWithInitialVersion({
        tenantId: tid,
        organizationId,
        title: titel,
        stance: 'non_reveal',
        observation: titel,
        meaning: o.meaning || null,
        // Hier hoort de breedte thuis, als proza en niet als getal met gewicht. En de tweede zin
        // zegt waar onze waarneming ophoudt, zonder één woord over poorten of criteria: dat is
        // onze machinerie en niet zijn vraag.
        basis: `${breedte} Dit viel ons op. Het droeg geen verschil dat we hard konden maken.`,
        // Wat we niet weten is tweeledig: de grens van dit perspectief, en de open vraag die deze
        // observatie zelf stelt. Die vraag komt woordelijk uit de Lens en wordt niet herschreven.
        notYetKnown: [VERDIEPING[V1_PERSPECTIEF] || null, o.lens || null].filter(Boolean).join(' ') || null,
        sharing: 'SHARED',
        source: BRON_LENS,
        provenance: {
          entrance: 'lens', outcome: 'SILENCE', basis: o.basis || 'inferred',
          pages_seen: plekken, subject: o.subject || null,
          evidence_refs: regels.map((e) => e.url).filter(Boolean),
        },
        status: 'new',
        observedAt: wanneer,
        customerLabel: regels.length ? bewijsregel(regels[0]) : null,
      });
      insightId = insightId || gemaakt.insightId;
      nieuwInzicht = true;

      for (const regel of regels.slice(1)) {
        const label = bewijsregel(regel);
        if (!label) continue;
        // eslint-disable-next-line no-await-in-loop
        await addObservation({
          tenantId: tid, organizationId, insightId: gemaakt.insightId, customerLabel: label,
          source: BRON_LENS, stance: 'non_reveal', observedAt: wanneer,
        });
      }

      // eslint-disable-next-line no-await-in-loop
      await query('update customer_insight set area=$2, perspective=$3 where id=$1',
        [gemaakt.insightId, V1_GEBIED, V1_PERSPECTIEF]);
    }
    if (!insightId) return { ok: false, reason: 'no_statement' };
  }

  // 3. zijn antwoord uit de Lens, met herkomst `lens`. Dat antwoord was nooit privé: het is
  //    onderzoeksdata die Maculis aantoonbaar al had. De markering houdt dat verschil hard, zodat
  //    een latere functie het nooit kan verwarren met wat hij ín de kamer antwoordt.
  //    Alleen bij een reveal: dat is de uitspraak waar hij "herken je dit" over beantwoordde. Bij
  //    een SILENCE is die vraag nooit over deze observaties gesteld, en zijn antwoord daar dan aan
  //    hangen zou een antwoord verzinnen dat hij niet gaf.
  const antwoord = lijn && d.answers && d.answers.recognition ? String(d.answers.recognition) : null;
  if (antwoord && ['ja', 'deels', 'nee'].includes(antwoord)) {
    await query(
      `insert into insight_recognition(tenant_id, organization_id, insight_id, contact_id, answer, origin, at)
       values ($1,$2,$3,$4,$5,'lens', coalesce($6::timestamptz, now()))
       on conflict (insight_id, contact_id, origin) do nothing`,
      [tid, organizationId, insightId, contact.id, antwoord, d.completed_at || null]);
  }

  // 4. de kamer. Bewaren zonder benaderen is een geldige uitkomst en geen halve toestand: de kamer
  //    staat er, en er gaat niets uit tot er toestemming is om te benaderen (ADR-0003 D2).
  const mag = d.consent === 'OPTED_IN';
  const bestaandeKamer = await kamerVoorOrganisatie(tid, organizationId);
  let roomId = bestaandeKamer ? bestaandeKamer.id : null;
  let nieuweKamer = false;
  if (!bestaandeKamer) {
    roomId = (await query(
      `insert into mijn_room(tenant_id, organization_id, status, contact_id, entrance)
       values ($1,$2,$3,$4,'lens') returning id`,
      [tid, organizationId, mag ? 'klaargezet' : 'wacht_op_contact', contact.id])).rows[0].id;
    nieuweKamer = true;
  } else if (bestaandeKamer.status === 'wacht_op_contact' && mag) {
    // Toestemming om te benaderen kwam later alsnog. Vooruit is toegestaan; terug nooit.
    await query("update mijn_room set status='klaargezet', updated_at=now() where id=$1", [roomId]);
  }

  if (nieuweKamer || nieuwInzicht) {
    await recordAudit({
      tenantId: tid, action: 'mijn_room_prepared', entityType: 'mijn_room', entityId: roomId,
      meta: {
        entrance: 'lens', nieuwe_kamer: nieuweKamer, nieuw_inzicht: nieuwInzicht,
        gebied: V1_GEBIED, perspectief: V1_PERSPECTIEF, bron: BRON_LENS,
        uitkomst: lijn ? 'REVEAL' : 'SILENCE',
        afgeleid_uit: lijn ? 'reveal_presented + account_handoff_accepted'
          : 'silence_presented + account_handoff_accepted',
        evidence_count: lijn ? Number((d.reveal && d.reveal.evidence_count) || 0) || 0 : 0,
        observaties: lijn ? 0 : observaties.length,
      },
    });
  }

  const kamer = await kamerVoorOrganisatie(tid, organizationId);
  return {
    ok: true, roomId, organizationId, contactId: contact.id, insightId,
    status: kamer ? kamer.status : null, nieuw: nieuweKamer,
  };
}
