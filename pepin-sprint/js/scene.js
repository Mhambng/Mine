// Dessin du décor : ciel, soleil, collines en parallaxe, sol, météo.
'use strict';

// ---------- Dessin : décor ----------
// Marge dessinée autour de l'écran : la caméra peut reculer ou trembler sans montrer de bord vide
const SCENE_MARGIN = 160;
const DECO = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random(), p: Math.random() * 6.28 }));

function hills(c, w, gy, off, base, amp, freq, color) {
  c.fillStyle = color;
  c.beginPath();
  const M = SCENE_MARGIN;
  c.moveTo(-M, gy);
  for (let x = -M; x <= w + M + 8; x += 8) {
    const X = x + off;
    c.lineTo(x, base - (Math.sin(X * freq) * .6 + Math.sin(X * freq * 2.3 + 1.7) * .4) * amp);
  }
  c.lineTo(w + M, gy);
  c.closePath();
  c.fill();
}

function drawScene(c, w, h, bgId, scroll, t, gy) {
  const b = BG[bgId] || BG.crepuscule;
  const k = h / 320;
  const sky = c.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, b.sky[0]);
  sky.addColorStop(1, b.sky[1]);
  c.fillStyle = sky;
  const M = SCENE_MARGIN;
  c.fillRect(-M, -M, w + 2 * M, h + 2 * M);

  // Décor lointain
  if (b.deco === 'stars') {
    for (const d of DECO) {
      const x = ((d.x * w - scroll * .02) % w + w) % w;
      c.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * 1.5 + d.p));
      c.fillStyle = b.decoC;
      c.fillRect(x, d.y * gy * .75, 1 + d.s * 1.6 * k, 1 + d.s * 1.6 * k);
    }
    c.globalAlpha = 1;
  }

  // Soleil, lune ou planète
  const s = b.sun, sx = s.x * w, sy = s.y * gy, sr = s.r * k;
  c.save();
  c.shadowColor = s.c;
  c.shadowBlur = 30 * k;
  c.fillStyle = s.c;
  c.beginPath(); c.arc(sx, sy, sr, 0, 6.283); c.fill();
  c.restore();
  if (s.ring) {
    c.strokeStyle = 'rgba(255,220,250,.75)';
    c.lineWidth = 4 * k;
    c.beginPath(); c.ellipse(sx, sy, sr * 1.8, sr * .45, -.35, 0, 6.283); c.stroke();
  }

  if (b.deco === 'clouds') {
    c.fillStyle = b.decoC;
    for (let i = 0; i < 5; i++) {
      const d = DECO[i];
      const cw = (60 + d.s * 60) * k;
      const x = ((d.x * (w + cw * 2) - scroll * .08) % (w + cw * 2) + (w + cw * 2)) % (w + cw * 2) - cw;
      const y = (20 + d.y * 80) * k;
      c.beginPath();
      c.ellipse(x, y, cw * .5, 10 * k, 0, 0, 6.283);
      c.ellipse(x - cw * .15, y - 7 * k, cw * .25, 10 * k, 0, 0, 6.283);
      c.ellipse(x + cw * .15, y - 5 * k, cw * .2, 8 * k, 0, 0, 6.283);
      c.fill();
    }
  }

  hills(c, w, gy, scroll * .15, gy - 62 * k, 28 * k, .006 / k, b.far);
  hills(c, w, gy, scroll * .35, gy - 22 * k, 16 * k, .011 / k, b.near);

  // Sol
  c.fillStyle = b.ground;
  c.fillRect(-M, gy, w + 2 * M, h - gy + M);
  c.fillStyle = b.top;
  c.fillRect(-M, gy, w + 2 * M, 6 * k);
  c.fillStyle = b.obsHi;
  c.globalAlpha = .35;
  const step = 46 * k;
  for (let x = -M - (scroll % step); x < w + M; x += step) {
    c.fillRect(x, gy + 16 * k, 14 * k, 3 * k);
    c.fillRect(x + step * .5, gy + 30 * k, 8 * k, 3 * k);
  }
  c.globalAlpha = 1;

  // Décor proche
  if (b.deco === 'snow') {
    c.fillStyle = b.decoC;
    for (const d of DECO) {
      const y = ((d.y * h + t * (20 + d.s * 30) * k) % h);
      const x = ((d.x * w + Math.sin(t + d.p) * 10 * k - scroll * .05) % w + w) % w;
      c.beginPath(); c.arc(x, y, (1 + d.s * 2) * k, 0, 6.283); c.fill();
    }
  } else if (b.deco === 'leaves') {
    c.fillStyle = b.decoC;
    for (let i = 0; i < 18; i++) {
      const d = DECO[i];
      const y = ((d.y * h + t * (24 + d.s * 20) * k) % h);
      const x = ((d.x * w + Math.sin(t * 1.3 + d.p) * 14 * k - scroll * .3) % w + w) % w;
      c.save(); c.translate(x, y); c.rotate(t * 2 + d.p);
      c.beginPath(); c.ellipse(0, 0, 5 * k, 2.5 * k, 0, 0, 6.283); c.fill();
      c.restore();
    }
  }
}
