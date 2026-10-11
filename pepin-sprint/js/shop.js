// Boutique : aperçus, achats, équipement, coffre mystère.
'use strict';

// ---------- Aperçus (boutique) ----------
function renderPreview(cv, cat, id, w = 200, h = 150) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const eq = { ...save.eq, [cat]: id };
  const bg = 'crepuscule';  // les aperçus utilisent toujours la même zone
  const gy = h * .8;
  drawScene(c, w, h, bg, 60, 1.2, gy);
  const px = cat === 'trail' ? w * .66 : w / 2;
  const s = h * .32;
  if (cat === 'jumpfx') {
    // Aperçu d'un effet de saut : Pépin en l'air au-dessus de l'effet de réception
    const parts = [];
    emitJumpFx(parts, id, 'land', px, gy, 0);
    if (id === 'classique') for (let i = 0; i < 6; i++) parts.push({ k: 'dust', x: px + rnd(-16, 16), y: gy - 3, vx: rnd(-40, 40), vy: rnd(-40, -10), life: 0, max: .5, s: 3 + Math.random() * 3 });
    for (let i = 0; i < 9; i++) stepParts(parts, 1 / 60);
    emitJumpFx(parts, id, 'jump', px, gy, 0);
    for (let i = 0; i < 4; i++) stepParts(parts, 1 / 60);
    drawParts(c, parts, bg);
    drawChar(c, px, gy - s * .9, s, 1.0, eq, { air: true, sx: .9, sy: 1.12 });
    return;
  }
  if (cat === 'trail') {
    const parts = [], hist = [];
    let d = 0;
    const sp = 170;
    for (let i = 0; i < 60; i++) {
      const y = gy - s * .5;
      emitTrail(parts, id, px - s * .4, y, true, sp);
      stepParts(parts, 1 / 60);
      d += sp / 60;
      hist.push({ d, y });
    }
    if (id === 'arcenciel') drawRainbow(c, hist, px - s * .3, d);
    drawParts(c, parts, bg);
  }
  drawChar(c, px, gy, s, 1.0, eq, { run: .7 });
}
function drawChestArt() {
  const cv = $('chest-art'), c = cv.getContext('2d');
  c.clearRect(0, 0, 144, 120);
  c.save(); c.scale(2, 2);
  c.fillStyle = 'rgba(0,0,0,.25)';
  c.beginPath(); c.ellipse(36, 54, 28, 5, 0, 0, 6.283); c.fill();
  c.fillStyle = '#8a4b26'; rr(c, 10, 26, 52, 28, 4); c.fill();
  c.fillStyle = '#a65d30'; c.beginPath(); c.moveTo(10, 28); c.quadraticCurveTo(36, 4, 62, 28); c.closePath(); c.fill();
  c.fillStyle = '#ffd447';
  c.fillRect(10, 26, 52, 5);
  c.fillRect(20, 14, 5, 40); c.fillRect(47, 14, 5, 40);
  rr(c, 31, 28, 10, 12, 2); c.fill();
  c.fillStyle = '#5a2e14'; c.fillRect(35, 33, 2, 4);
  c.restore();
}


// ---------- Boutique ----------
let tab = 'skin';
try { const t = localStorage.getItem(KEY + '-tab'); if (CAT[t]) tab = t; } catch (e) { /* rien */ }
const CHEST_PRICE = 200;

function updateStats() {
  $('coins').textContent = fmt(save.coins);
  $('best').textContent = fmt(save.best) + ' pts';
  $('mute').textContent = save.muted ? 'Son : non' : 'Son : oui';
}
function renderTabs() {
  $('tabs').innerHTML = CATS.map(c => `<button class="tab" role="tab" type="button" id="tab-${c.id}" data-tab="${c.id}" aria-selected="${c.id === tab}">${c.label}<span class="count">${save.owned[c.id].length}/${CAT[c.id].length}</span></button>`).join('');
}
function renderShop() {
  renderTabs();
  const grid = $('grid');
  grid.setAttribute('aria-labelledby', 'tab-' + tab);
  grid.innerHTML = '';
  for (const it of CAT[tab]) {
    const owned = save.owned[tab].includes(it.id);
    const eq = save.eq[tab] === it.id;
    const card = document.createElement('div');
    card.className = 'item' + (eq ? ' equipped' : '');
    const cvs = document.createElement('canvas');
    cvs.setAttribute('aria-hidden', 'true');
    card.appendChild(cvs);
    const top = document.createElement('div');
    top.className = 'item-top';
    top.innerHTML = `<span class="name">${it.name}</span><span class="chip r-${it.rar}">${RAR[it.rar].label}</span>`;
    card.appendChild(top);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn small' + (eq || owned ? ' ghost' : '');
    btn.dataset.id = it.id;
    if (eq) { btn.textContent = 'Équipé'; btn.disabled = true; }
    else if (owned) { btn.textContent = 'Équiper'; btn.dataset.act = 'equip'; }
    else {
      btn.innerHTML = `<span class="coin-ico" aria-hidden="true"></span>${fmt(it.price)}`;
      btn.setAttribute('aria-label', `Acheter ${it.name} pour ${it.price} pièces`);
      btn.dataset.act = 'buy';
      if (save.coins < it.price) { btn.disabled = true; btn.title = `Il te manque ${it.price - save.coins} pièces`; }
    }
    card.appendChild(btn);
    grid.appendChild(card);
    renderPreview(cvs, tab, it.id);
  }
  const chestBtn = $('open-chest');
  const left = CATS.reduce((n, c) => n + CAT[c.id].length - save.owned[c.id].length, 0);
  chestBtn.innerHTML = left ? `<span class="coin-ico" aria-hidden="true"></span> Ouvrir · ${CHEST_PRICE}` : 'Tout est débloqué';
  chestBtn.disabled = !left || save.coins < CHEST_PRICE;
}
$('tabs').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]')?.dataset.tab;
  if (!t || t === tab) return;
  tab = t;
  try { localStorage.setItem(KEY + '-tab', t); } catch (err) { /* rien */ }
  renderShop();
});
$('grid').addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const it = find(tab, b.dataset.id);
  if (b.dataset.act === 'buy') {
    if (save.coins < it.price) return;
    save.coins -= it.price;
    save.owned[tab].push(it.id);
    save.eq[tab] = it.id;
    sfx.buy();
    toast(`${it.name} acheté et équipé`);
  } else {
    save.eq[tab] = it.id;
    toast(`${it.name} équipé`);
  }
  if (tab === 'trail') { G.parts = []; G.hist = []; }
  persist();
  updateStats();
  renderShop();
  $('grid').querySelector(`[data-id="${it.id}"]`)?.focus({ preventScroll: true });
});

let toastTimer = 0;
function toast(msg, ms = 1800) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

// Coffre mystère
let revealed = null;
function rollChest() {
  const pool = {};
  for (const c of CATS) for (const it of CAT[c.id]) {
    if (!save.owned[c.id].includes(it.id)) (pool[it.rar] = pool[it.rar] || []).push({ cat: c.id, it });
  }
  const rars = Object.keys(pool);
  if (!rars.length) return null;
  const total = rars.reduce((s, r) => s + RAR[r].weight, 0);
  let x = Math.random() * total;
  for (const r of rars) {
    x -= RAR[r].weight;
    if (x <= 0) return pick(pool[r]);
  }
  return pick(pool[rars[rars.length - 1]]);
}
$('open-chest').addEventListener('click', () => {
  if (save.coins < CHEST_PRICE) return;
  const got = rollChest();
  if (!got) return;
  save.coins -= CHEST_PRICE;
  save.owned[got.cat].push(got.it.id);
  persist();
  updateStats();
  revealed = got;
  const modal = $('modal'), card = modal.querySelector('.modal-card');
  const cvs = $('reveal');
  card.classList.remove('glow');
  card.style.color = '';
  modal.hidden = false;
  $('reveal-name').textContent = 'Ouverture…';
  $('reveal-chip').hidden = true;
  $('reveal-cat').textContent = '';
  $('reveal-equip').hidden = true;
  const c = cvs.getContext('2d');
  cvs.width = 520; cvs.height = 390;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#31275c'; c.fillRect(0, 0, 520, 390);
  c.drawImage($('chest-art'), 188, 140, 144, 120);
  cvs.classList.add('shaking');
  $('reveal-close').focus();
  setTimeout(() => {
    cvs.classList.remove('shaking');
    renderPreview(cvs, got.cat, got.it.id, 260, 195);
    const chip = $('reveal-chip');
    chip.hidden = false;
    chip.className = 'chip r-' + got.it.rar;
    chip.textContent = RAR[got.it.rar].label;
    $('reveal-name').textContent = got.it.name;
    $('reveal-cat').textContent = CATS.find(c => c.id === got.cat).one + ' · nouveau';
    $('reveal-equip').hidden = false;
    card.className = 'modal-card glow r-' + got.it.rar;
    sfx.chest();
    renderShop();
  }, reduceMotion ? 150 : 900);
});
function closeModal() {
  $('modal').hidden = true;
  $('modal').querySelector('.modal-card').className = 'modal-card';
  $('open-chest').focus({ preventScroll: true });
}
$('reveal-close').addEventListener('click', closeModal);
$('reveal-equip').addEventListener('click', () => {
  if (!revealed) return;
  save.eq[revealed.cat] = revealed.it.id;
  if (revealed.cat === 'trail') { G.parts = []; G.hist = []; }
  persist();
  tab = revealed.cat;
  toast(`${revealed.it.name} équipé`);
  renderShop();
  closeModal();
});
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });
window.addEventListener('keydown', e => { if (e.code === 'Escape' && !$('modal').hidden) closeModal(); });
