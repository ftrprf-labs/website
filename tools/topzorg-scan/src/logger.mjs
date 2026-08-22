import { appendFileSync } from 'node:fs';

// Bewust simpel: elke regel gaat naar stdout en naar het runlogbestand, zodat
// achteraf exact terug te lezen is waar een flow is gestopt.
export function maakLogger(logBestand) {
  const regels = [];

  function schrijf(niveau, bericht) {
    const ts = new Date().toISOString();
    const regel = `${ts} [${niveau.toUpperCase()}] ${bericht}`;
    regels.push(regel);
    process.stdout.write(regel + '\n');
    if (logBestand) {
      try {
        appendFileSync(logBestand, regel + '\n');
      } catch {
        // Logging mag de scan nooit laten falen.
      }
    }
  }

  return {
    info: (b) => schrijf('info', b),
    stap: (b) => schrijf('stap', b),
    ok: (b) => schrijf('ok', b),
    waarschuwing: (b) => schrijf('waarschuwing', b),
    fout: (b) => schrijf('fout', b),
    regels: () => [...regels],
  };
}
