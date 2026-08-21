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
  // De naam van de klantorganisatie. Dimensie A wordt in het bewijsblad uitgesproken, dus die
  // naam moet daar bereikbaar zijn en niet alleen bij het inloggen.
  let orgNaam = '';
  if (url.searchParams.get('t')) {
    sessionStorage.setItem('mijn_token', token);
    url.searchParams.delete('t');
    history.replaceState(null, '', url.pathname + (url.hash || ''));
  }

  // Een eenmalige waarde uit een uitnodiging (?u=) of een inloglink (?l=). Die wisselen we in voor
  // de duurzame toegang en dan is hij op. De waarde gaat via de body en niet via de header, want op
  // dit moment is er nog geen toegang; hij verdwijnt meteen uit de adresbalk zodat hij niet in de
  // geschiedenis of in een bladwijzer achterblijft.
  const eenmalig = url.searchParams.get('u') ? { code: url.searchParams.get('u'), pad: 'uitnodiging' }
    : url.searchParams.get('l') ? { code: url.searchParams.get('l'), pad: 'inloglink' } : null;
  if (eenmalig) {
    url.searchParams.delete('u');
    url.searchParams.delete('l');
    history.replaceState(null, '', url.pathname + (url.hash || ''));
  }

  async function wisselIn(e) {
    try {
      const res = await fetch(`/api/mijn/toegang/${e.pad}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: e.code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.token) return data.error || 'invalid';
      token = data.token;
      sessionStorage.setItem('mijn_token', token);
      return null;
    } catch { return 'network'; }
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

  // Wat een uitspraak aan grond NODIG HEEFT OM TE BESTAAN. Geen kwaliteitscijfer en geen score:
  // per soort uitspraak een andere logica, omdat de uitspraken iets anders beweren.
  //
  //   structurele uitspraken, waar de grond de uitspraak IS
  //     tension    2  een tegenstrijdigheid heeft er per definitie twee, één aan elke kant
  //     reveal     1  de onthulling van de Lens wordt AFGELEID uit haar citaten en bestaat niet
  //                   zonder. Vragen om een extra regel is vragen om bevestiging die dit soort
  //                   uitspraak niet kent: er is geen onafhankelijke tweede bron die de eerste
  //                   kan bevestigen, het is dezelfde blik op dezelfde plek. Stond op 4, en dat
  //                   liet Maculis zijn eigen onthulling tegenspreken op het eerste scherm
  //
  //   breedte-uitspraken, waar het aantal wél iets betekent
  //     non_reveal 5  een afwezigheid mag je pas beweren als je genoeg plekken hebt bekeken
  //     consistency 5 één voorbeeld is een anekdote, een lijn heeft breedte nodig
  //
  //   en de uitspraak die zichzelf uitspreekt
  //     unknown  ∞    "hier is te weinig om iets te zeggen" IS de uitspraak, niet een tekort
  //                   eronder. Alleen deze houding zegt dat, en alleen als de uitspraak zelf.
  const DREMPEL = { tension: 2, reveal: 1, consistency: 5, non_reveal: 5, unknown: Infinity };
  const drempel = (i) => DREMPEL[i && i.stance] ?? 4;
  const bewijs = (i) => Math.max(1, Number(i && i.evidence_count) || 0);
  // Dimensie B, op één plek gedefinieerd. Stond eerder op drie plekken net iets anders, wat de
  // enige manier is waarop een deelstaat stilletjes uiteen kan lopen.
  const vrijgegeven = (i) => Boolean(i) && (i.sharing === 'SHARED' || i.sharing === 'AGGREGATED');

  // ============================================================================================
  // 1. HET VELD
  // ============================================================================================
  const cv = $('veld');
  const ctx = cv ? cv.getContext('2d') : null;
  let W = 0, H = 0, SCHAAL = 1, CX = 0, CY = 0;
  // Adem tussen de HUD-tekst en de eerste waarneming, en de vloer onder de ruimte die de uitspraak
  // dekkend nodig heeft. Gemeten op een telefoon is de uitspraak 230 tot 245px hoog, waarvan 133
  // tot 142px dekkend; 150 dekt dat met marge en houdt de compositie stabiel vanaf het eerste
  // beeld, ook wanneer de uitspraak er nog niet is. Groeit hij ooit verder, dan wint de meting.
  const LUCHT = 14, ZEG_DEKKEND = 150, BAND_MIN = 150;
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
    CX = W * 0.5;
    if (W > 760) {
      // Breed scherm: de HUD staat in verre hoeken, het veld staat gewoon in het midden.
      SCHAAL = Math.min(W / 2.35, H / 1.85);
      CY = H * 0.5;
      return;
    }

    // Op een telefoon is de HUD geen hoekversiering maar een band dwars over de bovenkant: het
    // merk, een navigatie die naar twee rijen wikkelt, en de groet met de regels eronder. Die band
    // moet net zo goed gereserveerd worden als de uitspraak onderaan, anders komen de waarnemingen
    // achter leesbare tekst te staan. `vrijVoorTekst` houdt alleen de LABELS uit die zone; de
    // punten en verbindingen zelf worden nooit onderdrukt, en dat hoeft ook niet zolang ze er
    // gewoon niet komen.
    //
    // Boven reserveren we wat er werkelijk staat, gemeten en niet vastgezet: de regel over het
    // vorige bezoek breekt af bij langere teksten en de band groeit dan mee.
    let boven = 0;
    for (const sel of ['.merk', '.rand', '.onder']) {
      const el = document.querySelector(sel);
      if (el) boven = Math.max(boven, el.getBoundingClientRect().bottom + LUCHT);
    }

    // Onder reserveren we alleen het DEKKENDE deel van de uitspraak. Zij ligt op mobiel als een
    // verloop over het veld (`linear-gradient(0deg, var(--bg) 58%, transparent)`), dus de bovenste
    // 42 procent is bewust doorzichtig en daar mag het veld doorheen lopen. Dat is precies het
    // verschil met de tekst bovenaan: die heeft geen sluier en moet vrij blijven.
    const zeg = document.querySelector('.zeg');
    const dekkend = Math.max(ZEG_DEKKEND, (zeg ? zeg.getBoundingClientRect().height : 0) * 0.58);

    // De band die overblijft. Het veld verhuist daarheen; het krimpt alleen wanneer de band
    // werkelijk smaller is dan de breedte toestaat, dus op een korte in-app browser.
    const band = Math.max(BAND_MIN, (H - dekkend) - boven);
    SCHAAL = Math.min(W / 1.95, band / 1.95);
    CY = boven + band * 0.5;
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

  // Hoeveel grond draagt dit patroon, ten opzichte van wat zijn soort uitspraak nodig heeft.
  //
  // HET LICHT VOLGT DE GROND, NOOIT DE MENING. Hier stond eerder een vermenigvuldiging met het
  // antwoord op "Herken je dit?": ja maakte sterker, deels zwakker, nee bijna onzichtbaar. Dat
  // liet een reactie de zekerheid van een waarneming veranderen, en daarmee trok Maculis zijn
  // eigen waarneming in zodra iemand het er niet mee eens was. Drie citaten van een website komen
  // niet los omdat iemand ze anders leest.
  //
  // Een reactie verandert nooit de bron, de waarneming of het bewijs. Wat een reactie wél doet,
  // staat in uitkomstTekst: ze zet een tweede perspectief naast het eerste.
  function kracht(pat) {
    return pat.n / (drempel(pat.ins) === Infinity ? Infinity : Math.max(drempel(pat.ins), 1));
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
      // Wat is weggeweken blokkeert niets meer. Zonder dit zou de naam van het patroon op een
      // telefoon worden onderdrukt door een balk die er niet meer staat.
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || Number(st.opacity) === 0) return null;
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
      if (!vrijgegeven(pat.ins) && ign > 0 && ontstoken(pat)) {
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

      // De naam verschijnt pas als het patroon echt is, en anders helemaal niet. Een label dat de
      // staat benoemt in plaats van het onderwerp ("te weinig bewijs") is geen naam: het is twee
      // keer hetzelfde woord op verschillende plekken, en het leest als een storing terwijl het
      // eerlijkheid is. Onder de drempel blijft de constellatie dus naamloos staan. Wie er toch
      // heen wil komt er via "Wat zie ik niet?" of via Alle patronen, en daar staat de echte
      // titel wél, met de eerlijke tekst in het bewijsblad eronder.
      const la = cl((p - 0.58) / 0.26) * dim;
      if (la > 0 && ontstoken(pat)) {
        const noem = true;
        ctx.font = `600 10px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = '1.6px';
        ctx.fillStyle = isKern ? `rgba(169,155,236,${(0.88 * la).toFixed(3)})`
          : `rgba(168,154,134,${(0.62 * la).toFixed(3)})`;
        const tekst = kort(pat.ins.title).toUpperCase();
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
    // Een inzicht dat Maculis uitspreekt, spreekt Maculis niet in dezelfde adem tegen. Alleen de
    // houding "unknown" zegt dat er te weinig is, en die zegt het als de uitspraak zelf.
    // EEN NON-REVEAL WORDT NIET DOOR ZIJN AANTAL GEDRAGEN. Bij een reveal ondersteunen de
    // waarnemingen de uitspraak, en dan zegt het aantal iets. Bij "hier zien we géén verschil"
    // zou dezelfde zin suggereren dat de afwezigheid sterker wordt naarmate we meer keken, en dat
    // is niet waar. De breedte van de blik staat in de onderbouwing, in woorden, waar hij hoort.
    $('zeg-rust').innerHTML = (drempel(i) === Infinity
      ? 'Hier is nog <b>te weinig bewijs</b> om iets te zeggen.'
      : i.stance === 'non_reveal'
        ? 'Dit is wat we zagen op de plekken waar we keken.'
        : `Rust op <b>${n}</b> ${n === 1 ? 'waarneming' : 'waarnemingen'}.`)
      + (pat.nieuw ? ' Sinds je vorige bezoek is er iets bijgekomen.' : '');
    toonEigenBijdrage(i);
    $('zeg').classList.add('in');
  }

  // WAT JIJ TOEVOEGDE, ZONDER ERNAAR TE ZOEKEN. Eén regel, in zijn eigen taal, naast wat wij zagen.
  // Zijn woorden zelf blijven in het blad: die horen bij het bewijs waar ze over gaan, en niet op
  // een overzichtsscherm waar iemand anders overheen kan kijken.
  const EIGEN_BIJDRAGE = {
    ja: 'Jij herkende dit.',
    deels: 'Jij herkende dit deels.',
    nee: 'Jij ziet dit anders.',
  };
  function toonEigenBijdrage(i) {
    const el2 = $('zeg-jij');
    const zin = EIGEN_BIJDRAGE[herkenning[i.id]];
    el2.textContent = zin || '';
    el2.classList.toggle('hidden', !zin);
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
  const bladen = ['bewijs', 'patronen', 'samen', 'gesprekken'];

  // Welke bestemming in de periferie heeft dit blad geopend. De knop draagt zolang
  // aria-pressed="true", wat in de basisstijl al een koperen rand betekent. Vier van de vijf
  // controls zijn een bestemming; Opnieuw is een handeling en wordt daarom nooit actief.
  //
  // Op een telefoon wijkt de periferie zodra een blad opent, dus deze staat is er op het moment
  // van kiezen en bij de terugkeer, en niet permanent. Dat is de afgesproken compositie: de strook
  // boven het blad is veld en geen menu, en terug gaat via "Terug naar het veld".
  const BESTEMMINGEN = ['btn-patronen', 'btn-blind', 'btn-samen', 'btn-gesprekken'];

  // Verberg wat nergens heen gaat. Niet uitschakelen maar weglaten: een grijze knop is nog steeds
  // een belofte van iets dat er niet is.
  //
  //   alle patronen   zinloos bij één patroon, want dat is het veld zelf
  //   wat zie ik niet zinloos bij één patroon, want dat opent hetzelfde inzicht
  //   samenwerking    leeg tot er werkelijke afspraken zijn
  //   gesprekken      leeg tot er een draad is. Hij ontstaat vanzelf zodra hij er een begint
  function stemBestemmingenAf(draden) {
    const toon = (id, ja) => { const b = document.getElementById(id); if (b) b.classList.toggle('hidden', !ja); };
    toon('btn-patronen', patronen.length > 1);
    toon('btn-blind', patronen.length > 1);
    toon('btn-samen', Array.isArray(samenwerking) && samenwerking.length > 0);
    toon('btn-gesprekken', Array.isArray(draden) && draden.length > 0);
  }
  function zetActief(knopId) {
    BESTEMMINGEN.forEach((id) => {
      const b = $(id);
      if (b) b.setAttribute('aria-pressed', id === knopId ? 'true' : 'false');
    });
  }

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
      zetActief(null);
    }
  }
  function openBlad(id) {
    sluitBladen(id);
    const el = $(id);
    // Elk blad begint bovenaan. Zonder dit erft een nieuw patroon de scrollpositie van het vorige
    // en land je midden in de bronnenlijst van iets wat je nog niet hebt gezien.
    const body = el.querySelector('.blad-body');
    if (body) body.scrollTop = 0;
    el.inert = false;
    el.setAttribute('aria-hidden', 'false');
    el.classList.add('in');
    document.body.classList.add('blad-open');
    $('zeg').classList.add('wijkt');
    document.querySelector('.rand').classList.add('wijkt');
  }

  // De lead onder de titel. Leeg wanneer de waarneming letterlijk de uitspraak is, want dan zou hij
  // dezelfde zin twee keer onder elkaar zetten. Leeg wanneer er niets is, want een plaatshouder is
  // een lege module. In beide gevallen valt het blok gewoon weg.
  const gelijk = (a, b) => String(a || '').trim() === String(b || '').trim();
  // Waar een inzicht vandaan komt, in gewone taal en als mededeling. Niet als knop, want er valt
  // niets te kiezen: het is een feit over de uitspraak (ADR-0003 D3).
  const BRONZIN = { lens: 'Bron: Maculis Lens. Dit is wat Maculis vanuit het perspectief van buitenaf zag.' };
  function leadTekst(i) {
    if (!i) return '';
    if (i.observation && !gelijk(i.observation, i.title)) return i.observation;
    // Zou de lead leeg blijven, dan staat daar de herkomst. Zo is de plek onder de uitspraak nooit
    // leeg en weet hij altijd wie dit heeft gezegd.
    return BRONZIN[i.source] || '';
  }

  async function openBewijs(patIndex) {
    meteenKlaar();
    const pat = patronen[patIndex];
    if (!pat) return;
    focus = patIndex;
    modus = 'bewijs';
    zegAnker = patIndex;
    // de camera brengt dit patroon naar voren; de rest treedt terug
    openBlad('bewijs');
    richtCamera(pat);

    const i = pat.ins;
    $('bw-aanhef').textContent = houdingLabel(i.stance);
    $('bw-titel').innerHTML = accent(i.title);
    // Bij een inzicht dat rechtstreeks uit de Lens komt, is de uitspraak zelf de waarneming. Die
    // dan nog een keer eronder herhalen leest als een fout, dus dan blijft de lead leeg.
    $('bw-lead').textContent = leadTekst(i);
    $('bw-getal').textContent = String(bewijs(i));
    $('bw-bronnen').innerHTML = '<li class="leeg">Eén moment.</li>';
    $('bw-sterkte').textContent = '';
    $('bw-dev').classList.add('hidden');
    $('bw-stem').classList.add('hidden');
    toonVraag(pat);
    toonIntentie(pat);
    toonGrens(pat);
    // De gespreksingang is geen gevolg van de detailaanroep, dus hij wacht er ook niet op.
    praatOpen = false;
    toonPraat(pat, null);

    const { status, data } = await api('/api/mijn/insights/' + encodeURIComponent(i.id));
    if (status !== 200 || !data.insight) {
      $('bw-bronnen').innerHTML = '<li class="leeg"><p>Dit inzicht is niet meer beschikbaar.</p></li>';
      return;
    }
    pat.ins = data.insight;
    herkenning[data.insight.id] = data.insight.recognition || undefined;
    intentie[data.insight.id] = data.insight.intent || undefined;
    vulBewijs(pat, data.evidence || [], data.development || []);
    toonStem(data.stemmen || []);
    toonVraag(pat);
    toonIntentie(pat);
    // Het gesprek over dit patroon staat hier ook, zodat je nooit ergens anders hoeft te zoeken
    // naar wat je hier hebt gezegd.
    toonPraat(pat, data.conversation);
  }

  // DIT VOEG JIJ TOE. Naast "dit zagen wij", nooit erin. Wat hij tijdens de Lens zei en wat hij
  // later in de kamer toevoegde staan als twee bijdragen onder elkaar, elk met het moment waarop
  // hij het zei. Ze vervangen elkaar niet: een latere reflectie wist de eerste niet uit, want dan
  // zou zichtbaar blijven wat iemand nu vindt en verdwijnen wat hij eerder zag.
  const STEM_MOMENT = {
    lens: 'Tijdens de Maculis Lens',
    mijn: 'Hier, in Mijn Maculis',
  };
  const STEM_ANTWOORD = {
    ja: 'Je herkende dit.',
    deels: 'Je herkende dit deels.',
    nee: 'Je herkende dit niet. Jullie kijken hier anders naar.',
  };
  let stemmenNu = [];
  function toonStem(stemmen) {
    stemmenNu = stemmen;
    const blok = $('bw-stem');
    const lijst = $('bw-stem-lijst');
    lijst.innerHTML = '';
    if (!stemmen.length) { blok.classList.add('hidden'); return; }
    blok.classList.remove('hidden');
    stemmen.forEach((st) => {
      const li = el('li', 'stem-item');
      li.appendChild(el('span', 'stem-wanneer', `${STEM_MOMENT[st.origin] || ''}${st.at ? ', ' + fmtDatum(st.at) : ''}`));
      if (st.answer) li.appendChild(el('p', 'stem-antwoord', STEM_ANTWOORD[st.answer] || ''));
      if (st.note) li.appendChild(el('p', 'stem-woorden', `"${st.note}"`));
      lijst.appendChild(li);
    });
  }

  function vulBewijs(pat, evidence, development) {
    const i = pat.ins;
    const momenten = new Set(evidence.map((e) => fmtKort(e.at))).size;
    // Zelfde reden als bij zeg-rust: bij een non-reveal telt het aantal niet als draagkracht.
    // Het getal blijft staan, want het is waar en het is zichtbaar in het veld, maar de zin
    // ernaast zegt wat het wél betekent.
    $('bw-getal').textContent = String(evidence.length || bewijs(i));
    $('bw-sterkte').textContent = i.stance === 'non_reveal'
      ? `${evidence.length === 1 ? 'plek' : 'plekken'} waar dit te zien was. Dat we het op meer plekken zagen maakt het niet sterker, alleen breder.`
      : evidence.length <= 1
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

    // De vier vragen, achter een rail van 1px (canon 12, insight surface). Een vraag zonder antwoord
    // wordt WEGGELATEN en niet met een plaatshouder gevuld: een kop met "dit hebben we nog niet
    // opgeschreven" eronder is een lege module, en die tonen we niet (ADR-0003 D6).
    const q = (label, tekst, mod) => (tekst
      ? `<div class="qa-blok${mod ? ' ' + mod : ''}"><h3 class="lab">${label}</h3><p>${esc(tekst)}</p></div>`
      : '');
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
  // Het antwoord is nu duurzaam. Dat is geen detail: een correctie op een patroon mag niet
  // steviger worden vastgelegd dan het antwoord waar hij bij hoort. Het volgt dezelfde grens als
  // het inzicht zelf, en de tekst zegt precies waar het blijft.
  // ============================================================================================
  // Geen van beide vraagt om een correctie op ons. Ze vragen naar het perspectief dat wij niet
  // hadden. "Wat zien wij verkeerd?" stond hier eerder, en dat maakt van een ander perspectief
  // een fout van Maculis.
  const TOEL_VRAAG = {
    deels: 'Wat klopt er wel, en wat ziet er van binnenuit anders uit?',
    nee: 'Hoe ziet dit er van binnenuit uit?',
  };

  function toonVraag(pat) {
    const el = $('bw-vraag');
    const i = pat.ins;
    const blind = drempel(i) === Infinity;
    el.classList.toggle('hidden', blind);
    const gekozen = herkenning[i.id];
    el.querySelectorAll('[data-antwoord]').forEach((b) => {
      const aan = b.getAttribute('data-antwoord') === gekozen;
      b.classList.toggle('primair', aan);
      b.setAttribute('aria-pressed', aan ? 'true' : 'false');
    });
    $('bw-uitkomst').innerHTML = uitkomstTekst(gekozen);

    // Deels en Nee zijn zonder toelichting arm. Het veld staat er dan meteen open, en blijft leeg
    // mogen blijven: deels antwoorden en verder niets zeggen is een eerlijke uitkomst.
    const toel = $('bw-toel');
    const wil = gekozen === 'deels' || gekozen === 'nee';
    toel.classList.toggle('hidden', !wil);
    if (wil) {
      $('bw-toel-vraag').textContent = TOEL_VRAAG[gekozen];
      $('bw-toel-tekst').value = i.recognition_note || '';
    }
  }

  // Waar het antwoord blijft is onderdeel van het antwoord, en het antwoord is van jou. Het reist
  // nooit mee met het delen van een inzicht en het wordt niet zichtbaar doordat een collega iets
  // deelt. Dat geldt altijd, dus staat er ook altijd hetzelfde.
  //
  // Wat hier NIET meer staat: een verwijzing naar het gesprek. Die maakte van deze zin een vierde
  // route naar dezelfde vraag als het grensblok eronder, en vroeg de lezer te herhalen wat ze net
  // hadden ingevuld. De deelbeslissing woont op precies één plek.
  const BLIJFT = ' Je antwoord blijft bij jou.';
  // Wat een antwoord BETEKENT, niet wat het met de zekerheid doet. Alle drie zijn waardevolle
  // routes en geen van drieën is fout. Hier stond eerder dat het licht sterker werd, iets afnam,
  // of dat de waarnemingen loskwamen; dat maakte van een mening een correctie op het bewijs.
  //
  // Verschil is de opbrengst, niet het probleem. Van buitenaf lijkt iets een beperking, van
  // binnenuit blijkt het soms een bewuste keuze. Beide zijn waar binnen hun perspectief, en pas
  // naast elkaar zijn ze de werkelijkheid.
  function uitkomstTekst(a) {
    if (a === 'ja') return '<b>We zien hetzelfde.</b> Wat wij van buitenaf zagen en wat jij weet, vallen samen.' + esc(BLIJFT);
    if (a === 'deels') return '<b>We kijken anders naar hetzelfde.</b> Wat wij van buitenaf zagen blijft staan. Wat jij van binnenuit weet, komt ernaast.' + esc(BLIJFT);
    if (a === 'nee') return '<b>Onze perspectieven verschillen.</b> Dat is informatie, geen fout. Wij houden vast wat we zagen, jij houdt vast wat jij weet.' + esc(BLIJFT);
    return 'Jouw antwoord komt naast wat wij zagen te staan. Het verandert niet wat wij zagen, en het blijft bij jou.';
  }

  // ============================================================================================
  // 5b. WIL JE HIER IETS MEE?
  //
  // De enige vraag in deze reis die niet uit context af te leiden is. Herkenning zegt of iets waar
  // is; deze zegt of iemand er iets mee wil. Eén vraag, drie antwoorden, en daarmee is de klant
  // klaar: bij "Samen met Maculis" neemt Maculis het voorbereidende werk over.
  //
  // Hij verschijnt niet bij elk patroon. Vier voorwaarden, alle vier afgeleid uit wat er al staat,
  // zodat dit een vraag blijft op het enige moment waarop hij ergens over gaat, en geen trechter
  // wordt. Dezelfde regel staat aan serverzijde in intentie.mjs; daar is hij de grens, hier de
  // weergave.
  // ============================================================================================
  const intentie = {};
  function intentieRelevant(i) {
    if (!i) return false;
    if (drempel(i) === Infinity) return false;
    // Elk antwoord houdt de vraag open, ook nee. Die eis stond hier eerder wel, met als reden dat
    // een patroon dat iemand niet herkent voor hem niet bestaat. Dat klopte niet: juist daar
    // verschillen twee perspectieven op dezelfde werkelijkheid, en dat is het gesprek waard. De
    // deur ging dicht op het moment dat het interessant werd.
    if (!herkenning[i.id]) return false;
    return i.stance === 'tension' || i.stance === 'reveal';
  }

  const INTENTIE_UIT = {
    weten: 'Goed om te weten. We laten dit rusten tot jullie er zelf op terugkomen.',
    zelf: 'Genoteerd. We volgen dit mee en zien het terug in wat er verandert.',
    samen: 'We kijken wat hier de beste vervolgstap is en komen bij je terug.',
  };

  function toonIntentie(pat) {
    const el = $('bw-intentie');
    const i = pat.ins;
    const toon = intentieRelevant(i);
    el.classList.toggle('hidden', !toon);
    if (!toon) return;
    const gekozen = intentie[i.id];
    el.querySelectorAll('[data-intentie]').forEach((b) => {
      const aan = b.getAttribute('data-intentie') === gekozen;
      b.classList.toggle('primair', false);   // geen van de drie is luider dan de andere
      b.setAttribute('aria-pressed', aan ? 'true' : 'false');
    });
    $('bw-intentie-uit').textContent = gekozen ? INTENTIE_UIT[gekozen] : '';
  }

  async function bewaarIntentie(pat, keuze) {
    const i = pat.ins;
    intentie[i.id] = keuze || undefined;
    i.intent = keuze || null;
    toonIntentie(pat);
    const { status, data } = await api(`/api/mijn/insights/${encodeURIComponent(i.id)}/intent`, {
      method: 'POST', body: { intent: keuze || null },
    });
    if (status !== 200) { toast('Je keuze kon niet worden bewaard.'); return; }
    if (data.insight) { pat.ins = data.insight; intentie[i.id] = data.insight.intent || undefined; }
    toonIntentie(pat);
    // Bij "Samen met Maculis" staat het gesprek meteen open met een zin erin. Sturen mag, hoeft
    // niet: het signaal was compleet bij de klik.
    if (keuze === 'samen') openPraat(pat, OPENER_SAMEN);
  }

  document.querySelectorAll('[data-intentie]').forEach((b) => {
    b.addEventListener('click', () => {
      if (focus === null) return;
      const pat = patronen[focus];
      const k = b.getAttribute('data-intentie');
      bewaarIntentie(pat, intentie[pat.ins.id] === k ? null : k);
    });
  });

  // Het antwoord bewaren. Het inzicht in het geheugen wordt meteen bijgewerkt, zodat het veld en
  // de teksten hetzelfde zeggen als de server.
  async function bewaarHerkenning(pat, antwoord, toelichting) {
    const i = pat.ins;
    herkenning[i.id] = antwoord || undefined;
    i.recognition = antwoord || null;
    i.recognition_note = antwoord ? (toelichting || null) : null;
    // Zijn nieuwe reflectie komt NAAST wat hij tijdens de Lens zei, nooit eroverheen. Dat is aan
    // serverzijde de tweede rij met een eigen origin, en hier de tweede regel onder "Dit voeg jij
    // toe". Een antwoord intrekken haalt alleen zijn eigen regel weg.
    const rest = stemmenNu.filter((st) => st.origin !== 'mijn');
    toonStem(antwoord
      ? rest.concat([{ origin: 'mijn', answer: antwoord, note: toelichting || null, at: new Date().toISOString() }])
      : rest);
    toonVraag(pat);
    toonIntentie(pat);
    toonUitspraak();
    vulPatronen();
    const { status } = await api(`/api/mijn/insights/${encodeURIComponent(i.id)}/recognition`, {
      method: 'POST', body: { answer: antwoord || null, note: toelichting || null },
    });
    if (status !== 200) toast('Je antwoord kon niet worden bewaard.');
  }

  document.querySelectorAll('[data-antwoord]').forEach((b) => {
    b.addEventListener('click', () => {
      if (focus === null) return;
      const pat = patronen[focus];
      const a = b.getAttribute('data-antwoord');
      const nieuw = herkenning[pat.ins.id] === a ? null : a;
      bewaarHerkenning(pat, nieuw, nieuw ? pat.ins.recognition_note : null);
    });
  });
  // De toelichting bewaart zichzelf zodra je het veld verlaat, net zoals Ja, Deels en Nee dat al
  // deden. Een aparte Bewaren-knop was de enige handmatige opslag in een kamer die verder alles
  // meteen vasthoudt, en dus de enige plek waar je je kon afvragen of het er wel in stond.
  // Alleen schrijven wanneer er werkelijk iets veranderd is; anders zou elke blik op het veld een
  // schrijfactie en een bevestiging opleveren.
  function bewaarToelichting() {
    if (focus === null) return;
    const pat = patronen[focus];
    const antwoord = herkenning[pat.ins.id] || null;
    if (!antwoord) return;
    const nieuwe = $('bw-toel-tekst').value.trim();
    if (nieuwe === (pat.ins.recognition_note || '')) return;
    bewaarHerkenning(pat, antwoord, nieuwe);
    toast('Bewaard');
  }
  $('bw-toel-tekst').addEventListener('blur', bewaarToelichting);

  // ============================================================================================
  // 6. DE GRENS: PRIVÉ EN GEDEELD
  // ============================================================================================
  function toonGrens(pat) {
    const i = pat.ins;
    const isGedeeld = vrijgegeven(i);
    const blind = drempel(i) === Infinity;
    const nieuweLezing = isGedeeld && Boolean(i.unshared_development);
    $('bw-grens-punt').className = 'grens-punt' + (isGedeeld ? ' gedeeld' : '');
    $('bw-staat').textContent = isGedeeld ? 'Gedeeld met Maculis' : 'Niet gedeeld met Maculis';
    $('bw-grens-tekst').textContent = blind
      ? 'Hier valt nog niets te delen, want er is nog niets vastgesteld.'
      : nieuweLezing
        ? 'Er is een nieuwere lezing die je nog niet hebt gedeeld. Maculis werkt zolang met de lezing die je eerder deelde. Je kunt het delen op elk moment intrekken.'
        : isGedeeld
          ? 'Maculis mag dit inzicht gebruiken in jullie samenwerking en in relevante gesprekken. Je kunt dat op elk moment intrekken.'
          : 'Maculis gebruikt dit inzicht niet zolang het niet gedeeld is. Delen is een aparte keuze, en je kunt hem later weer intrekken.';

    // Dimensie A, en niets anders. Dit gaat over wie binnen de klantorganisatie het inzicht ziet,
    // niet over wat Maculis mag. Het staat er altijd, ook wanneer er nog niets te delen valt, want
    // de vraag "kan mijn collega dit zien" hangt niet aan de deelstaat.
    $('bw-grens-wie').textContent = (orgNaam
      ? `Iedereen binnen ${orgNaam} met toegang tot Mijn Maculis ziet dit inzicht.`
      : 'Iedereen bij jullie met toegang tot Mijn Maculis ziet dit inzicht.')
      + ' Je antwoord en je gesprek zijn van jou.';

    const acties = $('bw-grens-acties');
    acties.innerHTML = '';
    if (blind) return;
    // Delen is beschikbaar en volledig ongewijzigd van betekenis, maar het is niet langer de
    // luidste handeling in dit blad. Op het moment dat je een inzicht net begrijpt is de
    // natuurlijke volgende stap reageren, niet iets weggeven. De primaire plek gaat daarom naar
    // "Praat hierover met Maculis". Praten is en blijft iets anders dan delen: de grens, de
    // bevestiging en wat Maculis meekrijgt veranderen hier niet.
    // Ten hoogste één control die de deelstaat verruimt, en ten hoogste één die hem beperkt. Beide
    // staan uitsluitend hier. De gespreksinvoer draagt er nooit een.
    //
    // Geen van deze knoppen is primair. Canon 12 laat één koperen knop per blad toe, en die plek
    // is eerder bewust naar "Praat hierover met Maculis" gegaan: op het moment dat je een inzicht
    // net begrijpt is de natuurlijke volgende stap reageren, niet iets weggeven. Delen is volledig
    // beschikbaar en volledig ongewijzigd van betekenis, alleen niet de luidste handeling.
    if (nieuweLezing) {
      acties.appendChild(maakKnop('Deel de nieuwe lezing', '', () => bevestig(i, 'share-update')));
      acties.appendChild(maakKnop('Delen intrekken', 'tekst', () => bevestig(i, 'revoke')));
    } else if (isGedeeld) {
      acties.appendChild(maakKnop('Delen intrekken', 'tekst', () => bevestig(i, 'revoke')));
    } else {
      acties.appendChild(maakKnop('Deel dit met Maculis', '', () => bevestig(i, 'share')));
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
      confirmOk.textContent = 'Deel dit met Maculis';
    } else if (actie === 'share-update') {
      $('confirm-title').textContent = 'Nieuwe lezing delen';
      $('confirm-body').textContent = 'Je werkt de eerder gedeelde lezing bij met de huidige. Vanaf dat moment gebruikt Maculis de nieuwe lezing. Er wordt niets automatisch gedeeld.';
      confirmOk.textContent = 'Deel de nieuwe lezing';
    } else {
      $('confirm-title').textContent = 'Delen intrekken';
      $('confirm-body').textContent = 'Maculis gebruikt dit inzicht daarna niet langer in jullie samenwerking. Het blijft in Mijn Maculis gewoon zichtbaar.';
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
    toast(actie === 'revoke' ? 'Delen ingetrokken' : actie === 'share-update' ? 'Nieuwe lezing gedeeld' : 'Gedeeld met Maculis');
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
      const isGedeeld = vrijgegeven(i);
      const n = bewijs(i);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pt-item op-${rol(i)}${isGedeeld ? '' : ' is-prive'}`;
      b.innerHTML = `
        <span class="pt-kop">
          <span class="pil op-${rol(i)}"><span class="stip" aria-hidden="true"></span>${esc(houdingLabel(i.stance))}</span>
          <span class="merkje${isGedeeld ? ' gedeeld' : ''}"><span class="stip" aria-hidden="true"></span>${isGedeeld ? 'Gedeeld met Maculis' : 'Niet gedeeld met Maculis'}</span>
        </span>
        <span class="pt-titel"></span>
        <span class="pt-meta"></span>`;
      b.querySelector('.pt-titel').textContent = i.title;
      b.querySelector('.pt-meta').textContent = drempel(i) === Infinity
        ? 'Te weinig bewijs om iets te zeggen'
        : `${n} ${n === 1 ? 'waarneming' : 'waarnemingen'}${pat.nieuw ? ', nieuw sinds je vorige bezoek' : ''}`;
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
  // Het trefvlak van een patroon. 46px is de maat bij de gewone schaal van het veld. Wordt het veld
  // op een korte in-app browser kleiner, dan moet het trefvlak mee krimpen: anders overlappen de
  // vlakken van buurpatronen elkaar en raak je met één tik het verkeerde patroon. Alleen kleiner,
  // nooit groter, en alleen op een telefoon, zodat een breed scherm precies blijft zoals het was.
  function trefvlak() {
    if (W > 760) return 46;
    return Math.max(26, 46 * Math.min(1, SCHAAL / 200));
  }
  function raakKern(mx, my) {
    let beste = -1, best = trefvlak();
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

  // Waar de camera heen gaat als één patroon naar voren treedt.
  //
  // Op een breed scherm staat het blad rechts, dus het patroon schuift naar links en verder is er
  // niets aan de hand. Op een telefoon ligt het blad ONDER het patroon en dekt het het grootste
  // deel van het scherm af. Alleen ruimte overlaten is daar niet genoeg: als het patroon dat je
  // zojuist aantikte achter het blad verdwijnt, is de band tussen aanraking en toelichting stuk,
  // en dan lees je een document in plaats van dat je naar iets kijkt. Daarom rekent hij op mobiel
  // met de werkelijke hoogte van het blad, zodat de kern in de strook staat die overblijft, en
  // zoomt hij niet verder in dan die strook kan dragen.
  function richtCamera(pat) {
    if (window.innerWidth > 760) {
      camDoel.x = pat.x + 0.22;
      camDoel.y = pat.y;
      camDoel.z = 1.7;
      return;
    }
    const blad = $('bewijs').getBoundingClientRect().height || H * 0.72;
    const strook = Math.max(120, H - blad);
    const straal = Math.max(pat.straal, 0.05);
    camDoel.z = cl((strook * 0.66) / (2 * straal * SCHAAL), 1, 1.7);
    camDoel.x = pat.x;
    // sy(pat.y) moet uitkomen op het midden van de strook: CY + (pat.y - camY) * SCHAAL * z = doel
    camDoel.y = pat.y - (strook * 0.5 - CY) / (SCHAAL * camDoel.z);
    zetCamera();
  }

  // Onder prefers-reduced-motion draait er geen lus, dus de camera zou nooit aankomen. Canon 8.5
  // vraagt daar de EINDTOESTAND, niet stilstand: dus springt hij er ineens heen en tekent één keer.
  // Alleen op een telefoon, want daar dekt het blad het veld af en gaat de band tussen aanraking en
  // toelichting anders verloren. Op een breed scherm staat het veld gewoon naast het blad en is er
  // niets te herstellen, dus daar blijft alles precies zoals het was.
  function zetCamera() {
    if (!reduce || window.innerWidth > 760) return;
    cam = { x: camDoel.x, y: camDoel.y, z: camDoel.z };
    teken();
    plaatsUitspraak();
  }

  function terug() {
    focus = null;
    if (modus === 'bewijs') modus = 'rust';
    camDoel = { x: 0, y: 0, z: 1 };
    zetCamera();
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
  $('btn-patronen').addEventListener('click', () => { meteenKlaar(); vulPatronen(); openBlad('patronen'); zetActief('btn-patronen'); });
  $('btn-samen').addEventListener('click', () => { meteenKlaar(); openBlad('samen'); zetActief('btn-samen'); });
  $('btn-opnieuw').addEventListener('click', () => { herstart(); });
  // Wat zie ik niet: geen tekstje maar een plek. De camera gaat naar het patroon met het minste bewijs.
  $('btn-blind').addEventListener('click', () => {
    meteenKlaar();
    let zwak = -1, laagst = Infinity;
    patronen.forEach((q, i) => { const k = kracht(q); if (k < laagst) { laagst = k; zwak = i; } });
    if (zwak >= 0) { openBewijs(zwak); zetActief('btn-blind'); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!confirmEl.classList.contains('hidden')) sluitConfirm();
    else if (document.body.classList.contains('blad-open')) terug();
  });
  window.addEventListener('resize', () => {
    meet();
    // Draaien of een adresbalk die inklapt verandert de strook. Het geopende patroon moet er
    // daarna nog steeds in staan.
    if (modus === 'bewijs' && focus !== null && patronen[focus]) richtCamera(patronen[focus]);
  });
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
  // 9. HET GESPREK
  // Doorpraten over wat Maculis ziet, in de ruimte waar je het ziet. Geen postvak en geen chat.
  //
  // Drie dingen worden hier zichtbaar gehouden, omdat ze anders alleen in de architectuur zouden
  // bestaan en de klant er niets aan zou hebben:
  //
  //   1. Wat je meestuurt staat er vóórdat je verstuurt. Context die je niet ziet is context die
  //      je niet hebt gegeven.
  //   2. Praten en delen zijn twee handelingen. Bij een inzicht dat nog van jou alleen is, staat
  //      dat er letterlijk, met een aparte knop ernaast voor wie het er wél bij wil doen.
  //   3. Het vinkje staat uit. Wie niets aanvinkt, praat gewoon.
  // ============================================================================================
  // MACULIS SPREEKT NAMENS ZICHZELF, JIJ SPREEKT NAMENS JEZELF.
  //
  // Hier stonden kant en klare zinnen in ZIJN stem: "Dit herken ik deels, maar bij ons speelt nog
  // iets anders", "Er is bij ons iets veranderd". Eén klik zette ze in het veld dat "Je eigen
  // woorden" heet, en dan waren die woorden niet van hem. Nu zijn het vragen van Maculis. Ze zetten
  // de cursor in een leeg veld en schrijven niets voor.
  const OPENERS_PATROON = [
    'Welke vraag roept dit bij jullie op?',
    'Wat zie jij hier dat wij van buitenaf niet konden zien?',
    'Wat zouden jullie willen dat wij hiermee doen?',
  ];
  const OPENERS_LOS = [
    'Wat is er bij jullie veranderd?',
    'Waar wil je ons naar laten kijken?',
    'Wat missen wij?',
  ];

  let gesprekOngelezen = 0;

  function el(tag, klasse, tekst) {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (tekst != null) e.textContent = tekst;
    return e;
  }

  // De draad zelf: wat er is gezegd, in volgorde. Zonder tijdstempels per regel schreeuwen; de
  // datum staat erbij omdat een gesprek over maanden kan lopen.
  function maakDraad(draad) {
    const wrap = el('div', 'draad');
    if (!draad || !draad.messages.length) return wrap;
    wrap.appendChild(el('p', 'lab', 'Ons gesprek hierover'));
    const lijst = el('ol', 'draad-lijst');
    draad.messages.forEach((m) => {
      const li = el('li', 'draad-item van-' + m.van);
      li.appendChild(el('span', 'draad-wie', m.naam));
      li.appendChild(el('p', 'draad-tekst', m.tekst));
      li.appendChild(el('span', 'draad-wanneer', fmtDatum(m.at)));
      lijst.appendChild(li);
    });
    wrap.appendChild(lijst);
    if (draad.awaiting) wrap.appendChild(el('p', 'draad-wacht', 'Nog geen antwoord. We laten het hier weten.'));
    return wrap;
  }

  // Wat Maculis met dit bericht meekrijgt. Eén regel, in alle drie de varianten, en in alle drie
  // met dezelfde belofte over de persoonlijke laag, want die geldt altijd. Dat de lezer weet wat er
  // meegaat vóórdat hij verstuurt, is de reden dat deze regel bestaat.
  function contextTekst(insight) {
    if (!insight) return 'Er hoort geen patroon bij, dus we lezen dit als iets nieuws.';
    if (vrijgegeven(insight)) {
      return 'We sturen dit patroon mee. Het is gedeeld, dus we kunnen er volledig op ingaan. Je antwoord op onze vraag en je toelichting blijven bij jou.';
    }
    return 'We sturen de uitspraak van dit patroon mee, zodat we weten waar je vraag over gaat. Je antwoord op onze vraag en je toelichting blijven bij jou, en het inzicht blijft ongedeeld.';
  }

  // De invoer. Eén tekstveld dat meegroeit, drie openingen die het veld vullen in plaats van iets
  // te versturen, één regel die zegt wat er meegaat, en de verzendknop eronder.
  //
  // Hier staat GEEN toestemmingskeuze. Geen vinkje, geen deelknop. Praten en delen zijn twee
  // dingen, en de deelbeslissing woont in het grensblok erboven. Dat was niet altijd zo: de
  // deelknop stond hier ook, met net andere woorden, en daarnaast een vinkje dat een derde vraag
  // leek te stellen. Voor de lezer waren dat drie keer dezelfde vraag.
  function maakComposer(insight, klaar, { kop = true, opening = null } = {}) {
    const wrap = el('div', 'praat-vorm');

    if (kop) wrap.appendChild(el('p', 'lab', insight ? 'Praat hierover met Maculis' : 'Iets vertellen'));
    // De openingsregel is van MACULIS en staat boven het veld, niet erin. Hier stond eerder een zin
    // in zijn stem, voorgevuld en klaar om te versturen: "Hier willen we graag met jullie naar
    // kijken." Dat is Maculis die namens de ondernemer spreekt, en dat mag niet.
    if (opening) wrap.appendChild(el('p', 'praat-opening', opening));

    const openers = el('ul', 'praat-openers');
    (insight ? OPENERS_PATROON : OPENERS_LOS).forEach((o) => {
      const li = document.createElement('li');
      const b = el('button', 'praat-opener', o);
      b.type = 'button';
      // Aanklikken zet de cursor in het lege veld. Wat er komt te staan, schrijft hij zelf.
      b.addEventListener('click', () => { tekst.focus(); });
      li.appendChild(b); openers.appendChild(li);
    });
    wrap.appendChild(openers);

    const label = el('label', 'praat-label', 'Je eigen woorden');
    const tekst = document.createElement('textarea');
    tekst.className = 'veldtekst'; tekst.rows = 3;
    tekst.id = 'praat-tekst-' + (insight ? insight.id : 'los');
    label.setAttribute('for', tekst.id);
    const groei = () => { tekst.style.height = 'auto'; tekst.style.height = Math.min(tekst.scrollHeight, 260) + 'px'; };
    tekst.addEventListener('input', groei);
    // Wie op "Samen met Maculis" klikte, hoeft niets te typen: het signaal was compleet bij de klik.
    // Het veld blijft leeg, want alles wat hier staat is van hem.
    wrap.appendChild(label);
    wrap.appendChild(tekst);

    wrap.appendChild(el('p', 'praat-context', contextTekst(insight)));

    const rij = el('div', 'praat-acties');
    const stuur = el('button', 'knop primair', 'Versturen');
    stuur.type = 'button';
    rij.appendChild(stuur);
    wrap.appendChild(rij);

    stuur.addEventListener('click', async () => {
      const inhoud = tekst.value.trim();
      if (!inhoud) { tekst.focus(); return; }
      stuur.disabled = true;
      const { status, data } = await api('/api/mijn/conversations', {
        method: 'POST',
        body: { insightId: insight ? insight.id : null, text: inhoud },
      });
      stuur.disabled = false;
      if (status !== 200 || !data.ok) { toast('Je bericht kon niet worden verstuurd.'); return; }
      tekst.value = ''; groei();
      toast('Verstuurd. Iemand van ons leest dit en reageert hier.');
      if (klaar) klaar(data.conversation);
      vernieuwGesprekken();
    });

    return wrap;
  }

  // Het gesprek in het bewijsblad: een uitnodiging, één ingang, en daaronder wat er al staat.
  //
  // Deze ingang hoort er ALTIJD te staan, bij een gedeeld inzicht net zo goed als bij een niet
  // gedeeld inzicht. Hij hing eerder aan de detailaanroep: `openBewijs` maakte dit blok eerst leeg
  // en vulde het pas na het antwoord van de server. Op een warme verbinding valt dat niet op, maar
  // op een koude instantie stond het bewijsblad seconden lang zonder gespreksingang, en mislukte
  // die aanroep, dan verscheen hij helemaal niet. Vanaf nu wordt hij meteen getekend, met de draad
  // als enige dat later invalt.
  let praatOpen = false;
  let praatDraad = null;
  // Een vraag van Maculis, niet een zin van hem. Zie maakComposer.
  const OPENER_SAMEN = 'Goed. Wil je hier samen verder naar kijken? Vertel wat je hierover denkt, in je eigen woorden.';

  // Het gesprek openen vanuit een andere handeling, met de eerste zin er al in.
  function openPraat(pat, opening) {
    praatOpen = true;
    toonPraat(pat, praatDraad, opening);
    const vorm = $('bw-praat').querySelector('.praat-vorm');
    if (vorm) vorm.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  function toonPraat(pat, draad, opening = null) {
    const houder = $('bw-praat');
    const i = pat.ins;
    praatDraad = draad;

    const ingang = maakKnop('Praat hierover met Maculis', 'primair praat-ingang', () => {
      praatOpen = !praatOpen;
      teken2();
    });
    function teken2() {
      // Zolang de invoer dicht is, is de uitnodiging de primaire handeling. Zodra je aan het
      // schrijven bent, is Versturen dat, en treedt de ingang terug: nooit twee tegelijk.
      ingang.className = 'knop praat-ingang' + (praatOpen ? ' tekst' : ' primair');
      houder.innerHTML = '';
      houder.appendChild(el('p', 'lab', 'Praat hierover met Maculis'));
      houder.appendChild(el('p', 'praat-lead', 'Wil je iets vragen, aanvullen of bespreken over wat je hier ziet?'));
      houder.appendChild(ingang);
      if (praatOpen) {
        // De kop staat hierboven al; de invoer herhaalt hem niet.
        houder.appendChild(maakComposer(i, (nieuw) => { praatOpen = false; toonPraat(pat, nieuw); },
          { kop: false, opening }));
        opening = null;   // alleen bij het openen, niet bij elke hertekening
      }
      houder.appendChild(maakDraad(draad));
    }
    teken2();
  }

  // ---- het blad Gesprekken ---------------------------------------------------------------------
  async function vernieuwGesprekken() {
    const { status, data } = await api('/api/mijn/conversations');
    if (status !== 200) return null;
    gesprekOngelezen = data.unread || 0;
    $('gs-stip').classList.toggle('hidden', gesprekOngelezen === 0);
    return data.items || [];
  }

  function vulGesprekken(items) {
    const nieuwHouder = $('gs-nieuw');
    const ul = $('gs-lijst');
    const draadHouder = $('gs-draad');
    draadHouder.innerHTML = '';
    nieuwHouder.innerHTML = '';
    ul.innerHTML = '';

    let open = false;
    const ingang = maakKnop('Iets vertellen', 'tekst gs-ingang', () => { open = !open; tekenNieuw(); });
    function tekenNieuw() {
      nieuwHouder.innerHTML = '';
      nieuwHouder.appendChild(ingang);
      if (open) nieuwHouder.appendChild(maakComposer(null, () => { open = false; tekenNieuw(); openGesprekken(); }));
    }
    tekenNieuw();

    if (!items || !items.length) {
      ul.innerHTML = '<li class="leeg"><p class="stem">Er is hier nog niets gezegd. Zeg iets bij een patroon, of vertel ons iets nieuws.</p></li>';
      return;
    }
    items.forEach((it) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gs-item' + (it.unread ? ' nieuw' : '');
      b.appendChild(el('span', 'gs-titel', it.insight_title || 'Iets vertellen'));
      b.appendChild(el('span', 'gs-meta',
        (it.unread ? 'Nieuw antwoord, ' : '') + fmtDatum(it.last_message_at)));
      b.addEventListener('click', async () => {
        const { status, data } = await api('/api/mijn/conversations/' + encodeURIComponent(it.id));
        if (status !== 200) { toast('Dit gesprek kon niet worden geopend.'); return; }
        draadHouder.innerHTML = '';
        draadHouder.appendChild(maakDraad(data.conversation));
        if (data.conversation.insight_id) {
          const pat = patronen.find((q) => q.ins.id === data.conversation.insight_id);
          if (pat) draadHouder.appendChild(maakKnop('Terug naar dit patroon in het veld', 'tekst', () => openBewijs(pat.index)));
        }
        draadHouder.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        vernieuwGesprekken().then((v) => { if (v) vulLijstStippen(v); });
      });
      li.appendChild(b); ul.appendChild(li);
    });
  }
  function vulLijstStippen(items) {
    const knoppen = $('gs-lijst').querySelectorAll('.gs-item');
    items.forEach((it, k) => { if (knoppen[k]) knoppen[k].classList.toggle('nieuw', Boolean(it.unread)); });
  }

  async function openGesprekken() {
    meteenKlaar();
    openBlad('gesprekken');
    vulGesprekken(await vernieuwGesprekken());
  }
  $('btn-gesprekken').addEventListener('click', () => { openGesprekken(); zetActief('btn-gesprekken'); });
  $('btn-gesprekken-sluit').addEventListener('click', terug);

  // ============================================================================================
  // 10. BOOT
  // ============================================================================================
  // De teksten bij een uitnodiging die niet meer werkt. Een verlopen of gebruikte link haalt geen
  // toegang weg: de kamer staat er nog, hij heeft alleen een nieuwe manier nodig om binnen te komen.
  const INWISSEL_FOUT = {
    used: 'Deze uitnodiging is al gebruikt. Je toegang blijft bestaan. Vraag Maculis om een nieuwe inloglink.',
    expired: 'Deze uitnodiging is verlopen. Je kamer staat er nog. Vraag Maculis om een nieuwe inloglink.',
    invalid: 'Deze link werkt niet meer. Vraag Maculis om een nieuwe.',
    no_access: 'Er is nog geen toegang aan dit adres gekoppeld. Vraag Maculis om een uitnodiging.',
    network: 'Mijn Maculis kon niet worden bereikt. Probeer het zo nog eens.',
  };

  async function boot() {
    if (eenmalig) {
      const fout = await wisselIn(eenmalig);
      if (fout) {
        gateMsg.textContent = INWISSEL_FOUT[fout] || INWISSEL_FOUT.invalid;
        gateMsg.classList.add('error');
        return;
      }
    }
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
    orgNaam = org;
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
    // Het antwoord op "Herken je dit?" is duurzaam, dus het veld begint er meteen mee.
    inzichten.forEach((i) => { if (i.recognition) herkenning[i.id] = i.recognition; });
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
    // De regels onder de groet staan er nu pas, en die bepalen mede hoeveel ruimte de HUD inneemt.
    // Opnieuw meten, anders is de band te ruim berekend en komt het veld alsnog tegen de tekst aan.
    meet();

    // Staat er iets voor je klaar? Een stille stip in de periferie, meer niet.
    const draden = await vernieuwGesprekken();

    // ADR-0003 D6: geen lege module wordt getoond. Een bestemming die nergens heen gaat leest als
    // "hier hoort iets te staan", en dat is precies het gevoel dat de eerste kamer moet vermijden.
    // Donkere ruimte in het veld is geen gat; een leeg blad met een kop erop wel.
    stemBestemmingenAf(draden);

    // Eerder sprong de eerste keer meteen het bewijsblad in. Dat kostte de begroeting: hij landde in
    // een detail zonder dat er ooit "Welkom terug" had gestaan, en dan leest de kamer als een
    // dossier in plaats van als een vervolg op wat hij net heeft meegemaakt. Het veld toont zijn
    // naam, zijn organisatie én zijn eigen zin, dus daar landt hij, en het bewijs is één tik weg.

    t0 = nu(); p = 0; modus = 'openen';
    if (reduce) { p = 1; modus = 'rust'; toonUitspraak(); teken(); stadium(); plaatsUitspraak(); }
    else lus();
  }

  boot();
})();
