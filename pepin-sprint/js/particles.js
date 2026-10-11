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
// Effets de saut (cosmétique) : phase = 'jump' au décollage, 'land' à la réception.
// x, y = position des pieds.
const CONFETTI = ['#ff5e7e', '#ffd447', '#5fd3a6', '#6cc0ff', '#c98bff'];
function emitJumpFx(parts, id, phase, x, y, speed) {
  const R = Math.random;
  switch (id) {
    case 'confettis':
      for (let i = 0; i < (phase === 'jump' ? 8 : 10); i++) {
        parts.push({ k: 'chunk', x: x + rnd(-10, 10), y: y - 4, vx: rnd(-140, 140) - speed * .4, vy: rnd(-260, -80), g: 700, drag: 1.5, life: 0, max: .8, s: 3 + R() * 3, rot: R() * 6, vr: rnd(-14, 14), c: pick(CONFETTI) });
      }
      break;
    case 'notes':
      for (let i = 0; i < 3; i++) {
        parts.push({ k: 'txt', text: pick(['♪', '♫', '♬']), x: x + rnd(-14, 14), y: y - 10, vx: rnd(-40, 40) - speed * .3, vy: rnd(-110, -60), life: 0, max: .9, s: 16 + R() * 6, c: pick(['#ffffff', '#ffe066', '#c98bff']) });
      }
      break;
    case 'onde':
      if (phase === 'land') {
        parts.push({ k: 'ring', x, y: y - 2, vx: -speed * .5, vy: 0, life: 0, max: .35, s: 10, c: '#ffffff' });
        parts.push({ k: 'ring', x, y: y - 2, vx: -speed * .5, vy: 0, life: 0, max: .5, s: 4, c: '#7df9ff' });
      } else {
        parts.push({ k: 'ring', x, y: y - 2, vx: -speed * .5, vy: 0, life: 0, max: .3, s: 6, c: '#ffffff' });
      }
      break;
    case 'eclairs':
      for (let i = 0; i < 3; i++) {
        parts.push({ k: 'bolt', x: x + rnd(-16, 16), y: y - rnd(0, 10), vx: -speed * .5, vy: 0, life: 0, max: .25, s: 14 + R() * 10, seed: R() * 100 });
      }
      break;
    case 'artifice':
      if (phase === 'land' || phase === 'jump') {
        const n = phase === 'land' ? 16 : 10;
        const col = pick(CONFETTI);
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283;
          parts.push({ k: 'star', x, y: y - 16, vx: Math.cos(a) * 200 - speed * .4, vy: Math.sin(a) * 200 - 60, g: 300, drag: 2, life: 0, max: .7, s: 3.5, rot: 0, vr: 6, c: i % 2 ? col : '#ffffff' });
        }
      }
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
    if (p.g) p.vy += p.g * dt;  // gravité propre à la particule
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
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
      case 'ring':  // anneau qui s'agrandit (pièce ramassée)
        c.strokeStyle = p.c || '#ffe066'; c.lineWidth = 3 * a;
        c.beginPath(); c.arc(p.x, p.y, p.s + (1 - a) * 22, 0, 6.283); c.stroke();
        break;
      case 'txt':   // petit texte flottant, par exemple « +1 »
        c.save();
        c.font = (p.s || 18) + 'px "Lilita One", "Arial Rounded MT Bold", sans-serif';
        c.textAlign = 'center';
        c.fillStyle = 'rgba(0,0,0,.3)'; c.fillText(p.text, p.x + 1.5, p.y + 1.5);
        c.fillStyle = p.c || '#fff'; c.fillText(p.text, p.x, p.y);
        c.restore();
        break;
      case 'chunk': // morceaux du personnage à la collision
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0);
        c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        c.restore();
        break;
      case 'line':  // traits de vitesse
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.s, p.y); c.stroke();
        break;
      case 'bolt': { // petit éclair en zigzag
        c.strokeStyle = '#fff6a8'; c.lineWidth = 2.5; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(p.x, p.y);
        for (let i = 1; i <= 4; i++) c.lineTo(p.x + Math.sin(p.seed + i * 2.1) * 6, p.y - i * p.s / 4);
        c.stroke();
        break;
      }
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
