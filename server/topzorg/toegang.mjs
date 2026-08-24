// Toegang tot het beschikbaarheidsoverzicht.
//
// Bewust een aparte poort naast de admin-login van Testerbeheer. Die applicatie
// bevat persoonsgegevens en hoort bij een kleine kring. Dit overzicht bevat geen
// persoonsgegevens en mag naar een bredere groep collega's, bijvoorbeeld
// marketing. Twee losse wachtwoorden houden die kringen uit elkaar.
//
// Een gedeeld wachtwoord is geen volwaardige authenticatie. Het past bij wat
// hier beschermd wordt: bedrijfsinformatie zonder persoonsgegevens. Zou hier
// ooit iets gevoeligers bij komen, dan hoort er echte authenticatie te staan.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { config } from '../config.mjs';

const COOKIE = 'tz_overzicht';
const GELDIG_MS = 30 * 24 * 60 * 60 * 1000;

const GEHEIM = config.authSecret ? Buffer.from(config.authSecret, 'utf8') : randomBytes(32);

function onderteken(inhoud) {
  return createHmac('sha256', GEHEIM).update(`topzorg.${inhoud}`).digest('base64url');
}

function maakToken() {
  const verloopt = Date.now() + GELDIG_MS;
  return `${verloopt}.${onderteken(String(verloopt))}`;
}

function tokenGeldig(token) {
  if (!token) return false;
  const delen = String(token).split('.');
  if (delen.length !== 2) return false;
  const [verloopt, handtekening] = delen;
  const verwacht = onderteken(verloopt);
  const a = Buffer.from(handtekening);
  const b = Buffer.from(verwacht);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(verloopt) > Date.now();
}

function leesCookie(req, naam) {
  const ruw = req.headers.cookie;
  if (!ruw) return null;
  for (const deel of ruw.split(';')) {
    const [sleutel, ...rest] = deel.trim().split('=');
    if (sleutel === naam) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Zonder wachtwoord in de omgeving staat het overzicht open. Dat mag lokaal,
// maar in productie hoort er een wachtwoord te staan.
export function wachtwoordVereist() {
  return Boolean(config.topzorgWachtwoord);
}

export function heeftToegang(req) {
  if (!wachtwoordVereist()) return !config.production;
  return tokenGeldig(leesCookie(req, COOKIE));
}

export function controleerWachtwoord(ingevoerd) {
  if (!config.topzorgWachtwoord) return false;
  const a = Buffer.from(String(ingevoerd ?? ''));
  const b = Buffer.from(config.topzorgWachtwoord);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function zetCookie(res) {
  const kenmerken = [
    `${COOKIE}=${maakToken()}`,
    'Path=/topzorg',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(GELDIG_MS / 1000)}`,
  ];
  if (config.production) kenmerken.push('Secure');
  res.setHeader('Set-Cookie', kenmerken.join('; '));
}

export function wisCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/topzorg; HttpOnly; SameSite=Strict; Max-Age=0`);
}
