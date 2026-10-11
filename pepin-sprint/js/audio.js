// Sons synthétisés avec Web Audio (aucun fichier son nécessaire).
'use strict';

// ---------- Son ----------
let ac = null;
function beep(f1, f2, dur, type = 'square', vol = .05, delay = 0) {
  if (save.muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) { /* pas d'audio */ }
}
const sfx = {
  jump: () => beep(380, 720, .13, 'square', .035),
  jump2: () => beep(560, 1040, .12, 'square', .03),
  coin: () => { beep(988, 988, .06, 'triangle', .05); beep(1319, 1319, .1, 'triangle', .05, .06); },
  die: () => beep(320, 70, .45, 'sawtooth', .045),
  buy: () => { beep(523, 523, .1, 'triangle', .05); beep(659, 659, .1, 'triangle', .05, .1); beep(784, 784, .18, 'triangle', .05, .2); },
  chest: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, f, .14, 'triangle', .05, i * .09)); },
};
