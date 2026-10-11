// Sauvegarde locale de la progression (pièces, record, objets possédés et équipés, réglages).
// La sauvegarde porte un numéro de version : quand le format change, normalize() migre l'ancienne
// sauvegarde au lieu de l'effacer.
'use strict';

const KEY = 'pepin-sprint-v1';        // clé conservée pour ne pas perdre les anciennes parties
const SAVE_VERSION = 3;

const DEF = () => ({
  version: SAVE_VERSION,
  coins: 0, best: 0, bestMeters: 0,
  settings: { sfx: true, music: true, haptics: true, shake: true },
  purchases: [],      // achats en argent réel confirmés par le store (ex. 'no_ads')
  firstLaunchDone: false,
  owned: { skin: ['pepin'], hat: ['aucun'], trail: ['poussiere'], jumpfx: ['classique'] },
  eq: { skin: 'pepin', hat: 'aucun', trail: 'poussiere', jumpfx: 'classique' },
  notice: null,  // message à afficher une fois au joueur (par exemple un remboursement)
});

function normalize(s) {
  const d = DEF();
  if (!s || typeof s !== 'object') return d;
  const out = { ...d, ...s, owned: { ...d.owned }, eq: { ...d.eq } };
  for (const c of CATS) {
    const own = Array.isArray(s.owned?.[c.id]) ? s.owned[c.id].filter(id => CAT[c.id].some(i => i.id === id)) : [];
    out.owned[c.id] = [...new Set([...d.owned[c.id], ...own])];
    const e = s.eq?.[c.id];
    out.eq[c.id] = out.owned[c.id].includes(e) ? e : d.eq[c.id];
  }
  out.coins = Math.max(0, Math.floor(+s.coins || 0));
  out.best = Math.max(0, Math.floor(+s.best || 0));
  out.bestMeters = Math.max(0, Math.floor(+s.bestMeters || 0));
  // Réglages (v3) : l'ancien interrupteur « Son » devient « Effets sonores »
  const st = s.settings || {};
  out.settings = {
    sfx: st.sfx ?? !s.muted,
    music: st.music ?? true,
    haptics: st.haptics ?? true,
    shake: st.shake ?? true,
  };
  delete out.muted;
  out.purchases = Array.isArray(s.purchases) ? s.purchases.filter(p => typeof p === 'string') : [];
  out.firstLaunchDone = !!s.firstLaunchDone || !!s.version; // un joueur existant a déjà vu l'accueil

  // Migration v1 -> v2 : les décors deviennent des zones gratuites.
  // Les décors achetés sont remboursés au prix payé.
  if (!s.version || s.version < 2) {
    const bought = Array.isArray(s.owned?.bg) ? s.owned.bg : [];
    const refund = bought.reduce((sum, id) => sum + (LEGACY_BG_PRICES[id] || 0), 0);
    if (refund > 0) {
      out.coins += refund;
      out.notice = `Les décors sont maintenant gratuits pendant la course. Tes ${refund} pièces ont été remboursées.`;
    }
    out.bestMeters = out.bestMeters || out.best; // avant, le record était en mètres
  }
  out.version = SAVE_VERSION;
  return out;
}
function load() {
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return DEF(); }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible : la partie continue en mémoire */ }
}
let save = load();
