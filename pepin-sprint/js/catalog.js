// Catalogue des cosmétiques (personnages, chapeaux, traînées, effets de saut)
// et palettes des zones traversées pendant la course.
'use strict';

// ---------- Catalogue ----------
const RAR = {
  commun: { label: 'Commun', weight: 55 },
  rare: { label: 'Rare', weight: 30 },
  epique: { label: 'Épique', weight: 12 },
  legendaire: { label: 'Légendaire', weight: 3 },
};
const CATS = [
  { id: 'skin', label: 'Personnages', one: 'Personnage' },
  { id: 'hat', label: 'Chapeaux', one: 'Chapeau' },
  { id: 'trail', label: 'Traînées', one: 'Traînée' },
  { id: 'jumpfx', label: 'Effets de saut', one: 'Effet de saut' },
];
const CAT = {
  skin: [
    { id: 'pepin', name: 'Pépin', rar: 'commun', price: 0, kind: 'blob', body: '#ff9f5a', belly: '#ffdcb5', feet: '#7a3b1c' },
    { id: 'menthe', name: 'Menthe', rar: 'commun', price: 120, kind: 'blob', body: '#5fd3a6', belly: '#cdf6e4', feet: '#1f6b50' },
    { id: 'prune', name: 'Prune', rar: 'rare', price: 300, kind: 'blob', body: '#9b6bff', belly: '#e0d0ff', feet: '#3f2385' },
    { id: 'robo', name: 'Robo', rar: 'rare', price: 350, kind: 'robot', body: '#a9bccf', belly: null, feet: '#4a5a6b' },
    { id: 'fantome', name: 'Fantôme', rar: 'epique', price: 700, kind: 'ghost', body: '#f4f0ff', belly: null, feet: null },
    { id: 'lave', name: 'Lave', rar: 'epique', price: 800, kind: 'blob', body: 'lava', belly: '#ffe08a', feet: '#5a1410' },
    { id: 'galaxie', name: 'Galaxie', rar: 'legendaire', price: 1600, kind: 'blob', body: 'galaxy', belly: null, feet: '#1c0742' },
  ],
  hat: [
    { id: 'aucun', name: 'Tête nue', rar: 'commun', price: 0 },
    { id: 'casquette', name: 'Casquette', rar: 'commun', price: 100 },
    { id: 'bonnet', name: 'Bonnet', rar: 'commun', price: 140 },
    { id: 'chat', name: 'Oreilles de chat', rar: 'rare', price: 280 },
    { id: 'sorcier', name: 'Chapeau de sorcier', rar: 'epique', price: 650 },
    { id: 'aureole', name: 'Auréole', rar: 'epique', price: 750 },
    { id: 'couronne', name: 'Couronne', rar: 'legendaire', price: 1500 },
  ],
  trail: [
    { id: 'poussiere', name: 'Poussière', rar: 'commun', price: 0 },
    { id: 'bulles', name: 'Bulles', rar: 'commun', price: 150 },
    { id: 'coeurs', name: 'Cœurs', rar: 'rare', price: 320 },
    { id: 'etoiles', name: 'Étoiles', rar: 'rare', price: 380 },
    { id: 'flammes', name: 'Flammes', rar: 'epique', price: 720 },
    { id: 'arcenciel', name: 'Arc-en-ciel', rar: 'legendaire', price: 1500 },
  ],
  // Effets déclenchés au saut et à la réception (purement visuels)
  jumpfx: [
    { id: 'classique', name: 'Classique', rar: 'commun', price: 0 },
    { id: 'confettis', name: 'Confettis', rar: 'commun', price: 150 },
    { id: 'notes', name: 'Notes de musique', rar: 'rare', price: 300 },
    { id: 'onde', name: 'Onde de choc', rar: 'rare', price: 350 },
    { id: 'eclairs', name: 'Éclairs', rar: 'epique', price: 700 },
    { id: 'artifice', name: 'Feu d’artifice', rar: 'legendaire', price: 1400 },
  ],
};
// Prix des anciens décors payants : sert seulement à rembourser les joueurs lors de la migration (save.js)
const LEGACY_BG_PRICES = { foret: 160, ocean: 300, neige: 360, cosmos: 1400 };

// Zones traversées pendant la course, dans l'ordre (voir CONFIG.biomes)
const BG = {
  crepuscule: { name: 'Crépuscule', sky: ['#2d1f5e', '#ff8f7a'], sun: { c: '#ffd29a', x: .74, y: .42, r: 44 }, far: '#6a4a9c', near: '#4a3480', ground: '#2a1d4a', top: '#ff9f5a', obs: '#170e2e', obsHi: '#ffb35c', bird: '#2a1b4d', deco: 'clouds', decoC: 'rgba(255,225,235,.5)', dust: 'rgba(255,220,200,.7)' },
  foret: { name: 'Forêt d’automne', sky: ['#f4a76a', '#fde3b0'], sun: { c: '#fff2c4', x: .22, y: .3, r: 34 }, far: '#c8794a', near: '#8f4b2c', ground: '#4a2a1a', top: '#d9893e', obs: '#3a2214', obsHi: '#7a4a2c', bird: '#4b2d6b', deco: 'leaves', decoC: '#e05a2b', dust: 'rgba(255,230,190,.75)' },
  ocean: { name: 'Plage de nuit', sky: ['#081a3a', '#1f4f8a'], sun: { c: '#eef3ff', x: .8, y: .3, r: 26 }, far: '#174a7a', near: '#1d6aa0', ground: '#d9bd84', top: '#f0dcad', obs: '#5b4636', obsHi: '#9a7b5f', bird: '#ffcf6b', deco: 'stars', decoC: '#ffffff', dust: 'rgba(255,240,210,.8)' },
  neige: { name: 'Montagne enneigée', sky: ['#8fbdea', '#eef6ff'], sun: { c: '#ffffff', x: .25, y: .3, r: 30 }, far: '#d8e7f7', near: '#b5cde8', ground: '#f7fbff', top: '#dbe8f6', obs: '#3d5a7c', obsHi: '#8fb0d6', bird: '#33557a', deco: 'snow', decoC: '#ffffff', dust: 'rgba(160,190,225,.8)' },
  cosmos: { name: 'Cosmos', sky: ['#0c0526', '#3b0f73'], sun: { c: '#ff7ad9', x: .78, y: .34, r: 38, ring: true }, far: '#2b1460', near: '#4a1f8f', ground: '#1a0b3d', top: '#7df9ff', obs: '#ff5fa2', obsHi: '#ffb3d6', bird: '#7df9ff', deco: 'stars', decoC: '#ffffff', dust: 'rgba(125,249,255,.7)' },
};
const find = (cat, id) => CAT[cat].find(i => i.id === id) || CAT[cat][0];
