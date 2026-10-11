// Génère l'icône de l'application (toutes tailles Android), l'écran de démarrage et les visuels
// de la fiche Google Play, en dessinant le vrai personnage du jeu.
//
// Utilisation (depuis la racine du dépôt) :  node tools/make-icons.js
// Nécessite Playwright (npm i -D playwright) et un navigateur Chromium.
'use strict';
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'app/android/app/src/main/res');
const STORE = path.join(ROOT, 'store');

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(ROOT, 'pepin-sprint/index.html'));
  await page.evaluate(() => document.fonts.ready);

  // Fonctions de dessin exécutées dans la page (elles réutilisent drawScene / drawChar du jeu)
  await page.evaluate(() => {
    const EQ = { skin: 'pepin', hat: 'aucun', trail: 'poussiere', jumpfx: 'classique' };
    window.__icon = (size, mode) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.scale(size / 200, size / 200);
      if (mode === 'round') { g.beginPath(); g.arc(100, 100, 100, 0, 6.283); g.clip(); }
      if (mode === 'legacy') { g.beginPath(); g.roundRect(0, 0, 200, 200, 36); g.clip(); }
      if (mode !== 'foreground') drawScene(g, 200, 200, 'crepuscule', 40, 1.2, 168, 1, false);
      // Icône adaptative : le personnage reste dans la zone sûre centrale (66 %)
      if (mode === 'foreground') drawChar(g, 100, 136, 62, 1.0, EQ, { run: .7 });
      else drawChar(g, 96, 166, 92, 1.0, EQ, { run: .7 });
      return c.toDataURL('image/png');
    };
    window.__splash = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.fillStyle = '#1b1433';
      g.fillRect(0, 0, w, h);
      const s = Math.min(w, h);
      drawChar(g, w / 2, h / 2 + s * .08, s * .22, 1.0, EQ, { run: .7 });
      g.font = `${Math.round(s * .09)}px "Lilita One", sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = '#ffb35c';
      g.fillText('Pépin Sprint', w / 2, h / 2 + s * .22);
      return c.toDataURL('image/png');
    };
    window.__feature = () => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 500;
      const g = c.getContext('2d');
      g.scale(1024 / 655, 500 / 320);
      drawScene(g, 655, 320, 'crepuscule', 80, 1.2, 264, 1, false);
      drawChar(g, 150, 264, 70, 1.0, { ...EQ, hat: 'couronne', trail: 'arcenciel' }, { run: .7 });
      g.font = '64px "Lilita One", sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillText('Pépin Sprint', 412, 128);
      g.fillStyle = '#ffffff';
      g.fillText('Pépin Sprint', 408, 124);
      g.font = '22px "Fredoka", sans-serif';
      g.fillText('Saute, glisse, collectionne !', 408, 162);
      return c.toDataURL('image/png');
    };
  });

  const save = async (file, dataUrl) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('écrit', path.relative(ROOT, file));
  };

  // Icônes Android
  for (const [d, k] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, 'mipmap-' + d);
    await save(path.join(dir, 'ic_launcher.png'), await page.evaluate(s => __icon(s, 'legacy'), Math.round(48 * k)));
    await save(path.join(dir, 'ic_launcher_round.png'), await page.evaluate(s => __icon(s, 'round'), Math.round(48 * k)));
    await save(path.join(dir, 'ic_launcher_foreground.png'), await page.evaluate(s => __icon(s, 'foreground'), Math.round(108 * k)));
  }
  // Fond de l'icône adaptative
  fs.writeFileSync(path.join(RES, 'values/ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#5a3f8a</color>\n</resources>\n');

  // Écrans de démarrage : mêmes tailles que les fichiers du modèle Capacitor
  for (const dir of fs.readdirSync(RES).filter(n => n.startsWith('drawable'))) {
    const file = path.join(RES, dir, 'splash.png');
    if (!fs.existsSync(file)) continue;
    const buf = fs.readFileSync(file);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);   // dimensions lues dans l'en-tête PNG
    await save(file, await page.evaluate(([a, b]) => __splash(a, b), [w, h]));
  }

  // Visuels de la fiche Google Play
  await save(path.join(STORE, 'icone-512.png'), await page.evaluate(() => __icon(512, 'full')));
  await save(path.join(STORE, 'icone-1024.png'), await page.evaluate(() => __icon(1024, 'full')));
  await save(path.join(STORE, 'image-de-presentation-1024x500.png'), await page.evaluate(() => __feature()));

  await browser.close();
})();
