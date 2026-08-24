// Bewijstest. Draait de echte scanner tegen de lokale nabootsing en
// controleert drie dingen:
//   1. een gezonde route levert GROEN op;
//   2. een agenda zonder tijden levert ORANJE op;
//   3. een locatiepagina zonder afspraakknop levert ROOD op.
// Daarnaast wordt gecontroleerd dat de scanner nooit een POST heeft gedaan,
// dus dat er nooit een afspraak is vastgelegd.

import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { draaiScan } from '../src/scan.mjs';
import { startFixture } from './server.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const UITVOER = resolve(HIER, '..', 'runs', 'fixture');

const GEVALLEN = [
  { variant: 'groen', verwacht: 'GROEN' },
  { variant: 'echt-achtig', verwacht: 'GROEN' },
  { variant: 'portaal-echt', verwacht: 'GROEN' },
  { variant: 'portaal-datum-eerst', verwacht: 'GROEN' },
  { variant: 'oranje-persoonsgegevens', verwacht: 'ORANJE', persoonsgegevens: true },
  { variant: 'oranje-geen-tijden', verwacht: 'ORANJE' },
  { variant: 'rood-knop', verwacht: 'ROOD' },
  { variant: 'rood-geen-online-route', verwacht: 'ROOD', geenPortaalLink: true },
];

rmSync(UITVOER, { recursive: true, force: true });

let fouten = 0;

for (const geval of GEVALLEN) {
  const fixture = await startFixture({ variant: geval.variant });
  const url = `${fixture.basis}/vestigingen/revalidatie-amersfoort-databankweg/`;
  process.stdout.write(`\n=== Fixture variant ${geval.variant} op ${url} ===\n`);

  try {
    const { resultaat } = await draaiScan({
      headed: false,
      locatie: 'revalidatie-amersfoort-databankweg',
      url,
      slowMo: 0,
      out: join(UITVOER, geval.variant),
    });

    if (resultaat.status !== geval.verwacht) {
      process.stdout.write(`FAIL: verwacht ${geval.verwacht}, gekregen ${resultaat.status}\n`);
      fouten += 1;
    } else {
      process.stdout.write(`PASS: status ${resultaat.status}\n`);
    }

    if (geval.persoonsgegevens) {
      const meta = resultaat.checks.agendaGeladen?.meta ?? {};
      if (meta.persoonsgegevensVoorAgenda === true) {
        process.stdout.write('PASS: de scan stopt bij het scherm voor persoonsgegevens\n');
      } else {
        process.stdout.write(`FAIL: stop bij persoonsgegevens niet herkend: ${JSON.stringify(meta)}\n`);
        fouten += 1;
      }
    }

    if (geval.geenPortaalLink) {
      const meta = resultaat.checks.portaalBereikbaar?.meta ?? {};
      if (meta.geenPortaalLink === true) {
        process.stdout.write('PASS: de scan stelt vast dat er geen online ingang op de pagina staat\n');
      } else {
        process.stdout.write(`FAIL: ontbrekende online ingang niet herkend: ${JSON.stringify(meta)}\n`);
        fouten += 1;
      }
    }

    const posts = fixture.gebeurtenissen.filter((g) => g.methode !== 'GET');
    if (posts.length > 0) {
      process.stdout.write(`FAIL: de scanner heeft een schrijfverzoek gedaan: ${JSON.stringify(posts)}\n`);
      fouten += 1;
    } else {
      process.stdout.write('PASS: geen enkel schrijfverzoek, dus geen afspraak vastgelegd\n');
    }

    const bevestigd = fixture.gebeurtenissen.some((g) => /bevestigen/.test(g.pad));
    if (bevestigd) {
      process.stdout.write('FAIL: het bevestigingsendpoint is geraakt\n');
      fouten += 1;
    } else {
      process.stdout.write('PASS: het bevestigingsendpoint is niet geraakt\n');
    }
  } catch (err) {
    process.stdout.write(`FAIL: scan brak af met ${err.stack ?? err.message}\n`);
    fouten += 1;
  } finally {
    await fixture.stop();
  }
}

process.stdout.write(`\n${fouten === 0 ? 'ALLE FIXTURE TESTS GESLAAGD' : `${fouten} FIXTURE TESTS GEFAALD`}\n`);
process.exit(fouten === 0 ? 0 : 1);
