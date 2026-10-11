// Power-ups : aimant à pièces, bouclier, turbo. Leur durée restante est affichée en haut de l'écran.
// Réglages : CONFIG.powerups (js/config.js).
'use strict';

const PU_TYPES = {
  magnet: { name: 'Aimant', color: '#ff5f7a' },
  shield: { name: 'Bouclier', color: '#5fc8ff' },
  boost: { name: 'Turbo', color: '#ffd447' },
};

// Fait apparaître une bulle de power-up (jamais un power-up déjà actif)
function spawnPowerUp(x) {
  const all = Object.keys(PU_TYPES);
  const free = all.filter(t => !(G.power[t] > 0));
  G.items.push({ type: pick(free.length ? free : all), x, y: GROUND - 50, bob: Math.random() * 6 });
}

function collectPowerUp(it) {
  it.got = true;
  const def = PU_TYPES[it.type];
  G.power[it.type] = CONFIG.powerups[it.type].duration;
  G.stats.powerups++;
  sfx.power();
  showBanner(def.name + ' !', def.color);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283;
    { const pt = addPart(G.parts, 'star', it.x, it.y, Math.cos(a) * 220 - G.speed * .3, Math.sin(a) * 220, .5, 4); pt.drag = 3; pt.rot = 0; pt.vr = 5; pt.c = def.color; }
  }
  addPart(G.parts, 'ring', it.x, it.y, -G.speed * .4, 0, .4, 16).c = def.color;
  if (it.type === 'boost') Feel.shake(.25);
}

function updatePowerUps(dt) {
  for (const t in G.power) {
    if (G.power[t] <= 0) continue;
    G.power[t] -= dt;
    if (G.power[t] <= 0) {
      G.power[t] = 0;
      // Fin du turbo : courte invincibilité pour ne pas mourir bêtement en reprenant la main
      if (t === 'boost') G.invuln = Math.max(G.invuln, CONFIG.powerups.boost.graceAfter);
      sfx.powerEnd();
    }
  }
  // Aimant : les pièces proches filent vers Pépin
  if (G.power.magnet > 0) {
    const M = CONFIG.powerups.magnet;
    const cx = PX, cy = G.py - S / 2;
    for (const co of G.coins) {
      const dx = cx - co.x, dy = cy - co.y;
      const d = Math.hypot(dx, dy);
      if (d < M.radius && d > 1) {
        const step = Math.min(d, M.pull * dt);
        co.x += dx / d * step;
        co.y += dy / d * step;
        co.pulled = true;
      }
    }
  }
}

// Collision avec un obstacle : renvoie true si Pépin survit
function absorbHit(o) {
  if (G.invuln > 0) return true;
  if (G.power.boost > 0) { smash(o); return true; }
  if (G.power.shield > 0) {
    G.power.shield = 0;
    G.invuln = CONFIG.powerups.invulnAfterHit;
    smash(o);
    Feel.hitStop(.05);
    Feel.shake(.45);
    sfx.shieldBreak();
    Combo.fail(true);
    showBanner('Bouclier cassé', PU_TYPES.shield.color);
    return true;
  }
  return false;
}

// Obstacle pulvérisé (turbo ou bouclier)
function smash(o) {
  o.dead = true;
  const b = BG[Biomes.current()];
  const col = o.k === 'bird' ? b.bird : b.obs;
  for (let i = 0; i < 12; i++) {
    { const pt = addPart(G.parts, 'chunk', o.x + Math.random() * o.w, Math.max(o.y, GROUND - 60) + Math.random() * 40, rnd(-80, 320), rnd(-380, -120), .8, 4 + Math.random() * 5); pt.g = 1100; pt.rot = Math.random() * 6; pt.vr = rnd(-12, 12); pt.c = col; }
  }
  addPoints(CONFIG.combo.smashPoints, 'Boum !', '#ffd447');
  sfx.smash();
}

// ---------- Dessin ----------
function drawPowerUpIcon(c, type, x, y, r) {
  c.save();
  c.translate(x, y);
  const k = r / 14;
  c.scale(k, k);
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (type === 'magnet') {
    c.strokeStyle = '#ff5f7a'; c.lineWidth = 6;
    c.beginPath(); c.arc(0, -1, 6, Math.PI, 0, true); c.stroke();
    c.beginPath(); c.moveTo(-6, -1); c.lineTo(-6, -6); c.moveTo(6, -1); c.lineTo(6, -6); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-6, -6); c.lineTo(-6, -9); c.moveTo(6, -6); c.lineTo(6, -9); c.stroke();
  } else if (type === 'shield') {
    c.fillStyle = '#5fc8ff';
    c.beginPath(); c.moveTo(0, -10); c.lineTo(8, -6); c.quadraticCurveTo(8, 5, 0, 10); c.quadraticCurveTo(-8, 5, -8, -6); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, -4.5); c.quadraticCurveTo(5, 3, 0, 6.5); c.closePath(); c.fill();
  } else {
    c.fillStyle = '#ffd447'; c.strokeStyle = '#d79a12'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(2, -11); c.lineTo(-7, 2); c.lineTo(-1, 2); c.lineTo(-3, 11); c.lineTo(7, -2); c.lineTo(1, -2); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

function drawPowerUpItems(c) {
  for (const it of G.items) {
    const y = it.y + Math.sin(G.t * 4 + it.bob) * 5;
    const col = PU_TYPES[it.type].color;
    c.save();
    c.shadowColor = col; c.shadowBlur = 14;
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.beginPath(); c.arc(it.x, y, 17, 0, 6.283); c.fill();
    c.restore();
    c.strokeStyle = col; c.lineWidth = 3;
    c.beginPath(); c.arc(it.x, y, 17, 0, 6.283); c.stroke();
    drawPowerUpIcon(c, it.type, it.x, y, 12);
  }
}

// Bulle du bouclier et clignotement d'invincibilité, dessinés autour du personnage
function drawPlayerAura(c) {
  const cy = G.py - (G.slide > 0 ? CONFIG.slide.height : S) / 2;
  if (G.power.shield > 0) {
    const ending = G.power.shield < 2 && Math.floor(G.t * 8) % 2 === 0;
    c.save();
    c.globalAlpha = ending ? .25 : .5;
    c.strokeStyle = '#9fe0ff'; c.lineWidth = 3;
    c.fillStyle = 'rgba(95,200,255,.18)';
    c.beginPath(); c.arc(PX, cy, S * .78 + Math.sin(G.t * 6) * 1.5, 0, 6.283); c.fill(); c.stroke();
    c.restore();
  }
  if (G.power.boost > 0) {
    c.save();
    c.globalAlpha = .35;
    c.fillStyle = '#ffd447';
    for (let i = 1; i <= 3; i++) {
      c.beginPath(); c.ellipse(PX - i * 16, cy, S * .45 - i * 3, S * .4 - i * 3, 0, 0, 6.283); c.fill();
    }
    c.restore();
  }
}

// Jauges en haut à droite, sous les boutons Son/Pause : icône + arc de durée restante
function drawPowerUpHud(c) {
  const active = Object.keys(PU_TYPES).filter(t => G.power[t] > 0);
  if (!active.length) return;
  const gap = 46;
  let x = W - 32 - (active.length - 1) * gap;
  for (const t of active) {
    const frac = G.power[t] / CONFIG.powerups[t].duration;
    const y = 76;
    c.fillStyle = 'rgba(20,12,40,.55)';
    c.beginPath(); c.arc(x, y, 19, 0, 6.283); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 4;
    c.beginPath(); c.arc(x, y, 17, 0, 6.283); c.stroke();
    const blink = G.power[t] < 2 && Math.floor(G.t * 8) % 2 === 0;
    c.strokeStyle = blink ? '#ffffff' : PU_TYPES[t].color;
    c.beginPath(); c.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + frac * 6.283); c.stroke();
    drawPowerUpIcon(c, t, x, y, 10);
    x += gap;
  }
}
