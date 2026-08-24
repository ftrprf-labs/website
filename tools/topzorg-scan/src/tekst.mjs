// Kleine tekstopschoning voor foutmeldingen. Playwright hangt een uitgebreide
// call log met opmaakcodes aan een fout. Dat hoort niet in een rapport dat een
// mens leest.

// ANSI opmaakcodes, met of zonder het escape teken ervoor.
const OPMAAKCODES = /\u001b?\[[0-9;]{0,4}m/g;

export function nettFoutmelding(err, maxLengte = 220) {
  const ruw = typeof err === 'string' ? err : (err?.message ?? String(err));
  const eersteRegel = ruw.replace(OPMAAKCODES, '').split('\n')[0].trim();
  return eersteRegel.length > maxLengte ? `${eersteRegel.slice(0, maxLengte)}...` : eersteRegel;
}

// Netwerkfouten die bij de scanner zelf horen en niet bij de website. Zonder
// dit onderscheid meldt de scan ROOD terwijl er niets mis hoeft te zijn met de
// vestiging.
const EIGEN_NETWERKFOUTEN = [
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_PROXY_CONNECTION_FAILED',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NETWORK_CHANGED',
  'ERR_SOCKS_CONNECTION_FAILED',
];

export function isEigenNetwerkprobleem(err) {
  const tekst = typeof err === 'string' ? err : (err?.message ?? '');
  return EIGEN_NETWERKFOUTEN.some((code) => tekst.includes(code));
}

export const NETWERK_TOELICHTING =
  'Deze melding wijst op het netwerk van de scanner zelf, bijvoorbeeld een proxy of een verbroken verbinding, en niet noodzakelijk op een storing bij de vestiging. Draai de scan opnieuw vanaf een werkplek met gewone internettoegang voordat je hier conclusies aan verbindt.';
