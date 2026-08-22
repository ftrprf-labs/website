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

// Zoekt het eerste zichtbare klikbare element dat op een van de patronen past.
// Patronen zijn geordend van specifiek naar algemeen; de eerste treffer wint.
export async function zoekKlikbaar(geefPaginas, patronen, opties = {}) {
  const { timeoutMs = 20000, pollMs = 500, slaVerbodenOver = true } = opties;
  const deadline = Date.now() + timeoutMs;
  let laatsteFout = null;

  while (Date.now() < deadline) {
    for (const patroon of patronen) {
      for (const page of geefPaginas()) {
        if (page.isClosed()) continue;
        for (const frame of page.frames()) {
          for (const fabriek of frameFabrieken(patroon)) {
            let locator;
            try {
              locator = fabriek(frame).first();
              if ((await locator.count()) === 0) continue;
              if (!(await locator.isVisible())) continue;
            } catch (err) {
              laatsteFout = err;
              continue;
            }
            const label = await labelVan(locator);
            if (slaVerbodenOver && label && VERBODEN_LABELS.some((p) => p.test(label))) continue;
            return { locator, page, frame, patroon, label };
          }
        }
      }
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
        elementen = await frame
          .locator('button, [role="button"], [role="option"], a[href], li, td')
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
