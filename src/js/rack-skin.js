/*
 * Eleven Edit
 * Copyright (c) 2026 Charles Wardick
 * SPDX-License-Identifier: MIT
 * See LICENSE in the project root for full license text.
 */
// ════════════════════════════════════════════════════════════════════
// RACK-SKIN.JS (2026-09-10) — the drawn half of the rack-mounted look
// (css/rack-skin.css is the styled half): Neve-style knobs and a VU meter.
//
// Loads after ui.js/transport.js and REPLACES the global drawTickKnob
// binding while the skin is on — drawKnob (ui.js) dispatches to it by name
// for every data-style="tick" knob, which is every rotary in the app, so
// nothing else changes: same canvas, same value contract, same dataset
// baseline tick (dataset.orig) the double-click restore relies on. With the
// Classic look selected the original renderer is called untouched.
//
// Knob: a "Marconi" style knob as on a Neve 1073 — ribbed charcoal skirt,
// bevel ring, domed coloured cap (red on the amp panel, blue on FX panels,
// the band colour on Parametric EQ), cream pointer, cream tick scale, set
// into a shadowed well. Drawn at device pixel ratio so it is crisp on a
// Retina display (the canvases are declared 70x70 CSS px).
//
// VU: a classic backlit VU meter in the top bar. Honest about what it shows:
// the needle sits at the MAIN output volume (CMD 0x36, the value the MAIN
// VOL box shows) — the rack does not report audio level over MIDI — and it
// twitches on every incoming MIDI message with a PEAK LED, so it reads as
// the live link to the hardware that it is.
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const SKIN_KEY = 'ee-look';                       // localStorage: 'rack' | 'classic'
  const originalDrawTickKnob = (typeof drawTickKnob === 'function') ? drawTickKnob : null;

  function skinOn() { return document.body.classList.contains('rack-skin'); }

  // ── Retina-aware canvas prep ─────────────────────────────────────
  // The canvases are created with width/height attributes in CSS pixels.
  // First time through, remember that logical size, scale the backing
  // store by devicePixelRatio and pin the CSS size, so later draws stay
  // sharp. Returns the logical size to draw in.
  function prep(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (!canvas.dataset.cssW) {
      canvas.dataset.cssW = String(canvas.width);
      canvas.dataset.cssH = String(canvas.height);
    }
    const w = parseInt(canvas.dataset.cssW, 10), h = parseInt(canvas.dataset.cssH, 10);
    if (canvas.dataset.dpr !== String(dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      canvas.dataset.dpr = String(dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  // ── Neve-style knob ──────────────────────────────────────────────
  const CAP = {
    red:  { hi: '#d4463a', mid: '#a32b22', lo: '#5c1611' },   // Neve gain red
    blue: { hi: '#4f86c6', mid: '#2d5c96', lo: '#17325a' },   // Neve frequency blue
    grey: { hi: '#9aa0a8', mid: '#5c626a', lo: '#2e3237' },   // dynamics
  };
  function hexToRgb(h) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
  }
  function shade(hex, f) {   // f > 1 lighten, < 1 darken
    const c = hexToRgb(hex); if (!c) return hex;
    return 'rgb(' + c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',') + ')';
  }
  // Neve's colour logic: red caps on gain/level controls, blue on tone/
  // frequency, grey on dynamics. Decided from the knob's own label, so a
  // new panel gets sensible colours without a table; Parametric EQ keeps
  // its per-band accent (matches Avid's own LF/LMF/HMF/HF colours).
  function capColours(wrap) {
    if (wrap && wrap.dataset.bandColor) {
      const b = wrap.dataset.bandColor;
      return { hi: shade(b, 1.25), mid: b, lo: shade(b, 0.5) };
    }
    let label = '';
    const ck = wrap && wrap.closest ? wrap.closest('.ctrl-knob') : null;
    const lab = ck ? ck.querySelector('label') : null;
    if (lab) label = (lab.textContent || '').toLowerCase();
    const id = (wrap && wrap.id ? wrap.id : '').toLowerCase();
    let col = 'blue';
    if (/gate|thresh|release|attack|ratio|comp/.test(label + ' ' + id)) col = 'grey';
    else if (/vol|gain|boost|drive|level|out|mix|amount|master|send|return|feedback|depth/.test(label + ' ' + id)) col = 'red';
    return CAP[col];   // recomputed every paint: tone knobs are re-labelled per amp
  }

  function drawNeveKnob(canvas, value127, wrap) {
    const p = prep(canvas), ctx = p.ctx, w = p.w, h = p.h;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2;              // 35 on a 70px canvas
    const rTick = R - 2, rSkirt = R - 8, rBevel = R - 16.5, rCap = R - 18.5;
    const startRad = -Math.PI / 2 + (225 * Math.PI / 180);
    const sweepRad = 270 * Math.PI / 180;
    const angleFor = v => startRad + sweepRad * (Math.max(0, Math.min(127, v)) / 127);
    const cap = capColours(wrap);

    // Well — the knob sits in a shadowed recess in the panel
    let g = ctx.createRadialGradient(cx, cy + 2, rSkirt * 0.6, cx, cy + 2, rSkirt + 6);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy + 2, rSkirt + 6, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

    // Tick scale — 11 cream ticks over the 270° sweep, longer at both ends and centre
    for (let i = 0; i <= 10; i++) {
      const a = startRad + sweepRad * (i / 10);
      const long = (i === 0 || i === 5 || i === 10);
      const r0 = rTick - (long ? 4.5 : 3), r1 = rTick;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.strokeStyle = long ? '#e9e2cf' : 'rgba(233,226,207,0.7)'; ctx.lineWidth = long ? 1.6 : 1.1; ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Baseline marker (value the knob loaded with — double-click restores it):
    // small amber wedge just outside the tick ring, same slot the old tick used.
    if (wrap && wrap.dataset.orig !== undefined && wrap.dataset.orig !== '') {
      const a = angleFor(parseInt(wrap.dataset.orig, 10));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0, -(R + 0.5)); ctx.lineTo(-2.4, -(R - 4)); ctx.lineTo(2.4, -(R - 4)); ctx.closePath();
      ctx.fillStyle = '#f0aa3c'; ctx.fill();
      ctx.restore();
    }

    // Skirt — charcoal, with a drop shadow, then radial ribs around its edge
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    g = ctx.createRadialGradient(cx - rSkirt * 0.35, cy - rSkirt * 0.4, rSkirt * 0.1, cx, cy, rSkirt);
    g.addColorStop(0, '#4a4e55'); g.addColorStop(0.6, '#2c2f34'); g.addColorStop(1, '#1b1d21');
    ctx.beginPath(); ctx.arc(cx, cy, rSkirt, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    const ribs = 36;
    for (let i = 0; i < ribs; i++) {
      const a = (i / ribs) * Math.PI * 2;
      const lit = Math.cos(a + Math.PI * 0.75);          // light comes from top-left
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (rBevel + 1), cy + Math.sin(a) * (rBevel + 1));
      ctx.lineTo(cx + Math.cos(a) * (rSkirt - 0.5), cy + Math.sin(a) * (rSkirt - 0.5));
      ctx.strokeStyle = lit > 0 ? 'rgba(255,255,255,' + (0.05 + 0.10 * lit) + ')' : 'rgba(0,0,0,' + (0.15 - 0.25 * lit) + ')';
      ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, rSkirt, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1; ctx.stroke();

    // Bevel ring between skirt and cap
    g = ctx.createLinearGradient(cx - rBevel, cy - rBevel, cx + rBevel, cy + rBevel);
    g.addColorStop(0, '#9aa0a8'); g.addColorStop(0.5, '#3a3e44'); g.addColorStop(1, '#0f1012');
    ctx.beginPath(); ctx.arc(cx, cy, rBevel, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

    // Cap — domed, coloured, specular highlight top-left
    g = ctx.createRadialGradient(cx - rCap * 0.4, cy - rCap * 0.45, rCap * 0.1, cx, cy, rCap);
    g.addColorStop(0, cap.hi); g.addColorStop(0.55, cap.mid); g.addColorStop(1, cap.lo);
    ctx.beginPath(); ctx.arc(cx, cy, rCap, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    g = ctx.createRadialGradient(cx - rCap * 0.35, cy - rCap * 0.5, 0, cx - rCap * 0.35, cy - rCap * 0.5, rCap * 0.9);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, rCap, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

    // Pointer — cream line across the skirt, with a matching notch on the cap
    const a = angleFor(value127);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -(rSkirt - 1.5)); ctx.lineTo(0, -(rBevel + 0.5));
    ctx.strokeStyle = '#f3ecd8'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -(rCap - 1)); ctx.lineTo(0, -(rCap * 0.45));
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }

  // Undo prep(): the original renderer treats canvas.width as the logical
  // size, so hand it back a 1x backing store (setting width also resets the
  // context transform) — otherwise Classic draws a 2x-scaled quarter knob.
  function unprep(canvas) {
    if (!canvas.dataset.dpr) return;
    canvas.width = parseInt(canvas.dataset.cssW, 10); canvas.height = parseInt(canvas.dataset.cssH, 10);
    canvas.style.width = ''; canvas.style.height = '';
    delete canvas.dataset.dpr;
  }

  // Take over the tick-knob renderer while the skin is on.
  window.drawTickKnob = function (canvas, value127, wrap) {
    if (skinOn()) return drawNeveKnob(canvas, value127, wrap);
    unprep(canvas);
    if (originalDrawTickKnob) return originalDrawTickKnob(canvas, value127, wrap);
  };
  // Note: ui.js's drawKnob refers to `drawTickKnob` by name; in a classic
  // script that name resolves to the global binding, which is now ours.
  try { drawTickKnob = window.drawTickKnob; } catch (e) {}

  function repaintAllKnobs() {
    document.querySelectorAll('.knob-wrap[data-style="tick"]').forEach(function (wrap) {
      const c = wrap.querySelector('canvas.knob-canvas'); if (!c) return;
      const v = parseInt(wrap.dataset.value, 10);
      if (typeof drawKnob === 'function') drawKnob(c, Number.isNaN(v) ? 64 : v);
    });
  }

  // ── VU meter ─────────────────────────────────────────────────────
  const VU = { canvas: null, angle: -45, target: -45, kick: 0, peakUntil: 0, raf: null, last: 0 };
  // Classic VU scale: dB -> needle angle (degrees from vertical), non-linear like the real thing.
  const SCALE = [[-20, -46], [-10, -26], [-7, -15], [-5, -7], [-3, 3], [-2, 8], [-1, 13], [0, 19], [1, 27], [2, 36], [3, 46]];
  function dbToAngle(db) {
    if (db <= SCALE[0][0]) return SCALE[0][1];
    for (let i = 1; i < SCALE.length; i++) {
      if (db <= SCALE[i][0]) {
        const t = (db - SCALE[i - 1][0]) / (SCALE[i][0] - SCALE[i - 1][0]);
        return SCALE[i - 1][1] + t * (SCALE[i][1] - SCALE[i - 1][1]);
      }
    }
    return SCALE[SCALE.length - 1][1];
  }
  function levelDb() {
    const v = (typeof currentMasterVol === 'number') ? currentMasterVol : null;
    if (v === null) return -20;
    return -20 + 23 * Math.pow(v / 127, 0.55);   // 0.0 -> -20 dB, 8.0 -> ~0 dB, 10.0 -> +3
  }
  function vuKick() {
    VU.kick = Math.min(4, VU.kick + 1.2);
    VU.peakUntil = performance.now() + 140;
  }

  function drawVU(now) {
    const canvas = VU.canvas; if (!canvas) return;
    const p = prep(canvas), ctx = p.ctx, w = p.w, h = p.h;
    const dt = Math.min(0.05, (now - (VU.last || now)) / 1000); VU.last = now;
    VU.kick *= Math.exp(-dt / 0.22);
    VU.target = dbToAngle(levelDb() + VU.kick);
    VU.angle += (VU.target - VU.angle) * Math.min(1, dt * 14);

    // Bezel
    rr(ctx, 0, 0, w, h, 7);
    let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4a4e55'); g.addColorStop(0.5, '#1f2226'); g.addColorStop(1, '#0d0e10');
    ctx.fillStyle = g; ctx.fill();
    // Face (backlit cream)
    const fx = 4, fy = 4, fw = w - 8, fh = h - 8;
    ctx.save(); rr(ctx, fx, fy, fw, fh, 4); ctx.clip();
    g = ctx.createRadialGradient(w / 2, fh * 0.15, 4, w / 2, fh * 0.6, fw * 0.75);
    g.addColorStop(0, '#f7efd8'); g.addColorStop(0.55, '#ecdfbd'); g.addColorStop(1, '#cdbd98');
    ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
    g = ctx.createRadialGradient(w / 2, fh * 0.1, 2, w / 2, fh * 0.1, fw * 0.6);   // warm bulb glow
    g.addColorStop(0, 'rgba(255,196,110,0.35)'); g.addColorStop(1, 'rgba(255,196,110,0)');
    ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);

    // Scale arc
    const px = w / 2, py = h + 30, r = h + 8;
    const arc = function (a0, a1, col, lw) {
      ctx.beginPath(); ctx.arc(px, py, r, rad(a0), rad(a1)); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt'; ctx.stroke();
    };
    arc(SCALE[0][1], dbToAngle(0), '#1a1a1a', 1.6);
    arc(dbToAngle(0), SCALE[SCALE.length - 1][1], '#c8281e', 3.2);
    const k = w / 156, small = w < 150;
    ctx.font = 'bold ' + (7.5 * k).toFixed(1) + 'px Helvetica, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const shown = small ? [-20, -10, -5, 0, 3] : [-20, -10, -7, -5, -3, 0, 3];
    SCALE.forEach(function (s) {
      const a = rad(s[1]), red = s[0] >= 0;
      const t0 = r - (red ? 5 : 4), t1 = r + 1;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * t0, py + Math.sin(a) * t0); ctx.lineTo(px + Math.cos(a) * t1, py + Math.sin(a) * t1);
      ctx.strokeStyle = red ? '#c8281e' : '#1a1a1a'; ctx.lineWidth = s[0] === 0 ? 1.6 : 1; ctx.stroke();
      if (shown.indexOf(s[0]) !== -1) {
        ctx.fillStyle = red ? '#b4221a' : '#1a1a1a';
        ctx.fillText(s[0] > 0 ? '+' + s[0] : String(s[0]), px + Math.cos(a) * (r - 11), py + Math.sin(a) * (r - 11));
      }
    });
    ctx.font = 'bold ' + (11 * k).toFixed(1) + 'px Helvetica, Arial, sans-serif'; ctx.fillStyle = '#2a2622';
    ctx.fillText('VU', px, fy + fh - 16 * k);
    ctx.font = 'bold ' + (6.5 * k).toFixed(1) + 'px Helvetica, Arial, sans-serif'; ctx.fillStyle = '#5a534a';
    ctx.fillText('MAIN VOL', px, fy + fh - 7.5 * k);

    // Needle
    const a = rad(VU.angle);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 10, py + Math.sin(a) * 10); ctx.lineTo(px + Math.cos(a) * (r + 4), py + Math.sin(a) * (r + 4));
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    // Pivot cover
    g = ctx.createRadialGradient(px, py, 2, px, py, 26); g.addColorStop(0, '#3a3d42'); g.addColorStop(1, '#101214');
    ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

    // PEAK LED
    const lit = now < VU.peakUntil;
    ctx.beginPath(); ctx.arc(fx + fw - 9, fy + 9, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = lit ? '#ff3b30' : '#5a1a16'; ctx.fill();
    if (lit) { ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0; }
    ctx.font = 'bold ' + (5.5 * k).toFixed(1) + 'px Helvetica, Arial, sans-serif'; ctx.fillStyle = '#5a534a'; ctx.fillText('PEAK', fx + fw - 9, fy + 17);

    // Glass
    g = ctx.createLinearGradient(fx, fy, fx + fw * 0.6, fy + fh);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.45, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
    g = ctx.createRadialGradient(w / 2, fh / 2, fw * 0.25, w / 2, fh / 2, fw * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
    // Inner bezel line
    rr(ctx, fx, fy, fw, fh, 4); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    rr(ctx, 0.5, 0.5, w - 1, h - 1, 7); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.stroke();
  }
  function rad(deg) { return (deg - 90) * Math.PI / 180; }   // 0° = straight up
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function vuLoop(now) {
    if (!skinOn()) { VU.raf = null; return; }
    drawVU(now);
    VU.raf = requestAnimationFrame(vuLoop);
  }
  function startVU() {
    VU.canvas = document.getElementById('vu-canvas');
    if (VU.canvas && !VU.raf && skinOn()) VU.raf = requestAnimationFrame(vuLoop);
  }

  // Every incoming MIDI message twitches the needle and blinks PEAK.
  // transport.js's socket handler calls handleBridgeMsg by global name, so
  // wrapping the binding is enough.
  if (typeof handleBridgeMsg === 'function') {
    const orig = handleBridgeMsg;
    window.handleBridgeMsg = function (msg) {
      if (msg && msg.type === 'midi_in' && skinOn()) vuKick();
      return orig(msg);
    };
    try { handleBridgeMsg = window.handleBridgeMsg; } catch (e) {}
  }

  // ── Look setting (Settings > Look: Rack / Classic) ──────────────
  function applyLook(look, persist) {
    const rack = look !== 'classic';
    document.body.classList.toggle('rack-skin', rack);
    if (persist) { try { localStorage.setItem(SKIN_KEY, rack ? 'rack' : 'classic'); } catch (e) {} }
    document.querySelectorAll('.settings-look-btn').forEach(function (b) {
      b.classList.toggle('on', (b.dataset.look === 'classic') !== rack);
    });
    repaintAllKnobs();
    if (rack) startVU();
  }
  let saved = null;
  try { saved = localStorage.getItem(SKIN_KEY); } catch (e) {}
  applyLook(saved || 'rack', false);

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.settings-look-btn').forEach(function (b) {
      b.addEventListener('click', function () { applyLook(b.dataset.look, true); });
    });
    startVU();
  });
  if (document.readyState !== 'loading') startVU();
})();
