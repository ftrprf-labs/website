// Lens candidate 2: Finance via Bring Your Data (no live bookkeeping connection).
// Question: is my business as financially healthy as the top-line makes it feel, and what
// relationship am I not seeing. Evidence: the smallest useful upload (two P&L/balance periods,
// aged receivables, a customer revenue split). Signals are HARD (L3/L4 ledger facts).
// Not a dashboard: it surfaces at most one relationship, never a statement dump.
//
// Deliberate hypothesis test: revenue-vs-cash and margin-drift map cleanly to CONTRADICTION
// (two operational facts in tension) and pass the frozen gate. But customer-concentration and
// personnel-vs-revenue are quantitative/temporal relations that do NOT fit the four website
// families; we keep them as extended families (CONCENTRATION, TREND_DIVERGENCE), single-domain
// and non-cross-lens, precisely so the bake-off can measure whether the frozen gate suppresses
// them. This is where "just configuration on the engine" is under test.

import { obs, rel, ref, pp, pct } from './_util.mjs';

const LENS = 'finance';
const growth = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0);

export const financeLens = {
  id: 'finance.byd',
  name: 'Finance (Bring Your Data)',
  observe(c) {
    const out = [];
    const f = c.finance || {};
    const periods = f.periods || [];
    if (periods.length < 2) return out;
    const prev = periods[periods.length - 2];
    const cur = periods[periods.length - 1];

    out.push(obs({
      lens: LENS, kind: 'operational_fact', subject: 'omzetontwikkeling',
      statement: `Omzet ${prev.label} ${prev.revenue} naar ${cur.label} ${cur.revenue} (${growth(cur.revenue, prev.revenue)}%).`,
      confidence: 'L4',
      basis: [ref('upload:pl', `omzet ${prev.revenue} -> ${cur.revenue}`, 'file')],
    }));
    out.push(obs({
      lens: LENS, kind: 'operational_fact', subject: 'vrije kas',
      statement: `Vrije kas ${prev.cash} naar ${cur.cash} (${growth(cur.cash, prev.cash)}%).`,
      confidence: 'L4',
      basis: [ref('upload:balance', `kas ${prev.cash} -> ${cur.cash}`, 'file')],
    }));
    out.push(obs({
      lens: LENS, kind: 'operational_fact', subject: 'brutomarge',
      statement: `Brutomarge ${prev.grossMarginPct}% naar ${cur.grossMarginPct}% (${pp(cur.grossMarginPct, prev.grossMarginPct)} punt).`,
      confidence: 'L4',
      basis: [ref('upload:pl', `marge ${prev.grossMarginPct}% -> ${cur.grossMarginPct}%`, 'file')],
    }));
    if (typeof cur.receivablesDays === 'number') {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'debiteurentermijn',
        statement: `Klanten betalen gemiddeld ${prev.receivablesDays} dagen (${prev.label}) naar ${cur.receivablesDays} dagen (${cur.label}).`,
        confidence: 'L3',
        basis: [ref('upload:aged-ar', `DSO ${prev.receivablesDays} -> ${cur.receivablesDays}`, 'file')],
      }));
    }
    if (typeof cur.personnelCosts === 'number') {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'personeelskosten',
        statement: `Personeelskosten ${prev.personnelCosts} naar ${cur.personnelCosts} (${growth(cur.personnelCosts, prev.personnelCosts)}%).`,
        confidence: 'L3',
        basis: [ref('upload:pl', `personeel ${prev.personnelCosts} -> ${cur.personnelCosts}`, 'file')],
      }));
    }
    // Customer concentration observation.
    const custs = f.customers || [];
    if (custs.length) {
      const top = [...custs].sort((a, b) => b.shareByPeriod[b.shareByPeriod.length - 1] - a.shareByPeriod[a.shareByPeriod.length - 1])[0];
      const curShare = top.shareByPeriod[top.shareByPeriod.length - 1];
      const prevShare = top.shareByPeriod[top.shareByPeriod.length - 2];
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'klantconcentratie',
        statement: `Grootste klant (${top.name}) ${pct(prevShare * 100)} naar ${pct(curShare * 100)} van de omzet.`,
        confidence: 'L4',
        basis: [ref('upload:revenue-split', `top1 ${pct(prevShare * 100)} -> ${pct(curShare * 100)}`, 'file')],
      }));
    }
    return out;
  },

  relate(observations, c) {
    const out = [];
    const f = c.finance || {};
    const periods = f.periods || [];
    if (periods.length < 2) return out;
    const prev = periods[periods.length - 2];
    const cur = periods[periods.length - 1];
    const revUp = growth(cur.revenue, prev.revenue) >= 5;

    const oRev = observations.find((o) => o.subject === 'omzetontwikkeling');
    const oCash = observations.find((o) => o.subject === 'vrije kas');
    const oMargin = observations.find((o) => o.subject === 'brutomarge');
    const oDso = observations.find((o) => o.subject === 'debiteurentermijn');
    const oPers = observations.find((o) => o.subject === 'personeelskosten');
    const oConc = observations.find((o) => o.subject === 'klantconcentratie');

    // 1) Revenue up, cash down. CONTRADICTION (fits the frozen four; passes as undeniable).
    if (revUp && growth(cur.cash, prev.cash) <= -5) {
      const parts = [oRev, oCash, oDso].filter(Boolean);
      out.push(rel({
        family: 'CONTRADICTION',
        obsList: parts,
        crossLens: false,
        tension: `Je omzet groeide, je vrij beschikbare kas daalde.` + (oDso ? ` Het verschil zit in je debiteuren.` : ''),
        why: 'Raakt de vraag: waar gaat mijn groei naartoe als het niet in mijn kas terechtkomt?',
        confidence: 'L4',
      }));
    }

    // 2) Margin drift under growth. CONTRADICTION.
    if (revUp && pp(cur.grossMarginPct, prev.grossMarginPct) <= -2) {
      out.push(rel({
        family: 'CONTRADICTION',
        obsList: [oRev, oMargin].filter(Boolean),
        crossLens: false,
        tension: `Je verkocht meer, maar op elke euro omzet hield je minder over dan een jaar geleden.`,
        why: 'Raakt de vraag: groei ik in omzet of in verdiencapaciteit?',
        confidence: 'L4',
      }));
    }

    // 3) Customer concentration rising. Extended family CONCENTRATION, single-domain (not cross-lens).
    //    Kept as-is to expose the frozen-gate gap.
    const custs = f.customers || [];
    if (revUp && custs.length) {
      const top = [...custs].sort((a, b) => b.shareByPeriod[b.shareByPeriod.length - 1] - a.shareByPeriod[a.shareByPeriod.length - 1])[0];
      const curShare = top.shareByPeriod[top.shareByPeriod.length - 1];
      const prevShare = top.shareByPeriod[top.shareByPeriod.length - 2];
      if (curShare >= 0.3 && (curShare - prevShare) >= 0.08) {
        out.push(rel({
          family: 'CONCENTRATION',
          obsList: [oConc, oRev].filter(Boolean),
          crossLens: false,
          tension: `Je groei en je risico komen dit jaar uit dezelfde bron: een klant die van ${pct(prevShare * 100)} naar ${pct(curShare * 100)} van je omzet groeide.`,
          why: 'Raakt de vraag: hoe stevig sta ik als deze ene klant wegvalt?',
          confidence: 'L4',
        }));
      }
    }

    // 4) Personnel cost growing faster than revenue. Extended family TREND_DIVERGENCE, single-domain.
    if (oPers && growth(cur.personnelCosts, prev.personnelCosts) - growth(cur.revenue, prev.revenue) >= 8) {
      out.push(rel({
        family: 'TREND_DIVERGENCE',
        obsList: [oPers, oRev].filter(Boolean),
        crossLens: false,
        tension: `Je personeelskosten groeiden sneller dan je omzet.`,
        why: 'Raakt de vraag: groeit mijn capaciteit mee met wat die capaciteit oplevert?',
        confidence: 'L3',
      }));
    }
    return out;
  },

  word(rel) { return rel.tension; },
};
