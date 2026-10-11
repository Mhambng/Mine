// Qualité adaptative : si l'appareil n'arrive pas à tenir les 60 images/s, on baisse la résolution
// de rendu et le nombre de particules, par paliers, sans jamais remonter (pas d'effet yoyo).
// Le nombre de pixels à dessiner est de loin ce qui coûte le plus cher sur un téléphone d'entrée de gamme.
// Réglages : CONFIG.perf (js/config.js).
'use strict';

const Quality = {
  level: 0,             // 0 = pleine qualité ; 3 = qualité minimale
  maxParticles: CONFIG.perf.maxParticles,
  speedLines: true,
  acc: 0, frames: 0,

  // Résolution de rendu (pixels réels par pixel CSS) pour une zone de jeu de cssW × cssH
  renderScale(cssW, cssH) {
    const P = CONFIG.perf;
    const dpr = window.devicePixelRatio || 1;
    const budget = Math.sqrt(P.maxPixels / Math.max(1, cssW * cssH)); // plafond de pixels total
    const levelCap = [P.maxDpr, 1.5, 1, .75][this.level];
    return Math.max(.5, Math.min(dpr, P.maxDpr, budget, levelCap));
  },

  // Appelé à chaque image de jeu avec le temps réel écoulé
  sample(realDt) {
    if (!CONFIG.perf.adaptive || this.level >= 3) return;
    this.acc += realDt;
    this.frames++;
    if (this.acc < 2) return;
    const fps = this.frames / this.acc;
    this.acc = 0; this.frames = 0;
    if (fps < CONFIG.perf.targetFps * .85) this.downgrade();
  },

  downgrade() {
    this.level++;
    this.maxParticles = Math.round(CONFIG.perf.maxParticles * [1, .7, .5, .35][this.level]);
    this.speedLines = this.level < 3;
    resize();
  },
};
