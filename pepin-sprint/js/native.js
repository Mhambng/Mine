// Intégration avec l'application native (Capacitor) : pause en arrière-plan, bouton retour Android,
// vibrations. Sur le web, tout ce fichier se contente de solutions de repli (navigator.vibrate…).
//
// On n'importe aucun paquet JavaScript : on parle aux plugins natifs par leur nom avec
// Capacitor.registerPlugin(). Le jeu reste donc un simple site sans étape de compilation.
'use strict';

const Native = {
  isApp: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()),
  platform: (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web',
  plugin(name) {
    if (!this.isApp) return null;
    try { return window.Capacitor.registerPlugin(name); } catch (e) { return null; }
  },
};

// Vibrations courtes. kind : 'light' | 'medium' | 'heavy'
function haptic(kind) {
  if (!save.settings.haptics) return;
  const Haptics = Native.plugin('Haptics');
  if (Haptics) {
    Haptics.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
  } else if (navigator.vibrate) {
    try { navigator.vibrate(kind === 'heavy' ? 60 : kind === 'medium' ? 30 : 15); } catch (e) { /* rien */ }
  }
}

// Mode « appli » : plein écran paysage. Activé dans l'appli native, ou sur le web
// quand un téléphone est tenu en paysage (écran bas).
const appQuery = window.matchMedia('(orientation: landscape) and (max-height: 540px)');
function updateAppMode() {
  document.documentElement.classList.toggle('app', Native.isApp || appQuery.matches);
  if (typeof resize === 'function') resize();
}
appQuery.addEventListener ? appQuery.addEventListener('change', updateAppMode) : appQuery.addListener(updateAppMode);
updateAppMode();

function setupNative() {
  if (!Native.isApp) return;
  const App = Native.plugin('App');
  if (App) {
    // Appel, autre appli, écran verrouillé : pause immédiate et musique coupée
    App.addListener('pause', () => { pauseGame(); Music.stop(); });
    App.addListener('resume', () => { if (ac && ac.state === 'suspended') ac.resume(); });
    // Bouton retour Android : ferme ce qui est ouvert, sinon met en pause, sinon quitte
    App.addListener('backButton', () => {
      if (closeTopLayer()) return;
      if (G.state === 'play') { pauseGame(); return; }
      if (G.state === 'pause') { resume(); return; }
      App.exitApp();
    });
  }
  const StatusBar = Native.plugin('StatusBar');
  if (StatusBar) StatusBar.hide().catch(() => {});
}
