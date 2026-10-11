// Réglages du jeu, tous au même endroit.
// Change une valeur ici, recharge la page, et le jeu en tient compte.
// Astuce : ouvre la page avec #reglages à la fin de l'adresse pour régler en direct avec des curseurs.
'use strict';

const CONFIG = {
  // Monde (unités logiques : l'écran fait toujours 320 de haut, la largeur s'adapte)
  world: {
    height: 320,
    groundOffset: 56,   // hauteur de la bande de sol en bas de l'écran
    playerX: 96,        // position horizontale fixe du personnage
    playerSize: 44,
  },

  // Saut
  physics: {
    gravity: 2300,          // px/s² vers le bas
    fallGravityMult: 1.12,  // gravité un peu plus forte en descente : saut plus « nerveux »
    jumpVelocity: 780,      // vitesse initiale du saut
    doubleJumpFactor: 0.85, // le double saut est un peu moins puissant
    jumpCutFactor: 0.6,     // relâcher tôt coupe la montée (petit saut)
    jumpCutThreshold: 260,  // ...seulement si on monte encore plus vite que ça
  },

  // Aides au saut (rendent le jeu indulgent sans que ça se voie)
  assist: {
    coyoteTime: 0.10,  // s : on peut encore sauter juste après avoir quitté le sol
    jumpBuffer: 0.13,  // s : un appui juste avant d'atterrir est gardé en mémoire et déclenche le saut à l'atterrissage
  },

  // Vitesse de course : monte vite au début puis de plus en plus doucement
  speed: {
    start: 340,
    max: 820,
    rampSeconds: 70,  // plus c'est grand, plus l'accélération est lente
    menu: 120,        // vitesse du décor sur l'écran d'accueil
  },

  // Contrôles tactiles
  input: {
    swipePx: 26,  // distance (en pixels d'écran) pour qu'un glissement vers le bas compte comme une glissade
  },

  // Glissade (flèche du bas, S, ou glisser le doigt vers le bas)
  slide: {
    duration: 0.8,      // s : durée d'une glissade
    maxHold: 1.6,       // s : durée maximale si on garde la touche enfoncée
    fastFall: 1150,     // vitesse de chute quand on demande une glissade en l'air
    height: 22,         // hauteur du personnage pendant la glissade (debout : 44)
  },

  // Séquences d'obstacles et alternance calme / intense (js/patterns.js, js/difficulty.js)
  zones: {
    firstGap: 1.4,           // s avant le premier obstacle
    firstCalm: 6,            // s : la partie commence par une zone calme
    calmSeconds: 7,
    intenseSeconds: 14,
    calmRest: [0.9, 1.4],    // s de pause entre deux séquences en zone calme
    intenseRest: [0.35, 0.6],
    intenseSpeedBonus: 0.06, // +6 % de vitesse en zone intense
    // Difficulté maximale des séquences selon la distance (mètres -> niveau 1 à 3)
    tierByMeters: [[0, 1], [300, 2], [900, 3]],
    calmMaxTier: 1,
  },

  // Power-ups (js/powerups.js)
  powerups: {
    perCalmZone: 1,           // un power-up offert dans chaque zone calme
    intenseChance: 0.08,      // petite chance d'en voir un en zone intense
    magnet: { duration: 8, radius: 190, pull: 1100 },
    shield: { duration: 15 },
    boost: { duration: 4, speedBonus: 0.6, graceAfter: 1.2 },
    invulnAfterHit: 1.0,      // s d'invincibilité après que le bouclier a absorbé un choc
  },

  // Combo et multiplicateur de score (js/combo.js)
  combo: {
    stepsPerLevel: 3,   // 3 réussites d'affilée = multiplicateur +1
    maxMultiplier: 5,
    nearMissPx: 14,     // frôler un obstacle à moins de 14 px compte comme une réussite
    nearMissPoints: 20,
    seriesPoints: 10,   // bonus quand on ramasse toute une série de pièces
    smashPoints: 25,    // obstacle détruit avec le boost ou le bouclier
  },

  // Zones qui défilent pendant la course (js/biomes.js)
  biomes: {
    every: 600,  // mètres entre deux changements de zone
    fade: 1.5,   // s de fondu entre deux zones
    order: ['crepuscule', 'foret', 'ocean', 'neige', 'cosmos'],
  },

  // Sensations
  feel: {
    shake: {
      enabled: true,
      hit: 0.75,             // force sur collision (0 à 1)
      landing: 0.18,         // force sur une réception lourde
      landingMinSpeed: 820,  // vitesse de chute à partir de laquelle la réception secoue
      maxOffset: 10,         // px
      maxAngle: 0.025,       // radians
      decay: 1.6,            // vitesse de retour au calme (par seconde)
    },
    hitStop: {
      hit: 0.075,  // s : micro-pause au moment de l'impact
    },
    squash: {
      jumpStretch: 0.26,  // étirement au départ du saut
      landSquash: 0.32,   // écrasement maximal à la réception
      airStretch: 0.10,   // léger étirement selon la vitesse verticale en l'air
      stiffness: 260,     // ressort : retour à la forme normale
      damping: 16,
    },
    camera: {
      followY: 0.28,   // la caméra suit 28 % de la hauteur du saut
      maxUp: 40,       // px maximum
      smoothing: 7,    // plus c'est grand, plus la caméra suit vite
      zoomOut: 0.07,   // recul de la caméra à vitesse maximale (0 = aucun)
    },
    speedLines: {
      from: 0.5,  // apparaissent à partir de 50 % de la vitesse max
      rate: 0.6,  // nombre de traits par image à vitesse max
    },
  },

  // Performance (js/quality.js)
  perf: {
    maxDpr: 2,             // résolution maximale (les écrans à 3x n'apportent rien ici et coûtent cher)
    maxPixels: 1400000,    // nombre maximal de pixels dessinés par image
    maxParticles: 260,
    adaptive: true,        // baisse automatique de qualité si l'appareil rame
    targetFps: 60,
  },

  particles: {
    runDust: 0.22,     // probabilité par image d'un petit nuage sous les pieds
    landDust: 7,
    coinSparks: 9,
    deathChunks: 14,
  },

  audio: {
    volume: 0.8,
    coinChainWindow: 0.5,  // s : les pièces ramassées rapidement montent en note
  },
};
