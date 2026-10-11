// Boucle de jeu : état, physique, obstacles, pièces, rendu, écrans superposés, contrôles.
// Les réglages (vitesse, saut, sensations) sont dans js/config.js.
'use strict';

// ---------- État ----------
const cv = $('game'), ctx = cv.getContext('2d');
const H = CONFIG.world.height;
const GROUND = H - CONFIG.world.groundOffset;
const PX = CONFIG.world.playerX;
const S = CONFIG.world.playerSize;
let W = 800;

const G = {
  state: 'menu',         // menu | play | pause | over
  t: 0, runT: 0, speed: 0, dist: 0, score: 0, coinsRun: 0,
  // Personnage
  py: GROUND, vy: 0, ground: true, jumps: 0, spin: 0,
  airTime: 0,            // temps passé en l'air (pour le « coyote time »)
  buffer: 0,             // saut mémorisé en attente d'atterrissage
  held: false,           // la touche de saut est-elle maintenue ?
  spring: makeSpring(),  // étirement / écrasement
  coinChain: 0, lastCoinT: -9,
  // Monde
  obs: [], coins: [], parts: [], hist: [], nextSpawn: 0,
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

// Vitesse : monte vite au début puis se stabilise vers le maximum
function speedAt(t) {
  const sp = CONFIG.speed;
  return sp.start + (sp.max - sp.start) * (1 - Math.exp(-t / sp.rampSeconds));
}
function speedRatio() {
  const sp = CONFIG.speed;
  return Math.max(0, Math.min(1, (G.speed - sp.start) / (sp.max - sp.start)));
}

function startRun() {
  Object.assign(G, {
    state: 'play', runT: 0, speed: CONFIG.speed.start, dist: 0, score: 0, coinsRun: 0,
    py: GROUND, vy: 0, ground: true, jumps: 0, spin: 0, airTime: 0, buffer: 0,
    spring: makeSpring(), coinChain: 0, lastCoinT: -9,
    obs: [], coins: [], hist: [], nextSpawn: CONFIG.spawn.firstGap,
  });
  Feel.reset();
  $('pause').hidden = false;
  showOverlay(null);
  sfx.start();
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
  G.airTime = CONFIG.assist.coyoteTime + 1; // le coyote time ne doit pas offrir un deuxième saut « au sol »
  springStretch(G.spring, CONFIG.feel.squash.jumpStretch);
  dustBurst(3, 8);
  sfx.jump();
}
function doubleJump() {
  const P = CONFIG.physics;
  G.vy = -P.jumpVelocity * P.doubleJumpFactor;
  G.jumps = 2; G.spin = 0;
  springStretch(G.spring, CONFIG.feel.squash.jumpStretch * .8);
  for (let i = 0; i < 2; i++) G.parts.push({ k: 'puff', x: PX, y: G.py, vx: -G.speed * .5, vy: 0, life: 0, max: .35, s: 4 + i * 4 });
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
  // 1. Au sol, ou juste après l'avoir quitté (coyote time) : saut normal
  if (G.ground || (G.jumps === 0 && G.airTime <= A.coyoteTime)) { groundJump(); return; }
  // 2. On retombe et on touche presque le sol : on garde l'appui pour sauter dès l'atterrissage
  //    (au lieu de gaspiller le double saut à 2 cm du sol)
  if (G.vy > 0 && timeToGround() <= A.jumpBuffer) { G.buffer = A.jumpBuffer; return; }
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
function land() {
  const P = CONFIG.physics, F = CONFIG.feel;
  const impact = G.vy;
  G.py = GROUND; G.vy = 0; G.ground = true; G.jumps = 0; G.airTime = 0; G.spin = 0;
  const k = Math.max(0, Math.min(1, impact / (P.jumpVelocity * 1.2)));
  springSquash(G.spring, F.squash.landSquash * (.35 + .65 * k));
  dustBurst(Math.round(CONFIG.particles.landDust * (.5 + .5 * k)));
  sfx.land(k);
  if (impact >= F.shake.landingMinSpeed) Feel.shake(F.shake.landing);
  // Saut mémorisé : il part tout de suite
  if (G.buffer > 0) {
    G.buffer = 0;
    groundJump();
    if (!G.held) G.vy *= P.jumpCutFactor; // touche déjà relâchée : petit saut, comme un appui bref
  }
}

// ---------- Obstacles et pièces ----------
function spawn() {
  const C = CONFIG.spawn;
  const x = Feel.rightEdge(W, PX) + 40; // juste hors de l'écran, même quand la caméra recule
  let o;
  if (G.score > C.birdFromScore && Math.random() < C.birdChance) {
    const high = Math.random() < .5;
    const bottom = high ? GROUND - 60 : GROUND - 28;
    o = { k: 'bird', x, y: bottom - 26, w: 40, h: 26, ph: Math.random() * 6 };
  } else {
    const n = 1 + Math.floor(Math.random() * (G.score > C.tripleSpikeFromScore ? 3 : 2));
    const h = 30 + Math.random() * 22;
    o = { k: 'spike', x, y: GROUND - h, w: n * 22, h, n };
  }
  G.obs.push(o);
  const r = Math.random();
  if (r < .45 && o.k === 'spike') {
    for (let i = -2; i <= 2; i++) G.coins.push({ x: o.x + o.w / 2 + i * 34, y: GROUND - 70 - 78 * (1 - i * i / 6) });
  } else if (r < .8) {
    const start = o.x + o.w + G.speed * .4;
    const y = (o.k === 'bird' && o.y > GROUND - 60) ? GROUND - 130 : GROUND - 22;
    for (let i = 0; i < 5; i++) G.coins.push({ x: start + i * 30, y });
  }
  G.nextSpawn = G.speed * (C.gapSeconds + Math.random() * C.gapRandomSeconds) + C.gapExtra + o.w;
}

function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function collectCoin(co) {
  co.got = true;
  G.coinsRun++;
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

  const bonus = Math.floor(G.score / 40);
  const earned = G.coinsRun + bonus;
  const record = G.score > save.best;
  save.coins += earned;
  if (record) save.best = G.score;
  persist();
  G.lastResult = { score: G.score, picked: G.coinsRun, bonus, earned, record };
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

  Feel.update(dt, GROUND - G.py, G.state === 'menu' ? 0 : speedRatio());
  const stretchTarget = G.ground ? 1 : 1 + Math.min(1, Math.abs(G.vy) / P.jumpVelocity) * F.squash.airStretch;
  springUpdate(G.spring, dt, stretchTarget);

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

  if (G.state === 'play') {
    G.runT += dt;
    G.speed = speedAt(G.runT);
    const dx = G.speed * dt;
    G.dist += dx;
    G.score = Math.floor(G.dist / 12);

    // Physique du saut (gravité un peu plus forte en descente)
    if (!G.ground) {
      G.vy += P.gravity * (G.vy > 0 ? P.fallGravityMult : 1) * dt;
      G.py += G.vy * dt;
      G.airTime += dt;
      if (G.py >= GROUND) land();
    }
    G.buffer = Math.max(0, G.buffer - dt);
    if (G.jumps === 2) G.spin = Math.min(6.283, G.spin + dt * 16);

    G.nextSpawn -= dx;
    if (G.nextSpawn <= 0) spawn();

    for (const o of G.obs) { o.x -= dx; if (o.k === 'bird') o.ph += dt * 14; }
    for (const co of G.coins) co.x -= dx;
    G.obs = G.obs.filter(o => o.x + o.w > -60);
    G.coins = G.coins.filter(co => co.x > -40 && !co.got);

    const pb = { x: PX - S / 2 + 8, y: G.py - S + 8, w: S - 16, h: S - 10 };
    for (const o of G.obs) {
      const ob = o.k === 'spike' ? { x: o.x + 5, y: o.y + 10, w: o.w - 10, h: o.h - 10 } : { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 };
      if (hit(pb, ob)) { die(); break; }
    }
    if (G.state === 'play') {
      const cb = { x: PX - S / 2, y: G.py - S, w: S, h: S };
      for (const co of G.coins) {
        if (!co.got && hit(cb, { x: co.x - 11, y: co.y - 11, w: 22, h: 22 })) collectCoin(co);
      }

      // Petite poussière sous les pieds, quel que soit le cosmétique équipé
      if (G.ground && Math.random() < CONFIG.particles.runDust) {
        G.parts.push({ k: 'dust', x: PX - 10, y: GROUND - 2, vx: -G.speed * .5, vy: rnd(-40, -10), life: 0, max: .3, s: 2 + Math.random() * 2 });
      }
      // Traits de vitesse quand on va vite
      const sl = F.speedLines, ratio = speedRatio();
      if (!reduceMotion && ratio > sl.from && Math.random() < sl.rate * (ratio - sl.from) / (1 - sl.from)) {
        G.parts.push({ k: 'line', x: Feel.rightEdge(W, PX), y: rnd(20, GROUND - 20), vx: -G.speed * 2.4, vy: 0, life: 0, max: .6, s: rnd(30, 80) });
      }
      if (save.eq.trail === 'arcenciel') G.hist.push({ d: G.dist, y: G.py - S * .5 });
      emitTrail(G.parts, save.eq.trail, PX - S * .4, G.py - S * .5, G.ground, G.speed);
    }
  }

  while (G.hist.length && G.dist - G.hist[0].d > PX + 40) G.hist.shift();
  if (G.hist.length > 400) G.hist.splice(0, G.hist.length - 400);
  stepParts(G.parts, dt);
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
function drawHud(c) {
  if (G.state === 'menu') return;
  c.save();
  c.font = '24px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  c.textBaseline = 'top';
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.fillText(fmt(G.score) + ' m', 16, 14);
  c.fillStyle = '#ffffff';
  c.fillText(fmt(G.score) + ' m', 14, 12);
  // Le compteur de pièces grossit un instant à chaque pièce
  const pop = Math.max(0, 1 - (G.t - G.lastCoinT) * 6);
  c.fillStyle = '#ffd447'; c.strokeStyle = '#d79a12'; c.lineWidth = 2;
  c.beginPath(); c.arc(24, 54, 9 + pop * 3, 0, 6.283); c.fill(); c.stroke();
  c.font = `${20 + pop * 6}px "Lilita One", "Arial Rounded MT Bold", sans-serif`;
  c.fillStyle = '#ffffff';
  c.fillText(fmt(G.coinsRun), 40, 44 - pop * 3);
  c.restore();
}

function render() {
  const b = BG[save.eq.bg] || BG.crepuscule;
  ctx.save();
  Feel.apply(ctx, W, H, PX, GROUND);
  drawScene(ctx, W, H, save.eq.bg, G.dist, G.t, GROUND);
  drawCoins(ctx);
  drawObstacles(ctx, b);
  if (save.eq.trail === 'arcenciel') drawRainbow(ctx, G.hist, PX - S * .3, G.dist);
  drawParts(ctx, G.parts, save.eq.bg);
  const runPhase = (G.dist / 9) % 6.283;
  drawChar(ctx, PX, G.py, S, G.t, save.eq, {
    run: G.state === 'over' ? 0 : runPhase,
    air: !G.ground,
    sx: G.spring.sx,
    sy: G.spring.sy,
    spin: G.jumps === 2 && G.spin < 6.283 ? G.spin : 0,
  });
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

// ---------- Écrans superposés ----------
const overlay = $('overlay');
function showOverlay(kind) {
  overlay.hidden = !kind;
  if (!kind) return;
  if (kind === 'menu') {
    overlay.innerHTML = `<div class="overlay-card">
      <h2>Pépin Sprint</h2>
      <p>Saute par-dessus les pics, évite les oiseaux et ramasse un maximum de pièces.</p>
      <button class="btn" type="button" data-act="play">Jouer</button>
      <p class="hint"><kbd>Espace</kbd> ou toucher l’écran pour sauter. Appuie deux fois pour un double saut.</p>
    </div>`;
  } else if (kind === 'pause') {
    overlay.innerHTML = `<div class="overlay-card">
      <h2>Pause</h2>
      <p class="big">${fmt(G.score)} m</p>
      <button class="btn" type="button" data-act="resume">Reprendre</button>
    </div>`;
  } else if (kind === 'over') {
    const r = G.lastResult;
    overlay.innerHTML = `<div class="overlay-card">
      ${r.record ? '<span class="record">Nouveau record</span>' : ''}
      <h2>Aïe !</h2>
      <p class="big">${fmt(r.score)} m</p>
      <p>+${fmt(r.earned)} pièces : ${fmt(r.picked)} ramassées et ${fmt(r.bonus)} de bonus distance</p>
      <div class="row">
        <button class="btn" type="button" data-act="play">Rejouer</button>
        <button class="btn ghost" type="button" data-act="shop">Boutique</button>
      </div>
    </div>`;
  }
}
overlay.addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act) sfx.click();
  if (act === 'play') startRun();
  else if (act === 'resume') resume();
  else if (act === 'shop') $('shop').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  $('pause').hidden = true;
  showOverlay('pause');
  sfx.pause();
}
function resume() {
  if (G.state !== 'pause') return;
  G.state = 'play';
  $('pause').hidden = false;
  showOverlay(null);
  sfx.resume();
}

// ---------- Contrôles ----------
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (JUMP_KEYS.includes(e.code)) {
    if (!$('modal').hidden) return;
    if (G.state === 'play') { e.preventDefault(); if (!e.repeat) jumpPress(); return; }
    G.held = true;
    if (tag === 'BUTTON' || tag === 'INPUT') return;
    if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 600)) { e.preventDefault(); startRun(); }
    else if (G.state === 'pause') { e.preventDefault(); resume(); }
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (G.state === 'play') pauseGame();
    else if (G.state === 'pause') resume();
  }
});
window.addEventListener('keyup', e => { if (JUMP_KEYS.includes(e.code)) jumpRelease(); });
$('screen').addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  if (G.state === 'play') { e.preventDefault(); jumpPress(); return; }
  G.held = true;
  if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 600)) startRun();
  else if (G.state === 'pause') resume();
});
window.addEventListener('pointerup', jumpRelease);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
$('pause').addEventListener('click', pauseGame);
$('mute').addEventListener('click', () => {
  save.muted = !save.muted;
  persist();
  $('mute').textContent = save.muted ? 'Son : non' : 'Son : oui';
});
