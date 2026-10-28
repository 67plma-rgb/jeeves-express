/* Jeeves Express: carrera por la ciudad en 3D falso (canvas 2D). Sin dependencias.
   El trazado es siempre el mismo para que la carrera sea justa. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var cv = $('#cv'), cx = cv.getContext('2d'), game = $('#game');
  var W = 360, H = 640, DPR = 1, HZ = 250, KX = 100, KY = 240;
  var SEG = 200, ROAD = 1700, CAM_H = 1000, CAM_D = .84, DRAW = 170;
  var N = 3600, EXTRA = 460, FINISH = (N - 40) * SEG, PZ = CAM_H * CAM_D, MAXS = SEG * 60;
  var LANE_X = [-.75, -.25, .25, .75];
  var HAZE = '#B9738F', MINT = '#45EDD1';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- utilidades ---------- */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function easeIn(a, b, p) { return a + (b - a) * p * p; }
  function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + .5); }
  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function flip(src) { return mk(src.width, src.height, function (c, w) { c.translate(w, 0); c.scale(-1, 1); c.drawImage(src, 0, 0); }); }
  function fmt(t) { var m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); }
  function ord(n) { return ['', '1.er', '2.º', '3.er', '4.º'][n] || n + '.º'; }

  /* ---------- texturas ---------- */
  var T = {};
  function drawBurger(c, cxm, base, w) {
    var h = w * .78;
    c.save(); c.translate(cxm, base);
    c.fillStyle = '#E3A650'; rr(c, -w * .46, -w * .13, w * .92, w * .13, w * .06); c.fill();
    c.fillStyle = '#5B3A2B'; rr(c, -w * .5, -w * .27, w, w * .15, w * .07); c.fill();
    c.fillStyle = '#FFC83D'; c.beginPath(); c.moveTo(-w * .48, -w * .27); c.lineTo(w * .48, -w * .27); c.lineTo(w * .36, -w * .20); c.lineTo(w * .2, -w * .27); c.lineTo(-w * .06, -w * .18); c.lineTo(-w * .22, -w * .27); c.closePath(); c.fill();
    c.fillStyle = '#7CC24F'; c.beginPath(); c.moveTo(-w * .52, -w * .27);
    for (var i = 0; i <= 8; i++) c.lineTo(-w * .52 + w * 1.04 * i / 8, -w * (i % 2 ? .36 : .31)); c.lineTo(w * .52, -w * .27); c.closePath(); c.fill();
    c.fillStyle = '#E24B3B'; rr(c, -w * .3, -w * .39, w * .6, w * .05, w * .025); c.fill();
    var g = c.createLinearGradient(0, -h, 0, -w * .38); g.addColorStop(0, '#F0B964'); g.addColorStop(1, '#D8923F'); c.fillStyle = g;
    c.beginPath(); c.moveTo(-w * .48, -w * .38); c.bezierCurveTo(-w * .5, -h * 1.12, w * .5, -h * 1.12, w * .48, -w * .38); c.closePath(); c.fill();
    c.fillStyle = '#FFF1CE'; [[-.2, -.62], [.05, -.7], [.24, -.58], [-.02, -.52], [-.3, -.5]].forEach(function (p) { c.beginPath(); c.ellipse(w * p[0], w * p[1] * 1.0, w * .035, w * .02, p[0] * 2, 0, 7); c.fill(); });
    c.restore();
  }
  var PAL = [['#2B3556', '#1B2240'], ['#3B2F5A', '#241C3E'], ['#1F4252', '#122A38'], ['#4B3A44', '#2E2230'], ['#2A4A44', '#17302D'], ['#55456E', '#2F2548'], ['#3A4A6B', '#222D4A']];
  function bldTex(R, a) {
    var w = 200, h = Math.round(200 * a);
    return mk(w, h, function (c) {
      var pal = PAL[R() * PAL.length | 0], g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal[0]); g.addColorStop(1, pal[1]); c.fillStyle = g; c.fillRect(0, 0, w, h);
      var sg = c.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(255,255,255,.05)'); sg.addColorStop(1, 'rgba(0,0,0,.3)'); c.fillStyle = sg; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, 0, w, 10); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(0, 10, w, 2);
      if (R() < .6) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(30 + R() * 80, -14, 34, 16); c.fillRect(120 + R() * 40, -8, 3, 14); }
      var cols = 4 + (R() * 3 | 0), gw = (w - 24) / cols, rows = Math.floor((h - 100) / 34);
      for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
        var lit = R() < .46, col = lit ? (R() < .72 ? '#FFD98A' : '#9FF5E4') : '#121830';
        c.fillStyle = col; c.globalAlpha = lit ? .92 : .9; c.fillRect(12 + k * gw + gw * .16, 26 + r * 34, gw * .68, 20); c.globalAlpha = 1;
      }
      var gy = h - 64; c.fillStyle = '#0E1226'; c.fillRect(0, gy, w, 64);
      c.fillStyle = '#FFE9B0'; c.globalAlpha = .88; c.fillRect(14, gy + 18, w - 28, 34); c.globalAlpha = 1;
      var aw = ['#E94E4E', '#45EDD1', '#F2B84B', '#7C8CF8'][R() * 4 | 0]; c.fillStyle = aw;
      for (var i = 0; i < 10; i++) { if (i % 2) c.fillStyle = 'rgba(255,255,255,.92)'; else c.fillStyle = aw; c.fillRect(8 + i * (w - 16) / 10, gy + 4, (w - 16) / 10, 14); }
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, gy + 52, w, 12);
    });
  }
  function lampTex(side) {
    var t = mk(60, 300, function (c) {
      c.fillStyle = '#1C2233'; c.fillRect(14, 40, 6, 260); c.fillRect(14, 34, 34, 6); rr(c, 8, 292, 18, 8, 3); c.fill();
      var g = c.createRadialGradient(46, 44, 0, 46, 44, 30); g.addColorStop(0, 'rgba(255,230,160,.95)'); g.addColorStop(.35, 'rgba(255,200,120,.45)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(10, 0, 60, 90);
      c.fillStyle = '#FFF3C9'; rr(c, 40, 38, 14, 8, 3); c.fill();
    });
    return side < 0 ? t : flip(t);
  }
  function carTex(col, van) {
    return mk(180, van ? 150 : 120, function (c, w, h) {
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(w / 2, h - 6, w * .47, 8, 0, 0, 7); c.fill();
      c.fillStyle = '#0F121B'; rr(c, 14, h - 28, 28, 24, 6); c.fill(); rr(c, w - 42, h - 28, 28, 24, 6); c.fill();
      var top = van ? h * .08 : h * .1;
      var g = c.createLinearGradient(0, top, 0, h); g.addColorStop(0, col); g.addColorStop(1, shade(col, -.35));
      c.fillStyle = g; c.beginPath(); c.moveTo(24, h * .5); c.lineTo(van ? 22 : 40, top + (van ? 0 : 6)); c.lineTo(van ? w - 22 : w - 40, top + (van ? 0 : 6)); c.lineTo(w - 24, h * .5); c.closePath(); c.fill();
      rr(c, 8, h * .42, w - 16, h * .42, 12); c.fill();
      c.fillStyle = '#1A2236'; c.beginPath(); c.moveTo(34, h * .46); c.lineTo(van ? 32 : 48, top + (van ? 10 : 14)); c.lineTo(van ? w - 32 : w - 48, top + (van ? 10 : 14)); c.lineTo(w - 34, h * .46); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(40, h * .46); c.lineTo(52, top + 14); c.lineTo(76, top + 14); c.lineTo(66, h * .46); c.closePath(); c.fill();
      c.shadowColor = '#FF3B3B'; c.shadowBlur = 12; c.fillStyle = '#FF4A4A'; rr(c, 16, h * .52, 36, 13, 5); c.fill(); rr(c, w - 52, h * .52, 36, 13, 5); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#F4F6FA'; rr(c, w / 2 - 22, h * .62, 44, 15, 3); c.fill(); c.fillStyle = '#1B2A57'; c.fillRect(w / 2 - 15, h * .68, 30, 3);
      c.fillStyle = '#0C0F18'; rr(c, 10, h * .8, w - 20, 9, 4); c.fill();
    });
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, f = k < 0 ? 0 : 255, p = Math.abs(k);
    return 'rgb(' + Math.round((f - r) * p + r) + ',' + Math.round((f - g) * p + g) + ',' + Math.round((f - b) * p + b) + ')';
  }
  function sideCarTex(col) {
    return mk(240, 100, function (c, w, h) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(w / 2, h - 5, w * .46, 7, 0, 0, 7); c.fill();
      var g = c.createLinearGradient(0, 20, 0, h); g.addColorStop(0, col); g.addColorStop(1, shade(col, -.35)); c.fillStyle = g;
      rr(c, 6, h * .4, w - 12, h * .4, 14); c.fill();
      c.beginPath(); c.moveTo(56, h * .42); c.lineTo(78, 12); c.lineTo(w - 86, 12); c.lineTo(w - 50, h * .42); c.closePath(); c.fill();
      c.fillStyle = '#1A2236'; c.beginPath(); c.moveTo(66, h * .42); c.lineTo(84, 20); c.lineTo(w / 2 + 2, 20); c.lineTo(w / 2 + 2, h * .42); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(w / 2 + 10, h * .42); c.lineTo(w / 2 + 10, 20); c.lineTo(w - 90, 20); c.lineTo(w - 62, h * .42); c.closePath(); c.fill();
      c.fillStyle = '#0F121B'; [[56, h - 22], [w - 58, h - 22]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 19, 0, 7); c.fill(); c.fillStyle = '#9AA3B5'; c.beginPath(); c.arc(p[0], p[1], 8, 0, 7); c.fill(); c.fillStyle = '#0F121B'; });
      c.shadowColor = '#FFE9A8'; c.shadowBlur = 14; c.fillStyle = '#FFF1B8'; rr(c, w - 20, h * .5, 12, 10, 4); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#FF4A4A'; rr(c, 8, h * .5, 8, 10, 3); c.fill();
    });
  }
  function pedTex(col, f) {
    return mk(44, 100, function (c) {
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(22, 96, 14, 4, 0, 0, 7); c.fill();
      c.strokeStyle = '#1B2236'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(18, 58); c.lineTo(18 + (f ? -6 : 6), 90); c.moveTo(27, 58); c.lineTo(27 + (f ? 6 : -6), 90); c.stroke();
      c.fillStyle = col; rr(c, 10, 26, 24, 38, 9); c.fill();
      c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(12, 32); c.lineTo(8 + (f ? 4 : -2), 56); c.moveTo(32, 32); c.lineTo(36 + (f ? -4 : 2), 56); c.stroke();
      c.fillStyle = '#E8B88F'; c.beginPath(); c.arc(22, 16, 9, 0, 7); c.fill(); c.fillStyle = '#2B1F1A'; c.beginPath(); c.arc(22, 13, 9, Math.PI, 0); c.fill();
    });
  }
  T.cone = mk(50, 60, function (c) {
    c.fillStyle = '#1C2233'; rr(c, 4, 50, 42, 8, 3); c.fill(); c.fillStyle = '#FF7A1F'; c.beginPath(); c.moveTo(25, 4); c.lineTo(40, 52); c.lineTo(10, 52); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(21, 18); c.lineTo(29, 18); c.lineTo(32, 28); c.lineTo(18, 28); c.closePath(); c.fill(); c.beginPath(); c.moveTo(16, 36); c.lineTo(34, 36); c.lineTo(36, 44); c.lineTo(14, 44); c.closePath(); c.fill();
  });
  T.barrier = mk(160, 74, function (c) {
    c.fillStyle = '#1C2233'; c.fillRect(18, 38, 8, 34); c.fillRect(134, 38, 8, 34);
    c.save(); rr(c, 6, 10, 148, 30, 6); c.clip(); c.fillStyle = '#fff'; c.fillRect(0, 0, 160, 60); c.fillStyle = '#E94E4E';
    for (var i = -2; i < 12; i++) { c.beginPath(); c.moveTo(i * 22, 50); c.lineTo(i * 22 + 12, 50); c.lineTo(i * 22 + 32, 0); c.lineTo(i * 22 + 20, 0); c.closePath(); c.fill(); } c.restore();
    c.shadowColor = '#FFB020'; c.shadowBlur = 12; c.fillStyle = '#FFB020'; c.beginPath(); c.arc(80, 6, 5, 0, 7); c.fill();
  });
  T.bolt = mk(64, 72, function (c) {
    var g = c.createRadialGradient(32, 36, 0, 32, 36, 32); g.addColorStop(0, 'rgba(69,237,209,.55)'); g.addColorStop(1, 'rgba(69,237,209,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 72);
    c.fillStyle = MINT; c.beginPath(); c.arc(32, 36, 22, 0, 7); c.fill(); c.fillStyle = '#0F172A'; c.beginPath(); c.moveTo(35, 20); c.lineTo(23, 38); c.lineTo(31, 38); c.lineTo(28, 52); c.lineTo(41, 33); c.lineTo(33, 33); c.closePath(); c.fill();
  });
  function billTex(txt, col, fg) {
    return mk(260, 190, function (c) {
      c.fillStyle = '#1C2233'; c.fillRect(40, 100, 10, 90); c.fillRect(210, 100, 10, 90);
      c.fillStyle = col; rr(c, 6, 8, 248, 100, 10); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; rr(c, 6, 8, 248, 100, 10); c.stroke();
      c.fillStyle = fg; c.font = '700 34px "Inter Tight", Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt[0], 130, 46); c.font = '600 17px Inter, system-ui, sans-serif'; c.globalAlpha = .85; c.fillText(txt[1], 130, 82);
    });
  }
  function jeevesTex(accent, label, burger) {
    return mk(200, 420, function (c) {
      c.fillStyle = '#10131C'; rr(c, 34, 392, 30, 24, 8); c.fill(); rr(c, 136, 392, 30, 24, 8); c.fill();
      var g = c.createLinearGradient(0, 336, 0, 394); g.addColorStop(0, '#F7F9FC'); g.addColorStop(1, '#C5CCD9'); c.fillStyle = g; rr(c, 16, 336, 168, 58, 12); c.fill();
      c.fillStyle = '#1B2A57'; rr(c, 16, 376, 168, 12, 5); c.fill();
      c.shadowColor = accent; c.shadowBlur = 14; c.fillStyle = accent; rr(c, 66, 362, 68, 7, 3.5); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#1B2A57'; c.font = '700 17px "Inter Tight", Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(label, 100, 356);
      [22, 56, 135, 169].forEach(function (x) { var pg = c.createLinearGradient(x, 0, x + 9, 0); pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(1, '#BAC3D2'); c.fillStyle = pg; rr(c, x, 64, 9, 276, 3); c.fill(); });
      [132, 226, 310].forEach(function (y) {
        var tg = c.createLinearGradient(0, y, 0, y + 16); tg.addColorStop(0, '#2B3F7D'); tg.addColorStop(1, '#142048'); c.fillStyle = tg; rr(c, 14, y, 172, 16, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 18, y + 1.5, 164, 3, 1.5); c.fill();
      });
      c.fillStyle = '#E7B873'; rr(c, 34, 276, 58, 34, 5); c.fill(); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(60, 276, 6, 34);
      c.fillStyle = '#FFFFFF'; rr(c, 104, 284, 62, 26, 5); c.fill(); c.fillStyle = accent; c.fillRect(104, 292, 62, 6);
      [[52, 0], [84, 4]].forEach(function (p) { c.fillStyle = '#F4F6FA'; c.beginPath(); c.moveTo(p[0] - 11, 226 - 34 + p[1]); c.lineTo(p[0] + 11, 226 - 34 + p[1]); c.lineTo(p[0] + 8, 226); c.lineTo(p[0] - 8, 226); c.closePath(); c.fill(); c.fillStyle = accent; c.fillRect(p[0] - 10, 226 - 22 + p[1], 20, 8); c.fillStyle = '#2B3F7D'; rr(c, p[0] - 12, 226 - 38 + p[1], 24, 5, 2); c.fill(); });
      c.fillStyle = '#E7B873'; rr(c, 122, 192, 42, 34, 5); c.fill();
      if (burger) drawBurger(c, 100, 132, 86); else { c.fillStyle = accent; rr(c, 60, 100, 80, 32, 6); c.fill(); }
      var hg = c.createLinearGradient(0, 6, 0, 82); hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, '#C9D0DC'); c.fillStyle = hg; rr(c, 24, 6, 152, 76, 22); c.fill();
      c.fillStyle = '#1B2A57'; rr(c, 24, 56, 152, 12, 4); c.fill();
      c.fillStyle = '#B5BECE'; [24, 31, 38].forEach(function (y) { c.fillRect(62, y, 76, 3); });
      c.shadowColor = accent; c.shadowBlur = 12; c.fillStyle = accent; c.beginPath(); c.arc(100, 62, 4.5, 0, 7); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#FFB020'; rr(c, 12, 30, 12, 26, 6); c.fill(); rr(c, 176, 30, 12, 26, 6); c.fill();
      c.fillStyle = '#C9D0DC'; rr(c, 88, 80, 24, 10, 3); c.fill();
    });
  }
  function restoTex() {
    return mk(640, 380, function (c, w, h) {
      var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7A2E27'); g.addColorStop(1, '#4A1A1A'); c.fillStyle = g; c.fillRect(0, 40, w, h - 40);
      c.fillStyle = '#2A0F10'; c.fillRect(0, 40, w, 16);
      for (var r = 0; r < 4; r++) for (var k = 0; k < 14; k++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(k * 46 + (r % 2) * 23, 70 + r * 26, 44, 10); }
      c.shadowColor = MINT; c.shadowBlur = 26; c.fillStyle = MINT; c.font = '700 96px "Inter Tight", Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BURGER', w / 2, 100); c.shadowBlur = 0;
      c.fillStyle = '#FFE9B0'; c.font = '600 26px Inter, system-ui, sans-serif'; c.fillText('RESTAURANTE', w / 2, 160);
      var aw = c.createLinearGradient(0, 190, 0, 230);
      for (var i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#FFFFFF' : '#E94E4E'; c.fillRect(i * 40, 190, 40, 46); }
      c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, 236, w, 10);
      c.fillStyle = '#FFE0A0'; c.globalAlpha = .95; c.fillRect(40, 256, 200, 100); c.fillRect(400, 256, 200, 100); c.globalAlpha = 1;
      c.fillStyle = '#1B1210'; rr(c, 262, 250, 116, h - 250, 8); c.fill(); c.fillStyle = '#FFD98A'; c.globalAlpha = .75; rr(c, 272, 262, 96, h - 275, 6); c.fill(); c.globalAlpha = 1;
      drawBurger(c, 140, 350, 70); drawBurger(c, 500, 350, 70);
    });
  }
  function archTex() {
    return mk(400, 130, function (c, w, h) {
      c.fillStyle = '#E8EBF2'; rr(c, 6, 20, 16, 110, 4); c.fill(); rr(c, w - 22, 20, 16, 110, 4); c.fill();
      c.save(); rr(c, 6, 6, w - 12, 52, 8); c.clip(); c.fillStyle = '#fff'; c.fillRect(0, 0, w, 60);
      for (var r = 0; r < 3; r++) for (var k = 0; k < 24; k++) if ((r + k) % 2) { c.fillStyle = '#0F172A'; c.fillRect(k * (w / 24), r * 18 + 4, w / 24, 18); } c.restore();
      c.fillStyle = MINT; rr(c, w / 2 - 54, 20, 108, 28, 8); c.fill(); c.fillStyle = '#0F172A'; c.font = '700 22px "Inter Tight", Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('META', w / 2, 35);
    });
  }
  var CAR_COLORS = ['#D9DCE3', '#2C323F', '#C94B4B', '#3B7DD8', '#F2B84B', '#6B7280', '#4FA67A', '#8A63D2'];
  var skyline = [];
  function buildSkyline() {
    var R = mulberry(11);
    [['#2D3270', 90, .95], ['#1D2252', 130, 1], ['#11153A', 170, 1]].forEach(function (L, li) {
      skyline[li] = mk(1200, L[1] + 40, function (c, w, h) {
        c.fillStyle = L[0]; var x = 0;
        while (x < w) { var bw = 40 + R() * 80, bh = 20 + R() * L[1]; c.fillRect(x, h - bh, bw, bh); if (li && R() < .5) { c.fillRect(x + bw * .4, h - bh - 14, 3, 14); }
          if (li === 2) for (var k = 0; k < bw / 14; k++) for (var r = 0; r < bh / 18; r++) if (R() < .22) { c.fillStyle = R() < .7 ? 'rgba(255,217,138,.8)' : 'rgba(159,245,228,.7)'; c.fillRect(x + 6 + k * 14, h - bh + 8 + r * 18, 5, 7); c.fillStyle = L[0]; }
          x += bw + R() * 6; }
      });
    });
  }
  var texBuilt = false;
  function buildTextures() {
    if (texBuilt) return; texBuilt = true;
    var R = mulberry(5);
    T.bld = []; for (var i = 0; i < 12; i++) T.bld.push(bldTex(R, 1.3 + R() * 2.2));
    T.lampL = lampTex(-1); T.lampR = lampTex(1);
    T.car = CAR_COLORS.map(function (c, i) { return carTex(c, i % 4 === 3); });
    T.sideL = CAR_COLORS.map(function (c) { return sideCarTex(c); }); T.sideR = T.sideL.map(flip);
    T.pedA = ['#E94E4E', '#45B8EC', '#F2B84B', '#8A63D2'].map(function (c) { return [pedTex(c, 0), pedTex(c, 1)]; });
    T.pedB = T.pedA.map(function (p) { return [flip(p[0]), flip(p[1])]; });
    T.bill = [billTex(['JEEVES', 'Entregas sin pausas'], MINT, '#0F172A'), billTex(['CAFÉ', 'Abierto todo el día'], '#F2B84B', '#2A1A00'), billTex(['PIZZA', 'Calientita'], '#E94E4E', '#fff'), billTex(['TECH', 'Hecho en México'], '#7C8CF8', '#fff')];
    T.me = jeevesTex(MINT, 'JEEVES', true);
    T.riv = [jeevesTex('#FF7A59', 'J-02', true), jeevesTex('#A78BFA', 'J-03', true), jeevesTex('#FBBF24', 'J-04', true)];
    T.resto = restoTex(); T.arch = archTex(); buildSkyline();
  }

  /* ---------- pista ---------- */
  var segs = [], isInter = {}, built = false;
  function lastY() { return segs.length ? segs[segs.length - 1].p2.world.y : 0; }
  function addSeg(curve, y) {
    var n = segs.length;
    segs.push({ i: n, p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} }, p2: { world: { y: y, z: (n + 1) * SEG }, camera: {}, screen: {} }, curve: curve, spr: [], dyn: [], cw: false, inter: false, fin: false, col: Math.floor(n / 3) % 2, clip: 0 });
  }
  function addRoad(enter, hold, leave, curve, y) {
    var sy = lastY(), ey = sy + y * SEG, tot = enter + hold + leave, n;
    for (n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(sy, ey, n / tot));
    for (n = 0; n < hold; n++) addSeg(curve, easeInOut(sy, ey, (enter + n) / tot));
    for (n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(sy, ey, (enter + hold + n) / tot));
  }
  var movers = [], rivals = [];
  function put(i, o) { if (i >= 0 && i < segs.length) segs[i].spr.push(o); return o; }
  function mover(e) { e.seg = null; movers.push(e); relocate(e); return e; }
  function segAt(z) { return segs[Math.min(segs.length - 1, Math.max(0, Math.floor(z / SEG)))]; }
  function relocate(e) { var s = segAt(e.z); if (s !== e.seg) { if (e.seg) { var k = e.seg.dyn.indexOf(e); if (k >= 0) e.seg.dyn.splice(k, 1); } s.dyn.push(e); e.seg = s; } }

  function build() {
    buildTextures();
    var R = mulberry(20261027), i, k;
    segs = []; movers = []; rivals = []; isInter = {};
    addRoad(0, 70, 0, 0, 0);
    while (segs.length < N - 150) {
      var q = R(), hs = lastY() > 24 * SEG ? -1 : lastY() < -4 * SEG ? 1 : (R() < .5 ? -1 : 1);
      if (q < .28) addRoad(18 + (R() * 20 | 0), 30 + (R() * 40 | 0), 18 + (R() * 20 | 0), 0, 0);
      else if (q < .66) addRoad(26, 36 + (R() * 30 | 0), 26, (R() < .5 ? -1 : 1) * (1.4 + R() * 2.4), 0);
      else addRoad(26, 30, 26, 0, hs * (8 + (R() * 18 | 0)));
    }
    addRoad(30, 0, 30, 0, -lastY() / SEG);
    while (segs.length < N + EXTRA) addSeg(0, lastY());
    for (i = 4; i < 7; i++) segs[i].fin = true;
    for (i = N - 40; i < N - 37; i++) segs[i].fin = true;
    /* cruces y pasos de peatones */
    var inters = [], s;
    for (s = 250; s < N - 320; s += 300 + (R() * 90 | 0)) inters.push(s);
    inters.forEach(function (s0) {
      for (k = 0; k < 12; k++) { segs[s0 + k].inter = true; isInter[s0 + k] = 1; }
      for (k = -6; k < -3; k++) segs[s0 + k].cw = true;
      put(s0 - 8, { kind: 'dec', tex: T.lampL, off: -1.16, w: 330, a: 5 }); put(s0 - 8, { kind: 'dec', tex: T.lampR, off: 1.16, w: 330, a: 5 });
      for (k = 0; k < 2; k++) mover({ kind: 'cross', z: (s0 + 5.5) * SEG, off: 0, dir: k ? 1 : -1, ph: k * .5 + R() * .08, sp: .26 + R() * .06, ci: (R() * 8) | 0, ow: .62, hit: true, w: 1500 });
      for (k = 0; k < 3; k++) mover({ kind: 'ped', z: (s0 - 5) * SEG + k * 90, off: -1.1 + k * .75, vx: (k % 2 ? -1 : 1) * (.32 + R() * .1), ci: (R() * 4) | 0, ow: .11, hit: true, w: 360 });
    });
    for (s = 140; s < N - 200; s += 215 + (R() * 80 | 0)) {
      var near = false; for (k = -26; k < 26; k++) if (isInter[s + k]) near = true; if (near) continue;
      for (k = 0; k < 3; k++) segs[s + k].cw = true;
      for (k = 0; k < 2; k++) mover({ kind: 'ped', z: (s + 1) * SEG + k * 80, off: -1.0 + k * 1.2, vx: (k ? -1 : 1) * (.3 + R() * .12), ci: (R() * 4) | 0, ow: .11, hit: true, w: 360 });
    }
    /* edificios, postes, anuncios y autos estacionados */
    for (i = 6; i < N + EXTRA - 4; i += 5 + (R() * 3 | 0)) {
      var blocked = false; for (k = -3; k <= 3; k++) if (isInter[i + k]) blocked = true; if (blocked) continue;
      [-1, 1].forEach(function (side) { put(i, { kind: 'bld', tex: T.bld[(R() * 12) | 0], off: side * (1.42 + R() * .05), w: 1700 + R() * 1100, a: 0 }); });
    }
    for (i = 8; i < N + EXTRA - 4; i += 11 + (R() * 3 | 0)) {
      var b2 = false; for (k = -4; k <= 4; k++) if (isInter[i + k]) b2 = true; if (b2) continue;
      [-1, 1].forEach(function (side) { put(i, { kind: 'bld', tex: T.bld[(R() * 12) | 0], off: side * (3.7 + R() * .4), w: 2600 + R() * 1200, a: 0 }); });
    }
    for (i = 10; i < N + EXTRA; i += 14) { if (isInter[i] || isInter[i + 2] || isInter[i - 2]) continue; put(i, { kind: 'dec', tex: T.lampL, off: -1.14, w: 330, a: 5 }); put(i + 7, { kind: 'dec', tex: T.lampR, off: 1.14, w: 330, a: 5 }); }
    for (i = 60; i < N - 60; i += 70 + (R() * 30 | 0)) { if (isInter[i] || isInter[i + 5]) continue; put(i, { kind: 'dec', tex: T.bill[(R() * 4) | 0], off: (R() < .5 ? -1 : 1) * 1.95, w: 2400, a: 0 }); }
    for (i = 30; i < N - 60; i += 34 + (R() * 20 | 0)) { var side2 = R() < .5 ? -1 : 1, near2 = false; for (k = -2; k < 3; k++) if (isInter[i + k]) near2 = true; if (near2) continue; put(i, { kind: 'dec', tex: T.car[(R() * 8) | 0], off: side2 * 1.2, w: 760, a: 0 }); }
    /* obstáculos de la ruta */
    var lanePace = [.3, .4, .5, .6];
    for (k = 0; k < 4; k++) {
      var z = (120 + k * 17) * SEG;
      while (z < (N - 80) * SEG) {
        z += (36000 + R() * 26000);
        var sg = Math.floor(z / SEG); if (isInter[sg] || isInter[sg - 6] || isInter[sg + 6]) continue;
        mover({ kind: 'car', z: z, off: LANE_X[k], sp: lanePace[k] * MAXS * (.9 + R() * .2), ci: (R() * 8) | 0, ow: .44, hit: true, w: 900, a: 0 });
      }
    }
    for (z = 90 * SEG; z < (N - 90) * SEG; z += 9000 + R() * 12000) {
      sg = Math.floor(z / SEG); if (isInter[sg] || isInter[sg - 4] || isInter[sg + 4] || segs[sg].cw) continue;
      var lane = (R() * 4) | 0, kind = R() < .35 ? 'barrier' : 'cone';
      if (kind === 'barrier') put(sg, { kind: 'obs', tex: T.barrier, off: LANE_X[lane], w: 900, a: .46, hit: true, ow: .5, z: sg * SEG + 50 });
      else for (var c2 = 0; c2 < 3; c2++) put(sg + c2 * 2, { kind: 'obs', tex: T.cone, off: LANE_X[lane] + (c2 - 1) * .16, w: 300, a: 1.2, hit: true, ow: .15, z: (sg + c2 * 2) * SEG + 50 });
    }
    for (z = 70 * SEG; z < (N - 60) * SEG; z += 14000 + R() * 18000) { sg = Math.floor(z / SEG); if (isInter[sg] || segs[sg].cw) continue; put(sg, { kind: 'bolt', tex: T.bolt, off: LANE_X[(R() * 4) | 0], w: 560, a: 1.12, hit: true, ow: .3, z: sg * SEG + 50 }); }
    put(N - 40, { kind: 'arch', tex: T.arch, off: 0, w: 3800, a: .325, big: true });
    put(N - 40 + 85, { kind: 'resto', tex: T.resto, off: 0, w: 7600, a: .594, big: true });
    built = true;
  }

  /* ---------- estado ---------- */
  var ST = { mode: 'menu', t: 0, pos: 0, speed: 0, x: 0, tx: 0, sky: 0, hits: 0, bat: 1, boost: false, inv: 0, shake: 0, flash: 0, el: 0, lean: 0, finished: false, finT: 0, count: 0, lastCount: 9, rank: 1, hint: 0, endAt: 0, endShown: false };
  var RIV = [{ n: 'Rayo', c: '#FF7A59', cr: .99, lane: 0 }, { n: 'Nube', c: '#A78BFA', cr: .965, lane: 1 }, { n: 'Chispa', c: '#FBBF24', cr: .94, lane: 3 }];

  function resetRace(demo) {
    ST.pos = 0; ST.speed = 0; ST.x = .25; ST.tx = .25; ST.sky = 0; ST.hits = 0; ST.bat = 1; ST.boost = false; ST.inv = 0; ST.shake = 0; ST.flash = 0; ST.el = 0; ST.finished = false; ST.endShown = false; ST.hint = 0; ST.lean = 0;
    movers.forEach(function (m) { if (m.kind === 'rival') { var k = m.seg && m.seg.dyn.indexOf(m); if (k >= 0) m.seg.dyn.splice(k, 1); } });
    movers = movers.filter(function (m) { return m.kind !== 'rival'; }); rivals = [];
    segs.forEach(function (s) { s.spr.forEach(function (p) { if (p.kind === 'bolt') p.taken = false; }); });
    var R = mulberry(9);
    RIV.forEach(function (d, i) {
      var r = mover({ kind: 'rival', z: PZ, off: LANE_X[d.lane], vx: 0, sp: 0, cruise: d.cr * MAXS, target: LANE_X[d.lane], lt: .2, hic: 5 + R() * 6, hicT: 0, ti: i, d: d, fin: false, finT: 0, ow: .28, w: 470 });
      rivals.push(r);
    });
    if (demo) rivals.forEach(function (r) { r.cruise = MAXS * .55; });
  }

  /* ---------- sonido ---------- */
  var AC = null, master, engA, engB, engG, engF, musicG, muted = false;
  try { muted = localStorage.getItem('jx-mute') === '1'; } catch (e) {}
  function audioInit() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    AC = new Ctx(); master = AC.createGain(); master.gain.value = muted ? 0 : .8; master.connect(AC.destination);
    engA = AC.createOscillator(); engB = AC.createOscillator(); engA.type = 'sawtooth'; engB.type = 'square'; engF = AC.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 500; engG = AC.createGain(); engG.gain.value = 0;
    engA.connect(engF); engB.connect(engF); engF.connect(engG); engG.connect(master); engA.start(); engB.start();
    musicG = AC.createGain(); musicG.gain.value = 0; musicG.connect(master);
    fetch('musica.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (d) { return new Promise(function (ok, no) { AC.decodeAudioData(d, ok, no); }); }).then(function (b) {
      var s = AC.createBufferSource(); s.buffer = b; s.loop = true; s.loopStart = 8; s.loopEnd = 80; s.connect(musicG); s.start(0, 8); musicG.gain.linearRampToValueAtTime(.32, AC.currentTime + 2);
    }).catch(function () {});
  }
  function tone(f, d, type, v, f2) {
    if (!AC) return; var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v || .2, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
  }
  function sfx(n) {
    if (!AC) return;
    if (n === 'beep') tone(660, .16, 'sine', .25); if (n === 'go') tone(990, .5, 'sine', .3);
    if (n === 'hit') { tone(120, .3, 'sawtooth', .35, 40); tone(300, .12, 'square', .12, 100); }
    if (n === 'bolt') { tone(880, .12, 'sine', .22); setTimeout(function () { tone(1320, .2, 'sine', .22); }, 80); }
    if (n === 'win') [523, 659, 784, 1046, 1318].forEach(function (f, i) { setTimeout(function () { tone(f, .35, 'triangle', .26); }, i * 110); });
    if (n === 'soft') tone(620, .14, 'sine', .08);
    if (n === 'ding') { tone(1046, .5, 'sine', .14); setTimeout(function () { tone(1568, .7, 'sine', .11); }, 110); }
    if (n === 'meh') { tone(262, .35, 'triangle', .1, 233); setTimeout(function () { tone(220, .45, 'triangle', .09, 196); }, 180); }
    if (n === 'nope') { tone(330, .12, 'sine', .08); setTimeout(function () { tone(294, .16, 'sine', .08); }, 120); }
    if (n === 'end') [440, 392, 330].forEach(function (f, i) { setTimeout(function () { tone(f, .3, 'triangle', .22); }, i * 130); });
  }
  function engine(sp, on) {
    if (!AC) return; var t = AC.currentTime, f = 55 + sp * 110; engA.frequency.setTargetAtTime(f, t, .08); engB.frequency.setTargetAtTime(f * .5, t, .08);
    engF.frequency.setTargetAtTime(300 + sp * 900, t, .1); engG.gain.setTargetAtTime(on ? .035 + sp * .04 : 0, t, .1);
  }

  /* ---------- entrada ---------- */
  var ptr = null, keys = { l: 0, r: 0 }, startX = 0, startT = 0;
  function ignoreTarget(t) { return t.closest && t.closest('.joy,.turbo,.ico,.scr,.back,.rbar,.r-intro,.r-top'); }
  game.addEventListener('pointerdown', function (e) {
    if (ST.mode === 'resto' && !ignoreTarget(e.target)) { restoTap(e); return; }
    if (ignoreTarget(e.target) || (ST.mode !== 'race' && ST.mode !== 'count')) return;
    if (ptr === null) { ptr = e.pointerId; startX = e.clientX; startT = ST.tx; try { game.setPointerCapture(e.pointerId); } catch (x) {} }
  });
  game.addEventListener('pointermove', function (e) { if (e.pointerId === ptr) ST.tx = clamp(startT + (e.clientX - startX) / (game.clientWidth * .5) * 1.35, -1.25, 1.25); });
  function up(e) { if (e.pointerId === ptr) ptr = null; }
  game.addEventListener('pointerup', up); game.addEventListener('pointercancel', up);
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 1; if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 1;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Shift') { ST.boost = true; e.preventDefault(); }
    if (e.key === 'Enter' && ST.mode === 'menu' && document.activeElement === $('#name')) startRace();
  });
  window.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 0; if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 0;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Shift') ST.boost = false;
  });
  /* joystick: deslizar a los lados */
  var joy = $('#joy'), knob = joy.querySelector('.knob'), joyId = null, joyX = 0;
  function joyMove(e) {
    var r = joy.getBoundingClientRect(), max = r.width / 2 - 30, dx = clamp(e.clientX - (r.left + r.width / 2), -max, max);
    joyX = Math.abs(dx / max) < .1 ? 0 : dx / max; knob.style.transform = 'translateX(' + dx.toFixed(1) + 'px)'; joy.setAttribute('aria-valuenow', joyX.toFixed(2));
  }
  function joyEnd() { joyId = null; joyX = 0; knob.style.transform = ''; joy.classList.remove('on'); joy.setAttribute('aria-valuenow', '0'); }
  joy.addEventListener('pointerdown', function (e) { joyId = e.pointerId; joy.classList.add('on'); try { joy.setPointerCapture(e.pointerId); } catch (x) {} joyMove(e); e.preventDefault(); });
  joy.addEventListener('pointermove', function (e) { if (e.pointerId === joyId) joyMove(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { joy.addEventListener(n, function (e) { if (e.pointerId === joyId) joyEnd(); }); });
  var turboBtn = $('#turbo');
  turboBtn.addEventListener('pointerdown', function (e) { ST.boost = true; turboBtn.classList.add('hold'); try { turboBtn.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { turboBtn.addEventListener(n, function () { ST.boost = false; turboBtn.classList.remove('hold'); }); });
  var muteBtn = $('#mute');
  var muteBtns = [muteBtn, $('#muteR')];
  function paintMute() { muteBtns.forEach(function (m) { m.innerHTML = '<svg><use href="#' + (muted ? 'i-mute' : 'i-vol') + '"/></svg>'; m.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar'); }); }
  muteBtns.forEach(function (m) { m.addEventListener('click', function () { muted = !muted; try { localStorage.setItem('jx-mute', muted ? '1' : '0'); } catch (e) {} if (master) master.gain.value = muted ? 0 : .8; paintMute(); }); }); paintMute();

  /* ---------- interfaz ---------- */
  var elRank = $('#rank'), elClock = $('#clock'), elLives = $('#lives'), elToast = $('#toast'), elCount = $('#count'), elBat = $('#bat'), elHint = $('#hint');
  var dots = { me: $('.dot.me'), r: [$('.dot.r1'), $('.dot.r2'), $('.dot.r3')] }, toastT = 0;
  function toast(msg, ms) { elToast.textContent = msg; elToast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { elToast.classList.remove('on'); }, ms || 900); }
  var KEY = 'jeeves-express-records-v1';
  function records() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function saveRecord(n, t) { var l = records(); var r = { n: n, t: t, id: Date.now() }; l.push(r); l.sort(function (a, b) { return a.t - b.t; }); l = l.slice(0, 20); try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} return r.id; }
  function paintRecords(el, mine) {
    var l = records().slice(0, 5); if (!l.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<h3>Mejores tiempos de este celular</h3><ol>' + l.map(function (r) { return '<li' + (r.id === mine ? ' class="me"' : '') + '><span>' + r.n.replace(/[<>&]/g, '') + '</span><span>' + fmt(r.t) + '</span></li>'; }).join('') + '</ol>';
  }
  var nameIn = $('#name'); try { nameIn.value = localStorage.getItem('jx-name') || ''; } catch (e) {}
  function myName() { var n = (nameIn.value || '').trim().slice(0, 12) || 'Jugador'; try { localStorage.setItem('jx-name', nameIn.value.trim()); } catch (e) {} return n; }
  function paintLives() { var s = elLives.children; for (var i = 0; i < 3; i++) s[i].setAttribute('class', i < 3 - ST.hits ? 'on' : ''); }

  function startRace() {
    audioInit(); myName(); joyEnd(); resetRace(false); R = null; elResto.hidden = true; lofi(false); ST.mode = 'count'; ST.count = 3.3; ST.lastCount = 9;
    $('#scrStart').hidden = true; $('#scrEnd').hidden = true; $('#hud').hidden = false; paintLives(); elHint.classList.remove('off'); elClock.textContent = '0:00.0';
    if (musicG && AC) musicG.gain.setTargetAtTime(.22, AC.currentTime, .4);
  }
  $('#play').addEventListener('click', startRace); $('#again').addEventListener('click', startRace);

  /* ---------- reglas ---------- */
  function nearestBlock(z, off, dist, half, self) {
    var best = null, a = Math.floor(z / SEG), b = Math.min(segs.length - 1, Math.floor((z + dist) / SEG)), i, j, s, e, d;
    for (i = a; i <= b; i++) {
      s = segs[i];
      for (j = 0; j < s.spr.length; j++) { e = s.spr[j]; if (!e.hit || e.taken || e.kind === 'bolt') continue; d = e.z - z; if (d > 0 && d < dist && Math.abs(e.off - off) < half + e.ow / 2 && (!best || d < best.d)) best = { d: d, sp: 0 }; }
      for (j = 0; j < s.dyn.length; j++) { e = s.dyn[j]; if (!e.hit || e === self) continue; if ((e.kind === 'cross' || e.kind === 'ped') && Math.abs(e.off) > 1.25) continue; d = e.z - z; if (d > 0 && d < dist && Math.abs(e.off - off) < half + e.ow / 2 && (!best || d < best.d)) best = { d: d, sp: e.sp || 0 }; }
    }
    return best;
  }
  function updateMovers(dt) {
    var t = ST.t;
    movers.forEach(function (e) {
      if (e.kind === 'car') { e.z += e.sp * dt; relocate(e); }
      else if (e.kind === 'ped') { e.off += e.vx * dt; if (e.off > 1.2) { e.off = 1.2; e.vx = -Math.abs(e.vx); } if (e.off < -1.2) { e.off = -1.2; e.vx = Math.abs(e.vx); } }
      else if (e.kind === 'cross') { var p = (t * e.sp + e.ph) % 1; e.off = e.dir * (-3.4 + 6.8 * p); }
    });
  }
  function updateRival(r, dt, playerZ, racing) {
    r.lt -= dt;
    if (r.lt <= 0) {
      r.lt = .22 + Math.random() * .15; var bestL = r.off, bestS = -1e9;
      for (var i = 0; i < 4; i++) { var b = nearestBlock(r.z, LANE_X[i], 5600, .3, r), free = b ? b.d : 5600, sc = free - Math.abs(LANE_X[i] - r.off) * 1100; if (sc > bestS) { bestS = sc; bestL = LANE_X[i]; } }
      r.target = bestL;
    }
    r.off += clamp(r.target - r.off, -2.1 * dt, 2.1 * dt);
    var want = r.cruise, gap = r.z - playerZ;
    if (racing) { if (gap > 8000) want *= .92; else if (gap < -4500) want *= 1.12; }
    r.hic -= dt; if (r.hic <= 0 && racing && !r.fin) { r.hic = 9 + Math.random() * 7; r.hicT = .6; }
    if (r.hicT > 0) { r.hicT -= dt; want = MAXS * .3; }
    var blk = nearestBlock(r.z, r.off, 1900, .3, r); if (blk && blk.d < 1900) want = Math.min(want, blk.sp * .95 + Math.max(0, blk.d - 700) * 1.2);
    if (r.fin) want = 0;
    if (!racing) want = ST.mode === 'menu' ? want : 0;
    r.sp += clamp(want - r.sp, -MAXS * 1.1 * dt, MAXS * .5 * dt);
    r.z += r.sp * dt; relocate(r);
    if (!r.fin && racing && r.z >= FINISH) { r.fin = true; r.finT = ST.el; }
  }
  function hitPlayer(e, push) {
    if (ST.inv > 0) return; ST.inv = 1.15; ST.hits++; ST.speed = Math.min(ST.speed, MAXS * .16); ST.shake = 1; ST.flash = .6; ST.x += clamp((ST.x - e.off) * 4, -.12, .12) + (push || 0); ST.tx = ST.x;
    paintLives(); sfx('hit'); toast(ST.hits >= 3 ? 'La hamburguesa se cayó' : '¡Choque!', 800);
    if (navigator.vibrate) { try { navigator.vibrate(80); } catch (x) {} }
  }
  function updatePlayer(dt) {
    var pz = ST.pos + PZ, sp = ST.speed / MAXS, seg = segAt(pz), racing = ST.mode === 'race';
    var cap = MAXS;
    if (ST.finished) cap = 0;
    else if (racing) { if (ST.boost && ST.bat > 0) { cap = MAXS * 1.3; ST.bat = Math.max(0, ST.bat - dt / 2.6); } else ST.bat = Math.min(1, ST.bat + dt / 10); } else cap = 0;
    if (Math.abs(ST.x) > 1.04 && !ST.finished) cap = Math.min(cap, MAXS * .42);
    if (ST.speed < cap) ST.speed = Math.min(cap, ST.speed + MAXS * (ST.boost ? .9 : .55) * dt); else ST.speed = Math.max(cap, ST.speed - MAXS * (ST.finished ? .5 : .9) * dt);
    ST.pos += ST.speed * dt;
    if (keys.l || keys.r) ST.tx = clamp(ST.tx + (keys.r - keys.l) * 2.6 * dt, -1.25, 1.25);
    if (joyX && !ST.finished) { ST.tx = clamp(ST.tx + joyX * 2.7 * dt, -1.25, 1.25); if (Math.abs(ST.tx - ST.x) > .35) ST.tx = ST.x + Math.sign(ST.tx - ST.x) * .35; }
    if (ST.finished) ST.tx = lerp(ST.tx, 0, dt * 2);
    var rate = 3.6 * dt * (.5 + .5 * clamp(sp, 0, 1));
    var before = ST.x; ST.x += clamp(ST.tx - ST.x, -rate, rate); ST.x -= dt * 2 * sp * sp * seg.curve * .32; ST.x = clamp(ST.x, -1.6, 1.6);
    ST.lean = lerp(ST.lean, clamp((ST.x - before) / Math.max(dt, .001) * .06, -1, 1), .2);
    ST.sky += seg.curve * ST.speed * dt / SEG;
    if (ST.inv > 0) ST.inv -= dt; ST.shake = Math.max(0, ST.shake - dt * 2.4); ST.flash = Math.max(0, ST.flash - dt * 1.5);
    if (!racing) return;
    var zp = ST.pos + PZ, i, j, s, e;
    for (i = 0; i < 3; i++) {
      s = segs[Math.min(segs.length - 1, seg.i + i)];
      for (j = 0; j < s.spr.length; j++) {
        e = s.spr[j]; if (!e.hit || e.taken || Math.abs(zp - e.z) > SEG * 1.1 || Math.abs(ST.x - e.off) > (.24 + e.ow) / 2) continue;
        if (e.kind === 'bolt') { e.taken = true; ST.bat = Math.min(1, ST.bat + .4); sfx('bolt'); toast('+ Turbo', 600); } else hitPlayer(e);
      }
      for (j = 0; j < s.dyn.length; j++) {
        e = s.dyn[j]; if (!e.hit || e.kind === 'rival') continue;
        if ((e.kind === 'cross' || e.kind === 'ped') && Math.abs(e.off) > 1.3) continue;
        if (Math.abs(zp - e.z) < (e.kind === 'car' ? SEG * 1.2 : SEG * .9) && Math.abs(ST.x - e.off) < (.24 + e.ow) / 2) hitPlayer(e);
      }
    }
    if (zp >= FINISH && !ST.finished) finish();
  }
  var standings = [];
  function finish() {
    ST.finished = true; ST.finT = ST.el; ST.endAt = ST.t + 2.1; ST.boost = false; turboBtn.classList.remove('hold');
    var all = [{ n: myName(), c: MINT, t: ST.el, me: true }];
    rivals.forEach(function (r) { var est = r.fin ? r.finT : ST.el + Math.max(.2, (FINISH - r.z) / Math.max(r.sp, MAXS * .6)); all.push({ n: r.d.n, c: r.d.c, t: est, est: !r.fin }); });
    all.sort(function (a, b) { return a.t - b.t; }); standings = all; ST.rank = all.findIndex(function (a) { return a.me; }) + 1;
    toast(ST.rank === 1 ? '¡Entregada!' : '¡Meta!', 1600); sfx(ST.rank === 1 ? 'win' : 'end');
  }
  function showEnd() {
    ST.endShown = true; ST.mode = 'end'; $('#hud').hidden = true; elResto.hidden = true; $('#scrEnd').hidden = false; engine(0, false);
    var win = ST.rank === 1, t = ST.finT, id = saveRecord(myName(), t);
    $('#t2').textContent = win ? '¡Clientes felices!' : 'Llegaste ' + ord(ST.rank);
    $('#endLead').textContent = win ? 'Llegaste primero en ' + fmt(t) + '. Los clientes quedaron felices y te dejaron $' + (R ? R.tips : 0) + ' de propina.' : 'Tu tiempo: ' + fmt(t) + '. Los clientes se enojaron por la espera. Llega primero para que queden felices.';
    $('#podium').innerHTML = standings.map(function (a) { return '<li' + (a.me ? ' class="me"' : '') + '><i style="background:' + a.c + '"></i><span>' + a.n.replace(/[<>&]/g, '') + '</span><time>' + (a.est ? '≈ ' : '') + fmt(a.t) + '</time></li>'; }).join('');
    paintRecords($('#recEnd'), id); confetti(win);
    $('#again').textContent = 'Otra carrera';
  }
  var fxRun = 0;
  function confetti(big) {
    var fx = $('#fx'), c = fx.getContext('2d'), d = Math.min(2, window.devicePixelRatio || 1); fx.width = fx.clientWidth * d; fx.height = fx.clientHeight * d; var ps = [], i, cols = [MINT, '#fff', '#FFB020', '#FF7A59', '#A78BFA'];
    var n = reduce ? 0 : big ? 150 : 40; for (i = 0; i < n; i++) ps.push({ x: Math.random() * fx.width, y: -Math.random() * fx.height * .6, vx: (Math.random() - .5) * 2 * d, vy: (2 + Math.random() * 3) * d, r: Math.random() * 6, vr: (Math.random() - .5) * .3, s: (5 + Math.random() * 6) * d, c: cols[i % 5] });
    var run = ++fxRun, t0 = performance.now();
    (function f() { if (run !== fxRun) return; c.clearRect(0, 0, fx.width, fx.height); var alive = 0; ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.vy += .03 * d; p.r += p.vr; if (p.y < fx.height + 20) alive++; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }); if (alive && performance.now() - t0 < 6000) requestAnimationFrame(f); else c.clearRect(0, 0, fx.width, fx.height); })();
  }

  /* ---------- dibujo ---------- */
  function project(p, camX, camY, camZ) {
    var cam = p.camera, scr = p.screen; cam.x = (p.world.x || 0) - camX; cam.y = (p.world.y || 0) - camY; cam.z = (p.world.z || 0) - camZ;
    scr.scale = CAM_D / cam.z; scr.x = Math.round(W / 2 + scr.scale * cam.x * KX); scr.y = Math.round(HZ - scr.scale * cam.y * KY); scr.w = Math.round(scr.scale * ROAD * KX);
  }
  function poly(x1, y1, x2, y2, x3, y3, x4, y4, col) { cx.fillStyle = col; cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.lineTo(x3, y3); cx.lineTo(x4, y4); cx.closePath(); cx.fill(); }
  var skyG = null;
  function drawSky() {
    if (!skyG) { skyG = cx.createLinearGradient(0, 0, 0, HZ + 4); skyG.addColorStop(0, '#0A1030'); skyG.addColorStop(.38, '#2A2F73'); skyG.addColorStop(.72, '#B2578A'); skyG.addColorStop(1, '#F7B287'); }
    cx.fillStyle = skyG; cx.fillRect(0, 0, W, HZ + 4);
    var sx = W * .5 - ((ST.sky * 1.2) % (W * 2)) * .2, g = cx.createRadialGradient(sx, HZ, 0, sx, HZ, W * .7); g.addColorStop(0, 'rgba(255,225,170,.8)'); g.addColorStop(.25, 'rgba(255,170,140,.35)'); g.addColorStop(1, 'rgba(255,170,140,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, HZ + 4);
    cx.fillStyle = 'rgba(255,255,255,.7)'; for (var i = 0; i < 30; i++) { var px = (i * 97.3) % W, py = (i * 53.7) % (HZ * .45); cx.fillRect(px, py, 1.4, 1.4); }
    [1.2, 2.4, 4.2].forEach(function (f, li) {
      var img = skyline[li], k = DPR > 1.5 ? .5 : .55, iw = img.width * k, ih = img.height * k, off = -((ST.sky * f) % iw); if (off > 0) off -= iw;
      for (var x = off; x < W; x += iw) cx.drawImage(img, x, HZ - ih + 3, iw, ih);
    });
    cx.fillStyle = '#10153A'; cx.fillRect(0, HZ, W, 2);
  }
  function drawPlayerLike(tex, x, y, w, lean, alpha) {
    var h = w * tex.height / tex.width; cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha; cx.translate(x, y); cx.rotate(lean); cx.drawImage(tex, -w / 2, -h, w, h); cx.restore();
  }
  function spriteDraw(tex, x, y, destW, anchor, clipY, fade) {
    var destH = destW * tex.height / tex.width; if (destW < 1.5) return;
    var dx = anchor < 0 ? x - destW : anchor > 0 ? x : x - destW / 2, clipH = clipY ? Math.max(0, y - clipY) : 0;
    if (clipH >= destH) return; cx.globalAlpha = fade;
    cx.drawImage(tex, 0, 0, tex.width, tex.height - tex.height * clipH / destH, dx, y - destH, destW, destH - clipH); cx.globalAlpha = 1;
  }
  function render() {
    if (R && R.active) { renderResto(); return; }
    var baseSeg = segAt(ST.pos), basePct = (ST.pos % SEG) / SEG, pz = ST.pos + PZ, pSeg = segAt(pz), pPct = (pz % SEG) / SEG;
    var pY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct), maxY = H, dx = -(baseSeg.curve * basePct), xo = 0, n, s, C;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sh = reduce ? 0 : ST.shake; if (sh > 0) cx.translate((Math.random() - .5) * 14 * sh, (Math.random() - .5) * 14 * sh);
    drawSky();
    for (n = 0; n < DRAW; n++) {
      var si = baseSeg.i + n; if (si >= segs.length) break; s = segs[si]; s.clip = maxY;
      project(s.p1, ST.x * ROAD - xo, pY + CAM_H, ST.pos); project(s.p2, ST.x * ROAD - xo - dx, pY + CAM_H, ST.pos); xo += dx; dx += s.curve;
      if (s.p1.camera.z <= CAM_D || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxY) continue;
      var p1 = s.p1.screen, p2 = s.p2.screen, light = !s.col, x1 = p1.x, y1 = p1.y, w1 = p1.w, x2 = p2.x, y2 = p2.y, w2 = p2.w;
      cx.fillStyle = s.inter ? (light ? '#303549' : '#2B3043') : (light ? '#3B4359' : '#353C52'); cx.fillRect(0, y2, W, y1 - y2);
      if (!s.inter) { var r1 = w1 / 9, r2 = w2 / 9, rc = light ? '#D5DBE8' : '#6E7893'; poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rc); poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rc); }
      poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, light ? '#303549' : '#2B3043');
      if (!s.inter && light) { var lw1 = w1 / 34, lw2 = w2 / 34, lx1 = w1 * 2 / 4, lx2 = w2 * 2 / 4; for (var l = 1; l < 4; l++) { var cl = l - 2; poly(x1 + cl * lx1 - lw1, y1, x1 + cl * lx1 + lw1, y1, x2 + cl * lx2 + lw2, y2, x2 + cl * lx2 - lw2, y2, 'rgba(232,235,242,.85)'); } }
      if (s.cw) for (var b = -9; b <= 9; b += 2) { var f1 = b / 10, g1 = (b + 1) / 10; poly(x1 + f1 * w1, y1, x1 + g1 * w1 * .86 + f1 * w1 * .14, y1, x2 + g1 * w2 * .86 + f1 * w2 * .14, y2, x2 + f1 * w2, y2, 'rgba(240,243,250,.92)'); }
      if (s.fin) for (var q = 0; q < 12; q++) { var a1 = -1 + q / 6, a2 = -1 + (q + 1) / 6, on = (q + s.i) % 2; if (on) poly(x1 + a1 * w1, y1, x1 + a2 * w1, y1, x2 + a2 * w2, y2, x2 + a1 * w2, y2, '#F4F6FA'); else poly(x1 + a1 * w1, y1, x1 + a2 * w1, y1, x2 + a2 * w2, y2, x2 + a1 * w2, y2, '#0F172A'); }
      var fa = 1 - 1 / Math.exp(Math.pow(n / DRAW, 2) * 4.4); if (fa > .01) { cx.globalAlpha = fa; cx.fillStyle = HAZE; cx.fillRect(0, y2, W, y1 - y2); cx.globalAlpha = 1; }
      maxY = y1;
    }
    var tm = ST.t;
    for (n = Math.min(DRAW, segs.length - baseSeg.i) - 1; n > 0; n--) {
      s = segs[baseSeg.i + n]; var fog = 1 - 1 / Math.exp(Math.pow(n / DRAW, 2) * 4.4), fade = 1 - fog * .85, sc = s.p1.screen.scale; if (!sc || s.p1.camera.z <= CAM_D) continue;
      var i, e;
      for (i = 0; i < s.spr.length; i++) {
        e = s.spr[i]; if (e.taken) continue; var sx = s.p1.screen.x + sc * e.off * ROAD * KX, sy = s.p1.screen.y, dw = sc * e.w * KX;
        if (e.kind === 'bolt') sy -= Math.abs(Math.sin(tm * 4 + e.off * 3)) * dw * .16;
        spriteDraw(e.tex, sx, sy, dw, e.kind === 'bld' ? (e.off < 0 ? -1 : 1) : 0, s.clip, fade);
      }
      for (i = 0; i < s.dyn.length; i++) {
        e = s.dyn[i]; var pc = (e.z % SEG) / SEG, sc2 = lerp(s.p1.screen.scale, s.p2.screen.scale, pc), ex = lerp(s.p1.screen.x, s.p2.screen.x, pc) + sc2 * e.off * ROAD * KX, ey = lerp(s.p1.screen.y, s.p2.screen.y, pc), ew = sc2 * e.w * KX, tex;
        if (e.kind === 'car') tex = T.car[e.ci]; else if (e.kind === 'rival') tex = T.riv[e.ti]; else if (e.kind === 'cross') { tex = (e.dir > 0 ? T.sideR : T.sideL)[e.ci]; if (Math.abs(e.off) > 3.2) continue; }
        else tex = (e.vx > 0 ? T.pedA : T.pedB)[e.ci][Math.floor(tm * 6 + e.z) % 2];
        spriteDraw(tex, ex, ey, e.kind === 'rival' ? ew * .98 : ew, 0, s.clip, fade);
      }
    }
    var spPct = ST.speed / MAXS, bob = Math.sin(tm * 38) * 1.6 * spPct * H / 700, pw = CAM_D / PZ * 470 * KX, py = HZ + KY + bob;
    if (!(ST.inv > 0 && Math.floor(tm * 16) % 2 === 0)) {
      if (ST.boost && ST.bat > 0 && ST.mode === 'race') { var fg = cx.createRadialGradient(W / 2, py - 6, 0, W / 2, py - 6, pw * 1.2); fg.addColorStop(0, 'rgba(69,237,209,.7)'); fg.addColorStop(1, 'rgba(69,237,209,0)'); cx.fillStyle = fg; cx.fillRect(W / 2 - pw * 1.3, py - pw, pw * 2.6, pw * 1.6); }
      cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(W / 2, py - 2, pw * .5, pw * .09, 0, 0, 7); cx.fill();
      drawPlayerLike(T.me, W / 2, py, pw, ST.lean * .08);
    }
    if ((ST.boost && ST.bat > 0 && ST.mode === 'race') || spPct > 1.05) {
      cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 1.5; cx.beginPath();
      for (var k = 0; k < 16; k++) { var ang = (k / 16) * 6.283 + Math.floor(tm * 20) * .7, r0 = W * (.38 + ((k * 37) % 10) * .03), r1 = r0 + W * .18; cx.moveTo(W / 2 + Math.cos(ang) * r0, HZ + 80 + Math.sin(ang) * r0 * 1.2); cx.lineTo(W / 2 + Math.cos(ang) * r1, HZ + 80 + Math.sin(ang) * r1 * 1.2); }
      cx.stroke();
    }
    if (ST.finished && ST.mode === 'race') { var fo = clamp((ST.t - (ST.endAt - .9)) / .9, 0, 1); if (fo > 0) { cx.fillStyle = 'rgba(5,7,13,' + fo + ')'; cx.fillRect(0, 0, W, H); } }
    if (ST.flash > 0) { cx.fillStyle = 'rgba(233,78,78,' + ST.flash * .35 + ')'; cx.fillRect(0, 0, W, H); }
    var vg = cx.createRadialGradient(W / 2, H * .55, W * .45, W / 2, H * .55, H * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
  }

  /* ---------- restaurante (segunda parte, con calma) ---------- */
  function drawDrink(c, x, base, w) {
    var h = w * 1.5; c.save(); c.translate(x, base);
    c.fillStyle = '#F4F6FA'; c.beginPath(); c.moveTo(-w * .42, -h * .86); c.lineTo(w * .42, -h * .86); c.lineTo(w * .32, 0); c.lineTo(-w * .32, 0); c.closePath(); c.fill();
    c.fillStyle = MINT; c.beginPath(); c.moveTo(-w * .385, -h * .58); c.lineTo(w * .385, -h * .58); c.lineTo(w * .36, -h * .4); c.lineTo(-w * .36, -h * .4); c.closePath(); c.fill();
    c.fillStyle = '#D3D9E4'; rr(c, -w * .5, -h * .97, w, h * .13, w * .06); c.fill();
    c.strokeStyle = '#E94E4E'; c.lineWidth = w * .1; c.lineCap = 'round'; c.beginPath(); c.moveTo(w * .06, -h * .96); c.lineTo(w * .18, -h * 1.26); c.lineTo(w * .4, -h * 1.32); c.stroke();
    c.restore();
  }
  function drawFries(c, x, base, w) {
    var h = w * .9; c.save(); c.translate(x, base);
    c.fillStyle = '#F6C445'; for (var i = 0; i < 6; i++) { rr(c, -w * .33 + i * w * .132 - w * .05, -h * 1.32 + ((i * 7) % 3) * w * .08, w * .1, h * .9, w * .03); c.fill(); }
    c.fillStyle = '#E94E4E'; c.beginPath(); c.moveTo(-w * .46, -h * .72); c.quadraticCurveTo(0, -h * .5, w * .46, -h * .72); c.lineTo(w * .34, 0); c.lineTo(-w * .34, 0); c.closePath(); c.fill();
    c.fillStyle = '#FFC83D'; c.beginPath(); c.arc(0, -h * .32, w * .1, 0, 7); c.fill();
    c.restore();
  }
  function drawItem(c, k, x, base, w) { if (k === 'burger') drawBurger(c, x, base, w); else if (k === 'drink') drawDrink(c, x, base, w * .62); else drawFries(c, x, base, w * .8); }
  function jeevesFrontTex(accent) {
    return mk(200, 420, function (c) {
      c.fillStyle = '#10131C'; rr(c, 34, 392, 30, 24, 8); c.fill(); rr(c, 136, 392, 30, 24, 8); c.fill();
      var g = c.createLinearGradient(0, 336, 0, 394); g.addColorStop(0, '#F7F9FC'); g.addColorStop(1, '#C5CCD9'); c.fillStyle = g; rr(c, 16, 336, 168, 58, 12); c.fill();
      c.fillStyle = '#1B2A57'; rr(c, 16, 376, 168, 12, 5); c.fill();
      c.shadowColor = accent; c.shadowBlur = 14; c.fillStyle = accent; rr(c, 66, 362, 68, 7, 3.5); c.fill(); c.shadowBlur = 0;
      c.fillStyle = '#1B2A57'; c.font = '700 17px "Inter Tight", Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('JEEVES', 100, 356);
      [22, 56, 135, 169].forEach(function (x) { var pg = c.createLinearGradient(x, 0, x + 9, 0); pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(1, '#BAC3D2'); c.fillStyle = pg; rr(c, x, 64, 9, 276, 3); c.fill(); });
      [132, 226, 310].forEach(function (y) {
        var tg = c.createLinearGradient(0, y, 0, y + 16); tg.addColorStop(0, '#2B3F7D'); tg.addColorStop(1, '#142048'); c.fillStyle = tg; rr(c, 14, y, 172, 16, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,.3)'; rr(c, 18, y + 1.5, 164, 3, 1.5); c.fill();
      });
      var hg = c.createLinearGradient(0, 6, 0, 82); hg.addColorStop(0, '#FFFFFF'); hg.addColorStop(1, '#C9D0DC'); c.fillStyle = hg; rr(c, 24, 6, 152, 76, 22); c.fill();
      c.fillStyle = '#0B1230'; rr(c, 40, 15, 120, 48, 17); c.fill();
      c.fillStyle = 'rgba(255,255,255,.09)'; rr(c, 46, 18, 108, 9, 4.5); c.fill();
      c.fillStyle = '#1B2A57'; rr(c, 24, 68, 152, 8, 4); c.fill();
      c.fillStyle = '#FFB020'; rr(c, 12, 30, 12, 26, 6); c.fill(); rr(c, 176, 30, 12, 26, 6); c.fill();
      c.fillStyle = '#C9D0DC'; rr(c, 88, 80, 24, 10, 3); c.fill();
    });
  }
  function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .9); c.bezierCurveTo(x - s * 1.4, y, x - s * .6, y - s * .9, x, y - s * .25); c.bezierCurveTo(x + s * .6, y - s * .9, x + s * 1.4, y, x, y + s * .9); c.fill(); }

  var RW = 100, RH = 150, RS = 4, ROX = 0, ROY = 0, R = null;
  var elResto = $('#resto'), elRHint = $('#rHint'), elRCount = $('#rCount'), elRTip = $('#rTip'), elRIntro = $('#rIntro'), elRBar = $('.rbar');
  var itemBtns = [].slice.call(document.querySelectorAll('.rbar .item'));
  var PEOPLE = [
    { skin: '#F1C7A5', hair: '#2B1B12', hs: 0, shirt: '#E94E4E' }, { skin: '#C98E62', hair: '#121212', hs: 1, shirt: '#45B8EC' },
    { skin: '#E8B48C', hair: '#B8743A', hs: 3, shirt: '#F2B84B' }, { skin: '#8D5A3B', hair: '#121212', hs: 2, shirt: '#8A63D2' },
    { skin: '#F6D3B3', hair: '#5A3420', hs: 1, shirt: '#3FBF8F' }, { skin: '#B97A52', hair: '#2B1B12', hs: 0, shirt: '#F08BB0' }
  ];
  var TABLES = [
    { x: 27, y: 64, seats: [{ p: 0, dx: 0, want: 'burger' }] },
    { x: 73, y: 64, seats: [{ p: 1, dx: -5, want: 'drink' }, { p: 2, dx: 5, want: 'drink' }] },
    { x: 27, y: 108, seats: [{ p: 3, dx: -5, want: 'burger' }, { p: 4, dx: 5, want: 'fries' }] },
    { x: 73, y: 108, seats: [{ p: 5, dx: 0, want: 'drink' }] }
  ];
  var SAY_OK = ['¡Gracias, Jeeves!', '¡Qué rápido!', '¡Se ve delicioso!', '¡Perfecto!'], SAY_BAD = ['Ya era hora…', 'Tardaste mucho', 'Por fin…', 'Ya se enfrió'];

  function rfit() {
    var g = game.getBoundingClientRect(), a = $('.r-top').getBoundingClientRect(), b = elRBar.getBoundingClientRect();
    var top = a.height ? a.bottom - g.top + 6 : 76, bot = b.height ? g.bottom - b.top + 40 : 170, av = Math.max(200, H - top - bot);
    RS = Math.min(W / RW, av / RH); ROX = (W - RW * RS) / 2; ROY = top + (av - RH * RS) / 2;
  }
  function startResto() {
    ST.endShown = true; ST.mode = 'resto'; $('#hud').hidden = true; engine(0, false); ST.boost = false;
    if (musicG && AC) musicG.gain.setTargetAtTime(0, AC.currentTime, .8);
    lofi(true);
    if (!T.front) T.front = jeevesFrontTex(MINT);
    R = { t: 0, happy: ST.rank === 1, phase: 'enter', fade: 1, tips: 0, fx: [], inv: { burger: 0, drink: 0, fries: 0 }, active: true,
      rb: { x: 50, y: 176, path: [{ x: 50, y: 134 }], at: null, go: null, vx: 0, eye: 'ok', eyeT: 0 },
      tables: TABLES.map(function (t) { return { x: t.x, y: t.y, say: '', sayT: 0, shake: 0, done: false, greeted: false, seats: t.seats.map(function (s) { return { p: s.p, dx: s.dx, want: s.want, got: false, coming: false, at: 0, ph: Math.random() }; }) }; }) };
    R.tables.forEach(function (t) { t.seats.forEach(function (s) { R.inv[s.want]++; }); });
    elResto.hidden = false; elResto.classList.add('intro'); elRIntro.hidden = true; rfit(); paintR();
  }
  function showIntro() {
    $('#rTitle').textContent = R.happy ? 'Los clientes están felices' : 'Los clientes están enojados';
    $('#rMood').textContent = R.happy ? 'Llegaste primero y la comida llegó a tiempo. Toca una mesa y entrega cada pedido, sin prisa.' : 'Llegaste en ' + ord(ST.rank) + ' lugar y esperaron mucho. Toca una mesa y entrega cada pedido, sin prisa.';
    elRIntro.hidden = false;
  }
  $('#rGo').addEventListener('click', function () { if (!R) return; elRIntro.hidden = true; elResto.classList.remove('intro'); R.phase = 'serve'; rfit(); paintR(); sfx('soft'); });
  function pending(tb) { return tb.seats.filter(function (s) { return !s.got && !s.coming; }); }
  function paintR() {
    if (!R) return; var rb = R.rb, ready = R.phase === 'serve' && rb.at && !rb.path.length && pending(rb.at).length > 0;
    itemBtns.forEach(function (b) { var k = b.getAttribute('data-k'), n = R.inv[k]; b.querySelector('em').textContent = n; b.disabled = n <= 0; });
    elRBar.classList.toggle('ready', !!ready);
    var done = R.tables.filter(function (t) { return t.done; }).length; elRCount.textContent = done + ' de ' + R.tables.length + ' mesas';
    elRTip.hidden = !R.happy; elRTip.textContent = 'Propinas $' + R.tips;
    var h = '';
    if (R.phase === 'serve') h = ready ? '¿Qué pidieron? Toca el platillo' : rb.path.length ? 'Jeeves va en camino…' : 'Toca una mesa para llevar su pedido';
    else if (R.phase === 'done' || R.phase === 'home') h = 'Todo entregado';
    elRHint.textContent = h;
  }
  function goTo(tb) {
    var rb = R.rb; if (rb.at === tb && !rb.path.length) return;
    if (tb.done) { tb.say = 'Ya tenemos todo, gracias'; tb.sayT = 1.6; return; }
    var sx = tb.x < 50 ? tb.x + 17 : tb.x - 17, sy = tb.y + 4; rb.path = [];
    if (Math.abs(rb.x - 50) > .5) rb.path.push({ x: 50, y: rb.y });
    rb.path.push({ x: 50, y: sy }, { x: sx, y: sy }); rb.at = null; rb.go = tb; sfx('soft'); paintR();
  }
  function arrived() {
    var rb = R.rb; if (!rb.go) return; rb.at = rb.go; rb.go = null; var tb = rb.at;
    if (!tb.greeted) { tb.greeted = true; tb.say = R.happy ? '¡Hola, Jeeves!' : 'Llevamos rato esperando'; tb.sayT = 1.5; }
    paintR();
  }
  function trayPos(k) { var rb = R.rb, w = 14, kk = w / 200, h = 420 * kk; return { x: rb.x, y: rb.y - h + (k === 'burger' ? 132 : k === 'drink' ? 226 : 310) * kk }; }
  function deliver(k) {
    if (!R || R.phase !== 'serve') return; var rb = R.rb, tb = rb.at;
    if (!tb || rb.path.length) { elRHint.textContent = 'Primero toca una mesa'; return; }
    if (R.inv[k] <= 0) return;
    var seat = tb.seats.filter(function (s) { return s.want === k && !s.got && !s.coming; })[0];
    if (!seat) { tb.say = 'Eso no lo pedí'; tb.sayT = 1.5; tb.shake = .6; sfx('nope'); return; }
    R.inv[k]--; seat.coming = true; var p = trayPos(k);
    R.fx.push({ type: 'fly', k: k, x0: p.x, y0: p.y, x1: tb.x + seat.dx, y1: tb.y - .6, t: 0, dur: .75, seat: seat, tb: tb });
    sfx('soft'); paintR();
  }
  function land(f) {
    var s = f.seat, tb = f.tb; s.got = true; s.coming = false; s.at = R.t;
    var lines = R.happy ? SAY_OK : SAY_BAD; tb.say = lines[(Math.random() * lines.length) | 0]; tb.sayT = 2.2;
    if (R.happy) { var tip = 15 + ((Math.random() * 4) | 0) * 5; R.tips += tip; R.fx.push({ type: 'txt', s: '+$' + tip, x: tb.x + s.dx, y: tb.y - 4, t: 0, dur: 1.8, col: '#FFD36B' }); sfx('ding'); R.rb.eye = 'happy'; }
    else { sfx('meh'); R.rb.eye = 'sorry'; }
    R.rb.eyeT = 1.6;
    if (tb.seats.every(function (q) { return q.got; })) tb.done = true;
    if (R.tables.every(function (t) { return t.done; })) { R.phase = 'done'; R.homeAt = R.t + 1.8; }
    paintR();
  }
  function restoTap(e) {
    if (!R || R.phase !== 'serve') return;
    var g = game.getBoundingClientRect(), wx = (e.clientX - g.left - ROX) / RS, wy = (e.clientY - g.top - ROY) / RS, best = null, bd = 1e9;
    R.tables.forEach(function (tb) { if (Math.abs(wx - tb.x) < 16 && wy > tb.y - 34 && wy < tb.y + 10) { var d = Math.abs(wx - tb.x) + Math.abs(wy - tb.y); if (d < bd) { bd = d; best = tb; } } });
    if (best) goTo(best);
  }
  itemBtns.forEach(function (b) { b.addEventListener('click', function () { deliver(b.getAttribute('data-k')); }); });

  function updateResto(dt) {
    if (!R) return; R.t += dt; R.fade = Math.max(0, R.fade - dt / 1.4);
    var rb = R.rb;
    if (rb.path.length) {
      var p = rb.path[0], dx = p.x - rb.x, dy = p.y - rb.y, d = Math.hypot(dx, dy), v = rb.path.length === 1 ? Math.min(24, d * 2.2 + 5) : 24, sd = v * dt;
      rb.vx = lerp(rb.vx, (dx / (d || 1)) * v, .12);
      if (d <= sd) { rb.x = p.x; rb.y = p.y; rb.path.shift(); if (!rb.path.length) { arrived(); paintR(); } } else { rb.x += dx / d * sd; rb.y += dy / d * sd; }
    } else rb.vx = lerp(rb.vx, 0, .1);
    if (rb.eyeT > 0) { rb.eyeT -= dt; if (rb.eyeT <= 0) rb.eye = 'ok'; }
    R.tables.forEach(function (t) { if (t.sayT > 0) t.sayT -= dt; if (t.shake > 0) t.shake = Math.max(0, t.shake - dt); });
    R.fx.forEach(function (f) { f.t += dt; if (f.type === 'fly' && !f.landed && f.t >= f.dur) { f.landed = true; land(f); } });
    R.fx = R.fx.filter(function (f) { return f.t < f.dur + (f.type === 'fly' ? 0 : 0); });
    if (R.phase === 'enter' && !rb.path.length) { R.phase = 'intro'; showIntro(); }
    if (R.phase === 'done' && R.t > R.homeAt) { R.phase = 'home'; rb.at = null; rb.path = []; if (Math.abs(rb.x - 50) > .5) rb.path.push({ x: 50, y: rb.y }); rb.path.push({ x: 50, y: 134 }); paintR(); }
    if (R.phase === 'home' && !rb.path.length && !R.endAt) R.endAt = R.t + 1.2;
    if (R.endAt && R.t > R.endAt && !R.over) { R.over = true; showEnd(); }
  }

  function drawPerson(c, x, y, P, st, t, s) {
    var hx = x, hy = y - 11 + Math.sin(t * 1.2 + s.ph * 6) * .18;
    if (P.hs === 1) { c.fillStyle = P.hair; rr(c, hx - 3.9, hy - 2.6, 7.8, 8.6, 3.2); c.fill(); }
    c.fillStyle = P.shirt; rr(c, x - 4.2, y - 7.6, 8.4, 9.5, 3.2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, x - 3.4, y - 7.2, 6.8, 1.4, .7); c.fill();
    c.fillStyle = P.skin; c.fillRect(hx - 1, hy + 2.4, 2, 2.2);
    c.beginPath(); c.arc(hx - 3.1, hy + .3, .8, 0, 7); c.arc(hx + 3.1, hy + .3, .8, 0, 7); c.fill();
    c.beginPath(); c.arc(hx, hy, 3.2, 0, 7); c.fill();
    c.fillStyle = P.hair; c.beginPath(); c.arc(hx, hy - .1, 3.32, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(hx + 1, hy - 1.6, hx - 3.3, hy - .4); c.fill();
    if (P.hs === 2) { c.beginPath(); c.arc(hx, hy - 3.9, 1.5, 0, 7); c.fill(); }
    if (P.hs === 3) { [-2.6, -1.3, 0, 1.3, 2.6].forEach(function (a, i) { c.beginPath(); c.arc(hx + a, hy - 2.4 - (i % 2) * .6, 1.25, 0, 7); c.fill(); }); }
    var angry = st === 'angry' || st === 'mad', ey = hy + .25, blink = ((t * .6 + s.ph * 5) % 4) < .09;
    if (angry) { c.fillStyle = 'rgba(233,78,78,' + (st === 'angry' ? .2 + Math.sin(t * 2 + s.ph * 6) * .06 : .12) + ')'; c.beginPath(); c.arc(hx, hy + .4, 3, 0, 7); c.fill(); }
    c.strokeStyle = '#1B1B24'; c.fillStyle = '#1B1B24'; c.lineWidth = .38; c.lineCap = 'round';
    if (st === 'joy') { [-1.2, 1.2].forEach(function (o) { c.beginPath(); c.arc(hx + o, ey + .35, .6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); }
    else if (blink) { c.beginPath(); c.moveTo(hx - 1.6, ey); c.lineTo(hx - .8, ey); c.moveTo(hx + .8, ey); c.lineTo(hx + 1.6, ey); c.stroke(); }
    else { c.beginPath(); c.arc(hx - 1.2, ey, .42, 0, 7); c.arc(hx + 1.2, ey, .42, 0, 7); c.fill(); }
    if (angry) { var k = st === 'angry' ? .75 : .45; c.lineWidth = .45; c.beginPath(); c.moveTo(hx - 2.1, ey - 1.5); c.lineTo(hx - .5, ey - 1.5 + k); c.moveTo(hx + 2.1, ey - 1.5); c.lineTo(hx + .5, ey - 1.5 + k); c.stroke(); c.lineWidth = .38; }
    if (st === 'wait') { c.beginPath(); c.arc(hx, hy + .9, 1.15, Math.PI * .18, Math.PI * .82); c.stroke(); }
    else if (st === 'joy') { c.fillStyle = '#6B2323'; c.beginPath(); c.arc(hx, hy + 1.1, 1.25, 0, Math.PI); c.closePath(); c.fill(); c.fillStyle = '#E86A6A'; c.beginPath(); c.arc(hx, hy + 1.85, .55, Math.PI, 0); c.fill(); }
    else if (st === 'angry') { c.beginPath(); c.arc(hx, hy + 2.6, 1.05, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }
    else { c.beginPath(); c.moveTo(hx - .9, hy + 1.6); c.lineTo(hx + .9, hy + 1.6); c.stroke(); }
    if (!angry) { c.fillStyle = 'rgba(240,110,120,.35)'; c.beginPath(); c.arc(hx - 2, hy + .9, .7, 0, 7); c.arc(hx + 2, hy + .9, .7, 0, 7); c.fill(); }
    if (st === 'angry' && !reduce) for (var q = 0; q < 3; q++) { var ph = (t * .55 + q / 3 + s.ph) % 1, side = q % 2 ? 1 : -1; c.fillStyle = 'rgba(235,240,250,' + (1 - ph) * .55 + ')'; c.beginPath(); c.arc(hx + side * (3.4 + ph * 1.6), hy - 2.5 - ph * 5.5, .7 + ph * 1.1, 0, 7); c.fill(); }
    if (st === 'joy' && t - s.at < 5 && !reduce) for (var q2 = 0; q2 < 2; q2++) { var ph2 = ((t - s.at) * .5 + q2 * .5) % 1; c.fillStyle = 'rgba(255,107,138,' + (1 - ph2) * .85 + ')'; heart(c, hx + (q2 ? 2.6 : -2.4) + Math.sin(ph2 * 6) * .5, hy - 4 - ph2 * 7, .9); }
  }
  function drawTable(c, tb, t) {
    var x = tb.x, y = tb.y;
    tb.seats.forEach(function (s) { c.fillStyle = '#4E3122'; rr(c, x + s.dx - 4.6, y - 17.5, 9.2, 13, 2.4); c.fill(); c.fillStyle = '#6A4330'; rr(c, x + s.dx - 3.8, y - 16.8, 7.6, 1.8, .9); c.fill(); });
    tb.seats.forEach(function (s) { var st = s.got ? (R.happy ? 'joy' : 'mad') : (R.happy ? 'wait' : 'angry'); drawPerson(c, x + s.dx, y - 3.2, PEOPLE[s.p], st, t, s); });
    c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, y + 6.5, 13, 3.4, 0, 0, 7); c.fill();
    c.fillStyle = '#2E1C13'; c.fillRect(x - 1, y + 1, 2, 5.6);
    c.fillStyle = '#4A2E1F'; c.beginPath(); c.ellipse(x, y + 1.2, 12.5, 7, 0, 0, 7); c.fill();
    var g = c.createLinearGradient(0, y - 7, 0, y + 7); g.addColorStop(0, '#B07A4F'); g.addColorStop(1, '#84532F'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 12.5, 7, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,235,200,.16)'; c.lineWidth = .35; c.beginPath(); c.ellipse(x, y - .3, 11.4, 6.1, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    tb.seats.forEach(function (s) { c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(x + s.dx, y - 1.2, 2.8, 1.35, 0, 0, 7); c.fill(); if (s.got) drawItem(c, s.want, x + s.dx, y - .6, 4.2); });
  }
  function drawRobot(c, t) {
    var rb = R.rb, w = 14, k = w / 200, h = 420 * k, moving = rb.path.length > 0, bob = moving && !reduce ? Math.abs(Math.sin(t * 9)) * -.25 : 0, lean = clamp(rb.vx * .005, -.1, .1);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(rb.x, rb.y - .2, 7.4, 1.8, 0, 0, 7); c.fill();
    c.save(); c.translate(rb.x, rb.y); c.rotate(lean); c.drawImage(T.front, -w / 2, -h + bob, w, h);
    var X = function (v) { return -w / 2 + v * k; }, Y = function (v) { return -h + bob + v * k; }, i;
    var bs = [72, 128], ds = [58, 100, 142];
    for (i = 0; i < Math.min(2, R.inv.burger); i++) drawBurger(c, X(bs[i]), Y(132), 44 * k);
    for (i = 0; i < Math.min(3, R.inv.drink); i++) drawDrink(c, X(ds[i]), Y(226), 24 * k);
    if (R.inv.fries > 0) drawFries(c, X(100), Y(310), 34 * k);
    var ey = Y(40), blink = ((t * .5) % 3.4) < .08; c.fillStyle = MINT; c.strokeStyle = MINT; c.lineCap = 'round'; c.shadowColor = MINT; c.shadowBlur = 6 * DPR;
    [76, 124].forEach(function (ex) {
      var X0 = X(ex);
      if (rb.eye === 'happy') { c.lineWidth = 6 * k; c.beginPath(); c.arc(X0, ey + 4 * k, 9 * k, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
      else if (rb.eye === 'sorry') { c.lineWidth = 6 * k; c.beginPath(); c.arc(X0, ey - 6 * k, 9 * k, Math.PI * .2, Math.PI * .8); c.stroke(); }
      else if (blink) { c.lineWidth = 5 * k; c.beginPath(); c.moveTo(X0 - 7 * k, ey); c.lineTo(X0 + 7 * k, ey); c.stroke(); }
      else { rr(c, X0 - 5.5 * k, ey - 9 * k, 11 * k, 18 * k, 5.5 * k); c.fill(); }
    });
    c.shadowBlur = 0; c.restore();
  }
  function bubble(c, x, yb, w, h, ring) {
    c.fillStyle = 'rgba(255,255,255,.96)'; rr(c, x - w / 2, yb - h, w, h, h * .45); c.fill();
    c.beginPath(); c.moveTo(x - 1.4, yb - .1); c.lineTo(x + 1.4, yb - .1); c.lineTo(x, yb + 1.8); c.closePath(); c.fill();
    if (ring) { c.strokeStyle = MINT; c.lineWidth = .55; rr(c, x - w / 2, yb - h, w, h, h * .45); c.stroke(); }
  }
  function drawRoom(c, t, wx0, wx1, wy0, wy1) {
    var g = c.createLinearGradient(0, wy0, 0, 30); g.addColorStop(0, '#1A2550'); g.addColorStop(1, '#22305F'); c.fillStyle = g; c.fillRect(wx0, wy0, wx1 - wx0, 30 - wy0);
    for (var y = 30, r = 0; y < wy1; y += 5, r++) {
      c.fillStyle = r % 2 ? '#5C3F2E' : '#583C2C'; c.fillRect(wx0, y, wx1 - wx0, 5.05);
      c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(wx0, y, wx1 - wx0, .25);
      for (var x = -20 + (r * 7) % 22; x < wx1 + 22; x += 22) if (x > wx0) c.fillRect(x, y, .25, 5);
    }
    var sg = c.createLinearGradient(0, 30, 0, 37); sg.addColorStop(0, 'rgba(0,0,0,.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.fillRect(wx0, 30, wx1 - wx0, 7);
    var wg = c.createLinearGradient(0, 21, 0, 30); wg.addColorStop(0, '#3E2C2A'); wg.addColorStop(1, '#2A1E1E'); c.fillStyle = wg; c.fillRect(wx0, 21, wx1 - wx0, 9);
    c.fillStyle = 'rgba(214,170,110,.55)'; c.fillRect(wx0, 21, wx1 - wx0, .5);
    [[7, 24], [69, 24]].forEach(function (wd) {
      var x0 = wd[0], ww = wd[1], y0 = 3, wh = 15;
      c.fillStyle = '#0D1430'; rr(c, x0 - .8, y0 - .8, ww + 1.6, wh + 1.6, 1.4); c.fill();
      c.save(); rr(c, x0, y0, ww, wh, .8); c.clip();
      var sk = c.createLinearGradient(0, y0, 0, y0 + wh); sk.addColorStop(0, '#0A1030'); sk.addColorStop(.6, '#2A2F73'); sk.addColorStop(1, '#8A4E86'); c.fillStyle = sk; c.fillRect(x0, y0, ww, wh);
      c.fillStyle = 'rgba(255,255,255,.7)'; for (var i = 0; i < 6; i++) c.fillRect(x0 + ((i * 7.3 + x0) % ww), y0 + 1 + (i * 3.1) % 6, .3, .3);
      var img = skyline[2], ih = ww * img.height / img.width * 1.6; c.drawImage(img, x0 - (x0 * .7 % 10), y0 + wh - ih + 1, ww * 1.6, ih);
      c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.moveTo(x0 + ww * .2, y0); c.lineTo(x0 + ww * .38, y0); c.lineTo(x0 + ww * .12, y0 + wh); c.lineTo(x0 - ww * .06, y0 + wh); c.fill();
      c.restore(); c.fillStyle = '#0D1430'; c.fillRect(x0 + ww / 2 - .4, y0, .8, wh);
      c.fillStyle = '#C79E6A'; rr(c, x0 - 1.5, y0 + wh + .4, ww + 3, 1.3, .5); c.fill();
    });
    [35, 65].forEach(function (sx) { var lg = c.createRadialGradient(sx, 9, 0, sx, 9, 9); lg.addColorStop(0, 'rgba(255,196,120,.45)'); lg.addColorStop(1, 'rgba(255,196,120,0)'); c.fillStyle = lg; c.fillRect(sx - 9, 0, 18, 20); c.fillStyle = '#FFD99A'; rr(c, sx - .9, 7.5, 1.8, 3, .8); c.fill(); });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = MINT; c.shadowBlur = 14 * DPR; c.fillStyle = MINT; c.font = '700 6.6px "Inter Tight", Inter, system-ui, sans-serif'; c.fillText('JEEVES', 50, 9.4);
    c.shadowColor = '#FFB020'; c.shadowBlur = 10 * DPR; c.fillStyle = '#FFC24D'; c.font = '700 3.3px "Inter Tight", Inter, system-ui, sans-serif'; c.fillText('B U R G E R', 50, 15.2); c.shadowBlur = 0;
    c.fillStyle = '#24345E'; rr(c, 43, 36, 14, 104, 1.5); c.fill(); c.strokeStyle = 'rgba(69,237,209,.35)'; c.lineWidth = .4; rr(c, 44, 37, 12, 102, 1); c.stroke();
    R.tables.forEach(function (tb) { var lg = c.createRadialGradient(tb.x, tb.y + 2, 0, tb.x, tb.y + 2, 26); lg.addColorStop(0, 'rgba(255,190,110,.2)'); lg.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = lg; c.fillRect(tb.x - 26, tb.y - 24, 52, 52); });
    c.fillStyle = '#1B2A57'; rr(c, 41, 140, 18, 6, 1.2); c.fill(); c.fillStyle = MINT; c.font = '600 2.1px Inter, system-ui, sans-serif'; c.fillText('BIENVENIDOS', 50, 143.1);
    [[6, 42], [94, 42], [6, 132], [94, 132]].forEach(function (pp) {
      var x = pp[0], y = pp[1], sw = Math.sin(t * .8 + x) * .25;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + .6, 4, 1.2, 0, 0, 7); c.fill();
      [[-2.4, -6, -.5], [2.4, -6.4, .5], [0, -8.2, 0], [-1.4, -4, -.9], [1.6, -4.2, .9]].forEach(function (l, i) { c.fillStyle = i % 2 ? '#2F8F5B' : '#3FAE6E'; c.beginPath(); c.ellipse(x + l[0] + sw, y + l[1], 1.5, 3.4, l[2], 0, 7); c.fill(); });
      c.fillStyle = '#C76B4A'; c.beginPath(); c.moveTo(x - 3, y - 3.6); c.lineTo(x + 3, y - 3.6); c.lineTo(x + 2.3, y + .4); c.lineTo(x - 2.3, y + .4); c.closePath(); c.fill(); c.fillStyle = '#A9553A'; c.fillRect(x - 3.1, y - 3.8, 6.2, 1);
    });
  }
  function renderResto() {
    var c = cx, t = R.t; rfit();
    var wx0 = -ROX / RS, wx1 = (W - ROX) / RS, wy0 = -ROY / RS, wy1 = (H - ROY) / RS;
    c.setTransform(DPR * RS, 0, 0, DPR * RS, DPR * ROX, DPR * ROY);
    drawRoom(c, t, wx0, wx1, wy0, wy1);
    var rb = R.rb;
    if (rb.at && R.phase === 'serve' && !rb.path.length) { c.strokeStyle = 'rgba(69,237,209,' + (.35 + Math.sin(t * 2.4) * .15) + ')'; c.lineWidth = .6; c.beginPath(); c.ellipse(rb.at.x, rb.at.y + 1.5, 15.5, 9.2, 0, 0, 7); c.stroke(); }
    var objs = R.tables.map(function (tb) { return { y: tb.y + 2, tb: tb }; }); objs.push({ y: rb.y, robot: true }); objs.sort(function (a, b) { return a.y - b.y; });
    objs.forEach(function (o) { if (o.robot) drawRobot(c, t); else drawTable(c, o.tb, t); });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    R.tables.forEach(function (tb) {
      var bx = tb.x + (tb.shake > 0 ? Math.sin(t * 40) * tb.shake * 1.2 : 0), by = tb.y - 22.5 + Math.sin(t * 1.5 + tb.x) * .35, pend = pending(tb), here = rb.at === tb && !rb.path.length;
      if (tb.sayT > 0) { c.font = '600 3.3px Inter, system-ui, sans-serif'; var tw = c.measureText(tb.say).width + 4.4; c.globalAlpha = Math.min(1, tb.sayT * 3); bubble(c, bx, by, tw, 6.2, false); c.fillStyle = '#0F172A'; c.fillText(tb.say, bx, by - 3); c.globalAlpha = 1; }
      else if (pend.length && R.phase !== 'enter') { var bw = pend.length * 6.6 + 2.6; bubble(c, bx, by, bw, 7.4, here); pend.forEach(function (s, i) { drawItem(c, s.want, bx - bw / 2 + 4.6 + i * 6.6, by - 1.2, 4.4); }); }
    });
    R.fx.forEach(function (f) {
      var p = clamp(f.t / f.dur, 0, 1);
      if (f.type === 'fly') { var e = easeInOut(0, 1, p), x = lerp(f.x0, f.x1, e), y = lerp(f.y0, f.y1, e) - Math.sin(p * Math.PI) * 9; drawItem(c, f.k, x, y, 4.2); }
      else { c.globalAlpha = 1 - p * p; c.font = '700 4.2px "Inter Tight", Inter, system-ui, sans-serif'; c.lineWidth = .9; c.strokeStyle = 'rgba(40,24,10,.75)'; c.strokeText(f.s, f.x, f.y - p * 6); c.fillStyle = f.col; c.fillText(f.s, f.x, f.y - p * 6); c.globalAlpha = 1; }
    });
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    var vg = c.createRadialGradient(W / 2, H * .5, W * .4, W / 2, H * .5, H * .85); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    if (R.fade > 0) { c.fillStyle = 'rgba(5,7,13,' + R.fade + ')'; c.fillRect(0, 0, W, H); }
  }

  /* música tranquila del restaurante (lo-fi hecho con el sintetizador) */
  var LF = null, NOISE = null, BEAT = 60 / 74, PROG = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function lfNote(f, t, d, v) {
    var o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), g2 = AC.createGain(); o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.003; g2.gain.value = .14;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(LF.g);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(v * .3, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05);
  }
  function lfDrum(t, kick) {
    if (kick) { var o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .18); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(g); g.connect(LF.g); o.start(t); o.stop(t + .35); return; }
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g2 = AC.createGain(); s.buffer = NOISE; f.type = 'highpass'; f.frequency.value = 6500; g2.gain.setValueAtTime(.025, t); g2.gain.exponentialRampToValueAtTime(.0001, t + .06); s.connect(f); f.connect(g2); g2.connect(LF.g); s.start(t); s.stop(t + .08);
  }
  function lfTick() {
    if (!LF || !AC) return;
    while (LF.next < AC.currentTime + .5) {
      var t = LF.next, b = LF.beat, inb = b % 4, ch = PROG[Math.floor(b / 4) % 4];
      if (inb === 0) ch.forEach(function (m, i) { lfNote(mtof(m), t + i * .035, BEAT * 3.8, .045); });
      if (inb === 1) lfNote(mtof(ch[3] + 12), t + BEAT * .5, BEAT * 1.6, .025);
      if (inb === 3) lfNote(mtof(ch[1] + 12), t, BEAT * 1.4, .022);
      if (inb === 0 || inb === 2) { var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = mtof(ch[0] - 12); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.08, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + BEAT * 1.7); o.connect(g); g.connect(LF.g); o.start(t); o.stop(t + BEAT * 1.8); }
      lfDrum(t, inb === 0 || inb === 2); lfDrum(t + BEAT * .5, false);
      LF.next += BEAT; LF.beat++;
    }
  }
  function lofi(on) {
    if (!AC) return;
    if (on) {
      if (LF) return;
      if (!NOISE) { NOISE = AC.createBuffer(1, AC.sampleRate * .2, AC.sampleRate); var d = NOISE.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.value = .0001; g.connect(lp); lp.connect(master); g.gain.setTargetAtTime(.9, AC.currentTime + .6, 1.2);
      LF = { g: g, next: AC.currentTime + .7, beat: 0, iv: setInterval(lfTick, 150) };
    } else if (LF) { var l = LF; LF = null; l.g.gain.setTargetAtTime(.0001, AC.currentTime, .4); setTimeout(function () { clearInterval(l.iv); try { l.g.disconnect(); } catch (e) {} }, 2500); }
  }

  /* ---------- bucle ---------- */
  function resize() {
    var r = game.getBoundingClientRect(); DPR = Math.min(window.devicePixelRatio || 1, 1.6); W = Math.max(200, r.width); H = Math.max(300, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); HZ = Math.round(H * .4); KX = W * .3; KY = H * .78 - HZ; skyG = null;
    if (R && R.active) rfit();
  }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  var last = 0, frameN = 0;
  function step(dt) {
    ST.t += dt; frameN++;
    updateMovers(dt);
    if (ST.mode === 'menu') {
      ST.pos += 5200 * dt; ST.x = Math.sin(ST.t * .5) * .4; ST.speed = 5200; ST.sky += segAt(ST.pos).curve * 5200 * dt / SEG;
      if (ST.pos > (N - 200) * SEG) resetRace(true);
      rivals.forEach(function (r) { if (r.z < ST.pos + PZ - 3000) { r.z = ST.pos + PZ + 6000 + Math.random() * 4000; } updateRival(r, dt, ST.pos + PZ, false); });
      engine(0, false);
    } else if (ST.mode === 'count') {
      ST.count -= dt; var c = Math.ceil(ST.count - .3);
      if (c !== ST.lastCount) { ST.lastCount = c; if (c > 0) { elCount.innerHTML = '<b>' + c + '</b>'; sfx('beep'); } else { elCount.innerHTML = '<b>¡Ya!</b>'; sfx('go'); } }
      updatePlayer(dt); rivals.forEach(function (r) { updateRival(r, dt, ST.pos + PZ, false); });
      if (ST.count <= .3) { ST.mode = 'race'; ST.el = 0; setTimeout(function () { elCount.innerHTML = ''; }, 800); }
    } else if (ST.mode === 'race') {
      if (!ST.finished) ST.el += dt;
      if (window.__jxBot && !ST.finished) { var bz = ST.pos + PZ, bl = ST.x, bs = -1e9; for (var bi = 0; bi < 4; bi++) { var bb = nearestBlock(bz, LANE_X[bi], 6000, .3, null), bf = bb ? bb.d : 6000, sc3 = bf - Math.abs(LANE_X[bi] - ST.x) * 1400; if (sc3 > bs) { bs = sc3; bl = LANE_X[bi]; } } ST.tx = bl; ST.boost = ST.bat > .5; }
      updatePlayer(dt); rivals.forEach(function (r) { updateRival(r, dt, ST.pos + PZ, true); });
      if (ST.t > 2.2 && ST.hint === 0 && ST.el > 4) { ST.hint = 1; elHint.classList.add('off'); }
      var zp = ST.pos + PZ, rk = 1; rivals.forEach(function (r) { if (r.fin ? true : r.z > zp) rk++; });
      if (ST.finished) rk = ST.rank; if (rk !== ST.rank || frameN % 10 === 0) { ST.rank = rk; elRank.textContent = rk; }
      elClock.textContent = fmt(ST.finished ? ST.finT : ST.el);
      var pr = clamp(zp / FINISH, 0, 1); dots.me.style.top = (100 - pr * 100) + '%'; rivals.forEach(function (r, i) { dots.r[i].style.top = (100 - clamp(r.z / FINISH, 0, 1) * 100) + '%'; });
      elBat.style.setProperty('--p', Math.round(ST.bat * 100) + '%'); turboBtn.classList.toggle('empty', ST.bat <= .02);
      engine(clamp(ST.speed / (MAXS * 1.3), 0, 1), true);
      if (ST.finished && ST.t > ST.endAt && !ST.endShown) startResto();
    } else if (ST.mode === 'resto' || (ST.mode === 'end' && R)) { updateResto(dt);
    } else if (ST.mode === 'end') {
      updatePlayer(dt); rivals.forEach(function (r) { updateRival(r, dt, ST.pos + PZ, false); });
    }
  }
  function loop(ts) {
    var dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    if (!document.hidden) { step(dt); render(); }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { engine(0, false); if (musicG && AC) musicG.gain.setTargetAtTime(0, AC.currentTime, .1); } else if (musicG && AC && !R) musicG.gain.setTargetAtTime(ST.mode === 'menu' ? .32 : .22, AC.currentTime, .3); });

  /* ---------- app instalable ---------- */
  var deferred = null, btnInstall = $('#install'), iosHint = $('#iosHint');
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (btnInstall && !standalone) btnInstall.hidden = false; });
  if (btnInstall) btnInstall.addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; btnInstall.hidden = true; }); });
  window.addEventListener('appinstalled', function () { if (btnInstall) btnInstall.hidden = true; });
  if (iosHint && !standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) iosHint.hidden = false;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });

  /* retrato de Jeeves de frente, cargado (para la intro y el ícono) */
  function portrait(w) {
    var tex = jeevesFrontTex(MINT), k = w / 200;
    return mk(w, Math.round(420 * k), function (c) {
      c.scale(k, k); c.drawImage(tex, 0, 0);
      drawBurger(c, 72, 132, 46); drawBurger(c, 128, 132, 46);
      drawDrink(c, 62, 226, 24); drawDrink(c, 100, 226, 24); drawDrink(c, 138, 226, 24); drawFries(c, 100, 310, 36);
      c.fillStyle = MINT; c.strokeStyle = MINT; c.lineCap = 'round'; c.shadowColor = MINT; c.shadowBlur = 10; c.lineWidth = 7;
      [76, 124].forEach(function (x) { c.beginPath(); c.arc(x, 44, 10, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); });
    });
  }

  /* intro al abrir: sigue desde la pantalla de arranque del celular */
  (function intro() {
    var el = $('#intro'); if (!el) return;
    var seen = false; try { seen = sessionStorage.getItem('jx-intro') === '1'; } catch (e) {}
    if (seen || reduce) { el.remove(); return; }
    try { sessionStorage.setItem('jx-intro', '1'); } catch (e) {}
    var img = el.querySelector('.in-bot'); try { img.src = portrait(240).toDataURL('image/png'); } catch (e) {}
    el.classList.add('go');
    var gone = false;
    function close() { if (gone) return; gone = true; el.classList.add('out'); setTimeout(function () { el.remove(); }, 650); }
    el.addEventListener('pointerdown', close);
    setTimeout(close, 3300);
  })();

  build(); resetRace(true); resize(); paintRecords($('#recStart'));
  window.__jx = { T: T, st: ST, segs: function () { return segs.length; }, finishNow: function () { ST.pos = FINISH - PZ - 600; ST.x = 0; ST.tx = 0; }, rivals: function () { return rivals; }, FINISH: FINISH, startRace: startRace, portrait: portrait, resto: function () { return R; }, deliver: function (k) { deliver(k); }, goTo: function (i) { goTo(R.tables[i]); } };
  requestAnimationFrame(function (ts) { last = ts; loop(ts); });
})();
