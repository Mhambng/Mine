// Particules et traînées cosmétiques.
'use strict';

// ---------- Particules et traînées ----------
const RAINBOW = ['#ff5e5e', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
function emitTrail(parts, id, x, y, onGround, speed) {
  const R = Math.random;
  switch (id) {
    case 'poussiere':
      if (onGround && R() < .55) parts.push({ k: 'dust', x, y: y + 18, vx: -speed * .6 - 30 * R(), vy: -20 - 40 * R(), life: 0, max: .45, s: 3 + R() * 4 });
      break;
    case 'bulles':
      if (R() < .3) parts.push({ k: 'bub', x, y: y + rnd(-12, 12), vx: -speed * .7, vy: -20 - 30 * R(), life: 0, max: 1.1, s: 3 + R() * 6 });
      break;
    case 'coeurs':
      if (R() < .2) parts.push({ k: 'heart', x, y: y + rnd(-10, 10), vx: -speed * .75, vy: -25 - 20 * R(), life: 0, max: 1, s: 8 + R() * 5, c: pick(['#ff6b9a', '#ff9ec4', '#ff4d7a']) });
      break;
    case 'etoiles':
      if (R() < .4) parts.push({ k: 'star', x, y: y + rnd(-14, 14), vx: -speed * .8, vy: rnd(-20, 20), life: 0, max: .8, s: 3 + R() * 4, rot: R() * 6, vr: rnd(-6, 6), c: pick(['#fff6a8', '#ffffff', '#ffd447']) });
      break;
    case 'flammes':
      for (let i = 0; i < 2; i++) parts.push({ k: 'fire', x: x + rnd(-3, 3), y: y + rnd(-8, 10), vx: -speed * .7 - 40 * R(), vy: -50 - 40 * R(), life: 0, max: .38 + R() * .15, s: 7 + R() * 6 });
      break;
    case 'arcenciel':
      if (R() < .15) parts.push({ k: 'star', x: x - 10, y: y + rnd(-14, 14), vx: -speed * .9, vy: 0, life: 0, max: .6, s: 2.5, rot: 0, vr: 4, c: '#ffffff' });
      break;
  }
}
function stepParts(parts, dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.rot !== undefined) p.rot += (p.vr || 0) * dt;
    if (p.k === 'spark') p.vy += 500 * dt;
  }
}
function drawParts(c, parts, bgId) {
  const b = BG[bgId] || BG.crepuscule;
  for (const p of parts) {
    const a = 1 - p.life / p.max;
    c.globalAlpha = Math.max(0, a);
    switch (p.k) {
      case 'dust':
        c.fillStyle = b.dust;
        c.beginPath(); c.arc(p.x, p.y, p.s * (1.4 - a * .4), 0, 6.283); c.fill();
        break;
      case 'bub':
        c.strokeStyle = '#bfeaff'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(p.x, p.y, p.s, 0, 6.283); c.stroke();
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(p.x - p.s * .35, p.y - p.s * .35, p.s * .22, 0, 6.283); c.fill();
        break;
      case 'heart': heart(c, p.x, p.y, p.s, p.c); break;
      case 'star': star(c, p.x, p.y, p.s, p.s * .45, p.c, p.rot); break;
      case 'fire': {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = a > .7 ? '#fff1a0' : a > .4 ? '#ff9b2b' : '#ff3b2b';
        c.beginPath(); c.arc(p.x, p.y, p.s * a, 0, 6.283); c.fill();
        c.restore();
        break;
      }
      case 'spark':
        c.fillStyle = '#ffe066';
        c.fillRect(p.x - 2, p.y - 2, 4, 4);
        break;
      case 'puff':
        c.strokeStyle = '#ffffff'; c.lineWidth = 2;
        c.beginPath(); c.arc(p.x, p.y, p.s + (1 - a) * 18, 0, 6.283); c.stroke();
        break;
    }
  }
  c.globalAlpha = 1;
}
function drawRainbow(c, hist, px, dist) {
  for (let i = hist.length - 1; i > 0; i--) {
    const h1 = hist[i], h0 = hist[i - 1];
    const x1 = px - (dist - h1.d), x0 = px - (dist - h0.d);
    if (x1 < -10) break;
    for (let j = 0; j < 6; j++) {
      c.fillStyle = RAINBOW[j];
      const wob = (Math.floor(h1.d / 24) % 2) ? 1.5 : -1.5;
      c.fillRect(x0, h1.y - 15 + j * 4 + wob, x1 - x0 + 1, 4);
    }
  }
}
