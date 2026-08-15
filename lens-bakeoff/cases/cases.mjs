// Bake-off case-set: 14 diverse companies. Provenance is SYNTHETIC throughout (crafted fixtures),
// clearly labelled, so the bake-off uses no real personal or sensitive financial data. Cases are
// designed to exercise genuine reveals, honest silences, and false-positive traps (wallpaper-only
// claims, healthy-diversified companies) across all three lenses. Variety spans size, B2B/B2C,
// local/digital, service/product, strong/weak online presence, and young/established.
//
// Each case carries `_expect` notes (informal, for review only). The runner computes ACTUAL outcomes
// independently and does not read `_expect`.

export const CASES = [
  {
    id: 'atelier-noord', label: 'Atelier Noord (meubelmaker, B2B/B2C)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2B/B2C', locality: 'lokaal', kind: 'product/dienst', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [
      { subject: 'persoonlijke aandacht', quote: 'Bij ons staat persoonlijke aandacht altijd voorop.', kind: 'self_emphasis', prominence: 'hero' },
      { subject: 'vakmanschap', quote: 'Echt vakmanschap, generatie op generatie.', kind: 'self_claim', prominence: 'body' },
    ] },
    reputation: {
      places: { rating: 4.6, count: 84, responseRate: 0.05, reviewThemes: [ { theme: 'snelheid', share: 0.34 }, { theme: 'prijs', share: 0.28 }, { theme: 'kwaliteit', share: 0.2 }, { theme: 'persoonlijke aandacht', share: 0.03 } ] },
      identity: { kvkName: 'Atelier Noord VOF', siteName: 'Atelier Noord', gbpName: 'Atelier Noord', kvkAddress: 'Havenstraat 12 Groningen', siteAddress: 'Havenstraat 12 Groningen' },
      findability: { domainAgeYears: 11, indexedPages: 40, nonBrandedImpressions: 2200 },
      trust: { https: true, hsts: true, securityHeadersScore: 4, certDaysToExpiry: 200 },
    },
    finance: { periods: [
      { label: '2024', revenue: 480000, grossMarginPct: 42, netResult: 38000, cash: 60000, receivablesDays: 30, personnelCosts: 210000 },
      { label: '2025', revenue: 512000, grossMarginPct: 42, netResult: 41000, cash: 66000, receivablesDays: 31, personnelCosts: 224000 },
    ], customers: [ { name: 'Klant A', shareByPeriod: [0.16, 0.18] } ] },
    dependency: { customerConcentrationTop1: 0.18, customerConcentrationTop3: 0.4, ownerInThreadShare: 0.82, supplierConcentrationTop2: 0.5 },
    _expect: 'Reputation REVEAL (promise vs reception). Finance SILENCE. Dependency REVEAL (owner in the middle, healthy).',
  },
  {
    id: 'groenveld-installatie', label: 'Groenveld Installatie (installateur, B2C)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2C', locality: 'lokaal', kind: 'dienst', online: 'zwak', age: 'gevestigd' },
    website: { claims: [
      { subject: 'kwaliteit', quote: 'Kwaliteit en service staan bij ons centraal.', kind: 'self_claim', prominence: 'hero' },
      { subject: 'vakmanschap', quote: 'Vakmanschap waar u op kunt bouwen.', kind: 'self_claim', prominence: 'body' },
    ] },
    reputation: {
      places: { rating: 4.2, count: 30, responseRate: 0.2, reviewThemes: [ { theme: 'kwaliteit', share: 0.3 }, { theme: 'prijs', share: 0.25 } ] },
      identity: { kvkName: 'Groenveld Installatietechniek BV', siteName: 'Groenveld Installatie', gbpName: 'Groenveld Installatie', kvkAddress: 'Industrieweg 5 Zwolle', siteAddress: 'Industrieweg 5 Zwolle' },
      findability: { domainAgeYears: 7, indexedPages: 18, nonBrandedImpressions: 900 },
      trust: { https: true, hsts: false, securityHeadersScore: 2, certDaysToExpiry: 120 },
    },
    finance: { periods: [
      { label: '2024', revenue: 640000, grossMarginPct: 34, netResult: 40000, cash: 90000, receivablesDays: 28, personnelCosts: 260000 },
      { label: '2025', revenue: 712000, grossMarginPct: 33, netResult: 44000, cash: 58000, receivablesDays: 49, personnelCosts: 300000 },
    ], customers: [ { name: 'Aannemer X', shareByPeriod: [0.22, 0.24] } ] },
    dependency: { customerConcentrationTop1: 0.24, customerConcentrationTop3: 0.5, ownerInThreadShare: 0.55, supplierConcentrationTop2: 0.6 },
    _expect: 'Reputation SILENCE (wallpaper-only claims). Finance REVEAL (revenue up, cash down, DSO up). Dependency SILENCE.',
  },
  {
    id: 'datacleve', label: 'DataCleve (B2B software, jong)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2B', locality: 'digitaal', kind: 'dienst', online: 'sterk', age: 'jong' },
    website: { claims: [
      { subject: 'schaalbaarheid', quote: 'Software die met je meegroeit.', kind: 'self_claim', prominence: 'hero' },
    ] },
    reputation: {
      places: { rating: 0, count: 2, responseRate: 0, reviewThemes: [] },
      identity: { kvkName: 'DataCleve BV', siteName: 'DataCleve', gbpName: 'DataCleve', kvkAddress: 'Keizersgracht 1 Amsterdam', siteAddress: 'Keizersgracht 1 Amsterdam' },
      findability: { domainAgeYears: 3, indexedPages: 60, nonBrandedImpressions: 5400 },
      trust: { https: true, hsts: true, securityHeadersScore: 5, certDaysToExpiry: 300 },
    },
    finance: { periods: [
      { label: '2024', revenue: 300000, grossMarginPct: 72, netResult: 20000, cash: 80000, receivablesDays: 40, personnelCosts: 160000 },
      { label: '2025', revenue: 420000, grossMarginPct: 64, netResult: 15000, cash: 70000, receivablesDays: 44, personnelCosts: 240000 },
    ], customers: [ { name: 'Enterprise Y', shareByPeriod: [0.22, 0.36] }, { name: 'Klant Z', shareByPeriod: [0.1, 0.12] } ] },
    dependency: { customerConcentrationTop1: 0.36, customerConcentrationTop3: 0.6, ownerInThreadShare: 0.5, channelDependency: { channel: 'één partnerkanaal', trafficShare: 0.4 } },
    _expect: 'Reputation SILENCE (reviews <5). Finance REVEAL (margin drift; concentration is CONCENTRATION, suppressed under frozen gate). Dependency REVEAL (concentration + healthy).',
  },
  {
    id: 'kliniek-vitaal', label: 'Kliniek Vitaal (fysio, healthcare)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2C', locality: 'lokaal', kind: 'dienst', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [
      { subject: 'persoonlijke zorg', quote: 'Persoonlijke zorg voor elke patiënt.', kind: 'self_emphasis', prominence: 'hero' },
    ] },
    reputation: {
      places: { rating: 4.8, count: 140, responseRate: 0.3, reviewThemes: [ { theme: 'persoonlijke zorg', share: 0.4 }, { theme: 'deskundig', share: 0.3 } ] },
      identity: { kvkName: 'Fysiotherapie Vitaal BV', siteName: 'Kliniek Vitaal', gbpName: 'Vitaal Fysio Centrum', kvkAddress: 'Dorpsstraat 22 Breda', siteAddress: 'Dorpsstraat 22 Breda' },
      findability: { domainAgeYears: 9, indexedPages: 25, nonBrandedImpressions: 1600 },
      trust: { https: true, hsts: true, securityHeadersScore: 3, certDaysToExpiry: 150 },
    },
    finance: { periods: [
      { label: '2024', revenue: 520000, grossMarginPct: 55, netResult: 60000, cash: 120000, receivablesDays: 20, personnelCosts: 280000 },
      { label: '2025', revenue: 548000, grossMarginPct: 55, netResult: 63000, cash: 128000, receivablesDays: 21, personnelCosts: 296000 },
    ], customers: [] },
    dependency: { customerConcentrationTop1: 0.05, customerConcentrationTop3: 0.12, ownerInThreadShare: 0.75, keyPersonRevenueShare: 0.6 },
    _expect: 'Reputation REVEAL (identity mismatch KVK vs GBP name). Finance SILENCE. Dependency REVEAL (key-person / owner, healthy).',
  },
  {
    id: 'webshop-bloom', label: 'Webshop Bloom (B2C ecommerce)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2C', locality: 'digitaal', kind: 'product', online: 'sterk', age: 'jong' },
    website: { claims: [ { subject: 'snelle levering', quote: 'Vandaag besteld, morgen in huis.', kind: 'self_claim', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.4, count: 60, responseRate: 0.4, reviewThemes: [ { theme: 'snelle levering', share: 0.45 }, { theme: 'prijs', share: 0.3 } ] },
      identity: { kvkName: 'Bloom Retail BV', siteName: 'Webshop Bloom', gbpName: 'Webshop Bloom', kvkAddress: 'Logistiekpark 3 Tilburg', siteAddress: 'Logistiekpark 3 Tilburg' },
      findability: { domainAgeYears: 4, indexedPages: 320, nonBrandedImpressions: 12000 },
      trust: { https: true, hsts: true, securityHeadersScore: 4, certDaysToExpiry: 90 },
    },
    finance: { periods: [
      { label: '2024', revenue: 900000, grossMarginPct: 30, netResult: 55000, cash: 110000, receivablesDays: 5, personnelCosts: 180000 },
      { label: '2025', revenue: 1020000, grossMarginPct: 30, netResult: 60000, cash: 118000, receivablesDays: 6, personnelCosts: 200000 },
    ], customers: [] },
    dependency: { customerConcentrationTop1: 0.03, customerConcentrationTop3: 0.08, ownerInThreadShare: 0.3, channelDependency: { channel: 'Google Ads', trafficShare: 0.82 } },
    _expect: 'Reputation SILENCE (promise matches reception, identity ok). Finance SILENCE. Dependency REVEAL (channel dependency + healthy = fragile).',
  },
  {
    id: 'oud-ijzer-bv', label: 'Oud IJzer BV (B2B groothandel, gevestigd)', provenance: 'synthetic',
    profile: { size: 'middel', model: 'B2B', locality: 'lokaal', kind: 'product', online: 'zwak', age: 'gevestigd' },
    website: { claims: [ { subject: 'levering op tijd', quote: 'Altijd op tijd geleverd, al 25 jaar.', kind: 'self_claim', prominence: 'body' } ] },
    reputation: {
      places: { rating: 4.5, count: 45, responseRate: 0.1, reviewThemes: [ { theme: 'levering op tijd', share: 0.4 }, { theme: 'service', share: 0.3 } ] },
      identity: { kvkName: 'Oud IJzer BV', siteName: 'Oud IJzer BV', gbpName: 'Oud IJzer BV', kvkAddress: 'Metaalweg 8 Deventer', siteAddress: 'Metaalweg 8 Deventer' },
      findability: { domainAgeYears: 16, indexedPages: 12, nonBrandedImpressions: 140 },
      trust: { https: true, hsts: false, securityHeadersScore: 2, certDaysToExpiry: 60 },
    },
    finance: { periods: [
      { label: '2024', revenue: 2200000, grossMarginPct: 22, netResult: 120000, cash: 300000, receivablesDays: 45, personnelCosts: 400000 },
      { label: '2025', revenue: 2260000, grossMarginPct: 22, netResult: 124000, cash: 312000, receivablesDays: 46, personnelCosts: 412000 },
    ], customers: [ { name: 'Bouwbedrijf Q', shareByPeriod: [0.2, 0.21] } ] },
    dependency: { customerConcentrationTop1: 0.21, customerConcentrationTop3: 0.45, ownerInThreadShare: 0.4, supplierConcentrationTop2: 0.55 },
    _expect: 'Reputation REVEAL (established but invisible; ASYMMETRY, cross-lens). Finance SILENCE. Dependency SILENCE.',
  },
  {
    id: 'veilig-thuis-zorg', label: 'Veilig Thuis Zorg (thuiszorg, B2C)', provenance: 'synthetic',
    profile: { size: 'middel', model: 'B2C', locality: 'regionaal', kind: 'dienst', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [ { subject: 'vertrouwen en veiligheid', quote: 'Zorg waar u met een gerust hart op vertrouwt.', kind: 'self_emphasis', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.3, count: 55, responseRate: 0.15, reviewThemes: [ { theme: 'vertrouwen en veiligheid', share: 0.35 }, { theme: 'aandacht', share: 0.25 } ] },
      identity: { kvkName: 'Veilig Thuis Zorg BV', siteName: 'Veilig Thuis Zorg', gbpName: 'Veilig Thuis Zorg', kvkAddress: 'Zorgplein 2 Apeldoorn', siteAddress: 'Zorgplein 2 Apeldoorn' },
      findability: { domainAgeYears: 8, indexedPages: 30, nonBrandedImpressions: 2000 },
      trust: { https: true, hsts: false, securityHeadersScore: 1, certDaysToExpiry: 12 },
    },
    finance: { periods: [
      { label: '2024', revenue: 1600000, grossMarginPct: 18, netResult: 70000, cash: 150000, receivablesDays: 35, personnelCosts: 1100000 },
      { label: '2025', revenue: 1680000, grossMarginPct: 18, netResult: 72000, cash: 156000, receivablesDays: 36, personnelCosts: 1150000 },
    ], customers: [] },
    dependency: { customerConcentrationTop1: 0.08, customerConcentrationTop3: 0.2, ownerInThreadShare: 0.45 },
    _expect: 'Reputation REVEAL (trust vs promise: claims veiligheid, weak headers, near-expiry cert). Finance SILENCE. Dependency SILENCE.',
  },
  {
    id: 'flex-markt', label: 'FlexMarkt (B2B diensten, divers en gezond)', provenance: 'synthetic',
    profile: { size: 'middel', model: 'B2B', locality: 'landelijk', kind: 'dienst', online: 'sterk', age: 'gevestigd' },
    website: { claims: [ { subject: 'snelle doorlooptijd', quote: 'Van aanvraag tot oplevering binnen tien dagen.', kind: 'self_claim', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.5, count: 120, responseRate: 0.6, reviewThemes: [ { theme: 'snelle doorlooptijd', share: 0.35 }, { theme: 'service', share: 0.3 } ] },
      identity: { kvkName: 'FlexMarkt BV', siteName: 'FlexMarkt', gbpName: 'FlexMarkt', kvkAddress: 'Stationsplein 9 Utrecht', siteAddress: 'Stationsplein 9 Utrecht' },
      findability: { domainAgeYears: 10, indexedPages: 140, nonBrandedImpressions: 9000 },
      trust: { https: true, hsts: true, securityHeadersScore: 5, certDaysToExpiry: 250 },
    },
    finance: { periods: [
      { label: '2024', revenue: 1400000, grossMarginPct: 40, netResult: 130000, cash: 260000, receivablesDays: 30, personnelCosts: 600000 },
      { label: '2025', revenue: 1520000, grossMarginPct: 41, netResult: 150000, cash: 300000, receivablesDays: 29, personnelCosts: 640000 },
    ], customers: [ { name: 'Klant 1', shareByPeriod: [0.12, 0.12] } ] },
    dependency: { customerConcentrationTop1: 0.12, customerConcentrationTop3: 0.3, ownerInThreadShare: 0.35, supplierConcentrationTop2: 0.4, channelDependency: { channel: 'organisch', trafficShare: 0.4 } },
    _expect: 'ALL THREE SILENCE (honest nothing-to-reveal case; promise matches reception, finance aligned, diversified).',
  },
  {
    id: 'bouwmaat-groothandel', label: 'Bouwmaat Groothandel (B2B product)', provenance: 'synthetic',
    profile: { size: 'middel', model: 'B2B', locality: 'regionaal', kind: 'product', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [ { subject: 'persoonlijk contact', quote: 'Een vaste contactpersoon die u kent.', kind: 'self_emphasis', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.1, count: 38, responseRate: 0.03, reviewThemes: [ { theme: 'prijs', share: 0.4 }, { theme: 'voorraad', share: 0.3 } ] },
      identity: { kvkName: 'Bouwmaat Groothandel BV', siteName: 'Bouwmaat', gbpName: 'Bouwmaat Groothandel', kvkAddress: 'Handelsweg 40 Eindhoven', siteAddress: 'Handelsweg 40 Eindhoven' },
      findability: { domainAgeYears: 12, indexedPages: 80, nonBrandedImpressions: 4000 },
      trust: { https: true, hsts: true, securityHeadersScore: 3, certDaysToExpiry: 180 },
    },
    finance: { periods: [
      { label: '2024', revenue: 3000000, grossMarginPct: 20, netResult: 150000, cash: 250000, receivablesDays: 40, personnelCosts: 500000 },
      { label: '2025', revenue: 3150000, grossMarginPct: 20, netResult: 140000, cash: 258000, receivablesDays: 41, personnelCosts: 620000 },
    ], customers: [ { name: 'Klant M', shareByPeriod: [0.25, 0.27] } ] },
    dependency: { customerConcentrationTop1: 0.27, customerConcentrationTop3: 0.55, ownerInThreadShare: 0.4, supplierConcentrationTop2: 0.78 },
    _expect: 'Reputation REVEAL (attention claim, reviews unanswered TELLING_ABSENCE, or promise vs prijs/voorraad). Finance REVEAL (personnel vs revenue divergence, extended, suppressed under frozen). Dependency REVEAL (supplier concentration + healthy).',
  },
  {
    id: 'studio-lumen', label: 'Studio Lumen (creatief B2C, jong)', provenance: 'synthetic',
    profile: { size: 'micro', model: 'B2C', locality: 'digitaal', kind: 'dienst', online: 'sterk', age: 'jong' },
    website: { claims: [ { subject: 'op maat gemaakt', quote: 'Elk ontwerp volledig op maat.', kind: 'self_emphasis', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.9, count: 26, responseRate: 0.5, reviewThemes: [ { theme: 'snelheid', share: 0.4 }, { theme: 'prijs', share: 0.3 }, { theme: 'op maat gemaakt', share: 0.05 } ] },
      identity: { kvkName: 'Studio Lumen', siteName: 'Studio Lumen', gbpName: 'Studio Lumen', kvkAddress: 'Thuisadres afgeschermd', siteAddress: 'Online' },
      findability: { domainAgeYears: 2, indexedPages: 15, nonBrandedImpressions: 3000 },
      trust: { https: true, hsts: true, securityHeadersScore: 4, certDaysToExpiry: 200 },
    },
    finance: { periods: [ { label: '2025', revenue: 90000, grossMarginPct: 70, netResult: 30000, cash: 25000, receivablesDays: 20, personnelCosts: 0 } ], customers: [] },
    dependency: { ownerInThreadShare: 0.95 },
    _expect: 'Reputation REVEAL (promise op maat vs reception snelheid/prijs). Finance INSUFFICIENT (1 period). Dependency INSUFFICIENT/SILENCE (no surface health from 1 period).',
  },
  {
    id: 'techno-parts', label: 'Techno Parts (B2B product, groei)', provenance: 'synthetic',
    profile: { size: 'middel', model: 'B2B', locality: 'landelijk', kind: 'product', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [ { subject: 'levertijd', quote: 'Korte levertijden door eigen voorraad.', kind: 'self_claim', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.0, count: 22, responseRate: 0.2, reviewThemes: [ { theme: 'levertijd', share: 0.35 } ] },
      identity: { kvkName: 'Techno Parts BV', siteName: 'Techno Parts', gbpName: 'Techno Parts', kvkAddress: 'Nijverheidsstraat 3 Almelo', siteAddress: 'Nijverheidsstraat 3 Almelo' },
      findability: { domainAgeYears: 9, indexedPages: 90, nonBrandedImpressions: 3500 },
      trust: { https: true, hsts: true, securityHeadersScore: 3, certDaysToExpiry: 140 },
    },
    finance: { periods: [
      { label: '2024', revenue: 1800000, grossMarginPct: 28, netResult: 90000, cash: 220000, receivablesDays: 38, personnelCosts: 350000 },
      { label: '2025', revenue: 2050000, grossMarginPct: 24, netResult: 70000, cash: 150000, receivablesDays: 55, personnelCosts: 400000 },
    ], customers: [ { name: 'OEM Groot', shareByPeriod: [0.24, 0.38] } ] },
    dependency: { customerConcentrationTop1: 0.38, customerConcentrationTop3: 0.62, ownerInThreadShare: 0.5, supplierConcentrationTop2: 0.6 },
    _expect: 'Finance REVEAL: multiple relations (revenue up cash down; margin drift; concentration). Selector picks one CONTRADICTION. Dependency REVEAL (concentration + healthy? margin dropped so maybe not healthy). Reputation SILENCE (thin reviews).',
  },
  {
    id: 'de-vries-advies', label: 'De Vries Advies (solo consultant, B2B)', provenance: 'synthetic',
    profile: { size: 'micro', model: 'B2B', locality: 'landelijk', kind: 'dienst', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [ { subject: 'strategisch advies', quote: 'Strategisch advies dat blijft plakken.', kind: 'self_claim', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 5.0, count: 8, responseRate: 0.6, reviewThemes: [ { theme: 'deskundig', share: 0.5 } ] },
      identity: { kvkName: 'De Vries Advies', siteName: 'De Vries Advies', gbpName: 'De Vries Advies', kvkAddress: 'Afgeschermd', siteAddress: 'Online' },
      findability: { domainAgeYears: 6, indexedPages: 20, nonBrandedImpressions: 800 },
      trust: { https: true, hsts: true, securityHeadersScore: 4, certDaysToExpiry: 220 },
    },
    finance: { periods: [
      { label: '2024', revenue: 180000, grossMarginPct: 85, netResult: 90000, cash: 70000, receivablesDays: 25, personnelCosts: 0 },
      { label: '2025', revenue: 210000, grossMarginPct: 85, netResult: 105000, cash: 82000, receivablesDays: 26, personnelCosts: 0 },
    ], customers: [ { name: 'Klant hoofd', shareByPeriod: [0.4, 0.45] } ] },
    dependency: { customerConcentrationTop1: 0.45, customerConcentrationTop3: 0.8, ownerInThreadShare: 1.0, keyPersonRevenueShare: 1.0 },
    _expect: 'Dependency REVEAL (owner 100% in threads + healthy = the job-not-a-business reveal). Finance REVEAL? concentration rising 40->45 (8pp? no, 5pp) so maybe not. Reputation reviews <10 for absence rule.',
  },
  {
    id: 'horeca-plein', label: 'Horeca Plein (restaurant, B2C)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2C', locality: 'lokaal', kind: 'dienst', online: 'gemiddeld', age: 'gevestigd' },
    website: { claims: [ { subject: 'gastvrijheid en aandacht', quote: 'Bij ons voelt u zich echt welkom, met aandacht voor elk detail.', kind: 'self_emphasis', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.3, count: 210, responseRate: 0.02, reviewThemes: [ { theme: 'gastvrijheid en aandacht', share: 0.3 }, { theme: 'smaak', share: 0.35 } ] },
      identity: { kvkName: 'Horeca Plein VOF', siteName: 'Restaurant Plein', gbpName: 'Restaurant Plein', kvkAddress: 'Marktplein 1 Maastricht', siteAddress: 'Marktplein 1 Maastricht' },
      findability: { domainAgeYears: 10, indexedPages: 20, nonBrandedImpressions: 5000 },
      trust: { https: true, hsts: true, securityHeadersScore: 3, certDaysToExpiry: 160 },
    },
    finance: { periods: [
      { label: '2024', revenue: 620000, grossMarginPct: 65, netResult: 45000, cash: 60000, receivablesDays: 2, personnelCosts: 260000 },
      { label: '2025', revenue: 650000, grossMarginPct: 64, netResult: 47000, cash: 64000, receivablesDays: 2, personnelCosts: 275000 },
    ], customers: [] },
    dependency: { customerConcentrationTop1: 0.02, ownerInThreadShare: 0.6 },
    _expect: 'Reputation REVEAL (attention promise, 210 reviews, near-zero response = TELLING_ABSENCE). Finance SILENCE. Dependency SILENCE.',
  },
  {
    id: 'saas-metrics', label: 'SaaS Metrics (digitaal, gezond)', provenance: 'synthetic',
    profile: { size: 'klein', model: 'B2B', locality: 'digitaal', kind: 'dienst', online: 'sterk', age: 'jong' },
    website: { claims: [ { subject: 'inzicht in realtime', quote: 'Altijd actueel inzicht in je cijfers.', kind: 'self_claim', prominence: 'hero' } ] },
    reputation: {
      places: { rating: 4.6, count: 40, responseRate: 0.7, reviewThemes: [ { theme: 'inzicht in realtime', share: 0.4 }, { theme: 'support', share: 0.3 } ] },
      identity: { kvkName: 'SaaS Metrics BV', siteName: 'SaaS Metrics', gbpName: 'SaaS Metrics', kvkAddress: 'Coolsingel 5 Rotterdam', siteAddress: 'Coolsingel 5 Rotterdam' },
      findability: { domainAgeYears: 5, indexedPages: 100, nonBrandedImpressions: 8000 },
      trust: { https: true, hsts: true, securityHeadersScore: 5, certDaysToExpiry: 300 },
    },
    finance: { periods: [
      { label: '2024', revenue: 700000, grossMarginPct: 80, netResult: 120000, cash: 300000, receivablesDays: 15, personnelCosts: 300000 },
      { label: '2025', revenue: 820000, grossMarginPct: 80, netResult: 150000, cash: 360000, receivablesDays: 15, personnelCosts: 340000 },
    ], customers: [ { name: 'Klant top', shareByPeriod: [0.1, 0.11] } ] },
    dependency: { customerConcentrationTop1: 0.11, customerConcentrationTop3: 0.28, ownerInThreadShare: 0.3, channelDependency: { channel: 'organisch', trafficShare: 0.45 } },
    _expect: 'ALL THREE SILENCE (second honest silence, digital flavour).',
  },
];
