/* =============================================================================
   MACULIS WHATSAPP-SLOTMOMENT · BEVROREN REFERENTIE
   Variant 2, "Eén punt". Gekozen op 2026-08-18.

   Dit bestand is de enige bron van waarheid voor de WhatsApp-beweging. Elke
   sticker, elke statische terugval en elke voorbeeldweergave wordt hieruit
   gegenereerd, zodat er geen tweede versie van de beweging kan ontstaan.
   Wijzig hier niets zonder een nieuwe ontwerpronde.

   RELATIE TOT DE E-MAILHANDTEKENING
   De VORM is letterlijk overgenomen uit docs/studies/tools/seal-reference.js:
   dezelfde boog, dezelfde ster, dezelfde kleuren, dezelfde verhoudingen. Die
   twee bestanden mogen nooit los van elkaar veranderen. Wat hier nieuw is, is
   uitsluitend de TIJD en de UITSNEDE, want WhatsApp is een ander medium en dit
   is een ander ritueel.

   Vaste grammatica, niet ter discussie:
     · het zegel in rust is het object, de gebeurtenis is het moment
     · volledige stilte voor de gebeurtenis
     · één punt, niet meer
     · het punt nadert tot precies op de curve en gaat er nooit doorheen
     · de ster reageert als ademhaling, niet als flits
     · het loslaten valt niet samen met het einde van de nadering
     · eerst frame is gelijk aan het laatste frame en aan de statische terugval
     · daarna volledige rust, en geen lus
     · geen tekst in het beeld, geen woordmerk, geen kader

   STATUS: onderzoeksreferentie. Niet geïntegreerd, geen productie-asset, geen
   verzendlogica. Zie docs/WHATSAPP_SIGNATURE_STUDY.md hoofdstuk 9 en 10.
============================================================================= */
(function (root) {
  'use strict';

  var SPEC = {
    version: 'wa-v1',
    variant: 'Eén punt',
    chosen: '2026-08-18',

    // ---- vorm, identiek aan de e-mailreferentie ----------------------------
    cell: 150,                    // rekeneenheid, vierkant
    seal: { x: 75, y: 75, r: 44 },
    arc:  { from: 34, to: 326, width: 1.15, alpha: 0.80, lift: 0.03 },
    star: { size: 25, alpha: 0.88, glowBase: 0.10, scale: 0.018 },
    color: { ink: '#0a0b10', copper: '#b87333', copperLit: '#e6b98d' },

    // ---- uitsnede ----------------------------------------------------------
    // Een sticker IS de cel. In e-mail staat het zegel in een cel met lucht
    // eromheen; hier vult het merk ongeveer tachtig procent van het vlak.
    zoom: 1.34,

    // ---- tijd, opnieuw ontworpen voor WhatsApp -----------------------------
    // Eén punt. Het komt tot 42 procent van de weg naar het hart, en dat is
    // precies de straal van de curve: naderen is niet bereiken, en de curve is
    // de grens van wat is waargenomen.
    points: [
      { a: 206, rf: 1.30, r: 1.05, arrive: 0.42, peak: 0.56,
        t0: 1.30, dur: 1.00, rel: 2.85, relDur: 1.05 }
    ],
    approach: [2.00, 2.70],       // vertragend, outCubic
    target: 0.55, swirl: 14, base: 0.05,
    breath: { at: 2.62, up: 0.14, down: 0.34, gain: 0.18 }, // ademhaling, geen flits

    quiet: 1.30,                  // volledige stilte voordat er iets gebeurt
    motionEnd: 3.90,              // laatste moment waarop nog iets verandert
    duration: 4.10,               // inclusief het vastgehouden rustframe
    fps: 15,

    // ---- levering ----------------------------------------------------------
    // 41 frames: één lang stiltekader, negenendertig bewegende kaders, één
    // vastgehouden rustkader. De stilte kost zo bijna geen bytes.
    delivery: {
      file: 'maculis-seal-perceive-wa-v1.webp',   // geanimeerd, maximaal 500 kB
      still: 'maculis-seal-rest-wa-v1.webp',      // statisch, maximaal 100 kB
      size: 512, transparent: true, loop: false,
      frames: 41, quietFrameMs: 1300, tailFrameMs: 200
    },

    // Gemeten op ware grootte (118 px bij dubbele dichtheid, per kleurkanaal).
    // De eerste regel is een eis, geen waarneming: haalt een export dit niet,
    // dan is de statische terugval geen terugval.
    measured: { restFrameDelta: 0, peakDelta: 75, movingPixels: 99 }
  };

  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function seg(t, a, b){ return clamp01((t - a) / (b - a)); }
  function smooth(t){ t = clamp01(t); return t * t * (3 - 2 * t); }
  function outCubic(t){ t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function rad(d){ return d * Math.PI / 180; }
  function hexA(hex, a){
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + clamp01(a).toFixed(4) + ')';
  }

  // Ademhaling: snel op, trager af. Een flits wijst naar zichzelf, dit reageert.
  function breath(t){
    var b = SPEC.breath;
    if (t < b.at) return 0;
    if (t < b.at + b.up) return smooth((t - b.at) / b.up);
    if (t < b.at + b.up + b.down) return 1 - smooth((t - b.at - b.up) / b.down);
    return 0;
  }

  // Toestand van het veld op tijdstip t. Buiten [0, motionEnd] is alles nul,
  // en dat is precies wat het rustframe en de statische terugval tonen.
  function frame(t){
    var bn = breath(t), g = bn * SPEC.breath.gain, S = SPEC.seal;
    var pts = SPEC.points.map(function (p) {
      var up  = smooth(seg(t, p.t0, p.t0 + p.dur));
      var inn = outCubic(seg(t, SPEC.approach[0], SPEC.approach[1]));
      var off = seg(t, p.rel, p.rel + p.relDur);
      var k   = inn * (1 - outCubic(off)) * p.arrive;   // helderheid volgt nabijheid
      var rr  = lerp(S.r * p.rf, S.r * SPEC.target, k);
      var ang = rad(p.a + SPEC.swirl * k);
      return {
        x: S.x + Math.cos(ang) * rr,
        y: S.y + Math.sin(ang) * rr,
        r: p.r,
        a: (SPEC.base + (p.peak - SPEC.base) * k + 0.05 * g) * up * (1 - smooth(off))
      };
    });
    return {
      arcAlpha: SPEC.arc.alpha + SPEC.arc.lift * bn,
      starGlow: SPEC.star.glowBase + g,
      starScale: 1 + SPEC.star.scale * bn,
      points: pts
    };
  }

  function starPath(ctx, x, y, s){
    var ly = s, lx = s * 0.60, k = s * 0.045;
    ctx.beginPath();
    ctx.moveTo(x, y - ly);
    ctx.quadraticCurveTo(x + k, y - k, x + lx, y);
    ctx.quadraticCurveTo(x + k, y + k, x, y + ly);
    ctx.quadraticCurveTo(x - k, y + k, x - lx, y);
    ctx.quadraticCurveTo(x - k, y - k, x, y - ly);
    ctx.closePath();
  }

  // Tekent het volledige zegel. De achtergrond blijft doorzichtig, want een
  // WebP-sticker kent een alfakanaal en staat rechtstreeks op het behang van
  // het gesprek. Geef ink = true alleen voor voorbeelden op een inktvlak.
  // scale 1 levert 150 bij 150; voor de sticker wordt op 512 gerenderd.
  function draw(ctx, t, px, ink){
    var s = px / SPEC.cell, S = SPEC.seal, C = SPEC.color, f = frame(t);
    ctx.clearRect(0, 0, px, px);
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(S.x, S.y); ctx.scale(SPEC.zoom, SPEC.zoom); ctx.translate(-S.x, -S.y);

    if (ink) {
      var m = SPEC.cell * (1 - 1 / SPEC.zoom) / 2;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(m, m, SPEC.cell - 2*m, SPEC.cell - 2*m, 26 / SPEC.zoom);
      else ctx.rect(m, m, SPEC.cell - 2*m, SPEC.cell - 2*m);
      ctx.fill();
    }

    ctx.lineWidth = SPEC.arc.width;
    ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(C.copper, f.arcAlpha);
    ctx.beginPath();
    ctx.arc(S.x, S.y, S.r, rad(SPEC.arc.from), rad(SPEC.arc.to));
    ctx.stroke();

    var ss = SPEC.star.size * f.starScale;
    if (f.starGlow > 0.001){
      var gg = ctx.createRadialGradient(S.x, S.y, 0, S.x, S.y, ss * 2.6);
      gg.addColorStop(0, hexA(C.copperLit, 0.30 * f.starGlow));
      gg.addColorStop(1, hexA(C.copperLit, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(S.x, S.y, ss * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = hexA(C.copperLit, SPEC.star.alpha);
    starPath(ctx, S.x, S.y, ss);
    ctx.fill();

    f.points.forEach(function (p) {
      if (p.a <= 0.002) return;
      var pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.4);
      pg.addColorStop(0, hexA(C.copper, p.a));
      pg.addColorStop(0.34, hexA(C.copper, p.a * 0.42));
      pg.addColorStop(1, hexA(C.copper, 0));
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hexA(C.copper, Math.min(1, p.a * 1.25));
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  root.MaculisWaSeal = { SPEC: SPEC, frame: frame, draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
