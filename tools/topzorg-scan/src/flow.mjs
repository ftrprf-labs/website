// De eigenlijke patiëntroute. Elke stap zet een check en maakt een
// schermafbeelding, zodat het rapport te controleren is zonder de scan
// opnieuw te draaien.

import { AFSPRAAKKNOP_PATRONEN, COOKIE_PATRONEN, DEFAULTS } from './config.mjs';
import { pauze, verzamelTekst, wachtOpTekst, zoekAgenda, zoekKlikbaar, zoekTijdsloten } from './dom.mjs';
import { veiligKlikken, VeiligheidsStop } from './safety.mjs';

// Neutrale doorklikstappen in de wizard. Deze kiezen niets inhoudelijks en
// leggen niets vast.
const TUSSENSTAP_PATRONEN = [
  /geen voorkeur/i,
  /maakt niet uit/i,
  /^volgende$/i,
  /^verder$/i,
  /ga verder/i,
  /kies (een )?datum/i,
  /naar (de )?agenda/i,
];

const MAX_WIZARD_STAPPEN = 10;

export async function voerScanUit({ context, locatie, logger, schermafbeelding, opties = {} }) {
  const navigatieTimeout = opties.navigatieTimeoutMs ?? DEFAULTS.navigatieTimeoutMs;
  const zoekTimeout = opties.zoekTimeoutMs ?? DEFAULTS.zoekTimeoutMs;
  const portaalTimeout = opties.portaalTimeoutMs ?? DEFAULTS.portaalTimeoutMs;

  const checks = {};
  const zet = (sleutel, waarde, detail = '', meta = undefined) => {
    checks[sleutel] = { waarde, detail, ...(meta ? { meta } : {}) };
    logger[waarde === 'JA' ? 'ok' : waarde === 'NVT' ? 'info' : 'fout'](
      `Check ${sleutel}: ${waarde}${detail ? `. ${detail}` : ''}`,
    );
  };

  const paginas = () => context.pages().filter((p) => !p.isClosed());
  let gestoptBij = 'onbekend';

  const page = await context.newPage();
  page.setDefaultTimeout(zoekTimeout);

  // Stap 1. Locatiepagina openen.
  logger.stap(`Stap 1. Locatiepagina openen: ${locatie.url}`);
  let respons = null;
  try {
    respons = await page.goto(locatie.url, {
      waitUntil: 'domcontentloaded',
      timeout: navigatieTimeout,
    });
  } catch (err) {
    zet('websiteBereikbaar', 'NEE', `De pagina kon niet geladen worden. Technische melding: ${err.message}`);
    zet('locatieHerkenbaar', 'NVT');
    zet('afspraakknop', 'NVT');
    zet('portaalBereikbaar', 'NVT');
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    await schermafbeelding(page, 'locatiepagina-mislukt');
    return { checks, gestoptBij: 'stap 1, locatiepagina laden' };
  }

  const statusCode = respons ? respons.status() : 0;
  if (!respons || statusCode >= 400) {
    zet('websiteBereikbaar', 'NEE', `De server antwoordde met HTTP status ${statusCode}.`);
  } else {
    zet('websiteBereikbaar', 'JA', `HTTP status ${statusCode} op ${page.url()}`);
  }

  await accepteerCookies(paginas, logger);
  await pauze(800);
  await schermafbeelding(page, 'locatiepagina');

  if (checks.websiteBereikbaar.waarde === 'NEE') {
    zet('locatieHerkenbaar', 'NVT');
    zet('afspraakknop', 'NVT');
    zet('portaalBereikbaar', 'NVT');
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    return { checks, gestoptBij: 'stap 1, locatiepagina laden' };
  }

  // Stap 2. Herkennen we de vestiging?
  logger.stap('Stap 2. Vestiging herkennen op de pagina.');
  const paginaTekst = await verzamelTekst(paginas);
  const ontbrekend = locatie.herkenning.filter((p) => !p.test(paginaTekst));
  if (ontbrekend.length === 0) {
    zet('locatieHerkenbaar', 'JA', 'Alle herkenningswoorden staan op de pagina.');
  } else {
    zet(
      'locatieHerkenbaar',
      'NEE',
      `Deze herkenningswoorden ontbreken: ${ontbrekend.map((p) => p.source).join(', ')}.`,
    );
  }

  // Stap 3. Afspraakknop zoeken.
  logger.stap('Stap 3. Afspraakknop zoeken.');
  const knop = await zoekKlikbaar(paginas, AFSPRAAKKNOP_PATRONEN, { timeoutMs: zoekTimeout });
  if (!knop) {
    zet('afspraakknop', 'NEE', 'Geen zichtbare knop of link naar een online afspraak gevonden.');
    zet('portaalBereikbaar', 'NVT');
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    await schermafbeelding(page, 'geen-afspraakknop');
    return { checks, gestoptBij: 'stap 3, afspraakknop zoeken' };
  }
  zet('afspraakknop', 'JA', `Gevonden knop: "${knop.label || knop.patroon.source}".`);

  // Stap 4. Klikken en wachten op het portaal.
  logger.stap('Stap 4. Afspraakknop aanklikken en wachten op Mijn Zorgtoegang.');
  const paginaBelofte = context.waitForEvent('page', { timeout: 10000 }).catch(() => null);
  try {
    await veiligKlikken(knop.locator, logger, { context: 'afspraakknop' });
  } catch (err) {
    if (err instanceof VeiligheidsStop) throw err;
    zet('portaalBereikbaar', 'NEE', `De knop kon niet aangeklikt worden. Technische melding: ${err.message}`);
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    await schermafbeelding(page, 'klik-mislukt');
    return { checks, gestoptBij: 'stap 4, klikken op de afspraakknop' };
  }

  const nieuwePagina = await paginaBelofte;
  if (nieuwePagina) {
    logger.info('De knop opende een nieuw tabblad.');
    try {
      await nieuwePagina.waitForLoadState('domcontentloaded', { timeout: navigatieTimeout });
    } catch {
      logger.waarschuwing('Het nieuwe tabblad werd niet volledig geladen binnen de tijdslimiet.');
    }
  }

  const portaal = await wachtOpPortaal(paginas, locatie, portaalTimeout, logger);
  await accepteerCookies(paginas, logger);
  const actief = () => {
    const lijst = paginas();
    return lijst[lijst.length - 1] ?? page;
  };
  await pauze(1200);
  await schermafbeelding(actief(), 'portaal');

  if (!portaal) {
    const urls = paginas().map((p) => p.url()).join(' , ');
    zet('portaalBereikbaar', 'NEE', `Mijn Zorgtoegang werd niet herkend. Actieve adressen: ${urls}`);
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    return { checks, gestoptBij: 'stap 4, wachten op Mijn Zorgtoegang' };
  }
  zet('portaalBereikbaar', 'JA', `Herkend via ${portaal.bron} op ${portaal.url}`);

  // Stap 5. De wizard doorlopen tot aan de agenda.
  logger.stap('Stap 5. Afspraakflow doorlopen tot aan de agenda.');
  const wizard = await doorloopWizard({ paginas, locatie, logger, schermafbeelding, actief, zoekTimeout });

  if (wizard.gekozen.behandeling) {
    zet('behandelingBeschikbaar', 'JA', `Gekozen behandeling: "${wizard.gekozen.behandeling}".`);
  } else {
    zet(
      'behandelingBeschikbaar',
      'NEE',
      `Geen keuze voor een intake gevonden. Laatst gezien scherm: ${wizard.laatsteScherm}`,
    );
  }

  // Stap 6. Agenda en tijden.
  logger.stap('Stap 6. Agenda en beschikbare tijden controleren.');
  const agenda = wizard.agenda ?? (await zoekAgenda(paginas));
  if (agenda) {
    zet('agendaGeladen', 'JA', `Agenda herkend via ${agenda.bron}.`);
  } else {
    zet('agendaGeladen', 'NEE', `Geen kalender zichtbaar. Laatst gezien scherm: ${wizard.laatsteScherm}`);
  }

  await pauze(1500);
  await schermafbeelding(actief(), 'agenda');

  if (agenda) {
    const tijden = await zoekTijdsloten(paginas);
    if (tijden.length > 0) {
      zet(
        'beschikbareTijden',
        'JA',
        `${tijden.length} tijdsloten zichtbaar, bijvoorbeeld ${tijden.slice(0, 5).join(', ')}.`,
        { aantal: tijden.length, voorbeelden: tijden.slice(0, 10) },
      );
    } else {
      zet('beschikbareTijden', 'NEE', 'De agenda toont geen klikbare tijdsloten.');
    }
  } else {
    zet('beschikbareTijden', 'NVT');
  }

  gestoptBij = 'stap 6, na het tonen van de agenda en voor elke bevestiging';
  logger.ok('Scan gestopt voor het bevestigingsscherm. Er is geen afspraak vastgelegd.');
  await schermafbeelding(actief(), 'stoppunt');

  return { checks, gestoptBij };
}

async function accepteerCookies(paginas, logger) {
  const treffer = await zoekKlikbaar(paginas, COOKIE_PATRONEN, { timeoutMs: 4000, pollMs: 400 });
  if (!treffer) return false;
  try {
    await veiligKlikken(treffer.locator, logger, { context: 'cookiebanner' });
    await pauze(600);
    return true;
  } catch (err) {
    logger.waarschuwing(`Cookiebanner niet weggeklikt. Technische melding: ${err.message}`);
    return false;
  }
}

async function wachtOpPortaal(paginas, locatie, timeoutMs, logger) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const p of paginas()) {
      for (const frame of p.frames()) {
        const url = frame.url();
        if (locatie.portaalHost.test(url)) {
          return { bron: frame === p.mainFrame() ? 'adres van de pagina' : 'iframe', url };
        }
      }
    }
    const tekst = await wachtOpTekst(paginas, [/zorgtoegang/i], 1000, 300);
    if (tekst) {
      const lijst = paginas();
      return { bron: 'tekst op het scherm', url: lijst[lijst.length - 1]?.url() ?? '' };
    }
  }
  logger.fout('Mijn Zorgtoegang is niet verschenen binnen de tijdslimiet.');
  return null;
}

async function doorloopWizard({ paginas, locatie, logger, schermafbeelding, actief, zoekTimeout }) {
  const volgorde = ['aandachtsgebied', 'behandeling', 'verwijzing'];
  const gekozen = { aandachtsgebied: null, behandeling: null, verwijzing: null };
  let agenda = null;
  let laatsteScherm = '';

  for (let i = 0; i < MAX_WIZARD_STAPPEN; i += 1) {
    await pauze(1200);
    await schermafbeelding(actief(), `wizard-${String(i).padStart(2, '0')}`);

    agenda = await zoekAgenda(paginas);
    const tijden = agenda ? await zoekTijdsloten(paginas, 3) : [];
    if (agenda && tijden.length > 0) {
      logger.ok('Agenda met tijdsloten bereikt. De wizard stopt hier.');
      break;
    }

    laatsteScherm = (await verzamelTekst(paginas)).replace(/\s+/g, ' ').trim().slice(0, 200);

    let geklikt = false;
    for (const stap of volgorde) {
      if (gekozen[stap]) continue;
      const patronen = locatie.keuzes[stap] ?? [];
      const treffer = await zoekKlikbaar(paginas, patronen, { timeoutMs: 2500, pollMs: 300 });
      if (!treffer) continue;
      try {
        const label = await veiligKlikken(treffer.locator, logger, { context: `keuze ${stap}` });
        // Een enkel scherm kan meerdere keuzes tegelijk afhandelen. Markeer
        // daarom elke nog openstaande stap waar het label ook op past.
        for (const kandidaat of volgorde) {
          if (gekozen[kandidaat]) continue;
          const past = (locatie.keuzes[kandidaat] ?? []).some((p) => p.test(label));
          if (kandidaat === stap || past) gekozen[kandidaat] = label || treffer.patroon.source;
        }
        geklikt = true;
        break;
      } catch (err) {
        logger.waarschuwing(`Keuze ${stap} kon niet aangeklikt worden. Technische melding: ${err.message}`);
      }
    }

    if (!geklikt) {
      const tussen = await zoekKlikbaar(paginas, TUSSENSTAP_PATRONEN, { timeoutMs: 2500, pollMs: 300 });
      if (tussen) {
        try {
          await veiligKlikken(tussen.locator, logger, { context: 'tussenstap' });
          geklikt = true;
        } catch (err) {
          logger.waarschuwing(`Tussenstap kon niet aangeklikt worden. Technische melding: ${err.message}`);
        }
      }
    }

    if (!geklikt) {
      logger.waarschuwing('Geen bruikbare vervolgstap gevonden. De wizard stopt hier.');
      break;
    }
  }

  if (!agenda) agenda = await zoekAgenda(paginas);
  return { gekozen, agenda, laatsteScherm };
}
