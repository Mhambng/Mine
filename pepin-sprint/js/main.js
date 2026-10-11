// Démarrage du jeu.
'use strict';

// ---------- Démarrage ----------
function boot(data) {
  if (data && data.save) save = normalize(data.save);
  resize();
  Missions.ensure();
  renderMissions();
  updateStats();
  renderShop();
  showOverlay('menu');
  setupDebugPanel();
  setupNative();
  // Pub et achats : chargés en arrière-plan, le jeu n'attend jamais le réseau
  Monetization.init().then(() => { renderShop(); if (!$('settings').hidden) renderSettings(); });
  firstLaunch();
  // Message unique (par exemple : remboursement des anciens décors)
  if (save.notice) { toast(save.notice, 6000); save.notice = null; persist(); }
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => renderShop());
}
const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ save }));
if (hot && typeof hot.ready === 'function') hot.ready(boot);
else boot((hot && hot.data) || {});
