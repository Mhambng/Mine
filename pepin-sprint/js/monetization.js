// MonetizationService : point d'entrée unique pour la pub et les achats intégrés.
//
// Le reste du jeu ne parle QU'À cet objet `Monetization`. Derrière, un « fournisseur » fait le vrai
// travail :
//   - FakeStoreProvider (ce fichier) : sur le web et pendant le développement. Aucun vrai paiement,
//     aucune vraie pub. Permet de tester tout le parcours.
//   - NativeStoreProvider (js/monetization-native.js) : dans l'application Android/iOS, avec
//     AdMob (réglages « enfants ») et RevenueCat (Google Play Billing + StoreKit).
// Pour changer de SDK plus tard, il suffit d'écrire un autre fournisseur avec les mêmes méthodes.
//
// Règles non négociables (public de 8 à 16 ans) :
//   - Pubs uniquement « récompensées », toujours déclenchées par le joueur, jamais pendant la course.
//   - Pubs non personnalisées pour tout le monde, contenu classé « tout public ».
//   - Aucun objet aléatoire payant, aucune monnaie du jeu vendue contre de l'argent réel.
//   - Prix affichés en vraie monnaie (prix renvoyé par le store), porte parentale avant chaque achat.
//   - Sans réseau, pub et achats échouent proprement : le joueur n'est jamais bloqué.
//   - Achats purement cosmétiques : on ne paie jamais pour gagner.
'use strict';

// Attend une promesse au plus `ms` millisecondes
function withTimeout(promise, ms, code = 'timeout') {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(code)), ms))]);
}
const isOffline = () => typeof navigator.onLine === 'boolean' && !navigator.onLine;

// Messages d'erreur affichés au joueur (jamais culpabilisants)
const STORE_ERRORS = {
  offline: 'Pas de connexion internet. Tu peux continuer à jouer normalement.',
  timeout: 'Le store ne répond pas. Réessaie plus tard.',
  noFill: 'Aucune pub disponible pour le moment. Réessaie plus tard.',
  unavailable: 'Les achats ne sont pas disponibles sur cet appareil.',
  unknown: 'Quelque chose n’a pas marché. Rien n’a été payé.',
};

const Monetization = {
  provider: null,
  products: [],    // [{ id, title, description, priceString, grants }]

  async init() {
    this.provider = Native.isApp && typeof NativeStoreProvider !== 'undefined' ? NativeStoreProvider : FakeStoreProvider;
    try {
      await withTimeout(this.provider.init(), 8000);
      await this.refreshProducts();
      // Récupère silencieusement les achats déjà faits (nouvel appareil, réinstallation)
      if (this.provider.real) this.restore(true);
    } catch (e) { /* hors ligne ou SDK absent : le jeu fonctionne quand même */ }
  },

  get isDemo() { return !this.provider || !this.provider.real; },

  isAdFree() { return save.purchases.includes('no_ads'); },
  owns(id) { return save.purchases.includes(id); },

  // Peut-on proposer « Continuer » après une chute ?
  canOfferRevive() {
    if (!CONFIG.monetization.reviveEnabled) return false;
    return this.isAdFree() || !!(this.provider && this.provider.adsAvailable());
  },

  // Pub récompensée. Renvoie { rewarded: true } seulement si la pub a été regardée jusqu'au bout.
  async showRewarded(placement) {
    if (this.isAdFree()) return { rewarded: true, free: true };
    if (isOffline()) return { rewarded: false, error: 'offline' };
    try {
      Music.stop();
      return await withTimeout(this.provider.showRewarded(placement), CONFIG.monetization.adTimeoutMs);
    } catch (e) {
      return { rewarded: false, error: STORE_ERRORS[e.message] ? e.message : 'unknown' };
    }
  },

  async refreshProducts() {
    const defs = CONFIG.monetization.products;
    let fromStore = [];
    try { fromStore = await withTimeout(this.provider.getProducts(Object.keys(defs)), 8000); } catch (e) { /* hors ligne */ }
    this.products = Object.entries(defs).map(([id, d]) => {
      const s = fromStore.find(p => p.id === id);
      return {
        id, grants: d.grants || [], type: d.type,
        title: (s && s.title) || d.title,
        description: d.description,
        // Prix : toujours celui du store (dans la devise du joueur). Sans store, prix indicatif.
        priceString: s && s.priceString ? s.priceString : d.fallbackPrice,
        available: !!s || this.isDemo,
      };
    });
  },

  product(id) { return this.products.find(p => p.id === id); },

  // Achat. À appeler UNIQUEMENT après la porte parentale (voir js/store-ui.js).
  async purchase(id) {
    if (isOffline()) return { ok: false, error: 'offline' };
    try {
      const r = await withTimeout(this.provider.purchase(id), CONFIG.monetization.purchaseTimeoutMs);
      if (r.ok) this.grant(id);
      return r;
    } catch (e) {
      return { ok: false, error: STORE_ERRORS[e.message] ? e.message : 'unknown' };
    }
  },

  // Restauration des achats (bouton dans les réglages ; obligatoire pour l'App Store)
  async restore(silent) {
    if (isOffline()) return { ok: false, error: 'offline' };
    try {
      const ids = await withTimeout(this.provider.restore(), 20000);
      const before = save.purchases.length;
      ids.forEach(id => this.grant(id));
      if (!silent) renderShop();
      return { ok: true, restored: save.purchases.length - before };
    } catch (e) {
      return { ok: false, error: STORE_ERRORS[e.message] ? e.message : 'unknown' };
    }
  },

  // Donne au joueur ce qu'il a acheté (cosmétiques ou suppression des pubs)
  grant(id) {
    const def = CONFIG.monetization.products[id];
    if (!def) return;
    if (!save.purchases.includes(id)) save.purchases.push(id);
    for (const [cat, item] of def.grants || []) {
      if (CAT[cat] && !save.owned[cat].includes(item)) save.owned[cat].push(item);
    }
    persist();
  },
};

// ---------- Fournisseur de démonstration (web / développement) ----------
// Simule une pub (une fenêtre « Pub de démonstration ») et des achats qui réussissent,
// sans aucun paiement. Pratique pour tester l'interface et les cas d'erreur.
const FakeStoreProvider = {
  real: false,
  async init() {},
  adsAvailable() { return true; },
  showRewarded() {
    return new Promise(resolve => {
      showModal(`
        <h3>Pub de démonstration</h3>
        <p class="muted">Ici s’afficherait une courte vidéo adaptée aux enfants. Dans cette version de test, il n’y a rien à regarder.</p>
        <div class="row">
          <button class="btn" type="button" data-demo-ok disabled>Fermer la pub (2 s)</button>
        </div>`, () => resolve({ rewarded: false, error: null }));
      const btn = $('modal-card').querySelector('[data-demo-ok]');
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Fermer la pub'; btn.focus(); }, 2000);
      btn.addEventListener('click', () => { hideModal(); resolve({ rewarded: true }); });
    });
  },
  async getProducts(ids) {
    return ids.map(id => ({ id, title: CONFIG.monetization.products[id].title, priceString: CONFIG.monetization.products[id].fallbackPrice }));
  },
  async purchase() {
    await new Promise(r => setTimeout(r, 600));
    return { ok: true };
  },
  async restore() { return save.purchases.slice(); },
};
