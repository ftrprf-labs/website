// Mijn Maculis — de gedeelde woordenschat: betekenisgebieden en perspectieven.
//
// Beide zijn voor ELKE organisatie hetzelfde. Dat is geen implementatiegemak maar de reden dat ze
// mogen bestaan: een naam per organisatie verzinnen zou een verhaal over dat bedrijf schrijven dat
// niemand heeft verteld. Een gedeelde naam zegt alleen waar iets thuishoort, zoals de plank in een
// bibliotheek geen oordeel over het boek is. Zie PROD-RELATIONSHIP-MODEL §3.
//
// EEN GEBIED ORDENT, EEN UITSPRAAK BEWEERT
//
// Daarom staat hier alleen een naam en een zin. Geen bron, geen oordeel, geen score, geen volgorde.
// Er is bewust geen sorteersleutel: het veld plaatst, het rangschikt niet.

// De klantzijdige zin die één keer bij het openen van een gebied staat. Zonder deze zin leest een
// ondernemer de gebiedsnaam als een diagnose, en dan heeft hij opeens "een probleem met X".
export const GEBIED_UITLEG = 'Dit gebied zegt niets over jullie. Het is waar dit soort inzichten samenkomen.';

// V1 kent één gebied, en niet de acht die er ooit komen. Een tweede gebied openen zou een gebied
// benoemen waar we niets over weten, en dat is dezelfde lege belofte als een leeg dashboard.
//
// De naam noemt het ONDERWERP en importeert geen ambitie. "Groei" of "positionering" zou een doel
// formuleren dat de ondernemer nooit heeft uitgesproken, in de eerste seconde dat hij binnen is.
export const GEBIEDEN = {
  zichtbaarheid: {
    naam: 'Wat er van buiten te zien is',
    zin: 'Hoe jullie overkomen op iemand die van buitenaf kijkt.',
  },
};

// De bril, niet de bron. Eén perspectief wordt door meerdere bronnen gevoed en één bron voedt
// meerdere perspectieven; vallen ze samen, dan wordt een bron een product ("de Financiële Lens").
//
// "Ondernemer" staat hier bewust NIET tussen. De andere drie zijn gezichtspunten op de organisatie;
// een ondernemer is een mens met een privélaag. Reageren op een uitspraak blijft persoonlijk;
// alleen bewust iets in de gedeelde werkelijkheid leggen wordt een uitspraak, met `binnenuit`.
export const PERSPECTIEVEN = {
  buitenwereld: { naam: 'Buitenwereld', zin: 'Wat klanten, markt en omgeving zien.' },
  binnenuit: { naam: 'Van binnenuit', zin: 'Wat de organisatie zelf zegt en bewust deelt.' },
  feiten: { naam: 'Feiten', zin: 'Wat systemen, documenten of meetbare gegevens laten zien.' },
  analyse: { naam: 'Analyse', zin: 'Wat Maculis leest uit meerdere bronnen.' },
};

// In V1 wordt er precies één van elk gebruikt. Deze twee constanten staan hier zodat de keuze op
// één plek staat en niet als losse string door de voorbereider zwerft.
export const V1_GEBIED = 'zichtbaarheid';
export const V1_PERSPECTIEF = 'buitenwereld';

// De bronwaarde voor een uitspraak die uit de Lens komt. De kolom `source` bestond al met de waarde
// 'lens'; die blijft de opgeslagen waarde zodat bestaande rijen niet hoeven te verhuizen. Dit is de
// vertaling naar de naam die ADR-0003 D3 gebruikt, op één plek vastgelegd.
export const BRON_LENS = 'lens';
export const BRON_LENS_LABEL = 'Maculis Lens';
export const BRON_LENS_ZIN = 'Dit is wat Maculis vanuit het perspectief van buitenaf zag.';

export function gebied(key) { return GEBIEDEN[key] || null; }
export function perspectief(key) { return PERSPECTIEVEN[key] || null; }
