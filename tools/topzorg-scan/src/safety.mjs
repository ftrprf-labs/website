// Veiligheidslaag. Ontwerpprincipe 1 van de opdracht: de agent maakt nooit een
// echte afspraak. Dat wordt hier op drie manieren afgedwongen:
//   1. de flow stopt uit zichzelf bij de agenda, voor het bevestigingsscherm;
//   2. elke klik gaat door een guard die verboden labels weigert;
//   3. schrijvende netwerkverzoeken naar bevestig- en boekingsendpoints
//      worden geblokkeerd, ook als een klik onverhoopt toch doorkomt.

export class VeiligheidsStop extends Error {
  constructor(bericht) {
    super(bericht);
    this.name = 'VeiligheidsStop';
  }
}

// Labels die duiden op een definitieve handeling. Nooit klikken.
export const VERBODEN_LABELS = [
  /bevestig/i,
  /definitief/i,
  /afspraak vastleggen/i,
  /vastleggen/i,
  /boek(en|ing)?\b/i,
  /reserveer/i,
  /afronden/i,
  /betaal|betalen/i,
  /verstuur|versturen|verzenden/i,
  /account aanmaken/i,
  /registreren/i,
  /inloggen/i,
];

// Endpoints die een boeking wegschrijven. Alleen schrijvende methodes blokkeren,
// zodat gewone GET verkeer van de agenda gewoon werkt.
export const VERBODEN_ENDPOINTS = [
  /confirm/i,
  /bevestig/i,
  /\bbook(ing)?\b/i,
  /reserv/i,
  /appointment[s]?\/(create|new|save)/i,
  /afspraak\/(opslaan|bevestigen|maak)/i,
  /register|signup|sign-up/i,
];

const SCHRIJVENDE_METHODES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Zet de netwerkblokkade op een browsercontext. Retourneert een array waarin
// geblokkeerde verzoeken worden bijgehouden, zodat het rapport kan laten zien
// dat de rem daadwerkelijk heeft gewerkt.
export function installeerNetwerkRem(context, logger) {
  const geblokkeerd = [];

  context.route('**/*', async (route) => {
    const request = route.request();
    const methode = request.method().toUpperCase();
    const url = request.url();

    if (SCHRIJVENDE_METHODES.has(methode) && VERBODEN_ENDPOINTS.some((p) => p.test(url))) {
      geblokkeerd.push({ methode, url });
      logger.waarschuwing(`Netwerkrem heeft ${methode} ${url} geblokkeerd. Dit verzoek lijkt op een boeking.`);
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });

  return geblokkeerd;
}

// Weigert een klik op alles wat naar een definitieve handeling ruikt.
export async function veiligKlikken(locator, logger, { context = 'stap', timeoutMs = 15000 } = {}) {
  let label = '';
  try {
    label = ((await locator.innerText({ timeout: 2000 })) || '').trim();
  } catch {
    label = '';
  }
  if (!label) {
    try {
      label = ((await locator.getAttribute('aria-label')) || '').trim();
    } catch {
      label = '';
    }
  }

  const verboden = VERBODEN_LABELS.find((p) => p.test(label));
  if (verboden) {
    throw new VeiligheidsStop(
      `Klik geweigerd bij ${context}. Het element heeft label "${label.replace(/\s+/g, ' ')}" en dat duidt op een definitieve handeling.`,
    );
  }

  logger.info(`Klik op "${label.replace(/\s+/g, ' ').slice(0, 80) || '(zonder tekst)'}" bij ${context}.`);
  await locator.click({ timeout: timeoutMs });
  return label;
}

// De agent vult nooit velden in. Ontwerpprincipe 2: geen persoonsgegevens.
export function weigerInvoer(veldnaam) {
  throw new VeiligheidsStop(
    `Invoer geweigerd voor veld "${veldnaam}". De scan gebruikt geen persoonsgegevens.`,
  );
}
