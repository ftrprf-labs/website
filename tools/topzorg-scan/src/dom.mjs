// Robuuste zoekhulpen. De DOM van een externe site en van het portaal kan
// veranderen, dus zoeken we op betekenis (rol, zichtbare tekst) en niet op
// broze CSS selectors. Alles zoekt in elke open pagina en in elk iframe,
// omdat het afsprakenwidget vaak in een iframe of in een nieuw tabblad zit.

import { VERBODEN_LABELS } from './safety.mjs';

export const pauze = (ms) => new Promise((r) => setTimeout(r, ms));

const KLIKBARE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="tab"]',
  'label',
  'li',
  '.card',
  '[class*="card"]',
  '[class*="tile"]',
  '[class*="option"]',
  '[class*="choice"]',
  '[class*="keuze"]',
].join(', ');

function frameFabrieken(patroon) {
  return [
    (f) => f.getByRole('button', { name: patroon }),
    (f) => f.getByRole('link', { name: patroon }),
    (f) => f.getByRole('radio', { name: patroon }),
    (f) => f.getByRole('option', { name: patroon }),
    (f) => f.getByRole('tab', { name: patroon }),
    (f) => f.locator(KLIKBARE_SELECTOR).filter({ hasText: patroon }),
  ];
}

async function labelVan(locator) {
  for (const lees of [
    () => locator.innerText({ timeout: 1000 }),
    () => locator.getAttribute('aria-label'),
    () => locator.getAttribute('title'),
  ]) {
    try {
      const waarde = (await lees()) || '';
      if (waarde.trim()) return waarde.trim().replace(/\s+/g, ' ');
    } catch {
      // volgende poging
    }
  }
  return '';
}

// Weegt kandidaten die op hetzelfde patroon passen. Een locatiepagina bevat
// vaak meerdere knoppen met dezelfde tekst: een in het menu, een in de tekst en
// een in de voettekst. Zonder weging pakt de scan willekeurig de eerste in de
// DOM, en dat is meestal het menu.
async function analyseer(locator) {
  try {
    return await locator.evaluate((el) => {
      let score = 0;
      const href = (el.getAttribute && el.getAttribute('href')) || '';
      if (/zorgtoegang/i.test(href)) score += 6;
      if (/afspraak|booking|boeken|online/i.test(href)) score += 3;
      const inNavigatie = Boolean(el.closest && el.closest('nav, header, footer'));
      if (!inNavigatie) score += 1;

      // Het element zelf moet interactief zijn. Keuzekaarten in een portaal
      // bestaan uit een omhullende div met daarin het echte label. Een klik op
      // die div landt soms op de rand en doet dan niets, terwijl een klik op
      // het label wel werkt.
      const rol = (el.getAttribute && el.getAttribute('role')) || '';
      if (['A', 'BUTTON', 'LABEL', 'INPUT', 'SELECT'].includes(el.tagName)) score += 3;
      else if (['button', 'option', 'radio', 'tab', 'link'].includes(rol)) score += 3;

      return { score, inNavigatie };
    });
  } catch {
    return { score: 0, inNavigatie: false };
  }
}

// Zoekt het best passende zichtbare klikbare element. Patronen zijn geordend
// van specifiek naar algemeen; het eerste patroon met een treffer wint, en
// binnen dat patroon wint de kandidaat met de hoogste score.
//
// maxLabelLengte en mijdNavigatie zijn er tegen een valkuil die zich in de
// praktijk meteen wreekte: een menu-item dat alle vestigingen opsomt, bevat de
// naam van de gezochte vestiging als onderliggende tekst en matcht daardoor op
// een patroon dat voor een echte keuzeknop bedoeld was.
export async function zoekKlikbaar(geefPaginas, patronen, opties = {}) {
  const {
    timeoutMs = 20000,
    pollMs = 500,
    slaVerbodenOver = true,
    maxKandidaten = 12,
    maxLabelLengte = 0,
    mijdNavigatie = false,
  } = opties;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const patroon of patronen) {
      let beste = null;
      for (const page of geefPaginas()) {
        if (page.isClosed()) continue;
        for (const frame of page.frames()) {
          for (const fabriek of frameFabrieken(patroon)) {
            let elementen = [];
            try {
              elementen = (await fabriek(frame).all()).slice(0, maxKandidaten);
            } catch {
              continue;
            }
            for (const locator of elementen) {
              try {
                if (!(await locator.isVisible())) continue;
              } catch {
                continue;
              }
              const label = await labelVan(locator);
              // Zonder leesbaar label overslaan. Keuzekaarten in het portaal
              // bestaan uit een verborgen radio-input met daarnaast een label.
              // De input matcht wel op naam maar is niet aanklikbaar, dus zonder
              // deze regel klikt de scan vijftien seconden op niets.
              if (!label) continue;
              if (slaVerbodenOver && VERBODEN_LABELS.some((p) => p.test(label))) continue;
              if (maxLabelLengte && label.length > maxLabelLengte) continue;
              const { score, inNavigatie } = await analyseer(locator);
              if (mijdNavigatie && inNavigatie) continue;
              if (!beste || score > beste.score) beste = { locator, page, frame, patroon, label, score };
            }
          }
        }
      }
      if (beste) return beste;
    }
    await pauze(pollMs);
  }

  return null;
}

// Alle zichtbare tekst van alle open pagina's en frames, samengevoegd.
export async function verzamelTekst(geefPaginas) {
  const delen = [];
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      try {
        delen.push(await frame.locator('body').innerText({ timeout: 5000 }));
      } catch {
        // frame kan tussentijds verdwijnen
      }
    }
  }
  return delen.join('\n');
}

export async function wachtOpTekst(geefPaginas, patronen, timeoutMs = 20000, pollMs = 500) {
  const deadline = Date.now() + timeoutMs;
  const lijst = Array.isArray(patronen) ? patronen : [patronen];
  while (Date.now() < deadline) {
    const tekst = await verzamelTekst(geefPaginas);
    const treffer = lijst.find((p) => p.test(tekst));
    if (treffer) return { treffer, tekst };
    await pauze(pollMs);
  }
  return null;
}

const AGENDA_SELECTOR = [
  '[role="grid"]',
  'table',
  '[class*="calendar"]',
  '[class*="kalender"]',
  '[class*="agenda"]',
  '[class*="datepicker"]',
  '[class*="date-picker"]',
  '[class*="daypicker"]',
].join(', ');

const WEEKDAG_PATROON =
  /(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)|(\bma\b.*\bdi\b.*\bwo\b)/i;

// Een agenda is geladen als er een kalendercomponent zichtbaar is, of als de
// pagina een weekdagreeks toont. Beide signalen tellen.
export async function zoekAgenda(geefPaginas) {
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      try {
        const locator = frame.locator(AGENDA_SELECTOR).first();
        if ((await locator.count()) > 0 && (await locator.isVisible())) {
          return { bron: 'component', page, frame, locator };
        }
      } catch {
        // volgende frame
      }
    }
  }

  const tekst = await verzamelTekst(geefPaginas);
  if (WEEKDAG_PATROON.test(tekst)) {
    return { bron: 'weekdagen', page: null, frame: null, locator: null };
  }
  return null;
}

const TIJD_PATROON = /\b([01]?\d|2[0-3])[:.][0-5]\d\b/;

// Tijdsloten zijn klikbare elementen waarvan de tekst een kloktijd is.
// Losse tijden in een openingstijdenblok tellen niet mee, want die zitten niet
// in een knop of lijstitem binnen de agenda.
export async function zoekTijdsloten(geefPaginas, maximum = 60) {
  const gevonden = [];
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      let elementen = [];
      try {
        // label hoort er nadrukkelijk bij. In Mijn Zorgtoegang zijn de
        // tijdsloten labels bij een verborgen radio-input, niet knoppen.
        elementen = await frame
          .locator(
            'button, [role="button"], [role="option"], [role="radio"], a[href], li, td, label, [class*="slot" i]',
          )
          .filter({ hasText: TIJD_PATROON })
          .all();
      } catch {
        continue;
      }
      for (const el of elementen) {
        if (gevonden.length >= maximum) break;
        try {
          if (!(await el.isVisible())) continue;
          const tekst = (await el.innerText({ timeout: 1000 })).trim().replace(/\s+/g, ' ');
          const match = tekst.match(TIJD_PATROON);
          if (!match) continue;
          // Alleen korte labels: een heel tekstblok met toevallig een tijd erin
          // is geen tijdslot.
          if (tekst.length > 40) continue;
          if (VERBODEN_LABELS.some((p) => p.test(tekst))) continue;
          if (!gevonden.includes(tekst)) gevonden.push(tekst);
        } catch {
          // element kan verdwijnen tijdens een rerender
        }
      }
    }
  }
  return gevonden;
}

// Diagnostiek. Verzamelt van elk zichtbaar klikbaar element het label, zodat na
// een live run precies te zien is welke keuzes een scherm aanbood. Daarmee zijn
// de patronen in config.mjs bij te stellen zonder de scan opnieuw te draaien.
export async function verzamelKandidaten(geefPaginas, maximum = 120) {
  const kandidaten = [];
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      let elementen = [];
      try {
        elementen = await frame.locator(KLIKBARE_SELECTOR).all();
      } catch {
        continue;
      }
      for (const el of elementen) {
        if (kandidaten.length >= maximum) return kandidaten;
        try {
          if (!(await el.isVisible())) continue;
          const label = (await el.innerText({ timeout: 800 })).trim().replace(/\s+/g, ' ');
          if (!label) continue;
          if (label.length > 120) continue;
          const tag = await el.evaluate((n) => n.tagName.toLowerCase()).catch(() => '?');
          const href = await el.getAttribute('href').catch(() => null);
          const regel = `${tag}${href ? ` href=${href}` : ''} :: ${label}`;
          if (!kandidaten.includes(regel)) kandidaten.push(regel);
        } catch {
          // element kan tussentijds verdwijnen
        }
      }
    }
  }
  return kandidaten;
}

// Adressen van alle open pagina's en van hun iframes.
export function verzamelAdressen(geefPaginas) {
  const adressen = [];
  for (const page of geefPaginas()) {
    if (page.isClosed()) continue;
    for (const frame of page.frames()) {
      const url = frame.url();
      if (url && url !== 'about:blank' && !adressen.includes(url)) adressen.push(url);
    }
  }
  return adressen;
}
