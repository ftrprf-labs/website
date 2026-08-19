// Herkomst en status van wat Maculis over een relatie weet.
//
// WAAROM DIT EEN EIGEN BESTAND IS
//   Een regel in het relatiedossier draagt twee feiten die niets met elkaar te maken hebben, en die
//   eerder als één ding werden getoond:
//
//     herkomst   waar komt dit vandaan?        de klant zelf, Maculis, een collega, de Lens
//     status     wat telt het?                 nog te bevestigen, of bevestigd
//
//   Die twee zijn niet uit elkaar af te leiden. Een klant kan iets uitdrukkelijk delen zonder dat
//   een mens bij Maculis het al heeft bevestigd, en Maculis kan iets afleiden dat daarna wél is
//   bevestigd. Toch stond er tot nu toe boven élke onbevestigde regel "AI-voorstel", ook wanneer de
//   klant het zelf had gedeeld. Dat is onwaar tegenover de mens die het leest: die kan dan niet zien
//   wie iets beweerde, en behandelt een uitspraak van de klant als een gok van Maculis.
//
//   Deze module doet niets anders dan die twee vragen apart beantwoorden, in gewone taal. Ze raakt
//   de opslag niet, de geheugenlogica niet en de toestemming niet: `source` en `confidence` blijven
//   precies wat ze in de database al waren.
//
//   Het staat los van cockpit-live.js zodat de regel op één plek staat en toetsbaar is.

// Waar komt dit vandaan. In de taal van de mens die het leest, nooit in die van de database.
const HERKOMST = {
  customer: 'Door de klant gedeeld',
  ai: 'Door Maculis afgeleid',
  human: 'Door een collega vastgelegd',
  manual: 'Door een collega vastgelegd',
  lens: 'Uit de Lens',
};

// Wat telt het. Dit is de bestaande betekenis van `confidence`, ongewijzigd, alleen leesbaar.
const STATUS = {
  proposed: 'Nog te bevestigen',
  confirmed: 'Bevestigd',
};

// Onbekende herkomst wordt benoemd en niet stilzwijgend aan Maculis of aan de klant toegeschreven.
// Raden wie iets zei is erger dan zeggen dat je het niet weet.
export function herkomstLabel(source) {
  return HERKOMST[String(source || '').toLowerCase()] || 'Herkomst onbekend';
}

export function statusLabel(confidence) {
  return STATUS[String(confidence || '').toLowerCase()] || STATUS.confirmed;
}

// Is dit een waarneming van Maculis zelf? Alleen dan hoort het lichtpunt erbij (canon 9, val 1):
// het punt staat voor iets wat Maculis zag, niet voor iets wat iemand ons vertelde. Een uitspraak
// van de klant, een collega of de Lens is geen waarneming van Maculis en krijgt dus geen punt.
export function isWaarnemingVanMaculis(source) {
  return String(source || '').toLowerCase() === 'ai';
}

// De volledige lezing van één regel, zodat het scherm niets meer zelf hoeft af te leiden.
export function herkomstVan(m = {}) {
  const source = m.source;
  const confidence = m.confidence;
  return {
    herkomst: herkomstLabel(source),
    status: statusLabel(confidence),
    vanKlant: String(source || '').toLowerCase() === 'customer',
    vanMaculis: isWaarnemingVanMaculis(source),
    teBevestigen: String(confidence || '').toLowerCase() === 'proposed',
  };
}
