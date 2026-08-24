// Configuratie van de te scannen locaties.
// Bewust datagedreven: een nieuwe locatie toevoegen is een nieuw object, geen nieuwe code.

export const LOCATIES = {
  'revalidatie-amersfoort-databankweg': {
    key: 'revalidatie-amersfoort-databankweg',
    naam: 'Revalidatie Amersfoort Databankweg',
    url: 'https://www.topzorggroep.nl/vestigingen/revalidatie-amersfoort-databankweg/',

    // Woorden die op de locatiepagina moeten staan om te bevestigen dat we
    // echt op de pagina van deze vestiging zijn beland.
    herkenning: [/databankweg/i, /amersfoort/i],

    // Host van het patientenportaal waar de afspraakknop naartoe leidt.
    portaalHost: /zorgtoegang/i,

    // Keuzes die de agent maakt in de afspraakflow. Per stap een lijst met
    // patronen, van meest specifiek naar meest algemeen. De eerste die
    // zichtbaar is wint.
    keuzes: {
      aandachtsgebied: [/revalidatie/i, /fysiotherapie/i],
      behandeling: [/fysiotherapie\s*intake/i, /intake\s*fysiotherapie/i, /intake/i, /eerste afspraak/i, /screening/i],
      verwijzing: [/geen verwijzing/i, /zonder verwijzing/i, /nee,? ?ik heb geen verwijzing/i, /^nee$/i, /directe toegang/i],
    },

    // Keuzes op een tussenpagina waar eerst een vestiging gekozen moet worden,
    // voordat de route naar Mijn Zorgtoegang doorloopt.
    vervolgkeuzes: [/databankweg/i, /revalidatie amersfoort/i, /amersfoort/i],
  },
};

// Knoppen op de locatiepagina die naar het afsprakenportaal leiden.
export const AFSPRAAKKNOP_PATRONEN = [
  /online (een )?afspraak (maken|plannen)/i,
  /afspraak (maken|plannen)/i,
  /plan (je|uw) afspraak/i,
  /direct een afspraak/i,
  /mijn ?zorgtoegang/i,
  /afspraak/i,
];

// Cookiebanners. Op topzorggroep.nl staan er twee tegelijk: de Axeptio widget
// met "Oke!" en een eigen banner met "Ja, ik accepteer cookies". Zolang die
// blijven staan, vangt de overlay elke klik op en loopt de scan vast op een
// timeout. Volgorde is van specifiek naar algemeen.
export const COOKIE_PATRONEN = [
  /ja,? ?ik accepteer/i,
  /alles accepteren/i,
  /accepteer alle/i,
  /alle cookies (accepteren|toestaan)/i,
  /^ok[eé]!?$/i,
  /^accepteren$/i,
  /^akkoord$/i,
  /^doorgaan$/i,
];

// Een pagina kan meerdere consentlagen tonen. Blijf klikken tot er geen
// knop meer verschijnt, met een bovengrens zodat een lus nooit oneindig is.
export const MAX_COOKIEBANNERS = 4;

// Route naar het portaal. De knop op een locatiepagina leidt niet altijd
// rechtstreeks naar Mijn Zorgtoegang. Soms komt er eerst een algemene
// afspraakpagina waar nog een locatie of een ingang gekozen moet worden.
export const PORTAAL_PATRONEN = [
  /mijn ?zorgtoegang/i,
  /online (een )?afspraak (maken|plannen)/i,
  /direct (online )?(een )?afspraak/i,
  /plan (je|uw) afspraak (online)?/i,
  /afspraak plannen/i,
  /online plannen/i,
];

// Hoeveel tussenpagina's de scan volgt voordat hij concludeert dat er geen
// online route is.
export const MAX_ROUTESTAPPEN = 3;

export const DEFAULTS = {
  navigatieTimeoutMs: 45000,
  zoekTimeoutMs: 20000,
  portaalTimeoutMs: 45000,
  viewport: { width: 1440, height: 960 },
  locale: 'nl-NL',
  timezone: 'Europe/Amsterdam',
};
