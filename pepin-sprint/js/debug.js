// Panneau de réglages en direct : ajoute #reglages à la fin de l'adresse de la page.
// Chaque curseur modifie directement CONFIG (js/config.js). Rien n'est sauvegardé :
// quand une valeur te plaît, recopie-la dans config.js.
'use strict';

const TUNABLES = [
  ['physics.gravity', 'Gravité', 1200, 3600, 50],
  ['physics.fallGravityMult', 'Gravité en descente (×)', 1, 1.6, .02],
  ['physics.jumpVelocity', 'Force du saut', 500, 1100, 10],
  ['physics.doubleJumpFactor', 'Force du double saut (×)', .5, 1.2, .05],
  ['assist.coyoteTime', 'Coyote time (s)', 0, .25, .01],
  ['assist.jumpBuffer', 'Mémoire du saut (s)', 0, .3, .01],
  ['slide.duration', 'Durée de glissade (s)', .3, 1.5, .05],
  ['zones.calmSeconds', 'Zone calme (s)', 2, 20, 1],
  ['zones.intenseSeconds', 'Zone intense (s)', 4, 30, 1],
  ['combo.stepsPerLevel', 'Réussites par niveau de combo', 1, 10, 1],
  ['biomes.every', 'Mètres entre deux zones', 100, 1500, 50],
  ['speed.start', 'Vitesse de départ', 200, 600, 10],
  ['speed.max', 'Vitesse max', 400, 1200, 10],
  ['speed.rampSeconds', 'Durée de l’accélération (s)', 10, 180, 5],
  ['feel.shake.hit', 'Tremblement collision', 0, 1, .05],
  ['feel.shake.landing', 'Tremblement réception', 0, .6, .02],
  ['feel.hitStop.hit', 'Micro-pause impact (s)', 0, .15, .005],
  ['feel.squash.jumpStretch', 'Étirement au saut', 0, .6, .02],
  ['feel.squash.landSquash', 'Écrasement réception', 0, .6, .02],
  ['feel.camera.followY', 'Caméra : suivi vertical', 0, .8, .02],
  ['feel.camera.zoomOut', 'Caméra : recul à pleine vitesse', 0, .2, .01],
  ['audio.volume', 'Volume', 0, 1, .05],
];

function cfgGet(path) { return path.split('.').reduce((o, k) => o[k], CONFIG); }
function cfgSet(path, v) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  keys.reduce((o, k) => o[k], CONFIG)[lastKey] = v;
}

function setupDebugPanel() {
  if (location.hash !== '#reglages' || $('reglages')) return;
  const panel = document.createElement('section');
  panel.id = 'reglages';
  panel.className = 'shop';
  panel.innerHTML = '<div class="shop-head"><div><h2>Réglages en direct</h2><p>Les changements sont immédiats mais pas sauvegardés. Recopie les valeurs dans js/config.js.</p></div></div><div class="tune-grid"></div>';
  const grid = panel.querySelector('.tune-grid');
  for (const [path, label, min, max, step] of TUNABLES) {
    const id = 'tune-' + path.replace(/\./g, '-');
    const row = document.createElement('label');
    row.className = 'tune';
    row.htmlFor = id;
    row.innerHTML = `<span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${cfgGet(path)}"><output>${cfgGet(path)}</output>`;
    const input = row.querySelector('input'), out = row.querySelector('output');
    input.addEventListener('input', () => {
      cfgSet(path, +input.value);
      out.textContent = input.value;
    });
    grid.appendChild(row);
  }
  $('screen').after(panel);
}
window.addEventListener('hashchange', setupDebugPanel);
