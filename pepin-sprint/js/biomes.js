// Zones traversées pendant la course : le décor change tous les CONFIG.biomes.every mètres,
// avec un fondu entre l'ancienne et la nouvelle palette.
'use strict';

const Biomes = {
  idx: 0,
  prev: null,
  fade: 1,

  reset() { this.idx = 0; this.prev = null; this.fade = 1; },

  current() {
    const order = CONFIG.biomes.order;
    return order[this.idx % order.length];
  },

  update(dt, meters) {
    const i = Math.floor(meters / CONFIG.biomes.every);
    if (i !== this.idx) {
      this.prev = this.current();
      this.idx = i;
      this.fade = 0;
      showBanner(BG[this.current()].name, '#ffffff', `${fmt(i * CONFIG.biomes.every)} m`);
      sfx.biome();
    }
    this.fade = Math.min(1, this.fade + dt / CONFIG.biomes.fade);
  },

  draw(c, w, h, scroll, t, gy) {
    if (this.prev && this.fade < 1) {
      drawScene(c, w, h, this.prev, scroll, t, gy, 1, true);
      drawScene(c, w, h, this.current(), scroll, t, gy, this.fade, true);
    } else {
      drawScene(c, w, h, this.current(), scroll, t, gy, 1, true);
    }
  },
};
