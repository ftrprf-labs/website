// Mijn Maculis · Het Veld — klantomgeving.
//
// CSP-safe: geen inline handlers, geen externe bronnen. Het toegangstoken wordt één keer uit de URL
// gelezen (?t=), in het geheugen gehouden en uit de adresbalk verwijderd, zodat het niet in de
// geschiedenis of in bladwijzers achterblijft. Elke API-aanroep draagt het in de x-mijn-token header.
//
// HET VELD IS DE KAMER. Niet een visualisatie in de interface: de interface komt eruit voort.
// Drie dingen worden hier afgedwongen en staan daarom niet alleen in CSS:
//
//   1. Licht is bewijs. De straal van een kern is een functie van het aantal waarnemingen dat de
//      uitspraak draagt (canon 7). Dat aantal komt uit `evidence_count`, dezelfde fail-closed bron
//      als de bronnenlijst. Het veld kan daardoor nooit meer beweren dan het bewijs kan tonen.
//   2. Beweging is onzekerheid. De drift van een waarneming is een functie van (1 - voortgang);
//      wat betekenis heeft gekregen, verplaatst zich niet meer (canon 8.1).
//   3. Een verbinding ontstaat alleen tussen waarnemingen die over hetzelfde gaan, dus binnen
//      hetzelfde patroon. Nooit op grond van afstand alleen; dat is het verboden cliché.

(() => {
  'use strict';

  // ---- toegang -------------------------------------------------------------------------------
  const url = new URL(location.href);
  let token = url.searchParams.get('t') || sessionStorage.getItem('mijn_token') || '';
  if (url.searchParams.get('t')) {
    sessionStorage.setItem('mijn_token', token);
    url.searchParams.delete('t');
    history.replaceState(null, '', url.pathname + (url.hash || ''));
  }

  const $ = (id) => document.getElementById(id);
  const gate = $('gate'), gateMsg = $('gate-msg'), app = $('app');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: { 'x-mijn-token': token, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* leeg */ }
    return { status: res.status, data };
  }

  // ---- kleine hulpjes ------------------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));
  const nu = () => (window.performance && performance.now ? performance.now() : Date.now());

  function fmtDatum(iso, metDag) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return cap(d.toLocaleDateString('nl-NL', metDag
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'long', year: 'numeric' }));
    } catch { return ''; }
  }
  function fmtKort(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }); }
    catch { return ''; }
  }
  // Stabiele hash over een id: dezelfde organisatie krijgt altijd hetzelfde veld terug.
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000;
  }

  // Menselijke, Nederlandse statuslabels (canon 10). Geen Engelse hoofdletterbadges.
  const HOUDING = {
    reveal: 'Dit valt op',
    tension: 'Hier zit spanning',
    consistency: 'Hier zien we consistentie',
    non_reveal: 'Hier zien we géén verschil',
    unknown: 'Dit weten we nog niet',
  };
  const houdingLabel = (s) => HOUDING[s] || 'Dit zien we';

  // De houding vertaalt naar precies één van de vijf semantische rollen uit canon 3.3.
  // Dat er een nog niet gedeelde ontwikkeling ligt is een aparte toestand en overschrijft de
  // houding niet: canon 10 zegt dat de drie dimensies elkaar nooit overschrijven.
  function rol(i) {
    if (!i) return 'uncertain';
    switch (i.stance) {
      case 'tension': case 'reveal': return 'signal';
      case 'consistency': case 'non_reveal': return 'confirmed';
      default: return 'uncertain';
    }
  }

  // De bewijsdrempel waarboven violet ontsteekt hangt af van het SOORT uitspraak, niet van een
  // vast getal (canon 8.1): "een tegenstrijdigheid heeft aan twee gegronde signalen genoeg, een
  // patroon heeft er veel meer nodig". Onbekend ontsteekt nooit; onzekerheid blijft kleurloos.
  const DREMPEL = { tension: 2, reveal: 4, consistency: 5, non_reveal: 5, unknown: Infinity };
  const drempel = (i) => DREMPEL[i && i.stance] ?? 4;
  const bewijs = (i) => Math.max(1, Number(i && i.evidence_count) || 0);

  // ============================================================================================
  // 1. HET VELD
  // ============================================================================================
  const cv = $('veld');
  const ctx = cv ? cv.getContext('2d') : null;
  let W = 0, H = 0, SCHAAL = 1, CX = 0, CY = 0;
  let patronen = [], signalen = [], kernen = [];
  let klok = 0, t0 = 0, p = 0, raf = null;
  let cam = { x: 0, y: 0, z: 1 }, camDoel = { x: 0, y: 0, z: 1 };
  let modus = 'openen';            // openen · rust · bewijs
  let focus = null;                // index van het patroon waarvan het bewijs open staat
  let hoverSig = null;
  let zegAnker = null, zegPunt = { x: 0, y: 0 }, zegBox = null;
  let herkenning = {};             // inzicht-id → 'ja' | 'deels' | 'nee'; alleen dit bezoek
  let laatsteBezoek = null;

  const GOLD = '215,179,106', GOLD3 = '243,227,135', COP = '200,137,74', VIO = '138,121,224', ZAND = '236,224,201';

  function meet() {
    const r = cv.getBoundingClientRect();
    // DPR begrensd: dit moet vloeiend zijn op gewone hardware. Er wordt nergens een filter of
    // realtime blur gebruikt, alleen radiale gradients, arcs en lijnen.
    let d = Math.min(window.devicePixelRatio || 1, 2);
    if (r.width * r.height > 1600 * 1000) d = Math.min(d, 1.5);
    cv.width = Math.max(1, Math.round(r.width * d));
    cv.height = Math.max(1, Math.round(r.height * d));
    ctx.setTransform(d, 0, 0, d, 0, 0);
    W = r.width; H = r.height;
    SCHAAL = (W <= 760) ? Math.min(W / 1.95, (H - 236) / 1.95) : Math.min(W / 2.35, H / 1.85);
    CX = W * 0.5;
    CY = (W <= 760) ? (H - 236) * 0.5 : H * 0.5;
  }

  // De compositie volgt de inhoud. Patronen worden geordend op rol, zodat wat over hetzelfde
  // soort uitspraak gaat bij elkaar in de buurt ligt, en vervolgens op een spiraal geplaatst met
  // een verschuiving die uit de organisatie zelf komt. Hetzelfde veld voor dezelfde organisatie,
  // een ander veld zodra het beeld verandert. Nooit een vaste template.
  function bouwVeld(inzichten, leidendId) {
    const VOLGORDE = ['signal', 'emerging', 'confirmed', 'uncertain'];
    const gesorteerd = inzichten.slice().sort((a, b) => {
      if (a.id === leidendId) return -1;
      if (b.id === leidendId) return 1;
      const d = VOLGORDE.indexOf(rol(a)) - VOLGORDE.indexOf(rol(b));
      return d !== 0 ? d : bewijs(b) - bewijs(a);
    });

    const zaad = hash(inzichten.map((i) => i.id).join('|')) * 6.2832;
    const m = Math.max(gesorteerd.length, 1);
    patronen = gesorteerd.map((ins, k) => {
      const hoek = zaad + k * 2.39996;                     // gulden hoek: nooit een ring, nooit een raster
      const straalUitCentrum = k === 0 ? 0.30 : 0.34 + 0.58 * Math.sqrt(k / m);
      const wiebel = (hash(ins.id) - 0.5) * 0.16;
      return {
        ins,
        x: cl(Math.cos(hoek) * (straalUitCentrum + wiebel) * 1.02, -0.94, 0.94),
        y: cl(Math.sin(hoek) * (straalUitCentrum + wiebel) * 0.86, -0.80, 0.80),
        straal: cl(0.085 + bewijs(ins) * 0.011, 0.07, 0.22),
        n: bewijs(ins),
        leidend: ins.id === leidendId,
        nieuw: Boolean(laatsteBezoek && ins.updated_at && new Date(ins.updated_at) > laatsteBezoek),
      };
    });

    signalen = []; kernen = [];
    let k = 0;
    patronen.forEach((pat, pi) => {
      for (let i = 0; i < pat.n; i++) {
        k++;
        const a = (i / pat.n) * 6.2832 + pi * 2.1;
        const rr = pat.straal * (0.74 + (i % 3) * 0.15);
        const s1 = hash(pat.ins.id + ':' + i), s2 = hash(i + ':' + pat.ins.id);
        signalen.push({
          pat: pi, index: i,
          // verstrooid thuis: de waarneming bestond al voordat zij betekenis kreeg
          hx: (s1 * 2 - 1) * 1.02, hy: (s2 * 2 - 1) * 0.92,
          // semantisch doel: waar zij hoort zodra duidelijk is waar zij over gaat
          tx: pat.x + Math.cos(a) * rr, ty: pat.y + Math.sin(a) * rr * 0.86,
          fase: s1 * 6.28, snel: 0.26 + s2 * 0.26, amp: 0.030 + s1 * 0.026,
          vroeg: i / pat.n, nieuw: pat.nieuw && i >= pat.n - 1,
        });
      }
      kernen.push({ pat: pi, ref: pat });
    });
  }

  const sx = (x) => CX + (x - cam.x) * SCHAAL * cam.z;
  const sy = (y) => CY + (y - cam.y) * SCHAAL * cam.z;

  // Beweging is onzekerheid, stilte is bevestigd inzicht. De drift van elke waarneming neemt af
  // naarmate haar patroon betekenis krijgt. Wie een patroon niet herkent, maakt het weer onzeker:
  // dan komen de waarnemingen los en gaan zij opnieuw bewegen.
  function positie(s) {
    const eigen = cl((p - s.vroeg * 0.10) / 0.62);
    const e = ease(eigen);
    const pat = patronen[s.pat];
    const antw = herkenning[pat.ins.id];
    const los = antw === 'nee' ? 0.55 : 0;
    const vast = antw === 'ja' ? 1 : 0;
    const drift = (1 - e * 0.9) * (1 - vast) + los;
    const adem = e * (1 - los);
    return {
      x: s.hx + (s.tx - s.hx) * e + Math.cos(klok * s.snel + s.fase) * s.amp * drift + Math.cos(klok * 0.20 + s.fase) * 0.004 * adem,
      y: s.hy + (s.ty - s.hy) * e + Math.sin(klok * s.snel * 0.82 + s.fase) * s.amp * drift + Math.sin(klok * 0.17 + s.fase) * 0.004 * adem,
      e,
    };
  }

  // Hoeveel bewijs draagt dit patroon, ten opzichte van zijn eigen drempel. Menselijke herkenning
  // telt mee: zonder de mens blijft een patroon een vermoeden.
  function kracht(pat) {
    let k2 = pat.n / (drempel(pat.ins) === Infinity ? Infinity : Math.max(drempel(pat.ins), 1));
    const a = herkenning[pat.ins.id];
    if (a === 'ja') k2 *= 1.35;
    if (a === 'deels') k2 *= 0.92;
    if (a === 'nee') k2 *= 0.42;
    return k2;
  }
  const ontstoken = (pat) => kracht(pat) >= 1;
  // Canon 7: de straal is een functie van het aantal onafhankelijke signalen, niet van de opmaak.
  const halo = (pat, ign) => (0.030 + pat.n * 0.0092) * Math.min(kracht(pat), 1.9) * ign;

  function gloed(x, y, r, rgb, a) {
    if (r <= 0.4 || a <= 0.004) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.42, `rgba(${rgb},${(a * 0.28).toFixed(4)})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  // Waar het bewijs open staat, treedt de rest terug. Dat is geen dimmen om esthetiek maar focus.
  function demping(patIndex) {
    if (focus === null) return 1;
    return patIndex === focus ? 1 : 0.18;
  }
  // Waar Maculis spreekt, maakt het veld ruimte. Het patroon dat spreekt wijkt nooit voor zijn
  // eigen tekst: dat is juist de hoofdrol.
  function ruimte(x, y, ontzie) {
    if (ontzie || !zegBox || !$('zeg').classList.contains('in')) return 1;
    const m = 26;
    const dx = Math.max(zegBox.x - m - x, 0, x - (zegBox.x + zegBox.w + m));
    const dy = Math.max(zegBox.y - m - y, 0, y - (zegBox.y + zegBox.h + m));
    return cl(Math.hypot(dx, dy) / 58, 0.10, 1);
  }

  // De HUD staat op vaste plekken in beeld. Een naam uit het veld hoort daar niet doorheen te
  // lopen: een label is tekst, en twee teksten over elkaar zijn onleesbaar. Signalen en lijnen
  // mogen er wel achter blijven staan, want die lezen als diepte.
  let hudZones = [];
  function meetHud() {
    hudZones = ['.merk', '.rand', '.onder'].map((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.offsetParent === null) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - 12, y: r.top - 10, w: r.width + 24, h: r.height + 20 };
    }).filter(Boolean);
  }
  function vrijVoorTekst(x, y, halfBreed, ontzie) {
    if (ruimte(x, y, ontzie) < 0.5) return false;
    for (const z of hudZones) {
      if (x + halfBreed > z.x && x - halfBreed < z.x + z.w && y > z.y - 12 && y < z.y + z.h + 6) return false;
    }
    return true;
  }

  function teken() {
    ctx.clearRect(0, 0, W, H);
    if (!patronen.length) return;
    meetHud();

    // light.field: een zeer wijde radiale gradient die het oppervlak richting geeft. Hij staat waar
    // op dit moment het meeste bewijs ligt, dus hij betekent iets (canon 7).
    const zwaarste = patronen.reduce((a, b) => (kracht(b) > kracht(a) ? b : a), patronen[0]);
    const lf = cl((p - 0.30) / 0.5);
    gloed(sx(zwaarste.x), sy(zwaarste.y), Math.min(W, H) * 0.95 * cam.z, VIO, 0.055 * lf);

    const P = signalen.map(positie);

    // trap 2 en 3: verband, uitsluitend binnen hetzelfde patroon
    const link = cl((p - 0.40) / 0.24);
    if (link > 0) {
      ctx.lineWidth = 1;
      for (let i = 0; i < signalen.length; i++) {
        for (let j = i + 1; j < signalen.length; j++) {
          if (signalen[j].pat !== signalen[i].pat) continue;
          const ax = sx(P[i].x), ay = sy(P[i].y), bx = sx(P[j].x), by = sy(P[j].y);
          const d = Math.hypot(ax - bx, ay - by), reik = 118 * cam.z;
          if (d > reik) continue;
          const eigen = signalen[i].pat === zegAnker;
          let a = link * (1 - d / reik) * 0.26 * demping(signalen[i].pat)
            * Math.min(ruimte(ax, ay, eigen), ruimte(bx, by, eigen));
          if (herkenning[patronen[signalen[i].pat].ins.id] === 'nee') a *= 0.35;
          if (a <= 0.004) continue;
          ctx.strokeStyle = `rgba(${COP},${a.toFixed(4)})`;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
    }

    // trap 4: het inzicht. Canon 7: maximaal één light.core per scherm.
    const ign = cl((p - 0.66) / 0.30);
    const hoofdrol = focus !== null ? focus : zegAnker;
    kernen.forEach((kern) => {
      const pat = kern.ref;
      const kx = sx(pat.x), ky = sy(pat.y);
      let dim = demping(kern.pat) * ruimte(kx, ky, kern.pat === zegAnker);
      if (dim <= 0.02) return;
      const straal = halo(pat, ign) * SCHAAL * cam.z;
      const isKern = kern.pat === hoofdrol;

      // Van jou alleen: een zandmerkteken op de kern. Het oppervlak draagt het, niet een badge.
      if (pat.ins.sharing !== 'SHARED' && pat.ins.sharing !== 'AGGREGATED' && ign > 0 && ontstoken(pat)) {
        const pr = cl(straal * 1.15, 13 * cam.z, 30 * cam.z);
        ctx.strokeStyle = `rgba(${ZAND},${(0.26 * ign * dim).toFixed(4)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(kx, ky, pr, 0, 6.2832); ctx.stroke();
      }

      if (ontstoken(pat) && ign > 0) {
        const sterkte = isKern ? 1 : 0.16;
        gloed(kx, ky, straal * (isKern ? 2.6 : 1.5), VIO, (0.11 + pat.n * 0.006) * ign * dim * sterkte);
        if (isKern) {
          gloed(kx, ky, straal * 0.66, VIO, 0.42 * ign * dim);
          ctx.fillStyle = `rgba(200,192,245,${(0.95 * ign * dim).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(kx, ky, 3.0, 0, 6.2832); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(169,155,236,${(0.42 * ign * dim).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(kx, ky, 1.8, 0, 6.2832); ctx.fill();
        }
      }

      // De naam verschijnt pas als het patroon echt is. Wat te weinig bewijs heeft krijgt geen
      // naam maar wel een eerlijke tekst: Maculis kleurt niet wat het niet weet.
      const la = cl((p - 0.58) / 0.26) * dim;
      if (la > 0) {
        const noem = ontstoken(pat);
        ctx.font = `600 10px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = '1.6px';
        ctx.fillStyle = (noem && isKern) ? `rgba(169,155,236,${(0.88 * la).toFixed(3)})`
          : noem ? `rgba(168,154,134,${(0.62 * la).toFixed(3)})`
            : `rgba(139,131,119,${(0.66 * la).toFixed(3)})`;
        const tekst = noem ? kort(pat.ins.title).toUpperCase() : 'TE WEINIG BEWIJS';
        const half = ctx.measureText(tekst).width * 0.5 + 10;
        const off = Math.max(straal, pat.straal * SCHAAL * cam.z * 0.95, 18) + 26;
        const lx = cl(kx, half, Math.max(half, W - half));
        // twee kandidaatplekken: onder de kern, en anders erboven
        let ly = ky + off;
        if (!vrijVoorTekst(lx, ly, half, kern.pat === zegAnker)) ly = ky - off;
        if (vrijVoorTekst(lx, ly, half, kern.pat === zegAnker)) ctx.fillText(tekst, lx, ly);
        ctx.letterSpacing = '0px';
      }
    });

    // trap 1: de waarnemingen zelf
    for (let q = 0; q < signalen.length; q++) {
      const s = signalen[q], pt = P[q];
      const x = sx(pt.x), y = sy(pt.y);
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      let dim = demping(s.pat) * ruimte(x, y, s.pat === zegAnker);
      if (dim <= 0.02) continue;
      const geboorte = cl(p / 0.10);
      // helderheid volgt hoe dicht een waarneming bij een inzicht staat
      const aan = geboorte * lerp(0.42, 1, pt.e) * dim * (hoverSig === q ? 1.5 : 1);
      gloed(x, y, 13 * (hoverSig === q ? 1.6 : 1) * cam.z, GOLD, 0.26 * aan);
      ctx.fillStyle = `rgba(${GOLD3},${(0.90 * aan).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, 1.9 * (hoverSig === q ? 1.6 : 1), 0, 6.2832); ctx.fill();

      // wat sinds je vorige bezoek is bijgekomen, draagt een koperen ring tot je het hebt gezien
      if (s.nieuw && modus !== 'bewijs') {
        ctx.strokeStyle = `rgba(${COP},${(0.5 * aan).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(klok * 0.9 + s.fase) * 1.2, 0, 6.2832); ctx.stroke();
      }
    }

    // de leider van de uitspraak naar haar kern
    if (zegAnker !== null && patronen[zegAnker] && $('zeg').classList.contains('in') && W > 760) {
      ctx.strokeStyle = `rgba(${COP},.22)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(zegPunt.x, zegPunt.y);
      ctx.lineTo(sx(patronen[zegAnker].x), sy(patronen[zegAnker].y)); ctx.stroke();
    }
  }

  // Een korte naam voor in het veld: de eerste betekenisvolle woorden van de uitspraak.
  function kort(titel) {
    const woorden = String(titel || '').replace(/[.,:;]/g, '').split(/\s+/).filter(Boolean);
    const stop = new Set(['de', 'het', 'een', 'en', 'van', 'in', 'op', 'te', 'dat', 'die', 'is', 'we', 'er', 'wordt', 'jullie', 'onze', 'over', 'niet', 'nog', 'hebben', 'zien', 'tussen', 'wat']);
    const kern = woorden.filter((w) => !stop.has(w.toLowerCase()));
    return (kern.slice(0, 2).join(' ') || woorden.slice(0, 2).join(' ')).slice(0, 26);
  }

  // ============================================================================================
  // 2. DE CHOREOGRAFIE
  // Twintig seconden, één keer, met een eindtoestand. Reduced motion toont die eindtoestand
  // direct: nooit een bevroren begin (canon 8.5).
  // ============================================================================================
  const DUUR = 20000;
  const STADIA = [
    [0.00, 'Maculis kijkt.'],
    [0.10, 'Waarnemingen komen binnen. Nog zonder verband.'],
    [0.30, 'Sommige signalen zoeken hun plaats.'],
    [0.42, 'Signalen die over hetzelfde gaan, vinden elkaar.'],
    [0.58, 'Er tekent zich een patroon af.'],
    [0.70, 'Hier komt genoeg bewijs samen.'],
    [0.88, 'Het veld is tot rust gekomen.'],
  ];

  function stadium() {
    let s = STADIA[0][1];
    for (const [g, tekst] of STADIA) if (p >= g) s = tekst;
    if (modus === 'bewijs') s = 'Je kijkt naar het bewijs onder dit inzicht.';
    const el = $('toestand');
    if (el.textContent !== s) el.textContent = s;
  }

  function plaatsUitspraak() {
    const elZeg = $('zeg');
    if (zegAnker === null || !patronen[zegAnker] || W <= 760) { zegBox = null; return; }
    const pat = patronen[zegAnker];
    const kx = sx(pat.x), ky = sy(pat.y);
    const breed = elZeg.offsetWidth, hoog = elZeg.offsetHeight;
    if (!breed || !hoog) return;
    const marge = Math.min(W, H) * 0.055;
    const straal = Math.max(halo(pat, 1) * SCHAAL * cam.z, pat.straal * SCHAAL * cam.z) + 56;

    // Maculis spreekt waar het veld ruimte heeft. De uitspraak staat dus niet op een vaste plek
    // in een template maar in het leegste gebied naast haar eigen kern.
    const kandidaten = [
      { x: kx + straal, y: ky - hoog * 0.5 },
      { x: kx - straal - breed, y: ky - hoog * 0.5 },
      { x: kx - breed * 0.5, y: ky + straal },
      { x: kx - breed * 0.5, y: ky - straal - hoog },
      { x: W - breed - marge, y: H * 0.5 - hoog * 0.5 },
      { x: marge, y: H * 0.5 - hoog * 0.5 },
    ];
    let beste = null, besteScore = -Infinity;
    for (const k of kandidaten) {
      const bx = cl(k.x, marge, Math.max(marge, W - breed - marge));
      const by = cl(k.y, marge + 44, Math.max(marge + 44, H - hoog - marge - 84));
      const mx = bx + breed * 0.5, my = by + hoog * 0.5;
      let score = 0;
      patronen.forEach((q, qi) => {
        if (qi === zegAnker) return;
        score += Math.min(Math.hypot(sx(q.x) - mx, sy(q.y) - my), 520);
      });
      score -= Math.hypot(kx - mx, ky - my) * 0.55;
      // de eigen kern is de hoofdrol: daar gaat de uitspraak nooit overheen
      const eigenR = Math.max(pat.straal * SCHAAL * cam.z, 60) + 40;
      const dx = Math.max(bx - kx, 0, kx - (bx + breed));
      const dy = Math.max(by - ky, 0, ky - (by + hoog));
      if (Math.hypot(dx, dy) < eigenR) score -= 1e5;
      if (by < 100 && bx + breed > W - 400) score -= 900;      // niet over de bediening
      if (by + hoog > H - 130 && bx < 470) score -= 900;       // niet over de groet
      if (score > besteScore) { besteScore = score; beste = { x: bx, y: by }; }
    }
    elZeg.style.transform = `translate3d(${Math.round(beste.x)}px,${Math.round(beste.y)}px,0)`;
    zegBox = { x: beste.x, y: beste.y, w: breed, h: hoog };
    const naarRechts = kx > beste.x + breed * 0.5;
    zegPunt.x = naarRechts ? beste.x + breed + 10 : beste.x - 10;
    zegPunt.y = beste.y + hoog * 0.42;
  }

  function lus() {
    const dt = nu() - t0;
    klok = (dt / 1000) * 0.72;
    if (modus === 'openen') {
      p = cl(dt / DUUR);
      if (p >= 1) { modus = 'rust'; toonUitspraak(); }
    }
    cam.x = lerp(cam.x, camDoel.x, 0.045);
    cam.y = lerp(cam.y, camDoel.y, 0.045);
    cam.z = lerp(cam.z, camDoel.z, 0.045);
    teken(); stadium(); plaatsUitspraak();
    raf = requestAnimationFrame(lus);
  }

  function meteenKlaar() {
    if (modus !== 'openen') return;
    t0 = nu() - DUUR; p = 1; modus = 'rust'; toonUitspraak();
  }

  // ============================================================================================
  // 3. WAT MACULIS ZEGT
  // ============================================================================================
  let inzichten = [], leidend = null, samenwerking = null;

  function toonUitspraak() {
    const pat = patronen[zegAnker];
    if (!pat) return;
    const i = pat.ins;
    $('zeg-aanhef').textContent = houdingLabel(i.stance);
    $('zeg-titel').innerHTML = accent(i.title);
    const n = bewijs(i);
    $('zeg-rust').innerHTML = ontstoken(pat)
      ? `Rust op <b>${n}</b> ${n === 1 ? 'waarneming' : 'waarnemingen'}.`
        + (pat.nieuw ? ' Sinds je vorige bezoek is er iets bijgekomen.' : '')
      : 'Hier is nog <b>te weinig bewijs</b> om iets te zeggen.';
    $('zeg').classList.add('in');
  }

  // De cursieve nadruk valt op het woord dat het inzicht draagt (canon 4.2), en dat is de
  // ontkenning of de kwalificatie in de zin. Geen willekeurig woord.
  function accent(titel) {
    const t = esc(titel || '');
    const kandidaten = ['niet overal', 'géén verschil', 'geen kloof', 'onvoldoende zicht', 'niet', 'géén', 'geen', 'consistente lijn', 'duidelijker'];
    for (const k of kandidaten) {
      const idx = t.toLowerCase().indexOf(k);
      if (idx >= 0) return t.slice(0, idx) + '<em>' + t.slice(idx, idx + k.length) + '</em>' + t.slice(idx + k.length);
    }
    return t;
  }

  // ============================================================================================
  // 4. HET BEWIJS KOMT UIT HET VELD
  // ============================================================================================
  const bladen = ['bewijs', 'patronen', 'samen'];
  function sluitBladen(behalve) {
    bladen.forEach((id) => {
      const el = $(id);
      if (id === behalve) return;
      el.classList.remove('in');
      el.setAttribute('aria-hidden', 'true');
      el.inert = true;
    });
    if (!behalve) {
      document.body.classList.remove('blad-open');
      $('zeg').classList.remove('wijkt');
      document.querySelector('.rand').classList.remove('wijkt');
    }
  }
  function openBlad(id) {
    sluitBladen(id);
    const el = $(id);
    el.inert = false;
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('in');
    document.body.classList.add('blad-open');
    $('zeg').classList.add('wijkt');
    document.querySelector('.rand').classList.add('wijkt');
  }

  async function openBewijs(patIndex) {
    meteenKlaar();
    const pat = patronen[patIndex];
    if (!pat) return;
    focus = patIndex;
    modus = 'bewijs';
    zegAnker = patIndex;
    // de camera brengt dit patroon naar voren; de rest treedt terug
    camDoel.x = pat.x + (window.innerWidth > 760 ? 0.22 : 0);
    camDoel.y = pat.y + (window.innerWidth > 760 ? 0 : -0.16);
    camDoel.z = 1.7;
    openBlad('bewijs');

    const i = pat.ins;
    $('bw-aanhef').textContent = houdingLabel(i.stance);
    $('bw-titel').innerHTML = accent(i.title);
    $('bw-lead').textContent = i.observation || 'Dit hebben we nog niet opgeschreven.';
    $('bw-getal').textContent = String(bewijs(i));
    $('bw-bronnen').innerHTML = '<li class="leeg">Eén moment.</li>';
    $('bw-sterkte').textContent = '';
    $('bw-dev').classList.add('hidden');
    toonVraag(pat);
    toonGrens(pat);

    const { status, data } = await api('/api/mijn/insights/' + encodeURIComponent(i.id));
    if (status !== 200 || !data.insight) {
      $('bw-bronnen').innerHTML = '<li class="leeg"><p>Dit inzicht is niet meer beschikbaar.</p></li>';
      return;
    }
    pat.ins = data.insight;
    vulBewijs(pat, data.evidence || [], data.development || []);
  }

  function vulBewijs(pat, evidence, development) {
    const i = pat.ins;
    const momenten = new Set(evidence.map((e) => fmtKort(e.at))).size;
    $('bw-getal').textContent = String(evidence.length || bewijs(i));
    $('bw-sterkte').textContent = evidence.length <= 1
      ? 'waarneming. Te weinig om iets te zeggen, en dat zeggen we dan ook.'
      : `onafhankelijke waarnemingen, over ${momenten} ${momenten === 1 ? 'moment' : 'momenten'}. De straal van het licht volgt dit aantal.`;

    const ul = $('bw-bronnen');
    ul.innerHTML = '';
    if (!evidence.length) {
      ul.innerHTML = '<li class="leeg"><p class="stem">Hier hebben we nog niets vastgelegd dat we met je kunnen delen.</p></li>';
    }
    evidence.forEach((e, k) => {
      const nieuw = Boolean(laatsteBezoek && e.at && new Date(e.at) > laatsteBezoek);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bron' + (nieuw ? ' nieuw' : '');
      b.innerHTML = '<span class="bron-punt" aria-hidden="true"></span><span class="bron-wat"></span><span class="bron-wanneer"></span>';
      b.querySelector('.bron-wat').textContent = e.label;
      b.querySelector('.bron-wanneer').textContent = (nieuw ? 'nieuw, ' : '') + fmtKort(e.at);
      // een bron aanwijzen licht haar eigen waarneming op in het veld
      const idx = signalen.findIndex((s) => s.pat === pat.index && s.index === k);
      const zet = (v) => { hoverSig = v; };
      b.addEventListener('mouseenter', () => zet(idx)); b.addEventListener('mouseleave', () => zet(null));
      b.addEventListener('focus', () => zet(idx)); b.addEventListener('blur', () => zet(null));
      li.appendChild(b); ul.appendChild(li);
    });

    // de vier vragen, achter een rail van 1px (canon 12, insight surface)
    const q = (label, tekst, mod) =>
      `<div class="qa-blok${mod ? ' ' + mod : ''}"><h3 class="lab">${label}</h3><p>${esc(tekst || 'Dit hebben we nog niet opgeschreven.')}</p></div>`;
    $('bw-qa').innerHTML =
      q('Wat betekent dit mogelijk?', i.meaning) +
      q('Waar baseren we dit op?', i.basis) +
      q('Wat weten we nog niet?', i.not_yet_known, 'onbekend');

    if (development && development.length >= 2) {
      $('bw-dev').classList.remove('hidden');
      $('bw-dev-hint').textContent = `${development.length} momenten`;
      $('bw-dev-lijst').innerHTML = development.map((e) => `
        <li class="dev-item ${e.current ? 'nu' : ''}">
          <span class="dev-wanneer">${esc(fmtDatum(e.at))}${e.current ? ', nu' : ''}</span><br>
          <span class="dev-houding">${esc(e.stanceLabel)}</span><span class="dev-noot">${esc(e.note || e.headline || '')}</span>
        </li>`).join('');
    }
  }

  // ============================================================================================
  // 5. DE MENSELIJKE LAAG
  // Maculis verkondigt niet. Waar menselijke betekenis nodig is, vraagt het, en het antwoord
  // verandert zichtbaar wat het veld toont.
  //
  // BEPERKING, bewust en zichtbaar: dit antwoord geldt voor dit bezoek. Het vastleggen ervan
  // vraagt een productbeslissing die nog niet genomen is, namelijk hoe een menselijk antwoord
  // weegt tegenover nieuw bewijs. Zolang die er niet is, wordt hier niets opgeslagen en belooft
  // de tekst dat ook niet.
  // ============================================================================================
  function toonVraag(pat) {
    const el = $('bw-vraag');
    const blind = drempel(pat.ins) === Infinity;
    el.classList.toggle('hidden', blind);
    const gekozen = herkenning[pat.ins.id];
    el.querySelectorAll('[data-antwoord]').forEach((b) => {
      const aan = b.getAttribute('data-antwoord') === gekozen;
      b.classList.toggle('primair', aan);
      b.setAttribute('aria-pressed', aan ? 'true' : 'false');
    });
    $('bw-uitkomst').innerHTML = uitkomstTekst(gekozen);
  }
  function uitkomstTekst(a) {
    if (a === 'ja') return '<b>Bevestigd door jou.</b> Het patroon komt tot rust en het licht wordt sterker. Je antwoord geldt voor dit bezoek.';
    if (a === 'deels') return '<b>Deels herkend.</b> Maculis houdt het inzicht aan en het licht neemt iets af. Je antwoord geldt voor dit bezoek.';
    if (a === 'nee') return '<b>Niet herkend.</b> Het patroon wordt weer onzeker: de waarnemingen komen los en gaan opnieuw bewegen. Je antwoord geldt voor dit bezoek.';
    return 'Jouw antwoord verandert wat het veld laat zien. Er wordt niets vastgelegd zonder dat jij het deelt.';
  }

  document.querySelectorAll('[data-antwoord]').forEach((b) => {
    b.addEventListener('click', () => {
      if (focus === null) return;
      const pat = patronen[focus];
      const a = b.getAttribute('data-antwoord');
      herkenning[pat.ins.id] = herkenning[pat.ins.id] === a ? undefined : a;
      toonVraag(pat);
      toonUitspraak();
      vulPatronen();
    });
  });

  // ============================================================================================
  // 6. DE GRENS: PRIVÉ EN GEDEELD
  // ============================================================================================
  function toonGrens(pat) {
    const i = pat.ins;
    const isGedeeld = i.sharing === 'SHARED';
    const blind = drempel(i) === Infinity;
    $('bw-grens-punt').className = 'grens-punt' + (isGedeeld ? ' gedeeld' : '');
    $('bw-staat').textContent = isGedeeld ? 'Gedeeld met Maculis' : 'Alleen voor jou';
    $('bw-grens-tekst').textContent = blind
      ? 'Hier valt nog niets te delen, want er is nog niets vastgesteld.'
      : isGedeeld
        ? 'Maculis mag dit inzicht gebruiken in jullie samenwerking en in relevante gesprekken. Je kunt dat op elk moment intrekken.'
        : 'Dit inzicht blijft van jou tot je het zelf deelt. Maculis gebruikt het tot dan niet.';
    const acties = $('bw-grens-acties');
    acties.innerHTML = '';
    if (blind) return;
    if (i.unshared_development) {
      acties.appendChild(maakKnop('Deel de nieuwe ontwikkeling', 'primair', () => bevestig(i, 'share-update')));
      acties.appendChild(maakKnop('Delen intrekken', '', () => bevestig(i, 'revoke')));
    } else if (isGedeeld) {
      acties.appendChild(maakKnop('Delen intrekken', '', () => bevestig(i, 'revoke')));
    } else {
      acties.appendChild(maakKnop('Bespreek met Maculis', 'primair', () => bevestig(i, 'share')));
    }
  }
  function maakKnop(tekst, extra, fn) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'knop' + (extra ? ' ' + extra : ''); b.textContent = tekst;
    b.addEventListener('click', fn);
    return b;
  }

  const confirmEl = $('confirm'), confirmOk = $('confirm-ok'), confirmCancel = $('confirm-cancel');
  let hangend = null;
  function bevestig(insight, actie) {
    hangend = { insight, actie };
    if (actie === 'share') {
      $('confirm-title').textContent = 'Delen met Maculis';
      $('confirm-body').textContent = 'Als je dit deelt, kan Maculis dit inzicht gebruiken in jullie samenwerking en in relevante gesprekken. Je kunt het later weer intrekken.';
      confirmOk.textContent = 'Delen met Maculis';
    } else if (actie === 'share-update') {
      $('confirm-title').textContent = 'Nieuwe ontwikkeling delen';
      $('confirm-body').textContent = 'Je werkt de eerder gedeelde lezing bij met de huidige ontwikkeling. Vanaf dat moment gebruikt Maculis de nieuwe lezing. Er wordt niets automatisch gedeeld.';
      confirmOk.textContent = 'Nieuwe ontwikkeling delen';
    } else {
      $('confirm-title').textContent = 'Delen intrekken';
      $('confirm-body').textContent = 'Maculis gebruikt dit inzicht daarna niet langer in jullie samenwerking. Het blijft wel voor jou zichtbaar.';
      confirmOk.textContent = 'Intrekken';
    }
    confirmEl.classList.remove('hidden');
    confirmOk.focus();
  }
  function sluitConfirm() { confirmEl.classList.add('hidden'); hangend = null; }
  confirmCancel.addEventListener('click', sluitConfirm);
  confirmEl.addEventListener('click', (e) => { if (e.target === confirmEl) sluitConfirm(); });
  confirmOk.addEventListener('click', async () => {
    if (!hangend) return;
    const { insight, actie } = hangend;
    const endpoint = actie === 'revoke' ? 'revoke' : 'share';
    confirmOk.disabled = true;
    const { status, data } = await api(`/api/mijn/insights/${encodeURIComponent(insight.id)}/${endpoint}`, { method: 'POST', body: {} });
    confirmOk.disabled = false;
    sluitConfirm();
    if (status !== 200) { toast('Er ging iets mis. Probeer het opnieuw.'); return; }
    toast(actie === 'revoke' ? 'Delen ingetrokken' : actie === 'share-update' ? 'Nieuwe ontwikkeling gedeeld' : 'Gedeeld met Maculis');
    const pat = patronen.find((q) => q.ins.id === insight.id);
    if (pat && data.insight) {
      pat.ins = data.insight;
      toonGrens(pat);
      vulBewijs(pat, data.evidence || [], data.development || []);
      vulPatronen();
    }
  });

  let toastTimer = null;
  function toast(msg) {
    const bestaand = document.querySelector('.toast');
    if (bestaand) bestaand.remove();
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span class="stip" aria-hidden="true"></span><span></span>';
    t.querySelector('span:last-child').textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2600);
  }

  // ============================================================================================
  // 7. ALLE PATRONEN: dezelfde inhoud, zonder ruimte nodig te hebben
  // ============================================================================================
  function vulPatronen() {
    const ul = $('pt-lijst');
    ul.innerHTML = '';
    if (!patronen.length) {
      ul.innerHTML = '<li class="leeg"><p class="stem">Je bent bij. Zodra Maculis iets over jullie organisatie ziet, verschijnt het hier.</p></li>';
      return;
    }
    patronen.forEach((pat, k) => {
      const i = pat.ins;
      const isGedeeld = i.sharing === 'SHARED' || i.sharing === 'AGGREGATED';
      const n = bewijs(i);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pt-item op-${rol(i)}${isGedeeld ? '' : ' is-prive'}`;
      b.innerHTML = `
        <span class="pt-kop">
          <span class="pil op-${rol(i)}"><span class="stip" aria-hidden="true"></span>${esc(houdingLabel(i.stance))}</span>
          <span class="merkje${isGedeeld ? ' gedeeld' : ''}"><span class="stip" aria-hidden="true"></span>${isGedeeld ? 'Gedeeld' : 'Alleen voor jou'}</span>
        </span>
        <span class="pt-titel"></span>
        <span class="pt-meta"></span>`;
      b.querySelector('.pt-titel').textContent = i.title;
      b.querySelector('.pt-meta').textContent = ontstoken(pat)
        ? `${n} ${n === 1 ? 'waarneming' : 'waarnemingen'}${pat.nieuw ? ', nieuw sinds je vorige bezoek' : ''}`
        : 'Te weinig bewijs om iets te zeggen';
      b.addEventListener('click', () => openBewijs(k));
      li.appendChild(b); ul.appendChild(li);
    });
  }

  function vulSamenwerking(items) {
    const SOORT = { agreement: 'Afspraak', next_step: 'Volgende stap', research: 'Onderzoek', decision: 'Besluit', shared_note: 'Notitie' };
    const ul = $('sm-lijst');
    ul.innerHTML = '';
    if (!items || !items.length) {
      ul.innerHTML = '<li class="leeg"><p class="stem">Er zijn nog geen gezamenlijke afspraken of stappen.</p></li>';
      return;
    }
    items.forEach((it) => {
      const meta = [SOORT[it.kind] || 'Item', it.due_at ? fmtDatum(it.due_at, true) : ''].filter(Boolean).join(', ');
      const li = document.createElement('li');
      li.innerHTML = '<div class="sm-item"><span class="sm-titel"></span><span class="sm-meta"></span></div>';
      li.querySelector('.sm-titel').textContent = it.title;
      li.querySelector('.sm-meta').textContent = meta + (it.detail ? '. ' + it.detail : '');
      ul.appendChild(li);
    });
  }

  // ============================================================================================
  // 8. AANWIJZEN IN HET VELD
  // ============================================================================================
  // Een los punt is een waarneming, geen onderwerp. Het is voor de klant niet afzonderlijk
  // ontcijferbaar en mag dat dus ook niet suggereren: geen tooltip, geen cursor, geen klik.
  // Betekenis ontstaat pas in het patroon, en alleen het patroon is aanwijsbaar.
  function raakKern(mx, my) {
    let beste = -1, best = 46;
    patronen.forEach((q, i) => {
      const d = Math.hypot(sx(q.x) - mx, sy(q.y) - my);
      if (d < best) { best = d; beste = i; }
    });
    return beste;
  }
  if (cv) {
    cv.addEventListener('pointermove', (e) => {
      if (p < 0.5 || modus === 'bewijs') { cv.classList.remove('aanwijsbaar'); return; }
      cv.classList.toggle('aanwijsbaar', raakKern(e.clientX, e.clientY) >= 0);
    });
    cv.addEventListener('pointerleave', () => { cv.classList.remove('aanwijsbaar'); });
    cv.addEventListener('click', (e) => {
      meteenKlaar();
      const k = raakKern(e.clientX, e.clientY);
      if (k >= 0) return openBewijs(k);
      if (focus !== null) terug();
    });
  }

  function terug() {
    focus = null;
    if (modus === 'bewijs') modus = 'rust';
    camDoel = { x: 0, y: 0, z: 1 };
    sluitBladen(null);
    zegAnker = patronen.findIndex((q) => q.leidend);
    if (zegAnker < 0) zegAnker = 0;
    toonUitspraak();
  }

  // ---- bediening ------------------------------------------------------------------------------
  $('btn-waarom').addEventListener('click', () => { if (zegAnker !== null) openBewijs(zegAnker); });
  $('btn-sluit').addEventListener('click', terug);
  $('btn-patronen-sluit').addEventListener('click', terug);
  $('btn-samen-sluit').addEventListener('click', terug);
  $('btn-patronen').addEventListener('click', () => { meteenKlaar(); vulPatronen(); openBlad('patronen'); });
  $('btn-samen').addEventListener('click', () => { meteenKlaar(); openBlad('samen'); });
  $('btn-opnieuw').addEventListener('click', () => { herstart(); });
  // Wat zie ik niet: geen tekstje maar een plek. De camera gaat naar het patroon met het minste bewijs.
  $('btn-blind').addEventListener('click', () => {
    meteenKlaar();
    let zwak = -1, laagst = Infinity;
    patronen.forEach((q, i) => { const k = kracht(q); if (k < laagst) { laagst = k; zwak = i; } });
    if (zwak >= 0) openBewijs(zwak);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!confirmEl.classList.contains('hidden')) sluitConfirm();
    else if (document.body.classList.contains('blad-open')) terug();
  });
  window.addEventListener('resize', () => { meet(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
    else if (!raf && !reduce) { t0 = nu() - p * DUUR; lus(); }
  });

  function herstart() {
    if (!patronen.length) return;
    focus = null; modus = 'openen'; camDoel = { x: 0, y: 0, z: 1 }; cam = { x: 0, y: 0, z: 1 };
    sluitBladen(null);
    $('zeg').classList.remove('in');
    p = 0; t0 = nu();
    if (reduce) { p = 1; modus = 'rust'; toonUitspraak(); teken(); stadium(); plaatsUitspraak(); }
  }

  // ============================================================================================
  // 9. BOOT
  // ============================================================================================
  async function boot() {
    if (!token) {
      gateMsg.textContent = 'Deze link is niet meer geldig. Vraag Maculis om een nieuwe toegang.';
      gateMsg.classList.add('error');
      return;
    }
    const sessie = await api('/api/mijn/session');
    if (sessie.status !== 200) {
      gateMsg.textContent = sessie.status === 401
        ? 'Deze toegang is niet (meer) geldig. Vraag Maculis om een nieuwe link.'
        : 'Mijn Maculis kon niet worden geopend.';
      gateMsg.classList.add('error');
      sessionStorage.removeItem('mijn_token');
      return;
    }
    const org = sessie.data.organization || '';
    const naam = ((sessie.data.user && sessie.data.user.label) || '').split(/\s+/)[0] || '';
    $('org-naam').textContent = org;
    $('groet').textContent = naam ? `Goedendag, ${naam}.` : 'Goedendag.';

    // Wanneer was je hier voor het laatst? Daar hangt aan wat "nieuw" betekent.
    const sleutel = 'mijn_laatst_' + hash(org + '|' + (sessie.data.user ? sessie.data.user.label : ''));
    try {
      const vorig = localStorage.getItem(sleutel);
      if (vorig) laatsteBezoek = new Date(vorig);
      localStorage.setItem(sleutel, new Date().toISOString());
    } catch { /* zonder opslag is alles gewoon niet nieuw */ }

    gate.classList.add('hidden');
    app.classList.remove('hidden');
    sluitBladen(null);
    meet();

    const [lijst, overzicht, samen] = await Promise.all([
      api('/api/mijn/insights'), api('/api/mijn/overview'), api('/api/mijn/collaboration'),
    ]);
    inzichten = (lijst.data && lijst.data.insights) || [];
    samenwerking = (samen.data && samen.data.items) || [];
    vulSamenwerking(samenwerking);

    if (!inzichten.length) {
      $('sinds').textContent = '';
      $('toestand').textContent = '';
      $('zeg-aanhef').textContent = 'Je bent bij';
      $('zeg-titel').textContent = 'Er is nog niets dat we jullie kunnen teruggeven.';
      $('zeg-rust').innerHTML = '';
      $('btn-waarom').classList.add('hidden');
      $('zeg').classList.add('in');
      $('btn-blind').disabled = true;
      vulPatronen();
      return;
    }

    const aandacht = (overzicht.data && overzicht.data.attention) || null;
    leidend = (aandacht && aandacht.id) || inzichten[0].id;
    bouwVeld(inzichten, leidend);
    patronen.forEach((q, i) => { q.index = i; });
    zegAnker = patronen.findIndex((q) => q.leidend);
    if (zegAnker < 0) zegAnker = 0;
    vulPatronen();

    const nieuweN = patronen.filter((q) => q.nieuw).length;
    $('sinds').textContent = !laatsteBezoek
      ? 'Dit is wat Maculis tot nu toe van jullie organisatie ziet.'
      : nieuweN
        ? `Sinds je vorige bezoek is er bij ${nieuweN} ${nieuweN === 1 ? 'patroon' : 'patronen'} iets bijgekomen.`
        : 'Sinds je vorige bezoek is er niets bijgekomen. Het veld is rustig.';

    // De cyclus loopt één keer en blijft daarna staan. Reduced motion toont die eindtoestand
    // direct, dus zonder cyclus en zonder lopende animatie.
    t0 = nu(); p = 0; modus = 'openen';
    if (reduce) { p = 1; modus = 'rust'; toonUitspraak(); teken(); stadium(); plaatsUitspraak(); }
    else lus();
  }

  boot();
})();
