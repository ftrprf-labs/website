// Cliënt voor de publieke API van Mijn Zorgtoegang.
//
// Het portaal is een applicatie bovenop een REST API die zonder inloggen
// bereikbaar is. Een publiek token komt uit /app/context en is ongeveer twaalf
// uur geldig. Elke stap in de afspraakflow heeft een eigen adres en krijgt de
// tot dan toe gemaakte keuzes mee als queryparameters.
//
// Deze laag doet uitsluitend GET verzoeken. De stappen data en confirmation,
// dus persoonsgegevens en bevestiging, staan hier niet in en horen hier ook
// niet in.

export const ORGANISATIE_CONTEXT = 'https://tzg.mijnzorgtoegang.nl/app/context';

const BASISPAD = '/appointment/compose-first-appointments/v1';

// Stappen die de scan nooit aanraakt, ook niet per ongeluk via een link uit de
// API zelf.
const VERBODEN_PADEN = /\/(data|confirmation|create|check-requires-account|register)/i;

export class ApiFout extends Error {
  constructor(bericht, { status = 0, url = '' } = {}) {
    super(bericht);
    this.name = 'ApiFout';
    this.status = status;
    this.url = url;
  }
}

// De HTTP laag is injecteerbaar, zodat de flow zonder netwerk te testen is.
export function maakClient({ fetchImpl = globalThis.fetch, gebruikersAgent, pauzeMs = 250 } = {}) {
  let laatsteVerzoek = 0;

  async function wachtEven() {
    const verstreken = Date.now() - laatsteVerzoek;
    if (verstreken < pauzeMs) await new Promise((r) => setTimeout(r, pauzeMs - verstreken));
    laatsteVerzoek = Date.now();
  }

  async function haalJson(url, { token = null } = {}) {
    if (VERBODEN_PADEN.test(new URL(url).pathname)) {
      throw new ApiFout(`Dit pad wordt bewust niet opgehaald: ${url}`, { url });
    }
    await wachtEven();

    const headers = { accept: 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (gebruikersAgent) headers['user-agent'] = gebruikersAgent;

    const respons = await fetchImpl(url, { method: 'GET', headers });
    const tekst = await respons.text();
    if (!respons.ok) {
      throw new ApiFout(`HTTP ${respons.status} op ${url}`, { status: respons.status, url });
    }
    try {
      return JSON.parse(tekst);
    } catch {
      throw new ApiFout(`Antwoord is geen JSON op ${url}`, { status: respons.status, url });
    }
  }

  // Publiek token plus het adres van de API.
  async function haalContext() {
    const data = await haalJson(ORGANISATIE_CONTEXT);
    const token = data?.token?.access_token;
    const apiUrl = data?.api_url;
    if (!token || !apiUrl) throw new ApiFout('Geen token of api adres in de organisatiecontext.');
    return {
      token,
      apiUrl: apiUrl.replace(/\/$/, ''),
      verlooptOp: data?.token?.expires_at ?? null,
      organisatie: data?.organisatie ?? data?.organisation ?? null,
    };
  }

  function bouwUrl(apiUrl, stap, params = {}) {
    const url = new URL(`${apiUrl}${BASISPAD}/${stap}`);
    for (const [sleutel, waarde] of Object.entries(params)) {
      if (waarde !== null && waarde !== undefined && waarde !== '') url.searchParams.set(sleutel, waarde);
    }
    return url.toString();
  }

  const haalStap = (apiUrl, token, stap, params) => haalJson(bouwUrl(apiUrl, stap, params), { token });

  // De stappen van de flow, met daarin de standaardwaarden voor employee en
  // gender die de applicatie zelf gebruikt.
  async function haalStappen(apiUrl, token) {
    const data = await haalStap(apiUrl, token, 'context');
    const stappen = data?.steps ?? [];
    const standaarden = {};
    for (const stap of stappen) {
      const href = stap?._links?.self?.href;
      if (!href) continue;
      const query = href.includes('?') ? new URLSearchParams(href.split('?')[1]) : null;
      if (!query) continue;
      for (const sleutel of ['employee', 'gender']) {
        const waarde = query.get(sleutel);
        if (waarde && !standaarden[sleutel]) standaarden[sleutel] = waarde;
      }
    }
    return { stappen, standaarden, ruw: data };
  }

  return {
    haalJson,
    haalContext,
    bouwUrl,
    haalStappen,
    haalFocuses: (apiUrl, token, params = {}) => haalStap(apiUrl, token, 'focuses', params),
    haalReferrals: (apiUrl, token, params = {}) => haalStap(apiUrl, token, 'referrals', params),
    haalPractices: (apiUrl, token, params = {}) => haalStap(apiUrl, token, 'practices', params),
    haalSlots: (apiUrl, token, params = {}) => haalStap(apiUrl, token, 'slots', params),
  };
}

// Zoekt een item op exact label, met een terugval op een gedeeltelijke match.
// Exact gaat voor, want "Fysiotherapie (intake)" zit ook in
// "Bekkenfysiotherapie (intake)" en dat is een andere behandeling.
export function kiesOpLabel(items, gezocht) {
  if (!Array.isArray(items)) return null;
  const genormaliseerd = gezocht.trim().toLowerCase();
  const exact = items.find((i) => (i.label ?? '').trim().toLowerCase() === genormaliseerd);
  if (exact) return exact;
  return items.find((i) => (i.label ?? '').toLowerCase().includes(genormaliseerd)) ?? null;
}

// Postcode en plaats uit address_line2, bijvoorbeeld "9403GR Assen".
export function leesAdres(practice) {
  const regel = practice?.address_line2 ?? '';
  const match = regel.match(/^\s*(\d{4}\s?[A-Za-z]{2})\s+(.+?)\s*$/);
  if (!match) return { postcode: null, plaats: regel.trim() || null };
  return { postcode: match[1].replace(/\s+/g, '').toUpperCase(), plaats: match[2].trim() };
}
