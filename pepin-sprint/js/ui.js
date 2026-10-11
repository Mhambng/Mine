// Écrans superposés au jeu : accueil, pause, fin de partie.
'use strict';

const overlay = $('overlay');

function showOverlay(kind) {
  overlay.hidden = !kind;
  if (!kind) return;
  if (kind === 'menu') {
    overlay.innerHTML = `<div class="overlay-card">
      <h2>Pépin Sprint</h2>
      <p>Saute par-dessus les pics, glisse sous les poutres et attrape les bonus.</p>
      <button class="btn" type="button" data-act="play">Jouer</button>
      <p class="hint"><kbd>Espace</kbd> ou toucher : sauter (deux fois = double saut).<br><kbd>↓</kbd> ou glisser vers le bas : glissade.</p>
    </div>`;
  } else if (kind === 'pause') {
    overlay.innerHTML = `<div class="overlay-card">
      <h2>Pause</h2>
      <p class="big">${fmt(Math.floor(G.points))} points</p>
      <button class="btn" type="button" data-act="resume">Reprendre</button>
    </div>`;
  } else if (kind === 'over') {
    overlay.innerHTML = endScreenHtml(G.lastResult);
    overlay.querySelector('[data-act="play"]')?.focus({ preventScroll: true });
  }
}

function endScreenHtml(r) {
  return `<div class="overlay-card">
    ${r.record ? '<span class="record">Nouveau record</span>' : ''}
    <h2>${r.record ? 'Incroyable !' : 'Bien joué !'}</h2>
    <p class="big">${fmt(r.points)} points</p>
    <p>${fmt(r.meters)} m · combo max ×${r.maxMult} · +${fmt(r.earned)} pièces</p>
    <div class="row">
      <button class="btn" type="button" data-act="play">Encore !</button>
      <button class="btn ghost" type="button" data-act="shop">Boutique</button>
    </div>
  </div>`;
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
