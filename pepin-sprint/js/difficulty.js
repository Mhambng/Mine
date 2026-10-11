// Courbe de difficulté : alternance de zones calmes et intenses, et choix de la séquence suivante.
// Réglages : CONFIG.zones (js/config.js). Séquences : js/patterns.js.
'use strict';

const Director = {
  zone: 'calme',
  zoneLeft: 0,
  zoneTime: 0,
  recent: [],       // dernières séquences jouées (pour éviter les répétitions)
  puGiven: 0,       // power-ups déjà offerts dans la zone calme en cours
  speedBonus: 0,    // bonus de vitesse lissé (zone intense)

  reset() {
    this.zone = 'calme';
    this.zoneLeft = CONFIG.zones.firstCalm;
    this.zoneTime = 0;
    this.recent = [];
    this.puGiven = 0;
    this.speedBonus = 0;
  },

  update(dt) {
    const Z = CONFIG.zones;
    this.zoneLeft -= dt;
    this.zoneTime += dt;
    if (this.zoneLeft <= 0) {
      this.zone = this.zone === 'calme' ? 'intense' : 'calme';
      this.zoneLeft = this.zone === 'calme' ? Z.calmSeconds : Z.intenseSeconds;
      this.zoneTime = 0;
      this.puGiven = 0;
      if (this.zone === 'intense') { showBanner('Ça accélère !', '#ff9f5a'); sfx.zone(true); }
      else { showBanner('Zone calme', '#7df9c8'); sfx.zone(false); }
    }
    const target = this.zone === 'intense' ? Z.intenseSpeedBonus : 0;
    this.speedBonus += (target - this.speedBonus) * Math.min(1, dt * 1.5);
  },

  maxTier(meters) {
    let tier = 1;
    for (const [m, t] of CONFIG.zones.tierByMeters) if (meters >= m) tier = t;
    return tier;
  },

  // Choisit la prochaine séquence selon la distance et la zone
  pick(meters) {
    const max = this.maxTier(meters);
    let tier;
    if (this.zone === 'calme') tier = Math.min(max, CONFIG.zones.calmMaxTier);
    else tier = Math.random() < 0.6 ? max : 1 + Math.floor(Math.random() * max); // surtout le niveau le plus dur disponible
    let pool = PATTERNS.filter(p => p.tier === tier && !this.recent.includes(p.id));
    if (!pool.length) pool = PATTERNS.filter(p => p.tier === tier);
    const p = pick(pool);
    this.recent.push(p.id);
    if (this.recent.length > 3) this.recent.shift();
    return p;
  },

  // Pause (en secondes) après une séquence
  rest() {
    const [a, b] = this.zone === 'calme' ? CONFIG.zones.calmRest : CONFIG.zones.intenseRest;
    return rnd(a, b);
  },

  // Faut-il offrir un power-up maintenant ?
  wantsPowerUp() {
    const P = CONFIG.powerups;
    if (this.zone === 'calme') return this.puGiven < P.perCalmZone && this.zoneTime > 1.5;
    return Math.random() < P.intenseChance;
  },
};

// Fait apparaître la séquence suivante juste hors de l'écran
function spawnNext() {
  const p = Director.pick(G.meters);
  // Les éléments à temps négatif (pièces qui annoncent un obstacle) doivent aussi naître hors de l'écran
  const minT = Math.min(0, ...p.items.map(i => i.t));
  const x0 = Feel.rightEdge(W, PX) + 40 - minT * G.speed;
  placePattern(p, x0, G.speed);
  const len = patternLength(p);
  const rest = Director.rest();
  if (Director.wantsPowerUp()) {
    spawnPowerUp(x0 + (len + rest * 0.5) * G.speed);
    Director.puGiven++;
  }
  // Distance à parcourir avant la séquence suivante
  G.nextSpawn = (len - minT + rest) * G.speed;
}
