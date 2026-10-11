// Boutique : aperçus, vitrine du jour, achats (avec confirmation), équipement.
// Tout se paie en pièces gagnées en jouant. Aucun objet n'est tiré au hasard.
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
    if (id === 'classique') for (let i = 0; i < 6; i++) addPart(parts, 'dust', px + rnd(-16, 16), gy - 3, rnd(-40, 40), rnd(-40, -10), .5, 3 + Math.random() * 3);
    for (let i = 0; i < 9; i++) stepParts(parts, 1 / 60);
    emitJumpFx(parts, id, 'jump', px, gy, 0);
    for (let i = 0; i < 4; i++) stepParts(parts, 1 / 60);
    drawParts(c, parts, bg);
    clearParts(parts);
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
    clearParts(parts);
  }
  drawChar(c, px, gy, s, 1.0, eq, { run: .7 });
}
// ---------- Boutique ----------
let tab = 'skin';
try { const t = localStorage.getItem(KEY + '-tab'); if (CAT[t]) tab = t; } catch (e) { /* rien */ }

function updateStats() {
  $('coins').textContent = fmt(save.coins);
  $('best').textContent = fmt(save.best) + ' pts';
  $('mute').textContent = save.muted ? 'Son : non' : 'Son : oui';
}
function renderTabs() {
  $('tabs').innerHTML = CATS.map(c => `<button class="tab" role="tab" type="button" id="tab-${c.id}" data-tab="${c.id}" aria-selected="${c.id === tab}">${c.label}<span class="count">${save.owned[c.id].length}/${CAT[c.id].length}</span></button>`).join('');
}

// Une carte d'objet (aperçu, nom, rareté, bouton)
function itemCard(cat, it, showCat) {
  const owned = save.owned[cat].includes(it.id);
  const eq = save.eq[cat] === it.id;
  const card = document.createElement('div');
  card.className = 'item' + (eq ? ' equipped' : '');
  const cvs = document.createElement('canvas');
  cvs.setAttribute('aria-hidden', 'true');
  card.appendChild(cvs);
  const top = document.createElement('div');
  top.className = 'item-top';
  top.innerHTML = `<span class="name">${it.name}</span><span class="chip r-${it.rar}">${RAR[it.rar].label}</span>`
    + (showCat ? `<span class="item-cat">${CATS.find(c => c.id === cat).one}</span>` : '');
  card.appendChild(top);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn small' + (eq || owned ? ' ghost' : '');
  btn.dataset.id = it.id;
  btn.dataset.cat = cat;
  if (eq) { btn.textContent = 'Équipé'; btn.disabled = true; }
  else if (owned) { btn.textContent = 'Équiper'; btn.dataset.act = 'equip'; }
  else {
    btn.innerHTML = `<span class="coin-ico" aria-hidden="true"></span>${fmt(it.price)}`;
    btn.setAttribute('aria-label', `Acheter ${it.name} pour ${it.price} pièces`);
    btn.dataset.act = 'buy';
    if (save.coins < it.price) { btn.disabled = true; btn.title = `Il te manque ${it.price - save.coins} pièces`; }
  }
  card.appendChild(btn);
  renderPreview(cvs, cat, it.id);
  return card;
}

// Vitrine du jour : 3 objets pas encore possédés, mis en avant (même prix, aucun compte à rebours)
function featuredToday() {
  const rand = seededRandom('vitrine-' + todayKey());
  const pool = [];
  for (const c of CATS) for (const it of CAT[c.id]) if (it.price > 0) pool.push({ cat: c.id, it });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.filter(p => !save.owned[p.cat].includes(p.it.id)).slice(0, 3);
}

function renderShop() {
  renderTabs();
  const feat = featuredToday();
  $('featured').hidden = !feat.length;
  const fg = $('featured-grid');
  fg.innerHTML = '';
  for (const f of feat) fg.appendChild(itemCard(f.cat, f.it, true));

  const grid = $('grid');
  grid.setAttribute('aria-labelledby', 'tab-' + tab);
  grid.innerHTML = '';
  for (const it of CAT[tab]) grid.appendChild(itemCard(tab, it, false));
}
$('tabs').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]')?.dataset.tab;
  if (!t || t === tab) return;
  tab = t;
  try { localStorage.setItem(KEY + '-tab', t); } catch (err) { /* rien */ }
  renderShop();
});

// Achat en deux temps : le premier appui demande confirmation (« Confirmer ? »), le second achète.
// Évite les achats par erreur, surtout sur écran tactile.
let pendingBuy = null, pendingTimer = 0;
function onShopClick(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const cat = b.dataset.cat;
  const it = find(cat, b.dataset.id);
  if (b.dataset.act === 'buy') {
    if (save.coins < it.price) return;
    const key = cat + ':' + it.id;
    if (pendingBuy !== key) {
      // Premier appui : on demande confirmation
      renderShop();
      pendingBuy = key;
      document.querySelectorAll(`button[data-cat="${cat}"][data-id="${it.id}"]`).forEach(x => {
        x.classList.add('confirm');
        x.innerHTML = `Confirmer · <span class="coin-ico" aria-hidden="true"></span>${fmt(it.price)}`;
      });
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => { pendingBuy = null; renderShop(); }, 3500);
      sfx.click();
      return;
    }
    pendingBuy = null;
    clearTimeout(pendingTimer);
    save.coins -= it.price;
    save.owned[cat].push(it.id);
    save.eq[cat] = it.id;
    sfx.buy();
    toast(`${it.name} acheté et équipé`);
  } else {
    save.eq[cat] = it.id;
    sfx.click();
    toast(`${it.name} équipé`);
  }
  if (cat === 'trail') { clearParts(G.parts); G.hist.length = 0; }
  persist();
  updateStats();
  renderShop();
  document.querySelector(`#grid [data-id="${it.id}"]`)?.focus({ preventScroll: true });
}
$('grid').addEventListener('click', onShopClick);
$('featured-grid').addEventListener('click', onShopClick);

let toastTimer = 0;
function toast(msg, ms = 1800) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}
