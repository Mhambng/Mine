// Combo et multiplicateur de score.
//
// Chaque obstacle franchi est une « réussite ». Toutes les N réussites d'affilée, le multiplicateur
// monte (×2, ×3… jusqu'à ×5). Les points de distance sont multipliés.
// Bonus : frôler un obstacle (« Frôlé ! ») et ramasser toute une série de pièces (« Série ! »).
//
// Ce qui fait baisser le combo (pensé pour des enfants : on perd un niveau, pas tout) :
//   - rater des pièces dans une série    -> on redescend d'un niveau
//   - le bouclier absorbe un choc         -> retour à ×1
// Réglages : CONFIG.combo (js/config.js).
'use strict';

const Combo = {
  steps: 0,
  mult: 1,
  maxMult: 1,

  reset() { this.steps = 0; this.mult = 1; this.maxMult = 1; },

  level() { return Math.min(CONFIG.combo.maxMultiplier, 1 + Math.floor(this.steps / CONFIG.combo.stepsPerLevel)); },

  // Progression vers le niveau suivant (0 à 1), pour la petite barre du HUD
  progress() {
    if (this.mult >= CONFIG.combo.maxMultiplier) return 1;
    return (this.steps % CONFIG.combo.stepsPerLevel) / CONFIG.combo.stepsPerLevel;
  },

  success() {
    this.steps++;
    const m = this.level();
    if (m > this.mult) {
      this.mult = m;
      this.maxMult = Math.max(this.maxMult, m);
      G.stats.maxMult = Math.max(G.stats.maxMult, m);
      showBanner('Combo ×' + m + ' !', '#ffd447');
      sfx.combo(m);
    }
  },

  // full = true : retour à ×1 ; sinon on perd seulement un niveau
  fail(full) {
    if (this.steps === 0) return;
    const per = CONFIG.combo.stepsPerLevel;
    const before = this.mult;
    if (full) this.steps = 0;
    else this.steps = Math.max(0, (this.mult - 2) * per);
    this.mult = this.level();
    if (this.mult < before) {
      popText('×' + this.mult, PX + 30, G.py - S - 20, '#ff9fb0');
      sfx.comboLost();
    }
  },
};

// Ajoute des points (multipliés) avec un petit texte au-dessus de Pépin
function addPoints(base, label, color) {
  const pts = Math.round(base * Combo.mult);
  G.points += pts;
  popText(`${label} +${pts}`, PX + 20, G.py - S - 18, color);
}

// Les textes qui apparaissent presque en même temps s'empilent au lieu de se superposer
let popStack = 0, popLastT = -9;
function popText(text, x, y, color) {
  popStack = G.t - popLastT < .35 ? popStack + 1 : 0;
  popLastT = G.t;
  G.parts.push({ k: 'txt', text, x, y: y - popStack * 18, vx: 0, vy: -55, life: 0, max: .9, s: 15, c: color || '#ffffff' });
}

// Suivi des obstacles : réussite quand l'obstacle est dépassé, « Frôlé ! » si on est passé très près
function trackObstacles(pb) {
  const C = CONFIG.combo;
  for (const o of G.obs) {
    if (o.passed || o.dead) continue;
    // Pendant que l'obstacle est à la hauteur de Pépin, on mesure l'écart vertical le plus petit
    if (o.x < pb.x + pb.w && o.x + o.w > pb.x) {
      const ob = obstacleBox(o);
      const gap = Math.max(ob.y - (pb.y + pb.h), pb.y - (ob.y + ob.h));
      o.minGap = Math.min(o.minGap ?? Infinity, gap);
    }
    if (o.x + o.w < pb.x) {
      o.passed = true;
      G.stats.obstacles++;
      Combo.success();
      if (o.minGap !== undefined && o.minGap >= 0 && o.minGap < C.nearMissPx) {
        G.stats.nearMiss++;
        addPoints(C.nearMissPoints, 'Frôlé !', '#7df9ff');
        sfx.nearMiss();
      }
    }
  }
}

// Suivi des séries de pièces : ramassée en entier = bonus, pièces ratées = on perd un niveau
function trackCoinGroups() {
  for (const co of G.coins) {
    if (co.got || co.group.missed) continue;
    if (co.x < PX - S) {
      co.group.missed = true;
      Combo.fail(false);
    }
  }
}
function coinGroupProgress(group) {
  group.got++;
  if (group.got === group.total && !group.missed && group.total >= 3) {
    addPoints(CONFIG.combo.seriesPoints, 'Série !', '#ffe066');
  }
}
