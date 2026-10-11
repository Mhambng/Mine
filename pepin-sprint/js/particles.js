// Particules et traînées cosmétiques.
'use strict';

// ---------- Pool de particules ----------
// Les particules sont recyclées au lieu d'être recréées : aucune allocation mémoire pendant la partie
// une fois le pool rempli (moins de pauses du ramasse-miettes sur les téléphones modestes).
// Nombre maximal de particules vivantes : CONFIG.perf.maxParticles (réduit automatiquement si l'appareil rame).
const PART_POOL = [];
const PART_DUMMY = {};  // renvoyé quand la limite est atteinte : la particule est simplement ignorée
function addPart(arr, k, x, y, vx, vy, max, s) {
  if (arr.length >= Quality.maxParticles) return PART_DUMMY;
  const p = PART_POOL.pop() || {};
  p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.max = max; p.s = s;
  p.life = 0; p.g = 0; p.drag = 0; p.rot = 0; p.vr = 0; p.c = null; p.text = null; p.seed = 0;
  arr.push(p);
  return p;
}
function clearParts(arr) {
  while (arr.length) PART_POOL.push(arr.pop());
}

// ---------- Particules et traînées ----------
const RAINBOW = ['#ff5e5e', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
function emitTrail(parts, id, x, y, onGround, speed) {
  const R = Math.random;
  switch (id) {
    case 'poussiere':
      if (onGround && R() < .55) addPart(parts, 'dust', x, y + 18, -speed * .6 - 30 * R(), -20 - 40 * R(), .45, 3 + R() * 4);
      break;
    case 'bulles':
      if (R() < .3) addPart(parts, 'bub', x, y + rnd(-12, 12), -speed * .7, -20 - 30 * R(), 1.1, 3 + R() * 6);
      break;
    case 'coeurs':
      if (R() < .2) addPart(parts, 'heart', x, y + rnd(-10, 10), -speed * .75, -25 - 20 * R(), 1, 8 + R() * 5).c = pick(['#ff6b9a', '#ff9ec4', '#ff4d7a']);
      break;
    case 'etoiles':
      if (R() < .4) { const pt = addPart(parts, 'star', x, y + rnd(-14, 14), -speed * .8, rnd(-20, 20), .8, 3 + R() * 4); pt.rot = R() * 6; pt.vr = rnd(-6, 6); pt.c = pick(['#fff6a8', '#ffffff', '#ffd447']); }
      break;
    case 'flammes':
      for (let i = 0; i < 2; i++) addPart(parts, 'fire', x + rnd(-3, 3), y + rnd(-8, 10), -speed * .7 - 40 * R(), -50 - 40 * R(), .38 + R() * .15, 7 + R() * 6);
      break;
    case 'arcenciel':
      if (R() < .15) { const pt = addPart(parts, 'star', x - 10, y + rnd(-14, 14), -speed * .9, 0, .6, 2.5); pt.rot = 0; pt.vr = 4; pt.c = '#ffffff'; }
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
        { const pt = addPart(parts, 'chunk', x + rnd(-10, 10), y - 4, rnd(-140, 140) - speed * .4, rnd(-260, -80), .8, 3 + R() * 3); pt.g = 700; pt.drag = 1.5; pt.rot = R() * 6; pt.vr = rnd(-14, 14); pt.c = pick(CONFETTI); }
      }
      break;
    case 'notes':
      for (let i = 0; i < 3; i++) {
        { const pt = addPart(parts, 'txt', x + rnd(-14, 14), y - 10, rnd(-40, 40) - speed * .3, rnd(-110, -60), .9, 16 + R() * 6); pt.text = pick(['♪', '♫', '♬']); pt.c = pick(['#ffffff', '#ffe066', '#c98bff']); }
      }
      break;
    case 'onde':
      if (phase === 'land') {
        addPart(parts, 'ring', x, y - 2, -speed * .5, 0, .35, 10).c = '#ffffff';
        addPart(parts, 'ring', x, y - 2, -speed * .5, 0, .5, 4).c = '#7df9ff';
      } else {
        addPart(parts, 'ring', x, y - 2, -speed * .5, 0, .3, 6).c = '#ffffff';
      }
      break;
    case 'eclairs':
      for (let i = 0; i < 3; i++) {
        addPart(parts, 'bolt', x + rnd(-16, 16), y - rnd(0, 10), -speed * .5, 0, .25, 14 + R() * 10).seed = R() * 100;
      }
      break;
    case 'artifice':
      if (phase === 'land' || phase === 'jump') {
        const n = phase === 'land' ? 16 : 10;
        const col = pick(CONFETTI);
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283;
          { const pt = addPart(parts, 'star', x, y - 16, Math.cos(a) * 200 - speed * .4, Math.sin(a) * 200 - 60, .7, 3.5); pt.g = 300; pt.drag = 2; pt.rot = 0; pt.vr = 6; pt.c = i % 2 ? col : '#ffffff'; }
        }
      }
      break;
  }
}

function stepParts(parts, dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    if (p.life >= p.max) {
      // Retrait en O(1) : on remplace par la dernière particule (l'ordre d'affichage importe peu)
      parts[i] = parts[parts.length - 1];
      parts.pop();
      PART_POOL.push(p);
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
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
