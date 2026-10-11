// Boucle de jeu : état, physique (saut, glissade), obstacles, pièces, collisions, rendu et HUD.
// Les réglages sont dans js/config.js. Écrans superposés : js/ui.js. Contrôles : js/input.js.
'use strict';

// ---------- État ----------
const cv = $('game'), ctx = cv.getContext('2d');
const H = CONFIG.world.height;
const GROUND = H - CONFIG.world.groundOffset;
const PX = CONFIG.world.playerX;
const S = CONFIG.world.playerSize;
let W = 800;

const newStats = () => ({ jumps: 0, slides: 0, coins: 0, powerups: 0, nearMiss: 0, obstacles: 0, maxMult: 1 });

const G = {
  state: 'menu',         // menu | play | pause | over
  t: 0, runT: 0, speed: 0, boostK: 0,
  dist: 0, meters: 0, points: 0, coinsRun: 0,
  // Personnage
  py: GROUND, vy: 0, ground: true, jumps: 0, spin: 0,
  airTime: 0,            // temps passé en l'air (pour le « coyote time »)
  buffer: 0,             // saut mémorisé en attente d'atterrissage
  held: false,           // la touche de saut est-elle maintenue ?
  slide: 0, slideT: 0, slideHeld: false, slideQueued: false,
  invuln: 0,             // invincibilité restante (après un choc absorbé ou la fin du turbo)
  spring: makeSpring(),  // étirement / écrasement
  coinChain: 0, lastCoinT: -9,
  power: { magnet: 0, shield: 0, boost: 0 },
  // Monde
  obs: [], coins: [], items: [], parts: [], hist: [], nextSpawn: 0,
  banners: [],
  stats: newStats(),
  overAt: 0, lastResult: null,
};

function resize() {
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(360, Math.round(H * r.width / r.height));
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
}
new ResizeObserver(resize).observe(cv);

// Vitesse de base : monte vite au début puis se stabilise vers le maximum
function speedAt(t) {
  const sp = CONFIG.speed;
  return sp.start + (sp.max - sp.start) * (1 - Math.exp(-t / sp.rampSeconds));
}
function speedRatio() {
  const sp = CONFIG.speed;
  return Math.max(0, Math.min(1, (speedAt(G.runT) - sp.start) / (sp.max - sp.start)));
}

function startRun() {
  Object.assign(G, {
    state: 'play', runT: 0, speed: CONFIG.speed.start, boostK: 0,
    dist: 0, meters: 0, points: 0, coinsRun: 0,
    py: GROUND, vy: 0, ground: true, jumps: 0, spin: 0, airTime: 0, buffer: 0,
    slide: 0, slideT: 0, slideQueued: false, invuln: 0,
    spring: makeSpring(), coinChain: 0, lastCoinT: -9,
    power: { magnet: 0, shield: 0, boost: 0 },
    obs: [], coins: [], items: [], hist: [], banners: [],
    nextSpawn: CONFIG.zones.firstGap * CONFIG.speed.start,
    stats: newStats(),
  });
  Feel.reset();
  Director.reset();
  Combo.reset();
  Biomes.reset();
  $('pause').hidden = false;
  showOverlay(null);
  sfx.start();
}

// ---------- Bandeaux d'annonce (« Ça accélère ! », « Combo ×3 ! »…) ----------
function showBanner(text, color, sub) {
  if (G.state !== 'play') return;
  G.banners.push({ text, color, sub, t: 0 });
  if (G.banners.length > 2) G.banners.shift();
}

// ---------- Saut ----------
function bodyColor() {
  const b = find('skin', save.eq.skin).body;
  return b === 'lava' ? '#ff6a2b' : b === 'galaxy' ? '#7a12c4' : b;
}
function dustBurst(n, spread = 14) {
  for (let i = 0; i < n; i++) {
    G.parts.push({ k: 'dust', x: PX + rnd(-spread, spread), y: GROUND - 4, vx: rnd(-90, 50) - G.speed * .3, vy: rnd(-70, -20), life: 0, max: .4, s: 3 + Math.random() * 3 });
  }
}
function groundJump() {
  const P = CONFIG.physics;
  G.vy = -P.jumpVelocity;
  G.ground = false; G.jumps = 1;
  G.slide = 0; G.slideQueued = false;
  G.airTime = CONFIG.assist.coyoteTime + 1; // le coyote time ne doit pas offrir un deuxième saut « au sol »
  springStretch(G.spring, CONFIG.feel.squash.jumpStretch);
  dustBurst(3, 8);
  emitJumpFx(G.parts, save.eq.jumpfx, 'jump', PX, G.py, G.speed);
  G.stats.jumps++;
  sfx.jump();
}
function doubleJump() {
  const P = CONFIG.physics;
  G.vy = -P.jumpVelocity * P.doubleJumpFactor;
  G.jumps = 2; G.spin = 0;
  G.slideQueued = false;
  springStretch(G.spring, CONFIG.feel.squash.jumpStretch * .8);
  for (let i = 0; i < 2; i++) G.parts.push({ k: 'puff', x: PX, y: G.py, vx: -G.speed * .5, vy: 0, life: 0, max: .35, s: 4 + i * 4 });
  emitJumpFx(G.parts, save.eq.jumpfx, 'jump', PX, G.py, G.speed);
  G.stats.jumps++;
  sfx.jump2();
}
// Temps avant de toucher le sol si on ne fait rien (sert à mémoriser un appui juste avant l'atterrissage)
function timeToGround() {
  const P = CONFIG.physics;
  const g = P.gravity * P.fallGravityMult;
  const d = GROUND - G.py;
  return (-G.vy + Math.sqrt(Math.max(0, G.vy * G.vy + 2 * g * d))) / g;
}
function jumpPress() {
  G.held = true;
  if (G.state !== 'play') return;
  const A = CONFIG.assist;
  // 1. Au sol (même en pleine glissade), ou juste après l'avoir quitté (coyote time) : saut normal
  if (G.ground || (G.jumps === 0 && G.airTime <= A.coyoteTime)) { groundJump(); return; }
  // 2. On retombe et on touche presque le sol : on garde l'appui pour sauter dès l'atterrissage
  //    (au lieu de gaspiller le double saut à 2 cm du sol)
  if (G.vy > 0 && timeToGround() <= A.jumpBuffer) { G.buffer = A.jumpBuffer; G.slideQueued = false; return; }
  // 3. Sinon : double saut s'il reste
  if (G.jumps < 2) { doubleJump(); return; }
  // 4. Plus de saut disponible : on mémorise quand même, au cas où on atterrit très vite
  G.buffer = A.jumpBuffer;
}
function jumpRelease() {
  G.held = false;
  const P = CONFIG.physics;
  if (G.state === 'play' && G.vy < -P.jumpCutThreshold) G.vy *= P.jumpCutFactor;
}

// ---------- Glissade ----------
function startSlide() {
  G.slide = CONFIG.slide.duration;
  G.slideT = 0;
  G.slideQueued = false;
  G.stats.slides++;
  dustBurst(4, 10);
  sfx.slide();
}
function slidePress() {
  G.slideHeld = true;
  if (G.state !== 'play') return;
  G.buffer = 0;
  if (G.ground) {
    if (G.slide > 0) { G.slide = Math.max(G.slide, CONFIG.slide.duration); G.slideT = 0; } // relancer la glissade la prolonge
    else startSlide();
  } else {
    // En l'air : plongeon rapide, puis glissade dès l'atterrissage
    G.vy = Math.max(G.vy, CONFIG.slide.fastFall);
    G.slideQueued = true;
    G.held = false;
  }
}
function slideRelease() { G.slideHeld = false; }

function land() {
  const P = CONFIG.physics, F = CONFIG.feel;
  const impact = G.vy;
  G.py = GROUND; G.vy = 0; G.ground = true; G.jumps = 0; G.airTime = 0; G.spin = 0;
  const k = Math.max(0, Math.min(1, impact / (P.jumpVelocity * 1.2)));
  springSquash(G.spring, F.squash.landSquash * (.35 + .65 * k));
  dustBurst(Math.round(CONFIG.particles.landDust * (.5 + .5 * k)));
  emitJumpFx(G.parts, save.eq.jumpfx, 'land', PX, GROUND, G.speed);
  sfx.land(k);
  if (impact >= F.shake.landingMinSpeed) Feel.shake(F.shake.landing);
  if (G.slideQueued) { startSlide(); return; }
  // Saut mémorisé : il part tout de suite
  if (G.buffer > 0) {
    G.buffer = 0;
    groundJump();
    if (!G.held) G.vy *= P.jumpCutFactor; // touche déjà relâchée : petit saut, comme un appui bref
  }
}

// ---------- Collisions ----------
function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

// Boîtes de collision un peu plus petites que le dessin : le jeu pardonne les frôlements
function obstacleBox(o) {
  if (o.k === 'spike') return { x: o.x + 5, y: o.y + 10, w: o.w - 10, h: o.h - 10 };
  if (o.k === 'bar') return { x: o.x + 3, y: o.y, w: o.w - 6, h: o.h };
  return { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 };
}
function playerBox() {
  if (G.slide > 0) {
    const h = CONFIG.slide.height;
    return { x: PX - S / 2 + 6, y: G.py - h + 4, w: S - 12, h: h - 6 };
  }
  return { x: PX - S / 2 + 8, y: G.py - S + 8, w: S - 16, h: S - 10 };
}

function collectCoin(co) {
  co.got = true;
  G.coinsRun++;
  G.stats.coins++;
  coinGroupProgress(co.group);
  // Pièces ramassées à la suite : la note monte
  G.coinChain = (G.t - G.lastCoinT < CONFIG.audio.coinChainWindow) ? G.coinChain + 1 : 0;
  G.lastCoinT = G.t;
  sfx.coin(G.coinChain);
  for (let i = 0; i < CONFIG.particles.coinSparks; i++) {
    G.parts.push({ k: 'spark', x: co.x, y: co.y, vx: rnd(-140, 140) - G.speed * .4, vy: rnd(-240, -60), g: 600, life: 0, max: .45 });
  }
  G.parts.push({ k: 'ring', x: co.x, y: co.y, vx: -G.speed * .5, vy: 0, life: 0, max: .3, s: 8 });
  G.parts.push({ k: 'txt', text: '+1', x: co.x, y: co.y - 14, vx: -G.speed * .35, vy: -70, life: 0, max: .6, s: 16, c: '#ffe066' });
}

function die() {
  G.state = 'over';
  G.overAt = performance.now();
  G.slide = 0;
  // Impact : micro-pause, tremblement, son, morceaux
  Feel.hitStop(CONFIG.feel.hitStop.hit);
  Feel.shake(CONFIG.feel.shake.hit);
  sfx.hit();
  const col = bodyColor();
  for (let i = 0; i < CONFIG.particles.deathChunks; i++) {
    G.parts.push({ k: 'chunk', x: PX + rnd(-10, 10), y: G.py - S / 2 + rnd(-10, 10), vx: rnd(-260, 200), vy: rnd(-420, -120), g: 1100, life: 0, max: .9, s: 4 + Math.random() * 5, rot: Math.random() * 6, vr: rnd(-12, 12), c: col });
  }
  for (let i = 0; i < 5; i++) {
    G.parts.push({ k: 'star', x: PX, y: G.py - S, vx: rnd(-80, 80), vy: rnd(-160, -60), g: 300, life: 0, max: .8, s: 5, rot: 0, vr: 6, c: '#ffe066' });
  }
  // Petit rebond en arrière
  G.vy = -520; G.ground = false;
  springSquash(G.spring, .35);
  endRun();
}

// Fin de partie : pièces gagnées, records, sauvegarde
function endRun() {
  const points = Math.floor(G.points);
  const bonus = Math.floor(G.meters / 40);
  const earned = G.coinsRun + bonus;
  const prevBest = save.best;
  const record = points > save.best;
  save.coins += earned;
  if (record) save.best = points;
  save.bestMeters = Math.max(save.bestMeters, G.meters);
  G.lastResult = { points, meters: G.meters, picked: G.coinsRun, bonus, earned, record, prevBest, maxMult: Combo.maxMult, stats: { ...G.stats } };
  if (typeof onRunEnd === 'function') onRunEnd(G.lastResult);
  persist();
  $('pause').hidden = true;
  updateStats();
  renderShop();
  setTimeout(() => { if (G.state === 'over') showOverlay('over'); }, 650);
}

// ---------- Mise à jour ----------
function update(dt) {
  if (G.state === 'pause') return;
  G.t += dt;
  const P = CONFIG.physics, F = CONFIG.feel;

  Feel.update(dt, GROUND - G.py, G.state === 'menu' ? 0 : Math.min(1, speedRatio() + G.boostK * .5));

  // Forme du personnage : écrasé en glissade, un peu étiré en l'air
  if (G.slide > 0) springUpdate(G.spring, dt, .55, 1.3);
  else springUpdate(G.spring, dt, G.ground ? 1 : 1 + Math.min(1, Math.abs(G.vy) / P.jumpVelocity) * F.squash.airStretch);

  for (const b of G.banners) b.t += dt;
  while (G.banners.length && G.banners[0].t > 1.6) G.banners.shift();

  if (G.state === 'menu') {
    G.dist += CONFIG.speed.menu * dt;
    if (save.eq.trail === 'arcenciel') G.hist.push({ d: G.dist, y: G.py - S * .5 });
    emitTrail(G.parts, save.eq.trail, PX - S * .4, G.py - S * .5, true, CONFIG.speed.menu);
  }

  if (G.state === 'over' && !G.ground) {
    // Retombée après la collision
    G.vy += P.gravity * dt;
    G.py += G.vy * dt;
    if (G.py >= GROUND) { G.py = GROUND; G.vy = 0; G.ground = true; springSquash(G.spring, .3); sfx.land(.4); dustBurst(4); }
  }

  if (G.state === 'play') updatePlay(dt);

  while (G.hist.length && G.dist - G.hist[0].d > PX + 40) G.hist.shift();
  if (G.hist.length > 400) G.hist.splice(0, G.hist.length - 400);
  stepParts(G.parts, dt);
}

function updatePlay(dt) {
  const P = CONFIG.physics, F = CONFIG.feel;
  G.runT += dt;
  Director.update(dt);
  updatePowerUps(dt);
  G.invuln = Math.max(0, G.invuln - dt);
  G.boostK += ((G.power.boost > 0 ? 1 : 0) - G.boostK) * Math.min(1, dt * 4);
  G.speed = speedAt(G.runT) * (1 + Director.speedBonus) * (1 + G.boostK * CONFIG.powerups.boost.speedBonus);
  const dx = G.speed * dt;
  G.dist += dx;
  G.meters = Math.floor(G.dist / 12);
  G.points += dx / 12 * Combo.mult;   // les points de distance profitent du multiplicateur
  Biomes.update(dt, G.meters);

  // Physique du saut (gravité un peu plus forte en descente)
  if (!G.ground) {
    G.vy += P.gravity * (G.vy > 0 ? P.fallGravityMult : 1) * dt;
    G.py += G.vy * dt;
    G.airTime += dt;
    if (G.py >= GROUND) land();
  }
  G.buffer = Math.max(0, G.buffer - dt);
  if (G.jumps === 2) G.spin = Math.min(6.283, G.spin + dt * 16);

  // Glissade : dure CONFIG.slide.duration, ou plus si on garde la touche (jusqu'à maxHold)
  if (G.slide > 0) {
    G.slideT += dt;
    G.slide -= dt;
    if (G.slideHeld && G.slideT < CONFIG.slide.maxHold) G.slide = Math.max(G.slide, .05);
    if (Math.random() < .5) G.parts.push({ k: 'spark', x: PX - 6, y: GROUND - 2, vx: -G.speed * .6, vy: rnd(-90, -20), g: 500, life: 0, max: .3 });
    if (G.slide <= 0) { G.slide = 0; springStretch(G.spring, .12); }
  }

  // Séquences d'obstacles
  G.nextSpawn -= dx;
  if (G.nextSpawn <= 0) spawnNext();

  for (const o of G.obs) { o.x -= dx; if (o.k === 'bird') o.ph += dt * 14; }
  for (const co of G.coins) co.x -= dx;
  for (const it of G.items) it.x -= dx;

  const pb = playerBox();
  for (const o of G.obs) {
    if (o.dead) continue;
    if (hit(pb, obstacleBox(o)) && !absorbHit(o)) { die(); return; }
  }
  trackObstacles(pb);
  trackCoinGroups();

  const ph = G.slide > 0 ? CONFIG.slide.height : S;
  const cb = { x: PX - S / 2, y: G.py - ph, w: S, h: ph };
  for (const co of G.coins) {
    if (!co.got && hit(cb, { x: co.x - 11, y: co.y - 11, w: 22, h: 22 })) collectCoin(co);
  }
  for (const it of G.items) {
    if (!it.got && hit(cb, { x: it.x - 17, y: it.y - 17, w: 34, h: 34 })) collectPowerUp(it);
  }
  G.obs = G.obs.filter(o => o.x + o.w > -60 && !o.dead);
  G.coins = G.coins.filter(co => co.x > -40 && !co.got);
  G.items = G.items.filter(it => it.x > -40 && !it.got);

  // Petite poussière sous les pieds, quel que soit le cosmétique équipé
  if (G.ground && G.slide <= 0 && Math.random() < CONFIG.particles.runDust) {
    G.parts.push({ k: 'dust', x: PX - 10, y: GROUND - 2, vx: -G.speed * .5, vy: rnd(-40, -10), life: 0, max: .3, s: 2 + Math.random() * 2 });
  }
  // Traits de vitesse quand on va vite (et beaucoup en turbo)
  const sl = F.speedLines, ratio = Math.min(1, speedRatio() + G.boostK);
  if (!reduceMotion && ratio > sl.from && Math.random() < sl.rate * (ratio - sl.from) / (1 - sl.from) * (1 + G.boostK * 2)) {
    G.parts.push({ k: 'line', x: Feel.rightEdge(W, PX), y: rnd(20, GROUND - 20), vx: -G.speed * 2.4, vy: 0, life: 0, max: .6, s: rnd(30, 80) });
  }
  if (save.eq.trail === 'arcenciel') G.hist.push({ d: G.dist, y: G.py - S * .5 });
  emitTrail(G.parts, save.eq.trail, PX - S * .4, G.py - S * .5, G.ground, G.speed);
}

// ---------- Rendu ----------
function drawObstacles(c, b) {
  for (const o of G.obs) {
    if (o.k === 'spike') {
      for (let i = 0; i < o.n; i++) {
        const x = o.x + i * 22, hh = o.h * (i % 2 ? .82 : 1);
        c.fillStyle = b.obs;
        c.strokeStyle = b.obsHi; c.lineWidth = 2; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(x, GROUND + 1); c.lineTo(x + 11, GROUND - hh); c.lineTo(x + 22, GROUND + 1); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = b.obsHi;
        c.beginPath(); c.moveTo(x + 11, GROUND - hh); c.lineTo(x + 15, GROUND + 1); c.lineTo(x + 11, GROUND + 1); c.closePath(); c.fill();
      }
    } else if (o.k === 'bar') {
      // Poutre suspendue : un poteau qui descend du ciel, terminé par un bloc rayé bien visible
      const by = o.y + o.h - 20;
      c.fillStyle = b.obs;
      c.fillRect(o.x + 9, o.y, o.w - 18, o.h - 18);
      rr(c, o.x - 8, by, o.w + 16, 20, 5);
      c.fill();
      c.save();
      c.clip();
      c.strokeStyle = b.obsHi; c.lineWidth = 5;
      for (let sx = o.x - 30; sx < o.x + o.w + 30; sx += 12) {
        c.beginPath(); c.moveTo(sx, by + 20); c.lineTo(sx + 20, by); c.stroke();
      }
      c.restore();
      c.strokeStyle = b.obsHi; c.lineWidth = 2;
      rr(c, o.x - 8, by, o.w + 16, 20, 5);
      c.stroke();
    } else {
      const flap = Math.sin(o.ph) * 9;
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      c.fillStyle = b.bird;
      c.beginPath(); c.ellipse(cx, cy, 16, 11, 0, 0, 6.283); c.fill();
      c.beginPath(); c.moveTo(cx - 4, cy - 2); c.lineTo(cx + 8, cy - 2); c.lineTo(cx + 2, cy - 4 - flap * 1.4); c.closePath(); c.fill();
      c.fillStyle = '#ff9f43';
      c.beginPath(); c.moveTo(cx - 15, cy - 1); c.lineTo(cx - 24, cy + 2); c.lineTo(cx - 15, cy + 4); c.closePath(); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(cx - 8, cy - 3, 3.5, 0, 6.283); c.fill();
      c.fillStyle = '#1b1433';
      c.beginPath(); c.arc(cx - 9, cy - 3, 1.8, 0, 6.283); c.fill();
    }
  }
}
function drawCoins(c) {
  for (const co of G.coins) {
    const sx = Math.max(.2, Math.abs(Math.cos(G.t * 4 + co.x * .02)));
    c.fillStyle = '#ffd447';
    c.strokeStyle = '#d79a12'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(co.x, co.y, 10 * sx, 10, 0, 0, 6.283); c.fill(); c.stroke();
    c.fillStyle = '#fff4b8';
    c.beginPath(); c.ellipse(co.x - 2 * sx, co.y - 3, 3 * sx, 3, 0, 0, 6.283); c.fill();
  }
}

const HUD_FONT = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
function shadowText(c, text, x, y, size, color) {
  c.font = `${size}px ${HUD_FONT}`;
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.fillText(text, x + 2, y + 2);
  c.fillStyle = color;
  c.fillText(text, x, y);
}
function drawHud(c) {
  if (G.state === 'menu') return;
  c.save();
  c.textBaseline = 'top';
  // Points (en haut à gauche) avec le multiplicateur juste à côté
  const ptsText = fmt(Math.floor(G.points));
  shadowText(c, ptsText, 14, 12, 26, '#ffffff');
  const pw = c.measureText(ptsText).width;
  if (Combo.mult > 1 || Combo.steps > 0) {
    const bx = 14 + pw + 10, by = 14;
    c.fillStyle = Combo.mult >= CONFIG.combo.maxMultiplier ? '#ff9f5a' : '#ffd447';
    rr(c, bx, by, 40, 22, 11); c.fill();
    c.font = `16px ${HUD_FONT}`;
    c.fillStyle = '#2a1606';
    c.textAlign = 'center';
    c.fillText('×' + Combo.mult, bx + 20, by + 3);
    c.textAlign = 'left';
    // Barre de progression vers le niveau suivant
    c.fillStyle = 'rgba(0,0,0,.3)';
    rr(c, bx, by + 26, 40, 4, 2); c.fill();
    c.fillStyle = '#ffffff';
    rr(c, bx, by + 26, Math.max(4, 40 * Combo.progress()), 4, 2); c.fill();
  }
  // Pièces : le compteur grossit un instant à chaque pièce
  const pop = Math.max(0, 1 - (G.t - G.lastCoinT) * 6);
  c.fillStyle = '#ffd447'; c.strokeStyle = '#d79a12'; c.lineWidth = 2;
  c.beginPath(); c.arc(24, 56, 9 + pop * 3, 0, 6.283); c.fill(); c.stroke();
  shadowText(c, fmt(G.coinsRun), 40, 47 - pop * 3, 20 + pop * 6, '#ffffff');
  // Distance, plus discrète
  shadowText(c, fmt(G.meters) + ' m', 14, 74, 15, 'rgba(255,255,255,.8)');

  drawPowerUpHud(c);

  // Bandeau d'annonce au centre
  const b = G.banners[G.banners.length - 1];
  if (b) {
    const t = b.t;
    const pop2 = t < .15 ? .6 + t / .15 * .5 : Math.max(1, 1.1 - (t - .15) * .6);
    c.globalAlpha = t > 1.2 ? Math.max(0, 1 - (t - 1.2) / .4) : 1;
    c.textAlign = 'center';
    c.translate(W / 2, H * .42);
    c.scale(pop2, pop2);
    shadowText(c, b.text, 0, -16, 30, b.color || '#ffffff');
    if (b.sub) shadowText(c, b.sub, 0, 18, 15, 'rgba(255,255,255,.85)');
  }
  c.restore();
}

function render() {
  const biome = G.state === 'menu' ? 'crepuscule' : Biomes.current();
  const b = BG[biome];
  ctx.save();
  Feel.apply(ctx, W, H, PX, GROUND);
  if (G.state === 'menu') drawScene(ctx, W, H, biome, G.dist, G.t, GROUND);
  else Biomes.draw(ctx, W, H, G.dist, G.t, GROUND);
  drawCoins(ctx);
  drawPowerUpItems(ctx);
  drawObstacles(ctx, b);
  if (save.eq.trail === 'arcenciel') drawRainbow(ctx, G.hist, PX - S * .3, G.dist);
  drawParts(ctx, G.parts, biome);
  drawPlayerAura(ctx);
  const runPhase = (G.dist / (G.slide > 0 ? 14 : 9)) % 6.283;
  if (G.invuln > 0 && Math.floor(G.t * 12) % 2 === 0) ctx.globalAlpha = .45;
  drawChar(ctx, PX, G.py, S, G.t, save.eq, {
    run: G.state === 'over' ? 0 : runPhase,
    air: !G.ground,
    sx: G.spring.sx,
    sy: G.spring.sy,
    spin: G.jumps === 2 && G.spin < 6.283 ? G.spin : 0,
  });
  ctx.globalAlpha = 1;
  ctx.restore();
  drawHud(ctx);
}

let last = 0;
function frame(now) {
  const dt = Math.min(.033, (now - (last || now)) / 1000);
  last = now;
  if (Feel.freeze > 0) {
    // Micro-pause : on ne fait rien avancer, on redessine l'image figée
    Feel.freeze -= dt;
  } else {
    update(dt);
  }
  render();
  requestAnimationFrame(frame);
}
