/* =============================================================================
   MACULIS SIGNATUURMOMENT · BEVROREN REFERENTIE
   Variant 2, "Eén ademtocht". Gekozen op 2026-08-18.

   Dit bestand is de enige bron van waarheid voor de beweging. De GIF, de
   statische PNG en elke voorbeeldweergave worden hieruit gegenereerd. Wijzig
   hier niets zonder een nieuwe ontwerpronde.

   Vaste grammatica, niet ter discussie:
     · ontwerp 1 blijft de handtekening
     · volledige stilte voor de gebeurtenis
     · een eenmalige waarnemingsgebeurtenis
     · vier punten met ongelijke timing
     · de punten naderen maar komen niet aan
     · de ster reageert als ademhaling, niet als flits
     · geen lichtloop, geen reizend violet, geen tweede gebeurtenis
     · eerste frame is gelijk aan het laatste frame en aan de statische fallback
     · daarna volledige rust
============================================================================= */
(function (root) {
  'use strict';

  var SPEC = {
    version: 'v1',
    cell: 150,                  // zegelcel in CSS pixels, vierkant
    seal: { x: 75, y: 75, r: 44 },
    arc: { from: 34, to: 326, width: 1.15, alpha: 0.80, lift: 0.05 },
    star: { size: 25, alpha: 0.88, glowBase: 0.10, scale: 0.018 },
    color: { ink: '#0a0b10', copper: '#b87333', copperLit: '#e6b98d' },

    points: [
      { a: 128, rf: 1.45, r: 1.15 },
      { a: 188, rf: 1.38, r: 1.00 },
      { a: 262, rf: 1.50, r: 1.20 },
      { a: 322, rf: 1.42, r: 1.05 }
    ],

    appear: 1.60, stagger: 0.34, appearDur: 1.20,        // opkomen, ongelijk
    approach: 3.20, approachEnd: 4.60,                   // naderen, vertragend
    target: 0.55, swirl: 14, arrive: 0.96,               // 4 procent blijft altijd over
    base: 0.05, peak: 0.52,                              // helderheid volgt nabijheid
    breath: { at: 4.40, up: 0.18, down: 0.32, gain: 0.30 }, // ademhaling, geen flits
    release: 4.90, releaseStagger: 0.20, releaseDur: 1.10,

    motionEnd: 6.60,            // laatste frame waarin nog iets verandert
    duration: 7.00,             // inclusief het vastgehouden rustframe
    fps: 10,
    quietFrames: 16,            // frames 0 t/m 15 zijn identiek aan het rustframe
    tailFrames: 4               // frames 66 t/m 69 zijn identiek aan het rustframe
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
  // en dat is precies wat het rustframe en de statische PNG tonen.
  function frame(t){
    var bn = breath(t);                       // 0 tot 1, de vorm van de ademhaling
    var g = bn * SPEC.breath.gain;            // de werkelijke lichtwinst van de ster
    var S = SPEC.seal;
    var pts = SPEC.points.map(function (p, i) {
      var up = smooth(seg(t, SPEC.appear + i*SPEC.stagger, SPEC.appear + i*SPEC.stagger + SPEC.appearDur));
      var inn = outCubic(seg(t, SPEC.approach, SPEC.approachEnd));
      var off = seg(t, SPEC.release + i*SPEC.releaseStagger, SPEC.release + i*SPEC.releaseStagger + SPEC.releaseDur);
      var k = inn * (1 - outCubic(off)) * SPEC.arrive;
      var rr = lerp(S.r * p.rf, S.r * SPEC.target, k);
      var ang = rad(p.a + SPEC.swirl * k);
      return {
        x: S.x + Math.cos(ang) * rr,
        y: S.y + Math.sin(ang) * rr,
        r: p.r,
        a: (SPEC.base + (SPEC.peak - SPEC.base) * k + 0.05 * g) * up * (1 - smooth(off))
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

  // Tekent de volledige zegelcel, inclusief de ondoorzichtige inktgrond.
  // scale 1 levert 150 bij 150, scale 2 levert 300 bij 300 voor retina.
  function draw(ctx, t, scale){
    var s = scale || 1, S = SPEC.seal, C = SPEC.color, f = frame(t);
    ctx.save();
    ctx.scale(s, s);
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, SPEC.cell, SPEC.cell);

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

  root.MaculisSeal = { SPEC: SPEC, frame: frame, draw: draw };
})(typeof window !== 'undefined' ? window : globalThis);
