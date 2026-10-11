// Captures d'écran pour la fiche Google Play (paysage 1920×1080), prises dans le vrai jeu.
// Utilisation : node tools/make-screenshots.js   -> fichiers dans store/captures/
'use strict';
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'));
}
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'store/captures');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2, hasTouch: true });
  await page.goto('file://' + path.join(ROOT, 'pepin-sprint/index.html'));
  await page.evaluate(() => {
    localStorage.setItem('pepin-sprint-v1', JSON.stringify({ version: 3, coins: 1250, best: 8420, firstLaunchDone: true,
      owned: { skin: ['pepin', 'menthe'], hat: ['aucun', 'casquette'], trail: ['poussiere', 'etoiles'], jumpfx: ['classique', 'confettis'] },
      eq: { skin: 'pepin', hat: 'casquette', trail: 'etoiles', jumpfx: 'confettis' } }));
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { save.settings.sfx = false; save.settings.music = false; CONFIG.perf.adaptive = false; });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '1-accueil.png') });

  // En pleine course : combo, bouclier, aimant, pièces
  await page.evaluate(() => {
    startRun(); G.runT = 25; G.invuln = 1e9; Director.zoneLeft = 99;
    G.points = 3120; G.coinsRun = 48; Combo.steps = 9; Combo.mult = 3;
    G.power.shield = 10; G.power.magnet = 6;
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    G.obs.length = 0; G.coins.length = 0; G.nextSpawn = 1e9;
    placePattern(PATTERNS.find(p => p.id === 'deux-pics'), PX + 300, G.speed);
    jumpPress();
  });
  await page.waitForTimeout(260);
  await page.screenshot({ path: path.join(OUT, '2-course.png') });

  // Glissade sous une poutre dans la forêt
  await page.evaluate(() => {
    jumpRelease(); G.dist = 640 * 12; G.meters = 640; Biomes.update(0, 640); Biomes.fade = 1; G.banners.length = 0;
    G.obs.length = 0; G.coins.length = 0; G.py = GROUND; G.vy = 0; G.ground = true;
    placePattern(PATTERNS.find(p => p.id === 'tunnel'), PX + 40, G.speed);
    slidePress();
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, '3-glissade.png') });

  // Boutique et missions (panneaux plein écran)
  await page.evaluate(() => { slideRelease(); pauseGame(); showOverlay(null); openSheet('shop'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '4-boutique.png') });
  await page.evaluate(() => { closeSheet(); openSheet('missions'); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '5-missions.png') });
  console.log('captures écrites dans', path.relative(ROOT, OUT));
  await browser.close();
})();
