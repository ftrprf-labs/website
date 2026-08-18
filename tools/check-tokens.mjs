// Poort 2 uit de pre-implementation gate: het gevendorde tokenbestand moet de checksum
// dragen die de canon zelf noemt. Wijkt hij af, dan is het bestand stale en mag het niet
// als referentie worden gebruikt (03-ux/README.md, regel 3).
//
// Het bestand is GEGENEREERD. Hand-bewerken is verboden (canon hoofdstuk 17, punt 4).
// Deze test bewaakt dat: elke handmatige wijziging aan een tokenwaarde verandert de
// inhoud, en dan klopt de zelf-gedeclareerde checksum niet meer met de vastgelegde.

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = join(ROOT, 'public', 'vendor', 'maculis-tokens.css');

// De canon die dit product vendort. Bij een canon-amendement wordt deze waarde
// bijgewerkt in dezelfde commit als het nieuwe tokenbestand, nooit los.
const EXPECTED_CANON_CHECKSUM = '04d6b40907f2bbda';
const EXPECTED_VERSION = '1.0.0';

// Inhoudshash van het bestand zoals het uit de canon kwam. Bewaakt hand-bewerken.
const EXPECTED_CONTENT_SHA256 = '367487a853ff7fdb';

test('tokenbestand draagt de canonieke checksum', async () => {
  const css = await readFile(TOKENS, 'utf8');
  const declared = /checksum\s+([0-9a-f]{8,})/.exec(css)?.[1];
  assert.equal(declared, EXPECTED_CANON_CHECKSUM,
    'De checksum in de kop wijkt af van de canon. Bestand is stale of bewerkt.');
});

test('tokenbestand draagt de verwachte versie', async () => {
  const css = await readFile(TOKENS, 'utf8');
  const version = /versie\s+([0-9.]+)/.exec(css)?.[1];
  assert.equal(version, EXPECTED_VERSION);
});

test('tokenbestand is niet met de hand bewerkt', async () => {
  const css = await readFile(TOKENS, 'utf8');
  const actual = createHash('sha256').update(css).digest('hex').slice(0, 16);
  assert.equal(actual, EXPECTED_CONTENT_SHA256,
    `Inhoud gewijzigd. Verwacht ${EXPECTED_CONTENT_SHA256}, gevonden ${actual}. `
    + 'Een tokenwaarde hoort via de canon te wijzigen, nooit hier.');
});
