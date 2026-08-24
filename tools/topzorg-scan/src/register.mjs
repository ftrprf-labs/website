// Opbouw van het locatieregister.
//
// De afspraakpagina van TopzorgGroep bevat een menu met per specialisatie en
// per provincie een paneel met locatiepagina's. Een locatiepagina verwijst naar
// een of meer vestigingspagina's, en op een vestigingspagina staat, als die
// bestaat, de link naar het afsprakenportaal.
//
// Dit alles staat in de server-side HTML. Er is dus geen browser nodig om het
// register op te bouwen, alleen gewone verzoeken. Dat scheelt bij honderd
// vestigingen uren aan looptijd en belasting op het portaal.

export const AFSPRAAKPAGINA = 'https://www.topzorggroep.nl/contact/afspraak-maken/';

const PROVINCIEPANEEL =
  /<div class="provinciepanel js-([a-z-]+?)-(dietetiek|fysiotherapie|revalidatie) \2"[^>]*data-name="([a-z-]+)"([\s\S]*?)(?=<div class="provinciepanel |<\/div><\/div><\/div><\/div>)/g;

const LOCATIETEGEL =
  /href="(https:\/\/www\.topzorggroep\.nl\/locaties\/[^"]+)"[^>]*>\s*<span[^>]*>\s*<span[^>]*>([^<]+)</g;

const VESTIGINGSLINK = /href="(https:\/\/www\.topzorggroep\.nl\/vestigingen\/[^"#?]+)"/g;

const PORTAALLINK = /https:\/\/[a-z0-9.-]*mijnzorgtoegang\.nl[^"'\s<>\\]*/gi;

function ontdubbel(lijst, sleutel) {
  const gezien = new Set();
  return lijst.filter((item) => {
    const k = sleutel(item);
    if (gezien.has(k)) return false;
    gezien.add(k);
    return true;
  });
}

function nettNaam(ruw) {
  return ruw.replace(/\s+/g, ' ').trim();
}

// Provincie uit de paneelsleutel, bijvoorbeeld "zuid-holland" wordt
// "Zuid-Holland". Het koppelteken hoort bij de naam en is geen stijlmiddel.
function provincieNaam(sleutel) {
  return sleutel
    .split('-')
    .map((deel) => deel.charAt(0).toUpperCase() + deel.slice(1))
    .join('-');
}

// Leest de afspraakpagina en levert alle locatiepagina's met hun provincie en
// specialisatie.
export function leesLocatiepaginas(html) {
  const resultaat = [];
  for (const paneel of html.matchAll(PROVINCIEPANEEL)) {
    const [, provincieSleutel, specialisatie, , body] = paneel;
    for (const tegel of body.matchAll(LOCATIETEGEL)) {
      resultaat.push({
        specialisatie,
        provincie: provincieNaam(provincieSleutel),
        naam: nettNaam(tegel[2]),
        url: tegel[1],
      });
    }
  }
  // Een locatiepagina kan onder meerdere specialisaties hangen. De combinatie
  // van adres en specialisatie is de sleutel.
  return ontdubbel(resultaat, (r) => `${r.specialisatie}|${r.url}`);
}

// Leest een locatiepagina en levert de vestigingspagina's die eronder hangen.
export function leesVestigingen(html) {
  const urls = [...html.matchAll(VESTIGINGSLINK)]
    .map((m) => m[1])
    .filter((u) => !/\/vestigingen\/?$/.test(u));
  return [...new Set(urls)];
}

// Leest een vestigingspagina en levert de portaal-URL, als die er is.
export function leesPortaal(html) {
  const treffers = [...html.matchAll(PORTAALLINK)].map((m) => m[0]);
  if (treffers.length === 0) return null;
  // De pagina bevat vaak twee varianten van hetzelfde adres, met en zonder
  // hekje. De variant met hekje is de route die de applicatie zelf gebruikt.
  const metHek = treffers.find((t) => t.includes('#'));
  return metHek ?? treffers[0];
}

// De plaats komt bij voorkeur uit het adresblok van de vestigingspagina zelf.
// Een postcode gevolgd door een plaatsnaam is betrouwbaarder dan raden op basis
// van de URL, want een URL bevat vaak een straatnaam als onderscheid.
const POSTCODE_PLAATS = /\b\d{4}\s?[A-Z]{2}\s*,?\s*([A-Z][A-Za-zÀ-ÿ'\u2019]+(?:[ -][A-Z][A-Za-zÀ-ÿ'\u2019]+){0,3})/;

export function leesPlaats(html) {
  const zonderTags = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const match = zonderTags.match(POSTCODE_PLAATS);
  return match ? match[1].trim() : null;
}

// Terugval wanneer het adresblok niets oplevert. Ruw maar bruikbaar, en altijd
// te overschrijven met een handmatige correctie in het register.
export function leidPlaatsAf(vestigingUrl) {
  const laatste = vestigingUrl.replace(/\/$/, '').split('/').pop() ?? '';
  const zonderSpecialisatie = laatste.replace(/^(fysiotherapie|revalidatie|dietetiek)-/, '');
  return zonderSpecialisatie
    .split('-')
    .map((deel) => deel.charAt(0).toUpperCase() + deel.slice(1))
    .join('-');
}

// Bouwt het register uit de losse onderdelen. Puur, zodat het zonder netwerk
// te testen is.
export function bouwRegister({
  locatiepaginas,
  vestigingenPerLocatie,
  portaalPerVestiging,
  plaatsPerVestiging = new Map(),
}) {
  const rijen = [];

  for (const locatie of locatiepaginas) {
    const vestigingen = vestigingenPerLocatie.get(locatie.url) ?? [];

    if (vestigingen.length === 0) {
      rijen.push({
        specialisatie: locatie.specialisatie,
        provincie: locatie.provincie,
        plaats: leidPlaatsAf(locatie.url),
        locatienaam: locatie.naam,
        locatieUrl: locatie.url,
        vestigingUrl: null,
        portaalUrl: null,
        onlineMogelijk: false,
        reden: 'geen vestigingspagina gevonden',
      });
      continue;
    }

    for (const vestiging of vestigingen) {
      const portaal = portaalPerVestiging.get(vestiging) ?? null;
      rijen.push({
        specialisatie: locatie.specialisatie,
        provincie: locatie.provincie,
        plaats: plaatsPerVestiging.get(vestiging) ?? leidPlaatsAf(vestiging),
        locatienaam: locatie.naam,
        locatieUrl: locatie.url,
        vestigingUrl: vestiging,
        portaalUrl: portaal,
        onlineMogelijk: Boolean(portaal),
        reden: portaal ? 'portaal gevonden op de vestigingspagina' : 'geen portaalverwijzing op de vestigingspagina',
      });
    }
  }

  return ontdubbel(rijen, (r) => `${r.specialisatie}|${r.vestigingUrl ?? r.locatieUrl}`);
}

export function vatRegisterSamen(rijen) {
  const perSpecialisatie = {};
  for (const rij of rijen) {
    const s = (perSpecialisatie[rij.specialisatie] ??= { totaal: 0, online: 0 });
    s.totaal += 1;
    if (rij.onlineMogelijk) s.online += 1;
  }
  return {
    vestigingen: rijen.length,
    online: rijen.filter((r) => r.onlineMogelijk).length,
    provincies: new Set(rijen.map((r) => r.provincie)).size,
    plaatsen: new Set(rijen.map((r) => r.plaats)).size,
    perSpecialisatie,
  };
}
