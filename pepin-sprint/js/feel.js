// Sensations : tremblement d'écran, micro-pause sur impact, caméra et ressort d'étirement du personnage.
// Toutes les valeurs viennent de CONFIG.feel (js/config.js).
'use strict';

const Feel = {
  trauma: 0,   // 0 à 1 : intensité du tremblement (on l'élève au carré pour un rendu plus doux)
  freeze: 0,   // secondes de micro-pause restantes
  camY: 0,     // décalage vertical de la caméra
  zoom: 1,
  t: 0,

  reset() {
    this.trauma = 0; this.freeze = 0; this.camY = 0; this.zoom = 1;
  },

  // Ajoute du tremblement (désactivé si le joueur a demandé moins d'animations)
  shake(amount) {
    if (reduceMotion || !CONFIG.feel.shake.enabled) return;
    this.trauma = Math.min(1, this.trauma + amount);
  },

  // Fige le jeu quelques millisecondes pour donner du poids à un choc
  hitStop(seconds) {
    this.freeze = Math.max(this.freeze, seconds);
  },

  // Caméra : suit en douceur la hauteur du saut, recule un peu quand la vitesse augmente
  update(dt, heightAboveGround, speedRatio) {
    const cf = CONFIG.feel;
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - cf.shake.decay * dt);
    const targetY = Math.min(cf.camera.maxUp, Math.max(0, heightAboveGround) * cf.camera.followY);
    const targetZoom = reduceMotion ? 1 : 1 - cf.camera.zoomOut * Math.max(0, speedRatio);
    const k = 1 - Math.exp(-cf.camera.smoothing * dt); // lissage indépendant du nombre d'images par seconde
    this.camY += (targetY - this.camY) * k;
    this.zoom += (targetZoom - this.zoom) * k;
  },

  // Applique tremblement + caméra au contexte de dessin. Point fixe : le personnage au sol.
  apply(c, W, H, px, ground) {
    const s = this.trauma * this.trauma;
    const sc = CONFIG.feel.shake;
    if (s > 0) {
      const t = this.t * 40;
      // Somme de sinus : un bruit doux, moins « épileptique » que du pur hasard
      const nx = Math.sin(t * 1.3) * .6 + Math.sin(t * 2.9 + 1.1) * .4;
      const ny = Math.sin(t * 1.7 + 2.3) * .6 + Math.sin(t * 3.1 + .4) * .4;
      const na = Math.sin(t * 1.1 + 4.2);
      c.translate(W / 2, H / 2);
      c.rotate(na * sc.maxAngle * s);
      c.translate(-W / 2 + nx * sc.maxOffset * s, -H / 2 + ny * sc.maxOffset * s);
    }
    c.translate(px, ground + this.camY);
    c.scale(this.zoom, this.zoom);
    c.translate(-px, -ground);
  },

  // Bord droit visible du monde (sert à faire apparaître les obstacles juste hors champ)
  rightEdge(W, px) {
    const minZoom = 1 - CONFIG.feel.camera.zoomOut;
    return px + (W - px) / minZoom;
  },
};

// Ressort d'étirement / écrasement du personnage.
// sx, sy : échelles horizontale et verticale (1 = forme normale).
function makeSpring() {
  return { sx: 1, sy: 1, vx: 0, vy: 0 };
}
function springStretch(sp, amount) {   // amount > 0 : étiré vers le haut
  sp.sy = 1 + amount;
  sp.sx = 1 / sp.sy;
  sp.vx = 0; sp.vy = 0;
}
function springSquash(sp, amount) {    // amount > 0 : écrasé
  sp.sy = 1 - amount;
  sp.sx = 1 + amount * .9;
  sp.vx = 0; sp.vy = 0;
}
function springUpdate(sp, dt, targetY, targetX = 1 / targetY) {
  const q = CONFIG.feel.squash;
  sp.vx += (q.stiffness * (targetX - sp.sx) - q.damping * sp.vx) * dt;
  sp.vy += (q.stiffness * (targetY - sp.sy) - q.damping * sp.vy) * dt;
  sp.sx += sp.vx * dt;
  sp.sy += sp.vy * dt;
}
