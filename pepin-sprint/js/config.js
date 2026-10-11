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

  // Apparition des obstacles (sera remplacé par les séquences de la phase 2)
  spawn: {
    firstGap: 420,
    gapSeconds: 0.85,      // écart minimum, en secondes de course
    gapRandomSeconds: 0.8, // écart aléatoire ajouté
    gapExtra: 150,
    birdFromScore: 120,
    birdChance: 0.28,
    tripleSpikeFromScore: 300,
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
