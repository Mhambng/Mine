// Sauvegarde locale de la progression (pièces, record, objets possédés et équipés).
'use strict';

// ---------- Sauvegarde ----------
const KEY = 'pepin-sprint-v1';
const DEF = () => ({
  coins: 0, best: 0, muted: false,
  owned: { skin: ['pepin'], hat: ['aucun'], trail: ['poussiere'], bg: ['crepuscule'] },
  eq: { skin: 'pepin', hat: 'aucun', trail: 'poussiere', bg: 'crepuscule' },
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
  out.muted = !!s.muted;
  return out;
}
function load() {
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return DEF(); }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* stockage indisponible : la partie continue en mémoire */ }
}
let save = load();
