// De eigenlijke patiëntroute. Elke stap zet een check en maakt een
// schermafbeelding, zodat het rapport te controleren is zonder de scan
// opnieuw te draaien.

import {
  AFSPRAAKKNOP_PATRONEN,
  COOKIE_PATRONEN,
  DEFAULTS,
  MAX_COOKIEBANNERS,
  MAX_ROUTESTAPPEN,
  PORTAAL_PATRONEN,
} from './config.mjs';
import {
  pauze,
  verzamelTekst,
  wachtOpTekst,
  zoekAgenda,
  zoekKlikbaar,
  zoekTijdsloten,
} from './dom.mjs';
import { veiligKlikken, VeiligheidsStop } from './safety.mjs';
import { isEigenNetwerkprobleem, NETWERK_TOELICHTING, nettFoutmelding } from './tekst.mjs';

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

export async function voerScanUit({ context, locatie, logger, schermafbeelding, diagnose, opties = {} }) {
  // diagnose is optioneel, zodat bestaande aanroepen blijven werken.
  const legDiagnoseVast = diagnose ?? (async () => {});
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
  // De wizard speelt zich af op het laatst geopende tabblad. De locatiepagina
  // blijft daarnaast open staan, en tekst daarvan mag de metingen niet
  // vervuilen. Een openingstijdenblok met weekdagen zou anders als agenda
  // worden gelezen.
  const actievePaginas = () => {
    const lijst = paginas();
    const laatste = lijst[lijst.length - 1];
    return laatste ? [laatste] : [];
  };
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
    const eigenNetwerk = isEigenNetwerkprobleem(err);
    const toelichting = eigenNetwerk
      ? `De pagina kon niet geladen worden. Technische melding: ${nettFoutmelding(err)}. ${NETWERK_TOELICHTING}`
      : `De pagina kon niet geladen worden. Technische melding: ${nettFoutmelding(err)}`;
    zet('websiteBereikbaar', 'NEE', toelichting, { eigenNetwerk });
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

  await accepteerCookies(paginas, logger, { eersteRonde: true });
  await pauze(800);
  await schermafbeelding(page, 'locatiepagina');
  await legDiagnoseVast('locatiepagina');

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

  const onlineIngang = await onderzoekOnlineIngang(paginas, logger);

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

  // Stap 4. Klikken en de route naar het portaal volgen.
  logger.stap('Stap 4. Afspraakknop aanklikken en de route naar Mijn Zorgtoegang volgen.');
  const actief = () => {
    const lijst = paginas();
    return lijst[lijst.length - 1] ?? page;
  };

  const eersteKlik = await volgKlik({
    context,
    treffer: knop,
    paginas,
    logger,
    label: 'afspraakknop',
    navigatieTimeout,
  });

  if (!eersteKlik.gelukt) {
    zet(
      'portaalBereikbaar',
      'NEE',
      `De knop is wel zichtbaar, maar reageerde niet op een klik, ook niet na het wegklikken van de cookiemelding. Technische melding: ${nettFoutmelding(eersteKlik.fout)}`,
    );
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    await schermafbeelding(actief(), 'klik-mislukt');
    await legDiagnoseVast('klik-mislukt');
    return { checks, gestoptBij: 'stap 4, klikken op de afspraakknop' };
  }

  const route = await volgRouteNaarPortaal({
    context,
    paginas,
    locatie,
    logger,
    schermafbeelding,
    legDiagnoseVast,
    actief,
    portaalTimeout,
    navigatieTimeout,
  });
  const portaal = route.portaal;

  await pauze(1200);
  await schermafbeelding(actief(), 'portaal');
  await legDiagnoseVast('portaal');

  if (!portaal) {
    const urls = paginas().map((p) => p.url()).join(' , ');
    zet(
      'portaalBereikbaar',
      'NEE',
      `Mijn Zorgtoegang werd niet bereikt na ${route.stappen} stap of stappen vanaf de locatiepagina. Actieve adressen: ${urls}. Gevolgde route: ${route.spoor.join(' naar ') || 'geen vervolgstap gevonden'}.`,
      {
        spoor: route.spoor,
        adressen: urls.split(' , '),
        geenPortaalLink: onlineIngang.portaalLinks.length === 0,
        telefonischAdvies: onlineIngang.telefonisch,
      },
    );
    zet('behandelingBeschikbaar', 'NVT');
    zet('agendaGeladen', 'NVT');
    zet('beschikbareTijden', 'NVT');
    return { checks, gestoptBij: 'stap 4, route naar Mijn Zorgtoegang' };
  }
  zet('portaalBereikbaar', 'JA', `Herkend via ${portaal.bron} op ${portaal.url}`);

  // Stap 5. De wizard doorlopen tot aan de agenda.
  logger.stap('Stap 5. Afspraakflow doorlopen tot aan de agenda.');
  const wizard = await doorloopWizard({
    paginas: actievePaginas,
    locatie,
    logger,
    schermafbeelding,
    legDiagnoseVast,
    actief,
    zoekTimeout,
  });

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
  const agenda = wizard.agenda ?? (await zoekAgenda(actievePaginas));
  if (agenda) {
    zet('agendaGeladen', 'JA', `Agenda herkend via ${agenda.bron}.`);
  } else if (wizard.persoonsgegevensBereikt) {
    zet(
      'agendaGeladen',
      'NEE',
      'Het portaal vraagt om persoonsgegevens voordat het beschikbare tijden toont. De scan stopt daar en vult niets in, dus of er tijden zijn is langs deze weg niet vast te stellen.',
      { persoonsgegevensVoorAgenda: true },
    );
  } else {
    zet('agendaGeladen', 'NEE', `Geen kalender zichtbaar. Laatst gezien scherm: ${wizard.laatsteScherm}`);
  }

  await pauze(1500);
  await schermafbeelding(actief(), 'agenda');
  await legDiagnoseVast('agenda');

  if (agenda) {
    const tijden = await zoekTijdsloten(actievePaginas);
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
  await legDiagnoseVast('stoppunt');

  return { checks, gestoptBij };
}

// Klikt alle consentlagen weg. Op topzorggroep.nl staan er twee tegelijk, en
// zolang er een blijft staan vangt die elke klik op. Ze kunnen elkaar ook
// afdekken, dus een knop die nog niet klikbaar is betekent niet dat we klaar
// zijn: dan is een andere consentlaag eerst aan de beurt.
// Herkent het scherm waar het portaal om persoonsgegevens vraagt. De scan
// vult daar niets in en stopt. Ontwerpprincipe 2 uit de opdracht.
const PERSOONSVELD_SELECTOR = [
  'input[name*="naam" i]',
  'input[id*="naam" i]',
  'input[name*="voornaam" i]',
  'input[name*="achternaam" i]',
  'input[name*="geboorte" i]',
  'input[id*="geboorte" i]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[name*="bsn" i]',
].join(', ');

async function vraagtOmPersoonsgegevens(geefPaginas) {
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      try {
        const veld = frame.locator(PERSOONSVELD_SELECTOR).first();
        if ((await veld.count()) > 0 && (await veld.isVisible())) return true;
      } catch {
        // volgende frame
      }
    }
  }
  return false;
}

async function accepteerCookies(paginas, logger, { eersteRonde = false } = {}) {
  // Snelle voorcontrole, zodat een pagina zonder banner geen tijd kost.
  const eersteTreffer = await zoekKlikbaar(paginas, COOKIE_PATRONEN, {
    timeoutMs: eersteRonde ? 5000 : 1500,
    pollMs: 400,
  });
  if (!eersteTreffer) return false;

  let weggeklikt = 0;

  for (let ronde = 0; ronde < MAX_COOKIEBANNERS; ronde += 1) {
    let ietsGeklikt = false;

    for (const patroon of COOKIE_PATRONEN) {
      const treffer = await zoekKlikbaar(paginas, [patroon], { timeoutMs: 700, pollMs: 250 });
      if (!treffer) continue;
      try {
        await veiligKlikken(treffer.locator, logger, { context: 'cookiebanner', timeoutMs: 3000 });
        weggeklikt += 1;
        ietsGeklikt = true;
        await pauze(900);
        break;
      } catch {
        logger.info(
          `Consentknop "${treffer.label || patroon.source}" was nog niet klikbaar. Waarschijnlijk ligt er een andere laag overheen, dus ik probeer de volgende.`,
        );
      }
    }

    if (!ietsGeklikt) break;
  }

  if (weggeklikt > 0) logger.info(`${weggeklikt} consentlaag of lagen weggeklikt.`);
  return weggeklikt > 0;
}

// Klikt, en probeert het bij een timeout nog een keer nadat eventuele
// overlays zijn weggeklikt. Een timeout op een zichtbare knop betekent bijna
// altijd dat er iets overheen ligt.
async function klikMetHerstel(treffer, paginas, logger, context) {
  try {
    return { gelukt: true, label: await veiligKlikken(treffer.locator, logger, { context }) };
  } catch (err) {
    if (err instanceof VeiligheidsStop) throw err;
    logger.waarschuwing(`Eerste klikpoging op ${context} mislukte. Technische melding: ${nettFoutmelding(err)}`);

    await accepteerCookies(paginas, logger);
    try {
      await treffer.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
    } catch {
      // niet erg, de klik probeert het zelf ook
    }

    try {
      return { gelukt: true, label: await veiligKlikken(treffer.locator, logger, { context }) };
    } catch (tweede) {
      if (tweede instanceof VeiligheidsStop) throw tweede;
      return { gelukt: false, fout: tweede };
    }
  }
}

// Kijkt of de locatiepagina uberhaupt naar een online afsprakenportaal wijst.
// Zonder deze vaststelling leest een mislukte route als "de knop werkt niet",
// terwijl de werkelijkheid kan zijn dat er helemaal geen online ingang is.
async function onderzoekOnlineIngang(geefPaginas, logger) {
  const adressen = [];
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      try {
        const gevonden = await frame.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map((a) => a.href),
        );
        adressen.push(...gevonden);
      } catch {
        // frame kan verdwijnen
      }
    }
  }

  const portaalLinks = adressen.filter((a) => /zorgtoegang/i.test(a));
  const tekst = await verzamelTekst(geefPaginas);
  const telefonisch = /(wil je een afspraak maken\?\s*bel|afspraak[^.]{0,60}\bbel\b|telefonisch een afspraak)/i.test(tekst);

  logger.info(
    portaalLinks.length > 0
      ? `De pagina bevat ${portaalLinks.length} verwijzing of verwijzingen naar het afsprakenportaal.`
      : 'De pagina bevat geen enkele verwijzing naar een online afsprakenportaal.',
  );

  return { portaalLinks, telefonisch };
}

// Klikt en handelt af wat de klik oplevert: een nieuw tabblad, een navigatie
// in hetzelfde tabblad, of niets van beide.
async function volgKlik({ context, treffer, paginas, logger, label, navigatieTimeout }) {
  const paginaBelofte = context.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  const uitkomst = await klikMetHerstel(treffer, paginas, logger, label);
  if (!uitkomst.gelukt) return uitkomst;

  const nieuwePagina = await paginaBelofte;
  if (nieuwePagina) {
    logger.info('De klik opende een nieuw tabblad.');
    try {
      await nieuwePagina.waitForLoadState('domcontentloaded', { timeout: navigatieTimeout });
    } catch {
      logger.waarschuwing('Het nieuwe tabblad werd niet volledig geladen binnen de tijdslimiet.');
    }
  } else {
    await pauze(2000);
  }

  await accepteerCookies(paginas, logger);
  return uitkomst;
}

// Volgt de route van de locatiepagina naar het portaal. De knop op een
// locatiepagina landt niet altijd meteen bij Mijn Zorgtoegang. Er kan eerst een
// algemene afspraakpagina komen waar nog een ingang of een vestiging gekozen
// moet worden. Zonder deze stap meldt de scan onterecht dat er geen online
// route is.
async function volgRouteNaarPortaal({
  context,
  paginas,
  locatie,
  logger,
  schermafbeelding,
  legDiagnoseVast,
  actief,
  portaalTimeout,
  navigatieTimeout,
}) {
  const spoor = [];
  const bezocht = new Set();
  let stappen = 0;

  for (let i = 0; i <= MAX_ROUTESTAPPEN; i += 1) {
    // Kort wachten per hop. Alleen de laatste poging krijgt de volle tijd,
    // want dan is er geen vervolgstap meer om op terug te vallen.
    const wachttijd = i === MAX_ROUTESTAPPEN ? portaalTimeout : 12000;
    const portaal = await wachtOpPortaal(paginas, locatie, wachttijd, logger);
    if (portaal) return { portaal, spoor, stappen };

    if (i === MAX_ROUTESTAPPEN) break;

    const naam = `route-${String(i).padStart(2, '0')}`;
    await schermafbeelding(actief(), naam);
    await legDiagnoseVast(naam);

    const huidigAdres = actief().url();
    logger.info(`Nog geen Mijn Zorgtoegang op ${huidigAdres}. Zoek een vervolgstap.`);

    if (bezocht.has(huidigAdres)) {
      logger.waarschuwing(`De route komt terug op ${huidigAdres} en draait in een kring. De route stopt hier.`);
      break;
    }
    bezocht.add(huidigAdres);

    // Eerst een expliciete verwijzing naar online plannen, dan de vestiging
    // zelf, en pas daarna een algemene afspraakknop. Menu en voettekst tellen
    // niet mee: een menu-item dat alle vestigingen opsomt matcht anders op de
    // naam van de gezochte vestiging en leidt de route het overzicht in.
    const kandidaten = [
      ...PORTAAL_PATRONEN,
      ...(locatie.vervolgkeuzes ?? []),
      ...AFSPRAAKKNOP_PATRONEN,
    ];
    const vervolg = await zoekKlikbaar(paginas, kandidaten, {
      timeoutMs: 6000,
      pollMs: 400,
      maxLabelLengte: 80,
      mijdNavigatie: true,
    });
    if (!vervolg) {
      logger.waarschuwing('Geen vervolgstap gevonden buiten menu en voettekst. De route stopt hier.');
      break;
    }

    const uitkomst = await volgKlik({
      context,
      treffer: vervolg,
      paginas,
      logger,
      label: `vervolgstap ${i + 1}`,
      navigatieTimeout,
    });
    if (!uitkomst.gelukt) {
      logger.waarschuwing('De vervolgstap reageerde niet op een klik. De route stopt hier.');
      break;
    }

    stappen += 1;
    spoor.push((uitkomst.label || vervolg.patroon.source).replace(/\s+/g, ' ').slice(0, 60));

    if (actief().url() === huidigAdres) {
      logger.waarschuwing('De vervolgstap leverde geen nieuwe pagina op. De route stopt hier.');
      break;
    }
  }

  return { portaal: null, spoor, stappen };
}

function hostVan(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

async function wachtOpPortaal(paginas, locatie, timeoutMs, logger) {
  const deadline = Date.now() + timeoutMs;
  const eigenHost = hostVan(locatie.url);

  while (Date.now() < deadline) {
    for (const p of paginas()) {
      for (const frame of p.frames()) {
        const url = frame.url();
        if (locatie.portaalHost.test(url)) {
          return { bron: frame === p.mainFrame() ? 'adres van de pagina' : 'iframe', url };
        }
      }
    }

    // Tekstherkenning telt alleen buiten de eigen website. Anders wordt een
    // simpele vermelding van Mijn Zorgtoegang op een informatiepagina al
    // aangezien voor het portaal zelf.
    const lijst = paginas();
    const laatste = lijst[lijst.length - 1];
    if (laatste && hostVan(laatste.url()) !== eigenHost) {
      const tekst = await wachtOpTekst(paginas, [/zorgtoegang/i], 1000, 300);
      if (tekst) return { bron: 'tekst op het scherm', url: laatste.url() };
    }

    await pauze(400);
  }

  logger.fout('Mijn Zorgtoegang is niet verschenen binnen de tijdslimiet.');
  return null;
}

async function doorloopWizard({ paginas, locatie, logger, schermafbeelding, legDiagnoseVast, actief, zoekTimeout }) {
  const volgorde = ['aandachtsgebied', 'behandeling', 'verwijzing'];
  let vorigScherm = '';
  let stilstand = 0;
  let persoonsgegevensBereikt = false;
  const gekozen = { aandachtsgebied: null, behandeling: null, verwijzing: null };
  let agenda = null;
  let laatsteScherm = '';

  for (let i = 0; i < MAX_WIZARD_STAPPEN; i += 1) {
    await pauze(1200);
    const naam = `wizard-${String(i).padStart(2, '0')}`;
    await schermafbeelding(actief(), naam);
    await legDiagnoseVast(naam);

    agenda = await zoekAgenda(paginas);
    const tijden = agenda ? await zoekTijdsloten(paginas, 3) : [];
    if (agenda && tijden.length > 0) {
      logger.ok('Agenda met tijdsloten bereikt. De wizard stopt hier.');
      break;
    }

    const schermTekst = (await verzamelTekst(paginas)).replace(/\s+/g, ' ').trim();
    laatsteScherm = schermTekst.slice(0, 200);

    // Harde grens. Zodra het portaal om persoonsgegevens vraagt, is de publieke
    // route uitgelopen en gaat de scan geen stap verder.
    if (await vraagtOmPersoonsgegevens(paginas)) {
      persoonsgegevensBereikt = true;
      logger.ok('Het scherm voor persoonsgegevens is bereikt. De scan stopt hier en vult niets in.');
      break;
    }

    // Stilstand herkennen. Blijft het scherm identiek, dan heeft doorklikken
    // geen zin meer en levert het alleen een misleidend lange run op.
    if (schermTekst === vorigScherm) {
      stilstand += 1;
      if (stilstand >= 2) {
        logger.waarschuwing('Het scherm verandert niet meer na twee pogingen. De wizard stopt hier.');
        break;
      }
    } else {
      stilstand = 0;
    }
    vorigScherm = schermTekst;

    let geklikt = false;
    for (const stap of volgorde) {
      if (gekozen[stap]) continue;
      const patronen = locatie.keuzes[stap] ?? [];
      const treffer = await zoekKlikbaar(paginas, patronen, { timeoutMs: 2500, pollMs: 300 });
      if (!treffer) continue;
      try {
        const label = await veiligKlikken(treffer.locator, logger, { context: `keuze ${stap}`, timeoutMs: 6000 });
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
        logger.waarschuwing(`Keuze ${stap} kon niet aangeklikt worden. Technische melding: ${nettFoutmelding(err)}`);
      }
    }

    if (!geklikt) {
      const tussen = await zoekKlikbaar(paginas, TUSSENSTAP_PATRONEN, { timeoutMs: 2500, pollMs: 300 });
      if (tussen) {
        try {
          await veiligKlikken(tussen.locator, logger, { context: 'tussenstap', timeoutMs: 6000 });
          geklikt = true;
        } catch (err) {
          logger.waarschuwing(`Tussenstap kon niet aangeklikt worden. Technische melding: ${nettFoutmelding(err)}`);
        }
      }
    }

    if (!geklikt) {
      logger.waarschuwing('Geen bruikbare vervolgstap gevonden. De wizard stopt hier.');
      break;
    }
  }

  if (!agenda) agenda = await zoekAgenda(paginas);
  return { gekozen, agenda, laatsteScherm, persoonsgegevensBereikt };
}
