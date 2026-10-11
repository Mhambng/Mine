// Contrôles : clavier, souris et écran tactile.
//   Sauter    : Espace, flèche du haut, W, clic ou toucher l'écran (garder appuyé = saut plus haut)
//   Glisser   : flèche du bas, S, ou glisser le doigt vers le bas (en l'air : plongeon puis glissade)
//   Pause     : P ou Échap
// Toute la zone de jeu est une zone de tap : aucune précision n'est demandée.
'use strict';

const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'];
const SLIDE_KEYS = ['ArrowDown', 'KeyS'];

window.addEventListener('keydown', e => {
  const tag = e.target.tagName;
  // Une fenêtre est ouverte : le clavier sert à la fenêtre, pas au jeu
  if ((!$('modal').hidden || !$('settings').hidden) && e.code !== 'Escape') return;
  if (JUMP_KEYS.includes(e.code)) {
    if (G.state === 'play') { e.preventDefault(); if (!e.repeat) jumpPress(); return; }
    G.held = true;
    if (tag === 'BUTTON' || tag === 'INPUT') return;
    if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 600)) { e.preventDefault(); startRun(); }
    else if (G.state === 'pause') { e.preventDefault(); resume(); }
  } else if (SLIDE_KEYS.includes(e.code)) {
    if (G.state === 'play') { e.preventDefault(); if (!e.repeat) slidePress(); }
  } else if (e.code === 'Escape' && closeTopLayer()) {
    e.preventDefault();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (G.state === 'play') pauseGame();
    else if (G.state === 'pause') resume();
  }
});
window.addEventListener('keyup', e => {
  if (JUMP_KEYS.includes(e.code)) jumpRelease();
  else if (SLIDE_KEYS.includes(e.code)) slideRelease();
});

// Écran tactile / souris : toucher = saut immédiat ; glisser vers le bas = glissade.
// Le saut part dès le contact (aucune latence). Si le doigt glisse ensuite vers le bas,
// le saut à peine commencé se transforme en plongeon puis en glissade.
let touch = null;
const screenEl = $('screen');
screenEl.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  if (G.state === 'play') {
    e.preventDefault();
    touch = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
    try { screenEl.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
    jumpPress();
    return;
  }
  G.held = true;
  if (G.state === 'menu' || (G.state === 'over' && performance.now() - G.overAt > 600)) startRun();
  else if (G.state === 'pause') resume();
});
screenEl.addEventListener('pointermove', e => {
  if (!touch || e.pointerId !== touch.id || touch.swiped) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (dy > CONFIG.input.swipePx && dy > Math.abs(dx)) {
    touch.swiped = true;
    slidePress();
  }
});
function endTouch(e) {
  if (touch && e.pointerId === touch.id) {
    if (touch.swiped) slideRelease();
    touch = null;
  }
  jumpRelease();
}
window.addEventListener('pointerup', endTouch);
window.addEventListener('pointercancel', endTouch);

// Pause automatique quand la page passe en arrière-plan (onglet caché, appel, autre appli)
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); Music.stop(); } });
window.addEventListener('blur', () => pauseGame());

$('pause').addEventListener('click', pauseGame);
$('settings-btn').addEventListener('click', () => openSettings());
