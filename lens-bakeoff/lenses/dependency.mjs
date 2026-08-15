// Lens candidate 3: Dependency and Resilience (wildcard, purest cross-lens).
// Question: how much of my business quietly depends on a single customer, supplier, person, or on me,
// and how transferable is it. The magic is relational: a business that looks healthy on the surface,
// while several loose data sources together reveal one hidden vulnerability.
//
// Evidence combines finance (concentration, surface health) with relationship routing (owner in the
// middle) and external structure (supplier, channel, platform, geography). The flagship reveal is a
// cross-lens CONTRADICTION (looks resilient, is fragile), which fits the frozen four AND is cross-lens,
// so it passes the frozen gate. Individual concentrations are modelled cross-lens where a second
// domain genuinely corroborates them, and single-domain otherwise, so the bake-off can compare.

import { obs, rel, ref, pct } from './_util.mjs';

const LENS = 'dependency';
const growth = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : 0);

function surfaceHealthy(c) {
  const periods = (c.finance && c.finance.periods) || [];
  if (periods.length < 2) return null;
  const prev = periods[periods.length - 2];
  const cur = periods[periods.length - 1];
  const revUp = growth(cur.revenue, prev.revenue) >= 5;
  const marginOk = cur.grossMarginPct >= prev.grossMarginPct - 1;
  const profitable = cur.netResult > 0;
  return { revUp, marginOk, profitable, cur, prev, healthy: revUp && marginOk && profitable };
}

export const dependencyLens = {
  id: 'dependency.resilience',
  name: 'Dependency and Resilience',
  observe(c) {
    const out = [];
    const d = c.dependency || {};
    const health = surfaceHealthy(c);

    if (health) {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'oppervlaktegezondheid',
        statement: `Omzet ${health.revUp ? 'groeit' : 'vlak'}, marge ${health.marginOk ? 'stabiel' : 'daalt'}, resultaat ${health.profitable ? 'positief' : 'negatief'}.`,
        confidence: 'L4',
        basis: [ref('upload:pl', `omzetgroei ${growth(health.cur.revenue, health.prev.revenue)}%, resultaat ${health.cur.netResult}`, 'file')],
      }));
    }
    if (typeof d.customerConcentrationTop1 === 'number') {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'klantafhankelijkheid',
        statement: `Grootste klant ${pct(d.customerConcentrationTop1 * 100)} van de omzet, top drie samen ${pct((d.customerConcentrationTop3 || 0) * 100)}.`,
        confidence: 'L4',
        basis: [ref('upload:revenue-split', `top1 ${pct(d.customerConcentrationTop1 * 100)}`, 'file')],
      }));
    }
    if (typeof d.ownerInThreadShare === 'number') {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'oprichterafhankelijkheid',
        statement: `In ${pct(d.ownerInThreadShare * 100)} van de actieve klantrelaties ben jij persoonlijk het aanspreekpunt.`,
        confidence: 'L3',
        basis: [ref('relationship-intelligence', `oprichter in ${pct(d.ownerInThreadShare * 100)} van relaties`, 'derived')],
      }));
    }
    if (typeof d.supplierConcentrationTop2 === 'number') {
      out.push(obs({
        lens: LENS, kind: 'operational_fact', subject: 'leveranciersafhankelijkheid',
        statement: `Twee leveranciers leveren samen ${pct(d.supplierConcentrationTop2 * 100)} van je inkoop.`,
        confidence: 'L3',
        basis: [ref('upload:purchase-split', `top2 leveranciers ${pct(d.supplierConcentrationTop2 * 100)}`, 'file')],
      }));
    }
    if (d.channelDependency && typeof d.channelDependency.trafficShare === 'number') {
      out.push(obs({
        lens: LENS, kind: 'external_signal', subject: 'kanaalafhankelijkheid',
        statement: `${pct(d.channelDependency.trafficShare * 100)} van je instroom komt via ${d.channelDependency.channel}.`,
        confidence: 'L3',
        basis: [ref('analytics-or-public', `${pct(d.channelDependency.trafficShare * 100)} via ${d.channelDependency.channel}`, 'proxy')],
      }));
    }
    return out;
  },

  relate(observations, c) {
    const out = [];
    const d = c.dependency || {};
    const health = surfaceHealthy(c);
    const oHealth = observations.find((o) => o.subject === 'oppervlaktegezondheid');
    const oCust = observations.find((o) => o.subject === 'klantafhankelijkheid');
    const oOwner = observations.find((o) => o.subject === 'oprichterafhankelijkheid');
    const oSup = observations.find((o) => o.subject === 'leveranciersafhankelijkheid');
    const oChan = observations.find((o) => o.subject === 'kanaalafhankelijkheid');

    // Flagship: looks resilient, is fragile. Cross-lens CONTRADICTION (surface health vs one hidden
    // concentration). This is the "several loose sources reveal one vulnerability" reveal.
    if (health && health.healthy) {
      const risks = [];
      if (d.customerConcentrationTop1 >= 0.35) risks.push({ o: oCust, what: `een klant die ${pct(d.customerConcentrationTop1 * 100)} van je omzet is` });
      if (d.ownerInThreadShare >= 0.7) risks.push({ o: oOwner, what: `bijna elke klantrelatie die via jou persoonlijk loopt` });
      if (d.supplierConcentrationTop2 >= 0.7) risks.push({ o: oSup, what: `twee leveranciers die ${pct(d.supplierConcentrationTop2 * 100)} van je inkoop leveren` });
      if (d.channelDependency && d.channelDependency.trafficShare >= 0.7) risks.push({ o: oChan, what: `een kanaal dat ${pct(d.channelDependency.trafficShare * 100)} van je instroom brengt` });
      if (risks.length) {
        const primary = risks[0];
        out.push(rel({
          family: 'CONTRADICTION',
          obsList: [oHealth, primary.o].filter(Boolean),
          crossLens: true,
          tension: `Je cijfers zien er gezond uit, en tegelijk hangt je bedrijf aan ${primary.what}.`,
          why: 'Raakt de vraag: als dat ene wegvalt, hoeveel van mijn gezonde bedrijf valt dan mee weg?',
          confidence: 'L4',
        }));
      }
    }

    // Owner in the middle (growth plus routing). Cross-lens CONCENTRATION.
    if (health && health.revUp && d.ownerInThreadShare >= 0.7 && oOwner) {
      out.push(rel({
        family: 'CONCENTRATION',
        obsList: [oOwner, oHealth].filter(Boolean),
        crossLens: true,
        tension: `Je groeit, en toch loopt ${pct(d.ownerInThreadShare * 100)} van je klantrelaties via jou persoonlijk.`,
        why: 'Raakt de vraag: bouw ik een bedrijf, of bouw ik een baan die alleen ik kan doen?',
        confidence: 'L3',
      }));
    }

    // Single-domain concentration (customer only), NOT cross-lens. Kept to test the frozen gate:
    // a pure concentration fact with no second corroborating domain.
    if (!health && d.customerConcentrationTop1 >= 0.4 && oCust) {
      out.push(rel({
        family: 'CONCENTRATION',
        obsList: [oCust],
        crossLens: false,
        tension: `Eén klant is ${pct(d.customerConcentrationTop1 * 100)} van je omzet.`,
        why: 'Raakt de vraag: hoe stevig sta ik als deze klant vertrekt?',
        confidence: 'L3',
      }));
    }
    return out;
  },

  word(rel) { return rel.tension; },
};
