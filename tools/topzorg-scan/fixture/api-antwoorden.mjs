// Nabootsing van de publieke API van Mijn Zorgtoegang, gemodelleerd op de
// antwoorden die in de verkenningen van 24 augustus 2026 zijn vastgelegd.
// Ingekort maar met dezelfde structuur, zodat de cliëntlaag zonder netwerk te
// testen is.

const EMPLOYEE = '6aace7c7-bcdc-400d-984e-2e4e1be3d7f3';
const GENDER = '5753d849-97d9-4316-bdf0-2eba0ccd8bbd';
const FOCUS_FYSIO = '11111111-1111-1111-1111-111111111111';
const FOCUS_BEKKEN = '22222222-2222-2222-2222-222222222222';
const REFERRAL_GEEN = '33333333-3333-3333-3333-333333333333';
const PRACTICE_A = '44444444-4444-4444-4444-444444444444';

const BASIS = '/appointment/compose-first-appointments/v1';

export const ORGANISATIE_CONTEXT = {
  url: 'https://tzg.mijnzorgtoegang.nl',
  api_url: 'https://api.mijnzorgtoegang.nl',
  token: { access_token: 'test-token', expires_at: '2026-08-25T02:46:21+00:00' },
  authenticated: false,
  organisation: { name: 'TopzorgGroep', slug: 'tzg' },
};

export const STAPPEN = {
  steps: [
    { number: 1, code: 'focuses', label: 'Aandachtsgebied', _links: { self: { href: `${BASIS}/focuses` } } },
    { number: 2, code: 'referrals', label: 'Verwijzing', _links: { self: { href: `${BASIS}/referrals` } } },
    {
      number: 3,
      code: 'practices',
      label: 'Locatie',
      _links: { self: { href: `${BASIS}/practices?employee=${EMPLOYEE}&gender=${GENDER}` } },
    },
    {
      number: 4,
      code: 'slots',
      label: 'Datum & tijd',
      _links: { self: { href: `${BASIS}/slots?employee=${EMPLOYEE}&gender=${GENDER}` } },
    },
    { number: 5, code: 'data', label: 'Persoonsgegevens', _links: { self: { href: `${BASIS}/data` } } },
    { number: 6, code: 'confirmation', label: 'Bevestigen', _links: { self: { href: `${BASIS}/confirmation` } } },
  ],
};

export const FOCUSES = {
  focuses: [
    { reference: '00000000-0000-0000-0000-000000000001', label: 'Andere klacht', selected: false },
    // Staat bewust voor de gewone intake, want zo staat hij ook in het echt.
    // Een niet verankerde zoekopdracht pakt deze en dat is een andere behandeling.
    { reference: FOCUS_BEKKEN, label: 'Bekkenfysiotherapie (intake)', selected: false },
    { reference: FOCUS_FYSIO, label: 'Fysiotherapie (intake)', selected: false },
    { reference: '00000000-0000-0000-0000-000000000002', label: 'Kinderfysiotherapie', selected: false },
  ],
};

export const REFERRALS = {
  referrals: [
    { reference: '55555555-5555-5555-5555-555555555555', label: 'Verwijzing', selected: false },
    { reference: REFERRAL_GEEN, label: 'Geen verwijzing', selected: false },
  ],
};

export const PRACTICES = {
  practices: [
    {
      reference: PRACTICE_A,
      label: 'TZG Amersfoort Databankweg',
      address_line1: 'Databankweg 2A',
      address_line2: '3821AL Amersfoort',
      address_line3: '',
      phone_number: null,
      email_address: null,
      selected: false,
    },
    {
      reference: '66666666-6666-6666-6666-666666666666',
      label: 'TZG Assen Hoekbree',
      address_line1: 'Hoekbree 3',
      address_line2: '9403GR Assen',
      address_line3: '',
      phone_number: null,
      email_address: null,
      selected: false,
    },
  ],
};

export const SLOTS = {
  days: [
    { date: '2026-08-25', available: true },
    { date: '2026-08-26', available: false },
  ],
  slots: [
    { reference: 'slot-1', start: '2026-08-25T08:00:00+02:00', label: '08:00' },
    { reference: 'slot-2', start: '2026-08-25T10:05:00+02:00', label: '10:05' },
  ],
};

// Een fetch vervanger die op pad en parameters antwoordt zoals de echte API.
// De variant slots eist practice, focus en referral, zodat de probeerlogica in
// api-verken.mjs echt getoetst wordt.
export function maakNepFetch({ log = [] } = {}) {
  const antwoord = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  });

  return async function nepFetch(url) {
    log.push(url);
    const adres = new URL(url);
    const pad = adres.pathname;
    const q = adres.searchParams;

    if (adres.host === 'tzg.mijnzorgtoegang.nl' && pad === '/app/context') return antwoord(ORGANISATIE_CONTEXT);
    if (pad === `${BASIS}/context`) return antwoord(STAPPEN);
    if (pad === `${BASIS}/focuses`) return antwoord(FOCUSES);
    if (pad === `${BASIS}/referrals`) return antwoord(REFERRALS);
    if (pad === `${BASIS}/practices`) {
      if (!q.get('focus')) return antwoord({ melding: 'focus ontbreekt' }, 422);
      return antwoord(PRACTICES);
    }
    if (pad === `${BASIS}/slots`) {
      if (!q.get('practice') || !q.get('focus') || !q.get('referral')) {
        return antwoord({ melding: 'onvolledige selectie' }, 422);
      }
      return antwoord(SLOTS);
    }
    return antwoord({ melding: 'onbekend pad' }, 404);
  };
}

export const REFERENTIES = { EMPLOYEE, GENDER, FOCUS_FYSIO, FOCUS_BEKKEN, REFERRAL_GEEN, PRACTICE_A };
