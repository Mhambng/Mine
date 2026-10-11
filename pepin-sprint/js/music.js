// Musique de fond synthétisée (aucun fichier audio : 0 octet ajouté à l'application).
// Une petite boucle joyeuse de 4 accords, jouée seulement pendant la course.
// Elle s'arrête en pause, en fin de partie, et quand le réglage « Musique » est coupé.
'use strict';

const Music = {
  playing: false,
  step: 0,
  nextTime: 0,
  timer: 0,
  gain: null,
  // Do – La mineur – Fa – Sol (en demi-tons depuis La 220 Hz)
  chords: [[3, 7, 10], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]],

  start() {
    if (this.playing || !save.settings.music) return;
    try {
      const a = audioCtx();
      this.gain = a.createGain();
      this.gain.gain.value = .045 * CONFIG.audio.volume;
      this.gain.connect(a.destination);
      this.playing = true;
      this.step = 0;
      this.nextTime = a.currentTime + .05;
      this.timer = setInterval(() => this.schedule(), 50);
    } catch (e) { this.playing = false; }
  },

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    try {
      const g = this.gain, t = ac.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + .15);
      setTimeout(() => g.disconnect(), 300);
    } catch (e) { /* rien */ }
  },

  // Programme les notes un peu à l'avance (méthode classique pour un tempo stable)
  schedule() {
    const a = ac, spb = 60 / 120 / 2; // croches à 120 bpm
    while (this.nextTime < a.currentTime + .15) {
      const chord = this.chords[Math.floor(this.step / 8) % 4];
      const i = this.step % 8;
      const f = n => 220 * Math.pow(2, n / 12);
      // Basse sur les temps
      if (i % 2 === 0) this.note(f(chord[0] - 12), this.nextTime, spb * 1.8, 'triangle', 1.2);
      // Arpège
      this.note(f(chord[[0, 1, 2, 1, 0, 2, 1, 2][i]] + 12), this.nextTime, spb * .8, 'square', .35);
      this.nextTime += spb;
      this.step++;
    }
  },

  note(freq, t, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(this.gain);
    o.start(t); o.stop(t + dur + .02);
  },
};
