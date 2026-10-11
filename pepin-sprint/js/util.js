// Utilitaires partagés : raccourcis DOM, hasard, formatage, rectangles arrondis.
'use strict';

// ---------- Utilitaires ----------
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => n.toLocaleString('fr-FR');

function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}
