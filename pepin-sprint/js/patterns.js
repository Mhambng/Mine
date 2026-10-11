// Séquences d'obstacles conçues à la main.
//
// Chaque séquence est une petite chorégraphie : une liste d'éléments placés dans le TEMPS (en secondes)
// et non en pixels. Avec la vitesse qui augmente, les obstacles s'écartent à l'écran mais restent
// franchissables : un saut dure toujours ~0,65 s, une glissade 0,8 s.
//
// Éléments possibles :
//   { t, o: 'spike', n: 1..3, big }  pics au sol (à sauter)
//   { t, o: 'birdLow' }               oiseau bas (à sauter)
//   { t, o: 'birdHigh' }              oiseau haut (rester au sol ou glisser ; sauter = touché)
//   { t, o: 'bar' }                   poutre suspendue (à passer en glissade)
//   { t, c: 'row', n, y }             rangée de pièces ; y = 'ground' | 'slide' | 'high'
//   { t, c: 'arc', n }                arc de pièces qui suit la trajectoire d'un saut
//
// tier : 1 = facile (apprentissage), 2 = moyen, 3 = difficile.
'use strict';

const PATTERNS = [
  // ----- Niveau 1 : une seule idée à la fois -----
  { id: 'pic-seul', tier: 1, items: [{ t: 0, o: 'spike', n: 1 }, { t: 0, c: 'arc', n: 5 }] },
  { id: 'rangee-puis-pic', tier: 1, items: [{ t: 0, c: 'row', n: 5 }, { t: 1.0, o: 'spike', n: 1 }] },
  { id: 'deux-pics', tier: 1, items: [{ t: 0, o: 'spike', n: 1 }, { t: 1.15, o: 'spike', n: 2 }, { t: 1.15, c: 'arc', n: 5 }] },
  { id: 'poutre', tier: 1, items: [{ t: -0.25, c: 'row', n: 5, y: 'slide' }, { t: 0, o: 'bar' }] },
  { id: 'oiseau-haut', tier: 1, items: [{ t: -0.2, c: 'row', n: 5 }, { t: 0, o: 'birdHigh' }] },
  { id: 'oiseau-bas', tier: 1, items: [{ t: 0, o: 'birdLow' }, { t: 0, c: 'arc', n: 5 }] },
  { id: 'pieces-en-hauteur', tier: 1, items: [{ t: 0, c: 'row', n: 6, y: 'high' }] },

  // ----- Niveau 2 : deux idées qui s'enchaînent -----
  { id: 'grand-mur', tier: 2, items: [{ t: 0, o: 'spike', n: 3, big: true }, { t: 0, c: 'arc', n: 7 }] },
  { id: 'pic-puis-poutre', tier: 2, items: [{ t: 0, o: 'spike', n: 1 }, { t: 0.85, c: 'row', n: 4, y: 'slide' }, { t: 1.0, o: 'bar' }] },
  { id: 'poutre-puis-pic', tier: 2, items: [{ t: 0, o: 'bar' }, { t: 0.95, o: 'spike', n: 2 }, { t: 0.95, c: 'arc', n: 5 }] },
  { id: 'escalier', tier: 2, items: [{ t: 0, o: 'spike', n: 1 }, { t: 0.85, o: 'spike', n: 2 }, { t: 1.7, o: 'spike', n: 3 }, { t: 1.7, c: 'arc', n: 6 }] },
  { id: 'oiseau-puis-pic', tier: 2, items: [{ t: 0, o: 'birdLow' }, { t: 0.95, o: 'spike', n: 2 }] },
  { id: 'reste-en-bas', tier: 2, items: [{ t: 0, o: 'birdHigh' }, { t: 0, c: 'row', n: 3 }, { t: 0.75, o: 'spike', n: 1 }, { t: 0.75, c: 'arc', n: 5 }] },

  // ----- Niveau 3 : rythme serré, il faut lire à l'avance -----
  { id: 'zigzag', tier: 3, items: [{ t: 0, o: 'spike', n: 1 }, { t: 0.8, o: 'birdHigh' }, { t: 1.55, o: 'spike', n: 2 }] },
  { id: 'tunnel', tier: 3, items: [{ t: -0.2, c: 'row', n: 8, y: 'slide' }, { t: 0, o: 'bar' }, { t: 0.45, o: 'bar' }, { t: 1.35, o: 'spike', n: 1 }] },
  { id: 'double-mur', tier: 3, items: [{ t: 0, o: 'spike', n: 3, big: true }, { t: 0.9, o: 'spike', n: 2, big: true }] },
  { id: 'nuee', tier: 3, items: [{ t: 0, o: 'birdLow' }, { t: 0.8, o: 'birdHigh' }, { t: 1.55, o: 'birdLow' }] },
  { id: 'saute-glisse-saute', tier: 3, items: [{ t: 0, o: 'spike', n: 2 }, { t: 0.9, o: 'bar' }, { t: 1.75, o: 'spike', n: 2 }] },
];

// Durée d'une séquence (dernier élément + marge)
function patternLength(p) {
  return Math.max(...p.items.map(i => i.t)) + 0.25;
}

let coinGroupId = 0;

// Place une séquence dans le monde. x0 = position du « temps 0 », speed = vitesse actuelle (px/s).
function placePattern(p, x0, speed) {
  for (const it of p.items) {
    const x = x0 + it.t * speed;
    if (it.o) G.obs.push(Object.assign(makeObstacle(it, x), { pat: p.id }));
    else if (it.c) placeCoins(it, x);
  }
}

function makeObstacle(it, x) {
  switch (it.o) {
    case 'spike': {
      const h = it.big ? 48 + Math.random() * 6 : 30 + Math.random() * 10;
      return { k: 'spike', x, y: GROUND - h, w: it.n * 22, h, n: it.n };
    }
    case 'birdLow': return { k: 'bird', x, y: GROUND - 28 - 26, w: 40, h: 26, ph: Math.random() * 6 };
    case 'birdHigh': return { k: 'bird', x, y: GROUND - 62 - 26, w: 40, h: 26, ph: Math.random() * 6 };
    case 'bar': {
      // Poutre suspendue : descend du haut de l'écran jusqu'à 30 px du sol
      const bottom = GROUND - 30;
      return { k: 'bar', x, y: bottom - 520, w: 30, h: 520 };
    }
  }
}

function placeCoins(it, x) {
  const group = { id: ++coinGroupId, total: 0, got: 0, missed: false };
  const add = (cx, cy) => { G.coins.push({ x: cx, y: cy, group }); group.total++; };
  if (it.c === 'row') {
    const y = it.y === 'slide' ? GROUND - 13 : it.y === 'high' ? GROUND - 120 : GROUND - 22;
    for (let i = 0; i < it.n; i++) add(x + i * 30, y);
  } else if (it.c === 'arc') {
    const half = (it.n - 1) / 2;
    for (let i = 0; i < it.n; i++) {
      const u = (i - half) / (half + 1);  // de -1 à 1
      add(x + 11 + (i - half) * 34, GROUND - 60 - 85 * (1 - u * u));
    }
  }
}
