// Réglages (son, musique, vibrations, secousses), panneaux plein écran du mode appli,
// et pile des fenêtres ouvertes (pour le bouton retour Android et la touche Échap).
'use strict';

const SETTINGS = [
  { key: 'sfx', label: 'Effets sonores' },
  { key: 'music', label: 'Musique', hint: 'Pendant la course' },
  { key: 'haptics', label: 'Vibrations' },
  { key: 'shake', label: 'Secousses de l’écran', hint: 'À couper si les mouvements gênent' },
];

function renderSettings() {
  const body = $('settings-body');
  body.innerHTML = `
    <div class="settings-list">
      ${SETTINGS.map(s => `
        <label class="switch-row" for="set-${s.key}">
          <span><strong>${s.label}</strong>${s.hint ? `<small>${s.hint}</small>` : ''}</span>
          <input type="checkbox" role="switch" id="set-${s.key}" data-key="${s.key}" ${save.settings[s.key] ? 'checked' : ''}>
        </label>`).join('')}
    </div>
    <div class="settings-store" id="settings-store"></div>
    <div class="settings-about">
      <p>Pépin Sprint ne demande aucun compte et ne collecte aucune donnée personnelle. Ta progression reste sur cet appareil.</p>
      <p><a href="${CONFIG.app.privacyUrl}" target="_blank" rel="noopener">Politique de confidentialité</a> · version ${CONFIG.app.version}</p>
    </div>`;
  if (typeof renderStoreSettings === 'function') renderStoreSettings($('settings-store'));
}
$('settings-body').addEventListener('change', e => {
  const key = e.target.dataset.key;
  if (!key) return;
  save.settings[key] = e.target.checked;
  persist();
  if (key === 'music') { if (!e.target.checked) Music.stop(); else if (G.state === 'play') Music.start(); }
  if (key === 'haptics' && e.target.checked) haptic('medium');
  if (key === 'sfx' && e.target.checked) sfx.click();
});

// ---------- Fenêtres et panneaux ----------
function openDialog(id) {
  const d = $(id);
  d.hidden = false;
  d.querySelector('button, input, a')?.focus({ preventScroll: true });
}
function closeDialog(id) { $(id).hidden = true; }

function openSettings() {
  if (G.state === 'play') pauseGame();
  renderSettings();
  openDialog('settings');
}

// Missions / Boutique : panneau plein écran en mode appli, simple défilement sur la page web
function openSheet(id) {
  if (document.documentElement.classList.contains('app')) {
    document.documentElement.dataset.sheet = id;
    $(id).scrollTop = 0;
    $(id).querySelector('[data-close]')?.focus({ preventScroll: true });
  } else {
    $(id).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}
function closeSheet() { delete document.documentElement.dataset.sheet; }

// Ferme la fenêtre la plus haute. Renvoie true si quelque chose a été fermé.
function closeTopLayer() {
  if (!$('modal').hidden) { if (typeof modalCancel === 'function') modalCancel(); else closeDialog('modal'); return true; }
  if (!$('settings').hidden) { closeDialog('settings'); return true; }
  if (document.documentElement.dataset.sheet) { closeSheet(); return true; }
  return false;
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-close]');
  if (!btn) return;
  sfx.click();
  if (btn.closest('#settings')) closeDialog('settings');
  else if (btn.closest('#modal')) closeTopLayer();
  else closeSheet();
});
// Clic sur le fond sombre d'une fenêtre : la ferme
for (const id of ['settings', 'modal']) {
  $(id).addEventListener('click', e => { if (e.target.id === id) closeTopLayer(); });
}
