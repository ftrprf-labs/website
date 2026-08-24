#!/usr/bin/env node
// Verkenning van de publieke API, zonder browser.
//
//   node src/api-verken.mjs [--focus="Fysiotherapie (intake)"] [--out=<map>]
//
// Doel: het contract compleet maken. De stappen focuses, referrals en practices
// zijn bekend uit de browserverkenning. De stap slots nog niet, want daar is de
// browser niet gekomen. Deze verkenning haalt alle stappen op en probeert voor
// slots een paar parametervarianten, zodat in een keer vaststaat welke werkt.
//
// Alleen GET verzoeken. De stappen persoonsgegevens en bevestigen worden niet
// benaderd, en de cliëntlaag weigert die paden ook actief.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiFout, kiesOpLabel, leesAdres, maakClient } from './api.mjs';
import { maakLogger } from './logger.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HIER, '..');

const STANDAARD_FOCUS = 'Fysiotherapie (intake)';
const STANDAARD_VERWIJZING = 'Geen verwijzing';

export async function verkenApi({
  focusLabel = STANDAARD_FOCUS,
  verwijzingLabel = STANDAARD_VERWIJZING,
  out = null,
  client = maakClient(),
  logger = maakLogger(null),
} = {}) {
  const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runMap = out ?? join(PROJECT, 'runs', `api_${stempel}`);
  mkdirSync(runMap, { recursive: true });

  const bewaar = (naam, data) => {
    writeFileSync(join(runMap, `${naam}.json`), JSON.stringify(data, null, 2), 'utf8');
  };

  const resultaat = { stappen: [], fouten: [] };

  logger.stap('Stap 1. Publiek token ophalen.');
  const { token, apiUrl, verlooptOp, organisatie } = await client.haalContext();
  logger.ok(`Token ontvangen, geldig tot ${verlooptOp}. API op ${apiUrl}.`);
  bewaar('01-context', { apiUrl, verlooptOp, organisatie });

  logger.stap('Stap 2. Stappen van de flow ophalen.');
  const { stappen, standaarden, ruw } = await client.haalStappen(apiUrl, token);
  bewaar('02-stappen', ruw);
  logger.ok(
    `${stappen.length} stappen. Standaardparameters: ${JSON.stringify(standaarden)}`,
  );
  resultaat.standaarden = standaarden;

  logger.stap('Stap 3. Aandachtsgebieden ophalen.');
  const focusData = await client.haalFocuses(apiUrl, token, standaarden);
  bewaar('03-focuses', focusData);
  const focuses = focusData?.focuses ?? [];
  logger.ok(`${focuses.length} aandachtsgebieden.`);

  const focus = kiesOpLabel(focuses, focusLabel);
  if (!focus) {
    throw new ApiFout(`Aandachtsgebied "${focusLabel}" niet gevonden in de lijst van ${focuses.length}.`);
  }
  logger.ok(`Gekozen aandachtsgebied: "${focus.label}" (${focus.reference}).`);
  resultaat.focus = focus;

  logger.stap('Stap 4. Verwijzingsopties ophalen.');
  const referralData = await client.haalReferrals(apiUrl, token, { ...standaarden, focus: focus.reference });
  bewaar('04-referrals', referralData);
  const referral = kiesOpLabel(referralData?.referrals ?? [], verwijzingLabel);
  if (!referral) throw new ApiFout(`Verwijzingsoptie "${verwijzingLabel}" niet gevonden.`);
  logger.ok(`Gekozen verwijzing: "${referral.label}" (${referral.reference}).`);
  resultaat.referral = referral;

  logger.stap('Stap 5. Locaties ophalen voor dit aandachtsgebied.');
  const practiceParams = { ...standaarden, focus: focus.reference, referral: referral.reference };
  const practiceData = await client.haalPractices(apiUrl, token, practiceParams);
  bewaar('05-practices', practiceData);
  const practices = practiceData?.practices ?? [];
  logger.ok(`${practices.length} locaties bieden "${focus.label}" aan.`);
  resultaat.practices = practices.map((p) => ({
    reference: p.reference,
    label: p.label,
    ...leesAdres(p),
  }));

  if (practices.length === 0) {
    logger.waarschuwing('Geen locaties, dus de stap slots is niet te verkennen.');
    bewaar('99-resultaat', resultaat);
    return { runMap, resultaat };
  }

  logger.stap('Stap 6. Beschikbaarheid ophalen. Parametervarianten worden een voor een geprobeerd.');
  const eerste = practices[0];
  logger.info(`Referentielocatie: "${eerste.label}".`);

  const varianten = [
    { naam: 'volledig', params: { ...practiceParams, practice: eerste.reference } },
    { naam: 'zonder-referral', params: { ...standaarden, focus: focus.reference, practice: eerste.reference } },
    { naam: 'alleen-practice', params: { ...standaarden, practice: eerste.reference } },
    { naam: 'zonder-practice', params: practiceParams },
  ];

  resultaat.slotVarianten = [];
  for (const variant of varianten) {
    try {
      const data = await client.haalSlots(apiUrl, token, variant.params);
      bewaar(`06-slots-${variant.naam}`, data);
      const sleutels = Object.keys(data ?? {});
      logger.ok(`Variant "${variant.naam}" werkt. Sleutels in het antwoord: ${sleutels.join(', ')}`);
      resultaat.slotVarianten.push({ ...variant, gelukt: true, sleutels });
      break;
    } catch (err) {
      logger.waarschuwing(`Variant "${variant.naam}" faalde: ${err.message}`);
      resultaat.slotVarianten.push({ ...variant, gelukt: false, fout: err.message });
    }
  }

  bewaar('99-resultaat', resultaat);
  return { runMap, resultaat };
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) {
  const opties = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--focus=')) opties.focusLabel = arg.slice('--focus='.length);
    else if (arg.startsWith('--verwijzing=')) opties.verwijzingLabel = arg.slice('--verwijzing='.length);
    else if (arg.startsWith('--out=')) opties.out = arg.slice('--out='.length);
  }
  const runMapVoorLog = opties.out ?? join(PROJECT, 'runs', `api_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  mkdirSync(runMapVoorLog, { recursive: true });
  opties.out = runMapVoorLog;
  opties.logger = maakLogger(join(runMapVoorLog, 'api-verken.log'));

  try {
    const { runMap, resultaat } = await verkenApi(opties);
    process.stdout.write(`\nVerkenning opgeslagen in ${runMap}\n`);
    process.stdout.write(`Locaties gevonden: ${resultaat.practices?.length ?? 0}\n`);
    const gelukt = (resultaat.slotVarianten ?? []).find((v) => v.gelukt);
    process.stdout.write(`Werkende slotvariant: ${gelukt ? gelukt.naam : 'geen'}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Verkenning afgebroken: ${err.stack ?? err.message}\n`);
    process.exit(3);
  }
}
