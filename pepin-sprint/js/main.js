// Démarrage du jeu.
'use strict';

// ---------- Démarrage ----------
function boot(data) {
  if (data && data.save) save = normalize(data.save);
  resize();
  drawChestArt();
  updateStats();
  renderShop();
  showOverlay('menu');
  setupDebugPanel();
  // Message unique (par exemple : remboursement des anciens décors)
  if (save.notice) { toast(save.notice, 6000); save.notice = null; persist(); }
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderShop());
}
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ save }));
if (hot && typeof hot.ready === 'function') hot.ready(boot);
else boot((hot && hot.data) || {});
