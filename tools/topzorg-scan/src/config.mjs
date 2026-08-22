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

// Cookiebanners van de gangbare NL consent tools.
export const COOKIE_PATRONEN = [
  /alles accepteren/i,
  /accepteer alle/i,
  /alle cookies/i,
  /^accepteren$/i,
  /^akkoord$/i,
  /^ok$/i,
];

export const DEFAULTS = {
  navigatieTimeoutMs: 45000,
  zoekTimeoutMs: 20000,
  portaalTimeoutMs: 45000,
  viewport: { width: 1440, height: 960 },
  locale: 'nl-NL',
  timezone: 'Europe/Amsterdam',
};
