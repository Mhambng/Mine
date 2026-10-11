// Sons synthétisés avec Web Audio (aucun fichier son nécessaire).
// Ce sont des sons provisoires : chaque entrée de `sfx` pourra être remplacée par un vrai fichier plus tard
// sans toucher au reste du jeu.
'use strict';

let ac = null;
let noiseBuf = null;

function audioCtx() {
  ac = ac || new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// Note simple qui glisse de f1 à f2
function beep(f1, f2, dur, type = 'square', vol = .05, delay = 0) {
  if (!save.settings.sfx) return;
  try {
    const a = audioCtx();
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol * CONFIG.audio.volume, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) { /* pas d'audio */ }
}

// Bruit filtré : pour les chocs et les « pouf »
function noise(dur, vol = .08, cutoff = 1200, delay = 0) {
  if (!save.settings.sfx) return;
  try {
    const a = audioCtx();
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * .5, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = a.currentTime + delay;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noiseBuf;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol * CONFIG.audio.volume, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0); src.stop(t0 + dur + .02);
  } catch (e) { /* pas d'audio */ }
}

const sfx = {
  start: () => { beep(330, 660, .12, 'triangle', .05); beep(495, 990, .14, 'triangle', .05, .09); },
  jump: () => beep(380, 720, .13, 'square', .035),
  jump2: () => { beep(560, 1040, .12, 'square', .03); noise(.08, .03, 3000); },
  // Atterrissage : plus fort si la chute était rapide (k de 0 à 1)
  land: k => { noise(.07, .02 + .05 * k, 500); beep(160, 70, .08, 'sine', .04 + .05 * k); },
  // Pièce : la note monte quand on enchaîne (chain = 0, 1, 2…)
  coin: chain => {
    const f = 988 * Math.pow(2, Math.min(chain, 12) / 12);
    beep(f, f, .05, 'triangle', .05);
    beep(f * 1.335, f * 1.335, .09, 'triangle', .05, .05);
  },
  hit: () => { noise(.25, .12, 900); beep(260, 60, .35, 'sawtooth', .05, .02); },
  pause: () => beep(660, 440, .1, 'triangle', .04),
  resume: () => beep(440, 660, .1, 'triangle', .04),
  click: () => beep(900, 700, .04, 'triangle', .03),
  slide: () => { noise(.18, .05, 2200); beep(300, 180, .12, 'triangle', .03); },
  zone: intense => intense
    ? [392, 523, 659].forEach((f, i) => beep(f, f * 1.01, .12, 'square', .03, i * .07))
    : [659, 523].forEach((f, i) => beep(f, f, .16, 'sine', .04, i * .1)),
  biome: () => [523, 784, 1047].forEach((f, i) => beep(f, f, .2, 'sine', .035, i * .12)),
  power: () => [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, f, .08, 'square', .03, i * .045)),
  powerEnd: () => beep(660, 330, .2, 'triangle', .04),
  shieldBreak: () => { noise(.2, .1, 4000); beep(900, 200, .25, 'square', .035); },
  smash: () => { noise(.15, .09, 1500); beep(200, 90, .12, 'square', .04); },
  combo: m => { const f = 440 * Math.pow(2, (m * 2) / 12); beep(f, f * 1.5, .15, 'square', .035); beep(f * 1.5, f * 2, .15, 'square', .03, .08); },
  comboLost: () => beep(400, 200, .18, 'triangle', .035),
  nearMiss: () => { noise(.1, .04, 6000); beep(1200, 1800, .07, 'sine', .03); },
  buy: () => { beep(523, 523, .1, 'triangle', .05); beep(659, 659, .1, 'triangle', .05, .1); beep(784, 784, .18, 'triangle', .05, .2); },
  mission: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, f, .14, 'triangle', .05, i * .09)); },
};
