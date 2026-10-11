// Dessin du personnage et de ses chapeaux.
'use strict';

// ---------- Dessin : personnage ----------
function bodyFill(c, sk, s, t) {
  if (sk.body === 'lava') {
    const g = c.createLinearGradient(0, -s, 0, 0);
    const m = .45 + Math.sin(t * 3) * .12;
    g.addColorStop(0, '#ffd45a'); g.addColorStop(m, '#ff6a2b'); g.addColorStop(1, '#b3241a');
    return g;
  }
  if (sk.body === 'galaxy') {
    const g = c.createLinearGradient(-s / 2, -s, s / 2, 0);
    g.addColorStop(0, '#2b0c8f'); g.addColorStop(.5, '#7a12c4'); g.addColorStop(1, '#f72585');
    return g;
  }
  return sk.body;
}
function bodyPath(c, kind, w, h, t) {
  c.beginPath();
  if (kind === 'robot') {
    if (c.roundRect) c.roundRect(-w / 2, -h, w, h - 3, 9); else c.rect(-w / 2, -h, w, h - 3);
  } else if (kind === 'ghost') {
    c.moveTo(-w / 2, -h + w / 2);
    c.arc(0, -h + w / 2, w / 2, Math.PI, 0);
    c.lineTo(w / 2, -4);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x1 = w / 2 - (i + .5) * w / n, x2 = w / 2 - (i + 1) * w / n;
      c.quadraticCurveTo(x1, 6 + Math.sin(t * 9 + i) * 3, x2, -4);
    }
    c.closePath();
  } else {
    if (c.roundRect) c.roundRect(-w / 2, -h, w, h - 3, [w * .5, w * .5, w * .3, w * .3]); else c.rect(-w / 2, -h, w, h - 3);
  }
}
function drawChar(c, x, y, size, t, eq, o = {}) {
  const sk = find('skin', eq.skin);
  const run = o.run || 0;
  // Le personnage est dessiné à sa taille de référence (44) puis mis à l'échelle :
  // yeux, pieds et chapeaux gardent les mêmes proportions quelle que soit la taille.
  const s = 44, w = s, h = s;
  c.save();
  c.translate(x, y);
  c.scale(size / s, size / s);
  // Étirement / écrasement (ressort calculé dans feel.js), centré sous les pieds
  c.scale(o.sx || 1, o.sy || 1);
  if (sk.kind === 'ghost') c.translate(0, -6 + Math.sin(t * 4) * 3);
  else if (!o.air) c.translate(0, -Math.abs(Math.sin(run)) * 3);
  else c.rotate(o.spin || 0);

  // Pieds
  if (sk.feet) {
    const f = o.air ? 3 : Math.sin(run) * 6;
    c.fillStyle = sk.feet;
    c.beginPath(); c.ellipse(-w * .2 + f, -2, 7, 4, 0, 0, 6.283); c.fill();
    c.beginPath(); c.ellipse(w * .2 - f, -2, 7, 4, 0, 0, 6.283); c.fill();
  }

  // Corps
  c.globalAlpha = sk.kind === 'ghost' ? .93 : 1;
  c.fillStyle = bodyFill(c, sk, s, t);
  bodyPath(c, sk.kind, w, h, t);
  c.fill();
  c.globalAlpha = 1;
  if (sk.body === 'galaxy') {
    c.save();
    bodyPath(c, sk.kind, w, h, t);
    c.clip();
    c.fillStyle = '#fff';
    for (let i = 0; i < 9; i++) {
      const d = DECO[i + 20];
      c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + d.p));
      c.beginPath(); c.arc(-w / 2 + d.x * w, -h + d.y * h, .8 + d.s * 1.4, 0, 6.283); c.fill();
    }
    c.restore();
  }
  if (sk.belly) {
    c.fillStyle = sk.belly;
    c.beginPath(); c.ellipse(w * .06, -h * .3, w * .27, h * .2, 0, 0, 6.283); c.fill();
  }
  if (sk.kind === 'robot') {
    c.fillStyle = '#5d6f82';
    c.fillRect(-w * .3, -h * .3, w * .6, 4);
    c.fillRect(-w * .3, -h * .2, w * .4, 4);
    c.strokeStyle = '#5d6f82'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, -h); c.lineTo(0, -h - 9); c.stroke();
    c.fillStyle = (t % 1) < .5 ? '#ff5f7a' : '#ff9fb0';
    c.beginPath(); c.arc(0, -h - 11, 4, 0, 6.283); c.fill();
  }

  // Yeux
  const blink = (t % 3.3) < .13;
  if (sk.kind === 'robot') {
    c.fillStyle = '#1b2533';
    rr(c, -w * .1, -h * .78, w * .52, h * .26, 6); c.fill();
    c.fillStyle = '#62f4ff';
    const eh = blink ? 1.5 : 5;
    c.fillRect(w * .02, -h * .65 - eh / 2, 6, eh);
    c.fillRect(w * .22, -h * .65 - eh / 2, 6, eh);
  } else {
    const ey = -h * .62;
    for (const ex of [w * .06, w * .3]) {
      c.fillStyle = '#fff';
      c.beginPath(); c.ellipse(ex, ey, 5.5, blink ? 1 : 7, 0, 0, 6.283); c.fill();
      if (!blink) {
        c.fillStyle = '#1b1433';
        c.beginPath(); c.arc(ex + 1.8, ey + .5, 3.2, 0, 6.283); c.fill();
        c.fillStyle = '#fff';
        c.beginPath(); c.arc(ex + 2.8, ey - 1, 1.1, 0, 6.283); c.fill();
      }
    }
    c.fillStyle = 'rgba(255,90,130,.38)';
    c.beginPath(); c.ellipse(w * .4, -h * .44, 4, 2.5, 0, 0, 6.283); c.fill();
  }

  drawHat(c, eq.hat, sk, w, h, t, s);
  c.restore();
}
function drawHat(c, id, sk, w, h, t, s) {
  const top = -h;
  switch (id) {
    case 'casquette':
      c.fillStyle = '#e8414f';
      c.beginPath(); c.arc(0, top + 5, w * .36, Math.PI, 0); c.fill();
      c.fillStyle = '#b52f3b';
      c.beginPath(); c.ellipse(w * .3, top + 4, w * .26, 4, 0, 0, 6.283); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(0, top + 5 - w * .36, 2.5, 0, 6.283); c.fill();
      break;
    case 'bonnet':
      c.fillStyle = '#3d7bff';
      c.beginPath(); c.arc(0, top + 7, w * .38, Math.PI, 0); c.fill();
      c.fillStyle = '#2858c9';
      rr(c, -w * .41, top + 2, w * .82, 8, 4); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(Math.sin(t * 6) * 1.5, top + 7 - w * .38 - 3, 6, 0, 6.283); c.fill();
      break;
    case 'chat':
      for (const sgn of [-1, 1]) {
        c.fillStyle = bodyFill(c, sk, s, t);
        c.beginPath();
        c.moveTo(sgn * w * .4, top + 12); c.lineTo(sgn * w * .3, top - 12); c.lineTo(sgn * w * .08, top + 5);
        c.closePath(); c.fill();
        c.fillStyle = '#ff9ec4';
        c.beginPath();
        c.moveTo(sgn * w * .34, top + 9); c.lineTo(sgn * w * .29, top - 5); c.lineTo(sgn * w * .16, top + 5);
        c.closePath(); c.fill();
      }
      break;
    case 'sorcier': {
      const tip = Math.sin(t * 3) * 3;
      c.fillStyle = '#4b2a8a';
      c.beginPath();
      c.moveTo(-w * .3, top + 4); c.lineTo(w * .3, top + 4);
      c.quadraticCurveTo(w * .05, top - w * .5, -w * .2 + tip, top - w * .85);
      c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0, top + 4, w * .5, 5, 0, 0, 6.283); c.fill();
      c.fillStyle = '#ffd447';
      c.fillRect(-w * .27, top - 2, w * .54, 5);
      star(c, w * .02, top - w * .32, 5, 2.2, '#ffd447', t);
      break;
    }
    case 'aureole':
      c.save();
      c.shadowColor = '#fff1a0'; c.shadowBlur = 14;
      c.strokeStyle = '#ffe680'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(0, top - 10 + Math.sin(t * 3) * 2, w * .3, 6, 0, 0, 6.283); c.stroke();
      c.restore();
      break;
    case 'couronne':
      c.fillStyle = '#ffd447';
      c.strokeStyle = '#d79a12'; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-w * .3, top + 6);
      c.lineTo(-w * .32, top - 12); c.lineTo(-w * .15, top - 2);
      c.lineTo(0, top - 17); c.lineTo(w * .15, top - 2);
      c.lineTo(w * .32, top - 12); c.lineTo(w * .3, top + 6);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(0, top - 1, 3, 0, 6.283); c.fill();
      c.fillStyle = '#4dabf7'; c.beginPath(); c.arc(-w * .18, top + 1, 2.2, 0, 6.283); c.fill();
      c.beginPath(); c.arc(w * .18, top + 1, 2.2, 0, 6.283); c.fill();
      break;
  }
}
function star(c, x, y, r, ir, color, rot) {
  c.save(); c.translate(x, y); c.rotate(rot || 0);
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, rad = i % 2 ? ir : r;
    c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  c.closePath(); c.fill(); c.restore();
}
function heart(c, x, y, s, color) {
  c.save(); c.translate(x, y); c.scale(s / 10, s / 10);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, 3);
  c.bezierCurveTo(-10, -4, -5, -11, 0, -5);
  c.bezierCurveTo(5, -11, 10, -4, 0, 3);
  c.fill(); c.restore();
}
