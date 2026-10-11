// Missions du jour : 3 missions simples (une facile, une moyenne, une difficile), les mêmes pour toute
// la journée, renouvelées le lendemain. Les récompenses (en pièces) sont créditées automatiquement
// à la fin de la partie où la mission est accomplie.
//
// Choix volontaires pour un jeune public :
//   - pas de série de jours à maintenir, rien n'est perdu si on ne joue pas un jour ;
//   - pas de mission « joue N parties » : on récompense ce qu'on fait en jouant, pas le temps passé.
'use strict';

const MISSION_POOL = [
  { id: 'coins', stat: 'coins', mode: 'sum', targets: [60, 120, 200], label: n => `Ramasse ${n} pièces` },
  { id: 'jumps', stat: 'jumps', mode: 'sum', targets: [40, 90, 160], label: n => `Saute ${n} fois` },
  { id: 'slides', stat: 'slides', mode: 'sum', targets: [8, 20, 35], label: n => `Fais ${n} glissades` },
  { id: 'powerups', stat: 'powerups', mode: 'sum', targets: [2, 5, 8], label: n => `Attrape ${n} bonus` },
  { id: 'nearMiss', stat: 'nearMiss', mode: 'sum', targets: [4, 10, 20], label: n => `Frôle ${n} obstacles` },
  { id: 'obstacles', stat: 'obstacles', mode: 'sum', targets: [30, 70, 130], label: n => `Passe ${n} obstacles` },
  { id: 'meters', stat: 'meters', mode: 'best', targets: [400, 900, 1600], label: n => `Cours ${fmt(n)} m en une partie` },
  { id: 'mult', stat: 'maxMult', mode: 'best', targets: [2, 3, 5], label: n => `Atteins le combo ×${n}` },
  { id: 'points', stat: 'points', mode: 'best', targets: [1500, 4000, 9000], label: n => `Marque ${fmt(n)} points en une partie` },
];
const MISSION_REWARDS = [40, 80, 130];  // facile, moyenne, difficile

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Petit générateur pseudo-aléatoire initialisé par la date : mêmes missions toute la journée
function seededRandom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const Missions = {
  announced: new Set(),

  // Crée les missions du jour si on a changé de jour
  ensure() {
    const key = todayKey();
    if (save.missions && save.missions.date === key && Array.isArray(save.missions.list)) return;
    const rand = seededRandom('missions-' + key);
    const pool = MISSION_POOL.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    save.missions = {
      date: key,
      list: pool.slice(0, 3).map((m, tier) => ({ id: m.id, tier, target: m.targets[tier], reward: MISSION_REWARDS[tier], progress: 0, done: false })),
    };
    persist();
  },

  def(m) { return MISSION_POOL.find(p => p.id === m.id); },
  label(m) { return this.def(m).label(m.target); },

  // Valeur en cours pendant la partie (progression du jour + partie en cours)
  liveValue(m, stats) {
    const d = this.def(m);
    const v = stats[d.stat] || 0;
    return d.mode === 'sum' ? m.progress + v : Math.max(m.progress, v);
  },

  startRun() { this.ensure(); this.announced.clear(); },

  // Appelé régulièrement pendant la partie : annonce une mission dès qu'elle est accomplie
  tick() {
    if (!save.missions) return;
    const stats = { ...G.stats, meters: G.meters, points: Math.floor(G.points) };
    for (const m of save.missions.list) {
      if (m.done || this.announced.has(m.id)) continue;
      if (this.liveValue(m, stats) >= m.target) {
        this.announced.add(m.id);
        showBanner('Mission accomplie !', '#7df9c8', this.label(m));
        sfx.mission();
        haptic('light');
      }
    }
  },

  // Fin de partie : enregistre la progression et crédite les récompenses
  commit(stats) {
    this.ensure();
    const completed = [], progressed = [];
    for (const m of save.missions.list) {
      if (m.done) continue;
      const before = m.progress;
      m.progress = Math.min(m.target, this.liveValue(m, stats));
      if (m.progress >= m.target) {
        m.done = true;
        save.coins += m.reward;
        completed.push(m);
      } else if (m.progress > before) {
        progressed.push(m);
      }
    }
    return { completed, progressed };
  },
};

// Branché sur la fin de partie (voir endRun dans game.js)
function onRunEnd(result) {
  result.stats.meters = result.meters;
  result.stats.points = result.points;
  result.missions = Missions.commit(result.stats);
  result.missionCoins = result.missions.completed.reduce((s, m) => s + m.reward, 0);
  renderMissions();
}

function renderMissions() {
  Missions.ensure();
  const list = $('missions-list');
  if (!list) return;
  list.innerHTML = save.missions.list.map(m => {
    const pct = Math.round(100 * Math.min(1, m.progress / m.target));
    return `<li class="mission${m.done ? ' done' : ''}">
      <span class="mission-check" aria-hidden="true">${m.done ? '✓' : ''}</span>
      <div class="mission-body">
        <span class="mission-label">${Missions.label(m)}</span>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${m.target}" aria-valuenow="${m.progress}" aria-label="${Missions.label(m)}"><span style="width:${pct}%"></span></div>
      </div>
      <span class="mission-reward">${m.done ? 'Gagné' : `<span class="coin-ico" aria-hidden="true"></span>${m.reward}`}</span>
      <span class="mission-count">${fmt(m.progress)} / ${fmt(m.target)}</span>
    </li>`;
  }).join('');
  const done = save.missions.list.filter(m => m.done).length;
  $('missions-note').textContent = done === 3
    ? 'Tout est fait pour aujourd’hui. De nouvelles missions arrivent demain.'
    : 'Les missions avancent toutes seules pendant que tu joues. Nouvelles missions chaque jour.';
}
