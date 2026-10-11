// Boucle de jeu : état, physique, obstacles, pièces, rendu, écrans superposés, contrôles.
'use strict';

// ---------- Jeu ----------
const cv = $('game'), ctx = cv.getContext('2d');
const H = 320, GROUND = H - 56, PX = 96, S = 44;
const GRAV = 2300, JUMP = 780;
let W = 800;
const G = {
  state: 'menu', t: 0, runT: 0, speed: 0, dist: 0, score: 0, coinsRun: 0,
  py: GROUND, vy: 0, ground: true, jumps: 0, squash: 0, spin: 0,
  obs: [], coins: [], parts: [], hist: [], nextSpawn: 0, shake: 0, overAt: 0, lastResult: null,
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

function startRun() {
  Object.assign(G, {
    state: 'play', runT: 0, speed: 340, dist: 0, score: 0, coinsRun: 0,
    py: GROUND, vy: 0, ground: true, jumps: 0, squash: 0, spin: 0,
    obs: [], coins: [], hist: [], nextSpawn: 420, shake: 0,
  });
  $('pause').hidden = false;
  showOverlay(null);
}
function jumpPress() {
  if (G.state !== 'play') return;
  if (G.ground) {
    G.vy = -JUMP; G.ground = false; G.jumps = 1;
    sfx.jump();
  } else if (G.jumps < 2) {
    G.vy = -JUMP * .85; G.jumps = 2; G.spin = 0;
    for (let i = 0; i < 2; i++) G.parts.push({ k: 'puff', x: PX, y: G.py, vx: -G.speed * .5, vy: 0, life: 0, max: .35, s: 4 + i * 4 });
    sfx.jump2();
  }
}
function jumpRelease() {
  if (G.state === 'play' && G.vy < -260) G.vy *= .6;
}

function spawn() {
  const x = W + 40;
  let o;
  if (G.score > 120 && Math.random() < .28) {
    const high = Math.random() < .5;
    const bottom = high ? GROUND - 60 : GROUND - 28;
    o = { k: 'bird', x, y: bottom - 26, w: 40, h: 26, ph: Math.random() * 6 };
  } else {
    const n = 1 + Math.floor(Math.random() * (G.score > 300 ? 3 : 2));
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
  G.nextSpawn = G.speed * (.85 + Math.random() * .8) + 150 + o.w;
}

function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function die() {
  G.state = 'over';
  G.overAt = performance.now();
  G.shake = reduceMotion ? 0 : 1;
  sfx.die();
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
  setTimeout(() => { if (G.state === 'over') showOverlay('over'); }, 550);
}

function update(dt) {
  G.t += dt;
  G.squash = Math.max(0, G.squash - dt * 5);
  G.shake = Math.max(0, G.shake - dt * 3);
  if (G.state === 'pause') return;

  if (G.state === 'menu') {
    G.dist += 120 * dt;
    if (save.eq.trail === 'arcenciel') G.hist.push({ d: G.dist, y: G.py - S * .5 });
    emitTrail(G.parts, save.eq.trail, PX - S * .4, G.py - S * .5, true, 120);
  }

  if (G.state === 'play') {
    G.runT += dt;
    G.speed = Math.min(820, 340 + G.runT * 8);
    const dx = G.speed * dt;
    G.dist += dx;
    G.score = Math.floor(G.dist / 12);

    G.vy += GRAV * dt;
    G.py += G.vy * dt;
    if (G.py >= GROUND) {
      if (!G.ground) {
        G.squash = 1;
        for (let i = 0; i < 5; i++) G.parts.push({ k: 'dust', x: PX + rnd(-14, 14), y: GROUND - 4, vx: rnd(-80, 40) - G.speed * .3, vy: rnd(-60, -20), life: 0, max: .4, s: 3 + Math.random() * 3 });
      }
      G.py = GROUND; G.vy = 0; G.ground = true; G.jumps = 0;
    }
    if (G.jumps === 2) G.spin = Math.min(6.283, G.spin + dt * 16);

    G.nextSpawn -= dx;
    if (G.nextSpawn <= 0) spawn();

    for (const o of G.obs) { o.x -= dx; if (o.k === 'bird') o.ph += dt * 14; }
    for (const co of G.coins) co.x -= dx;
    G.obs = G.obs.filter(o => o.x + o.w > -40);
    G.coins = G.coins.filter(co => co.x > -30 && !co.got);

    const pb = { x: PX - S / 2 + 8, y: G.py - S + 8, w: S - 16, h: S - 10 };
    for (const o of G.obs) {
      const ob = o.k === 'spike' ? { x: o.x + 5, y: o.y + 10, w: o.w - 10, h: o.h - 10 } : { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 };
      if (hit(pb, ob)) { die(); break; }
    }
    const cb = { x: PX - S / 2, y: G.py - S, w: S, h: S };
    for (const co of G.coins) {
      if (!co.got && hit(cb, { x: co.x - 11, y: co.y - 11, w: 22, h: 22 })) {
        co.got = true;
        G.coinsRun++;
        sfx.coin();
        for (let i = 0; i < 6; i++) G.parts.push({ k: 'spark', x: co.x, y: co.y, vx: rnd(-120, 120) - G.speed * .4, vy: rnd(-220, -60), life: 0, max: .45 });
      }
    }
    if (save.eq.trail === 'arcenciel') G.hist.push({ d: G.dist, y: G.py - S * .5 });
    emitTrail(G.parts, save.eq.trail, PX - S * .4, G.py - S * .5, G.ground, G.speed);
  }

  while (G.hist.length && G.dist - G.hist[0].d > PX + 20) G.hist.shift();
  if (G.hist.length > 400) G.hist.splice(0, G.hist.length - 400);
  stepParts(G.parts, dt);
}

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
  const label = fmt(G.coinsRun);
  c.fillStyle = '#ffd447'; c.strokeStyle = '#d79a12'; c.lineWidth = 2;
  c.beginPath(); c.arc(24, 54, 9, 0, 6.283); c.fill(); c.stroke();
  c.font = '20px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  c.fillStyle = '#ffffff';
  c.fillText(label, 40, 44);
  c.restore();
}

function render() {
  const b = BG[save.eq.bg] || BG.crepuscule;
  ctx.save();
  if (G.shake > 0) ctx.translate(rnd(-1, 1) * 8 * G.shake, rnd(-1, 1) * 6 * G.shake);
  drawScene(ctx, W, H, save.eq.bg, G.dist, G.t, GROUND);
  drawCoins(ctx);
  drawObstacles(ctx, b);
  if (save.eq.trail === 'arcenciel') drawRainbow(ctx, G.hist, PX - S * .3, G.dist);
  drawParts(ctx, G.parts, save.eq.bg);
  const runPhase = (G.dist / 9) % 6.283;
  drawChar(ctx, PX, G.py, S, G.t, save.eq, {
    run: G.state === 'over' ? 0 : runPhase,
    air: !G.ground,
    squash: G.squash,
    spin: G.jumps === 2 && G.spin < 6.283 ? G.spin : 0,
  });
  ctx.restore();
  drawHud(ctx);
}

let last = 0;
function frame(now) {
  const dt = Math.min(.033, (now - (last || now)) / 1000);
  last = now;
  update(dt);
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
  if (act === 'play') startRun();
  else if (act === 'resume') resume();
  else if (act === 'shop') $('shop').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  $('pause').hidden = true;
  showOverlay('pause');
}
function resume() {
  if (G.state !== 'pause') return;
  G.state = 'play';
  $('pause').hidden = false;
  showOverlay(null);
}

// ---------- Contrôles ----------
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  if (JUMP_KEYS.includes(e.code)) {
    if (!$('modal').hidden) return;
    if (G.state === 'play') { e.preventDefault(); if (!e.repeat) jumpPress(); return; }
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
  if (G.state === 'play') { e.preventDefault(); jumpPress(); }
  else if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 600)) startRun();
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
